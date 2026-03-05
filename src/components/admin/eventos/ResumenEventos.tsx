"use client";
import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  Trophy, Users, DollarSign, Download, Calendar, MapPin, 
  Percent, Home, ShieldCheck, Loader2, TrendingUp,
  FileText, CheckCircle, Clock, AlertCircle
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Tipos para TypeScript
interface Evento {
  id: string;
  nombre: string;
  fecha_inicio: string;
  meta_recaudacion: number;
  ubicacion?: string;
  esta_activo: boolean;
  configuracion_evento?: any;
}

interface Inscripcion {
  monto_pagado: number;
  estado: string;
  hospedaje: string;
  diocesis: string;
  created_at: string;
  precio_pagado?: number;
}

interface Estadisticas {
  totalInscritos: number;
  totalRecaudado: number;
  porcentajeMeta: number;
  conHospedaje: number;
  aprobados: number;
  pendientes: number;
  rechazados: number;
  promedioPago: number;
  metaFaltante: number;
  efectividad: number;
  porJurisdiccion: Array<{ name: string; value: number }>;
  evolucionDiaria?: Array<{ fecha: string; recaudado: number; inscritos: number }>;
}

interface KPICardProps {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  color: "indigo" | "emerald" | "amber" | "rose" | "blue" | "purple";
  trend?: number;
}

interface LogisticsItemProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
}

