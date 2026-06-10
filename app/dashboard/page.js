"use client";

export default function Dashboard() {
  const modulos = {
    clientes: true,
    caja: true,
    control_caja: true,
    vista_cliente: true,
    cobranza: true,
    inventario: true,
    venta_credito: true,
    suscripciones: false,
    recargos: false,
    dashboard_ventas: false,
    dashboard_cobros: false,
    egresos: false,
  };

  const tarjetas = [
    {
      nombre: "Clientes",
      ruta: "/clientes",
      activo: modulos.clientes,
    },
    {
      nombre: "Caja",
      ruta: "/caja",
      activo: modulos.caja,
    },
    {
      nombre: "Control Caja",
      ruta: "/control-caja",
      activo: modulos.control_caja,
    },
    {
      nombre: "Cobranza",
      ruta: "/dashboard-cobranza",
      activo: modulos.cobranza,
    },
    {
      nombre: "Dashboard Financiero",
      ruta: "/dashboard-financiero",
      activo: true,
    },
  ];

  return (
    <div style={{ padding: "30px" }}>
      <h1>Dashboard Principal</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(250px,1fr))",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        {tarjetas
          .filter((x) => x.activo)
          .map((item) => (
            <a
              key={item.nombre}
              href={item.ruta}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "20px",
                textDecoration: "none",
                color: "#000",
                background: "#fff",
              }}
            >
              <h3>{item.nombre}</h3>
            </a>
          ))}
      </div>
    </div>
  );
}
