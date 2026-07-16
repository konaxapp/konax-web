"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Admin() {
  const [empresasPrueba, setEmpresasPrueba] = useState([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [procesandoId, setProcesandoId] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const opciones = [
    {
      nombre: "Empresas Clientes",
      ruta: "/empresas",
      icono: "building",
    },
    {
      nombre: "Planes Comerciales",
      ruta: "/planes",
      icono: "briefcase",
    },
    {
      nombre: "Gestión de Módulos",
      ruta: "/modulos",
      icono: "modules",
    },
    {
      nombre: "Centro de Gestión",
      ruta: "/centro-gestion",
      icono: "chart",
    },
  ];

  useEffect(() => {
    validarAdminYCargar();
  }, []);

  async function validarAdminYCargar() {
    const adminId = localStorage.getItem("adminKonaxId");

    if (!adminId) {
      window.location.href = "/admin-login";
      return;
    }

    await cargarEmpresasPrueba();
  }

  async function cargarEmpresasPrueba() {
    setCargandoEmpresas(true);

    const { data, error } = await supabase
      .from("vista_control_pruebas")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando control de pruebas: " + error.message);
      setEmpresasPrueba([]);
      setCargandoEmpresas(false);
      return;
    }

    setEmpresasPrueba(data || []);
    setCargandoEmpresas(false);
  }

  function cerrarSesion() {
    localStorage.removeItem("adminKonaxId");
    localStorage.removeItem("adminKonaxNombre");
    localStorage.removeItem("adminKonaxCorreo");
    localStorage.removeItem("adminKonaxRol");
    window.location.href = "/admin-login";
  }

  async function aprobarPiloto(empresa) {
    const confirmar = window.confirm(
      `¿Deseas aprobar a ${empresa.nombre} para el programa piloto?\n\nEsto dejará la empresa pendiente de iniciar la capacitación, pero todavía no comenzará a descontar los 14 días.`
    );

    if (!confirmar) return;

    const adminId = localStorage.getItem("adminKonaxId") || null;
    const observacion = window.prompt(
      "Observación comercial del piloto:",
      "Empresa aprobada para capacitación e implementación inicial."
    );

    if (observacion === null) return;

    setProcesandoId(empresa.id);

    const { error } = await supabase.rpc("aprobar_piloto_empresa", {
      p_empresa_id: empresa.id,
      p_usuario_konax: adminId,
      p_observacion: observacion.trim() || null,
    });

    if (error) {
      setProcesandoId("");
      alert("Error aprobando piloto: " + error.message);
      return;
    }

    await cargarEmpresasPrueba();
    setProcesandoId("");

    alert(
      `${empresa.nombre} fue aprobada para el piloto. Los 14 días todavía no han comenzado.`
    );
  }

  async function iniciarPrueba(empresa) {
    const diasTexto = window.prompt(
      `¿Cuántos días tendrá la prueba de ${empresa.nombre}?`,
      "14"
    );

    if (diasTexto === null) return;

    const dias = Number(diasTexto);

    if (!Number.isInteger(dias) || dias <= 0) {
      alert("Ingrese una cantidad válida de días.");
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmas iniciar ahora la prueba de ${empresa.nombre} por ${dias} días?\n\nLa fecha de inicio y vencimiento se registrarán desde hoy.`
    );

    if (!confirmar) return;

    const adminId = localStorage.getItem("adminKonaxId") || null;

    setProcesandoId(empresa.id);

    const { error } = await supabase.rpc("iniciar_prueba_empresa", {
      p_empresa_id: empresa.id,
      p_dias_prueba: dias,
      p_usuario_konax: adminId,
    });

    if (error) {
      setProcesandoId("");
      alert("Error iniciando prueba: " + error.message);
      return;
    }

    await cargarEmpresasPrueba();
    setProcesandoId("");

    alert(
      `La prueba de ${empresa.nombre} comenzó correctamente por ${dias} días.`
    );
  }

  function formatoFecha(fecha) {
    if (!fecha) return "-";

    const texto = String(fecha).slice(0, 10);
    const [year, month, day] = texto.split("-");

    if (!year || !month || !day) return fecha;

    return `${day}/${month}/${year}`;
  }

  function etiquetaEstado(estado) {
    const mapa = {
      activo: "Activo",
      pendiente_inicio_prueba: "Pendiente de inicio",
      prueba: "Prueba activa",
      prueba_vencida: "Prueba vencida",
      pendiente_activacion: "Pendiente de activación",
      gracia: "Período de gracia",
      suspendido: "Suspendido",
      cancelado: "Cancelado",
    };

    return mapa[estado] || estado || "Sin estado";
  }

  function colorEstado(estado) {
    const mapa = {
      activo: { background: "#e9f7ef", color: "#166534" },
      pendiente_inicio_prueba: { background: "#fff7df", color: "#9a6700" },
      prueba: { background: "#e8f2ff", color: "#1d4ed8" },
      prueba_vencida: { background: "#fff0f0", color: "#b91c1c" },
      pendiente_activacion: { background: "#f3e8ff", color: "#7e22ce" },
      gracia: { background: "#fff7ed", color: "#c2410c" },
      suspendido: { background: "#f3f4f6", color: "#374151" },
      cancelado: { background: "#f3f4f6", color: "#6b7280" },
    };

    return mapa[estado] || { background: "#f3f4f6", color: "#374151" };
  }

  const empresasFiltradas = useMemo(() => {
    if (filtroEstado === "Todos") return empresasPrueba;

    return empresasPrueba.filter(
      (empresa) => empresa.estado_suscripcion === filtroEstado
    );
  }, [empresasPrueba, filtroEstado]);

  const totalEmpresas = empresasPrueba.length;
  const pendientes = empresasPrueba.filter(
    (item) => item.estado_suscripcion === "pendiente_inicio_prueba"
  ).length;
  const pruebasActivas = empresasPrueba.filter(
    (item) => item.estado_suscripcion === "prueba"
  ).length;
  const pruebasPorVencer = empresasPrueba.filter(
    (item) =>
      item.estado_suscripcion === "prueba" &&
      Number(item.dias_restantes || 0) <= 5
  ).length;

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.brandBox}>
          <div style={styles.logoBox}>
            <img
              src="/konax-logo.png"
              alt="KONAX"
              style={styles.logoSidebar}
            />
          </div>

          <div>
            <span style={styles.brandLabel}>CENTRO INTERNO</span>
            <h2 style={styles.brandTitle}>KONAX</h2>
            <p style={styles.brandSub}>Administración</p>
          </div>
        </div>

        <div style={styles.empresaBox}>
          <div style={styles.avatarAdmin}>K</div>

          <div>
            <strong style={styles.empresaNombre}>Centro KONAX</strong>
            <span style={styles.empresaRol}>SuperAdmin</span>
          </div>
        </div>

        <nav style={styles.menu}>
          {opciones.map((item) => (
            <Link key={item.nombre} href={item.ruta} style={styles.menuItem}>
              <span style={styles.menuIcono}>
                <Icon name={item.icono} size={18} />
              </span>
              <span>{item.nombre}</span>
            </Link>
          ))}
        </nav>

        <button onClick={cerrarSesion} style={styles.botonSalir}>
          <Icon name="logout" size={18} />
          Cerrar sesión
        </button>
      </aside>

      <main style={styles.contenido}>
        <section style={styles.hero}>
          <div style={styles.heroTexto}>
            <span style={styles.etiqueta}>CENTRO DE OPERACIONES INTERNAS</span>

            <h1 style={styles.titulo}>Centro Administrativo KONAX</h1>

            <p style={styles.subtitulo}>
              Administra empresas, planes, módulos y períodos de prueba desde
              un solo panel.
            </p>
          </div>

          <div style={styles.heroLogoBox}>
            <img
              src="/konax-logo.png"
              alt="KONAX"
              style={styles.heroLogo}
            />
          </div>
        </section>

        <section style={styles.resumenGrid}>
          <ResumenCard
            titulo="Empresas registradas"
            valor={totalEmpresas}
            texto="Empresas visibles en el control"
          />

          <ResumenCard
            titulo="Pendientes de iniciar"
            valor={pendientes}
            texto="Aprobadas, sin consumir días"
          />

          <ResumenCard
            titulo="Pruebas activas"
            valor={pruebasActivas}
            texto="Pilotos actualmente en curso"
          />

          <ResumenCard
            titulo="Próximas a vencer"
            valor={pruebasPorVencer}
            texto="Pruebas con 5 días o menos"
          />
        </section>

        <section style={styles.controlCard}>
          <div style={styles.controlHeader}>
            <div>
              <span style={styles.seccionEtiqueta}>CONTROL COMERCIAL</span>
              <h2 style={styles.seccionTitulo}>Empresas y períodos de prueba</h2>
              <p style={styles.seccionTexto}>
                Aprueba pilotos e inicia los días de capacitación cuando la
                empresa esté lista.
              </p>
            </div>

            <div style={styles.headerAcciones}>
              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value)}
                style={styles.selectFiltro}
              >
                <option value="Todos">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="pendiente_inicio_prueba">
                  Pendiente de inicio
                </option>
                <option value="prueba">Prueba activa</option>
                <option value="prueba_vencida">Prueba vencida</option>
                <option value="pendiente_activacion">
                  Pendiente de activación
                </option>
                <option value="suspendido">Suspendido</option>
              </select>

              <button
                type="button"
                onClick={cargarEmpresasPrueba}
                style={styles.botonActualizar}
                disabled={cargandoEmpresas}
              >
                <Icon name="refresh" size={17} />
                Actualizar
              </button>
            </div>
          </div>

          {cargandoEmpresas ? (
            <div style={styles.estadoCarga}>
              Cargando empresas y estados de suscripción...
            </div>
          ) : (
            <div style={styles.tablaScroll}>
              <table style={styles.tabla}>
                <thead>
                  <tr>
                    <th style={styles.th}>Empresa</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Aceptación</th>
                    <th style={styles.th}>Inicio</th>
                    <th style={styles.th}>Vencimiento</th>
                    <th style={styles.th}>Días restantes</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {empresasFiltradas.map((empresa) => {
                    const procesando = procesandoId === empresa.id;
                    const estiloEstado = colorEstado(
                      empresa.estado_suscripcion
                    );

                    return (
                      <tr key={empresa.id}>
                        <td style={styles.td}>
                          <div style={styles.empresaTabla}>
                            <div style={styles.empresaInicial}>
                              {String(empresa.nombre || "E")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong style={styles.nombreEmpresaTabla}>
                                {empresa.nombre}
                              </strong>
                              <span style={styles.idEmpresa}>
                                {empresa.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badgeEstado,
                              ...estiloEstado,
                            }}
                          >
                            {etiquetaEstado(empresa.estado_suscripcion)}
                          </span>
                        </td>

                        <td style={styles.td}>
                          {formatoFecha(empresa.fecha_aceptacion_piloto)}
                        </td>

                        <td style={styles.td}>
                          {formatoFecha(empresa.fecha_inicio_prueba)}
                        </td>

                        <td style={styles.td}>
                          {formatoFecha(empresa.fecha_fin_prueba)}
                        </td>

                        <td style={styles.td}>
                          {empresa.estado_suscripcion === "prueba"
                            ? empresa.dias_restantes ?? 0
                            : "-"}
                        </td>

                        <td style={styles.td}>
                          <div style={styles.accionesTabla}>
                            {empresa.estado_suscripcion === "activo" && (
                              <button
                                type="button"
                                onClick={() => aprobarPiloto(empresa)}
                                style={styles.botonAprobar}
                                disabled={procesando}
                              >
                                {procesando
                                  ? "Procesando..."
                                  : "Aprobar piloto"}
                              </button>
                            )}

                            {empresa.estado_suscripcion ===
                              "pendiente_inicio_prueba" && (
                              <button
                                type="button"
                                onClick={() => iniciarPrueba(empresa)}
                                style={styles.botonIniciar}
                                disabled={procesando}
                              >
                                {procesando
                                  ? "Procesando..."
                                  : "Iniciar prueba"}
                              </button>
                            )}

                            {empresa.estado_suscripcion === "prueba" && (
                              <span style={styles.estadoEnCurso}>
                                Prueba en curso
                              </span>
                            )}

                            {![
                              "activo",
                              "pendiente_inicio_prueba",
                              "prueba",
                            ].includes(empresa.estado_suscripcion) && (
                              <span style={styles.sinAccion}>
                                Sin acción disponible
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {empresasFiltradas.length === 0 && (
                    <tr>
                      <td style={styles.sinResultados} colSpan="7">
                        No hay empresas para el filtro seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ResumenCard({ titulo, valor, texto }) {
  return (
    <article style={styles.resumenCard}>
      <span style={styles.resumenLabel}>{titulo}</span>
      <strong style={styles.resumenValor}>{valor}</strong>
      <span style={styles.resumenTexto}>{texto}</span>
    </article>
  );
}

function Icon({ name, size = 20 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const icons = {
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
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 16l4-5 4 3 4-7" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 6v5h-5" />
        <path d="M4 18v-5h5" />
        <path d="M18.5 9A7 7 0 0 0 6 6.5L4 11M5.5 15A7 7 0 0 0 18 17.5L20 13" />
      </>
    ),
  };

  return <svg {...props}>{icons[name] || icons.modules}</svg>;
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "#f3f6f4",
    color: "#152019",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  sidebar: {
    width: 280,
    minWidth: 280,
    height: "100vh",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    padding: "22px 16px",
    boxSizing: "border-box",
    overflowY: "auto",
    background: "linear-gradient(180deg, #08110c 0%, #123b25 100%)",
    color: "#ffffff",
  },
  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    padding: "0 5px 20px",
    borderBottom: "1px solid rgba(255,255,255,.09)",
  },
  logoBox: {
    width: 110,
    height: 58,
    padding: 5,
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    borderRadius: 13,
    background: "#ffffff",
  },
  logoSidebar: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  brandLabel: {
    color: "#79dca6",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.1,
  },
  brandTitle: {
    margin: "2px 0 0",
    fontSize: 21,
  },
  brandSub: {
    margin: "2px 0 0",
    color: "#c9dfd1",
    fontSize: 10,
  },
  empresaBox: {
    margin: "18px 0",
    padding: 13,
    display: "grid",
    gridTemplateColumns: "40px 1fr",
    gap: 10,
    alignItems: "center",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 14,
    background: "rgba(255,255,255,.06)",
  },
  avatarAdmin: {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#ffffff",
    color: "#123b25",
    fontWeight: 900,
  },
  empresaNombre: {
    display: "block",
    fontSize: 12,
  },
  empresaRol: {
    display: "block",
    marginTop: 3,
    color: "#a9c9b5",
    fontSize: 10,
  },
  menu: {
    display: "grid",
    gap: 6,
  },
  menuItem: {
    minHeight: 45,
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    alignItems: "center",
    gap: 9,
    padding: "10px 11px",
    border: "1px solid transparent",
    borderRadius: 11,
    color: "#e4ece7",
    fontSize: 12,
    fontWeight: 750,
    textDecoration: "none",
  },
  menuIcono: {
    color: "#7ddcab",
  },
  botonSalir: {
    width: "100%",
    minHeight: 45,
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid rgba(255,255,255,.13)",
    borderRadius: 11,
    background: "rgba(255,255,255,.07)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
  contenido: {
    flex: 1,
    minWidth: 0,
    padding: "28px 30px 40px",
    boxSizing: "border-box",
  },
  hero: {
    maxWidth: 1500,
    margin: "0 auto 20px",
    padding: "28px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 22,
    borderRadius: 24,
    background:
      "linear-gradient(135deg, #09120d 0%, #123b25 60%, #17673e 100%)",
    boxShadow: "0 22px 52px rgba(11,48,29,.17)",
  },
  heroTexto: {
    flex: 1,
  },
  etiqueta: {
    display: "block",
    marginBottom: 8,
    color: "#7ce1aa",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.45,
  },
  titulo: {
    margin: "0 0 10px",
    color: "#ffffff",
    fontSize: "clamp(32px,4vw,48px)",
    lineHeight: 1.04,
    letterSpacing: -0.9,
  },
  subtitulo: {
    maxWidth: 720,
    margin: 0,
    color: "#d1e5d8",
    fontSize: 14,
    lineHeight: 1.55,
  },
  heroLogoBox: {
    width: 235,
    minWidth: 235,
    height: 94,
    padding: 10,
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    borderRadius: 18,
    background: "#ffffff",
  },
  heroLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  resumenGrid: {
    maxWidth: 1500,
    margin: "0 auto 20px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 13,
  },
  resumenCard: {
    minHeight: 118,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 10px 28px rgba(15,23,42,.045)",
  },
  resumenLabel: {
    color: "#6f7b73",
    fontSize: 11,
    fontWeight: 800,
  },
  resumenValor: {
    marginTop: 8,
    color: "#152019",
    fontSize: 29,
  },
  resumenTexto: {
    marginTop: "auto",
    color: "#8a958e",
    fontSize: 10,
  },
  controlCard: {
    maxWidth: 1500,
    margin: "0 auto",
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 21,
    background: "#ffffff",
    boxShadow: "0 12px 34px rgba(15,23,42,.05)",
  },
  controlHeader: {
    marginBottom: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 18,
    flexWrap: "wrap",
  },
  seccionEtiqueta: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },
  seccionTitulo: {
    margin: "0 0 5px",
    fontSize: 24,
  },
  seccionTexto: {
    margin: 0,
    color: "#758078",
    fontSize: 12,
  },
  headerAcciones: {
    display: "flex",
    gap: 9,
    flexWrap: "wrap",
  },
  selectFiltro: {
    minHeight: 42,
    padding: "9px 12px",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    background: "#ffffff",
    color: "#18221c",
    fontSize: 12,
    fontWeight: 700,
  },
  botonActualizar: {
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 13px",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    background: "#ffffff",
    color: "#243129",
    fontWeight: 800,
    cursor: "pointer",
  },
  estadoCarga: {
    padding: "36px 12px",
    color: "#758078",
    fontSize: 13,
    textAlign: "center",
  },
  tablaScroll: {
    overflowX: "auto",
  },
  tabla: {
    width: "100%",
    minWidth: 1100,
    borderCollapse: "collapse",
  },
  th: {
    padding: "11px 12px",
    borderBottom: "1px solid #dce5df",
    background: "#f6f9f7",
    color: "#536058",
    fontSize: 9,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  td: {
    padding: "13px 12px",
    borderBottom: "1px solid #edf1ee",
    color: "#435047",
    fontSize: 11,
    verticalAlign: "middle",
  },
  empresaTabla: {
    display: "grid",
    gridTemplateColumns: "40px 1fr",
    gap: 10,
    alignItems: "center",
  },
  empresaInicial: {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#eaf7ef",
    color: "#16834f",
    fontWeight: 900,
  },
  nombreEmpresaTabla: {
    display: "block",
    color: "#17211c",
    fontSize: 12,
  },
  idEmpresa: {
    display: "block",
    maxWidth: 210,
    marginTop: 3,
    overflow: "hidden",
    color: "#8a958e",
    fontSize: 8,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  badgeEstado: {
    display: "inline-block",
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 900,
  },
  accionesTabla: {
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
  },
  botonAprobar: {
    minHeight: 35,
    padding: "8px 11px",
    border: "none",
    borderRadius: 9,
    background: "#17211c",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },
  botonIniciar: {
    minHeight: 35,
    padding: "8px 11px",
    border: "none",
    borderRadius: 9,
    background: "#16834f",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },
  estadoEnCurso: {
    color: "#1d4ed8",
    fontSize: 10,
    fontWeight: 850,
  },
  sinAccion: {
    color: "#8a958e",
    fontSize: 10,
  },
  sinResultados: {
    padding: "30px 12px",
    color: "#7c8880",
    fontSize: 12,
    textAlign: "center",
  },
};
