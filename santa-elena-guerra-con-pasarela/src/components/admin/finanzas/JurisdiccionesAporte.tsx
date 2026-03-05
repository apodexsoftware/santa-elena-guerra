"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  MapPin, Trophy, Users2, TrendingUp, 
  Loader2, Map, Navigation, ChevronRight 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Cell 
} from "recharts";

export default function TopJurisdiccionesActivas() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [totalInscritos, setTotalInscritos] = useState(0);

  useEffect(() => {
    async function cargarEstadisticas() {
      setLoading(true);
      try {
        // 1. Obtener Evento Activo
        const { data: evento } = await supabase
          .from('eventos')
          .select('id')
          .eq('esta_activo', true)
          .single();

        if (evento) {
          // 2. Traer inscripciones y agrupar por jurisdicción (Diócesis)
          const { data: inscripciones } = await supabase
            .from('inscripciones')
            .select('diocesis')
            .eq('evento_id', evento.id);

          if (inscripciones) {
            setTotalInscritos(inscripciones.length);
            
            // Contabilizar frecuencias
            const counts = inscripciones.reduce((acc: any, curr: any) => {
              const nombre = curr.diocesis || "No Especificado";
              acc[nombre] = (acc[nombre] || 0) + 1;
              return acc;
            }, {});

            // Formatear para el gráfico y ordenar de mayor a menor
            const formattedData = Object.keys(counts)
              .map(name => ({
                name,
                value: counts[name],
                percentage: ((counts[name] / inscripciones.length) * 100).toFixed(1)
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 8); // Top 8 sedes

            setStats(formattedData);
          }
        }
      } catch (err) {
        console.error("Error cargando jurisdicciones:", err);
      } finally {
        setLoading(false);
      }
    }
    cargarEstadisticas();
  }, [supabase]);

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analizando geografía del evento...</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* RANKING VISUAL (IZQUIERDA) */}
      <div className="lg:col-span-8 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={14} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Líderes en Participación</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Jurisdicciones Top</h3>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{totalInscritos} Registros Totales</span>
          </div>
        </div>

        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats} layout="vertical" margin={{ left: 60, right: 40 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 11, fontWeight: 800, fill: '#1e293b'}} 
                width={120}
              />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                labelStyle={{fontWeight: 900, color: '#6366f1', marginBottom: '4px'}}
              />
              <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={32}>
                {stats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#e2e8f0'} className="hover:fill-indigo-400 transition-colors" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DETALLE Y MÉTRICAS (DERECHA) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <Map className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10" />
          <div className="relative z-10">
            <Navigation className="text-indigo-400 mb-6" size={28} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Sede Líder</p>
            <h4 className="text-2xl font-black italic mt-2 uppercase">{stats[0]?.name || "N/A"}</h4>
            <div className="flex items-center gap-2 mt-4">
               <span className="text-4xl font-black text-white">{stats[0]?.value || 0}</span>
               <div className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded-lg">INSCRITOS</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-lg">
          <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-500" /> Distribución
          </h5>
          <div className="space-y-4">
            {stats.slice(0, 5).map((sede, i) => (
              <div key={i} className="flex items-center justify-between group cursor-default">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    {i + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-tighter">{sede.name}</span>
                </div>
                <span className="text-xs font-black text-indigo-600 italic">{sede.percentage}%</span>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-4 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
            Ver Mapa Completo <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}