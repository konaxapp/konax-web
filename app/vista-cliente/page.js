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
  const [buscando, setBuscando] = useState(false);
  const [guardandoGestion, setGuardandoGestion] = useState(false);
  const [guardandoPromesa, setGuardandoPromesa] = useState(false);
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);

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
    return (
      localStorage.getItem("empresaId") ||
      localStorage.getItem("empresa_id") ||
      ""
    );
  }

  function obtenerUsuarioId() {
    return localStorage.getItem("usuarioId") || "";
  }

  function cerrarSesionInvalida(mensaje) {
    if (mensaje) alert(mensaje);
    localStorage.clear();
    window.location.replace("/login");
  }

  function fechaPanamaISO() {
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Panama",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const year = partes.find((p) => p.type === "year")?.value || "";
    const month = partes.find((p) => p.type === "month")?.value || "";
    const day = partes.find((p) => p.type === "day")?.value || "";

    return `${year}-${month}-${day}`;
  }

  function formatoFecha(fecha) {
    if (!fecha) return "-";

    const texto = String(fecha).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      const [year, month, day] = texto.split("-");
      return `${day}/${month}/${year}`;
    }

    const fechaObjeto = new Date(texto);

    if (Number.isNaN(fechaObjeto.getTime())) return texto;

    return new Intl.DateTimeFormat("es-PA", {
      timeZone: "America/Panama",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(fechaObjeto);
  }

  function formatoFechaHora(fecha) {
    if (!fecha) return "-";

    const fechaObjeto = new Date(fecha);

    if (Number.isNaN(fechaObjeto.getTime())) {
      return formatoFecha(fecha);
    }

    return new Intl.DateTimeFormat("es-PA", {
      timeZone: "America/Panama",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(fechaObjeto);
  }

  async function validarSesionActual() {
    const empresaId = obtenerEmpresaId();
    const usuarioId = obtenerUsuarioId();

    if (!empresaId || !usuarioId) {
      cerrarSesionInvalida(
        "La sesión no es válida. Inicie sesión nuevamente."
      );
      return false;
    }

    const { data: usuario, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("id, empresa_id, nombre, correo, rol, estado")
      .eq("id", usuarioId)
      .maybeSingle();

    if (errorUsuario) {
      cerrarSesionInvalida(
        "Error verificando la sesión: " + errorUsuario.message
      );
      return false;
    }

    if (!usuario) {
      cerrarSesionInvalida("El usuario de la sesión ya no existe.");
      return false;
    }

    if (String(usuario.estado || "").toLowerCase().trim() !== "activo") {
      cerrarSesionInvalida("Este usuario se encuentra inactivo.");
      return false;
    }

    if (String(usuario.empresa_id) !== String(empresaId)) {
      cerrarSesionInvalida(
        "La sesión no corresponde a la empresa activa."
      );
      return false;
    }

    const { data: empresaData, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      cerrarSesionInvalida(
        "Error verificando la empresa: " + errorEmpresa.message
      );
      return false;
    }

    if (!empresaData) {
      cerrarSesionInvalida("La empresa de la sesión no existe.");
      return false;
    }

    const empresaSuspendida =
      String(empresaData.estado || "").toLowerCase().trim() === "suspendido";

    const planSuspendido =
      String(empresaData.estado_plan || "").toLowerCase().trim() ===
      "suspendido";

    if (empresaSuspendida || planSuspendido) {
      cerrarSesionInvalida(
        "El servicio de esta empresa está suspendido."
      );
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
    return (
      empresa?.nombre ||
      empresa?.nombre_empresa ||
      empresa?.razon_social ||
      "KONAX Gestión"
    );
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

  function limpiarTexto(texto) {
    return String(texto || "").toLowerCase().trim();
  }

  function formatoDinero(valor) {
    return (
      "$" +
      Number(valor || 0).toLocaleString("es-PA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function calcularDiasAtraso(fechaVencimiento, saldoActual) {
    if (!fechaVencimiento || Number(saldoActual || 0) <= 0) return 0;

    const hoy = new Date(`${fechaPanamaISO()}T00:00:00`);
    const vencimiento = new Date(
      `${String(fechaVencimiento).slice(0, 10)}T00:00:00`
    );

    const diferencia = hoy.getTime() - vencimiento.getTime();

    if (diferencia <= 0) return 0;

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  function obtenerEstadoCalculado() {
    if (!cuenta) return "-";

    if (Number(cuenta.saldo_actual || 0) <= 0) return "Cancelado";

    const estadoCobranza = limpiarTexto(cobranza?.estado_cobranza);
    const estadoComercial = limpiarTexto(cuenta?.estado);

    if (estadoCobranza === "legal" || estadoComercial === "legal") {
      return "Legal";
    }

    if (
      estadoCobranza === "suspendido" ||
      estadoComercial === "suspendido"
    ) {
      return "Suspendido";
    }

    if (diasAtraso > 0) return "Mora";

    return "Al Día";
  }

  function obtenerSemaforo(dias) {
    if (dias <= 0) return "#22c55e";
    if (dias <= 30) return "#eab308";
    if (dias <= 60) return "#f97316";
    return "#ef4444";
  }

  function pagoEsValido(pago) {
    const tipo = limpiarTexto(pago?.tipo);
    const estado = limpiarTexto(pago?.estado);

    if (estado && estado !== "procesado" && estado !== "activo") {
      return false;
    }

    return [
      "pago crédito",
      "pago credito",
      "cobro crédito",
      "cobro credito",
      "mensualidad",
      "cancelación",
      "cancelacion",
    ].includes(tipo);
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

    if (buscando) return;

    setBuscando(true);

    let encontrados = [];

    const { data: clientesData, error: errorClientes } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(`nombre.ilike.%${texto}%,cedula.ilike.%${texto}%`);

    if (errorClientes) {
      setBuscando(false);
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
      setBuscando(false);
      alert("Error buscando cuenta: " + errorCuentas.message);
      return;
    }

    if (cuentasData && cuentasData.length > 0) {
      const ids = [
        ...new Set(
          cuentasData.map((item) => item.cliente_id).filter(Boolean)
        ),
      ];

      if (ids.length > 0) {
        const {
          data: clientesDeCuentas,
          error: errorClientesCuentas,
        } = await supabase
          .from("clientes")
          .select("*")
          .eq("empresa_id", empresaId)
          .in("id", ids);

        if (errorClientesCuentas) {
          setBuscando(false);
          alert(
            "Error buscando clientes de cuentas: " +
              errorClientesCuentas.message
          );
          return;
        }

        cuentasData.forEach((cuentaEncontrada) => {
          const clienteEncontrado = clientesDeCuentas?.find(
            (item) =>
              String(item.id) === String(cuentaEncontrada.cliente_id)
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
      const clave =
        `${item.cliente?.id || ""}-` +
        `${item.cuenta?.id || "cliente"}`;

      if (!unicos.some((registro) => registro.clave === clave)) {
        unicos.push({ clave, ...item });
      }
    });

    setBuscando(false);

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
    setBuscar(clienteBase.nombre || "");

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

    setFechaPromesa("");
    setMontoPromesa("");
    setObservacionPromesa("");
    setObservacion("");

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

  async function cargarDatosRelacionados(
    clienteId,
    cuentaId,
    numeroCuenta,
    cedulaCliente
  ) {
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
        if (!pagoEsValido(pago)) return false;

        const coincideCuentaId =
          pago.informacion_comercial_id &&
          String(pago.informacion_comercial_id) === String(cuentaId);

        const cuentaPago = String(
          pago.numero_cuenta ||
            pago.cuenta ||
            pago.codigo_cuenta ||
            ""
        ).trim();

        const coincideNumeroCuenta =
          numeroCuenta &&
          cuentaPago === String(numeroCuenta).trim();

        const cedulaPago = String(
          pago.cliente_cedula ||
            pago.cedula ||
            pago.identificacion ||
            ""
        ).trim();

        const coincideCedula =
          cedulaCliente &&
          cedulaPago === String(cedulaCliente).trim();

        const coincideClienteId =
          pago.cliente_id &&
          String(pago.cliente_id) === String(clienteId);

        return (
          coincideCuentaId ||
          coincideNumeroCuenta ||
          coincideCedula ||
          coincideClienteId
        );
      });

      setPagos(pagosRelacionados);
    }

    await cargarRecargosRelacionados(
      clienteId,
      cuentaId,
      numeroCuenta,
      cedulaCliente
    );

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

  async function cargarRecargosRelacionados(
    clienteId,
    cuentaId,
    numeroCuenta,
    cedulaCliente
  ) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) return;

    const posiblesTablas = [
      "historial_recargos",
      "recargos",
      "HISTORIAL_RECARGOS",
    ];

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
          recargo.numero_cuenta ||
            recargo.cuenta ||
            recargo.codigo_cuenta ||
            ""
        ).trim();

        const coincideNumeroCuenta =
          numeroCuenta &&
          cuentaRecargo === String(numeroCuenta).trim();

        const cedulaRecargo = String(
          recargo.cliente_cedula ||
            recargo.cedula ||
            recargo.identificacion ||
            ""
        ).trim();

        const coincideCedula =
          cedulaCliente &&
          cedulaRecargo === String(cedulaCliente).trim();

        const coincideClienteId =
          recargo.cliente_id &&
          String(recargo.cliente_id) === String(clienteId);

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
    const nuevaCuenta = cuentas.find(
      (item) => String(item.id) === String(cuentaId)
    );

    if (!nuevaCuenta || !cliente) return;

    setCuenta(nuevaCuenta);
    setFechaPromesa("");
    setMontoPromesa("");
    setObservacionPromesa("");
    setObservacion("");

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
      alert("Seleccione un cliente y una cuenta.");
      return;
    }

    if (!observacion.trim()) {
      alert("Escriba una observación.");
      return;
    }

    if (guardandoGestion) return;

    setGuardandoGestion(true);

    const usuarioActual = obtenerUsuarioActual();
    const fechaRegistro = new Date().toISOString();

    const { error: errorGestion } = await supabase
      .from("bitacora_cliente")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: cliente.id,
          informacion_comercial_id: cuenta.id,
          tipo_gestion: tipoGestion,
          resultado_gestion: resultadoGestion,
          observacion: observacion.trim(),
          descripcion: observacion.trim(),
          usuario: usuarioActual,
          fecha_gestion: fechaRegistro,
          monto_promesa: 0,
        },
      ]);

    if (errorGestion) {
      setGuardandoGestion(false);
      alert("Error guardando gestión: " + errorGestion.message);
      return;
    }

    const {
      data: cobranzaExistente,
      error: errorBuscarCobranza,
    } = await supabase
      .from("informacion_cobranza")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuenta.id)
      .maybeSingle();

    if (errorBuscarCobranza) {
      console.error(
        "La gestión se guardó, pero no se pudo consultar cobranza:",
        errorBuscarCobranza
      );
    } else if (cobranzaExistente?.id) {
      const { error: errorActualizarCobranza } = await supabase
        .from("informacion_cobranza")
        .update({ observacion_cobro: observacion.trim() })
        .eq("empresa_id", empresaId)
        .eq("id", cobranzaExistente.id);

      if (errorActualizarCobranza) {
        console.error(
          "La gestión se guardó, pero no se actualizó observacion_cobro:",
          errorActualizarCobranza
        );
      }
    }

    setObservacion("");

    await cargarDatosRelacionados(
      cliente.id,
      cuenta.id,
      cuenta.numero_cuenta,
      cliente.cedula
    );

    setGuardandoGestion(false);
    alert("Gestión registrada correctamente.");
  }

  async function registrarPromesa() {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida("No existe empresa activa.");
      return;
    }

    if (!cliente || !cuenta) {
      alert("Seleccione un cliente y una cuenta.");
      return;
    }

    if (!fechaPromesa) {
      alert("Seleccione la fecha prometida.");
      return;
    }

    if (!montoPromesa) {
      alert("Ingrese el monto prometido.");
      return;
    }

    const monto = Number(montoPromesa);
    const saldoActual = Number(cuenta.saldo_actual || 0);

    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Ingrese un monto de promesa válido.");
      return;
    }

    if (saldoActual <= 0) {
      alert("Esta cuenta no mantiene saldo pendiente.");
      return;
    }

    if (monto > saldoActual) {
      alert(
        `El monto prometido no puede superar el saldo actual de ${formatoDinero(
          saldoActual
        )}.`
      );
      return;
    }

    const hoyPanama = fechaPanamaISO();

    if (fechaPromesa < hoyPanama) {
      alert(
        "La fecha prometida no puede ser anterior a la fecha actual de Panamá."
      );
      return;
    }

    if (guardandoPromesa) return;

    setGuardandoPromesa(true);

    const usuarioActual = obtenerUsuarioActual();
    const fechaRegistro = new Date().toISOString();

    const textoPromesa = [
      `Promesa de pago para ${formatoFecha(fechaPromesa)}`,
      `por ${formatoDinero(monto)}.`,
      observacionPromesa.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    const { error: errorPromesa } = await supabase
      .from("bitacora_cliente")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: cliente.id,
          informacion_comercial_id: cuenta.id,
          tipo_gestion: "Promesa de Pago",
          resultado_gestion: "Promesa registrada",
          observacion: textoPromesa,
          descripcion: textoPromesa,
          usuario: usuarioActual,
          fecha_gestion: fechaRegistro,
          proxima_gestion: fechaPromesa,
          monto_promesa: monto,
        },
      ]);

    if (errorPromesa) {
      setGuardandoPromesa(false);
      alert(
        "Error registrando promesa de pago: " + errorPromesa.message
      );
      return;
    }

    const {
      data: cobranzaExistente,
      error: errorBuscarCobranza,
    } = await supabase
      .from("informacion_cobranza")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuenta.id)
      .maybeSingle();

    if (errorBuscarCobranza) {
      console.error(
        "La promesa fue guardada, pero no se pudo consultar cobranza:",
        errorBuscarCobranza
      );
    } else if (cobranzaExistente?.id) {
      const { error: errorActualizarCobranza } = await supabase
        .from("informacion_cobranza")
        .update({
          proxima_gestion: fechaPromesa,
          observacion_cobro: textoPromesa,
        })
        .eq("empresa_id", empresaId)
        .eq("id", cobranzaExistente.id);

      if (errorActualizarCobranza) {
        console.error(
          "La promesa fue guardada, pero no se actualizó cobranza:",
          errorActualizarCobranza
        );
      }
    } else {
      const { error: errorCrearCobranza } = await supabase
        .from("informacion_cobranza")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: cliente.id,
            informacion_comercial_id: cuenta.id,
            estado_cobranza: obtenerEstadoCalculado(),
            proxima_gestion: fechaPromesa,
            observacion_cobro: textoPromesa,
            responsable_cobro: null,
          },
        ]);

      if (errorCrearCobranza) {
        console.error(
          "La promesa fue guardada, pero no se pudo crear cobranza:",
          errorCrearCobranza
        );
      }
    }

    setFechaPromesa("");
    setMontoPromesa("");
    setObservacionPromesa("");

    await cargarDatosRelacionados(
      cliente.id,
      cuenta.id,
      cuenta.numero_cuenta,
      cliente.cedula
    );

    setGuardandoPromesa(false);
    alert(
      `Promesa registrada correctamente por ${formatoDinero(monto)}.`
    );
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

    if (subiendoDocumento) return;

    setSubiendoDocumento(true);

    const nombreLimpio = archivo.name.replace(/\s+/g, "_");

    const ruta =
      `empresas/${empresaId}/clientes/` +
      `${cliente.id}/${Date.now()}-${nombreLimpio}`;

    const { error } = await supabase.storage
      .from("documentos-clientes")
      .upload(ruta, archivo);

    if (error) {
      setSubiendoDocumento(false);
      alert("Error subiendo documento: " + error.message);
      return;
    }

    setArchivo(null);
    await cargarDocumentos(cliente.id);
    setSubiendoDocumento(false);
    alert("Documento cargado correctamente.");
  }

  async function verDocumento(nombre) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId || !cliente) return;

    const ruta =
      `empresas/${empresaId}/clientes/` + `${cliente.id}/${nombre}`;

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

    window.open(
      `https://wa.me/507${telefono}?text=${encodeURIComponent(mensaje)}`,
      "_blank"
    );
  }

  const diasAtraso = calcularDiasAtraso(
    cuenta?.fecha_vencimiento,
    cuenta?.saldo_actual
  );

  const semaforo = obtenerSemaforo(diasAtraso);
  const estadoCalculado = obtenerEstadoCalculado();

  if (cargandoSesion) {
    return (
      <div style={styles.cargandoPagina}>
        <div style={styles.cargandoCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={styles.cargandoLogo}
          />
          <strong style={styles.cargandoTitulo}>
            Validando sesión de KONAX
          </strong>
          <p style={styles.cargandoTexto}>
            Cargando información de la empresa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main style={styles.pagina}>
      <div style={styles.contenedor}>
        <header style={styles.encabezado}>
          <div style={styles.encabezadoMarca}>
            <div style={styles.logoPanel}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={styles.logo}
              />
            </div>

            <div>
              <span style={styles.etiqueta}>EXPEDIENTE COMERCIAL</span>
              <h1 style={styles.titulo}>Vista integral del cliente</h1>
              <p style={styles.subtituloVista}>
                {nombreEmpresa()} · consulta, cobranza y seguimiento
              </p>
            </div>
          </div>

          <button onClick={volverDashboard} style={styles.botonDashboard}>
            ← Volver al dashboard
          </button>
        </header>

        <section style={styles.busquedaCard}>
          <div style={styles.busquedaHeader}>
            <div>
              <span style={styles.sectionEyebrow}>BÚSQUEDA INTELIGENTE</span>
              <h2 style={styles.tituloSeccion}>Localizar cliente o cuenta</h2>
              <p style={styles.textoAyuda}>
                Busca por nombre, cédula o número de cuenta.
              </p>
            </div>
          </div>

          <div style={styles.buscadorRow}>
            <input
              placeholder="Nombre, cédula o número de cuenta"
              value={buscar}
              onChange={(event) => setBuscar(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") buscarCliente();
              }}
              style={styles.searchInput}
            />

            <button
              style={
                buscando ? styles.botonDeshabilitado : styles.botonBuscar
              }
              onClick={buscarCliente}
              disabled={buscando}
            >
              {buscando ? "Buscando..." : "Buscar cliente"}
            </button>
          </div>

          {resultados.length > 0 && (
            <div style={styles.resultadosPanel}>
              {resultados.map((item, index) => (
                <button
                  key={item.clave || index}
                  type="button"
                  style={styles.resultadoItem}
                  onClick={() => seleccionarCliente(item)}
                >
                  <div style={styles.resultadoAvatar}>
                    {String(item.cliente.nombre || "C")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div style={styles.resultadoInfo}>
                    <strong>{item.cliente.nombre}</strong>
                    <span>{item.cliente.cedula || "Sin cédula"}</span>
                  </div>

                  <div style={styles.resultadoCuenta}>
                    {item.cuenta?.numero_cuenta || "Ver cuentas"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {cliente && (
          <>
            <section style={styles.clienteHero}>
              <div style={styles.clientePrincipal}>
                <div style={styles.clienteAvatar}>
                  {String(cliente.nombre || "C").charAt(0).toUpperCase()}
                </div>

                <div>
                  <span style={styles.clienteEtiqueta}>
                    CLIENTE SELECCIONADO
                  </span>
                  <h2 style={styles.clienteNombre}>{cliente.nombre}</h2>
                  <p style={styles.clienteMeta}>
                    {cliente.cedula || "Sin identificación"} ·{" "}
                    {cliente.telefono || "Sin teléfono"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                style={styles.whatsappBtn}
                onClick={abrirWhatsAppCliente}
              >
                WhatsApp
              </button>
            </section>

            <section style={styles.kpiGrid}>
              <KPI
                label="Saldo actual"
                value={formatoDinero(cuenta?.saldo_actual)}
                detail={`Monto original ${formatoDinero(
                  cuenta?.monto_total
                )}`}
              />

              <KPI
                label="Estado de cartera"
                value={estadoCalculado}
                detail={`${diasAtraso} días de atraso`}
                color={semaforo}
              />

              <KPI
                label="Último pago"
                value={formatoDinero(cobranza?.monto_ultimo_pago)}
                detail={formatoFecha(cobranza?.fecha_ultimo_pago)}
              />

              <KPI
                label="Próxima gestión"
                value={formatoFecha(cobranza?.proxima_gestion)}
                detail={cobranza?.responsable_cobro || "Sin responsable"}
              />
            </section>

            <section style={styles.resumenLayout}>
              <article style={styles.infoCard}>
                <CardTitle
                  title="Perfil del cliente"
                  subtitle="Datos de contacto y localización"
                />

                <DataRow label="Nombre" value={cliente.nombre} />
                <DataRow label="Cédula" value={cliente.cedula || "-"} />
                <DataRow label="Teléfono" value={cliente.telefono || "-"} />
                <DataRow label="Correo" value={cliente.correo || "-"} />
                <DataRow label="Dirección" value={cliente.direccion || "-"} />
              </article>

              <article style={styles.infoCard}>
                <CardTitle
                  title="Información comercial"
                  subtitle="Cuenta y condiciones vigentes"
                />

                {cuentas.length > 1 && (
                  <select
                    value={cuenta?.id || ""}
                    onChange={(event) => cambiarCuenta(event.target.value)}
                    style={styles.inputStyle}
                  >
                    {cuentas.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.numero_cuenta} - {item.descripcion || "Cuenta"}
                      </option>
                    ))}
                  </select>
                )}

                <DataRow
                  label="Número de cuenta"
                  value={cuenta?.numero_cuenta || "-"}
                />
                <DataRow
                  label="Tipo"
                  value={cuenta?.tipo_producto || "-"}
                />
                <DataRow
                  label="Descripción"
                  value={cuenta?.descripcion || "-"}
                />
                <DataRow
                  label="Modalidad"
                  value={cuenta?.modalidad || "-"}
                />
                <DataRow
                  label="Cuota"
                  value={formatoDinero(cuenta?.cuota)}
                />
              </article>

              <article style={styles.infoCard}>
                <CardTitle
                  title="Cobranza"
                  subtitle="Estado y seguimiento de la cuenta"
                />

                <DataRow
                  label="Estado"
                  value={
                    <span style={styles.estadoInline}>
                      <span
                        style={{
                          ...styles.statusDot,
                          background: semaforo,
                        }}
                      />
                      {estadoCalculado}
                    </span>
                  }
                />
                <DataRow label="Días de atraso" value={diasAtraso} />
                <DataRow
                  label="Último pago"
                  value={formatoFecha(cobranza?.fecha_ultimo_pago)}
                />
                <DataRow
                  label="Responsable"
                  value={cobranza?.responsable_cobro || "-"}
                />
                <DataRow
                  label="Próxima gestión"
                  value={formatoFecha(cobranza?.proxima_gestion)}
                />
              </article>
            </section>

            <section style={styles.actionGrid}>
              <article style={styles.promesaCard}>
                <CardTitle
                  title="Promesa de pago"
                  subtitle="Registra el compromiso de pago del cliente"
                />

                <div style={styles.gridPromesa}>
                  <Campo label="Fecha prometida">
                    <input
                      type="date"
                      min={fechaPanamaISO()}
                      value={fechaPromesa}
                      onChange={(event) =>
                        setFechaPromesa(event.target.value)
                      }
                      style={styles.inputStyle}
                    />
                  </Campo>

                  <Campo label="Monto prometido">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={Number(cuenta?.saldo_actual || 0) || undefined}
                      placeholder="Ej. 300.00"
                      value={montoPromesa}
                      onChange={(event) =>
                        setMontoPromesa(event.target.value)
                      }
                      style={styles.inputStyle}
                    />
                    <small style={styles.textoPequeno}>
                      Saldo disponible:{" "}
                      {formatoDinero(cuenta?.saldo_actual)}
                    </small>
                  </Campo>

                  <Campo label="Observación">
                    <input
                      placeholder="Ej. Pagará por transferencia"
                      value={observacionPromesa}
                      onChange={(event) =>
                        setObservacionPromesa(event.target.value)
                      }
                      style={styles.inputStyle}
                    />
                  </Campo>
                </div>

                <button
                  style={
                    guardandoPromesa
                      ? styles.botonDeshabilitado
                      : styles.botonPromesa
                  }
                  onClick={registrarPromesa}
                  disabled={guardandoPromesa}
                >
                  {guardandoPromesa
                    ? "Registrando promesa..."
                    : "Registrar promesa"}
                </button>
              </article>

              <article style={styles.gestionCard}>
                <CardTitle
                  title="Nueva gestión"
                  subtitle="Registra llamadas, visitas y seguimientos"
                />

                <div style={styles.gridFormulario}>
                  <select
                    value={tipoGestion}
                    onChange={(event) =>
                      setTipoGestion(event.target.value)
                    }
                    style={styles.inputStyle}
                  >
                    <option>Llamada</option>
                    <option>WhatsApp</option>
                    <option>Visita</option>
                    <option>Correo</option>
                    <option>Seguimiento</option>
                  </select>

                  <select
                    value={resultadoGestion}
                    onChange={(event) =>
                      setResultadoGestion(event.target.value)
                    }
                    style={styles.inputStyle}
                  >
                    <option>Pendiente</option>
                    <option>Contestó</option>
                    <option>No contestó</option>
                    <option>Pago Realizado</option>
                    <option>Reprogramar</option>
                  </select>
                </div>

                <textarea
                  placeholder="Agregar nueva observación..."
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  style={styles.textarea}
                />

                <button
                  style={
                    guardandoGestion
                      ? styles.botonDeshabilitado
                      : styles.botonPrincipal
                  }
                  onClick={guardarGestion}
                  disabled={guardandoGestion}
                >
                  {guardandoGestion
                    ? "Guardando..."
                    : "Guardar observación"}
                </button>
              </article>
            </section>

            <section style={styles.card}>
              <CardTitle
                title="Historial de pagos"
                subtitle="Movimientos procesados para la cuenta seleccionada"
              />

              <div style={styles.tablaScroll}>
                <table style={styles.tabla}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Monto</th>
                      <th style={styles.th}>Método</th>
                      <th style={styles.th}>Observación</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagos.map((pago) => (
                      <tr key={pago.id}>
                        <td style={styles.td}>
                          {formatoFecha(
                            pago.fecha_pago || pago.created_at
                          )}
                        </td>
                        <td style={styles.tdMonto}>
                          {formatoDinero(pago.monto)}
                        </td>
                        <td style={styles.td}>
                          {pago.metodo_pago || pago.metodo || "-"}
                        </td>
                        <td style={styles.td}>
                          {pago.descripcion || pago.observacion || "-"}
                        </td>
                      </tr>
                    ))}

                    {pagos.length === 0 && (
                      <tr>
                        <td style={styles.sinDatos} colSpan="4">
                          No hay pagos registrados para esta cuenta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={styles.timelineCard}>
              <CardTitle
                title="Historial de gestiones"
                subtitle="Seguimiento cronológico de la cuenta"
              />

              <div style={styles.timeline}>
                {gestiones.map((item) => {
                  const esPromesa =
                    limpiarTexto(item.tipo_gestion) ===
                      "promesa de pago" ||
                    limpiarTexto(item.resultado_gestion) ===
                      "promesa registrada";

                  return (
                    <div key={item.id} style={styles.timelineItem}>
                      <div
                        style={{
                          ...styles.timelineDot,
                          background: esPromesa ? "#16834f" : "#64748b",
                        }}
                      />

                      <div
                        style={{
                          ...styles.timelineContent,
                          ...(esPromesa
                            ? styles.timelinePromesa
                            : styles.timelineNormal),
                        }}
                      >
                        <div style={styles.gestionCabecera}>
                          <div>
                            <strong style={styles.gestionFecha}>
                              {formatoFechaHora(
                                item.fecha_gestion || item.created_at
                              )}
                            </strong>
                            <span style={styles.gestionUsuario}>
                              {item.usuario || "Sin usuario"}
                            </span>
                          </div>

                          {esPromesa && (
                            <span style={styles.badgePromesa}>
                              Promesa
                            </span>
                          )}
                        </div>

                        <p style={styles.gestionTipo}>
                          {item.tipo_gestion || "-"} ·{" "}
                          {item.resultado_gestion || "-"}
                        </p>

                        <p style={styles.gestionTexto}>
                          {item.observacion ||
                            item.descripcion ||
                            "-"}
                        </p>

                        {Number(item.monto_promesa || 0) > 0 && (
                          <div style={styles.promesaDatos}>
                            <span>
                              Monto:{" "}
                              {formatoDinero(item.monto_promesa)}
                            </span>
                            {item.proxima_gestion && (
                              <span>
                                Fecha:{" "}
                                {formatoFecha(item.proxima_gestion)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {gestiones.length === 0 && (
                  <div style={styles.sinDatos}>
                    No hay gestiones registradas para esta cuenta.
                  </div>
                )}
              </div>
            </section>

            <section style={styles.card}>
              <CardTitle
                title="Expediente digital"
                subtitle="Documentos asociados al cliente"
              />

              <div style={styles.documentUpload}>
                <label style={styles.fileBox}>
                  <div>
                    <strong style={styles.fileTitle}>
                      Seleccionar documento
                    </strong>
                    <span style={styles.fileText}>
                      PDF, imagen u otro archivo del expediente.
                    </span>
                  </div>

                  <input
                    type="file"
                    onChange={(event) =>
                      setArchivo(event.target.files?.[0] || null)
                    }
                    style={styles.fileInput}
                  />
                </label>

                <button
                  style={
                    subiendoDocumento
                      ? styles.botonDeshabilitado
                      : styles.botonPrincipal
                  }
                  onClick={subirDocumento}
                  disabled={subiendoDocumento}
                >
                  {subiendoDocumento
                    ? "Subiendo..."
                    : "Subir documento"}
                </button>
              </div>

              {archivo && (
                <div style={styles.archivoSeleccionado}>
                  Archivo seleccionado: {archivo.name}
                </div>
              )}

              <div style={styles.documentGrid}>
                {documentos.map((documento) => (
                  <button
                    type="button"
                    key={documento.name}
                    style={styles.documentCard}
                    onClick={() => verDocumento(documento.name)}
                  >
                    <div style={styles.documentName}>
                      {documento.name}
                    </div>
                    <span style={styles.documentAction}>Ver archivo</span>
                  </button>
                ))}

                {documentos.length === 0 && (
                  <div style={styles.sinDatos}>
                    No hay documentos cargados.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Campo({ label, children }) {
  return (
    <div style={styles.campo}>
      <label style={styles.labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function KPI({ label, value, detail, color }) {
  return (
    <article style={styles.kpiCard}>
      <div style={styles.kpiAccent}>
        <span
          style={{
            ...styles.statusDot,
            background: color || "#16834f",
          }}
        />
      </div>

      <div>
        <span style={styles.kpiLabel}>{label}</span>
        <strong style={styles.kpiValue}>{value}</strong>
        <span style={styles.kpiDetail}>{detail}</span>
      </div>
    </article>
  );
}

function CardTitle({ title, subtitle }) {
  return (
    <div style={styles.cardTitleRow}>
      <div style={styles.cardTitleAccent}></div>

      <div>
        <h3 style={styles.cardTitle}>{title}</h3>
        <p style={styles.cardSubtitle}>{subtitle}</p>
      </div>
    </div>
  );
}

function DataRow({ label, value }) {
  return (
    <div style={styles.dataRow}>
      <span style={styles.dataLabel}>{label}</span>
      <strong style={styles.dataValue}>{value}</strong>
    </div>
  );
}

const styles = {
  pagina: {
    minHeight: "100vh",
    padding: "30px",
    background:
      "radial-gradient(circle at top right, rgba(22,131,79,.10), transparent 30%), #f3f6f4",
    color: "#152019",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  contenedor: {
    maxWidth: 1450,
    margin: "0 auto",
  },
  cargandoPagina: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "#f3f6f4",
  },
  cargandoCard: {
    width: "100%",
    maxWidth: 420,
    padding: "34px 30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    border: "1px solid #dce5df",
    borderRadius: 24,
    background: "#ffffff",
    boxShadow: "0 24px 60px rgba(15,23,42,.10)",
    textAlign: "center",
  },
  cargandoLogo: {
    width: 240,
    maxWidth: "100%",
    marginBottom: 18,
    objectFit: "contain",
  },
  cargandoTitulo: {
    fontSize: 22,
  },
  cargandoTexto: {
    margin: "8px 0 0",
    color: "#6f7b73",
    fontSize: 14,
  },
  encabezado: {
    marginBottom: 20,
    padding: "28px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
    borderRadius: 26,
    background:
      "linear-gradient(135deg, #09120d 0%, #123b25 62%, #17673e 100%)",
    boxShadow: "0 24px 56px rgba(11,48,29,.18)",
  },
  encabezadoMarca: {
    display: "flex",
    alignItems: "center",
    gap: 22,
  },
  logoPanel: {
    width: 230,
    minWidth: 230,
    height: 94,
    padding: 10,
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 14px 30px rgba(0,0,0,.20)",
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  etiqueta: {
    display: "block",
    marginBottom: 7,
    color: "#7ce1aa",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.45,
  },
  titulo: {
    margin: "0 0 8px",
    color: "#ffffff",
    fontSize: "clamp(30px,4vw,46px)",
    lineHeight: 1.05,
  },
  subtituloVista: {
    margin: 0,
    color: "#d1e5d8",
    fontSize: 14,
  },
  botonDashboard: {
    minHeight: 45,
    padding: "10px 16px",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 12,
    background: "rgba(255,255,255,.08)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
  busquedaCard: {
    marginBottom: 18,
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 21,
    background: "#ffffff",
    boxShadow: "0 12px 34px rgba(15,23,42,.055)",
  },
  busquedaHeader: {
    marginBottom: 17,
  },
  sectionEyebrow: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.2,
  },
  tituloSeccion: {
    margin: "0 0 5px",
    fontSize: 23,
  },
  textoAyuda: {
    margin: 0,
    color: "#758078",
    fontSize: 13,
  },
  buscadorRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: 11,
  },
  searchInput: {
    width: "100%",
    minHeight: 48,
    padding: "0 14px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 12,
    outline: "none",
    fontSize: 14,
  },
  botonBuscar: {
    minHeight: 48,
    padding: "10px 20px",
    border: "none",
    borderRadius: 12,
    background: "#16834f",
    color: "#ffffff",
    fontWeight: 850,
    cursor: "pointer",
  },
  botonDeshabilitado: {
    minHeight: 45,
    padding: "10px 18px",
    border: "none",
    borderRadius: 11,
    background: "#a3ada7",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "not-allowed",
  },
  resultadosPanel: {
    marginTop: 14,
    display: "grid",
    gap: 8,
  },
  resultadoItem: {
    minHeight: 66,
    display: "grid",
    gridTemplateColumns: "42px 1fr auto",
    alignItems: "center",
    gap: 12,
    padding: 12,
    border: "1px solid #dfe7e2",
    borderRadius: 14,
    background: "#fbfdfc",
    color: "#152019",
    textAlign: "left",
    cursor: "pointer",
  },
  resultadoAvatar: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#eaf7ef",
    color: "#16834f",
    fontWeight: 900,
  },
  resultadoInfo: {
    display: "grid",
    gap: 3,
    fontSize: 13,
  },
  resultadoCuenta: {
    color: "#627067",
    fontSize: 12,
    fontWeight: 750,
  },
  clienteHero: {
    marginBottom: 15,
    padding: 19,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 10px 28px rgba(15,23,42,.05)",
  },
  clientePrincipal: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  clienteAvatar: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background: "#173c2a",
    color: "#ffffff",
    fontSize: 22,
    fontWeight: 900,
  },
  clienteEtiqueta: {
    display: "block",
    marginBottom: 4,
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },
  clienteNombre: {
    margin: "0 0 5px",
    fontSize: 25,
  },
  clienteMeta: {
    margin: 0,
    color: "#758078",
    fontSize: 12,
  },
  whatsappBtn: {
    minHeight: 44,
    padding: "10px 16px",
    border: "none",
    borderRadius: 11,
    background: "#1faa59",
    color: "#ffffff",
    fontWeight: 850,
    cursor: "pointer",
  },
  kpiGrid: {
    marginBottom: 15,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 13,
  },
  kpiCard: {
    minHeight: 112,
    padding: 17,
    display: "grid",
    gridTemplateColumns: "12px 1fr",
    gap: 13,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 10px 28px rgba(15,23,42,.045)",
  },
  kpiAccent: {
    paddingTop: 4,
  },
  kpiLabel: {
    display: "block",
    marginBottom: 5,
    color: "#6f7b73",
    fontSize: 11,
    fontWeight: 800,
  },
  kpiValue: {
    display: "block",
    marginBottom: 6,
    fontSize: 21,
  },
  kpiDetail: {
    color: "#87928b",
    fontSize: 10,
  },
  statusDot: {
    width: 9,
    height: 9,
    display: "inline-block",
    borderRadius: "50%",
  },
  resumenLayout: {
    marginBottom: 15,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(285px,1fr))",
    gap: 13,
  },
  infoCard: {
    padding: 21,
    border: "1px solid #dfe7e2",
    borderRadius: 19,
    background: "#ffffff",
    boxShadow: "0 10px 28px rgba(15,23,42,.045)",
  },
  card: {
    marginBottom: 15,
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 12px 34px rgba(15,23,42,.05)",
  },
  cardTitleRow: {
    marginBottom: 18,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  cardTitleAccent: {
    width: 6,
    height: 44,
    borderRadius: 99,
    background: "#16834f",
  },
  cardTitle: {
    margin: "0 0 4px",
    fontSize: 20,
  },
  cardSubtitle: {
    margin: 0,
    color: "#77837b",
    fontSize: 11,
  },
  dataRow: {
    padding: "10px 0",
    display: "flex",
    justifyContent: "space-between",
    gap: 15,
    borderBottom: "1px solid #edf1ee",
  },
  dataLabel: {
    color: "#78847c",
    fontSize: 12,
  },
  dataValue: {
    maxWidth: "60%",
    fontSize: 12,
    textAlign: "right",
  },
  estadoInline: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },
  actionGrid: {
    marginBottom: 15,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(390px,1fr))",
    gap: 14,
  },
  promesaCard: {
    padding: 22,
    border: "1px solid #a7d9bb",
    borderRadius: 20,
    background: "linear-gradient(135deg,#fff,#f1fbf5)",
  },
  gestionCard: {
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background: "#ffffff",
  },
  gridPromesa: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
  },
  gridFormulario: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
  },
  campo: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  labelStyle: {
    color: "#435047",
    fontSize: 11,
    fontWeight: 800,
  },
  inputStyle: {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    outline: "none",
    background: "#ffffff",
    fontSize: 13,
  },
  textoPequeno: {
    color: "#77837b",
    fontSize: 10,
  },
  textarea: {
    width: "100%",
    minHeight: 92,
    marginTop: 12,
    padding: 12,
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: 13,
  },
  botonPromesa: {
    minHeight: 44,
    marginTop: 14,
    padding: "10px 17px",
    border: "none",
    borderRadius: 11,
    background: "#0f7a49",
    color: "#ffffff",
    fontWeight: 850,
    cursor: "pointer",
  },
  botonPrincipal: {
    minHeight: 44,
    marginTop: 12,
    padding: "10px 17px",
    border: "none",
    borderRadius: 11,
    background: "#16834f",
    color: "#ffffff",
    fontWeight: 850,
    cursor: "pointer",
  },
  tablaScroll: {
    overflowX: "auto",
  },
  tabla: {
    width: "100%",
    minWidth: 720,
    borderCollapse: "collapse",
  },
  th: {
    padding: "11px 12px",
    borderBottom: "1px solid #dce5df",
    background: "#f6f9f7",
    color: "#536058",
    fontSize: 10,
    textAlign: "left",
    textTransform: "uppercase",
  },
  td: {
    padding: "13px 12px",
    borderBottom: "1px solid #edf1ee",
    color: "#435047",
    fontSize: 12,
  },
  tdMonto: {
    padding: "13px 12px",
    borderBottom: "1px solid #edf1ee",
    fontSize: 12,
    fontWeight: 850,
  },
  sinDatos: {
    padding: "28px 12px",
    color: "#7c8880",
    fontSize: 12,
    textAlign: "center",
  },
  timelineCard: {
    marginBottom: 15,
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background: "#ffffff",
  },
  timeline: {
    display: "grid",
    gap: 12,
  },
  timelineItem: {
    display: "grid",
    gridTemplateColumns: "18px 1fr",
    gap: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    marginTop: 16,
    borderRadius: "50%",
  },
  timelineContent: {
    padding: 15,
    borderRadius: 15,
  },
  timelineNormal: {
    border: "1px solid #e0e7e2",
    background: "#fafcfb",
  },
  timelinePromesa: {
    border: "1px solid #b9dfc8",
    background: "#f1fbf5",
  },
  gestionCabecera: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  gestionFecha: {
    display: "block",
    fontSize: 12,
  },
  gestionUsuario: {
    display: "block",
    marginTop: 3,
    color: "#7d8981",
    fontSize: 10,
  },
  badgePromesa: {
    padding: "5px 9px",
    borderRadius: 999,
    background: "#d9f3e3",
    color: "#14683e",
    fontSize: 9,
    fontWeight: 900,
  },
  gestionTipo: {
    margin: "11px 0 6px",
    color: "#16834f",
    fontSize: 11,
    fontWeight: 800,
  },
  gestionTexto: {
    margin: 0,
    color: "#4c5951",
    fontSize: 12,
  },
  promesaDatos: {
    marginTop: 10,
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    color: "#17623c",
    fontSize: 10,
    fontWeight: 800,
  },
  documentUpload: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: 11,
  },
  fileBox: {
    minHeight: 72,
    padding: 14,
    display: "grid",
    alignItems: "center",
    border: "1px dashed #9fc9b1",
    borderRadius: 14,
    background: "#f5fbf7",
    cursor: "pointer",
  },
  fileTitle: {
    display: "block",
    fontSize: 12,
  },
  fileText: {
    display: "block",
    marginTop: 3,
    color: "#708078",
    fontSize: 10,
  },
  fileInput: {
    display: "none",
  },
  archivoSeleccionado: {
    marginTop: 9,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 800,
  },
  documentGrid: {
    marginTop: 15,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
    gap: 10,
  },
  documentCard: {
    minHeight: 80,
    padding: 13,
    display: "grid",
    gap: 6,
    border: "1px solid #dfe7e2",
    borderRadius: 14,
    background: "#fbfdfc",
    textAlign: "left",
    cursor: "pointer",
  },
  documentName: {
    overflow: "hidden",
    fontSize: 11,
    fontWeight: 800,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  documentAction: {
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
  },
};
