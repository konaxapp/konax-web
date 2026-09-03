"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

// KONAX Configuración
// Perfil empresarial + Gimnasio + Belleza + KONAX Agenda $10
// Version 2026.09.02-AGENDA-BASICA-CONFIG-1

const PLAN_INICIAL = {
  nombre: "",
  descripcion: "",
  precio: "",
  periodicidad: "Mensual",
  duracion_cantidad: 1,
  duracion_unidad: "Meses",
  dias_aviso: 5,
  dias_gracia: 3,
  activo: true,
};

const PROFESIONAL_INICIAL = {
  nombre: "",
  especialidad: "",
  telefono: "",
  correo: "",
  foto_url: "",
  servicio_ids: [],
  activo: true,
};

const SERVICIO_INICIAL = {
  nombre: "",
  descripcion: "",
  duracion_minutos: 60,
  precio: "",
  activo: true,
};

const HORARIO_INICIAL = {
  servicio_id: "",
  profesional_id: "",
  dia_semana: 1,
  hora_inicio: "08:00",
  hora_fin: "17:00",
  capacidad: 1,
  fecha_desde: "",
  fecha_hasta: "",
  activo: true,
};

const PORTAL_INICIAL = {
  activo: false,
  slug: "",
  titulo_publico: "",
  ruta: "",
};

const DIAS = [
  { valor: 1, nombre: "Lunes" },
  { valor: 2, nombre: "Martes" },
  { valor: 3, nombre: "Miércoles" },
  { valor: 4, nombre: "Jueves" },
  { valor: 5, nombre: "Viernes" },
  { valor: 6, nombre: "Sábado" },
  { valor: 0, nombre: "Domingo" },
];

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function esNegocioGimnasio(empresa) {
  const texto = normalizar(
    `${empresa?.tipo_negocio || ""} ${empresa?.categoria_negocio || ""}`
  );

  return ["gimnasio", "gym", "fitness", "membresia", "suscripcion"].some((p) =>
    texto.includes(p)
  );
}

function esNegocioSalonBelleza(empresa) {
  const texto = normalizar(
    `${empresa?.tipo_negocio || ""} ${empresa?.categoria_negocio || ""}`
  );

  return [
    "belleza",
    "salon",
    "peluqueria",
    "estetica",
    "barberia",
    "spa",
  ].some((p) => texto.includes(p));
}

function esPlanAgendaBasica(empresa) {
  const texto = normalizar(
    [
      empresa?.plan_codigo,
      empresa?.codigo_plan,
      empresa?.plan_nombre,
      empresa?.modalidad,
      empresa?.modalidad_empresa,
      typeof window !== "undefined" ? localStorage.getItem("planCodigo") : "",
      typeof window !== "undefined" ? localStorage.getItem("plan_codigo") : "",
      typeof window !== "undefined" ? localStorage.getItem("planEmpresa") : "",
      typeof window !== "undefined" ? localStorage.getItem("modalidad") : "",
    ]
      .filter(Boolean)
      .join(" ")
  );

  return [
    "agenda_basica",
    "konax_agenda",
    "agenda_10",
    "plan_agenda",
  ].some((p) => texto.includes(p));
}

