"use client";

import { useState } from "react";

export default function DashboardCobranza() {
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [filtroGestor, setFiltroGestor] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const data = {
    carteraTotal: 110000,
    carteraAlDia: 65000,
    carteraMora: 45000,
    porcentajeMora: 40.9,
    cobradoHoy: 2500,
    cobradoMes: 18500,
    metaMes: 40000,
    recuperacionMes: 16.8,
    promesasActivas: 12,
    promesasCumplidas: 8,
    promesasIncumplidas: 4,
    montoPromesasActivas: 6200,
    montoPromesasIncumplidas: 2400,
    clientesActivos: 120,
    clientesMora: 34,

    semaforo: {
      verde: 65000,
      amarillo: 18000,
      naranja: 15000,
      rojo: 12000,
    },

    gestores: [
      { gestor: "Gestor 1", cobrado: 7200, clientes: 22, recuperacion: 28 },
      { gestor: "Gestor 2", cobrado: 5800, clientes: 18, recuperacion: 21 },
      { gestor: "Gestor 3", cobrado: 5500, clientes: 16, recuperacion: 19 },
    ],

    moraAntiguedad: [
      { rango: "1-29 días", monto: 18000 },
      { rango: "30-59 días", monto: 15000 },
      { rango: "60-89 días", monto: 7000 },
      { rango: "90+ días", monto: 5000 },
    ],

    mayorMora: [
      { cliente: "Ana López", dias: 120, saldo: 5500, gestor: "Gestor 3" },
      { cliente: "Pedro Gómez", dias: 55, saldo: 3200, gestor: "Gestor 1" },
      { cliente: "María Díaz", dias: 18, saldo: 800, gestor: "Gestor 2" },
    ],

    mayorSaldo: [
      { cliente: "Ana López", saldo: 5500, estado: "🔴 Crítico" },
      { cliente: "Pedro Gómez", saldo: 3200, estado: "🟠 Mora" },
      { cliente: "Juan Pérez", saldo: 1500, estado: "🟢 Al Día" },
    ],
  };

  const formato = (numero) =>
    "USD " +
    Number(numero).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

  const imprimirReporte = () => {
    window.print();
  };

  const buscar = () => {
    alert("Aquí se aplicarán filtros reales cuando conectemos Supabase.");
  };

  const limpiarFiltros = () => {
    setFiltroDesde("");
    setFiltroHasta("");
    setFiltroGestor("Todos");
    setFiltroEstado("Todos");
  };

  const colorGestor = (index) => {
    const colores = [
      "#16a34a",
      "#2563eb",
      "#f97316",
      "#7c3aed",
      "#dc2626",
      "#0891b2",
      "#ca8a04",
      "#be185d",
    ];

    return colores[index % colores.length];
  };

  const avanceMeta = Math.min((data.cobradoMes / data.metaMes) * 100, 100);
  const maxGestor = Math.max(...data.gestores.map((g) => g.cobrado));
  const maxMora = Math.max(...data.moraAntiguedad.map((m) => m.monto));

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={tituloBox}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <h1 style={titulo}>Dashboard Cobranza</h1>
              <p style={subtitulo}>
                Indicadores de cartera, mora, promesas, recuperación y gestores.
              </p>
            </div>
          </div>

          <div style={accionesTop}>
            <button style={botonNegro} onClick={imprimirReporte}>
              Imprimir Reporte
            </button>

            <button style={botonSecundario}>Exportar PDF</button>
            <button style={botonSecundario}>Exportar Excel</button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Filtros</h2>

          <div style={gridFiltros}>
            <div>
              <label style={label}>Fecha desde</label>
              <input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={label}>Fecha hasta</label>
              <input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={label}>Gestor</label>
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
            </div>

            <div>
              <label style={label}>Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                style={inputStyle}
              >
                <option>Todos</option>
                <option>Al Día</option>
                <option>Mora</option>
                <option>Crítico</option>
                <option>Legal</option>
              </select>
            </div>
          </div>

          <div style={acciones}>
            <button style={boton} onClick={buscar}>
              Buscar
            </button>

            <button style={botonGris} onClick={limpiarFiltros}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={kpiGrid}>
          <KPI titulo="Cartera Total" valor={formato(data.carteraTotal)} icono="💰" />
          <KPI titulo="Cartera Al Día" valor={formato(data.carteraAlDia)} icono="🟢" />
          <KPI titulo="Cartera en Mora" valor={formato(data.carteraMora)} icono="🔴" />
          <KPI titulo="% Mora" valor={`${data.porcentajeMora}%`} icono="📈" />
          <KPI titulo="Cobrado Hoy" valor={formato(data.cobradoHoy)} icono="📅" />
          <KPI titulo="Cobrado Mes" valor={formato(data.cobradoMes)} icono="📆" />
          <KPI titulo="Promesas Activas" valor={data.promesasActivas} icono="🤝" />
          <KPI titulo="Promesas Incumplidas" valor={data.promesasIncumplidas} icono="⚠️" />
          <KPI titulo="Promesas Cumplidas" valor={data.promesasCumplidas} icono="✅" />
          <KPI titulo="Clientes Activos" valor={data.clientesActivos} icono="👥" />
          <KPI titulo="Clientes en Mora" valor={data.clientesMora} icono="🚨" />
          <KPI titulo="Recuperación Mes" valor={`${data.recuperacionMes}%`} icono="📊" />
        </div>

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>Meta de Cobro del Mes</h2>

            <p style={textoGrande}>
              {formato(data.cobradoMes)} / {formato(data.metaMes)}
            </p>

            <div style={barraFondo}>
              <div style={{ ...barraProgreso, width: `${avanceMeta}%` }} />
            </div>

            <p style={nota}>{avanceMeta.toFixed(1)}% alcanzado</p>
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Semáforo General</h2>

            <div style={semaforoGrid}>
              <Semaforo label="🟢 Al día" valor={formato(data.semaforo.verde)} />
              <Semaforo label="🟡 1-29 días" valor={formato(data.semaforo.amarillo)} />
              <Semaforo label="🟠 30-59 días" valor={formato(data.semaforo.naranja)} />
              <Semaforo label="🔴 60+ días" valor={formato(data.semaforo.rojo)} />
            </div>
          </div>
        </div>

        <div style={gridGraficas}>
          <div style={card}>
            <h2 style={tituloSeccion}>Estado de Cartera</h2>

            <div style={graficaBox}>
              <div
                style={{
                  ...dona,
                  background: `conic-gradient(#16a34a 0% ${
                    (data.carteraAlDia / data.carteraTotal) * 100
                  }%, #dc2626 ${
                    (data.carteraAlDia / data.carteraTotal) * 100
                  }% 100%)`,
                }}
              />

              <div>
                <p>🟢 Al día: {formato(data.carteraAlDia)}</p>
                <p>🔴 Mora: {formato(data.carteraMora)}</p>
              </div>
            </div>
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Promesas</h2>

            <div style={graficaBox}>
              <div
                style={{
                  ...dona,
                  background:
                    "conic-gradient(#16a34a 0% 45%, #f59e0b 45% 75%, #dc2626 75% 100%)",
                }}
              />

              <div>
                <p>✅ Cumplidas: {data.promesasCumplidas}</p>
                <p>🤝 Activas: {data.promesasActivas}</p>
                <p>⚠️ Incumplidas: {data.promesasIncumplidas}</p>
                <p>Monto activo: {formato(data.montoPromesasActivas)}</p>
                <p>Monto incumplido: {formato(data.montoPromesasIncumplidas)}</p>
              </div>
            </div>
          </div>
        </div>

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>Cobro por Gestor</h2>

            {data.gestores.map((g, index) => (
              <div key={index} style={barraItem}>
                <div style={barraHeader}>
                  <strong>{g.gestor}</strong>
                  <span>{formato(g.cobrado)}</span>
                </div>

                <div style={barraFondo}>
                  <div
                    style={{
                      ...barraProgreso,
                      width: `${(g.cobrado / maxGestor) * 100}%`,
                      background: colorGestor(index),
                    }}
                  />
                </div>

                <p style={{ ...nota, marginTop: "5px" }}>
                  Recuperación: {g.recuperacion}%
                </p>
              </div>
            ))}
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Mora por Antigüedad</h2>

            {data.moraAntiguedad.map((m, index) => (
              <div key={index} style={barraItem}>
                <div style={barraHeader}>
                  <strong>{m.rango}</strong>
                  <span>{formato(m.monto)}</span>
                </div>

                <div style={barraFondo}>
                  <div
                    style={{
                      ...barraProgreso,
                      width: `${(m.monto / maxMora) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Tabla
          titulo="Top Clientes con Mayor Mora"
          columnas={["Cliente", "Días", "Saldo", "Gestor"]}
          filas={data.mayorMora.map((c) => [
            c.cliente,
            c.dias,
            formato(c.saldo),
            c.gestor,
          ])}
        />

        <Tabla
          titulo="Top Clientes con Mayor Saldo"
          columnas={["Cliente", "Saldo", "Estado"]}
          filas={data.mayorSaldo.map((c) => [
            c.cliente,
            formato(c.saldo),
            c.estado,
          ])}
        />

        <Tabla
          titulo="Ranking de Gestores"
          columnas={["Gestor", "Cobrado Mes", "Clientes", "% Recuperación"]}
          filas={data.gestores.map((g) => [
            g.gestor,
            formato(g.cobrado),
            g.clientes,
            `${g.recuperacion}%`,
          ])}
        />
      </div>
    </div>
  );
}

function KPI({ titulo, valor, icono }) {
  return (
    <div style={cardIndicador}>
      <div style={iconoBox}>{icono}</div>
      <p style={cardTitulo}>{titulo}</p>
      <h2 style={cardNumero}>{valor}</h2>
    </div>
  );
}

function Semaforo({ label, valor }) {
  return (
    <div style={semaforoItem}>
      <span>{label}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function Tabla({ titulo, columnas, filas }) {
  return (
    <div style={card}>
      <h2 style={tituloSeccion}>{titulo}</h2>

      <div style={{ overflowX: "auto" }}>
        <table style={tabla}>
          <thead>
            <tr>
              {columnas.map((col, index) => (
                <th key={index} style={th}>{col}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filas.map((fila, index) => (
              <tr key={index}>
                {fila.map((celda, i) => (
                  <td key={i} style={td}>{celda}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
  maxWidth: "1500px",
  margin: "0 auto",
};

const encabezado = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap",
};

const tituloBox = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const logo = {
  width: "110px",
  height: "auto",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  marginTop: "5px",
  color: "#6b7280",
  fontSize: "15px",
};

const accionesTop = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const tituloSeccion = {
  marginBottom: "14px",
  color: "#111827",
};

const gridFiltros = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: "12px",
};

const label = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: "bold",
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const acciones = {
  display: "flex",
  gap: "10px",
  marginTop: "14px",
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

const botonNegro = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonSecundario = {
  background: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonGris = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const cardIndicador = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const iconoBox = {
  fontSize: "24px",
  marginBottom: "8px",
};

const cardTitulo = {
  margin: 0,
  color: "#6b7280",
  fontSize: "14px",
};

const cardNumero = {
  marginTop: "8px",
  color: "#111827",
  fontSize: "25px",
};

const gridDos = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
  gap: "16px",
};

const gridGraficas = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
  gap: "16px",
};

const textoGrande = {
  fontSize: "22px",
  fontWeight: "bold",
  color: "#111827",
};

const nota = {
  color: "#6b7280",
  fontSize: "14px",
};

const barraFondo = {
  width: "100%",
  height: "12px",
  background: "#e5e7eb",
  borderRadius: "999px",
  overflow: "hidden",
};

const barraProgreso = {
  height: "100%",
  background: "#16a34a",
  borderRadius: "999px",
};

const semaforoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: "12px",
};

const semaforoItem = {
  background: "#f9fafb",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
};

const graficaBox = {
  display: "flex",
  alignItems: "center",
  gap: "24px",
  flexWrap: "wrap",
};

const dona = {
  width: "160px",
  height: "160px",
  borderRadius: "50%",
  position: "relative",
};

const barraItem = {
  marginBottom: "16px",
};

const barraHeader = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "6px",
  color: "#374151",
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
  padding: "11px",
  borderBottom: "1px solid #e5e7eb",
};
