"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  Save, Percent, BadgeDollarSign, AlertCircle, 
  Loader2, Palette, UserCircle2, Sparkles, X 
} from "lucide-react";

interface FormularioRolProps {
  editData?: any;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function FormularioRol({ editData, onSuccess, onCancel }: FormularioRolProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: "",
    valor: "",
    descuento_porcentaje: 0,
    descuento_fijo: 0,
    color: "#6366f1",
  });

  // Cargar datos si estamos en modo edición
  useEffect(() => {
    if (editData) {
      setFormData({
        nombre: editData.nombre || "",
        valor: editData.valor || "",
        descuento_porcentaje: editData.descuento_porcentaje || 0,
        descuento_fijo: editData.descuento_fijo || 0,
        color: editData.color || "#6366f1",
      });
    }
  }, [editData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. OBTENER EL EVENTO ACTIVO (Vital para que el rol aparezca en la inscripción)
      const { data: evento, error: evError } = await supabase
        .from('eventos')
        .select('id')
        .eq('esta_activo', true)
        .single();

      if (evError || !evento) {
        throw new Error("No se pudo encontrar un evento activo. Activa uno antes de crear roles.");
      }

      // 2. PREPARAR SLUG Y PAYLOAD
      const finalValor = formData.valor || formData.nombre.toLowerCase().trim().replace(/\s+/g, "_");
      
      const payload = { 
        ...formData, 
        valor: finalValor,
        evento_id: evento.id // Vinculación forzada al evento actual
      };

      // 3. INSERTAR O ACTUALIZAR
      if (editData) {
        const { error } = await supabase
          .from("tipos_persona")
          .update(payload)
          .eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tipos_persona")
          .insert([payload]);
        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      alert("Error en la operación: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <form onSubmit={handleSubmit} className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-10 pb-6 border-b border-slate-50 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Configuración de Evento</span>
            </div>
            <h3 className="text-3xl font-black uppercase italic text-slate-900 leading-none">
              {editData ? "Editar Perfil" : "Nuevo Perfil"}
            </h3>
          </div>
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-10 space-y-8">
          {/* PREVISUALIZACIÓN CARD */}
          <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 border-dashed">
            <div 
              className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg transition-all duration-500" 
              style={{ backgroundColor: formData.color }}
            >
              <UserCircle2 size={32} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Previsualización del Rol</p>
              <h4 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">
                {formData.nombre || "Nombre del Rol"}
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* NOMBRE Y COLOR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">Nombre Público</label>
                <input 
                  required
                  className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-300"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Sacerdote, Joven, Delegado..."
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest flex items-center gap-1">
                  <Palette size={12}/> Color
                </label>
                <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-[1.5rem] border-2 border-transparent focus-within:border-indigo-500 focus-within:bg-white transition-all">
                  <input 
                    type="color"
                    className="w-10 h-10 border-none bg-transparent cursor-pointer rounded-lg"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                  />
                  <span className="text-xs font-black text-slate-500 uppercase font-mono">{formData.color}</span>
                </div>
              </div>
            </div>

            {/* COSTOS */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 text-center">Configuración Financiera (Descuentos)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500">
                    <Percent size={18} />
                  </div>
                  <input 
                    type="number"
                    className="w-full pl-14 p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    value={formData.descuento_porcentaje}
                    onChange={(e) => setFormData({...formData, descuento_porcentaje: Number(e.target.value)})}
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Porcentaje</span>
                </div>

                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500">
                    <BadgeDollarSign size={18} />
                  </div>
                  <input 
                    type="number"
                    className="w-full pl-14 p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    value={formData.descuento_fijo}
                    onChange={(e) => setFormData({...formData, descuento_fijo: Number(e.target.value)})}
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Valor Fijo</span>
                </div>
              </div>
            </div>
          </div>

          {/* ALERT */}
          <div className="bg-slate-900 p-6 rounded-[2rem] flex gap-4 items-center">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-indigo-300 shrink-0">
              <AlertCircle size={20} />
            </div>
            <p className="text-[11px] text-slate-300 leading-tight font-medium">
              Este rol se vinculará automáticamente al <b>evento activo</b>. Solo los participantes inscritos en este evento verán esta opción.
            </p>
          </div>

          {/* SUBMIT */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-black py-6 rounded-[1.5rem] hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Save size={18} strokeWidth={3} />
                {editData ? "Guardar Cambios" : "Crear Perfil para el Evento"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}