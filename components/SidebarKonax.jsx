"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

// KONAX Sidebar Desktop
// VERSION 2026.09.02-EMPRESA-MODULOS
//
// REGLA:
// empresa_modulos es la autoridad para decidir qué módulos
// aparecen en el menú de la empresa.
//
// El componente sigue recibiendo "items" desde Dashboard u otra pantalla,
// pero antes de mostrarlos los filtra con los valores reales guardados
// en empresa_modulos.
//
// Inicio y Configuración quedan siempre visibles.
// Usuarios y Roles se conserva visible porque actualmente no existe
// una columna propia "usuarios" en empresa_modulos.

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

const CODIGOS_BASE = new Set([
  "dashboard",
  "configuracion",
  "usuarios",
]);

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function codigoDesdeRuta(ruta = "") {
  const limpia = String(ruta || "")
    .split("?")[0]
    .split("#")[0]
    .replace(/^\/+|\/+$/g, "");

  const primeraParte = limpia.split("/")[0] || "";

  const mapa = {
    dashboard: "dashboard",
    agenda: "agenda",
    clientes: "clientes",
    "vista-cliente": "vista_cliente",
    vista_cliente: "vista_cliente",
    creditos: "creditos",
    credito: "creditos",
    cobranza: "cobranza",
    "dashboard-cobros": "dashboard_cobros",
    dashboard_cobros: "dashboard_cobros",
    "gestor-cobros": "gestor_cobros",
    gestor_cobros: "gestor_cobros",
    caja: "caja",
    "control-caja": "control_caja",
    control_caja: "control_caja",
    gastos: "gastos",
    recargos: "recargos",
    inventario: "inventario",
    "movimientos-inventario": "movimientos_inventario",
    movimientos_inventario: "movimientos_inventario",
    ventas: "ventas",
    "dashboard-ventas": "dashboard_ventas",
    dashboard_ventas: "dashboard_ventas",
    suscripciones: "suscripciones",
    usuarios: "usuarios",
    "admin-configuracion": "configuracion",
    configuracion: "configuracion",
  };

  return mapa[primeraParte] || normalizar(primeraParte);
}

function obtenerCodigoModulo(item) {
  if (item?.codigo) {
    return normalizar(item.codigo);
  }

  return codigoDesdeRuta(item?.ruta || "");
}

