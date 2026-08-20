"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

const VERSION = "2026.08.19-KONAX-NEGOCIOS-REGISTRO-V1";

export default function RegistroKonaxNegocios() {
  const [form, setForm] = useState({
    correo: "",
    nombre: "",
    apellido: "",
    telefono: "",
    password: "",
    confirmarPassword: "",
  });

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");

  useEffect(() => {
    revisarSesion();
  }, []);

  async function revisarSesion() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        // Si ya tiene sesión, no obligamos a volver a registrarse.
        // Más adelante aquí podremos revisar si ya tiene empresa.
      }
    } catch (error) {
      console.error("Error revisando sesión:", error);
    }
  }

  function actualizar(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));

    if (mensaje) {
      setMensaje("");
      setTipoMensaje("");
    }
  }

  function limpiarTelefono(valor) {
    return String(valor || "")
      .replace(/[^\d+\-\s()]/g, "")
      .slice(0, 20);
  }

  function validar() {
    const correo = form.correo.trim().toLowerCase();
    const nombre = form.nombre.trim();
    const apellido = form.apellido.trim();
    const telefono = form.telefono.trim();

    if (!correo) {
      return "Escribe tu correo electrónico.";
    }

    if (!correo.includes("@") || !correo.includes(".")) {
      return "Escribe un correo electrónico válido.";
    }

    if (!nombre) {
      return "Escribe tu nombre.";
    }

    if (!apellido) {
      return "Escribe tu apellido.";
    }

    if (!telefono) {
      return "Escribe tu teléfono o WhatsApp.";
    }

    if (!form.password) {
      return "Escribe una contraseña.";
    }

    if (form.password.length < 8) {
      return "La contraseña debe tener mínimo 8 caracteres.";
    }

    if (form.password !== form.confirmarPassword) {
      return "Las contraseñas no coinciden.";
    }

    return "";
  }

  async function registrar(e) {
    e.preventDefault();

    if (cargando) return;

    const errorValidacion = validar();

    if (errorValidacion) {
      setTipoMensaje("error");
      setMensaje(errorValidacion);
      return;
    }

    setCargando(true);
    setMensaje("");
    setTipoMensaje("");

    try {
      const correo = form.correo.trim().toLowerCase();
      const nombre = form.nombre.trim();
      const apellido = form.apellido.trim();
      const telefono = form.telefono.trim();

      /*
        Guardamos temporalmente estos datos.

        Después de verificar el correo,
        /negocios/verificar los utilizará para llamar:

        crear_empresa_konax_negocios()

        y crear:
        - empresa
        - usuario administrador
        - onboarding paso 1
      */

      sessionStorage.setItem(
        "konaxNegociosRegistro",
        JSON.stringify({
          correo,
          nombre,
          apellido,
          nombreCompleto: `${nombre} ${apellido}`.trim(),
          telefono,
        })
      );

      const { data, error } = await supabase.auth.signUp({
        email: correo,
        password: form.password,

        options: {
          data: {
            nombre,
            apellido,
            nombre_completo: `${nombre} ${apellido}`.trim(),
            telefono,
            origen: "konax_negocios",
          },
        },
      });

      if (error) {
        console.error("Error registro Auth:", error);

        const texto = String(error.message || "").toLowerCase();

        if (
          texto.includes("already registered") ||
          texto.includes("already been registered") ||
          texto.includes("user already")
        ) {
          setTipoMensaje("error");
          setMensaje(
            "Este correo ya tiene una cuenta. Puedes iniciar sesión."
          );
          return;
        }

        setTipoMensaje("error");
        setMensaje(
          error.message || "No se pudo crear la cuenta."
        );
        return;
      }

      if (!data?.user) {
        setTipoMensaje("error");
        setMensaje(
          "No se pudo crear la cuenta. Intenta nuevamente."
        );
        return;
      }

      /*
        También guardamos el ID Auth temporalmente.
        No sustituye auth.uid().
        Solo nos sirve como referencia del flujo.
      */

      sessionStorage.setItem(
        "konaxNegociosAuthUserId",
        data.user.id || ""
      );

      setTipoMensaje("success");
      setMensaje(
        "Cuenta creada. Te estamos llevando a verificar tu correo."
      );

      setTimeout(() => {
        window.location.href = `/negocios/verificar?correo=${encodeURIComponent(
          correo
        )}`;
      }, 700);
    } catch (error) {
      console.error(error);

      setTipoMensaje("error");
      setMensaje(
        "Ocurrió un problema creando la cuenta. Intenta nuevamente."
      );
    } finally {
      setCargando(false);
    }
  }

  function iniciarSesion() {
    window.location.href = "/login";
  }

  function volver() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="kn-page">
      <style>{CSS}</style>

      <header className="kn-header">
        <button
          type="button"
          className="kn-back"
          onClick={volver}
          aria-label="Volver"
        >
          ‹
        </button>

        <img
          src="/konax-logo.png"
          alt="KONAX"
          className="kn-logo"
        />

        <div className="kn-header-space" />
      </header>

      <section className="kn-shell">
        <div className="kn-brand">
          <span className="kn-eyebrow">
            KONAX · NEGOCIOS
          </span>

          <h1>
            Registra tu
            <br />
            negocio
          </h1>

          <p>
            Crea tu cuenta para administrar tu negocio,
            recibir reservas y prepararte para aparecer
            en KONAX.
          </p>
        </div>

        <div className="kn-card">
          <div className="kn-progress">
            <div className="kn-progress-item">
              <span className="kn-progress-circle active">
                1
              </span>

              <span className="kn-progress-line" />
            </div>

            <div className="kn-progress-item last">
              <span className="kn-progress-circle">
                2
              </span>
            </div>
          </div>

          <p className="kn-step-label">
            Paso 1 de 2 · Datos de tu cuenta
          </p>

          <div className="kn-card-title">
            <span>Empieza con tu cuenta</span>
            <h2>Datos del propietario</h2>
            <p>
              Esta será tu cuenta de acceso a KONAX
              Negocios.
            </p>
          </div>

          {mensaje && (
            <div
              className={
                tipoMensaje === "success"
                  ? "kn-alert success"
                  : "kn-alert error"
              }
            >
              {mensaje}
            </div>
          )}

          <form
            onSubmit={registrar}
            className="kn-form"
          >
            <label className="kn-field kn-full">
              <span>Correo electrónico *</span>

              <input
                type="email"
                value={form.correo}
                onChange={(e) =>
                  actualizar("correo", e.target.value)
                }
                placeholder="tu@negocio.com"
                autoComplete="email"
                inputMode="email"
              />
            </label>

            <div className="kn-two">
              <label className="kn-field">
                <span>Nombre *</span>

                <input
                  value={form.nombre}
                  onChange={(e) =>
                    actualizar("nombre", e.target.value)
                  }
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                />
              </label>

              <label className="kn-field">
                <span>Apellido *</span>

                <input
                  value={form.apellido}
                  onChange={(e) =>
                    actualizar("apellido", e.target.value)
                  }
                  placeholder="Tu apellido"
                  autoComplete="family-name"
                />
              </label>
            </div>

            <label className="kn-field kn-full">
              <span>Teléfono / WhatsApp *</span>

              <input
                value={form.telefono}
                onChange={(e) =>
                  actualizar(
                    "telefono",
                    limpiarTelefono(e.target.value)
                  )
                }
                placeholder="6000-0000"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>

            <label className="kn-field kn-full">
              <span>Contraseña *</span>

              <div className="kn-password">
                <input
                  type={
                    mostrarPassword ? "text" : "password"
                  }
                  value={form.password}
                  onChange={(e) =>
                    actualizar(
                      "password",
                      e.target.value
                    )
                  }
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarPassword((prev) => !prev)
                  }
                  aria-label="Mostrar contraseña"
                >
                  {mostrarPassword ? "Ocultar" : "Ver"}
                </button>
              </div>
            </label>

            <label className="kn-field kn-full">
              <span>Confirmar contraseña *</span>

              <div className="kn-password">
                <input
                  type={
                    mostrarConfirmar ? "text" : "password"
                  }
                  value={form.confirmarPassword}
                  onChange={(e) =>
                    actualizar(
                      "confirmarPassword",
                      e.target.value
                    )
                  }
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarConfirmar((prev) => !prev)
                  }
                  aria-label="Mostrar contraseña"
                >
                  {mostrarConfirmar ? "Ocultar" : "Ver"}
                </button>
              </div>
            </label>

            <div className="kn-security">
              <span>✓</span>

              <p>
                Tu cuenta quedará vinculada al negocio
                que registres en los siguientes pasos.
              </p>
            </div>

            <button
              type="submit"
              className="kn-primary"
              disabled={cargando}
            >
              <span>
                {cargando
                  ? "Creando cuenta..."
                  : "Continuar"}
              </span>

              {!cargando && <strong>→</strong>}
            </button>
          </form>

          <div className="kn-login">
            <span>¿Ya tienes cuenta?</span>

            <button
              type="button"
              onClick={iniciarSesion}
            >
              Inicia sesión
            </button>
          </div>
        </div>

        <footer className="kn-footer">
          <img
            src="/konax-logo.png"
            alt="KONAX"
          />

          <span>
            KONAX Negocios · {VERSION}
          </span>
        </footer>
      </section>
    </main>
  );
}

