"use client";

// KONAX Mobile Nav
// Gimnasio + Salón de Belleza
// VERSION 2026.08.13

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

/* ============================================================
   UTILIDADES
============================================================ */

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

function esVendedor(rol) {
  return normalizar(rol) === "vendedor";
}

/* ============================================================
   TIPOS DE NEGOCIO
============================================================ */

function esGimnasio(tipo, categoria = "") {
  const texto = normalizar(
    `${tipo || ""} ${categoria || ""}`
  );

  return [
    "gimnasio",
    "gym",
    "fitness",
    "academia",
    "club",
  ].some((palabra) => texto.includes(palabra));
}

function esBelleza(tipo, categoria = "") {
  const texto = normalizar(
    `${tipo || ""} ${categoria || ""}`
  );

  return [
    "belleza",
    "salon",
    "salon_de_belleza",
    "peluqueria",
    "estetica",
    "barberia",
    "spa",
  ].some((palabra) => texto.includes(palabra));
}

/* ============================================================
   MENÚ GIMNASIO
============================================================ */

const MENU_GIMNASIO_ADMIN = [
  {
    nombre: "Panel",
    ruta: "/dashboard",
    icono: "▦",
  },
  {
    nombre: "Alumnos",
    ruta: "/clientes",
    icono: "👥",
  },
  {
    nombre: "Membresías",
    ruta: "/suscripciones",
    icono: "▣",
  },
  {
    nombre: "Check-in",
    ruta: "/gimnasio/check-in",
    icono: "✓",
  },
  {
    nombre: "Caja",
    ruta: "/caja",
    icono: "$",
  },
  {
    nombre: "Reportes",
    ruta: "/reportes",
    icono: "▥",
  },
  {
    nombre: "Usuarios y Roles",
    ruta: "/usuarios",
    icono: "🔐",
  },
  {
    nombre: "Configuración",
    ruta: "/admin-configuracion",
    icono: "⚙",
  },
];

const MENU_GIMNASIO_VENDEDOR = [
  {
    nombre: "Panel",
    ruta: "/dashboard",
    icono: "▦",
  },
  {
    nombre: "Alumnos",
    ruta: "/clientes",
    icono: "👥",
  },
  {
    nombre: "Membresías",
    ruta: "/suscripciones",
    icono: "▣",
  },
  {
    nombre: "Check-in",
    ruta: "/gimnasio/check-in",
    icono: "✓",
  },
  {
    nombre: "Caja",
    ruta: "/caja",
    icono: "$",
  },
];

/* ============================================================
   MENÚ SALÓN DE BELLEZA

   Este es el menú que necesitábamos mostrar en móvil.
============================================================ */

const MENU_BELLEZA_ADMIN = [
  {
    nombre: "Panel",
    ruta: "/dashboard",
    icono: "▦",
  },
  {
    nombre: "Clientes",
    ruta: "/clientes",
    icono: "👥",
  },
  {
    nombre: "Agenda",
    ruta: "/agenda",
    icono: "▣",
  },
  {
    nombre: "Caja",
    ruta: "/caja",
    icono: "$",
  },
  {
    nombre: "Configuración",
    ruta: "/admin-configuracion",
    icono: "⚙",
  },
];

const MENU_BELLEZA_VENDEDOR = [
  {
    nombre: "Panel",
    ruta: "/dashboard",
    icono: "▦",
  },
  {
    nombre: "Clientes",
    ruta: "/clientes",
    icono: "👥",
  },
  {
    nombre: "Agenda",
    ruta: "/agenda",
    icono: "▣",
  },
  {
    nombre: "Caja",
    ruta: "/caja",
    icono: "$",
  },
];

/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */

