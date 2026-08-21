"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const VERSION = "2026.08.21-AGENDA-BELLEZA-HORARIOS-MULTIDIA-FIX3";

const SERVICIO_INICIAL = {
  nombre: "",
  descripcion: "",
  tipo: "clase_grupal",
  duracion_minutos: 60,
  capacidad_default: 5,
  requiere_membresia: true,
  requiere_pago: false,
  precio: 0,
  activo: true,
};

const HORARIO_INICIAL = {
  servicio_id: "",
  dia_semana: 5,
  hora_inicio: "18:00",
  hora_fin: "19:00",
  instructor: "",
  capacidad: 5,
  fecha_desde: fechaHoy(),
  fecha_hasta: "",
  activo: true,
};

const SERVICIO_SALON_INICIAL = {
  ...SERVICIO_INICIAL,
  tipo: "cita_individual",
  duracion_minutos: 45,
  capacidad_default: 1,
  requiere_membresia: false,
  requiere_pago: true,
  precio: 0,
};

const HORARIO_SALON_INICIAL = {
  ...HORARIO_INICIAL,
  hora_inicio: "09:00",
  hora_fin: "10:00",
  capacidad: 1,
};

function fechaHoy() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function esTipoSalonBelleza(tipoNegocio, categoriaNegocio = "") {
  const texto = normalizar(
    `${tipoNegocio || ""} ${categoriaNegocio || ""}`
  );

  return [
    "salon de belleza",
    "salon belleza",
    "salon",
    "belleza",
    "beauty",
    "peluqueria",
    "estetica",
    "barberia",
    "spa",
  ].some((palabra) => texto.includes(palabra));
}

function formatoHora(hora) {
  if (!hora) return "";
  const [hh = "00", mm = "00"] = String(hora).split(":");
  const h = Number(hh);
  const sufijo = h >= 12 ? "p. m." : "a. m.";
  const hora12 = h % 12 || 12;
  return `${hora12}:${mm} ${sufijo}`;
}

function nombreDia(numero) {
  return [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ][Number(numero)] || "Día";
}

