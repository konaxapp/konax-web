"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const OPCIONES_ADMIN = [
  { nombre: "Panel Maestro", ruta: "/admin", icono: "dashboard" },
  { nombre: "Empresas Clientes", ruta: "/empresas", icono: "building" },
  { nombre: "Planes Comerciales", ruta: "/planes", icono: "briefcase" },
  { nombre: "Gestión de Módulos", ruta: "/modulos", icono: "modules" },
  { nombre: "Centro de Gestión", ruta: "/centro-gestion", icono: "chart" },
];

export default function GestionKonax() {
  const [empresas, setEmpresas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [cargando, setCargando] = useState(true);

  const [mostrarPago, setMostrarPago] = useState(false);
  const [mostrarReporte, setMostrarReporte] = useState(false);

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
    return empresa.estado === "Activo" || empresa.estado === "Activa";
  }

  async function revisarSuspensionesAutomaticas(empresasData) {
    const hoy = fechaHoy();

    for (const empresa of empresasData || []) {
      const vencida =
        empresa.fecha_proxima_facturacion &&
        hoy > empresa.fecha_proxima_facturacion &&
        empresa.estado_pago !== "Al día";

      if (vencida && empresa.estado !== "Suspendido") {
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
            descripcion: `La empresa ${empresa.nombre} fue suspendida automáticamente por facturación vencida.`,
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

    const { data: empresasData, error: errorEmpresas } =
      await supabase
        .from("empresas")
        .select("*")
        .order("created_at", { ascending: false });

    if (errorEmpresas) {
      alert("Error cargando empresas: " + errorEmpresas.message);
      setCargando(false);
      return;
    }

    await revisarSuspensionesAutomaticas(empresasData || []);

    const { data: empresasActualizadas, error: errorActualizadas } =
      await supabase
        .from("empresas")
        .select("*")
        .order("created_at", { ascending: false });

    const { data: pagosData, error: errorPagos } = await supabase
      .from("pagos_konax")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: bitacoraData, error: errorBitacora } =
      await supabase
        .from("bitacora_konax")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80);

    if (errorActualizadas) {
      alert(
        "Error actualizando empresas: " +
          errorActualizadas.message
      );
    }

    if (errorPagos) {
      console.error("Error cargando pagos:", errorPagos);
    }

    if (errorBitacora) {
      console.error("Error cargando bitácora:", errorBitacora);
    }

    setEmpresas(empresasActualizadas || empresasData || []);
    setPagos(pagosData || []);
    setBitacora(bitacoraData || []);
    setCargando(false);
  }

  function seleccionarEmpresa(empresa, mostrarAlerta = true) {
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

    if (mostrarAlerta) {
      alert("Empresa seleccionada: " + empresa.nombre);
    }
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

    const { error: errorBitacora } = await supabase
      .from("bitacora_konax")
      .insert([
        {
          empresa_id: empresaPago.id,
          empresa_nombre: empresaPago.nombre,
          accion: "Pago registrado",
          descripcion: `Pago registrado por ${formato(
            montoPago
          )} vía ${metodoPago}. Próxima facturación: ${proximaFacturacion}.`,
          estado_anterior: empresaPago.estado,
          estado_nuevo: "Activo",
          usuario,
        },
      ]);

    if (errorBitacora) {
      alert(
        "Pago guardado, pero error guardando bitácora: " +
          errorBitacora.message
      );
    } else {
      alert("Pago registrado correctamente.");
    }

    cerrarPago();
    await cargarDatos();
  }

  const empresasFiltradas = useMemo(() => {
    const texto = filtro.trim().toLowerCase();

    return empresas.filter((empresa) => {
      return (
        !texto ||
        empresa.nombre?.toLowerCase().includes(texto) ||
        empresa.correo?.toLowerCase().includes(texto) ||
        empresa.telefono?.toLowerCase().includes(texto) ||
        empresa.plan_nombre?.toLowerCase().includes(texto) ||
        empresa.estado?.toLowerCase().includes(texto)
      );
    });
  }, [empresas, filtro]);

  const hoyFecha = new Date();
  const mesActual = hoyFecha.getMonth();
  const anioActual = hoyFecha.getFullYear();

  const empresasActivas = empresas.filter(estadoServicioActivo).length;

  const empresasSuspendidas = empresas.filter(
    (empresa) =>
      empresa.estado === "Suspendido" ||
      empresa.estado_plan === "Suspendido"
  ).length;

  const ingresosEstimados = empresas
    .filter(estadoServicioActivo)
    .reduce(
      (sum, empresa) =>
        sum + Number(empresa.plan_precio || 0),
      0
    );

  const pagosDelMes = pagos.filter((pago) => {
    const fecha = pago.fecha_pago || pago.created_at;
    if (!fecha) return false;

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

  const proximosVencer = empresas.filter((empresa) => {
    if (!empresa.fecha_proxima_facturacion) return false;

    const hoyTexto = fechaHoy();
    const limite = sumarDias(hoyTexto, 7);

    return (
      empresa.fecha_proxima_facturacion >= hoyTexto &&
      empresa.fecha_proxima_facturacion <= limite
    );
  }).length;

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
          Consultando empresas, pagos y vencimientos.
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
              CENTRO INTERNO KONAX
            </span>

            <h1
              style={{
                ...s.heroTitle,
                ...(esMovil ? s.heroTitleMobile : {}),
              }}
            >
              Centro de Gestión KONAX
            </h1>

            <p
              style={{
                ...s.heroText,
                ...(esMovil ? s.heroTextMobile : {}),
              }}
            >
              Control interno de empresas, pagos, vencimientos y estado del servicio.
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
            onClick={() => setMostrarReporte((actual) => !actual)}
            style={s.primaryAction}
          >
            <Icon name="report" size={18} />

            {mostrarReporte
              ? "Ocultar reporte interno"
              : "Ver reporte interno"}
          </button>

          <Link href="/empresas" style={s.lightAction}>
            <Icon name="building" size={18} />
            Empresas
          </Link>

          <Link href="/admin" style={s.darkAction}>
            <Icon name="arrowBack" size={18} />
            Volver al Admin
          </Link>
        </section>

        <section
          style={{
            ...s.kpiGrid,
            ...(esMovil ? s.kpiGridMobile : {}),
          }}
        >
          <KPI
            titulo="Empresas registradas"
            valor={empresas.length}
            icono="building"
            tono="verde"
            movil={esMovil}
          />

          <KPI
            titulo="Empresas activas"
            valor={empresasActivas}
            icono="checkCircle"
            tono="azul"
            movil={esMovil}
          />

          <KPI
            titulo="Suspendidas"
            valor={empresasSuspendidas}
            icono="blocked"
            tono="rojo"
            movil={esMovil}
          />

          <KPI
            titulo="Próximas a vencer"
            valor={proximosVencer}
            icono="calendar"
            tono="amarillo"
            movil={esMovil}
          />

          <KPI
            titulo="Ingreso estimado"
            valor={formato(ingresosEstimados)}
            icono="trend"
            tono="verde"
            movil={esMovil}
          />

          <KPI
            titulo="Pagado este mes"
            valor={formato(pagadoEsteMes)}
            icono="money"
            tono="dorado"
            movil={esMovil}
          />
        </section>

        <section
          style={{
            ...s.card,
            ...(esMovil ? s.cardMobile : {}),
          }}
        >
          <div
            style={{
              ...s.cardHeader,
              ...(esMovil ? s.cardHeaderMobile : {}),
            }}
          >
            <div>
              <span style={s.sectionEyebrow}>
                CONTROL DE CLIENTES
              </span>

              <h2
                style={{
                  ...s.sectionTitle,
                  ...(esMovil ? s.sectionTitleMobile : {}),
                }}
              >
                Empresas Clientes
              </h2>

              <p style={s.softText}>
                Consulta planes, pagos, vencimientos y registra pagos KONAX.
              </p>
            </div>

            <div style={s.searchBox}>
              <Icon name="search" size={18} />

              <input
                placeholder="Buscar empresa, correo, teléfono, plan o estado..."
                value={filtro}
                onChange={(event) =>
                  setFiltro(event.target.value)
                }
                style={s.searchInput}
              />
            </div>
          </div>

          {empresasFiltradas.length === 0 ? (
            <EmptyState text="No hay empresas para mostrar." />
          ) : esMovil ? (
            <div style={s.mobileCompanyGrid}>
              {empresasFiltradas.map((empresa) => (
                <EmpresaMobileCard
                  key={empresa.id}
                  empresa={empresa}
                  formato={formato}
                  formatoFecha={formatoFecha}
                  activa={estadoServicioActivo(empresa)}
                  onSelect={() => seleccionarEmpresa(empresa)}
                  onPlan={() => {
                    seleccionarEmpresa(empresa, false);
                    window.location.href = "/planes";
                  }}
                  onPayment={() => abrirPago(empresa)}
                />
              ))}
            </div>
          ) : (
            <div style={s.tableScroll}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Empresa</th>
                    <th style={s.th}>Plan</th>
                    <th style={s.th}>Precio</th>
                    <th style={s.th}>Pago</th>
                    <th style={s.th}>Servicio</th>
                    <th style={s.th}>Próxima Facturación</th>
                    <th style={s.th}>Configuración</th>
                    <th style={s.th}>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {empresasFiltradas.map((empresa) => (
                    <tr key={empresa.id}>
                      <td style={s.td}>
                        <strong style={s.companyTableName}>
                          {empresa.nombre}
                        </strong>

                        <span style={s.smallText}>
                          {empresa.correo || "-"}
                        </span>

                        <span style={s.smallText}>
                          {empresa.telefono || "-"}
                        </span>
                      </td>

                      <td style={s.td}>
                        {empresa.plan_nombre || "Sin plan"}
                      </td>

                      <td style={s.td}>
                        {formato(empresa.plan_precio)}
                      </td>

                      <td style={s.td}>
                        <PaymentBadge
                          value={empresa.estado_pago || "Pendiente"}
                        />
                      </td>

                      <td style={s.td}>
                        <ServiceBadge
                          active={estadoServicioActivo(empresa)}
                          value={empresa.estado || "Activo"}
                        />
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
                            style={s.selectButton}
                            onClick={() =>
                              seleccionarEmpresa(empresa)
                            }
                          >
                            Seleccionar
                          </button>

                          <button
                            type="button"
                            style={s.planButton}
                            onClick={() => {
                              seleccionarEmpresa(empresa, false);
                              window.location.href = "/planes";
                            }}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {mostrarReporte && (
          <>
            <section
              style={{
                ...s.card,
                ...(esMovil ? s.cardMobile : {}),
              }}
            >
              <div style={s.reportHeader}>
                <span style={s.sectionEyebrow}>
                  REPORTE FINANCIERO
                </span>

                <h2
                  style={{
                    ...s.sectionTitle,
                    ...(esMovil ? s.sectionTitleMobile : {}),
                  }}
                >
                  Pagos del mes
                </h2>

                <p style={s.softText}>
                  Pagos registrados durante el mes actual.
                </p>
              </div>

              {pagosDelMes.length === 0 ? (
                <EmptyState text="No hay pagos registrados este mes." />
              ) : esMovil ? (
                <div style={s.mobileReportGrid}>
                  {pagosDelMes.map((pago) => (
                    <article key={pago.id} style={s.reportMobileCard}>
                      <div style={s.reportMobileTop}>
                        <div>
                          <span style={s.reportLabel}>EMPRESA</span>
                          <strong style={s.reportTitle}>
                            {pago.empresa_nombre || "-"}
                          </strong>
                        </div>

                        <strong style={s.reportAmount}>
                          {formato(pago.monto)}
                        </strong>
                      </div>

                      <div style={s.reportDetails}>
                        <MobileDetail
                          label="Fecha"
                          value={formatoFecha(
                            pago.fecha_pago || pago.created_at
                          )}
                        />
                        <MobileDetail
                          label="Plan"
                          value={pago.plan_nombre || "-"}
                        />
                        <MobileDetail
                          label="Método"
                          value={pago.metodo_pago || "-"}
                        />
                        <MobileDetail
                          label="Referencia"
                          value={pago.referencia_pago || "-"}
                        />
                        <MobileDetail
                          label="Usuario"
                          value={pago.usuario_registro || "-"}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div style={s.tableScroll}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Fecha</th>
                        <th style={s.th}>Empresa</th>
                        <th style={s.th}>Plan</th>
                        <th style={s.th}>Método</th>
                        <th style={s.th}>Referencia</th>
                        <th style={s.th}>Monto</th>
                        <th style={s.th}>Usuario</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pagosDelMes.map((pago) => (
                        <tr key={pago.id}>
                          <td style={s.td}>
                            {formatoFecha(
                              pago.fecha_pago || pago.created_at
                            )}
                          </td>
                          <td style={s.td}>
                            {pago.empresa_nombre || "-"}
                          </td>
                          <td style={s.td}>
                            {pago.plan_nombre || "-"}
                          </td>
                          <td style={s.td}>
                            {pago.metodo_pago || "-"}
                          </td>
                          <td style={s.td}>
                            {pago.referencia_pago || "-"}
                          </td>
                          <td style={s.td}>
                            {formato(pago.monto)}
                          </td>
                          <td style={s.td}>
                            {pago.usuario_registro || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section
              style={{
                ...s.card,
                ...(esMovil ? s.cardMobile : {}),
              }}
            >
              <div style={s.reportHeader}>
                <span style={s.sectionEyebrow}>
                  AUDITORÍA INTERNA
                </span>

                <h2
                  style={{
                    ...s.sectionTitle,
                    ...(esMovil ? s.sectionTitleMobile : {}),
                  }}
                >
                  Historial KONAX
                </h2>

                <p style={s.softText}>
                  Últimas acciones realizadas sobre empresas, planes y pagos.
                </p>
              </div>

              {bitacora.length === 0 ? (
                <EmptyState text="No hay historial registrado." />
              ) : esMovil ? (
                <div style={s.mobileReportGrid}>
                  {bitacora.map((item) => (
                    <article key={item.id} style={s.auditMobileCard}>
                      <div style={s.auditIcon}>
                        <Icon name="history" size={19} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <span style={s.auditDate}>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : "-"}
                        </span>

                        <strong style={s.auditAction}>
                          {item.accion || "-"}
                        </strong>

                        <span style={s.auditCompany}>
                          {item.empresa_nombre || "-"}
                        </span>

                        <p style={s.auditDescription}>
                          {item.descripcion || "-"}
                        </p>

                        <span style={s.auditUser}>
                          Usuario: {item.usuario || "-"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div style={s.tableScroll}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Fecha</th>
                        <th style={s.th}>Empresa</th>
                        <th style={s.th}>Acción</th>
                        <th style={s.th}>Descripción</th>
                        <th style={s.th}>Usuario</th>
                      </tr>
                    </thead>

                    <tbody>
                      {bitacora.map((item) => (
                        <tr key={item.id}>
                          <td style={s.td}>
                            {item.created_at
                              ? new Date(
                                  item.created_at
                                ).toLocaleString()
                              : "-"}
                          </td>
                          <td style={s.td}>
                            {item.empresa_nombre || "-"}
                          </td>
                          <td style={s.td}>
                            {item.accion || "-"}
                          </td>
                          <td style={s.td}>
                            {item.descripcion || "-"}
                          </td>
                          <td style={s.td}>
                            {item.usuario || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {mostrarPago && (
          <div style={s.modalOverlay}>
            <div
              style={{
                ...s.modal,
                ...(esMovil ? s.modalMobile : {}),
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-pago-konax"
            >
              <div style={s.modalHeader}>
                <div>
                  <span style={s.sectionEyebrow}>
                    REGISTRO FINANCIERO
                  </span>

                  <h2
                    id="titulo-pago-konax"
                    style={s.modalTitle}
                  >
                    Registrar Pago KONAX
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={cerrarPago}
                  style={s.closeModalButton}
                  aria-label="Cerrar"
                >
                  <Icon name="close" size={19} />
                </button>
              </div>

              <div style={s.selectedCompanyBox}>
                <span style={s.selectedCompanyLabel}>
                  EMPRESA
                </span>

                <strong style={s.selectedCompanyName}>
                  {empresaPago?.nombre}
                </strong>
              </div>

              <label style={s.label}>
                Método de pago
              </label>

              <select
                value={metodoPago}
                onChange={(event) =>
                  setMetodoPago(event.target.value)
                }
                style={s.input}
              >
                <option>Yappy</option>
                <option>Transferencia Bancaria</option>
              </select>

              <label style={s.label}>
                Monto pagado
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={montoPago}
                onChange={(event) =>
                  setMontoPago(event.target.value)
                }
                placeholder="Ej. 49"
                style={s.input}
              />

              <label style={s.label}>
                Referencia
              </label>

              <input
                value={referenciaPago}
                onChange={(event) =>
                  setReferenciaPago(event.target.value)
                }
                placeholder="Número de referencia o comprobante"
                style={s.input}
              />

              <label style={s.label}>
                Observación
              </label>

              <textarea
                value={observacionPago}
                onChange={(event) =>
                  setObservacionPago(event.target.value)
                }
                placeholder="Observación opcional"
                style={s.textarea}
              />

              <div
                style={{
                  ...s.modalActions,
                  ...(esMovil ? s.modalActionsMobile : {}),
                }}
              >
                <button
                  type="button"
                  style={s.saveButton}
                  onClick={registrarPago}
                >
                  <Icon name="check" size={18} />
                  Guardar Pago
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

function KPI({
  titulo,
  valor,
  icono,
  tono,
  movil,
}) {
  const tonos = {
    verde: {
      line: "#16834f",
      iconBackground: "#e9f8ef",
      iconColor: "#16834f",
    },
    azul: {
      line: "#2563eb",
      iconBackground: "#eaf2ff",
      iconColor: "#2563eb",
    },
    rojo: {
      line: "#dc3f3f",
      iconBackground: "#fff0f0",
      iconColor: "#c62828",
    },
    amarillo: {
      line: "#d89a19",
      iconBackground: "#fff7df",
      iconColor: "#a56a00",
    },
    dorado: {
      line: "#b7791f",
      iconBackground: "#fff6dc",
      iconColor: "#9a6700",
    },
  };

  const color = tonos[tono] || tonos.verde;

  return (
    <article
      style={{
        ...s.kpiCard,
        ...(movil ? s.kpiCardMobile : {}),
      }}
    >
      <div
        style={{
          ...s.kpiLine,
          background: color.line,
        }}
      />

      <div style={s.kpiTop}>
        <span
          style={{
            ...s.kpiIcon,
            background: color.iconBackground,
            color: color.iconColor,
          }}
        >
          <Icon name={icono} size={19} />
        </span>

        <span style={s.kpiTitle}>
          {titulo}
        </span>
      </div>

      <strong
        style={{
          ...s.kpiValue,
          ...(movil ? s.kpiValueMobile : {}),
        }}
      >
        {valor}
      </strong>
    </article>
  );
}

function EmpresaMobileCard({
  empresa,
  formato,
  formatoFecha,
  activa,
  onSelect,
  onPlan,
  onPayment,
}) {
  return (
    <article style={s.mobileCompanyCard}>
      <div style={s.mobileCompanyTop}>
        <div style={s.mobileCompanyIdentity}>
          <div style={s.mobileCompanyInitial}>
            {String(empresa.nombre || "E")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div style={{ minWidth: 0 }}>
            <strong style={s.mobileCompanyName}>
              {empresa.nombre}
            </strong>

            <span style={s.mobileCompanyContact}>
              {empresa.correo || "-"}
            </span>

            <span style={s.mobileCompanyContact}>
              {empresa.telefono || "-"}
            </span>
          </div>
        </div>

        <ServiceBadge
          active={activa}
          value={empresa.estado || "Activo"}
          mobile
        />
      </div>

      <div style={s.mobileCompanyDetails}>
        <MobileDetail
          label="Plan"
          value={empresa.plan_nombre || "Sin plan"}
        />

        <MobileDetail
          label="Precio"
          value={formato(empresa.plan_precio)}
          accent
        />

        <MobileDetail
          label="Pago"
          value={empresa.estado_pago || "Pendiente"}
        />

        <MobileDetail
          label="Próxima facturación"
          value={formatoFecha(
            empresa.fecha_proxima_facturacion
          )}
        />

        <MobileDetail
          label="Configuración"
          value={
            empresa.configuracion_completa
              ? "Completa"
              : "Pendiente"
          }
        />
      </div>

      <div style={s.mobileCompanyActions}>
        <button
          type="button"
          style={s.mobileSelectButton}
          onClick={onSelect}
        >
          Seleccionar
        </button>

        <button
          type="button"
          style={s.mobilePlanButton}
          onClick={onPlan}
        >
          Plan
        </button>

        <button
          type="button"
          style={s.mobilePaymentButton}
          onClick={onPayment}
        >
          Registrar pago
        </button>
      </div>
    </article>
  );
}

function MobileDetail({
  label,
  value,
  accent = false,
}) {
  return (
    <div style={s.mobileDetail}>
      <span style={s.mobileDetailLabel}>
        {label}
      </span>

      <strong
        style={{
          ...s.mobileDetailValue,
          ...(accent ? s.mobileDetailAccent : {}),
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function ServiceBadge({
  active,
  value,
  mobile = false,
}) {
  return (
    <span
      style={{
        ...s.serviceBadge,
        ...(active
          ? s.serviceBadgeActive
          : s.serviceBadgeSuspended),
        ...(mobile ? s.serviceBadgeMobile : {}),
      }}
    >
      {value}
    </span>
  );
}

function PaymentBadge({ value }) {
  const alDia =
    String(value || "").toLowerCase() === "al día";

  return (
    <span
      style={{
        ...s.paymentBadge,
        ...(alDia
          ? s.paymentBadgeOk
          : s.paymentBadgePending),
      }}
    >
      {value}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div style={s.emptyState}>
      <span style={s.emptyIcon}>
        <Icon name="search" size={23} />
      </span>

      <strong style={s.emptyTitle}>
        Sin resultados
      </strong>

      <span style={s.emptyText}>
        {text}
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
    report: (
      <>
        <path d="M6 2h9l4 4v16H6z" />
        <path d="M14 2v5h5M9 13h6M9 17h6M9 9h2" />
      </>
    ),
    arrowBack: <path d="M19 12H5M12 19l-7-7 7-7" />,
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l3 3 5-6" />
      </>
    ),
    blocked: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M6 6l12 12" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    trend: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 16l4-5 4 3 4-7" />
        <path d="M15 7h4v4" />
      </>
    ),
    money: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M7 9H5v2M17 15h2v-2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    check: <path d="M5 12l4 4L19 6" />,
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

  topActions: {
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "none",
    borderRadius: 11,
    background:
      "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 850,
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 8px 19px rgba(22,131,79,.16)",
  },

  lightAction: {
    minHeight: 43,
    padding: "9px 14px",
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

  darkAction: {
    minHeight: 43,
    padding: "9px 14px",
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

  kpiGrid: {
    marginBottom: 15,
    display: "grid",
    gridTemplateColumns:
      "repeat(6,minmax(0,1fr))",
    gap: 11,
  },

  kpiGridMobile: {
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 10,
  },

  kpiCard: {
    minHeight: 122,
    padding: "15px 14px 14px",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background:
      "linear-gradient(155deg,#ffffff,#f7faf8)",
    boxShadow: "0 10px 28px rgba(15,23,42,.05)",
  },

  kpiCardMobile: {
    minHeight: 118,
    padding: "14px 12px 13px",
    borderRadius: 17,
  },

  kpiLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },

  kpiTop: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  kpiIcon: {
    width: 36,
    height: 36,
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
  },

  kpiTitle: {
    color: "#657169",
    fontSize: 9.5,
    fontWeight: 850,
    lineHeight: 1.25,
  },

  kpiValue: {
    marginTop: "auto",
    paddingTop: 11,
    color: "#152019",
    fontSize: 26,
    lineHeight: 1.05,
    overflowWrap: "anywhere",
  },

  kpiValueMobile: {
    fontSize: 22,
  },

  card: {
    marginBottom: 15,
    padding: 20,
    border: "1px solid #dfe7e2",
    borderRadius: 21,
    background: "#ffffff",
    boxShadow: "0 12px 34px rgba(15,23,42,.05)",
  },

  cardMobile: {
    padding: 14,
    borderRadius: 18,
  },

  cardHeader: {
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },

  cardHeaderMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    alignItems: "stretch",
    gap: 12,
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

  softText: {
    margin: "6px 0 0",
    color: "#758078",
    fontSize: 11,
    lineHeight: 1.45,
  },

  searchBox: {
    minWidth: 300,
    maxWidth: 430,
    minHeight: 43,
    padding: "0 11px",
    display: "grid",
    gridTemplateColumns: "22px minmax(0,1fr)",
    alignItems: "center",
    gap: 7,
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    background: "#ffffff",
    color: "#738079",
  },

  searchInput: {
    minWidth: 0,
    width: "100%",
    height: 41,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#1c2821",
    fontSize: 11,
  },

  tableScroll: {
    overflowX: "auto",
    border: "1px solid #e4ebe6",
    borderRadius: 14,
  },

  table: {
    width: "100%",
    minWidth: 1120,
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

  companyTableName: {
    display: "block",
    marginBottom: 4,
    color: "#17211c",
    fontSize: 11.5,
  },

  smallText: {
    display: "block",
    marginTop: 2,
    color: "#7d8981",
    fontSize: 8.5,
  },

  serviceBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 8.5,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  serviceBadgeActive: {
    background: "#dcfce7",
    color: "#166534",
  },

  serviceBadgeSuspended: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  serviceBadgeMobile: {
    maxWidth: 100,
    fontSize: 7.5,
    whiteSpace: "normal",
    textAlign: "center",
  },

  paymentBadge: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 8.5,
    fontWeight: 900,
  },

  paymentBadgeOk: {
    background: "#e9f8ef",
    color: "#166534",
  },

  paymentBadgePending: {
    background: "#fff7df",
    color: "#946200",
  },

  tableActions: {
    display: "flex",
    gap: 5,
    flexWrap: "wrap",
  },

  selectButton: {
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

  paymentButton: {
    minHeight: 33,
    padding: "7px 9px",
    border: "none",
    borderRadius: 9,
    background: "#b7791f",
    color: "#ffffff",
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
    background:
      "linear-gradient(155deg,#ffffff,#f7faf8)",
    boxShadow: "0 10px 25px rgba(15,23,42,.05)",
  },

  mobileCompanyTop: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) auto",
    alignItems: "start",
    gap: 9,
  },

  mobileCompanyIdentity: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "43px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
  },

  mobileCompanyInitial: {
    width: 43,
    height: 43,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background:
      "linear-gradient(145deg,#e8f7ee,#d9efe2)",
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

  mobileCompanyContact: {
    display: "block",
    marginTop: 2,
    overflow: "hidden",
    color: "#88948d",
    fontSize: 8.5,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mobileCompanyDetails: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 8,
  },

  mobileDetail: {
    minWidth: 0,
    padding: "9px 10px",
    border: "1px solid #e7ece9",
    borderRadius: 11,
    background: "#ffffff",
  },

  mobileDetailLabel: {
    display: "block",
    color: "#7d8981",
    fontSize: 7.5,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  mobileDetailValue: {
    display: "block",
    marginTop: 4,
    overflow: "hidden",
    color: "#27342d",
    fontSize: 10.5,
    lineHeight: 1.25,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mobileDetailAccent: {
    color: "#16834f",
    fontSize: 14,
  },

  mobileCompanyActions: {
    marginTop: 11,
    paddingTop: 11,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 7,
    borderTop: "1px solid #e7ece9",
  },

  mobileSelectButton: {
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

  mobilePaymentButton: {
    gridColumn: "1 / -1",
    minHeight: 42,
    border: "none",
    borderRadius: 10,
    background:
      "linear-gradient(135deg,#b7791f,#9a6700)",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  reportHeader: {
    marginBottom: 14,
  },

  mobileReportGrid: {
    display: "grid",
    gap: 10,
  },

  reportMobileCard: {
    padding: 13,
    border: "1px solid #dfe7e2",
    borderRadius: 15,
    background:
      "linear-gradient(155deg,#ffffff,#f7faf8)",
  },

  reportMobileTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  reportLabel: {
    display: "block",
    color: "#16834f",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: 0.8,
  },

  reportTitle: {
    display: "block",
    marginTop: 3,
    color: "#17211c",
    fontSize: 12,
  },

  reportAmount: {
    color: "#16834f",
    fontSize: 17,
  },

  reportDetails: {
    marginTop: 11,
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 7,
  },

  auditMobileCard: {
    padding: 13,
    display: "grid",
    gridTemplateColumns: "40px minmax(0,1fr)",
    alignItems: "start",
    gap: 10,
    border: "1px solid #dfe7e2",
    borderRadius: 15,
    background:
      "linear-gradient(155deg,#ffffff,#f7faf8)",
  },

  auditIcon: {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#edf8f1",
    color: "#16834f",
  },

  auditDate: {
    display: "block",
    color: "#8a958e",
    fontSize: 7.5,
  },

  auditAction: {
    display: "block",
    marginTop: 3,
    color: "#17211c",
    fontSize: 12,
  },

  auditCompany: {
    display: "block",
    marginTop: 2,
    color: "#16834f",
    fontSize: 9.5,
    fontWeight: 800,
  },

  auditDescription: {
    margin: "6px 0 0",
    color: "#657169",
    fontSize: 9.5,
    lineHeight: 1.45,
  },

  auditUser: {
    display: "block",
    marginTop: 6,
    color: "#88948d",
    fontSize: 8,
  },

  emptyState: {
    minHeight: 170,
    padding: 25,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#7b877f",
    textAlign: "center",
  },

  emptyIcon: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#edf8f1",
    color: "#16834f",
  },

  emptyTitle: {
    marginTop: 10,
    color: "#27342d",
    fontSize: 13,
  },

  emptyText: {
    marginTop: 4,
    fontSize: 9.5,
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 999,
    padding: 20,
    display: "grid",
    placeItems: "center",
    background: "rgba(4,15,9,.64)",
    backdropFilter: "blur(5px)",
  },

  modal: {
    width: 470,
    maxWidth: "100%",
    maxHeight: "calc(100vh - 40px)",
    padding: 22,
    overflowY: "auto",
    boxSizing: "border-box",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 24px 70px rgba(0,0,0,.28)",
  },

  modalMobile: {
    width: "100%",
    padding: 16,
    borderRadius: 18,
  },

  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  modalTitle: {
    margin: 0,
    color: "#17211c",
    fontSize: 21,
  },

  closeModalButton: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    border: "1px solid #dfe7e2",
    borderRadius: 11,
    background: "#ffffff",
    color: "#526057",
    cursor: "pointer",
  },

  selectedCompanyBox: {
    marginTop: 14,
    padding: 11,
    border: "1px solid #dfe7e2",
    borderRadius: 12,
    background: "#f7faf8",
  },

  selectedCompanyLabel: {
    display: "block",
    color: "#16834f",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: 0.8,
  },

  selectedCompanyName: {
    display: "block",
    marginTop: 3,
    color: "#17211c",
    fontSize: 12.5,
  },

  label: {
    display: "block",
    marginTop: 13,
    marginBottom: 5,
    color: "#37433c",
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
    outline: "none",
    background: "#ffffff",
    color: "#17211c",
    fontSize: 11,
  },

  textarea: {
    width: "100%",
    minHeight: 82,
    padding: "10px 11px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: 11,
  },

  modalActions: {
    marginTop: 17,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },

  modalActionsMobile: {
    gridTemplateColumns: "1fr",
  },

  saveButton: {
    minHeight: 43,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "none",
    borderRadius: 10,
    background:
      "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  cancelButton: {
    minHeight: 43,
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    background: "#ffffff",
    color: "#46534b",
    fontSize: 10.5,
    fontWeight: 850,
    cursor: "pointer",
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
