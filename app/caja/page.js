"use client";

import { useState } from "react";

export default function Caja() {
  const [tipoMovimiento, setTipoMovimiento] = useState("Pago");
  const [buscarCliente, setBuscarCliente] = useState("");

  const [movimientos, setMovimientos] = useState([
    {
      fecha: "06/06/2026",
      transaccion: "TX-001",
      cliente: "Juan Pérez",
      cedula: "8-123-456",
      tipo: "Pago Crédito",
      metodo: "Efectivo",
      monto: 125,
      concepto: "Pago de cuota",
      vendedor: "Gestor 1",
      estado: "Procesado",
    },
    {
      fecha: "06/06/2026",
      transaccion: "TX-002",
      cliente: "María Díaz",
      cedula: "8-456-789",
      tipo: "Pago",
      metodo: "Transferencia",
      monto: 75,
      concepto: "Mensualidad",
      vendedor: "Caja",
      estado: "Procesado",
    },
  ]);

  const generarTransaccion = () => {
    return "TX-" + String(movimientos.length + 1).padStart(3, "0");
  };

  const guardarMovimiento = () => {
    alert("Movimiento guardado correctamente.");
  };

  const limpiarFormulario = () => {
    setTipoMovimiento("Pago");
    setBuscarCliente("");
  };

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

        <h1 style={titulo}>Caja</h1>

        <p style={subtitulo}>
          Registro de pagos, abonos, ventas a crédito y pagos de crédito.
        </p>

        <div style={card}>
          <h2 style={tituloSeccion}>Información General</h2>

          <div style={grid}>
            <div>
              <label style={label}>Fecha</label>
              <input
                type="date"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={label}>N° Transacción</label>
              <input
                value={generarTransaccion()}
                readOnly
                style={inputStyle}
              />
            </div>

            <div>
              <label style={label}>Tipo de movimiento</label>
              <select
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value)}
                style={inputStyle}
              >
                <option>Pago</option>
                <option>Venta Crédito</option>
                <option>Abono</option>
                <option>Pago Crédito</option>
              </select>
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Cliente</h2>

          <input
            placeholder="Buscar cliente por nombre, cédula o teléfono..."
            value={buscarCliente}
            onChange={(e) => setBuscarCliente(e.target.value)}
            style={{
              ...inputStyle,
              marginBottom: "15px",
            }}
          />

          <div style={grid}>
            <input
              placeholder="Nombre del cliente"
              style={inputStyle}
            />

            <input
              placeholder="Cédula"
              style={inputStyle}
            />

            <input
              placeholder="Teléfono"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Detalle del Movimiento</h2>

          <div style={grid}>
            <div>
              <label style={label}>Método de pago</label>
              <select style={inputStyle}>
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Yappy</option>
                <option>Tarjeta</option>
                <option>Cheque</option>
                <option>Otro</option>
              </select>
            </div>

            <input
              placeholder="Monto pagado"
              style={inputStyle}
            />

            <input
              placeholder="Concepto / Descripción"
              style={inputStyle}
            />

            <input
              placeholder="Vendedor / Responsable"
              style={inputStyle}
            />
          </div>

          {(tipoMovimiento === "Venta Crédito" ||
            tipoMovimiento === "Abono") && (
            <div style={{ marginTop: "20px" }}>
              <h3 style={subtituloBloque}>
                Información del Producto
              </h3>

              <div style={grid}>
                <input
                  placeholder="Código del producto"
                  style={inputStyle}
                />

                <input
                  placeholder="Producto"
                  style={inputStyle}
                />

                <input
                  placeholder="Cantidad"
                  style={inputStyle}
                />

                <input
                  placeholder="Valor del producto"
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {tipoMovimiento === "Abono" && (
            <div style={{ marginTop: "20px" }}>
              <h3 style={subtituloBloque}>
                Información del Abono
              </h3>

              <div style={grid}>
                <input
                  placeholder="Abono recibido"
                  style={inputStyle}
                />

                <input
                  placeholder="Saldo pendiente"
                  style={inputStyle}
                />

                <input
                  type="date"
                  style={inputStyle}
                />
              </div>

              <p style={nota}>
                Fecha de vencimiento sugerida: 3 meses desde la fecha del abono.
              </p>
            </div>
          )}

          {tipoMovimiento === "Pago Crédito" && (
            <div style={{ marginTop: "20px" }}>
              <h3 style={subtituloBloque}>
                Información del Crédito
              </h3>

              <div style={grid}>
                <input
                  placeholder="Crédito asociado"
                  style={inputStyle}
                />

                <input
                  placeholder="Saldo actual"
                  style={inputStyle}
                />

                <input
                  placeholder="Nuevo saldo"
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          <textarea
            placeholder="Observación del movimiento..."
            style={textarea}
          />

          <div style={acciones}>
            <button
              style={boton}
              onClick={guardarMovimiento}
            >
              Guardar Movimiento
            </button>

            <button
              style={botonSecundario}
              onClick={limpiarFormulario}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Movimientos Recientes</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Transacción</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Método</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Concepto</th>
                  <th style={th}>Responsable</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.map((movimiento, index) => (
                  <tr key={index}>
                    <td style={td}>{movimiento.fecha}</td>
                    <td style={td}>{movimiento.transaccion}</td>
                    <td style={td}>{movimiento.cliente}</td>
                    <td style={td}>{movimiento.cedula}</td>
                    <td style={td}>{movimiento.tipo}</td>
                    <td style={td}>{movimiento.metodo}</td>
                    <td style={td}>
                      ${movimiento.monto.toLocaleString()}
                    </td>
                    <td style={td}>{movimiento.concepto}</td>
                    <td style={td}>{movimiento.vendedor}</td>
                    <td style={td}>{movimiento.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={nota}>
            Esta tabla mostrará los movimientos procesados de caja. Los gastos y egresos administrativos irán en una pantalla aparte.
          </p>
        </div>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
  margin: "0 auto",
};

const logoBox = {
  textAlign: "center",
  marginBottom: "25px",
};

const logo = {
  width: "260px",
  maxWidth: "100%",
  height: "auto",
};

const titulo = {
  fontSize: "40px",
  marginBottom: "10px",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  fontSize: "18px",
  marginBottom: "30px",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginBottom: "20px",
  color: "#111827",
};

const subtituloBloque = {
  marginBottom: "15px",
  color: "#374151",
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
  minHeight: "110px",
  marginTop: "20px",
};

const acciones = {
  display: "flex",
  gap: "15px",
  flexWrap: "wrap",
  marginTop: "20px",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "14px 28px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonSecundario = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "14px 24px",
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
  padding: "15px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const td = {
  padding: "15px",
  borderBottom: "1px solid #f3f4f6",
};

const nota = {
  marginTop: "15px",
  color: "#6b7280",
  fontSize: "14px",
};
