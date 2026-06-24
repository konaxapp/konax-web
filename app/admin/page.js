"use client";

import Link from "next/link";

export default function Admin() {
  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div>
            <span style={badge}>Administración KONAX</span>
            <h1 style={titulo}>Centro Administrativo KONAX</h1>
            <p style={subtitulo}>
              Administra empresas clientes, planes comerciales, módulos activos
              y el control interno del negocio KONAX.
            </p>
          </div>
        </div>

        <div style={grid}>
          <Link href="/empresas" style={card}>
            <div style={icono}>🏢</div>
            <h3>Empresas Clientes</h3>
            <p>
              Crear empresas y completar su configuración: plan, módulos y
              Usuario Principal.
            </p>
          </Link>

          <Link href="/planes" style={card}>
            <div style={icono}>💼</div>
            <h3>Planes Comerciales</h3>
            <p>
              Consultar y asignar planes KONAX Cobros, Ventas y Gestión o Pro.
            </p>
          </Link>

          <Link href="/modulos" style={card}>
            <div style={icono}>🧩</div>
            <h3>Gestión de Módulos</h3>
            <p>
              Activar, desactivar o ajustar módulos disponibles por empresa.
            </p>
          </Link>

          <Link href="/centro-gestion" style={cardDestacado}>
            <div style={icono}>📊</div>
            <h3>Centro de Gestión KONAX</h3>
            <p>
              Ver empresas, pagos, vencimientos, activaciones, suspensiones e
              historial interno de KONAX.
            </p>
          </Link>
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
  maxWidth: "1250px",
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
  marginBottom: "26px",
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

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
  gap: "20px",
};

const card = {
  background: "#ffffff",
  padding: "28px",
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

const icono = {
  fontSize: "36px",
  marginBottom: "10px",
};
