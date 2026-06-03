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
        padding: "30px",
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
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={{
            width: "500px",
            maxWidth: "100%",
            height: "auto",
            marginBottom: "40px",
          }}
        />

        <h1
          style={{
            color: "#111827",
            fontSize: "42px",
            marginBottom: "15px",
          }}
        >
          Bienvenido a KONAX
        </h1>

        <p
          style={{
            color: "#6b7280",
            fontSize: "18px",
            marginBottom: "40px",
          }}
        >
          La configuración inicial de tu empresa ha finalizado correctamente.
        </p>

        <div
          style={{
            background: "#f9fafb",
            borderRadius: "16px",
            padding: "35px",
            maxWidth: "700px",
            margin: "0 auto 40px auto",
            textAlign: "left",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ marginBottom: "25px" }}>
            <strong>🏢 Empresa</strong>
            <div>KONAX</div>
          </div>

          <div style={{ marginBottom: "25px" }}>
            <strong>📦 Plan Activo</strong>
            <div>KONAX Gestión</div>
          </div>

          <div style={{ marginBottom: "25px" }}>
            <strong>👥 Usuarios</strong>
            <div>2 registrados</div>
          </div>

          <div>
            <strong>🟢 Estado</strong>
            <div
              style={{
                color: "#16a34a",
                fontWeight: "bold",
              }}
            >
              Activo
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            (window.location.href = "/clientes")
          }
          style={{
            width: "100%",
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "20px",
            borderRadius: "14px",
            fontSize: "20px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Comenzar
        </button>
      </div>
    </div>
  );
}
