"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function NuevoProducto() {
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria: "",
    proveedor: "",
    precio_compra: "",
    precio_venta: "",
    precio_credito: "",
    stock_inicial: "",
    stock_minimo: "",
  });

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de crear productos.");
      return null;
    }

    return empresaId;
  }

  function actualizar(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  async function guardarProducto() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!form.codigo || !form.nombre) {
      alert("Complete código y nombre del producto.");
      return;
    }

    const stockInicial = Number(form.stock_inicial || 0);

    const { data, error } = await supabase
      .from("productos")
      .insert([
        {
          empresa_id: empresaId,
          codigo: form.codigo,
          nombre: form.nombre,
          descripcion: form.descripcion,
          categoria: form.categoria,
          proveedor: form.proveedor,
          precio_compra: Number(form.precio_compra || 0),
          precio_venta: Number(form.precio_venta || 0),
          precio_credito: Number(form.precio_credito || 0),
          stock_actual: stockInicial,
          stock_minimo: Number(form.stock_minimo || 0),
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Error guardando producto: " + error.message);
      return;
    }

    const { error: errorMovimiento } = await supabase
      .from("movimientos_inventario")
      .insert([
        {
          empresa_id: empresaId,
          producto_id: data.id,
          tipo_movimiento: "ENTRADA",
          cantidad: stockInicial,
          stock_anterior: 0,
          stock_nuevo: stockInicial,
          observacion: "Stock inicial",
          usuario: "Sistema",
        },
      ]);

    if (errorMovimiento) {
      alert(
        "Producto guardado, pero no se registró el movimiento inicial: " +
          errorMovimiento.message
      );
      return;
    }

    alert("Producto guardado correctamente.");

    setForm({
      codigo: "",
      nombre: "",
      descripcion: "",
      categoria: "",
      proveedor: "",
      precio_compra: "",
      precio_venta: "",
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
          onChange={(e) => actualizar("codigo", e.target.value)}
        />

        <label>Nombre *</label>
        <input
          value={form.nombre}
          onChange={(e) => actualizar("nombre", e.target.value)}
        />

        <label>Descripción</label>
        <input
          value={form.descripcion}
          onChange={(e) => actualizar("descripcion", e.target.value)}
        />

        <label>Categoría</label>
        <input
          value={form.categoria}
          onChange={(e) => actualizar("categoria", e.target.value)}
        />

        <label>Proveedor</label>
        <input
          value={form.proveedor}
          onChange={(e) => actualizar("proveedor", e.target.value)}
        />

        <label>Precio Compra</label>
        <input
          type="number"
          value={form.precio_compra}
          onChange={(e) => actualizar("precio_compra", e.target.value)}
        />

        <label>Precio Venta</label>
        <input
          type="number"
          value={form.precio_venta}
          onChange={(e) => actualizar("precio_venta", e.target.value)}
        />

        <label>Precio Crédito (Opcional)</label>
        <input
          type="number"
          value={form.precio_credito}
          onChange={(e) => actualizar("precio_credito", e.target.value)}
        />

        <label>Stock Inicial</label>
        <input
          type="number"
          value={form.stock_inicial}
          onChange={(e) => actualizar("stock_inicial", e.target.value)}
        />

        <label>Stock Mínimo</label>
        <input
          type="number"
          value={form.stock_minimo}
          onChange={(e) => actualizar("stock_minimo", e.target.value)}
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
