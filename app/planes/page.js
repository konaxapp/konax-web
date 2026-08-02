"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { asignarPlanEmpresa } from "../../lib/konaxPlanes";

const OPCIONES_ADMIN = [
  { nombre: "Panel Maestro", ruta: "/admin", icono: "dashboard" },
  { nombre: "Empresas Clientes", ruta: "/empresas", icono: "building" },
  { nombre: "Planes Comerciales", ruta: "/planes", icono: "briefcase" },
  { nombre: "Gestión de Módulos", ruta: "/modulos", icono: "modules" },
  { nombre: "Centro de Gestión", ruta: "/centro-gestion", icono: "chart" },
];

const PLANES = [
  {
    nombre: "KONAX Cobros",
    codigo: "cobros",
    etiqueta: "Cartera y cobranza",
    precioMensual: 49,
    precioAnual: 499,
    usuariosIncluidos: 3,
    color: "#2563eb",
    fondo: "#eff6ff",
    incluye: [
      "3 usuarios incluidos",
      "Clientes",
      "Vista Cliente",
      "Cuentas por Cobrar",
      "Caja Básica",
      "Cobranza",
      "Gestión de Cobros",
      "Promesas de Pago",
      "Dashboard de Cobranza",
      "Usuario adicional: $10.99/mes",
    ],
  },
  {
    nombre: "KONAX Ventas y Gestión",
    codigo: "ventas_gestion",
    etiqueta: "Operación completa",
    precioMensual: 99,
    precioAnual: 999,
    usuariosIncluidos: 6,
    color: "#16834f",
    fondo: "#ecfdf5",
    destacado: true,
    incluye: [
      "6 usuarios incluidos",
      "Todo KONAX Cobros",
      "Inventario",
      "Venta Crédito",
      "Caja",
      "Control de Caja",
      "Gastos / Egresos",
      "Recargos",
      "Dashboard de Ventas",
      "Reportes Operativos",
      "Usuario adicional: $10.99/mes",
    ],
  },
  {
    nombre: "KONAX Lavandería Piloto",
    codigo: "lavanderia_piloto",
    etiqueta: "Plan para lavanderías",
    precioMensual: 20,
    precioAnual: 200,
    usuariosIncluidos: 2,
    color: "#0f766e",
    fondo: "#f0fdfa",
    exclusivoLavanderia: true,
    incluye: [
      "2 usuarios incluidos",
      "Registro de clientes",
      "Nuevo pedido",
      "Pedidos por estado",
      "Recibido",
      "En proceso",
      "Listo para retirar",
      "Entregado",
      "Pago completo, abono o pendiente",
      "Caja básica",
      "Historial de pedidos",
      "Resumen semanal de ventas",
      "Soporte por WhatsApp",
    ],
  },
  {
    nombre: "KONAX Pro",
    codigo: "pro",
    etiqueta: "Gerencia y crecimiento",
    precioMensual: 149,
    precioAnual: 1499,
    usuariosIncluidos: 12,
    color: "#111827",
    fondo: "#f9fafb",
    incluye: [
      "12 usuarios incluidos",
      "Todo KONAX Ventas y Gestión",
      "Dashboard Ejecutivo",
      "Reportes Avanzados",
      "Comisiones",
      "Metas por Vendedor",
      "Metas por Gestor",
      "Multi Sucursales",
      "Comparativos Mensuales",
      "Presupuesto vs Resultado",
      "Indicadores Gerenciales",
      "Soporte Prioritario",
      "Usuario adicional: $10.99/mes",
    ],
  },
];

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function Planes() {
  const [tipoPlan, setTipoPlan] = useState("mensual");
  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [empresaActual, setEmpresaActual] = useState(null);
  const [asignandoCodigo, setAsignandoCodigo] = useState("");
  const [cargando, setCargando] = useState(true);

  const [esMovil, setEsMovil] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    cargarEmpresa();

    const actualizarVista = () => {
      const movil = window.innerWidth <= 920;
      setEsMovil(movil);

      if (!movil) {
        setMenuMovilAbierto(false);
      }
    };

    actualizarVista();
    window.addEventListener("resize", actualizarVista);

    return () => {
      window.removeEventListener("resize", actualizarVista);
    };
  }, []);

  async function cargarEmpresa() {
    setCargando(true);

    const id = localStorage.getItem("empresaAdminCreadaId");
    const nombre = localStorage.getItem("empresaAdminCreadaNombre");

    if (!id) {
      alert("Primero debes crear o seleccionar una empresa.");
      window.location.href = "/empresas";
      return;
    }

    setEmpresaId(id);
    setEmpresaNombre(nombre || "Empresa seleccionada");

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      alert("No se pudo cargar la empresa: " + error.message);
      setCargando(false);
      return;
    }

    if (data) {
      setEmpresaActual(data);

      if (data.plan_tipo) {
        setTipoPlan(String(data.plan_tipo).toLowerCase());
      }
    }

    setCargando(false);
  }

  const esLavanderia =
    normalizar(empresaActual?.tipo_negocio) === "lavanderia";

  const planesVisibles = useMemo(() => {
    if (esLavanderia) {
      return PLANES.filter(
        (plan) =>
          plan.codigo === "lavanderia_piloto" ||
          plan.codigo === "ventas_gestion" ||
          plan.codigo === "pro"
      );
    }

    return PLANES.filter((plan) => !plan.exclusivoLavanderia);
  }, [esLavanderia]);

  async function asignarPlan(plan) {
    if (!empresaId || asignandoCodigo) return;

    const yaTienePlan = Boolean(empresaActual?.plan_codigo);
    const accion = yaTienePlan ? "actualizará" : "asignará";

    const confirmar = window.confirm(
      `Se ${accion} ${plan.nombre} para ${empresaNombre}. ¿Deseas continuar?`
    );

    if (!confirmar) return;

    setAsignandoCodigo(plan.codigo);

    try {
      const resultado = await asignarPlanEmpresa(
        empresaId,
        plan.codigo
      );

      if (!resultado.ok) {
        alert(resultado.mensaje);
        return;
      }

      if (yaTienePlan) {
        alert("Plan actualizado correctamente.");
        window.location.href = "/centro-gestion";
        return;
      }

      alert(
        resultado.mensaje +
          " Ahora crea el Usuario Principal."
      );

      window.location.href = "/usuarios";
    } finally {
      setAsignandoCodigo("");
    }
  }

  if (cargando) {
    return (
      <div style={s.loadingPage}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.loadingLogo}
        />
        <strong style={s.loadingTitle}>
          Cargando planes comerciales
        </strong>
        <span style={s.loadingText}>
          Consultando la empresa seleccionada.
        </span>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {esMovil && (
        <MobileAdminBar
          abierto={menuMovilAbierto}
          setAbierto={setMenuMovilAbierto}
        />
      )}

      <main
        style={{
          ...s.main,
          ...(esMovil ? s.mainMobile : {}),
        }}
      >
        <section
          style={{
            ...s.hero,
            ...(esMovil ? s.heroMobile : {}),
          }}
        >
          <div style={s.heroGlowOne} />
          <div style={s.heroGlowTwo} />

          <div style={s.heroContent}>
            <span style={s.eyebrow}>
              PLANES COMERCIALES
            </span>

            <h1
              style={{
                ...s.heroTitle,
                ...(esMovil ? s.heroTitleMobile : {}),
              }}
            >
              Selecciona el plan de la empresa
            </h1>

            <p
              style={{
                ...s.heroText,
                ...(esMovil ? s.heroTextMobile : {}),
              }}
            >
              Asigna o actualiza el plan comercial de forma segura.
            </p>
          </div>

          {!esMovil && (
            <div style={s.heroLogoBox}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={s.heroLogo}
              />
            </div>
          )}
        </section>

        <section
          style={{
            ...s.companyCard,
            ...(esMovil ? s.companyCardMobile : {}),
          }}
        >
          <div style={s.companyIdentity}>
            <div style={s.companyInitial}>
              {String(empresaNombre || "E")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={s.companyLabel}>
                EMPRESA SELECCIONADA
              </span>

              <strong style={s.companyName}>
                {empresaNombre}
              </strong>

              <span style={s.companyMeta}>
                Tipo:{" "}
                <strong>
                  {empresaActual?.tipo_negocio || "No definido"}
                </strong>
                {" · "}
                Plan actual:{" "}
                <strong>
                  {empresaActual?.plan_nombre || "Sin plan"}
                </strong>
              </span>
            </div>
          </div>

          <div
            style={{
              ...s.companyActions,
              ...(esMovil ? s.companyActionsMobile : {}),
            }}
          >
            <Link href="/empresas" style={s.secondaryButton}>
              <Icon name="building" size={17} />
              Cambiar empresa
            </Link>

            <Link href="/admin" style={s.darkButton}>
              <Icon name="arrowBack" size={17} />
              Volver al Admin
            </Link>
          </div>
        </section>

        {esLavanderia && (
          <section style={s.laundryNotice}>
            <span style={s.noticeIcon}>
              <Icon name="spark" size={20} />
            </span>

            <div>
              <strong style={s.noticeTitle}>
                Configuración especial para lavandería
              </strong>

              <span style={s.noticeText}>
                Puedes iniciar con el plan de lavandería y luego subir de nivel.
              </span>
            </div>
          </section>
        )}

        <section style={s.billingSection}>
          <div style={s.billingHeader}>
            <div>
              <span style={s.sectionEyebrow}>
                FRECUENCIA DE PAGO
              </span>

              <h2 style={s.sectionTitle}>
                Elige la modalidad
              </h2>
            </div>

            <div style={s.toggleBox}>
              <button
                type="button"
                onClick={() => setTipoPlan("mensual")}
                style={{
                  ...s.toggleButton,
                  ...(tipoPlan === "mensual"
                    ? s.toggleButtonActive
                    : {}),
                }}
              >
                Mensual
              </button>

              <button
                type="button"
                onClick={() => setTipoPlan("anual")}
                style={{
                  ...s.toggleButton,
                  ...(tipoPlan === "anual"
                    ? s.toggleButtonActive
                    : {}),
                }}
              >
                Anual
              </button>
            </div>
          </div>
        </section>

        <section
          style={{
            ...s.plansGrid,
            ...(esMovil ? s.plansGridMobile : {}),
          }}
        >
          {planesVisibles.map((plan) => {
            const precio =
              tipoPlan === "mensual"
                ? plan.precioMensual
                : plan.precioAnual;

            const esActual =
              empresaActual?.plan_codigo === plan.codigo;

            const asignando =
              asignandoCodigo === plan.codigo;

            return (
              <article
                key={plan.codigo}
                style={{
                  ...s.planCard,
                  ...(esMovil ? s.planCardMobile : {}),
                  borderColor: plan.color,
                  background: `linear-gradient(155deg,#ffffff 0%,${plan.fondo} 100%)`,
                  boxShadow: plan.destacado
                    ? `0 18px 42px ${plan.color}24`
                    : s.planCard.boxShadow,
                }}
              >
                <div style={s.planChips}>
                  <span
                    style={{
                      ...s.planCategory,
                      background: plan.color,
                    }}
                  >
                    {plan.etiqueta}
                  </span>

                  {plan.destacado && (
                    <span style={s.recommendedChip}>
                      Más recomendado
                    </span>
                  )}

                  {plan.codigo === "lavanderia_piloto" && (
                    <span style={s.pilotChip}>
                      Lavandería
                    </span>
                  )}

                  {esActual && (
                    <span style={s.currentChip}>
                      Plan actual
                    </span>
                  )}
                </div>

                <h2 style={s.planTitle}>
                  {plan.nombre}
                </h2>

                <div style={s.priceRow}>
                  <span style={s.currency}>$</span>

                  <strong
                    style={{
                      ...s.price,
                      ...(esMovil ? s.priceMobile : {}),
                    }}
                  >
                    {precio}
                  </strong>
                </div>

                <span style={s.priceCaption}>
                  {tipoPlan === "mensual"
                    ? "Pago mensual"
                    : "Pago anual con ahorro"}
                </span>

                <div style={s.usersBox}>
                  <Icon name="users" size={18} />

                  <strong>
                    {plan.usuariosIncluidos} usuarios incluidos
                  </strong>
                </div>

                <ul
                  style={{
                    ...s.featuresList,
                    ...(esMovil ? s.featuresListMobile : {}),
                  }}
                >
                  {plan.incluye.map((item) => (
                    <li key={item} style={s.featureItem}>
                      <span style={s.checkCircle}>
                        <Icon name="check" size={13} />
                      </span>

                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => asignarPlan(plan)}
                  disabled={Boolean(asignandoCodigo)}
                  style={{
                    ...s.assignButton,
                    background: plan.color,
                    opacity:
                      asignandoCodigo && !asignando
                        ? 0.52
                        : 1,
                  }}
                >
                  {asignando
                    ? "Asignando..."
                    : esActual
                    ? "Actualizar plan actual"
                    : `Asignar ${plan.nombre}`}
                </button>
              </article>
            );
          })}
        </section>

        <p style={s.footerNote}>
          Si la empresa ya existe, el plan se actualiza sin crearla nuevamente.
        </p>
      </main>
    </div>
  );
}

function MobileAdminBar({ abierto, setAbierto }) {
  return (
    <>
      <div style={s.mobileBar}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.mobileLogo}
        />

        <button
          type="button"
          onClick={() => setAbierto((actual) => !actual)}
          style={s.mobileMenuButton}
          aria-expanded={abierto}
        >
          <Icon name={abierto ? "close" : "menu"} size={21} />
          {abierto ? "Cerrar" : "Menú"}
        </button>
      </div>

      {abierto && (
        <div style={s.mobileMenu}>
          {OPCIONES_ADMIN.map((item) => (
            <Link
              key={item.ruta}
              href={item.ruta}
              onClick={() => setAbierto(false)}
              style={s.mobileMenuItem}
            >
              <span style={s.mobileMenuIcon}>
                <Icon name={item.icono} size={18} />
              </span>

              <span>{item.nombre}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Icon({ name, size = 20 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    building: (
      <>
        <path d="M3 21h18M6 21V3h12v18" />
        <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    modules: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 16l4-5 4 3 4-7" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M17 11a4 4 0 0 1 4 4v2M17 3.5a4 4 0 0 1 0 7" />
      </>
    ),
    check: <path d="M5 12l4 4L19 6" />,
    arrowBack: <path d="M19 12H5M12 19l-7-7 7-7" />,
    spark: (
      <>
        <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M6 6l12 12M18 6L6 18" />,
  };

  return <svg {...props}>{icons[name] || icons.dashboard}</svg>;
}

const s = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg,#f6f8f7 0%,#edf3ef 100%)",
    color: "#152019",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  main: {
    maxWidth: 1500,
    margin: "0 auto",
    padding: "28px 30px 42px",
  },

  mainMobile: {
    width: "100%",
    maxWidth: "100%",
    padding: "14px 12px 30px",
    boxSizing: "border-box",
    overflowX: "hidden",
  },

  mobileBar: {
    position: "sticky",
    top: 0,
    zIndex: 70,
    padding: "10px 22px 10px 13px",
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid #dce6e0",
    background: "rgba(255,255,255,.96)",
    backdropFilter: "blur(13px)",
    boxShadow: "0 7px 24px rgba(28,52,39,.07)",
  },

  mobileLogo: {
    width: 145,
    maxWidth: "50vw",
    height: "auto",
    display: "block",
  },

  mobileMenuButton: {
    minWidth: 106,
    minHeight: 44,
    padding: "9px 15px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid rgba(255,255,255,.15)",
    borderRadius: 14,
    background:
      "linear-gradient(135deg,#173c2a,#0f6a3d)",
    color: "#ffffff",
    fontWeight: 850,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(23,60,42,.18)",
  },

  mobileMenu: {
    position: "fixed",
    top: 66,
    left: 10,
    right: 10,
    zIndex: 80,
    maxHeight: "calc(100vh - 80px)",
    padding: 11,
    display: "grid",
    gap: 8,
    overflowY: "auto",
    border: "1px solid #dce6e0",
    borderRadius: 19,
    background: "#ffffff",
    boxShadow: "0 26px 65px rgba(15,23,42,.22)",
  },

  mobileMenuItem: {
    minHeight: 48,
    padding: "9px 11px",
    display: "grid",
    gridTemplateColumns: "34px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
    border: "1px solid #edf1ee",
    borderRadius: 13,
    background: "#ffffff",
    color: "#1d2b23",
    fontSize: 12,
    fontWeight: 800,
    textDecoration: "none",
  },

  mobileMenuIcon: {
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#edf8f1",
    color: "#16834f",
  },

  hero: {
    minHeight: 178,
    marginBottom: 16,
    padding: "27px 29px",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 22,
    borderRadius: 24,
    background:
      "linear-gradient(135deg,#07100b 0%,#103421 55%,#16834f 100%)",
    color: "#ffffff",
    boxShadow: "0 22px 52px rgba(11,48,29,.17)",
  },

  heroMobile: {
    minHeight: 0,
    padding: "21px 18px 22px",
    borderRadius: 20,
    marginBottom: 13,
  },

  heroGlowOne: {
    position: "absolute",
    width: 250,
    height: 250,
    top: -150,
    right: -65,
    borderRadius: "50%",
    background: "rgba(125,220,171,.11)",
  },

  heroGlowTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    bottom: -115,
    left: "44%",
    border: "1px solid rgba(255,255,255,.11)",
    borderRadius: "50%",
  },

  heroContent: {
    position: "relative",
    zIndex: 2,
  },

  eyebrow: {
    display: "block",
    marginBottom: 8,
    color: "#7ce1aa",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.45,
  },

  heroTitle: {
    maxWidth: 780,
    margin: "0 0 10px",
    color: "#ffffff",
    fontSize: "clamp(33px,4vw,49px)",
    lineHeight: 1.03,
    letterSpacing: -1,
  },

  heroTitleMobile: {
    fontSize: 30,
    lineHeight: 1.06,
    letterSpacing: -0.7,
  },

  heroText: {
    maxWidth: 680,
    margin: 0,
    color: "#d1e5d8",
    fontSize: 14,
    lineHeight: 1.55,
  },

  heroTextMobile: {
    fontSize: 12.5,
    lineHeight: 1.5,
  },

  heroLogoBox: {
    width: 225,
    minWidth: 225,
    height: 92,
    padding: 10,
    position: "relative",
    zIndex: 2,
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 16px 36px rgba(0,0,0,.18)",
  },

  heroLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  companyCard: {
    marginBottom: 14,
    padding: 17,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 10px 28px rgba(15,23,42,.045)",
  },

  companyCardMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 13,
    padding: 14,
  },

  companyIdentity: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "48px minmax(0,1fr)",
    alignItems: "center",
    gap: 11,
  },

  companyInitial: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background:
      "linear-gradient(145deg,#e7f7ed,#d7eddf)",
    color: "#16834f",
    fontWeight: 950,
  },

  companyLabel: {
    display: "block",
    color: "#16834f",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1,
  },

  companyName: {
    display: "block",
    marginTop: 3,
    overflow: "hidden",
    color: "#17211c",
    fontSize: 15,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  companyMeta: {
    display: "block",
    marginTop: 4,
    color: "#7a867f",
    fontSize: 10.5,
    lineHeight: 1.45,
  },

  companyActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  companyActionsMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
  },

  secondaryButton: {
    minHeight: 42,
    padding: "9px 13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #cad6ce",
    borderRadius: 11,
    background: "#ffffff",
    color: "#26342c",
    fontSize: 11,
    fontWeight: 850,
    textDecoration: "none",
  },

  darkButton: {
    minHeight: 42,
    padding: "9px 13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #16241c",
    borderRadius: 11,
    background:
      "linear-gradient(135deg,#17211c,#263a2e)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 850,
    textDecoration: "none",
  },

  laundryNotice: {
    marginBottom: 14,
    padding: 14,
    display: "grid",
    gridTemplateColumns: "42px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
    border: "1px solid #99e2c8",
    borderRadius: 15,
    background: "#effbf4",
    color: "#125b3b",
  },

  noticeIcon: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#ffffff",
    color: "#16834f",
  },

  noticeTitle: {
    display: "block",
    fontSize: 12.5,
  },

  noticeText: {
    display: "block",
    marginTop: 3,
    color: "#4e7660",
    fontSize: 10.5,
    lineHeight: 1.45,
  },

  billingSection: {
    marginBottom: 14,
    padding: "15px 17px",
    border: "1px solid #dfe7e2",
    borderRadius: 17,
    background: "#ffffff",
  },

  billingHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },

  sectionEyebrow: {
    display: "block",
    color: "#16834f",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1,
  },

  sectionTitle: {
    margin: "4px 0 0",
    fontSize: 20,
  },

  toggleBox: {
    padding: 4,
    display: "inline-grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 4,
    border: "1px solid #d5dfd9",
    borderRadius: 999,
    background: "#f3f6f4",
  },

  toggleButton: {
    minWidth: 100,
    padding: "9px 17px",
    border: "none",
    borderRadius: 999,
    background: "transparent",
    color: "#647169",
    fontWeight: 850,
    cursor: "pointer",
  },

  toggleButtonActive: {
    background: "#173c2a",
    color: "#ffffff",
    boxShadow: "0 6px 16px rgba(23,60,42,.16)",
  },

  plansGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(280px,1fr))",
    alignItems: "stretch",
    gap: 17,
  },

  plansGridMobile: {
    gridTemplateColumns: "1fr",
    gap: 13,
  },

  planCard: {
    minWidth: 0,
    padding: 23,
    display: "flex",
    flexDirection: "column",
    border: "1px solid",
    borderRadius: 20,
    boxShadow: "0 12px 30px rgba(15,23,42,.07)",
  },

  planCardMobile: {
    padding: 17,
    borderRadius: 18,
  },

  planChips: {
    minHeight: 31,
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },

  planCategory: {
    padding: "6px 9px",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 8.5,
    fontWeight: 900,
  },

  recommendedChip: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "#fff1b8",
    color: "#8a5d00",
    fontSize: 8.5,
    fontWeight: 900,
  },

  pilotChip: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "#ccfbf1",
    color: "#115e59",
    fontSize: 8.5,
    fontWeight: 900,
  },

  currentChip: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 8.5,
    fontWeight: 900,
  },

  planTitle: {
    margin: "14px 0 9px",
    color: "#111827",
    fontSize: 22,
    lineHeight: 1.15,
  },

  priceRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 2,
  },

  currency: {
    marginTop: 7,
    color: "#111827",
    fontSize: 21,
    fontWeight: 900,
  },

  price: {
    color: "#111827",
    fontSize: 52,
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: -1.5,
  },

  priceMobile: {
    fontSize: 46,
  },

  priceCaption: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 11,
  },

  usersBox: {
    marginTop: 13,
    padding: "10px 11px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #e2e7e4",
    borderRadius: 11,
    background: "rgba(255,255,255,.78)",
    color: "#27342d",
    fontSize: 10.5,
  },

  featuresList: {
    minHeight: 340,
    margin: "15px 0 18px",
    padding: 0,
    display: "grid",
    alignContent: "start",
    gap: 8,
    listStyle: "none",
  },

  featuresListMobile: {
    minHeight: 0,
  },

  featureItem: {
    display: "grid",
    gridTemplateColumns: "23px minmax(0,1fr)",
    alignItems: "start",
    gap: 7,
    color: "#435047",
    fontSize: 10.5,
    lineHeight: 1.4,
  },

  checkCircle: {
    width: 21,
    height: 21,
    display: "grid",
    placeItems: "center",
    borderRadius: 7,
    background: "#eaf7ef",
    color: "#16834f",
  },

  assignButton: {
    width: "100%",
    minHeight: 44,
    marginTop: "auto",
    padding: "10px 12px",
    border: "none",
    borderRadius: 11,
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(15,23,42,.12)",
  },

  footerNote: {
    margin: "20px 0 0",
    color: "#78857d",
    fontSize: 10.5,
    textAlign: "center",
  },

  loadingPage: {
    minHeight: "100vh",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "#f3f6f4",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  loadingLogo: {
    width: 195,
    marginBottom: 8,
  },

  loadingTitle: {
    color: "#17211c",
    fontSize: 18,
  },

  loadingText: {
    color: "#7b877f",
    fontSize: 11,
  },
};
