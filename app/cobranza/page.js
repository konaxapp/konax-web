"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CobranzaGeneral() {
  const [cartera, setCartera] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroGestor, setFiltroGestor] = useState("Todos");

  useEffect(() => {
    cargarCartera();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de usar Cobranza.");
      return null;
    }

    return empresaId;
  }

  function calcularDiasAtraso(fechaVencimiento, saldoActual) {
    if (!fechaVencimiento || Number(saldoActual || 0) <= 0) return 0;

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = hoy - vencimiento;

    if (diferencia <= 0) return 0;

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  function obtenerEstadoPorDias(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "Cancelado";
    if (dias <= 0) return "Al Día";
    if (dias <= 60) return "Mora";
    if (dias > 60) return "Legal";
    return "Mora";
  }

  function obtenerSemaforo(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "⚫";
    if (dias <= 0) return "🟢";
    if (dias <= 30) return "🟡";
    if (dias <= 60) return "🟠";
    return "🔴";
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
        semaforo: obtenerSemaforo(dias, cuenta.saldo_actual),
      };
    });

    setCartera(carteraArmada);
  }

  const carteraFiltrada = cartera.filter((item) => {
    const texto = busqueda.toLowerCase();

    const coincideBusqueda =
      !texto ||
      item.cliente?.nombre?.toLowerCase().includes(texto) ||
      item.cliente?.cedula?.toLowerCase().includes(texto) ||
      item.cuenta?.numero_cuenta?.toLowerCase().includes(texto);

    const coincideEstado =
      filtroEstado === "Todos" || item.estado === filtroEstado;

    const gestor = item.cobranza?.responsable_cobro || "Sin asignar";

    const coincideGestor =
      filtroGestor === "Todos" || gestor === filtroGestor;

    return coincideBusqueda && coincideEstado && coincideGestor;
  });

  const gestores = [
    "Todos",
    ...new Set(
      cartera
        .map((item) => item.cobranza?.responsable_cobro || "Sin asignar")
        .filter(Boolean)
    ),
  ];

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

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("Todos");
    setFiltroGestor("Todos");
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
              Cartera, mora, estados, responsables y seguimiento de clientes.
            </p>
          </div>
        </div>

        <div style={kpiGrid}>
          <KPI titulo="Cartera Total" valor={totalCartera} />
          <KPI titulo="Al Día" valor={totalAlDia} />
          <KPI titulo="En Mora" valor={totalMora} />
          <KPI titulo="Legal" valor={totalLegal} />
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

            <select
              value={filtroGestor}
              onChange={(e) => setFiltroGestor(e.target.value)}
              style={inputStyle}
            >
              {gestores.map((gestor) => (
                <option key={gestor}>{gestor}</option>
              ))}
            </select>

            <button style={botonNegro} onClick={limpiarFiltros}>
              Limpiar
            </button>
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
                    <td style={td}>
                      {item.semaforo} {item.estado}
                    </td>
                    <td style={td}>{item.cliente?.nombre || "-"}</td>
                    <td style={td}>{item.cliente?.cedula || "-"}</td>
                    <td style={td}>{item.cuenta?.numero_cuenta || "-"}</td>
                    <td style={td}>{item.cuenta?.descripcion || "-"}</td>
                    <td style={td}>
                      ${Number(item.cuenta?.saldo_actual || 0).toLocaleString()}
                    </td>
                    <td style={td}>
                      ${Number(item.cuenta?.cuota || 0).toLocaleString()}
                    </td>
                    <td style={td}>{item.dias}</td>
                    <td style={td}>
                      {item.cobranza?.responsable_cobro || "Sin asignar"}
                    </td>
                    <td style={td}>
                      {item.cobranza?.proxima_gestion || "-"}
                    </td>
                    <td style={td}>
                      <button style={boton} onClick={() => verCliente(item)}>
                        Ver cliente
                      </button>
                    </td>
                  </tr>
                ))}

                {carteraFiltrada.length === 0 && (
                  <tr>
                    <td style={td} colSpan="11">
                      No hay registros para mostrar.
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

function KPI({ titulo, valor }) {
  return (
    <div style={cardKpi}>
      <p style={kpiTitulo}>{titulo}</p>
      <h2 style={kpiValor}>${Number(valor || 0).toLocaleString()}</h2>
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
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
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
  fontSize: "26px",
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
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
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
