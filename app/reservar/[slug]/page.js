"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const VERSION = "2026.09.03-PORTAL-PUBLICO-PREMIUM-V8-COVER-SCROLL-CORREGIDO";

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function esBelleza(portal) {
  const texto = normalizar(
    `${portal?.tipo_negocio || ""} ${portal?.categoria_negocio || ""}`
  );

  return [
    "belleza",
    "salon",
    "peluqueria",
    "estetica",
    "barberia",
    "spa",
    "beauty",
  ].some((item) => texto.includes(item));
}


function esGimnasio(portal) {
  const texto = normalizar(
    `${portal?.tipo_negocio || ""} ${portal?.categoria_negocio || ""}`
  );

  return [
    "gimnasio",
    "gym",
    "fitness",
    "crossfit",
    "cross fit",
    "box",
    "academia",
    "club deportivo",
  ].some((item) => texto.includes(item));
}

function fechaISO(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function formatoFecha(iso) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${String(iso).slice(0, 10)}T12:00:00`));
}

function formatoHora(hora) {
  if (!hora) return "-";
  const [h = "0", m = "0"] = String(hora).split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return new Intl.DateTimeFormat("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function dinero(valor) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(Number(valor || 0));
}

function mensajeError(error) {
  return String(
    error?.message ||
      error?.details ||
      error?.hint ||
      error ||
      "Error inesperado"
  )
    .replace("P0001:", "")
    .replace("Error:", "")
    .trim();
}

function claveSlot(item) {
  return `${item?.horario_id || ""}-${String(
    item?.hora_inicio || ""
  ).slice(0, 5)}`;
}

function franjaDeHora(hora) {
  const [h = "0"] = String(hora || "").split(":");
  const numero = Number(h);

  if (numero < 12) return "manana";
  if (numero < 18) return "tarde";
  return "noche";
}


function fechasHastaFinDeAnio2026() {
  const lista = [];
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);

  const fin = new Date("2026-12-31T12:00:00");
  const cursor = new Date(hoy);

  while (cursor <= fin) {
    lista.push(fechaISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return lista;
}

function fechaCorta(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-PA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T12:00:00`));
}

function inicialNombre(nombre) {
  return String(nombre || "?").trim().charAt(0).toUpperCase();
}

function obtenerCitasEjecutadas(servicio) {
  return Number(
    servicio?.citas_ejecutadas ??
      servicio?.reservas_ejecutadas ??
      servicio?.total_ejecutadas ??
      servicio?.total_reservas_ejecutadas ??
      0
  );
}

function formatoEntero(valor) {
  return new Intl.NumberFormat("es-PA").format(Number(valor || 0));
}


