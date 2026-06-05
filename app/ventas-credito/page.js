"use client";

export default function VentasCredito() {

  const creditos = [
    {
      fecha: "04/06/2026",
      cliente: "Juan Pérez",
      producto: "Televisor 55",
      saldo: "$500",
      cuota: "$50",
      proximoPago: "11/06/2026",
      estado: "Activo",
    },
    {
      fecha: "03/06/2026",
      cliente: "María Gómez",
      producto: "Nevera",
      saldo: "$850",
      cuota: "$85",
      proximoPago: "10/06/2026",
      estado: "Activo",
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
          Ventas Crédito
        </h1>

        <p style={subtitulo}>
          Registro y administración de créditos
        </p>

        <div style={cardsGrid}>
          <div style={cardKpi}>
            <div style={kpiTitulo}>📄 Créditos Activos</div>
            <div style={kpiValor}>85</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>📈 Créditos Mes</div>
            <div style={kpiValor}>18</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>💰 Cartera Activa</div>
            <div style={kpiValor}>$350,000</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>🚨 Clientes Mora</div>
            <div style={kpiValor}>25</div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>
            Nuevo Crédito
          </h2>

          <div style={grid}>
            <input placeholder="Cliente" style={inputStyle} />
            <input placeholder="Vendedor" style={inputStyle} />
            <input placeholder="Producto" style={inputStyle} />
            <input placeholder="Precio Venta" style={inputStyle} />
            <input placeholder="Inicial" style={inputStyle} />
            <input placeholder="Monto Financiar" style={inputStyle} />
            <input placeholder="Plazo" style={inputStyle} />

            <select style={inputStyle}>
              <option>Semanal</option>
              <option>Quincenal</option>
              <option>Mensual</option>
            </select>

            <input placeholder="Cuota" style={inputStyle} />
            <input type="date" style={inputStyle} />
          </div>

          <div style={acciones}>
            <button style={boton}>
              Crear Crédito
            </button>

            <button style={botonGris}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>
            Historial de Créditos
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Producto</th>
                  <th style={th}>Saldo</th>
                  <th style={th}>Cuota</th>
                  <th style={th}>Próximo Pago</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {creditos.map((item, index) => (
                  <tr key={index}>
                    <td style={td}>{item.fecha}</td>
                    <td style={td}>{item.cliente}</td>
                    <td style={td}>{item.producto}</td>
                    <td style={td}>{item.saldo}</td>
                    <td style={td}>{item.cuota}</td>
                    <td style={td}>{item.proximoPago}</td>
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
  background: "#fff",
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
  background: "#fff",
  padding: "18px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const kpiTitulo = {
  color: "#6b7280",
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
