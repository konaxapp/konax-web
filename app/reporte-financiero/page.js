"use client";

import { useState } from "react";

export default function ReporteFinanciero() {
const [desde, setDesde] = useState("");
const [hasta, setHasta] = useState("");

const movimientos = [
{
fecha: "04/06/2026",
tipo: "Ingreso",
descripcion: "Cobro Cliente",
monto: "$500",
},
{
fecha: "04/06/2026",
tipo: "Gasto",
descripcion: "Combustible",
monto: "$50",
},
{
fecha: "04/06/2026",
tipo: "Ingreso",
descripcion: "Venta Contado",
monto: "$300",
},
];

return (
<div style={pagina}>
<div style={contenedor}>

    <div style={logoBox}>
      <img
        src="/konax-logo.png"
        alt="KONAX"
        style={logo}
      />
    </div>

    <h1 style={titulo}>
      Reporte Financiero
    </h1>

    <p style={subtitulo}>
      Ingresos, gastos y utilidad del negocio
    </p>

    <div style={card}>
      <div style={filtros}>
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          style={input}
        />

        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          style={input}
        />

        <button style={boton}>
          Generar
        </button>
      </div>
    </div>

    <div style={cardsGrid}>
      <div style={cardKpi}>
        <div style={kpiTitulo}>
          💰 Ingresos
        </div>
        <div style={kpiValor}>
          $42,500
        </div>
      </div>

      <div style={cardKpi}>
        <div style={kpiTitulo}>
          💸 Gastos
        </div>
        <div style={kpiValor}>
          $7,800
        </div>
      </div>

      <div style={cardKpi}>
        <div style={kpiTitulo}>
          🏦 Utilidad
        </div>
        <div style={kpiValor}>
          $34,700
        </div>
      </div>

      <div style={cardKpi}>
        <div style={kpiTitulo}>
          📈 Margen
        </div>
        <div style={kpiValor}>
          81%
        </div>
      </div>
    </div>

    <div style={card}>
      <h2 style={tituloSeccion}>
        Movimientos Financieros
      </h2>

      <div style={{ overflowX: "auto" }}>
        <table style={tabla}>
          <thead>
            <tr>
              <th style={th}>Fecha</th>
              <th style={th}>Tipo</th>
              <th style={th}>Descripción</th>
              <th style={th}>Monto</th>
            </tr>
          </thead>

          <tbody>
            {movimientos.map((item, index) => (
              <tr key={index}>
                <td style={td}>{item.fecha}</td>
                <td style={td}>{item.tipo}</td>
                <td style={td}>{item.descripcion}</td>
                <td style={td}>{item.monto}</td>
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
const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "18px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
  margin: "0 auto",
};

const logoBox = {
  textAlign: "center",
  marginBottom: "20px",
};

const logo = {
  width: "110px",
  height: "auto",
};

const titulo = {
  fontSize: "32px",
  color: "#111827",
  marginBottom: "10px",
};

const subtitulo = {
  color: "#6b7280",
  marginBottom: "20px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const filtros = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const input = {
  padding: "10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  cursor: "pointer",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: "20px",
  marginBottom: "20px",
};

const cardKpi = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  boxShadow:
    "0 2px 10px rgba(0,0,0,0.05)",
};

const kpiTitulo = {
  color: "#6b7280",
  marginBottom: "10px",
  fontSize: "15px",
};

const kpiValor = {
  fontSize: "32px",
  fontWeight: "bold",
  color: "#111827",
};

const tituloSeccion = {
  marginBottom: "20px",
  color: "#111827",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #f3f4f6",
};