function formatearHoraLocalPublica(valor) {
  if (!valor) return "";

  const partes = String(valor).slice(0, 5).split(":");
  const horas = Number(partes[0] || 0);
  const minutos = Number(partes[1] || 0);

  const fecha = new Date(2000, 0, 1, horas, minutos);

  return new Intl.DateTimeFormat("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(fecha);
}

export default function ReservaPublicaAutoservicioPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : params?.slug || "";

  const tokenUrl = searchParams?.get("cita") || "";

  const [portal, setPortal] = useState(null);
  const [identidadEmpresa, setIdentidadEmpresa] = useState(null);
  const [perfilPublicoLocal, setPerfilPublicoLocal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [tema, setTema] = useState("claro");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mostrarAvisoMiCita, setMostrarAvisoMiCita] = useState(false);

  const [tabPortal, setTabPortal] = useState("servicios");
  const [mostrarCabeceraCompacta, setMostrarCabeceraCompacta] = useState(false);
  const [equipoPortal, setEquipoPortal] = useState([]);
  const [cargandoEquipoPortal, setCargandoEquipoPortal] = useState(false);

  const [paso, setPaso] = useState(1);

  const [fecha, setFecha] = useState(fechaISO());
  const [horarios, setHorarios] = useState([]);
  const [serviciosCatalogo, setServiciosCatalogo] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(false);
  const [profesionalesServicio, setProfesionalesServicio] = useState([]);
  const [cargandoProfesionales, setCargandoProfesionales] = useState(false);
  const [servicioFiltro, setServicioFiltro] = useState("todos");
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [profesionalSeleccionado, setProfesionalSeleccionado] =
    useState("sin-preferencia");
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(null);
  const [franjaHorario, setFranjaHorario] = useState("manana");

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [reservaConfirmada, setReservaConfirmada] = useState(null);
  const [tokenGestion, setTokenGestion] = useState("");

  const [miCita, setMiCita] = useState(null);
  const [telefonoGestion, setTelefonoGestion] = useState("");
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [mostrarNuevaCita, setMostrarNuevaCita] = useState(false);
  const [wodPublico, setWodPublico] = useState(null);
  const [cargandoWod, setCargandoWod] = useState(false);

  const perfilBelleza = esBelleza(portal);
  const perfilGimnasio = esGimnasio(portal);
  const dias = useMemo(() => fechasHastaFinDeAnio2026(), []);

  useEffect(() => {
    if (!slug) return;

    cargarPortal();

    try {
      const tokenGuardado = localStorage.getItem(
        `konax_reserva_token_${slug}`
      );

      if (tokenGuardado) {
        setTokenGestion(tokenGuardado);
      }
    } catch (err) {
      console.warn("No se pudo leer la cita guardada:", err);
    }
  }, [slug]);

  useEffect(() => {
    if (!portal?.ok || !fecha) return;
    cargarDisponibilidad(fecha);
  }, [portal?.ok, fecha]);

  useEffect(() => {
    if (!portal?.ok || !tokenUrl) return;

    cargarMiCita(tokenUrl);

    try {
      localStorage.setItem(
        `konax_reserva_token_${slug}`,
        tokenUrl
      );
      setTokenGestion(tokenUrl);
    } catch (err) {
      console.warn("No se pudo guardar la cita:", err);
    }
  }, [portal?.ok, tokenUrl, slug]);

  async function cargarPortal() {
    setCargando(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc(
      "obtener_agenda_publica",
      { p_slug: slug }
    );

    if (rpcError || !data?.ok) {
      setError(
        mensajeError(rpcError) ||
          data?.mensaje ||
          "Este portal de reservas no está disponible."
      );
      setPortal(null);
      setCargando(false);
      return;
    }

    setPortal(data);

    const [
      respuestaIdentidad,
      respuestaPerfilPublico,
      serviciosBase,
    ] = await Promise.all([
      supabase.rpc(
        "obtener_identidad_empresa_publica",
        {
          p_slug: slug,
        }
      ),
      supabase.rpc(
        "obtener_perfil_publico_agenda",
        {
          p_slug: slug,
        }
      ),
      cargarServiciosPublicos(),
    ]);

    const identidadData = respuestaIdentidad?.data;

    const identidad = Array.isArray(identidadData)
      ? identidadData[0]
      : identidadData;

    setIdentidadEmpresa(identidad || null);

    if (respuestaPerfilPublico?.error) {
      console.warn(
        "No se pudo cargar el perfil público del local:",
        respuestaPerfilPublico.error
      );
      setPerfilPublicoLocal(null);
    } else {
      const perfilData = respuestaPerfilPublico?.data;
      const perfil = Array.isArray(perfilData)
        ? perfilData[0]
        : perfilData;

      setPerfilPublicoLocal(
        perfil?.ok === false ? null : perfil || null
      );
    }

    if (esBelleza(data) && Array.isArray(serviciosBase) && serviciosBase.length > 0) {
      cargarEquipoPortal(serviciosBase);
    }

    setCargando(false);
  }

  async function cargarServiciosPublicos() {
    setCargandoServicios(true);

    const { data, error: rpcError } = await supabase.rpc(
      "obtener_servicios_agenda_publica",
      {
        p_slug: slug,
      }
    );

    if (rpcError) {
      console.error(
        "No se pudieron cargar los servicios públicos:",
        rpcError
      );
      setServiciosCatalogo([]);
      setCargandoServicios(false);
      return [];
    }

    const lista = Array.isArray(data) ? data : [];
    setServiciosCatalogo(lista);
    setCargandoServicios(false);
    return lista;
  }

  async function cargarEquipoPortal(serviciosBase = serviciosCatalogo) {
    if (!Array.isArray(serviciosBase) || serviciosBase.length === 0) {
      setEquipoPortal([]);
      return;
    }

    setCargandoEquipoPortal(true);

    try {
      const respuestas = await Promise.all(
        serviciosBase.map((servicio) =>
          supabase.rpc(
            "obtener_profesionales_servicio_publico",
            {
              p_slug: slug,
              p_servicio_id: String(servicio.id),
            }
          )
        )
      );

      const mapa = new Map();

      respuestas.forEach((respuesta) => {
        const lista = Array.isArray(respuesta?.data)
          ? respuesta.data
          : [];

        lista.forEach((prof) => {
          const clave = String(
            prof?.id || normalizar(prof?.nombre || "")
          );

          if (!clave || mapa.has(clave)) return;

          mapa.set(clave, {
            id: prof.id || clave,
            nombre: String(prof.nombre || "").trim(),
            especialidad: prof.especialidad || "Profesional",
            fotoUrl: prof.foto_url || "",
          });
        });
      });

      setEquipoPortal(Array.from(mapa.values()));
    } catch (err) {
      console.warn("No se pudo cargar el equipo público:", err);
      setEquipoPortal([]);
    } finally {
      setCargandoEquipoPortal(false);
    }
  }

  async function cargarDisponibilidad(fechaSeleccionada) {
    setCargandoHorarios(true);
    setError("");
    setHorarioSeleccionado(null);

    const { data, error: rpcError } = await supabase.rpc(
      "obtener_disponibilidad_agenda_publica",
      {
        p_slug: slug,
        p_fecha: fechaSeleccionada,
      }
    );

    if (rpcError) {
      setHorarios([]);
      setError(mensajeError(rpcError));
      setCargandoHorarios(false);
      return;
    }

    setHorarios(Array.isArray(data) ? data : []);
    setCargandoHorarios(false);
  }

  async function cargarProfesionalesServicio(servicioId) {
    if (!perfilBelleza || !servicioId) {
      setProfesionalesServicio([]);
      return [];
    }

    setCargandoProfesionales(true);

    const { data, error: rpcError } = await supabase.rpc(
      "obtener_profesionales_servicio_publico",
      {
        p_slug: slug,
        p_servicio_id: String(servicioId),
      }
    );

    if (rpcError) {
      console.error(
        "No se pudieron cargar profesionales del servicio:",
        rpcError
      );
      setProfesionalesServicio([]);
      setCargandoProfesionales(false);
      return [];
    }

    const lista = Array.isArray(data) ? data : [];
    setProfesionalesServicio(lista);
    setCargandoProfesionales(false);
    return lista;
  }


  async function cargarWodPublico(fechaWod, servicioId) {
    if (!perfilGimnasio || !fechaWod || !servicioId) {
      setWodPublico(null);
      return;
    }

    setCargandoWod(true);

    const { data, error: rpcError } = await supabase.rpc(
      "obtener_wod_publico",
      {
        p_slug: slug,
        p_fecha: String(fechaWod).slice(0, 10),
        p_servicio_id: servicioId,
      }
    );

    if (rpcError || !data?.ok) {
      setWodPublico(null);
      setCargandoWod(false);
      return;
    }

    setWodPublico(data);
    setCargandoWod(false);
  }

  async function cargarMiCita(token = tokenUrl) {
    if (!token) return;

    const { data, error: rpcError } = await supabase.rpc(
      "obtener_reserva_agenda_publica",
      {
        p_slug: slug,
        p_token: token,
      }
    );

    if (rpcError || !data?.ok) {
      setMiCita(null);
      setError(
        mensajeError(rpcError) ||
          data?.mensaje ||
          "No se pudo cargar la cita."
      );
      return;
    }

    setMiCita(data);
    if (data.fecha) setFecha(String(data.fecha).slice(0, 10));

    if (perfilGimnasio && data.servicio_id && data.fecha) {
      await cargarWodPublico(data.fecha, data.servicio_id);
    }
  }

  const servicios = useMemo(() => {
    /*
      SALÓN DE BELLEZA:
      El PASO 1 usa el catálogo público de servicios y ya no depende
      de que el servicio tenga un slot disponible en la fecha actual.

      GIMNASIO / compatibilidad:
      Se conserva la lógica anterior basada en la disponibilidad del día.
    */
    if (perfilBelleza && serviciosCatalogo.length > 0) {
      return serviciosCatalogo.map((item) => ({
        id: String(item.id),
        nombre: item.nombre,
        descripcion: item.descripcion || "",
        imagenUrl: item.imagen_url || "",
        precio: Number(item.precio || 0),
        requierePago: Boolean(item.requiere_pago),
        duracion: Number(item.duracion_minutos || 60),
        citasEjecutadas: obtenerCitasEjecutadas(item),
      }));
    }

    const mapa = new Map();

    horarios.forEach((item) => {
      if (!mapa.has(String(item.servicio_id))) {
        mapa.set(String(item.servicio_id), {
          id: String(item.servicio_id),
          nombre: item.servicio_nombre,
          descripcion: item.descripcion || "",
          imagenUrl: item.imagen_url || "",
          precio: Number(item.precio || 0),
          requierePago: Boolean(item.requiere_pago),
          duracion: Number(item.duracion_minutos || 60),
          citasEjecutadas: obtenerCitasEjecutadas(item),
        });
      }
    });

    return Array.from(mapa.values());
  }, [
    horarios,
    serviciosCatalogo,
    perfilBelleza,
  ]);

  const serviciosOrdenadosPorDemanda = useMemo(() => {
    return [...servicios].sort((a, b) => {
      const porReservas =
        Number(b.citasEjecutadas || 0) -
        Number(a.citasEjecutadas || 0);

      if (porReservas !== 0) return porReservas;

      return String(a.nombre || "").localeCompare(
        String(b.nombre || ""),
        "es"
      );
    });
  }, [servicios]);

  const serviciosMasPedidos = useMemo(
    () => serviciosOrdenadosPorDemanda.slice(0, 3),
    [serviciosOrdenadosPorDemanda]
  );

  const profesionales = useMemo(() => {
    if (!servicioSeleccionado) return [];

    /*
      SALÓN DE BELLEZA:
      Los profesionales salen del perfil profesional y de los
      servicios asignados, no solamente de agenda_horarios.
      Así un profesional aparece en el paso 2 si está activo y
      tiene este servicio asignado.

      GIMNASIO / compatibilidad:
      Se mantiene la lógica anterior basada en instructores de
      los horarios disponibles.
    */
    if (perfilBelleza) {
      return profesionalesServicio.map((prof) => {
        const nombreProfesional = String(
          prof.nombre || ""
        ).trim();

        return {
          id: normalizar(nombreProfesional),
          profesionalId: prof.id,
          nombre: nombreProfesional,
          especialidad: prof.especialidad || "Profesional",
          fotoUrl: prof.foto_url || "",
        };
      });
    }

    const mapa = new Map();

    horarios
      .filter(
        (item) =>
          String(item.servicio_id) ===
          String(servicioSeleccionado.id)
      )
      .forEach((item) => {
        const nombreProfesional = String(
          item.instructor || ""
        ).trim();

        if (!nombreProfesional) return;

        const clave = normalizar(nombreProfesional);

        if (!mapa.has(clave)) {
          mapa.set(clave, {
            id: clave,
            nombre: nombreProfesional,
            especialidad: "Instructor",
            fotoUrl: "",
          });
        }
      });

    return Array.from(mapa.values());
  }, [
    horarios,
    servicioSeleccionado,
    perfilBelleza,
    profesionalesServicio,
  ]);

  const slotsDisponibles = useMemo(() => {
    if (!servicioSeleccionado) return [];

    return horarios.filter((item) => {
      const mismoServicio =
        String(item.servicio_id) ===
        String(servicioSeleccionado.id);

      const disponible = Number(item.disponibles || 0) > 0;

      const coincideProfesional =
        profesionalSeleccionado === "sin-preferencia" ||
        normalizar(item.instructor || "") ===
          normalizar(profesionalSeleccionado);

      return mismoServicio && disponible && coincideProfesional;
    });
  }, [
    horarios,
    servicioSeleccionado,
    profesionalSeleccionado,
  ]);

  const slotsPorFranja = useMemo(() => {
    const grupos = {
      manana: [],
      tarde: [],
      noche: [],
    };

    slotsDisponibles.forEach((slot) => {
      grupos[franjaDeHora(slot.hora_inicio)].push(slot);
    });

    return grupos;
  }, [slotsDisponibles]);

  const slotsFranjaVisible = useMemo(
    () => slotsPorFranja[franjaHorario] || [],
    [slotsPorFranja, franjaHorario]
  );

  useEffect(() => {
    if (slotsDisponibles.length === 0) return;

    const actualTiene =
      (slotsPorFranja[franjaHorario] || []).length > 0;

    if (actualTiene) return;

    if (slotsPorFranja.manana.length > 0) {
      setFranjaHorario("manana");
      return;
    }

    if (slotsPorFranja.tarde.length > 0) {
      setFranjaHorario("tarde");
      return;
    }

    if (slotsPorFranja.noche.length > 0) {
      setFranjaHorario("noche");
    }
  }, [slotsDisponibles, slotsPorFranja, franjaHorario]);

  const serviciosFechaActual = useMemo(() => {
    const mapa = new Map();

    horarios.forEach((item) => {
      const id = String(item.servicio_id);

      if (!mapa.has(id)) {
        mapa.set(id, {
          id,
          nombre: item.servicio_nombre,
          descripcion: item.descripcion || "",
          precio: Number(item.precio || 0),
          requierePago: Boolean(item.requiere_pago),
          duracion: Number(item.duracion_minutos || 60),
        });
      }
    });

    return Array.from(mapa.values());
  }, [horarios]);

  const [fechasConDisponibilidad, setFechasConDisponibilidad] = useState([]);
  const [buscandoFechas, setBuscandoFechas] = useState(false);

  async function buscarFechasDisponibles() {
    if (!portal?.ok) return;

    setBuscandoFechas(true);

    try {
      const candidatos = fechasHastaFinDeAnio2026();
      const resultados = [];

      for (const dia of candidatos) {
        const { data, error: rpcError } = await supabase.rpc(
          "obtener_disponibilidad_agenda_publica",
          {
            p_slug: slug,
            p_fecha: dia,
          }
        );

        if (!rpcError && Array.isArray(data) && data.length > 0) {
          resultados.push(dia);
        }

      }

      setFechasConDisponibilidad(resultados);

    } finally {
      setBuscandoFechas(false);
    }
  }

  useEffect(() => {
    if (!portal?.ok) return;
    buscarFechasDisponibles();
  }, [portal?.ok]);

  const profesionalResumen = useMemo(() => {
    if (profesionalSeleccionado === "sin-preferencia") {
      return "Sin preferencia";
    }

    return (
      profesionales.find(
        (p) => p.id === profesionalSeleccionado
      )?.nombre || "Sin preferencia"
    );
  }, [profesionalSeleccionado, profesionales]);

  const horariosVisibles = useMemo(() => {
    if (servicioFiltro === "todos") return horarios;

    return horarios.filter(
      (item) =>
        String(item.servicio_id) === String(servicioFiltro)
    );
  }, [horarios, servicioFiltro]);

  const serviciosConSlots = useMemo(() => {
    const grupos = new Map();

    horariosVisibles.forEach((item) => {
      const servicioId = String(item.servicio_id);

      if (!grupos.has(servicioId)) {
        grupos.set(servicioId, {
          servicio_id: item.servicio_id,
          servicio_nombre: item.servicio_nombre,
          descripcion: item.descripcion || "",
          instructor: item.instructor || "",
          precio: Number(item.precio || 0),
          requiere_pago: Boolean(item.requiere_pago),
          duracion_minutos: Number(item.duracion_minutos || 60),
          slots: [],
        });
      }

      grupos.get(servicioId).slots.push(item);
    });

    return Array.from(grupos.values());
  }, [horariosVisibles]);

  async function elegirServicio(servicio) {
    setServicioSeleccionado(servicio);
    setServicioFiltro(servicio.id);
    setProfesionalSeleccionado("sin-preferencia");
    setHorarioSeleccionado(null);
    setFranjaHorario("manana");
    setError("");

    if (perfilBelleza) {
      await cargarProfesionalesServicio(servicio.id);
    } else {
      setProfesionalesServicio([]);
    }

    setPaso(2);
  }

  function elegirProfesional(valor) {
    setProfesionalSeleccionado(valor);
    setHorarioSeleccionado(null);
    setFranjaHorario("manana");
    setError("");
    setPaso(3);
  }

  function elegirFecha(valor) {
    setFecha(valor);
    setHorarioSeleccionado(null);
    setFranjaHorario("manana");
    setError("");
  }

  function continuarFechaHora() {
    if (!horarioSeleccionado) {
      setError("Selecciona una hora disponible.");
      return;
    }

    setError("");
    setPaso(4);
  }

  function reiniciarFlujo() {
    setPaso(1);
    setTabPortal("servicios");
    setServicioSeleccionado(null);
    setServicioFiltro("todos");
    setProfesionalesServicio([]);
    setProfesionalSeleccionado("sin-preferencia");
    setHorarioSeleccionado(null);
    setFranjaHorario("manana");
    setReservaConfirmada(null);
    setTokenGestion("");
    setFecha(fechaISO());
    setNombre("");
    setTelefono("");
    setObservaciones("");
    setError("");

    setTimeout(() => {
      document.getElementById("flujo-reserva")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  }

  async function confirmarReserva(e) {
    e.preventDefault();

    if (!horarioSeleccionado) {
      setError("Selecciona un servicio y una hora disponible.");
      return;
    }

    if (!nombre.trim() || !telefono.trim()) {
      setError("Ingresa tu nombre y teléfono.");
      return;
    }

    setGuardando(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc(
      "crear_reserva_agenda_publica",
      {
        p_slug: slug,
        p_horario_id: horarioSeleccionado.horario_id,
        p_fecha_reserva: fecha,
        p_hora_inicio: horarioSeleccionado.hora_inicio,
        p_nombre: nombre.trim(),
        p_telefono: telefono.trim(),
        p_observaciones: observaciones.trim() || null,
      }
    );

    if (rpcError || !data?.ok) {
      setError(
        mensajeError(rpcError) ||
          data?.mensaje ||
          "No se pudo reservar."
      );
      setGuardando(false);
      return;
    }

    setReservaConfirmada(data);

    const { data: gestion } = await supabase.rpc(
      "obtener_token_gestion_reserva_publica",
      {
        p_slug: slug,
        p_reserva_id: data.reserva_id,
        p_telefono: telefono.trim(),
      }
    );

    if (gestion?.ok && gestion?.token) {
      const tokenNuevo = String(gestion.token);

      setTokenGestion(tokenNuevo);

      try {
        localStorage.setItem(
          `konax_reserva_token_${slug}`,
          tokenNuevo
        );
      } catch (err) {
        console.warn("No se pudo guardar la cita:", err);
      }
    }

    await cargarDisponibilidad(fecha);

    if (perfilGimnasio && servicioSeleccionado?.id) {
      await cargarWodPublico(fecha, servicioSeleccionado.id);
    }

    setGuardando(false);
    setPaso(5);

    setTimeout(() => {
      document.getElementById("confirmacion-cita")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
  }

  function abrirMiCita() {
    let token = tokenGestion;

    if (!token) {
      try {
        token = localStorage.getItem(
          `konax_reserva_token_${slug}`
        );
      } catch (err) {
        console.warn("No se pudo leer la cita guardada:", err);
      }
    }

    if (token) {
      window.location.href = `/reservar/${slug}?cita=${token}`;
      return;
    }

    setMostrarAvisoMiCita(true);
  }

  async function cancelarMiCita() {
    if (!miCita?.puede_cancelar) return;

    if (!telefonoGestion.trim()) {
      setError(
        "Escribe el teléfono utilizado en la cita para confirmar la cancelación."
      );
      return;
    }

    const confirmar = window.confirm(
      "¿Seguro que deseas cancelar esta cita? El horario quedará disponible inmediatamente."
    );

    if (!confirmar) return;

    setCancelando(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc(
      "cancelar_reserva_agenda_publica",
      {
        p_slug: slug,
        p_token: tokenUrl,
        p_telefono: telefonoGestion.trim(),
        p_motivo: motivoCancelacion.trim() || null,
      }
    );

    if (rpcError || !data?.ok) {
      setError(
        mensajeError(rpcError) ||
          data?.mensaje ||
          "No se pudo cancelar la cita."
      );
      setCancelando(false);
      return;
    }

    await Promise.all([
      cargarMiCita(tokenUrl),
      cargarDisponibilidad(miCita.fecha || fecha),
    ]);

    setCancelando(false);
  }

  function reservarOtraCita() {
    setMostrarNuevaCita(true);
    setMiCita(null);
    reiniciarFlujo();
  }

  function enlaceGestion() {
    if (!tokenGestion || typeof window === "undefined") return "";
    return `${window.location.origin}/reservar/${slug}?cita=${tokenGestion}`;
  }

  // =========================================================
  // PORTADA COMO WEIBOOK
  // - La imagen/portada sube de forma NATIVA con el scroll.
  // - NO hay parallax ni posición fija.
  // - El nombre compacto aparece SOLO cuando la portada ya
  //   salió de la parte superior, evitando duplicados.
  // =========================================================
  useEffect(() => {
    if (cargando || paso !== 1 || typeof window === "undefined") {
      setMostrarCabeceraCompacta(false);
      return;
    }

    let raf = 0;

    const revisar = () => {
      raf = 0;

      const cover = document.querySelector(".kp-cover");

      if (!cover) {
        setMostrarCabeceraCompacta(false);
        return;
      }

      const rect = cover.getBoundingClientRect();

      // 76px aprox. corresponde a la barra superior de KONAX.
      // La cabecera compacta aparece cuando la portada ya pasó.
      setMostrarCabeceraCompacta(rect.bottom <= 86);
    };

    const alScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(revisar);
    };

    revisar();

    window.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("resize", alScroll, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", alScroll);
      window.removeEventListener("resize", alScroll);
    };
  }, [cargando, paso, portadaNegocio]);

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f5f7f6",
          fontFamily:
            'Inter, system-ui, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: "grid",
            justifyItems: "center",
            gap: 12,
            padding: 24,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              display: "block",
              border: "3px solid #dbe6df",
              borderTopColor: "#0b7041",
              borderRadius: "50%",
              animation: "kpSpin .75s linear infinite",
            }}
          />

          <strong
            style={{
              color: "#365347",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Preparando tu agenda...
          </strong>

          <style>{`
            @keyframes kpSpin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </main>
    );
  }

  if (!portal?.ok) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 20,
          background: "#f5f7f6",
          fontFamily:
            'Inter, system-ui, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: "min(420px,100%)",
            padding: 18,
            display: "grid",
            gap: 7,
            border: "1px solid #f2b8b3",
            borderRadius: 16,
            background: "#fff1ef",
            color: "#8a1c12",
          }}
        >
          <strong>Reservas no disponibles</strong>
          <span style={{ fontSize: 13, lineHeight: 1.45 }}>
            {error}
          </span>
        </div>
      </main>
    );
  }

  const nombreNegocio =
    perfilPublicoLocal?.empresa_nombre ||
    identidadEmpresa?.empresa_nombre ||
    portal.titulo_publico ||
    portal.empresa_nombre ||
    "Negocio";

  const logoNegocio =
    identidadEmpresa?.logo_url || "";

  const portadaNegocio =
    identidadEmpresa?.portada_url ||
    portal?.portada_url ||
    portal?.imagen_portada_url ||
    logoNegocio ||
    "";

  const descripcionNegocio =
    identidadEmpresa?.descripcion_publica ||
    portal?.descripcion_publica ||
    portal?.descripcion ||
    "";

  const direccionNegocio =
    perfilPublicoLocal?.direccion ||
    identidadEmpresa?.direccion ||
    portal?.direccion ||
    "";


  const googleMapsUrl = direccionNegocio
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        direccionNegocio
      )}`
    : "";

  const categoriaNegocio =
    identidadEmpresa?.categoria_negocio ||
    portal?.categoria_negocio ||
    portal?.tipo_negocio ||
    (perfilGimnasio ? "Gimnasio" : perfilBelleza ? "Belleza" : "Negocio");

  const horarioPublico = (() => {
    if (perfilPublicoLocal?.horario_configurado) {
      if (perfilPublicoLocal?.cerrado_hoy) {
        return "Cerrado hoy";
      }

      const apertura = formatearHoraLocalPublica(
        perfilPublicoLocal?.hora_apertura
      );
      const cierre = formatearHoraLocalPublica(
        perfilPublicoLocal?.hora_cierre
      );

      if (apertura && cierre) {
        return `${
          perfilPublicoLocal?.abierto_ahora
            ? "Abierto ahora"
            : "Horario de hoy"
        } · ${apertura} – ${cierre}`;
      }
    }

    return (
      identidadEmpresa?.horario_hoy ||
      portal?.horario_hoy ||
      ""
    );
  })();

  return (
    <main className={`kp-page ${tema === "oscuro" ? "kp-dark" : ""}`}>
      <style>{CSS}</style>

      <div className="kp-shell">
        <header className="kp-topbar">
          <button
            type="button"
            className="kp-back"
            onClick={() => {
              if (tokenUrl) {
                window.location.href = `/reservar/${slug}`;
                return;
              }

              if (paso > 1 && paso < 5) {
                setPaso((actual) => actual - 1);
                setError("");
                return;
              }

              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            ‹
          </button>

          <img
            src="/konax-logo.png"
            alt="KONAX"
            className="kp-top-logo"
          />

          <div className="kp-top-icons">
            <button
              type="button"
              className={tema === "oscuro" ? "active" : ""}
              onClick={() => {
                setTema("oscuro");
                setMenuAbierto(false);
              }}
              aria-label="Modo oscuro"
              title="Modo oscuro"
            >
              ☾
            </button>

            <button
              type="button"
              className={tema === "claro" ? "active" : ""}
              onClick={() => {
                setTema("claro");
                setMenuAbierto(false);
              }}
              aria-label="Modo claro"
              title="Modo claro"
            >
              ☀
            </button>

            <button
              type="button"
              className={menuAbierto ? "active" : ""}
              onClick={() => setMenuAbierto((actual) => !actual)}
              aria-label="Abrir menú"
              title="Menú"
            >
              ☰
            </button>
          </div>

          {menuAbierto && (
            <div className="kp-menu">
              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                ⌂ Inicio
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  document
                    .getElementById("flujo-reserva")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                }}
              >
                {perfilGimnasio ? "▣ Reservar clase" : "▣ Reservar"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  abrirMiCita();
                }}
              >
                {perfilGimnasio ? "▤ Mi reserva" : "▤ Mi cita"}
              </button>
            </div>
          )}
        </header>


        {error && (
          <div className="kp-error">
            {error}
          </div>
        )}

        {tokenUrl && miCita ? (
          <section className="kp-manage">
            <span className="kp-eyebrow-dark">
              {perfilGimnasio ? "GESTIONAR MI RESERVA" : "GESTIONAR MI CITA"}
            </span>

            <h2>{miCita.servicio}</h2>

            <div className="kp-data-grid">
              <Dato label="Cliente" value={miCita.cliente} />
              <Dato label="Fecha" value={formatoFecha(miCita.fecha)} />
              <Dato
                label="Horario"
                value={`${formatoHora(
                  miCita.hora_inicio
                )} – ${formatoHora(miCita.hora_fin)}`}
              />
              <Dato
                label={perfilBelleza ? "Profesional" : "Instructor"}
                value={miCita.profesional || "Por confirmar"}
              />
              <Dato
                label="Estado"
                value={String(miCita.estado || "")
                  .replaceAll("_", " ")
                  .toUpperCase()}
              />
            </div>

            {miCita.estado === "cancelada" ? (
              <div className="kp-cancelled">
                {perfilGimnasio
                  ? "Esta reserva está cancelada. El cupo quedó disponible nuevamente."
                  : "Esta cita está cancelada. El horario quedó disponible nuevamente."}
              </div>
            ) : miCita.puede_cancelar ? (
              <div className="kp-cancel-box">
                <label>
                  <span>Teléfono de la cita</span>
                  <input
                    value={telefonoGestion}
                    onChange={(e) =>
                      setTelefonoGestion(e.target.value)
                    }
                    placeholder="Ej. 6000-0000"
                  />
                </label>

                <label>
                  <span>Motivo de cancelación (opcional)</span>
                  <input
                    value={motivoCancelacion}
                    onChange={(e) =>
                      setMotivoCancelacion(e.target.value)
                    }
                    placeholder="Ej. No podré llegar"
                  />
                </label>

                <button
                  type="button"
                  className="kp-danger"
                  onClick={cancelarMiCita}
                  disabled={cancelando}
                >
                  {cancelando ? "Cancelando..." : "Cancelar mi cita"}
                </button>
              </div>
            ) : (
              <div className="kp-info">
                {perfilGimnasio
                  ? "Esta reserva ya no puede cancelarse desde autoservicio."
                  : "Esta cita ya no puede cancelarse desde autoservicio."}
              </div>
            )}

            <button
              type="button"
              className="kp-secondary"
              onClick={reservarOtraCita}
            >
              {perfilGimnasio ? "+ Reservar otra clase" : "+ Reservar otra cita"}
            </button>

            <button
              type="button"
              className="kp-link"
              onClick={() =>
                (window.location.href = `/reservar/${slug}`)
              }
            >
              Volver al portal
            </button>
          </section>
        ) : (
          <section
            id="flujo-reserva"
            className="kp-flow"
          >
            {paso === 1 ? (
              <div className="kp-public-profile">
                <section
                  className={`kp-cover ${portadaNegocio ? "has-image" : ""}`}
                >
                  {portadaNegocio && (
                    <>
                      <img
                        src={portadaNegocio}
                        alt={`Portada de ${nombreNegocio}`}
                        className="kp-cover-image"
                      />
                      <div className="kp-cover-overlay" />
                    </>
                  )}

                  <div className="kp-cover-top">
                    <span className="kp-powered">Reservas con KONAX</span>

                    <button
                      type="button"
                      className="kp-share"
                      onClick={async () => {
                        const url = window.location.href;

                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: nombreNegocio,
                              text: `Reserva en ${nombreNegocio}`,
                              url,
                            });
                          } catch {}
                          return;
                        }

                        try {
                          await navigator.clipboard.writeText(url);
                          alert("Enlace copiado.");
                        } catch {}
                      }}
                      aria-label="Compartir"
                    >
                      ↗
                    </button>
                  </div>

                  {!portadaNegocio && (
                    <div className="kp-cover-pattern">
                      <span>K</span>
                    </div>
                  )}

                  <div className="kp-cover-content">
                    <span className="kp-category-badge">
                      {categoriaNegocio}
                    </span>

                    <h1>{nombreNegocio}</h1>

                    {direccionNegocio && (
                      <a
                        className="kp-profile-meta kp-map-link"
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Cómo llegar a ${nombreNegocio} en Google Maps`}
                      >
                        <span className="kp-meta-icon">⌖</span>

                        <span className="kp-map-copy">
                          <span>{direccionNegocio}</span>
                          <strong>Cómo llegar ↗</strong>
                        </span>
                      </a>
                    )}

                    {horarioPublico && (
                      <div className="kp-profile-meta">
                        <span className="kp-meta-icon">◷</span>
                        <span>{horarioPublico}</span>
                      </div>
                    )}
                  </div>
                </section>

                {mostrarCabeceraCompacta && (
                  <section className="kp-scroll-identity">
                    <div className="kp-scroll-identity-main">
                      <h2>{nombreNegocio}</h2>

                      {direccionNegocio && (
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="kp-scroll-location"
                        >
                          <span>⌖</span>
                          <span>{direccionNegocio}</span>
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      className="kp-scroll-share"
                      onClick={async () => {
                        const url = window.location.href;

                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: nombreNegocio,
                              text: `Reserva en ${nombreNegocio}`,
                              url,
                            });
                          } catch {}
                          return;
                        }

                        try {
                          await navigator.clipboard.writeText(url);
                          alert("Enlace copiado.");
                        } catch {}
                      }}
                      aria-label="Compartir negocio"
                    >
                      ↗
                    </button>
                  </section>
                )}

                <nav
                  className={`kp-profile-tabs ${
                    mostrarCabeceraCompacta ? "with-compact" : ""
                  }`}
                >
                  {[
                    ["servicios", perfilGimnasio ? "Clases" : "Servicios"],
                    ["equipo", perfilGimnasio ? "Instructores" : "Equipo"],
                    ["resenas", "Reseñas"],
                  ].map(([codigo, label]) => (
                    <button
                      key={codigo}
                      type="button"
                      className={tabPortal === codigo ? "active" : ""}
                      onClick={() => setTabPortal(codigo)}
                    >
                      {label}
                    </button>
                  ))}
                </nav>

                {tabPortal === "servicios" && (
                  <div className="kp-profile-section">
                    {descripcionNegocio && (
                      <section className="kp-about">
                        <span className="kp-section-kicker">SOBRE NOSOTROS</span>
                        <h2>Conoce {nombreNegocio}</h2>
                        <p>{descripcionNegocio}</p>
                      </section>
                    )}

                    {cargandoServicios || cargandoHorarios ? (
                      <div className="kp-empty">
                        Consultando servicios...
                      </div>
                    ) : servicios.length === 0 ? (
                      <div className="kp-empty">
                        <strong>
                          {perfilGimnasio
                            ? "No hay clases disponibles hoy."
                            : "No hay servicios activos disponibles."}
                        </strong>
                      </div>
                    ) : (
                      <>
                        <section className="kp-popular-section">
                          <div className="kp-popular-heading">
                            <div>
                              <span className="kp-section-kicker">MÁS RESERVADOS</span>
                              <h2>Lo más pedido aquí</h2>
                            </div>

                            <button
                              type="button"
                              className="kp-view-all"
                              onClick={() =>
                                document
                                  .getElementById("todos-los-servicios")
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  })
                              }
                            >
                              Ver todos <span>→</span>
                            </button>
                          </div>

                          <div className="kp-popular-list">
                            {serviciosMasPedidos.map((servicio, index) => (
                              <article
                                key={`popular-${servicio.id}`}
                                className={`kp-popular-card ${
                                  index === 0 ? "first" : ""
                                }`}
                              >
                                <div className="kp-rank-badge">
                                  N.º {index + 1} EN RESERVAS
                                </div>

                                <div className="kp-popular-media">
                                  {servicio.imagenUrl ? (
                                    <img
                                      src={servicio.imagenUrl}
                                      alt={servicio.nombre}
                                    />
                                  ) : (
                                    <div className="kp-popular-placeholder">
                                      {perfilGimnasio ? "◉" : "✦"}
                                    </div>
                                  )}

                                  <div className="kp-executed-chip">
                                    <span>✓</span>
                                    <strong>
                                      {formatoEntero(servicio.citasEjecutadas)}
                                    </strong>
                                    <small>citas ejecutadas</small>
                                  </div>
                                </div>

                                <div className="kp-popular-info">
                                  <strong className="kp-popular-name">
                                    {servicio.nombre}
                                  </strong>

                                  <span className="kp-popular-meta">
                                    {servicio.duracion} min
                                  </span>

                                  {servicio.requierePago && (
                                    <div className="kp-popular-price">
                                      <small>Precio desde</small>
                                      <strong>
                                        {dinero(servicio.precio)}
                                      </strong>
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => elegirServicio(servicio)}
                                  >
                                    Reservar
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        </section>

                        <section
                          id="todos-los-servicios"
                          className="kp-all-services"
                        >
                          <div className="kp-all-services-title">
                            <div>
                              <span className="kp-section-kicker">
                                CATÁLOGO COMPLETO
                              </span>
                              <h2>
                                {perfilGimnasio
                                  ? "Todas las clases"
                                  : "Todos los servicios"}
                              </h2>
                            </div>

                            <span className="kp-service-total">
                              {servicios.length}
                            </span>
                          </div>

                          <div className="kp-service-list kp-public-services">
                            {servicios.map((servicio) => (
                              <article
                                key={servicio.id}
                                className="kp-service kp-public-service"
                              >
                                {servicio.imagenUrl ? (
                                  <div className="kp-service-image">
                                    <img
                                      src={servicio.imagenUrl}
                                      alt={servicio.nombre}
                                    />
                                  </div>
                                ) : (
                                  <div className="kp-service-icon">
                                    {perfilGimnasio ? "●" : "✦"}
                                  </div>
                                )}

                                <div className="kp-service-info">
                                  <strong>{servicio.nombre}</strong>

                                  <span>
                                    {servicio.duracion} min
                                    {servicio.citasEjecutadas > 0
                                      ? ` · ${formatoEntero(
                                          servicio.citasEjecutadas
                                        )} citas ejecutadas`
                                      : ""}
                                  </span>

                                  {servicio.descripcion && (
                                    <small>{servicio.descripcion}</small>
                                  )}

                                  {servicio.requierePago && (
                                    <b>{dinero(servicio.precio)}</b>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => elegirServicio(servicio)}
                                >
                                  Reservar
                                </button>
                              </article>
                            ))}
                          </div>
                        </section>
                      </>
                    )}
                  </div>
                )}

                {tabPortal === "equipo" && (
                  <div className="kp-profile-section">
                    <span className="kp-section-kicker">
                      {perfilGimnasio ? "INSTRUCTORES" : "NUESTRO EQUIPO"}
                    </span>
                    <h2>
                      {perfilGimnasio
                        ? "Conoce a quienes te acompañan"
                        : "Profesionales del negocio"}
                    </h2>
                    <p className="kp-muted">
                      Elige un servicio al reservar y podrás seleccionar
                      quién deseas que te atienda.
                    </p>

                    {cargandoEquipoPortal ? (
                      <div className="kp-empty">Consultando equipo...</div>
                    ) : equipoPortal.length === 0 ? (
                      <div className="kp-empty">
                        El negocio todavía no tiene perfiles públicos disponibles.
                      </div>
                    ) : (
                      <div className="kp-team-grid">
                        {equipoPortal.map((prof) => (
                          <article key={prof.id} className="kp-team-card">
                            <div className="kp-team-photo">
                              {prof.fotoUrl ? (
                                <img src={prof.fotoUrl} alt={prof.nombre} />
                              ) : (
                                <span>{inicialNombre(prof.nombre)}</span>
                              )}
                            </div>

                            <div>
                              <strong>{prof.nombre}</strong>
                              <span>{prof.especialidad}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tabPortal === "resenas" && (
                  <div className="kp-profile-section">
                    <span className="kp-section-kicker">RESEÑAS</span>
                    <h2>Opiniones de clientes</h2>

                    <div className="kp-reviews-empty">
                      <div className="kp-reviews-icon">★</div>
                      <strong>Reseñas verificadas próximamente</strong>
                      <p>
                        KONAX mostrará aquí únicamente reseñas reales del negocio.
                        No se publican calificaciones inventadas.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="kp-business-window kp-booking-mini-business">
                  <div className="kp-business-logo-box">
                    {logoNegocio ? (
                      <img
                        src={logoNegocio}
                        alt={nombreNegocio}
                        className="kp-business-logo"
                      />
                    ) : (
                      <span className="kp-business-placeholder">
                        {inicialNombre(nombreNegocio)}
                      </span>
                    )}
                  </div>

                  <div className="kp-business-window-info">
                    <strong>{nombreNegocio}</strong>
                    <span>
                      {servicioSeleccionado?.nombre ||
                        (perfilGimnasio ? "Reserva de clase" : "Reserva de cita")}
                    </span>
                  </div>
                </div>

                <Stepper paso={paso} gimnasio={perfilGimnasio} />
              </>
            )}

            {paso === 2 && servicioSeleccionado && (
              <div>
                <button
                  type="button"
                  className="kp-blue-link"
                  onClick={() => setPaso(1)}
                >
                  {perfilGimnasio ? "‹ Cambiar clase" : "‹ Cambiar servicio"}
                </button>

                <span className="kp-eyebrow-dark">
                  PASO 2 DE 4
                </span>

                <h2>{perfilGimnasio ? "Seleccionar instructor" : "Seleccionar profesional"}</h2>

                <ServicioResumen servicio={servicioSeleccionado} />

                <div className="kp-prof-list">
                  <button
                    type="button"
                    className="kp-prof"
                    onClick={() =>
                      elegirProfesional("sin-preferencia")
                    }
                  >
                    <span className="kp-avatar">↝</span>

                    <span className="kp-prof-info">
                      <strong>
                        {perfilGimnasio
                          ? "Cualquier instructor"
                          : "Cualquier profesional"}
                      </strong>
                      <small>
                        {perfilGimnasio
                          ? "KONAX te muestra la mejor disponibilidad"
                          : "KONAX asigna una opción disponible"}
                      </small>
                    </span>

                    <span className="kp-select">
                      Seleccionar
                    </span>
                  </button>

                  {cargandoProfesionales ? (
                    <div className="kp-prof-loading">
                      Consultando profesionales...
                    </div>
                  ) : (
                    profesionales.map((profesional) => (
                      <button
                        key={
                          profesional.profesionalId ||
                          profesional.id
                        }
                        type="button"
                        className="kp-prof"
                        onClick={() =>
                          elegirProfesional(
                            profesional.id
                          )
                        }
                      >
                        <span className="kp-avatar">
                          {profesional.fotoUrl ? (
                            <img
                              src={profesional.fotoUrl}
                              alt={profesional.nombre}
                              className="kp-avatar-img"
                            />
                          ) : (
                            inicialNombre(
                              profesional.nombre
                            )
                          )}
                        </span>

                        <span className="kp-prof-info">
                          <strong>
                            {profesional.nombre}
                          </strong>
                          <small>
                            {profesional.especialidad ||
                              (perfilBelleza
                                ? "Profesional"
                                : "Instructor")}
                          </small>
                        </span>

                        <span className="kp-select">
                          Seleccionar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {paso === 3 && servicioSeleccionado && (
              <div>
                <button
                  type="button"
                  className="kp-blue-link"
                  onClick={() => setPaso(2)}
                >
                  {perfilGimnasio ? "‹ Cambiar instructor" : "‹ Cambiar profesional"}
                </button>

                <span className="kp-eyebrow-dark">
                  PASO 3 DE 4
                </span>

                <h2>Seleccionar fecha y hora</h2>

                <div className="kp-booking-head">
                  <div className="kp-booking-business">
                    <div className="kp-mini-avatar">
                      {profesionalSeleccionado === "sin-preferencia"
                        ? "↝"
                        : inicialNombre(profesionalResumen)}
                    </div>

                    <div>
                      <strong>{profesionalResumen}</strong>
                      <small>
                        {servicioSeleccionado.nombre} ·{" "}
                        {servicioSeleccionado.duracion} min
                        {servicioSeleccionado.requierePago
                          ? ` · ${dinero(servicioSeleccionado.precio)}`
                          : ""}
                      </small>
                    </div>
                  </div>
                </div>

                <div className="kp-date-strip-wrap">
                  <div className="kp-date-strip">
                    {dias.map((dia) => {
                      const activo = dia === fecha;
                      const d = new Date(`${dia}T12:00:00`);

                      return (
                        <button
                          key={dia}
                          type="button"
                          className={`kp-date-pill ${
                            activo ? "active" : ""
                          } ${
                            fechasConDisponibilidad.includes(dia)
                              ? "available"
                              : ""
                          }`}
                          onClick={() => elegirFecha(dia)}
                        >
                          <span>
                            {new Intl.DateTimeFormat("es-PA", {
                              weekday: "short",
                            }).format(d)}
                          </span>

                          <strong>{d.getDate()}</strong>

                          <span>
                            {new Intl.DateTimeFormat("es-PA", {
                              month: "short",
                            }).format(d)}
                          </span>

                          <i
                            className="kp-date-dot"
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="kp-time-heading">
                  <div>
                    <span className="kp-section-kicker">HORARIOS DISPONIBLES</span>
                    <h3 className="kp-time-title">Elige la hora que prefieras</h3>
                  </div>

                  <span className="kp-date-caption">
                    {fechaCorta(fecha)}
                  </span>
                </div>

                {cargandoHorarios ? (
                  <div className="kp-empty">
                    Consultando horarios...
                  </div>
                ) : slotsDisponibles.length === 0 ? (
                  <div className="kp-empty">
                    {profesionalSeleccionado ===
                    "sin-preferencia"
                      ? "No hay horas disponibles para esta fecha."
                      : "Este profesional no tiene horas disponibles para esta fecha. Puedes elegir otra fecha o volver y seleccionar otro profesional."}
                  </div>
                ) : (
                  <>
                    <div className="kp-period-tabs">
                      {[
                        ["manana", "Mañana"],
                        ["tarde", "Tarde"],
                        ["noche", "Noche"],
                      ].map(([codigo, label]) => {
                        const cantidad =
                          slotsPorFranja[codigo]?.length || 0;

                        return (
                          <button
                            key={codigo}
                            type="button"
                            className={
                              franjaHorario === codigo
                                ? "active"
                                : ""
                            }
                            onClick={() => {
                              setFranjaHorario(codigo);
                              setHorarioSeleccionado(null);
                            }}
                          >
                            <span>{label}</span>
                            <b>{cantidad}</b>
                          </button>
                        );
                      })}
                    </div>

                    {slotsFranjaVisible.length === 0 ? (
                      <div className="kp-period-empty">
                        No hay horarios disponibles en esta franja.
                      </div>
                    ) : (
                      <>
                        <div className="kp-slot-count">
                          <strong>
                            {slotsFranjaVisible.length}{" "}
                            {slotsFranjaVisible.length === 1
                              ? "horario disponible"
                              : "horarios disponibles"}
                          </strong>
                          <span>
                            Duración {servicioSeleccionado.duracion} min
                          </span>
                        </div>

                        <div className="kp-time-cards">
                          {slotsFranjaVisible.map((slot) => {
                            const activo =
                              claveSlot(horarioSeleccionado) ===
                              claveSlot(slot);

                            return (
                              <button
                                key={claveSlot(slot)}
                                type="button"
                                className={`kp-time-card ${
                                  activo ? "active" : ""
                                }`}
                                onClick={() =>
                                  setHorarioSeleccionado(slot)
                                }
                              >
                                {formatoHora(slot.hora_inicio)}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}

                {horarioSeleccionado && (
                  <div className="kp-continue-fixed">
                    <div className="kp-continue-summary">
                      <span>RESUMEN</span>
                      <strong>
                        {servicioSeleccionado.requierePago
                          ? dinero(servicioSeleccionado.precio)
                          : `${servicioSeleccionado.duracion} min`}
                      </strong>
                      <small>
                        {formatoHora(horarioSeleccionado.hora_inicio)}
                        {" · "}
                        {profesionalResumen}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="kp-continue-action"
                      onClick={continuarFechaHora}
                    >
                      Siguiente <b>›</b>
                    </button>
                  </div>
                )}
              </div>
            )}

            {paso === 4 &&
              servicioSeleccionado &&
              horarioSeleccionado && (
                <div>
                  <button
                    type="button"
                    className="kp-blue-link"
                    onClick={() => setPaso(3)}
                  >
                    ‹ Cambiar fecha u hora
                  </button>

                  <span className="kp-eyebrow-dark">
                    PASO 4 DE 4
                  </span>

                  <h2>Completa tu reserva</h2>

                  <div className="kp-summary">
                    <ResumenFila
                      label="Negocio"
                      value={nombreNegocio}
                    />
                    <ResumenFila
                      label={perfilGimnasio ? "Clase" : "Servicio"}
                      value={servicioSeleccionado.nombre}
                    />
                    <ResumenFila
                      label={perfilGimnasio ? "Instructor" : "Profesional"}
                      value={profesionalResumen}
                    />
                    <ResumenFila
                      label="Duración"
                      value={`${servicioSeleccionado.duracion} min`}
                    />
                    <ResumenFila
                      label="Fecha"
                      value={formatoFecha(fecha)}
                    />
                    <ResumenFila
                      label="Hora"
                      value={formatoHora(
                        horarioSeleccionado.hora_inicio
                      )}
                    />

                    {servicioSeleccionado.requierePago && (
                      <ResumenFila
                        label="Precio"
                        value={dinero(servicioSeleccionado.precio)}
                        destacado
                      />
                    )}
                  </div>

                  <div className="kp-note">
                    Revisa los detalles y completa tus datos para confirmar.
                  </div>

                  <form
                    className="kp-form"
                    onSubmit={confirmarReserva}
                  >
                    <label>
                      <span>Nombre completo</span>
                      <input
                        value={nombre}
                        onChange={(e) =>
                          setNombre(e.target.value)
                        }
                        placeholder="Nombre del cliente"
                      />
                    </label>

                    <label>
                      <span>WhatsApp / teléfono</span>
                      <input
                        value={telefono}
                        onChange={(e) =>
                          setTelefono(e.target.value)
                        }
                        placeholder="+507 6000-0000"
                      />
                    </label>

                    <label>
                      <span>Observaciones (opcional)</span>
                      <textarea
                        value={observaciones}
                        onChange={(e) =>
                          setObservaciones(e.target.value)
                        }
                        placeholder="Alguna indicación para el negocio"
                      />
                    </label>

                    <button
                      className="kp-confirm"
                      disabled={guardando}
                    >
                      {guardando
                        ? "Reservando..."
                        : "Confirmar reserva"}
                    </button>
                  </form>
                </div>
              )}

            {paso === 5 && reservaConfirmada && (
              <div
                id="confirmacion-cita"
                className="kp-success"
              >
                <div className="kp-check">✓</div>

                <span className="kp-eyebrow-dark">
                  RESERVA CONFIRMADA
                </span>

                <h2>{perfilGimnasio ? "Tu clase quedó reservada" : "Tu cita quedó registrada"}</h2>

                <p>
                  {reservaConfirmada.servicio}
                  <br />
                  {formatoFecha(reservaConfirmada.fecha)}
                  <br />
                  {formatoHora(
                    reservaConfirmada.hora_inicio
                  )}{" "}
                  –{" "}
                  {formatoHora(
                    reservaConfirmada.hora_fin
                  )}
                </p>

                {perfilGimnasio && (
                  <div className="kp-wod-wrap">
                    {cargandoWod ? (
                      <div className="kp-info">Consultando WOD...</div>
                    ) : wodPublico?.ok ? (
                      <WodPublico wod={wodPublico} />
                    ) : (
                      <div className="kp-wod-locked">
                        <strong>WOD</strong>
                        <span>
                          El entrenamiento todavía no está publicado.
                          Aparecerá aquí cuando el coach lo habilite.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {reservaConfirmada.requiere_pago && (
                  <div className="kp-info">
                    Pago en el local:{" "}
                    {dinero(reservaConfirmada.monto)}
                  </div>
                )}

                {tokenGestion && (
                  <button
                    type="button"
                    className="kp-confirm"
                    onClick={() =>
                      (window.location.href =
                        `/reservar/${slug}?cita=${tokenGestion}`)
                    }
                  >
                    Ver mi cita
                  </button>
                )}

                <button
                  type="button"
                  className="kp-secondary"
                  onClick={reiniciarFlujo}
                >
                  + Reservar otra cita
                </button>

                <button
                  type="button"
                  className="kp-link"
                  onClick={() =>
                    (window.location.href = `/reservar/${slug}`)
                  }
                >
                  Volver al portal
                </button>
              </div>
            )}
          </section>
        )}

        {!(paso === 3 && horarioSeleccionado) && (
        <nav className="kp-bottom-nav">
          <button
            type="button"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
          >
            <span>⌂</span>
            <small>Inicio</small>
          </button>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("flujo-reserva")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
          >
            <span>▣</span>
            <small>{perfilGimnasio ? "Clases" : "Reservar"}</small>
          </button>

          <button
            type="button"
            onClick={abrirMiCita}
          >
            <span>▤</span>
            <small>{perfilGimnasio ? "Mi reserva" : "Mi cita"}</small>
          </button>
        </nav>
        )}

        {mostrarAvisoMiCita && (
          <div
            className="kp-modal-overlay"
            onClick={() => setMostrarAvisoMiCita(false)}
          >
            <div
              className="kp-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="kp-modal-icon">▤</div>

              <span className="kp-eyebrow-dark">
                {perfilGimnasio ? "MI RESERVA" : "MI CITA"}
              </span>

              <h3>
                {perfilGimnasio
                  ? "Aún no tienes una reserva guardada"
                  : "Aún no tienes una cita guardada"}
              </h3>

              <p>
                Cuando completes una reserva en este teléfono,
                KONAX guardará el acceso para que puedas volver
                directamente desde{" "}
                {perfilGimnasio ? "“Mi reserva”." : "“Mi cita”."}
              </p>

              <button
                type="button"
                className="kp-confirm"
                onClick={() => {
                  setMostrarAvisoMiCita(false);
                  document
                    .getElementById("flujo-reserva")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                }}
              >
                Reservar ahora
              </button>

              <button
                type="button"
                className="kp-link"
                onClick={() => setMostrarAvisoMiCita(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        <footer className="kp-footer">
          <img src="/konax-logo.png" alt="KONAX" />
          <span>Reservas por KONAX · {VERSION}</span>
        </footer>
      </div>
    </main>
  );
}

function Stepper({ paso, gimnasio = false }) {
  const pasos = gimnasio
    ? [
        [1, "Clase"],
        [2, "Instructor"],
        [3, "Fecha y hora"],
        [4, "Confirmación"],
      ]
    : [
        [1, "Servicio"],
        [2, "Profesional"],
        [3, "Fecha y hora"],
        [4, "Confirmación"],
      ];

  return (
    <div className="kp-stepper">
      {pasos.map(([numero, label], index) => (
        <div
          key={numero}
          className="kp-step-item"
        >
          <div className="kp-step-top">
            <span
              className={[
                "kp-step-circle",
                paso === numero ? "active" : "",
                paso > numero ? "done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {paso > numero ? "✓" : numero}
            </span>

            {index < pasos.length - 1 && (
              <span
                className={[
                  "kp-step-line",
                  paso > numero ? "done" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            )}
          </div>

          <small
            className={
              paso >= numero ? "active" : ""
            }
          >
            {label}
          </small>
        </div>
      ))}
    </div>
  );
}


function WodPublico({ wod }) {
  if (!wod?.ok) return null;

  const bloques = [
    ["Warm-up", wod.warmup],
    ["Strength", wod.strength],
    ["Skill", wod.skill],
    ["Metcon", wod.metcon],
    ["Cooldown", wod.cooldown],
  ].filter(([, valor]) => Boolean(valor));

  return (
    <div className="kp-wod">
      <span className="kp-wod-eyebrow">WORKOUT OF THE DAY</span>
      <h3>{wod.titulo || "WOD del día"}</h3>

      {wod.servicio && (
        <div className="kp-wod-program">{wod.servicio}</div>
      )}

      <div className="kp-wod-blocks">
        {bloques.map(([titulo, valor]) => (
          <div
            key={titulo}
            className={`kp-wod-block ${
              titulo === "Metcon" ? "accent" : ""
            }`}
          >
            <span>{titulo}</span>
            <strong>{valor}</strong>
          </div>
        ))}
      </div>

      {wod.notas_publicas && (
        <div className="kp-wod-note">
          <span>Nota del coach</span>
          <strong>{wod.notas_publicas}</strong>
        </div>
      )}
    </div>
  );
}

function ServicioResumen({ servicio }) {
  if (!servicio) return null;

  return (
    <div className="kp-selected-service">
      <strong>{servicio.nombre}</strong>
      <span>
        {servicio.duracion} min
        {servicio.requierePago
          ? ` · ${dinero(servicio.precio)}`
          : ""}
      </span>
    </div>
  );
}

function ResumenFila({
  label,
  value,
  destacado = false,
}) {
  return (
    <div className="kp-summary-row">
      <span>{label}</span>
      <strong className={destacado ? "accent" : ""}>
        {value || "-"}
      </strong>
    </div>
  );
}

function Dato({ label, value }) {
  return (
    <div className="kp-data">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

const CSS = `
  * { box-sizing: border-box; }

  html, body {
    max-width: 100%;
    overflow-x: hidden;
  }

  body {
    margin: 0;
  }

  button, input, textarea {
    font: inherit;
  }

  button {
    -webkit-tap-highlight-color: transparent;
  }

  .kp-page {
    min-height: 100vh;
    padding-bottom: 150px;
    background: #f5f7f6;
    color: #152019;
    font-family: "Avenir Next", "Segoe UI Variable", "Segoe UI", Inter, system-ui, sans-serif;
  }

  .kp-shell {
    width: min(760px, 100%);
    margin: 0 auto;
    padding: 0 14px 28px;
  }

  .kp-topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    min-height: 66px;
    margin: 0 -14px 14px;
    padding: 10px 14px;
    display: grid;
    grid-template-columns: 42px 1fr auto;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #e1e7e3;
    background: rgba(255,255,255,.97);
    backdrop-filter: blur(12px);
  }

  .kp-back {
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 12px;
    background: #fff;
    font-size: 34px;
    line-height: 1;
    cursor: pointer;
  }

  .kp-top-logo {
    width: 92px;
    height: 34px;
    object-fit: contain;
    justify-self: center;
  }

  .kp-top-icons {
    display: flex;
    gap: 4px;
  }

  .kp-top-icons button {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 1px solid transparent;
    border-radius: 999px;
    background: #f1f4f2;
    color: #17211c;
    font-size: 14px;
    cursor: pointer;
  }

  .kp-top-icons button.active {
    border-color: #0b7041;
    background: #e8f5ed;
    color: #0b7041;
  }

  .kp-menu {
    position: absolute;
    top: 58px;
    right: 14px;
    z-index: 90;
    width: 190px;
    padding: 8px;
    display: grid;
    gap: 5px;
    border: 1px solid #dfe6e2;
    border-radius: 15px;
    background: #ffffff;
    box-shadow: 0 14px 34px rgba(20,38,28,.16);
  }

  .kp-menu button {
    min-height: 42px;
    padding: 0 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: #17211c;
    text-align: left;
    font-weight: 800;
    cursor: pointer;
  }

  .kp-menu button:hover {
    background: #f1f7f3;
  }

  .kp-hero {
    margin-bottom: 14px;
    padding: 20px;
    display: grid;
    grid-template-columns: minmax(0,1fr) auto;
    align-items: center;
    gap: 14px;
    border-radius: 22px;
    color: #fff;
    background: linear-gradient(135deg,#073a29,#0e7042);
  }

  .kp-hero h1 {
    margin: 7px 0;
    font-size: clamp(27px,7vw,42px);
    line-height: 1.03;
  }

  .kp-hero p {
    margin: 0;
    color: #d9ede2;
    font-size: 14px;
    line-height: 1.45;
  }

  .kp-hero img {
    width: 106px;
    min-height: 72px;
    padding: 9px;
    object-fit: contain;
    border-radius: 18px;
    background: #fff;
  }

  .kp-eyebrow,
  .kp-eyebrow-dark {
    display: block;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.2px;
  }

  .kp-eyebrow { color: #74e1a5; }
  .kp-eyebrow-dark { color: #0b7041; }

  .kp-flow,
  .kp-manage {
    padding: 16px;
    border: 1px solid #dfe6e2;
    border-radius: 22px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(20,38,28,.05);
  }

  .kp-flow h2,
  .kp-manage h2 {
    margin: 5px 0 8px;
    font-size: clamp(24px,6vw,32px);
    line-height: 1.08;
  }

  .kp-muted {
    margin: 0 0 14px;
    color: #6b7770;
    font-size: 13px;
  }

  .kp-business-window {
    margin: 4px 0 18px;
    padding: 15px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #dfe6e2;
    border-radius: 17px;
    background: #ffffff;
    box-shadow: 0 5px 14px rgba(20,38,28,.04);
  }

  .kp-business-logo-box {
    width: 58px;
    height: 58px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 1px solid #e5ebe7;
    border-radius: 14px;
    background: #ffffff;
    overflow: hidden;
  }

  .kp-business-logo {
    width: 50px;
    height: 44px;
    object-fit: contain;
  }

  .kp-business-placeholder {
    font-size: 27px;
    line-height: 1;
  }

  .kp-business-window-info {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .kp-business-window-info strong {
    color: #17211c;
    font-size: 19px;
    line-height: 1.2;
  }

  .kp-business-window-info span {
    color: #6f7c74;
    font-size: 13px;
  }

  .kp-stepper {
    margin-bottom: 22px;
    padding: 18px 16px 14px;
    display: grid;
    grid-template-columns: repeat(4,minmax(0,1fr));
    gap: 0;
    border: 1px solid #e1e7e3;
    border-radius: 18px;
    background: #f8faf9;
  }

  .kp-step-item {
    min-width: 0;
    display: grid;
    justify-items: center;
    gap: 7px;
  }

  .kp-step-top {
    width: 100%;
    display: flex;
    align-items: center;
  }

  .kp-step-circle {
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #e7ece9;
    color: #5e6963;
    font-size: 13px;
    font-weight: 900;
    position: relative;
    z-index: 2;
  }

  .kp-step-line {
    height: 3px;
    flex: 1;
    margin: 0 8px;
    border-radius: 999px;
    background:
      radial-gradient(circle, #9aa59f 1.4px, transparent 1.6px)
      center / 9px 3px repeat-x;
    opacity: .7;
  }

  .kp-step-line.done {
    background: #0b7041;
    opacity: 1;
  }

  .kp-step-circle.active {
    background: linear-gradient(145deg,#0b7041,#14a35f);
    color: #fff;
    box-shadow: 0 6px 14px rgba(11,112,65,.24);
  }

  .kp-step-circle.done {
    background: #dff3e7;
    color: #0b7041;
  }

  .kp-stepper small {
    color: #7d8882;
    font-size: 9px;
    font-weight: 850;
    text-align: center;
    line-height: 1.2;
  }

  .kp-stepper small.active {
    color: #0b7041;
  }

  .kp-service-list,
  .kp-prof-list,
  .kp-times,
  .kp-form,
  .kp-cancel-box {
    display: grid;
    gap: 11px;
  }

  .kp-service {
    padding: 12px;
    display: grid;
    grid-template-columns: 96px minmax(0,1fr) auto;
    gap: 12px;
    align-items: center;
    border: 1px solid #dbe4df;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 5px 14px rgba(20,38,28,.04);
    overflow: hidden;
  }

  .kp-service-image {
    width: 96px;
    height: 82px;
    overflow: hidden;
    border-radius: 14px;
    background: #eef2ef;
    border: 1px solid #e2e8e4;
  }

  .kp-service-image img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .kp-service-icon,
  .kp-avatar,
  .kp-mini-avatar {
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #eaf5ef;
    color: #0b7041;
    font-weight: 900;
  }

  .kp-service-icon {
    width: 54px;
    height: 54px;
    color: #fff;
    background: linear-gradient(145deg,#07834b,#13a95f);
    box-shadow: 0 7px 16px rgba(11,112,65,.22);
    font-size: 24px;
  }

  .kp-service-info {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .kp-service-info strong {
    color: #17211c;
    font-size: 17px;
    line-height: 1.15;
  }

  .kp-service-info span,
  .kp-service-info small {
    color: #6f7b74;
    font-size: 12px;
  }

  .kp-service-info b {
    color: #0b7041;
    font-size: 14px;
    font-weight: 900;
  }

  .kp-service > button,
  .kp-select {
    min-width: 86px;
    min-height: 38px;
    padding: 0 12px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 999px;
    background: #0b7041;
    color: #fff;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .kp-blue-link,
  .kp-link {
    padding: 0;
    border: 0;
    background: transparent;
    color: #3564c4;
    font-weight: 800;
    cursor: pointer;
  }

  .kp-selected-service,
  .kp-prof-summary {
    margin: 12px 0 15px;
    padding: 13px;
    display: grid;
    gap: 4px;
    border-radius: 15px;
    background: #f8faf9;
  }

  .kp-prof {
    width: 100%;
    padding: 13px;
    display: grid;
    grid-template-columns: 52px minmax(0,1fr) auto;
    gap: 11px;
    align-items: center;
    border: 1px solid #dfe5e2;
    border-radius: 18px;
    background: #fff;
    color: #17211c;
    text-align: left;
    cursor: pointer;
  }

  .kp-avatar {
    width: 50px;
    height: 50px;
    font-size: 18px;
    overflow: hidden;
  }

  .kp-avatar-img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .kp-prof-loading {
    padding: 16px;
    border: 1px dashed #d5ddd8;
    border-radius: 15px;
    background: #fafcfb;
    color: #748078;
    text-align: center;
    font-size: 12px;
  }

  .kp-prof-info {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .kp-prof-info small {
    color: #6c7871;
  }

  .kp-select {
    min-width: 88px;
    min-height: 34px;
    border: 1px solid #d7deda;
    background: #fff;
    color: #303b35;
  }

  .kp-prof-summary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #e0e6e3;
    background: #fff;
  }

  .kp-mini-avatar {
    width: 30px;
    height: 30px;
  }

  .kp-flow h3 {
    margin: 18px 0 10px;
    font-size: 17px;
  }


  .kp-booking-head {
    margin: 12px 0 14px;
  }

  .kp-booking-business {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid #e0e6e3;
    border-radius: 16px;
    background: #ffffff;
  }

  .kp-booking-business > div:last-child {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .kp-booking-business strong {
    color: #17211c;
    font-size: 14px;
  }

  .kp-booking-business small {
    color: #6e7a73;
    font-size: 11px;
    line-height: 1.35;
  }

  .kp-date-strip-wrap {
    margin: 12px -16px 0;
    padding: 0 16px 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .kp-date-strip {
    display: flex;
    gap: 8px;
    width: max-content;
  }

  .kp-date-pill {
    min-width: 78px;
    height: 112px;
    padding: 8px 6px;
    display: grid;
    place-items: center;
    gap: 2px;
    border: 1px solid #dfe5e1;
    border-radius: 18px;
    background: #ffffff;
    color: #526058;
    cursor: pointer;
  }

  .kp-date-pill strong {
    font-size: 27px;
    line-height: 1;
    color: inherit;
  }

  .kp-date-pill span {
    font-size: 12px;
    text-transform: lowercase;
  }

  .kp-date-pill.active {
    border-color: #0b7041;
    background: #0b7041;
    color: #ffffff;
    box-shadow: 0 8px 18px rgba(11,112,65,.18);
  }

  .kp-date-dot {
    width: 6px;
    height: 6px;
    display: block;
    border-radius: 50%;
    background: transparent;
  }

  .kp-date-pill.available .kp-date-dot {
    background: #0b7041;
  }

  .kp-date-pill.active .kp-date-dot {
    background: #ffffff;
  }

  .kp-time-title {
    margin: 24px 0 12px !important;
    font-size: 20px !important;
    font-weight: 800;
  }

  .kp-time-cards {
    display: grid;
    gap: 12px;
    padding-bottom: 92px;
  }

  .kp-time-card {
    width: 100%;
    min-height: 78px;
    padding: 0 18px;
    display: flex;
    align-items: center;
    border: 1px solid #dfe4e1;
    border-radius: 18px;
    background: #ffffff;
    color: #17211c;
    font-size: 19px;
    text-align: left;
    cursor: pointer;
  }

  .kp-time-card.active {
    border: 2px solid #0b7041;
    background: #eef8f2;
    color: #0b7041;
    font-weight: 900;
  }

  .kp-continue-fixed {
    position: fixed;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    z-index: 95;
    width: min(620px, calc(100% - 34px));
    min-height: 66px;
    margin: 0;
    padding: 0 20px;
    border-radius: 18px;
    background: #171817;
    color: #ffffff;
    box-shadow: 0 12px 30px rgba(0,0,0,.24);
  }

  .kp-continue-detail {
    color: #d3d3d3;
    font-size: 15px;
    font-weight: 800;
  }

  .kp-continue-action {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #ffffff;
    font-size: 18px;
    font-weight: 900;
  }

  .kp-continue-action b {
    font-size: 29px;
    line-height: 1;
    font-weight: 400;
  }

  .kp-available-note {
    margin: -2px 0 10px;
    color: #6b7770;
    font-size: 11px;
  }

  .kp-days {
    padding-bottom: 6px;
    display: flex;
    gap: 9px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .kp-days button {
    min-width: 72px;
    min-height: 100px;
    padding: 9px 7px;
    display: grid;
    place-items: center;
    gap: 3px;
    border: 1px solid #dce3df;
    border-radius: 18px;
    background: #fff;
    color: #59645e;
    cursor: pointer;
  }

  .kp-days button strong {
    font-size: 24px;
  }

  .kp-days button.active {
    border-color: #171817;
    background: #171817;
    color: #fff;
  }

  .kp-times button {
    min-height: 68px;
    padding: 0 18px;
    display: flex;
    align-items: center;
    border: 1px solid #dfe4e1;
    border-radius: 17px;
    background: #fff;
    color: #1b231f;
    font-size: 18px;
    cursor: pointer;
  }

  .kp-times button.active {
    border: 2px solid #2f65c8;
    background: #f3f6ff;
    color: #2f65c8;
    font-weight: 900;
  }

  .kp-continue {
    width: 100%;
    min-height: 58px;
    margin-top: 15px;
    padding: 0 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 0;
    border-radius: 18px;
    background: #171817;
    color: #fff;
    cursor: pointer;
  }

  .kp-summary {
    margin: 13px 0;
    padding: 15px;
    display: grid;
    gap: 10px;
    border: 1px solid #edf0ee;
    border-radius: 18px;
    background: #fafbfa;
  }

  .kp-summary-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: #6c7771;
    font-size: 13px;
  }

  .kp-summary-row strong {
    color: #17211c;
    text-align: right;
  }

  .kp-summary-row strong.accent {
    color: #0b7041;
  }

  .kp-note,
  .kp-info,
  .kp-cancelled {
    margin: 12px 0;
    padding: 12px;
    border-radius: 13px;
    font-size: 12px;
    line-height: 1.4;
  }

  .kp-note {
    background: #fff8e7;
    color: #8a6414;
  }

  .kp-info {
    background: #eef5f1;
    color: #405147;
  }

  .kp-cancelled {
    background: #ffedec;
    color: #8a1c12;
  }

  .kp-form label,
  .kp-cancel-box label {
    display: grid;
    gap: 6px;
    color: #263129;
    font-size: 12px;
    font-weight: 800;
  }

  .kp-form input,
  .kp-form textarea,
  .kp-cancel-box input {
    width: 100%;
    min-height: 48px;
    padding: 10px 12px;
    border: 1px solid #cfd9d3;
    border-radius: 13px;
    background: #fff;
    color: #17211c;
    font-size: 16px;
  }

  .kp-form textarea {
    min-height: 82px;
    resize: vertical;
  }

  .kp-confirm,
  .kp-secondary,
  .kp-danger {
    width: 100%;
    min-height: 50px;
    border-radius: 14px;
    font-weight: 900;
    cursor: pointer;
  }

  .kp-confirm {
    border: 0;
    color: #fff;
    background: linear-gradient(180deg,#168c54,#0b7041);
  }

  .kp-secondary {
    margin-top: 10px;
    border: 1px solid #0b7041;
    background: #fff;
    color: #0b7041;
  }

  .kp-danger {
    border: 0;
    background: #b42318;
    color: #fff;
  }

  .kp-link {
    width: 100%;
    min-height: 42px;
    margin-top: 6px;
    color: #5d6962;
  }

  .kp-success {
    text-align: center;
  }

  .kp-check {
    width: 62px;
    height: 62px;
    margin: 6px auto 13px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #0b7041;
    color: #fff;
    font-size: 30px;
    font-weight: 900;
  }

  .kp-success p {
    color: #536159;
    line-height: 1.6;
  }

  .kp-manage {
    border: 2px solid #a7d7ba;
    background: #f0faf4;
  }

  .kp-data-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit,minmax(150px,1fr));
    gap: 9px;
  }

  .kp-data {
    padding: 11px;
    display: grid;
    gap: 4px;
    border: 1px solid #dce6e0;
    border-radius: 13px;
    background: #fff;
  }

  .kp-error,
  .kp-error-card {
    margin-bottom: 12px;
    padding: 12px;
    border: 1px solid #f2b8b3;
    border-radius: 13px;
    background: #fff1ef;
    color: #8a1c12;
  }

  .kp-empty-action {
    margin-top: 12px;
    min-height: 42px;
    padding: 0 14px;
    border: 0;
    border-radius: 12px;
    background: #0b7041;
    color: #ffffff;
    font-weight: 900;
    cursor: pointer;
  }

  .kp-empty {
    padding: 24px;
    border: 1px dashed #d5ddd8;
    border-radius: 15px;
    background: #fafcfb;
    color: #748078;
    text-align: center;
    font-size: 13px;
  }

  .kp-reserve-now {
    position: fixed;
    z-index: 80;
    left: 50%;
    bottom: 82px;
    transform: translateX(-50%);
    width: min(620px,calc(100% - 30px));
    min-height: 58px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 0;
    border-radius: 18px;
    color: #fff;
    background: linear-gradient(180deg,#168c54,#0b7041);
    box-shadow: 0 12px 30px rgba(11,112,65,.28);
    font-size: 18px;
    cursor: pointer;
  }

  .kp-bottom-nav {
    position: fixed;
    z-index: 70;
    left: 50%;
    bottom: 8px;
    transform: translateX(-50%);
    width: min(620px,calc(100% - 20px));
    min-height: 68px;
    padding: 8px 12px;
    display: grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 6px;
    border: 1px solid #e2e7e4;
    border-radius: 22px;
    background: rgba(255,255,255,.98);
    box-shadow: 0 8px 28px rgba(20,38,28,.10);
  }

  .kp-bottom-nav button {
    display: grid;
    place-items: center;
    gap: 2px;
    border: 0;
    background: transparent;
    color: #56625b;
    font-weight: 800;
    cursor: pointer;
  }

  .kp-bottom-nav button span {
    font-size: 20px;
  }

  .kp-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(8,14,11,.58);
    backdrop-filter: blur(3px);
  }

  .kp-modal {
    width: min(420px,100%);
    padding: 22px;
    border-radius: 22px;
    background: #ffffff;
    color: #17211c;
    box-shadow: 0 24px 60px rgba(0,0,0,.25);
    text-align: center;
  }

  .kp-modal-icon {
    width: 58px;
    height: 58px;
    margin: 0 auto 12px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #eaf5ef;
    color: #0b7041;
    font-size: 25px;
    font-weight: 900;
  }

  .kp-modal h3 {
    margin: 7px 0 8px;
    font-size: 21px;
  }

  .kp-modal p {
    margin: 0 0 16px;
    color: #66746c;
    font-size: 13px;
    line-height: 1.5;
  }


  .kp-wod-wrap {
    margin: 16px 0;
    text-align: left;
  }

  .kp-wod,
  .kp-wod-locked {
    padding: 16px;
    border: 1px solid #b9ddc8;
    border-radius: 18px;
    background: #f0faf4;
  }

  .kp-wod-eyebrow {
    display: block;
    color: #0b7041;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.1px;
  }

  .kp-wod h3 {
    margin: 5px 0 4px;
    color: #17211c;
    font-size: 22px;
  }

  .kp-wod-program {
    margin-bottom: 12px;
    color: #607068;
    font-size: 12px;
    font-weight: 800;
  }

  .kp-wod-blocks {
    display: grid;
    gap: 8px;
  }

  .kp-wod-block {
    padding: 11px 12px;
    display: grid;
    gap: 5px;
    border: 1px solid #dce7e1;
    border-radius: 12px;
    background: #ffffff;
  }

  .kp-wod-block.accent {
    border-color: #8fcaa8;
    background: #e8f7ee;
  }

  .kp-wod-block span,
  .kp-wod-note span {
    color: #0b7041;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .8px;
  }

  .kp-wod-block strong,
  .kp-wod-note strong {
    white-space: pre-wrap;
    color: #17211c;
    font-size: 13px;
    line-height: 1.45;
  }

  .kp-wod-note {
    margin-top: 9px;
    padding: 11px 12px;
    display: grid;
    gap: 5px;
    border-radius: 12px;
    background: #fff8e7;
  }

  .kp-wod-locked {
    display: grid;
    gap: 5px;
    color: #536159;
  }

  .kp-wod-locked strong {
    color: #0b7041;
  }

  .kp-dark .kp-wod,
  .kp-dark .kp-wod-locked {
    background: #102018;
    border-color: #28523a;
  }

  .kp-dark .kp-wod h3,
  .kp-dark .kp-wod-block strong,
  .kp-dark .kp-wod-note strong {
    color: #ffffff;
  }

  .kp-dark .kp-wod-block {
    background: #111b16;
    border-color: #2b3a32;
  }

  .kp-dark .kp-wod-block.accent {
    background: #153c29;
    border-color: #42d47f;
  }

  .kp-dark .kp-wod-program,
  .kp-dark .kp-wod-locked {
    color: #aeb9b2;
  }

  .kp-footer {
    padding: 18px 2px 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    color: #829088;
    font-size: 9px;
  }

  .kp-footer img {
    width: 74px;
    height: 28px;
    object-fit: contain;
  }

  .kp-loading {
    min-height: 100vh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 12px;
    background: #f5f7f6;
    color: #0b7041;
    font-family: Inter, system-ui, "Segoe UI", sans-serif;
  }





  /* =========================================================
     RANKING DE SERVICIOS + TIPOGRAFÍA PREMIUM
     ========================================================= */

  .kp-page {
    font-family:
      "Avenir Next",
      "Segoe UI Variable",
      "Segoe UI",
      Inter,
      system-ui,
      sans-serif;
    letter-spacing: -.012em;
  }

  .kp-cover h1,
  .kp-profile-section h2,
  .kp-popular-heading h2,
  .kp-all-services-title h2,
  .kp-flow h2 {
    font-weight: 800;
    letter-spacing: -.045em;
  }

  .kp-popular-section {
    margin-top: 6px;
  }

  .kp-popular-heading,
  .kp-all-services-title {
    margin-bottom: 15px;
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 14px;
  }

  .kp-popular-heading h2,
  .kp-all-services-title h2 {
    margin: 4px 0 0;
    color: #10261d;
    font-size: 29px;
    line-height: 1.02;
  }

  .kp-view-all {
    flex: 0 0 auto;
    padding: 7px 0;
    border: 0;
    background: transparent;
    color: #087a55;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }

  .kp-view-all span {
    margin-left: 3px;
    font-size: 17px;
  }

  .kp-popular-list {
    display: grid;
    gap: 14px;
  }

  .kp-popular-card {
    position: relative;
    min-height: 220px;
    padding: 12px;
    display: grid;
    grid-template-columns: 43% minmax(0,1fr);
    gap: 14px;
    overflow: hidden;
    border: 1px solid #dfe7e2;
    border-radius: 22px;
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(16,38,29,.045);
  }

  .kp-popular-card.first {
    border-color: #b9d9ca;
    box-shadow:
      0 10px 30px rgba(16,38,29,.055),
      inset 4px 0 0 #087a55;
  }

  .kp-rank-badge {
    position: absolute;
    z-index: 4;
    top: 12px;
    left: 12px;
    min-height: 31px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    border-radius: 10px 10px 10px 3px;
    background: #087a55;
    color: #ffffff;
    font-size: 9px;
    font-weight: 950;
    letter-spacing: .75px;
  }

  .kp-popular-card:not(.first) .kp-rank-badge {
    background: #66756d;
  }

  .kp-popular-media {
    position: relative;
    min-height: 196px;
    overflow: hidden;
    border-radius: 17px;
    background: #edf3ef;
  }

  .kp-popular-media > img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .kp-popular-placeholder {
    width: 100%;
    height: 100%;
    min-height: 196px;
    display: grid;
    place-items: center;
    background: #eaf5ef;
    color: #087a55;
    font-size: 42px;
  }

  .kp-executed-chip {
    position: absolute;
    left: 8px;
    bottom: 8px;
    max-width: calc(100% - 16px);
    padding: 7px 9px;
    display: grid;
    grid-template-columns: auto auto;
    align-items: center;
    column-gap: 5px;
    border: 1px solid rgba(255,255,255,.20);
    border-radius: 10px;
    background: rgba(12,25,19,.74);
    color: #ffffff;
    backdrop-filter: blur(8px);
  }

  .kp-executed-chip > span {
    grid-row: 1 / 3;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,.75);
    border-radius: 50%;
    font-size: 10px;
  }

  .kp-executed-chip strong {
    font-size: 14px;
    line-height: 1;
  }

  .kp-executed-chip small {
    color: rgba(255,255,255,.88);
    font-size: 8.5px;
    line-height: 1.1;
  }

  .kp-popular-info {
    min-width: 0;
    padding: 35px 2px 2px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .kp-popular-name {
    color: #10261d;
    font-size: 18px;
    font-weight: 900;
    line-height: 1.08;
  }

  .kp-popular-meta {
    margin-top: 7px;
    color: #68776f;
    font-size: 11px;
    font-weight: 700;
  }

  .kp-popular-price {
    margin-top: auto;
    padding-top: 18px;
    display: grid;
    gap: 2px;
  }

  .kp-popular-price small {
    color: #748078;
    font-size: 9px;
    font-weight: 750;
  }

  .kp-popular-price strong {
    color: #087a55;
    font-size: 20px;
    line-height: 1;
  }

  .kp-popular-info > button {
    width: 100%;
    min-height: 43px;
    margin-top: 12px;
    border: 0;
    border-radius: 14px;
    background: #087a55;
    color: #ffffff;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .kp-all-services {
    margin-top: 36px;
    scroll-margin-top: 150px;
  }

  .kp-service-total {
    min-width: 34px;
    height: 34px;
    padding: 0 9px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: #eaf7f1;
    color: #087a55;
    font-size: 11px;
    font-weight: 950;
  }

  .kp-dark .kp-popular-heading h2,
  .kp-dark .kp-all-services-title h2,
  .kp-dark .kp-popular-name {
    color: #ffffff;
  }

  .kp-dark .kp-popular-card {
    border-color: #2b3a32;
    background: #111b16;
  }

  .kp-dark .kp-service-total {
    background: #173c29;
    color: #75e2a4;
  }

  /* =========================================================
     PERFIL PÚBLICO DEL NEGOCIO · PORTADA + TABS
     ========================================================= */

  .kp-public-profile {
    margin: -18px;
    overflow: visible;
    border-radius: 24px;
    background: #ffffff;
  }

  /*
     SCROLL NATIVO REAL:
     portada + imagen forman un solo bloque del documento.
     Ninguna de las dos usa sticky/fixed.
     La cabecera blanca se crea únicamente al salir la portada.
  */
  .kp-cover {
    position: relative !important;
    top: auto !important;
    right: auto !important;
    bottom: auto !important;
    left: auto !important;
    min-height: 420px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    border-radius: 24px 24px 0 0;
    touch-action: pan-y;
    overscroll-behavior-y: auto;
    color: #ffffff;
    background:
      radial-gradient(circle at 80% 20%, rgba(48,182,127,.28), transparent 30%),
      linear-gradient(145deg,#0d3b2a,#081d15);
    background-position: center;
    background-size: cover;
  }

  .kp-cover-image {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    transform: none !important;
    will-change: auto;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .kp-cover-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        rgba(7,25,18,.08) 8%,
        rgba(7,25,18,.18) 42%,
        rgba(7,25,18,.86) 100%
      );
  }

  .kp-cover-top {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .kp-powered {
    padding: 7px 10px;
    border: 1px solid rgba(255,255,255,.22);
    border-radius: 999px;
    background: rgba(7,24,17,.32);
    color: rgba(255,255,255,.92);
    backdrop-filter: blur(9px);
    font-size: 10px;
    font-weight: 850;
    letter-spacing: .2px;
  }

  .kp-share {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,.35);
    border-radius: 50%;
    background: rgba(255,255,255,.92);
    color: #10261d;
    font-size: 21px;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0,0,0,.16);
  }

  .kp-cover-pattern {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
    overflow: hidden;
  }

  .kp-cover-pattern span {
    transform: rotate(-10deg);
    color: rgba(255,255,255,.055);
    font-size: 340px;
    font-weight: 950;
    line-height: 1;
  }

  .kp-cover-content {
    position: relative;
    z-index: 2;
    max-width: 560px;
    padding-top: 90px;
  }

  .kp-category-badge {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    margin-bottom: 12px;
    padding: 0 14px;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 999px;
    background: rgba(9,25,18,.52);
    color: #ffffff;
    backdrop-filter: blur(9px);
    font-size: 12px;
    font-weight: 800;
  }

  .kp-cover h1 {
    max-width: 560px;
    margin: 0 0 14px;
    color: #ffffff;
    font-size: clamp(34px,8vw,52px);
    line-height: .98;
    letter-spacing: -1.3px;
    text-shadow: 0 3px 18px rgba(0,0,0,.28);
  }

  .kp-profile-meta {
    max-width: 500px;
    margin-top: 9px;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    color: rgba(255,255,255,.96);
    font-size: 14px;
    font-weight: 650;
    line-height: 1.45;
    text-shadow: 0 2px 12px rgba(0,0,0,.24);
  }

  .kp-meta-icon {
    flex: 0 0 auto;
    font-size: 18px;
    line-height: 1.2;
  }

  .kp-map-link {
    width: fit-content;
    max-width: 100%;
    text-decoration: none;
    cursor: pointer;
  }

  .kp-map-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .kp-map-copy strong {
    color: #d7ffdf;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .1px;
  }

  .kp-scroll-identity {
    position: sticky;
    top: 66px;
    z-index: 22;
    min-height: 92px;
    padding: 16px 20px 13px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid #edf0ee;
    background: rgba(255,255,255,.985);
    backdrop-filter: blur(12px);
    animation: kpCompactIn .14s ease-out;
  }

  @keyframes kpCompactIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .kp-scroll-identity-main {
    min-width: 0;
  }

  .kp-scroll-identity h2 {
    margin: 0;
    color: #102b22;
    font-size: clamp(30px,7vw,44px);
    line-height: 1.04;
    letter-spacing: -1.1px;
    font-weight: 900;
  }

  .kp-scroll-location {
    margin-top: 10px;
    display: inline-flex;
    align-items: flex-start;
    gap: 7px;
    max-width: 100%;
    color: #64746c;
    text-decoration: none;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.4;
  }

  .kp-scroll-share {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: grid;
    place-items: center;
    border: 1px solid #dfe6e2;
    border-radius: 50%;
    background: #ffffff;
    color: #17382b;
    font-size: 20px;
    font-weight: 900;
    cursor: pointer;
  }

  .kp-profile-tabs {
    position: sticky;
    top: 66px;
    z-index: 15;
    min-height: 68px;
    padding: 0 18px;
    display: grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    align-items: stretch;
    border-bottom: 1px solid #e4e9e6;
    background: rgba(255,255,255,.97);
    backdrop-filter: blur(12px);
  }

  .kp-profile-tabs.with-compact {
    top: 158px;
  }

  .kp-profile-tabs button {
    position: relative;
    border: 0;
    background: transparent;
    color: #7a8780;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
  }

  .kp-profile-tabs button.active {
    color: #17352a;
  }

  .kp-profile-tabs button.active::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: 7px;
    width: 7px;
    height: 7px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: #16845f;
  }

  .kp-profile-section {
    padding: 28px 18px 24px;
  }

  .kp-profile-section > h2,
  .kp-about h2 {
    margin: 5px 0 12px;
    color: #10261d;
    font-size: clamp(26px,6.8vw,36px);
    line-height: 1.05;
    letter-spacing: -.7px;
  }

  .kp-about {
    margin-bottom: 34px;
  }

  .kp-about p {
    margin: 0;
    color: #55675e;
    font-size: 15px;
    line-height: 1.65;
  }

  .kp-section-title-row {
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .kp-section-title-row h2 {
    margin: 4px 0 0;
    color: #10261d;
    font-size: 26px;
    line-height: 1.1;
  }

  .kp-public-services {
    gap: 12px;
  }

  .kp-public-service {
    grid-template-columns: 106px minmax(0,1fr) auto;
    min-height: 130px;
    padding: 11px;
    border-radius: 20px;
    box-shadow: none;
  }

  .kp-public-service .kp-service-image {
    width: 106px;
    height: 106px;
    border-radius: 16px;
  }

  .kp-public-service .kp-service-info strong {
    font-size: 17px;
  }

  .kp-public-service .kp-service-info b {
    margin-top: 4px;
    color: #087a55;
    font-size: 15px;
  }

  .kp-public-service > button {
    min-width: 84px;
    min-height: 42px;
    border-radius: 14px;
  }

  .kp-team-grid {
    display: grid;
    grid-template-columns: repeat(2,minmax(0,1fr));
    gap: 12px;
  }

  .kp-team-card {
    min-width: 0;
    padding: 14px;
    display: grid;
    gap: 11px;
    border: 1px solid #dfe7e2;
    border-radius: 20px;
    background: #ffffff;
  }

  .kp-team-photo {
    width: 82px;
    height: 82px;
    overflow: hidden;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #eaf7f1;
    color: #087a55;
    font-size: 27px;
    font-weight: 950;
  }

  .kp-team-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .kp-team-card > div:last-child {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .kp-team-card strong {
    overflow: hidden;
    color: #10261d;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kp-team-card span {
    color: #728078;
    font-size: 12px;
  }

  .kp-reviews-empty {
    margin-top: 18px;
    padding: 26px 20px;
    display: grid;
    justify-items: center;
    gap: 8px;
    border: 1px solid #e0e8e3;
    border-radius: 22px;
    background: #f8faf9;
    text-align: center;
  }

  .kp-reviews-icon {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #fff8dd;
    color: #d8a400;
    font-size: 28px;
  }

  .kp-reviews-empty strong {
    color: #10261d;
    font-size: 16px;
  }

  .kp-reviews-empty p {
    max-width: 400px;
    margin: 0;
    color: #708078;
    font-size: 12px;
    line-height: 1.5;
  }

  .kp-booking-mini-business {
    margin-top: 0;
  }

  /* =========================================================
     KONAX PORTAL PREMIUM · 2026.09.02
     Diseño claro, sobrio y enfocado en conversión móvil.
     ========================================================= */

  .kp-page {
    background:
      radial-gradient(circle at 50% -120px, rgba(22,132,95,.08), transparent 340px),
      #f7f9f8;
    color: #10261d;
  }

  .kp-shell {
    width: min(720px, 100%);
    padding-left: 16px;
    padding-right: 16px;
  }

  .kp-topbar {
    min-height: 70px;
    margin-left: -16px;
    margin-right: -16px;
    padding-left: 16px;
    padding-right: 16px;
    border-bottom-color: rgba(16,38,29,.08);
    box-shadow: 0 6px 22px rgba(16,38,29,.04);
  }

  .kp-back {
    border: 1px solid #e3e9e5;
    color: #16372a;
    box-shadow: 0 3px 10px rgba(16,38,29,.04);
  }

  .kp-top-icons button {
    background: #f5f8f6;
    color: #335246;
  }

  .kp-top-icons button.active {
    border-color: #bcdccc;
    background: #eaf7f1;
    color: #087a55;
  }

  .kp-flow,
  .kp-manage {
    padding: 18px;
    border-color: #e1e8e4;
    border-radius: 24px;
    box-shadow: 0 16px 44px rgba(16,38,29,.055);
  }

  .kp-business-window {
    padding: 14px;
    border-color: #e4eae6;
    border-radius: 20px;
    box-shadow: none;
  }

  .kp-business-window-info strong {
    color: #10261d;
    font-size: 18px;
    font-weight: 850;
  }

  .kp-business-window-info span {
    color: #708078;
  }

  .kp-stepper {
    padding: 16px 12px 13px;
    border-color: #e5ebe7;
    border-radius: 20px;
    background: #fbfcfb;
  }

  .kp-step-circle.active {
    background: #087a55;
    box-shadow: 0 7px 18px rgba(8,122,85,.22);
  }

  .kp-step-circle.done {
    background: #e6f5ee;
    color: #087a55;
  }

  .kp-step-line.done {
    background: #16845f;
  }

  .kp-eyebrow-dark,
  .kp-section-kicker {
    color: #16845f;
  }

  .kp-flow h2,
  .kp-manage h2 {
    color: #10261d;
    font-weight: 900;
    letter-spacing: -.45px;
  }

  .kp-muted {
    color: #68786f;
    line-height: 1.5;
  }

  .kp-service {
    border-color: #e0e7e3;
    border-radius: 20px;
    box-shadow: 0 7px 22px rgba(16,38,29,.045);
  }

  .kp-service-info strong {
    color: #10261d;
    font-weight: 850;
  }

  .kp-service-info b {
    color: #087a55;
  }

  .kp-service > button {
    background: #087a55;
    box-shadow: 0 6px 14px rgba(8,122,85,.16);
  }

  .kp-blue-link,
  .kp-link {
    color: #16845f;
  }

  .kp-selected-service {
    border: 1px solid #dce9e2;
    background: #f5faf7;
  }

  .kp-prof {
    min-height: 84px;
    padding: 14px;
    border-color: #dfe7e2;
    border-radius: 20px;
    box-shadow: 0 5px 18px rgba(16,38,29,.035);
    transition:
      transform .16s ease,
      border-color .16s ease,
      box-shadow .16s ease,
      background .16s ease;
  }

  .kp-prof:hover,
  .kp-prof:focus-visible {
    transform: translateY(-1px);
    border-color: #9fd0b9;
    background: #fbfefc;
    box-shadow: 0 9px 24px rgba(16,38,29,.07);
    outline: none;
  }

  .kp-avatar {
    width: 54px;
    height: 54px;
    border: 2px solid #d8eee3;
    background: #ecf8f2;
    color: #087a55;
  }

  .kp-prof-info strong {
    color: #10261d;
    font-size: 15px;
    font-weight: 900;
  }

  .kp-prof-info small {
    color: #738078;
    line-height: 1.35;
  }

  .kp-select {
    min-width: 92px;
    border-color: #cfe4da;
    background: #f3faf6;
    color: #087a55;
  }

  .kp-booking-business {
    border-color: #e1e8e4;
    background: #fbfcfb;
  }

  .kp-date-strip-wrap {
    margin-top: 14px;
  }

  .kp-date-pill {
    min-width: 76px;
    height: 106px;
    border-color: #dfe7e2;
    color: #44584d;
    box-shadow: 0 4px 12px rgba(16,38,29,.025);
  }

  .kp-date-pill.active {
    border-color: #087a55;
    background: #087a55;
    box-shadow: 0 9px 22px rgba(8,122,85,.20);
  }

  .kp-date-pill.available:not(.active) .kp-date-dot {
    background: #27a574;
  }

  .kp-time-heading {
    margin: 24px 0 12px;
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
  }

  .kp-section-kicker {
    display: block;
    margin-bottom: 3px;
    font-size: 9px;
    font-weight: 950;
    letter-spacing: 1.2px;
  }

  .kp-time-title {
    margin: 0 !important;
    color: #10261d;
    font-size: 20px !important;
    line-height: 1.2;
  }

  .kp-date-caption {
    flex: 0 0 auto;
    padding: 6px 9px;
    border-radius: 999px;
    background: #f0f6f3;
    color: #567066;
    font-size: 10px;
    font-weight: 850;
    text-transform: capitalize;
  }

  .kp-period-tabs {
    margin: 0 0 16px;
    padding: 5px;
    display: grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 5px;
    border: 1px solid #dde6e1;
    border-radius: 17px;
    background: #f7faf8;
  }

  .kp-period-tabs button {
    min-width: 0;
    min-height: 52px;
    padding: 6px 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    border-radius: 13px;
    background: transparent;
    color: #617168;
    cursor: pointer;
  }

  .kp-period-tabs button span {
    font-size: 12px;
    font-weight: 900;
  }

  .kp-period-tabs button b {
    min-width: 23px;
    height: 23px;
    padding: 0 6px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: #e8eeea;
    color: #63736a;
    font-size: 10px;
  }

  .kp-period-tabs button.active {
    background: #087a55;
    color: #ffffff;
    box-shadow: 0 7px 16px rgba(8,122,85,.18);
  }

  .kp-period-tabs button.active b {
    background: rgba(255,255,255,.18);
    color: #ffffff;
  }

  .kp-period-empty {
    padding: 18px;
    border: 1px dashed #d8e1dc;
    border-radius: 16px;
    background: #fbfcfb;
    color: #75827b;
    text-align: center;
    font-size: 12px;
  }

  .kp-slot-count {
    margin: 2px 0 11px;
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
  }

  .kp-slot-count strong {
    color: #10261d;
    font-size: 14px;
  }

  .kp-slot-count span {
    color: #738078;
    font-size: 11px;
  }

  .kp-time-cards {
    grid-template-columns: repeat(2,minmax(0,1fr));
    gap: 10px;
    padding-bottom: 116px;
  }

  .kp-time-card {
    min-height: 62px;
    padding: 0 10px;
    justify-content: center;
    border-color: #dce5e0;
    border-radius: 15px;
    color: #173127;
    font-size: 16px;
    font-weight: 850;
    text-align: center;
    box-shadow: 0 4px 12px rgba(16,38,29,.025);
  }

  .kp-time-card.active {
    border: 1px solid #087a55;
    background: #eaf7f1;
    color: #087a55;
    box-shadow: inset 0 0 0 1px #087a55;
  }

  .kp-continue-fixed {
    position: fixed;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    z-index: 95;
    width: min(620px, calc(100% - 28px));
    min-height: 86px;
    margin: 0;
    padding: 12px 12px 12px 16px;
    display: grid;
    grid-template-columns: minmax(0,1fr) auto;
    align-items: center;
    gap: 12px;
    border: 1px solid #e0e7e3;
    border-radius: 22px;
    background: rgba(255,255,255,.98);
    color: #10261d;
    box-shadow: 0 14px 40px rgba(16,38,29,.16);
    backdrop-filter: blur(14px);
  }

  .kp-continue-summary {
    min-width: 0;
    display: grid;
    gap: 1px;
  }

  .kp-continue-summary > span {
    color: #728078;
    font-size: 8.5px;
    font-weight: 950;
    letter-spacing: 1px;
  }

  .kp-continue-summary > strong {
    color: #10261d;
    font-size: 21px;
    line-height: 1.1;
  }

  .kp-continue-summary > small {
    max-width: 220px;
    overflow: hidden;
    color: #66766d;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kp-continue-action {
    min-width: 132px;
    min-height: 58px;
    padding: 0 17px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border: 0;
    border-radius: 16px;
    background: #087a55;
    color: #ffffff;
    font-size: 15px;
    font-weight: 950;
    box-shadow: 0 8px 20px rgba(8,122,85,.22);
    cursor: pointer;
  }

  .kp-continue-action b {
    font-size: 23px;
    line-height: 1;
    font-weight: 500;
  }

  .kp-summary {
    padding: 16px;
    border-color: #e0e8e3;
    background: #f8faf9;
  }

  .kp-summary-row {
    padding: 2px 0;
  }

  .kp-summary-row strong.accent {
    color: #087a55;
  }

  .kp-note {
    background: #f0f7f3;
    color: #4f675b;
  }

  .kp-form {
    gap: 14px;
  }

  .kp-form label > span {
    color: #2d4439;
    font-size: 12px;
  }

  .kp-form input,
  .kp-form textarea,
  .kp-cancel-box input {
    min-height: 54px;
    padding-left: 14px;
    padding-right: 14px;
    border-color: #cfdad4;
    border-radius: 15px;
    color: #10261d;
    outline: none;
    transition:
      border-color .16s ease,
      box-shadow .16s ease;
  }

  .kp-form input:focus,
  .kp-form textarea:focus,
  .kp-cancel-box input:focus {
    border-color: #6cb696;
    box-shadow: 0 0 0 4px rgba(22,132,95,.10);
  }

  .kp-confirm {
    min-height: 56px;
    border-radius: 16px;
    background: #087a55;
    box-shadow: 0 8px 20px rgba(8,122,85,.18);
  }

  .kp-secondary {
    border-color: #9ccbb6;
    color: #087a55;
  }

  .kp-bottom-nav {
    border-color: #e1e8e4;
    background: rgba(255,255,255,.985);
    box-shadow: 0 10px 30px rgba(16,38,29,.10);
  }

  .kp-bottom-nav button {
    color: #607168;
  }

  .kp-bottom-nav button:focus-visible {
    color: #087a55;
    outline: none;
  }

  .kp-footer {
    color: #8b9891;
  }

  .kp-dark {
    background:
      radial-gradient(circle at top right, rgba(20,163,95,.08), transparent 30%),
      #08100c;
    color: #f5f7f6;
  }

  .kp-dark .kp-topbar {
    background: rgba(8,16,12,.97);
    border-color: #26332c;
  }

  .kp-dark .kp-flow,
  .kp-dark .kp-manage {
    background: #0f1713;
    color: #f5f7f6;
    border-color: #2a3931;
    box-shadow: 0 12px 30px rgba(0,0,0,.22);
  }

  .kp-dark .kp-business-window,
  .kp-dark .kp-business-logo-box,
  .kp-dark .kp-booking-business,
  .kp-dark .kp-date-pill,
  .kp-dark .kp-time-card,
  .kp-dark .kp-prof,
  .kp-dark .kp-service,
  .kp-dark .kp-data,
  .kp-dark .kp-summary,
  .kp-dark .kp-menu,
  .kp-dark .kp-bottom-nav {
    background: #111b16;
    color: #f5f7f6;
    border-color: #2b3a32;
  }

  .kp-dark .kp-stepper {
    background: #121a16;
    border-color: #2d3b34;
  }

  .kp-dark .kp-step-circle {
    background: #313a35;
    color: #d7ded9;
  }

  .kp-dark .kp-step-circle.active {
    background: linear-gradient(145deg,#0b7041,#15b466);
    color: #ffffff;
  }

  .kp-dark .kp-step-circle.done {
    background: #173c29;
    color: #78e7aa;
  }

  .kp-dark .kp-step-line {
    background:
      radial-gradient(circle, #647169 1.4px, transparent 1.6px)
      center / 9px 3px repeat-x;
    opacity: 1;
  }

  .kp-dark .kp-step-line.done {
    background: #17a25e;
  }

  .kp-dark .kp-stepper small {
    color: #aab4ae;
  }

  .kp-dark .kp-stepper small.active {
    color: #48d889;
  }

  .kp-dark .kp-top-icons button,
  .kp-dark .kp-back {
    background: #17221c;
    color: #eef4f0;
    border-color: #26342d;
  }

  .kp-dark .kp-top-icons button.active {
    background: #143c29;
    border-color: #43d483;
    color: #77e9aa;
  }

  .kp-dark .kp-business-window-info strong,
  .kp-dark .kp-booking-business strong,
  .kp-dark .kp-service-info strong,
  .kp-dark .kp-prof-info strong,
  .kp-dark .kp-summary-row strong,
  .kp-dark .kp-menu button,
  .kp-dark .kp-flow h2,
  .kp-dark .kp-flow h3,
  .kp-dark .kp-time-title {
    color: #ffffff;
  }

  .kp-dark .kp-business-window-info span,
  .kp-dark .kp-booking-business small,
  .kp-dark .kp-muted,
  .kp-dark .kp-service-info span,
  .kp-dark .kp-service-info small,
  .kp-dark .kp-prof-info small,
  .kp-dark .kp-summary-row,
  .kp-dark .kp-footer,
  .kp-dark .kp-available-note {
    color: #aeb9b2;
  }

  .kp-dark .kp-service-info b,
  .kp-dark .kp-eyebrow-dark {
    color: #45d987;
  }

  .kp-dark .kp-service > button,
  .kp-dark .kp-select,
  .kp-dark .kp-confirm,
  .kp-dark .kp-empty-action {
    background: linear-gradient(145deg,#0b7041,#14a55f);
    color: #ffffff;
    border-color: transparent;
  }

  .kp-dark .kp-date-pill.active,
  .kp-dark .kp-time-card.active {
    background: #153c29;
    color: #7be7aa;
    border-color: #42d47f;
  }

  .kp-dark .kp-form input,
  .kp-dark .kp-form textarea,
  .kp-dark .kp-cancel-box input {
    background: #0b120e;
    color: #ffffff;
    border-color: #33433a;
  }

  .kp-dark .kp-form input::placeholder,
  .kp-dark .kp-form textarea::placeholder,
  .kp-dark .kp-cancel-box input::placeholder {
    color: #7f8b84;
  }

  .kp-dark .kp-empty,
  .kp-dark .kp-prof-loading {
    background: #101813;
    color: #aeb9b2;
    border-color: #34443a;
  }

  .kp-dark .kp-menu button:hover {
    background: #1b2922;
  }

  .kp-dark .kp-modal {
    background: #111b16;
    color: #f5f7f6;
  }

  .kp-dark .kp-modal p {
    color: #aeb9b2;
  }

  .kp-dark .kp-bottom-nav button {
    color: #b5c0ba;
  }

  .kp-dark .kp-bottom-nav button:hover,
  .kp-dark .kp-bottom-nav button:focus {
    color: #49d98a;
  }


  .kp-dark .kp-public-profile,
  .kp-dark .kp-scroll-identity,
  .kp-dark .kp-profile-tabs,
  .kp-dark .kp-profile-section,
  .kp-dark .kp-team-card,
  .kp-dark .kp-reviews-empty {
    background: #0f1713;
    border-color: #2b3a32;
  }

  .kp-dark .kp-scroll-identity {
    border-bottom-color: #25352d;
    background: #111b16;
  }

  .kp-dark .kp-scroll-identity h2 {
    color: #f3f7f5;
  }

  .kp-dark .kp-scroll-location {
    color: #a7b3ad;
  }

  .kp-dark .kp-scroll-share {
    border-color: #31453a;
    background: #17231d;
    color: #f3f7f5;
  }

  .kp-dark .kp-profile-tabs {
    border-color: #2b3a32;
  }

  .kp-dark .kp-profile-tabs button {
    color: #92a098;
  }

  .kp-dark .kp-profile-tabs button.active,
  .kp-dark .kp-profile-section > h2,
  .kp-dark .kp-about h2,
  .kp-dark .kp-section-title-row h2,
  .kp-dark .kp-team-card strong,
  .kp-dark .kp-reviews-empty strong {
    color: #ffffff;
  }

  .kp-dark .kp-about p,
  .kp-dark .kp-team-card span,
  .kp-dark .kp-reviews-empty p {
    color: #aeb9b2;
  }

  .kp-dark .kp-time-heading .kp-time-title,
  .kp-dark .kp-slot-count strong,
  .kp-dark .kp-continue-summary > strong {
    color: #ffffff;
  }

  .kp-dark .kp-date-caption,
  .kp-dark .kp-period-tabs,
  .kp-dark .kp-period-empty {
    background: #101813;
    border-color: #304138;
    color: #aeb9b2;
  }

  .kp-dark .kp-period-tabs button {
    color: #aeb9b2;
  }

  .kp-dark .kp-period-tabs button b {
    background: #25332c;
    color: #b9c5be;
  }

  .kp-dark .kp-period-tabs button.active {
    background: #16845f;
    color: #ffffff;
  }

  .kp-dark .kp-period-tabs button.active b {
    background: rgba(255,255,255,.16);
    color: #ffffff;
  }

  .kp-dark .kp-slot-count span,
  .kp-dark .kp-continue-summary > span,
  .kp-dark .kp-continue-summary > small {
    color: #aeb9b2;
  }

  .kp-dark .kp-continue-fixed {
    background: rgba(15,23,19,.98);
    border-color: #2b3a32;
    color: #ffffff;
  }

  .kp-dark .kp-continue-action {
    background: #16845f;
    color: #ffffff;
  }

  @media (max-width: 520px) {
    .kp-popular-heading h2,
    .kp-all-services-title h2 {
      font-size: 25px;
    }

    .kp-popular-card {
      min-height: 200px;
      grid-template-columns: 44% minmax(0,1fr);
      gap: 11px;
      padding: 10px;
      border-radius: 20px;
    }

    .kp-rank-badge {
      top: 10px;
      left: 10px;
      min-height: 29px;
      padding: 0 10px;
      font-size: 8px;
    }

    .kp-popular-media,
    .kp-popular-placeholder {
      min-height: 180px;
    }

    .kp-popular-info {
      padding-top: 34px;
    }

    .kp-popular-name {
      font-size: 16px;
    }

    .kp-popular-price strong {
      font-size: 18px;
    }

    .kp-executed-chip {
      left: 6px;
      right: 6px;
      bottom: 6px;
      max-width: none;
    }

    .kp-public-profile {
      margin: -15px;
      overflow: visible;
      border-radius: 21px;
    }

    .kp-cover {
      min-height: 390px;
      padding: 18px;
      border-radius: 21px 21px 0 0;
      touch-action: pan-y;
    }

    .kp-scroll-identity {
      top: 66px;
      min-height: 84px;
      padding: 12px 18px 10px;
    }

    .kp-scroll-identity h2 {
      font-size: 27px;
      line-height: 1.02;
    }

    .kp-scroll-location {
      margin-top: 6px;
      font-size: 11px;
    }

    .kp-profile-tabs.with-compact {
      top: 150px;
    }

    .kp-cover-content {
      padding-top: 110px;
    }

    .kp-cover h1 {
      font-size: 38px;
    }

    .kp-profile-tabs {
      top: 70px;
      min-height: 64px;
      padding: 0 8px;
    }

    .kp-profile-tabs button {
      font-size: 13px;
    }

    .kp-profile-section {
      padding: 24px 15px 22px;
    }

    .kp-public-service {
      grid-template-columns: 90px minmax(0,1fr);
      min-height: auto;
      padding: 10px;
    }

    .kp-public-service .kp-service-image {
      width: 90px;
      height: 90px;
    }

    .kp-public-service > button {
      grid-column: 1 / -1;
      width: 100%;
      min-height: 46px;
      border-radius: 15px;
    }

    .kp-team-grid {
      grid-template-columns: 1fr;
    }

    .kp-team-card {
      grid-template-columns: 72px minmax(0,1fr);
      align-items: center;
    }

    .kp-team-photo {
      width: 72px;
      height: 72px;
    }

    .kp-flow,
    .kp-manage {
      padding: 15px;
      border-radius: 21px;
    }

    .kp-stepper {
      margin-left: -2px;
      margin-right: -2px;
      padding-left: 8px;
      padding-right: 8px;
    }

    .kp-step-circle {
      width: 31px;
      height: 31px;
    }

    .kp-date-strip-wrap {
      margin-left: -15px;
      margin-right: -15px;
      padding-left: 15px;
      padding-right: 15px;
    }

    .kp-date-pill {
      min-width: 72px;
      height: 102px;
    }

    .kp-time-heading {
      align-items: flex-start;
    }

    .kp-date-caption {
      margin-top: 1px;
    }

    .kp-period-tabs button {
      min-height: 50px;
      gap: 4px;
    }

    .kp-period-tabs button span {
      font-size: 11px;
    }

    .kp-time-card {
      min-height: 58px;
      font-size: 15px;
    }

    .kp-continue-fixed {
      width: calc(100% - 24px);
      min-height: 82px;
      bottom: 10px;
      padding: 10px 10px 10px 14px;
    }

    .kp-continue-action {
      min-width: 122px;
      min-height: 56px;
      padding: 0 14px;
    }
    .kp-continue-fixed {
      width: calc(100% - 28px);
      bottom: 12px;
      min-height: 64px;
      padding: 0 18px;
    }

    .kp-continue-detail {
      font-size: 14px;
    }

    .kp-continue-action {
      font-size: 17px;
    }

    .kp-hero {
      grid-template-columns: 1fr;
    }

    .kp-hero img {
      width: 104px;
    }

    .kp-service {
      grid-template-columns: 88px minmax(0,1fr);
      align-items: start;
    }

    .kp-service-image {
      width: 88px;
      height: 82px;
    }

    .kp-service-icon {
      width: 54px;
      height: 54px;
      align-self: center;
    }

    .kp-service > button {
      grid-column: 1 / -1;
      width: 100%;
    }

    .kp-prof {
      grid-template-columns: 50px minmax(0,1fr);
    }

    .kp-select {
      grid-column: 1 / -1;
      width: 100%;
    }
  }
`;
