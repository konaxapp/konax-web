"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./login.css";

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
    </main>
  );
}
