"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [formulario, setFormulario] = useState({
    fecha: new Date().toISOString().split("T")[0],
    categoria: "Compras",
    descripcion: "",
    monto: "",
    metodoPago: "Efectivo",
    responsable: "",
    observacion: "",
  });

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

  function limpiarFormulario() {
    setFormulario({
      fecha: new Date().toISOString().split("T")[0],
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

  const hoy = new Date().toISOString().split("T")[0];
  const mesActual = new Date().toISOString().slice(0, 7);

  const gastosActivos = gastos.filter((g) => g.estado !== "Anulado");

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
    <div style={pagina}>
      <div style={contenedor}>
        <h1 style={titulo}>Gastos</h1>

        <p style={subtitulo}>
          Registra y controla los gastos del negocio por categoría, método de pago
          y responsable.
        </p>

        <div style={resumenGrid}>
          <div style={resumenCard}>
            <span>Gastos hoy</span>
            <strong>${totalHoy.toFixed(2)}</strong>
          </div>

          <div style={resumenCard}>
            <span>Gastos del mes</span>
            <strong>${totalMes.toFixed(2)}</strong>
          </div>

          <div style={resumenCard}>
            <span>Total acumulado</span>
            <strong>${totalGeneral.toFixed(2)}</strong>
          </div>
        </div>

        <div style={card}>
          <h2>Registrar Gasto</h2>

          <div style={grid}>
            <input
              type="date"
              value={formulario.fecha}
              onChange={(e) =>
                setFormulario({ ...formulario, fecha: e.target.value })
              }
              style={input}
            />

            <select
              value={formulario.categoria}
              onChange={(e) =>
                setFormulario({ ...formulario, categoria: e.target.value })
              }
              style={input}
            >
              <option>Compras</option>
              <option>Alquiler</option>
              <option>Luz</option>
              <option>Agua</option>
              <option>Internet</option>
              <option>Nómina</option>
              <option>Combustible</option>
              <option>Mantenimiento</option>
              <option>Publicidad</option>
              <option>Impuestos</option>
              <option>Transporte</option>
              <option>Otros</option>
            </select>

            <input
              placeholder="Descripción"
              value={formulario.descripcion}
              onChange={(e) =>
                setFormulario({ ...formulario, descripcion: e.target.value })
              }
              style={input}
            />

            <input
              placeholder="Monto"
              type="number"
              value={formulario.monto}
              onChange={(e) =>
                setFormulario({ ...formulario, monto: e.target.value })
              }
              style={input}
            />

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

            <input
              placeholder="Responsable"
              value={formulario.responsable}
              onChange={(e) =>
                setFormulario({ ...formulario, responsable: e.target.value })
              }
              style={input}
            />
          </div>

          <textarea
            placeholder="Observación"
            value={formulario.observacion}
            onChange={(e) =>
              setFormulario({ ...formulario, observacion: e.target.value })
            }
            style={textarea}
          />

          <div style={acciones}>
            <button onClick={guardarGasto} disabled={cargando} style={boton}>
              {cargando ? "Guardando..." : "Registrar Gasto"}
            </button>

            <button onClick={limpiarFormulario} style={botonSecundario}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2>Historial de Gastos</h2>

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
                      <td style={td}>{item.descripcion}</td>
                      <td style={td}>{item.metodo_pago}</td>
                      <td style={td}>{item.responsable || "-"}</td>
                      <td style={td}>${Number(item.monto || 0).toFixed(2)}</td>
                      <td style={td}>{item.estado}</td>
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

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
  margin: "0 auto",
};

const titulo = {
  fontSize: "38px",
  marginBottom: "8px",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  marginBottom: "25px",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "15px",
  marginBottom: "20px",
};

const resumenCard = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "14px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  display: "grid",
  gap: "8px",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
  gap: "15px",
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const textarea = {
  width: "100%",
  minHeight: "90px",
  marginTop: "15px",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
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
  padding: "12px 22px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botonSecundario = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "12px 22px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botonAnular = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: "bold",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "15px",
  fontSize: "14px",
};

const th = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #f3f4f6",
};
