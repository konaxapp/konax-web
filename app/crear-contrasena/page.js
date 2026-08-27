"use client";

// KONAX · Crear contraseña desde invitación
// VERSION 2026.08.26

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CrearContrasena() {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [sesionValida, setSesionValida] = useState(false);
  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    prepararSesion();
  }, []);

  async function prepararSesion() {
    setCargando(true);
    setMensajeError("");

    try {
      // ------------------------------------------------------
      // 1. Si Supabase envió un "code", lo intercambiamos
      //    por una sesión válida.
      // ------------------------------------------------------

      const parametros = new URLSearchParams(
        window.location.search
      );

      const code = parametros.get("code");

      if (code) {
        const { error } =
          await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error(
            "Error exchangeCodeForSession:",
            error
          );
        }
      }

      // ------------------------------------------------------
      // 2. Supabase también puede entregar la sesión
      //    automáticamente desde el enlace de invitación.
      // ------------------------------------------------------

      let {
        data: { session },
      } = await supabase.auth.getSession();

      // Pequeña espera por si Supabase todavía está
      // procesando el enlace recibido.
      if (!session) {
        await new Promise((resolve) =>
          setTimeout(resolve, 700)
        );

        const respuesta =
          await supabase.auth.getSession();

        session = respuesta.data.session;
      }

      if (!session?.user) {
        setSesionValida(false);

        setMensajeError(
          "La invitación no es válida, ya venció o ya fue utilizada. Solicita una nueva invitación a KONAX."
        );

        return;
      }

      setSesionValida(true);
    } catch (error) {
      console.error(error);

      setSesionValida(false);

      setMensajeError(
        "No fue posible validar la invitación. Solicita una nueva invitación."
      );
    } finally {
      setCargando(false);
    }
  }

  async function crearPassword(evento) {
    evento.preventDefault();

    if (guardando) return;

    setMensajeError("");

    if (!password) {
      setMensajeError(
        "Escribe tu nueva contraseña."
      );
      return;
    }

    if (password.length < 8) {
      setMensajeError(
        "La contraseña debe tener mínimo 8 caracteres."
      );
      return;
    }

    if (password !== confirmacion) {
      setMensajeError(
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
        !session?.user
      ) {
        throw new Error(
          "La sesión de invitación ya no es válida."
        );
      }

      // ------------------------------------------------------
      // La contraseña la establece directamente EL USUARIO.
      // El administrador KONAX nunca la recibe ni la conoce.
      // ------------------------------------------------------

      const {
        error: errorPassword,
      } = await supabase.auth.updateUser({
        password,
      });

      if (errorPassword) {
        throw errorPassword;
      }

      // Cerramos la sesión temporal de la invitación.
      // Después el usuario entra normalmente por /login.
      await supabase.auth.signOut();

      window.location.replace(
        "/login?acceso_creado=1"
      );
    } catch (error) {
      console.error(error);

      setMensajeError(
        error?.message ||
          "No se pudo crear la contraseña."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <main className="pagina">
        <section className="tarjeta cargando">
          <img
            src="/konax-logo.png"
            alt="KONAX"
            className="logo"
          />

          <div className="spinner" />

          <strong>
            Validando tu invitación...
          </strong>

          <p>
            Estamos preparando tu acceso seguro a KONAX.
          </p>
        </section>

        <Estilos />
      </main>
    );
  }

  if (!sesionValida) {
    return (
      <main className="pagina">
        <section className="tarjeta">
          <img
            src="/konax-logo.png"
            alt="KONAX"
            className="logo"
          />

          <div className="icono error">
            !
          </div>

          <span className="eyebrow">
            ACCESO KONAX
          </span>

          <h1>
            Invitación no disponible
          </h1>

          <p className="descripcion">
            {mensajeError}
          </p>

          <button
            type="button"
            className="secundario"
            onClick={() =>
              window.location.replace("/login")
            }
          >
            Ir al inicio de sesión
          </button>
        </section>

        <Estilos />
      </main>
    );
  }

  return (
    <main className="pagina">
      <section className="tarjeta">
        <div className="logo-box">
          <img
            src="/konax-logo.png"
            alt="KONAX"
            className="logo"
          />
        </div>

        <span className="eyebrow">
          BIENVENIDO A KONAX
        </span>

        <h1>
          Crea tu contraseña
        </h1>

        <p className="descripcion">
          Tu administrador te ha invitado a KONAX.
          Define una contraseña personal para activar
          tu acceso.
        </p>

        <div className="seguridad">
          <span>🔒</span>

          <p>
            Tu contraseña es privada. KONAX ni el
            administrador de tu negocio podrán verla.
          </p>
        </div>

        <form onSubmit={crearPassword}>
          <label>
            Nueva contraseña

            <input
              type="password"
              value={password}
              onChange={(evento) =>
                setPassword(evento.target.value)
              }
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              disabled={guardando}
            />
          </label>

          <label>
            Confirmar contraseña

            <input
              type="password"
              value={confirmacion}
              onChange={(evento) =>
                setConfirmacion(evento.target.value)
              }
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              disabled={guardando}
            />
          </label>

          {mensajeError && (
            <div className="mensaje-error">
              {mensajeError}
            </div>
          )}

          <button
            type="submit"
            className="principal"
            disabled={guardando}
          >
            {guardando
              ? "Activando acceso..."
              : "Crear contraseña y activar acceso"}
          </button>
        </form>

        <div className="pie">
          <strong>KONAX</strong>

          <span>
            Gestión empresarial segura
          </span>
        </div>
      </section>

      <Estilos />
    </main>
  );
}

