"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/clients";
import { 
  PieChart as PieChartIcon, Map, Wallet, FileText, 
  Download, Filter, ChevronDown, TrendingUp, Users, 
  Landmark, AlertCircle, Calendar, Loader2, FileSpreadsheet,
  AlertTriangle 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend 
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CentroAnalisisAvanzado() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'resumen' | 'demografia' | 'finanzas' | 'exportar'>('resumen');
  const [data, setData] = useState<any>(null);
  const [evento, setEvento] = useState<any>(null);

  useEffect(() => {
    async function loadDeepAnalytics() {
      setLoading(true);
      try {
        // 1. Obtener Evento Activo
        const { data: ev } = await supabase
          .from('eventos')
          .select('*')
          .eq('esta_activo', true)
          .maybeSingle();

        if (!ev) { 
          // Si no hay evento, paramos aquí
          setLoading(false); 
          return; 
        }
        setEvento(ev);

        // 2. Obtener TODA la data cruda
        const { data: inscripciones, error } = await supabase
          .from('inscripciones')
          .select(`
            *,
            tipos_persona (nombre, valor),
            jurisdicciones (nombre)
          `)
          .eq('evento_id', ev.id);

        if (error) throw error;

        // 3. Procesar datos (Si no hay inscripciones, enviamos array vacío)
        const safeInscripciones = inscripciones || [];
        const stats = processData(safeInscripciones);
        setData({ raw: safeInscripciones, stats });

      } catch (err) {
        console.error("Error crítico en analítica:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDeepAnalytics();
  }, []);

  const processData = (rows: any[]) => {
    // A. Finanzas
    const totalRecaudado = rows.filter(r => r.estado === 'aprobado').reduce((acc, curr) => acc + (Number(curr.precio_pactado) || 0), 0);
    const totalPendiente = rows.filter(r => r.estado === 'pendiente').reduce((acc, curr) => acc + (Number(curr.precio_pactado) || 0), 0);
    
    // B. Demografía (Roles)
    const rolesCount = rows.reduce((acc: any, curr) => {
      const rol = curr.tipos_persona?.nombre || "General";
      acc[rol] = (acc[rol] || 0) + 1;
      return acc;
    }, {});
    const chartRoles = Object.keys(rolesCount).map(k => ({ name: k, value: rolesCount[k] }));

    // C. Geografía (Top 10)
    const dioCount = rows.reduce((acc: any, curr) => {
      const d = curr.diocesis || "Sin Asignar";
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});
    const chartDio = Object.keys(dioCount)
      .map(k => ({ name: k, value: dioCount[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // D. Línea de Tiempo
    const timeMap = rows.reduce((acc: any, curr) => {
      const date = new Date(curr.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    const chartTime = Object.keys(timeMap).map(k => ({ fecha: k, cantidad: timeMap[k] }));

    return { totalRecaudado, totalPendiente, chartRoles, chartDio, chartTime, total: rows.length };
  };

  const handleExportExcel = () => {
    if (!data?.raw || !evento) return;
    const wsData = data.raw.map((i: any) => ({
      "Fecha": new Date(i.created_at).toLocaleDateString(),
      "Nombre": i.nombre,
      "Apellido": i.apellido,
      "Documento": i.documento,
      "Email": i.email,
      "Rol": i.tipos_persona?.nombre,
      "Diócesis": i.diocesis,
      "Estado": i.estado,
      "Pago Pactado": i.precio_pactado
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Base Maestra");
    XLSX.writeFile(wb, `Reporte_${evento.slug}_${Date.now()}.xlsx`);
  };

  // --- RENDERS CONDICIONALES (Protecciones) ---

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Procesando Big Data...</p>
      </div>
    );
  }

  // 1. Si no hay evento activo
  if (!evento) {
    return (
      <div className="p-12 text-center bg-slate-50 rounded-[3rem] border border-slate-100">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-700">Sin Contexto Activo</h3>
        <p className="text-slate-500 text-sm mt-2">Activa un evento en la configuración para ver el análisis.</p>
      </div>
    );
  }

  // 2. LA CORRECCIÓN CLAVE: Si cargó, hay evento, pero data es null (posible error de red)
  if (!data || !data.stats) {
    return (
      <div className="p-12 text-center bg-rose-50 rounded-[3rem] border border-rose-100">
        <div className="w-16 h-16 bg-rose-200 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-lg font-black text-rose-900">Error de Datos</h3>
        <p className="text-rose-700 text-sm mt-2">No se pudieron calcular las estadísticas. Intenta recargar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
            Centro de <span className="text-indigo-600">Inteligencia</span>
          </h2>
          <p className="text-slate-500 font-medium mt-2">
            Analítica para: <span className="text-slate-900 font-bold">{evento.nombre}</span>
          </p>
        </div>
        
        {/* NAVEGACIÓN DE TABS */}
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-2xl">
          {[
            { id: 'resumen', icon: <TrendingUp size={16} />, label: 'Global' },
            { id: 'demografia', icon: <Users size={16} />, label: 'Perfiles' },
            { id: 'finanzas', icon: <Wallet size={16} />, label: 'Caja' },
            { id: 'exportar', icon: <Download size={16} />, label: 'Data' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- CONTENIDO --- */}
      
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard title="Total Inscritos" value={data.stats.total} icon={<Users className="text-white" />} color="bg-slate-900 text-white" />
            <KpiCard title="Recaudo Real" value={`$${data.stats.totalRecaudado.toLocaleString()}`} icon={<Wallet className="text-white" />} color="bg-emerald-500 text-white" />
            <KpiCard title="Por Cobrar" value={`$${data.stats.totalPendiente.toLocaleString()}`} icon={<AlertCircle className="text-slate-900" />} color="bg-amber-400 text-slate-900" />
          </div>

          <div className="col-span-1 lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Curva de Inscripciones</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.stats.chartTime}>
                  <defs>
                    <linearGradient id="colorInsc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                  <RechartsTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="cantidad" stroke="#6366f1" strokeWidth={3} fill="url(#colorInsc)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'demografia' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-lg">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Roles</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.stats.chartRoles} innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                    {data.stats.chartRoles.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#a855f7', '#ec4899', '#14b8a6'][index % 4]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 700}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-lg">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Top Jurisdicciones</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.stats.chartDio} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 9, fontWeight: 700}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="value" fill="#334155" radius={[0, 8, 8, 0]} barSize={15}>
                    {data.stats.chartDio.map((entry: any, index: number) => (
                       <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finanzas' && (
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
           <div className="flex items-center gap-4 mb-8">
             <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><DollarSignIcon size={24} /></div>
             <div>
               <h3 className="text-2xl font-black text-slate-900">Salud Financiera</h3>
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Flujo de Caja vs Potencial</p>
             </div>
           </div>
           
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={[
                 { name: 'En Banco', valor: data.stats.totalRecaudado, color: '#10b981' },
                 { name: 'Pendiente', valor: data.stats.totalPendiente, color: '#f59e0b' },
                 { name: 'Total', valor: data.stats.totalRecaudado + data.stats.totalPendiente, color: '#6366f1' }
               ]}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 800}} />
                 <YAxis tickFormatter={(val) => `$${val/1000000}M`} axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                 <RechartsTooltip formatter={(val: number | undefined) => val !== undefined ? `$${val.toLocaleString()}` : '$0'} cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                 <Bar dataKey="valor" radius={[12, 12, 0, 0]} barSize={50}>
                    { [0,1,2].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#6366f1'][index]} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      )}

      {activeTab === 'exportar' && (
        <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                <FileSpreadsheet className="text-indigo-300" size={32} />
              </div>
              <h3 className="text-3xl font-black italic uppercase">Descarga Maestra</h3>
              <p className="text-slate-400 mt-4 leading-relaxed max-w-md text-sm">
                Genera un archivo Excel (.xlsx) compatible con sistemas contables. Incluye ID de transacción, fecha, monto pactado y estado de conciliación.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={handleExportExcel} className="w-full bg-white text-slate-900 font-black py-6 rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest shadow-xl">
                <Download size={18} strokeWidth={3} /> Generar Excel Oficial
              </button>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]" />
        </div>
      )}
    </div>
  );
}

// Subcomponente KPI simple
function KpiCard({ title, value, icon, color }: any) {
  return (
    <div className={`p-6 rounded-[2.5rem] shadow-lg ${color} flex items-center justify-between`}>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">{title}</p>
        <h4 className="text-2xl font-black italic">{value}</h4>
      </div>
      <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
        {icon}
      </div>
    </div>
  );
}

function DollarSignIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
}