export default function KonaxMobileNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [listo, setListo] = useState(false);
  const [mostrar, setMostrar] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const [empresaNombre, setEmpresaNombre] =
    useState("");

  const [usuarioNombre, setUsuarioNombre] =
    useState("");

  const [rolUsuario, setRolUsuario] =
    useState("");

  const [tipoMenu, setTipoMenu] =
    useState("");

  /* ==========================================================
     VALIDAR SESIÓN Y NEGOCIO
  ========================================================== */

  useEffect(() => {
    let activo = true;

    const rutasSinMenu = [
      "/",
      "/login",
      "/admin",
      "/registro",
      "/recuperar-contrasena",
      "/restablecer-contrasena",
    ];

    const esRutaSinMenu = rutasSinMenu.some(
      (ruta) => {
        if (ruta === "/") {
          return pathname === "/";
        }

        return (
          pathname === ruta ||
          pathname.startsWith(`${ruta}/`)
        );
      }
    );

    async function validarNavegacion() {
      setListo(false);

      /* ---------------------------------------
         RUTAS DONDE NO DEBE APARECER MENÚ
      --------------------------------------- */

      if (esRutaSinMenu) {
        if (!activo) return;

        setMostrar(false);
        setAbierto(false);
        setTipoMenu("");
        setListo(true);

        return;
      }

      /* ---------------------------------------
         VALIDAR SESIÓN SUPABASE
      --------------------------------------- */

      const { data, error } =
        await supabase.auth.getSession();

      if (!activo) return;

      if (
        error ||
        !data?.session?.user
      ) {
        setMostrar(false);
        setAbierto(false);
        setRolUsuario("");
        setTipoMenu("");
        setListo(true);

        return;
      }

      /* ---------------------------------------
         DATOS LOCALES DE EMPRESA
      --------------------------------------- */

      const tipoNegocio =
        localStorage.getItem("tipoNegocio") ||
        localStorage.getItem("tipo_negocio") ||
        "";

      const categoriaNegocio =
        localStorage.getItem(
          "categoriaNegocio"
        ) ||
        localStorage.getItem(
          "categoria_negocio"
        ) ||
        "";

      const rol =
        localStorage.getItem("usuarioRol") ||
        localStorage.getItem("rolUsuario") ||
        "";

      const empresaActiva =
        localStorage.getItem("empresaId") ||
        localStorage.getItem("empresa_id") ||
        "";

      const usuarioActivo =
        localStorage.getItem("usuarioId") ||
        localStorage.getItem("usuario_id") ||
        data.session.user.id ||
        "";

      /* ---------------------------------------
         IDENTIFICAR TIPO DE NEGOCIO
      --------------------------------------- */

      const gimnasio = esGimnasio(
        tipoNegocio,
        categoriaNegocio
      );

      const belleza = esBelleza(
        tipoNegocio,
        categoriaNegocio
      );

      let tipoDetectado = "";

      if (belleza) {
        tipoDetectado = "belleza";
      } else if (gimnasio) {
        tipoDetectado = "gimnasio";
      }

      /* ---------------------------------------
         MENÚ DISPONIBLE
      --------------------------------------- */

      const rolPermitido =
        esAdministrador(rol) ||
        esVendedor(rol);

      const negocioPermitido =
        gimnasio || belleza;

      const habilitado =
        Boolean(empresaActiva) &&
        Boolean(usuarioActivo) &&
        negocioPermitido &&
        rolPermitido;

      if (!activo) return;

      setMostrar(habilitado);
      setTipoMenu(tipoDetectado);

      /* ---------------------------------------
         EMPRESA
      --------------------------------------- */

      const nombreGuardado =
        localStorage.getItem("empresaNombre") ||
        "";

      setEmpresaNombre(
        nombreGuardado ||
          (belleza
            ? "KONAX Salón de Belleza"
            : "KONAX Gimnasio")
      );

      /* ---------------------------------------
         USUARIO
      --------------------------------------- */

      setUsuarioNombre(
        localStorage.getItem(
          "usuarioNombre"
        ) || "Usuario"
      );

      setRolUsuario(rol);
      setListo(true);
    }

    validarNavegacion();

    /* -----------------------------------------
       ESCUCHAR CAMBIOS DE SESIÓN
    ----------------------------------------- */

    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!activo) return;

          if (
            event === "SIGNED_OUT" ||
            !session?.user
          ) {
            setMostrar(false);
            setAbierto(false);
            setRolUsuario("");
            setTipoMenu("");
            setListo(true);

            return;
          }

          validarNavegacion();
        }
      );

    return () => {
      activo = false;

      authListener?.subscription?.unsubscribe();
    };
  }, [pathname]);

  /* ==========================================================
     CERRAR MENÚ CUANDO CAMBIA DE PÁGINA
  ========================================================== */

  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  /* ==========================================================
     AJUSTES RESPONSIVE DE BODY
  ========================================================== */

  useEffect(() => {
    if (!listo) return;

    if (mostrar) {
      document.body.classList.add(
        "konax-mobile-enabled"
      );
    } else {
      document.body.classList.remove(
        "konax-mobile-enabled"
      );
    }

    return () => {
      document.body.classList.remove(
        "konax-mobile-enabled"
      );
    };
  }, [mostrar, listo]);

  /* ==========================================================
     BLOQUEAR SCROLL CUANDO DRAWER ESTÁ ABIERTO
  ========================================================== */

  useEffect(() => {
    if (!abierto) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  /* ==========================================================
     ITEM ACTIVO
  ========================================================== */

  function estaActivo(ruta) {
    if (ruta === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === ruta ||
      pathname.startsWith(`${ruta}/`)
    );
  }

  /* ==========================================================
     CERRAR SESIÓN
  ========================================================== */

  async function cerrarSesion() {
    setAbierto(false);
    setMostrar(false);

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
    router.refresh();
  }

  /* ==========================================================
     SI NO CORRESPONDE, NO MOSTRAR
  ========================================================== */

  if (!listo || !mostrar) {
    return null;
  }

  /* ==========================================================
     ELEGIR MENÚ
  ========================================================== */

  let menuVisible = [];

  if (tipoMenu === "belleza") {
    menuVisible =
      esAdministrador(rolUsuario)
        ? MENU_BELLEZA_ADMIN
        : MENU_BELLEZA_VENDEDOR;
  } else {
    menuVisible =
      esAdministrador(rolUsuario)
        ? MENU_GIMNASIO_ADMIN
        : MENU_GIMNASIO_VENDEDOR;
  }

  const etiquetaNegocio =
    tipoMenu === "belleza"
      ? "KONAX · SALÓN DE BELLEZA"
      : "KONAX GIMNASIOS";

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      {/* ======================================================
          CSS GLOBAL RESPONSIVE
      ====================================================== */}

      <style>{`
        .konax-mobile-nav-root {
          display: none;
        }

        @media (max-width: 900px) {

          .konax-mobile-nav-root {
            display: block;
          }

          /*
            El SidebarKonax de escritorio ya existe.
            Solo lo ocultamos en móvil.
          */

          .konax-sidebar-desktop {
            display: none !important;
          }

          body.konax-mobile-enabled {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }

          body.konax-mobile-enabled main {
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          body.konax-mobile-enabled img,
          body.konax-mobile-enabled svg {
            max-width: 100%;
          }

          body.konax-mobile-enabled input,
          body.konax-mobile-enabled select,
          body.konax-mobile-enabled textarea,
          body.konax-mobile-enabled button {
            box-sizing: border-box;
          }

          body.konax-mobile-enabled
          .konax-mobile-safe {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      <div className="konax-mobile-nav-root">

        {/* ====================================================
            BARRA SUPERIOR MÓVIL
        ==================================================== */}

        <div style={s.barra}>

          <button
            type="button"
            onClick={() =>
              setAbierto(true)
            }
            style={s.menuButton}
            aria-label="Abrir menú"
          >
            <span style={s.hamburguesa}>
              ☰
            </span>

            Menú
          </button>

          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.logoBarra}
          />

          <div style={s.avatar}>
            {String(
              usuarioNombre || "A"
            )
              .charAt(0)
              .toUpperCase()}
          </div>
        </div>

        {/* ====================================================
            DRAWER
        ==================================================== */}

        {abierto && (
          <div
            style={s.overlay}
            onClick={() =>
              setAbierto(false)
            }
          >
            <aside
              style={s.drawer}
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              {/* HEADER */}

              <div style={s.drawerHeader}>

                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <span
                    style={s.drawerEtiqueta}
                  >
                    {etiquetaNegocio}
                  </span>

                  <strong
                    style={s.drawerEmpresa}
                  >
                    {empresaNombre}
                  </strong>

                  <small
                    style={s.drawerUsuario}
                  >
                    {usuarioNombre}
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

              {/* ==============================================
                  OPCIONES DEL MENÚ
              ============================================== */}

              <nav style={s.menu}>

                {menuVisible.map(
                  (item) => {
                    const activo =
                      estaActivo(
                        item.ruta
                      );

                    return (
                      <button
                        key={item.ruta}
                        type="button"
                        onClick={() => {
                          setAbierto(
                            false
                          );

                          router.push(
                            item.ruta
                          );
                        }}
                        style={{
                          ...s.item,
                          ...(activo
                            ? s.itemActivo
                            : {}),
                        }}
                      >

                        <span
                          style={{
                            ...s.itemIcono,
                            ...(activo
                              ? s.itemIconoActivo
                              : {}),
                          }}
                        >
                          {item.icono}
                        </span>

                        <span
                          style={
                            s.itemTexto
                          }
                        >
                          {item.nombre}
                        </span>

                        <span
                          style={s.flecha}
                        >
                          ›
                        </span>

                      </button>
                    );
                  }
                )}

              </nav>

              {/* ==============================================
                  CERRAR SESIÓN
              ============================================== */}

              <button
                type="button"
                onClick={cerrarSesion}
                style={s.logout}
              >
                ↪ Cerrar sesión
              </button>

            </aside>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================
   ESTILOS
============================================================ */

const s = {
  /* ==========================================================
     BARRA SUPERIOR
  ========================================================== */

  barra: {
    position: "sticky",
    top: 0,
    zIndex: 1000,

    width: "100%",
    minHeight: 60,

    padding:
      "8px max(12px, env(safe-area-inset-right)) 8px max(12px, env(safe-area-inset-left))",

    display: "grid",

    gridTemplateColumns:
      "auto minmax(0,1fr) auto",

    alignItems: "center",

    gap: 10,

    boxSizing: "border-box",

    borderBottom:
      "1px solid #dfe7e2",

    background:
      "rgba(255,255,255,.97)",

    backdropFilter:
      "blur(12px)",

    boxShadow:
      "0 5px 18px rgba(15,23,42,.07)",
  },

  /* ==========================================================
     BOTÓN MENÚ
  ========================================================== */

  menuButton: {
    minWidth: 90,
    minHeight: 42,

    padding: "8px 12px",

    display: "inline-flex",

    alignItems: "center",

    justifyContent: "center",

    gap: 7,

    border: 0,

    borderRadius: 12,

    background:
      "linear-gradient(135deg,#173c2a,#0f6a3d)",

    color: "#fff",

    fontSize: 13,

    fontWeight: 850,

    cursor: "pointer",
  },

  hamburguesa: {
    fontSize: 20,
    lineHeight: 1,
  },

  /* ==========================================================
     LOGO
  ========================================================== */

  logoBarra: {
    width: 116,
    height: 38,

    justifySelf: "center",

    objectFit: "contain",
  },

  /* ==========================================================
     AVATAR
  ========================================================== */

  avatar: {
    width: 40,
    height: 40,

    display: "grid",

    placeItems: "center",

    borderRadius: 12,

    background: "#eaf8ef",

    color: "#16834f",

    border:
      "1px solid #cde7d7",

    fontWeight: 900,
  },

  /* ==========================================================
     OVERLAY
  ========================================================== */

  overlay: {
    position: "fixed",

    inset: 0,

    zIndex: 2000,

    background:
      "rgba(5,15,10,.55)",

    backdropFilter:
      "blur(2px)",
  },

  /* ==========================================================
     DRAWER
  ========================================================== */

  drawer: {
    width:
      "min(88vw,340px)",

    height: "100dvh",

    padding:
      "18px 12px max(18px, env(safe-area-inset-bottom))",

    boxSizing: "border-box",

    display: "flex",

    flexDirection: "column",

    background:
      "linear-gradient(180deg,#081510 0%,#0c1f17 56%,#10271d 100%)",

    boxShadow:
      "18px 0 50px rgba(0,0,0,.28)",

    overflowY: "auto",
  },

  /* ==========================================================
     DRAWER HEADER
  ========================================================== */

  drawerHeader: {
    padding:
      "4px 6px 16px",

    display: "flex",

    justifyContent:
      "space-between",

    gap: 10,

    borderBottom:
      "1px solid rgba(255,255,255,.08)",
  },

  drawerEtiqueta: {
    display: "block",

    marginBottom: 5,

    color: "#76e2a6",

    fontSize: 8,

    fontWeight: 900,

    letterSpacing: 1.25,
  },

  drawerEmpresa: {
    display: "block",

    maxWidth: 240,

    color: "#fff",

    fontSize: 17,

    lineHeight: 1.2,
  },

  drawerUsuario: {
    display: "block",

    marginTop: 4,

    color: "#91a79b",

    fontSize: 10,
  },

  /* ==========================================================
     CERRAR DRAWER
  ========================================================== */

  cerrar: {
    width: 40,
    height: 40,

    flexShrink: 0,

    border:
      "1px solid rgba(255,255,255,.10)",

    borderRadius: 11,

    background:
      "rgba(255,255,255,.06)",

    color: "#fff",

    fontSize: 26,

    cursor: "pointer",
  },

  /* ==========================================================
     MENÚ
  ========================================================== */

  menu: {
    marginTop: 14,

    display: "grid",

    gap: 5,
  },

  item: {
    width: "100%",

    minHeight: 50,

    padding: "7px 10px",

    display: "grid",

    gridTemplateColumns:
      "34px minmax(0,1fr) 14px",

    alignItems: "center",

    gap: 9,

    border:
      "1px solid transparent",

    borderRadius: 12,

    background:
      "transparent",

    color: "#d4ded8",

    textAlign: "left",

    fontWeight: 760,

    cursor: "pointer",
  },

  itemActivo: {
    borderColor:
      "rgba(96,220,148,.22)",

    background:
      "rgba(42,156,91,.16)",

    color: "#fff",

    boxShadow:
      "inset 3px 0 0 #34c77a",
  },

  itemIcono: {
    width: 32,
    height: 32,

    display: "grid",

    placeItems: "center",

    borderRadius: 9,

    background:
      "rgba(255,255,255,.055)",
  },

  itemIconoActivo: {
    background:
      "rgba(75,209,132,.15)",

    color: "#76e2a6",
  },

  itemTexto: {
    minWidth: 0,

    overflow: "hidden",

    textOverflow:
      "ellipsis",

    whiteSpace: "nowrap",

    fontSize: 13,
  },

  flecha: {
    color: "#78dca5",

    fontSize: 19,
  },

  /* ==========================================================
     LOGOUT
  ========================================================== */

  logout: {
    width: "100%",

    minHeight: 46,

    marginTop: "auto",

    padding: "10px 12px",

    border:
      "1px solid rgba(255,255,255,.1)",

    borderRadius: 11,

    background:
      "rgba(255,255,255,.045)",

    color: "#e6eee9",

    fontWeight: 800,

    cursor: "pointer",
  },
};
