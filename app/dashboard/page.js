"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const [modulos, setModulos] = useState(null);
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [planNombre, setPlanNombre] = useState("");
  const [planCodigo, setPlanCodigo] = useState("");
  const [estadoPlan, setEstadoPlan] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [categoriaNegocio, setCategoriaNegocio] = useState("");
  const [usuarioRol, setUsuarioRol] = useState("");
  const [rolId, setRolId] = useState("");
  const [permisosUsuario, setPermisosUsuario] = useState([]);

  useEffect(() => {
    cargarDashboard();
  }, []);

  async function cargarDashboard() {
    const empresaId = localStorage.getItem("empresaId");
    const rolUsuarioLocal =
      localStorage.getItem("usuarioRol") ||
      localStorage.getItem("rolUsuario") ||
      "";
    const rolIdLocal = localStorage.getItem("rolId") || "";

    if (!empresaId) {
      window.location.href = "/login";
      return;
    }

    setUsuarioRol(rolUsuarioLocal);
    setRolId(rolIdLocal);

    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select(
        "nombre, plan_nombre, plan_codigo, estado_plan, estado, tipo_negocio, categoria_negocio"
      )
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      alert("Error cargando empresa: " + errorEmpresa.message);
      return;
    }

    if (!empresa) {
      alert("Empresa no encontrada.");
      window.location.href = "/login";
      return;
    }

    if (empresa.estado === "Suspendido" || empresa.estado_plan === "Suspendido") {
      alert("El servicio de esta empresa está suspendido.");
      localStorage.clear();
      window.location.href = "/login";
      return;
    }

    setEmpresaNombre(empresa.nombre || "Empresa");
    setPlanNombre(empresa.plan_nombre || "Sin plan");
    setPlanCodigo(empresa.plan_codigo || "");
    setEstadoPlan(empresa.estado_plan || "Activo");
    setTipoNegocio(empresa.tipo_negocio || "");
    setCategoriaNegocio(empresa.categoria_negocio || "");

    localStorage.setItem("empresaNombre", empresa.nombre || "Empresa");
    localStorage.setItem("tipoNegocio", empresa.tipo_negocio || "");
    localStorage.setItem("categoriaNegocio", empresa.categoria_negocio || "");

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
    await cargarPermisosUsuario(rolIdLocal, rolUsuarioLocal);
  }

  async function cargarPermisosUsuario(rolIdLocal, rolUsuarioLocal) {
    if (!rolIdLocal) {
      setPermisosUsuario(permisosBasePorRol(rolUsuarioLocal));
      return;
    }

    const { data, error } = await supabase
      .from("roles_permisos_konax")
      .select("permisos_konax(modulo, accion)")
      .eq("rol_id", rolIdLocal);

    if (error || !data || data.length === 0) {
      setPermisosUsuario(permisosBasePorRol(rolUsuarioLocal));
      return;
    }

    const permisos = data
      .map((item) => item.permisos_konax?.modulo)
      .filter(Boolean);

    setPermisosUsuario(permisos);
  }

  function permisosBasePorRol(rol) {
    if (rol === "SuperAdmin" || rol === "Administrador") {
      return [
        "clientes",
        "cuentas_por_cobrar",
        "vista_cliente",
        "ventas_credito",
        "caja",
        "control_caja",
        "cobranza",
        "dashboard_cobros",
        "inventario",
        "inventario_nuevo",
        "suscripciones",
        "recargos",
        "dashboard_ventas",
        "gastos",
        "usuarios",
        "roles",
      ];
    }

    if (rol === "Supervisor") {
      return [
        "clientes",
        "cuentas_por_cobrar",
        "vista_cliente",
        "ventas_credito",
        "caja",
        "control_caja",
        "cobranza",
        "dashboard_cobros",
        "inventario",
        "dashboard_ventas",
        "gastos",
      ];
    }

    if (rol === "Cajero") {
      return ["caja", "control_caja", "vista_cliente"];
    }

    if (rol === "Vendedor") {
      return ["clientes", "vista_cliente", "ventas_credito", "inventario"];
    }

    if (rol === "Cobranza" || rol === "Gestor de Cobranza") {
      return ["vista_cliente", "cobranza", "dashboard_cobros"];
    }

    if (rol === "Inventario") {
      return ["inventario", "inventario_nuevo"];
    }

    return [];
  }

  function tienePermiso(modulo) {
    if (usuarioRol === "SuperAdmin" || usuarioRol === "Administrador") {
      return true;
    }

    return permisosUsuario.includes(modulo);
  }

  function cerrarSesion() {
    localStorage.clear();
    window.location.href = "/login";
  }

  function abrirModulo(ruta) {
    window.location.href = ruta;
  }

  function normalizar(texto) {
    return String(texto || "").toLowerCase().trim();
  }

  function esNegocioMembresia() {
    const tipo = normalizar(tipoNegocio);
    const categoria = normalizar(categoriaNegocio);

    return (
      tipo.includes("gimnasio") ||
      tipo.includes("club") ||
      tipo.includes("academia") ||
      tipo.includes("servicio por membresía") ||
      tipo.includes("membres") ||
      categoria.includes("suscripciones") ||
      categoria.includes("membres")
    );
  }

  function esNegocioVentaCredito() {
    const tipo = normalizar(tipoNegocio);
    const categoria = normalizar(categoriaNegocio);

    return (
      categoria.includes("ventas a crédito") ||
      tipo.includes("mueblería") ||
      tipo.includes("electronica") ||
      tipo.includes("electrónica") ||
      tipo.includes("distribuidora") ||
      tipo.includes("financiera") ||
      tipo.includes("cooperativa") ||
      tipo.includes("empeño")
    );
  }

  function esNegocioComercioInventario() {
    const tipo = normalizar(tipoNegocio);
    const categoria = normalizar(categoriaNegocio);

    return (
      categoria.includes("comercio") ||
      tipo.includes("ferretería") ||
      tipo.includes("ferreteria") ||
      tipo.includes("farmacia") ||
      tipo.includes("tienda") ||
      tipo.includes("mercado") ||
      tipo.includes("repuestos") ||
      tipo.includes("boutique")
    );
  }

  if (!modulos) {
    return (
      <div style={{ padding: "30px" }}>
        Cargando Centro de Operaciones Empresariales...
      </div>
    );
  }

  const esPlanCobros = planCodigo === "cobros";
  const membresia = esNegocioMembresia();
  const ventaCredito = esNegocioVentaCredito();
  const comercioInventario = esNegocioComercioInventario();

  const permitirCredito =
    !membresia &&
    ventaCredito &&
    modulos.venta_credito &&
    tienePermiso("ventas_credito");

  const permitirInventario =
    !membresia &&
    (ventaCredito || comercioInventario) &&
    modulos.inventario &&
    tienePermiso("inventario");

  const permitirNuevoProducto =
    permitirInventario && tienePermiso("inventario_nuevo");

  const permitirCobranza =
    !membresia && modulos.cobranza && tienePermiso("cobranza");

  const permitirDashboardCobros =
    !membresia &&
    modulos.dashboard_cobros &&
    tienePermiso("dashboard_cobros");

  const permitirRecargos =
    !membresia && modulos.recargos && tienePermiso("recargos");

  const permitirSuscripciones =
    (membresia ||
      modulos.suscripciones ||
      categoriaNegocio === "Suscripciones y Membresías") &&
    tienePermiso("suscripciones");

  const tarjetas = [
    {
      nombre: esPlanCobros ? "Cuentas por Cobrar" : "Clientes",
      descripcion: esPlanCobros
        ? "Carga inicial de clientes y cartera existente."
        : "Registro y consulta de clientes.",
      ruta: "/clientes",
      activo:
        modulos.clientes &&
        tienePermiso(esPlanCobros ? "cuentas_por_cobrar" : "clientes"),
      icono: "👥",
    },
    {
      nombre: "Vista Cliente",
      descripcion: "Ficha individual, historial, pagos y gestiones.",
      ruta: "/vista-cliente",
      activo: modulos.vista_cliente && tienePermiso("vista_cliente"),
      icono: "🧾",
    },
    {
      nombre: "Créditos",
      descripcion: "Registro de ventas a crédito con inventario.",
      ruta: "/ventas-credito",
      activo: permitirCredito,
      icono: "💳",
    },
    {
      nombre: "Caja Básica",
      descripcion: "Registro de pagos, abonos y mensualidades.",
      ruta: "/caja",
      activo: modulos.caja && tienePermiso("caja"),
      icono: "💵",
    },
    {
      nombre: "Cobranza",
      descripcion: "Gestión de cobros, promesas y seguimiento.",
      ruta: "/cobranza",
      activo: permitirCobranza,
      icono: "📞",
    },
    {
      nombre: "Centro de Cobranza",
      descripcion: "Indicadores reales de cartera, mora y cobros.",
      ruta: "/dashboard-cobranza",
      activo: permitirDashboardCobros,
      icono: "📊",
    },
    {
      nombre: "Inventario",
      descripcion: "Consulta general de productos, precios y stock.",
      ruta: "/inventario",
      activo: permitirInventario,
      icono: "📦",
    },
    {
      nombre: "Nuevo Producto",
      descripcion: "Registro de productos y carga inicial de inventario.",
      ruta: "/inventario/nuevo",
      activo: permitirNuevoProducto,
      icono: "➕",
    },
    {
  nombre: "Control Caja",
  descripcion: "Cierres, arqueos y control operativo.",
  ruta: "/control-caja",
  activo:
    tienePermiso("control_caja") &&
    (modulos.control_caja || usuarioRol === "Cajero" || usuarioRol === "Supervisor"),
  icono: "🏦",
},
      nombre: "Suscripciones",
      descripcion: "Membresías, renovaciones y vencimientos.",
      ruta: "/suscripciones",
      activo: permitirSuscripciones,
      icono: "🔁",
    },
    {
      nombre: "Recargos",
      descripcion: "Configuración y aplicación de recargos.",
      ruta: "/recargos",
      activo: permitirRecargos,
      icono: "⚠️",
    },
    {
      nombre: "Centro de Ventas",
      descripcion: "Indicadores comerciales y ventas.",
      ruta: "/dashboard-ventas",
      activo:
        !membresia &&
        modulos.dashboard_ventas &&
        tienePermiso("dashboard_ventas"),
      icono: "📈",
    },
    {
      nombre: "Gastos",
      descripcion: "Registro y control de egresos.",
      ruta: "/gastos",
      activo: modulos.egresos && tienePermiso("gastos"),
      icono: "🧮",
    },
    {
      nombre: "Usuarios y Roles",
      descripcion: "Crear usuarios, asignar roles y administrar accesos.",
      ruta: "/usuarios",
      activo: tienePermiso("usuarios"),
      icono: "🔐",
    },
    {
      nombre: "Roles y Permisos",
      descripcion: "Crear roles y definir permisos por módulo.",
      ruta: "/roles",
      activo: tienePermiso("roles"),
      icono: "🛡️",
    },
  ];

  const tarjetasActivas = tarjetas.filter((item) => item.activo);

  return (
    <div style={pagina}>
      <div style={hero}>
        <div style={heroInfo}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div>
            <p style={etiqueta}>Centro de Operaciones Empresariales</p>
            <h1 style={titulo}>{empresaNombre}</h1>

            <p style={plan}>
              Plan activo: <strong>{planNombre}</strong> · Estado:{" "}
              <strong>{estadoPlan}</strong>
              <br />
              Tipo de negocio: <strong>{tipoNegocio || "No definido"}</strong>
              <br />
              Usuario: <strong>{usuarioRol || "Sin rol"}</strong>
            </p>
          </div>
        </div>

        <button onClick={cerrarSesion} style={botonSalir}>
          Cerrar sesión
        </button>
      </div>

      <div style={resumenGrid}>
        <div style={resumenCard}>
          <p style={resumenLabel}>Módulos visibles</p>
          <h2 style={resumenValor}>{tarjetasActivas.length}</h2>
        </div>

        <div style={resumenCard}>
          <p style={resumenLabel}>Plan</p>
          <h2 style={resumenValorTexto}>{planNombre}</h2>
        </div>

        <div style={resumenCard}>
          <p style={resumenLabel}>Rol</p>
          <h2 style={resumenValorTexto}>{usuarioRol || "Sin rol"}</h2>
        </div>
      </div>

      <div style={grid}>
        {tarjetasActivas.map((item) => (
          <div
            key={item.nombre}
            style={
              item.nombre === "Usuarios y Roles" ||
              item.nombre === "Roles y Permisos"
                ? cardDestacado
                : card
            }
            onClick={() => abrirModulo(item.ruta)}
          >
            <div style={icono}>{item.icono}</div>
            <h3 style={cardTitulo}>{item.nombre}</h3>
            <p style={cardTexto}>{item.descripcion}</p>
            <span style={abrir}>Abrir módulo →</span>
          </div>
        ))}
      </div>

      {tarjetasActivas.length === 0 && (
        <div style={sinModulos}>
          Este usuario no tiene módulos permitidos. Revise sus permisos.
        </div>
      )}
    </div>
  );
}

