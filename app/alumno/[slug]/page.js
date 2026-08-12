"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function PortalAlumnoAccesoPage() {
  const params = useParams();
  const router = useRouter();

  const slug = String(params?.slug || "").trim();

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [modo, setModo] = useState("login");

  const [portal, setPortal] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  useEffect(() => {
    inicializar();
  }, [slug]);

  async function inicializar() {
    if (!slug) {
      setError("El enlace del portal no es válido.");
      setCargando(false);
      return;
    }

    setCargando(true);
    setError("");

    try {
      const { data, error: errorPortal } = await supabase.rpc(
        "obtener_portal_alumno_publico",
        {
          p_slug: slug,
        }
      );

      if (errorPortal) throw errorPortal;

      if (!data?.ok || !data?.activo) {
        setError(
          data?.mensaje ||
            "Este portal no está disponible."
        );
        setCargando(false);
        return;
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
              `/alumno/${encodeURIComponent(slug)}/inicio`
            );
            return;
          }
        } catch (err) {
          const texto = String(err?.message || "");

          if (
            texto.toLowerCase().includes("personal") ||
            texto.toLowerCase().includes("administración")
          ) {
            setError(texto);
          }
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
    const { data, error: errorVinculo } = await supabase.rpc(
      "activar_mi_cuenta_alumno",
      {
        p_slug: slug,
      }
    );

    if (errorVinculo) throw errorVinculo;

    if (!data?.ok) {
      throw new Error(
        data?.mensaje ||
          "No se pudo activar la cuenta del alumno."
      );
    }

    return data;
  }

  function limpiarAvisos() {
    setError("");
    setMensaje("");
  }

  async function iniciarSesion(e) {
    e?.preventDefault();

    if (procesando) return;

    limpiarAvisos();

    const email = correo.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setError("Escribe un correo válido.");
      return;
    }

    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }

    setProcesando(true);

    try {
      const { error: errorLogin } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (errorLogin) throw errorLogin;

      const cuenta = await vincularCuenta();

      if (!cuenta?.ok) {
        throw new Error(
          "No se pudo vincular tu cuenta con este negocio."
        );
      }

      router.replace(
        `/alumno/${encodeURIComponent(slug)}/inicio`
      );
    } catch (err) {
      const texto =
        err?.message ||
        "No se pudo iniciar sesión.";

      if (
        String(texto)
          .toLowerCase()
          .includes("email not confirmed")
      ) {
        setError(
          "Confirma primero el correo que KONAX te envió y luego vuelve a iniciar sesión."
        );
      } else {
        setError(texto);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function crearCuenta(e) {
    e?.preventDefault();

    if (procesando) return;

    limpiarAvisos();

    const email = correo.trim().toLowerCase();
    const nombreLimpio = nombre.trim();
    const cedulaLimpia = cedula.trim();
    const telefonoLimpio = telefono.trim();

    if (!nombreLimpio) {
      setError("Escribe tu nombre.");
      return;
    }

    if (!cedulaLimpia) {
      setError("Escribe tu identificación.");
      return;
    }

    if (!telefonoLimpio) {
      setError("Escribe tu teléfono.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Escribe un correo válido.");
      return;
    }

    if (password.length < 8) {
      setError(
        "La contraseña debe tener mínimo 8 caracteres."
      );
      return;
    }

    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setProcesando(true);

    try {
      const redirectTo =
        `${window.location.origin}/alumno/` +
        `${encodeURIComponent(slug)}`;

      const { data, error: errorRegistro } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              konax_tipo_cuenta: "alumno",
              portal_slug: slug,
              nombre: nombreLimpio,
              cedula: cedulaLimpia,
              telefono: telefonoLimpio,
            },
          },
        });

      if (errorRegistro) throw errorRegistro;

      if (data?.session?.user?.id) {
        const cuenta = await vincularCuenta();

        if (cuenta?.ok) {
          router.replace(
            `/alumno/${encodeURIComponent(slug)}/inicio`
          );
          return;
        }
      }

      setMensaje(
        "Cuenta creada. Revisa tu correo y confirma el acceso. Después vuelve a esta pantalla e inicia sesión."
      );

      setModo("login");
      setPassword("");
      setPassword2("");
    } catch (err) {
      const texto = String(
        err?.message ||
          "No se pudo crear la cuenta."
      );

      if (
        texto.toLowerCase().includes("already") ||
        texto.toLowerCase().includes("registered")
      ) {
        setError(
          "Ese correo ya tiene una cuenta KONAX. Usa Iniciar sesión con el mismo correo."
        );
        setModo("login");
      } else {
        setError(texto);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function recuperarPassword() {
    if (procesando) return;

    limpiarAvisos();

    const email = correo.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setError(
        "Escribe primero tu correo y luego pulsa Recuperar contraseña."
      );
      return;
    }

    setProcesando(true);

    try {
      const redirectTo =
        `${window.location.origin}/alumno/` +
        `${encodeURIComponent(slug)}/restablecer`;

      const { error: errorReset } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo,
          }
        );

      if (errorReset) throw errorReset;

      setMensaje(
        "Te enviamos un enlace para crear una nueva contraseña. Revisa también correo no deseado."
      );
    } catch (err) {
      setError(
        err?.message ||
          "No se pudo enviar el enlace de recuperación."
      );
    } finally {
      setProcesando(false);
    }
  }

  async function cerrarSesionActual() {
    await supabase.auth.signOut();
    setError("");
    setMensaje(
      "La sesión anterior fue cerrada. Ya puedes entrar como alumno."
    );
  }

  const titulo =
    portal?.titulo ||
    portal?.empresa_nombre ||
    "Portal del alumno";

  const inicial = useMemo(() => {
    return String(titulo || "K")
      .trim()
      .charAt(0)
      .toUpperCase();
  }, [titulo]);

  if (cargando) {
    return (
      <main style={s.loading}>
        <div style={s.loadingMark}>K</div>
        <strong>Cargando tu acceso...</strong>
      </main>
    );
  }

  if (!portal?.ok) {
    return (
      <main style={s.loading}>
        <div style={s.errorCard}>
          <strong>Portal no disponible</strong>
          <span>{error || "Revisa el enlace."}</span>
        </div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <style>{`
        @media (max-width: 760px) {
          .portal-alumno-shell {
            grid-template-columns: 1fr !important;
          }

          .portal-alumno-brand {
            min-height: 250px !important;
            padding: 20px !important;
          }

          .portal-alumno-access {
            padding: 20px !important;
          }

          .portal-alumno-two {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section style={s.shell} className="portal-alumno-shell">
        <div style={s.brandPanel} className="portal-alumno-brand">
          <div style={s.brandTop}>
            <div style={s.brandLogo}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={s.logo}
              />
            </div>

            <span style={s.brandBadge}>
              PORTAL DEL ALUMNO
            </span>
          </div>

          <div style={s.brandMiddle}>
            <div style={s.businessAvatar}>
              {inicial}
            </div>

            <span style={s.businessLabel}>
              TU CENTRO
            </span>

            <h1 style={s.businessTitle}>
              {titulo}
            </h1>

            <p style={s.businessText}>
              Tu acceso personal para consultar y gestionar
              tu experiencia con el negocio.
            </p>
          </div>

          <div style={s.brandBottom}>
            <span>Acceso protegido por KONAX</span>
          </div>
        </div>

        <div style={s.accessPanel} className="portal-alumno-access">
          <div style={s.tabs}>
            <button
              type="button"
              onClick={() => {
                limpiarAvisos();
                setModo("login");
              }}
              style={{
                ...s.tab,
                ...(modo === "login"
                  ? s.tabActive
                  : {}),
              }}
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              onClick={() => {
                limpiarAvisos();
                setModo("registro");
              }}
              style={{
                ...s.tab,
                ...(modo === "registro"
                  ? s.tabActive
                  : {}),
              }}
            >
              Crear cuenta
            </button>
          </div>

          <div style={s.formHeader}>
            <span style={s.eyebrow}>
              {modo === "login"
                ? "BIENVENIDO"
                : "NUEVO ALUMNO"}
            </span>

            <h2 style={s.formTitle}>
              {modo === "login"
                ? "Entra a tu cuenta"
                : "Crea tu acceso personal"}
            </h2>

            <p style={s.formText}>
              {modo === "login"
                ? "Usa el correo y la contraseña que registraste."
                : "Tus datos quedarán vinculados con la ficha del negocio."}
            </p>
          </div>

          {error && (
            <div style={s.errorBox}>
              <span>{error}</span>

              {error
                .toLowerCase()
                .includes("personal") && (
                <button
                  type="button"
                  onClick={cerrarSesionActual}
                  style={s.inlineButton}
                >
                  Cerrar sesión anterior
                </button>
              )}
            </div>
          )}

          {mensaje && (
            <div style={s.successBox}>
              {mensaje}
            </div>
          )}

          {modo === "login" ? (
            <form
              onSubmit={iniciarSesion}
              style={s.form}
            >
              <Campo label="Correo electrónico">
                <input
                  type="email"
                  autoComplete="email"
                  value={correo}
                  onChange={(e) =>
                    setCorreo(e.target.value)
                  }
                  style={s.input}
                  placeholder="tu@correo.com"
                />
              </Campo>

              <Campo label="Contraseña">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  style={s.input}
                  placeholder="Tu contraseña"
                />
              </Campo>

              <button
                type="submit"
                disabled={procesando}
                style={s.primaryButton}
              >
                {procesando
                  ? "Ingresando..."
                  : "Entrar a mi cuenta"}
              </button>

              <button
                type="button"
                disabled={procesando}
                onClick={recuperarPassword}
                style={s.forgotButton}
              >
                ¿Olvidaste tu contraseña?
              </button>

              <p style={s.helperText}>
                ¿Ya usas KONAX en otro centro? Inicia sesión
                con el mismo correo. No necesitas crear otra
                contraseña.
              </p>
            </form>
          ) : (
            <form
              onSubmit={crearCuenta}
              style={s.form}
            >
              <Campo label="Nombre completo">
                <input
                  value={nombre}
                  onChange={(e) =>
                    setNombre(e.target.value)
                  }
                  style={s.input}
                  placeholder="Nombre y apellido"
                />
              </Campo>

              <div style={s.twoColumns} className="portal-alumno-two">
                <Campo label="Identificación">
                  <input
                    value={cedula}
                    onChange={(e) =>
                      setCedula(e.target.value)
                    }
                    style={s.input}
                    placeholder="Cédula / documento"
                  />
                </Campo>

                <Campo label="Teléfono">
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) =>
                      setTelefono(e.target.value)
                    }
                    style={s.input}
                    placeholder="Teléfono"
                  />
                </Campo>
              </div>

              <Campo label="Correo electrónico">
                <input
                  type="email"
                  autoComplete="email"
                  value={correo}
                  onChange={(e) =>
                    setCorreo(e.target.value)
                  }
                  style={s.input}
                  placeholder="tu@correo.com"
                />
              </Campo>

              <div style={s.twoColumns} className="portal-alumno-two">
                <Campo label="Contraseña">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    style={s.input}
                    placeholder="Mínimo 8 caracteres"
                  />
                </Campo>

                <Campo label="Confirmar contraseña">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password2}
                    onChange={(e) =>
                      setPassword2(e.target.value)
                    }
                    style={s.input}
                    placeholder="Repite la contraseña"
                  />
                </Campo>
              </div>

              <button
                type="submit"
                disabled={procesando}
                style={s.primaryButton}
              >
                {procesando
                  ? "Creando cuenta..."
                  : "Crear mi cuenta"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
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

const s = {
  page: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at top right, rgba(22,131,79,.12), transparent 30%), #F2F6F3",
    color: "#17211C",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  loading: {
    minHeight: "100vh",
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
    width: 54,
    height: 54,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#173C2A",
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: 950,
  },

  errorCard: {
    width: "min(430px,100%)",
    padding: 22,
    display: "grid",
    gap: 7,
    border: "1px solid #F4C7C7",
    borderRadius: 18,
    background: "#FFFFFF",
    color: "#8A2D2D",
    boxShadow:
      "0 16px 40px rgba(15,23,42,.08)",
  },

  shell: {
    width: "min(980px,100%)",
    minHeight: 610,
    display: "grid",
    gridTemplateColumns:
      "minmax(300px,.82fr) minmax(420px,1.18fr)",
    overflow: "hidden",
    border: "1px solid #D6E3DA",
    borderRadius: 26,
    background: "#FFFFFF",
    boxShadow:
      "0 25px 65px rgba(16,57,36,.13)",
  },

  brandPanel: {
    minHeight: 610,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background:
      "radial-gradient(circle at 20% 20%, rgba(93,225,157,.17), transparent 30%), linear-gradient(155deg,#071C14,#0B4A2B 70%,#0B7A43)",
    color: "#FFFFFF",
  },

  brandTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  brandLogo: {
    width: 112,
    height: 62,
    padding: "7px 10px",
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#FFFFFF",
  },

  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  brandBadge: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "rgba(255,255,255,.11)",
    border: "1px solid rgba(255,255,255,.13)",
    color: "#CBEAD7",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: .8,
  },

  brandMiddle: {
    maxWidth: 330,
  },

  businessAvatar: {
    width: 58,
    height: 58,
    marginBottom: 16,
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#5CE19B",
    color: "#07301F",
    fontSize: 22,
    fontWeight: 950,
  },

  businessLabel: {
    color: "#83E5AD",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  businessTitle: {
    margin: "6px 0 0",
    fontSize: 31,
    lineHeight: 1.04,
    letterSpacing: -.7,
  },

  businessText: {
    margin: "10px 0 0",
    color: "#D2E8DB",
    fontSize: 11,
    lineHeight: 1.55,
  },

  brandBottom: {
    color: "#A9CCB8",
    fontSize: 8.5,
  },

  accessPanel: {
    padding: 30,
  },

  tabs: {
    padding: 5,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 5,
    border: "1px solid #DFE8E2",
    borderRadius: 13,
    background: "#F5F8F6",
  },

  tab: {
    minHeight: 39,
    border: 0,
    borderRadius: 9,
    background: "transparent",
    color: "#65736B",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  tabActive: {
    background: "#173C2A",
    color: "#FFFFFF",
    boxShadow:
      "0 6px 15px rgba(23,60,42,.15)",
  },

  formHeader: {
    margin: "25px 0 18px",
  },

  eyebrow: {
    display: "block",
    color: "#16834F",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: 1.1,
  },

  formTitle: {
    margin: "5px 0 0",
    color: "#17211C",
    fontSize: 25,
    lineHeight: 1.08,
  },

  formText: {
    margin: "7px 0 0",
    color: "#718078",
    fontSize: 10.5,
    lineHeight: 1.5,
  },

  form: {
    display: "grid",
    gap: 2,
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 9,
  },

  field: {
    display: "grid",
    gap: 5,
    marginBottom: 10,
  },

  label: {
    color: "#405047",
    fontSize: 9.5,
    fontWeight: 850,
  },

  input: {
    width: "100%",
    minHeight: 44,
    padding: "9px 11px",
    boxSizing: "border-box",
    border: "1px solid #CCD8D0",
    borderRadius: 11,
    background: "#FFFFFF",
    color: "#17211C",
    fontSize: 13,
    outline: "none",
  },

  primaryButton: {
    minHeight: 46,
    marginTop: 3,
    border: 0,
    borderRadius: 11,
    background:
      "linear-gradient(135deg,#16834F,#0C6E3F)",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 9px 20px rgba(22,131,79,.17)",
  },

  forgotButton: {
    minHeight: 37,
    marginTop: 3,
    border: 0,
    background: "transparent",
    color: "#16834F",
    fontSize: 9.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  helperText: {
    margin: "7px 0 0",
    padding: 10,
    borderRadius: 10,
    background: "#F4F8F5",
    color: "#718078",
    fontSize: 8.5,
    lineHeight: 1.5,
  },

  errorBox: {
    marginBottom: 12,
    padding: 11,
    display: "grid",
    gap: 7,
    border: "1px solid #F2CACA",
    borderRadius: 10,
    background: "#FFF5F5",
    color: "#9B3030",
    fontSize: 9.5,
    lineHeight: 1.45,
  },

  successBox: {
    marginBottom: 12,
    padding: 11,
    border: "1px solid #BFE0CB",
    borderRadius: 10,
    background: "#F0FAF4",
    color: "#17663D",
    fontSize: 9.5,
    lineHeight: 1.45,
  },

  inlineButton: {
    justifySelf: "start",
    minHeight: 32,
    padding: "6px 9px",
    border: "1px solid #D9B0B0",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#8F2F2F",
    fontSize: 8.5,
    fontWeight: 850,
    cursor: "pointer",
  },
};

