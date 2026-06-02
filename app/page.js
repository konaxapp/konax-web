export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        fontFamily: "Arial",
        padding: "30px",
      }}
    >
      {/* Encabezado */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ margin: 0 }}>
          KONAX • Empresas
        </h1>

        <p
          style={{
            color: "#666",
            marginTop: "10px",
          }}
        >
          Fase 1 • Gestión Multiempresa
        </p>
      </div>

      {/* Botón */}
      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <button
          style={{
            background: "#0f172a",
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "14px 22px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          + Crear empresa
        </button>
      </div>

      {/* Tabla */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          padding: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                borderBottom: "1px solid #ddd",
              }}
            >
              <th>Empresa</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Plan</th>
              <th>Tipo Recargo</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Mueblería Central</td>
              <td>6000-0000</td>
              <td>info@muebleria.com</td>
              <td>Premium</td>
              <td>Mensual</td>
              <td>Activo</td>
            </tr>

            <tr>
              <td>Electro Hogar</td>
              <td>6123-4567</td>
              <td>ventas@electro.com</td>
              <td>Básico</td>
              <td>Vencimiento</td>
              <td>Activo</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
