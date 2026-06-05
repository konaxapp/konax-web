"use client";

export default function Abonos() {
  const abonos = [
    {
      fecha: "04/06/2026",
      cliente: "Juan Pérez",
      monto: "$50",
      metodo: "Yappy",
      usuario: "Noriel",
      estado: "Aplicado",
    },
    {
      fecha: "03/06/2026",
      cliente: "María Gómez",
      monto: "$85",
      metodo: "Transferencia",
      usuario: "Noriel",
      estado: "Aplicado",
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

        <h1 style={titulo}>Abonos</h1>

        <p style={subtitulo}>
          Registro y control de pagos a créditos
        </p>

        <div style={cardsGrid}>
          <div style={cardKpi}>
            <div style={kpiTitulo}>💰 Cobrado Hoy</div>
            <div style={kpiValor}>$1,250</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>📈 Cobrado Mes</div>
            <div style={kpiValor}>$18,500</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>🧾 Abonos</div>
            <div style={kpiValor}>145</div>
          </div>

          <div style={cardKpi}>
            <div style={kpiTitulo}>🚨 Clientes Mora</div>
            <div style={kpiValor}>25</div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>
            Registrar Abono
          </h2>

          <div style={grid}>
            <input
              placeholder="Cliente"
              style={inputStyle}
            />

            <input
              placeholder="Crédito"
              style={inputStyle}
            />

            <input
              placeholder="Saldo Actual"
              style={inputStyle}
            />

            <input
              placeholder="Monto Abono"
              style={inputStyle}
            />

            <select style={inputStyle}>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Yappy</option>
              <option>Tarjeta</option>
            </select>

            <input
              type="date"
              style={inputStyle}
            />
          </div>

          <textarea
            placeholder="Observación..."
            style={textarea}
          />

          <div style={acciones}>
            <button style={boton}>
              Registrar Abono
            </button>

            <button style={botonGris}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>
            Resumen del Crédito
          </h2>

          <div style={cardsGrid}>
            <div style={cardKpi}>
              <div style={kpiTitulo}>
                Cliente
              </div>

              <div style={kpiValorMini}>
                Juan Pérez
              </div>
            </div>

            <div style={cardKpi}>
              <div style={kpiTitulo}>
                Saldo Actual
              </div>

              <div style={kpiValorMini}>
                $450
              </div>
            </div>

            <div style={cardKpi}>
              <div style={kpiTitulo}>
                Cuota
              </div>

              <div style={kpiValorMini}>
                $50
              </div>
            </div>

            <div style={cardKpi}>
              <div style={kpiTitulo}>
                Próximo Pago
              </div>

              <div style={kpiValorMini}>
                11/06/2026
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>
            Historial de Abonos
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Método</th>
                  <th style={th}>Usuario</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {abonos.map((item, index) => (
                  <tr key={index}>
                    <td style={td}>{item.fecha}</td>
                    <td style={td}>{item.cliente}</td>
                    <td style={td}>{item.monto}</td>
                    <td style={td}>{item.metodo}</td>
                    <td style={td}>{item.usuario}</td>
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

const kpiValorMini = {
  fontSize: "18px",
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

const textarea = {
  width: "100%",
  padding: "12px",
  marginTop: "15px",
  minHeight: "100px",
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
