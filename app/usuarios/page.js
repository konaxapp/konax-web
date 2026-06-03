"use client";

export default function Usuarios() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: "900px",
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
          Configura tu equipo de trabajo
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "40px",
          }}
        >
          Agrega los usuarios que utilizarán KONAX
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label>Nombre</label>
          <input
            type="text"
            placeholder="Nombre completo"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Correo Electrónico</label>
          <input
            type="email"
            placeholder="correo@empresa.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "25px" }}>
          <label>Rol</label>
          <select style={inputStyle}>
            <option>Administrador</option>
            <option>Supervisor</option>
            <option>Gestor</option>
            <option>Caja</option>
            <option>Vendedor</option>
          </select>
        </div>

        <button
          style={{
            width: "100%",
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "15px",
            borderRadius: "10px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "40px",
          }}
        >
          Guardar Usuario
        </button>

        <h2
          style={{
            marginBottom: "20px",
          }}
        >
          Usuarios agregados
        </h2>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "25px",
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
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>Correo</th>
                <th style={thStyle}>Rol</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td style={tdStyle}>Katherine</td>
                <td style={tdStyle}>correo@empresa.com</td>
                <td style={tdStyle}>Administrador</td>
              </tr>

              <tr>
                <td style={tdStyle}>Noriel</td>
                <td style={tdStyle}>correo@empresa.com</td>
                <td style={tdStyle}>Supervisor</td>
              </tr>
            </tbody>
          </table>
        </div>

        <button
          style={{
            width: "100%",
            background: "#ffffff",
            color: "#2563eb",
            border: "1px solid #2563eb",
            padding: "14px",
            borderRadius: "10px",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          + Agregar otro usuario
        </button>

        <button
          onClick={() =>
            (window.location.href = "/finalizar")
          }
          style={{
            width: "100%",
            background: "#16a34a",
            color: "white",
            border: "none",
            padding: "16px",
            borderRadius: "10px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Finalizar Configuración
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "8px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
};

const thStyle = {
  textAlign: "left",
  padding: "15px",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "15px",
  borderBottom: "1px solid #f3f4f6",
};
