"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const [modulos, setModulos] = useState(null);
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [planNombre, setPlanNombre] = useState("");
  const [planCodigo, setPlanCodigo] = useState("");

  useEffect(() => {
    cargarDashboard();
  }, []);

  async function cargarDashboard() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      window.location.href = "/login";
      return;
    }

    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("nombre, plan_nombre, plan_codigo, estado_plan")
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      alert("Error cargando empresa: " + errorEmpresa.message);
      return;
    }

    setEmpresaNombre(
      empresa?.nombre || localStorage.getItem("empresaNombre") || "Empresa"
    );

    setPlanNombre(empresa?.plan_nombre || "Sin plan");
    setPlanCodigo(empresa?.plan_codigo || "");

    const { data: modulosData, error: errorModulos } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (errorModulos) {
      alert("Error cargando módulos: " + errorModulos.message);
      return;
    }

    if (!modulosData) {
      alert("Esta empresa no tiene módulos asignados.");
      return;
    }

    setModulos(modulosData);
  }

  function cerrarSesion() {
    localStorage.removeItem("empresaId");
    localStorage.removeItem("empresaNombre");
    localStorage.removeItem("usuarioId");
    localStorage.removeItem("usuarioNombre");
    localStorage.removeItem("usuarioCorreo");
    localStorage.removeItem("usuarioRol");

    window.location.href = "/login";
  }

  function abrirModulo(ruta) {
    window.location.href = ruta;
  }

  if (!modulos) {
    return <div style={{ padding: "30px" }}>Cargando Dashboard...</div>;
  }

  const esPlanCobros = planCodigo === "cobros";

  const tarjetas = [
    {
      nombre: esPlanCobros ? "Cuentas por Cobrar" : "Clientes",
      descripcion: esPlanCobros
        ? "Carga inicial de clientes y cartera existente."
        : "Registro y consulta de clientes.",
      ruta: "/clientes",
      activo: modulos.clientes,
    },
    {
      nombre: "Vista Cliente",
      descripcion: "Ficha individual, historial y datos del cliente.",
      ruta: "/vista-cliente",
      activo: modulos.vista_cliente,
    },
    {
      nombre: "Créditos",
      descripcion: "Registro y control de ventas o créditos otorgados.",
      ruta: "/ventas-credito",
      activo: !esPlanCobros && modulos.venta_credito,
    },
    {
      nombre: "Caja Básica",
      descripcion: "Registro básico de pagos y abonos.",
      ruta: "/caja",
      activo: modulos.caja,
    },
    {
      nombre: "Cobranza",
      descripcion: "Gestión de cobros, promesas e historial de seguimiento.",
      ruta: "/cobranza",
      activo: modulos.cobranza,
    },
    {
      nombre: "Dashboard de Cobranza",
      descripcion: "Indicadores de cartera, mora, cobros y gestores.",
      ruta: "/dashboard-cobranza",
      activo: modulos.dashboard_cobros,
    },
    {
      nombre: "Inventario",
      descripcion: "Productos, stock y movimientos de inventario.",
      ruta: "/inventario",
      activo: modulos.inventario,
    },
    {
      nombre: "Control Caja",
      descripcion: "Cierres, arqueos y control operativo de caja.",
      ruta: "/control-caja",
      activo: modulos.control_caja,
    },
    {
      nombre: "Suscripciones",
      descripcion: "Membresías, vencimientos y renovaciones.",
      ruta: "/suscripciones",
      activo: modulos.suscripciones,
    },
    {
      nombre: "Recargos",
      descripcion: "Configuración y aplicación de recargos.",
      ruta: "/recargos",
      activo: modulos.recargos,
    },
    {
      nombre: "Dashboard Ventas",
      descripcion: "Indicadores comerciales y ventas.",
      ruta: "/dashboard-ventas",
      activo: modulos.dashboard_ventas,
    },
    {
      nombre: "Gastos",
      descripcion: "Registro y control de gastos del negocio.",
      ruta: "/gastos",
      activo: modulos.egresos,
    },
  ];

  const tarjetasActivas = tarjetas.filter((item) => item.activo);

  return (
    <div style={pagina}>
      <div style={encabezado}>
        <div>
          <h1 style={titulo}>{empresaNombre}</h1>

          <p style={subtitulo}>Panel de trabajo</p>

          <p style={plan}>
            Plan activo: <strong>{planNombre}</strong>
          </p>
        </div>

        <button onClick={cerrarSesion} style={botonSalir}>
          Cerrar sesión
        </button>
      </div>

      <div style={grid}>
        {tarjetasActivas.map((item) => (
          <div
            key={item.nombre}
            style={card}
            onClick={() => abrirModulo(item.ruta)}
          >
            <h3 style={cardTitulo}>{item.nombre}</h3>
            <p style={cardTexto}>{item.descripcion}</p>
            <span style={abrir}>Abrir módulo →</span>
          </div>
        ))}
      </div>

      {tarjetasActivas.length === 0 && (
        <div style={sinModulos}>Esta empresa no tiene módulos activos.</div>
      )}
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
  fontSize: "34px",
  fontWeight: "bold",
};

const subtitulo = {
  color: "#6b7280",
  marginTop: "8px",
  marginBottom: "4px",
  fontSize: "16px",
};

const plan = {
  color: "#2563eb",
  marginTop: "4px",
  fontSize: "15px",
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
  cursor: "pointer",
};

const cardTitulo = {
  margin: 0,
};

const cardTexto = {
  color: "#666",
  marginTop: "10px",
  minHeight: "42px",
};

const abrir = {
  display: "inline-block",
  marginTop: "10px",
  color: "#2563eb",
  fontWeight: "bold",
};

const sinModulos = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  color: "#666",
  marginTop: "20px",
};
