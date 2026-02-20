"use client";

import { useState } from 'react';
import { Loader2, CreditCard, Shield, QrCode, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

interface PaymentProcessorProps {
  total: number;
  diocesisId: string;        // UUID de la diócesis
  diocesisNombre: string;     // Nombre para mostrar
  personas: any[];
  eventoId: number;
  emailContacto?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export default function PaymentProcessor({ 
  total, 
  diocesisId,
  diocesisNombre,
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
      const inscripciones = personas.map(persona => ({
        nombre: persona.nombre,
        apellido: persona.apellido,
        documento: persona.documento,
        email: persona.email,
        entidadSalud: persona.entidadSalud,
        segmentacion: persona.segmentacion,
        hospedaje: persona.hospedaje,
        precio_pactado: total / personas.length,
        mediodetransporte: persona.mediodetransporte,
        telefono: persona.telefono
      }));

      const response = await fetch('/api/wompi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento_id: eventoId,
          diocesis_id: diocesisId,
          diocesis_nombre: diocesisNombre,
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
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-[#1E2D69] uppercase">Selecciona método de pago</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWompiPayment}
            disabled={processing}
            className={`p-6 rounded-2xl border-2 transition-all ${
              paymentMethod === 'wompi' 
                ? 'border-[#009944] bg-[#009944]/10' 
                : 'border-[#E6E7E8] hover:border-[#009944]/50 hover:bg-[#E6E7E8]/20'
            } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  paymentMethod === 'wompi' 
                    ? 'bg-[#009944]/20 text-[#009944]' 
                    : 'bg-[#E6E7E8] text-[#1E2D69]/50'
                }`}>
                  <CreditCard size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#1E2D69]">Pago Online Seguro</p>
                  <p className="text-xs text-[#1E5CAA]/70">Tarjeta, PSE, Nequi, Daviplata</p>
                </div>
              </div>
              {processing && paymentMethod === 'wompi' && (
                <Loader2 className="animate-spin text-[#009944]" size={20} />
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-[#1E2D69]/60">
              <span className="flex items-center gap-1">
                <Shield size={12} className="text-[#009944]" />
                Protegido por Wompi
              </span>
              <span className="flex items-center gap-1">
                <QrCode size={12} />
                +10 métodos
              </span>
            </div>
          </motion.button>

          <div className="p-6 rounded-2xl border-2 border-[#E6E7E8] bg-[#E6E7E8]/30 opacity-50 cursor-not-allowed">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-[#E6E7E8] text-[#1E2D69]/30">
                <Smartphone size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-[#1E2D69]/50">Pago Bancario</p>
                <p className="text-xs text-[#1E2D69]/40">(Próximamente)</p>
              </div>
            </div>
            <div className="text-xs text-[#1E2D69]/40">
              Transferencia o consignación
            </div>
          </div>
        </div>
      </div>

      {!processing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#009944]/10 to-[#1E5CAA]/10 p-4 rounded-2xl border border-[#009944]/30"
        >
          <div className="flex items-start gap-3">
            <Shield className="text-[#009944] mt-0.5" size={18} />
            <div>
              <p className="font-bold text-[#009944] text-sm">Pago 100% Seguro</p>
              <p className="text-xs text-[#1E2D69]/70">
                Tus datos están protegidos con encriptación SSL. Wompi es una plataforma autorizada y supervisada por la Superintendencia Financiera.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {processing && paymentMethod === 'wompi' && !paymentUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <Loader2 className="animate-spin text-[#009944] mx-auto mb-4" size={32} />
          <p className="font-bold text-[#1E2D69]">Generando enlace de pago seguro</p>
          <p className="text-sm text-[#1E2D69]/60 mt-2">
            Estamos creando tu transacción en Wompi...
          </p>
        </motion.div>
      )}
    </div>
  );
}