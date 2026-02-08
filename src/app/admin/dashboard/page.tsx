"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/clients";
import { useRouter } from "next/navigation";
import AdminNavbar from "@/components/AdminNavbar";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Scatter, ScatterChart, ZAxis, ComposedChart
} from "recharts";
import { 
  TrendingUp, Users, Home, AlertCircle, Filter, 
  Database, FlaskConical, RefreshCcw, Sparkles, Trash2, 
  Zap, Loader2, CheckCircle2, Download, Settings,
  BarChart3, Target, DollarSign, Calendar, Clock,
  Building, Shield, Activity, Cpu, Server,
  Eye, FileText, Printer, DatabaseBackup, Network,
  TrendingDown, Percent, ArrowUpRight, ArrowDownRight,
  ChevronRight, ChevronLeft, Maximize2, Minimize2,
  Bell, MessageSquare, Award, Crown, PieChart,
  UserCheck, CreditCard, MapPin, FilterIcon,
  BarChart as BarChartIcon, PieChart as PieChartIcon,
  TrendingUp as TrendingUpIcon, Users as UsersIcon,
  Layers, Globe, Target as TargetIcon,
  CheckCircle, XCircle, Clock as ClockIcon,
  Mail, Phone, Map, Grid, Star,
  ChartBar, ChartPie, ChartLine, ChartArea
} from "lucide-react";
import { format, parseISO, getMonth, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#ef4444'];

export default function AdminDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [dbData, setDbData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Filtros mejorados
  const [selDiocesis, setSelDiocesis] = useState("all");
  const [selEstado, setSelEstado] = useState("all");
  const [selSegmentacion, setSelSegmentacion] = useState("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inscripciones")
        .select("*")
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDbData(data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateGhostData = async () => {
    if (!confirm("¿Desea generar datos de prueba? Esto creará 250 registros de prueba.")) return;
    
    setIsProcessing(true);
    const timestamp = Date.now();
    const ghostName = `🧪 LAB-${format(new Date(), 'HH:mm')}`;

    try {
      // Crear evento
      const { data: evento, error: evError } = await supabase
        .from('eventos')
        .insert([{ 
          nombre: ghostName, 
          slug: `lab-${timestamp}`,
          esta_activo: false,
          meta_recaudacion: 15000000,
          ubicacion: "Sede Virtual de Pruebas",
          descripcion: "Laboratorio de pruebas generado automáticamente"
        }])
        .select().single();

      if (evError) throw evError;

      // Generar inscripciones de prueba directas
      const nombres = ["Carlos", "María", "José", "Ana", "Luis", "Laura", "Pedro", "Sofía", "Miguel", "Elena"];
      const apellidos = ["García", "Rodríguez", "Martínez", "López", "Sánchez", "Pérez", "González", "Fernández", "Ramírez", "Torres"];
      const diócesis = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Pereira", "Manizales"];
      const roles = ["Laico", "Sacerdote", "Seminarista", "Religioso", "Obispo"];

      const ghostInscriptions = Array.from({ length: 250 }).map((_, idx) => {
        const daysAgo = Math.floor(Math.random() * 90);
        const randomDate = subDays(new Date(), daysAgo);
        const randomDiocesis = diócesis[Math.floor(Math.random() * diócesis.length)];
        const randomRole = roles[Math.floor(Math.random() * roles.length)];
        
        const precioBase = 80000 + Math.floor(Math.random() * 40000);
        const descuento = randomRole === "Sacerdote" ? 0.2 : 
                         randomRole === "Seminarista" ? 0.5 : 
                         randomRole === "Obispo" ? 1 : 0;
        const final = Math.round(precioBase - (precioBase * descuento));
        
        const estados = ['aprobada', 'pendiente', 'rechazada'];
        const peso = Math.random();
        const estado = peso > 0.7 ? 'aprobada' : peso > 0.4 ? 'pendiente' : 'rechazada';
        const montoPagado = estado === 'aprobada' ? final : estado === 'pendiente' ? Math.round(final * 0.5) : 0;

        return {
          evento_id: evento.id,
          nombre: nombres[Math.floor(Math.random() * nombres.length)],
          apellido: apellidos[Math.floor(Math.random() * apellidos.length)],
          email: `test${idx}@test.com`,
          documento: `1${Math.floor(Math.random() * 900000000)}`,
          diocesis: randomDiocesis,
          segmentacion: randomRole,
          precio_pactado: final,
          monto_pagado: montoPagado,
          estado: estado,
          hospedaje: Math.random() > 0.6 ? 'si' : 'no',
          created_at: randomDate.toISOString(),
          telefono: `3${Math.floor(Math.random() * 9000000)}`
        };
      });

      const { error: insError } = await supabase.from('inscripciones').insert(ghostInscriptions);

      if (insError) throw insError;

      alert(`✅ Laboratorio creado exitosamente con 250 inscripciones`);
      await loadData();

    } catch (err: any) {
      console.error("Error en el Laboratorio:", err);
      alert(`Error: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurgeGhostData = async () => {
    if (!confirm("⚠️ ¿Eliminar TODOS los datos de prueba de la base de datos?\nEsta acción no se puede deshacer.")) return;
    setIsProcessing(true);
    try {
      // Primero obtener todos los eventos LAB
      const { data: eventos, error: fetchError } = await supabase
        .from('eventos')
        .select('id')
        .ilike('nombre', '%LAB-%');

      if (fetchError) throw fetchError;

      // Eliminar inscripciones relacionadas
      if (eventos && eventos.length > 0) {
        const eventoIds = eventos.map(e => e.id);
        await supabase
          .from('inscripciones')
          .delete()
          .in('evento_id', eventoIds);
      }

      // Eliminar eventos
      const { error } = await supabase
        .from('eventos')
        .delete()
        .ilike('nombre', '%LAB-%');

      if (error) throw error;
      
      await loadData();
      alert("✅ Datos de prueba eliminados correctamente");
    } catch (err) {
      alert("❌ Error al purgar datos");
    } finally {
      setIsProcessing(false);
    }
  };

  const generarPDF = async () => {
    if (!reportRef.current || exporting) return;
    
    setExporting(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#0f172a"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      
      pdf.setFontSize(24);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Reporte Dashboard", pdfWidth / 2, 20, { align: "center" });
      
      pdf.setFontSize(12);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pdfWidth / 2, 30, { align: "center" });
      pdf.text(`Total registros: ${dbData.length}`, pdfWidth / 2, 37, { align: "center" });
      
      pdf.addImage(imgData, "PNG", 10, 45, pdfWidth - 20, pdfHeight * (pdfWidth - 20) / pdfWidth);
      
      pdf.save(`Dashboard-Reporte-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setExporting(false);
    }
  };

  const filteredData = useMemo(() => {
    let filtered = dbData;
    
    // Filtrar por rango de tiempo
    if (timeRange !== "all") {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const cutoffDate = subDays(new Date(), days);
      filtered = filtered.filter(item => new Date(item.created_at) >= cutoffDate);
    }
    
    // Filtrar por diócesis
    if (selDiocesis !== "all") {
      filtered = filtered.filter(item => item.diocesis === selDiocesis);
    }
    
    // Filtrar por estado
    if (selEstado !== "all") {
      filtered = filtered.filter(item => item.estado === selEstado);
    }
    
    // Filtrar por segmentación
    if (selSegmentacion !== "all") {
      filtered = filtered.filter(item => item.segmentacion === selSegmentacion);
    }
    
    return filtered;
  }, [dbData, timeRange, selDiocesis, selEstado, selSegmentacion]);

  const stats = useMemo(() => {
    const aprobadas = filteredData.filter(i => i.estado === 'aprobada');
    const pendientes = filteredData.filter(i => i.estado === 'pendiente');
    const rechazadas = filteredData.filter(i => i.estado === 'rechazada');
    
    const totalRecaudado = aprobadas.reduce((acc, curr) => acc + Number(curr.monto_pagado || 0), 0);
    const recaudoPendiente = pendientes.reduce((acc, curr) => acc + Number(curr.precio_pactado || 0), 0);
    const ticketPromedio = aprobadas.length > 0 ? totalRecaudado / aprobadas.length : 0;
    
    const diocesisActivas = [...new Set(filteredData.map(i => i.diocesis).filter(Boolean))].length;
    const rolesRegistrados = [...new Set(filteredData.map(i => i.segmentacion).filter(Boolean))].length;
    
    const tasaAprobacion = filteredData.length > 0 ? (aprobadas.length / filteredData.length) * 100 : 0;
    
    // Calcular crecimiento semanal
    const hoy = new Date();
    const ultimaSemana = filteredData.filter(item => 
      new Date(item.created_at) >= subDays(hoy, 7)
    ).length;
    
    const semanaAnterior = filteredData.filter(item => {
      const fecha = new Date(item.created_at);
      return fecha >= subDays(hoy, 14) && fecha < subDays(hoy, 7);
    }).length;
    
    const crecimiento = semanaAnterior > 0 
      ? ((ultimaSemana - semanaAnterior) / semanaAnterior) * 100 
      : ultimaSemana > 0 ? 100 : 0;

    // Datos para gráficos - Asegurar que siempre haya datos
    const trendData = Array.from({ length: 15 }).map((_, i) => {
      const date = subDays(new Date(), 14 - i);
      const dayStr = format(date, 'dd MMM', { locale: es });
      
      const dayData = filteredData.filter(item => 
        format(new Date(item.created_at), 'dd MMM', { locale: es }) === dayStr
      );
      
      return {
        date: dayStr,
        cantidad: dayData.length,
        recaudo: dayData.reduce((sum, item) => sum + Number(item.monto_pagado || 0), 0),
        aprobadas: dayData.filter(d => d.estado === 'aprobada').length,
        pendientes: dayData.filter(d => d.estado === 'pendiente').length,
      };
    });

    // Datos para diócesis
    const dioData = filteredData.reduce((acc: Record<string, number>, item) => {
      const diocesis = item.diocesis || 'Sin asignar';
      acc[diocesis] = (acc[diocesis] || 0) + 1;
      return acc;
    }, {});
    
    const dioChartData = Object.entries(dioData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Si no hay datos, mostrar placeholder
    if (dioChartData.length === 0) {
      dioChartData.push({ name: 'Sin datos', value: 1 });
    }

    // Datos para roles
    const roleData = filteredData.reduce((acc: Record<string, number>, item) => {
      const role = item.segmentacion || 'Sin rol';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    
    const roleChartData = Object.entries(roleData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (roleChartData.length === 0) {
      roleChartData.push({ name: 'Sin datos', value: 1 });
    }

    // Datos para estados
    const estadoData = [
      { name: 'Aprobadas', value: aprobadas.length, color: '#10b981' },
      { name: 'Pendientes', value: pendientes.length, color: '#f59e0b' },
      { name: 'Rechazadas', value: rechazadas.length, color: '#ef4444' },
    ];

    // Datos para gráfico de radar (rendimiento por diócesis)
    const topDiocesis = Object.entries(dioData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({
        subject: name.substring(0, 10) + (name.length > 10 ? '...' : ''),
        A: value,
        fullMark: Math.max(...Object.values(dioData))
      }));

    return { 
      totalRecaudado, 
      recaudoPendiente,
      ticketPromedio,
      aprobadas: aprobadas.length, 
      pendientes: pendientes.length,
      rechazadas: rechazadas.length,
      hospedajes: aprobadas.filter(i => i.hospedaje === 'si').length,
      diocesisActivas,
      rolesRegistrados,
      tasaAprobacion,
      crecimiento,
      trendData,
      dioChartData,
      roleChartData,
      estadoData,
      topDiocesis,
      totalInscritos: filteredData.length
    };
  }, [filteredData]);

  const diocesisList = useMemo(() => {
    return [...new Set(dbData.map(i => i.diocesis).filter(Boolean))].sort();
  }, [dbData]);

  const segmentacionList = useMemo(() => {
    return [...new Set(dbData.map(i => i.segmentacion).filter(Boolean))].sort();
  }, [dbData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="w-32 h-32 bg-gradient-to-br from-violet-600 to-cyan-500 rounded-full flex items-center justify-center shadow-2xl shadow-violet-500/30">
            <Loader2 className="animate-spin text-white" size={48} />
          </div>
          <div className="absolute inset-0 animate-ping bg-violet-600/20 rounded-full"></div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-2xl font-black text-white"
        >
          Cargando Dashboard
        </motion.p>
        <p className="text-slate-300 mt-2">Preparando análisis de datos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" ref={reportRef}>
      <AdminNavbar />
      
      {/* Partículas de fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header principal */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <Activity className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-white mb-1">
                    Panel de Control
                  </h1>
                  <p className="text-slate-400 flex items-center gap-2">
                    <Database size={14} />
                    {dbData.length} registros totales • Actualizado ahora
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadData}
                className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCcw size={18} />
                Actualizar
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generarPDF}
                disabled={exporting}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-violet-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Download size={18} />
                )}
                {exporting ? "Generando..." : "Exportar PDF"}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Barra de pestañas y filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div className="flex flex-wrap gap-3">
              {[
                { id: "overview", label: "Resumen", icon: <ChartBar size={16} /> },
                { id: "analytics", label: "Análisis", icon: <ChartPie size={16} /> },
                { id: "performance", label: "Rendimiento", icon: <TargetIcon size={16} /> },
                { id: "tools", label: "Herramientas", icon: <FlaskConical size={16} /> }
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/30' 
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </motion.button>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  className="pl-10 pr-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent w-full"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                >
                  <option value="7d">Últimos 7 días</option>
                  <option value="30d">Últimos 30 días</option>
                  <option value="90d">Últimos 90 días</option>
                  <option value="all">Todo el tiempo</option>
                </select>
              </div>
              
              <select 
                className="px-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                value={selDiocesis}
                onChange={(e) => setSelDiocesis(e.target.value)}
              >
                <option value="all">Todas las diócesis</option>
                {diocesisList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              
              <select 
                className="px-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                value={selEstado}
                onChange={(e) => setSelEstado(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="aprobada">Aprobadas</option>
                <option value="pendiente">Pendientes</option>
                <option value="rechazada">Rechazadas</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full animate-pulse"></div>
              <div>
                <p className="text-sm font-bold text-slate-400">Filtros aplicados</p>
                <p className="font-bold text-white">
                  {timeRange !== "all" ? timeRange : "Todo"} • {selDiocesis === "all" ? "Todas" : "1"} diócesis
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <div>
                <p className="text-sm font-bold text-slate-400">Resultados</p>
                <p className="font-bold text-white">{filteredData.length} registros</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <div>
                <p className="text-sm font-bold text-slate-400">Tasa éxito</p>
                <p className="font-bold text-white">{stats.tasaAprobacion.toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <div>
                <p className="text-sm font-bold text-slate-400">Crecimiento</p>
                <p className={`font-bold ${stats.crecimiento >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stats.crecimiento >= 0 ? '+' : ''}{stats.crecimiento.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tarjetas de métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-xl bg-gradient-to-br from-violet-600/20 to-cyan-500/20 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Recaudación Total</p>
                <p className="text-2xl md:text-3xl font-black text-white mt-2">
                  ${stats.totalRecaudado.toLocaleString('es-CO')}
                </p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                <DollarSign className="text-white" size={24} />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Pendiente</span>
                <span className="font-bold text-amber-400">${stats.recaudoPendiente.toLocaleString('es-CO')}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
                  style={{ width: `${Math.min(100, (stats.recaudoPendiente / (stats.totalRecaudado + stats.recaudoPendiente)) * 100)}%` }}
                ></div>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Inscripciones</p>
                <p className="text-2xl md:text-3xl font-black text-white mt-2">{stats.totalInscritos}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                <Users className="text-white" size={24} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                <div className="text-lg font-bold text-emerald-400">{stats.aprobadas}</div>
                <div className="text-xs text-slate-400">Aprobadas</div>
              </div>
              <div className="text-center p-2 bg-amber-500/10 rounded-lg">
                <div className="text-lg font-bold text-amber-400">{stats.pendientes}</div>
                <div className="text-xs text-slate-400">Pendientes</div>
              </div>
              <div className="text-center p-2 bg-rose-500/10 rounded-lg">
                <div className="text-lg font-bold text-rose-400">{stats.rechazadas}</div>
                <div className="text-xs text-slate-400">Rechazadas</div>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Ticket Promedio</p>
                <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-2">
                  ${stats.ticketPromedio.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                <TrendingUp className="text-emerald-400" size={24} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                    style={{ width: `${Math.min(100, (stats.ticketPromedio / 200000) * 100)}%` }}
                  ></div>
                </div>
                <span className="text-slate-400 whitespace-nowrap">vs. meta</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Distribución</p>
                <p className="text-2xl md:text-3xl font-black text-purple-400 mt-2">
                  {stats.diocesisActivas} <span className="text-slate-400">/</span> {stats.rolesRegistrados}
                </p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                <Network className="text-purple-400" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <MapPin size={14} className="text-slate-400" />
              <span className="text-slate-400">{stats.diocesisActivas} diócesis activas</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <UserCheck size={14} className="text-slate-400" />
              <span className="text-slate-400">{stats.rolesRegistrados} roles registrados</span>
            </div>
          </motion.div>
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gráfico de tendencia */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ChartLine size={20} />
                  Tendencia Temporal
                </h3>
                <p className="text-slate-400 text-sm">Inscripciones y recaudo por día</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Maximize2 size={16} className="text-slate-400" />
                </button>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#ffffff60" 
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#ffffff60" 
                    fontSize={12}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: '#ffffff20', 
                      color: 'white',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name) => {
                      if (name === 'recaudo') return [`$${Number(value).toLocaleString()}`, 'Recaudo'];
                      return [value, name === 'cantidad' ? 'Inscritos' : name];
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="cantidad" 
                    fill="#8b5cf6" 
                    name="Inscritos"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="recaudo" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Recaudo"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Distribución por estado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ChartPie size={20} />
                  Distribución por Estado
                </h3>
                <p className="text-slate-400 text-sm">Estado de las inscripciones</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.estadoData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.estadoData.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: '#ffffff20', 
                      color: 'white',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend 
                    formatter={(value, entry) => (
                      <span className="text-slate-300">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Gráficos secundarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top diócesis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building size={20} />
                  Top Diócesis
                </h3>
                <p className="text-slate-400 text-sm">Por cantidad de inscritos</p>
              </div>
              <div className="text-sm text-slate-400">
                Total: {stats.diocesisActivas}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={stats.dioChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    stroke="#ffffff60"
                    fontSize={12}
                    interval={0}
                  />
                  <YAxis 
                    stroke="#ffffff60"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: '#ffffff20', 
                      color: 'white',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [value, 'Inscritos']}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  >
                    {stats.dioChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#colorGradient${index})`}
                      />
                    ))}
                  </Bar>
                  <defs>
                    {stats.dioChartData.map((_, index) => (
                      <linearGradient
                        key={`gradient-${index}`}
                        id={`colorGradient${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      </linearGradient>
                    ))}
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Distribución por rol */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Crown size={20} />
                  Distribución por Rol
                </h3>
                <p className="text-slate-400 text-sm">Segmentación de participantes</p>
              </div>
              <div className="text-sm text-slate-400">
                Total: {stats.rolesRegistrados}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.roleChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.roleChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: '#ffffff20', 
                      color: 'white',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend 
                    formatter={(value, entry) => (
                      <span className="text-slate-300">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Radar Chart - Rendimiento por diócesis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TargetIcon size={20} />
                Rendimiento por Diócesis
              </h3>
              <p className="text-slate-400 text-sm">Comparación de las 5 principales diócesis</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={stats.topDiocesis}>
                <PolarGrid stroke="#ffffff20" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  stroke="#ffffff60"
                  fontSize={12}
                />
                <PolarRadiusAxis 
                  stroke="#ffffff60"
                  fontSize={10}
                />
                <Radar
                  name="Inscripciones"
                  dataKey="A"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderColor: '#ffffff20', 
                    color: 'white',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Herramientas de desarrollo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-white">Herramientas de Desarrollo</h3>
              <p className="text-slate-400">Generación y gestión de datos de prueba</p>
            </div>
            <FlaskConical className="text-violet-400" size={28} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-gradient-to-br from-violet-600/20 to-cyan-500/20 rounded-2xl border border-white/10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-600/30 to-cyan-500/30 rounded-2xl flex items-center justify-center mb-4">
                    <Zap className="text-white" size={28} />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">Generar Datos de Prueba</h4>
                  <p className="text-slate-300 mb-6">
                    Crea un evento completo con 250 inscripciones realistas para pruebas y desarrollo.
                    Perfecto para testing y demostraciones.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerateGhostData}
                  disabled={isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-violet-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      Generar Laboratorio de Pruebas
                    </>
                  )}
                </motion.button>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                    <span>1 evento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    <span>250 registros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span>8 diócesis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span>5 roles</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gradient-to-br from-rose-600/20 to-amber-500/20 rounded-2xl border border-white/10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="w-14 h-14 bg-gradient-to-br from-rose-600/30 to-amber-500/30 rounded-2xl flex items-center justify-center mb-4">
                    <Trash2 className="text-white" size={28} />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">Limpiar Datos de Prueba</h4>
                  <p className="text-slate-300 mb-6">
                    Elimina todos los eventos y datos generados por el laboratorio de pruebas.
                    Esta acción no afecta los datos reales del sistema.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePurgeGhostData}
                  disabled={isProcessing}
                  className="w-full py-4 bg-white/10 backdrop-blur-sm border border-rose-500/20 text-white font-bold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Limpiando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={20} />
                      Limpiar Laboratorio de Pruebas
                    </>
                  )}
                </motion.button>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  <p className="text-sm text-rose-300 font-medium">
                    ⚠️ Advertencia: Esta acción elimina permanentemente todos los datos de prueba.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="text-emerald-400" size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400">Tasa de Éxito</p>
                <p className="text-2xl font-black text-emerald-400">{stats.tasaAprobacion.toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4">Inscripciones aprobadas vs totales</p>
          </div>
          
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Home className="text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400">Hospedajes</p>
                <p className="text-2xl font-black text-blue-400">{stats.hospedajes}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4">Solicitudes de alojamiento</p>
          </div>
          
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <DatabaseBackup className="text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400">Base de Datos</p>
                <p className="text-2xl font-black text-purple-400">{dbData.length}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4">Registros totales</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield size={14} />
                <span>Sistema seguro • Versión 2.0</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <p>© {new Date().getFullYear()} AdminDashboard • Todos los derechos reservados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}