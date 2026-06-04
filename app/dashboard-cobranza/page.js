  "use client";

import { useState } from "react";

export default function DashboardCobranza() {
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroGestor, setFiltroGestor] = useState("Todos");

  const data = {
    totalCartera: 11000,
    totalMora: 9500,
    clientesMora: 3,
    promesasPendientes: 2,
    verdes: 1,
    amarillos: 1,
    naranjas: 1,
    rojos: 1,

    clientesAtraso: [
      { nombre: "Ana López", atraso: 120, saldo: 5500 },
      { nombre: "Pedro Gómez", atraso: 55, saldo: 3200 },
      { nombre: "María Díaz", atraso: 18, saldo: 800 },
    ],

    clientesSaldo: [
      { nombre: "Ana López", saldo: 5500, atraso: 120 },
      { nombre: "Pedro Gómez", saldo: 3200, atraso: 55 },
      { nombre: "Juan Pérez", saldo: 1500, atraso: 0 },
    ],

    gestores: [
      { gestor: "Gestor 1", saldo: 4700, clientes: 2 },
      { gestor: "Gestor 2", saldo: 800, clientes: 1 },
      { gestor: "Gestor 3", saldo: 5500, clientes: 1 },
    ],
  };

  const formato = (numero) => {
    return "USD " + Number(numero).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });
  };

  const aplicarFiltros = () => {
    alert("Aquí se aplicarán filtros reales cuando conectemos Supabase.");
  };

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={logo}
          />

          <div>
            <h1 style={titulo}>Dashboard de Cobranza</h1>
            <p style={subtitulo}>
              Indicadores generales de cartera, mora, gestores y promesas.
            </p>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Filtros</h2>

          <div style={gridFiltros}>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              style={inputStyle}
            />

            <select
              value={filtroGestor}
              onChange={(e) => setFiltroGestor(e.target.value)}
              style={inputStyle}
            >
              <option>Todos</option>
              <option>Gestor 1</option>
              <option>Gestor 2</option>
              <option>Gestor 3</option>
            </select>

            <button style={boton} onClick={aplicarFiltros}>
              Buscar
            </button>
          </div>
        </div>

        <div style={cards}>
          <div style={cardIndicador}>
            <h3 style={cardTitulo}>Total Cartera</h3>
            <h2 style={cardNumero}>{formato(data.totalCartera)}</h2>
          </div>

          <div style={cardIndicador}>
            <h3 style={cardTitulo}>Total Mora</h3>
            <h2 style={cardNumero}>{formato(data.totalMora)}</h2>
          </div>

          <div style={cardIndicador}>
            <h3 style={cardTitulo}>Clientes Mora</h3>
            <h2 style={cardNumero}>{data.clientesMora}</h2>
          </div>

          <div style={cardIndicador}>
            <h3 style={cardTitulo}>Promesas Pendientes</h3>
            <h2 style={cardNumero}>{data.promesasPendientes}</h2>
          </div>
        </div>

        <div style={rangos}>
          <div style={{ ...rango, background: "#43a047" }}>
            🟢 {data.verdes}
          </div>

          <div style={{ ...rango, background: "#f9a825" }}>
            🟡 {data.amarillos}
          </div>

          <div style={{ ...rango, background: "#f4511e" }}>
            🟠 {data.naranjas}
          </div>

          <div style={{ ...rango, background: "#8e0000" }}>
            🔴 {data.rojos}
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Clientes con Mayor Atraso</h2>

          <table style={tabla}>
            <thead>
              <tr>
                <th style={th}>Cliente</th>
                <th style={th}>Días Atraso</th>
                <th style={th}>Saldo</th>
              </tr>
            </thead>

            <tbody>
              {data.clientesAtraso.map((cliente, index) => (
                <tr key={index}>
                  <td style={td}>{cliente.nombre}</td>
                  <td style={td}>{cliente.atraso}</td>
                  <td style={td}>{formato(cliente.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Clientes con Mayor Saldo</h2>

          <table style={tabla}>
            <thead>
              <tr>
                <th style={th}>Cliente</th>
                <th style={th}>Saldo</th>
                <th style={th}>Atraso</th>
              </tr>
            </thead>

            <tbody>
              {data.clientesSaldo.map((cliente, index) => (
                <tr key={index}>
                  <td style={td}>{cliente.nombre}</td>
                  <td style={td}>{formato(cliente.saldo)}</td>
                  <td style={td}>{cliente.atraso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Gestión por Gestor</h2>

          <table style={tabla}>
            <thead>
              <tr>
                <th style={th}>Gestor</th>
                <th style={th}>Total Cartera</th>
                <th style={th}>Clientes</th>
              </tr>
            </thead>

            <tbody>
              {data.gestores.map((gestor, index) => (
                <tr key={index}>
                  <td style={td}>{gestor.gestor}</td>
                  <td style={td}>{formato(gestor.saldo)}</td>
                  <td style={td}>{gestor.clientes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1400px",
  margin: "0 auto",
};

const encabezado = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "18px",
};

const logo = {
  width: "110px",
  maxWidth: "100%",
  height: "auto",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  fontSize: "16px",
  marginTop: "6px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "14px",
  marginBottom: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginBottom: "14px",
  color: "#111827",
};

const gridFiltros = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "12px",
  alignItems: "center",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const cards = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const cardIndicador = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "14px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const cardTitulo = {
  margin: 0,
  fontSize: "15px",
  color: "#6b7280",
};

const cardNumero = {
  marginTop: "10px",
  fontSize: "30px",
  color: "#111827",
};

const rangos = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const rango = {
  color: "#ffffff",
  textAlign: "center",
  padding: "22px",
  borderRadius: "14px",
  fontSize: "28px",
  fontWeight: "bold",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  background: "#111827",
  color: "#ffffff",
  padding: "12px",
  textAlign: "left",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
};
