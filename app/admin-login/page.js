"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminLogin() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordarme, setRecordarme] = useState(true);

  async function iniciarSesion(e) {
    e.preventDefault();

    if (cargando) return;

    const correoLimpio = correo.trim().toLowerCase();
    const passwordLimpio = password.trim();

    if (!correoLimpio || !passwordLimpio) {
      alert("Ingrese correo y contraseña.");
      return;
    }

    setCargando(true);

    try {
      const { data, error } = await supabase
        .from("administradores_konax")
        .select("*")
        .ilike("correo", correoLimpio)
        .maybeSingle();

      if (error) {
        alert("Error al iniciar sesión: " + error.message);
        return;
      }

      if (!data) {
        alert("No existe un administrador con ese correo.");
        return;
      }

      if (
        String(data.password || "").trim() !==
        passwordLimpio
      ) {
        alert("La contraseña no coincide.");
        return;
      }

      if (data.estado && data.estado !== "Activo") {
        alert("Este administrador no está activo.");
        return;
      }

      localStorage.setItem(
        "adminKonaxId",
        String(data.id || "")
      );
      localStorage.setItem(
        "adminKonaxNombre",
        String(data.nombre || "")
      );
      localStorage.setItem(
        "adminKonaxCorreo",
        String(data.correo || "")
      );
      localStorage.setItem(
        "adminKonaxRol",
        String(data.rol || "SuperAdmin")
      );
      localStorage.setItem(
        "adminKonaxRecordarme",
        recordarme ? "true" : "false"
      );

      window.location.href = "/admin";
    } catch (errorGeneral) {
      console.error(
        "Error inesperado en AdminLogin:",
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
    if (
      evento.key === "Enter" &&
      !cargando
    ) {
      iniciarSesion(evento);
    }
  }

  function recuperarPassword() {
    alert(
      "Para recuperar la contraseña administrativa, contacte al soporte de KONAX."
    );
  }

  function volverInicio() {
    window.location.href = "/";
  }

  return (
    <main className="login-page">
      <form
        onSubmit={iniciarSesion}
        className="login-card"
      >
        <button
          type="button"
          className="close-button"
          onClick={volverInicio}
          aria-label="Volver al inicio"
        >
          ×
        </button>

        <div className="form-heading">
          <span>Administración KONAX</span>

          <img
            src="/konax-logo-final.png"
            alt="KONAX"
            className="form-logo"
          />

          <p>
            Ingresa a tu cuenta administrativa
          </p>
        </div>

        <div className="admin-badge">
          Acceso exclusivo para administradores
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
              placeholder="correo@konax.net"
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
          type="submit"
          disabled={cargando}
          className="login-button"
        >
          {cargando
            ? "Ingresando..."
            : "Iniciar sesión  →"}
        </button>
      </form>

      <div className="security-note">
        <span>🛡</span>
        Acceso administrativo seguro
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
          overflow: hidden;
        }

        .login-card {
          position: relative;
          width: min(560px, 100%);
          max-height: calc(100vh - 48px);
          padding: 34px 40px;
          border: 1px solid #e2e9e5;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.97);
          box-shadow:
            0 28px 80px rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(8px);
        }

        .close-button {
          position: absolute;
          top: 16px;
          right: 18px;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid #dfe7e2;
          border-radius: 50%;
          background: #ffffff;
          color: #425048;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .close-button:hover {
          border-color: #15945a;
          color: #15945a;
          transform: translateY(-1px);
        }

        .form-heading {
          text-align: center;
          margin-bottom: 20px;
        }

        .form-heading > span {
          display: block;
          margin-bottom: 10px;
          color: #0f7a4f;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 1.4px;
          text-transform: uppercase;
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

        .admin-badge {
          margin: 0 auto 18px;
          width: fit-content;
          padding: 8px 13px;
          border: 1px solid #cfe5d8;
          border-radius: 999px;
          background: #edf8f1;
          color: #117a46;
          font-size: 12px;
          font-weight: 800;
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
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
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
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
          cursor: pointer;
          font-size: 17px;
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
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            #117a46,
            #1aa55f
          );
          color: #ffffff;
          font-size: 16px;
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

        .security-note {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #16834f;
          font-size: 14px;
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

          .close-button {
            top: 10px;
            right: 10px;
          }

          .form-heading {
            margin-bottom: 16px;
          }

          .form-heading > span {
            margin-bottom: 8px;
            font-size: 13px;
          }

          .form-logo {
            width: 245px;
            max-width: 88%;
            margin-bottom: 8px;
          }

          .form-heading p {
            font-size: 15px;
          }

          .admin-badge {
            margin-bottom: 14px;
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
          }

          .remember-option,
          .forgot-link {
            font-size: 13px;
          }

          .login-button {
            min-height: 48px;
            font-size: 16px;
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
            padding: 22px 34px;
          }

          .form-heading {
            margin-bottom: 14px;
          }

          .form-logo {
            width: 240px;
            margin-bottom: 6px;
          }

          .admin-badge {
            margin-bottom: 12px;
          }

          .field-group {
            margin-bottom: 11px;
          }

          .input-wrap input {
            min-height: 46px;
          }

          .form-options {
            margin-bottom: 14px;
          }

          .login-button {
            min-height: 46px;
          }

          .security-note {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
