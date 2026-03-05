"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, RadialBarChart, RadialBar
} from "recharts";
import { Users, DollarSign, TrendingUp, Target, Loader2, Sparkles, Activity } from "lucide-react";

export default function ResumenRolesActivo() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Llamamos a la función RPC que creamos en SQL para máxima eficiencia
      const { data: metrics, error } = await supabase.rpc('get_metricas_roles_evento_activo');
      
      if (!error) setData(metrics);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalGeneral = useMemo(() => 
    data.reduce((acc, curr) => acc + Number(curr.total_recaudado), 0), 
  [data]);

  if (loading) return <SkeletonLoader />;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
      
      {/* KPI SECTION - ESTILO NEUMÓRFICO SUTIL */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-200 text-white relative overflow-hidden">
            <Sparkles className="absolute -right-4 -top-4 opacity-20 w-32 h-32 rotate-12" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-80">Recaudación por Roles</p>
            <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black italic tracking-tighter">${totalGeneral.toLocaleString()}</span>
                <span className="text-indigo-200 font-bold text-sm">COP</span>
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100 flex items-center gap-6 min-w-[300px]">
            <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600">
                <Target size={32} />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Participantes</p>
                <h4 className="text-4xl font-black text-slate-900 italic">
                    {data.reduce((acc, curr) => acc + Number(curr.cantidad_inscritos), 0)}
                </h4>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* GRÁFICO PRINCIPAL: BARRAS CON GRADIENTES */}
        <div className="lg:col-span-7 bg-white p-10 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" /> Rendimiento de Inscripción
            </h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="nombre" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} 
                    dy={10}
                />
                <YAxis hide />
                <Tooltip 
                    cursor={{fill: '#f8fafc', radius: 15}} 
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}
                />
                <Bar dataKey="cantidad_inscritos" radius={[15, 15, 15, 15]} barSize={60}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO CIRCULAR: RECAUDO RELATIVO */}
        <div className="lg:col-span-5 bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-[11px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-10">Market Share Ingresos</h3>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={data}
                    dataKey="total_recaudado"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    stroke="none"
                    >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                        verticalAlign="bottom" 
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', color: '#fff' }}
                    />
                </PieChart>
                </ResponsiveContainer>
            </div>
          </div>
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
        </div>

      </div>
    </div>
  );
}

function SkeletonLoader() {
    return (
        <div className="space-y-10 animate-pulse">
            <div className="h-32 bg-slate-200 rounded-[2.5rem]" />
            <div className="grid grid-cols-2 gap-10">
                <div className="h-96 bg-slate-100 rounded-[3.5rem]" />
                <div className="h-96 bg-slate-100 rounded-[3.5rem]" />
            </div>
        </div>
    );
}