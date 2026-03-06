"use client";

import React, { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import { 
  CheckCircle, XCircle, Eye, Search, Filter, 
  User, AlertCircle, Loader2, Clock,
  Download, DollarSign, Building, Mail, Phone,
  ChevronDown, ChevronUp, FileText, Shield,
  RefreshCw, AlertTriangle, Check,
  UserCheck, Ban, MoreVertical,
  Calendar, Bus, Plane, CalendarDays,
  Users, Receipt, TrendingUp, ArrowRightLeft,
  ChevronRight, Minus, Plus, Hash, UserX, UserCheck2
} from "lucide-react";
import { createClient } from "@/utils/supabase/clients";
import { format, parseISO } from "date-fns";
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

// Tipo para transacciones consolidadas
interface TransaccionConsolidada {
  id: string;
  numeroTransaccion: number;
  diocesisId: string;
  diocesisNombre: string;
  inscripciones: any[];
  totalPactado: number;
  totalInscritos: number;
  tieneComprobante: boolean;
  imagenUrl: string | null;
  estado: string;
  fechaPrimerInscripcion: string;
  fechaUltimaInscripcion: string;
  representante: {
    nombre: string;
    email: string;
    telefono: string;
  };
  mediosTransporte: string[];
  segmentaciones: string[];
}

export default function ValidarComprobantes() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);
  const [transaccionesConsolidadas, setTransaccionesConsolidadas] = useState<TransaccionConsolidada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDiocesis, setFilterDiocesis] = useState("todas");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterTieneComprobante, setFilterTieneComprobante] = useState("todos");
  const [filterNumeroTransaccion, setFilterNumeroTransaccion] = useState<string>("todas");
  
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isUpdatingIndividual, setIsUpdatingIndividual] = useState<string | null>(null);
  const [eventoActivo, setEventoActivo] = useState<any>(null);
  const [selectedTransaccion, setSelectedTransaccion] = useState<TransaccionConsolidada | null>(null);
  const [selectedInscripcionIndividual, setSelectedInscripcionIndividual] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    totalTransacciones: 0,
    totalInscritos: 0,
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    conComprobante: 0,
    sinComprobante: 0,
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
        
        const { data: inscripciones, error } = await supabase
          .from("inscripciones")
          .select(`
            *,
            jurisdicciones:diocesis_id (
              id,
              nombre
            )
          `)
          .eq("evento_id", evento.id)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error("Error cargando inscripciones:", error);
          return;
        }

        const inscripcionesFormateadas = inscripciones?.map((insc: any) => ({
          ...insc,
          diocesis: insc.jurisdicciones?.nombre || 'Sin asignar',
          diocesisId: insc.diocesis_id || 'sin-diocesis'
        })) || [];

        setData(inscripcionesFormateadas);
        
        const consolidadas = consolidarPorDiocesis(inscripcionesFormateadas);
        setTransaccionesConsolidadas(consolidadas);
        
        calcularStats(consolidadas);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const consolidarPorDiocesis = (inscripciones: any[]): TransaccionConsolidada[] => {
    const porDiocesis = inscripciones.reduce((acc, insc) => {
      const diocesisId = insc.diocesisId || 'sin-diocesis';
      if (!acc[diocesisId]) {
        acc[diocesisId] = [];
      }
      acc[diocesisId].push(insc);
      return acc;
    }, {} as Record<string, any[]>);

    const transacciones: TransaccionConsolidada[] = [];
    let contadorGlobal = 1;

    Object.entries(porDiocesis).forEach(([diocesisId, inscrs]) => {
      const inscrsTyped = inscrs as any[];
      inscrsTyped.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      const grupos: any[][] = [];
      let grupoActual: any[] = [];
      let comprobanteActual = inscrsTyped[0]?.imagen_url;
      
      inscrsTyped.forEach((insc, idx) => {
        if (insc.imagen_url !== comprobanteActual || idx === 0) {
          if (grupoActual.length > 0) {
            grupos.push([...grupoActual]);
          }
          grupoActual = [insc];
          comprobanteActual = insc.imagen_url;
        } else {
          grupoActual.push(insc);
        }
      });
      
      if (grupoActual.length > 0) {
        grupos.push(grupoActual);
      }

      grupos.forEach((grupo, idx) => {
        const totalPactado = grupo.reduce((sum, i) => sum + (i.precio_pactado || 0), 0);
        const primerInsc = grupo[0];
        const ultimaInsc = grupo[grupo.length - 1];
        
        const todosAprobados = grupo.every(i => i.estado === 'aprobada');
        const algunoRechazado = grupo.some(i => i.estado === 'rechazada');
        const estadoTransaccion = todosAprobados ? 'aprobada' : 
                                  algunoRechazado ? 'rechazada' : 'pendiente';

        transacciones.push({
          id: `${diocesisId}-${idx}`,
          numeroTransaccion: contadorGlobal++,
          diocesisId: diocesisId === 'sin-diocesis' ? '' : diocesisId,
          diocesisNombre: primerInsc.diocesis || 'Sin asignar',
          inscripciones: grupo,
          totalPactado,
          totalInscritos: grupo.length,
          tieneComprobante: !!primerInsc.imagen_url,
          imagenUrl: primerInsc.imagen_url,
          estado: estadoTransaccion,
          fechaPrimerInscripcion: primerInsc.created_at,
          fechaUltimaInscripcion: ultimaInsc.created_at,
          representante: {
            nombre: `${primerInsc.nombre} ${primerInsc.apellido}`,
            email: primerInsc.email,
            telefono: primerInsc.telefono || 'No registrado'
          },
          mediosTransporte: [...new Set(grupo.map(i => i.mediodetransporte).filter(Boolean))],
          segmentaciones: [...new Set(grupo.map(i => i.segmentacion).filter(Boolean))]
        });
      });
    });

    return transacciones.sort((a, b) => a.numeroTransaccion - b.numeroTransaccion);
  };

  const calcularStats = (transacciones: TransaccionConsolidada[]) => {
    const total = transacciones.length;
    const totalInscritos = transacciones.reduce((acc, t) => acc + t.totalInscritos, 0);
    const pendientes = transacciones.filter(t => t.estado === 'pendiente').length;
    const aprobados = transacciones.filter(t => t.estado === 'aprobada').length;
    const rechazados = transacciones.filter(t => t.estado === 'rechazada').length;
    const conComprobante = transacciones.filter(t => t.tieneComprobante).length;
    const sinComprobante = total - conComprobante;
    
    const recaudoReal = transacciones
      .filter(t => t.estado === 'aprobada')
      .reduce((acc, t) => acc + t.totalPactado, 0);
    const recaudoPendiente = transacciones
      .filter(t => t.estado === 'pendiente')
      .reduce((acc, t) => acc + t.totalPactado, 0);

    setStats({
      totalTransacciones: total,
      totalInscritos,
      pendientes,
      aprobados,
      rechazados,
      conComprobante,
      sinComprobante,
      recaudoReal,
      recaudoPendiente
    });
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const listaDiocesis = useMemo(() => {
    return Array.from(new Set(transaccionesConsolidadas.map(t => t.diocesisNombre).filter(Boolean))).sort();
  }, [transaccionesConsolidadas]);

  const listaNumerosTransaccion = useMemo(() => {
    const numeros = new Set(transaccionesConsolidadas.map(t => t.numeroTransaccion));
    return Array.from(numeros).sort((a, b) => a - b);
  }, [transaccionesConsolidadas]);

  const transaccionesFiltradas = useMemo(() => {
    return transaccionesConsolidadas.filter((t) => {
      const matchEstado = filterEstado === "todos" || t.estado === filterEstado;
      const matchSearch = searchTerm === "" || 
        t.diocesisNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.representante.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.representante.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.numeroTransaccion.toString().includes(searchTerm);
      const matchDiocesis = filterDiocesis === "todas" || t.diocesisNombre === filterDiocesis;
      const matchComprobante = filterTieneComprobante === "todos" 
        ? true 
        : filterTieneComprobante === "con" 
          ? t.tieneComprobante 
          : !t.tieneComprobante;
      const matchNumero = filterNumeroTransaccion === "todas" || 
                          t.numeroTransaccion.toString() === filterNumeroTransaccion;
      
      return matchEstado && matchSearch && matchDiocesis && matchComprobante && matchNumero;
    });
  }, [transaccionesConsolidadas, searchTerm, filterDiocesis, filterEstado, filterTieneComprobante, filterNumeroTransaccion]);

  const handleValidarTransaccion = async (transaccion: TransaccionConsolidada) => {

  if (!transaccion.tieneComprobante) {
    await Swal.fire({
      icon: "warning",
      title: "Comprobante requerido",
      text: "No se puede validar una transacción sin comprobante de pago",
      confirmButtonColor: "#2563eb"
    });
    return;
  }

  const { isConfirmed } = await Swal.fire({
    title: `Validar Transacción #${transaccion.numeroTransaccion}`,
    html: `
      <b>Diócesis:</b> ${transaccion.diocesisNombre}<br/>
      <b>Total:</b> $${transaccion.totalPactado.toLocaleString()}<br/>
      <b>Inscritos:</b> ${transaccion.totalInscritos}
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, validar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#16a34a",
    cancelButtonColor: "#dc2626"
  });

  if (!isConfirmed) return;

  setIsUpdating(transaccion.id);

  try {

    const idsInscripciones = transaccion.inscripciones.map(i => i.id);

    const { error } = await supabase
      .from("inscripciones")
      .update({
        estado: "aprobada",
        monto_pagado: transaccion.totalPactado / transaccion.totalInscritos,
        updated_at: new Date().toISOString()
      })
      .in("id", idsInscripciones);

    if (!error) {

      await Swal.fire({
        icon: "success",
        title: "Transacción validada",
        text: "La transacción fue aprobada correctamente",
        timer: 2000,
        showConfirmButton: false
      });

      await fetchData();
      setSelectedTransaccion(null);

    } else {

      await Swal.fire({
        icon: "error",
        title: "Error al validar",
        text: error.message
      });

    }

  } catch (error) {

    console.error(error);

    await Swal.fire({
      icon: "error",
      title: "Error inesperado",
      text: "Ocurrió un problema al validar la transacción"
    });

  } finally {
    setIsUpdating(null);
  }
};

  const handleRechazarTransaccion = async (transaccion: TransaccionConsolidada) => {

  const { value: motivo, isConfirmed } = await Swal.fire({
    title: `Rechazar Transacción #${transaccion.numeroTransaccion}`,
    input: "textarea",
    inputLabel: "Motivo del rechazo",
    inputPlaceholder: "Escriba el motivo del rechazo...",
    inputAttributes: {
      maxlength: "200"
    },
    showCancelButton: true,
    confirmButtonText: "Rechazar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280",
    inputValidator: (value) => {
      if (!value) {
        return "Debe escribir un motivo de rechazo";
      }
    }
  });

  if (!isConfirmed) return;

  setIsUpdating(transaccion.id);

  try {

    const idsInscripciones = transaccion.inscripciones.map(i => i.id);

    const { error } = await supabase
      .from("inscripciones")
      .update({
        estado: "rechazada",
        motivo_rechazo: motivo,
        updated_at: new Date().toISOString()
      })
      .in("id", idsInscripciones);

    if (!error) {

      await Swal.fire({
        icon: "success",
        title: "Transacción rechazada",
        text: "La transacción fue rechazada correctamente",
        timer: 2000,
        showConfirmButton: false
      });

      await fetchData();
      setSelectedTransaccion(null);

    } else {

      await Swal.fire({
        icon: "error",
        title: "Error al rechazar",
        text: error.message
      });

    }

  } catch (error) {

    console.error(error);

    await Swal.fire({
      icon: "error",
      title: "Error inesperado",
      text: "Ocurrió un problema al rechazar la transacción"
    });

  } finally {
    setIsUpdating(null);
  }
};

  // NUEVO: Validar inscripción individuals

  // NUEVO: Rechazar inscripción individual

// NUEVO: Validar inscripción individual
const handleValidarIndividual = async (
  inscripcion: any,
  transaccion: TransaccionConsolidada
) => {
  if (!transaccion.tieneComprobante) {
    await Swal.fire({
      icon: "warning",
      title: "Comprobante requerido",
      text: "No se puede validar: la transacción no tiene comprobante",
      confirmButtonColor: "#2563eb"
    });
    return;
  }

  const { isConfirmed } = await Swal.fire({
    title: "Validar inscripción",
    html: `
      <b>${inscripcion.nombre} ${inscripcion.apellido}</b><br/>
      Valor: $${(inscripcion.precio_pactado || 0).toLocaleString()}
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Validar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#16a34a",
    cancelButtonColor: "#6b7280"
  });

  if (!isConfirmed) return;

  setIsUpdatingIndividual(inscripcion.id);

  try {
    const { error } = await supabase
      .from("inscripciones")
      .update({
        estado: "aprobada",
        monto_pagado: inscripcion.precio_pactado || 0,
        updated_at: new Date().toISOString()
      })
      .eq("id", inscripcion.id);

    if (!error) {
      // ✅ ACTUALIZACIÓN OPTIMISTA - Actualizamos el estado local inmediatamente
      setTransaccionesConsolidadas(prev => 
        prev.map(t => {
          if (t.id !== transaccion.id) return t;
          
          // Actualizamos la inscripción específica dentro de la transacción
          const updatedInscripciones = t.inscripciones.map((i: any) => 
            i.id === inscripcion.id 
              ? { ...i, estado: 'aprobada', monto_pagado: inscripcion.precio_pactado || 0 }
              : i
          );

          // Recalculamos el estado de la transacción
          const todosAprobados = updatedInscripciones.every((i: any) => i.estado === 'aprobada');
          const algunoRechazado = updatedInscripciones.some((i: any) => i.estado === 'rechazada');
          const nuevoEstado = todosAprobados ? 'aprobada' : 
                             algunoRechazado ? 'rechazada' : 'pendiente';

          return {
            ...t,
            inscripciones: updatedInscripciones,
            estado: nuevoEstado
          };
        })
      );

      // ✅ Actualizamos también la transacción seleccionada inmediatamente
      setSelectedTransaccion(prev => {
        if (!prev || prev.id !== transaccion.id) return prev;
        
        const updatedInscripciones = prev.inscripciones.map((i: any) => 
          i.id === inscripcion.id 
            ? { ...i, estado: 'aprobada', monto_pagado: inscripcion.precio_pactado || 0 }
            : i
        );

        const todosAprobados = updatedInscripciones.every((i: any) => i.estado === 'aprobada');
        const algunoRechazado = updatedInscripciones.some((i: any) => i.estado === 'rechazada');
        const nuevoEstado = todosAprobados ? 'aprobada' : 
                           algunoRechazado ? 'rechazada' : 'pendiente';

        return {
          ...prev,
          inscripciones: updatedInscripciones,
          estado: nuevoEstado
        };
      });

      await Swal.fire({
        icon: "success",
        title: "Inscripción validada",
        text: `${inscripcion.nombre} ${inscripcion.apellido} fue aprobado correctamente`,
        timer: 2000,
        showConfirmButton: false
      });

      // Refetch en background para sincronizar con la base de datos
      await fetchData();

    } else {
      await Swal.fire({
        icon: "error",
        title: "Error al validar",
        text: error.message
      });
    }

  } catch (error) {
    console.error(error);
    await Swal.fire({
      icon: "error",
      title: "Error inesperado",
      text: "Ocurrió un problema al validar la inscripción"
    });
  } finally {
    setIsUpdatingIndividual(null);
  }
};

// NUEVO: Rechazar inscripción individual
const handleRechazarIndividual = async (
  inscripcion: any,
  transaccion: TransaccionConsolidada
) => {
  const { value: motivo, isConfirmed } = await Swal.fire({
    title: `Rechazar inscripción`,
    html: `<b>${inscripcion.nombre} ${inscripcion.apellido}</b>`,
    input: "textarea",
    inputLabel: "Motivo del rechazo",
    inputPlaceholder: "Escriba el motivo del rechazo...",
    showCancelButton: true,
    confirmButtonText: "Rechazar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280",
    inputValidator: (value) => {
      if (!value) {
        return "Debe escribir un motivo de rechazo";
      }
    }
  });

  if (!isConfirmed) return;

  setIsUpdatingIndividual(inscripcion.id);

  try {
    const { error } = await supabase
      .from("inscripciones")
      .update({
        estado: "rechazada",
        motivo_rechazo: motivo,
        updated_at: new Date().toISOString()
      })
      .eq("id", inscripcion.id);

    if (!error) {
      // ✅ ACTUALIZACIÓN OPTIMISTA - Actualizamos el estado local inmediatamente
      setTransaccionesConsolidadas(prev => 
        prev.map(t => {
          if (t.id !== transaccion.id) return t;
          
          // Actualizamos la inscripción específica dentro de la transacción
          const updatedInscripciones = t.inscripciones.map((i: any) => 
            i.id === inscripcion.id 
              ? { ...i, estado: 'rechazada', motivo_rechazo: motivo }
              : i
          );

          // Recalculamos el estado de la transacción
          const todosAprobados = updatedInscripciones.every((i: any) => i.estado === 'aprobada');
          const algunoRechazado = updatedInscripciones.some((i: any) => i.estado === 'rechazada');
          const nuevoEstado = todosAprobados ? 'aprobada' : 
                             algunoRechazado ? 'rechazada' : 'pendiente';

          return {
            ...t,
            inscripciones: updatedInscripciones,
            estado: nuevoEstado
          };
        })
      );

      // ✅ Actualizamos también la transacción seleccionada inmediatamente
      setSelectedTransaccion(prev => {
        if (!prev || prev.id !== transaccion.id) return prev;
        
        const updatedInscripciones = prev.inscripciones.map((i: any) => 
          i.id === inscripcion.id 
            ? { ...i, estado: 'rechazada', motivo_rechazo: motivo }
            : i
        );

        const todosAprobados = updatedInscripciones.every((i: any) => i.estado === 'aprobada');
        const algunoRechazado = updatedInscripciones.some((i: any) => i.estado === 'rechazada');
        const nuevoEstado = todosAprobados ? 'aprobada' : 
                           algunoRechazado ? 'rechazada' : 'pendiente';

        return {
          ...prev,
          inscripciones: updatedInscripciones,
          estado: nuevoEstado
        };
      });

      await Swal.fire({
        icon: "success",
        title: "Inscripción rechazada",
        text: `${inscripcion.nombre} ${inscripcion.apellido} fue rechazado correctamente`,
        timer: 2000,
        showConfirmButton: false
      });

      // Refetch en background para sincronizar con la base de datos
      await fetchData();

    } else {
      await Swal.fire({
        icon: "error",
        title: "Error al rechazar",
        text: error.message
      });
    }

  } catch (error) {
    console.error(error);
    await Swal.fire({
      icon: "error",
      title: "Error inesperado",
      text: "Ocurrió un problema al rechazar la inscripción"
    });
  } finally {
    setIsUpdatingIndividual(null);
  }
};

const exportarExcel = () => {
  if (exporting || transaccionesFiltradas.length === 0) return;
  
  setExporting(true);
  try {
    const wb = XLSX.utils.book_new();
    
    // === PALETA DE COLORES PROFESIONAL ===
    const COLORS = {
      primary: "1E3A8A",      // Azul corporativo oscuro
      secondary: "3B82F6",    // Azul medio
      accent: "10B981",       // Verde éxito
      warning: "F59E0B",      // Naranja advertencia
      danger: "EF4444",       // Rojo error
      light: "F0F9FF",        // Azul muy claro
      lighter: "F8FAFC",      // Gris muy claro
      white: "FFFFFF",
      text: "1F2937",         // Gris oscuro para texto
      border: "E5E7EB"        // Gris borde
    };

    // === HOJA 1: DASHBOARD GENERAL ===
    const datosResumen = transaccionesFiltradas.map(t => ({
      'N° Transacción': `#${t.numeroTransaccion}`,
      'Diócesis': t.diocesisNombre,
      'Total Inscritos': t.totalInscritos,
      'Total Pactado': t.totalPactado,
      'Estado': t.estado.toUpperCase(),
      'Comprobante': t.tieneComprobante ? '✓ SÍ' : '✗ NO',
      'Fecha Primera Inscripción': format(parseISO(t.fechaPrimerInscripcion), "dd/MM/yyyy HH:mm"),
      'Fecha Última Inscripción': format(parseISO(t.fechaUltimaInscripcion), "dd/MM/yyyy HH:mm"),
      'Medios de Transporte': t.mediosTransporte.join(', ') || 'No especificado',
      'Segmentaciones': t.segmentaciones.join(', ') || 'Sin perfil',
      'ID Transacción': t.id,
    }));

    const wsResumen = XLSX.utils.json_to_sheet(datosResumen);
    
    // Anchos optimizados
    wsResumen['!cols'] = [
      { wch: 16 }, { wch: 32 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 36 }
    ];

    // Estilos profesionales para encabezados
    const range = XLSX.utils.decode_range(wsResumen['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!wsResumen[address]) continue;
      wsResumen[address].s = {
        font: { bold: true, color: { rgb: COLORS.white }, sz: 11 },
        fill: { fgColor: { rgb: COLORS.primary }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          bottom: { style: "medium", color: { rgb: COLORS.secondary } }
        }
      };
    }

    // Colores condicionales para estados
    for (let R = 2; R <= range.e.r + 1; ++R) {
      const estadoCell = wsResumen[`E${R}`];
      const comprobanteCell = wsResumen[`F${R}`];
      
      if (estadoCell) {
        let estadoColor = COLORS.warning;
        if (estadoCell.v === 'APROBADA') estadoColor = COLORS.accent;
        if (estadoCell.v === 'RECHAZADA') estadoColor = COLORS.danger;
        
        estadoCell.s = {
          font: { bold: true, color: { rgb: estadoColor } },
          alignment: { horizontal: "center" }
        };
      }
      
      if (comprobanteCell) {
        const tieneComp = comprobanteCell.v.includes('✓');
        comprobanteCell.s = {
          font: { bold: true, color: { rgb: tieneComp ? COLORS.accent : COLORS.danger } },
          alignment: { horizontal: "center" }
        };
      }

      // Bordes sutiles para todas las celdas
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + R;
        if (!wsResumen[address]) continue;
        wsResumen[address].s = {
          ...wsResumen[address].s,
          border: {
            top: { style: "hair", color: { rgb: COLORS.border } },
            bottom: { style: "hair", color: { rgb: COLORS.border } },
            left: { style: "hair", color: { rgb: COLORS.border } },
            right: { style: "hair", color: { rgb: COLORS.border } }
          }
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, wsResumen, "📊 Transacciones");

    // === HOJAS POR DIÓCESIS CON DISEÑO MEJORADO ===
    const transaccionesPorDiocesis = transaccionesFiltradas.reduce((acc, t) => {
      const nombreDiocesis = t.diocesisNombre || 'Sin Diócesis';
      if (!acc[nombreDiocesis]) acc[nombreDiocesis] = [];
      acc[nombreDiocesis].push(t);
      return acc;
    }, {} as Record<string, TransaccionConsolidada[]>);

    Object.entries(transaccionesPorDiocesis).forEach(([nombreDiocesis, transacciones]) => {
      const nombreHoja = `🏛️ ${nombreDiocesis.replace(/[*?:\\/[\]]/g, '').substring(0, 28)}`;
      
      const datosDiocesis: any[] = [];
      
      transacciones.forEach(t => {
        // Fila de transacción destacada
        datosDiocesis.push({
          'TIPO': '💰 TRANSACCIÓN',
          'N°': `#${t.numeroTransaccion}`,
          'Diócesis': t.diocesisNombre,
          'Documento': '',
          'Participante': '',
          'Segmentación': '',
          'Transporte': '',
          'Valor': '',
          'Total': t.totalPactado,
          'Cantidad': t.totalInscritos,
          'Estado': t.estado.toUpperCase(),
          'Comprobante': t.tieneComprobante ? '✓' : '✗',
          'Fecha': format(parseISO(t.fechaPrimerInscripcion), "dd/MM/yyyy"),
        });

        // Filas de participantes con indentación visual
        t.inscripciones.forEach((insc, idx) => {
          datosDiocesis.push({
            'TIPO': '👤',
            'N°': '',
            'Diócesis': '',
            'Documento': insc.documento,
            'Participante': `    ${insc.nombre} ${insc.apellido}`, // Indentación
            'Segmentación': insc.segmentacion || 'Sin perfil',
            'Transporte': insc.mediodetransporte || 'No especificado',
            'Valor': insc.precio_pactado || 0,
            'Total': '',
            'Cantidad': '',
            'Estado': '',
            'Comprobante': '',
            'Fecha': '',
            'Email': insc.email,
            'Teléfono': insc.telefono || 'No registrado',
            'Estado Individual': insc.estado,
          });
        });

        // Separador visual
        datosDiocesis.push({
          'TIPO': '─', 'N°': '', 'Diócesis': '', 'Documento': '', 'Participante': '',
          'Segmentación': '', 'Transporte': '', 'Valor': '', 'Total': '', 'Cantidad': '',
          'Estado': '', 'Comprobante': '', 'Fecha': ''
        });
      });

      const wsDiocesis = XLSX.utils.json_to_sheet(datosDiocesis);
      
      wsDiocesis['!cols'] = [
        { wch: 14 }, { wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 32 },
        { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 14 }
      ];

      const rangeD = XLSX.utils.decode_range(wsDiocesis['!ref'] || 'A1');
      
      // Encabezados con gradiente visual (verde institucional)
      for (let C = rangeD.s.c; C <= rangeD.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!wsDiocesis[address]) continue;
        wsDiocesis[address].s = {
          font: { bold: true, color: { rgb: COLORS.white }, sz: 11 },
          fill: { fgColor: { rgb: "059669" }, patternType: "solid" },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: {
            bottom: { style: "medium", color: { rgb: "047857" } }
          }
        };
      }

      // Estilos dinámicos por tipo de fila
      for (let R = 2; R <= rangeD.e.r + 1; ++R) {
        const tipoCell = wsDiocesis[`A${R}`];
        const estadoCell = wsDiocesis[`K${R}`];
        
        if (!tipoCell) continue;

        // Fila de transacción principal
        if (tipoCell.v === '💰 TRANSACCIÓN') {
          for (let C = rangeD.s.c; C <= Math.min(rangeD.e.c, 12); ++C) {
            const address = XLSX.utils.encode_col(C) + R;
            if (!wsDiocesis[address]) continue;
            
            wsDiocesis[address].s = {
              font: { bold: true, color: { rgb: COLORS.primary }, sz: 11 },
              fill: { fgColor: { rgb: "DBEAFE" }, patternType: "solid" },
              border: {
                top: { style: "medium", color: { rgb: COLORS.secondary } },
                bottom: { style: "thin", color: { rgb: COLORS.secondary } }
              },
              alignment: { vertical: "center" }
            };
          }

          // Color condicional para estado
          if (estadoCell) {
            let estadoBg = "FEF3C7";
            let estadoFg = "92400E";
            if (estadoCell.v === 'APROBADA') { estadoBg = "D1FAE5"; estadoFg = "065F46"; }
            if (estadoCell.v === 'RECHAZADA') { estadoBg = "FEE2E2"; estadoFg = "991B1B"; }
            
            estadoCell.s = {
              font: { bold: true, color: { rgb: estadoFg } },
              fill: { fgColor: { rgb: estadoBg }, patternType: "solid" },
              alignment: { horizontal: "center" }
            };
          }

          // Comprobante con color
          const compCell = wsDiocesis[`L${R}`];
          if (compCell) {
            const tieneComp = compCell.v === '✓';
            compCell.s = {
              font: { bold: true, color: { rgb: tieneComp ? COLORS.accent : COLORS.danger }, sz: 12 },
              fill: { fgColor: { rgb: "DBEAFE" }, patternType: "solid" },
              alignment: { horizontal: "center" }
            };
          }
        } 
        // Fila de participante
        else if (tipoCell.v === '👤') {
          for (let C = rangeD.s.c; C <= rangeD.e.c; ++C) {
            const address = XLSX.utils.encode_col(C) + R;
            if (!wsDiocesis[address]) continue;
            
            wsDiocesis[address].s = {
              font: { sz: 10, color: { rgb: COLORS.text } },
              fill: { fgColor: { rgb: R % 2 === 0 ? COLORS.white : "F8FAFC" }, patternType: "solid" },
              alignment: { vertical: "center" },
              border: {
                bottom: { style: "hair", color: { rgb: COLORS.border } }
              }
            };
          }
        }
        // Fila separadora
        else if (tipoCell.v === '─') {
          for (let C = rangeD.s.c; C <= 12; ++C) {
            const address = XLSX.utils.encode_col(C) + R;
            wsDiocesis[address] = { 
              v: '', 
              s: { 
                fill: { fgColor: { rgb: COLORS.border } },
                border: { bottom: { style: "medium", color: { rgb: COLORS.secondary } } }
              } 
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, wsDiocesis, nombreHoja);
    });

    // === HOJA RESUMEN EJECUTIVO POR DIÓCESIS ===
    const resumenPorDiocesis = Object.entries(transaccionesPorDiocesis).map(([nombre, trans]) => {
      const transTyped = trans as TransaccionConsolidada[];
      const aprobadas = transTyped.filter(t => t.estado === 'aprobada');
      const pendientes = transTyped.filter(t => t.estado === 'pendiente');
      const rechazadas = transTyped.filter(t => t.estado === 'rechazada');
      
      return {
        'Diócesis': nombre,
        'Transacciones': transTyped.length,
        'Participantes': transTyped.reduce((sum, t) => sum + t.totalInscritos, 0),
        'Recaudado': aprobadas.reduce((sum, t) => sum + t.totalPactado, 0),
        'Pendiente': pendientes.reduce((sum, t) => sum + t.totalPactado, 0),
        'Tasa Éxito': transTyped.length > 0 ? `${((aprobadas.length / transTyped.length) * 100).toFixed(1)}%` : '0%',
        'Aprobadas': aprobadas.length,
        'Pendientes': pendientes.length,
        'Rechazadas': rechazadas.length,
        'Con Comprobante': transTyped.filter(t => t.tieneComprobante).length,
      };
    });

    const wsResumenDiocesis = XLSX.utils.json_to_sheet(resumenPorDiocesis);
    
    wsResumenDiocesis['!cols'] = [
      { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }
    ];

    const rangeRD = XLSX.utils.decode_range(wsResumenDiocesis['!ref'] || 'A1');
    
    // Encabezados oscuros elegantes
    for (let C = rangeRD.s.c; C <= rangeRD.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!wsResumenDiocesis[address]) continue;
      wsResumenDiocesis[address].s = {
        font: { bold: true, color: { rgb: COLORS.white }, sz: 11 },
        fill: { fgColor: { rgb: "111827" }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          bottom: { style: "medium", color: { rgb: COLORS.secondary } }
        }
      };
    }

    // Formato condicional para métricas
    for (let R = 2; R <= rangeRD.e.r + 1; ++R) {
      // Diócesis en negrita
      const diocesisCell = wsResumenDiocesis[`A${R}`];
      if (diocesisCell) {
        diocesisCell.s = {
          font: { bold: true, color: { rgb: COLORS.primary } },
          fill: { fgColor: { rgb: "EFF6FF" } }
        };
      }

      // Montos en formato moneda
      ['D', 'E'].forEach(col => {
        const cell = wsResumenDiocesis[`${col}${R}`];
        if (cell && typeof cell.v === 'number') {
          cell.s = {
            font: { color: { rgb: col === 'D' ? COLORS.accent : COLORS.warning }, bold: col === 'D' },
            alignment: { horizontal: "right" },
            numFmt: '"$"#,##0.00'
          };
        }
      });

      // Tasa de éxito con color
      const tasaCell = wsResumenDiocesis[`F${R}`];
      if (tasaCell) {
        const valor = parseFloat(tasaCell.v);
        let color = COLORS.danger;
        if (valor >= 80) color = COLORS.accent;
        else if (valor >= 50) color = COLORS.warning;
        
        tasaCell.s = {
          font: { bold: true, color: { rgb: color } },
          alignment: { horizontal: "center" }
        };
      }

      // Contadores con badges de color
      const aprobCell = wsResumenDiocesis[`G${R}`];
      const pendCell = wsResumenDiocesis[`H${R}`];
      const rechCell = wsResumenDiocesis[`I${R}`];

      if (aprobCell && aprobCell.v > 0) {
        aprobCell.s = { font: { bold: true, color: { rgb: COLORS.accent } }, alignment: { horizontal: "center" } };
      }
      if (pendCell && pendCell.v > 0) {
        pendCell.s = { font: { bold: true, color: { rgb: COLORS.warning } }, alignment: { horizontal: "center" } };
      }
      if (rechCell && rechCell.v > 0) {
        rechCell.s = { font: { bold: true, color: { rgb: COLORS.danger } }, alignment: { horizontal: "center" } };
      }

      // Bordes consistentes
      for (let C = rangeRD.s.c; C <= rangeRD.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + R;
        if (!wsResumenDiocesis[address]) continue;
        wsResumenDiocesis[address].s = {
          ...wsResumenDiocesis[address].s,
          border: {
            top: { style: "hair", color: { rgb: COLORS.border } },
            bottom: { style: "hair", color: { rgb: COLORS.border } }
          }
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, wsResumenDiocesis, "📈 Resumen Ejecutivo");

    // Guardar archivo con nombre descriptivo
    const nombreArchivo = `📊 Transacciones_${eventoActivo?.nombre || 'Evento'}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
    
  } catch (error) {
    console.error("Error exportando Excel:", error);
    alert("❌ Error al generar el archivo Excel: " + (error as Error).message);
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
        <p className="text-lg font-semibold" style={{ color: colors.azulOscuro }}>Cargando transacciones...</p>
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
                  <ArrowRightLeft style={{ color: colors.azul }} size={24} />
                </div>
                <div>
                  <h1 
                    className="text-2xl md:text-3xl font-bold mt-1"
                    style={{ color: colors.azulOscuro }}
                  >
                    Validación de Transacciones
                  </h1>
                  <p 
                    className="text-sm flex items-center gap-2"
                    style={{ color: colors.azulOscuro, opacity: 0.6 }}
                  >
                    <Building size={14} />
                    {eventoActivo?.nombre || "Sin evento activo"}
                    <span className="mx-2">•</span>
                    <Receipt size={14} />
                    {stats.totalTransacciones} transacciones / {stats.totalInscritos} inscritos
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
                disabled={exporting || transaccionesFiltradas.length === 0}
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
              { label: 'Total Transacciones', value: stats.totalTransacciones, icon: Receipt, color: colors.azul },
              { label: 'Con Comprobante', value: stats.conComprobante, icon: CheckCircle, color: colors.verde },
              { label: 'Sin Comprobante', value: stats.sinComprobante, icon: AlertCircle, color: colors.amarillo },
              { label: 'Pendientes Validar', value: stats.pendientes, icon: Clock, color: colors.rojo },
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro }}>Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} style={{ color: colors.azulOscuro, opacity: 0.5 }} />
                  <input
                    type="text"
                    placeholder="Diócesis, representante, email..."
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
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro }}>Estado Validación</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none"
                  style={{ 
                    borderColor: colors.grisClaro,
                    color: colors.azulOscuro
                  }}
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="pendiente">Pendientes de validar</option>
                  <option value="aprobada">Aprobadas</option>
                  <option value="rechazada">Rechazadas</option>
                  <option value="todos">Todos</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro }}>Comprobante</label>
                <select 
                  className="w-full px-4 py-2.5 rounded-lg border-2 focus:outline-none"
                  style={{ 
                    borderColor: colors.grisClaro,
                    color: colors.azulOscuro
                  }}
                  value={filterTieneComprobante}
                  onChange={(e) => setFilterTieneComprobante(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="con">Con comprobante</option>
                  <option value="sin">Sin comprobante</option>
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

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro }}>
                  <Hash size={14} className="inline mr-1" />
                  Número de Transacción
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterNumeroTransaccion("todas")}
                    className="px-3 py-2 rounded-lg text-sm font-bold border-2 transition-colors"
                    style={{
                      borderColor: filterNumeroTransaccion === "todas" ? colors.azul : colors.grisClaro,
                      backgroundColor: filterNumeroTransaccion === "todas" ? `${colors.azul}15` : 'white',
                      color: filterNumeroTransaccion === "todas" ? colors.azul : colors.azulOscuro
                    }}
                  >
                    Todas
                  </button>
                  {listaNumerosTransaccion.slice(0, 10).map(num => (
                    <button
                      key={num}
                      onClick={() => setFilterNumeroTransaccion(num.toString())}
                      className="px-3 py-2 rounded-lg text-sm font-bold border-2 transition-colors"
                      style={{
                        borderColor: filterNumeroTransaccion === num.toString() ? colors.azul : colors.grisClaro,
                        backgroundColor: filterNumeroTransaccion === num.toString() ? `${colors.azul}15` : 'white',
                        color: filterNumeroTransaccion === num.toString() ? colors.azul : colors.azulOscuro
                      }}
                    >
                      #{num}
                    </button>
                  ))}
                  {listaNumerosTransaccion.length > 10 && (
                    <select
                      value={filterNumeroTransaccion}
                      onChange={(e) => setFilterNumeroTransaccion(e.target.value)}
                      className="px-3 py-2 rounded-lg border-2 text-sm"
                      style={{ borderColor: colors.grisClaro, color: colors.azulOscuro }}
                    >
                      <option value="todas">Más...</option>
                      {listaNumerosTransaccion.slice(10).map(num => (
                        <option key={num} value={num.toString()}>Transacción #{num}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: colors.grisClaro }}>
            <span className="text-sm" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
              {transaccionesFiltradas.length} transacciones encontradas
              {filterNumeroTransaccion !== "todas" && ` (Filtrando #${filterNumeroTransaccion})`}
            </span>
            {(filterEstado !== "pendiente" || filterDiocesis !== "todas" || 
              filterTieneComprobante !== "todos" || filterNumeroTransaccion !== "todas" || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterEstado("pendiente");
                  setFilterDiocesis("todas");
                  setFilterTieneComprobante("todos");
                  setFilterNumeroTransaccion("todas");
                }}
                className="text-sm font-bold transition-colors hover:opacity-80"
                style={{ color: colors.rojo }}
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        </div>

        {/* TABLA DE TRANSACCIONES */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.grisClaro }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>N° Transacción</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Diócesis</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Representante</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Inscritos</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Total Pactado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Comprobante</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.grisClaro }}>
                {transaccionesFiltradas.map((transaccion) => (
                  <tr 
                    key={transaccion.id} 
                    className="hover:bg-gray-50 transition-colors"
                    style={selectedTransaccion?.id === transaccion.id ? { backgroundColor: `${colors.azul}08` } : {}}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg"
                          style={{ background: `linear-gradient(135deg, ${colors.azul} 0%, ${colors.verde} 100%)` }}
                        >
                          #{transaccion.numeroTransaccion}
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                            Transacción
                          </p>
                          <p className="text-sm" style={{ color: colors.azulOscuro, opacity: 0.8 }}>
                            {format(parseISO(transaccion.fechaPrimerInscripcion), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building size={16} style={{ color: colors.azulOscuro, opacity: 0.5 }} />
                        <div>
                          <p className="font-bold" style={{ color: colors.azulOscuro }}>
                            {transaccion.diocesisNombre}
                          </p>
                          <p className="text-xs" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                            {transaccion.mediosTransporte.join(', ') || 'Sin transporte'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-bold text-sm" style={{ color: colors.azulOscuro }}>
                          {transaccion.representante.nombre}
                        </p>
                        <p className="text-xs flex items-center gap-1" style={{ color: colors.azulOscuro, opacity: 0.7 }}>
                          <Mail size={10} /> {transaccion.representante.email}
                        </p>
                        <p className="text-xs flex items-center gap-1" style={{ color: colors.azulOscuro, opacity: 0.7 }}>
                          <Phone size={10} /> {transaccion.representante.telefono}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Users size={16} style={{ color: colors.azul }} />
                        <div>
                          <p className="font-bold text-lg" style={{ color: colors.azul }}>
                            {transaccion.totalInscritos}
                          </p>
                          <p className="text-xs" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                            inscritos
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-2xl font-bold" style={{ color: colors.verde }}>
                          ${transaccion.totalPactado.toLocaleString()}
                        </p>
                        <p className="text-xs" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                          {transaccion.segmentaciones.join(', ') || 'Sin perfil'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {transaccion.tieneComprobante ? (
                        <div className="flex flex-col gap-2">
                          <span 
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold w-fit"
                            style={{ backgroundColor: `${colors.verde}20`, color: colors.verde }}
                          >
                            <FileText size={10} />
                            Sí
                          </span>
                        </div>
                      ) : (
                        <span 
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                          style={{ backgroundColor: `${colors.amarillo}20`, color: colors.amarillo }}
                        >
                          <AlertCircle size={10} />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: transaccion.estado === 'aprobada' ? `${colors.verde}20` : 
                                          transaccion.estado === 'pendiente' ? `${colors.amarillo}20` : `${colors.rojo}20`,
                          color: transaccion.estado === 'aprobada' ? colors.verde : 
                                 transaccion.estado === 'pendiente' ? colors.azulOscuro : colors.rojo
                        }}
                      >
                        {transaccion.estado === 'aprobada' ? <CheckCircle size={12} /> : 
                         transaccion.estado === 'pendiente' ? <Clock size={12} /> : <Ban size={12} />}
                        {transaccion.estado === 'aprobada' ? 'Aprobada' : 
                         transaccion.estado === 'pendiente' ? 'Pendiente' : 'Rechazada'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isUpdating === transaccion.id ? (
                        <Loader2 className="animate-spin" size={20} style={{ color: colors.azul }} />
                      ) : (
                        <div className="flex items-center gap-2">
                          {transaccion.estado !== 'aprobada' && transaccion.tieneComprobante && (
                            <button
                              onClick={() => handleValidarTransaccion(transaccion)}
                              className="px-3 py-1.5 rounded-lg text-sm font-bold text-white transition-colors hover:opacity-90"
                              style={{ backgroundColor: colors.verde }}
                            >
                              <Check size={14} className="inline mr-1" />
                              Validar
                            </button>
                          )}
                          {transaccion.estado !== 'rechazada' && (
                            <button
                              onClick={() => handleRechazarTransaccion(transaccion)}
                              className="px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors"
                              style={{ 
                                borderColor: colors.rojo,
                                color: colors.rojo,
                                backgroundColor: 'white'
                              }}
                            >
                              <Ban size={14} className="inline mr-1" />
                              Rechazar
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTransaccion(selectedTransaccion?.id === transaccion.id ? null : transaccion)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: colors.azulOscuro, opacity: 0.5 }}
                          >
                            <ChevronRight size={16} className={selectedTransaccion?.id === transaccion.id ? 'rotate-90' : ''} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {transaccionesFiltradas.length === 0 && (
              <div className="p-12 text-center">
                <AlertTriangle size={48} style={{ color: colors.amarillo, margin: '0 auto' }} />
                <p className="mt-4 font-bold" style={{ color: colors.azulOscuro }}>No se encontraron transacciones</p>
                <p className="text-sm mt-2" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                  Intenta ajustar los filtros
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE DETALLE DE TRANSACCIÓN CON COMPROBANTE PRECARGADO */}
      {selectedTransaccion && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: `${colors.azulOscuro}80` }}
        >
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div 
              className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10"
              style={{ borderColor: colors.grisClaro }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg"
                  style={{ background: `linear-gradient(135deg, ${colors.azul} 0%, ${colors.verde} 100%)` }}
                >
                  #{selectedTransaccion.numeroTransaccion}
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: colors.azulOscuro }}>
                    Detalle de Transacción
                  </h3>
                  <p className="text-sm" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                    {selectedTransaccion.diocesisNombre} • {selectedTransaccion.totalInscritos} inscritos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransaccion(null)}
                style={{ color: colors.azulOscuro, opacity: 0.5 }}
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* SECCIÓN DE COMPROBANTE PRECARGADO - DESTACADA */}
              {selectedTransaccion.tieneComprobante && (
                <div className="rounded-xl p-6 border-2" style={{ backgroundColor: `${colors.verde}08`, borderColor: colors.verde }}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold flex items-center gap-2 text-lg" style={{ color: colors.azulOscuro }}>
                      <FileText size={24} style={{ color: colors.verde }} />
                      Comprobante de Pago - Transacción #{selectedTransaccion.numeroTransaccion}
                    </h4>
                    <span 
                      className="px-3 py-1 rounded-full text-sm font-bold"
                      style={{ backgroundColor: `${colors.verde}20`, color: colors.verde }}
                    >
                      <CheckCircle size={14} className="inline mr-1" />
                      Comprobante Subido
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Preview del comprobante */}
                    <div className="lg:col-span-2">
                      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: colors.grisClaro }}>
                        {/*
                        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: colors.grisClaro, backgroundColor: colors.grisClaro }}>
                          <span className="text-sm font-bold" style={{ color: colors.azulOscuro }}>Vista previa del comprobante</span>
                          <a 
                            href={selectedTransaccion.imagenUrl!} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors"
                            style={{ color: colors.azul, backgroundColor: `${colors.azul}15` }}
                          >
                            <Eye size={12} />
                            Ver en tamaño completo
                          </a>
                        </div>
                          */}
                        <div className="p-4 flex items-center justify-center bg-gray-50" style={{ minHeight: '300px' }}>
                          <img 
                            src={selectedTransaccion.imagenUrl!} 
                            alt="Comprobante de pago"
                            className="max-w-full max-h-[400px] object-contain rounded-lg shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIHNlIHB1ZWRlIGNhcmdhciBsYSBpbWFnZW48L3RleHQ+PC9zdmc+';
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Info del comprobante */}
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border" style={{ borderColor: colors.grisClaro }}>
                        <p className="text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                          Monto del Comprobante
                        </p>
                        <p className="text-3xl font-bold" style={{ color: colors.verde }}>
                          ${selectedTransaccion.totalPactado.toLocaleString()}
                        </p>
                        <p className="text-xs mt-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                          Debe corresponder al total pactado
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border" style={{ borderColor: colors.grisClaro }}>
                        <p className="text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                          Estado de Validación
                        </p>
                        <span 
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                          style={{
                            backgroundColor: selectedTransaccion.estado === 'aprobada' ? `${colors.verde}20` : 
                                            selectedTransaccion.estado === 'pendiente' ? `${colors.amarillo}20` : `${colors.rojo}20`,
                            color: selectedTransaccion.estado === 'aprobada' ? colors.verde : 
                                   selectedTransaccion.estado === 'pendiente' ? colors.azulOscuro : colors.rojo
                          }}
                        >
                          {selectedTransaccion.estado === 'aprobada' ? <CheckCircle size={16} /> : 
                           selectedTransaccion.estado === 'pendiente' ? <Clock size={16} /> : <Ban size={16} />}
                          {selectedTransaccion.estado === 'aprobada' ? 'Aprobada' : 
                           selectedTransaccion.estado === 'pendiente' ? 'Pendiente de validar' : 'Rechazada'}
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-lg border" style={{ borderColor: colors.grisClaro }}>
                        <p className="text-xs font-bold uppercase mb-2" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                          Acciones de Transacción
                        </p>
                        <div className="space-y-2">
                          {selectedTransaccion.estado !== 'aprobada' && (
                            <button
                              onClick={() => handleValidarTransaccion(selectedTransaccion)}
                              disabled={isUpdating === selectedTransaccion.id}
                              className="w-full px-4 py-2 rounded-lg font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                              style={{ backgroundColor: colors.verde }}
                            >
                              {isUpdating === selectedTransaccion.id ? (
                                <Loader2 className="animate-spin" size={16} />
                              ) : (
                                <CheckCircle size={16} />
                              )}
                              Validar Toda la Transacción
                            </button>
                          )}
                          {selectedTransaccion.estado !== 'rechazada' && (
                            <button
                              onClick={() => handleRechazarTransaccion(selectedTransaccion)}
                              disabled={isUpdating === selectedTransaccion.id}
                              className="w-full px-4 py-2 rounded-lg font-bold border-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                              style={{ 
                                borderColor: colors.rojo,
                                color: colors.rojo,
                                backgroundColor: 'white'
                              }}
                            >
                              <Ban size={16} />
                              Rechazar Toda la Transacción
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Si no tiene comprobante */}
              {!selectedTransaccion.tieneComprobante && (
                <div className="rounded-xl p-6 border-2" style={{ backgroundColor: `${colors.amarillo}08`, borderColor: colors.amarillo }}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={32} style={{ color: colors.amarillo }} />
                    <div>
                      <h4 className="font-bold text-lg" style={{ color: colors.azulOscuro }}>
                        Sin Comprobante de Pago
                      </h4>
                      <p className="text-sm" style={{ color: colors.azulOscuro, opacity: 0.7 }}>
                        Esta transacción aún no tiene un comprobante subido. No se puede validar hasta que se adjunte el comprobante.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Total Pactado</p>
                  <p className="text-2xl font-bold" style={{ color: colors.verde }}>
                    ${selectedTransaccion.totalPactado.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Total Inscritos</p>
                  <p className="text-2xl font-bold" style={{ color: colors.azul }}>
                    {selectedTransaccion.totalInscritos}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Fecha</p>
                  <p className="text-lg font-bold" style={{ color: colors.azulOscuro }}>
                    {format(parseISO(selectedTransaccion.fechaPrimerInscripcion), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Diócesis</p>
                  <p className="text-lg font-bold truncate" style={{ color: colors.azulOscuro }}>
                    {selectedTransaccion.diocesisNombre}
                  </p>
                </div>
              </div>

              {/* Información del representante */}
              <div className="border rounded-xl p-4" style={{ borderColor: colors.grisClaro }}>
                <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: colors.azulOscuro }}>
                  <User size={18} style={{ color: colors.azul }} />
                  Representante
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Nombre</p>
                    <p className="font-bold" style={{ color: colors.azulOscuro }}>{selectedTransaccion.representante.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Email</p>
                    <p className="font-bold" style={{ color: colors.azulOscuro }}>{selectedTransaccion.representante.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Teléfono</p>
                    <p className="font-bold" style={{ color: colors.azulOscuro }}>{selectedTransaccion.representante.telefono}</p>
                  </div>
                </div>
              </div>

              {/* Lista de inscritos con acciones individuales */}
              <div>
                <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: colors.azulOscuro }}>
                  <Users size={18} style={{ color: colors.azul }} />
                  Inscritos en esta transacción ({selectedTransaccion.inscripciones.length})
                </h4>
                <div className="border rounded-xl overflow-hidden" style={{ borderColor: colors.grisClaro }}>
                  <table className="w-full text-sm">
                    <thead style={{ backgroundColor: colors.grisClaro }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Inscrito</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Documento</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Segmentación</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Transporte</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Valor</th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Estado</th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase" style={{ color: colors.azulOscuro }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: colors.grisClaro }}>
                      {selectedTransaccion.inscripciones.map((insc: any) => (
                        <tr key={insc.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                                style={{ background: `linear-gradient(135deg, ${colors.azul} 0%, ${colors.verde} 100%)` }}
                              >
                                {insc.nombre[0]}{insc.apellido[0]}
                              </div>
                              <div>
                                <p className="font-medium" style={{ color: colors.azulOscuro }}>
                                  {insc.nombre} {insc.apellido}
                                </p>
                                <p className="text-xs flex items-center gap-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                                  <Mail size={10} /> {insc.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3" style={{ color: colors.azulOscuro, opacity: 0.8 }}>
                            {insc.documento}
                          </td>
                          <td className="px-4 py-3" style={{ color: colors.azulOscuro, opacity: 0.8 }}>
                            {insc.segmentacion || 'Sin perfil'}
                          </td>
                          <td className="px-4 py-3">
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                              style={{ 
                                backgroundColor: insc.mediodetransporte === 'Avión' ? `${colors.azul}15` : 
                                                insc.mediodetransporte === 'Autobús' ? `${colors.verde}15` : colors.grisClaro,
                                color: insc.mediodetransporte === 'Avión' ? colors.azul : 
                                       insc.mediodetransporte === 'Autobús' ? colors.verde : colors.azulOscuro
                              }}
                            >
                              {insc.mediodetransporte === 'Avión' ? <Plane size={10} /> : 
                               insc.mediodetransporte === 'Autobús' ? <Bus size={10} /> : <AlertCircle size={10} />}
                              {insc.mediodetransporte || 'No especificado'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold" style={{ color: colors.azulOscuro }}>
                            ${(insc.precio_pactado || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                              style={{
                                backgroundColor: insc.estado === 'aprobada' ? `${colors.verde}20` : 
                                                insc.estado === 'pendiente' ? `${colors.amarillo}20` : `${colors.rojo}20`,
                                color: insc.estado === 'aprobada' ? colors.verde : 
                                       insc.estado === 'pendiente' ? colors.azulOscuro : colors.rojo
                              }}
                            >
                              {insc.estado === 'aprobada' ? <CheckCircle size={10} /> : 
                               insc.estado === 'pendiente' ? <Clock size={10} /> : <Ban size={10} />}
                              {insc.estado === 'aprobada' ? 'Aprobado' : 
                               insc.estado === 'pendiente' ? 'Pendiente' : 'Rechazado'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isUpdatingIndividual === insc.id ? (
                              <div className="flex justify-center">
                                <Loader2 className="animate-spin" size={16} style={{ color: colors.azul }} />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                {insc.estado !== 'aprobada' && selectedTransaccion.tieneComprobante && (
                                  <button
                                    onClick={() => handleValidarIndividual(insc, selectedTransaccion)}
                                    className="p-1.5 rounded-lg transition-colors hover:bg-green-50"
                                    style={{ color: colors.verde }}
                                    title="Validar individual"
                                  >
                                    <UserCheck2 size={16} />
                                  </button>
                                )}
                                {insc.estado !== 'rechazada' && (
                                  <button
                                    onClick={() => handleRechazarIndividual(insc, selectedTransaccion)}
                                    className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                                    style={{ color: colors.rojo }}
                                    title="Rechazar individual"
                                  >
                                    <UserX size={16} />
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedInscripcionIndividual(selectedInscripcionIndividual?.id === insc.id ? null : insc)}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                                  style={{ color: colors.azulOscuro, opacity: 0.6 }}
                                  title="Ver detalle"
                                >
                                  <Eye size={16} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: `${colors.verde}10` }}>
                        <td colSpan={4} className="px-4 py-3 font-bold text-right" style={{ color: colors.azulOscuro }}>
                          TOTAL DE LA TRANSACCIÓN:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-lg" style={{ color: colors.verde }}>
                          ${selectedTransaccion.totalPactado.toLocaleString()}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Acciones finales */}
              <div 
                className="pt-4 border-t flex justify-between items-center"
                style={{ borderColor: colors.grisClaro }}
              >
                <button
                  onClick={() => setSelectedTransaccion(null)}
                  className="px-6 py-2 rounded-lg font-bold border-2 transition-colors"
                  style={{ 
                    borderColor: colors.grisClaro,
                    color: colors.azulOscuro
                  }}
                >
                  Cerrar
                </button>
                
                <div className="flex gap-3">
                  {selectedTransaccion.estado !== 'aprobada' && selectedTransaccion.tieneComprobante && (
                    <button
                      onClick={() => handleValidarTransaccion(selectedTransaccion)}
                      disabled={isUpdating === selectedTransaccion.id}
                      className="px-6 py-2 rounded-lg font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                      style={{ backgroundColor: colors.verde }}
                    >
                      {isUpdating === selectedTransaccion.id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <CheckCircle size={18} />
                      )}
                      Validar Transacción Completa
                    </button>
                  )}
                  {selectedTransaccion.estado !== 'rechazada' && (
                    <button
                      onClick={() => handleRechazarTransaccion(selectedTransaccion)}
                      disabled={isUpdating === selectedTransaccion.id}
                      className="px-6 py-2 rounded-lg font-bold border-2 transition-colors disabled:opacity-50 flex items-center gap-2"
                      style={{ 
                        borderColor: colors.rojo,
                        color: colors.rojo,
                        backgroundColor: 'white'
                      }}
                    >
                      <Ban size={18} />
                      Rechazar Transacción
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE INDIVIDUAL DEL INSCRITO */}
      {selectedInscripcionIndividual && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-[60]"
          style={{ backgroundColor: `${colors.azulOscuro}90` }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div 
              className="p-6 border-b flex items-center justify-between"
              style={{ borderColor: colors.grisClaro }}
            >
              <h3 className="text-lg font-bold" style={{ color: colors.azulOscuro }}>
                Detalle del Inscrito
              </h3>
              <button
                onClick={() => setSelectedInscripcionIndividual(null)}
                style={{ color: colors.azulOscuro, opacity: 0.5 }}
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-white text-xl"
                  style={{ background: `linear-gradient(135deg, ${colors.azul} 0%, ${colors.verde} 100%)` }}
                >
                  {selectedInscripcionIndividual.nombre[0]}{selectedInscripcionIndividual.apellido[0]}
                </div>
                <div>
                  <h4 className="font-bold text-lg" style={{ color: colors.azulOscuro }}>
                    {selectedInscripcionIndividual.nombre} {selectedInscripcionIndividual.apellido}
                  </h4>
                  <p className="text-sm" style={{ color: colors.azulOscuro, opacity: 0.6 }}>
                    {selectedInscripcionIndividual.documento}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Email</p>
                  <p className="font-medium" style={{ color: colors.azulOscuro }}>{selectedInscripcionIndividual.email}</p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Teléfono</p>
                  <p className="font-medium" style={{ color: colors.azulOscuro }}>{selectedInscripcionIndividual.telefono || 'No registrado'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Segmentación</p>
                  <p className="font-medium" style={{ color: colors.azulOscuro }}>{selectedInscripcionIndividual.segmentacion || 'Sin perfil'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Transporte</p>
                  <p className="font-medium" style={{ color: colors.azulOscuro }}>{selectedInscripcionIndividual.mediodetransporte || 'No especificado'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Entidad de Salud</p>
                  <p className="font-medium" style={{ color: colors.azulOscuro }}>{selectedInscripcionIndividual.entidadSalud}</p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Requiere hospedaje</p>
                  <p className="font-medium" style={{ color: colors.azulOscuro }}>{selectedInscripcionIndividual.hospedaje}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Valor Pactado</p>
                <p className="text-2xl font-bold" style={{ color: colors.verde }}>
                  ${(selectedInscripcionIndividual.precio_pactado || 0).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.azulOscuro, opacity: 0.6 }}>Estado</p>
                <span 
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                  style={{
                    backgroundColor: selectedInscripcionIndividual.estado === 'aprobada' ? `${colors.verde}20` : 
                                    selectedInscripcionIndividual.estado === 'pendiente' ? `${colors.amarillo}20` : `${colors.rojo}20`,
                    color: selectedInscripcionIndividual.estado === 'aprobada' ? colors.verde : 
                           selectedInscripcionIndividual.estado === 'pendiente' ? colors.azulOscuro : colors.rojo
                  }}
                >
                  {selectedInscripcionIndividual.estado === 'aprobada' ? <CheckCircle size={14} /> : 
                   selectedInscripcionIndividual.estado === 'pendiente' ? <Clock size={14} /> : <Ban size={14} />}
                  {selectedInscripcionIndividual.estado === 'aprobada' ? 'Aprobado' : 
                   selectedInscripcionIndividual.estado === 'pendiente' ? 'Pendiente' : 'Rechazado'}
                </span>
              </div>

              {selectedInscripcionIndividual.motivo_rechazo && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${colors.rojo}10` }}>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: colors.rojo }}>Motivo de rechazo</p>
                  <p className="text-sm" style={{ color: colors.azulOscuro }}>{selectedInscripcionIndividual.motivo_rechazo}</p>
                </div>
              )}

              <div className="pt-4 border-t flex justify-end gap-3" style={{ borderColor: colors.grisClaro }}>
                <button
                  onClick={() => setSelectedInscripcionIndividual(null)}
                  className="px-4 py-2 rounded-lg font-bold border-2 transition-colors"
                  style={{ 
                    borderColor: colors.grisClaro,
                    color: colors.azulOscuro
                  }}
                >
                  Cerrar
                </button>
                {selectedInscripcionIndividual.estado !== 'aprobada' && selectedTransaccion?.tieneComprobante && (
                  <button
                    onClick={() => {
                      handleValidarIndividual(selectedInscripcionIndividual, selectedTransaccion!);
                      setSelectedInscripcionIndividual(null);
                    }}
                    className="px-4 py-2 rounded-lg font-bold text-white transition-colors hover:opacity-90 flex items-center gap-2"
                    style={{ backgroundColor: colors.verde }}
                  >
                    <UserCheck2 size={16} />
                    Validar
                  </button>
                )}
                {selectedInscripcionIndividual.estado !== 'rechazada' && (
                  <button
                    onClick={() => {
                      handleRechazarIndividual(selectedInscripcionIndividual, selectedTransaccion!);
                      setSelectedInscripcionIndividual(null);
                    }}
                    className="px-4 py-2 rounded-lg font-bold border-2 transition-colors flex items-center gap-2"
                    style={{ 
                      borderColor: colors.rojo,
                      color: colors.rojo,
                      backgroundColor: 'white'
                    }}
                  >
                    <UserX size={16} />
                    Rechazar
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