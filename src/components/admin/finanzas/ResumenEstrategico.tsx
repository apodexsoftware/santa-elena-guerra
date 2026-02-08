"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  TrendingUp, Target, Zap, AlertTriangle, 
  ArrowUpRight, PieChart as PieIcon, Activity,
  Calendar, CheckCircle2, Loader2, DollarSign,
  Users, BarChart3, TrendingDown, Clock,
  Shield, Trophy, Rocket, Sparkles,
  TrendingUp as TrendingUpIcon, Download,
  Eye, RefreshCw, Filter, MoreVertical,
  LineChart, Wallet, CreditCard, Building2
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar, LineChart as RechartsLineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AnalisisMetaFinanciera() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [showInsights, setShowInsights] = useState(true);

  useEffect(() => {
    loadFinanzas();
  }, [timeRange]);

  async function loadFinanzas() {
    setLoading(true);
    try {
      const { data: evento } = await supabase
        .from('eventos')
        .select('*')
        .eq('esta_activo', true)
        .single();
      
      if (!evento) {
        toast.error("No hay evento activo");
        return;
      }

      const [config, inscripciones, jurisdicciones] = await Promise.all([
        supabase.from('configuracion_evento').select('*').eq('evento_id', evento.id).single(),
        supabase.from('inscripciones').select('estado, precio_pactado, precio_pagado,monto_pagado, created_at, diocesis').eq('evento_id', evento.id),
        supabase.from('jurisdicciones').select('nombre, precio_base').eq('evento_id', evento.id)
      ]);

      const totalInscritos = inscripciones.data?.length || 0;
      const metaRecaudo = Number(evento.meta_recaudacion) || 50000000;
      
      const aprobado = inscripciones.data?.filter(i => i.estado === 'aprobada') || [];
      const pendiente = inscripciones.data?.filter(i => i.estado === 'pendiente') || [];
      const rechazado = inscripciones.data?.filter(i => i.estado === 'rechazada') || [];
      
      const recaudoReal = aprobado.reduce((acc, curr) => acc + (Number(curr.monto_pagado) || 0), 0);
      const recaudoProyectado = pendiente.reduce((acc, curr) => acc + (Number(curr.precio_pactado) || 0), 0);
      const recaudoPotencial = recaudoReal + recaudoProyectado;
      
      const porcentajeLogrado = metaRecaudo > 0 ? (recaudoReal / metaRecaudo) * 100 : 0;
      const porcentajePotencial = metaRecaudo > 0 ? (recaudoPotencial / metaRecaudo) * 100 : 0;
      
      // Calcular tendencia
      const hoy = new Date();
      const hace30Dias = new Date(hoy.setDate(hoy.getDate() - 30));
      const inscripcionesRecientes = inscripciones.data?.filter(i => 
        new Date(i.created_at) > hace30Dias
      ) || [];
      const tendencia = inscripcionesRecientes.length > 0 ? 
        ((inscripcionesRecientes.length / totalInscritos) * 100).toFixed(1) : 0;

      // Procesar datos por jurisdicción
      const recaudoPorJurisdiccion = jurisdicciones.data?.map(juris => {
        const inscJuris = inscripciones.data?.filter(i => i.diocesis === juris.nombre);
        const recaudado = inscJuris?.filter(i => i.estado === 'aprobada')
          .reduce((acc, curr) => acc + (Number(curr.monto_pagado) || 0), 0) || 0;
        return {
          name: juris.nombre,
          value: recaudado,
          meta: Number(juris.precio_base) * 100 || 1000000, // Meta estimada
          color: getRandomColor()
        };
      }) || [];

      setStats({
        evento,
        metaRecaudo,
        recaudoReal,
        recaudoProyectado,
        recaudoPotencial,
        totalInscritos,
        aprobados: aprobado.length,
        pendientes: pendiente.length,
        rechazados: rechazado.length,
        faltanteMeta: Math.max(0, metaRecaudo - recaudoReal),
        faltantePotencial: Math.max(0, metaRecaudo - recaudoPotencial),
        porcentajeLogrado,
        porcentajePotencial,
        tendencia: parseFloat(tendencia.toString()),
        dataGrafico: procesarDataHistorica(inscripciones.data || []),
        dataJurisdicciones: recaudoPorJurisdiccion.sort((a, b) => b.value - a.value),
        dataDiaria: procesarDataDiaria(inscripciones.data || []),
        ultimaActualizacion: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error cargando finanzas:", error);
      toast.error("Error al cargar datos financieros");
    } finally {
      setLoading(false);
    }
  }

  const procesarDataHistorica = (data: any[]) => {
    const grupos = data.reduce((acc: any, curr) => {
      const fecha = new Date(curr.created_at).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short' 
      });
      if (!acc[fecha]) acc[fecha] = { aprobado: 0, pendiente: 0, total: 0 };
      if (curr.estado === 'aprobada') acc[fecha].aprobado += Number(curr.monto_pagado) || 0;
      if (curr.estado === 'pendiente') acc[fecha].pendiente += Number(curr.precio_pactado) || 0;
      acc[fecha].total = acc[fecha].aprobado + acc[fecha].pendiente;
      return acc;
    }, {});
    
    return Object.keys(grupos).map(k => ({ 
      fecha: k, 
      aprobado: grupos[k].aprobado,
      pendiente: grupos[k].pendiente,
      total: grupos[k].total
    }));
  };

  const procesarDataDiaria = (data: any[]) => {
    const hoy = new Date();
    const diasAtras = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    
    const resultado = [];
    for (let i = diasAtras - 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(hoy.getDate() - i);
      const fechaStr = fecha.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short' 
      });
      
      const diaData = data.filter(item => 
        new Date(item.created_at).toDateString() === fecha.toDateString()
      );
      
      const recaudado = diaData
        .filter(item => item.estado === 'aprobada')
        .reduce((acc, curr) => acc + (Number(curr.monto_pagado) || 0), 0);
      
      const proyectado = diaData
        .filter(item => item.estado === 'pendiente')
        .reduce((acc, curr) => acc + (Number(curr.precio_pactado) || 0), 0);
      
      resultado.push({
        fecha: fechaStr,
        recaudado,
        proyectado,
        total: recaudado + proyectado
      });
    }
    
    return resultado;
  };

  const getRandomColor = () => {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#3b82f6', '#ef4444', '#06b6d4',
      '#84cc16', '#f97316', '#64748b', '#a855f7'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const pieData = useMemo(() => [
    { name: 'Recaudado', value: stats?.recaudoReal, color: '#10b981' },
    { name: 'Pendiente', value: stats?.recaudoProyectado, color: '#f59e0b' },
    { name: 'Meta Restante', value: stats?.faltanteMeta, color: '#ef4444' },
  ], [stats]);

  const kpiCards = [
    {
      title: "Meta Total",
      value: `$${stats?.metaRecaudo?.toLocaleString() || '0'}`,
      change: `${stats?.porcentajeLogrado?.toFixed(1) || '0'}%`,
      trend: 'up',
      icon: Target,
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-gradient-to-br'
    },
    {
      title: "Recaudado Real",
      value: `$${stats?.recaudoReal?.toLocaleString() || '0'}`,
      change: `${stats?.tendencia || '0'}%`,
      trend: stats?.tendencia > 0 ? 'up' : 'down',
      icon: DollarSign,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-gradient-to-br'
    },
    {
      title: "Proyectado",
      value: `$${stats?.recaudoProyectado?.toLocaleString() || '0'}`,
      change: `${stats?.pendientes || '0'} pendientes`,
      trend: 'neutral',
      icon: TrendingUp,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-gradient-to-br'
    },
    {
      title: "Participantes",
      value: stats?.totalInscritos?.toString() || '0',
      change: `${stats?.aprobados || '0'} aprobados`,
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-gradient-to-br'
    }
  ];

  const insights = [
    {
      title: "Ritmo de Recaudo",
      description: `Estás alcanzando ${stats?.porcentajeLogrado?.toFixed(1) || '0'}% de la meta. ${stats?.faltanteMeta > 0 ? `Necesitas $${stats?.faltanteMeta?.toLocaleString()} más para completarla.` : '¡Meta alcanzada!'}`,
      icon: Activity,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: "Capital en Espera",
      description: `Tienes $${stats?.recaudoProyectado?.toLocaleString() || '0'} pendientes de aprobación. Aprobando todos, alcanzarías el ${stats?.porcentajePotencial?.toFixed(1) || '0'}% de la meta.`,
      icon: Clock,
      color: 'bg-amber-100 text-amber-600'
    },
    {
      title: "Eficiencia de Aprobación",
      description: `${stats?.aprobados || '0'} de ${stats?.totalInscritos || '0'} inscripciones están aprobadas (${((stats?.aprobados / stats?.totalInscritos) * 100 || 0).toFixed(1)}% tasa de aprobación).`,
      icon: CheckCircle2,
      color: 'bg-emerald-100 text-emerald-600'
    }
  ];

  if (loading) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 rounded-[3rem] p-12">
      <div className="relative">
        <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-20 animate-pulse" />
        <Loader2 className="absolute inset-0 m-auto text-indigo-600 animate-spin" size={32} />
      </div>
      <p className="mt-6 text-sm font-bold text-slate-700 uppercase tracking-widest">
        Analizando Datos Financieros
      </p>
      <p className="text-xs text-slate-500 mt-2">
        Cargando métricas y visualizaciones en tiempo real
      </p>
    </div>
  );

  if (!stats) return (
    <div className="text-center p-12 bg-gradient-to-br from-rose-50 to-orange-50 rounded-[3rem]">
      <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
      <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-4">
        Datos no Disponibles
      </h3>
      <p className="text-slate-600 mb-8">
        No hay datos financieros disponibles para el evento activo.
      </p>
      <button 
        onClick={loadFinanzas}
        className="bg-gradient-to-r from-slate-900 to-slate-700 text-white px-8 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:shadow-lg transition-all"
      >
        <RefreshCw size={16} className="inline mr-2" />
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-[3rem] p-8 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
                <LineChart size={24} className="text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300">
                  Análisis Financiero en Tiempo Real
                </span>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none mt-2">
                  {stats.evento.nombre}
                </h2>
              </div>
            </div>
            <p className="text-indigo-200 text-sm max-w-2xl">
              Monitoreo avanzado de recaudación, métricas y proyecciones para alcanzar la meta financiera.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {['7d', '30d', '90d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  timeRange === range
                    ? 'bg-white text-slate-900'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {range === '7d' ? '7 días' : 
                 range === '30d' ? '30 días' : 
                 range === '90d' ? '90 días' : 'Todo'}
              </button>
            ))}
            <button
              onClick={loadFinanzas}
              className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-xl transition-all"
              title="Actualizar datos"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${card.bgColor} ${card.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    card.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                    card.trend === 'down' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {card.change}
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-1">{card.value}</h3>
                <p className="text-sm text-slate-600 font-medium">{card.title}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Progress Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase italic">Progreso hacia la Meta</h3>
              <p className="text-sm text-slate-600">Recaudación vs Meta Total</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-slate-900">{stats.porcentajeLogrado.toFixed(1)}%</div>
              <div className="text-xs text-slate-500">Completado</div>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Recaudado', value: stats.recaudoReal },
                { name: 'Pendiente', value: stats.recaudoProyectado },
                { name: 'Meta', value: stats.metaRecaudo }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Monto']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[8, 8, 0, 0]}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#6366f1" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-600">
                ${stats.recaudoReal.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600 font-medium">Recaudado</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-amber-600">
                ${stats.recaudoProyectado.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600 font-medium">Pendiente</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-indigo-600">
                ${stats.metaRecaudo.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600 font-medium">Meta Total</div>
            </div>
          </div>
        </div>

        {/* Daily Trend Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase italic">Tendencia Diaria</h3>
              <p className="text-sm text-slate-600">Flujo de caja por día</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-xs text-slate-600">Recaudado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-xs text-slate-600">Proyectado</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dataDiaria}>
                <defs>
                  <linearGradient id="colorRecaudado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProyectado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="fecha" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Monto']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="recaudado" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fill="url(#colorRecaudado)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="proyectado" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  fill="url(#colorProyectado)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Jurisdictions Performance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase italic">Desempeño por Jurisdicción</h3>
            <p className="text-sm text-slate-600">Recaudación comparativa entre sedes</p>
          </div>
          <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            <Eye size={16} className="inline mr-1" />
            Ver detalles
          </button>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.dataJurisdicciones.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                width={120}
              />
              <Tooltip 
                formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Recaudado']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
              />
              <Bar 
                dataKey="value" 
                radius={[0, 8, 8, 0]}
              >
                {stats.dataJurisdicciones.slice(0, 10).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${insight.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg mb-2">{insight.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{insight.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Action Panel */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-8 text-white">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Rocket size={32} className="text-white" />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase italic mb-2">Plan de Acción Estratégica</h4>
              <p className="text-indigo-100 text-sm">
                Para alcanzar la meta completa, necesitas <span className="font-bold">${stats.faltanteMeta.toLocaleString()}</span> adicionales.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button className="px-6 py-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold text-sm transition-all">
              <a href="/admin/inscripciones" className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                Verificar Pendientes
              </a>
            </button>
            <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2">
              <Download size={16} />
              Exportar Reporte
            </button>
            <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-sm transition-all">
              <a href="/admin/finanzas" className="flex items-center gap-2">
                <BarChart3 size={16} />
                Ver Detalles
              </a>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="bg-slate-50 rounded-2xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-black text-slate-900">{stats.aprobados}</div>
            <div className="text-sm text-slate-600 font-medium">Aprobados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-slate-900">{stats.pendientes}</div>
            <div className="text-sm text-slate-600 font-medium">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-slate-900">{stats.rechazados}</div>
            <div className="text-sm text-slate-600 font-medium">Rechazados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-slate-900">
              {stats.totalInscritos}
            </div>
            <div className="text-sm text-slate-600 font-medium">Total Inscritos</div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
            Última actualización: {new Date(stats.ultimaActualizacion).toLocaleString('es-ES')}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">Sistema sincronizado en tiempo real</span>
          </div>
        </div>
      </div>
    </div>
  );
}