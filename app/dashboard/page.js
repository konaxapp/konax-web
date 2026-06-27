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
    const permisosBase = permisosBasePorRol(rolUsuarioLocal);

    if (!rolIdLocal) {
      setPermisosUsuario(permisosBase);
      return;
    }

    const { data, error } = await supabase
      .from("roles_permisos_konax")
      .select("permisos_konax(modulo, accion)")
      .eq("rol_id", rolIdLocal);

    if (error || !data || data.length === 0) {
      setPermisosUsuario(permisosBase);
      return;
    }

    const permisosDB = data
      .map((item) => item.permisos_konax?.modulo)
      .filter(Boolean);

    setPermisosUsuario([...new Set([...permisosBase, ...permisosDB])]);
  }

  function normalizarRol(rol) {
    return String(rol || "").toLowerCase().trim();
  }

  function permisosBasePorRol(rol) {
    const r = normalizarRol(rol);

    if (r === "superadmin" || r === "administrador") {
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

    if (r === "supervisor") {
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
      ];
    }

    if (r === "cajero") return ["vista_cliente", "caja", "control_caja"];

    if (r === "vendedor") {
      return ["clientes", "vista_cliente", "ventas_credito", "inventario", "suscripciones"];
    }

    if (r === "cobranza" || r === "gestor de cobro" || r === "gestor de cobranza") {
      return ["vista_cliente", "cobranza", "dashboard_cobros"];
    }

    if (r === "inventario") return ["inventario", "inventario_nuevo"];

    return [];
  }

  function tienePermiso(modulo) {
    const r = normalizarRol(usuarioRol);

    if (r === "superadmin" || r === "administrador") return true;

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
    return <div style={{ padding: "30px" }}>Cargando KONAX...</div>;
  }

  const esPlanCobros = planCodigo === "cobros";
  const membresia = esNegocioMembresia();
  const ventaCredito = esNegocioVentaCredito();
  const comercioInventario = esNegocioComercioInventario();

  const permitirCredito =
    !membresia && ventaCredito && modulos.venta_credito && tienePermiso("ventas_credito");

  const permitirInventario =
    !membresia &&
    (ventaCredito || comercioInventario) &&
    modulos.inventario &&
    tienePermiso("inventario");

  const permitirNuevoProducto = permitirInventario && tienePermiso("inventario_nuevo");

  const permitirCobranza = !membresia && modulos.cobranza && tienePermiso("cobranza");

  const permitirDashboardCobros =
    !membresia && modulos.dashboard_cobros && tienePermiso("dashboard_cobros");

  const permitirSuscripciones =
    (membresia ||
      modulos.suscripciones ||
      categoriaNegocio === "Suscripciones y Membresías") &&
    tienePermiso("suscripciones");

  const permitirControlCaja =
    tienePermiso("control_caja") &&
    (modulos.control_caja ||
      normalizarRol(usuarioRol) === "cajero" ||
      normalizarRol(usuarioRol) === "supervisor" ||
      normalizarRol(usuarioRol) === "administrador");

  const tarjetas = [
    {
      nombre: esPlanCobros ? "Cuentas por Cobrar" : "Clientes",
      descripcion: esPlanCobros
        ? "Carga inicial de clientes y cartera existente."
        : "Registro y consulta de clientes.",
      ruta: "/clientes",
      activo: modulos.clientes && tienePermiso(esPlanCobros ? "cuentas_por_cobrar" : "clientes"),
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
      descripcion: "Registro de ventas a crédito.",
      ruta: "/ventas-credito",
      activo: permitirCredito,
      icono: "💳",
    },
    {
      nombre: "Caja Básica",
      descripcion: "Pagos, abonos y mensualidades.",
      ruta: "/caja",
      activo: modulos.caja && tienePermiso("caja"),
      icono: "💵",
    },
    {
      nombre: "Cobranza",
      descripcion: "Gestión y seguimiento de cobros.",
      ruta: "/cobranza",
      activo: permitirCobranza,
      icono: "📞",
    },
    {
      nombre: "Centro de Cobranza",
      descripcion: "Indicadores de cartera y mora.",
      ruta: "/dashboard-cobranza",
      activo: permitirDashboardCobros,
      icono: "📊",
    },
    {
      nombre: "Inventario",
      descripcion: "Productos, precios y stock.",
      ruta: "/inventario",
      activo: permitirInventario,
      icono: "📦",
    },
    {
      nombre: "Nuevo Producto",
      descripcion: "Carga inicial de inventario.",
      ruta: "/inventario/nuevo",
      activo: permitirNuevoProducto,
      icono: "➕",
    },
    {
      nombre: "Control Caja",
      descripcion: "Cierres y arqueos.",
      ruta: "/control-caja",
      activo: permitirControlCaja,
      icono: "🏦",
    },
    {
      nombre: "Suscripciones",
      descripcion: "Membresías y renovaciones.",
      ruta: "/suscripciones",
      activo: permitirSuscripciones,
      icono: "🔁",
    },
    {
      nombre: "Recargos",
      descripcion: "Configuración de recargos.",
      ruta: "/recargos",
      activo: !membresia && modulos.recargos && tienePermiso("recargos"),
      icono: "⚠️",
    },
    {
      nombre: "Centro de Ventas",
      descripcion: "Indicadores comerciales.",
      ruta: "/dashboard-ventas",
      activo: !membresia && modulos.dashboard_ventas && tienePermiso("dashboard_ventas"),
      icono: "📈",
    },
    {
      nombre: "Gastos",
      descripcion: "Registro de egresos.",
      ruta: "/gastos",
      activo: modulos.egresos && tienePermiso("gastos"),
      icono: "🧮",
    },
    {
      nombre: "Usuarios y Roles",
      descripcion: "Usuarios y accesos.",
      ruta: "/usuarios",
      activo: tienePermiso("usuarios"),
      icono: "🔐",
    },
    {
      nombre: "Roles y Permisos",
      descripcion: "Permisos por módulo.",
      ruta: "/roles",
      activo: tienePermiso("roles"),
      icono: "🛡️",
    },
  ];

  const tarjetasActivas = tarjetas.filter((item) => item.activo);

  return (
    <div style={layout}>
      <aside style={sidebar}>
        <div style={brandBox}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
          <div>
            <h2 style={brandTitle}>KONAX</h2>
            <p style={brandSub}>Panel Empresarial</p>
          </div>
        </div>

        <div style={empresaBox}>
          <strong>{empresaNombre}</strong>
          <span>{usuarioRol || "Sin rol"}</span>
        </div>

        <nav style={menu}>
          {tarjetasActivas.map((item) => (
            <button
              key={item.nombre}
              onClick={() => abrirModulo(item.ruta)}
              style={menuItem}
            >
              <span style={menuIcono}>{item.icono}</span>
              <span>{item.nombre}</span>
            </button>
          ))}
        </nav>

        <button onClick={cerrarSesion} style={botonSalir}>
          Cerrar sesión
        </button>
      </aside>

      <main style={contenido}>
        <div style={hero}>
          <div>
            <p style={etiqueta}>Centro de Operaciones Empresariales</p>
            <h1 style={titulo}>{empresaNombre}</h1>
            <p style={plan}>
              Plan activo: <strong>{planNombre}</strong> · Estado:{" "}
              <strong>{estadoPlan}</strong>
              <br />
              Tipo de negocio: <strong>{tipoNegocio || "No definido"}</strong>
            </p>
          </div>
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
      </main>
    </div>
  );
}

