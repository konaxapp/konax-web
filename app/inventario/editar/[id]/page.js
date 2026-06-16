"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function EditarProducto() {
  const params = useParams();
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState(null);
  const [productoOriginal, setProductoOriginal] = useState(null);
  const [sucursales, setSucursales] = useState([]);

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria: "",
    proveedor: "",
    precio_compra: "",
    precio_venta: "",
    precio_credito: "",
    stock_actual: 0,
    stock_minimo: "",
  });

  const [pedido, setPedido] = useState({
    sucursal_id: "",
    cantidad: "",
    observacion: "",
  });

  useEffect(() => {
    const idEmpresa = localStorage.getItem("empresaId");

    if (!idEmpresa) {
      alert("No hay empresa activa.");
      return;
    }

    setEmpresaId(idEmpresa);
  }, []);

  useEffect(() => {
    if (params?.id && empresaId) {
      cargarProducto();
      cargarSucursales();
    }
  }, [params?.id, empresaId]);

  async function cargarProducto() {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("id", params.id)
      .eq("empresa_id", empresaId)
      .single();

    if (error) {
      alert("Error cargando producto: " + error.message);
      return;
    }

    setProductoOriginal(data);

    setForm({
      codigo: data.codigo || "",
      nombre: data.nombre || "",
      descripcion: data.descripcion || "",
      categoria: data.categoria || "",
      proveedor: data.proveedor || "",
      precio_compra: data.precio_compra || "",
      precio_venta: data.precio_venta || "",
      precio_credito: data.precio_credito || "",
      stock_actual: data.stock_actual || 0,
      stock_minimo: data.stock_minimo || "",
    });
  }

  async function cargarSucursales() {
    const { data, error } = await supabase
      .from("sucursales")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("estado", "Activa")
      .order("created_at", { ascending: true });

    if (error) {
      alert("Error cargando sucursales: " + error.message);
      return;
    }

    setSucursales(data || []);
  }

  function actualizar(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function actualizarPedido(campo, valor) {
    setPedido((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function obtenerUsuarioActual() {
    return localStorage.getItem("usuarioNombre") || "Sistema";
  }

  function generarDetalleCambios(original, nuevo) {
    if (!original) return "Producto actualizado.";

    const cambios = [];

    if ((original.codigo || "") !== nuevo.codigo) {
      cambios.push(`Código: ${original.codigo || ""} → ${nuevo.codigo}`);
    }

    if ((original.nombre || "") !== nuevo.nombre) {
      cambios.push(`Nombre: ${original.nombre || ""} → ${nuevo.nombre}`);
    }

    if ((original.descripcion || "") !== nuevo.descripcion) {
      cambios.push(`Descripción modificada`);
    }

    if ((original.categoria || "") !== nuevo.categoria) {
      cambios.push(`Categoría: ${original.categoria || ""} → ${nuevo.categoria}`);
    }

    if ((original.proveedor || "") !== nuevo.proveedor) {
      cambios.push(`Proveedor: ${original.proveedor || ""} → ${nuevo.proveedor}`);
    }

    if (Number(original.precio_compra || 0) !== Number(nuevo.precio_compra || 0)) {
      cambios.push(
        `Precio compra: ${original.precio_compra || 0} → ${nuevo.precio_compra || 0}`
      );
    }

    if (Number(original.precio_venta || 0) !== Number(nuevo.precio_venta || 0)) {
      cambios.push(
        `Precio venta: ${original.precio_venta || 0} → ${nuevo.precio_venta || 0}`
      );
    }

    if (Number(original.precio_credito || 0) !== Number(nuevo.precio_credito || 0)) {
      cambios.push(
        `Precio crédito: ${original.precio_credito || 0} → ${nuevo.precio_credito || 0}`
      );
    }

    if (Number(original.stock_minimo || 0) !== Number(nuevo.stock_minimo || 0)) {
      cambios.push(
        `Stock mínimo: ${original.stock_minimo || 0} → ${nuevo.stock_minimo || 0}`
      );
    }

    return cambios.length > 0 ? cambios.join(" | ") : "Sin cambios en datos generales.";
  }

  async function actualizarProducto() {
    if (!empresaId) {
      alert("No hay empresa activa.");
      return;
    }

    if (!form.codigo || !form.nombre) {
      alert("Complete código y nombre del producto.");
      return;
    }

    const { error } = await supabase
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
      .eq("id", params.id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Error actualizando producto: " + error.message);
      return;
    }

    await supabase.from("bitacora_inventario").insert([
      {
        empresa_id: empresaId,
        producto_id: params.id,
        accion: "EDICION_PRODUCTO",
        detalle: generarDetalleCambios(productoOriginal, form),
        usuario: obtenerUsuarioActual(),
      },
    ]);

    alert("Producto actualizado correctamente.");
    router.push("/inventario");
  }

  async function registrarNuevoPedido() {
    if (!empresaId) {
      alert("No hay empresa activa.");
      return;
    }

    if (!pedido.sucursal_id) {
      alert("Seleccione una sucursal.");
      return;
    }

    const cantidad = Number(pedido.cantidad || 0);

    if (cantidad <= 0) {
      alert("Ingrese una cantidad válida.");
      return;
    }

    const stockAnterior = Number(form.stock_actual || 0);
    const stockNuevo = stockAnterior + cantidad;

    const { error: errorProducto } = await supabase
      .from("productos")
      .update({
        stock_actual: stockNuevo,
      })
      .eq("id", params.id)
      .eq("empresa_id", empresaId);

    if (errorProducto) {
      alert("Error actualizando stock: " + errorProducto.message);
      return;
    }

    const { error: errorPedido } = await supabase
      .from("pedidos_inventario")
      .insert([
        {
          empresa_id: empresaId,
          producto_id: params.id,
          sucursal_id: pedido.sucursal_id,
          cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          observacion: pedido.observacion || "Nuevo ingreso de inventario",
          usuario: obtenerUsuarioActual(),
        },
      ]);

    if (errorPedido) {
      alert("Stock actualizado, pero no se guardó el pedido: " + errorPedido.message);
      return;
    }

    const { error: errorMovimiento } = await supabase
      .from("movimientos_inventario")
      .insert([
        {
          empresa_id: empresaId,
          producto_id: params.id,
          tipo_movimiento: "ENTRADA",
          cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          observacion: pedido.observacion || "Nuevo pedido / ingreso de inventario",
          usuario: obtenerUsuarioActual(),
        },
      ]);

    if (errorMovimiento) {
      alert(
        "Stock actualizado, pero no se registró movimiento: " +
          errorMovimiento.message
      );
      return;
    }

    await supabase.from("bitacora_inventario").insert([
      {
        empresa_id: empresaId,
        producto_id: params.id,
        accion: "NUEVO_PEDIDO",
        detalle: `Ingreso de ${cantidad} unidades. Stock: ${stockAnterior} → ${stockNuevo}`,
        usuario: obtenerUsuarioActual(),
      },
    ]);

    setForm((prev) => ({
      ...prev,
      stock_actual: stockNuevo,
    }));

    setPedido({
      sucursal_id: "",
      cantidad: "",
      observacion: "",
    });

    alert("Nuevo pedido registrado y stock actualizado correctamente.");
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

        <label>Precio Crédito</label>
        <input
          type="number"
          value={form.precio_credito}
          onChange={(e) => actualizar("precio_credito", e.target.value)}
        />

        <label>Stock Actual</label>
        <input value={form.stock_actual} disabled />

        <label>Stock Mínimo</label>
        <input
          type="number"
          value={form.stock_minimo}
          onChange={(e) => actualizar("stock_minimo", e.target.value)}
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

      <div
        style={{
          maxWidth: "700px",
          marginTop: "40px",
          padding: "25px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          background: "#f9fafb",
          display: "grid",
          gap: "12px",
        }}
      >
        <h2>Nuevo Pedido / Ingreso de Stock</h2>

        <label>Sucursal</label>
        <select
          value={pedido.sucursal_id}
          onChange={(e) => actualizarPedido("sucursal_id", e.target.value)}
        >
          <option value="">Seleccione una sucursal</option>
          {sucursales.map((sucursal) => (
            <option key={sucursal.id} value={sucursal.id}>
              {sucursal.nombre}
            </option>
          ))}
        </select>

        <label>Cantidad a ingresar</label>
        <input
          type="number"
          value={pedido.cantidad}
          onChange={(e) => actualizarPedido("cantidad", e.target.value)}
        />

        <label>Observación</label>
        <input
          placeholder="Ej. Pedido recibido, compra a proveedor, ajuste de entrada..."
          value={pedido.observacion}
          onChange={(e) => actualizarPedido("observacion", e.target.value)}
        />

        <button
          onClick={registrarNuevoPedido}
          style={{
            padding: "12px",
            background: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ➕ Registrar Pedido y Sumar Stock
        </button>
      </div>
    </div>
  );
}
