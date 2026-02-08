"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  Settings2, Percent, BadgeDollarSign, Ban, 
  Loader2, Sparkles, Check, ShieldAlert, Target
} from "lucide-react";

export default function ConfigurarReglasActivas() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [eventoActivo, setEventoActivo] = useState<any>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // 1. Carga inicial: Solo evento activo y sus roles asociados
  useEffect(() => {
    async function initConfig() {
      setLoading(true);
      const { data: evento } = await supabase
        .from("eventos")
        .select("id, nombre")
        .eq("esta_activo", true)
        .single();

      if (evento) {
        setEventoActivo(evento);
        const { data: rolesData } = await supabase
          .from("tipos_persona")
          .select("*")
          .eq("evento_id", evento.id)
          .order("nombre", { ascending: true });
        
        setRoles(rolesData || []);
      }
      setLoading(false);
    }
    initConfig();
  }, [supabase]);

  const cambiarMetodo = async (id: number, nuevoMetodo: string) => {
    setLoadingId(id);
    const { error } = await supabase
      .from("tipos_persona")
      .update({ metodo_activo: nuevoMetodo })
      .eq("id", id)
      .eq("evento_id", eventoActivo.id); // Doble validación de seguridad
    
    if (!error) {
      setRoles(roles.map(r => r.id === id ? { ...r, metodo_activo: nuevoMetodo } : r));
      setLastUpdated(id);
      setTimeout(() => setLastUpdated(null), 2000);
    }
    setLoadingId(null);
  };

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sincronizando reglas del evento...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER DE CONTEXTO ACTIVO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Motor de Precios Dinámicos</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 uppercase italic leading-none tracking-tighter">
            Reglas: <span className="text-indigo-600">{eventoActivo?.nombre || 'Sin Evento'}</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Sincronizado en Vivo</span>
        </div>
      </div>

      {/* MATRIZ DE CONFIGURACIÓN */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {roles.map((rol: any) => (
            <div key={rol.id} className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:bg-slate-50/50 transition-all group">
              <div className="flex items-center gap-6">
                <div 
                  className="w-16 h-16 rounded-[2rem] flex items-center justify-center text-white shadow-lg relative transition-transform duration-500 group-hover:rotate-6" 
                  style={{ backgroundColor: rol.color || '#6366f1' }}
                >
                  <span className="font-black text-2xl">{rol.nombre.charAt(0)}</span>
                  {lastUpdated === rol.id && (
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg border-4 border-white">
                      <Check size={14} strokeWidth={4} />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase text-xl tracking-tighter">{rol.nombre}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                    ID Referencia: <span className="font-mono">{rol.valor}</span>
                  </p>
                </div>
              </div>

              {/* SELECTOR DE MÉTODOS */}
              <div className="flex bg-slate-100 p-2 rounded-[2.5rem] gap-2 border border-slate-200/50 shadow-inner">
                {[
                  { id: 'porcentaje', icon: Percent, label: 'Dcto %' },
                  { id: 'fijo', icon: BadgeDollarSign, label: 'Neto' },
                  { id: 'ninguno', icon: Ban, label: 'Plena' }
                ].map((metodo) => {
                  const isActive = rol.metodo_activo === metodo.id;
                  return (
                    <button
                      key={metodo.id}
                      onClick={() => cambiarMetodo(rol.id, metodo.id)}
                      disabled={loadingId === rol.id}
                      className={`
                        flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[11px] font-black uppercase transition-all duration-500
                        ${isActive 
                          ? 'bg-white text-indigo-600 shadow-xl scale-105' 
                          : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'
                        }
                      `}
                    >
                      {loadingId === rol.id && isActive ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <metodo.icon size={16} strokeWidth={isActive ? 3 : 2} />
                      )}
                      <span>{metodo.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER DE ADVERTENCIA */}
      <div className="p-8 bg-amber-50 rounded-[3rem] border-2 border-amber-100/50 flex flex-col md:flex-row gap-6 items-center">
        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xl shadow-amber-200">
          <ShieldAlert size={28} />
        </div>
        <div className="text-center md:text-left">
          <p className="font-black text-[12px] uppercase tracking-widest text-amber-700 mb-1">Cambios Globales en Tiempo Real</p>
          <p className="text-xs text-amber-800/80 font-medium max-w-2xl leading-relaxed">
            Modificar el método de cálculo aquí afectará a todos los inscritos que aún no han realizado su pago. 
            Asegúrate de comunicar cambios drásticos en la política de precios a través de tus canales oficiales.
          </p>
        </div>
      </div>
    </div>
  );
}