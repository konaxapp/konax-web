"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminLogin() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e) {
    e.preventDefault();

    if (!correo || !password) {
      alert("Ingrese correo y contraseña.");
      return;
    }

    setCargando(true);

    const { data, error } = await supabase
      .from("administradores_konax")
      .select("*")
      .eq("correo", correo.trim())
      .eq("password", password.trim())
      .eq("estado", "Activo")
      .maybeSingle();

    setCargando(false);

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
      return;
    }

    if (!data) {
      alert("Correo o contraseña incorrectos.");
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
      <form onSubmit={iniciarSesion} style={card}>
        <h1 style={titulo}>KONAX</h1>
        <h2 style={subtitulo}>Login Maestro</h2>

        <div style={campo}>
          <label>Correo</label>
          <input
            type="email"
            placeholder="correo@konax.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            style={input}
          />
        </div>

        <div style={campo}>
          <label>Contraseña</label>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
          />
        </div>

        <button type="submit" style={boton} disabled={cargando}>
          {cargando ? "Ingresando..." : "Ingresar al Admin"}
        </button>
      </form>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px",
  fontFamily: "Arial, sans-serif",
};

const card = {
  width: "420px",
  background: "#ffffff",
  padding: "40px",
  borderRadius: "18px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
};

const titulo = {
  textAlign: "center",
  marginBottom: "8px",
  color: "#111827",
  fontSize: "38px",
};

const subtitulo = {
  textAlign: "center",
  marginBottom: "30px",
  color: "#6b7280",
};

const campo = {
  marginBottom: "18px",
};

const input = {
  width: "100%",
  padding: "13px",
  marginTop: "7px",
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  fontSize: "15px",
  boxSizing: "border-box",
};

const boton = {
  width: "100%",
  padding: "14px",
  background: "#111827",
  color: "#ffffff",
  border: "none",
  borderRadius: "9px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};
