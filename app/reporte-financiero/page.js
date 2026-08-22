"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

/*
  KONAX · REPORTE FINANCIERO EJECUTIVO MULTI-NEGOCIO
  Version 2026.08.21-REPORTE-FINANCIERO-EJECUTIVO-V5

  Fuentes financieras:
  - caja   -> ingresos procesados
  - gastos -> egresos activos

  IMPORTANTE:
  No suma Agenda, Membresías, Ventas ni Pedidos por separado,
  para evitar duplicar cobros que ya fueron registrados en Caja.
*/

const VERSION =
  "2026.08.21-REPORTE-FINANCIERO-EJECUTIVO-V5";

const CATEGORIAS_GASTOS = [
  "Compras",
  "Alquiler",
  "Planilla",
  "Luz",
  "Agua",
  "Internet",
  "Teléfono",
  "Publicidad",
  "Combustible",
  "Transporte",
  "Mantenimiento",
  "Limpieza",
  "Papelería y Oficina",
  "Software y Sistemas",
  "Honorarios Profesionales",
  "Comisiones",
  "Impuestos",
  "Herramientas y Equipos",
  "Otros",
];

const ORDEN_CATEGORIAS_GASTOS = new Map(
  CATEGORIAS_GASTOS.map((categoria, index) => [
    categoria,
    index,
  ])
);

function fechaLocal(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function fechaHoy() {
  return fechaLocal(new Date());
}

function primerDiaMes() {
  const hoy = new Date();
  return fechaLocal(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  );
}

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function dinero(valor) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
}

function fechaVisual(fecha) {
  if (!fecha) return "";

  const d = new Date(
    `${String(fecha).slice(0, 10)}T00:00:00`
  );

  if (Number.isNaN(d.getTime())) {
    return String(fecha);
  }

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function detectarTipoNegocio(
  tipoNegocio,
  categoriaNegocio = ""
) {
  const texto = normalizar(
    `${tipoNegocio || ""} ${categoriaNegocio || ""}`
  );

  if (
    [
      "salon de belleza",
      "salon belleza",
      "belleza",
      "barberia",
      "spa",
      "peluqueria",
      "estetica",
    ].some((x) => texto.includes(x))
  ) {
    return "belleza";
  }

  if (
    ["lavanderia", "lavandería", "laundry"].some((x) =>
      texto.includes(normalizar(x))
    )
  ) {
    return "lavanderia";
  }

  if (
    [
      "gimnasio",
      "gym",
      "fitness",
      "boxeo",
      "karate",
      "crossfit",
      "pilates",
      "yoga",
      "membresia",
      "membresía",
    ].some((x) => texto.includes(normalizar(x)))
  ) {
    return "gimnasio";
  }

  return "general";
}

function etiquetaTipo(tipo) {
  if (tipo === "belleza") return "Belleza";
  if (tipo === "lavanderia") return "Lavandería";
  if (tipo === "gimnasio") return "Membresías";
  return "Negocio";
}

function rangoRapido(tipo) {
  const hoy = new Date();

  if (tipo === "hoy") {
    const f = fechaLocal(hoy);
    return { desde: f, hasta: f };
  }

  if (tipo === "semana") {
    const inicio = new Date(hoy);
    const dia = inicio.getDay();
    const ajuste = dia === 0 ? -6 : 1 - dia;
    inicio.setDate(inicio.getDate() + ajuste);

    return {
      desde: fechaLocal(inicio),
      hasta: fechaLocal(hoy),
    };
  }

  return {
    desde: primerDiaMes(),
    hasta: fechaLocal(hoy),
  };
}

function categoriaGastoCanonica(valor) {
  const original = String(valor || "").trim();
  if (!original) return "Otros";

  const clave = normalizar(original);

  const encontrada = CATEGORIAS_GASTOS.find(
    (categoria) => normalizar(categoria) === clave
  );

  return encontrada || original;
}

function diasEntre(desde, hasta) {
  const inicio = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);

  return Math.max(
    1,
    Math.round(
      (fin.getTime() - inicio.getTime()) / 86400000
    ) + 1
  );
}

function rangoAnterior(desde, hasta) {
  const cantidadDias = diasEntre(desde, hasta);

  const inicioActual = new Date(`${desde}T00:00:00`);
  const finAnterior = new Date(inicioActual);
  finAnterior.setDate(finAnterior.getDate() - 1);

  const inicioAnterior = new Date(finAnterior);
  inicioAnterior.setDate(
    inicioAnterior.getDate() - cantidadDias + 1
  );

  return {
    desde: fechaLocal(inicioAnterior),
    hasta: fechaLocal(finAnterior),
  };
}

function porcentajeCambio(actual, anterior) {
  const a = Number(actual || 0);
  const b = Number(anterior || 0);

  if (b === 0) {
    if (a === 0) return 0;
    return null;
  }

  return ((a - b) / Math.abs(b)) * 100;
}

function textoCambio(actual, anterior) {
  const cambio = porcentajeCambio(actual, anterior);

  if (cambio === null) {
    return actual > 0
      ? "Sin base comparable"
      : "Sin variación";
  }

  if (Math.abs(cambio) < 0.05) return "Sin variación";

  return `${cambio > 0 ? "+" : ""}${cambio.toFixed(
    1
  )}% vs período anterior`;
}

function colorCambio(actual, anterior, inverso = false) {
  const cambio = porcentajeCambio(actual, anterior);

  if (cambio === null || Math.abs(cambio) < 0.05) {
    return "#6B7280";
  }

  const mejora = inverso ? cambio < 0 : cambio > 0;
  return mejora ? "#08743C" : "#B42318";
}

