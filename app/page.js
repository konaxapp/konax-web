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
          <h2>Bienvenido a KONAX</h2>
          <p>Sistema de gestión comercial, crédito y cobranza.</p>
        </div>
      </main>
    </div>
  );
}
