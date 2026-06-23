"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CuentasPorCobrar() {
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [telefonoSecundario, setTelefonoSecundario] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referenciaNombre, setReferenciaNombre] = useState("");
  const [referenciaTelefono, setReferenciaTelefono] = useState("");
  const [estadoCliente, setEstadoCliente] = useState("Activo");

  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [tipoProducto, setTipoProducto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [saldoActual, setSaldoActual] = useState("");
  const [cuota, setCuota] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [estadoCuenta, setEstadoCuenta] = useState("Activo");

  const [estadoCobranza, setEstadoCobranza] = useState("Al Día");
  const [fechaUltimoPago, setFechaUltimoPago] = useState("");
  const [montoUltimoPago, setMontoUltimoPago] = useState("");
  const [responsableCobro, setResponsableCobro] = useState("");
  const [observacionCobro, setObservacionCobro] = useState("");
  const [documentos, setDocumentos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de guardar.");
      return null;
    }

    return empresaId;
  }

  function generarNumeroCuenta() {
    return "KX-" + Date.now();
  }

  function calcularDiasMora(fecha) {
    if (!fecha) return 0;

    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const diferencia = hoy - vencimiento;

    if (diferencia <= 0) return 0;

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  function limpiarFormulario() {
    setCedula("");
    setNombre("");
    setCorreo("");
    setTelefono("");
    setTelefonoSecundario("");
    setDireccion("");
    setReferenciaNombre("");
    setReferenciaTelefono("");
    setEstadoCliente("Activo");

    setNumeroCuenta("");
    setTipoProducto("");
    setDescripcion("");
    setModalidad("");
    setMontoTotal("");
    setSaldoActual("");
    setCuota("");
    setFechaInicio("");
    setFechaVencimiento("");
    setEstadoCuenta("Activo");

    setEstadoCobranza("Al Día");
    setFechaUltimoPago("");
    setMontoUltimoPago("");
    setResponsableCobro("");
    setObservacionCobro("");
    setDocumentos([]);
  }

  async function subirDocumentos(clienteId, empresaId) {
    if (documentos.length === 0) return;

    for (const archivo of documentos) {
      const nombreLimpio = archivo.name.replace(/\s+/g, "_");
      const ruta = `empresas/${empresaId}/clientes/${clienteId}/${Date.now()}-${nombreLimpio}`;

      const { error } = await supabase.storage
        .from("documentos-clientes")
        .upload(ruta, archivo);

      if (error) throw error;
    }
  }

  async function guardarCuenta() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!cedula || !nombre || !telefono) {
      alert("Complete cédula, nombre y teléfono.");
      return;
    }

    if (!tipoProducto || !modalidad) {
      alert("Complete tipo de cuenta y frecuencia de cobro.");
      return;
    }

    if (!montoTotal && !saldoActual) {
      alert("Ingrese monto original o saldo actual.");
      return;
    }

    if (!responsableCobro) {
      alert("Ingrese responsable de cobro.");
      return;
    }

    setGuardando(true);

    let clienteCreado = null;

    const { data: clienteExistente, error: errorBuscarCliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cedula", cedula)
      .maybeSingle();

    if (errorBuscarCliente) {
      setGuardando(false);
      alert("Error buscando cliente: " + errorBuscarCliente.message);
      return;
    }

    if (clienteExistente) {
      clienteCreado = clienteExistente;
    } else {
      const { data, error } = await supabase
        .from("clientes")
        .insert([
          {
            empresa_id: empresaId,
            cedula,
            nombre,
            telefono,
            telefono_secundario: telefonoSecundario,
            direccion,
            correo,
            referencia_nombre: referenciaNombre,
            referencia_telefono: referenciaTelefono,
            estado: estadoCliente,
            observacion: observacionCobro,
          },
        ])
        .select()
        .single();

      if (error) {
        setGuardando(false);
        alert("Error al guardar cliente: " + error.message);
        return;
      }

      clienteCreado = data;
    }

    const cuentaFinal = numeroCuenta || generarNumeroCuenta();

    const montoTotalNumero = Number(montoTotal || 0);
    const saldoActualNumero =
      saldoActual !== "" ? Number(saldoActual || 0) : montoTotalNumero;

    const { data: comercialCreado, error: errorComercial } = await supabase
      .from("informacion_comercial")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteCreado.id,
          numero_cuenta: cuentaFinal,
          tipo_producto: tipoProducto,
          descripcion,
          modalidad,
          monto_total: montoTotalNumero,
          saldo_actual: saldoActualNumero,
          cuota: Number(cuota || 0),
          fecha_inicio: fechaInicio || null,
          fecha_vencimiento: fechaVencimiento || null,
          responsable: responsableCobro,
          estado: estadoCuenta,
          observacion: observacionCobro,
        },
      ])
      .select()
      .single();

    if (errorComercial) {
      setGuardando(false);
      alert("Error en información comercial: " + errorComercial.message);
      return;
    }

    const diasMora = calcularDiasMora(fechaVencimiento);

    const { error: errorCobranza } = await supabase
      .from("informacion_cobranza")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteCreado.id,
          informacion_comercial_id: comercialCreado.id,
          estado_cobranza: estadoCobranza || "Al Día",
          dias_mora: diasMora,
          fecha_ultimo_pago: fechaUltimoPago || null,
          monto_ultimo_pago: Number(montoUltimoPago || 0),
          responsable_cobro: responsableCobro,
          observacion_cobro:
            observacionCobro || "Cuenta creada desde Cuentas por Cobrar",
        },
      ]);

    if (errorCobranza) {
      setGuardando(false);
      alert("Error en cobranza inicial: " + errorCobranza.message);
      return;
    }

    try {
      await subirDocumentos(clienteCreado.id, empresaId);
    } catch (error) {
      setGuardando(false);
      alert("Cuenta creada, pero hubo error subiendo documentos: " + error.message);
      return;
    }

    setGuardando(false);
    alert("Cuenta por cobrar registrada correctamente. Cuenta: " + cuentaFinal);
    limpiarFormulario();
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div>
            <h1 style={titulo}>Cuentas por Cobrar / Carga Inicial</h1>
            <p style={subtitulo}>
              Registra clientes existentes, cuentas por cobrar, cobranza inicial y documentos.
            </p>
          </div>
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

            <select value={estadoCliente} onChange={(e) => setEstadoCliente(e.target.value)} style={inputStyle}>
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>💰 Información de la Cuenta por Cobrar</h2>

          <div style={grid}>
            <input
              placeholder="Número de cuenta (opcional)"
              value={numeroCuenta}
              onChange={(e) => setNumeroCuenta(e.target.value)}
              style={inputStyle}
            />

            <select value={tipoProducto} onChange={(e) => setTipoProducto(e.target.value)} style={inputStyle}>
              <option value="">Seleccione tipo de cuenta</option>
              <option>Crédito</option>
              <option>Préstamo</option>
              <option>Cuenta por cobrar</option>
              <option>Membresía</option>
              <option>Suscripción</option>
              <option>Mensualidad</option>
              <option>Refinanciamiento</option>
              <option>Servicio pendiente</option>
            </select>

            <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} style={inputStyle}>
              <option value="">Seleccione frecuencia de cobro</option>
              <option>Semanal</option>
              <option>Quincenal</option>
              <option>Mensual</option>
              <option>Trimestral</option>
              <option>Semestral</option>
              <option>Anual</option>
              <option>Personalizada</option>
            </select>

            <input placeholder="Monto total original" value={montoTotal} onChange={(e) => setMontoTotal(e.target.value)} style={inputStyle} />
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

            <select value={estadoCuenta} onChange={(e) => setEstadoCuenta(e.target.value)} style={inputStyle}>
              <option>Activo</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
            </select>
          </div>

          <textarea
            placeholder="Descripción. Ej: Cuenta existente, préstamo personal, mensualidad pendiente, servicio pendiente..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ ...inputStyle, marginTop: "15px", minHeight: "90px" }}
          />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>📋 Información de Cobranza Inicial</h2>

          <div style={grid}>
            <select value={estadoCobranza} onChange={(e) => setEstadoCobranza(e.target.value)} style={inputStyle}>
              <option>Al Día</option>
              <option>Mora</option>
              <option>Legal</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
            </select>

            <div>
              <label style={labelStyle}>Fecha último pago</label>
              <input type="date" value={fechaUltimoPago} onChange={(e) => setFechaUltimoPago(e.target.value)} style={inputStyle} />
            </div>

            <input placeholder="Monto último pago" value={montoUltimoPago} onChange={(e) => setMontoUltimoPago(e.target.value)} style={inputStyle} />
            <input placeholder="Responsable de cobro *" value={responsableCobro} onChange={(e) => setResponsableCobro(e.target.value)} style={inputStyle} />
          </div>

          <textarea
            placeholder="Observación inicial / historial previo de cobro"
            value={observacionCobro}
            onChange={(e) => setObservacionCobro(e.target.value)}
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
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={guardarCuenta} style={botonGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar Cuenta por Cobrar"}
            </button>

            <button onClick={limpiarFormulario} style={botonLimpiar}>
              Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "28px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
  margin: "0 auto",
};

const encabezado = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "24px",
};

const logo = {
  width: "75px",
  height: "auto",
};

const titulo = {
  fontSize: "30px",
  margin: "0 0 6px 0",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  fontSize: "16px",
  margin: 0,
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
};

const botonLimpiar = {
  marginTop: "20px",
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "15px 30px",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
};
