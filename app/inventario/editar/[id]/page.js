"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function EditarProducto() {
  const params = useParams();
  const router = useRouter();

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria: "",
    costo: "",
    precio_contado: "",
    precio_credito: "",
    stock_minimo: "",
  });

  useEffect(() => {
    cargarProducto();
  }, []);

  async function cargarProducto() {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setForm({
      codigo: data.codigo || "",
      nombre: data.nombre || "",
      descripcion: data.descripcion || "",
      categoria: data.categoria || "",
      costo: data.costo || "",
      precio_contado: data.precio_contado || "",
      precio_credito: data.precio_credito || "",
      stock_minimo: data.stock_minimo || "",
    });
  }

  async function actualizarProducto() {
    const { error } = await supabase
      .from("productos")
      .update({
        codigo: form.codigo,
        nombre: form.nombre,
        descripcion: form.descripcion,
        categoria: form.categoria,
        costo: Number(form.costo || 0),
        precio_contado: Number(form.precio_contado || 0),
        precio_credito: Number(form.precio_credito || 0),
        stock_minimo: Number(form.stock_minimo || 0),
      })
      .eq("id", params.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Producto actualizado correctamente");

    router.push("/inventario");
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Editar Producto</h1>

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
          onClick={actualizarProducto}
          style={{
            padding: "12px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          💾 Actualizar Producto
        </button>
      </div>
    </div>
  );
}
