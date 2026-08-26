"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const OPCIONES_ADMIN = [
  { nombre: "Panel Maestro", ruta: "/admin" },
  { nombre: "Crear Nueva Empresa", ruta: "/empresas" },
  { nombre: "Planes Comerciales", ruta: "/planes" },
  { nombre: "Gestión de Módulos", ruta: "/modulos" },
  { nombre: "Centro de Gestión", ruta: "/centro-gestion" },
];

const ACCIONES_HISTORIAL_VISIBLES = [
  "Pago registrado",
  "Suspensión automática",
  "Empresa suspendida",
  "Empresa reactivada",
  "Plan actualizado",
  "Cambio de plan",
  "Empresa archivada",
  "Empresa reactivada desde archivo",
  "Facturación actualizada",
];

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function GestionKonax() {
  const [empresas, setEmpresas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [cargando, setCargando] = useState(true);

  const [mostrarPago, setMostrarPago] = useState(false);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false);

  const [empresaPago, setEmpresaPago] = useState(null);
  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Yappy");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [observacionPago, setObservacionPago] = useState("");

  const [esMovil, setEsMovil] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    cargarDatos();

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

  function fechaHoy() {
    return new Date().toISOString().split("T")[0];
  }

  function sumarDias(fechaTexto, dias) {
    const fecha = fechaTexto
      ? new Date(`${fechaTexto}T12:00:00`)
      : new Date();

    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().split("T")[0];
  }

  function formato(numero) {
    return (
      "$" +
      Number(numero || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatoFecha(fecha) {
    if (!fecha) return "-";

    const texto = String(fecha).slice(0, 10);
    const [year, month, day] = texto.split("-");

    if (!year || !month || !day) return fecha;

    return `${day}/${month}/${year}`;
  }

  function estadoServicioActivo(empresa) {
    return (
      !empresa.archivada &&
      ["activo", "activa"].includes(normalizar(empresa.estado))
    );
  }

  function obtenerDiasParaVencer(fecha) {
    if (!fecha) return null;

    const hoy = new Date(`${fechaHoy()}T12:00:00`);
    const fin = new Date(`${String(fecha).slice(0, 10)}T12:00:00`);

    return Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
  }

  function textoVencimiento(fecha) {
    const dias = obtenerDiasParaVencer(fecha);

    if (dias === null) return "Sin fecha";
    if (dias < 0) return "Vencido";
    if (dias === 0) return "Vence hoy";
    if (dias === 1) return "Vence mañana";
    if (dias <= 7) return `Vence en ${dias} días`;
    return `${dias} días`;
  }

  async function revisarSuspensionesAutomaticas(empresasData) {
    const hoy = fechaHoy();

    for (const empresa of empresasData || []) {
      if (empresa.archivada) continue;

      const vencida =
        empresa.fecha_proxima_facturacion &&
        hoy > empresa.fecha_proxima_facturacion &&
        empresa.estado_pago !== "Al día";

      if (
        vencida &&
        normalizar(empresa.estado) !== "suspendido"
      ) {
        await supabase
          .from("empresas")
          .update({
            estado: "Suspendido",
            estado_plan: "Suspendido",
            estado_pago: "Pendiente",
          })
          .eq("id", empresa.id);

        await supabase.from("bitacora_konax").insert([
          {
            empresa_id: empresa.id,
            empresa_nombre: empresa.nombre,
            accion: "Suspensión automática",
            descripcion: "Servicio suspendido por facturación vencida.",
            estado_anterior: empresa.estado,
            estado_nuevo: "Suspendido",
            usuario: "Sistema KONAX",
          },
        ]);
      }
    }
  }

  async function cargarDatos() {
    setCargando(true);

    const { data: empresasData, error: errorEmpresas } = await supabase
      .from("empresas")
      .select("*")
      .order("created_at", { ascending: false });

    if (errorEmpresas) {
      alert("Error cargando empresas: " + errorEmpresas.message);
      setCargando(false);
      return;
    }

    await revisarSuspensionesAutomaticas(empresasData || []);

    const [respuestaEmpresas, respuestaPagos, respuestaBitacora] =
      await Promise.all([
        supabase
          .from("empresas")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("pagos_konax")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("bitacora_konax")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(150),
      ]);

    if (respuestaEmpresas.error) {
      alert(
        "Error actualizando empresas: " +
          respuestaEmpresas.error.message
      );
    }

    if (respuestaPagos.error) {
      console.error("Error cargando pagos:", respuestaPagos.error);
    }

    if (respuestaBitacora.error) {
      console.error("Error cargando bitácora:", respuestaBitacora.error);
    }

    setEmpresas(respuestaEmpresas.data || empresasData || []);
    setPagos(respuestaPagos.data || []);
    setBitacora(respuestaBitacora.data || []);
    setCargando(false);
  }

  function seleccionarEmpresa(empresa) {
    localStorage.setItem("empresaAdminCreadaId", empresa.id);
    localStorage.setItem(
      "empresaAdminCreadaNombre",
      empresa.nombre || ""
    );
    localStorage.setItem(
      "categoriaNegocioAdmin",
      empresa.categoria_negocio || ""
    );
    localStorage.setItem(
      "tipoNegocioAdmin",
      empresa.tipo_negocio || ""
    );
  }

  function administrarEmpresa(empresa) {
    seleccionarEmpresa(empresa);
    window.location.href = `/admin-empresa?empresa=${empresa.id}`;
  }

  function abrirPlan(empresa) {
    seleccionarEmpresa(empresa);
    window.location.href = "/planes";
  }

  function abrirPago(empresa) {
    setEmpresaPago(empresa);
    setMontoPago(empresa.plan_precio || "");
    setMetodoPago("Yappy");
    setReferenciaPago("");
    setObservacionPago("");
    setMostrarPago(true);
  }

  function cerrarPago() {
    setMostrarPago(false);
    setEmpresaPago(null);
    setMontoPago("");
    setReferenciaPago("");
    setObservacionPago("");
  }

  async function archivarEmpresa(empresa) {
    const confirmar = window.confirm(
      `¿Archivar ${empresa.nombre}? Dejará de aparecer en la cartera activa, pero sus datos no se eliminarán.`
    );

    if (!confirmar) return;

    const usuario =
      localStorage.getItem("adminKonaxNombre") || "KONAX";

    const { error } = await supabase
      .from("empresas")
      .update({
        archivada: true,
        archivada_en: new Date().toISOString(),
        archivada_por: usuario,
      })
      .eq("id", empresa.id);

    if (error) {
      alert("No se pudo archivar la empresa: " + error.message);
      return;
    }

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: empresa.id,
        empresa_nombre: empresa.nombre,
        accion: "Empresa archivada",
        descripcion:
          "La empresa fue retirada de la cartera activa sin eliminar sus datos.",
        estado_anterior: empresa.estado || null,
        estado_nuevo: empresa.estado || null,
        usuario,
      },
    ]);

    await cargarDatos();
  }

  async function reactivarArchivada(empresa) {
    const usuario =
      localStorage.getItem("adminKonaxNombre") || "KONAX";

    const { error } = await supabase
      .from("empresas")
      .update({
        archivada: false,
        archivada_en: null,
        archivada_por: null,
      })
      .eq("id", empresa.id);

    if (error) {
      alert("No se pudo reactivar la empresa: " + error.message);
      return;
    }

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: empresa.id,
        empresa_nombre: empresa.nombre,
        accion: "Empresa reactivada desde archivo",
        descripcion: "La empresa volvió a la cartera activa.",
        estado_anterior: empresa.estado || null,
        estado_nuevo: empresa.estado || null,
        usuario,
      },
    ]);

    await cargarDatos();
  }

  async function registrarPago() {
    if (!empresaPago) {
      alert("Seleccione una empresa.");
      return;
    }

    if (!montoPago || Number(montoPago) <= 0) {
      alert("Ingrese un monto válido.");
      return;
    }

    if (!referenciaPago.trim()) {
      alert("Ingrese la referencia del pago.");
      return;
    }

    const hoy = fechaHoy();
    const proximaFacturacion = sumarDias(hoy, 30);
    const usuario =
      localStorage.getItem("adminKonaxNombre") || "KONAX";

    const { error: errorPago } = await supabase
      .from("pagos_konax")
      .insert([
        {
          empresa_id: empresaPago.id,
          empresa_nombre: empresaPago.nombre,
          plan_codigo: empresaPago.plan_codigo,
          plan_nombre: empresaPago.plan_nombre,
          plan_tipo: empresaPago.plan_tipo || "Mensual",
          monto: Number(montoPago),
          metodo_pago: metodoPago,
          referencia_pago: referenciaPago.trim(),
          fecha_factura: hoy,
          fecha_pago: hoy,
          fecha_vencimiento: proximaFacturacion,
          estado_pago: "Pagado",
          estado_servicio: "Activo",
          observacion: observacionPago.trim(),
          usuario_registro: usuario,
        },
      ]);

    if (errorPago) {
      alert("Error registrando pago: " + errorPago.message);
      return;
    }

    const { error: errorEmpresa } = await supabase
      .from("empresas")
      .update({
        estado: "Activo",
        estado_plan: "Activo",
        estado_pago: "Al día",
        fecha_ultimo_pago: hoy,
        fecha_proxima_facturacion: proximaFacturacion,
      })
      .eq("id", empresaPago.id);

    if (errorEmpresa) {
      alert(
        "Pago guardado, pero error actualizando empresa: " +
          errorEmpresa.message
      );
      return;
    }

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: empresaPago.id,
        empresa_nombre: empresaPago.nombre,
        accion: "Pago registrado",
        descripcion: `Pago por ${formato(
          montoPago
        )} vía ${metodoPago}. Próxima facturación: ${formatoFecha(
          proximaFacturacion
        )}.`,
        estado_anterior: empresaPago.estado,
        estado_nuevo: "Activo",
        usuario,
      },
    ]);

    alert("Pago registrado correctamente.");
    cerrarPago();
    await cargarDatos();
  }

  const empresasActivasVisibles = useMemo(
    () => empresas.filter((empresa) => !Boolean(empresa.archivada)),
    [empresas]
  );

  const empresasArchivadas = useMemo(
    () => empresas.filter((empresa) => Boolean(empresa.archivada)),
    [empresas]
  );

  const empresasBase = mostrarArchivadas
    ? empresasArchivadas
    : empresasActivasVisibles;

  const empresasFiltradas = useMemo(() => {
    const texto = normalizar(filtro);

    return empresasBase.filter((empresa) => {
      if (!texto) return true;

      const contenido = normalizar(
        [
          empresa.nombre,
          empresa.correo,
          empresa.telefono,
          empresa.plan_nombre,
          empresa.estado,
          empresa.tipo_negocio,
        ]
          .filter(Boolean)
          .join(" ")
      );

      return contenido.includes(texto);
    });
  }, [empresasBase, filtro]);

  const hoyFecha = new Date();
  const mesActual = hoyFecha.getMonth();
  const anioActual = hoyFecha.getFullYear();

  const empresasActivas = empresasActivasVisibles.filter(
    estadoServicioActivo
  ).length;

  const empresasSuspendidas = empresasActivasVisibles.filter(
    (empresa) =>
      normalizar(empresa.estado) === "suspendido" ||
      normalizar(empresa.estado_plan) === "suspendido"
  ).length;

  const ingresosEstimados = empresasActivasVisibles
    .filter(estadoServicioActivo)
    .reduce(
      (sum, empresa) => sum + Number(empresa.plan_precio || 0),
      0
    );

  const idsEmpresasActivas = new Set(
    empresasActivasVisibles.map((empresa) =>
      String(empresa.id)
    )
  );

  const pagosDelMes = pagos.filter((pago) => {
    const fecha =
      pago.fecha_pago || pago.created_at;

    if (!fecha) return false;

    const perteneceEmpresaActiva =
      idsEmpresasActivas.has(
        String(pago.empresa_id)
      );

    if (!perteneceEmpresaActiva) {
      return false;
    }

    const fechaPago = new Date(fecha);

    return (
      fechaPago.getMonth() === mesActual &&
      fechaPago.getFullYear() === anioActual
    );
  });

  const pagadoEsteMes = pagosDelMes.reduce(
    (sum, pago) => sum + Number(pago.monto || 0),
    0
  );

  const proximosVencer = empresasActivasVisibles.filter((empresa) => {
    const dias = obtenerDiasParaVencer(
      empresa.fecha_proxima_facturacion
    );

    return (
      dias !== null &&
      dias >= 0 &&
      dias <= 7 &&
      estadoServicioActivo(empresa)
    );
  }).length;

  const historialVisible = useMemo(() => {
    const idsActivos = new Set(
      empresasActivasVisibles.map((empresa) =>
        String(empresa.id)
      )
    );

    return bitacora
      .filter((item) => {
        const accionValida =
          ACCIONES_HISTORIAL_VISIBLES.includes(
            item.accion
          );

        const empresaActiva =
          idsActivos.has(
            String(item.empresa_id)
          );

        return accionValida && empresaActiva;
      })
      .slice(0, 50);
  }, [bitacora, empresasActivasVisibles]);

  if (cargando) {
    return (
      <div style={s.loadingPage}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.loadingLogo}
        />

        <strong style={s.loadingTitle}>
          Cargando Centro de Gestión
        </strong>

        <span style={s.loadingText}>
          Consultando cartera, pagos y vencimientos.
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
          <div style={s.heroContent}>
            <span style={s.eyebrow}>CARTERA KONAX</span>

            <h1 style={s.heroTitle}>Centro de Gestión</h1>

            <p style={s.heroText}>
              Control de clientes reales, pagos,
              vencimientos y estado del servicio.
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
            ...s.topActions,
            ...(esMovil ? s.topActionsMobile : {}),
          }}
        >
          <button
            type="button"
            onClick={() =>
              setMostrarReporte((actual) => !actual)
            }
            style={s.primaryAction}
          >
            {mostrarReporte
              ? "Ocultar actividad"
              : "Ver pagos y actividad"}
          </button>

          <button
            type="button"
            onClick={() =>
              setMostrarArchivadas((actual) => !actual)
            }
            style={s.lightButton}
          >
            {mostrarArchivadas
              ? "Ver cartera activa"
              : `Ver archivadas (${empresasArchivadas.length})`}
          </button>

          <Link href="/empresas" style={s.lightAction}>
            Empresas
          </Link>

          <Link href="/admin" style={s.darkAction}>
            Volver al Admin
          </Link>
        </section>

        <section
          style={{
            ...s.kpiGrid,
            ...(esMovil ? s.kpiGridMobile : {}),
          }}
        >
          <KPI titulo="Clientes activos" valor={empresasActivas} tono="verde" />
          <KPI titulo="Suspendidos" valor={empresasSuspendidas} tono="rojo" />
          <KPI titulo="Vencen en 7 días" valor={proximosVencer} tono="amarillo" />
          <KPI titulo="Ingreso mensual" valor={formato(ingresosEstimados)} tono="verde" />
          <KPI titulo="Pagado este mes" valor={formato(pagadoEsteMes)} tono="dorado" />
          <KPI titulo="Archivadas" valor={empresasArchivadas.length} tono="gris" />
        </section>

        <section style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <span style={s.sectionEyebrow}>
                {mostrarArchivadas
                  ? "EMPRESAS ARCHIVADAS"
                  : "CARTERA ACTIVA"}
              </span>

              <h2 style={s.sectionTitle}>
                {mostrarArchivadas
                  ? "Empresas fuera de operación"
                  : "Empresas clientes"}
              </h2>

              <p style={s.softText}>
                {mostrarArchivadas
                  ? "Estas empresas no cuentan en los indicadores ni en los ingresos."
                  : "Administra servicio, plan, facturación y pagos."}
              </p>
            </div>

            <input
              placeholder="Buscar empresa..."
              value={filtro}
              onChange={(event) => setFiltro(event.target.value)}
              style={s.searchInput}
            />
          </div>

          {empresasFiltradas.length === 0 ? (
            <EmptyState
              text={
                mostrarArchivadas
                  ? "No hay empresas archivadas."
                  : "No hay empresas activas para mostrar."
              }
            />
          ) : (
            <div style={s.companyGrid}>
              {empresasFiltradas.map((empresa) => (
                <article key={empresa.id} style={s.companyCard}>
                  <div style={s.companyTop}>
                    <div style={s.companyIdentity}>
                      <div style={s.companyInitial}>
                        {String(empresa.nombre || "E")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <strong style={s.companyName}>
                          {empresa.nombre}
                        </strong>
                        <span style={s.companyContact}>
                          {empresa.correo || "-"}
                        </span>
                        <span style={s.companyContact}>
                          {empresa.telefono || "-"}
                        </span>
                      </div>
                    </div>

                    <ServiceBadge
                      active={estadoServicioActivo(empresa)}
                      value={
                        empresa.archivada
                          ? "Archivada"
                          : empresa.estado || "Activo"
                      }
                    />
                  </div>

                  <div style={s.detailsGrid}>
                    <Detail label="Plan" value={empresa.plan_nombre || "Sin plan"} />
                    <Detail label="Precio" value={formato(empresa.plan_precio)} accent />
                    <Detail label="Pago" value={empresa.estado_pago || "Pendiente"} />
                    <Detail
                      label="Próxima facturación"
                      value={formatoFecha(empresa.fecha_proxima_facturacion)}
                    />
                    <Detail
                      label="Vencimiento"
                      value={textoVencimiento(empresa.fecha_proxima_facturacion)}
                    />
                    <Detail label="Negocio" value={empresa.tipo_negocio || "-"} />
                  </div>

                  {!empresa.archivada ? (
                    <div style={s.actionsGrid}>
                      <button
                        type="button"
                        style={s.adminButton}
                        onClick={() => administrarEmpresa(empresa)}
                      >
                        Administrar
                      </button>

                      <button
                        type="button"
                        style={s.planButton}
                        onClick={() => abrirPlan(empresa)}
                      >
                        Plan
                      </button>

                      <button
                        type="button"
                        style={s.paymentButton}
                        onClick={() => abrirPago(empresa)}
                      >
                        Registrar pago
                      </button>

                      <button
                        type="button"
                        style={s.archiveButton}
                        onClick={() => archivarEmpresa(empresa)}
                      >
                        Archivar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      style={s.restoreButton}
                      onClick={() => reactivarArchivada(empresa)}
                    >
                      Volver a cartera activa
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {mostrarReporte && (
          <>
            <section style={s.card}>
              <span style={s.sectionEyebrow}>PAGOS</span>
              <h2 style={s.sectionTitle}>Pagos del mes</h2>
              <p style={s.softText}>
                Movimientos financieros registrados durante el mes actual.
              </p>

              {pagosDelMes.length === 0 ? (
                <EmptyState text="No hay pagos registrados este mes." />
              ) : (
                <div style={s.reportGrid}>
                  {pagosDelMes.map((pago) => (
                    <article key={pago.id} style={s.reportCard}>
                      <div>
                        <span style={s.reportLabel}>
                          {formatoFecha(pago.fecha_pago || pago.created_at)}
                        </span>
                        <strong style={s.reportTitle}>
                          {pago.empresa_nombre || "-"}
                        </strong>
                        <span style={s.reportText}>
                          {pago.plan_nombre || "-"}
                        </span>
                        <span style={s.reportText}>
                          {pago.metodo_pago || "-"} · {pago.referencia_pago || "Sin referencia"}
                        </span>
                      </div>

                      <strong style={s.reportAmount}>
                        {formato(pago.monto)}
                      </strong>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section style={s.card}>
              <span style={s.sectionEyebrow}>ACTIVIDAD IMPORTANTE</span>
              <h2 style={s.sectionTitle}>Historial operativo</h2>
              <p style={s.softText}>
                Solo eventos útiles para administrar clientes, pagos y servicio.
              </p>

              {historialVisible.length === 0 ? (
                <EmptyState text="No hay actividad importante registrada." />
              ) : (
                <div style={s.activityGrid}>
                  {historialVisible.map((item) => (
                    <article key={item.id} style={s.activityCard}>
                      <span style={s.activityDate}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("es-PA")
                          : "-"}
                      </span>
                      <strong style={s.activityAction}>
                        {item.accion}
                      </strong>
                      <span style={s.activityCompany}>
                        {item.empresa_nombre || "-"}
                      </span>
                      <p style={s.activityDescription}>
                        {item.descripcion || "-"}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {mostrarPago && (
          <div style={s.modalOverlay}>
            <div style={s.modal}>
              <div style={s.modalHeader}>
                <div>
                  <span style={s.sectionEyebrow}>REGISTRO DE PAGO</span>
                  <h2 style={s.modalTitle}>{empresaPago?.nombre}</h2>
                </div>

                <button type="button" onClick={cerrarPago} style={s.closeButton}>
                  ×
                </button>
              </div>

              <label style={s.label}>Método de pago</label>
              <select
                value={metodoPago}
                onChange={(event) => setMetodoPago(event.target.value)}
                style={s.input}
              >
                <option>Yappy</option>
                <option>Transferencia Bancaria</option>
                <option>Efectivo</option>
                <option>Otro</option>
              </select>

              <label style={s.label}>Monto pagado</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={montoPago}
                onChange={(event) => setMontoPago(event.target.value)}
                style={s.input}
              />

              <label style={s.label}>Referencia</label>
              <input
                value={referenciaPago}
                onChange={(event) => setReferenciaPago(event.target.value)}
                placeholder="Número de referencia"
                style={s.input}
              />

              <label style={s.label}>Observación</label>
              <textarea
                value={observacionPago}
                onChange={(event) => setObservacionPago(event.target.value)}
                placeholder="Opcional"
                style={s.textarea}
              />

              <div style={s.modalActions}>
                <button
                  type="button"
                  style={s.saveButton}
                  onClick={registrarPago}
                >
                  Guardar pago
                </button>

                <button
                  type="button"
                  style={s.cancelButton}
                  onClick={cerrarPago}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MobileAdminBar({ abierto, setAbierto }) {
  return (
    <>
      <div style={s.mobileBar}>
        <img src="/konax-logo.png" alt="KONAX" style={s.mobileLogo} />

        <button
          type="button"
          onClick={() => setAbierto((actual) => !actual)}
          style={s.mobileMenuButton}
        >
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
              {item.nombre}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function KPI({ titulo, valor, tono }) {
  const tonos = {
    verde: ["#16834f", "#e9f8ef"],
    rojo: ["#c62828", "#fff0f0"],
    amarillo: ["#a56a00", "#fff7df"],
    dorado: ["#9a6700", "#fff6dc"],
    gris: ["#526057", "#f1f5f2"],
  };

  const [color, fondo] = tonos[tono] || tonos.verde;

  return (
    <article style={s.kpiCard}>
      <span style={{ ...s.kpiDot, background: color }} />
      <span style={s.kpiTitle}>{titulo}</span>
      <strong style={s.kpiValue}>{valor}</strong>
      <div style={{ ...s.kpiTint, background: fondo }} />
    </article>
  );
}

function Detail({ label, value, accent = false }) {
  return (
    <div style={s.detailBox}>
      <span style={s.detailLabel}>{label}</span>
      <strong
        style={{
          ...s.detailValue,
          ...(accent ? { color: "#16834f" } : {}),
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function ServiceBadge({ active, value }) {
  return (
    <span
      style={{
        ...s.serviceBadge,
        ...(active ? s.serviceBadgeActive : s.serviceBadgeSuspended),
      }}
    >
      {value}
    </span>
  );
}

function EmptyState({ text }) {
  return <div style={s.emptyState}>{text}</div>;
}

const s = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg,#f6f8f7 0%,#edf3ef 100%)",
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
    padding: "14px 12px 30px",
    boxSizing: "border-box",
  },
  hero: {
    minHeight: 178,
    marginBottom: 14,
    padding: "27px 29px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 22,
    borderRadius: 24,
    background: "linear-gradient(135deg,#07100b 0%,#103421 55%,#16834f 100%)",
    color: "#fff",
    boxShadow: "0 22px 52px rgba(11,48,29,.17)",
  },
  heroMobile: {
    minHeight: 0,
    padding: "21px 18px 22px",
  },
  heroContent: {},
  eyebrow: {
    display: "block",
    marginBottom: 8,
    color: "#7ce1aa",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.45,
  },
  heroTitle: {
    margin: "0 0 10px",
    fontSize: "clamp(33px,4vw,49px)",
    lineHeight: 1.03,
  },
  heroText: {
    margin: 0,
    color: "#d1e5d8",
    fontSize: 14,
  },
  heroLogoBox: {
    width: 225,
    height: 92,
    padding: 10,
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#fff",
  },
  heroLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  topActions: {
    marginBottom: 14,
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
  topActionsMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
  },
  primaryAction: {
    minHeight: 43,
    padding: "9px 14px",
    border: "none",
    borderRadius: 11,
    background: "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  lightButton: {
    minHeight: 43,
    padding: "9px 14px",
    border: "1px solid #cad6ce",
    borderRadius: 11,
    background: "#fff",
    color: "#26342c",
    fontWeight: 850,
    cursor: "pointer",
  },
  lightAction: {
    minHeight: 43,
    padding: "9px 14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #cad6ce",
    borderRadius: 11,
    background: "#fff",
    color: "#26342c",
    fontWeight: 850,
    textDecoration: "none",
  },
  darkAction: {
    minHeight: 43,
    padding: "9px 14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    background: "#17211c",
    color: "#fff",
    fontWeight: 850,
    textDecoration: "none",
  },
  kpiGrid: {
    marginBottom: 15,
    display: "grid",
    gridTemplateColumns: "repeat(6,minmax(0,1fr))",
    gap: 11,
  },
  kpiGridMobile: {
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  },
  kpiCard: {
    minHeight: 120,
    padding: 16,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#fff",
  },
  kpiDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
  },
  kpiTitle: {
    marginTop: 10,
    color: "#657169",
    fontSize: 10,
    fontWeight: 850,
  },
  kpiValue: {
    marginTop: "auto",
    position: "relative",
    zIndex: 2,
    fontSize: 25,
  },
  kpiTint: {
    width: 70,
    height: 70,
    position: "absolute",
    right: -25,
    bottom: -25,
    borderRadius: "50%",
  },
  card: {
    marginBottom: 15,
    padding: 20,
    border: "1px solid #dfe7e2",
    borderRadius: 21,
    background: "#fff",
    boxShadow: "0 12px 34px rgba(15,23,42,.05)",
  },
  cardHeader: {
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
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
  },
  softText: {
    margin: "6px 0 0",
    color: "#758078",
    fontSize: 11,
  },
  searchInput: {
    width: 320,
    maxWidth: "100%",
    minHeight: 43,
    padding: "0 12px",
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    outline: "none",
  },
  companyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))",
    gap: 12,
  },
  companyCard: {
    padding: 15,
    border: "1px solid #dfe7e2",
    borderRadius: 17,
    background: "linear-gradient(155deg,#fff,#f7faf8)",
  },
  companyTop: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: 10,
  },
  companyIdentity: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "43px minmax(0,1fr)",
    gap: 10,
    alignItems: "center",
  },
  companyInitial: {
    width: 43,
    height: 43,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#e8f7ee",
    color: "#16834f",
    fontWeight: 950,
  },
  companyName: {
    display: "block",
    fontSize: 14,
  },
  companyContact: {
    display: "block",
    marginTop: 2,
    color: "#88948d",
    fontSize: 9,
  },
  detailsGrid: {
    marginTop: 13,
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 8,
  },
  detailBox: {
    padding: "9px 10px",
    border: "1px solid #e7ece9",
    borderRadius: 11,
    background: "#fff",
  },
  detailLabel: {
    display: "block",
    color: "#7d8981",
    fontSize: 7.5,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  detailValue: {
    display: "block",
    marginTop: 4,
    color: "#27342d",
    fontSize: 10.5,
  },
  serviceBadge: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 8,
    fontWeight: 900,
  },
  serviceBadgeActive: {
    background: "#dcfce7",
    color: "#166534",
  },
  serviceBadgeSuspended: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  actionsGrid: {
    marginTop: 12,
    paddingTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 7,
    borderTop: "1px solid #e7ece9",
  },
  adminButton: {
    minHeight: 40,
    border: "none",
    borderRadius: 10,
    background: "#16834f",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  planButton: {
    minHeight: 40,
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  paymentButton: {
    minHeight: 40,
    border: "none",
    borderRadius: 10,
    background: "#b7791f",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  archiveButton: {
    minHeight: 40,
    border: "1px solid #d1d7d3",
    borderRadius: 10,
    background: "#fff",
    color: "#526057",
    fontWeight: 850,
    cursor: "pointer",
  },
  restoreButton: {
    width: "100%",
    minHeight: 42,
    marginTop: 12,
    border: "1px solid #bddfca",
    borderRadius: 10,
    background: "#edf8f1",
    color: "#14683e",
    fontWeight: 850,
    cursor: "pointer",
  },
  reportGrid: {
    marginTop: 14,
    display: "grid",
    gap: 8,
  },
  reportCard: {
    padding: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    border: "1px solid #e2e8e4",
    borderRadius: 13,
    background: "#f9fbfa",
  },
  reportLabel: {
    display: "block",
    color: "#8a958e",
    fontSize: 8,
  },
  reportTitle: {
    display: "block",
    marginTop: 3,
    fontSize: 12,
  },
  reportText: {
    display: "block",
    marginTop: 2,
    color: "#748078",
    fontSize: 9,
  },
  reportAmount: {
    color: "#16834f",
    fontSize: 17,
  },
  activityGrid: {
    marginTop: 14,
    display: "grid",
    gap: 8,
  },
  activityCard: {
    padding: 13,
    border: "1px solid #e2e8e4",
    borderRadius: 13,
    background: "#f9fbfa",
  },
  activityDate: {
    display: "block",
    color: "#8a958e",
    fontSize: 8,
  },
  activityAction: {
    display: "block",
    marginTop: 3,
    fontSize: 12,
  },
  activityCompany: {
    display: "block",
    marginTop: 2,
    color: "#16834f",
    fontSize: 9,
    fontWeight: 850,
  },
  activityDescription: {
    margin: "6px 0 0",
    color: "#657169",
    fontSize: 9.5,
  },
  emptyState: {
    minHeight: 120,
    display: "grid",
    placeItems: "center",
    color: "#7b877f",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 999,
    padding: 20,
    display: "grid",
    placeItems: "center",
    background: "rgba(4,15,9,.64)",
  },
  modal: {
    width: 470,
    maxWidth: "100%",
    padding: 22,
    borderRadius: 20,
    background: "#fff",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: {
    margin: 0,
  },
  closeButton: {
    width: 38,
    height: 38,
    border: "1px solid #dfe7e2",
    borderRadius: 11,
    background: "#fff",
    cursor: "pointer",
  },
  label: {
    display: "block",
    marginTop: 13,
    marginBottom: 5,
    fontSize: 10,
    fontWeight: 850,
  },
  input: {
    width: "100%",
    minHeight: 42,
    padding: "10px 11px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
  },
  textarea: {
    width: "100%",
    minHeight: 82,
    padding: "10px 11px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    resize: "vertical",
  },
  modalActions: {
    marginTop: 17,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  saveButton: {
    minHeight: 43,
    border: "none",
    borderRadius: 10,
    background: "#16834f",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  cancelButton: {
    minHeight: 43,
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    background: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "#f3f6f4",
  },
  loadingLogo: {
    width: 195,
  },
  loadingTitle: {
    fontSize: 18,
  },
  loadingText: {
    color: "#7b877f",
    fontSize: 11,
  },
  mobileBar: {
    position: "sticky",
    top: 0,
    zIndex: 70,
    padding: "10px 13px",
    display: "flex",
    justifyContent: "space-between",
    background: "#fff",
    borderBottom: "1px solid #dce6e0",
  },
  mobileLogo: {
    width: 145,
    maxWidth: "50vw",
  },
  mobileMenuButton: {
    minWidth: 100,
    minHeight: 44,
    border: "none",
    borderRadius: 14,
    background: "#173c2a",
    color: "#fff",
    fontWeight: 850,
  },
  mobileMenu: {
    position: "fixed",
    top: 66,
    left: 10,
    right: 10,
    zIndex: 80,
    padding: 11,
    display: "grid",
    gap: 8,
    border: "1px solid #dce6e0",
    borderRadius: 19,
    background: "#fff",
  },
  mobileMenuItem: {
    minHeight: 46,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    border: "1px solid #edf1ee",
    borderRadius: 11,
    color: "#1d2b23",
    fontWeight: 800,
    textDecoration: "none",
  },
};
