"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { 
  Trash2, Edit3, MapPin, Banknote, 
  AlertCircle, Globe2, Loader2,
  Users, Building2, Settings,
  ChevronDown, ChevronUp, ExternalLink,
  Shield, Mail, Calendar, Hash,
  RefreshCw, Link as LinkIcon
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { toast } from "sonner";

// Tipos basados en la estructura actual de la base de datos
type Jurisdiccion = {
  id: string;
  nombre: string;
  precio_base: number | null;
  email_encargado: string | null;
  created_at: string;
  evento_id: string | null;
};

type Evento = {
  id: string;
  nombre: string;
  slug: string;
  esta_activo: boolean;
  fecha_inicio: string;
  meta_recaudacion: number | null;
};

type ConfiguracionEvento = {
  id: number;
  evento_id: string;
  modo_precio: 'individual' | 'global';
  precio_global_base: number;
  metodo_descuento: 'porcentaje' | 'fijo';
  valor_hospedaje_general: number;
  usar_hospedaje_diocesis: boolean;
};

interface Props {
  data: any[];
  onEdit: (item: Jurisdiccion) => void;
  refreshKey?: number;
  modoPrecio?: 'individual' | 'global';
  onSelectJurisdiccion?: (jurisdiccion: Jurisdiccion) => void;
}

