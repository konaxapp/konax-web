export default function Planes() {
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
          maxWidth: "900px",
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

        <div
          style={{
            display: "flex",
            gap: "20px",
          }}
        >
          {/* Plan Básico */}
          <div
            style={{
              flex: 1,
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <h2>Plan Básico</h2>

            <h1>$0</h1>

            <ul>
              <li>Clientes</li>
              <li>Créditos</li>
              <li>Pagos</li>
              <li>Dashboard básico</li>
            </ul>

            <button
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                background: "#2563eb",
                color: "white",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Seleccionar
            </button>
          </div>

          {/* Plan Pro */}
          <div
            style={{
              flex: 1,
              border: "2px solid #2563eb",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <h2>Plan PRO</h2>

            <h1>$0</h1>

            <ul>
              <li>Todo lo del Básico</li>
              <li>Multiempresa</li>
              <li>Gestores</li>
              <li>Promesas de pago</li>
              <li>Reportes avanzados</li>
              <li>Roles y permisos</li>
            </ul>

            <button
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                background: "#111827",
                color: "white",
                borderRadius: "8px",
                cursor: "pointer",
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
