"use client";

import React, { useState, useEffect } from "react";
import { 
  Map, PlusCircle, Settings2, Send, 
  LayoutGrid, Trash2, Edit3, Loader2 
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";

// Sub-componentes (los definiremos abajo)
import ListadoDiocesis from "@/components/admin/jurisdicciones/ListadoDiocesis";
import FormDiocesis from "@/components/admin/jurisdicciones/FormDiocesis";
import ConfigGlobal from "@/components/admin/jurisdicciones/ConfigGlobal";
import EnviarMensajeSede from "@/components/admin/jurisdicciones/EnviarMensajeSede";
import AdminNavbar from "@/components/AdminNavbar";
export default function JurisdiccionesPage() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [diocesis, setDiocesis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => { fetchDiocesis(); }, []);

  async function fetchDiocesis() {
    setLoading(false);
    // Nota: Aquí asumo que tienes una tabla llamada 'sedes' o 'jurisdicciones'
    // Si no la tienes, te daré el SQL para crearla abajo.
    const { data } = await supabase.from("jurisdicciones").select("*").order("nombre");
    setDiocesis(data || []);
    setLoading(false);
  }

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setActiveTab("agregar"); // Reutilizamos el form para editar
  };

  return (
    <div>
    <AdminNavbar/>
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col md:flex-row">
      
      {/* SIDEBAR DE JURISDICCIONES */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-100 p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 italic uppercase">Jurisdicciones</h1>
          <p className="text-xs text-slate-400 font-bold">Gestión de sedes y precios</p>
        </div>

        <nav className="space-y-1">
          <button onClick={() => { setActiveTab("resumen"); setEditingItem(null); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "resumen" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-500 hover:bg-slate-50"}`}>
            <LayoutGrid size={18}/> Resumen de Sedes
          </button>
          
          <button onClick={() => { setActiveTab("agregar"); setEditingItem(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "agregar" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-500 hover:bg-slate-50"}`}>
            <PlusCircle size={18}/> {editingItem ? "Editando Sede" : "Agregar Diócesis"}
          </button>

          <button onClick={() => setActiveTab("config")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "config" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-500 hover:bg-slate-50"}`}>
            <Settings2 size={18}/> Configuración Precios
          </button>

          <button onClick={() => setActiveTab("mensaje")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "mensaje" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-500 hover:bg-slate-50"}`}>
            <Send size={18}/> Enviar Mensaje
          </button>
        </nav>
      </aside>

      {/* CONTENIDO DINÁMICO */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
        ) : (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === "resumen" && <ListadoDiocesis data={diocesis} onEdit={handleEdit} />}
            {activeTab === "agregar" && <FormDiocesis initialData={editingItem} onRefresh={fetchDiocesis} onSuccess={() => setActiveTab("resumen")} />}
            {activeTab === "config" && <ConfigGlobal />}
            {activeTab === "mensaje" && <EnviarMensajeSede data={diocesis} />}
          </div>
        )}
      </main>
    </div>
    </div>
  );
}