"use client";

import { useState } from "react";

export default function Suscripciones() {
  const [formulario, setFormulario] = useState({
    cliente: "",
    plan: "",
    descripcion: "",
    precio: "",
    vendedor: "",
    fechaInicio: "",
    periodicidad: "Mensual",
    estado: "Activo",
  });

  const calcularVencimiento = () => {
    if (!formulario.fechaInicio) return "";

    const fecha = new Date(formulario.fechaInicio);

    switch (formulario.periodicidad) {
      case "Mensual":
        fecha.setDate(fecha.getDate() + 30);
        break;

      case "Trimestral":
        fecha.setDate(fecha.getDate() + 90);
        break;

      case "Semestral":
        fecha.setDate(fecha.getDate() + 180);
        break;

      case "Anual":
        fecha.setDate(fecha.getDate() + 365);
        break;
    }

    return fecha.toISOString().split("T")[0];
  };

  const guardar = () => {
    alert("Suscripción creada correctamente");
  };

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <h1 style={titulo}>Suscripciones y Membresías</h1>

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
              placeholder="Plan"
              value={formulario.plan}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  plan: e.target.value,
                })
              }
              style={input}
            />

            <input
              placeholder="Precio"
              type="number"
              value={formulario.precio}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  precio: e.target.value,
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

            <input
              type="date"
              value={formulario.fechaInicio}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  fechaInicio: e.target.value,
                })
              }
              style={input}
            />

            <select
              value={formulario.periodicidad}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  periodicidad: e.target.value,
                })
              }
              style={input}
            >
              <option>Mensual</option>
              <option>Trimestral</option>
              <option>Semestral</option>
              <option>Anual</option>
            </select>

            <input
              value={calcularVencimiento()}
              readOnly
              style={{
                ...input,
                background: "#f3f4f6",
                fontWeight: "bold",
              }}
            />

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
              <option>Activo</option>
              <option>Pendiente</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
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

          <button onClick={guardar} style={boton}>
            Crear Suscripción
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