export default function ResumenEventoActual() {
  const supabase = createClient();
  const [data, setData] = useState<{ info: Evento; stats: Estadisticas } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFullEventData();
  }, []);

  const fetchFullEventData = async () => {
    setLoading(true);
    try {
      // 1. Obtener evento activo
      const { data: evento, error: eventoError } = await supabase
        .from('eventos')
        .select('*, configuracion_evento(*)')
        .eq('esta_activo', true)
        .single();

      if (eventoError || !evento) {
        console.error("Error al obtener evento:", eventoError);
        setLoading(false);
        return;
      }

      // 2. Obtener inscripciones del evento
      const { data: inscripciones, error: inscError } = await supabase
        .from('inscripciones')
        .select('*')
        .eq('evento_id', evento.id);

      if (inscError) {
        console.error("Error al obtener inscripciones:", inscError);
        setLoading(false);
        return;
      }

      // 3. Calcular estadísticas
      const stats = await processStats(evento, inscripciones || []);
      
      // 4. Obtener evolución diaria (últimos 7 días)
      const evolucion = await getEvolucionDiaria(evento.id);
      if (evolucion) {
        stats.evolucionDiaria = evolucion;
      }

      setData({ info: evento, stats });
    } catch (error) {
      console.error("Error en fetchFullEventData:", error);
    } finally {
      setLoading(false);
    }
  };

  const processStats = async (evento: Evento, inscripciones: any[]): Promise<Estadisticas> => {
    const totalRecaudado = inscripciones.reduce((acc, curr) => 
      acc + Number(curr.monto_pagado || 0 || 0), 0);
    
    const meta = Number(evento.meta_recaudacion) || 1;
    const totalInscritos = inscripciones.length;
    
    const aprobados = inscripciones.filter(i => i.estado === 'aprobada').length;
    const pendientes = inscripciones.filter(i => i.estado === 'pendiente').length;
    const rechazados = inscripciones.filter(i => i.estado === 'rechazada').length;
    
    // Agrupar por jurisdicción
    const jurisdiccionesMap = inscripciones.reduce((acc: Record<string, number>, curr) => {
      const diocesis = curr.diocesis || 'Sin jurisdicción';
      acc[diocesis] = (acc[diocesis] || 0) + 1;
      return acc;
    }, {});

    const porJurisdiccion = Object.entries(jurisdiccionesMap)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalInscritos,
      totalRecaudado,
      porcentajeMeta: Math.min((totalRecaudado / meta) * 100, 100),
      conHospedaje: inscripciones.filter(i => i.hospedaje === 'si').length,
      aprobados,
      pendientes,
      rechazados,
      promedioPago: totalInscritos > 0 ? totalRecaudado / totalInscritos : 0,
      metaFaltante: Math.max(meta - totalRecaudado, 0),
      efectividad: totalInscritos > 0 ? (aprobados / totalInscritos) * 100 : 0,
      porJurisdiccion
    };
  };

  const getEvolucionDiaria = async (eventoId: string) => {
    try {
      const { data: inscripciones } = await supabase
        .from('inscripciones')
        .select('created_at, monto_pagado')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: true });

      if (!inscripciones) return null;

      // Agrupar por día (últimos 7 días)
      const sieteDiasAtras = new Date();
      sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);

      const porDia: Record<string, { recaudado: number; inscritos: number }> = {};

      inscripciones.forEach(insc => {
        if (new Date(insc.created_at) >= sieteDiasAtras) {
          const fecha = format(new Date(insc.created_at), 'dd/MM', { locale: es });
          if (!porDia[fecha]) {
            porDia[fecha] = { recaudado: 0, inscritos: 0 };
          }
          porDia[fecha].recaudado += Number(insc.monto_pagado || 0);
          porDia[fecha].inscritos += 1;
        }
      });

      // Convertir a array y ordenar por fecha
      return Object.entries(porDia)
        .map(([fecha, datos]) => ({ fecha, recaudado: datos.recaudado, inscritos: datos.inscritos }))
        .sort((a, b) => {
          const [diaA, mesA] = a.fecha.split('/').map(Number);
          const [diaB, mesB] = b.fecha.split('/').map(Number);
          return mesA - mesB || diaA - diaB;
        });
    } catch (error) {
      console.error("Error al obtener evolución diaria:", error);
      return null;
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current || !data || exporting) return;
    
    setExporting(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Agregar título
      pdf.setFontSize(20);
      pdf.text("Reporte del Evento", pdfWidth / 2, 15, { align: "center" });
      pdf.setFontSize(12);
      pdf.text(data.info.nombre, pdfWidth / 2, 22, { align: "center" });
      pdf.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pdfWidth / 2, 28, { align: "center" });
      
      // Agregar imagen del dashboard
      pdf.addImage(imgData, "PNG", 10, 35, pdfWidth - 20, pdfHeight * (pdfWidth - 20) / pdfWidth);
      
      // Agregar información adicional en nuevas páginas
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text("Detalles del Evento", 20, 20);
      pdf.setFontSize(12);
      
      const detalles = [
        `Nombre: ${data.info.nombre}`,
        `Ubicación: ${data.info.ubicacion || 'No especificada'}`,
        `Fecha de inicio: ${format(new Date(data.info.fecha_inicio), "PPP", { locale: es })}`,
        `Meta de recaudación: $${data.info.meta_recaudacion.toLocaleString()}`,
        `Recaudado hasta ahora: $${data.stats.totalRecaudado.toLocaleString()}`,
        `Porcentaje alcanzado: ${data.stats.porcentajeMeta.toFixed(1)}%`,
        `Total inscritos: ${data.stats.totalInscritos}`,
        `Inscritos aprobados: ${data.stats.aprobados}`,
        `Solicitudes de hospedaje: ${data.stats.conHospedaje}`
      ];
      
      detalles.forEach((line, index) => {
        pdf.text(line, 20, 40 + (index * 10));
      });
      
      pdf.save(`Reporte-${data.info.nombre.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Hubo un error al generar el PDF. Por favor, inténtalo de nuevo.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="animate-spin text-indigo-600" size={64} />
        <p className="mt-6 text-slate-600 font-medium">Cargando dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <AlertCircle className="text-amber-500" size={64} />
        <h1 className="text-2xl font-bold text-slate-800 mt-6">No hay evento activo</h1>
        <p className="text-slate-600 mt-2">Actualmente no hay ningún evento activo para mostrar.</p>
      </div>
    );
  }

  const chartData = data.stats.evolucionDiaria || [
    { fecha: 'Inicio', recaudado: 0 },
    { fecha: 'Actual', recaudado: data.stats.totalRecaudado }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* BARRA DE ACCIONES */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm">
          <div>
            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900">
              Dashboard <span className="text-indigo-600">En Vivo</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Calendar size={16} className="text-slate-400" />
              <p className="text-slate-500 font-medium">{data.info.nombre}</p>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                Activo
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleExportPDF}
            disabled={exporting}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold uppercase text-sm tracking-wider flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Download size={18} />
            )}
            {exporting ? 'Generando PDF...' : 'Exportar Reporte'}
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div ref={reportRef} className="space-y-8">
          {/* FILA 1: KPIs PRINCIPALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard 
              title="Recaudado" 
              value={`$${data.stats.totalRecaudado.toLocaleString()}`} 
              sub={`Meta: $${data.info.meta_recaudacion.toLocaleString()}`} 
              icon={<DollarSign />} 
              color="indigo"
              trend={data.stats.porcentajeMeta}
            />
            <KPICard 
              title="Inscritos" 
              value={data.stats.totalInscritos} 
              sub={`${data.stats.aprobados} aprobados`} 
              icon={<Users />} 
              color="emerald"
            />
            <KPICard 
              title="Progreso Meta" 
              value={`${data.stats.porcentajeMeta.toFixed(1)}%`} 
              sub="Del objetivo total" 
              icon={<Percent />} 
              color="amber"
              trend={data.stats.porcentajeMeta}
            />
            <KPICard 
              title="Hospedajes" 
              value={data.stats.conHospedaje} 
              sub="Cupos solicitados" 
              icon={<Home />} 
              color="rose"
            />
          </div>

          {/* FILA 2: GRÁFICOS Y TOP JURISDICCIONES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* GRÁFICO DE PROGRESO */}
            <div className="lg:col-span-8 bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Trophy size={18} className="text-indigo-600" /> 
                    Rendimiento de Recaudación
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">Evolución en los últimos 7 días</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                    <span className="text-xs text-slate-600">Recaudación</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRecaudo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="fecha" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Recaudado']}
                      labelFormatter={(label) => `Fecha: ${label}`}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="recaudado" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRecaudo)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TOP JURISDICCIONES */}
            <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-slate-800 p-6 md:p-10 rounded-3xl text-white">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-300">Top Jurisdicciones</h3>
                <Users size={20} className="text-indigo-400" />
              </div>
              
              <div className="space-y-6 mb-8">
                {data.stats.porJurisdiccion.map((j, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                        <span className="text-lg font-black text-indigo-300">{i + 1}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm truncate max-w-[120px]">{j.name}</p>
                        <p className="text-xs text-slate-400">{j.value} inscritos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${(j.value / data.stats.totalInscritos) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {((j.value / data.stats.totalInscritos) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase opacity-90">Ubicación del Evento</p>
                    <p className="font-bold text-lg mt-1">{data.info.ubicacion || 'Por definir'}</p>
                  </div>
                  <MapPin size={28} className="text-white/80" />
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <Clock size={14} />
                  <span>
                    Inicia: {format(new Date(data.info.fecha_inicio), "dd 'de' MMMM", { locale: es })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FILA 3: ESTADÍSTICAS DETALLADAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="text-emerald-600" size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado Inscripciones</p>
                  <p className="text-2xl font-black text-slate-900">{data.stats.aprobados}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-sm">Aprobadas</span>
                  <span className="font-bold text-emerald-600">{data.stats.aprobados}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-sm">Pendientes</span>
                  <span className="font-bold text-amber-500">{data.stats.pendientes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-sm">Rechazadas</span>
                  <span className="font-bold text-rose-500">{data.stats.rechazados}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Métricas Financieras</p>
                  <p className="text-2xl font-black text-slate-900">
                    ${data.stats.promedioPago.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
              <LogisticsItem label="Promedio de Pago" value={`$${data.stats.promedioPago.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <LogisticsItem label="Meta Faltante" value={`$${data.stats.metaFaltante.toLocaleString()}`} />
              <LogisticsItem label="Efectividad" value={`${data.stats.efectividad.toFixed(1)}%`} />
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <FileText className="text-purple-600" size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumen Evento</p>
                  <p className="text-2xl font-black text-slate-900">
                    {format(new Date(data.info.fecha_inicio), "dd/MM")}
                  </p>
                </div>
              </div>
              <LogisticsItem label="Fecha Inicio" value={format(new Date(data.info.fecha_inicio), "dd 'de' MMMM", { locale: es })} />
              <LogisticsItem label="Meta Recaudación" value={`$${data.info.meta_recaudacion.toLocaleString()}`} />
              <LogisticsItem label="Porcentaje Alcanzado" value={`${data.stats.porcentajeMeta.toFixed(1)}%`} />
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 rounded-3xl text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/80 uppercase tracking-wider">Resumen Operativo</p>
                  <p className="text-2xl font-black">Dashboard</p>
                </div>
              </div>
              <p className="text-sm mb-6 text-white/90">
                Información en tiempo real del evento activo. Todos los datos se actualizan automáticamente.
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white/80">Última actualización</p>
                  <p className="font-bold">{format(new Date(), "HH:mm:ss")}</p>
                </div>
                <button 
                  onClick={fetchFullEventData}
                  className="px-4 py-2 bg-white text-indigo-600 text-sm font-bold rounded-xl hover:bg-white/90 transition-colors"
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, sub, icon, color, trend }: KPICardProps) {
  const colorClasses = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100"
  };

  return (
    <div className={`bg-white p-6 rounded-3xl shadow-sm border ${colorClasses[color]} hover:shadow-lg transition-all duration-300 group`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-14 h-14 ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          {React.cloneElement(icon as React.ReactElement, { size: 24 } as any)}
        </div>
        {trend !== undefined && (
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <h4 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">{value}</h4>
      <p className="text-sm text-slate-500">{sub}</p>
    </div>
  );
}

function LogisticsItem({ label, value, icon, description }: LogisticsItemProps) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-medium text-slate-600">{label}</p>
        </div>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
    </div>
  );
}