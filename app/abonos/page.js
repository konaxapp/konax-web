"use client";

import { useState } from "react";

export default function Abonos() {
  const [abono, setAbono] = useState({
    cliente: "",
    cedula: "",
    telefono: "",
    vendedor: "",
    codigoProducto: "",
    producto: "",
    valorProducto: "",
    abonoRecibido: "",
    fechaVencimiento: "",
    metodo: "Efectivo",
    observacion: "",
  });

  const abonos = [
    {
      fecha: "04/06/2026",
      cliente: "Juan Pérez",
      producto: "Televisor 55",
      valorProducto: 850,
      abono: 50,
      saldo: 800,
      metodo: "Yappy",
      vendedor: "Noriel",
      vencimiento: "04/09/2026",
      estado: "Activo",
    },
    {
      fecha: "03/06/2026",
      cliente: "María Gómez",
      producto: "Nevera",
      valorProducto: 1200,
      abono: 300,
      saldo: 900,
      metodo: "Transferencia",
      vendedor: "Noriel",
      vencimiento: "03/09/2026",
      estado: "Activo",
    },
  ];

  const valorProducto = Number(abono.valorProducto || 0);
  const abonoRecibido = Number(abono.abonoRecibido || 0);
  const saldoPendiente = valorProducto - abonoRecibido;
  const mostrarResumen =
    abono.valorProducto !== "" || abono.abonoRecibido !== "";

  const formato = (numero) =>
    "$" +
    Number(numero || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

  const registrarAbono = () => {
    alert("Abono registrado correctamente.");
  };

  const limpiarFormulario = () => {
    setAbono({
      cliente: "",
      cedula: "",
      telefono: "",
      vendedor: "",
      codigoProducto: "",
      producto: "",
      valorProducto: "",
      abonoRecibido: "",
      fechaVencimiento: "",
      metodo: "Efectivo",
      observacion: "",
    });
  };

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div>
            <h1 style={titulo}>Abonos</h1>
            <p style={subtitulo}>
              Control de abonos para separación de productos y saldos pendientes.
            </p>
          </div>
        </div>

        <div style={cardsGrid}>
          <KPI titulo="Abonos Hoy" valor="$1,250.00" icono="💰" />
          <KPI titulo="Abonos Mes" valor="$18,500.00" icono="📈" />
          <KPI titulo="Abonos Activos" valor="145" icono="🧾" />
          <KPI titulo="Abonos Vencidos" valor="12" icono="🚨" />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Registrar Abono</h2>

          <div style={grid}>
            <input
              placeholder="Buscar cliente por nombre, cédula o teléfono"
              value={abono.cliente}
              onChange={(e) =>
                setAbono({ ...abono, cliente: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Cédula"
              value={abono.cedula}
              onChange={(e) =>
                setAbono({ ...abono, cedula: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Teléfono"
              value={abono.telefono}
              onChange={(e) =>
                setAbono({ ...abono, telefono: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Vendedor"
              value={abono.vendedor}
              onChange={(e) =>
                setAbono({ ...abono, vendedor: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Código del producto"
              value={abono.codigoProducto}
              onChange={(e) =>
                setAbono({ ...abono, codigoProducto: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Producto"
              value={abono.producto}
              onChange={(e) =>
                setAbono({ ...abono, producto: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Valor del producto"
              value={abono.valorProducto}
              onChange={(e) =>
                setAbono({ ...abono, valorProducto: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Abono recibido"
              value={abono.abonoRecibido}
              onChange={(e) =>
                setAbono({ ...abono, abonoRecibido: e.target.value })
              }
              style={inputStyle}
            />

            <select
              value={abono.metodo}
              onChange={(e) =>
                setAbono({ ...abono, metodo: e.target.value })
              }
              style={inputStyle}
            >
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Yappy</option>
              <option>Tarjeta</option>
              <option>Otro</option>
            </select>

            <input
              type="date"
              value={abono.fechaVencimiento}
              onChange={(e) =>
                setAbono({ ...abono, fechaVencimiento: e.target.value })
              }
              style={inputStyle}
            />
          </div>

          {mostrarResumen && (
            <div style={resumenAbono}>
              <div style={totalCard}>
                <span style={totalLabel}>Valor Producto</span>
                <strong style={totalValor}>{formato(valorProducto)}</strong>
              </div>

              <div style={totalCard}>
                <span style={totalLabel}>Abono Recibido</span>
                <strong style={totalValor}>{formato(abonoRecibido)}</strong>
              </div>

              <div style={totalCardPrincipal}>
                <span style={totalLabel}>Saldo Pendiente</span>
                <strong style={totalValorPrincipal}>
                  {formato(saldoPendiente)}
                </strong>
              </div>

              <div style={totalCard}>
                <span style={totalLabel}>Estado</span>
                <strong style={totalValor}>Activo</strong>
              </div>
            </div>
          )}

          <textarea
            placeholder="Observación del abono..."
            value={abono.observacion}
            onChange={(e) =>
              setAbono({ ...abono, observacion: e.target.value })
            }
            style={textarea}
          />

          <div style={acciones}>
            <button style={boton} onClick={registrarAbono}>
              Registrar Abono
            </button>

            <button style={botonGris} onClick={limpiarFormulario}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Historial de Abonos</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Producto</th>
                  <th style={th}>Valor</th>
                  <th style={th}>Abono</th>
                  <th style={th}>Saldo</th>
                  <th style={th}>Método</th>
                  <th style={th}>Vendedor</th>
                  <th style={th}>Vencimiento</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {abonos.map((item, index) => (
                  <tr key={index}>
                    <td style={td}>{item.fecha}</td>
                    <td style={td}>{item.cliente}</td>
                    <td style={td}>{item.producto}</td>
                    <td style={td}>{formato(item.valorProducto)}</td>
                    <td style={td}>{formato(item.abono)}</td>
                    <td style={td}>{formato(item.saldo)}</td>
                    <td style={td}>{item.metodo}</td>
                    <td style={td}>{item.vendedor}</td>
                    <td style={td}>{item.vencimiento}</td>
                    <td style={td}>
                      <span style={estadoBadge}>{item.estado}</span>
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

function KPI({ titulo, valor, icono }) {
  return (
    <div style={cardKpi}>
      <div style={kpiTitulo}>
        {icono} {titulo}
      </div>
      <div style={kpiValor}>{valor}</div>
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
  height: "auto",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  marginTop: "5px",
  fontSize: "15px",
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

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
};

const resumenAbono = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
  marginTop: "16px",
};

const totalCard = {
  background: "#f9fafb",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
};

const totalCardPrincipal = {
  background: "#ecfdf5",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #bbf7d0",
};

const totalLabel = {
  display: "block",
  color: "#6b7280",
  fontSize: "14px",
  marginBottom: "6px",
};

const totalValor = {
  color: "#111827",
  fontSize: "24px",
};

const totalValorPrincipal = {
  color: "#16a34a",
  fontSize: "26px",
};

const textarea = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
  minHeight: "90px",
  marginTop: "16px",
};

const acciones = {
  display: "flex",
  gap: "10px",
  marginTop: "16px",
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

const botonGris = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "9px",
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
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #f3f4f6",
};

const estadoBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: "bold",
};
