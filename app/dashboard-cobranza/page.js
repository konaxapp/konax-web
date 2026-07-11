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

  const [fechaOperativa, setFechaOperativa] = useState(
    obtenerFechaPanama()
  );

  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      const nuevaFecha = obtenerFechaPanama();

      setFechaOperativa((fechaActual) => {
        if (fechaActual !== nuevaFecha) {
          return nuevaFecha;
        }

        return fechaActual;
      });
    }, 30000);

    return () => {
      window.clearInterval(intervalo);
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

  /*
    CORRECCIÓN IMPORTANTE:
    Para saber cuándo se registró realmente una gestión o promesa,
    se usa primero created_at porque contiene fecha y hora exacta.
    fecha_gestion puede contener solamente YYYY-MM-DD.
  */
  function fechaRegistroGestion(gestion) {
    return fechaSimple(
      gestion?.created_at ||
        gestion?.fecha_gestion
    );
  }

  function timestampSeguro(fecha) {
    if (!fecha) return 0;

    let texto = String(fecha).trim();

    /*
      PostgreSQL puede devolver fechas así:
      2026-07-11 03:39:48.088951

      La promesa puede venir así:
      2026-07-11T03:47:54.676304+00:00

      Para compararlas correctamente:
      1. Convertimos el espacio entre fecha y hora en "T".
      2. Si la fecha no trae zona horaria, la tratamos como UTC.
      3. Comparamos ambas usando milisegundos UTC.
    */

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

  /*
    CORRECCIÓN IMPORTANTE:
    Se usa primero created_at para impedir que un pago registrado antes
    de la promesa, pero durante el mismo día, sea aplicado a esa promesa.
  */
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

    return "Legal";
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

  async function cargarDatos() {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) return;

    setCargando(true);
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

    setCargando(false);
  }

  function limpiarFiltros() {
    setFiltroDesde("");
    setFiltroHasta("");
    setFiltroGestor("Todos");
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

  if (cargando) {
    return (
      <div style={pagina}>
        <div style={cargandoBox}>
          <strong>
            Cargando Dashboard Cobranza...
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
              <h1 style={titulo}>
                Dashboard Cobranza
              </h1>

              <p style={subtitulo}>
                Administración de cartera, recuperación,
                riesgo, promesas y gestores.
              </p>

              <p style={fechaDashboard}>
                Fecha operativa de Panamá:{" "}
                <strong>
                  {formatoFecha(fechaOperativa)}
                </strong>
              </p>
            </div>
          </div>

          <div style={accionesTop}>
            <button
              style={botonDashboard}
              onClick={volverDashboard}
            >
              ← Volver al Dashboard
            </button>

            <button
              style={botonActualizar}
              onClick={cargarDatos}
            >
              Actualizar
            </button>

            <button
              style={botonNegro}
              onClick={() => window.print()}
            >
              Imprimir Reporte
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>
            Filtros de análisis
          </h2>

          <p style={nota}>
            Las fechas afectan cobros, gestiones,
            promesas y efectividad de gestores.
            La cartera muestra el saldo actual.
          </p>

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

          <button
            style={botonGris}
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>
        </div>

        <h2 style={seccionTitulo}>
          Resumen Ejecutivo
        </h2>

        <div style={kpiGrid}>
          <KPI titulo="Cartera Original" valor={formato(carteraOriginal)} icono="🏦" />
          <KPI titulo="Total Recuperado" valor={formato(totalRecuperado)} icono="✅" />
          <KPI titulo="Saldo Pendiente" valor={formato(saldoPendiente)} icono="💰" />
          <KPI titulo="Cartera Al Día" valor={formato(carteraAlDia)} icono="🟢" />
          <KPI titulo="Cartera en Mora" valor={formato(carteraMora)} icono="🔴" />
          <KPI titulo="% Mora" valor={`${porcentajeMora.toFixed(1)}%`} icono="📈" />
          <KPI titulo="Cobrado Periodo" valor={formato(cobradoPeriodo)} icono="🧾" />
          <KPI titulo="% Recuperación Periodo" valor={`${recuperacionPeriodo.toFixed(1)}%`} icono="🎯" />
        </div>

        <h2 style={seccionTitulo}>
          Cierre Mensual
        </h2>

        <div style={kpiGrid}>
          <KPI titulo="Vencimientos del Mes" valor={formato(montoVencimientosMes)} icono="📅" />
          <KPI titulo="Cobrado del Mes" valor={formato(cobradoMes)} icono="💵" />
          <KPI titulo="Cobrado de Vencimientos" valor={formato(cobradoVencimientosMes)} icono="✅" />
          <KPI titulo="Pendiente del Mes" valor={formato(pendienteMes)} icono="⏳" />
          <KPI titulo="Mora Anterior" valor={formato(moraAnteriorInicio)} icono="📂" />
          <KPI titulo="Mora Recuperada" valor={formato(moraAnteriorRecuperada)} icono="♻️" />
          <KPI titulo="Mora Pendiente" valor={formato(moraAnteriorPendiente)} icono="⚠️" />
          <KPI titulo="Saldo Vencido Pendiente" valor={formato(saldoVencidoPendiente)} icono="➡️" />
        </div>

        <h2 style={seccionTitulo}>
          Promesas y Actividad
        </h2>

        <div style={kpiGrid}>
          <KPI titulo="Cobrado Hoy" valor={formato(cobradoHoy)} icono="📅" />
          <KPI titulo="Promesas Activas" valor={promesasActivas} icono="🤝" />
          <KPI titulo="Promesas Parciales" valor={promesasParciales} icono="🟡" />
          <KPI titulo="Promesas Cumplidas" valor={promesasCumplidas} icono="✅" />
          <KPI titulo="Promesas Incumplidas" valor={promesasIncumplidas} icono="⚠️" />
          <KPI titulo="Cumplidas Fuera de Fecha" valor={promesasFueraFecha} icono="⏰" />
          <KPI titulo="Gestiones Periodo" valor={gestionesPeriodo.length} icono="☎️" />
        </div>

        <Tabla
          titulo="Detalle de Promesas"
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
          filas={promesasDetalladas.map((item) => [
            item.cliente?.nombre || "Sin nombre",
            item.cuentaRelacionada?.cuenta?.numero_cuenta || "-",
            formatoFecha(item.promesa.created_at || item.promesa.fecha_gestion),
            formatoFecha(item.promesa.proxima_gestion),
            formato(item.resultado.montoPrometido),
            formato(item.resultado.pagadoTotal),
            formato(item.resultado.pendiente),
            item.resultado.estado,
            item.gestor,
          ])}
        />

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>
              Semáforo de Cartera
            </h2>

            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Rango</th>
                  <th style={th}>Clientes</th>
                  <th style={th}>Monto</th>
                </tr>
              </thead>

              <tbody>
                {semaforo.map((item) => (
                  <tr key={item.rango}>
                    <td style={td}>
                      {item.icono} {item.rango}
                    </td>

                    <td style={td}>
                      {item.clientes}
                    </td>

                    <td style={td}>
                      {formato(item.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>
              Riesgo de Cartera
            </h2>

            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Riesgo</th>
                  <th style={th}>Clientes</th>
                  <th style={th}>Monto</th>
                </tr>
              </thead>

              <tbody>
                {riesgo.map((item) => (
                  <tr key={item.riesgo}>
                    <td style={td}>
                      {item.riesgo}
                    </td>

                    <td style={td}>
                      {item.clientes}
                    </td>

                    <td style={td}>
                      {formato(item.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Tabla
          titulo="Efectividad por Gestor"
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
          filas={rankingGestores.map((item) => [
            item.gestor,
            item.clientesAsignados,
            item.clientesGestionados,
            item.gestiones,
            item.promesas,
            item.cumplidas,
            item.parciales,
            item.incumplidas,
            formato(item.cobrado),
            `${item.recuperacion.toFixed(1)}%`,
          ])}
        />

        <Tabla
          titulo="Top Clientes de Mayor Riesgo"
          columnas={[
            "Cliente",
            "Cuenta",
            "Días",
            "Riesgo",
            "Saldo",
            "Gestor",
          ]}
          filas={mayorRiesgo.map((item) => [
            item.cliente?.nombre || "Sin nombre",
            item.cuenta?.numero_cuenta || "-",
            item.dias,
            item.riesgo,
            formato(item.saldoPendiente),
            item.gestor,
          ])}
        />

        <Tabla
          titulo="Top Clientes con Mayor Saldo"
          columnas={[
            "Cliente",
            "Cuenta",
            "Saldo",
            "Estado",
            "Gestor",
          ]}
          filas={mayorSaldo.map((item) => [
            item.cliente?.nombre || "Sin nombre",
            item.cuenta?.numero_cuenta || "-",
            formato(item.saldoPendiente),
            item.estado,
            item.gestor,
          ])}
        />
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

function KPI({ titulo, valor, icono }) {
  return (
    <div style={cardIndicador}>
      <div style={iconoBox}>{icono}</div>

      <p style={cardTitulo}>
        {titulo}
      </p>

      <h2 style={cardNumero}>
        {valor}
      </h2>
    </div>
  );
}

function Tabla({ titulo, columnas, filas }) {
  return (
    <div style={card}>
      <h2 style={tituloSeccion}>
        {titulo}
      </h2>

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

const pagina = {
  minHeight: "100vh",
  background: "#eef2f7",
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
    "linear-gradient(135deg, #111827, #1e40af)",
  color: "#ffffff",
  padding: "24px",
  borderRadius: "20px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow:
    "0 8px 24px rgba(0,0,0,0.14)",
};

const tituloBox = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const logo = {
  width: "90px",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "8px",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
};

const subtitulo = {
  marginTop: "5px",
  color: "#dbeafe",
  fontSize: "15px",
};

const fechaDashboard = {
  margin: "7px 0 0",
  color: "#bfdbfe",
  fontSize: "13px",
};

const accionesTop = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const botonDashboard = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonActualizar = {
  background: "#16a34a",
  color: "#ffffff",
  border: "1px solid #ffffff",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonNegro = {
  background: "#111827",
  color: "#ffffff",
  border: "1px solid #ffffff",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonGris = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "14px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "16px",
  boxShadow:
    "0 3px 12px rgba(0,0,0,0.06)",
};

const tituloSeccion = {
  marginTop: 0,
  marginBottom: "14px",
  color: "#111827",
};

const seccionTitulo = {
  margin: "22px 0 12px",
  color: "#111827",
};

const nota = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: 1.5,
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
  fontSize: "13px",
  fontWeight: "bold",
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(210px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const cardIndicador = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  boxShadow:
    "0 3px 12px rgba(0,0,0,0.06)",
};

const iconoBox = {
  fontSize: "24px",
  marginBottom: "8px",
};

const cardTitulo = {
  margin: 0,
  color: "#6b7280",
  fontSize: "14px",
};

const cardNumero = {
  marginTop: "8px",
  color: "#111827",
  fontSize: "25px",
};

const gridDos = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(360px,1fr))",
  gap: "16px",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  background: "#111827",
  color: "#ffffff",
  padding: "12px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const td = {
  padding: "11px",
  borderBottom: "1px solid #e5e7eb",
};
