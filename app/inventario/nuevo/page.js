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
    numero_factura: "",
    fecha_compra: new Date().toISOString().split("T")[0],
    condicion_compra: "Contado",
    total_factura: "",
    fecha_vencimiento_pago: "",
    observacion_compra: "",
  });

  const [imagen, setImagen] = useState(null);

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

  async function subirImagen(empresaId) {
    if (!imagen) return null;

    const nombreArchivo =
      empresaId + "/" + Date.now() + "-" + imagen.name.replace(/\s/g, "_");

    const { error: uploadError } = await supabase.storage
      .from("inventario")
      .upload(nombreArchivo, imagen);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("inventario")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function guardarProducto() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!form.codigo || !form.nombre) {
      alert("Complete código y nombre del producto.");
      return;
    }

    if (!form.numero_factura) {
      alert("Ingrese el número de factura u orden de compra.");
      return;
    }

    const stockInicial = Number(form.stock_inicial || 0);

    let imagenUrl = null;

    try {
      imagenUrl = await subirImagen(empresaId);
    } catch (error) {
      alert("Error subiendo imagen: " + error.message);
      return;
    }

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
          imagen_url: imagenUrl,
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
          numero_factura: form.numero_factura,
          fecha_compra: form.fecha_compra,
          condicion_compra: form.condicion_compra,
          total_factura: Number(form.total_factura || 0),
          fecha_vencimiento_pago: form.fecha_vencimiento_pago || null,
          observacion: form.observacion_compra || "Stock inicial",
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
      numero_factura: "",
      fecha_compra: new Date().toISOString().split("T")[0],
      condicion_compra: "Contado",
      total_factura: "",
      fecha_vencimiento_pago: "",
      observacion_compra: "",
    });

    setImagen(null);
  }

  function volverInventario() {
    window.location.href = "/inventario";
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <p style={etiqueta}>Inventario</p>
              <h1 style={titulo}>Nuevo Producto</h1>
              <p style={subtitulo}>
                Registra el producto junto con la factura, orden de compra o condición de consignación.
              </p>
            </div>
          </div>

          <button onClick={volverInventario} style={botonVolver}>
            ← Volver a Inventario
          </button>
        </div>

        <div style={card}>
          <div style={seccionHeader}>
            <h2 style={tituloSeccion}>Datos del Producto</h2>
            <p style={textoSuave}>Información comercial del artículo.</p>
          </div>

          <div style={grid}>
            <Campo label="Código *">
              <input value={form.codigo} onChange={(e) => actualizar("codigo", e.target.value)} style={inputStyle} placeholder="Ej. PRD-001" />
            </Campo>

            <Campo label="Nombre del Producto *">
              <input value={form.nombre} onChange={(e) => actualizar("nombre", e.target.value)} style={inputStyle} placeholder="Ej. Sala Valencia" />
            </Campo>

            <Campo label="Categoría">
              <input value={form.categoria} onChange={(e) => actualizar("categoria", e.target.value)} style={inputStyle} placeholder="Ej. Salas, Tecnología, Abarrotes" />
            </Campo>

            <Campo label="Proveedor">
              <input value={form.proveedor} onChange={(e) => actualizar("proveedor", e.target.value)} style={inputStyle} placeholder="Nombre del proveedor" />
            </Campo>

            <Campo label="Precio Compra Unitario">
              <input type="number" value={form.precio_compra} onChange={(e) => actualizar("precio_compra", e.target.value)} style={inputStyle} placeholder="0.00" />
            </Campo>

            <Campo label="Precio Venta">
              <input type="number" value={form.precio_venta} onChange={(e) => actualizar("precio_venta", e.target.value)} style={inputStyle} placeholder="0.00" />
            </Campo>

            <Campo label="Precio Crédito">
              <input type="number" value={form.precio_credito} onChange={(e) => actualizar("precio_credito", e.target.value)} style={inputStyle} placeholder="Opcional" />
            </Campo>

            <Campo label="Stock Inicial">
              <input type="number" value={form.stock_inicial} onChange={(e) => actualizar("stock_inicial", e.target.value)} style={inputStyle} placeholder="0" />
            </Campo>

            <Campo label="Stock Mínimo">
              <input type="number" value={form.stock_minimo} onChange={(e) => actualizar("stock_minimo", e.target.value)} style={inputStyle} placeholder="0" />
            </Campo>
          </div>

          <div style={separador} />

          <div style={seccionHeader}>
            <h2 style={tituloSeccion}>Factura / Orden de Compra</h2>
            <p style={textoSuave}>
              Estos datos permiten relacionar el producto con la compra física, crédito o consignación.
            </p>
          </div>

          <div style={grid}>
            <Campo label="N° Factura / Orden *">
              <input value={form.numero_factura} onChange={(e) => actualizar("numero_factura", e.target.value)} style={inputStyle} placeholder="Ej. FAC-1025 / OC-001" />
            </Campo>

            <Campo label="Fecha de Compra">
              <input type="date" value={form.fecha_compra} onChange={(e) => actualizar("fecha_compra", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Condición">
              <select value={form.condicion_compra} onChange={(e) => actualizar("condicion_compra", e.target.value)} style={inputStyle}>
                <option>Contado</option>
                <option>Crédito 30 días</option>
                <option>Crédito 60 días</option>
                <option>Consignación</option>
              </select>
            </Campo>

            <Campo label="Total Factura / Orden">
              <input type="number" value={form.total_factura} onChange={(e) => actualizar("total_factura", e.target.value)} style={inputStyle} placeholder="0.00" />
            </Campo>

            <Campo label="Fecha Vencimiento Pago">
              <input type="date" value={form.fecha_vencimiento_pago} onChange={(e) => actualizar("fecha_vencimiento_pago", e.target.value)} style={inputStyle} />
            </Campo>
          </div>

          <div style={gridInferior}>
            <Campo label="Descripción del Producto">
              <textarea value={form.descripcion} onChange={(e) => actualizar("descripcion", e.target.value)} style={textarea} placeholder="Descripción, características o detalles del producto..." />
            </Campo>

            <Campo label="Foto del Producto">
              <div style={uploadBox}>
                <input type="file" accept="image/*" onChange={(e) => setImagen(e.target.files[0])} style={inputFile} />
                <p style={textoArchivo}>
                  {imagen ? imagen.name : "Selecciona una imagen del producto"}
                </p>
              </div>
            </Campo>
          </div>

          <Campo label="Observación de Compra">
            <textarea value={form.observacion_compra} onChange={(e) => actualizar("observacion_compra", e.target.value)} style={textareaCompra} placeholder="Ej. Mercancía en consignación, factura pendiente de pago, acuerdo con proveedor..." />
          </Campo>

          <div style={acciones}>
            <button onClick={guardarProducto} style={botonGuardar}>
              💾 Guardar Producto
            </button>

            <button onClick={volverInventario} style={botonSecundario}>
              Cancelar
            </button>
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

const pagina = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #ecfdf5 0%, #f3f4f6 45%, #ffffff 100%)",
  padding: "35px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
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

const card = {
  background: "#ffffff",
  padding: "28px",
  borderRadius: "20px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const seccionHeader = {
  marginBottom: "20px",
};

const tituloSeccion = {
  margin: 0,
  color: "#111827",
};

const textoSuave = {
  marginTop: "6px",
  color: "#6b7280",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: "16px",
};

const gridInferior = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: "16px",
  marginTop: "18px",
};

const separador = {
  height: "1px",
  background: "#e5e7eb",
  margin: "28px 0",
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

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
};

const textarea = {
  ...inputStyle,
  minHeight: "115px",
  resize: "vertical",
};

const textareaCompra = {
  ...inputStyle,
  minHeight: "90px",
  marginTop: "18px",
  resize: "vertical",
};

const uploadBox = {
  border: "1px dashed #9ca3af",
  borderRadius: "14px",
  padding: "18px",
  background: "#f9fafb",
  minHeight: "115px",
};

const inputFile = {
  width: "100%",
};

const textoArchivo = {
  color: "#6b7280",
  fontSize: "13px",
  marginTop: "12px",
};

const acciones = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "24px",
};

const botonGuardar = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "14px 28px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "15px",
};

const botonSecundario = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};
