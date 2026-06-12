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
    proveedor: "",
    precio_compra: "",
    precio_venta: "",
    precio_credito: "",
    stock_minimo: "",
  });

  useEffect(() => {
    if (params?.id) {
      cargarProducto();
    }
  }, [params?.id]);

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
      proveedor: data.proveedor || "",
      precio_compra: data.precio_compra || "",
      precio_venta: data.precio_venta || "",
      precio_credito: data.precio_credito || "",
      stock_minimo: data.stock_minimo || "",
    });
  }

async function actualizarProducto() {
  console.log("FORM =", form);
  const { data, error } = await supabase
    .from("productos")
    .update({
      codigo: form.codigo,
      nombre: form.nombre,
      descripcion: form.descripcion,
      categoria: form.categoria,
      proveedor: form.proveedor,
      precio_compra: Number(form.precio_compra || 0),
      precio_venta: Number(form.precio_venta || 0),
      precio_credito: Number(form.precio_credito || 0),
      stock_minimo: Number(form.stock_minimo || 0),
    })
    .match({ id: params.id })
.select();

  if (error) {
  alert("ERROR = " + error.message);
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

        <label>Proveedor</label>
        <input
          value={form.proveedor}
          onChange={(e) =>
            setForm({
              ...form,
              proveedor: e.target.value,
            })
          }
        />

        <label>Precio Compra</label>
        <input
          type="number"
          value={form.precio_compra}
          onChange={(e) =>
            setForm({
              ...form,
              precio_compra: e.target.value,
            })
          }
        />

        <label>Precio Venta</label>
        <input
          type="number"
          value={form.precio_venta}
          onChange={(e) =>
            setForm({
              ...form,
              precio_venta: e.target.value,
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
