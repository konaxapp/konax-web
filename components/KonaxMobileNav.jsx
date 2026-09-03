"use client";

// KONAX Mobile Nav · 2026.09.02-EMPRESA-MODULOS
//
// REGLA PRINCIPAL:
// - plan_codigo / plan_nombre son referencia comercial.
// - empresa_modulos decide qué módulos aparecen realmente.
// - El plan Agenda ya NO reduce automáticamente la navegación.
// - Inicio y Configuración permanecen visibles como base.
// - Los módulos del negocio se filtran con empresa_modulos.
//
// IMPORTANTE:
// Se conserva la presentación especial de Gimnasio y Belleza,
// pero la disponibilidad real de cada módulo viene de empresa_modulos.

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function esAdministrador(rol) {
  return [
    "administrador",
    "superadmin",
    "super_admin",
    "admin_master",
    "administrador_master",
  ].includes(normalizar(rol));
}

function esGimnasio(tipo, categoria = "") {
  const texto = normalizar(`${tipo || ""} ${categoria || ""}`);

  return ["gimnasio", "gym", "fitness", "academia", "club"].some((p) =>
    texto.includes(p)
  );
}

function esBelleza(tipo, categoria = "") {
  const texto = normalizar(`${tipo || ""} ${categoria || ""}`);

  return [
    "belleza",
    "salon",
    "salon_de_belleza",
    "peluqueria",
    "estetica",
    "barberia",
    "spa",
    "beauty",
  ].some((p) => texto.includes(p));
}

const RUTAS_SIN_MENU = [
  "/",
  "/login",
  "/admin",
  "/registro",
  "/crear-contrasena",
  "/recuperar-contrasena",
  "/restablecer-contrasena",
  "/reservar",
  "/negocios",
];

// Relación entre el código usado por la navegación
// y la columna real guardada en empresa_modulos.
const COLUMNAS_EMPRESA = {
  agenda: "agenda",
  clientes: "clientes",
  vista_cliente: "vista_cliente",
  creditos: "venta_credito",
  ventas: "venta_credito",
  caja: "caja",
  control_caja: "control_caja",
  cobranza: "cobranza",
  gestor_cobros: "cobranza",
  dashboard_cobros: "dashboard_cobros",
  reportes: "dashboard_cobros",
  inventario: "inventario",
  movimientos_inventario: "inventario",
  dashboard_ventas: "dashboard_ventas",
  suscripciones: "suscripciones",
  recargos: "recargos",
  gastos: "egresos",
};

// Estos quedan disponibles aunque no tengan columna propia.
const MODULOS_BASE = new Set([
  "dashboard",
  "configuracion",
]);

// Menú general completo.
// Cada elemento se filtra después usando empresa_modulos.
const MENU_GENERAL = [
  {
    codigo: "dashboard",
    nombre: "Dashboard",
    ruta: "/dashboard",
    icono: "⌂",
  },
  {
    codigo: "agenda",
    nombre: "Agenda",
    ruta: "/agenda",
    icono: "▣",
  },
  {
    codigo: "clientes",
    nombre: "Clientes",
    ruta: "/clientes",
    icono: "♙",
  },
  {
    codigo: "vista_cliente",
    nombre: "Vista Cliente",
    ruta: "/vista-cliente",
    icono: "▤",
  },
  {
    codigo: "creditos",
    nombre: "Créditos",
    ruta: "/creditos",
    icono: "¤",
  },
  {
    codigo: "cobranza",
    nombre: "Cobranza",
    ruta: "/cobranza",
    icono: "☎",
  },
  {
    codigo: "dashboard_cobros",
    nombre: "Centro de Cobranza",
    ruta: "/dashboard-cobros",
    icono: "▥",
  },
  {
    codigo: "gestor_cobros",
    nombre: "Mi cartera de cobro",
    ruta: "/gestor-cobros",
    icono: "▣",
  },
  {
    codigo: "caja",
    nombre: "Caja",
    ruta: "/caja",
    icono: "$",
  },
  {
    codigo: "control_caja",
    nombre: "Control de Caja",
    ruta: "/control-caja",
    icono: "▤",
  },
  {
    codigo: "gastos",
    nombre: "Gastos",
    ruta: "/gastos",
    icono: "−",
  },
  {
    codigo: "recargos",
    nombre: "Recargos",
    ruta: "/recargos",
    icono: "!",
  },
  {
    codigo: "inventario",
    nombre: "Inventario",
    ruta: "/inventario",
    icono: "□",
  },
  {
    codigo: "movimientos_inventario",
    nombre: "Movimientos de inventario",
    ruta: "/movimientos-inventario",
    icono: "↔",
  },
  {
    codigo: "ventas",
    nombre: "Ventas",
    ruta: "/ventas",
    icono: "▣",
  },
  {
    codigo: "dashboard_ventas",
    nombre: "Centro de Ventas",
    ruta: "/dashboard-ventas",
    icono: "▥",
  },
  {
    codigo: "suscripciones",
    nombre: "Suscripciones",
    ruta: "/suscripciones",
    icono: "↻",
  },
  {
    codigo: "reportes",
    nombre: "Reportes",
    ruta: "/reportes",
    icono: "▥",
  },
  {
    codigo: "usuarios",
    nombre: "Usuarios y Roles",
    ruta: "/usuarios",
    icono: "♙",
    soloAdmin: true,
  },
  {
    codigo: "configuracion",
    nombre: "Configuración",
    ruta: "/admin-configuracion",
    icono: "⚙",
  },
];

