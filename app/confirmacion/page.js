"use client";

export default function Confirmacion() {
  const continuar = () => {
    window.location.href = "/usuarios";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial",
        padding: "30px",
      }}
    >
      <div
        style={{
          width: "700px",
          background: "white",
          borderRadius: "20px",
          padding: "50px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
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
          Empresa creada correctamente
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Tu empresa ya está lista para comenzar a utilizar KONAX.
        </p>

        <div
          style={{
            background: "#f9fafb",
            padding: "25px",
            borderRadius: "12px",
            textAlign: "left",
            marginBottom: "30px",
          }}
        >
          <p>
            <strong>Empresa:</strong> Empresa Demo
          </p>

          <p>
            <strong>Plan seleccionado:</strong> KONAX Gestión
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
          onClick={continuar}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "15px 40px",
            borderRadius: "10px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
