"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  UserCircle2, ChevronLeft, Mail, Wallet, 
  BadgePercent, Users2, Info, ArrowUpRight,
  TrendingUp, CreditCard, Loader2, Target,
  Download, PieChart, BarChart3, Filter,
  Building, DollarSign, CheckCircle,
  XCircle, Clock, Search, Sparkles,
  Calendar, Phone, FileText, Printer,
  Crown, GraduationCap, Briefcase, UserCheck,
  Shield, Award
} from "lucide-react";
import { 
  PieChart as RechartPieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
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
  segmentacion: string;
  monto_pagado: number;
  precio_pactado: number;
  created_at: string;
  evento_id: string;
  hospedaje?: string;
}

interface EstadisticasRol {
  nombre: string;
  total: number;
  aprobados: number;
  pendientes: number;
  rechazados: number;
  recaudoReal: number;
  recaudoPendiente: number;
  recaudoProyectado: number;
  porcentajeCompletado: number;
  ticketPromedio: number;
  porcentajePoblacion: number;
  items: Inscripcion[];
  porDiocesis: Record<string, number>;
}

interface EventoActivo {
  id: string;
  nombre: string;
  fecha_inicio: string;
}

// Función para obtener el color del rol (MOVIDA FUERA DEL COMPONENTE)
const getRolColor = (rol: string): string => {
  const colors: Record<string, string> = {
    'Sacerdote': '#f59e0b',
    'Religioso': '#8b5cf6',
    'Laico': '#3b82f6',
    'Consagrado': '#10b981',
    'Obispo': '#4f46e5',
    'Seminarista': '#ec4899',
    'Sin Definir': '#64748b'
  };
  return colors[rol] || '#64748b';
};

