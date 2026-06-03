"use client";

import { useState } from "react";

export default function Clientes() {
  const [buscar, setBuscar] = useState("");

  const clientes = [
    {
      nombre: "Juan Pérez",
      cedula: "8-123-456",
      telefono: "6000-0000",
      saldo: 1500,
      atraso: 0,
      estado: "🟢",
    },
    {
      nombre: "María Díaz",
      cedula: "8-456-789",
      telefono: "6999-9999",
      saldo: 800,
      atraso: 15,
      estado: "🟡",
    },
  ];

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
      c.cedula.toLowerCase().includes(buscar.toLowerCase())
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
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            color: "#111827",
            marginBottom: "30px",
          }}
        >
          Clientes
        </h1>

        {/* INFORMACIÓN PERSONAL */}
        <div
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "16px",
            marginBottom: "20px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <h2>Información Personal</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(250px,1fr))",
              gap: "15px",
            }}
          >
            <input placeholder="Cédula" style={inputStyle} />
            <input placeholder="Nombre" style={inputStyle} />
            <input placeholder="Correo Electrónico" style={inputStyle} />
            <input placeholder="Teléfono 1" style={inputStyle} />
            <input placeholder="Teléfono 2" style={inputStyle} />
            <input placeholder="Dirección" style={inputStyle} />
            <input placeholder="Referencia Personal" style={inputStyle} />
            <input placeholder="Teléfono Referencia" style={inputStyle} />
          </div>
        </div>

        {/* INFORMACIÓN DEL CRÉDITO */}
        <div
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "16px",
            marginBottom: "20px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <h2>Información del Crédito</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(250px,1fr))",
              gap: "15px",
            }}
          >
            <input placeholder="Producto" style={inputStyle} />

            <select style={inputStyle}>
              <option>Seleccione Tipo</option>
              <option>Crédito</option>
              <option>Pago Voluntario</option>
              <option>Descuento Directo</option>
            </select>

            <input placeholder="Monto Original" style={inputStyle} />
            <input placeholder="Cuota" style={inputStyle} />
            <input type="date" style={inputStyle} />
            <input type="date" style={inputStyle} />
          </div>
        </div>

        {/* INFORMACIÓN DE GESTIÓN */}
        <div
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "16px",
            marginBottom: "20px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <h2>Información de Gestión</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(250px,1fr))",
              gap: "15px",
            }}
          >
            <select style={inputStyle}>
              <option>Gestor 1</option>
              <option>Gestor 2</option>
            </select>
          </div>

          <textarea
            placeholder="Observación Inicial"
            style={{
              ...inputStyle,
              marginTop: "15px",
              minHeight: "100px",
            }}
          />

          <button
            style={{
              marginTop: "20px",
              background: "#16a34a",
              color: "#fff",
              border: "none",
              padding: "14px 25px",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Crear Cliente
          </button>
        </div>

        {/* BUSCADOR */}
        <div
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "16px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <h2>Clientes Registrados</h2>

          <input
            placeholder="Buscar cliente..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            style={{
              ...inputStyle,
              marginBottom: "20px",
            }}
          />

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>Cédula</th>
                <th style={thStyle}>Teléfono</th>
                <th style={thStyle}>Saldo</th>
                <th style={thStyle}>Días Atraso</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {clientesFiltrados.map((c, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{c.nombre}</td>
                  <td style={tdStyle}>{c.cedula}</td>
                  <td style={tdStyle}>{c.telefono}</td>
                  <td style={tdStyle}>${c.saldo}</td>
                  <td style={tdStyle}>{c.atraso}</td>
                  <td style={tdStyle}>{c.estado}</td>
                  <td style={tdStyle}>
                    Ver | Editar
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
};

const thStyle = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f3f4f6",
};
