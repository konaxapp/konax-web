"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProductosServicios() {
  const [formulario, setFormulario] = useState({
    cliente: "",
    producto_servicio: "",
    descripcion: "",
    monto: "",
    metodo_pago: "Efectivo",
    vendedor: "",
    observacion: "",
    estado: "Pagado",
  });

  const guardar = async () => {
    if (
      !formulario.cliente ||
      !formulario.producto_servicio ||
      !formulario.monto
    ) {
      alert("Complete Cliente, Producto/Servicio y Monto");
      return;
    }

    const { error } = await supabase
      .from("productos_servicios")
      .insert([
        {
          cliente: formulario.cliente,
          producto_servicio: formulario.producto_servicio,
          descripcion: formulario.descripcion,
          monto: formulario.monto,
          metodo_pago: formulario.metodo_pago,
          vendedor: formulario.vendedor,
          observacion: formulario.observacion,
          estado: formulario.estado,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Registro guardado correctamente");

    setFormulario({
      cliente: "",
      producto_servicio: "",
      descripcion: "",
      monto: "",
      metodo_pago: "Efectivo",
      vendedor: "",
      observacion: "",
      estado: "Pagado",
    });
  };

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <h1 style={titulo}>Productos y Servicios</h1>

        <div style={card}>
          <div style={grid}>
            <input
              placeholder="Cliente"
              value={formulario.cliente}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  cliente: e.target.value,
                })
              }
              style={input}
            />

            <input
              placeholder="Producto o Servicio"
              value={formulario.producto_servicio}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  producto_servicio: e.target.value,
                })
              }
              style={input}
            />

            <input
              type="number"
              placeholder="Monto"
              value={formulario.monto}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  monto: e.target.value,
                })
              }
              style={input}
            />

            <input
              placeholder="Vendedor"
              value={formulario.vendedor}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  vendedor: e.target.value,
                })
              }
              style={input}
            />

            <select
              value={formulario.metodo_pago}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  metodo_pago: e.target.value,
                })
              }
              style={input}
            >
              <option>Efectivo</option>
              <option>Yappy</option>
              <option>Transferencia</option>
              <option>Tarjeta</option>
              <option>Pendiente</option>
            </select>

            <select
              value={formulario.estado}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  estado: e.target.value,
                })
              }
              style={input}
            >
              <option>Pagado</option>
              <option>Pendiente</option>
            </select>
          </div>

          <textarea
            placeholder="Descripción"
            value={formulario.descripcion}
            onChange={(e) =>
              setFormulario({
                ...formulario,
                descripcion: e.target.value,
              })
            }
            style={textarea}
          />

          <textarea
            placeholder="Observación"
            value={formulario.observacion}
            onChange={(e) =>
              setFormulario({
                ...formulario,
                observacion: e.target.value,
              })
            }
            style={textarea}
          />

          <button onClick={guardar} style={boton}>
            Guardar Registro
          </button>
        </div>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "20px",
};

const contenedor = {
  maxWidth: "1200px",
  margin: "0 auto",
};

const titulo = {
  fontSize: "32px",
  marginBottom: "20px",
};

const card = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "16px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
  gap: "15px",
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const textarea = {
  width: "100%",
  minHeight: "100px",
  marginTop: "15px",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const boton = {
  marginTop: "15px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "12px 25px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};