const layout = {
  display: "flex",
  minHeight: "100vh",
  background: "#eef2f7",
  fontFamily: "Arial, sans-serif",
};

const sidebar = {
  width: "260px",
  background: "linear-gradient(180deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "22px 16px",
  boxSizing: "border-box",
  position: "sticky",
  top: 0,
  height: "100vh",
  overflowY: "auto",
};

const brandBox = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "22px",
};

const logo = {
  width: "58px",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "7px",
};

const brandTitle = {
  margin: 0,
  fontSize: "22px",
};

const brandSub = {
  margin: "4px 0 0",
  color: "#bbf7d0",
  fontSize: "12px",
};

const empresaBox = {
  background: "rgba(255,255,255,0.10)",
  padding: "14px",
  borderRadius: "14px",
  marginBottom: "18px",
  display: "grid",
  gap: "5px",
  fontSize: "14px",
};

const menu = {
  display: "grid",
  gap: "8px",
};

const menuItem = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "12px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
  textAlign: "left",
};

const menuIcono = {
  fontSize: "19px",
};

const botonSalir = {
  width: "100%",
  marginTop: "18px",
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const contenido = {
  flex: 1,
  padding: "30px",
  boxSizing: "border-box",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "28px",
  borderRadius: "22px",
  marginBottom: "22px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
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
