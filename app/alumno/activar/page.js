"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const VERSION = "2026.08.22-ALUMNO-ACTIVAR-V1";

export default function ActivarAlumno() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] =
    useState("");

  const [mostrarPassword, setMostrarPassword] =
    useState(false);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    verificarInvitacion();
  }, []);

  async function verificarInvitacion() {
    setCargando(true);
    setError("");

    try {
      /*
        Supabase puede regresar del correo con:
        - sesión ya creada
        - code en query string
        - tokens en hash, dependiendo del flujo/configuración
      */

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error: errorCode } =
          await supabase.auth.exchangeCodeForSession(
            code
          );

        if (errorCode) {
          console.error(
            "Error intercambiando código:",
            errorCode.message
          );
        }
      }

      const {
        data: { session },
        error: errorSesion,
      } = await supabase.auth.getSession();

      if (errorSesion) {
        setError(
          "No fue posible validar la invitación: " +
            errorSesion.message
        );
        return;
      }

      if (!session?.user) {
        setError(
          "La invitación no es válida, ya venció o no pudo establecerse la sesión. Solicita una nueva invitación al gimnasio."
        );
        return;
      }

      setCorreo(session.user.email || "");
    } catch (err) {
      console.error(
        "Error verificando invitación:",
        err
      );

      setError(
        "No fue posible validar el enlace de activación."
      );
    } finally {
      setCargando(false);
    }
  }

  async function activarCuenta() {
    if (guardando) return;

    setError("");

    if (!password) {
      setError("Escribe una contraseña.");
      return;
    }

    if (password.length < 8) {
      setError(
        "La contraseña debe tener mínimo 8 caracteres."
      );
      return;
    }

    if (password !== confirmarPassword) {
      setError(
        "Las contraseñas no coinciden."
      );
      return;
    }

    setGuardando(true);

    try {
      const {
        data: { session },
        error: errorSesion,
      } = await supabase.auth.getSession();

      if (
        errorSesion ||
        !session?.user?.id
      ) {
        setError(
          "La sesión de activación expiró. Solicita una nueva invitación."
        );

        return;
      }

      const {
        error: errorPassword,
      } = await supabase.auth.updateUser({
        password,
      });

      if (errorPassword) {
        setError(
          "No se pudo crear la contraseña: " +
            errorPassword.message
        );

        return;
      }

      /*
        Cerramos la sesión temporal de la invitación.
        El alumno luego entra normalmente desde /alumno/login.
      */

      await supabase.auth.signOut();

      alert(
        "Tu contraseña fue creada correctamente. Ya puedes ingresar a tu portal."
      );

      router.replace("/alumno/login");
    } catch (err) {
      console.error(
        "Error activando cuenta:",
        err
      );

      setError(
        err?.message ||
          "No se pudo completar la activación."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <main style={S.loadingPage}>
        <div style={S.loadingCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={S.loadingLogo}
          />

          <strong>
            Validando invitación...
          </strong>

          <span style={S.muted}>
            Estamos preparando tu acceso.
          </span>
        </div>
      </main>
    );
  }

  return (
    <main style={S.page}>
      <section style={S.card}>
        <div style={S.brand}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={S.logo}
          />

          <span style={S.eyebrow}>
            PORTAL DEL ALUMNO
          </span>

          <h1 style={S.title}>
            Activa tu cuenta
          </h1>

          <p style={S.subtitle}>
            Crea una contraseña para ingresar a
            tu membresía digital.
          </p>
        </div>

        {error ? (
          <div style={S.error}>
            {error}
          </div>
        ) : (
          <>
            {correo && (
              <div style={S.emailBox}>
                <span style={S.emailLabel}>
                  Cuenta
                </span>

                <strong style={S.email}>
                  {correo}
                </strong>
              </div>
            )}

            <Campo label="Nueva contraseña">
              <div style={S.passwordWrap}>
                <input
                  type={
                    mostrarPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="Mínimo 8 caracteres"
                  style={S.inputPassword}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  style={S.showButton}
                  onClick={() =>
                    setMostrarPassword(
                      (valor) => !valor
                    )
                  }
                >
                  {mostrarPassword
                    ? "Ocultar"
                    : "Ver"}
                </button>
              </div>
            </Campo>

            <Campo label="Confirmar contraseña">
              <input
                type={
                  mostrarPassword
                    ? "text"
                    : "password"
                }
                value={confirmarPassword}
                onChange={(e) =>
                  setConfirmarPassword(
                    e.target.value
                  )
                }
                placeholder="Repite tu contraseña"
                style={S.input}
                autoComplete="new-password"
              />
            </Campo>

            <div style={S.security}>
              <span style={S.securityIcon}>
                🔐
              </span>

              <div>
                <strong>
                  Acceso personal
                </strong>

                <p style={S.securityText}>
                  Tu cuenta estará asociada
                  exclusivamente a tu perfil de
                  alumno.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={activarCuenta}
              disabled={guardando}
              style={{
                ...S.primary,
                ...(guardando
                  ? S.disabled
                  : {}),
              }}
            >
              {guardando
                ? "Activando..."
                : "Activar mi cuenta"}
            </button>
          </>
        )}

        {error && (
          <button
            type="button"
            style={S.secondary}
            onClick={() =>
              router.replace(
                "/alumno/login"
              )
            }
          >
            Ir al inicio de sesión
          </button>
        )}

        <footer style={S.footer}>
          KONAX · Membresía digital segura ·{" "}
          {VERSION}
        </footer>
      </section>
    </main>
  );
}

function Campo({
  label,
  children,
}) {
  return (
    <label style={S.field}>
      <span style={S.label}>
        {label}
      </span>

      {children}
    </label>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at top right,rgba(99,102,241,.14),transparent 30%),radial-gradient(circle at bottom left,rgba(22,131,79,.11),transparent 30%),#f4f5f8",
    fontFamily:
      'Inter,system-ui,"Segoe UI",sans-serif',
    color: "#17211c",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f4f5f8",
    fontFamily:
      'Inter,system-ui,"Segoe UI",sans-serif',
  },

  loadingCard: {
    padding: 28,
    display: "grid",
    justifyItems: "center",
    gap: 10,
    borderRadius: 20,
    background: "#ffffff",
    boxShadow:
      "0 16px 45px rgba(20,30,25,.08)",
  },

  loadingLogo: {
    width: 170,
  },

  card: {
    width: "min(470px,100%)",
    padding: 28,
    border: "1px solid #e0e3e1",
    borderRadius: 24,
    background:
      "rgba(255,255,255,.96)",
    boxShadow:
      "0 24px 70px rgba(32,36,44,.11)",
  },

  brand: {
    marginBottom: 24,
    textAlign: "center",
  },

  logo: {
    width: 180,
    maxWidth: "75%",
    marginBottom: 15,
  },

  eyebrow: {
    display: "block",
    marginBottom: 7,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.5,
  },

  title: {
    margin: 0,
    color: "#17211c",
    fontSize: 30,
  },

  subtitle: {
    margin: "9px 0 0",
    color: "#758079",
    fontSize: 13,
    lineHeight: 1.5,
  },

  field: {
    display: "grid",
    gap: 6,
    marginBottom: 15,
  },

  label: {
    color: "#4a554e",
    fontSize: 12,
    fontWeight: 800,
  },

  input: {
    width: "100%",
    minHeight: 48,
    padding: "0 13px",
    border: "1px solid #ced7d1",
    borderRadius: 11,
    outline: "none",
    background: "#ffffff",
    color: "#17211c",
    fontSize: 15,
  },

  passwordWrap: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) auto",
    border: "1px solid #ced7d1",
    borderRadius: 11,
    overflow: "hidden",
    background: "#ffffff",
  },

  inputPassword: {
    width: "100%",
    minHeight: 48,
    padding: "0 13px",
    border: 0,
    outline: "none",
    color: "#17211c",
    fontSize: 15,
  },

  showButton: {
    padding: "0 13px",
    border: 0,
    background: "#f5f7f6",
    color: "#4f5b53",
    fontWeight: 800,
    cursor: "pointer",
  },

  emailBox: {
    marginBottom: 17,
    padding: 13,
    display: "grid",
    gap: 3,
    border: "1px solid #dfe5e1",
    borderRadius: 11,
    background: "#f7faf8",
  },

  emailLabel: {
    color: "#7b867f",
    fontSize: 9,
    fontWeight: 800,
  },

  email: {
    fontSize: 12,
  },

  security: {
    marginTop: 4,
    marginBottom: 18,
    padding: 12,
    display: "grid",
    gridTemplateColumns:
      "36px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    background: "#eef8f2",
    color: "#226443",
  },

  securityIcon: {
    fontSize: 21,
  },

  securityText: {
    margin: "3px 0 0",
    color: "#65746a",
    fontSize: 10,
    lineHeight: 1.4,
  },

  primary: {
    width: "100%",
    minHeight: 50,
    border: 0,
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#16834f,#0c6a3c)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 8px 20px rgba(22,131,79,.17)",
  },

  secondary: {
    width: "100%",
    minHeight: 46,
    marginTop: 12,
    border: "1px solid #d6ded9",
    borderRadius: 11,
    background: "#ffffff",
    color: "#38463d",
    fontWeight: 850,
    cursor: "pointer",
  },

  disabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  error: {
    marginBottom: 16,
    padding: 13,
    border: "1px solid #efaaa2",
    borderRadius: 11,
    background: "#fff0ee",
    color: "#b42318",
    fontSize: 11,
    lineHeight: 1.45,
  },

  muted: {
    color: "#77837b",
    fontSize: 11,
  },

  footer: {
    marginTop: 22,
    color: "#9aa29d",
    fontSize: 8,
    textAlign: "center",
  },
};
