"use client";

import { useEffect, useState } from "react";

export default function Inicio() {
  const [empresa, setEmpresa] = useState({
    nombre: "Cargando empresa...",
    plan: "KONAX Gestión",
    usuarios: 2,
    estado: "Activo",
  });

  useEffect(() => {
    const datosGuardados = localStorage.getItem("empresaConfigurada");

    if (datosGuardados) {
      const datos = JSON.parse(datosGuardados);

      setEmpresa({
        nombre: datos.nombreEmpresa || datos.nombre || "Empresa sin nombre",
        plan: datos.plan || "KONAX Gestión",
        usuarios: datos.usuarios || 2,
        estado: datos.estado || "Activo",
      });
    } else {
      const nombreEmpresa = localStorage.getItem("empresaNombre");

      setEmpresa({
        nombre: nombreEmpresa || "Empresa no encontrada",
        plan: "KONAX Gestión",
        usuarios: 2,
        estado: "Activo",
      });
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "1100px",
          maxWidth: "100%",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "60px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={{
            width: "700px",
            maxWidth: "100%",
            height: "auto",
            marginBottom: "25px",
          }}
        />

        <h1
          style={{
            fontSize: "44px",
            color: "#111827",
            marginBottom: "15px",
            fontWeight: "700",
          }}
        >
          Bienvenido a KONAX
        </h1>

        <p
          style={{
            color: "#374151",
            fontSize: "22px",
            fontWeight: "500",
            marginBottom: "12px",
          }}
        >
          {empresa.nombre} ha sido configurada correctamente.
        </p>

        <p
          style={{
            color: "#6b7280",
            fontSize: "20px",
            marginBottom: "50px",
          }}
        >
          Tu empresa está lista para comenzar a gestionar clientes,
          créditos y cobranzas con KONAX.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginBottom: "50px",
          }}
        >
          <div style={tarjeta}>
            <div style={label}>🏢 Empresa</div>
            <div style={valor}>{empresa.nombre}</div>
          </div>

          <div style={tarjeta}>
            <div style={label}>📦 Plan Activo</div>
            <div style={valor}>{empresa.plan}</div>
          </div>

          <div style={tarjeta}>
            <div style={label}>👥 Usuarios</div>
            <div style={valor}>{empresa.usuarios} Registrados</div>
          </div>

          <div style={tarjeta}>
            <div style={label}>🟢 Estado</div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: "bold",
                color: "#16a34a",
              }}
            >
              {empresa.estado}
            </div>
          </div>
        </div>

        <button
          onClick={() => (window.location.href = "/clientes")}
          style={{
            width: "100%",
            background: "#16a34a",
            color: "#ffffff",
            border: "none",
            padding: "22px",
            borderRadius: "14px",
            fontSize: "20px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(22,163,74,0.30)",
          }}
        >
          Ingresar al Sistema
        </button>
      </div>
    </div>
  );
}

const tarjeta = {
  background: "#f9fafb",
  padding: "25px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
};

const label = {
  color: "#6b7280",
  fontSize: "14px",
  marginBottom: "8px",
};

const valor = {
  fontSize: "22px",
  fontWeight: "bold",
};