const pagina = {
  padding: "30px",
  background: "#eef2f7",
  minHeight: "100vh",
  fontFamily: "Arial, sans-serif",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "28px",
  borderRadius: "22px",
  marginBottom: "22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const heroInfo = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const logo = {
  width: "85px",
  height: "auto",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "8px",
};

const etiqueta = {
  margin: 0,
  color: "#bbf7d0",
  fontSize: "14px",
  fontWeight: "bold",
};

const titulo = {
  margin: "4px 0",
  fontSize: "36px",
  fontWeight: "bold",
};

const plan = {
  color: "#dcfce7",
  marginTop: "6px",
  fontSize: "15px",
};

const botonSalir = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 18px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const resumenCard = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
};

const resumenLabel = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
};

const resumenValor = {
  margin: "8px 0 0",
  color: "#111827",
  fontSize: "30px",
};

const resumenValorTexto = {
  margin: "8px 0 0",
  color: "#111827",
  fontSize: "22px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))",
  gap: "20px",
};

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "24px",
  color: "#111827",
  background: "#ffffff",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
  cursor: "pointer",
};

const cardDestacado = {
  ...card,
  border: "2px solid #10b981",
  background: "#ecfdf5",
};

const icono = {
  fontSize: "34px",
  marginBottom: "12px",
};

const cardTitulo = {
  margin: 0,
  fontSize: "20px",
};

const cardTexto = {
  color: "#6b7280",
  marginTop: "10px",
  minHeight: "45px",
  lineHeight: "21px",
};

const abrir = {
  display: "inline-block",
  marginTop: "10px",
  color: "#047857",
  fontWeight: "bold",
};

const sinModulos = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "12px",
  color: "#666",
  marginTop: "20px",
};
