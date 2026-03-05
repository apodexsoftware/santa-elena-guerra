"use client";
import React, { useState } from "react";
import { 
  Save, Calendar, Target, Bell, 
  Loader2, Rocket, Timer, TrendingUp 
} from "lucide-react";

export default function ConfigurarMetas() {
  const [loading, setLoading] = useState(false);

  // Simulación de guardado
  const handleSave = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* HEADER DE SECCIÓN */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 px-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Rocket size={16} className="text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Objetivos de Alto Nivel</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
            Configuración de Metas
          </h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Establece los parámetros que definen el éxito del evento.</p>
        </div>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* META DE RECAUDACIÓN */}
          <div className="space-y-4 group">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 group-focus-within:text-indigo-600 transition-colors">
              <Target size={14} /> Meta de Recaudación (COP)
            </label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
              <input 
                type="number"
                placeholder="0.00"
                className="w-full pl-12 p-7 bg-slate-50 rounded-[2rem] border-2 border-transparent text-3xl font-black outline-none focus:ring-0 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* META DE ASISTENTES */}
          <div className="space-y-4 group">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 group-focus-within:text-emerald-600 transition-colors">
              <TrendingUp size={14} /> Cupos Máximos
            </label>
            <div className="relative">
              <input 
                type="number"
                placeholder="500"
                className="w-full p-7 bg-slate-50 rounded-[2rem] border-2 border-transparent text-3xl font-black outline-none focus:ring-0 focus:border-emerald-500 focus:bg-white transition-all text-slate-800"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Personas</span>
            </div>
          </div>
        </div>

        {/* FECHA DEL EVENTO CON PREVIEW */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
            <Calendar size={14} className="text-rose-600"/> Fecha y Hora de Inicio
          </label>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <input 
              type="datetime-local"
              className="lg:col-span-2 p-6 bg-slate-50 rounded-[2rem] border-2 border-transparent font-black outline-none focus:border-rose-500 focus:bg-white transition-all text-slate-800 uppercase"
            />
            <div className="bg-rose-50 rounded-[2rem] p-6 flex items-center gap-4 border border-rose-100">
              <div className="w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-200">
                <Timer size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-rose-800 uppercase leading-none">Status</p>
                <p className="text-[11px] font-bold text-rose-600 mt-1 uppercase">Reloj Activo</p>
              </div>
            </div>
          </div>
        </div>

        {/* NOTIFICACIÓN SISTEMA */}
        <div className="p-8 bg-slate-900 rounded-[2.5rem] flex gap-5 items-center relative overflow-hidden group">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 backdrop-blur-md">
            <Bell size={24} />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-medium relative z-10">
            <b className="text-white">Impacto en Dashboard:</b> Al guardar, el sistema recalculará los porcentajes de cumplimiento y la cuenta regresiva para todos los administradores.
          </p>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
        </div>

        {/* BOTÓN DE ACCIÓN */}
        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-black py-7 rounded-[2rem] flex items-center justify-center gap-4 uppercase text-xs tracking-[0.2em] hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-2xl shadow-indigo-100"
        >
          {loading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <>
              <Save size={20} strokeWidth={3} /> Guardar Estrategia del Evento
            </>
          )}
        </button>
      </div>
    </div>
  );
}