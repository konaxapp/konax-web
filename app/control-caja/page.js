"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ControlCaja() {
  const CODIGO_SUPERVISOR = "1234";

  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [movimientos, setMovimientos] = useState([]);
  const [cierres, setCierres] = useState([]);

  const [efectivoContado, setEfectivoContado] = useState("");
  const [observacion, setObservacion] = useState("");
  const [usuario, setUsuario] = useState("Administrador");

  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [supervisorApertura, setSupervisorApertura] = useState("");
  const [codigoSupervisor, setCodigoSupervisor] = useState("");
  const [accionSupervisor, setAccionSupervisor] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);

  useEffect(() => {
    cargarDatos();
    cargarEstadoCajaLocal();
  }, [fecha]);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de usar Control de Caja.");
      return null;
    }

    return empresaId;
  }

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function cargarEstadoCajaLocal() {
    const empresaId = localStorage.getItem("empresaId") || "sin_empresa";
    const estado = localStorage.getItem(`caja_abierta_${empresaId}_${fecha}`);
    const supervisor = localStorage.getItem(`supervisor_caja_${empresaId}_${fecha}`);

    setCajaAbierta(estado === "SI");
    setSupervisorApertura(supervisor || "");
  }

  async function cargarDatos() {
    await cargarMovimientos();
    await cargarCierres();
  }

  async function cargarMovimientos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("fecha_pago", fecha)
      .eq("estado", "Procesado");

    if (error) {
      alert("Error cargando movimientos: " + error.message);
      return;
    }

    setMovimientos(data || []);
  }

  async function cargarCierres() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("control_caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando cierres: " + error.message);
      return;
    }

    setCierres(data || []);
  }

  function totalPorMetodo(metodo) {
    return movimientos
      .filter((item) => item.metodo_pago === metodo)
      .reduce((sum, item) => sum + Number(item.monto || 0), 0);
  }

  const totalEfectivo = totalPorMetodo("Efectivo");
  const totalTransferencia = totalPorMetodo("Transferencia");
  const totalYappy = totalPorMetodo("Yappy");
  const totalTarjeta = totalPorMetodo("Tarjeta");
  const totalCheque = totalPorMetodo("Cheque");

  const totalSistema =
    totalEfectivo +
    totalTransferencia +
    totalYappy +
    totalTarjeta +
    totalCheque;

  const totalDigital =
    totalTransferencia + totalYappy + totalTarjeta + totalCheque;

  const diferencia = Number(efectivoContado || 0) - Number(totalEfectivo || 0);

  function abrirModalSupervisor(accion) {
    setAccionSupervisor(accion);
    setCodigoSupervisor("");
    setMostrarModal(true);
  }

  function cerrarModalSupervisor() {
    setMostrarModal(false);
    setCodigoSupervisor("");
    setAccionSupervisor("");
  }

  async function validarSupervisor() {
    if (codigoSupervisor !== CODIGO_SUPERVISOR) {
      alert("Código de supervisor incorrecto.");
      return;
    }

    if (accionSupervisor === "abrir") {
      abrirCajaAutorizada();
      return;
    }

    if (accionSupervisor === "cerrar") {
      await cerrarCajaAutorizada();
      return;
    }
  }

  function abrirCajaAutorizada() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    localStorage.setItem(`caja_abierta_${empresaId}_${fecha}`, "SI");
    localStorage.setItem(`supervisor_caja_${empresaId}_${fecha}`, usuario);

    setCajaAbierta(true);
    setSupervisorApertura(usuario);

    alert("Caja abierta correctamente con autorización de supervisor.");
    cerrarModalSupervisor();
  }

  async function cerrarCajaAutorizada() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!cajaAbierta) {
      alert("Primero debe abrir la caja.");
      return;
    }

    if (efectivoContado === "" || Number(efectivoContado) < 0) {
      alert("Ingrese un efectivo contado válido.");
      return;
    }

    const observacionFinal = `
${observacion || ""}
Supervisor apertura: ${supervisorApertura || usuario}
Supervisor cierre: ${usuario}
Código supervisor validado: SI
`.trim();

    const { error } = await supabase.from("control_caja").insert([
      {
        empresa_id: empresaId,
        fecha,
        total_sistema: totalSistema,
        efectivo_sistema: totalEfectivo,
        efectivo_contado: Number(efectivoContado),
        diferencia,
        total_transferencia: totalTransferencia,
        total_yappy: totalYappy,
        total_tarjeta: totalTarjeta,
        total_cheque: totalCheque,
        total_transacciones: movimientos.length,
        observacion: observacionFinal,
        usuario,
        estado: "Cerrado",
      },
    ]);

    if (error) {
      alert("Error al cerrar caja: " + error.message);
      return;
    }

    localStorage.removeItem(`caja_abierta_${empresaId}_${fecha}`);
    localStorage.removeItem(`supervisor_caja_${empresaId}_${fecha}`);

    alert("Caja cerrada correctamente.");

    setCajaAbierta(false);
    setSupervisorApertura("");
    setEfectivoContado("");
    setObservacion("");
    cerrarModalSupervisor();
    cargarCierres();
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <p style={etiqueta}>Módulo operativo</p>
              <h1 style={titulo}>Control y Arqueo de Caja</h1>
              <p style={subtitulo}>
                Apertura, arqueo y cierre diario con autorización de supervisor.
              </p>
            </div>
          </div>

          <div style={accionesTop}>
            <button onClick={volverDashboard} style={botonClaro}>
              ← Volver al Dashboard
            </button>
          </div>
        </div>

        <div style={estadoCajaBox}>
          <div>
            <p style={estadoLabel}>Estado actual</p>
            <h2 style={cajaAbierta ? estadoAbierta : estadoCerrada}>
              {cajaAbierta ? "🟢 Caja Abierta" : "🔴 Caja Cerrada"}
            </h2>
            <p style={textoSuave}>
              {cajaAbierta
                ? `Autorizada por: ${supervisorApertura || "Supervisor"}`
                : "Debe abrir la caja antes de cerrar el arqueo."}
            </p>
          </div>

          <div style={accionesEstado}>
            <button
              style={botonAzul}
              onClick={() => abrirModalSupervisor("abrir")}
              disabled={cajaAbierta}
            >
              Abrir Caja
            </button>

            <button
              style={botonVerde}
              onClick={() => abrirModalSupervisor("cerrar")}
              disabled={!cajaAbierta}
            >
              Cerrar Caja
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Fecha de control</h2>

          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={cardsGrid}>
          <KPI titulo="💵 Efectivo Sistema" valor={totalEfectivo} />
          <KPI titulo="🏦 Transferencias" valor={totalTransferencia} />
          <KPI titulo="📱 Yappy" valor={totalYappy} />
          <KPI titulo="💳 Tarjeta" valor={totalTarjeta} />
          <KPI titulo="💰 Total Sistema" valor={totalSistema} destacado />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Arqueo de Caja</h2>

          <div style={grid}>
            <div>
              <label style={label}>Efectivo Sistema</label>
              <input value={totalEfectivo} readOnly style={inputStyle} />
            </div>

            <div>
              <label style={label}>Efectivo Contado</label>
              <input
                type="number"
                value={efectivoContado}
                onChange={(e) => setEfectivoContado(e.target.value)}
                style={inputStyle}
                disabled={!cajaAbierta}
                placeholder="Ingrese efectivo contado"
              />
            </div>

            <div>
              <label style={label}>Diferencia</label>
              <input
                value={diferencia}
                readOnly
                style={{
                  ...inputStyle,
                  fontWeight: "bold",
                  color:
                    diferencia === 0
                      ? "#16a34a"
                      : diferencia > 0
                      ? "#2563eb"
                      : "#dc2626",
                }}
              />
            </div>

            <div>
              <label style={label}>Usuario / Responsable</label>
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <textarea
            placeholder="Observación del arqueo..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            style={textarea}
            disabled={!cajaAbierta}
          />

          <div style={diferenciaBox}>
            <strong>Resultado del arqueo:</strong>{" "}
            {diferencia === 0
              ? "Cuadra correctamente."
              : diferencia > 0
              ? "Sobra efectivo en caja."
              : "Falta efectivo en caja."}
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Resumen del Día</h2>

          <div style={cardsGrid}>
            <KPI titulo="Total Cobrado" valor={totalSistema} />
            <KPI titulo="Total Digital" valor={totalDigital} />
            <KPI titulo="Cheque" valor={totalCheque} />
            <KPI titulo="Transacciones" valor={movimientos.length} numero />
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Historial de Cierres</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Total Sistema</th>
                  <th style={th}>Efectivo Sistema</th>
                  <th style={th}>Efectivo Contado</th>
                  <th style={th}>Diferencia</th>
                  <th style={th}>Usuario</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {cierres.map((item) => (
                  <tr key={item.id}>
                    <td style={td}>{item.fecha}</td>
                    <td style={td}>${Number(item.total_sistema || 0).toLocaleString()}</td>
                    <td style={td}>${Number(item.efectivo_sistema || 0).toLocaleString()}</td>
                    <td style={td}>${Number(item.efectivo_contado || 0).toLocaleString()}</td>
                    <td
                      style={{
                        ...td,
                        fontWeight: "bold",
                        color:
                          Number(item.diferencia) === 0
                            ? "#16a34a"
                            : Number(item.diferencia) > 0
                            ? "#2563eb"
                            : "#dc2626",
                      }}
                    >
                      ${Number(item.diferencia || 0).toLocaleString()}
                    </td>
                    <td style={td}>{item.usuario}</td>
                    <td style={td}>{item.estado}</td>
                  </tr>
                ))}

                {cierres.length === 0 && (
                  <tr>
                    <td style={td} colSpan="7">
                      No hay cierres registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {mostrarModal && (
          <div style={modalFondo}>
            <div style={modal}>
              <h2 style={tituloSeccion}>
                {accionSupervisor === "abrir"
                  ? "Autorizar Apertura de Caja"
                  : "Autorizar Cierre de Caja"}
              </h2>

              <p style={textoSuave}>
                Ingrese el código de supervisor para continuar.
              </p>

              <input
                type="password"
                placeholder="Código supervisor"
                value={codigoSupervisor}
                onChange={(e) => setCodigoSupervisor(e.target.value)}
                style={inputStyle}
              />

              <div style={accionesModal}>
                <button style={botonVerdeGrande} onClick={validarSupervisor}>
                  Autorizar
                </button>

                <button style={botonGrisGrande} onClick={cerrarModalSupervisor}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ titulo, valor, destacado, numero }) {
  return (
    <div style={destacado ? cardKpiDestacado : cardKpi}>
      <div style={kpiTitulo}>{titulo}</div>
      <div style={kpiValor}>
        {numero ? Number(valor || 0).toLocaleString() : "$" + Number(valor || 0).toLocaleString()}
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#eef2f7",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1350px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #1e3a8a)",
  color: "#ffffff",
  padding: "26px",
  borderRadius: "22px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const heroInfo = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const logo = {
  width: "90px",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "8px",
};

const etiqueta = {
  margin: 0,
  color: "#bfdbfe",
  fontSize: "13px",
  fontWeight: "bold",
};

const titulo = {
  fontSize: "34px",
  margin: "4px 0",
};

const subtitulo = {
  color: "#dbeafe",
  margin: 0,
};

const accionesTop = {
  display: "flex",
  gap: "10px",
};

const botonClaro = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const estadoCajaBox = {
  background: "#ffffff",
  padding: "22px",
  borderRadius: "18px",
  marginBottom: "18px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const estadoLabel = {
  color: "#6b7280",
  margin: 0,
  fontSize: "13px",
  fontWeight: "bold",
};

const estadoAbierta = {
  color: "#16a34a",
  margin: "6px 0",
};

const estadoCerrada = {
  color: "#dc2626",
  margin: "6px 0",
};

const accionesEstado = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const card = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  marginBottom: "18px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
};

const tituloSeccion = {
  marginTop: 0,
  marginBottom: "16px",
  color: "#111827",
};

const textoSuave = {
  color: "#6b7280",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: "16px",
  marginBottom: "18px",
};

const cardKpi = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "18px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
  border: "1px solid #e5e7eb",
};

const cardKpiDestacado = {
  background: "linear-gradient(135deg, #16a34a, #166534)",
  color: "#ffffff",
  padding: "18px",
  borderRadius: "18px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
};

const kpiTitulo = {
  marginBottom: "8px",
  fontSize: "14px",
  color: "inherit",
};

const kpiValor = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "inherit",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
  gap: "15px",
};

const label = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  color: "#374151",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "9px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const textarea = {
  width: "100%",
  padding: "12px",
  borderRadius: "9px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  minHeight: "100px",
  marginTop: "18px",
};

const diferenciaBox = {
  marginTop: "16px",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "14px",
  color: "#374151",
};

const botonAzul = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonVerde = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "12px",
  background: "#111827",
  color: "#ffffff",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
};

const modalFondo = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
  zIndex: 999,
};

const modal = {
  width: "430px",
  maxWidth: "100%",
  background: "#ffffff",
  padding: "24px",
  borderRadius: "18px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
};

const accionesModal = {
  display: "flex",
  gap: "10px",
  marginTop: "18px",
};

const botonVerdeGrande = {
  flex: 1,
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "12px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonGrisGrande = {
  flex: 1,
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "12px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};
