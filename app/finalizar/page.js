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
          width: "850px",
          background: "white",
          borderRadius: "20px",
          padding: "50px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        {/* Barra de progreso */}
        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <p
            style={{
              color: "#666",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            Paso 6 de 6
          </p>

          <div
            style={{
              width: "100%",
              height: "12px",
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
              marginTop: "8px",
              color: "#16a34a",
              fontWeight: "bold",
            }}
          >
            100%
          </p>
        </div>

        {/* Logo KONAX */}
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={{
            width: "300px",
            marginBottom: "30px",
          }}
        />

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
            marginBottom: "35px",
          }}
        >
          Tu empresa ha sido configurada correctamente y ya está lista para utilizar KONAX.
        </p>

        <div
          style={{
            background: "#f9fafb",
            borderRadius: "12px",
            padding: "30px",
            textAlign: "left",
            marginBottom: "35px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                color: "#666",
                fontSize: "14px",
              }}
            >
              🏢 Empresa
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              KONAX
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                color: "#666",
                fontSize: "14px",
              }}
            >
              📦 Plan
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              KONAX Gestión
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                color: "#666",
                fontSize: "14px",
              }}
            >
              👥 Usuarios
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              2 registrados
            </div>
          </div>

          <div>
            <div
              style={{
                color: "#666",
                fontSize: "14px",
              }}
            >
              🟢 Estado
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#16a34a",
              }}
            >
              Activo
            </div>
          </div>
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