export default function ListadoDiocesis({ 
  data,
  onEdit, 
  refreshKey = 0, 
  modoPrecio,
  onSelectJurisdiccion 
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [jurisdicciones, setJurisdicciones] = useState<Jurisdiccion[]>([]);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [configuracionEvento, setConfiguracionEvento] = useState<ConfiguracionEvento | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalInscritos: 0,
    recaudacionTotal: 0,
    jurisdiccionesConInscripciones: 0
  });
  const [conteoInscripcionesPorJurisdiccion, setConteoInscripcionesPorJurisdiccion] = useState<Record<string, number>>({});

  // Función para obtener el conteo de inscripciones por jurisdicción
  const fetchConteoInscripciones = useCallback(async (eventoId: string) => {
    try {
      // Primero obtener todas las jurisdicciones del evento
      const { data: jurisdiccionesData, error: errorJuris } = await supabase
        .from('jurisdicciones')
        .select('id, nombre')
        .eq('evento_id', eventoId);

      if (errorJuris) {
        console.error("Error obteniendo jurisdicciones para conteo:", errorJuris);
        return {};
      }

      if (!jurisdiccionesData || jurisdiccionesData.length === 0) {
        return {};
      }

      // Obtener nombres de jurisdicciones
      const nombresJurisdicciones = jurisdiccionesData.map(j => j.nombre);
      
      // Consultar inscripciones que coincidan con los nombres de jurisdicciones
      const { data: inscripcionesData, error: errorInsc } = await supabase
        .from('inscripciones')
        .select('id, diocesis, precio_pagado')
        .eq('evento_id', eventoId)
        .in('diocesis', nombresJurisdicciones);

      if (errorInsc) {
        console.error("Error obteniendo inscripciones:", errorInsc);
        return {};
      }

      // Contar inscripciones por nombre de jurisdicción
      const conteo: Record<string, number> = {};
      const recaudacion: Record<string, number> = {};
      
      inscripcionesData?.forEach(insc => {
        if (insc.diocesis) {
          conteo[insc.diocesis] = (conteo[insc.diocesis] || 0) + 1;
          recaudacion[insc.diocesis] = (recaudacion[insc.diocesis] || 0) + (Number(insc.precio_pagado) || 0);
        }
      });

      // Mapear a IDs de jurisdicciones
      const conteoPorId: Record<string, number> = {};
      jurisdiccionesData.forEach(juris => {
        conteoPorId[juris.id] = conteo[juris.nombre] || 0;
      });

      // Calcular estadísticas generales
      const totalInscritos = Object.values(conteo).reduce((sum, count) => sum + count, 0);
      const recaudacionTotal = Object.values(recaudacion).reduce((sum, amount) => sum + amount, 0);
      const jurisdiccionesConInscripciones = Object.values(conteo).filter(count => count > 0).length;

      setStats({
        totalInscritos,
        recaudacionTotal,
        jurisdiccionesConInscripciones
      });

      return conteoPorId;

    } catch (error) {
      console.error("Error en fetchConteoInscripciones:", error);
      return {};
    }
  }, [supabase]);

  const fetchDatosEvento = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Obtener evento activo
      const { data: evento, error: errorEvento } = await supabase
        .from('eventos')
        .select('*')
        .eq('esta_activo', true)
        .maybeSingle();

      if (errorEvento) {
        console.error("Error obteniendo evento:", errorEvento);
        toast.error("Error al cargar el evento activo");
        return;
      }

      if (!evento) {
        setEvento(null);
        setJurisdicciones([]);
        setStats({ totalInscritos: 0, recaudacionTotal: 0, jurisdiccionesConInscripciones: 0 });
        toast.warning("No hay un evento activo");
        return;
      }

      setEvento(evento);

      // 2. Obtener configuración del evento
      const { data: config, error: configError } = await supabase
        .from('configuracion_evento')
        .select('*')
        .eq('evento_id', evento.id)
        .maybeSingle();

      if (configError) {
        console.warn("Configuración no encontrada:", configError);
      }
      
      setConfiguracionEvento(config || null);

      // 3. Obtener jurisdicciones del evento (sin joins problemáticos)
      const { data: jurisdiccionesData, error: errorJuri } = await supabase
        .from('jurisdicciones')
        .select('*')
        .eq('evento_id', evento.id)
        .order('nombre', { ascending: true });

      if (errorJuri) {
        throw errorJuri;
      }

      setJurisdicciones(jurisdiccionesData || []);

      // 4. Obtener conteo de inscripciones por jurisdicción
      const conteo = await fetchConteoInscripciones(evento.id);
      setConteoInscripcionesPorJurisdiccion(conteo);

    } catch (error: any) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar las jurisdicciones");
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchConteoInscripciones]);

  useEffect(() => {
    fetchDatosEvento();
    
    // Configurar polling para actualizaciones (en lugar de realtime subscription)
    const intervalId = setInterval(() => {
      fetchDatosEvento();
    }, 30000); // Actualizar cada 30 segundos

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchDatosEvento, refreshKey]);

  const handleEliminar = async (id: string, nombre: string) => {
    // Verificar si hay inscripciones asociadas usando el conteo que ya tenemos
    const tieneInscripciones = conteoInscripcionesPorJurisdiccion[id] > 0;
    
    if (tieneInscripciones) {
      toast.error(`No se puede eliminar "${nombre}" porque tiene ${conteoInscripcionesPorJurisdiccion[id]} inscripciones asociadas`);
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar la jurisdicción "${nombre}"?\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('jurisdicciones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(`Jurisdicción "${nombre}" eliminada correctamente`);
      
      // Actualizar lista optimistamente
      setJurisdicciones(prev => prev.filter(item => item.id !== id));
      
      // Actualizar estadísticas
      fetchDatosEvento();
      
    } catch (error: any) {
      console.error("Error eliminando:", error);
      toast.error(`Error al eliminar: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const modoPrecioActual = modoPrecio || configuracionEvento?.modo_precio || 'individual';

  // Agrupar jurisdicciones por letra inicial
  const jurisdiccionesAgrupadas = useMemo(() => {
    const grupos: Record<string, Jurisdiccion[]> = {};
    
    jurisdicciones.forEach(juris => {
      const primeraLetra = juris.nombre.charAt(0).toUpperCase();
      if (!grupos[primeraLetra]) {
        grupos[primeraLetra] = [];
      }
      grupos[primeraLetra].push(juris);
    });
    
    return Object.entries(grupos)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce((acc, [letra, items]) => {
        acc[letra] = items;
        return acc;
      }, {} as Record<string, Jurisdiccion[]>);
  }, [jurisdicciones]);

  const letrasGrupos = Object.keys(jurisdiccionesAgrupadas);

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Loader2 className="animate-spin text-[#009944]" size={48} />
        <div className="absolute inset-0 border-4 border-[#009944]/20 rounded-full animate-ping opacity-20"></div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-[#1E2D69]/60">
        Cargando jurisdicciones...
      </p>
      <p className="text-xs text-[#1E2D69]/40 text-center max-w-sm">
        Conectando con la base de datos de Supabase
      </p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#009944]/10 via-white to-white p-6 md:p-8 rounded-3xl border border-[#009944]/20 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-[#009944]/20 rounded-xl">
                <Globe2 className="text-[#009944]" size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#009944]">
                  Evento Activo
                </span>
                <h1 className="text-3xl md:text-4xl font-black text-[#1E2D69] uppercase italic leading-none tracking-tighter mt-1">
                  {evento?.nombre || "Sin Evento Activo"}
                </h1>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-white p-4 rounded-2xl border border-[#E6E7E8] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#1E5CAA]/10 rounded-lg">
                    <Building2 size={16} className="text-[#1E5CAA]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#1E2D69]/60 font-bold uppercase tracking-wider">Jurisdicciones</p>
                    <p className="text-xl font-black text-[#1E2D69]">{jurisdicciones.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-2xl border border-[#E6E7E8] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#009944]/10 rounded-lg">
                    <Users size={16} className="text-[#009944]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#1E2D69]/60 font-bold uppercase tracking-wider">Inscritos</p>
                    <p className="text-xl font-black text-[#1E2D69]">{stats.totalInscritos}</p>
                  </div>
                </div>
              </div>
              
              {/* Puedes agregar más estadísticas aquí si es necesario */}
            </div>
          </div>
          
          {configuracionEvento && (
            <div className="bg-white p-5 rounded-2xl border border-[#E6E7E8] shadow-sm min-w-[260px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#009944]/20 rounded-lg">
                  <Settings size={16} className="text-[#009944]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E2D69]">Configuración</h3>
                  <p className="text-xs text-[#1E2D69]/60">Modo de precios</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#1E2D69]/70">Modo</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    modoPrecioActual === 'global' 
                      ? 'bg-[#009944]/20 text-[#009944]' 
                      : 'bg-[#1E5CAA]/20 text-[#1E5CAA]'
                  }`}>
                    {modoPrecioActual === 'global' ? 'GLOBAL' : 'INDIVIDUAL'}
                  </span>
                </div>
                
                {modoPrecioActual === 'global' && configuracionEvento.precio_global_base && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#1E2D69]/70">Precio Base</span>
                    <span className="text-lg font-black text-[#009944]">
                      ${Number(configuracionEvento.precio_global_base).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="space-y-6">
        {jurisdicciones.length === 0 ? (
          <div className="bg-gradient-to-br from-[#E6E7E8]/50 to-white border-2 border-dashed border-[#E6E7E8] rounded-3xl p-12 text-center">
            <div className="inline-block p-4 bg-[#E6E7E8] rounded-2xl mb-6">
              <AlertCircle className="text-[#1E2D69]/40" size={40} />
            </div>
            <p className="text-[#1E2D69]/40 font-black uppercase text-[10px] tracking-[0.2em] mb-2">
              No hay jurisdicciones registradas
            </p>
            <p className="text-[#1E2D69]/60 text-sm max-w-md mx-auto mb-6">
              {evento 
                ? `No hay sedes vinculadas al evento "${evento.nombre}".`
                : "No hay un evento activo."}
            </p>
            <button 
              onClick={() => fetchDatosEvento()}
              className="px-5 py-2.5 bg-[#009944]/10 text-[#009944] hover:bg-[#009944]/20 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto transition-colors"
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* Navegación por letras si hay muchas jurisdicciones */}
            {letrasGrupos.length > 3 && (
              <div className="sticky top-2 z-10 bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-[#E6E7E8] shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#1E2D69]/60 uppercase">Navegar:</span>
                  {letrasGrupos.map(letra => (
                    <a 
                      key={letra}
                      href={`#grupo-${letra}`}
                      className="px-2.5 py-1 text-xs font-bold text-[#009944] hover:bg-[#009944]/10 rounded-lg transition-colors"
                    >
                      {letra}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de jurisdicciones */}
            <div className="space-y-8">
              {letrasGrupos.map((letra) => (
                <div key={letra} id={`grupo-${letra}`} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#009944]/20 text-[#009944] rounded-lg flex items-center justify-center font-black">
                      {letra}
                    </div>
                    <h3 className="text-lg font-black text-[#1E2D69] uppercase">
                      {jurisdiccionesAgrupadas[letra].length} jurisdicciones
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {jurisdiccionesAgrupadas[letra].map((item) => {
                      const isExpanded = expandedId === item.id;
                      const isDeleting = deletingId === item.id;
                      const inscripcionesCount = conteoInscripcionesPorJurisdiccion[item.id] || 0;
                      const hasInscripciones = inscripcionesCount > 0;
                      
                      return (
                        <div 
                          key={item.id}
                          className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                            isExpanded 
                              ? 'border-[#009944] shadow-lg' 
                              : 'border-[#E6E7E8] hover:border-[#009944]/50 hover:shadow-md'
                          }`}
                        >
                          <div 
                            className="p-5 md:p-6 flex items-center justify-between cursor-pointer hover:bg-[#E6E7E8]/20 transition-colors"
                            onClick={() => toggleExpand(item.id)}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center transition-all ${
                                isExpanded 
                                  ? 'bg-[#009944]/20 text-[#009944]' 
                                  : 'bg-[#E6E7E8] text-[#1E2D69]/40 group-hover:bg-[#009944]/10'
                              }`}>
                                <MapPin size={20} strokeWidth={2.5} />
                                {hasInscripciones && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#009944] text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                    {inscripcionesCount}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base md:text-lg font-black text-[#1E2D69] uppercase italic tracking-tighter truncate">
                                    {item.nombre}
                                  </h3>
                                  
                                  {modoPrecioActual === 'individual' && item.precio_base && Number(item.precio_base) > 0 && (
                                    <div className="px-2.5 py-1 bg-[#009944]/10 text-[#009944] rounded-full text-xs font-bold shrink-0">
                                      ${Number(item.precio_base).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Email comentado
                                {item.email_encargado && (
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <Mail size={12} className="text-[#1E2D69]/40 shrink-0" />
                                    <span className="text-sm text-[#1E2D69]/70 truncate">
                                      {item.email_encargado}
                                    </span>
                                  </div>
                                )} */}
                                
                                {hasInscripciones && (
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <Users size={12} className="text-[#1E5CAA]" />
                                    <span className="text-xs text-[#1E5CAA] font-medium">
                                      {inscripcionesCount} inscrito{inscripcionesCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(item.id);
                                }}
                                className={`p-2.5 rounded-lg transition-all ${
                                  isExpanded 
                                    ? 'bg-[#E6E7E8] text-[#1E2D69]' 
                                    : 'bg-[#E6E7E8]/50 text-[#1E2D69]/50 hover:bg-[#E6E7E8]'
                                }`}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>
                          
                          {/* Panel expandido */}
                          {isExpanded && (
                            <div className="px-5 md:px-6 pb-5 md:pb-6 border-t border-[#E6E7E8] pt-5 animate-in fade-in">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-sm font-bold text-[#1E2D69] uppercase tracking-wide mb-3 flex items-center gap-2">
                                      <Shield size={14} />
                                      Información
                                    </h4>
                                    <div className="space-y-3">
                                      {/*
                                      <div>
                                        <div className="text-xs text-[#1E2D69]/60 font-medium mb-1 flex items-center gap-2">
                                          <Hash size={12} />
                                          ID
                                        </div>
                                        <div className="text-sm font-mono text-[#1E2D69] bg-[#E6E7E8] p-2.5 rounded-lg overflow-x-auto">
                                          {item.id}
                                        </div>
                                      </div> */}
                                      
                                      <div>
                                        <div className="text-xs text-[#1E2D69]/60 font-medium mb-1 flex items-center gap-2">
                                          <Calendar size={12} />
                                          Creado el
                                        </div>
                                        <div className="text-sm text-[#1E2D69]">
                                          {new Date(item.created_at).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-sm font-bold text-[#1E2D69] uppercase tracking-wide mb-3 flex items-center gap-2">
                                      <Banknote size={14} />
                                      Precios
                                    </h4>
                                    <div className="space-y-3">
                                      {modoPrecioActual === 'individual' ? (
                                        <div>
                                          <div className="text-xs text-[#1E2D69]/60 font-medium mb-1">
                                            Precio Base
                                          </div>
                                          <div className="flex items-center gap-2 text-xl font-black text-[#009944]">
                                            <Banknote size={18} />
                                            <span>
                                              ${Number(item.precio_base || 0).toLocaleString('es-ES')}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="text-xs text-[#1E2D69]/60 font-medium mb-1">
                                            Precio por diocesis
                                          </div>
                                          <div className="flex items-center gap-2 text-xl font-black text-[#009944]">
                                            <Banknote size={18} />
                                            <span>
                                              ${Number(item.precio_base || 0).toLocaleString('es-ES')}
                                            </span>
                                          </div>
                                          <p className="text-xs text-[#1E2D69]/60 mt-2">
                                            Aplicado a todas las jurisdicciones
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Acciones */}
                              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-6 border-t border-[#E6E7E8]">
                                <div className="flex items-center gap-3">
                                  {/*
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.id);
                                      toast.success('ID copiado al portapapeles');
                                    }}
                                    className="px-4 py-2 bg-[#E6E7E8] text-[#1E2D69] hover:bg-[#E6E7E8]/70 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                                  >
                                    <LinkIcon size={14} />
                                    Copiar ID
                                  </button> */}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  {/*
                                  <button
                                    onClick={() => onEdit(item)}
                                    className="px-4 py-2 bg-[#009944]/10 text-[#009944] hover:bg-[#009944]/20 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                                  >
                                    <Edit3 size={14} />
                                    Editar
                                  </button>
                                  
                                  <button
                                    onClick={() => handleEliminar(item.id, item.nombre)}
                                    disabled={isDeleting || hasInscripciones}
                                    className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${
                                      hasInscripciones
                                        ? 'bg-[#E6E7E8] text-[#1E2D69]/40 cursor-not-allowed'
                                        : 'bg-[#ED1C24]/10 text-[#ED1C24] hover:bg-[#ED1C24]/20'
                                    }`}
                                  >
                                    {isDeleting ? (
                                      <>
                                        <Loader2 className="animate-spin" size={14} />
                                        Eliminando...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 size={14} />
                                        Eliminar
                                      </>
                                    )}
                                  </button>
                                  */}
                                </div>
                              </div>
                              
                              {hasInscripciones && (
                                <div className="mt-4 p-3 bg-[#FFF200]/20 border border-[#FFF200] rounded-xl">
                                  <p className="text-xs text-[#B41919] text-center">
                                    ⚠️ Esta jurisdicción tiene {inscripcionesCount} inscripciones y no puede ser eliminada
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Footer */}
      {jurisdicciones.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm border border-[#E6E7E8] rounded-2xl p-5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm text-[#1E2D69]/70 font-medium">
                <span className="font-bold text-[#1E2D69]">{jurisdicciones.length}</span> jurisdicciones
              </p>
              <p className="text-xs text-[#1E2D69]/50">
                {stats.jurisdiccionesConInscripciones} con inscripciones • 
                Actualizado: {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDatosEvento}
                className="px-4 py-2 bg-[#E6E7E8] text-[#1E2D69] hover:bg-[#E6E7E8]/70 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={14} />
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}