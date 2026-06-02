export default function EmpresasPage() {
  return (
    <main
      style={{
        padding: "30px",
        fontFamily: "Arial, sans-serif",
        background: "#f7f7f7",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: "28px",
          marginBottom: "20px",
        }}
      >
        Empresas - KONAX
      </h1>

      <div
        style={{
          background: "#ffffff",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <h2>Empresa principal</h2>

        <p>Nombre: KONAX DEMO</p>

        <p>Teléfono: +507</p>

        <p>Correo: admin@konax.app</p>

        <p>Plan: Premium</p>

        <p>Estado: Activo</p>
      </div>
    </main>
  );
}