function formatoFecha(fecha) {
  if (!fecha) return "";
  const d = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function esRolAdministrador(rol) {
  return [
    "administrador",
    "superadmin",
    "super_admin",
    "admin_master",
    "administrador_master",
  ].includes(normalizar(rol).replace(/\s+/g, "_"));
}


function horaAMinutos(hora) {
  if (!hora) return 0;
  const [hh = "0", mm = "0"] = String(hora).split(":");
  return Number(hh) * 60 + Number(mm);
}

function rangoCoincideConFecha(horario, fecha) {
  if (!horario || !fecha) return false;

  const d = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;

  const diaSemana = d.getDay();
  if (Number(horario.dia_semana) !== diaSemana) return false;

  if (horario.fecha_desde && fecha < horario.fecha_desde) return false;
  if (horario.fecha_hasta && fecha > horario.fecha_hasta) return false;

  return Boolean(horario.activo);
}

export default function AgendaPage() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [rol, setRol] = useState("");
  const [esAdmin, setEsAdmin] = useState(false);
  const [esSalonBelleza, setEsSalonBelleza] = useState(false);

  const [vista, setVista] = useState("hoy");
  const [fechaAgenda, setFechaAgenda] = useState(fechaHoy());

  const [servicios, setServicios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);

  const [esMovil, setEsMovil] = useState(false);

  const [servicioForm, setServicioForm] = useState(SERVICIO_INICIAL);
  const [servicioEditandoId, setServicioEditandoId] = useState(null);

  const [horarioForm, setHorarioForm] = useState(HORARIO_INICIAL);
  const [diasHorarioSalon, setDiasHorarioSalon] = useState([1, 2, 3, 4, 5]);
  const [horarioEditandoId, setHorarioEditandoId] = useState(null);

  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [busquedaReservas, setBusquedaReservas] = useState("");
  const [estadoReservaFiltro, setEstadoReservaFiltro] = useState("Todos");

  const [portalConfig, setPortalConfig] = useState({
    activo: false,
    slug: "",
    titulo_publico: "",
  });
  const [guardandoPortal, setGuardandoPortal] = useState(false);
  const [alertaCancelacionCliente, setAlertaCancelacionCliente] = useState(null);

  useEffect(() => {
    inicializar();
  }, []);


  useEffect(() => {
    const actualizarVista = () => {
      setEsMovil(window.innerWidth <= 760);
    };

    actualizarVista();
    window.addEventListener("resize", actualizarVista);

    return () => {
      window.removeEventListener("resize", actualizarVista);
    };
  }, []);

  useEffect(() => {
    if (empresaId) {
      cargarDisponibilidad(fechaAgenda);
      cargarReservas();
    }
  }, [fechaAgenda, empresaId]);


  useEffect(() => {
    if (!empresaId) return;

    const sincronizarAgenda = async () => {
      try {
        await Promise.all([
          cargarClientes(empresaId),
          cargarReservas(empresaId),
          cargarDisponibilidad(fechaAgenda, empresaId),
        ]);
      } catch (err) {
        console.error(
          "No se pudo sincronizar Agenda al volver a la pestaña:",
          err
        );
      }
    };

    window.addEventListener("focus", sincronizarAgenda);

    return () => {
      window.removeEventListener("focus", sincronizarAgenda);
    };
  }, [empresaId, fechaAgenda]);

  // Cancelaciones del portal público en tiempo real.
  // El cliente libera el horario y el administrador recibe la alerta
  // sin tener que actualizar manualmente la pantalla.
  useEffect(() => {
    if (!empresaId || !esAdmin) return;

    const canal = supabase
      .channel(`agenda-cancelaciones-${empresaId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agenda_reservas",
          filter: `empresa_id=eq.${empresaId}`,
        },
        async (payload) => {
          const anterior = payload?.old || {};
          const actual = payload?.new || {};

          if (
            normalizar(actual.estado) !== "cancelada" ||
            normalizar(anterior.estado) === "cancelada"
          ) {
            return;
          }

          try {
            const [clienteResp, servicioResp] = await Promise.all([
              actual.cliente_id
                ? supabase
                    .from("clientes")
                    .select("id,nombre,telefono")
                    .eq("empresa_id", empresaId)
                    .eq("id", actual.cliente_id)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null }),
              actual.servicio_id
                ? supabase
                    .from("agenda_servicios")
                    .select("id,nombre")
                    .eq("empresa_id", empresaId)
                    .eq("id", actual.servicio_id)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            ]);

            setAlertaCancelacionCliente({
              reservaId: actual.id,
              cliente:
                clienteResp?.data?.nombre ||
                actual.nombre_reserva ||
                "Cliente",
              telefono: clienteResp?.data?.telefono || "",
              servicio:
                servicioResp?.data?.nombre || "Servicio",
              fecha: actual.fecha_reserva || fechaAgenda,
              hora: actual.hora_inicio || "",
              motivo: actual.motivo_cancelacion || "",
              canceladoPor: actual.cancelado_por || "cliente",
            });

            await Promise.all([
              cargarReservas(empresaId),
              cargarDisponibilidad(fechaAgenda, empresaId),
            ]);
          } catch (err) {
            console.error(
              "No se pudo procesar la alerta de cancelación:",
              err
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [empresaId, esAdmin, fechaAgenda]);

  async function inicializar() {
    setCargando(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        window.location.href = "/login";
        return;
      }

      const empresaLocal = localStorage.getItem("empresaId") || "";
      const empresaNombreLocal = localStorage.getItem("empresaNombre") || "";
      const tipoNegocioLocal = localStorage.getItem("tipoNegocio") || "";
      const categoriaNegocioLocal =
        localStorage.getItem("categoriaNegocio") || "";
      const rolLocal = localStorage.getItem("usuarioRol") ||
        localStorage.getItem("rol") ||
        "";

      if (!empresaLocal) {
        alert("No hay una empresa activa.");
        window.location.href = "/login";
        return;
      }

      const adminLocal =
        esRolAdministrador(rolLocal);

      const salonLocal = esTipoSalonBelleza(
        tipoNegocioLocal,
        categoriaNegocioLocal
      );

      setEmpresaId(empresaLocal);
      setEmpresaNombre(empresaNombreLocal);
      setRol(rolLocal);
      setEsAdmin(adminLocal);
      setEsSalonBelleza(salonLocal);

      if (salonLocal) {
        setServicioForm(SERVICIO_SALON_INICIAL);
        setHorarioForm(HORARIO_SALON_INICIAL);
        setDiasHorarioSalon([1, 2, 3, 4, 5]);
      }

      if (typeof window !== "undefined") {
        const vistaUrl = new URLSearchParams(
          window.location.search
        ).get("vista");

        if (["hoy", "nueva", "reservas", "configuracion"].includes(vistaUrl)) {
          setVista(vistaUrl);
        }
      }

      await Promise.all([
        cargarServicios(empresaLocal),
        cargarHorarios(empresaLocal),
        cargarClientes(empresaLocal),
        cargarReservas(empresaLocal),
        cargarDisponibilidad(fechaAgenda, empresaLocal),
        adminLocal
          ? cargarConfiguracionPortal(empresaLocal)
          : Promise.resolve(),
      ]);
    } catch (err) {
      console.error(err);
      setError(err?.message || "No fue posible cargar Agenda.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarConfiguracionPortal(
    idEmpresa = empresaId
  ) {
    if (!idEmpresa) return;

    const { data, error } = await supabase.rpc(
      "obtener_configuracion_portal_agenda",
      {
        p_empresa_id: idEmpresa,
      }
    );

    if (error) {
      console.error(
        "No se pudo cargar el portal de reservas:",
        error
      );
      return;
    }

    setPortalConfig({
      activo: Boolean(data?.activo),
      slug: data?.slug || "",
      titulo_publico:
        data?.titulo_publico || empresaNombre || "",
    });
  }

  async function guardarConfiguracionPortal() {
    if (!esAdmin) return;

    if (!portalConfig.slug.trim()) {
      alert("Escribe el enlace público del negocio.");
      return;
    }

    setGuardandoPortal(true);

    try {
      const { data, error } = await supabase.rpc(
        "configurar_portal_agenda",
        {
          p_empresa_id: empresaId,
          p_activo: Boolean(portalConfig.activo),
          p_slug: portalConfig.slug.trim(),
          p_titulo_publico:
            portalConfig.titulo_publico.trim() ||
            empresaNombre ||
            null,
        }
      );

      if (error) throw error;

      setPortalConfig({
        activo: Boolean(data?.activo),
        slug: data?.slug || portalConfig.slug,
        titulo_publico:
          data?.titulo_publico ||
          portalConfig.titulo_publico ||
          empresaNombre,
      });

      alert("Portal de reservas actualizado.");
    } catch (err) {
      alert(
        err?.message ||
          "No se pudo actualizar el portal de reservas."
      );
    } finally {
      setGuardandoPortal(false);
    }
  }

  function obtenerEnlacePortal() {
    if (!portalConfig.slug) return "";

    const ruta =
      `/reservar/${portalConfig.slug}`;

    if (typeof window === "undefined") {
      return ruta;
    }

    return `${window.location.origin}${ruta}`;
  }

  async function copiarEnlacePortal() {
    const enlace = obtenerEnlacePortal();

    if (!enlace) return;

    try {
      await navigator.clipboard.writeText(enlace);
      alert("Enlace de reservas copiado.");
    } catch {
      window.prompt(
        "Copia este enlace de reservas:",
        enlace
      );
    }
  }

  function compartirPortalWhatsApp() {
    const enlace = obtenerEnlacePortal();

    if (!enlace) return;

    const texto = esSalonBelleza
      ? `Reserva tu cita en el salón aquí:\n${enlace}`
      : `Reserva tu clase o servicio aquí:\n${enlace}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function abrirPortal() {
    const enlace = obtenerEnlacePortal();

    if (!enlace) return;

    window.open(
      enlace,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function obtenerQrPortal() {
    const enlace = obtenerEnlacePortal();

    if (!enlace) return "";

    return (
      "https://api.qrserver.com/v1/create-qr-code/" +
      `?size=700x700&margin=24&data=${encodeURIComponent(enlace)}`
    );
  }

  async function descargarQrPortal() {
    const qr = obtenerQrPortal();

    if (!qr) return;

    try {
      const respuesta = await fetch(qr);
      if (!respuesta.ok) throw new Error("QR no disponible.");

      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download =
        `QR-reservas-${portalConfig.slug || "konax"}.png`;

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(
        qr,
        "_blank",
        "noopener,noreferrer"
      );
    }
  }

  function modalidadServicio(form = servicioForm) {
    if (
      form.requiere_membresia &&
      form.requiere_pago
    ) {
      return "miembros_pago";
    }

    if (form.requiere_membresia) {
      return "solo_miembros";
    }

    if (form.requiere_pago) {
      return "pago_local";
    }

    /*
      Compatibilidad con servicios antiguos que estaban configurados
      como reserva abierta sin costo. Esa modalidad ya no se ofrece.
      Al editarlos, se muestran como "Incluida con membresía".
    */
    return "solo_miembros";
  }

  function aplicarModalidadServicio(modalidad) {
    setServicioForm((actual) => ({
      ...actual,
      requiere_membresia:
        modalidad === "solo_miembros" ||
        modalidad === "miembros_pago",
      requiere_pago:
        modalidad === "pago_local" ||
        modalidad === "miembros_pago",
      precio:
        modalidad === "pago_local" ||
        modalidad === "miembros_pago"
          ? actual.precio
          : 0,
    }));
  }

  async function cargarServicios(idEmpresa = empresaId) {
    if (!idEmpresa) return;

    const { data, error } = await supabase
      .from("agenda_servicios")
      .select("*")
      .eq("empresa_id", idEmpresa)
      .order("nombre", { ascending: true });

    if (error) throw error;
    setServicios(Array.isArray(data) ? data : []);
  }

  async function cargarHorarios(idEmpresa = empresaId) {
    if (!idEmpresa) return;

    const { data, error } = await supabase
      .from("agenda_horarios")
      .select("*")
      .eq("empresa_id", idEmpresa)
      .order("dia_semana", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (error) throw error;
    setHorarios(Array.isArray(data) ? data : []);
  }

  async function cargarClientes(idEmpresa = empresaId) {
    if (!idEmpresa) return;

    const { data, error } = await supabase
      .from("clientes")
      .select("id,nombre,cedula,telefono,correo,estado")
      .eq("empresa_id", idEmpresa)
      .order("nombre", { ascending: true })
      .limit(5000);

    if (error) throw error;
    setClientes(Array.isArray(data) ? data : []);
  }

  async function cargarReservas(idEmpresa = empresaId) {
    if (!idEmpresa) return;

    const { data, error } = await supabase
      .from("agenda_reservas")
      .select("*")
      .eq("empresa_id", idEmpresa)
      .order("fecha_reserva", { ascending: false })
      .order("hora_inicio", { ascending: true })
      .limit(1000);

    if (error) throw error;
    setReservas(Array.isArray(data) ? data : []);
  }

  async function cargarDisponibilidad(
    fecha = fechaAgenda,
    idEmpresa = empresaId
  ) {
    if (!idEmpresa || !fecha) return;

    const { data, error } = await supabase.rpc(
      "obtener_disponibilidad_agenda",
      {
        p_empresa_id: idEmpresa,
        p_fecha: fecha,
      }
    );

    if (error) {
      console.error("Disponibilidad:", error);
      setDisponibilidad([]);
      return;
    }

    setDisponibilidad(Array.isArray(data) ? data : []);
  }

  const mapaClientes = useMemo(() => {
    const mapa = new Map();
    clientes.forEach((c) => mapa.set(String(c.id), c));
    return mapa;
  }, [clientes]);

  const mapaServicios = useMemo(() => {
    const mapa = new Map();
    servicios.forEach((s) => mapa.set(String(s.id), s));
    return mapa;
  }, [servicios]);

  const mapaHorarios = useMemo(() => {
    const mapa = new Map();
    horarios.forEach((h) => mapa.set(String(h.id), h));
    return mapa;
  }, [horarios]);

  const clientesFiltrados = useMemo(() => {
    const q = normalizar(busquedaCliente);
    if (!q) return [];

    return clientes
      .filter((c) => {
        const texto = normalizar(
          `${c.nombre || ""} ${c.cedula || ""} ${c.telefono || ""}`
        );
        return texto.includes(q);
      })
      .slice(0, 8);
  }, [clientes, busquedaCliente]);

  const reservasFecha = useMemo(() => {
    return reservas
      .filter((r) => r.fecha_reserva === fechaAgenda)
      .sort((a, b) =>
        String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || ""))
      );
  }, [reservas, fechaAgenda]);

  const reservasActivas = useMemo(() => {
    return reservas.filter((r) =>
      ["confirmada", "pendiente_pago", "asistio", "no_asistio"].includes(
        normalizar(r.estado)
      )
    );
  }, [reservas]);

  const reservasFechaOperativas = useMemo(() => {
    return reservasFecha.filter(
      (r) => normalizar(r.estado) !== "cancelada"
    );
  }, [reservasFecha]);

  const reservasFiltradas = useMemo(() => {
    const q = normalizar(busquedaReservas);
    const estadoBuscado = normalizar(estadoReservaFiltro);

    return reservas
      .filter((reserva) => {
        const estado = normalizar(reserva.estado);
        const cliente = mapaClientes.get(String(reserva.cliente_id));
        const servicio = mapaServicios.get(String(reserva.servicio_id));

        const cumpleEstado =
          estadoReservaFiltro === "Todos" ||
          estado === estadoBuscado;

        const texto = normalizar(
          `${cliente?.nombre || ""} ${cliente?.cedula || ""} ${
            cliente?.telefono || ""
          } ${servicio?.nombre || ""} ${reserva.fecha_reserva || ""}`
        );

        const cumpleBusqueda = !q || texto.includes(q);

        return cumpleEstado && cumpleBusqueda;
      })
      .sort((a, b) => {
        const fechaA = `${a.fecha_reserva || ""} ${a.hora_inicio || ""}`;
        const fechaB = `${b.fecha_reserva || ""} ${b.hora_inicio || ""}`;
        return fechaB.localeCompare(fechaA);
      });
  }, [
    reservas,
    busquedaReservas,
    estadoReservaFiltro,
    mapaClientes,
    mapaServicios,
  ]);

  const resumenReservas = useMemo(() => {
    const base = reservasFechaOperativas;

    return {
      confirmadas: base.filter(
        (r) => normalizar(r.estado) === "confirmada"
      ).length,
      pendientes: base.filter(
        (r) => normalizar(r.estado) === "pendiente_pago"
      ).length,
      asistieron: base.filter(
        (r) => normalizar(r.estado) === "asistio"
      ).length,
      noAsistieron: base.filter(
        (r) => normalizar(r.estado) === "no_asistio"
      ).length,
    };
  }, [reservasFechaOperativas]);

  const semanaAgenda = useMemo(() => {
    const base = new Date(`${fechaAgenda}T12:00:00`);

    if (Number.isNaN(base.getTime())) return [];

    const diaActual = base.getDay();
    const desplazamientoLunes =
      diaActual === 0 ? -6 : 1 - diaActual;

    const lunes = new Date(base);
    lunes.setDate(base.getDate() + desplazamientoLunes);

    return Array.from({ length: 7 }, (_, indice) => {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + indice);

      const offset = fecha.getTimezoneOffset();
      const iso = new Date(
        fecha.getTime() - offset * 60000
      )
        .toISOString()
        .slice(0, 10);

      const nombre = new Intl.DateTimeFormat("es-PA", {
        weekday: "short",
      })
        .format(fecha)
        .replace(".", "")
        .toUpperCase();

      const mes = new Intl.DateTimeFormat("es-PA", {
        month: "short",
      })
        .format(fecha)
        .replace(".", "")
        .toUpperCase();

      return {
        fecha: iso,
        dia: nombre,
        numero: fecha.getDate(),
        mes,
        seleccionado: iso === fechaAgenda,
        hoy: iso === fechaHoy(),
      };
    });
  }, [fechaAgenda]);

  const horariosSalonFecha = useMemo(() => {
    if (!esSalonBelleza) return horarios;

    return horarios
      .filter((horario) => rangoCoincideConFecha(horario, fechaAgenda))
      .sort(
        (a, b) =>
          horaAMinutos(a.hora_inicio) -
          horaAMinutos(b.hora_inicio)
      );
  }, [horarios, esSalonBelleza, fechaAgenda]);

  const disponibilidadVisible = useMemo(() => {
    if (!esSalonBelleza) return disponibilidad;

    // Para salón mostramos solamente bloques realmente utilizables del día:
    // una fila por horario configurado, no una cascada de segmentos repetidos.
    const porHorario = new Map();

    disponibilidad.forEach((item) => {
      const clave = String(item.horario_id || "");
      if (!clave) return;

      const horarioBase = mapaHorarios.get(clave);
      if (
        horarioBase &&
        !rangoCoincideConFecha(horarioBase, fechaAgenda)
      ) {
        return;
      }

      if (!porHorario.has(clave)) {
        porHorario.set(clave, item);
        return;
      }

      const actual = porHorario.get(clave);
      const inicioActual = horaAMinutos(actual?.hora_inicio);
      const inicioNuevo = horaAMinutos(item?.hora_inicio);

      if (inicioNuevo < inicioActual) {
        porHorario.set(clave, item);
      }
    });

    return Array.from(porHorario.values()).sort(
      (a, b) =>
        horaAMinutos(a.hora_inicio) -
        horaAMinutos(b.hora_inicio)
    );
  }, [
    disponibilidad,
    esSalonBelleza,
    fechaAgenda,
    mapaHorarios,
  ]);

  const resumenAgenda = useMemo(() => {
    const baseDisponibilidad = esSalonBelleza
      ? disponibilidadVisible
      : disponibilidad;

    const capacidadTotal = baseDisponibilidad.reduce(
      (total, item) => total + Number(item.capacidad || 0),
      0
    );

    const reservadosTotal = baseDisponibilidad.reduce(
      (total, item) => total + Number(item.reservados || 0),
      0
    );

    const cuposDisponibles = baseDisponibilidad.reduce(
      (total, item) => total + Number(item.disponibles || 0),
      0
    );

    const ocupacion =
      capacidadTotal > 0
        ? Math.round((reservadosTotal / capacidadTotal) * 100)
        : 0;

    return {
      capacidadTotal,
      reservadosTotal,
      cuposDisponibles,
      ocupacion,
    };
  }, [disponibilidad, disponibilidadVisible, esSalonBelleza]);

  async function refrescarTodo() {
    setGuardando(true);
    setError("");

    try {
      await Promise.all([
        cargarServicios(),
        cargarHorarios(),
        cargarClientes(),
        cargarReservas(),
        cargarDisponibilidad(),
      ]);
    } catch (err) {
      setError(err?.message || "No se pudo actualizar Agenda.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarServicio() {
    if (!esAdmin) {
      alert(
        esSalonBelleza
          ? "Solo el administrador puede configurar los servicios del salón."
          : "Solo el administrador puede configurar servicios o clases."
      );
      return;
    }

    if (!servicioForm.nombre.trim()) {
      alert(
        esSalonBelleza
          ? "Escribe el nombre del servicio del salón."
          : "Escribe el nombre del servicio o clase."
      );
      return;
    }

    if (
      servicioForm.requiere_pago &&
      Number(servicioForm.precio || 0) <= 0
    ) {
      alert(
        "Coloca el precio que se cobrará en Caja."
      );
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const payload = {
        empresa_id: empresaId,
        nombre: servicioForm.nombre.trim(),
        descripcion: servicioForm.descripcion.trim() || null,
        tipo: servicioForm.tipo,
        duracion_minutos: Number(servicioForm.duracion_minutos || 60),
        capacidad_default: Number(servicioForm.capacidad_default || 1),
        requiere_membresia: Boolean(servicioForm.requiere_membresia),
        requiere_pago: Boolean(servicioForm.requiere_pago),
        precio: servicioForm.requiere_pago
          ? Number(servicioForm.precio || 0)
          : 0,
        activo: Boolean(servicioForm.activo),
      };

      let respuesta;

      if (servicioEditandoId) {
        respuesta = await supabase
          .from("agenda_servicios")
          .update(payload)
          .eq("empresa_id", empresaId)
          .eq("id", servicioEditandoId);
      } else {
        respuesta = await supabase
          .from("agenda_servicios")
          .insert([payload]);
      }

      if (respuesta.error) throw respuesta.error;

      setServicioForm(
        esSalonBelleza
          ? SERVICIO_SALON_INICIAL
          : SERVICIO_INICIAL
      );
      setServicioEditandoId(null);
      await cargarServicios();
      alert(servicioEditandoId ? "Servicio actualizado." : "Servicio creado.");
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo guardar el servicio.");
    } finally {
      setGuardando(false);
    }
  }

  function editarServicio(servicio) {
    setServicioEditandoId(servicio.id);
    setServicioForm({
      nombre: servicio.nombre || "",
      descripcion: servicio.descripcion || "",
      tipo: servicio.tipo || "clase_grupal",
      duracion_minutos: Number(servicio.duracion_minutos || 60),
      capacidad_default: Number(servicio.capacidad_default || 1),
      requiere_membresia: Boolean(servicio.requiere_membresia),
      requiere_pago: Boolean(servicio.requiere_pago),
      precio: Number(servicio.precio || 0),
      activo: Boolean(servicio.activo),
    });
  }

  async function alternarServicio(servicio) {
    if (!esAdmin) return;

    const { error } = await supabase
      .from("agenda_servicios")
      .update({ activo: !servicio.activo })
      .eq("empresa_id", empresaId)
      .eq("id", servicio.id);

    if (error) {
      alert(error.message);
      return;
    }

    await cargarServicios();
  }

  async function guardarHorario() {
    if (!esAdmin) {
      alert("Solo el administrador puede configurar horarios.");
      return;
    }

    if (!horarioForm.servicio_id) {
      alert("Selecciona un servicio o clase.");
      return;
    }

    if (!horarioForm.hora_inicio || !horarioForm.hora_fin) {
      alert("Completa la hora de inicio y fin.");
      return;
    }

    if (horarioForm.hora_fin <= horarioForm.hora_inicio) {
      alert("La hora de finalización debe ser posterior a la hora de inicio.");
      return;
    }

    if (
      esSalonBelleza &&
      !horarioEditandoId &&
      diasHorarioSalon.length === 0
    ) {
      alert("Selecciona por lo menos un día.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const payloadBase = {
        empresa_id: empresaId,
        servicio_id: horarioForm.servicio_id,
        hora_inicio: horarioForm.hora_inicio,
        hora_fin: horarioForm.hora_fin,
        instructor: horarioForm.instructor.trim() || null,
        capacidad: Number(horarioForm.capacidad || 1),
        fecha_desde: horarioForm.fecha_desde || fechaHoy(),
        fecha_hasta: horarioForm.fecha_hasta || null,
        activo: Boolean(horarioForm.activo),
      };

      let respuesta;

      if (horarioEditandoId) {
        const payload = {
          ...payloadBase,
          dia_semana: Number(horarioForm.dia_semana),
        };

        respuesta = await supabase
          .from("agenda_horarios")
          .update(payload)
          .eq("empresa_id", empresaId)
          .eq("id", horarioEditandoId);
      } else if (esSalonBelleza) {
        const diasOrdenados = [...diasHorarioSalon].sort((a, b) => {
          const orden = [1, 2, 3, 4, 5, 6, 0];
          return orden.indexOf(a) - orden.indexOf(b);
        });

        const payloads = diasOrdenados.map((dia) => ({
          ...payloadBase,
          dia_semana: Number(dia),
        }));

        respuesta = await supabase
          .from("agenda_horarios")
          .insert(payloads);
      } else {
        respuesta = await supabase
          .from("agenda_horarios")
          .insert([
            {
              ...payloadBase,
              dia_semana: Number(horarioForm.dia_semana),
            },
          ]);
      }

      if (respuesta.error) throw respuesta.error;

      setHorarioForm(
        esSalonBelleza
          ? HORARIO_SALON_INICIAL
          : HORARIO_INICIAL
      );

      if (esSalonBelleza) {
        setDiasHorarioSalon([1, 2, 3, 4, 5]);
      }

      setHorarioEditandoId(null);
      await cargarHorarios();
      await cargarDisponibilidad();

      if (horarioEditandoId) {
        alert("Horario actualizado.");
      } else if (esSalonBelleza) {
        alert(
          diasHorarioSalon.length > 1
            ? "Horarios creados para los días seleccionados."
            : "Horario creado."
        );
      } else {
        alert("Horario creado.");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo guardar el horario.");
    } finally {
      setGuardando(false);
    }
  }

  function editarHorario(horario) {
    setHorarioEditandoId(horario.id);

    if (esSalonBelleza) {
      setDiasHorarioSalon([Number(horario.dia_semana ?? 5)]);
    }

    setHorarioForm({
      servicio_id: horario.servicio_id || "",
      dia_semana: Number(horario.dia_semana ?? 5),
      hora_inicio: String(horario.hora_inicio || "18:00").slice(0, 5),
      hora_fin: String(horario.hora_fin || "19:00").slice(0, 5),
      instructor: horario.instructor || "",
      capacidad: Number(horario.capacidad || 1),
      fecha_desde: horario.fecha_desde || fechaHoy(),
      fecha_hasta: horario.fecha_hasta || "",
      activo: Boolean(horario.activo),
    });
  }

  async function alternarHorario(horario) {
    if (!esAdmin) return;

    const { error } = await supabase
      .from("agenda_horarios")
      .update({ activo: !horario.activo })
      .eq("empresa_id", empresaId)
      .eq("id", horario.id);

    if (error) {
      alert(error.message);
      return;
    }

    await cargarHorarios();
    await cargarDisponibilidad();
  }

  async function crearReserva() {
    if (!clienteSeleccionado?.id) {
      alert(
        esSalonBelleza
          ? "Selecciona un cliente."
          : "Selecciona un alumno."
      );
      return;
    }

    if (!horarioSeleccionado) {
      alert("Selecciona un horario disponible.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const { data, error } = await supabase.rpc("crear_reserva_agenda", {
        p_empresa_id: empresaId,
        p_horario_id: horarioSeleccionado,
        p_cliente_id: clienteSeleccionado.id,
        p_fecha_reserva: fechaAgenda,
        p_observaciones: observaciones.trim() || null,
      });

      if (error) throw error;

      const resultado = data || {};

      setClienteSeleccionado(null);
      setBusquedaCliente("");
      setHorarioSeleccionado("");
      setObservaciones("");

      await Promise.all([
        cargarReservas(),
        cargarDisponibilidad(),
      ]);

      if (resultado.estado === "pendiente_pago") {
        alert(
          `Reserva creada. Este servicio requiere pago de $${Number(
            resultado.monto || 0
          ).toFixed(2)}.`
        );
      } else {
        alert(
          esSalonBelleza
            ? "Cita confirmada correctamente."
            : `Reserva confirmada. Quedan ${resultado.disponibles ?? 0} cupos disponibles.`
        );
      }

      setVista("hoy");
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo crear la reserva.");
    } finally {
      setGuardando(false);
    }
  }

  function cobrarReserva(reserva) {
    if (!reserva?.id || !reserva?.cliente_id) {
      alert("No se pudo identificar la reserva.");
      return;
    }

    if (
      normalizar(reserva.estado) !==
      "pendiente_pago"
    ) {
      alert(
        "Esta reserva ya no se encuentra pendiente de pago."
      );
      return;
    }

    const parametros = new URLSearchParams({
      clienteId: String(reserva.cliente_id),
      agendaReservaId: String(reserva.id),
      flujo: "agenda",
    });

    window.location.href =
      `/caja?${parametros.toString()}`;
  }

  async function cancelarReserva(reserva) {
    const confirmar = window.confirm(
      "¿Deseas cancelar esta reserva?"
    );

    if (!confirmar) return;

    setGuardando(true);

    try {
      const { error } = await supabase.rpc("cancelar_reserva_agenda", {
        p_empresa_id: empresaId,
        p_reserva_id: reserva.id,
      });

      if (error) throw error;

      await Promise.all([
        cargarReservas(),
        cargarDisponibilidad(),
      ]);
    } catch (err) {
      alert(err?.message || "No se pudo cancelar la reserva.");
    } finally {
      setGuardando(false);
    }
  }

  async function marcarAsistencia(reserva, asistio) {
    setGuardando(true);

    try {
      const { error } = await supabase.rpc("marcar_asistencia_agenda", {
        p_empresa_id: empresaId,
        p_reserva_id: reserva.id,
        p_asistio: asistio,
      });

      if (error) throw error;

      await cargarReservas();
    } catch (err) {
      alert(err?.message || "No se pudo registrar la asistencia.");
    } finally {
      setGuardando(false);
    }
  }

  function nombreCliente(id) {
    return mapaClientes.get(String(id))?.nombre || "Cliente";
  }

  function nombreDeReserva(reserva) {
    const nombreGuardado = String(
      reserva?.nombre_reserva || ""
    ).trim();

    if (nombreGuardado) {
      return nombreGuardado;
    }

    return nombreCliente(reserva?.cliente_id);
  }

  function nombreServicio(id) {
    return mapaServicios.get(String(id))?.nombre || "Servicio";
  }

  function moverFechaAgenda(dias) {
    const base = new Date(`${fechaAgenda}T12:00:00`);

    if (Number.isNaN(base.getTime())) return;

    base.setDate(base.getDate() + dias);

    const offset = base.getTimezoneOffset();
    const nuevaFecha = new Date(
      base.getTime() - offset * 60000
    )
      .toISOString()
      .slice(0, 10);

    setFechaAgenda(nuevaFecha);
    setHorarioSeleccionado("");
  }

  function irAgendaHoy() {
    setFechaAgenda(fechaHoy());
    setHorarioSeleccionado("");
  }

  function detalleHorario(id) {
    const h = mapaHorarios.get(String(id));
    if (!h) return "";
    return `${nombreDia(h.dia_semana)} · ${formatoHora(h.hora_inicio)}`;
  }

  if (cargando) {
    return (
      <main style={s.loading}>
        <div style={s.spinner} />
        <strong>Cargando Agenda...</strong>
      </main>
    );
  }

  return (
    <main style={s.page} className="agenda-page">
      <style>{AGENDA_CSS}</style>

      <header style={neo.hero} className="agenda-d-hero">
        <div style={neo.heroMain} className="agenda-d-hero-main">
          <div style={neo.brandRow} className="agenda-d-brand-row">
            <div style={neo.logoCard} className="agenda-d-logo-card">
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={neo.logo}
              />
            </div>

            <div>
              <span style={neo.heroEyebrow}>
                {esSalonBelleza
                  ? "KONAX · CITAS Y SERVICIOS"
                  : "KONAX · RESERVAS Y CLASES"}
              </span>
              <h1 style={neo.heroTitle}>
                {esSalonBelleza
                  ? "Agenda de Servicios"
                  : "Centro de Agenda"}
              </h1>
              <p style={neo.heroSubtitle}>
                {empresaNombre || "KONAX"} · {esSalonBelleza
                  ? "Controla servicios, profesionales, horarios, citas y cobros desde una sola agenda."
                  : "Controla horarios, capacidad, reservas y asistencia desde una vista operativa más clara."}
              </p>
            </div>
          </div>

          <div style={neo.heroActions} className="agenda-d-hero-actions">
            <button
              type="button"
              style={neo.heroGhost}
              onClick={() => (window.location.href = "/dashboard")}
            >
              ← Panel principal
            </button>

          </div>
        </div>

        <div style={neo.heroSide} className="agenda-d-hero-side">
          <span style={neo.heroSideLabel}>
            FECHA EN OPERACIÓN
          </span>
          <strong style={neo.heroSideDate}>
            {formatoFecha(fechaAgenda)}
          </strong>

          <div style={neo.heroSideStats}>
            <div>
              <span style={neo.heroSideMini}>Ocupación</span>
              <strong style={neo.heroSideValue}>
                {resumenAgenda.ocupacion}%
              </strong>
            </div>

            <div>
              <span style={neo.heroSideMini}>Reservas</span>
              <strong style={neo.heroSideValue}>
                {reservasFechaOperativas.length}
              </strong>
            </div>
          </div>

          <span style={neo.roleBadge}>
            {esAdmin ? "Administrador" : rol || "Usuario"}
          </span>
        </div>
      </header>

      {error && <div style={s.error}>{error}</div>}

      {alertaCancelacionCliente && (
        <section
          style={{
            margin: "0 auto 14px",
            maxWidth: 1450,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            border: "1px solid #F2C7C2",
            borderRadius: 16,
            background: "#FFF4F2",
            color: "#7A271A",
          }}
        >
          <div>
            <strong style={{ display: "block", marginBottom: 4 }}>
              ⚠ Cita cancelada por el cliente · horario liberado
            </strong>
            <span style={{ fontSize: 12 }}>
              {alertaCancelacionCliente.cliente} · {alertaCancelacionCliente.servicio}
              {" · "}
              {formatoFecha(alertaCancelacionCliente.fecha)}
              {" · "}
              {formatoHora(alertaCancelacionCliente.hora)}
              {alertaCancelacionCliente.motivo
                ? ` · Motivo: ${alertaCancelacionCliente.motivo}`
                : ""}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setFechaAgenda(
                  alertaCancelacionCliente.fecha || fechaHoy()
                );
                setHorarioSeleccionado("");
                setVista("nueva");
              }}
              style={{
                minHeight: 38,
                padding: "0 14px",
                border: 0,
                borderRadius: 10,
                background: "#111827",
                color: "#FFFFFF",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Agendar otro cliente
            </button>

            <button
              type="button"
              onClick={() => setAlertaCancelacionCliente(null)}
              style={{
                minHeight: 38,
                padding: "0 12px",
                border: "1px solid #E5A59D",
                borderRadius: 10,
                background: "#FFFFFF",
                color: "#7A271A",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Cerrar
            </button>
          </div>
        </section>
      )}

      <section style={neo.nav} className="agenda-d-nav">
        <button
          type="button"
          onClick={() => setVista("hoy")}
          style={{
            ...neo.navItem,
            ...(vista === "hoy" ? neo.navItemActive : {}),
          }}
        >
          <span>▦</span>
          Agenda
        </button>

        <button
          type="button"
          onClick={() => setVista("nueva")}
          style={{
            ...neo.navItem,
            ...(vista === "nueva" ? neo.navItemActive : {}),
          }}
        >
          <span>＋</span>
          {esSalonBelleza ? "Nueva reserva" : "Nueva reserva"}
        </button>

        <button
          type="button"
          onClick={() => setVista("reservas")}
          style={{
            ...neo.navItem,
            ...(vista === "reservas" ? neo.navItemActive : {}),
          }}
        >
          <span>≡</span>
          {esSalonBelleza ? "Reservas" : "Reservas"}
        </button>

        {esAdmin && (
          <button
            type="button"
            onClick={() => setVista("configuracion")}
            style={{
              ...neo.navItem,
              ...(vista === "configuracion"
                ? neo.navItemActive
                : {}),
            }}
          >
            <span>⚙</span>
            {esSalonBelleza
            ? "Servicios y horarios"
            : "Clases y horarios"}
          </button>
        )}

        <button
          type="button"
          onClick={refrescarTodo}
          disabled={guardando}
          style={neo.navRefresh}
        >
          {guardando ? "Actualizando..." : "↻ Actualizar"}
        </button>
      </section>

      {vista === "hoy" && (
        <>
          <section style={neo.weekShell} className="agenda-d-week-shell">
            <div style={neo.weekHeader}>
              <div>
                <span style={neo.sectionEyebrow}>
                  SEMANA OPERATIVA
                </span>
                <h2 style={neo.sectionTitle}>
                  Selecciona el día que deseas gestionar
                </h2>
              </div>

              <div style={neo.weekControls} className="agenda-d-week-controls">
                <button
                  type="button"
                  style={neo.roundButton}
                  onClick={() => moverFechaAgenda(-7)}
                >
                  ←
                </button>

                <button
                  type="button"
                  style={neo.todayPill}
                  onClick={irAgendaHoy}
                >
                  Hoy
                </button>

                <button
                  type="button"
                  style={neo.roundButton}
                  onClick={() => moverFechaAgenda(7)}
                >
                  →
                </button>
              </div>
            </div>

            <div style={neo.weekStrip} className="agenda-d-week-strip">
              {semanaAgenda.map((dia) => (
                <button
                  key={dia.fecha}
                  type="button"
                  onClick={() => {
                    setFechaAgenda(dia.fecha);
                    setHorarioSeleccionado("");
                  }}
                  style={{
                    ...neo.dayCard,
                    ...(dia.seleccionado
                      ? neo.dayCardActive
                      : {}),
                  }}
                >
                  <span
                    style={{
                      ...neo.dayName,
                      ...(dia.seleccionado
                        ? neo.dayTextActive
                        : {}),
                    }}
                  >
                    {dia.dia}
                  </span>

                  <strong
                    style={{
                      ...neo.dayNumber,
                      ...(dia.seleccionado
                        ? neo.dayTextActive
                        : {}),
                    }}
                  >
                    {dia.numero}
                  </strong>

                  <span
                    style={{
                      ...neo.dayMonth,
                      ...(dia.seleccionado
                        ? neo.dayTextActive
                        : {}),
                    }}
                  >
                    {dia.mes}
                  </span>

                  {dia.hoy && (
                    <span
                      style={{
                        ...neo.todayDot,
                        ...(dia.seleccionado
                          ? neo.todayDotActive
                          : {}),
                      }}
                    >
                      HOY
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section style={neo.kpiGrid} className="agenda-d-kpis">
            <article style={neo.kpiCard}>
              <span style={neo.kpiCaption}>
                {esSalonBelleza ? "SERVICIOS" : "CLASES"}
              </span>
              <div style={neo.kpiBody}>
                <strong style={neo.kpiNumber}>
                  {disponibilidadVisible.length}
                </strong>
                <span style={neo.kpiHint}>
                  {esSalonBelleza ? "programados hoy" : "programadas"}
                </span>
              </div>
            </article>

            <article style={neo.kpiCard}>
              <span style={neo.kpiCaption}>RESERVAS</span>
              <div style={neo.kpiBody}>
                <strong style={neo.kpiNumber}>
                  {reservasFechaOperativas.length}
                </strong>
                <span style={neo.kpiHint}>
                  activas hoy
                </span>
              </div>
            </article>

            <article style={neo.kpiCard}>
              <span style={neo.kpiCaption}>
                {esSalonBelleza ? "HORARIOS LIBRES" : "CUPOS LIBRES"}
              </span>
              <div style={neo.kpiBody}>
                <strong style={neo.kpiNumber}>
                  {resumenAgenda.cuposDisponibles}
                </strong>
                <span style={neo.kpiHint}>
                  disponibles
                </span>
              </div>
            </article>

            <article style={neo.kpiCardAccent}>
              <span style={neo.kpiCaptionAccent}>
                OCUPACIÓN
              </span>
              <div style={neo.kpiBody}>
                <strong style={neo.kpiNumberAccent}>
                  {resumenAgenda.ocupacion}%
                </strong>
                <span style={neo.kpiHintAccent}>
                  {esSalonBelleza ? "de la agenda" : "de la capacidad"}
                </span>
              </div>
            </article>
          </section>

          {esSalonBelleza ? (
            <section
              style={{
                ...neo.commandGrid,
                gridTemplateColumns: "minmax(0,1fr) 300px",
              }}
              className="agenda-d-command-grid"
            >
              <article
                style={{
                  ...neo.schedulePanel,
                  minWidth: 0,
                }}
              >
                <div style={neo.panelTop}>
                  <div>
                    <span style={neo.sectionEyebrow}>
                      AGENDA DEL DÍA
                    </span>
                    <h2 style={neo.panelHeading}>
                      Citas de la jornada
                    </h2>
                  </div>

                  <div style={neo.dateInline}>
                    <button
                      type="button"
                      onClick={() => moverFechaAgenda(-1)}
                      style={neo.dateArrow}
                    >
                      ‹
                    </button>

                    <input
                      type="date"
                      value={fechaAgenda}
                      onChange={(e) => {
                        setFechaAgenda(e.target.value);
                        setHorarioSeleccionado("");
                      }}
                      style={neo.dateInput}
                    />

                    <button
                      type="button"
                      onClick={() => moverFechaAgenda(1)}
                      style={neo.dateArrow}
                    >
                      ›
                    </button>
                  </div>
                </div>

                {reservasFechaOperativas.length === 0 ? (
                  <div style={neo.emptyLarge}>
                    <div style={neo.emptyIcon}>◎</div>
                    <strong style={neo.emptyTitle}>
                      No hay citas para este día
                    </strong>
                    <span style={neo.emptyText}>
                      Selecciona otra fecha o crea una nueva cita.
                    </span>

                    <button
                      type="button"
                      style={neo.emptyButton}
                      onClick={() => setVista("nueva")}
                    >
                      Nueva reserva
                    </button>
                  </div>
                ) : (
                  <div style={neo.timeline}>
                    {reservasFechaOperativas.map((reserva, index) => {
                      const estado = normalizar(reserva.estado);
                      const esConfirmada = estado === "confirmada";
                      const asistio = estado === "asistio";
                      const noAsistio = estado === "no_asistio";
                      const pendiente = estado === "pendiente_pago";
                      const cancelada = estado === "cancelada";

                      return (
                        <div
                          key={reserva.id}
                          style={{
                            ...neo.timelineRow,
                            gridTemplateColumns:
                              "26px 96px minmax(0,1fr) 118px",
                          }}
                          className="agenda-d-timeline-row"
                        >
                          <div style={neo.timelineRail}>
                            <span style={neo.timelineDot} />
                            {index <
                              reservasFechaOperativas.length - 1 && (
                              <span style={neo.timelineLine} />
                            )}
                          </div>

                          <div style={neo.timelineTime}>
                            <strong>
                              {formatoHora(reserva.hora_inicio)}
                            </strong>
                            <span>
                              {reserva.hora_fin
                                ? formatoHora(reserva.hora_fin)
                                : ""}
                            </span>
                          </div>

                          <div style={neo.timelineClass}>
                            <div style={neo.classTopLine}>
                              <span style={neo.classBadge}>
                                CITA
                              </span>

                              <span
                                style={{
                                  ...neo.statusTag,
                                  ...(asistio
                                    ? neo.statusSuccess
                                    : noAsistio
                                    ? neo.statusNeutral
                                    : pendiente
                                    ? neo.statusPending
                                    : esConfirmada
                                    ? neo.statusConfirmed
                                    : {}),
                                }}
                              >
                                {cancelada
                                  ? "CANCELADA"
                                  : asistio
                                  ? "ASISTIÓ"
                                  : noAsistio
                                  ? "NO ASISTIÓ"
                                  : pendiente
                                  ? "PENDIENTE"
                                  : "CONFIRMADA"}
                              </span>
                            </div>

                            <strong style={neo.classTitle}>
                              {nombreDeReserva(reserva)}
                            </strong>

                            <span style={neo.classMeta}>
                              {nombreServicio(reserva.servicio_id)}
                              {reserva.telefono
                                ? ` · ${reserva.telefono}`
                                : ""}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gap: 6,
                            }}
                          >
                            <button
                              type="button"
                              style={neo.reserveButton}
                              onClick={() => {
                                setBusquedaReservas(
                                  nombreDeReserva(reserva) || ""
                                );
                                setVista("reservas");
                              }}
                            >
                              Ver cita
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {reservasFechaOperativas.length > 0 && (
                  <button
                    type="button"
                    style={{
                      ...neo.viewAllButton,
                      marginTop: 12,
                    }}
                    onClick={() => setVista("reservas")}
                  >
                    Administrar citas
                  </button>
                )}
              </article>

              <aside style={neo.controlPanel}>
                <span style={neo.controlEyebrow}>
                  RESUMEN DE LA JORNADA
                </span>
                <h3 style={neo.controlTitle}>
                  Estado del día
                </h3>

                <div style={neo.controlStats}>
                  <div style={neo.controlRow}>
                    <span>Citas</span>
                    <strong>
                      {reservasFechaOperativas.length}
                    </strong>
                  </div>

                  <div style={neo.controlRow}>
                    <span>Confirmadas</span>
                    <strong>
                      {resumenReservas.confirmadas}
                    </strong>
                  </div>

                  <div style={neo.controlRow}>
                    <span>Asistieron</span>
                    <strong>
                      {resumenReservas.asistieron}
                    </strong>
                  </div>

                  <div style={neo.controlRow}>
                    <span>Pendientes</span>
                    <strong>
                      {resumenReservas.pendientes}
                    </strong>
                  </div>

                  <div style={neo.controlRow}>
                    <span>No asistieron</span>
                    <strong>
                      {resumenReservas.noAsistieron}
                    </strong>
                  </div>

                  <div style={neo.controlRow}>
                    <span>Horarios libres</span>
                    <strong>
                      {resumenAgenda.cuposDisponibles}
                    </strong>
                  </div>
                </div>

                <div style={neo.controlDivider} />

                <button
                  type="button"
                  style={neo.controlPrimary}
                  onClick={() => setVista("nueva")}
                >
                  + Nueva reserva
                </button>

                <button
                  type="button"
                  style={neo.controlSecondary}
                  onClick={() => setVista("reservas")}
                >
                  Administrar citas
                </button>

                {esAdmin && (
                  <button
                    type="button"
                    style={neo.controlSecondary}
                    onClick={() => setVista("configuracion")}
                  >
                    Servicios y horarios
                  </button>
                )}
              </aside>
            </section>
          ) : (
          <section style={neo.commandGrid} className="agenda-d-command-grid">
            <article style={neo.schedulePanel}>
              <div style={neo.panelTop}>
                <div>
                  <span style={neo.sectionEyebrow}>
                    PROGRAMACIÓN DEL DÍA
                  </span>
                  <h2 style={neo.panelHeading}>
                    {esSalonBelleza
                      ? "Servicios y horarios"
                      : "Horarios y capacidad"}
                  </h2>
                </div>

                <div style={neo.dateInline}>
                  <button
                    type="button"
                    onClick={() => moverFechaAgenda(-1)}
                    style={neo.dateArrow}
                  >
                    ‹
                  </button>

                  <input
                    type="date"
                    value={fechaAgenda}
                    onChange={(e) => {
                      setFechaAgenda(e.target.value);
                      setHorarioSeleccionado("");
                    }}
                    style={neo.dateInput}
                  />

                  <button
                    type="button"
                    onClick={() => moverFechaAgenda(1)}
                    style={neo.dateArrow}
                  >
                    ›
                  </button>
                </div>
              </div>

              {disponibilidadVisible.length === 0 ? (
                <div style={neo.emptyLarge}>
                  <div style={neo.emptyIcon}>◷</div>
                  <strong style={neo.emptyTitle}>
                    {esSalonBelleza
                      ? "No hay servicios programados"
                      : "No hay clases programadas"}
                  </strong>
                  <span style={neo.emptyText}>
                    {esSalonBelleza
                      ? "Selecciona otra fecha o configura los servicios y horarios disponibles."
                      : "Selecciona otra fecha o crea un horario desde Clases y horarios."}
                  </span>

                  {esAdmin && (
                    <button
                      type="button"
                      style={neo.emptyButton}
                      onClick={() => setVista("configuracion")}
                    >
                      {esSalonBelleza
                        ? "Configurar servicios y horarios"
                        : "Configurar horario"}
                    </button>
                  )}
                </div>
              ) : (
                <div style={neo.timeline}>
                  {disponibilidadVisible.map((item, index) => {
                    const capacidad = Number(item.capacidad || 0);
                    const reservados = Number(item.reservados || 0);
                    const libres = Number(item.disponibles || 0);
                    const porcentaje =
                      capacidad > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (reservados / capacidad) * 100
                            )
                          )
                        : 0;

                    const lleno = libres <= 0;

                    return (
                      <div
                        key={item.horario_id}
                        style={neo.timelineRow}
                        className="agenda-d-timeline-row"
                      >
                        <div style={neo.timelineRail}>
                          <span style={neo.timelineDot} />
                          {index <
                            disponibilidadVisible.length - 1 && (
                            <span style={neo.timelineLine} />
                          )}
                        </div>

                        <div style={neo.timelineTime}>
                          <strong>
                            {formatoHora(item.hora_inicio)}
                          </strong>
                          <span>
                            {formatoHora(item.hora_fin)}
                          </span>
                        </div>

                        <div style={neo.timelineClass}>
                          <div style={neo.classTopLine}>
                            <span style={neo.classBadge}>
                              {esSalonBelleza
                              ? "SERVICIO"
                              : item.servicio_tipo === "cita_individual"
                              ? "CITA"
                              : "CLASE"}
                            </span>

                            <span
                              style={{
                                ...neo.capacityStatus,
                                ...(lleno
                                  ? neo.capacityStatusFull
                                  : {}),
                              }}
                            >
                              {esSalonBelleza
                                ? lleno
                                  ? "OCUPADO"
                                  : libres === 1
                                  ? "DISPONIBLE"
                                  : `${libres} DISPONIBLES`
                                : lleno
                                ? "COMPLETO"
                                : `${libres} CUPOS`}
                            </span>
                          </div>

                          <strong style={neo.classTitle}>
                            {item.servicio_nombre}
                          </strong>

                          <span style={neo.classMeta}>
                            {esSalonBelleza ? (
                              <>
                                {item.instructor || "Profesional por asignar"}
                                {" · "}
                                {item.requiere_pago ? "Cobro en Caja" : "Sin cobro pendiente"}
                              </>
                            ) : (
                              <>
                                {item.instructor || (esSalonBelleza ? "Profesional por asignar" : "Sin instructor")}
                                {" · "}
                                {item.requiere_membresia
                                  ? "Membresía activa"
                                  : "Acceso abierto"}
                              </>
                            )}
                          </span>

                          <div style={neo.capacityBar}>
                            <div
                              style={{
                                ...neo.capacityFill,
                                width: `${porcentaje}%`,
                              }}
                            />
                          </div>

                          <div style={neo.capacityFooter}>
                            <span>
                              {esSalonBelleza
                                ? `${reservados} reserva${reservados === 1 ? "" : "s"}`
                                : `${reservados} reservados`}
                            </span>
                            <span>
                              {esSalonBelleza
                                ? `${libres} disponible${libres === 1 ? "" : "s"}`
                                : `${capacidad} capacidad total`}
                            </span>
                          </div>
                        </div>

                        <div style={neo.timelineAction}>
                          <button
                            type="button"
                            disabled={lleno}
                            onClick={() => {
                              setHorarioSeleccionado(
                                item.horario_id
                              );
                              setVista("nueva");
                            }}
                            style={
                              lleno
                                ? neo.reserveDisabled
                                : neo.reserveButton
                            }
                          >
                            {lleno
                              ? esSalonBelleza
                                ? "Horario ocupado"
                                : "Sin cupos"
                              : esSalonBelleza
                              ? "Reservar cita"
                              : "Reservar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article style={neo.reservationsPanel}>
              <div style={neo.panelTop}>
                <div>
                  <span style={neo.sectionEyebrow}>
                    {esSalonBelleza ? "CITAS DE LA JORNADA" : "RESERVAS DE LA JORNADA"}
                  </span>
                  <h2 style={neo.panelHeading}>
                    {esSalonBelleza
                      ? "Clientes con cita"
                      : "Alumnos reservados"}
                  </h2>
                </div>

                <span style={neo.counterPill}>
                  {reservasFechaOperativas.length}
                </span>
              </div>

              {reservasFechaOperativas.length === 0 ? (
                <div style={neo.emptySmall}>
                  <span style={neo.emptySmallIcon}>◎</span>
                  <strong>{esSalonBelleza ? "Sin citas" : "Sin reservas"}</strong>
                  <span>
                    {esSalonBelleza
                      ? "Todavía no hay clientes con cita para este día."
                      : "Todavía no hay alumnos reservados para este día."}
                  </span>
                </div>
              ) : (
                <div style={neo.reservationList}>
                  {reservasFechaOperativas
                    .slice(0, 8)
                    .map((reserva) => {
                      const estado = normalizar(
                        reserva.estado
                      );

                      const esConfirmada =
                        estado === "confirmada";
                      const asistio =
                        estado === "asistio";
                      const noAsistio =
                        estado === "no_asistio";
                      const pendiente =
                        estado === "pendiente_pago";

                      return (
                        <div
                          key={reserva.id}
                          style={neo.reservationRow}
                          className="agenda-d-reservation-row"
                        >
                          <div style={neo.avatar}>
                            {String(
                              nombreDeReserva(
                                reserva
                              ) || "C"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div style={neo.reservationInfo}>
                            <strong style={neo.reservationName}>
                              {nombreDeReserva(
                                reserva
                              )}
                            </strong>

                            <span style={neo.reservationMeta}>
                              {nombreServicio(
                                reserva.servicio_id
                              )}
                              {" · "}
                              {formatoHora(
                                reserva.hora_inicio
                              )}
                            </span>
                          </div>

                          <span
                            style={{
                              ...neo.statusTag,
                              ...(asistio
                                ? neo.statusSuccess
                                : noAsistio
                                ? neo.statusNeutral
                                : pendiente
                                ? neo.statusPending
                                : esConfirmada
                                ? neo.statusConfirmed
                                : {}),
                            }}
                          >
                            {asistio
                              ? "ASISTIÓ"
                              : noAsistio
                              ? "NO ASISTIÓ"
                              : pendiente
                              ? "PENDIENTE"
                              : "CONFIRMADA"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              {reservasFechaOperativas.length > 8 && (
                <button
                  type="button"
                  style={neo.viewAllButton}
                  onClick={() => setVista("reservas")}
                >
                  Ver todas las reservas
                </button>
              )}
            </article>

            <aside style={neo.controlPanel}>
              <span style={neo.controlEyebrow}>
                CONTROL OPERATIVO
              </span>
              <h3 style={neo.controlTitle}>
                Estado del día
              </h3>

              <div style={neo.occupancyCircle}>
                <div
                  style={{
                    ...neo.occupancyRing,
                    background: `conic-gradient(#5BE39A ${resumenAgenda.ocupacion}%, rgba(255,255,255,.14) 0)`,
                  }}
                >
                  <div style={neo.occupancyInner}>
                    <strong>
                      {resumenAgenda.ocupacion}%
                    </strong>
                    <span>ocupación</span>
                  </div>
                </div>
              </div>

              <div style={neo.controlStats}>
                <div style={neo.controlRow}>
                  <span>{esSalonBelleza ? "Espacios" : "Capacidad"}</span>
                  <strong>
                    {resumenAgenda.capacidadTotal}
                  </strong>
                </div>

                <div style={neo.controlRow}>
                  <span>{esSalonBelleza ? "Reservas" : "Reservados"}</span>
                  <strong>
                    {resumenAgenda.reservadosTotal}
                  </strong>
                </div>

                <div style={neo.controlRow}>
                  <span>Disponibles</span>
                  <strong>
                    {resumenAgenda.cuposDisponibles}
                  </strong>
                </div>
              </div>

              <div style={neo.controlDivider} />

              <span style={neo.controlLabel}>
                ESTADO DE RESERVAS
              </span>

              <div style={neo.stateGrid}>
                <div style={neo.stateBox}>
                  <span>Confirmadas</span>
                  <strong>
                    {resumenReservas.confirmadas}
                  </strong>
                </div>

                <div style={neo.stateBox}>
                  <span>Asistieron</span>
                  <strong>
                    {resumenReservas.asistieron}
                  </strong>
                </div>

                <div style={neo.stateBox}>
                  <span>Pendientes</span>
                  <strong>
                    {resumenReservas.pendientes}
                  </strong>
                </div>

                <div style={neo.stateBox}>
                  <span>No asistieron</span>
                  <strong>
                    {resumenReservas.noAsistieron}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                style={neo.controlPrimary}
                onClick={() => setVista("nueva")}
              >
                + Nueva reserva
              </button>

              <button
                type="button"
                style={neo.controlSecondary}
                onClick={() => setVista("reservas")}
              >
                Gestionar reservas
              </button>

              {esAdmin && (
                <button
                  type="button"
                  style={neo.controlSecondary}
                  onClick={() =>
                    setVista("configuracion")
                  }
                >
                  {esSalonBelleza ? "Configurar servicios" : "Configurar clases"}
                </button>
              )}
            </aside>
          </section>
          )}
        </>
      )}

      {vista === "nueva" && (
        <>
          <section
            style={pro.stepper}
            className="agenda-stepper"
          >
            <div
              style={{
                ...pro.step,
                ...(clienteSeleccionado ? pro.stepActive : {}),
              }}
            >
              <span style={pro.stepNumber}>1</span>
              {esSalonBelleza
                ? "Seleccionar cliente"
                : "Seleccionar alumno"}
            </div>

            <div
              style={{
                ...pro.step,
                ...(horarioSeleccionado ? pro.stepActive : {}),
              }}
            >
              <span style={pro.stepNumber}>2</span>
              {esSalonBelleza
                ? "Elegir servicio y hora"
                : "Elegir fecha y horario"}
            </div>

            <div
              style={{
                ...pro.step,
                ...(clienteSeleccionado && horarioSeleccionado
                  ? pro.stepActive
                  : {}),
              }}
            >
              <span style={pro.stepNumber}>3</span>
              {esSalonBelleza
                ? "Confirmar cita"
                : "Confirmar reserva"}
            </div>
          </section>

          <section style={s.twoColumns}>
          <article style={s.panel}>
            <span style={pro.panelEyebrow}>
              {esSalonBelleza ? "NUEVA CITA" : "NUEVA RESERVA"}
            </span>
            <h2 style={pro.panelTitle}>
              {esSalonBelleza ? "Datos de la cita" : "Datos de la reserva"}
            </h2>
            <p style={{ ...s.muted, margin: "6px 0 0" }}>
              {esSalonBelleza
                ? "Selecciona el cliente, la fecha y el horario del servicio."
                : "Selecciona al alumno, la fecha y uno de los horarios disponibles."}
            </p>

            <div style={{ marginTop: 16 }}>
              <Campo
                label={
                  esSalonBelleza
                    ? "Buscar cliente por nombre, cédula o teléfono"
                    : "Buscar por nombre, cédula o teléfono"
                }
              >
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setClienteSeleccionado(null);
                  }}
                  style={s.input}
                  placeholder={esSalonBelleza ? "Ej. María González" : "Ej. LIA SAMANIEGO"}
                />
              </Campo>

              {!clienteSeleccionado &&
                busquedaCliente.trim() &&
                clientesFiltrados.length > 0 && (
                  <div style={s.searchResults}>
                    {clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        style={s.searchItem}
                        onClick={() => {
                          setClienteSeleccionado(cliente);
                          setBusquedaCliente(cliente.nombre || "");
                        }}
                      >
                        <strong>{cliente.nombre || (esSalonBelleza ? "Cliente" : "Alumno")}</strong>
                        <span style={s.muted}>
                          {cliente.cedula || cliente.telefono || "Sin identificación"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

              {clienteSeleccionado && (
                <div style={s.selectedClient}>
                  <div>
                    <span style={s.muted}>
                      {esSalonBelleza
                        ? "Cliente seleccionado"
                        : "Alumno seleccionado"}
                    </span>
                    <strong style={{ display: "block", marginTop: 4 }}>
                      {clienteSeleccionado.nombre}
                    </strong>
                  </div>

                  <button
                    type="button"
                    style={s.linkButton}
                    onClick={() => {
                      setClienteSeleccionado(null);
                      setBusquedaCliente("");
                    }}
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>

            <div style={s.formGrid}>
              <Campo label="Fecha">
                <input
                  type="date"
                  value={fechaAgenda}
                  min={fechaHoy()}
                  onChange={(e) => {
                    setFechaAgenda(e.target.value);
                    setHorarioSeleccionado("");
                  }}
                  style={s.input}
                />
              </Campo>

              <Campo
                label={
                  esSalonBelleza
                    ? "Servicio y horario disponible"
                    : "Clase / horario disponible"
                }
              >
                <select
                  value={horarioSeleccionado}
                  onChange={(e) => setHorarioSeleccionado(e.target.value)}
                  style={s.input}
                >
                  <option value="">Seleccionar</option>
                  {(esSalonBelleza
                    ? disponibilidadVisible
                    : disponibilidad
                  ).map((item) => (
                    <option
                      key={item.horario_id}
                      value={item.horario_id}
                      disabled={Number(item.disponibles) <= 0}
                    >
                      {item.servicio_nombre} · {formatoHora(item.hora_inicio)} ·{" "}
                      {esSalonBelleza
                        ? item.disponibles > 0
                          ? `${item.disponibles} disponible${Number(item.disponibles) === 1 ? "" : "s"}`
                          : "ocupado"
                        : `${item.disponibles} cupos`}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            <Campo label="Observaciones">
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                style={{ ...s.input, minHeight: 90, resize: "vertical" }}
                placeholder="Opcional"
              />
            </Campo>

            <button
              type="button"
              style={s.primaryWide}
              onClick={crearReserva}
              disabled={guardando}
            >
              {guardando
                ? "Guardando..."
                : esSalonBelleza
                ? "Confirmar cita"
                : "Confirmar reserva"}
            </button>
          </article>

          <article style={s.panel}>
            <span style={pro.panelEyebrow}>DISPONIBILIDAD EN TIEMPO REAL</span>
            <h2 style={pro.panelTitle}>{formatoFecha(fechaAgenda)}</h2>
            <p style={{ ...s.muted, margin: "6px 0 12px" }}>
              {esSalonBelleza
                ? "Los horarios se actualizan automáticamente al confirmar o cancelar una cita."
                : "Los cupos se actualizan automáticamente al confirmar o cancelar una reserva."}
            </p>

            <div style={s.slotList}>
              {(esSalonBelleza
                ? disponibilidadVisible
                : disponibilidad
              ).length === 0 ? (
                <p style={s.muted}>No hay horarios para esta fecha.</p>
              ) : (
                (esSalonBelleza
                  ? disponibilidadVisible
                  : disponibilidad
                ).map((item) => (
                  <button
                    key={item.horario_id}
                    type="button"
                    style={{
                      ...s.slot,
                      ...(horarioSeleccionado === item.horario_id
                        ? s.slotSelected
                        : {}),
                    }}
                    disabled={Number(item.disponibles) <= 0}
                    onClick={() => setHorarioSeleccionado(item.horario_id)}
                  >
                    <div>
                      <strong>{item.servicio_nombre}</strong>
                      <span style={s.slotDetail}>
                        {formatoHora(item.hora_inicio)} ·{" "}
                        {item.instructor || (esSalonBelleza ? "Profesional por asignar" : "Sin instructor")}
                      </span>
                    </div>

                    <span
                      style={
                        Number(item.disponibles) > 0
                          ? s.smallGood
                          : s.smallFull
                      }
                    >
                      {esSalonBelleza
                        ? Number(item.disponibles) > 0
                          ? "Disponible"
                          : "Ocupado"
                        : `${item.disponibles}/${item.capacidad}`}
                    </span>
                  </button>
                ))
              )}
            </div>
          </article>
        </section>
        </>
      )}

      {vista === "reservas" && (
        <section
          style={{
            ...pro.panel,
            maxWidth: 1450,
            margin: "0 auto 18px",
          }}
        >
          <div style={pro.panelHeader}>
            <div>
              <span style={pro.panelEyebrow}>
                {esSalonBelleza ? "RESERVAS" : "CONTROL Y SEGUIMIENTO"}
              </span>
              <h2 style={pro.panelTitle}>
                {esSalonBelleza ? "Administrar citas" : "Reservas"}
              </h2>
              <p style={{ ...s.muted, margin: "6px 0 0" }}>
                {esSalonBelleza
                  ? "Consulta, filtra y administra las citas del salón."
                  : "Consulta reservas, asistencia, pendientes de pago y cancelaciones."}
              </p>
            </div>

            <span style={pro.counter}>
              {reservasFiltradas.length} registros
            </span>
          </div>

          <div style={pro.filters}>
            <div className="agenda-reserva-filtros">
              <Campo label="Buscar reserva">
                <input
                  type="text"
                  value={busquedaReservas}
                  onChange={(e) => setBusquedaReservas(e.target.value)}
                  style={pro.input}
                  placeholder={
                    esSalonBelleza
                      ? "Cliente, teléfono, servicio o fecha"
                      : "Alumno, cédula, teléfono, clase o fecha"
                  }
                />
              </Campo>

              <Campo label="Estado">
                <select
                  value={estadoReservaFiltro}
                  onChange={(e) => setEstadoReservaFiltro(e.target.value)}
                  style={pro.input}
                >
                  <option value="Todos">Todos</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="pendiente_pago">Pendiente de pago</option>
                  <option value="asistio">Asistió</option>
                  <option value="no_asistio">No asistió</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </Campo>
            </div>
          </div>

          <ReservaLista
            reservas={reservasFiltradas}
            nombreReserva={nombreDeReserva}
            nombreServicio={nombreServicio}
            onCancelar={cancelarReserva}
            onAsistencia={marcarAsistencia}
            onCobrar={cobrarReserva}
            mostrarFecha
          />
        </section>
      )}

      {vista === "configuracion" && esAdmin && (
        <>
          <section style={s.portalPanel} className="agenda-portal-responsive">
            <div style={s.portalMain}>
              <span style={s.eyebrowSmall}>
                PORTAL DE RESERVAS
              </span>

              <h2 style={s.panelTitle}>
                Comparte tus reservas
              </h2>

              <p style={s.portalText}>
                Usa un solo enlace para Instagram, WhatsApp,
                código QR o la página web del negocio.
              </p>

              <div style={s.portalFields}>
                <Campo label="Nombre visible">
                  <input
                    value={portalConfig.titulo_publico}
                    onChange={(e) =>
                      setPortalConfig({
                        ...portalConfig,
                        titulo_publico: e.target.value,
                      })
                    }
                    style={s.input}
                    placeholder={empresaNombre}
                  />
                </Campo>

                <Campo label="Enlace del negocio">
                  <div style={s.slugField}>
                    <span style={s.slugPrefix}>
                      /reservar/
                    </span>
                    <input
                      value={portalConfig.slug}
                      onChange={(e) =>
                        setPortalConfig({
                          ...portalConfig,
                          slug: e.target.value,
                        })
                      }
                      style={s.slugInput}
                      placeholder="fitness-507"
                    />
                  </div>
                </Campo>
              </div>

              <label style={s.portalToggle}>
                <input
                  type="checkbox"
                  checked={portalConfig.activo}
                  onChange={(e) =>
                    setPortalConfig({
                      ...portalConfig,
                      activo: e.target.checked,
                    })
                  }
                />
                <span>
                  <strong>Reservas online activas</strong>
                  <small>
                    Si se desactiva, el enlace público deja de aceptar reservas.
                  </small>
                </span>
              </label>

              <div style={s.portalLinkBox}>
                <span>ENLACE PÚBLICO</span>
                <strong>
                  {obtenerEnlacePortal() || "Configura el enlace"}
                </strong>
              </div>

              <div style={s.portalActions}>
                <button
                  type="button"
                  style={s.primaryButton}
                  onClick={guardarConfiguracionPortal}
                  disabled={guardandoPortal}
                >
                  {guardandoPortal
                    ? "Guardando..."
                    : "Guardar portal"}
                </button>

                <button
                  type="button"
                  style={s.secondaryButton}
                  onClick={copiarEnlacePortal}
                  disabled={!portalConfig.slug}
                >
                  Copiar enlace
                </button>

                <button
                  type="button"
                  style={s.secondaryButton}
                  onClick={compartirPortalWhatsApp}
                  disabled={!portalConfig.slug}
                >
                  WhatsApp
                </button>

                <button
                  type="button"
                  style={s.secondaryButton}
                  onClick={abrirPortal}
                  disabled={!portalConfig.slug}
                >
                  Ver portal
                </button>

                <button
                  type="button"
                  style={s.secondaryButton}
                  onClick={descargarQrPortal}
                  disabled={!portalConfig.slug}
                >
                  Descargar QR
                </button>
              </div>
            </div>

            <div style={s.qrPanel}>
              {portalConfig.slug ? (
                <>
                  <img
                    src={obtenerQrPortal()}
                    alt="QR del portal de reservas"
                    style={s.qrImage}
                  />
                  <strong>Escanea para reservar</strong>
                  <span>
                    Ideal para recepción, volante o mostrador.
                  </span>
                </>
              ) : (
                <div style={s.qrEmpty}>
                  QR disponible al configurar el enlace.
                </div>
              )}
            </div>
          </section>

          <section style={s.twoColumns}>
            <article style={s.panel}>
              <span style={s.eyebrowSmall}>CONFIGURACIÓN</span>
              <h2 style={s.panelTitle}>
                {servicioEditandoId
                  ? "Editar servicio"
                  : esSalonBelleza
                  ? "Nuevo servicio del salón"
                  : "Nueva clase o servicio"}
              </h2>

              <div style={s.formGrid}>
                <Campo label="Nombre">
                  <input
                    value={servicioForm.nombre}
                    onChange={(e) =>
                      setServicioForm({
                        ...servicioForm,
                        nombre: e.target.value,
                      })
                    }
                    style={s.input}
                    placeholder={esSalonBelleza ? "Ej. Corte, manicure o masaje" : "Spinning"}
                  />
                </Campo>

                <Campo label="Tipo">
                  <select
                    value={servicioForm.tipo}
                    onChange={(e) =>
                      setServicioForm({
                        ...servicioForm,
                        tipo: e.target.value,
                      })
                    }
                    style={s.input}
                  >
                    <option value="clase_grupal">
                      {esSalonBelleza ? "Servicio grupal" : "Clase grupal"}
                    </option>
                    <option value="cita_individual">
                      {esSalonBelleza ? "Servicio individual" : "Cita individual"}
                    </option>
                  </select>
                </Campo>

                <Campo label="Duración (minutos)">
                  <input
                    type="number"
                    min="1"
                    value={servicioForm.duracion_minutos}
                    onChange={(e) =>
                      setServicioForm({
                        ...servicioForm,
                        duracion_minutos: e.target.value,
                      })
                    }
                    style={s.input}
                  />
                </Campo>

                <Campo
                  label={
                    esSalonBelleza
                      ? "Citas simultáneas"
                      : "Capacidad sugerida"
                  }
                >
                  <input
                    type="number"
                    min="1"
                    value={servicioForm.capacidad_default}
                    onChange={(e) =>
                      setServicioForm({
                        ...servicioForm,
                        capacidad_default: e.target.value,
                      })
                    }
                    style={s.input}
                  />
                </Campo>
              </div>

              <Campo label="Descripción">
                <textarea
                  value={servicioForm.descripcion}
                  onChange={(e) =>
                    setServicioForm({
                      ...servicioForm,
                      descripcion: e.target.value,
                    })
                  }
                  style={{ ...s.input, minHeight: 82, resize: "vertical" }}
                  placeholder={
                    esSalonBelleza
                      ? "Ej. Manicure semipermanente"
                      : "Clase grupal de spinning"
                  }
                />
              </Campo>

              <Campo label="Modalidad de reserva">
                {esSalonBelleza ? (
                  <select value="pago_local" disabled style={s.input}>
                    <option value="pago_local">
                      Servicio del salón · Cobro en Caja
                    </option>
                  </select>
                ) : (
                  <select
                    value={modalidadServicio(servicioForm)}
                    onChange={(e) =>
                      aplicarModalidadServicio(e.target.value)
                    }
                    style={s.input}
                  >
                    <option value="solo_miembros">
                      Miembro activo · Incluida en membresía
                    </option>
                    <option value="pago_local">
                      Pago al llegar · No requiere membresía
                    </option>
                    <option value="miembros_pago">
                      Miembro activo · Servicio personalizado con costo
                    </option>
                  </select>
                )}
              </Campo>

              {servicioForm.requiere_pago && (
                <>
                  <Campo
                    label={
                      esSalonBelleza
                        ? "Precio del servicio"
                        : "Precio de la clase / servicio"
                    }
                  >
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={servicioForm.precio}
                      onChange={(e) =>
                        setServicioForm({
                          ...servicioForm,
                          precio: e.target.value,
                        })
                      }
                      style={s.input}
                      placeholder="6.00"
                    />
                  </Campo>

                  <div style={s.paymentInfo}>
                    <strong>
                      Cobro en el local
                    </strong>
                    <span>
                      {esSalonBelleza
                        ? "La cita queda pendiente de pago y recepción la cobra desde Caja al finalizar el servicio."
                        : "El cliente reserva su cupo. Si esta modalidad tiene precio, la reserva queda pendiente de pago y recepción la cobra desde Caja cuando el cliente llegue."}
                    </span>
                  </div>
                </>
              )}

              <div style={s.formActions}>
                {servicioEditandoId && (
                  <button
                    type="button"
                    style={s.secondaryButton}
                    onClick={() => {
                      setServicioEditandoId(null);
                      setServicioForm(
                        esSalonBelleza
                          ? SERVICIO_SALON_INICIAL
                          : SERVICIO_INICIAL
                      );
                    }}
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="button"
                  style={s.primaryButton}
                  onClick={guardarServicio}
                  disabled={guardando}
                >
                  {servicioEditandoId ? "Guardar cambios" : "Crear servicio"}
                </button>
              </div>
            </article>

            <article style={s.panel} className="agenda-horario-panel">
              <span style={s.eyebrowSmall}>HORARIO</span>
              <h2 style={s.panelTitle}>
                {horarioEditandoId ? "Editar horario" : "Nuevo horario"}
              </h2>

              <Campo label={esSalonBelleza ? "Servicio" : "Clase / servicio"}>
                <select
                  value={horarioForm.servicio_id}
                  onChange={(e) => {
                    const servicio = servicios.find(
                      (item) => item.id === e.target.value
                    );

                    setHorarioForm({
                      ...horarioForm,
                      servicio_id: e.target.value,
                      capacidad:
                        servicio?.capacidad_default || horarioForm.capacidad,
                    });
                  }}
                  style={s.input}
                >
                  <option value="">Seleccionar</option>
                  {servicios
                    .filter((item) => item.activo)
                    .map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                      </option>
                    ))}
                </select>
              </Campo>

              <div style={s.formGrid}>
                {esSalonBelleza && !horarioEditandoId ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "grid",
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <span style={s.label}>Días de atención</span>

                    <div
                      style={{
                        display: "flex",
                        gap: 7,
                        flexWrap: "wrap",
                      }}
                    >
                      {[
                        {
                          label: "Lun a Vie",
                          dias: [1, 2, 3, 4, 5],
                        },
                        {
                          label: "Lun a Sáb",
                          dias: [1, 2, 3, 4, 5, 6],
                        },
                        {
                          label: "Lun a Dom",
                          dias: [1, 2, 3, 4, 5, 6, 0],
                        },
                      ].map((preset) => {
                        const activo =
                          preset.dias.length === diasHorarioSalon.length &&
                          preset.dias.every((dia) =>
                            diasHorarioSalon.includes(dia)
                          );

                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                              setDiasHorarioSalon(preset.dias)
                            }
                            style={{
                              minHeight: 35,
                              padding: "7px 11px",
                              borderRadius: 999,
                              border: activo
                                ? "1px solid #16834f"
                                : "1px solid #d7e1db",
                              background: activo
                                ? "#e9f7ef"
                                : "#fff",
                              color: activo
                                ? "#126c42"
                                : "#516059",
                              fontSize: 12,
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(7,minmax(44px,1fr))",
                        gap: 6,
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 0].map((dia) => {
                        const activo =
                          diasHorarioSalon.includes(dia);

                        return (
                          <button
                            key={dia}
                            type="button"
                            onClick={() =>
                              setDiasHorarioSalon((actual) =>
                                actual.includes(dia)
                                  ? actual.filter(
                                      (item) => item !== dia
                                    )
                                  : [...actual, dia]
                              )
                            }
                            style={{
                              minHeight: 40,
                              borderRadius: 9,
                              border: activo
                                ? "1px solid #16834f"
                                : "1px solid #d9e2dd",
                              background: activo
                                ? "#16834f"
                                : "#fff",
                              color: activo
                                ? "#fff"
                                : "#46534c",
                              fontSize: 11,
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            {nombreDia(dia).slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>

                    <span
                      style={{
                        color: "#7a877f",
                        fontSize: 11,
                        lineHeight: 1.4,
                      }}
                    >
                      Puedes elegir un rango rápido o activar y
                      desactivar días individualmente.
                    </span>
                  </div>
                ) : (
                  <Campo label="Día">
                    <select
                      value={horarioForm.dia_semana}
                      onChange={(e) =>
                        setHorarioForm({
                          ...horarioForm,
                          dia_semana: Number(e.target.value),
                        })
                      }
                      style={s.input}
                    >
                      {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
                        <option key={dia} value={dia}>
                          {nombreDia(dia)}
                        </option>
                      ))}
                    </select>
                  </Campo>
                )}

                <Campo label={esSalonBelleza ? "Profesional" : "Instructor"}>
                  <input
                    value={horarioForm.instructor}
                    onChange={(e) =>
                      setHorarioForm({
                        ...horarioForm,
                        instructor: e.target.value,
                      })
                    }
                    style={s.input}
                    placeholder={esSalonBelleza ? "Ana" : "Carlos"}
                  />
                </Campo>

                <Campo label="Hora inicio">
                  <SelectorHoraKonax
                    value={horarioForm.hora_inicio}
                    onApply={(hora) =>
                      setHorarioForm((actual) => ({
                        ...actual,
                        hora_inicio: hora,
                      }))
                    }
                  />
                </Campo>

                <Campo label="Hora fin">
                  <SelectorHoraKonax
                    value={horarioForm.hora_fin}
                    onApply={(hora) =>
                      setHorarioForm((actual) => ({
                        ...actual,
                        hora_fin: hora,
                      }))
                    }
                  />
                </Campo>

                <Campo
                  label={
                    esSalonBelleza
                      ? "Disponibilidad por horario"
                      : "Cupos"
                  }
                >
                  <input
                    type="number"
                    min="1"
                    value={horarioForm.capacidad}
                    onChange={(e) =>
                      setHorarioForm({
                        ...horarioForm,
                        capacidad: e.target.value,
                      })
                    }
                    style={s.input}
                  />
                </Campo>

                <Campo label="Disponible desde">
                  <input
                    type="date"
                    value={horarioForm.fecha_desde}
                    onChange={(e) =>
                      setHorarioForm({
                        ...horarioForm,
                        fecha_desde: e.target.value,
                      })
                    }
                    style={s.input}
                  />
                </Campo>
              </div>

              <div style={s.formActions}>
                {horarioEditandoId && (
                  <button
                    type="button"
                    style={s.secondaryButton}
                    onClick={() => {
                      setHorarioEditandoId(null);
                      setHorarioForm(
                        esSalonBelleza
                          ? HORARIO_SALON_INICIAL
                          : HORARIO_INICIAL
                      );
                    }}
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="button"
                  style={s.primaryButton}
                  onClick={guardarHorario}
                  disabled={guardando}
                >
                  {horarioEditandoId ? "Guardar cambios" : "Crear horario"}
                </button>
              </div>
            </article>
          </section>

          <section style={s.twoColumns}>
            <article style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <span style={s.eyebrowSmall}>SERVICIOS</span>
                  <h2 style={s.panelTitle}>
                    {esSalonBelleza
                      ? "Servicios del salón"
                      : "Clases y servicios"}
                  </h2>
                </div>
                <span style={s.counter}>{servicios.length}</span>
              </div>

              <div style={s.stack}>
                {servicios.length === 0 ? (
                  <p style={s.muted}>Todavía no hay servicios.</p>
                ) : (
                  servicios.map((servicio) => (
                    <div key={servicio.id} style={s.listCard}>
                      <div>
                        <strong>{servicio.nombre}</strong>
                        <span style={s.slotDetail}>
                          {esSalonBelleza
                            ? servicio.tipo === "cita_individual"
                              ? "Servicio individual"
                              : "Servicio grupal"
                            : servicio.tipo === "cita_individual"
                            ? "Cita individual"
                            : "Clase grupal"}{" "}
                          · {servicio.duracion_minutos} min
                        </span>
                      </div>

                      <div style={s.inlineActions}>
                        <button
                          type="button"
                          style={s.smallButton}
                          onClick={() => editarServicio(servicio)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          style={
                            servicio.activo ? s.smallDanger : s.smallSuccess
                          }
                          onClick={() => alternarServicio(servicio)}
                        >
                          {servicio.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <span style={s.eyebrowSmall}>HORARIOS</span>
                  <h2 style={s.panelTitle}>Horarios configurados</h2>
                </div>
                <span style={s.counter}>
                  {esSalonBelleza
                    ? horariosSalonFecha.length
                    : horarios.length}
                </span>
              </div>

              <div style={s.stack}>
                {(esSalonBelleza
                  ? horariosSalonFecha
                  : horarios
                ).length === 0 ? (
                  <p style={s.muted}>
                    {esSalonBelleza
                      ? "No hay horarios configurados para el día seleccionado."
                      : "Todavía no hay horarios."}
                  </p>
                ) : (
                  (esSalonBelleza
                    ? horariosSalonFecha
                    : horarios
                  ).map((horario) => (
                    <div key={horario.id} style={s.listCard}>
                      <div>
                        <strong>{nombreServicio(horario.servicio_id)}</strong>
                        <span style={s.slotDetail}>
                          {nombreDia(horario.dia_semana)} ·{" "}
                          {formatoHora(horario.hora_inicio)} ·{" "}
                          {horario.capacidad}{" "}
                          {esSalonBelleza
                            ? "espacio(s) por horario"
                            : "cupos"}
                        </span>
                      </div>

                      <div style={s.inlineActions}>
                        <button
                          type="button"
                          style={s.smallButton}
                          onClick={() => editarHorario(horario)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          style={
                            horario.activo ? s.smallDanger : s.smallSuccess
                          }
                          onClick={() => alternarHorario(horario)}
                        >
                          {horario.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        </>
      )}

      <footer style={s.footer}>
        {esSalonBelleza ? "KONAX Salón · Agenda" : "KONAX Agenda"} · {VERSION} · Rol: {rol || "Usuario"}
      </footer>
    </main>
  );
}

function Tab({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...s.tab,
        ...(activo ? s.tabActive : {}),
      }}
    >
      {children}
    </button>
  );
}

function Campo({ label, children }) {
  return (
    <label style={s.field}>
      <span style={s.label}>{label}</span>
      {children}
    </label>
  );
}

function Dato({ nombre, valor }) {
  return (
    <div style={s.dataRow}>
      <span style={s.muted}>{nombre}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function Empty({ titulo, texto }) {
  return (
    <div style={s.empty}>
      <strong>{titulo}</strong>
      <span style={s.muted}>{texto}</span>
    </div>
  );
}

function SelectorHoraKonax({
  value = "09:00",
  onApply,
}) {
  function descomponerHora(valor) {
    const [hh = "09", mm = "00"] = String(
      valor || "09:00"
    ).split(":");

    const hora24 = Number(hh);
    const periodo = hora24 >= 12 ? "PM" : "AM";
    const hora12 = hora24 % 12 || 12;

    return {
      hora: String(hora12).padStart(2, "0"),
      minuto: String(mm || "00").padStart(2, "0"),
      periodo,
    };
  }

  const inicial = descomponerHora(value);

  const [hora, setHora] = useState(inicial.hora);
  const [minuto, setMinuto] = useState(inicial.minuto);
  const [periodo, setPeriodo] = useState(inicial.periodo);
  const [aplicado, setAplicado] = useState(value);

  useEffect(() => {
    const siguiente = descomponerHora(value);
    setHora(siguiente.hora);
    setMinuto(siguiente.minuto);
    setPeriodo(siguiente.periodo);
    setAplicado(value);
  }, [value]);

  function aplicarHora() {
    let hora24 = Number(hora);

    if (periodo === "AM") {
      if (hora24 === 12) hora24 = 0;
    } else if (hora24 !== 12) {
      hora24 += 12;
    }

    const nuevaHora =
      `${String(hora24).padStart(2, "0")}:${String(
        minuto
      ).padStart(2, "0")}`;

    setAplicado(nuevaHora);

    if (typeof onApply === "function") {
      onApply(nuevaHora);
    }
  }

  const minutos = [
    "00",
    "05",
    "10",
    "15",
    "20",
    "25",
    "30",
    "35",
    "40",
    "45",
    "50",
    "55",
  ];

  return (
    <div style={s.timePicker}>
      <div style={s.timePickerControls} className="agenda-time-picker-mobile">
        <select
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          style={s.timeSelect}
          aria-label="Hora"
        >
          {Array.from({ length: 12 }, (_, index) => {
            const valor = String(index + 1).padStart(2, "0");

            return (
              <option key={valor} value={valor}>
                {valor}
              </option>
            );
          })}
        </select>

        <span style={s.timeColon}>:</span>

        <select
          value={minuto}
          onChange={(e) => setMinuto(e.target.value)}
          style={s.timeSelect}
          aria-label="Minutos"
        >
          {minutos.map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </select>

        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          style={s.timePeriodSelect}
          aria-label="Período"
        >
          <option value="AM">a. m.</option>
          <option value="PM">p. m.</option>
        </select>
      </div>

      <div style={s.timePickerFooter}>
        <span style={s.timeApplied}>
          Seleccionada: {formatoHora(aplicado)}
        </span>

        <button
          type="button"
          style={s.timeApplyButton}
          onClick={aplicarHora}
        >
          Aplicar hora
        </button>
      </div>
    </div>
  );
}

function ReservaLista({
  reservas,
  nombreReserva,
  nombreServicio,
  onCancelar,
  onAsistencia,
  onCobrar,
  mostrarFecha = false,
}) {
  if (!reservas.length) {
    return (
      <Empty
        titulo="Sin reservas"
        texto="Todavía no hay reservas para mostrar."
      />
    );
  }

  return (
    <div style={s.stack}>
      {reservas.map((reserva) => {
        const estado = normalizar(reserva.estado);
        const puedeGestionar =
          !["cancelada", "asistio"].includes(estado);

        const nombre = nombreReserva(reserva);
        const badgeEstado =
          estado === "asistio"
            ? s.badgeSuccess
            : estado === "no_asistio"
            ? s.badgeNeutral
            : estado === "cancelada"
            ? s.badgeDanger
            : estado === "pendiente_pago"
            ? s.badgeWarning
            : s.badge;

        return (
          <article key={reserva.id} style={s.reservationCard}>
            <div style={s.reservationIdentity}>
              <div style={s.avatar}>
                {String(nombre || "A").charAt(0).toUpperCase()}
              </div>

              <div style={s.reservationMain}>
                <div style={s.reservationTopLine}>
                  <strong style={s.reservationName}>{nombre}</strong>
                  <span style={badgeEstado}>
                    {String(reserva.estado || "confirmada").replace(/_/g, " ")}
                  </span>
                </div>

                <span style={s.slotDetail}>
                  {nombreServicio(reserva.servicio_id)}
                  {mostrarFecha ? ` · ${formatoFecha(reserva.fecha_reserva)}` : ""}
                  {" · "}
                  {formatoHora(reserva.hora_inicio)}
                  {reserva.requiere_pago
                    ? ` · $${Number(reserva.monto || 0).toFixed(2)}`
                    : ""}
                </span>
              </div>
            </div>

            <div style={s.inlineActions}>
              {puedeGestionar && estado === "pendiente_pago" && (
                <button
                  type="button"
                  style={s.smallPay}
                  onClick={() => onCobrar(reserva)}
                >
                  Cobrar ${Number(reserva.monto || 0).toFixed(2)}
                </button>
              )}

              {puedeGestionar && estado !== "pendiente_pago" && (
                <>
                  <button
                    type="button"
                    style={s.smallSuccess}
                    onClick={() => onAsistencia(reserva, true)}
                  >
                    Asistió
                  </button>

                  <button
                    type="button"
                    style={s.smallButton}
                    onClick={() => onAsistencia(reserva, false)}
                  >
                    No asistió
                  </button>
                </>
              )}

              {!["cancelada", "asistio"].includes(estado) && (
                <button
                  type="button"
                  style={s.smallDanger}
                  onClick={() => onCancelar(reserva)}
                >
                  Cancelar
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}


const sPro = {
  page: {
    minHeight: "100vh",
    padding: "clamp(12px, 2vw, 28px)",
    background:
      "radial-gradient(circle at top right, rgba(22,131,79,.08), transparent 28%), #f4f7f5",
    color: "#14231b",
    fontFamily: "Inter, Arial, system-ui, sans-serif",
  },

  header: {
    maxWidth: 1450,
    margin: "0 auto 14px",
    minHeight: 118,
    padding: "18px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    borderRadius: 22,
    background:
      "linear-gradient(120deg,#061f16 0%,#0b4b2e 58%,#11864d 100%)",
    color: "#fff",
    boxShadow: "0 18px 45px rgba(6,58,34,.18)",
    border: "1px solid rgba(255,255,255,.08)",
  },

  heroBrand: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    minWidth: 0,
    flex: "1 1 560px",
  },

  logoCard: {
    width: 118,
    height: 78,
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background: "#fff",
    boxShadow: "0 10px 26px rgba(0,0,0,.16)",
  },

  logo: {
    width: 100,
    height: 54,
    objectFit: "contain",
    display: "block",
  },

  heroText: {
    minWidth: 0,
  },

  eyebrow: {
    display: "block",
    marginBottom: 5,
    color: "#86efac",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.6,
  },

  title: {
    margin: "0 0 6px",
    color: "#fff",
    fontSize: "clamp(27px, 3vw, 39px)",
    lineHeight: 1.02,
    letterSpacing: "-.8px",
  },

  subtitle: {
    margin: 0,
    color: "#d9eee2",
    fontSize: 13,
    lineHeight: 1.45,
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },

  roleBadge: {
    minHeight: 36,
    padding: "0 12px",
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    background: "rgba(255,255,255,.10)",
    border: "1px solid rgba(255,255,255,.16)",
    color: "#eaf8ef",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: ".7px",
  },

  secondaryButton: {
    minHeight: 40,
    padding: "9px 13px",
    border: "1px solid #d6e1da",
    borderRadius: 11,
    background: "#fff",
    color: "#20332a",
    fontWeight: 850,
    cursor: "pointer",
  },

  heroButton: {
    minHeight: 40,
    padding: "9px 14px",
    border: "1px solid rgba(255,255,255,.24)",
    borderRadius: 11,
    background: "rgba(255,255,255,.10)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  tabs: {
    maxWidth: 1450,
    margin: "0 auto 14px",
    padding: 6,
    display: "flex",
    gap: 6,
    overflowX: "auto",
    border: "1px solid #dce7e0",
    borderRadius: 15,
    background: "#fff",
    boxShadow: "0 7px 20px rgba(15,23,42,.04)",
  },

  tab: {
    flex: "0 0 auto",
    minHeight: 40,
    padding: "8px 14px",
    border: "1px solid transparent",
    borderRadius: 10,
    background: "transparent",
    color: "#526158",
    fontSize: 12,
    fontWeight: 850,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  tabActive: {
    borderColor: "#0d7d47",
    background: "linear-gradient(135deg,#139253,#08713b)",
    color: "#fff",
    boxShadow: "0 6px 14px rgba(8,113,59,.18)",
  },

  toolbar: {
    maxWidth: 1450,
    margin: "0 auto 14px",
    padding: 12,
    display: "grid",
    gridTemplateColumns: "minmax(210px,1.45fr) repeat(4,minmax(135px,.65fr))",
    gap: 9,
    border: "1px solid #dce5df",
    borderRadius: 17,
    background: "#fff",
    boxShadow: "0 8px 24px rgba(15,23,42,.045)",
  },

  dateCard: {
    minWidth: 0,
    padding: "10px 12px 5px",
    borderRadius: 13,
    background: "linear-gradient(180deg,#f8fbf9,#f2f7f4)",
    border: "1px solid #e1e9e4",
  },

  dateHuman: {
    display: "block",
    marginTop: -5,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 850,
  },

  quickInfo: {
    minHeight: 73,
    padding: 11,
    display: "grid",
    gridTemplateColumns: "38px 1fr",
    gap: 9,
    alignItems: "center",
    borderRadius: 13,
    background: "#fbfdfc",
    border: "1px solid #e2eae5",
  },

  statIcon: {
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#eaf7ef",
    color: "#16834f",
    fontSize: 16,
    fontWeight: 900,
  },

  bigNumber: {
    display: "block",
    marginTop: 2,
    fontSize: 22,
    lineHeight: 1,
    color: "#16251d",
  },

  gridCards: {
    maxWidth: 1450,
    margin: "0 auto 14px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
    gap: 12,
  },

  classCard: {
    position: "relative",
    overflow: "hidden",
    padding: 17,
    border: "1px solid #dbe6df",
    borderRadius: 18,
    background:
      "linear-gradient(180deg,rgba(255,255,255,1),rgba(248,252,249,1))",
    boxShadow: "0 10px 28px rgba(18,66,42,.07)",
  },

  classTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottom: "1px solid #edf1ee",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: 999,
    background: "#e8f7ed",
    color: "#117a43",
    fontSize: 9,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: ".5px",
  },

  badgeSuccess: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: 999,
    background: "#e8f7ed",
    color: "#08743c",
    fontSize: 9,
    fontWeight: 900,
    textTransform: "uppercase",
  },

  badgeNeutral: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: 999,
    background: "#eef2f0",
    color: "#526158",
    fontSize: 9,
    fontWeight: 900,
    textTransform: "uppercase",
  },

  badgeDanger: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: 999,
    background: "#fff0f0",
    color: "#b42318",
    fontSize: 9,
    fontWeight: 900,
    textTransform: "uppercase",
  },

  badgeWarning: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: 999,
    background: "#fff7dd",
    color: "#956400",
    fontSize: 9,
    fontWeight: 900,
    textTransform: "uppercase",
  },

  cardTitle: {
    margin: "8px 0 0",
    fontSize: 21,
    letterSpacing: "-.3px",
  },

  availabilityGood: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
  },

  availabilityFull: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "#fff0f0",
    color: "#be123c",
    fontSize: 10,
    fontWeight: 900,
  },

  classData: {
    marginTop: 12,
    display: "grid",
    gap: 7,
  },

  dataRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 7,
    borderBottom: "1px solid #edf1ee",
    fontSize: 12,
  },

  capacityBlock: {
    marginTop: 11,
  },

  capacityMeta: {
    marginBottom: 6,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    color: "#6d7b73",
    fontSize: 10,
    fontWeight: 750,
  },

  progressTrack: {
    width: "100%",
    height: 7,
    overflow: "hidden",
    borderRadius: 999,
    background: "#e9efeb",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg,#18a45b,#08733c)",
  },

  cardButton: {
    width: "100%",
    minHeight: 40,
    marginTop: 13,
    border: "none",
    borderRadius: 10,
    background: "linear-gradient(135deg,#159552,#08743c)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 7px 16px rgba(8,116,60,.16)",
  },

  panel: {
    maxWidth: 1450,
    margin: "0 auto 14px",
    padding: "17px",
    border: "1px solid #dce5df",
    borderRadius: 18,
    background: "#fff",
    boxShadow: "0 9px 26px rgba(15,23,42,.05)",
  },

  panelHeader: {
    marginBottom: 13,
    paddingBottom: 11,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    borderBottom: "1px solid #edf1ee",
  },

  panelTitle: {
    margin: 0,
    fontSize: 20,
    letterSpacing: "-.3px",
  },

  counter: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
  },

  twoColumns: {
    maxWidth: 1450,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,390px),1fr))",
    gap: 14,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    marginBottom: 10,
  },

  label: {
    color: "#526158",
    fontSize: 11,
    fontWeight: 850,
  },

  input: {
    width: "100%",
    minHeight: 41,
    padding: "9px 11px",
    boxSizing: "border-box",
    border: "1px solid #ccd8d1",
    borderRadius: 10,
    background: "#fff",
    color: "#17211c",
    outline: "none",
    fontSize: 13,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
    gap: 9,
  },

  checkGrid: {
    display: "grid",
    gap: 8,
    margin: "5px 0 12px",
  },

  checkLabel: {
    minHeight: 39,
    padding: "0 11px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    background: "#f7faf8",
    border: "1px solid #e3eae6",
    fontSize: 12,
    fontWeight: 750,
    color: "#526158",
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },

  primaryButton: {
    minHeight: 40,
    padding: "9px 14px",
    border: "none",
    borderRadius: 10,
    background: "linear-gradient(135deg,#159552,#08743c)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  primaryWide: {
    width: "100%",
    minHeight: 44,
    marginTop: 3,
    border: "none",
    borderRadius: 10,
    background: "linear-gradient(135deg,#159552,#08743c)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(8,116,60,.16)",
  },

  searchResults: {
    marginTop: -4,
    marginBottom: 10,
    display: "grid",
    gap: 5,
    padding: 7,
    border: "1px solid #dce5df",
    borderRadius: 11,
    background: "#fff",
    boxShadow: "0 9px 22px rgba(15,23,42,.06)",
  },

  searchItem: {
    width: "100%",
    padding: 10,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    border: "1px solid transparent",
    borderRadius: 9,
    background: "#f7faf8",
    color: "#17211c",
    textAlign: "left",
    cursor: "pointer",
  },

  selectedClient: {
    marginBottom: 12,
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: "1px solid #bfe0cb",
    borderRadius: 12,
    background: "linear-gradient(180deg,#f2fbf5,#eaf7ef)",
  },

  slotList: {
    marginTop: 12,
    display: "grid",
    gap: 7,
  },

  slot: {
    width: "100%",
    padding: 11,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    border: "1px solid #dce5df",
    borderRadius: 11,
    background: "#fbfcfb",
    color: "#17211c",
    textAlign: "left",
    cursor: "pointer",
  },

  slotSelected: {
    borderColor: "#16834f",
    background: "#edf9f1",
    boxShadow: "0 5px 13px rgba(22,131,79,.10)",
  },

  listCard: {
    padding: 11,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    border: "1px solid #e3e9e5",
    borderRadius: 11,
    background: "#fbfcfb",
  },

  reservationCard: {
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: "1px solid #e1e8e3",
    borderRadius: 12,
    background: "#fbfdfc",
  },

  reservationIdentity: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: "1 1 360px",
  },

  avatar: {
    width: 40,
    height: 40,
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "linear-gradient(135deg,#123c29,#16834f)",
    color: "#fff",
    fontWeight: 900,
  },

  reservationMain: {
    minWidth: 0,
    flex: 1,
  },

  reservationTopLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  reservationName: {
    display: "block",
    fontSize: 14,
    overflowWrap: "anywhere",
  },

  inlineActions: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  smallButton: {
    minHeight: 32,
    padding: "6px 9px",
    border: "1px solid #d4ddd7",
    borderRadius: 8,
    background: "#fff",
    color: "#435047",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  smallSuccess: {
    minHeight: 32,
    padding: "6px 9px",
    border: "1px solid #bfe0cb",
    borderRadius: 8,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  smallDanger: {
    minHeight: 32,
    padding: "6px 9px",
    border: "1px solid #fecaca",
    borderRadius: 8,
    background: "#fff5f5",
    color: "#be123c",
    fontSize: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  empty: {
    gridColumn: "1 / -1",
    minHeight: 130,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 7,
    padding: 20,
    border: "1px dashed #cbd9d0",
    borderRadius: 15,
    background:
      "linear-gradient(180deg,rgba(250,252,251,1),rgba(246,250,247,1))",
    textAlign: "center",
  },

  muted: {
    color: "#748078",
    fontSize: 11,
  },

  footer: {
    maxWidth: 1450,
    margin: "0 auto",
    padding: "6px 2px 18px",
    color: "#8b958f",
    fontSize: 9,
    textAlign: "right",
  },
};


const AGENDA_CSS = `
  .agenda-page * {
    box-sizing: border-box;
  }

  .agenda-tabs::-webkit-scrollbar {
    height: 5px;
  }

  .agenda-tabs::-webkit-scrollbar-thumb {
    background: #c9d8cf;
    border-radius: 999px;
  }

  .agenda-kpis {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .agenda-workspace {
    display: grid;
    grid-template-columns: minmax(0, 1.75fr) minmax(285px, .65fr);
    gap: 16px;
    align-items: start;
  }

  .agenda-schedule-row {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr) 160px 150px;
    gap: 16px;
    align-items: center;
  }

  .agenda-reserva-filtros {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) minmax(180px, 240px);
    gap: 10px;
  }

  .agenda-stepper {
    display: grid;
    grid-template-columns: repeat(3, minmax(0,1fr));
    gap: 8px;
  }

  .agenda-status-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (max-width: 1180px) {
    .agenda-kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .agenda-schedule-row {
      grid-template-columns: 92px minmax(0, 1fr) 130px;
    }

    .agenda-schedule-action {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 980px) {
    .agenda-workspace {
      grid-template-columns: 1fr;
    }

    .agenda-executive-aside {
      position: static !important;
    }
  }

  @media (max-width: 720px) {
    .agenda-page {
      padding: 14px !important;
    }

    .agenda-header {
      padding: 18px !important;
      border-radius: 18px !important;
    }

    .agenda-kpis {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .agenda-datebar {
      align-items: stretch !important;
    }

    .agenda-date-controls {
      width: 100%;
      display: grid !important;
      grid-template-columns: auto minmax(0,1fr) auto;
    }

    .agenda-date-today {
      grid-column: 1 / -1;
      width: 100%;
    }

    .agenda-schedule-row {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .agenda-time-block {
      display: flex !important;
      align-items: center;
      justify-content: space-between;
    }

    .agenda-reserva-filtros {
      grid-template-columns: 1fr;
    }

    .agenda-stepper {
      grid-template-columns: 1fr;
    }

    .agenda-status-strip {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 480px) {
    .agenda-kpis {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 420px) {
    .agenda-time-picker-mobile {
      grid-template-columns: 1fr;
    }
  }


@media (max-width: 1180px) {
  .agenda-d-command-grid {
    grid-template-columns: 1fr 1fr !important;
  }

  .agenda-d-command-grid > aside {
    grid-column: 1 / -1;
  }
}

@media (max-width: 820px) {
  .agenda-d-hero {
    grid-template-columns: 1fr !important;
  }

  .agenda-d-nav {
    overflow-x: auto;
  }

  .agenda-d-week-strip {
    grid-template-columns: repeat(7, minmax(86px, 1fr)) !important;
    overflow-x: auto;
  }

  .agenda-d-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .agenda-d-command-grid {
    grid-template-columns: 1fr !important;
  }

  .agenda-d-timeline-row {
    grid-template-columns: 24px 82px minmax(0, 1fr) !important;
  }

  .agenda-d-timeline-row > div:last-child {
    grid-column: 2 / -1;
  }
}

@media (max-width: 560px) {
  .agenda-d-kpis {
    grid-template-columns: 1fr !important;
  }

  .agenda-d-timeline-row {
    grid-template-columns: 20px 1fr !important;
  }

  .agenda-d-timeline-row > div:nth-child(2) {
    grid-column: 2;
  }

  .agenda-d-timeline-row > div:nth-child(3) {
    grid-column: 2;
  }

  .agenda-d-timeline-row > div:last-child {
    grid-column: 2;
  }

  .agenda-d-reservation-row {
    grid-template-columns: 42px minmax(0,1fr) !important;
  }

  .agenda-d-reservation-row > span:last-child {
    grid-column: 2;
    justify-self: start;
  }
}


@media (max-width: 760px) {
  .agenda-portal-responsive {
    grid-template-columns: 1fr !important;
  }
}

  /* ============================
     SALÓN / MÓVIL
     No altera la lógica de gimnasio.
     ============================ */
  @media (max-width: 760px) {
    .agenda-d-hero {
      padding: 16px !important;
      gap: 12px !important;
      border-radius: 18px !important;
    }

    .agenda-d-brand-row {
      align-items: flex-start !important;
      gap: 12px !important;
    }

    .agenda-d-logo-card {
      width: 92px !important;
      min-height: 58px !important;
      padding: 6px 8px !important;
      border-radius: 14px !important;
    }

    .agenda-d-logo-card img {
      width: 78px !important;
      height: 38px !important;
    }

    .agenda-d-hero h1 {
      font-size: clamp(28px, 9vw, 38px) !important;
      line-height: 1.02 !important;
      overflow-wrap: anywhere;
    }

    .agenda-d-hero p {
      font-size: 11px !important;
      line-height: 1.45 !important;
    }

    .agenda-d-hero-actions {
      width: 100% !important;
    }

    .agenda-d-hero-actions button {
      width: 100% !important;
    }

    .agenda-d-hero-side {
      padding: 13px !important;
      border-radius: 14px !important;
    }

    .agenda-d-nav {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 7px !important;
      overflow: visible !important;
      padding: 7px !important;
    }

    .agenda-d-nav > button {
      width: 100% !important;
      justify-content: center !important;
      padding: 0 8px !important;
      margin-left: 0 !important;
      white-space: normal !important;
      text-align: center !important;
    }

    .agenda-d-week-shell {
      padding: 12px !important;
    }

    .agenda-d-week-controls {
      width: 100% !important;
      display: grid !important;
      grid-template-columns: 44px minmax(0, 1fr) 44px !important;
    }

    .agenda-d-week-controls button:nth-child(2) {
      width: 100% !important;
    }

    .agenda-d-week-strip {
      grid-template-columns: repeat(7, minmax(58px, 1fr)) !important;
      gap: 6px !important;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .agenda-d-week-strip > button {
      min-height: 72px !important;
      padding: 7px !important;
    }

    .agenda-d-kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    .agenda-d-command-grid {
      grid-template-columns: 1fr !important;
    }

    .agenda-d-timeline-row {
      min-height: auto !important;
      grid-template-columns: 18px minmax(0,1fr) !important;
      gap: 8px !important;
      padding: 12px 0 !important;
    }

    .agenda-d-timeline-row > div:nth-child(2),
    .agenda-d-timeline-row > div:nth-child(3),
    .agenda-d-timeline-row > div:last-child {
      grid-column: 2 !important;
    }

    .agenda-d-timeline-row > div:last-child button {
      width: 100% !important;
    }
  }

  @media (max-width: 480px) {
    .agenda-d-brand-row {
      display: grid !important;
      grid-template-columns: 1fr !important;
    }

    .agenda-d-logo-card {
      width: 86px !important;
    }

    .agenda-d-kpis {
      grid-template-columns: 1fr 1fr !important;
    }

    .agenda-d-nav {
      grid-template-columns: 1fr 1fr !important;
    }
  }


  @media (max-width: 760px) {
    .agenda-horario-panel {
      padding: 14px !important;
    }

    .agenda-horario-panel h2 {
      margin-bottom: 10px !important;
    }

    .agenda-horario-panel select,
    .agenda-horario-panel input {
      min-height: 40px !important;
    }

    .agenda-horario-panel button {
      max-width: 100%;
    }
  }

`;

const neo = {
  hero: {
    maxWidth: 1480,
    margin: "0 auto 16px",
    padding: 24,
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 320px",
    gap: 18,
    borderRadius: 24,
    background:
      "linear-gradient(135deg,#071b13 0%,#0b4a2b 58%,#0f7a42 100%)",
    color: "#fff",
    boxShadow: "0 18px 45px rgba(5,40,25,.18)",
    overflow: "hidden",
  },

  heroMain: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 22,
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 18,
  },

  logoCard: {
    width: 138,
    minHeight: 74,
    display: "grid",
    placeItems: "center",
    padding: "8px 12px",
    borderRadius: 18,
    background: "#fff",
    flex: "0 0 auto",
  },

  logo: {
    width: 118,
    height: 48,
    objectFit: "contain",
  },

  heroEyebrow: {
    display: "block",
    marginBottom: 6,
    color: "#6EE5A3",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.5,
  },

  heroTitle: {
    margin: 0,
    fontSize: "clamp(34px,5vw,58px)",
    lineHeight: .98,
    letterSpacing: -1.4,
  },

  heroSubtitle: {
    maxWidth: 760,
    margin: "10px 0 0",
    color: "#DDEDE4",
    fontSize: 13,
    lineHeight: 1.55,
  },

  heroActions: {
    display: "flex",
    gap: 9,
    flexWrap: "wrap",
  },

  heroGhost: {
    minHeight: 42,
    padding: "0 15px",
    border: "1px solid rgba(255,255,255,.28)",
    borderRadius: 11,
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  heroPrimary: {
    minHeight: 42,
    padding: "0 16px",
    border: 0,
    borderRadius: 11,
    background: "#fff",
    color: "#0B6036",
    fontWeight: 900,
    cursor: "pointer",
  },

  heroSide: {
    padding: 18,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    border: "1px solid rgba(255,255,255,.16)",
    borderRadius: 18,
    background: "rgba(255,255,255,.08)",
    backdropFilter: "blur(8px)",
  },

  heroSideLabel: {
    color: "#9EEABF",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  heroSideDate: {
    display: "block",
    marginTop: 6,
    fontSize: 22,
  },

  heroSideStats: {
    marginTop: 17,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  heroSideMini: {
    display: "block",
    color: "#CFE8D9",
    fontSize: 9,
  },

  heroSideValue: {
    display: "block",
    marginTop: 3,
    fontSize: 24,
  },

  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 16,
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,.12)",
    color: "#fff",
    fontSize: 9,
    fontWeight: 900,
  },

  nav: {
    maxWidth: 1480,
    margin: "0 auto 14px",
    padding: 7,
    display: "flex",
    gap: 6,
    alignItems: "center",
    border: "1px solid #DDE8E1",
    borderRadius: 15,
    background: "#fff",
    boxShadow: "0 6px 18px rgba(15,50,31,.04)",
  },

  navItem: {
    minHeight: 40,
    padding: "0 13px",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    border: 0,
    borderRadius: 10,
    background: "transparent",
    color: "#506057",
    fontSize: 11,
    fontWeight: 850,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },

  navItemActive: {
    background: "#0B7A43",
    color: "#fff",
    boxShadow: "0 7px 16px rgba(11,122,67,.18)",
  },

  navRefresh: {
    marginLeft: "auto",
    minHeight: 38,
    padding: "0 12px",
    border: "1px solid #D9E4DD",
    borderRadius: 9,
    background: "#F7FAF8",
    color: "#0B7A43",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  weekShell: {
    maxWidth: 1480,
    margin: "0 auto 14px",
    padding: 16,
    border: "1px solid #DCE6E0",
    borderRadius: 18,
    background: "#fff",
  },

  weekHeader: {
    marginBottom: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  sectionEyebrow: {
    display: "block",
    color: "#0B7A43",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  sectionTitle: {
    margin: "4px 0 0",
    fontSize: 18,
  },

  weekControls: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },

  roundButton: {
    width: 36,
    height: 36,
    border: "1px solid #D9E4DD",
    borderRadius: 10,
    background: "#fff",
    color: "#1B3225",
    fontSize: 16,
    cursor: "pointer",
  },

  todayPill: {
    minHeight: 36,
    padding: "0 12px",
    border: 0,
    borderRadius: 10,
    background: "#E9F7EF",
    color: "#0B7A43",
    fontSize: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  weekStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(7,minmax(0,1fr))",
    gap: 8,
  },

  dayCard: {
    minHeight: 88,
    padding: 10,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 1,
    border: "1px solid #E0E8E3",
    borderRadius: 13,
    background: "#FAFCFB",
    color: "#2D3C34",
    cursor: "pointer",
  },

  dayCardActive: {
    borderColor: "#0B7A43",
    background:
      "linear-gradient(145deg,#0B6A3B,#0E8A4C)",
    boxShadow: "0 10px 20px rgba(11,122,67,.18)",
  },

  dayName: {
    fontSize: 9,
    fontWeight: 900,
    color: "#78867E",
  },

  dayNumber: {
    fontSize: 24,
    lineHeight: 1,
  },

  dayMonth: {
    fontSize: 8,
    color: "#89958E",
    fontWeight: 800,
  },

  dayTextActive: {
    color: "#fff",
  },

  todayDot: {
    marginTop: 4,
    padding: "3px 5px",
    borderRadius: 999,
    background: "#E7F5ED",
    color: "#0B7A43",
    fontSize: 6,
    fontWeight: 900,
  },

  todayDotActive: {
    background: "rgba(255,255,255,.16)",
    color: "#fff",
  },

  kpiGrid: {
    maxWidth: 1480,
    margin: "0 auto 14px",
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
  },

  kpiCard: {
    padding: 14,
    border: "1px solid #DDE6E0",
    borderRadius: 15,
    background: "#fff",
    boxShadow: "0 6px 18px rgba(14,52,32,.04)",
  },

  kpiCardAccent: {
    padding: 14,
    border: "1px solid #0B7A43",
    borderRadius: 15,
    background:
      "linear-gradient(145deg,#0B6B3C,#0E8A4C)",
    color: "#fff",
    boxShadow: "0 10px 22px rgba(11,122,67,.17)",
  },

  kpiCaption: {
    color: "#78867E",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1,
  },

  kpiCaptionAccent: {
    color: "#BAF0CF",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1,
  },

  kpiBody: {
    marginTop: 8,
    display: "flex",
    alignItems: "baseline",
    gap: 7,
  },

  kpiNumber: {
    fontSize: 27,
    lineHeight: 1,
  },

  kpiNumberAccent: {
    fontSize: 27,
    lineHeight: 1,
  },

  kpiHint: {
    color: "#7A867F",
    fontSize: 9,
  },

  kpiHintAccent: {
    color: "#DDF3E6",
    fontSize: 9,
  },

  commandGrid: {
    maxWidth: 1480,
    margin: "0 auto 20px",
    display: "grid",
    gridTemplateColumns: "minmax(0,1.35fr) minmax(330px,.82fr) 300px",
    gap: 12,
    alignItems: "start",
  },

  schedulePanel: {
    padding: 16,
    border: "1px solid #DCE6E0",
    borderRadius: 18,
    background: "#fff",
    boxShadow: "0 8px 22px rgba(14,52,32,.045)",
  },

  reservationsPanel: {
    padding: 16,
    border: "1px solid #DCE6E0",
    borderRadius: 18,
    background: "#fff",
    boxShadow: "0 8px 22px rgba(14,52,32,.045)",
  },

  panelTop: {
    marginBottom: 13,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  panelHeading: {
    margin: "4px 0 0",
    fontSize: 19,
  },

  dateInline: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },

  dateArrow: {
    width: 32,
    height: 34,
    border: "1px solid #D9E4DD",
    borderRadius: 8,
    background: "#F9FBFA",
    color: "#244034",
    fontSize: 17,
    cursor: "pointer",
  },

  dateInput: {
    minHeight: 34,
    padding: "6px 8px",
    border: "1px solid #D9E4DD",
    borderRadius: 8,
    background: "#fff",
    color: "#1F3027",
    fontSize: 10,
  },

  timeline: {
    display: "grid",
  },

  timelineRow: {
    minHeight: 126,
    display: "grid",
    gridTemplateColumns:
      "26px 100px minmax(0,1fr) 110px",
    gap: 12,
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #EDF2EF",
  },

  timelineRail: {
    position: "relative",
    alignSelf: "stretch",
    display: "flex",
    justifyContent: "center",
  },

  timelineDot: {
    position: "absolute",
    top: 28,
    width: 12,
    height: 12,
    border: "3px solid #BEE7CF",
    borderRadius: "50%",
    background: "#0B7A43",
    zIndex: 2,
  },

  timelineLine: {
    position: "absolute",
    top: 40,
    bottom: -22,
    width: 2,
    background: "#DCEBE3",
  },

  timelineTime: {
    display: "grid",
    gap: 3,
  },

  timelineClass: {
    minWidth: 0,
  },

  classTopLine: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },

  classBadge: {
    padding: "4px 7px",
    borderRadius: 999,
    background: "#EAF7F0",
    color: "#0B7A43",
    fontSize: 7,
    fontWeight: 900,
  },

  capacityStatus: {
    padding: "4px 7px",
    borderRadius: 999,
    background: "#EEF7F2",
    color: "#0B7A43",
    fontSize: 7,
    fontWeight: 900,
  },

  capacityStatusFull: {
    background: "#FFF0EE",
    color: "#B42318",
  },

  classTitle: {
    display: "block",
    marginTop: 7,
    fontSize: 17,
  },

  classMeta: {
    display: "block",
    marginTop: 3,
    color: "#6F7D75",
    fontSize: 9,
    lineHeight: 1.35,
  },

  capacityBar: {
    height: 7,
    marginTop: 10,
    overflow: "hidden",
    borderRadius: 999,
    background: "#E8EFEA",
  },

  capacityFill: {
    height: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg,#0B7A43,#61D494)",
  },

  capacityFooter: {
    marginTop: 5,
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#849088",
    fontSize: 8,
  },

  timelineAction: {
    display: "flex",
    justifyContent: "flex-end",
  },

  reserveButton: {
    minHeight: 38,
    padding: "0 13px",
    border: 0,
    borderRadius: 10,
    background: "#0B7A43",
    color: "#fff",
    fontSize: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  reserveDisabled: {
    minHeight: 38,
    padding: "0 13px",
    border: "1px solid #E0E5E2",
    borderRadius: 10,
    background: "#F2F4F3",
    color: "#9AA39E",
    fontSize: 10,
    fontWeight: 850,
    cursor: "not-allowed",
  },

  emptyLarge: {
    minHeight: 360,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 8,
    border: "1px dashed #D3DED7",
    borderRadius: 15,
    background: "#FAFCFB",
    textAlign: "center",
  },

  emptyIcon: {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#EAF7F0",
    color: "#0B7A43",
    fontSize: 24,
  },

  emptyTitle: {
    fontSize: 16,
  },

  emptyText: {
    maxWidth: 360,
    color: "#7A867F",
    fontSize: 10,
    lineHeight: 1.5,
  },

  emptyButton: {
    minHeight: 36,
    marginTop: 5,
    padding: "0 12px",
    border: 0,
    borderRadius: 9,
    background: "#0B7A43",
    color: "#fff",
    fontSize: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  counterPill: {
    minWidth: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    background: "#EAF7F0",
    color: "#0B7A43",
    fontSize: 11,
    fontWeight: 900,
  },

  reservationList: {
    display: "grid",
    gap: 7,
  },

  reservationRow: {
    minHeight: 62,
    padding: 9,
    display: "grid",
    gridTemplateColumns: "40px minmax(0,1fr) auto",
    gap: 9,
    alignItems: "center",
    border: "1px solid #E5ECE8",
    borderRadius: 12,
    background: "#FBFCFB",
  },

  avatar: {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#0D3B28",
    color: "#fff",
    fontSize: 14,
    fontWeight: 900,
  },

  reservationInfo: {
    minWidth: 0,
  },

  reservationName: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 11,
  },

  reservationMeta: {
    display: "block",
    marginTop: 3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#7A867F",
    fontSize: 8,
  },

  statusTag: {
    padding: "5px 7px",
    borderRadius: 999,
    fontSize: 6.5,
    fontWeight: 900,
  },

  statusConfirmed: {
    background: "#EAF7F0",
    color: "#0B7A43",
  },

  statusSuccess: {
    background: "#E8F7ED",
    color: "#08743C",
  },

  statusNeutral: {
    background: "#F1F3F2",
    color: "#59655E",
  },

  statusPending: {
    background: "#FFF7DD",
    color: "#8A6400",
  },

  emptySmall: {
    minHeight: 260,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 7,
    color: "#7B8780",
    textAlign: "center",
    fontSize: 10,
  },

  emptySmallIcon: {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#EDF6F1",
    color: "#0B7A43",
    fontSize: 20,
  },

  viewAllButton: {
    width: "100%",
    minHeight: 38,
    marginTop: 10,
    border: "1px solid #D9E4DD",
    borderRadius: 10,
    background: "#fff",
    color: "#0B7A43",
    fontSize: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  controlPanel: {
    padding: 18,
    borderRadius: 18,
    background:
      "linear-gradient(160deg,#071C14,#0B4A2B)",
    color: "#fff",
    boxShadow: "0 16px 34px rgba(6,40,25,.18)",
  },

  controlEyebrow: {
    color: "#67D899",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  controlTitle: {
    margin: "5px 0 0",
    fontSize: 20,
  },

  occupancyCircle: {
    margin: "20px 0",
    display: "grid",
    placeItems: "center",
  },

  occupancyRing: {
    width: 140,
    height: 140,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
  },

  occupancyInner: {
    width: 104,
    height: 104,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    borderRadius: "50%",
    background: "#0A2A1D",
  },

  controlStats: {
    display: "grid",
    gap: 9,
  },

  controlRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    color: "#CFE7D9",
    fontSize: 10,
  },

  controlDivider: {
    height: 1,
    margin: "16px 0",
    background: "rgba(255,255,255,.12)",
  },

  controlLabel: {
    display: "block",
    marginBottom: 8,
    color: "#9BDDB8",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1,
  },

  stateGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 7,
  },

  stateBox: {
    padding: 9,
    display: "grid",
    gap: 4,
    borderRadius: 10,
    background: "rgba(255,255,255,.08)",
    color: "#DDEFE5",
    fontSize: 8,
  },

  controlPrimary: {
    width: "100%",
    minHeight: 40,
    marginTop: 16,
    border: 0,
    borderRadius: 10,
    background: "#5CE19B",
    color: "#06301E",
    fontSize: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  controlSecondary: {
    width: "100%",
    minHeight: 38,
    marginTop: 7,
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 10,
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
  },
};

const pro = {
  header:{
    maxWidth:1450,
    margin:"0 auto 14px",
    padding:"24px 26px",
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    gap:18,
    flexWrap:"wrap",
    borderRadius:24,
    background:
      "radial-gradient(circle at 78% 18%, rgba(61,199,120,.20), transparent 32%), linear-gradient(120deg,#071d14 0%,#0b3524 54%,#0a6a3b 100%)",
    color:"#fff",
    boxShadow:"0 18px 45px rgba(8,53,34,.20)",
    border:"1px solid rgba(255,255,255,.08)",
  },
  headerBrand:{
    minWidth:0,
    display:"flex",
    alignItems:"center",
    gap:16,
  },
  logoBox:{
    width:126,
    height:70,
    padding:"8px 12px",
    display:"grid",
    placeItems:"center",
    borderRadius:17,
    background:"#fff",
    boxShadow:"0 10px 24px rgba(0,0,0,.18)",
    flex:"0 0 auto",
  },
  logo:{
    width:"100%",
    height:"100%",
    objectFit:"contain",
  },
  headerEyebrow:{
    display:"block",
    marginBottom:5,
    color:"#7de0a7",
    fontSize:10,
    fontWeight:900,
    letterSpacing:1.3,
  },
  headerTitle:{
    margin:0,
    fontSize:"clamp(28px,3vw,40px)",
    lineHeight:1,
    letterSpacing:"-.8px",
  },
  headerSubtitle:{
    margin:"7px 0 0",
    maxWidth:620,
    color:"#d9ece2",
    fontSize:13,
    lineHeight:1.5,
  },
  headerRight:{
    display:"flex",
    alignItems:"center",
    gap:8,
    flexWrap:"wrap",
    justifyContent:"flex-end",
  },
  role:{
    minHeight:38,
    padding:"0 12px",
    display:"inline-flex",
    alignItems:"center",
    gap:7,
    border:"1px solid rgba(255,255,255,.18)",
    borderRadius:999,
    background:"rgba(255,255,255,.09)",
    color:"#e9fff2",
    fontSize:11,
    fontWeight:850,
  },
  headerSecondary:{
    minHeight:40,
    padding:"0 14px",
    border:"1px solid rgba(255,255,255,.24)",
    borderRadius:11,
    background:"rgba(0,0,0,.14)",
    color:"#fff",
    fontWeight:800,
    cursor:"pointer",
  },
  headerPrimary:{
    minHeight:40,
    padding:"0 15px",
    border:"none",
    borderRadius:11,
    background:"#fff",
    color:"#0b5a35",
    fontWeight:900,
    cursor:"pointer",
    boxShadow:"0 8px 18px rgba(0,0,0,.13)",
  },
  navShell:{
    maxWidth:1450,
    margin:"0 auto 14px",
    padding:7,
    display:"flex",
    gap:6,
    overflowX:"auto",
    border:"1px solid #dbe6df",
    borderRadius:14,
    background:"#fff",
    boxShadow:"0 8px 20px rgba(15,23,42,.035)",
  },
  datebar:{
    maxWidth:1450,
    margin:"0 auto 12px",
    padding:"13px 15px",
    display:"flex",
    alignItems:"center",
    justifyContent:"space-between",
    gap:12,
    flexWrap:"wrap",
    border:"1px solid #dce6df",
    borderRadius:16,
    background:"#fff",
    boxShadow:"0 7px 18px rgba(15,23,42,.035)",
  },
  dateLead:{
    display:"grid",
    gap:2,
  },
  dateEyebrow:{
    color:"#15804d",
    fontSize:9,
    fontWeight:900,
    letterSpacing:1.1,
  },
  dateTitle:{
    fontSize:19,
    fontWeight:900,
    color:"#17251e",
  },
  dateControls:{
    display:"flex",
    alignItems:"center",
    gap:7,
  },
  iconButton:{
    width:38,
    height:38,
    display:"grid",
    placeItems:"center",
    border:"1px solid #d7e1db",
    borderRadius:10,
    background:"#fff",
    color:"#244236",
    fontSize:18,
    fontWeight:900,
    cursor:"pointer",
  },
  dateInput:{
    minHeight:38,
    padding:"7px 10px",
    border:"1px solid #d7e1db",
    borderRadius:10,
    background:"#fff",
    color:"#17251e",
    fontWeight:800,
  },
  todayButton:{
    minHeight:38,
    padding:"0 13px",
    border:"1px solid #16834f",
    borderRadius:10,
    background:"#eef9f2",
    color:"#16834f",
    fontWeight:900,
    cursor:"pointer",
  },
  kpi:{
    minHeight:98,
    padding:14,
    display:"flex",
    alignItems:"center",
    gap:12,
    border:"1px solid #dce6df",
    borderRadius:16,
    background:"#fff",
    boxShadow:"0 8px 20px rgba(15,23,42,.04)",
  },
  kpiIcon:{
    width:44,
    height:44,
    flex:"0 0 auto",
    display:"grid",
    placeItems:"center",
    borderRadius:13,
    background:"#edf8f1",
    color:"#16834f",
    fontSize:14,
    fontWeight:950,
  },
  kpiLabel:{
    display:"block",
    color:"#708078",
    fontSize:10,
    fontWeight:800,
  },
  kpiValue:{
    display:"block",
    marginTop:3,
    color:"#17251e",
    fontSize:24,
    lineHeight:1,
  },
  workspace:{
    maxWidth:1450,
    margin:"12px auto 16px",
  },
  panel:{
    padding:18,
    border:"1px solid #dce6df",
    borderRadius:18,
    background:"#fff",
    boxShadow:"0 10px 26px rgba(15,23,42,.045)",
  },
  panelHeader:{
    marginBottom:13,
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    gap:12,
    flexWrap:"wrap",
  },
  panelEyebrow:{
    display:"block",
    marginBottom:4,
    color:"#16834f",
    fontSize:9,
    fontWeight:900,
    letterSpacing:1.1,
  },
  panelTitle:{
    margin:0,
    color:"#17251e",
    fontSize:21,
    letterSpacing:"-.3px",
  },
  counter:{
    padding:"6px 10px",
    borderRadius:999,
    background:"#edf8f1",
    color:"#16834f",
    fontSize:10,
    fontWeight:900,
  },
  scheduleList:{
    display:"grid",
    gap:9,
  },
  scheduleRow:{
    padding:"14px",
    border:"1px solid #e1e8e4",
    borderRadius:14,
    background:"linear-gradient(180deg,#ffffff,#fbfdfc)",
    transition:"transform .15s ease, box-shadow .15s ease",
  },
  time:{
    display:"grid",
    gap:3,
  },
  timeMain:{
    fontSize:18,
    fontWeight:950,
    color:"#153b29",
  },
  timeEnd:{
    color:"#7b8780",
    fontSize:10,
    fontWeight:700,
  },
  classMeta:{
    minWidth:0,
  },
  classType:{
    display:"inline-flex",
    padding:"4px 7px",
    borderRadius:999,
    background:"#eef8f2",
    color:"#16834f",
    fontSize:8,
    fontWeight:950,
    letterSpacing:.8,
  },
  className:{
    display:"block",
    marginTop:5,
    color:"#17251e",
    fontSize:17,
    fontWeight:950,
  },
  classInstructor:{
    display:"block",
    marginTop:3,
    color:"#748178",
    fontSize:10,
  },
  capacityWrap:{
    display:"grid",
    gap:6,
  },
  capacityTop:{
    display:"flex",
    justifyContent:"space-between",
    gap:8,
    color:"#607168",
    fontSize:9,
    fontWeight:800,
  },
  track:{
    height:7,
    overflow:"hidden",
    borderRadius:999,
    background:"#e7eee9",
  },
  fill:{
    height:"100%",
    borderRadius:999,
    background:"linear-gradient(90deg,#16a45b,#08743c)",
  },
  actionButton:{
    minHeight:40,
    padding:"0 13px",
    border:"none",
    borderRadius:10,
    background:"#16834f",
    color:"#fff",
    fontSize:11,
    fontWeight:900,
    cursor:"pointer",
  },
  actionDisabled:{
    minHeight:40,
    padding:"0 13px",
    border:"1px solid #e3e8e5",
    borderRadius:10,
    background:"#f4f6f5",
    color:"#9aa49e",
    fontSize:11,
    fontWeight:900,
    cursor:"not-allowed",
  },
  aside:{
    position:"sticky",
    top:12,
    padding:18,
    border:"1px solid #dce6df",
    borderRadius:18,
    background:"linear-gradient(180deg,#0c3a27,#08291c)",
    color:"#fff",
    boxShadow:"0 14px 34px rgba(8,53,34,.17)",
  },
  asideEyebrow:{
    display:"block",
    color:"#76dfa3",
    fontSize:9,
    fontWeight:900,
    letterSpacing:1.1,
  },
  asideTitle:{
    margin:"5px 0 15px",
    fontSize:20,
  },
  ringWrap:{
    display:"grid",
    placeItems:"center",
    margin:"4px auto 16px",
  },
  ring:{
    width:128,
    height:128,
    display:"grid",
    placeItems:"center",
    borderRadius:"50%",
  },
  ringInner:{
    width:94,
    height:94,
    display:"grid",
    placeItems:"center",
    alignContent:"center",
    borderRadius:"50%",
    background:"#0b2e20",
    boxShadow:"inset 0 0 0 1px rgba(255,255,255,.08)",
  },
  ringValue:{
    fontSize:25,
    lineHeight:1,
    fontWeight:950,
  },
  ringLabel:{
    marginTop:4,
    color:"#bfd7ca",
    fontSize:9,
    fontWeight:800,
  },
  asideStats:{
    display:"grid",
    gap:8,
  },
  asideRow:{
    padding:"9px 0",
    display:"flex",
    justifyContent:"space-between",
    gap:12,
    borderBottom:"1px solid rgba(255,255,255,.09)",
    color:"#d5e8dd",
    fontSize:10,
  },
  asideValue:{
    color:"#fff",
    fontWeight:950,
  },
  asideButton:{
    width:"100%",
    minHeight:42,
    marginTop:14,
    border:"none",
    borderRadius:11,
    background:"#fff",
    color:"#0b5b35",
    fontWeight:950,
    cursor:"pointer",
  },
  statusStrip:{
    marginTop:12,
    display:"grid",
    gap:8,
  },
  statusBox:{
    padding:10,
    border:"1px solid #e1e8e4",
    borderRadius:12,
    background:"#fafcfb",
  },
  statusLabel:{
    display:"block",
    color:"#77847d",
    fontSize:9,
    fontWeight:800,
  },
  statusValue:{
    display:"block",
    marginTop:3,
    color:"#17251e",
    fontSize:17,
    fontWeight:950,
  },
  filters:{
    marginBottom:13,
    padding:11,
    border:"1px solid #e0e8e3",
    borderRadius:13,
    background:"#f8fbf9",
  },
  input:{
    width:"100%",
    minHeight:42,
    padding:"9px 11px",
    border:"1px solid #cfdad3",
    borderRadius:10,
    background:"#fff",
    color:"#17251e",
    outline:"none",
    fontSize:13,
  },
  stepper:{
    maxWidth:1450,
    margin:"0 auto 12px",
  },
  step:{
    padding:"10px 12px",
    display:"flex",
    alignItems:"center",
    gap:9,
    border:"1px solid #dce6df",
    borderRadius:12,
    background:"#fff",
    color:"#506158",
    fontSize:10,
    fontWeight:850,
  },
  stepActive:{
    borderColor:"#9fd3b3",
    background:"#edf8f1",
    color:"#0d6f40",
  },
  stepNumber:{
    width:27,
    height:27,
    display:"grid",
    placeItems:"center",
    borderRadius:9,
    background:"#173c2a",
    color:"#fff",
    fontSize:10,
    fontWeight:950,
  },
};

const s = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "#f4f7f5",
    color: "#17211c",
    fontFamily: "Arial, sans-serif",
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 12,
    background: "#f4f7f5",
    color: "#16834f",
    fontFamily: "Arial, sans-serif",
  },

  spinner: {
    width: 42,
    height: 42,
    border: "5px solid #dce8e1",
    borderTopColor: "#16834f",
    borderRadius: "50%",
  },

  header: {
    maxWidth: 1450,
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    flexWrap: "wrap",
  },

  eyebrow: {
    display: "block",
    marginBottom: 6,
    color: "#16834f",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.3,
  },

  eyebrowSmall: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  title: {
    margin: "0 0 7px",
    fontSize: "clamp(30px,4vw,42px)",
    lineHeight: 1.05,
  },

  subtitle: {
    margin: 0,
    color: "#69756d",
    fontSize: 14,
  },

  headerActions: {
    display: "flex",
    gap: 9,
    flexWrap: "wrap",
  },

  tabs: {
    maxWidth: 1450,
    margin: "0 auto 18px",
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 4,
  },

  tab: {
    flex: "0 0 auto",
    minHeight: 42,
    padding: "9px 14px",
    border: "1px solid #d6e1da",
    borderRadius: 12,
    background: "#fff",
    color: "#506057",
    fontWeight: 800,
    cursor: "pointer",
  },

  tabActive: {
    borderColor: "#16834f",
    background: "#16834f",
    color: "#fff",
  },

  error: {
    maxWidth: 1450,
    margin: "0 auto 18px",
    padding: "13px 15px",
    border: "1px solid #fecaca",
    borderRadius: 12,
    background: "#fef2f2",
    color: "#991b1b",
    fontWeight: 700,
  },

  toolbar: {
    maxWidth: 1450,
    margin: "0 auto 18px",
    padding: 16,
    display: "grid",
    gridTemplateColumns: "minmax(190px,1fr) repeat(2,minmax(150px,.55fr))",
    gap: 12,
    border: "1px solid #dce5df",
    borderRadius: 17,
    background: "#fff",
  },

  quickInfo: {
    minHeight: 70,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    borderRadius: 13,
    background: "#f7faf8",
  },

  bigNumber: {
    marginTop: 4,
    fontSize: 22,
  },

  gridCards: {
    maxWidth: 1450,
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
    gap: 14,
  },

  classCard: {
    padding: 18,
    border: "1px solid #dce5df",
    borderRadius: 17,
    background: "#fff",
    boxShadow: "0 7px 22px rgba(15,23,42,.045)",
  },

  classTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },

  badge: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: 999,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
  },

  cardTitle: {
    margin: "8px 0 0",
    fontSize: 20,
  },

  availabilityGood: {
    color: "#16834f",
    fontSize: 12,
  },

  availabilityFull: {
    color: "#be123c",
    fontSize: 12,
  },

  classData: {
    marginTop: 15,
    display: "grid",
    gap: 8,
  },

  dataRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 8,
    borderBottom: "1px solid #edf1ee",
    fontSize: 13,
  },

  cardButton: {
    width: "100%",
    minHeight: 42,
    marginTop: 15,
    border: "none",
    borderRadius: 11,
    background: "#16834f",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  panel: {
    maxWidth: 1450,
    margin: "0 auto 18px",
    padding: 20,
    border: "1px solid #dce5df",
    borderRadius: 17,
    background: "#fff",
    boxShadow: "0 7px 22px rgba(15,23,42,.045)",
  },

  panelHeader: {
    marginBottom: 15,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },

  panelTitle: {
    margin: 0,
    fontSize: 21,
  },

  counter: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 11,
    fontWeight: 900,
  },

  twoColumns: {
    maxWidth: 1450,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: 16,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 12,
  },

  label: {
    color: "#526158",
    fontSize: 12,
    fontWeight: 800,
  },

  input: {
    width: "100%",
    minHeight: 43,
    padding: "9px 11px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    background: "#fff",
    color: "#17211c",
    fontSize: 14,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 10,
  },

  checkGrid: {
    display: "grid",
    gap: 9,
    margin: "6px 0 14px",
  },

  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    color: "#526158",
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 9,
    flexWrap: "wrap",
  },

  primaryButton: {
    minHeight: 42,
    padding: "9px 15px",
    border: "none",
    borderRadius: 10,
    background: "#16834f",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryButton: {
    minHeight: 42,
    padding: "9px 14px",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    background: "#fff",
    color: "#26342b",
    fontWeight: 800,
    cursor: "pointer",
  },

  primaryWide: {
    width: "100%",
    minHeight: 45,
    marginTop: 4,
    border: "none",
    borderRadius: 11,
    background: "#16834f",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  searchResults: {
    marginTop: -5,
    marginBottom: 12,
    display: "grid",
    gap: 6,
    padding: 8,
    border: "1px solid #dce5df",
    borderRadius: 12,
    background: "#fff",
  },

  searchItem: {
    width: "100%",
    padding: 10,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    border: "none",
    borderRadius: 9,
    background: "#f7faf8",
    color: "#17211c",
    textAlign: "left",
    cursor: "pointer",
  },

  selectedClient: {
    marginBottom: 14,
    padding: 13,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: "1px solid #bfe0cb",
    borderRadius: 12,
    background: "#f0faf4",
  },

  linkButton: {
    border: "none",
    background: "transparent",
    color: "#16834f",
    fontWeight: 900,
    cursor: "pointer",
  },

  slotList: {
    marginTop: 14,
    display: "grid",
    gap: 8,
  },

  slot: {
    width: "100%",
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    border: "1px solid #dce5df",
    borderRadius: 12,
    background: "#fff",
    color: "#17211c",
    textAlign: "left",
    cursor: "pointer",
  },

  slotSelected: {
    borderColor: "#16834f",
    background: "#f0faf4",
  },

  slotDetail: {
    display: "block",
    marginTop: 4,
    color: "#7a867f",
    fontSize: 11,
    lineHeight: 1.4,
  },

  smallGood: {
    color: "#16834f",
    fontSize: 11,
    fontWeight: 900,
  },

  smallFull: {
    color: "#be123c",
    fontSize: 11,
    fontWeight: 900,
  },

  stack: {
    display: "grid",
    gap: 9,
  },

  listCard: {
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    border: "1px solid #edf1ee",
    borderRadius: 12,
    background: "#fbfcfb",
  },

  reservationCard: {
    padding: 13,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: "1px solid #edf1ee",
    borderRadius: 12,
    background: "#fbfcfb",
  },

  reservationMain: {
    minWidth: 0,
  },

  reservationName: {
    display: "block",
    marginTop: 6,
    overflowWrap: "anywhere",
  },

  inlineActions: {
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  smallButton: {
    minHeight: 34,
    padding: "7px 10px",
    border: "1px solid #d4ddd7",
    borderRadius: 9,
    background: "#fff",
    color: "#435047",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },

  smallSuccess: {
    minHeight: 34,
    padding: "7px 10px",
    border: "1px solid #bfe0cb",
    borderRadius: 9,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
  },

  smallDanger: {
    minHeight: 34,
    padding: "7px 10px",
    border: "1px solid #fecaca",
    borderRadius: 9,
    background: "#fff5f5",
    color: "#be123c",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
  },

  empty: {
    gridColumn: "1 / -1",
    minHeight: 120,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 7,
    padding: 20,
    border: "1px dashed #ccd7d0",
    borderRadius: 15,
    background: "#fbfcfb",
    textAlign: "center",
  },

  muted: {
    color: "#7a867f",
    fontSize: 12,
  },

  footer: {
    maxWidth: 1450,
    margin: "0 auto",
    padding: "8px 2px 20px",
    color: "#8b958f",
    fontSize: 10,
    textAlign: "right",
  },
  ...sPro,

  timePicker: {
    width: "100%",
    padding: 9,
    border: "1px solid #CCD7D0",
    borderRadius: 11,
    background: "#F9FBFA",
  },

  timePickerControls: {
    display: "grid",
    gridTemplateColumns:
      "minmax(64px,1fr) auto minmax(64px,1fr) minmax(78px,1fr)",
    gap: 6,
    alignItems: "center",
  },

  timeSelect: {
    width: "100%",
    minHeight: 40,
    padding: "7px 8px",
    border: "1px solid #D4DED8",
    borderRadius: 9,
    background: "#FFFFFF",
    color: "#17211C",
    fontSize: 13,
    fontWeight: 800,
    textAlign: "center",
  },

  timePeriodSelect: {
    width: "100%",
    minHeight: 40,
    padding: "7px 8px",
    border: "1px solid #D4DED8",
    borderRadius: 9,
    background: "#FFFFFF",
    color: "#17211C",
    fontSize: 12,
    fontWeight: 800,
  },

  timeColon: {
    color: "#506057",
    fontSize: 17,
    fontWeight: 900,
    textAlign: "center",
  },

  timePickerFooter: {
    marginTop: 7,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },

  timeApplied: {
    color: "#6F7D75",
    fontSize: 9,
    fontWeight: 800,
  },

  timeApplyButton: {
    minHeight: 34,
    padding: "6px 10px",
    border: "none",
    borderRadius: 8,
    background: "#16834F",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  portalPanel: {
    maxWidth: 1450,
    margin: "0 auto 14px",
    padding: 18,
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 250px",
    gap: 16,
    border: "1px solid #D8E6DE",
    borderRadius: 18,
    background:
      "linear-gradient(135deg,#FFFFFF 0%,#F2FAF5 100%)",
    boxShadow: "0 8px 24px rgba(18,61,39,.05)",
  },

  portalMain: {
    minWidth: 0,
  },

  portalText: {
    maxWidth: 700,
    margin: "5px 0 14px",
    color: "#718078",
    fontSize: 11,
    lineHeight: 1.5,
  },

  portalFields: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  portalToggle: {
    marginTop: 10,
    padding: 11,
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    border: "1px solid #D9E6DE",
    borderRadius: 11,
    background: "#FFFFFF",
    color: "#244034",
    fontSize: 10,
  },

  portalLinkBox: {
    marginTop: 10,
    padding: 11,
    display: "grid",
    gap: 4,
    overflow: "hidden",
    borderRadius: 11,
    background: "#0B4B2C",
    color: "#FFFFFF",
    fontSize: 9,
  },

  portalActions: {
    marginTop: 10,
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
  },

  slugField: {
    minHeight: 42,
    display: "grid",
    gridTemplateColumns: "auto minmax(0,1fr)",
    alignItems: "center",
    overflow: "hidden",
    border: "1px solid #D6E1DA",
    borderRadius: 10,
    background: "#FFFFFF",
  },

  slugPrefix: {
    padding: "0 0 0 10px",
    color: "#6F7D75",
    fontSize: 10,
    fontWeight: 800,
  },

  slugInput: {
    width: "100%",
    minWidth: 0,
    minHeight: 40,
    padding: "8px 10px 8px 3px",
    border: 0,
    outline: "none",
    background: "transparent",
    color: "#142019",
    fontFamily: "inherit",
  },

  qrPanel: {
    minHeight: 220,
    padding: 14,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 6,
    borderRadius: 15,
    background: "#FFFFFF",
    textAlign: "center",
  },

  qrImage: {
    width: 150,
    height: 150,
    objectFit: "contain",
  },

  qrEmpty: {
    color: "#7A867F",
    fontSize: 10,
    lineHeight: 1.45,
  },

  paymentInfo: {
    marginTop: 9,
    padding: 11,
    display: "grid",
    gap: 4,
    border: "1px solid #F1D28B",
    borderRadius: 11,
    background: "#FFF9E9",
    color: "#785B09",
    fontSize: 9,
    lineHeight: 1.45,
  },

  smallPay: {
    minHeight: 34,
    padding: "7px 11px",
    border: 0,
    borderRadius: 9,
    background: "#0B7A43",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

};
