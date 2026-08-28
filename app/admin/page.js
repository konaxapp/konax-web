"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const VERSION = "2026.08.28-ADMIN-ARCHIVAR-RESTAURAR-FIX3";

const OPCIONES = [
  { nombre: "Crear Nueva Empresa", ruta: "/empresas", icono: "building" },
  { nombre: "Planes Comerciales", ruta: "/planes", icono: "briefcase" },
  { nombre: "Gestión de Módulos", ruta: "/modulos", icono: "modules" },
  { nombre: "Centro de Gestión", ruta: "/centro-gestion", icono: "chart" },
];

function fechaPanama() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = partes.find((p) => p.type === "year")?.value || "";
  const month = partes.find((p) => p.type === "month")?.value || "";
  const day = partes.find((p) => p.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

function sumarMes(fechaTexto) {
  const [year, month, day] = String(fechaTexto).split("-").map(Number);
  if (!year || !month || !day) return fechaTexto;

  const fecha = new Date(year, month - 1, day, 12, 0, 0);
  const diaOriginal = fecha.getDate();

  fecha.setDate(1);
  fecha.setMonth(fecha.getMonth() + 1);

  const ultimoDia = new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    0
  ).getDate();

  fecha.setDate(Math.min(diaOriginal, ultimoDia));

  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function Admin() {
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [vistaEmpresas, setVistaEmpresas] = useState("vigentes");
  const [busqueda, setBusqueda] = useState("");

  const [esMovil, setEsMovil] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [adminNombre, setAdminNombre] = useState("Centro KONAX");

  useEffect(() => {
    validarAdminYCargar();

    const actualizarVista = () => {
      const movil = window.innerWidth <= 980;
      setEsMovil(movil);
      if (!movil) setMenuMovilAbierto(false);
    };

    actualizarVista();
    window.addEventListener("resize", actualizarVista);

    return () => window.removeEventListener("resize", actualizarVista);
  }, []);

  async function validarAdminYCargar() {
    const adminId = localStorage.getItem("adminKonaxId");
    const nombreGuardado =
      localStorage.getItem("adminKonaxNombre") || "Centro KONAX";

    setAdminNombre(nombreGuardado);

    if (!adminId) {
      window.location.href = "/admin-login";
      return;
    }

    await cargarEmpresas();
  }

  async function cargarEmpresas() {
    setCargando(true);

    try {
      const [respuestaVista, respuestaArchivo] = await Promise.all([
        supabase
          .from("vista_control_pruebas")
          .select("*")
          .order("nombre", { ascending: true }),

        supabase
          .from("empresas")
          .select("id, archivada, fecha_archivada")
          .order("nombre", { ascending: true }),
      ]);

      if (respuestaVista.error) {
        throw new Error(
          "Error cargando control comercial: " +
            respuestaVista.error.message
        );
      }

      if (respuestaArchivo.error) {
        throw new Error(
          "Error cargando estado de archivo: " +
            respuestaArchivo.error.message
        );
      }

      const archivoPorId = new Map(
        (respuestaArchivo.data || []).map((item) => [
          String(item.id),
          item,
        ])
      );

      const lista = (respuestaVista.data || []).map((empresa) => {
        const archivo = archivoPorId.get(String(empresa.id));

        return {
          ...empresa,
          archivada: Boolean(archivo?.archivada),
          fecha_archivada: archivo?.fecha_archivada || null,
        };
      });

      setEmpresas(lista);
    } catch (error) {
      console.error(error);
      alert(error?.message || "No se pudieron cargar las empresas.");
      setEmpresas([]);
    } finally {
      setCargando(false);
    }
  }

  function cerrarSesion() {
    [
      "adminKonaxId",
      "adminKonaxNombre",
      "adminKonaxCorreo",
      "adminKonaxRol",
      "adminKonaxRole",
    ].forEach((clave) => localStorage.removeItem(clave));

    window.location.href = "/admin-login";
  }

  async function aprobarPiloto(empresa) {
    const confirmar = window.confirm(
      `¿Aprobar a ${empresa.nombre} para el programa piloto?\n\n` +
        "La empresa quedará pendiente de iniciar la prueba y todavía no consumirá días."
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

    await cargarEmpresas();
    setProcesandoId("");

    alert(`${empresa.nombre} fue aprobada para el piloto.`);
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
      `¿Iniciar ahora la prueba de ${empresa.nombre} por ${dias} días?`
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

    await cargarEmpresas();
    setProcesandoId("");

    alert(
      `La prueba de ${empresa.nombre} comenzó correctamente por ${dias} días.`
    );
  }

  async function activarPlan(empresa) {
    /*
      IMPORTANTE:
      La fecha del plan NO se toma del día en que el administrador
      pulsa este botón.

      Debe ser la fecha real del pago / inicio comercial del plan.
      Ejemplo:
        pago: 2026-08-26
        próximo vencimiento mensual: 2026-09-26
    */

    const fechaPagoPlan = window.prompt(
      `Fecha real del pago / inicio del plan de ${empresa.nombre}\n\n` +
        "Escriba la fecha en formato AAAA-MM-DD.\n" +
        "Ejemplo: 2026-08-26",
      ""
    );

    if (fechaPagoPlan === null) return;

    const fechaInicio = fechaPagoPlan.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
      alert(
        "Ingrese la fecha real del pago con formato AAAA-MM-DD.\n\nEjemplo: 2026-08-26"
      );
      return;
    }

    const vencimientoSugerido = sumarMes(fechaInicio);

    const fechaVencimientoTexto = window.prompt(
      `Próximo vencimiento del plan de ${empresa.nombre}\n\n` +
        `KONAX calculó un mes desde ${formatoFecha(fechaInicio)}.\n` +
        "Puede corregirlo si el plan tiene otra duración.",
      vencimientoSugerido
    );

    if (fechaVencimientoTexto === null) return;

    const fechaVencimiento = fechaVencimientoTexto.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaVencimiento)) {
      alert("Ingrese el vencimiento con formato AAAA-MM-DD.");
      return;
    }

    if (fechaVencimiento <= fechaInicio) {
      alert("El vencimiento debe ser posterior a la fecha del pago.");
      return;
    }

    const confirmar = window.confirm(
      `CONFIRMAR PLAN ACTIVO\n\n` +
        `${empresa.nombre}\n\n` +
        `Fecha del pago / inicio: ${formatoFecha(fechaInicio)}\n` +
        `Próximo vencimiento: ${formatoFecha(fechaVencimiento)}\n\n` +
        "La empresa dejará de estar en período de prueba y pasará a ACTIVO.\n" +
        "Los días restantes de prueba dejarán de aplicar."
    );

    if (!confirmar) return;

    const adminId = localStorage.getItem("adminKonaxId") || null;

    setProcesandoId(empresa.id);

    const { data, error } = await supabase.rpc(
      "activar_plan_empresa_desde_prueba",
      {
        p_empresa_id: empresa.id,
        p_fecha_inicio: fechaInicio,
        p_fecha_vencimiento: fechaVencimiento,
        p_usuario_konax: adminId,
      }
    );

    if (error) {
      setProcesandoId("");

      alert(
        "No se pudo activar el plan.\n\n" +
          error.message +
          "\n\nVerifique que la función activar_plan_empresa_desde_prueba exista en Supabase."
      );

      return;
    }

    if (data && data.ok === false) {
      setProcesandoId("");
      alert(data.mensaje || "Supabase no confirmó la activación.");
      return;
    }

    await cargarEmpresas();
    setProcesandoId("");

    alert(
      `${empresa.nombre} quedó ACTIVA.\n\n` +
        `Inicio del plan: ${formatoFecha(fechaInicio)}\n` +
        `Próximo vencimiento: ${formatoFecha(fechaVencimiento)}\n\n` +
        "Los días de prueba ya no aplican."
    );
  }

  async function cambiarArchivoEmpresa(empresa, archivar) {
    if (!empresa?.id || procesandoId) return;

    const confirmar = window.confirm(
      archivar
        ? `¿Archivar ${empresa.nombre}?\n\nLa empresa dejará de aparecer en la vista principal, pero NO se eliminarán sus datos. Podrás restaurarla después.`
        : `¿Restaurar ${empresa.nombre}?\n\nLa empresa volverá a aparecer en la vista principal.`
    );

    if (!confirmar) return;

    const adminId = localStorage.getItem("adminKonaxId") || null;

    setProcesandoId(empresa.id);

    const { data, error } = await supabase.rpc(
      "cambiar_archivo_empresa",
      {
        p_empresa_id: empresa.id,
        p_archivar: archivar,
        p_usuario_konax: adminId,
      }
    );

    if (error) {
      setProcesandoId("");
      alert(
        `${archivar ? "No se pudo archivar" : "No se pudo restaurar"} la empresa.\n\n${error.message}`
      );
      return;
    }

    if (data && data.ok === false) {
      setProcesandoId("");
      alert(data.mensaje || "Supabase no confirmó la operación.");
      return;
    }

    await cargarEmpresas();
    setProcesandoId("");

    alert(
      archivar
        ? `${empresa.nombre} fue archivada. Sus datos siguen guardados.`
        : `${empresa.nombre} fue restaurada correctamente.`
    );
  }

  function configurarUsuariosModulos(empresa) {
    localStorage.setItem("empresaAdminCreadaId", empresa.id);
    localStorage.setItem(
      "empresaAdminCreadaNombre",
      empresa.nombre || ""
    );

    window.location.href = "/usuarios";
  }

  function formatoFecha(fecha) {
    if (!fecha) return "—";

    const texto = String(fecha).slice(0, 10);
    const [year, month, day] = texto.split("-");

    if (!year || !month || !day) return String(fecha);

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
      activo: {
        background: "#ECFDF5",
        color: "#047857",
        borderColor: "#A7F3D0",
      },
      pendiente_inicio_prueba: {
        background: "#FFFBEB",
        color: "#B45309",
        borderColor: "#FDE68A",
      },
      prueba: {
        background: "#EFF6FF",
        color: "#1D4ED8",
        borderColor: "#BFDBFE",
      },
      prueba_vencida: {
        background: "#FEF2F2",
        color: "#B91C1C",
        borderColor: "#FECACA",
      },
      pendiente_activacion: {
        background: "#F5F3FF",
        color: "#6D28D9",
        borderColor: "#DDD6FE",
      },
      gracia: {
        background: "#FFF7ED",
        color: "#C2410C",
        borderColor: "#FED7AA",
      },
      suspendido: {
        background: "#F3F4F6",
        color: "#374151",
        borderColor: "#D1D5DB",
      },
      cancelado: {
        background: "#F3F4F6",
        color: "#6B7280",
        borderColor: "#D1D5DB",
      },
    };

    return (
      mapa[estado] || {
        background: "#F3F4F6",
        color: "#374151",
        borderColor: "#D1D5DB",
      }
    );
  }

  function obtenerInicioVisible(empresa) {
    if (empresa.estado_suscripcion === "activo") {
      return (
        empresa.fecha_inicio_plan ||
        empresa.fecha_inicio_suscripcion ||
        null
      );
    }

    return empresa.fecha_inicio_prueba;
  }

  function obtenerVencimientoVisible(empresa) {
    if (empresa.estado_suscripcion === "activo") {
      return (
        empresa.fecha_vencimiento_plan ||
        empresa.fecha_fin_plan ||
        empresa.fecha_vencimiento_suscripcion ||
        null
      );
    }

    return empresa.fecha_fin_prueba;
  }

  function renderAccion(empresa, movil = false) {
    const procesando = procesandoId === empresa.id;
    const estado = empresa.estado_suscripcion;

    if (estado === "activo") {
      return (
        <span
          style={{
            ...styles.estadoActivoFinal,
            ...(movil ? styles.estadoActivoFinalMobile : {}),
          }}
        >
          <Icon name="check" size={15} />
          Cliente activo
        </span>
      );
    }

    if (estado === "pendiente_inicio_prueba") {
      return (
        <button
          type="button"
          onClick={() => iniciarPrueba(empresa)}
          disabled={procesando}
          style={{
            ...styles.botonIniciar,
            ...(movil ? styles.botonAccionMobile : {}),
            ...(procesando ? styles.botonDeshabilitado : {}),
          }}
        >
          <Icon name="play" size={15} />
          {procesando ? "Procesando..." : "Iniciar prueba"}
        </button>
      );
    }

    if (
      ["prueba", "prueba_vencida", "pendiente_activacion"].includes(
        estado
      )
    ) {
      return (
        <button
          type="button"
          onClick={() => activarPlan(empresa)}
          disabled={procesando}
          style={{
            ...styles.botonActivarPlan,
            ...(movil ? styles.botonAccionMobile : {}),
            ...(procesando ? styles.botonDeshabilitado : {}),
          }}
        >
          <Icon name="spark" size={15} />
          {procesando ? "Activando..." : "Activar plan"}
        </button>
      );
    }

    return (
      <span style={styles.sinAccion}>Sin acción disponible</span>
    );
  }

  const empresasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return empresas.filter((empresa) => {
      const estaArchivada = Boolean(empresa.archivada);

      const coincideVista =
        vistaEmpresas === "todas"
          ? true
          : vistaEmpresas === "archivadas"
          ? estaArchivada
          : !estaArchivada;

      const coincideEstado =
        filtroEstado === "Todos" ||
        empresa.estado_suscripcion === filtroEstado;

      const coincideBusqueda =
        !termino ||
        String(empresa.nombre || "")
          .toLowerCase()
          .includes(termino);

      return coincideVista && coincideEstado && coincideBusqueda;
    });
  }, [empresas, filtroEstado, busqueda, vistaEmpresas]);


  const empresasVigentes = empresas.filter(
    (item) => !item.archivada
  );

  const totalEmpresas = empresasVigentes.length;

  const pendientes = empresasVigentes.filter(
    (item) =>
      item.estado_suscripcion === "pendiente_inicio_prueba"
  ).length;

  const pruebasActivas = empresasVigentes.filter(
    (item) => item.estado_suscripcion === "prueba"
  ).length;

  const clientesActivos = empresasVigentes.filter(
    (item) => item.estado_suscripcion === "activo"
  ).length;

  const totalArchivadas = empresas.filter(
    (item) => item.archivada
  ).length;

  return (
    <div
      style={{
        ...styles.layout,
        ...(esMovil ? styles.layoutMobile : {}),
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
          ...(esMovil ? styles.contenidoMobile : {}),
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
                  setMenuMovilAbierto((actual) => !actual)
                }
                style={styles.mobileMenuButton}
              >
                <Icon
                  name={menuMovilAbierto ? "close" : "menu"}
                  size={20}
                />
                {menuMovilAbierto ? "Cerrar" : "Menú"}
              </button>
            </div>

            {menuMovilAbierto && (
              <div style={styles.mobileMenu}>
                <div style={styles.mobileMenuAdmin}>
                  <div style={styles.avatarAdminMobile}>
                    {String(adminNombre || "K")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <strong style={styles.mobileAdminNombre}>
                      {adminNombre}
                    </strong>
                    <span style={styles.mobileAdminRol}>
                      Panel maestro
                    </span>
                  </div>
                </div>

                {OPCIONES.map((item) => (
                  <Link
                    key={item.nombre}
                    href={item.ruta}
                    onClick={() => setMenuMovilAbierto(false)}
                    style={styles.mobileMenuItem}
                  >
                    <span style={styles.mobileMenuIcono}>
                      <Icon name={item.icono} size={18} />
                    </span>
                    <span>{item.nombre}</span>
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={cerrarSesion}
                  style={styles.mobileLogout}
                >
                  <Icon name="logout" size={18} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </>
        )}

        <section
          style={{
            ...styles.hero,
            ...(esMovil ? styles.heroMobile : {}),
          }}
        >
          <div style={styles.heroGlow} />

          <div style={styles.heroTexto}>
            <span style={styles.etiqueta}>
              OPERACIÓN COMERCIAL · KONAX
            </span>

            <h1
              style={{
                ...styles.titulo,
                ...(esMovil ? styles.tituloMobile : {}),
              }}
            >
              Centro Administrativo
            </h1>

            <p
              style={{
                ...styles.subtitulo,
                ...(esMovil ? styles.subtituloMobile : {}),
              }}
            >
              Controla pilotos, pruebas y clientes activos sin perder
              de vista el vencimiento comercial de cada empresa.
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
            ...(esMovil ? styles.resumenGridMobile : {}),
          }}
        >
          <ResumenCard
            titulo="Empresas"
            valor={totalEmpresas}
            texto="Registros visibles"
            icono="building"
            tono="navy"
            movil={esMovil}
          />

          <ResumenCard
            titulo="Pendientes"
            valor={pendientes}
            texto="Sin iniciar prueba"
            icono="clock"
            tono="gold"
            movil={esMovil}
          />

          <ResumenCard
            titulo="En prueba"
            valor={pruebasActivas}
            texto="Pilotos en curso"
            icono="play"
            tono="blue"
            movil={esMovil}
          />

          <ResumenCard
            titulo="Clientes activos"
            valor={clientesActivos}
            texto="Planes ya activados"
            icono="check"
            tono="green"
            movil={esMovil}
          />
        </section>

        <section
          style={{
            ...styles.controlCard,
            ...(esMovil ? styles.controlCardMobile : {}),
          }}
        >
          <div
            style={{
              ...styles.controlHeader,
              ...(esMovil ? styles.controlHeaderMobile : {}),
            }}
          >
            <div>
              <span style={styles.seccionEtiqueta}>
                CONTROL COMERCIAL
              </span>

              <h2
                style={{
                  ...styles.seccionTitulo,
                  ...(esMovil ? styles.seccionTituloMobile : {}),
                }}
              >
                Empresas y suscripciones
              </h2>

              <p style={styles.seccionTexto}>
                Convierte una prueba en plan activo usando la fecha real del pago.
                La aceptación del piloto queda solo como historial.
              </p>
            </div>

            <div
              style={{
                ...styles.headerAcciones,
                ...(esMovil ? styles.headerAccionesMobile : {}),
              }}
            >
              <div
                style={{
                  ...styles.segmentosVista,
                  ...(esMovil ? styles.segmentosVistaMobile : {}),
                }}
              >
                <button
                  type="button"
                  onClick={() => setVistaEmpresas("vigentes")}
                  style={{
                    ...styles.segmentoVista,
                    ...(vistaEmpresas === "vigentes"
                      ? styles.segmentoVistaActivo
                      : {}),
                  }}
                >
                  Vigentes
                </button>

                <button
                  type="button"
                  onClick={() => setVistaEmpresas("archivadas")}
                  style={{
                    ...styles.segmentoVista,
                    ...(vistaEmpresas === "archivadas"
                      ? styles.segmentoVistaActivo
                      : {}),
                  }}
                >
                  Archivadas ({totalArchivadas})
                </button>

                <button
                  type="button"
                  onClick={() => setVistaEmpresas("todas")}
                  style={{
                    ...styles.segmentoVista,
                    ...(vistaEmpresas === "todas"
                      ? styles.segmentoVistaActivo
                      : {}),
                  }}
                >
                  Todas
                </button>
              </div>

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar empresa"
                style={{
                  ...styles.inputBuscar,
                  ...(esMovil ? styles.inputBuscarMobile : {}),
                }}
              />

              <select
                value={filtroEstado}
                onChange={(event) =>
                  setFiltroEstado(event.target.value)
                }
                style={{
                  ...styles.selectFiltro,
                  ...(esMovil ? styles.selectFiltroMobile : {}),
                }}
              >
                <option value="Todos">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="pendiente_inicio_prueba">
                  Pendiente de inicio
                </option>
                <option value="prueba">Prueba activa</option>
                <option value="prueba_vencida">
                  Prueba vencida
                </option>
                <option value="pendiente_activacion">
                  Pendiente de activación
                </option>
                <option value="suspendido">Suspendido</option>
              </select>

              <button
                type="button"
                onClick={cargarEmpresas}
                disabled={cargando}
                style={{
                  ...styles.botonActualizar,
                  ...(cargando ? styles.botonDeshabilitado : {}),
                }}
              >
                <Icon name="refresh" size={16} />
                {cargando ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>

          {cargando ? (
            <EstadoCarga />
          ) : empresasFiltradas.length === 0 ? (
            <div style={styles.estadoVacio}>
              <div style={styles.estadoVacioIcono}>
                <Icon name="search" size={23} />
              </div>
              <strong style={styles.estadoVacioTitulo}>
                No hay resultados
              </strong>
              <span style={styles.estadoVacioTexto}>
                Ajusta la búsqueda o el estado seleccionado.
              </span>
            </div>
          ) : esMovil ? (
            <div style={styles.empresasMobileGrid}>
              {empresasFiltradas.map((empresa) => {
                const estiloEstado = colorEstado(
                  empresa.estado_suscripcion
                );

                return (
                  <article
                    key={empresa.id}
                    style={styles.empresaMobileCard}
                  >
                    <div style={styles.empresaMobileTop}>
                      <div style={styles.empresaMobileIdentidad}>
                        <div style={styles.empresaInicialMobile}>
                          {String(empresa.nombre || "E")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <strong style={styles.nombreEmpresaMobile}>
                            {empresa.nombre}
                          </strong>
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

                    <div style={styles.detallesMobileGrid}>
                      <DetalleMobile
                        etiqueta="Aceptación piloto"
                        valor={formatoFecha(
                          empresa.fecha_aceptacion_piloto
                        )}
                      />

                      <DetalleMobile
                        etiqueta={
                          empresa.estado_suscripcion === "activo"
                            ? "Inicio plan"
                            : "Inicio prueba"
                        }
                        valor={formatoFecha(
                          obtenerInicioVisible(empresa)
                        )}
                      />

                      <DetalleMobile
                        etiqueta={
                          empresa.estado_suscripcion === "activo"
                            ? "Vence plan"
                            : "Vence prueba"
                        }
                        valor={formatoFecha(
                          obtenerVencimientoVisible(empresa)
                        )}
                      />

                      <DetalleMobile
                        etiqueta="Días prueba"
                        valor={
                          empresa.estado_suscripcion === "prueba"
                            ? empresa.dias_restantes ?? 0
                            : "—"
                        }
                        destacado={
                          empresa.estado_suscripcion === "prueba"
                        }
                      />
                    </div>

                    <div style={styles.accionMobileBox}>
                      {renderAccion(empresa, true)}

                      <button
                        type="button"
                        onClick={() =>
                          configurarUsuariosModulos(empresa)
                        }
                        style={styles.botonConfigurarMobile}
                      >
                        <Icon name="users" size={16} />
                        Usuarios y módulos
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          cambiarArchivoEmpresa(
                            empresa,
                            !empresa.archivada
                          )
                        }
                        disabled={procesandoId === empresa.id}
                        style={{
                          ...(empresa.archivada
                            ? styles.botonRestaurarMobile
                            : styles.botonArchivarMobile),
                          ...(procesandoId === empresa.id
                            ? styles.botonDeshabilitado
                            : {}),
                        }}
                      >
                        <Icon
                          name={empresa.archivada ? "restore" : "archive"}
                          size={16}
                        />
                        {procesandoId === empresa.id
                          ? "Procesando..."
                          : empresa.archivada
                          ? "Restaurar empresa"
                          : "Archivar empresa"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div style={styles.tablaContenedor}>
              <table style={styles.tabla}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: "25%" }}>
                      Empresa
                    </th>
                    <th style={{ ...styles.th, width: "13%" }}>
                      Estado
                    </th>
                    <th style={{ ...styles.th, width: "12%" }}>
                      Aceptación piloto
                    </th>
                    <th style={{ ...styles.th, width: "12%" }}>
                      Inicio comercial
                    </th>
                    <th style={{ ...styles.th, width: "12%" }}>
                      Próx. vencimiento
                    </th>
                    <th style={{ ...styles.th, width: "9%" }}>
                      Días
                    </th>
                    <th
                      style={{
                        ...styles.th,
                        ...styles.thAccion,
                        width: "17%",
                      }}
                    >
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {empresasFiltradas.map((empresa) => {
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

                            <div style={{ minWidth: 0 }}>
                              <strong style={styles.nombreEmpresaTabla}>
                                {empresa.nombre}
                              </strong>
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
                            obtenerInicioVisible(empresa)
                          )}
                        </td>

                        <td style={styles.td}>
                          {formatoFecha(
                            obtenerVencimientoVisible(empresa)
                          )}
                        </td>

                        <td style={styles.td}>
                          <strong
                            style={
                              empresa.estado_suscripcion === "prueba"
                                ? styles.diasPrueba
                                : styles.diasNoAplica
                            }
                          >
                            {empresa.estado_suscripcion === "prueba"
                              ? empresa.dias_restantes ?? 0
                              : "—"}
                          </strong>
                        </td>

                        <td
                          style={{
                            ...styles.td,
                            ...styles.tdAccion,
                          }}
                        >
                          <div style={styles.accionesTabla}>
                            {renderAccion(empresa)}

                            <button
                              type="button"
                              onClick={() =>
                                configurarUsuariosModulos(empresa)
                              }
                              style={styles.botonConfigurar}
                              title="Administrar usuarios y módulos"
                            >
                              <Icon name="users" size={15} />
                              Gestionar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                cambiarArchivoEmpresa(
                                  empresa,
                                  !empresa.archivada
                                )
                              }
                              disabled={procesandoId === empresa.id}
                              style={{
                                ...(empresa.archivada
                                  ? styles.botonRestaurar
                                  : styles.botonArchivar),
                                ...(procesandoId === empresa.id
                                  ? styles.botonDeshabilitado
                                  : {}),
                              }}
                            >
                              <Icon
                                name={empresa.archivada ? "restore" : "archive"}
                                size={14}
                              />
                              {empresa.archivada ? "Restaurar" : "Archivar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div style={styles.version}>
          KONAX Admin · {VERSION}
        </div>
      </main>
    </div>
  );
}

function SidebarAdmin({ adminNombre, onLogout }) {
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
          <span style={styles.brandLabel}>CONTROL INTERNO</span>
          <h2 style={styles.brandTitle}>KONAX</h2>
          <p style={styles.brandSub}>Administración</p>
        </div>
      </div>

      <div style={styles.empresaBox}>
        <div style={styles.avatarAdmin}>
          {String(adminNombre || "K").charAt(0).toUpperCase()}
        </div>

        <div style={{ minWidth: 0 }}>
          <strong style={styles.empresaNombre}>{adminNombre}</strong>
          <span style={styles.empresaRol}>SuperAdmin</span>
        </div>
      </div>

      <span style={styles.menuTitulo}>NAVEGACIÓN</span>

      <nav style={styles.menu}>
        {OPCIONES.map((item) => (
          <Link key={item.nombre} href={item.ruta} style={styles.menuItem}>
            <span style={styles.menuIcono}>
              <Icon name={item.icono} size={18} />
            </span>
            <span>{item.nombre}</span>
            <Icon name="chevron" size={14} />
          </Link>
        ))}
      </nav>

      <div style={styles.sidebarAyuda}>
        <span style={styles.sidebarAyudaEtiqueta}>PANEL MAESTRO</span>
        <strong style={styles.sidebarAyudaTitulo}>
          Operación comercial
        </strong>
        <p style={styles.sidebarAyudaTexto}>
          Pilotos, activaciones y administración empresarial desde un
          solo lugar.
        </p>
      </div>

      <button type="button" onClick={onLogout} style={styles.botonSalir}>
        <Icon name="logout" size={17} />
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
  movil,
}) {
  const tonos = {
    navy: {
      iconBackground: "#EEF2FF",
      iconColor: "#3730A3",
      line: "#3730A3",
    },
    gold: {
      iconBackground: "#FFFBEB",
      iconColor: "#B45309",
      line: "#D97706",
    },
    blue: {
      iconBackground: "#EFF6FF",
      iconColor: "#1D4ED8",
      line: "#2563EB",
    },
    green: {
      iconBackground: "#ECFDF5",
      iconColor: "#047857",
      line: "#059669",
    },
  };

  const color = tonos[tono] || tonos.navy;

  return (
    <article
      style={{
        ...styles.resumenCard,
        ...(movil ? styles.resumenCardMobile : {}),
      }}
    >
      <div style={{ ...styles.resumenLinea, background: color.line }} />

      <div style={styles.resumenTop}>
        <span
          style={{
            ...styles.resumenIcono,
            background: color.iconBackground,
            color: color.iconColor,
          }}
        >
          <Icon name={icono} size={18} />
        </span>

        <span style={styles.resumenLabel}>{titulo}</span>
      </div>

      <strong
        style={{
          ...styles.resumenValor,
          ...(movil ? styles.resumenValorMobile : {}),
        }}
      >
        {valor}
      </strong>

      <span style={styles.resumenTexto}>{texto}</span>
    </article>
  );
}

function DetalleMobile({ etiqueta, valor, destacado = false }) {
  return (
    <div style={styles.detalleMobile}>
      <span style={styles.detalleMobileEtiqueta}>{etiqueta}</span>
      <strong
        style={{
          ...styles.detalleMobileValor,
          ...(destacado ? styles.detalleMobileDestacado : {}),
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
      <strong style={styles.estadoCargaTitulo}>Cargando empresas</strong>
      <span style={styles.estadoCargaTexto}>
        Consultando estados comerciales.
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
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    chevron: <path d="M9 18l6-6-6-6" />,
    check: <path d="M5 12l4 4L19 6" />,
    spark: (
      <>
        <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
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
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </>
    ),
    archive: (
      <>
        <path d="M4 7h16M5 7l1 13h12l1-13" />
        <path d="M9 11h6M8 4h8l1 3H7l1-3z" />
      </>
    ),
    restore: (
      <>
        <path d="M4 7h16M5 7l1 13h12l1-13" />
        <path d="M9 11h6" />
        <path d="M12 17v-4M10 15l2-2 2 2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M17 11a4 4 0 0 1 4 4v2" />
        <path d="M17 3.5a4 4 0 0 1 0 7" />
      </>
    ),
  };

  return <svg {...props}>{icons[name] || icons.modules}</svg>;
}

const styles = {
  layout: {
    minHeight: "100vh",
    display: "flex",
    background: "#F4F6F8",
    color: "#111827",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  layoutMobile: {
    display: "block",
    width: "100%",
    overflowX: "hidden",
  },

  sidebar: {
    width: 256,
    minWidth: 256,
    height: "100vh",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    padding: "20px 14px",
    boxSizing: "border-box",
    overflowY: "auto",
    background:
      "linear-gradient(180deg,#101828 0%,#152238 52%,#0E3B2D 100%)",
    color: "#FFFFFF",
    boxShadow: "12px 0 36px rgba(15,23,42,.12)",
  },

  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "0 4px 18px",
    borderBottom: "1px solid rgba(255,255,255,.09)",
  },

  logoBox: {
    width: 96,
    height: 50,
    padding: 5,
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    borderRadius: 12,
    background: "#FFFFFF",
  },

  logoSidebar: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  brandLabel: {
    color: "#A7F3D0",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: 1,
  },

  brandTitle: {
    margin: "2px 0 0",
    fontSize: 19,
    lineHeight: 1,
  },

  brandSub: {
    margin: "4px 0 0",
    color: "#CBD5E1",
    fontSize: 9.5,
  },

  empresaBox: {
    margin: "16px 0 20px",
    padding: 12,
    display: "grid",
    gridTemplateColumns: "40px minmax(0,1fr)",
    gap: 10,
    alignItems: "center",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 14,
    background: "rgba(255,255,255,.055)",
  },

  avatarAdmin: {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#D1FAE5",
    color: "#065F46",
    fontWeight: 950,
  },

  empresaNombre: {
    display: "block",
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 11.5,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  empresaRol: {
    display: "block",
    marginTop: 3,
    color: "#94A3B8",
    fontSize: 9.5,
  },

  menuTitulo: {
    display: "block",
    margin: "0 7px 8px",
    color: "#94A3B8",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  menu: {
    display: "grid",
    gap: 6,
  },

  menuItem: {
    minHeight: 45,
    display: "grid",
    gridTemplateColumns: "30px minmax(0,1fr) 16px",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,.025)",
    borderRadius: 12,
    background: "rgba(255,255,255,.018)",
    color: "#E2E8F0",
    fontSize: 11.5,
    fontWeight: 740,
    textDecoration: "none",
  },

  menuIcono: {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "rgba(16,185,129,.10)",
    color: "#A7F3D0",
  },

  sidebarAyuda: {
    marginTop: "auto",
    marginBottom: 12,
    padding: 13,
    border: "1px solid rgba(167,243,208,.12)",
    borderRadius: 14,
    background: "rgba(255,255,255,.035)",
  },

  sidebarAyudaEtiqueta: {
    color: "#A7F3D0",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: 1,
  },

  sidebarAyudaTitulo: {
    display: "block",
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 12.5,
  },

  sidebarAyudaTexto: {
    margin: "5px 0 0",
    color: "#AEBBC8",
    fontSize: 9.5,
    lineHeight: 1.45,
  },

  botonSalir: {
    width: "100%",
    minHeight: 43,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid rgba(255,255,255,.11)",
    borderRadius: 11,
    background: "rgba(255,255,255,.055)",
    color: "#FFFFFF",
    fontWeight: 820,
    cursor: "pointer",
  },

  contenido: {
    flex: 1,
    minWidth: 0,
    padding: "24px 24px 34px",
    boxSizing: "border-box",
  },

  contenidoMobile: {
    width: "100%",
    maxWidth: "100%",
    padding: "12px 10px 26px",
    overflowX: "hidden",
  },

  mobileBar: {
    position: "sticky",
    top: 0,
    zIndex: 70,
    margin: "-12px -10px 12px",
    padding: "9px 12px",
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid #E5E7EB",
    background: "rgba(255,255,255,.97)",
    backdropFilter: "blur(12px)",
  },

  mobileLogo: {
    width: 132,
    maxWidth: "48vw",
    height: "auto",
  },

  mobileMenuButton: {
    minWidth: 94,
    minHeight: 40,
    padding: "8px 13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: 0,
    borderRadius: 12,
    background: "#101828",
    color: "#FFFFFF",
    fontWeight: 820,
    cursor: "pointer",
  },

  mobileMenu: {
    position: "fixed",
    top: 62,
    left: 9,
    right: 9,
    zIndex: 80,
    maxHeight: "calc(100vh - 74px)",
    padding: 10,
    display: "grid",
    gap: 7,
    overflowY: "auto",
    border: "1px solid #E5E7EB",
    borderRadius: 17,
    background: "#FFFFFF",
    boxShadow: "0 24px 60px rgba(15,23,42,.20)",
  },

  mobileMenuAdmin: {
    padding: "9px 8px 12px",
    display: "grid",
    gridTemplateColumns: "40px minmax(0,1fr)",
    alignItems: "center",
    gap: 9,
    borderBottom: "1px solid #EEF2F7",
  },

  avatarAdminMobile: {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#101828",
    color: "#FFFFFF",
    fontWeight: 900,
  },

  mobileAdminNombre: {
    display: "block",
    overflow: "hidden",
    fontSize: 12.5,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mobileAdminRol: {
    display: "block",
    marginTop: 2,
    color: "#7C8795",
    fontSize: 9.5,
  },

  mobileMenuItem: {
    minHeight: 45,
    padding: "8px 10px",
    display: "grid",
    gridTemplateColumns: "32px minmax(0,1fr)",
    alignItems: "center",
    gap: 9,
    border: "1px solid #EEF2F7",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#1F2937",
    fontSize: 11.5,
    fontWeight: 780,
    textDecoration: "none",
  },

  mobileMenuIcono: {
    width: 32,
    height: 32,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "#ECFDF5",
    color: "#047857",
  },

  mobileLogout: {
    minHeight: 44,
    border: "1px solid #FECACA",
    borderRadius: 11,
    background: "#FFF7F7",
    color: "#B42318",
    fontWeight: 820,
    cursor: "pointer",
  },

  hero: {
    maxWidth: 1460,
    minHeight: 166,
    margin: "0 auto 16px",
    padding: "24px 27px",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    border: "1px solid rgba(255,255,255,.06)",
    borderRadius: 22,
    background:
      "linear-gradient(125deg,#101828 0%,#172554 48%,#064E3B 100%)",
    boxShadow: "0 20px 48px rgba(15,23,42,.14)",
  },

  heroMobile: {
    minHeight: 0,
    marginBottom: 12,
    padding: "19px 16px 20px",
    borderRadius: 18,
  },

  heroGlow: {
    position: "absolute",
    width: 260,
    height: 260,
    right: -90,
    top: -125,
    borderRadius: "50%",
    background: "rgba(255,255,255,.07)",
  },

  heroTexto: {
    position: "relative",
    zIndex: 2,
    flex: 1,
  },

  etiqueta: {
    display: "block",
    marginBottom: 7,
    color: "#A7F3D0",
    fontSize: 8.5,
    fontWeight: 900,
    letterSpacing: 1.35,
  },

  titulo: {
    maxWidth: 760,
    margin: "0 0 9px",
    color: "#FFFFFF",
    fontSize: "clamp(32px,3.6vw,46px)",
    lineHeight: 1.03,
    letterSpacing: -0.9,
  },

  tituloMobile: {
    fontSize: 28,
  },

  subtitulo: {
    maxWidth: 690,
    margin: 0,
    color: "#D7E0EA",
    fontSize: 13,
    lineHeight: 1.52,
  },

  subtituloMobile: {
    fontSize: 12,
  },

  heroLogoBox: {
    width: 205,
    minWidth: 205,
    height: 82,
    padding: 9,
    position: "relative",
    zIndex: 2,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#FFFFFF",
  },

  heroLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  resumenGrid: {
    maxWidth: 1460,
    margin: "0 auto 16px",
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 11,
  },

  resumenGridMobile: {
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 9,
    marginBottom: 12,
  },

  resumenCard: {
    minHeight: 114,
    padding: "15px 15px 13px",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    background: "#FFFFFF",
    boxShadow: "0 9px 24px rgba(15,23,42,.045)",
  },

  resumenCardMobile: {
    minHeight: 108,
    padding: "13px 12px",
  },

  resumenLinea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  resumenTop: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  resumenIcono: {
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
  },

  resumenLabel: {
    color: "#667085",
    fontSize: 9.5,
    fontWeight: 820,
  },

  resumenValor: {
    marginTop: 9,
    color: "#101828",
    fontSize: 29,
    lineHeight: 1,
  },

  resumenValorMobile: {
    fontSize: 25,
  },

  resumenTexto: {
    marginTop: "auto",
    paddingTop: 6,
    color: "#98A2B3",
    fontSize: 9,
  },

  controlCard: {
    maxWidth: 1460,
    margin: "0 auto",
    padding: 18,
    border: "1px solid #E4E7EC",
    borderRadius: 19,
    background: "#FFFFFF",
    boxShadow: "0 12px 32px rgba(15,23,42,.045)",
  },

  controlCardMobile: {
    padding: 12,
    borderRadius: 16,
  },

  controlHeader: {
    marginBottom: 15,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
  },

  controlHeaderMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    alignItems: "stretch",
    gap: 11,
  },

  seccionEtiqueta: {
    display: "block",
    marginBottom: 4,
    color: "#047857",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: 1.15,
  },

  seccionTitulo: {
    margin: "0 0 4px",
    fontSize: 22,
    color: "#101828",
  },

  seccionTituloMobile: {
    fontSize: 20,
  },

  seccionTexto: {
    maxWidth: 610,
    margin: 0,
    color: "#667085",
    fontSize: 10.8,
    lineHeight: 1.45,
  },

  headerAcciones: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  headerAccionesMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
  },

  segmentosVista: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: 3,
    border: "1px solid #E4E7EC",
    borderRadius: 11,
    background: "#F8FAFC",
  },

  segmentosVistaMobile: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
  },

  segmentoVista: {
    minHeight: 32,
    padding: "6px 9px",
    border: 0,
    borderRadius: 8,
    background: "transparent",
    color: "#667085",
    fontSize: 9,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  segmentoVistaActivo: {
    background: "#FFFFFF",
    color: "#101828",
    boxShadow: "0 2px 6px rgba(15,23,42,.08)",
  },

  inputBuscar: {
    minHeight: 40,
    minWidth: 190,
    padding: "8px 11px",
    boxSizing: "border-box",
    border: "1px solid #D0D5DD",
    borderRadius: 10,
    outline: "none",
    background: "#FFFFFF",
    color: "#101828",
    fontSize: 10.8,
  },

  inputBuscarMobile: {
    width: "100%",
    minWidth: 0,
  },

  selectFiltro: {
    minHeight: 40,
    padding: "8px 32px 8px 11px",
    border: "1px solid #D0D5DD",
    borderRadius: 10,
    outline: "none",
    background: "#FFFFFF",
    color: "#101828",
    fontSize: 10.8,
    fontWeight: 720,
  },

  selectFiltroMobile: {
    width: "100%",
  },

  botonActualizar: {
    minHeight: 40,
    padding: "8px 13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #D0D5DD",
    borderRadius: 10,
    background: "#F9FAFB",
    color: "#344054",
    fontSize: 10.8,
    fontWeight: 820,
    cursor: "pointer",
  },

  botonDeshabilitado: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  tablaContenedor: {
    width: "100%",
    overflow: "hidden",
    border: "1px solid #E4E7EC",
    borderRadius: 13,
  },

  tabla: {
    width: "100%",
    tableLayout: "fixed",
    borderCollapse: "separate",
    borderSpacing: 0,
  },

  th: {
    padding: "11px 10px",
    borderBottom: "1px solid #E4E7EC",
    background: "#F8FAFC",
    color: "#667085",
    fontSize: 7.7,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: 0.55,
    whiteSpace: "nowrap",
  },

  thAccion: {
    position: "sticky",
    right: 0,
    zIndex: 3,
    background: "#F8FAFC",
    boxShadow: "-9px 0 16px rgba(15,23,42,.035)",
  },

  td: {
    padding: "12px 10px",
    borderBottom: "1px solid #F0F2F5",
    background: "#FFFFFF",
    color: "#475467",
    fontSize: 9.8,
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  tdAccion: {
    position: "sticky",
    right: 0,
    zIndex: 2,
    background: "#FFFFFF",
    boxShadow: "-9px 0 16px rgba(15,23,42,.03)",
  },

  empresaTabla: {
    display: "grid",
    gridTemplateColumns: "38px minmax(0,1fr)",
    gap: 9,
    alignItems: "center",
  },

  empresaInicial: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#F1F5F9",
    color: "#334155",
    fontWeight: 900,
  },

  nombreEmpresaTabla: {
    display: "block",
    color: "#101828",
    fontSize: 10.7,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  badgeEstado: {
    display: "inline-flex",
    alignItems: "center",
    maxWidth: "100%",
    padding: "5px 8px",
    border: "1px solid transparent",
    borderRadius: 999,
    fontSize: 7.9,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  diasPrueba: {
    color: "#1D4ED8",
    fontSize: 12,
  },

  diasNoAplica: {
    color: "#98A2B3",
    fontWeight: 700,
  },

  accionesTabla: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },

  botonConfigurar: {
    minHeight: 32,
    padding: "7px 9px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: "1px solid #D0D5DD",
    borderRadius: 9,
    background: "#FFFFFF",
    color: "#344054",
    fontSize: 8.6,
    fontWeight: 820,
    cursor: "pointer",
  },

  botonAprobar: {
    minHeight: 32,
    padding: "7px 9px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: 0,
    borderRadius: 9,
    background: "#101828",
    color: "#FFFFFF",
    fontSize: 8.6,
    fontWeight: 820,
    cursor: "pointer",
  },

  botonIniciar: {
    minHeight: 32,
    padding: "7px 9px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: 0,
    borderRadius: 9,
    background: "#1D4ED8",
    color: "#FFFFFF",
    fontSize: 8.6,
    fontWeight: 850,
    cursor: "pointer",
  },

  botonActivarPlan: {
    minHeight: 32,
    padding: "7px 10px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: 0,
    borderRadius: 9,
    background:
      "linear-gradient(135deg,#047857 0%,#059669 100%)",
    color: "#FFFFFF",
    fontSize: 8.6,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 6px 14px rgba(5,150,105,.18)",
  },

  botonArchivar: {
    minHeight: 32,
    padding: "7px 9px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: "1px solid #FECACA",
    borderRadius: 9,
    background: "#FFF7F7",
    color: "#B42318",
    fontSize: 8.4,
    fontWeight: 850,
    cursor: "pointer",
  },

  botonRestaurar: {
    minHeight: 32,
    padding: "7px 9px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: "1px solid #A7F3D0",
    borderRadius: 9,
    background: "#ECFDF5",
    color: "#047857",
    fontSize: 8.4,
    fontWeight: 850,
    cursor: "pointer",
  },

  botonArchivarMobile: {
    width: "100%",
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #FECACA",
    borderRadius: 10,
    background: "#FFF7F7",
    color: "#B42318",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  botonRestaurarMobile: {
    width: "100%",
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #A7F3D0",
    borderRadius: 10,
    background: "#ECFDF5",
    color: "#047857",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  estadoActivoFinal: {
    minHeight: 32,
    padding: "7px 9px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: "1px solid #A7F3D0",
    borderRadius: 9,
    background: "#ECFDF5",
    color: "#047857",
    fontSize: 8.6,
    fontWeight: 900,
  },

  estadoActivoFinalMobile: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 42,
  },

  sinAccion: {
    color: "#98A2B3",
    fontSize: 8.8,
  },

  estadoCarga: {
    minHeight: 210,
    padding: "30px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#667085",
    textAlign: "center",
  },

  spinner: {
    width: 31,
    height: 31,
    marginBottom: 11,
    display: "block",
    border: "4px solid #E4E7EC",
    borderTopColor: "#047857",
    borderRadius: "50%",
  },

  estadoCargaTitulo: {
    color: "#344054",
    fontSize: 13,
  },

  estadoCargaTexto: {
    marginTop: 4,
    fontSize: 10,
  },

  estadoVacio: {
    minHeight: 200,
    padding: "28px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#667085",
  },

  estadoVacioIcono: {
    width: 48,
    height: 48,
    marginBottom: 10,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#F1F5F9",
    color: "#475569",
  },

  estadoVacioTitulo: {
    color: "#344054",
    fontSize: 14,
  },

  estadoVacioTexto: {
    marginTop: 4,
    fontSize: 10,
  },

  empresasMobileGrid: {
    display: "grid",
    gap: 10,
  },

  empresaMobileCard: {
    padding: 13,
    border: "1px solid #E4E7EC",
    borderRadius: 15,
    background: "#FFFFFF",
  },

  empresaMobileTop: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    alignItems: "start",
    gap: 8,
  },

  empresaMobileIdentidad: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "40px minmax(0,1fr)",
    alignItems: "center",
    gap: 9,
  },

  empresaInicialMobile: {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#F1F5F9",
    color: "#334155",
    fontWeight: 900,
  },

  nombreEmpresaMobile: {
    display: "block",
    overflow: "hidden",
    color: "#101828",
    fontSize: 12.5,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  badgeEstadoMobile: {
    maxWidth: 116,
    fontSize: 7.2,
    whiteSpace: "normal",
    textAlign: "center",
  },

  detallesMobileGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 7,
  },

  detalleMobile: {
    minWidth: 0,
    padding: "9px 10px",
    border: "1px solid #EEF2F6",
    borderRadius: 10,
    background: "#F9FAFB",
  },

  detalleMobileEtiqueta: {
    display: "block",
    color: "#98A2B3",
    fontSize: 7.5,
    fontWeight: 820,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  detalleMobileValor: {
    display: "block",
    marginTop: 4,
    overflow: "hidden",
    color: "#344054",
    fontSize: 10.5,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  detalleMobileDestacado: {
    color: "#1D4ED8",
    fontSize: 16,
  },

  accionMobileBox: {
    marginTop: 10,
    paddingTop: 10,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 7,
    borderTop: "1px solid #EEF2F6",
  },

  botonConfigurarMobile: {
    width: "100%",
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid #D0D5DD",
    borderRadius: 10,
    background: "#FFFFFF",
    color: "#344054",
    fontSize: 10,
    fontWeight: 820,
    cursor: "pointer",
  },

  botonAccionMobile: {
    width: "100%",
    minHeight: 42,
    boxSizing: "border-box",
    fontSize: 10,
  },

  version: {
    maxWidth: 1460,
    margin: "10px auto 0",
    color: "#98A2B3",
    fontSize: 8,
    textAlign: "right",
  },
};
