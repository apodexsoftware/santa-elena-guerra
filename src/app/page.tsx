"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Loader2, Check, Send,
  User,
  FileText, Shield, Building2,
  BedDouble, Calendar,
  ChevronRight,
  X, Plus, Trash2, Users,
  Upload, AlertTriangle, CheckCircle
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { motion, AnimatePresence } from "framer-motion";

// Tipos
type PersonaFormData = {
  nombre: string;
  apellido: string;
  documento: string;
  email: string;
  entidadSalud: string;
  segmentacion: string;
  hospedaje: "si" | "no";
  usaraBusDuranteEncar: "si" | "no";
  telefono: string;
  edad: number;
};

type FormData = {
  diocesis: string;
  personas: PersonaFormData[];
  comprobante?: FileList;
};

// Colores EN CAR
const colors = {
  verde: "#009944",
  azul: "#1E5CAA",
  amarillo: "#FFF200",
  rojo: "#ED1C24",
  rosa: "#EC008C",
  azulOscuro: "#1E2D69",
  rojoOscuro: "#B41919",
  grisClaro: "#E6E7E8",
};

// Componente de paso
const StepIndicator = ({ step, currentStep, title }: {
  step: number;
  currentStep: number;
  title: string;
}) => (
  <div className={`flex items-center gap-3 p-3 rounded-lg ${currentStep >= step
      ? 'bg-[#E6E7E8]/50 text-[#1E2D69]'
      : 'bg-[#E6E7E8]/30 text-[#1E2D69]/40'
    }`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep > step
        ? 'bg-[#009944] text-white'
        : currentStep === step
          ? 'bg-[#1E5CAA] text-white'
          : 'bg-[#E6E7E8]'
      }`}>
      {currentStep > step ? <Check size={16} /> : step}
    </div>
    <span className="font-medium text-sm">{title}</span>
  </div>
);

// Campo de formulario
const FormField = ({
  label,
  error,
  children,
  touched
}: {
  label: string;
  error?: string;
  touched?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-[#1E2D69]">{label}</label>
    {children}
    <AnimatePresence>
      {error && touched && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-[#ED1C24] text-xs flex items-center gap-1 mt-1"
        >
          <AlertTriangle size={12} />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

export default function InscripcionPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [evento, setEvento] = useState<any>(null);
  const [dbData, setDbData] = useState<{ tipos: any[]; eps: any[]; dio: any[]; config: any }>({ tipos: [], eps: [], dio: [], config: null });
  const [stats, setStats] = useState({ inscritos: 0, cupos: 3000 });
  const [selectedDiocesis, setSelectedDiocesis] = useState<{ id: string; nombre: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const { register, watch, formState: { errors }, control, trigger, setValue, getValues, handleSubmit } = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      diocesis: "",
      personas: [{
        nombre: "", apellido: "", documento: "", email: "",
        entidadSalud: "", segmentacion: "", hospedaje: "no",
        usaraBusDuranteEncar: "no", telefono: "",
      }],
      comprobante: undefined
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "personas" });
  const watchFields = watch();

  const markAsTouched = useCallback((fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  const getFieldError = (fieldName: string, index?: number) => {
    if (index !== undefined) {
      return errors.personas?.[index]?.[fieldName as keyof PersonaFormData]?.message;
    }
    return errors[fieldName as keyof FormData]?.message;
  };

  const isFieldTouched = (fieldName: string, index?: number) => {
    const key = index !== undefined ? `personas.${index}.${fieldName}` : fieldName;
    return touchedFields[key];
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const { data: eventoData } = await supabase
          .from('eventos')
          .select('*')
          .eq('esta_activo', true)
          .maybeSingle();

        if (eventoData) {
          setEvento(eventoData);
          const { count } = await supabase
            .from('inscripciones')
            .select('*', { count: 'exact', head: true })
            .eq('evento_id', eventoData.id);

          setStats({ inscritos: count || 0, cupos: 3000 });

          const [t, e, d, c] = await Promise.all([
            supabase.from('tipos_persona').select('*').eq('evento_id', eventoData.id),
            supabase.from('eps').select('*').order('nombre'),
            supabase.from('jurisdicciones').select('*').eq('evento_id', eventoData.id).order('nombre'),
            supabase.from('configuracion_evento').select('*').eq('evento_id', eventoData.id).maybeSingle()
          ]);

          setDbData({ tipos: t.data || [], eps: e.data || [], dio: d.data || [], config: c.data });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const resumen = useMemo(() => {
    const { config, dio, tipos } = dbData;
    if (!config || !evento) return { subtotal: 0, comision: 0, total: 0, cantidad: 0 };

    const diocesisData = dio.find((d: any) => d.id === watchFields.diocesis) as any;

    let subtotal = 0;
    let comision = 0;
    let total = 0;

    const commissionRate = Number(process.env.NEXT_PUBLIC_comission) || 0;

    (watchFields.personas || []).forEach((p: any) => {
      const rol = tipos.find((t: any) => t.valor === p.segmentacion) as any;

      let base =
        (config as any).modo_precio === 'global'
          ? Number((config as any).precio_global_base) || 0
          : Number(diocesisData?.precio_base) || 0;

      let dto = 0;

      if (rol && base > 0) {
        dto =
          rol.metodo_activo === 'porcentaje'
            ? base * ((Number(rol.descuento_porcentaje) || 0) / 100)
            : Number(rol.descuento_fijo) || 0;
      }

      let hospedaje = 0;

      if (p.hospedaje === 'si') {
        hospedaje = (config as any)?.usar_hospedaje_diocesis
          ? Number(diocesisData?.precio_hospedaje_especifico) || 0
          : Number((config as any)?.valor_hospedaje_general) || 0;
      }

      const precioPersona = Math.max(0, base - dto + hospedaje);

      const comisionPersona = precioPersona * commissionRate;
      const totalPersona = precioPersona + comisionPersona;

      subtotal += precioPersona;
      comision += comisionPersona;
      total += totalPersona;
    });

    return {
      subtotal,
      comision,
      total,
      cantidad: watchFields.personas?.length || 0,
    };
  }, [watchFields, dbData, evento]);

  const nextStep = async () => {
    const newTouched: Record<string, boolean> = { diocesis: true };
    fields.forEach((_, i) => {
      ['nombre', 'apellido', 'documento', 'email', 'telefono', 'entidadSalud', 'segmentacion', 'hospedaje', 'usaraBusDuranteEncar', 'edad'].forEach(field => {
        newTouched[`personas.${i}.${field}`] = true;
      });
    });
    setTouchedFields(newTouched);

    const valid = await trigger();
    if (!valid) {
      const firstError = document.querySelector('[data-error="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const d = dbData.dio.find((x: any) => x.id === watchFields.diocesis) as any;
    if (d) setSelectedDiocesis({ id: d.id, nombre: d.nombre });
    setStep(2);
    setSubmitError(null);
  };

  const onSubmit = async (data: FormData) => {
    if (processing || !selectedDiocesis) return;
    setProcessing(true);
    setSubmitError(null);

    try {
      let comprobanteUrl = null;

      // Subir comprobante único si existe
      if (data.comprobante && data.comprobante[0]) {
        const file = data.comprobante[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `comprobante_${Date.now()}_${selectedDiocesis.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(fileName, file);

        if (uploadError) throw new Error(`Error subiendo comprobante: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
          .from('comprobantes')
          .getPublicUrl(fileName);

        comprobanteUrl = urlData.publicUrl;
      }

      // Crear todas las inscripciones con el mismo comprobante
      const inscripcionesData = data.personas.map(persona => ({
        evento_id: evento.id,
        diocesis_id: selectedDiocesis.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        documento: persona.documento,
        email: persona.email,
        telefono: persona.telefono,
        entidadSalud: persona.entidadSalud,
        segmentacion: persona.segmentacion,
        hospedaje: persona.hospedaje,
        usara_bus_durante_encar: persona.usaraBusDuranteEncar,
        precio_pactado: resumen.total / data.personas.length,
        estado: 'pendiente',
        imagen_url: comprobanteUrl,
        Metodotransportepropio: persona.usaraBusDuranteEncar,
        edad: persona.edad,
        created_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('inscripciones')
        .insert(inscripcionesData);

      if (insertError) throw new Error(`Error guardando inscripciones: ${insertError.message}`);

      setSubmitSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1200000);
    } catch (error: any) {
      setSubmitError(error.message);
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.grisClaro }}>
      <div className="text-center">
        <Loader2 className="animate-spin mx-auto mb-4" size={32} style={{ color: colors.azul }} />
        <p style={{ color: colors.azulOscuro }}>Cargando...</p>
      </div>
    </div>
  );

  if (!evento) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.grisClaro }}>
      <div className="text-center max-w-md p-8 rounded-2xl shadow-lg" style={{ backgroundColor: 'white' }}>
        <Calendar className="mx-auto mb-4" size={48} style={{ color: colors.azulOscuro, opacity: 0.3 }} />
        <h2 className="text-2xl font-bold mb-2" style={{ color: colors.azulOscuro }}>Sin Eventos Activos</h2>
        <p className="mb-6" style={{ color: colors.azulOscuro, opacity: 0.7 }}>No hay inscripciones disponibles.</p>
        <button onClick={() => window.location.reload()} className="text-white px-6 py-2 rounded-lg transition-all hover:shadow-lg" style={{ backgroundColor: colors.azul }}>
          Reintentar
        </button>
      </div>
    </div>
  );

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.grisClaro }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md p-8 rounded-2xl shadow-lg"
          style={{ backgroundColor: 'white' }}
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${colors.verde}20` }}>
            <CheckCircle size={40} style={{ color: colors.verde }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: colors.azulOscuro }}>¡Inscripción Exitosa!</h2>
          <p className="mb-4" style={{ color: colors.azulOscuro, opacity: 0.7 }}>
            Tus datos han sido registrados correctamente, próximamente recibirás más información por parte de la organización.
          </p>
          <p className="text-sm" style={{ color: colors.azulOscuro, opacity: 0.5 }}>
            <a
              href="#"
              style={{ color: colors.azul }}
              onClick={() => window.location.href = ""}
            >
              Aceptar
            </a>

          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: colors.grisClaro }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="rounded-2xl shadow-sm p-6 mb-6" style={{ backgroundColor: 'white' }}>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: colors.grisClaro }}>
              <img src="./santaelena.jpeg" alt="EN CAR" className="w-20 h-20 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.azulOscuro }}>{evento.nombre}</h1>
              <p className="mt-1" style={{ color: colors.azulOscuro, opacity: 0.7 }}>{evento.descripcion || "Querido hermano, nos alegra mucho que estés aquí.\nTe damos la bienvenida a este espacio de inscripción para nuestro ENCAR, que se realizará en Rionegro – Antioquia, los días 27, 28 y 29 de junio.\nTe invitamos a completar este formulario con calma. Cada paso te acerca a vivir una experiencia que busca encender tu corazón por medio de la grandiosa efusión del Espíritu Santo."}</p>
              <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                <span className="flex items-center gap-1"><Users size={16} />{stats.inscritos} / {stats.cupos} cupos</span>
                <span className="flex items-center gap-1"><Shield size={16} />Pago por comprobante</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl shadow-sm p-4" style={{ backgroundColor: 'white' }}>
              <StepIndicator step={1} currentStep={step} title="Datos de inscripción" />
              <StepIndicator step={2} currentStep={step} title="Comprobante de pago" />
            </div>

            <div className="w-100 h-120 rounded-xl flex items-center justify-left shrink-0" style={{ backgroundColor: colors.grisClaro }}>
              <img src="./santaelena.jpeg" alt="EN CAR" className="w-70 h-120 object-contain" />
            </div>

            {step === 2 && (
              <div className="text-white rounded-xl p-4" style={{ background: `linear-gradient(135deg, ${colors.azul} 0%, ${colors.verde} 100%)` }}>
                <p className="text-white/80 text-sm mb-1">Subtotal</p>
                <p className="text-2xl font-bold">${(resumen.subtotal).toLocaleString()}</p>
                <p className="text-white/80 text-sm mb-1">Comisión</p>
                <p className="text-2xl font-bold">${(resumen.comision).toLocaleString()}</p>
                <p className="text-white/80 text-sm mb-1">Total a pagar</p>
                <p className="text-2xl font-bold">${(resumen.total).toLocaleString()}</p>
                <p className="text-sm mt-2 text-white/80">{resumen.cantidad} personas</p>
                <p className="text-xs mt-1 text-white/60">Diócesis: {selectedDiocesis?.nombre}</p>
              </div>
            )}
          </div>

          {/* Formulario */}
          <div className="lg:col-span-2">
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: 'white' }}>
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

                    {/* Diócesis */}
                    <div data-error={!!errors.diocesis}>
                      <FormField
                        label="Diócesis *"
                        error={errors.diocesis?.message}
                        touched={isFieldTouched('diocesis')}
                      >
                        <select
                          {...register("diocesis", { required: "Debe seleccionar una diócesis" })}
                          className="w-full rounded-lg p-3 focus:outline-none focus:ring-2 transition-all"
                          style={{
                            border: `1px solid ${errors.diocesis && isFieldTouched('diocesis') ? colors.rojo : colors.grisClaro}`,
                            color: colors.azulOscuro
                          }}
                          onBlur={() => markAsTouched('diocesis')}
                        >
                          <option value="">Seleccione una diócesis...</option>
                          {dbData.dio.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>

                    {/* Personas */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold" style={{ color: colors.azulOscuro }}>Participantes</h3>
                        <button
                          type="button"
                          onClick={() => {
                            append({
                              nombre: "", apellido: "", documento: "", email: "",
                              entidadSalud: "", segmentacion: "", hospedaje: "no",
                              usaraBusDuranteEncar: "no", telefono: "",edad:0
                            });
                          }}
                          className="text-sm font-medium flex items-center gap-1 transition-colors hover:opacity-80"
                          style={{ color: colors.verde }}
                        >
                          <Plus size={16} /> Agregar participante
                        </button>
                      </div>

                      {fields.map((field, i) => (
                        <div key={field.id} className="rounded-lg p-4 space-y-4" style={{ border: `1px solid ${colors.grisClaro}` }}>
                          <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: colors.grisClaro }}>
                            <span className="font-medium" style={{ color: colors.azulOscuro }}>Persona {i + 1}</span>
                            {fields.length > 1 && (
                              <button
                                onClick={() => remove(i)}
                                className="transition-colors hover:opacity-80 flex items-center gap-1 text-sm"
                                style={{ color: colors.rojo }}
                              >
                                <Trash2 size={16} /> Eliminar
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Nombre */}
                            <div data-error={!!errors.personas?.[i]?.nombre}>
                              <FormField
                                label="Nombres *"
                                error={getFieldError('nombre', i)}
                                touched={isFieldTouched('nombre', i)}
                              >
                                <input
                                  {...register(`personas.${i}.nombre`, {
                                    required: "El nombre es obligatorio",
                                    minLength: { value: 2, message: "Mínimo 2 caracteres" }
                                  })}
                                  onBlur={() => markAsTouched(`personas.${i}.nombre`)}
                                  className="w-full rounded-lg p-2.5 focus:outline-none focus:ring-2 transition-all"
                                  style={{
                                    border: `1px solid ${errors.personas?.[i]?.nombre && isFieldTouched('nombre', i) ? colors.rojo : colors.grisClaro}`,
                                    color: colors.azulOscuro
                                  }}
                                  placeholder="Nombres completos"
                                />
                              </FormField>
                            </div>

                            {/* Apellido */}
                            <div data-error={!!errors.personas?.[i]?.apellido}>
                              <FormField
                                label="Apellidos *"
                                error={getFieldError('apellido', i)}
                                touched={isFieldTouched('apellido', i)}
                              >
                                <input
                                  {...register(`personas.${i}.apellido`, {
                                    required: "El apellido es obligatorio",
                                    minLength: { value: 2, message: "Mínimo 2 caracteres" }
                                  })}
                                  onBlur={() => markAsTouched(`personas.${i}.apellido`)}
                                  className="w-full rounded-lg p-2.5 focus:outline-none focus:ring-2 transition-all"
                                  style={{
                                    border: `1px solid ${errors.personas?.[i]?.apellido && isFieldTouched('apellido', i) ? colors.rojo : colors.grisClaro}`,
                                    color: colors.azulOscuro
                                  }}
                                  placeholder="Apellidos completos"
                                />
                              </FormField>
                            </div>

                            {/* Documento */}
                            <div data-error={!!errors.personas?.[i]?.documento}>
                              <FormField
                                label="Documento de identidad *"
                                error={getFieldError('documento', i)}
                                touched={isFieldTouched('documento', i)}
                              >
                                <input
                                  {...register(`personas.${i}.documento`, {
                                    required: "El documento es obligatorio",
                                    minLength: { value: 5, message: "Mínimo 5 dígitos" },
                                    maxLength: { value: 15, message: "Máximo 15 dígitos" },
                                    pattern: { value: /^[0-9]+$/, message: "Solo números permitidos" }
                                  })}
                                  onBlur={() => markAsTouched(`personas.${i}.documento`)}
                                  className="w-full rounded-lg p-2.5 focus:outline-none focus:ring-2 transition-all"
                                  style={{
                                    border: `1px solid ${errors.personas?.[i]?.documento && isFieldTouched('documento', i) ? colors.rojo : colors.grisClaro}`,
                                    color: colors.azulOscuro
                                  }}
                                  placeholder="Número de documento"
                                />
                              </FormField>
                            </div>

                            {/* Email */}
                            <div data-error={!!errors.personas?.[i]?.email}>
                              <FormField
                                label="Correo electrónico *"
                                error={getFieldError('email', i)}
                                touched={isFieldTouched('email', i)}
                              >
                                <input
                                  {...register(`personas.${i}.email`, {
                                    required: "El email es obligatorio",
                                    pattern: {
                                      value: /^\S+@\S+$/i,
                                      message: "Formato de email inválido"
                                    }
                                  })}
                                  onBlur={() => markAsTouched(`personas.${i}.email`)}
                                  type="email"
                                  className="w-full rounded-lg p-2.5 focus:outline-none focus:ring-2 transition-all"
                                  style={{
                                    border: `1px solid ${errors.personas?.[i]?.email && isFieldTouched('email', i) ? colors.rojo : colors.grisClaro}`,
                                    color: colors.azulOscuro
                                  }}
                                  placeholder="correo@ejemplo.com"
                                />
                              </FormField>
                            </div>

                            {/* Teléfono */}
                            <div data-error={!!errors.personas?.[i]?.telefono}>
                              <FormField
                                label="Teléfono *"
                                error={getFieldError('telefono', i)}
                                touched={isFieldTouched('telefono', i)}
                              >
                                <input
                                  {...register(`personas.${i}.telefono`, {
                                    required: "El teléfono es obligatorio",
                                    minLength: { value: 10, message: "Mínimo 10 dígitos" },
                                    maxLength: { value: 10, message: "Máximo 10 dígitos" },
                                    pattern: { value: /^[0-9]+$/, message: "Solo números permitidos" }
                                  })}
                                  onBlur={() => markAsTouched(`personas.${i}.telefono`)}
                                  type="tel"
                                  className="w-full rounded-lg p-2.5 focus:outline-none focus:ring-2 transition-all"
                                  style={{
                                    border: `1px solid ${errors.personas?.[i]?.telefono && isFieldTouched('telefono', i) ? colors.rojo : colors.grisClaro}`,
                                    color: colors.azulOscuro
                                  }}
                                  placeholder="3001234567"
                                />
                              </FormField>
                            </div>

                            {/* EPS */}
                            <div data-error={!!errors.personas?.[i]?.entidadSalud}>
                              <FormField
                                label="EPS *"
                                error={getFieldError('entidadSalud', i)}
                                touched={isFieldTouched('entidadSalud', i)}
                              >
                                <select
                                  {...register(`personas.${i}.entidadSalud`, { required: "Debe seleccionar una EPS" })}
                                  onBlur={() => markAsTouched(`personas.${i}.entidadSalud`)}
                                  className="w-full rounded-lg p-2.5 focus:outline-none focus:ring-2 transition-all"
                                  style={{
                                    border: `1px solid ${errors.personas?.[i]?.entidadSalud && isFieldTouched('entidadSalud', i) ? colors.rojo : colors.grisClaro}`,
                                    color: colors.azulOscuro
                                  }}
                                >
                                  <option value="">Seleccione EPS...</option>
                                  {dbData.eps.map((e: any) => (
                                    <option key={e.id} value={e.nombre}>{e.nombre}</option>
                                  ))}
                                </select>
                              </FormField>
                            </div>

                            {/* Tipo */}
                            <div data-error={!!errors.personas?.[i]?.segmentacion}>
                              <FormField
                                label="Tipo de participante *"
                                error={getFieldError('segmentacion', i)}
                                touched={isFieldTouched('segmentacion', i)}
                              >
                                <select
                                  {...register(`personas.${i}.segmentacion`, { required: "Debe seleccionar un tipo" })}
                                  onBlur={() => markAsTouched(`personas.${i}.segmentacion`)}
                                  className="w-full rounded-lg p-2.5 focus:outline-none focus:ring-2 transition-all"
                                  style={{
                                    border: `1px solid ${errors.personas?.[i]?.segmentacion && isFieldTouched('segmentacion', i) ? colors.rojo : colors.grisClaro}`,
                                    color: colors.azulOscuro
                                  }}
                                >
                                  <option value="">Seleccione tipo...</option>
                                  {dbData.tipos.map((t: any) => (
                                    <option key={t.id} value={t.valor}>{t.nombre}</option>
                                  ))}
                                </select>
                              </FormField>
                            </div>
                            <div data-error={!!errors.personas?.[i]?.telefono}>
                              <FormField
                                label="Edad *"
                                error={getFieldError('edad', i)}
                                touched={isFieldTouched('edad', i)}
                              >
                                <input
                                  {...register(`personas.${i}.edad`, {
                                    required: "La edad es obligatoria",
                                    minLength: { value: 1, message: "Mínimo 10 dígitos" },
                                    maxLength: { value: 120, message: "Máximo 10 dígitos" },
                                    pattern: { value: /^[0-9]+$/, message: "Solo números permitidos" }
                                  })}
                                  onBlur={() => markAsTouched(`personas.${i}.edad`)}
                                  type="tel"
                                  className="w-full rounded-lg p-2.5 focus:outline-none focus:ring-2 transition-all"
                                  style={{
                                    border: `1px solid ${errors.personas?.[i]?.edad && isFieldTouched('edad', i) ? colors.rojo : colors.grisClaro}`,
                                    color: colors.azulOscuro
                                  }}
                                  placeholder="10"
                                />
                              </FormField>
                            </div>
                            {/* Hospedaje y Transporte */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div data-error={!!errors.personas?.[i]?.hospedaje}>
                                <FormField
                                  label="Requiere hospedaje *"
                                  error={getFieldError('hospedaje', i)}
                                  touched={isFieldTouched('hospedaje', i)}
                                >
                                  <div className="flex gap-2">
                                    {['si', 'no'].map(opt => (
                                      <label
                                        key={opt}
                                        className="flex-1 rounded-lg p-2.5 text-center cursor-pointer transition-all border-2"
                                        style={{
                                          borderColor: watchFields.personas?.[i]?.hospedaje === opt ? colors.verde : errors.personas?.[i]?.hospedaje && isFieldTouched('hospedaje', i) ? colors.rojo : colors.grisClaro,
                                          backgroundColor: watchFields.personas?.[i]?.hospedaje === opt ? `${colors.verde}10` : 'transparent'
                                        }}
                                      >
                                        <input
                                          type="radio"
                                          value={opt}
                                          {...register(`personas.${i}.hospedaje`, { required: "Seleccione una opción" })}
                                          className="sr-only"
                                          onBlur={() => markAsTouched(`personas.${i}.hospedaje`)}
                                        />
                                        <span className="capitalize font-medium" style={{ color: watchFields.personas?.[i]?.hospedaje === opt ? colors.verde : colors.azulOscuro }}>
                                          {opt === 'si' ? 'Sí' : 'No'}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </FormField>
                              </div>

                              <div data-error={!!errors.personas?.[i]?.usaraBusDuranteEncar}>
                                <FormField
                                  label="¿Tu delegación llegará en bus y utilizará este medio de transporte durante el ENCAR? *"
                                  error={getFieldError('usaraBusDuranteEncar', i)}
                                  touched={isFieldTouched('usaraBusDuranteEncar', i)}
                                >
                                  <div className="flex gap-2">
                                    {['si', 'no'].map(opt => (
                                      <label
                                        key={opt}
                                        className="flex-1 rounded-lg p-2.5 text-center cursor-pointer transition-all border-2"
                                        style={{
                                          borderColor: watchFields.personas?.[i]?.usaraBusDuranteEncar === opt ? colors.azul : errors.personas?.[i]?.usaraBusDuranteEncar && isFieldTouched('usaraBusDuranteEncar', i) ? colors.rojo : colors.grisClaro,
                                          backgroundColor: watchFields.personas?.[i]?.usaraBusDuranteEncar === opt ? `${colors.azul}10` : 'transparent'
                                        }}
                                      >
                                        <input
                                          type="radio"
                                          value={opt}
                                          {...register(`personas.${i}.usaraBusDuranteEncar`, { required: "Seleccione una opción" })}
                                          className="sr-only"
                                          onBlur={() => markAsTouched(`personas.${i}.usaraBusDuranteEncar`)}
                                        />
                                        <span className="capitalize font-medium" style={{ color: watchFields.personas?.[i]?.usaraBusDuranteEncar === opt ? colors.azul : colors.azulOscuro }}>
                                          {opt === 'si' ? 'Sí' : 'No'}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </FormField>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {Object.keys(errors).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="rounded-lg p-4 flex gap-3 items-center"
                        style={{ backgroundColor: `${colors.rojo}15`, border: `1px solid ${colors.rojo}40` }}
                      >
                        <AlertTriangle style={{ color: colors.rojo }} size={20} />
                        <p className="text-sm" style={{ color: colors.rojoOscuro }}>
                          Por favor corrija los errores marcados en rojo antes de continuar
                        </p>
                      </motion.div>
                    )}

                    <button
                      onClick={nextStep}
                      disabled={fields.length === 0 || !watchFields.diocesis}
                      className="w-full text-white py-3 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${colors.verde} 0%, ${colors.azul} 100%)` }}
                    >
                      Continuar <ChevronRight size={18} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="step2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-6"
                  >

                    {/* Resumen de pago */}
                    <div className="rounded-xl p-6" style={{ background: `linear-gradient(135deg, ${colors.azul} 0%, ${colors.verde} 100%)` }}>
                      <div className="space-y-3 text-white">
                        <div className="flex justify-between items-center border-b border-white/20 pb-2">
                          <span className="text-white/80">Subtotal</span>
                          <span className="text-3xl font-bold">${resumen.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/20 pb-2">
                          <span className="text-white/80">Comisión</span>
                          <span className="text-3xl font-bold">${resumen.comision.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/80">Total a pagar</span>
                          <span className="text-3xl font-bold">${resumen.total.toLocaleString()}</span>
                        </div>
                        <div className="text-sm text-white/80 space-y-1">
                          <p>Personas: <span className="font-semibold text-white">{watchFields.personas.length}</span></p>
                          <p>Diócesis: <span className="font-semibold text-white">{selectedDiocesis?.nombre}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Lista de participantes */}
                    <div className="rounded-lg p-4" style={{ border: `1px solid ${colors.grisClaro}` }}>
                      <h4 className="font-bold mb-3" style={{ color: colors.azulOscuro }}>Participantes registrados</h4>
                      <div className="space-y-2">
                        {watchFields.personas.map((p, i) => (
                          <div key={i} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: colors.grisClaro }}>
                            <span className="text-sm" style={{ color: colors.azulOscuro }}>
                              {i + 1}. {p.nombre} {p.apellido}
                            </span>
                            <span className="text-sm font-medium" style={{ color: colors.azul }}>
                              ${Math.round(resumen.total / watchFields.personas.length).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Instrucciones de pago */}
                    <div className="rounded-lg p-4 border" style={{ backgroundColor: `${colors.amarillo}15`, borderColor: `${colors.amarillo}40` }}>
                      <h4 className="font-bold mb-2 flex items-center gap-2" style={{ color: colors.azulOscuro }}>
                        <FileText size={18} style={{ color: colors.amarillo }} />
                        Instrucciones de pago
                      </h4>
                      <p className="text-sm mb-3" style={{ color: colors.azulOscuro }}>
                        Realiza el pago del total indicado y suba un único comprobante para todos los participantes.
                      </p>
                      <ul className="text-sm space-y-1" style={{ color: colors.azulOscuro, opacity: 0.8 }}>
                        <li>• Puedes pagar por transferencia ó consignación al numéro de cuenta 023-000081-99, ahorros bancolombia</li>
                        <li>• La cuenta debe aparecer con el nit 902029303</li>
                        <li>• El comprobante debe ser claro y legible</li>
                        <li>• Debe mostrar el monto total de ${resumen.total.toLocaleString()}</li>
                        <li>• Formatos aceptados: JPG ó PNG</li>
                        <li>• Tamaño máximo: 5MB</li>
                      </ul>
                    </div>

                    {/* Subida de comprobante único */}
                    <div data-error={!!errors.comprobante}>
                      <FormField
                        label="Comprobante de pago *"
                        error={errors.comprobante?.message}
                        touched={isFieldTouched('comprobante')}
                      >
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            {...register("comprobante", {
                              required: "Debe subir el comprobante de pago",
                              validate: {
                                existe: (files) => (files && files.length > 0) || "Debe seleccionar un archivo",
                                tamaño: (files) => !files || files[0]?.size <= 5 * 1024 * 1024 || "El archivo no debe superar 5MB",
                                tipo: (files) => {
                                  if (!files || files.length === 0) return true;
                                  const tipo = files[0].type;
                                  return ['image/jpeg', 'image/png', 'image/jpg'].includes(tipo) || "Solo se permiten imágenes JPG o PNG";
                                }
                              },
                              onChange: (e) => {
                                // Esta es la forma correcta de manejar onChange con register
                                markAsTouched('comprobante');
                                // No llamamos trigger aquí porque mode: "onChange" ya lo hace
                              }
                            })}
                            className="w-full rounded-lg p-3 focus:outline-none focus:ring-2 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1E5CAA] file:text-white hover:file:bg-[#1E2D69]"
                            style={{
                              border: `1px solid ${errors.comprobante && isFieldTouched('comprobante') ? colors.rojo : colors.grisClaro}`,
                              color: colors.azulOscuro
                            }}
                          />
                          <Upload className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" size={20} style={{ color: colors.azul, opacity: 0.5 }} />
                        </div>
                      </FormField>

                      {/* Preview del archivo seleccionado */}
                      {watchFields.comprobante && watchFields.comprobante[0] && (
                        <div className="mt-2 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ backgroundColor: `${colors.verde}15`, border: `1px solid ${colors.verde}40` }}>
                          <CheckCircle size={16} style={{ color: colors.verde }} />
                          <span style={{ color: colors.azulOscuro }}>
                            Archivo seleccionado: <b>{watchFields.comprobante[0].name}</b> ({(watchFields.comprobante[0].size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      )}

                      <p className="text-xs mt-1" style={{ color: colors.azulOscuro, opacity: 0.5 }}>
                        Un solo comprobante para todos los participantes. JPG ó PNG - Máx. 5MB
                      </p>
                    </div>

                    {/* Error de envío */}
                    {submitError && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-lg p-4 flex gap-3 items-center"
                        style={{ backgroundColor: `${colors.rojo}15`, border: `1px solid ${colors.rojo}` }}
                      >
                        <AlertTriangle style={{ color: colors.rojo }} size={20} />
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: colors.rojoOscuro }}>Error al enviar</p>
                          <p className="text-xs" style={{ color: colors.rojoOscuro }}>{submitError}</p>
                        </div>
                        <button onClick={() => setSubmitError(null)} type="button" style={{ color: colors.rojoOscuro }}>
                          <X size={16} />
                        </button>
                      </motion.div>
                    )}

                    {/* Botones */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        disabled={processing}
                        className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors"
                        style={{
                          border: `1px solid ${colors.grisClaro}`,
                          color: colors.azulOscuro,
                          backgroundColor: 'white'
                        }}
                      >
                        Volver y editar
                      </button>
                      <button
                        type="submit"
                        disabled={processing}
                        className="flex-1 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${colors.verde} 0%, ${colors.azul} 100%)` }}
                      >
                        {processing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        {processing ? 'Enviando...' : 'Enviar inscripción'}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
