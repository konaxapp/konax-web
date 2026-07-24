"use client";

import { usePathname, useRouter } from "next/navigation";

const modulos = [
  { icono: "▦", texto: "Panel", ruta: "/dashboard" },
  { icono: "♙", texto: "Clientes", ruta: "/clientes" },
  { icono: "🛒", texto: "Ventas", ruta: "/ventas" },
  { icono: "▣", texto: "Caja", ruta: "/caja" },
  { icono: "□", texto: "Inventario", ruta: "/inventario" },
  { icono: "▤", texto: "Créditos", ruta: "/creditos" },
  { icono: "$", texto: "Cobranza", ruta: "/cobranza" },
  { icono: "▥", texto: "Reportes", ruta: "/reportes" },
  { icono: "⚙", texto: "Configuración", ruta: "/configuracion" },
];

export default function SidebarKonax({
  modulosVisibles = null,
  tituloActivo = "",
}) {
  const router = useRouter();
  const pathname = usePathname();

  const modulosMostrados = modulosVisibles
    ? modulos.filter((modulo) =>
        modulosVisibles.includes(modulo.texto)
      )
    : modulos;

  function estaActivo(modulo) {
    if (tituloActivo) {
      return modulo.texto === tituloActivo;
    }

    if (modulo.ruta === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === modulo.ruta ||
      pathname.startsWith(`${modulo.ruta}/`);
  }

  return (
    <aside style={estilos.sidebar}>
      <div style={estilos.logoBox}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={estilos.logo}
        />
      </div>

      <nav style={estilos.menu}>
        {modulosMostrados.map((modulo) => {
          const activo = estaActivo(modulo);

          return (
            <button
              key={modulo.texto}
              type="button"
              onClick={() => router.push(modulo.ruta)}
              style={
                activo
                  ? estilos.menuActivo
                  : estilos.menuItem
              }
            >
              <span style={estilos.menuIcono}>
                {modulo.icono}
              </span>

              <span style={estilos.menuTexto}>
                {modulo.texto}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

const estilos = {
  sidebar: {
    width: "190px",
    minWidth: "190px",
    minHeight: "100vh",
    padding: "18px 10px",
    boxSizing: "border-box",
    background:
      "linear-gradient(180deg,#07131f 0%,#0b1926 100%)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    position: "sticky",
    top: 0,
  },

  logoBox: {
    height: "72px",
    padding: "10px",
    display: "grid",
    placeItems: "center",
    borderRadius: "14px",
    background: "#ffffff",
  },

  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  menuItem: {
    width: "100%",
    minHeight: "54px",
    padding: "0 14px",
    border: 0,
    borderRadius: "10px",
    background: "transparent",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "700",
  },

  menuActivo: {
    width: "100%",
    minHeight: "54px",
    padding: "0 14px",
    border: 0,
    borderRadius: "10px",
    background:
      "linear-gradient(135deg,#10974d,#087f40)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "800",
    boxShadow:
      "0 8px 20px rgba(8,127,64,.25)",
  },

  menuIcono: {
    width: "25px",
    minWidth: "25px",
    fontSize: "20px",
    textAlign: "center",
  },

  menuTexto: {
    whiteSpace: "nowrap",
  },
};