export default function SidebarKonax({
  items = [],
  onLogout,
  tituloActivo = "",
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [itemHover, setItemHover] = useState("");
  const [modulosEmpresa, setModulosEmpresa] = useState(null);
  const [cargandoModulos, setCargandoModulos] = useState(true);

  useEffect(() => {
    cargarModulosEmpresa();
  }, []);

  async function cargarModulosEmpresa() {
    try {
      const empresaId =
        localStorage.getItem("empresaId") ||
        localStorage.getItem("empresaAdminCreadaId");

      if (!empresaId) {
        // Si por alguna razón todavía no existe empresaId,
        // no ocultamos el menú para no dejar al usuario atrapado.
        setModulosEmpresa(null);
        setCargandoModulos(false);
        return;
      }

      const { data, error } = await supabase
        .from("empresa_modulos")
        .select("*")
        .eq("empresa_id", empresaId)
        .maybeSingle();

      if (error) {
        console.error(
          "KONAX: no se pudieron cargar empresa_modulos:",
          error
        );

        // Ante un error de lectura, conservamos los items recibidos.
        setModulosEmpresa(null);
        setCargandoModulos(false);
        return;
      }

      setModulosEmpresa(data || {});
    } catch (error) {
      console.error(
        "KONAX: error cargando módulos del sidebar:",
        error
      );

      setModulosEmpresa(null);
    } finally {
      setCargandoModulos(false);
    }
  }

  const itemsVisibles = useMemo(() => {
    // Mientras carga, evitamos que aparezca por un instante
    // el menú completo y luego desaparezca.
    if (cargandoModulos) {
      return [];
    }

    // Si no fue posible leer empresa_modulos, conservamos
    // el comportamiento anterior para no romper navegación.
    if (modulosEmpresa === null) {
      return items;
    }

    return items.filter((item) => {
      const codigo = obtenerCodigoModulo(item);

      if (!codigo) {
        return true;
      }

      if (CODIGOS_BASE.has(codigo)) {
        return true;
      }

      const columna = COLUMNAS_EMPRESA[codigo];

      // Si todavía no existe una columna/control conocido para ese módulo,
      // lo dejamos visible para no dañar perfiles especiales existentes
      // como lavandería o gimnasio.
      if (!columna) {
        return true;
      }

      return Boolean(modulosEmpresa[columna]);
    });
  }, [items, modulosEmpresa, cargandoModulos]);

  function estaActivo(item) {
    if (tituloActivo) {
      return item.nombre === tituloActivo;
    }

    if (item.ruta === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === item.ruta ||
      pathname.startsWith(`${item.ruta}/`)
    );
  }

  function obtenerClave(item) {
    return item.codigo || item.ruta;
  }

  return (
    <>
      <style>{`
        @media (max-width: 900px) {
          .konax-sidebar-desktop {
            display: none !important;
          }
        }
      `}</style>

      <aside
        className="konax-sidebar-desktop"
        style={s.sidebar}
      >
        <div style={s.brand}>
          <div style={s.logoBox}>
            <img
              src="/konax-logo.png"
              alt="KONAX"
              style={s.logo}
            />
          </div>

          <div style={s.brandText}>
            <strong style={s.brandName}>KONAX</strong>
            <span style={s.brandCaption}>
              Gestión empresarial
            </span>
          </div>
        </div>

        <div style={s.divider} />

        <nav style={s.menu}>
          {itemsVisibles.map((item) => {
            const activo = estaActivo(item);
            const clave = obtenerClave(item);
            const hover = itemHover === clave;

            const estiloBoton = activo
              ? s.menuActivo
              : hover
              ? {
                  ...s.menuItem,
                  ...s.menuHover,
                }
              : s.menuItem;

            const estiloIcono = activo
              ? s.menuIconoActivo
              : hover
              ? {
                  ...s.menuIcono,
                  ...s.menuIconoHover,
                }
              : s.menuIcono;

            return (
              <button
                key={clave}
                type="button"
                onClick={() => router.push(item.ruta)}
                onMouseEnter={() => setItemHover(clave)}
                onMouseLeave={() => setItemHover("")}
                style={estiloBoton}
                title={item.nombre}
              >
                <span style={estiloIcono}>
                  {item.icono}
                </span>

                <span style={s.menuTexto}>
                  {item.nombre}
                </span>

                {activo ? (
                  <span style={s.activeDot} />
                ) : (
                  <span
                    style={{
                      ...s.hoverArrow,
                      opacity: hover ? 1 : 0,
                      transform: hover
                        ? "translateX(0)"
                        : "translateX(-4px)",
                    }}
                  >
                    ›
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={s.sidebarFooter}>
          <span style={s.footerLabel}>
            SESIÓN ACTIVA
          </span>

          <button
            type="button"
            onClick={onLogout}
            style={s.logout}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "rgba(255,255,255,.09)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                "rgba(255,255,255,.045)";
            }}
          >
            <span style={s.logoutIcon}>↪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

const s = {
  sidebar: {
    width: "208px",
    minWidth: "208px",
    minHeight: "100vh",
    padding: "16px 10px 14px",
    boxSizing: "border-box",
    background:
      "linear-gradient(180deg,#081510 0%,#0c1f17 56%,#10271d 100%)",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    alignSelf: "start",
    overflowY: "auto",
    borderRight:
      "1px solid rgba(255,255,255,.06)",
  },

  brand: {
    padding: "4px 6px 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  logoBox: {
    width: 52,
    height: 52,
    padding: 6,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#fff",
  },

  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  brandText: {
    minWidth: 0,
    display: "grid",
    gap: 2,
  },

  brandName: {
    color: "#fff",
    fontSize: 15,
    letterSpacing: 1.1,
  },

  brandCaption: {
    color: "#8fa69a",
    fontSize: 9,
  },

  divider: {
    height: 1,
    margin: "0 6px 12px",
    background: "rgba(255,255,255,.08)",
  },

  menu: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  menuItem: {
    width: "100%",
    minHeight: "44px",
    padding: "5px 9px",
    border: "1px solid transparent",
    borderRadius: 11,
    background: "transparent",
    color: "#cdd9d2",
    display: "grid",
    gridTemplateColumns:
      "32px minmax(0,1fr) 10px",
    alignItems: "center",
    gap: 9,
    cursor: "pointer",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "700",
    transition:
      "background .18s ease, color .18s ease, border-color .18s ease, transform .18s ease",
  },

  menuHover: {
    background: "rgba(255,255,255,.075)",
    color: "#ffffff",
    borderColor: "rgba(255,255,255,.08)",
    transform: "translateX(2px)",
  },

  menuActivo: {
    width: "100%",
    minHeight: "44px",
    padding: "5px 9px",
    border:
      "1px solid rgba(96,220,148,.22)",
    borderRadius: 11,
    background: "rgba(42,156,91,.16)",
    color: "#ffffff",
    display: "grid",
    gridTemplateColumns:
      "32px minmax(0,1fr) 10px",
    alignItems: "center",
    gap: 9,
    cursor: "pointer",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "800",
    boxShadow: "inset 3px 0 0 #34c77a",
    transition:
      "background .18s ease, color .18s ease, border-color .18s ease",
  },

  menuIcono: {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background:
      "rgba(255,255,255,.055)",
    fontSize: 15,
    transition:
      "background .18s ease, color .18s ease",
  },

  menuIconoHover: {
    background:
      "rgba(75,209,132,.13)",
    color: "#76e2a6",
  },

  menuIconoActivo: {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background:
      "rgba(75,209,132,.15)",
    color: "#76e2a6",
    fontSize: 15,
  },

  menuTexto: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#69dfa0",
  },

  hoverArrow: {
    color: "#78dca5",
    fontSize: 18,
    lineHeight: 1,
    textAlign: "center",
    transition:
      "opacity .18s ease, transform .18s ease",
  },

  sidebarFooter: {
    marginTop: "auto",
    paddingTop: 16,
  },

  footerLabel: {
    display: "block",
    margin: "0 8px 7px",
    color: "#688074",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  logout: {
    width: "100%",
    minHeight: "42px",
    padding: "0 11px",
    border:
      "1px solid rgba(255,255,255,.1)",
    borderRadius: 11,
    background:
      "rgba(255,255,255,.045)",
    color: "#e6eee9",
    display: "flex",
    alignItems: "center",
    gap: 9,
    fontSize: 11,
    fontWeight: "800",
    cursor: "pointer",
    transition: "background .18s ease",
  },

  logoutIcon: {
    fontSize: 16,
  },
};
