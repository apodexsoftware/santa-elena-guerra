"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { 
  Loader2, Sparkles, CheckCircle2, Send, 
  DollarSign, MapPin, User, 
  FileText, Shield, Building2, HeartPulse,
  BedDouble, Calendar, Award,
  ChevronRight, ChevronLeft,
  X, Check, Zap, Target, Star, Gem,
  Bell, CreditCard, QrCode, Smartphone, Crown, Mails, 
  AlertTriangle, Plus, Trash2, Users, List,
  ExternalLink, Lock, Globe, SmartphoneCharging,
  ShieldCheck, BanknoteIcon, Receipt
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { motion, AnimatePresence } from "framer-motion";

// Esquemas de validación
const personaSchema = {
  nombre: (val: string) => val?.length >= 3 ? true : "Mínimo 3 caracteres",
  apellido: (val: string) => val?.length >= 3 ? true : "Mínimo 3 caracteres",
  documento: (val: string) => val?.length >= 5 ? true : "Mínimo 5 caracteres",
  email: (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? true : "Email inválido",
  entidadSalud: (val: string) => val ? true : "La EPS es requerida",
  segmentacion: (val: string) => val ? true : "El tipo de participante es requerido",
  hospedaje: (val: string) => val ? true : "Seleccione una opción",
  mediodetransporte: (val: string) => val ? true : "Seleccione una opción",
  telefono: (val: string) => val?.length >= 10 ? true : "El teléfono debe tener al menos 10 dígitos"
};

// Tipos
type PersonaFormData = {
  nombre: string;
  apellido: string;
  documento: string;
  email: string;
  entidadSalud: string;
  segmentacion: string;
  hospedaje: "si" | "no";
  mediodetransporte: "Avión" | "Autobús";
  telefono: string;
};

type FormData = {
  diocesis: string; // UUID
  personas: PersonaFormData[];
};

// Componente de paso del formulario
const FormStep = ({ 
  step, 
  currentStep, 
  title, 
  icon: Icon 
}: { 
  step: number; 
  currentStep: number;
  title: string; 
  icon: React.ElementType;
}) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
      currentStep >= step 
        ? 'bg-gradient-to-r from-[#009944]/10 to-[#1E5CAA]/10 border-2 border-[#009944]/30 shadow-sm' 
        : 'bg-[#E6E7E8]/20 border border-[#E6E7E8]/30'
    }`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
      currentStep > step 
        ? 'bg-[#009944] text-white' 
        : currentStep === step 
        ? 'bg-gradient-to-br from-[#009944] to-[#1E5CAA] text-white shadow-lg' 
        : 'bg-[#E6E7E8] text-[#1E2D69]/40'
    }`}>
      {currentStep > step ? <Check size={20} /> : <Icon size={20} />}
    </div>
    <div className="flex-1">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#1E2D69]/60">
        Paso {step}
      </div>
      <div className="font-bold text-[#1E2D69]">{title}</div>
    </div>
    {currentStep > step && (
      <Check className="text-[#009944]" size={20} />
    )}
  </motion.div>
);

// Componente de campo mejorado
const FormField = ({ 
  label, 
  error, 
  children, 
  icon: Icon,
  optional = false
}: { 
  label: string; 
  error?: string; 
  children: React.ReactNode;
  icon?: React.ElementType;
  optional?: boolean;
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-2"
  >
    <div className="flex justify-between items-center">
      <label className="text-xs font-bold uppercase tracking-wider text-[#1E2D69]/70 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[#009944]" />}
        {label}
      </label>
      {optional && (
        <span className="text-[10px] text-[#1E2D69]/40 uppercase font-bold">Opcional</span>
      )}
    </div>
    {children}
    {error && (
      <motion.p 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="text-[#ED1C24] text-xs font-medium flex items-center gap-2 bg-[#ED1C24]/10 p-2 rounded-lg"
      >
        <div className="w-2 h-2 bg-[#ED1C24] rounded-full" />
        {error}
      </motion.p>
    )}
  </motion.div>
);

