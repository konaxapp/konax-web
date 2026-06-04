"use client";

import { useState } from "react";

export default function ControlCaja() {
  const [arqueo, setArqueo] = useState({
    sistema: 8000,
    contado: "",
    observacion: "",
  });

  const cierres = [
    {
      fecha: "04/06/2026",
      inicial: 6500,
      final: 8000,
      diferencia: 0,
      usuario: "Administrador",
      estado: "Cerrado",
    },
    {
      fecha: "03/06/2026",
      inicial: 6200,
      final: 6500,
      diferencia: -10,
      usuario: "Administrador",
      estado: "Cerrado",
    },
  ];

  const diferencia =
    Number(arqueo.contado || 0) - Number(arqueo.sistema || 0);

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={logoBox}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
        </div>

        <h1 style={titulo}>Control de Caja</h1>

        <p style={subtitulo}>
          Arqueo y cierre diario de operaciones
        </p>

        <div style={cardsGrid}>
          <div style={cardKpi}>
            <div style={kpiTitulo}>💵 Efectivo</div>
            <div style={kpiValor}>$2,500</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>🏦 Transferencias</div>
            <div style={kpiValor}>$4,300</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>📱 Yappy</div>
            <div style={kpiValor}>$1,200</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>💰 Total Caja</div>
            <div style={kpiValor}>$8,000</div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Arqueo de Caja</h2>

          <div style={grid}>
            <div>
              <label style={label}>Efectivo Sistema</label>

              <input value={arqueo.sistema} readOnly style={inputStyle} />
            </div>

            <div>
              <label style={label}>Efectivo Contado</label>

              <input
                type="number"
                value={arqueo.contado}
                onChange={(e) =>
                  setArqueo({
                    ...arqueo,
                    contado: e.target.value,
                  })
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={label}>Diferencia</label>

              <input
                value={diferencia}
                readOnly
                style={{
                  ...inputStyle,
                  fontWeight: "bold",
                  color:
                    diferencia === 0
                      ? "#16a34a"
                      : diferencia > 0
                      ? "#2563eb"
                      : "#dc2626",
                }}
              />
            </div>
          </div>

          <textarea
            placeholder="Observación del arqueo..."
            style={textarea}
            value={arqueo.observacion}
            onChange={(e) =>
              setArqueo({
                ...arqueo,
                observacion: e.target.value,
              })
            }
          />

          <div style={acciones}>
            <button style={boton}>Realizar Arqueo</button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Cierre Diario</h2>

          <div style={cardsGrid}>
            <div style={cardKpi}>
              <div style={kpiTitulo}>Total Cobrado</div>
              <div style={kpiValor}>$8,000</div>
            </div>

            <div style={cardKpi}>
              <div style={kpiTitulo}>Total Efectivo</div>
              <div style={kpiValor}>$2,500</div>
            </div>

            <div style={cardKpi}>
              <div style={kpiTitulo}>Total Digital</div>
              <div style={kpiValor}>$5,500</div>
            </div>

            <div style={cardKpi}>
              <div style={kpiTitulo}>Transacciones</div>
              <div style={kpiValor}>35</div>
            </div>
          </div>

          <div style={acciones}>
            <button style={boton}>Cerrar Caja</button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Historial de Cierres</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Caja Inicial</th>
                  <th style={th}>Caja Final</th>
                  <th style={th}>Diferencia</th>
                  <th style={th}>Usuario</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {cierres.map((item, index) => (
                  <tr key={index}>
                    <td style={td}>{item.fecha}</td>
                    <td style={td}>${item.inicial}</td>
                    <td style={td}>${item.final}</td>
                    <td
                      style={{
                        ...td,
                        fontWeight: "bold",
                        color:
                          item.diferencia === 0
                            ? "#16a34a"
                            : item.diferencia > 0
                            ? "#2563eb"
                            : "#dc2626",
                      }}
                    >
                      ${item.diferencia}
                    </td>
                    <td style={td}>{item.usuario}</td>
                    <td style={td}>{item.estado}</td>
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
  marginBottom: "12px",
};

const logo = {
  width: "110px",
  maxWidth: "100%",
  height: "auto",
};

const titulo = {
  fontSize: "32px",
  marginBottom: "6px",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  fontSize: "16px",
  marginBottom: "20px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginBottom: "16px",
  color: "#111827",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
  marginBottom: "16px",
};

const cardKpi = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const kpiTitulo = {
  color: "#6b7280",
  marginBottom: "8px",
  fontSize: "14px",
};

const kpiValor = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#111827",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
  gap: "15px",
};

const label = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  color: "#374151",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const textarea = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  minHeight: "100px",
  marginTop: "18px",
};

const acciones = {
  display: "flex",
  gap: "15px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
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
