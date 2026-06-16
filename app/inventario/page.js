"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarProductos();
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

  const productosAlerta = productos.filter(
    (p) => Number(p.stock_actual || 0) <= Number(p.stock_minimo || 0)
  );

  const productosAgotados = productos.filter(
    (p) => Number(p.stock_actual || 0) <= 0
  );

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

  function obtenerEstadoStock(producto) {
    const stock = Number(producto.stock_actual || 0);
    const minimo = Number(producto.stock_minimo || 0);

    if (stock <= 0) return "AGOTADO";
    if (stock <= minimo) return "BAJO";
    return "DISPONIBLE";
  }

  function obtenerEstiloFila(producto) {
    const estado = obtenerEstadoStock(producto);

    if (estado === "AGOTADO") return filaAgotado;
    if (estado === "BAJO") return filaStockBajo;

    return {};
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
      </div>

      {productosAlerta.length > 0 && (
        <div style={alertaStock}>
          <strong>⚠️ Alerta de inventario</strong>
          <p style={{ margin: "6px 0 0" }}>
            Tienes {productosAlerta.length} producto(s) con stock bajo o agotado.
            {productosAgotados.length > 0 &&
              ` ${productosAgotados.length} producto(s) están agotados.`}
          </p>
        </div>
      )}

      <div style={cardResumen}>
        <div style={resumenItem}>
          <span style={resumenLabel}>Productos</span>
          <strong>{productos.length}</strong>
        </div>

        <div style={resumenItemAlerta}>
          <span style={resumenLabel}>Stock bajo</span>
          <strong>{productosAlerta.length}</strong>
        </div>

        <div style={resumenItemAgotado}>
          <span style={resumenLabel}>Agotados</span>
          <strong>{productosAgotados.length}</strong>
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
            </tr>
          </thead>

          <tbody>
            {productosFiltrados.length === 0 && (
              <tr>
                <td style={td} colSpan="11">
                  No hay productos registrados.
                </td>
              </tr>
            )}

            {productosFiltrados.map((producto) => {
              const estadoStock = obtenerEstadoStock(producto);

              return (
                <tr key={producto.id} style={obtenerEstiloFila(producto)}>
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
                    {estadoStock === "AGOTADO" && (
                      <span style={agotado}>🔴 Agotado</span>
                    )}

                    {estadoStock === "BAJO" && (
                      <span style={stockBajo}>🟡 Stock Bajo</span>
                    )}

                    {estadoStock === "DISPONIBLE" && (
                      <span style={disponible}>🟢 Disponible</span>
                    )}
                  </td>

                  <td style={td}>
                    {producto.ultimo_movimiento_fecha
                      ? new Date(producto.ultimo_movimiento_fecha).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              );
            })}
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

const alertaStock = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: "15px",
  borderRadius: "12px",
  marginBottom: "20px",
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

const resumenItemAlerta = {
  ...resumenItem,
  background: "#fffbeb",
  border: "1px solid #fde68a",
};

const resumenItemAgotado = {
  ...resumenItem,
  background: "#fef2f2",
  border: "1px solid #fecaca",
};

const resumenLabel = {
  color: "#6b7280",
  fontSize: "14px",
};

const toolbar = {
  display: "flex",
  justifyContent: "flex-start",
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

const filaStockBajo = {
  background: "#fffbeb",
};

const filaAgotado = {
  background: "#fef2f2",
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
  background: "#fef3c7",
  color: "#92400e",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const agotado = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const disponible = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const oferta = {
  background: "#dcfce7",
  color: "#166534",
  padding: "4px 8px",
  borderRadius: "999px",
  fontWeight: "bold",
};