export default function InscripcionesPorRol() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Inscripcion[]>([]);
  const [eventoActivo, setEventoActivo] = useState<EventoActivo | null>(null);
  const [selectedRol, setSelectedRol] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [filterDiocesis, setFilterDiocesis] = useState<string>("todos");
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Iconos por tipo de rol
  const rolIcons: Record<string, React.ReactNode> = {
    'Sacerdote': <Crown className="text-amber-600" size={24} />,
    'Religioso': <GraduationCap className="text-purple-600" size={24} />,
    'Laico': <UserCheck className="text-blue-600" size={24} />,
    'Consagrado': <Award className="text-emerald-600" size={24} />,
    'Obispo': <Shield className="text-indigo-600" size={24} />,
    'Seminarista': <GraduationCap className="text-rose-600" size={24} />,
    'Sin Definir': <UserCircle2 className="text-slate-400" size={24} />
  };

  useEffect(() => {
    fetchDatosEventoActivo();
  }, []);

  const fetchDatosEventoActivo = async () => {
    setLoading(true);
    try {
      const { data: evento } = await supabase
        .from('eventos')
        .select('id, nombre, fecha_inicio')
        .eq('esta_activo', true)
        .single();

      if (evento) {
        setEventoActivo(evento);
        const { data: inscripciones } = await supabase
          .from('inscripciones')
          .select('*')
          .eq('evento_id', evento.id)
          .order('created_at', { ascending: false });
        
        setData(inscripciones || []);
      }
    } catch (error) {
      console.error("Error en segmentación por rol:", error);
    } finally {
      setLoading(false);
    }
  };

  // Procesar estadísticas por rol
  const estadisticasPorRol = useMemo(() => {
    const totalInscritos = data.length;
    
    return data.reduce((acc: Record<string, EstadisticasRol>, curr) => {
      const rol = curr.segmentacion || "Sin Definir";
      
      if (!acc[rol]) {
        acc[rol] = { 
          nombre: rol,
          total: 0,
          aprobados: 0,
          pendientes: 0,
          rechazados: 0,
          recaudoReal: 0,
          recaudoPendiente: 0,
          recaudoProyectado: 0,
          porcentajeCompletado: 0,
          ticketPromedio: 0,
          porcentajePoblacion: 0,
          items: [],
          porDiocesis: {}
        };
      }
      
      const montoPagado = Number(curr.monto_pagado) || 0;
      const precioPactado = Number(curr.precio_pactado) || 0;
      
      acc[rol].total += 1;
      acc[rol].items.push(curr);
      acc[rol].recaudoProyectado += precioPactado;
      
      // Contar por estado
      if (curr.estado === 'aprobada') {
        acc[rol].aprobados += 1;
        acc[rol].recaudoReal += montoPagado;
      } else if (curr.estado === 'pendiente') {
        acc[rol].pendientes += 1;
        acc[rol].recaudoPendiente += precioPactado;
      } else {
        acc[rol].rechazados += 1;
      }
      
      // Agrupar por diócesis
      const diocesis = curr.diocesis || 'Sin asignar';
      acc[rol].porDiocesis[diocesis] = (acc[rol].porDiocesis[diocesis] || 0) + 1;
      
      return acc;
    }, {});
  }, [data]);

  // Calcular porcentajes después de procesar
  const rolesArray = useMemo(() => {
    const totalInscritos = data.length;
    return Object.values(estadisticasPorRol).map(rol => ({
      ...rol,
      porcentajePoblacion: totalInscritos > 0 ? (rol.total / totalInscritos) * 100 : 0,
      porcentajeCompletado: rol.recaudoProyectado > 0 ? (rol.recaudoReal / rol.recaudoProyectado) * 100 : 0,
      ticketPromedio: rol.total > 0 ? rol.recaudoProyectado / rol.total : 0
    })).sort((a, b) => b.total - a.total);
  }, [estadisticasPorRol, data.length]);

  const rolSeleccionado = selectedRol ? estadisticasPorRol[selectedRol] : null;
  const datosGraficoRol = useMemo(() => {
    return rolesArray.map(rol => ({
      name: rol.nombre,
      total: rol.total,
      recaudo: rol.recaudoReal / 1000,
      color: getRolColor(rol.nombre)
    }));
  }, [rolesArray]);

  const datosEstadosRol = rolSeleccionado ? [
    { name: 'Aprobados', value: rolSeleccionado.aprobados, color: '#10b981' },
    { name: 'Pendientes', value: rolSeleccionado.pendientes, color: '#f59e0b' },
    { name: 'Rechazados', value: rolSeleccionado.rechazados, color: '#ef4444' },
  ] : [];

  const datosDiocesisRol = rolSeleccionado ? 
    Object.entries(rolSeleccionado.porDiocesis || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) : [];

  // Filtrar inscripciones
  const inscripcionesFiltradas = useMemo(() => {
    if (!rolSeleccionado) return [];
    return rolSeleccionado.items.filter(item => {
      const matchesEstado = filterEstado === "todos" || item.estado === filterEstado;
      const matchesDiocesis = filterDiocesis === "todos" || item.diocesis === filterDiocesis;
      const matchesSearch = !searchTerm || 
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesEstado && matchesDiocesis && matchesSearch;
    });
  }, [rolSeleccionado, filterEstado, filterDiocesis, searchTerm]);

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
      pdf.text("Reporte por Roles", pdfWidth / 2, 15, { align: "center" });
      pdf.setFontSize(12);
      pdf.text(eventoActivo?.nombre || "Evento", pdfWidth / 2, 22, { align: "center" });
      
      if (selectedRol) {
        pdf.text(`Rol: ${selectedRol}`, pdfWidth / 2, 29, { align: "center" });
      }
      
      pdf.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pdfWidth / 2, 36, { align: "center" });
      
      // Dashboard principal
      pdf.addImage(imgData, "PNG", 10, 45, pdfWidth - 20, pdfHeight * (pdfWidth - 20) / pdfWidth);
      
      // Página adicional con detalles
      if (selectedRol && rolSeleccionado) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text(`Detalles de ${selectedRol}`, 20, 20);
        
        const detalles = [
          `Total Inscritos: ${rolSeleccionado.total}`,
          `Aprobados: ${rolSeleccionado.aprobados} (${((rolSeleccionado.aprobados/rolSeleccionado.total)*100).toFixed(1)}%)`,
          `Pendientes: ${rolSeleccionado.pendientes}`,
          `Rechazados: ${rolSeleccionado.rechazados}`,
          `Recaudo Real: $${rolSeleccionado.recaudoReal.toLocaleString()}`,
          `Recaudo Pendiente: $${rolSeleccionado.recaudoPendiente.toLocaleString()}`,
          `Recaudo Proyectado: $${rolSeleccionado.recaudoProyectado.toLocaleString()}`,
          `Ticket Promedio: $${rolSeleccionado.ticketPromedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          `Porcentaje Población: ${((rolSeleccionado.total / data.length) * 100).toFixed(1)}%`
        ];
        
        detalles.forEach((line, index) => {
          pdf.text(line, 20, 40 + (index * 10));
        });
        
        // Lista de inscritos
        pdf.setFontSize(14);
        pdf.text("Inscritos Destacados:", 20, 130);
        
        let yPos = 140;
        inscripcionesFiltradas.slice(0, 15).forEach((ins, idx) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`${idx + 1}. ${ins.nombre} ${ins.apellido} - ${ins.diocesis} - $${ins.precio_pactado}`, 20, yPos);
          yPos += 10;
        });
      }
      
      pdf.save(`Segmentacion-Roles-${selectedRol || 'General'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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
        <p className="mt-6 text-lg font-semibold text-slate-700">Analizando segmentación por roles...</p>
        <p className="text-sm text-slate-500 mt-2">Organizando datos del evento activo</p>
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
                  {rolIcons[selectedRol || 'Sin Definir'] || <UserCircle2 className="text-indigo-600" size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      Segmentación Avanzada
                    </span>
                    <Sparkles size={14} className="text-amber-500" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
                    {selectedRol ? (
                      <>
                        <span className="text-indigo-600">{selectedRol}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-slate-700">Análisis Detallado</span>
                      </>
                    ) : (
                      <span className="text-slate-900">Segmentación por Roles</span>
                    )}
                  </h1>
                  <p className="text-slate-500 flex items-center gap-2">
                    <Users2 size={14} />
                    {data.length} inscritos totales
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
              {selectedRol && (
                <button 
                  onClick={() => setSelectedRol(null)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Ver todos los roles
                </button>
              )}
              
              <div className="flex gap-2">
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
                
                {selectedRol && (
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Filter size={18} />
                    Filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* FILTROS DESPLEGABLES */}
          {showFilters && selectedRol && (
            <div className="bg-white p-6 rounded-3xl shadow-lg animate-in slide-in-from-top duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Nombre, apellido o email..."
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
                  <label className="block text-sm font-bold text-slate-700 mb-2">Diocesis</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={filterDiocesis}
                    onChange={(e) => setFilterDiocesis(e.target.value)}
                  >
                    <option value="todos">Todas las diócesis</option>
                    {Object.keys(rolSeleccionado?.porDiocesis || {}).map(diocesis => (
                      <option key={diocesis} value={diocesis}>{diocesis}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* VISTA GENERAL DE ROLES */}
          {!selectedRol ? (
            <>
              {/* KPI RESUMEN */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Roles Activos</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">{rolesArray.length}</p>
                    </div>
                    <UserCircle2 className="text-indigo-600" size={32} />
                  </div>
                  <p className="text-sm text-slate-500 mt-4">Perfiles identificados</p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Total Inscritos</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">{data.length}</p>
                    </div>
                    <Users2 className="text-emerald-600" size={32} />
                  </div>
                  <p className="text-sm text-slate-500 mt-4">Participantes registrados</p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Recaudo Total</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">
                        ${rolesArray.reduce((acc, rol) => acc + rol.recaudoReal, 0).toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="text-amber-600" size={32} />
                  </div>
                  <p className="text-sm text-slate-500 mt-4">Fondos validados</p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Ticket Promedio</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">
                        ${data.length > 0 
                          ? Math.round(rolesArray.reduce((acc, rol) => acc + rol.recaudoProyectado, 0) / data.length).toLocaleString()
                          : 0}
                      </p>
                    </div>
                    <Target className="text-rose-600" size={32} />
                  </div>
                  <p className="text-sm text-slate-500 mt-4">Valor promedio por persona</p>
                </div>
              </div>

              {/* GRÁFICO DE DISTRIBUCIÓN */}
              <div className="bg-white p-8 rounded-3xl shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Distribución por Rol</h3>
                    <p className="text-slate-500 text-sm">Comparativa de participación</p>
                  </div>
                  <BarChart3 className="text-indigo-600" size={24} />
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosGraficoRol}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'recaudo') return [`$${Number(value) * 1000}`, 'Recaudo'];
                          return [value, 'Inscritos'];
                        }}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left" 
                        dataKey="total" 
                        name="Inscritos" 
                        radius={[4, 4, 0, 0]}
                        fill="#4f46e5"
                      />
                      <Bar 
                        yAxisId="right" 
                        dataKey="recaudo" 
                        name="Recaudo (miles)" 
                        radius={[4, 4, 0, 0]}
                        fill="#10b981"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* LISTA DE ROLES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rolesArray.map((rol) => (
                  <RolCard 
                    key={rol.nombre} 
                    rol={rol} 
                    onClick={() => setSelectedRol(rol.nombre)}
                    icon={rolIcons[rol.nombre] || <UserCircle2 size={24} />}
                    color={getRolColor(rol.nombre)}
                    totalInscritos={data.length}
                  />
                ))}
              </div>
            </>
          ) : (
            /* VISTA DETALLADA DEL ROL */
            <div className="space-y-8">
              {/* KPI DETALLADOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-3xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white/80">Total Participantes</p>
                      <p className="text-3xl font-black mt-2">{rolSeleccionado?.total}</p>
                    </div>
                    <Users2 size={32} className="text-white/80" />
                  </div>
                  <div className="mt-4 text-sm">
                    <div className="flex justify-between">
                      <span>% del total</span>
                      <span className="font-bold">{((rolSeleccionado?.total || 0) / data.length * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Recaudo Real</p>
                      <p className="text-3xl font-black text-emerald-600 mt-2">
                        ${rolSeleccionado?.recaudoReal.toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="text-emerald-600" size={32} />
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${rolSeleccionado?.porcentajeCompletado || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {rolSeleccionado?.porcentajeCompletado.toFixed(1)}% completado
                    </p>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Ticket Promedio</p>
                      <p className="text-3xl font-black text-amber-600 mt-2">
                        ${rolSeleccionado?.ticketPromedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <CreditCard className="text-amber-600" size={32} />
                  </div>
                  <p className="text-sm text-slate-500 mt-4">
                    Valor promedio por {rolSeleccionado?.nombre.toLowerCase()}
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">Proyección Total</p>
                      <p className="text-3xl font-black text-purple-600 mt-2">
                        ${rolSeleccionado?.recaudoProyectado.toLocaleString()}
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
                          data={datosEstadosRol}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          {datosEstadosRol.map((entry, index) => (
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
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Distribución por Diócesis</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datosDiocesisRol}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => [value, 'Inscritos']} />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
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
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Diocesis</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
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
                                <p className="text-sm text-slate-500">{inscripcion.email}</p>
                                {inscripcion.telefono && (
                                  <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <Phone size={10} /> {inscripcion.telefono}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                              <Building size={12} />
                              {inscripcion.diocesis || 'Sin asignar'}
                            </span>
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
                      <UserCircle2 className="mx-auto text-slate-400" size={48} />
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

// COMPONENTE DE CARD DE ROL
function RolCard({ rol, onClick, icon, color, totalInscritos }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-indigo-200 text-left group"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="p-3 rounded-2xl group-hover:scale-110 transition-transform" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-slate-900 group-hover:text-indigo-600">{rol.total}</span>
          <p className="text-xs text-slate-500">Inscritos</p>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ color }}>{rol.nombre}</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">% del total</span>
            <span className="font-bold" style={{ color }}>
              {((rol.total / totalInscritos) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500"
              style={{ 
                width: `${((rol.total / totalInscritos) * 100)}%`,
                backgroundColor: color
              }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-sm font-bold text-emerald-600">${rol.recaudoReal.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Recaudo</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-amber-600">${rol.ticketPromedio.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="text-xs text-slate-500">Promedio</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold" style={{ color }}>{rol.aprobados}</div>
            <div className="text-xs text-slate-500">Aprobados</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Ver detalles
          </span>
          <ArrowUpRight size={18} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </div>
      </div>
    </button>
  );
}