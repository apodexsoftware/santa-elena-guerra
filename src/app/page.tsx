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
const step1Schema = {
  diocesis: (val: string) => val ? true : "La diócesis es requerida"
};

const personaSchema = {
  nombre: (val: string) => val?.length >= 3 ? true : "Mínimo 3 caracteres",
  apellido: (val: string) => val?.length >= 3 ? true : "Mínimo 3 caracteres",
  documento: (val: string) => val?.length >= 5 ? true : "Mínimo 5 caracteres",
  email: (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? true : "Email inválido",
  entidadSalud: (val: string) => val ? true : "La EPS es requerida",
  segmentacion: (val: string) => val ? true : "El tipo de participante es requerido",
  hospedaje: (val: string) => val ? true : "Seleccione una opción"
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
};

type FormData = {
  diocesis: string;
  personas: PersonaFormData[];
};

type PaymentStep = 'form' | 'processing' | 'redirect' | 'success' | 'error';

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
        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-100 shadow-sm' 
        : 'bg-slate-50 border border-slate-100'
    }`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
      currentStep > step 
        ? 'bg-emerald-500 text-white' 
        : currentStep === step 
        ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200' 
        : 'bg-slate-200 text-slate-400'
    }`}>
      {currentStep > step ? <Check size={20} /> : <Icon size={20} />}
    </div>
    <div className="flex-1">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        Paso {step}
      </div>
      <div className="font-bold text-slate-800">{title}</div>
    </div>
    {currentStep > step && (
      <Check className="text-emerald-500" size={20} />
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
      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-indigo-500" />}
        {label}
      </label>
      {optional && (
        <span className="text-[10px] text-slate-400 uppercase font-bold">Opcional</span>
      )}
    </div>
    {children}
    {error && (
      <motion.p 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="text-rose-500 text-xs font-medium flex items-center gap-2 bg-rose-50 p-2 rounded-lg"
      >
        <div className="w-2 h-2 bg-rose-500 rounded-full" />
        {error}
      </motion.p>
    )}
  </motion.div>
);

// Componente de pago Wompi
const WompiPaymentStep = ({ 
  total, 
  diocesis, 
  personas, 
  eventoId, 
  emailContacto,
  onSuccess,
  onError,
  onBack
}: { 
  total: number;
  diocesis: string;
  personas: any[];
  eventoId: number;
  emailContacto?: string;
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
  onBack: () => void;
}) => {
  const [processing, setProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const handleWompiPayment = async () => {
    if (processing) return;
    
    setProcessing(true);
    onError(""); // Limpiar errores previos

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
        precio_pactado: total / personas.length,
        diocesis
      }));

      const response = await fetch('/api/wompi/crear-link', {
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
        onSuccess(data);
      }
    } catch (error: any) {
      console.error('Error al procesar pago:', error);
      onError(error.message || 'Error desconocido al procesar el pago');
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
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="text-white" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Redirigiendo a Wompi</h3>
          <p className="text-slate-600">Serás redirigido automáticamente al portal de pago seguro...</p>
        </div>
        <div className="space-y-3">
          <a 
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Abrir enlace de pago
          </a>
          <button
            onClick={onBack}
            className="block w-full text-slate-600 hover:text-slate-800 text-sm"
          >
            Volver al formulario
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
          <CreditCard className="text-emerald-600" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic">
            Proceso de Pago
          </h3>
          <p className="text-sm text-slate-500">
            Pago seguro a través de Wompi
          </p>
        </div>
      </div>

      {/* Resumen de pago */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 text-white mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Total a Pagar</span>
          <span className="text-3xl font-black">
            ${total.toLocaleString()}
          </span>
        </div>
        <div className="text-indigo-200 text-sm">
          <div className="flex justify-between">
            <span>Personas:</span>
            <span className="font-bold">{personas.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Diócesis:</span>
            <span className="font-bold">{diocesis}</span>
          </div>
        </div>
      </div>

      {/* Métodos de pago */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800 uppercase">Selecciona método de pago</h4>
          <ShieldCheck size={16} className="text-emerald-500" />
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWompiPayment}
            disabled={processing}
            className={`p-6 rounded-2xl border-2 transition-all ${
              processing 
                ? 'border-indigo-300 bg-indigo-50' 
                : 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  processing 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <CreditCard size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">Pago Online Seguro</p>
                  <p className="text-xs text-slate-500">Tarjeta, PSE, Nequi, Daviplata</p>
                </div>
              </div>
              {processing && (
                <Loader2 className="animate-spin text-indigo-600" size={20} />
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Lock size={12} className="text-emerald-500" />
                Encriptación SSL
              </span>
              <span className="flex items-center gap-1">
                <Shield size={12} className="text-indigo-500" />
                Protegido por Wompi
              </span>
              <span className="flex items-center gap-1">
                <QrCode size={12} />
                +10 métodos
              </span>
            </div>
          </motion.button>

          {/* Información adicional */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-amber-800 text-sm mb-1">Importante</p>
                <p className="text-xs text-amber-700">
                  Al completar el pago, serás redirigido a Wompi para finalizar la transacción. 
                  Recibirás un correo de confirmación con los detalles de tu inscripción.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={handleWompiPayment}
          disabled={processing}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
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
  const [currentStep, setCurrentStep] = useState<string | 'payment'>('form');
  const [eventoActivo, setEventoActivo] = useState<any>(null);
  const [dbData, setDbData] = useState<any>({ tipos: [], eps: [], dio: [], config: null });
  const [stats, setStats] = useState({ inscritos: 0, cupos: 5000, porcentaje: 0 });
  const [selectedDiocesis, setSelectedDiocesis] = useState<string>("");
  const [paymentError, setPaymentError] = useState<string>("");
  const [paymentData, setPaymentData] = useState<any>(null);

  const { 
    register, 
    handleSubmit, 
    watch, 
    formState: { errors }, 
    control,
    setValue,
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
        hospedaje: "no"
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "personas"
  });

  const watchFields = watch();

  // Cargar datos iniciales
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        
        // Obtener evento activo
        const { data: evento } = await supabase
          .from('eventos')
          .select('*')
          .eq('esta_activo', true)
          .maybeSingle();

        if (evento) {
          setEventoActivo(evento);

          // Obtener estadísticas
          const { count: inscritos } = await supabase
            .from('inscripciones')
            .select('*', { count: 'exact', head: true })
            .eq('evento_id', evento.id);

          // Calcular porcentaje de cupos
          const porcentaje = Math.min(((inscritos || 0) / 100) * 100, 100);
          setStats({ inscritos: inscritos || 0, cupos: 5000, porcentaje });

          // Cargar datos del formulario
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

  // Calcular resumen financiero
  const resumen = useMemo(() => {
    const { config, dio, tipos } = dbData;
    
    if (!config || !eventoActivo) return { porPersona: [], total: 0, cantidadPersonas: 0 };

    const diocesisData = dio.find((d: any) => d.nombre === watchFields.diocesis);
    let totalGeneral = 0;
    const resumenPorPersona = watchFields.personas?.map((persona: any) => {
      const rolData = tipos.find((t: any) => t.valor === persona.segmentacion);

      // Precio base
      let base = 0;
      if (config.modo_precio === 'global') {
        base = Number(config.precio_global_base) || 0;
      } else {
        base = Number(diocesisData?.precio_base) || 0;
      }

      // Descuento
      let dto = 0;
      if (rolData && base > 0) {
        if (rolData.metodo_activo === 'porcentaje') {
          dto = base * ((Number(rolData.descuento_porcentaje) || 0) / 100);
        } else {
          dto = Number(rolData.descuento_fijo) || 0;
        }
      }

      // Hospedaje
      let costoHospedaje = 0;
      if (persona.hospedaje === 'si') {
        if (config.usar_hospedaje_diocesis) {
          costoHospedaje = Number(diocesisData?.precio_hospedaje_especifico) || 0;
        } else {
          costoHospedaje = Number(config.valor_hospedaje_general) || 0;
        }
      }

      const total = Math.max(0, base - dto + costoHospedaje);
      totalGeneral += total;
      
      return { base, dto, hospedaje: costoHospedaje, total };
    }) || [];

    return {
      porPersona: resumenPorPersona,
      total: totalGeneral,
      cantidadPersonas: watchFields.personas?.length || 0
    };
  }, [watchFields, dbData, eventoActivo]);

  // Navegación entre pasos
  const nextStep = async () => {
    if (currentStep === 'form') {
      // Validar diócesis
      if (!watchFields.diocesis) {
        alert("Debe seleccionar una diócesis");
        return;
      }
      setSelectedDiocesis(watchFields.diocesis);
      setCurrentStep('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Validar persona individual
  const validarPersona = (persona: any, index: number) => {
    const errores: any = {};
    Object.keys(personaSchema).forEach(key => {
      const validator = (personaSchema as any)[key];
      const value = persona[key];
      const error = validator(value);
      if (error !== true) {
        errores[key] = error;
      }
    });
    return Object.keys(errores).length === 0;
  };

  // Estados de carga
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl animate-pulse" />
          <Loader2 className="absolute inset-0 m-auto text-white animate-spin" size={32} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700 uppercase tracking-widest">
            Preparando experiencia premium
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Cargando configuración del evento...
          </p>
        </div>
      </div>
    </div>
  );

  if (!eventoActivo) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md bg-white/80 backdrop-blur-sm p-12 rounded-[3rem] shadow-2xl border border-white/50">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <Calendar className="text-slate-400" size={32} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase italic mb-4">
          Sin Eventos Activos
        </h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Actualmente no hay inscripciones disponibles. 
          Te notificaremos cuando se abran las inscripciones para el próximo evento.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-slate-700 to-slate-900 text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:shadow-lg transition-all"
        >
          Reintentar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50 -z-10" />
      <div className="fixed top-0 left-0 w-96 h-96 bg-gradient-to-br from-indigo-200/30 to-purple-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-200/20 to-cyan-200/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans relative">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel Lateral - Evento Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={16} className="text-amber-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                      Inscripción Múltiple
                    </span>
                  </div>
                  <h1 className="text-3xl font-black italic uppercase leading-tight">
                    {eventoActivo.nombre}
                  </h1>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center rotate-6 shadow-lg">
                  <Users size={24} className="text-white" />
                </div>
              </div>

              <p className="text-indigo-200 leading-relaxed mb-8 border-l-2 border-indigo-500 pl-4">
                {eventoActivo.descripcion || "Inscripción múltiple por diócesis. Agregue todos los participantes de su jurisdicción."}
              </p>

              {/* Stats del Evento */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-300 text-sm">Cupos Disponibles</span>
                  <span className="font-bold">{stats.cupos - stats.inscritos} / {stats.cupos}</span>
                </div>
                <div className="w-full bg-indigo-800/50 rounded-full h-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.porcentaje}%` }}
                    className="bg-gradient-to-r from-emerald-400 to-green-400 h-2 rounded-full"
                  />
                </div>
              </div>

              {/* Beneficios */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-700 rounded-lg flex items-center justify-center">
                    <Shield size={14} className="text-emerald-300" />
                  </div>
                  <span className="text-sm">Inscripción múltiple</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-700 rounded-lg flex items-center justify-center">
                    <CreditCard size={14} className="text-amber-300" />
                  </div>
                  <span className="text-sm">Pago seguro con Wompi</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-700 rounded-lg flex items-center justify-center">
                    <Smartphone size={14} className="text-purple-300" />
                  </div>
                  <span className="text-sm">Recibo digital automático</span>
                </div>
              </div>
            </div>

            {/* Pasos del Formulario */}
            <div className="space-y-3">
              <FormStep step={1} currentStep={currentStep === 'form' ? 1 : 2} title="Selección de Diócesis" icon={Building2} />
              <FormStep step={2} currentStep={currentStep === 'form' ? 1 : 2} title="Registro de Personas" icon={Users} />
              <FormStep step={3} currentStep={currentStep === 'payment' ? 3 : 2} title="Pago Seguro" icon={CreditCard} />
            </div>

            {/* Resumen en Móvil */}
            {currentStep !== 'form' && watchFields.personas && watchFields.personas.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:hidden bg-white rounded-2xl p-6 border border-slate-200 shadow-lg"
              >
                <h4 className="text-sm font-bold text-slate-800 uppercase mb-4">Resumen Total</h4>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Personas:</span>
                    <span className="font-bold text-slate-800">{watchFields.personas.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Diocesis:</span>
                    <span className="font-bold text-slate-800">{selectedDiocesis}</span>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Total a Pagar</span>
                    <span className="text-2xl font-black text-indigo-700">
                      ${resumen.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Formulario Principal */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/50">
              <AnimatePresence mode="wait">
                {/* Paso 1: Selección de Diócesis */}
                {currentStep === 'form' && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                        <Building2 className="text-indigo-600" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase italic">
                          Selección de Diócesis
                        </h3>
                        <p className="text-sm text-slate-500">
                          Seleccione la diócesis a la que pertenecen los participantes
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <FormField label="Jurisdicción (Diócesis)" error={!watchFields.diocesis ? "Debe seleccionar una diócesis" : undefined} icon={Building2}>
                        <div className="relative">
                          <select 
                            {...register("diocesis")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
                            onChange={(e) => setValue("diocesis", e.target.value)}
                          >
                            <option value="">Seleccione su jurisdicción...</option>
                            {dbData.dio.map((d: any) => (
                              <option key={d.id} value={d.nombre}>{d.nombre}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronRight size={20} className="rotate-90" />
                          </div>
                        </div>
                      </FormField>

                      {watchFields.diocesis && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-100"
                        >
                          <div className="flex items-start gap-3">
                            <Check size={20} className="text-emerald-600 mt-0.5" />
                            <div>
                              <p className="font-bold text-emerald-800 mb-2">
                                Diócesis seleccionada: {watchFields.diocesis}
                              </p>
                              <p className="text-sm text-emerald-700">
                                Ahora puede proceder a agregar los participantes de esta diócesis.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Paso 2: Registro de Personas */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                            <Users className="text-purple-600" size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase italic">
                              Registro de Personas
                            </h3>
                            <p className="text-sm text-slate-500">
                              Diócesis: <strong>{selectedDiocesis || watchFields.diocesis}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => append({
                            nombre: "",
                            apellido: "",
                            documento: "",
                            email: "",
                            entidadSalud: "",
                            segmentacion: "",
                            hospedaje: "no"
                          })}
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Agregar Persona
                        </button>
                      </div>

                      <div className="space-y-6">
                        {fields.map((field, index) => (
                          <motion.div
                            key={field.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex justify-between items-center mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                                  <User className="text-indigo-600" size={18} />
                                </div>
                                <span className="font-bold text-slate-800">
                                  Persona {index + 1}
                                </span>
                              </div>
                              {fields.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-rose-500"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField label="Nombres Completos" error={!watchFields.personas?.[index]?.nombre ? "Requerido" : undefined}>
                                <input 
                                  {...register(`personas.${index}.nombre` as const)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                                  placeholder="María Alejandra"
                                />
                              </FormField>

                              <FormField label="Apellidos Completos" error={!watchFields.personas?.[index]?.apellido ? "Requerido" : undefined}>
                                <input 
                                  {...register(`personas.${index}.apellido` as const)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                                  placeholder="Pérez García"
                                />
                              </FormField>

                              <FormField label="Documento de Identidad" error={!watchFields.personas?.[index]?.documento ? "Requerido" : undefined}>
                                <input 
                                  {...register(`personas.${index}.documento` as const)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                                  placeholder="Número de identificación"
                                />
                              </FormField>

                              <FormField label="Correo Electrónico" error={!watchFields.personas?.[index]?.email ? "Requerido" : undefined}>
                                <input 
                                  {...register(`personas.${index}.email` as const)}
                                  type="email"
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                                  placeholder="contacto@ejemplo.com"
                                />
                              </FormField>

                              <div className="md:col-span-2">
                                <FormField label="Entidad de Salud (EPS)" error={!watchFields.personas?.[index]?.entidadSalud ? "Requerido" : undefined}>
                                  <div className="relative">
                                    <select 
                                      {...register(`personas.${index}.entidadSalud` as const)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
                                    >
                                      <option value="">Seleccionar entidad de salud...</option>
                                      {dbData.eps.map((e: any) => (
                                        <option key={e.id} value={e.nombre}>{e.nombre}</option>
                                      ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                      <ChevronRight size={20} className="rotate-90" />
                                    </div>
                                  </div>
                                </FormField>
                              </div>

                              <FormField label="Tipo de Participante" error={!watchFields.personas?.[index]?.segmentacion ? "Requerido" : undefined}>
                                <div className="relative">
                                  <select 
                                    {...register(`personas.${index}.segmentacion` as const)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
                                  >
                                    <option value="">Selecciona tu perfil...</option>
                                    {dbData.tipos.map((t: any) => (
                                      <option key={t.id} value={t.valor}>{t.nombre}</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronRight size={20} className="rotate-90" />
                                  </div>
                                </div>
                              </FormField>

                              <FormField label="Hospedaje" error={!watchFields.personas?.[index]?.hospedaje ? "Requerido" : undefined}>
                                <div className="grid grid-cols-2 gap-3">
                                  <label className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                                    watchFields.personas?.[index]?.hospedaje === 'si' 
                                      ? 'border-emerald-500 bg-emerald-50' 
                                      : 'border-slate-200 hover:border-slate-300'
                                  }`}>
                                    <input 
                                      type="radio" 
                                      value="si" 
                                      {...register(`personas.${index}.hospedaje` as const)} 
                                      className="sr-only" 
                                    />
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        watchFields.personas?.[index]?.hospedaje === 'si' 
                                          ? 'border-emerald-500 bg-emerald-500' 
                                          : 'border-slate-300'
                                      }`} />
                                      <span className="font-bold text-slate-800">Sí</span>
                                    </div>
                                  </label>
                                  <label className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                                    watchFields.personas?.[index]?.hospedaje === 'no' 
                                      ? 'border-slate-400 bg-slate-100' 
                                      : 'border-slate-200 hover:border-slate-300'
                                  }`}>
                                    <input 
                                      type="radio" 
                                      value="no" 
                                      {...register(`personas.${index}.hospedaje` as const)} 
                                      className="sr-only" 
                                    />
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        watchFields.personas?.[index]?.hospedaje === 'no' 
                                          ? 'border-slate-500 bg-slate-500' 
                                          : 'border-slate-300'
                                      }`} />
                                      <span className="font-bold text-slate-800">No</span>
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
                          <h4 className="text-sm font-bold text-slate-800 uppercase mb-4">Resumen de Inscripción</h4>
                          
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 text-white"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold">Total a Pagar</span>
                              <span className="text-3xl font-black">
                                ${resumen.total.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-indigo-200 text-sm">
                              <div className="flex justify-between">
                                <span>Personas:</span>
                                <span className="font-bold">{resumen.cantidadPersonas}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Diócesis:</span>
                                <span className="font-bold">{selectedDiocesis || watchFields.diocesis}</span>
                              </div>
                            </div>
                          </motion.div>

                          {/* Instrucciones */}
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100">
                            <div className="flex items-start gap-3">
                              <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
                              <div>
                                <p className="font-bold text-amber-800 mb-2">
                                  Instrucciones importantes
                                </p>
                                <ul className="text-sm text-amber-700 space-y-2">
                                  <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5" />
                                    Verifique los datos de cada persona
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5" />
                                    Todas las inscripciones se procesarán juntas
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5" />
                                    Recibirá un correo por cada persona registrada
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botón para proceder al pago */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-6 border-t border-slate-200"
                      >
                        <button
                          type="button"
                          onClick={nextStep}
                          disabled={fields.length === 0 || !watchFields.diocesis}
                          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                          <CreditCard size={18} />
                          Proceder al Pago
                          <Sparkles size={16} />
                        </button>
                        <p className="text-center text-xs text-slate-500 mt-4">
                          Serás redirigido a Wompi para completar el pago de forma segura.
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* Paso de Pago con Wompi */}
                {currentStep === 'payment' && (
                  <WompiPaymentStep
                    total={resumen.total}
                    diocesis={selectedDiocesis}
                    personas={watchFields.personas}
                    eventoId={eventoActivo.id}
                    emailContacto={watchFields.personas?.[0]?.email}
                    onSuccess={(data) => {
                      setPaymentData(data);
                      // Redirección automática ya se maneja en el componente
                    }}
                    onError={(error) => {
                      setPaymentError(error);
                      // El error se mostrará en el componente de pago
                    }}
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