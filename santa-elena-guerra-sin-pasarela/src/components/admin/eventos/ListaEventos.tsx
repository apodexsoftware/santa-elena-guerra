"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  Power, 
  Trash2, 
  Edit3, 
  Calendar, 
  Target, 
  Users, 
  MoreVertical,
  AlertCircle,
  Loader2
} from "lucide-react";

export default function ListaEventos() {
  const supabase = createClient();
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEventos = async () => {
    setLoading(true);
    // Traemos los eventos ordenados por fecha, los más recientes primero
    const { data } = await supabase
      .from("eventos")
      .select("*")
      .order("fecha_inicio", { ascending: false });
    
    setEventos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  const handleActivar = async (id: string) => {
    setActionLoading(id);
    // El Trigger de SQL que creamos se encargará de desactivar los demás automáticamente
    const { error } = await supabase
      .from("eventos")
      .update({ esta_activo: true })
      .eq("id", id);

    if (error) {
      alert("Error al activar: " + error.message);
    } else {
      // Recargamos la lista para ver el cambio visual de "Activo"
      await fetchEventos();
      // Opcional: window.location.reload() si quieres forzar que todo el sidebar se actualice
    }
    setActionLoading(null);
  };

  const handleEliminar = async (id: string, nombre: string) => {
    const confirmar = confirm(`¿Estás seguro de eliminar "${nombre}"?\nEsta acción es irreversible y borrará todos los inscritos asociados.`);
    
    if (confirmar) {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) alert("Error al eliminar: " + error.message);
      else fetchEventos();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronizando Entornos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {eventos.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
          <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500 font-bold italic">No hay eventos creados todavía.</p>
        </div>
      ) : (
        eventos.map((evento) => (
          <div 
            key={evento.id} 
            className={`group bg-white p-8 rounded-[3.5rem] border-2 transition-all flex flex-col lg:flex-row items-center justify-between gap-8 ${
              evento.esta_activo 
              ? "border-indigo-600 shadow-2xl shadow-indigo-50 ring-4 ring-indigo-50" 
              : "border-slate-100 hover:border-slate-200 hover:shadow-lg"
            }`}
          >
            {/* INFO DEL EVENTO */}
            <div className="flex items-center gap-8 flex-1 w-full">
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                evento.esta_activo ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" : "bg-slate-100 text-slate-400"
              }`}>
                <Calendar size={32} strokeWidth={2.5} />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
                    {evento.nombre}
                  </h4>
                  {evento.esta_activo && (
                    <span className="bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      Live Now
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-indigo-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      Meta: <span className="text-slate-900">${Number(evento.meta_recaudacion).toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-rose-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      Inicia: <span className="text-slate-900">{new Date(evento.fecha_inicio).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-slate-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase italic">ID: {evento.slug}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ACCIONES */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button 
                onClick={() => handleActivar(evento.id)}
                disabled={evento.esta_activo || actionLoading === evento.id}
                className={`flex-1 lg:flex-none px-10 py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                  evento.esta_activo 
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-default" 
                  : "bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-200"
                }`}
              >
                {actionLoading === evento.id ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : evento.esta_activo ? (
                  <>Conectado</>
                ) : (
                  <><Power size={16} /> Activar Entorno</>
                )}
              </button>

              <div className="flex gap-2">
                <button 
                  className="p-5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-100 rounded-3xl transition-all shadow-sm"
                  title="Editar Configuración"
                >
                  <Edit3 size={20} />
                </button>
                <button 
                  onClick={() => handleEliminar(evento.id, evento.nombre)}
                  className="p-5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-3xl transition-all shadow-sm"
                  title="Eliminar Evento"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}