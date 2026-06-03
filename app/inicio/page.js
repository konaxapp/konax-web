"use client";

export default function Inicio() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "1100px",
          maxWidth: "100%",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "60px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        {/* Logo */}
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={{
            width: "700px",
            maxWidth: "100%",
            height: "auto",
            marginBottom: "25px",
          }}
        />

        {/* Título */}
        <h1
          style={{
            fontSize: "44px",
            color: "#111827",
            marginBottom: "15px",
            fontWeight: "700",
          }}
        >
          Bienvenido a KONAX
        </h1>

        {/* Mensajes */}
        <p
          style={{
            color: "#374151",
            fontSize: "22px",
            fontWeight: "500",
            marginBottom: "12px",
          }}
        >
          Tu empresa ha sido configurada correctamente.
        </p>

        <p
          style={{
            color: "#6b7280",
            fontSize: "20px",
            marginBottom: "50px",
          }}
        >
          Tu empresa está lista para comenzar a gestionar clientes,
          créditos y cobranzas con KONAX.
        </p>

        {/* Tarjetas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginBottom: "50px",
          }}
        >
          <div
            style={{
              background: "#f9fafb",
              padding: "25px",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              🏢 Empresa
            </div>

            <div
              style={{
                fontSize: "22px",
                fontWeight: "bold",
              }}
            >
              KONAX
            </div>
          </div>

          <div
            style={{
              background: "#f9fafb",
              padding: "25px",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              📦 Plan Activo
            </div>

            <div
              style={{
                fontSize: "22px",
                fontWeight: "bold",
              }}
            >
              KONAX Gestión
            </div>
          </div>

          <div
            style={{
              background: "#f9fafb",
              padding: "25px",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              👥 Usuarios
            </div>

            <div
              style={{
                fontSize: "22px",
                fontWeight: "bold",
              }}
            >
              2 Registrados
            </div>
          </div>

          <div
            style={{
              background: "#f9fafb",
              padding: "25px",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              🟢 Estado
            </div>

            <div
              style={{
                fontSize: "22px",
                fontWeight: "bold",
                color: "#16a34a",
              }}
            >
              Activo
            </div>
          </div>
        </div>

        {/* Botón */}
        <button
          onClick={() =>
            (window.location.href = "/clientes")
          }
          style={{
            width: "100%",
            background: "#16a34a",
            color: "#ffffff",
            border: "none",
            padding: "22px",
            borderRadius: "14px",
            fontSize: "20px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow:
              "0 6px 16px rgba(22,163,74,0.30)",
          }}
        >
          Ingresar al Sistema
        </button>
      </div>
    </div>
  );
}
