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
      <section className="login-card">
        <div className="form-heading">
          <span>Bienvenido a</span>

          <img
            src="/konax-logo.png"
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
                mostrarPassword ? "text" : "password"
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
      </section>

      <div className="security-note">
        <span>🛡</span>
        Plataforma segura y confiable
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          height: 100vh;
          padding: 14px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: Arial, sans-serif;
          color: #111827;
          background:
            radial-gradient(
              circle at 8% 88%,
              rgba(22, 163, 74, 0.16),
              transparent 30%
            ),
            radial-gradient(
              circle at 92% 82%,
              rgba(16, 185, 129, 0.16),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #ffffff 0%,
              #f3faf6 50%,
              #ffffff 100%
            );
          overflow-x: hidden;
        }

        .login-card {
          width: min(560px, 100%);
          max-height: calc(100vh - 48px);
          padding: 34px 40px;
          border: 1px solid #e2e9e5;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow:
            0 28px 80px rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(8px);
        }

        .form-heading {
          text-align: center;
          margin-bottom: 24px;
        }

        .form-heading > span {
          display: block;
          margin-bottom: 12px;
          font-size: 27px;
          font-weight: 800;
        }

        .form-logo {
          width: 300px;
          max-width: 88%;
          display: block;
          margin: 0 auto 10px;
        }

        .form-heading p {
          margin: 0;
          color: #69727d;
          font-size: 17px;
        }

        .field-group {
          margin-bottom: 16px;
        }

        .field-group label {
          display: block;
          margin-bottom: 7px;
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
          min-height: 50px;
          padding: 12px 48px;
          border: 1px solid #d6dfda;
          border-radius: 11px;
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
          font-size: 16px;
        }

        .form-options {
          margin: 2px 0 18px;
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
          min-height: 50px;
          border: 0;
          border-radius: 14px;
          background: linear-gradient(
            135deg,
            #117a46,
            #1aa55f
          );
          color: #ffffff;
          font-size: 18px;
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
          margin-top: 18px;
          padding-top: 16px;
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
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #16834f;
          font-size: 15px;
          font-weight: 800;
        }

        @media (max-width: 620px) {
          .login-page {
            min-height: 100vh;
            height: 100vh;
            padding: 10px;
            justify-content: center;
            overflow: hidden;
          }

          .login-card {
            width: 100%;
            max-height: calc(100vh - 28px);
            margin: 0;
            padding: 24px 18px;
            border-radius: 18px;
          }

          .form-heading {
            margin-bottom: 20px;
          }

          .form-heading > span {
            font-size: 24px;
            margin-bottom: 8px;
          }

          .form-logo {
            width: 245px;
            max-width: 88%;
            margin-bottom: 8px;
          }

          .form-heading p {
            font-size: 15px;
          }

          .field-group {
            margin-bottom: 13px;
          }

          .field-group label {
            font-size: 14px;
          }

          .input-wrap input {
            min-height: 48px;
            font-size: 15px;
          }

          .form-options {
            margin-bottom: 16px;
            gap: 10px;
            font-size: 13px;
          }

          .remember-option,
          .forgot-link {
            font-size: 13px;
          }

          .login-button {
            min-height: 48px;
            font-size: 16px;
          }

          .demo-row {
            margin-top: 14px;
            padding-top: 14px;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            font-size: 13px;
          }

          .security-note {
            display: none;
          }
        }

        @media (max-height: 700px) {
          .login-page {
            padding: 8px 16px;
          }

          .login-card {
            max-height: calc(100vh - 20px);
            padding: 24px 34px;
          }

          .form-heading {
            margin-bottom: 18px;
          }

          .form-logo {
            width: 250px;
            margin-bottom: 8px;
          }

          .field-group {
            margin-bottom: 12px;
          }

          .input-wrap input {
            min-height: 46px;
          }

          .form-options {
            margin-bottom: 14px;
          }

          .login-button {
            min-height: 48px;
          }

          .demo-row {
            margin-top: 12px;
            padding-top: 12px;
          }

          .security-note {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
