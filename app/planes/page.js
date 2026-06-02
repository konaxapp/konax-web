"use client";

import { useState } from "react";

export default function Planes() {
  const [tipoPlan, setTipoPlan] = useState("mensual");

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
        <h1
          style={{
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          Selecciona tu Plan
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "40px",
          }}
        >
          Elige el plan que mejor se adapte a tu negocio
        </p>

        {/* Selector */}
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
              background:
                tipoPlan === "mensual"
                  ? "#2563eb"
                  : "white",
              color:
                tipoPlan === "mensual"
                  ? "white"
                  : "#2563eb",
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
              background:
                tipoPlan === "anual"
                  ? "#2563eb"
                  : "white",
              color:
                tipoPlan === "anual"
                  ? "white"
                  : "#2563eb",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Anual
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          {/* COBROS */}
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

            <h1>
              $
              {tipoPlan === "mensual"
                ? "29"
                : "299"}
            </h1>

            <p style={{ color: "#666" }}>
              Clientes, créditos, pagos,
              gestores y promesas de pago.
            </p>

            <button
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

          {/* GESTIÓN */}
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

            <h1>
              $
              {tipoPlan === "mensual"
                ? "59"
                : "595"}
            </h1>

            <p style={{ color: "#666" }}>
              Cobros + ventas + caja +
              administración.
            </p>

            <button
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

          {/* EMPRESARIAL */}
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

            <h1>
              $
              {tipoPlan === "mensual"
                ? "99"
                : "990"}
            </h1>

            <p style={{ color: "#666" }}>
              Indicadores, reportes,
              multiempresa e integraciones.
            </p>

            <button
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
      </div>
    </div>
  );
}
