import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    console.log('WEBHOOK PAYLOAD:', payload);

    const transaction = payload?.data?.transaction;
    if (!transaction) {
      console.log('NO TRANSACTION');
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const { reference, status, id: wompiTxId } = transaction;

    console.log('TRANSACTION DATA:', {
      reference,
      status,
      wompiTxId
    });

    if (!reference) {
      throw new Error('Referencia vacía');
    }

    // Mapear estados Wompi → internos
    let nuevoEstado: 'pendiente' | 'pagado' | 'rechazado';

    if (status === 'APPROVED') nuevoEstado = 'pagado';
    else if (status === 'DECLINED' || status === 'VOIDED' || status === 'ERROR') {
      nuevoEstado = 'rechazado';
    } else {
      console.log('ESTADO NO MANEJADO:', status);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // UPDATE TRANSACCION
    const { data: txUpdated, error: errorTx } = await supabaseAdmin
      .from('transacciones')
      .update({
        estado: nuevoEstado,
        wompi_transaction_id: wompiTxId,
        updated_at: new Date().toISOString()
      })
      .eq('referencia', reference)
      .select();

    console.log('TRANSACCION UPDATED:', txUpdated);

    if (errorTx) throw errorTx;

    // UPDATE INSCRIPCIONES SOLO SI PAGADO
    if (nuevoEstado === 'pagado') {
      const { data: insUpdated, error: errorIns } = await supabaseAdmin
        .from('inscripciones')
        .update({
          estado: 'pagado',
          updated_at: new Date().toISOString()
        })
        .eq('referencia_pago', reference)
        .select();

      console.log('INSCRIPCIONES UPDATED:', insUpdated);

      if (errorIns) throw errorIns;
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