const MENU_BELLEZA = [
  {
    codigo: "dashboard",
    nombre: "Dashboard",
    ruta: "/dashboard",
    icono: "⌂",
  },
  {
    codigo: "clientes",
    nombre: "Clientes",
    ruta: "/clientes",
    icono: "♙",
  },
  {
    codigo: "agenda",
    nombre: "Agenda",
    ruta: "/agenda",
    icono: "▣",
  },
  {
    codigo: "caja",
    nombre: "Caja",
    ruta: "/caja",
    icono: "$",
  },
  {
    codigo: "gastos",
    nombre: "Gastos",
    ruta: "/gastos",
    icono: "−",
  },
  {
    codigo: "reportes",
    nombre: "Reporte financiero",
    ruta: "/reporte-financiero",
    icono: "▥",
  },
  {
    codigo: "configuracion",
    nombre: "Profesionales",
    ruta: "/admin-configuracion?seccion=profesionales",
    icono: "♙",
  },
  {
    codigo: "usuarios",
    nombre: "Usuarios y Roles",
    ruta: "/usuarios",
    icono: "♙",
    soloAdmin: true,
  },
  {
    codigo: "configuracion",
    nombre: "Configuración",
    ruta: "/admin-configuracion",
    icono: "⚙",
  },
];

const MENU_GIMNASIO_ADMIN = [
  {
    codigo: "dashboard",
    nombre: "Dashboard",
    ruta: "/dashboard",
    icono: "⌂",
  },
  {
    codigo: "clientes",
    nombre: "Alumnos",
    ruta: "/clientes",
    icono: "♙",
  },
  {
    codigo: "suscripciones",
    nombre: "Membresías",
    ruta: "/suscripciones",
    icono: "▣",
  },
  {
    codigo: "checkin_gimnasio",
    nombre: "Check-in",
    ruta: "/gimnasio/check-in",
    icono: "✓",
  },
  {
    codigo: "agenda",
    nombre: "Agenda",
    ruta: "/agenda",
    icono: "◷",
  },
  {
    codigo: "caja",
    nombre: "Caja",
    ruta: "/caja",
    icono: "$",
  },
  {
    codigo: "gastos",
    nombre: "Gastos",
    ruta: "/gastos",
    icono: "−",
  },
  {
    codigo: "reportes",
    nombre: "Reportes",
    ruta: "/reportes",
    icono: "▥",
  },
  {
    codigo: "reportes",
    nombre: "Reporte financiero",
    ruta: "/reporte-financiero",
    icono: "▥",
  },
  {
    codigo: "usuarios",
    nombre: "Usuarios y Roles",
    ruta: "/usuarios",
    icono: "♙",
    soloAdmin: true,
  },
  {
    codigo: "configuracion",
    nombre: "Configuración",
    ruta: "/admin-configuracion",
    icono: "⚙",
  },
];

