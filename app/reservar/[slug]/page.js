"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const VERSION = "2026.08.17-PORTAL-MOVIL-FLUJO-V9-MI-CITA-PERSISTENTE";

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


function proximosDias(cantidad = 8) {
  const lista = [];
  const hoy = new Date();

  for (let i = 0; i < cantidad; i += 1) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    lista.push(fechaISO(d));
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

  const [tema, setTema] = useState("claro");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mostrarAvisoMiCita, setMostrarAvisoMiCita] = useState(false);

  const [paso, setPaso] = useState(1);

  const [fecha, setFecha] = useState(fechaISO());
  const [horarios, setHorarios] = useState([]);
  const [servicioFiltro, setServicioFiltro] = useState("todos");
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [profesionalSeleccionado, setProfesionalSeleccionado] =
    useState("sin-preferencia");
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
  const dias = useMemo(() => proximosDias(8), []);

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

  const profesionales = useMemo(() => {
    if (!servicioSeleccionado) return [];

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
          });
        }
      });

    return Array.from(mapa.values());
  }, [horarios, servicioSeleccionado]);

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
      const candidatos = proximosDias(14);
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

        if (resultados.length >= 8) break;
      }

      setFechasConDisponibilidad(resultados);

      if (
        resultados.length > 0 &&
        !resultados.includes(fecha)
      ) {
        setFecha(resultados[0]);
      }
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

  function elegirServicio(servicio) {
    setServicioSeleccionado(servicio);
    setServicioFiltro(servicio.id);
    setProfesionalSeleccionado("sin-preferencia");
    setHorarioSeleccionado(null);
    setError("");
    setPaso(2);
  }

  function elegirProfesional(valor) {
    setProfesionalSeleccionado(valor);
    setHorarioSeleccionado(null);
    setError("");
    setPaso(3);
  }

  function elegirFecha(valor) {
    setFecha(valor);
    setHorarioSeleccionado(null);
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
    setServicioSeleccionado(null);
    setServicioFiltro("todos");
    setProfesionalSeleccionado("sin-preferencia");
    setHorarioSeleccionado(null);
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

  if (cargando) {
    return (
      <main className="kp-loading">
        <img src="/konax-logo.png" alt="KONAX" />
        <strong>Preparando agenda...</strong>
      </main>
    );
  }

  if (!portal?.ok) {
    return (
      <main className="kp-loading">
        <div className="kp-error-card">
          <strong>Reservas no disponibles</strong>
          <span>{error}</span>
        </div>
      </main>
    );
  }

  const nombreNegocio =
    portal.titulo_publico || portal.empresa_nombre || "KONAX";

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
                ▣ Reservar
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  abrirMiCita();
                }}
              >
                ▤ Mi cita
              </button>
            </div>
          )}
        </header>

        {!tokenUrl && (
          <section className="kp-hero">
            <div>
              <span className="kp-eyebrow">
                KONAX · RESERVAS ONLINE
              </span>

              <h1>{nombreNegocio}</h1>

              <p>
                Reserva tu cita en minutos.
                <br />
                Rápido · Fácil · Sin llamadas.
              </p>
            </div>

            <img src="/konax-logo.png" alt="KONAX" />
          </section>
        )}

        {error && (
          <div className="kp-error">
            {error}
          </div>
        )}

        {tokenUrl && miCita ? (
          <section className="kp-manage">
            <span className="kp-eyebrow-dark">
              GESTIONAR MI CITA
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
                Esta cita está cancelada. El horario quedó
                disponible nuevamente.
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
                Esta cita ya no puede cancelarse desde autoservicio.
              </div>
            )}

            <button
              type="button"
              className="kp-secondary"
              onClick={reservarOtraCita}
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
          </section>
        ) : (
          <section
            id="flujo-reserva"
            className="kp-flow"
          >
            <div className="kp-business-window">
              <div className="kp-business-logo-box">
                <img
                  src="/konax-logo.png"
                  alt="KONAX"
                  className="kp-business-logo"
                />
              </div>

              <div className="kp-business-window-info">
                <strong>{nombreNegocio}</strong>
                <span>Reserva en línea</span>
              </div>
            </div>

            <Stepper paso={paso} />

            {paso === 1 && (
              <div>
                <span className="kp-eyebrow-dark">
                  PASO 1 DE 4
                </span>
                <h2>Servicios</h2>
                <p className="kp-muted">
                  Selecciona el servicio que deseas.
                </p>

                {cargandoHorarios ? (
                  <div className="kp-empty">
                    Consultando servicios...
                  </div>
                ) : servicios.length === 0 ? (
                  <div className="kp-empty">
                    <strong>No hay servicios disponibles hoy.</strong>
                    <span>
                      {buscandoFechas
                        ? " Buscando próximas fechas..."
                        : fechasConDisponibilidad.length > 0
                        ? ` Próxima fecha disponible: ${formatoFecha(
                            fechasConDisponibilidad[0]
                          )}.`
                        : " No hay fechas disponibles en los próximos días."}
                    </span>

                    {fechasConDisponibilidad.length > 0 && (
                      <button
                        type="button"
                        className="kp-empty-action"
                        onClick={async () => {
                          const proxima = fechasConDisponibilidad[0];
                          setFecha(proxima);
                          setError("");

                          const { data, error: rpcError } = await supabase.rpc(
                            "obtener_disponibilidad_agenda_publica",
                            {
                              p_slug: slug,
                              p_fecha: proxima,
                            }
                          );

                          if (rpcError) {
                            setError(mensajeError(rpcError));
                            return;
                          }

                          setHorarios(Array.isArray(data) ? data : []);
                        }}
                      >
                        Ver próxima fecha
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="kp-service-list">
                    {servicios.map((servicio) => (
                      <article
                        key={servicio.id}
                        className="kp-service"
                      >
                        <div className="kp-service-icon">✂</div>

                        <div className="kp-service-info">
                          <strong>{servicio.nombre}</strong>
                          <span>{servicio.duracion} min</span>

                          {servicio.descripcion && (
                            <small>{servicio.descripcion}</small>
                          )}

                          {servicio.requierePago && (
                            <b>
                              desde {dinero(servicio.precio)}
                            </b>
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
                )}
              </div>
            )}

            {paso === 2 && servicioSeleccionado && (
              <div>
                <button
                  type="button"
                  className="kp-blue-link"
                  onClick={() => setPaso(1)}
                >
                  ‹ Cambiar servicio
                </button>

                <span className="kp-eyebrow-dark">
                  PASO 2 DE 4
                </span>

                <h2>Seleccionar profesional</h2>

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
                      <strong>Sin preferencia</strong>
                      <small>Máxima disponibilidad</small>
                    </span>

                    <span className="kp-select">
                      Seleccionar
                    </span>
                  </button>

                  {profesionales.map((profesional) => (
                    <button
                      key={profesional.id}
                      type="button"
                      className="kp-prof"
                      onClick={() =>
                        elegirProfesional(profesional.id)
                      }
                    >
                      <span className="kp-avatar">
                        {inicialNombre(profesional.nombre)}
                      </span>

                      <span className="kp-prof-info">
                        <strong>{profesional.nombre}</strong>
                        <small>
                          {perfilBelleza
                            ? "Profesional"
                            : "Instructor"}
                        </small>
                      </span>

                      <span className="kp-select">
                        Seleccionar
                      </span>
                    </button>
                  ))}
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
                  ‹ Cambiar profesional
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
                    {(fechasConDisponibilidad.length > 0
                      ? fechasConDisponibilidad
                      : dias
                    ).map((dia) => {
                      const activo = dia === fecha;
                      const d = new Date(`${dia}T12:00:00`);

                      return (
                        <button
                          key={dia}
                          type="button"
                          className={`kp-date-pill ${
                            activo ? "active" : ""
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
                        </button>
                      );
                    })}
                  </div>
                </div>

                <h3 className="kp-time-title">Escoge una hora</h3>

                {cargandoHorarios ? (
                  <div className="kp-empty">
                    Consultando horarios...
                  </div>
                ) : slotsDisponibles.length === 0 ? (
                  <div className="kp-empty">
                    No hay horas disponibles para esta fecha.
                  </div>
                ) : (
                  <div className="kp-time-cards">
                    {slotsDisponibles.map((slot) => {
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
                )}

                {horarioSeleccionado && (
                  <button
                    type="button"
                    className="kp-continue kp-continue-fixed"
                    onClick={continuarFechaHora}
                  >
                    <span className="kp-continue-detail">
                      {servicioSeleccionado.requierePago
                        ? `${dinero(
                            servicioSeleccionado.precio
                          )} · ${servicioSeleccionado.duracion} min`
                        : `${servicioSeleccionado.duracion} min`}
                    </span>

                    <strong className="kp-continue-action">
                      Continuar <b>›</b>
                    </strong>
                  </button>
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

                  <h2>Resumen de tu reserva</h2>

                  <div className="kp-summary">
                    <ResumenFila
                      label="Negocio"
                      value={nombreNegocio}
                    />
                    <ResumenFila
                      label="Servicio"
                      value={servicioSeleccionado.nombre}
                    />
                    <ResumenFila
                      label="Profesional"
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
                    Completa tus datos para finalizar la reserva.
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
                        placeholder="6000-0000"
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
                        : "Reservar ahora →"}
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

                <h2>Tu cita quedó registrada</h2>

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

        {!tokenUrl && paso < 5 && paso !== 3 && paso !== 4 && (
          <button
            type="button"
            className="kp-reserve-now"
            onClick={() => {
              document
                .getElementById("flujo-reserva")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });

              if (paso === 3 && horarioSeleccionado) {
                continuarFechaHora();
              }
            }}
          >
            <span>ϟ</span>
            <strong>
              {paso === 3 && horarioSeleccionado
                ? "Continuar"
                : "Reservar ahora"}
            </strong>
            <span>→</span>
          </button>
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
            <small>Reservar</small>
          </button>

          <button
            type="button"
            onClick={abrirMiCita}
          >
            <span>▤</span>
            <small>Mi cita</small>
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
                MI CITA
              </span>

              <h3>Aún no tienes una cita guardada</h3>

              <p>
                Cuando completes una reserva en este teléfono,
                KONAX guardará el acceso para que puedas volver
                directamente desde “Mi cita”.
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

function Stepper({ paso }) {
  const pasos = [
    [1, "Servicio"],
    [2, "Profesional"],
    [3, "Fecha y hora"],
    [4, "Confirmación"],
  ];

  return (
    <div className="kp-stepper">
      {pasos.map(([numero, label]) => (
        <div key={numero}>
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
    font-family: Inter, system-ui, "Segoe UI", sans-serif;
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
    width: 104px;
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
    margin: -2px 0 16px;
    padding: 12px 14px;
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

  .kp-business-window-info {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .kp-business-window-info strong {
    color: #17211c;
    font-size: 16px;
    line-height: 1.2;
  }

  .kp-business-window-info span {
    color: #6f7c74;
    font-size: 12px;
  }

  .kp-stepper {
    margin-bottom: 22px;
    padding: 10px 6px;
    display: grid;
    grid-template-columns: repeat(4,minmax(0,1fr));
    gap: 4px;
    border-radius: 16px;
    background: #f7f9f8;
  }

  .kp-stepper > div {
    display: grid;
    justify-items: center;
    gap: 5px;
  }

  .kp-step-circle {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #e5eae7;
    color: #59645e;
    font-size: 12px;
    font-weight: 900;
  }

  .kp-step-circle.active {
    background: #0b7041;
    color: #fff;
  }

  .kp-step-circle.done {
    background: #dff3e7;
    color: #0b7041;
  }

  .kp-stepper small {
    color: #7d8882;
    font-size: 8px;
    font-weight: 800;
    text-align: center;
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
    padding: 13px;
    display: grid;
    grid-template-columns: 50px minmax(0,1fr) auto;
    gap: 11px;
    align-items: center;
    border: 1px solid #dee5e1;
    border-radius: 18px;
    background: #fff;
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
    width: 46px;
    height: 46px;
    color: #fff;
    background: linear-gradient(145deg,#0b7041,#128b53);
    font-size: 22px;
  }

  .kp-service-info {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .kp-service-info strong { font-size: 16px; }
  .kp-service-info span,
  .kp-service-info small {
    color: #748078;
    font-size: 11px;
  }

  .kp-service-info b {
    color: #111827;
    font-size: 13px;
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
    height: 104px;
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

  .kp-loading img {
    width: 115px;
  }


  .kp-dark {
    background: #0f1512;
    color: #f3f7f4;
  }

  .kp-dark .kp-topbar,
  .kp-dark .kp-flow,
  .kp-dark .kp-manage,
  .kp-dark .kp-service,
  .kp-dark .kp-prof,
  .kp-dark .kp-selected-service,
  .kp-dark .kp-prof-summary,
  .kp-dark .kp-days button,
  .kp-dark .kp-times button,
  .kp-dark .kp-summary,
  .kp-dark .kp-data,
  .kp-dark .kp-menu,
  .kp-dark .kp-bottom-nav {
    background: #17201b;
    color: #f3f7f4;
    border-color: #2b3931;
  }

  .kp-dark .kp-top-icons button,
  .kp-dark .kp-back {
    background: #212c26;
    color: #f3f7f4;
  }

  .kp-dark .kp-top-icons button.active {
    background: #153c29;
    border-color: #4aca7e;
    color: #75e5a5;
  }

  .kp-dark .kp-service-info strong,
  .kp-dark .kp-prof,
  .kp-dark .kp-summary-row strong,
  .kp-dark .kp-menu button {
    color: #f3f7f4;
  }


  .kp-dark .kp-business-window,
  .kp-dark .kp-business-logo-box,
  .kp-dark .kp-booking-business,
  .kp-dark .kp-date-pill,
  .kp-dark .kp-time-card {
    background: #17201b;
    color: #f3f7f4;
    border-color: #2b3931;
  }

  .kp-dark .kp-business-window-info strong,
  .kp-dark .kp-booking-business strong {
    color: #f3f7f4;
  }

  .kp-dark .kp-business-window-info span {
    color: #aab8b0;
  }

  .kp-dark .kp-booking-business small {
    color: #aab8b0;
  }

  .kp-dark .kp-date-pill.active,
  .kp-dark .kp-time-card.active {
    background: #153c29;
    color: #75e5a5;
    border-color: #4aca7e;
  }

  .kp-dark .kp-muted,
  .kp-dark .kp-service-info span,
  .kp-dark .kp-service-info small,
  .kp-dark .kp-prof-info small,
  .kp-dark .kp-summary-row,
  .kp-dark .kp-footer {
    color: #aab8b0;
  }

  .kp-dark .kp-form input,
  .kp-dark .kp-form textarea,
  .kp-dark .kp-cancel-box input {
    background: #111814;
    color: #ffffff;
    border-color: #34443a;
  }

  .kp-dark .kp-empty {
    background: #151d18;
    color: #aab8b0;
    border-color: #34443a;
  }

  .kp-dark .kp-menu button:hover {
    background: #223029;
  }

  .kp-dark .kp-modal {
    background: #17201b;
    color: #f3f7f4;
  }

  .kp-dark .kp-modal p {
    color: #aab8b0;
  }


  @media (max-width: 520px) {
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
      grid-template-columns: 46px minmax(0,1fr);
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
