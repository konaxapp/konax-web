"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const [modulos, setModulos] = useState({});
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [planNombre, setPlanNombre] = useState("");
  const [estadoPlan, setEstadoPlan] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [usuarioRol, setUsuarioRol] = useState("");
  const [permisosUsuario, setPermisosUsuario] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDashboard();
  }, []);

  async function cargarDashboard() {
    const empresaId =
      localStorage.getItem("empresaId") ||
      localStorage.getItem("empresaAdminCreadaId");

    const usuarioId =
      localStorage.getItem("usuarioId") || localStorage.getItem("adminKonaxId");

    const rolUsuarioLocal =
      localStorage.getItem("usuarioRol") ||
      localStorage.getItem("rolUsuario") ||
      localStorage.getItem("adminKonaxRol") ||
      "";

    if (!empresaId) {
      window.location.href = "/login";
      return;
    }

    setUsuarioRol(rolUsuarioLocal);

    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("nombre, plan_nombre, estado_plan, estado, tipo_negocio")
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
    setEstadoPlan(empresa.estado_plan || "Activo");
    setTipoNegocio(empresa.tipo_negocio || "");

    await cargarModulosEmpresa(empresaId);
    await cargarPermisosUsuario(empresaId, usuarioId);

    setCargando(false);
  }

  async function cargarModulosEmpresa(empresaId) {
    const { data, error } = await supabase
      .from("modulos_empresa")
      .select("*")
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Error cargando funciones del plan: " + error.message);
      return;
    }

    const armados = {};

    (data || []).forEach((item) => {
      armados[item.modulo] = Boolean(item.activo);
    });

    setModulos(armados);
  }

  async function cargarPermisosUsuario(empresaId, usuarioId) {
    if (!usuarioId) {
      setPermisosUsuario([]);
      return;
    }

    const { data, error } = await supabase
      .from("permisos_usuarios_empresa")
      .select("permiso, activo")
      .eq("empresa_id", empresaId)
      .eq("usuario_id", usuarioId)
      .eq("activo", true);

    if (error) {
      alert("Error cargando permisos del usuario: " + error.message);
      return;
    }

    const permisos = (data || []).map((item) => item.permiso).filter(Boolean);
    setPermisosUsuario(permisos);
  }

  function moduloActivo(codigo) {
    return Boolean(modulos?.[codigo]);
  }

  function tienePermiso(codigo) {
    return permisosUsuario.includes(codigo);
  }

  function puedeVer(codigoModulo, codigoPermiso = codigoModulo) {
    return moduloActivo(codigoModulo) && tienePermiso(codigoPermiso);
  }

  function cerrarSesion() {
    localStorage.clear();
    window.location.href = "/login";
  }

  function abrirModulo(ruta) {
    window.location.href = ruta;
  }

  if (cargando) {
    return <div style={{ padding: "30px" }}>Cargando KONAX...</div>;
  }

  const tarjetas = [
    {
      nombre: "Clientes",
      ruta: "/clientes",
      activo: puedeVer("clientes"),
      icono: "👥",
    },
    {
      nombre: "Vista Cliente",
      ruta: "/vista-cliente",
      activo: puedeVer("vista_cliente"),
      icono: "🧾",
    },
    {
      nombre: "Créditos",
      ruta: "/ventas-credito",
      activo: puedeVer("ventas_credito"),
      icono: "💳",
    },
    {
      nombre: "Caja",
      ruta: "/caja",
      activo: puedeVer("caja"),
      icono: "💵",
    },
    {
      nombre: "Cobranza",
      ruta: "/cobranza",
      activo: puedeVer("cobranza"),
      icono: "📞",
    },
    {
      nombre: "Centro de Cobranza",
      ruta: "/dashboard-cobranza",
      activo: puedeVer("dashboard_cobros"),
      icono: "📊",
    },
    {
      nombre: "Gestor de Cobros",
      ruta: "/gestor-cobros",
      activo: puedeVer("gestor_cobros"),
      icono: "🧑‍💼",
    },
    {
      nombre: "Control Caja",
      ruta: "/control-caja",
      activo: puedeVer("control_caja"),
      icono: "🏦",
    },
    {
      nombre: "Inventario",
      ruta: "/inventario",
      activo: puedeVer("inventario"),
      icono: "📦",
    },
    {
      nombre: "Nuevo Producto",
      ruta: "/inventario/nuevo",
      activo: puedeVer("inventario_nuevo"),
      icono: "➕",
    },
    {
      nombre: "Suscripciones",
      ruta: "/suscripciones",
      activo: puedeVer("suscripciones"),
      icono: "🔁",
    },
    {
      nombre: "Recargos",
      ruta: "/recargos",
      activo: puedeVer("recargos"),
      icono: "⚠️",
    },
    {
      nombre: "Centro de Ventas",
      ruta: "/dashboard-ventas",
      activo: puedeVer("dashboard_ventas"),
      icono: "📈",
    },
    {
      nombre: "Gastos",
      ruta: "/gastos",
      activo: puedeVer("gastos"),
      icono: "🧮",
    },
    {
      nombre: "Usuarios y Roles",
      ruta: "/usuarios",
      activo: puedeVer("usuarios"),
      icono: "🔐",
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
          <p style={etiqueta}>Centro de Operaciones Empresariales</p>
          <h1 style={titulo}>{empresaNombre}</h1>
          <p style={plan}>
            Plan activo: <strong>{planNombre}</strong> · Estado:{" "}
            <strong>{estadoPlan}</strong>
            <br />
            Tipo de negocio: <strong>{tipoNegocio || "No definido"}</strong>
          </p>
        </div>

        <div style={resumenGrid}>
          <div style={resumenCard}>
            <p style={resumenLabel}>Opciones disponibles</p>
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

        {tarjetasActivas.length === 0 && (
          <div style={sinModulos}>
            Este usuario no tiene funciones permitidas. Revise sus permisos.
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

const sinModulos = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "12px",
  color: "#666",
  marginTop: "20px",
};
