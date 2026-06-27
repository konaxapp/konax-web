"use client";

import Link from "next/link";

export default function Admin() {
  const opciones = [
    {
      nombre: "Empresas Clientes",
      ruta: "/empresas",
      icono: "🏢",
    },
    {
      nombre: "Planes Comerciales",
      ruta: "/planes",
      icono: "💼",
    },
    {
      nombre: "Gestión de Módulos",
      ruta: "/modulos",
      icono: "🧩",
    },
    {
      nombre: "Centro de Gestión",
      ruta: "/centro-gestion",
      icono: "📊",
    },
  ];

  function cerrarSesion() {
    localStorage.removeItem("adminKonaxId");
    localStorage.removeItem("adminKonaxNombre");
    localStorage.removeItem("adminKonaxCorreo");
    localStorage.removeItem("adminKonaxRol");
    window.location.href = "/admin-login";
  }

  return (
    <div style={layout}>
      <aside style={sidebar}>
        <div style={brandBox}>
          <img src="/konax-logo.png" alt="KONAX" style={logoSidebar} />

          <div>
            <h2 style={brandTitle}>KONAX</h2>
            <p style={brandSub}>Administración</p>
          </div>
        </div>

        <div style={empresaBox}>
          <strong>Centro KONAX</strong>
          <span>SuperAdmin</span>
        </div>

        <nav style={menu}>
          {opciones.map((item) => (
            <Link key={item.nombre} href={item.ruta} style={menuItem}>
              <span style={menuIcono}>{item.icono}</span>
              <span>{item.nombre}</span>
            </Link>
          ))}
        </nav>

        <button onClick={cerrarSesion} style={botonSalir}>
          Cerrar sesión
        </button>
      </aside>

      <main style={contenido}>
        <div style={hero}>
          <div>
            <p style={etiqueta}>Centro de Operaciones Internas</p>
            <h1 style={titulo}>Centro Administrativo KONAX</h1>

            <p style={subtitulo}>
              Administra empresas clientes, planes comerciales, módulos activos
              y el control interno del negocio KONAX.
            </p>
          </div>
        </div>

        <div style={resumenGrid}>
          <div style={resumenCard}>
            <p style={resumenLabel}>Opciones disponibles</p>
            <h2 style={resumenValor}>4</h2>
          </div>

          <div style={resumenCard}>
            <p style={resumenLabel}>Panel</p>
            <h2 style={resumenValorTexto}>Administración KONAX</h2>
          </div>

          <div style={resumenCard}>
            <p style={resumenLabel}>Rol</p>
            <h2 style={resumenValorTexto}>SuperAdmin</h2>
          </div>
        </div>
      </main>
    </div>
  );
}

const layout = {
  display: "flex",
  minHeight: "100vh",
  background: "#eef2f7",
  fontFamily: "Arial, sans-serif",
};

const sidebar = {
  width: "260px",
  background: "linear-gradient(180deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "22px 16px",
  boxSizing: "border-box",
  position: "sticky",
  top: 0,
  height: "100vh",
  overflowY: "auto",
};

const brandBox = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "22px",
};

const logoSidebar = {
  width: "58px",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "7px",
};

const brandTitle = {
  margin: 0,
  fontSize: "22px",
};

const brandSub = {
  margin: "4px 0 0",
  color: "#bbf7d0",
  fontSize: "12px",
};

const empresaBox = {
  background: "rgba(255,255,255,0.10)",
  padding: "14px",
  borderRadius: "14px",
  marginBottom: "18px",
  display: "grid",
  gap: "5px",
  fontSize: "14px",
};

const menu = {
  display: "grid",
  gap: "8px",
};

const menuItem = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "12px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
  textAlign: "left",
  textDecoration: "none",
  boxSizing: "border-box",
};

const menuIcono = {
  fontSize: "19px",
};

const botonSalir = {
  width: "100%",
  marginTop: "18px",
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const contenido = {
  flex: 1,
  padding: "30px",
  boxSizing: "border-box",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "32px",
  borderRadius: "22px",
  marginBottom: "22px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const etiqueta = {
  margin: 0,
  color: "#bbf7d0",
  fontSize: "14px",
  fontWeight: "bold",
};

const titulo = {
  margin: "6px 0",
  fontSize: "38px",
  fontWeight: "bold",
};

const subtitulo = {
  color: "#dcfce7",
  marginTop: "8px",
  fontSize: "16px",
  maxWidth: "760px",
  lineHeight: "24px",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const resumenCard = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
};

const resumenLabel = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
};

const resumenValor = {
  margin: "8px 0 0",
  color: "#111827",
  fontSize: "30px",
};

const resumenValorTexto = {
  margin: "8px 0 0",
  color: "#111827",
  fontSize: "22px",
};
