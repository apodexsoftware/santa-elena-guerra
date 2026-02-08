"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  CheckCircle, XCircle, Eye, Search, Filter, 
  User, AlertCircle, Loader2, Clock, ExternalLink,
  Download, DollarSign, Building, Mail, Phone,
  ChevronDown, ChevronUp, FileText, Shield,
  RefreshCw, TrendingUp, AlertTriangle, Check,
  UserCheck, Ban, ArrowRight, MoreVertical,
  Printer, Send, MessageSquare, Calendar
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function AprobarRechazar() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDiocesis, setFilterDiocesis] = useState("todas");
  const [filterEstado, setFilterEstado] = useState("pendiente");
  const [filterSegmentacion, setFilterSegmentacion] = useState("todas");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [eventoActivo, setEventoActivo] = useState<any>(null);
  const [selectedInscripcion, setSelectedInscripcion] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [bulkActions, setBulkActions] = useState<string[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    recaudoReal: 0,
    recaudoPendiente: 0
  });

  // 1. Cargar datos del evento activo
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: evento } = await supabase
        .from('eventos')
        .select('id, nombre, fecha_inicio, meta_recaudacion')
        .eq('esta_activo', true)
        .single();

      if (evento) {
        setEventoActivo(evento);
        const { data: inscripciones } = await supabase
          .from("inscripciones")
          .select("*")
          .eq("evento_id", evento.id)
          .order('created_at', { ascending: false });
        
        setData(inscripciones || []);
        
        // Calcular estadísticas
        const total = inscripciones?.length || 0;
        const pendientes = inscripciones?.filter(i => i.estado === 'pendiente').length || 0;
        const aprobados = inscripciones?.filter(i => i.estado === 'aprobada').length || 0;
        const rechazados = inscripciones?.filter(i => i.estado === 'rechazada').length || 0;
        const recaudoReal = inscripciones
          ?.filter(i => i.estado === 'aprobada')
          .reduce((acc, curr) => acc + (curr.monto_pagado || curr.precio_pactado || 0), 0) || 0;
        const recaudoPendiente = inscripciones
          ?.filter(i => i.estado === 'pendiente')
          .reduce((acc, curr) => acc + (curr.precio_pactado || 0), 0) || 0;

        setStats({
          total,
          pendientes,
          aprobados,
          rechazados,
          recaudoReal,
          recaudoPendiente
        });
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // 2. Extraer listas únicas para filtros
  const listaDiocesis = useMemo(() => {
    return Array.from(new Set(data.map(i => i.diocesis).filter(Boolean))).sort();
  }, [data]);

  const listaSegmentaciones = useMemo(() => {
    return Array.from(new Set(data.map(i => i.segmentacion).filter(Boolean))).sort();
  }, [data]);

  // 3. Lógica de Filtrado mejorada
  const inscritosFiltrados = useMemo(() => {
    return data.filter((i) => {
      const matchEstado = filterEstado === "todos" || i.estado === filterEstado;
      const matchSearch = searchTerm === "" || 
        (i.nombre + " " + i.apellido).toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.documento?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDiocesis = filterDiocesis === "todas" || i.diocesis === filterDiocesis;
      const matchSegmentacion = filterSegmentacion === "todas" || i.segmentacion === filterSegmentacion;
      
      return matchEstado && matchSearch && matchDiocesis && matchSegmentacion;
    });
  }, [data, searchTerm, filterDiocesis, filterEstado, filterSegmentacion]);

  // 4. Acción de cambio de estado mejorada
  const handleUpdateEstado = async (id: string, nuevoEstado: string, motivo?: string) => {
    if (nuevoEstado === 'rechazada') {
      const motivoRechazo = prompt("Motivo del rechazo (opcional):");
      if (motivoRechazo === null) return; // Usuario canceló
    }

    setIsUpdating(id);
    try {
      const updateData: any = { 
        estado: nuevoEstado,
        updated_at: new Date().toISOString()
      };
      
      if (nuevoEstado === 'aprobada') {
        const inscripcion = data.find(x => x.id === id);
        updateData.monto_pagado = inscripcion?.precio_pactado || 0;
        updateData.porcentaje_descuento_aplicado = inscripcion?.porcentaje_descuento_aplicado || 0;
      }

      const { error } = await supabase
        .from("inscripciones")
        .update(updateData)
        .eq("id", id);
      
      if (!error) {
        await fetchData();
        setSelectedInscripcion(null);
      } else {
        alert("Error al actualizar: " + error.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Ocurrió un error inesperado");
    } finally {
      setIsUpdating(null);
    }
  };

  // 5. Acciones en lote
  const handleBulkAction = async (accion: string) => {
    if (bulkActions.length === 0) {
      alert("Selecciona al menos una inscripción");
      return;
    }

    if (!confirm(`¿${accion === 'aprobar' ? 'Aprobar' : 'Rechazar'} ${bulkActions.length} inscripción(es)?`)) {
      return;
    }

    setIsUpdating("bulk");
    try {
      const { error } = await supabase
        .from("inscripciones")
        .update({ 
          estado: accion === 'aprobar' ? 'aprobada' : 'rechazada',
          monto_pagado: accion === 'aprobar' ? supabase.rpc('get_precio_pactado') : 0,
          updated_at: new Date().toISOString()
        })
        .in('id', bulkActions);

      if (!error) {
        await fetchData();
        setBulkActions([]);
        alert(`${bulkActions.length} inscripción(es) ${accion === 'aprobar' ? 'aprobadas' : 'rechazadas'} correctamente`);
      } else {
        throw error;
      }
    } catch (error: any) {
      alert("Error en acción masiva: " + error.message);
    } finally {
      setIsUpdating(null);
    }
  };

  // 6. Generar PDF de reporte
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
      pdf.text("Reporte de Validación", pdfWidth / 2, 15, { align: "center" });
      pdf.setFontSize(12);
      pdf.text(eventoActivo?.nombre || "Evento", pdfWidth / 2, 22, { align: "center" });
      pdf.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pdfWidth / 2, 29, { align: "center" });
      
      // Dashboard principal
      pdf.addImage(imgData, "PNG", 10, 40, pdfWidth - 20, pdfHeight * (pdfWidth - 20) / pdfWidth);
      
      // Página adicional con detalles
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text("Resumen de Validación", 20, 20);
      
      const detalles = [
        `Total Inscritos: ${stats.total}`,
        `Pendientes: ${stats.pendientes}`,
        `Aprobados: ${stats.aprobados}`,
        `Rechazados: ${stats.rechazados}`,
        `Recaudo Validado: $${stats.recaudoReal.toLocaleString()}`,
        `Recaudo Pendiente: $${stats.recaudoPendiente.toLocaleString()}`,
        `Tasa de Aprobación: ${stats.total > 0 ? ((stats.aprobados / stats.total) * 100).toFixed(1) : 0}%`,
        `Última actualización: ${format(new Date(), "HH:mm:ss")}`
      ];
      
      detalles.forEach((line, index) => {
        pdf.text(line, 20, 40 + (index * 10));
      });
      
      // Lista de pendientes
      pdf.setFontSize(14);
      pdf.text("Inscripciones Pendientes:", 20, 130);
      
      let yPos = 140;
      inscritosFiltrados
        .filter(i => i.estado === 'pendiente')
        .slice(0, 20)
        .forEach((ins, idx) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`${idx + 1}. ${ins.nombre} ${ins.apellido} - ${ins.diocesis} - $${ins.precio_pactado}`, 20, yPos);
          yPos += 10;
        });
      
      pdf.save(`Validacion-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar el PDF. Por favor, intente nuevamente.");
    } finally {
      setExporting(false);
    }
  };

  // 7. Datos para gráficos
  const datosEstados = [
    { name: 'Pendientes', value: stats.pendientes, color: '#f59e0b' },
    { name: 'Aprobados', value: stats.aprobados, color: '#10b981' },
    { name: 'Rechazados', value: stats.rechazados, color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="relative">
          <Loader2 className="animate-spin text-indigo-600" size={64} />
          <div className="absolute inset-0 animate-ping bg-indigo-600/20 rounded-full"></div>
        </div>
        <p className="mt-6 text-lg font-semibold text-slate-700">Cargando módulo de validación...</p>
        <p className="text-sm text-slate-500 mt-2">Sincronizando con el evento activo</p>
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
                  <Shield className="text-indigo-600" size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                      Validación en Tiempo Real
                    </span>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse delay-100"></div>
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse delay-200"></div>
                    </div>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
                    Gestión de Inscripciones
                  </h1>
                  <p className="text-slate-500 flex items-center gap-2">
                    <Calendar size={14} />
                    {eventoActivo?.nombre || "Sin evento activo"}
                    <span className="mx-2">•</span>
                    <Clock size={14} />
                    {format(new Date(), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={fetchData}
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

          {/* ESTADÍSTICAS RÁPIDAS */}
          {showStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500">Pendientes</p>
                    <p className="text-3xl font-black text-amber-600 mt-2">{stats.pendientes}</p>
                  </div>
                  <Clock className="text-amber-600" size={32} />
                </div>
                <p className="text-sm text-slate-500 mt-4">Por validar</p>
              </div>
              
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500">Aprobados</p>
                    <p className="text-3xl font-black text-emerald-600 mt-2">{stats.aprobados}</p>
                  </div>
                  <CheckCircle className="text-emerald-600" size={32} />
                </div>
                <p className="text-sm text-slate-500 mt-4">Validados</p>
              </div>
              
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500">Recaudo Validado</p>
                    <p className="text-3xl font-black text-indigo-600 mt-2">
                      ${stats.recaudoReal.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="text-indigo-600" size={32} />
                </div>
                <p className="text-sm text-slate-500 mt-4">Fondos confirmados</p>
              </div>
              
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500">Por Validar</p>
                    <p className="text-3xl font-black text-rose-600 mt-2">
                      ${stats.recaudoPendiente.toLocaleString()}
                    </p>
                  </div>
                  <AlertCircle className="text-rose-600" size={32} />
                </div>
                <p className="text-sm text-slate-500 mt-4">En proceso</p>
              </div>
            </div>
          )}

          {/* GRÁFICO DE ESTADOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Distribución por Estado</h3>
                  <p className="text-slate-500 text-sm">Resumen de validaciones</p>
                </div>
                <button 
                  onClick={() => setShowStats(!showStats)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  {showStats ? 'Ocultar' : 'Mostrar'} estadísticas
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosEstados}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {datosEstados.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Acciones Rápidas</h3>
              <div className="space-y-4">
                <button 
                  onClick={() => handleBulkAction('aprobar')}
                  disabled={isUpdating === 'bulk' || bulkActions.length === 0}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <CheckCircle size={20} />
                  Aprobar Seleccionados ({bulkActions.length})
                </button>
                
                <button 
                  onClick={() => handleBulkAction('rechazar')}
                  disabled={isUpdating === 'bulk' || bulkActions.length === 0}
                  className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:border-rose-500 hover:text-rose-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <Ban size={20} />
                  Rechazar Seleccionados ({bulkActions.length})
                </button>
                
                <button 
                  onClick={() => setBulkActions(inscritosFiltrados.filter(i => i.estado === 'pendiente').map(i => i.id))}
                  className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-3"
                >
                  <Check size={18} />
                  Seleccionar Todos Pendientes
                </button>
                
                <button 
                  onClick={() => setBulkActions([])}
                  className="w-full py-3 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-3"
                >
                  <XCircle size={18} />
                  Limpiar Selección
                </button>
              </div>
            </div>
          </div>

          {/* FILTROS AVANZADOS */}
          <div className="bg-white p-8 rounded-3xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Filtros de Búsqueda</h3>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-slate-600 hover:text-indigo-600"
              >
                {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
              </button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <option value="pendiente">Pendientes</option>
                    <option value="aprobada">Aprobadas</option>
                    <option value="rechazada">Rechazadas</option>
                    <option value="todos">Todos los estados</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Diocesis</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={filterDiocesis}
                    onChange={(e) => setFilterDiocesis(e.target.value)}
                  >
                    <option value="todas">Todas las diócesis</option>
                    {listaDiocesis.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Segmentación</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={filterSegmentacion}
                    onChange={(e) => setFilterSegmentacion(e.target.value)}
                  >
                    <option value="todas">Todos los perfiles</option>
                    {listaSegmentaciones.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-500">
                  {inscritosFiltrados.length} resultados
                  {searchTerm && ` para "${searchTerm}"`}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">
                  Seleccionados: <span className="font-bold">{bulkActions.length}</span>
                </span>
              </div>
            </div>
          </div>

          {/* TABLA DE INSCRIPCIONES */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={inscritosFiltrados.length > 0 && bulkActions.length === inscritosFiltrados.filter(i => i.estado === 'pendiente').length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkActions(inscritosFiltrados.filter(i => i.estado === 'pendiente').map(i => i.id));
                          } else {
                            setBulkActions([]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Participante</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Información</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Comprobante</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inscritosFiltrados.map((inscripcion) => (
                    <tr 
                      key={inscripcion.id} 
                      className={`hover:bg-slate-50 transition-colors ${
                        selectedInscripcion?.id === inscripcion.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        {inscripcion.estado === 'pendiente' && (
                          <input
                            type="checkbox"
                            checked={bulkActions.includes(inscripcion.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkActions([...bulkActions, inscripcion.id]);
                              } else {
                                setBulkActions(bulkActions.filter(id => id !== inscripcion.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        )}
                      </td>
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
                          <p className="text-sm text-slate-700 flex items-center gap-1">
                            <Building size={12} /> {inscripcion.diocesis || 'Sin asignar'}
                          </p>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <UserCheck size={12} /> {inscripcion.segmentacion || 'Sin perfil'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(inscripcion.created_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {inscripcion.imagen_url ? (
                          <a 
                            href={inscripcion.imagen_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
                          >
                            <Eye size={16} />
                            Ver Recibo
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400">Sin comprobante</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900">
                            ${(inscripcion.precio_pactado || 0).toLocaleString()}
                          </p>
                          {inscripcion.estado === 'aprobada' && (
                            <p className="text-sm text-emerald-600">
                              Pagado: ${(inscripcion.monto_pagado || 0).toLocaleString()}
                            </p>
                          )}
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
                            <Ban size={12} />
                          )}
                          {inscripcion.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isUpdating === inscripcion.id ? (
                          <Loader2 className="animate-spin text-indigo-600" size={20} />
                        ) : (
                          <div className="flex items-center gap-2">
                            {inscripcion.estado !== 'aprobada' && (
                              <button
                                onClick={() => handleUpdateEstado(inscripcion.id, 'aprobada')}
                                className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2"
                              >
                                <Check size={16} />
                                Aprobar
                              </button>
                            )}
                            {inscripcion.estado !== 'rechazada' && (
                              <button
                                onClick={() => handleUpdateEstado(inscripcion.id, 'rechazada')}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:border-rose-500 hover:text-rose-500 transition-colors flex items-center gap-2"
                              >
                                <Ban size={16} />
                                Rechazar
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedInscripcion(selectedInscripcion?.id === inscripcion.id ? null : inscripcion)}
                              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              <MoreVertical size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {inscritosFiltrados.length === 0 && (
                <div className="p-12 text-center">
                  <AlertTriangle className="mx-auto text-slate-400" size={48} />
                  <p className="mt-4 text-slate-500 font-bold">No se encontraron inscripciones</p>
                  <p className="text-sm text-slate-400 mt-2">
                    Intenta ajustar los filtros o verifica si hay inscripciones pendientes
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE DETALLE */}
      {selectedInscripcion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Detalle de Inscripción</h3>
              <button
                onClick={() => setSelectedInscripcion(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-2">Nombre Completo</p>
                  <p className="text-lg font-bold text-slate-900">
                    {selectedInscripcion.nombre} {selectedInscripcion.apellido}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-2">Documento</p>
                  <p className="text-lg font-bold text-slate-900">{selectedInscripcion.documento || 'No registrado'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-2">Email</p>
                  <p className="text-lg font-bold text-slate-900">{selectedInscripcion.email}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-2">Teléfono</p>
                  <p className="text-lg font-bold text-slate-900">{selectedInscripcion.telefono || 'No registrado'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-2">Diocesis</p>
                  <p className="text-lg font-bold text-slate-900">{selectedInscripcion.diocesis || 'Sin asignar'}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-2">Perfil</p>
                  <p className="text-lg font-bold text-slate-900">{selectedInscripcion.segmentacion || 'Sin perfil'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-2">Valor Pactado</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    ${(selectedInscripcion.precio_pactado || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-2">Fecha de Registro</p>
                  <p className="text-lg font-bold text-slate-900">
                    {format(new Date(selectedInscripcion.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
              
              {selectedInscripcion.imagen_url && (
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-2">Comprobante</p>
                  <a 
                    href={selectedInscripcion.imagen_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                  >
                    <Eye size={20} />
                    Ver Comprobante Completo
                  </a>
                </div>
              )}
              
              <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                <button
                  onClick={() => setSelectedInscripcion(null)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cerrar
                </button>
                {selectedInscripcion.estado !== 'aprobada' && (
                  <button
                    onClick={() => handleUpdateEstado(selectedInscripcion.id, 'aprobada')}
                    className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle size={20} />
                    Aprobar Inscripción
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}