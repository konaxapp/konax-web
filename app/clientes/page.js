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
  const [observacion, setObservacion] = useState("");

  const [estadoCobranza, setEstadoCobranza] = useState("");
  const [fechaUltimoPago, setFechaUltimoPago] = useState("");
  const [montoUltimoPago, setMontoUltimoPago] = useState("");
  const [responsableCobro, setResponsableCobro] = useState("");

  const [documentos, setDocumentos] = useState([]);

  function generarNumeroCuenta() {
    return "KX-" + Date.now();
  }

  async function subirDocumentos(clienteId) {
    if (documentos.length === 0) return;

    for (const archivo of documentos) {
      const nombreLimpio = archivo.name.replace(/\s+/g, "_");
      const ruta = `clientes/${clienteId}/${Date.now()}-${nombreLimpio}`;

      const { error } = await supabase.storage
        .from("documentos-clientes")
        .upload(ruta, archivo);

      if (error) {
        throw error;
      }
    }
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
      alert("Error al guardar cliente: " + errorCliente.message);
      return;
    }

    const numeroCuenta = generarNumeroCuenta();

    const { data: comercialCreado, error: errorComercial } = await supabase
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
          estado,
          observacion,
        },
      ])
      .select()
      .single();

    if (errorComercial) {
      alert(
        "Cliente creado, pero error en información comercial: " +
          errorComercial.message
      );
      return;
    }

    const hayCobranza =
      estadoCobranza ||
      fechaUltimoPago ||
      montoUltimoPago ||
      responsableCobro;

    if (hayCobranza) {
      const { error: errorCobranza } = await supabase
        .from("informacion_cobranza")
        .insert([
          {
            cliente_id: clienteCreado.id,
            informacion_comercial_id: comercialCreado.id,
            estado_cobranza: estadoCobranza || null,
            fecha_ultimo_pago: fechaUltimoPago || null,
            monto_ultimo_pago: montoUltimoPago || 0,
            responsable_cobro: responsableCobro || null,
          },
        ]);

      if (errorCobranza) {
        alert(
          "Cliente creado, pero error en cobranza inicial: " +
            errorCobranza.message
        );
        return;
      }
    }

    try {
      await subirDocumentos(clienteCreado.id);
    } catch (error) {
      alert(
        "Cliente creado, pero hubo error subiendo documentos: " +
          error.message
      );
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
    setObservacion("");

    setEstadoCobranza("");
    setFechaUltimoPago("");
    setMontoUltimoPago("");
    setResponsableCobro("");
    setDocumentos([]);
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
            Registro de cliente, información comercial, cobranza inicial y documentos.
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
            placeholder="Descripción del producto, servicio o plan"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ ...inputStyle, marginTop: "15px", minHeight: "90px" }}
          />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>📋 Información de Cobranza Inicial (Opcional)</h2>

          <div style={grid}>
            <select value={estadoCobranza} onChange={(e) => setEstadoCobranza(e.target.value)} style={inputStyle}>
              <option value="">Seleccione estado de cobranza</option>
              <option>Al Día</option>
              <option>Mora</option>
              <option>Legal</option>
              <option>Suspendido</option>
            </select>

            <div>
              <label style={labelStyle}>Fecha último pago</label>
              <input type="date" value={fechaUltimoPago} onChange={(e) => setFechaUltimoPago(e.target.value)} style={inputStyle} />
            </div>

            <input placeholder="Monto último pago" value={montoUltimoPago} onChange={(e) => setMontoUltimoPago(e.target.value)} style={inputStyle} />

            <input placeholder="Responsable de cartera" value={responsableCobro} onChange={(e) => setResponsableCobro(e.target.value)} style={inputStyle} />
          </div>

          <textarea
            placeholder="Observación inicial general"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            style={{ ...inputStyle, marginTop: "15px", minHeight: "100px" }}
          />

          <div style={{ marginTop: "20px" }}>
            <label style={labelStyle}>Documentos del Cliente</label>

            <input
              type="file"
              multiple
              onChange={(e) => setDocumentos(Array.from(e.target.files))}
              style={inputStyle}
            />

            <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
              Puede subir cédula, contrato, ficha, comprobantes, recibos o cualquier documento.
            </p>
          </div>

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
