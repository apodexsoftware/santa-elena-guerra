"use client";
import React, { useState } from "react";
import { ShieldCheck, Database, Globe, Lock, Download, Loader2 } from "lucide-react";

export default function ConfiguracionGlobal({ dataToBackup = [] }: { dataToBackup: any[] }) {
  const [isExporting, setIsExporting] = useState(false);

  // --- LÓGICA DE RESPALDO (JSON) ---
  const handleDownloadBackup = () => {
    if (dataToBackup.length === 0) {
      alert("No hay datos disponibles para respaldar.");
      return;
    }

    setIsExporting(true);
    
    try {
      // Creamos un objeto con metadatos del respaldo
      const backupData = {
        evento: "SANTA HELENA",
        fecha_respaldo: new Date().toISOString(),
        total_registros: dataToBackup.length,
        datos: dataToBackup
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      link.href = url;
      link.download = `BACKUP_SH_${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error en backup:", error);
    } finally {
      setTimeout(() => setIsExporting(false), 1000); // Feedback visual
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 uppercase italic">Configuración de Sistema</h2>
        <p className="text-slate-500 text-sm font-medium">Control técnico y salvaguarda de la información.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* CARD FUNCIONAL DE BACKUP */}
        <div 
          onClick={handleDownloadBackup}
          className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 hover:border-emerald-500/20 transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:shadow-emerald-100/50 relative overflow-hidden"
        >
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
            {isExporting ? <Loader2 className="animate-spin" size={28}/> : <Database size={28} />}
          </div>
          
          <div className="relative z-10">
            <h4 className="text-lg font-black text-slate-900 uppercase italic mb-2 flex items-center gap-2">
              Backup Instantáneo
              <span className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse"/>
            </h4>
            <p className="text-xs text-slate-500 font-bold uppercase leading-relaxed mb-6">
              Descarga una copia completa de la base de datos en formato JSON para contingencias.
            </p>
            
            <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <Download size={14} strokeWidth={3} /> {isExporting ? "Procesando..." : "Descargar Ahora"}
            </div>
          </div>

          {/* Marca de agua decorativa */}
          <div className="absolute -right-4 -bottom-4 text-emerald-500/5 group-hover:scale-150 transition-transform duration-1000">
            <Database size={120} />
          </div>
        </div>

        {/* Las demás se mantienen visuales por ahora */}
        <ConfigCard 
          icon={<Globe className="text-blue-500" />} 
          title="Dominio y Slugs" 
          desc="Personaliza la URL pública de inscripción."
        />
        <ConfigCard 
          icon={<Lock className="text-rose-500" />} 
          title="Seguridad" 
          desc="Gestión de llaves API y tokens de acceso."
        />
        <ConfigCard 
          icon={<ShieldCheck className="text-indigo-500" />} 
          title="Logs de Sistema" 
          desc="Registro de actividad de administradores."
        />
      </div>
    </div>
  );
}

function ConfigCard({ icon, title, desc }: any) {
  return (
    <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 hover:border-slate-200 transition-all group cursor-not-allowed opacity-60">
      <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:grayscale-0 grayscale transition-all">{icon}</div>
      <h4 className="text-lg font-black text-slate-900 uppercase italic mb-2">{title}</h4>
      <p className="text-xs text-slate-500 font-bold uppercase leading-relaxed">{desc}</p>
    </div>
  );
}