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
