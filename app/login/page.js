"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion() {
    if (!correo || !password) {
      alert("Ingrese correo y contraseña");
      return;
    }

    setCargando(true);

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("correo", correo)
      .eq("password", password)
      .eq("estado", "Activo")
      .maybeSingle();

    if (error) {
      setCargando(false);
      alert(error.message);
      return;
    }

    if (!data) {
      setCargando(false);
      alert("Usuario o contraseña incorrectos");
      return;
    }

    localStorage.setItem("usuarioId", data.id);
    localStorage.setItem("empresaId", data.empresa_id || "");
    localStorage.setItem("nombreUsuario", data.nombre || "");
    localStorage.setItem("correoUsuario", data.correo || "");
    localStorage.setItem("rolUsuario", data.rol || "");
    localStorage.setItem("modulos", data.modulos || "");

    if (data.rol === "SuperAdmin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={contenedor}>
      <div style={card}>
        <h1>KONAX</h1>

        <p style={subtitulo}>
          Iniciar Sesión
        </p>

        <input
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          style={input}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />

        <button
          onClick={iniciarSesion}
          disabled={cargando}
          style={boton}
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </div>
    </div>
  );
}

const contenedor = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f3f4f6",
};

const card = {
  width: "400px",
  background: "#fff",
  padding: "40px",
  borderRadius: "15px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.10)",
};

const subtitulo = {
  marginBottom: "20px",
  color: "#6b7280",
};

const input = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const boton = {
  width: "100%",
  padding: "12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};
