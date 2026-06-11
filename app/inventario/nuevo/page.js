"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function NuevoProducto() {
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria: "",
    costo: "",
    precio_contado: "",
    precio_credito: "",
    stock_inicial: "",
    stock_minimo: "",
  });

  async function guardarProducto() {
    const { data, error } = await supabase
      .from("productos")
      .insert([
        {
          empresa_id: null,
          codigo: form.codigo,
          nombre: form.nombre,
          descripcion: form.descripcion,
          categoria: form.categoria,
          costo: Number(form.costo || 0),
          precio_contado: Number(form.precio_contado || 0),
          precio_credito: Number(form.precio_credito || 0),
          stock_actual: Number(form.stock_inicial || 0),
          stock_minimo: Number(form.stock_minimo || 0),
        },
      ])
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("movimientos_inventario")
      .insert([
        {
          empresa_id: null,
          producto_id: data.id,
          tipo_movimiento: "ENTRADA",
          cantidad: Number(form.stock_inicial || 0),
          stock_anterior: 0,
          stock_nuevo: Number(form.stock_inicial || 0),
          observacion: "Stock inicial",
        },
      ]);

    alert("Producto guardado correctamente");

    setForm({
      codigo: "",
      nombre: "",
      descripcion: "",
      categoria: "",
      costo: "",
      precio_contado: "",
      precio_credito: "",
      stock_inicial: "",
      stock_minimo: "",
    });
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Nuevo Producto</h1>

      <div
        style={{
          display: "grid",
          gap: "12px",
          maxWidth: "700px",
          marginTop: "20px",
        }}
      >
        <label>Código *</label>
        <input
          value={form.codigo}
          onChange={(e) =>
            setForm({
              ...form,
              codigo: e.target.value,
            })
          }
        />

        <label>Nombre *</label>
        <input
          value={form.nombre}
          onChange={(e) =>
            setForm({
              ...form,
              nombre: e.target.value,
            })
          }
        />

        <label>Descripción</label>
        <input
          value={form.descripcion}
          onChange={(e) =>
            setForm({
              ...form,
              descripcion: e.target.value,
            })
          }
        />

        <label>Categoría</label>
        <input
          value={form.categoria}
          onChange={(e) =>
            setForm({
              ...form,
              categoria: e.target.value,
            })
          }
        />

        <label>Costo</label>
        <input
          type="number"
          value={form.costo}
          onChange={(e) =>
            setForm({
              ...form,
              costo: e.target.value,
            })
          }
        />

        <label>Precio Contado</label>
        <input
          type="number"
          value={form.precio_contado}
          onChange={(e) =>
            setForm({
              ...form,
              precio_contado: e.target.value,
            })
          }
        />

        <label>Precio Crédito</label>
        <input
          type="number"
          value={form.precio_credito}
          onChange={(e) =>
            setForm({
              ...form,
              precio_credito: e.target.value,
            })
          }
        />

        <label>Stock Inicial</label>
        <input
          type="number"
          value={form.stock_inicial}
          onChange={(e) =>
            setForm({
              ...form,
              stock_inicial: e.target.value,
            })
          }
        />

        <label>Stock Mínimo</label>
        <input
          type="number"
          value={form.stock_minimo}
          onChange={(e) =>
            setForm({
              ...form,
              stock_minimo: e.target.value,
            })
          }
        />

        <button
          onClick={guardarProducto}
          style={{
            padding: "12px",
            cursor: "pointer",
            fontWeight: "bold",
            marginTop: "10px",
          }}
        >
          💾 Guardar Producto
        </button>
      </div>
    </div>
  );
}
