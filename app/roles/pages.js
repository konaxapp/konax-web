"use client";

export default function Roles() {
  return (
    <div style={pagina}>
      <h1>Roles y Permisos</h1>

      <p style={subtitulo}>
        Pantalla para definir perfiles generales de acceso dentro de KONAX.
      </p>

      <div style={card}>
        <h2>Roles principales</h2>

        <ul style={lista}>
          <li>SuperAdmin - Noriel y Katherine</li>
          <li>Administrador - Dueño o encargado de la empresa</li>
          <li>Supervisor - Control operativo</li>
          <li>Cajero - Acceso a caja</li>
          <li>Vendedor - Ventas y clientes</li>
          <li>Cobranza - Gestión de cobros</li>
        </ul>
      </div>

      <a href="/admin" style={boton}>
        Volver al Panel Administrador
      </a>
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
  marginBottom: "25px",
};

const card = {
  background: "#fff",
  padding: "25px",
  borderRadius: "14px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  marginBottom: "25px",
};

const lista = {
  lineHeight: "32px",
};

const boton = {
  display: "inline-block",
  background: "#111827",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "bold",
};
