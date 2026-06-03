export default function LoginPage() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f7fa",
      fontFamily: "Arial"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "white",
        padding: "40px",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        textAlign: "center"
      }}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={{
            width: "220px",
            marginBottom: "30px"
          }}
        />

        <h1>Iniciar sesión</h1>

        <input
          type="email"
          placeholder="Correo electrónico"
          style={{ width: "100%", padding: "14px", marginBottom: "14px" }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          style={{ width: "100%", padding: "14px", marginBottom: "20px" }}
        />

        <button style={{
          width: "100%",
          padding: "14px",
          background: "#16A34A",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold"
        }}>
          Ingresar a KONAX
        </button>

        <p style={{ marginTop: "20px" }}>
          ¿No tienes cuenta? Crear cuenta
        </p>
      </div>
    </main>
  );
}
