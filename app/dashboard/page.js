"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const [modulos, setModulos] = useState(null);
  const [empresaNombre, setEmpresaNombre] = useState("");

  useEffect(() => {
    cargarModulos();
  }, []);

  async function cargarModulos() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      window.location.href = "/login";
      return;
    }

    setEmpresaNombre(localStorage.getItem("empresaNombre") || "Empresa");

    const { data, error } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (error) {
      alert("Error cargando módulos: " + error.message);
      return;
    }

    if (!data) {
      alert("Esta empresa no tiene módulos asignados.");
      return;
    }

    setModulos(data);
  }

  if (!modulos) {
    return <div style={{ padding: "30px" }}>Cargando Dashboard...</div>;
  }

  const tarjetas = [
    { nombre: "Clientes", ruta: "/clientes", activo: modulos.clientes },
    { nombre: "Vista Cliente", ruta: "/vista-cliente", activo: modulos.vista_cliente },
    { nombre: "Caja", ruta: "/caja", activo: modulos.caja },
    { nombre: "Control Caja", ruta: "/control-caja", activo: modulos.control_caja },
    { nombre: "Cobranza", ruta: "/cartera", activo: modulos.cobranza },
    { nombre: "Inventario", ruta: "/inventario", activo: modulos.inventario },
    { nombre: "Venta Crédito", ruta: "/ventas-credito", activo: modulos.venta_credito },
    { nombre: "Suscripciones", ruta: "/suscripciones", activo: modulos.suscripciones },
    { nombre: "Recargos", ruta: "/recargos", activo: modulos.recargos },
    { nombre: "Dashboard Ventas", ruta: "/dashboard-ventas", activo: modulos.dashboard_ventas },
    { nombre: "Dashboard Cobros", ruta: "/dashboard-cobranza", activo: modulos.dashboard_cobros },
    { nombre: "Gastos", ruta: "/gastos", activo: modulos.egresos },
  ];

  function cerrarSesion() {
    localStorage.clear();
    window.location.href = "/login";
  }

  return (
    <div style={pagina}>
      <div style={encabezado}>
        <div>
          <h1 style={titulo}>Centro de Operaciones KONAX</h1>
          <p style={subtitulo}>
            Negocio actual: <strong>{empresaNombre}</strong>
          </p>
        </div>

        <button onClick={cerrarSesion} style={botonSalir}>
          Cerrar sesión
        </button>
      </div>

      <div style={grid}>
        {tarjetas
          .filter((item) => item.activo)
          .map((item) => (
            <a key={item.nombre} href={item.ruta} style={card}>
              <h3 style={cardTitulo}>{item.nombre}</h3>
              <p style={cardTexto}>Abrir módulo</p>
            </a>
          ))}
      </div>
    </div>
  );
}

const pagina = {
  padding: "30px",
  background: "#f5f6fa",
  minHeight: "100vh",
  fontFamily: "Arial, sans-serif",
};

const encabezado = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "30px",
  gap: "20px",
};

const titulo = {
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  color: "#666",
  marginTop: "8px",
};

const botonSalir = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))",
  gap: "20px",
};

const card = {
  border: "1px solid #ddd",
  borderRadius: "14px",
  padding: "22px",
  textDecoration: "none",
  color: "#111",
  background: "#fff",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const cardTitulo = {
  margin: 0,
};

const cardTexto = {
  color: "#666",
  marginTop: "10px",
};
