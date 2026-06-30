"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Abonos() {
  const [abonos, setAbonos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const calcularVencimiento = () => {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() + 3);
    return fecha.toISOString().split("T")[0];
  };

  const [abono, setAbono] = useState({
    cliente: "",
    cedula: "",
    telefono: "",
    vendedor: "",
    codigoProducto: "",
    producto: "",
    valorProducto: "",
    abonoRecibido: "",
    fechaVencimiento: calcularVencimiento(),
    metodo: "Efectivo",
    observacion: "",
  });

  useEffect(() => {
    cargarAbonos();
  }, []);

  function obtenerEmpresaId() {
    const empresaId =
      localStorage.getItem("empresaId") ||
      localStorage.getItem("empresaAdminCreadaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      window.location.href = "/login";
      return null;
    }

    return empresaId;
  }

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  const valorProducto = Number(abono.valorProducto || 0);
  const abonoRecibido = Number(abono.abonoRecibido || 0);
  const saldoPendiente = Math.max(valorProducto - abonoRecibido, 0);

  const mostrarResumen =
    abono.valorProducto !== "" || abono.abonoRecibido !== "";

  const formato = (numero) =>
    "$" +
    Number(numero || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

  function fechaSimple(fecha) {
    return String(fecha || "").slice(0, 10);
  }

  async function cargarAbonos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    setCargando(true);

    const { data, error } = await supabase
      .from("abonos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    setCargando(false);

    if (error) {
      alert("Error cargando abonos: " + error.message);
      return;
    }

    setAbonos(data || []);
  }

  async function registrarAbono() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!abono.cliente.trim()) {
      alert("Ingrese el nombre del cliente.");
      return;
    }

    if (!abono.producto.trim()) {
      alert("Ingrese el producto.");
      return;
    }

    if (!abono.valorProducto || valorProducto <= 0) {
      alert("Ingrese el valor del producto.");
      return;
    }

    if (!abono.abonoRecibido || abonoRecibido <= 0) {
      alert("Ingrese el abono recibido.");
      return;
    }

    if (abonoRecibido > valorProducto) {
      alert("El abono no puede ser mayor que el valor del producto.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("abonos").insert([
      {
        empresa_id: empresaId,
        cliente: abono.cliente.trim(),
        cedula: abono.cedula.trim(),
        telefono: abono.telefono.trim(),
        vendedor: abono.vendedor.trim(),
        codigo_producto: abono.codigoProducto.trim(),
        producto: abono.producto.trim(),
        valor_producto: valorProducto,
        abono_recibido: abonoRecibido,
        saldo: saldoPendiente,
        fecha_vencimiento: abono.fechaVencimiento,
        metodo: abono.metodo,
        observacion: abono.observacion.trim(),
        estado: saldoPendiente <= 0 ? "Cancelado" : "Activo",
      },
    ]);

    setGuardando(false);

    if (error) {
      alert("Error registrando abono: " + error.message);
      return;
    }

    alert("Abono registrado correctamente.");
    limpiarFormulario();
    await cargarAbonos();
  }

  function limpiarFormulario() {
    setAbono({
      cliente: "",
      cedula: "",
      telefono: "",
      vendedor: "",
      codigoProducto: "",
      producto: "",
      valorProducto: "",
      abonoRecibido: "",
      fechaVencimiento: calcularVencimiento(),
      metodo: "Efectivo",
      observacion: "",
    });
  }

  const hoy = new Date().toISOString().split("T")[0];
  const mesActual = new Date().toISOString().slice(0, 7);

  const abonosHoy = abonos
    .filter((item) => fechaSimple(item.created_at) === hoy)
    .reduce((sum, item) => sum + Number(item.abono_recibido || 0), 0);

  const abonosMes = abonos
    .filter((item) => fechaSimple(item.created_at).startsWith(mesActual))
    .reduce((sum, item) => sum + Number(item.abono_recibido || 0), 0);

  const abonosActivos = abonos.filter(
    (item) => item.estado === "Activo" && Number(item.saldo || 0) > 0
  ).length;

  const abonosVencidos = abonos.filter(
    (item) =>
      item.estado === "Activo" &&
      item.fecha_vencimiento &&
      fechaSimple(item.fecha_vencimiento) < hoy &&
      Number(item.saldo || 0) > 0
  ).length;

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={tituloBox}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <h1 style={titulo}>Registrar Abonos</h1>
              <p style={subtitulo}>
                Control de abonos para separación de productos y saldos
                pendientes.
              </p>
            </div>
          </div>

          <button style={botonVolver} onClick={volverDashboard}>
            ← Regresar al Dashboard
          </button>
        </div>

        <div style={cardsGrid}>
          <KPI titulo="Abonos Hoy" valor={formato(abonosHoy)} icono="💰" />
          <KPI titulo="Abonos Mes" valor={formato(abonosMes)} icono="📈" />
          <KPI titulo="Abonos Activos" valor={abonosActivos} icono="🧾" />
          <KPI titulo="Abonos Vencidos" valor={abonosVencidos} icono="🚨" />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Datos del Cliente</h2>

          <div style={grid}>
            <Campo label="Cliente">
              <input
                placeholder="Nombre del cliente"
                value={abono.cliente}
                onChange={(e) =>
                  setAbono({ ...abono, cliente: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Cédula">
              <input
                placeholder="Cédula"
                value={abono.cedula}
                onChange={(e) =>
                  setAbono({ ...abono, cedula: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Teléfono">
              <input
                placeholder="Teléfono"
                value={abono.telefono}
                onChange={(e) =>
                  setAbono({ ...abono, telefono: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Vendedor">
              <input
                placeholder="Vendedor responsable"
                value={abono.vendedor}
                onChange={(e) =>
                  setAbono({ ...abono, vendedor: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Datos del Producto</h2>

          <div style={grid}>
            <Campo label="Código del producto">
              <input
                placeholder="Código"
                value={abono.codigoProducto}
                onChange={(e) =>
                  setAbono({ ...abono, codigoProducto: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Producto">
              <input
                placeholder="Nombre del producto"
                value={abono.producto}
                onChange={(e) =>
                  setAbono({ ...abono, producto: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Valor del producto">
              <input
                type="number"
                placeholder="0.00"
                value={abono.valorProducto}
                onChange={(e) =>
                  setAbono({ ...abono, valorProducto: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Abono recibido">
              <input
                type="number"
                placeholder="0.00"
                value={abono.abonoRecibido}
                onChange={(e) =>
                  setAbono({ ...abono, abonoRecibido: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Método de pago">
              <select
                value={abono.metodo}
                onChange={(e) =>
                  setAbono({ ...abono, metodo: e.target.value })
                }
                style={inputStyle}
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Yappy</option>
                <option>Tarjeta</option>
                <option>Otro</option>
              </select>
            </Campo>

            <Campo label="Fecha de vencimiento">
              <input
                type="date"
                value={abono.fechaVencimiento}
                onChange={(e) =>
                  setAbono({ ...abono, fechaVencimiento: e.target.value })
                }
                style={inputStyle}
              />
            </Campo>
          </div>

          {mostrarResumen && (
            <div style={resumenAbono}>
              <div style={totalCard}>
                <span style={totalLabel}>Valor Producto</span>
                <strong style={totalValor}>{formato(valorProducto)}</strong>
              </div>

              <div style={totalCard}>
                <span style={totalLabel}>Abono Recibido</span>
                <strong style={totalValor}>{formato(abonoRecibido)}</strong>
              </div>

              <div style={totalCardPrincipal}>
                <span style={totalLabel}>Saldo Pendiente</span>
                <strong style={totalValorPrincipal}>
                  {formato(saldoPendiente)}
                </strong>
              </div>

              <div style={totalCardFecha}>
                <span style={totalLabel}>📅 Vence el</span>
                <strong style={totalValorFecha}>
                  {abono.fechaVencimiento}
                </strong>
              </div>
            </div>
          )}

          <Campo label="Observación">
            <textarea
              placeholder="Observación del abono..."
              value={abono.observacion}
              onChange={(e) =>
                setAbono({ ...abono, observacion: e.target.value })
              }
              style={textarea}
            />
          </Campo>

          <div style={acciones}>
            <button
              style={boton}
              onClick={registrarAbono}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Registrar Abono"}
            </button>

            <button style={botonGris} onClick={limpiarFormulario}>
              Limpiar
            </button>

            <button style={botonNegro} onClick={cargarAbonos}>
              Actualizar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Historial de Abonos</h2>

          {cargando ? (
            <p style={nota}>Cargando abonos...</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tabla}>
                <thead>
                  <tr>
                    <th style={th}>Fecha</th>
                    <th style={th}>Cliente</th>
                    <th style={th}>Cédula</th>
                    <th style={th}>Producto</th>
                    <th style={th}>Valor</th>
                    <th style={th}>Abono</th>
                    <th style={th}>Saldo</th>
                    <th style={th}>Método</th>
                    <th style={th}>Vendedor</th>
                    <th style={th}>Vencimiento</th>
                    <th style={th}>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {abonos.length === 0 ? (
                    <tr>
                      <td style={td} colSpan="11">
                        No hay abonos registrados.
                      </td>
                    </tr>
                  ) : (
                    abonos.map((item) => {
                      const vencido =
                        item.estado === "Activo" &&
                        item.fecha_vencimiento &&
                        fechaSimple(item.fecha_vencimiento) < hoy &&
                        Number(item.saldo || 0) > 0;

                      return (
                        <tr key={item.id}>
                          <td style={td}>{fechaSimple(item.created_at)}</td>
                          <td style={td}>{item.cliente || "-"}</td>
                          <td style={td}>{item.cedula || "-"}</td>
                          <td style={td}>{item.producto || "-"}</td>
                          <td style={td}>{formato(item.valor_producto)}</td>
                          <td style={td}>{formato(item.abono_recibido)}</td>
                          <td style={td}>{formato(item.saldo)}</td>
                          <td style={td}>{item.metodo || "-"}</td>
                          <td style={td}>{item.vendedor || "-"}</td>
                          <td style={td}>
                            {fechaSimple(item.fecha_vencimiento) || "-"}
                          </td>
                          <td style={td}>
                            <span
                              style={
                                vencido
                                  ? estadoVencido
                                  : item.estado === "Cancelado"
                                  ? estadoCancelado
                                  : estadoBadge
                              }
                            >
                              {vencido ? "Vencido" : item.estado || "Activo"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
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

function KPI({ titulo, valor, icono }) {
  return (
    <div style={cardKpi}>
      <div style={kpiTitulo}>
        {icono} {titulo}
      </div>
      <div style={kpiValor}>{valor}</div>
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
  maxWidth: "1400px",
  margin: "0 auto",
};

const encabezado = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
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
  color: "#ffffff",
};

const subtitulo = {
  color: "#dcfce7",
  marginTop: "5px",
  fontSize: "15px",
};

const botonVolver = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
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

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginTop: 0,
  marginBottom: "16px",
  color: "#111827",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
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
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
  background: "#ffffff",
  color: "#111827",
};

const resumenAbono = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
  marginTop: "16px",
};

const totalCard = {
  background: "#f9fafb",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
};

const totalCardPrincipal = {
  background: "#ecfdf5",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #bbf7d0",
};

const totalCardFecha = {
  background: "#eff6ff",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #bfdbfe",
};

const totalLabel = {
  display: "block",
  color: "#6b7280",
  fontSize: "14px",
  marginBottom: "6px",
};

const totalValor = {
  color: "#111827",
  fontSize: "22px",
};

const totalValorPrincipal = {
  color: "#16a34a",
  fontSize: "24px",
};

const totalValorFecha = {
  color: "#1e40af",
  fontSize: "22px",
};

const textarea = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
  minHeight: "90px",
  marginTop: "0px",
  resize: "vertical",
};

const acciones = {
  display: "flex",
  gap: "10px",
  marginTop: "16px",
  flexWrap: "wrap",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
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

const botonNegro = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "9px",
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
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #f3f4f6",
};

const estadoBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: "bold",
};

const estadoVencido = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: "bold",
};

const estadoCancelado = {
  background: "#e5e7eb",
  color: "#374151",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: "bold",
};

const nota = {
  color: "#6b7280",
  fontSize: "14px",
};
