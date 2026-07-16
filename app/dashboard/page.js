"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [permisosUsuario, setPermisosUsuario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

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

    const empresaId = localStorage.getItem("empresaId");
    const usuarioId = localStorage.getItem("usuarioId");

    if (!empresaId || !usuarioId) {
      limpiarSesionYSalir(
        "La sesión no es válida. Inicie sesión nuevamente."
      );
      return;
    }

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

    if (String(usuario.empresa_id) !== String(empresaId)) {
      limpiarSesionYSalir(
        "La empresa activa no corresponde al usuario autenticado."
      );
      return;
    }

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

    const empresaSuspendida =
      String(empresa.estado || "").toLowerCase().trim() === "suspendido";

    const planSuspendido =
      String(empresa.estado_plan || "").toLowerCase().trim() === "suspendido";

    if (empresaSuspendida || planSuspendido) {
      limpiarSesionYSalir("El servicio de esta empresa está suspendido.");
      return;
    }

    localStorage.setItem("empresaId", empresa.id || "");
    localStorage.setItem("empresaNombre", empresa.nombre || "");
    localStorage.setItem("usuarioId", usuario.id || "");
    localStorage.setItem("usuarioNombre", usuario.nombre || "");
    localStorage.setItem("usuarioCorreo", usuario.correo || "");
    localStorage.setItem("usuarioRol", usuario.rol || "");
    localStorage.setItem("rolId", usuario.rol_id || "");
    localStorage.setItem("tipoNegocio", empresa.tipo_negocio || "");
    localStorage.setItem("categoriaNegocio", empresa.categoria_negocio || "");
    localStorage.setItem("planCodigo", empresa.plan_codigo || "");
    localStorage.setItem("planNombre", empresa.plan_nombre || "");
    localStorage.setItem("estadoPlan", empresa.estado_plan || "");
    localStorage.setItem("estadoEmpresa", empresa.estado || "");

    setEmpresaNombre(empresa.nombre || "Empresa");
    setPlanNombre(empresa.plan_nombre || "Sin plan");
    setEstadoPlan(empresa.estado_plan || "Activo");
    setTipoNegocio(empresa.tipo_negocio || "");
    setUsuarioRol(usuario.rol || "");
    setUsuarioNombre(usuario.nombre || "");

    const [modulosEmpresa, permisos] = await Promise.all([
      cargarModulosEmpresa(empresaId, empresa.plan_codigo),
      cargarPermisosUsuario(empresaId, usuarioId),
    ]);

    setModulos(modulosEmpresa);
    setPermisosUsuario(permisos);
    setCargando(false);
  }

  function construirModulosPorPlan(codigoPlan) {
    const codigo = String(codigoPlan || "").toLowerCase().trim();

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
      gestor_cobros: Boolean(data.cobranza || data.dashboard_cobros),
      abonos: Boolean(data.caja || data.cobranza),
      pagos: false,
      inventario: Boolean(data.inventario),
      movimientos_inventario: Boolean(data.inventario),
      ventas: Boolean(data.venta_credito),
      dashboard_ventas: Boolean(data.dashboard_ventas),
      suscripciones: Boolean(data.suscripciones),
      recargos: Boolean(data.recargos),
      gastos: Boolean(data.egresos),
      reportes: Boolean(data.dashboard_cobros || data.dashboard_ventas),
      usuarios: true,
      configuracion: true,
    };

    const mapaFinal = {
      ...basePlan,
      ...mapaTabla,
      dashboard: true,
    };

    const codigo = String(planCodigo || "").toLowerCase().trim();

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
    if (!usuarioId) return [];

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
    const rol = String(usuarioRol || "").toLowerCase().trim();

    return (
      rol === "administrador" ||
      rol === "superadmin" ||
      rol === "admin master" ||
      rol === "administrador master"
    );
  }

  function moduloActivo(codigo) {
    if (codigo === "dashboard") return true;
    return Boolean(modulos?.[codigo]);
  }

  function tienePermiso(codigo) {
    if (codigo === "dashboard") return true;
    return permisosUsuario.includes(codigo);
  }

  function puedeVer(codigoModulo, codigoPermiso = codigoModulo) {
    if (!moduloActivo(codigoModulo)) return false;
    if (esAdministrador()) return true;
    return tienePermiso(codigoPermiso);
  }

  async function cerrarSesion() {
    localStorage.clear();
    router.replace("/login");
  }

  function abrirModulo(ruta) {
    setMenuMovilAbierto(false);
    router.push(ruta);
  }

  const tarjetas = useMemo(
    () => [
      {
        nombre: "Clientes",
        descripcion: "Consulta y administra la base de clientes.",
        ruta: "/clientes",
        activo: puedeVer("clientes"),
        icono: "👥",
        grupo: "Clientes y crédito",
      },
      {
        nombre: "Vista Cliente",
        descripcion: "Revisa el perfil completo y su historial.",
        ruta: "/vista-cliente",
        activo: puedeVer("vista_cliente"),
        icono: "🧾",
        grupo: "Clientes y crédito",
      },
      {
        nombre: "Créditos",
        descripcion: "Gestiona ventas financiadas y saldos.",
        ruta: "/ventas-credito",
        activo: puedeVer("creditos"),
        icono: "💳",
        grupo: "Clientes y crédito",
      },
      {
        nombre: "Caja",
        descripcion: "Registra ingresos y movimientos diarios.",
        ruta: "/caja",
        activo: puedeVer("caja"),
        icono: "💵",
        grupo: "Caja y finanzas",
      },
      {
        nombre: "Control Caja",
        descripcion: "Supervisa aperturas, cierres y diferencias.",
        ruta: "/control-caja",
        activo: puedeVer("control_caja"),
        icono: "🏦",
        grupo: "Caja y finanzas",
      },
      {
        nombre: "Registrar Abonos",
        descripcion: "Aplica pagos y actualiza saldos de crédito.",
        ruta: "/abonos",
        activo: puedeVer("abonos"),
        icono: "💰",
        grupo: "Caja y finanzas",
      },
      {
        nombre: "Cobranza",
        descripcion: "Consulta cuentas, estados y seguimiento.",
        ruta: "/cobranza",
        activo: puedeVer("cobranza"),
        icono: "📞",
        grupo: "Cobranza",
      },
      {
        nombre: "Centro de Cobranza",
        descripcion: "Analiza cartera, mora y recuperación.",
        ruta: "/dashboard-cobranza",
        activo: puedeVer("dashboard_cobros"),
        icono: "📊",
        grupo: "Cobranza",
      },
      {
        nombre: "Mi cartera de cobro",
        descripcion: "Gestiona las cuentas asignadas al cobrador.",
        ruta: "/gestor-cobros",
        activo: puedeVer("gestor_cobros"),
        icono: "🧑‍💼",
        grupo: "Cobranza",
      },
      {
        nombre: "Inventario",
        descripcion: "Controla productos, existencias y alertas.",
        ruta: "/inventario",
        activo: puedeVer("inventario"),
        icono: "📦",
        grupo: "Ventas e inventario",
      },
      {
        nombre: "Movimientos Inventario",
        descripcion: "Registra entradas, salidas y transferencias.",
        ruta: "/movimientos-inventario",
        activo: puedeVer("movimientos_inventario"),
        icono: "🔄",
        grupo: "Ventas e inventario",
      },
      {
        nombre: "Ventas",
        descripcion: "Registra y consulta operaciones de venta.",
        ruta: "/ventas",
        activo: puedeVer("ventas"),
        icono: "🛒",
        grupo: "Ventas e inventario",
      },
      {
        nombre: "Centro de Ventas",
        descripcion: "Mide desempeño comercial y resultados.",
        ruta: "/dashboard-ventas",
        activo: puedeVer("dashboard_ventas"),
        icono: "📈",
        grupo: "Ventas e inventario",
      },
      {
        nombre: "Gastos",
        descripcion: "Controla egresos y categorías de gasto.",
        ruta: "/gastos",
        activo: puedeVer("gastos"),
        icono: "🧮",
        grupo: "Caja y finanzas",
      },
      {
        nombre: "Suscripciones",
        descripcion: "Administra clientes y cobros recurrentes.",
        ruta: "/suscripciones",
        activo: puedeVer("suscripciones"),
        icono: "🔁",
        grupo: "Operación",
      },
      {
        nombre: "Recargos",
        descripcion: "Configura cargos adicionales y mora.",
        ruta: "/recargos",
        activo: puedeVer("recargos"),
        icono: "⚠️",
        grupo: "Operación",
      },
      {
        nombre: "Reportes",
        descripcion: "Consulta indicadores, cartera, caja y ventas.",
        ruta: "/reportes",
        activo: puedeVer("reportes"),
        icono: "📋",
        grupo: "Análisis",
        destacado: true,
      },
      {
        nombre: "Usuarios y Roles",
        descripcion: "Administra accesos, roles y permisos.",
        ruta: "/usuarios",
        activo: esAdministrador() && moduloActivo("usuarios"),
        icono: "🔐",
        grupo: "Administración",
      },
      {
        nombre: "Configuración",
        descripcion: "Gestiona los parámetros de la empresa.",
        ruta: "/admin-configuracion",
        activo: esAdministrador() && moduloActivo("configuracion"),
        icono: "⚙️",
        grupo: "Administración",
      },
    ],
    [modulos, permisosUsuario, usuarioRol]
  );

  const tarjetasActivas = tarjetas.filter((item) => item.activo);

  const grupos = useMemo(() => {
    const orden = [
      "Clientes y crédito",
      "Cobranza",
      "Caja y finanzas",
      "Ventas e inventario",
      "Análisis",
      "Operación",
      "Administración",
    ];

    return orden
      .map((nombre) => ({
        nombre,
        items: tarjetasActivas.filter((item) => item.grupo === nombre),
      }))
      .filter((grupo) => grupo.items.length > 0);
  }, [tarjetasActivas]);

  if (cargando) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <img src="/konax-logo.png" alt="KONAX" style={styles.loadingLogo} />
          <strong style={styles.loadingTitle}>Cargando KONAX</strong>
          <p style={styles.loadingText}>
            Validando empresa, plan y permisos del usuario.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.layout}>
      <button
        type="button"
        onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
        style={styles.mobileMenuButton}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {menuMovilAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuMovilAbierto(false)}
          style={styles.mobileOverlay}
        />
      )}

      <aside
        style={{
          ...styles.sidebar,
          ...(menuMovilAbierto ? styles.sidebarOpen : {}),
        }}
      >
        <div style={styles.brandBox}>
          <div style={styles.logoBox}>
            <img src="/konax-logo.png" alt="KONAX" style={styles.logo} />
          </div>

          <div>
            <h2 style={styles.brandTitle}>KONAX</h2>
            <p style={styles.brandSub}>Gestión empresarial</p>
          </div>
        </div>

        <div style={styles.companyBox}>
          <span style={styles.companyCaption}>EMPRESA ACTIVA</span>
          <strong style={styles.companyName}>{empresaNombre}</strong>
          <div style={styles.companyMetaRow}>
            <span>{usuarioRol || "Sin rol"}</span>
            <span style={styles.statusDot}>
              <span style={styles.statusCircle}></span>
              {estadoPlan || "Activo"}
            </span>
          </div>
        </div>

        <div style={styles.sidebarLabel}>NAVEGACIÓN</div>

        <nav style={styles.menu}>
          {tarjetasActivas.map((item) => (
            <button
              key={item.nombre}
              type="button"
              onClick={() => abrirModulo(item.ruta)}
              style={{
                ...styles.menuItem,
                ...(item.destacado ? styles.menuItemFeatured : {}),
              }}
            >
              <span style={styles.menuIcon}>{item.icono}</span>
              <span style={styles.menuText}>{item.nombre}</span>
              <span style={styles.menuArrow}>›</span>
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userMiniCard}>
            <div style={styles.userAvatar}>
              {String(usuarioNombre || empresaNombre || "K")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={styles.userName}>
                {usuarioNombre || "Usuario KONAX"}
              </strong>
              <span style={styles.userRole}>{usuarioRol || "Sin rol"}</span>
            </div>
          </div>

          <button type="button" onClick={cerrarSesion} style={styles.logoutButton}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main style={styles.content}>
        <section style={styles.hero}>
          <div style={styles.heroGlow}></div>

          <div style={styles.heroContent}>
            <div>
              <span style={styles.heroBadge}>CENTRO DE OPERACIONES</span>
              <h1 style={styles.heroTitle}>{empresaNombre}</h1>
              <p style={styles.heroText}>
                Administra clientes, créditos, cobros y caja desde una sola
                plataforma.
              </p>
            </div>

            <div style={styles.heroStatusCard}>
              <span style={styles.heroStatusLabel}>Plan empresarial</span>
              <strong style={styles.heroPlan}>{planNombre}</strong>
              <span style={styles.heroStatus}>
                <span style={styles.statusCircle}></span>
                {estadoPlan || "Activo"}
              </span>
            </div>
          </div>
        </section>

        <section style={styles.metricsGrid}>
          <MetricCard
            label="Módulos disponibles"
            value={tarjetasActivas.length}
            detail="Funciones activas para este usuario"
            icon="◫"
          />
          <MetricCard
            label="Plan contratado"
            value={planNombre}
            detail="Configuración comercial vigente"
            icon="◆"
            compact
          />
          <MetricCard
            label="Tipo de negocio"
            value={tipoNegocio || "No definido"}
            detail="Segmento configurado para la empresa"
            icon="⌂"
            compact
          />
          <MetricCard
            label="Rol de acceso"
            value={usuarioRol || "Sin rol"}
            detail="Nivel de permisos dentro del sistema"
            icon="●"
            compact
          />
        </section>

        <section style={styles.quickSection}>
          <div style={styles.sectionHeader}>
            <div>
              <span style={styles.sectionEyebrow}>ACCESOS PRINCIPALES</span>
              <h2 style={styles.sectionTitle}>Gestiona tu operación</h2>
              <p style={styles.sectionText}>
                Ingresa directamente a las funciones habilitadas para tu plan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => abrirModulo("/reportes")}
              style={styles.reportButton}
              disabled={!puedeVer("reportes")}
            >
              Ver reportes →
            </button>
          </div>

          {tarjetasActivas.length === 0 ? (
            <div style={styles.emptyState}>
              Este usuario no tiene funciones permitidas. Revise sus permisos.
            </div>
          ) : (
            grupos.map((grupo) => (
              <div key={grupo.nombre} style={styles.groupBlock}>
                <div style={styles.groupHeader}>
                  <h3 style={styles.groupTitle}>{grupo.nombre}</h3>
                  <span style={styles.groupCount}>
                    {grupo.items.length}{" "}
                    {grupo.items.length === 1 ? "módulo" : "módulos"}
                  </span>
                </div>

                <div style={styles.moduleGrid}>
                  {grupo.items.map((item) => (
                    <button
                      key={item.nombre}
                      type="button"
                      onClick={() => abrirModulo(item.ruta)}
                      style={{
                        ...styles.moduleCard,
                        ...(item.destacado ? styles.moduleCardFeatured : {}),
                      }}
                    >
                      <div
                        style={{
                          ...styles.moduleIcon,
                          ...(item.destacado ? styles.moduleIconFeatured : {}),
                        }}
                      >
                        {item.icono}
                      </div>

                      <div style={styles.moduleBody}>
                        <div style={styles.moduleTopRow}>
                          <h4 style={styles.moduleTitle}>{item.nombre}</h4>
                          <span style={styles.moduleArrow}>↗</span>
                        </div>

                        <p style={styles.moduleDescription}>
                          {item.descripcion}
                        </p>

                        <span style={styles.moduleLink}>Abrir módulo</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, detail, icon, compact = false }) {
  return (
    <article style={styles.metricCard}>
      <div style={styles.metricIcon}>{icon}</div>

      <div>
        <p style={styles.metricLabel}>{label}</p>
        <strong
          style={{
            ...styles.metricValue,
            ...(compact ? styles.metricValueCompact : {}),
          }}
        >
          {value}
        </strong>
        <span style={styles.metricDetail}>{detail}</span>
      </div>
    </article>
  );
}

const styles = {
  layout: {
    minHeight: "100vh",
    display: "flex",
    background: "#f4f7f5",
    fontFamily: "Arial, sans-serif",
    color: "#18221c",
  },
  loadingPage: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(circle at top, rgba(24,131,79,0.12), transparent 40%), #f4f7f5",
    fontFamily: "Arial, sans-serif",
  },
  loadingCard: {
    width: "100%",
    maxWidth: 390,
    padding: "34px 30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    border: "1px solid #dce5df",
    borderRadius: 24,
    background: "#ffffff",
    boxShadow: "0 24px 60px rgba(15,23,42,0.10)",
    textAlign: "center",
  },
  loadingLogo: {
    width: 185,
    maxWidth: "100%",
    marginBottom: 18,
    objectFit: "contain",
  },
  loadingTitle: {
    color: "#132019",
    fontSize: 22,
  },
  loadingText: {
    margin: "8px 0 0",
    color: "#6f7b73",
    fontSize: 14,
    lineHeight: 1.55,
  },
  sidebar: {
    width: 292,
    minWidth: 292,
    height: "100vh",
    position: "sticky",
    top: 0,
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    padding: "22px 18px",
    boxSizing: "border-box",
    overflowY: "auto",
    background:
      "linear-gradient(180deg, #07110d 0%, #0b1f17 52%, #0f5132 100%)",
    color: "#ffffff",
    boxShadow: "12px 0 36px rgba(5,18,12,0.16)",
  },
  sidebarOpen: {
    transform: "translateX(0)",
  },
  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  logoBox: {
    width: 58,
    height: 48,
    display: "grid",
    placeItems: "center",
    padding: 5,
    boxSizing: "border-box",
    borderRadius: 14,
    background: "#ffffff",
    boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  brandTitle: {
    margin: 0,
    fontSize: 23,
    letterSpacing: 0.5,
  },
  brandSub: {
    margin: "4px 0 0",
    color: "#9de4be",
    fontSize: 12,
  },
  companyBox: {
    marginBottom: 20,
    padding: 15,
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 17,
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(8px)",
  },
  companyCaption: {
    display: "block",
    marginBottom: 6,
    color: "#8fd9b0",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.3,
  },
  companyName: {
    display: "block",
    marginBottom: 10,
    fontSize: 16,
    lineHeight: 1.3,
  },
  companyMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#d8eee1",
    fontSize: 12,
  },
  statusDot: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  statusCircle: {
    width: 8,
    height: 8,
    display: "inline-block",
    borderRadius: "50%",
    background: "#46d98d",
    boxShadow: "0 0 0 4px rgba(70,217,141,0.12)",
  },
  sidebarLabel: {
    margin: "0 6px 10px",
    color: "#79b796",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.35,
  },
  menu: {
    display: "grid",
    gap: 7,
  },
  menuItem: {
    width: "100%",
    minHeight: 48,
    display: "grid",
    gridTemplateColumns: "28px 1fr auto",
    alignItems: "center",
    gap: 9,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 13,
    background: "rgba(255,255,255,0.055)",
    color: "#f4fff8",
    cursor: "pointer",
    textAlign: "left",
  },
  menuItemFeatured: {
    border: "1px solid rgba(111,230,166,0.42)",
    background:
      "linear-gradient(135deg, rgba(35,142,88,0.58), rgba(20,93,59,0.72))",
  },
  menuIcon: {
    fontSize: 18,
    textAlign: "center",
  },
  menuText: {
    fontSize: 13,
    fontWeight: 800,
  },
  menuArrow: {
    color: "#7cc69e",
    fontSize: 21,
  },
  sidebarFooter: {
    marginTop: "auto",
    paddingTop: 18,
  },
  userMiniCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    padding: 11,
    borderRadius: 13,
    background: "rgba(0,0,0,0.16)",
  },
  userAvatar: {
    width: 36,
    height: 36,
    minWidth: 36,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#e7fff0",
    color: "#146b41",
    fontWeight: 900,
  },
  userName: {
    display: "block",
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 12,
  },
  userRole: {
    display: "block",
    marginTop: 2,
    color: "#9ccbb1",
    fontSize: 11,
  },
  logoutButton: {
    width: "100%",
    minHeight: 43,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.94)",
    color: "#14241a",
    fontWeight: 800,
    cursor: "pointer",
  },
  content: {
    flex: 1,
    minWidth: 0,
    padding: "28px",
    boxSizing: "border-box",
  },
  hero: {
    position: "relative",
    maxWidth: 1480,
    margin: "0 auto 20px",
    overflow: "hidden",
    borderRadius: 27,
    background:
      "linear-gradient(135deg, #09110d 0%, #10281d 55%, #146b41 100%)",
    boxShadow: "0 24px 55px rgba(9,38,24,0.18)",
  },
  heroGlow: {
    position: "absolute",
    width: 340,
    height: 340,
    right: -80,
    top: -150,
    borderRadius: "50%",
    background: "rgba(109,239,169,0.16)",
    filter: "blur(4px)",
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    padding: "34px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
  },
  heroBadge: {
    display: "inline-block",
    marginBottom: 10,
    color: "#7ce1aa",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.45,
  },
  heroTitle: {
    margin: "0 0 10px",
    color: "#ffffff",
    fontSize: "clamp(32px, 5vw, 54px)",
    lineHeight: 1.02,
    letterSpacing: -1.1,
  },
  heroText: {
    maxWidth: 650,
    margin: 0,
    color: "#d3e8dc",
    fontSize: 16,
    lineHeight: 1.55,
  },
  heroStatusCard: {
    minWidth: 220,
    padding: "18px 20px",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: 18,
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(8px)",
  },
  heroStatusLabel: {
    display: "block",
    marginBottom: 7,
    color: "#9bd8b5",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroPlan: {
    display: "block",
    marginBottom: 10,
    color: "#ffffff",
    fontSize: 21,
  },
  heroStatus: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    color: "#dff8e8",
    fontSize: 12,
    fontWeight: 800,
  },
  metricsGrid: {
    maxWidth: 1480,
    margin: "0 auto 22px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  metricCard: {
    minHeight: 126,
    padding: 18,
    display: "grid",
    gridTemplateColumns: "46px 1fr",
    gap: 13,
    border: "1px solid #dce5df",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 10px 28px rgba(15,23,42,0.055)",
  },
  metricIcon: {
    width: 46,
    height: 46,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#e9f7ef",
    color: "#16834f",
    fontSize: 20,
    fontWeight: 900,
  },
  metricLabel: {
    margin: "1px 0 7px",
    color: "#6b766f",
    fontSize: 12,
    fontWeight: 800,
  },
  metricValue: {
    display: "block",
    marginBottom: 6,
    color: "#17211c",
    fontSize: 29,
    lineHeight: 1.05,
  },
  metricValueCompact: {
    fontSize: 20,
  },
  metricDetail: {
    display: "block",
    color: "#89938d",
    fontSize: 11,
    lineHeight: 1.4,
  },
  quickSection: {
    maxWidth: 1480,
    margin: "0 auto",
    padding: 23,
    border: "1px solid #dce5df",
    borderRadius: 22,
    background: "#ffffff",
    boxShadow: "0 14px 38px rgba(15,23,42,0.06)",
  },
  sectionHeader: {
    marginBottom: 24,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 18,
    flexWrap: "wrap",
  },
  sectionEyebrow: {
    display: "block",
    marginBottom: 6,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.35,
  },
  sectionTitle: {
    margin: "0 0 7px",
    color: "#17211c",
    fontSize: 28,
  },
  sectionText: {
    margin: 0,
    color: "#728078",
    fontSize: 14,
  },
  reportButton: {
    minHeight: 43,
    padding: "10px 16px",
    border: "none",
    borderRadius: 12,
    background: "#16834f",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
  groupBlock: {
    marginTop: 23,
  },
  groupHeader: {
    marginBottom: 11,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  groupTitle: {
    margin: 0,
    color: "#243128",
    fontSize: 17,
  },
  groupCount: {
    color: "#839087",
    fontSize: 11,
    fontWeight: 700,
  },
  moduleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(245px, 1fr))",
    gap: 13,
  },
  moduleCard: {
    minHeight: 156,
    padding: 17,
    display: "grid",
    gridTemplateColumns: "48px 1fr",
    gap: 13,
    border: "1px solid #dde6e0",
    borderRadius: 17,
    background: "#fbfdfc",
    cursor: "pointer",
    textAlign: "left",
  },
  moduleCardFeatured: {
    border: "1px solid #9edab8",
    background:
      "linear-gradient(135deg, #f1fff7 0%, #e8f8ef 100%)",
    boxShadow: "0 12px 28px rgba(22,131,79,0.09)",
  },
  moduleIcon: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#edf5f0",
    fontSize: 22,
  },
  moduleIconFeatured: {
    background: "#d7f3e2",
  },
  moduleBody: {
    minWidth: 0,
  },
  moduleTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  moduleTitle: {
    margin: 0,
    color: "#17211c",
    fontSize: 15,
  },
  moduleArrow: {
    color: "#16834f",
    fontSize: 17,
  },
  moduleDescription: {
    margin: "8px 0 12px",
    color: "#6f7b73",
    fontSize: 12,
    lineHeight: 1.45,
  },
  moduleLink: {
    color: "#16834f",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  emptyState: {
    padding: 24,
    border: "1px dashed #cbd7cf",
    borderRadius: 16,
    color: "#68756d",
    textAlign: "center",
  },
  mobileMenuButton: {
    display: "none",
    position: "fixed",
    top: 14,
    left: 14,
    zIndex: 80,
    width: 44,
    height: 44,
    border: "none",
    borderRadius: 12,
    background: "#0d251a",
    color: "#ffffff",
    fontSize: 22,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(0,0,0,0.18)",
  },
  mobileOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 40,
    border: "none",
    background: "rgba(0,0,0,0.46)",
  },
};
