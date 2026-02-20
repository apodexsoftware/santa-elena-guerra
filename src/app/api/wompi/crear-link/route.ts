import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';


export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { 
      evento_id, 
      diocesis_id,   // UUID de la diócesis
      diocesis_nombre, // Nombre para referencia (opcional)
      inscripciones, 
      total, 
      email_contacto 
    } = await request.json();

    // Validar datos requeridos
    if (!evento_id || !diocesis_id || !inscripciones || !total) {
      console.error('Faltan datos:', { evento_id, diocesis_id, inscripciones, total });
      return NextResponse.json({ 
        error: 'Faltan datos requeridos' 
      }, { status: 400 });
    }

    // Configuración Wompi
    const isProd = process.env.WOMPI_ENV === 'production';
    const url = isProd 
      ? 'https://production.wompi.co/v1/payment_links' 
      : 'https://sandbox.wompi.co/v1/payment_links';
    
    const apiKey = isProd 
      ? process.env.WOMPI_PRIVATE_KEY_PROD 
      : process.env.WOMPI_PRIVATE_KEY_SANDBOX;

    if (!apiKey) {
      throw new Error('API Key de Wompi no configurada');
    }

    const amountInCents = Math.round(total * 100);
    const reference = `EV-${evento_id}-${Date.now()}`;

    // Crear transacción en la base de datos
    const { data: transaccion, error: txError } = await (await supabase)
      .from('transacciones')
      .insert({
        evento_id,
        diocesis_id,          // Guardar el ID
        diocesis: diocesis_nombre,      // Opcional
        referencia: reference,
        monto_total: total,
        estado: 'pendiente',
        email_contacto: email_contacto || null,
        detalles_inscripciones: inscripciones,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (txError) throw txError;

    // Crear inscripciones en estado pendiente, incluyendo diocesis_id
    const inserts = inscripciones.map((insc: any) => ({
      nombre: insc.nombre,
      apellido: insc.apellido,
      documento: insc.documento,
      email: insc.email,
      entidadSalud: insc.entidadSalud,  // Ajusta según nombre de columna
      segmentacion: insc.segmentacion,
      hospedaje: insc.hospedaje,
      precio_pactado: insc.precio_pactado,
      telefono: insc.telefono,
      mediodetransporte: insc.mediodetransporte, // Ajusta según nombre de columna,                       
      evento_id,
      diocesis: diocesis_nombre,
      estado: 'pendiente',
      transaccion_id: transaccion.id,
      referencia_pago: reference,
      created_at: new Date().toISOString()
    }));

    const { error: insError } = await (await supabase)
      .from('inscripciones')
      .insert(inserts);

    if (insError) throw insError;

    // Payload para Wompi
    const payload = {
      name: `Inscripción Evento - ${diocesis_nombre || ''}`,
      description: `Inscripción para ${inscripciones.length} persona(s)`,
      single_use: true,
      currency: "COP",
      amount_in_cents: amountInCents,
      collect_shipping: false,
      reference: reference,
      redirect_url: `http://localhost:3000/inscripcion/confirmacion?tx=${transaccion.id}`,
      customer_data: {
        full_name: `${inscripciones[0]?.nombre} ${inscripciones[0]?.apellido}`,
        email: inscripciones[0]?.email || email_contacto,
        phone_number: "573000000000"
      },
      meta_data: {
        evento_id,
        diocesis_id,
        transaccion_id: transaccion.id,
        cantidad_personas: inscripciones.length
      }
    };

    const wompiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const wompiData = await wompiRes.json();

    if (!wompiRes.ok) {
      console.error('Error Wompi:', wompiData);
      await (await supabase)
        .from('transacciones')
        .update({ estado: 'error_wompi' })
        .eq('id', transaccion.id);
      return NextResponse.json({ error: 'Error creando link de pago', details: wompiData }, { status: 500 });
    }

    await (await supabase)
      .from('transacciones')
      .update({ 
        wompi_link_id: wompiData.data.id,
        wompi_response: wompiData 
      })
      .eq('id', transaccion.id);

    return NextResponse.json({ 
      success: true,
      url: `https://checkout.wompi.co/l/${wompiData.data.id}`,
      transaccion_id: transaccion.id,
      referencia: reference,
      wompi_data: wompiData
    });

  } catch (error: any) {
    console.error('Error en API Wompi:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}