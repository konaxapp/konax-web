"use client";

import { useState } from "react";

export default function VentasContado() {
  const [venta, setVenta] = useState({
    cliente: "",
    cedula: "",
    telefono: "",
    vendedor: "",
    metodo: "Efectivo",
    producto: "",
    codigo: "",
    cantidad: "",
    precio: "",
    descuento: "",
    observacion: "",
  });

  const ventas = [
    {
      fecha: "04/06/2026",
      transaccion: "VC-001",
      cliente: "Juan Pérez",
      vendedor: "Noriel",
      metodo: "Yappy",
      total: 250,
      estado: "Completada",
    },
    {
      fecha: "04/06/2026",
      transaccion: "VC-002",
      cliente: "María Gómez",
      vendedor: "Noriel",
      metodo: "Efectivo",
      total: 480,
      estado: "Completada",
    },
  ];

  const subtotal = Number(venta.cantidad || 0) * Number(venta.precio || 0);
  const total = subtotal - Number(venta.descuento || 0);
  const mostrarTotales = venta.cantidad !== "" || venta.precio !== "";

  const formato = (numero) =>
    "$" +
    Number(numero || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

  const guardarVenta = () => {
    alert("Venta contado registrada correctamente.");
  };

  const limpiarFormulario = () => {
    setVenta({
      cliente: "",
      cedula: "",
      telefono: "",
      vendedor: "",
      metodo: "Efectivo",
      producto: "",
      codigo: "",
      cantidad: "",
      precio: "",
      descuento: "",
      observacion: "",
    });
  };

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div>
            <h1 style={titulo}>Ventas Contado</h1>
            <p style={subtitulo}>
              Registro, control y seguimiento de ventas pagadas al contado.
            </p>
          </div>
        </div>

        <div style={cardsGrid}>
          <KPI titulo="Ventas Hoy" valor="$1,250.00" icono="💰" />
          <KPI titulo="Ventas Mes" valor="$18,500.00" icono="📈" />
          <KPI titulo="Facturas" valor="45" icono="🧾" />
          <KPI titulo="Clientes" valor="32" icono="👥" />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Nueva Venta Contado</h2>

          <div style={grid}>
            <input
              placeholder="Buscar cliente por nombre, cédula o teléfono"
              value={venta.cliente}
              onChange={(e) =>
                setVenta({ ...venta, cliente: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Cédula"
              value={venta.cedula}
              onChange={(e) =>
                setVenta({ ...venta, cedula: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Teléfono"
              value={venta.telefono}
              onChange={(e) =>
                setVenta({ ...venta, telefono: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Vendedor"
              value={venta.vendedor}
              onChange={(e) =>
                setVenta({ ...venta, vendedor: e.target.value })
              }
              style={inputStyle}
            />

            <select
              value={venta.metodo}
              onChange={(e) =>
                setVenta({ ...venta, metodo: e.target.value })
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
              placeholder="Código del producto"
              value={venta.codigo}
              onChange={(e) =>
                setVenta({ ...venta, codigo: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Producto"
              value={venta.producto}
              onChange={(e) =>
                setVenta({ ...venta, producto: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Cantidad"
              value={venta.cantidad}
              onChange={(e) =>
                setVenta({ ...venta, cantidad: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Precio unitario"
              value={venta.precio}
              onChange={(e) =>
                setVenta({ ...venta, precio: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Descuento"
              value={venta.descuento}
              onChange={(e) =>
                setVenta({ ...venta, descuento: e.target.value })
              }
              style={inputStyle}
            />
          </div>

          {mostrarTotales && (
            <div style={resumenVenta}>
              <div style={totalCard}>
                <span style={totalLabel}>Subtotal</span>
                <strong style={totalValor}>{formato(subtotal)}</strong>
              </div>

              <div style={totalCardPrincipal}>
                <span style={totalLabel}>Total Venta</span>
                <strong style={totalValorPrincipal}>{formato(total)}</strong>
              </div>
            </div>
          )}

          <textarea
            placeholder="Observación de la venta..."
            value={venta.observacion}
            onChange={(e) =>
              setVenta({ ...venta, observacion: e.target.value })
            }
            style={textarea}
          />

          <div style={acciones}>
            <button style={boton} onClick={guardarVenta}>
              Registrar Venta
            </button>

            <button style={botonGris} onClick={limpiarFormulario}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Historial de Ventas</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Transacción</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Vendedor</th>
                  <th style={th}>Método</th>
                  <th style={th}>Total</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {ventas.map((item, index) => (
                  <tr key={index}>
                    <td style={td}>{item.fecha}</td>
                    <td style={td}>{item.transaccion}</td>
                    <td style={td}>{item.cliente}</td>
                    <td style={td}>{item.vendedor}</td>
                    <td style={td}>{item.metodo}</td>
                    <td style={td}>{formato(item.total)}</td>
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

const resumenVenta = {
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
