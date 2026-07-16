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

  useEffect(() => {
    cargarDashboard();
  }, []);

  function limpiarSesionYSalir(mensaje = "") {
    if (mensaje) alert(mensaje);
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

    if (!data) return basePlan;

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

    return (data || []).map((item) => item.permiso).filter(Boolean);
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

  function abrirModulo(ruta) {
    router.push(ruta);
  }

  async function cerrarSesion() {
    localStorage.clear();
    router.replace("/login");
  }

  const modulosMenu = useMemo(
    () => [
      { nombre: "Clientes", ruta: "/clientes", activo: puedeVer("clientes"), icono: "users" },
      { nombre: "Vista Cliente", ruta: "/vista-cliente", activo: puedeVer("vista_cliente"), icono: "file" },
      { nombre: "Créditos", ruta: "/ventas-credito", activo: puedeVer("creditos"), icono: "card" },
      { nombre: "Caja", ruta: "/caja", activo: puedeVer("caja"), icono: "cash" },
      { nombre: "Cobranza", ruta: "/cobranza", activo: puedeVer("cobranza"), icono: "phone" },
      { nombre: "Centro de Cobranza", ruta: "/dashboard-cobranza", activo: puedeVer("dashboard_cobros"), icono: "chart" },
      { nombre: "Mi cartera de cobro", ruta: "/gestor-cobros", activo: puedeVer("gestor_cobros"), icono: "briefcase" },
      { nombre: "Registrar Abonos", ruta: "/abonos", activo: puedeVer("abonos"), icono: "payment" },
      { nombre: "Control Caja", ruta: "/control-caja", activo: puedeVer("control_caja"), icono: "bank" },
      { nombre: "Inventario", ruta: "/inventario", activo: puedeVer("inventario"), icono: "box" },
      { nombre: "Movimientos Inventario", ruta: "/movimientos-inventario", activo: puedeVer("movimientos_inventario"), icono: "swap" },
      { nombre: "Ventas", ruta: "/ventas", activo: puedeVer("ventas"), icono: "cart" },
      { nombre: "Centro de Ventas", ruta: "/dashboard-ventas", activo: puedeVer("dashboard_ventas"), icono: "trend" },
      { nombre: "Gastos", ruta: "/gastos", activo: puedeVer("gastos"), icono: "receipt" },
      { nombre: "Suscripciones", ruta: "/suscripciones", activo: puedeVer("suscripciones"), icono: "repeat" },
      { nombre: "Recargos", ruta: "/recargos", activo: puedeVer("recargos"), icono: "alert" },
      { nombre: "Reportes", ruta: "/reportes", activo: puedeVer("reportes"), icono: "report" },
      {
        nombre: "Usuarios y Roles",
        ruta: "/usuarios",
        activo: esAdministrador() && moduloActivo("usuarios"),
        icono: "lock",
      },
      {
        nombre: "Configuración",
        ruta: "/admin-configuracion",
        activo: esAdministrador() && moduloActivo("configuracion"),
        icono: "settings",
      },
    ],
    [modulos, permisosUsuario, usuarioRol]
  );

  const activos = modulosMenu.filter((item) => item.activo);

  const atajos = [
    activos.find((item) => item.nombre === "Clientes"),
    activos.find((item) => item.nombre === "Créditos"),
    activos.find((item) => item.nombre === "Cobranza"),
    activos.find((item) => item.nombre === "Caja"),
    activos.find((item) => item.nombre === "Reportes"),
  ].filter(Boolean);

  if (cargando) {
    return (
      <div style={s.loading}>
        <img src="/konax-logo.png" alt="KONAX" style={s.loadingLogo} />
        <strong style={s.loadingTitle}>Preparando tu espacio de trabajo</strong>
        <span style={s.loadingText}>Validando empresa, plan y permisos.</span>
      </div>
    );
  }

  return (
    <div style={s.layout}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <img src="/konax-logo.png" alt="KONAX" style={s.logo} />
        </div>

        <nav style={s.nav}>
          {activos.map((item) => (
            <button
              key={item.nombre}
              type="button"
              onClick={() => abrirModulo(item.ruta)}
              style={s.navItem}
            >
              <Icon name={item.icono} size={19} />
              <span>{item.nombre}</span>
            </button>
          ))}
        </nav>

        <button type="button" onClick={cerrarSesion} style={s.logout}>
          <Icon name="logout" size={18} />
          Cerrar sesión
        </button>
      </aside>

      <main style={s.main}>
        <header style={s.topbar}>
          <div>
            <span style={s.eyebrow}>PANEL EMPRESARIAL</span>
            <h1 style={s.pageTitle}>{empresaNombre}</h1>
          </div>

          <div style={s.userBox}>
            <div style={s.avatar}>
              {String(usuarioNombre || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong style={s.userName}>{usuarioNombre || "Usuario"}</strong>
              <span style={s.userRole}>{usuarioRol || "Sin rol"}</span>
            </div>
          </div>
        </header>

        <section style={s.hero}>
          <div style={s.heroMain}>
            <span style={s.heroTag}>CENTRO DE OPERACIONES</span>
            <h2 style={s.heroTitle}>
              Todo tu negocio, claro y bajo control.
            </h2>
            <p style={s.heroText}>
              Accede a las funciones principales y mantén organizada la operación
              diaria de {tipoNegocio || "tu empresa"}.
            </p>

            <div style={s.heroActions}>
              {puedeVer("reportes") && (
                <button
                  type="button"
                  onClick={() => abrirModulo("/reportes")}
                  style={s.primaryButton}
                >
                  Ver reportes
                  <Icon name="arrow" size={17} />
                </button>
              )}

              {puedeVer("clientes") && (
                <button
                  type="button"
                  onClick={() => abrirModulo("/clientes")}
                  style={s.secondaryButton}
                >
                  Abrir clientes
                </button>
              )}
            </div>
          </div>

          <div style={s.planPanel}>
            <span style={s.planLabel}>PLAN ACTUAL</span>
            <strong style={s.planName}>{planNombre}</strong>
            <div style={s.planStatus}>
              <span style={s.greenDot}></span>
              {estadoPlan || "Activo"}
            </div>
            <div style={s.planDivider}></div>
            <span style={s.planSmall}>{activos.length} funciones habilitadas</span>
          </div>
        </section>

        <section style={s.section}>
          <div style={s.sectionHeader}>
            <div>
              <span style={s.sectionEyebrow}>ATAJOS</span>
              <h3 style={s.sectionTitle}>Acciones frecuentes</h3>
            </div>
            <span style={s.sectionHint}>Accesos rápidos sin repetir todo el menú</span>
          </div>

          <div style={s.quickGrid}>
            {atajos.map((item) => (
              <button
                key={item.nombre}
                type="button"
                onClick={() => abrirModulo(item.ruta)}
                style={s.quickCard}
              >
                <div style={s.quickIcon}>
                  <Icon name={item.icono} size={22} />
                </div>
                <div style={s.quickTextBox}>
                  <strong style={s.quickTitle}>{item.nombre}</strong>
                  <span style={s.quickText}>Abrir módulo</span>
                </div>
                <Icon name="arrow" size={18} />
              </button>
            ))}
          </div>
        </section>

        <section style={s.bottomGrid}>
          <article style={s.infoCard}>
            <div style={s.infoIcon}>
              <Icon name="shield" size={23} />
            </div>
            <div>
              <span style={s.infoLabel}>ACCESO ACTUAL</span>
              <h3 style={s.infoTitle}>{usuarioRol || "Sin rol"}</h3>
              <p style={s.infoText}>
                Tus opciones se muestran según el plan contratado y los permisos asignados.
              </p>
            </div>
          </article>

          <article style={s.infoCard}>
            <div style={s.infoIcon}>
              <Icon name="building" size={23} />
            </div>
            <div>
              <span style={s.infoLabel}>TIPO DE NEGOCIO</span>
              <h3 style={s.infoTitle}>{tipoNegocio || "No definido"}</h3>
              <p style={s.infoText}>
                La configuración del sistema está adaptada al perfil de esta empresa.
              </p>
            </div>
          </article>

          <article style={s.infoCard}>
            <div style={s.infoIcon}>
              <Icon name="grid" size={23} />
            </div>
            <div>
              <span style={s.infoLabel}>FUNCIONES ACTIVAS</span>
              <h3 style={s.infoTitle}>{activos.length}</h3>
              <p style={s.infoText}>
                Módulos disponibles para trabajar desde esta cuenta.
              </p>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const paths = {
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h6" />
      </>
    ),
    card: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
    cash: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 10h.01M18 14h.01" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" />
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 16l4-5 4 3 4-7" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
      </>
    ),
    payment: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 9h20" />
        <path d="M7 15h4" />
      </>
    ),
    bank: (
      <>
        <path d="M3 10h18" />
        <path d="M5 10v8M9 10v8M15 10v8M19 10v8" />
        <path d="M2 18h20M12 2l10 5H2z" />
      </>
    ),
    box: (
      <>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
      </>
    ),
    swap: (
      <>
        <path d="M7 7h11l-3-3M17 17H6l3 3" />
      </>
    ),
    cart: (
      <>
        <circle cx="9" cy="20" r="1" />
        <circle cx="19" cy="20" r="1" />
        <path d="M3 4h2l2.7 11.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" />
      </>
    ),
    trend: (
      <>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
        <path d="M9 7h6M9 11h6M9 15h4" />
      </>
    ),
    repeat: (
      <>
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 2.8L1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.8a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    report: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M9 7h7M9 11h7M9 15h4" />
      </>
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.38.28.7.63.6 1.1V10h1v4h-.09a1.7 1.7 0 0 0-1.51 1z" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    building: (
      <>
        <path d="M3 21h18M6 21V3h12v18M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

const s = {
  layout: {
    minHeight: "100vh",
    display: "flex",
    background: "#f3f6f4",
    color: "#142019",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loading: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "#f3f6f4",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loadingLogo: {
    width: 210,
    marginBottom: 10,
  },
  loadingTitle: {
    fontSize: 22,
  },
  loadingText: {
    color: "#718078",
    fontSize: 14,
  },
  sidebar: {
    width: 270,
    minWidth: 270,
    height: "100vh",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    padding: "22px 16px",
    boxSizing: "border-box",
    background: "#0a1710",
    color: "#ffffff",
    overflowY: "auto",
  },
  brand: {
    padding: "4px 10px 22px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
  },
  logo: {
    width: 145,
    height: 54,
    objectFit: "contain",
    objectPosition: "left center",
    filter: "brightness(0) invert(1)",
  },
  nav: {
    display: "grid",
    gap: 5,
    paddingTop: 18,
  },
  navItem: {
    width: "100%",
    minHeight: 44,
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    alignItems: "center",
    gap: 10,
    padding: "9px 11px",
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: "#dfe8e2",
    fontSize: 13,
    fontWeight: 650,
    textAlign: "left",
    cursor: "pointer",
  },
  logout: {
    width: "100%",
    minHeight: 44,
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 11,
    background: "rgba(255,255,255,.05)",
    color: "#ffffff",
    fontWeight: 750,
    cursor: "pointer",
  },
  main: {
    flex: 1,
    minWidth: 0,
    padding: "28px 30px 40px",
  },
  topbar: {
    maxWidth: 1440,
    margin: "0 auto 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  eyebrow: {
    display: "block",
    marginBottom: 4,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.4,
  },
  pageTitle: {
    margin: 0,
    fontSize: 29,
    letterSpacing: -0.4,
  },
  userBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#173c2a",
    color: "#ffffff",
    fontWeight: 900,
  },
  userName: {
    display: "block",
    fontSize: 13,
  },
  userRole: {
    display: "block",
    marginTop: 2,
    color: "#7d8a82",
    fontSize: 11,
  },
  hero: {
    maxWidth: 1440,
    margin: "0 auto 22px",
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 270px",
    gap: 20,
    padding: 30,
    borderRadius: 24,
    background:
      "linear-gradient(135deg, #0b1710 0%, #123924 65%, #17673e 100%)",
    boxShadow: "0 22px 55px rgba(12,48,29,.18)",
  },
  heroMain: {
    alignSelf: "center",
  },
  heroTag: {
    display: "block",
    marginBottom: 9,
    color: "#75dca4",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.5,
  },
  heroTitle: {
    maxWidth: 700,
    margin: "0 0 12px",
    color: "#ffffff",
    fontSize: "clamp(34px,5vw,56px)",
    lineHeight: 1.02,
    letterSpacing: -1.4,
  },
  heroText: {
    maxWidth: 680,
    margin: 0,
    color: "#d1e5d8",
    fontSize: 15,
    lineHeight: 1.6,
  },
  heroActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 22,
  },
  primaryButton: {
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    padding: "10px 16px",
    border: "none",
    borderRadius: 11,
    background: "#ffffff",
    color: "#123622",
    fontWeight: 850,
    cursor: "pointer",
  },
  secondaryButton: {
    minHeight: 44,
    padding: "10px 16px",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 11,
    background: "rgba(255,255,255,.06)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
  planPanel: {
    alignSelf: "stretch",
    padding: 20,
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 18,
    background: "rgba(255,255,255,.08)",
  },
  planLabel: {
    display: "block",
    marginBottom: 8,
    color: "#95d8b2",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.2,
  },
  planName: {
    display: "block",
    color: "#ffffff",
    fontSize: 23,
  },
  planStatus: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    color: "#dff4e7",
    fontSize: 12,
    fontWeight: 750,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#52dd91",
  },
  planDivider: {
    height: 1,
    margin: "18px 0",
    background: "rgba(255,255,255,.12)",
  },
  planSmall: {
    color: "#b9d8c5",
    fontSize: 12,
  },
  section: {
    maxWidth: 1440,
    margin: "0 auto 22px",
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 10px 30px rgba(15,23,42,.045)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 18,
    marginBottom: 16,
  },
  sectionEyebrow: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.3,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  sectionHint: {
    color: "#8b9690",
    fontSize: 12,
  },
  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
    gap: 12,
  },
  quickCard: {
    minHeight: 84,
    display: "grid",
    gridTemplateColumns: "42px 1fr auto",
    alignItems: "center",
    gap: 12,
    padding: 14,
    border: "1px solid #dfe7e2",
    borderRadius: 15,
    background: "#fbfdfc",
    color: "#173122",
    textAlign: "left",
    cursor: "pointer",
  },
  quickIcon: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#e8f6ee",
    color: "#16834f",
  },
  quickTextBox: {
    minWidth: 0,
  },
  quickTitle: {
    display: "block",
    fontSize: 14,
  },
  quickText: {
    display: "block",
    marginTop: 4,
    color: "#849087",
    fontSize: 11,
  },
  bottomGrid: {
    maxWidth: 1440,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
    gap: 14,
  },
  infoCard: {
    minHeight: 132,
    display: "grid",
    gridTemplateColumns: "48px 1fr",
    gap: 14,
    padding: 20,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#ffffff",
  },
  infoIcon: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#edf6f0",
    color: "#16834f",
  },
  infoLabel: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.1,
  },
  infoTitle: {
    margin: "0 0 7px",
    fontSize: 20,
  },
  infoText: {
    margin: 0,
    color: "#748078",
    fontSize: 12,
    lineHeight: 1.5,
  },
};
