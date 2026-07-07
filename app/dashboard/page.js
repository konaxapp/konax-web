"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const router = useRouter();

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

  function limpiarSesionYSalir(mensaje = "") {
    if (mensaje) {
      alert(mensaje);
    }

    localStorage.clear();
    router.replace("/login");
  }

  async function cargarDashboard() {
    setCargando(true);

    /*
      =====================================================
      SESIÓN OFICIAL KONAX
      =====================================================
    */

    const empresaId = localStorage.getItem("empresaId");
    const usuarioId = localStorage.getItem("usuarioId");

    if (!empresaId || !usuarioId) {
      limpiarSesionYSalir(
        "La sesión no es válida. Inicie sesión nuevamente."
      );
      return;
    }

    /*
      =====================================================
      1. VALIDAR USUARIO ACTIVO
      =====================================================
    */

    const { data: usuario, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("id, empresa_id, nombre, correo, rol, rol_id, estado")
      .eq("id", usuarioId)
      .maybeSingle();

    if (errorUsuario) {
      alert("Error validando usuario: " + errorUsuario.message);
      setCargando(false);
      return;
    }

    if (!usuario) {
      limpiarSesionYSalir("El usuario de la sesión ya no existe.");
      return;
    }

    if (String(usuario.estado || "").toLowerCase().trim() !== "activo") {
      limpiarSesionYSalir("Este usuario se encuentra inactivo.");
      return;
    }

    /*
      =====================================================
      2. VALIDAR EMPRESA DEL USUARIO
      =====================================================
    */

    if (String(usuario.empresa_id) !== String(empresaId)) {
      limpiarSesionYSalir(
        "La empresa activa no corresponde al usuario autenticado."
      );
      return;
    }

    /*
      =====================================================
      3. CARGAR EMPRESA ACTIVA
      =====================================================
    */

    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select(
        `
          id,
          nombre,
          plan_nombre,
          plan_codigo,
          estado_plan,
          estado,
          estado_pago,
          fecha_proxima_facturacion,
          tipo_negocio,
          categoria_negocio
        `
      )
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      alert("Error cargando empresa: " + errorEmpresa.message);
      setCargando(false);
      return;
    }

    if (!empresa) {
      limpiarSesionYSalir("La empresa de esta sesión ya no existe.");
      return;
    }

    /*
      =====================================================
      4. VALIDAR ESTADO DE EMPRESA Y PLAN
      =====================================================
    */

    const empresaSuspendida =
      String(empresa.estado || "").toLowerCase().trim() === "suspendido";

    const planSuspendido =
      String(empresa.estado_plan || "").toLowerCase().trim() === "suspendido";

    if (empresaSuspendida || planSuspendido) {
      limpiarSesionYSalir("El servicio de esta empresa está suspendido.");
      return;
    }

    /*
      =====================================================
      5. SINCRONIZAR LOCALSTORAGE
      =====================================================
    */

    localStorage.setItem("empresaId", empresa.id || "");
    localStorage.setItem("empresaNombre", empresa.nombre || "");

    localStorage.setItem("usuarioId", usuario.id || "");
    localStorage.setItem("usuarioNombre", usuario.nombre || "");
    localStorage.setItem("usuarioCorreo", usuario.correo || "");
    localStorage.setItem("usuarioRol", usuario.rol || "");
    localStorage.setItem("rolId", usuario.rol_id || "");

    localStorage.setItem("tipoNegocio", empresa.tipo_negocio || "");
    localStorage.setItem(
      "categoriaNegocio",
      empresa.categoria_negocio || ""
    );

    localStorage.setItem("planCodigo", empresa.plan_codigo || "");
    localStorage.setItem("planNombre", empresa.plan_nombre || "");
    localStorage.setItem("estadoPlan", empresa.estado_plan || "");
    localStorage.setItem("estadoEmpresa", empresa.estado || "");

    /*
      =====================================================
      6. ACTUALIZAR ESTADO VISUAL
      =====================================================
    */

    setEmpresaNombre(empresa.nombre || "Empresa");
    setPlanNombre(empresa.plan_nombre || "Sin plan");
    setEstadoPlan(empresa.estado_plan || "Activo");
    setTipoNegocio(empresa.tipo_negocio || "");
    setUsuarioRol(usuario.rol || "");

    /*
      =====================================================
      7. CARGAR MÓDULOS Y PERMISOS
      =====================================================
    */

    const [modulosEmpresa, permisos] = await Promise.all([
      cargarModulosEmpresa(empresaId, empresa.plan_codigo),
      cargarPermisosUsuario(empresaId, usuarioId),
    ]);

    setModulos(modulosEmpresa);
    setPermisosUsuario(permisos);

    setCargando(false);
  }

  function construirModulosPorPlan(codigoPlan) {
    const codigo = String(codigoPlan || "")
      .toLowerCase()
      .trim();

    if (codigo === "cobros") {
      return {
        dashboard: true,

        clientes: true,
        vista_cliente: true,
        creditos: true,

        cobranza: true,
        dashboard_cobros: true,
        gestor_cobros: true,

        abonos: true,
        caja: true,
        control_caja: true,

        reportes: true,

        pagos: false,

        inventario: false,
        movimientos_inventario: false,

        ventas: false,
        dashboard_ventas: false,

        suscripciones: false,
        recargos: false,
        gastos: false,

        usuarios: true,
        configuracion: true,
      };
    }

    if (codigo === "ventas_gestion") {
      return {
        dashboard: true,

        clientes: true,
        vista_cliente: true,
        creditos: true,

        cobranza: true,
        dashboard_cobros: true,
        gestor_cobros: true,

        abonos: true,
        caja: true,
        control_caja: true,

        reportes: true,

        inventario: true,
        movimientos_inventario: true,

        ventas: true,
        dashboard_ventas: true,

        gastos: true,

        pagos: false,
        suscripciones: false,
        recargos: false,

        usuarios: true,
        configuracion: true,
      };
    }

    if (codigo === "pro") {
      return {
        dashboard: true,

        clientes: true,
        vista_cliente: true,
        creditos: true,

        cobranza: true,
        dashboard_cobros: true,
        gestor_cobros: true,

        abonos: true,
        caja: true,
        control_caja: true,

        reportes: true,

        inventario: true,
        movimientos_inventario: true,

        ventas: true,
        dashboard_ventas: true,

        gastos: true,
        recargos: true,
        suscripciones: true,

        pagos: false,

        usuarios: true,
        configuracion: true,
      };
    }

    return {
      dashboard: true,

      clientes: false,
      vista_cliente: false,
      creditos: false,

      cobranza: false,
      dashboard_cobros: false,
      gestor_cobros: false,

      abonos: false,
      caja: false,
      control_caja: false,

      reportes: false,
      pagos: false,

      inventario: false,
      movimientos_inventario: false,

      ventas: false,
      dashboard_ventas: false,

      gastos: false,
      recargos: false,
      suscripciones: false,

      usuarios: false,
      configuracion: false,
    };
  }

  async function cargarModulosEmpresa(empresaId, planCodigo) {
    const basePlan = construirModulosPorPlan(planCodigo);

    const { data, error } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (error) {
      alert("Error cargando módulos de empresa: " + error.message);
      return basePlan;
    }

    if (!data) {
      return basePlan;
    }

    const mapaTabla = {
      dashboard: true,

      clientes: Boolean(data.clientes),
      vista_cliente: Boolean(data.vista_cliente),
      creditos: Boolean(data.venta_credito),

      caja: Boolean(data.caja),
      control_caja: Boolean(data.control_caja),

      cobranza: Boolean(data.cobranza),
      dashboard_cobros: Boolean(data.dashboard_cobros),

      gestor_cobros: Boolean(
        data.cobranza || data.dashboard_cobros
      ),

      abonos: Boolean(data.caja || data.cobranza),

      pagos: false,

      inventario: Boolean(data.inventario),

      movimientos_inventario: Boolean(data.inventario),

      ventas: Boolean(data.venta_credito),

      dashboard_ventas: Boolean(data.dashboard_ventas),

      suscripciones: Boolean(data.suscripciones),

      recargos: Boolean(data.recargos),

      gastos: Boolean(data.egresos),

      reportes: Boolean(
        data.dashboard_cobros || data.dashboard_ventas
      ),

      usuarios: true,
      configuracion: true,
    };

    const mapaFinal = {
      ...basePlan,
      ...mapaTabla,
      dashboard: true,
    };

    const codigo = String(planCodigo || "")
      .toLowerCase()
      .trim();

    /*
      =====================================================
      PLAN KONAX COBROS
      =====================================================
    */

    if (codigo === "cobros") {
      mapaFinal.clientes = true;
      mapaFinal.vista_cliente = true;
      mapaFinal.creditos = true;

      mapaFinal.cobranza = true;
      mapaFinal.dashboard_cobros = true;
      mapaFinal.gestor_cobros = true;

      mapaFinal.abonos = true;
      mapaFinal.caja = true;
      mapaFinal.control_caja = true;

      mapaFinal.reportes = true;

      mapaFinal.usuarios = true;
      mapaFinal.configuracion = true;

      mapaFinal.inventario = false;
      mapaFinal.movimientos_inventario = false;

      mapaFinal.ventas = false;
      mapaFinal.dashboard_ventas = false;

      mapaFinal.gastos = false;
      mapaFinal.recargos = false;
      mapaFinal.suscripciones = false;
    }

    return mapaFinal;
  }

  async function cargarPermisosUsuario(empresaId, usuarioId) {
    if (!usuarioId) {
      return [];
    }

    const { data, error } = await supabase
      .from("permisos_usuarios_empresa")
      .select("permiso, activo")
      .eq("empresa_id", empresaId)
      .eq("usuario_id", usuarioId)
      .eq("activo", true);

    if (error) {
      alert("Error cargando permisos del usuario: " + error.message);
      return [];
    }

    return (data || [])
      .map((item) => item.permiso)
      .filter(Boolean);
  }

  function esAdministrador() {
    const rol = String(usuarioRol || "")
      .toLowerCase()
      .trim();

    return (
      rol === "administrador" ||
      rol === "superadmin" ||
      rol === "admin master" ||
      rol === "administrador master"
    );
  }

  function moduloActivo(codigo) {
    if (codigo === "dashboard") {
      return true;
    }

    return Boolean(modulos?.[codigo]);
  }

  function tienePermiso(codigo) {
    if (codigo === "dashboard") {
      return true;
    }

    return permisosUsuario.includes(codigo);
  }

  function puedeVer(codigoModulo, codigoPermiso = codigoModulo) {
    if (!moduloActivo(codigoModulo)) {
      return false;
    }

    if (esAdministrador()) {
      return true;
    }

    return tienePermiso(codigoPermiso);
  }

  async function cerrarSesion() {
    localStorage.clear();
    router.replace("/login");
  }

  function abrirModulo(ruta) {
    router.push(ruta);
  }

  if (cargando) {
    return (
      <div style={cargandoPagina}>
        <div style={cargandoCard}>
          <strong>Cargando KONAX...</strong>
          <p>Validando usuario, empresa y permisos.</p>
        </div>
      </div>
    );
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
      activo: puedeVer("creditos"),
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
      nombre: "Mi cartera de cobro",
      ruta: "/gestor-cobros",
      activo: puedeVer("gestor_cobros"),
      icono: "🧑‍💼",
    },
    {
      nombre: "Registrar Abonos",
      ruta: "/abonos",
      activo: puedeVer("abonos"),
      icono: "💰",
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
      nombre: "Movimientos Inventario",
      ruta: "/movimientos-inventario",
      activo: puedeVer("movimientos_inventario"),
      icono: "🔄",
    },
    {
      nombre: "Ventas",
      ruta: "/ventas",
      activo: puedeVer("ventas"),
      icono: "🛒",
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
      nombre: "Reportes",
      ruta: "/reportes",
      activo: puedeVer("reportes"),
      icono: "📋",
    },

    /*
      =====================================================
      OPCIONES EXCLUSIVAS DEL ADMINISTRADOR
      =====================================================
    */

    {
      nombre: "Usuarios y Roles",
      ruta: "/usuarios",
      activo: esAdministrador() && moduloActivo("usuarios"),
      icono: "🔐",
    },
    {
      nombre: "Configuración",
      ruta: "/admin-configuracion",
      activo: esAdministrador() && moduloActivo("configuracion"),
      icono: "⚙️",
    },
  ];

  const tarjetasActivas = tarjetas.filter((item) => item.activo);

  return (
    <div style={layout}>
      <aside style={sidebar}>
        <div style={brandBox}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={logo}
          />

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

        <button
          onClick={cerrarSesion}
          style={botonSalir}
        >
          Cerrar sesión
        </button>
      </aside>

      <main style={contenido}>
        <div style={hero}>
          <p style={etiqueta}>
            Centro de Operaciones Empresariales
          </p>

          <h1 style={titulo}>
            {empresaNombre}
          </h1>

          <p style={plan}>
            Plan activo: <strong>{planNombre}</strong>
            {" · "}
            Estado: <strong>{estadoPlan}</strong>

            <br />

            Tipo de negocio:{" "}
            <strong>{tipoNegocio || "No definido"}</strong>
          </p>
        </div>

        <div style={resumenGrid}>
          <div style={resumenCard}>
            <p style={resumenLabel}>Opciones disponibles</p>

            <h2 style={resumenValor}>
              {tarjetasActivas.length}
            </h2>
          </div>

          <div style={resumenCard}>
            <p style={resumenLabel}>Plan</p>

            <h2 style={resumenValorTexto}>
              {planNombre}
            </h2>
          </div>

          <div style={resumenCard}>
            <p style={resumenLabel}>Rol</p>

            <h2 style={resumenValorTexto}>
              {usuarioRol || "Sin rol"}
            </h2>
          </div>
        </div>

        {tarjetasActivas.length === 0 && (
          <div style={sinModulos}>
            Este usuario no tiene funciones permitidas.
            Revise sus permisos.
          </div>
        )}
      </main>
    </div>
  );
}

const cargandoPagina = {
  minHeight: "100vh",
  background: "#eef2f7",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Arial, sans-serif",
};

const cargandoCard = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
  color: "#111827",
};

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
