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
    if (tituloActivo) return item.nombre === tituloActivo;
    if (item.ruta === "/dashboard") return pathname === "/dashboard";
    return pathname === item.ruta || pathname.startsWith(`${item.ruta}/`);
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.brand}>
        <div style={s.logoBox}>
          <img src="/konax-logo.png" alt="KONAX" style={s.logo} />
        </div>

        <div style={s.brandText}>
          <strong style={s.brandName}>KONAX</strong>
          <span style={s.brandCaption}>Gestión empresarial</span>
        </div>
      </div>

      <div style={s.divider} />

      <nav style={s.menu}>
        {items.map((item) => {
          const activo = estaActivo(item);

          return (
            <button
              key={item.codigo || item.ruta}
              type="button"
              onClick={() => router.push(item.ruta)}
              style={activo ? s.menuActivo : s.menuItem}
              title={item.nombre}
            >
              <span style={activo ? s.menuIconoActivo : s.menuIcono}>
                {item.icono}
              </span>
              <span style={s.menuTexto}>{item.nombre}</span>
              {activo && <span style={s.activeDot} />}
            </button>
          );
        })}
      </nav>

      <div style={s.sidebarFooter}>
        <span style={s.footerLabel}>SESIÓN ACTIVA</span>
        <button type="button" onClick={onLogout} style={s.logout}>
          <span style={s.logoutIcon}>↪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

const s = {
  sidebar: {
    width: "208px",
    minWidth: "208px",
    minHeight: "100vh",
    padding: "16px 10px 14px",
    boxSizing: "border-box",
    background: "linear-gradient(180deg,#081510 0%,#0c1f17 56%,#10271d 100%)",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    alignSelf: "start",
    overflowY: "auto",
    borderRight: "1px solid rgba(255,255,255,.06)",
  },
  brand: { padding: "4px 6px 12px", display: "flex", alignItems: "center", gap: 10 },
  logoBox: { width: 52, height: 52, padding: 6, display: "grid", placeItems: "center", borderRadius: 14, background: "#fff" },
  logo: { width: "100%", height: "100%", objectFit: "contain" },
  brandText: { minWidth: 0, display: "grid", gap: 2 },
  brandName: { color: "#fff", fontSize: 15, letterSpacing: 1.1 },
  brandCaption: { color: "#8fa69a", fontSize: 9 },
  divider: { height: 1, margin: "0 6px 12px", background: "rgba(255,255,255,.08)" },
  menu: { display: "flex", flexDirection: "column", gap: 4 },
  menuItem: {
    width: "100%", minHeight: 44, padding: "5px 9px", border: "1px solid transparent",
    borderRadius: 11, background: "transparent", color: "#cdd9d2", display: "grid",
    gridTemplateColumns: "32px minmax(0,1fr) 7px", alignItems: "center", gap: 9,
    cursor: "pointer", textAlign: "left", fontSize: 12, fontWeight: 700,
  },
  menuActivo: {
    width: "100%", minHeight: 44, padding: "5px 9px", border: "1px solid rgba(96,220,148,.22)",
    borderRadius: 11, background: "rgba(42,156,91,.16)", color: "#fff", display: "grid",
    gridTemplateColumns: "32px minmax(0,1fr) 7px", alignItems: "center", gap: 9,
    cursor: "pointer", textAlign: "left", fontSize: 12, fontWeight: 800,
    boxShadow: "inset 3px 0 0 #34c77a",
  },
  menuIcono: { width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 9, background: "rgba(255,255,255,.055)", fontSize: 15 },
  menuIconoActivo: { width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 9, background: "rgba(75,209,132,.15)", color: "#76e2a6", fontSize: 15 },
  menuTexto: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  activeDot: { width: 6, height: 6, borderRadius: "50%", background: "#69dfa0" },
  sidebarFooter: { marginTop: "auto", paddingTop: 16 },
  footerLabel: { display: "block", margin: "0 8px 7px", color: "#688074", fontSize: 8, fontWeight: 900, letterSpacing: 1.2 },
  logout: { width: "100%", minHeight: 42, padding: "0 11px", border: "1px solid rgba(255,255,255,.1)", borderRadius: 11, background: "rgba(255,255,255,.045)", color: "#e6eee9", display: "flex", alignItems: "center", gap: 9, fontSize: 11, fontWeight: 800, cursor: "pointer" },
  logoutIcon: { fontSize: 16 },
};
