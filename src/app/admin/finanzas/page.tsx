"use client";

import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Target, 
  Download, 
  UserX, 
  BadgePercent, 
  PieChart as PieChartIcon,
  Settings,
  Loader2
} from "lucide-react";
import AdminNavbar from "@/components/AdminNavbar";

// Importación de sub-componentes
import ResumenEstrategico from "@/components/admin/finanzas/ResumenEstrategico";
import AnalisisDescuentos from "@/components/admin/finanzas/AnalisisDescuentos";
import JurisdiccionesAporte from "@/components/admin/finanzas/JurisdiccionesAporte";
import ListadoRechazados from "@/components/admin/finanzas/ListadoRechazados";
import ConfigurarMetas from "@/components/admin/finanzas/ConfigurarMetas";
import ExportarReportes from "@/components/admin/finanzas/ExportarReportes";

export default function FinanzasPage() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // El menú lateral solicitado
  const sideMenuItems = [
    { id: "resumen", label: "Resumen Estratégico", icon: LayoutDashboard },
    { id: "descuentos", label: "Análisis de Descuentos", icon: BadgePercent },
    { id: "jurisdicciones", label: "Jurisdicciones Top", icon: PieChartIcon },
    { id: "rechazados", label: "Listado Rechazados", icon: UserX },
    { id: "reportes", label: "Centro de Reportes", icon: Download },
    { id: "config", label: "Meta y Fecha", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      <AdminNavbar />
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row">
        
        {/* SIDE MENU ACTUALIZADO */}
        <aside className="w-full md:w-80 bg-white border-r border-slate-100 min-h-[calc(100vh-80px)] p-6">
          <div className="sticky top-28 space-y-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">Módulo Financiero</p>
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

            {/* CARD DE META RÁPIDA EN EL MENÚ */}
            <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white">
              <div className="flex justify-between items-center mb-4">
                <Target size={20} className="text-indigo-400" />
                <span className="text-[10px] font-black uppercase">Meta 2024</span>
              </div>
              <p className="text-xl font-black italic">$50.0M</p>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-3">
                <div className="bg-indigo-500 h-full rounded-full w-[65%]" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">65% Completado</p>
            </div>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL DINÁMICO */}
        <main className="flex-1 p-8 md:p-12">
           <div className="max-w-6xl mx-auto">
              {activeTab === "resumen" && <ResumenEstrategico />}
              {activeTab === "descuentos" && <AnalisisDescuentos />}
              {activeTab === "jurisdicciones" && <JurisdiccionesAporte />}
              {activeTab === "rechazados" && <ListadoRechazados />}
              {activeTab === "reportes" && <ExportarReportes  />}
              {activeTab === "config" && <ConfigurarMetas />}
           </div>
        </main>
      </div>
    </div>
  );
}