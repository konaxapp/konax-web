"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  function fechaHoy() {
    return new Date().toISOString().split("T")[0];
  }

  async function suspenderEmpresa(empresa) {
    await supabase
      .from("empresas")
      .update({
        estado: "Suspendido",
        estado_plan: "Suspendido",
        estado_pago: "Pendiente",
      })
      .eq("id", empresa.id);

    await supabase.from("bitacora_konax").insert([
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
  }

  async function iniciarSesion() {
    if (!correo || !password) {
      alert("Ingrese correo y contraseña");
      return;
    }

    setCargando(true);

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("correo", correo.trim())
      .eq("password", password.trim())
      .eq("estado", "Activo")
      .maybeSingle();

    if (error) {
      setCargando(false);
      alert(error.message);
      return;
    }

    if (!usuario) {
      setCargando(false);
      alert("Usuario o contraseña incorrectos");
      return;
    }

    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", usuario.empresa_id)
      .maybeSingle();

    if (errorEmpresa) {
      setCargando(false);
      alert("Error verificando empresa: " + errorEmpresa.message);
      return;
    }

    if (!empresa) {
      setCargando(false);
      alert("Este usuario no tiene empresa asignada.");
      return;
    }

    const hoy = fechaHoy();
    const vencimiento = empresa.fecha_proxima_facturacion;

    const estaVencida =
      vencimiento && hoy > vencimiento && empresa.estado_pago !== "Al día";

    if (
      empresa.estado === "Suspendido" ||
      empresa.estado_plan === "Suspendido" ||
      estaVencida
    ) {
      if (estaVencida && empresa.estado_plan !== "Suspendido") {
        await suspenderEmpresa(empresa);
      }

      setCargando(false);
      alert(
        "El servicio de esta empresa está suspendido por facturación pendiente. Contacte a KONAX."
      );
      return;
    }

    localStorage.setItem("usuarioId", usuario.id);
    localStorage.setItem("usuarioNombre", usuario.nombre || "");
    localStorage.setItem("nombreUsuario", usuario.nombre || "");
    localStorage.setItem("usuarioCorreo", usuario.correo || "");
    localStorage.setItem("correoUsuario", usuario.correo || "");

    localStorage.setItem("empresaId", usuario.empresa_id || "");
    localStorage.setItem("empresaNombre", empresa.nombre || "");

    localStorage.setItem("usuarioRol", usuario.rol || "");
    localStorage.setItem("rolUsuario", usuario.rol || "");
    localStorage.setItem("rolId", usuario.rol_id || "");

    localStorage.setItem("tipoNegocio", empresa.tipo_negocio || "");
    localStorage.setItem("categoriaNegocio", empresa.categoria_negocio || "");

    setCargando(false);

    if (usuario.rol === "SuperAdmin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={contenedor}>
      <div style={card}>
        <h1 style={titulo}>KONAX</h1>

        <p style={subtitulo}>Iniciar Sesión</p>

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

        <button onClick={iniciarSesion} disabled={cargando} style={boton}>
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
  fontFamily: "Arial, sans-serif",
};

const card = {
  width: "400px",
  background: "#fff",
  padding: "40px",
  borderRadius: "15px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.10)",
};

const titulo = {
  margin: "0 0 10px 0",
  color: "#111827",
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
