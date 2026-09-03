"use client";

// KONAX Mobile Nav · Barra inferior estilo app · 2026.09.02-AGENDA-BASICA-1
// Agrega modalidad/plan "agenda_basica" sin tocar Gimnasio, Belleza completa ni planes generales.

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

function esPlanAgendaBasica(plan = "", modalidad = "") {
  const texto = normalizar(`${plan || ""} ${modalidad || ""}`);

  return [
    "agenda_basica",
    "konax_agenda",
    "agenda",
    "agenda_10",
    "plan_agenda",
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

// PLAN DE $10 · KONAX AGENDA
// Estas rutas apuntan a secciones de Configuración que construiremos/ajustaremos
// para que el cliente administre su mini sitio de reservas.
const MENU_AGENDA_BASICA = [
  { nombre: "Inicio", ruta: "/dashboard", icono: "⌂" },
  { nombre: "Agenda", ruta: "/agenda", icono: "▣" },
  {
    nombre: "Servicios",
    ruta: "/admin-configuracion?seccion=servicios",
    icono: "✦",
  },
  {
    nombre: "Profesionales",
    ruta: "/admin-configuracion?seccion=profesionales",
    icono: "♙",
  },
  {
    nombre: "Horarios",
    ruta: "/admin-configuracion?seccion=horarios",
    icono: "◷",
  },
  {
    nombre: "Mi sitio de reservas",
    ruta: "/admin-configuracion?seccion=sitio-reservas",
    icono: "↗",
  },
  {
    nombre: "Configuración",
    ruta: "/admin-configuracion",
    icono: "⚙",
  },
];

const MENU_BELLEZA = [
  { nombre: "Dashboard", ruta: "/dashboard", icono: "⌂" },
  { nombre: "Clientes", ruta: "/clientes", icono: "♙" },
  { nombre: "Agenda", ruta: "/agenda", icono: "▣" },
  { nombre: "Caja", ruta: "/caja", icono: "$" },
  { nombre: "Gastos", ruta: "/gastos", icono: "−" },
  { nombre: "Reporte financiero", ruta: "/reporte-financiero", icono: "▥" },
  {
    nombre: "Profesionales",
    ruta: "/admin-configuracion?seccion=profesionales",
    icono: "♙",
  },
  { nombre: "Configuración", ruta: "/admin-configuracion", icono: "⚙" },
];

const MENU_GIMNASIO_ADMIN = [
  { nombre: "Dashboard", ruta: "/dashboard", icono: "⌂" },
  { nombre: "Alumnos", ruta: "/clientes", icono: "♙" },
  { nombre: "Membresías", ruta: "/suscripciones", icono: "▣" },
  { nombre: "Check-in", ruta: "/gimnasio/check-in", icono: "✓" },
  { nombre: "Agenda", ruta: "/agenda", icono: "◷" },
  { nombre: "Caja", ruta: "/caja", icono: "$" },
  { nombre: "Gastos", ruta: "/gastos", icono: "−" },
  { nombre: "Reportes", ruta: "/reportes", icono: "▥" },
  { nombre: "Reporte financiero", ruta: "/reporte-financiero", icono: "▥" },
  { nombre: "Usuarios y Roles", ruta: "/usuarios", icono: "♙" },
  { nombre: "Configuración", ruta: "/admin-configuracion", icono: "⚙" },
];

const MENU_GIMNASIO_OPERATIVO = [
  { nombre: "Dashboard", ruta: "/dashboard", icono: "⌂" },
  { nombre: "Alumnos", ruta: "/clientes", icono: "♙" },
  { nombre: "Membresías", ruta: "/suscripciones", icono: "▣" },
  { nombre: "Check-in", ruta: "/gimnasio/check-in", icono: "✓" },
  { nombre: "Agenda", ruta: "/agenda", icono: "◷" },
  { nombre: "Caja", ruta: "/caja", icono: "$" },
];

const MENU_GENERAL = [
  { nombre: "Dashboard", ruta: "/dashboard", icono: "⌂" },
  { nombre: "Clientes", ruta: "/clientes", icono: "♙" },
  { nombre: "Caja", ruta: "/caja", icono: "$" },
  { nombre: "Configuración", ruta: "/admin-configuracion", icono: "⚙" },
];

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

  if (tipo === "servicios") {
    return (
      <svg {...props}>
        <path d="M12 3v18" />
        <path d="M3 12h18" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    );
  }

  if (tipo === "profesionales") {
    return (
      <svg {...props}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21c.7-4.4 3-6.5 7-6.5s6.3 2.1 7 6.5" />
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
  const [planEmpresa, setPlanEmpresa] = useState("");
  const [modalidadEmpresa, setModalidadEmpresa] = useState("");

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

      const tipo =
        localStorage.getItem("tipoNegocio") ||
        localStorage.getItem("tipo_negocio") ||
        "";

      const categoria =
        localStorage.getItem("categoriaNegocio") ||
        localStorage.getItem("categoria_negocio") ||
        "";

      const rol =
        localStorage.getItem("usuarioRol") ||
        localStorage.getItem("rolUsuario") ||
        "";

      // Lee varias claves para no romper la implementación actual.
      // Cuando definamos la columna definitiva del plan, podemos dejar una sola.
      const plan =
        localStorage.getItem("planCodigo") ||
        localStorage.getItem("plan_codigo") ||
        localStorage.getItem("planEmpresa") ||
        localStorage.getItem("plan_empresa") ||
        localStorage.getItem("plan") ||
        "";

      const modalidad =
        localStorage.getItem("modalidad") ||
        localStorage.getItem("modalidadEmpresa") ||
        localStorage.getItem("modalidad_empresa") ||
        "";

      setMostrar(Boolean(empresaId && usuarioId));
      setEmpresaNombre(localStorage.getItem("empresaNombre") || "KONAX");
      setUsuarioNombre(localStorage.getItem("usuarioNombre") || "Usuario");
      setRolUsuario(rol);
      setTipoNegocio(tipo);
      setCategoriaNegocio(categoria);
      setPlanEmpresa(plan);
      setModalidadEmpresa(modalidad);
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

  const gimnasio = esGimnasio(tipoNegocio, categoriaNegocio);
  const belleza = esBelleza(tipoNegocio, categoriaNegocio);

  // IMPORTANTE:
  // Primero comprobamos agenda básica.
  // Así un salón/barbería/spa con plan de $10 NO entra al menú completo de Belleza.
  const agendaBasica = esPlanAgendaBasica(planEmpresa, modalidadEmpresa);

  const menuVisible = useMemo(() => {
    if (agendaBasica) {
      return MENU_AGENDA_BASICA;
    }

    if (gimnasio) {
      return esAdministrador(rolUsuario)
        ? MENU_GIMNASIO_ADMIN
        : MENU_GIMNASIO_OPERATIVO;
    }

    if (belleza) return MENU_BELLEZA;

    return MENU_GENERAL;
  }, [agendaBasica, gimnasio, belleza, rolUsuario]);

  const tabs = useMemo(() => {
    if (agendaBasica) {
      return [
        { nombre: "Inicio", ruta: "/dashboard", tipo: "home" },
        { nombre: "Agenda", ruta: "/agenda", tipo: "agenda" },
        {
          nombre: "Servicios",
          ruta: "/admin-configuracion?seccion=servicios",
          tipo: "servicios",
        },
        {
          nombre: "Profesionales",
          ruta: "/admin-configuracion?seccion=profesionales",
          tipo: "profesionales",
        },
        { nombre: "Menú", ruta: "", tipo: "menu" },
      ];
    }

    return [
      { nombre: "Inicio", ruta: "/dashboard", tipo: "home" },
      {
        nombre: gimnasio ? "Alumnos" : "Clientes",
        ruta: "/clientes",
        tipo: "clientes",
      },
      { nombre: "Agenda", ruta: "/agenda", tipo: "agenda" },
      { nombre: "Caja", ruta: "/caja", tipo: "caja" },
      { nombre: "Menú", ruta: "", tipo: "menu" },
    ];
  }, [agendaBasica, gimnasio]);

  function estaActivo(ruta) {
    if (!ruta) return false;

    const rutaBase = ruta.split("?")[0];

    if (rutaBase === "/dashboard") return pathname === "/dashboard";

    return pathname === rutaBase || pathname.startsWith(`${rutaBase}/`);
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

  if (!listo || !mostrar) return null;

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
        <nav style={s.bottomBar} aria-label="Navegación principal móvil">
          {tabs.map((item) => {
            const activo =
              item.tipo === "menu" ? abierto : estaActivo(item.ruta);

            return (
              <button
                key={item.nombre}
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
                  activo && item.tipo !== "menu" ? "page" : undefined
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

                <span style={s.tabLabel}>{item.nombre}</span>
              </button>
            );
          })}
        </nav>

        {abierto && (
          <div style={s.overlay} onClick={() => setAbierto(false)}>
            <aside
              style={s.sheet}
              onClick={(event) => event.stopPropagation()}
              aria-label="Menú de KONAX"
            >
              <div style={s.sheetHandle} />

              <div style={s.sheetHeader}>
                <div style={{ minWidth: 0 }}>
                  <span style={s.sheetEyebrow}>
                    {agendaBasica
                      ? "KONAX · AGENDA"
                      : belleza
                      ? "KONAX · SALÓN DE BELLEZA"
                      : gimnasio
                      ? "KONAX · GIMNASIO"
                      : "KONAX"}
                  </span>

                  <strong style={s.sheetEmpresa}>{empresaNombre}</strong>

                  <small style={s.sheetUsuario}>
                    {usuarioNombre}
                    {rolUsuario ? ` · ${rolUsuario}` : ""}
                  </small>

                  {agendaBasica && (
                    <small style={s.planTag}>
                      Plan Agenda · sitio de reservas incluido
                    </small>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  style={s.cerrar}
                  aria-label="Cerrar menú"
                >
                  ×
                </button>
              </div>

              <div style={s.menuGrid}>
                {menuVisible.map((item) => {
                  const rutaBase = item.ruta.split("?")[0];
                  const activo = estaActivo(rutaBase);

                  return (
                    <button
                      key={`${item.nombre}-${item.ruta}`}
                      type="button"
                      onClick={() => navegar(item.ruta)}
                      style={{
                        ...s.menuItem,
                        ...(activo ? s.menuItemActivo : {}),
                      }}
                    >
                      <span style={s.menuIcon}>{item.icono}</span>
                      <span style={s.menuTexto}>{item.nombre}</span>
                      <span style={s.menuArrow}>›</span>
                    </button>
                  );
                })}
              </div>

              <button type="button" onClick={cerrarSesion} style={s.logout}>
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
    gridTemplateColumns: "repeat(5,minmax(0,1fr))",
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
    padding: "8px 14px calc(18px + env(safe-area-inset-bottom))",
    borderRadius: "24px 24px 0 0",
    background: "#ffffff",
    boxShadow: "0 -20px 60px rgba(15,23,42,.22)",
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

  planTag: {
    display: "inline-flex",
    marginTop: 7,
    padding: "5px 8px",
    borderRadius: 999,
    background: "#eaf8f1",
    color: "#0d7b57",
    fontSize: 8.5,
    fontWeight: 850,
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
    gridTemplateColumns: "34px minmax(0,1fr) 16px",
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
