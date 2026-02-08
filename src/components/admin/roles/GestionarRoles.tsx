"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  Edit3, Trash2, ShieldCheck, Percent, 
  BadgeDollarSign, Ban, Info, Loader2, AlertCircle 
} from "lucide-react";

export default function GestionarRolesActivo({ onEdit }: any) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [eventoNombre, setEventoNombre] = useState("");

  const cargarDatosExclusivos = async () => {
    setLoading(true);
    try {
      // 1. Obtener el evento que tiene el flag 'esta_activo'
      const { data: evento, error: errEv } = await supabase
        .from('eventos')
        .select('id, nombre')
        .eq('esta_activo', true)
        .single();

      if (errEv || !evento) throw new Error("No hay un evento activo configurado.");
      setEventoNombre(evento.nombre);

      // 2. Traer solo los roles vinculados a ese evento específico
      const { data: rolesData, error: errRoles } = await supabase
        .from('tipos_persona')
        .select('*')
        .eq('evento_id', evento.id)
        .order('nombre', { ascending: true });

      if (errRoles) throw errRoles;
      setRoles(rolesData || []);
    } catch (error: any) {
      console.error("Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosExclusivos();
  }, []);

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sincronizando evento activo...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Indicador de Contexto de Evento */}
      <div className="flex items-center justify-between px-8 py-4 bg-indigo-600 rounded-[2rem] text-white shadow-lg shadow-indigo-200">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Gestionando Evento:</span>
          <span className="text-sm font-bold italic">{eventoNombre}</span>
        </div>
        <ShieldCheck size={20} className="opacity-50" />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil Activo</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estrategia</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Descuento</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {roles.map((rol) => (
              <tr key={rol.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-10 rounded-full" style={{ backgroundColor: rol.color }} />
                    <span className="font-black text-slate-900 uppercase italic text-sm">{rol.nombre}</span>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <span className="text-[10px] font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-500 uppercase">
                    {rol.metodo_activo}
                  </span>
                </td>
                <td className="p-6 text-center font-black text-indigo-600 italic">
                  {rol.metodo_activo === 'porcentaje' ? `-${rol.descuento_porcentaje}%` : 
                   rol.metodo_activo === 'fijo' ? `-$${rol.descuento_fijo.toLocaleString()}` : '0%'}
                </td>
                <td className="p-6 text-right">
                  <button onClick={() => onEdit(rol)} className="p-2 text-slate-400 hover:text-indigo-600">
                    <Edit3 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}