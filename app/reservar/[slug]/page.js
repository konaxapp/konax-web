"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const VERSION = "2026.08.15-PORTAL-SLOTS-D";

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

export default function ReservaPublicaAutoservicioPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : params?.slug || "";

  const tokenUrl = searchParams?.get("cita") || "";

  const [portal, setPortal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [fecha, setFecha] = useState(fechaISO());
  const [horarios, setHorarios] = useState([]);
  const [servicioFiltro, setServicioFiltro] = useState("todos");
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(null);

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

  const perfilBelleza = esBelleza(portal);

  useEffect(() => {
    if (!slug) return;
    cargarPortal();
  }, [slug]);

  useEffect(() => {
    if (!portal?.ok || !fecha) return;
    cargarDisponibilidad(fecha);
  }, [portal?.ok, fecha]);

  useEffect(() => {
    if (!portal?.ok || !tokenUrl) return;
    cargarMiCita(tokenUrl);
  }, [portal?.ok, tokenUrl]);

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
    setCargando(false);
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
  }

  const servicios = useMemo(() => {
    const mapa = new Map();

    horarios.forEach((item) => {
      if (!mapa.has(String(item.servicio_id))) {
        mapa.set(String(item.servicio_id), {
          id: String(item.servicio_id),
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
      setTokenGestion(String(gestion.token));
    }

    await cargarDisponibilidad(fecha);
    setGuardando(false);

    setTimeout(() => {
      document.getElementById("confirmacion-cita")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
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
    setReservaConfirmada(null);
    setTokenGestion("");
    setHorarioSeleccionado(null);
    setServicioFiltro("todos");
    setFecha(fechaISO());
    setNombre(miCita?.cliente || "");
    setTelefono("");
    setObservaciones("");
    setError("");

    setTimeout(() => {
      document.getElementById("nueva-cita-publica")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function enlaceGestion() {
    if (!tokenGestion || typeof window === "undefined") return "";
    return `${window.location.origin}/reservar/${slug}?cita=${tokenGestion}`;
  }

  if (cargando) {
    return <main style={s.loading}>Preparando agenda...</main>;
  }

  if (!portal?.ok) {
    return (
      <main style={s.loading}>
        <div style={s.errorCard}>
          <strong>Reservas no disponibles</strong>
          <span>{error}</span>
        </div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <div style={s.shell}>
        <header style={s.hero}>
          <div>
            <span style={s.eyebrow}>
              KONAX · AUTOSERVICIO DE CITAS
            </span>
            <h1 style={s.title}>
              {portal.titulo_publico || portal.empresa_nombre}
            </h1>
            <p style={s.subtitle}>
              {perfilBelleza
                ? "Selecciona tu servicio, fecha y hora disponible. Tu cita queda registrada al instante."
                : "Selecciona el servicio, fecha y hora disponible para reservar tu espacio."}
            </p>
          </div>

          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.logo}
          />
        </header>

        {error && <div style={s.errorBox}>{error}</div>}

        {tokenUrl && miCita && (
          <section style={s.manageCard}>
            <span style={s.eyebrowDark}>GESTIONAR MI CITA</span>
            <h2 style={s.sectionTitle}>{miCita.servicio}</h2>

            <div style={s.manageGrid}>
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
                value={String(miCita.estado || "").toUpperCase()}
              />
            </div>

            {miCita.estado === "cancelada" ? (
              <div style={s.cancelledBox}>
                Esta cita está cancelada. El horario quedó disponible
                nuevamente.
              </div>
            ) : miCita.puede_cancelar ? (
              <div style={s.cancelBox}>
                <label style={s.field}>
                  <span>Teléfono de la cita</span>
                  <input
                    value={telefonoGestion}
                    onChange={(e) =>
                      setTelefonoGestion(e.target.value)
                    }
                    placeholder="Ej. 6000-0000"
                    style={s.input}
                  />
                </label>

                <label style={s.field}>
                  <span>Motivo de cancelación (opcional)</span>
                  <input
                    value={motivoCancelacion}
                    onChange={(e) =>
                      setMotivoCancelacion(e.target.value)
                    }
                    placeholder="Ej. No podré llegar a tiempo"
                    style={s.input}
                  />
                </label>

                <button
                  type="button"
                  onClick={cancelarMiCita}
                  disabled={cancelando}
                  style={s.dangerButton}
                >
                  {cancelando
                    ? "Cancelando..."
                    : "Cancelar mi cita"}
                </button>

                <small style={s.helpText}>
                  Puedes cancelar incluso el mismo día, siempre que la
                  hora de la cita todavía no haya pasado.
                </small>
              </div>
            ) : (
              <div style={s.infoBox}>
                Esta cita ya no puede cancelarse desde autoservicio.
              </div>
            )}

            <button
              type="button"
              onClick={reservarOtraCita}
              style={s.reserveAnotherButton}
            >
              + Reservar otra cita
            </button>
          </section>
        )}

        {(!tokenUrl || mostrarNuevaCita) && (
          <>
            <section id="nueva-cita-publica" style={s.card}>
              <span style={s.step}>1</span>
              <span style={s.eyebrowDark}>FECHA</span>
              <h2 style={s.sectionTitle}>
                ¿Qué día deseas reservar?
              </h2>

              <label style={s.field}>
                <span>Seleccionar fecha</span>
                <input
                  type="date"
                  min={fechaISO()}
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setHorarioSeleccionado(null);
                  }}
                  style={s.input}
                />
              </label>
            </section>

            <section style={s.card}>
              <span style={s.step}>2</span>
              <span style={s.eyebrowDark}>SERVICIO Y HORA</span>
              <h2 style={s.sectionTitle}>
                Selecciona tu servicio
              </h2>

              <div style={s.serviceChips}>
                <button
                  type="button"
                  onClick={() => {
                    setServicioFiltro("todos");
                    setHorarioSeleccionado(null);
                  }}
                  style={{
                    ...s.chip,
                    ...(servicioFiltro === "todos"
                      ? s.chipActive
                      : {}),
                  }}
                >
                  Todos
                </button>

                {servicios.map((servicio) => (
                  <button
                    key={servicio.id}
                    type="button"
                    onClick={() => {
                      setServicioFiltro(servicio.id);
                      setHorarioSeleccionado(null);
                    }}
                    style={{
                      ...s.chip,
                      ...(servicioFiltro === servicio.id
                        ? s.chipActive
                        : {}),
                    }}
                  >
                    {servicio.nombre}
                  </button>
                ))}
              </div>

              {cargandoHorarios ? (
                <div style={s.empty}>
                  Consultando horarios...
                </div>
              ) : serviciosConSlots.length === 0 ? (
                <div style={s.empty}>
                  No hay horarios disponibles para esta fecha.
                </div>
              ) : (
                <div style={s.serviceList}>
                  {serviciosConSlots.map((grupo) => {
                    const slotsDisponibles = grupo.slots.filter(
                      (slot) => Number(slot.disponibles || 0) > 0
                    );

                    return (
                      <article
                        key={String(grupo.servicio_id)}
                        style={s.serviceCard}
                      >
                        <div style={s.serviceHeader}>
                          <div>
                            <strong style={s.slotTitle}>
                              {grupo.servicio_nombre}
                            </strong>

                            <span style={s.slotMeta}>
                              Duración: {grupo.duracion_minutos} min
                            </span>

                            <span style={s.slotMeta}>
                              {perfilBelleza
                                ? "Profesional"
                                : "Instructor"}
                              : {grupo.instructor || "Por confirmar"}
                            </span>

                            {grupo.descripcion && (
                              <p style={s.description}>
                                {grupo.descripcion}
                              </p>
                            )}
                          </div>

                          {grupo.requiere_pago && (
                            <strong style={s.price}>
                              {dinero(grupo.precio)}
                            </strong>
                          )}
                        </div>

                        <div style={s.timeSection}>
                          <span style={s.timeLabel}>
                            Horas disponibles
                          </span>

                          {slotsDisponibles.length === 0 ? (
                            <div style={s.noSlots}>
                              Sin horas disponibles
                            </div>
                          ) : (
                            <div style={s.timeGrid}>
                              {slotsDisponibles.map((item) => {
                                const seleccionado =
                                  claveSlot(
                                    horarioSeleccionado
                                  ) === claveSlot(item);

                                return (
                                  <button
                                    key={claveSlot(item)}
                                    type="button"
                                    onClick={() =>
                                      setHorarioSeleccionado(item)
                                    }
                                    style={{
                                      ...s.timeButton,
                                      ...(seleccionado
                                        ? s.timeButtonActive
                                        : {}),
                                    }}
                                  >
                                    {formatoHora(item.hora_inicio)}
                                    {seleccionado ? " ✓" : ""}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {horarioSeleccionado && !reservaConfirmada && (
              <section style={s.card}>
                <span style={s.step}>3</span>
                <span style={s.eyebrowDark}>TUS DATOS</span>
                <h2 style={s.sectionTitle}>
                  Confirmar cita
                </h2>

                <div style={s.selectionBox}>
                  <strong>
                    {horarioSeleccionado.servicio_nombre}
                  </strong>
                  <span>{formatoFecha(fecha)}</span>
                  <span style={s.selectedTime}>
                    {formatoHora(
                      horarioSeleccionado.hora_inicio
                    )}{" "}
                    –{" "}
                    {formatoHora(
                      horarioSeleccionado.hora_fin
                    )}
                  </span>

                  {horarioSeleccionado.requiere_pago && (
                    <strong style={s.price}>
                      {dinero(horarioSeleccionado.precio)} · Pago en
                      el local
                    </strong>
                  )}
                </div>

                <form
                  onSubmit={confirmarReserva}
                  style={s.form}
                >
                  <label style={s.field}>
                    <span>Nombre completo</span>
                    <input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      style={s.input}
                      placeholder="Nombre del cliente"
                    />
                  </label>

                  <label style={s.field}>
                    <span>Teléfono</span>
                    <input
                      value={telefono}
                      onChange={(e) =>
                        setTelefono(e.target.value)
                      }
                      style={s.input}
                      placeholder="6000-0000"
                    />
                  </label>

                  <label style={s.field}>
                    <span>Observaciones (opcional)</span>
                    <textarea
                      value={observaciones}
                      onChange={(e) =>
                        setObservaciones(e.target.value)
                      }
                      style={s.textarea}
                      placeholder="Alguna indicación para el negocio"
                    />
                  </label>

                  <button
                    disabled={guardando}
                    style={s.primaryButton}
                  >
                    {guardando
                      ? "Confirmando..."
                      : "Confirmar mi cita"}
                  </button>
                </form>
              </section>
            )}

            {reservaConfirmada && (
              <section
                id="confirmacion-cita"
                style={s.confirmCard}
              >
                <div style={s.check}>✓</div>
                <span style={s.eyebrowDark}>
                  RESERVA CONFIRMADA
                </span>
                <h2 style={s.sectionTitle}>
                  Tu cita quedó registrada
                </h2>

                <p style={s.confirmText}>
                  {reservaConfirmada.servicio} ·{" "}
                  {formatoFecha(reservaConfirmada.fecha)} ·{" "}
                  {formatoHora(
                    reservaConfirmada.hora_inicio
                  )}{" "}
                  –{" "}
                  {formatoHora(reservaConfirmada.hora_fin)}
                </p>

                {reservaConfirmada.requiere_pago && (
                  <div style={s.infoBox}>
                    Pago en el local:{" "}
                    {dinero(reservaConfirmada.monto)}
                  </div>
                )}

                {tokenGestion && (
                  <div style={s.manageLinkBox}>
                    <strong>
                      Guarda este enlace para gestionar o cancelar tu
                      cita:
                    </strong>

                    <input
                      readOnly
                      value={enlaceGestion()}
                      style={s.input}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `/reservar/${slug}?cita=${tokenGestion}`;
                      }}
                      style={s.secondaryButton}
                    >
                      Gestionar mi cita
                    </button>
                  </div>
                )}

                <small style={s.helpText}>
                  La cita quedó registrada inmediatamente en KONAX.
                </small>
              </section>
            )}
          </>
        )}

        <footer style={s.footer}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.footerLogo}
          />
          <span>
            Reservas y citas por KONAX · {VERSION}
          </span>
        </footer>
      </div>
    </main>
  );
}

function Dato({ label, value }) {
  return (
    <div style={s.dataBox}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    padding: "18px 12px 42px",
    background: "#F4F7F5",
    color: "#13221A",
    fontFamily: 'Inter, system-ui, "Segoe UI", sans-serif',
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#F4F7F5",
    fontFamily: 'Inter, system-ui, "Segoe UI", sans-serif',
  },

  shell: {
    width: "min(920px,100%)",
    margin: "0 auto",
  },

  hero: {
    marginBottom: 12,
    padding: "18px 20px",
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
    borderRadius: 20,
    background: "linear-gradient(135deg,#071B13,#0E7042)",
    color: "#FFF",
  },

  logo: {
    width: 105,
    height: 48,
    objectFit: "contain",
    background: "#FFF",
    borderRadius: 13,
    padding: 7,
  },

  eyebrow: {
    display: "block",
    color: "#74E1A5",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  eyebrowDark: {
    display: "block",
    color: "#0B7041",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  title: {
    margin: "5px 0",
    fontSize: "clamp(26px,6vw,42px)",
  },

  subtitle: {
    maxWidth: 620,
    margin: 0,
    color: "#D9E9E0",
    lineHeight: 1.45,
    fontSize: 14,
  },

  card: {
    marginBottom: 10,
    padding: 16,
    border: "1px solid #DCE6E0",
    borderRadius: 18,
    background: "#FFF",
  },

  step: {
    width: 26,
    height: 26,
    marginBottom: 7,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#E9F7EF",
    color: "#0B7041",
    fontSize: 12,
    fontWeight: 900,
  },

  manageCard: {
    marginBottom: 14,
    padding: 20,
    border: "2px solid #A7D7BA",
    borderRadius: 20,
    background: "#F0FAF4",
  },

  reserveAnotherButton: {
    width: "100%",
    minHeight: 48,
    marginTop: 14,
    border: "1px solid #0B7041",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B7041",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
  },

  sectionTitle: {
    margin: "4px 0 12px",
    fontSize: "clamp(21px,5vw,27px)",
  },

  field: {
    display: "grid",
    gap: 6,
    fontWeight: 700,
  },

  input: {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    border: "1px solid #CEDBD3",
    borderRadius: 11,
    background: "#FFF",
    fontSize: 16,
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    minHeight: 68,
    padding: 10,
    border: "1px solid #CEDBD3",
    borderRadius: 11,
    resize: "vertical",
    fontSize: 16,
    boxSizing: "border-box",
  },

  serviceChips: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  },

  chip: {
    padding: "9px 12px",
    border: "1px solid #D4E0D9",
    borderRadius: 999,
    background: "#FFF",
    cursor: "pointer",
    fontWeight: 800,
  },

  chipActive: {
    background: "#0D7042",
    color: "#FFF",
    borderColor: "#0D7042",
  },

  serviceList: {
    display: "grid",
    gap: 12,
  },

  serviceCard: {
    padding: 15,
    border: "1px solid #DEE7E1",
    borderRadius: 16,
    background: "#FBFDFC",
  },

  serviceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },

  slotTitle: {
    display: "block",
    fontSize: 18,
  },

  slotMeta: {
    display: "block",
    marginTop: 4,
    color: "#66766D",
    fontSize: 13,
  },

  description: {
    margin: "7px 0 0",
    color: "#67766E",
    fontSize: 13,
  },

  price: {
    display: "block",
    color: "#0B7041",
    whiteSpace: "nowrap",
  },

  timeSection: {
    marginTop: 13,
    paddingTop: 12,
    borderTop: "1px solid #E3EAE6",
  },

  timeLabel: {
    display: "block",
    marginBottom: 8,
    color: "#526159",
    fontSize: 12,
    fontWeight: 850,
  },

  timeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
    gap: 8,
  },

  timeButton: {
    minHeight: 42,
    padding: "0 10px",
    border: "1px solid #C9D9CF",
    borderRadius: 11,
    background: "#FFF",
    color: "#15231B",
    fontWeight: 850,
    cursor: "pointer",
  },

  timeButtonActive: {
    borderColor: "#0D7042",
    background: "#0D7042",
    color: "#FFF",
    boxShadow: "0 6px 16px rgba(13,112,66,.15)",
  },

  noSlots: {
    padding: 12,
    borderRadius: 10,
    background: "#F0F3F1",
    color: "#7B8780",
    textAlign: "center",
    fontSize: 13,
  },

  empty: {
    padding: 26,
    textAlign: "center",
    color: "#6D7972",
  },

  selectionBox: {
    marginBottom: 14,
    padding: 14,
    display: "grid",
    gap: 4,
    borderRadius: 14,
    background: "#F2F7F4",
  },

  selectedTime: {
    marginTop: 3,
    color: "#0B7041",
    fontSize: 18,
    fontWeight: 900,
  },

  form: {
    display: "grid",
    gap: 12,
  },

  primaryButton: {
    minHeight: 48,
    border: 0,
    borderRadius: 12,
    background: "#0D7042",
    color: "#FFF",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryButton: {
    minHeight: 43,
    border: "1px solid #AACCB8",
    borderRadius: 11,
    background: "#FFF",
    color: "#0B7041",
    fontWeight: 900,
    cursor: "pointer",
  },

  dangerButton: {
    minHeight: 43,
    border: 0,
    borderRadius: 11,
    background: "#B42318",
    color: "#FFF",
    fontWeight: 900,
    cursor: "pointer",
  },

  errorBox: {
    marginBottom: 14,
    padding: 13,
    border: "1px solid #F2B8B3",
    borderRadius: 12,
    background: "#FFF1EF",
    color: "#8A1C12",
  },

  errorCard: {
    display: "grid",
    gap: 8,
    padding: 20,
    borderRadius: 16,
    background: "#FFF",
  },

  confirmCard: {
    marginBottom: 14,
    padding: 24,
    border: "2px solid #9AD2B2",
    borderRadius: 22,
    background: "#F3FBF6",
    textAlign: "center",
  },

  check: {
    width: 58,
    height: 58,
    margin: "0 auto 12px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#0D7042",
    color: "#FFF",
    fontSize: 28,
    fontWeight: 900,
  },

  confirmText: {
    fontSize: 16,
    lineHeight: 1.5,
  },

  manageLinkBox: {
    marginTop: 16,
    display: "grid",
    gap: 9,
    textAlign: "left",
  },

  manageGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(150px,1fr))",
    gap: 9,
  },

  dataBox: {
    padding: 11,
    display: "grid",
    gap: 4,
    border: "1px solid #DCE6E0",
    borderRadius: 12,
    background: "#FFF",
  },

  cancelBox: {
    marginTop: 14,
    display: "grid",
    gap: 10,
  },

  cancelledBox: {
    marginTop: 12,
    padding: 13,
    borderRadius: 12,
    background: "#FFEDEC",
    color: "#8A1C12",
    fontWeight: 800,
  },

  infoBox: {
    marginTop: 12,
    padding: 13,
    borderRadius: 12,
    background: "#EEF5F1",
    color: "#405147",
  },

  helpText: {
    display: "block",
    marginTop: 10,
    color: "#69776F",
    lineHeight: 1.5,
  },

  footer: {
    padding: "16px 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    color: "#68766E",
    fontSize: 12,
  },

  footerLogo: {
    width: 85,
    height: 32,
    objectFit: "contain",
  },
};
