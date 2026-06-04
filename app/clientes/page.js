"use client";

import { useState } from "react";

export default function Clientes() {
  const [buscar, setBuscar] = useState("");

  const clientes = [
    {
      nombre: "Juan Pérez",
      cedula: "8-123-456",
      telefono: "6000-0000",
      gestor: "Gestor 1",
      saldo: 1500,
      atraso: 0,
      estado: "🟢 Al Día",
    },
    {
      nombre: "María Díaz",
      cedula: "8-456-789",
      telefono: "6999-9999",
      gestor: "Gestor 2",
      saldo: 800,
      atraso: 15,
      estado: "🔴 Mora",
    },
  ];

  const clientesFiltrados = clientes.filter(
    (cliente) =>
      cliente.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
      cliente.cedula.toLowerCase().includes(buscar.toLowerCase()) ||
      cliente.telefono.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={{ width: "350px", maxWidth: "100%", height: "auto" }}
          />
        </div>

        <div style={{ marginBottom: "30px" }}>
          <h1 style={{ fontSize: "40px", marginBottom: "10px", color: "#111827" }}>
            Clientes
          </h1>
          <p style={{ color: "#6b7280", fontSize: "18px" }}>
            Administración y seguimiento de clientes
          </p>
        </div>

        <div style={resumenGrid}>
          <div style={cardResumen}>
            <div style={cardTitulo}>👥 Clientes</div>
            <div style={cardNumero}>120</div>
          </div>

          <div style={cardResumen}>
            <div style={cardTitulo}>🟢 Al Día</div>
            <div style={cardNumero}>95</div>
          </div>

          <div style={cardResumen}>
            <div style={cardTitulo}>🔴 En Mora</div>
            <div style={cardNumero}>25</div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>👤 Información Personal</h2>

          <div style={grid}>
            <input placeholder="Cédula *" style={inputStyle} />
            <input placeholder="Nombre completo *" style={inputStyle} />
            <input placeholder="Correo electrónico" style={inputStyle} />
            <input placeholder="Teléfono principal *" style={inputStyle} />
            <input placeholder="Teléfono secundario" style={inputStyle} />
            <input placeholder="Nombre referencia personal" style={inputStyle} />
            <input placeholder="Teléfono referencia" style={inputStyle} />
          </div>

          <textarea
            placeholder="Dirección completa"
            style={{
              ...inputStyle,
              marginTop: "15px",
              minHeight: "90px",
            }}
          />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>💳 Información del Crédito</h2>

          <div style={grid}>
            <input placeholder="Producto o servicio" style={inputStyle} />

            <select style={inputStyle}>
              <option>Seleccione tipo de crédito</option>
              <option>Crédito</option>
              <option>Pago voluntario</option>
              <option>Descuento directo</option>
            </select>

            <input placeholder="Monto original" style={inputStyle} />
            <input placeholder="Saldo actual" style={inputStyle} />
            <input placeholder="Cuota" style={inputStyle} />

            <div>
              <label style={labelStyle}>Fecha de inicio</label>
              <input type="date" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Fecha de vencimiento</label>
              <input type="date" style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>📋 Información de Gestión</h2>

          <div style={grid}>
            <select style={inputStyle}>
              <option>Gestor asignado</option>
              <option>Gestor 1</option>
              <option>Gestor 2</option>
            </select>

            <select style={inputStyle}>
              <option>Al Día</option>
              <option>Mora</option>
              <option>Promesa de Pago</option>
              <option>Cancelado</option>
              <option>Legal</option>
            </select>
          </div>

          <textarea
            placeholder="Observación inicial"
            style={{
              ...inputStyle,
              marginTop: "15px",
              minHeight: "120px",
            }}
          />

          <button style={crearBtn}>+ Crear Cliente</button>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>👥 Clientes Registrados</h2>

          <input
            placeholder="🔍 Buscar por nombre, cédula o teléfono..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            style={{ ...inputStyle, marginBottom: "20px" }}
          />

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Cédula</th>
                  <th style={thStyle}>Teléfono</th>
                  <th style={thStyle}>Gestor</th>
                  <th style={thStyle}>Saldo</th>
                  <th style={thStyle}>Días atraso</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map((cliente, index) => (
                  <tr key={index}>
                    <td style={tdStyle}>{cliente.nombre}</td>
                    <td style={tdStyle}>{cliente.cedula}</td>
                    <td style={tdStyle}>{cliente.telefono}</td>
                    <td style={tdStyle}>{cliente.gestor}</td>
                    <td style={tdStyle}>${cliente.saldo.toLocaleString()}</td>
                    <td style={tdStyle}>{cliente.atraso}</td>
                    <td style={tdStyle}>{cliente.estado}</td>
                    <td style={tdStyle}>
                      <button style={accionBtn}>Ver</button>
                      <button style={accionBtn}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "20px",
  marginBottom: "30px",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
  gap: "15px",
};

const tituloSeccion = {
  marginBottom: "20px",
  color: "#111827",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  color: "#374151",
  fontWeight: "bold",
};

const cardResumen = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const cardTitulo = {
  color: "#6b7280",
  marginBottom: "10px",
  fontSize: "15px",
};

const cardNumero = {
  fontSize: "32px",
  fontWeight: "bold",
  color: "#111827",
};

const thStyle = {
  textAlign: "left",
  padding: "15px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const tdStyle = {
  padding: "15px",
  borderBottom: "1px solid #f3f4f6",
};

const accionBtn = {
  padding: "8px 14px",
  marginRight: "8px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
};

const crearBtn = {
  marginTop: "20px",
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "15px 30px",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
};
