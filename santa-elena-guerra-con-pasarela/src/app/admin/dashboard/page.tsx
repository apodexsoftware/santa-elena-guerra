"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Search, Filter, 
  User, AlertCircle, Loader2, Clock,
  Download, DollarSign, Building, Mail, Phone,
  ChevronDown, ChevronUp, Shield,
  RefreshCw, AlertTriangle, 
  Plane, Bus, Eye, XCircle
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';

// Colores EN CAR
const colors = {
  verde: "#009944",
  azul: "#1E5CAA",
  amarillo: "#FFF200",
  rojo: "#ED1C24",
  rosa: "#EC008C",
  azulOscuro: "#1E2D69",
  rojoOscuro: "#B41919",
  grisClaro: "#E6E7E8",
};

export default function VistaInscripciones() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDiocesis, setFilterDiocesis] = useState("todas");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterSegmentacion, setFilterSegmentacion] = useState("todas");
  const [filterTransporte, setFilterTransporte] = useState("todos");
  const [eventoActivo, setEventoActivo] = useState<any>(null);
  const [selectedInscripcion, setSelectedInscripcion] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    recaudoReal: 0,
    recaudoPendiente: 0
  });

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

  const listaDiocesis = useMemo(() => {
    return Array.from(new Set(data.map(i => i.diocesis).filter(Boolean))).sort();
  }, [data]);

  const listaSegmentaciones = useMemo(() => {
    return Array.from(new Set(data.map(i => i.segmentacion).filter(Boolean))).sort();
  }, [data]);

  const inscritosFiltrados = useMemo(() => {
    return data.filter((i) => {
      const matchEstado = filterEstado === "todos" || i.estado === filterEstado;
      const matchSearch = searchTerm === "" || 
        (i.nombre + " " + i.apellido).toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.documento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.telefono?.includes(searchTerm);
      const matchDiocesis = filterDiocesis === "todas" || i.diocesis === filterDiocesis;
      const matchSegmentacion = filterSegmentacion === "todas" || i.segmentacion === filterSegmentacion;
      const matchTransporte = filterTransporte === "todos" || i.medio_transporte === filterTransporte;
      
      return matchEstado && matchSearch && matchDiocesis && matchSegmentacion && matchTransporte;
    });
  }, [data, searchTerm, filterDiocesis, filterEstado, filterSegmentacion, filterTransporte]);

  const exportarExcel = () => {
    if (exporting || inscritosFiltrados.length === 0) return;
    
    setExporting(true);
    try {
      const datosExportar = inscritosFiltrados.map(i => ({
        'ID': i.id,
        'Nombre': i.nombre,
        'Apellido': i.apellido,
        'Documento': i.documento,
        'Email': i.email,
        'Teléfono': i.telefono || 'No registrado',
        'Diocesis': i.diocesis || 'Sin asignar',
        'Perfil': i.segmentacion || 'Sin perfil',
        'EPS': i.entidadSalud || 'No registrada',
        'Hospedaje': i.hospedaje === 'si' ? 'Sí' : 'No',
        'Medio de Transporte': i.medio_transporte || 'No especificado',
        'Valor Pactado': i.precio_pactado || 0,
        'Monto Pagado': i.monto_pagado || 0,
        'Estado': i.estado,
        'Fecha Registro': format(new Date(i.created_at), "dd/MM/yyyy HH:mm"),
        'Fecha Actualización': i.updated_at ? format(new Date(i.updated_at), "dd/MM/yyyy HH:mm") : 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(datosExportar);
      
      const colWidths = [
        { wch: 36 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
        { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
        { wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 15 },
        { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 20 }
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inscripciones");
      
      const nombreArchivo = `Inscripciones-${eventoActivo?.nombre || 'Evento'}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
    } catch (error) {
      console.error("Error exportando Excel:", error);
      alert("Error al generar el archivo Excel");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: colors.grisClaro }}
      >
        <Loader2 className="animate-spin mb-4" size={48} style={{ color: colors.azul }} />
        <p className="text-lg font-semibold" style={{ color: colors.azulOscuro }}>Cargando inscripciones...</p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-4 md:p-6"
      style={{ backgroundColor: colors.grisClaro }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${colors.azul}15` }}
                >
                  <Shield style={{ color: colors.azul }} size={24} />
                </div>
                <div>
                  <h1 
                    className="text-2xl md:text-3xl font-bold mt-1"
                    style={{ color: colors.azulOscuro }}
                  >
                    Vista de Inscripciones
                  </h1>
                  <p 
                    className="text-sm flex items-center gap-2"
                    style={{ color: colors.azulOscuro, opacity: 0.6 }}
                  >
                    <Clock size={14} />
                    {eventoActivo?.nombre || "Sin evento activo"}
                    <span className="mx-2">•</span>
                    {format(new Date(), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={fetchData}
                className="px-4 py-2 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border-2"
                style={{ 
                  backgroundColor: 'white',
                  borderColor: colors.grisClaro,
                  color: colors.azulOscuro
                }}
              >
                <RefreshCw size={18} />
                Actualizar
              </button>
              
              <button 
                onClick={exportarExcel}
                disabled={exporting || inscritosFiltrados.length === 0}
                className="px-6 py-2 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-white"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.verde} 0%, ${colors.azul} 100%)`
                }}
              >
                {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                {exporting ? "Generando..." : "Exportar Excel"}
              </button>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Inscritos', value: stats.total, icon: User, color: colors.azul },
              { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: colors.amarillo },
              { label: 'Aprobados', value: stats.aprobados, icon: Shield, color: colors.verde },
              { label: 'Rechazados', value: stats.rechazados, icon: AlertCircle, color: colors.rojo },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold" style={{ color: colors.azulOscuro, opacity: 0.6 }}>{stat.label}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                  <stat.icon size={28} style={{ color: stat.color, opacity: 0.3 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FILTROS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: colors.azulOscuro }}>Filtros de Búsqueda</h3>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 font-medium"
              style={{ color: colors.azulOscuro }}
            >
              {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro }}>Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: colors.azulOscuro, opacity: 0.5 }} />
                  <input
                    type="text"
                    placeholder="Nombre, email, doc, tel..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 focus:outline-none transition-all"
                    style={{ 
                      borderColor: colors.grisClaro,
                      color: colors.azulOscuro
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = colors.azul}
                    onBlur={(e) => e.currentTarget.style.borderColor = colors.grisClaro}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro }}>Estado</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none"
                  style={{ 
                    borderColor: colors.grisClaro,
                    color: colors.azulOscuro
                  }}
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="aprobada">Aprobadas</option>
                  <option value="rechazada">Rechazadas</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro }}>Diócesis</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none"
                  style={{ 
                    borderColor: colors.grisClaro,
                    color: colors.azulOscuro
                  }}
                  value={filterDiocesis}
                  onChange={(e) => setFilterDiocesis(e.target.value)}
                >
                  <option value="todas">Todas</option>
                  {listaDiocesis.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro }}>Perfil</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none"
                  style={{ 
                    borderColor: colors.grisClaro,
                    color: colors.azulOscuro
                  }}
                  value={filterSegmentacion}
                  onChange={(e) => setFilterSegmentacion(e.target.value)}
                >
                  <option value="todas">Todos</option>
                  {listaSegmentaciones.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro }}>Transporte</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none"
                  style={{ 
                    borderColor: colors.grisClaro,
                    color: colors.azulOscuro
                  }}
                  value={filterTransporte}
                  onChange={(e) => setFilterTransporte(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="Avión">Avión</option>
                  <option value="Autobús">Autobús</option>
                </select>
              </div>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: colors.grisClaro }}>
            <span className="text-sm" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
              {inscritosFiltrados.length} resultados encontrados
            </span>
          </div>
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.grisClaro }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Participante</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Información</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Transporte</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.grisClaro }}>
                {inscritosFiltrados.map((inscripcion) => (
                  <tr 
                    key={inscripcion.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white"
                          style={{ background: `linear-gradient(135deg, ${colors.verde} 0%, ${colors.azul} 100%)` }}
                        >
                          {inscripcion.nombre[0]}{inscripcion.apellido[0]}
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: colors.azulOscuro }}>
                            {inscripcion.nombre} {inscripcion.apellido}
                          </p>
                          <p className="text-xs" style={{ color: colors.azulOscuro, opacity: 0.6 }}>{inscripcion.documento}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1" style={{ color: colors.azulOscuro }}>
                          <Mail size={12} style={{ color: colors.azul }} /> {inscripcion.email}
                        </p>
                        <p className="text-sm flex items-center gap-1" style={{ color: colors.azulOscuro }}>
                          <Phone size={12} style={{ color: colors.verde }} /> {inscripcion.telefono || 'No registrado'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1" style={{ color: colors.azulOscuro }}>
                          <Building size={12} style={{ color: colors.azulOscuro, opacity: 0.5 }} /> {inscripcion.diocesis || 'Sin asignar'}
                        </p>
                        <p className="text-sm" style={{ color: colors.azulOscuro, opacity: 0.8 }}>
                          {inscripcion.segmentacion || 'Sin perfil'}
                        </p>
                        <p className="text-xs" style={{ color: colors.azulOscuro, opacity: 0.5 }}>
                          {format(new Date(inscripcion.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {inscripcion.mediodetransporte === 'Avión' ? (
                          <Plane size={16} style={{ color: colors.azul }} />
                        ) : inscripcion.mediodetransporte === 'Autobús' ? (
                          <Bus size={16} style={{ color: colors.verde }} />
                        ) : (
                          <AlertCircle size={16} style={{ color: colors.amarillo }} />
                        )}
                        <span className="text-sm font-medium" style={{ color: colors.azulOscuro }}>
                          {inscripcion.mediodetransporte || 'No especificado'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold" style={{ color: colors.azulOscuro }}>
                        ${(inscripcion.precio_pactado || 0).toLocaleString()}
                      </p>
                      {inscripcion.estado === 'aprobada' && (
                        <p className="text-xs" style={{ color: colors.verde }}>
                          Pagado: ${(inscripcion.monto_pagado || 0).toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: inscripcion.estado === 'aprobada' ? `${colors.verde}20` : 
                                          inscripcion.estado === 'pendiente' ? `${colors.amarillo}20` : `${colors.rojo}20`,
                          color: inscripcion.estado === 'aprobada' ? colors.verde : 
                                 inscripcion.estado === 'pendiente' ? colors.azulOscuro : colors.rojo
                        }}
                      >
                        {inscripcion.estado === 'aprobada' ? 'Aprobada' : 
                         inscripcion.estado === 'pendiente' ? 'Pendiente' : 'Rechazada'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedInscripcion(inscripcion)}
                        className="px-3 py-1.5 rounded-lg text-sm font-bold text-white transition-colors hover:opacity-90 flex items-center gap-1"
                        style={{ background: `linear-gradient(135deg, ${colors.azul} 0%, ${colors.verde} 100%)` }}
                      >
                        <Eye size={14} />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {inscritosFiltrados.length === 0 && (
              <div className="p-12 text-center">
                <AlertTriangle size={48} style={{ color: colors.amarillo, margin: '0 auto' }} />
                <p className="mt-4 font-bold" style={{ color: colors.azulOscuro }}>No se encontraron inscripciones</p>
                <p className="text-sm mt-2" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                  Intenta ajustar los filtros
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE DETALLE */}
      {selectedInscripcion && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: `${colors.azulOscuro}80` }}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div 
              className="p-6 border-b flex items-center justify-between"
              style={{ borderColor: colors.grisClaro }}
            >
              <h3 className="text-xl font-bold" style={{ color: colors.azulOscuro }}>Detalle de Inscripción</h3>
              <button
                onClick={() => setSelectedInscripcion(null)}
                style={{ color: colors.azulOscuro, opacity: 0.5 }}
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Nombre</p>
                  <p className="text-lg font-bold" style={{ color: colors.azulOscuro }}>
                    {selectedInscripcion.nombre} {selectedInscripcion.apellido}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Documento</p>
                  <p className="text-lg font-bold" style={{ color: colors.azulOscuro }}>{selectedInscripcion.documento || 'N/A'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Email</p>
                  <p className="font-bold" style={{ color: colors.azulOscuro }}>{selectedInscripcion.email}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Teléfono</p>
                  <p className="font-bold" style={{ color: colors.azulOscuro }}>{selectedInscripcion.telefono || 'No registrado'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Medio de Transporte</p>
                  <div className="flex items-center gap-2">
                    {selectedInscripcion.mediodetransporte === 'Avión' ? (
                      <Plane size={18} style={{ color: colors.azul }} />
                    ) : (
                      <Bus size={18} style={{ color: colors.verde }} />
                    )}
                    <p className="font-bold" style={{ color: colors.azulOscuro }}>
                      {selectedInscripcion.mediodetransporte || 'No especificado'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Hospedaje</p>
                  <p className="font-bold" style={{ color: colors.azulOscuro }}>
                    {selectedInscripcion.hospedaje === 'si' ? 'Sí requiere' : 'No requiere'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Diocesis</p>
                  <p className="font-bold" style={{ color: colors.azulOscuro }}>{selectedInscripcion.diocesis || 'Sin asignar'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Perfil</p>
                  <p className="font-bold" style={{ color: colors.azulOscuro }}>{selectedInscripcion.segmentacion || 'Sin perfil'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Valor Pactado</p>
                  <p className="text-2xl font-bold" style={{ color: colors.azul }}>
                    ${(selectedInscripcion.precio_pactado || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Estado</p>
                  <span 
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: selectedInscripcion.estado === 'aprobada' ? `${colors.verde}20` : 
                                      selectedInscripcion.estado === 'pendiente' ? `${colors.amarillo}20` : `${colors.rojo}20`,
                      color: selectedInscripcion.estado === 'aprobada' ? colors.verde : 
                             selectedInscripcion.estado === 'pendiente' ? colors.azulOscuro : colors.rojo
                    }}
                  >
                    {selectedInscripcion.estado === 'aprobada' ? 'Aprobada' : 
                     selectedInscripcion.estado === 'pendiente' ? 'Pendiente' : 'Rechazada'}
                  </span>
                </div>
              </div>
              
              {selectedInscripcion.imagen_url && (
                <div>
                  <p className="text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Comprobante</p>
                  <a 
                    href={selectedInscripcion.imagen_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-colors hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${colors.azul} 0%, ${colors.verde} 100%)` }}
                  >
                    <Eye size={18} />
                    Ver Comprobante
                  </a>
                </div>
              )}
              
              <div 
                className="pt-4 border-t flex justify-end"
                style={{ borderColor: colors.grisClaro }}
              >
                <button
                  onClick={() => setSelectedInscripcion(null)}
                  className="px-6 py-2 rounded-lg font-bold text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: colors.azulOscuro }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
