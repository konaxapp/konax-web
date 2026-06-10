"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const [modulos, setModulos] = useState(null);

  useEffect(() => {
    cargarModulos();
  }, []);

  async function cargarModulos() {
    const { data, error } = await supabase
      .from("empresa_modulos")
      .select("*")
      .limit(1);

    if (error) {
      console.log(error);
      return;
    }

    setModulos(data?.[0]);
  }

  if (!modulos) {
    return <div>Cargando Dashboard...</div>;
  }

  const tarjetas = [
    {
      nombre: "Clientes",
      ruta: "/clientes",
      activo: modulos.clientes,
    },
    {
      nombre: "Vista Cliente",
      ruta: "/vista-cliente",
      activo: modulos.vista_cliente,
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
      ruta: "/cartera",
      activo: modulos.cobranza,
    },
    {
      nombre: "Inventario",
      ruta: "/inventario",
      activo: modulos.inventario,
    },
    {
      nombre: "Venta Crédito",
      ruta: "/ventas-credito",
      activo: modulos.venta_credito,
    },
    {
      nombre: "Suscripciones",
      ruta: "/suscripciones",
      activo: modulos.suscripciones,
    },
    {
      nombre: "Recargos",
      ruta: "/recargos",
      activo: modulos.recargos,
    },
    {
      nombre: "Dashboard Ventas",
      ruta: "/dashboard-ventas",
      activo: modulos.dashboard_ventas,
    },
    {
      nombre: "Dashboard Cobros",
      ruta: "/dashboard-cobranza",
      activo: modulos.dashboard_cobros,
    },
    {
      nombre: "Egresos",
      ruta: "/egresos",
      activo: modulos.egresos,
    },
  ];

  return (
    <div style={{ padding: "30px" }}>
      <h1>Centro de Operaciones KONAX</h1>

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
                borderRadius: "12px",
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
