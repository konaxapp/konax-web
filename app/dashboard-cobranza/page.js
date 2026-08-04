"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DashboardCobranza() {
  const [cuentas, setCuentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cobranzas, setCobranzas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [gestiones, setGestiones] = useState([]);

  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [filtroGestor, setFiltroGestor] = useState("Todos");

  const [pestanaActiva, setPestanaActiva] = useState("resumen");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState("");

  const [fechaOperativa, setFechaOperativa] = useState(
    obtenerFechaPanama()
  );

  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const intervaloFecha = window.setInterval(() => {
      const nuevaFecha = obtenerFechaPanama();

      setFechaOperativa((fechaActual) => {
        if (fechaActual !== nuevaFecha) {
          return nuevaFecha;
        }

        return fechaActual;
      });
    }, 30000);

    return () => {
      window.clearInterval(intervaloFecha);
    };
  }, []);

  useEffect(() => {
    const intervaloDatos = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        cargarDatos({ silencioso: true });
      }
    }, 60000);

    return () => {
      window.clearInterval(intervaloDatos);
    };
  }, []);

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function obtenerEmpresaId() {
    const empresaId =
      localStorage.getItem("empresaId") ||
      localStorage.getItem("empresa_id");

    if (!empresaId) {
      alert("No hay empresa activa.");
      window.location.href = "/login";
      return null;
    }

    return empresaId;
  }

  function normalizarTexto(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function obtenerFechaPanama(fecha = new Date()) {
    const fechaObjeto =
      fecha instanceof Date ? fecha : new Date(fecha);

    if (Number.isNaN(fechaObjeto.getTime())) {
      return "";
    }

    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Panama",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(fechaObjeto);

    const year =
      partes.find((parte) => parte.type === "year")?.value || "";

    const month =
      partes.find((parte) => parte.type === "month")?.value || "";

    const day =
      partes.find((parte) => parte.type === "day")?.value || "";

    return `${year}-${month}-${day}`;
  }

  function obtenerHoraPanama(fecha = new Date()) {
    return new Intl.DateTimeFormat("es-PA", {
      timeZone: "America/Panama",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(fecha);
  }

  function esFechaSimple(fecha) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
      String(fecha || "").trim()
    );
  }

  function fechaSimple(fecha) {
    if (!fecha) return "";

    const texto = String(fecha).trim();

    if (esFechaSimple(texto)) {
      return texto;
    }

    const fechaObjeto = new Date(texto);

    if (Number.isNaN(fechaObjeto.getTime())) {
      return texto.slice(0, 10);
    }

    return obtenerFechaPanama(fechaObjeto);
  }

  function fechaOperativaPago(pago) {
    if (!pago?.fecha_pago) {
      return "";
    }

    return String(pago.fecha_pago).slice(0, 10);
  }

  function fechaRegistroGestion(gestion) {
    return fechaSimple(
      gestion?.created_at ||
        gestion?.fecha_gestion
    );
  }

  function timestampSeguro(fecha) {
    if (!fecha) return 0;

    let texto = String(fecha).trim();

    texto = texto.replace(" ", "T");

    const tieneZonaHoraria =
      /Z$/i.test(texto) ||
      /[+-]\d{2}:\d{2}$/.test(texto) ||
      /[+-]\d{2}$/.test(texto);

    if (!tieneZonaHoraria) {
      texto += "Z";
    }

    const valor = new Date(texto).getTime();

    return Number.isNaN(valor) ? 0 : valor;
  }

  function timestampRegistroPromesa(promesa) {
    return timestampSeguro(
      promesa?.created_at ||
        promesa?.fecha_gestion
    );
  }

  function timestampRegistroPago(pago) {
    return timestampSeguro(pago?.created_at);
  }

  function formatoFecha(fecha) {
    const texto = fechaSimple(fecha);

    if (!texto) return "-";

    const partes = texto.split("-");

    if (partes.length !== 3) {
      return texto;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function formato(numero) {
    return (
      "USD " +
      Number(numero || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function inicioMesDeFecha(fechaISO) {
    if (!fechaISO) return "";

    return `${fechaISO.slice(0, 7)}-01`;
  }

  function finMesDeFecha(fechaISO) {
    if (!fechaISO) return "";

    const [year, month] = fechaISO.split("-").map(Number);
    const ultimoDia = new Date(year, month, 0).getDate();

    return `${year}-${String(month).padStart(2, "0")}-${String(
      ultimoDia
    ).padStart(2, "0")}`;
  }

  function sumarDiasISO(fechaISO, dias) {
    if (!fechaISO) return "";

    const fecha = new Date(`${fechaISO}T12:00:00`);
    fecha.setDate(fecha.getDate() + dias);

    return obtenerFechaPanama(fecha);
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

    const vencimientoTexto = fechaSimple(fechaVencimiento);

    if (!vencimientoTexto) {
      return 0;
    }

    const hoy = new Date(`${fechaOperativa}T00:00:00`);
    const vencimiento = new Date(
      `${vencimientoTexto}T00:00:00`
    );

    const diferencia =
      hoy.getTime() - vencimiento.getTime();

    if (diferencia <= 0) {
      return 0;
    }

    return Math.floor(
      diferencia / (1000 * 60 * 60 * 24)
    );
  }

  function estadoCuenta(cuenta, cobranza) {
    const saldo = Number(cuenta?.saldo_actual || 0);

    if (saldo <= 0) {
      return "Cancelado";
    }

    const estadoCobranza = normalizarTexto(
      cobranza?.estado_cobranza
    );

    const estadoComercial = normalizarTexto(
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

    const dias = calcularDiasAtraso(
      cuenta?.fecha_vencimiento,
      saldo
    );

    return dias > 0 ? "Mora" : "Al Día";
  }

  function riesgoCartera(dias, saldo, estado) {
    if (Number(saldo || 0) <= 0) {
      return "Cancelado";
    }

    if (estado === "Legal") {
      return "Legal";
    }

    if (dias <= 0) {
      return "Al día";
    }

    if (dias <= 30) {
      return "Riesgo bajo";
    }

    if (dias <= 60) {
      return "Riesgo medio";
    }

    if (dias <= 90) {
      return "Riesgo alto";
    }

    return "Riesgo crítico";
  }

  function rangoSemaforo(dias, saldo) {
    if (Number(saldo || 0) <= 0) {
      return "Cancelado";
    }

    if (dias <= 0) {
      return "Al día";
    }

    if (dias <= 30) {
      return "1-30 días";
    }

    if (dias <= 60) {
      return "31-60 días";
    }

    if (dias <= 90) {
      return "61-90 días";
    }

    return "Más de 90 días";
  }

  function pagoEsValido(pago) {
    const estado = normalizarTexto(pago?.estado);
    const tipo = normalizarTexto(pago?.tipo);

    const estadoValido =
      estado === "procesado" ||
      estado === "activo";

    const tipoValido = [
      "pago credito",
      "cobro credito",
      "mensualidad",
      "cancelacion",
      "abono",
      "cuota credito",
      "cuota de credito",
    ].includes(tipo);

    return estadoValido && tipoValido;
  }

  function obtenerClavePago(pago, indice = 0) {
    if (pago?.id) {
      return String(pago.id);
    }

    return [
      pago?.numero_transaccion || "",
      pago?.informacion_comercial_id || "",
      pago?.numero_cuenta || "",
      pago?.cliente_id || "",
      fechaOperativaPago(pago),
      pago?.monto || 0,
      indice,
    ].join("|");
  }

  function eliminarPagosDuplicados(listaPagos) {
    const mapa = new Map();

    (listaPagos || []).forEach((pago, indice) => {
      const clave = obtenerClavePago(pago, indice);

      if (!mapa.has(clave)) {
        mapa.set(clave, pago);
      }
    });

    return [...mapa.values()];
  }

  function sumarPagos(
    listaPagos,
    desde = "",
    hasta = ""
  ) {
    return eliminarPagosDuplicados(listaPagos)
      .filter(pagoEsValido)
      .filter((pago) => {
        const fecha = fechaOperativaPago(pago);

        if (!fecha) return false;
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;

        return true;
      })
      .reduce(
        (suma, pago) =>
          suma + Number(pago.monto || 0),
        0
      );
  }

  async function cargarDatos({ silencioso = false } = {}) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) return;

    if (!silencioso) {
      setCargando(true);
    }

    setFechaOperativa(obtenerFechaPanama());

    const [
      cuentasRes,
      clientesRes,
      cobranzasRes,
      pagosRes,
      gestionesRes,
    ] = await Promise.all([
      supabase
        .from("informacion_comercial")
        .select("*")
        .eq("empresa_id", empresaId),

      supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId),

      supabase
        .from("informacion_cobranza")
        .select("*")
        .eq("empresa_id", empresaId),

      supabase
        .from("caja")
        .select("*")
        .eq("empresa_id", empresaId),

      supabase
        .from("bitacora_cliente")
        .select("*")
        .eq("empresa_id", empresaId),
    ]);

    const errores = [
      cuentasRes.error,
      clientesRes.error,
      cobranzasRes.error,
      pagosRes.error,
      gestionesRes.error,
    ].filter(Boolean);

    if (errores.length > 0) {
      alert(
        "Error cargando Dashboard: " +
          errores[0].message
      );

      setCargando(false);
      return;
    }

    setCuentas(cuentasRes.data || []);
    setClientes(clientesRes.data || []);
    setCobranzas(cobranzasRes.data || []);
    setPagos(pagosRes.data || []);
    setGestiones(gestionesRes.data || []);
    setUltimaActualizacion(obtenerHoraPanama());

    setCargando(false);
  }

  function limpiarFiltros() {
    setFiltroDesde("");
    setFiltroHasta("");
    setFiltroGestor("Todos");
  }

  function aplicarPeriodo(tipo) {
    const hoy = fechaOperativa || obtenerFechaPanama();

    if (tipo === "hoy") {
      setFiltroDesde(hoy);
      setFiltroHasta(hoy);
      return;
    }

    if (tipo === "7dias") {
      setFiltroDesde(sumarDiasISO(hoy, -6));
      setFiltroHasta(hoy);
      return;
    }

    if (tipo === "mes") {
      setFiltroDesde(inicioMesDeFecha(hoy));
      setFiltroHasta(finMesDeFecha(hoy));
      return;
    }

    if (tipo === "mesAnterior") {
      const [year, month] = hoy.split("-").map(Number);
      const fechaMesAnterior = new Date(
        year,
        month - 2,
        15,
        12,
        0,
        0
      );

      const fechaISO = obtenerFechaPanama(fechaMesAnterior);

      setFiltroDesde(inicioMesDeFecha(fechaISO));
      setFiltroHasta(finMesDeFecha(fechaISO));
      return;
    }

    limpiarFiltros();
  }

  const inicioMes = inicioMesDeFecha(fechaOperativa);
  const finMes = finMesDeFecha(fechaOperativa);

  const pagosValidosUnicos = useMemo(() => {
    return eliminarPagosDuplicados(
      pagos.filter(pagoEsValido)
    );
  }, [pagos]);

  const cartera = useMemo(() => {
    const base = cuentas.map((cuenta) => {
      const cliente = clientes.find(
        (item) =>
          String(item.id) ===
          String(cuenta.cliente_id)
      );

      const cobranza = cobranzas.find(
        (item) =>
          String(item.informacion_comercial_id) ===
          String(cuenta.id)
      );

      const montoOriginal = Number(
        cuenta.monto_total || 0
      );

      const saldoPendiente = Number(
        cuenta.saldo_actual || 0
      );

      const dias = calcularDiasAtraso(
        cuenta.fecha_vencimiento,
        saldoPendiente
      );

      const estado = estadoCuenta(cuenta, cobranza);

      const riesgo = riesgoCartera(
        dias,
        saldoPendiente,
        estado
      );

      const semaforo = rangoSemaforo(
        dias,
        saldoPendiente
      );

      const gestor =
        cobranza?.responsable_cobro ||
        cuenta?.responsable ||
        cuenta?.vendedor ||
        "Sin asignar";

      return {
        cuenta,
        cliente,
        cobranza,
        montoOriginal,
        saldoPendiente,
        dias,
        estado,
        riesgo,
        semaforo,
        gestor,
        pagosCuenta: [],
      };
    });

    const pagosAsignados = new Map();

    base.forEach((item) => {
      pagosAsignados.set(
        String(item.cuenta.id),
        []
      );
    });

    pagosValidosUnicos.forEach((pago) => {
      let cuentaDestino = null;

      if (pago.informacion_comercial_id) {
        cuentaDestino = base.find(
          (item) =>
            String(item.cuenta.id) ===
            String(pago.informacion_comercial_id)
        );
      }

      if (!cuentaDestino && pago.numero_cuenta) {
        cuentaDestino = base.find(
          (item) =>
            String(
              item.cuenta.numero_cuenta || ""
            ).trim() ===
            String(pago.numero_cuenta).trim()
        );
      }

      if (!cuentaDestino && pago.cliente_id) {
        const cuentasDelCliente = base.filter(
          (item) =>
            String(item.cuenta.cliente_id) ===
            String(pago.cliente_id)
        );

        if (cuentasDelCliente.length === 1) {
          cuentaDestino = cuentasDelCliente[0];
        }
      }

      if (!cuentaDestino) {
        const cedulaPago = String(
          pago.cliente_cedula ||
            pago.cedula ||
            pago.identificacion ||
            ""
        ).trim();

        if (cedulaPago) {
          const cuentasPorCedula = base.filter(
            (item) =>
              String(
                item.cliente?.cedula || ""
              ).trim() === cedulaPago
          );

          if (cuentasPorCedula.length === 1) {
            cuentaDestino = cuentasPorCedula[0];
          }
        }
      }

      if (cuentaDestino) {
        const cuentaId = String(
          cuentaDestino.cuenta.id
        );

        const listaActual =
          pagosAsignados.get(cuentaId) || [];

        listaActual.push(pago);
        pagosAsignados.set(cuentaId, listaActual);
      }
    });

    return base.map((item) => ({
      ...item,
      pagosCuenta:
        pagosAsignados.get(
          String(item.cuenta.id)
        ) || [],
    }));
  }, [
    cuentas,
    clientes,
    cobranzas,
    pagosValidosUnicos,
    fechaOperativa,
  ]);

  const gestores = [
    "Todos",
    ...new Set(
      cartera
        .map((item) => item.gestor)
        .filter(Boolean)
    ),
  ];

  const carteraPorGestor =
    filtroGestor === "Todos"
      ? cartera
      : cartera.filter(
          (item) => item.gestor === filtroGestor
        );

  const carteraActivaPorGestor =
    carteraPorGestor.filter(
      (item) => item.saldoPendiente > 0
    );

  function obtenerCuentaDelPago(pago) {
    if (pago?.informacion_comercial_id) {
      const cuentaDirecta = cartera.find(
        (item) =>
          String(item.cuenta.id) ===
          String(pago.informacion_comercial_id)
      );

      if (cuentaDirecta) {
        return cuentaDirecta;
      }
    }

    if (pago?.numero_cuenta) {
      const cuentaNumero = cartera.find(
        (item) =>
          String(
            item.cuenta.numero_cuenta || ""
          ).trim() ===
          String(pago.numero_cuenta).trim()
      );

      if (cuentaNumero) {
        return cuentaNumero;
      }
    }

    if (pago?.cliente_id) {
      const cuentasDelCliente = cartera.filter(
        (item) =>
          String(item.cuenta.cliente_id) ===
          String(pago.cliente_id)
      );

      if (cuentasDelCliente.length === 1) {
        return cuentasDelCliente[0];
      }
    }

    return null;
  }

  function pagoCorrespondeFiltroGestor(pago) {
    if (filtroGestor === "Todos") {
      return true;
    }

    const cuentaDelPago = obtenerCuentaDelPago(pago);

    return cuentaDelPago?.gestor === filtroGestor;
  }

  const pagosFiltradosPorGestor =
    pagosValidosUnicos.filter(
      pagoCorrespondeFiltroGestor
    );

  const carteraOriginal =
    carteraPorGestor.reduce(
      (suma, item) =>
        suma + item.montoOriginal,
      0
    );

  const saldoPendiente =
    carteraPorGestor.reduce(
      (suma, item) =>
        suma + item.saldoPendiente,
      0
    );

  const totalRecuperado = Math.max(
    carteraOriginal - saldoPendiente,
    0
  );

  const carteraAlDia =
    carteraActivaPorGestor
      .filter((item) => item.dias <= 0)
      .reduce(
        (suma, item) =>
          suma + item.saldoPendiente,
        0
      );

  const carteraMora =
    carteraActivaPorGestor
      .filter((item) => item.dias > 0)
      .reduce(
        (suma, item) =>
          suma + item.saldoPendiente,
        0
      );

  const porcentajeMora =
    saldoPendiente > 0
      ? (carteraMora / saldoPendiente) * 100
      : 0;

  const cobradoHoy = sumarPagos(
    pagosFiltradosPorGestor,
    fechaOperativa,
    fechaOperativa
  );

  const cobradoMes = sumarPagos(
    pagosFiltradosPorGestor,
    inicioMes,
    finMes
  );

  const cobradoPeriodo = sumarPagos(
    pagosFiltradosPorGestor,
    filtroDesde,
    filtroHasta
  );

  const saldoInicioPeriodo =
    saldoPendiente + cobradoPeriodo;

  const recuperacionPeriodo =
    saldoInicioPeriodo > 0
      ? (cobradoPeriodo / saldoInicioPeriodo) * 100
      : 0;

  const vencimientosMes =
    carteraPorGestor.filter((item) => {
      const vencimiento = fechaSimple(
        item.cuenta?.fecha_vencimiento
      );

      return (
        vencimiento &&
        vencimiento >= inicioMes &&
        vencimiento <= finMes
      );
    });

  const montoVencimientosMes =
    vencimientosMes.reduce((suma, item) => {
      const cobradoCuentaMes = sumarPagos(
        item.pagosCuenta,
        inicioMes,
        finMes
      );

      return (
        suma +
        item.saldoPendiente +
        cobradoCuentaMes
      );
    }, 0);

  const cobradoVencimientosMes =
    vencimientosMes.reduce(
      (suma, item) =>
        suma +
        sumarPagos(
          item.pagosCuenta,
          inicioMes,
          finMes
        ),
      0
    );

  const pendienteMes = Math.max(
    montoVencimientosMes -
      cobradoVencimientosMes,
    0
  );

  const moraAnterior =
    carteraPorGestor.filter((item) => {
      const vencimiento = fechaSimple(
        item.cuenta?.fecha_vencimiento
      );

      return (
        vencimiento &&
        vencimiento < inicioMes
      );
    });

  const moraAnteriorInicio =
    moraAnterior.reduce((suma, item) => {
      const cobradoCuentaMes = sumarPagos(
        item.pagosCuenta,
        inicioMes,
        finMes
      );

      return (
        suma +
        item.saldoPendiente +
        cobradoCuentaMes
      );
    }, 0);

  const moraAnteriorRecuperada =
    moraAnterior.reduce(
      (suma, item) =>
        suma +
        sumarPagos(
          item.pagosCuenta,
          inicioMes,
          finMes
        ),
      0
    );

  const moraAnteriorPendiente =
    moraAnterior.reduce(
      (suma, item) =>
        suma + item.saldoPendiente,
      0
    );

  const saldoVencidoPendiente =
    carteraPorGestor
      .filter((item) => {
        const vencimiento = fechaSimple(
          item.cuenta?.fecha_vencimiento
        );

        return (
          item.saldoPendiente > 0 &&
          vencimiento &&
          vencimiento <= fechaOperativa
        );
      })
      .reduce(
        (suma, item) =>
          suma + item.saldoPendiente,
        0
      );

  function gestionPerteneceGestor(gestion, gestor) {
    if (gestor === "Todos") {
      return true;
    }

    const usuario = normalizarTexto(
      gestion?.usuario
    );

    const nombreGestor = normalizarTexto(gestor);

    return (
      usuario === nombreGestor ||
      usuario.startsWith(`${nombreGestor} (`)
    );
  }

  const gestionesPeriodo = gestiones.filter(
    (gestion) => {
      const fecha = fechaRegistroGestion(gestion);

      if (!fecha) return false;

      if (filtroDesde && fecha < filtroDesde) {
        return false;
      }

      if (filtroHasta && fecha > filtroHasta) {
        return false;
      }

      return gestionPerteneceGestor(
        gestion,
        filtroGestor
      );
    }
  );

  function esPromesaPago(gestion) {
    const tipo = normalizarTexto(
      gestion?.tipo_gestion
    );

    const resultado = normalizarTexto(
      gestion?.resultado_gestion
    );

    return (
      tipo === "promesa de pago" ||
      resultado === "promesa registrada" ||
      resultado === "promesa de pago"
    );
  }

  function obtenerCuentaDePromesa(promesa) {
    if (promesa?.informacion_comercial_id) {
      const cuentaDirecta = cartera.find(
        (item) =>
          String(item.cuenta.id) ===
          String(promesa.informacion_comercial_id)
      );

      if (cuentaDirecta) {
        return cuentaDirecta;
      }
    }

    if (promesa?.cliente_id) {
      const cuentasDelCliente = cartera.filter(
        (item) =>
          String(item.cuenta.cliente_id) ===
          String(promesa.cliente_id)
      );

      if (cuentasDelCliente.length === 1) {
        return cuentasDelCliente[0];
      }
    }

    return null;
  }

  function obtenerClavePromesa(promesa, indice = 0) {
    if (promesa?.id) {
      return String(promesa.id);
    }

    return [
      promesa?.informacion_comercial_id || "",
      promesa?.cliente_id || "",
      promesa?.fecha_gestion || "",
      promesa?.proxima_gestion || "",
      promesa?.monto_promesa || 0,
      indice,
    ].join("|");
  }

  const resultadosPromesas = useMemo(() => {
    const promesasOrdenadas = gestiones
      .filter(esPromesaPago)
      .map((promesa, indice) => ({
        promesa,
        indice,
        cuentaRelacionada:
          obtenerCuentaDePromesa(promesa),
        fechaRegistro:
          fechaRegistroGestion(promesa),
        timestampRegistro:
          timestampRegistroPromesa(promesa),
        fechaCompromiso:
          fechaSimple(promesa.proxima_gestion),
        montoPrometido:
          Number(promesa.monto_promesa || 0),
      }))
      .filter(
        (item) =>
          item.fechaRegistro &&
          item.fechaCompromiso &&
          item.montoPrometido > 0
      )
      .sort((a, b) => {
        if (a.timestampRegistro !== b.timestampRegistro) {
          return (
            a.timestampRegistro -
            b.timestampRegistro
          );
        }

        return a.fechaCompromiso.localeCompare(
          b.fechaCompromiso
        );
      });

    const pagosDisponibles = new Map();

    pagosValidosUnicos.forEach((pago, indice) => {
      pagosDisponibles.set(
        obtenerClavePago(pago, indice),
        Number(pago.monto || 0)
      );
    });

    const mapaResultados = new Map();

    promesasOrdenadas.forEach((itemPromesa) => {
      const {
        promesa,
        indice,
        cuentaRelacionada,
        fechaRegistro,
        timestampRegistro,
        fechaCompromiso,
        montoPrometido,
      } = itemPromesa;

      const clavePromesa = obtenerClavePromesa(
        promesa,
        indice
      );

      let pagadoEnFecha = 0;
      let pagadoFueraFecha = 0;
      let fechaCumplimiento = "";

      if (cuentaRelacionada) {
        const pagosOrdenados = [
          ...cuentaRelacionada.pagosCuenta,
        ].sort((pagoA, pagoB) => {
          const timestampA =
            timestampRegistroPago(pagoA);

          const timestampB =
            timestampRegistroPago(pagoB);

          if (timestampA !== timestampB) {
            return timestampA - timestampB;
          }

          return fechaOperativaPago(
            pagoA
          ).localeCompare(
            fechaOperativaPago(pagoB)
          );
        });

        for (
          let indicePago = 0;
          indicePago < pagosOrdenados.length;
          indicePago += 1
        ) {
          const pago = pagosOrdenados[indicePago];
          const fechaPago = fechaOperativaPago(pago);

          if (!fechaPago) continue;

          const timestampPago =
            timestampRegistroPago(pago);

          if (
            timestampRegistro > 0 &&
            timestampPago > 0 &&
            timestampPago <= timestampRegistro
          ) {
            continue;
          }

          if (
            (!timestampRegistro || !timestampPago) &&
            fechaPago < fechaRegistro
          ) {
            continue;
          }

          const indiceGlobal =
            pagosValidosUnicos.findIndex(
              (registro) =>
                String(registro.id || "") ===
                String(pago.id || "")
            );

          const clavePago = obtenerClavePago(
            pago,
            indiceGlobal >= 0
              ? indiceGlobal
              : indicePago
          );

          const disponible = Number(
            pagosDisponibles.get(clavePago) || 0
          );

          if (disponible <= 0) {
            continue;
          }

          const totalAplicado =
            pagadoEnFecha + pagadoFueraFecha;

          const faltante =
            montoPrometido - totalAplicado;

          if (faltante <= 0) {
            break;
          }

          const montoAplicar = Math.min(
            disponible,
            faltante
          );

          if (fechaPago <= fechaCompromiso) {
            pagadoEnFecha += montoAplicar;
          } else {
            pagadoFueraFecha += montoAplicar;
          }

          pagosDisponibles.set(
            clavePago,
            disponible - montoAplicar
          );

          if (
            pagadoEnFecha + pagadoFueraFecha >=
            montoPrometido
          ) {
            fechaCumplimiento = fechaPago;
            break;
          }
        }
      }

      const pagadoTotal =
        pagadoEnFecha + pagadoFueraFecha;

      const pendiente = Math.max(
        montoPrometido - pagadoTotal,
        0
      );

      let estado = "Activa";

      if (pagadoTotal >= montoPrometido) {
        estado =
          pagadoEnFecha >= montoPrometido
            ? "Cumplida"
            : "Cumplida fuera de fecha";
      } else if (
        fechaOperativa > fechaCompromiso
      ) {
        estado = "Incumplida";
      } else if (pagadoTotal > 0) {
        estado = "Parcial";
      }

      mapaResultados.set(clavePromesa, {
        estado,
        montoPrometido,
        pagadoEnFecha,
        pagadoFueraFecha,
        pagadoTotal,
        pendiente,
        fechaCumplimiento,
      });
    });

    return mapaResultados;
  }, [
    gestiones,
    cartera,
    pagosValidosUnicos,
    fechaOperativa,
  ]);

  function obtenerResultadoPromesa(promesa) {
    const indice = gestiones.findIndex(
      (item) =>
        String(item.id || "") ===
        String(promesa?.id || "")
    );

    const clave = obtenerClavePromesa(
      promesa,
      indice >= 0 ? indice : 0
    );

    return (
      resultadosPromesas.get(clave) || {
        estado: "Activa",
        montoPrometido: Number(
          promesa?.monto_promesa || 0
        ),
        pagadoEnFecha: 0,
        pagadoFueraFecha: 0,
        pagadoTotal: 0,
        pendiente: Number(
          promesa?.monto_promesa || 0
        ),
        fechaCumplimiento: "",
      }
    );
  }

  const promesasPeriodo =
    gestionesPeriodo.filter(esPromesaPago);

  const promesasDetalladas =
    promesasPeriodo.map((promesa) => {
      const cuentaRelacionada =
        obtenerCuentaDePromesa(promesa);

      return {
        promesa,
        cuentaRelacionada,
        cliente: cuentaRelacionada?.cliente,
        gestor:
          cuentaRelacionada?.gestor ||
          promesa.usuario ||
          "Sin asignar",
        resultado: obtenerResultadoPromesa(promesa),
      };
    });

  const promesasActivas =
    promesasDetalladas.filter(
      (item) =>
        item.resultado.estado === "Activa"
    ).length;

  const promesasParciales =
    promesasDetalladas.filter(
      (item) =>
        item.resultado.estado === "Parcial"
    ).length;

  const promesasCumplidas =
    promesasDetalladas.filter(
      (item) =>
        item.resultado.estado === "Cumplida"
    ).length;

  const promesasIncumplidas =
    promesasDetalladas.filter(
      (item) =>
        item.resultado.estado === "Incumplida"
    ).length;

  const promesasFueraFecha =
    promesasDetalladas.filter(
      (item) =>
        item.resultado.estado ===
        "Cumplida fuera de fecha"
    ).length;

  const semaforo = [
    {
      rango: "Al día",
      icono: "🟢",
      items: carteraActivaPorGestor.filter(
        (item) => item.semaforo === "Al día"
      ),
    },
    {
      rango: "1-30 días",
      icono: "🟡",
      items: carteraActivaPorGestor.filter(
        (item) => item.semaforo === "1-30 días"
      ),
    },
    {
      rango: "31-60 días",
      icono: "🟠",
      items: carteraActivaPorGestor.filter(
        (item) => item.semaforo === "31-60 días"
      ),
    },
    {
      rango: "61-90 días",
      icono: "🟧",
      items: carteraActivaPorGestor.filter(
        (item) => item.semaforo === "61-90 días"
      ),
    },
    {
      rango: "Más de 90 días",
      icono: "🔴",
      items: carteraActivaPorGestor.filter(
        (item) =>
          item.semaforo === "Más de 90 días"
      ),
    },
  ].map((item) => ({
    ...item,
    clientes: item.items.length,
    monto: item.items.reduce(
      (suma, cuenta) =>
        suma + cuenta.saldoPendiente,
      0
    ),
  }));

  const riesgo = [
    "Al día",
    "Riesgo bajo",
    "Riesgo medio",
    "Riesgo alto",
    "Riesgo crítico",
    "Legal",
  ].map((nivel) => {
    const items = carteraActivaPorGestor.filter(
      (item) => item.riesgo === nivel
    );

    return {
      riesgo: nivel,
      clientes: items.length,
      monto: items.reduce(
        (suma, item) =>
          suma + item.saldoPendiente,
        0
      ),
    };
  });

  const datosGraficoCartera = semaforo.map((item) => {
    const colores = {
      "Al día": "#22c55e",
      "1-30 días": "#eab308",
      "31-60 días": "#f97316",
      "61-90 días": "#ef4444",
      "Más de 90 días": "#991b1b",
    };

    return {
      etiqueta: item.rango,
      valor: Number(item.monto || 0),
      color: colores[item.rango] || "#94a3b8",
    };
  });

  const datosGraficoPromesas = [
    {
      etiqueta: "Activas",
      valor: promesasActivas,
      color: "#2563eb",
    },
    {
      etiqueta: "Parciales",
      valor: promesasParciales,
      color: "#eab308",
    },
    {
      etiqueta: "Cumplidas",
      valor: promesasCumplidas,
      color: "#22c55e",
    },
    {
      etiqueta: "Incumplidas",
      valor: promesasIncumplidas,
      color: "#ef4444",
    },
    {
      etiqueta: "Fuera de fecha",
      valor: promesasFueraFecha,
      color: "#f97316",
    },
  ];

  const rankingGestores = gestores
    .filter((gestor) => gestor !== "Todos")
    .map((gestor) => {
      const cuentasGestor = cartera.filter(
        (item) => item.gestor === gestor
      );

      const cuentasActivas = cuentasGestor.filter(
        (item) => item.saldoPendiente > 0
      );

      const pagosGestor = pagosValidosUnicos.filter(
        (pago) =>
          obtenerCuentaDelPago(pago)?.gestor === gestor
      );

      const cobrado = sumarPagos(
        pagosGestor,
        filtroDesde,
        filtroHasta
      );

      const saldo = cuentasActivas.reduce(
        (suma, item) =>
          suma + item.saldoPendiente,
        0
      );

      const saldoInicio = saldo + cobrado;

      const gestionesGestor =
        gestionesPeriodo.filter((gestion) =>
          gestionPerteneceGestor(gestion, gestor)
        );

      const promesasGestor =
        gestionesGestor.filter(esPromesaPago);

      const cumplidas = promesasGestor.filter(
        (promesa) =>
          obtenerResultadoPromesa(promesa).estado ===
          "Cumplida"
      ).length;

      const parciales = promesasGestor.filter(
        (promesa) =>
          obtenerResultadoPromesa(promesa).estado ===
          "Parcial"
      ).length;

      const incumplidas = promesasGestor.filter(
        (promesa) =>
          obtenerResultadoPromesa(promesa).estado ===
          "Incumplida"
      ).length;

      return {
        gestor,
        clientesAsignados: cuentasActivas.length,

        clientesGestionados: new Set(
          gestionesGestor
            .map((gestion) => gestion.cliente_id)
            .filter(Boolean)
        ).size,

        gestiones: gestionesGestor.length,
        promesas: promesasGestor.length,
        cumplidas,
        parciales,
        incumplidas,
        cobrado,

        recuperacion:
          saldoInicio > 0
            ? (cobrado / saldoInicio) * 100
            : 0,
      };
    });

  const mayorRiesgo = [
    ...carteraActivaPorGestor,
  ]
    .sort(
      (a, b) =>
        b.dias - a.dias ||
        b.saldoPendiente - a.saldoPendiente
    )
    .slice(0, 10);

  const mayorSaldo = [
    ...carteraActivaPorGestor,
  ]
    .sort(
      (a, b) =>
        b.saldoPendiente - a.saldoPendiente
    )
    .slice(0, 10);

  const pestanas = [
    {
      codigo: "resumen",
      nombre: "Resumen",
      icono: "📊",
    },
    {
      codigo: "cartera",
      nombre: "Cartera",
      icono: "💼",
    },
    {
      codigo: "promesas",
      nombre: "Promesas",
      icono: "🤝",
    },
    {
      codigo: "gestores",
      nombre: "Gestores",
      icono: "👥",
    },
    {
      codigo: "clientes",
      nombre: "Clientes",
      icono: "🧾",
    },
  ];

  if (cargando) {
    return (
      <div style={pagina}>
        <div style={cargandoBox}>
          <strong>
            Cargando Centro de Cobranza...
          </strong>

          <p>
            Calculando cartera, cobros, promesas y gestores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={tituloBox}>
            <img
              src="/konax-logo.png"
              alt="KONAX"
              style={logo}
            />

            <div>
              <span style={encabezadoEtiqueta}>
                CENTRO DE OPERACIONES
              </span>

              <h1 style={titulo}>
                Centro de Cobranza
              </h1>

              <p style={subtitulo}>
                Administración de cartera, recuperación,
                riesgo, promesas y desempeño de gestores.
              </p>

              <div style={estadoActualizacion}>
                <span style={puntoActivo} />

                <span>
                  Fecha Panamá:{" "}
                  <strong>
                    {formatoFecha(fechaOperativa)}
                  </strong>
                </span>

                <span style={separadorEstado}>•</span>

                <span>
                  Actualizado:{" "}
                  <strong>
                    {ultimaActualizacion || "-"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div style={accionesTop}>
            <button
              style={botonDashboard}
              onClick={volverDashboard}
            >
              ← Volver
            </button>

            <button
              style={botonFiltros}
              onClick={() =>
                setMostrarFiltros(!mostrarFiltros)
              }
            >
              {mostrarFiltros
                ? "Ocultar filtros"
                : "Mostrar filtros"}
            </button>

            <button
              style={botonActualizar}
              onClick={() => cargarDatos()}
            >
              Actualizar
            </button>

            <button
              style={botonNegro}
              onClick={() => window.print()}
            >
              Imprimir
            </button>
          </div>
        </div>

        <div style={barraPeriodo}>
          <div style={periodoInfo}>
            <span style={periodoLabel}>
              PERÍODO DE ANÁLISIS
            </span>

            <strong style={periodoValor}>
              {filtroDesde || filtroHasta
                ? `${filtroDesde
                    ? formatoFecha(filtroDesde)
                    : "Inicio"} — ${filtroHasta
                    ? formatoFecha(filtroHasta)
                    : "Hoy"}`
                : "Todo el historial"}
            </strong>
          </div>

          <div style={botonesPeriodo}>
            <button
              style={botonPeriodo}
              onClick={() => aplicarPeriodo("hoy")}
            >
              Hoy
            </button>

            <button
              style={botonPeriodo}
              onClick={() => aplicarPeriodo("7dias")}
            >
              7 días
            </button>

            <button
              style={botonPeriodo}
              onClick={() => aplicarPeriodo("mes")}
            >
              Este mes
            </button>

            <button
              style={botonPeriodo}
              onClick={() =>
                aplicarPeriodo("mesAnterior")
              }
            >
              Mes anterior
            </button>

            <button
              style={botonPeriodoOscuro}
              onClick={() => aplicarPeriodo("todo")}
            >
              Todo
            </button>
          </div>
        </div>

        {mostrarFiltros && (
          <div style={card}>
            <div style={cabeceraSeccion}>
              <div>
                <span style={miniEtiqueta}>
                  CONFIGURACIÓN
                </span>

                <h2 style={tituloSeccion}>
                  Filtros de análisis
                </h2>

                <p style={nota}>
                  Las fechas afectan cobros, gestiones,
                  promesas y efectividad de gestores.
                  La cartera muestra el saldo actual.
                </p>
              </div>

              <button
                style={botonGris}
                onClick={limpiarFiltros}
              >
                Limpiar filtros
              </button>
            </div>

            <div style={gridFiltros}>
              <Campo label="Fecha desde">
                <input
                  type="date"
                  value={filtroDesde}
                  onChange={(event) =>
                    setFiltroDesde(event.target.value)
                  }
                  style={inputStyle}
                />
              </Campo>

              <Campo label="Fecha hasta">
                <input
                  type="date"
                  value={filtroHasta}
                  onChange={(event) =>
                    setFiltroHasta(event.target.value)
                  }
                  style={inputStyle}
                />
              </Campo>

              <Campo label="Gestor">
                <select
                  value={filtroGestor}
                  onChange={(event) =>
                    setFiltroGestor(event.target.value)
                  }
                  style={inputStyle}
                >
                  {gestores.map((gestor) => (
                    <option
                      key={gestor}
                      value={gestor}
                    >
                      {gestor}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </div>
        )}

        <nav style={barraPestanas}>
          {pestanas.map((pestana) => {
            const activa =
              pestana.codigo === pestanaActiva;

            return (
              <button
                key={pestana.codigo}
                type="button"
                onClick={() =>
                  setPestanaActiva(pestana.codigo)
                }
                style={
                  activa
                    ? botonPestanaActiva
                    : botonPestana
                }
              >
                <span>{pestana.icono}</span>
                <span>{pestana.nombre}</span>
              </button>
            );
          })}
        </nav>

        {pestanaActiva === "resumen" && (
          <>
            <div style={cabeceraContenido}>
              <div>
                <span style={miniEtiqueta}>
                  VISIÓN GENERAL
                </span>

                <h2 style={tituloContenido}>
                  Resumen ejecutivo
                </h2>
              </div>

              <span style={badgeGestor}>
                Gestor: {filtroGestor}
              </span>
            </div>

            <div style={kpiGridPrincipal}>
              <KPI
                titulo="Saldo pendiente"
                valor={formato(saldoPendiente)}
                icono="💰"
                variante="oscuro"
                detalle="Saldo actual de la cartera"
              />

              <KPI
                titulo="Cartera en mora"
                valor={formato(carteraMora)}
                icono="🔴"
                variante="rojo"
                detalle={`${porcentajeMora.toFixed(
                  1
                )}% del saldo pendiente`}
              />

              <KPI
                titulo="Cobrado hoy"
                valor={formato(cobradoHoy)}
                icono="✅"
                variante="verde"
                detalle="Pagos procesados en la fecha"
              />

              <KPI
                titulo="Promesas incumplidas"
                valor={promesasIncumplidas}
                icono="⚠️"
                variante="amarillo"
                detalle="Dentro del período seleccionado"
              />
            </div>

            <div style={graficosGrid}>
              <GraficoPastel
                titulo="Distribución de la cartera"
                subtitulo="Saldo pendiente actual por rango de atraso."
                datos={datosGraficoCartera}
                formatearValor={formato}
                textoCentro="Saldo total"
                valorCentro={formato(saldoPendiente)}
              />

              <GraficoPastel
                titulo="Estado de las promesas"
                subtitulo="Resultado de las promesas dentro del período seleccionado."
                datos={datosGraficoPromesas}
                formatearValor={(valor) =>
                  String(valor)
                }
                textoCentro="Promesas"
                valorCentro={String(
                  promesasDetalladas.length
                )}
              />
            </div>

            <div style={kpiGrid}>
              <KPI
                titulo="Cartera original"
                valor={formato(carteraOriginal)}
                icono="🏦"
              />

              <KPI
                titulo="Total recuperado"
                valor={formato(totalRecuperado)}
                icono="♻️"
              />

              <KPI
                titulo="Cartera al día"
                valor={formato(carteraAlDia)}
                icono="🟢"
              />

              <KPI
                titulo="Cobrado período"
                valor={formato(cobradoPeriodo)}
                icono="🧾"
              />

              <KPI
                titulo="% recuperación período"
                valor={`${recuperacionPeriodo.toFixed(
                  1
                )}%`}
                icono="🎯"
              />
            </div>
          </>
        )}

        {pestanaActiva === "cartera" && (
          <>
            <div style={cabeceraContenido}>
              <div>
                <span style={miniEtiqueta}>
                  CONTROL DE CARTERA
                </span>

                <h2 style={tituloContenido}>
                  Cartera y cierre mensual
                </h2>
              </div>
            </div>

            <div style={kpiGrid}>
              <KPI
                titulo="Vencimientos del mes"
                valor={formato(montoVencimientosMes)}
                icono="📅"
              />

              <KPI
                titulo="Cobrado del mes"
                valor={formato(cobradoMes)}
                icono="💵"
              />

              <KPI
                titulo="Pendiente del mes"
                valor={formato(pendienteMes)}
                icono="⏳"
              />

              <KPI
                titulo="Mora anterior"
                valor={formato(moraAnteriorInicio)}
                icono="📂"
              />

              <KPI
                titulo="Mora recuperada"
                valor={formato(
                  moraAnteriorRecuperada
                )}
                icono="♻️"
              />

              <KPI
                titulo="Mora pendiente"
                valor={formato(
                  moraAnteriorPendiente
                )}
                icono="⚠️"
              />

              <KPI
                titulo="Saldo vencido pendiente"
                valor={formato(
                  saldoVencidoPendiente
                )}
                icono="➡️"
              />

              <KPI
                titulo="Cobrado de vencimientos"
                valor={formato(
                  cobradoVencimientosMes
                )}
                icono="✅"
              />
            </div>

            <div style={gridDos}>
              <TablaSimple
                titulo="Semáforo de cartera"
                columnas={[
                  "Rango",
                  "Clientes",
                  "Monto",
                ]}
                filas={semaforo.map((item) => [
                  `${item.icono} ${item.rango}`,
                  item.clientes,
                  formato(item.monto),
                ])}
              />

              <TablaSimple
                titulo="Riesgo de cartera"
                columnas={[
                  "Riesgo",
                  "Clientes",
                  "Monto",
                ]}
                filas={riesgo.map((item) => [
                  item.riesgo,
                  item.clientes,
                  formato(item.monto),
                ])}
              />
            </div>
          </>
        )}

        {pestanaActiva === "promesas" && (
          <>
            <div style={cabeceraContenido}>
              <div>
                <span style={miniEtiqueta}>
                  SEGUIMIENTO
                </span>

                <h2 style={tituloContenido}>
                  Promesas y actividad
                </h2>
              </div>
            </div>

            <div style={kpiGrid}>
              <KPI
                titulo="Promesas activas"
                valor={promesasActivas}
                icono="🤝"
              />

              <KPI
                titulo="Promesas parciales"
                valor={promesasParciales}
                icono="🟡"
              />

              <KPI
                titulo="Promesas cumplidas"
                valor={promesasCumplidas}
                icono="✅"
              />

              <KPI
                titulo="Promesas incumplidas"
                valor={promesasIncumplidas}
                icono="⚠️"
              />

              <KPI
                titulo="Cumplidas fuera de fecha"
                valor={promesasFueraFecha}
                icono="⏰"
              />

              <KPI
                titulo="Gestiones del período"
                valor={gestionesPeriodo.length}
                icono="☎️"
              />
            </div>

            <GraficoPastel
              titulo="Estado de las promesas"
              subtitulo="Distribución de promesas dentro del período seleccionado."
              datos={datosGraficoPromesas}
              formatearValor={(valor) =>
                String(valor)
              }
              textoCentro="Promesas"
              valorCentro={String(
                promesasDetalladas.length
              )}
            />

            <Tabla
              titulo="Detalle de promesas"
              columnas={[
                "Cliente",
                "Cuenta",
                "Fecha registro",
                "Fecha prometida",
                "Monto prometido",
                "Pagado aplicado",
                "Pendiente",
                "Estado",
                "Gestor",
              ]}
              filas={promesasDetalladas.map(
                (item) => [
                  item.cliente?.nombre ||
                    "Sin nombre",
                  item.cuentaRelacionada?.cuenta
                    ?.numero_cuenta || "-",
                  formatoFecha(
                    item.promesa.created_at ||
                      item.promesa.fecha_gestion
                  ),
                  formatoFecha(
                    item.promesa.proxima_gestion
                  ),
                  formato(
                    item.resultado.montoPrometido
                  ),
                  formato(
                    item.resultado.pagadoTotal
                  ),
                  formato(
                    item.resultado.pendiente
                  ),
                  item.resultado.estado,
                  item.gestor,
                ]
              )}
            />
          </>
        )}

        {pestanaActiva === "gestores" && (
          <>
            <div style={cabeceraContenido}>
              <div>
                <span style={miniEtiqueta}>
                  PRODUCTIVIDAD
                </span>

                <h2 style={tituloContenido}>
                  Efectividad por gestor
                </h2>
              </div>
            </div>

            <div style={gestoresCards}>
              {rankingGestores.length === 0 ? (
                <div style={card}>
                  No hay gestores disponibles.
                </div>
              ) : (
                rankingGestores.map((item) => (
                  <div
                    key={item.gestor}
                    style={gestorCard}
                  >
                    <div style={gestorCabecera}>
                      <div style={avatarGestor}>
                        {String(item.gestor)
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong style={gestorNombre}>
                          {item.gestor}
                        </strong>

                        <span style={gestorDetalle}>
                          {item.clientesAsignados} clientes
                          asignados
                        </span>
                      </div>
                    </div>

                    <div style={barraRecuperacion}>
                      <div
                        style={{
                          ...barraRecuperacionActiva,
                          width: `${Math.min(
                            item.recuperacion,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <div style={gestorMetricas}>
                      <div style={gestorMetricasItem}>
                        <span style={gestorMetricasTexto}>
                          Recuperado
                        </span>
                        <strong style={gestorMetricasValor}>
                          {formato(item.cobrado)}
                        </strong>
                      </div>

                      <div style={gestorMetricasItem}>
                        <span style={gestorMetricasTexto}>
                          Recuperación
                        </span>
                        <strong style={gestorMetricasValor}>
                          {item.recuperacion.toFixed(
                            1
                          )}
                          %
                        </strong>
                      </div>

                      <div style={gestorMetricasItem}>
                        <span style={gestorMetricasTexto}>
                          Gestiones
                        </span>
                        <strong style={gestorMetricasValor}>
                          {item.gestiones}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Tabla
              titulo="Detalle de efectividad"
              columnas={[
                "Gestor",
                "Clientes asignados",
                "Clientes gestionados",
                "Gestiones",
                "Promesas",
                "Cumplidas",
                "Parciales",
                "Incumplidas",
                "Monto recuperado",
                "% recuperación",
              ]}
              filas={rankingGestores.map(
                (item) => [
                  item.gestor,
                  item.clientesAsignados,
                  item.clientesGestionados,
                  item.gestiones,
                  item.promesas,
                  item.cumplidas,
                  item.parciales,
                  item.incumplidas,
                  formato(item.cobrado),
                  `${item.recuperacion.toFixed(
                    1
                  )}%`,
                ]
              )}
            />
          </>
        )}

        {pestanaActiva === "clientes" && (
          <>
            <div style={cabeceraContenido}>
              <div>
                <span style={miniEtiqueta}>
                  PRIORIDADES
                </span>

                <h2 style={tituloContenido}>
                  Clientes que requieren atención
                </h2>
              </div>
            </div>

            <Tabla
              titulo="Top clientes de mayor riesgo"
              columnas={[
                "Cliente",
                "Cuenta",
                "Días",
                "Riesgo",
                "Saldo",
                "Gestor",
              ]}
              filas={mayorRiesgo.map((item) => [
                item.cliente?.nombre ||
                  "Sin nombre",
                item.cuenta?.numero_cuenta || "-",
                item.dias,
                item.riesgo,
                formato(item.saldoPendiente),
                item.gestor,
              ])}
            />

            <Tabla
              titulo="Top clientes con mayor saldo"
              columnas={[
                "Cliente",
                "Cuenta",
                "Saldo",
                "Estado",
                "Gestor",
              ]}
              filas={mayorSaldo.map((item) => [
                item.cliente?.nombre ||
                  "Sin nombre",
                item.cuenta?.numero_cuenta || "-",
                formato(item.saldoPendiente),
                item.estado,
                item.gestor,
              ])}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      {children}
    </div>
  );
}

function KPI({
  titulo,
  valor,
  icono,
  detalle = "",
  variante = "normal",
}) {
  const estilos = {
    normal: cardIndicador,
    oscuro: {
      ...cardIndicador,
      background:
        "linear-gradient(145deg,#111827,#1f2937)",
      color: "#ffffff",
    },
    rojo: {
      ...cardIndicador,
      background:
        "linear-gradient(145deg,#7f1d1d,#991b1b)",
      color: "#ffffff",
    },
    verde: {
      ...cardIndicador,
      background:
        "linear-gradient(145deg,#14532d,#166534)",
      color: "#ffffff",
    },
    amarillo: {
      ...cardIndicador,
      background:
        "linear-gradient(145deg,#78350f,#92400e)",
      color: "#ffffff",
    },
  };

  const esEspecial = variante !== "normal";

  return (
    <div style={estilos[variante] || cardIndicador}>
      <div style={kpiSuperior}>
        <div
          style={
            esEspecial
              ? iconoBoxEspecial
              : iconoBox
          }
        >
          {icono}
        </div>

        <span
          style={
            esEspecial
              ? cardTituloEspecial
              : cardTitulo
          }
        >
          {titulo}
        </span>
      </div>

      <h2
        style={
          esEspecial
            ? cardNumeroEspecial
            : cardNumero
        }
      >
        {valor}
      </h2>

      {detalle ? (
        <p
          style={
            esEspecial
              ? cardDetalleEspecial
              : cardDetalle
          }
        >
          {detalle}
        </p>
      ) : null}
    </div>
  );
}

function GraficoPastel({
  titulo,
  subtitulo,
  datos = [],
  formatearValor = (valor) => valor,
  textoCentro = "",
  valorCentro = "",
}) {
  const total = datos.reduce(
    (suma, item) =>
      suma + Number(item.valor || 0),
    0
  );

  let acumulado = 0;

  const partesGradiente = datos
    .filter(
      (item) => Number(item.valor || 0) > 0
    )
    .map((item) => {
      const inicio =
        total > 0
          ? (acumulado / total) * 100
          : 0;

      acumulado += Number(item.valor || 0);

      const fin =
        total > 0
          ? (acumulado / total) * 100
          : 0;

      return `${item.color} ${inicio}% ${fin}%`;
    });

  const fondoGrafico =
    partesGradiente.length > 0
      ? `conic-gradient(${partesGradiente.join(
          ", "
        )})`
      : "conic-gradient(#e5e7eb 0% 100%)";

  return (
    <div style={graficoCard}>
      <div style={graficoEncabezado}>
        <div>
          <span style={miniEtiqueta}>
            VISUALIZACIÓN
          </span>

          <h2 style={graficoTitulo}>
            {titulo}
          </h2>

          <p style={graficoSubtitulo}>
            {subtitulo}
          </p>
        </div>

        <span style={graficoBadge}>
          Datos actuales
        </span>
      </div>

      <div style={graficoContenido}>
        <div style={graficoPastelBox}>
          <div
            style={{
              ...graficoPastel,
              background: fondoGrafico,
            }}
          >
            <div style={graficoCentro}>
              <span style={graficoCentroTexto}>
                {textoCentro}
              </span>

              <strong style={graficoCentroValor}>
                {valorCentro}
              </strong>
            </div>
          </div>
        </div>

        <div style={graficoLeyenda}>
          {datos.map((item) => {
            const porcentaje =
              total > 0
                ? (Number(item.valor || 0) /
                    total) *
                  100
                : 0;

            return (
              <div
                key={item.etiqueta}
                style={graficoLeyendaFila}
              >
                <div style={graficoLeyendaNombre}>
                  <span
                    style={{
                      ...graficoPunto,
                      background: item.color,
                    }}
                  />

                  <span>{item.etiqueta}</span>
                </div>

                <div style={graficoLeyendaValores}>
                  <strong>
                    {formatearValor(item.valor)}
                  </strong>

                  <span style={graficoPorcentaje}>
                    {porcentaje.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TablaSimple({
  titulo,
  columnas,
  filas,
}) {
  return (
    <div style={card}>
      <div style={tablaCabecera}>
        <h2 style={tituloSeccion}>
          {titulo}
        </h2>

        <span style={tablaCantidad}>
          {filas.length} registros
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tabla}>
          <thead>
            <tr>
              {columnas.map((columna, index) => (
                <th key={index} style={th}>
                  {columna}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td
                  style={td}
                  colSpan={columnas.length}
                >
                  No hay datos disponibles.
                </td>
              </tr>
            ) : (
              filas.map((fila, index) => (
                <tr key={index}>
                  {fila.map(
                    (celda, indiceCelda) => (
                      <td
                        key={indiceCelda}
                        style={td}
                      >
                        {celda}
                      </td>
                    )
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tabla({ titulo, columnas, filas }) {
  function renderCelda(celda) {
    const texto = String(celda || "");
    const normalizado = texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    const estados = {
      activa: estadoAzul,
      parcial: estadoAmarillo,
      cumplida: estadoVerde,
      incumplida: estadoRojo,
      "cumplida fuera de fecha": estadoNaranja,
      mora: estadoRojo,
      "al dia": estadoVerde,
      legal: estadoOscuro,
      "riesgo critico": estadoRojo,
      "riesgo alto": estadoNaranja,
      "riesgo medio": estadoAmarillo,
      "riesgo bajo": estadoAzul,
    };

    if (estados[normalizado]) {
      return (
        <span style={estados[normalizado]}>
          {texto}
        </span>
      );
    }

    return celda;
  }

  return (
    <div style={card}>
      <div style={tablaCabecera}>
        <h2 style={tituloSeccion}>
          {titulo}
        </h2>

        <span style={tablaCantidad}>
          {filas.length} registros
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tabla}>
          <thead>
            <tr>
              {columnas.map((columna, index) => (
                <th key={index} style={th}>
                  {columna}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td
                  style={td}
                  colSpan={columnas.length}
                >
                  No hay datos disponibles.
                </td>
              </tr>
            ) : (
              filas.map((fila, index) => (
                <tr key={index}>
                  {fila.map(
                    (celda, indiceCelda) => (
                      <td
                        key={indiceCelda}
                        style={td}
                      >
                        {renderCelda(celda)}
                      </td>
                    )
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f1f5f9",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1500px",
  margin: "0 auto",
};

const cargandoBox = {
  maxWidth: "500px",
  margin: "100px auto",
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  boxShadow:
    "0 3px 12px rgba(0,0,0,0.08)",
};

const encabezado = {
  background:
    "linear-gradient(135deg,#071a13 0%,#123c2a 55%,#166534 100%)",
  color: "#ffffff",
  padding: "24px",
  borderRadius: "22px",
  marginBottom: "14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  boxShadow:
    "0 14px 34px rgba(15,23,42,0.16)",
};

const tituloBox = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const logo = {
  width: "88px",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "8px",
};

const encabezadoEtiqueta = {
  display: "block",
  marginBottom: "6px",
  color: "#86efac",
  fontSize: "10px",
  fontWeight: "900",
  letterSpacing: "1.3px",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
};

const subtitulo = {
  marginTop: "5px",
  color: "#d1fae5",
  fontSize: "14px",
};

const estadoActualizacion = {
  marginTop: "10px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#bbf7d0",
  fontSize: "12px",
  flexWrap: "wrap",
};

const puntoActivo = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#4ade80",
  boxShadow:
    "0 0 0 5px rgba(74,222,128,0.12)",
};

const separadorEstado = {
  opacity: 0.6,
};

const accionesTop = {
  display: "flex",
  gap: "9px",
  flexWrap: "wrap",
};

const botonDashboard = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "11px 16px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonFiltros = {
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  border:
    "1px solid rgba(255,255,255,0.24)",
  padding: "11px 16px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonActualizar = {
  background: "#22c55e",
  color: "#052e16",
  border: "none",
  padding: "11px 16px",
  borderRadius: "10px",
  fontWeight: "900",
  cursor: "pointer",
};

const botonNegro = {
  background: "#020617",
  color: "#ffffff",
  border:
    "1px solid rgba(255,255,255,0.25)",
  padding: "11px 16px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const barraPeriodo = {
  background: "#ffffff",
  padding: "14px 16px",
  borderRadius: "16px",
  marginBottom: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap",
  border: "1px solid #e2e8f0",
};

const periodoInfo = {
  display: "grid",
  gap: "4px",
};

const periodoLabel = {
  color: "#64748b",
  fontSize: "9px",
  fontWeight: "900",
  letterSpacing: "1.1px",
};

const periodoValor = {
  color: "#0f172a",
  fontSize: "14px",
};

const botonesPeriodo = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  flexWrap: "wrap",
};

const botonPeriodo = {
  border: "1px solid #dbe3df",
  background: "#f8fafc",
  color: "#334155",
  padding: "8px 12px",
  borderRadius: "9px",
  fontSize: "12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonPeriodoOscuro = {
  ...botonPeriodo,
  background: "#0f172a",
  borderColor: "#0f172a",
  color: "#ffffff",
};

const card = {
  background: "#ffffff",
  padding: "19px",
  borderRadius: "18px",
  marginBottom: "16px",
  border: "1px solid #e2e8f0",
  boxShadow:
    "0 5px 18px rgba(15,23,42,0.05)",
};

const cabeceraSeccion = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  marginBottom: "14px",
  flexWrap: "wrap",
};

const tituloSeccion = {
  margin: 0,
  color: "#0f172a",
  fontSize: "20px",
};

const miniEtiqueta = {
  display: "block",
  marginBottom: "5px",
  color: "#16834f",
  fontSize: "9px",
  fontWeight: "900",
  letterSpacing: "1.2px",
};

const nota = {
  margin: "7px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.5,
};

const botonGris = {
  background: "#64748b",
  color: "#ffffff",
  border: "none",
  padding: "10px 16px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const gridFiltros = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(210px,1fr))",
  gap: "12px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "12px",
  fontWeight: "bold",
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "9px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
};

const barraPestanas = {
  display: "flex",
  gap: "8px",
  marginBottom: "18px",
  padding: "6px",
  borderRadius: "14px",
  background: "#e2e8f0",
  overflowX: "auto",
};

const botonPestana = {
  minHeight: "43px",
  padding: "0 16px",
  border: "1px solid transparent",
  borderRadius: "10px",
  background: "transparent",
  color: "#475569",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const botonPestanaActiva = {
  ...botonPestana,
  background: "#ffffff",
  color: "#166534",
  borderColor: "#d1fae5",
  boxShadow:
    "0 4px 12px rgba(15,23,42,0.08)",
};

const cabeceraContenido = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "14px",
  margin: "20px 2px 13px",
};

const tituloContenido = {
  margin: 0,
  color: "#0f172a",
  fontSize: "25px",
};

const badgeGestor = {
  padding: "7px 11px",
  borderRadius: "999px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: "11px",
  fontWeight: "bold",
};

const kpiGridPrincipal = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(230px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(205px,1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const cardIndicador = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "17px",
  border: "1px solid #e2e8f0",
  boxShadow:
    "0 5px 16px rgba(15,23,42,0.05)",
};

const kpiSuperior = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const iconoBox = {
  width: "36px",
  height: "36px",
  borderRadius: "11px",
  background: "#f1f5f9",
  display: "grid",
  placeItems: "center",
  fontSize: "18px",
};

const iconoBoxEspecial = {
  ...iconoBox,
  background: "rgba(255,255,255,0.12)",
};

const cardTitulo = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "bold",
};

const cardTituloEspecial = {
  color: "rgba(255,255,255,0.78)",
  fontSize: "13px",
  fontWeight: "bold",
};

const cardNumero = {
  margin: "15px 0 0",
  color: "#0f172a",
  fontSize: "25px",
};

const cardNumeroEspecial = {
  margin: "15px 0 0",
  color: "#ffffff",
  fontSize: "25px",
};

const cardDetalle = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "11px",
};

const cardDetalleEspecial = {
  margin: "8px 0 0",
  color: "rgba(255,255,255,0.7)",
  fontSize: "11px",
};

const graficosGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(390px,1fr))",
  gap: "16px",
  marginBottom: "18px",
};

const graficoCard = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  border: "1px solid #e2e8f0",
  boxShadow:
    "0 5px 18px rgba(15,23,42,0.05)",
  marginBottom: "16px",
};

const graficoEncabezado = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "18px",
};

const graficoTitulo = {
  margin: 0,
  color: "#0f172a",
  fontSize: "20px",
};

const graficoSubtitulo = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.5,
};

const graficoBadge = {
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#ecfdf5",
  color: "#166534",
  fontSize: "10px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const graficoContenido = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: "22px",
  alignItems: "center",
};

const graficoPastelBox = {
  display: "grid",
  placeItems: "center",
};

const graficoPastel = {
  width: "190px",
  height: "190px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  boxShadow:
    "inset 0 0 0 1px rgba(15,23,42,0.05)",
};

const graficoCentro = {
  width: "116px",
  height: "116px",
  borderRadius: "50%",
  background: "#ffffff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "10px",
  boxSizing: "border-box",
  boxShadow:
    "0 3px 12px rgba(15,23,42,0.08)",
};

const graficoCentroTexto = {
  color: "#64748b",
  fontSize: "10px",
  marginBottom: "6px",
};

const graficoCentroValor = {
  color: "#0f172a",
  fontSize: "14px",
  lineHeight: 1.25,
};

const graficoLeyenda = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const graficoLeyendaFila = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "9px 10px",
  borderRadius: "10px",
  background: "#f8fafc",
};

const graficoLeyendaNombre = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#334155",
  fontSize: "12px",
};

const graficoPunto = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  flexShrink: 0,
};

const graficoLeyendaValores = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#0f172a",
  fontSize: "11px",
  whiteSpace: "nowrap",
};

const graficoPorcentaje = {
  minWidth: "49px",
  padding: "4px 7px",
  borderRadius: "999px",
  background: "#e2e8f0",
  color: "#475569",
  fontSize: "9px",
  fontWeight: "bold",
  textAlign: "center",
};

const gridDos = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(360px,1fr))",
  gap: "16px",
};

const tablaCabecera = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "14px",
};

const tablaCantidad = {
  padding: "5px 9px",
  borderRadius: "999px",
  background: "#f1f5f9",
  color: "#64748b",
  fontSize: "10px",
  fontWeight: "bold",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  background: "#0f172a",
  color: "#ffffff",
  padding: "12px",
  textAlign: "left",
  whiteSpace: "nowrap",
  fontSize: "12px",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: "12px",
};

const estadoBase = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const estadoVerde = {
  ...estadoBase,
  background: "#dcfce7",
  color: "#166534",
};

const estadoRojo = {
  ...estadoBase,
  background: "#fee2e2",
  color: "#991b1b",
};

const estadoAmarillo = {
  ...estadoBase,
  background: "#fef3c7",
  color: "#92400e",
};

const estadoNaranja = {
  ...estadoBase,
  background: "#ffedd5",
  color: "#9a3412",
};

const estadoAzul = {
  ...estadoBase,
  background: "#dbeafe",
  color: "#1d4ed8",
};

const estadoOscuro = {
  ...estadoBase,
  background: "#e2e8f0",
  color: "#0f172a",
};

const gestoresCards = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(260px,1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const gestorCard = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "17px",
  border: "1px solid #e2e8f0",
};

const gestorCabecera = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
};

const avatarGestor = {
  width: "42px",
  height: "42px",
  borderRadius: "13px",
  display: "grid",
  placeItems: "center",
  background: "#166534",
  color: "#ffffff",
  fontWeight: "900",
};

const gestorNombre = {
  display: "block",
  color: "#0f172a",
  fontSize: "14px",
};

const gestorDetalle = {
  display: "block",
  marginTop: "3px",
  color: "#64748b",
  fontSize: "10px",
};

const barraRecuperacion = {
  height: "9px",
  margin: "16px 0",
  borderRadius: "999px",
  overflow: "hidden",
  background: "#e2e8f0",
};

const barraRecuperacionActiva = {
  height: "100%",
  borderRadius: "999px",
  background:
    "linear-gradient(90deg,#16a34a,#4ade80)",
};

const gestorMetricas = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",
  gap: "8px",
};

const gestorMetricasItem = {
  display: "grid",
  gap: "4px",
};

const gestorMetricasTexto = {
  color: "#64748b",
  fontSize: "9px",
};

const gestorMetricasValor = {
  color: "#0f172a",
  fontSize: "12px",
};
