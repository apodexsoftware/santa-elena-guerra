"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/clients";
import { Calendar, LayoutDashboard, Map, UserCircle, CheckSquare, Loader2, Clock } from "lucide-react";
import ResumenInscripciones from "@/components/admin/inscripciones/ResumenInscripciones";
import InscripcionesPorDiocesis from "@/components/admin/inscripciones/InscripcionesPorDiocesis";
import InscripcionesPorRol from "@/components/admin/inscripciones/InscripcionesPorRol";
import AprobarRechazar from "@/components/admin/inscripciones/AprobarRechazar";
import AdminNavbar from "@/components/AdminNavbar";
export default function InscripcionesPage() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [loading, setLoading] = useState(true);
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState("todos"); 

  const supabase = createClient();

  useEffect(() => { fetchInscritos(); }, []);

  async function fetchInscritos() {
    setLoading(true);
    const { data } = await supabase.from("inscripciones").select("*").order("created_at", { ascending: false });
    setInscritos(data || []);
    setLoading(false);
  }

  // FILTRADO EXCLUSIVO POR TIEMPO
  const datosFiltrados = useMemo(() => {
    return inscritos.filter((i) => {
      const fecha = new Date(i.created_at);
      const ahora = new Date();
      
      if (timeFilter === "hoy") {
        return fecha.toDateString() === ahora.toDateString();
      } 
      if (timeFilter === "semana") {
        const haceUnaSemana = new Date();
        haceUnaSemana.setDate(ahora.getDate() - 7);
        return fecha >= haceUnaSemana;
      } 
      if (timeFilter === "mes") {
        return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
      }
      return true; // "todos"
    });
  }, [inscritos, timeFilter]);

  return (
    
    <div className="min-h-screen bg-[#fcfcfd]">
    <AdminNavbar/>
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row min-h-screen">
        
        {/* SIDEBAR */}
        <aside className="w-full md:w-72 bg-white border-r border-slate-100 p-6 flex flex-col gap-8">
          
          {/* SECCIÓN NAVEGACIÓN */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4">Módulos</p>
            <nav className="space-y-1">
              {[
                { id: "resumen", label: "Resumen", icon: LayoutDashboard },
                { id: "diocesis", label: "Por Diócesis", icon: Map },
                { id: "rol", label: "Por Rol", icon: UserCircle },
                { id: "gestion", label: "Gestionar", icon: CheckSquare },
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === item.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <item.icon size={18}/> {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* SECCIÓN FILTROS CRONOLÓGICOS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-4 mb-2">
              <Clock size={14} className="text-slate-400" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periodo</p>
            </div>
            
            <div className="bg-slate-50 p-1.5 rounded-2xl space-y-1">
              {[
                { id: "todos", label: "Todo el tiempo" },
                { id: "hoy", label: "Hoy" },
                { id: "semana", label: "Última Semana" },
                { id: "mes", label: "Este Mes" }
              ].map((f) => (
                <button 
                  key={f.id}
                  onClick={() => setTimeFilter(f.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${
                    timeFilter === f.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 p-8 md:p-12">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {activeTab === "resumen" && <ResumenInscripciones />}
              {activeTab === "diocesis" && <InscripcionesPorDiocesis />}
              {activeTab === "rol" && <InscripcionesPorRol />}
              {activeTab === "gestion" && <AprobarRechazar />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}