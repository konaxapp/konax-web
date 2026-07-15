"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordarme, setRecordarme] = useState(true);

  function fechaHoy() {
    return new Date().toISOString().split("T")[0];
  }

  async function suspenderEmpresa(empresa) {
    const { error: errorSuspension } = await supabase
      .from("empresas")
      .update({
        estado: "Suspendido",
        estado_plan: "Suspendido",
        estado_pago: "Pendiente",
      })
      .eq("id", empresa.id);

    if (errorSuspension) {
      console.error(
        "Error suspendiendo empresa:",
        errorSuspension.message
      );
      return;
    }

    const { error: errorBitacora } = await supabase
      .from("bitacora_konax")
      .insert([
        {
          empresa_id: empresa.id,
          empresa_nombre: empresa.nombre,
          accion: "Suspensión automática",
          descripcion: `La empresa ${empresa.nombre} fue suspendida automáticamente por vencimiento de facturación.`,
          estado_anterior: empresa.estado,
          estado_nuevo: "Suspendido",
          usuario: "Sistema KONAX",
        },
      ]);

    if (errorBitacora) {
      console.error(
        "Error registrando suspensión en bitácora:",
        errorBitacora.message
      );
    }
  }

  function limpiarSesionAnterior() {
    localStorage.clear();
  }

  function guardarSesion(usuario, empresa) {
    localStorage.setItem(
      "empresaId",
      String(usuario.empresa_id || "")
    );
    localStorage.setItem(
      "empresaNombre",
      String(empresa.nombre || "")
    );

    localStorage.setItem(
      "usuarioId",
      String(usuario.id || "")
    );
    localStorage.setItem(
      "usuarioNombre",
      String(usuario.nombre || "")
    );
    localStorage.setItem(
      "usuarioCorreo",
      String(usuario.correo || "")
    );
    localStorage.setItem(
      "usuarioRol",
      String(usuario.rol || "")
    );
    localStorage.setItem(
      "rolId",
      String(usuario.rol_id || "")
    );

    localStorage.setItem(
      "tipoNegocio",
      String(empresa.tipo_negocio || "")
    );

    localStorage.setItem(
      "categoriaNegocio",
      String(empresa.categoria_negocio || "")
    );

    localStorage.setItem(
      "planCodigo",
      String(empresa.plan_codigo || "")
    );

    localStorage.setItem(
      "planNombre",
      String(empresa.plan_nombre || "")
    );

    localStorage.setItem(
      "estadoPlan",
      String(empresa.estado_plan || "")
    );

    localStorage.setItem(
      "estadoEmpresa",
      String(empresa.estado || "")
    );

    localStorage.setItem(
      "recordarme",
      recordarme ? "true" : "false"
    );
  }

  async function iniciarSesion() {
    if (cargando) return;

    if (!correo.trim() || !password.trim()) {
      alert("Ingrese correo y contraseña.");
      return;
    }

    setCargando(true);

    try {
      const correoLimpio = correo.trim().toLowerCase();
      const passwordLimpio = password.trim();

      const { data: usuario, error: errorUsuario } =
        await supabase
          .from("usuarios")
          .select("*")
          .eq("correo", correoLimpio)
          .eq("password", passwordLimpio)
          .eq("estado", "Activo")
          .maybeSingle();

      if (errorUsuario) {
        alert(
          "Error iniciando sesión: " +
            errorUsuario.message
        );
        return;
      }

      if (!usuario) {
        alert("Usuario o contraseña incorrectos.");
        return;
      }

      if (!usuario.empresa_id) {
        alert("Este usuario no tiene empresa asignada.");
        return;
      }

      const { data: empresa, error: errorEmpresa } =
        await supabase
          .from("empresas")
          .select("*")
          .eq("id", usuario.empresa_id)
          .maybeSingle();

      if (errorEmpresa) {
        alert(
          "Error verificando empresa: " +
            errorEmpresa.message
        );
        return;
      }

      if (!empresa) {
        alert(
          "La empresa asignada al usuario no existe."
        );
        return;
      }

      const hoy = fechaHoy();
      const vencimiento =
        empresa.fecha_proxima_facturacion;

      const estaVencida =
        Boolean(vencimiento) &&
        hoy > vencimiento &&
        empresa.estado_pago !== "Al día";

      if (
        empresa.estado === "Suspendido" ||
        empresa.estado_plan === "Suspendido" ||
        estaVencida
      ) {
        if (
          estaVencida &&
          empresa.estado_plan !== "Suspendido"
        ) {
          await suspenderEmpresa(empresa);
        }

        alert(
          "El servicio de esta empresa está suspendido por facturación pendiente. Contacte a KONAX."
        );

        return;
      }

      limpiarSesionAnterior();
      guardarSesion(usuario, empresa);

      const empresaSesion =
        localStorage.getItem("empresaId");
      const usuarioSesion =
        localStorage.getItem("usuarioId");
      const rolSesion =
        localStorage.getItem("usuarioRol");

      if (
        !empresaSesion ||
        !usuarioSesion ||
        !rolSesion
      ) {
        limpiarSesionAnterior();

        alert(
          "No fue posible crear correctamente la sesión."
        );

        return;
      }

      const rolNormalizado = String(
        usuario.rol || ""
      )
        .toLowerCase()
        .trim();

      if (rolNormalizado === "superadmin") {
        router.replace("/admin");
        return;
      }

      router.replace("/dashboard");
    } catch (errorGeneral) {
      console.error(
        "Error inesperado en Login:",
        errorGeneral
      );

      alert(
        "Ocurrió un error inesperado al iniciar sesión."
      );
    } finally {
      setCargando(false);
    }
  }

  function manejarTecla(evento) {
    if (evento.key === "Enter" && !cargando) {
      iniciarSesion();
    }
  }

  function solicitarDemo() {
    window.open(
      "https://wa.me/50760211024?text=Hola,%20quiero%20solicitar%20una%20demostración%20de%20KONAX.",
      "_blank",
      "noopener,noreferrer"
    );
  }

  function recuperarPassword() {
    alert(
      "Para recuperar su contraseña, contacte al administrador de su empresa o al soporte de KONAX."
    );
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="commercial-panel">
          <div className="brand-block">
            <img
              src="/konax-logo-final.png"
              alt="KONAX"
              className="brand-logo"
            />

            <h1>
              Controla tu negocio,
              <span> vende más, cobra mejor.</span>
            </h1>

            <p className="commercial-copy">
              La plataforma todo en uno para gestionar
              ventas a crédito, cobranza, clientes y
              reportes desde un solo lugar.
            </p>
          </div>

          <div className="benefits-list">
            <article className="benefit-item">
              <div className="benefit-icon">👥</div>
              <div>
                <h3>Clientes y créditos</h3>
                <p>
                  Organiza tu cartera y conoce el estado
                  de cada cliente.
                </p>
              </div>
            </article>

            <article className="benefit-item">
              <div className="benefit-icon">💲</div>
              <div>
                <h3>Cobranza eficiente</h3>
                <p>
                  Gestiona abonos, promesas de pago y
                  controla la mora en tiempo real.
                </p>
              </div>
            </article>

            <article className="benefit-item">
              <div className="benefit-icon">📊</div>
              <div>
                <h3>Reportes e indicadores</h3>
                <p>
                  Toma mejores decisiones con información
                  clara y actualizada.
                </p>
              </div>
            </article>

            <article className="benefit-item">
              <div className="benefit-icon">🔒</div>
              <div>
                <h3>Seguridad y respaldo</h3>
                <p>
                  Tu información siempre protegida y
                  disponible.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="form-panel">
          <div className="login-card">
            <div className="mobile-brand">
              <img
                src="/konax-logo-final.png"
                alt="KONAX"
              />
            </div>

            <div className="form-heading">
              <span>Bienvenido a</span>

              <img
                src="/konax-logo-final.png"
                alt="KONAX"
                className="form-logo"
              />

              <p>Ingresa a tu cuenta empresarial</p>
            </div>

            <div className="field-group">
              <label htmlFor="correo">
                Correo electrónico
              </label>

              <div className="input-wrap">
                <span className="input-icon">✉</span>

                <input
                  id="correo"
                  type="email"
                  placeholder="correo@empresa.com"
                  value={correo}
                  onChange={(e) =>
                    setCorreo(e.target.value)
                  }
                  onKeyDown={manejarTecla}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="password">
                Contraseña
              </label>

              <div className="input-wrap">
                <span className="input-icon">🔒</span>

                <input
                  id="password"
                  type={
                    mostrarPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  onKeyDown={manejarTecla}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setMostrarPassword(
                      (valor) => !valor
                    )
                  }
                  aria-label={
                    mostrarPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {mostrarPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={recordarme}
                  onChange={(e) =>
                    setRecordarme(e.target.checked)
                  }
                />
                <span>Recordarme</span>
              </label>

              <button
                type="button"
                className="forgot-link"
                onClick={recuperarPassword}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="button"
              onClick={iniciarSesion}
              disabled={cargando}
              className="login-button"
            >
              {cargando
                ? "Ingresando..."
                : "Iniciar sesión  →"}
            </button>

            <div className="demo-row">
              <span>¿No tienes una cuenta?</span>

              <button
                type="button"
                onClick={solicitarDemo}
              >
                Solicitar demo
              </button>
            </div>
          </div>

          <div className="security-note">
            <span>🛡</span>
            Plataforma segura y confiable
          </div>
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          padding: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          color: #111827;
          background:
            radial-gradient(
              circle at 6% 85%,
              rgba(22, 163, 74, 0.18),
              transparent 30%
            ),
            radial-gradient(
              circle at 95% 80%,
              rgba(16, 185, 129, 0.18),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #ffffff 0%,
              #f3faf6 48%,
              #ffffff 100%
            );
          overflow-x: hidden;
        }

        .login-shell {
          width: min(1420px, 100%);
          min-height: 780px;
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          border: 1px solid rgba(15, 118, 78, 0.08);
          border-radius: 34px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.8);
          box-shadow:
            0 28px 80px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(10px);
        }

        .commercial-panel {
          position: relative;
          padding: 70px 64px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background:
            radial-gradient(
              circle at 15% 15%,
              rgba(34, 197, 94, 0.11),
              transparent 27%
            ),
            linear-gradient(
              160deg,
              #fbfffc 0%,
              #effaf3 100%
            );
        }

        .commercial-panel::after {
          content: "";
          position: absolute;
          left: -120px;
          bottom: -150px;
          width: 430px;
          height: 430px;
          border-radius: 50%;
          background: linear-gradient(
            135deg,
            #14532d,
            #22c55e
          );
          opacity: 0.92;
        }

        .brand-block,
        .benefits-list {
          position: relative;
          z-index: 1;
        }

        .brand-logo {
          width: 420px;
          max-width: 92%;
          display: block;
          margin-bottom: 54px;
        }

        .brand-block h1 {
          max-width: 600px;
          margin: 0 0 24px;
          font-size: clamp(42px, 4.5vw, 68px);
          line-height: 1.06;
          letter-spacing: -2px;
        }

        .brand-block h1 span {
          display: block;
          color: #16834f;
        }

        .commercial-copy {
          max-width: 560px;
          margin: 0;
          color: #5b6470;
          font-size: 20px;
          line-height: 1.65;
        }

        .benefits-list {
          display: grid;
          gap: 18px;
          margin-top: 48px;
        }

        .benefit-item {
          display: grid;
          grid-template-columns: 66px 1fr;
          align-items: center;
          gap: 18px;
        }

        .benefit-icon {
          width: 66px;
          height: 66px;
          display: grid;
          place-items: center;
          border: 1px solid #e1ebe5;
          border-radius: 18px;
          background: #ffffff;
          font-size: 30px;
          box-shadow:
            0 8px 22px rgba(15, 23, 42, 0.08);
        }

        .benefit-item h3 {
          margin: 0 0 6px;
          font-size: 19px;
        }

        .benefit-item p {
          margin: 0;
          color: #5f6874;
          font-size: 15px;
          line-height: 1.55;
        }

        .form-panel {
          padding: 58px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.92);
        }

        .login-card {
          width: min(620px, 100%);
          padding: 54px;
          border: 1px solid #e4ebe7;
          border-radius: 28px;
          background: #ffffff;
          box-shadow:
            0 22px 60px rgba(15, 23, 42, 0.12);
        }

        .mobile-brand {
          display: none;
        }

        .form-heading {
          text-align: center;
          margin-bottom: 38px;
        }

        .form-heading > span {
          display: block;
          margin-bottom: 12px;
          font-size: 30px;
          font-weight: 800;
        }

        .form-logo {
          width: 360px;
          max-width: 85%;
          display: block;
          margin: 0 auto 18px;
        }

        .form-heading p {
          margin: 0;
          color: #69727d;
          font-size: 20px;
        }

        .field-group {
          margin-bottom: 22px;
        }

        .field-group label {
          display: block;
          margin-bottom: 9px;
          font-size: 15px;
          font-weight: 800;
        }

        .input-wrap {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 17px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          opacity: 0.7;
          pointer-events: none;
        }

        .input-wrap input {
          width: 100%;
          min-height: 58px;
          padding: 15px 54px;
          border: 1px solid #d6dfda;
          border-radius: 13px;
          background: #ffffff;
          color: #111827;
          font-size: 16px;
          outline: none;
          transition: 0.2s ease;
        }

        .input-wrap input:focus {
          border-color: #15945a;
          box-shadow:
            0 0 0 4px rgba(21, 148, 90, 0.11);
        }

        .show-password {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
          cursor: pointer;
          font-size: 18px;
        }

        .form-options {
          margin: 4px 0 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .remember-option {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .remember-option input {
          width: 18px;
          height: 18px;
          accent-color: #16834f;
        }

        .forgot-link {
          border: 0;
          background: transparent;
          color: #16834f;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .login-button {
          width: 100%;
          min-height: 58px;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #117a46,
            #1aa55f
          );
          color: #ffffff;
          font-size: 17px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
          box-shadow:
            0 12px 28px rgba(17, 122, 70, 0.22);
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 16px 34px rgba(17, 122, 70, 0.28);
        }

        .login-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .demo-row {
          margin-top: 30px;
          padding-top: 24px;
          border-top: 1px solid #e5ebe7;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          color: #5f6874;
          font-size: 15px;
        }

        .demo-row button {
          border: 0;
          background: transparent;
          color: #16834f;
          font-weight: 800;
          cursor: pointer;
        }

        .security-note {
          margin-top: 22px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #16834f;
          font-size: 15px;
          font-weight: 800;
        }

        @media (max-width: 1100px) {
          .login-page {
            padding: 24px;
          }

          .login-shell {
            grid-template-columns: 1fr;
          }

          .commercial-panel {
            display: none;
          }

          .form-panel {
            padding: 34px;
          }

          .mobile-brand {
            display: block;
            text-align: center;
            margin-bottom: 26px;
          }

          .mobile-brand img {
            width: 330px;
            max-width: 85%;
          }

          .form-heading .form-logo {
            display: none;
          }

          .form-heading > span {
            font-size: 32px;
          }
        }

        @media (max-width: 620px) {
          .login-page {
            padding: 14px;
            align-items: flex-start;
          }

          .login-shell {
            min-height: auto;
            border-radius: 22px;
          }

          .form-panel {
            padding: 20px;
          }

          .login-card {
            padding: 30px 22px;
            border-radius: 20px;
          }

          .mobile-brand img {
            width: 280px;
          }

          .form-heading {
            margin-bottom: 30px;
          }

          .form-heading > span {
            font-size: 28px;
          }

          .form-heading p {
            font-size: 17px;
          }

          .form-options {
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
          }

          .input-wrap input {
            min-height: 56px;
          }

          .demo-row {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
