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
      <div style={fondoDecorativoUno}></div>
      <div style={fondoDecorativoDos}></div>

      <div style={layout}>
        <div style={panelIzquierdo}>
          <div style={logoBox}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />
            <div>
              <h1 style={brandTitle}>KONAX</h1>
              <p style={brandSub}>Control Center</p>
            </div>
          </div>

          <div style={badge}>Administración empresarial</div>

          <h2 style={tituloHero}>
            Centro Administrativo
            <br />
            <span style={tituloVerde}>KONAX</span>
          </h2>

          <p style={textoHero}>
            Acceso exclusivo para administrar empresas clientes, planes,
            módulos activos y control interno de la plataforma.
          </p>

          <div style={beneficiosGrid}>
            <div style={beneficio}>
              <span style={beneficioIcono}>🏢</span>
              <strong>Empresas</strong>
              <p>Control de clientes y configuraciones.</p>
            </div>

            <div style={beneficio}>
              <span style={beneficioIcono}>📊</span>
              <strong>Planes</strong>
              <p>Gestión de módulos y servicios activos.</p>
            </div>

            <div style={beneficio}>
              <span style={beneficioIcono}>🔐</span>
              <strong>Seguridad</strong>
              <p>Acceso reservado para administradores.</p>
            </div>
          </div>
        </div>

        <form onSubmit={iniciarSesion} style={card}>
          <div style={cardHeader}>
            <img src="/konax-logo.png" alt="KONAX" style={logoCard} />

            <div>
              <p style={cardEtiqueta}>Login Administrador</p>
              <h2 style={cardTitulo}>Ingresar a KONAX</h2>
            </div>
          </div>

          <p style={descripcion}>
            Ingresa con tu correo y contraseña de administrador para acceder al
            panel interno.
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
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={input}
            />
          </div>

          <button type="submit" style={boton} disabled={cargando}>
            {cargando ? "Ingresando..." : "Ingresar al Control Center"}
          </button>

          <p style={nota}>
            Plataforma privada de administración KONAX.
          </p>
        </form>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #020617 0%, #064e3b 55%, #111827 100%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "35px",
  fontFamily: "Arial, sans-serif",
  position: "relative",
  overflow: "hidden",
};

const fondoDecorativoUno = {
  position: "absolute",
  width: "420px",
  height: "420px",
  borderRadius: "50%",
  background: "rgba(16,185,129,0.22)",
  top: "-120px",
  left: "-90px",
  filter: "blur(20px)",
};

const fondoDecorativoDos = {
  position: "absolute",
  width: "520px",
  height: "520px",
  borderRadius: "50%",
  background: "rgba(34,197,94,0.14)",
  bottom: "-170px",
  right: "-130px",
  filter: "blur(25px)",
};

const layout = {
  width: "1120px",
  maxWidth: "100%",
  display: "grid",
  gridTemplateColumns: "1.35fr 0.85fr",
  gap: "26px",
  alignItems: "stretch",
  position: "relative",
  zIndex: 2,
};

const panelIzquierdo = {
  background: "linear-gradient(135deg, rgba(17,24,39,0.96), rgba(6,78,59,0.94))",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "28px",
  padding: "42px",
  color: "#ffffff",
  boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
};

const logoBox = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "34px",
};

const logo = {
  width: "84px",
  height: "auto",
  background: "#ffffff",
  padding: "10px",
  borderRadius: "18px",
};

const brandTitle = {
  margin: 0,
  fontSize: "34px",
  letterSpacing: "1px",
};

const brandSub = {
  margin: "4px 0 0",
  color: "#bbf7d0",
  fontSize: "14px",
  fontWeight: "bold",
};

const badge = {
  display: "inline-block",
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#bbf7d0",
  padding: "10px 16px",
  borderRadius: "999px",
  fontSize: "14px",
  fontWeight: "bold",
  marginBottom: "24px",
};

const tituloHero = {
  margin: 0,
  fontSize: "58px",
  lineHeight: "64px",
  letterSpacing: "-1.5px",
};

const tituloVerde = {
  color: "#6ee7b7",
};

const textoHero = {
  marginTop: "22px",
  maxWidth: "650px",
  color: "#d1fae5",
  fontSize: "18px",
  lineHeight: "30px",
};

const beneficiosGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
  gap: "14px",
  marginTop: "34px",
};

const beneficio = {
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "18px",
  borderRadius: "18px",
};

const beneficioIcono = {
  fontSize: "28px",
  display: "block",
  marginBottom: "10px",
};

const card = {
  background: "#ffffff",
  padding: "34px",
  borderRadius: "28px",
  boxShadow: "0 20px 50px rgba(0,0,0,0.30)",
  alignSelf: "center",
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "18px",
};

const logoCard = {
  width: "72px",
  height: "auto",
  background: "#f9fafb",
  padding: "8px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
};

const cardEtiqueta = {
  margin: 0,
  color: "#047857",
  fontSize: "13px",
  fontWeight: "bold",
};

const cardTitulo = {
  margin: "3px 0 0",
  color: "#111827",
  fontSize: "28px",
};

const descripcion = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "22px",
  marginBottom: "26px",
};

const campo = {
  marginBottom: "18px",
};

const label = {
  display: "block",
  color: "#374151",
  fontSize: "14px",
  fontWeight: "bold",
  marginBottom: "7px",
};

const input = {
  width: "100%",
  padding: "14px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
  background: "#ffffff",
  color: "#111827",
};

const boton = {
  width: "100%",
  padding: "15px",
  background: "linear-gradient(135deg, #111827, #047857)",
  color: "#ffffff",
  border: "none",
  borderRadius: "12px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(4,120,87,0.28)",
};

const nota = {
  textAlign: "center",
  marginTop: "18px",
  color: "#6b7280",
  fontSize: "13px",
};
