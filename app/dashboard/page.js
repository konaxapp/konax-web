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

  const [estadoSuscripcion, setEstadoSuscripcion] = useState("");
  const [fechaInicioPrueba, setFechaInicioPrueba] = useState("");
  const [fechaFinPrueba, setFechaFinPrueba] = useState("");
  const [diasRestantes, setDiasRestantes] = useState(null);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    cargarDashboard();
  }, []);

  function salir(mensaje = "") {
    if (mensaje) alert(mensaje);
    localStorage.clear();
    router.replace("/login");
  }

  function fechaLocal(fecha) {
    if (!fecha) return null;
    const [a, m, d] = String(fecha).slice(0, 10).split("-").map(Number);
    if (!a || !m || !d) return null;
    return new Date(a, m - 1, d, 0, 0, 0, 0);
  }

  function formatoFecha(fecha) {
    if (!fecha) return "-";
    const [a, m, d] = String(fecha).slice(0, 10).split("-");
    return a && m && d ? `${d}/${m}/${a}` : fecha;
  }

  function calcularDias(fechaFin) {
    const fin = fechaLocal(fechaFin);
    if (!fin) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return Math.max(0, Math.ceil((fin.getTime() - hoy.getTime()) / 86400000));
  }

  async function marcarVencida(empresaId) {
    const { error } = await supabase
      .from("empresas")
      .update({ estado_suscripcion: "prueba_vencida" })
      .eq("id", empresaId)
      .eq("estado_suscripcion", "prueba");

    if (error) {
      console.error("No se pudo actualizar el estado de la prueba:", error);
    }
  }

  async function cargarDashboard() {
    setCargando(true);

    const empresaId = localStorage.getItem("empresaId");
    const usuarioId = localStorage.getItem("usuarioId");

    if (!empresaId || !usuarioId) {
      salir("La sesión no es válida. Inicie sesión nuevamente.");
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
      salir("El usuario de la sesión ya no existe.");
      return;
    }

    if (String(usuario.estado || "").toLowerCase().trim() !== "activo") {
      salir("Este usuario se encuentra inactivo.");
      return;
    }

    if (String(usuario.empresa_id) !== String(empresaId)) {
      salir("La empresa activa no corresponde al usuario autenticado.");
      return;
    }

    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select(`
        id,
        nombre,
        plan_nombre,
        plan_codigo,
        estado_plan,
        estado,
        estado_pago,
        fecha_proxima_facturacion,
        tipo_negocio,
        categoria_negocio,
        estado_suscripcion,
        es_prueba,
        fecha_aceptacion_piloto,
        fecha_inicio_prueba,
        fecha_fin_prueba,
        dias_prueba,
        extension_prueba_dias,
        fecha_eliminacion_programada,
        estado_datos
      `)
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      alert("Error cargando empresa: " + errorEmpresa.message);
      setCargando(false);
      return;
    }

    if (!empresa) {
      salir("La empresa de esta sesión ya no existe.");
      return;
    }

    const empresaSuspendida =
      String(empresa.estado || "").toLowerCase().trim() === "suspendido";

    const planSuspendido =
      String(empresa.estado_plan || "").toLowerCase().trim() === "suspendido";

    if (empresaSuspendida || planSuspendido) {
      salir("El servicio de esta empresa está suspendido.");
      return;
    }

    let suscripcion = String(
      empresa.estado_suscripcion || "activo"
    ).toLowerCase().trim();

    const fin = fechaLocal(empresa.fecha_fin_prueba);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vencida =
      suscripcion === "prueba" &&
      fin &&
      fin.getTime() < hoy.getTime();

    if (vencida) {
      suscripcion = "prueba_vencida";
      await marcarVencida(empresa.id);
    }

    const accesoBloqueado = [
      "prueba_vencida",
      "pendiente_activacion",
      "cancelado",
    ].includes(suscripcion);

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
    localStorage.setItem("estadoSuscripcion", suscripcion);

    setEmpresaNombre(empresa.nombre || "Empresa");
    setPlanNombre(empresa.plan_nombre || "Sin plan");
    setEstadoPlan(empresa.estado_plan || "Activo");
    setTipoNegocio(empresa.tipo_negocio || "");
    setUsuarioRol(usuario.rol || "");
    setUsuarioNombre(usuario.nombre || "");

    setEstadoSuscripcion(suscripcion);
    setFechaInicioPrueba(empresa.fecha_inicio_prueba || "");
    setFechaFinPrueba(empresa.fecha_fin_prueba || "");
    setDiasRestantes(
      suscripcion === "prueba" && !vencida
        ? calcularDias(empresa.fecha_fin_prueba)
        : null
    );
    setBloqueado(accesoBloqueado);

    if (accesoBloqueado) {
      setModulos({});
      setPermisosUsuario([]);
      setCargando(false);
      return;
    }

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

    const base = {
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

    if (codigo === "cobros") {
      return {
        ...base,
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
        usuarios: true,
        configuracion: true,
      };
    }

    if (codigo === "ventas_gestion") {
      return {
        ...base,
        dashboard: true,
        clientes: true,
        vista_cliente: true,
        caja: true,
        control_caja: true,
        gastos: true,
        inventario: true,
        movimientos_inventario: true,
        ventas: true,
        dashboard_ventas: true,
        suscripciones: true,
        reportes: true,
        usuarios: true,
        configuracion: true,
        creditos: false,
        cobranza: false,
        dashboard_cobros: false,
        gestor_cobros: false,
        abonos: false,
        pagos: false,
        recargos: false,
      };
    }

    if (codigo === "pro") {
      return {
        ...base,
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
        usuarios: true,
        configuracion: true,
      };
    }

    return base;
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

    const mapaFinal = {};

    Object.keys(basePlan).forEach((modulo) => {
      const permitidoPorPlan = Boolean(basePlan[modulo]);

      if (!permitidoPorPlan) {
        mapaFinal[modulo] = false;
        return;
      }

      const siempreActivo = [
        "dashboard",
        "usuarios",
        "configuracion",
      ].includes(modulo);

      mapaFinal[modulo] = siempreActivo
        ? true
        : Boolean(mapaTabla[modulo]);
    });

    mapaFinal.dashboard = true;

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

    return [
      "administrador",
      "superadmin",
      "admin master",
      "administrador master",
    ].includes(rol);
  }

  function puedeVer(codigoModulo, codigoPermiso = codigoModulo) {
    if (bloqueado) return false;

    if (
      codigoModulo !== "dashboard" &&
      !Boolean(modulos?.[codigoModulo])
    ) {
      return false;
    }

    if (esAdministrador()) return true;

    return (
      codigoPermiso === "dashboard" ||
      permisosUsuario.includes(codigoPermiso)
    );
  }

  function abrirModulo(ruta) {
    if (!bloqueado) router.push(ruta);
  }

  function cerrarSesion() {
    localStorage.clear();
    router.replace("/login");
  }

  function contactarKonax() {
    window.open(
      "https://wa.me/50760211024?text=Hola%2C%20deseo%20activar%20un%20plan%20de%20KONAX.",
      "_blank",
      "noopener,noreferrer"
    );
  }

  const modulosMenu = useMemo(
    () => [
      ["Clientes", "/clientes", "clientes", "👥"],
      ["Vista Cliente", "/vista-cliente", "vista_cliente", "📄"],
      ["Créditos", "/ventas-credito", "creditos", "💳"],
      ["Caja", "/caja", "caja", "💵"],
      ["Cobranza", "/cobranza", "cobranza", "📞"],
      ["Centro de Cobranza", "/dashboard-cobranza", "dashboard_cobros", "📊"],
      ["Mi cartera de cobro", "/gestor-cobros", "gestor_cobros", "💼"],
      ["Registrar Abonos", "/abonos", "abonos", "🧾"],
      ["Control Caja", "/control-caja", "control_caja", "🏦"],
      ["Inventario", "/inventario", "inventario", "📦"],
      [
        "Movimientos Inventario",
        "/inventario/movimientos",
        "movimientos_inventario",
        "🔄",
      ],
      ["Ventas", "/ventas", "ventas", "🛒"],
      ["Centro de Ventas", "/dashboard-ventas", "dashboard_ventas", "📈"],
      ["Gastos", "/gastos", "gastos", "🧮"],
      ["Suscripciones", "/suscripciones", "suscripciones", "🔁"],
      ["Recargos", "/recargos", "recargos", "⚠️"],
      ["Reportes", "/reportes", "reportes", "📚"],
      [
        "Usuarios y Roles",
        "/usuarios",
        "usuarios",
        "🔐",
        esAdministrador() && Boolean(modulos?.usuarios),
      ],
      [
        "Configuración",
        "/admin-configuracion",
        "configuracion",
        "⚙️",
        esAdministrador() && Boolean(modulos?.configuracion),
      ],
    ].map(([nombre, ruta, codigo, icono, forzado]) => ({
      nombre,
      ruta,
      icono,
      activo:
        typeof forzado === "boolean"
          ? forzado
          : puedeVer(codigo),
    })),
    [modulos, permisosUsuario, usuarioRol, bloqueado]
  );

  const activos = modulosMenu.filter((item) => item.activo);

  if (cargando) {
    return (
      <div style={s.loading}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.loadingLogo}
        />
        <strong style={s.loadingTitle}>
          Preparando tu espacio de trabajo
        </strong>
        <span style={s.loadingText}>
          Validando empresa, plan y permisos.
        </span>
      </div>
    );
  }

  if (bloqueado) {
    return (
      <div style={s.bloqueoPagina}>
        <div style={s.bloqueoTarjeta}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.bloqueoLogo}
          />
          <div style={s.candado}>🔒</div>
          <span style={s.bloqueoEtiqueta}>
            PRUEBA FINALIZADA
          </span>
          <h1 style={s.bloqueoTitulo}>
            El acceso operativo está bloqueado
          </h1>
          <p style={s.bloqueoTexto}>
            La prueba de <strong>{empresaNombre}</strong> finalizó el{" "}
            <strong>{formatoFecha(fechaFinPrueba)}</strong>. Los datos permanecen
            registrados, pero los módulos estarán bloqueados hasta activar un plan.
          </p>

          <div style={s.bloqueoResumen}>
            <div style={s.bloqueoDato}>
              <span>Plan evaluado</span>
              <strong>{planNombre || "Sin plan"}</strong>
            </div>
            <div style={s.bloqueoDato}>
              <span>Estado</span>
              <strong>Prueba vencida</strong>
            </div>
          </div>

          <div style={s.bloqueoAcciones}>
            <button
              onClick={contactarKonax}
              style={s.botonVerde}
            >
              Contactar a KONAX
            </button>
            <button
              onClick={cerrarSesion}
              style={s.botonClaro}
            >
              Cerrar sesión
            </button>
          </div>

          <p style={s.notaWhatsapp}>
            WhatsApp comercial de KONAX:{" "}
            <strong>6021-1024</strong>.
          </p>
        </div>
      </div>
    );
  }

  const pruebaActiva =
    estadoSuscripcion === "prueba";
  const pendienteInicio =
    estadoSuscripcion === "pendiente_inicio_prueba";
  const alertaCritica =
    pruebaActiva &&
    diasRestantes !== null &&
    diasRestantes <= 5;

  return (
    <div style={s.layout}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.logo}
          />
        </div>

        <nav style={s.nav}>
          {activos.map((item) => (
            <button
              key={item.nombre}
              onClick={() => abrirModulo(item.ruta)}
              style={s.navItem}
            >
              <span>{item.icono}</span>
              <span>{item.nombre}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={cerrarSesion}
          style={s.logout}
        >
          ↪ Cerrar sesión
        </button>
      </aside>

      <main style={s.main}>
        <header style={s.topbar}>
          <div>
            <span style={s.eyebrow}>
              PANEL EMPRESARIAL
            </span>
            <h1 style={s.pageTitle}>
              {empresaNombre}
            </h1>
          </div>

          <div style={s.userBox}>
            <div style={s.avatar}>
              {String(usuarioNombre || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <strong style={s.userName}>
                {usuarioNombre || "Usuario"}
              </strong>
              <span style={s.userRole}>
                {usuarioRol || "Sin rol"}
              </span>
            </div>
          </div>
        </header>

        {pendienteInicio && (
          <section style={s.avisoPendiente}>
            <div style={s.avisoIcono}>⏱️</div>
            <div>
              <span style={s.avisoEtiqueta}>
                PROGRAMA PILOTO APROBADO
              </span>
              <strong style={s.avisoTitulo}>
                La prueba todavía no ha comenzado
              </strong>
              <p style={s.avisoTexto}>
                Un asesor de KONAX activará los días cuando la empresa esté lista.
              </p>
            </div>
          </section>
        )}

        {pruebaActiva && (
          <section
            style={{
              ...s.avisoPrueba,
              ...(alertaCritica
                ? s.avisoCritico
                : {}),
            }}
          >
            <div style={s.avisoIzquierda}>
              <div style={s.avisoIcono}>⏱️</div>
              <div>
                <span style={s.avisoEtiqueta}>
                  PROGRAMA PILOTO ACTIVO
                </span>
                <strong style={s.avisoTitulo}>
                  Estás utilizando KONAX en período de prueba
                </strong>
                <p style={s.avisoTexto}>
                  Inicio: {formatoFecha(fechaInicioPrueba)} · Vencimiento:{" "}
                  {formatoFecha(fechaFinPrueba)}
                </p>
              </div>
            </div>

            <div style={s.diasCaja}>
              <strong style={s.diasNumero}>
                {diasRestantes ?? 0}
              </strong>
              <span style={s.diasTexto}>
                {diasRestantes === 1
                  ? "día restante"
                  : "días restantes"}
              </span>
            </div>
          </section>
        )}

        <section style={s.hero}>
          <div>
            <span style={s.heroTag}>
              CENTRO DE OPERACIONES
            </span>
            <h2 style={s.heroTitle}>
              Todo tu negocio, claro y bajo control.
            </h2>
            <p style={s.heroText}>
              Accede a las funciones principales y mantén organizada la operación
              diaria de {tipoNegocio || "tu empresa"}.
            </p>
          </div>

          <div style={s.planPanel}>
            <span style={s.planLabel}>
              {pruebaActiva
                ? "PLAN EN PRUEBA"
                : "PLAN ACTUAL"}
            </span>
            <strong style={s.planName}>
              {planNombre}
            </strong>
            <div style={s.planStatus}>
              <span style={s.greenDot}></span>
              {pruebaActiva
                ? "Prueba activa"
                : pendienteInicio
                ? "Pendiente de inicio"
                : estadoPlan || "Activo"}
            </div>
            <div style={s.planDivider}></div>
            <span style={s.planSmall}>
              {activos.length} funciones habilitadas
            </span>
          </div>
        </section>

        <section style={s.bottomGrid}>
          <Info
            titulo="ACCESO ACTUAL"
            valor={usuarioRol || "Sin rol"}
            icono="🛡️"
          />
          <Info
            titulo="TIPO DE NEGOCIO"
            valor={tipoNegocio || "No definido"}
            icono="🏢"
          />
          <Info
            titulo="FUNCIONES ACTIVAS"
            valor={String(activos.length)}
            icono="▦"
          />
        </section>
      </main>
    </div>
  );
}

function Info({ titulo, valor, icono }) {
  return (
    <article style={s.infoCard}>
      <div style={s.infoIcon}>{icono}</div>
      <div>
        <span style={s.infoLabel}>
          {titulo}
        </span>
        <h3 style={s.infoTitle}>
          {valor}
        </h3>
        <p style={s.infoText}>
          Información correspondiente a la empresa y al acceso actual.
        </p>
      </div>
    </article>
  );
}

const s = {
  layout: {
    minHeight: "100vh",
    display: "flex",
    background: "#f3f6f4",
    color: "#142019",
    fontFamily:
      'Inter, system-ui, "Segoe UI", sans-serif',
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
      'Inter, system-ui, "Segoe UI", sans-serif',
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
    minHeight: 88,
    display: "flex",
    alignItems: "center",
    padding: "8px 10px 22px",
    borderBottom:
      "1px solid rgba(255,255,255,.08)",
  },
  logo: {
    width: 180,
    maxWidth: "100%",
    height: "auto",
    display: "block",
    objectFit: "contain",
    objectPosition: "left center",
  },
  nav: {
    display: "grid",
    gap: 5,
    paddingTop: 18,
  },
  navItem: {
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
    minHeight: 44,
    marginTop: "auto",
    border:
      "1px solid rgba(255,255,255,.12)",
    borderRadius: 11,
    background:
      "rgba(255,255,255,.05)",
    color: "#fff",
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
    color: "#fff",
    fontWeight: 900,
  },
  userName: {
    display: "block",
    fontSize: 13,
  },
  userRole: {
    display: "block",
    color: "#7d8a82",
    fontSize: 11,
  },
  avisoPendiente: {
    maxWidth: 1440,
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns: "48px 1fr",
    gap: 14,
    padding: 17,
    border: "1px solid #e3c868",
    borderRadius: 16,
    background: "#fff9df",
  },
  avisoPrueba: {
    maxWidth: 1440,
    margin: "0 auto 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    padding: 17,
    border: "1px solid #9ed5b5",
    borderRadius: 16,
    background: "#ecf9f1",
  },
  avisoCritico: {
    borderColor: "#efb1aa",
    background: "#fff0ee",
  },
  avisoIzquierda: {
    display: "grid",
    gridTemplateColumns: "48px 1fr",
    alignItems: "center",
    gap: 14,
  },
  avisoIcono: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#fff",
    fontSize: 22,
  },
  avisoEtiqueta: {
    display: "block",
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },
  avisoTitulo: {
    display: "block",
    marginTop: 4,
    fontSize: 15,
  },
  avisoTexto: {
    margin: "4px 0 0",
    color: "#657169",
    fontSize: 12,
  },
  diasCaja: {
    minWidth: 110,
    padding: 11,
    borderRadius: 13,
    background: "#fff",
    textAlign: "center",
  },
  diasNumero: {
    display: "block",
    color: "#173c2a",
    fontSize: 28,
  },
  diasTexto: {
    display: "block",
    color: "#6f7c74",
    fontSize: 10,
    fontWeight: 800,
  },
  hero: {
    maxWidth: 1440,
    margin: "0 auto 22px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) 270px",
    gap: 20,
    padding: 30,
    borderRadius: 24,
    background:
      "linear-gradient(135deg,#0b1710,#123924 65%,#17673e)",
    boxShadow:
      "0 22px 55px rgba(12,48,29,.18)",
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
    color: "#fff",
    fontSize: "clamp(34px,5vw,56px)",
    lineHeight: 1.02,
  },
  heroText: {
    maxWidth: 680,
    margin: 0,
    color: "#d1e5d8",
    lineHeight: 1.6,
  },
  planPanel: {
    padding: 20,
    border:
      "1px solid rgba(255,255,255,.14)",
    borderRadius: 18,
    background:
      "rgba(255,255,255,.08)",
  },
  planLabel: {
    display: "block",
    color: "#95d8b2",
    fontSize: 10,
    fontWeight: 900,
  },
  planName: {
    display: "block",
    marginTop: 8,
    color: "#fff",
    fontSize: 23,
  },
  planStatus: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    color: "#dff4e7",
    fontSize: 12,
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
    background:
      "rgba(255,255,255,.12)",
  },
  planSmall: {
    color: "#b9d8c5",
    fontSize: 12,
  },
  bottomGrid: {
    maxWidth: 1440,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
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
    background: "#fff",
  },
  infoIcon: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#edf6f0",
  },
  infoLabel: {
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
  },
  infoTitle: {
    margin: "5px 0 7px",
  },
  infoText: {
    margin: 0,
    color: "#748078",
    fontSize: 12,
  },
  bloqueoPagina: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(circle at top,#174d30,#07100b 70%)",
    fontFamily:
      'Inter, system-ui, "Segoe UI", sans-serif',
  },
  bloqueoTarjeta: {
    width: "min(650px,100%)",
    padding: 34,
    borderRadius: 24,
    background: "#fff",
    textAlign: "center",
    boxShadow:
      "0 28px 70px rgba(0,0,0,.28)",
  },
  bloqueoLogo: {
    width: 210,
    maxWidth: "70%",
  },
  candado: {
    width: 66,
    height: 66,
    margin: "20px auto 16px",
    display: "grid",
    placeItems: "center",
    borderRadius: 20,
    background: "#fff0ee",
    fontSize: 30,
  },
  bloqueoEtiqueta: {
    color: "#b42318",
    fontSize: 10,
    fontWeight: 900,
  },
  bloqueoTitulo: {
    margin: "8px 0 12px",
    fontSize: 31,
  },
  bloqueoTexto: {
    color: "#66736b",
    lineHeight: 1.65,
  },
  bloqueoResumen: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,1fr)",
    gap: 12,
    margin: "22px 0",
  },
  bloqueoDato: {
    padding: 15,
    border: "1px solid #e1e8e3",
    borderRadius: 14,
    background: "#f8faf9",
  },
  bloqueoAcciones: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
  },
  botonVerde: {
    minHeight: 44,
    padding: "10px 17px",
    border: "none",
    borderRadius: 11,
    background: "#16834f",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  botonClaro: {
    minHeight: 44,
    padding: "10px 17px",
    border: "1px solid #cfd9d2",
    borderRadius: 11,
    background: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  notaWhatsapp: {
    marginTop: 18,
    color: "#8b958f",
    fontSize: 10,
  },
};
