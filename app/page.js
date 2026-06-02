export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: "500px",
          background: "#fff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          KONAX
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Registro de Empresa
        </p>

        <div style={{ marginBottom: "15px" }}>
          <label>Nombre de la Empresa</label>
          <input
            type="text"
            placeholder="Ej. Financiera López"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "5px",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Nombre del Administrador</label>
          <input
            type="text"
            placeholder="Ej. Juan Pérez"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "5px",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Correo Electrónico</label>
          <input
            type="email"
            placeholder="correo@empresa.com"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "5px",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Contraseña</label>
          <input
            type="password"
            placeholder="********"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "5px",
            }}
          />
        </div>

        <div style={{ marginBottom: "25px" }}>
          <label>Confirmar Contraseña</label>
          <input
            type="password"
            placeholder="********"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "5px",
            }}
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
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Crear Cuenta
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
          }}
        >
          ¿Ya tienes cuenta? Iniciar sesión
        </p>
      </div>
    </div>
  );
}
