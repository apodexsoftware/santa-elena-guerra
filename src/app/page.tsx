"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Loader2, Sparkles, CheckCircle2, Send, 
  UploadCloud, DollarSign, MapPin, User, 
  FileText, Shield, Building2, HeartPulse,
  BedDouble, Calendar, Clock, Award,
  ChevronRight, ChevronLeft, Camera,
  X, Check, Zap, Target, Star, Gem,
  Bell, Lock, Eye, EyeOff, CreditCard,
  QrCode, Smartphone, Globe, Crown, Mails, AlertTriangle
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { contactSchema, ContactFormData } from "@/lib/schema";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from 'react-confetti';

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

// Componente de tarjeta de resumen
const PriceCard = ({ title, amount, color = "indigo", icon: Icon }: any) => (
  <motion.div 
    whileHover={{ scale: 1.02, y: -2 }}
    className={`p-4 rounded-2xl bg-gradient-to-br ${
      color === "emerald" 
        ? "from-emerald-50 to-emerald-100 border border-emerald-200" 
        : color === "amber"
        ? "from-amber-50 to-amber-100 border border-amber-200"
        : "from-indigo-50 to-purple-50 border border-indigo-200"
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</p>
        <p className={`text-2xl font-black mt-1 ${
          color === "emerald" 
            ? "text-emerald-700" 
            : color === "amber"
            ? "text-amber-700"
            : "text-indigo-700"
        }`}>
          ${amount.toLocaleString()}
        </p>
      </div>
      <div className={`p-3 rounded-xl ${
        color === "emerald" 
          ? "bg-emerald-100 text-emerald-600" 
          : color === "amber"
          ? "bg-amber-100 text-amber-600"
          : "bg-indigo-100 text-indigo-600"
      }`}>
        <Icon size={20} />
      </div>
    </div>
  </motion.div>
);

// Componente de upload premium
const PremiumUpload = ({ register, error, preview, setPreview }: any) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <Camera size={14} className="text-indigo-500" />
          Comprobante de Pago
        </label>
        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full">
          Requerido
        </span>
      </div>
      
      <div className={`relative group ${
        error ? 'border-2 border-rose-300' : 'border-2 border-dashed border-slate-300'
      } rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-400`}>
        <input 
          type="file" 
          {...register("imagen")}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          accept="image/*,.pdf"
        />
        
        {preview ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Check className="text-emerald-600" size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Comprobante cargado</p>
                  <p className="text-xs text-slate-500">Archivo listo para enviar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-48 object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4"
            >
              <UploadCloud className="text-indigo-500" size={32} />
            </motion.div>
            <p className="text-sm font-bold text-slate-700 mb-2">
              Arrastra tu comprobante o haz clic para subir
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Aceptamos JPG, PNG, PDF (Max 5MB)
            </p>
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <Lock size={10} /> Transferencia segura • 256-bit SSL
            </div>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
      </div>
      
      {error && (
        <motion.p 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-rose-500 text-xs font-medium flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
          {error}
        </motion.p>
      )}
    </motion.div>
  );
};

// Componente principal
export default function InscripcionPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [eventoActivo, setEventoActivo] = useState<any>(null);
  const [dbData, setDbData] = useState<any>({ tipos: [], eps: [], dio: [], config: null });
  const [stats, setStats] = useState({ inscritos: 0, cupos: 5000, porcentaje: 0 });

  const { register, handleSubmit, watch, formState: { errors }, trigger } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { hospedaje: "no" }
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
    
    if (!config || !eventoActivo) return { base: 0, dto: 0, hospedaje: 0, total: 0 };

    const diocesisData = dio.find((d: any) => d.nombre === watchFields.diocesis);
    const rolData = tipos.find((t: any) => t.valor === watchFields.segmentacion);

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
    if (watchFields.hospedaje === 'si') {
      if (config.usar_hospedaje_diocesis) {
        costoHospedaje = Number(diocesisData?.precio_hospedaje_especifico) || 0;
      } else {
        costoHospedaje = Number(config.valor_hospedaje_general) || 0;
      }
    }

    const total = Math.max(0, base - dto + costoHospedaje);
    return { base, dto, hospedaje: costoHospedaje, total };
  }, [watchFields, dbData, eventoActivo]);

  // Navegación entre pasos
  const nextStep = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = await trigger(['nombre', 'apellido', 'documento', 'email', 'entidadSalud']);
        break;
      case 2:
        isValid = await trigger(['diocesis', 'segmentacion', 'hospedaje']);
        break;
      case 3:
        isValid = await trigger(['imagen']);
        break;
    }

    if (isValid && currentStep < 3) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Enviar formulario
  const onSubmit = async (data: ContactFormData) => {
    setSubmitting(true);
    try {
      let imageUrl = "";

      // Subir imagen
      if (data.imagen?.[0]) {
        const file = data.imagen[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${eventoActivo.slug}/${Date.now()}_${data.apellido.replace(/\s+/g, '')}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('comprobantes')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Insertar inscripción
      const { imagen, ...rest } = data;
      const { error: dbError } = await supabase.from('inscripciones').insert([{
        ...rest,
        evento_id: eventoActivo.id,
        imagen_url: imageUrl,
        precio_pactado: resumen.total,
        estado: 'pendiente',
        created_at: new Date().toISOString()
      }]);

      if (dbError) throw dbError;

      setShowConfetti(true);
      setTimeout(() => setSuccess(true), 1500);
      
    } catch (err: any) {
      console.error("Error submit:", err);
      alert("Hubo un error guardando tu registro. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
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

  if (success) return (
    <>
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} onConfettiComplete={() => setShowConfetti(false)} />}
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-lg bg-white/90 backdrop-blur-sm p-12 rounded-[3rem] shadow-2xl border border-white/50"
        >
          <div className="relative inline-block mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
              <CheckCircle2 className="text-white" size={48} strokeWidth={3} />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center rotate-12 shadow-lg">
              <Star className="text-white" size={20} fill="white" />
            </div>
          </div>
          
          <h2 className="text-4xl font-black text-slate-900 uppercase italic mb-4 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            ¡Inscripción Exitosa!
          </h2>
          
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-100 mb-8">
            <p className="text-slate-700 mb-4 leading-relaxed">
              Tu registro para <strong className="text-emerald-700">{eventoActivo.nombre}</strong> 
              ha sido procesado correctamente.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Número de Referencia:</span>
                <code className="font-mono font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded">
                  {Date.now().toString().slice(-8)}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Invertido:</span>
                <span className="text-xl font-black text-emerald-700">
                  ${resumen.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-slate-900 to-slate-700 text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:shadow-xl transition-all"
            >
              Nueva Inscripción
            </button>
            <button className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 px-8 py-4 rounded-xl font-bold text-sm hover:shadow-md transition-all">
              <Bell size={16} className="inline mr-2" />
              Activar Notificaciones
            </button>
          </div>
        </motion.div>
      </div>
    </>
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
                      Inscripción Premium
                    </span>
                  </div>
                  <h1 className="text-3xl font-black italic uppercase leading-tight">
                    {eventoActivo.nombre}
                  </h1>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center rotate-6 shadow-lg">
                  <Gem size={24} className="text-white" />
                </div>
              </div>

              <p className="text-indigo-200 leading-relaxed mb-8 border-l-2 border-indigo-500 pl-4">
                {eventoActivo.descripcion || "Formulario oficial de inscripción y registro de participantes."}
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
                  <span className="text-sm">Transferencia 100% segura</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-700 rounded-lg flex items-center justify-center">
                    <Zap size={14} className="text-amber-300" />
                  </div>
                  <span className="text-sm">Confirmación inmediata</span>
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
              <FormStep step={1} currentStep={currentStep} title="Datos Personales" icon={User} />
              <FormStep step={2} currentStep={currentStep} title="Perfil y Ubicación" icon={MapPin} />
              <FormStep step={3} currentStep={currentStep} title="Confirmación y Pago" icon={CreditCard} />
            </div>

            {/* Resumen en Móvil */}
            {watchFields.diocesis && watchFields.segmentacion && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:hidden bg-white rounded-2xl p-6 border border-slate-200 shadow-lg"
              >
                <h4 className="text-sm font-bold text-slate-800 uppercase mb-4">Resumen de Pago</h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <PriceCard title="Inscripción" amount={resumen.base} color="indigo" icon={DollarSign} />
                  {resumen.dto > 0 && (
                    <PriceCard title="Descuento" amount={-resumen.dto} color="emerald" icon={Award} />
                  )}
                  {resumen.hospedaje > 0 && (
                    <PriceCard title="Hospedaje" amount={resumen.hospedaje} color="amber" icon={BedDouble} />
                  )}
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
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Paso 1: Datos Personales */}
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                          <User className="text-indigo-600" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase italic">
                            Información Personal
                          </h3>
                          <p className="text-sm text-slate-500">
                            Completa tus datos básicos de contacto
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="Nombres Completos" error={errors.nombre?.message} icon={User}>
                          <input 
                            {...register("nombre")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                            placeholder="María Alejandra"
                          />
                        </FormField>

                        <FormField label="Apellidos Completos" error={errors.apellido?.message} icon={User}>
                          <input 
                            {...register("apellido")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                            placeholder="Pérez García"
                          />
                        </FormField>

                        <FormField label="Documento de Identidad" error={errors.documento?.message} icon={FileText}>
                          <input 
                            {...register("documento")}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                            placeholder="Número de identificación"
                          />
                        </FormField>

                        <FormField label="Correo Electrónico" error={errors.email?.message} icon={Mails}>
                          <input 
                            {...register("email")}
                            type="email"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                            placeholder="contacto@ejemplo.com"
                          />
                        </FormField>

                        <div className="md:col-span-2">
                          <FormField label="Entidad de Salud (EPS)" error={errors.entidadSalud?.message} icon={HeartPulse}>
                            <div className="relative">
                              <select 
                                {...register("entidadSalud")}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Paso 2: Perfil y Ubicación */}
                <AnimatePresence mode="wait">
                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                          <MapPin className="text-purple-600" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase italic">
                            Perfil y Ubicación
                          </h3>
                          <p className="text-sm text-slate-500">
                            Define tu participación en el evento
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <FormField label="Jurisdicción (Diócesis)" error={errors.diocesis?.message} icon={Building2}>
                          <div className="relative">
                            <select 
                              {...register("diocesis")}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
                            >
                              <option value="">Selecciona tu jurisdicción...</option>
                              {dbData.dio.map((d: any) => (
                                <option key={d.id} value={d.nombre}>{d.nombre}</option>
                              ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <ChevronRight size={20} className="rotate-90" />
                            </div>
                          </div>
                        </FormField>

                        <FormField label="Tipo de Participante" error={errors.segmentacion?.message} icon={Target}>
                          <div className="relative">
                            <select 
                              {...register("segmentacion")}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer"
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

                        <FormField label="Hospedaje" error={errors.hospedaje?.message} icon={BedDouble}>
                          <div className="grid grid-cols-2 gap-4">
                            <label className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                              watchFields.hospedaje === 'si' 
                                ? 'border-emerald-500 bg-emerald-50' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}>
                              <input 
                                type="radio" 
                                value="si" 
                                {...register("hospedaje")} 
                                className="sr-only" 
                              />
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  watchFields.hospedaje === 'si' 
                                    ? 'border-emerald-500 bg-emerald-500' 
                                    : 'border-slate-300'
                                }`} />
                                <span className="font-bold text-slate-800">Sí, requiero</span>
                              </div>
                            </label>
                            <label className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                              watchFields.hospedaje === 'no' 
                                ? 'border-slate-400 bg-slate-100' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}>
                              <input 
                                type="radio" 
                                value="no" 
                                {...register("hospedaje")} 
                                className="sr-only" 
                              />
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  watchFields.hospedaje === 'no' 
                                    ? 'border-slate-500 bg-slate-500' 
                                    : 'border-slate-300'
                                }`} />
                                <span className="font-bold text-slate-800">No necesito</span>
                              </div>
                            </label>
                          </div>
                        </FormField>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Paso 3: Confirmación y Pago */}
                <AnimatePresence mode="wait">
                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
                          <CreditCard className="text-emerald-600" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase italic">
                            Confirmación y Pago
                          </h3>
                          <p className="text-sm text-slate-500">
                            Finaliza tu inscripción con los datos de pago
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Resumen Desktop */}
                        <div className="hidden lg:block">
                          <div className="sticky top-8 space-y-4">
                            <h4 className="text-sm font-bold text-slate-800 uppercase mb-4">Resumen de Inversión</h4>
                            <PriceCard title="Inscripción Base" amount={resumen.base} color="indigo" icon={DollarSign} />
                            {resumen.dto > 0 && (
                              <PriceCard title="Descuento Aplicado" amount={-resumen.dto} color="emerald" icon={Award} />
                            )}
                            {resumen.hospedaje > 0 && (
                              <PriceCard title="Costo de Hospedaje" amount={resumen.hospedaje} color="amber" icon={BedDouble} />
                            )}
                            
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
                              <p className="text-indigo-200 text-xs">
                                Incluye todos los servicios del evento
                              </p>
                            </motion.div>

                            <div className="bg-slate-50 p-4 rounded-xl">
                              <p className="text-xs text-slate-600 font-medium mb-2">
                                Métodos de pago aceptados:
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-white rounded-lg">
                                  <QrCode size={16} className="text-slate-600" />
                                </div>
                                <div className="p-2 bg-white rounded-lg">
                                  <CreditCard size={16} className="text-slate-600" />
                                </div>
                                <div className="p-2 bg-white rounded-lg">
                                  <Building2 size={16} className="text-slate-600" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subida de Comprobante */}
                        <div>
                          <PremiumUpload 
                            register={register} 
                            error={errors.imagen?.message as string}
                            preview={imagePreview}
                            setPreview={setImagePreview}
                          />
                          
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100 mt-8">
                            <div className="flex items-start gap-3">
                              <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
                              <div>
                                <p className="font-bold text-amber-800 mb-2">
                                  Instrucciones importantes
                                </p>
                                <ul className="text-sm text-amber-700 space-y-2">
                                  <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5" />
                                    Sube un comprobante legible y nítido
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5" />
                                    Tu inscripción será confirmada en 24-48 horas
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5" />
                                    Conserva el comprobante de transferencia
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navegación */}
                <div className="flex justify-between items-center pt-8 border-t border-slate-200">
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                      currentStep === 1 
                        ? 'text-slate-400 cursor-not-allowed' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </motion.button>

                  <div className="text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Paso {currentStep} de 3
                    </div>
                    <div className="w-32 h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        initial={{ width: `${(currentStep - 1) * 33.33}%` }}
                        animate={{ width: `${(currentStep - 1) * 33.33}%` }}
                      />
                    </div>
                  </div>

                  {currentStep < 3 ? (
                    <motion.button
                      type="button"
                      onClick={nextStep}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Continuar
                      <ChevronRight size={16} />
                    </motion.button>
                  ) : (
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center gap-3 disabled:opacity-70"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Finalizar Inscripción
                          <Sparkles size={16} />
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}