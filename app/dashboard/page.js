"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import SidebarKonax from "../../components/SidebarKonax";

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
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

  return Math.max(
    0,
    Math.ceil((fin.getTime() - hoy.getTime()) / 86400000)
  );
}

function construirModulosPorPlan(codigoPlan) {
  const codigo = normalizar(codigoPlan);

  const base = {
    dashboard: true,
    clientes: false,
    vista_cliente: false,
    creditos: false,
    cobranza: false,
    dashboard_cobros: false,
    gestor_cobros: false,
    caja: false,
    control_caja: false,
    reportes: false,
    inventario: false,
    movimientos_inventario: false,
    ventas: false,
    dashboard_ventas: false,
    gastos: false,
    recargos: false,
    suscripciones: false,
    usuarios: true,
    configuracion: true,
  };

  if (codigo === "cobros") {
    return {
      ...base,
      clientes: true,
      vista_cliente: true,
      caja: true,
      cobranza: true,
      dashboard_cobros: true,
      gestor_cobros: true,
      reportes: true,
    };
  }

  if (codigo === "ventas_gestion") {
    return {
      ...base,
      clientes: true,
      vista_cliente: true,
      creditos: true,
      caja: true,
      control_caja: true,
      cobranza: true,
      dashboard_cobros: true,
      gestor_cobros: true,
      reportes: true,
      inventario: true,
      movimientos_inventario: true,
      ventas: true,
      dashboard_ventas: true,
      gastos: true,
      recargos: true,
      suscripciones: true,
    };
  }

  if (codigo === "pro") {
    return Object.fromEntries(
      Object.keys(base).map((codigoModulo) => [codigoModulo, true])
    );
  }

  return base;
}

function leerModuloEmpresa(data, codigo) {
  if (!data) return true;

  if (Object.prototype.hasOwnProperty.call(data, codigo)) {
    return Boolean(data[codigo]);
  }

  const columnasAntiguas = {
    clientes: "clientes",
    vista_cliente: "vista_cliente",
    creditos: "venta_credito",
    caja: "caja",
    control_caja: "control_caja",
    cobranza: "cobranza",
    dashboard_cobros: "dashboard_cobros",
    gestor_cobros: "cobranza",
    reportes: "dashboard_cobros",
    inventario: "inventario",
    movimientos_inventario: "inventario",
    ventas: "venta_credito",
    dashboard_ventas: "dashboard_ventas",
    gastos: "egresos",
    recargos: "recargos",
    suscripciones: "suscripciones",
  };

  const columna = columnasAntiguas[codigo];

  if (
    columna &&
    Object.prototype.hasOwnProperty.call(data, columna)
  ) {
    return Boolean(data[columna]);
  }

  return true;
}

