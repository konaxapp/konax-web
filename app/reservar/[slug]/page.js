"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const VERSION = "2026.08.13-PORTAL-AUTOSERVICIO-CITAS";

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

function sumarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return fechaISO(d);
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
    error?.message || error?.details || error?.hint || error || "Error inesperado"
  )
    .replace("P0001:", "")
    .replace("Error:", "")
    .trim();
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
      setError(mensajeError(rpcError) || data?.mensaje || "No se pudo cargar la cita.");
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
        });
      }
    });
    return Array.from(mapa.values());
  }, [horarios]);

  const horariosVisibles = useMemo(() => {
    if (servicioFiltro === "todos") return horarios;
    return horarios.filter(
      (item) => String(item.servicio_id) === String(servicioFiltro)
    );
  }, [horarios, servicioFiltro]);

  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const iso = sumarDias(fechaISO(), i);
      const d = new Date(`${iso}T12:00:00`);
      return {
        iso,
        dia: new Intl.DateTimeFormat("es-PA", { weekday: "short" })
          .format(d)
          .replace(".", "")
          .toUpperCase(),
        numero: d.getDate(),
      };
    });
  }, []);

  async function confirmarReserva(e) {
    e.preventDefault();

    if (!horarioSeleccionado) {
      setError("Selecciona un servicio y un horario disponible.");
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
        p_nombre: nombre.trim(),
        p_telefono: telefono.trim(),
        p_observaciones: observaciones.trim() || null,
      }
    );

    if (rpcError || !data?.ok) {
      setError(mensajeError(rpcError) || data?.mensaje || "No se pudo reservar.");
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
      setError("Escribe el teléfono utilizado en la cita para confirmar la cancelación.");
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
      setError(mensajeError(rpcError) || data?.mensaje || "No se pudo cancelar la cita.");
      setCancelando(false);
      return;
    }

    await Promise.all([
      cargarMiCita(tokenUrl),
      cargarDisponibilidad(miCita.fecha || fecha),
    ]);

    setCancelando(false);
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
            <span style={s.eyebrow}>KONAX · AUTOSERVICIO DE CITAS</span>
            <h1 style={s.title}>{portal.titulo_publico || portal.empresa_nombre}</h1>
            <p style={s.subtitle}>
              {perfilBelleza
                ? "Consulta servicios y horarios disponibles, reserva tu cita y gestiona cambios o cancelaciones desde aquí."
                : "Consulta disponibilidad, reserva tu espacio y gestiona tu reserva desde aquí."}
            </p>
          </div>
          <img src="/konax-logo.png" alt="KONAX" style={s.logo} />
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
                value={`${formatoHora(miCita.hora_inicio)} – ${formatoHora(miCita.hora_fin)}`}
              />
              <Dato
                label={perfilBelleza ? "Profesional" : "Instructor"}
                value={miCita.profesional || "Por confirmar"}
              />
              <Dato label="Estado" value={String(miCita.estado || "").toUpperCase()} />
            </div>

            {miCita.estado === "cancelada" ? (
              <div style={s.cancelledBox}>
                Esta cita está cancelada. El horario quedó disponible nuevamente.
              </div>
            ) : miCita.puede_cancelar ? (
              <div style={s.cancelBox}>
                <label style={s.field}>
                  <span>Teléfono de la cita</span>
                  <input
                    value={telefonoGestion}
                    onChange={(e) => setTelefonoGestion(e.target.value)}
                    placeholder="Ej. 6000-0000"
                    style={s.input}
                  />
                </label>
                <label style={s.field}>
                  <span>Motivo de cancelación (opcional)</span>
                  <input
                    value={motivoCancelacion}
                    onChange={(e) => setMotivoCancelacion(e.target.value)}
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
                  {cancelando ? "Cancelando..." : "Cancelar mi cita"}
                </button>
                <small style={s.helpText}>
                  Puedes cancelar incluso el mismo día, siempre que la hora de la cita todavía no haya pasado.
                </small>
              </div>
            ) : (
              <div style={s.infoBox}>Esta cita ya no puede cancelarse desde autoservicio.</div>
            )}
          </section>
        )}

        <section style={s.card}>
          <span style={s.eyebrowDark}>1 · FECHA</span>
          <h2 style={s.sectionTitle}>Selecciona el día</h2>
          <div style={s.days}>
            {dias.map((dia) => (
              <button
                key={dia.iso}
                type="button"
                onClick={() => setFecha(dia.iso)}
                style={{
                  ...s.day,
                  ...(fecha === dia.iso ? s.dayActive : {}),
                }}
              >
                <span>{dia.dia}</span>
                <strong>{dia.numero}</strong>
              </button>
            ))}
          </div>
          <label style={s.field}>
            <span>Otra fecha</span>
            <input
              type="date"
              min={fechaISO()}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={s.input}
            />
          </label>
        </section>

        <section style={s.card}>
          <span style={s.eyebrowDark}>2 · SERVICIO</span>
          <h2 style={s.sectionTitle}>
            {perfilBelleza ? "Servicios disponibles" : "Servicios y clases disponibles"}
          </h2>

          <div style={s.serviceChips}>
            <button
              type="button"
              onClick={() => setServicioFiltro("todos")}
              style={{
                ...s.chip,
                ...(servicioFiltro === "todos" ? s.chipActive : {}),
              }}
            >
              Todos
            </button>
            {servicios.map((servicio) => (
              <button
                key={servicio.id}
                type="button"
                onClick={() => setServicioFiltro(servicio.id)}
                style={{
                  ...s.chip,
                  ...(servicioFiltro === servicio.id ? s.chipActive : {}),
                }}
              >
                {servicio.nombre}
              </button>
            ))}
          </div>

          {cargandoHorarios ? (
            <div style={s.empty}>Consultando horarios...</div>
          ) : horariosVisibles.length === 0 ? (
            <div style={s.empty}>No hay horarios disponibles para esta fecha.</div>
          ) : (
            <div style={s.slots}>
              {horariosVisibles.map((item) => {
                const disponible = Number(item.disponibles || 0) > 0;
                const seleccionado =
                  horarioSeleccionado?.horario_id === item.horario_id;

                return (
                  <article key={item.horario_id} style={s.slotCard}>
                    <div>
                      <strong style={s.slotTitle}>{item.servicio_nombre}</strong>
                      <span style={s.slotMeta}>
                        {formatoHora(item.hora_inicio)} – {formatoHora(item.hora_fin)}
                      </span>
                      <span style={s.slotMeta}>
                        {perfilBelleza ? "Profesional" : "Instructor"}: {item.instructor || "Por confirmar"}
                      </span>
                      {item.descripcion && (
                        <p style={s.description}>{item.descripcion}</p>
                      )}
                      {item.requiere_pago && (
                        <strong style={s.price}>{dinero(item.precio)}</strong>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!disponible}
                      onClick={() => setHorarioSeleccionado(item)}
                      style={{
                        ...s.slotButton,
                        ...(!disponible ? s.slotButtonDisabled : {}),
                        ...(seleccionado ? s.slotButtonSelected : {}),
                      }}
                    >
                      {!disponible
                        ? perfilBelleza
                          ? "Ocupado"
                          : "Sin cupos"
                        : seleccionado
                        ? "Seleccionado ✓"
                        : perfilBelleza
                        ? "Elegir horario"
                        : "Reservar"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {horarioSeleccionado && !reservaConfirmada && (
          <section style={s.card}>
            <span style={s.eyebrowDark}>3 · TUS DATOS</span>
            <h2 style={s.sectionTitle}>Confirmar cita</h2>

            <div style={s.selectionBox}>
              <strong>{horarioSeleccionado.servicio_nombre}</strong>
              <span>{formatoFecha(fecha)}</span>
              <span>
                {formatoHora(horarioSeleccionado.hora_inicio)} – {formatoHora(horarioSeleccionado.hora_fin)}
              </span>
            </div>

            <form onSubmit={confirmarReserva} style={s.form}>
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
                  onChange={(e) => setTelefono(e.target.value)}
                  style={s.input}
                  placeholder="6000-0000"
                />
              </label>

              <label style={s.field}>
                <span>Observaciones (opcional)</span>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  style={s.textarea}
                  placeholder="Alguna indicación para el negocio"
                />
              </label>

              <button disabled={guardando} style={s.primaryButton}>
                {guardando ? "Confirmando..." : "Confirmar mi cita"}
              </button>
            </form>
          </section>
        )}

        {reservaConfirmada && (
          <section id="confirmacion-cita" style={s.confirmCard}>
            <div style={s.check}>✓</div>
            <span style={s.eyebrowDark}>CONFIRMACIÓN INMEDIATA</span>
            <h2 style={s.sectionTitle}>Tu cita quedó registrada</h2>
            <p style={s.confirmText}>
              {reservaConfirmada.servicio} · {formatoFecha(reservaConfirmada.fecha)} · {formatoHora(reservaConfirmada.hora_inicio)}
            </p>

            {reservaConfirmada.requiere_pago && (
              <div style={s.infoBox}>
                Pago pendiente: {dinero(reservaConfirmada.monto)}
              </div>
            )}

            {tokenGestion && (
              <div style={s.manageLinkBox}>
                <strong>Guarda este enlace para gestionar o cancelar tu cita:</strong>
                <input readOnly value={enlaceGestion()} style={s.input} />
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
              La confirmación queda registrada al instante. El motor de notificaciones puede enviar además el mensaje automático y el recordatorio del día anterior.
            </small>
          </section>
        )}

        <footer style={s.footer}>
          <img src="/konax-logo.png" alt="KONAX" style={s.footerLogo} />
          <span>Reservas y citas por KONAX · {VERSION}</span>
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
  shell: { width: "min(920px,100%)", margin: "0 auto" },
  hero: {
    marginBottom: 14,
    padding: 22,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
    borderRadius: 24,
    background: "linear-gradient(135deg,#071B13,#0E7042)",
    color: "#FFF",
  },
  logo: { width: 115, height: 54, objectFit: "contain", background: "#FFF", borderRadius: 14, padding: 7 },
  eyebrow: { display: "block", color: "#74E1A5", fontSize: 10, fontWeight: 900, letterSpacing: 1.1 },
  eyebrowDark: { display: "block", color: "#0B7041", fontSize: 10, fontWeight: 900, letterSpacing: 1.1 },
  title: { margin: "6px 0", fontSize: "clamp(28px,6vw,46px)" },
  subtitle: { maxWidth: 620, margin: 0, color: "#D9E9E0", lineHeight: 1.5 },
  card: { marginBottom: 14, padding: 20, border: "1px solid #DCE6E0", borderRadius: 20, background: "#FFF" },
  manageCard: { marginBottom: 14, padding: 20, border: "2px solid #A7D7BA", borderRadius: 20, background: "#F0FAF4" },
  sectionTitle: { margin: "5px 0 14px", fontSize: "clamp(22px,5vw,30px)" },
  days: { display: "grid", gridTemplateColumns: "repeat(7,minmax(72px,1fr))", gap: 8, overflowX: "auto", marginBottom: 14 },
  day: { minHeight: 76, border: "1px solid #DDE5E0", borderRadius: 14, background: "#FFF", cursor: "pointer", display: "grid", placeItems: "center", gap: 2 },
  dayActive: { background: "#10251B", color: "#FFF", borderColor: "#10251B" },
  field: { display: "grid", gap: 6, fontWeight: 700 },
  input: { width: "100%", minHeight: 44, padding: "10px 12px", border: "1px solid #CEDBD3", borderRadius: 11, background: "#FFF", fontSize: 16 },
  textarea: { width: "100%", minHeight: 90, padding: 12, border: "1px solid #CEDBD3", borderRadius: 11, resize: "vertical", fontSize: 16 },
  serviceChips: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  chip: { padding: "9px 12px", border: "1px solid #D4E0D9", borderRadius: 999, background: "#FFF", cursor: "pointer", fontWeight: 800 },
  chipActive: { background: "#0D7042", color: "#FFF", borderColor: "#0D7042" },
  slots: { display: "grid", gap: 10 },
  slotCard: { padding: 14, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", border: "1px solid #E0E7E3", borderRadius: 15 },
  slotTitle: { display: "block", fontSize: 17 },
  slotMeta: { display: "block", marginTop: 4, color: "#66766D", fontSize: 13 },
  description: { margin: "7px 0 0", color: "#67766E", fontSize: 13 },
  price: { display: "block", marginTop: 7, color: "#0B7041" },
  slotButton: { minHeight: 40, padding: "0 14px", border: 0, borderRadius: 10, background: "#111827", color: "#FFF", fontWeight: 800, cursor: "pointer" },
  slotButtonSelected: { background: "#0D7042" },
  slotButtonDisabled: { background: "#D6DDD9", color: "#7B8780", cursor: "not-allowed" },
  empty: { padding: 26, textAlign: "center", color: "#6D7972" },
  selectionBox: { marginBottom: 14, padding: 14, display: "grid", gap: 4, borderRadius: 14, background: "#F2F7F4" },
  form: { display: "grid", gap: 12 },
  primaryButton: { minHeight: 48, border: 0, borderRadius: 12, background: "#0D7042", color: "#FFF", fontWeight: 900, cursor: "pointer" },
  secondaryButton: { minHeight: 43, border: "1px solid #AACCB8", borderRadius: 11, background: "#FFF", color: "#0B7041", fontWeight: 900, cursor: "pointer" },
  dangerButton: { minHeight: 43, border: 0, borderRadius: 11, background: "#B42318", color: "#FFF", fontWeight: 900, cursor: "pointer" },
  errorBox: { marginBottom: 14, padding: 13, border: "1px solid #F2B8B3", borderRadius: 12, background: "#FFF1EF", color: "#8A1C12" },
  errorCard: { display: "grid", gap: 8, padding: 20, borderRadius: 16, background: "#FFF" },
  confirmCard: { marginBottom: 14, padding: 24, border: "2px solid #9AD2B2", borderRadius: 22, background: "#F3FBF6", textAlign: "center" },
  check: { width: 58, height: 58, margin: "0 auto 12px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#0D7042", color: "#FFF", fontSize: 28, fontWeight: 900 },
  confirmText: { fontSize: 16, lineHeight: 1.5 },
  manageLinkBox: { marginTop: 16, display: "grid", gap: 9, textAlign: "left" },
  manageGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9 },
  dataBox: { padding: 11, display: "grid", gap: 4, border: "1px solid #DCE6E0", borderRadius: 12, background: "#FFF" },
  cancelBox: { marginTop: 14, display: "grid", gap: 10 },
  cancelledBox: { marginTop: 12, padding: 13, borderRadius: 12, background: "#FFEDEC", color: "#8A1C12", fontWeight: 800 },
  infoBox: { marginTop: 12, padding: 13, borderRadius: 12, background: "#EEF5F1", color: "#405147" },
  helpText: { display: "block", marginTop: 10, color: "#69776F", lineHeight: 1.5 },
  footer: { padding: "16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", color: "#68766E", fontSize: 12 },
  footerLogo: { width: 85, height: 32, objectFit: "contain" },
};
