export default function Home() {
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

      {/* Área principal */}
      <main
        style={{
          flex: 1,
          background: "#f5f5f5",
          padding: "30px",
        }}
      >
        {/* Encabezado */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
              }}
            >
              Empresas
            </h1>

            <p
              style={{
                color: "#666",
                marginTop: "8px",
              }}
            >
              Administración multiempresa de KONAX
            </p>
          </div>

          <button
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "12px 18px",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            + Nueva empresa
          </button>
        </div>

        {/* Tabla */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead
              style={{
                background: "#f9fafb",
              }}
            >
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "16px",
                  }}
                >
                  Empresa
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "16px",
                  }}
                >
                  Teléfono
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "16px",
                  }}
                >
                  Correo
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "16px",
                  }}
                >
                  Plan
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "16px",
                  }}
                >
                  Tipo recargo
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "16px",
                  }}
                >
                  Estado
                </th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td style={{ padding: "16px" }}>
                  Mueblería Central
                </td>

                <td style={{ padding: "16px" }}>
                  6000-0000
                </td>

                <td style={{ padding: "16px" }}>
                  ventas@muebleria.com
                </td>

                <td style={{ padding: "16px" }}>
                  Premium
                </td>

                <td style={{ padding: "16px" }}>
                  Vencimiento mensual
                </td>

                <td
                  style={{
                    padding: "16px",
                    color: "green",
                    fontWeight: "bold",
                  }}
                >
                  Activa
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
