"use client";

export default function Empresas() {
  const irAPlanes = () => {
    window.location.href = "/planes";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial",
        padding: "30px",
      }}
    >
      <div
        style={{
          background: "white",
          width: "700px",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            marginBottom: "10px",
            textAlign: "center",
          }}
        >
          KONAX
        </h1>

        <h2
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "40px",
          }}
        >
          Configuración de Empresa
        </h2>

        <div style={{ marginBottom: "20px" }}>
          <label>Nombre de la Empresa</label>
          <input
            type="text"
            placeholder="Ej. Mueblería Central"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Teléfono</label>
          <input
            type="text"
            placeholder="Ej. 6000-0000"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Correo de la Empresa</label>
          <input
            type="email"
            placeholder="empresa@correo.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Dirección</label>
          <input
            type="text"
            placeholder="Dirección del negocio"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Tipo de Negocio</label>
          <select style={inputStyle}>
            <option>Mueblería</option>
            <option>Financiera</option>
            <option>Electrónica</option>
            <option>Supermercado</option>
            <option>Ferretería</option>
            <option>Distribuidora</option>
            <option>Otro</option>
          </select>
        </div>

        <div style={{ marginBottom: "30px" }}>
          <label>Tipo de Recargo</label>
          <select style={inputStyle}>
            <option>Sin recargo</option>
            <option>Mensual</option>
            <option>Semanal</option>
            <option>Diario</option>
            <option>Personalizado</option>
          </select>
        </div>

        <button
          onClick={irAPlanes}
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
          }}
        >
          Guardar Configuración
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
