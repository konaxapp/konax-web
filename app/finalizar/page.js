"use client";

export default function Finalizar() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "30px",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: "800px",
          background: "white",
          borderRadius: "20px",
          padding: "50px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            fontSize: "80px",
            marginBottom: "20px",
          }}
        >
          ✅
        </div>

        <h1
          style={{
            color: "#16a34a",
            marginBottom: "15px",
          }}
        >
          Configuración completada
        </h1>

        <p
          style={{
            color: "#666",
            fontSize: "16px",
            marginBottom: "40px",
          }}
        >
          Tu empresa ha sido configurada correctamente y ya está lista para utilizar KONAX.
        </p>

        <div
          style={{
            background: "#f9fafb",
            borderRadius: "12px",
            padding: "25px",
            textAlign: "left",
            marginBottom: "35px",
          }}
        >
          <p>
            <strong>Empresa:</strong> Empresa Demo
          </p>

          <p>
            <strong>Plan:</strong> KONAX Gestión
          </p>

          <p>
            <strong>Usuarios:</strong> 2 usuarios registrados
          </p>

          <p>
            <strong>Estado:</strong>{" "}
            <span
              style={{
                color: "#16a34a",
                fontWeight: "bold",
              }}
            >
              Activo
            </span>
          </p>
        </div>

        <button
          onClick={() =>
            (window.location.href = "/inicio")
          }
          style={{
            width: "100%",
            background: "#16a34a",
            color: "white",
            border: "none",
            padding: "18px",
            borderRadius: "12px",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow:
              "0 4px 12px rgba(22,163,74,0.30)",
          }}
        >
          Ingresar a KONAX
        </button>
      </div>
    </div>
  );
}
