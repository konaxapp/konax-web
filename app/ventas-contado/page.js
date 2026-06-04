"use client";

export default function VentasContado() {
  const ventas = [
    {
      fecha: "04/06/2026",
      cliente: "Juan Pérez",
      vendedor: "Noriel",
      metodo: "Yappy",
      total: "$250",
      estado: "Completada",
    },
    {
      fecha: "04/06/2026",
      cliente: "María Gómez",
      vendedor: "Noriel",
      metodo: "Efectivo",
      total: "$480",
      estado: "Completada",
    },
  ];

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={logoBox}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={logo}
          />
        </div>

        <h1 style={titulo}>
          Ventas Contado
        </h1>

        <p style={subtitulo}>
          Registro y control de ventas al contado
        </p>

        <div style={cardsGrid}>
          <div style={cardKpi}>
            <div style={kpiTitulo}>💰 Ventas Hoy</div>
            <div style={kpiValor}>$1,250</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>📈 Ventas Mes</div>
            <div style={kpiValor}>$18,500</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>🧾 Facturas</div>
            <div style={kpiValor}>45</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>👥 Clientes</div>
            <div style={kpiValor}>32</div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>
            Nueva Venta
          </h2>

          <div style={grid}>
            <input
              placeholder="Cliente"
              style={inputStyle}
            />

            <input
              placeholder="Vendedor"
              style={inputStyle}
            />

            <select style={inputStyle}>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Yappy</option>
              <option>Tarjeta</option>
            </select>

            <input
              placeholder="Producto"
              style={inputStyle}
            />

            <input
              placeholder="Cantidad"
              style={inputStyle}
            />

            <input
              placeholder="Precio"
              style={inputStyle}
            />

            <input
              placeholder="Descuento"
              style={inputStyle}
            />

            <input
              placeholder="Total"
              style={inputStyle}
            />
          </div>

          <div style={acciones}>
            <button style={boton}>
              Guardar Venta
            </button>

            <button style={botonGris}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>
            Historial de Ventas
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Vendedor</th>
                  <th style={th}>Método</th>
                  <th style={th}>Total</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {ventas.map((item, index) => (
                  <tr key={index}>
                    <td style={td}>{item.fecha}</td>
                    <td style={td}>{item.cliente}</td>
                    <td style={td}>{item.vendedor}</td>
                    <td style={td}>{item.metodo}</td>
                    <td style={td}>{item.total}</td>
                    <td style={td}>{item.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "18px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
  margin: "0 auto",
};

const logoBox = {
  textAlign: "center",
  marginBottom: "20px",
};

const logo = {
  width: "110px",
};

const titulo = {
  fontSize: "32px",
  color: "#111827",
  marginBottom: "10px",
};

const subtitulo = {
  color: "#6b7280",
  marginBottom: "20px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginBottom: "20px",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "20px",
  marginBottom: "20px",
};

const cardKpi = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const kpiTitulo = {
  color: "#6b7280",
  marginBottom: "10px",
};

const kpiValor = {
  fontSize: "28px",
  fontWeight: "bold",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: "15px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const acciones = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
};

const boton = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  cursor: "pointer",
};

const botonGris = {
  background: "#6b7280",
  color: "#fff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  cursor: "pointer",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "12px",
  background: "#f9fafb",
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #f3f4f6",
};
