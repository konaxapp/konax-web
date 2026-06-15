"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function crearCuenta() {
    if (!correo || !password || !confirmarPassword) {
      alert("Complete correo, contraseña y confirmación.");
      return;
    }

    if (password !== confirmarPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      alert("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    setCargando(true);

    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password,
    });

    setCargando(false);

    if (error) {
      alert("Error al crear cuenta: " + error.message);
      return;
    }

    if (data?.user?.id) {
      localStorage.setItem("usuarioId", data.user.id);
      localStorage.setItem("correoUsuario", correo);
    }

    window.location.href = "/empresas";
  }

  return (
    <div style={pagina}>
      <div style={card}>
        <h1 style={titulo}>KONAX</h1>

        <p style={subtitulo}>Crear cuenta</p>

        <div style={campo}>
          <label>Correo electrónico</label>
          <input
            type="email"
            placeholder="correo@empresa.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={campo}>
          <label>Contraseña</label>

          <div style={passwordBox}>
            <input
              type={mostrarPassword ? "text" : "password"}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputPassword}
            />

            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              style={botonMostrar}
            >
              {mostrarPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <div style={campo}>
          <label>Confirmar contraseña</label>

          <div style={passwordBox}>
            <input
              type={mostrarConfirmacion ? "text" : "password"}
              placeholder="********"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              style={inputPassword}
            />

            <button
              type="button"
              onClick={() => setMostrarConfirmacion(!mostrarConfirmacion)}
              style={botonMostrar}
            >
              {mostrarConfirmacion ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <button onClick={crearCuenta} style={boton}>
          {cargando ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p style={login}>
          ¿Ya tienes cuenta?{" "}
          <span onClick={() => (window.location.href = "/login")} style={link}>
            Iniciar sesión
          </span>
        </p>

        <p style={login}>
          <span
            onClick={() => (window.location.href = "/recuperar-password")}
            style={link}
          >
            ¿Olvidaste tu contraseña?
          </span>
        </p>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f5f7fb",
  fontFamily: "Arial, sans-serif",
};

const card = {
  width: "420px",
  background: "#ffffff",
  padding: "40px",
  borderRadius: "12px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
};

const titulo = {
  textAlign: "center",
  marginBottom: "10px",
};

const subtitulo = {
  textAlign: "center",
  color: "#666",
  marginBottom: "30px",
};

const campo = {
  marginBottom: "15px",
};

const inputStyle = {
  width: "100%",
  padding: "12
