"use client";

// KONAX · PORTAL PUBLICO DE RESERVAS
// VERSION C · RESPONSIVE + CONFIRMACION LIMPIA · 2026-08-09

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const RESPONSIVE_CSS = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    max-width: 100%;
    overflow-x: hidden;
  }

  @media (max-width: 760px) {
    .reserva-publica-page {
      padding-left: 10px !important;
      padding-right: 10px !important;
      overflow-x: hidden !important;
    }

    .reserva-publica-shell {
      width: 100% !important;
      max-width: 100% !important;
    }

    .reserva-publica-hero {
      padding: 18px 14px !important;
      border-radius: 18px !important;
    }

    .reserva-publica-brand {
      width: 100% !important;
      align-items: flex-start !important;
    }

    .reserva-publica-secure {
      display: none !important;
    }

    .reserva-publica-steps {
      grid-template-columns:
        minmax(0,1fr) 14px minmax(0,1fr) 14px minmax(0,1fr) !important;
      gap: 4px !important;
    }

    .reserva-publica-step {
      min-width: 0 !important;
      font-size: 7px !important;
      gap: 4px !important;
      white-space: normal !important;
      text-align: center !important;
      justify-content: center !important;
    }

    .reserva-publica-card {
      padding: 14px !important;
      border-radius: 16px !important;
    }

    .reserva-publica-days {
      grid-template-columns: repeat(7, 72px) !important;
      overflow-x: auto !important;
      padding-bottom: 6px !important;
      scroll-snap-type: x proximity;
    }

    .reserva-publica-day {
      scroll-snap-align: start;
    }

    .reserva-publica-class-card {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }

    .reserva-publica-class-action {
      width: 100% !important;
      min-width: 0 !important;
    }

    .reserva-publica-identity {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }

    .reserva-publica-summary {
      min-height: auto !important;
      padding: 16px !important;
    }

    .reserva-publica-form {
      width: 100% !important;
      min-width: 0 !important;
      padding: 16px !important;
    }

    .reserva-publica-form input,
    .reserva-publica-form textarea,
    .reserva-publica-form button {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
    }

    .reserva-publica-ticket-grid {
      grid-template-columns: 1fr !important;
    }

    .reserva-publica-ticket-top {
      flex-direction: column !important;
      align-items: flex-start !important;
    }

    .reserva-publica-confirm-actions {
      width: 100% !important;
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 8px !important;
    }

    .reserva-publica-confirm-actions button {
      width: 100% !important;
    }
  }
