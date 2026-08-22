"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const VERSION =
  "2026.08.22-ALUMNO-LOGIN-V1";

export default function LoginAlumno() {
  const router = useRouter();

  const [correo, setCorreo] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [mostrarPassword, setMostrarPassword] =
    useState(false);

  const [cargando, setCargando] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    verificarSesion();
  }, []);

  async function verificarSesion() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return;
    }

    const cliente =
      await buscarPerfilAlumno(
        session.user.id
      );

    if (cliente) {
      guardarSesionAlumno(cliente);
      router.replace("/alumno");
    }
  }

  async function buscarPerfilAlumno(
    authUserId
  ) {
    const {
      data,
      error: errorCliente,
    } = await supabase
      .from("clientes")
      .select(`
        id,
        empresa_id,
        auth_user_id,
        nombre,
        nombre_completo,
        correo,
        telefono,
        estado,
        acceso_portal,
        foto_url,
        qr_token,
        qr_token_expira_en
      `)
      .eq(
        "auth_user_id",
        authUserId
      )
      .maybeSingle();

    if (errorCliente) {
      console.error(
        "Error buscando alumno:",
        errorCliente.message
      );

      return null;
    }

    return data || null;
  }

  function guardarSesionAlumno(
    cliente
  ) {
    sessionStorage.setItem(
      "alumnoId",
      String(cliente.id || "")
    );

    sessionStorage.setItem(
      "alumnoEmpresaId",
      String(
        cliente.empresa_id || ""
      )
    );

    sessionStorage.setItem(
      "alumnoNombre",
      String(
        cliente.nombre_completo ||
          cliente.nombre ||
          "Alumno"
      )
    );

    sessionStorage.setItem(
      "alumnoCorreo",
      String(
        cliente.correo || ""
      )
    );
  }

  async function iniciarSesion() {
    if (cargando) return;

    setError("");

    const correoLimpio =
      correo.trim().toLowerCase();

    if (
      !correoLimpio ||
      !password
    ) {
      setError(
        "Escribe tu correo y contraseña."
      );

      return;
    }

    setCargando(true);

    try {
      /*
        IMPORTANTE:
        Este login NO consulta la tabla usuarios.
        Busca exclusivamente clientes.
      */

      const {
        data: datosAuth,
        error: errorAuth,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: correoLimpio,
            password,
          }
        );

      if (errorAuth) {
        setError(
          "Correo o contraseña incorrectos."
        );

        return;
      }

      const authUser =
        datosAuth?.user;

      if (!authUser?.id) {
        await supabase.auth.signOut();

        setError(
          "No se pudo validar tu cuenta."
        );

        return;
      }

      const cliente =
        await buscarPerfilAlumno(
          authUser.id
        );

      if (!cliente) {
        await supabase.auth.signOut();

        setError(
          "Tu cuenta existe, pero todavía no está vinculada a un perfil de alumno. Comunícate con el gimnasio."
        );

        return;
      }

      if (
        cliente.acceso_portal !== true
      ) {
        await supabase.auth.signOut();

        setError(
          "El acceso al portal todavía no está habilitado para este alumno."
        );

        return;
      }

      const estado =
        String(
          cliente.estado || ""
        )
          .toLowerCase()
          .trim();

      if (
        [
          "inactivo",
          "cancelado",
          "bloqueado",
        ].includes(estado)
      ) {
        await supabase.auth.signOut();

        setError(
          "Tu acceso al portal se encuentra deshabilitado. Comunícate con el gimnasio."
        );

        return;
      }

      guardarSesionAlumno(cliente);

      router.replace("/alumno");
    } catch (err) {
      console.error(
        "Error login alumno:",
        err
      );

      await supabase.auth.signOut();

      setError(
        "Ocurrió un error al iniciar sesión."
      );
    } finally {
      setCargando(false);
    }
  }

  async function recuperarPassword() {
    setError("");

    const correoLimpio =
      correo.trim().toLowerCase();

    if (
      !correoLimpio ||
      !correoLimpio.includes("@")
    ) {
      setError(
        "Escribe primero tu correo electrónico."
      );

      return;
    }

    try {
      const redirectTo =
        `${window.location.origin}/alumno/restablecer-password`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          correoLimpio,
          {
            redirectTo,
          }
        );

      if (error) {
        setError(
          "No se pudo enviar el correo: " +
            error.message
        );

        return;
      }

      alert(
        "Te enviamos un enlace para restablecer tu contraseña."
      );
    } catch (err) {
      setError(
        "No se pudo iniciar la recuperación de contraseña."
      );
    }
  }

  function manejarEnter(evento) {
    if (
      evento.key === "Enter" &&
      !cargando
    ) {
      iniciarSesion();
    }
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
            Mi membresía
          </h1>

          <p style={S.subtitle}>
            Ingresa para consultar tu plan,
            pagos y código QR de acceso.
          </p>
        </div>

        {error && (
          <div style={S.error}>
            {error}
          </div>
        )}

        <Campo label="Correo electrónico">
          <input
            type="email"
            value={correo}
            onChange={(e) =>
              setCorreo(e.target.value)
            }
            onKeyDown={manejarEnter}
            placeholder="tu@correo.com"
            style={S.input}
            autoComplete="email"
          />
        </Campo>

        <Campo label="Contraseña">
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
              onKeyDown={manejarEnter}
              placeholder="Tu contraseña"
              style={S.passwordInput}
              autoComplete="current-password"
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

        <button
          type="button"
          onClick={iniciarSesion}
          disabled={cargando}
          style={{
            ...S.primary,
            ...(cargando
              ? S.disabled
              : {}),
          }}
        >
          {cargando
            ? "Ingresando..."
            : "Entrar a mi portal"}
        </button>

        <button
          type="button"
          onClick={
            recuperarPassword
          }
          style={S.forgot}
        >
          ¿Olvidaste tu contraseña?
        </button>

        <div style={S.info}>
          <span style={S.infoIcon}>
            ▦
          </span>

          <div>
            <strong>
              Tu membresía en tu teléfono
            </strong>

            <p style={S.infoText}>
              Desde aquí podrás mostrar tu
              código QR al ingresar al
              gimnasio.
            </p>
          </div>
        </div>

        <footer style={S.footer}>
          KONAX · Portal del Alumno ·{" "}
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
      "radial-gradient(circle at top right,rgba(22,131,79,.12),transparent 30%),radial-gradient(circle at bottom left,rgba(99,102,241,.10),transparent 30%),#f3f6f4",
    fontFamily:
      'Inter,system-ui,"Segoe UI",sans-serif',
    color: "#17211c",
  },

  card: {
    width: "min(450px,100%)",
    padding: 28,
    border: "1px solid #dfe5e1",
    borderRadius: 24,
    background: "#ffffff",
    boxShadow:
      "0 24px 70px rgba(25,40,31,.11)",
  },

  brand: {
    marginBottom: 25,
    textAlign: "center",
  },

  logo: {
    width: 180,
    maxWidth: "75%",
    marginBottom: 14,
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
    fontSize: 31,
    color: "#17211c",
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
    minHeight: 49,
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
    overflow: "hidden",
    border: "1px solid #ced7d1",
    borderRadius: 11,
    background: "#ffffff",
  },

  passwordInput: {
    width: "100%",
    minHeight: 49,
    padding: "0 13px",
    border: 0,
    outline: "none",
    background: "#ffffff",
    color: "#17211c",
    fontSize: 15,
  },

  showButton: {
    padding: "0 13px",
    border: 0,
    background: "#f4f7f5",
    color: "#536158",
    fontWeight: 800,
    cursor: "pointer",
  },

  primary: {
    width: "100%",
    minHeight: 50,
    marginTop: 3,
    border: 0,
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#16834f,#0d6b3e)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 8px 20px rgba(22,131,79,.17)",
  },

  disabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  forgot: {
    width: "100%",
    marginTop: 13,
    padding: 8,
    border: 0,
    background: "transparent",
    color: "#16834f",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
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

  info: {
    marginTop: 20,
    padding: 13,
    display: "grid",
    gridTemplateColumns:
      "38px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    background: "#eef8f2",
    color: "#226443",
  },

  infoIcon: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#dff3e7",
    fontSize: 20,
  },

  infoText: {
    margin: "4px 0 0",
    color: "#67756c",
    fontSize: 10,
    lineHeight: 1.4,
  },

  footer: {
    marginTop: 22,
    color: "#9aa29d",
    fontSize: 8,
    textAlign: "center",
  },
};
