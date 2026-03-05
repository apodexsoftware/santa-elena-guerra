"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  Users, Clock, CheckCircle2, AlertCircle, 
  Target, TrendingUp, ShieldCheck, ArrowRight, 
  Loader2, Download, Calendar, DollarSign,
  BarChart3, PieChart, Activity, Zap,
  FileText, Filter, Search, ChevronRight,
  RefreshCw, Award, TrendingDown, Percent,
  Building, MapPin, UserCheck, AlertTriangle
} from "lucide-react";
import {
  PieChart as RechartPieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line,
  AreaChart, Area
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

// Tipos TypeScript
interface Inscripcion {
  id: string;
  estado: string;
  monto_pagado: number;
  precio_pactado: number;
  created_at: string;
  diocesis: string;
  segmentacion: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface EventoActivo {
  id: string;
  nombre: string;
  fecha_inicio: string;
  meta_recaudacion?: number;
  ubicacion?: string;
}

interface Estadisticas {
  total: number;
  aprobados: number;
  pendientes: number;
  rechazados: number;
  efectividad: number;
  recaudoReal: number;
  recaudoPendiente: number;
  recaudoProyectado: number;
  porcentajeMeta: number;
  ticketPromedio: number;
  crecimientoSemanal: number;
  porDiocesis: Array<{ nombre: string; count: number; porcentaje: number }>;
  porSegmentacion: Array<{ nombre: string; count: number }>;
  evolucionDiaria: Array<{ fecha: string; inscritos: number; recaudo: number }>;
  ultimasInscripciones: Inscripcion[];
}

export default function ResumenInscripcionesActivo() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [eventoActivo, setEventoActivo] = useState<EventoActivo | null>(null);
  const [exporting, setExporting] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDatosEventoActivo();
  }, []);

  const fetchDatosEventoActivo = async () => {
    setLoading(true);
    try {
      // Buscar evento activo con más información
      const { data: evento } = await supabase
        .from('eventos')
        .select('id, nombre, fecha_inicio, meta_recaudacion, ubicacion')
        .eq('esta_activo', true)
        .single();

      if (evento) {
        setEventoActivo(evento);
        
        // Traer inscripciones con más campos
        const { data: ins } = await supabase
          .from('inscripciones')
          .select('id, estado, monto_pagado, precio_pactado, created_at, diocesis, segmentacion, nombre, apellido, email')
          .eq('evento_id', evento.id)
          .order('created_at', { ascending: false });
        
        setInscripciones(ins || []);
      }
    } catch (err) {
      console.error("Error en resumen activo:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de estadísticas
  const estadisticas = useMemo<Estadisticas>(() => {
    const total = inscripciones.length;
    const aprobados = inscripciones.filter(i => i.estado === 'aprobada').length;
    const pendientes = inscripciones.filter(i => i.estado === 'pendiente').length;
    const rechazados = inscripciones.filter(i => i.estado === 'rechazada').length;
    const efectividad = total > 0 ? (aprobados / total) * 100 : 0;

    // Cálculos financieros
    const recaudoReal = inscripciones
      .filter(i => i.estado === 'aprobada')
      .reduce((acc, curr) => acc + (curr.monto_pagado || 0), 0);
    
    const recaudoPendiente = inscripciones
      .filter(i => i.estado === 'pendiente')
      .reduce((acc, curr) => acc + (curr.precio_pactado || 0), 0);
    
    const recaudoProyectado = inscripciones
      .reduce((acc, curr) => acc + (curr.precio_pactado || 0), 0);
    
    const ticketPromedio = aprobados > 0 ? recaudoReal / aprobados : 0;
    
    const porcentajeMeta = eventoActivo?.meta_recaudacion 
      ? Math.min((recaudoReal / eventoActivo.meta_recaudacion) * 100, 100)
      : 0;

    // Agrupar por diócesis
    const diocesisMap = inscripciones.reduce((acc: Record<string, number>, curr) => {
      const diocesis = curr.diocesis || 'Sin asignar';
      acc[diocesis] = (acc[diocesis] || 0) + 1;
      return acc;
    }, {});

    const porDiocesis = Object.entries(diocesisMap)
      .map(([nombre, count]) => ({
        nombre,
        count,
        porcentaje: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Agrupar por segmentación
    const segmentacionMap = inscripciones.reduce((acc: Record<string, number>, curr) => {
      const segmento = curr.segmentacion || 'Sin segmento';
      acc[segmento] = (acc[segmento] || 0) + 1;
      return acc;
    }, {});

    const porSegmentacion = Object.entries(segmentacionMap)
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count);

    // Evolución diaria (últimos 30 días)
    const hoy = new Date();
    const limite = subDays(hoy, 30);
    
    const evolucionDiaria: Record<string, { inscritos: number; recaudo: number }> = {};
    
    inscripciones.forEach(ins => {
      const fechaIns = new Date(ins.created_at);
      if (fechaIns >= limite) {
        const fechaKey = format(fechaIns, 'yyyy-MM-dd');
        if (!evolucionDiaria[fechaKey]) {
          evolucionDiaria[fechaKey] = { inscritos: 0, recaudo: 0 };
        }
        evolucionDiaria[fechaKey].inscritos += 1;
        if (ins.estado === 'aprobada') {
          evolucionDiaria[fechaKey].recaudo += ins.monto_pagado || 0;
        }
      }
    });

    const evolucionArray = Object.entries(evolucionDiaria)
      .map(([fecha, datos]) => ({
        fecha: format(new Date(fecha), 'dd/MM'),
        inscritos: datos.inscritos,
        recaudo: datos.recaudo
      }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Calcular crecimiento semanal
    const ultimaSemana = evolucionArray.slice(-7).reduce((acc, curr) => acc + curr.inscritos, 0);
    const semanaAnterior = evolucionArray.slice(-14, -7).reduce((acc, curr) => acc + curr.inscritos, 0);
    const crecimientoSemanal = semanaAnterior > 0 
      ? ((ultimaSemana - semanaAnterior) / semanaAnterior) * 100 
      : ultimaSemana > 0 ? 100 : 0;

    // Últimas inscripciones
    const ultimasInscripciones = inscripciones.slice(0, 5);

    return {
      total,
      aprobados,
      pendientes,
      rechazados,
      efectividad,
      recaudoReal,
      recaudoPendiente,
      recaudoProyectado,
      porcentajeMeta,
      ticketPromedio,
      crecimientoSemanal,
      porDiocesis,
      porSegmentacion,
      evolucionDiaria: evolucionArray,
      ultimasInscripciones
    };
  }, [inscripciones, eventoActivo]);

  // Datos para gráficos
  const datosEstados = [
    { name: 'Aprobados', value: estadisticas.aprobados, color: '#10b981' },
    { name: 'Pendientes', value: estadisticas.pendientes, color: '#f59e0b' },
    { name: 'Rechazados', value: estadisticas.rechazados, color: '#ef4444' },
  ];

  const datosSegmentacion = estadisticas.porSegmentacion.map((item, index) => ({
    name: item.nombre,
    value: item.count,
    color: ['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]
  }));

  // Generar PDF
  const generarPDF = async () => {
    if (!reportRef.current || exporting) return;
    
    setExporting(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Título
      pdf.setFontSize(20);
      pdf.text("Resumen de Inscripciones", pdfWidth / 2, 15, { align: "center" });
      pdf.setFontSize(12);
      pdf.text(eventoActivo?.nombre || "Evento Activo", pdfWidth / 2, 22, { align: "center" });
      pdf.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pdfWidth / 2, 29, { align: "center" });
      
      // Dashboard principal
      pdf.addImage(imgData, "PNG", 10, 40, pdfWidth - 20, pdfHeight * (pdfWidth - 20) / pdfWidth);
      
      // Página adicional con detalles
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text("Detalles Estadísticos", 20, 20);
      
      const detalles = [
        `Total Inscritos: ${estadisticas.total}`,
        `Aprobados: ${estadisticas.aprobados} (${estadisticas.efectividad.toFixed(1)}%)`,
        `Pendientes: ${estadisticas.pendientes}`,
        `Rechazados: ${estadisticas.rechazados}`,
        `Recaudo Real: $${estadisticas.recaudoReal.toLocaleString()}`,
        `Recaudo Pendiente: $${estadisticas.recaudoPendiente.toLocaleString()}`,
        `Recaudo Proyectado: $${estadisticas.recaudoProyectado.toLocaleString()}`,
        `Ticket Promedio: $${estadisticas.ticketPromedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        `Meta Alcanzada: ${estadisticas.porcentajeMeta.toFixed(1)}%`,
        `Crecimiento Semanal: ${estadisticas.crecimientoSemanal.toFixed(1)}%`
      ];
      
      detalles.forEach((line, index) => {
        pdf.text(line, 20, 40 + (index * 10));
      });
      
      // Top diócesis
      pdf.setFontSize(14);
      pdf.text("Top Diócesis:", 20, 150);
      
      estadisticas.porDiocesis.forEach((diocesis, index) => {
        pdf.text(`${index + 1}. ${diocesis.nombre}: ${diocesis.count} inscritos (${diocesis.porcentaje.toFixed(1)}%)`, 
          20, 160 + (index * 10));
      });
      
      pdf.save(`Resumen-Inscripciones-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar el PDF. Por favor, intente nuevamente.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="relative">
          <Loader2 className="animate-spin text-indigo-600" size={64} />
          <div className="absolute inset-0 animate-ping bg-indigo-600/20 rounded-full"></div>
        </div>
        <p className="mt-6 text-lg font-semibold text-slate-700">Sincronizando con el evento activo...</p>
        <p className="text-sm text-slate-500 mt-2">Cargando datos en tiempo real</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER PRINCIPAL */}
        <div ref={reportRef} className="space-y-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-3xl shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 rounded-2xl">
                  <Activity className="text-indigo-600" size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      En Vivo
                    </span>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-100"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-200"></div>
                    </div>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
                    Resumen de Inscripciones
                  </h1>
                  <p className="text-slate-500 flex items-center gap-2">
                    <Calendar size={14} />
                    {eventoActivo?.nombre || "Sin evento activo"}
                    {eventoActivo?.fecha_inicio && (
                      <>
                        <span className="mx-2">•</span>
                        <Calendar size={14} />
                        Inicia: {format(new Date(eventoActivo.fecha_inicio), "dd 'de' MMMM", { locale: es })}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={fetchDatosEventoActivo}
                className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Actualizar
              </button>
              
              <button 
                onClick={generarPDF}
                disabled={exporting}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Download size={18} />
                )}
                {exporting ? "Generando..." : "Exportar PDF"}
              </button>
            </div>
          </div>

          {/* KPI PRINCIPALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">Total Inscritos</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{estadisticas.total}</p>
                </div>
                <Users className="text-indigo-600" size={32} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${(estadisticas.aprobados / Math.max(estadisticas.total, 1)) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700">{estadisticas.aprobados}</span>
              </div>
              <p className="text-sm text-slate-500 mt-4">Aprobados</p>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">Recaudo Real</p>
                  <p className="text-3xl font-black text-emerald-600 mt-2">
                    ${estadisticas.recaudoReal.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="text-emerald-600" size={32} />
              </div>
              <div className="mt-4">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${estadisticas.porcentajeMeta}%` }}
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {estadisticas.porcentajeMeta.toFixed(1)}% de la meta
                </p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">Efectividad</p>
                  <p className="text-3xl font-black text-amber-600 mt-2">
                    {estadisticas.efectividad.toFixed(1)}%
                  </p>
                </div>
                <Target className="text-amber-600" size={32} />
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${estadisticas.crecimientoSemanal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {estadisticas.crecimientoSemanal >= 0 ? '+' : ''}{estadisticas.crecimientoSemanal.toFixed(1)}%
                  </span>
                  <span className="text-sm text-slate-500">vs. semana anterior</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">Tasa de conversión</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">Ticket Promedio</p>
                  <p className="text-3xl font-black text-purple-600 mt-2">
                    ${estadisticas.ticketPromedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <Award className="text-purple-600" size={32} />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Proyectado:</span>
                  <span className="font-bold text-slate-900">
                    ${estadisticas.recaudoProyectado.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-slate-500">Pendiente:</span>
                  <span className="font-bold text-amber-600">
                    ${estadisticas.recaudoPendiente.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICOS PRINCIPALES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de Evolución */}
            <div className="bg-white p-8 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Evolución Diaria</h3>
                  <p className="text-slate-500 text-sm">Últimos 30 días</p>
                </div>
                <BarChart3 className="text-indigo-600" size={24} />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={estadisticas.evolucionDiaria}>
                    <defs>
                      <linearGradient id="colorInscritos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="fecha" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'recaudo') return [`$${Number(value).toLocaleString()}`, 'Recaudo'];
                        return [value, 'Inscritos'];
                      }}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="inscritos" 
                      stroke="#4f46e5" 
                      strokeWidth={2}
                      fill="url(#colorInscritos)"
                      name="Inscritos"
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="recaudo" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                      name="Recaudo"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico de Estados */}
            <div className="bg-white p-8 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Distribución por Estado</h3>
                  <p className="text-slate-500 text-sm">Estado de las inscripciones</p>
                </div>
                <PieChart className="text-indigo-600" size={24} />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartPieChart>
                    <Pie
                      data={datosEstados}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {datosEstados.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Inscritos']} />
                    <Legend />
                  </RechartPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* SECCIÓN INFERIOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Diócesis */}
            <div className="bg-white p-8 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Top Diócesis</h3>
                  <p className="text-slate-500 text-sm">Mayor participación</p>
                </div>
                <Building className="text-indigo-600" size={24} />
              </div>
              <div className="space-y-4">
                {estadisticas.porDiocesis.map((diocesis, index) => (
                  <div key={diocesis.nombre} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center font-bold text-indigo-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{diocesis.nombre}</p>
                        <p className="text-sm text-slate-500">{diocesis.count} inscritos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${diocesis.porcentaje}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{diocesis.porcentaje.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Segmentación */}
            <div className="bg-white p-8 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Segmentación</h3>
                  <p className="text-slate-500 text-sm">Distribución por perfil</p>
                </div>
                <UserCheck className="text-indigo-600" size={24} />
              </div>
              <div className="space-y-4">
                {datosSegmentacion.slice(0, 5).map((segmento, index) => (
                  <div key={segmento.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: segmento.color }}
                      />
                      <p className="font-medium text-slate-900">{segmento.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-900">{segmento.value}</span>
                      <span className="text-sm text-slate-500">
                        {((segmento.value / estadisticas.total) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {datosSegmentacion.length > 5 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <button className="w-full py-3 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">
                    Ver todos ({datosSegmentacion.length} segmentos)
                  </button>
                </div>
              )}
            </div>

            {/* Últimas Inscripciones */}
            <div className="bg-white p-8 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Últimas Inscripciones</h3>
                  <p className="text-slate-500 text-sm">Registros recientes</p>
                </div>
                <Clock className="text-indigo-600" size={24} />
              </div>
              <div className="space-y-4">
                {estadisticas.ultimasInscripciones.map((inscripcion) => (
                  <div key={inscripcion.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center font-bold text-indigo-600">
                        {inscripcion.nombre[0]}{inscripcion.apellido[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{inscripcion.nombre} {inscripcion.apellido}</p>
                        <p className="text-sm text-slate-500 truncate max-w-[120px]">{inscripcion.email}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      inscripcion.estado === 'aprobada'
                        ? 'bg-emerald-100 text-emerald-700'
                        : inscripcion.estado === 'pendiente'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {inscripcion.estado}
                    </span>
                  </div>
                ))}
              </div>
              {inscripciones.length > 5 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <button className="w-full py-3 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                    Ver todas las inscripciones ({inscripciones.length})
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}