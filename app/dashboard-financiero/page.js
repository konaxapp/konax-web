"use client";

import { useState } from "react";

export default function DashboardFinanciero() {
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("Todos");

  const data = {
    ingresosHoy: 8000,
    ingresosMes: 42500,
    egresosMes: 7800,
    utilidadNeta: 34700,

    efectivo: 12500,
    transferencia: 18000,
    yappy: 9200,
    tarjeta: 2800,

    ventasContado: 12500,
    ventasCredito: 18000,
    cobros: 9200,
    abonos: 3400,

    clientesActivos: 120,
    creditosActivos: 85,
    clientesMora: 25,
    recuperacion: 78,

    movimientos: [
      {
        fecha: "04/06/2026",
        tipo: "Ingreso",
        concepto: "Cobro de crédito",
        metodo: "Efectivo",
        monto: 125,
        usuario: "Caja",
      },
      {
        fecha: "04/06/2026",
        tipo: "Ingreso",
        concepto: "Venta contado",
        metodo: "Transferencia",
        monto: 850,
        usuario: "Administrador",
      },
      {
        fecha: "04/06/2026",
        tipo: "Egreso",
        concepto: "Papelería",
        metodo: "Efectivo",
        monto: 35,
        usuario: "Administrador",
      },
    ],

    gestores: [
      { gestor: "Gestor 1", cobrado: 12000, clientes: 35, recuperacion: 82 },
      { gestor: "Gestor 2", cobrado: 9500, clientes: 28, recuperacion: 67 },
      { gestor: "Gestor 3", cobrado: 7200, clientes: 22, recuperacion: 51 },
    ],
  };

  const formato = (numero) =>
    "$" +
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
    setFiltroMetodo("Todos");
  };

  const colorGestor = (recuperacion) => {
    if (recuperacion >= 80) return "#16a34a";
    if (recuperacion >= 60) return "#eab308";
    if (recuperacion >= 40) return "#f97316";
    return "#dc2626";
  };

  const totalMetodos =
    data.efectivo + data.transferencia + data.yappy + data.tarjeta;

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={tituloBox}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <h1 style={titulo}>Dashboard Financiero</h1>
              <p style={subtitulo}>
                Resumen financiero, caja, métodos de pago y rendimiento del negocio.
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
              <label style={label}>Método de pago</label>
              <select
                value={filtroMetodo}
                onChange={(e) => setFiltroMetodo(e.target.value)}
                style={inputStyle}
              >
                <option>Todos</option>
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Yappy</option>
                <option>Tarjeta</option>
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
          <KPI titulo="Ingresos Hoy" valor={formato(data.ingresosHoy)} icono="💰" />
          <KPI titulo="Ingresos Mes" valor={formato(data.ingresosMes)} icono="📈" />
          <KPI titulo="Egresos Mes" valor={formato(data.egresosMes)} icono="💸" />
          <KPI titulo="Utilidad Neta" valor={formato(data.utilidadNeta)} icono="🏦" />
        </div>

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>Métodos de Pago</h2>

            <BarraMetodo
              label="Efectivo"
              valor={data.efectivo}
              total={totalMetodos}
              color="#16a34a"
              formato={formato}
            />

            <BarraMetodo
              label="Transferencia"
              valor={data.transferencia}
              total={totalMetodos}
              color="#2563eb"
              formato={formato}
            />

            <BarraMetodo
              label="Yappy"
              valor={data.yappy}
              total={totalMetodos}
              color="#f97316"
              formato={formato}
            />

            <BarraMetodo
              label="Tarjeta"
              valor={data.tarjeta}
              total={totalMetodos}
              color="#7c3aed"
              formato={formato}
            />
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Distribución Financiera</h2>

            <div style={graficaBox}>
              <div
                style={{
                  ...dona,
                  background:
                    "conic-gradient(#16a34a 0% 55%, #2563eb 55% 78%, #f97316 78% 92%, #7c3aed 92% 100%)",
                }}
              />

              <div>
                <p>🟢 Efectivo: {formato(data.efectivo)}</p>
                <p>🔵 Transferencia: {formato(data.transferencia)}</p>
                <p>🟠 Yappy: {formato(data.yappy)}</p>
                <p>🟣 Tarjeta: {formato(data.tarjeta)}</p>
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Resumen Operativo</h2>

          <div style={kpiGrid}>
            <KPI titulo="Ventas Contado" valor={formato(data.ventasContado)} icono="🛒" />
            <KPI titulo="Ventas Crédito" valor={formato(data.ventasCredito)} icono="🧾" />
            <KPI titulo="Cobros" valor={formato(data.cobros)} icono="💵" />
            <KPI titulo="Abonos" valor={formato(data.abonos)} icono="📌" />
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Indicadores de Cartera</h2>

          <div style={kpiGrid}>
            <KPI titulo="Clientes Activos" valor={data.clientesActivos} icono="👥" />
            <KPI titulo="Créditos Activos" valor={data.creditosActivos} icono="📄" />
            <KPI titulo="Clientes en Mora" valor={data.clientesMora} icono="🚨" />
            <KPI titulo="Recuperación" valor={`${data.recuperacion}%`} icono="📊" />
          </div>
        </div>

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>Ranking de Gestores</h2>

            {data.gestores.map((item, index) => (
              <div key={index} style={barraItem}>
                <div style={barraHeader}>
                  <strong>{item.gestor}</strong>
                  <span>
                    {formato(item.cobrado)} — {item.recuperacion}%
                  </span>
                </div>

                <div style={barraFondo}>
                  <div
                    style={{
                      ...barraProgreso,
                      width: `${item.recuperacion}%`,
                      background: colorGestor(item.recuperacion),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Resultado del Mes</h2>

            <div style={resultadoBox}>
              <div>
                <p style={labelResultado}>Ingresos</p>
                <h3 style={positivo}>{formato(data.ingresosMes)}</h3>
              </div>

              <div>
                <p style={labelResultado}>Egresos</p>
                <h3 style={negativo}>{formato(data.egresosMes)}</h3>
              </div>

              <div>
                <p style={labelResultado}>Neto</p>
                <h3 style={positivo}>{formato(data.utilidadNeta)}</h3>
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Movimientos Financieros Recientes</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Concepto</th>
                  <th style={th}>Método</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Usuario</th>
                </tr>
              </thead>

              <tbody>
                {data.movimientos.map((item, index) => (
                  <tr key={index}>
                    <td style={td}>{item.fecha}</td>
                    <td
                      style={{
                        ...td,
                        color: item.tipo === "Ingreso" ? "#16a34a" : "#dc2626",
                        fontWeight: "bold",
                      }}
                    >
                      {item.tipo}
                    </td>
                    <td style={td}>{item.concepto}</td>
                    <td style={td}>{item.metodo}</td>
                    <td style={td}>{formato(item.monto)}</td>
                    <td style={td}>{item.usuario}</td>
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

function KPI({ titulo, valor, icono }) {
  return (
    <div style={cardIndicador}>
      <div style={iconoBox}>{icono}</div>
      <p style={cardTitulo}>{titulo}</p>
      <h2 style={cardNumero}>{valor}</h2>
    </div>
  );
}

function BarraMetodo({ label, valor, total, color, formato }) {
  const porcentaje = total > 0 ? (valor / total) * 100 : 0;

  return (
    <div style={barraItem}>
      <div style={barraHeader}>
        <strong>{label}</strong>
        <span>{formato(valor)}</span>
      </div>

      <div style={barraFondo}>
        <div
          style={{
            ...barraProgreso,
            width: `${porcentaje}%`,
            background: color,
          }}
        />
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
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
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
  flexWrap: "wrap",
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

const resultadoBox = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
  gap: "16px",
};

const labelResultado = {
  color: "#6b7280",
  marginBottom: "8px",
};

const positivo = {
  color: "#16a34a",
  fontSize: "28px",
};

const negativo = {
  color: "#dc2626",
  fontSize: "28px",
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
