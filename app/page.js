"use client";

import { useState } from "react";

export default function Home() {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fb",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "420px",
          background: "#ffffff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          KONAX
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Crear cuenta
        </p>

        <div style={{ marginBottom: "15px" }}>
          <label>Correo electrónico</label>

          <input
            type="email"
            placeholder="correo@empresa.com"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "5px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Contraseña</label>

          <div
            style={{
              position: "relative",
              marginTop: "5px",
            }}
          >
            <input
              type={mostrarPassword ? "text" : "password"}
              placeholder="********"
              style={{
                width: "100%",
                padding: "12px",
                paddingRight: "80px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={() =>
                setMostrarPassword(!mostrarPassword)
              }
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#2563eb",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              {mostrarPassword
                ? "Ocultar"
                : "Mostrar"}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "25px" }}>
          <label>Confirmar contraseña</label>

          <div
            style={{
              position: "relative",
              marginTop: "5px",
            }}
          >
            <input
              type={
                mostrarConfirmacion
                  ? "text"
                  : "password"
              }
              placeholder="********"
              style={{
                width: "100%",
                padding: "12px",
                paddingRight: "80px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={() =>
                setMostrarConfirmacion(
                  !mostrarConfirmacion
                )
              }
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#2563eb",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              {mostrarConfirmacion
                ? "Ocultar"
                : "Mostrar"}
            </button>
          </div>
        </div>

        <button
          style={{
            width: "100%",
            padding: "14px",
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Crear cuenta
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "#666",
          }}
        >
          ¿Ya tienes cuenta? Iniciar sesión
        </p>
      </div>
    </div>
  );
}
