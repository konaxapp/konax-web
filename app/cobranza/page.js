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

  function obtenerSemaforo(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "⚫";
    if (dias <= 0) return "🟢";
    if (dias <= 30) return "🟡";
    if (dias <= 90) return "🟠";
    return "🔴";
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

      const dias = calcularDiasAtraso(
        cuenta.fecha_vencimiento,
        cuenta.saldo_actual
      );

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
        semaforo: obtenerSemaforo(dias, cuenta.saldo_actual),
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

  const hoy = new Date().toISOString().split("T")[0];
  const mesActual = new Date().toISOString().slice(0, 7);

  const cobradoHoy = pagosCobranza
    .filter((p) => fechaSimple(p.fecha_pago) === hoy)
    .reduce((sum, p) => sum + Number(p.monto || 0), 0);

  const cobradoMes = pagosCobranza
    .filter((p) => fechaSimple(p.fecha_pago).startsWith(mesActual))
    .reduce((sum, p) => sum + Number(p.monto || 0), 0);

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

  const promesasActivas = gestionesFiltradas.filter(
    (g) =>
      g.tipo_gestion === "Promesa de Pago" &&
      g.proxima_gestion &&
      g.proxima_gestion >= hoy
  ).length;

  const promesasVencidas = gestionesFiltradas.filter(
    (g) =>
      g.tipo_gestion === "Promesa de Pago" &&
      g.proxima_gestion &&
      g.proxima_gestion < hoy
  ).length;

  const llamadas = gestionesFiltradas.filter((g) => g.tipo_gestion === "Llamada").length;
  const noContesto = gestionesFiltradas.filter((g) => g.resultado_gestion === "No contestó").length;
  const noLocalizado = gestionesFiltradas.filter((g) => g.resultado_gestion === "No localizado").length;
  const telefonoApagado = gestionesFiltradas.filter((g) => g.resultado_gestion === "Teléfono apagado").length;
  const seMudo = gestionesFiltradas.filter((g) => g.resultado_gestion === "Se mudó").length;
  const whatsapp = gestionesFiltradas.filter((g) => g.resultado_gestion === "WhatsApp enviado").length;

  const clientesGestionados = [
    ...new Set(gestionesFiltradas.map((g) => g.cliente_id).filter(Boolean)),
  ].length;

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
        porcentaje,
        llamadas: gestionesGestor.filter((g) => g.tipo_gestion === "Llamada").length,
        noContesto: gestionesGestor.filter((g) => g.resultado_gestion === "No contestó").length,
        noLocalizado: gestionesGestor.filter((g) => g.resultado_gestion === "No localizado").length,
        whatsapp: gestionesGestor.filter((g) => g.resultado_gestion === "WhatsApp enviado").length,
        promesas: gestionesGestor.filter((g) => g.tipo_gestion === "Promesa de Pago").length,
      };
    });

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

  function verCliente(item) {
    const texto =
      item.cuenta?.numero_cuenta || item.cliente?.cedula || item.cliente?.nombre;

    localStorage.setItem("busquedaVistaCliente", texto || "");
    window.location.href = "/vista-cliente";
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div>
            <h1 style={titulo}>Cobranza General</h1>
            <p style={subtitulo}>
              Dashboard, cartera, supervisión de gestores y seguimiento de cobros.
            </p>
          </div>

          <button style={botonNegro} onClick={imprimirReporte}>
            Imprimir / Guardar PDF
          </button>
        </div>

        <div style={kpiGrid}>
          <KPI titulo="Cartera Total" valor={totalCartera} />
          <KPI titulo="Al Día" valor={totalAlDia} />
          <KPI titulo="En Mora" valor={totalMora} />
          <KPI titulo="Legal" valor={totalLegal} />
          <KPI titulo="Cobrado Hoy" valor={cobradoHoy} />
          <KPI titulo="Cobrado Mes" valor={cobradoMes} />
          <KPI titulo="Clientes Mora" valor={clientesMora} tipo="numero" />
          <KPI titulo="Gestionados" valor={clientesGestionados} tipo="numero" />
          <KPI titulo="Llamadas" valor={llamadas} tipo="numero" />
          <KPI titulo="No contestó" valor={noContesto} tipo="numero" />
          <KPI titulo="No localizado" valor={noLocalizado} tipo="numero" />
          <KPI titulo="Teléfono apagado" valor={telefonoApagado} tipo="numero" />
          <KPI titulo="Se mudó" valor={seMudo} tipo="numero" />
          <KPI titulo="WhatsApp" valor={whatsapp} tipo="numero" />
          <KPI titulo="Promesas Activas" valor={promesasActivas} tipo="numero" />
          <KPI titulo="Promesas Vencidas" valor={promesasVencidas} tipo="numero" />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Filtros</h2>

          <div style={gridFiltros}>
            <input
              placeholder="Buscar por nombre, cédula o número de cuenta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={inputStyle}
            />

            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={inputStyle}>
              <option>Todos</option>
              <option>Al Día</option>
              <option>Mora</option>
              <option>Legal</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
            </select>

            <select value={filtroGestor} onChange={(e) => setFiltroGestor(e.target.value)} style={inputStyle}>
              {gestores.map((gestor) => (
                <option key={gestor}>{gestor}</option>
              ))}
            </select>

            <select value={filtroMora} onChange={(e) => setFiltroMora(e.target.value)} style={inputStyle}>
              <option>Todos</option>
              <option>Al Día</option>
              <option>1-30 días</option>
              <option>31-90 días</option>
              <option>91-180 días</option>
              <option>181+ días</option>
            </select>

            <select value={filtroResultado} onChange={(e) => setFiltroResultado(e.target.value)} style={inputStyle}>
              <option>Todos</option>
              <option>Contestó</option>
              <option>No contestó</option>
              <option>No localizado</option>
              <option>Teléfono apagado</option>
              <option>Se mudó</option>
              <option>WhatsApp enviado</option>
              <option>Promesa registrada</option>
              <option>Pago realizado</option>
            </select>

            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={inputStyle} />
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={inputStyle} />

            <button style={botonNegro} onClick={limpiarFiltros}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>Mora por antigüedad</h2>
            {moraRangos.map((item) => (
              <Barra key={item.label} label={item.label} valor={item.monto} max={maxMora} />
            ))}
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Supervisión por Gestor</h2>

            <div style={{ overflowX: "auto" }}>
              <table style={tabla}>
                <thead>
                  <tr>
                    <th style={th}>Gestor</th>
                    <th style={th}>Asignados</th>
                    <th style={th}>Gestionados</th>
                    <th style={th}>%</th>
                    <th style={th}>Llamadas</th>
                    <th style={th}>No contestó</th>
                    <th style={th}>No localizado</th>
                    <th style={th}>WhatsApp</th>
                    <th style={th}>Promesas</th>
                  </tr>
                </thead>
                <tbody>
                  {actividadPorGestor.map((item) => (
                    <tr key={item.gestor}>
                      <td style={td}>{item.gestor}</td>
                      <td style={td}>{item.asignados}</td>
                      <td style={td}>{item.gestionados}</td>
                      <td style={td}>{item.porcentaje}%</td>
                      <td style={td}>{item.llamadas}</td>
                      <td style={td}>{item.noContesto}</td>
                      <td style={td}>{item.noLocalizado}</td>
                      <td style={td}>{item.whatsapp}</td>
                      <td style={td}>{item.promesas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Cartera</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Estado</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Cuenta</th>
                  <th style={th}>Producto</th>
                  <th style={th}>Saldo</th>
                  <th style={th}>Cuota</th>
                  <th style={th}>Días</th>
                  <th style={th}>Gestor</th>
                  <th style={th}>Próxima Gestión</th>
                  <th style={th}>Acción</th>
                </tr>
              </thead>

              <tbody>
                {carteraFiltrada.map((item) => (
                  <tr key={item.cuenta.id}>
                    <td style={td}>{item.semaforo} {item.estado}</td>
                    <td style={td}>{item.cliente?.nombre || "-"}</td>
                    <td style={td}>{item.cliente?.cedula || "-"}</td>
                    <td style={td}>{item.cuenta?.numero_cuenta || "-"}</td>
                    <td style={td}>{item.cuenta?.descripcion || "-"}</td>
                    <td style={td}>${Number(item.cuenta?.saldo_actual || 0).toLocaleString()}</td>
                    <td style={td}>${Number(item.cuenta?.cuota || 0).toLocaleString()}</td>
                    <td style={td}>{item.dias}</td>
                    <td style={td}>{item.cobranza?.responsable_cobro || "Sin asignar"}</td>
                    <td style={td}>{item.cobranza?.proxima_gestion || "-"}</td>
                    <td style={td}>
                      <button style={boton} onClick={() => verCliente(item)}>
                        Ver cliente
                      </button>
                    </td>
                  </tr>
                ))}

                {carteraFiltrada.length === 0 && (
                  <tr>
                    <td style={td} colSpan="11">No hay registros para mostrar.</td>
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
  width: "110px",
  height: "auto",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  marginTop: "5px",
  color: "#6b7280",
  fontSize: "15px",
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const cardKpi = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const kpiTitulo = {
  margin: 0,
  color: "#6b7280",
  fontSize: "14px",
};

const kpiValor = {
  marginTop: "8px",
  color: "#111827",
  fontSize: "24px",
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
  marginBottom: "14px",
  color: "#111827",
};

const gridFiltros = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
  gap: "12px",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "9px 16px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
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

const barraItem = {
  marginBottom: "16px",
};

const barraHeader = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "6px",
  color: "#374151",
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
