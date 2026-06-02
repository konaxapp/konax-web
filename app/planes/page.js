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

        {/* Opciones de facturación */}
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
            Trimestral (-10%)
          </button>

          <button
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: "white",
            }}
          >
            Anual (-20%)
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

            <h1>$0</h1>

            <p style={{ color: "#666" }}>
              Especializado en cartera y cobranza.
            </p>

            <ul>
              <li>Clientes</li>
              <li>Créditos</li>
              <li>Pagos</li>
              <li>Gestores</li>
              <li>Promesas de pago</li>
              <li>Dashboard de cobranza</li>
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
            }}
          >
            <h2>KONAX Gestión</h2>

            <h1>$0</h1>

            <p style={{ color: "#666" }}>
              Ventas + Cobranza + Administración.
            </p>

            <ul>
              <li>Todo lo de KONAX Cobros</li>
              <li>Ventas</li>
              <li>Caja</li>
              <li>Usuarios y Roles</li>
              <li>Reportes operativos</li>
              <li>Administración del negocio</li>
            </ul>

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

          {/* KONAX PRO */}
          <div
            style={{
              flex: 1,
              border: "2px solid #111827",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <h2>KONAX Pro</h2>

            <h1>$0</h1>

            <p style={{ color: "#666" }}>
              Solución empresarial avanzada.
            </p>

            <ul>
              <li>Todo lo de KONAX Gestión</li>
              <li>Indicadores gerenciales</li>
              <li>Reportes avanzados</li>
              <li>Multiempresa</li>
              <li>Permisos avanzados</li>
              <li>Integraciones futuras</li>
              <li>WhatsApp y automatizaciones</li>
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
