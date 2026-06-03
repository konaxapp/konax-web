"use client";

export default function Usuarios() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "30px",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1>Usuarios</h1>
            <p style={{ color: "#666" }}>
              Administración de usuarios del negocio
            </p>
          </div>

          <button
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            + Nuevo Usuario
          </button>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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
                <th style={{ padding: "15px", textAlign: "left" }}>
                  Nombre
                </th>

                <th style={{ padding: "15px", textAlign: "left" }}>
                  Correo
                </th>

                <th style={{ padding: "15px", textAlign: "left" }}>
                  Rol
                </th>

                <th style={{ padding: "15px", textAlign: "left" }}>
                  Estado
                </th>

                <th style={{ padding: "15px", textAlign: "left" }}>
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td style={{ padding: "15px" }}>
                  Usuario Principal
                </td>

                <td style={{ padding: "15px" }}>
                  admin@empresa.com
                </td>

                <td style={{ padding: "15px" }}>
                  Dueño
                </td>

                <td
                  style={{
                    padding: "15px",
                    color: "#16a34a",
                    fontWeight: "bold",
                  }}
                >
                  🟢 Activo
                </td>

                <td style={{ padding: "15px" }}>
                  ⚙️
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: "25px",
            background: "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h3>Estados de Usuario</h3>

          <p>🟢 Activo - Puede ingresar al sistema.</p>

          <p>🟡 Suspendido - Vacaciones o ausencia temporal.</p>

          <p>🔴 Inactivo - Ya no opera en la empresa.</p>

          <p>⚫ Eliminado - Conserva historial pero sin acceso.</p>
        </div>
      </div>
    </div>
  );
}
