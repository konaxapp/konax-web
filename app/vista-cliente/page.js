"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function VistaCliente() {
  const [buscar, setBuscar] = useState("");
  const [resultados, setResultados] = useState([]);

  const [empresa, setEmpresa] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [cuenta, setCuenta] = useState(null);
  const [cobranza, setCobranza] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [gestiones, setGestiones] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [recargos, setRecargos] = useState([]);

  const [tipoGestion, setTipoGestion] = useState("Llamada");
  const [resultadoGestion, setResultadoGestion] = useState("Pendiente");
  const [observacion, setObservacion] = useState("");

  const [fechaPromesa, setFechaPromesa] = useState("");
  const [montoPromesa, setMontoPromesa] = useState("");
  const [observacionPromesa, setObservacionPromesa] = useState("");

  const [archivo, setArchivo] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    iniciarVistaCliente();
  }, []);

  async function iniciarVistaCliente() {
    const sesionValida = await validarSesionActual();
    if (!sesionValida) return;

    const busquedaGuardada = localStorage.getItem("busquedaVistaCliente");

    if (busquedaGuardada) {
      setBuscar(busquedaGuardada);
      localStorage.removeItem("busquedaVistaCliente");
      await buscarClienteAutomatico(busquedaGuardada);
    }
  }

  function obtenerEmpresaId() {
    return localStorage.getItem("empresaId") || localStorage.getItem("empresa_id") || "";
  }

  function obtenerUsuarioId() {
    return localStorage.getItem("usuarioId") || "";
  }

  function cerrarSesionInvalida(mensaje) {
    if (mensaje) alert(mensaje);
    localStorage.clear();
    window.location.replace("/login");
  }

  async function validarSesionActual() {
    const empresaId = obtenerEmpresaId();
    const usuarioId = obtenerUsuarioId();

    if (!empresaId || !usuarioId) {
      cerrarSesionInvalida("La sesión no es válida. Inicie sesión nuevamente.");
      return false;
    }

    const { data: usuario, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("id, empresa_id, nombre, correo, rol, estado")
      .eq("id", usuarioId)
      .maybeSingle();

    if (errorUsuario || !usuario) {
      cerrarSesionInvalida("Error verificando la sesión.");
      return false;
    }

    if (String(usuario.estado || "").toLowerCase().trim() !== "activo") {
      cerrarSesionInvalida("Este usuario se encuentra inactivo.");
      return false;
    }

    if (String(usuario.empresa_id) !== String(empresaId)) {
      cerrarSesionInvalida("La sesión no corresponde a la empresa activa.");
      return false;
    }

    const { data: empresaData, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa || !empresaData) {
      cerrarSesionInvalida("Error verificando la empresa.");
      return false;
    }

    if (
      String(empresaData.estado || "").toLowerCase().trim() === "suspendido" ||
      String(empresaData.estado_plan || "").toLowerCase().trim() === "suspendido"
    ) {
      cerrarSesionInvalida("El servicio de esta empresa está suspendido.");
      return false;
    }

    localStorage.setItem("empresaId", String(empresaData.id));
    localStorage.setItem("empresa_id", String(empresaData.id));
    localStorage.setItem("usuarioId", String(usuario.id));
    localStorage.setItem("usuarioNombre", usuario.nombre || "");
    localStorage.setItem("nombreUsuario", usuario.nombre || "");
    localStorage.setItem("usuarioRol", usuario.rol || "");
    localStorage.setItem("rolUsuario", usuario.rol || "");
    localStorage.setItem("empresaNombre", empresaData.nombre || "");

    setEmpresa(empresaData);
    setCargandoSesion(false);

    return true;
  }

  function volverDashboard() {
    window.location.assign("/dashboard");
  }

  function nombreEmpresa() {
    return empresa?.nombre || empresa?.nombre_empresa || empresa?.razon_social || "KONAX Gestión";
  }

  function subtituloEmpresa() {
    return empresa?.subtitulo || empresa?.actividad || empresa?.categoria_negocio || empresa?.tipo_negocio || "";
  }

  function telefonoEmpresa() {
    return empresa?.telefono || empresa?.telefono_empresa || "";
  }

  function correoEmpresa() {
    return empresa?.correo || empresa?.email || empresa?.correo_empresa || "";
  }

  function direccionEmpresa() {
    return empresa?.direccion || empresa?.direccion_empresa || "";
  }

  function obtenerUsuarioActual() {
    const nombre =
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("nombreUsuario") ||
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

  function obtenerEstadoCalculado() {
    if (!cuenta) return "-";

    if (Number(cuenta?.saldo_actual || 0) <= 0) {
      return "Cancelado";
    }

    if (diasAtraso > 0) {
      return "Mora";
    }

    return "Al Día";
  }

  function obtenerSemaforo(dias) {
    if (dias <= 0) return "🟢";
    if (dias <= 30) return "🟡";
    if (dias <= 60) return "🟠";
    return "🔴";
  }

  function formatoDinero(valor) {
    return (
      "$" +
      Number(valor || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatoFecha(fecha) {
    if (!fecha) return "-";

    const texto = String(fecha).slice(0, 10);
    const partes = texto.split("-");

    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return texto;
  }

  function limpiarTexto(texto) {
    return String(texto || "").toLowerCase().trim();
  }

  async function buscarClienteAutomatico(valorBusqueda) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida("No existe una empresa activa en la sesión.");
      return;
    }

    const texto = String(valorBusqueda || "").trim();

    if (texto.length < 3) {
      alert("Ingrese al menos 3 caracteres para buscar.");
      return;
    }

    let encontrados = [];

    const { data: clientesData, error: errorClientes } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(`nombre.ilike.%${texto}%,cedula.ilike.%${texto}%`);

    if (errorClientes) {
      alert("Error buscando cliente: " + errorClientes.message);
      return;
    }

    if (clientesData) {
      encontrados = clientesData.map((clienteEncontrado) => ({
        cliente: clienteEncontrado,
        cuenta: null,
      }));
    }

    const { data: cuentasData, error: errorCuentas } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .ilike("numero_cuenta", `%${texto}%`);

    if (errorCuentas) {
      alert("Error buscando cuenta: " + errorCuentas.message);
      return;
    }

    if (cuentasData && cuentasData.length > 0) {
      const ids = [...new Set(cuentasData.map((item) => item.cliente_id).filter(Boolean))];

      if (ids.length > 0) {
        const { data: clientesDeCuentas, error: errorClientesCuentas } = await supabase
          .from("clientes")
          .select("*")
          .eq("empresa_id", empresaId)
          .in("id", ids);

        if (errorClientesCuentas) {
          alert("Error buscando clientes de cuentas: " + errorClientesCuentas.message);
          return;
        }

        cuentasData.forEach((cuentaEncontrada) => {
          const clienteEncontrado = clientesDeCuentas?.find(
            (item) => String(item.id) === String(cuentaEncontrada.cliente_id)
          );

          if (clienteEncontrado) {
            encontrados.push({
              cliente: clienteEncontrado,
              cuenta: cuentaEncontrada,
            });
          }
        });
      }
    }

    const unicos = [];

    encontrados.forEach((item) => {
      const clave = `${item.cliente?.id || ""}-${item.cuenta?.id || "cliente"}`;

      if (!unicos.some((x) => x.clave === clave)) {
        unicos.push({
          clave,
          ...item,
        });
      }
    });

    if (unicos.length === 0) {
      setResultados([]);
      setCliente(null);
      setCuentas([]);
      setCuenta(null);
      setCobranza(null);
      setPagos([]);
      setGestiones([]);
      setRecargos([]);
      setDocumentos([]);
      alert("No se encontraron resultados.");
      return;
    }

    if (unicos.length === 1) {
      await seleccionarCliente(unicos[0]);
      return;
    }

    setResultados(unicos);
  }

  async function buscarCliente() {
    await buscarClienteAutomatico(buscar);
  }

  async function seleccionarCliente(resultado) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida("No existe una empresa activa en la sesión.");
      return;
    }

    const clienteBase = resultado.cliente;

    if (String(clienteBase.empresa_id) !== String(empresaId)) {
      alert("Este cliente no pertenece a la empresa activa.");
      return;
    }

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

    if (cuentaSeleccionada) {
      await cargarDatosRelacionados(
        clienteBase.id,
        cuentaSeleccionada.id,
        cuentaSeleccionada.numero_cuenta,
        clienteBase.cedula
      );
    } else {
      setCobranza(null);
      setPagos([]);
      setGestiones([]);
      setRecargos([]);
    }

    await cargarDocumentos(clienteBase.id);
  }

  async function cargarDatosRelacionados(clienteId, cuentaId, numeroCuenta, cedulaCliente) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId || !cuentaId) return;

    const { data: cobranzaData, error: errorCobranza } = await supabase
      .from("informacion_cobranza")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuentaId)
      .maybeSingle();

    if (errorCobranza) {
      console.error("Error cargando cobranza:", errorCobranza);
    }

    setCobranza(cobranzaData || null);

    const { data: pagosData, error: errorPagos } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (errorPagos) {
      console.error("Error cargando pagos:", errorPagos);
      setPagos([]);
    } else {
      const pagosRelacionados = (pagosData || []).filter((pago) => {
        const tipo = limpiarTexto(pago.tipo);

        const esPago = [
          "pago crédito",
          "pago credito",
          "cobro crédito",
          "cobro credito",
          "mensualidad",
          "cancelación",
          "cancelacion",
        ].includes(tipo);

        if (!esPago) return false;

        const coincideCuentaId =
          pago.informacion_comercial_id &&
          String(pago.informacion_comercial_id) === String(cuentaId);

        const cuentaPago = String(
          pago.numero_cuenta || pago.cuenta || pago.codigo_cuenta || ""
        ).trim();

        const coincideNumeroCuenta =
          numeroCuenta && cuentaPago === String(numeroCuenta).trim();

        const cedulaPago = String(
          pago.cliente_cedula || pago.cedula || pago.identificacion || ""
        ).trim();

        const coincideCedula =
          cedulaCliente && cedulaPago === String(cedulaCliente).trim();

        const coincideClienteId =
          pago.cliente_id && String(pago.cliente_id) === String(clienteId);

        return (
          coincideCuentaId ||
          coincideNumeroCuenta ||
          coincideCedula ||
          coincideClienteId
        );
      });

      setPagos(pagosRelacionados);
    }

    await cargarRecargosRelacionados(clienteId, cuentaId, numeroCuenta, cedulaCliente);

    const { data: gestionesData, error: errorGestiones } = await supabase
      .from("bitacora_cliente")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", clienteId)
      .eq("informacion_comercial_id", cuentaId)
      .order("fecha_gestion", { ascending: false });

    if (errorGestiones) {
      console.error("Error cargando gestiones:", errorGestiones);
      setGestiones([]);
    } else {
      setGestiones(gestionesData || []);
    }
  }

  async function cargarRecargosRelacionados(clienteId, cuentaId, numeroCuenta, cedulaCliente) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) return;

    const posiblesTablas = ["historial_recargos", "recargos", "HISTORIAL_RECARGOS"];

    for (const tablaRecargos of posiblesTablas) {
      const { data, error } = await supabase
        .from(tablaRecargos)
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });

      if (error) continue;

      const relacionados = (data || []).filter((recargo) => {
        const coincideCuentaId =
          recargo.informacion_comercial_id &&
          String(recargo.informacion_comercial_id) === String(cuentaId);

        const cuentaRecargo = String(
          recargo.numero_cuenta || recargo.cuenta || recargo.codigo_cuenta || ""
        ).trim();

        const coincideNumeroCuenta =
          numeroCuenta && cuentaRecargo === String(numeroCuenta).trim();

        const cedulaRecargo = String(
          recargo.cliente_cedula || recargo.cedula || recargo.identificacion || ""
        ).trim();

        const coincideCedula =
          cedulaCliente && cedulaRecargo === String(cedulaCliente).trim();

        const coincideClienteId =
          recargo.cliente_id && String(recargo.cliente_id) === String(clienteId);

        return (
          coincideCuentaId ||
          coincideNumeroCuenta ||
          coincideCedula ||
          coincideClienteId
        );
      });

      setRecargos(relacionados);
      return;
    }

    setRecargos([]);
  }

  async function cambiarCuenta(cuentaId) {
    const nuevaCuenta = cuentas.find((item) => String(item.id) === String(cuentaId));

    if (!nuevaCuenta || !cliente) return;

    setCuenta(nuevaCuenta);

    await cargarDatosRelacionados(
      cliente.id,
      nuevaCuenta.id,
      nuevaCuenta.numero_cuenta,
      cliente.cedula
    );
  }

  async function guardarGestion() {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida("No existe empresa activa.");
      return;
    }

    if (!cliente || !cuenta) {
      alert("Seleccione un cliente.");
      return;
    }

    if (!observacion.trim()) {
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
        observacion: observacion.trim(),
        descripcion: observacion.trim(),
        usuario: usuarioActual,
        fecha_gestion: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert("Error guardando gestión: " + error.message);
      return;
    }

    await supabase
      .from("informacion_cobranza")
      .update({
        ultimo_resultado_gestion: resultadoGestion,
        ultima_observacion: observacion.trim(),
        fecha_ultima_gestion: new Date().toISOString(),
      })
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuenta.id);

    setObservacion("");

    await cargarDatosRelacionados(cliente.id, cuenta.id, cuenta.numero_cuenta, cliente.cedula);
  }

  async function registrarPromesa() {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida("No existe empresa activa.");
      return;
    }

    if (!cliente || !cuenta) {
      alert("Seleccione un cliente.");
      return;
    }

    if (!fechaPromesa || !montoPromesa) {
      alert("Complete fecha y monto de promesa.");
      return;
    }

    const monto = Number(montoPromesa);

    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Ingrese un monto de promesa válido.");
      return;
    }

    if (monto > Number(cuenta.saldo_actual || 0)) {
      alert("El monto prometido no puede superar el saldo actual.");
      return;
    }

    const usuarioActual = obtenerUsuarioActual();

    const textoPromesa =
      `Promesa de pago para ${fechaPromesa} por ${formatoDinero(monto)}. ` +
      `${observacionPromesa || ""}`;

    const { error } = await supabase.from("bitacora_cliente").insert([
      {
        empresa_id: empresaId,
        cliente_id: cliente.id,
        informacion_comercial_id: cuenta.id,
        tipo_gestion: "Promesa de Pago",
        resultado_gestion: "Promesa registrada",
        observacion: textoPromesa.trim(),
        descripcion: textoPromesa.trim(),
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
        observacion_cobro: textoPromesa.trim(),
        ultimo_resultado_gestion: "Promesa registrada",
        fecha_ultima_gestion: new Date().toISOString(),
        ultima_observacion: textoPromesa.trim(),
      })
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuenta.id);

    setFechaPromesa("");
    setMontoPromesa("");
    setObservacionPromesa("");

    await cargarDatosRelacionados(cliente.id, cuenta.id, cuenta.numero_cuenta, cliente.cedula);

    alert("Promesa de pago registrada correctamente.");
  }

  async function cargarDocumentos(clienteId) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) return;

    const { data, error } = await supabase.storage
      .from("documentos-clientes")
      .list(`empresas/${empresaId}/clientes/${clienteId}`);

    if (error) {
      console.error("Error cargando documentos:", error);
      setDocumentos([]);
      return;
    }

    setDocumentos(data || []);
  }

  async function subirDocumento() {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida("No existe empresa activa.");
      return;
    }

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

    if (!empresaId || !cliente) return;

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

  function abrirWhatsAppCliente() {
    if (!cliente) return;

    let telefono = String(cliente.telefono || "").replace(/\D/g, "");

    if (!telefono) {
      alert("Este cliente no tiene teléfono registrado.");
      return;
    }

    if (telefono.startsWith("507")) {
      telefono = telefono.slice(3);
    }

    const mensaje = cuenta
      ? `Hola ${cliente.nombre || ""}, le contactamos de ${nombreEmpresa()} con relación a su cuenta ${cuenta.numero_cuenta || ""}.`
      : `Hola ${cliente.nombre || ""}, le contactamos de ${nombreEmpresa()}.`;

    window.open(`https://wa.me/507${telefono}?text=${encodeURIComponent(mensaje)}`, "_blank");
  }

  const diasAtraso = calcularDiasAtraso(cuenta?.fecha_vencimiento, cuenta?.saldo_actual);
  const semaforo = obtenerSemaforo(diasAtraso);
  const estadoCalculado = obtenerEstadoCalculado();

  if (cargandoSesion) {
    return <div style={{ padding: "30px" }}>Validando sesión de KONAX...</div>;
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <h1 style={titulo}>Vista Cliente</h1>
              <p style={subtituloVista}>{nombreEmpresa()}</p>
            </div>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") buscarCliente();
              }}
              style={inputStyle}
            />

            <button style={botonSecundario} onClick={buscarCliente}>
              Buscar
            </button>
          </div>

          {resultados.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={tabla}>
                <tbody>
                  {resultados.map((item, index) => (
                    <tr key={item.clave || index}>
                      <td style={td}>{item.cliente.nombre}</td>
                      <td style={td}>{item.cliente.cedula}</td>
                      <td style={td}>{item.cuenta?.numero_cuenta || "Ver cuentas"}</td>
                      <td style={td}>
                        <button style={boton} onClick={() => seleccionarCliente(item)}>
                          Seleccionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {cliente && (
          <>
            <div style={acciones}>
              <button style={whatsappBtn} onClick={abrirWhatsAppCliente}>
                WhatsApp
              </button>
            </div>

            <div style={gridResumen}>
              <div style={card}>
                <h3>Cliente</h3>
                <p><strong>{cliente.nombre}</strong></p>
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
                        {item.numero_cuenta} - {item.descripcion || "Cuenta"}
                      </option>
                    ))}
                  </select>
                )}

                <p>Cuenta: {cuenta?.numero_cuenta || "-"}</p>
                <p>Tipo: {cuenta?.tipo_producto || "-"}</p>
                <p>Descripción: {cuenta?.descripcion || "-"}</p>
                <p>Modalidad: {cuenta?.modalidad || "-"}</p>
                <p>Monto total: {formatoDinero(cuenta?.monto_total)}</p>
                <p>Saldo actual: {formatoDinero(cuenta?.saldo_actual)}</p>
                <p>Cuota: {formatoDinero(cuenta?.cuota)}</p>
              </div>

              <div style={card}>
                <h3>Cobranza</h3>
                <p>Estado: {semaforo} {estadoCalculado}</p>
                <p><strong>Días de atraso:</strong> {diasAtraso}</p>
                <p>Fecha último pago: {formatoFecha(cobranza?.fecha_ultimo_pago)}</p>
                <p>Monto último pago: {formatoDinero(cobranza?.monto_ultimo_pago)}</p>
                <p>Responsable: {cobranza?.responsable_cobro || "-"}</p>
                <p>Próxima gestión: {formatoFecha(cobranza?.proxima_gestion)}</p>
              </div>
            </div>

            <div style={card}>
              <h2 style={tituloSeccion}>Promesa de Pago</h2>

              <div style={gridPromesa}>
                <div>
                  <label style={labelStyle}>Fecha prometida</label>
                  <input
                    type="date"
                    value={fechaPromesa}
                    onChange={(e) => setFechaPromesa(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Monto prometido</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Ej. 300.00"
                    value={montoPromesa}
                    onChange={(e) => setMontoPromesa(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Observación</label>
                  <input
                    placeholder="Ej. Promete pagar mañana"
                    value={observacionPromesa}
                    onChange={(e) => setObservacionPromesa(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <button style={boton} onClick={registrarPromesa}>
                Registrar Promesa
              </button>
            </div>

            <div style={card}>
              <h2 style={tituloSeccion}>Historial de Pagos</h2>

              <div style={{ overflowX: "auto" }}>
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
                        <td style={td}>{formatoFecha(pago.fecha_pago || pago.created_at)}</td>
                        <td style={td}>{formatoDinero(pago.monto)}</td>
                        <td style={td}>{pago.metodo_pago || pago.metodo || "-"}</td>
                        <td style={td}>{pago.descripcion || pago.observacion || "-"}</td>
                      </tr>
                    ))}

                    {pagos.length === 0 && (
                      <tr>
                        <td style={td} colSpan="4">
                          No hay pagos registrados para esta cuenta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                      {formatoFecha(item.fecha_gestion)} — {item.usuario || "Sin usuario"}
                    </strong>
                    <p>{item.tipo_gestion || "-"} / {item.resultado_gestion || "-"}</p>
                    <p>{item.observacion || item.descripcion || "-"}</p>
                    {item.proxima_gestion && (
                      <p><strong>Próxima gestión:</strong> {formatoFecha(item.proxima_gestion)}</p>
                    )}
                  </div>
                ))}

                {gestiones.length === 0 && (
                  <p>No hay gestiones registradas para esta cuenta.</p>
                )}
              </div>
            </div>

            <div style={card}>
              <h2 style={tituloSeccion}>📁 Expediente Digital</h2>

              <input
                type="file"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                style={inputStyle}
              />

              <button style={boton} onClick={subirDocumento}>
                + Subir Documento
              </button>

              <div style={{ overflowX: "auto" }}>
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
                          <button style={accionBtn} onClick={() => verDocumento(doc.name)}>
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}

                    {documentos.length === 0 && (
                      <tr>
                        <td style={td} colSpan="2">
                          No hay documentos cargados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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

const subtituloVista = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: "bold",
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

const gridPromesa = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
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

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
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
  padding: "11px 20px",
  borderRadius: "9px",
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
