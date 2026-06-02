export default function Empresas() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "700px",
          background: "#fff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ textAlign: "center" }}>
          KONAX
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Configuración Inicial de Empresa
        </p>

        <div style={{ marginBottom: "15px" }}>
          <label>Nombre de la empresa</label>
          <input
            type="text"
            placeholder="Ej. Mueblería Central"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Teléfono</label>
          <input
            type="text"
            placeholder="6000-0000"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Correo</label>
          <input
            type="email"
            placeholder="info@empresa.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Dirección</label>
          <input
            type="text"
            placeholder="Dirección del negocio"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Tipo de negocio</label>
          <select style={inputStyle}>
            <option>Mueblería</option>
            <option>Financiera</option>
            <option>Ferretería</option>
            <option>Electrónica</option>
            <option>Supermercado</option>
            <option>Otro</option>
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Plan contratado</label>
          <select style={inputStyle}>
            <option>Cobros</option>
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Tipo de recargo</label>
          <select style={inputStyle}>
            <option>Mensual</option>
            <option>Por vencimiento</option>
          </select>
        </div>

        <div style={{ marginBottom: "25px" }}>
          <label>Porcentaje de recargo</label>
          <input
            type="number"
            placeholder="5"
            style={inputStyle}
          />
        </div>

        <button
          style={{
            width: "100%",
            padding: "14px",
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Guardar Empresa
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "5px",
  borderRadius: "8px",
  border: "1px solid #ccc",
};
