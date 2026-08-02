"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const OPCIONES = [
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

export default function Admin() {
  const [empresasPrueba, setEmpresasPrueba] = useState([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [procesandoId, setProcesandoId] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const [esMovil, setEsMovil] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [adminNombre, setAdminNombre] = useState("Administrador KONAX");

  useEffect(() => {
    validarAdminYCargar();

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

  async function validarAdminYCargar() {
    const adminId = localStorage.getItem("adminKonaxId");
    const nombreGuardado =
      localStorage.getItem("adminKonaxNombre") ||
      "Administrador KONAX";

    setAdminNombre(nombreGuardado);

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
      alert(
        "Error cargando control de pruebas: " +
          error.message
      );
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
      `¿Deseas aprobar a ${empresa.nombre} para el programa piloto?\n\nEsto dejará la empresa pendiente de iniciar la capacitación, pero todavía no comenzará a descontar los días.`
    );

    if (!confirmar) return;

    const adminId =
      localStorage.getItem("adminKonaxId") || null;

    const observacion = window.prompt(
      "Observación comercial del piloto:",
      "Empresa aprobada para capacitación e implementación inicial."
    );

    if (observacion === null) return;

    setProcesandoId(empresa.id);

    const { error } = await supabase.rpc(
      "aprobar_piloto_empresa",
      {
        p_empresa_id: empresa.id,
        p_usuario_konax: adminId,
        p_observacion:
          observacion.trim() || null,
      }
    );

    if (error) {
      setProcesandoId("");
      alert(
        "Error aprobando piloto: " +
          error.message
      );
      return;
    }

    await cargarEmpresasPrueba();
    setProcesandoId("");

    alert(
      `${empresa.nombre} fue aprobada para el piloto. Los días todavía no han comenzado.`
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
      alert(
        "Ingrese una cantidad válida de días."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmas iniciar ahora la prueba de ${empresa.nombre} por ${dias} días?\n\nLa fecha de inicio y vencimiento se registrarán desde hoy.`
    );

    if (!confirmar) return;

    const adminId =
      localStorage.getItem("adminKonaxId") || null;

    setProcesandoId(empresa.id);

    const { error } = await supabase.rpc(
      "iniciar_prueba_empresa",
      {
        p_empresa_id: empresa.id,
        p_dias_prueba: dias,
        p_usuario_konax: adminId,
      }
    );

    if (error) {
      setProcesandoId("");
      alert(
        "Error iniciando prueba: " +
          error.message
      );
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
    const [year, month, day] =
      texto.split("-");

    if (!year || !month || !day) {
      return fecha;
    }

    return `${day}/${month}/${year}`;
  }

  function etiquetaEstado(estado) {
    const mapa = {
      activo: "Activo",
      pendiente_inicio_prueba:
        "Pendiente de inicio",
      prueba: "Prueba activa",
      prueba_vencida: "Prueba vencida",
      pendiente_activacion:
        "Pendiente de activación",
      gracia: "Período de gracia",
      suspendido: "Suspendido",
      cancelado: "Cancelado",
    };

    return (
      mapa[estado] ||
      estado ||
      "Sin estado"
    );
  }

  function colorEstado(estado) {
    const mapa = {
      activo: {
        background: "#e8f8ef",
        color: "#166534",
        borderColor: "#b9e6c9",
      },
      pendiente_inicio_prueba: {
        background: "#fff8df",
        color: "#946200",
        borderColor: "#f0d98a",
      },
      prueba: {
        background: "#eaf2ff",
        color: "#1d4ed8",
        borderColor: "#bed2ff",
      },
      prueba_vencida: {
        background: "#fff0f0",
        color: "#b91c1c",
        borderColor: "#f2b8b8",
      },
      pendiente_activacion: {
        background: "#f5edff",
        color: "#7e22ce",
        borderColor: "#d9b8f5",
      },
      gracia: {
        background: "#fff6e8",
        color: "#c2410c",
        borderColor: "#f3c99e",
      },
      suspendido: {
        background: "#f3f4f6",
        color: "#374151",
        borderColor: "#d1d5db",
      },
      cancelado: {
        background: "#f3f4f6",
        color: "#6b7280",
        borderColor: "#d1d5db",
      },
    };

    return (
      mapa[estado] || {
        background: "#f3f4f6",
        color: "#374151",
        borderColor: "#d1d5db",
      }
    );
  }

  function renderAccion(empresa, modoMovil = false) {
    const procesando =
      procesandoId === empresa.id;

    if (
      empresa.estado_suscripcion === "activo"
    ) {
      return (
        <button
          type="button"
          onClick={() => aprobarPiloto(empresa)}
          style={{
            ...styles.botonAprobar,
            ...(modoMovil
              ? styles.botonAccionMobile
              : {}),
            ...(procesando
              ? styles.botonDeshabilitado
              : {}),
          }}
          disabled={procesando}
        >
          <Icon name="check" size={16} />

          {procesando
            ? "Procesando..."
            : "Aprobar piloto"}
        </button>
      );
    }

    if (
      empresa.estado_suscripcion ===
      "pendiente_inicio_prueba"
    ) {
      return (
        <button
          type="button"
          onClick={() => iniciarPrueba(empresa)}
          style={{
            ...styles.botonIniciar,
            ...(modoMovil
              ? styles.botonAccionMobile
              : {}),
            ...(procesando
              ? styles.botonDeshabilitado
              : {}),
          }}
          disabled={procesando}
        >
          <Icon name="play" size={16} />

          {procesando
            ? "Procesando..."
            : "Iniciar prueba"}
        </button>
      );
    }

    if (
      empresa.estado_suscripcion === "prueba"
    ) {
      return (
        <span style={styles.estadoEnCurso}>
          <span style={styles.puntoAzul} />
          Prueba en curso
        </span>
      );
    }

    return (
      <span style={styles.sinAccion}>
        Sin acción disponible
      </span>
    );
  }

  const empresasFiltradas = useMemo(() => {
    if (filtroEstado === "Todos") {
      return empresasPrueba;
    }

    return empresasPrueba.filter(
      (empresa) =>
        empresa.estado_suscripcion ===
        filtroEstado
    );
  }, [empresasPrueba, filtroEstado]);

  const totalEmpresas =
    empresasPrueba.length;

  const pendientes = empresasPrueba.filter(
    (item) =>
      item.estado_suscripcion ===
      "pendiente_inicio_prueba"
  ).length;

  const pruebasActivas = empresasPrueba.filter(
    (item) =>
      item.estado_suscripcion === "prueba"
  ).length;

  const pruebasPorVencer =
    empresasPrueba.filter(
      (item) =>
        item.estado_suscripcion ===
          "prueba" &&
        Number(
          item.dias_restantes || 0
        ) <= 5
    ).length;

  return (
    <div
      style={{
        ...styles.layout,
        ...(esMovil
          ? styles.layoutMobile
          : {}),
      }}
    >
      {!esMovil && (
        <SidebarAdmin
          adminNombre={adminNombre}
          onLogout={cerrarSesion}
        />
      )}

      <main
        style={{
          ...styles.contenido,
          ...(esMovil
            ? styles.contenidoMobile
            : {}),
        }}
      >
        {esMovil && (
          <>
            <div style={styles.mobileBar}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={styles.mobileLogo}
              />

              <button
                type="button"
                onClick={() =>
                  setMenuMovilAbierto(
                    (abierto) => !abierto
                  )
                }
                style={styles.mobileMenuButton}
                aria-expanded={
                  menuMovilAbierto
                }
                aria-label="Abrir menú administrativo"
              >
                <Icon
                  name={
                    menuMovilAbierto
                      ? "close"
                      : "menu"
                  }
                  size={21}
                />

                <span>
                  {menuMovilAbierto
                    ? "Cerrar"
                    : "Menú"}
                </span>
              </button>
            </div>

            {menuMovilAbierto && (
              <div style={styles.mobileMenu}>
                <div
                  style={
                    styles.mobileMenuAdmin
                  }
                >
                  <div
                    style={
                      styles.avatarAdminMobile
                    }
                  >
                    {String(
                      adminNombre || "K"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <strong
                      style={
                        styles.mobileAdminNombre
                      }
                    >
                      {adminNombre}
                    </strong>

                    <span
                      style={
                        styles.mobileAdminRol
                      }
                    >
                      Panel maestro
                    </span>
                  </div>
                </div>

                {OPCIONES.map((item) => (
                  <Link
                    key={item.nombre}
                    href={item.ruta}
                    onClick={() =>
                      setMenuMovilAbierto(false)
                    }
                    style={
                      styles.mobileMenuItem
                    }
                  >
                    <span
                      style={
                        styles.mobileMenuIcono
                      }
                    >
                      <Icon
                        name={item.icono}
                        size={19}
                      />
                    </span>

                    <span>{item.nombre}</span>
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={cerrarSesion}
                  style={styles.mobileLogout}
                >
                  <Icon
                    name="logout"
                    size={18}
                  />
                  Cerrar sesión
                </button>
              </div>
            )}
          </>
        )}

        <section
          style={{
            ...styles.hero,
            ...(esMovil
              ? styles.heroMobile
              : {}),
          }}
        >
          <div style={styles.heroDecoracionUno} />
          <div style={styles.heroDecoracionDos} />

          <div style={styles.heroTexto}>
            <span style={styles.etiqueta}>
              CENTRO DE OPERACIONES INTERNAS
            </span>

            <h1
              style={{
                ...styles.titulo,
                ...(esMovil
                  ? styles.tituloMobile
                  : {}),
              }}
            >
              Centro Administrativo KONAX
            </h1>

            <p
              style={{
                ...styles.subtitulo,
                ...(esMovil
                  ? styles.subtituloMobile
                  : {}),
              }}
            >
              Administra empresas, planes,
              módulos y períodos de prueba
              desde un solo panel.
            </p>
          </div>

          {!esMovil && (
            <div style={styles.heroLogoBox}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={styles.heroLogo}
              />
            </div>
          )}
        </section>

        <section
          style={{
            ...styles.resumenGrid,
            ...(esMovil
              ? styles.resumenGridMobile
              : {}),
          }}
        >
          <ResumenCard
            titulo="Empresas registradas"
            valor={totalEmpresas}
            texto="Empresas visibles en el control"
            icono="building"
            tono="verde"
            esMovil={esMovil}
          />

          <ResumenCard
            titulo="Pendientes de iniciar"
            valor={pendientes}
            texto="Aprobadas, sin consumir días"
            icono="clock"
            tono="amarillo"
            esMovil={esMovil}
          />

          <ResumenCard
            titulo="Pruebas activas"
            valor={pruebasActivas}
            texto="Pilotos actualmente en curso"
            icono="play"
            tono="azul"
            esMovil={esMovil}
          />

          <ResumenCard
            titulo="Próximas a vencer"
            valor={pruebasPorVencer}
            texto="Pruebas con 5 días o menos"
            icono="alert"
            tono="rojo"
            esMovil={esMovil}
          />
        </section>

        <section
          style={{
            ...styles.controlCard,
            ...(esMovil
              ? styles.controlCardMobile
              : {}),
          }}
        >
          <div
            style={{
              ...styles.controlHeader,
              ...(esMovil
                ? styles.controlHeaderMobile
                : {}),
            }}
          >
            <div>
              <span
                style={styles.seccionEtiqueta}
              >
                CONTROL COMERCIAL
              </span>

              <h2
                style={{
                  ...styles.seccionTitulo,
                  ...(esMovil
                    ? styles.seccionTituloMobile
                    : {}),
                }}
              >
                Empresas y períodos de prueba
              </h2>

              <p style={styles.seccionTexto}>
                Aprueba pilotos e inicia los
                días cuando cada empresa esté
                lista.
              </p>
            </div>

            <div
              style={{
                ...styles.headerAcciones,
                ...(esMovil
                  ? styles.headerAccionesMobile
                  : {}),
              }}
            >
              <select
                value={filtroEstado}
                onChange={(event) =>
                  setFiltroEstado(
                    event.target.value
                  )
                }
                style={{
                  ...styles.selectFiltro,
                  ...(esMovil
                    ? styles.selectFiltroMobile
                    : {}),
                }}
              >
                <option value="Todos">
                  Todos los estados
                </option>
                <option value="activo">
                  Activo
                </option>
                <option value="pendiente_inicio_prueba">
                  Pendiente de inicio
                </option>
                <option value="prueba">
                  Prueba activa
                </option>
                <option value="prueba_vencida">
                  Prueba vencida
                </option>
                <option value="pendiente_activacion">
                  Pendiente de activación
                </option>
                <option value="suspendido">
                  Suspendido
                </option>
              </select>

              <button
                type="button"
                onClick={cargarEmpresasPrueba}
                style={{
                  ...styles.botonActualizar,
                  ...(esMovil
                    ? styles.botonActualizarMobile
                    : {}),
                  ...(cargandoEmpresas
                    ? styles.botonDeshabilitado
                    : {}),
                }}
                disabled={cargandoEmpresas}
              >
                <Icon
                  name="refresh"
                  size={17}
                />

                {cargandoEmpresas
                  ? "Actualizando..."
                  : "Actualizar"}
              </button>
            </div>
          </div>

          {cargandoEmpresas ? (
            <EstadoCarga />
          ) : empresasFiltradas.length === 0 ? (
            <div style={styles.estadoVacio}>
              <div style={styles.estadoVacioIcono}>
                <Icon name="search" size={24} />
              </div>

              <strong style={styles.estadoVacioTitulo}>
                No hay empresas
              </strong>

              <span style={styles.estadoVacioTexto}>
                No existen resultados para el
                estado seleccionado.
              </span>
            </div>
          ) : esMovil ? (
            <div style={styles.empresasMobileGrid}>
              {empresasFiltradas.map(
                (empresa) => {
                  const estiloEstado =
                    colorEstado(
                      empresa.estado_suscripcion
                    );

                  return (
                    <article
                      key={empresa.id}
                      style={styles.empresaMobileCard}
                    >
                      <div
                        style={
                          styles.empresaMobileTop
                        }
                      >
                        <div
                          style={
                            styles.empresaMobileIdentidad
                          }
                        >
                          <div
                            style={
                              styles.empresaInicialMobile
                            }
                          >
                            {String(
                              empresa.nombre || "E"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div
                            style={{
                              minWidth: 0,
                            }}
                          >
                            <strong
                              style={
                                styles.nombreEmpresaMobile
                              }
                            >
                              {empresa.nombre}
                            </strong>

                            <span
                              style={
                                styles.idEmpresaMobile
                              }
                            >
                              ID: {empresa.id}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            ...styles.badgeEstado,
                            ...styles.badgeEstadoMobile,
                            ...estiloEstado,
                          }}
                        >
                          {etiquetaEstado(
                            empresa.estado_suscripcion
                          )}
                        </span>
                      </div>

                      <div
                        style={
                          styles.detallesMobileGrid
                        }
                      >
                        <DetalleMobile
                          etiqueta="Aceptación"
                          valor={formatoFecha(
                            empresa.fecha_aceptacion_piloto
                          )}
                        />

                        <DetalleMobile
                          etiqueta="Inicio"
                          valor={formatoFecha(
                            empresa.fecha_inicio_prueba
                          )}
                        />

                        <DetalleMobile
                          etiqueta="Vencimiento"
                          valor={formatoFecha(
                            empresa.fecha_fin_prueba
                          )}
                        />

                        <DetalleMobile
                          etiqueta="Días restantes"
                          valor={
                            empresa.estado_suscripcion ===
                            "prueba"
                              ? empresa.dias_restantes ??
                                0
                              : "-"
                          }
                          destacado={
                            empresa.estado_suscripcion ===
                            "prueba"
                          }
                        />
                      </div>

                      <div
                        style={
                          styles.accionMobileBox
                        }
                      >
                        {renderAccion(
                          empresa,
                          true
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div style={styles.tablaScroll}>
              <table style={styles.tabla}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      Empresa
                    </th>
                    <th style={styles.th}>
                      Estado
                    </th>
                    <th style={styles.th}>
                      Aceptación
                    </th>
                    <th style={styles.th}>
                      Inicio
                    </th>
                    <th style={styles.th}>
                      Vencimiento
                    </th>
                    <th style={styles.th}>
                      Días restantes
                    </th>
                    <th style={styles.th}>
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {empresasFiltradas.map(
                    (empresa) => {
                      const estiloEstado =
                        colorEstado(
                          empresa.estado_suscripcion
                        );

                      return (
                        <tr key={empresa.id}>
                          <td style={styles.td}>
                            <div
                              style={
                                styles.empresaTabla
                              }
                            >
                              <div
                                style={
                                  styles.empresaInicial
                                }
                              >
                                {String(
                                  empresa.nombre ||
                                    "E"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div
                                style={{
                                  minWidth: 0,
                                }}
                              >
                                <strong
                                  style={
                                    styles.nombreEmpresaTabla
                                  }
                                >
                                  {empresa.nombre}
                                </strong>

                                <span
                                  style={
                                    styles.idEmpresa
                                  }
                                >
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
                              {etiquetaEstado(
                                empresa.estado_suscripcion
                              )}
                            </span>
                          </td>

                          <td style={styles.td}>
                            {formatoFecha(
                              empresa.fecha_aceptacion_piloto
                            )}
                          </td>

                          <td style={styles.td}>
                            {formatoFecha(
                              empresa.fecha_inicio_prueba
                            )}
                          </td>

                          <td style={styles.td}>
                            {formatoFecha(
                              empresa.fecha_fin_prueba
                            )}
                          </td>

                          <td style={styles.td}>
                            {empresa.estado_suscripcion ===
                            "prueba"
                              ? empresa.dias_restantes ??
                                0
                              : "-"}
                          </td>

                          <td style={styles.td}>
                            <div
                              style={
                                styles.accionesTabla
                              }
                            >
                              {renderAccion(
                                empresa
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
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

function SidebarAdmin({
  adminNombre,
  onLogout,
}) {
  return (
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
          <span style={styles.brandLabel}>
            CENTRO INTERNO
          </span>

          <h2 style={styles.brandTitle}>
            KONAX
          </h2>

          <p style={styles.brandSub}>
            Administración
          </p>
        </div>
      </div>

      <div style={styles.empresaBox}>
        <div style={styles.avatarAdmin}>
          {String(adminNombre || "K")
            .charAt(0)
            .toUpperCase()}
        </div>

        <div style={{ minWidth: 0 }}>
          <strong style={styles.empresaNombre}>
            {adminNombre}
          </strong>

          <span style={styles.empresaRol}>
            SuperAdmin
          </span>
        </div>
      </div>

      <span style={styles.menuTitulo}>
        NAVEGACIÓN
      </span>

      <nav style={styles.menu}>
        {OPCIONES.map((item) => (
          <Link
            key={item.nombre}
            href={item.ruta}
            style={styles.menuItem}
          >
            <span style={styles.menuIcono}>
              <Icon
                name={item.icono}
                size={18}
              />
            </span>

            <span>{item.nombre}</span>

            <Icon
              name="chevron"
              size={15}
            />
          </Link>
        ))}
      </nav>

      <div style={styles.sidebarAyuda}>
        <span style={styles.sidebarAyudaEtiqueta}>
          PANEL MAESTRO
        </span>

        <strong style={styles.sidebarAyudaTitulo}>
          Control centralizado
        </strong>

        <p style={styles.sidebarAyudaTexto}>
          Gestiona la operación interna de
          KONAX desde un solo lugar.
        </p>
      </div>

      <button
        type="button"
        onClick={onLogout}
        style={styles.botonSalir}
      >
        <Icon name="logout" size={18} />
        Cerrar sesión
      </button>
    </aside>
  );
}

function ResumenCard({
  titulo,
  valor,
  texto,
  icono,
  tono,
  esMovil,
}) {
  const tonos = {
    verde: {
      iconBackground: "#e9f8ef",
      iconColor: "#16834f",
      line: "#16834f",
    },
    amarillo: {
      iconBackground: "#fff7df",
      iconColor: "#a56a00",
      line: "#d89a19",
    },
    azul: {
      iconBackground: "#eaf2ff",
      iconColor: "#2563eb",
      line: "#2563eb",
    },
    rojo: {
      iconBackground: "#fff0f0",
      iconColor: "#c62828",
      line: "#d33d3d",
    },
  };

  const color =
    tonos[tono] || tonos.verde;

  return (
    <article
      style={{
        ...styles.resumenCard,
        ...(esMovil
          ? styles.resumenCardMobile
          : {}),
      }}
    >
      <div
        style={{
          ...styles.resumenLinea,
          background: color.line,
        }}
      />

      <div style={styles.resumenTop}>
        <span
          style={{
            ...styles.resumenIcono,
            background:
              color.iconBackground,
            color: color.iconColor,
          }}
        >
          <Icon name={icono} size={19} />
        </span>

        <span style={styles.resumenLabel}>
          {titulo}
        </span>
      </div>

      <strong
        style={{
          ...styles.resumenValor,
          ...(esMovil
            ? styles.resumenValorMobile
            : {}),
        }}
      >
        {valor}
      </strong>

      <span style={styles.resumenTexto}>
        {texto}
      </span>
    </article>
  );
}

function DetalleMobile({
  etiqueta,
  valor,
  destacado = false,
}) {
  return (
    <div style={styles.detalleMobile}>
      <span style={styles.detalleMobileEtiqueta}>
        {etiqueta}
      </span>

      <strong
        style={{
          ...styles.detalleMobileValor,
          ...(destacado
            ? styles.detalleMobileDestacado
            : {}),
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

function EstadoCarga() {
  return (
    <div style={styles.estadoCarga}>
      <span style={styles.spinner} />

      <strong style={styles.estadoCargaTitulo}>
        Cargando empresas
      </strong>

      <span style={styles.estadoCargaTexto}>
        Consultando estados y períodos de
        prueba.
      </span>
    </div>
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
    "aria-hidden": true,
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
        <rect
          x="3"
          y="7"
          width="18"
          height="13"
          rx="2"
        />
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
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="M6 6l12 12M18 6L6 18" />
      </>
    ),
    chevron: (
      <>
        <path d="M9 18l6-6-6-6" />
      </>
    ),
    check: (
      <>
        <path d="M5 12l4 4L19 6" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8l6 4-6 4z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3L2.8 20h18.4L12 3z" />
        <path d="M12 9v5M12 17.5h.01" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </>
    ),
  };

  return (
    <svg {...props}>
      {icons[name] || icons.modules}
    </svg>
  );
}

const styles = {
  layout: {
    minHeight: "100vh",
    display: "flex",
    background:
      "linear-gradient(180deg,#f6f8f7 0%,#eef3f0 100%)",
    color: "#152019",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  layoutMobile: {
    display: "block",
    width: "100%",
    overflowX: "hidden",
  },

  sidebar: {
    width: 274,
    minWidth: 274,
    height: "100vh",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    padding: "20px 15px",
    boxSizing: "border-box",
    overflowY: "auto",
    background:
      "linear-gradient(180deg,#07110b 0%,#0d281a 55%,#123b25 100%)",
    color: "#ffffff",
    boxShadow:
      "14px 0 38px rgba(7,25,15,.12)",
  },

  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 4px 18px",
    borderBottom:
      "1px solid rgba(255,255,255,.09)",
  },

  logoBox: {
    width: 105,
    height: 55,
    padding: 5,
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    borderRadius: 13,
    background: "#ffffff",
    boxShadow:
      "0 10px 24px rgba(0,0,0,.16)",
  },

  logoSidebar: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  brandLabel: {
    color: "#76dda3",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  brandTitle: {
    margin: "2px 0 0",
    fontSize: 20,
    lineHeight: 1,
  },

  brandSub: {
    margin: "4px 0 0",
    color: "#bdd8c7",
    fontSize: 10,
  },

  empresaBox: {
    margin: "17px 0 20px",
    padding: 13,
    display: "grid",
    gridTemplateColumns:
      "42px minmax(0,1fr)",
    gap: 10,
    alignItems: "center",
    border:
      "1px solid rgba(255,255,255,.10)",
    borderRadius: 15,
    background:
      "rgba(255,255,255,.065)",
  },

  avatarAdmin: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background:
      "linear-gradient(145deg,#ffffff,#dff3e7)",
    color: "#123b25",
    fontWeight: 950,
    boxShadow:
      "0 8px 18px rgba(0,0,0,.12)",
  },

  empresaNombre: {
    display: "block",
    overflow: "hidden",
    color: "#ffffff",
    fontSize: 12,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  empresaRol: {
    display: "block",
    marginTop: 3,
    color: "#9fc5ad",
    fontSize: 10,
  },

  menuTitulo: {
    display: "block",
    margin: "0 7px 8px",
    color: "#80ae91",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  menu: {
    display: "grid",
    gap: 7,
  },

  menuItem: {
    minHeight: 47,
    display: "grid",
    gridTemplateColumns:
      "32px minmax(0,1fr) 16px",
    alignItems: "center",
    gap: 8,
    padding: "9px 11px",
    border:
      "1px solid rgba(255,255,255,.035)",
    borderRadius: 13,
    background:
      "rgba(255,255,255,.025)",
    color: "#e4ece7",
    fontSize: 12,
    fontWeight: 760,
    textDecoration: "none",
  },

  menuIcono: {
    width: 31,
    height: 31,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background:
      "rgba(125,220,171,.10)",
    color: "#7ddcab",
  },

  sidebarAyuda: {
    marginTop: "auto",
    marginBottom: 12,
    padding: 14,
    border:
      "1px solid rgba(125,220,171,.15)",
    borderRadius: 15,
    background:
      "linear-gradient(145deg,rgba(125,220,171,.08),rgba(255,255,255,.025))",
  },

  sidebarAyudaEtiqueta: {
    color: "#7ddcab",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1,
  },

  sidebarAyudaTitulo: {
    display: "block",
    marginTop: 7,
    color: "#ffffff",
    fontSize: 13,
  },

  sidebarAyudaTexto: {
    margin: "6px 0 0",
    color: "#abc7b5",
    fontSize: 10,
    lineHeight: 1.45,
  },

  botonSalir: {
    width: "100%",
    minHeight: 45,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border:
      "1px solid rgba(255,255,255,.13)",
    borderRadius: 12,
    background:
      "rgba(255,255,255,.065)",
    color: "#ffffff",
    fontWeight: 850,
    cursor: "pointer",
  },

  contenido: {
    flex: 1,
    minWidth: 0,
    padding: "26px 28px 42px",
    boxSizing: "border-box",
  },

  contenidoMobile: {
    width: "100%",
    maxWidth: "100%",
    padding: "14px 12px 30px",
    overflowX: "hidden",
  },

  mobileBar: {
    position: "sticky",
    top: 0,
    zIndex: 70,
    margin: "-14px -12px 14px",
    padding: "10px 22px 10px 13px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) auto",
    alignItems: "center",
    gap: 12,
    borderBottom:
      "1px solid #dce6e0",
    background:
      "rgba(255,255,255,.96)",
    backdropFilter: "blur(13px)",
    boxShadow:
      "0 7px 24px rgba(28,52,39,.07)",
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
    marginRight: 2,
    padding: "9px 15px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border:
      "1px solid rgba(255,255,255,.15)",
    borderRadius: 14,
    background:
      "linear-gradient(135deg,#173c2a,#0f6a3d)",
    color: "#ffffff",
    fontWeight: 850,
    cursor: "pointer",
    boxShadow:
      "0 10px 22px rgba(23,60,42,.18)",
  },

  mobileMenu: {
    position: "fixed",
    top: 66,
    left: 10,
    right: 10,
    zIndex: 80,
    maxHeight:
      "calc(100vh - 80px)",
    padding: 11,
    display: "grid",
    gap: 8,
    overflowY: "auto",
    border: "1px solid #dce6e0",
    borderRadius: 19,
    background: "#ffffff",
    boxShadow:
      "0 26px 65px rgba(15,23,42,.22)",
  },

  mobileMenuAdmin: {
    padding: "10px 9px 13px",
    display: "grid",
    gridTemplateColumns:
      "42px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
    borderBottom:
      "1px solid #e5ece8",
  },

  avatarAdminMobile: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#173c2a",
    color: "#ffffff",
    fontWeight: 900,
  },

  mobileAdminNombre: {
    display: "block",
    overflow: "hidden",
    fontSize: 13,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mobileAdminRol: {
    display: "block",
    marginTop: 2,
    color: "#7a877f",
    fontSize: 10,
  },

  mobileMenuItem: {
    minHeight: 48,
    padding: "9px 11px",
    display: "grid",
    gridTemplateColumns:
      "34px minmax(0,1fr)",
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

  mobileMenuIcono: {
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#edf8f1",
    color: "#16834f",
  },

  mobileLogout: {
    minHeight: 47,
    padding: "10px 12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid #fecaca",
    borderRadius: 12,
    background: "#fff6f6",
    color: "#b42318",
    fontWeight: 850,
    cursor: "pointer",
  },

  hero: {
    maxWidth: 1500,
    minHeight: 190,
    margin: "0 auto 18px",
    padding: "28px 30px",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 22,
    border:
      "1px solid rgba(255,255,255,.08)",
    borderRadius: 25,
    background:
      "linear-gradient(135deg,#07100b 0%,#103421 55%,#16834f 100%)",
    boxShadow:
      "0 23px 58px rgba(11,48,29,.18)",
  },

  heroMobile: {
    minHeight: 0,
    marginBottom: 13,
    padding: "21px 18px 22px",
    borderRadius: 20,
  },

  heroDecoracionUno: {
    position: "absolute",
    width: 260,
    height: 260,
    top: -145,
    right: -70,
    borderRadius: "50%",
    background:
      "rgba(125,220,171,.10)",
  },

  heroDecoracionDos: {
    position: "absolute",
    width: 170,
    height: 170,
    bottom: -105,
    left: "44%",
    border:
      "1px solid rgba(255,255,255,.10)",
    borderRadius: "50%",
  },

  heroTexto: {
    position: "relative",
    zIndex: 2,
    flex: 1,
  },

  etiqueta: {
    display: "block",
    marginBottom: 8,
    color: "#7ce1aa",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.45,
  },

  titulo: {
    maxWidth: 780,
    margin: "0 0 10px",
    color: "#ffffff",
    fontSize:
      "clamp(34px,4vw,50px)",
    lineHeight: 1.02,
    letterSpacing: -1,
  },

  tituloMobile: {
    fontSize: 30,
    lineHeight: 1.05,
    letterSpacing: -0.7,
  },

  subtitulo: {
    maxWidth: 720,
    margin: 0,
    color: "#d1e5d8",
    fontSize: 14,
    lineHeight: 1.55,
  },

  subtituloMobile: {
    maxWidth: "100%",
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
    boxShadow:
      "0 16px 36px rgba(0,0,0,.18)",
  },

  heroLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  resumenGrid: {
    maxWidth: 1500,
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: 13,
  },

  resumenGridMobile: {
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 10,
    marginBottom: 13,
  },

  resumenCard: {
    minHeight: 128,
    padding: "17px 17px 15px",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #dfe7e2",
    borderRadius: 19,
    background:
      "linear-gradient(155deg,#ffffff 0%,#f7faf8 100%)",
    boxShadow:
      "0 12px 30px rgba(15,23,42,.055)",
  },

  resumenCardMobile: {
    minHeight: 120,
    padding: "14px 13px 13px",
    borderRadius: 17,
  },

  resumenLinea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },

  resumenTop: {
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  resumenIcono: {
    width: 36,
    height: 36,
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
  },

  resumenLabel: {
    color: "#657169",
    fontSize: 10,
    fontWeight: 850,
    lineHeight: 1.25,
  },

  resumenValor: {
    marginTop: 10,
    color: "#152019",
    fontSize: 31,
    lineHeight: 1,
  },

  resumenValorMobile: {
    fontSize: 27,
  },

  resumenTexto: {
    marginTop: "auto",
    paddingTop: 7,
    color: "#89948d",
    fontSize: 9.5,
    lineHeight: 1.3,
  },

  controlCard: {
    maxWidth: 1500,
    margin: "0 auto",
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 22,
    background: "#ffffff",
    boxShadow:
      "0 14px 38px rgba(15,23,42,.055)",
  },

  controlCardMobile: {
    padding: 14,
    borderRadius: 18,
  },

  controlHeader: {
    marginBottom: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 18,
    flexWrap: "wrap",
  },

  controlHeaderMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    alignItems: "stretch",
    gap: 13,
    marginBottom: 14,
  },

  seccionEtiqueta: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  seccionTitulo: {
    margin: "0 0 5px",
    fontSize: 24,
    lineHeight: 1.15,
  },

  seccionTituloMobile: {
    fontSize: 21,
  },

  seccionTexto: {
    maxWidth: 610,
    margin: 0,
    color: "#758078",
    fontSize: 11.5,
    lineHeight: 1.5,
  },

  headerAcciones: {
    display: "flex",
    gap: 9,
    flexWrap: "wrap",
  },

  headerAccionesMobile: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) auto",
    gap: 8,
  },

  selectFiltro: {
    minHeight: 43,
    padding: "9px 34px 9px 12px",
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    outline: "none",
    background: "#ffffff",
    color: "#18221c",
    fontSize: 11.5,
    fontWeight: 750,
  },

  selectFiltroMobile: {
    width: "100%",
    minWidth: 0,
  },

  botonActualizar: {
    minHeight: 43,
    padding: "9px 14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #c5d2ca",
    borderRadius: 11,
    background:
      "linear-gradient(145deg,#ffffff,#f2f6f3)",
    color: "#243129",
    fontSize: 11.5,
    fontWeight: 850,
    cursor: "pointer",
    boxShadow:
      "0 7px 17px rgba(23,60,42,.06)",
  },

  botonActualizarMobile: {
    padding: "9px 12px",
  },

  botonDeshabilitado: {
    opacity: 0.62,
    cursor: "not-allowed",
  },

  estadoCarga: {
    minHeight: 230,
    padding: "35px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#758078",
    textAlign: "center",
  },

  spinner: {
    width: 34,
    height: 34,
    marginBottom: 13,
    display: "block",
    border: "4px solid #dcebe2",
    borderTopColor: "#16834f",
    borderRadius: "50%",
  },

  estadoCargaTitulo: {
    color: "#243129",
    fontSize: 14,
  },

  estadoCargaTexto: {
    marginTop: 5,
    fontSize: 10.5,
  },

  estadoVacio: {
    minHeight: 220,
    padding: "30px 14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#7c8880",
    textAlign: "center",
  },

  estadoVacioIcono: {
    width: 50,
    height: 50,
    marginBottom: 11,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#edf8f1",
    color: "#16834f",
  },

  estadoVacioTitulo: {
    color: "#27352d",
    fontSize: 15,
  },

  estadoVacioTexto: {
    marginTop: 5,
    fontSize: 10.5,
  },

  tablaScroll: {
    overflowX: "auto",
    border: "1px solid #e5ebe7",
    borderRadius: 15,
  },

  tabla: {
    width: "100%",
    minWidth: 1080,
    borderCollapse: "separate",
    borderSpacing: 0,
  },

  th: {
    padding: "12px 13px",
    borderBottom: "1px solid #dce5df",
    background: "#f5f8f6",
    color: "#536058",
    fontSize: 8.5,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: 0.75,
  },

  td: {
    padding: "14px 13px",
    borderBottom: "1px solid #edf1ee",
    background: "#ffffff",
    color: "#435047",
    fontSize: 10.5,
    verticalAlign: "middle",
  },

  empresaTabla: {
    display: "grid",
    gridTemplateColumns:
      "42px minmax(0,1fr)",
    gap: 10,
    alignItems: "center",
  },

  empresaInicial: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background:
      "linear-gradient(145deg,#edf8f1,#dff1e7)",
    color: "#16834f",
    fontWeight: 900,
  },

  nombreEmpresaTabla: {
    display: "block",
    color: "#17211c",
    fontSize: 11.5,
  },

  idEmpresa: {
    display: "block",
    maxWidth: 215,
    marginTop: 3,
    overflow: "hidden",
    color: "#8a958e",
    fontSize: 7.5,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  badgeEstado: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 9px",
    border: "1px solid transparent",
    borderRadius: 999,
    fontSize: 8.5,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  accionesTabla: {
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
  },

  botonAprobar: {
    minHeight: 36,
    padding: "8px 11px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "none",
    borderRadius: 10,
    background:
      "linear-gradient(135deg,#17211c,#263a2e)",
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: 850,
    cursor: "pointer",
    boxShadow:
      "0 7px 16px rgba(23,33,28,.15)",
  },

  botonIniciar: {
    minHeight: 36,
    padding: "8px 11px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "none",
    borderRadius: 10,
    background:
      "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: 850,
    cursor: "pointer",
    boxShadow:
      "0 7px 16px rgba(22,131,79,.17)",
  },

  estadoEnCurso: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    color: "#1d4ed8",
    fontSize: 9.5,
    fontWeight: 850,
  },

  puntoAzul: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#2563eb",
    boxShadow:
      "0 0 0 4px rgba(37,99,235,.10)",
  },

  sinAccion: {
    color: "#8a958e",
    fontSize: 9.5,
  },

  empresasMobileGrid: {
    display: "grid",
    gap: 11,
  },

  empresaMobileCard: {
    padding: 14,
    border: "1px solid #dfe7e2",
    borderRadius: 17,
    background:
      "linear-gradient(155deg,#ffffff,#f7faf8)",
    boxShadow:
      "0 10px 25px rgba(15,23,42,.05)",
  },

  empresaMobileTop: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) auto",
    alignItems: "start",
    gap: 9,
  },

  empresaMobileIdentidad: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns:
      "42px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
  },

  empresaInicialMobile: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background:
      "linear-gradient(145deg,#e8f7ee,#d9efe2)",
    color: "#16834f",
    fontWeight: 900,
  },

  nombreEmpresaMobile: {
    display: "block",
    overflow: "hidden",
    color: "#152019",
    fontSize: 13,
    lineHeight: 1.2,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  idEmpresaMobile: {
    display: "block",
    marginTop: 3,
    overflow: "hidden",
    color: "#909b94",
    fontSize: 7.5,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  badgeEstadoMobile: {
    maxWidth: 118,
    fontSize: 7.5,
    lineHeight: 1.15,
    whiteSpace: "normal",
    textAlign: "center",
  },

  detallesMobileGrid: {
    marginTop: 13,
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 8,
  },

  detalleMobile: {
    minWidth: 0,
    padding: "10px 11px",
    border: "1px solid #e7ece9",
    borderRadius: 12,
    background: "#ffffff",
  },

  detalleMobileEtiqueta: {
    display: "block",
    color: "#7d8981",
    fontSize: 8,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },

  detalleMobileValor: {
    display: "block",
    marginTop: 5,
    overflow: "hidden",
    color: "#27342d",
    fontSize: 11,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  detalleMobileDestacado: {
    color: "#16834f",
    fontSize: 17,
  },

  accionMobileBox: {
    marginTop: 11,
    paddingTop: 11,
    display: "flex",
    justifyContent: "flex-end",
    borderTop: "1px solid #e7ece9",
  },

  botonAccionMobile: {
    width: "100%",
    minHeight: 43,
    fontSize: 10.5,
  },
};
