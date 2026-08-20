"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

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
        console.log("Sesión activa:", session.user.id);
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
      setMensaje("Cuenta creada. Vamos a verificar tu correo.");

      setTimeout(() => {
        window.location.href = `/negocios/verificar?correo=${encodeURIComponent(
          correo
        )}`;
      }, 600);
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
          ←
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

        <div className="kn-intro">
          <span>KONAX · NEGOCIOS</span>

          <h1>Registra tu negocio</h1>

          <p>
            Crea tu cuenta y empieza a configurar tu negocio en KONAX.
          </p>
        </div>

        <div className="kn-card">

          <div className="kn-progress">
            <div className="kn-progress-side">
              <span className="kn-progress-circle active">
                1
              </span>

              <span className="kn-progress-line" />
            </div>

            <span className="kn-progress-circle">
              2
            </span>
          </div>

          <p className="kn-step">
            Paso 1 de 2 · Datos de tu cuenta
          </p>

          <div className="kn-title">
            <h2>Datos del propietario</h2>

            <p>
              Utiliza estos datos para ingresar a KONAX Negocios.
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
                  {mostrarPassword ? "Ocultar" : "Ver"}
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
                    setMostrarConfirmar(
                      (prev) => !prev
                    )
                  }
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
              {cargando
                ? "Creando cuenta..."
                : "Continuar"}

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
    background: #f3f7f5;
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
      linear-gradient(
        180deg,
        #f9fbfa 0%,
        #eef6f2 100%
      );

    color: #18231d;

    font-family:
      Arial,
      Helvetica,
      sans-serif;
  }

  /* HEADER COMPACTO */

  .kn-header {
    height: 55px;

    padding:
      7px 13px;

    display: grid;

    grid-template-columns:
      34px
      1fr
      auto;

    align-items: center;

    gap: 7px;

    position: sticky;

    top: 0;

    z-index: 30;

    background:
      rgba(255,255,255,.98);

    border-bottom:
      1px solid #e2e9e5;

    box-shadow:
      0 2px 10px
      rgba(20,60,38,.04);
  }

  .kn-back {
    width: 32px;
    height: 32px;

    border:
      1px solid #e1e8e4;

    border-radius: 9px;

    background: #f5f8f6;

    color: #07804a;

    display: grid;

    place-items: center;

    font-size: 19px;

    font-weight: 900;

    cursor: pointer;
  }

  .kn-logo {
    width:
      min(128px, 38vw);

    max-height: 29px;

    object-fit: contain;

    justify-self: center;
  }

  .kn-business-badge {
    height: 27px;

    padding:
      0 9px;

    display: flex;

    align-items: center;

    border:
      1px solid #14935a;

    border-radius: 999px;

    background: #f4fbf7;

    color: #087b48;

    font-size: 9px;

    font-weight: 900;
  }

  /* CONTENEDOR */

  .kn-shell {
    width:
      min(100%, 560px);

    margin:
      0 auto;

    padding:
      10px 10px 8px;
  }

  /* INTRO PEQUEÑA */

  .kn-intro {
    padding:
      3px 6px 10px;
  }

  .kn-intro > span {
    color: #087a47;

    font-size: 9px;

    font-weight: 900;

    letter-spacing: 1px;
  }

  .kn-intro h1 {
    margin:
      4px 0 3px;

    color: #17211c;

    font-size: 27px;

    line-height: 1;

    letter-spacing: -1px;
  }

  .kn-intro p {
    margin: 0;

    color: #6d7972;

    font-size: 11.5px;

    line-height: 1.35;
  }

  /* TARJETA */

  .kn-card {
    padding:
      16px 15px 17px;

    border:
      1px solid #dbe5df;

    border-radius: 20px;

    background: #fff;

    box-shadow:
      0 10px 27px
      rgba(18,53,34,.06);
  }

  /* PASOS */

  .kn-progress {
    display: grid;

    grid-template-columns:
      1fr auto;

    align-items: center;
  }

  .kn-progress-side {
    display: flex;

    align-items: center;
  }

  .kn-progress-circle {
    width: 31px;
    height: 31px;

    display: grid;

    place-items: center;

    flex:
      0 0 auto;

    border-radius: 50%;

    background: #e8eeea;

    color: #66736b;

    font-size: 11px;

    font-weight: 900;
  }

  .kn-progress-circle.active {
    background:
      linear-gradient(
        145deg,
        #07703f,
        #10a15d
      );

    color: white;
  }

  .kn-progress-line {
    height: 2px;

    flex: 1;

    margin:
      0 9px;

    background:
      linear-gradient(
        90deg,
        #087b48,
        #dbe8e1
      );

    border-radius:
      999px;
  }

  .kn-step {
    margin:
      5px 0 12px;

    color: #758179;

    font-size: 9.5px;

    font-weight: 700;
  }

  /* TÍTULO */

  .kn-title {
    margin-bottom: 13px;
  }

  .kn-title h2 {
    margin:
      0 0 3px;

    color: #17211c;

    font-size: 21px;
  }

  .kn-title p {
    margin: 0;

    color: #77847c;

    font-size: 10.5px;

    line-height: 1.35;
  }

  /* ALERTAS */

  .kn-alert {
    margin-bottom: 11px;

    padding:
      9px 10px;

    border-radius: 11px;

    font-size: 10.5px;

    font-weight: 750;
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

  /* FORM */

  .kn-form {
    display: grid;

    gap: 10px;
  }

  .kn-field {
    display: grid;

    gap: 4px;
  }

  .kn-field > span {
    color: #344139;

    font-size: 10.5px;

    font-weight: 900;
  }

  .kn-two {
    display: grid;

    grid-template-columns:
      repeat(
        2,
        minmax(0,1fr)
      );

    gap: 8px;
  }

  .kn-field input {
    width: 100%;

    height: 43px;

    padding:
      0 12px;

    border:
      1px solid #cad5cf;

    border-radius: 12px;

    outline: none;

    background: #fff;

    color: #17211c;

    font-size: 14px;
  }

  .kn-field input:focus {
    border-color:
      #0a854d;

    box-shadow:
      0 0 0 3px
      rgba(10,133,77,.08);
  }

  .kn-field input::placeholder {
    color: #a7afaa;
  }

  /* PASSWORD */

  .kn-password {
    height: 43px;

    display: grid;

    grid-template-columns:
      1fr auto;

    border:
      1px solid #cad5cf;

    border-radius: 12px;

    overflow: hidden;

    background: #fff;
  }

  .kn-password:focus-within {
    border-color:
      #0a854d;

    box-shadow:
      0 0 0 3px
      rgba(10,133,77,.08);
  }

  .kn-password input {
    height: 41px;

    border: 0;

    border-radius: 0;

    box-shadow:
      none !important;
  }

  .kn-password button {
    min-width: 51px;

    padding:
      0 9px;

    border: 0;

    background: transparent;

    color: #08814b;

    font-size: 9.5px;

    font-weight: 900;

    cursor: pointer;
  }

  /* AVISO */

  .kn-security {
    padding:
      9px 10px;

    display: flex;

    align-items:
      flex-start;

    gap: 8px;

    border-radius: 12px;

    background: #eff8f3;
  }

  .kn-security > span {
    width: 20px;
    height: 20px;

    flex:
      0 0 auto;

    display: grid;

    place-items: center;

    border-radius: 50%;

    background: #0a8b50;

    color: white;

    font-size: 10px;

    font-weight: 900;
  }

  .kn-security p {
    margin:
      1px 0 0;

    color: #5f6d65;

    font-size: 9.5px;

    line-height: 1.35;
  }

  /* CONTINUAR */

  .kn-primary {
    width: 100%;

    height: 48px;

    padding:
      0 17px;

    border: 0;

    border-radius: 14px;

    display: flex;

    align-items: center;

    justify-content: center;

    gap: 11px;

    background:
      linear-gradient(
        135deg,
        #077240,
        #0b914f,
        #15b564
      );

    color: #fff;

    font-size: 14px;

    font-weight: 900;

    box-shadow:
      0 8px 18px
      rgba(10,137,78,.18);

    cursor: pointer;
  }

  .kn-primary strong {
    font-size: 20px;
  }

  .kn-primary:disabled {
    opacity: .6;
  }

  /* LOGIN */

  .kn-login {
    margin-top: 13px;

    display: flex;

    justify-content: center;

    gap: 4px;

    color: #858e89;

    font-size: 10.5px;
  }

  .kn-login button {
    padding: 0;

    border: 0;

    background: transparent;

    color: #087b48;

    font-weight: 900;
  }

  /* FOOTER SOLO LOGO */

  .kn-footer {
    padding:
      16px 0 7px;

    display: flex;

    justify-content: center;
  }

  .kn-footer img {
    width: 95px;

    height: auto;
  }

  /* TELÉFONOS PEQUEÑOS */

  @media (max-width: 390px) {

    .kn-header {
      height: 52px;
    }

    .kn-logo {
      width: 112px;
    }

    .kn-shell {
      padding:
        8px 8px 6px;
    }

    .kn-card {
      padding:
        14px 13px 15px;

      border-radius: 18px;
    }

    .kn-intro h1 {
      font-size: 24px;
    }

    .kn-intro p {
      font-size: 10.5px;
    }

    .kn-field input,
    .kn-password {
      height: 41px;
    }

    .kn-password input {
      height: 39px;
    }

    .kn-primary {
      height: 46px;
    }
  }

  @media (max-width: 350px) {

    .kn-business-badge {
      display: none;
    }

    .kn-header {
      grid-template-columns:
        34px 1fr 34px;
    }

    .kn-two {
      grid-template-columns: 1fr;
    }
  }
`;
