"use client";

import { useState } from "react";

export default function VistaCliente() {
  const [observacion, setObservacion] = useState("");
  const [modoEdicion, setModoEdicion] = useState(false);

  const cliente = {
    nombre: "Juan Pérez",
    cedula: "8-123-456",
    telefono: "6000-0000",
    estado: "Al Día",
    direccion: "La Chorrera, Panamá",
    producto: "Sala Modelo Roma",
    clasificacion: "Cliente regular",
    prioridad: "Normal",
    cobrador: "Gestor 1",
    saldo: 1500,
    recargo: 0,
    fechaPago: "15/06/2026",
    cuotaPendiente: 125,
    proximoPago: "30/06/2026",
    diasAtraso: 0,
    observacionInicial: "Cliente creado correctamente.",
  };

  const historialPagos = [
    {
      fecha: "01/06/2026",
      monto: 125,
      metodo: "Efectivo",
      observacion: "Pago recibido en caja",
    },
    {
      fecha: "15/06/2026",
      monto: 125,
      metodo: "Transferencia",
      observacion: "Pago enviado por WhatsApp",
    },
  ];

  const observaciones = [
    {
      fecha: "02/06/2026",
      usuario: "Gestor 1",
      detalle: "Cliente indica que pagará el viernes.",
    },
    {
      fecha: "05/06/2026",
      usuario: "Gestor 1",
      detalle: "Se realizó seguimiento por llamada.",
    },
  ];

  const descargarEstadoCuenta = () => {
    alert("Aquí se generará/descargará el Estado de Cuenta PDF.");
  };

  const generarCartaMora = () => {
    alert("Aquí se generará la Carta de Mora PDF.");
  };

  const guardarInformacion = () => {
    alert("Información del cliente guardada correctamente.");
    setModoEdicion(false);
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

        <h1 style={titulo}>Vista Cliente</h1>
        <p style={subtitulo}>
          Expediente completo del cliente
        </p>

        <div style={acciones}>
          <button
            style={botonSecundario}
            onClick={descargarEstadoCuenta}
          >
            Descargar Estado de Cuenta
          </button>

          <button
            style={botonSecundario}
            onClick={generarCartaMora}
          >
            Generar Carta de Mora
          </button>

          {!modoEdicion && (
            <button
              style={botonSecundario}
              onClick={() => setModoEdicion(true)}
            >
              Editar Cliente
            </button>
          )}

          {modoEdicion && (
            <>
              <button
                style={boton}
                onClick={guardarInformacion}
              >
                Guardar Información
              </button>

              <button
                style={botonCancelar}
                onClick={() => setModoEdicion(false)}
              >
                Cancelar Edición
              </button>
            </>
          )}
        </div>

        <div style={gridResumen}>
          <div style={card}>
            <h3>Cliente</h3>

            {modoEdicion ? (
              <>
                <input
                  defaultValue={cliente.nombre}
                  style={inputStyle}
                />

                <input
                  defaultValue={cliente.cedula}
                  style={inputStyle}
                />

                <input
                  defaultValue={cliente.telefono}
                  style={inputStyle}
                />

                <select
                  defaultValue={cliente.estado}
                  style={inputStyle}
                >
                  <option>Al Día</option>
                  <option>Mora</option>
                  <option>Promesa de Pago</option>
                  <option>Cancelado</option>
                  <option>Legal</option>
                </select>
              </>
            ) : (
              <>
                <p><strong>{cliente.nombre}</strong></p>
                <p>Cédula: {cliente.cedula}</p>
                <p>Teléfono: {cliente.telefono}</p>
                <p>Estado: {cliente.estado}</p>
              </>
            )}
          </div>

          <div style={card}>
            <h3>Crédito</h3>

            {modoEdicion ? (
              <>
                <input
                  defaultValue={cliente.producto}
                  style={inputStyle}
                />

                <input
                  defaultValue={cliente.saldo}
                  style={inputStyle}
                />

                <input
                  defaultValue={cliente.cuotaPendiente}
                  style={inputStyle}
                />

                <input
                  defaultValue={cliente.recargo}
                  style={inputStyle}
                />
              </>
            ) : (
              <>
                <p>Producto: {cliente.producto}</p>
                <p>Saldo: ${cliente.saldo.toLocaleString()}</p>
                <p>Cuota pendiente: ${cliente.cuotaPendiente}</p>
                <p>Recargo: ${cliente.recargo}</p>
              </>
            )}
          </div>

          <div style={card}>
            <h3>Gestión</h3>

            {modoEdicion ? (
              <>
                <input
                  defaultValue={cliente.cobrador}
                  style={inputStyle}
                />

                <input
                  defaultValue={cliente.diasAtraso}
                  style={inputStyle}
                />

                <input
                  defaultValue={cliente.prioridad}
                  style={inputStyle}
                />

                <input
                  defaultValue={cliente.clasificacion}
                  style={inputStyle}
                />
              </>
            ) : (
              <>
                <p>Gestor: {cliente.cobrador}</p>
                <p>Días de atraso: {cliente.diasAtraso}</p>
                <p>Prioridad: {cliente.prioridad}</p>
                <p>Clasificación: {cliente.clasificacion}</p>
              </>
            )}
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Información General</h2>

          {modoEdicion ? (
            <>
              <textarea
                defaultValue={cliente.direccion}
                style={textarea}
              />

              <input
                defaultValue={cliente.fechaPago}
                style={inputStyle}
              />

              <input
                defaultValue={cliente.proximoPago}
                style={inputStyle}
              />

              <textarea
                defaultValue={cliente.observacionInicial}
                style={textarea}
              />
            </>
          ) : (
            <>
              <p><strong>Dirección:</strong> {cliente.direccion}</p>
              <p><strong>Fecha de pago:</strong> {cliente.fechaPago}</p>
              <p><strong>Próximo pago:</strong> {cliente.proximoPago}</p>
              <p><strong>Observación inicial:</strong> {cliente.observacionInicial}</p>
            </>
          )}
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Historial de Pagos</h2>

          <table style={tabla}>
            <thead>
              <tr>
                <th style={th}>Fecha</th>
                <th style={th}>Monto</th>
                <th style={th}>Método</th>
                <th style={th}>Observación</th>
              </tr>
            </thead>

            <tbody>
              {historialPagos.map((pago, index) => (
                <tr key={index}>
                  <td style={td}>{pago.fecha}</td>
                  <td style={td}>${pago.monto}</td>
                  <td style={td}>{pago.metodo}</td>
                  <td style={td}>{pago.observacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Observaciones de Gestión</h2>

          <textarea
            placeholder="Agregar nueva observación..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            style={textarea}
          />

          <button style={boton}>
            Guardar Observación
          </button>

          <div style={{ marginTop: "25px" }}>
            {observaciones.map((item, index) => (
              <div key={index} style={observacionBox}>
                <strong>{item.fecha} — {item.usuario}</strong>
                <p>{item.detalle}</p>
              </div>
            ))}
          </div>
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

const gridResumen = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
  gap: "20px",
  marginBottom: "20px",
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

const textarea = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  minHeight: "120px",
  marginBottom: "12px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  marginBottom: "12px",
};

const boton = {
  marginTop: "15px",
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "14px 28px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonCancelar = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const observacionBox = {
  background: "#f9fafb",
  padding: "15px",
  borderRadius: "10px",
  marginBottom: "10px",
  border: "1px solid #e5e7eb",
};

const acciones = {
  display: "flex",
  gap: "15px",
  flexWrap: "wrap",
  marginTop: "20px",
  marginBottom: "20px",
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
