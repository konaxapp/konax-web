"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";

const VERSION = "2026.08.19-KONAX-NEGOCIOS-VERIFICAR-V1";

export default function VerificarNegocios() {
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState(["", "", "", "", "", ""]);
  const [cargando, setCargando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");

  const refs = useRef([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const correoUrl = params.get("correo") || "";

    let correoRegistro = "";

    try {
      const guardado = sessionStorage.getItem("konaxNegociosRegistro");

      if (guardado) {
        const datos = JSON.parse(guardado);
        correoRegistro = datos?.correo || "";
      }
    } catch (error) {
      console.error("No se pudo leer el registro temporal:", error);
    }

    setCorreo(correoUrl || correoRegistro);
  }, []);

  function cambiarCodigo(index, valor) {
    const limpio = String(valor || "")
      .replace(/\D/g, "")
      .slice(-1);

    setCodigo((prev) => {
      const copia = [...prev];
      copia[index] = limpio;
      return copia;
    });

    if (limpio && index < 5) {
      refs.current[index + 1]?.focus();
    }

    if (mensaje) {
      setMensaje("");
      setTipoMensaje("");
    }
  }

  function manejarTecla(index, e) {
    if (
      e.key === "Backspace" &&
      !codigo[index] &&
      index > 0
    ) {
      refs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
  }

  function manejarPegado(e) {
    e.preventDefault();

    const texto = String(
      e.clipboardData.getData("text") || ""
    )
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!texto) return;

    const nuevos = ["", "", "", "", "", ""];

    texto.split("").forEach((numero, index) => {
      nuevos[index] = numero;
    });

    setCodigo(nuevos);

    const ultimoIndex = Math.min(texto.length, 6) - 1;

    setTimeout(() => {
      refs.current[ultimoIndex]?.focus();
    }, 0);
  }

  async function crearEmpresaDespuesDeVerificar() {
    let registro = null;

    try {
      const guardado = sessionStorage.getItem(
        "konaxNegociosRegistro"
      );

      if (guardado) {
        registro = JSON.parse(guardado);
      }
    } catch (error) {
      console.error(error);
    }

    if (!registro) {
      throw new Error(
        "No encontramos los datos del registro. Vuelve a iniciar el proceso."
      );
    }

    const nombreCompleto =
      registro.nombreCompleto ||
      `${registro.nombre || ""} ${registro.apellido || ""}`.trim();

    const { data, error } = await supabase.rpc(
      "crear_empresa_konax_negocios",
      {
        p_nombre_usuario: nombreCompleto,
        p_correo: registro.correo || correo,
        p_telefono: registro.telefono || "",
        p_nombre_empresa: null,
      }
    );

    if (error) {
      throw error;
    }

    const resultado = Array.isArray(data)
      ? data[0]
      : data;

    if (!resultado?.empresa_id) {
      throw new Error(
        "La cuenta fue verificada, pero no se pudo crear el negocio."
      );
    }

    localStorage.setItem(
      "empresaId",
      resultado.empresa_id
    );

    localStorage.setItem(
      "empresaNombre",
      resultado.empresa_nombre || "Mi negocio"
    );

    if (resultado.usuario_id) {
      localStorage.setItem(
        "usuarioId",
        resultado.usuario_id
      );
    }

    localStorage.setItem(
      "usuarioNombre",
      nombreCompleto
    );

    localStorage.setItem(
      "usuarioCorreo",
      registro.correo || correo
    );

    localStorage.setItem(
      "usuarioRol",
      "administrador"
    );

    localStorage.setItem(
      "konaxOrigen",
      "konax_negocios"
    );

    sessionStorage.removeItem(
      "konaxNegociosAuthUserId"
    );
  }

  async function verificar() {
    if (cargando) return;

    const token = codigo.join("");

    if (token.length !== 6) {
      setTipoMensaje("error");
      setMensaje("Escribe el código completo de 6 dígitos.");
      return;
    }

    if (!correo) {
      setTipoMensaje("error");
      setMensaje(
        "No encontramos el correo del registro."
      );
      return;
    }

    setCargando(true);
    setMensaje("");
    setTipoMensaje("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: correo.trim().toLowerCase(),
        token,
        type: "signup",
      });

      if (error) {
        console.error("Error OTP:", error);

        setTipoMensaje("error");

        const texto = String(
          error.message || ""
        ).toLowerCase();

        if (
          texto.includes("expired") ||
          texto.includes("otp_expired")
        ) {
          setMensaje(
            "El código venció. Solicita uno nuevo."
          );
        } else if (
          texto.includes("invalid") ||
          texto.includes("token")
        ) {
          setMensaje(
            "El código no es válido. Revísalo e intenta nuevamente."
          );
        } else {
          setMensaje(
            error.message ||
              "No se pudo verificar el código."
          );
        }

        return;
      }

      if (!data?.session?.user?.id) {
        setTipoMensaje("error");
        setMensaje(
          "El correo fue verificado, pero no se pudo iniciar la sesión."
        );
        return;
      }

      await crearEmpresaDespuesDeVerificar();

      setTipoMensaje("success");
      setMensaje(
        "Correo verificado. Estamos preparando tu negocio."
      );

      setTimeout(() => {
        window.location.href =
          "/negocios/onboarding";
      }, 700);
    } catch (error) {
      console.error(error);

      setTipoMensaje("error");
      setMensaje(
        error?.message ||
          "Ocurrió un problema verificando tu cuenta."
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
        email: correo.trim().toLowerCase(),
      });

      if (error) {
        console.error(error);

        setTipoMensaje("error");
        setMensaje(
          error.message ||
            "No se pudo reenviar el código."
        );
        return;
      }

      setTipoMensaje("success");
      setMensaje(
        "Te enviamos un nuevo código al correo."
      );

      setCodigo(["", "", "", "", "", ""]);

      setTimeout(() => {
        refs.current[0]?.focus();
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
    window.location.href = "/negocios/registro";
  }

  function iniciarSesion() {
    window.location.href = "/login";
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
          ‹
        </button>

        <img
          src="/konax-logo.png"
          alt="KONAX"
          className="kv-logo"
        />

        <div className="kv-header-space" />
      </header>

      <section className="kv-shell">
        <div className="kv-card">
          <div className="kv-progress">
            <div className="kv-progress-item">
              <span className="kv-progress-circle done">
                ✓
              </span>

              <span className="kv-progress-line done" />
            </div>

            <div className="kv-progress-item last">
              <span className="kv-progress-circle active">
                2
              </span>
            </div>
          </div>

          <p className="kv-step-label">
            Paso 2 de 2 · Verificar correo
          </p>

          <div className="kv-icon">
            ✉
          </div>

          <h1>Verifica tu correo</h1>

          <p className="kv-subtitle">
            Te enviamos un código de 6 dígitos a
          </p>

          <strong className="kv-email">
            {correo || "tu correo electrónico"}
          </strong>

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

          <div className="kv-code-label">
            Código de 6 dígitos
          </div>

          <div
            className="kv-code"
            onPaste={manejarPegado}
          >
            {codigo.map((valor, index) => (
              <input
                key={index}
                ref={(elemento) => {
                  refs.current[index] = elemento;
                }}
                value={valor}
                onChange={(e) =>
                  cambiarCodigo(
                    index,
                    e.target.value
                  )
                }
                onKeyDown={(e) =>
                  manejarTecla(index, e)
                }
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={
                  index === 0
                    ? "one-time-code"
                    : "off"
                }
                maxLength={1}
                aria-label={`Dígito ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="kv-primary"
            onClick={verificar}
            disabled={cargando}
          >
            {cargando
              ? "Verificando..."
              : "Verificar"}
          </button>

          <div className="kv-resend">
            <span>¿El código no funcionó?</span>

            <button
              type="button"
              onClick={reenviarCodigo}
              disabled={reenviando}
            >
              {reenviando
                ? "Reenviando..."
                : "Reenviar nuevo código"}
            </button>
          </div>

          <div className="kv-login">
            <span>¿Ya tienes cuenta?</span>

            <button
              type="button"
              onClick={iniciarSesion}
            >
              Inicia sesión
            </button>
          </div>
        </div>

        <footer className="kv-footer">
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

  .kv-page {
    min-height: 100vh;
    width: 100%;
    background:
      radial-gradient(
        circle at 10% 100%,
        rgba(12,128,75,.15),
        transparent 32%
      ),
      radial-gradient(
        circle at 100% 5%,
        rgba(17,174,98,.12),
        transparent 28%
      ),
      linear-gradient(
        160deg,
        #e9f5ee 0%,
        #f8faf9 42%,
        #edf4f0 100%
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

  .kv-header {
    height: 78px;
    padding:
      max(12px, env(safe-area-inset-top))
      20px
      10px;
    display: grid;
    grid-template-columns: 48px 1fr 48px;
    align-items: center;
    border-bottom: 1px solid #dfe8e3;
    background: rgba(255,255,255,.94);
    backdrop-filter: blur(14px);
  }

  .kv-back {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: #eff4f1;
    color: #17211c;
    font-size: 37px;
    line-height: 1;
    cursor: pointer;
  }

  .kv-logo {
    width: min(190px, 55vw);
    max-height: 48px;
    object-fit: contain;
    justify-self: center;
  }

  .kv-header-space {
    width: 44px;
  }

  .kv-shell {
    width: min(100%, 580px);
    margin: 0 auto;
    padding: 28px 16px 8px;
  }

  .kv-card {
    padding: 28px 22px 27px;
    border: 1px solid #dce6e0;
    border-radius: 29px;
    background: rgba(255,255,255,.97);
    box-shadow:
      0 20px 55px rgba(12,63,37,.13);
    text-align: center;
  }

  .kv-progress {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    margin-bottom: 8px;
  }

  .kv-progress-item {
    display: flex;
    align-items: center;
  }

  .kv-progress-item.last {
    justify-content: flex-end;
  }

  .kv-progress-circle {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #e7ede9;
    color: #69756e;
    font-size: 16px;
    font-weight: 900;
  }

  .kv-progress-circle.active {
    background:
      linear-gradient(
        145deg,
        #086b3f,
        #10a25c
      );
    color: #fff;
    box-shadow:
      0 7px 18px rgba(11,112,65,.22);
  }

  .kv-progress-circle.done {
    background: #daf2e4;
    color: #087442;
  }

  .kv-progress-line {
    height: 3px;
    flex: 1;
    margin: 0 12px;
    border-radius: 999px;
    background: #e0e8e3;
  }

  .kv-progress-line.done {
    background:
      linear-gradient(
        90deg,
        #087442,
        #12a55e
      );
  }

  .kv-step-label {
    margin: 8px 0 25px;
    color: #75827a;
    font-size: 12px;
    font-weight: 700;
    text-align: left;
  }

  .kv-icon {
    width: 68px;
    height: 68px;
    margin: 2px auto 15px;
    display: grid;
    place-items: center;
    border-radius: 20px;
    background:
      linear-gradient(
        145deg,
        #e3f6eb,
        #f5fbf7
      );
    color: #0a7b48;
    font-size: 34px;
    box-shadow:
      inset 0 0 0 1px #d1e9dc;
  }

  .kv-card h1 {
    margin: 0;
    color: #152019;
    font-size: 32px;
    line-height: 1.08;
  }

  .kv-subtitle {
    margin: 11px 0 3px;
    color: #717d76;
    font-size: 14px;
    line-height: 1.45;
  }

  .kv-email {
    display: block;
    max-width: 100%;
    margin-bottom: 23px;
    color: #27342d;
    font-size: 14px;
    word-break: break-word;
  }

  .kv-alert {
    margin: 0 0 18px;
    padding: 13px 14px;
    border-radius: 13px;
    font-size: 13px;
    font-weight: 750;
    line-height: 1.4;
    text-align: left;
  }

  .kv-alert.error {
    border: 1px solid #fecaca;
    background: #fff3f3;
    color: #9e2222;
  }

  .kv-alert.success {
    border: 1px solid #b8e4cb;
    background: #effbf4;
    color: #087442;
  }

  .kv-code-label {
    margin-bottom: 13px;
    color: #35433b;
    font-size: 14px;
    font-weight: 850;
  }

  .kv-code {
    display: grid;
    grid-template-columns:
      repeat(6,minmax(0,1fr));
    gap: 8px;
    margin-bottom: 22px;
  }

  .kv-code input {
    width: 100%;
    min-width: 0;
    aspect-ratio: .82;
    max-height: 68px;
    border: 1.5px solid #c9d5ce;
    outline: none;
    border-radius: 15px;
    background: #fff;
    color: #17211c;
    text-align: center;
    font-size: 24px;
    font-weight: 900;
    transition:
      border-color .18s ease,
      box-shadow .18s ease,
      transform .18s ease;
  }

  .kv-code input:focus {
    border-color: #0b7a4b;
    box-shadow:
      0 0 0 4px rgba(11,122,75,.10);
    transform: translateY(-1px);
  }

  .kv-primary {
    width: 100%;
    min-height: 58px;
    border: 0;
    border-radius: 17px;
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

  .kv-primary:disabled {
    opacity: .68;
    cursor: not-allowed;
  }

  .kv-resend {
    margin-top: 25px;
    display: grid;
    justify-items: center;
    gap: 9px;
  }

  .kv-resend > span {
    color: #737f78;
    font-size: 13px;
  }

  .kv-resend button {
    min-height: 43px;
    padding: 0 17px;
    border: 1px solid #bddfca;
    border-radius: 999px;
    background: #effbf4;
    color: #087442;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
  }

  .kv-resend button:disabled {
    opacity: .65;
  }

  .kv-login {
    margin-top: 28px;
    display: flex;
    justify-content: center;
    gap: 5px;
    flex-wrap: wrap;
    color: #7c8781;
    font-size: 13px;
  }

  .kv-login button {
    padding: 0;
    border: 0;
    background: transparent;
    color: #087a47;
    font-weight: 900;
    cursor: pointer;
  }

  .kv-footer {
    padding: 25px 5px 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    color: #87928c;
    font-size: 9px;
  }

  .kv-footer img {
    width: 78px;
    height: auto;
  }

  @media (max-width: 480px) {
    .kv-header {
      height: 72px;
      padding-left: 14px;
      padding-right: 14px;
    }

    .kv-shell {
      padding: 20px 13px 8px;
    }

    .kv-card {
      padding: 25px 17px 24px;
      border-radius: 25px;
    }

    .kv-code {
      gap: 6px;
    }

    .kv-code input {
      border-radius: 13px;
      font-size: 22px;
    }
  }

  @media (max-width: 360px) {
    .kv-code {
      gap: 4px;
    }

    .kv-code input {
      border-radius: 11px;
      font-size: 20px;
    }
  }
`;
