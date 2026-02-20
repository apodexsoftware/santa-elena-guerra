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

// Nueva paleta de colores
const colors = {
  verde: '#009944',
  azul: '#1E5CAA',
  amarillo: '#FFF200',
  rojo: '#ED1C24',
  rosa: '#EC008C',
  azulOscuro: '#1E2D69',
  rojoOscuro: '#B41919',
  grisClaro: '#E6E7E8'
};

// Esquemas de validación
const step1Schema = {
  diocesis: (val: number) => val ? true : "La diócesis es requerida"
};

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
  diocesis: number | ""; // ID de la diócesis
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
  currentStep: number; // Ahora es número
  title: string; 
  icon: React.ElementType;
}) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
      currentStep >= step 
        ? `bg-gradient-to-r from-[${colors.verde}]/10 to-[${colors.azul}]/10 border-2 border-[${colors.verde}]/30 shadow-sm` 
        : 'bg-[${colors.grisClaro}]/20 border border-[${colors.grisClaro}]/30'
    }`}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
      currentStep > step 
        ? `bg-[${colors.verde}] text-white` 
        : currentStep === step 
        ? `bg-gradient-to-br from-[${colors.verde}] to-[${colors.azul}] text-white shadow-lg` 
        : `bg-[${colors.grisClaro}] text-[${colors.azulOscuro}]/40`
    }`}>
      {currentStep > step ? <Check size={20} /> : <Icon size={20} />}
    </div>
    <div className="flex-1">
      <div className="text-[10px] font-black uppercase tracking-widest text-[${colors.azulOscuro}]/60">
        Paso {step}
      </div>
      <div className="font-bold text-[${colors.azulOscuro}]">{title}</div>
    </div>
    {currentStep > step && (
      <Check className={`text-[${colors.verde}]`} size={20} />
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
      <label className={`text-xs font-bold uppercase tracking-wider text-[${colors.azulOscuro}]/70 flex items-center gap-2`}>
        {Icon && <Icon size={14} className={`text-[${colors.verde}]`} />}
        {label}
      </label>
      {optional && (
        <span className={`text-[10px] text-[${colors.azulOscuro}]/40 uppercase font-bold`}>Opcional</span>
      )}
    </div>
    {children}
    {error && (
      <motion.p 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className={`text-[${colors.rojo}] text-xs font-medium flex items-center gap-2 bg-[${colors.rojo}]/10 p-2 rounded-lg`}
      >
        <div className={`w-2 h-2 bg-[${colors.rojo}] rounded-full`} />
        {error}
      </motion.p>
    )}
  </motion.div>
);

// Componente de pago Wompi
const WompiPaymentStep = ({ 
  total, 
  diocesisId, // Cambiado a ID
  diocesisNombre, // Nombre para mostrar
  personas, 
  eventoId, 
  emailContacto,
  onSuccess,
  onError,
  onBack
}: { 
  total: number;
  diocesisId: number;
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
        diocesis_id: diocesisId, // Enviar ID
        telefono: persona.telefono,
        medio_transporte: persona.mediodetransporte
      }));

      const response = await fetch('/api/wompi/crear-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evento_id: eventoId,
          diocesis_id: diocesisId,
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
        // Redirigir después de un pequeño delay para que se vea el estado
        setTimeout(() => {
          window.location.href = data.url;
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error al procesar pago:', error);
      setError(error.message || 'Error desconocido al procesar el pago');
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
          <div className={`w-20 h-20 bg-gradient-to-br from-[${colors.verde}] to-[${colors.azul}] rounded-2xl flex items-center justify-center mx-auto mb-4`}>
            <ExternalLink className="text-white" size={32} />
          </div>
          <h3 className={`text-xl font-bold text-[${colors.azulOscuro}] mb-2`}>Redirigiendo a Wompi</h3>
          <p className={`text-[${colors.azulOscuro}]/60`}>Serás redirigido automáticamente al portal de pago seguro...</p>
        </div>
        <div className="space-y-3">
          <a 
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-block bg-gradient-to-r from-[${colors.verde}] to-[${colors.azul}] text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all`}
          >
            Abrir enlace de pago
          </a>
          <button
            onClick={onBack}
            className={`block w-full text-[${colors.azulOscuro}]/60 hover:text-[${colors.azulOscuro}] text-sm`}
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
        <div className={`w-12 h-12 bg-gradient-to-br from-[${colors.verde}]/20 to-[${colors.azul}]/20 rounded-xl flex items-center justify-center`}>
          <CreditCard className={`text-[${colors.verde}]`} size={24} />
        </div>
        <div>
          <h3 className={`text-xl font-black text-[${colors.azulOscuro}] uppercase italic`}>
            Proceso de Pago
          </h3>
          <p className={`text-sm text-[${colors.azulOscuro}]/60`}>
            Pago seguro a través de Wompi
          </p>
        </div>
      </div>

      {/* Resumen de pago */}
      <div className={`bg-gradient-to-r from-[${colors.azul}] to-[${colors.verde}] rounded-2xl p-6 text-white mb-6`}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Total a Pagar</span>
          <span className="text-3xl font-black">
            ${total.toLocaleString()}
          </span>
        </div>
        <div className={`text-[${colors.grisClaro}]/80 text-sm`}>
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

      {/* Mostrar error si existe */}
      {error && (
        <div className={`bg-[${colors.rojo}]/10 border border-[${colors.rojo}]/20 p-4 rounded-xl text-[${colors.rojo}] text-sm font-medium`}>
          {error}
        </div>
      )}

      {/* Métodos de pago */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className={`text-sm font-bold text-[${colors.azulOscuro}] uppercase`}>Selecciona método de pago</h4>
          <ShieldCheck size={16} className={`text-[${colors.verde}]`} />
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWompiPayment}
            disabled={processing}
            className={`p-6 rounded-2xl border-2 transition-all ${
              processing 
                ? `border-[${colors.azul}]/30 bg-[${colors.azul}]/10` 
                : `border-[${colors.azul}]/20 hover:border-[${colors.verde}] hover:bg-[${colors.verde}]/5`
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  processing 
                    ? `bg-[${colors.azul}]/20 text-[${colors.azul}]` 
                    : `bg-[${colors.verde}]/10 text-[${colors.verde}]`
                }`}>
                  <CreditCard size={20} />
                </div>
                <div className="text-left">
                  <p className={`font-bold text-[${colors.azulOscuro}]`}>Pago Online Seguro</p>
                  <p className={`text-xs text-[${colors.azulOscuro}]/60`}>Tarjeta, PSE, Nequi, Daviplata</p>
                </div>
              </div>
              {processing && (
                <Loader2 className={`animate-spin text-[${colors.azul}]`} size={20} />
              )}
            </div>
            
            <div className={`flex items-center justify-between text-xs text-[${colors.azulOscuro}]/60`}>
              <span className="flex items-center gap-1">
                <Lock size={12} className={`text-[${colors.verde}]`} />
                Encriptación SSL
              </span>
              <span className="flex items-center gap-1">
                <Shield size={12} className={`text-[${colors.azul}]`} />
                Protegido por Wompi
              </span>
              <span className="flex items-center gap-1">
                <QrCode size={12} />
                +10 métodos
              </span>
            </div>
          </motion.button>

          {/* Información adicional */}
          <div className={`bg-gradient-to-r from-[${colors.amarillo}]/10 to-[${colors.rojo}]/10 p-4 rounded-2xl border border-[${colors.amarillo}]/30`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`text-[${colors.rojo}] mt-0.5`} size={18} />
              <div>
                <p className={`font-bold text-[${colors.rojoOscuro}] text-sm mb-1`}>Importante</p>
                <p className={`text-xs text-[${colors.azulOscuro}]/70`}>
                  Al completar el pago, serás redirigido a Wompi para finalizar la transacción. 
                  Recibirás un correo de confirmación con los detalles de tu inscripción.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4 pt-4 border-t border-[${colors.grisClaro}]/50">
        <button
          type="button"
          onClick={onBack}
          className={`flex-1 bg-[${colors.grisClaro}]/30 text-[${colors.azulOscuro}] px-6 py-3 rounded-xl font-bold hover:bg-[${colors.grisClaro}]/50 transition-all`}
        >
          Volver
        </button>
        <button
          type="button"
          onClick={handleWompiPayment}
          disabled={processing}
          className={`flex-1 bg-gradient-to-r from-[${colors.verde}] to-[${colors.azul}] text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
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
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: formulario, 2: pago
  const [eventoActivo, setEventoActivo] = useState<any>(null);
  const [dbData, setDbData] = useState<any>({ tipos: [], eps: [], dio: [], config: null });
  const [stats, setStats] = useState({ inscritos: 0, cupos: 3000, porcentaje: 0 });
  const [selectedDiocesis, setSelectedDiocesis] = useState<{ id: number; nombre: string } | null>(null);
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
        hospedaje: "no",
        mediodetransporte: "Autobús",
        telefono: "",
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

          // Calcular porcentaje de cupos correctamente
          const cupos = 3000; // Podría venir de la configuración
          const porcentaje = cupos > 0 ? Math.min(((inscritos || 0) / cupos) * 100, 100) : 0;
          setStats({ inscritos: inscritos || 0, cupos, porcentaje });

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

  // Calcular resumen financiero con recargos
  const resumen = useMemo(() => {
    const { config, dio, tipos } = dbData;
    if (!config || !eventoActivo) return { porPersona: [], total: 0, cantidadPersonas: 0, subtotal: 0 };

    // Buscar la diócesis por ID
    const diocesisData = dio.find((d: any) => d.id === watchFields.diocesis);
    let subtotal = 0;
    const resumenPorPersona = (watchFields.personas || []).map((persona: any) => {
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

      const totalPersona = Math.max(0, base - dto + costoHospedaje);
      subtotal += totalPersona;
      return { base, dto, hospedaje: costoHospedaje, total: totalPersona };
    }) || [];

    // Aplicar recargos al subtotal (estos valores deberían venir de la configuración)
    const surchargeRate = 0.0267; // 2.67%
    const taxOnSurchargeRate = 0.19; // 19%
    const fixedFee = 700; // 700 COP

    const surchargeAmount = subtotal * surchargeRate;
    const taxOnSurcharge = surchargeAmount * taxOnSurchargeRate;
    const totalFinal = subtotal + surchargeAmount + taxOnSurcharge + fixedFee;

    return {
      porPersona: resumenPorPersona,
      total: totalFinal,
      cantidadPersonas: watchFields.personas?.length || 0,
      subtotal
    };
  }, [watchFields, dbData, eventoActivo]);

  // Validar todas las personas
  const validateAllPersons = async () => {
    // Disparar validación de todos los campos
    const result = await trigger(); // Esto valida todo el formulario incluyendo el array de personas
    return result;
  };

  const prevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const nextStep = async () => {
    // Validar antes de pasar al pago
    const isValid = await validateAllPersons();
    if (!isValid) {
      // Mostrar mensaje de error general
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
    <div className={`min-h-screen bg-gradient-to-br from-[${colors.grisClaro}] to-[${colors.azul}]/10 flex items-center justify-center`}>
      <div className="text-center space-y-6">
        <div className="relative">
          <div className={`w-24 h-24 bg-gradient-to-r from-[${colors.verde}] to-[${colors.azul}] rounded-2xl animate-pulse`} />
          <Loader2 className="absolute inset-0 m-auto text-white animate-spin" size={32} />
        </div>
        <div>
          <p className={`text-sm font-bold text-[${colors.azulOscuro}] uppercase tracking-widest`}>
            Preparando experiencia premium
          </p>
          <p className={`text-xs text-[${colors.azulOscuro}]/60 mt-2`}>
            Cargando configuración del evento...
          </p>
        </div>
      </div>
    </div>
  );

  if (!eventoActivo) return (
    <div className={`min-h-screen bg-gradient-to-br from-[${colors.grisClaro}] to-[${colors.azul}]/10 flex items-center justify-center p-4`}>
      <div className={`text-center max-w-md bg-white/80 backdrop-blur-sm p-12 rounded-[3rem] shadow-2xl border border-white/50`}>
        <div className={`w-20 h-20 bg-gradient-to-br from-[${colors.azulOscuro}]/10 to-[${colors.azul}]/10 rounded-2xl flex items-center justify-center mx-auto mb-8`}>
          <Calendar className={`text-[${colors.azulOscuro}]/50`} size={32} />
        </div>
        <h2 className={`text-3xl font-black text-[${colors.azulOscuro}] uppercase italic mb-4`}>
          Sin Eventos Activos
        </h2>
        <p className={`text-[${colors.azulOscuro}]/70 mb-8 leading-relaxed`}>
          Actualmente no hay inscripciones disponibles. 
          Te notificaremos cuando se abran las inscripciones para el próximo evento.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className={`bg-gradient-to-r from-[${colors.azulOscuro}] to-[${colors.azul}] text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:shadow-lg transition-all`}
        >
          Reintentar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-[${colors.grisClaro}] via-white to-[${colors.azul}]/10 -z-10" />
      <div className={`fixed top-0 left-0 w-96 h-96 bg-gradient-to-br from-[${colors.verde}]/20 to-[${colors.azul}]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2`} />
      <div className={`fixed bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-[${colors.rosa}]/20 to-[${colors.amarillo}]/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3`} />
      
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans relative">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel Lateral - Evento Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className={`bg-gradient-to-br from-[${colors.azulOscuro}] to-[${colors.azul}] rounded-[2.5rem] p-8 text-white shadow-2xl`}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={16} className="text-[${colors.amarillo}]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[${colors.amarillo}]/70">
                      Inscripción Múltiple
                    </span>
                  </div>
                  <h1 className="text-3xl font-black italic uppercase leading-tight">
                    {eventoActivo.nombre}
                  </h1>
                </div>
                <div className={`w-14 h-14 bg-gradient-to-br from-[${colors.amarillo}] to-[${colors.rojo}] rounded-2xl flex items-center justify-center rotate-6 shadow-lg`}>
                  <Users size={24} className="text-white" />
                </div>
              </div>

              <p className={`text-[${colors.grisClaro}]/70 leading-relaxed mb-8 border-l-2 border-[${colors.amarillo}] pl-4`}>
                {eventoActivo.descripcion || "Inscripción múltiple por diócesis. Agregue todos los participantes de su jurisdicción."}
              </p>

              {/* Stats del Evento */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <span className={`text-[${colors.grisClaro}]/80 text-sm`}>Cupos Disponibles</span>
                  <span className="font-bold">{stats.cupos - stats.inscritos} / {stats.cupos}</span>
                </div>
                <div className={`bg-[${colors.azulOscuro}]/50 rounded-full h-2`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.porcentaje}%` }}
                    className={`bg-gradient-to-r from-[${colors.verde}] to-[${colors.amarillo}] h-2 rounded-full`}
                  />
                </div>
              </div>

              {/* Beneficios */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 bg-[${colors.azul}]/30 rounded-lg flex items-center justify-center`}>
                    <Shield size={14} className={`text-[${colors.verde}]`} />
                  </div>
                  <span className="text-sm">Inscripción múltiple</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 bg-[${colors.azul}]/30 rounded-lg flex items-center justify-center`}>
                    <CreditCard size={14} className={`text-[${colors.amarillo}]`} />
                  </div>
                  <span className="text-sm">Pago seguro con Wompi</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 bg-[${colors.azul}]/30 rounded-lg flex items-center justify-center`}>
                    <Smartphone size={14} className={`text-[${colors.rosa}]`} />
                  </div>
                  <span className="text-sm">Recibo digital automático</span>
                </div>
              </div>
            </div>

            {/* Pasos del Formulario */}
            <div className="space-y-3">
              <FormStep step={1} currentStep={currentStep} title="Selección de Diócesis" icon={Building2} />
              <FormStep step={1} currentStep={currentStep} title="Registro de Personas" icon={Users} /> {/* Ambos en paso 1 */}
              <FormStep step={2} currentStep={currentStep} title="Pago Seguro" icon={CreditCard} />
            </div>

            {/* Resumen en Móvil */}
            {currentStep !== 1 && watchFields.personas && watchFields.personas.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:hidden bg-white rounded-2xl p-6 border border-[${colors.grisClaro}] shadow-lg"
              >
                <h4 className={`text-sm font-bold text-[${colors.azulOscuro}] uppercase mb-4`}>Resumen Total</h4>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className={`text-[${colors.azulOscuro}]/70`}>Personas:</span>
                    <span className={`font-bold text-[${colors.azulOscuro}]`}>{watchFields.personas.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[${colors.azulOscuro}]/70`}>Diocesis:</span>
                    <span className={`font-bold text-[${colors.azulOscuro}]`}>{selectedDiocesis?.nombre || ""}</span>
                  </div>
                </div>
                <div className={`border-t border-[${colors.grisClaro}]/50 pt-4`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold text-[${colors.azulOscuro}]`}>Total a Pagar</span>
                    <span className={`text-2xl font-black text-[${colors.verde}]`}>
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
                {/* Paso 1: Formulario */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-12 h-12 bg-gradient-to-br from-[${colors.verde}]/20 to-[${colors.azul}]/20 rounded-xl flex items-center justify-center`}>
                        <Building2 className={`text-[${colors.verde}]`} size={24} />
                      </div>
                      <div>
                        <h3 className={`text-xl font-black text-[${colors.azulOscuro}] uppercase italic`}>
                          Selección de Diócesis
                        </h3>
                        <p className={`text-sm text-[${colors.azulOscuro}]/60`}>
                          Seleccione la diócesis a la que pertenecen los participantes
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <FormField 
                        label="Jurisdicción (Diócesis)" 
                        error={errors.diocesis?.message} 
                        icon={Building2}
                      >
                        <div className="relative">
                          <select 
                            {...register("diocesis", { 
                              required: "La diócesis es requerida",
                              valueAsNumber: true 
                            })}
                            className={`w-full bg-[${colors.grisClaro}]/30 border border-[${colors.grisClaro}] rounded-xl p-4 font-medium text-[${colors.azulOscuro}] focus:outline-none focus:ring-2 focus:ring-[${colors.verde}] focus:border-transparent appearance-none cursor-pointer`}
                          >
                            <option value="">Seleccione su jurisdicción...</option>
                            {dbData.dio.map((d: any) => (
                              <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[${colors.azulOscuro}]/40">
                            <ChevronRight size={20} className="rotate-90" />
                          </div>
                        </div>
                      </FormField>

                      {watchFields.diocesis && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`bg-gradient-to-r from-[${colors.verde}]/10 to-[${colors.azul}]/10 p-6 rounded-2xl border border-[${colors.verde}]/30`}
                        >
                          <div className="flex items-start gap-3">
                            <Check size={20} className={`text-[${colors.verde}] mt-0.5`} />
                            <div>
                              <p className={`font-bold text-[${colors.verde}] mb-2`}>
                                Diócesis seleccionada: {dbData.dio.find((d: any) => d.id === watchFields.diocesis)?.nombre}
                              </p>
                              <p className={`text-sm text-[${colors.azulOscuro}]/70`}>
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
                          <div className={`w-12 h-12 bg-gradient-to-br from-[${colors.rosa}]/20 to-[${colors.amarillo}]/20 rounded-xl flex items-center justify-center`}>
                            <Users className={`text-[${colors.rosa}]`} size={24} />
                          </div>
                          <div>
                            <h3 className={`text-xl font-black text-[${colors.azulOscuro}] uppercase italic`}>
                              Registro de Personas
                            </h3>
                            <p className={`text-sm text-[${colors.azulOscuro}]/60`}>
                              Diócesis: <strong>{dbData.dio.find((d: any) => d.id === watchFields.diocesis)?.nombre || ""}</strong>
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
                            hospedaje: "no",
                            mediodetransporte: "Autobús",
                            telefono: "",
                          })}
                          className={`bg-gradient-to-r from-[${colors.verde}] to-[${colors.azul}] text-white px-4 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2`}
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
                            className={`bg-gradient-to-br from-[${colors.grisClaro}]/20 to-white p-6 rounded-2xl border border-[${colors.grisClaro}]/50 shadow-sm`}
                          >
                            <div className="flex justify-between items-center mb-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 bg-gradient-to-br from-[${colors.verde}]/10 to-[${colors.azul}]/10 rounded-xl flex items-center justify-center`}>
                                  <User className={`text-[${colors.verde}]`} size={18} />
                                </div>
                                <span className={`font-bold text-[${colors.azulOscuro}]`}>
                                  Persona {index + 1}
                                </span>
                              </div>
                              {fields.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className={`p-2 hover:bg-[${colors.grisClaro}]/30 rounded-lg transition-colors text-[${colors.azulOscuro}]/40 hover:text-[${colors.rojo}]`}
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField 
                                label="Nombres Completos" 
                                error={errors.personas?.[index]?.nombre?.message}
                              >
                                <input 
                                  {...register(`personas.${index}.nombre` as const, { 
                                    required: "Requerido",
                                    minLength: { value: 3, message: "Mínimo 3 caracteres" }
                                  })}
                                  className={`w-full bg-[${colors.grisClaro}]/30 border border-[${colors.grisClaro}] rounded-xl p-3 font-medium text-[${colors.azulOscuro}] focus:outline-none focus:ring-2 focus:ring-[${colors.verde}] focus:border-transparent transition-all placeholder:text-[${colors.azulOscuro}]/40`}
                                  placeholder="María Alejandra"
                                />
                              </FormField>

                              <FormField 
                                label="Apellidos Completos" 
                                error={errors.personas?.[index]?.apellido?.message}
                              >
                                <input 
                                  {...register(`personas.${index}.apellido` as const, { 
                                    required: "Requerido",
                                    minLength: { value: 3, message: "Mínimo 3 caracteres" }
                                  })}
                                  className={`w-full bg-[${colors.grisClaro}]/30 border border-[${colors.grisClaro}] rounded-xl p-3 font-medium text-[${colors.azulOscuro}] focus:outline-none focus:ring-2 focus:ring-[${colors.verde}] focus:border-transparent transition-all placeholder:text-[${colors.azulOscuro}]/40`}
                                  placeholder="Pérez García"
                                />
                              </FormField>

                              <FormField 
                                label="Documento de Identidad" 
                                error={errors.personas?.[index]?.documento?.message}
                              >
                                <input 
                                  {...register(`personas.${index}.documento` as const, { 
                                    required: "Requerido",
                                    minLength: { value: 5, message: "Mínimo 5 caracteres" }
                                  })}
                                  className={`w-full bg-[${colors.grisClaro}]/30 border border-[${colors.grisClaro}] rounded-xl p-3 font-medium text-[${colors.azulOscuro}] focus:outline-none focus:ring-2 focus:ring-[${colors.verde}] focus:border-transparent transition-all placeholder:text-[${colors.azulOscuro}]/40`}
                                  placeholder="Número de identificación"
                                />
                              </FormField>

                              <FormField 
                                label="Correo Electrónico" 
                                error={errors.personas?.[index]?.email?.message}
                              >
                                <input 
                                  {...register(`personas.${index}.email` as const, { 
                                    required: "Requerido",
                                    pattern: {
                                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                      message: "Email inválido"
                                    }
                                  })}
                                  type="email"
                                  className={`w-full bg-[${colors.grisClaro}]/30 border border-[${colors.grisClaro}] rounded-xl p-3 font-medium text-[${colors.azulOscuro}] focus:outline-none focus:ring-2 focus:ring-[${colors.verde}] focus:border-transparent transition-all placeholder:text-[${colors.azulOscuro}]/40`}
                                  placeholder="contacto@ejemplo.com"
                                />
                              </FormField>

                              <div className="md:col-span-2">
                                <FormField 
                                  label="Entidad de Salud (EPS)" 
                                  error={errors.personas?.[index]?.entidadSalud?.message}
                                >
                                  <div className="relative">
                                    <select 
                                      {...register(`personas.${index}.entidadSalud` as const, { 
                                        required: "La EPS es requerida"
                                      })}
                                      className={`w-full bg-[${colors.grisClaro}]/30 border border-[${colors.grisClaro}] rounded-xl p-3 font-medium text-[${colors.azulOscuro}] focus:outline-none focus:ring-2 focus:ring-[${colors.verde}] focus:border-transparent appearance-none cursor-pointer`}
                                    >
                                      <option value="">Seleccionar entidad de salud...</option>
                                      {dbData.eps.map((e: any) => (
                                        <option key={e.id} value={e.nombre}>{e.nombre}</option>
                                      ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[${colors.azulOscuro}]/40">
                                      <ChevronRight size={20} className="rotate-90" />
                                    </div>
                                  </div>
                                </FormField>
                              </div>

                              <FormField 
                                label="Tipo de Participante" 
                                error={errors.personas?.[index]?.segmentacion?.message}
                              >
                                <div className="relative">
                                  <select 
                                    {...register(`personas.${index}.segmentacion` as const, { 
                                      required: "El tipo de participante es requerido"
                                    })}
                                    className={`w-full bg-[${colors.grisClaro}]/30 border border-[${colors.grisClaro}] rounded-xl p-3 font-medium text-[${colors.azulOscuro}] focus:outline-none focus:ring-2 focus:ring-[${colors.verde}] focus:border-transparent appearance-none cursor-pointer`}
                                  >
                                    <option value="">Selecciona tu perfil...</option>
                                    {dbData.tipos.map((t: any) => (
                                      <option key={t.id} value={t.valor}>{t.nombre}</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[${colors.azulOscuro}]/40">
                                    <ChevronRight size={20} className="rotate-90" />
                                  </div>
                                </div>
                              </FormField>

                              <FormField 
                                label="Hospedaje" 
                                error={errors.personas?.[index]?.hospedaje?.message}
                              >
                                <div className="grid grid-cols-2 gap-3">
                                  <label className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                                    watchFields.personas?.[index]?.hospedaje === 'si' 
                                      ? `border-[${colors.verde}] bg-[${colors.verde}]/10` 
                                      : `border-[${colors.grisClaro}] hover:border-[${colors.grisClaro}]/70`
                                  }`}>
                                    <input 
                                      type="radio" 
                                      value="si" 
                                      {...register(`personas.${index}.hospedaje` as const, { 
                                        required: "Seleccione una opción"
                                      })} 
                                      className="sr-only" 
                                    />
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        watchFields.personas?.[index]?.hospedaje === 'si' 
                                          ? `border-[${colors.verde}] bg-[${colors.verde}]` 
                                          : `border-[${colors.grisClaro}]`
                                      }`} />
                                      <span className={`font-bold text-[${colors.azulOscuro}]`}>Sí</span>
                                    </div>
                                  </label>
                                  <label className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                                    watchFields.personas?.[index]?.hospedaje === 'no' 
                                      ? `border-[${colors.azulOscuro}]/30 bg-[${colors.azulOscuro}]/5` 
                                      : `border-[${colors.grisClaro}] hover:border-[${colors.grisClaro}]/70`
                                  }`}>
                                    <input 
                                      type="radio" 
                                      value="no" 
                                      {...register(`personas.${index}.hospedaje` as const, { 
                                        required: "Seleccione una opción"
                                      })} 
                                      className="sr-only" 
                                    />
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        watchFields.personas?.[index]?.hospedaje === 'no' 
                                          ? `border-[${colors.azulOscuro}]/50 bg-[${colors.azulOscuro}]/50` 
                                          : `border-[${colors.grisClaro}]`
                                      }`} />
                                      <span className={`font-bold text-[${colors.azulOscuro}]`}>No</span>
                                    </div>
                                  </label>
                                </div>
                              </FormField>

                              <FormField 
                                label="Teléfono" 
                                error={errors.personas?.[index]?.telefono?.message}
                              >
                                <div className="relative">
                                  <input 
                                    {...register(`personas.${index}.telefono` as const, { 
                                      required: "Requerido",
                                      minLength: { value: 10, message: "Mínimo 10 dígitos" }
                                    })}
                                    type="tel"
                                    className={`w-full bg-[${colors.grisClaro}]/30 border border-[${colors.grisClaro}] rounded-xl p-3 font-medium text-[${colors.azulOscuro}] focus:outline-none focus:ring-2 focus:ring-[${colors.verde}] focus:border-transparent transition-all placeholder:text-[${colors.azulOscuro}]/40`}
                                    placeholder="Número de teléfono"
                                  />
                                </div>
                              </FormField>

                              <FormField 
                                label="Modo de transporte" 
                                error={errors.personas?.[index]?.mediodetransporte?.message}
                              >
                                <div className="grid grid-cols-2 gap-4">
                                  <label className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                                    watchFields.personas?.[index]?.mediodetransporte === 'Avión' 
                                      ? `border-[${colors.verde}] bg-[${colors.verde}]/10` 
                                      : `border-[${colors.grisClaro}] hover:border-[${colors.grisClaro}]/70`
                                  }`}>
                                    <input 
                                      type="radio" 
                                      value="Avión" 
                                      {...register(`personas.${index}.mediodetransporte` as const, { 
                                        required: "Seleccione una opción"
                                      })} 
                                      className="sr-only" 
                                    />
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        watchFields.personas?.[index]?.mediodetransporte === 'Avión' 
                                          ? `border-[${colors.verde}] bg-[${colors.verde}]` 
                                          : `border-[${colors.grisClaro}]`
                                      }`} />
                                      <span className={`font-bold text-[${colors.azulOscuro}]`}>Avión</span>
                                    </div>
                                  </label>
                                  <label className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                                    watchFields.personas?.[index]?.mediodetransporte === 'Autobús' 
                                      ? `border-[${colors.azulOscuro}]/30 bg-[${colors.azulOscuro}]/5` 
                                      : `border-[${colors.grisClaro}] hover:border-[${colors.grisClaro}]/70`
                                  }`}>
                                    <input 
                                      type="radio" 
                                      value="Autobús" 
                                      {...register(`personas.${index}.mediodetransporte` as const, { 
                                        required: "Seleccione una opción"
                                      })} 
                                      className="sr-only" 
                                    />
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        watchFields.personas?.[index]?.mediodetransporte === 'Autobús' 
                                          ? `border-[${colors.azulOscuro}]/50 bg-[${colors.azulOscuro}]/50` 
                                          : `border-[${colors.grisClaro}]`
                                      }`} />
                                      <span className={`font-bold text-[${colors.azulOscuro}]`}>Autobús</span>
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
                          <h4 className={`text-sm font-bold text-[${colors.azulOscuro}] uppercase mb-4`}>Resumen de Inscripción</h4>
                          
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-gradient-to-r from-[${colors.azul}] to-[${colors.verde}] rounded-2xl p-6 text-white`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold">Total a Pagar</span>
                              <span className="text-3xl font-black">
                                ${resumen.total.toLocaleString()}
                              </span>
                            </div>
                            <div className={`text-[${colors.grisClaro}]/80 text-sm`}>
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

                          {/* Instrucciones */}
                          <div className={`bg-gradient-to-r from-[${colors.amarillo}]/10 to-[${colors.rojo}]/10 p-6 rounded-2xl border border-[${colors.amarillo}]/30`}>
                            <div className="flex items-start gap-3">
                              <AlertTriangle size={20} className={`text-[${colors.rojo}] mt-0.5`} />
                              <div>
                                <p className={`font-bold text-[${colors.rojoOscuro}] mb-2`}>
                                  Instrucciones importantes
                                </p>
                                <ul className={`text-sm text-[${colors.azulOscuro}]/70 space-y-2`}>
                                  <li className="flex items-start gap-2">
                                    <div className={`w-1.5 h-1.5 bg-[${colors.rojo}] rounded-full mt-1.5`} />
                                    Verifique los datos de cada persona
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <div className={`w-1.5 h-1.5 bg-[${colors.rojo}] rounded-full mt-1.5`} />
                                    Todas las inscripciones se procesarán juntas
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <div className={`w-1.5 h-1.5 bg-[${colors.rojo}] rounded-full mt-1.5`} />
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
                        className={`pt-6 border-t border-[${colors.grisClaro}]/50`}
                      >
                        <button
                          type="button"
                          onClick={nextStep}
                          disabled={fields.length === 0 || !watchFields.diocesis}
                          className={`w-full bg-gradient-to-r from-[${colors.verde}] to-[${colors.azul}] text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70`}
                        >
                          <CreditCard size={18} />
                          Proceder al Pago
                          <Sparkles size={16} />
                        </button>
                        <p className={`text-center text-xs text-[${colors.azulOscuro}]/60 mt-4`}>
                          Serás redirigido a Wompi para completar el pago de forma segura.
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* Paso de Pago con Wompi */}
                {currentStep === 2 && selectedDiocesis && (
                  <WompiPaymentStep
                    total={resumen.total}
                    diocesisId={selectedDiocesis.id}
                    diocesisNombre={selectedDiocesis.nombre}
                    personas={watchFields.personas}
                    eventoId={eventoActivo.id}
                    emailContacto={watchFields.personas?.[0]?.email}
                    onSuccess={(data) => {
                      setPaymentData(data);
                    }}
                    onError={(error) => {
                      setPaymentError(error);
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