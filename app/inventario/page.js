"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [rolUsuario, setRolUsuario] = useState("Vendedor");

  useEffect(() => {
    cargarProductos();
    setRolUsuario(localStorage.getItem("usuarioRol") || "Supervisor");
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
      p.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  function calcularGanancia(producto) {
    const compra = Number(producto.precio_compra || 0);
    const venta = Number(producto.precio_venta || 0);

    if (compra <= 0 || venta <= 0) return "0.00";

    return (((venta - compra) / compra) * 100).toFixed(2);
  }

  return (
    <div style={pagina}>
      <div style={header}>
        <div>
          <h1 style={{ marginBottom: "5px" }}>Inventario</h1>
          <p style={{ color: "#6b7280", margin: 0 }}>
            Consulta general de productos, precios, stock y ofertas.
          </p>
        </div>

        {(rolUsuario === "Administrador" || rolUsuario === "Supervisor") && (
          <a href="/inventario/movimientos" style={botonVerde}>
            + Producto / Movimiento
          </a>
        )}
      </div>

      <div style={cardResumen}>
        <div style={resumenItem}>
          <span style={resumenLabel}>Productos</span>
          <strong>{productos.length}</strong>
        </div>

        <div style={resumenItem}>
          <span style={resumenLabel}>Stock bajo</span>
          <strong>
            {
              productos.filter(
                (p) => Number(p.stock_actual || 0) <= Number(p.stock_minimo || 0)
              ).length
            }
          </strong>
        </div>

        <div style={resumenItem}>
          <span style={resumenLabel}>Disponibles</span>
          <strong>
            {
              productos.filter(
                (p) => Number(p.stock_actual || 0) > Number(p.stock_minimo || 0)
              ).length
            }
          </strong>
        </div>
      </div>

      <div style={toolbar}>
        <input
          type="text"
          placeholder="Buscar por código, producto o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={buscador}
        />

        <button onClick={cargarProductos} style={botonAzul}>
          🔄 Actualizar
        </button>
      </div>

      <div style={tablaBox}>
        <table style={tabla}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={th}>Foto</th>
              <th style={th}>Código</th>
              <th style={th}>Producto</th>
              <th style={th}>Descripción</th>
              <th style={th}>Stock</th>
              <th style={th}>Compra</th>
              <th style={th}>Venta</th>
              <th style={th}>Oferta</th>
              <th style={th}>Ganancia</th>
              <th style={th}>Estado</th>
              <th style={th}>Último Mov.</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {productosFiltrados.length === 0 && (
              <tr>
                <td style={td} colSpan="12">
                  No hay productos registrados.
                </td>
              </tr>
            )}

            {productosFiltrados.map((producto) => (
              <tr key={producto.id}>
                <td style={td}>
                  {producto.imagen_url ? (
                    <img
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      style={imagenProducto}
                    />
                  ) : (
                    <div style={sinImagen}>Sin foto</div>
                  )}
                </td>

                <td style={td}>{producto.codigo}</td>

                <td style={td}>
                  <strong>{producto.nombre}</strong>
                </td>

                <td style={td}>{producto.descripcion || "-"}</td>

                <td style={td}>
                  <strong>{producto.stock_actual || 0}</strong>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Mín: {producto.stock_minimo || 0}
                  </div>
                </td>

                <td style={td}>
                  ${Number(producto.precio_compra || 0).toFixed(2)}
                </td>

                <td style={td}>
                  ${Number(producto.precio_venta || 0).toFixed(2)}
                </td>

                <td style={td}>
                  {Number(producto.precio_oferta || 0) > 0 ? (
                    <span style={oferta}>
                      ${Number(producto.precio_oferta || 0).toFixed(2)}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>

                <td style={td}>{calcularGanancia(producto)}%</td>

                <td style={td}>
                  {Number(producto.stock_actual || 0) <=
                  Number(producto.stock_minimo || 0) ? (
                    <span style={stockBajo}>Stock Bajo</span>
                  ) : (
                    <span style={disponible}>Disponible</span>
                  )}
                </td>

                <td style={td}>
                  {producto.ultimo_movimiento_fecha
                    ? new Date(producto.ultimo_movimiento_fecha).toLocaleDateString()
                    : "-"}
                </td>

                <td style={td}>
                  {(rolUsuario === "Administrador" ||
                    rolUsuario === "Supervisor") && (
                    <div style={{ display: "grid", gap: "8px" }}>
                      <a
                        href={`/inventario/editar/${producto.id}`}
                        style={linkEditar}
                      >
                        ✏️ Editar
                      </a>

                      <a href="/inventario/movimientos" style={linkMovimiento}>
                        ➕ Movimiento
                      </a>
                    </div>
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

const pagina = {
  padding: "30px",
  background: "#f5f7fb",
  minHeight: "100vh",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  gap: "15px",
};

const botonVerde = {
  background: "#16a34a",
  color: "#fff",
  padding: "13px 20px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: "bold",
  boxShadow: "0 5px 14px rgba(22,163,74,0.25)",
};

const cardResumen = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "15px",
  marginBottom: "20px",
};

const resumenItem = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  display: "grid",
  gap: "6px",
};

const resumenLabel = {
  color: "#6b7280",
  fontSize: "14px",
};

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "20px",
  gap: "15px",
};

const buscador = {
  padding: "12px",
  width: "420px",
  maxWidth: "100%",
  border: "1px solid #ccc",
  borderRadius: "8px",
};

const botonAzul = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const tablaBox = {
  background: "#fff",
  borderRadius: "12px",
  overflowX: "auto",
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1200px",
};

const th = {
  padding: "15px",
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  fontSize: "14px",
};

const td = {
  padding: "15px",
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
  fontSize: "14px",
};

const imagenProducto = {
  width: "55px",
  height: "55px",
  objectFit: "cover",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
};

const sinImagen = {
  width: "55px",
  height: "55px",
  borderRadius: "8px",
  background: "#f3f4f6",
  color: "#9ca3af",
  fontSize: "11px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const stockBajo = {
  color: "#dc2626",
  fontWeight: "bold",
};

const disponible = {
  color: "#16a34a",
  fontWeight: "bold",
};

const oferta = {
  background: "#dcfce7",
  color: "#166534",
  padding: "4px 8px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const linkEditar = {
  color: "#2563eb",
  fontWeight: "bold",
  textDecoration: "none",
};

const linkMovimiento = {
  color: "#16a34a",
  fontWeight: "bold",
  textDecoration: "none",
};
