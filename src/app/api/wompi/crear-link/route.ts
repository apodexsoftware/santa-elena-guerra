import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { name, amount } = await request.json();

    // Validar datos básicos
    if (!name || !amount) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Configuración Wompi
    const isProd = process.env.WOMPI_ENV === 'production';
    const url = isProd 
      ? 'https://production.wompi.co/v1/payment_links' 
      : 'https://sandbox.wompi.co/v1/payment_links';
    
    const apiKey = process.env.WOMPI_PRIVATE_KEY;

    // Convertir Pesos a Centavos (Wompi usa centavos)
    const amountInCents = Number(amount) * 100;

    const payload = {
      name: `Pago: ${name}`,
      collect_shipping: false,
      description: `Donación para ${name}`,
      single_use: true,
      currency: "COP",
      amount_in_cents: amountInCents,
      customer_data: {
        customer_references: [
          { label: "Documento Identidad", is_required: true }
        ]
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error Wompi:', data);
      return NextResponse.json({ error: 'Error creando link', details: data }, { status: 500 });
    }

    return NextResponse.json({ 
      url: `https://checkout.wompi.co/l/${data.data.id}` 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Error servidor' }, { status: 500 });
  }
}