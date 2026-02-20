import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const payload = await request.json()

    console.log('📩 Webhook Wompi recibido:', JSON.stringify(payload, null, 2))

    const event = payload.event
    const transaction = payload?.data?.transaction

    // 🔒 Validaciones mínimas
    if (!event || !transaction) {
      return NextResponse.json(
        { error: 'Payload inválido' },
        { status: 400 }
      )
    }

    if (event !== 'transaction.updated') {
      // Aceptamos pero ignoramos otros eventos
      return NextResponse.json({ received: true })
    }

    const {
      status,
      payment_link_id,
      id: wompi_transaction_id,
      amount_in_cents,
      reference
    } = transaction

    if (!payment_link_id) {
      console.error('❌ No viene payment_link_id')
      return NextResponse.json(
        { error: 'payment_link_id ausente' },
        { status: 400 }
      )
    }

    /**
     * 1️⃣ Buscar transacción interna por payment_link_id
     */
    const { data: transaccion, error: txError } = await supabase
      .from('transacciones')
      .select('id, estado')
      .eq('wompi_link_id', payment_link_id)
      .single()

    if (txError || !transaccion) {
      console.error('❌ Transacción no encontrada:', payment_link_id)
      return NextResponse.json(
        { error: 'Transacción no encontrada' },
        { status: 404 }
      )
    }

    /**
     * 2️⃣ Mapear estado Wompi → estado interno
     */
    let nuevoEstado: string | null = null

    switch (status) {
      case 'APPROVED':
        nuevoEstado = 'pagado'
        break
      case 'DECLINED':
      case 'VOIDED':
      case 'ERROR':
        nuevoEstado = 'rechazado'
        break
      default:
        // estados intermedios
        return NextResponse.json({ received: true })
    }

    /**
     * 3️⃣ Actualizar transacción
     */
    await supabase
      .from('transacciones')
      .update({
        estado: nuevoEstado,
        wompi_transaction_id,
        wompi_status: status,
        wompi_amount: amount_in_cents / 100,
        wompi_reference: reference,
        wompi_webhook_payload: payload
      })
      .eq('id', transaccion.id)

    /**
     * 4️⃣ Actualizar inscripciones si fue aprobado
     */
    if (nuevoEstado === 'pagado') {
      await supabase
        .from('inscripciones')
        .update({ estado: 'confirmada' })
        .eq('transaccion_id', transaccion.id)
    }

    console.log(`✅ Transacción ${transaccion.id} actualizada a ${nuevoEstado}`)

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('🔥 Error en webhook Wompi:', error)

    return NextResponse.json(
      { error: 'Error procesando webhook', details: error.message },
      { status: 500 }
    )
  }
}
