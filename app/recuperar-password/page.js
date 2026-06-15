"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RecuperarPassword() {
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviarRecuperacion() {
    if (!correo) {
      alert("Ingrese su correo electrónico.");
      return;
    }

    setCargando(true);

    const { error } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    });

    setCargando(false);

    if (error) {
      alert("Error enviando recuperación: " + error.message);
      return;
    }

    alert("Te enviamos un enlace para restablecer tu contraseña.");
    window.location.href = "/login";
  }

  return (
    <div style={pagina}>
      <div style={card}>
        <h1 style={titulo}>Recuperar contraseña</h1>

        <p style={subtitulo}>
          Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
        </p>

        <label>Correo electrónico</label>
        <input
          type="email"
          placeholder="correo@empresa.com"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          style={input}
        />

        <button onClick={enviarRecuperacion} style={boton}>
          {cargando ? "Enviando..." : "Enviar enlace"}
        </button>

        <p style={texto}>
          <span onClick={() => (window.location.href = "/login")} style={link}>
            Volver a iniciar sesión
          </span>
        </p>
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
  marginBottom: "20px",
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

const texto = {
  textAlign: "center",
  marginTop: "20px",
  color: "#666",
};

const link = {
  color: "#2563eb",
  fontWeight: "bold",
  cursor: "pointer",
};
