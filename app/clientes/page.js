"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Clientes() {
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [telefonoSecundario, setTelefonoSecundario] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referenciaNombre, setReferenciaNombre] = useState("");
  const [referenciaTelefono, setReferenciaTelefono] = useState("");
  const [estado, setEstado] = useState("Activo");

  const [tipoProducto, setTipoProducto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [saldoActual, setSaldoActual] = useState("");
  const [cuota, setCuota] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observacion, setObservacion] = useState("");

  function generarNumeroCuenta() {
    return "KX-" + Date.now();
  }

  async function guardarCliente() {
    if (!cedula || !nombre || !telefono) {
      alert("Complete cédula, nombre y teléfono.");
      return;
    }

    const { data: clienteCreado, error: errorCliente } = await supabase
      .from("clientes")
      .insert([
        {
          cedula,
          nombre,
          telefono,
          telefono_secundario: telefonoSecundario,
          direccion,
          correo,
          referencia_nombre: referenciaNombre,
          referencia_telefono: referenciaTelefono,
          estado,
          observacion,
        },
      ])
      .select()
      .single();

    if (errorCliente) {
      console.error(errorCliente);
      alert("Error al guardar cliente: " + errorCliente.message);
      return;
    }

    const numeroCuenta = generarNumeroCuenta();

    const { error: errorComercial } = await supabase
      .from("informacion_comercial")
      .insert([
        {
          cliente_id: clienteCreado.id,
          numero_cuenta: numeroCuenta,
          tipo_producto: tipoProducto,
          descripcion,
          modalidad,
          monto_total: montoTotal || 0,
          saldo_actual: saldoActual || 0,
          cuota: cuota || 0,
          fecha_inicio: fechaInicio || null,
          fecha_vencimiento: fechaVencimiento || null,
          responsable,
          estado,
          observacion,
        },
      ]);

    if (errorComercial) {
      console.error(errorComercial);
      alert("Cliente creado, pero error en información comercial: " + errorComercial.message);
      return;
    }

    alert("Cliente creado correctamente. Cuenta: " + numeroCuenta);

    setCedula("");
    setNombre("");
    setCorreo("");
    setTelefono("");
    setTelefonoSecundario("");
    setDireccion("");
    setReferenciaNombre("");
    setReferenciaTelefono("");
    setEstado("Activo");
    setTipoProducto("");
    setDescripcion("");
    setModalidad("");
    setMontoTotal("");
    setSaldoActual("");
    setCuota("");
    setFechaInicio("");
    setFechaVencimiento("");
    setResponsable("");
    setObservacion("");
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={logoBox}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
        </div>

        <div style={encabezado}>
          <h1 style={titulo}>Crear Cliente</h1>
          <p style={subtitulo}>
            Registro de clientes, información comercial y seguimiento inicial.
          </p>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>👤 Información del Cliente</h2>

          <div style={grid}>
            <input placeholder="Cédula / Identificación *" value={cedula} onChange={(e) => setCedula(e.target.value)} style={inputStyle} />
            <input placeholder="Nombre completo *" value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
            <input placeholder="Correo electrónico" value={correo} onChange={(e) => setCorreo(e.target.value)} style={inputStyle} />
            <input placeholder="Teléfono principal *" value={telefono} onChange={(e) => setTelefono(e.target.value)} style={inputStyle} />
            <input placeholder="Teléfono secundario" value={telefonoSecundario} onChange={(e) => setTelefonoSecundario(e.target.value)} style={inputStyle} />
            <input placeholder="Dirección completa" value={direccion} onChange={(e) => setDireccion(e.target.value)} style={inputStyle} />
            <input placeholder="Nombre de referencia" value={referenciaNombre} onChange={(e) => setReferenciaNombre(e.target.value)} style={inputStyle} />
            <input placeholder="Teléfono de referencia" value={referenciaTelefono} onChange={(e) => setReferenciaTelefono(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>📦 Información Comercial</h2>

          <div style={grid}>
            <select value={tipoProducto} onChange={(e) => setTipoProducto(e.target.value)} style={inputStyle}>
              <option value="">Seleccione tipo de producto o servicio</option>
              <option>Venta a Crédito</option>
              <option>Suscripción</option>
              <option>Mensualidad</option>
              <option>Contrato</option>
              <option>Financiamiento</option>
            </select>

            <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} style={inputStyle}>
              <option value="">Seleccione modalidad</option>
              <option>Crédito</option>
              <option>Mensualidad</option>
              <option>Suscripción</option>
              <option>Contrato</option>
              <option>Financiamiento</option>
            </select>

            <input placeholder="Monto total" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} style={inputStyle} />
            <input placeholder="Saldo actual" value={saldoActual} onChange={(e) => setSaldoActual(e.target.value)} style={inputStyle} />
            <input placeholder="Cuota / Mensualidad" value={cuota} onChange={(e) => setCuota(e.target.value)} style={inputStyle} />

            <div>
              <label style={labelStyle}>Fecha de inicio</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Fecha de vencimiento</label>
              <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <textarea
            placeholder="Descripción del producto, servicio o plan. Ej: Nevera, estufa y cama / Plan IPTV Premium / Mensualidad escolar 2026"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ ...inputStyle, marginTop: "15px", minHeight: "90px" }}
          />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>📋 Información de Gestión</h2>

          <div style={grid}>
            <select value={responsable} onChange={(e) => setResponsable(e.target.value)} style={inputStyle}>
              <option value="">Responsable asignado</option>
              <option>Gestor 1</option>
              <option>Gestor 2</option>
              <option>Administrador</option>
              <option>Vendedor</option>
            </select>

            <select value={estado} onChange={(e) => setEstado(e.target.value)} style={inputStyle}>
              <option>Activo</option>
              <option>Al Día</option>
              <option>Pendiente</option>
              <option>Mora</option>
              <option>Promesa de Pago</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
              <option>Legal</option>
            </select>
          </div>

          <textarea
            placeholder="Observación inicial"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            style={{ ...inputStyle, marginTop: "15px", minHeight: "120px" }}
          />

          <button onClick={guardarCliente} style={botonGuardar}>
            + Crear Cliente
          </button>
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
  width: "350px",
  maxWidth: "100%",
  height: "auto",
};

const encabezado = {
  marginBottom: "30px",
};

const titulo = {
  fontSize: "40px",
  marginBottom: "10px",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  fontSize: "18px",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
  gap: "15px",
};

const tituloSeccion = {
  marginBottom: "20px",
  color: "#111827",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  color: "#374151",
  fontWeight: "bold",
};

const botonGuardar = {
  marginTop: "20px",
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "15px 30px",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
};
