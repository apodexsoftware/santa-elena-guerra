"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  TrendingDown, HelpCircle, ArrowDownRight, 
  DollarSign, Calculator, Info, Loader2 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, Legend 
} from "recharts";

export default function AnalisisDescuentosActivo() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<any[]>([]);
  const [precioBaseRef, setPrecioBaseRef] = useState(0);

  useEffect(() => {
    async function cargarAnalisis() {
      setLoading(true);
      try {
        // 1. Obtener evento activo y su configuración de precio base
        const { data: evento } = await supabase
          .from('eventos')
          .select('id, nombre')
          .eq('esta_activo', true)
          .single();

        if (evento) {
          const { data: config } = await supabase
            .from('configuracion_evento')
            .select('precio_global_base')
            .eq('evento_id', evento.id)
            .single();
          
          setPrecioBaseRef(Number(config?.precio_global_base) || 0);

          // 2. Traer roles con sus métricas calculadas (usando tu vista de SQL)
          const { data: roles } = await supabase
            .from('tipos_persona')
            .select('*')
            .eq('evento_id', evento.id);

          setMetricas(roles || []);
        }
      } catch (err) {
        console.error("Error en análisis:", err);
      } finally {
        setLoading(false);
      }
    }
    cargarAnalisis();
  }, [supabase]);

  // Cálculo de totales para el resumen superior
  const totalDescontado = metricas.reduce((acc, curr) => acc + (Number(curr.total_descuento_rol) || 0), 0);
  const totalRecaudado = metricas.reduce((acc, curr) => acc + (Number(curr.total_recaudado_rol) || 0), 0);
  const potencialTotal = totalRecaudado + totalDescontado;
  const porcentajeFuga = potencialTotal > 0 ? (totalDescontado / potencialTotal) * 100 : 0;

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Calculando impacto financiero...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* TARJETAS DE MÉTRICAS CRÍTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <TrendingDown size={20} />
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Descontado</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-black text-slate-900 italic">${totalDescontado.toLocaleString()}</h4>
            <span className="text-rose-500 font-bold text-xs">-{porcentajeFuga.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/10 rounded-xl text-indigo-400">
              <DollarSign size={20} />
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recaudo Neto</span>
          </div>
          <h4 className="text-3xl font-black text-white italic">${totalRecaudado.toLocaleString()}</h4>
        </div>

        <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Calculator size={20} />
            </div>
            <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Precio Base Ref.</span>
          </div>
          <h4 className="text-3xl font-black text-indigo-900 italic">${precioBaseRef.toLocaleString()}</h4>
        </div>
      </div>

      {/* GRÁFICO DE COMPARATIVA: RECAUDO VS DESCUENTO POR ROL */}
      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
            Análisis de Fuga de Ingresos por Perfil
          </h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600" />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Recaudado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Descontado</span>
            </div>
          </div>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metricas} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="nombre" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} 
              />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
              />
              <Bar dataKey="total_recaudado_rol" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={35} />
              <Bar dataKey="total_descuento_rol" stackId="a" fill="#fb7185" radius={[0, 10, 10, 0]} barSize={35} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EXPLICATIVO DE ESTRATEGIA */}
      <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex items-start gap-6">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-indigo-600 shrink-0">
          <Info size={24} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-700 mb-1 uppercase tracking-tight">¿Qué estamos viendo aquí?</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Este gráfico muestra la relación entre el dinero que entra a la cuenta y el dinero que se "sacrifica" para incentivar la participación. 
            Si la barra <span className="text-rose-500 font-bold">rosada</span> es proporcionalmente muy larga frente a la <span className="text-indigo-600 font-bold">azul</span>, 
            significa que el rol tiene un subsidio muy alto. Esto es útil para decidir si el próximo evento debe ajustar los porcentajes de descuento.
          </p>
        </div>
      </div>
    </div>
  );
}