// Componente de pago Wompi
const WompiPaymentStep = ({ 
  total, 
  diocesisId,
  diocesisNombre,
  personas, 
  eventoId, 
  emailContacto,
  onSuccess,
  onError,
  onBack
}: { 
  total: number;
  diocesisId: string;
  diocesisNombre: string;
  personas: PersonaFormData[];
  eventoId: number;
  emailContacto?: string;
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
}) => {
  const [processing, setProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const handleWompiPayment = async () => {
    if (processing) return;
    
    setProcessing(true);
    setError("");

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
        diocesis_id: diocesisId,
        telefono: persona.telefono,
        medio_transporte: persona.mediodetransporte
      }));

      const response = await fetch('/api/wompi/crear-link', {
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
        onSuccess(data);
        setTimeout(() => window.location.href = data.url, 1000);
      }
    } catch (error: any) {
      setError(error.message);
      onError(error.message);
      setProcessing(false);
    }
  };

  if (paymentUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-[#009944] to-[#1E5CAA] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="text-white" size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#1E2D69] mb-2">Redirigiendo a Wompi</h3>
          <p className="text-[#1E2D69]/60">Serás redirigido automáticamente al portal de pago seguro...</p>
        </div>
        <div className="space-y-3">
          <a 
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-[#009944] to-[#1E5CAA] text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Abrir enlace de pago
          </a>
          <button
            onClick={onBack}
            className="block w-full text-[#1E2D69]/60 hover:text-[#1E2D69] text-sm"
          >
            Volver al formulario
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-[#009944]/20 to-[#1E5CAA]/20 rounded-xl flex items-center justify-center">
          <CreditCard className="text-[#009944]" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-[#1E2D69] uppercase italic">Proceso de Pago</h3>
          <p className="text-sm text-[#1E2D69]/60">Pago seguro a través de Wompi</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#1E5CAA] to-[#009944] rounded-2xl p-6 text-white mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Total a Pagar</span>
          <span className="text-3xl font-black">${total.toLocaleString()}</span>
        </div>
        <div className="text-[#E6E7E8]/80 text-sm">
          <div className="flex justify-between">
            <span>Personas:</span>
            <span className="font-bold">{personas.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Diócesis:</span>
            <span className="font-bold">{diocesisNombre}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#ED1C24]/10 border border-[#ED1C24]/20 p-4 rounded-xl text-[#ED1C24] text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#1E2D69] uppercase">Selecciona método de pago</h4>
          <ShieldCheck size={16} className="text-[#009944]" />
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWompiPayment}
            disabled={processing}
            className={`p-6 rounded-2xl border-2 transition-all ${
              processing 
                ? 'border-[#1E5CAA]/30 bg-[#1E5CAA]/10' 
                : 'border-[#1E5CAA]/20 hover:border-[#009944] hover:bg-[#009944]/5'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  processing 
                    ? 'bg-[#1E5CAA]/20 text-[#1E5CAA]' 
                    : 'bg-[#009944]/10 text-[#009944]'
                }`}>
                  <CreditCard size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#1E2D69]">Pago Online Seguro</p>
                  <p className="text-xs text-[#1E2D69]/60">Tarjeta, PSE, Nequi, Daviplata</p>
                </div>
              </div>
              {processing && <Loader2 className="animate-spin text-[#1E5CAA]" size={20} />}
            </div>
            
            <div className="flex items-center justify-between text-xs text-[#1E2D69]/60">
              <span className="flex items-center gap-1">
                <Lock size={12} className="text-[#009944]" />
                Encriptación SSL
              </span>
              <span className="flex items-center gap-1">
                <Shield size={12} className="text-[#1E5CAA]" />
                Protegido por Wompi
              </span>
              <span className="flex items-center gap-1">
                <QrCode size={12} />
                +10 métodos
              </span>
            </div>
          </motion.button>

          <div className="bg-gradient-to-r from-[#FFF200]/10 to-[#ED1C24]/10 p-4 rounded-2xl border border-[#FFF200]/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-[#ED1C24] mt-0.5" size={18} />
              <div>
                <p className="font-bold text-[#B41919] text-sm mb-1">Importante</p>
                <p className="text-xs text-[#1E2D69]/70">
                  Al completar el pago, serás redirigido a Wompi para finalizar la transacción. 
                  Recibirás un correo de confirmación con los detalles de tu inscripción.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-[#E6E7E8]/50">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-[#E6E7E8]/30 text-[#1E2D69] px-6 py-3 rounded-xl font-bold hover:bg-[#E6E7E8]/50 transition-all"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={handleWompiPayment}
          disabled={processing}
          className="flex-1 bg-gradient-to-r from-[#009944] to-[#1E5CAA] text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
        >
          {processing ? (
            <>
              <Loader2 className="animate-spin inline mr-2" size={16} />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="inline mr-2" size={16} />
              Pagar ${total.toLocaleString()}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Componente principal
export default function InscripcionPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [eventoActivo, setEventoActivo] = useState<any>(null);
  const [dbData, setDbData] = useState<any>({ tipos: [], eps: [], dio: [], config: null });
  const [stats, setStats] = useState({ inscritos: 0, cupos: 3000, porcentaje: 0 });
  const [selectedDiocesis, setSelectedDiocesis] = useState<{ id: string; nombre: string } | null>(null);
  const [paymentError, setPaymentError] = useState<string>("");
  const [paymentData, setPaymentData] = useState<any>(null);

  const { 
    register, 
    watch, 
    formState: { errors }, 
    control,
    trigger
  } = useForm<FormData>({
    defaultValues: {
      diocesis: "",
      personas: [{
        nombre: "",
        apellido: "",
        documento: "",
        email: "",
        entidadSalud: "",
        segmentacion: "",
        hospedaje: "no",
        mediodetransporte: "Autobús",
        telefono: "",
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "personas" });
  const watchFields = watch();

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const { data: evento } = await supabase
          .from('eventos')
          .select('*')
          .eq('esta_activo', true)
          .maybeSingle();

        if (evento) {
          setEventoActivo(evento);
          const { count: inscritos } = await supabase
            .from('inscripciones')
            .select('*', { count: 'exact', head: true })
            .eq('evento_id', evento.id);

          const cupos = 3000;
          const porcentaje = cupos > 0 ? Math.min(((inscritos || 0) / cupos) * 100, 100) : 0;
          setStats({ inscritos: inscritos || 0, cupos, porcentaje });

          const [t, e, d, c] = await Promise.all([
            supabase.from('tipos_persona').select('*').eq('evento_id', evento.id),
            supabase.from('eps').select('*').order('nombre'),
            supabase.from('jurisdicciones').select('*').eq('evento_id', evento.id).order('nombre'),
            supabase.from('configuracion_evento').select('*').eq('evento_id', evento.id).maybeSingle()
          ]);

          setDbData({
            tipos: t.data || [],
            eps: e.data || [],
            dio: d.data || [],
            config: c.data || null
          });
        }
      } catch (error) {
        console.error("Error inicializando:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const resumen = useMemo(() => {
    const { config, dio, tipos } = dbData;
    if (!config || !eventoActivo) return { total: 0, cantidadPersonas: 0, subtotal: 0 };

    const diocesisData = dio.find((d: any) => d.id === watchFields.diocesis);
    let subtotal = 0;
    (watchFields.personas || []).forEach((persona: any) => {
      const rolData = tipos.find((t: any) => t.valor === persona.segmentacion);
      let base = 0;
      if (config.modo_precio === 'global') {
        base = Number(config.precio_global_base) || 0;
      } else {
        base = Number(diocesisData?.precio_base) || 0;
      }

      let dto = 0;
      if (rolData && base > 0) {
        if (rolData.metodo_activo === 'porcentaje') {
          dto = base * ((Number(rolData.descuento_porcentaje) || 0) / 100);
        } else {
          dto = Number(rolData.descuento_fijo) || 0;
        }
      }

      let costoHospedaje = 0;
      if (persona.hospedaje === 'si') {
        if (config.usar_hospedaje_diocesis) {
          costoHospedaje = Number(diocesisData?.precio_hospedaje_especifico) || 0;
        } else {
          costoHospedaje = Number(config.valor_hospedaje_general) || 0;
        }
      }

      subtotal += Math.max(0, base - dto + costoHospedaje);
    });

    const surchargeRate = 0.0267;
    const taxOnSurchargeRate = 0.19;
    const fixedFee = 700;

    const surchargeAmount = subtotal * surchargeRate;
    const taxOnSurcharge = surchargeAmount * taxOnSurchargeRate;
    const totalFinal = subtotal + surchargeAmount + taxOnSurcharge + fixedFee;

    return {
      total: totalFinal,
      cantidadPersonas: watchFields.personas?.length || 0,
      subtotal
    };
  }, [watchFields, dbData, eventoActivo]);

  const validateAllPersons = async () => {
    const result = await trigger();
    return result;
  };

  const prevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const nextStep = async () => {
    const isValid = await validateAllPersons();
    if (!isValid) {
      alert("Por favor, complete correctamente todos los campos requeridos.");
      return;
    }

    const diocesisSel = dbData.dio.find((d: any) => d.id === watchFields.diocesis);
    if (diocesisSel) {
      setSelectedDiocesis({ id: diocesisSel.id, nombre: diocesisSel.nombre });
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6E7E8] to-[#1E5CAA]/10 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-r from-[#009944] to-[#1E5CAA] rounded-2xl animate-pulse" />
          <Loader2 className="absolute inset-0 m-auto text-white animate-spin" size={32} />
        </div>
        <div>
          <p className="text-sm font-bold text-[#1E2D69] uppercase tracking-widest">Preparando experiencia premium</p>
          <p className="text-xs text-[#1E2D69]/60 mt-2">Cargando configuración del evento...</p>
        </div>
      </div>
    </div>
  );

  if (!eventoActivo) return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6E7E8] to-[#1E5CAA]/10 flex items-center justify-center p-4">
      <div className="text-center max-w-md bg-white/80 backdrop-blur-sm p-12 rounded-[3rem] shadow-2xl border border-white/50">
        <div className="w-20 h-20 bg-gradient-to-br from-[#1E2D69]/10 to-[#1E5CAA]/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <Calendar className="text-[#1E2D69]/50" size={32} />
        </div>
        <h2 className="text-3xl font-black text-[#1E2D69] uppercase italic mb-4">Sin Eventos Activos</h2>
        <p className="text-[#1E2D69]/70 mb-8 leading-relaxed">
          Actualmente no hay inscripciones disponibles. Te notificaremos cuando se abran las inscripciones para el próximo evento.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-[#1E2D69] to-[#1E5CAA] text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:shadow-lg transition-all"
        >
          Reintentar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-gradient-to-br from-[#E6E7E8] via-white to-[#1E5CAA]/10 -z-10" />
      <div className="fixed top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#009944]/20 to-[#1E5CAA]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-[#EC008C]/20 to-[#FFF200]/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel Lateral */}
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-[#1E2D69] to-[#1E5CAA] rounded-[2.5rem] p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={16} className="text-[#FFF200]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FFF200]/70">
                      Inscripción Múltiple
                    </span>
                  </div>
                  <h1 className="text-3xl font-black italic uppercase leading-tight">{eventoActivo.nombre}</h1>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#FFF200] to-[#ED1C24] rounded-2xl flex items-center justify-center rotate-6 shadow-lg">
                  <Users size={24} className="text-white" />
                </div>
              </div>

              <p className="text-[#E6E7E8]/70 leading-relaxed mb-8 border-l-2 border-[#FFF200] pl-4">
                {eventoActivo.descripcion || "Inscripción múltiple por diócesis. Agregue todos los participantes de su jurisdicción."}
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <span className="text-[#E6E7E8]/80 text-sm">Cupos Disponibles</span>
                  <span className="font-bold">{stats.cupos - stats.inscritos} / {stats.cupos}</span>
                </div>
                <div className="bg-[#1E2D69]/50 rounded-full h-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.porcentaje}%` }}
                    className="bg-gradient-to-r from-[#009944] to-[#FFF200] h-2 rounded-full"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1E5CAA]/30 rounded-lg flex items-center justify-center">
                    <Shield size={14} className="text-[#009944]" />
                  </div>
                  <span className="text-sm">Inscripción múltiple</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1E5CAA]/30 rounded-lg flex items-center justify-center">
                    <CreditCard size={14} className="text-[#FFF200]" />
                  </div>
                  <span className="text-sm">Pago seguro con Wompi</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1E5CAA]/30 rounded-lg flex items-center justify-center">
                    <Smartphone size={14} className="text-[#EC008C]" />
                  </div>
                  <span className="text-sm">Recibo digital automático</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <FormStep step={1} currentStep={currentStep} title="Selección de Diócesis" icon={Building2} />
              <FormStep step={1} currentStep={currentStep} title="Registro de Personas" icon={Users} />
              <FormStep step={2} currentStep={currentStep} title="Pago Seguro" icon={CreditCard} />
            </div>

            {currentStep !== 1 && watchFields.personas?.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:hidden bg-white rounded-2xl p-6 border border-[#E6E7E8] shadow-lg"
              >
                <h4 className="text-sm font-bold text-[#1E2D69] uppercase mb-4">Resumen Total</h4>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-[#1E2D69]/70">Personas:</span>
                    <span className="font-bold text-[#1E2D69]">{watchFields.personas.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#1E2D69]/70">Diócesis:</span>
                    <span className="font-bold text-[#1E2D69]">{selectedDiocesis?.nombre || ""}</span>
                  </div>
                </div>
                <div className="border-t border-[#E6E7E8]/50 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#1E2D69]">Total a Pagar</span>
                    <span className="text-2xl font-black text-[#009944]">${resumen.total.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Formulario Principal */}
          <motion.div initial={{ x: 20 }} animate={{ x: 0 }} className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/50">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#009944]/20 to-[#1E5CAA]/20 rounded-xl flex items-center justify-center">
                        <Building2 className="text-[#009944]" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-[#1E2D69] uppercase italic">Selección de Diócesis</h3>
                        <p className="text-sm text-[#1E2D69]/60">Seleccione la diócesis a la que pertenecen los participantes</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <FormField label="Jurisdicción (Diócesis)" error={errors.diocesis?.message} icon={Building2}>
                        <div className="relative">
                          <select 
                            {...register("diocesis", { required: "La diócesis es requerida" })}
                            className="w-full bg-[#E6E7E8]/30 border border-[#E6E7E8] rounded-xl p-4 font-medium text-[#1E2D69] focus:outline-none focus:ring-2 focus:ring-[#009944] focus:border-transparent appearance-none cursor-pointer"
                          >
                            <option value="">Seleccione su jurisdicción...</option>
                            {dbData.dio.map((d: any) => (
                              <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#1E2D69]/40">
                            <ChevronRight size={20} className="rotate-90" />
                          </div>
                        </div>
                      </FormField>

                      {watchFields.diocesis && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gradient-to-r from-[#009944]/10 to-[#1E5CAA]/10 p-6 rounded-2xl border border-[#009944]/30"
                        >
                          <div className="flex items-start gap-3">
                            <Check size={20} className="text-[#009944] mt-0.5" />
                            <div>
                              <p className="font-bold text-[#009944] mb-2">
                                Diócesis seleccionada: {dbData.dio.find((d: any) => d.id === watchFields.diocesis)?.nombre}
                              </p>
                              <p className="text-sm text-[#1E2D69]/70">
                                Ahora puede proceder a agregar los participantes de esta diócesis.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Registro de Personas */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#EC008C]/20 to-[#FFF200]/20 rounded-xl flex items-center justify-center">
                            <Users className="text-[#EC008C]" size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-[#1E2D69] uppercase italic">Registro de Personas</h3>
                            <p className="text-sm text-[#1E2D69]/60">
                              Diócesis: <strong>{dbData.dio.find((d: any) => d.id === watchFields.diocesis)?.nombre || ""}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => append({
                            nombre: "", apellido: "", documento: "", email: "",
                            entidadSalud: "", segmentacion: "", hospedaje: "no",
                            mediodetransporte: "Autobús", telefono: ""
                          })}
                          className="bg-gradient-to-r from-[#009944] to-[#1E5CAA] text-white px-4 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <Plus size={16} /> Agregar Persona
                        </button>
                      </div>

                      <div className="space-y-6">
                        {fields.map((field, index) => (
                          <motion.div
                            key={field.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-br from-[#E6E7E8]/20 to-white p-6 rounded-2xl border border-[#E6E7E8]/50 shadow-sm"
                          >
                            <div className="flex justify-between items-center mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#009944]/10 to-[#1E5CAA]/10 rounded-xl flex items-center justify-center">
                                  <User className="text-[#009944]" size={18} />
                                </div>
                                <span className="font-bold text-[#1E2D69]">Persona {index + 1}</span>
                              </div>
                              {fields.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="p-2 hover:bg-[#E6E7E8]/30 rounded-lg transition-colors text-[#1E2D69]/40 hover:text-[#ED1C24]"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField label="Nombres Completos" error={errors.personas?.[index]?.nombre?.message}>
                                <input {...register(`personas.${index}.nombre`, { required: "Requerido", minLength: { value: 3, message: "Mínimo 3 caracteres" } })}
                                  className="w-full bg-[#E6E7E8]/30 border border-[#E6E7E8] rounded-xl p-3 font-medium text-[#1E2D69] focus:outline-none focus:ring-2 focus:ring-[#009944] placeholder:text-[#1E2D69]/40"
                                  placeholder="María Alejandra"
                                />
                              </FormField>

                              <FormField label="Apellidos Completos" error={errors.personas?.[index]?.apellido?.message}>
                                <input {...register(`personas.${index}.apellido`, { required: "Requerido", minLength: { value: 3, message: "Mínimo 3 caracteres" } })}
                                  className="w-full bg-[#E6E7E8]/30 border border-[#E6E7E8] rounded-xl p-3 font-medium text-[#1E2D69] focus:outline-none focus:ring-2 focus:ring-[#009944] placeholder:text-[#1E2D69]/40"
                                  placeholder="Pérez García"
                                />
                              </FormField>

                              <FormField label="Documento de Identidad" error={errors.personas?.[index]?.documento?.message}>
                                <input {...register(`personas.${index}.documento`, { required: "Requerido", minLength: { value: 5, message: "Mínimo 5 caracteres" } })}
                                  className="w-full bg-[#E6E7E8]/30 border border-[#E6E7E8] rounded-xl p-3 font-medium text-[#1E2D69] focus:outline-none focus:ring-2 focus:ring-[#009944] placeholder:text-[#1E2D69]/40"
                                  placeholder="Número de identificación"
                                />
                              </FormField>

                              <FormField label="Correo Electrónico" error={errors.personas?.[index]?.email?.message}>
                                <input {...register(`personas.${index}.email`, { required: "Requerido", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email inválido" } })}
                                  type="email"
                                  className="w-full bg-[#E6E7E8]/30 border border-[#E6E7E8] rounded-xl p-3 font-medium text-[#1E2D69] focus:outline-none focus:ring-2 focus:ring-[#009944] placeholder:text-[#1E2D69]/40"
                                  placeholder="contacto@ejemplo.com"
                                />
                              </FormField>

                              <div className="md:col-span-2">
                                <FormField label="Entidad de Salud (EPS)" error={errors.personas?.[index]?.entidadSalud?.message}>
                                  <div className="relative">
                                    <select {...register(`personas.${index}.entidadSalud`, { required: "La EPS es requerida" })}
                                      className="w-full bg-[#E6E7E8]/30 border border-[#E6E7E8] rounded-xl p-3 font-medium text-[#1E2D69] focus:outline-none focus:ring-2 focus:ring-[#009944] appearance-none cursor-pointer"
                                    >
                                      <option value="">Seleccionar entidad de salud...</option>
                                      {dbData.eps.map((e: any) => (
                                        <option key={e.id} value={e.nombre}>{e.nombre}</option>
                                      ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#1E2D69]/40">
                                      <ChevronRight size={20} className="rotate-90" />
                                    </div>
                                  </div>
                                </FormField>
                              </div>

                              <FormField label="Tipo de Participante" error={errors.personas?.[index]?.segmentacion?.message}>
                                <div className="relative">
                                  <select {...register(`personas.${index}.segmentacion`, { required: "El tipo de participante es requerido" })}
                                    className="w-full bg-[#E6E7E8]/30 border border-[#E6E7E8] rounded-xl p-3 font-medium text-[#1E2D69] focus:outline-none focus:ring-2 focus:ring-[#009944] appearance-none cursor-pointer"
                                  >
                                    <option value="">Selecciona tu perfil...</option>
                                    {dbData.tipos.map((t: any) => (
                                      <option key={t.id} value={t.valor}>{t.nombre}</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#1E2D69]/40">
                                    <ChevronRight size={20} className="rotate-90" />
                                  </div>
                                </div>
                              </FormField>

                              <FormField label="Hospedaje" error={errors.personas?.[index]?.hospedaje?.message}>
                                <div className="grid grid-cols-2 gap-3">
                                  <label className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                                    watchFields.personas?.[index]?.hospedaje === 'si' 
                                      ? 'border-[#009944] bg-[#009944]/10' 
                                      : 'border-[#E6E7E8] hover:border-[#E6E7E8]/70'
                                  }`}>
                                    <input type="radio" value="si" {...register(`personas.${index}.hospedaje`, { required: "Seleccione una opción" })} className="sr-only" />
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        watchFields.personas?.[index]?.hospedaje === 'si' 
                                          ? 'border-[#009944] bg-[#009944]' 
                                          : 'border-[#E6E7E8]'
                                      }`} />
                                      <span className="font-bold text-[#1E2D69]">Sí</span>
                                    </div>
                                  </label>
                                  <label className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                                    watchFields.personas?.[index]?.hospedaje === 'no' 
                                      ? 'border-[#1E2D69]/30 bg-[#1E2D69]/5' 
                                      : 'border-[#E6E7E8] hover:border-[#E6E7E8]/70'
                                  }`}>
                                    <input type="radio" value="no" {...register(`personas.${index}.hospedaje`, { required: "Seleccione una opción" })} className="sr-only" />
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        watchFields.personas?.[index]?.hospedaje === 'no' 
                                          ? 'border-[#1E2D69]/50 bg-[#1E2D69]/50' 
                                          : 'border-[#E6E7E8]'
                                      }`} />
                                      <span className="font-bold text-[#1E2D69]">No</span>
                                    </div>
                                  </label>
                                </div>
                              </FormField>

                              <FormField label="Teléfono" error={errors.personas?.[index]?.telefono?.message}>
                                <input {...register(`personas.${index}.telefono`, { required: "Requerido", minLength: { value: 10, message: "Mínimo 10 dígitos" } })}
                                  type="tel"
                                  className="w-full bg-[#E6E7E8]/30 border border-[#E6E7E8] rounded-xl p-3 font-medium text-[#1E2D69] focus:outline-none focus:ring-2 focus:ring-[#009944] placeholder:text-[#1E2D69]/40"
                                  placeholder="Número de teléfono"
                                />
                              </FormField>

                              <FormField label="Modo de transporte" error={errors.personas?.[index]?.mediodetransporte?.message}>
                                <div className="grid grid-cols-2 gap-4">
                                  <label className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                                    watchFields.personas?.[index]?.mediodetransporte === 'Avión' 
                                      ? 'border-[#009944] bg-[#009944]/10' 
                                      : 'border-[#E6E7E8] hover:border-[#E6E7E8]/70'
                                  }`}>
                                    <input type="radio" value="Avión" {...register(`personas.${index}.mediodetransporte`, { required: "Seleccione una opción" })} className="sr-only" />
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        watchFields.personas?.[index]?.mediodetransporte === 'Avión' 
                                          ? 'border-[#009944] bg-[#009944]' 
                                          : 'border-[#E6E7E8]'
                                      }`} />
                                      <span className="font-bold text-[#1E2D69]">Avión</span>
                                    </div>
                                  </label>
                                  <label className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                                    watchFields.personas?.[index]?.mediodetransporte === 'Autobús' 
                                      ? 'border-[#1E2D69]/30 bg-[#1E2D69]/5' 
                                      : 'border-[#E6E7E8] hover:border-[#E6E7E8]/70'
                                  }`}>
                                    <input type="radio" value="Autobús" {...register(`personas.${index}.mediodetransporte`, { required: "Seleccione una opción" })} className="sr-only" />
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        watchFields.personas?.[index]?.mediodetransporte === 'Autobús' 
                                          ? 'border-[#1E2D69]/50 bg-[#1E2D69]/50' 
                                          : 'border-[#E6E7E8]'
                                      }`} />
                                      <span className="font-bold text-[#1E2D69]">Autobús</span>
                                    </div>
                                  </label>
                                </div>
                              </FormField>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Resumen Desktop */}
                      <div className="hidden lg:block">
                        <div className="sticky top-8 space-y-4">
                          <h4 className="text-sm font-bold text-[#1E2D69] uppercase mb-4">Resumen de Inscripción</h4>
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-[#1E5CAA] to-[#009944] rounded-2xl p-6 text-white"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold">Total a Pagar</span>
                              <span className="text-3xl font-black">${resumen.total.toLocaleString()}</span>
                            </div>
                            <div className="text-[#E6E7E8]/80 text-sm">
                              <div className="flex justify-between">
                                <span>Personas:</span>
                                <span className="font-bold">{resumen.cantidadPersonas}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Diócesis:</span>
                                <span className="font-bold">{selectedDiocesis?.nombre || dbData.dio.find((d: any) => d.id === watchFields.diocesis)?.nombre || ""}</span>
                              </div>
                            </div>
                          </motion.div>

                          <div className="bg-gradient-to-r from-[#FFF200]/10 to-[#ED1C24]/10 p-6 rounded-2xl border border-[#FFF200]/30">
                            <div className="flex items-start gap-3">
                              <AlertTriangle size={20} className="text-[#ED1C24] mt-0.5" />
                              <div>
                                <p className="font-bold text-[#B41919] mb-2">Instrucciones importantes</p>
                                <ul className="text-sm text-[#1E2D69]/70 space-y-2">
                                  <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-[#ED1C24] rounded-full mt-1.5" />
                                    Verifique los datos de cada persona
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-[#ED1C24] rounded-full mt-1.5" />
                                    Todas las inscripciones se procesarán juntas
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-[#ED1C24] rounded-full mt-1.5" />
                                    Recibirá un correo por cada persona registrada
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <motion.div className="pt-6 border-t border-[#E6E7E8]/50">
                        <button
                          type="button"
                          onClick={nextStep}
                          disabled={fields.length === 0 || !watchFields.diocesis}
                          className="w-full bg-gradient-to-r from-[#009944] to-[#1E5CAA] text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                          <CreditCard size={18} /> Proceder al Pago <Sparkles size={16} />
                        </button>
                        <p className="text-center text-xs text-[#1E2D69]/60 mt-4">
                          Serás redirigido a Wompi para completar el pago de forma segura.
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && selectedDiocesis && (
                  <WompiPaymentStep
                    total={resumen.total}
                    diocesisId={selectedDiocesis.id}
                    diocesisNombre={selectedDiocesis.nombre}
                    personas={watchFields.personas}
                    eventoId={eventoActivo.id}
                    emailContacto={watchFields.personas?.[0]?.email}
                    onSuccess={setPaymentData}
                    onError={setPaymentError}
                    onBack={prevStep}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}