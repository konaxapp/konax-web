"use client";

import { useState } from "react";

export default function VistaCliente() {
  const [observacion, setObservacion] = useState("");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [fechaPromesa, setFechaPromesa] = useState("");
  const [montoPromesa, setMontoPromesa] = useState("");
  const [observacionPromesa, setObservacionPromesa] = useState("");

  const cliente = {
    nombre: "Juan Pérez",
    cedula: "8-123-456",
    telefono: "6000-0000",
    estado: "Al Día",
    semaforo: "🟢",
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

  const promesas = [
    {
      fecha: "20/06/2026",
      monto: 125,
      estado: "Vigente",
      observacion: "Cliente promete pagar por transferencia.",
    },
    {
      fecha: "10/06/2026",
      monto: 100,
      estado: "Cumplida",
      observacion: "Promesa cumplida parcialmente.",
    },
  ];

  const ultimasGestiones = [
    {
      fecha: "15/06/2026",
      usuario: "Gestor 1",
      accion: "WhatsApp enviado",
    },
    {
      fecha: "10/06/2026",
      usuario: "Gestor 1",
      accion: "Promesa de pago registrada",
    },
    {
      fecha: "05/06/2026",
      usuario: "Gestor 1",
      accion: "Llamada de seguimiento realizada",
    },
  ];

  const documentos = [
    {
      nombre: "Cedula.pdf",
      tipo: "Cédula",
      fecha: "02/06/2026",
      usuario: "Administrador",
    },
    {
      nombre: "Contrato_credito.pdf",
      tipo: "Contrato",
      fecha: "02/06/2026",
      usuario: "Gestor 1",
    },
  ];

  const descargarEstadoCuenta = () => {
    alert("Aquí se generará/descargará el Estado de Cuenta PDF.");
  };

  const generarCartaMora = () => {
    alert("Aquí se generará la Carta de Mora PDF.");
  };

  const abrirWhatsApp = () => {
    alert("Aquí se abrirá WhatsApp para contactar al cliente.");
  };

  const guardarInformacion = () => {
    alert("Información del cliente guardada correctamente.");
    setModoEdicion(false);
  };

  const subirDocumento = () => {
    alert("Aquí se subirá un documento al expediente digital.");
  };

  const registrarPromesa = () => {
    alert("Promesa de pago registrada.");
    setFechaPromesa("");
    setMontoPromesa("");
    setObservacionPromesa("");
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
            <h1 style={titulo}>Vista Cliente</h1>
          </div>
        </div>

        <div style={acciones}>
          <button style={botonSecundario} onClick={descargarEstadoCuenta}>
            Descargar Estado de Cuenta
          </button>

          <button style={botonSecundario} onClick={generarCartaMora}>
            Generar Carta de Mora
          </button>

          <button style={botonSecundario} onClick={abrirWhatsApp}>
            WhatsApp
          </button>

          {!modoEdicion && (
            <button style={botonSecundario} onClick={() => setModoEdicion(true)}>
              Editar Cliente
            </button>
          )}

          {modoEdicion && (
            <>
              <button style={boton} onClick={guardarInformacion}>
                Guardar Información
              </button>

              <button style={botonCancelar} onClick={() => setModoEdicion(false)}>
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
                <input defaultValue={cliente.nombre} style={inputStyle} />
                <input defaultValue={cliente.cedula} style={inputStyle} />
                <input defaultValue={cliente.telefono} style={inputStyle} />

                <select defaultValue={cliente.estado} style={inputStyle}>
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
                <p>Estado: {cliente.semaforo} {cliente.estado}</p>

                <button style={whatsappBtn} onClick={abrirWhatsApp}>
                  WhatsApp
                </button>
              </>
            )}
          </div>

          <div style={card}>
            <h3>Crédito</h3>

            {modoEdicion ? (
              <>
                <input defaultValue={cliente.producto} style={inputStyle} />
                <input defaultValue={cliente.saldo} style={inputStyle} />
                <input defaultValue={cliente.cuotaPendiente} style={inputStyle} />
                <input defaultValue={cliente.recargo} style={inputStyle} />
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
                <input defaultValue={cliente.cobrador} style={inputStyle} />
                <input defaultValue={cliente.diasAtraso} style={inputStyle} />
                <input defaultValue={cliente.prioridad} style={inputStyle} />
                <input defaultValue={cliente.clasificacion} style={inputStyle} />
              </>
            ) : (
              <>
                <p>Gestor: {cliente.cobrador}</p>
                <p><strong>Días de atraso:</strong> {cliente.diasAtraso}</p>
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
              <textarea defaultValue={cliente.direccion} style={textarea} />
              <input defaultValue={cliente.fechaPago} style={inputStyle} />
              <input defaultValue={cliente.proximoPago} style={inputStyle} />
              <textarea defaultValue={cliente.observacionInicial} style={textarea} />
            </>
          ) : (
            <>
              <p><strong>Dirección:</strong> {cliente.direccion}</p>
              <p><strong>Último pago:</strong> {cliente.fechaPago}</p>
              <p><strong>Próximo pago:</strong> {cliente.proximoPago}</p>
              <p><strong>Observación inicial:</strong> {cliente.observacionInicial}</p>
            </>
          )}
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Promesa de Pago</h2>

          <div style={gridFormulario}>
            <input
              type="date"
              value={fechaPromesa}
              onChange={(e) => setFechaPromesa(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Monto prometido"
              value={montoPromesa}
              onChange={(e) => setMontoPromesa(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Observación de la promesa"
              value={observacionPromesa}
              onChange={(e) => setObservacionPromesa(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button style={boton} onClick={registrarPromesa}>
            Registrar Promesa
          </button>

          <h3 style={tituloTabla}>Historial de Promesas</h3>

          <table style={tabla}>
            <thead>
              <tr>
                <th style={th}>Fecha</th>
                <th style={th}>Monto</th>
                <th style={th}>Estado</th>
                <th style={th}>Observación</th>
              </tr>
            </thead>

            <tbody>
              {promesas.map((promesa, index) => (
                <tr key={index}>
                  <td style={td}>{promesa.fecha}</td>
                  <td style={td}>${promesa.monto}</td>
                  <td style={td}>{promesa.estado}</td>
                  <td style={td}>{promesa.observacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Últimas Gestiones</h2>

          {ultimasGestiones.slice(0, 3).map((gestion, index) => (
            <div key={index} style={observacionBox}>
              <strong>{gestion.fecha} — {gestion.usuario}</strong>
              <p>{gestion.accion}</p>
            </div>
          ))}
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

          <div style={{ marginTop: "14px" }}>
            {observaciones.map((item, index) => (
              <div key={index} style={observacionBox}>
                <strong>{item.fecha} — {item.usuario}</strong>
                <p>{item.detalle}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>📁 Expediente Digital</h2>

          <button style={boton} onClick={subirDocumento}>
            + Subir Documento
          </button>

          <div style={{ marginTop: "14px", overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Nombre del archivo</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Fecha de carga</th>
                  <th style={th}>Usuario</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {documentos.map((documento, index) => (
                  <tr key={index}>
                    <td style={td}>{documento.nombre}</td>
                    <td style={td}>{documento.tipo}</td>
                    <td style={td}>{documento.fecha}</td>
                    <td style={td}>{documento.usuario}</td>
                    <td style={td}>
                      <button style={accionBtn}>Ver</button>
                      <button style={accionBtn}>Descargar</button>
                      <button style={accionBtn}>Eliminar</button>
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

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "15px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
  margin: "0 auto",
};

const encabezado = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "10px",
};

const logo = {
  width: "110px",
  maxWidth: "100%",
  height: "auto",
};

const titulo = {
  fontSize: "28px",
  marginBottom: "4px",
  color: "#111827",
};

const gridResumen = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
  gap: "12px",
  marginBottom: "12px",
};

const gridFormulario = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "12px",
};

const card = {
  background: "#ffffff",
  padding: "16px",
  borderRadius: "14px",
  marginBottom: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginBottom: "12px",
  color: "#111827",
};

const tituloTabla = {
  marginTop: "18px",
  marginBottom: "10px",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #f3f4f6",
};

const textarea = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  minHeight: "90px",
  marginBottom: "10px",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  marginBottom: "10px",
};

const boton = {
  marginTop: "10px",
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "11px 22px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonCancelar = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "11px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const observacionBox = {
  background: "#f9fafb",
  padding: "12px",
  borderRadius: "10px",
  marginBottom: "8px",
  border: "1px solid #e5e7eb",
};

const acciones = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "10px",
  marginBottom: "12px",
};

const botonSecundario = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "11px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const accionBtn = {
  padding: "7px 12px",
  marginRight: "6px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
};

const whatsappBtn = {
  marginTop: "8px",
  padding: "7px 14px",
  borderRadius: "8px",
  border: "none",
  background: "#25D366",
  color: "#ffffff",
  fontWeight: "bold",
  cursor: "pointer",
};
