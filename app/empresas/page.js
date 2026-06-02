export default function Empresas() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "Arial",
      }}
    >
      {/* Menú lateral */}
      <aside
        style={{
          width: "240px",
          background: "#111827",
          color: "white",
          padding: "20px",
        }}
      >
        <h2 style={{ marginBottom: "30px" }}>
          KONAX
        </h2>

        <p
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            background: "#1f2937",
            padding: "12px",
            borderRadius: "8px",
          }}
        >
          🏢 Empresas
        </p>
      </aside>

      {/* Contenido */}
      <main
        style={{
          flex: 1,
          background: "#f5f5f5",
          padding: "30px",
        }}
      >
        <h1>Empresas</h1>

        <p
          style={{
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Administración multiempresa de KONAX
        </p>

        <div
          style={{
            background: "white",
            padding: "50px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h2>No hay empresas registradas</h2>

          <p
            style={{
              color: "#666",
              marginBottom: "25px",
            }}
          >
            Crea tu primera empresa para comenzar a utilizar KONAX.
          </p>

          <button
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "14px 24px",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            + Nueva Empresa
          </button>
        </div>

        {/* Vista previa del formulario */}
        <div
          style={{
            marginTop: "30px",
            background: "white",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h2>Configuración de Empresa</h2>

          <div style={{ marginBottom: "15px" }}>
            <label>Nombre de la Empresa</label>
            <input
              type="text"
              placeholder="Ej. Mueblería López"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "5px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Teléfono</label>
            <input
              type="text"
              placeholder="6000-0000"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "5px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Correo</label>
            <input
              type="email"
              placeholder="empresa@correo.com"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "5px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Dirección</label>
            <input
              type="text"
              placeholder="Dirección de la empresa"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "5px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Tipo de Negocio</label>
            <select
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "5px",
              }}
            >
              <option>Mueblería</option>
              <option>Financiera</option>
              <option>Electrónica</option>
              <option>Supermercado</option>
              <option>Tienda</option>
              <option>Otro</option>
            </select>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label>Plan Contratado</label>
            <select
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "5px",
              }}
            >
              <option>Básico</option>
              <option>Profesional</option>
              <option>Empresarial</option>
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>Tipo de Recargo</label>
            <select
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "5px",
              }}
            >
              <option>Sin recargo</option>
              <option>Diario</option>
              <option>Semanal</option>
              <option>Quincenal</option>
              <option>Mensual</option>
              <option>Personalizado</option>
            </select>
          </div>

          <button
            style={{
              background: "#16a34a",
              color: "white",
              border: "none",
              padding: "14px 24px",
              borderRadius: "10px",
              fontWeight: "bold",
            }}
          >
            Guardar Empresa
          </button>
        </div>
      </main>
    </div>
  );
}
