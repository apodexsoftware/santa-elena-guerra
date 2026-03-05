"use client";

import React, { useState, useEffect } from "react";
import { 
  UserX, MessageCircle, AlertCircle, Mail, 
  Clock, ExternalLink, ShieldAlert, Loader2 
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";

export default function ListadoRechazados() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [rechazados, setRechazados] = useState<any[]>([]);

  useEffect(() => {
    async function fetchRechazados() {
      setLoading(true);
      
      // 1. Obtener evento activo
      const { data: evento } = await supabase
        .from('eventos')
        .select('id')
        .eq('esta_activo', true)
        .single();

      if (evento) {
        // 2. Traer solo los rechazados de este evento
        // Asumimos que tienes 'telefono' o 'whatsapp' en la tabla inscripciones
        const { data } = await supabase
          .from("inscripciones")
          .select("nombre, apellido, email, telefono, estado")
          .eq("evento_id", evento.id)
          .eq("estado", "rechazada")
        if (data) setRechazados(data);
      }
      setLoading(false);
    }

    fetchRechazados();
  }, [supabase]);

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
      <Loader2 className="animate-spin text-rose-500" size={32} />
      <span className="text-[10px] font-black uppercase tracking-widest italic">Cargando incidencias...</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* HEADER DE AUDITORÍA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={16} className="text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Control de Incidencias</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
            Auditoría de Rechazos
          </h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Gestión de inscripciones con discrepancias en el pago.</p>
        </div>
        
        {rechazados.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 px-6 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            <span className="text-[11px] font-black text-rose-600 uppercase tracking-widest">
              {rechazados.length} Casos por resolver
            </span>
          </div>
        )}
      </div>

      {/* LISTADO DE CASOS */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="divide-y divide-slate-50">
          {rechazados.map((user) => (
            <div key={user.id} className="p-8 flex flex-col lg:flex-row lg:items-center justify-between hover:bg-rose-50/20 transition-all group gap-6">
              
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-[1.5rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 shrink-0">
                  <UserX size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase italic text-lg leading-none mb-1">
                    {user.nombre} {user.apellido}
                  </h4>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      <Mail size={10} /> {user.email}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                      <Clock size={10} /> {new Date(user.fecha_rechazo).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Motivo del Rechazo</p>
                  <div className="flex items-center gap-2 text-rose-600 font-black text-sm italic uppercase">
                    <AlertCircle size={14} /> {user.motivo_rechazo || "No especificado"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <a 
                    href={`https://wa.me/${user.telefono}?text=Hola ${user.nombre}, tenemos una observación con tu comprobante de pago...`}
                    target="_blank"
                    className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                  >
                    <MessageCircle size={18} />
                    Contactar
                  </a>

                  <button className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 active:scale-95">
                    <ExternalLink size={18} />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

        {rechazados.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert size={40} className="opacity-20" />
            </div>
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Cero Incidencias: Todo el flujo está al día</p>
          </div>
        )}
      </div>

      {/* BANNER INFORMATIVO */}
      <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white flex items-center gap-6 shadow-2xl shadow-indigo-200/20">
        <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/40">
          <Mail size={24} />
        </div>
        <div>
          <p className="text-xs text-white uppercase font-black italic tracking-wider mb-1">Protocolo de Recuperación</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
            Al rechazar, el sistema envía automáticamente una notificación por email. El botón "Contactar" permite una gestión humana vía WhatsApp para agilizar la corrección del pago.
          </p>
        </div>
      </div>
    </div>
  );
}