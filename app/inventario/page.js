"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [rolUsuario, setRolUsuario] = useState("Vendedor");

  useEffect(() => {
    cargarProductos();

    // Prueba temporal
    setRolUsuario("Supervisor");
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de usar inventario.");
      return null;
    }

    return empresaId;
  }

  async function cargarProductos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nombre");

    if (error) {
      alert("Error cargando productos: " + error.message);
      return;
    }

    setProductos(data || []);
  }

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div
      style={{
        padding: "30px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>Inventario</h1>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            padding: "12px",
            width: "350px",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        />

        {(rolUsuario === "Administrador" || rolUsuario === "Supervisor") && (
          <a
            href="/inventario/nuevo"
            style={{
              background: "#16a34a",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            + Nuevo Producto
          </a>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={th}>Código</th>
              <th style={th}>Producto</th>
              <th style={th}>Categoría</th>
              <th style={th}>Proveedor</th>
              <th style={th}>Stock</th>
              <th style={th}>Precio Venta</th>
              <th style={th}>Precio Crédito</th>
              <th style={th}>Estado</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {productosFiltrados.length === 0 && (
              <tr>
                <td style={td} colSpan="9">
                  No hay productos registrados.
                </td>
              </tr>
            )}

            {productosFiltrados.map((producto) => (
              <tr key={producto.id}>
                <td style={td}>{producto.codigo}</td>
                <td style={td}>{producto.nombre}</td>
                <td style={td}>{producto.categoria}</td>
                <td style={td}>{producto.proveedor}</td>
                <td style={td}>{producto.stock_actual}</td>

                <td style={td}>
                  ${Number(producto.precio_venta || 0).toFixed(2)}
                </td>

                <td style={td}>
                  ${Number(producto.precio_credito || 0).toFixed(2)}
                </td>

                <td style={td}>
                  {Number(producto.stock_actual || 0) <=
                  Number(producto.stock_minimo || 0) ? (
                    <span style={{ color: "red", fontWeight: "bold" }}>
                      Stock Bajo
                    </span>
                  ) : (
                    <span style={{ color: "green", fontWeight: "bold" }}>
                      Disponible
                    </span>
                  )}
                </td>

                <td style={td}>
                  {(rolUsuario === "Administrador" ||
                    rolUsuario === "Supervisor") && (
                    <a
                      href={`/inventario/editar/${producto.id}`}
                      style={{
                        color: "#2563eb",
                        fontWeight: "bold",
                        textDecoration: "none",
                      }}
                    >
                      ✏️ Editar
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = {
  padding: "15px",
  textAlign: "left",
  borderBottom: "1px solid #ddd",
};

const td = {
  padding: "15px",
  borderBottom: "1px solid #eee",
};
