"use client";

import Link from "next/link";

export default function Admin() {
  return (
    <div style={pagina}>
      <div style={contenedor}>
        <h1 style={titulo}>Panel Administrador KONAX</h1>

        <p style={subtitulo}>
          Centro maestro para administrar empresas clientes, planes, módulos,
          usuarios principales, facturación y bitácora interna.
        </p>

        <div style={grid}>
          <Link href="/empresas" style={card}>
            <h3>Empresas Clientes</h3>
            <p>Crear, activar, suspender y administrar empresas.</p>
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

          <Link href="/facturacion" style={card}>
            <h3>Facturación KONAX</h3>
            <p>Controlar pagos, vencimientos y estado del servicio.</p>
          </Link>

          <Link href="/bitacora-empresas" style={card}>
            <h3>Bitácora Interna</h3>
            <p>Ver historial de cambios, pagos, suspensiones y activaciones.</p>
          </Link>

          <Link href="/dashboard" style={card}>
            <h3>Dashboard Empresa</h3>
            <p>Entrar al centro operativo de la empresa seleccionada.</p>
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
  maxWidth: "800px",
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
