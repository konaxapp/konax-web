"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ActualizarPassword() {
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  async function actualizarPassword() {
    if (!password || !confirmarPassword) {
      alert("Complete la nueva contraseña y la confirmación.");
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

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setCargando(false);

    if (error) {
      alert("Error actualizando contraseña: " + error.message);
      return;
    }

    alert("Contraseña actualizada correctamente.");
    window.location.href = "/login";
  }

  return (
    <div style={pagina}>
      <div style={card}>
        <h1 style={titulo}>Actualizar contraseña</h1>

        <p style={subtitulo}>
          Escribe tu nueva contraseña para ingresar nuevamente a KONAX.
        </p>

        <label>Nueva contraseña</label>
        <input
          type="password"
          placeholder="********"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />

        <label>Confirmar contraseña</label>
        <input
          type="password"
          placeholder="********"
          value={confirmarPassword}
          onChange={(e) => setConfirmarPassword(e.target.value)}
          style={input}
        />

        <button onClick={actualizarPassword} style={boton} disabled={cargando}>
          {cargando ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f5f7fb",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
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

const input = {
  width: "100%",
  padding: "12px",
  marginTop: "8px",
  marginBottom: "18px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const boton = {
  width: "100%",
  padding: "14px",
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  cursor: "pointer",
};
