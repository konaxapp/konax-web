"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

// KONAX Gastos · Fecha local corregida · 2026.08.21-FIX-LOCAL-DATE

function fechaLocalActual() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function mesLocalActual() {
  return fechaLocalActual().slice(0, 7);
}

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [formulario, setFormulario] = useState({
    fecha: fechaLocalActual(),
    categoria: "Compras",
    descripcion: "",
    monto: "",
    metodoPago: "Efectivo",
    responsable: "",
    observacion: "",
  });

  const categorias = [
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

  useEffect(() => {
    cargarGastos();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      window.location.href = "/login";
      return null;
    }

    return empresaId;
  }

  function volverCentroOperaciones() {
    window.location.href = "/dashboard";
  }

  function limpiarFormulario() {
    setFormulario({
      fecha: fechaLocalActual(),
      categoria: "Compras",
      descripcion: "",
      monto: "",
      metodoPago: "Efectivo",
      responsable: "",
      observacion: "",
    });
  }

  async function cargarGastos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("gastos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fecha", { ascending: false });

    if (error) {
      alert("Error cargando gastos: " + error.message);
      return;
    }

    setGastos(data || []);
  }

  async function guardarGasto() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!formulario.descripcion || !formulario.monto) {
      alert("Complete descripción y monto.");
      return;
    }

    if (Number(formulario.monto) <= 0) {
      alert("El monto debe ser mayor a cero.");
      return;
    }

    setCargando(true);

    const { error } = await supabase.from("gastos").insert([
      {
        empresa_id: empresaId,
        fecha: formulario.fecha,
        categoria: formulario.categoria,
        descripcion: formulario.descripcion,
        monto: Number(formulario.monto),
        metodo_pago: formulario.metodoPago,
        responsable: formulario.responsable,
        observacion: formulario.observacion,
        estado: "Activo",
      },
    ]);

    setCargando(false);

    if (error) {
      alert("Error guardando gasto: " + error.message);
      return;
    }

    alert("Gasto registrado correctamente.");
    limpiarFormulario();
    cargarGastos();
  }

  async function anularGasto(item) {
    const confirmar = confirm("¿Deseas anular este gasto?");
    if (!confirmar) return;

    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { error } = await supabase
      .from("gastos")
      .update({ estado: "Anulado" })
      .eq("id", item.id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Error anulando gasto: " + error.message);
      return;
    }

    alert("Gasto anulado correctamente.");
    cargarGastos();
  }

  const hoy = fechaLocalActual();
  const mesActual = mesLocalActual();

  const gastosActivos = gastos.filter((g) => g.estado !== "Anulado");
  const gastosAnulados = gastos.filter((g) => g.estado === "Anulado").length;

  const totalHoy = gastosActivos
    .filter((g) => g.fecha === hoy)
    .reduce((total, g) => total + Number(g.monto || 0), 0);

  const totalMes = gastosActivos
    .filter((g) => String(g.fecha || "").slice(0, 7) === mesActual)
    .reduce((total, g) => total + Number(g.monto || 0), 0);

  const totalGeneral = gastosActivos.reduce(
    (total, g) => total + Number(g.monto || 0),
    0
  );

  return (
    <div style={pagina} className="gastos-page">
      <style>{`
        * { box-sizing: border-box; }

        @media (max-width: 720px) {
          .gastos-page {
            padding: 12px !important;
          }

          .gastos-hero {
            padding: 14px !important;
            border-radius: 16px !important;
            margin-bottom: 12px !important;
            gap: 10px !important;
          }

          .gastos-hero-info {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 64px minmax(0,1fr) !important;
            gap: 10px !important;
            align-items: center !important;
          }

          .gastos-logo {
            width: 64px !important;
            border-radius: 12px !important;
            padding: 6px !important;
          }

          .gastos-hero h1 {
            font-size: 24px !important;
            margin: 1px 0 !important;
          }

          .gastos-hero p {
            margin: 2px 0 !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }

          .gastos-hero .gastos-volver {
            width: 100% !important;
            min-height: 42px !important;
            padding: 9px 12px !important;
          }

          .gastos-resumen-grid {
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
            gap: 8px !important;
            margin-bottom: 12px !important;
          }

          .gastos-kpi {
            padding: 12px !important;
            border-radius: 14px !important;
            gap: 3px !important;
          }

          .gastos-kpi-icon {
            font-size: 18px !important;
          }

          .gastos-kpi-label {
            font-size: 10px !important;
          }

          .gastos-kpi-value {
            font-size: 19px !important;
          }

          .gastos-card {
            padding: 14px !important;
            border-radius: 15px !important;
            margin-bottom: 12px !important;
          }

          .gastos-card h2 {
            font-size: 18px !important;
          }

          .gastos-card p {
            font-size: 11px !important;
            line-height: 1.35 !important;
          }

          .gastos-form-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .gastos-actions {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }

          .gastos-actions button {
            width: 100% !important;
            min-height: 42px !important;
            padding: 9px 10px !important;
          }
        }

        @media (max-width: 420px) {
          .gastos-resumen-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>

      <div style={contenedor}>
        <div style={hero} className="gastos-hero">
          <div style={heroInfo} className="gastos-hero-info">
            <img
              src="/konax-logo.png"
              alt="KONAX"
              style={logo}
              className="gastos-logo"
            />

            <div>
              <p style={etiqueta}>Control Operativo</p>
              <h1 style={titulo}>Gastos</h1>
              <p style={subtitulo}>
                Registra y controla los gastos del negocio por categoría, método
                de pago y responsable.
              </p>
            </div>
          </div>

          <button
            onClick={volverCentroOperaciones}
            style={botonVolver}
            className="gastos-volver"
          >
            ← Centro de Operaciones
          </button>
        </div>

        <div style={resumenGrid} className="gastos-resumen-grid">
          <KPI titulo="Gastos hoy" valor={`$${totalHoy.toFixed(2)}`} icono="📅" />
          <KPI titulo="Gastos del mes" valor={`$${totalMes.toFixed(2)}`} icono="📆" />
          <KPI titulo="Total acumulado" valor={`$${totalGeneral.toFixed(2)}`} icono="💸" />
          <KPI titulo="Registros activos" valor={gastosActivos.length} icono="✅" />
          <KPI titulo="Anulados" valor={gastosAnulados} icono="⛔" />
        </div>

        <div style={card} className="gastos-card">
          <div style={cardHeader}>
            <div>
              <h2 style={tituloSeccion}>Registrar Gasto</h2>
              <p style={textoSuave}>
                Captura egresos operativos como planilla, servicios, compras,
                publicidad, comisiones y otros.
              </p>
            </div>
          </div>

          <div style={grid} className="gastos-form-grid">
            <Campo label="Fecha">
              <input
                type="date"
                value={formulario.fecha}
                onChange={(e) =>
                  setFormulario({ ...formulario, fecha: e.target.value })
                }
                style={input}
              />
            </Campo>

            <Campo label="Categoría">
              <select
                value={formulario.categoria}
                onChange={(e) =>
                  setFormulario({ ...formulario, categoria: e.target.value })
                }
                style={input}
              >
                {categorias.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Descripción">
              <input
                placeholder="Ej. Pago de luz, compra de papelería..."
                value={formulario.descripcion}
                onChange={(e) =>
                  setFormulario({ ...formulario, descripcion: e.target.value })
                }
                style={input}
              />
            </Campo>

            <Campo label="Monto">
              <input
                placeholder="0.00"
                type="number"
                value={formulario.monto}
                onChange={(e) =>
                  setFormulario({ ...formulario, monto: e.target.value })
                }
                style={input}
              />
            </Campo>

            <Campo label="Método de pago">
              <select
                value={formulario.metodoPago}
                onChange={(e) =>
                  setFormulario({ ...formulario, metodoPago: e.target.value })
                }
                style={input}
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Yappy</option>
                <option>Tarjeta</option>
                <option>Cheque</option>
                <option>Otro</option>
              </select>
            </Campo>

            <Campo label="Responsable">
              <input
                placeholder="Nombre de quien registró o autorizó"
                value={formulario.responsable}
                onChange={(e) =>
                  setFormulario({ ...formulario, responsable: e.target.value })
                }
                style={input}
              />
            </Campo>
          </div>

          <Campo label="Observación">
            <textarea
              placeholder="Detalle adicional del gasto, factura, referencia o comentario..."
              value={formulario.observacion}
              onChange={(e) =>
                setFormulario({ ...formulario, observacion: e.target.value })
              }
              style={textarea}
            />
          </Campo>

          <div style={acciones} className="gastos-actions">
            <button onClick={guardarGasto} disabled={cargando} style={boton}>
              {cargando ? "Guardando..." : "Registrar Gasto"}
            </button>

            <button onClick={limpiarFormulario} style={botonSecundario}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <div>
              <h2 style={tituloSeccion}>Historial de Gastos</h2>
              <p style={textoSuave}>
                Consulta los egresos registrados y anula registros cuando sea necesario.
              </p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Categoría</th>
                  <th style={th}>Descripción</th>
                  <th style={th}>Método</th>
                  <th style={th}>Responsable</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Acción</th>
                </tr>
              </thead>

              <tbody>
                {gastos.length === 0 ? (
                  <tr>
                    <td style={td} colSpan="8">
                      No hay gastos registrados.
                    </td>
                  </tr>
                ) : (
                  gastos.map((item) => (
                    <tr key={item.id}>
                      <td style={td}>{item.fecha}</td>
                      <td style={td}>{item.categoria}</td>
                      <td style={td}>
                        <strong>{item.descripcion}</strong>
                        {item.observacion && (
                          <>
                            <br />
                            <span style={textoPequeno}>{item.observacion}</span>
                          </>
                        )}
                      </td>
                      <td style={td}>{item.metodo_pago}</td>
                      <td style={td}>{item.responsable || "-"}</td>
                      <td style={td}>
                        <strong>${Number(item.monto || 0).toFixed(2)}</strong>
                      </td>
                      <td style={td}>
                        <span
                          style={
                            item.estado === "Anulado"
                              ? estadoAnulado
                              : estadoActivo
                          }
                        >
                          {item.estado || "Activo"}
                        </span>
                      </td>
                      <td style={td}>
                        {item.estado !== "Anulado" && (
                          <button
                            onClick={() => anularGasto(item)}
                            style={botonAnular}
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
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
    <div style={campo}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function KPI({ titulo, valor, icono }) {
  return (
    <div style={resumenCard} className="gastos-kpi">
      <div style={kpiIcono} className="gastos-kpi-icon">{icono}</div>
      <span style={resumenLabel} className="gastos-kpi-label">{titulo}</span>
      <strong style={resumenValor} className="gastos-kpi-value">{valor}</strong>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #ecfdf5 0%, #f3f4f6 45%, #ffffff 100%)",
  padding: "35px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1450px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "28px",
  borderRadius: "22px",
  marginBottom: "22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const heroInfo = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const logo = {
  width: "85px",
  height: "auto",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "8px",
};

const etiqueta = {
  margin: 0,
  color: "#bbf7d0",
  fontSize: "14px",
  fontWeight: "bold",
};

const titulo = {
  margin: "4px 0",
  fontSize: "36px",
  fontWeight: "bold",
};

const subtitulo = {
  color: "#dcfce7",
  marginTop: "6px",
  maxWidth: "760px",
};

const botonVolver = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 18px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const resumenCard = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
  display: "grid",
  gap: "6px",
};

const kpiIcono = {
  fontSize: "26px",
};

const resumenLabel = {
  color: "#6b7280",
  fontSize: "13px",
};

const resumenValor = {
  color: "#111827",
  fontSize: "24px",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "20px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const cardHeader = {
  marginBottom: "18px",
};

const tituloSeccion = {
  margin: 0,
  color: "#111827",
};

const textoSuave = {
  color: "#6b7280",
  marginTop: "6px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
  gap: "15px",
};

const campo = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle = {
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
  fontSize: "14px",
};

const textarea = {
  ...input,
  minHeight: "95px",
  marginTop: "15px",
  resize: "vertical",
};

const acciones = {
  display: "flex",
  gap: "12px",
  marginTop: "15px",
  flexWrap: "wrap",
};

const boton = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "13px 24px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botonSecundario = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "13px 24px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botonAnular = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "8px 11px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
  fontSize: "14px",
  minWidth: "1000px",
};

const th = {
  textAlign: "left",
  padding: "12px",
  background: "#111827",
  color: "#ffffff",
  fontSize: "13px",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #f3f4f6",
  color: "#111827",
  verticalAlign: "top",
};

const textoPequeno = {
  color: "#6b7280",
  fontSize: "12px",
};

const estadoActivo = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const estadoAnulado = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};
