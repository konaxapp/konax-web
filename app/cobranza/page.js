"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CobranzaGeneral() {
  const [cartera, setCartera] = useState([]);
  const [pagosCobranza, setPagosCobranza] = useState([]);
  const [gestiones, setGestiones] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroGestor, setFiltroGestor] = useState("Todos");
  const [filtroMora, setFiltroMora] = useState("Todos");
  const [filtroResultado, setFiltroResultado] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");
    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de usar Cobranza.");
      return null;
    }
    return empresaId;
  }

  function fechaSimple(fecha) {
    return String(fecha || "").slice(0, 10);
  }

  function calcularDiasAtraso(fechaVencimiento, saldoActual) {
    if (!fechaVencimiento || Number(saldoActual || 0) <= 0) return 0;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = hoy - vencimiento;
    if (diferencia <= 0) return 0;
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  function obtenerRangoMora(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "Cancelado";
    if (dias <= 0) return "Al Día";
    if (dias <= 30) return "1-30 días";
    if (dias <= 90) return "31-90 días";
    if (dias <= 180) return "91-180 días";
    return "181+ días";
  }

  function obtenerEstadoPorDias(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "Cancelado";
    if (dias <= 0) return "Al Día";
    if (dias <= 90) return "Mora";
    return "Legal";
  }

  async function cargarDatos() {
    await cargarCartera();
    await cargarPagosCobranza();
    await cargarGestiones();
  }

  async function cargarCartera() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data: cuentasData, error: errorCuentas } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (errorCuentas) {
      alert("Error cargando cartera: " + errorCuentas.message);
      return;
    }

    const cuentas = cuentasData || [];
    const clienteIds = [...new Set(cuentas.map((c) => c.cliente_id).filter(Boolean))];
    const cuentaIds = cuentas.map((c) => c.id);

    let clientes = [];
    let cobranzas = [];

    if (clienteIds.length > 0) {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("id", clienteIds);

      clientes = data || [];
    }

    if (cuentaIds.length > 0) {
      const { data } = await supabase
        .from("informacion_cobranza")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("informacion_comercial_id", cuentaIds);

      cobranzas = data || [];
    }

    const carteraArmada = cuentas.map((cuenta) => {
      const cliente = clientes.find((c) => c.id === cuenta.cliente_id);
      const cobranza = cobranzas.find(
        (c) => c.informacion_comercial_id === cuenta.id
      );

      const dias = calcularDiasAtraso(cuenta.fecha_vencimiento, cuenta.saldo_actual);

      const estado =
        cobranza?.estado_cobranza ||
        cuenta.estado ||
        obtenerEstadoPorDias(dias, cuenta.saldo_actual);

      return {
        cuenta,
        cliente,
        cobranza,
        dias,
        estado,
        rangoMora: obtenerRangoMora(dias, cuenta.saldo_actual),
      };
    });

    setCartera(carteraArmada);
  }

  async function cargarPagosCobranza() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .in("tipo", ["Pago Crédito", "Abono", "Mensualidad"])
      .eq("estado", "Procesado")
      .order("fecha_pago", { ascending: false });

    if (!error) setPagosCobranza(data || []);
  }

  async function cargarGestiones() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("bitacora_cliente")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fecha_gestion", { ascending: false });

    if (!error) setGestiones(data || []);
  }

  const gestores = [
    "Todos",
    ...new Set(
      cartera
        .map((item) => item.cobranza?.responsable_cobro || "Sin asignar")
        .filter(Boolean)
    ),
  ];

  const carteraFiltrada = cartera.filter((item) => {
    const texto = busqueda.toLowerCase();
    const gestor = item.cobranza?.responsable_cobro || "Sin asignar";

    const coincideBusqueda =
      !texto ||
      item.cliente?.nombre?.toLowerCase().includes(texto) ||
      item.cliente?.cedula?.toLowerCase().includes(texto) ||
      item.cuenta?.numero_cuenta?.toLowerCase().includes(texto);

    const coincideEstado = filtroEstado === "Todos" || item.estado === filtroEstado;
    const coincideGestor = filtroGestor === "Todos" || gestor === filtroGestor;
    const coincideMora = filtroMora === "Todos" || item.rangoMora === filtroMora;

    return coincideBusqueda && coincideEstado && coincideGestor && coincideMora;
  });

  const gestionesFiltradas = gestiones.filter((g) => {
    const fecha = fechaSimple(g.fecha_gestion);
    const gestor = g.usuario || "Sin asignar";

    const coincideDesde = !fechaDesde || fecha >= fechaDesde;
    const coincideHasta = !fechaHasta || fecha <= fechaHasta;
    const coincideGestor = filtroGestor === "Todos" || gestor === filtroGestor;
    const coincideResultado =
      filtroResultado === "Todos" || g.resultado_gestion === filtroResultado;

    return coincideDesde && coincideHasta && coincideGestor && coincideResultado;
  });

  const pagosFiltrados = pagosCobranza.filter((p) => {
    const fecha = fechaSimple(p.fecha_pago);
    const coincideDesde = !fechaDesde || fecha >= fechaDesde;
    const coincideHasta = !fechaHasta || fecha <= fechaHasta;
    return coincideDesde && coincideHasta;
  });

  const hoy = new Date().toISOString().split("T")[0];
  const mesActual = new Date().toISOString().slice(0, 7);

  const cobradoHoy = pagosCobranza
    .filter((p) => fechaSimple(p.fecha_pago) === hoy)
    .reduce((sum, p) => sum + Number(p.monto || 0), 0);

  const cobradoMes = pagosCobranza
    .filter((p) => fechaSimple(p.fecha_pago).startsWith(mesActual))
    .reduce((sum, p) => sum + Number(p.monto || 0), 0);

  const cobradoPeriodo = pagosFiltrados.reduce(
    (sum, p) => sum + Number(p.monto || 0),
    0
  );

  const totalCartera = carteraFiltrada.reduce(
    (sum, item) => sum + Number(item.cuenta?.saldo_actual || 0),
    0
  );

  const totalAlDia = carteraFiltrada
    .filter((item) => item.estado === "Al Día")
    .reduce((sum, item) => sum + Number(item.cuenta?.saldo_actual || 0), 0);

  const totalMora = carteraFiltrada
    .filter((item) => item.estado === "Mora")
    .reduce((sum, item) => sum + Number(item.cuenta?.saldo_actual || 0), 0);

  const totalLegal = carteraFiltrada
    .filter((item) => item.estado === "Legal")
    .reduce((sum, item) => sum + Number(item.cuenta?.saldo_actual || 0), 0);

  const clientesMora = carteraFiltrada.filter(
    (item) => item.estado === "Mora" || item.estado === "Legal"
  ).length;

  const moraRangos = [
    "Al Día",
    "1-30 días",
    "31-90 días",
    "91-180 días",
    "181+ días",
  ].map((label) => ({
    label,
    monto: carteraFiltrada
      .filter((i) => i.rangoMora === label)
      .reduce((s, i) => s + Number(i.cuenta?.saldo_actual || 0), 0),
  }));

  const maxMora = Math.max(...moraRangos.map((r) => r.monto), 1);

  const actividadPorGestor = gestores
    .filter((g) => g !== "Todos")
    .map((gestor) => {
      const carteraGestor = cartera.filter(
        (item) => (item.cobranza?.responsable_cobro || "Sin asignar") === gestor
      );

      const gestionesGestor = gestionesFiltradas.filter(
        (g) => (g.usuario || "Sin asignar") === gestor
      );

      const clientesUnicos = [
        ...new Set(gestionesGestor.map((g) => g.cliente_id).filter(Boolean)),
      ].length;

      const porcentaje =
        carteraGestor.length > 0
          ? Math.round((clientesUnicos / carteraGestor.length) * 100)
          : 0;

      return {
        gestor,
        asignados: carteraGestor.length,
        gestionados: clientesUnicos,
        noGestionados: Math.max(carteraGestor.length - clientesUnicos, 0),
        totalGestiones: gestionesGestor.length,
        porcentaje,
      };
    });

  const pagosPorMes = agruparPagosPorMes(pagosCobranza).slice(-6);
  const maxPagoMes = Math.max(...pagosPorMes.map((m) => m.total), 1);

  function agruparPagosPorMes(pagos) {
    const mapa = {};

    pagos.forEach((pago) => {
      const mes = String(pago.fecha_pago || pago.created_at || "").slice(0, 7);
      if (!mes) return;
      if (!mapa[mes]) mapa[mes] = 0;
      mapa[mes] += Number(pago.monto || 0);
    });

    return Object.keys(mapa)
      .sort()
      .map((mes) => ({
        mes,
        total: mapa[mes],
      }));
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("Todos");
    setFiltroGestor("Todos");
    setFiltroMora("Todos");
    setFiltroResultado("Todos");
    setFechaDesde("");
    setFechaHasta("");
  }

  function imprimirReporte() {
    window.print();
  }

  const textoPeriodo =
    fechaDesde || fechaHasta
      ? `${fechaDesde || "inicio"} hasta ${fechaHasta || "hoy"}`
      : "Mes actual / sin rango aplicado";

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div style={{ flex: 1 }}>
            <h1 style={titulo}>Cobranza General</h1>
            <p style={subtitulo}>
              Supervisión ejecutiva de cartera, cobros y productividad de gestores.
            </p>
            <p style={periodo}>Periodo del reporte: {textoPeriodo}</p>
          </div>

          <button style={botonNegro} onClick={imprimirReporte}>
            Imprimir reporte
          </button>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Filtros de supervisión</h2>

          <div style={gridFiltros}>
            <Campo label="Buscar cliente, cédula o cuenta">
              <input
                placeholder="Ejemplo: Ana, 8-888, CTA-001"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Gestor">
              <select
                value={filtroGestor}
                onChange={(e) => setFiltroGestor(e.target.value)}
                style={inputStyle}
              >
                {gestores.map((gestor) => (
                  <option key={gestor}>{gestor}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Estado">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                style={inputStyle}
              >
                <option>Todos</option>
                <option>Al Día</option>
                <option>Mora</option>
                <option>Legal</option>
                <option>Suspendido</option>
                <option>Cancelado</option>
              </select>
            </Campo>

            <Campo label="Mora">
              <select
                value={filtroMora}
                onChange={(e) => setFiltroMora(e.target.value)}
                style={inputStyle}
              >
                <option>Todos</option>
                <option>Al Día</option>
                <option>1-30 días</option>
                <option>31-90 días</option>
                <option>91-180 días</option>
                <option>181+ días</option>
              </select>
            </Campo>

            <Campo label="Resultado">
              <select
                value={filtroResultado}
                onChange={(e) => setFiltroResultado(e.target.value)}
                style={inputStyle}
              >
                <option>Todos</option>
                <option>No contestó</option>
                <option>No localizado</option>
                <option>Teléfono apagado</option>
                <option>Número apagado</option>
                <option>Se mudó</option>
                <option>WhatsApp enviado</option>
                <option>Promesa de pago</option>
                <option>Pago realizado</option>
              </select>
            </Campo>

            <Campo label="Desde">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Hasta">
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Acción">
              <button style={botonSecundario} onClick={limpiarFiltros}>
                Limpiar
              </button>
            </Campo>
          </div>
        </div>

        <div style={kpiGrid}>
          <KPI titulo="Cartera Total" valor={totalCartera} />
          <KPI titulo="Al Día" valor={totalAlDia} />
          <KPI titulo="En Mora" valor={totalMora} />
          <KPI titulo="Legal" valor={totalLegal} />
          <KPI titulo="Cobrado Hoy" valor={cobradoHoy} />
          <KPI titulo="Cobrado Mes" valor={cobradoMes} />
          <KPI titulo="Cobrado Periodo" valor={cobradoPeriodo} />
          <KPI titulo="Clientes Mora" valor={clientesMora} tipo="numero" />
        </div>

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>Cobros últimos meses</h2>
            <p style={ayuda}>Comparativo de cobros registrados en caja.</p>
            <GraficaBarras data={pagosPorMes} max={maxPagoMes} />
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Mora por antigüedad</h2>
            <p style={ayuda}>Distribución actual de saldos según días de atraso.</p>
            {moraRangos.map((item) => (
              <Barra
                key={item.label}
                label={item.label}
                valor={item.monto}
                max={maxMora}
              />
            ))}
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Supervisión por Gestor</h2>
          <p style={ayuda}>
            Resumen ejecutivo de productividad según gestor y periodo seleccionado.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Gestor</th>
                  <th style={th}>Asignados</th>
                  <th style={th}>Gestionados</th>
                  <th style={th}>No gestionados</th>
                  <th style={th}>Total gestiones</th>
                  <th style={th}>% gestionado</th>
                </tr>
              </thead>

              <tbody>
                {actividadPorGestor.map((item) => (
                  <tr key={item.gestor}>
                    <td style={td}>{item.gestor}</td>
                    <td style={td}>{item.asignados}</td>
                    <td style={td}>{item.gestionados}</td>
                    <td style={td}>{item.noGestionados}</td>
                    <td style={td}>{item.totalGestiones}</td>
                    <td style={td}>
                      <strong>{item.porcentaje}%</strong>
                    </td>
                  </tr>
                ))}

                {actividadPorGestor.length === 0 && (
                  <tr>
                    <td style={td} colSpan="6">
                      No hay gestiones registradas para el periodo seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function KPI({ titulo, valor, tipo }) {
  return (
    <div style={cardKpi}>
      <p style={kpiTitulo}>{titulo}</p>
      <h2 style={kpiValor}>
        {tipo === "numero"
          ? Number(valor || 0).toLocaleString()
          : "$" + Number(valor || 0).toLocaleString()}
      </h2>
    </div>
  );
}

function Barra({ label, valor, max }) {
  const porcentaje = max > 0 ? Math.min((valor / max) * 100, 100) : 0;

  return (
    <div style={barraItem}>
      <div style={barraHeader}>
        <strong>{label}</strong>
        <span>${Number(valor || 0).toLocaleString()}</span>
      </div>

      <div style={barraFondo}>
        <div style={{ ...barraProgreso, width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

function GraficaBarras({ data, max }) {
  if (!data || data.length === 0) {
    return (
      <div style={emptyBox}>
        Aún no hay cobros registrados.
      </div>
    );
  }

  return (
    <div style={graficaMeses}>
      {data.map((item) => {
        const alto = max > 0 ? Math.max((item.total / max) * 160, 12) : 12;

        return (
          <div key={item.mes} style={barraMesBox}>
            <div style={barraMesValor}>
              ${Number(item.total || 0).toLocaleString()}
            </div>
            <div style={{ ...barraMes, height: `${alto}px` }} />
            <div style={barraMesLabel}>{item.mes}</div>
          </div>
        );
      })}
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "18px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1500px",
  margin: "0 auto",
};

const encabezado = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const logo = {
  width: "105px",
  height: "auto",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  marginTop: "5px",
  marginBottom: "4px",
  color: "#6b7280",
  fontSize: "15px",
};

const periodo = {
  margin: 0,
  color: "#16a34a",
  fontSize: "13px",
  fontWeight: "bold",
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const cardKpi = {
  background: "#ffffff",
  padding: "17px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const kpiTitulo = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
};

const kpiValor = {
  marginTop: "8px",
  color: "#111827",
  fontSize: "23px",
};

const gridDos = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
  gap: "16px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const tituloSeccion = {
  marginBottom: "6px",
  color: "#111827",
};

const ayuda = {
  marginTop: 0,
  marginBottom: "14px",
  color: "#6b7280",
  fontSize: "13px",
};

const gridFiltros = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
  gap: "14px",
  alignItems: "end",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const botonNegro = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "11px 20px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonSecundario = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "11px 20px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
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
  fontSize: "13px",
};

const td = {
  padding: "11px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
};

const barraItem = {
  marginBottom: "16px",
};

const barraHeader = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "6px",
  color: "#374151",
  fontSize: "13px",
};

const barraFondo = {
  width: "100%",
  height: "12px",
  background: "#e5e7eb",
  borderRadius: "999px",
  overflow: "hidden",
};

const barraProgreso = {
  height: "100%",
  background: "#16a34a",
  borderRadius: "999px",
};

const graficaMeses = {
  display: "flex",
  alignItems: "flex-end",
  gap: "12px",
  height: "230px",
  paddingTop: "20px",
  overflowX: "auto",
};

const barraMesBox = {
  minWidth: "75px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
};

const barraMes = {
  width: "34px",
  background: "#111827",
  borderRadius: "8px 8px 0 0",
};

const barraMesValor = {
  fontSize: "11px",
  color: "#374151",
  marginBottom: "6px",
  whiteSpace: "nowrap",
};

const barraMesLabel = {
  marginTop: "8px",
  fontSize: "12px",
  color: "#6b7280",
};

const emptyBox = {
  background: "#f9fafb",
  border: "1px dashed #d1d5db",
  borderRadius: "12px",
  padding: "18px",
  color: "#6b7280",
  fontSize: "14px",
};
