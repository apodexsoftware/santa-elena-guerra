import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const payload = await request.json()

    console.log('📩 Webhook Wompi recibido:', JSON.stringify(payload, null, 2))

    const event = payload?.event
    const transaction = payload?.data?.transaction

    /**
     * 🔒 Validaciones mínimas
     */
    if (!event || !transaction) {
      return NextResponse.json(
        { error: 'Payload inválido' },
        { status: 400 }
      )
    }

    // Solo nos interesa este evento
    if (event !== 'transaction.updated') {
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
      console.error('❌ payment_link_id ausente')
      return NextResponse.json(
        { error: 'payment_link_id ausente' },
        { status: 400 }
      )
    }

    /**
     * 1️⃣ Buscar transacción interna CON sus inscripciones relacionadas
     */
    const { data: transaccion, error: txError } = await supabase
      .from('transacciones')
      .select(`
        id, 
        estado,
        inscripciones (id, precio_pactado)
      `)
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
     * 🔁 Protección contra webhook duplicado
     */
    if (transaccion.estado === 'pagado') {
      console.log('⚠️ Webhook duplicado ignorado')
      return NextResponse.json({ received: true })
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
        // Estados intermedios (PENDING, etc.)
        return NextResponse.json({ received: true })
    }

    /**
     * 3️⃣ Actualizar transacción
     */
    const montoTotal = amount_in_cents / 100

    const { error: updateTxError } = await supabase
      .from('transacciones')
      .update({
        estado: nuevoEstado,
        //wompi_transaction_id,
        //wompi_status: status,
        //wompi_amount: montoTotal,
        //wompi_reference: reference,
        //wompi_webhook_payload: payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaccion.id)

    if (updateTxError) {
      console.error('❌ Error actualizando transacción:', updateTxError)
      throw updateTxError
    }

    /**
     * 4️⃣ Actualizar inscripciones individualmente con su precio pactado
     */
    if (nuevoEstado === 'pagado' && transaccion.inscripciones) {
      
      // Actualizar cada inscripción con su propio precio_pactado
      const updatePromises = transaccion.inscripciones.map((inscripcion: any) => 
        supabase
          .from('inscripciones')
          .update({
            estado: 'aprobada',
            monto_pagado: inscripcion.precio_pactado-700, // ← Cada uno con su precio
            updated_at: new Date().toISOString()
          })
          .eq('id', inscripcion.id)
      )

      const results = await Promise.all(updatePromises)
      
      // Verificar errores
      const errors = results.filter(r => r.error)
      if (errors.length > 0) {
        console.error('❌ Errores actualizando inscripciones:', errors)
        throw new Error(`Error actualizando ${errors.length} inscripciones`)
      }
    }

    console.log(`✅ Transacción ${transaccion.id} procesada correctamente`)

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('🔥 Error en webhook Wompi:', error)

    return NextResponse.json(
      {
        error: 'Error procesando webhook',
        details: error.message
      },
      { status: 500 }
    )
  }
}
