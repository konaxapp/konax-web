"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

/*
  KONAX · REPORTE FINANCIERO MULTI-NEGOCIO
  Adaptado para:
  - Gimnasio / negocios de membresía
  - Salón de belleza / barbería / spa
  - Lavandería

  IMPORTANTE:
  Este componente intenta leer ingresos desde tablas operativas existentes
  sin romper si alguna tabla todavía no existe en un módulo.

  Fuentes reales usadas:
  - caja   -> ingresos procesados
  - gastos -> egresos activos

  No suma Agenda, Membresías, Ventas ni Pedidos por separado
  para evitar duplicar cobros que ya fueron registrados en Caja.
*/

const VERSION = "2026.08.17-REPORTE-FINANCIERO-KONAX-REAL-V2";

function fechaHoy() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function primerDiaMes() {
  const d = new Date();
  const local = new Date(d.getFullYear(), d.getMonth(), 1);
  const offset = local.getTimezoneOffset();
  return new Date(local.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
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

  const d = new Date(`${String(fecha).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(d.getTime())) {
    return String(fecha);
  }

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function detectarTipoNegocio(tipoNegocio, categoriaNegocio = "") {
  const texto = normalizar(`${tipoNegocio || ""} ${categoriaNegocio || ""}`);

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
    [
      "lavanderia",
      "lavandería",
      "laundry",
    ].some((x) => texto.includes(normalizar(x)))
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
  const iso = (fecha) => {
    const offset = fecha.getTimezoneOffset();
    return new Date(fecha.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 10);
  };

  if (tipo === "hoy") {
    const f = iso(hoy);
    return { desde: f, hasta: f };
  }

  if (tipo === "semana") {
    const inicio = new Date(hoy);
    const dia = inicio.getDay();
    const ajuste = dia === 0 ? -6 : 1 - dia;
    inicio.setDate(inicio.getDate() + ajuste);

    return {
      desde: iso(inicio),
      hasta: iso(hoy),
    };
  }

  return {
    desde: primerDiaMes(),
    hasta: iso(hoy),
  };
}

export default function ReporteFinanciero() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("general");

  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(fechaHoy());
  const [rangoActivo, setRangoActivo] = useState("mes");

  const [movimientos, setMovimientos] = useState([]);
  const [fuentesActivas, setFuentesActivas] = useState([]);

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

      const empresaLocal = localStorage.getItem("empresaId") || "";
      const empresaNombreLocal = localStorage.getItem("empresaNombre") || "";
      const tipoNegocioLocal = localStorage.getItem("tipoNegocio") || "";
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
      setError(err?.message || "No se pudo cargar el reporte financiero.");
    } finally {
      setCargando(false);
    }
  }

  async function consultaSegura(nombre, ejecutor) {
    try {
      const respuesta = await ejecutor();

      if (respuesta?.error) {
        const codigo = respuesta.error.code || "";
        const mensaje = normalizar(respuesta.error.message || "");

        const esTablaInexistente =
          codigo === "42P01" ||
          mensaje.includes("does not exist") ||
          mensaje.includes("no existe");

        if (esTablaInexistente) {
          return { data: [], disponible: false };
        }

        console.error(`Fuente ${nombre}:`, respuesta.error);
        return { data: [], disponible: false };
      }

      return {
        data: Array.isArray(respuesta?.data) ? respuesta.data : [],
        disponible: true,
      };
    } catch (err) {
      console.error(`Fuente ${nombre}:`, err);
      return { data: [], disponible: false };
    }
  }

  function fechaDentro(fecha, inicio, fin) {
    const f = String(fecha || "").slice(0, 10);
    return f && f >= inicio && f <= fin;
  }

  function agregarMovimiento(lista, item) {
    const monto = Number(item.monto || 0);

    if (!Number.isFinite(monto) || monto === 0) return;

    lista.push({
      id: item.id || `${item.fuente}-${Math.random()}`,
      fecha: item.fecha || fechaHoy(),
      tipo: item.tipo || "Ingreso",
      categoria: item.categoria || "Otros",
      descripcion: item.descripcion || "Movimiento",
      monto: Math.abs(monto),
      metodo: item.metodo || "",
      fuente: item.fuente || "",
      referencia: item.referencia || "",
    });
  }

  async function cargarReporte({
    idEmpresa = empresaId,
    fechaDesde = desde,
    fechaHasta = hasta,
    tipo = tipoNegocio,
  } = {}) {
    if (!idEmpresa || !fechaDesde || !fechaHasta) return;

    if (fechaDesde > fechaHasta) {
      setError("La fecha desde no puede ser mayor que la fecha hasta.");
      return;
    }

    setCargando(true);
    setError("");

    try {
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
            .order("fecha_pago", { ascending: false })
            .order("created_at", { ascending: false })
        ),

        consultaSegura("Gastos", () =>
          supabase
            .from("gastos")
            .select(
              "id,empresa_id,fecha,categoria,descripcion,monto,metodo_pago,responsable,observacion,estado,created_at"
            )
            .eq("empresa_id", idEmpresa)
            .neq("estado", "Anulado")
            .gte("fecha", fechaDesde)
            .lte("fecha", fechaHasta)
            .order("fecha", { ascending: false })
            .order("created_at", { ascending: false })
        ),
      ]);

      const nuevasFuentes = [];
      const lista = [];

      if (cajaResp.disponible) nuevasFuentes.push("Caja");
      if (gastosResp.disponible) nuevasFuentes.push("Gastos");

      cajaResp.data.forEach((mov) => {
        const monto = Number(mov.monto || 0);

        if (!Number.isFinite(monto) || monto <= 0) return;

        agregarMovimiento(lista, {
          id: `caja-${mov.id}`,
          fecha:
            mov.fecha_pago ||
            String(mov.created_at || "").slice(0, 10) ||
            fechaHoy(),
          tipo: "Ingreso",
          categoria: categoriaIngresoCaja(mov, tipo),
          descripcion:
            mov.descripcion ||
            mov.tipo ||
            "Ingreso registrado en Caja",
          monto,
          metodo: mov.metodo_pago || "",
          fuente: "Caja",
          referencia:
            mov.numero_transaccion ||
            mov.id,
        });
      });

      gastosResp.data.forEach((gasto) => {
        const monto = Number(gasto.monto || 0);

        if (!Number.isFinite(monto) || monto <= 0) return;

        agregarMovimiento(lista, {
          id: `gasto-${gasto.id}`,
          fecha:
            gasto.fecha ||
            String(gasto.created_at || "").slice(0, 10) ||
            fechaHoy(),
          tipo: "Gasto",
          categoria:
            gasto.categoria ||
            "Otros",
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
        const porFecha = String(b.fecha || "").localeCompare(
          String(a.fecha || "")
        );

        if (porFecha !== 0) return porFecha;

        return String(b.id || "").localeCompare(String(a.id || ""));
      });

      setMovimientos(lista);
      setFuentesActivas(nuevasFuentes);
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo generar el reporte.");
    } finally {
      setCargando(false);
    }
  }

  function categoriaIngresoCaja(movimiento, tipo) {
    const texto = normalizar(
      `${movimiento?.tipo || ""} ${movimiento?.descripcion || ""}`
    );

    if (tipo === "belleza") {
      if (
        texto.includes("servicio de salon") ||
        texto.includes("servicio del salon") ||
        texto.includes("reserva")
      ) {
        return "Servicios";
      }

      if (texto.includes("producto") || texto.includes("venta")) {
        return "Productos";
      }

      return "Otros ingresos";
    }

    if (tipo === "gimnasio") {
      if (texto.includes("membres")) return "Membresías";
      if (texto.includes("renovacion")) return "Renovaciones";
      if (texto.includes("inscripcion") || texto.includes("matricula")) {
        return "Inscripciones";
      }
      if (texto.includes("pase diario")) return "Pases diarios";
      if (texto.includes("clase") || texto.includes("sesion")) {
        return "Clases / Sesiones";
      }
      if (texto.includes("producto") || texto.includes("venta")) {
        return "Productos";
      }

      return "Otros ingresos";
    }

    if (tipo === "lavanderia") {
      if (texto.includes("pedido")) return "Pedidos";
      if (texto.includes("delivery")) return "Delivery";
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

  const resumen = useMemo(() => {
    const ingresos = movimientos
      .filter((m) => m.tipo === "Ingreso")
      .reduce((total, m) => total + Number(m.monto || 0), 0);

    const gastos = movimientos
      .filter((m) => m.tipo === "Gasto")
      .reduce((total, m) => total + Number(m.monto || 0), 0);

    const utilidad = ingresos - gastos;
    const margen =
      ingresos > 0
        ? (utilidad / ingresos) * 100
        : 0;

    return {
      ingresos,
      gastos,
      utilidad,
      margen,
    };
  }, [movimientos]);

  const ingresosPorCategoria = useMemo(() => {
    const mapa = new Map();

    movimientos
      .filter((m) => m.tipo === "Ingreso")
      .forEach((m) => {
        const categoria = m.categoria || "Otros";
        mapa.set(
          categoria,
          Number(mapa.get(categoria) || 0) + Number(m.monto || 0)
        );
      });

    return Array.from(mapa.entries())
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [movimientos]);

  const gastosPorCategoria = useMemo(() => {
    const mapa = new Map();

    movimientos
      .filter((m) => m.tipo === "Gasto")
      .forEach((m) => {
        const categoria = m.categoria || "Otros";
        mapa.set(
          categoria,
          Number(mapa.get(categoria) || 0) + Number(m.monto || 0)
        );
      });

    return Array.from(mapa.entries())
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [movimientos]);

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
        <strong>Cargando reporte financiero...</strong>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <style>{CSS}</style>

      <div style={styles.container}>
        <header style={styles.hero}>
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
                KONAX · REPORTE FINANCIERO
              </span>

              <h1 style={styles.title}>
                Reporte Financiero
              </h1>

              <p style={styles.subtitle}>
                {empresaNombre || "KONAX"} · {etiquetaTipo(tipoNegocio)}
                {" · "}
                Ingresos, gastos y utilidad del negocio.
              </p>
            </div>
          </div>

          <button
            type="button"
            style={styles.heroButton}
            onClick={() => (window.location.href = "/dashboard")}
          >
            ← Panel principal
          </button>
        </header>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <section style={styles.filterCard}>
          <div style={styles.quickFilters}>
            {[
              ["hoy", "Hoy"],
              ["semana", "Esta semana"],
              ["mes", "Este mes"],
            ].map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                onClick={() => aplicarRango(valor)}
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
              <span style={styles.label}>Desde</span>
              <input
                type="date"
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value);
                  setRangoActivo("personalizado");
                }}
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Hasta</span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value);
                  setRangoActivo("personalizado");
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
              {cargando ? "Generando..." : "Generar"}
            </button>
          </div>
        </section>

        <section style={styles.kpiGrid} className="reporte-kpi-grid">
          <article style={styles.kpiCard}>
            <span style={styles.kpiLabel}>INGRESOS</span>
            <strong style={styles.kpiValue}>
              {dinero(resumen.ingresos)}
            </strong>
            <span style={styles.kpiHint}>
              Ingresos procesados en Caja
            </span>
          </article>

          <article style={styles.kpiCard}>
            <span style={styles.kpiLabel}>GASTOS</span>
            <strong style={styles.kpiValue}>
              {dinero(resumen.gastos)}
            </strong>
            <span style={styles.kpiHint}>
              Egresos del período
            </span>
          </article>

          <article
            style={{
              ...styles.kpiCard,
              ...(resumen.utilidad >= 0
                ? styles.kpiPositive
                : styles.kpiNegative),
            }}
          >
            <span style={styles.kpiLabel}>UTILIDAD</span>
            <strong style={styles.kpiValue}>
              {dinero(resumen.utilidad)}
            </strong>
            <span style={styles.kpiHint}>
              Ingresos menos gastos
            </span>
          </article>

          <article style={styles.kpiCardAccent}>
            <span style={styles.kpiLabelAccent}>MARGEN</span>
            <strong style={styles.kpiValueAccent}>
              {resumen.margen.toFixed(1)}%
            </strong>
            <span style={styles.kpiHintAccent}>
              Margen neto
            </span>
          </article>
        </section>

        <section style={styles.summaryGrid} className="reporte-summary-grid">
          <article style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <span style={styles.sectionEyebrow}>
                  INGRESOS
                </span>
                <h2 style={styles.sectionTitle}>
                  Ingresos por origen
                </h2>
              </div>
            </div>

            {ingresosPorCategoria.length === 0 ? (
              <div style={styles.empty}>
                No hay ingresos en este período.
              </div>
            ) : (
              <div style={styles.breakdownList}>
                {ingresosPorCategoria.map((item) => (
                  <div
                    key={item.categoria}
                    style={styles.breakdownRow}
                  >
                    <span>{item.categoria}</span>
                    <strong>{dinero(item.monto)}</strong>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <span style={styles.sectionEyebrow}>
                  GASTOS
                </span>
                <h2 style={styles.sectionTitle}>
                  Gastos por categoría
                </h2>
              </div>
            </div>

            {gastosPorCategoria.length === 0 ? (
              <div style={styles.empty}>
                No hay gastos en este período.
              </div>
            ) : (
              <div style={styles.breakdownList}>
                {gastosPorCategoria.map((item) => (
                  <div
                    key={item.categoria}
                    style={styles.breakdownRow}
                  >
                    <span>{item.categoria}</span>
                    <strong>{dinero(item.monto)}</strong>
                  </div>
                ))}
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
                Movimientos financieros
              </h2>
            </div>

            <div style={styles.sourceBox}>
              <span>Fuentes</span>
              <strong>
                {fuentesActivas.length
                  ? fuentesActivas.join(" · ")
                  : "Sin fuentes disponibles"}
              </strong>
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Categoría</th>
                  <th style={styles.th}>Descripción</th>
                  <th style={styles.th}>Método</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>
                    Monto
                  </th>
                </tr>
              </thead>

              <tbody>
                {movimientos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={styles.emptyCell}
                    >
                      No hay movimientos financieros para mostrar.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((item) => (
                    <tr key={item.id}>
                      <td style={styles.td}>
                        {fechaVisual(item.fecha)}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.typeBadge,
                            ...(item.tipo === "Gasto"
                              ? styles.typeExpense
                              : styles.typeIncome),
                          }}
                        >
                          {item.tipo}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {item.categoria}
                      </td>

                      <td style={styles.td}>
                        <strong style={styles.description}>
                          {item.descripcion}
                        </strong>
                        {item.fuente && (
                          <span style={styles.sourceMini}>
                            {item.fuente}
                          </span>
                        )}
                      </td>

                      <td style={styles.td}>
                        {item.metodo || "—"}
                      </td>

                      <td
                        style={{
                          ...styles.td,
                          textAlign: "right",
                          fontWeight: 900,
                          color:
                            item.tipo === "Gasto"
                              ? "#B42318"
                              : "#08743C",
                        }}
                      >
                        {item.tipo === "Gasto" ? "− " : "+ "}
                        {dinero(item.monto)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer style={styles.footer}>
          KONAX · Reporte Financiero · {VERSION}
        </footer>
      </div>
    </main>
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

  @media (max-width: 900px) {
    .reporte-kpi-grid {
      grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    }

    .reporte-summary-grid {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 560px) {
    .reporte-kpi-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;

const styles = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    background:
      "radial-gradient(circle at top right, rgba(22,131,79,.07), transparent 28%), #F3F6F4",
    color: "#17211C",
    fontFamily: "Inter, Arial, system-ui, sans-serif",
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 12,
    background: "#F3F6F4",
    color: "#16834F",
    fontFamily: "Arial, sans-serif",
  },

  spinner: {
    width: 42,
    height: 42,
    border: "5px solid #DCE8E1",
    borderTopColor: "#16834F",
    borderRadius: "50%",
  },

  container: {
    width: "100%",
    maxWidth: 1450,
    margin: "0 auto",
  },

  hero: {
    marginBottom: 14,
    padding: "17px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    borderRadius: 18,
    background:
      "linear-gradient(135deg,#071C14 0%,#0B4A2B 62%,#0F7A42 100%)",
    color: "#FFFFFF",
    boxShadow: "0 12px 30px rgba(6,40,25,.14)",
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
    color: "#75E0A4",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  title: {
    margin: 0,
    fontSize: "clamp(27px,3vw,38px)",
    lineHeight: 1,
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#D9ECE2",
    fontSize: 11,
    lineHeight: 1.4,
  },

  heroButton: {
    minHeight: 38,
    padding: "0 13px",
    border: "1px solid rgba(255,255,255,.24)",
    borderRadius: 10,
    background: "rgba(255,255,255,.07)",
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
    border: "1px solid #DCE5DF",
    borderRadius: 15,
    background: "#FFFFFF",
    boxShadow: "0 6px 18px rgba(15,23,42,.04)",
  },

  quickFilters: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  quickButton: {
    minHeight: 38,
    padding: "0 12px",
    border: "1px solid #D6E1DA",
    borderRadius: 10,
    background: "#F8FBF9",
    color: "#435047",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },

  quickButtonActive: {
    borderColor: "#16834F",
    background: "#EAF8EF",
    color: "#0B7542",
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
    color: "#65736B",
    fontSize: 9,
    fontWeight: 850,
  },

  input: {
    minHeight: 38,
    padding: "7px 9px",
    border: "1px solid #CCD7D0",
    borderRadius: 9,
    background: "#FFFFFF",
    color: "#17211C",
    fontSize: 11,
  },

  primaryButton: {
    minHeight: 38,
    padding: "0 14px",
    border: 0,
    borderRadius: 10,
    background: "#16834F",
    color: "#FFFFFF",
    fontWeight: 900,
    cursor: "pointer",
  },

  kpiGrid: {
    marginBottom: 14,
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
  },

  kpiCard: {
    minHeight: 116,
    padding: 15,
    display: "grid",
    alignContent: "center",
    gap: 5,
    border: "1px solid #DCE5DF",
    borderRadius: 15,
    background: "#FFFFFF",
    boxShadow: "0 6px 18px rgba(15,23,42,.04)",
  },

  kpiPositive: {
    borderColor: "#C8E7D3",
    background:
      "linear-gradient(180deg,#FFFFFF,#F4FBF7)",
  },

  kpiNegative: {
    borderColor: "#F3C7C2",
    background:
      "linear-gradient(180deg,#FFFFFF,#FFF5F4)",
  },

  kpiCardAccent: {
    minHeight: 116,
    padding: 15,
    display: "grid",
    alignContent: "center",
    gap: 5,
    borderRadius: 15,
    background:
      "linear-gradient(145deg,#0B6B3C,#0E8A4C)",
    color: "#FFFFFF",
    boxShadow: "0 9px 22px rgba(11,122,67,.16)",
  },

  kpiLabel: {
    color: "#748078",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1,
  },

  kpiLabelAccent: {
    color: "#B8EBCB",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1,
  },

  kpiValue: {
    fontSize: 28,
    lineHeight: 1,
  },

  kpiValueAccent: {
    fontSize: 28,
    lineHeight: 1,
  },

  kpiHint: {
    color: "#7A867F",
    fontSize: 9,
  },

  kpiHintAccent: {
    color: "#DDF3E6",
    fontSize: 9,
  },

  summaryGrid: {
    marginBottom: 14,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  card: {
    marginBottom: 14,
    padding: 16,
    border: "1px solid #DCE5DF",
    borderRadius: 16,
    background: "#FFFFFF",
    boxShadow: "0 7px 20px rgba(15,23,42,.04)",
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
    color: "#16834F",
    fontSize: 8.5,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  sectionTitle: {
    margin: "4px 0 0",
    fontSize: 19,
    color: "#17211C",
  },

  breakdownList: {
    display: "grid",
    gap: 7,
  },

  breakdownRow: {
    minHeight: 42,
    padding: "0 11px",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    border: "1px solid #E6ECE8",
    borderRadius: 10,
    background: "#FBFDFC",
    color: "#4C5B53",
    fontSize: 11,
  },

  empty: {
    minHeight: 90,
    display: "grid",
    placeItems: "center",
    border: "1px dashed #D5DFD9",
    borderRadius: 12,
    background: "#FAFCFB",
    color: "#7A867F",
    fontSize: 11,
    textAlign: "center",
  },

  sourceBox: {
    display: "grid",
    gap: 2,
    color: "#75827A",
    fontSize: 8,
    textAlign: "right",
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
    borderBottom: "1px solid #DDE5E0",
    background: "#F7FAF8",
    color: "#66736C",
    fontSize: 9,
    fontWeight: 900,
    textAlign: "left",
  },

  td: {
    padding: "11px",
    borderBottom: "1px solid #EEF2EF",
    color: "#4A574F",
    fontSize: 10.5,
    verticalAlign: "middle",
  },

  description: {
    display: "block",
    color: "#17211C",
    fontSize: 10.5,
  },

  sourceMini: {
    display: "block",
    marginTop: 2,
    color: "#859089",
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
    background: "#EAF8EF",
    color: "#08743C",
  },

  typeExpense: {
    background: "#FFF0EE",
    color: "#B42318",
  },

  emptyCell: {
    padding: 28,
    textAlign: "center",
    color: "#7A867F",
    fontSize: 11,
  },

  footer: {
    padding: "4px 2px 18px",
    color: "#8B958F",
    fontSize: 9,
    textAlign: "right",
  },
};
