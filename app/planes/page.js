"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Planes() {
  const [tipoPlan, setTipoPlan] = useState("mensual");

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de seleccionar un plan.");
      return null;
    }

    return empresaId;
  }

  async function seleccionarPlan(plan) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const precio =
      tipoPlan === "mensual"
        ? Number(plan.precioMensual)
        : Number(plan.precioAnual);

    const { error } = await supabase
      .from("empresas")
      .update({
        plan_codigo: plan.codigo,
        plan_nombre: plan.nombre,
        plan_tipo: tipoPlan,
        plan_precio: precio,
        estado_plan: "Activo",
      })
      .eq("id", empresaId);

    if (error) {
      alert("Error al guardar el plan en Supabase: " + error.message);
      return;
    }

    window.location.href = "/confirmacion";
  }

  const planes = [
    {
      nombre: "KONAX Básico",
      codigo: "basico",
      precioMensual: "49",
      precioAnual: "499",
      color: "#2563eb",
      incluye: [
        "Clientes",
        "Créditos",
        "Cobranza",
        "Pagos",
        "Promesas de pago",
        "Bitácora básica",
      ],
    },
    {
      nombre: "KONAX Gestión",
      codigo: "gestion",
      precioMensual: "99",
      precioAnual: "999",
      color: "#10b981",
      incluye: [
        "Todo Básico",
        "Inventario",
        "Ventas crédito",
        "Caja",
        "Usuarios",
        "Reportes básicos",
      ],
    },
    {
      nombre: "KONAX Empresarial",
      codigo: "empresarial",
      precioMensual: "499",
      precioAnual: "4990",
      color: "#111827",
      incluye: [
        "Todo Gestión",
        "Multiempresa",
        "Dashboard gerencial",
        "Reportes avanzados",
        "Módulos personalizados",
        "Soporte especializado",
      ],
    },
  ];

  return (
    <div style={pagina}>
      <div style={card}>
        <h1 style={titulo}>Selecciona tu Plan</h1>

        <p style={subtitulo}>
          Elige el plan que mejor se adapte a tu negocio.
        </p>

        <div style={toggleBox}>
          <button
            onClick={() => setTipoPlan("mensual")}
            style={tipoPlan === "mensual" ? botonActivo : botonInactivo}
          >
            Mensual
          </button>

          <button
            onClick={() => setTipoPlan("anual")}
            style={tipoPlan === "anual" ? botonActivo : botonInactivo}
          >
            Anual
          </button>
        </div>

        <div style={planesBox}>
          {planes.map((plan) => (
            <div
              key={plan.codigo}
              style={{
                flex: 1,
                minWidth: "300px",
                border: `2px solid ${plan.color}`,
                borderRadius: "12px",
                padding: "25px",
              }}
            >
              <h2>{plan.nombre}</h2>

              <h1>
                ${tipoPlan === "mensual" ? plan.precioMensual : plan.precioAnual}
              </h1>

              <ul style={lista}>
                {plan.incluye.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <button
                onClick={() => seleccionarPlan(plan)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "none",
                  background: plan.color,
                  color: "white",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Seleccionar
              </button>
            </div>
          ))}
        </div>

        <p style={nota}>
          Precios mensuales: Básico $49 · Gestión $99 · Empresarial $499
        </p>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: "40px",
  fontFamily: "Arial",
};

const card = {
  maxWidth: "1200px",
  margin: "0 auto",
  background: "white",
  borderRadius: "16px",
  padding: "40px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const titulo = {
  textAlign: "center",
  marginBottom: "10px",
};

const subtitulo = {
  textAlign: "center",
  color: "#666",
  marginBottom: "40px",
};

const toggleBox = {
  display: "flex",
  justifyContent: "center",
  gap: "10px",
  marginBottom: "40px",
};

const botonActivo = {
  padding: "12px 25px",
  borderRadius: "10px",
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonInactivo = {
  padding: "12px 25px",
  borderRadius: "10px",
  border: "1px solid #2563eb",
  background: "white",
  color: "#2563eb",
  fontWeight: "bold",
  cursor: "pointer",
};

const planesBox = {
  display: "flex",
  gap: "20px",
  flexWrap: "wrap",
};

const lista = {
  color: "#666",
  paddingLeft: "20px",
  minHeight: "160px",
};

const nota = {
  textAlign: "center",
  marginTop: "30px",
  color: "#777",
  fontSize: "14px",
};
