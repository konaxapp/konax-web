"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

const OPCIONES_ADMIN = [
  { nombre: "Resumen", ruta: "/admin" },
  { nombre: "Empresas y demos", ruta: "/centro-gestion" },
  { nombre: "Crear empresa", ruta: "/empresas" },
  { nombre: "Planes", ruta: "/planes" },
  { nombre: "Módulos", ruta: "/modulos" },
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
  "Administración actualizada",
  "Recuperación de contraseña enviada",
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
  const [filtroRapido, setFiltroRapido] = useState("");
  const [eliminandoDemoId, setEliminandoDemoId] = useState("");
  const [cargando, setCargando] = useState(true);

  const [mostrarPago, setMostrarPago] = useState(false);
  const [mostrarAdministrar, setMostrarAdministrar] = useState(false);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false);

  const [empresaAdministrar, setEmpresaAdministrar] = useState(null);
  const [adminEmpresa, setAdminEmpresa] = useState(null);
  const [cargandoAdminEmpresa, setCargandoAdminEmpresa] = useState(false);
  const [guardandoAdministracion, setGuardandoAdministracion] = useState(false);

  const [adminPlanNombre, setAdminPlanNombre] = useState("");
  const [adminPlanTipo, setAdminPlanTipo] = useState("");
  const [adminPrecio, setAdminPrecio] = useState("");
  const [adminProximaFacturacion, setAdminProximaFacturacion] = useState("");
  const [adminEstadoServicio, setAdminEstadoServicio] = useState("Activo");
  const [adminEstadoPago, setAdminEstadoPago] = useState("Al día");

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

  function fechaLocal(fecha) {
    if (!fecha) return null;

    const [year, month, day] = String(fecha)
      .slice(0, 10)
      .split("-")
      .map(Number);

    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  function esDemoEmpresa(empresa) {
    const suscripcion = normalizar(empresa.estado_suscripcion);

    // Si ya fue convertida a suscripción activa, nunca se trata como demo.
    if (["activo", "activa"].includes(suscripcion)) {
      return false;
    }

    return (
      [
        "prueba",
        "prueba_vencida",
        "pendiente_inicio_prueba",
      ].includes(suscripcion) ||
      empresa.es_prueba === true
    );
  }

  function esDemoVencido(empresa) {
    if (!esDemoEmpresa(empresa)) return false;

    if (normalizar(empresa.estado_suscripcion) === "prueba_vencida") {
      return true;
    }

    const fin = fechaLocal(empresa.fecha_fin_prueba);

    if (!fin) return false;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return fin.getTime() < hoy.getTime();
  }

  function esClientePagoActivo(empresa) {
    if (!estadoServicioActivo(empresa) || esDemoEmpresa(empresa)) {
      return false;
    }

    const suscripcion = normalizar(empresa.estado_suscripcion);

    if (
      [
        "prueba_vencida",
        "pendiente_activacion",
        "cancelado",
      ].includes(suscripcion)
    ) {
      return false;
    }

    if (["activo", "activa"].includes(suscripcion)) {
      return true;
    }

    // Compatibilidad con clientes antiguos que todavía no tengan
    // estado_suscripcion pero sí un pago real registrado.
    return Boolean(empresa.fecha_ultimo_pago);
  }

  function etiquetaSuscripcion(empresa) {
    const suscripcion = normalizar(empresa.estado_suscripcion);

    if (esDemoVencido(empresa)) return "Demo vencido";
    if (suscripcion === "prueba") return "Demo activo";
    if (suscripcion === "pendiente_inicio_prueba") return "Demo pendiente";
    if (esClientePagoActivo(empresa)) return "Cliente pago";
    if (suscripcion === "cancelado") return "Cancelado";

    return empresa.estado_suscripcion || "Sin definir";
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

      // Los demos se controlan con fecha_fin_prueba / estado_suscripcion.
      // No deben suspenderse por la lógica normal de facturación.
      if (esDemoEmpresa(empresa)) continue;

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

  function aplicarFiltroRapido(tipo) {
    setFiltro("");
    setFiltroRapido(tipo);

    if (tipo === "archivadas") {
      setMostrarArchivadas(true);
    } else {
      setMostrarArchivadas(false);
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById("empresas-listado")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  function limpiarFiltros() {
    setFiltro("");
    setFiltroRapido("");
    setMostrarArchivadas(false);
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

  async function administrarEmpresa(empresa) {
    seleccionarEmpresa(empresa);

    setEmpresaAdministrar(empresa);
    setAdminPlanNombre(empresa.plan_nombre || "");
    setAdminPlanTipo(empresa.plan_tipo || "Mensual");
    setAdminPrecio(
      empresa.plan_precio !== null &&
      empresa.plan_precio !== undefined
        ? String(empresa.plan_precio)
        : ""
    );
    setAdminProximaFacturacion(
      empresa.fecha_proxima_facturacion
        ? String(empresa.fecha_proxima_facturacion).slice(0, 10)
        : ""
    );
    setAdminEstadoServicio(
      normalizar(empresa.estado) === "suspendido"
        ? "Suspendido"
        : "Activo"
    );
    setAdminEstadoPago(
      empresa.estado_pago || "Al día"
    );

    setAdminEmpresa(null);
    setMostrarAdministrar(true);
    setCargandoAdminEmpresa(true);

    const { data, error } = await supabase
      .from("usuarios")
      .select("id,nombre,correo,rol,estado,empresa_id")
      .eq("empresa_id", empresa.id);

    if (error) {
      console.error(
        "No se pudo cargar el administrador:",
        error.message
      );
      setCargandoAdminEmpresa(false);
      return;
    }

    const usuarios = data || [];

    const administrador =
      usuarios.find((usuario) => {
        const rol = normalizar(usuario.rol);

        return [
          "administrador",
          "admin",
          "superadmin",
          "propietario",
          "dueno",
          "dueño",
        ].includes(rol);
      }) ||
      usuarios[0] ||
      null;

    setAdminEmpresa(administrador);
    setCargandoAdminEmpresa(false);
  }

  function cerrarAdministrar() {
    setMostrarAdministrar(false);
    setEmpresaAdministrar(null);
    setAdminEmpresa(null);
    setCargandoAdminEmpresa(false);
    setGuardandoAdministracion(false);
  }

  async function guardarAdministracionEmpresa() {
    if (!empresaAdministrar?.id) return;

    const precio = Number(adminPrecio);

    if (
      adminPrecio === "" ||
      Number.isNaN(precio) ||
      precio < 0
    ) {
      alert("Ingrese un precio válido.");
      return;
    }

    if (!adminProximaFacturacion) {
      alert("Seleccione la próxima fecha de facturación.");
      return;
    }

    setGuardandoAdministracion(true);

    try {
      const estadoServicio =
        adminEstadoServicio === "Suspendido"
          ? "Suspendido"
          : "Activo";

      const { error } = await supabase
        .from("empresas")
        .update({
          plan_nombre:
            adminPlanNombre.trim() ||
            empresaAdministrar.plan_nombre ||
            "",
          plan_tipo:
            adminPlanTipo.trim() ||
            empresaAdministrar.plan_tipo ||
            "Mensual",
          plan_precio: precio,
          fecha_proxima_facturacion:
            adminProximaFacturacion,
          estado: estadoServicio,
          estado_plan: estadoServicio,
          estado_pago: adminEstadoPago,
        })
        .eq("id", empresaAdministrar.id);

      if (error) {
        alert(
          "No se pudo actualizar la empresa: " +
            error.message
        );
        return;
      }

      const usuario =
        localStorage.getItem("adminKonaxNombre") ||
        "KONAX";

      await supabase.from("bitacora_konax").insert([
        {
          empresa_id: empresaAdministrar.id,
          empresa_nombre:
            empresaAdministrar.nombre || "",
          accion: "Administración actualizada",
          descripcion:
            `Precio: ${formato(precio)} · ` +
            `Próxima facturación: ${formatoFecha(
              adminProximaFacturacion
            )} · ` +
            `Servicio: ${estadoServicio} · ` +
            `Pago: ${adminEstadoPago}.`,
          estado_anterior:
            empresaAdministrar.estado || null,
          estado_nuevo: estadoServicio,
          usuario,
        },
      ]);

      alert("Empresa actualizada correctamente.");
      cerrarAdministrar();
      await cargarDatos();
    } finally {
      setGuardandoAdministracion(false);
    }
  }

  async function enviarRecuperacionPassword() {
    const correo =
      adminEmpresa?.correo?.trim() || "";

    if (!correo) {
      alert(
        "No encontramos un correo de administrador para esta empresa."
      );
      return;
    }

    const redirectTo =
      `${window.location.origin}/restablecer-password`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        correo,
        { redirectTo }
      );

    if (error) {
      alert(
        "No se pudo enviar el enlace de recuperación: " +
          error.message
      );
      return;
    }

    const usuario =
      localStorage.getItem("adminKonaxNombre") ||
      "KONAX";

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: empresaAdministrar.id,
        empresa_nombre:
          empresaAdministrar.nombre || "",
        accion:
          "Recuperación de contraseña enviada",
        descripcion:
          `Se envió un enlace de recuperación a ${correo}.`,
        estado_anterior:
          empresaAdministrar.estado || null,
        estado_nuevo:
          empresaAdministrar.estado || null,
        usuario,
      },
    ]);

    alert(
      "Enlace de recuperación enviado al correo del administrador."
    );
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

  async function eliminarDemoVencido(empresa) {
    if (!empresa?.id || eliminandoDemoId) return;

    if (!esDemoVencido(empresa)) {
      alert(
        "Solo se puede eliminar desde aquí un demo cuyo período de prueba ya terminó."
      );
      return;
    }

    const confirmacion = window.prompt(
      `Vas a eliminar definitivamente el demo "${empresa.nombre}" y todos sus datos asociados.\n\nEscribe ELIMINAR para confirmar.`
    );

    if (confirmacion !== "ELIMINAR") {
      return;
    }

    setEliminandoDemoId(empresa.id);

    try {
      const { data, error } = await supabase.rpc(
        "eliminar_empresa_demo_seguro",
        {
          p_empresa_id: empresa.id,
          p_confirmacion: empresa.nombre || "",
        }
      );

      if (error) {
        alert(
          "No se pudo eliminar el demo: " +
            error.message +
            "\n\nLa empresa no fue eliminada."
        );
        return;
      }

      alert(
        data?.message ||
          `Demo "${empresa.nombre}" eliminado correctamente.`
      );

      if (
        localStorage.getItem("empresaAdminCreadaId") ===
        String(empresa.id)
      ) {
        localStorage.removeItem("empresaAdminCreadaId");
        localStorage.removeItem("empresaAdminCreadaNombre");
      }

      await cargarDatos();
    } finally {
      setEliminandoDemoId("");
    }
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
        estado_suscripcion: "activo",
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

  const clientesPagoActivos =
    empresasActivasVisibles.filter(esClientePagoActivo);

  const demosVisibles =
    empresasActivasVisibles.filter(esDemoEmpresa);

  const demosVencidos =
    demosVisibles.filter(esDemoVencido);

  const empresasSuspendidasLista =
    empresasActivasVisibles.filter(
      (empresa) =>
        normalizar(empresa.estado) === "suspendido" ||
        normalizar(empresa.estado_plan) === "suspendido"
    );

  const proximosVencerEmpresas =
    empresasActivasVisibles.filter((empresa) => {
      const dias = obtenerDiasParaVencer(
        empresa.fecha_proxima_facturacion
      );

      return (
        dias !== null &&
        dias >= 0 &&
        dias <= 7 &&
        estadoServicioActivo(empresa)
      );
    });

  const empresasActivas = clientesPagoActivos.length;
  const empresasSuspendidas = empresasSuspendidasLista.length;
  const proximosVencer = proximosVencerEmpresas.length;

  // Ingreso mensual = precio de los clientes realmente convertidos a plan.
  // Los demos no entran en este cálculo aunque tengan un precio cargado.
  const ingresosEstimados = clientesPagoActivos.reduce(
    (sum, empresa) =>
      sum + Number(empresa.plan_precio || 0),
    0
  );

  const hoyFecha = new Date();
  const mesActual = hoyFecha.getMonth();
  const anioActual = hoyFecha.getFullYear();

  const idsEmpresasExistentes = new Set(
    empresasActivasVisibles.map((empresa) =>
      String(empresa.id)
    )
  );

  const pagosDelMes = pagos.filter((pago) => {
    const fecha = pago.fecha_pago || pago.created_at;

    if (!fecha) return false;

    if (
      !idsEmpresasExistentes.has(
        String(pago.empresa_id)
      )
    ) {
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

  const idsPagaronEsteMes = new Set(
    pagosDelMes.map((pago) => String(pago.empresa_id))
  );

  const empresasBase = mostrarArchivadas
    ? empresasArchivadas
    : empresasActivasVisibles;

  const empresasFiltradas = empresasBase.filter((empresa) => {
    const texto = normalizar(filtro);
    let coincideRapido = true;

    if (filtroRapido === "clientes") {
      coincideRapido = esClientePagoActivo(empresa);
    }

    if (filtroRapido === "demos") {
      coincideRapido = esDemoEmpresa(empresa);
    }

    if (filtroRapido === "suspendidos") {
      coincideRapido =
        normalizar(empresa.estado) === "suspendido" ||
        normalizar(empresa.estado_plan) === "suspendido";
    }

    if (filtroRapido === "vencen7") {
      const dias = obtenerDiasParaVencer(
        empresa.fecha_proxima_facturacion
      );

      coincideRapido =
        dias !== null &&
        dias >= 0 &&
        dias <= 7 &&
        estadoServicioActivo(empresa);
    }

    if (filtroRapido === "pagados_mes") {
      coincideRapido = idsPagaronEsteMes.has(
        String(empresa.id)
      );
    }

    if (filtroRapido === "archivadas") {
      coincideRapido = Boolean(empresa.archivada);
    }

    if (!coincideRapido) {
      return false;
    }

    if (!texto) return true;

    const contenido = normalizar(
      [
        empresa.nombre,
        empresa.correo,
        empresa.telefono,
        empresa.plan_nombre,
        empresa.estado,
        empresa.estado_suscripcion,
        empresa.tipo_negocio,
      ]
        .filter(Boolean)
        .join(" ")
    );

    return contenido.includes(texto);
  });

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
            ...s.adminNav,
            ...(esMovil ? s.adminNavMobile : {}),
          }}
        >
          <button
            type="button"
            onClick={limpiarFiltros}
            style={s.navButton}
          >
            Resumen
          </button>

          <button
            type="button"
            onClick={() => aplicarFiltroRapido("clientes")}
            style={s.navButton}
          >
            Clientes
          </button>

          <button
            type="button"
            onClick={() => aplicarFiltroRapido("demos")}
            style={s.navButton}
          >
            Demos
          </button>

          <button
            type="button"
            onClick={() =>
              setMostrarReporte((actual) => !actual)
            }
            style={s.navButtonPrimary}
          >
            {mostrarReporte
              ? "Ocultar pagos"
              : "Pagos y actividad"}
          </button>

          <Link href="/empresas" style={s.navLink}>
            + Nueva empresa
          </Link>

          <Link href="/admin" style={s.navLinkDark}>
            Panel maestro
          </Link>
        </section>

        <section
          style={{
            ...s.kpiGrid,
            ...(esMovil ? s.kpiGridMobile : {}),
          }}
        >
          <KPI
            titulo="Clientes activos"
            valor={empresasActivas}
            detalle="Planes que sí generan ingreso"
            tono="verde"
            icono="✓"
            activo={filtroRapido === "clientes"}
            onClick={() => aplicarFiltroRapido("clientes")}
          />

          <KPI
            titulo="Demos"
            valor={demosVisibles.length}
            detalle={`${demosVencidos.length} vencido${
              demosVencidos.length === 1 ? "" : "s"
            }`}
            tono="azul"
            icono="◷"
            activo={filtroRapido === "demos"}
            onClick={() => aplicarFiltroRapido("demos")}
          />

          <KPI
            titulo="Suspendidos"
            valor={empresasSuspendidas}
            detalle="Servicio detenido"
            tono="rojo"
            icono="!"
            activo={filtroRapido === "suspendidos"}
            onClick={() => aplicarFiltroRapido("suspendidos")}
          />

          <KPI
            titulo="Vencen en 7 días"
            valor={proximosVencer}
            detalle="Abrir empresas próximas"
            tono="amarillo"
            icono="7"
            activo={filtroRapido === "vencen7"}
            onClick={() => aplicarFiltroRapido("vencen7")}
          />

          <KPI
            titulo="Ingreso mensual"
            valor={formato(ingresosEstimados)}
            detalle="Suma del precio de clientes pagos"
            tono="verde"
            icono="$"
            activo={filtroRapido === "clientes"}
            onClick={() => aplicarFiltroRapido("clientes")}
          />

          <KPI
            titulo="Pagado este mes"
            valor={formato(pagadoEsteMes)}
            detalle={`${idsPagaronEsteMes.size} empresa${
              idsPagaronEsteMes.size === 1 ? "" : "s"
            }`}
            tono="dorado"
            icono="↓"
            activo={filtroRapido === "pagados_mes"}
            onClick={() => aplicarFiltroRapido("pagados_mes")}
          />

          <KPI
            titulo="Archivadas"
            valor={empresasArchivadas.length}
            detalle="Fuera de la cartera"
            tono="gris"
            icono="□"
            activo={filtroRapido === "archivadas"}
            onClick={() => aplicarFiltroRapido("archivadas")}
          />
        </section>

        <section id="empresas-listado" style={s.card}>
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

          {filtroRapido && (
            <div style={s.activeFilterBar}>
              <div>
                <span style={s.activeFilterLabel}>FILTRO ACTIVO</span>
                <strong style={s.activeFilterValue}>
                  {filtroRapido === "clientes"
                    ? "Clientes activos"
                    : filtroRapido === "demos"
                    ? "Demos"
                    : filtroRapido === "suspendidos"
                    ? "Suspendidos"
                    : filtroRapido === "vencen7"
                    ? "Vencen en 7 días"
                    : filtroRapido === "pagados_mes"
                    ? "Pagaron este mes"
                    : "Archivadas"}
                </strong>
              </div>

              <button
                type="button"
                onClick={limpiarFiltros}
                style={s.clearFilterButton}
              >
                Ver todas
              </button>
            </div>
          )}

          {empresasFiltradas.length === 0 ? (
            <EmptyState
              text={
                mostrarArchivadas
                  ? "No hay empresas archivadas."
                  : "No hay empresas activas para mostrar."
              }
            />
          ) : (
            <div
              style={{
                ...s.companyGrid,
                ...(esMovil ? s.companyGridMobile : {}),
              }}
            >
              {empresasFiltradas.map((empresa) => {
                const esDemo = esDemoEmpresa(empresa);
                const demoVencido = esDemoVencido(empresa);
                const fechaClave = esDemo
                  ? empresa.fecha_fin_prueba
                  : empresa.fecha_proxima_facturacion;

                return (
                  <article key={empresa.id} style={s.companyCard}>
                    <div style={s.companyAccent} />

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

                          <div style={s.companyContactRow}>
                            <span style={s.companyContact}>
                              {empresa.correo || "Sin correo"}
                            </span>

                            <span style={s.companyContactDot}>•</span>

                            <span style={s.companyContact}>
                              {empresa.telefono || "Sin teléfono"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={s.badgeStack}>
                        <SubscriptionBadge
                          value={etiquetaSuscripcion(empresa)}
                        />

                        <ServiceBadge
                          active={estadoServicioActivo(empresa)}
                          value={
                            empresa.archivada
                              ? "Archivada"
                              : empresa.estado || "Activo"
                          }
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        ...s.planSummary,
                        ...(esMovil ? s.planSummaryMobile : {}),
                      }}
                    >
                      <div style={s.planSummaryMain}>
                        <span style={s.planSummaryLabel}>PLAN ACTUAL</span>
                        <strong style={s.planSummaryName}>
                          {empresa.plan_nombre || "Sin plan asignado"}
                        </strong>
                        <span style={s.planSummaryType}>
                          {empresa.plan_tipo || "Mensual"}
                        </span>
                      </div>

                      <div style={s.planPriceBox}>
                        <span style={s.planPriceLabel}>PRECIO</span>
                        <strong style={s.planPriceValue}>
                          {formato(empresa.plan_precio)}
                        </strong>
                        <span style={s.planPricePeriod}>por mes</span>
                      </div>
                    </div>

                    <div
                      style={{
                        ...s.detailsGrid,
                        ...(esMovil ? s.detailsGridMobile : {}),
                      }}
                    >
                      <Detail
                        label="Suscripción"
                        value={etiquetaSuscripcion(empresa)}
                      />

                      <Detail
                        label="Estado de pago"
                        value={empresa.estado_pago || "Pendiente"}
                      />

                      <Detail
                        label={esDemo ? "Fin del demo" : "Próxima facturación"}
                        value={formatoFecha(fechaClave)}
                      />

                      <Detail
                        label="Vencimiento"
                        value={
                          esDemo
                            ? demoVencido
                              ? "Demo vencido"
                              : textoVencimiento(empresa.fecha_fin_prueba)
                            : textoVencimiento(
                                empresa.fecha_proxima_facturacion
                              )
                        }
                        accent={
                          demoVencido ||
                          obtenerDiasParaVencer(fechaClave) <= 7
                        }
                      />

                      <Detail
                        label="Tipo de negocio"
                        value={empresa.tipo_negocio || "-"}
                      />

                      <Detail
                        label="Estado del servicio"
                        value={empresa.estado || "-"}
                      />
                    </div>

                    {!empresa.archivada ? (
                      <div
                        style={{
                          ...s.actionsGrid,
                          ...(esMovil ? s.actionsGridMobile : {}),
                        }}
                      >
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

                        {demoVencido && (
                          <button
                            type="button"
                            style={s.deleteDemoButton}
                            onClick={() => eliminarDemoVencido(empresa)}
                            disabled={
                              eliminandoDemoId === String(empresa.id)
                            }
                          >
                            {eliminandoDemoId === String(empresa.id)
                              ? "Eliminando..."
                              : "Eliminar demo vencido"}
                          </button>
                        )}
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
                );
              })}
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

        {mostrarAdministrar && (
          <div style={s.modalOverlay}>
            <div
              style={{
                ...s.adminModal,
                ...(esMovil ? s.adminModalMobile : {}),
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-administrar-empresa"
            >
              <div style={s.adminModalHeader}>
                <div>
                  <span style={s.sectionEyebrow}>
                    ADMINISTRACIÓN DE CLIENTE
                  </span>

                  <h2
                    id="titulo-administrar-empresa"
                    style={s.adminModalTitle}
                  >
                    {empresaAdministrar?.nombre}
                  </h2>

                  <p style={s.adminModalSubtitle}>
                    Ajusta condiciones comerciales, facturación,
                    servicio y acceso del administrador.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarAdministrar}
                  style={s.closeButton}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              <div style={s.adminSummaryGrid}>
                <div style={s.adminSummaryBox}>
                  <span style={s.adminSummaryLabel}>
                    NEGOCIO
                  </span>

                  <strong style={s.adminSummaryValue}>
                    {empresaAdministrar?.tipo_negocio || "-"}
                  </strong>
                </div>

                <div style={s.adminSummaryBox}>
                  <span style={s.adminSummaryLabel}>
                    ESTADO ACTUAL
                  </span>

                  <strong style={s.adminSummaryValue}>
                    {empresaAdministrar?.estado || "-"}
                  </strong>
                </div>
              </div>

              <div style={s.adminSection}>
                <div style={s.adminSectionHeading}>
                  <strong style={s.adminSectionTitle}>
                    Condiciones comerciales
                  </strong>

                  <span style={s.adminSectionText}>
                    Aquí puedes manejar un precio piloto sin cambiar
                    la estructura técnica de módulos.
                  </span>
                </div>

                <div style={s.adminFormGrid}>
                  <div>
                    <label style={s.label}>
                      Nombre del plan
                    </label>

                    <input
                      value={adminPlanNombre}
                      onChange={(event) =>
                        setAdminPlanNombre(
                          event.target.value
                        )
                      }
                      placeholder="Ej. KONAX Salón de Belleza"
                      style={s.input}
                    />
                  </div>

                  <div>
                    <label style={s.label}>
                      Tipo comercial
                    </label>

                    <input
                      value={adminPlanTipo}
                      onChange={(event) =>
                        setAdminPlanTipo(
                          event.target.value
                        )
                      }
                      placeholder="Ej. Piloto, Mensual"
                      style={s.input}
                    />
                  </div>

                  <div>
                    <label style={s.label}>
                      Precio mensual
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={adminPrecio}
                      onChange={(event) =>
                        setAdminPrecio(
                          event.target.value
                        )
                      }
                      style={s.input}
                    />
                  </div>

                  <div>
                    <label style={s.label}>
                      Próxima facturación
                    </label>

                    <input
                      type="date"
                      value={adminProximaFacturacion}
                      onChange={(event) =>
                        setAdminProximaFacturacion(
                          event.target.value
                        )
                      }
                      style={s.input}
                    />
                  </div>

                  <div>
                    <label style={s.label}>
                      Estado del servicio
                    </label>

                    <select
                      value={adminEstadoServicio}
                      onChange={(event) =>
                        setAdminEstadoServicio(
                          event.target.value
                        )
                      }
                      style={s.input}
                    >
                      <option value="Activo">
                        Activo
                      </option>
                      <option value="Suspendido">
                        Suspendido
                      </option>
                    </select>
                  </div>

                  <div>
                    <label style={s.label}>
                      Estado del pago
                    </label>

                    <select
                      value={adminEstadoPago}
                      onChange={(event) =>
                        setAdminEstadoPago(
                          event.target.value
                        )
                      }
                      style={s.input}
                    >
                      <option value="Al día">
                        Al día
                      </option>
                      <option value="Pendiente">
                        Pendiente
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={s.adminSection}>
                <div style={s.adminSectionHeading}>
                  <strong style={s.adminSectionTitle}>
                    Acceso del administrador
                  </strong>

                  <span style={s.adminSectionText}>
                    KONAX no muestra ni conoce la contraseña del cliente.
                    Solo se envía un enlace para que la persona cree una nueva.
                  </span>
                </div>

                {cargandoAdminEmpresa ? (
                  <div style={s.adminUserBox}>
                    Buscando administrador...
                  </div>
                ) : adminEmpresa ? (
                  <div style={s.adminUserBox}>
                    <div style={{ minWidth: 0 }}>
                      <span style={s.adminSummaryLabel}>
                        ADMINISTRADOR PRINCIPAL
                      </span>

                      <strong style={s.adminUserName}>
                        {adminEmpresa.nombre || "Administrador"}
                      </strong>

                      <span style={s.adminUserEmail}>
                        {adminEmpresa.correo || "-"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={enviarRecuperacionPassword}
                      style={s.passwordButton}
                    >
                      Enviar enlace para cambiar contraseña
                    </button>
                  </div>
                ) : (
                  <div style={s.adminWarningBox}>
                    No encontramos un usuario administrador vinculado
                    a esta empresa. Puedes revisarlo desde Usuarios.
                  </div>
                )}
              </div>

              <div
                style={{
                  ...s.modalActions,
                  ...(esMovil
                    ? { gridTemplateColumns: "1fr" }
                    : {}),
                }}
              >
                <button
                  type="button"
                  style={s.saveButton}
                  onClick={guardarAdministracionEmpresa}
                  disabled={guardandoAdministracion}
                >
                  {guardandoAdministracion
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>

                <button
                  type="button"
                  style={s.cancelButton}
                  onClick={cerrarAdministrar}
                  disabled={guardandoAdministracion}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
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

function KPI({
  titulo,
  valor,
  tono,
  icono,
  detalle,
  onClick,
  activo = false,
}) {
  const tonos = {
    verde: ["#16834f", "#e9f8ef"],
    rojo: ["#c62828", "#fff0f0"],
    amarillo: ["#a56a00", "#fff7df"],
    dorado: ["#9a6700", "#fff6dc"],
    gris: ["#526057", "#f1f5f2"],
    azul: ["#2563eb", "#edf4ff"],
  };

  const [color, fondo] = tonos[tono] || tonos.verde;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...s.kpiCard,
        ...(activo
          ? {
              borderColor: color,
              boxShadow: `0 16px 38px ${color}20`,
            }
          : {}),
      }}
    >
      <div style={s.kpiTopLine}>
        <span
          style={{
            ...s.kpiIcon,
            color,
            background: fondo,
          }}
        >
          {icono || "•"}
        </span>

        <span
          style={{
            ...s.kpiStatusDot,
            background: color,
          }}
        />
      </div>

      <span style={s.kpiTitle}>{titulo}</span>

      <strong style={s.kpiValue}>{valor}</strong>

      {detalle && (
        <span style={s.kpiDetail}>{detalle}</span>
      )}

      <div
        style={{
          ...s.kpiTint,
          background: fondo,
        }}
      />
    </button>
  );
}

function Detail({ label, value, accent = false }) {
  return (
    <div
      style={{
        ...s.detailBox,
        ...(accent ? s.detailBoxAccent : {}),
      }}
    >
      <span style={s.detailLabel}>{label}</span>
      <strong
        style={{
          ...s.detailValue,
          ...(accent ? { color: "#9a6700" } : {}),
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

function SubscriptionBadge({ value }) {
  const valor = normalizar(value);

  let estilo = s.subscriptionBadgeNeutral;

  if (valor === "cliente pago") {
    estilo = s.subscriptionBadgePaid;
  } else if (valor === "demo vencido") {
    estilo = s.subscriptionBadgeExpired;
  } else if (
    valor === "demo activo" ||
    valor === "demo pendiente"
  ) {
    estilo = s.subscriptionBadgeDemo;
  }

  return (
    <span
      style={{
        ...s.subscriptionBadge,
        ...estilo,
      }}
    >
      {value || "Sin suscripción"}
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
  adminNav: {
    marginBottom: 14,
    padding: 8,
    display: "flex",
    justifyContent: "flex-end",
    gap: 7,
    flexWrap: "wrap",
    border: "1px solid #dfe7e2",
    borderRadius: 16,
    background: "rgba(255,255,255,.88)",
    boxShadow: "0 10px 28px rgba(15,23,42,.045)",
  },
  adminNavMobile: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
  },
  navButton: {
    minHeight: 42,
    padding: "9px 14px",
    border: "1px solid #dce5df",
    borderRadius: 11,
    background: "#fff",
    color: "#243129",
    fontWeight: 850,
    cursor: "pointer",
  },
  navButtonPrimary: {
    minHeight: 42,
    padding: "9px 14px",
    border: "none",
    borderRadius: 11,
    background: "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  navLink: {
    minHeight: 42,
    padding: "9px 14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #cbd9d0",
    borderRadius: 11,
    background: "#f8fbf9",
    color: "#16834f",
    fontWeight: 900,
    textDecoration: "none",
  },
  navLinkDark: {
    minHeight: 42,
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
    gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
    gap: 11,
  },
  kpiGridMobile: {
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  },
  kpiCard: {
    minHeight: 148,
    padding: 16,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    border: "1px solid #dfe7e2",
    borderRadius: 19,
    background:
      "linear-gradient(155deg,#ffffff,#f8fbf9)",
    boxShadow:
      "0 11px 28px rgba(15,23,42,.055)",
    cursor: "pointer",
  },
  kpiTopLine: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiIcon: {
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    fontSize: 13,
    fontWeight: 950,
  },
  kpiStatusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
  kpiTitle: {
    marginTop: 14,
    position: "relative",
    zIndex: 2,
    color: "#657169",
    fontSize: 10,
    fontWeight: 900,
  },
  kpiValue: {
    marginTop: 5,
    position: "relative",
    zIndex: 2,
    color: "#17211c",
    fontSize: 27,
    lineHeight: 1.05,
  },
  kpiDetail: {
    marginTop: "auto",
    paddingTop: 10,
    position: "relative",
    zIndex: 2,
    color: "#89948d",
    fontSize: 8.5,
    lineHeight: 1.3,
  },
  kpiTint: {
    width: 92,
    height: 92,
    position: "absolute",
    right: -34,
    bottom: -38,
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
  activeFilterBar: {
    marginBottom: 14,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    border: "1px solid #cfe6d8",
    borderRadius: 12,
    background: "#f1faf5",
  },
  activeFilterLabel: {
    display: "block",
    color: "#6c7b72",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: 0.8,
  },
  activeFilterValue: {
    display: "block",
    marginTop: 2,
    color: "#14683e",
    fontSize: 11,
  },
  clearFilterButton: {
    minHeight: 34,
    padding: "7px 10px",
    border: "1px solid #bddfca",
    borderRadius: 9,
    background: "#fff",
    color: "#14683e",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
  },
  companyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    alignItems: "start",
    gap: 18,
  },
  companyGridMobile: {
    gridTemplateColumns: "1fr",
  },
  companyCard: {
    width: "100%",
    minWidth: 0,
    padding: 20,
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    border: "1px solid #dce7e0",
    borderRadius: 24,
    background:
      "linear-gradient(180deg,#ffffff 0%,#fbfdfc 55%,#f6faf8 100%)",
    boxShadow:
      "0 18px 44px rgba(15,23,42,.075), 0 2px 8px rgba(15,23,42,.035)",
  },
  companyAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background:
      "linear-gradient(90deg,#16834f 0%,#45b97c 55%,#d9efe2 100%)",
  },
  companyTop: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: 14,
    alignItems: "start",
    paddingTop: 3,
  },
  companyIdentity: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "58px minmax(0,1fr)",
    gap: 13,
    alignItems: "center",
  },
  companyInitial: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background:
      "linear-gradient(145deg,#edf9f2 0%,#dff2e7 100%)",
    border: "1px solid #d2e9dc",
    color: "#137347",
    fontSize: 21,
    fontWeight: 950,
    boxShadow: "0 8px 18px rgba(22,131,79,.08)",
  },
  companyName: {
    display: "block",
    color: "#17221c",
    fontSize: 17,
    fontWeight: 900,
    lineHeight: 1.2,
    overflowWrap: "anywhere",
  },
  companyContactRow: {
    marginTop: 7,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  companyContact: {
    color: "#748178",
    fontSize: 10.5,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },
  companyContactDot: {
    color: "#a9b4ad",
    fontSize: 10,
  },
  badgeStack: {
    display: "flex",
    alignItems: "flex-end",
    flexDirection: "column",
    gap: 7,
  },
  subscriptionBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 29,
    padding: "5px 10px",
    boxSizing: "border-box",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 900,
    whiteSpace: "nowrap",
    border: "1px solid transparent",
  },
  subscriptionBadgePaid: {
    background: "#eaf8ef",
    color: "#14683e",
    borderColor: "#cfe8d8",
  },
  subscriptionBadgeDemo: {
    background: "#eef4ff",
    color: "#2352b8",
    borderColor: "#d8e4ff",
  },
  subscriptionBadgeExpired: {
    background: "#fff0f0",
    color: "#b42318",
    borderColor: "#f1cece",
  },
  subscriptionBadgeNeutral: {
    background: "#f2f5f3",
    color: "#526057",
    borderColor: "#e2e8e4",
  },
  serviceBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 29,
    padding: "5px 10px",
    boxSizing: "border-box",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 900,
    whiteSpace: "nowrap",
    border: "1px solid transparent",
  },
  serviceBadgeActive: {
    background: "#dcfce7",
    color: "#166534",
    borderColor: "#c9ebd5",
  },
  serviceBadgeSuspended: {
    background: "#fee2e2",
    color: "#991b1b",
    borderColor: "#f3caca",
  },
  planSummary: {
    marginTop: 17,
    padding: 15,
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    alignItems: "center",
    gap: 15,
    border: "1px solid #e1e9e4",
    borderRadius: 17,
    background:
      "linear-gradient(135deg,#f7fbf8 0%,#ffffff 65%)",
  },
  planSummaryMobile: {
    gridTemplateColumns: "1fr",
  },
  planSummaryMain: {
    minWidth: 0,
  },
  planSummaryLabel: {
    display: "block",
    color: "#16834f",
    fontSize: 7.5,
    fontWeight: 950,
    letterSpacing: 1,
  },
  planSummaryName: {
    display: "block",
    marginTop: 5,
    color: "#1c2922",
    fontSize: 13.5,
    fontWeight: 900,
    lineHeight: 1.3,
  },
  planSummaryType: {
    display: "block",
    marginTop: 4,
    color: "#7c8981",
    fontSize: 9,
  },
  planPriceBox: {
    minWidth: 108,
    padding: "10px 12px",
    textAlign: "right",
    borderRadius: 13,
    background: "#edf8f2",
    border: "1px solid #d5eadc",
  },
  planPriceLabel: {
    display: "block",
    color: "#6c7b72",
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: 0.8,
  },
  planPriceValue: {
    display: "block",
    marginTop: 3,
    color: "#117447",
    fontSize: 20,
    lineHeight: 1.1,
    fontWeight: 950,
  },
  planPricePeriod: {
    display: "block",
    marginTop: 2,
    color: "#87938c",
    fontSize: 7.5,
  },
  detailsGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 9,
  },
  detailsGridMobile: {
    gridTemplateColumns: "1fr",
  },
  detailBox: {
    minWidth: 0,
    padding: "11px 12px",
    border: "1px solid #e5ebe7",
    borderRadius: 13,
    background: "rgba(255,255,255,.92)",
  },
  detailBoxAccent: {
    border: "1px solid #f1ddb0",
    background: "#fffaf0",
  },
  detailLabel: {
    display: "block",
    color: "#7c8981",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: 0.55,
    textTransform: "uppercase",
  },
  detailValue: {
    display: "block",
    marginTop: 5,
    color: "#26342c",
    fontSize: 11.5,
    fontWeight: 800,
    lineHeight: 1.3,
    overflowWrap: "anywhere",
  },
  actionsGrid: {
    marginTop: 15,
    paddingTop: 15,
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 9,
    borderTop: "1px solid #e5ece8",
  },
  actionsGridMobile: {
    gridTemplateColumns: "1fr",
  },
  adminButton: {
    minHeight: 46,
    padding: "10px 12px",
    border: "none",
    borderRadius: 13,
    background: "linear-gradient(135deg,#178451,#11683e)",
    color: "#fff",
    fontSize: 11.5,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 9px 20px rgba(22,131,79,.16)",
  },
  planButton: {
    minHeight: 46,
    padding: "10px 12px",
    border: "none",
    borderRadius: 13,
    background: "linear-gradient(135deg,#3b82f6,#2563eb)",
    color: "#fff",
    fontSize: 11.5,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 9px 20px rgba(37,99,235,.14)",
  },
  paymentButton: {
    minHeight: 46,
    padding: "10px 12px",
    border: "none",
    borderRadius: 13,
    background: "linear-gradient(135deg,#c58a2c,#a96b17)",
    color: "#fff",
    fontSize: 11.5,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 9px 20px rgba(183,121,31,.13)",
  },
  archiveButton: {
    minHeight: 46,
    padding: "10px 12px",
    border: "1px solid #d4ddd7",
    borderRadius: 13,
    background: "#ffffff",
    color: "#526057",
    fontSize: 11.5,
    fontWeight: 900,
    cursor: "pointer",
  },
  deleteDemoButton: {
    gridColumn: "1 / -1",
    minHeight: 45,
    padding: "10px 12px",
    border: "1px solid #f3c6c6",
    borderRadius: 13,
    background: "#fff5f5",
    color: "#b42318",
    fontSize: 10.5,
    fontWeight: 900,
    cursor: "pointer",
  },
  restoreButton: {
    width: "100%",
    minHeight: 46,
    marginTop: 15,
    border: "1px solid #bddfca",
    borderRadius: 13,
    background: "#edf8f1",
    color: "#14683e",
    fontSize: 11.5,
    fontWeight: 900,
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
  adminModal: {
    width: 760,
    maxWidth: "100%",
    maxHeight: "calc(100vh - 40px)",
    padding: 22,
    overflowY: "auto",
    boxSizing: "border-box",
    border: "1px solid rgba(255,255,255,.45)",
    borderRadius: 22,
    background: "#ffffff",
    boxShadow: "0 30px 90px rgba(0,0,0,.30)",
  },

  adminModalMobile: {
    width: "100%",
    padding: 15,
    borderRadius: 18,
  },

  adminModalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 16,
    borderBottom: "1px solid #e7ece9",
  },

  adminModalTitle: {
    margin: 0,
    color: "#17211c",
    fontSize: 24,
    lineHeight: 1.15,
  },

  adminModalSubtitle: {
    maxWidth: 560,
    margin: "6px 0 0",
    color: "#748078",
    fontSize: 10.5,
    lineHeight: 1.5,
  },

  adminSummaryGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 9,
  },

  adminSummaryBox: {
    padding: "11px 12px",
    border: "1px solid #e3ebe6",
    borderRadius: 12,
    background: "#f8fbf9",
  },

  adminSummaryLabel: {
    display: "block",
    color: "#7c8981",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: 0.7,
  },

  adminSummaryValue: {
    display: "block",
    marginTop: 4,
    color: "#243129",
    fontSize: 11.5,
  },

  adminSection: {
    marginTop: 15,
    padding: 15,
    border: "1px solid #e2e9e5",
    borderRadius: 15,
    background:
      "linear-gradient(155deg,#ffffff,#f8fbf9)",
  },

  adminSectionHeading: {
    marginBottom: 12,
  },

  adminSectionTitle: {
    display: "block",
    color: "#17211c",
    fontSize: 13,
  },

  adminSectionText: {
    display: "block",
    marginTop: 4,
    color: "#7a867f",
    fontSize: 9.5,
    lineHeight: 1.45,
  },

  adminFormGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 10,
  },

  adminUserBox: {
    padding: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    border: "1px solid #cfe6d8",
    borderRadius: 12,
    background: "#f2fbf6",
  },

  adminUserName: {
    display: "block",
    marginTop: 4,
    color: "#17211c",
    fontSize: 12,
  },

  adminUserEmail: {
    display: "block",
    marginTop: 2,
    color: "#748078",
    fontSize: 9.5,
  },

  passwordButton: {
    minHeight: 40,
    padding: "9px 12px",
    border: "1px solid #b8dcc6",
    borderRadius: 10,
    background: "#ffffff",
    color: "#14683e",
    fontSize: 9.5,
    fontWeight: 850,
    cursor: "pointer",
  },

  adminWarningBox: {
    padding: 12,
    border: "1px solid #f1d6a9",
    borderRadius: 12,
    background: "#fff9ed",
    color: "#8a5d00",
    fontSize: 9.5,
    lineHeight: 1.45,
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
