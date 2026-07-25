"use client";

import { usePathname, useRouter } from "next/navigation";

export default function SidebarKonax({
  items = [],
  onLogout,
  tituloActivo = "",
}) {
  const router = useRouter();
  const pathname = usePathname();

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

  return (
    <aside style={s.sidebar}>
      <div style={s.logoBox}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.logo}
        />
      </div>

      <nav style={s.menu}>
        {items.map((item) => {
          const activo = estaActivo(item);

          return (
            <button
              key={item.codigo || item.ruta}
              type="button"
              onClick={() => router.push(item.ruta)}
              style={activo ? s.menuActivo : s.menuItem}
            >
              <span style={s.menuIcono}>
                {item.icono}
              </span>

              <span style={s.menuTexto}>
                {item.nombre}
              </span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        style={s.logout}
      >
        ↪ Cerrar sesión
      </button>
    </aside>
  );
}

const s = {
  sidebar: {
    width: "220px",
    minWidth: "220px",
    minHeight: "100vh",
    padding: "18px 12px",
    boxSizing: "border-box",
    background:
      "linear-gradient(180deg,#07131f 0%,#0b1926 100%)",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    alignSelf: "start",
    overflowY: "auto",
  },

  logoBox: {
    height: "74px",
    padding: "10px",
    marginBottom: "18px",
    display: "grid",
    placeItems: "center",
    borderRadius: "15px",
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
    gap: "9px",
  },

  menuItem: {
    width: "100%",
    minHeight: "52px",
    padding: "0 14px",
    border: 0,
    borderRadius: "11px",
    background: "transparent",
    color: "#e5edf3",
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
    minHeight: "52px",
    padding: "0 14px",
    border: 0,
    borderRadius: "11px",
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
      "0 8px 20px rgba(8,127,64,.28)",
  },

  menuIcono: {
    width: "24px",
    minWidth: "24px",
    fontSize: "19px",
    textAlign: "center",
  },

  menuTexto: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  logout: {
    minHeight: "46px",
    marginTop: "auto",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: "11px",
    background: "rgba(255,255,255,.06)",
    color: "#ffffff",
    fontWeight: "800",
    cursor: "pointer",
  },
};
