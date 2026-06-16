"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ControlCaja() {
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [movimientos, setMovimientos] = useState([]);
  const [cierres, setCierres] = useState([]);

  const [efectivoContado, setEfectivoContado] = useState("");
  const [observacion, setObservacion] = useState("");
  const [usuario, setUsuario] = useState("Administrador");

  useEffect(() => {
    cargarDatos();
  }, [fecha]);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de usar Control de Caja.");
      return null;
    }

    return empresaId;
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

  const diferencia = Number(efectivoContado || 0) - Number(totalEfectivo || 0);

  async function cerrarCaja() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (efectivoContado === "" || Number(efectivoContado) < 0) {
      alert("Ingrese un efectivo contado válido.");
      return;
    }

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
        observacion,
        usuario,
        estado: "Cerrado",
      },
    ]);

    if (error) {
      alert("Error al cerrar caja: " + error.message);
      return;
    }

    alert("Caja cerrada correctamente.");

    setEfectivoContado("");
    setObservacion("");
    cargarCierres();
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={logoBox}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
        </div>

        <h1 style={titulo}>Control de Caja</h1>
        <p style={subtitulo}>Arqueo y cierre diario de operaciones.</p>

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
          <div style={cardKpi}>
            <div style={kpiTitulo}>💵 Efectivo Sistema</div>
            <div style={kpiValor}>${totalEfectivo.toLocaleString()}</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>🏦 Transferencias</div>
            <div style={kpiValor}>${totalTransferencia.toLocaleString()}</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>📱 Yappy</div>
            <div style={kpiValor}>${totalYappy.toLocaleString()}</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>💰 Total Sistema</div>
            <div style={kpiValor}>${totalSistema.toLocaleString()}</div>
          </div>
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
              <label style={label}>Usuario</label>
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
          />

          <div style={acciones}>
            <button style={boton} onClick={cerrarCaja}>
              Cerrar Caja
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Resumen del Día</h2>

          <div style={cardsGrid}>
            <div style={cardKpi}>
              <div style={kpiTitulo}>Total Cobrado</div>
              <div style={kpiValor}>${totalSistema.toLocaleString()}</div>
            </div>

            <div style={cardKpi}>
              <div style={kpiTitulo}>Total Digital</div>
              <div style={kpiValor}>
                ${(totalTransferencia + totalYappy + totalTarjeta + totalCheque).toLocaleString()}
              </div>
            </div>

            <div style={cardKpi}>
              <div style={kpiTitulo}>Tarjeta</div>
              <div style={kpiValor}>${totalTarjeta.toLocaleString()}</div>
            </div>

            <div style={cardKpi}>
              <div style={kpiTitulo}>Transacciones</div>
              <div style={kpiValor}>{movimientos.length}</div>
            </div>
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
  maxWidth: "1300px",
  margin: "0 auto",
};

const logoBox = {
  textAlign: "center",
  marginBottom: "12px",
};

const logo = {
  width: "110px",
  maxWidth: "100%",
  height: "auto",
};

const titulo = {
  fontSize: "32px",
  marginBottom: "6px",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  fontSize: "16px",
  marginBottom: "20px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginBottom: "16px",
  color: "#111827",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
  marginBottom: "16px",
};

const cardKpi = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const kpiTitulo = {
  color: "#6b7280",
  marginBottom: "8px",
  fontSize: "14px",
};

const kpiValor = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#111827",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
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
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const textarea = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  minHeight: "100px",
  marginTop: "18px",
};

const acciones = {
  display: "flex",
  gap: "15px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
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
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #f3f4f6",
};
