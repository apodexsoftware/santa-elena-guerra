"use client";
import React, { useState, useEffect, useMemo } from "react";
import { 
  Map, 
  PlusCircle, 
  Settings2, 
  Send, 
  LayoutGrid, // <-- Asegúrate de que esta línea esté aquí
  Trash2, 
  Edit3, 
  Loader2,
  MapPin,    // Si estás en ListadoDiocesis
  Banknote   // Si estás en ListadoDiocesis
} from "lucide-react";
export default function EnviarMensajeSede({ data }: { data: any[] }) {
  const [destino, setDestino] = useState("todas");
  const [mensaje, setMensaje] = useState("");

  const enviarEmail = () => {
    alert(`Enviando mensaje a ${destino}: ${mensaje}`);
    // Aquí conectarías con Resend o una Edge Function de Supabase
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-900 uppercase italic">Comunicación Directa</h2>
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase px-2">Seleccionar Destinatario</label>
          <select 
            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-700 mt-2"
            value={destino} onChange={(e) => setDestino(e.target.value)}
          >
            <option value="todas">Todas las Jurisdicciones</option>
            {data.map(d => <option key={d.id} value={d.email_encargado}>{d.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase px-2">Mensaje (Email)</label>
          <textarea 
            rows={6}
            className="w-full bg-slate-50 border-none rounded-3xl p-6 font-medium text-slate-700 mt-2 focus:ring-2 ring-indigo-500"
            placeholder="Escribe la información importante aquí..."
            value={mensaje} onChange={(e) => setMensaje(e.target.value)}
          />
        </div>

        <button 
          onClick={enviarEmail}
          className="w-full bg-indigo-600 text-white font-black uppercase py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          <Send size={18} /> Enviar Información por Correo
        </button>
      </div>
    </div>
  );
}