"use client";
import { useState } from "react";
export default function DashboardFinanciero() { return (  
<div style={logoBox}>
      <img
        src="/konax-logo.png"
        alt="KONAX"
        style={logo}
      />
    </div>

    <h1 style={titulo}>
      Dashboard Financiero
    </h1>

    <p style={subtitulo}>
      Resumen financiero y operativo del negocio
    </p>

    <div style={cardsGrid}>
      <div style={cardKpi}>
        <div style={kpiTitulo}>💰 Ingresos Hoy</div>
        <div style={kpiValor}>$8,000</div>
      </div>

      <div style={cardKpi}>
        <div style={kpiTitulo}>📈 Ingresos Mes</div>
        <div style={kpiValor}>$42,500</div>
      </div>

      <div style={cardKpi}>
        <div style={kpiTitulo}>💸 Gastos Mes</div>
        <div style={kpiValor}>$7,800</div>
      </div>

      <div style={cardKpi}>
        <div style={kpiTitulo}>🏦 Utilidad Neta</div>
        <div style={kpiValor}>$34,700</div>
      </div>
    </div>

    <div style={card}>
      <h2 style={tituloSeccion}>
        Resumen Operativo
      </h2>

      <div style={cardsGrid}>
        <div style={cardKpi}>
          <div style={kpiTitulo}>Ventas Contado</div>
          <div style={kpiValor}>$12,500</div>
        </div>

        <div style={cardKpi}>
          <div style={kpiTitulo}>Ventas Crédito</div>
          <div style={kpiValor}>$18,000</div>
        </div>

        <div style={cardKpi}>
          <div style={kpiTitulo}>Cobros</div>
          <div style={kpiValor}>$9,200</div>
        </div>

        <div style={cardKpi}>
          <div style={kpiTitulo}>Abonos</div>
          <div style={kpiValor}>$3,400</div>
        </div>
      </div>
    </div>

    <div style={card}>
      <h2 style={tituloSeccion}>
        Indicadores de Cartera
      </h2>

      <div style={cardsGrid}>
        <div style={cardKpi}>
          <div style={kpiTitulo}>Clientes Activos</div>
          <div style={kpiValor}>120</div>
        </div>

        <div style={cardKpi}>
          <div style={kpiTitulo}>Créditos Activos</div>
          <div style={kpiValor}>85</div>
        </div>

        <div style={cardKpi}>
          <div style={kpiTitulo}>Clientes en Mora</div>
          <div style={kpiValor}>25</div>
        </div>

        <div style={cardKpi}>
          <div style={kpiTitulo}>Recuperación</div>
          <div style={kpiValor}>78%</div>
        </div>
      </div>
    </div>

    <div style={card}>
      <h2 style={tituloSeccion}>
        Ranking de Gestores
      </h2>

      <table style={tabla}>
        <thead>
          <tr>
            <th style={th}>Gestor</th>
            <th style={th}>Cobrado</th>
            <th style={th}>Clientes</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={td}>Gestor 1</td>
            <td style={td}>$12,000</td>
            <td style={td}>35</td>
          </tr>

          <tr>
            <td style={td}>Gestor 2</td>
            <td style={td}>$9,500</td>
            <td style={td}>28</td>
          </tr>

          <tr>
            <td style={td}>Gestor 3</td>
            <td style={td}>$7,200</td>
            <td style={td}>22</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</div>
); }
const pagina = { minHeight: "100vh", background: "#f3f4f6", padding: "40px", fontFamily: "Arial, sans-serif", };
const contenedor = { maxWidth: "1300px", margin: "0 auto", };
const logoBox = { textAlign: "center", marginBottom: "25px", };
const logo = { width: "260px", maxWidth: "100%", height: "auto", };
const titulo = { fontSize: "40px", marginBottom: "10px", color: "#111827", };
const subtitulo = { color: "#6b7280", fontSize: "18px", marginBottom: "30px", };
const card = { background: "#ffffff", padding: "25px", borderRadius: "16px", marginBottom: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", };
const tituloSeccion = { marginBottom: "20px", color: "#111827", };
const cardsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "20px", marginBottom: "20px", };
const cardKpi = { background: "#ffffff", padding: "25px", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", };
const kpiTitulo = { color: "#6b7280", marginBottom: "10px", fontSize: "15px", };
const kpiValor = { fontSize: "32px", fontWeight: "bold", color: "#111827", };
const tabla = { width: "100%", borderCollapse: "collapse", };
const th = { textAlign: "left", padding: "15px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", };
const td = { padding: "15px", borderBottom: "1px solid #f3f4f6", };
