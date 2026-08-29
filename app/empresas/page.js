"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const OPCIONES_ADMIN = [
  {
    nombre: "Panel Maestro",
    ruta: "/admin",
    icono: "dashboard",
  },
  {
    nombre: "Crear Nueva Empresa",
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

const CATEGORIAS = {
  "Ventas a Crédito": [
    "Mueblería",
    "Electrónica",
    "Distribuidora",
    "Cooperativa",
    "Financiera",
    "Casa de Empeño",
  ],
  "Suscripciones y Membresías": [
    "Gimnasio",
    "IPTV",
    "Internet y Cable",
    "Club",
    "Servicio por Membresía",
  ],
  Comercio: [
    "Ferretería",
    "Farmacia",
    "Tienda",
    "Mercado",
    "Repuestos",
    "Boutique",
    "Mueblería",
    "Comercio general",
  ],
  Servicios: [
    "Lavandería",
    "Lavaauto",
    "Seguridad",
    "Limpieza",
    "Jardinería",
    "Mantenimiento",
    "Veterinaria",
    "Clínica",
    "Belleza",
    "Consultoría",
  ],
  Educación: [
    "Escuela",
    "Colegio",
    "Academia",
    "Centro de Capacitación",
  ],
};

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [mostrarEmpresas, setMostrarEmpresas] = useState(false);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [esMovil, setEsMovil] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    cargarEmpresas();

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

  async function cargarEmpresas() {
    setCargandoEmpresas(true);

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando empresas: " + error.message);
      setEmpresas([]);
      setCargandoEmpresas(false);
      return;
    }

    setEmpresas(data || []);
    setCargandoEmpresas(false);
  }

  function limpiarFormulario() {
    setNombre("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setCategoria("");
    setTipoNegocio("");
  }

  function guardarEmpresaEnLocalStorage(empresa) {
    localStorage.setItem("empresaAdminCreadaId", empresa.id);
    localStorage.setItem("empresaAdminCreadaNombre", empresa.nombre || "");
    localStorage.setItem("categoriaNegocioAdmin", empresa.categoria_negocio || "");
    localStorage.setItem("tipoNegocioAdmin", empresa.tipo_negocio || "");
    localStorage.setItem("empresaId", empresa.id);
    localStorage.setItem("empresaNombre", empresa.nombre || "");
  }

  async function guardarEmpresa() {
    if (!nombre.trim() || !telefono.trim() || !categoria || !tipoNegocio) {
      alert("Complete nombre, teléfono, categoría y tipo de negocio.");
      return;
    }

    if (guardando) return;

    setGuardando(true);

    const { data, error } = await supabase
      .from("empresas")
      .insert([
        {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          correo: correo.trim(),
          direccion: direccion.trim(),
          categoria_negocio: categoria,
          tipo_negocio: tipoNegocio,
          estado: "Activo",
          estado_pago: "Pendiente",
          estado_plan: "Pendiente",
          configuracion_completa: false,
          plan_codigo: null,
          plan_nombre: null,
          plan_tipo: null,
          plan_precio: 0,
          fecha_activacion: null,
          fecha_ultimo_pago: null,
          fecha_proxima_facturacion: null,
        },
      ])
      .select()
      .single();

    if (error) {
      setGuardando(false);
      alert("Error al guardar empresa: " + error.message);
      return;
    }

    const { error: errorBitacora } = await supabase
      .from("bitacora_konax")
      .insert([
        {
          empresa_id: data.id,
          empresa_nombre: data.nombre,
          accion: "Empresa creada",
          descripcion:
            `Se creó la empresa ${data.nombre} en KONAX. ` +
            "Pendiente de asignar plan.",
          estado_anterior: null,
          estado_nuevo: "Activo",
          usuario:
            localStorage.getItem("adminKonaxNombre") || "KONAX",
        },
      ]);

    if (errorBitacora) {
      console.error("No se pudo registrar la bitácora:", errorBitacora);
    }

    guardarEmpresaEnLocalStorage(data);
    limpiarFormulario();
    await cargarEmpresas();

    setGuardando(false);

    alert("Empresa creada correctamente. Ahora selecciona el plan.");
    window.location.href = "/planes";
  }

  function seleccionarEmpresa(empresa) {
    guardarEmpresaEnLocalStorage(empresa);
    alert("Empresa seleccionada: " + empresa.nombre);
  }

  function irPlan(empresa) {
    guardarEmpresaEnLocalStorage(empresa);
    window.location.href = "/planes";
  }

  function irUsuarioPrincipal(empresa) {
    guardarEmpresaEnLocalStorage(empresa);
    window.location.href = "/usuarios";
  }

  function irAdministrarEmpresa(empresa) {
    guardarEmpresaEnLocalStorage(empresa);
    window.location.href = `/admin-empresa?empresa=${empresa.id}`;
  }

  function formatoFecha(fecha) {
    if (!fecha) return "-";

    const texto = String(fecha).slice(0, 10);
    const [year, month, day] = texto.split("-");

    if (!year || !month || !day) {
      return fecha;
    }

    return `${day}/${month}/${year}`;
  }

  function empresaActiva(empresa) {
    return empresa.estado === "Activo" || empresa.estado === "Activa";
  }

  return (
    <div style={s.page}>
      {esMovil && (
        <>
          <div style={s.mobileBar}>
            <img
              src="/konax-logo.png"
              alt="KONAX"
              style={s.mobileLogo}
            />

            <button
              type="button"
              onClick={() =>
                setMenuMovilAbierto((actual) => !actual)
              }
              style={s.mobileMenuButton}
              aria-expanded={menuMovilAbierto}
            >
              <Icon
                name={menuMovilAbierto ? "close" : "menu"}
                size={21}
              />

              {menuMovilAbierto ? "Cerrar" : "Menú"}
            </button>
          </div>

          {menuMovilAbierto && (
            <div style={s.mobileMenu}>
              {OPCIONES_ADMIN.map((item) => (
                <Link
                  key={item.ruta}
                  href={item.ruta}
                  onClick={() => setMenuMovilAbierto(false)}
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
              GESTIÓN DE EMPRESAS
            </span>

            <h1
              style={{
                ...s.heroTitle,
                ...(esMovil ? s.heroTitleMobile : {}),
              }}
            >
              Crear Nueva Empresa
            </h1>

            <p
              style={{
                ...s.heroText,
                ...(esMovil ? s.heroTextMobile : {}),
              }}
            >
              Registra la empresa, asigna el plan, crea el usuario
              administrador y configura sus módulos.
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
            ...s.flowGrid,
            ...(esMovil ? s.flowGridMobile : {}),
          }}
        >
          <FlowStep
            numero="1"
            titulo="Crear empresa"
            texto="Datos generales del negocio"
          />

          <FlowStep
            numero="2"
            titulo="Asignar plan"
            texto="Cobros, Gestión o Pro"
          />

          <FlowStep
            numero="3"
            titulo="Crear administrador"
            texto="Usuario principal del negocio"
          />

          <FlowStep
            numero="4"
            titulo="Configurar módulos"
            texto="Permisos y funciones"
          />
        </section>

        <section
          style={{
            ...s.formCard,
            ...(esMovil ? s.formCardMobile : {}),
          }}
        >
          <div style={s.sectionHeader}>
            <div>
              <span style={s.sectionEyebrow}>
                PASO 1
              </span>

              <h2
                style={{
                  ...s.sectionTitle,
                  ...(esMovil ? s.sectionTitleMobile : {}),
                }}
              >
                Nueva Empresa Cliente
              </h2>

              <p style={s.sectionText}>
                Complete los datos principales del negocio.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setMostrarEmpresas((actual) => !actual)
              }
              style={{
                ...s.showCompaniesButton,
                ...(esMovil ? s.fullWidthButton : {}),
              }}
            >
              <Icon name="list" size={17} />

              {mostrarEmpresas
                ? "Ocultar empresas"
                : "Ver empresas registradas"}
            </button>
          </div>

          <div
            style={{
              ...s.formGrid,
              ...(esMovil ? s.formGridMobile : {}),
            }}
          >
            <Campo label="Nombre de la empresa *">
              <input
                type="text"
                placeholder="Ej. Lavandería El Sol"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                style={s.input}
              />
            </Campo>

            <Campo label="Teléfono *">
              <input
                type="tel"
                inputMode="tel"
                placeholder="Ej. 6000-0000"
                value={telefono}
                onChange={(event) => setTelefono(event.target.value)}
                style={s.input}
              />
            </Campo>

            <Campo label="Correo">
              <input
                type="email"
                inputMode="email"
                placeholder="empresa@correo.com"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                style={s.input}
              />
            </Campo>

            <Campo label="Dirección">
              <input
                type="text"
                placeholder="Dirección del negocio"
                value={direccion}
                onChange={(event) => setDireccion(event.target.value)}
                style={s.input}
              />
            </Campo>

            <Campo label="Categoría del negocio *">
              <select
                value={categoria}
                onChange={(event) => {
                  setCategoria(event.target.value);
                  setTipoNegocio("");
                }}
                style={s.input}
              >
                <option value="">
                  Seleccione una categoría
                </option>

                {Object.keys(CATEGORIAS).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Tipo de negocio *">
              <select
                value={tipoNegocio}
                onChange={(event) =>
                  setTipoNegocio(event.target.value)
                }
                style={{
                  ...s.input,
                  ...(!categoria ? s.inputDisabled : {}),
                }}
                disabled={!categoria}
              >
                <option value="">
                  Seleccione el tipo de negocio
                </option>

                {categoria &&
                  CATEGORIAS[categoria].map((negocio) => (
                    <option
                      key={negocio}
                      value={negocio}
                    >
                      {negocio}
                    </option>
                  ))}
              </select>
            </Campo>
          </div>

          <div
            style={{
              ...s.formActions,
              ...(esMovil ? s.formActionsMobile : {}),
            }}
          >
            <button
              type="button"
              onClick={guardarEmpresa}
              style={{
                ...s.createButton,
                ...(guardando ? s.disabledButton : {}),
              }}
              disabled={guardando}
            >
              <Icon name="plus" size={18} />

              {guardando
                ? "Guardando..."
                : "Crear Empresa"}
            </button>

            <button
              type="button"
              onClick={limpiarFormulario}
              style={s.clearButton}
              disabled={guardando}
            >
              Limpiar
            </button>

            <Link href="/admin" style={s.backButton}>
              <Icon name="arrowBack" size={17} />
              Volver al Admin
            </Link>
          </div>
        </section>

        {mostrarEmpresas && (
          <section
            style={{
              ...s.companiesCard,
              ...(esMovil ? s.companiesCardMobile : {}),
            }}
          >
            <div style={s.sectionHeader}>
              <div>
                <span style={s.sectionEyebrow}>
                  EMPRESAS CREADAS
                </span>

                <h2
                  style={{
                    ...s.sectionTitle,
                    ...(esMovil ? s.sectionTitleMobile : {}),
                  }}
                >
                  Empresas Registradas
                </h2>

                <p style={s.sectionText}>
                  Selecciona una empresa para continuar con su plan,
                  administrador o módulos.
                </p>
              </div>

              <button
                type="button"
                onClick={cargarEmpresas}
                style={{
                  ...s.refreshButton,
                  ...(esMovil ? s.fullWidthButton : {}),
                }}
                disabled={cargandoEmpresas}
              >
                <Icon name="refresh" size={17} />

                {cargandoEmpresas
                  ? "Actualizando..."
                  : "Actualizar"}
              </button>
            </div>

            {cargandoEmpresas ? (
              <div style={s.loadingBox}>
                Cargando empresas...
              </div>
            ) : empresas.length === 0 ? (
              <div style={s.emptyBox}>
                No hay empresas registradas.
              </div>
            ) : esMovil ? (
              <div style={s.mobileCompanyGrid}>
                {empresas.map((empresa) => (
                  <article
                    key={empresa.id}
                    style={s.mobileCompanyCard}
                  >
                    <div style={s.mobileCompanyTop}>
                      <div style={s.mobileIdentity}>
                        <div style={s.companyInitial}>
                          {String(empresa.nombre || "E")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <strong style={s.mobileCompanyName}>
                            {empresa.nombre}
                          </strong>

                          <span style={s.mobileCompanyText}>
                            {empresa.correo || "-"}
                          </span>

                          <span style={s.mobileCompanyText}>
                            {empresa.telefono || "-"}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          ...s.statusBadge,
                          ...(empresaActiva(empresa)
                            ? s.statusActive
                            : s.statusInactive),
                        }}
                      >
                        {empresa.estado || "Activo"}
                      </span>
                    </div>

                    <div style={s.mobileDetailsGrid}>
                      <Detail
                        label="Negocio"
                        value={empresa.tipo_negocio || "-"}
                      />

                      <Detail
                        label="Plan"
                        value={empresa.plan_nombre || "Sin plan"}
                      />

                      <Detail
                        label="Pago"
                        value={empresa.estado_pago || "Pendiente"}
                      />

                      <Detail
                        label="Facturación"
                        value={formatoFecha(
                          empresa.fecha_proxima_facturacion
                        )}
                      />

                      <Detail
                        label="Configuración"
                        value={
                          empresa.configuracion_completa
                            ? "Completa"
                            : "Pendiente"
                        }
                      />
                    </div>

                    <div style={s.mobileActions}>
                      <button
                        type="button"
                        style={s.mobileAdminButton}
                        onClick={() =>
                          irAdministrarEmpresa(empresa)
                        }
                      >
                        Administrar
                      </button>

                      <button
                        type="button"
                        style={s.mobilePlanButton}
                        onClick={() => irPlan(empresa)}
                      >
                        Plan
                      </button>

                      <button
                        type="button"
                        style={s.mobileUserButton}
                        onClick={() =>
                          irUsuarioPrincipal(empresa)
                        }
                      >
                        Usuario administrador
                      </button>

                      <button
                        type="button"
                        style={s.mobileSelectButton}
                        onClick={() =>
                          seleccionarEmpresa(empresa)
                        }
                      >
                        Seleccionar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div style={s.tableScroll}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Empresa</th>
                      <th style={s.th}>Teléfono</th>
                      <th style={s.th}>Negocio</th>
                      <th style={s.th}>Plan</th>
                      <th style={s.th}>Pago</th>
                      <th style={s.th}>Servicio</th>
                      <th style={s.th}>Facturación</th>
                      <th style={s.th}>Configuración</th>
                      <th style={s.th}>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {empresas.map((empresa) => (
                      <tr key={empresa.id}>
                        <td style={s.td}>
                          <strong style={s.tableCompanyName}>
                            {empresa.nombre}
                          </strong>

                          <span style={s.tableSmallText}>
                            {empresa.correo || "-"}
                          </span>
                        </td>

                        <td style={s.td}>
                          {empresa.telefono || "-"}
                        </td>

                        <td style={s.td}>
                          {empresa.categoria_negocio || "-"}

                          <span style={s.tableSmallText}>
                            {empresa.tipo_negocio || "-"}
                          </span>
                        </td>

                        <td style={s.td}>
                          {empresa.plan_nombre || "Sin plan"}
                        </td>

                        <td style={s.td}>
                          {empresa.estado_pago || "Pendiente"}
                        </td>

                        <td style={s.td}>
                          <span
                            style={{
                              ...s.statusBadge,
                              ...(empresaActiva(empresa)
                                ? s.statusActive
                                : s.statusInactive),
                            }}
                          >
                            {empresa.estado || "Activo"}
                          </span>
                        </td>

                        <td style={s.td}>
                          {formatoFecha(
                            empresa.fecha_proxima_facturacion
                          )}
                        </td>

                        <td style={s.td}>
                          {empresa.configuracion_completa
                            ? "Completa"
                            : "Pendiente"}
                        </td>

                        <td style={s.td}>
                          <div style={s.tableActions}>
                            <button
                              type="button"
                              style={s.adminButton}
                              onClick={() =>
                                irAdministrarEmpresa(empresa)
                              }
                            >
                              Administrar
                            </button>

                            <button
                              type="button"
                              style={s.planButton}
                              onClick={() => irPlan(empresa)}
                            >
                              Plan
                            </button>

                            <button
                              type="button"
                              style={s.userButton}
                              onClick={() =>
                                irUsuarioPrincipal(empresa)
                              }
                            >
                              Usuario
                            </button>

                            <button
                              type="button"
                              style={s.selectButton}
                              onClick={() =>
                                seleccionarEmpresa(empresa)
                              }
                            >
                              Seleccionar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p style={s.note}>
              Usa “Administrar” para configurar módulos, roles, usuarios y
              permisos de la empresa.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>
        {label}
      </label>

      {children}
    </div>
  );
}

function FlowStep({ numero, titulo, texto }) {
  return (
    <article style={s.flowCard}>
      <span style={s.flowNumber}>
        {numero}
      </span>

      <div>
        <strong style={s.flowTitle}>
          {titulo}
        </strong>

        <span style={s.flowText}>
          {texto}
        </span>
      </div>
    </article>
  );
}

function Detail({ label, value }) {
  return (
    <div style={s.detailBox}>
      <span style={s.detailLabel}>
        {label}
      </span>

      <strong style={s.detailValue}>
        {value}
      </strong>
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
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
        <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    arrowBack: (
      <>
        <path d="M19 12H5M12 19l-7-7 7-7" />
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
  };

  return (
    <svg {...props}>
      {icons[name] || icons.dashboard}
    </svg>
  );
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
    background: "linear-gradient(135deg,#173c2a,#0f6a3d)",
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
    marginBottom: 14,
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
    maxWidth: 720,
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

  flowGrid: {
    marginBottom: 14,
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
  },

  flowGridMobile: {
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  },

  flowCard: {
    minHeight: 78,
    padding: 13,
    display: "grid",
    gridTemplateColumns: "36px minmax(0,1fr)",
    alignItems: "center",
    gap: 9,
    border: "1px solid #dfe7e2",
    borderRadius: 15,
    background: "#ffffff",
    boxShadow: "0 8px 22px rgba(15,23,42,.045)",
  },

  flowNumber: {
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#173c2a",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 900,
  },

  flowTitle: {
    display: "block",
    color: "#17211c",
    fontSize: 10.5,
  },

  flowText: {
    display: "block",
    marginTop: 3,
    color: "#829087",
    fontSize: 8.5,
    lineHeight: 1.3,
  },

  formCard: {
    marginBottom: 15,
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 21,
    background: "#ffffff",
    boxShadow: "0 12px 34px rgba(15,23,42,.05)",
  },

  formCardMobile: {
    padding: 14,
    borderRadius: 18,
  },

  companiesCard: {
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 21,
    background: "#ffffff",
    boxShadow: "0 12px 34px rgba(15,23,42,.05)",
  },

  companiesCardMobile: {
    padding: 14,
    borderRadius: 18,
  },

  sectionHeader: {
    marginBottom: 17,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },

  sectionEyebrow: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  sectionTitle: {
    margin: 0,
    color: "#17211c",
    fontSize: 23,
    lineHeight: 1.15,
  },

  sectionTitleMobile: {
    fontSize: 21,
  },

  sectionText: {
    margin: "6px 0 0",
    color: "#758078",
    fontSize: 11,
    lineHeight: 1.45,
  },

  showCompaniesButton: {
    minHeight: 42,
    padding: "9px 13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #c8d5cd",
    borderRadius: 11,
    background: "linear-gradient(145deg,#ffffff,#f2f6f3)",
    color: "#26342c",
    fontSize: 10.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  refreshButton: {
    minHeight: 42,
    padding: "9px 13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #c8d5cd",
    borderRadius: 11,
    background: "#ffffff",
    color: "#26342c",
    fontSize: 10.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  fullWidthButton: {
    width: "100%",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 13,
  },

  formGridMobile: {
    gridTemplateColumns: "1fr",
    gap: 0,
  },

  field: {
    minWidth: 0,
  },

  label: {
    display: "block",
    marginBottom: 6,
    color: "#37433c",
    fontSize: 10,
    fontWeight: 850,
  },

  input: {
    width: "100%",
    minHeight: 44,
    padding: "10px 11px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    outline: "none",
    background: "#ffffff",
    color: "#17211c",
    fontSize: 11.5,
  },

  inputDisabled: {
    background: "#f2f4f3",
    color: "#8b958f",
  },

  formActions: {
    marginTop: 18,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  formActionsMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
  },

  createButton: {
    minHeight: 44,
    padding: "10px 16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "none",
    borderRadius: 11,
    background: "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 8px 19px rgba(22,131,79,.16)",
  },

  clearButton: {
    minHeight: 44,
    padding: "10px 16px",
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    background: "#ffffff",
    color: "#526057",
    fontSize: 11,
    fontWeight: 850,
    cursor: "pointer",
  },

  backButton: {
    minHeight: 44,
    padding: "10px 16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #16241c",
    borderRadius: 11,
    background: "linear-gradient(135deg,#17211c,#263a2e)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 850,
    textDecoration: "none",
  },

  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  tableScroll: {
    overflowX: "auto",
    border: "1px solid #e4ebe6",
    borderRadius: 14,
  },

  table: {
    width: "100%",
    minWidth: 1220,
    borderCollapse: "separate",
    borderSpacing: 0,
  },

  th: {
    padding: "11px 12px",
    borderBottom: "1px solid #dce5df",
    background: "#f5f8f6",
    color: "#536058",
    fontSize: 8,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  td: {
    padding: "13px 12px",
    borderBottom: "1px solid #edf1ee",
    background: "#ffffff",
    color: "#435047",
    fontSize: 10.5,
    verticalAlign: "top",
  },

  tableCompanyName: {
    display: "block",
    color: "#17211c",
    fontSize: 11.5,
  },

  tableSmallText: {
    display: "block",
    marginTop: 3,
    color: "#7d8981",
    fontSize: 8.5,
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 8,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  statusActive: {
    background: "#dcfce7",
    color: "#166534",
  },

  statusInactive: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  tableActions: {
    display: "flex",
    gap: 5,
    flexWrap: "wrap",
  },

  adminButton: {
    minHeight: 33,
    padding: "7px 9px",
    border: "none",
    borderRadius: 9,
    background: "#16834f",
    color: "#ffffff",
    fontSize: 8.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  planButton: {
    minHeight: 33,
    padding: "7px 9px",
    border: "none",
    borderRadius: 9,
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 8.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  userButton: {
    minHeight: 33,
    padding: "7px 9px",
    border: "1px solid #bddfca",
    borderRadius: 9,
    background: "#edf8f1",
    color: "#14683e",
    fontSize: 8.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  selectButton: {
    minHeight: 33,
    padding: "7px 9px",
    border: "1px solid #d1d7d3",
    borderRadius: 9,
    background: "#ffffff",
    color: "#536058",
    fontSize: 8.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  mobileCompanyGrid: {
    display: "grid",
    gap: 11,
  },

  mobileCompanyCard: {
    padding: 14,
    border: "1px solid #dfe7e2",
    borderRadius: 17,
    background: "linear-gradient(155deg,#ffffff,#f7faf8)",
    boxShadow: "0 10px 25px rgba(15,23,42,.05)",
  },

  mobileCompanyTop: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    alignItems: "start",
    gap: 9,
  },

  mobileIdentity: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "43px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
  },

  companyInitial: {
    width: 43,
    height: 43,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "linear-gradient(145deg,#e8f7ee,#d9efe2)",
    color: "#16834f",
    fontWeight: 950,
  },

  mobileCompanyName: {
    display: "block",
    overflow: "hidden",
    color: "#152019",
    fontSize: 13,
    lineHeight: 1.2,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mobileCompanyText: {
    display: "block",
    marginTop: 2,
    overflow: "hidden",
    color: "#88948d",
    fontSize: 8.5,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mobileDetailsGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 8,
  },

  detailBox: {
    minWidth: 0,
    padding: "9px 10px",
    border: "1px solid #e7ece9",
    borderRadius: 11,
    background: "#ffffff",
  },

  detailLabel: {
    display: "block",
    color: "#7d8981",
    fontSize: 7.5,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  detailValue: {
    display: "block",
    marginTop: 4,
    overflow: "hidden",
    color: "#27342d",
    fontSize: 10.5,
    lineHeight: 1.25,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mobileActions: {
    marginTop: 11,
    paddingTop: 11,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 7,
    borderTop: "1px solid #e7ece9",
  },

  mobileAdminButton: {
    minHeight: 40,
    border: "none",
    borderRadius: 10,
    background: "#16834f",
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  mobilePlanButton: {
    minHeight: 40,
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  mobileUserButton: {
    gridColumn: "1 / -1",
    minHeight: 41,
    border: "1px solid #bddfca",
    borderRadius: 10,
    background: "#edf8f1",
    color: "#14683e",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  mobileSelectButton: {
    gridColumn: "1 / -1",
    minHeight: 41,
    border: "1px solid #d1d7d3",
    borderRadius: 10,
    background: "#ffffff",
    color: "#536058",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  note: {
    margin: "12px 0 0",
    color: "#78857d",
    fontSize: 9.5,
    lineHeight: 1.45,
  },

  loadingBox: {
    minHeight: 120,
    display: "grid",
    placeItems: "center",
    color: "#78857d",
    fontSize: 11,
  },

  emptyBox: {
    minHeight: 120,
    display: "grid",
    placeItems: "center",
    color: "#78857d",
    fontSize: 11,
  },
};
