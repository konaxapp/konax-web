"use client";

import { useState } from "react";

export default function Abonos() {
  const calcularVencimiento = () => {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() + 3);
    return fecha.toISOString().split("T")[0];
  };

  const [abono, setAbono] = useState({
    cliente: "",
    cedula: "",
    telefono: "",
    vendedor: "",
    codigoProducto: "",
    producto: "",
    valorProducto: "",
    abonoRecibido: "",
    fechaVencimiento: calcularVencimiento(),
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
  const saldoPendiente = Math.max(valorProducto - abonoRecibido, 0);

  const mostrarResumen =
    abono.valorProducto !== "" || abono.abonoRecibido !== "";

  const formato = (numero) =>
    "$" +
    Number(numero || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function registrarAbono() {
    if (!abono.cliente.trim()) {
      alert("Ingrese el nombre del cliente.");
      return;
    }

    if (!abono.producto.trim()) {
      alert("Ingrese el producto.");
      return;
    }

    if (!abono.valorProducto || valorProducto <= 0) {
      alert("Ingrese el valor del producto.");
      return;
    }

    if (!abono.abonoRecibido || abonoRecibido <= 0) {
      alert("Ingrese el abono recibido.");
      return;
    }

    if (abonoRecibido > valorProducto) {
      alert("El abono no puede ser mayor que el valor del producto.");
      return;
    }

    alert("Abono registrado correctamente.");
    limpiarFormulario();
  }

  function limpiarFormulario() {
    setAbono({
      cliente: "",
      cedula: "",
      telefono: "",
      vendedor: "",
      codigoProducto: "",
      producto: "",
      valorProducto: "",
      abonoRecibido: "",
      fechaVencimiento: calcularVencimiento(),
      metodo: "Efectivo",
      observacion: "",
    });
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={tituloBox}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <h1 style={titulo}>Registrar Abonos</h1>
              <p style={subtitulo}>
                Control de abonos para separación de productos y saldos pendientes.
              </p>
            </div>
          </div>

          <button style={botonVolver} onClick={volverDashboard}>
            ← Regresar al Dashboard
          </button>
        </div>

        <div style={cardsGrid}>
          <KPI titulo="Abonos Hoy" valor="$1,250.00" icono="💰" />
          <KPI titulo="Abonos Mes" valor="$18,500.00" icono="📈" />
          <KPI titulo="Abonos Activos" valor="145" icono="🧾" />
          <KPI titulo="Abonos Vencidos" valor="12" icono="🚨" />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Datos del Cliente</h2>

          <div style={grid}>
            <Campo label="Cliente">
              <input
                placeholder="Nombre del cliente"
                value={abono.cliente}
                onChange={(e) =>
                  setAbono({ ...abono, cliente: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Cédula">
              <input
                placeholder="Cédula"
                value={abono.cedula}
                onChange={(e) =>
                  setAbono({ ...abono, cedula: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Teléfono">
              <input
                placeholder="Teléfono"
                value={abono.telefono}
                onChange={(e) =>
                  setAbono({ ...abono, telefono: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Vendedor">
              <input
                placeholder="Vendedor responsable"
                value={abono.vendedor}
                onChange={(e) =>
                  setAbono({ ...abono, vendedor: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Datos del Producto</h2>

          <div style={grid}>
            <Campo label="Código del producto">
              <input
                placeholder="Código"
                value={abono.codigoProducto}
                onChange={(e) =>
                  setAbono({ ...abono, codigoProducto: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Producto">
              <input
                placeholder="Nombre del producto"
                value={abono.producto}
                onChange={(e) =>
                  setAbono({ ...abono, producto: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Valor del producto">
              <input
                type="number"
                placeholder="0.00"
                value={abono.valorProducto}
                onChange={(e) =>
                  setAbono({ ...abono, valorProducto: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Abono recibido">
              <input
                type="number"
                placeholder="0.00"
                value={abono.abonoRecibido}
                onChange={(e) =>
                  setAbono({ ...abono, abonoRecibido: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Método de pago">
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
            </Campo>

            <Campo label="Fecha de vencimiento">
              <input
                type="date"
                value={abono.fechaVencimiento}
                onChange={(e) =>
                  setAbono({ ...abono, fechaVencimiento: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>
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

              <div style={totalCardFecha}>
                <span style={totalLabel}>📅 Vence el</span>
                <strong style={totalValorFecha}>
                  {abono.fechaVencimiento}
                </strong>
              </div>
            </div>
          )}

          <Campo label="Observación">
            <textarea
              placeholder="Observación del abono..."
              value={abono.observacion}
              onChange={(e) =>
                setAbono({ ...abono, observacion: e.target.value })
              }
              style={textarea}
            />
          </Campo>

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

function Campo({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
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
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "24px",
  borderRadius: "20px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
};

const tituloBox = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const logo = {
  width: "90px",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "8px",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
  color: "#ffffff",
};

const subtitulo = {
  color: "#dcfce7",
  marginTop: "5px",
  fontSize: "15px",
};

const botonVolver = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
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
  marginTop: 0,
  marginBottom: "16px",
  color: "#111827",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
  background: "#ffffff",
  color: "#111827",
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

const totalCardFecha = {
  background: "#eff6ff",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #bfdbfe",
};

const totalLabel = {
  display: "block",
  color: "#6b7280",
  fontSize: "14px",
  marginBottom: "6px",
};

const totalValor = {
  color: "#111827",
  fontSize: "22px",
};

const totalValorPrincipal = {
  color: "#16a34a",
  fontSize: "24px",
};

const totalValorFecha = {
  color: "#1e40af",
  fontSize: "22px",
};

const textarea = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
  minHeight: "90px",
  marginTop: "0px",
  resize: "vertical",
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
  background: "#111827",
  color: "#ffffff",
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