const MENU_GIMNASIO_OPERATIVO = [
  {
    codigo: "dashboard",
    nombre: "Dashboard",
    ruta: "/dashboard",
    icono: "⌂",
  },
  {
    codigo: "clientes",
    nombre: "Alumnos",
    ruta: "/clientes",
    icono: "♙",
  },
  {
    codigo: "suscripciones",
    nombre: "Membresías",
    ruta: "/suscripciones",
    icono: "▣",
  },
  {
    codigo: "checkin_gimnasio",
    nombre: "Check-in",
    ruta: "/gimnasio/check-in",
    icono: "✓",
  },
  {
    codigo: "agenda",
    nombre: "Agenda",
    ruta: "/agenda",
    icono: "◷",
  },
  {
    codigo: "caja",
    nombre: "Caja",
    ruta: "/caja",
    icono: "$",
  },
];

// checkin_gimnasio todavía no tiene columna propia conocida
// en empresa_modulos, por eso se conserva para no romper Gimnasio.
const MODULOS_ESPECIALES_SIN_COLUMNA = new Set([
  "checkin_gimnasio",
  "usuarios",
]);

function moduloActivo(codigo, modulosEmpresa) {
  if (!codigo) return true;

  if (MODULOS_BASE.has(codigo)) {
    return true;
  }

  if (MODULOS_ESPECIALES_SIN_COLUMNA.has(codigo)) {
    return true;
  }

  const columna = COLUMNAS_EMPRESA[codigo];

  if (!columna) {
    return true;
  }

  return Boolean(modulosEmpresa?.[columna]);
}