export default function Dashboard() {
  const router = useRouter();

  const [modulos, setModulos] = useState({});
  const [permisosUsuario, setPermisosUsuario] = useState([]);

  const [empresaNombre, setEmpresaNombre] = useState("");
  const [planNombre, setPlanNombre] = useState("");
  const [estadoPlan, setEstadoPlan] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");

  const [usuarioRol, setUsuarioRol] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");

  const [estadoSuscripcion, setEstadoSuscripcion] = useState("");
  const [fechaInicioPrueba, setFechaInicioPrueba] = useState("");
  const [fechaFinPrueba, setFechaFinPrueba] = useState("");
  const [diasRestantes, setDiasRestantes] = useState(null);

  const [bloqueado, setBloqueado] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDashboard();
  }, []);

  function esAdministrador(rol = usuarioRol) {
    return [
      "administrador",
      "superadmin",
      "admin_master",
      "administrador_master",
    ].includes(normalizar(rol));
  }

  async function salir(mensaje = "") {
    if (mensaje) alert(mensaje);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }

    localStorage.clear();
    router.replace("/login");
  }

  async function marcarPruebaVencida(empresaId) {
    const { error } = await supabase
      .from("empresas")
      .update({ estado_suscripcion: "prueba_vencida" })
      .eq("id", empresaId)
      .eq("estado_suscripcion", "prueba");

    if (error) {
      console.error("No se pudo actualizar la prueba:", error);
    }
  }

  async function cargarDashboard() {
    setCargando(true);

    const empresaId = localStorage.getItem("empresaId");
    const usuarioId = localStorage.getItem("usuarioId");

    if (!empresaId || !usuarioId) {
      await salir("La sesión no es válida. Inicie sesión nuevamente.");
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
      await salir("El usuario de la sesión ya no existe.");
      return;
    }

    if (normalizar(usuario.estado) !== "activo") {
      await salir("Este usuario se encuentra inactivo.");
      return;
    }

    if (String(usuario.empresa_id) !== String(empresaId)) {
      await salir("La empresa activa no corresponde al usuario autenticado.");
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
        tipo_negocio,
        categoria_negocio,
        estado_suscripcion,
        fecha_inicio_prueba,
        fecha_fin_prueba
      `)
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      alert("Error cargando empresa: " + errorEmpresa.message);
      setCargando(false);
      return;
    }

    if (!empresa) {
      await salir("La empresa de esta sesión ya no existe.");
      return;
    }

    if (
      normalizar(empresa.estado) === "suspendido" ||
      normalizar(empresa.estado_plan) === "suspendido"
    ) {
      await salir("El servicio de esta empresa está suspendido.");
      return;
    }

    let suscripcion = normalizar(
      empresa.estado_suscripcion || "activo"
    );

    const fin = fechaLocal(empresa.fecha_fin_prueba);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const pruebaVencida =
      suscripcion === "prueba" &&
      fin &&
      fin.getTime() < hoy.getTime();

    if (pruebaVencida) {
      suscripcion = "prueba_vencida";
      await marcarPruebaVencida(empresa.id);
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
      suscripcion === "prueba" && !pruebaVencida
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

  async function cargarModulosEmpresa(empresaId, planCodigo) {
    const permitidos = construirModulosPorPlan(planCodigo);

    const { data, error } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (error) {
      alert("Error cargando módulos de empresa: " + error.message);
      return permitidos;
    }

    const resultado = {};

    Object.keys(permitidos).forEach((codigoModulo) => {
      const incluidoEnPlan = Boolean(permitidos[codigoModulo]);

      if (!incluidoEnPlan) {
        resultado[codigoModulo] = false;
        return;
      }

      if (
        ["dashboard", "usuarios", "configuracion"].includes(codigoModulo)
      ) {
        resultado[codigoModulo] = true;
        return;
      }

      resultado[codigoModulo] = data
        ? leerModuloEmpresa(data, codigoModulo)
        : true;
    });

    return resultado;
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

    return (data || [])
      .map((item) => normalizar(item.permiso))
      .filter(Boolean);
  }

  function puedeVer(codigoModulo, codigoPermiso = codigoModulo) {
    if (bloqueado) return false;

    const modulo = normalizar(codigoModulo);
    const permiso = normalizar(codigoPermiso);

    if (!Boolean(modulos?.[modulo])) {
      return false;
    }

    if (esAdministrador()) {
      return true;
    }

    return permiso === "dashboard" || permisosUsuario.includes(permiso);
  }

  async function cerrarSesion() {
    await salir();
  }

  function contactarKonax() {
    window.open(
      "https://wa.me/50760211024?text=Hola%2C%20deseo%20activar%20un%20plan%20de%20KONAX.",
      "_blank",
      "noopener,noreferrer"
    );
  }

  const modulosMenu = useMemo(() => {
    const lista = [
      ["Panel", "/dashboard", "dashboard", "▦"],
      ["Clientes", "/clientes", "clientes", "👥"],
      ["Vista Cliente", "/vista-cliente", "vista_cliente", "📄"],
      ["Créditos", "/ventas-credito", "creditos", "💳"],
      ["Caja", "/caja", "caja", "▣"],
      ["Cobranza", "/cobranza", "cobranza", "$"],
      ["Centro de Cobranza", "/dashboard-cobranza", "dashboard_cobros", "📊"],
      ["Mi cartera de cobro", "/gestor-cobros", "gestor_cobros", "💼"],
      ["Control Caja", "/control-caja", "control_caja", "🏦"],
      ["Inventario", "/inventario", "inventario", "□"],
      ["Movimientos Inventario", "/inventario/movimientos", "movimientos_inventario", "🔄"],
      ["Ventas", "/ventas", "ventas", "🛒"],
      ["Centro de Ventas", "/dashboard-ventas", "dashboard_ventas", "📈"],
      ["Gastos", "/gastos", "gastos", "🧮"],
      ["Suscripciones", "/suscripciones", "suscripciones", "🔁"],
      ["Recargos", "/recargos", "recargos", "⚠️"],
      ["Reportes", "/reportes", "reportes", "▥"],
      ["Usuarios y Roles", "/usuarios", "usuarios", "🔐"],
      ["Configuración", "/admin-configuracion", "configuracion", "⚙"],
    ];

    return lista
      .map(([nombre, ruta, codigo, icono]) => ({
        nombre,
        ruta,
        codigo,
        icono,
        activo: puedeVer(codigo),
      }))
      .filter((item) => item.activo);
  }, [modulos, permisosUsuario, usuarioRol, bloqueado]);

  if (cargando) {
    return (
      <div style={s.loading}>
        <img src="/konax-logo.png" alt="KONAX" style={s.loadingLogo} />
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

          <span style={s.bloqueoEtiqueta}>PRUEBA FINALIZADA</span>

          <h1 style={s.bloqueoTitulo}>
            El acceso operativo está bloqueado
          </h1>

          <p style={s.bloqueoTexto}>
            La prueba de <strong>{empresaNombre}</strong> finalizó el{" "}
            <strong>{formatoFecha(fechaFinPrueba)}</strong>. Los datos
            permanecen registrados, pero los módulos estarán bloqueados
            hasta activar un plan.
          </p>

          <div style={s.bloqueoAcciones}>
            <button onClick={contactarKonax} style={s.botonVerde}>
              Contactar a KONAX
            </button>

            <button onClick={cerrarSesion} style={s.botonClaro}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pruebaActiva = estadoSuscripcion === "prueba";
  const pendienteInicio =
    estadoSuscripcion === "pendiente_inicio_prueba";

  const alertaCritica =
    pruebaActiva &&
    diasRestantes !== null &&
    diasRestantes <= 5;

  const fechaPanel = new Intl.DateTimeFormat("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div style={s.layout}>
      <SidebarKonax
        items={modulosMenu}
        onLogout={cerrarSesion}
        tituloActivo="Panel"
      />

      <main style={s.main}>
        <header style={s.topbar}>
          <div>
            <span style={s.eyebrow}>PANEL EMPRESARIAL</span>
            <h1 style={s.pageTitle}>{empresaNombre}</h1>
            <span style={s.pageSubtitle}>
              Panel general · {fechaPanel}
            </span>
          </div>

          <div style={s.userBox}>
            <div style={s.avatar}>
              {String(usuarioNombre || "U").charAt(0).toUpperCase()}
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
              <span style={s.avisoEtiqueta}>PROGRAMA PILOTO APROBADO</span>
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
              ...(alertaCritica ? s.avisoCritico : {}),
            }}
          >
            <div style={s.avisoIzquierda}>
              <div style={s.avisoIcono}>⏱️</div>
              <div>
                <span style={s.avisoEtiqueta}>PROGRAMA PILOTO ACTIVO</span>
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
              <strong style={s.diasNumero}>{diasRestantes ?? 0}</strong>
              <span style={s.diasTexto}>
                {diasRestantes === 1 ? "día restante" : "días restantes"}
              </span>
            </div>
          </section>
        )}

        <section style={s.heroGrid}>
          <article style={s.heroMain}>
            <div style={s.heroAccent} />

            <div style={s.heroContent}>
              <span style={s.heroTag}>RESUMEN GENERAL</span>

              <h2 style={s.heroTitle}>
                Control total de tu negocio
              </h2>

              <p style={s.heroText}>
                Consulta la información principal de {empresaNombre},
                organiza el acceso por funciones y mantén cada área bajo control.
              </p>
            </div>

            <div style={s.heroBadge}>
              <span style={s.heroBadgeLabel}>TIPO DE NEGOCIO</span>
              <strong style={s.heroBadgeValue}>
                {tipoNegocio || "No definido"}
              </strong>
            </div>
          </article>

          <article style={s.planPanel}>
            <div style={s.planTop}>
              <span style={s.planLabel}>
                {pruebaActiva ? "PLAN EN PRUEBA" : "PLAN ACTUAL"}
              </span>

              <span style={s.planStatus}>
                <span style={s.greenDot} />
                {pruebaActiva
                  ? "Prueba activa"
                  : pendienteInicio
                  ? "Pendiente de inicio"
                  : estadoPlan || "Activo"}
              </span>
            </div>

            <strong style={s.planName}>{planNombre}</strong>

            <div style={s.planDivider} />

            <div style={s.planFooter}>
              <div>
                <span style={s.planSmall}>Funciones disponibles</span>
                <strong style={s.planCount}>{modulosMenu.length}</strong>
              </div>

              <div style={s.planSeal}>K</div>
            </div>
          </article>
        </section>

        <section style={s.bottomGrid}>
          <Info
            titulo="ACCESO ACTUAL"
            valor={usuarioRol || "Sin rol"}
            icono="🛡️"
            detalle="Nivel de acceso asignado a este usuario."
          />

          <Info
            titulo="TIPO DE NEGOCIO"
            valor={tipoNegocio || "No definido"}
            icono="🏢"
            detalle="Configuración aplicada a esta empresa."
          />

          <Info
            titulo="FUNCIONES ACTIVAS"
            valor={String(modulosMenu.length)}
            icono="▦"
            detalle="Módulos habilitados para este acceso."
          />
        </section>
      </main>
    </div>
  );
}

function Info({ titulo, valor, icono, detalle }) {
  return (
    <article style={s.infoCard}>
      <div style={s.infoTop}>
        <div style={s.infoIcon}>{icono}</div>
        <span style={s.infoLabel}>{titulo}</span>
      </div>

      <h3 style={s.infoTitle}>{valor}</h3>
      <p style={s.infoText}>{detalle}</p>
    </article>
  );
}

const s = {
  layout: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "220px minmax(0,1fr)",
    background: "#f3f6f4",
    color: "#142019",
    fontFamily: 'Inter, system-ui, "Segoe UI", sans-serif',
  },

  loading: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "#f3f6f4",
    fontFamily: 'Inter, system-ui, "Segoe UI", sans-serif',
  },

  loadingLogo: { width: 210, marginBottom: 10 },
  loadingTitle: { fontSize: 22 },
  loadingText: { color: "#718078", fontSize: 14 },

  main: {
    minWidth: 0,
    padding: "30px 34px 44px",
    background: "linear-gradient(180deg,#f8faf9 0%,#f1f5f2 100%)",
  },

  topbar: {
    maxWidth: 1440,
    margin: "0 auto 24px",
    paddingBottom: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    borderBottom: "1px solid #dfe7e2",
  },

  eyebrow: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.5,
  },

  pageTitle: {
    margin: 0,
    fontSize: "clamp(25px,3vw,34px)",
    lineHeight: 1.1,
    letterSpacing: "-0.6px",
  },

  pageSubtitle: {
    display: "block",
    marginTop: 7,
    color: "#7a867f",
    fontSize: 12,
    textTransform: "capitalize",
  },

  userBox: {
    minWidth: 180,
    padding: "9px 12px",
    display: "flex",
    alignItems: "center",
    gap: 11,
    border: "1px solid #dfe7e2",
    borderRadius: 14,
    background: "#fff",
  },

  avatar: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#173c2a",
    color: "#fff",
    fontWeight: 900,
  },

  userName: { display: "block", fontSize: 13 },
  userRole: {
    display: "block",
    marginTop: 2,
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

  heroGrid: {
    maxWidth: 1440,
    margin: "0 auto 20px",
    display: "grid",
    gridTemplateColumns: "minmax(0,1.7fr) minmax(280px,.75fr)",
    gap: 16,
  },

  heroMain: {
    minHeight: 240,
    position: "relative",
    overflow: "hidden",
    padding: "34px 34px 30px",
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    alignItems: "end",
    gap: 24,
    border: "1px solid #dfe7e2",
    borderRadius: 22,
    background: "#ffffff",
    boxShadow: "0 14px 34px rgba(28,52,39,.07)",
  },

  heroAccent: {
    position: "absolute",
    inset: "0 auto 0 0",
    width: 8,
    background: "linear-gradient(180deg,#16a34a,#0f766e)",
  },

  heroContent: { maxWidth: 760 },

  heroTag: {
    display: "inline-flex",
    marginBottom: 14,
    padding: "7px 10px",
    borderRadius: 999,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.3,
  },

  heroTitle: {
    margin: "0 0 13px",
    color: "#142019",
    fontSize: "clamp(34px,4vw,52px)",
    lineHeight: 1.02,
    letterSpacing: "-1.4px",
  },

  heroText: {
    maxWidth: 660,
    margin: 0,
    color: "#6c7971",
    fontSize: 15,
    lineHeight: 1.7,
  },

  heroBadge: {
    minWidth: 180,
    padding: 18,
    border: "1px solid #d7e7dc",
    borderRadius: 16,
    background: "#f6faf7",
  },

  heroBadgeLabel: {
    display: "block",
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  heroBadgeValue: {
    display: "block",
    marginTop: 9,
    color: "#173c2a",
    fontSize: 20,
  },

  planPanel: {
    minHeight: 240,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    border: "1px solid #173c2a",
    borderRadius: 22,
    background: "linear-gradient(160deg,#10231a 0%,#173c2a 100%)",
    boxShadow: "0 14px 34px rgba(17,48,31,.13)",
  },

  planTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  planLabel: {
    color: "#91d6af",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  planName: {
    display: "block",
    marginTop: 26,
    color: "#fff",
    fontSize: 27,
    lineHeight: 1.15,
  },

  planStatus: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    color: "#dff4e7",
    fontSize: 10,
    fontWeight: 700,
  },

  greenDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#52dd91",
    boxShadow: "0 0 0 4px rgba(82,221,145,.12)",
  },

  planDivider: {
    height: 1,
    margin: "22px 0 18px",
    background: "rgba(255,255,255,.12)",
  },

  planFooter: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 18,
  },

  planSmall: {
    display: "block",
    color: "#b9d8c5",
    fontSize: 10,
  },

  planCount: {
    display: "block",
    marginTop: 6,
    color: "#fff",
    fontSize: 30,
    lineHeight: 1,
  },

  planSeal: {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 16,
    background: "rgba(255,255,255,.07)",
    color: "#7de0a7",
    fontSize: 24,
    fontWeight: 900,
  },

  bottomGrid: {
    maxWidth: 1440,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 14,
  },

  infoCard: {
    minHeight: 138,
    padding: 20,
    border: "1px solid #dfe7e2",
    borderRadius: 17,
    background: "#fff",
    boxShadow: "0 8px 20px rgba(31,52,40,.045)",
  },

  infoTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  infoIcon: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#edf6f0",
    fontSize: 18,
  },

  infoLabel: {
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1,
  },

  infoTitle: {
    margin: "16px 0 7px",
    fontSize: 21,
    lineHeight: 1.15,
  },

  infoText: {
    margin: 0,
    color: "#748078",
    fontSize: 12,
    lineHeight: 1.5,
  },

  bloqueoPagina: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "radial-gradient(circle at top,#174d30,#07100b 70%)",
    fontFamily: 'Inter, system-ui, "Segoe UI", sans-serif',
  },

  bloqueoTarjeta: {
    width: "min(650px,100%)",
    padding: 34,
    borderRadius: 24,
    background: "#fff",
    textAlign: "center",
    boxShadow: "0 28px 70px rgba(0,0,0,.28)",
  },

  bloqueoLogo: { width: 210, maxWidth: "70%" },

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

  bloqueoAcciones: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 22,
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
};
