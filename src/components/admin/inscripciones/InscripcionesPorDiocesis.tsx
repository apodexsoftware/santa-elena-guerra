"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  MapPin, ChevronLeft, User, Mail, 
  Banknote, Landmark, PieChart, 
  TrendingUp, Users, Download, Search, 
  ChevronRight, BadgeCheck, AlertCircle, Loader2,
  Filter, Calendar, Phone, DollarSign,
  ChevronDown, Eye, Printer, FileText,
  Building, CheckCircle, XCircle, Clock,
  BarChart3, Target, Sparkles
} from "lucide-react";
import { 
  PieChart as RechartPieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Tipos TypeScript
interface Inscripcion {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
  diocesis: string;
  estado: string;
  monto_pagado: number;
  precio_pactado: number;
  created_at: string;
  evento_id: string;
  segmentacion?: string;
  hospedaje?: string;
}

interface EstadisticasDiocesis {
  nombre: string;
  total: number;
  aprobados: number;
  pendientes: number;
  rechazados: number;
  recaudoReal: number;
  recaudoPendiente: number;
  recaudoProyectado: number;
  porcentajeCompletado: number;
  items: Inscripcion[];
  segmentaciones: Record<string, number>;
  evolucionDiaria?: Array<{ fecha: string; inscritos: number }>;
}

interface EventoActivo {
  id: string;
  nombre: string;
  fecha_inicio: string;
  ubicacion?: string;
}

export default function InscripcionesPorDiocesis() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Inscripcion[]>([]);
  const [eventoActivo, setEventoActivo] = useState<EventoActivo | null>(null);
  const [selectedDiocesis, setSelectedDiocesis] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [filterHospedaje, setFilterHospedaje] = useState<string>("todos");
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statsView, setStatsView] = useState<"general" | "financiero" | "segmentacion">("general");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDatosEventoActivo();
  }, []);

  const fetchDatosEventoActivo = async () => {
    setLoading(true);
    try {
      // Obtener evento activo
      const { data: evento } = await supabase
        .from('eventos')
        .select('id, nombre, fecha_inicio, ubicacion')
        .eq('esta_activo', true)
        .single();

      if (evento) {
        setEventoActivo(evento);
        
        // Obtener inscripciones con más campos
        const { data: inscripciones } = await supabase
          .from('inscripciones')
          .select('*')
          .eq('evento_id', evento.id)
          .order('created_at', { ascending: false });
        
        setData(inscripciones || []);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Procesar estadísticas por diócesis
  const statsJurisdiccion = useMemo(() => {
    return data.reduce((acc: Record<string, EstadisticasDiocesis>, curr) => {
      const sede = curr.diocesis || "Sin Asignar";
      if (!acc[sede]) {
        acc[sede] = { 
          nombre: sede,
          total: 0, 
          aprobados: 0,
          pendientes: 0,
          rechazados: 0,
          items: [], 
          recaudoReal: 0, 
          recaudoPendiente: 0,
          recaudoProyectado: 0,
          porcentajeCompletado: 0,
          segmentaciones: {}
        };
      }
      
      const montoPagado = Number(curr.monto_pagado) || 0;
      const precioPactado = Number(curr.precio_pactado) || 0;
      
      acc[sede].total += 1;
      acc[sede].items.push(curr);
      acc[sede].recaudoProyectado += precioPactado;
      
      // Contar por estado
      if (curr.estado === 'aprobada') {
        acc[sede].aprobados += 1;
        acc[sede].recaudoReal += montoPagado;
      } else if (curr.estado === 'pendiente') {
        acc[sede].pendientes += 1;
        acc[sede].recaudoPendiente += precioPactado;
      } else {
        acc[sede].rechazados += 1;
      }
      
      // Segmentaciones
      const segmento = curr.segmentacion || 'Sin segmento';
      acc[sede].segmentaciones[segmento] = (acc[sede].segmentaciones[segmento] || 0) + 1;
      
      // Calcular porcentaje
      acc[sede].porcentajeCompletado = (acc[sede].recaudoReal / acc[sede].recaudoProyectado) * 100 || 0;
      
      return acc;
    }, {});
  }, [data]);

  // Datos para gráficos
  const sedesArray = Object.values(statsJurisdiccion).sort((a: any, b: any) => b.total - a.total);
  const finanzasSede = selectedDiocesis ? statsJurisdiccion[selectedDiocesis] : null;

  // Datos para gráficos de la diócesis seleccionada
  const datosGraficoEstados = useMemo(() => {
    if (!finanzasSede) return [];
    return [
      { name: 'Aprobados', value: finanzasSede.aprobados, color: '#10b981' },
      { name: 'Pendientes', value: finanzasSede.pendientes, color: '#f59e0b' },
      { name: 'Rechazados', value: finanzasSede.rechazados, color: '#ef4444' },
    ];
  }, [finanzasSede]);

  const datosSegmentacion = useMemo(() => {
    if (!finanzasSede) return [];
    return Object.entries(finanzasSede.segmentaciones || {}).map(([name, value], index) => ({
      name,
      value,
      color: ['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]
    }));
  }, [finanzasSede]);

  const datosRecaudoComparativo = useMemo(() => {
    return sedesArray.slice(0, 8).map((sede: any) => ({
      name: sede.nombre.substring(0, 12),
      Real: sede.recaudoReal / 1000,
      Pendiente: sede.recaudoPendiente / 1000,
      Proyectado: sede.recaudoProyectado / 1000,
    }));
  }, [sedesArray]);

  // Filtrar inscripciones
  const inscripcionesFiltradas = useMemo(() => {
    if (!finanzasSede) return [];
    return finanzasSede.items.filter(item => {
      const matchesEstado = filterEstado === "todos" || item.estado === filterEstado;
      const matchesHospedaje = filterHospedaje === "todos" || item.hospedaje === filterHospedaje;
      const matchesSearch = !searchTerm || 
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.documento?.includes(searchTerm);
      return matchesEstado && matchesHospedaje && matchesSearch;
    });
  }, [finanzasSede, filterEstado, filterHospedaje, searchTerm]);

  // Generar PDF
  const generarPDF = async (tipo: "general" | "detallado" = "detallado") => {
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
      pdf.text("Reporte de Inscripciones", pdfWidth / 2, 15, { align: "center" });
      pdf.setFontSize(12);
      pdf.text(eventoActivo?.nombre || "Evento", pdfWidth / 2, 22, { align: "center" });
      
      if (selectedDiocesis) {
        pdf.text(`Diocesis: ${selectedDiocesis}`, pdfWidth / 2, 29, { align: "center" });
      }
      
      pdf.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pdfWidth / 2, 36, { align: "center" });
      
      // Dashboard principal
      pdf.addImage(imgData, "PNG", 10, 45, pdfWidth - 20, pdfHeight * (pdfWidth - 20) / pdfWidth);
      
      // Página adicional con detalles
      if (selectedDiocesis && finanzasSede) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text(`Detalles de ${selectedDiocesis}`, 20, 20);
        
        const detalles = [
          `Total Inscritos: ${finanzasSede.total}`,
          `Aprobados: ${finanzasSede.aprobados} (${((finanzasSede.aprobados/finanzasSede.total)*100).toFixed(1)}%)`,
          `Pendientes: ${finanzasSede.pendientes}`,
          `Rechazados: ${finanzasSede.rechazados}`,
          `Recaudo Real: $${finanzasSede.recaudoReal.toLocaleString()}`,
          `Recaudo Pendiente: $${finanzasSede.recaudoPendiente.toLocaleString()}`,
          `Recaudo Proyectado: $${finanzasSede.recaudoProyectado.toLocaleString()}`,
          `Porcentaje Completado: ${finanzasSede.porcentajeCompletado.toFixed(1)}%`
        ];
        
        detalles.forEach((line, index) => {
          pdf.text(line, 20, 40 + (index * 10));
        });
        
        // Lista de inscritos
        pdf.setFontSize(14);
        pdf.text("Lista de Inscritos:", 20, 130);
        
        let yPos = 140;
        inscripcionesFiltradas.slice(0, 20).forEach((ins, idx) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`${idx + 1}. ${ins.nombre} ${ins.apellido} - ${ins.estado} - $${ins.precio_pactado}`, 20, yPos);
          yPos += 10;
        });
      }
      
      pdf.save(`Inscripciones-${selectedDiocesis || 'General'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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
        <p className="mt-6 text-lg font-semibold text-slate-700">Cargando análisis de diócesis...</p>
        <p className="text-sm text-slate-500 mt-2">Filtrando datos del evento activo</p>
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
                  <Building className="text-indigo-600" size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      Evento Activo
                    </span>
                    <Sparkles size={14} className="text-amber-500" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
                    {selectedDiocesis ? (
                      <>
                        <span className="text-indigo-600">{selectedDiocesis}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-slate-700">{eventoActivo?.nombre}</span>
                      </>
                    ) : (
                      <span className="text-slate-900">Análisis por Diócesis</span>
                    )}
                  </h1>
                  <p className="text-slate-500 flex items-center gap-2">
                    <MapPin size={14} />
                    {eventoActivo?.ubicacion || "Ubicación por definir"}
                    {eventoActivo?.fecha_inicio && (
                      <>
                        <span className="mx-2">•</span>
                        <Calendar size={14} />
                        {format(new Date(eventoActivo.fecha_inicio), "dd 'de' MMMM", { locale: es })}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {selectedDiocesis && (
                <button 
                  onClick={() => setSelectedDiocesis(null)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Ver todas
                </button>
              )}
              
              <div className="flex gap-2">
                <button 
                  onClick={() => generarPDF("detallado")}
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
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Filter size={18} />
                  Filtros
                </button>
              </div>
            </div>
          </div>

          {/* FILTROS DESPLEGABLES */}
          {showFilters && (
            <div className="bg-white p-6 rounded-3xl shadow-lg animate-in slide-in-from-top duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Nombre, email o documento..."
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Estado</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="aprobada">Aprobadas</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="rechazada">Rechazadas</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Hospedaje</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={filterHospedaje}
                    onChange={(e) => setFilterHospedaje(e.target.value)}
                  >
                    <option value="todos">Con y sin hospedaje</option>
                    <option value="si">Con hospedaje</option>
                    <option value="no">Sin hospedaje</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* VISTA GENERAL DE TODAS LAS DIÓCESIS */}
          {!selectedDiocesis ? (
            <>
              {/* KPI RESUMEN */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Total Diócesis</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">{sedesArray.length}</p>
                    </div>
                    <Building className="text-indigo-600" size={32} />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Total Inscritos</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">
                        {sedesArray.reduce((acc: number, sede: any) => acc + sede.total, 0)}
                      </p>
                    </div>
                    <Users className="text-emerald-600" size={32} />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Recaudo Total</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">
                        ${sedesArray.reduce((acc: number, sede: any) => acc + sede.recaudoReal, 0).toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="text-amber-600" size={32} />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">% Completado Prom.</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">
                        {sedesArray.length > 0 
                          ? (sedesArray.reduce((acc: number, sede: any) => acc + sede.porcentajeCompletado, 0) / sedesArray.length).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                    <Target className="text-rose-600" size={32} />
                  </div>
                </div>
              </div>

              {/* GRÁFICO COMPARATIVO */}
              <div className="bg-white p-8 rounded-3xl shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Recaudo por Diócesis (Top 8)</h3>
                    <p className="text-slate-500 text-sm">Comparativo en miles de pesos</p>
                  </div>
                  <BarChart3 className="text-indigo-600" size={24} />
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosRecaudoComparativo}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `$${value}K`} />
                      <Tooltip formatter={(value) => [`$${Number(value) * 1000}`, '']} />
                      <Legend />
                      <Bar dataKey="Real" fill="#10b981" name="Recaudo Real" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Pendiente" fill="#f59e0b" name="Por Cobrar" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Proyectado" fill="#8b5cf6" name="Proyectado" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* LISTA DE DIÓCESIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sedesArray
                  .filter((s: any) => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((sede: any) => (
                    <SedeCard key={sede.nombre} sede={sede} onClick={() => setSelectedDiocesis(sede.nombre)} />
                  ))}
              </div>
            </>
          ) : (
            /* VISTA DETALLADA DE UNA DIÓCESIS */
            <div className="space-y-8">
              {/* KPI DETALLADOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-3xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white/80">Total Participantes</p>
                      <p className="text-3xl font-black mt-2">{finanzasSede?.total}</p>
                    </div>
                    <Users size={32} className="text-white/80" />
                  </div>
                  <div className="mt-4 text-sm">
                    <div className="flex justify-between">
                      <span>Aprobados</span>
                      <span className="font-bold">{finanzasSede?.aprobados}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Pendientes</span>
                      <span className="font-bold">{finanzasSede?.pendientes}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Recaudo Real</p>
                      <p className="text-3xl font-black text-emerald-600 mt-2">
                        ${finanzasSede?.recaudoReal.toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="text-emerald-600" size={32} />
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${finanzasSede?.porcentajeCompletado || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {finanzasSede?.porcentajeCompletado.toFixed(1)}% completado
                    </p>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Por Cobrar</p>
                      <p className="text-3xl font-black text-amber-600 mt-2">
                        ${finanzasSede?.recaudoPendiente.toLocaleString()}
                      </p>
                    </div>
                    <AlertCircle className="text-amber-600" size={32} />
                  </div>
                  <p className="text-sm text-slate-500 mt-4">
                    {finanzasSede?.pendientes} inscripciones pendientes
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Proyección Total</p>
                      <p className="text-3xl font-black text-purple-600 mt-2">
                        ${finanzasSede?.recaudoProyectado.toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="text-purple-600" size={32} />
                  </div>
                  <p className="text-sm text-slate-500 mt-4">
                    Meta financiera proyectada
                  </p>
                </div>
              </div>

              {/* GRÁFICOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-lg">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Distribución por Estado</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartPieChart>
                        <Pie
                          data={datosGraficoEstados}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          {datosGraficoEstados.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Inscritos']} />
                        <Legend />
                      </RechartPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white p-8 rounded-3xl shadow-lg">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Segmentación</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartPieChart>
                        <Pie
                          data={datosSegmentacion}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          {datosSegmentacion.map((entry, index) => (
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

              {/* TABLA DE INSCRIPCIONES */}
              <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Inscripciones</h3>
                    <p className="text-slate-500 text-sm">
                      {inscripcionesFiltradas.length} resultados {searchTerm && `para "${searchTerm}"`}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      {['aprobada', 'pendiente', 'rechazada'].map((estado) => (
                        <button
                          key={estado}
                          onClick={() => setFilterEstado(filterEstado === estado ? "todos" : estado)}
                          className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                            filterEstado === estado
                              ? estado === 'aprobada' 
                                ? 'bg-emerald-100 text-emerald-700'
                                : estado === 'pendiente'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {estado === 'aprobada' ? '✓' : estado === 'pendiente' ? '⏱' : '✗'} {estado}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Participante</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Monto</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inscripcionesFiltradas.map((inscripcion) => (
                        <tr key={inscripcion.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center font-bold text-indigo-600">
                                {inscripcion.nombre[0]}{inscripcion.apellido[0]}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">
                                  {inscripcion.nombre} {inscripcion.apellido}
                                </p>
                                <p className="text-sm text-slate-500">{inscripcion.documento}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-sm text-slate-700">{inscripcion.email}</p>
                              {inscripcion.telefono && (
                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                  <Phone size={12} /> {inscripcion.telefono}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900">
                                ${inscripcion.precio_pactado.toLocaleString()}
                              </p>
                              <p className="text-sm text-emerald-600">
                                Pagado: ${inscripcion.monto_pagado.toLocaleString()}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                              inscripcion.estado === 'aprobada'
                                ? 'bg-emerald-100 text-emerald-700'
                                : inscripcion.estado === 'pendiente'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {inscripcion.estado === 'aprobada' ? (
                                <CheckCircle size={12} />
                              ) : inscripcion.estado === 'pendiente' ? (
                                <Clock size={12} />
                              ) : (
                                <XCircle size={12} />
                              )}
                              {inscripcion.estado}
                            </span>
                            {inscripcion.hospedaje === 'si' && (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                🏨 Hospedaje
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {format(new Date(inscripcion.created_at), "dd/MM/yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {inscripcionesFiltradas.length === 0 && (
                    <div className="p-12 text-center">
                      <AlertCircle className="mx-auto text-slate-400" size={48} />
                      <p className="mt-4 text-slate-500 font-bold">No se encontraron inscripciones</p>
                      <p className="text-sm text-slate-400 mt-2">
                        Intenta ajustar los filtros o busca con otros términos
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES
function SedeCard({ sede, onClick }: any) {
  const porcentaje = (sede.recaudoReal / sede.recaudoProyectado) * 100 || 0;
  
  return (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-indigo-200 text-left group"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="p-3 bg-indigo-100 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <Building size={24} />
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-slate-900 group-hover:text-indigo-600">{sede.total}</span>
          <p className="text-xs text-slate-500">Inscritos</p>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-slate-900 mb-2">{sede.nombre}</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Recaudo</span>
            <span className="font-bold text-emerald-600">${sede.recaudoReal.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500 group-hover:bg-indigo-600"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-sm font-bold text-emerald-600">{sede.aprobados}</div>
            <div className="text-xs text-slate-500">Aprobados</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-amber-600">{sede.pendientes}</div>
            <div className="text-xs text-slate-500">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-rose-600">{sede.rechazados}</div>
            <div className="text-xs text-slate-500">Rechazados</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            {porcentaje.toFixed(1)}% completado
          </span>
          <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  );
}