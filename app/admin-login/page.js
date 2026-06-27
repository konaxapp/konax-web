"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminLogin() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e) {
    e.preventDefault();

    const correoLimpio = correo.trim().toLowerCase();
    const passwordLimpio = password.trim();

    if (!correoLimpio || !passwordLimpio) {
      alert("Ingrese correo y contraseña.");
      return;
    }

    setCargando(true);

    const { data, error } = await supabase
      .from("administradores_konax")
      .select("*")
      .ilike("correo", correoLimpio)
      .maybeSingle();

    setCargando(false);

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
      return;
    }

    if (!data) {
      alert("No existe un administrador con ese correo.");
      return;
    }

    if (String(data.password || "").trim() !== passwordLimpio) {
      alert("La contraseña no coincide.");
      return;
    }

    if (data.estado && data.estado !== "Activo") {
      alert("Este administrador no está activo.");
      return;
    }

    localStorage.setItem("adminKonaxId", data.id);
    localStorage.setItem("adminKonaxNombre", data.nombre || "");
    localStorage.setItem("adminKonaxCorreo", data.correo || "");
    localStorage.setItem("adminKonaxRol", data.rol || "SuperAdmin");

    window.location.href = "/admin";
  }

  return (
    <div style={pagina}>
      <div style={blurUno}></div>
      <div style={blurDos}></div>

      <form onSubmit={iniciarSesion} style={modal}>
        <button type="button" style={cerrar}>×</button>

        <div style={logoFila}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
          <h1 style={marca}>KONAX</h1>
        </div>

        <h2 style={titulo}>Bienvenido</h2>

        <p style={subtitulo}>
          Ingresa a tu cuenta administrativa aquí
        </p>

        <div style={campo}>
          <label style={label}>Correo</label>
          <input
            type="email"
            placeholder="correo@konax.net"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            style={input}
          />
        </div>

        <div style={campo}>
          <label style={label}>Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
          />
        </div>

        <button type="submit" style={boton} disabled={cargando}>
          {cargando ? "Ingresando..." : "Iniciar Sesión  →"}
        </button>

        <p style={olvido}>¿Olvidaste tu contraseña?</p>
      </form>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 20% 20%, #0f766e 0%, transparent 28%), linear-gradient(135deg, #020617 0%, #052e2b 50%, #111827 100%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px",
  fontFamily: "Arial, sans-serif",
  position: "relative",
  overflow: "hidden",
};

const blurUno = {
  position: "absolute",
  width: "420px",
  height: "420px",
  borderRadius: "50%",
  background: "rgba(16,185,129,0.20)",
  left: "-120px",
  top: "-90px",
  filter: "blur(25px)",
};

const blurDos = {
  position: "absolute",
  width: "360px",
  height: "360px",
  borderRadius: "50%",
  background: "rgba(45,212,191,0.14)",
  right: "-90px",
  bottom: "-80px",
  filter: "blur(25px)",
};

const modal = {
  width: "430px",
  maxWidth: "100%",
  background: "linear-gradient(180deg, rgba(6,78,59,0.96), rgba(15,23,42,0.96))",
  border: "1px solid rgba(94,234,212,0.35)",
  borderRadius: "28px",
  padding: "38px",
  color: "#ffffff",
  boxShadow: "0 25px 70px rgba(0,0,0,0.45)",
  position: "relative",
  zIndex: 2,
};

const cerrar = {
  position: "absolute",
  top: "18px",
  right: "20px",
  background: "transparent",
  border: "none",
  color: "#67e8f9",
  fontSize: "30px",
  fontWeight: "bold",
  cursor: "pointer",
};

const logoFila = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  justifyContent: "center",
  marginBottom: "28px",
};

const logo = {
  width: "68px",
  background: "#ffffff",
  borderRadius: "18px",
  padding: "8px",
};

const marca = {
  margin: 0,
  fontSize: "42px",
  fontWeight: "bold",
  letterSpacing: "1px",
  color: "#ffffff",
};

const titulo = {
  textAlign: "center",
  margin: "0 0 12px",
  fontSize: "34px",
  color: "#ffffff",
};

const subtitulo = {
  textAlign: "center",
  color: "#d1fae5",
  fontSize: "17px",
  fontWeight: "bold",
  marginBottom: "32px",
};

const campo = {
  marginBottom: "20px",
};

const label = {
  display: "block",
  marginBottom: "8px",
  fontSize: "15px",
  fontWeight: "bold",
  color: "#e5fdf7",
};

const input = {
  width: "100%",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid rgba(94,234,212,0.35)",
  background: "rgba(15,23,42,0.65)",
  color: "#ffffff",
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
};

const boton = {
  width: "100%",
  padding: "16px",
  background: "linear-gradient(135deg, #2dd4bf, #10b981)",
  color: "#052e2b",
  border: "none",
  borderRadius: "13px",
  fontSize: "17px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "6px",
};

const olvido = {
  textAlign: "center",
  marginTop: "22px",
  color: "#5eead4",
  fontWeight: "bold",
  fontSize: "14px",
};
