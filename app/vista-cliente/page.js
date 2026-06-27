"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function VistaCliente() {
  const [buscar, setBuscar] = useState("");
  const [resultados, setResultados] = useState([]);

  const [cliente, setCliente] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [cuenta, setCuenta] = useState(null);
  const [cobranza, setCobranza] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [gestiones, setGestiones] = useState([]);
  const [documentos, setDocumentos] = useState([]);

  const [tipoGestion, setTipoGestion] = useState("Llamada");
  const [resultadoGestion, setResultadoGestion] = useState("Pendiente");
  const [observacion, setObservacion] = useState("");

  const [fechaPromesa, setFechaPromesa] = useState("");
  const [montoPromesa, setMontoPromesa] = useState("");
  const [observacionPromesa, setObservacionPromesa] = useState("");

  const [archivo, setArchivo] = useState(null);

  useEffect(() => {
    const busquedaGuardada = localStorage.getItem("busquedaVistaCliente");

    if (busquedaGuardada) {
      setBuscar(busquedaGuardada);
      localStorage.removeItem("busquedaVistaCliente");
      buscarClienteAutomatico(busquedaGuardada);
    }
  }, []);

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de usar Vista Cliente.");
      return null;
    }

    return empresaId;
  }

  function obtenerUsuarioActual() {
    const nombre =
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("adminKonaxNombre") ||
      "";

    const rol =
      localStorage.getItem("usuarioRol") ||
      localStorage.getItem("rolUsuario") ||
      "";

    if (nombre && rol) return `${nombre} (${rol})`;
    if (nombre) return nombre;
    if (rol) return rol;

    return "Usuario";
  }

  function calcularDiasAtraso(fechaVencimiento, saldoActual) {
    if (!fechaVencimiento || Number(saldoActual || 0) <= 0) return 0;

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = hoy - vencimiento;

    if (diferencia <= 0) return 0;

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  function obtenerSemaforo(dias) {
    if (dias <= 0) return "🟢";
    if (dias <= 30) return "🟡";
    if (dias <= 60) return "🟠";
    return "🔴";
  }

  async function buscarClienteAutomatico(valorBusqueda) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!valorBusqueda || valorBusqueda.trim().length < 3) return;

    let encontrados = [];

    const { data: clientesData, error: errorClientes } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(`nombre.ilike.%${valorBusqueda}%,cedula.ilike.%${valorBusqueda}%`);

    if (errorClientes) {
      alert("Error buscando cliente: " + errorClientes.message);
      return;
    }

    if (clientesData) {
      encontrados = clientesData.map((cliente) => ({
        cliente,
        cuenta: null,
      }));
    }

    const { data: cuentasData, error: errorCuentas } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .ilike("numero_cuenta", `%${valorBusqueda}%`);

    if (errorCuentas) {
      alert("Error buscando cuenta: " + errorCuentas.message);
      return;
    }

    if (cuentasData && cuentasData.length > 0) {
      const ids = cuentasData.map((item) => item.cliente_id);

      const { data: clientesDeCuentas, error: errorClientesCuentas } =
        await supabase
          .from("clientes")
          .select("*")
          .eq("empresa_id", empresaId)
          .in("id", ids);

      if (errorClientesCuentas) {
        alert("Error buscando clientes de cuentas: " + errorClientesCuentas.message);
        return;
      }

      cuentasData.forEach((cuenta) => {
        const cliente = clientesDeCuentas?.find(
          (item) => item.id === cuenta.cliente_id
        );

        if (cliente) {
          encontrados.push({ cliente, cuenta });
        }
      });
    }

    if (encontrados.length === 1) {
      await seleccionarCliente(encontrados[0]);
    } else {
      setResultados(encontrados);
    }
  }

  async function buscarCliente() {
    await buscarClienteAutomatico(buscar);
  }

  async function seleccionarCliente(resultado) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const clienteBase = resultado.cliente;

    setCliente(clienteBase);
    setResultados([]);
    setBuscar(clienteBase.nombre);

    const { data: cuentasData, error } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", clienteBase.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando cuentas: " + error.message);
      return;
    }

    const cuentaSeleccionada = resultado.cuenta || cuentasData?.[0] || null;

    setCuentas(cuentasData || []);
    setCuenta(cuentaSeleccionada);

    await cargarDatosRelacionados(clienteBase.id, cuentaSeleccionada?.id);
    await cargarDocumentos(clienteBase.id);
  }

  async function cargarDatosRelacionados(clienteId, cuentaId) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId || !cuentaId) return;

    const { data: cobranzaData } = await supabase
      .from("informacion_cobranza")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuentaId)
      .maybeSingle();

    setCobranza(cobranzaData || null);

    const { data: pagosData } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuentaId)
      .order("created_at", { ascending: false });

    setPagos(pagosData || []);

    const { data: gestionesData } = await supabase
      .from("bitacora_cliente")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", clienteId)
      .order("fecha_gestion", { ascending: false });

    setGestiones(gestionesData || []);
  }

  async function cambiarCuenta(cuentaId) {
    const nuevaCuenta = cuentas.find((item) => item.id === cuentaId);
    setCuenta(nuevaCuenta);
    await cargarDatosRelacionados(cliente.id, nuevaCuenta.id);
  }

  async function guardarGestion() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!cliente || !cuenta) {
      alert("Seleccione un cliente.");
      return;
    }

    if (!observacion) {
      alert("Escriba una observación.");
      return;
    }

    const usuarioActual = obtenerUsuarioActual();

    const { error } = await supabase.from("bitacora_cliente").insert([
      {
        empresa_id: empresaId,
        cliente_id: cliente.id,
        informacion_comercial_id: cuenta.id,
        tipo_gestion: tipoGestion,
        resultado_gestion: resultadoGestion,
        observacion,
        descripcion: observacion,
        usuario: usuarioActual,
        fecha_gestion: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert("Error guardando gestión: " + error.message);
      return;
    }

    setObservacion("");
    await cargarDatosRelacionados(cliente.id, cuenta.id);
  }

  async function registrarPromesa() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!cliente || !cuenta) {
      alert("Seleccione un cliente.");
      return;
    }

    if (!fechaPromesa || !montoPromesa) {
      alert("Complete fecha y monto de promesa.");
      return;
    }

    const usuarioActual = obtenerUsuarioActual();
    const textoPromesa = `Promesa de pago para ${fechaPromesa} por $${montoPromesa}. ${observacionPromesa}`;

    const { error } = await supabase.from("bitacora_cliente").insert([
      {
        empresa_id: empresaId,
        cliente_id: cliente.id,
        informacion_comercial_id: cuenta.id,
        tipo_gestion: "Promesa de Pago",
        resultado_gestion: "Promesa registrada",
        observacion: textoPromesa,
        descripcion: textoPromesa,
        usuario: usuarioActual,
        fecha_gestion: new Date().toISOString(),
        proxima_gestion: fechaPromesa,
      },
    ]);

    if (error) {
      alert("Error registrando promesa: " + error.message);
      return;
    }

    await supabase
      .from("informacion_cobranza")
      .update({
        proxima_gestion: fechaPromesa,
        observacion_cobro: textoPromesa,
      })
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuenta.id);

    setFechaPromesa("");
    setMontoPromesa("");
    setObservacionPromesa("");
    await cargarDatosRelacionados(cliente.id, cuenta.id);
  }

  async function cargarDocumentos(clienteId) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase.storage
      .from("documentos-clientes")
      .list(`empresas/${empresaId}/clientes/${clienteId}`);

    if (!error) {
      setDocumentos(data || []);
    }
  }

  async function subirDocumento() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!cliente) {
      alert("Seleccione un cliente.");
      return;
    }

    if (!archivo) {
      alert("Seleccione un documento.");
      return;
    }

    const nombreLimpio = archivo.name.replace(/\s+/g, "_");
    const ruta = `empresas/${empresaId}/clientes/${cliente.id}/${Date.now()}-${nombreLimpio}`;

    const { error } = await supabase.storage
      .from("documentos-clientes")
      .upload(ruta, archivo);

    if (error) {
      alert("Error subiendo documento: " + error.message);
      return;
    }

    setArchivo(null);
    await cargarDocumentos(cliente.id);
  }

  async function verDocumento(nombre) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const ruta = `empresas/${empresaId}/clientes/${cliente.id}/${nombre}`;

    const { data, error } = await supabase.storage
      .from("documentos-clientes")
      .createSignedUrl(ruta, 60);

    if (error) {
      alert("Error abriendo documento: " + error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  const diasAtraso = calcularDiasAtraso(
    cuenta?.fecha_vencimiento,
    cuenta?.saldo_actual
  );

  const semaforo = obtenerSemaforo(diasAtraso);

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />
            <h1 style={titulo}>Vista Cliente</h1>
          </div>

          <button onClick={volverDashboard} style={botonDashboard}>
            ← Volver al Dashboard
          </button>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Buscar Cliente</h2>

          <div style={gridFormulario}>
            <input
              placeholder="Buscar por nombre, cédula o número de cuenta"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              style={inputStyle}
            />

            <button style={botonSecundario} onClick={buscarCliente}>
              Buscar
            </button>
          </div>

          {resultados.length > 0 && (
            <table style={tabla}>
              <tbody>
                {resultados.map((item, index) => (
                  <tr key={index}>
                    <td style={td}>{item.cliente.nombre}</td>
                    <td style={td}>{item.cliente.cedula}</td>
                    <td style={td}>
                      {item.cuenta?.numero_cuenta || "Ver cuentas"}
                    </td>
                    <td style={td}>
                      <button
                        style={boton}
                        onClick={() => seleccionarCliente(item)}
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {cliente && (
          <>
            <div style={acciones}>
              <button style={botonSecundario}>Descargar Estado de Cuenta</button>
              <button style={botonSecundario}>Generar Carta de Mora</button>
              <button style={whatsappBtn}>WhatsApp</button>
            </div>

            <div style={gridResumen}>
              <div style={card}>
                <h3>Cliente</h3>
                <p>
                  <strong>{cliente.nombre}</strong>
                </p>
                <p>Cédula: {cliente.cedula}</p>
                <p>Teléfono: {cliente.telefono}</p>
                <p>Correo: {cliente.correo || "-"}</p>
                <p>Dirección: {cliente.direccion || "-"}</p>
              </div>

              <div style={card}>
                <h3>Información Comercial</h3>

                {cuentas.length > 1 && (
                  <select
                    value={cuenta?.id || ""}
                    onChange={(e) => cambiarCuenta(e.target.value)}
                    style={inputStyle}
                  >
                    {cuentas.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.numero_cuenta} - {item.descripcion}
                      </option>
                    ))}
                  </select>
                )}

                <p>Cuenta: {cuenta?.numero_cuenta || "-"}</p>
                <p>Tipo: {cuenta?.tipo_producto || "-"}</p>
                <p>Descripción: {cuenta?.descripcion || "-"}</p>
                <p>Modalidad: {cuenta?.modalidad || "-"}</p>
                <p>
                  Monto total: $
                  {Number(cuenta?.monto_total || 0).toLocaleString()}
                </p>
                <p>
                  Saldo actual: $
                  {Number(cuenta?.saldo_actual || 0).toLocaleString()}
                </p>
                <p>Cuota: ${Number(cuenta?.cuota || 0).toLocaleString()}</p>
              </div>

              <div style={card}>
                <h3>Cobranza</h3>
                <p>
                  Estado: {semaforo}{" "}
                  {cobranza?.estado_cobranza || cuenta?.estado || "-"}
                </p>
                <p>
                  <strong>Días de atraso:</strong> {diasAtraso}
                </p>
                <p>Fecha último pago: {cobranza?.fecha_ultimo_pago || "-"}</p>
                <p>
                  Monto último pago: $
                  {Number(cobranza?.monto_ultimo_pago || 0).toLocaleString()}
                </p>
                <p>Responsable: {cobranza?.responsable_cobro || "-"}</p>
              </div>
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
                  {pagos.map((pago) => (
                    <tr key={pago.id}>
                      <td style={td}>{pago.fecha_pago || pago.created_at}</td>
                      <td style={td}>
                        ${Number(pago.monto || 0).toLocaleString()}
                      </td>
                      <td style={td}>{pago.metodo_pago}</td>
                      <td style={td}>{pago.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={card}>
              <h2 style={tituloSeccion}>Observaciones de Gestión</h2>

              <div style={gridFormulario}>
                <select
                  value={tipoGestion}
                  onChange={(e) => setTipoGestion(e.target.value)}
                  style={inputStyle}
                >
                  <option>Llamada</option>
                  <option>WhatsApp</option>
                  <option>Visita</option>
                  <option>Correo</option>
                  <option>Seguimiento</option>
                  <option>Promesa de Pago</option>
                </select>

                <select
                  value={resultadoGestion}
                  onChange={(e) => setResultadoGestion(e.target.value)}
                  style={inputStyle}
                >
                  <option>Pendiente</option>
                  <option>Contestó</option>
                  <option>No contestó</option>
                  <option>Promesa de Pago</option>
                  <option>Pago Realizado</option>
                </select>
              </div>

              <textarea
                placeholder="Agregar nueva observación..."
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                style={textarea}
              />

              <button style={boton} onClick={guardarGestion}>
                Guardar Observación
              </button>

              <div style={{ marginTop: "14px" }}>
                {gestiones.map((item) => (
                  <div key={item.id} style={observacionBox}>
                    <strong>
                      {item.fecha_gestion} — {item.usuario || "Sin usuario"}
                    </strong>
                    <p>
                      {item.tipo_gestion} / {item.resultado_gestion}
                    </p>
                    <p>{item.observacion || item.descripcion}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <h2 style={tituloSeccion}>📁 Expediente Digital</h2>

              <input
                type="file"
                onChange={(e) => setArchivo(e.target.files[0])}
                style={inputStyle}
              />

              <button style={boton} onClick={subirDocumento}>
                + Subir Documento
              </button>

              <table style={tabla}>
                <thead>
                  <tr>
                    <th style={th}>Archivo</th>
                    <th style={th}>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {documentos.map((doc) => (
                    <tr key={doc.name}>
                      <td style={td}>{doc.name}</td>
                      <td style={td}>
                        <button
                          style={accionBtn}
                          onClick={() => verDocumento(doc.name)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
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
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginBottom: "10px",
  flexWrap: "wrap",
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

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "14px",
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

const botonDashboard = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "11px 18px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};
