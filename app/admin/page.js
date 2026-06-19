"use client";

export default function Admin() {
  return (
    <div style={pagina}>
      <h1>Panel Administrador KONAX</h1>

      <p style={subtitulo}>
        Panel maestro para administrar empresas, usuarios, roles, permisos y módulos.
      </p>

      <div style={grid}>
        <a href="/empresas" style={card}>
          <h3>Empresas</h3>
          <p>Crear y administrar empresas.</p>
        </a>

        <a href="/usuarios" style={card}>
          <h3>Usuarios</h3>
          <p>Crear usuarios y asignar empresas.</p>
        </a>

        <a href="/roles" style={card}>
          <h3>Roles</h3>
          <p>Administrar roles y permisos.</p>
        </a>

        <a href="/dashboard" style={card}>
          <h3>Dashboard</h3>
          <p>Ir al centro de operaciones.</p>
        </a>
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

const subtitulo = {
  color: "#6b7280",
  marginBottom: "30px",
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
