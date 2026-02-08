"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  PlusCircle, 
  Settings2, 
  BarChart3, 
  Trash2,
  RefreshCw,
  Activity,
  Layers
} from "lucide-react";
import AdminNavbar from "@/components/AdminNavbar";

// Importación de sub-componentes (Debes crearlos siguiendo el estilo previo)
import ResumenEventos from "@/components/admin/eventos/ResumenEventos";
import ListaEventos from "@/components/admin/eventos/ListaEventos";
import CrearEvento from "@/components/admin/eventos/CrearEvento";
import ConfiguracionGlobal from "@/components/admin/eventos/ConfiguracionGlobal";

export default function GestionEventosPage() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [loading, setLoading] = useState(false);

  // Menú lateral siguiendo exactamente tu estilo
  const sideMenuItems = [
    { id: "resumen", label: "Vista General", icon: BarChart3 },
    { id: "lista", label: "Todos los Eventos", icon: Layers },
    { id: "crear", label: "Nuevo Evento", icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      <AdminNavbar />
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row">
        
        {/* SIDE MENU - IDÉNTICO AL DE FINANZAS */}
        <aside className="w-full md:w-80 bg-white border-r border-slate-100 min-h-[calc(100vh-80px)] p-6">
          <div className="sticky top-28 space-y-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">
                Módulo de Eventos
              </p>
              <nav className="space-y-1">
                {sideMenuItems.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id)} 
                    className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-tight transition-all ${
                      activeTab === item.id 
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" 
                      : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon size={18} strokeWidth={activeTab === item.id ? 3 : 2} />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* CARD DE ESTADO DEL SISTEMA EN EL MENÚ */}
            <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white">
              <div className="flex justify-between items-center mb-4">
                <Activity size={20} className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</span>
              </div>
              <p className="text-sm font-black italic text-white uppercase">Multi-Entorno Activo</p>
              <div className="mt-4 flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                 <p className="text-[9px] font-bold text-slate-400 uppercase">Sincronizado con Supabase</p>
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL DINÁMICO */}
        <main className="flex-1 p-8 md:p-12">
           <div className="max-w-6xl mx-auto">
              {/* Header de la sección actual */}
              <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 uppercase italic leading-none">
                  {sideMenuItems.find(i => i.id === activeTab)?.label}
                </h2>
                <div className="h-1.5 w-12 bg-indigo-600 mt-4 rounded-full" />
              </div>

              {/* Renderizado de Sub-componentes */}
              {activeTab === "resumen" && <ResumenEventos />}
              {activeTab === "lista" && <ListaEventos />}
              {activeTab === "crear" && <CrearEvento onSuccess={() => setActiveTab("lista")} />}
           </div>
        </main>
      </div>
    </div>
  );
}