export default function ReporteFinanciero() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] =
    useState("");
  const [tipoNegocio, setTipoNegocio] =
    useState("general");

  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(fechaHoy());
  const [rangoActivo, setRangoActivo] =
    useState("mes");
  const [vistaMovimientos, setVistaMovimientos] =
    useState("dia");

  const [movimientos, setMovimientos] = useState([]);
  const [movimientosAnteriores, setMovimientosAnteriores] =
    useState([]);
  const [fuentesActivas, setFuentesActivas] =
    useState([]);

  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    setCargando(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        window.location.href = "/login";
        return;
      }

      const empresaLocal =
        localStorage.getItem("empresaId") || "";
      const empresaNombreLocal =
        localStorage.getItem("empresaNombre") || "";
      const tipoNegocioLocal =
        localStorage.getItem("tipoNegocio") || "";
      const categoriaNegocioLocal =
        localStorage.getItem("categoriaNegocio") || "";

      if (!empresaLocal) {
        alert("No hay una empresa activa.");
        window.location.href = "/login";
        return;
      }

      const tipoDetectado = detectarTipoNegocio(
        tipoNegocioLocal,
        categoriaNegocioLocal
      );

      setEmpresaId(empresaLocal);
      setEmpresaNombre(empresaNombreLocal);
      setTipoNegocio(tipoDetectado);

      await cargarReporte({
        idEmpresa: empresaLocal,
        fechaDesde: desde,
        fechaHasta: hasta,
        tipo: tipoDetectado,
      });
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "No se pudo cargar el reporte financiero."
      );
    } finally {
      setCargando(false);
    }
  }

  async function consultaSegura(nombre, ejecutor) {
    try {
      const respuesta = await ejecutor();

      if (respuesta?.error) {
        const codigo = respuesta.error.code || "";
        const mensaje = normalizar(
          respuesta.error.message || ""
        );

        const esTablaInexistente =
          codigo === "42P01" ||
          mensaje.includes("does not exist") ||
          mensaje.includes("no existe");

        if (esTablaInexistente) {
          return { data: [], disponible: false };
        }

        console.error(
          `Fuente ${nombre}:`,
          respuesta.error
        );

        return { data: [], disponible: false };
      }

      return {
        data: Array.isArray(respuesta?.data)
          ? respuesta.data
          : [],
        disponible: true,
      };
    } catch (err) {
      console.error(`Fuente ${nombre}:`, err);
      return { data: [], disponible: false };
    }
  }

  function agregarMovimiento(lista, item) {
    const monto = Number(item.monto || 0);

    if (!Number.isFinite(monto) || monto === 0) {
      return;
    }

    lista.push({
      id:
        item.id ||
        `${item.fuente}-${Math.random()}`,
      fecha: item.fecha || fechaHoy(),
      tipo: item.tipo || "Ingreso",
      categoria: item.categoria || "Otros",
      descripcion:
        item.descripcion || "Movimiento",
      monto: Math.abs(monto),
      metodo: item.metodo || "",
      fuente: item.fuente || "",
      referencia: item.referencia || "",
    });
  }

  async function obtenerMovimientosPeriodo({
    idEmpresa,
    fechaDesde,
    fechaHasta,
    tipo,
  }) {
    const [cajaResp, gastosResp] = await Promise.all([
      consultaSegura("Caja", () =>
        supabase
          .from("caja")
          .select(
            "id,empresa_id,tipo,descripcion,monto,metodo_pago,usuario,vendedor_responsable,numero_transaccion,fecha_pago,estado,cliente_nombre,agenda_reserva_id,created_at"
          )
          .eq("empresa_id", idEmpresa)
          .eq("estado", "Procesado")
          .gte("fecha_pago", fechaDesde)
          .lte("fecha_pago", fechaHasta)
          .order("fecha_pago", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          })
      ),

      consultaSegura("Gastos", () =>
        supabase
          .from("gastos")
          .select(
            "id,empresa_id,fecha,categoria,descripcion,monto,metodo_pago,responsable,observacion,estado,created_at"
          )
          .eq("empresa_id", idEmpresa)
          .gte("fecha", fechaDesde)
          .lte("fecha", fechaHasta)
          .order("fecha", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          })
      ),
    ]);

    const lista = [];
    const fuentes = [];

    if (cajaResp.disponible) fuentes.push("Caja");
    if (gastosResp.disponible) fuentes.push("Gastos");

    cajaResp.data.forEach((mov) => {
      const monto = Number(mov.monto || 0);

      if (!Number.isFinite(monto) || monto <= 0) {
        return;
      }

      agregarMovimiento(lista, {
        id: `caja-${mov.id}`,
        fecha:
          mov.fecha_pago ||
          String(mov.created_at || "").slice(0, 10) ||
          fechaHoy(),
        tipo: "Ingreso",
        categoria: categoriaIngresoCaja(
          mov,
          tipo
        ),
        descripcion:
          mov.descripcion ||
          mov.tipo ||
          "Ingreso registrado en Caja",
        monto,
        metodo: mov.metodo_pago || "",
        fuente: "Caja",
        referencia:
          mov.numero_transaccion || mov.id,
      });
    });

    gastosResp.data.forEach((gasto) => {
      if (
        normalizar(gasto.estado) === "anulado"
      ) {
        return;
      }

      const monto = Number(gasto.monto || 0);

      if (!Number.isFinite(monto) || monto <= 0) {
        return;
      }

      agregarMovimiento(lista, {
        id: `gasto-${gasto.id}`,
        fecha:
          gasto.fecha ||
          String(gasto.created_at || "").slice(0, 10) ||
          fechaHoy(),
        tipo: "Gasto",
        categoria: categoriaGastoCanonica(
          gasto.categoria
        ),
        descripcion:
          gasto.descripcion ||
          "Gasto del negocio",
        monto,
        metodo: gasto.metodo_pago || "",
        fuente: "Gastos",
        referencia: gasto.id,
      });
    });

    lista.sort((a, b) => {
      const porFecha = String(
        b.fecha || ""
      ).localeCompare(String(a.fecha || ""));

      if (porFecha !== 0) return porFecha;

      return String(b.id || "").localeCompare(
        String(a.id || "")
      );
    });

    return { lista, fuentes };
  }

  async function cargarReporte({
    idEmpresa = empresaId,
    fechaDesde = desde,
    fechaHasta = hasta,
    tipo = tipoNegocio,
  } = {}) {
    if (!idEmpresa || !fechaDesde || !fechaHasta) {
      return;
    }

    if (fechaDesde > fechaHasta) {
      setError(
        "La fecha desde no puede ser mayor que la fecha hasta."
      );
      return;
    }

    setCargando(true);
    setError("");

    try {
      const anterior = rangoAnterior(
        fechaDesde,
        fechaHasta
      );

      const [actualResp, anteriorResp] =
        await Promise.all([
          obtenerMovimientosPeriodo({
            idEmpresa,
            fechaDesde,
            fechaHasta,
            tipo,
          }),
          obtenerMovimientosPeriodo({
            idEmpresa,
            fechaDesde: anterior.desde,
            fechaHasta: anterior.hasta,
            tipo,
          }),
        ]);

      setMovimientos(actualResp.lista);
      setMovimientosAnteriores(
        anteriorResp.lista
      );
      setFuentesActivas(actualResp.fuentes);
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "No se pudo generar el reporte."
      );
    } finally {
      setCargando(false);
    }
  }

  function categoriaIngresoCaja(
    movimiento,
    tipo
  ) {
    const texto = normalizar(
      `${movimiento?.tipo || ""} ${
        movimiento?.descripcion || ""
      }`
    );

    if (tipo === "belleza") {
      if (
        texto.includes("servicio de salon") ||
        texto.includes("servicio del salon") ||
        texto.includes("reserva")
      ) {
        return "Servicios";
      }

      if (
        texto.includes("producto") ||
        texto.includes("venta")
      ) {
        return "Productos";
      }

      return "Otros ingresos";
    }

    if (tipo === "gimnasio") {
      if (texto.includes("membres")) {
        return "Membresías";
      }

      if (texto.includes("renovacion")) {
        return "Renovaciones";
      }

      if (
        texto.includes("inscripcion") ||
        texto.includes("matricula")
      ) {
        return "Inscripciones";
      }

      if (texto.includes("pase diario")) {
        return "Pases diarios";
      }

      if (
        texto.includes("clase") ||
        texto.includes("sesion")
      ) {
        return "Clases / Sesiones";
      }

      if (
        texto.includes("producto") ||
        texto.includes("venta")
      ) {
        return "Productos";
      }

      return "Otros ingresos";
    }

    if (tipo === "lavanderia") {
      if (texto.includes("pedido")) {
        return "Pedidos";
      }

      if (texto.includes("delivery")) {
        return "Delivery";
      }

      return "Otros ingresos";
    }

    if (texto.includes("venta")) return "Ventas";

    if (
      texto.includes("abono") ||
      texto.includes("cuota") ||
      texto.includes("cancelacion")
    ) {
      return "Cobranza";
    }

    return movimiento?.tipo || "Ingresos";
  }

  function construirResumen(lista) {
    const ingresos = lista
      .filter((m) => m.tipo === "Ingreso")
      .reduce(
        (total, m) =>
          total + Number(m.monto || 0),
        0
      );

    const gastos = lista
      .filter((m) => m.tipo === "Gasto")
      .reduce(
        (total, m) =>
          total + Number(m.monto || 0),
        0
      );

    const utilidad = ingresos - gastos;
    const margen =
      ingresos > 0
        ? (utilidad / ingresos) * 100
        : 0;

    const ingresosCantidad = lista.filter(
      (m) => m.tipo === "Ingreso"
    ).length;

    const ticketPromedio =
      ingresosCantidad > 0
        ? ingresos / ingresosCantidad
        : 0;

    const gastoPromedioDiario =
      diasEntre(desde, hasta) > 0
        ? gastos / diasEntre(desde, hasta)
        : 0;

    return {
      ingresos,
      gastos,
      utilidad,
      margen,
      ticketPromedio,
      gastoPromedioDiario,
      ingresosCantidad,
    };
  }

  const resumen = useMemo(
    () => construirResumen(movimientos),
    [movimientos, desde, hasta]
  );

  const resumenAnterior = useMemo(
    () =>
      construirResumen(
        movimientosAnteriores
      ),
    [movimientosAnteriores, desde, hasta]
  );

  const ingresosPorCategoria = useMemo(() => {
    const mapa = new Map();

    movimientos
      .filter((m) => m.tipo === "Ingreso")
      .forEach((m) => {
        const categoria =
          m.categoria || "Otros";

        mapa.set(
          categoria,
          Number(mapa.get(categoria) || 0) +
            Number(m.monto || 0)
        );
      });

    return Array.from(mapa.entries())
      .map(([categoria, monto]) => ({
        categoria,
        monto,
      }))
      .sort((a, b) => b.monto - a.monto);
  }, [movimientos]);

  const gastosPorCategoria = useMemo(() => {
    const mapa = new Map();

    movimientos
      .filter((m) => m.tipo === "Gasto")
      .forEach((m) => {
        const categoria =
          categoriaGastoCanonica(m.categoria);

        mapa.set(
          categoria,
          Number(mapa.get(categoria) || 0) +
            Number(m.monto || 0)
        );
      });

    return Array.from(mapa.entries())
      .map(([categoria, monto]) => ({
        categoria,
        monto,
      }))
      .sort((a, b) => {
        if (b.monto !== a.monto) {
          return b.monto - a.monto;
        }

        const ordenA =
          ORDEN_CATEGORIAS_GASTOS.has(
            a.categoria
          )
            ? ORDEN_CATEGORIAS_GASTOS.get(
                a.categoria
              )
            : 999;

        const ordenB =
          ORDEN_CATEGORIAS_GASTOS.has(
            b.categoria
          )
            ? ORDEN_CATEGORIAS_GASTOS.get(
                b.categoria
              )
            : 999;

        return ordenA - ordenB;
      });
  }, [movimientos]);

  const tendenciaDiaria = useMemo(() => {
    const mapa = new Map();

    movimientos.forEach((item) => {
      const fecha = String(
        item.fecha || ""
      ).slice(0, 10);

      if (!fecha) return;

      if (!mapa.has(fecha)) {
        mapa.set(fecha, {
          fecha,
          ingresos: 0,
          gastos: 0,
        });
      }

      const fila = mapa.get(fecha);

      if (item.tipo === "Ingreso") {
        fila.ingresos += Number(
          item.monto || 0
        );
      } else if (item.tipo === "Gasto") {
        fila.gastos += Number(
          item.monto || 0
        );
      }
    });

    return Array.from(mapa.values()).sort(
      (a, b) =>
        String(a.fecha).localeCompare(
          String(b.fecha)
        )
    );
  }, [movimientos]);

  const maximoTendencia = useMemo(() => {
    return Math.max(
      1,
      ...tendenciaDiaria.map((item) =>
        Math.max(
          item.ingresos,
          item.gastos
        )
      )
    );
  }, [tendenciaDiaria]);

  const movimientosAgrupados = useMemo(() => {
    if (vistaMovimientos === "dia") {
      const mapa = new Map();

      movimientos.forEach((item) => {
        const clave = String(
          item.fecha || ""
        ).slice(0, 10);

        if (!mapa.has(clave)) {
          mapa.set(clave, []);
        }

        mapa.get(clave).push(item);
      });

      return Array.from(mapa.entries()).map(
        ([clave, items]) => ({
          clave,
          titulo: fechaVisual(clave),
          items,
        })
      );
    }

    if (vistaMovimientos === "mes") {
      const mapa = new Map();

      movimientos.forEach((item) => {
        const clave = String(
          item.fecha || ""
        ).slice(0, 7);

        if (!mapa.has(clave)) {
          mapa.set(clave, []);
        }

        mapa.get(clave).push(item);
      });

      return Array.from(mapa.entries()).map(
        ([clave, items]) => {
          const [anio, mes] = clave
            .split("-")
            .map(Number);

          const titulo =
            new Intl.DateTimeFormat("es-PA", {
              month: "long",
              year: "numeric",
            }).format(
              new Date(anio, (mes || 1) - 1, 1)
            );

          return {
            clave,
            titulo,
            items,
          };
        }
      );
    }

    const mapa = new Map();

    movimientos.forEach((item) => {
      const clave = String(
        item.fecha || ""
      ).slice(0, 4);

      if (!mapa.has(clave)) {
        mapa.set(clave, []);
      }

      mapa.get(clave).push(item);
    });

    return Array.from(mapa.entries()).map(
      ([clave, items]) => ({
        clave,
        titulo: clave,
        items,
      })
    );
  }, [movimientos, vistaMovimientos]);

  const diagnostico = useMemo(() => {
    const resultados = [];

    if (
      resumen.ingresos === 0 &&
      resumen.gastos === 0
    ) {
      resultados.push({
        tono: "neutral",
        titulo: "Sin actividad financiera",
        texto:
          "No hay ingresos ni gastos registrados en el período seleccionado.",
      });

      return resultados;
    }

    if (resumen.utilidad < 0) {
      resultados.push({
        tono: "rojo",
        titulo: "Período con pérdida",
        texto: `Los gastos superan los ingresos por ${dinero(
          Math.abs(resumen.utilidad)
        )}.`,
      });
    } else if (resumen.margen >= 30) {
      resultados.push({
        tono: "verde",
        titulo: "Margen saludable",
        texto: `El negocio conserva ${resumen.margen.toFixed(
          1
        )}% de sus ingresos después de gastos.`,
      });
    } else if (
      resumen.ingresos > 0 &&
      resumen.margen < 15
    ) {
      resultados.push({
        tono: "amarillo",
        titulo: "Margen ajustado",
        texto: `El margen neto es ${resumen.margen.toFixed(
          1
        )}%. Conviene revisar los gastos de mayor peso.`,
      });
    }

    const cambioIngresos = porcentajeCambio(
      resumen.ingresos,
      resumenAnterior.ingresos
    );

    if (
      cambioIngresos !== null &&
      cambioIngresos <= -10
    ) {
      resultados.push({
        tono: "amarillo",
        titulo: "Ingresos en descenso",
        texto: `Los ingresos bajaron ${Math.abs(
          cambioIngresos
        ).toFixed(
          1
        )}% frente al período anterior comparable.`,
      });
    } else if (
      cambioIngresos !== null &&
      cambioIngresos >= 10
    ) {
      resultados.push({
        tono: "verde",
        titulo: "Ingresos en crecimiento",
        texto: `Los ingresos aumentaron ${cambioIngresos.toFixed(
          1
        )}% frente al período anterior comparable.`,
      });
    }

    const principalGasto =
      gastosPorCategoria[0];

    if (
      principalGasto &&
      resumen.gastos > 0
    ) {
      const porcentaje =
        (principalGasto.monto /
          resumen.gastos) *
        100;

      if (porcentaje >= 35) {
        resultados.push({
          tono: "neutral",
          titulo: "Gasto concentrado",
          texto: `${principalGasto.categoria} representa ${porcentaje.toFixed(
            1
          )}% de todos los gastos del período.`,
        });
      }
    }

    return resultados.slice(0, 4);
  }, [
    resumen,
    resumenAnterior,
    gastosPorCategoria,
  ]);

  function aplicarRango(tipo) {
    const rango = rangoRapido(tipo);

    setRangoActivo(tipo);
    setDesde(rango.desde);
    setHasta(rango.hasta);

    cargarReporte({
      fechaDesde: rango.desde,
      fechaHasta: rango.hasta,
    });
  }

  function generar() {
    setRangoActivo("personalizado");
    cargarReporte();
  }

  if (cargando && !empresaId) {
    return (
      <main style={styles.loading}>
        <div style={styles.spinner} />
        <strong>
          Cargando reporte financiero...
        </strong>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <style>{CSS}</style>

      <div style={styles.container}>
        <header
          style={styles.hero}
          className="reporte-hero"
        >
          <div style={styles.heroBrand}>
            <div style={styles.logoBox}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={styles.logo}
              />
            </div>

            <div>
              <span style={styles.eyebrow}>
                KONAX · INTELIGENCIA FINANCIERA
              </span>

              <h1 style={styles.title}>
                Reporte Financiero
              </h1>

              <p style={styles.subtitle}>
                {empresaNombre || "KONAX"} ·{" "}
                {etiquetaTipo(tipoNegocio)}
                {" · "}
                Ventas, gastos, utilidad y salud
                financiera del negocio.
              </p>
            </div>
          </div>

          <button
            type="button"
            style={styles.heroButton}
            onClick={() =>
              (window.location.href =
                "/dashboard")
            }
          >
            ← Panel principal
          </button>
        </header>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <section
          style={styles.filterCard}
          className="reporte-filter"
        >
          <div style={styles.quickFilters}>
            {[
              ["hoy", "Hoy"],
              ["semana", "Esta semana"],
              ["mes", "Este mes"],
            ].map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() =>
                  aplicarRango(valor)
                }
                style={{
                  ...styles.quickButton,
                  ...(rangoActivo === valor
                    ? styles.quickButtonActive
                    : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={styles.customFilters}>
            <label style={styles.field}>
              <span style={styles.label}>
                Desde
              </span>
              <input
                type="date"
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value);
                  setRangoActivo(
                    "personalizado"
                  );
                }}
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>
                Hasta
              </span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value);
                  setRangoActivo(
                    "personalizado"
                  );
                }}
                style={styles.input}
              />
            </label>

            <button
              type="button"
              style={styles.primaryButton}
              onClick={generar}
              disabled={cargando}
            >
              {cargando
                ? "Generando..."
                : "Generar"}
            </button>
          </div>
        </section>

        <section
          style={styles.executiveStrip}
          className="reporte-executive-strip"
        >
          <div>
            <span style={styles.executiveEyebrow}>
              RESUMEN EJECUTIVO
            </span>
            <h2 style={styles.executiveTitle}>
              Así está funcionando tu negocio
            </h2>
          </div>

          <div style={styles.executiveRange}>
            {fechaVisual(desde)} →{" "}
            {fechaVisual(hasta)}
          </div>
        </section>

        <section
          style={styles.kpiGrid}
          className="reporte-kpi-grid"
        >
          <KpiEjecutivo
            titulo="Ingresos"
            valor={dinero(resumen.ingresos)}
            detalle="Cobros procesados en Caja"
            comparacion={textoCambio(
              resumen.ingresos,
              resumenAnterior.ingresos
            )}
            colorComparacion={colorCambio(
              resumen.ingresos,
              resumenAnterior.ingresos
            )}
            icono="↗"
            tono="indigo"
          />

          <KpiEjecutivo
            titulo="Gastos"
            valor={dinero(resumen.gastos)}
            detalle="Egresos activos del período"
            comparacion={textoCambio(
              resumen.gastos,
              resumenAnterior.gastos
            )}
            colorComparacion={colorCambio(
              resumen.gastos,
              resumenAnterior.gastos,
              true
            )}
            icono="↘"
            tono="lavanda"
          />

          <KpiEjecutivo
            titulo="Utilidad neta"
            valor={dinero(resumen.utilidad)}
            detalle="Ingresos menos gastos"
            comparacion={textoCambio(
              resumen.utilidad,
              resumenAnterior.utilidad
            )}
            colorComparacion={colorCambio(
              resumen.utilidad,
              resumenAnterior.utilidad
            )}
            icono="◎"
            tono={
              resumen.utilidad >= 0
                ? "verde"
                : "rojo"
            }
          />

          <KpiEjecutivo
            titulo="Margen neto"
            valor={`${resumen.margen.toFixed(
              1
            )}%`}
            detalle="Rentabilidad sobre ingresos"
            comparacion={`${resumenAnterior.margen.toFixed(
              1
            )}% período anterior`}
            colorComparacion="#6B7280"
            icono="%"
            tono="oscuro"
          />
        </section>

        <section
          style={styles.secondaryKpis}
          className="reporte-secondary-kpis"
        >
          <MiniKpi
            titulo="Ticket promedio"
            valor={dinero(
              resumen.ticketPromedio
            )}
            detalle="Por movimiento de ingreso"
          />

          <MiniKpi
            titulo="Gasto promedio diario"
            valor={dinero(
              resumen.gastoPromedioDiario
            )}
            detalle={`${diasEntre(
              desde,
              hasta
            )} día(s) analizados`}
          />

          <MiniKpi
            titulo="Movimientos de ingreso"
            valor={resumen.ingresosCantidad}
            detalle="Cobros procesados"
          />

          <MiniKpi
            titulo="Principal gasto"
            valor={
              gastosPorCategoria[0]
                ? gastosPorCategoria[0]
                    .categoria
                : "Sin gastos"
            }
            detalle={
              gastosPorCategoria[0]
                ? dinero(
                    gastosPorCategoria[0]
                      .monto
                  )
                : "No hay egresos"
            }
          />
        </section>

        <section
          style={styles.dashboardGrid}
          className="reporte-dashboard-grid"
        >
          <article style={styles.cardLarge}>
            <div style={styles.sectionHeader}>
              <div>
                <span
                  style={styles.sectionEyebrow}
                >
                  TENDENCIA
                </span>
                <h2 style={styles.sectionTitle}>
                  Ingresos vs gastos
                </h2>
                <p style={styles.sectionText}>
                  Evolución diaria del período
                  seleccionado.
                </p>
              </div>

              <div style={styles.legend}>
                <span>
                  <i
                    style={{
                      ...styles.legendDot,
                      background: "#4F46E5",
                    }}
                  />
                  Ingresos
                </span>
                <span>
                  <i
                    style={{
                      ...styles.legendDot,
                      background: "#A78BFA",
                    }}
                  />
                  Gastos
                </span>
              </div>
            </div>

            {tendenciaDiaria.length === 0 ? (
              <div style={styles.empty}>
                No hay movimientos para graficar.
              </div>
            ) : (
              <div
                style={styles.chart}
                className="reporte-chart"
              >
                {tendenciaDiaria.map((item) => {
                  const alturaIngreso = Math.max(
                    3,
                    (item.ingresos /
                      maximoTendencia) *
                      100
                  );

                  const alturaGasto = Math.max(
                    3,
                    (item.gastos /
                      maximoTendencia) *
                      100
                  );

                  return (
                    <div
                      key={item.fecha}
                      style={styles.chartColumn}
                      title={`${fechaVisual(
                        item.fecha
                      )} · Ingresos ${dinero(
                        item.ingresos
                      )} · Gastos ${dinero(
                        item.gastos
                      )}`}
                    >
                      <div style={styles.chartBars}>
                        <div
                          style={{
                            ...styles.barIncome,
                            height: `${alturaIngreso}%`,
                          }}
                        />
                        <div
                          style={{
                            ...styles.barExpense,
                            height: `${alturaGasto}%`,
                          }}
                        />
                      </div>

                      <span style={styles.chartLabel}>
                        {String(
                          item.fecha
                        ).slice(8, 10)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article style={styles.healthCard}>
            <div style={styles.sectionHeader}>
              <div>
                <span
                  style={styles.sectionEyebrowLight}
                >
                  SALUD DEL NEGOCIO
                </span>
                <h2
                  style={styles.healthTitle}
                >
                  Lectura financiera
                </h2>
              </div>
            </div>

            {diagnostico.length === 0 ? (
              <div style={styles.healthEmpty}>
                Todavía no hay suficiente
                información para generar una
                lectura financiera.
              </div>
            ) : (
              <div style={styles.healthList}>
                {diagnostico.map(
                  (item, index) => (
                    <Insight
                      key={`${item.titulo}-${index}`}
                      {...item}
                    />
                  )
                )}
              </div>
            )}
          </article>
        </section>

        <section
          style={styles.summaryGrid}
          className="reporte-summary-grid"
        >
          <article style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <span
                  style={styles.sectionEyebrow}
                >
                  INGRESOS
                </span>
                <h2 style={styles.sectionTitle}>
                  ¿De dónde viene el dinero?
                </h2>
              </div>
            </div>

            {ingresosPorCategoria.length ===
            0 ? (
              <div style={styles.empty}>
                No hay ingresos en este período.
              </div>
            ) : (
              <div style={styles.breakdownList}>
                {ingresosPorCategoria.map(
                  (item) => {
                    const porcentaje =
                      resumen.ingresos > 0
                        ? (item.monto /
                            resumen.ingresos) *
                          100
                        : 0;

                    return (
                      <BreakdownRow
                        key={item.categoria}
                        nombre={item.categoria}
                        monto={item.monto}
                        porcentaje={porcentaje}
                        tipo="ingreso"
                      />
                    );
                  }
                )}
              </div>
            )}
          </article>

          <article style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <span
                  style={styles.sectionEyebrow}
                >
                  GASTOS
                </span>
                <h2 style={styles.sectionTitle}>
                  ¿En qué se está gastando?
                </h2>
              </div>
            </div>

            {gastosPorCategoria.length ===
            0 ? (
              <div style={styles.empty}>
                No hay gastos en este período.
              </div>
            ) : (
              <div style={styles.breakdownList}>
                {gastosPorCategoria.map(
                  (item) => {
                    const porcentaje =
                      resumen.gastos > 0
                        ? (item.monto /
                            resumen.gastos) *
                          100
                        : 0;

                    return (
                      <BreakdownRow
                        key={item.categoria}
                        nombre={item.categoria}
                        monto={item.monto}
                        porcentaje={porcentaje}
                        tipo="gasto"
                      />
                    );
                  }
                )}
              </div>
            )}
          </article>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <span style={styles.sectionEyebrow}>
                MOVIMIENTOS
              </span>
              <h2 style={styles.sectionTitle}>
                Detalle financiero
              </h2>
              <p style={styles.sectionText}>
                Un registro por movimiento
                financiero real.
              </p>
            </div>

            <div
              style={styles.movementControls}
            >
              {[
                ["dia", "Día"],
                ["mes", "Mes"],
                ["anio", "Año"],
              ].map(([valor, label]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() =>
                    setVistaMovimientos(valor)
                  }
                  style={{
                    ...styles.movementFilterButton,
                    ...(vistaMovimientos === valor
                      ? styles.movementFilterButtonActive
                      : {}),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {movimientosAgrupados.length ===
          0 ? (
            <div style={styles.empty}>
              No hay movimientos financieros
              para mostrar.
            </div>
          ) : (
            <div style={styles.movementGroups}>
              {movimientosAgrupados.map(
                (grupo) => {
                  const ingresosGrupo =
                    grupo.items
                      .filter(
                        (item) =>
                          item.tipo === "Ingreso"
                      )
                      .reduce(
                        (total, item) =>
                          total +
                          Number(
                            item.monto || 0
                          ),
                        0
                      );

                  const gastosGrupo =
                    grupo.items
                      .filter(
                        (item) =>
                          item.tipo === "Gasto"
                      )
                      .reduce(
                        (total, item) =>
                          total +
                          Number(
                            item.monto || 0
                          ),
                        0
                      );

                  return (
                    <div
                      key={grupo.clave}
                      style={
                        styles.movementGroup
                      }
                    >
                      <div
                        style={
                          styles.movementGroupHeader
                        }
                      >
                        <div>
                          <strong
                            style={
                              styles.movementGroupTitle
                            }
                          >
                            {grupo.titulo}
                          </strong>
                          <span
                            style={
                              styles.movementGroupCount
                            }
                          >
                            {grupo.items.length}{" "}
                            movimiento
                            {grupo.items.length ===
                            1
                              ? ""
                              : "s"}
                          </span>
                        </div>

                        <div
                          style={
                            styles.movementGroupTotals
                          }
                        >
                          <span>
                            Ingresos{" "}
                            {dinero(
                              ingresosGrupo
                            )}
                          </span>
                          <span>
                            Gastos{" "}
                            {dinero(
                              gastosGrupo
                            )}
                          </span>
                        </div>
                      </div>

                      <div
                        style={styles.tableWrap}
                      >
                        <table
                          style={styles.table}
                        >
                          <thead>
                            <tr>
                              <th
                                style={styles.th}
                              >
                                Fecha
                              </th>
                              <th
                                style={styles.th}
                              >
                                Tipo
                              </th>
                              <th
                                style={styles.th}
                              >
                                Categoría
                              </th>
                              <th
                                style={styles.th}
                              >
                                Descripción
                              </th>
                              <th
                                style={styles.th}
                              >
                                Método
                              </th>
                              <th
                                style={{
                                  ...styles.th,
                                  textAlign:
                                    "right",
                                }}
                              >
                                Monto
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {grupo.items.map(
                              (item) => (
                                <tr
                                  key={item.id}
                                >
                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    {fechaVisual(
                                      item.fecha
                                    )}
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    <span
                                      style={{
                                        ...styles.typeBadge,
                                        ...(item.tipo ===
                                        "Gasto"
                                          ? styles.typeExpense
                                          : styles.typeIncome),
                                      }}
                                    >
                                      {
                                        item.tipo
                                      }
                                    </span>
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    {
                                      item.categoria
                                    }
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    <strong
                                      style={
                                        styles.description
                                      }
                                    >
                                      {
                                        item.descripcion
                                      }
                                    </strong>
                                    {item.fuente && (
                                      <span
                                        style={
                                          styles.sourceMini
                                        }
                                      >
                                        {
                                          item.fuente
                                        }
                                      </span>
                                    )}
                                  </td>

                                  <td
                                    style={
                                      styles.td
                                    }
                                  >
                                    {item.metodo ||
                                      "—"}
                                  </td>

                                  <td
                                    style={{
                                      ...styles.td,
                                      textAlign:
                                        "right",
                                      fontWeight: 900,
                                      color:
                                        item.tipo ===
                                        "Gasto"
                                          ? "#B42318"
                                          : "#08743C",
                                    }}
                                  >
                                    {item.tipo ===
                                    "Gasto"
                                      ? "− "
                                      : "+ "}
                                    {dinero(
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
                  );
                }
              )}
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          KONAX · Reporte Financiero Ejecutivo ·{" "}
          {VERSION}
          {fuentesActivas.length > 0
            ? ` · Fuentes: ${fuentesActivas.join(
                ", "
              )}`
            : ""}
        </footer>
      </div>
    </main>
  );
}

function KpiEjecutivo({
  titulo,
  valor,
  detalle,
  comparacion,
  colorComparacion,
  icono,
  tono = "indigo",
}) {
  const tonos = {
    indigo: {
      fondo:
        "linear-gradient(145deg,#FFFFFF,#F1F0FF)",
      borde: "#D9D6FE",
      iconoFondo: "#E8E7FF",
      iconoColor: "#4F46E5",
    },
    lavanda: {
      fondo:
        "linear-gradient(145deg,#FFFFFF,#F5F0FF)",
      borde: "#E4D8FF",
      iconoFondo: "#EEE7FF",
      iconoColor: "#7C3AED",
    },
    verde: {
      fondo:
        "linear-gradient(145deg,#FFFFFF,#F0FAF4)",
      borde: "#C9E8D4",
      iconoFondo: "#E4F5EA",
      iconoColor: "#08743C",
    },
    rojo: {
      fondo:
        "linear-gradient(145deg,#FFFFFF,#FFF3F3)",
      borde: "#F1CECE",
      iconoFondo: "#FFE7E7",
      iconoColor: "#B42318",
    },
    oscuro: {
      fondo:
        "linear-gradient(145deg,#242550,#343276)",
      borde: "#343276",
      iconoFondo:
        "rgba(255,255,255,.12)",
      iconoColor: "#FFFFFF",
      texto: "#FFFFFF",
      suave: "#D9D8F3",
    },
  };

  const t = tonos[tono] || tonos.indigo;

  return (
    <article
      style={{
        ...styles.executiveKpi,
        background: t.fondo,
        borderColor: t.borde,
      }}
    >
      <div
        style={{
          ...styles.executiveKpiIcon,
          background: t.iconoFondo,
          color: t.iconoColor,
        }}
      >
        {icono}
      </div>

      <span
        style={{
          ...styles.executiveKpiLabel,
          color: t.texto || "#69716D",
        }}
      >
        {titulo}
      </span>

      <strong
        style={{
          ...styles.executiveKpiValue,
          color: t.texto || "#17211C",
        }}
      >
        {valor}
      </strong>

      <span
        style={{
          ...styles.executiveKpiDetail,
          color: t.suave || "#7F8983",
        }}
      >
        {detalle}
      </span>

      <span
        style={{
          ...styles.executiveKpiCompare,
          color:
            tono === "oscuro"
              ? "#D9D8F3"
              : colorComparacion,
        }}
      >
        {comparacion}
      </span>
    </article>
  );
}

function MiniKpi({ titulo, valor, detalle }) {
  return (
    <article style={styles.miniKpi}>
      <span style={styles.miniKpiLabel}>
        {titulo}
      </span>
      <strong style={styles.miniKpiValue}>
        {valor}
      </strong>
      <span style={styles.miniKpiDetail}>
        {detalle}
      </span>
    </article>
  );
}

function BreakdownRow({
  nombre,
  monto,
  porcentaje,
  tipo,
}) {
  return (
    <div style={styles.breakdownCard}>
      <div style={styles.breakdownTop}>
        <div>
          <strong
            style={styles.breakdownName}
          >
            {nombre}
          </strong>
          <span
            style={styles.breakdownPercent}
          >
            {porcentaje.toFixed(1)}% del total
          </span>
        </div>

        <strong
          style={styles.breakdownAmount}
        >
          {dinero(monto)}
        </strong>
      </div>

      <div style={styles.progressTrack}>
        <div
          style={{
            ...styles.progressFill,
            width: `${Math.min(
              100,
              Math.max(0, porcentaje)
            )}%`,
            background:
              tipo === "gasto"
                ? "linear-gradient(90deg,#8B5CF6,#A78BFA)"
                : "linear-gradient(90deg,#4338CA,#6366F1)",
          }}
        />
      </div>
    </div>
  );
}

function Insight({ tono, titulo, texto }) {
  const tonos = {
    verde: {
      bg: "rgba(52,211,153,.13)",
      border: "rgba(52,211,153,.22)",
      dot: "#34D399",
    },
    amarillo: {
      bg: "rgba(251,191,36,.12)",
      border: "rgba(251,191,36,.22)",
      dot: "#FBBF24",
    },
    rojo: {
      bg: "rgba(248,113,113,.12)",
      border: "rgba(248,113,113,.22)",
      dot: "#F87171",
    },
    neutral: {
      bg: "rgba(255,255,255,.08)",
      border: "rgba(255,255,255,.13)",
      dot: "#C4B5FD",
    },
  };

  const t = tonos[tono] || tonos.neutral;

  return (
    <div
      style={{
        ...styles.insight,
        background: t.bg,
        borderColor: t.border,
      }}
    >
      <i
        style={{
          ...styles.insightDot,
          background: t.dot,
        }}
      />
      <div>
        <strong style={styles.insightTitle}>
          {titulo}
        </strong>
        <p style={styles.insightText}>
          {texto}
        </p>
      </div>
    </div>
  );
}

const CSS = `
  * {
    box-sizing: border-box;
  }

  html,
  body {
    max-width: 100%;
    overflow-x: hidden;
  }

  @media (max-width: 1050px) {
    .reporte-dashboard-grid {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 900px) {
    .reporte-kpi-grid {
      grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    }

    .reporte-summary-grid {
      grid-template-columns: 1fr !important;
    }

    .reporte-secondary-kpis {
      grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    }
  }

  @media (max-width: 650px) {
    .reporte-hero {
      padding: 15px !important;
    }

    .reporte-filter {
      align-items: stretch !important;
    }

    .reporte-kpi-grid,
    .reporte-secondary-kpis {
      grid-template-columns: 1fr !important;
    }

    .reporte-executive-strip {
      align-items: flex-start !important;
      flex-direction: column !important;
    }

    .reporte-chart {
      min-width: 640px;
    }
  }
`;

const styles = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    background:
      "radial-gradient(circle at top left,rgba(99,102,241,.10),transparent 26%), radial-gradient(circle at top right,rgba(167,139,250,.12),transparent 26%), #F4F3FA",
    color: "#17211C",
    fontFamily:
      '"Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif',
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 12,
    background: "#F4F3FA",
    color: "#4F46E5",
    fontFamily:
      '"Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif',
  },

  spinner: {
    width: 42,
    height: 42,
    border: "5px solid #E4E1F4",
    borderTopColor: "#4F46E5",
    borderRadius: "50%",
  },

  container: {
    width: "100%",
    maxWidth: 1450,
    margin: "0 auto",
  },

  hero: {
    marginBottom: 14,
    padding: "18px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    borderRadius: 20,
    background:
      "radial-gradient(circle at 82% 18%,rgba(255,255,255,.14),transparent 28%), linear-gradient(125deg,#171940 0%,#3730A3 52%,#6D5BD0 100%)",
    color: "#FFFFFF",
    boxShadow:
      "0 20px 48px rgba(46,43,122,.22)",
  },

  heroBrand: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minWidth: 0,
  },

  logoBox: {
    width: 108,
    minHeight: 60,
    padding: "7px 10px",
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#FFFFFF",
    flex: "0 0 auto",
  },

  logo: {
    width: 90,
    height: "auto",
    objectFit: "contain",
  },

  eyebrow: {
    display: "block",
    marginBottom: 4,
    color: "#C4B5FD",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  title: {
    margin: 0,
    fontSize: "clamp(27px,3vw,39px)",
    lineHeight: 1,
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#E4E2F5",
    fontSize: 11,
    lineHeight: 1.4,
  },

  heroButton: {
    minHeight: 40,
    padding: "0 14px",
    border: "1px solid rgba(255,255,255,.24)",
    borderRadius: 11,
    background: "rgba(255,255,255,.08)",
    color: "#FFFFFF",
    fontWeight: 850,
    cursor: "pointer",
  },

  error: {
    marginBottom: 12,
    padding: 12,
    border: "1px solid #FECACA",
    borderRadius: 11,
    background: "#FEF2F2",
    color: "#991B1B",
    fontWeight: 700,
    fontSize: 12,
  },

  filterCard: {
    marginBottom: 14,
    padding: 12,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    border: "1px solid #DDD9F0",
    borderRadius: 15,
    background: "rgba(255,255,255,.88)",
    boxShadow:
      "0 8px 22px rgba(60,56,120,.06)",
  },

  quickFilters: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  quickButton: {
    minHeight: 38,
    padding: "0 12px",
    border: "1px solid #DDD9EF",
    borderRadius: 10,
    background: "#FAF9FF",
    color: "#555164",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },

  quickButtonActive: {
    borderColor: "#6366F1",
    background: "#EEEDFF",
    color: "#4338CA",
  },

  customFilters: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },

  field: {
    display: "grid",
    gap: 4,
  },

  label: {
    color: "#6E6A79",
    fontSize: 9,
    fontWeight: 850,
  },

  input: {
    minHeight: 38,
    padding: "7px 9px",
    border: "1px solid #D8D5E6",
    borderRadius: 9,
    background: "#FFFFFF",
    color: "#202027",
    fontSize: 11,
  },

  primaryButton: {
    minHeight: 38,
    padding: "0 14px",
    border: 0,
    borderRadius: 10,
    background:
      "linear-gradient(135deg,#4338CA,#6366F1)",
    color: "#FFFFFF",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 7px 16px rgba(79,70,229,.18)",
  },

  executiveStrip: {
    marginBottom: 10,
    padding: "3px 2px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 12,
    flexWrap: "wrap",
  },

  executiveEyebrow: {
    color: "#6366F1",
    fontSize: 9,
    fontWeight: 950,
    letterSpacing: 1.15,
  },

  executiveTitle: {
    margin: "4px 0 0",
    color: "#232238",
    fontSize: 21,
    letterSpacing: "-.35px",
  },

  executiveRange: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#ECEAFF",
    color: "#5148B5",
    fontSize: 9,
    fontWeight: 850,
  },

  kpiGrid: {
    marginBottom: 10,
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: 10,
  },

  executiveKpi: {
    minHeight: 144,
    padding: 16,
    display: "grid",
    alignContent: "start",
    gap: 5,
    border: "1px solid",
    borderRadius: 17,
    boxShadow:
      "0 8px 22px rgba(53,49,111,.055)",
  },

  executiveKpiIcon: {
    width: 34,
    height: 34,
    marginBottom: 3,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    fontSize: 17,
    fontWeight: 950,
  },

  executiveKpiLabel: {
    fontSize: 9,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: .8,
  },

  executiveKpiValue: {
    fontSize: 27,
    lineHeight: 1,
  },

  executiveKpiDetail: {
    fontSize: 9,
  },

  executiveKpiCompare: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: 850,
  },

  secondaryKpis: {
    marginBottom: 12,
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: 8,
  },

  miniKpi: {
    minHeight: 82,
    padding: "12px 13px",
    display: "grid",
    alignContent: "center",
    gap: 3,
    border: "1px solid #E2DFF0",
    borderRadius: 13,
    background: "rgba(255,255,255,.78)",
  },

  miniKpiLabel: {
    color: "#777381",
    fontSize: 9,
    fontWeight: 850,
  },

  miniKpiValue: {
    color: "#25243A",
    fontSize: 18,
    lineHeight: 1.1,
  },

  miniKpiDetail: {
    color: "#8B8793",
    fontSize: 8.5,
  },

  dashboardGrid: {
    marginBottom: 12,
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1.7fr) minmax(320px,.8fr)",
    gap: 12,
  },

  cardLarge: {
    minWidth: 0,
    padding: 16,
    border: "1px solid #DFDCEC",
    borderRadius: 17,
    background: "#FFFFFF",
    boxShadow:
      "0 9px 24px rgba(55,51,109,.055)",
  },

  healthCard: {
    padding: 16,
    borderRadius: 17,
    background:
      "radial-gradient(circle at 90% 0%,rgba(167,139,250,.18),transparent 35%),linear-gradient(145deg,#22214B,#343274)",
    color: "#FFFFFF",
    boxShadow:
      "0 13px 30px rgba(45,42,100,.18)",
  },

  healthTitle: {
    margin: "4px 0 0",
    fontSize: 19,
  },

  sectionHeader: {
    marginBottom: 12,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },

  sectionEyebrow: {
    display: "block",
    color: "#6366F1",
    fontSize: 8.5,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  sectionEyebrowLight: {
    display: "block",
    color: "#C4B5FD",
    fontSize: 8.5,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  sectionTitle: {
    margin: "4px 0 0",
    fontSize: 19,
    color: "#242332",
  },

  sectionText: {
    margin: "5px 0 0",
    color: "#85818C",
    fontSize: 9.5,
  },

  legend: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    color: "#6D6977",
    fontSize: 9,
    fontWeight: 800,
  },

  legendDot: {
    width: 8,
    height: 8,
    display: "inline-block",
    marginRight: 5,
    borderRadius: "50%",
  },

  chart: {
    minHeight: 240,
    padding: "15px 8px 0",
    display: "flex",
    alignItems: "stretch",
    gap: 7,
    overflowX: "auto",
    borderTop: "1px solid #F0EEF7",
  },

  chartColumn: {
    minWidth: 28,
    flex: "1 0 28px",
    display: "grid",
    gridTemplateRows: "1fr 18px",
    gap: 6,
    alignItems: "end",
  },

  chartBars: {
    height: 200,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
  },

  barIncome: {
    width: "42%",
    minHeight: 3,
    borderRadius: "6px 6px 2px 2px",
    background:
      "linear-gradient(180deg,#6366F1,#4338CA)",
  },

  barExpense: {
    width: "42%",
    minHeight: 3,
    borderRadius: "6px 6px 2px 2px",
    background:
      "linear-gradient(180deg,#C4B5FD,#8B5CF6)",
  },

  chartLabel: {
    color: "#8B8793",
    fontSize: 8,
    textAlign: "center",
  },

  healthList: {
    display: "grid",
    gap: 8,
  },

  healthEmpty: {
    padding: 14,
    border: "1px dashed rgba(255,255,255,.18)",
    borderRadius: 12,
    color: "#DCD9F1",
    fontSize: 10,
    lineHeight: 1.5,
  },

  insight: {
    padding: 11,
    display: "grid",
    gridTemplateColumns: "8px minmax(0,1fr)",
    gap: 9,
    border: "1px solid",
    borderRadius: 12,
  },

  insightDot: {
    width: 8,
    height: 8,
    marginTop: 4,
    borderRadius: "50%",
  },

  insightTitle: {
    display: "block",
    fontSize: 10.5,
  },

  insightText: {
    margin: "4px 0 0",
    color: "#DEDCEF",
    fontSize: 9,
    lineHeight: 1.45,
  },

  summaryGrid: {
    marginBottom: 12,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  card: {
    marginBottom: 12,
    padding: 16,
    border: "1px solid #DFDCEC",
    borderRadius: 17,
    background: "#FFFFFF",
    boxShadow:
      "0 8px 22px rgba(55,51,109,.05)",
  },

  breakdownList: {
    display: "grid",
    gap: 8,
  },

  breakdownCard: {
    padding: "10px 11px",
    border: "1px solid #ECEAF5",
    borderRadius: 11,
    background: "#FCFBFF",
  },

  breakdownTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },

  breakdownName: {
    display: "block",
    color: "#363442",
    fontSize: 10.5,
  },

  breakdownPercent: {
    display: "block",
    marginTop: 2,
    color: "#8B8793",
    fontSize: 8.5,
  },

  breakdownAmount: {
    color: "#262439",
    fontSize: 11,
  },

  progressTrack: {
    height: 6,
    marginTop: 8,
    overflow: "hidden",
    borderRadius: 999,
    background: "#ECEAF4",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  empty: {
    minHeight: 90,
    display: "grid",
    placeItems: "center",
    border: "1px dashed #D9D6E7",
    borderRadius: 12,
    background: "#FBFAFE",
    color: "#85818C",
    fontSize: 11,
    textAlign: "center",
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: 760,
    borderCollapse: "collapse",
  },

  th: {
    padding: "10px 11px",
    borderBottom: "1px solid #E2E0EA",
    background: "#F8F7FC",
    color: "#6E6A78",
    fontSize: 9,
    fontWeight: 900,
    textAlign: "left",
  },

  td: {
    padding: "11px",
    borderBottom: "1px solid #F0EEF5",
    color: "#514E58",
    fontSize: 10.5,
    verticalAlign: "middle",
  },

  description: {
    display: "block",
    color: "#272630",
    fontSize: 10.5,
  },

  sourceMini: {
    display: "block",
    marginTop: 2,
    color: "#8D8993",
    fontSize: 8,
  },

  typeBadge: {
    display: "inline-flex",
    padding: "5px 8px",
    borderRadius: 999,
    fontSize: 8,
    fontWeight: 900,
  },

  typeIncome: {
    background: "#EBEEFF",
    color: "#4338CA",
  },

  typeExpense: {
    background: "#F3EDFF",
    color: "#7C3AED",
  },

  movementControls: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  movementFilterButton: {
    minHeight: 34,
    padding: "0 11px",
    border: "1px solid #DDD9EE",
    borderRadius: 9,
    background: "#FAF9FF",
    color: "#555164",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  movementFilterButtonActive: {
    borderColor: "#6366F1",
    background: "#EEEDFF",
    color: "#4338CA",
  },

  movementGroups: {
    display: "grid",
    gap: 12,
  },

  movementGroup: {
    border: "1px solid #E5E2ED",
    borderRadius: 13,
    overflow: "hidden",
    background: "#FFFFFF",
  },

  movementGroupHeader: {
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    background: "#F9F8FC",
    borderBottom: "1px solid #E7E4EE",
  },

  movementGroupTitle: {
    display: "block",
    color: "#25243A",
    fontSize: 12,
  },

  movementGroupCount: {
    display: "block",
    marginTop: 2,
    color: "#85818C",
    fontSize: 8.5,
  },

  movementGroupTotals: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    color: "#5C5866",
    fontSize: 9,
    fontWeight: 800,
  },

  footer: {
    padding: "4px 2px 18px",
    color: "#918D98",
    fontSize: 9,
    textAlign: "right",
  },
};
