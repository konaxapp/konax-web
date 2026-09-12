"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabasePortalAlumno as supabase } from "../../../../lib/supabasePortalAlumno";

const VERSION = "2026.09.11-PORTAL-ALUMNO-V18-MENU-PERFIL-QR";
const BUCKET_PERFIL = "alumnos-perfil";

const MENU = [
  { id: "inicio", label: "Inicio", icon: "⌂" },
  { id: "clases", label: "Clases", icon: "▣" },
  { id: "reservas", label: "Mis reservas", icon: "◷" },
  { id: "whiteboard", label: "Whiteboard", icon: "W" },
  { id: "resultados", label: "Resultados", icon: "★" },
  { id: "configuracion", label: "Mi perfil", icon: "●" },
];

export default function PortalAlumnoInicio() {
  const params = useParams();
  const router = useRouter();

  const slug = String(params?.slug || "").trim();

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [cuenta, setCuenta] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [portalPublico, setPortalPublico] = useState(null);
  const [agendaSlug, setAgendaSlug] = useState("");

  const [fotoFirmada, setFotoFirmada] = useState("");
  const [mostrarEditor, setMostrarEditor] = useState(false);

  const [peso, setPeso] = useState("");
  const [estatura, setEstatura] = useState("");

  const [mensajePerfil, setMensajePerfil] = useState("");
  const [error, setError] = useState("");

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [seccion, setSeccion] = useState("inicio");

  const [serviciosWod, setServiciosWod] = useState([]);
  const [servicioWodId, setServicioWodId] = useState("");
  const [fechaWod, setFechaWod] = useState("");
  const [wodPublico, setWodPublico] = useState(null);
  const [cargandoWod, setCargandoWod] = useState(false);
  const [errorWod, setErrorWod] = useState("");

  const [fechaClases, setFechaClases] = useState("");
  const [clasesDisponibles, setClasesDisponibles] = useState([]);
  const [cargandoClases, setCargandoClases] = useState(false);
  const [errorClases, setErrorClases] = useState("");
  const [mensajeReserva, setMensajeReserva] = useState("");
  const [reservandoHorarioId, setReservandoHorarioId] = useState("");

  const [misReservas, setMisReservas] = useState([]);
  const [serviciosAgenda, setServiciosAgenda] = useState([]);
  const [cargandoReservas, setCargandoReservas] = useState(false);
  const [errorReservas, setErrorReservas] = useState("");

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (seccion !== "whiteboard" || !slug) return;
    prepararWhiteboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, slug]);

  useEffect(() => {
    if (seccion !== "clases" || !slug) return;

    if (!fechaClases) {
      prepararClases();
      return;
    }

    cargarClases(fechaClases);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, slug, fechaClases]);

  useEffect(() => {
    if (seccion !== "reservas" || !slug || !cuenta?.ok) return;
    cargarMisReservas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, slug, cuenta?.ok]);

  async function cargarTodo(modoActualizar = false) {
    if (!slug) {
      setError("El portal no es válido.");
      setCargando(false);
      return;
    }

    if (modoActualizar) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    setError("");
    setMensajePerfil("");

    try {
      const {
        data: { session },
        error: errorSesion,
      } = await supabase.auth.getSession();

      if (errorSesion) throw errorSesion;

      if (!session?.user?.id) {
        router.replace(`/alumno/${encodeURIComponent(slug)}`);
        return;
      }

      const [
        { data: dataCuenta, error: errorCuenta },
        { data: dataPerfil, error: errorPerfil },
        { data: dataPortalPublico, error: errorPortalPublico },
      ] = await Promise.all([
        supabase.rpc("obtener_mi_cuenta_alumno", {
          p_slug: slug,
        }),
        supabase.rpc("obtener_mi_perfil_alumno", {
          p_slug: slug,
        }),
        supabase.rpc("obtener_portal_alumno_publico", {
          p_slug: slug,
        }),
      ]);

      if (errorCuenta) throw errorCuenta;

      if (!dataCuenta?.ok) {
        throw new Error(
          dataCuenta?.mensaje || "No se pudo abrir tu portal."
        );
      }

      if (errorPerfil) throw errorPerfil;

      if (!dataPerfil?.ok) {
        throw new Error(
          dataPerfil?.mensaje || "No se pudo cargar tu configuración."
        );
      }

      setCuenta(dataCuenta);
      setPerfil(dataPerfil);

      if (!errorPortalPublico && dataPortalPublico?.ok) {
        setPortalPublico(dataPortalPublico);
      } else {
        setPortalPublico(null);
      }

      setPeso(
        dataPerfil?.peso === null || dataPerfil?.peso === undefined
          ? ""
          : String(dataPerfil.peso)
      );

      setEstatura(
        dataPerfil?.estatura === null || dataPerfil?.estatura === undefined
          ? ""
          : String(dataPerfil.estatura)
      );

      await resolverFoto(dataPerfil?.foto_url || "");
    } catch (err) {
      console.error("Error cargando portal del alumno:", err);
      setError(err?.message || "No se pudo cargar tu cuenta.");
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }

  async function resolverFoto(valor) {
    const foto = String(valor || "").trim();

    if (!foto) {
      setFotoFirmada("");
      return;
    }

    if (
      foto.startsWith("http://") ||
      foto.startsWith("https://") ||
      foto.startsWith("data:") ||
      foto.startsWith("blob:")
    ) {
      setFotoFirmada(foto);
      return;
    }

    const { data, error: signedError } = await supabase.storage
      .from(BUCKET_PERFIL)
      .createSignedUrl(foto, 60 * 60);

    if (signedError) {
      console.warn("No se pudo crear URL firmada:", signedError);
      setFotoFirmada("");
      return;
    }

    setFotoFirmada(data?.signedUrl || "");
  }

  async function cerrarSesion() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace(`/alumno/${encodeURIComponent(slug)}`);
    }
  }

  async function guardarDatosPerfil() {
    setGuardandoPerfil(true);
    setMensajePerfil("");
    setError("");

    try {
      const pesoNumero =
        String(peso).trim() === ""
          ? null
          : Number(String(peso).replace(",", "."));

      const estaturaNumero =
        String(estatura).trim() === ""
          ? null
          : Number(String(estatura).replace(",", "."));

      if (
        pesoNumero !== null &&
        (!Number.isFinite(pesoNumero) || pesoNumero <= 0 || pesoNumero > 500)
      ) {
        throw new Error("Ingresa un peso válido en kilogramos.");
      }

      if (
        estaturaNumero !== null &&
        (!Number.isFinite(estaturaNumero) ||
          estaturaNumero <= 0 ||
          estaturaNumero > 3)
      ) {
        throw new Error(
          "Ingresa una estatura válida en metros. Ejemplo: 1.76"
        );
      }

      const { data, error: rpcError } = await supabase.rpc(
        "actualizar_mi_perfil_alumno",
        {
          p_slug: slug,
          p_foto_url: null,
          p_peso: pesoNumero,
          p_estatura: estaturaNumero,
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudo guardar la configuración."
        );
      }

      setPerfil((prev) => ({
        ...(prev || {}),
        peso: data?.peso ?? pesoNumero,
        estatura: data?.estatura ?? estaturaNumero,
      }));

      setMensajePerfil("Configuración actualizada.");
      setMostrarEditor(false);
    } catch (err) {
      console.error("Error guardando configuración:", err);
      setError(err?.message || "No se pudo guardar la configuración.");
    } finally {
      setGuardandoPerfil(false);
    }
  }

  async function subirSelfie(event) {
    const archivo = event?.target?.files?.[0];
    if (!archivo) return;

    setSubiendoFoto(true);
    setMensajePerfil("");
    setError("");

    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(archivo.type)
      ) {
        throw new Error("Usa una imagen JPG, PNG o WebP.");
      }

      if (archivo.size > 5 * 1024 * 1024) {
        throw new Error("La foto no puede superar 5 MB.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      }

      const extension =
        archivo.type === "image/png"
          ? "png"
          : archivo.type === "image/webp"
          ? "webp"
          : "jpg";

      const ruta = `${userId}/perfil.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_PERFIL)
        .upload(ruta, archivo, {
          upsert: true,
          cacheControl: "3600",
          contentType: archivo.type,
        });

      if (uploadError) throw uploadError;

      const { data, error: rpcError } = await supabase.rpc(
        "actualizar_mi_perfil_alumno",
        {
          p_slug: slug,
          p_foto_url: ruta,
          p_peso: null,
          p_estatura: null,
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.ok) {
        throw new Error(data?.mensaje || "No se pudo guardar la foto.");
      }

      setPerfil((prev) => ({
        ...(prev || {}),
        foto_url: ruta,
      }));

      setCuenta((prev) => ({
        ...(prev || {}),
        foto_url: ruta,
      }));

      await resolverFoto(ruta);
      setMensajePerfil("Foto actualizada.");
    } catch (err) {
      console.error("Error subiendo selfie:", err);
      setError(err?.message || "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);

      if (event?.target) {
        event.target.value = "";
      }
    }
  }

  function fechaLocalIso(fecha = new Date()) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function sumarDiasIso(fechaIso, dias) {
    const [y, m, d] = String(fechaIso).split("-").map(Number);
    const fecha = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
    fecha.setDate(fecha.getDate() + dias);
    return fechaLocalIso(fecha);
  }

  function obtenerClienteIdAlumno() {
    return (
      cuenta?.cliente_id ||
      cuenta?.id_cliente ||
      cuenta?.alumno_id ||
      perfil?.cliente_id ||
      perfil?.id_cliente ||
      perfil?.alumno_id ||
      cuenta?.id ||
      perfil?.id ||
      ""
    );
  }

  function obtenerEmpresaIdAlumno() {
    return (
      cuenta?.empresa_id ||
      cuenta?.id_empresa ||
      perfil?.empresa_id ||
      perfil?.id_empresa ||
      portalPublico?.empresa_id ||
      portalPublico?.id_empresa ||
      ""
    );
  }

  async function resolverIdentidadAlumnoAgenda() {
    const { data, error: conexionError } = await supabase.rpc(
      "obtener_conexion_agenda_alumno",
      {
        p_slug: slug,
      }
    );

    if (conexionError) {
      const codigo = String(conexionError?.code || "");

      if (["PGRST202", "42883"].includes(codigo)) {
        throw new Error(
          "Falta instalar la conexión segura entre Portal del Alumno y Agenda. Ejecuta primero el SQL V12 en Supabase."
        );
      }

      throw conexionError;
    }

    if (!data?.ok) {
      throw new Error(
        data?.mensaje ||
          "No se pudo identificar tu ficha de alumno para consultar Agenda."
      );
    }

    const clienteId = String(data?.cliente_id || "").trim();
    const empresaId = String(data?.empresa_id || "").trim();

    if (!clienteId || !empresaId) {
      throw new Error(
        "La conexión con Agenda respondió, pero faltan los identificadores del alumno."
      );
    }

    const slugResuelto = String(data?.agenda_slug || "").trim();
    if (slugResuelto && slugResuelto !== agendaSlug) {
      setAgendaSlug(slugResuelto);
    }

    return {
      clienteId,
      empresaId,
      cliente: null,
      agendaSlug: slugResuelto,
      agendaActiva: Boolean(data?.agenda_activa),
    };
  }
  async function resolverSlugAgenda() {
    if (agendaSlug) return agendaSlug;

    const candidatoDirecto = String(
      cuenta?.agenda_slug ||
        cuenta?.slug_agenda ||
        perfil?.agenda_slug ||
        perfil?.slug_agenda ||
        portalPublico?.agenda_slug ||
        portalPublico?.slug_agenda ||
        ""
    ).trim();

    if (candidatoDirecto) {
      setAgendaSlug(candidatoDirecto);
      return candidatoDirecto;
    }

    const identidad = await resolverIdentidadAlumnoAgenda();
    const slugResuelto = String(identidad?.agendaSlug || "").trim();

    if (slugResuelto) {
      setAgendaSlug(slugResuelto);
      return slugResuelto;
    }

    throw new Error(
      "Las clases y reservas están conectadas. Para consultar el Whiteboard, Agenda necesita tener guardado su enlace /reservar/."
    );
  }
  async function cargarServiciosAgenda() {
    const { data, error: rpcError } = await supabase.rpc(
      "obtener_servicios_agenda_alumno",
      {
        p_slug: slug,
      }
    );

    if (rpcError) {
      const codigo = String(rpcError?.code || "");
      if (["PGRST202", "42883"].includes(codigo)) {
        throw new Error(
          "Falta ejecutar el SQL V12 del Portal del Alumno en Supabase."
        );
      }
      throw rpcError;
    }

    if (!data?.ok) {
      throw new Error(
        data?.mensaje || "No se pudieron cargar las clases de Agenda."
      );
    }

    const lista = Array.isArray(data?.servicios) ? data.servicios : [];
    setServiciosAgenda(lista);
    return lista;
  }
  async function consultarDisponibilidadAgenda(fechaSeleccionada) {
    const fechaConsulta = String(fechaSeleccionada).slice(0, 10);

    const { data, error: rpcError } = await supabase.rpc(
      "obtener_disponibilidad_agenda_alumno",
      {
        p_slug: slug,
        p_fecha: fechaConsulta,
      }
    );

    if (rpcError) {
      const codigo = String(rpcError?.code || "");
      if (["PGRST202", "42883"].includes(codigo)) {
        throw new Error(
          "Falta ejecutar el SQL V12 del Portal del Alumno en Supabase."
        );
      }
      throw rpcError;
    }

    if (!data?.ok) {
      throw new Error(
        data?.mensaje || "No se pudo consultar la disponibilidad de Agenda."
      );
    }

    return Array.isArray(data?.clases) ? data.clases : [];
  }
  async function cargarClases(fechaSeleccionada = fechaClases) {
    if (!fechaSeleccionada || !slug) return [];

    setCargandoClases(true);
    setErrorClases("");
    setMensajeReserva("");

    try {
      const [lista] = await Promise.all([
        consultarDisponibilidadAgenda(fechaSeleccionada),
        serviciosAgenda.length
          ? Promise.resolve(serviciosAgenda)
          : cargarServiciosAgenda(),
        cargarMisReservas({ silencioso: true }),
      ]);

      setClasesDisponibles(lista);
      return lista;
    } catch (err) {
      console.error("Error cargando clases del alumno:", err);
      setClasesDisponibles([]);
      setErrorClases(
        err?.message ||
          "No se pudieron cargar los horarios creados en Agenda."
      );
      return [];
    } finally {
      setCargandoClases(false);
    }
  }

  async function prepararClases() {
    if (!slug) return;

    setCargandoClases(true);
    setErrorClases("");
    setMensajeReserva("");

    try {
      await Promise.all([
        serviciosAgenda.length
          ? Promise.resolve(serviciosAgenda)
          : cargarServiciosAgenda(),
        cargarMisReservas({ silencioso: true }),
      ]);

      const hoy = fechaLocalIso();

      for (let offset = 0; offset <= 14; offset += 1) {
        const fechaBuscar = sumarDiasIso(hoy, offset);
        const lista = await consultarDisponibilidadAgenda(fechaBuscar);

        if (lista.length) {
          setFechaClases(fechaBuscar);
          setClasesDisponibles(lista);
          return;
        }
      }

      setFechaClases(hoy);
      setClasesDisponibles([]);
      setErrorClases(
        "No hay clases programadas para hoy ni para los próximos 14 días."
      );
    } catch (err) {
      console.error("Error preparando clases:", err);
      setFechaClases(fechaLocalIso());
      setClasesDisponibles([]);
      setErrorClases(
        err?.message ||
          "No se pudieron consultar los horarios creados en Agenda."
      );
    } finally {
      setCargandoClases(false);
    }
  }

  async function reservarClase(item) {
    const horarioId = String(
      item?.horario_id || item?.id_horario || item?.id || ""
    ).trim();

    if (!horarioId || !fechaClases) {
      setErrorClases("No se pudo identificar el horario de esta clase.");
      return;
    }

    setReservandoHorarioId(horarioId);
    setErrorClases("");
    setMensajeReserva("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "crear_reserva_agenda_alumno",
        {
          p_slug: slug,
          p_horario_id: horarioId,
          p_fecha_reserva: fechaClases,
          p_observaciones: "Reserva creada desde Portal del Alumno",
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudo realizar la reserva."
        );
      }

      const mensajeConfirmacion = `Reserva confirmada: ${
        data?.servicio ||
        item?.servicio_nombre ||
        item?.servicio ||
        "clase"
      }.`;

      await Promise.all([
        cargarClases(fechaClases),
        cargarMisReservas({ silencioso: true }),
      ]);

      setMensajeReserva(mensajeConfirmacion);
    } catch (err) {
      console.error("Error reservando clase:", err);
      setErrorClases(err?.message || "No se pudo reservar esta clase.");
    } finally {
      setReservandoHorarioId("");
    }
  }
  async function cargarMisReservas(opciones = {}) {
    const { silencioso = false } = opciones;

    if (!slug || !cuenta?.ok) return [];

    if (!silencioso) {
      setCargandoReservas(true);
    }

    setErrorReservas("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "obtener_mis_reservas_alumno",
        {
          p_slug: slug,
        }
      );

      if (rpcError) {
        const codigo = String(rpcError?.code || "");
        if (["PGRST202", "42883"].includes(codigo)) {
          throw new Error(
            "Falta ejecutar el SQL V12 del Portal del Alumno en Supabase."
          );
        }
        throw rpcError;
      }

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudieron cargar tus reservas."
        );
      }

      const lista = Array.isArray(data?.reservas) ? data.reservas : [];
      setMisReservas(lista);
      return lista;
    } catch (err) {
      console.error("Error cargando reservas del alumno:", err);
      setMisReservas([]);
      setErrorReservas(
        err?.message || "No se pudieron cargar tus reservas creadas en Agenda."
      );
      return [];
    } finally {
      if (!silencioso) {
        setCargandoReservas(false);
      }
    }
  }
  async function obtenerWod(fechaSeleccionada, servicioId) {
    if (!fechaSeleccionada || !servicioId) return null;

    const slugAgenda = await resolverSlugAgenda();

    const { data, error: rpcError } = await supabase.rpc(
      "obtener_wod_publico",
      {
        p_slug: slugAgenda,
        p_fecha: String(fechaSeleccionada).slice(0, 10),
        p_servicio_id: servicioId,
      }
    );

    if (rpcError || !data?.ok) return null;
    return data;
  }

  async function cargarWodSeleccionado(
    fechaSeleccionada = fechaWod,
    servicioId = servicioWodId
  ) {
    if (!fechaSeleccionada || !servicioId) {
      setWodPublico(null);
      return;
    }

    setCargandoWod(true);
    setErrorWod("");

    try {
      const data = await obtenerWod(fechaSeleccionada, servicioId);
      setWodPublico(data);

      if (!data) {
        setErrorWod("No hay un WOD publicado para esta clase y fecha.");
      }
    } catch (err) {
      console.error("Error cargando WOD público:", err);
      setWodPublico(null);
      setErrorWod("No se pudo cargar el WOD.");
    } finally {
      setCargandoWod(false);
    }
  }

  async function prepararWhiteboard() {
    setCargandoWod(true);
    setErrorWod("");

    try {
      let lista = await cargarServiciosAgenda();

      if (!lista.length) {
        const mapaServicios = new Map();
        const hoy = fechaLocalIso();

        for (let offset = 0; offset <= 14; offset += 1) {
          const fechaBuscar = sumarDiasIso(hoy, offset);
          const slots = await consultarDisponibilidadAgenda(fechaBuscar);

          slots.forEach((item) => {
            const id = String(item?.servicio_id || "").trim();
            if (!id || mapaServicios.has(id)) return;

            mapaServicios.set(id, {
              id,
              nombre:
                item?.servicio_nombre ||
                item?.nombre_servicio ||
                item?.servicio ||
                "Clase",
              descripcion: item?.descripcion || "",
              duracion_minutos: Number(item?.duracion_minutos || 60),
              precio: Number(item?.precio || 0),
              requiere_pago: Boolean(item?.requiere_pago),
            });
          });

          if (mapaServicios.size > 0) break;
        }

        lista = Array.from(mapaServicios.values());
        if (lista.length) {
          setServiciosAgenda(lista);
        }
      }

      setServiciosWod(lista);

      if (!lista.length) {
        setServicioWodId("");
        setFechaWod(fechaLocalIso());
        setWodPublico(null);
        setErrorWod(
          "Agenda no devolvió ninguna clase activa. Revisa que el servicio y el horario estén activos."
        );
        return;
      }

      const hoy = fechaLocalIso();
      const primerServicioId = String(lista[0]?.id || "");
      setServicioWodId(primerServicioId);
      setFechaWod(hoy);
      setWodPublico(null);

      let enlaceAgendaDisponible = true;

      try {
        await resolverSlugAgenda();
      } catch (err) {
        enlaceAgendaDisponible = false;
        console.warn("Whiteboard sin slug de Agenda:", err);
      }

      if (!enlaceAgendaDisponible) {
        setErrorWod(
          "Las clases ya están enlazadas, pero falta localizar el enlace /reservar/ de Agenda para consultar el WOD."
        );
        return;
      }

      for (let offset = 0; offset <= 7; offset += 1) {
        const fechaBuscar = sumarDiasIso(hoy, offset);

        for (const servicio of lista) {
          const servicioId = String(servicio?.id || "").trim();
          if (!servicioId) continue;

          const wod = await obtenerWod(fechaBuscar, servicioId);

          if (wod?.ok) {
            setFechaWod(fechaBuscar);
            setServicioWodId(servicioId);
            setWodPublico(wod);
            setErrorWod("");
            return;
          }
        }
      }

      setErrorWod(
        "Las clases ya están cargadas. No hay un WOD publicado para los próximos 7 días."
      );
    } catch (err) {
      console.error("Error preparando Whiteboard:", err);
      setServiciosWod([]);
      setServicioWodId("");
      setFechaWod(fechaLocalIso());
      setWodPublico(null);
      setErrorWod(
        err?.message || "No se pudo preparar el Whiteboard."
      );
    } finally {
      setCargandoWod(false);
    }
  }

  function cambiarSeccion(id) {
    const destino = String(id || "inicio").trim();

    setSeccion(destino);
    setMenuAbierto(false);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return "No definida";

    try {
      return new Intl.DateTimeFormat("es-PA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${fecha}T12:00:00`));
    } catch {
      return String(fecha);
    }
  }

  function formatearDinero(valor) {
    const numero = Number(valor || 0);

    if (!Number.isFinite(numero)) {
      return "$0.00";
    }

    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(numero);
  }

  const empresaNombre =
    cuenta?.empresa_nombre ||
    portalPublico?.empresa_nombre ||
    portalPublico?.titulo ||
    portalPublico?.titulo_publico ||
    "Gimnasio";

  const empresaLogoUrl =
    cuenta?.empresa_logo_url ||
    cuenta?.logo_url ||
    portalPublico?.empresa_logo_url ||
    portalPublico?.logo_url ||
    portalPublico?.logo ||
    "";

  const membresia = cuenta?.membresia || null;
  const qrToken = String(cuenta?.qr_token || "").trim();
  const qrDisponible = Boolean(qrToken);
  const accesoPermitido = Boolean(cuenta?.acceso_permitido);

  const qrUrl = useMemo(() => {
    if (!qrToken) return "";

    return (
      "https://api.qrserver.com/v1/create-qr-code/" +
      `?size=700x700&margin=24&data=${encodeURIComponent(qrToken)}`
    );
  }, [qrToken]);

  const iniciales = useMemo(() => {
    const nombre = String(cuenta?.nombre || "Alumno").trim();
    const partes = nombre.split(/\s+/).filter(Boolean);

    return (
      partes
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join("") || "A"
    );
  }, [cuenta?.nombre]);

  const estadoVisual =
    cuenta?.membresia_estado_visual ||
    membresia?.estado ||
    "Sin membresía";

  const pesoVisual =
    perfil?.peso === null || perfil?.peso === undefined
      ? "Sin registrar"
      : `${Number(perfil.peso).toFixed(1)} kg`;

  const estaturaVisual =
    perfil?.estatura === null || perfil?.estatura === undefined
      ? "Sin registrar"
      : `${Number(perfil.estatura).toFixed(2)} m`;

  if (cargando) {
    return (
      <main style={S.loadingPage}>
        <section style={S.loadingCard}>
          <img src="/konax-logo.png" alt="KONAX" style={S.loadingLogo} />
          <div style={S.loader} />
          <strong>Preparando tu portal...</strong>
          <span style={S.loadingText}>Estamos validando tu acceso.</span>
        </section>
      </main>
    );
  }

  if (error && !cuenta?.ok) {
    return (
      <main style={S.loadingPage}>
        <section style={S.errorCard}>
          <img src="/konax-logo.png" alt="KONAX" style={S.errorLogo} />
          <div style={S.errorIcon}>!</div>
          <h1 style={S.errorTitle}>No pudimos abrir tu portal</h1>
          <p style={S.errorText}>
            {error || "Tu portal no está disponible."}
          </p>

          <button
            type="button"
            onClick={() => cargarTodo()}
            style={S.primaryButton}
          >
            Intentar nuevamente
          </button>

          <button
            type="button"
            onClick={cerrarSesion}
            style={S.secondaryButton}
          >
            Volver al acceso
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={S.page}>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #eef3ef;
        }

        button,
        input {
          font: inherit;
        }

        @media (max-width: 620px) {
          .portal-shell {
            width: 100% !important;
            min-height: 100vh !important;
            border-radius: 0 !important;
            border-left: 0 !important;
            border-right: 0 !important;
          }

          .portal-content {
            padding-left: 15px !important;
            padding-right: 15px !important;
            padding-bottom: 104px !important;
          }

          .mobile-bottom {
            display: grid !important;
          }

          .desktop-nav {
            display: none !important;
          }

          .member-grid {
            grid-template-columns: 58px minmax(0, 1fr) !important;
          }

          .member-status {
            grid-column: 1 / -1 !important;
            justify-self: start !important;
          }

          .membership-grid,
          .config-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .qr-layout {
            grid-template-columns: 1fr !important;
          }

          .profile-settings-shell {
            grid-template-columns: 1fr !important;
          }

          .profile-fields-grid {
            grid-template-columns: 1fr !important;
          }

          .payment-summary-grid,
          .results-summary-grid,
          .results-form-grid {
            grid-template-columns: 1fr !important;
          }

          .app-home-summary {
            grid-template-columns: 1fr !important;
          }

          .whiteboard-filters {
            grid-template-columns: 1fr !important;
          }

          .agenda-toolbar {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 390px) {
          .membership-grid,
          .config-grid,
          .photo-actions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section style={S.shell} className="portal-shell">
        <header style={S.topbar}>
          <div style={S.topUserRow}>
            <div style={S.topUserBlock}>
              <div style={S.topUserAvatar}>
                {fotoFirmada ? (
                  <img
                    src={fotoFirmada}
                    alt={cuenta?.nombre || "Alumno"}
                    style={S.avatarImage}
                  />
                ) : (
                  <span>{iniciales}</span>
                )}
              </div>

              <div style={S.topUserText}>
                <strong style={S.topUserName}>
                  {cuenta?.nombre || "Alumno"}
                </strong>
                <span style={S.topUserState}>
                  {estadoVisual}
                </span>
              </div>
            </div>

            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMenuAbierto(true)}
              style={S.topMenuIconButton}
            >
              ☰
            </button>
          </div>
        </header>

        {menuAbierto && (
          <>
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMenuAbierto(false)}
              style={S.menuOverlay}
            />

            <aside style={S.drawer}>
              <div style={S.drawerBusiness}>
                <div style={S.drawerBusinessLogo}>
                  {empresaLogoUrl ? (
                    <img
                      src={empresaLogoUrl}
                      alt={`Logo de ${empresaNombre}`}
                      style={S.brandLogo}
                    />
                  ) : (
                    <span>
                      {String(empresaNombre || "G")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <div style={S.drawerBusinessText}>
                  <strong style={S.drawerBusinessName}>
                    {empresaNombre}
                  </strong>
                  <span style={S.drawerBusinessSub}>
                    Portal del Alumno · KONAX
                  </span>
                </div>
              </div>

              <div style={S.drawerHeader}>
                <div style={S.drawerAvatar}>
                  {fotoFirmada ? (
                    <img
                      src={fotoFirmada}
                      alt={cuenta?.nombre || "Alumno"}
                      style={S.avatarImage}
                    />
                  ) : (
                    <span>{iniciales}</span>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <strong style={S.drawerName}>{cuenta?.nombre}</strong>
                  <span style={S.drawerState}>{estadoVisual}</span>
                </div>
              </div>

              <nav style={S.drawerNav}>
                {MENU.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => cambiarSeccion(item.id)}
                    style={{
                      ...S.drawerItem,
                      ...(seccion === item.id ? S.drawerItemActive : {}),
                    }}
                  >
                    <span style={S.drawerIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              <div style={S.drawerFooter}>
                <button
                  type="button"
                  onClick={cerrarSesion}
                  style={S.drawerLogout}
                >
                  Cerrar sesión
                </button>
              </div>
            </aside>
          </>
        )}

        <div style={S.content} className="portal-content">
          {error && (
            <div style={S.inlineError}>
              <strong>Atención:</strong> {error}
            </div>
          )}

          {mensajePerfil && (
            <div style={S.successMessage}>{mensajePerfil}</div>
          )}

          {seccion === "inicio" && (
            <Inicio
              qrDisponible={qrDisponible}
              qrUrl={qrUrl}
              nombre={cuenta?.nombre || "Alumno"}
              estadoVisual={estadoVisual}
              fotoFirmada={fotoFirmada}
              iniciales={iniciales}
              membresia={membresia}
              checkins={cuenta?.checkins_total ?? cuenta?.checkins ?? "—"}
              fechaAlta={
                cuenta?.fecha_alta ||
                cuenta?.fecha_registro ||
                cuenta?.created_at ||
                perfil?.fecha_alta ||
                perfil?.created_at ||
                ""
              }
              onActualizar={() => cargarTodo(true)}
              actualizando={actualizando}
              onIrPerfil={() => cambiarSeccion("configuracion")}
              onIrClases={() => cambiarSeccion("clases")}
              onIrReservas={() => cambiarSeccion("reservas")}
            />
          )}

          {seccion === "clases" && (
            <ClasesAgenda
              fecha={fechaClases}
              setFecha={setFechaClases}
              clases={clasesDisponibles}
              cargando={cargandoClases}
              error={errorClases}
              mensaje={mensajeReserva}
              reservas={misReservas}
              reservandoHorarioId={reservandoHorarioId}
              onReservar={reservarClase}
              onActualizar={() => cargarClases(fechaClases)}
              onVolver={() => cambiarSeccion("inicio")}
            />
          )}

          {seccion === "reservas" && (
            <MisReservasAgenda
              reservas={misReservas}
              cargando={cargandoReservas}
              error={errorReservas}
              onActualizar={() => cargarMisReservas()}
              onIrClases={() => cambiarSeccion("clases")}
              onVolver={() => cambiarSeccion("inicio")}
            />
          )}

          {seccion === "whiteboard" && (
            <WhiteboardWod
              servicios={serviciosWod}
              servicioId={servicioWodId}
              setServicioId={setServicioWodId}
              fecha={fechaWod}
              setFecha={setFechaWod}
              wod={wodPublico}
              cargando={cargandoWod}
              error={errorWod}
              onBuscar={() =>
                cargarWodSeleccionado(fechaWod, servicioWodId)
              }
              onVolver={() => cambiarSeccion("inicio")}
            />
          )}

          {seccion === "resultados" && (
            <ResultadosAlumno
              slug={slug}
              onVolver={() => cambiarSeccion("inicio")}
            />
          )}

          {seccion === "configuracion" && (
            <Configuracion
              slug={slug}
              cuenta={cuenta}
              perfil={perfil}
              membresia={membresia}
              estadoVisual={estadoVisual}
              accesoPermitido={accesoPermitido}
              formatearFecha={formatearFecha}
              fotoFirmada={fotoFirmada}
              iniciales={iniciales}
              peso={peso}
              setPeso={setPeso}
              estatura={estatura}
              setEstatura={setEstatura}
              pesoVisual={pesoVisual}
              estaturaVisual={estaturaVisual}
              mostrarEditor={mostrarEditor}
              setMostrarEditor={setMostrarEditor}
              guardandoPerfil={guardandoPerfil}
              guardarDatosPerfil={guardarDatosPerfil}
              subiendoFoto={subiendoFoto}
              subirSelfie={subirSelfie}
              cerrarSesion={cerrarSesion}
            />
          )}

          <footer style={S.footer}>
            <div style={S.secureText}>
              <span>🔒 Acceso seguro</span>
              <span>KONAX</span>
            </div>
            <span style={S.version}>{VERSION}</span>
          </footer>
        </div>

        <nav
          style={S.mobileBottom}
          className="mobile-bottom"
          aria-label="Navegación principal"
        >
          {[
            { id: "inicio", label: "Inicio", icon: "⌂" },
            { id: "clases", label: "Clases", icon: "▣" },
            { id: "reservas", label: "Reservas", icon: "◷" },
            { id: "resultados", label: "Resultados", icon: "★" },
            { id: "configuracion", label: "Perfil", icon: "●" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => cambiarSeccion(item.id)}
              style={{
                ...S.bottomItem,
                ...(seccion === item.id ? S.bottomItemActive : {}),
              }}
            >
              <span style={S.bottomIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}

function Inicio({
  qrDisponible,
  qrUrl,
  nombre,
  estadoVisual,
  fotoFirmada,
  iniciales,
  membresia,
  checkins,
  fechaAlta,
  onActualizar,
  actualizando,
  onIrPerfil,
  onIrClases,
  onIrReservas,
}) {
  const [qrAbierto, setQrAbierto] = useState(false);

  return (
    <section style={S.memberHome}>
      <article style={S.memberProfileCard}>
        <div style={S.memberProfileAccent} />

        <div style={S.memberProfileAvatar}>
          {fotoFirmada ? (
            <img
              src={fotoFirmada}
              alt={nombre || "Alumno"}
              style={S.avatarImage}
            />
          ) : (
            <span>{iniciales}</span>
          )}
        </div>

        <h1 style={S.memberProfileName}>{nombre}</h1>
        <span style={S.memberProfileRole}>Alumno</span>

        <button
          type="button"
          onClick={onIrPerfil}
          style={S.memberEditButton}
        >
          ✎ Editar perfil
        </button>

        <div style={S.memberProfileRows}>
          <ResumenFila
            label="Fecha de alta"
            value={fechaAlta ? formatearFechaAgenda(fechaAlta) : "—"}
          />
          <ResumenFila
            label="Estado"
            value={estadoVisual || "Sin membresía"}
          />
          <ResumenFila
            label="Membresía"
            value={membresia?.plan || "Sin plan"}
          />
          <ResumenFila
            label="Vencimiento"
            value={
              membresia?.fecha_vencimiento
                ? formatearFechaAgenda(membresia.fecha_vencimiento)
                : "—"
            }
          />
          <ResumenFila label="Check-ins" value={checkins} />
        </div>

        <button
          type="button"
          onClick={() => setQrAbierto(true)}
          disabled={!qrDisponible || !qrUrl}
          style={{
            ...S.memberQrButton,
            ...(!qrDisponible || !qrUrl ? S.memberQrButtonDisabled : {}),
          }}
        >
          {qrDisponible ? "▣ Ver mi QR" : "QR no disponible"}
        </button>
      </article>

      <div style={S.memberHomeActions}>
        <button
          type="button"
          onClick={onIrClases}
          style={S.memberActionCard}
        >
          <span style={S.memberActionIcon}>▣</span>
          <span style={S.memberActionCopy}>
            <strong>Clases</strong>
            <small>Consulta horarios y reserva</small>
          </span>
          <span style={S.memberActionArrow}>›</span>
        </button>

        <button
          type="button"
          onClick={onIrReservas}
          style={S.memberActionCard}
        >
          <span style={S.memberActionIcon}>◷</span>
          <span style={S.memberActionCopy}>
            <strong>Mis reservas</strong>
            <small>Revisa tus próximas clases</small>
          </span>
          <span style={S.memberActionArrow}>›</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onActualizar}
        disabled={actualizando}
        style={S.memberRefreshButton}
      >
        {actualizando ? "Actualizando..." : "↻ Actualizar mi portal"}
      </button>

      {qrAbierto && (
        <div style={S.qrModalOverlay} role="presentation">
          <button
            type="button"
            aria-label="Cerrar código QR"
            onClick={() => setQrAbierto(false)}
            style={S.qrModalBackdrop}
          />

          <div
            style={S.qrModalCard}
            role="dialog"
            aria-modal="true"
            aria-label="Código QR para check-in"
          >
            <div style={S.qrModalHeader}>
              <div>
                <span style={S.qrModalEyebrow}>CHECK-IN</span>
                <h2 style={S.qrModalTitle}>Código QR para ingresar</h2>
              </div>

              <button
                type="button"
                onClick={() => setQrAbierto(false)}
                style={S.qrModalClose}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div style={S.qrModalImageWrap}>
              <img
                src={qrUrl}
                alt={`Código QR de ${nombre}`}
                style={S.qrModalImage}
              />
            </div>

            <p style={S.qrModalText}>
              Presenta este código en recepción o en el lector del gimnasio.
            </p>

            <a
              href={qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={S.qrDownloadLink}
            >
              Abrir / descargar QR
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

function formatearHoraAgenda(hora) {
  if (!hora) return "-";

  const [h = "0", m = "0"] = String(hora).split(":");
  const fecha = new Date();
  fecha.setHours(Number(h), Number(m), 0, 0);

  return new Intl.DateTimeFormat("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(fecha);
}

function formatearFechaAgenda(fecha) {
  if (!fecha) return "-";

  try {
    return new Intl.DateTimeFormat("es-PA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${String(fecha).slice(0, 10)}T12:00:00`));
  } catch {
    return String(fecha);
  }
}

function etiquetaEstadoReserva(estado) {
  const valor = String(estado || "").toLowerCase().trim();

  if (valor === "confirmada") return "Confirmada";
  if (valor === "pendiente_pago") return "Pendiente de pago";
  if (valor === "asistio") return "Asistió";
  if (valor === "no_asistio") return "No asistió";
  if (valor === "cancelada") return "Cancelada";
  return estado || "Registrada";
}

function estiloEstadoReserva(estado) {
  const valor = String(estado || "").toLowerCase().trim();

  if (valor === "cancelada" || valor === "no_asistio") {
    return S.reservaStatusMuted;
  }

  if (valor === "pendiente_pago") {
    return S.reservaStatusWarning;
  }

  return S.reservaStatusOk;
}

function ClasesAgenda({
  fecha,
  setFecha,
  clases,
  cargando,
  error,
  mensaje,
  reservas,
  reservandoHorarioId,
  onReservar,
  onActualizar,
  onVolver,
}) {
  return (
    <section style={S.agendaPortalShell}>
      <div style={S.agendaHero}>
        <button type="button" onClick={onVolver} style={S.agendaBack}>
          ← Menú
        </button>

        <div>
          <span style={S.agendaEyebrow}>AGENDA DEL GIMNASIO</span>
          <h1 style={S.agendaTitle}>Clases disponibles</h1>
          <p style={S.agendaSubtitle}>
            Los horarios que el gimnasio crea en Agenda aparecen aquí.
          </p>
        </div>
      </div>

      <div style={S.agendaToolbar} className="agenda-toolbar">
        <label style={S.agendaDateField}>
          <span style={S.agendaFieldLabel}>Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={S.agendaDateInput}
          />
        </label>

        <button
          type="button"
          onClick={onActualizar}
          disabled={cargando || !fecha}
          style={S.agendaRefreshButton}
        >
          {cargando ? "Actualizando..." : "↻ Actualizar"}
        </button>
      </div>

      {mensaje && <div style={S.agendaSuccess}>{mensaje}</div>}
      {error && <div style={S.agendaError}>{error}</div>}

      {cargando ? (
        <div style={S.agendaLoading}>
          <div style={S.loader} />
          <strong>Cargando horarios...</strong>
        </div>
      ) : clases.length > 0 ? (
        <div style={S.agendaList}>
          <div style={S.agendaDateCaption}>
            <span>CLASES PROGRAMADAS</span>
            <strong>{formatearFechaAgenda(fecha)}</strong>
          </div>

          {clases.map((item, index) => {
            const horarioId = String(
              item?.horario_id || item?.id_horario || item?.id || index
            );

            const disponiblesRaw =
              item?.disponibles ?? item?.cupos_disponibles ?? null;

            const tieneCupos =
              disponiblesRaw === null ||
              disponiblesRaw === undefined ||
              Number(disponiblesRaw) > 0;

            const reservando =
              String(reservandoHorarioId) === horarioId;

            const yaReservado = (Array.isArray(reservas) ? reservas : []).some(
              (reserva) => {
                const reservaHorarioId = String(
                  reserva?.horario_id || reserva?.id_horario || ""
                ).trim();
                const reservaFecha = String(
                  reserva?.fecha_reserva || ""
                ).slice(0, 10);
                const estadoReserva = String(
                  reserva?.estado || ""
                ).toLowerCase().trim();

                return (
                  reservaHorarioId === horarioId &&
                  reservaFecha === String(fecha || "").slice(0, 10) &&
                  estadoReserva !== "cancelada"
                );
              }
            );

            return (
              <article
                key={`${horarioId}-${item?.hora_inicio || index}`}
                style={S.agendaClassCard}
              >
                <div style={S.agendaClassTop}>
                  <div style={S.agendaClassIcon}>▣</div>

                  <div style={S.agendaClassCopy}>
                    <strong style={S.agendaClassName}>
                      {item?.servicio_nombre ||
                        item?.servicio ||
                        item?.nombre_servicio ||
                        "Clase"}
                    </strong>

                    <span style={S.agendaClassMeta}>
                      {item?.instructor
                        ? `Coach: ${item.instructor}`
                        : "Clase programada"}
                    </span>
                  </div>

                  <span
                    style={{
                      ...S.agendaCapacity,
                      ...(tieneCupos ? {} : S.agendaCapacityFull),
                    }}
                  >
                    {disponiblesRaw === null ||
                    disponiblesRaw === undefined
                      ? "Disponible"
                      : tieneCupos
                      ? `${Number(disponiblesRaw)} cupo${
                          Number(disponiblesRaw) === 1 ? "" : "s"
                        }`
                      : "Lleno"}
                  </span>
                </div>

                <div style={S.agendaClassBottom}>
                  <div style={S.agendaTimeBlock}>
                    <span style={S.agendaTimeLabel}>HORARIO</span>
                    <strong style={S.agendaTimeValue}>
                      {formatearHoraAgenda(item?.hora_inicio)}
                      {item?.hora_fin
                        ? ` – ${formatearHoraAgenda(item.hora_fin)}`
                        : ""}
                    </strong>
                  </div>

                  <button
                    type="button"
                    disabled={yaReservado || !tieneCupos || reservando}
                    onClick={() => onReservar(item)}
                    style={{
                      ...S.agendaReserveButton,
                      ...(yaReservado
                        ? S.agendaReserveButtonReserved
                        : !tieneCupos || reservando
                        ? S.agendaReserveButtonDisabled
                        : {}),
                    }}
                  >
                    {yaReservado
                      ? "✓ Reservado"
                      : reservando
                      ? "Reservando..."
                      : tieneCupos
                      ? "Reservar"
                      : "Sin cupos"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div style={S.agendaEmpty}>
          <div style={S.agendaEmptyIcon}>▣</div>
          <strong style={S.agendaEmptyTitle}>
            No hay clases para esta fecha
          </strong>
          <span style={S.agendaEmptyText}>
            Cambia la fecha para consultar otro día. Al crear un horario
            activo en Agenda, aparecerá automáticamente aquí.
          </span>
        </div>
      )}
    </section>
  );
}

function MisReservasAgenda({
  reservas,
  cargando,
  error,
  onActualizar,
  onIrClases,
  onVolver,
}) {
  const hoy = new Date();
  const hoyIso = `${hoy.getFullYear()}-${String(
    hoy.getMonth() + 1
  ).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  const ordenadas = [...reservas].sort((a, b) => {
    const fechaA = `${a?.fecha_reserva || ""} ${a?.hora_inicio || ""}`;
    const fechaB = `${b?.fecha_reserva || ""} ${b?.hora_inicio || ""}`;
    return fechaB.localeCompare(fechaA);
  });

  const proximas = ordenadas.filter(
    (reserva) =>
      String(reserva?.fecha_reserva || "").slice(0, 10) >= hoyIso &&
      String(reserva?.estado || "").toLowerCase() !== "cancelada"
  );

  const anteriores = ordenadas.filter(
    (reserva) => !proximas.includes(reserva)
  );

  return (
    <section style={S.agendaPortalShell}>
      <div style={S.agendaHero}>
        <button type="button" onClick={onVolver} style={S.agendaBack}>
          ← Menú
        </button>

        <div>
          <span style={S.agendaEyebrow}>MI AGENDA</span>
          <h1 style={S.agendaTitle}>Mis reservas</h1>
          <p style={S.agendaSubtitle}>
            Aquí aparecen las reservas vinculadas a tu ficha de alumno.
          </p>
        </div>
      </div>

      <div style={S.reservasToolbar}>
        <button
          type="button"
          onClick={onIrClases}
          style={S.agendaPrimaryButton}
        >
          + Reservar clase
        </button>

        <button
          type="button"
          onClick={onActualizar}
          disabled={cargando}
          style={S.agendaRefreshButton}
        >
          {cargando ? "Actualizando..." : "↻ Actualizar"}
        </button>
      </div>

      {error && <div style={S.agendaError}>{error}</div>}

      {cargando ? (
        <div style={S.agendaLoading}>
          <div style={S.loader} />
          <strong>Cargando tus reservas...</strong>
        </div>
      ) : reservas.length > 0 ? (
        <div style={S.reservasSections}>
          {proximas.length > 0 && (
            <div style={S.reservasGroup}>
              <div style={S.reservasGroupTitle}>
                <span>PRÓXIMAS</span>
                <strong>{proximas.length}</strong>
              </div>

              {proximas.map((reserva) => (
                <ReservaAlumnoCard
                  key={reserva.id}
                  reserva={reserva}
                />
              ))}
            </div>
          )}

          {anteriores.length > 0 && (
            <div style={S.reservasGroup}>
              <div style={S.reservasGroupTitle}>
                <span>HISTORIAL</span>
                <strong>{anteriores.length}</strong>
              </div>

              {anteriores.map((reserva) => (
                <ReservaAlumnoCard
                  key={reserva.id}
                  reserva={reserva}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={S.agendaEmpty}>
          <div style={S.agendaEmptyIcon}>◷</div>
          <strong style={S.agendaEmptyTitle}>
            Aún no tienes reservas
          </strong>
          <span style={S.agendaEmptyText}>
            Si el gimnasio te reserva una clase desde Agenda o tú la reservas
            desde este portal, aparecerá aquí.
          </span>

          <button
            type="button"
            onClick={onIrClases}
            style={S.agendaPrimaryButton}
          >
            Ver clases disponibles
          </button>
        </div>
      )}
    </section>
  );
}

function ReservaAlumnoCard({ reserva }) {
  return (
    <article style={S.reservaCard}>
      <div style={S.reservaCardTop}>
        <div>
          <span style={S.reservaDate}>
            {formatearFechaAgenda(reserva?.fecha_reserva)}
          </span>
          <strong style={S.reservaService}>
            {reserva?.servicio_nombre || "Clase"}
          </strong>
        </div>

        <span
          style={{
            ...S.reservaStatus,
            ...estiloEstadoReserva(reserva?.estado),
          }}
        >
          {etiquetaEstadoReserva(reserva?.estado)}
        </span>
      </div>

      <div style={S.reservaDetails}>
        <div style={S.reservaDetail}>
          <span>HORARIO</span>
          <strong>
            {formatearHoraAgenda(reserva?.hora_inicio)}
            {reserva?.hora_fin
              ? ` – ${formatearHoraAgenda(reserva.hora_fin)}`
              : ""}
          </strong>
        </div>

        {reserva?.instructor && (
          <div style={S.reservaDetail}>
            <span>COACH</span>
            <strong>{reserva.instructor}</strong>
          </div>
        )}

        {reserva?.requiere_pago && (
          <div style={S.reservaDetail}>
            <span>MONTO</span>
            <strong>${Number(reserva?.monto || 0).toFixed(2)}</strong>
          </div>
        )}
      </div>
    </article>
  );
}

function WhiteboardWod({
  servicios,
  servicioId,
  setServicioId,
  fecha,
  setFecha,
  wod,
  cargando,
  error,
  onBuscar,
  onVolver,
}) {
  const bloques = [
    ["Warm-up", wod?.warmup],
    ["Fuerza", wod?.strength],
    ["Técnica / Skill", wod?.skill],
    ["Metcon", wod?.metcon],
    ["Vuelta a la calma", wod?.cooldown],
  ].filter(([, valor]) => Boolean(String(valor || "").trim()));

  return (
    <section style={S.whiteboardShell}>
      <div style={S.whiteboardTop}>
        <button
          type="button"
          onClick={onVolver}
          style={S.whiteboardBack}
        >
          ← Menú
        </button>

        <div>
          <span style={S.whiteboardEyebrow}>WORKOUT OF THE DAY</span>
          <h1 style={S.whiteboardTitle}>Whiteboard</h1>
        </div>
      </div>

      <div style={S.whiteboardFilters} className="whiteboard-filters">
        <div style={S.whiteboardField}>
          <label style={S.whiteboardLabel}>Clase</label>
          <select
            value={servicioId}
            onChange={(e) => setServicioId(e.target.value)}
            style={S.whiteboardInput}
          >
            {servicios.map((servicio) => (
              <option key={servicio.id} value={String(servicio.id)}>
                {servicio.nombre || "Clase"}
              </option>
            ))}
          </select>
        </div>

        <div style={S.whiteboardField}>
          <label style={S.whiteboardLabel}>Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={S.whiteboardInput}
          />
        </div>

        <button
          type="button"
          onClick={onBuscar}
          disabled={cargando || !fecha || !servicioId}
          style={S.whiteboardSearch}
        >
          {cargando ? "Buscando..." : "Ver WOD"}
        </button>
      </div>

      {cargando ? (
        <div style={S.whiteboardLoading}>
          <div style={S.loader} />
          <strong>Cargando WOD...</strong>
        </div>
      ) : wod?.ok ? (
        <article style={S.wodCard}>
          <div style={S.wodHeader}>
            <div>
              <span style={S.wodProgram}>
                {wod.servicio || "CLASE"}
              </span>
              <h2 style={S.wodTitle}>
                {wod.titulo || "WOD del día"}
              </h2>
            </div>

            <span style={S.wodActive}>PUBLICADO</span>
          </div>

          <div style={S.wodBlocks}>
            {bloques.map(([titulo, valor]) => (
              <div
                key={titulo}
                style={{
                  ...S.wodBlock,
                  ...(titulo === "Metcon" ? S.wodBlockAccent : {}),
                }}
              >
                <span style={S.wodBlockLabel}>{titulo}</span>
                <strong style={S.wodBlockValue}>{valor}</strong>
              </div>
            ))}
          </div>

          {wod.notas_publicas && (
            <div style={S.wodNote}>
              <span style={S.wodNoteLabel}>NOTA DEL COACH</span>
              <strong style={S.wodNoteValue}>
                {wod.notas_publicas}
              </strong>
            </div>
          )}
        </article>
      ) : (
        <div style={S.whiteboardEmpty}>
          <div style={S.whiteboardEmptyIcon}>W</div>
          <strong style={S.whiteboardEmptyTitle}>
            WOD no disponible
          </strong>
          <span style={S.whiteboardEmptyText}>
            {error || "Selecciona una clase y una fecha para consultar."}
          </span>
        </div>
      )}
    </section>
  );
}


const TIPOS_RESULTADO = [
  { id: "tiempo", label: "Tiempo", unidad: "min" },
  { id: "peso", label: "Peso", unidad: "kg" },
  { id: "repeticiones", label: "Repeticiones", unidad: "reps" },
  { id: "rondas", label: "Rondas", unidad: "rondas" },
  { id: "distancia", label: "Distancia", unidad: "m" },
  { id: "calorias", label: "Calorías", unidad: "cal" },
  { id: "otro", label: "Otro", unidad: "" },
];

function fechaHoyResultado() {
  const fecha = new Date();
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function etiquetaTipoResultado(tipo) {
  const encontrado = TIPOS_RESULTADO.find(
    (item) => item.id === String(tipo || "").toLowerCase()
  );

  return encontrado?.label || tipo || "Resultado";
}

function formatearFechaResultado(fecha) {
  if (!fecha) return "-";

  try {
    return new Intl.DateTimeFormat("es-PA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${String(fecha).slice(0, 10)}T12:00:00`));
  } catch {
    return String(fecha);
  }
}

function ResultadosAlumno({ slug, onVolver }) {
  const [resultados, setResultados] = useState([]);
  const [servicios, setServicios] = useState([]);

  const [fecha, setFecha] = useState(fechaHoyResultado());
  const [servicioId, setServicioId] = useState("");
  const [tipo, setTipo] = useState("tiempo");
  const [valor, setValor] = useState("");
  const [unidad, setUnidad] = useState("min");
  const [notas, setNotas] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState("");
  const [errorResultados, setErrorResultados] = useState("");
  const [mensajeResultados, setMensajeResultados] = useState("");

  useEffect(() => {
    if (!slug) return;

    Promise.all([
      cargarResultados(),
      cargarServiciosResultados(),
    ]).finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function cargarServiciosResultados() {
    try {
      const { data, error } = await supabase.rpc(
        "obtener_servicios_agenda_alumno",
        {
          p_slug: slug,
        }
      );

      if (error) throw error;

      const lista =
        data?.ok && Array.isArray(data?.servicios)
          ? data.servicios
          : [];

      setServicios(lista);

      if (!servicioId && lista.length) {
        setServicioId(String(lista[0]?.id || ""));
      }

      return lista;
    } catch (err) {
      console.warn("No se pudieron cargar clases para Resultados:", err);
      setServicios([]);
      return [];
    }
  }

  async function cargarResultados() {
    setErrorResultados("");

    try {
      const { data, error } = await supabase.rpc(
        "obtener_resultados_alumno",
        {
          p_slug: slug,
        }
      );

      if (error) {
        const codigo = String(error?.code || "");

        if (["PGRST202", "42883"].includes(codigo)) {
          throw new Error(
            "Falta ejecutar el SQL V17 de Resultados y Notificaciones en Supabase."
          );
        }

        throw error;
      }

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudo cargar tu historial de resultados."
        );
      }

      const lista = Array.isArray(data?.resultados)
        ? data.resultados
        : [];

      setResultados(lista);
      return lista;
    } catch (err) {
      console.error("Error cargando resultados:", err);
      setResultados([]);
      setErrorResultados(
        err?.message || "No se pudo cargar tu historial de resultados."
      );
      return [];
    }
  }

  function cambiarTipoResultado(nuevoTipo) {
    setTipo(nuevoTipo);

    const encontrado = TIPOS_RESULTADO.find(
      (item) => item.id === nuevoTipo
    );

    setUnidad(encontrado?.unidad || "");
  }

  async function guardarResultado() {
    setMensajeResultados("");
    setErrorResultados("");

    const valorLimpio = String(valor || "").trim();

    if (!fecha) {
      setErrorResultados("Selecciona la fecha del resultado.");
      return;
    }

    if (!valorLimpio) {
      setErrorResultados("Escribe el resultado obtenido.");
      return;
    }

    setGuardando(true);

    try {
      const servicioSeleccionado = servicios.find(
        (item) => String(item?.id || "") === String(servicioId || "")
      );

      const { data, error } = await supabase.rpc(
        "guardar_resultado_alumno",
        {
          p_slug: slug,
          p_fecha: fecha,
          p_servicio_id: servicioId || null,
          p_servicio_nombre:
            servicioSeleccionado?.nombre ||
            servicioSeleccionado?.servicio_nombre ||
            null,
          p_tipo: tipo,
          p_valor: valorLimpio,
          p_unidad: String(unidad || "").trim() || null,
          p_notas: String(notas || "").trim() || null,
        }
      );

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudo guardar el resultado."
        );
      }

      setValor("");
      setNotas("");
      setMensajeResultados("Resultado guardado correctamente.");
      await cargarResultados();
    } catch (err) {
      console.error("Error guardando resultado:", err);
      setErrorResultados(
        err?.message || "No se pudo guardar el resultado."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarResultado(resultadoId) {
    if (!resultadoId) return;

    setEliminandoId(String(resultadoId));
    setMensajeResultados("");
    setErrorResultados("");

    try {
      const { data, error } = await supabase.rpc(
        "eliminar_resultado_alumno",
        {
          p_slug: slug,
          p_resultado_id: resultadoId,
        }
      );

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudo eliminar el resultado."
        );
      }

      setMensajeResultados("Resultado eliminado.");
      await cargarResultados();
    } catch (err) {
      console.error("Error eliminando resultado:", err);
      setErrorResultados(
        err?.message || "No se pudo eliminar el resultado."
      );
    } finally {
      setEliminandoId("");
    }
  }

  const ultimoResultado = resultados[0] || null;

  const tiposUsados = new Set(
    resultados.map((item) => String(item?.tipo || "").trim()).filter(Boolean)
  ).size;

  return (
    <section style={S.resultsShell}>
      <div style={S.resultsHero}>
        <button type="button" onClick={onVolver} style={S.resultsBack}>
          ← Menú
        </button>

        <div>
          <span style={S.resultsEyebrow}>PROGRESO DEL ALUMNO</span>
          <h1 style={S.resultsTitle}>Resultados</h1>
          <p style={S.resultsSubtitle}>
            Registra tus marcas y consulta tu evolución por clase.
          </p>
        </div>
      </div>

      <div style={S.resultsSummaryGrid} className="results-summary-grid">
        <div style={S.resultsSummaryCard}>
          <span style={S.resultsSummaryLabel}>REGISTROS</span>
          <strong style={S.resultsSummaryValue}>{resultados.length}</strong>
        </div>

        <div style={S.resultsSummaryCard}>
          <span style={S.resultsSummaryLabel}>TIPOS DE MARCA</span>
          <strong style={S.resultsSummaryValue}>{tiposUsados}</strong>
        </div>

        <div style={S.resultsSummaryCard}>
          <span style={S.resultsSummaryLabel}>ÚLTIMO RESULTADO</span>
          <strong style={S.resultsSummaryValueSmall}>
            {ultimoResultado
              ? `${ultimoResultado.valor}${
                  ultimoResultado.unidad
                    ? ` ${ultimoResultado.unidad}`
                    : ""
                }`
              : "Sin registros"}
          </strong>
        </div>
      </div>

      <div style={S.resultsFormCard}>
        <div style={S.resultsPanelHeading}>
          <div>
            <span style={S.sectionEyebrow}>NUEVA MARCA</span>
            <h2 style={S.resultsPanelTitle}>Registrar resultado</h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setCargando(true);
              Promise.all([
                cargarResultados(),
                cargarServiciosResultados(),
              ]).finally(() => setCargando(false));
            }}
            disabled={cargando}
            style={S.outlineSmallButton}
          >
            {cargando ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div style={S.resultsFormGrid} className="results-form-grid">
          <label style={S.resultsField}>
            <span style={S.resultsFieldLabel}>Fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={S.resultsInput}
            />
          </label>

          <label style={S.resultsField}>
            <span style={S.resultsFieldLabel}>Clase</span>
            <select
              value={servicioId}
              onChange={(e) => setServicioId(e.target.value)}
              style={S.resultsInput}
            >
              <option value="">Sin clase específica</option>
              {servicios.map((servicio) => (
                <option
                  key={servicio.id}
                  value={String(servicio.id)}
                >
                  {servicio.nombre ||
                    servicio.servicio_nombre ||
                    "Clase"}
                </option>
              ))}
            </select>
          </label>

          <label style={S.resultsField}>
            <span style={S.resultsFieldLabel}>Tipo de resultado</span>
            <select
              value={tipo}
              onChange={(e) => cambiarTipoResultado(e.target.value)}
              style={S.resultsInput}
            >
              {TIPOS_RESULTADO.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label style={S.resultsField}>
            <span style={S.resultsFieldLabel}>Resultado</span>
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={
                tipo === "tiempo"
                  ? "Ej. 12:35"
                  : tipo === "peso"
                  ? "Ej. 85"
                  : tipo === "repeticiones"
                  ? "Ej. 50"
                  : "Escribe tu marca"
              }
              style={S.resultsInput}
            />
          </label>

          <label style={S.resultsField}>
            <span style={S.resultsFieldLabel}>Unidad</span>
            <input
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              placeholder="kg, reps, min..."
              style={S.resultsInput}
            />
          </label>

          <label style={{ ...S.resultsField, gridColumn: "1 / -1" }}>
            <span style={S.resultsFieldLabel}>Notas</span>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional: sensaciones, carga, nivel, observaciones..."
              style={S.resultsTextarea}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={guardarResultado}
          disabled={guardando}
          style={S.resultsSaveButton}
        >
          {guardando ? "Guardando..." : "+ Guardar resultado"}
        </button>

        {mensajeResultados && (
          <div style={S.resultsSuccess}>{mensajeResultados}</div>
        )}

        {errorResultados && (
          <div style={S.resultsError}>{errorResultados}</div>
        )}
      </div>

      <div style={S.resultsHistoryCard}>
        <div style={S.resultsPanelHeading}>
          <div>
            <span style={S.sectionEyebrow}>HISTORIAL</span>
            <h2 style={S.resultsPanelTitle}>Mis marcas</h2>
          </div>
        </div>

        {cargando ? (
          <div style={S.resultsLoading}>
            <div style={S.loader} />
            <strong>Cargando resultados...</strong>
          </div>
        ) : resultados.length > 0 ? (
          <div style={S.resultsList}>
            {resultados.map((resultado) => (
              <article key={resultado.id} style={S.resultCard}>
                <div style={S.resultCardTop}>
                  <div style={{ minWidth: 0 }}>
                    <span style={S.resultDate}>
                      {formatearFechaResultado(resultado.fecha)}
                    </span>
                    <strong style={S.resultService}>
                      {resultado.servicio_nombre ||
                        "Entrenamiento general"}
                    </strong>
                  </div>

                  <span style={S.resultTypeBadge}>
                    {etiquetaTipoResultado(resultado.tipo)}
                  </span>
                </div>

                <div style={S.resultValueRow}>
                  <strong style={S.resultValue}>
                    {resultado.valor}
                    {resultado.unidad
                      ? ` ${resultado.unidad}`
                      : ""}
                  </strong>

                  <button
                    type="button"
                    onClick={() => eliminarResultado(resultado.id)}
                    disabled={
                      String(eliminandoId) === String(resultado.id)
                    }
                    style={S.resultDeleteButton}
                  >
                    {String(eliminandoId) === String(resultado.id)
                      ? "Eliminando..."
                      : "Eliminar"}
                  </button>
                </div>

                {resultado.notas && (
                  <p style={S.resultNotes}>{resultado.notas}</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div style={S.resultsEmpty}>
            <div style={S.resultsEmptyIcon}>★</div>
            <strong style={S.resultsEmptyTitle}>
              Aún no tienes resultados
            </strong>
            <span style={S.resultsEmptyText}>
              Registra tu primera marca arriba. Aquí se irá formando tu
              historial de tiempos, pesos, repeticiones y demás resultados.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function Configuracion({
  slug,
  cuenta,
  membresia,
  estadoVisual,
  accesoPermitido,
  formatearFecha,
  fotoFirmada,
  iniciales,
  peso,
  setPeso,
  estatura,
  setEstatura,
  pesoVisual,
  estaturaVisual,
  mostrarEditor,
  setMostrarEditor,
  guardandoPerfil,
  guardarDatosPerfil,
  subiendoFoto,
  subirSelfie,
  cerrarSesion,
}) {
  const [tabConfig, setTabConfig] = useState("perfil");
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [mensajeClave, setMensajeClave] = useState("");

  const [pagosAlumno, setPagosAlumno] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [errorPagos, setErrorPagos] = useState("");
  const [pagoAbiertoId, setPagoAbiertoId] = useState("");

  const [preferenciasNotif, setPreferenciasNotif] = useState({
    reserva_confirmada: true,
    recordatorio_clase: true,
    cambio_cancelacion: true,
    vencimiento_membresia: true,
    pago_comprobante: true,
  });
  const [cargandoNotif, setCargandoNotif] = useState(false);
  const [guardandoNotif, setGuardandoNotif] = useState(false);
  const [mensajeNotif, setMensajeNotif] = useState("");
  const [errorNotif, setErrorNotif] = useState("");

  useEffect(() => {
    if (tabConfig !== "pagos") return;
    cargarPagosAlumno();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabConfig, slug]);

  async function cargarPagosAlumno() {
    if (!slug) return;

    setCargandoPagos(true);
    setErrorPagos("");

    try {
      const { data, error } = await supabase.rpc(
        "obtener_mis_pagos_alumno",
        {
          p_slug: slug,
        }
      );

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudo cargar tu historial de pagos."
        );
      }

      setPagosAlumno(
        Array.isArray(data?.pagos) ? data.pagos : []
      );
    } catch (err) {
      console.error("Error cargando pagos del alumno:", err);
      setPagosAlumno([]);
      setErrorPagos(
        err?.message || "No se pudo cargar tu historial de pagos."
      );
    } finally {
      setCargandoPagos(false);
    }
  }

  function formatearFechaPago(valor) {
    if (!valor) return "-";

    try {
      const texto = String(valor);
      const fecha = texto.includes("T")
        ? new Date(texto)
        : new Date(`${texto.slice(0, 10)}T12:00:00`);

      if (Number.isNaN(fecha.getTime())) {
        return texto;
      }

      return new Intl.DateTimeFormat("es-PA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(fecha);
    } catch {
      return String(valor);
    }
  }

  function formatearMontoPago(valor) {
    const numero = Number(valor || 0);

    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Number.isFinite(numero) ? numero : 0);
  }

  const totalPagadoAlumno = pagosAlumno.reduce(
    (total, pago) => total + Math.max(0, Number(pago?.monto || 0)),
    0
  );

  const ultimoPagoAlumno = pagosAlumno[0] || null;

  useEffect(() => {
    if (tabConfig !== "notificaciones" || !slug) return;
    cargarPreferenciasNotificaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabConfig, slug]);

  async function cargarPreferenciasNotificaciones() {
    setCargandoNotif(true);
    setMensajeNotif("");
    setErrorNotif("");

    try {
      const { data, error } = await supabase.rpc(
        "obtener_preferencias_notificaciones_alumno",
        {
          p_slug: slug,
        }
      );

      if (error) {
        const codigo = String(error?.code || "");

        if (["PGRST202", "42883"].includes(codigo)) {
          throw new Error(
            "Falta ejecutar el SQL V17 de Resultados y Notificaciones en Supabase."
          );
        }

        throw error;
      }

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudieron cargar tus preferencias."
        );
      }

      const preferencias = data?.preferencias || {};

      setPreferenciasNotif({
        reserva_confirmada:
          preferencias?.reserva_confirmada !== false,
        recordatorio_clase:
          preferencias?.recordatorio_clase !== false,
        cambio_cancelacion:
          preferencias?.cambio_cancelacion !== false,
        vencimiento_membresia:
          preferencias?.vencimiento_membresia !== false,
        pago_comprobante:
          preferencias?.pago_comprobante !== false,
      });
    } catch (err) {
      console.error("Error cargando preferencias:", err);
      setErrorNotif(
        err?.message || "No se pudieron cargar tus preferencias."
      );
    } finally {
      setCargandoNotif(false);
    }
  }

  function cambiarPreferenciaNotificacion(campo) {
    setPreferenciasNotif((prev) => ({
      ...prev,
      [campo]: !prev[campo],
    }));
    setMensajeNotif("");
  }

  async function guardarPreferenciasNotificaciones() {
    setGuardandoNotif(true);
    setMensajeNotif("");
    setErrorNotif("");

    try {
      const { data, error } = await supabase.rpc(
        "guardar_preferencias_notificaciones_alumno",
        {
          p_slug: slug,
          p_reserva_confirmada:
            Boolean(preferenciasNotif.reserva_confirmada),
          p_recordatorio_clase:
            Boolean(preferenciasNotif.recordatorio_clase),
          p_cambio_cancelacion:
            Boolean(preferenciasNotif.cambio_cancelacion),
          p_vencimiento_membresia:
            Boolean(preferenciasNotif.vencimiento_membresia),
          p_pago_comprobante:
            Boolean(preferenciasNotif.pago_comprobante),
        }
      );

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudieron guardar tus preferencias."
        );
      }

      setMensajeNotif("Preferencias guardadas correctamente.");
    } catch (err) {
      console.error("Error guardando preferencias:", err);
      setErrorNotif(
        err?.message || "No se pudieron guardar tus preferencias."
      );
    } finally {
      setGuardandoNotif(false);
    }
  }

  async function cambiarClave() {
    setMensajeClave("");

    if (String(nuevaClave).length < 8) {
      setMensajeClave("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (nuevaClave !== confirmarClave) {
      setMensajeClave("Las contraseñas no coinciden.");
      return;
    }

    setGuardandoClave(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: nuevaClave,
      });

      if (error) throw error;

      setNuevaClave("");
      setConfirmarClave("");
      setMensajeClave("Contraseña actualizada correctamente.");
    } catch (err) {
      setMensajeClave(err?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setGuardandoClave(false);
    }
  }

  const tabs = [
    { id: "perfil", label: "Perfil" },
    { id: "clave", label: "Cambiar contraseña" },
    { id: "membresia", label: "Membresía" },
    { id: "pagos", label: "Pagos" },
    { id: "notificaciones", label: "Notificaciones" },
    { id: "fisico", label: "Seguimiento físico" },
  ];

  return (
    <section style={S.profileSettingsShell} className="profile-settings-shell">
      <aside style={S.profileSummaryCard}>
        <div style={S.profileSummaryAvatar}>
          {fotoFirmada ? (
            <img
              src={fotoFirmada}
              alt={cuenta?.nombre || "Alumno"}
              style={S.avatarImage}
            />
          ) : (
            <span>{iniciales}</span>
          )}
        </div>

        <strong style={S.profileSummaryName}>
          {cuenta?.nombre || "Alumno"}
        </strong>

        <span style={S.profileSummaryRole}>Cliente</span>

        <label style={S.changePhotoButton}>
          {subiendoFoto ? "Subiendo..." : "✎ Cambiar foto"}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={subirSelfie}
            disabled={subiendoFoto}
            style={{ display: "none" }}
          />
        </label>

        <div style={S.profileSummaryDivider} />

        <ResumenFila
          label="Estado"
          value={accesoPermitido ? "Activo" : estadoVisual}
        />

        <ResumenFila
          label="Membresía"
          value={membresia?.plan || "Sin plan"}
        />

        <ResumenFila
          label="Vencimiento"
          value={
            membresia?.fecha_vencimiento
              ? formatearFecha(membresia.fecha_vencimiento)
              : "-"
          }
        />

        <ResumenFila
          label="Check-ins"
          value={cuenta?.checkins_total ?? cuenta?.checkins ?? "—"}
        />

        <button
          type="button"
          onClick={cerrarSesion}
          style={S.profileLogoutButton}
        >
          Cerrar sesión
        </button>
      </aside>

      <div style={S.profileSettingsMain}>
        <div style={S.profileTabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabConfig(tab.id)}
              style={{
                ...S.profileTabButton,
                ...(tabConfig === tab.id ? S.profileTabButtonActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tabConfig === "perfil" && (
          <div style={S.profilePanel}>
            <div style={S.profilePanelHeading}>
              <div>
                <span style={S.sectionEyebrow}>PERFIL</span>
                <h2 style={S.profilePanelTitle}>Datos personales</h2>
              </div>
            </div>

            <div style={S.profileFieldsGrid} className="profile-fields-grid">
              <ProfileField
                label="Nombre y apellidos"
                value={cuenta?.nombre || "-"}
              />
              <ProfileField
                label="ID Cliente"
                value={cuenta?.cedula || "-"}
              />
              <ProfileField
                label="Email"
                value={cuenta?.correo || "-"}
              />
              <ProfileField
                label="Teléfono"
                value={cuenta?.telefono || "-"}
              />
              <ProfileField
                label="Estado"
                value={accesoPermitido ? "Activo" : estadoVisual}
              />
              <ProfileField
                label="Plan actual"
                value={membresia?.plan || "Sin membresía"}
              />
            </div>
          </div>
        )}

        {tabConfig === "clave" && (
          <div style={S.profilePanel}>
            <span style={S.sectionEyebrow}>SEGURIDAD</span>
            <h2 style={S.profilePanelTitle}>Cambiar contraseña</h2>

            <div style={S.passwordForm}>
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Nueva contraseña</label>
                <input
                  type="password"
                  value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={S.input}
                />
              </div>

              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmarClave}
                  onChange={(e) => setConfirmarClave(e.target.value)}
                  placeholder="Repite la contraseña"
                  style={S.input}
                />
              </div>

              {mensajeClave && (
                <div style={S.passwordMessage}>{mensajeClave}</div>
              )}

              <button
                type="button"
                onClick={cambiarClave}
                disabled={guardandoClave}
                style={S.saveProfileButton}
              >
                {guardandoClave
                  ? "Actualizando..."
                  : "Actualizar contraseña"}
              </button>
            </div>
          </div>
        )}

        {tabConfig === "membresia" && (
          <div style={S.profilePanel}>
            <span style={S.sectionEyebrow}>SUSCRIPCIÓN</span>
            <h2 style={S.profilePanelTitle}>Mi membresía</h2>

            {membresia ? (
              <div style={S.membershipProfileCard}>
                <strong style={S.membershipProfilePlan}>
                  {membresia.plan || "Membresía"}
                </strong>

                <div style={S.profileFieldsGrid} className="profile-fields-grid">
                  <ProfileField
                    label="Estado"
                    value={estadoVisual}
                  />
                  <ProfileField
                    label="Periodicidad"
                    value={membresia.periodicidad || "-"}
                  />
                  <ProfileField
                    label="Fecha de inicio"
                    value={
                      membresia.fecha_inicio
                        ? formatearFecha(membresia.fecha_inicio)
                        : "-"
                    }
                  />
                  <ProfileField
                    label="Vencimiento"
                    value={
                      membresia.fecha_vencimiento
                        ? formatearFecha(membresia.fecha_vencimiento)
                        : "-"
                    }
                  />
                </div>
              </div>
            ) : (
              <ConfigEmpty
                title="Sin membresía registrada"
                text="Cuando el gimnasio te asigne una membresía aparecerá aquí."
              />
            )}
          </div>
        )}

        {tabConfig === "pagos" && (
          <div style={S.profilePanel}>
            <div style={S.profilePanelHeading}>
              <div>
                <span style={S.sectionEyebrow}>PAGOS</span>
                <h2 style={S.profilePanelTitle}>Facturación y pagos</h2>
              </div>

              <button
                type="button"
                onClick={cargarPagosAlumno}
                disabled={cargandoPagos}
                style={S.outlineSmallButton}
              >
                {cargandoPagos ? "Actualizando..." : "Actualizar"}
              </button>
            </div>

            {errorPagos && (
              <div style={S.paymentError}>{errorPagos}</div>
            )}

            {!cargandoPagos && !errorPagos && pagosAlumno.length > 0 && (
              <>
                <div style={S.paymentSummaryGrid} className="payment-summary-grid">
                  <div style={S.paymentSummaryCard}>
                    <span style={S.paymentSummaryLabel}>TOTAL REGISTRADO</span>
                    <strong style={S.paymentSummaryValue}>
                      {formatearMontoPago(totalPagadoAlumno)}
                    </strong>
                  </div>

                  <div style={S.paymentSummaryCard}>
                    <span style={S.paymentSummaryLabel}>ÚLTIMO PAGO</span>
                    <strong style={S.paymentSummaryValueSmall}>
                      {ultimoPagoAlumno
                        ? formatearFechaPago(ultimoPagoAlumno.fecha_pago)
                        : "-"}
                    </strong>
                  </div>

                  <div style={S.paymentSummaryCard}>
                    <span style={S.paymentSummaryLabel}>MOVIMIENTOS</span>
                    <strong style={S.paymentSummaryValue}>
                      {pagosAlumno.length}
                    </strong>
                  </div>
                </div>

                <div style={S.paymentList}>
                  {pagosAlumno.map((pago) => {
                    const abierto =
                      String(pagoAbiertoId) === String(pago.id);

                    return (
                      <article key={pago.id} style={S.paymentCard}>
                        <div style={S.paymentCardTop}>
                          <div style={{ minWidth: 0 }}>
                            <span style={S.paymentDate}>
                              {formatearFechaPago(pago.fecha_pago)}
                            </span>
                            <strong style={S.paymentConcept}>
                              {pago.tipo ||
                                pago.tipo_movimiento ||
                                "Pago"}
                            </strong>
                          </div>

                          <div style={S.paymentAmountWrap}>
                            <strong style={S.paymentAmount}>
                              {formatearMontoPago(pago.monto)}
                            </strong>
                            <span style={S.paymentPaidBadge}>
                              {pago.estado || "Procesado"}
                            </span>
                          </div>
                        </div>

                        <div style={S.paymentMeta}>
                          <span>
                            Método: <strong>{pago.metodo_pago || "-"}</strong>
                          </span>
                          {pago.numero_transaccion && (
                            <span>
                              Transacción:{" "}
                              <strong>{pago.numero_transaccion}</strong>
                            </span>
                          )}
                        </div>

                        {pago.descripcion && (
                          <p style={S.paymentDescription}>
                            {pago.descripcion}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setPagoAbiertoId(
                              abierto ? "" : String(pago.id)
                            )
                          }
                          style={S.paymentReceiptButton}
                        >
                          {abierto ? "Ocultar comprobante" : "Ver comprobante"}
                        </button>

                        {abierto && (
                          <div style={S.receiptBox}>
                            <div style={S.receiptHeader}>
                              <div>
                                <span style={S.receiptEyebrow}>COMPROBANTE KONAX</span>
                                <strong style={S.receiptTitle}>
                                  Pago registrado
                                </strong>
                              </div>
                              <strong style={S.receiptAmount}>
                                {formatearMontoPago(pago.monto)}
                              </strong>
                            </div>

                            <div style={S.receiptRows}>
                              <ResumenFila
                                label="Alumno"
                                value={cuenta?.nombre || "-"}
                              />
                              <ResumenFila
                                label="Fecha"
                                value={formatearFechaPago(pago.fecha_pago)}
                              />
                              <ResumenFila
                                label="Concepto"
                                value={
                                  pago.tipo ||
                                  pago.tipo_movimiento ||
                                  "Pago"
                                }
                              />
                              <ResumenFila
                                label="Método"
                                value={pago.metodo_pago || "-"}
                              />
                              <ResumenFila
                                label="Estado"
                                value={pago.estado || "Procesado"}
                              />
                              {pago.numero_transaccion && (
                                <ResumenFila
                                  label="Transacción"
                                  value={pago.numero_transaccion}
                                />
                              )}
                              {pago.numero_cuenta && (
                                <ResumenFila
                                  label="Cuenta"
                                  value={pago.numero_cuenta}
                                />
                              )}
                            </div>

                            <span style={S.receiptNote}>
                              Este comprobante corresponde al movimiento
                              registrado por el gimnasio en KONAX.
                            </span>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {!cargandoPagos && !errorPagos && pagosAlumno.length === 0 && (
              <ConfigEmpty
                title="Sin pagos registrados"
                text="Cuando el gimnasio registre un pago a tu nombre en Caja, aparecerá automáticamente en este historial."
              />
            )}

            {cargandoPagos && (
              <div style={S.paymentLoading}>
                <div style={S.loader} />
                <strong>Cargando historial de pagos...</strong>
              </div>
            )}
          </div>
        )}

        {tabConfig === "notificaciones" && (
          <div style={S.profilePanel}>
            <div style={S.profilePanelHeading}>
              <div>
                <span style={S.sectionEyebrow}>PREFERENCIAS</span>
                <h2 style={S.profilePanelTitle}>Notificaciones</h2>
              </div>

              <button
                type="button"
                onClick={cargarPreferenciasNotificaciones}
                disabled={cargandoNotif}
                style={S.outlineSmallButton}
              >
                {cargandoNotif ? "Actualizando..." : "Actualizar"}
              </button>
            </div>

            <p style={S.notificationIntro}>
              Decide qué avisos quieres recibir. Estas preferencias quedan
              guardadas en tu ficha de alumno y serán respetadas por los
              canales automáticos habilitados por el gimnasio.
            </p>

            {cargandoNotif ? (
              <div style={S.notificationLoading}>
                <div style={S.loader} />
                <strong>Cargando preferencias...</strong>
              </div>
            ) : (
              <div style={S.notificationList}>
                <NotificacionToggle
                  titulo="Reserva confirmada"
                  texto="Aviso cuando una clase quede reservada a tu nombre."
                  activo={preferenciasNotif.reserva_confirmada}
                  onCambiar={() =>
                    cambiarPreferenciaNotificacion("reserva_confirmada")
                  }
                />

                <NotificacionToggle
                  titulo="Recordatorio de clase"
                  texto="Recordatorio antes de una clase que tengas reservada."
                  activo={preferenciasNotif.recordatorio_clase}
                  onCambiar={() =>
                    cambiarPreferenciaNotificacion("recordatorio_clase")
                  }
                />

                <NotificacionToggle
                  titulo="Cambios o cancelaciones"
                  texto="Aviso si el gimnasio modifica o cancela un horario reservado."
                  activo={preferenciasNotif.cambio_cancelacion}
                  onCambiar={() =>
                    cambiarPreferenciaNotificacion("cambio_cancelacion")
                  }
                />

                <NotificacionToggle
                  titulo="Membresía por vencer"
                  texto="Aviso antes de que llegue la fecha de vencimiento de tu plan."
                  activo={preferenciasNotif.vencimiento_membresia}
                  onCambiar={() =>
                    cambiarPreferenciaNotificacion("vencimiento_membresia")
                  }
                />

                <NotificacionToggle
                  titulo="Pago y comprobante"
                  texto="Confirmación cuando el gimnasio registre un pago a tu nombre."
                  activo={preferenciasNotif.pago_comprobante}
                  onCambiar={() =>
                    cambiarPreferenciaNotificacion("pago_comprobante")
                  }
                />
              </div>
            )}

            {mensajeNotif && (
              <div style={S.notificationSuccess}>{mensajeNotif}</div>
            )}

            {errorNotif && (
              <div style={S.notificationError}>{errorNotif}</div>
            )}

            <button
              type="button"
              onClick={guardarPreferenciasNotificaciones}
              disabled={guardandoNotif || cargandoNotif}
              style={S.notificationSaveButton}
            >
              {guardandoNotif
                ? "Guardando..."
                : "Guardar preferencias"}
            </button>
          </div>
        )}

        {tabConfig === "fisico" && (
          <div style={S.profilePanel}>
            <div style={S.profilePanelHeading}>
              <div>
                <span style={S.sectionEyebrow}>SEGUIMIENTO FÍSICO</span>
                <h2 style={S.profilePanelTitle}>Peso y estatura</h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarEditor((valor) => !valor)}
                style={S.outlineSmallButton}
              >
                {mostrarEditor ? "Cerrar" : "Editar"}
              </button>
            </div>

            <div style={S.configGrid} className="config-grid">
              <Metric label="Peso" value={pesoVisual} />
              <Metric label="Estatura" value={estaturaVisual} />
            </div>

            {mostrarEditor && (
              <div style={S.profileEditor}>
                <div style={S.fieldGroup}>
                  <label style={S.fieldLabel}>Peso (kg)</label>
                  <input
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    inputMode="decimal"
                    placeholder="Ej. 82.5"
                    style={S.input}
                  />
                </div>

                <div style={S.fieldGroup}>
                  <label style={S.fieldLabel}>Estatura (m)</label>
                  <input
                    value={estatura}
                    onChange={(e) => setEstatura(e.target.value)}
                    inputMode="decimal"
                    placeholder="Ej. 1.76"
                    style={S.input}
                  />
                </div>

                <button
                  type="button"
                  onClick={guardarDatosPerfil}
                  disabled={guardandoPerfil}
                  style={S.saveProfileButton}
                >
                  {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


function NotificacionToggle({
  titulo,
  texto,
  activo,
  onCambiar,
}) {
  return (
    <div style={S.notificationRow}>
      <div style={S.notificationCopy}>
        <strong style={S.notificationTitle}>{titulo}</strong>
        <span style={S.notificationText}>{texto}</span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={Boolean(activo)}
        aria-label={`${titulo}: ${activo ? "activado" : "desactivado"}`}
        onClick={onCambiar}
        style={{
          ...S.notificationSwitch,
          ...(activo ? S.notificationSwitchActive : {}),
        }}
      >
        <span
          style={{
            ...S.notificationSwitchKnob,
            ...(activo ? S.notificationSwitchKnobActive : {}),
          }}
        />
      </button>
    </div>
  );
}

function ResumenFila({ label, value }) {
  return (
    <div style={S.profileSummaryRow}>
      <span style={S.profileSummaryLabel}>{label}</span>
      <strong style={S.profileSummaryValue}>{value}</strong>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div style={S.profileField}>
      <span style={S.profileFieldLabel}>{label}</span>
      <strong style={S.profileFieldValue}>{value}</strong>
    </div>
  );
}

function ConfigEmpty({ title, text }) {
  return (
    <div style={S.configEmpty}>
      <div style={S.configEmptyIcon}>◇</div>
      <strong style={S.configEmptyTitle}>{title}</strong>
      <span style={S.configEmptyText}>{text}</span>
    </div>
  );
}

function SeccionVacia({
  eyebrow,
  titulo,
  texto,
  icono,
  accion,
  onAccion,
}) {
  return (
    <section style={S.emptyPageCard}>
      <div style={S.emptyPageIcon}>{icono}</div>
      <span style={S.sectionEyebrow}>{eyebrow}</span>
      <h1 style={S.emptyPageTitle}>{titulo}</h1>
      <p style={S.emptyPageText}>{texto}</p>

      <button
        type="button"
        onClick={onAccion}
        style={S.primaryButton}
      >
        {accion}
      </button>
    </section>
  );
}

function QuickCard({ icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={S.quickCard}
    >
      <span style={S.quickIcon}>{icon}</span>
      <span style={S.quickCopy}>
        <strong style={S.quickTitle}>{title}</strong>
        <span style={S.quickSubtitle}>{subtitle}</span>
      </span>
      <span style={S.quickArrow}>›</span>
    </button>
  );
}

function Metric({ label, value }) {
  return (
    <div style={S.metricCard}>
      <span style={S.metricLabel}>{label}</span>
      <strong style={S.metricValue}>{value}</strong>
    </div>
  );
}

function Fila({ label, value }) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <strong style={S.rowValue}>{value}</strong>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at top right,rgba(22,131,79,.13),transparent 35%),radial-gradient(circle at bottom left,rgba(15,85,52,.08),transparent 32%),#EEF4F0",
    color: "#17211C",
    fontFamily:
      'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  },

  shell: {
    position: "relative",
    width: "min(680px,100%)",
    minHeight: 760,
    overflow: "hidden",
    border: "1px solid #D9E6DE",
    borderRadius: 28,
    background: "#F6F8FB",
    boxShadow: "0 28px 80px rgba(15,50,31,.13)",
  },

  topUserRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  topMenuIconButton: {
    width: 44,
    height: 44,
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    border: 0,
    borderRadius: 13,
    background: "#0B1628",
    color: "#FFFFFF",
    fontSize: 21,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(15,23,42,.12)",
  },

  topUserButton: {
    minWidth: 0,
    padding: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: 0,
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
  },

  topUserBlock: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  topUserAvatar: {
    width: 46,
    height: 46,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    borderRadius: 14,
    background: "#E9EEF4",
    color: "#0F172A",
    fontSize: 16,
    fontWeight: 950,
  },

  topUserText: {
    minWidth: 0,
  },

  topUserName: {
    display: "block",
    maxWidth: 230,
    overflow: "hidden",
    color: "#111827",
    fontSize: 14,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  topUserState: {
    display: "block",
    marginTop: 2,
    color: "#7A8797",
    fontSize: 8.5,
  },

  topbar: {
    minHeight: 74,
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "#FFFFFF",
    borderBottom: "1px solid #E6EBF1",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },

  menuButton: {
    width: 40,
    height: 40,
    border: 0,
    borderRadius: 12,
    background: "#0F172A",
    color: "#FFFFFF",
    fontSize: 19,
    cursor: "pointer",
  },

  brandBlock: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  brandTextWrap: {
    minWidth: 0,
  },

  brandMark: {
    width: 48,
    height: 48,
    overflow: "hidden",
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#FFFFFF",
    border: "1px solid #DDE8E1",
    color: "#0F172A",
    fontSize: 17,
    fontWeight: 950,
  },

  brandLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    background: "#FFFFFF",
  },

  brandName: {
    display: "block",
    maxWidth: 260,
    overflow: "hidden",
    color: "#0F172A",
    fontSize: 13,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  powered: {
    display: "block",
    marginTop: 2,
    color: "#829088",
    fontSize: 8,
  },

  refreshButton: {
    width: 40,
    height: 40,
    border: "1px solid #DCE6E0",
    borderRadius: 12,
    background: "#F8FAF9",
    color: "#426050",
    fontSize: 18,
    fontWeight: 850,
    cursor: "pointer",
  },

  content: {
    padding: "18px 18px 26px",
  },

  menuOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 90,
    border: 0,
    background: "rgba(8,18,12,.55)",
    backdropFilter: "blur(2px)",
  },

  drawer: {
    position: "fixed",
    zIndex: 100,
    top: 0,
    left: 0,
    bottom: 0,
    width: "min(360px,88vw)",
    padding: "18px 16px",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    background: "linear-gradient(180deg,#07111F 0%,#0B1628 55%,#0A1422 100%)",
    color: "#FFFFFF",
    boxShadow: "18px 0 50px rgba(0,0,0,.22)",
  },

  drawerBusiness: {
    padding: "4px 8px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid rgba(255,255,255,.09)",
  },

  drawerBusinessLogo: {
    width: 52,
    height: 52,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: 16,
    fontWeight: 950,
  },

  drawerBusinessText: {
    minWidth: 0,
  },

  drawerBusinessName: {
    display: "block",
    minWidth: 0,
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 900,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  drawerBusinessSub: {
    display: "block",
    marginTop: 2,
    color: "#72839A",
    fontSize: 8,
  },

  drawerHeader: {
    padding: "8px 8px 18px",
    display: "grid",
    gridTemplateColumns: "56px minmax(0,1fr)",
    gap: 11,
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,.09)",
  },

  drawerAvatar: {
    width: 56,
    height: 56,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background: "rgba(255,255,255,.10)",
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 950,
  },

  drawerName: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 14,
  },

  drawerState: {
    display: "block",
    marginTop: 3,
    color: "#8FB9D1",
    fontSize: 9,
  },

  drawerNav: {
    padding: "16px 0",
    display: "grid",
    alignContent: "start",
    gap: 5,
  },

  drawerItem: {
    width: "100%",
    minHeight: 48,
    padding: "0 13px",
    display: "grid",
    gridTemplateColumns: "31px minmax(0,1fr)",
    alignItems: "center",
    gap: 8,
    border: 0,
    borderRadius: 12,
    background: "transparent",
    color: "#D5DEE8",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 750,
    cursor: "pointer",
  },

  drawerItemActive: {
    background: "linear-gradient(90deg,#0B3C5D 0%,#0D506B 100%)",
    color: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(0,0,0,.16)",
  },

  drawerIcon: {
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "rgba(255,255,255,.07)",
    fontSize: 14,
  },

  drawerFooter: {
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,.09)",
  },

  drawerLogout: {
    width: "100%",
    minHeight: 44,
    border: "1px solid rgba(255,255,255,.13)",
    borderRadius: 11,
    background: "transparent",
    color: "#D8E2DC",
    fontSize: 10,
    fontWeight: 800,
  },

  inlineError: {
    marginBottom: 12,
    padding: 11,
    border: "1px solid #F0C9C4",
    borderRadius: 12,
    background: "#FFF2F0",
    color: "#8B3C34",
    fontSize: 9,
  },

  successMessage: {
    marginBottom: 12,
    padding: 11,
    border: "1px solid #BFE3CE",
    borderRadius: 12,
    background: "#ECF9F1",
    color: "#196D42",
    fontSize: 9,
    fontWeight: 800,
  },

  hero: {
    marginBottom: 15,
    padding: 18,
    borderRadius: 21,
    background:
      "linear-gradient(135deg,#173C2A 0%,#0F6B40 100%)",
    color: "#FFFFFF",
    boxShadow: "0 16px 34px rgba(23,60,42,.18)",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  heroIdentity: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "62px minmax(0,1fr)",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 62,
    height: 62,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "rgba(255,255,255,.13)",
    border: "1px solid rgba(255,255,255,.18)",
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: 950,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  welcome: {
    display: "block",
    marginBottom: 2,
    color: "#B9DDC8",
    fontSize: 9,
  },

  memberName: {
    margin: 0,
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 1.08,
    textOverflow: "ellipsis",
  },

  memberId: {
    display: "block",
    marginTop: 5,
    color: "#B9D2C3",
    fontSize: 8.5,
  },

  estadoBadge: {
    minHeight: 28,
    padding: "0 9px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    fontSize: 8.5,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  estadoBadgeOk: {
    color: "#D9FFE8",
    background: "rgba(77,210,132,.16)",
    border: "1px solid rgba(137,236,176,.21)",
  },

  estadoBadgeWarning: {
    color: "#FFF0C4",
    background: "rgba(242,181,61,.15)",
    border: "1px solid rgba(255,217,137,.20)",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
  },

  heroStats: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },

  heroStat: {
    padding: 11,
    borderRadius: 13,
    background: "rgba(255,255,255,.09)",
    border: "1px solid rgba(255,255,255,.09)",
  },

  heroStatLabel: {
    display: "block",
    color: "#A9CDB8",
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: 1,
  },

  heroStatValue: {
    display: "block",
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 1.3,
  },

  quickSection: {
    marginBottom: 15,
    padding: 17,
    border: "1px solid #DFE8E2",
    borderRadius: 19,
    background: "#FFFFFF",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 9,
  },

  quickCard: {
    minHeight: 82,
    padding: 12,
    display: "grid",
    gridTemplateColumns: "38px minmax(0,1fr) 14px",
    alignItems: "center",
    gap: 8,
    border: "1px solid #E2EAE5",
    borderRadius: 14,
    background: "#F9FBFA",
    textAlign: "left",
    cursor: "pointer",
  },

  quickIcon: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#E6F4EB",
    color: "#0EA5A6",
    fontSize: 16,
    fontWeight: 900,
  },

  quickCopy: {
    minWidth: 0,
    display: "grid",
    gap: 2,
  },

  quickTitle: {
    color: "#243A2D",
    fontSize: 11,
  },

  quickSubtitle: {
    color: "#829088",
    fontSize: 7.5,
  },

  quickArrow: {
    color: "#AAB6AF",
    fontSize: 20,
  },

  accessBanner: {
    marginBottom: 15,
    padding: 15,
    display: "grid",
    gridTemplateColumns: "42px minmax(0,1fr)",
    alignItems: "center",
    gap: 11,
    borderRadius: 16,
  },

  accessBannerOk: {
    background: "#EAF8F0",
    border: "1px solid #C5E9D3",
  },

  accessBannerBlocked: {
    background: "#FFF5E6",
    border: "1px solid #F0D9AB",
  },

  accessIcon: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    fontSize: 18,
    fontWeight: 950,
  },

  accessIconOk: {
    background: "#D6F2E0",
    color: "#0EA5A6",
  },

  accessIconBlocked: {
    background: "#FFEAC5",
    color: "#A66A00",
  },

  accessLabel: {
    display: "block",
    color: "#718077",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1,
  },

  accessTitle: {
    display: "block",
    marginTop: 2,
    color: "#22372B",
    fontSize: 14,
  },

  accessText: {
    margin: "4px 0 0",
    color: "#69786F",
    fontSize: 9.5,
    lineHeight: 1.45,
  },

  section: {
    marginBottom: 15,
    padding: 18,
    border: "1px solid #DFE8E2",
    borderRadius: 19,
    background: "#FFFFFF",
  },

  sectionHeading: {
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  sectionEyebrow: {
    display: "block",
    color: "#0EA5A6",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1.1,
  },

  sectionTitle: {
    margin: "3px 0 0",
    color: "#17251D",
    fontSize: 20,
  },

  memberHome: {
    marginBottom: 15,
    display: "grid",
    gap: 14,
  },

  memberProfileCard: {
    position: "relative",
    overflow: "hidden",
    padding: "28px 20px 20px",
    display: "grid",
    justifyItems: "center",
    border: "1px solid #DDE6EE",
    borderRadius: 20,
    background: "#FFFFFF",
    boxShadow: "0 12px 28px rgba(15,23,42,.06)",
  },

  memberProfileAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: "linear-gradient(90deg,#0EA5A6 0%,#0D506B 100%)",
  },

  memberProfileAvatar: {
    width: 112,
    height: 112,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#E9EEF4",
    border: "5px solid #F5F7FA",
    boxShadow: "0 0 0 2px #D6DEE7",
    color: "#111827",
    fontSize: 34,
    fontWeight: 850,
  },

  memberProfileName: {
    margin: "14px 0 2px",
    maxWidth: "100%",
    overflow: "hidden",
    color: "#172033",
    fontSize: 22,
    lineHeight: 1.12,
    textAlign: "center",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  memberProfileRole: {
    color: "#7A8797",
    fontSize: 10,
  },

  memberEditButton: {
    minHeight: 40,
    marginTop: 13,
    padding: "0 17px",
    border: "1px solid #D7DEE7",
    borderRadius: 9,
    background: "#F8FAFC",
    color: "#3C4858",
    fontSize: 10,
    fontWeight: 800,
    cursor: "pointer",
  },

  memberProfileRows: {
    width: "100%",
    marginTop: 20,
    paddingTop: 3,
    borderTop: "1px solid #E8EDF2",
  },

  memberQrButton: {
    width: "100%",
    minHeight: 46,
    marginTop: 16,
    border: 0,
    borderRadius: 11,
    background: "#0EA5A6",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(14,165,166,.18)",
  },

  memberQrButtonDisabled: {
    background: "#D9E0E6",
    color: "#77838F",
    cursor: "not-allowed",
    boxShadow: "none",
  },

  memberHomeActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  memberActionCard: {
    minHeight: 76,
    padding: 12,
    display: "grid",
    gridTemplateColumns: "40px minmax(0,1fr) 14px",
    alignItems: "center",
    gap: 9,
    border: "1px solid #DDE5EC",
    borderRadius: 14,
    background: "#FFFFFF",
    textAlign: "left",
    boxShadow: "0 7px 18px rgba(15,23,42,.04)",
    cursor: "pointer",
  },

  memberActionIcon: {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#E7F6F7",
    color: "#0D6F7C",
    fontSize: 17,
    fontWeight: 900,
  },

  memberActionCopy: {
    minWidth: 0,
    display: "grid",
    gap: 3,
    color: "#172033",
    fontSize: 10,
  },

  memberActionArrow: {
    color: "#A2ADB8",
    fontSize: 20,
  },

  memberRefreshButton: {
    minHeight: 40,
    border: "1px solid #DCE4EB",
    borderRadius: 10,
    background: "#FFFFFF",
    color: "#536170",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
  },

  qrModalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 130,
    display: "grid",
    placeItems: "center",
    padding: 18,
  },

  qrModalBackdrop: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: 0,
    background: "rgba(7,17,31,.68)",
    backdropFilter: "blur(3px)",
    cursor: "pointer",
  },

  qrModalCard: {
    position: "relative",
    zIndex: 1,
    width: "min(430px,100%)",
    padding: 18,
    borderRadius: 18,
    background: "#FFFFFF",
    boxShadow: "0 24px 70px rgba(0,0,0,.28)",
  },

  qrModalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    paddingBottom: 12,
    borderBottom: "1px solid #E8EDF2",
  },

  qrModalEyebrow: {
    display: "block",
    color: "#0EA5A6",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1,
  },

  qrModalTitle: {
    margin: "3px 0 0",
    color: "#172033",
    fontSize: 20,
    lineHeight: 1.2,
  },

  qrModalClose: {
    width: 34,
    height: 34,
    flex: "0 0 auto",
    border: 0,
    borderRadius: 9,
    background: "#F2F5F7",
    color: "#7A8792",
    fontSize: 22,
    cursor: "pointer",
  },

  qrModalImageWrap: {
    width: "min(300px,100%)",
    aspectRatio: "1 / 1",
    margin: "20px auto 14px",
    padding: 12,
    border: "1px solid #DDE5EC",
    borderRadius: 16,
    background: "#FFFFFF",
  },

  qrModalImage: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "contain",
  },

  qrModalText: {
    margin: "0 auto 13px",
    maxWidth: 320,
    color: "#697687",
    fontSize: 9,
    lineHeight: 1.5,
    textAlign: "center",
  },

  qrDownloadLink: {
    width: "100%",
    minHeight: 43,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#0EA5A6",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: 900,
    textDecoration: "none",
  },

  qrSection: {
    marginBottom: 15,
    padding: 18,
    borderRadius: 20,
    background:
      "linear-gradient(145deg,#FFFFFF 0%,#F4FAF6 100%)",
    border: "1px solid #D9E7DE",
  },

  qrEyebrow: {
    display: "block",
    color: "#0EA5A6",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1,
  },

  qrStatus: {
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 7.5,
    fontWeight: 950,
    letterSpacing: 0.8,
  },

  qrStatusActive: {
    background: "#DEF5E7",
    color: "#147443",
  },

  qrStatusInactive: {
    background: "#FFF0D3",
    color: "#92600A",
  },

  qrLayout: {
    display: "grid",
    gridTemplateColumns: "210px minmax(0,1fr)",
    gap: 18,
    alignItems: "center",
  },

  qrFrame: {
    width: "100%",
    aspectRatio: "1 / 1",
    padding: 13,
    overflow: "hidden",
    borderRadius: 22,
    background: "#FFFFFF",
    border: "1px solid #DDE7E1",
    boxShadow: "0 16px 36px rgba(17,62,39,.10)",
  },

  qrImage: {
    width: "100%",
    height: "100%",
    display: "block",
    borderRadius: 12,
    objectFit: "contain",
  },

  noQr: {
    width: "100%",
    aspectRatio: "1 / 1",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 7,
    padding: 16,
    textAlign: "center",
    borderRadius: 22,
    background: "#F1F5F2",
    border: "1px dashed #BED0C4",
    color: "#64746A",
  },

  noQrIcon: {
    width: 54,
    height: 54,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#183C2A",
    color: "#FFFFFF",
    fontWeight: 950,
  },

  qrInstructions: {
    minWidth: 0,
  },

  qrInstructionEyebrow: {
    color: "#0EA5A6",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1,
  },

  qrInstructionTitle: {
    margin: "5px 0 7px",
    color: "#1F3428",
    fontSize: 18,
    lineHeight: 1.15,
  },

  qrInstructionText: {
    margin: 0,
    color: "#697970",
    fontSize: 9.5,
    lineHeight: 1.5,
  },

  configHero: {
    marginBottom: 15,
    padding: 18,
    display: "grid",
    gridTemplateColumns: "76px minmax(0,1fr)",
    gap: 14,
    alignItems: "center",
    borderRadius: 20,
    background: "#173C2A",
    color: "#FFFFFF",
  },

  configAvatar: {
    width: 76,
    height: 76,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 22,
    background: "rgba(255,255,255,.12)",
    fontSize: 22,
    fontWeight: 950,
  },

  configTitle: {
    margin: "3px 0 2px",
    fontSize: 21,
    lineHeight: 1.1,
  },

  configSubtitle: {
    color: "#B9D2C3",
    fontSize: 8.5,
  },

  configGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 10,
  },

  metricCard: {
    minHeight: 68,
    padding: 12,
    display: "grid",
    alignContent: "center",
    gap: 3,
    border: "1px solid #E3ECE6",
    borderRadius: 12,
    background: "#F8FBF9",
  },

  metricLabel: {
    color: "#839088",
    fontSize: 7,
    fontWeight: 900,
    textTransform: "uppercase",
  },

  metricValue: {
    color: "#274433",
    fontSize: 14,
  },

  photoActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },

  selfieButton: {
    minHeight: 42,
    padding: "0 10px",
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#0EA5A6",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "center",
  },

  galleryButton: {
    minHeight: 42,
    padding: "0 10px",
    display: "grid",
    placeItems: "center",
    border: "1px solid #D7E3DB",
    borderRadius: 11,
    background: "#FFFFFF",
    color: "#4E6658",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
    textAlign: "center",
  },

  profileEditor: {
    marginTop: 10,
    padding: 12,
    display: "grid",
    gap: 10,
    borderRadius: 13,
    background: "#F4F8F5",
  },

  fieldGroup: {
    display: "grid",
    gap: 5,
  },

  fieldLabel: {
    color: "#617269",
    fontSize: 8,
    fontWeight: 850,
  },

  input: {
    width: "100%",
    minHeight: 40,
    padding: "0 11px",
    border: "1px solid #D6E1DA",
    borderRadius: 10,
    outline: "none",
    background: "#FFFFFF",
    color: "#21372A",
    fontSize: 12,
  },

  saveProfileButton: {
    minHeight: 41,
    border: 0,
    borderRadius: 10,
    background: "#0F172A",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  outlineSmallButton: {
    minHeight: 32,
    padding: "0 10px",
    border: "1px solid #D7E3DB",
    borderRadius: 9,
    background: "#FFFFFF",
    color: "#456353",
    fontSize: 8,
    fontWeight: 850,
    cursor: "pointer",
  },

  contactCard: {
    marginBottom: 15,
    padding: 16,
    border: "1px solid #E1E9E4",
    borderRadius: 17,
    background: "#FFFFFF",
  },

  contactEyebrow: {
    display: "block",
    marginBottom: 7,
    color: "#0EA5A6",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1,
  },

  contactRows: {
    display: "grid",
  },

  row: {
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    borderBottom: "1px solid #EEF2EF",
  },

  rowLabel: {
    color: "#819087",
    fontSize: 9,
  },

  rowValue: {
    maxWidth: "65%",
    overflowWrap: "anywhere",
    color: "#334A3C",
    fontSize: 9.5,
    textAlign: "right",
  },

  logoutButton: {
    width: "100%",
    minHeight: 43,
    border: "1px solid #D9E3DD",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#536259",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  appHome: {
    minHeight: 560,
    display: "grid",
    alignContent: "start",
    gap: 16,
  },

  appHomeHero: {
    padding: 22,
    display: "grid",
    gridTemplateColumns: "82px minmax(0,1fr)",
    gap: 16,
    alignItems: "center",
    borderRadius: 24,
    background:
      "linear-gradient(135deg,#0F172A 0%,#17324B 62%,#0E7490 100%)",
    boxShadow: "0 20px 42px rgba(15,23,42,.22)",
    color: "#FFFFFF",
  },

  appHomeAvatar: {
    width: 82,
    height: 82,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 22,
    background: "rgba(255,255,255,.10)",
    border: "1px solid rgba(255,255,255,.15)",
    fontSize: 26,
    fontWeight: 950,
  },

  appHomeCopy: {
    minWidth: 0,
  },

  appHomeEyebrow: {
    display: "block",
    marginBottom: 4,
    color: "#8ED8E2",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: 1.2,
  },

  appHomeName: {
    margin: 0,
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 1.05,
  },

  appHomeState: {
    display: "inline-block",
    marginTop: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,.10)",
    color: "#D7F5F8",
    fontSize: 9,
    fontWeight: 850,
  },

  appHomeSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 10,
  },

  appHomeStat: {
    minHeight: 92,
    padding: 14,
    display: "grid",
    alignContent: "center",
    gap: 5,
    border: "1px solid #DEE6EF",
    borderRadius: 17,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,23,42,.05)",
  },

  appHomeStatLabel: {
    color: "#7A8797",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: .8,
  },

  appHomeStatValue: {
    color: "#172033",
    fontSize: 12,
    lineHeight: 1.3,
  },

  homeHint: {
    padding: 18,
    display: "grid",
    gridTemplateColumns: "48px minmax(0,1fr)",
    gap: 12,
    alignItems: "center",
    border: "1px solid #DCE6EF",
    borderRadius: 18,
    background: "#FFFFFF",
  },

  homeHintIcon: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#E8F6F8",
    color: "#0E7490",
    fontSize: 22,
    fontWeight: 900,
  },

  homeHintTitle: {
    display: "block",
    color: "#172033",
    fontSize: 13,
  },

  homeHintText: {
    margin: "4px 0 0",
    color: "#6F7C8C",
    fontSize: 9,
    lineHeight: 1.45,
  },

  homeCompact: {
    minHeight: 120,
    padding: "18px 0 8px",
    background: "transparent",
  },

  homeCompactLine: {
    width: 44,
    height: 4,
    margin: "0 auto",
    borderRadius: 999,
    background: "#D8E0E8",
  },

  cleanHome: {
    minHeight: 620,
    borderRadius: 22,
    background:
      "linear-gradient(180deg,#F8FAFC 0%,#F3F6FA 100%)",
    border: "1px solid #E3E9F0",
    position: "relative",
    overflow: "hidden",
  },

  cleanHomeMark: {
    position: "absolute",
    width: 180,
    height: 180,
    right: -55,
    bottom: -55,
    borderRadius: "50%",
    background:
      "radial-gradient(circle,rgba(14,165,166,.10) 0%,rgba(14,165,166,0) 70%)",
  },

  agendaPortalShell: {
    marginBottom: 15,
    display: "grid",
    gap: 14,
  },

  agendaHero: {
    padding: 18,
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 18,
    background:
      "linear-gradient(135deg,#07111F 0%,#0B253A 65%,#0D506B 100%)",
    color: "#FFFFFF",
    boxShadow: "0 16px 34px rgba(7,17,31,.18)",
  },

  agendaBack: {
    minHeight: 38,
    padding: "0 11px",
    flex: "0 0 auto",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 10,
    background: "rgba(255,255,255,.07)",
    color: "#EAF4FA",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
  },

  agendaEyebrow: {
    display: "block",
    color: "#79D7E3",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1.2,
  },

  agendaTitle: {
    margin: "3px 0 0",
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 1.1,
  },

  agendaSubtitle: {
    margin: "6px 0 0",
    color: "#B9D8E4",
    fontSize: 9,
    lineHeight: 1.45,
  },

  agendaToolbar: {
    padding: 14,
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: 10,
    alignItems: "end",
    border: "1px solid #DEE6EF",
    borderRadius: 16,
    background: "#FFFFFF",
  },

  reservasToolbar: {
    padding: 14,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    border: "1px solid #DEE6EF",
    borderRadius: 16,
    background: "#FFFFFF",
  },

  agendaDateField: {
    display: "grid",
    gap: 5,
  },

  agendaFieldLabel: {
    color: "#6E7B89",
    fontSize: 7.5,
    fontWeight: 900,
    textTransform: "uppercase",
  },

  agendaDateInput: {
    width: "100%",
    minHeight: 42,
    padding: "0 11px",
    border: "1px solid #D7E1EB",
    borderRadius: 10,
    outline: "none",
    background: "#F9FBFD",
    color: "#172033",
    fontSize: 11,
  },

  agendaRefreshButton: {
    minHeight: 42,
    padding: "0 14px",
    border: "1px solid #D7E1EB",
    borderRadius: 10,
    background: "#FFFFFF",
    color: "#324A5E",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  agendaPrimaryButton: {
    minHeight: 42,
    padding: "0 14px",
    border: 0,
    borderRadius: 10,
    background: "#0D506B",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  agendaSuccess: {
    padding: 12,
    border: "1px solid #B9E4CC",
    borderRadius: 12,
    background: "#ECF9F1",
    color: "#176A40",
    fontSize: 9,
    fontWeight: 850,
  },

  agendaError: {
    padding: 12,
    border: "1px solid #F0C9C4",
    borderRadius: 12,
    background: "#FFF2F0",
    color: "#8B3C34",
    fontSize: 9,
    lineHeight: 1.45,
  },

  agendaLoading: {
    minHeight: 260,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 10,
    border: "1px solid #DFE7EF",
    borderRadius: 18,
    background: "#FFFFFF",
    color: "#304153",
  },

  agendaList: {
    display: "grid",
    gap: 10,
  },

  agendaDateCaption: {
    padding: "0 2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    color: "#6D7C8D",
    fontSize: 8,
  },

  agendaClassCard: {
    padding: 15,
    display: "grid",
    gap: 13,
    border: "1px solid #DCE5EE",
    borderRadius: 17,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,23,42,.05)",
  },

  agendaClassTop: {
    display: "grid",
    gridTemplateColumns: "46px minmax(0,1fr) auto",
    gap: 10,
    alignItems: "center",
  },

  agendaClassIcon: {
    width: 46,
    height: 46,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#E8F4F6",
    color: "#0D667D",
    fontSize: 18,
    fontWeight: 950,
  },

  agendaClassCopy: {
    minWidth: 0,
  },

  agendaClassName: {
    display: "block",
    color: "#182333",
    fontSize: 14,
    lineHeight: 1.25,
  },

  agendaClassMeta: {
    display: "block",
    marginTop: 3,
    color: "#7B8997",
    fontSize: 8.5,
  },

  agendaCapacity: {
    padding: "6px 8px",
    borderRadius: 999,
    background: "#DCFCE7",
    color: "#166534",
    fontSize: 7.5,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  agendaCapacityFull: {
    background: "#F1F3F5",
    color: "#747F89",
  },

  agendaClassBottom: {
    paddingTop: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTop: "1px solid #EEF2F6",
  },

  agendaTimeBlock: {
    minWidth: 0,
  },

  agendaTimeLabel: {
    display: "block",
    color: "#8A96A4",
    fontSize: 7,
    fontWeight: 900,
  },

  agendaTimeValue: {
    display: "block",
    marginTop: 2,
    color: "#1D2A3A",
    fontSize: 11,
  },

  agendaReserveButton: {
    minWidth: 100,
    minHeight: 38,
    padding: "0 13px",
    border: 0,
    borderRadius: 10,
    background: "#0EA5A6",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 950,
    cursor: "pointer",
  },

  agendaReserveButtonDisabled: {
    background: "#D8E0E5",
    color: "#77838D",
    cursor: "not-allowed",
  },

  agendaReserveButtonReserved: {
    background: "#DCFCE7",
    color: "#166534",
    border: "1px solid #BBF7D0",
    cursor: "default",
    boxShadow: "none",
  },

  agendaEmpty: {
    minHeight: 300,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 9,
    padding: 22,
    textAlign: "center",
    border: "1px solid #DFE7EF",
    borderRadius: 18,
    background: "#FFFFFF",
  },

  agendaEmptyIcon: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background: "#E8F4F6",
    color: "#0D667D",
    fontSize: 22,
    fontWeight: 950,
  },

  agendaEmptyTitle: {
    color: "#243244",
    fontSize: 14,
  },

  agendaEmptyText: {
    maxWidth: 390,
    color: "#788697",
    fontSize: 9,
    lineHeight: 1.55,
  },

  reservasSections: {
    display: "grid",
    gap: 16,
  },

  reservasGroup: {
    display: "grid",
    gap: 9,
  },

  reservasGroupTitle: {
    padding: "0 2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#748393",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: .7,
  },

  reservaCard: {
    padding: 15,
    display: "grid",
    gap: 12,
    border: "1px solid #DCE5EE",
    borderRadius: 17,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,23,42,.05)",
  },

  reservaCardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  reservaDate: {
    display: "block",
    color: "#738192",
    fontSize: 8,
    textTransform: "capitalize",
  },

  reservaService: {
    display: "block",
    marginTop: 3,
    color: "#172333",
    fontSize: 15,
  },

  reservaStatus: {
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 7,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  reservaStatusOk: {
    background: "#DCFCE7",
    color: "#166534",
  },

  reservaStatusWarning: {
    background: "#FFF4D8",
    color: "#8A5A00",
  },

  reservaStatusMuted: {
    background: "#EFF2F4",
    color: "#6A7782",
  },

  reservaDetails: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  reservaDetail: {
    minWidth: 110,
    padding: "9px 10px",
    display: "grid",
    gap: 3,
    borderRadius: 10,
    background: "#F7F9FB",
    border: "1px solid #E8EDF2",
  },

  whiteboardShell: {
    marginBottom: 15,
    display: "grid",
    gap: 14,
  },

  whiteboardTop: {
    padding: 18,
    display: "flex",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    background:
      "linear-gradient(135deg,#07111F 0%,#0B253A 65%,#0D506B 100%)",
    color: "#FFFFFF",
    boxShadow: "0 16px 34px rgba(7,17,31,.18)",
  },

  whiteboardBack: {
    minHeight: 38,
    padding: "0 11px",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 10,
    background: "rgba(255,255,255,.07)",
    color: "#EAF4FA",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
  },

  whiteboardEyebrow: {
    display: "block",
    color: "#79D7E3",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1.2,
  },

  whiteboardTitle: {
    margin: "3px 0 0",
    color: "#FFFFFF",
    fontSize: 24,
  },

  whiteboardFilters: {
    padding: 14,
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: 9,
    alignItems: "end",
    border: "1px solid #DEE6EF",
    borderRadius: 16,
    background: "#FFFFFF",
  },

  whiteboardField: {
    display: "grid",
    gap: 5,
  },

  whiteboardLabel: {
    color: "#6E7B89",
    fontSize: 7.5,
    fontWeight: 900,
    textTransform: "uppercase",
  },

  whiteboardInput: {
    width: "100%",
    minHeight: 40,
    padding: "0 10px",
    border: "1px solid #D7E1EB",
    borderRadius: 10,
    outline: "none",
    background: "#F9FBFD",
    color: "#172033",
    fontSize: 10,
  },

  whiteboardSearch: {
    minHeight: 40,
    padding: "0 13px",
    border: 0,
    borderRadius: 10,
    background: "#0D506B",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  whiteboardLoading: {
    minHeight: 280,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 10,
    border: "1px solid #DFE7EF",
    borderRadius: 18,
    background: "#FFFFFF",
    color: "#304153",
  },

  wodCard: {
    padding: 18,
    border: "1px solid #DCE5EE",
    borderRadius: 20,
    background: "#FFFFFF",
    boxShadow: "0 14px 30px rgba(15,23,42,.06)",
  },

  wodHeader: {
    marginBottom: 14,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  wodProgram: {
    display: "block",
    color: "#0D7C92",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  wodTitle: {
    margin: "4px 0 0",
    color: "#101827",
    fontSize: 25,
    lineHeight: 1.05,
  },

  wodActive: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "#DCFCE7",
    color: "#166534",
    fontSize: 7,
    fontWeight: 950,
  },

  wodBlocks: {
    display: "grid",
    gap: 9,
  },

  wodBlock: {
    padding: 14,
    display: "grid",
    gap: 5,
    border: "1px solid #E1E8EF",
    borderRadius: 13,
    background: "#F9FBFD",
  },

  wodBlockAccent: {
    background:
      "linear-gradient(135deg,#E8F7FA 0%,#F4FBFC 100%)",
    border: "1px solid #BDE6EC",
  },

  wodBlockLabel: {
    color: "#708090",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: .8,
    textTransform: "uppercase",
  },

  wodBlockValue: {
    color: "#182333",
    fontSize: 14,
    lineHeight: 1.4,
    whiteSpace: "pre-wrap",
  },

  wodNote: {
    marginTop: 10,
    padding: 13,
    display: "grid",
    gap: 4,
    borderRadius: 12,
    background: "#FFF8E8",
    border: "1px solid #F0E0B7",
  },

  wodNoteLabel: {
    color: "#96722A",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: .8,
  },

  wodNoteValue: {
    color: "#5E4A21",
    fontSize: 10,
    lineHeight: 1.45,
  },

  whiteboardEmpty: {
    minHeight: 300,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 8,
    padding: 20,
    textAlign: "center",
    border: "1px solid #DFE7EF",
    borderRadius: 18,
    background: "#FFFFFF",
  },

  whiteboardEmptyIcon: {
    width: 56,
    height: 56,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#E8F4F6",
    color: "#0D667D",
    fontSize: 21,
    fontWeight: 950,
  },

  whiteboardEmptyTitle: {
    color: "#243244",
    fontSize: 14,
  },

  whiteboardEmptyText: {
    maxWidth: 360,
    color: "#788697",
    fontSize: 9,
    lineHeight: 1.5,
  },

  profileSettingsShell: {
    marginBottom: 15,
    display: "grid",
    gridTemplateColumns: "220px minmax(0,1fr)",
    gap: 14,
    alignItems: "start",
  },

  profileSummaryCard: {
    padding: 18,
    display: "grid",
    justifyItems: "center",
    gap: 8,
    border: "1px solid #DDE8E1",
    borderRadius: 18,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,50,31,.05)",
  },

  profileSummaryAvatar: {
    width: 96,
    height: 96,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#EAF2ED",
    border: "4px solid #F3F7F4",
    color: "#173C2A",
    fontSize: 30,
    fontWeight: 950,
  },

  profileSummaryName: {
    marginTop: 4,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#1B3023",
    fontSize: 17,
    textAlign: "center",
  },

  profileSummaryRole: {
    color: "#829088",
    fontSize: 9,
  },

  changePhotoButton: {
    width: "100%",
    minHeight: 36,
    marginTop: 4,
    display: "grid",
    placeItems: "center",
    border: "1px solid #D9E4DD",
    borderRadius: 10,
    background: "#F8FAF9",
    color: "#385345",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
  },

  profileSummaryDivider: {
    width: "100%",
    height: 1,
    margin: "6px 0 1px",
    background: "#E8EEEA",
  },

  profileSummaryRow: {
    width: "100%",
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottom: "1px solid #EFF3F0",
  },

  profileSummaryLabel: {
    color: "#7B8981",
    fontSize: 8.5,
  },

  profileSummaryValue: {
    maxWidth: "58%",
    overflow: "hidden",
    color: "#2B4435",
    fontSize: 8.5,
    textAlign: "right",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  profileLogoutButton: {
    width: "100%",
    minHeight: 38,
    marginTop: 7,
    border: "1px solid #E1E8E3",
    borderRadius: 10,
    background: "#FFFFFF",
    color: "#6A766F",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
  },

  profileSettingsMain: {
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid #DDE8E1",
    borderRadius: 18,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,50,31,.05)",
  },

  profileTabs: {
    display: "flex",
    gap: 0,
    overflowX: "auto",
    borderBottom: "1px solid #E4EBE6",
    background: "#FBFCFB",
  },

  profileTabButton: {
    minHeight: 48,
    padding: "0 14px",
    flex: "0 0 auto",
    border: 0,
    borderBottom: "3px solid transparent",
    background: "transparent",
    color: "#6F7F76",
    fontSize: 9,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  profileTabButtonActive: {
    color: "#0EA5A6",
    borderBottomColor: "#0EA5A6",
    background: "#FFFFFF",
  },

  profilePanel: {
    minHeight: 430,
    padding: 20,
  },

  profilePanelHeading: {
    marginBottom: 16,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  profilePanelTitle: {
    margin: "4px 0 0",
    color: "#17251D",
    fontSize: 22,
  },

  profileFieldsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  profileField: {
    minHeight: 70,
    padding: "11px 12px",
    display: "grid",
    alignContent: "center",
    gap: 4,
    border: "1px solid #E4EBE6",
    borderRadius: 11,
    background: "#FAFCFB",
  },

  profileFieldLabel: {
    color: "#7E8C84",
    fontSize: 7.5,
    fontWeight: 850,
    textTransform: "uppercase",
  },

  profileFieldValue: {
    overflowWrap: "anywhere",
    color: "#263F31",
    fontSize: 11,
    lineHeight: 1.35,
  },

  passwordForm: {
    maxWidth: 430,
    marginTop: 18,
    display: "grid",
    gap: 12,
  },

  passwordMessage: {
    padding: 10,
    borderRadius: 10,
    background: "#F2F7F4",
    color: "#476052",
    fontSize: 9,
  },

  membershipProfileCard: {
    marginTop: 16,
    padding: 15,
    border: "1px solid #DDE8E1",
    borderRadius: 14,
    background: "#F8FBF9",
  },

  membershipProfilePlan: {
    display: "block",
    marginBottom: 12,
    color: "#173C2A",
    fontSize: 18,
  },

  paymentError: {
    marginTop: 14,
    padding: 12,
    border: "1px solid #F1C9C4",
    borderRadius: 11,
    background: "#FFF3F1",
    color: "#8C4038",
    fontSize: 9,
    lineHeight: 1.45,
  },

  paymentSummaryGrid: {
    marginTop: 16,
    marginBottom: 14,
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 8,
  },

  paymentSummaryCard: {
    minHeight: 76,
    padding: 12,
    display: "grid",
    alignContent: "center",
    gap: 5,
    border: "1px solid #E1E8E3",
    borderRadius: 12,
    background: "#F8FBF9",
  },

  paymentSummaryLabel: {
    color: "#7B8981",
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: .7,
  },

  paymentSummaryValue: {
    color: "#173C2A",
    fontSize: 16,
  },

  paymentSummaryValueSmall: {
    color: "#173C2A",
    fontSize: 11,
    lineHeight: 1.3,
  },

  paymentList: {
    display: "grid",
    gap: 10,
  },

  paymentCard: {
    padding: 14,
    border: "1px solid #DFE7E2",
    borderRadius: 14,
    background: "#FFFFFF",
    boxShadow: "0 7px 18px rgba(15,50,31,.04)",
  },

  paymentCardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  paymentDate: {
    display: "block",
    marginBottom: 4,
    color: "#839088",
    fontSize: 8,
  },

  paymentConcept: {
    display: "block",
    color: "#21372A",
    fontSize: 13,
    lineHeight: 1.3,
  },

  paymentAmountWrap: {
    display: "grid",
    justifyItems: "end",
    gap: 5,
    flex: "0 0 auto",
  },

  paymentAmount: {
    color: "#0F6B40",
    fontSize: 17,
  },

  paymentPaidBadge: {
    padding: "4px 7px",
    borderRadius: 999,
    background: "#E6F7ED",
    color: "#147443",
    fontSize: 7,
    fontWeight: 900,
  },

  paymentMeta: {
    marginTop: 10,
    display: "flex",
    flexWrap: "wrap",
    gap: "6px 14px",
    color: "#718077",
    fontSize: 8.5,
  },

  paymentDescription: {
    margin: "10px 0 0",
    color: "#627168",
    fontSize: 8.5,
    lineHeight: 1.5,
  },

  paymentReceiptButton: {
    width: "100%",
    minHeight: 37,
    marginTop: 11,
    border: "1px solid #D7E3DB",
    borderRadius: 10,
    background: "#F8FAF9",
    color: "#345343",
    fontSize: 8.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  receiptBox: {
    marginTop: 10,
    padding: 13,
    borderRadius: 12,
    background: "#F4F8F5",
    border: "1px solid #DCE8E0",
  },

  receiptHeader: {
    paddingBottom: 10,
    marginBottom: 6,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "1px dashed #CBD8CF",
  },

  receiptEyebrow: {
    display: "block",
    color: "#0EA5A6",
    fontSize: 6.5,
    fontWeight: 950,
    letterSpacing: .9,
  },

  receiptTitle: {
    display: "block",
    marginTop: 3,
    color: "#21372A",
    fontSize: 12,
  },

  receiptAmount: {
    color: "#0F6B40",
    fontSize: 17,
  },

  receiptRows: {
    display: "grid",
  },

  receiptNote: {
    display: "block",
    marginTop: 10,
    color: "#87928C",
    fontSize: 7.5,
    lineHeight: 1.45,
  },

  paymentLoading: {
    minHeight: 260,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 10,
    color: "#52675B",
    fontSize: 9,
  },

  resultsShell: {
    marginBottom: 15,
    display: "grid",
    gap: 14,
  },

  resultsHero: {
    padding: 18,
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 18,
    background:
      "linear-gradient(135deg,#07111F 0%,#0B253A 65%,#0D506B 100%)",
    color: "#FFFFFF",
    boxShadow: "0 16px 34px rgba(7,17,31,.18)",
  },

  resultsBack: {
    minHeight: 38,
    padding: "0 11px",
    flex: "0 0 auto",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 10,
    background: "rgba(255,255,255,.07)",
    color: "#EAF4FA",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
  },

  resultsEyebrow: {
    display: "block",
    color: "#79D7E3",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1.2,
  },

  resultsTitle: {
    margin: "3px 0 0",
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 1.1,
  },

  resultsSubtitle: {
    margin: "6px 0 0",
    color: "#B9D8E4",
    fontSize: 9,
    lineHeight: 1.45,
  },

  resultsSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 9,
  },

  resultsSummaryCard: {
    minHeight: 82,
    padding: 13,
    display: "grid",
    alignContent: "center",
    gap: 5,
    border: "1px solid #DDE6EE",
    borderRadius: 14,
    background: "#FFFFFF",
    boxShadow: "0 8px 20px rgba(15,23,42,.04)",
  },

  resultsSummaryLabel: {
    color: "#7A8795",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: .7,
  },

  resultsSummaryValue: {
    color: "#0D506B",
    fontSize: 19,
  },

  resultsSummaryValueSmall: {
    color: "#213244",
    fontSize: 11,
    lineHeight: 1.35,
  },

  resultsFormCard: {
    padding: 16,
    border: "1px solid #DDE6EE",
    borderRadius: 17,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,23,42,.05)",
  },

  resultsHistoryCard: {
    padding: 16,
    border: "1px solid #DDE6EE",
    borderRadius: 17,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,23,42,.05)",
  },

  resultsPanelHeading: {
    marginBottom: 14,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  resultsPanelTitle: {
    margin: "4px 0 0",
    color: "#17251D",
    fontSize: 19,
  },

  resultsFormGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  resultsField: {
    display: "grid",
    gap: 5,
  },

  resultsFieldLabel: {
    color: "#6F7F76",
    fontSize: 7.5,
    fontWeight: 900,
    textTransform: "uppercase",
  },

  resultsInput: {
    width: "100%",
    minHeight: 41,
    padding: "0 10px",
    border: "1px solid #D8E2DC",
    borderRadius: 10,
    outline: "none",
    background: "#FAFCFB",
    color: "#17251D",
    fontSize: 10,
  },

  resultsTextarea: {
    width: "100%",
    minHeight: 82,
    padding: 10,
    resize: "vertical",
    border: "1px solid #D8E2DC",
    borderRadius: 10,
    outline: "none",
    background: "#FAFCFB",
    color: "#17251D",
    fontFamily: "inherit",
    fontSize: 10,
    lineHeight: 1.45,
  },

  resultsSaveButton: {
    width: "100%",
    minHeight: 43,
    marginTop: 12,
    border: 0,
    borderRadius: 10,
    background: "#0EA5A6",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 950,
    cursor: "pointer",
  },

  resultsSuccess: {
    marginTop: 10,
    padding: 10,
    border: "1px solid #BCE2CB",
    borderRadius: 10,
    background: "#ECF9F1",
    color: "#176A40",
    fontSize: 8.5,
    fontWeight: 850,
  },

  resultsError: {
    marginTop: 10,
    padding: 10,
    border: "1px solid #F0C9C4",
    borderRadius: 10,
    background: "#FFF2F0",
    color: "#8B3C34",
    fontSize: 8.5,
    lineHeight: 1.45,
  },

  resultsLoading: {
    minHeight: 230,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 10,
    color: "#52675B",
    fontSize: 9,
  },

  resultsList: {
    display: "grid",
    gap: 10,
  },

  resultCard: {
    padding: 14,
    border: "1px solid #E0E7ED",
    borderRadius: 13,
    background: "#FAFCFD",
  },

  resultCardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  resultDate: {
    display: "block",
    color: "#7A8795",
    fontSize: 7.5,
  },

  resultService: {
    display: "block",
    marginTop: 3,
    color: "#172333",
    fontSize: 12,
  },

  resultTypeBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    background: "#E7F6F7",
    color: "#0D6F7C",
    fontSize: 7,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  resultValueRow: {
    marginTop: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  resultValue: {
    color: "#0D506B",
    fontSize: 20,
    lineHeight: 1.1,
  },

  resultDeleteButton: {
    minHeight: 31,
    padding: "0 9px",
    border: "1px solid #E3E8EC",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#7A4D4D",
    fontSize: 7.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  resultNotes: {
    margin: "9px 0 0",
    color: "#6C7A88",
    fontSize: 8.5,
    lineHeight: 1.45,
  },

  resultsEmpty: {
    minHeight: 240,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 8,
    padding: 20,
    textAlign: "center",
  },

  resultsEmptyIcon: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background: "#E8F4F6",
    color: "#0D667D",
    fontSize: 23,
  },

  resultsEmptyTitle: {
    color: "#243244",
    fontSize: 14,
  },

  resultsEmptyText: {
    maxWidth: 360,
    color: "#788697",
    fontSize: 9,
    lineHeight: 1.55,
  },

  notificationIntro: {
    margin: "0 0 14px",
    color: "#718077",
    fontSize: 9,
    lineHeight: 1.5,
  },

  notificationList: {
    display: "grid",
    gap: 9,
  },

  notificationRow: {
    minHeight: 72,
    padding: "12px 13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    border: "1px solid #E1E8E3",
    borderRadius: 12,
    background: "#FAFCFB",
  },

  notificationCopy: {
    minWidth: 0,
    display: "grid",
    gap: 3,
  },

  notificationTitle: {
    color: "#263F31",
    fontSize: 11,
  },

  notificationText: {
    color: "#7A8780",
    fontSize: 8.2,
    lineHeight: 1.4,
  },

  notificationSwitch: {
    position: "relative",
    width: 42,
    height: 24,
    flex: "0 0 auto",
    padding: 0,
    border: 0,
    borderRadius: 999,
    background: "#D5DDD8",
    cursor: "pointer",
    transition: "background .18s ease",
  },

  notificationSwitchActive: {
    background: "#0EA5A6",
  },

  notificationSwitchKnob: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#FFFFFF",
    boxShadow: "0 2px 6px rgba(0,0,0,.16)",
    transition: "transform .18s ease",
  },

  notificationSwitchKnobActive: {
    transform: "translateX(18px)",
  },

  notificationSaveButton: {
    width: "100%",
    minHeight: 42,
    marginTop: 14,
    border: 0,
    borderRadius: 10,
    background: "#0F172A",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  notificationSuccess: {
    marginTop: 10,
    padding: 10,
    border: "1px solid #BCE2CB",
    borderRadius: 10,
    background: "#ECF9F1",
    color: "#176A40",
    fontSize: 8.5,
    fontWeight: 850,
  },

  notificationError: {
    marginTop: 10,
    padding: 10,
    border: "1px solid #F0C9C4",
    borderRadius: 10,
    background: "#FFF2F0",
    color: "#8B3C34",
    fontSize: 8.5,
    lineHeight: 1.45,
  },

  notificationLoading: {
    minHeight: 220,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 10,
    color: "#52675B",
    fontSize: 9,
  },

  configEmpty: {
    minHeight: 280,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 8,
    textAlign: "center",
  },

  configEmptyIcon: {
    width: 54,
    height: 54,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#EAF4EE",
    color: "#0EA5A6",
    fontSize: 24,
  },

  configEmptyTitle: {
    color: "#2A4033",
    fontSize: 14,
  },

  configEmptyText: {
    maxWidth: 360,
    color: "#7A8780",
    fontSize: 9,
    lineHeight: 1.5,
  },

  emptyPageCard: {
    minHeight: 430,
    padding: 30,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 10,
    border: "1px solid #DFE8E2",
    borderRadius: 22,
    background: "#FFFFFF",
    textAlign: "center",
  },

  emptyPageIcon: {
    width: 72,
    height: 72,
    display: "grid",
    placeItems: "center",
    marginBottom: 2,
    borderRadius: 22,
    background: "#E7F4EC",
    color: "#0EA5A6",
    fontSize: 30,
    fontWeight: 900,
  },

  emptyPageTitle: {
    margin: 0,
    color: "#1C3426",
    fontSize: 28,
  },

  emptyPageText: {
    maxWidth: 390,
    margin: 0,
    color: "#748179",
    fontSize: 10,
    lineHeight: 1.6,
  },

  primaryButton: {
    minWidth: 160,
    minHeight: 44,
    marginTop: 4,
    padding: "0 16px",
    border: 0,
    borderRadius: 11,
    background: "#0EA5A6",
    color: "#FFFFFF",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",
    minHeight: 43,
    border: "1px solid #DAE4DE",
    borderRadius: 11,
    background: "#FFFFFF",
    color: "#4D5F55",
    fontWeight: 850,
    cursor: "pointer",
  },

  footer: {
    display: "grid",
    justifyItems: "center",
    gap: 8,
    paddingTop: 5,
  },

  secureText: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    color: "#95A098",
    fontSize: 7.5,
  },

  version: {
    color: "#BAC2BD",
    fontSize: 6,
  },

  mobileBottom: {
    display: "none",
    position: "fixed",
    zIndex: 40,
    left: 0,
    right: 0,
    bottom: 0,
    gridTemplateColumns: "repeat(5,1fr)",
    minHeight: 72,
    padding: "7px 5px max(7px,env(safe-area-inset-bottom))",
    background: "rgba(255,255,255,.97)",
    borderTop: "1px solid #E0E8E3",
    boxShadow: "0 -8px 26px rgba(17,45,29,.08)",
    backdropFilter: "blur(12px)",
  },

  bottomItem: {
    minWidth: 0,
    border: 0,
    background: "transparent",
    color: "#839088",
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 3,
    fontSize: 7.5,
    fontWeight: 850,
  },

  bottomItemActive: {
    color: "#0EA5A6",
  },

  bottomIcon: {
    fontSize: 19,
    lineHeight: 1,
  },

  loadingPage: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background: "#F1F5F2",
    color: "#284434",
    fontFamily:
      'Inter,ui-sans-serif,system-ui,sans-serif',
  },

  loadingCard: {
    width: "min(390px,100%)",
    padding: 28,
    display: "grid",
    justifyItems: "center",
    gap: 10,
    border: "1px solid #DFE7E2",
    borderRadius: 22,
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(22,50,34,.08)",
  },

  loadingLogo: {
    width: 140,
    marginBottom: 6,
  },

  loader: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: "4px solid #E1EBE5",
    borderTopColor: "#0EA5A6",
  },

  loadingText: {
    color: "#7B887F",
    fontSize: 9,
  },

  errorCard: {
    width: "min(420px,100%)",
    padding: 27,
    display: "grid",
    justifyItems: "center",
    gap: 11,
    textAlign: "center",
    border: "1px solid #E4E9E6",
    borderRadius: 22,
    background: "#FFFFFF",
    boxShadow: "0 20px 60px rgba(22,44,31,.10)",
  },

  errorLogo: {
    width: 135,
    marginBottom: 6,
  },

  errorIcon: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#FFF0E8",
    color: "#B85A2A",
    fontSize: 21,
    fontWeight: 950,
  },

  errorTitle: {
    margin: 0,
    color: "#25382D",
    fontSize: 21,
  },

  errorText: {
    margin: 0,
    color: "#748078",
    fontSize: 10,
    lineHeight: 1.5,
  },
};
