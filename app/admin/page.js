"use client";

import Link from "next/link";

export default function Admin() {
  return (
    <div style={pagina}>
      <div style={contenedor}>
        <h1 style={titulo}>Panel Administrador KONAX</h1>

        <p style={subtitulo}>
          Centro maestro para administrar empresas clientes, planes, módulos,
          usuarios principales, roles y el Centro de Gestión KONAX.
        </p>

        <div style={grid}>
          <Link href="/empresas" style={card}>
            <h3>Empresas Clientes</h3>
            <p>Crear, activar, suspender y administrar empresas clientes.</p>
          </Link>

          <Link href="/planes" style={card}>
            <h3>Planes</h3>
            <p>Asignar KONAX Cobros, Ventas y Gestión o Pro.</p>
          </Link>

          <Link href="/modulos" style={card}>
            <h3>Módulos</h3>
            <p>Activar o desactivar módulos según el plan contratado.</p>
          </Link>

          <Link href="/usuarios" style={card}>
            <h3>Usuario Principal</h3>
            <p>Crear el usuario principal de cada empresa cliente.</p>
          </Link>

          <Link href="/roles" style={card}>
            <h3>Roles y Permisos</h3>
            <p>Configurar accesos por perfil de usuario.</p>
          </Link>

          <Link href="/centro-gestion" style={card}>
            <h3>Centro de Gestión KONAX</h3>
            <p>
              Ver empresas registradas, pagos, vencimientos, suspensiones,
              activaciones e historial del negocio KONAX.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
  margin: "0 auto",
};

const titulo = {
  fontSize: "36px",
  marginBottom: "10px",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  marginBottom: "30px",
  maxWidth: "850px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
  gap: "20px",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "14px",
  textDecoration: "none",
  color: "#111827",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};
