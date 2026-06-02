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

        {/* Tipo de facturación */}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            marginBottom: "40px",
          }}
        >
          <button
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#2563eb",
              color: "white",
              fontWeight: "bold",
            }}
          >
            Mensual
          </button>

          <button
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: "white",
            }}
          >
            Anual
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
          }}
        >
          {/* KONAX COBROS */}

          <div
            style={{
              flex: 1,
              border: "2px solid #2563eb",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <h2>KONAX Cobros</h2>

            <h1>$29</h1>

            <p style={{ color: "#666" }}>
              Control de clientes, créditos,
              pagos, gestores y promesas de pago.
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

          {/* KONAX GESTIÓN */}

          <div
            style={{
              flex: 1,
              border: "2px solid #10b981",
              borderRadius: "12px",
              padding: "25px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-12px",
                right: "15px",
                background: "#10b981",
                color: "white",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              MÁS POPULAR
            </div>

            <h2>KONAX Gestión</h2>

            <h1>$59</h1>

            <p style={{ color: "#666" }}>
              Todo lo de Cobros más ventas,
              caja, usuarios y administración.
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

          {/* KONAX EMPRESARIAL */}

          <div
            style={{
              flex: 1,
              border: "2px solid #111827",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <h2>KONAX Empresarial</h2>

            <h1>$99</h1>

            <p style={{ color: "#666" }}>
              Gestión avanzada con indicadores,
              reportes ejecutivos, multiempresa
              e integraciones.
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

        <div
          style={{
            textAlign: "center",
            marginTop: "30px",
            color: "#666",
            fontSize: "14px",
          }}
        >
          Precios mensuales mostrados. Planes anuales:
          Cobros $299 · Gestión $595 · Empresarial $990
        </div>
      </div>
    </div>
  );
}
