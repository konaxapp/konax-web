"use client";

import { useState } from "react";

export default function VentasCredito() {
  const [credito, setCredito] = useState({
  cliente: "",
  cedula: "",
  telefono: "",

  vendedor: "",
  gestor: "",

  codigo: "",
  producto: "",
  descripcion: "",

  precioContado: "",
  precioCredito: "",

  inicial: "",
  plazo: "",
  frecuencia: "Semanal",

  tasaInteres: "",
  gastosManejo: "",
  seguro: "",
  comision: "",

  cuota: "",
  primerPago: "",
  observacion: "",
});

  

  const precioCredito = Number(credito.precioCredito || 0);
const inicial = Number(credito.inicial || 0);
const plazo = Number(credito.plazo || 0);

const tasaInteres = Number(credito.tasaInteres || 0);
const gastosManejo = Number(credito.gastosManejo || 0);
const seguro = Number(credito.seguro || 0);

const montoFinanciado = precioCredito - inicial;

const interesTotal =
  montoFinanciado * (tasaInteres / 100) * plazo;

const totalFinanciado =
  montoFinanciado +
  interesTotal +
  gastosManejo +
  seguro;

const totalPagar = totalFinanciado;

const cuotaCalculada =
  plazo > 0 ? totalPagar / plazo : 0;
  const mostrarResumen = credito.precioCredito !== "" || credito.inicial !== "";

  const formato = (numero) =>
    "$" +
    Number(numero || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

  const guardarCredito = () => {
    alert("Crédito creado correctamente.");
  };

  const limpiarFormulario = () => {
    setCredito({
      cliente: "",
      cedula: "",
      telefono: "",
      vendedor: "",
      codigo: "",
      producto: "",
      precioContado: "",
      precioCredito: "",
      inicial: "",
      plazo: "",
      frecuencia: "Semanal",
      cuota: "",
      primerPago: "",
      observacion: "",
    });
  };

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div>
            <h1 style={titulo}>Ventas Crédito</h1>
            <p style={subtitulo}>
              Registro de ventas financiadas, cuotas, saldos y próximos pagos.
            </p>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Nuevo Crédito</h2>

          <div style={grid}>
          

<input
  type="number"
  placeholder="Precio Crédito"
  value={credito.precioCredito}
  onChange={(e) =>
    setCredito({ ...credito, precioCredito: e.target.value })
  }
  style={inputStyle}
/>  

            <input
              placeholder="Cédula"
              value={credito.cedula}
              onChange={(e) =>
                setCredito({ ...credito, cedula: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Teléfono"
              value={credito.telefono}
              onChange={(e) =>
                setCredito({ ...credito, telefono: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Vendedor"
              value={credito.vendedor}
              onChange={(e) =>
                setCredito({ ...credito, vendedor: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Código del producto"
              value={credito.codigo}
              onChange={(e) =>
                setCredito({ ...credito, codigo: e.target.value })
              }
              style={inputStyle}
            />

            <input
              placeholder="Producto"
              value={credito.producto}
              onChange={(e) =>
                setCredito({ ...credito, producto: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Inicial / Abono inicial"
              value={credito.inicial}
              onChange={(e) =>
                setCredito({ ...credito, inicial: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Plazo / cantidad de cuotas"
              value={credito.plazo}
              onChange={(e) =>
                setCredito({ ...credito, plazo: e.target.value })
              }
              style={inputStyle}
            />

            <select
              value={credito.frecuencia}
              onChange={(e) =>
                setCredito({ ...credito, frecuencia: e.target.value })
              }
              style={inputStyle}
            >
              <option>Semanal</option>
              <option>Quincenal</option>
              <option>Mensual</option>
            </select>

            <input
              value={formato(cuotaCalculada)}
              readOnly
              style={{
                ...inputStyle,
                fontWeight: "bold",
                color: "#16a34a",
              }}
            />

            <input
              type="date"
              value={credito.primerPago}
              onChange={(e) =>
                setCredito({ ...credito, primerPago: e.target.value })
              }
              style={inputStyle}
            />
          </div>

          {mostrarResumen && (
            <div style={resumenCredito}>
              <div style={totalCard}>
                <span style={totalLabel}>Precio Crédito</span>
<strong style={totalValor}>{formato(precioCredito)}</strong>
              </div>

              <div style={totalCard}>
                <span style={totalLabel}>Inicial</span>
                <strong style={totalValor}>{formato(inicial)}</strong>
              </div>

              <div style={totalCardPrincipal}>
                <span style={totalLabel}>Monto a Financiar</span>
                <strong style={totalValorPrincipal}>
                  {formato(montoFinanciado)}
                </strong>
              </div>

              <div style={totalCardPrincipal}>
                <span style={totalLabel}>Cuota Sugerida</span>
                <strong style={totalValorPrincipal}>
                  {formato(cuotaCalculada)}
                </strong>
              </div>
            <div style={totalCard}>
  <span style={totalLabel}>Interés Total</span>
  <strong style={totalValor}>
    {formato(interesTotal)}
  </strong>
</div>

<div style={totalCard}>
  <span style={totalLabel}>Total Financiado</span>
  <strong style={totalValor}>
    {formato(totalFinanciado)}
  </strong>
</div>

<div style={totalCardPrincipal}>
  <span style={totalLabel}>Total a Pagar</span>
  <strong style={totalValorPrincipal}>
    {formato(totalPagar)}
  </strong>
</div>

<div style={totalCardPrincipal}>
  <span style={totalLabel}>Saldo Inicial</span>
  <strong style={totalValorPrincipal}>
    {formato(montoFinanciado)}
  </strong>
</div>
            </div>
          )}

          <textarea
            placeholder="Observación del crédito..."
            value={credito.observacion}
            onChange={(e) =>
              setCredito({ ...credito, observacion: e.target.value })
            }
            style={textarea}
          />

          <div style={acciones}>
            <button style={boton} onClick={guardarCredito}>
              Crear Crédito
            </button>

            <button style={botonGris} onClick={limpiarFormulario}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Historial de Créditos</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Transacción</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Producto</th>
                  <th style={th}>Saldo</th>
                  <th style={th}>Cuota</th>
                  <th style={th}>Próximo Pago</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {creditos.map((item, index) => (
                  <tr key={index}>
                    <td style={td}>{item.fecha}</td>
                    <td style={td}>{item.transaccion}</td>
                    <td style={td}>{item.cliente}</td>
                    <td style={td}>{item.producto}</td>
                    <td style={td}>{formato(item.saldo)}</td>
                    <td style={td}>{formato(item.cuota)}</td>
                    <td style={td}>{item.proximoPago}</td>
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

const resumenCredito = {
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