function extensionArchivo(archivo) {
  const nombre = String(archivo?.name || "");
  const extension = nombre.split(".").pop()?.toLowerCase();

  if (["png", "jpg", "jpeg", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (archivo?.type === "image/png") return "png";
  if (archivo?.type === "image/webp") return "webp";

  return "jpg";
}

function nuevoProfesional() {
  return { ...PROFESIONAL_INICIAL, servicio_ids: [] };
}

function fechaHoy() {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nombreDia(valor) {
  return DIAS.find((d) => Number(d.valor) === Number(valor))?.nombre || "Día";
}

function horaCorta(valor) {
  return String(valor || "").slice(0, 5);
}

export default function AdminConfiguracion() {
  const [seccion, setSeccion] = useState("perfil");
  const [empresa, setEmpresa] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [eliminandoLogo, setEliminandoLogo] = useState(false);

  const [planes, setPlanes] = useState([]);
  const [cargandoPlanes, setCargandoPlanes] = useState(false);
  const [guardandoPlan, setGuardandoPlan] = useState(false);
  const [planEditandoId, setPlanEditandoId] = useState("");
  const [formPlan, setFormPlan] = useState({ ...PLAN_INICIAL });

  const [profesionales, setProfesionales] = useState([]);
  const [serviciosSalon, setServiciosSalon] = useState([]);
  const [cargandoProfesionales, setCargandoProfesionales] = useState(false);
  const [guardandoProfesional, setGuardandoProfesional] = useState(false);
  const [subiendoFotoProfesional, setSubiendoFotoProfesional] = useState(false);
  const [profesionalEditandoId, setProfesionalEditandoId] = useState("");
  const [formProfesional, setFormProfesional] = useState(nuevoProfesional());

  // KONAX AGENDA $10
  const [serviciosAgenda, setServiciosAgenda] = useState([]);
  const [cargandoServiciosAgenda, setCargandoServiciosAgenda] = useState(false);
  const [guardandoServicioAgenda, setGuardandoServicioAgenda] = useState(false);
  const [servicioEditandoId, setServicioEditandoId] = useState("");
  const [formServicio, setFormServicio] = useState({ ...SERVICIO_INICIAL });

  const [horariosAgenda, setHorariosAgenda] = useState([]);
  const [cargandoHorariosAgenda, setCargandoHorariosAgenda] = useState(false);
  const [guardandoHorarioAgenda, setGuardandoHorarioAgenda] = useState(false);
  const [horarioEditandoId, setHorarioEditandoId] = useState("");
  const [formHorario, setFormHorario] = useState({
    ...HORARIO_INICIAL,
    fecha_desde: fechaHoy(),
  });

  const [portalConfig, setPortalConfig] = useState({ ...PORTAL_INICIAL });
  const [cargandoPortal, setCargandoPortal] = useState(false);
  const [guardandoPortal, setGuardandoPortal] = useState(false);

  const gimnasio = useMemo(() => esNegocioGimnasio(empresa), [empresa]);
  const salonBelleza = useMemo(() => esNegocioSalonBelleza(empresa), [empresa]);
  const agendaBasica = useMemo(() => esPlanAgendaBasica(empresa), [empresa]);

  useEffect(() => {
    cargarDatos();

    const params = new URLSearchParams(window.location.search);
    const solicitada = params.get("seccion");

    const permitidas = [
      "perfil",
      "empresa",
      "planes_membresia",
      "profesionales",
      "plan",
      "servicios",
      "horarios",
      "sitio-reservas",
    ];

    if (permitidas.includes(solicitada || "")) {
      setSeccion(solicitada);
    }
  }, []);

  function empresaId() {
    return localStorage.getItem("empresaId");
  }

  function usuarioId() {
    return localStorage.getItem("usuarioId");
  }

  function esAdministrador() {
    return [
      "administrador",
      "superadmin",
      "super_admin",
      "admin master",
      "admin_master",
      "administrador master",
      "administrador_master",
    ].includes(normalizar(localStorage.getItem("usuarioRol")));
  }

  async function cargarDatos() {
    setCargando(true);

    const eId = empresaId();
    const uId = usuarioId();

    if (!eId || !uId) {
      alert("La sesión no es válida. Inicie sesión nuevamente.");
      localStorage.clear();
      window.location.href = "/login";
      return;
    }

    if (!esAdministrador()) {
      alert("No tienes permiso para acceder a configuración.");
      window.location.href = "/dashboard";
      return;
    }

    const [ru, re] = await Promise.all([
      supabase
        .from("usuarios")
        .select("*")
        .eq("id", uId)
        .eq("empresa_id", eId)
        .maybeSingle(),

      supabase
        .from("empresas")
        .select("*")
        .eq("id", eId)
        .maybeSingle(),
    ]);

    if (ru.error) {
      alert("Error cargando usuario: " + ru.error.message);
      setCargando(false);
      return;
    }

    if (re.error) {
      alert("Error cargando empresa: " + re.error.message);
      setCargando(false);
      return;
    }

    const empresaData = re.data || null;

    setUsuario(ru.data || null);
    setEmpresa(empresaData);

    // Sincroniza el plan con el Mobile Nav.
    if (empresaData) {
      const planCodigo =
        empresaData.plan_codigo ||
        empresaData.codigo_plan ||
        "";

      const modalidad =
        empresaData.modalidad ||
        empresaData.modalidad_empresa ||
        "";

      if (planCodigo) localStorage.setItem("planCodigo", planCodigo);
      if (modalidad) localStorage.setItem("modalidad", modalidad);
    }

    const tareas = [];

    if (esNegocioGimnasio(empresaData)) {
      tareas.push(cargarPlanesMembresia(eId));
    }

    if (esNegocioSalonBelleza(empresaData) || esPlanAgendaBasica(empresaData)) {
      tareas.push(cargarProfesionales(eId));
      tareas.push(cargarServiciosSalon(eId));
    }

    if (esPlanAgendaBasica(empresaData)) {
      tareas.push(cargarServiciosAgenda(eId));
      tareas.push(cargarHorariosAgenda(eId));
      tareas.push(cargarPortalAgenda(eId));
    }

    if (tareas.length) {
      await Promise.all(tareas);
    }

    setCargando(false);
  }

  async function cargarPlanesMembresia(id = empresaId()) {
    if (!id) return;

    setCargandoPlanes(true);

    const { data, error } = await supabase
      .from("planes_membresia")
      .select("*")
      .eq("empresa_id", id)
      .order("activo", { ascending: false })
      .order("nombre", { ascending: true });

    setCargandoPlanes(false);

    if (error) {
      alert("Error cargando planes de membresía: " + error.message);
      setPlanes([]);
      return;
    }

    setPlanes(data || []);
  }

  async function cargarServiciosSalon(id = empresaId()) {
    if (!id) return;

    const { data, error } = await supabase
      .from("agenda_servicios")
      .select("id,nombre,activo")
      .eq("empresa_id", id)
      .order("nombre", { ascending: true });

    if (error) {
      console.error(error);
      setServiciosSalon([]);
      return;
    }

    setServiciosSalon(data || []);
  }

  async function cargarProfesionales(id = empresaId()) {
    if (!id) return;

    setCargandoProfesionales(true);

    const { data, error } = await supabase
      .from("profesionales")
      .select("*")
      .eq("empresa_id", String(id))
      .order("activo", { ascending: false })
      .order("nombre", { ascending: true });

    setCargandoProfesionales(false);

    if (error) {
      console.error(error);
      setProfesionales([]);
      return;
    }

    setProfesionales(data || []);
  }

  // =========================================================
  // KONAX AGENDA $10 · SERVICIOS
  // =========================================================

  async function cargarServiciosAgenda(id = empresaId()) {
    if (!id) return;

    setCargandoServiciosAgenda(true);

    const { data, error } = await supabase
      .from("agenda_servicios")
      .select("*")
      .eq("empresa_id", id)
      .order("activo", { ascending: false })
      .order("nombre", { ascending: true });

    setCargandoServiciosAgenda(false);

    if (error) {
      console.error(error);
      setServiciosAgenda([]);
      return;
    }

    const lista = data || [];
    setServiciosAgenda(lista);
    setServiciosSalon(
      lista.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        activo: item.activo,
      }))
    );
  }

  function limpiarServicioAgenda() {
    setServicioEditandoId("");
    setFormServicio({ ...SERVICIO_INICIAL });
  }

  function editarServicioAgenda(servicio) {
    setServicioEditandoId(servicio.id);

    setFormServicio({
      nombre: servicio.nombre || "",
      descripcion: servicio.descripcion || "",
      duracion_minutos: Number(servicio.duracion_minutos || 60),
      precio:
        servicio.precio === null || servicio.precio === undefined
          ? ""
          : String(servicio.precio),
      activo: servicio.activo !== false,
    });

    setSeccion("servicios");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarServicioAgenda() {
    const eId = empresaId();

    if (!eId || guardandoServicioAgenda) return;

    const nombre = String(formServicio.nombre || "").trim();
    const duracion = Number(formServicio.duracion_minutos || 0);
    const precio = Number(formServicio.precio || 0);

    if (!nombre) {
      alert("Escriba el nombre del servicio.");
      return;
    }

    if (!Number.isFinite(duracion) || duracion <= 0) {
      alert("La duración debe ser mayor que cero.");
      return;
    }

    if (!Number.isFinite(precio) || precio < 0) {
      alert("El precio no es válido.");
      return;
    }

    const payload = {
      empresa_id: eId,
      nombre,
      descripcion:
        String(formServicio.descripcion || "").trim() || null,
      duracion_minutos: Math.round(duracion),
      precio,
      activo: Boolean(formServicio.activo),
    };

    setGuardandoServicioAgenda(true);

    const respuesta = servicioEditandoId
      ? await supabase
          .from("agenda_servicios")
          .update(payload)
          .eq("id", servicioEditandoId)
          .eq("empresa_id", eId)
      : await supabase
          .from("agenda_servicios")
          .insert([payload]);

    setGuardandoServicioAgenda(false);

    if (respuesta.error) {
      alert(
        "No se pudo guardar el servicio: " +
          respuesta.error.message
      );
      return;
    }

    alert(
      servicioEditandoId
        ? "Servicio actualizado."
        : "Servicio creado."
    );

    limpiarServicioAgenda();
    await cargarServiciosAgenda(eId);
  }

  async function cambiarEstadoServicioAgenda(servicio) {
    const eId = empresaId();
    if (!eId) return;

    const { error } = await supabase
      .from("agenda_servicios")
      .update({
        activo: !Boolean(servicio.activo),
      })
      .eq("id", servicio.id)
      .eq("empresa_id", eId);

    if (error) {
      alert("No se pudo cambiar el estado: " + error.message);
      return;
    }

    await cargarServiciosAgenda(eId);
  }

  // =========================================================
  // KONAX AGENDA $10 · HORARIOS
  // Usa la tabla existente agenda_horarios.
  // El campo instructor conserva el nombre del profesional para
  // mantener compatibilidad con el motor actual de Agenda.
  // =========================================================

  async function cargarHorariosAgenda(id = empresaId()) {
    if (!id) return;

    setCargandoHorariosAgenda(true);

    const { data, error } = await supabase
      .from("agenda_horarios")
      .select("*")
      .eq("empresa_id", id)
      .order("dia_semana", { ascending: true })
      .order("hora_inicio", { ascending: true });

    setCargandoHorariosAgenda(false);

    if (error) {
      console.error(error);
      setHorariosAgenda([]);
      return;
    }

    setHorariosAgenda(data || []);
  }

  function limpiarHorarioAgenda() {
    setHorarioEditandoId("");
    setFormHorario({
      ...HORARIO_INICIAL,
      fecha_desde: fechaHoy(),
    });
  }

  function editarHorarioAgenda(horario) {
    const profesional =
      profesionales.find(
        (p) =>
          normalizar(p.nombre) ===
          normalizar(horario.instructor)
      ) || null;

    setHorarioEditandoId(horario.id);

    setFormHorario({
      servicio_id: horario.servicio_id || "",
      profesional_id: profesional?.id || "",
      dia_semana: Number(horario.dia_semana ?? 1),
      hora_inicio: horaCorta(horario.hora_inicio || "08:00"),
      hora_fin: horaCorta(horario.hora_fin || "17:00"),
      capacidad: Number(horario.capacidad || 1),
      fecha_desde: horario.fecha_desde || fechaHoy(),
      fecha_hasta: horario.fecha_hasta || "",
      activo: horario.activo !== false,
    });

    setSeccion("horarios");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarHorarioAgenda() {
    const eId = empresaId();

    if (!eId || guardandoHorarioAgenda) return;

    if (!formHorario.servicio_id) {
      alert("Seleccione el servicio.");
      return;
    }

    if (!formHorario.hora_inicio || !formHorario.hora_fin) {
      alert("Complete la hora de inicio y fin.");
      return;
    }

    if (formHorario.hora_fin <= formHorario.hora_inicio) {
      alert("La hora final debe ser posterior a la inicial.");
      return;
    }

    const profesional = profesionales.find(
      (p) => String(p.id) === String(formHorario.profesional_id)
    );

    const payload = {
      empresa_id: eId,
      servicio_id: formHorario.servicio_id,
      dia_semana: Number(formHorario.dia_semana),
      hora_inicio: formHorario.hora_inicio,
      hora_fin: formHorario.hora_fin,
      instructor: profesional?.nombre || null,
      capacidad: Math.max(
        1,
        Math.floor(Number(formHorario.capacidad || 1))
      ),
      fecha_desde: formHorario.fecha_desde || fechaHoy(),
      fecha_hasta: formHorario.fecha_hasta || null,
      activo: Boolean(formHorario.activo),
    };

    setGuardandoHorarioAgenda(true);

    const respuesta = horarioEditandoId
      ? await supabase
          .from("agenda_horarios")
          .update(payload)
          .eq("id", horarioEditandoId)
          .eq("empresa_id", eId)
      : await supabase
          .from("agenda_horarios")
          .insert([payload]);

    setGuardandoHorarioAgenda(false);

    if (respuesta.error) {
      alert(
        "No se pudo guardar el horario: " +
          respuesta.error.message
      );
      return;
    }

    alert(
      horarioEditandoId
        ? "Horario actualizado."
        : "Horario creado."
    );

    limpiarHorarioAgenda();
    await cargarHorariosAgenda(eId);
  }

  async function cambiarEstadoHorarioAgenda(horario) {
    const eId = empresaId();
    if (!eId) return;

    const { error } = await supabase
      .from("agenda_horarios")
      .update({
        activo: !Boolean(horario.activo),
      })
      .eq("id", horario.id)
      .eq("empresa_id", eId);

    if (error) {
      alert("No se pudo cambiar el estado: " + error.message);
      return;
    }

    await cargarHorariosAgenda(eId);
  }

  // =========================================================
  // KONAX AGENDA $10 · SITIO DE RESERVAS
  // Reutiliza RPC existentes del portal público.
  // =========================================================

  async function cargarPortalAgenda(id = empresaId()) {
    if (!id) return;

    setCargandoPortal(true);

    const { data, error } = await supabase.rpc(
      "obtener_configuracion_portal_agenda",
      {
        p_empresa_id: id,
      }
    );

    setCargandoPortal(false);

    if (error) {
      console.error(error);

      setPortalConfig({
        activo: Boolean(empresa?.agenda_reservas_publicas),
        slug: empresa?.agenda_slug || "",
        titulo_publico:
          empresa?.agenda_titulo_publico ||
          empresa?.nombre ||
          "",
        ruta: empresa?.agenda_slug
          ? `/reservar/${empresa.agenda_slug}`
          : "",
      });

      return;
    }

    setPortalConfig({
      activo: Boolean(data?.activo),
      slug: data?.slug || "",
      titulo_publico:
        data?.titulo_publico || empresa?.nombre || "",
      ruta:
        data?.ruta ||
        (data?.slug ? `/reservar/${data.slug}` : ""),
    });
  }

  async function guardarPortalAgenda() {
    const eId = empresaId();

    if (!eId || guardandoPortal) return;

    if (!String(portalConfig.slug || "").trim()) {
      alert("Escriba el enlace del sitio de reservas.");
      return;
    }

    setGuardandoPortal(true);

    const { data, error } = await supabase.rpc(
      "configurar_portal_agenda",
      {
        p_empresa_id: eId,
        p_activo: Boolean(portalConfig.activo),
        p_slug: String(portalConfig.slug || "").trim(),
        p_titulo_publico:
          String(portalConfig.titulo_publico || "").trim() ||
          empresa?.nombre ||
          "",
      }
    );

    setGuardandoPortal(false);

    if (error) {
      alert(
        "No se pudo guardar el sitio de reservas: " +
          error.message
      );
      return;
    }

    const siguiente = {
      activo: Boolean(data?.activo),
      slug: data?.slug || portalConfig.slug,
      titulo_publico:
        data?.titulo_publico ||
        portalConfig.titulo_publico ||
        empresa?.nombre ||
        "",
      ruta:
        data?.ruta ||
        `/reservar/${data?.slug || portalConfig.slug}`,
    };

    setPortalConfig(siguiente);

    setEmpresa((prev) => ({
      ...prev,
      agenda_slug: siguiente.slug,
      agenda_reservas_publicas: siguiente.activo,
      agenda_titulo_publico: siguiente.titulo_publico,
    }));

    alert("Sitio de reservas actualizado correctamente.");
  }

  function obtenerEnlacePortal() {
    const slug = String(portalConfig.slug || "").trim();

    if (!slug) return "";

    if (typeof window === "undefined") {
      return `https://app.konax.net/reservar/${slug}`;
    }

    return `${window.location.origin}/reservar/${slug}`;
  }

  async function copiarEnlacePortal() {
    const enlace = obtenerEnlacePortal();

    if (!enlace) return;

    try {
      await navigator.clipboard.writeText(enlace);
      alert("Enlace copiado.");
    } catch {
      alert(enlace);
    }
  }

  function abrirPortal() {
    const enlace = obtenerEnlacePortal();
    if (!enlace) return;
    window.open(enlace, "_blank", "noopener,noreferrer");
  }

  function compartirPortalWhatsApp() {
    const enlace = obtenerEnlacePortal();
    if (!enlace) return;

    const mensaje = encodeURIComponent(
      `Reserva tu cita con ${empresa?.nombre || "nosotros"} aquí: ${enlace}`
    );

    window.open(
      `https://wa.me/?text=${mensaje}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // =========================================================
  // PERFIL / EMPRESA / PROFESIONALES / GIMNASIO EXISTENTES
  // =========================================================

  function actualizarUsuario(campo, valor) {
    setUsuario((p) => ({ ...p, [campo]: valor }));
  }

  function actualizarEmpresa(campo, valor) {
    setEmpresa((p) => ({ ...p, [campo]: valor }));
  }

  function actualizarPlan(campo, valor) {
    setFormPlan((p) => ({ ...p, [campo]: valor }));
  }

  function actualizarProfesional(campo, valor) {
    setFormProfesional((p) => ({ ...p, [campo]: valor }));
  }

  async function guardarPerfil() {
    if (!usuario?.id) return;

    setGuardando(true);

    const { error } = await supabase
      .from("usuarios")
      .update({
        nombre: String(usuario.nombre || "").trim(),
        correo: String(usuario.correo || "").trim(),
      })
      .eq("id", usuario.id)
      .eq("empresa_id", empresaId());

    setGuardando(false);

    if (error) {
      alert("Error guardando perfil: " + error.message);
      return;
    }

    localStorage.setItem("usuarioNombre", usuario.nombre || "");
    localStorage.setItem("usuarioCorreo", usuario.correo || "");

    alert("Perfil actualizado correctamente.");
  }

  async function guardarEmpresa() {
    if (!empresa?.id) return;

    setGuardando(true);

    const payload = {
      nombre: String(empresa.nombre || "").trim(),
      telefono: String(empresa.telefono || "").trim(),
      correo: String(empresa.correo || "").trim(),
      direccion: String(empresa.direccion || "").trim(),
      tipo_negocio: String(empresa.tipo_negocio || "").trim(),
      categoria_negocio: String(empresa.categoria_negocio || "").trim(),
    };

    // Para negocios con agenda, la descripción alimenta su presencia pública.
    if (agendaBasica || salonBelleza) {
      payload.descripcion_publica =
        String(empresa.descripcion_publica || "").trim() || null;
    }

    const { error } = await supabase
      .from("empresas")
      .update(payload)
      .eq("id", empresaId());

    setGuardando(false);

    if (error) {
      alert("Error guardando empresa: " + error.message);
      return;
    }

    localStorage.setItem("empresaNombre", empresa.nombre || "");
    localStorage.setItem("tipoNegocio", empresa.tipo_negocio || "");
    localStorage.setItem(
      "categoriaNegocio",
      empresa.categoria_negocio || ""
    );

    alert("Perfil empresarial actualizado correctamente.");
  }

  async function subirLogoEmpresa(evento) {
    const archivo = evento.target.files?.[0];
    const eId = empresaId();

    evento.target.value = "";

    if (!archivo || !eId) return;

    if (!archivo.type?.startsWith("image/")) {
      alert("Seleccione una imagen PNG, JPG o WEBP.");
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      alert("El logo no puede pesar más de 5 MB.");
      return;
    }

    setSubiendoLogo(true);

    try {
      const ext = extensionArchivo(archivo);
      const ruta = `empresas/${eId}/logo.${ext}`;

      const up = await supabase.storage
        .from("logos-empresas")
        .upload(ruta, archivo, {
          upsert: true,
          cacheControl: "3600",
          contentType: archivo.type || undefined,
        });

      if (up.error) throw up.error;

      const { data } = supabase.storage
        .from("logos-empresas")
        .getPublicUrl(ruta);

      const url = `${data.publicUrl}?v=${Date.now()}`;

      const save = await supabase
        .from("empresas")
        .update({ logo_url: url })
        .eq("id", eId);

      if (save.error) throw save.error;

      setEmpresa((p) => ({
        ...p,
        logo_url: url,
      }));

      alert("Logo del negocio actualizado correctamente.");
    } catch (error) {
      alert(
        "No se pudo subir el logo: " +
          (error?.message || "Error inesperado")
      );
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function quitarLogoEmpresa() {
    const eId = empresaId();

    if (!eId || !empresa?.logo_url || eliminandoLogo) return;

    if (!window.confirm("¿Desea quitar el logo actual del negocio?")) {
      return;
    }

    setEliminandoLogo(true);

    try {
      const url = String(empresa.logo_url || "");
      const match = url.match(
        /logos-empresas\/(.+?)(?:\?|$)/
      );

      if (match?.[1]) {
        await supabase.storage
          .from("logos-empresas")
          .remove([decodeURIComponent(match[1])]);
      }

      const { error } = await supabase
        .from("empresas")
        .update({ logo_url: null })
        .eq("id", eId);

      if (error) throw error;

      setEmpresa((p) => ({
        ...p,
        logo_url: null,
      }));

      alert("Logo eliminado correctamente.");
    } catch (error) {
      alert(
        "No se pudo quitar el logo: " +
          (error?.message || "Error inesperado")
      );
    } finally {
      setEliminandoLogo(false);
    }
  }

  function limpiarProfesional() {
    setProfesionalEditandoId("");
    setFormProfesional(nuevoProfesional());
  }

  function editarProfesional(prof) {
    setProfesionalEditandoId(prof.id);

    setFormProfesional({
      nombre: prof.nombre || "",
      especialidad: prof.especialidad || "",
      telefono: prof.telefono || "",
      correo: prof.correo || "",
      foto_url: prof.foto_url || "",
      servicio_ids: Array.isArray(prof.servicio_ids)
        ? prof.servicio_ids.map(String)
        : [],
      activo: prof.activo !== false,
    });

    setSeccion("profesionales");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function alternarServicio(id) {
    const clave = String(id);

    setFormProfesional((p) => ({
      ...p,
      servicio_ids: p.servicio_ids.includes(clave)
        ? p.servicio_ids.filter((x) => x !== clave)
        : [...p.servicio_ids, clave],
    }));
  }

  async function subirFotoProfesional(evento) {
    const archivo = evento.target.files?.[0];
    const eId = empresaId();

    evento.target.value = "";

    if (!archivo || !eId) return;

    if (!archivo.type?.startsWith("image/")) {
      alert("Seleccione una imagen PNG, JPG o WEBP.");
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      alert("La foto no puede pesar más de 5 MB.");
      return;
    }

    setSubiendoFotoProfesional(true);

    try {
      const ext = extensionArchivo(archivo);
      const identificador =
        profesionalEditandoId || `nuevo-${Date.now()}`;

      const ruta = `empresas/${eId}/${identificador}.${ext}`;

      const up = await supabase.storage
        .from("profesionales")
        .upload(ruta, archivo, {
          upsert: true,
          cacheControl: "3600",
          contentType: archivo.type || undefined,
        });

      if (up.error) throw up.error;

      const { data } = supabase.storage
        .from("profesionales")
        .getPublicUrl(ruta);

      actualizarProfesional(
        "foto_url",
        `${data.publicUrl}?v=${Date.now()}`
      );
    } catch (error) {
      alert(
        "No se pudo subir la foto: " +
          (error?.message || "Error inesperado")
      );
    } finally {
      setSubiendoFotoProfesional(false);
    }
  }

  async function guardarProfesional() {
    const eId = empresaId();

    if (!eId || guardandoProfesional) return;

    const nombre = String(
      formProfesional.nombre || ""
    ).trim();

    if (!nombre) {
      alert("Escriba el nombre del profesional.");
      return;
    }

    const payload = {
      empresa_id: String(eId),
      nombre,
      especialidad:
        String(formProfesional.especialidad || "").trim() || null,
      telefono:
        String(formProfesional.telefono || "").trim() || null,
      correo:
        String(formProfesional.correo || "").trim() || null,
      foto_url:
        String(formProfesional.foto_url || "").trim() || null,
      servicio_ids: formProfesional.servicio_ids.map(String),
      activo: Boolean(formProfesional.activo),
      updated_at: new Date().toISOString(),
    };

    setGuardandoProfesional(true);

    const respuesta = profesionalEditandoId
      ? await supabase
          .from("profesionales")
          .update(payload)
          .eq("id", profesionalEditandoId)
          .eq("empresa_id", String(eId))
      : await supabase
          .from("profesionales")
          .insert([payload]);

    setGuardandoProfesional(false);

    if (respuesta.error) {
      alert(
        "No se pudo guardar el profesional: " +
          respuesta.error.message
      );
      return;
    }

    alert(
      profesionalEditandoId
        ? "Perfil profesional actualizado."
        : "Perfil profesional creado."
    );

    limpiarProfesional();
    await cargarProfesionales(eId);
  }

  async function cambiarEstadoProfesional(prof) {
    const eId = empresaId();

    if (!eId) return;

    setGuardandoProfesional(true);

    const { error } = await supabase
      .from("profesionales")
      .update({
        activo: !Boolean(prof.activo),
        updated_at: new Date().toISOString(),
      })
      .eq("id", prof.id)
      .eq("empresa_id", String(eId));

    setGuardandoProfesional(false);

    if (error) {
      alert("No se pudo cambiar el estado: " + error.message);
      return;
    }

    await cargarProfesionales(eId);
  }

  function limpiarPlan() {
    setPlanEditandoId("");
    setFormPlan({ ...PLAN_INICIAL });
  }

  function editarPlan(plan) {
    setPlanEditandoId(plan.id);

    setFormPlan({
      nombre: plan.nombre || "",
      descripcion: plan.descripcion || "",
      precio:
        plan.precio == null ? "" : String(plan.precio),
      periodicidad: plan.periodicidad || "Mensual",
      duracion_cantidad: Number(plan.duracion_cantidad || 1),
      duracion_unidad: plan.duracion_unidad || "Meses",
      dias_aviso: Number(plan.dias_aviso ?? 5),
      dias_gracia: Number(plan.dias_gracia ?? 3),
      activo: plan.activo !== false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarPlanMembresia() {
    const eId = empresaId();

    if (!eId || guardandoPlan) return;

    const nombre = String(formPlan.nombre || "").trim();
    const precio = Number(formPlan.precio || 0);

    if (!nombre) {
      alert("Escriba el nombre del plan.");
      return;
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      alert("El precio del plan debe ser mayor que cero.");
      return;
    }

    const payload = {
      empresa_id: eId,
      nombre,
      descripcion:
        String(formPlan.descripcion || "").trim() || null,
      precio,
      periodicidad: formPlan.periodicidad || "Mensual",
      duracion_cantidad: Math.max(
        1,
        Math.floor(Number(formPlan.duracion_cantidad || 1))
      ),
      duracion_unidad: formPlan.duracion_unidad || "Meses",
      dias_aviso: Math.max(
        0,
        Math.floor(Number(formPlan.dias_aviso || 0))
      ),
      dias_gracia: Math.max(
        0,
        Math.floor(Number(formPlan.dias_gracia || 0))
      ),
      activo: Boolean(formPlan.activo),
    };

    setGuardandoPlan(true);

    const respuesta = planEditandoId
      ? await supabase
          .from("planes_membresia")
          .update(payload)
          .eq("id", planEditandoId)
          .eq("empresa_id", eId)
      : await supabase
          .from("planes_membresia")
          .insert([payload]);

    setGuardandoPlan(false);

    if (respuesta.error) {
      alert(
        "No se pudo guardar el plan: " +
          respuesta.error.message
      );
      return;
    }

    alert(
      planEditandoId
        ? "Plan actualizado correctamente."
        : "Plan creado correctamente."
    );

    limpiarPlan();
    await cargarPlanesMembresia(eId);
  }

  async function cambiarEstadoPlan(plan) {
    const eId = empresaId();

    if (!eId || guardandoPlan) return;

    const nuevo = !Boolean(plan.activo);

    if (
      !window.confirm(
        `¿Desea ${nuevo ? "activar" : "desactivar"} el plan "${plan.nombre}"?`
      )
    ) {
      return;
    }

    setGuardandoPlan(true);

    const { error } = await supabase
      .from("planes_membresia")
      .update({ activo: nuevo })
      .eq("id", plan.id)
      .eq("empresa_id", eId);

    setGuardandoPlan(false);

    if (error) {
      alert(
        "No se pudo cambiar el estado del plan: " +
          error.message
      );
      return;
    }

    await cargarPlanesMembresia(eId);
  }

  if (cargando) {
    return (
      <div style={S.loadingPage}>
        <div style={S.loadingCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={{
              width: 80,
              marginBottom: 14,
            }}
          />
          <strong>Cargando configuración...</strong>
          <p style={S.muted}>
            Validando empresa y usuario.
          </p>
        </div>
      </div>
    );
  }

  const puedeUsarProfesionales =
    salonBelleza || agendaBasica;

  return (
    <div style={S.page} className="config-page">
      <style>{CSS}</style>

      <div style={S.container}>
        <header style={S.hero} className="config-hero">
          <div style={S.heroLeft} className="config-hero-left">
            <img
              src="/konax-logo.png"
              alt="KONAX"
              style={S.heroLogo}
            />

            <div>
              <p style={S.eyebrow}>
                {agendaBasica
                  ? "KONAX Agenda"
                  : "Panel Administrativo"}
              </p>

              <h1 style={S.title}>Configuraciones</h1>

              <p style={S.subtitle}>
                {agendaBasica
                  ? "Configura tu agenda, equipo y sitio de reservas."
                  : "Administra tu perfil, negocio y configuración operativa."}
              </p>
            </div>
          </div>

          <button
            style={S.back}
            onClick={() =>
              (window.location.href = "/dashboard")
            }
          >
            ← Volver al Dashboard
          </button>
        </header>

        <div style={S.summaryGrid} className="config-resumen">
          <Resumen
            titulo="Empresa"
            valor={empresa?.nombre || "Sin empresa"}
            icono="🏢"
          />

          <Resumen
            titulo="Plan KONAX"
            valor={
              agendaBasica
                ? "KONAX Agenda"
                : empresa?.plan_nombre || "Sin plan"
            }
            icono="💼"
          />

          <Resumen
            titulo="Usuario"
            valor={usuario?.nombre || "Usuario"}
            icono="👤"
          />

          <Resumen
            titulo="Estado"
            valor={
              empresa?.estado_plan ||
              empresa?.estado ||
              "Activo"
            }
            icono="✅"
          />
        </div>

        <div style={S.layout} className="config-layout">
          <aside style={S.menu} className="config-menu">
            <div style={S.brand}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={S.menuLogo}
              />

              <div>
                <strong>KONAX</strong>
                <p style={S.mutedSmall}>
                  {agendaBasica
                    ? "Agenda"
                    : "Configuración"}
                </p>
              </div>
            </div>

            <Grupo titulo="Mi cuenta" />

            <Item
              texto="Mi perfil"
              icono="👤"
              activo={seccion === "perfil"}
              onClick={() => setSeccion("perfil")}
            />

            <Separador />

            <Grupo titulo="Mi negocio" />

            <Item
              texto="Perfil empresarial"
              icono="🏢"
              activo={seccion === "empresa"}
              onClick={() => setSeccion("empresa")}
            />

            {agendaBasica && (
              <>
                <Item
                  texto="Servicios"
                  icono="✦"
                  activo={seccion === "servicios"}
                  onClick={() => {
                    setSeccion("servicios");
                    cargarServiciosAgenda();
                  }}
                />

                <Item
                  texto="Profesionales"
                  icono="👥"
                  activo={seccion === "profesionales"}
                  onClick={() => {
                    setSeccion("profesionales");
                    cargarProfesionales();
                    cargarServiciosAgenda();
                  }}
                />

                <Item
                  texto="Horarios"
                  icono="◷"
                  activo={seccion === "horarios"}
                  onClick={() => {
                    setSeccion("horarios");
                    cargarHorariosAgenda();
                    cargarProfesionales();
                    cargarServiciosAgenda();
                  }}
                />

                <Item
                  texto="Mi sitio de reservas"
                  icono="↗"
                  activo={seccion === "sitio-reservas"}
                  onClick={() => {
                    setSeccion("sitio-reservas");
                    cargarPortalAgenda();
                  }}
                />
              </>
            )}

            {!agendaBasica && salonBelleza && (
              <Item
                texto="Perfiles profesionales"
                icono="✂️"
                activo={seccion === "profesionales"}
                onClick={() => {
                  setSeccion("profesionales");
                  cargarProfesionales();
                  cargarServiciosSalon();
                }}
              />
            )}

            {!agendaBasica && gimnasio && (
              <Item
                texto="Planes de membresía"
                icono="🏷️"
                activo={seccion === "planes_membresia"}
                onClick={() => {
                  setSeccion("planes_membresia");
                  cargarPlanesMembresia();
                }}
              />
            )}

            <Item
              texto="Mi plan KONAX"
              icono="💼"
              activo={seccion === "plan"}
              onClick={() => setSeccion("plan")}
            />
          </aside>

          <main style={{ minWidth: 0 }}>
            {seccion === "perfil" && (
              <Card
                titulo="Mi perfil"
                descripcion="Datos principales del usuario administrador."
                icono="👤"
              >
                <Campo label="Nombre">
                  <input
                    style={S.input}
                    value={usuario?.nombre || ""}
                    onChange={(e) =>
                      actualizarUsuario(
                        "nombre",
                        e.target.value
                      )
                    }
                  />
                </Campo>

                <Campo label="Correo">
                  <input
                    style={S.input}
                    type="email"
                    value={usuario?.correo || ""}
                    onChange={(e) =>
                      actualizarUsuario(
                        "correo",
                        e.target.value
                      )
                    }
                  />
                </Campo>

                <Campo label="Rol">
                  <input
                    style={{
                      ...S.input,
                      background: "#f3f4f6",
                    }}
                    value={usuario?.rol || ""}
                    disabled
                  />
                </Campo>

                <button
                  style={S.primary}
                  onClick={guardarPerfil}
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar perfil"}
                </button>
              </Card>
            )}

            {seccion === "empresa" && (
              <Card
                titulo="Perfil empresarial"
                descripcion={
                  agendaBasica
                    ? "Estos datos identifican tu negocio y alimentan tu sitio de reservas."
                    : "Información administrativa del negocio."
                }
                icono="🏢"
              >
                <div
                  style={S.logoBox}
                  className="logo-box"
                >
                  <div style={S.logoPreview}>
                    {empresa?.logo_url ? (
                      <img
                        src={empresa.logo_url}
                        alt="Logo"
                        style={S.coverContain}
                      />
                    ) : (
                      <span style={{ fontSize: 42 }}>
                        🏢
                      </span>
                    )}
                  </div>

                  <div>
                    <strong>Logo del negocio</strong>

                    <p style={S.muted}>
                      Este logo se mostrará en tu sitio
                      público de reservas.
                    </p>

                    <div style={S.actions}>
                      <label style={S.greenLabel}>
                        {subiendoLogo
                          ? "Subiendo..."
                          : empresa?.logo_url
                          ? "Cambiar logo"
                          : "Subir logo"}

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={subirLogoEmpresa}
                          style={{ display: "none" }}
                        />
                      </label>

                      {empresa?.logo_url && (
                        <button
                          style={S.dangerLight}
                          onClick={quitarLogoEmpresa}
                        >
                          {eliminandoLogo
                            ? "Quitando..."
                            : "Quitar logo"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <Campo label="Nombre del negocio">
                  <input
                    style={S.input}
                    value={empresa?.nombre || ""}
                    onChange={(e) =>
                      actualizarEmpresa(
                        "nombre",
                        e.target.value
                      )
                    }
                  />
                </Campo>

                <div style={S.twoCols} className="two-cols">
                  <Campo label="Teléfono / WhatsApp">
                    <input
                      style={S.input}
                      value={empresa?.telefono || ""}
                      onChange={(e) =>
                        actualizarEmpresa(
                          "telefono",
                          e.target.value
                        )
                      }
                    />
                  </Campo>

                  <Campo label="Correo">
                    <input
                      style={S.input}
                      type="email"
                      value={empresa?.correo || ""}
                      onChange={(e) =>
                        actualizarEmpresa(
                          "correo",
                          e.target.value
                        )
                      }
                    />
                  </Campo>
                </div>

                <Campo label="Tipo de negocio">
                  <input
                    style={S.input}
                    value={empresa?.tipo_negocio || ""}
                    onChange={(e) =>
                      actualizarEmpresa(
                        "tipo_negocio",
                        e.target.value
                      )
                    }
                  />
                </Campo>

                {(agendaBasica || salonBelleza) && (
                  <Campo label="Descripción pública">
                    <textarea
                      style={S.textarea}
                      value={
                        empresa?.descripcion_publica || ""
                      }
                      onChange={(e) =>
                        actualizarEmpresa(
                          "descripcion_publica",
                          e.target.value
                        )
                      }
                      placeholder="Cuéntale brevemente al cliente sobre tu negocio."
                    />
                  </Campo>
                )}

                <Campo label="Dirección">
                  <textarea
                    style={S.textarea}
                    value={empresa?.direccion || ""}
                    onChange={(e) =>
                      actualizarEmpresa(
                        "direccion",
                        e.target.value
                      )
                    }
                  />
                </Campo>

                <button
                  style={S.primary}
                  onClick={guardarEmpresa}
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar negocio"}
                </button>
              </Card>
            )}

            {/* =====================================================
                KONAX AGENDA $10 · SERVICIOS
            ====================================================== */}

            {seccion === "servicios" && agendaBasica && (
              <>
                <Card
                  titulo={
                    servicioEditandoId
                      ? "Editar servicio"
                      : "Nuevo servicio"
                  }
                  descripcion="Configura los servicios que el cliente podrá seleccionar al reservar."
                  icono="✦"
                >
                  <Campo label="Nombre del servicio *">
                    <input
                      style={S.input}
                      value={formServicio.nombre}
                      onChange={(e) =>
                        setFormServicio((p) => ({
                          ...p,
                          nombre: e.target.value,
                        }))
                      }
                      placeholder="Ej. Corte de cabello"
                    />
                  </Campo>

                  <div
                    style={S.twoCols}
                    className="two-cols"
                  >
                    <Campo label="Precio">
                      <input
                        style={S.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={formServicio.precio}
                        onChange={(e) =>
                          setFormServicio((p) => ({
                            ...p,
                            precio: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                      />
                    </Campo>

                    <Campo label="Duración (minutos)">
                      <input
                        style={S.input}
                        type="number"
                        min="5"
                        step="5"
                        value={
                          formServicio.duracion_minutos
                        }
                        onChange={(e) =>
                          setFormServicio((p) => ({
                            ...p,
                            duracion_minutos:
                              e.target.value,
                          }))
                        }
                      />
                    </Campo>

                    <Campo label="Estado">
                      <select
                        style={S.input}
                        value={
                          formServicio.activo
                            ? "Activo"
                            : "Inactivo"
                        }
                        onChange={(e) =>
                          setFormServicio((p) => ({
                            ...p,
                            activo:
                              e.target.value ===
                              "Activo",
                          }))
                        }
                      >
                        <option>Activo</option>
                        <option>Inactivo</option>
                      </select>
                    </Campo>
                  </div>

                  <Campo label="Descripción">
                    <textarea
                      style={S.textarea}
                      value={formServicio.descripcion}
                      onChange={(e) =>
                        setFormServicio((p) => ({
                          ...p,
                          descripcion: e.target.value,
                        }))
                      }
                      placeholder="Descripción breve del servicio."
                    />
                  </Campo>

                  <div style={S.actions}>
                    <button
                      style={S.primary}
                      onClick={guardarServicioAgenda}
                      disabled={guardandoServicioAgenda}
                    >
                      {guardandoServicioAgenda
                        ? "Guardando..."
                        : servicioEditandoId
                        ? "Actualizar servicio"
                        : "Crear servicio"}
                    </button>

                    {servicioEditandoId && (
                      <button
                        style={S.secondary}
                        onClick={limpiarServicioAgenda}
                      >
                        Cancelar edición
                      </button>
                    )}
                  </div>
                </Card>

                <div style={{ height: 16 }} />

                <Card
                  titulo="Servicios configurados"
                  descripcion="Estos servicios estarán disponibles para tu agenda y sitio de reservas."
                  icono="📋"
                >
                  {cargandoServiciosAgenda ? (
                    <p style={S.muted}>
                      Cargando servicios...
                    </p>
                  ) : serviciosAgenda.length === 0 ? (
                    <div style={S.empty}>
                      Todavía no hay servicios creados.
                    </div>
                  ) : (
                    <div style={S.listGrid}>
                      {serviciosAgenda.map((servicio) => (
                        <article
                          key={servicio.id}
                          style={S.listCard}
                        >
                          <div>
                            <div style={S.rowBetween}>
                              <strong>
                                {servicio.nombre}
                              </strong>

                              <span
                                style={
                                  servicio.activo
                                    ? S.badgeActive
                                    : S.badgeInactive
                                }
                              >
                                {servicio.activo
                                  ? "Activo"
                                  : "Inactivo"}
                              </span>
                            </div>

                            <div style={S.serviceMeta}>
                              <span>
                                B/.{" "}
                                {Number(
                                  servicio.precio || 0
                                ).toFixed(2)}
                              </span>

                              <span>
                                {Number(
                                  servicio.duracion_minutos ||
                                    60
                                )}{" "}
                                min
                              </span>
                            </div>

                            {servicio.descripcion && (
                              <p style={S.mutedSmall}>
                                {servicio.descripcion}
                              </p>
                            )}
                          </div>

                          <div style={S.actions}>
                            <button
                              style={S.darkSmall}
                              onClick={() =>
                                editarServicioAgenda(
                                  servicio
                                )
                              }
                            >
                              Editar
                            </button>

                            <button
                              style={
                                servicio.activo
                                  ? S.warningSmall
                                  : S.successSmall
                              }
                              onClick={() =>
                                cambiarEstadoServicioAgenda(
                                  servicio
                                )
                              }
                            >
                              {servicio.activo
                                ? "Desactivar"
                                : "Activar"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* =====================================================
                PROFESIONALES · Belleza completa y Agenda $10
            ====================================================== */}

            {seccion === "profesionales" &&
              puedeUsarProfesionales && (
                <>
                  <Card
                    titulo={
                      profesionalEditandoId
                        ? "Editar profesional"
                        : "Nuevo profesional"
                    }
                    descripcion="Configura quién atiende, su foto y los servicios que puede realizar."
                    icono="👥"
                  >
                    <div
                      style={S.profHeader}
                      className="prof-header"
                    >
                      <div style={S.profPhoto}>
                        {formProfesional.foto_url ? (
                          <img
                            src={
                              formProfesional.foto_url
                            }
                            alt="Profesional"
                            style={S.cover}
                          />
                        ) : (
                          <span style={S.profInitial}>
                            {String(
                              formProfesional.nombre ||
                                "P"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div>
                        <strong style={{ fontSize: 17 }}>
                          Foto del profesional
                        </strong>

                        <p style={S.muted}>
                          La foto ayudará al cliente a
                          identificar quién lo atenderá.
                        </p>

                        <label style={S.greenLabel}>
                          {subiendoFotoProfesional
                            ? "Subiendo..."
                            : formProfesional.foto_url
                            ? "Cambiar foto"
                            : "Subir foto"}

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={
                              subirFotoProfesional
                            }
                            style={{
                              display: "none",
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div
                      style={S.twoCols}
                      className="two-cols"
                    >
                      <Campo label="Nombre *">
                        <input
                          style={S.input}
                          value={
                            formProfesional.nombre
                          }
                          onChange={(e) =>
                            actualizarProfesional(
                              "nombre",
                              e.target.value
                            )
                          }
                          placeholder="Ej. Ana López"
                        />
                      </Campo>

                      <Campo label="Especialidad">
                        <input
                          style={S.input}
                          value={
                            formProfesional.especialidad
                          }
                          onChange={(e) =>
                            actualizarProfesional(
                              "especialidad",
                              e.target.value
                            )
                          }
                          placeholder="Ej. Estilista / Barbero"
                        />
                      </Campo>

                      <Campo label="Teléfono">
                        <input
                          style={S.input}
                          value={
                            formProfesional.telefono
                          }
                          onChange={(e) =>
                            actualizarProfesional(
                              "telefono",
                              e.target.value
                            )
                          }
                        />
                      </Campo>

                      <Campo label="Correo">
                        <input
                          style={S.input}
                          type="email"
                          value={
                            formProfesional.correo
                          }
                          onChange={(e) =>
                            actualizarProfesional(
                              "correo",
                              e.target.value
                            )
                          }
                        />
                      </Campo>

                      <Campo label="Estado">
                        <select
                          style={S.input}
                          value={
                            formProfesional.activo
                              ? "Activo"
                              : "Inactivo"
                          }
                          onChange={(e) =>
                            actualizarProfesional(
                              "activo",
                              e.target.value ===
                                "Activo"
                            )
                          }
                        >
                          <option>Activo</option>
                          <option>Inactivo</option>
                        </select>
                      </Campo>
                    </div>

                    <Campo label="Servicios que realiza">
                      {serviciosSalon.length === 0 ? (
                        <div style={S.empty}>
                          Primero crea por lo menos
                          un servicio.
                        </div>
                      ) : (
                        <div className="service-grid">
                          {serviciosSalon.map(
                            (servicio) => {
                              const activo =
                                formProfesional.servicio_ids.includes(
                                  String(
                                    servicio.id
                                  )
                                );

                              return (
                                <button
                                  key={servicio.id}
                                  type="button"
                                  style={
                                    activo
                                      ? S.serviceActive
                                      : S.service
                                  }
                                  onClick={() =>
                                    alternarServicio(
                                      servicio.id
                                    )
                                  }
                                >
                                  {activo
                                    ? "✓"
                                    : "+"}{" "}
                                  {servicio.nombre}
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}
                    </Campo>

                    <div style={S.actions}>
                      <button
                        style={S.primary}
                        onClick={guardarProfesional}
                        disabled={guardandoProfesional}
                      >
                        {guardandoProfesional
                          ? "Guardando..."
                          : profesionalEditandoId
                          ? "Actualizar profesional"
                          : "Crear profesional"}
                      </button>

                      {profesionalEditandoId && (
                        <button
                          style={S.secondary}
                          onClick={
                            limpiarProfesional
                          }
                        >
                          Cancelar edición
                        </button>
                      )}
                    </div>
                  </Card>

                  <div style={{ height: 16 }} />

                  <Card
                    titulo="Equipo"
                    descripcion="Profesionales disponibles para la agenda."
                    icono="👥"
                  >
                    {cargandoProfesionales ? (
                      <p style={S.muted}>
                        Cargando profesionales...
                      </p>
                    ) : profesionales.length === 0 ? (
                      <div style={S.empty}>
                        Todavía no hay
                        profesionales registrados.
                      </div>
                    ) : (
                      <div className="prof-list">
                        {profesionales.map((prof) => {
                          const nombres =
                            serviciosSalon
                              .filter(
                                (servicio) =>
                                  Array.isArray(
                                    prof.servicio_ids
                                  ) &&
                                  prof.servicio_ids
                                    .map(String)
                                    .includes(
                                      String(
                                        servicio.id
                                      )
                                    )
                              )
                              .map(
                                (servicio) =>
                                  servicio.nombre
                              );

                          return (
                            <article
                              key={prof.id}
                              style={S.profCard}
                              className="prof-card"
                            >
                              <div
                                style={S.profCardTop}
                                className="prof-card-top"
                              >
                                <div
                                  style={S.profAvatar}
                                >
                                  {prof.foto_url ? (
                                    <img
                                      src={
                                        prof.foto_url
                                      }
                                      alt={
                                        prof.nombre
                                      }
                                      style={
                                        S.cover
                                      }
                                    />
                                  ) : (
                                    String(
                                      prof.nombre ||
                                        "P"
                                    )
                                      .charAt(0)
                                      .toUpperCase()
                                  )}
                                </div>

                                <div
                                  style={{
                                    minWidth: 0,
                                  }}
                                >
                                  <strong>
                                    {prof.nombre}
                                  </strong>

                                  <span
                                    style={
                                      S.profSpec
                                    }
                                  >
                                    {prof.especialidad ||
                                      "Sin especialidad definida"}
                                  </span>
                                </div>

                                <span
                                  style={
                                    prof.activo
                                      ? S.badgeActive
                                      : S.badgeInactive
                                  }
                                >
                                  {prof.activo
                                    ? "Activo"
                                    : "Inactivo"}
                                </span>
                              </div>

                              <p
                                style={
                                  S.mutedSmall
                                }
                              >
                                {nombres.length
                                  ? nombres.join(
                                      " · "
                                    )
                                  : "Sin servicios asignados"}
                              </p>

                              <div
                                style={S.actions}
                              >
                                <button
                                  style={
                                    S.darkSmall
                                  }
                                  onClick={() =>
                                    editarProfesional(
                                      prof
                                    )
                                  }
                                >
                                  Editar
                                </button>

                                <button
                                  style={
                                    prof.activo
                                      ? S.warningSmall
                                      : S.successSmall
                                  }
                                  onClick={() =>
                                    cambiarEstadoProfesional(
                                      prof
                                    )
                                  }
                                >
                                  {prof.activo
                                    ? "Desactivar"
                                    : "Activar"}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </>
              )}

            {/* =====================================================
                KONAX AGENDA $10 · HORARIOS
            ====================================================== */}

            {seccion === "horarios" && agendaBasica && (
              <>
                <Card
                  titulo={
                    horarioEditandoId
                      ? "Editar horario"
                      : "Nuevo horario"
                  }
                  descripcion="Define cuándo puede reservarse cada servicio y quién lo atiende."
                  icono="◷"
                >
                  <div
                    style={S.twoCols}
                    className="two-cols"
                  >
                    <Campo label="Servicio *">
                      <select
                        style={S.input}
                        value={
                          formHorario.servicio_id
                        }
                        onChange={(e) =>
                          setFormHorario((p) => ({
                            ...p,
                            servicio_id:
                              e.target.value,
                          }))
                        }
                      >
                        <option value="">
                          Seleccione
                        </option>

                        {serviciosAgenda
                          .filter(
                            (servicio) =>
                              servicio.activo !== false
                          )
                          .map((servicio) => (
                            <option
                              key={servicio.id}
                              value={servicio.id}
                            >
                              {servicio.nombre}
                            </option>
                          ))}
                      </select>
                    </Campo>

                    <Campo label="Profesional">
                      <select
                        style={S.input}
                        value={
                          formHorario.profesional_id
                        }
                        onChange={(e) =>
                          setFormHorario((p) => ({
                            ...p,
                            profesional_id:
                              e.target.value,
                          }))
                        }
                      >
                        <option value="">
                          Sin profesional específico
                        </option>

                        {profesionales
                          .filter(
                            (prof) =>
                              prof.activo !== false
                          )
                          .map((prof) => (
                            <option
                              key={prof.id}
                              value={prof.id}
                            >
                              {prof.nombre}
                            </option>
                          ))}
                      </select>
                    </Campo>

                    <Campo label="Día">
                      <select
                        style={S.input}
                        value={formHorario.dia_semana}
                        onChange={(e) =>
                          setFormHorario((p) => ({
                            ...p,
                            dia_semana: Number(
                              e.target.value
                            ),
                          }))
                        }
                      >
                        {DIAS.map((dia) => (
                          <option
                            key={dia.valor}
                            value={dia.valor}
                          >
                            {dia.nombre}
                          </option>
                        ))}
                      </select>
                    </Campo>

                    <Campo label="Hora de inicio">
                      <input
                        style={S.input}
                        type="time"
                        value={
                          formHorario.hora_inicio
                        }
                        onChange={(e) =>
                          setFormHorario((p) => ({
                            ...p,
                            hora_inicio:
                              e.target.value,
                          }))
                        }
                      />
                    </Campo>

                    <Campo label="Hora de fin">
                      <input
                        style={S.input}
                        type="time"
                        value={
                          formHorario.hora_fin
                        }
                        onChange={(e) =>
                          setFormHorario((p) => ({
                            ...p,
                            hora_fin:
                              e.target.value,
                          }))
                        }
                      />
                    </Campo>

                    <Campo label="Cupos simultáneos">
                      <input
                        style={S.input}
                        type="number"
                        min="1"
                        value={
                          formHorario.capacidad
                        }
                        onChange={(e) =>
                          setFormHorario((p) => ({
                            ...p,
                            capacidad:
                              e.target.value,
                          }))
                        }
                      />
                    </Campo>

                    <Campo label="Disponible desde">
                      <input
                        style={S.input}
                        type="date"
                        value={
                          formHorario.fecha_desde
                        }
                        onChange={(e) =>
                          setFormHorario((p) => ({
                            ...p,
                            fecha_desde:
                              e.target.value,
                          }))
                        }
                      />
                    </Campo>

                    <Campo label="Disponible hasta">
                      <input
                        style={S.input}
                        type="date"
                        value={
                          formHorario.fecha_hasta
                        }
                        onChange={(e) =>
                          setFormHorario((p) => ({
                            ...p,
                            fecha_hasta:
                              e.target.value,
                          }))
                        }
                      />
                    </Campo>

                    <Campo label="Estado">
                      <select
                        style={S.input}
                        value={
                          formHorario.activo
                            ? "Activo"
                            : "Inactivo"
                        }
                        onChange={(e) =>
                          setFormHorario((p) => ({
                            ...p,
                            activo:
                              e.target.value ===
                              "Activo",
                          }))
                        }
                      >
                        <option>Activo</option>
                        <option>Inactivo</option>
                      </select>
                    </Campo>
                  </div>

                  <div style={S.actions}>
                    <button
                      style={S.primary}
                      onClick={guardarHorarioAgenda}
                      disabled={
                        guardandoHorarioAgenda
                      }
                    >
                      {guardandoHorarioAgenda
                        ? "Guardando..."
                        : horarioEditandoId
                        ? "Actualizar horario"
                        : "Crear horario"}
                    </button>

                    {horarioEditandoId && (
                      <button
                        style={S.secondary}
                        onClick={limpiarHorarioAgenda}
                      >
                        Cancelar edición
                      </button>
                    )}
                  </div>
                </Card>

                <div style={{ height: 16 }} />

                <Card
                  titulo="Horarios configurados"
                  descripcion="KONAX utilizará estos bloques para calcular disponibilidad."
                  icono="▣"
                >
                  {cargandoHorariosAgenda ? (
                    <p style={S.muted}>
                      Cargando horarios...
                    </p>
                  ) : horariosAgenda.length === 0 ? (
                    <div style={S.empty}>
                      Todavía no hay horarios
                      configurados.
                    </div>
                  ) : (
                    <div style={S.listGrid}>
                      {horariosAgenda.map((horario) => {
                        const servicio =
                          serviciosAgenda.find(
                            (item) =>
                              String(item.id) ===
                              String(
                                horario.servicio_id
                              )
                          );

                        return (
                          <article
                            key={horario.id}
                            style={S.listCard}
                          >
                            <div>
                              <div
                                style={S.rowBetween}
                              >
                                <strong>
                                  {nombreDia(
                                    horario.dia_semana
                                  )}
                                </strong>

                                <span
                                  style={
                                    horario.activo
                                      ? S.badgeActive
                                      : S.badgeInactive
                                  }
                                >
                                  {horario.activo
                                    ? "Activo"
                                    : "Inactivo"}
                                </span>
                              </div>

                              <p
                                style={{
                                  margin:
                                    "8px 0 2px",
                                  fontWeight: 800,
                                }}
                              >
                                {servicio?.nombre ||
                                  "Servicio"}
                              </p>

                              <p style={S.mutedSmall}>
                                {horaCorta(
                                  horario.hora_inicio
                                )}{" "}
                                -{" "}
                                {horaCorta(
                                  horario.hora_fin
                                )}
                                {horario.instructor
                                  ? ` · ${horario.instructor}`
                                  : ""}
                              </p>
                            </div>

                            <div style={S.actions}>
                              <button
                                style={S.darkSmall}
                                onClick={() =>
                                  editarHorarioAgenda(
                                    horario
                                  )
                                }
                              >
                                Editar
                              </button>

                              <button
                                style={
                                  horario.activo
                                    ? S.warningSmall
                                    : S.successSmall
                                }
                                onClick={() =>
                                  cambiarEstadoHorarioAgenda(
                                    horario
                                  )
                                }
                              >
                                {horario.activo
                                  ? "Desactivar"
                                  : "Activar"}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* =====================================================
                KONAX AGENDA $10 · SITIO DE RESERVAS
            ====================================================== */}

            {seccion === "sitio-reservas" &&
              agendaBasica && (
                <Card
                  titulo="Mi sitio de reservas"
                  descripcion="Este es tu enlace propio incluido en KONAX Agenda. Las reservas de este enlace son directas del negocio."
                  icono="↗"
                >
                  {cargandoPortal ? (
                    <p style={S.muted}>
                      Cargando sitio...
                    </p>
                  ) : (
                    <>
                      <div style={S.portalHero}>
                        <div>
                          <span style={S.portalEyebrow}>
                            TU SITIO PERSONALIZADO
                          </span>

                          <h3
                            style={{
                              margin:
                                "6px 0 8px",
                              fontSize: 24,
                            }}
                          >
                            {empresa?.nombre ||
                              "Mi negocio"}
                          </h3>

                          <p style={S.muted}>
                            Compártelo en Instagram,
                            WhatsApp, Google o QR para que
                            tus clientes reserven.
                          </p>
                        </div>

                        <span
                          style={
                            portalConfig.activo
                              ? S.portalOnline
                              : S.portalOffline
                          }
                        >
                          {portalConfig.activo
                            ? "Publicado"
                            : "Desactivado"}
                        </span>
                      </div>

                      <Campo label="Título público">
                        <input
                          style={S.input}
                          value={
                            portalConfig.titulo_publico
                          }
                          onChange={(e) =>
                            setPortalConfig((p) => ({
                              ...p,
                              titulo_publico:
                                e.target.value,
                            }))
                          }
                          placeholder={
                            empresa?.nombre ||
                            "Nombre público"
                          }
                        />
                      </Campo>

                      <Campo label="Enlace personalizado">
                        <div
                          style={S.slugInput}
                          className="slug-input"
                        >
                          <span>
                            /reservar/
                          </span>

                          <input
                            style={S.slugField}
                            value={portalConfig.slug}
                            onChange={(e) =>
                              setPortalConfig((p) => ({
                                ...p,
                                slug: normalizar(
                                  e.target.value
                                )
                                  .replace(
                                    /_/g,
                                    "-"
                                  )
                                  .replace(
                                    /[^a-z0-9-]/g,
                                    ""
                                  ),
                              }))
                            }
                            placeholder="mi-negocio"
                          />
                        </div>
                      </Campo>

                      <label style={S.portalToggle}>
                        <input
                          type="checkbox"
                          checked={portalConfig.activo}
                          onChange={(e) =>
                            setPortalConfig((p) => ({
                              ...p,
                              activo:
                                e.target.checked,
                            }))
                          }
                        />

                        <span>
                          <strong>
                            Reservas online activas
                          </strong>

                          <small>
                            Si lo desactivas, tu enlace
                            dejará de aceptar nuevas
                            reservas.
                          </small>
                        </span>
                      </label>

                      <div style={S.portalLinkBox}>
                        <span>ENLACE PÚBLICO</span>
                        <strong>
                          {obtenerEnlacePortal() ||
                            "Configura tu enlace"}
                        </strong>
                      </div>

                      <div style={S.actions}>
                        <button
                          style={S.primary}
                          onClick={guardarPortalAgenda}
                          disabled={guardandoPortal}
                        >
                          {guardandoPortal
                            ? "Guardando..."
                            : "Guardar sitio"}
                        </button>

                        <button
                          style={S.secondary}
                          onClick={copiarEnlacePortal}
                          disabled={!portalConfig.slug}
                        >
                          Copiar enlace
                        </button>

                        <button
                          style={S.secondary}
                          onClick={
                            compartirPortalWhatsApp
                          }
                          disabled={!portalConfig.slug}
                        >
                          Compartir por WhatsApp
                        </button>

                        <button
                          style={S.secondary}
                          onClick={abrirPortal}
                          disabled={!portalConfig.slug}
                        >
                          Ver mi sitio ↗
                        </button>
                      </div>

                      <div style={S.directNotice}>
                        <strong>
                          Reserva directa del negocio
                        </strong>

                        <span>
                          Este enlace forma parte de tu
                          plan KONAX Agenda. No es el
                          marketplace KONAX Negocios.
                        </span>
                      </div>
                    </>
                  )}
                </Card>
              )}

            {/* =====================================================
                GIMNASIO EXISTENTE
            ====================================================== */}

            {seccion === "planes_membresia" &&
              gimnasio &&
              !agendaBasica && (
                <>
                  <Card
                    titulo={
                      planEditandoId
                        ? "Editar plan de membresía"
                        : "Crear plan de membresía"
                    }
                    descripcion="Configura los planes que podrás asignar a los alumnos."
                    icono="🏷️"
                  >
                    <div
                      style={S.twoCols}
                      className="two-cols"
                    >
                      <Campo label="Nombre del plan *">
                        <input
                          style={S.input}
                          value={formPlan.nombre}
                          onChange={(e) =>
                            actualizarPlan(
                              "nombre",
                              e.target.value
                            )
                          }
                        />
                      </Campo>

                      <Campo label="Precio *">
                        <input
                          style={S.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={formPlan.precio}
                          onChange={(e) =>
                            actualizarPlan(
                              "precio",
                              e.target.value
                            )
                          }
                        />
                      </Campo>

                      <Campo label="Periodicidad">
                        <select
                          style={S.input}
                          value={
                            formPlan.periodicidad
                          }
                          onChange={(e) =>
                            actualizarPlan(
                              "periodicidad",
                              e.target.value
                            )
                          }
                        >
                          {[
                            "Diaria",
                            "Semanal",
                            "Quincenal",
                            "Mensual",
                            "Trimestral",
                            "Semestral",
                            "Anual",
                          ].map((x) => (
                            <option key={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </Campo>

                      <Campo label="Duración">
                        <input
                          style={S.input}
                          type="number"
                          min="1"
                          value={
                            formPlan.duracion_cantidad
                          }
                          onChange={(e) =>
                            actualizarPlan(
                              "duracion_cantidad",
                              e.target.value
                            )
                          }
                        />
                      </Campo>

                      <Campo label="Unidad de duración">
                        <select
                          style={S.input}
                          value={
                            formPlan.duracion_unidad
                          }
                          onChange={(e) =>
                            actualizarPlan(
                              "duracion_unidad",
                              e.target.value
                            )
                          }
                        >
                          {[
                            "Días",
                            "Semanas",
                            "Meses",
                            "Años",
                          ].map((x) => (
                            <option key={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </Campo>

                      <Campo label="Avisar antes de vencer (días)">
                        <input
                          style={S.input}
                          type="number"
                          min="0"
                          value={
                            formPlan.dias_aviso
                          }
                          onChange={(e) =>
                            actualizarPlan(
                              "dias_aviso",
                              e.target.value
                            )
                          }
                        />
                      </Campo>

                      <Campo label="Días de gracia">
                        <input
                          style={S.input}
                          type="number"
                          min="0"
                          value={
                            formPlan.dias_gracia
                          }
                          onChange={(e) =>
                            actualizarPlan(
                              "dias_gracia",
                              e.target.value
                            )
                          }
                        />
                      </Campo>

                      <Campo label="Estado">
                        <select
                          style={S.input}
                          value={
                            formPlan.activo
                              ? "Activo"
                              : "Inactivo"
                          }
                          onChange={(e) =>
                            actualizarPlan(
                              "activo",
                              e.target.value ===
                                "Activo"
                            )
                          }
                        >
                          <option>Activo</option>
                          <option>Inactivo</option>
                        </select>
                      </Campo>
                    </div>

                    <Campo label="Descripción">
                      <textarea
                        style={S.textarea}
                        value={
                          formPlan.descripcion
                        }
                        onChange={(e) =>
                          actualizarPlan(
                            "descripcion",
                            e.target.value
                          )
                        }
                      />
                    </Campo>

                    <div style={S.actions}>
                      <button
                        style={S.primary}
                        onClick={
                          guardarPlanMembresia
                        }
                      >
                        {guardandoPlan
                          ? "Guardando..."
                          : planEditandoId
                          ? "Actualizar plan"
                          : "Crear plan"}
                      </button>

                      {planEditandoId && (
                        <button
                          style={S.secondary}
                          onClick={limpiarPlan}
                        >
                          Cancelar edición
                        </button>
                      )}
                    </div>
                  </Card>

                  <div style={{ height: 16 }} />

                  <Card
                    titulo="Planes configurados"
                    descripcion="Los planes activos aparecen al asignar una nueva membresía."
                    icono="📋"
                  >
                    {cargandoPlanes ? (
                      <p style={S.muted}>
                        Cargando planes...
                      </p>
                    ) : planes.length === 0 ? (
                      <div style={S.empty}>
                        No hay planes de membresía
                        configurados todavía.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        {planes.map((plan) => (
                          <article
                            key={plan.id}
                            style={S.planCard}
                          >
                            <div>
                              <strong>
                                {plan.nombre}
                              </strong>

                              <div
                                style={S.planPrice}
                              >
                                B/.{" "}
                                {Number(
                                  plan.precio || 0
                                ).toFixed(2)}
                              </div>

                              <p
                                style={
                                  S.mutedSmall
                                }
                              >
                                {Number(
                                  plan.duracion_cantidad ||
                                    1
                                )}{" "}
                                {plan.duracion_unidad ||
                                  "Meses"}{" "}
                                ·{" "}
                                {plan.periodicidad ||
                                  "Mensual"}
                              </p>
                            </div>

                            <div
                              style={S.actions}
                            >
                              <button
                                style={S.darkSmall}
                                onClick={() =>
                                  editarPlan(plan)
                                }
                              >
                                Editar
                              </button>

                              <button
                                style={
                                  plan.activo
                                    ? S.warningSmall
                                    : S.successSmall
                                }
                                onClick={() =>
                                  cambiarEstadoPlan(
                                    plan
                                  )
                                }
                              >
                                {plan.activo
                                  ? "Desactivar"
                                  : "Activar"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              )}

            {seccion === "plan" && (
              <Card
                titulo="Mi plan KONAX"
                descripcion="Resumen del plan activo contratado en KONAX."
                icono="💼"
              >
                <div style={S.planBox}>
                  <div>
                    <p style={S.muted}>
                      Plan actual
                    </p>

                    <h2>
                      {agendaBasica
                        ? "KONAX Agenda"
                        : empresa?.plan_nombre ||
                          "Sin plan"}
                    </h2>

                    <p style={S.muted}>
                      {agendaBasica
                        ? "Agenda, servicios, profesionales, horarios y sitio de reservas."
                        : "Los cambios del plan KONAX y sus módulos son administrados por KONAX."}
                    </p>
                  </div>

                  <span style={S.badgeBlue}>
                    {empresa?.estado_plan ||
                      empresa?.estado ||
                      "Activo"}
                  </span>
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Resumen({
  titulo,
  valor,
  icono,
}) {
  return (
    <div style={S.summaryCard}>
      <span style={{ fontSize: 25 }}>{icono}</span>
      <p style={S.summaryTitle}>{titulo}</p>
      <h3 style={S.summaryValue}>{valor}</h3>
    </div>
  );
}

function Grupo({ titulo }) {
  return <p style={S.group}>{titulo}</p>;
}

function Separador() {
  return <div style={S.separator} />;
}

function Item({
  texto,
  icono,
  activo,
  onClick,
}) {
  return (
    <button
      type="button"
      style={activo ? S.itemActive : S.item}
      onClick={onClick}
    >
      <span>{icono}</span>
      <span>{texto}</span>
    </button>
  );
}

function Card({
  titulo,
  descripcion,
  icono,
  children,
}) {
  return (
    <section
      style={S.card}
      className="config-card"
    >
      <div style={S.cardHead}>
        <div style={S.cardIcon}>{icono}</div>

        <div>
          <h2 style={{ margin: 0 }}>{titulo}</h2>
          <p style={S.muted}>{descripcion}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

const CSS = `
  .config-page,
  .config-page * {
    box-sizing: border-box;
  }

  .service-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit,minmax(150px,1fr));
    gap: 8px;
  }

  .prof-list {
    display: grid;
    grid-template-columns: repeat(auto-fit,minmax(260px,1fr));
    gap: 12px;
  }

  .slug-input {
    display: grid;
    grid-template-columns: auto minmax(0,1fr);
  }

  @media(max-width:900px) {
    html,
    body {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }

    .config-page {
      padding: 10px !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }

    .config-hero {
      display: grid !important;
      grid-template-columns: 1fr !important;
      padding: 16px !important;
      gap: 14px !important;
    }

    .config-hero-left {
      display: grid !important;
      grid-template-columns: 72px minmax(0,1fr) !important;
      gap: 12px !important;
    }

    .config-hero-left img {
      width: 72px !important;
    }

    .config-resumen {
      grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    }

    .config-layout {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }

    .config-menu {
      min-height: auto !important;
      padding: 14px !important;
    }

    .config-card {
      padding: 16px !important;
    }

    .two-cols,
    .logo-box,
    .prof-header {
      grid-template-columns: 1fr !important;
    }

    .prof-list {
      grid-template-columns: minmax(0,1fr) !important;
      width: 100% !important;
      min-width: 0 !important;
    }

    .prof-list > * {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    .prof-card {
      overflow: hidden !important;
      padding: 13px !important;
    }

    .prof-card-top {
      grid-template-columns: 50px minmax(0,1fr) !important;
      gap: 9px !important;
      min-width: 0 !important;
    }

    .prof-card-top > div:nth-child(2) {
      min-width: 0 !important;
    }

    .prof-card-top > span:last-child {
      grid-column: 2 !important;
      justify-self: start !important;
      margin-top: 2px !important;
    }

    .service-grid {
      grid-template-columns: repeat(2,minmax(0,1fr)) !important;
      width: 100% !important;
      min-width: 0 !important;
    }

    .service-grid > button {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 42px !important;
      padding: 8px 9px !important;
      font-size: 11px !important;
      overflow-wrap: anywhere !important;
    }

    .prof-header {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      overflow: hidden !important;
      padding: 12px !important;
    }

    .prof-header > div:last-child {
      min-width: 0 !important;
    }

    .slug-input {
      grid-template-columns: 1fr !important;
    }

    .config-page input,
    .config-page select,
    .config-page textarea {
      font-size: 16px !important;
    }
  }

  @media(max-width:390px) {
    .config-resumen {
      grid-template-columns: 1fr !important;
    }

    .service-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;

const S = {
  loadingPage: {
    minHeight: "100vh",
    background: "#eef2f7",
    display: "grid",
    placeItems: "center",
    fontFamily: "Arial,sans-serif",
  },

  loadingCard: {
    background: "#fff",
    padding: 28,
    borderRadius: 18,
    boxShadow: "0 8px 26px rgba(0,0,0,.10)",
    textAlign: "center",
  },

  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#eef2f7 0%,#f8fafc 45%,#ecfdf5 100%)",
    padding: 24,
    fontFamily: "Arial,sans-serif",
    color: "#111827",
  },

  container: {
    maxWidth: 1450,
    margin: "0 auto",
  },

  hero: {
    background:
      "linear-gradient(135deg,#111827,#064e3b)",
    color: "#fff",
    padding: 26,
    borderRadius: 24,
    marginBottom: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    boxShadow: "0 12px 32px rgba(0,0,0,.18)",
  },

  heroLeft: {
    display: "flex",
    alignItems: "center",
    gap: 18,
  },

  heroLogo: {
    width: 95,
    background: "#fff",
    padding: 9,
    borderRadius: 18,
  },

  eyebrow: {
    margin: 0,
    color: "#bbf7d0",
    fontSize: 13,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".08em",
  },

  title: {
    margin: "4px 0",
    fontSize: 38,
  },

  subtitle: {
    margin: 0,
    color: "#dcfce7",
  },

  back: {
    background: "#fff",
    color: "#111827",
    border: 0,
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 800,
    cursor: "pointer",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 14,
    marginBottom: 18,
  },

  summaryCard: {
    background: "rgba(255,255,255,.88)",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 4px 16px rgba(0,0,0,.06)",
  },

  summaryTitle: {
    color: "#6b7280",
    margin: "8px 0 4px",
    fontSize: 13,
    fontWeight: 800,
  },

  summaryValue: {
    margin: 0,
    fontSize: 20,
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0,1fr)",
    gap: 22,
  },

  menu: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    padding: 20,
    borderRadius: 22,
    minHeight: 640,
    boxShadow: "0 6px 20px rgba(0,0,0,.06)",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#f9fafb",
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
  },

  menuLogo: {
    width: 55,
    background: "#fff",
    padding: 7,
    borderRadius: 14,
  },

  group: {
    color: "#6b7280",
    fontSize: 14,
    margin: "14px 0 10px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".06em",
  },

  item: {
    width: "100%",
    background: "transparent",
    border: 0,
    textAlign: "left",
    padding: 14,
    borderRadius: 14,
    fontSize: 16,
    cursor: "pointer",
    color: "#374151",
    marginBottom: 8,
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  itemActive: {
    width: "100%",
    border: 0,
    textAlign: "left",
    padding: 14,
    borderRadius: 14,
    fontSize: 16,
    cursor: "pointer",
    marginBottom: 8,
    display: "flex",
    gap: 10,
    alignItems: "center",
    background:
      "linear-gradient(135deg,#ecfdf5,#f3f4f6)",
    color: "#064e3b",
    fontWeight: 800,
    boxShadow: "inset 4px 0 0 #16a34a",
  },

  separator: {
    height: 1,
    background: "#e5e7eb",
    margin: "22px 0",
  },

  card: {
    background: "#fff",
    padding: 28,
    borderRadius: 22,
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 26px rgba(0,0,0,.07)",
  },

  cardHead: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },

  cardIcon: {
    width: 52,
    height: 52,
    minWidth: 52,
    borderRadius: 16,
    background: "#ecfdf5",
    display: "grid",
    placeItems: "center",
    fontSize: 26,
  },

  label: {
    display: "block",
    marginBottom: 6,
    color: "#374151",
    fontWeight: 800,
    fontSize: 14,
  },

  input: {
    width: "100%",
    padding: 13,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    fontSize: 15,
    background: "#fff",
    color: "#111827",
  },

  textarea: {
    width: "100%",
    padding: 13,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    fontSize: 15,
    minHeight: 110,
    resize: "vertical",
  },

  twoCols: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 14,
  },

  primary: {
    background: "#111827",
    color: "#fff",
    border: 0,
    padding: "13px 22px",
    borderRadius: 12,
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 10,
  },

  secondary: {
    background: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    padding: "13px 22px",
    borderRadius: 12,
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 10,
  },

  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  logoBox: {
    marginBottom: 22,
    padding: 16,
    display: "grid",
    gridTemplateColumns: "120px minmax(0,1fr)",
    gap: 18,
    alignItems: "center",
    border: "1px solid #dfe6e2",
    borderRadius: 18,
    background: "#f9fbfa",
  },

  logoPreview: {
    width: 120,
    height: 120,
    display: "grid",
    placeItems: "center",
    border: "1px solid #d9e2dd",
    borderRadius: 18,
    background: "#fff",
    overflow: "hidden",
  },

  coverContain: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  cover: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  greenLabel: {
    minHeight: 40,
    padding: "0 14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    background: "#0b7041",
    color: "#fff",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
  },

  dangerLight: {
    minHeight: 40,
    padding: "0 14px",
    border: "1px solid #fecaca",
    borderRadius: 11,
    background: "#fff5f5",
    color: "#b42318",
    fontWeight: 900,
    cursor: "pointer",
  },

  profHeader: {
    marginBottom: 20,
    padding: 16,
    display: "grid",
    gridTemplateColumns: "128px minmax(0,1fr)",
    gap: 18,
    alignItems: "center",
    minWidth: 0,
    border: "1px solid #dfe6e2",
    borderRadius: 18,
    background: "#f9fbfa",
  },

  profPhoto: {
    width: 128,
    height: 128,
    borderRadius: "50%",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    background: "#e7f5ec",
    border: "4px solid #fff",
    boxShadow: "0 6px 16px rgba(16,72,43,.12)",
  },

  profInitial: {
    color: "#167044",
    fontSize: 42,
    fontWeight: 900,
  },

  service: {
    minHeight: 42,
    padding: "9px 11px",
    border: "1px solid #d7e0da",
    borderRadius: 11,
    background: "#fff",
    color: "#46534c",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "left",
  },

  serviceActive: {
    minHeight: 42,
    padding: "9px 11px",
    border: "1px solid #16834f",
    borderRadius: 11,
    background: "#e9f7ef",
    color: "#126c42",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "left",
  },

  profCard: {
    padding: 16,
    border: "1px solid #e1e8e4",
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 6px 16px rgba(22,72,45,.05)",
  },

  profCardTop: {
    display: "grid",
    gridTemplateColumns: "54px minmax(0,1fr) auto",
    gap: 11,
    alignItems: "center",
    minWidth: 0,
  },

  profAvatar: {
    width: 54,
    height: 54,
    borderRadius: "50%",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    background: "#e8f6ed",
    color: "#147344",
    fontWeight: 900,
    fontSize: 18,
  },

  profSpec: {
    display: "block",
    marginTop: 3,
    color: "#6b7280",
    fontSize: 11,
  },

  badgeActive: {
    padding: "5px 9px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 10,
    fontWeight: 900,
  },

  badgeInactive: {
    padding: "5px 9px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 10,
    fontWeight: 900,
  },

  darkSmall: {
    minHeight: 38,
    padding: "9px 12px",
    border: 0,
    borderRadius: 10,
    background: "#111827",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  warningSmall: {
    minHeight: 38,
    padding: "9px 12px",
    border: "1px solid #fed7aa",
    borderRadius: 10,
    background: "#fff7ed",
    color: "#c2410c",
    fontWeight: 800,
    cursor: "pointer",
  },

  successSmall: {
    minHeight: 38,
    padding: "9px 12px",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    background: "#f0fdf4",
    color: "#166534",
    fontWeight: 800,
    cursor: "pointer",
  },

  empty: {
    padding: 18,
    border: "1px dashed #cbd5e1",
    borderRadius: 14,
    background: "#f8fafc",
    color: "#64748b",
    textAlign: "center",
  },

  muted: {
    color: "#6b7280",
    lineHeight: 1.5,
  },

  mutedSmall: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 1.5,
  },

  planCard: {
    padding: 16,
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#f9fafb",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },

  planPrice: {
    marginTop: 7,
    color: "#166534",
    fontSize: 22,
    fontWeight: 900,
  },

  planBox: {
    background:
      "linear-gradient(135deg,#f9fafb,#ecfdf5)",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 22,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    flexWrap: "wrap",
  },

  badgeBlue: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "8px 15px",
    borderRadius: 999,
    fontWeight: 800,
    alignSelf: "flex-start",
  },

  listGrid: {
    display: "grid",
    gap: 12,
  },

  listCard: {
    padding: 16,
    border: "1px solid #e1e8e4",
    borderRadius: 16,
    background: "#fff",
    display: "grid",
    gap: 12,
  },

  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },

  serviceMeta: {
    marginTop: 9,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    color: "#0d704f",
    fontSize: 12,
    fontWeight: 900,
  },

  portalHero: {
    marginBottom: 20,
    padding: 18,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    border: "1px solid #dce9e2",
    borderRadius: 18,
    background:
      "linear-gradient(135deg,#f8fbf9,#eef9f3)",
  },

  portalEyebrow: {
    color: "#0d7b57",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: 1,
  },

  portalOnline: {
    padding: "7px 11px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 11,
    fontWeight: 900,
  },

  portalOffline: {
    padding: "7px 11px",
    borderRadius: 999,
    background: "#f3f4f6",
    color: "#6b7280",
    fontSize: 11,
    fontWeight: 900,
  },

  slugInput: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0,1fr)",
    alignItems: "center",
    overflow: "hidden",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    background: "#f8fafc",
  },

  slugField: {
    width: "100%",
    minWidth: 0,
    padding: 13,
    border: 0,
    outline: 0,
    background: "#fff",
    color: "#111827",
    fontSize: 15,
  },

  portalToggle: {
    marginBottom: 18,
    padding: 14,
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    border: "1px solid #dce9e2",
    borderRadius: 14,
    background: "#f8fbf9",
  },

  portalLinkBox: {
    marginBottom: 8,
    padding: 16,
    display: "grid",
    gap: 5,
    borderRadius: 14,
    background: "#111827",
    color: "#fff",
    overflowWrap: "anywhere",
  },

  directNotice: {
    marginTop: 22,
    padding: 15,
    display: "grid",
    gap: 5,
    border: "1px solid #cce8d8",
    borderRadius: 14,
    background: "#eef9f3",
    color: "#0d704f",
    fontSize: 12,
  },
};
