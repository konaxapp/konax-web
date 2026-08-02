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

  const [a, m, d] = String(fecha)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!a || !m || !d) return null;

  return new Date(a, m - 1, d, 0, 0, 0, 0);
}

function formatoFecha(fecha) {
  if (!fecha) return "-";

  const [a, m, d] = String(fecha)
    .slice(0, 10)
    .split("-");

  return a && m && d ? `${d}/${m}/${a}` : fecha;
}

function calcularDias(fechaFin) {
  const fin = fechaLocal(fechaFin);

  if (!fin) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.ceil(
      (fin.getTime() - hoy.getTime()) / 86400000
    )
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

    nuevo_pedido: false,
    pedidos_lavanderia: false,
    historial_lavanderia: false,

    usuarios: true,
    configuracion: true,
  };

  if (codigo === "lavanderia_piloto") {
    return {
      ...base,
      dashboard: true,
      nuevo_pedido: true,
      pedidos_lavanderia: true,
      clientes: true,
      caja: true,
      historial_lavanderia: true,
      usuarios: true,
      configuracion: true,
    };
  }

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
      Object.keys(base).map((codigoModulo) => [
        codigoModulo,
        true,
      ])
    );
  }

  return base;
}

function leerModuloEmpresa(data, codigo) {
  if (!data) return true;

  if (
    Object.prototype.hasOwnProperty.call(data, codigo)
  ) {
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

  if (
    [
      "nuevo_pedido",
      "pedidos_lavanderia",
      "historial_lavanderia",
    ].includes(codigo)
  ) {
    return true;
  }

  return true;
}

export default function Dashboard() {
  const router = useRouter();

  const [modulos, setModulos] = useState({});
  const [permisosUsuario, setPermisosUsuario] =
    useState([]);

  const [empresaNombre, setEmpresaNombre] =
    useState("");
  const [planNombre, setPlanNombre] = useState("");
  const [planCodigo, setPlanCodigo] = useState("");
  const [estadoPlan, setEstadoPlan] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");

  const [usuarioRol, setUsuarioRol] = useState("");
  const [usuarioNombre, setUsuarioNombre] =
    useState("");

  const [estadoSuscripcion, setEstadoSuscripcion] =
    useState("");
  const [fechaInicioPrueba, setFechaInicioPrueba] =
    useState("");
  const [fechaFinPrueba, setFechaFinPrueba] =
    useState("");
  const [diasRestantes, setDiasRestantes] =
    useState(null);

  const [bloqueado, setBloqueado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [esMovil, setEsMovil] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] =
    useState(false);

  useEffect(() => {
    cargarDashboard();

    const actualizarVista = () => {
      const movil = window.innerWidth <= 900;

      setEsMovil(movil);

      if (!movil) {
        setMenuMovilAbierto(false);
      }
    };

    actualizarVista();

    window.addEventListener(
      "resize",
      actualizarVista
    );

    return () => {
      window.removeEventListener(
        "resize",
        actualizarVista
      );
    };
  }, []);

  function esAdministrador(rol = usuarioRol) {
    return [
      "administrador",
      "superadmin",
      "super_admin",
      "admin_master",
      "administrador_master",
    ].includes(normalizar(rol));
  }

  async function salir(mensaje = "") {
    if (mensaje) {
      alert(mensaje);
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );
    }

    localStorage.clear();

    router.replace("/login");
  }

  async function marcarPruebaVencida(empresaId) {
    const { error } = await supabase
      .from("empresas")
      .update({
        estado_suscripcion: "prueba_vencida",
      })
      .eq("id", empresaId)
      .eq("estado_suscripcion", "prueba");

    if (error) {
      console.error(
        "No se pudo actualizar la prueba:",
        error
      );
    }
  }

  async function cargarDashboard() {
    setCargando(true);

    const empresaId =
      localStorage.getItem("empresaId");

    const usuarioId =
      localStorage.getItem("usuarioId");

    if (!empresaId || !usuarioId) {
      await salir(
        "La sesión no es válida. Inicie sesión nuevamente."
      );
      return;
    }

    const { data: usuario, error: errorUsuario } =
      await supabase
        .from("usuarios")
        .select(
          "id, empresa_id, nombre, correo, rol, rol_id, estado"
        )
        .eq("id", usuarioId)
        .maybeSingle();

    if (errorUsuario) {
      alert(
        "Error validando usuario: " +
          errorUsuario.message
      );
      setCargando(false);
      return;
    }

    if (!usuario) {
      await salir(
        "El usuario de la sesión ya no existe."
      );
      return;
    }

    if (normalizar(usuario.estado) !== "activo") {
      await salir(
        "Este usuario se encuentra inactivo."
      );
      return;
    }

    if (
      String(usuario.empresa_id) !==
      String(empresaId)
    ) {
      await salir(
        "La empresa activa no corresponde al usuario autenticado."
      );
      return;
    }

    const { data: empresa, error: errorEmpresa } =
      await supabase
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
      alert(
        "Error cargando empresa: " +
          errorEmpresa.message
      );
      setCargando(false);
      return;
    }

    if (!empresa) {
      await salir(
        "La empresa de esta sesión ya no existe."
      );
      return;
    }

    if (
      normalizar(empresa.estado) ===
        "suspendido" ||
      normalizar(empresa.estado_plan) ===
        "suspendido"
    ) {
      await salir(
        "El servicio de esta empresa está suspendido."
      );
      return;
    }

    let suscripcion = normalizar(
      empresa.estado_suscripcion || "activo"
    );

    const fin = fechaLocal(
      empresa.fecha_fin_prueba
    );

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

    localStorage.setItem(
      "empresaId",
      empresa.id || ""
    );
    localStorage.setItem(
      "empresaNombre",
      empresa.nombre || ""
    );
    localStorage.setItem(
      "usuarioId",
      usuario.id || ""
    );
    localStorage.setItem(
      "usuarioNombre",
      usuario.nombre || ""
    );
    localStorage.setItem(
      "usuarioCorreo",
      usuario.correo || ""
    );
    localStorage.setItem(
      "usuarioRol",
      usuario.rol || ""
    );
    localStorage.setItem(
      "rolId",
      usuario.rol_id || ""
    );
    localStorage.setItem(
      "tipoNegocio",
      empresa.tipo_negocio || ""
    );
    localStorage.setItem(
      "categoriaNegocio",
      empresa.categoria_negocio || ""
    );
    localStorage.setItem(
      "planCodigo",
      empresa.plan_codigo || ""
    );
    localStorage.setItem(
      "planNombre",
      empresa.plan_nombre || ""
    );
    localStorage.setItem(
      "estadoPlan",
      empresa.estado_plan || ""
    );
    localStorage.setItem(
      "estadoEmpresa",
      empresa.estado || ""
    );
    localStorage.setItem(
      "estadoSuscripcion",
      suscripcion
    );

    setEmpresaNombre(
      empresa.nombre || "Empresa"
    );
    setPlanNombre(
      empresa.plan_nombre || "Sin plan"
    );
    setPlanCodigo(
      empresa.plan_codigo || ""
    );
    setEstadoPlan(
      empresa.estado_plan || "Activo"
    );
    setTipoNegocio(
      empresa.tipo_negocio || ""
    );
    setUsuarioRol(usuario.rol || "");
    setUsuarioNombre(usuario.nombre || "");

    setEstadoSuscripcion(suscripcion);
    setFechaInicioPrueba(
      empresa.fecha_inicio_prueba || ""
    );
    setFechaFinPrueba(
      empresa.fecha_fin_prueba || ""
    );
    setDiasRestantes(
      suscripcion === "prueba" &&
        !pruebaVencida
        ? calcularDias(
            empresa.fecha_fin_prueba
          )
        : null
    );

    setBloqueado(accesoBloqueado);

    if (accesoBloqueado) {
      setModulos({});
      setPermisosUsuario([]);
      setCargando(false);
      return;
    }

    const [modulosEmpresa, permisos] =
      await Promise.all([
        cargarModulosEmpresa(
          empresaId,
          empresa.plan_codigo
        ),
        cargarPermisosUsuario(
          empresaId,
          usuarioId
        ),
      ]);

    setModulos(modulosEmpresa);
    setPermisosUsuario(permisos);
    setCargando(false);
  }

  async function cargarModulosEmpresa(
    empresaId,
    codigoPlan
  ) {
    const permitidos =
      construirModulosPorPlan(codigoPlan);

    const { data, error } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (error) {
      alert(
        "Error cargando módulos de empresa: " +
          error.message
      );

      return permitidos;
    }

    const resultado = {};

    Object.keys(permitidos).forEach(
      (codigoModulo) => {
        const incluidoEnPlan = Boolean(
          permitidos[codigoModulo]
        );

        if (!incluidoEnPlan) {
          resultado[codigoModulo] = false;
          return;
        }

        if (
          [
            "dashboard",
            "nuevo_pedido",
            "pedidos_lavanderia",
            "historial_lavanderia",
            "usuarios",
            "configuracion",
          ].includes(codigoModulo)
        ) {
          resultado[codigoModulo] = true;
          return;
        }

        resultado[codigoModulo] = data
          ? leerModuloEmpresa(
              data,
              codigoModulo
            )
          : true;
      }
    );

    return resultado;
  }

  async function cargarPermisosUsuario(
    empresaId,
    usuarioId
  ) {
    const { data, error } = await supabase
      .from("permisos_usuarios_empresa")
      .select("permiso, activo")
      .eq("empresa_id", empresaId)
      .eq("usuario_id", usuarioId)
      .eq("activo", true);

    if (error) {
      alert(
        "Error cargando permisos del usuario: " +
          error.message
      );

      return [];
    }

    return (data || [])
      .map((item) =>
        normalizar(item.permiso)
      )
      .filter(Boolean);
  }

  function puedeVer(
    codigoModulo,
    codigoPermiso = codigoModulo
  ) {
    if (bloqueado) return false;

    const modulo = normalizar(codigoModulo);
    const permiso = normalizar(codigoPermiso);

    if (!Boolean(modulos?.[modulo])) {
      return false;
    }

    if (esAdministrador()) {
      return true;
    }

    return (
      permiso === "dashboard" ||
      permisosUsuario.includes(permiso)
    );
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

  const esLavanderia =
    normalizar(planCodigo) ===
      "lavanderia_piloto" ||
    normalizar(tipoNegocio) === "lavanderia";

  const modulosMenu = useMemo(() => {
    const listaLavanderia = [
      [
        "Panel",
        "/dashboard",
        "dashboard",
        "▦",
      ],
      [
        "Usuarios y Roles",
        "/usuarios",
        "usuarios",
        "🔐",
      ],
      [
        "Configuración",
        "/admin-configuracion",
        "configuracion",
        "⚙",
      ],
    ];

    const listaGeneral = [
      [
        "Panel",
        "/dashboard",
        "dashboard",
        "▦",
      ],
      [
        "Clientes",
        "/clientes",
        "clientes",
        "👥",
      ],
      [
        "Vista Cliente",
        "/vista-cliente",
        "vista_cliente",
        "📄",
      ],
      [
        "Créditos",
        "/ventas-credito",
        "creditos",
        "💳",
      ],
      ["Caja", "/caja", "caja", "▣"],
      [
        "Cobranza",
        "/cobranza",
        "cobranza",
        "$",
      ],
      [
        "Centro de Cobranza",
        "/dashboard-cobranza",
        "dashboard_cobros",
        "📊",
      ],
      [
        "Mi cartera de cobro",
        "/gestor-cobros",
        "gestor_cobros",
        "💼",
      ],
      [
        "Control Caja",
        "/control-caja",
        "control_caja",
        "🏦",
      ],
      [
        "Inventario",
        "/inventario",
        "inventario",
        "□",
      ],
      [
        "Movimientos Inventario",
        "/inventario/movimientos",
        "movimientos_inventario",
        "🔄",
      ],
      [
        "Ventas",
        "/ventas",
        "ventas",
        "🛒",
      ],
      [
        "Centro de Ventas",
        "/dashboard-ventas",
        "dashboard_ventas",
        "📈",
      ],
      [
        "Gastos",
        "/gastos",
        "gastos",
        "🧮",
      ],
      [
        "Suscripciones",
        "/suscripciones",
        "suscripciones",
        "🔁",
      ],
      [
        "Recargos",
        "/recargos",
        "recargos",
        "⚠️",
      ],
      [
        "Reportes",
        "/reportes",
        "reportes",
        "▥",
      ],
      [
        "Usuarios y Roles",
        "/usuarios",
        "usuarios",
        "🔐",
      ],
      [
        "Configuración",
        "/admin-configuracion",
        "configuracion",
        "⚙",
      ],
    ];

    const listaBase = esLavanderia
      ? listaLavanderia
      : listaGeneral;

    const lista =
      esLavanderia && !esAdministrador()
        ? listaBase.filter(
            ([, , codigo]) => codigo !== "usuarios"
          )
        : listaBase;

    return lista
      .map(
        ([nombre, ruta, codigo, icono]) => ({
          nombre,
          ruta,
          codigo,
          icono,
          activo: puedeVer(codigo),
        })
      )
      .filter((item) => item.activo);
  }, [
    modulos,
    permisosUsuario,
    usuarioRol,
    bloqueado,
    esLavanderia,
  ]);

  const accesosRapidos = useMemo(() => {
    if (!esLavanderia) {
      return modulosMenu.filter(
        (item) => item.codigo !== "dashboard"
      );
    }

    const accesosLavanderia = [
      {
        nombre: "Nuevo pedido",
        ruta: "/lavanderia/nuevo-pedido",
        codigo: "nuevo_pedido",
        icono: "➕",
      },
      {
        nombre: "Pedidos",
        ruta: "/lavanderia/pedidos",
        codigo: "pedidos_lavanderia",
        icono: "🧺",
      },
      {
        nombre: "Resumen de caja",
        ruta: "/lavanderia/caja",
        codigo: "caja",
        icono: "💵",
      },
      {
        nombre: "Historial",
        ruta: "/lavanderia/historial",
        codigo: "historial_lavanderia",
        icono: "🕘",
      },
    ];

    return accesosLavanderia.filter((item) =>
      puedeVer(item.codigo)
    );
  }, [
    esLavanderia,
    modulosMenu,
    modulos,
    permisosUsuario,
    usuarioRol,
    bloqueado,
  ]);

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
            La prueba de{" "}
            <strong>{empresaNombre}</strong>{" "}
            finalizó el{" "}
            <strong>
              {formatoFecha(fechaFinPrueba)}
            </strong>
            . Los datos permanecen registrados,
            pero los módulos estarán bloqueados
            hasta activar el plan.
          </p>

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
        </div>
      </div>
    );
  }

  const pruebaActiva =
    estadoSuscripcion === "prueba";

  const pendienteInicio =
    estadoSuscripcion ===
    "pendiente_inicio_prueba";

  const alertaCritica =
    pruebaActiva &&
    diasRestantes !== null &&
    diasRestantes <= 5;

  const fechaPanel = new Intl.DateTimeFormat(
    "es-PA",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(new Date());

  return (
    <div
      style={{
        ...s.layout,
        ...(esMovil ? s.layoutMobile : {}),
      }}
    >
      {!esMovil && (
        <SidebarKonax
          items={modulosMenu}
          onLogout={cerrarSesion}
          tituloActivo="Panel"
        />
      )}

      <main
        style={{
          ...s.main,
          ...(esMovil ? s.mainMobile : {}),
        }}
      >
        {esMovil && (
          <>
            <div style={s.mobileBar}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={s.mobileLogo}
              />

              <button
                type="button"
                onClick={() =>
                  setMenuMovilAbierto(
                    (actual) => !actual
                  )
                }
                style={s.mobileMenuButton}
              >
                <span style={s.hamburgerIcon}>
                  {menuMovilAbierto ? "×" : "☰"}
                </span>
                <span>
                  {menuMovilAbierto
                    ? "Cerrar"
                    : "Menú"}
                </span>
              </button>
            </div>

            {menuMovilAbierto && (
              <div style={s.mobileMenu}>
                {modulosMenu.map((item) => (
                  <button
                    key={item.ruta}
                    type="button"
                    onClick={() => {
                      setMenuMovilAbierto(false);
                      router.push(item.ruta);
                    }}
                    style={{
                      ...s.mobileMenuItem,
                      ...(item.codigo ===
                      "dashboard"
                        ? s.mobileMenuItemActivo
                        : {}),
                    }}
                  >
                    <span>{item.icono}</span>
                    <span>{item.nombre}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={cerrarSesion}
                  style={s.mobileLogout}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </>
        )}

        <header
          style={{
            ...s.topbar,
            ...(esMovil
              ? s.topbarMobile
              : {}),
          }}
        >
          <div>
            <span style={s.eyebrow}>
              {esLavanderia
                ? "KONAX LAVANDERÍA"
                : "PANEL EMPRESARIAL"}
            </span>

            <h1 style={s.pageTitle}>
              {empresaNombre}
            </h1>

            <span style={s.pageSubtitle}>
              {esLavanderia
                ? `Operación diaria · ${fechaPanel}`
                : `Panel general · ${fechaPanel}`}
            </span>
          </div>

          <div
            style={{
              ...s.userBox,
              ...(esMovil
                ? s.userBoxMobile
                : {}),
            }}
          >
            <div style={s.avatar}>
              {String(
                usuarioNombre || "U"
              )
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
          <section
            style={{
              ...s.avisoPendiente,
              ...(esMovil
                ? s.avisoPendienteMobile
                : {}),
            }}
          >
            <div style={s.avisoIcono}>
              ⏱️
            </div>

            <div>
              <span style={s.avisoEtiqueta}>
                PROGRAMA PILOTO APROBADO
              </span>

              <strong style={s.avisoTitulo}>
                La prueba todavía no ha comenzado
              </strong>

              <p style={s.avisoTexto}>
                Un asesor de KONAX activará los
                días cuando la empresa esté lista.
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
              ...(esMovil
                ? s.avisoPruebaMobile
                : {}),
            }}
          >
            <div
              style={{
                ...s.avisoIzquierda,
                ...(esMovil
                  ? s.avisoIzquierdaMobile
                  : {}),
              }}
            >
              <div
                style={{
                  ...s.avisoIcono,
                  ...(esMovil
                    ? s.avisoIconoMobile
                    : {}),
                }}
              >
                ⏱️
              </div>

              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    ...s.avisoEtiqueta,
                    ...(esMovil
                      ? s.avisoEtiquetaMobile
                      : {}),
                  }}
                >
                  PROGRAMA PILOTO ACTIVO
                </span>

                <strong
                  style={{
                    ...s.avisoTitulo,
                    ...(esMovil
                      ? s.avisoTituloMobile
                      : {}),
                  }}
                >
                  Estás utilizando KONAX en período de prueba
                </strong>

                <p
                  style={{
                    ...s.avisoTexto,
                    ...(esMovil
                      ? s.avisoTextoMobile
                      : {}),
                  }}
                >
                  Inicio:{" "}
                  {formatoFecha(fechaInicioPrueba)}
                  {" · "}
                  Vencimiento:{" "}
                  {formatoFecha(fechaFinPrueba)}
                </p>
              </div>
            </div>

            <div
              style={{
                ...s.diasCaja,
                ...(esMovil
                  ? s.diasCajaMobile
                  : {}),
              }}
            >
              <strong
                style={{
                  ...s.diasNumero,
                  ...(esMovil
                    ? s.diasNumeroMobile
                    : {}),
                }}
              >
                {diasRestantes ?? 0}
              </strong>

              <span
                style={{
                  ...s.diasTexto,
                  ...(esMovil
                    ? s.diasTextoMobile
                    : {}),
                }}
              >
                {diasRestantes === 1
                  ? "día restante"
                  : "días restantes"}
              </span>
            </div>
          </section>
        )}

        {esLavanderia ? (
          <>
            <section
              style={{
                ...s.bienvenidaLavanderia,
                ...(esMovil
                  ? s.bienvenidaLavanderiaMobile
                  : {}),
              }}
            >
              <div style={s.bienvenidaTexto}>
                <span
                  style={{
                    ...s.heroTag,
                    ...(esMovil
                      ? s.heroTagLavanderiaMobile
                      : {}),
                  }}
                >
                  OPERACIÓN DE HOY
                </span>

                <h2
                  style={{
                    ...s.tituloLavanderia,
                    ...(esMovil
                      ? s.tituloLavanderiaMobile
                      : {}),
                  }}
                >
                  ¿Qué deseas hacer?
                </h2>

                <p
                  style={{
                    ...s.heroText,
                    ...(esMovil
                      ? s.heroTextLavanderiaMobile
                      : {}),
                  }}
                >
                  Registra pedidos, consulta estados, revisa caja
                  e historial desde el teléfono.
                </p>
              </div>

              <div
                style={{
                  ...s.ilustracionLavanderia,
                  ...(esMovil
                    ? s.ilustracionLavanderiaMobile
                    : {}),
                }}
              >
                <IlustracionLavanderia />
              </div>
            </section>

            <section
              style={{
                ...s.accesosGrid,
                ...(esMovil
                  ? s.accesosGridMobile
                  : {}),
              }}
            >
              {accesosRapidos.map((item) => (
                <button
                  key={item.codigo}
                  type="button"
                  onClick={() =>
                    router.push(item.ruta)
                  }
                  style={s.accesoCard}
                >
                  <span style={s.accesoIcono}>
                    {item.icono}
                  </span>

                  <strong style={s.accesoTitulo}>
                    {item.nombre}
                  </strong>

                  <span style={s.accesoTexto}>
                    Abrir módulo
                  </span>
                </button>
              ))}
            </section>
          </>
        ) : (
          <>
            <section
              style={{
                ...s.heroGrid,
                ...(esMovil
                  ? s.heroGridMobile
                  : {}),
              }}
            >
              <article
                style={{
                  ...s.heroMain,
                  ...(esMovil
                    ? s.heroMainMobile
                    : {}),
                }}
              >
                <div style={s.heroAccent} />

                <div style={s.heroContent}>
                  <span style={s.heroTag}>
                    RESUMEN GENERAL
                  </span>

                  <h2
                    style={{
                      ...s.heroTitle,
                      ...(esMovil
                        ? s.heroTitleMobile
                        : {}),
                    }}
                  >
                    Control total de tu negocio
                  </h2>

                  <p style={s.heroText}>
                    Consulta la información
                    principal de {empresaNombre},
                    organiza el acceso por
                    funciones y mantén cada área
                    bajo control.
                  </p>
                </div>

                <div
                  style={{
                    ...s.heroBadge,
                    ...(esMovil
                      ? s.heroBadgeMobile
                      : {}),
                  }}
                >
                  <span style={s.heroBadgeLabel}>
                    TIPO DE NEGOCIO
                  </span>

                  <strong style={s.heroBadgeValue}>
                    {tipoNegocio ||
                      "No definido"}
                  </strong>
                </div>
              </article>

              <article
                style={{
                  ...s.planPanel,
                  ...(esMovil
                    ? s.planPanelMobile
                    : {}),
                }}
              >
                <div style={s.planTop}>
                  <span style={s.planLabel}>
                    {pruebaActiva
                      ? "PLAN EN PRUEBA"
                      : "PLAN ACTUAL"}
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

                <strong style={s.planName}>
                  {planNombre}
                </strong>

                <div style={s.planDivider} />

                <div style={s.planFooter}>
                  <div>
                    <span style={s.planSmall}>
                      Funciones disponibles
                    </span>

                    <strong style={s.planCount}>
                      {modulosMenu.length}
                    </strong>
                  </div>

                  <div style={s.planSeal}>K</div>
                </div>
              </article>
            </section>

            <section
              style={{
                ...s.bottomGrid,
                ...(esMovil
                  ? s.bottomGridMobile
                  : {}),
              }}
            >
              <Info
                titulo="ACCESO ACTUAL"
                valor={
                  usuarioRol || "Sin rol"
                }
                icono="🛡️"
                detalle="Nivel de acceso asignado a este usuario."
              />

              <Info
                titulo="TIPO DE NEGOCIO"
                valor={
                  tipoNegocio ||
                  "No definido"
                }
                icono="🏢"
                detalle="Configuración aplicada a esta empresa."
              />

              <Info
                titulo="FUNCIONES ACTIVAS"
                valor={String(
                  modulosMenu.length
                )}
                icono="▦"
                detalle="Módulos habilitados para este acceso."
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function IlustracionLavanderia() {
  return (
    <svg
      viewBox="0 0 360 230"
      width="100%"
      height="100%"
      role="img"
      aria-label="Lavadora y canasta de ropa"
    >
      <defs>
        <linearGradient id="washerBody" x1="0" x2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8efea" />
        </linearGradient>

        <linearGradient id="basket" x1="0" x2="1">
          <stop offset="0%" stopColor="#2e9d5b" />
          <stop offset="100%" stopColor="#14703f" />
        </linearGradient>

        <radialGradient id="door" cx="50%" cy="45%">
          <stop offset="0%" stopColor="#6f8997" />
          <stop offset="65%" stopColor="#22313a" />
          <stop offset="100%" stopColor="#111a20" />
        </radialGradient>

        <filter
          id="softShadow"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="8"
            floodColor="#173c2a"
            floodOpacity=".18"
          />
        </filter>
      </defs>

      <g filter="url(#softShadow)">
        <rect
          x="205"
          y="32"
          width="122"
          height="166"
          rx="12"
          fill="url(#washerBody)"
          stroke="#cfd9d2"
          strokeWidth="3"
        />

        <rect
          x="215"
          y="43"
          width="102"
          height="28"
          rx="5"
          fill="#f7faf8"
          stroke="#d6dfd9"
        />

        <circle
          cx="228"
          cy="57"
          r="5"
          fill="#8aa299"
        />

        <circle
          cx="247"
          cy="57"
          r="5"
          fill="#8aa299"
        />

        <rect
          x="273"
          y="51"
          width="30"
          height="11"
          rx="3"
          fill="#173c2a"
        />

        <circle
          cx="266"
          cy="128"
          r="48"
          fill="#e8efeb"
          stroke="#cad6cf"
          strokeWidth="5"
        />

        <circle
          cx="266"
          cy="128"
          r="38"
          fill="url(#door)"
        />

        <ellipse
          cx="255"
          cy="115"
          rx="15"
          ry="10"
          fill="rgba(255,255,255,.18)"
        />

        <g transform="translate(72 120)">
          <path
            d="M0 20 L112 20 L98 92 L14 92 Z"
            fill="url(#basket)"
            stroke="#0f5f35"
            strokeWidth="3"
          />

          <rect
            x="-6"
            y="14"
            width="124"
            height="16"
            rx="8"
            fill="#1a7e47"
          />

          <g
            stroke="#b9e7ca"
            strokeWidth="4"
            opacity=".65"
          >
            <line
              x1="21"
              y1="39"
              x2="19"
              y2="73"
            />
            <line
              x1="43"
              y1="39"
              x2="42"
              y2="76"
            />
            <line
              x1="66"
              y1="39"
              x2="66"
              y2="76"
            />
            <line
              x1="89"
              y1="39"
              x2="91"
              y2="73"
            />
          </g>

          <path
            d="M20 11 Q39 -8 61 11"
            fill="none"
            stroke="#f4f7f5"
            strokeWidth="14"
            strokeLinecap="round"
          />

          <path
            d="M49 10 Q70 -13 94 8"
            fill="none"
            stroke="#2f8b55"
            strokeWidth="14"
            strokeLinecap="round"
          />

          <path
            d="M69 12 Q86 -4 105 10"
            fill="none"
            stroke="#d7efe0"
            strokeWidth="13"
            strokeLinecap="round"
          />
        </g>

        <g transform="translate(286 0)">
          <rect
            x="0"
            y="36"
            width="24"
            height="29"
            rx="3"
            fill="#f7faf8"
            stroke="#cfd9d2"
          />

          <path
            d="M12 36 C8 23 2 18 4 11 C13 13 17 19 16 29 C18 18 25 13 31 13 C31 23 26 31 16 36 Z"
            fill="#2f9156"
          />
        </g>
      </g>
    </svg>
  );
}

function Info({
  titulo,
  valor,
  icono,
  detalle,
}) {
  return (
    <article style={s.infoCard}>
      <div style={s.infoTop}>
        <div style={s.infoIcon}>{icono}</div>
        <span style={s.infoLabel}>
          {titulo}
        </span>
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
    gridTemplateColumns:
      "220px minmax(0,1fr)",
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

  main: {
    minWidth: 0,
    padding: "30px 34px 44px",
    background:
      "linear-gradient(180deg,#f8faf9 0%,#f1f5f2 100%)",
  },

  topbar: {
    maxWidth: 1440,
    margin: "0 auto 24px",
    paddingBottom: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    borderBottom:
      "1px solid #dfe7e2",
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
    fontSize:
      "clamp(25px,3vw,34px)",
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

  avisoPendiente: {
    maxWidth: 1440,
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns:
      "48px 1fr",
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
    gridTemplateColumns:
      "48px 1fr",
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

  bienvenidaLavanderia: {
    maxWidth: 1440,
    margin: "0 auto 16px",
    padding: 24,
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) minmax(220px,360px)",
    alignItems: "center",
    gap: 18,
    borderRadius: 20,
    background:
      "linear-gradient(135deg,#ffffff,#edf8f1)",
    border: "1px solid #cfe7d8",
    overflow: "hidden",
  },

  bienvenidaTexto: {
    minWidth: 0,
  },

  ilustracionLavanderia: {
    width: "100%",
    minHeight: 190,
    display: "grid",
    placeItems: "center",
  },

  tituloLavanderia: {
    margin: "7px 0 9px",
    fontSize:
      "clamp(29px,4vw,42px)",
  },

  botonPedidoPrincipal: {
    minHeight: 52,
    padding: "13px 20px",
    border: 0,
    borderRadius: 13,
    background: "#16834f",
    color: "#fff",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
  },

  accesosGrid: {
    maxWidth: 1440,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: 12,
  },

  accesoCard: {
    minHeight: 150,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 9,
    border: "1px solid #dfe7e2",
    borderRadius: 17,
    background: "#fff",
    textAlign: "left",
    cursor: "pointer",
  },

  accesoIcono: {
    width: 46,
    height: 46,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#edf8f1",
    fontSize: 21,
  },

  accesoTitulo: {
    fontSize: 17,
  },

  accesoTexto: {
    color: "#718078",
    fontSize: 12,
  },

  heroGrid: {
    maxWidth: 1440,
    margin: "0 auto 20px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1.7fr) minmax(280px,.75fr)",
    gap: 16,
  },

  heroMain: {
    minHeight: 240,
    position: "relative",
    overflow: "hidden",
    padding: "34px 34px 30px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) auto",
    alignItems: "end",
    gap: 24,
    border: "1px solid #dfe7e2",
    borderRadius: 22,
    background: "#ffffff",
    boxShadow:
      "0 14px 34px rgba(28,52,39,.07)",
  },

  heroAccent: {
    position: "absolute",
    inset: "0 auto 0 0",
    width: 8,
    background:
      "linear-gradient(180deg,#16a34a,#0f766e)",
  },

  heroContent: {
    maxWidth: 760,
  },

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
    fontSize:
      "clamp(34px,4vw,52px)",
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
    background:
      "linear-gradient(160deg,#10231a 0%,#173c2a 100%)",
    boxShadow:
      "0 14px 34px rgba(17,48,31,.13)",
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
  },

  planDivider: {
    height: 1,
    margin: "22px 0 18px",
    background:
      "rgba(255,255,255,.12)",
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
  },

  planSeal: {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    border:
      "1px solid rgba(255,255,255,.14)",
    borderRadius: 16,
    background:
      "rgba(255,255,255,.07)",
    color: "#7de0a7",
    fontSize: 24,
    fontWeight: 900,
  },

  bottomGrid: {
    maxWidth: 1440,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: 14,
  },

  infoCard: {
    minHeight: 138,
    padding: 20,
    border: "1px solid #dfe7e2",
    borderRadius: 17,
    background: "#fff",
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
  },

  infoText: {
    margin: 0,
    color: "#748078",
    fontSize: 12,
    lineHeight: 1.5,
  },

  layoutMobile: {
    display: "block",
    width: "100%",
    overflowX: "hidden",
  },

  mainMobile: {
    width: "100%",
    maxWidth: "100%",
    padding: "14px 12px 30px",
    overflowX: "hidden",
  },

  mobileBar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    margin: "-14px -12px 16px",
    padding: "10px 18px 10px 12px",
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    alignItems: "center",
    gap: 12,
    borderBottom:
      "1px solid #dfe7e2",
    background:
      "rgba(255,255,255,.96)",
  },

  mobileLogo: {
    width: 145,
    maxWidth: "52vw",
    height: "auto",
    display: "block",
  },

  mobileMenuButton: {
    minWidth: 104,
    minHeight: 42,
    padding: "9px 14px",
    border: "none",
    borderRadius: 11,
    background: "#173c2a",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
    whiteSpace: "nowrap",
    justifySelf: "end",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  hamburgerIcon: {
    fontSize: 21,
    lineHeight: 1,
    fontWeight: 900,
  },

  mobileMenu: {
    position: "fixed",
    top: 66,
    left: 10,
    right: 10,
    zIndex: 60,
    maxHeight:
      "calc(100vh - 78px)",
    overflowY: "auto",
    padding: 10,
    display: "grid",
    gap: 7,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow:
      "0 24px 60px rgba(15,23,42,.20)",
  },

  mobileMenuItem: {
    minHeight: 46,
    padding: "10px 12px",
    display: "grid",
    gridTemplateColumns:
      "30px minmax(0,1fr)",
    alignItems: "center",
    gap: 9,
    border:
      "1px solid transparent",
    borderRadius: 11,
    background: "#ffffff",
    color: "#213028",
    textAlign: "left",
    fontWeight: 750,
    cursor: "pointer",
  },

  mobileMenuItemActivo: {
    borderColor: "#b9dfc8",
    background: "#edf8f1",
    color: "#14683e",
  },

  mobileLogout: {
    minHeight: 46,
    padding: "10px 12px",
    border: "1px solid #fecaca",
    borderRadius: 11,
    background: "#fff5f5",
    color: "#b42318",
    fontWeight: 850,
    cursor: "pointer",
  },

  topbarMobile: {
    marginBottom: 16,
    paddingBottom: 14,
    display: "grid",
    gridTemplateColumns: "1fr",
    alignItems: "stretch",
    gap: 14,
  },

  userBoxMobile: {
    width: "100%",
    minWidth: 0,
  },

  avisoPendienteMobile: {
    gridTemplateColumns: "1fr",
    padding: 14,
  },

  avisoPruebaMobile: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 76px",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    padding: "9px 10px",
    borderRadius: 14,
  },

  avisoIzquierdaMobile: {
    gridTemplateColumns: "34px minmax(0,1fr)",
    alignItems: "center",
    gap: 8,
  },

  avisoIconoMobile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    fontSize: 16,
  },

  avisoEtiquetaMobile: {
    fontSize: 7,
    letterSpacing: 0.9,
    lineHeight: 1.2,
  },

  avisoTituloMobile: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 1.25,
  },

  avisoTextoMobile: {
    margin: "2px 0 0",
    fontSize: 8.5,
    lineHeight: 1.25,
  },

  diasCajaMobile: {
    width: 76,
    minWidth: 76,
    padding: "7px 4px",
    borderRadius: 10,
  },

  diasNumeroMobile: {
    fontSize: 21,
    lineHeight: 1,
  },

  diasTextoMobile: {
    marginTop: 3,
    fontSize: 7.5,
    lineHeight: 1.1,
  },

  accesosGridMobile: {
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
  },

  bienvenidaLavanderiaMobile: {
    gridTemplateColumns: "1fr",
    padding: "14px 14px 8px",
    gap: 2,
    minHeight: 0,
    marginBottom: 12,
    borderRadius: 17,
  },

  heroTagLavanderiaMobile: {
    marginBottom: 6,
    padding: "5px 8px",
    fontSize: 7.5,
  },

  tituloLavanderiaMobile: {
    margin: "1px 0 5px",
    fontSize: 25,
    lineHeight: 1.08,
    letterSpacing: "-0.4px",
  },

  heroTextLavanderiaMobile: {
    maxWidth: "100%",
    fontSize: 12.5,
    lineHeight: 1.4,
  },

  ilustracionLavanderiaMobile: {
    width: 165,
    height: 105,
    minHeight: 0,
    justifySelf: "start",
    alignSelf: "start",
    placeItems: "center",
    marginTop: 0,
    marginLeft: -8,
  },

  heroGridMobile: {
    gridTemplateColumns: "1fr",
    gap: 14,
  },

  heroMainMobile: {
    minHeight: 0,
    padding: "26px 20px 22px",
    gridTemplateColumns: "1fr",
    alignItems: "start",
    gap: 18,
  },

  heroTitleMobile: {
    fontSize: 36,
    lineHeight: 1.04,
  },

  heroBadgeMobile: {
    width: "100%",
    minWidth: 0,
  },

  planPanelMobile: {
    minHeight: 210,
    padding: 21,
  },

  bottomGridMobile: {
    gridTemplateColumns: "1fr",
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
