import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    /* ---------------------------------------------------
     * 1. Leer body crudo
     * --------------------------------------------------- */
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    const transaction = payload?.data?.transaction;
    if (!transaction) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    /* ---------------------------------------------------
     * 2. Timestamp desde headers
     * --------------------------------------------------- */
    const timestamp = request.headers.get('x-wompi-timestamp');
    if (!timestamp) {
      return NextResponse.json({ error: 'Missing timestamp' }, { status: 400 });
    }

    /* ---------------------------------------------------
     * 3. Validar firma Wompi
     * --------------------------------------------------- */
    const secret = process.env.WOMPI_EVENTS_SECRET;
    if (!secret) {
      throw new Error('WOMPI_EVENTS_SECRET no configurado');
    }

    const cadena =
      `${transaction.id}` +
      `${transaction.status}` +
      `${transaction.amount_in_cents}` +
      `${transaction.reference}` +
      `${timestamp}` +
      `${secret}`;

    const hashLocal = crypto
      .createHash('sha256')
      .update(cadena)
      .digest('hex');

    const signature = payload?.signature?.checksum;
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const localBuffer = Buffer.from(hashLocal, 'hex');
    const remoteBuffer = Buffer.from(signature, 'hex');

    if (
      localBuffer.length !== remoteBuffer.length ||
      !crypto.timingSafeEqual(localBuffer, remoteBuffer)
    ) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    /* ---------------------------------------------------
     * 4. Validaciones críticas
     * --------------------------------------------------- */
    const { reference, status, id: wompiTxId } = transaction;

    if (!reference) {
      throw new Error('Referencia inválida');
    }

    /* ---------------------------------------------------
     * 5. Idempotencia
     * --------------------------------------------------- */
    const { data: txExistente, error: errorSelect } = await supabaseAdmin
      .from('transacciones')
      .select('estado')
      .eq('referencia', reference)
      .single();

    if (errorSelect) throw errorSelect;

    if (txExistente?.estado === 'pagado') {
      return NextResponse.json(
        { status: 'already_processed' },
        { status: 200 }
      );
    }

    /* ---------------------------------------------------
     * 6. Mapear estados Wompi → internos
     * --------------------------------------------------- */
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

    /* ---------------------------------------------------
     * 7. Actualizar transacción
     * --------------------------------------------------- */
    const { error: errorTx } = await supabaseAdmin
      .from('transacciones')
      .update({
        estado: nuevoEstado,
        wompi_transaction_id: wompiTxId,
        updated_at: new Date().toISOString()
      })
      .eq('referencia', reference);

    if (errorTx) throw errorTx;

    /* ---------------------------------------------------
     * 8. Actualizar inscripciones
     * --------------------------------------------------- */
    if (nuevoEstado === 'pagado') {
      const { error: errorIns } = await supabaseAdmin
        .from('inscripciones')
        .update({
          estado: 'pagado',
          updated_at: new Date().toISOString()
        })
        .eq('referencia_pago', reference);

        if (errorIns) throw errorIns;
    }

    /* ---------------------------------------------------
     * 9. Respuesta final
     * --------------------------------------------------- */
    return NextResponse.json({ status: 'success' }, { status: 200 });

  } catch (error: any) {
    console.error('Wompi Webhook Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