function Icono({ tipo }) {
  const props = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (tipo === "home") {
    return (
      <svg {...props}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </svg>
    );
  }

  if (tipo === "clientes") {
    return (
      <svg {...props}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6" />
        <circle cx="17" cy="9" r="2.3" />
        <path d="M15.5 14.7c2.9-.4 4.7 1.3 5 4.3" />
      </svg>
    );
  }

  if (tipo === "agenda") {
    return (
      <svg {...props}>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4M17 3v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
      </svg>
    );
  }

  if (tipo === "caja") {
    return (
      <svg {...props}>
        <rect x="3" y="6" width="18" height="14" rx="3" />
        <path d="M3 10h18" />
        <path d="M15 15h3" />
        <circle cx="9" cy="15" r="2.4" />
      </svg>
    );
  }

  if (tipo === "configuracion") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export default function KonaxMobileNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [listo, setListo] = useState(false);
  const [mostrar, setMostrar] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const [empresaNombre, setEmpresaNombre] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [rolUsuario, setRolUsuario] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [categoriaNegocio, setCategoriaNegocio] = useState("");

  const [modulosEmpresa, setModulosEmpresa] = useState({});

  useEffect(() => {
    let activo = true;

    const esRutaSinMenu = RUTAS_SIN_MENU.some((ruta) => {
      if (ruta === "/") return pathname === "/";
      return pathname === ruta || pathname.startsWith(`${ruta}/`);
    });

    async function validar() {
      setListo(false);

      if (esRutaSinMenu) {
        if (!activo) return;

        setMostrar(false);
        setAbierto(false);
        setListo(true);
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!activo) return;

      if (error || !data?.session?.user) {
        setMostrar(false);
        setAbierto(false);
        setListo(true);
        return;
      }

      const empresaId =
        localStorage.getItem("empresaId") ||
        localStorage.getItem("empresa_id") ||
        "";

      const usuarioId =
        localStorage.getItem("usuarioId") ||
        localStorage.getItem("usuario_id") ||
        data.session.user.id ||
        "";

      if (!empresaId || !usuarioId) {
        setMostrar(false);
        setAbierto(false);
        setListo(true);
        return;
      }

      let tipo =
        localStorage.getItem("tipoNegocio") ||
        localStorage.getItem("tipo_negocio") ||
        "";

      let categoria =
        localStorage.getItem("categoriaNegocio") ||
        localStorage.getItem("categoria_negocio") ||
        "";

      let nombreEmpresa =
        localStorage.getItem("empresaNombre") || "KONAX";

      const rol =
        localStorage.getItem("usuarioRol") ||
        localStorage.getItem("rolUsuario") ||
        "";

      /*
        Cargamos en paralelo:
        1. Datos reales de la empresa.
        2. Módulos reales activados para esa empresa.

        El plan comercial ya no participa en la decisión del menú.
      */
      const [
        { data: empresa, error: errorEmpresa },
        { data: empresaModulos, error: errorModulos },
      ] = await Promise.all([
        supabase
          .from("empresas")
          .select(`
            id,
            nombre,
            plan_codigo,
            plan_nombre,
            tipo_negocio,
            categoria_negocio
          `)
          .eq("id", empresaId)
          .maybeSingle(),

        supabase
          .from("empresa_modulos")
          .select("*")
          .eq("empresa_id", empresaId)
          .maybeSingle(),
      ]);

      if (!activo) return;

      if (!errorEmpresa && empresa) {
        tipo = empresa.tipo_negocio || tipo;
        categoria = empresa.categoria_negocio || categoria;
        nombreEmpresa = empresa.nombre || nombreEmpresa;

        localStorage.setItem("tipoNegocio", tipo || "");
        localStorage.setItem("categoriaNegocio", categoria || "");
        localStorage.setItem(
          "planCodigo",
          empresa.plan_codigo || ""
        );
        localStorage.setItem(
          "planNombre",
          empresa.plan_nombre || ""
        );
        localStorage.setItem(
          "empresaNombre",
          nombreEmpresa || ""
        );
      } else if (errorEmpresa) {
        console.warn(
          "KONAX Mobile Nav: no se pudo refrescar la empresa.",
          errorEmpresa
        );
      }

      if (errorModulos) {
        console.warn(
          "KONAX Mobile Nav: no se pudieron cargar empresa_modulos.",
          errorModulos
        );
      }

      setMostrar(true);
      setEmpresaNombre(nombreEmpresa);
      setUsuarioNombre(
        localStorage.getItem("usuarioNombre") || "Usuario"
      );
      setRolUsuario(rol);
      setTipoNegocio(tipo);
      setCategoriaNegocio(categoria);
      setModulosEmpresa(
        !errorModulos && empresaModulos
          ? empresaModulos
          : {}
      );
      setListo(true);
    }

    validar();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!activo) return;

        if (event === "SIGNED_OUT" || !session?.user) {
          setMostrar(false);
          setAbierto(false);
          setListo(true);
          return;
        }

        validar();
      }
    );

    return () => {
      activo = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [pathname]);

  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!listo) return;

    if (mostrar) {
      document.body.classList.add("konax-bottom-nav-enabled");
    } else {
      document.body.classList.remove("konax-bottom-nav-enabled");
    }

    return () => {
      document.body.classList.remove("konax-bottom-nav-enabled");
    };
  }, [mostrar, listo]);

  useEffect(() => {
    if (!abierto) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  const gimnasio = esGimnasio(
    tipoNegocio,
    categoriaNegocio
  );

  const belleza =
    !gimnasio &&
    esBelleza(tipoNegocio, categoriaNegocio);

  const menuBase = useMemo(() => {
    if (gimnasio) {
      return esAdministrador(rolUsuario)
        ? MENU_GIMNASIO_ADMIN
        : MENU_GIMNASIO_OPERATIVO;
    }

    if (belleza) {
      return MENU_BELLEZA;
    }

    return MENU_GENERAL;
  }, [gimnasio, belleza, rolUsuario]);

  const menuVisible = useMemo(() => {
    return menuBase.filter((item) => {
      if (
        item.soloAdmin &&
        !esAdministrador(rolUsuario)
      ) {
        return false;
      }

      return moduloActivo(
        item.codigo,
        modulosEmpresa
      );
    });
  }, [menuBase, modulosEmpresa, rolUsuario]);

  /*
    La barra inferior se arma con los módulos realmente activos.

    Orden preferido:
    Inicio → Clientes/Alumnos → Agenda → Caja.

    Si sobran más módulos, aparece Menú.
    Si solo hay Inicio + Agenda + Configuración, verá exactamente esos 3.
  */
  const tabs = useMemo(() => {
    const candidatos = [
      {
        codigo: "dashboard",
        nombre: "Inicio",
        ruta: "/dashboard",
        tipo: "home",
      },
      {
        codigo: "clientes",
        nombre: gimnasio ? "Alumnos" : "Clientes",
        ruta: "/clientes",
        tipo: "clientes",
      },
      {
        codigo: "agenda",
        nombre: "Agenda",
        ruta: "/agenda",
        tipo: "agenda",
      },
      {
        codigo: "caja",
        nombre: "Caja",
        ruta: "/caja",
        tipo: "caja",
      },
    ].filter((item) =>
      moduloActivo(item.codigo, modulosEmpresa)
    );

    const configuracion = {
      codigo: "configuracion",
      nombre: "Configuración",
      ruta: "/admin-configuracion",
      tipo: "configuracion",
    };

    const rutasDirectas = new Set(
      candidatos.map((item) => item.ruta)
    );

    const hayMasOpciones = menuVisible.some((item) => {
      const rutaBase = item.ruta.split("?")[0];

      return (
        !rutasDirectas.has(rutaBase) &&
        rutaBase !== "/admin-configuracion"
      );
    });

    // Caso simple: por ejemplo Inicio + Agenda + Configuración.
    if (!hayMasOpciones && candidatos.length <= 4) {
      return [...candidatos, configuracion].filter(
        (item, index, arreglo) =>
          arreglo.findIndex(
            (otro) => otro.ruta === item.ruta
          ) === index
      );
    }

    // Caso con más módulos:
    // mostramos hasta 4 accesos directos + Menú.
    return [
      ...candidatos.slice(0, 4),
      {
        codigo: "menu",
        nombre: "Menú",
        ruta: "",
        tipo: "menu",
      },
    ];
  }, [gimnasio, modulosEmpresa, menuVisible]);

  function estaActivo(ruta) {
    if (!ruta) return false;

    const rutaBase = ruta.split("?")[0];

    if (rutaBase === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === rutaBase ||
      pathname.startsWith(`${rutaBase}/`)
    );
  }

  function navegar(ruta) {
    if (!ruta) return;

    setAbierto(false);
    router.push(ruta);
  }

  async function cerrarSesion() {
    setAbierto(false);
    setMostrar(false);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }

    localStorage.clear();
    router.replace("/login");
    router.refresh();
  }

  if (!listo || !mostrar) {
    return null;
  }

  return (
    <>
      <style>{`
        .konax-mobile-nav-root {
          display: none;
        }

        @media (max-width: 900px) {
          .konax-mobile-nav-root {
            display: block;
          }

          .konax-sidebar-desktop {
            display: none !important;
          }

          body.konax-bottom-nav-enabled {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: clip !important;
            padding-bottom: calc(78px + env(safe-area-inset-bottom)) !important;
          }

          body.konax-bottom-nav-enabled main {
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      <div className="konax-mobile-nav-root">
        <nav
          style={{
            ...s.bottomBar,
            gridTemplateColumns: `repeat(${tabs.length},minmax(0,1fr))`,
          }}
          aria-label="Navegación principal móvil"
        >
          {tabs.map((item) => {
            const activo =
              item.tipo === "menu"
                ? abierto
                : estaActivo(item.ruta);

            return (
              <button
                key={`${item.codigo}-${item.nombre}`}
                type="button"
                onClick={() =>
                  item.tipo === "menu"
                    ? setAbierto(true)
                    : navegar(item.ruta)
                }
                style={{
                  ...s.tab,
                  ...(activo ? s.tabActivo : {}),
                }}
                aria-current={
                  activo && item.tipo !== "menu"
                    ? "page"
                    : undefined
                }
              >
                <span
                  style={{
                    ...s.tabIcon,
                    ...(activo ? s.tabIconActivo : {}),
                  }}
                >
                  <Icono tipo={item.tipo} />
                </span>

                <span style={s.tabLabel}>
                  {item.nombre}
                </span>
              </button>
            );
          })}
        </nav>

        {abierto && (
          <div
            style={s.overlay}
            onClick={() => setAbierto(false)}
          >
            <aside
              style={s.sheet}
              onClick={(event) =>
                event.stopPropagation()
              }
              aria-label="Menú de KONAX"
            >
              <div style={s.sheetHandle} />

              <div style={s.sheetHeader}>
                <div style={{ minWidth: 0 }}>
                  <span style={s.sheetEyebrow}>
                    {belleza
                      ? "KONAX · SALÓN DE BELLEZA"
                      : gimnasio
                      ? "KONAX · GIMNASIO"
                      : "KONAX"}
                  </span>

                  <strong style={s.sheetEmpresa}>
                    {empresaNombre}
                  </strong>

                  <small style={s.sheetUsuario}>
                    {usuarioNombre}
                    {rolUsuario
                      ? ` · ${rolUsuario}`
                      : ""}
                  </small>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAbierto(false)
                  }
                  style={s.cerrar}
                  aria-label="Cerrar menú"
                >
                  ×
                </button>
              </div>

              <div style={s.menuGrid}>
                {menuVisible.map((item) => {
                  const rutaBase =
                    item.ruta.split("?")[0];

                  const activo =
                    estaActivo(rutaBase);

                  return (
                    <button
                      key={`${item.nombre}-${item.ruta}`}
                      type="button"
                      onClick={() =>
                        navegar(item.ruta)
                      }
                      style={{
                        ...s.menuItem,
                        ...(activo
                          ? s.menuItemActivo
                          : {}),
                      }}
                    >
                      <span style={s.menuIcon}>
                        {item.icono}
                      </span>

                      <span style={s.menuTexto}>
                        {item.nombre}
                      </span>

                      <span style={s.menuArrow}>
                        ›
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={cerrarSesion}
                style={s.logout}
              >
                Cerrar sesión
              </button>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

const s = {
  bottomBar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1400,
    minHeight: 66,
    padding:
      "6px max(6px, env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) max(6px, env(safe-area-inset-left))",
    display: "grid",
    alignItems: "end",
    borderTop: "1px solid #dce5df",
    background: "rgba(255,255,255,.97)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 -8px 28px rgba(15,23,42,.09)",
  },

  tab: {
    minWidth: 0,
    minHeight: 54,
    padding: "5px 2px 3px",
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 3,
    border: 0,
    borderRadius: 12,
    background: "transparent",
    color: "#728078",
    fontFamily: "inherit",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  },

  tabActivo: {
    color: "#0d7b57",
  },

  tabIcon: {
    width: 32,
    height: 28,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
  },

  tabIconActivo: {
    background: "#e7f7ef",
    color: "#0b7a55",
  },

  tabLabel: {
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 9.5,
    lineHeight: 1,
    fontWeight: 800,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2000,
    display: "flex",
    alignItems: "flex-end",
    background: "rgba(7,16,11,.42)",
    backdropFilter: "blur(2px)",
  },

  sheet: {
    width: "100%",
    maxHeight: "82dvh",
    padding:
      "8px 14px calc(18px + env(safe-area-inset-bottom))",
    borderRadius: "24px 24px 0 0",
    background: "#ffffff",
    boxShadow:
      "0 -20px 60px rgba(15,23,42,.22)",
    overflowY: "auto",
    boxSizing: "border-box",
  },

  sheetHandle: {
    width: 44,
    height: 5,
    margin: "0 auto 13px",
    borderRadius: 999,
    background: "#d7dfda",
  },

  sheetHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 13,
    borderBottom: "1px solid #edf1ee",
  },

  sheetEyebrow: {
    display: "block",
    color: "#13825d",
    fontSize: 8.5,
    fontWeight: 950,
    letterSpacing: 1.05,
  },

  sheetEmpresa: {
    display: "block",
    marginTop: 4,
    color: "#13231b",
    fontSize: 18,
    lineHeight: 1.2,
  },

  sheetUsuario: {
    display: "block",
    marginTop: 4,
    color: "#7a8780",
    fontSize: 10,
  },

  cerrar: {
    width: 38,
    height: 38,
    flex: "0 0 auto",
    border: "1px solid #e1e8e4",
    borderRadius: 12,
    background: "#f7faf8",
    color: "#24342b",
    fontSize: 24,
    lineHeight: 1,
    cursor: "pointer",
  },

  menuGrid: {
    marginTop: 12,
    display: "grid",
    gap: 6,
  },

  menuItem: {
    width: "100%",
    minHeight: 48,
    padding: "8px 10px",
    display: "grid",
    gridTemplateColumns:
      "34px minmax(0,1fr) 16px",
    alignItems: "center",
    gap: 9,
    border: "1px solid transparent",
    borderRadius: 12,
    background: "#fff",
    color: "#25352d",
    textAlign: "left",
    fontFamily: "inherit",
    fontWeight: 780,
    cursor: "pointer",
  },

  menuItemActivo: {
    borderColor: "#cce8d8",
    background: "#eef9f3",
    color: "#0d704f",
  },

  menuIcon: {
    width: 32,
    height: 32,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "#edf7f1",
    color: "#14825c",
    fontSize: 16,
    fontWeight: 900,
  },

  menuTexto: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 13,
  },

  menuArrow: {
    color: "#9aa69f",
    fontSize: 20,
  },

  logout: {
    width: "100%",
    minHeight: 46,
    marginTop: 12,
    border: "1px solid #f1d0d0",
    borderRadius: 12,
    background: "#fff7f7",
    color: "#b42318",
    fontWeight: 850,
    cursor: "pointer",
  },
};
