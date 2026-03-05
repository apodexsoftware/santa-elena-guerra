"use client";
import React, { useState, useEffect, useCallback } from "react";
import { 
  Save, Landmark, Mail, DollarSign, AlertCircle, 
  Loader2, Globe, Building2, CheckCircle2, XCircle,
  Calendar, Info
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { toast } from "sonner";

interface Props {
  initialData?: any;
  onRefresh: () => void;
  onSuccess: () => void;
}

type EventoInfo = {
  id: string;
  nombre: string;
  fecha_inicio: string | null;
};

type ConfiguracionEvento = {
  modo_precio: 'diocesis' | 'global';
  precio_global_base: number;
  usar_hospedaje_diocesis: boolean;
};

export default function FormDiocesis({ initialData, onRefresh, onSuccess }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [loadingEvento, setLoadingEvento] = useState(true);
  const [eventoInfo, setEventoInfo] = useState<EventoInfo | null>(null);
  const [configuracionEvento, setConfiguracionEvento] = useState<ConfiguracionEvento | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    nombre: "",
    precio_base: "",
    email_encargado: ""
  });

  // Obtener información del evento activo y su configuración
  const fetchEventoInfo = useCallback(async () => {
    setLoadingEvento(true);
    try {
      // Obtener evento activo
      const { data: evento, error: eventoError } = await supabase
        .from("eventos")
        .select("id, nombre, fecha_inicio")
        .eq("esta_activo", true)
        .maybeSingle();

      if (eventoError) {
        console.error("Error obteniendo evento:", eventoError);
        toast.error("Error al cargar el evento activo");
        return;
      }

      if (!evento) {
        toast.warning("No hay un evento activo");
        setEventoInfo(null);
        return;
      }

      setEventoInfo(evento);

      // Obtener configuración del evento
      const { data: config, error: configError } = await supabase
        .from("configuracion_evento")
        .select("modo_precio, precio_global_base, usar_hospedaje_diocesis")
        .eq("evento_id", evento.id)
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') {
        console.warn("Error obteniendo configuración:", configError);
      }

      setConfiguracionEvento(config || { 
        modo_precio: 'diocesis', 
        precio_global_base: 0,
        usar_hospedaje_diocesis: true 
      });

    } catch (error) {
      console.error("Error cargando evento:", error);
      toast.error("Error al cargar la configuración del evento");
    } finally {
      setLoadingEvento(false);
    }
  }, [supabase]);

  // Cargar información inicial
  useEffect(() => {
    fetchEventoInfo();

    if (initialData) {
      setFormData({
        nombre: initialData.nombre || "",
        precio_base: initialData.precio_base ? initialData.precio_base.toString() : "",
        email_encargado: initialData.email_encargado || ""
      });
    }
  }, [initialData, fetchEventoInfo]);

  // Validaciones
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    } else if (formData.nombre.length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres";
    }

    // Solo validar precio si el modo es individual
    if (configuracionEvento?.modo_precio === 'diocesis') {
      const precio = parseFloat(formData.precio_base);
      if (isNaN(precio) || precio < 0) {
        newErrors.precio_base = "El precio debe ser un número válido mayor o igual a 0";
      }
    }

    if (formData.email_encargado && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_encargado)) {
      newErrors.email_encargado = "Ingresa un email válido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventoInfo?.id) {
      toast.error("No hay un evento activo seleccionado en el sistema.");
      return;
    }

    if (!validateForm()) {
      toast.error("Por favor, corrige los errores en el formulario");
      return;
    }

    setLoading(true);

    const payload: any = {
      nombre: formData.nombre.trim(),
      email_encargado: formData.email_encargado.trim() || null,
      evento_id: eventoInfo.id
    };

    // Manejar precio según el modo
    if (configuracionEvento?.modo_precio === 'diocesis') {
      payload.precio_base = parseFloat(formData.precio_base) || 0;
    } else {
      // En modo global, usar precio global o 0
      payload.precio_base = configuracionEvento?.precio_global_base || 0;
    }

    try {
      let error;
      if (initialData?.id) {
        // MODO EDICIÓN
        const { error: err } = await supabase
          .from("jurisdicciones")
          .update(payload)
          .eq("id", initialData.id);
        error = err;
        
        if (!error) {
          toast.success(`Jurisdicción "${formData.nombre}" actualizada correctamente`);
        }
      } else {
        // MODO CREACIÓN
        // Verificar si ya existe una jurisdicción con el mismo nombre para este evento
        const { data: existing, error: checkError } = await supabase
          .from("jurisdicciones")
          .select("id")
          .eq("nombre", formData.nombre.trim())
          .eq("evento_id", eventoInfo.id)
          .maybeSingle();

        if (checkError) {
          throw checkError;
        }

        if (existing) {
          toast.error(`Ya existe una jurisdicción con el nombre "${formData.nombre}" en este evento`);
          setLoading(false);
          return;
        }

        const { error: err } = await supabase
          .from("jurisdicciones")
          .insert([payload]);
        error = err;
        
        if (!error) {
          toast.success(`Jurisdicción "${formData.nombre}" creada correctamente`);
        }
      }

      if (error) {
        throw error;
      }

      onRefresh();
      onSuccess();
      
    } catch (error: any) {
      console.error("Error guardando jurisdicción:", error);
      toast.error(`Error al guardar: ${error.message || "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const modoPrecio = configuracionEvento?.modo_precio || 'diocesis';
  const precioGlobal = configuracionEvento?.precio_global_base || 0;

  if (loadingEvento) {
    return (
      <div className="p-12 text-center bg-white rounded-[2.5rem] border border-slate-100 animate-pulse">
        <Loader2 className="animate-spin mx-auto text-indigo-500 mb-4" size={32} />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cargando configuración del evento...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-[3rem] border border-slate-100 shadow-sm max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-none">
              {initialData ? "Editar Jurisdicción" : "Nueva Jurisdicción"}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">
                Evento: {eventoInfo?.nombre || "No hay evento activo"}
              </span>
              {eventoInfo?.fecha_inicio && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar size={10} />
                  {new Date(eventoInfo.fecha_inicio).toLocaleDateString('es-ES')}
                </div>
              )}
            </div>
          </div>
          
          {modoPrecio === 'global' && (
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-2">
              <Globe size={12} />
              Modo Global
            </div>
          )}
        </div>

        {/* Info del modo de precio */}
        {modoPrecio === 'global' && (
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-emerald-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-800 mb-1">Modo de precio global activado</p>
                <p className="text-xs text-emerald-700">
                  Todas las jurisdicciones usarán el precio global base de $
                  <span className="font-bold">{precioGlobal.toLocaleString()}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          {/* Nombre */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Building2 size={14} />
                Nombre de la Sede
              </label>
              {errors.nombre && (
                <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                  <XCircle size={12} />
                  {errors.nombre}
                </span>
              )}
            </div>
            <div className="relative">
              <Landmark className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                type="text"
                placeholder="Ej: Diócesis de Fontibón, Arquidiócesis de Bogotá"
                className={`w-full bg-slate-50 border-2 rounded-3xl p-5 pl-14 font-medium text-slate-800 outline-none transition-all ${
                  errors.nombre 
                    ? 'border-rose-200 focus:border-rose-500' 
                    : 'border-transparent focus:border-indigo-500 focus:bg-white'
                }`}
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                maxLength={100}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 px-5">
              Nombre completo de la jurisdicción eclesiástica
            </p>
          </div>

          {/* Precio y Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Precio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign size={14} />
                  {modoPrecio === 'global' ? 'Precio Global Base' : 'Precio Base (COP)'}
                </label>
                {errors.precio_base && (
                  <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                    <XCircle size={12} />
                    {errors.precio_base}
                  </span>
                )}
              </div>
              <div className="relative">
                <DollarSign className={`absolute left-5 top-1/2 -translate-y-1/2 ${
                  modoPrecio === 'global' ? 'text-emerald-500' : 'text-slate-400'
                }`} size={18} />
                {modoPrecio === 'global' ? (
                  <input 
                    disabled
                    value={precioGlobal.toLocaleString('es-ES')}
                    className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-3xl p-5 pl-14 font-bold text-emerald-700 outline-none"
                  />
                ) : (
                  <input 
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full bg-slate-50 border-2 rounded-3xl p-5 pl-14 font-medium text-slate-800 outline-none transition-all ${
                      errors.precio_base 
                        ? 'border-rose-200 focus:border-rose-500' 
                        : 'border-transparent focus:border-indigo-500 focus:bg-white'
                    }`}
                    value={formData.precio_base}
                    onChange={(e) => handleInputChange('precio_base', e.target.value)}
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {modoPrecio === 'global' 
                  ? 'Precio aplicado a todas las jurisdicciones del evento'
                  : 'Costo base de inscripción para esta jurisdicción'
                }
              </p>
            </div>

            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Mail size={14} />
                  Email del Encargado
                </label>
                {errors.email_encargado && (
                  <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                    <XCircle size={12} />
                    {errors.email_encargado}
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email"
                  placeholder="encargado@diocesis.com"
                  className={`w-full bg-slate-50 border-2 rounded-3xl p-5 pl-14 font-medium text-slate-800 outline-none transition-all ${
                    errors.email_encargado 
                      ? 'border-rose-200 focus:border-rose-500' 
                      : 'border-transparent focus:border-indigo-500 focus:bg-white'
                  }`}
                  value={formData.email_encargado}
                  onChange={(e) => handleInputChange('email_encargado', e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Opcional - Para notificaciones y contacto
              </p>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-2xl flex gap-3 border border-amber-100">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1">
                Vinculación al Evento Activo
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Esta jurisdicción será asociada exclusivamente al evento "<span className="font-bold">{eventoInfo?.nombre || 'Activo'}</span>". 
                Los participantes deberán seleccionar esta sede al inscribirse.
              </p>
            </div>
          </div>

          {configuracionEvento?.usar_hospedaje_diocesis && (
            <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 border border-blue-100">
              <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-bold text-blue-800 mb-1">
                  Configuración de Hospedaje
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Esta jurisdicción podrá gestionar hospedajes para sus participantes según la configuración del evento.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="pt-6 flex flex-col sm:flex-row gap-4">
          <button 
            type="button"
            onClick={onSuccess}
            className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-sm py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading || !eventoInfo}
            className="flex-[2] bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm py-4 px-6 rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {initialData ? "Actualizando..." : "Creando..."}
              </>
            ) : (
              <>
                <Save size={18} />
                {initialData ? "Actualizar Jurisdicción" : "Crear Jurisdicción"}
                <CheckCircle2 size={16} className="opacity-80" />
              </>
            )}
          </button>
        </div>

        {/* Estado del evento */}
        {!eventoInfo && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
            <p className="text-sm text-rose-700 text-center font-medium">
              ⚠️ No hay un evento activo. Activa un evento primero para poder crear jurisdicciones.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}