import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    console.log('EVENT:', payload.event);
    console.log('Webhook Wompi payload:', JSON.stringify(payload, null, 2))

    // ✅ SOLO este evento importa
    if (payload.event !== 'transaction.updated') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const transaction = payload?.data?.transaction;
    if (!transaction) {
      throw new Error('Transaction missing');
    }

    const { reference, status, id: wompiTxId } = transaction;

    if (!reference) {
      throw new Error('Reference missing');
    }

    let nuevoEstado: 'pendiente' | 'pagado' | 'rechazado';

    switch (status) {
      case 'APPROVED':
        nuevoEstado = 'pagado';
        break;
      case 'DECLINED':
      case 'VOIDED':
      case 'ERROR':
        nuevoEstado = 'rechazado';
        break;
      default:
        return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // 🔄 Actualizar transacción
    const { data: txUpdated } = await supabaseAdmin
      .from('transacciones')
      .update({
        estado: nuevoEstado,
        wompi_transaction_id: wompiTxId,
        updated_at: new Date().toISOString()
      })
      .eq('referencia', reference)
      .select();

    console.log('TX UPDATED:', txUpdated);

    // 🔄 Actualizar inscripciones SOLO si pagado
    if (nuevoEstado === 'pagado') {
      const { data: insUpdated } = await supabaseAdmin
        .from('inscripciones')
        .update({
          estado: 'pagado',
          updated_at: new Date().toISOString()
        })
        .eq('referencia_pago', reference)
        .select();

      console.log('INS UPDATED:', insUpdated);
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error: any) {
    console.error('WEBHOOK ERROR:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
