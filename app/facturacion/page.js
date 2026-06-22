"use client";

export default function Facturacion() {
  return (
    <div style={pagina}>
      <h1>Facturación</h1>

      <p>
        Pantalla en construcción para controlar pagos, planes, mensualidades y estado de clientes KONAX.
      </p>

      <a href="/admin" style={boton}>
        Volver al Panel Administrador
      </a>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const boton = {
  display: "inline-block",
  marginTop: "20px",
  background: "#111827",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "bold",
};
