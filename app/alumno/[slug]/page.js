"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabasePortalAlumno as supabase } from "../../../lib/supabasePortalAlumno";

const VERSION = "2026.08.22-PORTAL-OTP-8DIGITOS-V1";

export default function PortalAlumnoAccesoPage() {
  const params = useParams();
  const router = useRouter();

  const slug = String(params?.slug || "").trim();

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [portal, setPortal] = useState(null);
  const [paso, setPaso] = useState("correo");
  const [modoPassword, setModoPassword] = useState(false);

  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordNueva2, setPasswordNueva2] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    inicializar();
  }, [slug]);

  useEffect(() => {
    if (segundos <= 0) return;

    const timer = window.setInterval(() => {
      setSegundos((actual) =>
        actual > 0 ? actual - 1 : 0
      );
    }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [segundos]);

  async function inicializar() {
    if (!slug) {
      setError("El enlace del portal no es válido.");
      setCargando(false);
      return;
    }

    setCargando(true);
    setError("");

    try {
      const { data, error: errorPortal } =
        await supabase.rpc(
          "obtener_portal_alumno_publico",
          {
            p_slug: slug,
          }
        );

      if (errorPortal) throw errorPortal;

      if (!data?.ok || !data?.activo) {
        throw new Error(
          data?.mensaje ||
            "Este portal no está disponible."
        );
      }

      setPortal(data);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        try {
          const cuenta = await vincularCuenta();

          if (cuenta?.ok) {
            router.replace(
              `/alumno/${encodeURIComponent(
                slug
              )}/inicio`
            );
            return;
          }
        } catch {
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      setError(
        err?.message ||
          "No fue posible cargar el portal."
      );
    } finally {
      setCargando(false);
    }
  }

  async function vincularCuenta() {
    const { data, error: errorVinculo } =
      await supabase.rpc(
        "activar_mi_cuenta_alumno",
        {
          p_slug: slug,
        }
      );

    if (errorVinculo) throw errorVinculo;

    if (!data?.ok) {
      throw new Error(
        data?.mensaje ||
          "No se pudo activar tu cuenta."
      );
    }

    return data;
  }

  function limpiarAvisos() {
    setError("");
    setMensaje("");
  }

  function correoValido() {
    const valor =
      correo.trim().toLowerCase();

    return (
      valor.length >= 5 &&
      valor.includes("@")
    );
  }

  async function validarCorreoRegistrado() {
    const email =
      correo.trim().toLowerCase();

    const { data, error: errorValidar } =
      await supabase.rpc(
        "portal_alumno_correo_habilitado",
        {
          p_slug: slug,
          p_correo: email,
        }
      );

    if (errorValidar) throw errorValidar;

    return Boolean(
      data?.ok &&
        data?.habilitado
    );
  }

  async function enviarCodigo() {
    if (procesando) return;

    limpiarAvisos();

    if (!correoValido()) {
      setError(
        "Escribe un correo electrónico válido."
      );
      return;
    }

    setProcesando(true);

    try {
      const habilitado =
        await validarCorreoRegistrado();

      if (!habilitado) {
        throw new Error(
          "Este correo todavía no está registrado en el centro. Solicita a recepción que revise tu ficha."
        );
      }

      const email =
        correo.trim().toLowerCase();

      const { error: errorOtp } =
        await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            data: {
              konax_tipo_cuenta:
                "alumno",
              portal_slug: slug,
            },
          },
        });

      if (errorOtp) throw errorOtp;

      setPaso("codigo");
      setCodigo("");
      setSegundos(30);

      setMensaje(
        `Enviamos un código de acceso a ${email}.`
      );
    } catch (err) {
      setError(
        err?.message ||
          "No se pudo enviar el código."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function verificarCodigo(e) {
    e?.preventDefault();

    if (procesando) return;

    limpiarAvisos();

    const token =
      codigo.replace(/\D/g, "");

    if (token.length !== 8) {
      setError(
        "Escribe los 8 números del código."
      );
      return;
    }

    setProcesando(true);

    try {
      const email =
        correo.trim().toLowerCase();

      const {
        data,
        error: errorOtp,
      } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (errorOtp) throw errorOtp;

      if (!data?.session?.user?.id) {
        throw new Error(
          "No se pudo iniciar la sesión."
        );
      }

      await vincularCuenta();

      const passwordConfigurado =
        Boolean(
          data.user?.user_metadata
            ?.konax_password_configurado
        );

      if (!passwordConfigurado) {
        setPaso("crear-password");
        setPasswordNueva("");
        setPasswordNueva2("");
        return;
      }

      router.replace(
        `/alumno/${encodeURIComponent(
          slug
        )}/inicio`
      );
    } catch (err) {
      setError(
        err?.message ||
          "El código no es válido o ya venció."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function iniciarConPassword(e) {
    e?.preventDefault();

    if (procesando) return;

    limpiarAvisos();

    if (!correoValido()) {
      setError(
        "Escribe un correo electrónico válido."
      );
      return;
    }

    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }

    setProcesando(true);

    try {
      const habilitado =
        await validarCorreoRegistrado();

      if (!habilitado) {
        throw new Error(
          "Este correo todavía no está registrado en el centro."
        );
      }

      const { error: errorLogin } =
        await supabase.auth.signInWithPassword({
          email:
            correo.trim().toLowerCase(),
          password,
        });

      if (errorLogin) throw errorLogin;

      await vincularCuenta();

      router.replace(
        `/alumno/${encodeURIComponent(
          slug
        )}/inicio`
      );
    } catch (err) {
      setError(
        err?.message ||
          "Correo o contraseña incorrectos."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function guardarPassword(e) {
    e?.preventDefault();

    if (procesando) return;

    limpiarAvisos();

    if (passwordNueva.length < 8) {
      setError(
        "La contraseña debe tener mínimo 8 caracteres."
      );
      return;
    }

    if (
      passwordNueva !==
      passwordNueva2
    ) {
      setError(
        "Las contraseñas no coinciden."
      );
      return;
    }

    setProcesando(true);

    try {
      const { error: errorUpdate } =
        await supabase.auth.updateUser({
          password: passwordNueva,
          data: {
            konax_password_configurado:
              true,
          },
        });

      if (errorUpdate) throw errorUpdate;

      router.replace(
        `/alumno/${encodeURIComponent(
          slug
        )}/inicio`
      );
    } catch (err) {
      setError(
        err?.message ||
          "No se pudo guardar la contraseña."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function reenviarCodigo() {
    if (
      procesando ||
      segundos > 0
    ) {
      return;
    }

    await enviarCodigo();
  }

  function volverCorreo() {
    limpiarAvisos();
    setPaso("correo");
    setModoPassword(false);
    setCodigo("");
    setPassword("");
  }

  const titulo =
    portal?.titulo ||
    portal?.empresa_nombre ||
    "Portal del alumno";

  const inicial =
    useMemo(
      () =>
        String(titulo || "K")
          .trim()
          .charAt(0)
          .toUpperCase(),
      [titulo]
    );

  if (cargando) {
    return (
      <main style={s.loading}>
        <div style={s.loadingMark}>
          K
        </div>
        <strong>
          Cargando acceso...
        </strong>
      </main>
    );
  }

  if (!portal?.ok) {
    return (
      <main style={s.loading}>
        <section style={s.card}>
          <strong>
            Portal no disponible
          </strong>
          <span style={s.muted}>
            {error ||
              "Revisa el enlace."}
          </span>
        </section>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <section style={s.card}>
        <div style={s.logoWrap}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.logo}
          />
        </div>

        <div style={s.businessRow}>
          <div style={s.businessAvatar}>
            {inicial}
          </div>

          <div>
            <span style={s.portalLabel}>
              PORTAL DEL ALUMNO
            </span>

            <strong style={s.businessName}>
              {titulo}
            </strong>
          </div>
        </div>

        {paso === "correo" &&
          !modoPassword && (
            <>
              <div style={s.heading}>
                <h1 style={s.title}>
                  Iniciar sesión
                </h1>

                <p style={s.text}>
                  Introduce tu correo y
                  te enviaremos un código
                  de acceso.
                </p>
              </div>

              {error && (
                <Aviso
                  tipo="error"
                  texto={error}
                />
              )}

              {mensaje && (
                <Aviso
                  tipo="ok"
                  texto={mensaje}
                />
              )}

              <Campo label="Correo electrónico">
                <input
                  autoFocus
                  type="email"
                  autoComplete="email"
                  value={correo}
                  onChange={(e) =>
                    setCorreo(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter"
                    ) {
                      enviarCodigo();
                    }
                  }}
                  placeholder="tu@correo.com"
                  style={s.input}
                />
              </Campo>

              <button
                type="button"
                onClick={enviarCodigo}
                disabled={procesando}
                style={s.primaryButton}
              >
                {procesando
                  ? "Enviando..."
                  : "Continuar"}
              </button>

              <div style={s.bottomLinks}>
                <button
                  type="button"
                  onClick={() => {
                    limpiarAvisos();
                    setModoPassword(
                      true
                    );
                  }}
                  style={s.linkButton}
                >
                  Usar contraseña
                </button>
              </div>
            </>
          )}

        {paso === "correo" &&
          modoPassword && (
            <form
              onSubmit={
                iniciarConPassword
              }
            >
              <div style={s.heading}>
                <h1 style={s.title}>
                  Entrar con contraseña
                </h1>

                <p style={s.text}>
                  Usa tu correo y tu
                  contraseña personal.
                </p>
              </div>

              {error && (
                <Aviso
                  tipo="error"
                  texto={error}
                />
              )}

              <Campo label="Correo electrónico">
                <input
                  type="email"
                  autoComplete="email"
                  value={correo}
                  onChange={(e) =>
                    setCorreo(
                      e.target.value
                    )
                  }
                  placeholder="tu@correo.com"
                  style={s.input}
                />
              </Campo>

              <Campo label="Contraseña">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="Tu contraseña"
                  style={s.input}
                />
              </Campo>

              <button
                type="submit"
                disabled={procesando}
                style={s.primaryButton}
              >
                {procesando
                  ? "Ingresando..."
                  : "Iniciar sesión"}
              </button>

              <div style={s.bottomLinks}>
                <button
                  type="button"
                  onClick={() => {
                    limpiarAvisos();
                    setModoPassword(
                      false
                    );
                    setPassword("");
                  }}
                  style={s.linkButton}
                >
                  Recibir código
                </button>
              </div>
            </form>
          )}

        {paso === "codigo" && (
          <form
            onSubmit={
              verificarCodigo
            }
          >
            <div style={s.heading}>
              <h1 style={s.title}>
                Revisa tu correo
              </h1>

              <p style={s.text}>
                Escribe el código de
                8 números enviado a{" "}
                <strong>
                  {correo
                    .trim()
                    .toLowerCase()}
                </strong>
                .
              </p>
            </div>

            {error && (
              <Aviso
                tipo="error"
                texto={error}
              />
            )}

            {mensaje && (
              <Aviso
                tipo="ok"
                texto={mensaje}
              />
            )}

            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codigo}
              onChange={(e) =>
                setCodigo(
                  e.target.value
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(0, 8)
                )
              }
              placeholder="00000000"
              style={s.otpInput}
            />

            <button
              type="submit"
              disabled={procesando}
              style={s.primaryButton}
            >
              {procesando
                ? "Validando..."
                : "Iniciar sesión"}
            </button>

            <div style={s.bottomLinks}>
              <button
                type="button"
                disabled={
                  segundos > 0 ||
                  procesando
                }
                onClick={
                  reenviarCodigo
                }
                style={{
                  ...s.linkButton,
                  opacity:
                    segundos > 0
                      ? 0.5
                      : 1,
                }}
              >
                {segundos > 0
                  ? `Reenviar (${segundos}s)`
                  : "Reenviar código"}
              </button>

              <span style={s.dot}>
                ·
              </span>

              <button
                type="button"
                onClick={() => {
                  setPaso("correo");
                  setModoPassword(
                    true
                  );
                  limpiarAvisos();
                }}
                style={s.linkButton}
              >
                Usar contraseña
              </button>
            </div>

            <button
              type="button"
              onClick={volverCorreo}
              style={s.backButton}
            >
              ← Volver
            </button>
          </form>
        )}

        {paso ===
          "crear-password" && (
          <form
            onSubmit={
              guardarPassword
            }
          >
            <div style={s.heading}>
              <span style={s.successIcon}>
                ✓
              </span>

              <h1 style={s.title}>
                Crea tu contraseña
              </h1>

              <p style={s.text}>
                Tu correo ya fue
                verificado. Ahora crea
                la contraseña que usarás
                en KONAX.
              </p>
            </div>

            {error && (
              <Aviso
                tipo="error"
                texto={error}
              />
            )}

            <Campo label="Nueva contraseña">
              <input
                type="password"
                autoComplete="new-password"
                value={
                  passwordNueva
                }
                onChange={(e) =>
                  setPasswordNueva(
                    e.target.value
                  )
                }
                placeholder="Mínimo 8 caracteres"
                style={s.input}
              />
            </Campo>

            <Campo label="Confirmar contraseña">
              <input
                type="password"
                autoComplete="new-password"
                value={
                  passwordNueva2
                }
                onChange={(e) =>
                  setPasswordNueva2(
                    e.target.value
                  )
                }
                placeholder="Repite la contraseña"
                style={s.input}
              />
            </Campo>

            <button
              type="submit"
              disabled={procesando}
              style={s.primaryButton}
            >
              {procesando
                ? "Guardando..."
                : "Guardar y entrar"}
            </button>
          </form>
        )}

        <div style={s.footer}>
          Acceso seguro · KONAX
        </div>

        <div style={s.version}>
          {VERSION}
        </div>
      </section>
    </main>
  );
}

function Campo({
  label,
  children,
}) {
  return (
    <label style={s.field}>
      <span style={s.label}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Aviso({
  tipo,
  texto,
}) {
  const esError =
    tipo === "error";

  return (
    <div
      style={{
        ...s.notice,
        ...(esError
          ? s.noticeError
          : s.noticeOk),
      }}
    >
      {texto}
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    padding: "22px 14px",
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(180deg,#F5F8F6 0%,#EDF3EF 100%)",
    color: "#17211C",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  loading: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 10,
    background: "#F2F6F3",
    color: "#173C2A",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, sans-serif',
  },

  loadingMark: {
    width: 46,
    height: 46,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#173C2A",
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 950,
  },

  card: {
    width: "min(430px,100%)",
    padding: "24px 24px 18px",
    boxSizing: "border-box",
    border:
      "1px solid #DCE5DF",
    borderRadius: 20,
    background: "#FFFFFF",
    boxShadow:
      "0 18px 48px rgba(15,23,42,.09)",
  },

  logoWrap: {
    width: 112,
    height: 52,
    margin: "0 auto 18px",
    display: "grid",
    placeItems: "center",
  },

  logo: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
  },

  businessRow: {
    marginBottom: 22,
    padding: "10px 11px",
    display: "grid",
    gridTemplateColumns:
      "36px minmax(0,1fr)",
    alignItems: "center",
    gap: 9,
    borderRadius: 12,
    background: "#F5F8F6",
  },

  businessAvatar: {
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#173C2A",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 950,
  },

  portalLabel: {
    display: "block",
    color: "#16834F",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: .9,
  },

  businessName: {
    display: "block",
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#243229",
    fontSize: 10.5,
  },

  heading: {
    marginBottom: 18,
    textAlign: "center",
  },

  title: {
    margin: 0,
    color: "#17211C",
    fontSize: 27,
    lineHeight: 1.08,
    letterSpacing: -.45,
  },

  text: {
    margin: "8px auto 0",
    maxWidth: 330,
    color: "#6D7972",
    fontSize: 11,
    lineHeight: 1.5,
  },

  field: {
    display: "grid",
    gap: 6,
    marginBottom: 12,
  },

  label: {
    color: "#35443B",
    fontSize: 9.5,
    fontWeight: 850,
  },

  input: {
    width: "100%",
    minHeight: 48,
    padding: "10px 12px",
    boxSizing: "border-box",
    border:
      "1px solid #CDD8D1",
    borderRadius: 11,
    background: "#FFFFFF",
    color: "#17211C",
    fontSize: 14,
    outline: "none",
  },

  otpInput: {
    width: "100%",
    minHeight: 62,
    margin: "4px 0 14px",
    padding: "8px 14px",
    boxSizing: "border-box",
    border:
      "1px solid #C9D6CE",
    borderRadius: 13,
    background: "#FFFFFF",
    color: "#17211C",
    textAlign: "center",
    fontSize: 29,
    fontWeight: 850,
    letterSpacing: 10,
    outline: "none",
  },

  primaryButton: {
    width: "100%",
    minHeight: 48,
    border: 0,
    borderRadius: 11,
    background:
      "linear-gradient(135deg,#16834F,#0E6A3D)",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 8px 18px rgba(22,131,79,.16)",
  },

  bottomLinks: {
    minHeight: 38,
    marginTop: 11,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },

  linkButton: {
    padding: "5px 2px",
    border: 0,
    background: "transparent",
    color: "#16704A",
    fontSize: 9.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  dot: {
    color: "#A4ADA7",
  },

  backButton: {
    width: "100%",
    minHeight: 34,
    marginTop: 3,
    border: 0,
    background: "transparent",
    color: "#77837C",
    fontSize: 9.5,
    fontWeight: 800,
    cursor: "pointer",
  },

  notice: {
    marginBottom: 12,
    padding: "9px 10px",
    borderRadius: 9,
    fontSize: 9,
    lineHeight: 1.45,
  },

  noticeError: {
    border:
      "1px solid #F0CACA",
    background: "#FFF5F5",
    color: "#963434",
  },

  noticeOk: {
    border:
      "1px solid #C2E0CD",
    background: "#F1FAF4",
    color: "#17663D",
  },

  successIcon: {
    width: 38,
    height: 38,
    margin: "0 auto 10px",
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    background: "#E8F7EE",
    color: "#16834F",
    fontSize: 18,
    fontWeight: 950,
  },

  footer: {
    marginTop: 18,
    paddingTop: 13,
    borderTop:
      "1px solid #EDF1EE",
    color: "#9AA39E",
    fontSize: 8,
    textAlign: "center",
  },

  version: {
    marginTop: 5,
    color: "#C1C7C3",
    fontSize: 6.5,
    textAlign: "center",
  },

  muted: {
    color: "#738078",
    fontSize: 10,
  },
};
