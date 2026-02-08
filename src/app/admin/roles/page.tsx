"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  ShieldCheck, 
  BarChart3, 
  UserPlus2, 
  Settings2, 
  Clock, 
  Loader2,
  Plus
} from "lucide-react";

// Importa tus componentes (los crearemos a continuación)
import ResumenRoles from "@/components/admin/roles/ResumenRoles";
import FormularioRol from "@/components/admin/roles/FormularioRol";
import GestionarRoles from "@/components/admin/roles/GestionarRoles";
import AdminNavbar from "@/components/AdminNavbar";
import ConfigurarAplicacion from "@/components/admin/roles/ConfigurarAplicacion";

export default function RolesPage() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [rolEditando, setRolEditando] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => { fetchRoles(); }, []);

  async function fetchRoles() {
    setLoading(true);
    const { data } = await supabase
      .from("tipos_persona")
      .select("*")
      .order("created_at", { ascending: false });
    setRoles(data || []);
    setLoading(false);
  }

  // Función para manejar la edición desde la tabla de gestión
  const handleEdit = (rol: any) => {
    setRolEditando(rol);
    setActiveTab("nuevo");
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      <AdminNavbar />
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row min-h-screen">
        
        {/* SIDEBAR DE ROLES */}
        <aside className="w-full md:w-72 bg-white border-r border-slate-100 p-6 flex flex-col gap-8">
          
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4">Gestión de Roles</p>
            <nav className="space-y-1">
              {[
                { id: "resumen", label: "Resumen", icon: BarChart3 },
                { id: "nuevo", label: rolEditando ? "Editar Rol" : "Añadir Rol", icon: UserPlus2 },
                { id: "gestion", label: "Gestionar roles", icon: Settings2 },
{ id: "config_metodo", label: "Configuración de roles", icon: Settings2 },              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if(item.id !== "nuevo") setRolEditando(null);
                  }} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === item.id 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                    : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <item.icon size={18}/> {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* CARD INFORMATIVA (Siguiendo tu estética) */}
          <div className="mt-auto p-6 bg-slate-900 rounded-[2rem] text-white">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mb-4">
              <ShieldCheck size={18} />
            </div>
            <p className="text-[10px] font-black uppercase opacity-60 italic">Seguridad de Precios</p>
            <p className="text-[11px] font-medium mt-2 leading-relaxed text-slate-300">
              Los cambios en los roles afectan el cálculo automático del formulario de inscripción en tiempo real.
            </p>
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
              {activeTab === "resumen" && (
                <ResumenRoles />
              )}
              {activeTab === "config_metodo" && (
  <ConfigurarAplicacion/>
)}
              {activeTab === "nuevo" && (
                <FormularioRol 
                  editData={rolEditando} 
                  onSuccess={() => {
                    fetchRoles();
                    setActiveTab("gestion");
                    setRolEditando(null);
                  }} 
                />
              )}
              
              {activeTab === "gestion" && (
                <GestionarRoles 
                  roles={roles} 
                  onEdit={handleEdit}
                  onDelete={fetchRoles} 
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}