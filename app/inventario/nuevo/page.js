"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("nombre");

    if (error) {
      console.log(error);
      return;
    }

    setProductos(data || []);
  }

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre
        ?.toLowerCase()
        .includes(busqueda.toLowerCase()) ||
      p.codigo
        ?.toLowerCase()
        .includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ padding: "20px" }}>
      <h1>Inventario</h1>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "20px",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) =>
            setBusqueda(e.target.value)
          }
          style={{
            padding: "10px",
            width: "300px",
          }}
        />

        <button>
          + Nuevo Producto
        </button>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Stock</th>
            <th>Precio Contado</th>
            <th>Precio Crédito</th>
          </tr>
        </thead>

        <tbody>
          {productosFiltrados.map(
            (producto) => (
              <tr key={producto.id}>
                <td>{producto.codigo}</td>
                <td>{producto.nombre}</td>
                <td>{producto.categoria}</td>
                <td>{producto.stock_actual}</td>
                <td>
                  $
                  {producto.precio_contado}
                </td>
                <td>
                  $
                  {producto.precio_credito}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
