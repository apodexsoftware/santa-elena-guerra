// components/PaymentProcessor.tsx
"use client";

import { useState } from 'react';
import { Loader2, CreditCard, Shield, QrCode, Smartphone, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PaymentProcessorProps {
  total: number;
  diocesis: string;
  personas: any[];
  eventoId: number;
  emailContacto?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export default function PaymentProcessor({ 
  total, 
  diocesis, 
  personas, 
  eventoId, 
  emailContacto,
  onSuccess,
  onError 
}: PaymentProcessorProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wompi' | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const handleWompiPayment = async () => {
    if (processing) return;
    
    setProcessing(true);
    setPaymentMethod('wompi');

    try {
      // Preparar datos para enviar al backend
      const inscripciones = personas.map(persona => ({
        nombre: persona.nombre,
        apellido: persona.apellido,
        documento: persona.documento,
        email: persona.email,
        entidadSalud: persona.entidadSalud,
        segmentacion: persona.segmentacion,
        hospedaje: persona.hospedaje,
        precio_pactado: total / personas.length, // Dividir el total entre personas
        diocesis
      }));

      const response = await fetch('/api/wompi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evento_id: eventoId,
          diocesis,
          inscripciones,
          total,
          email_contacto: emailContacto || personas[0]?.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el pago');
      }

      if (data.url) {
        setPaymentUrl(data.url);
        // Redirigir al usuario a Wompi
        window.location.href = data.url;
        onSuccess?.(data);
      }
    } catch (error: any) {
      console.error('Error al procesar pago:', error);
      onError?.(error.message || 'Error desconocido');
      setProcessing(false);
      setPaymentMethod(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Métodos de pago */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-800 uppercase">Selecciona método de pago</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWompiPayment}
            disabled={processing}
            className={`p-6 rounded-2xl border-2 transition-all ${
              paymentMethod === 'wompi' 
                ? 'border-indigo-500 bg-indigo-50' 
                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
            } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  paymentMethod === 'wompi' 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <CreditCard size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">Pago Online Seguro</p>
                  <p className="text-xs text-slate-500">Tarjeta, PSE, Nequi, Daviplata</p>
                </div>
              </div>
              {processing && paymentMethod === 'wompi' && (
                <Loader2 className="animate-spin text-indigo-600" size={20} />
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Shield size={12} className="text-emerald-500" />
                Protegido por Wompi
              </span>
              <span className="flex items-center gap-1">
                <QrCode size={12} />
                +10 métodos
              </span>
            </div>
          </motion.button>

          {/* Puedes agregar más métodos de pago aquí */}
          <div className="p-6 rounded-2xl border-2 border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-slate-200 text-slate-400">
                <Smartphone size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-400">Pago Bancario</p>
                <p className="text-xs text-slate-400">(Próximamente)</p>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              Transferencia o consignación
            </div>
          </div>
        </div>
      </div>

      {/* Información de seguridad */}
      {!processing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-2xl border border-emerald-100"
        >
          <div className="flex items-start gap-3">
            <Shield className="text-emerald-600 mt-0.5" size={18} />
            <div>
              <p className="font-bold text-emerald-800 text-sm">Pago 100% Seguro</p>
              <p className="text-xs text-emerald-700">
                Tus datos están protegidos con encriptación SSL. Wompi es una plataforma autorizada y supervisada por la Superintendencia Financiera.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Estado de procesamiento */}
      {processing && paymentMethod === 'wompi' && !paymentUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={32} />
          <p className="font-bold text-slate-700">Generando enlace de pago seguro</p>
          <p className="text-sm text-slate-500 mt-2">
            Estamos creando tu transacción en Wompi...
          </p>
        </motion.div>
      )}
    </div>
  );
}