"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  LayoutGrid, Map, Save, Loader2, CheckCircle2, 
  DollarSign, AlertTriangle, Globe, Building2, 
  Users, Target, Zap, Shield, Sparkles, 
  TrendingUp, Lock, RefreshCw, Rocket,
  BarChart3, Calendar, Bell, Cpu,
  Database, Cloud, Server, Wifi,
  Eye, EyeOff, CreditCard, Clock, ChevronDown
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ConfigGlobal() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [eventoActivo, setEventoActivo] = useState<any>(null);
  const [modo, setModo] = useState<"diocesis" | "global">("diocesis");
  const [precioGlobal, setPrecioGlobal] = useState(0);
  const [stats, setStats] = useState({
    totalJurisdicciones: 0,
    inscritos: 0,
    recaudacion: 0,
    precioPromedio: 0
  });

  const fetchConfigData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Obtener evento activo
      const { data: evento, error: errorEv } = await supabase
        .from('eventos')
        .select('id, nombre, fecha_inicio, ubicacion')
        .eq('esta_activo', true)
        .single();

      if (errorEv || !evento) {
        toast.error("No hay evento activo configurado");
        return;
      }
      
      setEventoActivo(evento);

      // 2. Obtener configuración del evento
      const { data: config } = await supabase
        .from('configuracion_evento')
        .select('*')
        .eq('evento_id', evento.id)
        .single();

      if (config) {
        setModo(config.modo_precio || "diocesis");
        setPrecioGlobal(Number(config.precio_global_base) || 0);
      }

      // 3. Obtener estadísticas
      const [jurisdicciones, inscripciones] = await Promise.all([
        supabase
          .from('jurisdicciones')
          .select('id, precio_base')
          .eq('evento_id', evento.id),
        supabase
          .from('inscripciones')
          .select('precio_pagado')
          .eq('evento_id', evento.id)
      ]);

      const totalJurisdicciones = jurisdicciones.data?.length || 0;
      const totalInscritos = inscripciones.data?.length || 0;
      const recaudacionTotal = inscripciones.data?.reduce((sum, i) => 
        sum + (Number(i.precio_pagado) || 0), 0
      ) || 0;
      
      const precioPromedio = totalJurisdicciones > 0 && jurisdicciones.data
        ? jurisdicciones.data.reduce((sum, j) => sum + (Number(j.precio_base) || 0), 0) / totalJurisdicciones
        : 0;

      setStats({
        totalJurisdicciones,
        inscritos: totalInscritos,
        recaudacion: recaudacionTotal,
        precioPromedio
      });

    } catch (err) {
      console.error("Error de sincronización:", err);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchConfigData();
  }, [fetchConfigData]);

  const handleSave = async () => {
    if (!eventoActivo) {
      toast.error("No hay evento activo");
      return;
    }

    setSaving(true);
    
    try {
      // Verificar si ya existe configuración
      const { data: existingConfig } = await supabase
        .from("configuracion_evento")
        .select('id')
        .eq("evento_id", eventoActivo.id)
        .single();

      const payload = {
        modo_precio: modo,
        precio_global_base: Number(precioGlobal),
        updated_at: new Date().toISOString(),
        evento_id: eventoActivo.id
      };

      let error;
      
      if (existingConfig) {
        // Actualizar
        const { error: updateError } = await supabase
          .from("configuracion_evento")
          .update(payload)
          .eq("evento_id", eventoActivo.id);
        error = updateError;
      } else {
        // Insertar
        const { error: insertError } = await supabase
          .from("configuracion_evento")
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      setShowSuccess(true);
      toast.success("Configuración guardada exitosamente");
      
      // Actualizar estadísticas
      fetchConfigData();
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("¿Restaurar valores predeterminados? Esta acción no se puede deshacer.")) {
      setModo("diocesis");
      setPrecioGlobal(0);
      toast.info("Valores restaurados");
    }
  };

  // Calcula recomendación de precio
  const precioRecomendado = useMemo(() => {
    if (modo === "global") {
      if (stats.precioPromedio > 0) {
        return stats.precioPromedio;
      }
      return 150000; // Valor por defecto
    }
    return 0;
  }, [modo, stats.precioPromedio]);

  const modoInfo = useMemo(() => ({
    diocesis: {
      title: "Precios por Jurisdicción",
      description: "Cada sede establece su propio precio base",
      icon: Map,
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-50 to-cyan-50",
      borderColor: "border-blue-200",
      features: [
        "Autonomía por jurisdicción",
        "Precios diferenciados",
        "Mayor flexibilidad",
        "Ideal para eventos diversos"
      ]
    },
    global: {
      title: "Precio Global Único",
      description: "Tarifa única aplicada a todas las jurisdicciones",
      icon: LayoutGrid,
      color: "from-purple-500 to-pink-500",
      bgColor: "from-purple-50 to-pink-50",
      borderColor: "border-purple-200",
      features: [
        "Precio uniforme",
        "Simplifica administración",
        "Fácil de comunicar",
        "Ideal para eventos estandarizados"
      ]
    }
  }), []);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 rounded-[3rem] p-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-20" />
        <Loader2 className="absolute inset-0 m-auto text-indigo-600" size={32} />
      </motion.div>
      <div className="text-center space-y-3">
        <p className="text-sm font-bold text-slate-700 uppercase tracking-widest">
          Sincronizando Configuración
        </p>
        <p className="text-xs text-slate-500 max-w-sm">
          Conectando con la base de datos y cargando estadísticas en tiempo real
        </p>
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
          <Wifi size={10} className="animate-pulse" /> Conectando a Supabase
        </div>
      </div>
    </div>
  );

  if (!eventoActivo) return (
    <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-[3rem] p-12 text-center">
      <div className="inline-block p-4 bg-white rounded-2xl mb-6">
        <AlertTriangle className="text-rose-500" size={48} />
      </div>
      <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-4">
        Evento no Configurado
      </h3>
      <p className="text-slate-600 mb-8 max-w-md mx-auto">
        No hay un evento activo en el sistema. Activa un evento primero para configurar la estrategia de recaudo.
      </p>
      <button 
        onClick={fetchConfigData}
        className="bg-gradient-to-r from-slate-900 to-slate-700 text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:shadow-lg transition-all"
      >
        <RefreshCw size={16} className="inline mr-2" />
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Premium */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-[3rem] p-8 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
                <Target size={24} className="text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300">
                  Configuración de Recaudo
                </span>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none mt-2">
                  Estrategia Financiera
                </h2>
              </div>
            </div>
            <p className="text-indigo-200 text-sm max-w-2xl">
              Configura cómo se gestionarán los precios y pagos para{" "}
              <span className="font-bold text-white">{eventoActivo.nombre}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                ID Evento
              </div>
              <code className="text-xs font-mono text-white bg-white/20 px-3 py-1 rounded-lg">
                {eventoActivo.id.substring(0, 8)}...
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Stats en tiempo real */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Jurisdicciones</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalJurisdicciones}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Building2 size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Inscritos</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.inscritos}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Recaudación</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                ${stats.recaudacion.toLocaleString('es-ES')}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Precio Promedio</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                ${stats.precioPromedio.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Selección de Modo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {(["diocesis", "global"] as const).map((modoOption) => {
          const info = modoInfo[modoOption];
          const Icon = info.icon;
          const isSelected = modo === modoOption;
          
          return (
            <motion.button
              key={modoOption}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setModo(modoOption)}
              className={`relative p-8 rounded-[2.5rem] border-2 text-left transition-all duration-300 overflow-hidden group ${
                isSelected 
                  ? `${info.borderColor} bg-white shadow-2xl shadow-${modoOption === 'diocesis' ? 'blue' : 'purple'}-100` 
                  : 'border-slate-100 bg-slate-50/50 hover:bg-white'
              }`}
            >
              {/* Fondo de gradiente */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 ${
                modoOption === 'diocesis' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
              }`} />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    isSelected 
                      ? `bg-gradient-to-br ${info.color} text-white` 
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon size={28} />
                  </div>
                  
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <CheckCircle2 size={20} />
                    </motion.div>
                  )}
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-3">
                  {info.title}
                </h3>
                
                <p className="text-slate-600 mb-6 leading-relaxed">
                  {info.description}
                </p>
                
                <div className="space-y-2">
                  {info.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        isSelected 
                          ? (modoOption === 'diocesis' ? 'bg-blue-500' : 'bg-purple-500')
                          : 'bg-slate-300'
                      }`} />
                      <span className="text-sm text-slate-700 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className={`mt-8 p-4 rounded-xl ${
                  isSelected 
                    ? (modoOption === 'diocesis' ? 'bg-blue-50' : 'bg-purple-50')
                    : 'bg-slate-100'
                }`}>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {modoOption === 'diocesis' ? 'Ideal cuando' : 'Recomendado si'}
                  </div>
                  <div className="text-sm text-slate-700">
                    {modoOption === 'diocesis' 
                      ? 'Las jurisdicciones tienen realidades económicas diferentes'
                      : 'Buscas simplificar la gestión y tener un precio único'
                    }
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Configuración de Precio Global */}
      <AnimatePresence>
        {modo === "global" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Globe size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase italic">Precio Global Único</h3>
                      <p className="text-purple-200 text-sm">
                        Establece el valor que aplicará a todas las jurisdicciones
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 p-4 rounded-2xl">
                  <div className="text-xs text-purple-200 font-bold uppercase tracking-wider mb-1">
                    Recomendación del Sistema
                  </div>
                  <div className="text-2xl font-black">
                    ${precioRecomendado.toLocaleString('es-ES')}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative max-w-xl">
                  <div className="absolute left-8 top-1/2 -translate-y-1/2">
                    <DollarSign className="text-purple-300" size={32} />
                  </div>
                  <input 
                    type="number"
                    min="0"
                    step="1000"
                    className="w-full bg-white/20 border-2 border-white/30 rounded-2xl py-6 pl-20 pr-8 text-3xl font-black text-white placeholder:text-purple-300 focus:outline-none focus:border-white focus:bg-white/30 transition-all"
                    value={precioGlobal}
                    onChange={(e) => setPrecioGlobal(Number(e.target.value))}
                    placeholder="0"
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-purple-300 text-sm font-bold">
                    COP
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[50000, 100000, 150000, 200000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setPrecioGlobal(amount)}
                      className={`p-4 rounded-xl text-center transition-all ${
                        precioGlobal === amount
                          ? 'bg-white text-purple-900'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <div className="text-sm font-bold">${amount.toLocaleString('es-ES')}</div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-purple-200 text-sm">
                  <AlertTriangle size={16} />
                  <span>Este precio será aplicado automáticamente a todas las jurisdicciones existentes y nuevas</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel de Acciones */}
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                <Shield size={24} className="text-indigo-600" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 uppercase italic">
                  Confirmar Configuración
                </h4>
                <p className="text-slate-600 text-sm">
                  Guarda los cambios para aplicar la estrategia de recaudo
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleReset}
              className="px-6 py-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-bold flex items-center gap-3 transition-all"
            >
              <RefreshCw size={18} />
              Restaurar
            </button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-3 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Aplicar Estrategia
                  <Rocket size={18} />
                </>
              )}
            </motion.button>
          </div>
        </div>
        
        {/* Success Message */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 p-6 rounded-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-emerald-800 text-lg">¡Configuración Guardada!</h5>
                  <p className="text-emerald-700 text-sm">
                    La estrategia de recaudo ha sido sincronizada con la base de datos y se aplicará inmediatamente.
                  </p>
                </div>
                <div className="text-emerald-600 text-xs font-bold uppercase tracking-widest">
                  <Clock size={14} className="inline mr-1" />
                  {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
              <Server size={20} />
            </div>
            <div>
              <h5 className="font-bold text-slate-800">Configuración Avanzada</h5>
              <p className="text-slate-600 text-sm">Opciones técnicas y de integración</p>
            </div>
          </div>
          <div className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
            <ChevronDown size={20} className="text-slate-400" />
          </div>
        </button>
        
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-slate-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Modo de Precio</span>
                    <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                      {modo}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">ID del Evento</span>
                    <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                      {eventoActivo.id.substring(0, 12)}...
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Última Sincronización</span>
                    <span className="text-sm text-slate-600 font-medium">
                      {new Date().toLocaleString('es-ES')}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Database size={14} className="text-slate-500" />
                      <span className="text-xs font-bold text-slate-700 uppercase">Tablas Vinculadas</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>configuracion_evento</div>
                      <div>jurisdicciones</div>
                      <div>inscripciones</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="text-center pt-8 border-t border-slate-200">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
          Configuración Sincronizada en Tiempo Real con Supabase
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Conectado • Base de datos en la nube</span>
        </div>
      </div>
    </div>
  );
}