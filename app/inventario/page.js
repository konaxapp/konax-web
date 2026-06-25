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

  function volverCentroOperaciones() {
    window.location.href = "/dashboard";
  }

  function irVistaCliente() {
    window.location.href = "/vista-cliente";
  }

  const productosStockBajo = productos.filter((p) => {
    const stock = Number(p.stock_actual || 0);
    const minimo = Number(p.stock_minimo || 0);
    return stock > 0 && stock <= minimo;
  });

  const productosAgotados = productos.filter((p) => {
    const stock = Number(p.stock_actual || 0);
    return stock <= 0;
  });

  const productosDisponibles = productos.filter((p) => {
    const stock = Number(p.stock_actual || 0);
    const minimo = Number(p.stock_minimo || 0);
    return stock > minimo;
  });

  const valorInventario = productos.reduce((total, p) => {
    return total + Number(p.precio_compra || 0) * Number(p.stock_actual || 0);
  }, 0);

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(busqueda.toLowerCase())
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

  function obtenerEstiloEstado(producto) {
    const estado = obtenerEstadoStock(producto);

    if (estado === "AGOTADO") return agotado;
    if (estado === "BAJO") return stockBajo;

    return disponible;
  }

  function obtenerTextoEstado(producto) {
    const estado = obtenerEstadoStock(producto);

    if (estado === "AGOTADO") return "🔴 Agotado";
    if (estado === "BAJO") return "🟡 Stock bajo";

    return "🟢 Disponible";
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <p style={etiqueta}>Inventario</p>
              <h1 style={titulo}>Consulta de Inventario</h1>
              <p style={subtitulo}>
                Visualiza productos, precios, stock disponible, alertas y estado del inventario.
              </p>
            </div>
          </div>

          <div style={accionesHero}>
            <button onClick={irVistaCliente} style={botonSecundario}>
              Vista Cliente
            </button>

            <button onClick={volverCentroOperaciones} style={botonVolver}>
              Salir
            </button>
          </div>
        </div>

        <div style={resumenGrid}>
          <KPI titulo="Productos" valor={productos.length} icono="📦" />
          <KPI titulo="Disponibles" valor={productosDisponibles.length} icono="🟢" />
          <KPI titulo="Stock bajo" valor={productosStockBajo.length} icono="🟡" />
          <KPI titulo="Agotados" valor={productosAgotados.length} icono="🔴" />
          <KPI
            titulo="Valor inventario"
            valor={`$${valorInventario.toFixed(2)}`}
            icono="💰"
          />
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <div>
              <h2 style={tituloSeccion}>Productos registrados</h2>
              <p style={textoSuave}>
                Consulta general de productos, precios, disponibilidad y estado del stock.
              </p>
            </div>

            <input
              type="text"
              placeholder="Buscar por código, producto, categoría o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={buscador}
            />
          </div>

          <div style={tablaBox}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Foto</th>
                  <th style={th}>Código</th>
                  <th style={th}>Producto</th>
                  <th style={th}>Categoría</th>
                  <th style={th}>Descripción</th>
                  <th style={th}>Stock</th>
                  <th style={th}>Compra</th>
                  <th style={th}>Venta</th>
                  <th style={th}>Crédito</th>
                  <th style={th}>Oferta</th>
                  <th style={th}>Ganancia</th>
                  <th style={th}>Estado</th>
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

                    <td style={td}>
                      <strong>{producto.codigo}</strong>
                    </td>

                    <td style={td}>
                      <strong>{producto.nombre}</strong>
                      <br />
                      <span style={textoPequeno}>
                        Proveedor: {producto.proveedor || "-"}
                      </span>
                    </td>

                    <td style={td}>{producto.categoria || "-"}</td>
                    <td style={td}>{producto.descripcion || "-"}</td>

                    <td style={td}>
                      <div style={stockBox}>
                        <strong style={stockCantidad}>
                          {producto.stock_actual || 0}
                        </strong>
                        <span style={stockMinimo}>
                          Mínimo: {producto.stock_minimo || 0}
                        </span>
                      </div>
                    </td>

                    <td style={td}>
                      ${Number(producto.precio_compra || 0).toFixed(2)}
                    </td>

                    <td style={td}>
                      ${Number(producto.precio_venta || 0).toFixed(2)}
                    </td>

                    <td style={td}>
                      ${Number(producto.precio_credito || 0).toFixed(2)}
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
                      <span style={obtenerEstiloEstado(producto)}>
                        {obtenerTextoEstado(producto)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ titulo, valor, icono }) {
  return (
    <div style={resumenItem}>
      <div style={kpiIcono}>{icono}</div>
      <span style={resumenLabel}>{titulo}</span>
      <strong style={resumenValor}>{valor}</strong>
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
  maxWidth: "1500px",
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
  maxWidth: "760px",
};

const accionesHero = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const botonSecundario = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
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

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const resumenItem = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
  display: "grid",
  gap: "6px",
};

const kpiIcono = {
  fontSize: "26px",
};

const resumenLabel = {
  color: "#6b7280",
  fontSize: "13px",
};

const resumenValor = {
  color: "#111827",
  fontSize: "24px",
};

const card = {
  background: "#ffffff",
  padding: "24px",
  borderRadius: "20px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const tituloSeccion = {
  margin: 0,
  color: "#111827",
};

const textoSuave = {
  color: "#6b7280",
  marginTop: "6px",
};

const buscador = {
  padding: "12px",
  width: "420px",
  maxWidth: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  fontSize: "14px",
};

const tablaBox = {
  background: "#fff",
  borderRadius: "14px",
  overflowX: "auto",
  border: "1px solid #e5e7eb",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1250px",
};

const th = {
  padding: "13px",
  textAlign: "left",
  background: "#111827",
  color: "#ffffff",
  fontSize: "13px",
};

const td = {
  padding: "13px",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
  fontSize: "13px",
  color: "#111827",
};

const textoPequeno = {
  color: "#6b7280",
  fontSize: "12px",
};

const stockBox = {
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

const stockCantidad = {
  fontSize: "16px",
  color: "#111827",
};

const stockMinimo = {
  fontSize: "12px",
  color: "#6b7280",
};

const imagenProducto = {
  width: "58px",
  height: "58px",
  objectFit: "cover",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
};

const sinImagen = {
  width: "58px",
  height: "58px",
  borderRadius: "10px",
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
  padding: "6px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const agotado = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "6px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const disponible = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const oferta = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};
