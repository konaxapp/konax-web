"use client";

import { useEffect, useState } from "react";
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
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    cargarDatos();
  }, []);

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      window.location.href = "/login";
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

  function estadoAutomatico(cuenta, cobranza) {
    if (Number(cuenta?.saldo_actual || 0) <= 0) return "Cancelado";

    if (cobranza?.estado_cobranza) return cobranza.estado_cobranza;
    if (cuenta?.estado) return cuenta.estado;

    const dias = calcularDiasAtraso(
      cuenta?.fecha_vencimiento,
      cuenta?.saldo_actual
    );

    if (dias <= 0) return "Al Día";
    if (dias <= 90) return "Mora";
    return "Legal";
  }

  async function cargarDatos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data: cuentasData, error: errorCuentas } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId);

    if (errorCuentas) {
      alert("Error cargando cuentas: " + errorCuentas.message);
      return;
    }

    const { data: clientesData } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId);

    const { data: cobranzasData } = await supabase
      .from("informacion_cobranza")
      .select("*")
      .eq("empresa_id", empresaId);

    const { data: pagosData } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("estado", "Procesado");

    const { data: gestionesData } = await supabase
      .from("bitacora_cliente")
      .select("*")
      .eq("empresa_id", empresaId);

    setCuentas(cuentasData || []);
    setClientes(clientesData || []);
    setCobranzas(cobranzasData || []);
    setPagos(pagosData || []);
    setGestiones(gestionesData || []);
  }

  function limpiarFiltros() {
    setFiltroDesde("");
    setFiltroHasta("");
    setFiltroGestor("Todos");
    setFiltroEstado("Todos");
  }

  function imprimirReporte() {
    window.print();
  }

  const cartera = cuentas.map((cuenta) => {
    const cliente = clientes.find((c) => c.id === cuenta.cliente_id);
    const cobranza = cobranzas.find(
      (c) => c.informacion_comercial_id === cuenta.id
    );

    const dias = calcularDiasAtraso(
      cuenta.fecha_vencimiento,
      cuenta.saldo_actual
    );

    const estado = estadoAutomatico(cuenta, cobranza);
    const gestor =
      cobranza?.responsable_cobro || cuenta?.responsable || "Sin asignar";

    return {
      cuenta,
      cliente,
      cobranza,
      dias,
      estado,
      gestor,
    };
  });

  const gestores = [
    "Todos",
    ...new Set(cartera.map((item) => item.gestor).filter(Boolean)),
  ];

  const carteraFiltrada = cartera.filter((item) => {
    const coincideGestor =
      filtroGestor === "Todos" || item.gestor === filtroGestor;

    const coincideEstado =
      filtroEstado === "Todos" || item.estado === filtroEstado;

    return coincideGestor && coincideEstado;
  });

  const pagosFiltrados = pagos.filter((pago) => {
    const fecha = fechaSimple(pago.fecha_pago || pago.created_at);

    const coincideDesde = !filtroDesde || fecha >= filtroDesde;
    const coincideHasta = !filtroHasta || fecha <= filtroHasta;

    return coincideDesde && coincideHasta;
  });

  const gestionesFiltradas = gestiones.filter((g) => {
    const fecha = fechaSimple(g.fecha_gestion || g.created_at);

    const coincideDesde = !filtroDesde || fecha >= filtroDesde;
    const coincideHasta = !filtroHasta || fecha <= filtroHasta;

    return coincideDesde && coincideHasta;
  });

  const hoy = new Date().toISOString().split("T")[0];
  const mesActual = new Date().toISOString().slice(0, 7);

  const carteraTotal = carteraFiltrada.reduce(
    (sum, item) => sum + Number(item.cuenta?.saldo_actual || 0),
    0
  );

  const carteraAlDia = carteraFiltrada
    .filter((item) => item.estado === "Al Día")
    .reduce((sum, item) => sum + Number(item.cuenta?.saldo_actual || 0), 0);

  const carteraMora = carteraFiltrada
    .filter((item) => item.estado === "Mora" || item.estado === "Legal")
    .reduce((sum, item) => sum + Number(item.cuenta?.saldo_actual || 0), 0);

  const porcentajeMora =
    carteraTotal > 0 ? (carteraMora / carteraTotal) * 100 : 0;

  const cobradoHoy = pagos
    .filter((p) => fechaSimple(p.fecha_pago || p.created_at) === hoy)
    .reduce((sum, p) => sum + Number(p.monto || 0), 0);

  const cobradoMes = pagos
    .filter((p) =>
      fechaSimple(p.fecha_pago || p.created_at).startsWith(mesActual)
    )
    .reduce((sum, p) => sum + Number(p.monto || 0), 0);

  const cobradoPeriodo = pagosFiltrados.reduce(
    (sum, p) => sum + Number(p.monto || 0),
    0
  );

  const clientesActivos = carteraFiltrada.length;

  const clientesMora = carteraFiltrada.filter(
    (item) => item.estado === "Mora" || item.estado === "Legal"
  ).length;

  const promesas = gestiones.filter(
    (g) =>
      g.tipo_gestion === "Promesa de Pago" ||
      g.resultado_gestion === "Promesa registrada" ||
      g.resultado_gestion === "Promesa de Pago"
  );

  const promesasActivas = promesas.filter(
    (p) => p.proxima_gestion && fechaSimple(p.proxima_gestion) >= hoy
  ).length;

  const promesasIncumplidas = promesas.filter(
    (p) => p.proxima_gestion && fechaSimple(p.proxima_gestion) < hoy
  ).length;

  const promesasCumplidas = gestiones.filter(
    (g) => g.resultado_gestion === "Pago Realizado"
  ).length;

  const semaforo = {
    verde: carteraFiltrada
      .filter((i) => i.dias <= 0)
      .reduce((s, i) => s + Number(i.cuenta?.saldo_actual || 0), 0),

    amarillo: carteraFiltrada
      .filter((i) => i.dias >= 1 && i.dias <= 29)
      .reduce((s, i) => s + Number(i.cuenta?.saldo_actual || 0), 0),

    naranja: carteraFiltrada
      .filter((i) => i.dias >= 30 && i.dias <= 59)
      .reduce((s, i) => s + Number(i.cuenta?.saldo_actual || 0), 0),

    rojo: carteraFiltrada
      .filter((i) => i.dias >= 60)
      .reduce((s, i) => s + Number(i.cuenta?.saldo_actual || 0), 0),
  };

  const moraAntiguedad = [
    { rango: "1-29 días", monto: semaforo.amarillo },
    { rango: "30-59 días", monto: semaforo.naranja },
    { rango: "60+ días", monto: semaforo.rojo },
  ];

  const rankingGestores = gestores
    .filter((g) => g !== "Todos")
    .map((gestor) => {
      const cuentasGestor = cartera.filter((item) => item.gestor === gestor);

      const gestionesGestor = gestionesFiltradas.filter(
        (g) => (g.usuario || "Sin asignar") === gestor
      );

      const cobradoGestor = pagosFiltrados
        .filter((p) => (p.usuario || p.vendedor || "Sin asignar") === gestor)
        .reduce((sum, p) => sum + Number(p.monto || 0), 0);

      const asignado = cuentasGestor.reduce(
        (sum, item) => sum + Number(item.cuenta?.saldo_actual || 0),
        0
      );

      const recuperacion = asignado > 0 ? (cobradoGestor / asignado) * 100 : 0;

      return {
        gestor,
        cobrado: cobradoGestor,
        clientes: cuentasGestor.length,
        gestiones: gestionesGestor.length,
        recuperacion,
      };
    });

  const mayorMora = [...carteraFiltrada]
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 10);

  const mayorSaldo = [...carteraFiltrada]
    .sort(
      (a, b) =>
        Number(b.cuenta?.saldo_actual || 0) -
        Number(a.cuenta?.saldo_actual || 0)
    )
    .slice(0, 10);

  const maxMora = Math.max(...moraAntiguedad.map((m) => m.monto), 1);
  const maxGestor = Math.max(...rankingGestores.map((g) => g.cobrado), 1);

  const formato = (numero) =>
    "USD " +
    Number(numero || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

  const avanceCobro = carteraTotal > 0 ? (cobradoMes / carteraTotal) * 100 : 0;

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={tituloBox}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <h1 style={titulo}>Dashboard Cobranza</h1>
              <p style={subtitulo}>
                Indicadores reales de cartera, mora, cobros, promesas y gestores.
              </p>
            </div>
          </div>

          <div style={accionesTop}>
            <button style={botonDashboard} onClick={volverDashboard}>
              ← Volver al Dashboard
            </button>

            <button style={botonNegro} onClick={imprimirReporte}>
              Imprimir Reporte
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Filtros</h2>

          <div style={gridFiltros}>
            <Campo label="Fecha desde">
              <input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Fecha hasta">
              <input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
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
          </div>

          <div style={acciones}>
            <button style={botonGris} onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        </div>

        <div style={kpiGrid}>
          <KPI titulo="Cartera Total" valor={formato(carteraTotal)} icono="💰" />
          <KPI titulo="Cartera Al Día" valor={formato(carteraAlDia)} icono="🟢" />
          <KPI titulo="Cartera en Mora" valor={formato(carteraMora)} icono="🔴" />
          <KPI titulo="% Mora" valor={`${porcentajeMora.toFixed(1)}%`} icono="📈" />
          <KPI titulo="Cobrado Hoy" valor={formato(cobradoHoy)} icono="📅" />
          <KPI titulo="Cobrado Mes" valor={formato(cobradoMes)} icono="📆" />
          <KPI titulo="Cobrado Periodo" valor={formato(cobradoPeriodo)} icono="🧾" />
          <KPI titulo="Clientes Activos" valor={clientesActivos} icono="👥" />
          <KPI titulo="Clientes en Mora" valor={clientesMora} icono="🚨" />
          <KPI titulo="Promesas Activas" valor={promesasActivas} icono="🤝" />
          <KPI titulo="Promesas Cumplidas" valor={promesasCumplidas} icono="✅" />
          <KPI titulo="Promesas Incumplidas" valor={promesasIncumplidas} icono="⚠️" />
        </div>

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>Recuperación del Mes</h2>

            <p style={textoGrande}>{formato(cobradoMes)} recuperado este mes</p>

            <div style={barraFondo}>
              <div
                style={{
                  ...barraProgreso,
                  width: `${Math.min(avanceCobro, 100)}%`,
                }}
              />
            </div>

            <p style={nota}>
              Equivale al {avanceCobro.toFixed(1)}% de la cartera filtrada.
            </p>
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Semáforo General</h2>

            <div style={semaforoGrid}>
              <Semaforo label="🟢 Al día" valor={formato(semaforo.verde)} />
              <Semaforo label="🟡 1-29 días" valor={formato(semaforo.amarillo)} />
              <Semaforo label="🟠 30-59 días" valor={formato(semaforo.naranja)} />
              <Semaforo label="🔴 60+ días" valor={formato(semaforo.rojo)} />
            </div>
          </div>
        </div>

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>Cobro por Gestor</h2>

            {rankingGestores.length === 0 && (
              <p style={nota}>Aún no hay gestores con cobros registrados.</p>
            )}

            {rankingGestores.map((g) => (
              <div key={g.gestor} style={barraItem}>
                <div style={barraHeader}>
                  <strong>{g.gestor}</strong>
                  <span>{formato(g.cobrado)}</span>
                </div>

                <div style={barraFondo}>
                  <div
                    style={{
                      ...barraProgreso,
                      width: `${(g.cobrado / maxGestor) * 100}%`,
                    }}
                  />
                </div>

                <p style={nota}>
                  Clientes: {g.clientes} · Gestiones: {g.gestiones} ·
                  Recuperación: {g.recuperacion.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Mora por Antigüedad</h2>

            {moraAntiguedad.map((m) => (
              <div key={m.rango} style={barraItem}>
                <div style={barraHeader}>
                  <strong>{m.rango}</strong>
                  <span>{formato(m.monto)}</span>
                </div>

                <div style={barraFondo}>
                  <div
                    style={{
                      ...barraProgreso,
                      width: `${(m.monto / maxMora) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Tabla
          titulo="Top Clientes con Mayor Mora"
          columnas={["Cliente", "Días", "Saldo", "Gestor"]}
          filas={mayorMora.map((item) => [
            item.cliente?.nombre || "Sin nombre",
            item.dias,
            formato(item.cuenta?.saldo_actual),
            item.gestor,
          ])}
        />

        <Tabla
          titulo="Top Clientes con Mayor Saldo"
          columnas={["Cliente", "Saldo", "Estado"]}
          filas={mayorSaldo.map((item) => [
            item.cliente?.nombre || "Sin nombre",
            formato(item.cuenta?.saldo_actual),
            item.estado,
          ])}
        />

        <Tabla
          titulo="Ranking de Gestores"
          columnas={["Gestor", "Cobrado", "Clientes", "Gestiones", "% Recuperación"]}
          filas={rankingGestores.map((g) => [
            g.gestor,
            formato(g.cobrado),
            g.clientes,
            g.gestiones,
            `${g.recuperacion.toFixed(1)}%`,
          ])}
        />
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

function KPI({ titulo, valor, icono }) {
  return (
    <div style={cardIndicador}>
      <div style={iconoBox}>{icono}</div>
      <p style={cardTitulo}>{titulo}</p>
      <h2 style={cardNumero}>{valor}</h2>
    </div>
  );
}

function Semaforo({ label, valor }) {
  return (
    <div style={semaforoItem}>
      <span>{label}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function Tabla({ titulo, columnas, filas }) {
  return (
    <div style={card}>
      <h2 style={tituloSeccion}>{titulo}</h2>

      <div style={{ overflowX: "auto" }}>
        <table style={tabla}>
          <thead>
            <tr>
              {columnas.map((col, index) => (
                <th key={index} style={th}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td style={td} colSpan={columnas.length}>
                  No hay datos disponibles.
                </td>
              </tr>
            ) : (
              filas.map((fila, index) => (
                <tr key={index}>
                  {fila.map((celda, i) => (
                    <td key={i} style={td}>
                      {celda}
                    </td>
                  ))}
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

const encabezado = {
  background: "linear-gradient(135deg, #111827, #1e40af)",
  color: "#ffffff",
  padding: "24px",
  borderRadius: "20px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
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

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "16px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
};

const tituloSeccion = {
  marginTop: 0,
  marginBottom: "14px",
  color: "#111827",
};

const gridFiltros = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
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

const acciones = {
  display: "flex",
  gap: "10px",
  marginTop: "14px",
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
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const cardIndicador = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
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
  gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
  gap: "16px",
};

const textoGrande = {
  fontSize: "22px",
  fontWeight: "bold",
  color: "#111827",
};

const nota = {
  color: "#6b7280",
  fontSize: "14px",
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

const semaforoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: "12px",
};

const semaforoItem = {
  background: "#f9fafb",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
};

const barraItem = {
  marginBottom: "16px",
};

const barraHeader = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "6px",
  color: "#374151",
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
};

const td = {
  padding: "11px",
  borderBottom: "1px solid #e5e7eb",
};
