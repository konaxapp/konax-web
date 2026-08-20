"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function VerificarCorreoKonax() {
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState(Array(8).fill(""));
  const [cargando, setCargando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");

  const inputsRef = useRef([]);

  useEffect(() => {
    cargarCorreo();
  }, []);

  function cargarCorreo() {
    try {
      const params = new URLSearchParams(window.location.search);
      const correoUrl = params.get("correo") || "";

      if (correoUrl) {
        setCorreo(correoUrl.trim().toLowerCase());
        return;
      }

      const registro = sessionStorage.getItem("konaxNegociosRegistro");

      if (registro) {
        const datos = JSON.parse(registro);

        if (datos?.correo) {
          setCorreo(String(datos.correo).trim().toLowerCase());
        }
      }
    } catch (error) {
      console.error("Error cargando correo:", error);
    }
  }

  const codigoCompleto = useMemo(
    () => codigo.join(""),
    [codigo]
  );

  function actualizarDigito(index, valor) {
    const limpio = String(valor || "")
      .replace(/\D/g, "")
      .slice(-1);

    setCodigo((prev) => {
      const nuevo = [...prev];
      nuevo[index] = limpio;
      return nuevo;
    });

    setMensaje("");
    setTipoMensaje("");

    if (limpio && index < 7) {
      setTimeout(() => {
        inputsRef.current[index + 1]?.focus();
      }, 0);
    }
  }

  function manejarTecla(index, e) {
    if (
      e.key === "Backspace" &&
      !codigo[index] &&
      index > 0
    ) {
      inputsRef.current[index - 1]?.focus();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 7) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function manejarPegado(e) {
    e.preventDefault();

    const texto = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 8);

    if (!texto) return;

    const nuevo = Array(8).fill("");

    texto.split("").forEach((digito, index) => {
      nuevo[index] = digito;
    });

    setCodigo(nuevo);

    const posicion = Math.min(texto.length, 8) - 1;

    setTimeout(() => {
      inputsRef.current[posicion]?.focus();
    }, 0);
  }

  async function verificarCodigo(e) {
    e?.preventDefault();

    if (cargando) return;

    if (!correo) {
      setTipoMensaje("error");
      setMensaje(
        "No encontramos el correo del registro. Vuelve a registrarte."
      );
      return;
    }

    if (codigoCompleto.length !== 8) {
      setTipoMensaje("error");
      setMensaje("Ingresa los 8 dígitos del código.");
      return;
    }

    setCargando(true);
    setMensaje("");
    setTipoMensaje("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: correo,
        token: codigoCompleto,
        type: "email",
      });

      if (error) {
        console.error("Error verificando OTP:", error);

        const texto = String(error.message || "").toLowerCase();

        if (
          texto.includes("expired") ||
          texto.includes("token has expired")
        ) {
          setTipoMensaje("error");
          setMensaje(
            "El código venció. Solicita uno nuevo."
          );
          return;
        }

        if (
          texto.includes("invalid") ||
          texto.includes("token")
        ) {
          setTipoMensaje("error");
          setMensaje(
            "El código no es correcto. Revísalo e intenta nuevamente."
          );
          return;
        }

        setTipoMensaje("error");
        setMensaje(
          error.message ||
            "No se pudo verificar el correo."
        );
        return;
      }

      if (!data?.user) {
        setTipoMensaje("error");
        setMensaje(
          "No se pudo confirmar la cuenta."
        );
        return;
      }

      setTipoMensaje("success");
      setMensaje("Correo verificado correctamente.");

      sessionStorage.setItem(
        "konaxNegociosCorreoVerificado",
        "true"
      );

      setTimeout(() => {
        window.location.href = "/negocios/onboarding";
      }, 700);
    } catch (error) {
      console.error(error);

      setTipoMensaje("error");
      setMensaje(
        "Ocurrió un problema verificando el código."
      );
    } finally {
      setCargando(false);
    }
  }

  async function reenviarCodigo() {
    if (reenviando || !correo) return;

    setReenviando(true);
    setMensaje("");
    setTipoMensaje("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: correo,
      });

      if (error) {
        console.error("Error reenviando OTP:", error);

        setTipoMensaje("error");
        setMensaje(
          error.message ||
            "No se pudo reenviar el código."
        );
        return;
      }

      setCodigo(Array(8).fill(""));

      setTipoMensaje("success");
      setMensaje(
        "Te enviamos un nuevo código de 8 dígitos."
      );

      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 100);
    } catch (error) {
      console.error(error);

      setTipoMensaje("error");
      setMensaje(
        "No se pudo reenviar el código."
      );
    } finally {
      setReenviando(false);
    }
  }

  function volverRegistro() {
    window.location.href = "/negocios/registros";
  }

  return (
    <main className="kv-page">
      <style>{CSS}</style>

      <header className="kv-header">
        <button
          type="button"
          className="kv-back"
          onClick={volverRegistro}
          aria-label="Volver"
        >
          ←
        </button>

        <img
          src="/konax-logo.png"
          alt="KONAX"
          className="kv-logo"
        />

        <span className="kv-badge">
          Negocios
        </span>
      </header>

      <section className="kv-shell">
        <div className="kv-intro">
          <span>KONAX · VERIFICACIÓN</span>

          <h1>Verifica tu correo</h1>

          <p>
            Ingresa el código de 8 dígitos que enviamos a tu correo.
          </p>
        </div>

        <div className="kv-card">
          <div className="kv-progress">
            <div className="kv-progress-side">
              <span className="kv-circle done">
                ✓
              </span>

              <span className="kv-line active" />
            </div>

            <span className="kv-circle active">
              2
            </span>
          </div>

          <p className="kv-step">
            Paso 2 de 2 · Verificar correo
          </p>

          <div className="kv-icon">
            ✉
          </div>

          <div className="kv-title">
            <h2>Revisa tu correo</h2>

            <p>
              Enviamos un código a:
            </p>

            <strong>
              {correo || "tu correo electrónico"}
            </strong>
          </div>

          {mensaje && (
            <div
              className={
                tipoMensaje === "success"
                  ? "kv-alert success"
                  : "kv-alert error"
              }
            >
              {mensaje}
            </div>
          )}

          <form
            onSubmit={verificarCodigo}
            className="kv-form"
          >
            <label className="kv-code-label">
              Código de 8 dígitos
            </label>

            <div
              className="kv-code"
              onPaste={manejarPegado}
            >
              {codigo.map((digito, index) => (
                <input
                  key={index}
                  ref={(el) =>
                    (inputsRef.current[index] = el)
                  }
                  value={digito}
                  onChange={(e) =>
                    actualizarDigito(
                      index,
                      e.target.value
                    )
                  }
                  onKeyDown={(e) =>
                    manejarTecla(index, e)
                  }
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete={
                    index === 0
                      ? "one-time-code"
                      : "off"
                  }
                  aria-label={`Dígito ${index + 1}`}
                />
              ))}
            </div>

            <button
              type="submit"
              className="kv-primary"
              disabled={cargando}
            >
              {cargando
                ? "Verificando..."
                : "Verificar correo"}

              {!cargando && <strong>→</strong>}
            </button>
          </form>

          <div className="kv-resend">
            <span>
              ¿No recibiste el código?
            </span>

            <button
              type="button"
              onClick={reenviarCodigo}
              disabled={reenviando}
            >
              {reenviando
                ? "Enviando..."
                : "Reenviar código"}
            </button>
          </div>

          <div className="kv-help">
            <span>✓</span>

            <p>
              El código distingue tu cuenta y protege
              el registro de tu negocio.
            </p>
          </div>
        </div>

        <footer className="kv-footer">
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

  .kv-page {
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

  .kv-header {
    height: 55px;
    padding: 7px 13px;
    display: grid;
    grid-template-columns: 34px 1fr auto;
    align-items: center;
    gap: 7px;
    position: sticky;
    top: 0;
    z-index: 30;
    background: rgba(255,255,255,.98);
    border-bottom: 1px solid #e2e9e5;
  }

  .kv-back {
    width: 32px;
    height: 32px;
    border: 1px solid #e1e8e4;
    border-radius: 9px;
    background: #f5f8f6;
    color: #07804a;
    display: grid;
    place-items: center;
    font-size: 18px;
    font-weight: 900;
    cursor: pointer;
  }

  .kv-logo {
    width: min(128px, 38vw);
    max-height: 29px;
    object-fit: contain;
    justify-self: center;
  }

  .kv-badge {
    height: 27px;
    padding: 0 9px;
    display: flex;
    align-items: center;
    border: 1px solid #14935a;
    border-radius: 999px;
    background: #f4fbf7;
    color: #087b48;
    font-size: 9px;
    font-weight: 900;
  }

  .kv-shell {
    width: min(100%, 560px);
    margin: 0 auto;
    padding: 10px 10px 8px;
  }

  .kv-intro {
    padding: 3px 6px 10px;
  }

  .kv-intro > span {
    color: #087a47;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .kv-intro h1 {
    margin: 4px 0 3px;
    font-size: 27px;
    line-height: 1;
    letter-spacing: -1px;
  }

  .kv-intro p {
    margin: 0;
    color: #6d7972;
    font-size: 11.5px;
    line-height: 1.35;
  }

  .kv-card {
    padding: 16px 15px 17px;
    border: 1px solid #dbe5df;
    border-radius: 20px;
    background: #fff;
    box-shadow:
      0 10px 27px rgba(18,53,34,.06);
  }

  .kv-progress {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .kv-progress-side {
    display: flex;
    align-items: center;
  }

  .kv-circle {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #e8eeea;
    color: #66736b;
    font-size: 11px;
    font-weight: 900;
  }

  .kv-circle.active,
  .kv-circle.done {
    background:
      linear-gradient(
        145deg,
        #07703f,
        #10a15d
      );
    color: #fff;
  }

  .kv-line {
    height: 2px;
    flex: 1;
    margin: 0 9px;
    border-radius: 999px;
    background: #dbe8e1;
  }

  .kv-line.active {
    background:
      linear-gradient(
        90deg,
        #087b48,
        #12a65e
      );
  }

  .kv-step {
    margin: 5px 0 15px;
    color: #758179;
    font-size: 9.5px;
    font-weight: 700;
  }

  .kv-icon {
    width: 54px;
    height: 54px;
    margin: 2px auto 11px;
    display: grid;
    place-items: center;
    border-radius: 17px;
    background: #edf8f2;
    color: #087b48;
    font-size: 26px;
  }

  .kv-title {
    text-align: center;
    margin-bottom: 16px;
  }

  .kv-title h2 {
    margin: 0 0 5px;
    font-size: 22px;
  }

  .kv-title p {
    margin: 0;
    color: #7a867f;
    font-size: 11px;
  }

  .kv-title strong {
    display: block;
    margin-top: 3px;
    color: #087b48;
    font-size: 12px;
    word-break: break-word;
  }

  .kv-alert {
    margin-bottom: 12px;
    padding: 9px 10px;
    border-radius: 11px;
    font-size: 10.5px;
    font-weight: 750;
    line-height: 1.4;
  }

  .kv-alert.error {
    border: 1px solid #fecaca;
    background: #fff4f4;
    color: #a32020;
  }

  .kv-alert.success {
    border: 1px solid #b9e5cc;
    background: #effbf4;
    color: #087442;
  }

  .kv-form {
    display: grid;
    gap: 13px;
  }

  .kv-code-label {
    text-align: center;
    color: #35443b;
    font-size: 11px;
    font-weight: 900;
  }

  .kv-code {
    display: grid;
    grid-template-columns:
      repeat(8,minmax(0,1fr));
    gap: 5px;
  }

  .kv-code input {
    width: 100%;
    min-width: 0;
    height: 48px;
    padding: 0;
    border: 1px solid #cbd6d0;
    border-radius: 10px;
    outline: none;
    background: #fff;
    color: #17211c;
    text-align: center;
    font-size: 18px;
    font-weight: 900;
  }

  .kv-code input:focus {
    border-color: #0a854d;
    box-shadow:
      0 0 0 3px rgba(10,133,77,.09);
  }

  .kv-primary {
    width: 100%;
    height: 48px;
    border: 0;
    border-radius: 14px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
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
    cursor: pointer;
  }

  .kv-primary strong {
    font-size: 19px;
  }

  .kv-primary:disabled {
    opacity: .6;
  }

  .kv-resend {
    margin-top: 15px;
    display: flex;
    justify-content: center;
    gap: 4px;
    flex-wrap: wrap;
    color: #858e89;
    font-size: 10.5px;
  }

  .kv-resend button {
    border: 0;
    padding: 0;
    background: transparent;
    color: #087b48;
    font-weight: 900;
    cursor: pointer;
  }

  .kv-help {
    margin-top: 14px;
    padding: 9px 10px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    border-radius: 12px;
    background: #eff8f3;
  }

  .kv-help > span {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #0a8b50;
    color: #fff;
    font-size: 10px;
    font-weight: 900;
  }

  .kv-help p {
    margin: 1px 0 0;
    color: #5f6d65;
    font-size: 9.5px;
    line-height: 1.35;
  }

  .kv-footer {
    padding: 16px 0 7px;
    display: flex;
    justify-content: center;
  }

  .kv-footer img {
    width: 95px;
  }

  @media (max-width: 390px) {
    .kv-header {
      height: 52px;
    }

    .kv-logo {
      width: 112px;
    }

    .kv-shell {
      padding: 8px 8px 6px;
    }

    .kv-card {
      padding: 14px 12px 15px;
      border-radius: 18px;
    }

    .kv-intro h1 {
      font-size: 24px;
    }

    .kv-code {
      gap: 4px;
    }

    .kv-code input {
      height: 45px;
      border-radius: 9px;
      font-size: 16px;
    }
  }

  @media (max-width: 350px) {
    .kv-badge {
      display: none;
    }

    .kv-header {
      grid-template-columns:
        34px 1fr 34px;
    }

    .kv-code {
      gap: 3px;
    }

    .kv-code input {
      height: 42px;
      font-size: 15px;
    }
  }
`;