function Estilos() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
      }

      body {
        background: #f2f6f3;
      }

      .pagina {
        width: 100%;
        min-height: 100vh;
        padding: 22px;
        display: grid;
        place-items: center;
        background:
          radial-gradient(
            circle at top right,
            rgba(22, 163, 74, 0.12),
            transparent 35%
          ),
          linear-gradient(
            145deg,
            #f5f8f6 0%,
            #edf3ef 55%,
            #e5eee8 100%
          );
        font-family:
          Inter,
          Arial,
          sans-serif;
        color: #17211c;
      }

      .tarjeta {
        width: 100%;
        max-width: 470px;
        padding: 34px;
        border: 1px solid #dce6df;
        border-radius: 26px;
        background:
          rgba(255, 255, 255, 0.98);
        box-shadow:
          0 28px 70px
            rgba(15, 45, 28, 0.12);
      }

      .logo-box {
        margin-bottom: 25px;
      }

      .logo {
        width: 150px;
        max-width: 55%;
        height: auto;
        display: block;
      }

      .eyebrow {
        display: block;
        margin-bottom: 7px;
        color: #16834f;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 1.5px;
      }

      h1 {
        margin: 0;
        color: #132019;
        font-size: 32px;
        line-height: 1.08;
        letter-spacing: -0.7px;
      }

      .descripcion {
        margin: 13px 0 20px;
        color: #6b776f;
        font-size: 14px;
        line-height: 1.6;
      }

      .seguridad {
        margin-bottom: 22px;
        padding: 13px 14px;
        display: grid;
        grid-template-columns:
          28px minmax(0, 1fr);
        gap: 9px;
        align-items: start;
        border: 1px solid #cce7d7;
        border-radius: 14px;
        background: #f0faf4;
      }

      .seguridad p {
        margin: 0;
        color: #3c5547;
        font-size: 12px;
        line-height: 1.5;
      }

      form {
        display: grid;
        gap: 16px;
      }

      label {
        display: grid;
        gap: 7px;
        color: #2c3831;
        font-size: 13px;
        font-weight: 800;
      }

      input {
        width: 100%;
        min-height: 50px;
        padding: 12px 14px;
        border: 1px solid #ced9d2;
        border-radius: 12px;
        outline: none;
        background: #ffffff;
        color: #162019;
        font-size: 16px;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;
      }

      input:focus {
        border-color: #16834f;
        box-shadow:
          0 0 0 4px
            rgba(22, 131, 79, 0.1);
      }

      .principal,
      .secundario {
        width: 100%;
        min-height: 52px;
        padding: 12px 18px;
        border-radius: 13px;
        font-size: 14px;
        font-weight: 900;
        cursor: pointer;
      }

      .principal {
        margin-top: 3px;
        border: 0;
        background:
          linear-gradient(
            135deg,
            #163b29,
            #0d7b47
          );
        color: white;
        box-shadow:
          0 12px 25px
            rgba(13, 123, 71, 0.18);
      }

      .principal:disabled {
        opacity: 0.65;
        cursor: wait;
      }

      .secundario {
        border: 1px solid #ccd8d0;
        background: white;
        color: #26332b;
      }

      .mensaje-error {
        padding: 11px 13px;
        border: 1px solid #fecaca;
        border-radius: 11px;
        background: #fff5f5;
        color: #b42318;
        font-size: 12px;
        line-height: 1.45;
      }

      .pie {
        margin-top: 25px;
        padding-top: 17px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        border-top: 1px solid #e6ece8;
        color: #869189;
        font-size: 10px;
      }

      .pie strong {
        color: #176b43;
        letter-spacing: 1px;
      }

      .cargando {
        text-align: center;
      }

      .cargando .logo {
        margin: 0 auto 20px;
      }

      .cargando p {
        color: #718078;
        font-size: 13px;
      }

      .spinner {
        width: 38px;
        height: 38px;
        margin: 0 auto 17px;
        border: 4px solid #deebe3;
        border-top-color: #16834f;
        border-radius: 50%;
        animation: girar 0.8s linear infinite;
      }

      .icono {
        width: 52px;
        height: 52px;
        margin: 24px 0 18px;
        display: grid;
        place-items: center;
        border-radius: 16px;
        font-size: 25px;
        font-weight: 900;
      }

      .icono.error {
        background: #fff0f0;
        color: #c62828;
      }

      @keyframes girar {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 600px) {
        .pagina {
          padding: 14px;
          align-items: center;
        }

        .tarjeta {
          padding: 24px 20px;
          border-radius: 21px;
        }

        .logo {
          width: 130px;
        }

        h1 {
          font-size: 28px;
        }
      }
    `}</style>
  );
}
