"use client";

import Link from "next/link";

export default function Admin() {
  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div>
            <span style={badge}>BackOffice SaaS</span>
            <h1 style={titulo}>Centro Administrativo KONAX</h1>
            <p style={subtitulo}>
              Administra empresas clientes, planes, módulos, usuarios principales
              y el crecimiento interno de KONAX.
            </p>
          </div>
        </div>

        <div style={resumenGrid}>
          <div style={resumenCard}>
            <span>Empresas</span>
            <strong>Clientes KONAX</strong>
          </div>

          <div style={resumenCard}>
            <span>Planes</span>
            <strong>Cobros / Gestión / Pro</strong>
          </div>

          <div style={resumenCard}>
            <span>Control</span>
            <strong>Centro de Gestión</strong>
          </div>
        </div>

        <div style={grid}>
          <Link href="/empresas" style={card}>
            <div style={icono}>🏢</div>
            <h3>Empresas Clientes</h3>
            <p>Crear, configurar, activar y administrar empresas registradas.</p>
          </Link>

          <Link href="/planes" style={card}>
            <div style={icono}>💼</div>
            <h3>Planes Comerciales</h3>
            <p>Asignar KONAX Cobros, Ventas y Gestión o KONAX Pro.</p>
          </Link>

          <Link href="/modulos" style={card}>
            <div style={icono}>🧩</div>
            <h3>Gestión de Módulos</h3>
            <p>Activar o desactivar módulos según el plan contratado.</p>
          </Link>

          <Link href="/usuarios" style={card}>
            <div style={icono}>👤</div>
            <h3>Usuario Principal</h3>
            <p>Crear el primer acceso administrativo de cada empresa.</p>
          </Link>

          <Link href="/centro-gestion" style={cardDestacado}>
            <div style={icono}>📊</div>
            <h3>Centro de Gestión KONAX</h3>
            <p>
              Ver empresas, pagos, vencimientos, suspensiones, activaciones e
              historial del negocio KONAX.
            </p>
          </Link>

          <div style={cardInfo}>
            <div style={icono}>⚙️</div>
            <h3>Próxima etapa</h3>
            <p>
              Luego conectaremos pagos KONAX, bitácora interna y suspensión
              automática por vencimiento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #ecfdf5 0%, #f3f4f6 45%, #ffffff 100%)",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1350px",
  margin: "0 auto",
};

const hero = {
  background: "#ffffff",
  borderRadius: "22px",
  padding: "32px",
  display: "flex",
  alignItems: "center",
  gap: "28px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  marginBottom: "24px",
  border: "1px solid #e5e7eb",
};

const logo = {
  width: "170px",
  maxWidth: "100%",
  height: "auto",
};

const badge = {
  display: "inline-block",
  background: "#111827",
  color: "#ffffff",
  padding: "7px 14px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: "bold",
  marginBottom: "12px",
};

const titulo = {
  fontSize: "40px",
  margin: "0 0 10px 0",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  fontSize: "17px",
  maxWidth: "760px",
  margin: 0,
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const resumenCard = {
  background: "#111827",
  color: "#ffffff",
  padding: "20px",
  borderRadius: "16px",
  display: "grid",
  gap: "8px",
  boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
  gap: "20px",
};

const card = {
  background: "#ffffff",
  padding: "26px",
  borderRadius: "18px",
  textDecoration: "none",
  color: "#111827",
  boxShadow: "0 6px 18px rgba(0,0,0,0.07)",
  border: "1px solid #e5e7eb",
};

const cardDestacado = {
  ...card,
  background: "#ecfdf5",
  border: "2px solid #10b981",
};

const cardInfo = {
  ...card,
  background: "#f9fafb",
};

const icono = {
  fontSize: "34px",
  marginBottom: "10px",
};
