import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      evento_id,
      diocesis_id,
      diocesis_nombre,
      inscripciones,
      total,
      email_contacto
    } = await request.json()

    // 🔒 Validaciones
    if (
      !evento_id ||
      !diocesis_id ||
      !Array.isArray(inscripciones) ||
      inscripciones.length === 0 ||
      !total
    ) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // 🌍 Configuración Wompi
    const isProd = process.env.WOMPI_ENV === 'production'

    const wompiUrl = isProd
      ? 'https://production.wompi.co/v1/payment_links'
      : 'https://sandbox.wompi.co/v1/payment_links'

    const apiKey = isProd
      ? process.env.WOMPI_PRIVATE_KEY_PROD
      : process.env.WOMPI_PRIVATE_KEY_SANDBOX

    if (!apiKey) {
      throw new Error('API Key de Wompi no configurada')
    }

    /**
     * 1️⃣ Crear transacción interna (SIN wompi_link_id aún)
     */
    const { data: transaccion, error: txError } = await supabase
      .from('transacciones')
      .insert({
        evento_id,
        diocesis_id,
        diocesis: diocesis_nombre,
        monto_total: total,
        estado: 'pendiente',
        email_contacto: email_contacto || null,
        detalles_inscripciones: inscripciones
      })
      .select('id')
      .single()

    if (txError) throw txError

    /**
     * 2️⃣ Referencia interna (solo informativa)
     */
    const reference = `TX_${transaccion.id}_${Date.now()}`

    await supabase
      .from('transacciones')
      .update({ referencia: reference })
      .eq('id', transaccion.id)

    /**
     * 3️⃣ Crear inscripciones en estado pendiente
     */
    const inserts = inscripciones.map((insc: any) => ({
      nombre: insc.nombre,
      apellido: insc.apellido,
      documento: insc.documento,
      email: insc.email,
      telefono: insc.telefono,
      entidadSalud: insc.entidadSalud,
      segmentacion: insc.segmentacion,
      hospedaje: insc.hospedaje,
      precio_pactado: insc.precio_pactado,
      mediodetransporte: insc.mediodetransporte,
      evento_id,
      diocesis: diocesis_nombre,
      estado: 'pendiente',
      transaccion_id: transaccion.id,
      referencia_pago: reference
    }))

    const { error: insError } = await supabase
      .from('inscripciones')
      .insert(inserts)

    if (insError) throw insError

    /**
     * 4️⃣ Payload Wompi
     */
    const payload = {
      name: `Inscripción Evento - ${diocesis_nombre}`,
      description: `Inscripción para ${inscripciones.length} persona(s)`,
      single_use: true,
      currency: 'COP',
      amount_in_cents: Math.round(Number(total) * 100),
      collect_shipping: false,
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/inscripcion/confirmacion?tx=${transaccion.id}`,
      customer_data: {
        full_name: `${inscripciones[0].nombre} ${inscripciones[0].apellido}`,
        email: inscripciones[0].email || email_contacto,
        phone_number: '573000000000'
      },
      meta_data: {
        transaccion_id: transaccion.id,
        evento_id,
        diocesis_id,
        cantidad_personas: inscripciones.length
      }
    }

    /**
     * 5️⃣ Crear Payment Link en Wompi
     */
    const wompiRes = await fetch(wompiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const wompiData = await wompiRes.json()

    if (!wompiRes.ok || !wompiData?.data?.id) {
      await supabase
        .from('transacciones')
        .update({ estado: 'rechazado' })
        .eq('id', transaccion.id)

      return NextResponse.json(
        { error: 'Error creando link de pago', details: wompiData },
        { status: 500 }
      )
    }

    /**
     * 6️⃣ Guardar payment_link_id (CLAVE DE CONCILIACIÓN)
     */
    await supabase
      .from('transacciones')
      .update({
        wompi_link_id: wompiData.data.id,
        wompi_response: wompiData
      })
      .eq('id', transaccion.id)

    /**
     * 7️⃣ Respuesta
     */
    return NextResponse.json({
      success: true,
      url: `https://checkout.wompi.co/l/${wompiData.data.id}`,
      transaccion_id: transaccion.id,
      payment_link_id: wompiData.data.id
    })

  } catch (error: any) {
    console.error('Error creando pago Wompi:', error)

    return NextResponse.json(
      { error: 'Error interno', details: error.message },
      { status: 500 }
    )
  }
}
