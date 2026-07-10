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
  const [resultadoGestion, setResultadoGestion] =
    useState("Pendiente");
  const [observacion, setObservacion] = useState("");

  const [fechaPromesa, setFechaPromesa] = useState("");
  const [montoPromesa, setMontoPromesa] = useState("");
  const [observacionPromesa, setObservacionPromesa] =
    useState("");

  const [archivo, setArchivo] = useState(null);

  const [cargandoSesion, setCargandoSesion] =
    useState(true);
  const [buscando, setBuscando] = useState(false);
  const [guardandoGestion, setGuardandoGestion] =
    useState(false);
  const [guardandoPromesa, setGuardandoPromesa] =
    useState(false);
  const [subiendoDocumento, setSubiendoDocumento] =
    useState(false);

  useEffect(() => {
    iniciarVistaCliente();
  }, []);

  async function iniciarVistaCliente() {
    const sesionValida = await validarSesionActual();

    if (!sesionValida) return;

    const busquedaGuardada = localStorage.getItem(
      "busquedaVistaCliente"
    );

    if (busquedaGuardada) {
      setBuscar(busquedaGuardada);

      localStorage.removeItem(
        "busquedaVistaCliente"
      );

      await buscarClienteAutomatico(
        busquedaGuardada
      );
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
    return (
      localStorage.getItem("usuarioId") ||
      ""
    );
  }

  function cerrarSesionInvalida(mensaje) {
    if (mensaje) {
      alert(mensaje);
    }

    localStorage.clear();
    window.location.replace("/login");
  }

  /*
    ============================================================
    FECHA LOCAL DE PANAMÁ
    ============================================================

    Esta función devuelve la fecha real de Panamá en formato:

    YYYY-MM-DD

    Se utiliza para validar la fecha prometida.
  */

  function fechaPanamaISO() {
    const partes = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "America/Panama",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(new Date());

    const year =
      partes.find(
        (parte) => parte.type === "year"
      )?.value || "";

    const month =
      partes.find(
        (parte) => parte.type === "month"
      )?.value || "";

    const day =
      partes.find(
        (parte) => parte.type === "day"
      )?.value || "";

    return `${year}-${month}-${day}`;
  }

  /*
    ============================================================
    FORMATO DE FECHA
    ============================================================

    Si recibe solamente YYYY-MM-DD, respeta esa fecha.

    Si recibe un timestamp completo, lo convierte a la zona
    horaria de Panamá antes de mostrarlo.
  */

  function formatoFecha(fecha) {
    if (!fecha) {
      return "-";
    }

    const texto = String(fecha).trim();

    const esFechaSimple =
      /^\d{4}-\d{2}-\d{2}$/.test(texto);

    if (esFechaSimple) {
      const [year, month, day] =
        texto.split("-");

      return `${day}/${month}/${year}`;
    }

    const fechaObjeto = new Date(texto);

    if (
      Number.isNaN(
        fechaObjeto.getTime()
      )
    ) {
      return texto;
    }

    return new Intl.DateTimeFormat(
      "es-PA",
      {
        timeZone: "America/Panama",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(fechaObjeto);
  }

  function formatoFechaHora(fecha) {
    if (!fecha) {
      return "-";
    }

    const fechaObjeto = new Date(fecha);

    if (
      Number.isNaN(
        fechaObjeto.getTime()
      )
    ) {
      return formatoFecha(fecha);
    }

    return new Intl.DateTimeFormat(
      "es-PA",
      {
        timeZone: "America/Panama",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    ).format(fechaObjeto);
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

    const {
      data: usuario,
      error: errorUsuario,
    } = await supabase
      .from("usuarios")
      .select(
        "id, empresa_id, nombre, correo, rol, estado"
      )
      .eq("id", usuarioId)
      .maybeSingle();

    if (errorUsuario) {
      cerrarSesionInvalida(
        "Error verificando la sesión: " +
          errorUsuario.message
      );

      return false;
    }

    if (!usuario) {
      cerrarSesionInvalida(
        "El usuario de la sesión ya no existe."
      );

      return false;
    }

    if (
      String(usuario.estado || "")
        .toLowerCase()
        .trim() !== "activo"
    ) {
      cerrarSesionInvalida(
        "Este usuario se encuentra inactivo."
      );

      return false;
    }

    if (
      String(usuario.empresa_id) !==
      String(empresaId)
    ) {
      cerrarSesionInvalida(
        "La sesión no corresponde a la empresa activa."
      );

      return false;
    }

    const {
      data: empresaData,
      error: errorEmpresa,
    } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      cerrarSesionInvalida(
        "Error verificando la empresa: " +
          errorEmpresa.message
      );

      return false;
    }

    if (!empresaData) {
      cerrarSesionInvalida(
        "La empresa de la sesión no existe."
      );

      return false;
    }

    const empresaSuspendida =
      String(empresaData.estado || "")
        .toLowerCase()
        .trim() === "suspendido";

    const planSuspendido =
      String(empresaData.estado_plan || "")
        .toLowerCase()
        .trim() === "suspendido";

    if (
      empresaSuspendida ||
      planSuspendido
    ) {
      cerrarSesionInvalida(
        "El servicio de esta empresa está suspendido."
      );

      return false;
    }

    localStorage.setItem(
      "empresaId",
      String(empresaData.id)
    );

    localStorage.setItem(
      "empresa_id",
      String(empresaData.id)
    );

    localStorage.setItem(
      "usuarioId",
      String(usuario.id)
    );

    localStorage.setItem(
      "usuarioNombre",
      usuario.nombre || ""
    );

    localStorage.setItem(
      "nombreUsuario",
      usuario.nombre || ""
    );

    localStorage.setItem(
      "usuarioRol",
      usuario.rol || ""
    );

    localStorage.setItem(
      "rolUsuario",
      usuario.rol || ""
    );

    localStorage.setItem(
      "empresaNombre",
      empresaData.nombre || ""
    );

    setEmpresa(empresaData);
    setCargandoSesion(false);

    return true;
  }

  function volverDashboard() {
    window.location.assign(
      "/dashboard"
    );
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
      localStorage.getItem(
        "usuarioNombre"
      ) ||
      localStorage.getItem(
        "nombreUsuario"
      ) ||
      "";

    const rol =
      localStorage.getItem(
        "usuarioRol"
      ) ||
      localStorage.getItem(
        "rolUsuario"
      ) ||
      "";

    if (nombre && rol) {
      return `${nombre} (${rol})`;
    }

    if (nombre) {
      return nombre;
    }

    if (rol) {
      return rol;
    }

    return "Usuario";
  }

  function limpiarTexto(texto) {
    return String(texto || "")
      .toLowerCase()
      .trim();
  }

  function formatoDinero(valor) {
    return (
      "$" +
      Number(valor || 0).toLocaleString(
        "es-PA",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )
    );
  }

  function calcularDiasAtraso(
    fechaVencimiento,
    saldoActual
  ) {
    if (
      !fechaVencimiento ||
      Number(saldoActual || 0) <= 0
    ) {
      return 0;
    }

    const hoy = new Date(
      `${fechaPanamaISO()}T00:00:00`
    );

    const textoVencimiento = String(
      fechaVencimiento
    ).slice(0, 10);

    const vencimiento = new Date(
      `${textoVencimiento}T00:00:00`
    );

    const diferencia =
      hoy.getTime() -
      vencimiento.getTime();

    if (diferencia <= 0) {
      return 0;
    }

    return Math.floor(
      diferencia /
        (1000 * 60 * 60 * 24)
    );
  }

  function obtenerEstadoCalculado() {
    if (!cuenta) {
      return "-";
    }

    if (
      Number(
        cuenta.saldo_actual || 0
      ) <= 0
    ) {
      return "Cancelado";
    }

    const estadoCobranza =
      limpiarTexto(
        cobranza?.estado_cobranza
      );

    const estadoComercial =
      limpiarTexto(
        cuenta?.estado
      );

    if (
      estadoCobranza === "legal" ||
      estadoComercial === "legal"
    ) {
      return "Legal";
    }

    if (
      estadoCobranza === "suspendido" ||
      estadoComercial === "suspendido"
    ) {
      return "Suspendido";
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

  function pagoEsValido(pago) {
    const tipo = limpiarTexto(
      pago?.tipo
    );

    const estado = limpiarTexto(
      pago?.estado
    );

    if (
      estado &&
      estado !== "procesado" &&
      estado !== "activo"
    ) {
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

  async function buscarClienteAutomatico(
    valorBusqueda
  ) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida(
        "No existe una empresa activa en la sesión."
      );

      return;
    }

    const texto = String(
      valorBusqueda || ""
    ).trim();

    if (texto.length < 3) {
      alert(
        "Ingrese al menos 3 caracteres para buscar."
      );

      return;
    }

    if (buscando) {
      return;
    }

    setBuscando(true);

    let encontrados = [];

    const {
      data: clientesData,
      error: errorClientes,
    } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(
        `nombre.ilike.%${texto}%,cedula.ilike.%${texto}%`
      );

    if (errorClientes) {
      setBuscando(false);

      alert(
        "Error buscando cliente: " +
          errorClientes.message
      );

      return;
    }

    if (clientesData) {
      encontrados = clientesData.map(
        (clienteEncontrado) => ({
          cliente:
            clienteEncontrado,
          cuenta: null,
        })
      );
    }

    const {
      data: cuentasData,
      error: errorCuentas,
    } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .ilike(
        "numero_cuenta",
        `%${texto}%`
      );

    if (errorCuentas) {
      setBuscando(false);

      alert(
        "Error buscando cuenta: " +
          errorCuentas.message
      );

      return;
    }

    if (
      cuentasData &&
      cuentasData.length > 0
    ) {
      const ids = [
        ...new Set(
          cuentasData
            .map(
              (item) =>
                item.cliente_id
            )
            .filter(Boolean)
        ),
      ];

      if (ids.length > 0) {
        const {
          data: clientesDeCuentas,
          error:
            errorClientesCuentas,
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

        cuentasData.forEach(
          (cuentaEncontrada) => {
            const clienteEncontrado =
              clientesDeCuentas?.find(
                (item) =>
                  String(item.id) ===
                  String(
                    cuentaEncontrada.cliente_id
                  )
              );

            if (clienteEncontrado) {
              encontrados.push({
                cliente:
                  clienteEncontrado,

                cuenta:
                  cuentaEncontrada,
              });
            }
          }
        );
      }
    }

    const unicos = [];

    encontrados.forEach((item) => {
      const clave =
        `${item.cliente?.id || ""}-` +
        `${item.cuenta?.id || "cliente"}`;

      if (
        !unicos.some(
          (registro) =>
            registro.clave === clave
        )
      ) {
        unicos.push({
          clave,
          ...item,
        });
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

      alert(
        "No se encontraron resultados."
      );

      return;
    }

    if (unicos.length === 1) {
      await seleccionarCliente(
        unicos[0]
      );

      return;
    }

    setResultados(unicos);
  }

  async function buscarCliente() {
    await buscarClienteAutomatico(
      buscar
    );
  }

  async function seleccionarCliente(
    resultado
  ) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida(
        "No existe una empresa activa en la sesión."
      );

      return;
    }

    const clienteBase =
      resultado.cliente;

    if (
      String(
        clienteBase.empresa_id
      ) !== String(empresaId)
    ) {
      alert(
        "Este cliente no pertenece a la empresa activa."
      );

      return;
    }

    setCliente(clienteBase);
    setResultados([]);
    setBuscar(
      clienteBase.nombre || ""
    );

    const {
      data: cuentasData,
      error,
    } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq(
        "cliente_id",
        clienteBase.id
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      alert(
        "Error cargando cuentas: " +
          error.message
      );

      return;
    }

    const cuentaSeleccionada =
      resultado.cuenta ||
      cuentasData?.[0] ||
      null;

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

    await cargarDocumentos(
      clienteBase.id
    );
  }

  async function cargarDatosRelacionados(
    clienteId,
    cuentaId,
    numeroCuenta,
    cedulaCliente
  ) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId || !cuentaId) {
      return;
    }

    const {
      data: cobranzaData,
      error: errorCobranza,
    } = await supabase
      .from("informacion_cobranza")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq(
        "informacion_comercial_id",
        cuentaId
      )
      .maybeSingle();

    if (errorCobranza) {
      console.error(
        "Error cargando cobranza:",
        errorCobranza
      );
    }

    setCobranza(
      cobranzaData || null
    );

    const {
      data: pagosData,
      error: errorPagos,
    } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", {
        ascending: false,
      });

    if (errorPagos) {
      console.error(
        "Error cargando pagos:",
        errorPagos
      );

      setPagos([]);
    } else {
      const pagosRelacionados = (
        pagosData || []
      ).filter((pago) => {
        if (!pagoEsValido(pago)) {
          return false;
        }

        const coincideCuentaId =
          pago.informacion_comercial_id &&
          String(
            pago.informacion_comercial_id
          ) === String(cuentaId);

        const cuentaPago = String(
          pago.numero_cuenta ||
            pago.cuenta ||
            pago.codigo_cuenta ||
            ""
        ).trim();

        const coincideNumeroCuenta =
          numeroCuenta &&
          cuentaPago ===
            String(
              numeroCuenta
            ).trim();

        const cedulaPago = String(
          pago.cliente_cedula ||
            pago.cedula ||
            pago.identificacion ||
            ""
        ).trim();

        const coincideCedula =
          cedulaCliente &&
          cedulaPago ===
            String(
              cedulaCliente
            ).trim();

        const coincideClienteId =
          pago.cliente_id &&
          String(
            pago.cliente_id
          ) === String(clienteId);

        return (
          coincideCuentaId ||
          coincideNumeroCuenta ||
          coincideCedula ||
          coincideClienteId
        );
      });

      setPagos(
        pagosRelacionados
      );
    }

    await cargarRecargosRelacionados(
      clienteId,
      cuentaId,
      numeroCuenta,
      cedulaCliente
    );

    const {
      data: gestionesData,
      error: errorGestiones,
    } = await supabase
      .from("bitacora_cliente")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq(
        "cliente_id",
        clienteId
      )
      .eq(
        "informacion_comercial_id",
        cuentaId
      )
      .order("fecha_gestion", {
        ascending: false,
      });

    if (errorGestiones) {
      console.error(
        "Error cargando gestiones:",
        errorGestiones
      );

      setGestiones([]);
    } else {
      setGestiones(
        gestionesData || []
      );
    }
  }

  async function cargarRecargosRelacionados(
    clienteId,
    cuentaId,
    numeroCuenta,
    cedulaCliente
  ) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      return;
    }

    const posiblesTablas = [
      "historial_recargos",
      "recargos",
      "HISTORIAL_RECARGOS",
    ];

    for (
      const tablaRecargos of posiblesTablas
    ) {
      const {
        data,
        error,
      } = await supabase
        .from(tablaRecargos)
        .select("*")
        .eq(
          "empresa_id",
          empresaId
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        continue;
      }

      const relacionados = (
        data || []
      ).filter((recargo) => {
        const coincideCuentaId =
          recargo.informacion_comercial_id &&
          String(
            recargo.informacion_comercial_id
          ) === String(cuentaId);

        const cuentaRecargo =
          String(
            recargo.numero_cuenta ||
              recargo.cuenta ||
              recargo.codigo_cuenta ||
              ""
          ).trim();

        const coincideNumeroCuenta =
          numeroCuenta &&
          cuentaRecargo ===
            String(
              numeroCuenta
            ).trim();

        const cedulaRecargo =
          String(
            recargo.cliente_cedula ||
              recargo.cedula ||
              recargo.identificacion ||
              ""
          ).trim();

        const coincideCedula =
          cedulaCliente &&
          cedulaRecargo ===
            String(
              cedulaCliente
            ).trim();

        const coincideClienteId =
          recargo.cliente_id &&
          String(
            recargo.cliente_id
          ) === String(clienteId);

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

  async function cambiarCuenta(
    cuentaId
  ) {
    const nuevaCuenta =
      cuentas.find(
        (item) =>
          String(item.id) ===
          String(cuentaId)
      );

    if (
      !nuevaCuenta ||
      !cliente
    ) {
      return;
    }

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

  /*
    ============================================================
    GUARDAR GESTIÓN NORMAL
    ============================================================

    No utiliza columnas inexistentes en informacion_cobranza.
  */

  async function guardarGestion() {
    const empresaId =
      obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida(
        "No existe empresa activa."
      );

      return;
    }

    if (!cliente || !cuenta) {
      alert(
        "Seleccione un cliente y una cuenta."
      );

      return;
    }

    if (!observacion.trim()) {
      alert(
        "Escriba una observación."
      );

      return;
    }

    if (guardandoGestion) {
      return;
    }

    setGuardandoGestion(true);

    const usuarioActual =
      obtenerUsuarioActual();

    const fechaRegistro =
      new Date().toISOString();

    const {
      error: errorGestion,
    } = await supabase
      .from("bitacora_cliente")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: cliente.id,

          informacion_comercial_id:
            cuenta.id,

          tipo_gestion:
            tipoGestion,

          resultado_gestion:
            resultadoGestion,

          observacion:
            observacion.trim(),

          descripcion:
            observacion.trim(),

          usuario:
            usuarioActual,

          fecha_gestion:
            fechaRegistro,

          monto_promesa: 0,
        },
      ]);

    if (errorGestion) {
      setGuardandoGestion(false);

      alert(
        "Error guardando gestión: " +
          errorGestion.message
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
      .eq(
        "informacion_comercial_id",
        cuenta.id
      )
      .maybeSingle();

    if (errorBuscarCobranza) {
      console.error(
        "La gestión se guardó, pero no se pudo consultar cobranza:",
        errorBuscarCobranza
      );
    } else if (
      cobranzaExistente?.id
    ) {
      const {
        error: errorActualizarCobranza,
      } = await supabase
        .from(
          "informacion_cobranza"
        )
        .update({
          observacion_cobro:
            observacion.trim(),
        })
        .eq("empresa_id", empresaId)
        .eq(
          "id",
          cobranzaExistente.id
        );

      if (
        errorActualizarCobranza
      ) {
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

    alert(
      "Gestión registrada correctamente."
    );
  }

  /*
    ============================================================
    REGISTRAR PROMESA
    ============================================================

    Guarda:

    bitacora_cliente.monto_promesa
    bitacora_cliente.proxima_gestion

    En informacion_cobranza solamente actualiza:

    proxima_gestion
    observacion_cobro
  */

  async function registrarPromesa() {
    const empresaId =
      obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida(
        "No existe empresa activa."
      );

      return;
    }

    if (!cliente || !cuenta) {
      alert(
        "Seleccione un cliente y una cuenta."
      );

      return;
    }

    if (!fechaPromesa) {
      alert(
        "Seleccione la fecha prometida."
      );

      return;
    }

    if (!montoPromesa) {
      alert(
        "Ingrese el monto prometido."
      );

      return;
    }

    const monto =
      Number(montoPromesa);

    const saldoActual =
      Number(
        cuenta.saldo_actual || 0
      );

    if (
      !Number.isFinite(monto) ||
      monto <= 0
    ) {
      alert(
        "Ingrese un monto de promesa válido."
      );

      return;
    }

    if (saldoActual <= 0) {
      alert(
        "Esta cuenta no mantiene saldo pendiente."
      );

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

    const hoyPanama =
      fechaPanamaISO();

    if (
      fechaPromesa < hoyPanama
    ) {
      alert(
        "La fecha prometida no puede ser anterior a la fecha actual de Panamá."
      );

      return;
    }

    if (guardandoPromesa) {
      return;
    }

    setGuardandoPromesa(true);

    const usuarioActual =
      obtenerUsuarioActual();

    const fechaRegistro =
      new Date().toISOString();

    const textoPromesa = [
      `Promesa de pago para ${formatoFecha(
        fechaPromesa
      )}`,

      `por ${formatoDinero(
        monto
      )}.`,

      observacionPromesa.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    const {
      error: errorPromesa,
    } = await supabase
      .from("bitacora_cliente")
      .insert([
        {
          empresa_id: empresaId,

          cliente_id:
            cliente.id,

          informacion_comercial_id:
            cuenta.id,

          tipo_gestion:
            "Promesa de Pago",

          resultado_gestion:
            "Promesa registrada",

          observacion:
            textoPromesa,

          descripcion:
            textoPromesa,

          usuario:
            usuarioActual,

          fecha_gestion:
            fechaRegistro,

          proxima_gestion:
            fechaPromesa,

          monto_promesa:
            monto,
        },
      ]);

    if (errorPromesa) {
      setGuardandoPromesa(false);

      alert(
        "Error registrando promesa de pago: " +
          errorPromesa.message
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
      .eq(
        "informacion_comercial_id",
        cuenta.id
      )
      .maybeSingle();

    if (errorBuscarCobranza) {
      console.error(
        "La promesa fue guardada, pero no se pudo consultar cobranza:",
        errorBuscarCobranza
      );
    } else if (
      cobranzaExistente?.id
    ) {
      const {
        error:
          errorActualizarCobranza,
      } = await supabase
        .from(
          "informacion_cobranza"
        )
        .update({
          proxima_gestion:
            fechaPromesa,

          observacion_cobro:
            textoPromesa,
        })
        .eq("empresa_id", empresaId)
        .eq(
          "id",
          cobranzaExistente.id
        );

      if (
        errorActualizarCobranza
      ) {
        console.error(
          "La promesa fue guardada, pero no se actualizó cobranza:",
          errorActualizarCobranza
        );
      }
    } else {
      const {
        error: errorCrearCobranza,
      } = await supabase
        .from(
          "informacion_cobranza"
        )
        .insert([
          {
            empresa_id:
              empresaId,

            cliente_id:
              cliente.id,

            informacion_comercial_id:
              cuenta.id,

            estado_cobranza:
              obtenerEstadoCalculado(),

            proxima_gestion:
              fechaPromesa,

            observacion_cobro:
              textoPromesa,

            responsable_cobro:
              null,
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
      `Promesa registrada correctamente por ${formatoDinero(
        monto
      )}.`
    );
  }

  async function cargarDocumentos(
    clienteId
  ) {
    const empresaId =
      obtenerEmpresaId();

    if (!empresaId) {
      return;
    }

    const {
      data,
      error,
    } = await supabase.storage
      .from("documentos-clientes")
      .list(
        `empresas/${empresaId}/clientes/${clienteId}`
      );

    if (error) {
      console.error(
        "Error cargando documentos:",
        error
      );

      setDocumentos([]);
      return;
    }

    setDocumentos(data || []);
  }

  async function subirDocumento() {
    const empresaId =
      obtenerEmpresaId();

    if (!empresaId) {
      cerrarSesionInvalida(
        "No existe empresa activa."
      );

      return;
    }

    if (!cliente) {
      alert(
        "Seleccione un cliente."
      );

      return;
    }

    if (!archivo) {
      alert(
        "Seleccione un documento."
      );

      return;
    }

    if (subiendoDocumento) {
      return;
    }

    setSubiendoDocumento(true);

    const nombreLimpio =
      archivo.name.replace(
        /\s+/g,
        "_"
      );

    const ruta =
      `empresas/${empresaId}/clientes/` +
      `${cliente.id}/${Date.now()}-` +
      `${nombreLimpio}`;

    const {
      error,
    } = await supabase.storage
      .from("documentos-clientes")
      .upload(
        ruta,
        archivo
      );

    if (error) {
      setSubiendoDocumento(false);

      alert(
        "Error subiendo documento: " +
          error.message
      );

      return;
    }

    setArchivo(null);

    await cargarDocumentos(
      cliente.id
    );

    setSubiendoDocumento(false);

    alert(
      "Documento cargado correctamente."
    );
  }

  async function verDocumento(
    nombre
  ) {
    const empresaId =
      obtenerEmpresaId();

    if (!empresaId || !cliente) {
      return;
    }

    const ruta =
      `empresas/${empresaId}/clientes/` +
      `${cliente.id}/${nombre}`;

    const {
      data,
      error,
    } = await supabase.storage
      .from("documentos-clientes")
      .createSignedUrl(
        ruta,
        60
      );

    if (error) {
      alert(
        "Error abriendo documento: " +
          error.message
      );

      return;
    }

    window.open(
      data.signedUrl,
      "_blank"
    );
  }

  function abrirWhatsAppCliente() {
    if (!cliente) {
      return;
    }

    let telefono = String(
      cliente.telefono || ""
    ).replace(/\D/g, "");

    if (!telefono) {
      alert(
        "Este cliente no tiene teléfono registrado."
      );

      return;
    }

    if (
      telefono.startsWith("507")
    ) {
      telefono =
        telefono.slice(3);
    }

    const mensaje = cuenta
      ? `Hola ${cliente.nombre || ""}, le contactamos de ${nombreEmpresa()} con relación a su cuenta ${cuenta.numero_cuenta || ""}.`
      : `Hola ${cliente.nombre || ""}, le contactamos de ${nombreEmpresa()}.`;

    window.open(
      `https://wa.me/507${telefono}?text=${encodeURIComponent(
        mensaje
      )}`,
      "_blank"
    );
  }

  const diasAtraso =
    calcularDiasAtraso(
      cuenta?.fecha_vencimiento,
      cuenta?.saldo_actual
    );

  const semaforo =
    obtenerSemaforo(
      diasAtraso
    );

  const estadoCalculado =
    obtenerEstadoCalculado();

  if (cargandoSesion) {
    return (
      <div style={cargandoPagina}>
        <div style={cargandoCard}>
          <strong>
            Validando sesión de KONAX...
          </strong>

          <p>
            Cargando información de la empresa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={encabezadoMarca}>
            <img
              src="/konax-logo.png"
              alt="KONAX"
              style={logo}
            />

            <div>
              <h1 style={titulo}>
                Vista Cliente
              </h1>

              <p style={subtituloVista}>
                {nombreEmpresa()}
              </p>
            </div>
          </div>

          <button
            onClick={
              volverDashboard
            }
            style={
              botonDashboard
            }
          >
            ← Volver al Dashboard
          </button>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>
            Buscar Cliente
          </h2>

          <div style={gridFormulario}>
            <input
              placeholder="Buscar por nombre, cédula o número de cuenta"
              value={buscar}
              onChange={(event) =>
                setBuscar(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  buscarCliente();
                }
              }}
              style={inputStyle}
            />

            <button
              style={
                buscando
                  ? botonDeshabilitado
                  : botonSecundario
              }
              onClick={
                buscarCliente
              }
              disabled={buscando}
            >
              {buscando
                ? "Buscando..."
                : "Buscar"}
            </button>
          </div>

          {resultados.length > 0 && (
            <div style={tablaScroll}>
              <table style={tabla}>
                <tbody>
                  {resultados.map(
                    (item, index) => (
                      <tr
                        key={
                          item.clave ||
                          index
                        }
                      >
                        <td style={td}>
                          {
                            item.cliente
                              .nombre
                          }
                        </td>

                        <td style={td}>
                          {
                            item.cliente
                              .cedula
                          }
                        </td>

                        <td style={td}>
                          {item.cuenta
                            ?.numero_cuenta ||
                            "Ver cuentas"}
                        </td>

                        <td style={td}>
                          <button
                            style={
                              botonSeleccionar
                            }
                            onClick={() =>
                              seleccionarCliente(
                                item
                              )
                            }
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {cliente && (
          <>
            <div style={acciones}>
              <button
                style={whatsappBtn}
                onClick={
                  abrirWhatsAppCliente
                }
              >
                WhatsApp
              </button>
            </div>

            <div style={gridResumen}>
              <div style={card}>
                <h3 style={tituloTarjeta}>
                  Cliente
                </h3>

                <p>
                  <strong>
                    {cliente.nombre}
                  </strong>
                </p>

                <p>
                  Cédula:{" "}
                  {cliente.cedula ||
                    "-"}
                </p>

                <p>
                  Teléfono:{" "}
                  {cliente.telefono ||
                    "-"}
                </p>

                <p>
                  Correo:{" "}
                  {cliente.correo ||
                    "-"}
                </p>

                <p>
                  Dirección:{" "}
                  {cliente.direccion ||
                    "-"}
                </p>
              </div>

              <div style={card}>
                <h3 style={tituloTarjeta}>
                  Información Comercial
                </h3>

                {cuentas.length > 1 && (
                  <select
                    value={
                      cuenta?.id ||
                      ""
                    }
                    onChange={(event) =>
                      cambiarCuenta(
                        event.target
                          .value
                      )
                    }
                    style={inputStyle}
                  >
                    {cuentas.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {
                            item.numero_cuenta
                          }
                          {" - "}
                          {item.descripcion ||
                            "Cuenta"}
                        </option>
                      )
                    )}
                  </select>
                )}

                <p>
                  Cuenta:{" "}
                  {cuenta?.numero_cuenta ||
                    "-"}
                </p>

                <p>
                  Tipo:{" "}
                  {cuenta?.tipo_producto ||
                    "-"}
                </p>

                <p>
                  Descripción:{" "}
                  {cuenta?.descripcion ||
                    "-"}
                </p>

                <p>
                  Modalidad:{" "}
                  {cuenta?.modalidad ||
                    "-"}
                </p>

                <p>
                  Monto total:{" "}
                  {formatoDinero(
                    cuenta?.monto_total
                  )}
                </p>

                <p>
                  Saldo actual:{" "}
                  <strong>
                    {formatoDinero(
                      cuenta?.saldo_actual
                    )}
                  </strong>
                </p>

                <p>
                  Cuota:{" "}
                  {formatoDinero(
                    cuenta?.cuota
                  )}
                </p>
              </div>

              <div style={card}>
                <h3 style={tituloTarjeta}>
                  Cobranza
                </h3>

                <p>
                  Estado:{" "}
                  <strong>
                    {semaforo}{" "}
                    {estadoCalculado}
                  </strong>
                </p>

                <p>
                  <strong>
                    Días de atraso:
                  </strong>{" "}
                  {diasAtraso}
                </p>

                <p>
                  Fecha último pago:{" "}
                  {formatoFecha(
                    cobranza
                      ?.fecha_ultimo_pago
                  )}
                </p>

                <p>
                  Monto último pago:{" "}
                  {formatoDinero(
                    cobranza
                      ?.monto_ultimo_pago
                  )}
                </p>

                <p>
                  Responsable:{" "}
                  {cobranza
                    ?.responsable_cobro ||
                    "-"}
                </p>

                <p>
                  Próxima gestión:{" "}
                  {formatoFecha(
                    cobranza
                      ?.proxima_gestion
                  )}
                </p>
              </div>
            </div>

            <div style={cardPromesa}>
              <div style={encabezadoPromesa}>
                <div style={iconoPromesa}>
                  🤝
                </div>

                <div>
                  <h2 style={tituloSeccion}>
                    Promesa de Pago
                  </h2>

                  <p style={textoAyuda}>
                    Registre la fecha y el monto que el cliente se comprometió a pagar.
                  </p>
                </div>
              </div>

              <div style={gridPromesa}>
                <div>
                  <label style={labelStyle}>
                    Fecha prometida
                  </label>

                  <input
                    type="date"
                    min={fechaPanamaISO()}
                    value={fechaPromesa}
                    onChange={(event) =>
                      setFechaPromesa(
                        event.target
                          .value
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Monto prometido
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={
                      Number(
                        cuenta?.saldo_actual ||
                          0
                      ) || undefined
                    }
                    placeholder="Ej. 300.00"
                    value={montoPromesa}
                    onChange={(event) =>
                      setMontoPromesa(
                        event.target
                          .value
                      )
                    }
                    style={inputStyle}
                  />

                  <small style={textoPequeno}>
                    Saldo disponible:{" "}
                    {formatoDinero(
                      cuenta?.saldo_actual
                    )}
                  </small>
                </div>

                <div>
                  <label style={labelStyle}>
                    Observación
                  </label>

                  <input
                    placeholder="Ej. Pagará por transferencia"
                    value={
                      observacionPromesa
                    }
                    onChange={(event) =>
                      setObservacionPromesa(
                        event.target
                          .value
                      )
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                style={
                  guardandoPromesa
                    ? botonDeshabilitado
                    : botonPromesa
                }
                onClick={
                  registrarPromesa
                }
                disabled={
                  guardandoPromesa
                }
              >
                {guardandoPromesa
                  ? "Registrando promesa..."
                  : "Registrar Promesa"}
              </button>
            </div>

            <div style={card}>
              <h2 style={tituloSeccion}>
                Historial de Pagos
              </h2>

              <div style={tablaScroll}>
                <table style={tabla}>
                  <thead>
                    <tr>
                      <th style={th}>
                        Fecha
                      </th>

                      <th style={th}>
                        Monto
                      </th>

                      <th style={th}>
                        Método
                      </th>

                      <th style={th}>
                        Observación
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pagos.map(
                      (pago) => (
                        <tr key={pago.id}>
                          <td style={td}>
                            {formatoFecha(
                              pago.fecha_pago ||
                                pago.created_at
                            )}
                          </td>

                          <td style={td}>
                            {formatoDinero(
                              pago.monto
                            )}
                          </td>

                          <td style={td}>
                            {pago.metodo_pago ||
                              pago.metodo ||
                              "-"}
                          </td>

                          <td style={td}>
                            {pago.descripcion ||
                              pago.observacion ||
                              "-"}
                          </td>
                        </tr>
                      )
                    )}

                    {pagos.length === 0 && (
                      <tr>
                        <td
                          style={td}
                          colSpan="4"
                        >
                          No hay pagos registrados para esta cuenta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={card}>
              <h2 style={tituloSeccion}>
                Observaciones de Gestión
              </h2>

              <div style={gridFormulario}>
                <select
                  value={tipoGestion}
                  onChange={(event) =>
                    setTipoGestion(
                      event.target
                        .value
                    )
                  }
                  style={inputStyle}
                >
                  <option>
                    Llamada
                  </option>

                  <option>
                    WhatsApp
                  </option>

                  <option>
                    Visita
                  </option>

                  <option>
                    Correo
                  </option>

                  <option>
                    Seguimiento
                  </option>
                </select>

                <select
                  value={
                    resultadoGestion
                  }
                  onChange={(event) =>
                    setResultadoGestion(
                      event.target
                        .value
                    )
                  }
                  style={inputStyle}
                >
                  <option>
                    Pendiente
                  </option>

                  <option>
                    Contestó
                  </option>

                  <option>
                    No contestó
                  </option>

                  <option>
                    Pago Realizado
                  </option>

                  <option>
                    Reprogramar
                  </option>
                </select>
              </div>

              <textarea
                placeholder="Agregar nueva observación..."
                value={observacion}
                onChange={(event) =>
                  setObservacion(
                    event.target.value
                  )
                }
                style={textarea}
              />

              <button
                style={
                  guardandoGestion
                    ? botonDeshabilitado
                    : boton
                }
                onClick={
                  guardarGestion
                }
                disabled={
                  guardandoGestion
                }
              >
                {guardandoGestion
                  ? "Guardando..."
                  : "Guardar Observación"}
              </button>

              <div style={historialGestiones}>
                {gestiones.map(
                  (item) => {
                    const esPromesa =
                      limpiarTexto(
                        item.tipo_gestion
                      ) ===
                        "promesa de pago" ||
                      limpiarTexto(
                        item.resultado_gestion
                      ) ===
                        "promesa registrada";

                    return (
                      <div
                        key={item.id}
                        style={
                          esPromesa
                            ? promesaHistorialBox
                            : observacionBox
                        }
                      >
                        <div style={gestionCabecera}>
                          <strong>
                            {formatoFechaHora(
                              item.fecha_gestion ||
                                item.created_at
                            )}
                            {" — "}
                            {item.usuario ||
                              "Sin usuario"}
                          </strong>

                          {esPromesa && (
                            <span style={badgePromesa}>
                              Promesa
                            </span>
                          )}
                        </div>

                        <p>
                          {item.tipo_gestion ||
                            "-"}
                          {" / "}
                          {item.resultado_gestion ||
                            "-"}
                        </p>

                        <p>
                          {item.observacion ||
                            item.descripcion ||
                            "-"}
                        </p>

                        {Number(
                          item.monto_promesa ||
                            0
                        ) > 0 && (
                          <p>
                            <strong>
                              Monto prometido:
                            </strong>{" "}
                            {formatoDinero(
                              item.monto_promesa
                            )}
                          </p>
                        )}

                        {item.proxima_gestion && (
                          <p>
                            <strong>
                              Fecha prometida:
                            </strong>{" "}
                            {formatoFecha(
                              item.proxima_gestion
                            )}
                          </p>
                        )}
                      </div>
                    );
                  }
                )}

                {gestiones.length === 0 && (
                  <p>
                    No hay gestiones registradas para esta cuenta.
                  </p>
                )}
              </div>
            </div>

            <div style={card}>
              <h2 style={tituloSeccion}>
                📁 Expediente Digital
              </h2>

              <input
                type="file"
                onChange={(event) =>
                  setArchivo(
                    event.target
                      .files?.[0] ||
                      null
                  )
                }
                style={inputStyle}
              />

              <button
                style={
                  subiendoDocumento
                    ? botonDeshabilitado
                    : boton
                }
                onClick={
                  subirDocumento
                }
                disabled={
                  subiendoDocumento
                }
              >
                {subiendoDocumento
                  ? "Subiendo..."
                  : "+ Subir Documento"}
              </button>

              <div style={tablaScroll}>
                <table style={tabla}>
                  <thead>
                    <tr>
                      <th style={th}>
                        Archivo
                      </th>

                      <th style={th}>
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {documentos.map(
                      (documento) => (
                        <tr
                          key={
                            documento.name
                          }
                        >
                          <td style={td}>
                            {
                              documento.name
                            }
                          </td>

                          <td style={td}>
                            <button
                              style={
                                accionBtn
                              }
                              onClick={() =>
                                verDocumento(
                                  documento.name
                                )
                              }
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      )
                    )}

                    {documentos.length === 0 && (
                      <tr>
                        <td
                          style={td}
                          colSpan="2"
                        >
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

const cargandoPagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const cargandoCard = {
  background: "#ffffff",
  padding: "26px",
  borderRadius: "16px",
  boxShadow:
    "0 4px 18px rgba(0,0,0,0.08)",
  color: "#111827",
};

const pagina = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg, #f3f4f6 0%, #eef2ff 50%, #ecfdf5 100%)",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
  margin: "0 auto",
};

const encabezado = {
  background:
    "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginBottom: "18px",
  flexWrap: "wrap",
  borderRadius: "20px",
  padding: "22px",
  boxShadow:
    "0 8px 24px rgba(0,0,0,0.14)",
};

const encabezadoMarca = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const logo = {
  width: "90px",
  maxWidth: "100%",
  height: "auto",
  background: "#ffffff",
  padding: "7px",
  borderRadius: "14px",
};

const titulo = {
  fontSize: "30px",
  margin: "0 0 4px",
  color: "#ffffff",
};

const subtituloVista = {
  margin: 0,
  color: "#bbf7d0",
  fontSize: "13px",
  fontWeight: "bold",
};

const gridResumen = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(280px,1fr))",
  gap: "12px",
  marginBottom: "12px",
};

const gridFormulario = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: "12px",
  alignItems: "end",
};

const gridPromesa = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(240px,1fr))",
  gap: "14px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "14px",
  boxShadow:
    "0 3px 12px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
};

const cardPromesa = {
  ...card,
  border: "1px solid #bbf7d0",
  background:
    "linear-gradient(135deg, #ffffff, #f0fdf4)",
};

const encabezadoPromesa = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
};

const iconoPromesa = {
  width: "48px",
  height: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#dcfce7",
  borderRadius: "14px",
  fontSize: "24px",
};

const tituloTarjeta = {
  marginTop: 0,
  color: "#111827",
};

const tituloSeccion = {
  marginTop: 0,
  marginBottom: "12px",
  color: "#111827",
};

const textoAyuda = {
  margin: 0,
  color: "#6b7280",
  fontSize: "14px",
};

const textoPequeno = {
  display: "block",
  color: "#6b7280",
  marginTop: "-4px",
  marginBottom: "8px",
};

const tablaScroll = {
  overflowX: "auto",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "14px",
};

const th = {
  textAlign: "left",
  padding: "11px",
  borderBottom:
    "1px solid #e5e7eb",
  background: "#111827",
  color: "#ffffff",
  whiteSpace: "nowrap",
};

const td = {
  padding: "11px",
  borderBottom:
    "1px solid #f3f4f6",
};

const textarea = {
  width: "100%",
  padding: "11px",
  borderRadius: "9px",
  border:
    "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  minHeight: "95px",
  marginBottom: "10px",
  color: "#111827",
  background: "#ffffff",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "9px",
  border:
    "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  marginBottom: "10px",
  color: "#111827",
  background: "#ffffff",
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

const botonPromesa = {
  ...boton,
  background: "#047857",
};

const botonDeshabilitado = {
  marginTop: "10px",
  background: "#9ca3af",
  color: "#ffffff",
  border: "none",
  padding: "11px 22px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "not-allowed",
};

const botonSeleccionar = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "8px 14px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const observacionBox = {
  background: "#f9fafb",
  padding: "13px",
  borderRadius: "11px",
  marginBottom: "9px",
  border:
    "1px solid #e5e7eb",
};

const promesaHistorialBox = {
  ...observacionBox,
  background: "#f0fdf4",
  border:
    "1px solid #bbf7d0",
};

const gestionCabecera = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const badgePromesa = {
  display: "inline-block",
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
};

const historialGestiones = {
  marginTop: "16px",
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
  border:
    "1px solid #d1d5db",
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
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "11px 18px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};
