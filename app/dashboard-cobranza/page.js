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
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
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

  function limpiarTexto(texto) {
    return String(texto || "")
      .toLowerCase()
      .trim();
  }

  function esFechaSimple(fecha) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
      String(fecha || "").trim()
    );
  }

  function fechaPanamaISO(fecha = new Date()) {
    const objetoFecha =
      fecha instanceof Date
        ? fecha
        : new Date(fecha);

    if (
      Number.isNaN(
        objetoFecha.getTime()
      )
    ) {
      return "";
    }

    const partes =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "America/Panama",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).formatToParts(objetoFecha);

    const year =
      partes.find(
        (parte) =>
          parte.type === "year"
      )?.value || "";

    const month =
      partes.find(
        (parte) =>
          parte.type === "month"
      )?.value || "";

    const day =
      partes.find(
        (parte) =>
          parte.type === "day"
      )?.value || "";

    return `${year}-${month}-${day}`;
  }

  function fechaSimple(fecha) {
    if (!fecha) {
      return "";
    }

    const texto =
      String(fecha).trim();

    if (esFechaSimple(texto)) {
      return texto;
    }

    return fechaPanamaISO(texto);
  }

  function fechaPago(pago) {
    if (pago?.fecha_pago) {
      return fechaSimple(
        pago.fecha_pago
      );
    }

    if (pago?.fecha) {
      return fechaSimple(
        pago.fecha
      );
    }

    return fechaSimple(
      pago?.created_at
    );
  }

  function fechaGestion(gestion) {
    return fechaSimple(
      gestion?.fecha_gestion ||
        gestion?.created_at
    );
  }

  function hoyISO() {
    return fechaPanamaISO(
      new Date()
    );
  }

  function inicioMesActual() {
    const hoy = hoyISO();

    if (!hoy) {
      return "";
    }

    return `${hoy.slice(0, 7)}-01`;
  }

  function finMesActual() {
    const hoy = hoyISO();

    if (!hoy) {
      return "";
    }

    const [year, month] =
      hoy.split("-").map(Number);

    const ultimoDia =
      new Date(
        year,
        month,
        0
      ).getDate();

    return `${year}-${String(
      month
    ).padStart(2, "0")}-${String(
      ultimoDia
    ).padStart(2, "0")}`;
  }

  function formato(numero) {
    return (
      "USD " +
      Number(
        numero || 0
      ).toLocaleString(
        "en-US",
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
      Number(
        saldoActual || 0
      ) <= 0
    ) {
      return 0;
    }

    const hoy =
      new Date(
        `${hoyISO()}T00:00:00`
      );

    const vencimientoTexto =
      fechaSimple(
        fechaVencimiento
      );

    if (!vencimientoTexto) {
      return 0;
    }

    const vencimiento =
      new Date(
        `${vencimientoTexto}T00:00:00`
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

  function estadoCuenta(
    cuenta,
    cobranza
  ) {
    const saldo =
      Number(
        cuenta?.saldo_actual ||
          0
      );

    if (saldo <= 0) {
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
      estadoCobranza ===
        "legal" ||
      estadoComercial ===
        "legal"
    ) {
      return "Legal";
    }

    if (
      estadoCobranza ===
        "suspendido" ||
      estadoComercial ===
        "suspendido"
    ) {
      return "Suspendido";
    }

    const dias =
      calcularDiasAtraso(
        cuenta?.fecha_vencimiento,
        saldo
      );

    return dias > 0
      ? "Mora"
      : "Al Día";
  }

  function riesgoCartera(
    dias,
    saldo,
    estado
  ) {
    if (
      Number(saldo || 0) <= 0
    ) {
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

  function rangoSemaforo(
    dias,
    saldo
  ) {
    if (
      Number(saldo || 0) <= 0
    ) {
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
    const estado =
      limpiarTexto(
        pago?.estado
      );

    const tipo =
      limpiarTexto(
        pago?.tipo
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

  function clavePago(
    pago,
    indice = 0
  ) {
    if (pago?.id) {
      return String(pago.id);
    }

    return [
      pago?.numero_transaccion ||
        "",
      pago?.informacion_comercial_id ||
        "",
      pago?.numero_cuenta ||
        "",
      fechaPago(pago),
      pago?.monto || "",
      indice,
    ].join("|");
  }

  function pagosValidosUnicos(
    listaPagos
  ) {
    const mapa =
      new Map();

    (listaPagos || [])
      .filter(pagoEsValido)
      .forEach(
        (pago, indice) => {
          const clave =
            clavePago(
              pago,
              indice
            );

          if (
            !mapa.has(clave)
          ) {
            mapa.set(
              clave,
              pago
            );
          }
        }
      );

    return [
      ...mapa.values(),
    ];
  }

  function sumarPagos(
    pagosCuenta,
    desde = "",
    hasta = ""
  ) {
    return (
      pagosCuenta || []
    )
      .filter((pago) => {
        const fecha =
          fechaPago(pago);

        if (!fecha) {
          return false;
        }

        if (
          desde &&
          fecha < desde
        ) {
          return false;
        }

        if (
          hasta &&
          fecha > hasta
        ) {
          return false;
        }

        return true;
      })
      .reduce(
        (sum, pago) =>
          sum +
          Number(
            pago.monto || 0
          ),
        0
      );
  }

  async function cargarDatos() {
    const empresaId =
      obtenerEmpresaId();

    if (!empresaId) {
      return;
    }

    setCargando(true);

    const [
      cuentasRes,
      clientesRes,
      cobranzasRes,
      pagosRes,
      gestionesRes,
    ] = await Promise.all([
      supabase
        .from(
          "informacion_comercial"
        )
        .select("*")
        .eq(
          "empresa_id",
          empresaId
        ),

      supabase
        .from("clientes")
        .select("*")
        .eq(
          "empresa_id",
          empresaId
        ),

      supabase
        .from(
          "informacion_cobranza"
        )
        .select("*")
        .eq(
          "empresa_id",
          empresaId
        ),

      supabase
        .from("caja")
        .select("*")
        .eq(
          "empresa_id",
          empresaId
        ),

      supabase
        .from(
          "bitacora_cliente"
        )
        .select("*")
        .eq(
          "empresa_id",
          empresaId
        ),
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

    setCuentas(
      cuentasRes.data || []
    );

    setClientes(
      clientesRes.data || []
    );

    setCobranzas(
      cobranzasRes.data || []
    );

    setPagos(
      pagosRes.data || []
    );

    setGestiones(
      gestionesRes.data || []
    );

    setCargando(false);
  }

  function limpiarFiltros() {
    setFiltroDesde("");
    setFiltroHasta("");
    setFiltroGestor(
      "Todos"
    );
  }

  const hoy = hoyISO();
  const inicioMes =
    inicioMesActual();
  const finMes =
    finMesActual();

  /*
    ============================================================
    CARTERA Y ASIGNACIÓN ÚNICA DE PAGOS
    ============================================================

    El pago se asigna siguiendo este orden:

    1. informacion_comercial_id
    2. numero_cuenta
    3. cliente_id, solamente si el cliente tiene una sola cuenta
    4. cédula, solamente si el cliente tiene una sola cuenta

    Esto evita que el mismo pago sea contado en varias cuentas.
  */

  const cartera = useMemo(() => {
    const baseCartera =
      cuentas.map((cuenta) => {
        const cliente =
          clientes.find(
            (item) =>
              String(item.id) ===
              String(
                cuenta.cliente_id
              )
          );

        const cobranza =
          cobranzas.find(
            (item) =>
              String(
                item.informacion_comercial_id
              ) ===
              String(cuenta.id)
          );

        const montoOriginal =
          Number(
            cuenta.monto_total ||
              0
          );

        const saldoPendiente =
          Number(
            cuenta.saldo_actual ||
              0
          );

        const dias =
          calcularDiasAtraso(
            cuenta.fecha_vencimiento,
            saldoPendiente
          );

        const estado =
          estadoCuenta(
            cuenta,
            cobranza
          );

        const riesgo =
          riesgoCartera(
            dias,
            saldoPendiente,
            estado
          );

        const semaforo =
          rangoSemaforo(
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
          cobradoPeriodo: 0,
          cobradoMes: 0,
          cobradoHoy: 0,
        };
      });

    const pagosUnicos =
      pagosValidosUnicos(
        pagos
      );

    const mapaPagos =
      new Map();

    baseCartera.forEach(
      (item) => {
        mapaPagos.set(
          String(
            item.cuenta.id
          ),
          []
        );
      }
    );

    pagosUnicos.forEach(
      (pago) => {
        let cuentaDestino =
          null;

        if (
          pago.informacion_comercial_id
        ) {
          cuentaDestino =
            baseCartera.find(
              (item) =>
                String(
                  item.cuenta.id
                ) ===
                String(
                  pago.informacion_comercial_id
                )
            );
        }

        if (
          !cuentaDestino &&
          pago.numero_cuenta
        ) {
          cuentaDestino =
            baseCartera.find(
              (item) =>
                String(
                  item.cuenta
                    .numero_cuenta ||
                    ""
                ).trim() ===
                String(
                  pago.numero_cuenta
                ).trim()
            );
        }

        if (
          !cuentaDestino &&
          pago.cliente_id
        ) {
          const cuentasCliente =
            baseCartera.filter(
              (item) =>
                String(
                  item.cuenta
                    .cliente_id
                ) ===
                String(
                  pago.cliente_id
                )
            );

          if (
            cuentasCliente.length ===
            1
          ) {
            cuentaDestino =
              cuentasCliente[0];
          }
        }

        if (
          !cuentaDestino
        ) {
          const cedulaPago =
            String(
              pago.cliente_cedula ||
                pago.cedula ||
                pago.identificacion ||
                ""
            ).trim();

          if (cedulaPago) {
            const cuentasCedula =
              baseCartera.filter(
                (item) =>
                  String(
                    item.cliente
                      ?.cedula ||
                      ""
                  ).trim() ===
                  cedulaPago
              );

            if (
              cuentasCedula.length ===
              1
            ) {
              cuentaDestino =
                cuentasCedula[0];
            }
          }
        }

        if (cuentaDestino) {
          const claveCuenta =
            String(
              cuentaDestino
                .cuenta.id
            );

          const pagosCuenta =
            mapaPagos.get(
              claveCuenta
            ) || [];

          pagosCuenta.push(
            pago
          );

          mapaPagos.set(
            claveCuenta,
            pagosCuenta
          );
        }
      }
    );

    return baseCartera.map(
      (item) => {
        const pagosCuenta =
          mapaPagos.get(
            String(
              item.cuenta.id
            )
          ) || [];

        return {
          ...item,

          pagosCuenta,

          cobradoPeriodo:
            sumarPagos(
              pagosCuenta,
              filtroDesde,
              filtroHasta
            ),

          cobradoMes:
            sumarPagos(
              pagosCuenta,
              inicioMes,
              finMes
            ),

          cobradoHoy:
            sumarPagos(
              pagosCuenta,
              hoy,
              hoy
            ),
        };
      }
    );
  }, [
    cuentas,
    clientes,
    cobranzas,
    pagos,
    filtroDesde,
    filtroHasta,
    inicioMes,
    finMes,
    hoy,
  ]);

  const gestores = [
    "Todos",
    ...new Set(
      cartera
        .map(
          (item) =>
            item.gestor
        )
        .filter(Boolean)
    ),
  ];

  const carteraPorGestor =
    filtroGestor ===
    "Todos"
      ? cartera
      : cartera.filter(
          (item) =>
            item.gestor ===
            filtroGestor
        );

  const carteraActivaPorGestor =
    carteraPorGestor.filter(
      (item) =>
        item.saldoPendiente >
        0
    );

  /*
    ============================================================
    RESUMEN EJECUTIVO
    ============================================================
  */

  const carteraOriginal =
    carteraPorGestor.reduce(
      (sum, item) =>
        sum +
        item.montoOriginal,
      0
    );

  const saldoPendiente =
    carteraPorGestor.reduce(
      (sum, item) =>
        sum +
        item.saldoPendiente,
      0
    );

  const totalRecuperado =
    Math.max(
      carteraOriginal -
        saldoPendiente,
      0
    );

  const carteraAlDia =
    carteraActivaPorGestor
      .filter(
        (item) =>
          item.dias <= 0
      )
      .reduce(
        (sum, item) =>
          sum +
          item.saldoPendiente,
        0
      );

  const carteraMora =
    carteraActivaPorGestor
      .filter(
        (item) =>
          item.dias > 0
      )
      .reduce(
        (sum, item) =>
          sum +
          item.saldoPendiente,
        0
      );

  const porcentajeMora =
    saldoPendiente > 0
      ? (carteraMora /
          saldoPendiente) *
        100
      : 0;

  /*
    ============================================================
    COBROS DIRECTOS DE CAJA
    ============================================================

    Ya no se suman mediante coincidencias amplias por cédula.
    Cada pago fue asignado una única vez dentro de cartera.
  */

  const cobradoHoy =
    carteraPorGestor.reduce(
      (sum, item) =>
        sum +
        item.cobradoHoy,
      0
    );

  const cobradoMes =
    carteraPorGestor.reduce(
      (sum, item) =>
        sum +
        item.cobradoMes,
      0
    );

  const cobradoPeriodo =
    carteraPorGestor.reduce(
      (sum, item) =>
        sum +
        item.cobradoPeriodo,
      0
    );

  const saldoInicioPeriodo =
    saldoPendiente +
    cobradoPeriodo;

  const recuperacionPeriodo =
    saldoInicioPeriodo > 0
      ? (cobradoPeriodo /
          saldoInicioPeriodo) *
        100
      : 0;

  /*
    ============================================================
    CIERRE MENSUAL
    ============================================================
  */

  const vencimientosMes =
    carteraPorGestor.filter(
      (item) => {
        const vencimiento =
          fechaSimple(
            item.cuenta
              ?.fecha_vencimiento
          );

        return (
          vencimiento &&
          vencimiento >=
            inicioMes &&
          vencimiento <=
            finMes
        );
      }
    );

  const montoVencimientosMes =
    vencimientosMes.reduce(
      (sum, item) =>
        sum +
        item.saldoPendiente +
        item.cobradoMes,
      0
    );

  const cobradoVencimientosMes =
    vencimientosMes.reduce(
      (sum, item) =>
        sum +
        item.cobradoMes,
      0
    );

  const pendienteMes =
    Math.max(
      montoVencimientosMes -
        cobradoVencimientosMes,
      0
    );

  const moraAnterior =
    carteraPorGestor.filter(
      (item) => {
        const vencimiento =
          fechaSimple(
            item.cuenta
              ?.fecha_vencimiento
          );

        return (
          vencimiento &&
          vencimiento <
            inicioMes
        );
      }
    );

  const moraAnteriorInicio =
    moraAnterior.reduce(
      (sum, item) =>
        sum +
        item.saldoPendiente +
        item.cobradoMes,
      0
    );

  const moraAnteriorRecuperada =
    moraAnterior.reduce(
      (sum, item) =>
        sum +
        item.cobradoMes,
      0
    );

  const moraAnteriorPendiente =
    moraAnterior.reduce(
      (sum, item) =>
        sum +
        item.saldoPendiente,
      0
    );

  const saldoVencidoPendiente =
    carteraPorGestor
      .filter((item) => {
        const vencimiento =
          fechaSimple(
            item.cuenta
              ?.fecha_vencimiento
          );

        return (
          item.saldoPendiente >
            0 &&
          vencimiento &&
          vencimiento <= hoy
        );
      })
      .reduce(
        (sum, item) =>
          sum +
          item.saldoPendiente,
        0
      );

  /*
    ============================================================
    GESTIONES DEL PERÍODO
    ============================================================
  */

  const gestionesPeriodo =
    gestiones.filter(
      (gestion) => {
        const fecha =
          fechaGestion(
            gestion
          );

        if (!fecha) {
          return false;
        }

        if (
          filtroDesde &&
          fecha <
            filtroDesde
        ) {
          return false;
        }

        if (
          filtroHasta &&
          fecha >
            filtroHasta
        ) {
          return false;
        }

        if (
          filtroGestor !==
          "Todos"
        ) {
          const usuario =
            limpiarTexto(
              gestion.usuario
            );

          const gestor =
            limpiarTexto(
              filtroGestor
            );

          return (
            usuario === gestor ||
            usuario.startsWith(
              `${gestor} (`
            )
          );
        }

        return true;
      }
    );

  function esPromesaPago(
    gestion
  ) {
    const tipo =
      limpiarTexto(
        gestion?.tipo_gestion
      );

    const resultado =
      limpiarTexto(
        gestion?.resultado_gestion
      );

    return (
      tipo ===
        "promesa de pago" ||
      resultado ===
        "promesa registrada" ||
      resultado ===
        "promesa de pago"
    );
  }

  /*
    ============================================================
    CLASIFICACIÓN DE PROMESAS POR MONTO
    ============================================================

    La asignación se hace por cuenta y en orden cronológico.

    Cada dólar de un pago solamente se puede utilizar una vez.
  */

  const detallePromesas =
    useMemo(() => {
      const promesasValidas =
        gestiones
          .filter(
            esPromesaPago
          )
          .filter(
            (promesa) =>
              Number(
                promesa.monto_promesa ||
                  0
              ) > 0
          )
          .map(
            (
              promesa,
              indice
            ) => ({
              promesa,
              indice,
              cuentaId:
                promesa.informacion_comercial_id
                  ? String(
                      promesa.informacion_comercial_id
                    )
                  : "",
              clienteId:
                promesa.cliente_id
                  ? String(
                      promesa.cliente_id
                    )
                  : "",
              fechaRegistro:
                fechaGestion(
                  promesa
                ),
              fechaCompromiso:
                fechaSimple(
                  promesa.proxima_gestion
                ),
              montoPrometido:
                Number(
                  promesa.monto_promesa ||
                    0
                ),
            })
          )
          .filter(
            (item) =>
              item.cuentaId &&
              item.fechaRegistro &&
              item.fechaCompromiso
          )
          .sort(
            (a, b) => {
              if (
                a.cuentaId !==
                b.cuentaId
              ) {
                return a.cuentaId.localeCompare(
                  b.cuentaId
                );
              }

              if (
                a.fechaRegistro !==
                b.fechaRegistro
              ) {
                return a.fechaRegistro.localeCompare(
                  b.fechaRegistro
                );
              }

              return String(
                a.promesa
                  .created_at ||
                  ""
              ).localeCompare(
                String(
                  b.promesa
                    .created_at ||
                    ""
                )
              );
            }
          );

      const resultado = [];

      const gruposCuenta =
        new Map();

      promesasValidas.forEach(
        (item) => {
          const grupo =
            gruposCuenta.get(
              item.cuentaId
            ) || [];

          grupo.push(item);

          gruposCuenta.set(
            item.cuentaId,
            grupo
          );
        }
      );

      gruposCuenta.forEach(
        (
          promesasCuenta,
          cuentaId
        ) => {
          const cuentaRelacionada =
            cartera.find(
              (item) =>
                String(
                  item.cuenta.id
                ) ===
                String(cuentaId)
            );

          const pagosCuenta =
            [
              ...(
                cuentaRelacionada
                  ?.pagosCuenta ||
                []
              ),
            ]
              .map(
                (
                  pago,
                  indice
                ) => ({
                  pago,
                  clave:
                    clavePago(
                      pago,
                      indice
                    ),
                  fecha:
                    fechaPago(
                      pago
                    ),
                  restante:
                    Math.max(
                      Number(
                        pago.monto ||
                          0
                      ),
                      0
                    ),
                })
              )
              .filter(
                (item) =>
                  item.fecha &&
                  item.restante >
                    0
              )
              .sort(
                (a, b) => {
                  if (
                    a.fecha !==
                    b.fecha
                  ) {
                    return a.fecha.localeCompare(
                      b.fecha
                    );
                  }

                  return String(
                    a.pago
                      .created_at ||
                      ""
                  ).localeCompare(
                    String(
                      b.pago
                        .created_at ||
                        ""
                    )
                  );
                }
              );

          promesasCuenta.forEach(
            (item) => {
              let pendiente =
                item.montoPrometido;

              let pagadoATiempo =
                0;

              let pagadoTarde =
                0;

              pagosCuenta.forEach(
                (pagoDisponible) => {
                  if (
                    pendiente <= 0
                  ) {
                    return;
                  }

                  if (
                    pagoDisponible.restante <=
                    0
                  ) {
                    return;
                  }

                  if (
                    pagoDisponible.fecha <
                    item.fechaRegistro
                  ) {
                    return;
                  }

                  const aplicar =
                    Math.min(
                      pendiente,
                      pagoDisponible.restante
                    );

                  if (
                    aplicar <= 0
                  ) {
                    return;
                  }

                  if (
                    pagoDisponible.fecha <=
                    item.fechaCompromiso
                  ) {
                    pagadoATiempo +=
                      aplicar;
                  } else {
                    pagadoTarde +=
                      aplicar;
                  }

                  pendiente -=
                    aplicar;

                  pagoDisponible.restante -=
                    aplicar;
                }
              );

              const pagadoTotal =
                pagadoATiempo +
                pagadoTarde;

              let estado =
                "Activa";

              if (
                pagadoATiempo >=
                item.montoPrometido
              ) {
                estado =
                  "Cumplida";
              } else if (
                pagadoTotal >=
                item.montoPrometido
              ) {
                estado =
                  "Cumplida fuera de fecha";
              } else if (
                hoy >
                item.fechaCompromiso
              ) {
                estado =
                  "Incumplida";
              } else if (
                pagadoTotal > 0
              ) {
                estado =
                  "Parcial";
              }

              const cliente =
                clientes.find(
                  (registro) =>
                    String(
                      registro.id
                    ) ===
                    String(
                      item.clienteId
                    )
                );

              resultado.push({
                ...item,
                cliente,
                cuentaRelacionada,
                pagadoATiempo,
                pagadoTarde,
                pagadoTotal,
                pendientePromesa:
                  Math.max(
                    item.montoPrometido -
                      pagadoTotal,
                    0
                  ),
                estado,
                gestorPromesa:
                  item.promesa
                    .usuario ||
                  cuentaRelacionada
                    ?.gestor ||
                  "Sin asignar",
              });
            }
          );
        }
      );

      return resultado;
    }, [
      gestiones,
      cartera,
      clientes,
      hoy,
    ]);

  const promesasPeriodoDetalle =
    detallePromesas.filter(
      (item) => {
        const fecha =
          item.fechaRegistro;

        if (
          filtroDesde &&
          fecha <
            filtroDesde
        ) {
          return false;
        }

        if (
          filtroHasta &&
          fecha >
            filtroHasta
        ) {
          return false;
        }

        if (
          filtroGestor !==
          "Todos"
        ) {
          const usuario =
            limpiarTexto(
              item.promesa
                .usuario
            );

          const gestor =
            limpiarTexto(
              filtroGestor
            );

          return (
            usuario === gestor ||
            usuario.startsWith(
              `${gestor} (`
            ) ||
            limpiarTexto(
              item.cuentaRelacionada
                ?.gestor
            ) === gestor
          );
        }

        return true;
      }
    );

  const promesasActivas =
    promesasPeriodoDetalle.filter(
      (item) =>
        item.estado ===
        "Activa"
    ).length;

  const promesasParciales =
    promesasPeriodoDetalle.filter(
      (item) =>
        item.estado ===
        "Parcial"
    ).length;

  const promesasCumplidas =
    promesasPeriodoDetalle.filter(
      (item) =>
        item.estado ===
        "Cumplida"
    ).length;

  const promesasIncumplidas =
    promesasPeriodoDetalle.filter(
      (item) =>
        item.estado ===
        "Incumplida"
    ).length;

  const promesasFueraFecha =
    promesasPeriodoDetalle.filter(
      (item) =>
        item.estado ===
        "Cumplida fuera de fecha"
    ).length;

  /*
    ============================================================
    SEMÁFORO
    ============================================================
  */

  const semaforo = [
    {
      rango: "Al día",
      icono: "🟢",
      items:
        carteraActivaPorGestor.filter(
          (item) =>
            item.semaforo ===
            "Al día"
        ),
    },
    {
      rango: "1-30 días",
      icono: "🟡",
      items:
        carteraActivaPorGestor.filter(
          (item) =>
            item.semaforo ===
            "1-30 días"
        ),
    },
    {
      rango: "31-60 días",
      icono: "🟠",
      items:
        carteraActivaPorGestor.filter(
          (item) =>
            item.semaforo ===
            "31-60 días"
        ),
    },
    {
      rango: "61-90 días",
      icono: "🟧",
      items:
        carteraActivaPorGestor.filter(
          (item) =>
            item.semaforo ===
            "61-90 días"
        ),
    },
    {
      rango:
        "Más de 90 días",
      icono: "🔴",
      items:
        carteraActivaPorGestor.filter(
          (item) =>
            item.semaforo ===
            "Más de 90 días"
        ),
    },
  ].map((rango) => ({
    ...rango,

    clientes:
      rango.items.length,

    monto:
      rango.items.reduce(
        (sum, item) =>
          sum +
          item.saldoPendiente,
        0
      ),
  }));

  /*
    ============================================================
    RIESGO
    ============================================================
  */

  const riesgo = [
    "Al día",
    "Riesgo bajo",
    "Riesgo medio",
    "Riesgo alto",
    "Legal",
  ].map((nivel) => {
    const items =
      carteraActivaPorGestor.filter(
        (item) =>
          item.riesgo ===
          nivel
      );

    return {
      riesgo: nivel,

      clientes:
        items.length,

      monto:
        items.reduce(
          (sum, item) =>
            sum +
            item.saldoPendiente,
          0
        ),
    };
  });

  /*
    ============================================================
    EFECTIVIDAD POR GESTOR
    ============================================================
  */

  const rankingGestores =
    gestores
      .filter(
        (gestor) =>
          gestor !== "Todos"
      )
      .map((gestor) => {
        const cuentasGestor =
          cartera.filter(
            (item) =>
              item.gestor ===
              gestor
          );

        const cuentasActivas =
          cuentasGestor.filter(
            (item) =>
              item.saldoPendiente >
              0
          );

        const cobrado =
          cuentasGestor.reduce(
            (sum, item) =>
              sum +
              item.cobradoPeriodo,
            0
          );

        const saldo =
          cuentasActivas.reduce(
            (sum, item) =>
              sum +
              item.saldoPendiente,
            0
          );

        const saldoInicio =
          saldo + cobrado;

        const gestionesGestor =
          gestionesPeriodo.filter(
            (gestion) => {
              const usuario =
                limpiarTexto(
                  gestion.usuario
                );

              const nombreGestor =
                limpiarTexto(
                  gestor
                );

              return (
                usuario ===
                  nombreGestor ||
                usuario.startsWith(
                  `${nombreGestor} (`
                )
              );
            }
          );

        const promesasGestor =
          promesasPeriodoDetalle.filter(
            (promesa) => {
              const usuario =
                limpiarTexto(
                  promesa.promesa
                    .usuario
                );

              const nombreGestor =
                limpiarTexto(
                  gestor
                );

              return (
                usuario ===
                  nombreGestor ||
                usuario.startsWith(
                  `${nombreGestor} (`
                ) ||
                limpiarTexto(
                  promesa
                    .cuentaRelacionada
                    ?.gestor
                ) === nombreGestor
              );
            }
          );

        const promesasCumplidasGestor =
          promesasGestor.filter(
            (promesa) =>
              promesa.estado ===
              "Cumplida"
          ).length;

        const promesasParcialesGestor =
          promesasGestor.filter(
            (promesa) =>
              promesa.estado ===
              "Parcial"
          ).length;

        return {
          gestor,

          clientesAsignados:
            cuentasActivas.length,

          clientesGestionados:
            new Set(
              gestionesGestor
                .map(
                  (gestion) =>
                    gestion.cliente_id
                )
                .filter(Boolean)
            ).size,

          gestiones:
            gestionesGestor.length,

          promesas:
            promesasGestor.length,

          promesasCumplidas:
            promesasCumplidasGestor,

          promesasParciales:
            promesasParcialesGestor,

          cobrado,

          recuperacion:
            saldoInicio > 0
              ? (cobrado /
                  saldoInicio) *
                100
              : 0,
        };
      });

  /*
    ============================================================
    TOP CLIENTES
    ============================================================
  */

  const mayorRiesgo = [
    ...carteraActivaPorGestor,
  ]
    .sort(
      (a, b) =>
        b.dias -
          a.dias ||
        b.saldoPendiente -
          a.saldoPendiente
    )
    .slice(0, 10);

  const mayorSaldo = [
    ...carteraActivaPorGestor,
  ]
    .sort(
      (a, b) =>
        b.saldoPendiente -
        a.saldoPendiente
    )
    .slice(0, 10);

  const promesasDetalleFilas =
    [...promesasPeriodoDetalle]
      .sort((a, b) => {
        if (
          a.fechaCompromiso !==
          b.fechaCompromiso
        ) {
          return a.fechaCompromiso.localeCompare(
            b.fechaCompromiso
          );
        }

        return a.fechaRegistro.localeCompare(
          b.fechaRegistro
        );
      })
      .map((item) => [
        item.cliente?.nombre ||
          "Sin nombre",

        item.cuentaRelacionada
          ?.cuenta
          ?.numero_cuenta ||
          "-",

        item.fechaCompromiso,

        formato(
          item.montoPrometido
        ),

        formato(
          item.pagadoTotal
        ),

        formato(
          item.pendientePromesa
        ),

        item.estado,

        item.promesa.usuario ||
          item.cuentaRelacionada
            ?.gestor ||
          "Sin asignar",
      ]);

  if (cargando) {
    return (
      <div style={pagina}>
        <div style={cargandoBox}>
          <strong>
            Cargando Dashboard Cobranza...
          </strong>

          <p>
            Calculando cartera, pagos, promesas y gestores.
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
                Administración de cartera, recuperación, riesgo, promesas y gestores.
              </p>
            </div>
          </div>

          <div style={accionesTop}>
            <button
              style={botonDashboard}
              onClick={
                volverDashboard
              }
            >
              ← Volver al Dashboard
            </button>

            <button
              style={botonActualizar}
              onClick={
                cargarDatos
              }
            >
              Actualizar
            </button>

            <button
              style={botonNegro}
              onClick={() =>
                window.print()
              }
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
            Las fechas afectan cobros, gestiones, promesas y efectividad de gestores. La cartera representa el estado actual.
          </p>

          <div style={gridFiltros}>
            <Campo label="Fecha desde">
              <input
                type="date"
                value={filtroDesde}
                onChange={(event) =>
                  setFiltroDesde(
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Fecha hasta">
              <input
                type="date"
                value={filtroHasta}
                onChange={(event) =>
                  setFiltroHasta(
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Gestor">
              <select
                value={filtroGestor}
                onChange={(event) =>
                  setFiltroGestor(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                {gestores.map(
                  (gestor) => (
                    <option
                      key={gestor}
                      value={gestor}
                    >
                      {gestor}
                    </option>
                  )
                )}
              </select>
            </Campo>
          </div>

          <button
            style={botonGris}
            onClick={
              limpiarFiltros
            }
          >
            Limpiar filtros
          </button>
        </div>

        <h2 style={seccionTitulo}>
          Resumen Ejecutivo
        </h2>

        <div style={kpiGrid}>
          <KPI
            titulo="Cartera Original"
            valor={formato(
              carteraOriginal
            )}
            icono="🏦"
          />

          <KPI
            titulo="Total Recuperado"
            valor={formato(
              totalRecuperado
            )}
            icono="✅"
          />

          <KPI
            titulo="Saldo Pendiente"
            valor={formato(
              saldoPendiente
            )}
            icono="💰"
          />

          <KPI
            titulo="Cartera Al Día"
            valor={formato(
              carteraAlDia
            )}
            icono="🟢"
          />

          <KPI
            titulo="Cartera en Mora"
            valor={formato(
              carteraMora
            )}
            icono="🔴"
          />

          <KPI
            titulo="% Mora"
            valor={`${porcentajeMora.toFixed(
              1
            )}%`}
            icono="📈"
          />

          <KPI
            titulo="Cobrado Periodo"
            valor={formato(
              cobradoPeriodo
            )}
            icono="🧾"
          />

          <KPI
            titulo="% Recuperación Periodo"
            valor={`${recuperacionPeriodo.toFixed(
              1
            )}%`}
            icono="🎯"
          />
        </div>

        <h2 style={seccionTitulo}>
          Cierre Mensual
        </h2>

        <div style={kpiGrid}>
          <KPI
            titulo="Vencimientos del Mes"
            valor={formato(
              montoVencimientosMes
            )}
            icono="📅"
          />

          <KPI
            titulo="Cobrado del Mes"
            valor={formato(
              cobradoMes
            )}
            icono="💵"
          />

          <KPI
            titulo="Cobrado de Vencimientos"
            valor={formato(
              cobradoVencimientosMes
            )}
            icono="✅"
          />

          <KPI
            titulo="Pendiente del Mes"
            valor={formato(
              pendienteMes
            )}
            icono="⏳"
          />

          <KPI
            titulo="Mora Anterior"
            valor={formato(
              moraAnteriorInicio
            )}
            icono="📂"
          />

          <KPI
            titulo="Mora Recuperada"
            valor={formato(
              moraAnteriorRecuperada
            )}
            icono="♻️"
          />

          <KPI
            titulo="Mora Pendiente"
            valor={formato(
              moraAnteriorPendiente
            )}
            icono="⚠️"
          />

          <KPI
            titulo="Saldo Vencido Pendiente"
            valor={formato(
              saldoVencidoPendiente
            )}
            icono="➡️"
          />
        </div>

        <h2 style={seccionTitulo}>
          Promesas y Actividad
        </h2>

        <div style={kpiGrid}>
          <KPI
            titulo="Cobrado Hoy"
            valor={formato(
              cobradoHoy
            )}
            icono="📅"
          />

          <KPI
            titulo="Promesas Activas"
            valor={promesasActivas}
            icono="🤝"
          />

          <KPI
            titulo="Promesas Parciales"
            valor={promesasParciales}
            icono="🟡"
          />

          <KPI
            titulo="Promesas Cumplidas"
            valor={promesasCumplidas}
            icono="✅"
          />

          <KPI
            titulo="Promesas Incumplidas"
            valor={
              promesasIncumplidas
            }
            icono="⚠️"
          />

          <KPI
            titulo="Cumplidas Fuera de Fecha"
            valor={
              promesasFueraFecha
            }
            icono="🕒"
          />

          <KPI
            titulo="Gestiones Periodo"
            valor={
              gestionesPeriodo.length
            }
            icono="☎️"
          />
        </div>

        <Tabla
          titulo="Detalle de Promesas"
          columnas={[
            "Cliente",
            "Cuenta",
            "Fecha prometida",
            "Monto prometido",
            "Pagado aplicado",
            "Pendiente",
            "Estado",
            "Gestor",
          ]}
          filas={
            promesasDetalleFilas
          }
        />

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>
              Semáforo de Cartera
            </h2>

            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>
                    Rango
                  </th>

                  <th style={th}>
                    Clientes
                  </th>

                  <th style={th}>
                    Monto
                  </th>
                </tr>
              </thead>

              <tbody>
                {semaforo.map(
                  (item) => (
                    <tr
                      key={
                        item.rango
                      }
                    >
                      <td style={td}>
                        {item.icono}{" "}
                        {item.rango}
                      </td>

                      <td style={td}>
                        {
                          item.clientes
                        }
                      </td>

                      <td style={td}>
                        {formato(
                          item.monto
                        )}
                      </td>
                    </tr>
                  )
                )}
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
                  <th style={th}>
                    Riesgo
                  </th>

                  <th style={th}>
                    Clientes
                  </th>

                  <th style={th}>
                    Monto
                  </th>
                </tr>
              </thead>

              <tbody>
                {riesgo.map(
                  (item) => (
                    <tr
                      key={
                        item.riesgo
                      }
                    >
                      <td style={td}>
                        {
                          item.riesgo
                        }
                      </td>

                      <td style={td}>
                        {
                          item.clientes
                        }
                      </td>

                      <td style={td}>
                        {formato(
                          item.monto
                        )}
                      </td>
                    </tr>
                  )
                )}
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
            "Promesas parciales",
            "Promesas cumplidas",
            "Monto recuperado",
            "% recuperación",
          ]}
          filas={rankingGestores.map(
            (gestor) => [
              gestor.gestor,
              gestor.clientesAsignados,
              gestor.clientesGestionados,
              gestor.gestiones,
              gestor.promesas,
              gestor.promesasParciales,
              gestor.promesasCumplidas,
              formato(
                gestor.cobrado
              ),
              `${gestor.recuperacion.toFixed(
                1
              )}%`,
            ]
          )}
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
          filas={mayorRiesgo.map(
            (item) => [
              item.cliente?.nombre ||
                "Sin nombre",

              item.cuenta
                ?.numero_cuenta ||
                "-",

              item.dias,

              item.riesgo,

              formato(
                item.saldoPendiente
              ),

              item.gestor,
            ]
          )}
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
          filas={mayorSaldo.map(
            (item) => [
              item.cliente?.nombre ||
                "Sin nombre",

              item.cuenta
                ?.numero_cuenta ||
                "-",

              formato(
                item.saldoPendiente
              ),

              item.estado,

              item.gestor,
            ]
          )}
        />
      </div>
    </div>
  );
}

function Campo({
  label,
  children,
}) {
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
}) {
  return (
    <div style={cardIndicador}>
      <div style={iconoBox}>
        {icono}
      </div>

      <p style={cardTitulo}>
        {titulo}
      </p>

      <h2 style={cardNumero}>
        {valor}
      </h2>
    </div>
  );
}

function Tabla({
  titulo,
  columnas,
  filas,
}) {
  return (
    <div style={card}>
      <h2 style={tituloSeccion}>
        {titulo}
      </h2>

      <div
        style={{
          overflowX: "auto",
        }}
      >
        <table style={tabla}>
          <thead>
            <tr>
              {columnas.map(
                (
                  columna,
                  index
                ) => (
                  <th
                    key={index}
                    style={th}
                  >
                    {columna}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {filas.length ===
            0 ? (
              <tr>
                <td
                  style={td}
                  colSpan={
                    columnas.length
                  }
                >
                  No hay datos disponibles.
                </td>
              </tr>
            ) : (
              filas.map(
                (
                  fila,
                  index
                ) => (
                  <tr
                    key={index}
                  >
                    {fila.map(
                      (
                        celda,
                        indiceCelda
                      ) => (
                        <td
                          key={
                            indiceCelda
                          }
                          style={td}
                        >
                          {celda}
                        </td>
                      )
                    )}
                  </tr>
                )
              )
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
  fontFamily:
    "Arial, sans-serif",
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
  justifyContent:
    "space-between",
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
  border:
    "1px solid #ffffff",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonNegro = {
  background: "#111827",
  color: "#ffffff",
  border:
    "1px solid #ffffff",
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
  margin:
    "22px 0 12px",
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
  border:
    "1px solid #d1d5db",
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
  borderCollapse:
    "collapse",
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
  borderBottom:
    "1px solid #e5e7eb",
};
