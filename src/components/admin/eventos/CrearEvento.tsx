"use client";
import React, { useState } from "react";
import { createClient } from "@/utils/supabase/clients";
import { Save, Sparkles, AlertCircle } from "lucide-react";

export default function CrearEvento({ onSuccess }: { onSuccess: () => void }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    slug: "",
    meta_recaudacion: 50000000,
    fecha_inicio: "",
    ubicacion: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("eventos").insert([form]);
    if (!error) {
      onSuccess();
    } else {
      alert("Error al crear: " + error.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8 animate-in slide-in-from-bottom-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Nombre del Evento</label>
          <input 
            required
            className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:ring-2 ring-indigo-500 font-bold"
            placeholder="Ej: Congreso Nacional de Laicos 2026"
            onChange={e => setForm({...form, nombre: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-')})}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Meta Financiera (COP)</label>
          <input 
            type="number"
            className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:ring-2 ring-indigo-500 font-bold"
            value={form.meta_recaudacion}
            onChange={e => setForm({...form, meta_recaudacion: Number(e.target.value)})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Fecha de Inicio</label>
          <input 
            type="date"
            required
            className="w-full p-6 bg-white border border-slate-100 rounded-3xl outline-none focus:ring-2 ring-indigo-500 font-bold"
            onChange={e => setForm({...form, fecha_inicio: e.target.value})}
          />
        </div>
      </div>

      <div className="p-6 bg-indigo-50 rounded-[2rem] flex gap-4 border border-indigo-100">
        <Sparkles className="text-indigo-600 shrink-0" />
        <p className="text-[11px] text-indigo-900 font-medium leading-relaxed">
          Al crear un evento, el sistema generará automáticamente un entorno aislado. Podrás configurar roles y precios específicos para este evento una vez creado.
        </p>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
      >
        {loading ? "Procesando..." : <><Save size={18}/> Inicializar Evento</>}
      </button>
    </form>
  );
}