"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function MovimientosInventario() {
  const [productos, setProductos] = useState([]);
  const [historial, setHistorial] = useState([]);

  const [productoId, setProductoId] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    cargarProductos();
    cargarHistorial();
  }, []);

  async function cargarProductos() {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("nombre");

    if (!error) setProductos(data || []);
  }

  async function cargarHistorial() {
    const { data, error } = await supabase
      .from("movimientos_inventario")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setHistorial(data || []);
  }

  async function guardarMovimiento() {
    if (!productoId) {
      alert("Seleccione un producto");
      return;
    }

    if (!cantidad || Number(cantidad) <= 0) {
      alert("Ingrese una cantidad válida");
      return;
    }

    const producto = productos.find(
      (p) => String(p.id) === String(productoId)
    );

    if (!producto) {
      alert("Producto no encontrado");
      return;
    }

    const stockAnterior = Number(producto.stock_actual || 0);

    let stockNuevo = stockAnterior;

    if (tipoMovimiento === "ENTRADA") {
      stockNuevo += Number(cantidad);
    }

    if (tipoMovimiento === "SALIDA") {
      stockNuevo -= Number(cantidad);

      if (stockNuevo < 0) {
        alert("No hay suficiente inventario");
        return;
      }
    }

    const { error: errorUpdate } = await supabase
      .from("productos")
      .update({
        stock_actual: stockNuevo,
      })
      .eq("id", productoId);

    if (errorUpdate) {
      console.log(errorUpdate);
      alert("Error actualizando inventario");
      return;
    }

    const { error: errorMovimiento } = await supabase
  .from("movimientos_inventario")
  .insert([
    {
      empresa_id: "71f45220-5274-491a-8dd0-a549a1f1c3a6",
      producto_id: productoId,
      tipo_movimiento: tipoMovimiento,
      cantidad: Number(cantidad),
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      observacion,
    },
  ]);

    if (errorMovimiento) {
  console.error(errorMovimiento);

  alert(
    JSON.stringify(errorMovimiento, null, 2)
  );

  return;
}

    alert("Movimiento guardado");

    setCantidad("");
    setObservacion("");

    cargarProductos();
    cargarHistorial();
  }

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "30px auto",
        padding: "20px",
      }}
    >
      <h1>Movimientos de Inventario</h1>

      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "30px",
        }}
      >
        <label>Producto</label>

        <select
          value={productoId}
          onChange={(e) =>
            setProductoId(e.target.value)
          }
          style={input}
        >
          <option value="">
            Seleccione producto
          </option>

          {productos.map((p) => (
            <option
              key={p.id}
              value={p.id}
            >
              {p.nombre}
            </option>
          ))}
        </select>

        <label>Tipo Movimiento</label>

        <select
          value={tipoMovimiento}
          onChange={(e) =>
            setTipoMovimiento(e.target.value)
          }
          style={input}
        >
          <option value="ENTRADA">
            Entrada
          </option>

          <option value="SALIDA">
            Salida
          </option>
        </select>

        <label>Cantidad</label>

        <input
          type="number"
          value={cantidad}
          onChange={(e) =>
            setCantidad(e.target.value)
          }
          style={input}
        />

        <label>Observación</label>

        <textarea
          value={observacion}
          onChange={(e) =>
            setObservacion(e.target.value)
          }
          style={{
            ...input,
            height: "80px",
          }}
        />

        <button
          onClick={guardarMovimiento}
          style={{
            background: "#16a34a",
            color: "#fff",
            border: "none",
            padding: "12px 20px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Guardar Movimiento
        </button>
      </div>

      <h2>Historial</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th style={th}>Tipo</th>
            <th style={th}>Cantidad</th>
            <th style={th}>Antes</th>
            <th style={th}>Después</th>
            <th style={th}>Observación</th>
          </tr>
        </thead>

        <tbody>
          {historial.map((m) => (
            <tr key={m.id}>
              <td style={td}>
                {m.tipo_movimiento}
              </td>

              <td style={td}>
                {m.cantidad}
              </td>

              <td style={td}>
                {m.stock_anterior}
              </td>

              <td style={td}>
                {m.stock_nuevo}
              </td>

              <td style={td}>
                {m.observacion}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const input = {
  width: "100%",
  padding: "10px",
  marginBottom: "15px",
  border: "1px solid #ddd",
  borderRadius: "6px",
};

const th = {
  borderBottom: "1px solid #ddd",
  padding: "10px",
  textAlign: "left",
};

const td = {
  borderBottom: "1px solid #eee",
  padding: "10px",
};
