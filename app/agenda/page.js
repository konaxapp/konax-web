"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const VERSION = "2026.08.09-AGENDA-B-PRO";

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

export default function AgendaPage() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [rol, setRol] = useState("");
  const [esAdmin, setEsAdmin] = useState(false);

  const [vista, setVista] = useState("hoy");
  const [fechaAgenda, setFechaAgenda] = useState(fechaHoy());

  const [servicios, setServicios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);

  const [servicioForm, setServicioForm] = useState(SERVICIO_INICIAL);
  const [servicioEditandoId, setServicioEditandoId] = useState(null);

  const [horarioForm, setHorarioForm] = useState(HORARIO_INICIAL);
  const [horarioEditandoId, setHorarioEditandoId] = useState(null);

  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    inicializar();
  }, []);

  useEffect(() => {
    if (empresaId) {
      cargarDisponibilidad(fechaAgenda);
      cargarReservas();
    }
  }, [fechaAgenda, empresaId]);

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
      const rolLocal = localStorage.getItem("usuarioRol") ||
        localStorage.getItem("rol") ||
        "";

      if (!empresaLocal) {
        alert("No hay una empresa activa.");
        window.location.href = "/login";
        return;
      }

      setEmpresaId(empresaLocal);
      setEmpresaNombre(empresaNombreLocal);
      setRol(rolLocal);
      setEsAdmin(esRolAdministrador(rolLocal));

      await Promise.all([
        cargarServicios(empresaLocal),
        cargarHorarios(empresaLocal),
        cargarClientes(empresaLocal),
        cargarReservas(empresaLocal),
        cargarDisponibilidad(fechaAgenda, empresaLocal),
      ]);
    } catch (err) {
      console.error(err);
      setError(err?.message || "No fue posible cargar Agenda.");
    } finally {
      setCargando(false);
    }
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

  const resumenAgenda = useMemo(() => {
    const capacidadTotal = disponibilidad.reduce(
      (total, item) => total + Number(item.capacidad || 0),
      0
    );

    const reservadosTotal = disponibilidad.reduce(
      (total, item) => total + Number(item.reservados || 0),
      0
    );

    const cuposDisponibles = disponibilidad.reduce(
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
  }, [disponibilidad]);

  async function refrescarTodo() {
    setGuardando(true);
    setError("");

    try {
      await Promise.all([
        cargarServicios(),
        cargarHorarios(),
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
      alert("Solo el administrador puede configurar servicios o clases.");
      return;
    }

    if (!servicioForm.nombre.trim()) {
      alert("Escribe el nombre del servicio o clase.");
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

      setServicioForm(SERVICIO_INICIAL);
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

    setGuardando(true);
    setError("");

    try {
      const payload = {
        empresa_id: empresaId,
        servicio_id: horarioForm.servicio_id,
        dia_semana: Number(horarioForm.dia_semana),
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
        respuesta = await supabase
          .from("agenda_horarios")
          .update(payload)
          .eq("empresa_id", empresaId)
          .eq("id", horarioEditandoId);
      } else {
        respuesta = await supabase
          .from("agenda_horarios")
          .insert([payload]);
      }

      if (respuesta.error) throw respuesta.error;

      setHorarioForm(HORARIO_INICIAL);
      setHorarioEditandoId(null);
      await cargarHorarios();
      await cargarDisponibilidad();
      alert(horarioEditandoId ? "Horario actualizado." : "Horario creado.");
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo guardar el horario.");
    } finally {
      setGuardando(false);
    }
  }

  function editarHorario(horario) {
    setHorarioEditandoId(horario.id);
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
      alert("Selecciona un alumno.");
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
          `Reserva confirmada. Quedan ${resultado.disponibles ?? 0} cupos disponibles.`
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
    return mapaClientes.get(String(id))?.nombre || "Alumno";
  }

  function nombreServicio(id) {
    return mapaServicios.get(String(id))?.nombre || "Servicio";
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
    <main style={s.page}>
      <header style={s.header}>
        <div style={s.heroBrand}>
          <div style={s.logoCard}>
            <img
              src="/konax-logo.png"
              alt="KONAX"
              style={s.logo}
            />
          </div>

          <div style={s.heroText}>
            <span style={s.eyebrow}>AGENDA DEL GIMNASIO</span>
            <h1 style={s.title}>Agenda y reservas</h1>
            <p style={s.subtitle}>
              {empresaNombre || "KONAX"} · Organiza clases, cupos y asistencia
              desde un solo lugar.
            </p>
          </div>
        </div>

        <div style={s.headerActions}>
          <span style={s.roleBadge}>
            {esAdmin ? "Administrador" : rol || "Usuario"}
          </span>

          <button
            type="button"
            style={s.secondaryButton}
            onClick={() => (window.location.href = "/dashboard")}
          >
            ← Centro de Operaciones
          </button>

          <button
            type="button"
            style={s.heroButton}
            onClick={refrescarTodo}
            disabled={guardando}
          >
            {guardando ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </header>

      {error && <div style={s.error}>{error}</div>}

      <section style={s.tabs}>
        <Tab activo={vista === "hoy"} onClick={() => setVista("hoy")}>
          Agenda de hoy
        </Tab>

        <Tab activo={vista === "nueva"} onClick={() => setVista("nueva")}>
          Nueva reserva
        </Tab>

        <Tab activo={vista === "reservas"} onClick={() => setVista("reservas")}>
          Reservas
        </Tab>

        {esAdmin && (
          <Tab
            activo={vista === "configuracion"}
            onClick={() => setVista("configuracion")}
          >
            Clases y horarios
          </Tab>
        )}
      </section>

      {vista === "hoy" && (
        <>
          <section style={s.toolbar}>
            <div style={s.dateCard}>
              <Campo label="Fecha de la agenda">
                <input
                  type="date"
                  value={fechaAgenda}
                  onChange={(e) => setFechaAgenda(e.target.value)}
                  style={s.input}
                />
              </Campo>
              <span style={s.dateHuman}>{formatoFecha(fechaAgenda)}</span>
            </div>

            <div style={s.quickInfo}>
              <span style={s.statIcon}>▣</span>
              <div>
                <span style={s.muted}>Clases disponibles</span>
                <strong style={s.bigNumber}>{disponibilidad.length}</strong>
              </div>
            </div>

            <div style={s.quickInfo}>
              <span style={s.statIcon}>✓</span>
              <div>
                <span style={s.muted}>Reservas del día</span>
                <strong style={s.bigNumber}>{reservasFecha.length}</strong>
              </div>
            </div>

            <div style={s.quickInfo}>
              <span style={s.statIcon}>◎</span>
              <div>
                <span style={s.muted}>Cupos disponibles</span>
                <strong style={s.bigNumber}>{resumenAgenda.cuposDisponibles}</strong>
              </div>
            </div>

            <div style={s.quickInfo}>
              <span style={s.statIcon}>%</span>
              <div>
                <span style={s.muted}>Ocupación</span>
                <strong style={s.bigNumber}>{resumenAgenda.ocupacion}%</strong>
              </div>
            </div>
          </section>

          <section style={s.gridCards}>
            {disponibilidad.length === 0 ? (
              <Empty
                titulo="No hay horarios disponibles"
                texto="Configura una clase o selecciona otra fecha."
              />
            ) : (
              disponibilidad.map((item) => (
                <article key={item.horario_id} style={s.classCard}>
                  <div style={s.classTop}>
                    <div>
                      <span style={s.badge}>
                        {item.servicio_tipo === "cita_individual"
                          ? "CITA"
                          : "CLASE"}
                      </span>
                      <h3 style={s.cardTitle}>{item.servicio_nombre}</h3>
                    </div>

                    <strong
                      style={
                        Number(item.disponibles) > 0
                          ? s.availabilityGood
                          : s.availabilityFull
                      }
                    >
                      {Number(item.disponibles) > 0
                        ? `${item.disponibles} disponibles`
                        : "Completo"}
                    </strong>
                  </div>

                  <div style={s.classData}>
                    <Dato
                      nombre="Horario"
                      valor={`${formatoHora(item.hora_inicio)} – ${formatoHora(
                        item.hora_fin
                      )}`}
                    />
                    <Dato
                      nombre="Instructor"
                      valor={item.instructor || "Sin asignar"}
                    />
                    <Dato
                      nombre="Cupos"
                      valor={`${item.reservados}/${item.capacidad}`}
                    />
                    <Dato
                      nombre="Acceso"
                      valor={
                        item.requiere_membresia
                          ? "Membresía activa"
                          : "Abierto"
                      }
                    />
                  </div>

                  <div style={s.capacityBlock}>
                    <div style={s.capacityMeta}>
                      <span>
                        {Number(item.reservados || 0)} reservados
                      </span>
                      <span>
                        {Number(item.disponibles || 0)} libres
                      </span>
                    </div>

                    <div style={s.progressTrack}>
                      <div
                        style={{
                          ...s.progressFill,
                          width: `${
                            Number(item.capacidad || 0) > 0
                              ? Math.min(
                                  100,
                                  Math.round(
                                    (Number(item.reservados || 0) /
                                      Number(item.capacidad || 1)) *
                                      100
                                  )
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    style={s.cardButton}
                    disabled={Number(item.disponibles) <= 0}
                    onClick={() => {
                      setFechaAgenda(fechaAgenda);
                      setHorarioSeleccionado(item.horario_id);
                      setVista("nueva");
                    }}
                  >
                    {Number(item.disponibles) > 0
                      ? "Reservar alumno"
                      : "Sin cupos"}
                  </button>
                </article>
              ))
            )}
          </section>

          <section style={s.panel}>
            <div style={s.panelHeader}>
              <div>
                <span style={s.eyebrowSmall}>HOY</span>
                <h2 style={s.panelTitle}>Reservas del día</h2>
              </div>
              <span style={s.counter}>{reservasFecha.length} reservas</span>
            </div>

            <ReservaLista
              reservas={reservasFecha}
              nombreCliente={nombreCliente}
              nombreServicio={nombreServicio}
              onCancelar={cancelarReserva}
              onAsistencia={marcarAsistencia}
            />
          </section>
        </>
      )}

      {vista === "nueva" && (
        <section style={s.twoColumns}>
          <article style={s.panel}>
            <span style={s.eyebrowSmall}>ALUMNO</span>
            <h2 style={s.panelTitle}>＋ Nueva reserva</h2>

            <div style={{ marginTop: 16 }}>
              <Campo label="Buscar por nombre, cédula o teléfono">
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setClienteSeleccionado(null);
                  }}
                  style={s.input}
                  placeholder="Ej. LIA SAMANIEGO"
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
                        <strong>{cliente.nombre || "Alumno"}</strong>
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
                    <span style={s.muted}>Alumno seleccionado</span>
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

              <Campo label="Clase / horario disponible">
                <select
                  value={horarioSeleccionado}
                  onChange={(e) => setHorarioSeleccionado(e.target.value)}
                  style={s.input}
                >
                  <option value="">Seleccionar</option>
                  {disponibilidad.map((item) => (
                    <option
                      key={item.horario_id}
                      value={item.horario_id}
                      disabled={Number(item.disponibles) <= 0}
                    >
                      {item.servicio_nombre} · {formatoHora(item.hora_inicio)} ·{" "}
                      {item.disponibles} cupos
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
              {guardando ? "Guardando..." : "Confirmar reserva"}
            </button>
          </article>

          <article style={s.panel}>
            <span style={s.eyebrowSmall}>DISPONIBILIDAD</span>
            <h2 style={s.panelTitle}>{formatoFecha(fechaAgenda)}</h2>

            <div style={s.slotList}>
              {disponibilidad.length === 0 ? (
                <p style={s.muted}>No hay horarios para esta fecha.</p>
              ) : (
                disponibilidad.map((item) => (
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
                        {item.instructor || "Sin instructor"}
                      </span>
                    </div>

                    <span
                      style={
                        Number(item.disponibles) > 0
                          ? s.smallGood
                          : s.smallFull
                      }
                    >
                      {item.disponibles}/{item.capacidad}
                    </span>
                  </button>
                ))
              )}
            </div>
          </article>
        </section>
      )}

      {vista === "reservas" && (
        <section style={s.panel}>
          <div style={s.panelHeader}>
            <div>
              <span style={s.eyebrowSmall}>CONTROL</span>
              <h2 style={s.panelTitle}>☷ Reservas</h2>
            </div>

            <span style={s.counter}>{reservasActivas.length} registros</span>
          </div>

          <ReservaLista
            reservas={reservasActivas}
            nombreCliente={nombreCliente}
            nombreServicio={nombreServicio}
            onCancelar={cancelarReserva}
            onAsistencia={marcarAsistencia}
            mostrarFecha
          />
        </section>
      )}

      {vista === "configuracion" && esAdmin && (
        <>
          <section style={s.twoColumns}>
            <article style={s.panel}>
              <span style={s.eyebrowSmall}>CONFIGURACIÓN</span>
              <h2 style={s.panelTitle}>
                {servicioEditandoId ? "Editar servicio" : "Nueva clase o servicio"}
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
                    placeholder="Spinning"
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
                    <option value="clase_grupal">Clase grupal</option>
                    <option value="cita_individual">Cita individual</option>
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

                <Campo label="Capacidad sugerida">
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
                  placeholder="Clase grupal de spinning"
                />
              </Campo>

              <div style={s.checkGrid}>
                <label style={s.checkLabel}>
                  <input
                    type="checkbox"
                    checked={servicioForm.requiere_membresia}
                    onChange={(e) =>
                      setServicioForm({
                        ...servicioForm,
                        requiere_membresia: e.target.checked,
                      })
                    }
                  />
                  Requiere membresía activa
                </label>

                <label style={s.checkLabel}>
                  <input
                    type="checkbox"
                    checked={servicioForm.requiere_pago}
                    onChange={(e) =>
                      setServicioForm({
                        ...servicioForm,
                        requiere_pago: e.target.checked,
                      })
                    }
                  />
                  Tiene costo adicional
                </label>
              </div>

              {servicioForm.requiere_pago && (
                <Campo label="Precio">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={servicioForm.precio}
                    onChange={(e) =>
                      setServicioForm({
                        ...servicioForm,
                        precio: e.target.value,
                      })
                    }
                    style={s.input}
                  />
                </Campo>
              )}

              <div style={s.formActions}>
                {servicioEditandoId && (
                  <button
                    type="button"
                    style={s.secondaryButton}
                    onClick={() => {
                      setServicioEditandoId(null);
                      setServicioForm(SERVICIO_INICIAL);
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

            <article style={s.panel}>
              <span style={s.eyebrowSmall}>HORARIO</span>
              <h2 style={s.panelTitle}>
                {horarioEditandoId ? "Editar horario" : "Nuevo horario"}
              </h2>

              <Campo label="Clase / servicio">
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

                <Campo label="Instructor">
                  <input
                    value={horarioForm.instructor}
                    onChange={(e) =>
                      setHorarioForm({
                        ...horarioForm,
                        instructor: e.target.value,
                      })
                    }
                    style={s.input}
                    placeholder="Carlos"
                  />
                </Campo>

                <Campo label="Hora inicio">
                  <input
                    type="time"
                    value={horarioForm.hora_inicio}
                    onChange={(e) =>
                      setHorarioForm({
                        ...horarioForm,
                        hora_inicio: e.target.value,
                      })
                    }
                    style={s.input}
                  />
                </Campo>

                <Campo label="Hora fin">
                  <input
                    type="time"
                    value={horarioForm.hora_fin}
                    onChange={(e) =>
                      setHorarioForm({
                        ...horarioForm,
                        hora_fin: e.target.value,
                      })
                    }
                    style={s.input}
                  />
                </Campo>

                <Campo label="Cupos">
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
                      setHorarioForm(HORARIO_INICIAL);
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
                  <h2 style={s.panelTitle}>Clases y servicios</h2>
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
                          {servicio.tipo === "cita_individual"
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
                <span style={s.counter}>{horarios.length}</span>
              </div>

              <div style={s.stack}>
                {horarios.length === 0 ? (
                  <p style={s.muted}>Todavía no hay horarios.</p>
                ) : (
                  horarios.map((horario) => (
                    <div key={horario.id} style={s.listCard}>
                      <div>
                        <strong>{nombreServicio(horario.servicio_id)}</strong>
                        <span style={s.slotDetail}>
                          {nombreDia(horario.dia_semana)} ·{" "}
                          {formatoHora(horario.hora_inicio)} ·{" "}
                          {horario.capacidad} cupos
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
        KONAX Agenda · {VERSION} · Rol: {rol || "Usuario"}
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

function ReservaLista({
  reservas,
  nombreCliente,
  nombreServicio,
  onCancelar,
  onAsistencia,
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

        const nombre = nombreCliente(reserva.cliente_id);
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
                </span>
              </div>
            </div>

            <div style={s.inlineActions}>
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
};
