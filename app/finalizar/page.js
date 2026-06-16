"use client";

import { useEffect, useState } from "react";

export default function Finalizar() {
  const [empresa, setEmpresa] = useState({
    nombre: "Cargando empresa...",
    plan: "KONAX Gestión",
    usuarios: 2,
    estado: "Activo",
  });

  useEffect(() => {
    const datosGuardados = localStorage.getItem("empresaConfigurada");

    if (datosGuardados) {
      const datos = JSON.parse(datosGuardados);

      setEmpresa({
        nombre: datos.nombreEmpresa || datos.nombre || "Empresa sin nombre",
        plan: datos.plan || "KONAX Gestión",
        usuarios: datos.usuarios || 2,
        estado: datos.estado || "Activo",
      });
    } else {
      const nombreEmpresa = localStorage.getItem("empresaNombre");

      setEmpresa({
        nombre: nombreEmpresa || "Empresa no encontrada",
        plan: "KONAX Gestión",
        usuarios: 2,
        estado: "Activo",
      });
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "1000px",
          maxWidth: "100%",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "60px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ marginBottom: "60px" }}>
          <p
            style={{
              fontWeight: "bold",
              color: "#666",
              marginBottom: "12px",
              fontSize: "15px",
            }}
          >
            Paso 6 de 6
          </p>

          <div
            style={{
              width: "100%",
              height: "14px",
              background: "#e5e7eb",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#16a34a",
              }}
            />
          </div>

          <p
            style={{
              marginTop: "12px",
              color: "#16a34a",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            100%
          </p>
        </div>

        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={{
            width: "650px",
            maxWidth: "100%",
            height: "auto",
            marginBottom: "50px",
          }}
        />

        <h1
          style={{
            color: "#16a34a",
            marginBottom: "15px",
            fontSize: "42px",
            fontWeight: "700",
          }}
        >
          Configuración completada
        </h1>

        <p
          style={{
            color: "#666",
            fontSize: "17px",
            marginBottom: "45px",
          }}
        >
          Tu empresa ha sido configurada correctamente y ya está lista para utilizar KONAX.
        </p>

        <div
          style={{
            background: "#f9fafb",
            borderRadius: "16px",
            padding: "35px",
            maxWidth: "700px",
            margin: "0 auto 45px auto",
            textAlign: "left",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ marginBottom: "25px" }}>
            <strong style={{ display: "block", marginBottom: "5px" }}>
              🏢 Empresa
            </strong>
            <div>{empresa.nombre}</div>
          </div>

          <div style={{ marginBottom: "25px" }}>
            <strong style={{ display: "block", marginBottom: "5px" }}>
              📦 Plan
            </strong>
            <div>{empresa.plan}</div>
          </div>

          <div style={{ marginBottom: "25px" }}>
            <strong style={{ display: "block", marginBottom: "5px" }}>
              👥 Usuarios
            </strong>
            <div>{empresa.usuarios} registrados</div>
          </div>

          <div>
            <strong style={{ display: "block", marginBottom: "5px" }}>
              🟢 Estado
            </strong>
            <div
              style={{
                color: "#16a34a",
                fontWeight: "bold",
              }}
            >
              {empresa.estado}
            </div>
          </div>
        </div>

        <button
          onClick={() => (window.location.href = "/inicio")}
          style={{
            width: "100%",
            background: "#16a34a",
            color: "white",
            border: "none",
            padding: "22px",
            borderRadius: "14px",
            fontSize: "20px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(22,163,74,0.30)",
          }}
        >
          Ingresar a KONAX
        </button>
      </div>
    </div>
  );
}