const CSS = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    background: #f4f7f5;
  }

  button,
  input {
    font: inherit;
  }

  button {
    -webkit-tap-highlight-color: transparent;
  }

  .kn-page {
    min-height: 100vh;
    width: 100%;
    background:
      radial-gradient(
        circle at 90% 2%,
        rgba(16, 163, 93, .10),
        transparent 26%
      ),
      linear-gradient(
        180deg,
        #f8faf9 0%,
        #eef5f1 100%
      );
    color: #17211c;
    font-family:
      Inter,
      Arial,
      Helvetica,
      sans-serif;
    padding-bottom:
      max(24px, env(safe-area-inset-bottom));
  }

  .kn-header {
    height: 78px;
    padding:
      max(12px, env(safe-area-inset-top))
      20px
      10px;
    display: grid;
    grid-template-columns: 48px 1fr 48px;
    align-items: center;
    border-bottom: 1px solid #e0e8e3;
    background: rgba(255,255,255,.92);
    backdrop-filter: blur(14px);
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .kn-back {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 14px;
    background: #f0f4f2;
    color: #17211c;
    display: grid;
    place-items: center;
    font-size: 37px;
    line-height: 1;
    cursor: pointer;
  }

  .kn-logo {
    width: min(190px, 55vw);
    max-height: 48px;
    object-fit: contain;
    justify-self: center;
  }

  .kn-header-space {
    width: 44px;
  }

  .kn-shell {
    width: min(100%, 620px);
    margin: 0 auto;
    padding: 22px 18px 10px;
  }

  .kn-brand {
    padding: 12px 6px 25px;
  }

  .kn-eyebrow {
    display: block;
    margin-bottom: 9px;
    color: #087a47;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 1.4px;
  }

  .kn-brand h1 {
    margin: 0;
    color: #142019;
    font-size: clamp(39px, 11vw, 58px);
    line-height: .98;
    letter-spacing: -2.1px;
  }

  .kn-brand p {
    max-width: 520px;
    margin: 15px 0 0;
    color: #647269;
    font-size: 16px;
    line-height: 1.55;
  }

  .kn-card {
    padding: 26px 22px 24px;
    border: 1px solid #dce6e0;
    border-radius: 28px;
    background: rgba(255,255,255,.96);
    box-shadow:
      0 18px 50px rgba(18,53,34,.09);
  }

  .kn-progress {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    margin-bottom: 8px;
  }

  .kn-progress-item {
    display: flex;
    align-items: center;
  }

  .kn-progress-item.last {
    justify-content: flex-end;
  }

  .kn-progress-circle {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #e8eeea;
    color: #6c786f;
    font-size: 16px;
    font-weight: 900;
  }

  .kn-progress-circle.active {
    background:
      linear-gradient(
        145deg,
        #086b3f,
        #0fa35c
      );
    color: #fff;
    box-shadow:
      0 7px 18px rgba(11,112,65,.22);
  }

  .kn-progress-line {
    height: 3px;
    flex: 1;
    margin: 0 12px;
    border-radius: 999px;
    background:
      linear-gradient(
        90deg,
        #0b7a4b 0%,
        #8bcbae 46%,
        #e2e9e5 100%
      );
  }

  .kn-step-label {
    margin: 8px 0 24px;
    color: #718078;
    font-size: 12px;
    font-weight: 700;
  }

  .kn-card-title {
    margin-bottom: 22px;
  }

  .kn-card-title > span {
    color: #0b7a4b;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .kn-card-title h2 {
    margin: 5px 0 5px;
    color: #17211c;
    font-size: 28px;
    line-height: 1.1;
  }

  .kn-card-title p {
    margin: 0;
    color: #77837c;
    font-size: 14px;
    line-height: 1.45;
  }

  .kn-alert {
    margin-bottom: 18px;
    padding: 13px 14px;
    border-radius: 13px;
    font-size: 13px;
    font-weight: 750;
    line-height: 1.4;
  }

  .kn-alert.error {
    border: 1px solid #fecaca;
    background: #fff4f4;
    color: #a32020;
  }

  .kn-alert.success {
    border: 1px solid #b9e5cc;
    background: #effbf4;
    color: #087442;
  }

  .kn-form {
    display: grid;
    gap: 16px;
  }

  .kn-field {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .kn-field > span {
    color: #35443b;
    font-size: 13px;
    font-weight: 850;
  }

  .kn-two {
    display: grid;
    grid-template-columns:
      repeat(2,minmax(0,1fr));
    gap: 12px;
  }

  .kn-field input {
    width: 100%;
    min-height: 54px;
    padding: 0 15px;
    border: 1px solid #cad6cf;
    outline: none;
    border-radius: 15px;
    background: #fff;
    color: #17211c;
    font-size: 16px;
    transition:
      border-color .18s ease,
      box-shadow .18s ease;
  }

  .kn-field input:focus {
    border-color: #0b7a4b;
    box-shadow:
      0 0 0 4px rgba(11,122,75,.10);
  }

  .kn-field input::placeholder {
    color: #a1aaa5;
  }

  .kn-password {
    min-height: 54px;
    display: grid;
    grid-template-columns: 1fr auto;
    border: 1px solid #cad6cf;
    border-radius: 15px;
    overflow: hidden;
    background: #fff;
  }

  .kn-password:focus-within {
    border-color: #0b7a4b;
    box-shadow:
      0 0 0 4px rgba(11,122,75,.10);
  }

  .kn-password input {
    border: 0;
    border-radius: 0;
    box-shadow: none !important;
  }

  .kn-password button {
    min-width: 65px;
    border: 0;
    background: transparent;
    color: #0b7a4b;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .kn-security {
    padding: 12px 13px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    border-radius: 13px;
    background: #f0f8f4;
  }

  .kn-security > span {
    width: 23px;
    height: 23px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #0b7a4b;
    color: #fff;
    font-size: 12px;
    font-weight: 900;
  }

  .kn-security p {
    margin: 2px 0 0;
    color: #5e6e65;
    font-size: 12px;
    line-height: 1.45;
  }

  .kn-primary {
    width: 100%;
    min-height: 58px;
    margin-top: 3px;
    padding: 0 20px;
    border: 0;
    border-radius: 17px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 14px;
    background:
      linear-gradient(
        135deg,
        #075f39 0%,
        #0a834b 55%,
        #13a85f 100%
      );
    color: #fff;
    font-size: 17px;
    font-weight: 900;
    box-shadow:
      0 12px 26px rgba(11,122,75,.22);
    cursor: pointer;
  }

  .kn-primary strong {
    font-size: 23px;
    line-height: 1;
  }

  .kn-primary:disabled {
    opacity: .68;
    cursor: not-allowed;
  }

  .kn-login {
    margin-top: 22px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
    color: #7c8781;
    font-size: 13px;
  }

  .kn-login button {
    padding: 0;
    border: 0;
    background: transparent;
    color: #087a47;
    font-weight: 900;
    cursor: pointer;
  }

  .kn-footer {
    padding: 26px 5px 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    color: #87928c;
    font-size: 9px;
  }

  .kn-footer img {
    width: 78px;
    height: auto;
  }

  @media (max-width: 480px) {
    .kn-header {
      height: 72px;
      padding-left: 14px;
      padding-right: 14px;
    }

    .kn-shell {
      padding: 17px 14px 8px;
    }

    .kn-brand {
      padding: 9px 5px 20px;
    }

    .kn-card {
      padding: 23px 18px 22px;
      border-radius: 24px;
    }

    .kn-brand p {
      font-size: 15px;
    }
  }

  @media (max-width: 370px) {
    .kn-two {
      grid-template-columns: 1fr;
    }

    .kn-brand h1 {
      font-size: 39px;
    }
  }
`;
