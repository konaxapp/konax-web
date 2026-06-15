"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 🔧 Configura tu Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Planes() {
  const [tipoPlan, setTipoPlan] = useState("mensual");

  const guardarPlan = async (planSeleccionado) => {
    try {
      // Aquí guardamos el plan en la tabla empresas
      const { data, error } = await supabase
        .from("empresas")
        .update({ plan: planSeleccionado })
        .eq("id", "ID_DE_LA_EMPRESA"); // ⚠️ reemplaza con el id real de la empresa

      if (error) {
        console.error("Error al guardar plan:", error.message);
        alert("Error al guardar el plan en Supabase");
        return;
      }

      console.log("Plan actualizado:", data);
      window.location.href = "/confirmacion";
    } catch (err) {
      console.error("Error inesperado:", err);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          background: "white",
          borderRadius: "16px",
          padding: "40px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "10px" }}>
          Selecciona tu Plan
        </h1>

        <p style={{ textAlign: "center", color: "#666", marginBottom: "40px" }}>
          Elige el plan que mejor se adapte a tu negocio
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "40px",
          }}
        >
          <button
            onClick={() => setTipoPlan("mensual")}
            style={{
              padding: "12px 25px",
              borderRadius: "10px",
              border: "1px solid #2563eb",
              background: tipoPlan === "mensual" ? "#2563eb" : "white",
              color: tipoPlan === "mensual" ? "white" : "#2563eb",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Mensual
          </button>

          <button
            onClick={() => setTipoPlan("anual")}
            style={{
              padding: "12px 25px",
              borderRadius: "10px",
              border: "1px solid #2563eb",
              background: tipoPlan === "anual" ? "#2563eb" : "white",
              color: tipoPlan === "anual" ? "white" : "#2563eb",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Anual
          </button>
        </div>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          {/* KONAX COBROS */}
          <div
            style={{
              flex: 1,
              minWidth: "300px",
              border: "2px solid #2563eb",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <h2>KONAX Cobros</h2>
            <h1>${tipoPlan === "mensual" ? "29" : "299"}</h1>
            <ul style={{ color: "#666", paddingLeft: "20px", minHeight: "160px" }}>
              <li>Clientes</li>
              <li>Créditos</li>
              <li>Pagos</li>
              <li>Gestores</li>
              <li>Promesas de pago</li>
              <li>Soporte especializado</li>
            </ul>
            <button
              onClick={() => guardarPlan("Cobros")}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                background: "#2563eb",
                color: "white",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Seleccionar
            </button>
          </div>

          {/* KONAX GESTIÓN */}
          <div
            style={{
              flex: 1,
              minWidth: "300px",
              border: "2px solid #10b981",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <h2>KONAX Gestión</h2>
            <h1>${tipoPlan === "mensual" ? "59" : "595"}</h1>
            <ul style={{ color: "#666", paddingLeft: "20px", minHeight: "160px" }}>
              <li>Cobranza</li>
              <li>Ventas</li>
              <li>Caja</li>
              <li>Usuarios</li>
              <li>Administración</li>
              <li>Soporte especializado</li>
            </ul>
            <button
              onClick={() => guardarPlan("Gestión")}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                background: "#10b981",
                color: "white",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Seleccionar
            </button>
          </div>

          {/* KONAX EMPRESARIAL */}
          <div
            style={{
              flex: 1,
              minWidth: "300px",
              border: "2px solid #111827",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <h2>KONAX Empresarial</h2>
            <h1>${tipoPlan === "mensual" ? "99" : "990"}</h1>
            <ul style={{ color: "#666", paddingLeft: "20px", minHeight: "160px" }}>
              <li>Gestión empresarial</li>
              <li>Indicadores gerenciales</li>
              <li>Reportes avanzados</li>
              <li>Multiempresa</li>
              <li>Integraciones</li>
              <li>Soporte especializado</li>
            </ul>
            <button
              onClick={() => guardarPlan("Empresarial")}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                background: "#111827",
                color: "white",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Seleccionar
            </button>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "30px",
            color: "#777",
            fontSize: "14px",
          }}
        >
          Precios mensuales mostrados. Planes anuales:
          Cobros $299 · Gestión $595 · Empresarial $990
        </p>
      </div>
    </div>
  );
}
