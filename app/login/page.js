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

    const correoLimpio = correo.trim().toLowerCase();
    const passwordLimpio = password.trim();

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("correo", correoLimpio)
      .eq("password", passwordLimpio)
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

    localStorage.clear();

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

    if (String(usuario.rol || "").toLowerCase().trim() === "superadmin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={pagina}>
      <div style={blurUno}></div>
      <div style={blurDos}></div>

      <div style={modal}>
        <div style={logoFila}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
          <h1 style={marca}>KONAX</h1>
        </div>

        <h2 style={titulo}>Bienvenido</h2>

        <p style={subtitulo}>Ingresa a tu cuenta empresarial aquí</p>

        <div style={campo}>
          <label style={label}>Correo</label>
          <input
            type="email"
            placeholder="correo@empresa.com"
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

        <button onClick={iniciarSesion} disabled={cargando} style={boton}>
          {cargando ? "Ingresando..." : "Iniciar Sesión →"}
        </button>

        <p style={olvido}>¿Olvidaste tu contraseña?</p>
      </div>
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
  background:
    "linear-gradient(180deg, rgba(6,78,59,0.96), rgba(15,23,42,0.96))",
  border: "1px solid rgba(94,234,212,0.35)",
  borderRadius: "28px",
  padding: "38px",
  color: "#ffffff",
  boxShadow: "0 25px 70px rgba(0,0,0,0.45)",
  position: "relative",
  zIndex: 2,
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
