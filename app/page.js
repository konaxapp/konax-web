export default function Home() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Arial" }}>
      
      {/* Menú lateral */}
      <aside
        style={{
          width: "240px",
          background: "#111827",
          color: "white",
          padding: "20px",
        }}
      >
        <h2>KONAX</h2>

        <p>📊 Dashboard</p>
        <p>👥 Clientes</p>
        <p>💳 Créditos</p>
        <p>💵 Cobros</p>
        <p>📄 Reportes</p>
        <p>⚙️ Configuración</p>
      </aside>

      {/* Área principal */}
      <main style={{ flex: 1, background: "#f5f5f5" }}>
        
        {/* Encabezado */}
        <div
          style={{
            background: "white",
            padding: "20px",
            borderBottom: "1px solid #ddd",
          }}
        >
          <h1>Panel principal</h1>
        </div>

        {/* Contenido */}
        <div style={{ padding: "20px" }}>

          {/* Tarjetas */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
              marginBottom: "30px",
            }}
          >

            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <h3>Cartera total</h3>
              <h2>$18,420</h2>
            </div>

            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <h3>Clientes en mora</h3>
              <h2>24</h2>
            </div>

            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <h3>Promesas hoy</h3>
              <h2>6</h2>
            </div>

            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <h3>Pagos del día</h3>
              <h2>$1,250</h2>
            </div>

          </div>

          {/* Bienvenida */}
          <h2>Bienvenido a KONAX</h2>
          <p>Sistema de gestión comercial, crédito y cobranza.</p>

        </div>
      </main>
    </div>
  );
}
