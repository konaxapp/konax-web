"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

const VERSION = "2026.08.19-KONAX-NEGOCIOS-REGISTRO-V2";

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
        console.log("Sesión activa KONAX:", session.user.id);
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
        setMensaje(error.message || "No se pudo crear la cuenta.");
        return;
      }

      if (!data?.user) {
        setTipoMensaje("error");
        setMensaje("No se pudo crear la cuenta. Intenta nuevamente.");
        return;
      }

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

        <span className="kn-business-badge">
          Negocios
        </span>
      </header>

      <section className="kn-shell">
        <div className="kn-brand">
          <span className="kn-eyebrow">
            KONAX · NEGOCIOS
          </span>

          <h1>Registra tu negocio</h1>

          <p>
            Crea tu cuenta para administrar tu negocio,
            recibir reservas y prepararte para aparecer en KONAX.
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
            <span>CUENTA DE PROPIETARIO</span>

            <h2>Datos de acceso</h2>

            <p>
              Utilizarás estos datos para ingresar a KONAX Negocios.
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
            <label className="kn-field">
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

            <label className="kn-field">
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

            <label className="kn-field">
              <span>Contraseña *</span>

              <div className="kn-password">
                <input
                  type={
                    mostrarPassword
                      ? "text"
                      : "password"
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
                    setMostrarPassword(
                      (prev) => !prev
                    )
                  }
                >
                  {mostrarPassword
                    ? "Ocultar"
                    : "Ver"}
                </button>
              </div>
            </label>

            <label className="kn-field">
              <span>Confirmar contraseña *</span>

              <div className="kn-password">
                <input
                  type={
                    mostrarConfirmar
                      ? "text"
                      : "password"
                  }
                  value={
                    form.confirmarPassword
                  }
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
                    setMostrarConfirmar(
                      (prev) => !prev
                    )
                  }
                >
                  {mostrarConfirmar
                    ? "Ocultar"
                    : "Ver"}
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

              {!cargando && (
                <strong>→</strong>
              )}
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
        circle at 100% 0%,
        rgba(12, 145, 81, .08),
        transparent 26%
      ),
      linear-gradient(
        180deg,
        #f9fbfa 0%,
        #eef5f1 100%
      );

    color: #17211c;

    font-family:
      Inter,
      Arial,
      Helvetica,
      sans-serif;

    padding-bottom:
      max(
        22px,
        env(safe-area-inset-bottom)
      );
  }

  /* =========================
     HEADER MÁS PROFESIONAL
  ========================== */

  .kn-header {
    min-height: 60px;

    padding:
      max(
        7px,
        env(safe-area-inset-top)
      )
      14px
      7px;

    display: grid;

    grid-template-columns:
      38px
      minmax(0,1fr)
      auto;

    align-items: center;

    gap: 8px;

    position: sticky;

    top: 0;

    z-index: 30;

    background:
      rgba(255,255,255,.97);

    border-bottom:
      1px solid #e4ebe7;

    box-shadow:
      0 3px 14px
      rgba(18,53,34,.05);

    backdrop-filter:
      blur(16px);
  }

  .kn-back {
    width: 36px;
    height: 36px;

    padding: 0;

    border:
      1px solid #e0e8e3;

    border-radius: 11px;

    display: grid;
    place-items: center;

    background: #f5f8f6;

    color: #18221c;

    font-size: 29px;

    line-height: 1;

    cursor: pointer;
  }

  .kn-logo {
    width:
      min(136px, 40vw);

    max-height: 34px;

    object-fit: contain;

    justify-self: center;
  }

  .kn-business-badge {
    min-height: 28px;

    padding:
      0 9px;

    border:
      1px solid #d8ebdf;

    border-radius: 999px;

    display: flex;
    align-items: center;

    background: #edf8f2;

    color: #087442;

    font-size: 9px;

    font-weight: 900;

    letter-spacing: .25px;
  }

  /* =========================
     CONTENIDO
  ========================== */

  .kn-shell {
    width:
      min(100%, 600px);

    margin: 0 auto;

    padding:
      15px 14px 9px;
  }

  .kn-brand {
    padding:
      5px 4px 16px;
  }

  .kn-eyebrow {
    display: block;

    margin-bottom: 6px;

    color: #087a47;

    font-size: 10px;

    font-weight: 900;

    letter-spacing: 1.2px;
  }

  .kn-brand h1 {
    margin: 0;

    color: #142019;

    font-size:
      clamp(
        31px,
        8vw,
        43px
      );

    line-height: 1;

    letter-spacing: -1.3px;
  }

  .kn-brand p {
    max-width: 500px;

    margin:
      9px 0 0;

    color: #69766f;

    font-size: 13.5px;

    line-height: 1.43;
  }

  /* =========================
     TARJETA
  ========================== */

  .kn-card {
    padding:
      21px 18px 20px;

    border:
      1px solid #dce6e0;

    border-radius: 23px;

    background:
      rgba(255,255,255,.98);

    box-shadow:
      0 13px 35px
      rgba(18,53,34,.07);
  }

  /* =========================
     PROGRESO
  ========================== */

  .kn-progress {
    width: 100%;

    display: grid;

    grid-template-columns:
      1fr auto;

    align-items: center;

    margin-bottom: 4px;
  }

  .kn-progress-item {
    display: flex;
    align-items: center;
  }

  .kn-progress-item.last {
    justify-content:
      flex-end;
  }

  .kn-progress-circle {
    width: 35px;
    height: 35px;

    flex: 0 0 auto;

    display: grid;
    place-items: center;

    border-radius: 50%;

    background: #e8eeea;

    color: #6c786f;

    font-size: 13px;

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
      0 5px 14px
      rgba(11,112,65,.20);
  }

  .kn-progress-line {
    height: 2px;

    flex: 1;

    margin:
      0 10px;

    border-radius:
      999px;

    background:
      linear-gradient(
        90deg,
        #0b7a4b 0%,
        #8bcbae 46%,
        #e2e9e5 100%
      );
  }

  .kn-step-label {
    margin:
      6px 0 17px;

    color: #718078;

    font-size: 10px;

    font-weight: 750;
  }

  /* =========================
     TÍTULO TARJETA
  ========================== */

  .kn-card-title {
    margin-bottom: 17px;
  }

  .kn-card-title > span {
    color: #0b7a4b;

    font-size: 9px;

    font-weight: 900;

    letter-spacing: 1px;
  }

  .kn-card-title h2 {
    margin:
      4px 0 4px;

    color: #17211c;

    font-size: 24px;

    line-height: 1.08;
  }

  .kn-card-title p {
    margin: 0;

    color: #77837c;

    font-size: 12px;

    line-height: 1.4;
  }

  /* =========================
     ALERTAS
  ========================== */

  .kn-alert {
    margin-bottom: 14px;

    padding:
      11px 12px;

    border-radius: 12px;

    font-size: 12px;

    font-weight: 750;

    line-height: 1.4;
  }

  .kn-alert.error {
    border:
      1px solid #fecaca;

    background: #fff4f4;

    color: #a32020;
  }

  .kn-alert.success {
    border:
      1px solid #b9e5cc;

    background: #effbf4;

    color: #087442;
  }

  /* =========================
     FORMULARIO
  ========================== */

  .kn-form {
    display: grid;

    gap: 12px;
  }

  .kn-field {
    display: grid;

    gap: 5px;

    min-width: 0;
  }

  .kn-field > span {
    color: #35443b;

    font-size: 11.5px;

    font-weight: 850;
  }

  .kn-two {
    display: grid;

    grid-template-columns:
      repeat(
        2,
        minmax(0,1fr)
      );

    gap: 9px;
  }

  .kn-field input {
    width: 100%;

    min-height: 48px;

    padding:
      0 13px;

    border:
      1px solid #cad6cf;

    outline: none;

    border-radius: 13px;

    background: #fff;

    color: #17211c;

    font-size: 15px;

    transition:
      border-color .18s ease,
      box-shadow .18s ease;
  }

  .kn-field input:focus {
    border-color:
      #0b7a4b;

    box-shadow:
      0 0 0 3px
      rgba(11,122,75,.09);
  }

  .kn-field input::placeholder {
    color: #a1aaa5;
  }

  /* =========================
     PASSWORD
  ========================== */

  .kn-password {
    min-height: 48px;

    display: grid;

    grid-template-columns:
      1fr auto;

    border:
      1px solid #cad6cf;

    border-radius: 13px;

    overflow: hidden;

    background: #fff;
  }

  .kn-password:focus-within {
    border-color:
      #0b7a4b;

    box-shadow:
      0 0 0 3px
      rgba(11,122,75,.09);
  }

  .kn-password input {
    min-height: 46px;

    border: 0;

    border-radius: 0;

    box-shadow:
      none !important;
  }

  .kn-password button {
    min-width: 58px;

    border: 0;

    background:
      transparent;

    color: #0b7a4b;

    font-size: 10px;

    font-weight: 900;

    cursor: pointer;
  }

  /* =========================
     SEGURIDAD
  ========================== */

  .kn-security {
    padding:
      10px 11px;

    display: flex;

    gap: 8px;

    align-items:
      flex-start;

    border-radius: 12px;

    background: #f0f8f4;
  }

  .kn-security > span {
    width: 21px;
    height: 21px;

    flex: 0 0 auto;

    display: grid;
    place-items: center;

    border-radius: 50%;

    background: #0b7a4b;

    color: #fff;

    font-size: 10px;

    font-weight: 900;
  }

  .kn-security p {
    margin:
      2px 0 0;

    color: #5e6e65;

    font-size: 10.5px;

    line-height: 1.4;
  }

  /* =========================
     BOTÓN PRINCIPAL
  ========================== */

  .kn-primary {
    width: 100%;

    min-height: 52px;

    margin-top: 2px;

    padding:
      0 18px;

    border: 0;

    border-radius: 14px;

    display: flex;

    justify-content: center;

    align-items: center;

    gap: 12px;

    background:
      linear-gradient(
        135deg,
        #075f39 0%,
        #0a834b 55%,
        #13a85f 100%
      );

    color: #fff;

    font-size: 15px;

    font-weight: 900;

    box-shadow:
      0 9px 21px
      rgba(11,122,75,.20);

    cursor: pointer;
  }

  .kn-primary strong {
    font-size: 20px;

    line-height: 1;
  }

  .kn-primary:disabled {
    opacity: .68;

    cursor:
      not-allowed;
  }

  /* =========================
     LOGIN
  ========================== */

  .kn-login {
    margin-top: 17px;

    display: flex;

    justify-content: center;

    align-items: center;

    gap: 4px;

    flex-wrap: wrap;

    color: #7c8781;

    font-size: 11px;
  }

  .kn-login button {
    padding: 0;

    border: 0;

    background:
      transparent;

    color: #087a47;

    font-weight: 900;

    cursor: pointer;
  }

  /* =========================
     FOOTER
  ========================== */

  .kn-footer {
    padding:
      19px 5px 8px;

    display: flex;

    justify-content: center;

    align-items: center;

    gap: 8px;

    color: #87928c;

    font-size: 8px;
  }

  .kn-footer img {
    width: 65px;

    height: auto;
  }

  /* =========================
     MÓVIL
  ========================== */

  @media (max-width: 480px) {
    .kn-header {
      min-height: 58px;

      padding-left: 11px;

      padding-right: 11px;
    }

    .kn-shell {
      padding:
        12px 11px 7px;
    }

    .kn-brand {
      padding:
        4px 3px 13px;
    }

    .kn-card {
      padding:
        19px 15px 18px;

      border-radius: 21px;
    }

    .kn-brand h1 {
      font-size: 31px;
    }

    .kn-brand p {
      font-size: 12.5px;
    }
  }

  @media (max-width: 370px) {
    .kn-business-badge {
      display: none;
    }

    .kn-header {
      grid-template-columns:
        38px 1fr 38px;
    }

    .kn-two {
      grid-template-columns:
        1fr;
    }

    .kn-brand h1 {
      font-size: 29px;
    }
  }
`;
