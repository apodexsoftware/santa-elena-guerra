import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Usamos el cliente admin para saltar RLS si es necesario
import crypto from 'crypto';

// Se recomienda usar el Service Role Key para operaciones de Webhook 
// ya que no hay un usuario autenticado en la sesión del servidor
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const payload = JSON.parse(bodyText);
    
    // 1. Validar la Firma (Event Secrets de Wompi)
    // El hash viene en payload.signature.checksum
    const { data, event, signature, timestamp } = payload;
    const transaction = data.transaction;
    
    // NOTA: Wompi requiere concatenar campos específicos para validar.
    // Estructura: id + status + amount_in_cents + timestamp + secret
    const secret = process.env.WOMPI_EVENTS_SECRET; 
    const cadenaConcatenada = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${secret}`;
    const hashLocal = crypto.createHash('sha256').update(cadenaConcatenada).digest('hex');

    if (hashLocal !== signature.checksum) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    // 2. Procesar solo si el evento es de actualización de transacción
    if (event === 'transaction.updated') {
      const { reference, status, id: wompi_tx_id } = transaction;

      // Definir el nuevo estado para nuestra DB
      // Wompi usa: APPROVED, DECLINED, VOIDED, ERROR
      let nuevoEstado = 'pendiente';
      if (status === 'APPROVED') nuevoEstado = 'aprobado';
      if (status === 'DECLINED') nuevoEstado = 'rechazado';
      if (status === 'ERROR') nuevoEstado = 'fallido';

      // 3. ACTUALIZACIÓN EN SUPABASE
      // Usamos la referencia que guardaste: `EV-${evento_id}-${Date.now()}`
      
      // A. Actualizar la tabla de transacciones
      const { error: errorTx } = await supabaseAdmin
        .from('transacciones')
        .update({ 
          estado: nuevoEstado,
          wompi_transaction_id: wompi_tx_id,
          updated_at: new Date().toISOString()
        })
        .eq('referencia', reference);

      if (errorTx) throw errorTx;

      // B. Actualizar la tabla de inscripciones asociadas
      // Si el pago es aprobado, actualizamos todas las inscripciones con esa referencia
      if (status === 'APPROVED') {
        const { error: errorIns } = await supabaseAdmin
          .from('inscripciones')
          .update({ estado: 'pagado' })
          .eq('referencia_pago', reference);

        if (errorIns) throw errorIns;
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}