`;

const DIA_MS = 86400000;

function fechaLocalISO(fecha) {
  const d = new Date(fecha);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function hoyISO() {
  return fechaLocalISO(new Date());
}

function sumarDias(fechaISO, cantidad) {
  const fecha = new Date(`${fechaISO}T12:00:00`);
  fecha.setDate(fecha.getDate() + cantidad);
  return fechaLocalISO(fecha);
}

function formatoDia(fechaISO) {
  const fecha = new Date(`${fechaISO}T12:00:00`);
  return new Intl.DateTimeFormat("es-PA", {
    weekday: "long",
  }).format(fecha);
}

function formatoFechaCorta(fechaISO) {
  const fecha = new Date(`${fechaISO}T12:00:00`);
  return new Intl.DateTimeFormat("es-PA", {
    day: "numeric",
    month: "short",
  }).format(fecha);
}

function formatoFechaLarga(fechaISO) {
  const fecha = new Date(`${fechaISO}T12:00:00`);
  return new Intl.DateTimeFormat("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

function formatoHora(hora) {
  if (!hora) return "-";

  const partes = String(hora).split(":");
  const h = Number(partes[0] || 0);
  const m = Number(partes[1] || 0);

  const fecha = new Date();
  fecha.setHours(h, m, 0, 0);

  return new Intl.DateTimeFormat("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(fecha);
}

function dinero(valor) {
  const numero = Number(valor || 0);
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(numero) ? numero : 0);
}

function obtenerMensajeError(error) {
  if (!error) return "Ocurrió un error inesperado.";

  const texto =
    error.message ||
    error.details ||
    error.hint ||
    String(error);

  return texto
    .replace("P0001:", "")
    .replace("Error:", "")
    .trim();
}

export default function ReservaPublicaPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : params?.slug || "";

  const [cargandoPortal, setCargandoPortal] = useState(true);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [portal, setPortal] = useState(null);
  const [errorPortal, setErrorPortal] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [fecha, setFecha] = useState(hoyISO());
  const [horarios, setHorarios] = useState([]);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(null);

  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [reservaConfirmada, setReservaConfirmada] = useState(null);

  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, indice) => {
      const iso = sumarDias(hoyISO(), indice);
      const fechaObj = new Date(`${iso}T12:00:00`);

      return {
        iso,
        dia: new Intl.DateTimeFormat("es-PA", {
          weekday: "short",
        })
          .format(fechaObj)
          .replace(".", "")
          .toUpperCase(),
        numero: fechaObj.getDate(),
        mes: new Intl.DateTimeFormat("es-PA", {
          month: "short",
        })
          .format(fechaObj)
          .replace(".", "")
          .toUpperCase(),
      };
    });
  }, []);

  useEffect(() => {
    if (!slug) return;
    cargarPortal();
  }, [slug]);

  useEffect(() => {
    if (!portal?.ok || !fecha) return;
    cargarDisponibilidad(fecha);
  }, [portal, fecha]);

  async function cargarPortal() {
    setCargandoPortal(true);
    setErrorPortal("");
    setPortal(null);

    const { data, error: rpcError } = await supabase.rpc(
      "obtener_agenda_publica",
      {
        p_slug: slug,
      }
    );

    if (rpcError) {
      setErrorPortal(obtenerMensajeError(rpcError));
      setCargandoPortal(false);
      return;
    }

    if (!data?.ok) {
      setErrorPortal(
        data?.mensaje ||
          "Este portal de reservas no está disponible."
      );
      setCargandoPortal(false);
      return;
    }

    setPortal(data);
    setCargandoPortal(false);
  }

  async function cargarDisponibilidad(fechaSeleccionada) {
    setCargandoHorarios(true);
    setError("");
    setMensaje("");
    setHorarioSeleccionado(null);

    const { data, error: rpcError } = await supabase.rpc(
      "obtener_disponibilidad_agenda_publica",
      {
        p_slug: slug,
        p_fecha: fechaSeleccionada,
      }
    );

    if (rpcError) {
      setError(obtenerMensajeError(rpcError));
      setHorarios([]);
      setCargandoHorarios(false);
      return;
    }

    setHorarios(data || []);
    setCargandoHorarios(false);
  }

  function seleccionarHorario(item) {
    if (Number(item.disponibles || 0) <= 0) return;

    setHorarioSeleccionado(item);
    setError("");
    setMensaje("");
    setPaso(2);

    setTimeout(() => {
      document
        .getElementById("datos-reserva")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 80);
  }

  async function confirmarReserva(event) {
    event.preventDefault();

    if (!horarioSeleccionado) {
      setError("Selecciona una clase u horario.");
      return;
    }

    if (!nombre.trim() || !telefono.trim()) {
      setError("Ingresa tu nombre y teléfono.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    const { data, error: rpcError } = await supabase.rpc(
      "crear_reserva_agenda_publica",
      {
        p_slug: slug,
        p_horario_id: horarioSeleccionado.horario_id,
        p_fecha_reserva: fecha,
        p_nombre: nombre.trim(),
        p_telefono: telefono.trim(),
        p_observaciones: observaciones.trim() || null,
      }
    );

    if (rpcError) {
      setError(obtenerMensajeError(rpcError));
      setGuardando(false);
      return;
    }

    if (!data?.ok) {
      setError(
        data?.mensaje || "No se pudo completar la reserva."
      );
      setGuardando(false);
      return;
    }

    setReservaConfirmada(data);
    setPaso(3);
    setGuardando(false);

    await cargarDisponibilidad(fecha);

    setTimeout(() => {
      document
        .getElementById("reserva-confirmada")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 80);
  }

  function nuevaReserva() {
    setReservaConfirmada(null);
    setHorarioSeleccionado(null);
    setNombre("");
    setTelefono("");
    setObservaciones("");
    setError("");
    setMensaje("");
    setPaso(1);
  }

  function finalizarReserva() {
    setReservaConfirmada(null);
    setHorarioSeleccionado(null);
    setNombre("");
    setTelefono("");
    setObservaciones("");
    setError("");
    setMensaje("");
    setPaso(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (cargandoPortal) {
    return (
      <main style={s.loadingPage}>
        <div style={s.loadingCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.loadingLogo}
          />
          <div style={s.spinner} />
          <strong style={s.loadingTitle}>
            Preparando reservas
          </strong>
          <span style={s.loadingText}>
            Estamos consultando los horarios disponibles.
          </span>
        </div>
      </main>
    );
  }

  if (errorPortal || !portal?.ok) {
    return (
      <main style={s.loadingPage}>
        <div style={s.errorPortalCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.loadingLogo}
          />
          <div style={s.errorIcon}>!</div>
          <h1 style={s.errorPortalTitle}>
            Reservas no disponibles
          </h1>
          <p style={s.errorPortalText}>
            {errorPortal ||
              "Este portal de reservas no está disponible."}
          </p>
          <span style={s.powered}>
            Tecnología de reservas por KONAX
          </span>
        </div>
      </main>
    );
  }

  return (
    <main style={s.page} className="reserva-publica-page">
      <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />
      <section style={s.shell} className="reserva-publica-shell">
        <header style={s.hero} className="reserva-publica-hero">
          <div style={s.heroTop}>
            <div style={s.brandWrap} className="reserva-publica-brand">
              <div style={s.brandLogo}>
                <img
                  src="/konax-logo.png"
                  alt="KONAX"
                  style={s.logo}
                />
              </div>

              <div>
                <span style={s.eyebrow}>
                  RESERVAS EN LÍNEA
                </span>
                <h1 style={s.businessName}>
                  {portal.titulo_publico ||
                    portal.empresa_nombre}
                </h1>
              </div>
            </div>

            <span style={s.secureBadge} className="reserva-publica-secure">
              ● Reserva segura
            </span>
          </div>

          <p style={s.heroText}>
            Elige tu clase, selecciona un horario disponible
            y confirma tu espacio en pocos segundos.
          </p>

          <div style={s.steps} className="reserva-publica-steps">
            <div
              style={{
                ...s.step,
                ...(paso >= 1 ? s.stepActive : {}),
              }}
              className="reserva-publica-step"
            >
              <span style={s.stepCircle}>1</span>
              <span>Horario</span>
            </div>

            <span style={s.stepLine} />

            <div
              style={{
                ...s.step,
                ...(paso >= 2 ? s.stepActive : {}),
              }}
              className="reserva-publica-step"
            >
              <span style={s.stepCircle}>2</span>
              <span>Tus datos</span>
            </div>

            <span style={s.stepLine} />

            <div
              style={{
                ...s.step,
                ...(paso >= 3 ? s.stepActive : {}),
              }}
              className="reserva-publica-step"
            >
              <span style={s.stepCircle}>3</span>
              <span>Confirmación</span>
            </div>
          </div>
        </header>

        {paso !== 3 && (
          <>
            <section style={s.card} className="reserva-publica-card">
              <div style={s.sectionHead}>
                <div>
                  <span style={s.sectionEyebrow}>
                    PASO 1
                  </span>
                  <h2 style={s.sectionTitle}>
                    Selecciona el día
                  </h2>
                </div>

                <span style={s.dateBadge}>
                  {formatoFechaLarga(fecha)}
                </span>
              </div>

              <div style={s.daysGrid} className="reserva-publica-days">
                {dias.map((dia) => {
                  const activo = dia.iso === fecha;

                  return (
                    <button
                      key={dia.iso}
                      type="button"
                      onClick={() => {
                        setFecha(dia.iso);
                        setPaso(1);
                        setHorarioSeleccionado(null);
                      }}
                      style={{
                        ...s.dayButton,
                        ...(activo ? s.dayButtonActive : {}),
                      }}
                      className="reserva-publica-day"
                    >
                      <span
                        style={{
                          ...s.dayName,
                          ...(activo ? s.dayTextActive : {}),
                        }}
                      >
                        {dia.dia}
                      </span>

                      <strong
                        style={{
                          ...s.dayNumber,
                          ...(activo ? s.dayTextActive : {}),
                        }}
                      >
                        {dia.numero}
                      </strong>

                      <span
                        style={{
                          ...s.dayMonth,
                          ...(activo ? s.dayTextActive : {}),
                        }}
                      >
                        {dia.mes}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={s.dateFieldWrap}>
                <label style={s.label}>
                  Otra fecha
                </label>
                <input
                  type="date"
                  min={hoyISO()}
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    setPaso(1);
                    setHorarioSeleccionado(null);
                  }}
                  style={s.input}
                />
              </div>
            </section>

            <section style={s.card} className="reserva-publica-card">
              <div style={s.sectionHead}>
                <div>
                  <span style={s.sectionEyebrow}>
                    HORARIOS
                  </span>
                  <h2 style={s.sectionTitle}>
                    Clases disponibles
                  </h2>
                </div>

                <span style={s.counter}>
                  {horarios.length}
                </span>
              </div>

              {cargandoHorarios ? (
                <div style={s.empty}>
                  <div style={s.spinnerSmall} />
                  <strong>Consultando horarios...</strong>
                </div>
              ) : horarios.length === 0 ? (
                <div style={s.empty}>
                  <div style={s.emptyIcon}>◷</div>
                  <strong style={s.emptyTitle}>
                    No hay clases disponibles
                  </strong>
                  <span style={s.emptyText}>
                    Selecciona otro día para consultar
                    la programación.
                  </span>
                </div>
              ) : (
                <div style={s.classList}>
                  {horarios.map((item) => {
                    const disponibles = Number(
                      item.disponibles || 0
                    );
                    const capacidad = Number(
                      item.capacidad || 0
                    );
                    const reservados = Number(
                      item.reservados || 0
                    );
                    const lleno = disponibles <= 0;
                    const seleccionado =
                      horarioSeleccionado?.horario_id ===
                      item.horario_id;
                    const ocupacion =
                      capacidad > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (reservados / capacidad) * 100
                            )
                          )
                        : 0;

                    return (
                      <article
                        key={item.horario_id}
                        style={{
                          ...s.classCard,
                          ...(seleccionado
                            ? s.classCardSelected
                            : {}),
                        }}
                        className="reserva-publica-class-card"
                      >
                        <div style={s.classMain}>
                          <div style={s.classTitleRow}>
                            <div>
                              <span style={s.classType}>
                                {item.servicio_tipo ===
                                "cita_individual"
                                  ? "CITA INDIVIDUAL"
                                  : "CLASE GRUPAL"}
                              </span>

                              <h3 style={s.classTitle}>
                                {item.servicio_nombre}
                              </h3>
                            </div>

                            <span
                              style={{
                                ...s.availabilityBadge,
                                ...(lleno
                                  ? s.availabilityFull
                                  : {}),
                              }}
                            >
                              {lleno
                                ? "COMPLETO"
                                : `${disponibles} ${
                                    disponibles === 1
                                      ? "CUPO"
                                      : "CUPOS"
                                  }`}
                            </span>
                          </div>

                          {item.descripcion && (
                            <p style={s.classDescription}>
                              {item.descripcion}
                            </p>
                          )}

                          <div style={s.classDetails}>
                            <span style={s.detailPill}>
                              ◷ {formatoHora(item.hora_inicio)}
                              {" – "}
                              {formatoHora(item.hora_fin)}
                            </span>

                            <span style={s.detailPill}>
                              👤{" "}
                              {item.instructor ||
                                "Instructor por confirmar"}
                            </span>

                            <span
                              style={
                                item.requiere_membresia
                                  ? s.detailPillMember
                                  : s.detailPillOpen
                              }
                            >
                              {item.requiere_membresia
                                ? "🔒 Solo miembros"
                                : "✓ Reserva abierta"}
                            </span>

                            {item.requiere_pago && (
                              <span style={s.detailPillPrice}>
                                {dinero(item.precio)}
                              </span>
                            )}
                          </div>

                          <div style={s.progressWrap}>
                            <div style={s.progressTrack}>
                              <div
                                style={{
                                  ...s.progressFill,
                                  width: `${ocupacion}%`,
                                }}
                              />
                            </div>

                            <div style={s.progressText}>
                              <span>
                                {reservados} reservados
                              </span>
                              <span>
                                {capacidad} capacidad
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={lleno}
                          onClick={() => seleccionarHorario(item)}
                          style={
                            lleno
                              ? s.selectButtonDisabled
                              : seleccionado
                              ? s.selectButtonSelected
                              : s.selectButton
                          }
                          className="reserva-publica-class-action"
                        >
                          {lleno
                            ? "Sin cupos"
                            : seleccionado
                            ? "Seleccionado ✓"
                            : "Reservar"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {horarioSeleccionado && (
              <section
                id="datos-reserva"
                style={s.identityCard}
                className="reserva-publica-identity"
              >
                <div style={s.summaryBox} className="reserva-publica-summary">
                  <span style={s.summaryEyebrow}>
                    TU SELECCIÓN
                  </span>

                  <strong style={s.summaryClass}>
                    {horarioSeleccionado.servicio_nombre}
                  </strong>

                  <span style={s.summaryDate}>
                    {formatoFechaLarga(fecha)}
                  </span>

                  <span style={s.summaryTime}>
                    {formatoHora(
                      horarioSeleccionado.hora_inicio
                    )}
                    {" – "}
                    {formatoHora(
                      horarioSeleccionado.hora_fin
                    )}
                  </span>

                  <span style={s.summaryInstructor}>
                    {horarioSeleccionado.instructor
                      ? `Instructor: ${horarioSeleccionado.instructor}`
                      : "Instructor por confirmar"}
                  </span>

                  {horarioSeleccionado.requiere_pago && (
                    <div style={s.priceBox}>
                      <span>Costo adicional</span>
                      <strong>
                        {dinero(horarioSeleccionado.precio)}
                      </strong>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={confirmarReserva}
                  style={s.form}
                  className="reserva-publica-form"
                >
                  <div>
                    <span style={s.sectionEyebrow}>
                      PASO 2
                    </span>
                    <h2 style={s.formTitle}>
                      Confirma tus datos
                    </h2>
                    <p style={s.formText}>
                      Ingresa tu nombre y teléfono. Si ya eres cliente,
                      KONAX vinculará la reserva a tu ficha. Si eres nuevo
                      y la clase es abierta, tu registro se creará
                      automáticamente.
                    </p>
                  </div>

                  <label style={s.field}>
                    <span style={s.label}>Nombre completo</span>
                    <input
                      value={nombre}
                      onChange={(e) =>
                        setNombre(e.target.value)
                      }
                      placeholder="Ej. María González"
                      autoComplete="name"
                      style={s.inputLarge}
                    />
                  </label>

                  <label style={s.field}>
                    <span style={s.label}>
                      Teléfono
                    </span>
                    <input
                      value={telefono}
                      onChange={(e) =>
                        setTelefono(e.target.value)
                      }
                      placeholder="Ej. 6000-0000"
                      inputMode="tel"
                      autoComplete="tel"
                      style={s.inputLarge}
                    />
                  </label>

                  <label style={s.field}>
                    <span style={s.label}>
                      Observación{" "}
                      <small style={s.optional}>
                        (opcional)
                      </small>
                    </span>
                    <textarea
                      value={observaciones}
                      onChange={(e) =>
                        setObservaciones(e.target.value)
                      }
                      placeholder="Alguna indicación para el gimnasio..."
                      rows={3}
                      style={s.textarea}
                    />
                  </label>

                  {error && (
                    <div style={s.errorBox}>
                      <strong>No se pudo reservar</strong>
                      <span>{error}</span>
                    </div>
                  )}

                  {mensaje && (
                    <div style={s.successBox}>
                      {mensaje}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={guardando}
                    style={{
                      ...s.confirmButton,
                      ...(guardando
                        ? s.confirmButtonDisabled
                        : {}),
                    }}
                  >
                    {guardando
                      ? "Confirmando..."
                      : "Confirmar mi reserva"}
                  </button>

                  <span style={s.privacyText}>
                    Tu nombre y teléfono se utilizan para gestionar
                    la reserva con este negocio. Si el servicio exige
                    membresía, KONAX la validará automáticamente.
                  </span>
                </form>
              </section>
            )}
          </>
        )}

        {paso === 3 && reservaConfirmada && (
          <section
            id="reserva-confirmada"
            style={s.confirmationCard}
          >
            <div style={s.checkCircle}>✓</div>

            <span style={s.confirmEyebrow}>
              RESERVA REGISTRADA
            </span>

            <h2 style={s.confirmTitle}>
              ¡Tu espacio está reservado!
            </h2>

            <p style={s.confirmText}>
              Tu reserva fue registrada correctamente.
              {reservaConfirmada.cliente_nuevo
                ? " Además, tu ficha de cliente fue creada automáticamente."
                : ""}
            </p>

            <div style={s.ticket}>
              <div style={s.ticketTop} className="reserva-publica-ticket-top">
                <div>
                  <span style={s.ticketLabel}>
                    CLASE / SERVICIO
                  </span>
                  <strong style={s.ticketClass}>
                    {reservaConfirmada.servicio}
                  </strong>
                </div>

                <span style={s.confirmedBadge}>
                  {reservaConfirmada.estado ===
                  "pendiente_pago"
                    ? "PENDIENTE DE PAGO"
                    : "CONFIRMADA"}
                </span>
              </div>

              <div style={s.ticketGrid} className="reserva-publica-ticket-grid">
                <div style={s.ticketItem}>
                  <span>Fecha</span>
                  <strong>
                    {formatoFechaLarga(
                      reservaConfirmada.fecha
                    )}
                  </strong>
                </div>

                <div style={s.ticketItem}>
                  <span>Horario</span>
                  <strong>
                    {formatoHora(
                      reservaConfirmada.hora_inicio
                    )}
                    {" – "}
                    {formatoHora(
                      reservaConfirmada.hora_fin
                    )}
                  </strong>
                </div>

                <div style={s.ticketItem}>
                  <span>Cupos restantes</span>
                  <strong>
                    {reservaConfirmada.disponibles}
                  </strong>
                </div>

                {reservaConfirmada.requiere_pago && (
                  <div style={s.ticketItem}>
                    <span>Pago pendiente</span>
                    <strong>
                      {dinero(reservaConfirmada.monto)}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {reservaConfirmada.requiere_pago && (
              <div style={s.paymentNotice}>
                Esta reserva requiere un pago adicional.
                El gimnasio te indicará cómo completar
                el pago.
              </div>
            )}

            <div
              style={s.confirmActions}
              className="reserva-publica-confirm-actions"
            >
              <button
                type="button"
                onClick={finalizarReserva}
                style={s.doneButton}
              >
                Listo
              </button>

              <button
                type="button"
                onClick={nuevaReserva}
                style={s.newReservationButton}
              >
                Hacer otra reserva
              </button>
            </div>
          </section>
        )}

        <footer style={s.footer}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.footerLogo}
          />
          <span>
            Reservas digitales para negocios
          </span>
        </footer>
      </section>
    </main>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    padding: "20px 12px 42px",
    background:
      "linear-gradient(180deg,#eff7f2 0%,#f8faf9 42%,#edf4f0 100%)",
    color: "#15231b",
    fontFamily:
      'Inter, system-ui, "Segoe UI", sans-serif',
  },

  shell: {
    width: "min(880px,100%)",
    margin: "0 auto",
  },

  hero: {
    marginBottom: 14,
    padding: "22px 20px 20px",
    borderRadius: 24,
    background:
      "linear-gradient(135deg,#081c13 0%,#0c4b2c 60%,#0f7b43 100%)",
    color: "#fff",
    boxShadow:
      "0 18px 44px rgba(8,50,29,.17)",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },

  brandWrap: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    minWidth: 0,
  },

  brandLogo: {
    width: 106,
    minHeight: 58,
    padding: "5px 8px",
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#fff",
    flex: "0 0 auto",
  },

  logo: {
    width: 92,
    height: 42,
    objectFit: "contain",
  },

  eyebrow: {
    display: "block",
    color: "#7EE6AA",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: 1.25,
  },

  businessName: {
    margin: "4px 0 0",
    fontSize: "clamp(20px,5vw,30px)",
    lineHeight: 1.08,
  },

  secureBadge: {
    padding: "7px 10px",
    border: "1px solid rgba(255,255,255,.16)",
    borderRadius: 999,
    background: "rgba(255,255,255,.08)",
    color: "#D8F1E2",
    fontSize: 8,
    fontWeight: 850,
  },

  heroText: {
    maxWidth: 620,
    margin: "17px 0 0",
    color: "#D6E8DE",
    fontSize: 12,
    lineHeight: 1.55,
  },

  steps: {
    marginTop: 19,
    display: "grid",
    gridTemplateColumns:
      "auto minmax(24px,1fr) auto minmax(24px,1fr) auto",
    alignItems: "center",
    gap: 8,
  },

  step: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#94AEA0",
    fontSize: 8,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },

  stepActive: {
    color: "#fff",
  },

  stepCircle: {
    width: 22,
    height: 22,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "rgba(255,255,255,.12)",
    fontSize: 8,
    fontWeight: 950,
  },

  stepLine: {
    height: 1,
    background: "rgba(255,255,255,.16)",
  },

  card: {
    marginBottom: 12,
    padding: 17,
    border: "1px solid #DDE7E1",
    borderRadius: 19,
    background: "#fff",
    boxShadow:
      "0 7px 22px rgba(20,55,35,.045)",
  },

  sectionHead: {
    marginBottom: 13,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  sectionEyebrow: {
    display: "block",
    color: "#0B7A43",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: 1.15,
  },

  sectionTitle: {
    margin: "3px 0 0",
    fontSize: 18,
  },

  dateBadge: {
    maxWidth: "100%",
    padding: "7px 9px",
    borderRadius: 9,
    background: "#F0F7F3",
    color: "#466054",
    fontSize: 8,
    fontWeight: 800,
    textTransform: "capitalize",
  },

  daysGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7,minmax(66px,1fr))",
    gap: 6,
    overflowX: "auto",
    paddingBottom: 2,
  },

  dayButton: {
    minWidth: 66,
    minHeight: 78,
    padding: "8px 5px",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 1,
    border: "1px solid #E0E8E3",
    borderRadius: 12,
    background: "#FAFCFB",
    color: "#26352D",
    cursor: "pointer",
  },

  dayButtonActive: {
    borderColor: "#0B7A43",
    background:
      "linear-gradient(145deg,#0B6A3B,#0E8A4C)",
    boxShadow:
      "0 9px 18px rgba(11,122,67,.18)",
  },

  dayName: {
    color: "#79867F",
    fontSize: 7,
    fontWeight: 900,
  },

  dayNumber: {
    fontSize: 21,
    lineHeight: 1.05,
  },

  dayMonth: {
    color: "#89958E",
    fontSize: 7,
    fontWeight: 850,
  },

  dayTextActive: {
    color: "#fff",
  },

  dateFieldWrap: {
    marginTop: 12,
  },

  label: {
    display: "block",
    marginBottom: 6,
    color: "#4F6057",
    fontSize: 9,
    fontWeight: 850,
  },

  input: {
    width: "100%",
    minHeight: 40,
    boxSizing: "border-box",
    padding: "9px 11px",
    border: "1px solid #D8E2DC",
    borderRadius: 10,
    background: "#fff",
    color: "#1A2B22",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 12,
  },

  counter: {
    minWidth: 31,
    height: 31,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#EAF7F0",
    color: "#0B7A43",
    fontSize: 10,
    fontWeight: 950,
  },

  classList: {
    display: "grid",
    gap: 9,
  },

  classCard: {
    padding: 13,
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: 12,
    alignItems: "center",
    border: "1px solid #E0E8E3",
    borderRadius: 15,
    background: "#FBFCFB",
  },

  classCardSelected: {
    borderColor: "#80C99F",
    background: "#F3FBF6",
    boxShadow:
      "0 0 0 2px rgba(11,122,67,.06)",
  },

  classMain: {
    minWidth: 0,
  },

  classTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 9,
    alignItems: "flex-start",
  },

  classType: {
    display: "block",
    color: "#0B7A43",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: .8,
  },

  classTitle: {
    margin: "3px 0 0",
    fontSize: 17,
  },

  availabilityBadge: {
    flex: "0 0 auto",
    padding: "5px 7px",
    borderRadius: 999,
    background: "#EAF7F0",
    color: "#0B7A43",
    fontSize: 7,
    fontWeight: 950,
  },

  availabilityFull: {
    background: "#FFF0EE",
    color: "#B42318",
  },

  classDescription: {
    margin: "6px 0 0",
    color: "#748078",
    fontSize: 9,
    lineHeight: 1.45,
  },

  classDetails: {
    marginTop: 9,
    display: "flex",
    gap: 5,
    flexWrap: "wrap",
  },

  detailPill: {
    padding: "5px 7px",
    borderRadius: 8,
    background: "#EEF4F1",
    color: "#54665C",
    fontSize: 8,
    fontWeight: 750,
  },

  detailPillOpen: {
    padding: "5px 7px",
    borderRadius: 8,
    background: "#EAF7F0",
    color: "#0B7A43",
    fontSize: 8,
    fontWeight: 900,
  },

  detailPillMember: {
    padding: "5px 7px",
    borderRadius: 8,
    background: "#EEF1F8",
    color: "#334A68",
    fontSize: 8,
    fontWeight: 900,
  },

  detailPillPrice: {
    padding: "5px 7px",
    borderRadius: 8,
    background: "#FFF4D9",
    color: "#805C00",
    fontSize: 8,
    fontWeight: 900,
  },

  progressWrap: {
    marginTop: 9,
  },

  progressTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: 999,
    background: "#E4ECE7",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg,#0B7A43,#5ED393)",
  },

  progressText: {
    marginTop: 4,
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#86928B",
    fontSize: 7,
  },

  selectButton: {
    minWidth: 88,
    minHeight: 39,
    padding: "0 11px",
    border: 0,
    borderRadius: 10,
    background: "#0B7A43",
    color: "#fff",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  selectButtonSelected: {
    minWidth: 88,
    minHeight: 39,
    padding: "0 11px",
    border: "1px solid #0B7A43",
    borderRadius: 10,
    background: "#EAF7F0",
    color: "#0B7A43",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  selectButtonDisabled: {
    minWidth: 88,
    minHeight: 39,
    padding: "0 11px",
    border: "1px solid #E1E5E3",
    borderRadius: 10,
    background: "#F1F3F2",
    color: "#9BA49F",
    fontSize: 9,
    fontWeight: 850,
    cursor: "not-allowed",
  },

  empty: {
    minHeight: 180,
    padding: 20,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 7,
    border: "1px dashed #D3DED7",
    borderRadius: 14,
    background: "#FAFCFB",
    textAlign: "center",
  },

  emptyIcon: {
    width: 45,
    height: 45,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#EAF7F0",
    color: "#0B7A43",
    fontSize: 20,
  },

  emptyTitle: {
    fontSize: 14,
  },

  emptyText: {
    maxWidth: 350,
    color: "#7B8780",
    fontSize: 9,
    lineHeight: 1.45,
  },

  identityCard: {
    marginBottom: 12,
    display: "grid",
    gridTemplateColumns:
      "minmax(240px,.72fr) minmax(0,1.28fr)",
    gap: 12,
    scrollMarginTop: 16,
  },

  summaryBox: {
    padding: 18,
    borderRadius: 18,
    background:
      "linear-gradient(155deg,#071D14,#0B4B2C)",
    color: "#fff",
    boxShadow:
      "0 13px 30px rgba(8,50,29,.15)",
  },

  summaryEyebrow: {
    display: "block",
    color: "#71DCA0",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: 1.1,
  },

  summaryClass: {
    display: "block",
    marginTop: 8,
    fontSize: 23,
    lineHeight: 1.08,
  },

  summaryDate: {
    display: "block",
    marginTop: 16,
    color: "#D2E9DC",
    fontSize: 10,
    textTransform: "capitalize",
  },

  summaryTime: {
    display: "block",
    marginTop: 5,
    fontSize: 17,
    fontWeight: 850,
  },

  summaryInstructor: {
    display: "block",
    marginTop: 7,
    color: "#B9D7C7",
    fontSize: 9,
  },

  priceBox: {
    marginTop: 17,
    padding: 11,
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 11,
    background: "rgba(255,255,255,.07)",
    color: "#D7EADF",
    fontSize: 9,
  },

  form: {
    padding: 18,
    display: "grid",
    gap: 12,
    border: "1px solid #DDE7E1",
    borderRadius: 18,
    background: "#fff",
  },

  formTitle: {
    margin: "4px 0 0",
    fontSize: 19,
  },

  formText: {
    margin: "7px 0 0",
    color: "#718078",
    fontSize: 10,
    lineHeight: 1.5,
  },

  field: {
    display: "block",
  },

  inputLarge: {
    width: "100%",
    minHeight: 46,
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #D4DFD8",
    borderRadius: 11,
    background: "#FBFCFB",
    color: "#16271D",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 13,
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    resize: "vertical",
    border: "1px solid #D4DFD8",
    borderRadius: 11,
    background: "#FBFCFB",
    color: "#16271D",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 12,
  },

  optional: {
    color: "#87928C",
    fontWeight: 600,
  },

  errorBox: {
    padding: 11,
    display: "grid",
    gap: 3,
    border: "1px solid #F2B7B0",
    borderRadius: 10,
    background: "#FFF3F1",
    color: "#A62D24",
    fontSize: 9,
    lineHeight: 1.4,
  },

  successBox: {
    padding: 11,
    border: "1px solid #A8D9BA",
    borderRadius: 10,
    background: "#EFFAF3",
    color: "#17673E",
    fontSize: 9,
  },

  confirmButton: {
    width: "100%",
    minHeight: 48,
    border: 0,
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#0B7A43,#0E8D4E)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow:
      "0 10px 22px rgba(11,122,67,.18)",
  },

  confirmButtonDisabled: {
    opacity: .6,
    cursor: "not-allowed",
  },

  privacyText: {
    color: "#89958E",
    fontSize: 7.5,
    lineHeight: 1.45,
    textAlign: "center",
  },

  confirmationCard: {
    padding: "34px 20px",
    display: "grid",
    placeItems: "center",
    border: "1px solid #CFE5D8",
    borderRadius: 24,
    background:
      "linear-gradient(180deg,#FFFFFF,#F1FAF5)",
    textAlign: "center",
    boxShadow:
      "0 14px 34px rgba(13,72,42,.08)",
    scrollMarginTop: 20,
  },

  checkCircle: {
    width: 68,
    height: 68,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background:
      "linear-gradient(145deg,#0B7A43,#45C77F)",
    color: "#fff",
    fontSize: 30,
    fontWeight: 950,
    boxShadow:
      "0 12px 26px rgba(11,122,67,.22)",
  },

  confirmEyebrow: {
    marginTop: 16,
    color: "#0B7A43",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: 1.2,
  },

  confirmTitle: {
    margin: "7px 0 0",
    fontSize: "clamp(26px,6vw,36px)",
  },

  confirmText: {
    maxWidth: 520,
    margin: "9px auto 0",
    color: "#718078",
    fontSize: 11,
    lineHeight: 1.5,
  },

  ticket: {
    width: "min(560px,100%)",
    marginTop: 21,
    padding: 16,
    boxSizing: "border-box",
    border: "1px solid #D9E5DE",
    borderRadius: 16,
    background: "#fff",
    textAlign: "left",
  },

  ticketTop: {
    paddingBottom: 13,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
    borderBottom: "1px solid #E7EDE9",
  },

  ticketLabel: {
    display: "block",
    color: "#7B8780",
    fontSize: 7,
    fontWeight: 900,
  },

  ticketClass: {
    display: "block",
    marginTop: 4,
    fontSize: 18,
  },

  confirmedBadge: {
    padding: "6px 8px",
    borderRadius: 999,
    background: "#EAF7F0",
    color: "#0B7A43",
    fontSize: 7,
    fontWeight: 950,
  },

  ticketGrid: {
    marginTop: 13,
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 9,
  },

  ticketItem: {
    padding: 10,
    display: "grid",
    gap: 4,
    borderRadius: 10,
    background: "#F6F9F7",
    color: "#6F7D75",
    fontSize: 8,
  },

  paymentNotice: {
    width: "min(560px,100%)",
    marginTop: 12,
    boxSizing: "border-box",
    padding: 11,
    border: "1px solid #E9D18B",
    borderRadius: 11,
    background: "#FFF9E8",
    color: "#765A06",
    fontSize: 9,
    lineHeight: 1.45,
  },

  confirmActions: {
    width: "min(560px,100%)",
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 9,
  },

  doneButton: {
    minHeight: 45,
    padding: "0 15px",
    border: 0,
    borderRadius: 11,
    background: "#0B7A43",
    color: "#fff",
    fontSize: 10,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow:
      "0 10px 22px rgba(11,122,67,.16)",
  },

  newReservationButton: {
    minHeight: 45,
    marginTop: 0,
    padding: "0 15px",
    border: "1px solid #BCD8C8",
    borderRadius: 11,
    background: "#F3FAF6",
    color: "#0B7A43",
    fontSize: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  footer: {
    marginTop: 18,
    display: "grid",
    placeItems: "center",
    gap: 5,
    color: "#89958E",
    fontSize: 8,
  },

  footerLogo: {
    width: 94,
    height: 38,
    objectFit: "contain",
    opacity: .82,
  },

  loadingPage: {
    minHeight: "100vh",
    padding: 20,
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(180deg,#EFF7F2,#F8FAF9)",
    fontFamily:
      'Inter, system-ui, "Segoe UI", sans-serif',
  },

  loadingCard: {
    width: "min(390px,100%)",
    padding: 30,
    display: "grid",
    placeItems: "center",
    gap: 9,
    border: "1px solid #DCE7E0",
    borderRadius: 22,
    background: "#fff",
    textAlign: "center",
  },

  errorPortalCard: {
    width: "min(430px,100%)",
    padding: 30,
    display: "grid",
    placeItems: "center",
    gap: 8,
    border: "1px solid #DCE7E0",
    borderRadius: 22,
    background: "#fff",
    textAlign: "center",
  },

  loadingLogo: {
    width: 135,
    height: 58,
    objectFit: "contain",
  },

  spinner: {
    width: 34,
    height: 34,
    marginTop: 8,
    border: "3px solid #DCE9E1",
    borderTopColor: "#0B7A43",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  spinnerSmall: {
    width: 27,
    height: 27,
    border: "3px solid #DCE9E1",
    borderTopColor: "#0B7A43",
    borderRadius: "50%",
  },

  loadingTitle: {
    marginTop: 5,
    fontSize: 16,
  },

  loadingText: {
    color: "#7C8881",
    fontSize: 9,
  },

  errorIcon: {
    width: 52,
    height: 52,
    marginTop: 6,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#FFF0EE",
    color: "#B42318",
    fontSize: 22,
    fontWeight: 950,
  },

  errorPortalTitle: {
    margin: "8px 0 0",
    fontSize: 23,
  },

  errorPortalText: {
    margin: "2px 0 0",
    color: "#78867E",
    fontSize: 10,
    lineHeight: 1.5,
  },

  powered: {
    marginTop: 10,
    color: "#0B7A43",
    fontSize: 8,
    fontWeight: 850,
  },
};
