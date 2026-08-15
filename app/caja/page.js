"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const VERSION_CAJA_GIMNASIO = "2026.08.14-M-SYNC-AGENDA-CAJA";

function obtenerFechaPanama(fecha = new Date()) {
  const fechaObjeto =
    fecha instanceof Date ? fecha : new Date(fecha);

  if (Number.isNaN(fechaObjeto.getTime())) return "";

  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fechaObjeto);

  const year =
    partes.find((parte) => parte.type === "year")?.value || "";
  const month =
    partes.find((parte) => parte.type === "month")?.value || "";
  const day =
    partes.find((parte) => parte.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

function sumarMesesFecha(fechaTexto, meses) {
  if (!fechaTexto) return "";

  const [anio, mes, dia] = String(fechaTexto)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!anio || !mes || !dia) return "";

  const fecha = new Date(anio, mes - 1, dia, 12, 0, 0);
  const diaOriginal = fecha.getDate();

  fecha.setDate(1);
  fecha.setMonth(fecha.getMonth() + meses);

  const ultimoDiaMes = new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    0
  ).getDate();

  fecha.setDate(Math.min(diaOriginal, ultimoDiaMes));

  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function sumarDiasFecha(fechaTexto, dias) {
  if (!fechaTexto) return "";

  const [anio, mes, dia] = String(fechaTexto)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!anio || !mes || !dia) return "";

  const fecha = new Date(anio, mes - 1, dia, 12, 0, 0);
  fecha.setDate(fecha.getDate() + dias);

  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function calcularNuevaFechaVencimiento(fechaBase, periodicidad) {
  switch (periodicidad) {
    case "Diaria":
      return sumarDiasFecha(fechaBase, 1);
    case "Semanal":
      return sumarDiasFecha(fechaBase, 7);
    case "Quincenal":
      return sumarDiasFecha(fechaBase, 15);
    case "Mensual":
      return sumarMesesFecha(fechaBase, 1);
    case "Trimestral":
      return sumarMesesFecha(fechaBase, 3);
    case "Semestral":
      return sumarMesesFecha(fechaBase, 6);
    case "Anual":
      return sumarMesesFecha(fechaBase, 12);
    default:
      return sumarMesesFecha(fechaBase, 1);
  }
}

function calcularVencimientoPorDuracion(
  fechaBase,
  cantidad,
  unidad
) {
  const numero = Math.max(1, Number(cantidad || 1));

  switch (unidad) {
    case "Días":
      return sumarDiasFecha(fechaBase, numero);
    case "Semanas":
      return sumarDiasFecha(fechaBase, numero * 7);
    case "Años":
      return sumarMesesFecha(fechaBase, numero * 12);
    case "Meses":
    default:
      return sumarMesesFecha(fechaBase, numero);
  }
}

export default function Caja() {
  const router = useRouter();

  const hoyPanama = obtenerFechaPanama();

  const [empresaNombre, setEmpresaNombre] = useState("");
  const [categoriaNegocio, setCategoriaNegocio] = useState("");
  const [tipoNegocioEmpresa, setTipoNegocioEmpresa] = useState("");

  const [tipoMovimiento, setTipoMovimiento] = useState("");
  const [fechaPago, setFechaPago] = useState(hoyPanama);

  const [buscarCliente, setBuscarCliente] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cuentasCliente, setCuentasCliente] = useState([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);

  const [nombreContado, setNombreContado] = useState("");
  const [cedulaContado, setCedulaContado] = useState("");
  const [direccionContado, setDireccionContado] = useState("");
  const [telefonoContado, setTelefonoContado] = useState("");

  const [productos, setProductos] = useState([]);
  const [codigoProducto, setCodigoProducto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState("1");
  const [valorProducto, setValorProducto] = useState("");
  const [numeroVentaAbono, setNumeroVentaAbono] = useState("");

  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observacion, setObservacion] = useState("");

  const [movimientos, setMovimientos] = useState([]);
  const [vendedores, setVendedores] = useState([]);

  const [fechaDesde, setFechaDesde] = useState(hoyPanama);
  const [fechaHasta, setFechaHasta] = useState(hoyPanama);
  const [filtrandoMovimientos, setFiltrandoMovimientos] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mostrarOtrosCobros, setMostrarOtrosCobros] =
    useState(false);
  const [suscripcionFlujoId, setSuscripcionFlujoId] =
    useState("");
  const [flujoCaja, setFlujoCaja] = useState("");
  const [agendaReservaFlujoId, setAgendaReservaFlujoId] =
    useState("");
  const [reservasPendientesSalon, setReservasPendientesSalon] =
    useState([]);
  const [reservaSalonSeleccionada, setReservaSalonSeleccionada] =
    useState(null);
  const [esEscritorioCompacto, setEsEscritorioCompacto] =
    useState(false);

  useEffect(() => {
    const actualizarVista = () => {
      setEsEscritorioCompacto(
        typeof window !== "undefined" &&
          window.innerWidth >= 900
      );
    };

    actualizarVista();

    window.addEventListener("resize", actualizarVista);

    return () => {
      window.removeEventListener("resize", actualizarVista);
    };
  }, []);

  useEffect(() => {
    iniciarCaja();
  }, []);

  useEffect(() => {
    recalcularValorProducto();
  }, [tipoMovimiento, productoSeleccionado, cantidad]);

  useEffect(() => {
    if (
      tipoMovimiento === "Cancelación" &&
      cuentaSeleccionada?.id
    ) {
      setMonto(
        String(
          Number(cuentaSeleccionada.saldo_actual || 0).toFixed(2)
        )
      );
    }
  }, [
    tipoMovimiento,
    cuentaSeleccionada?.id,
    cuentaSeleccionada?.saldo_actual,
  ]);

  function estiloResponsivo(base, compacto) {
    return esEscritorioCompacto
      ? { ...base, ...compacto }
      : base;
  }

  async function iniciarCaja() {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      setCargando(false);
      return;
    }

    setCargando(true);

    try {
      await Promise.all([
        cargarEmpresa(empresaId),
        cargarVendedores(empresaId),
        cargarProductos(empresaId),
        cargarMovimientos(
          empresaId,
          hoyPanama,
          hoyPanama
        ),
      ]);

      /*
        El flujo recibido desde Membresías puede intentar
        activar automáticamente una membresía que ya tiene
        un pago registrado. Si esa actualización falla por
        permisos, columnas o conexión, el error debe mostrarse
        sin dejar la página bloqueada en "Preparando caja · Versión J".
      */
      await Promise.race([
        cargarFlujoDesdeUrl(empresaId),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                "La carga del alumno o la membresía tardó demasiado."
              )
            );
          }, 15000);
        }),
      ]);
    } catch (error) {
      console.error(
        "Error inicializando Caja:",
        error
      );

      alert(
        "La Caja no pudo completar la carga automática: " +
          (error?.message ||
            "Error desconocido.") +
          "\n\nLa pantalla se abrirá para que pueda revisar el alumno sin volver a registrar el pago."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarFlujoDesdeUrl(empresaId) {
    if (typeof window === "undefined") return;

    const parametros = new URLSearchParams(
      window.location.search
    );

    const clienteId = parametros.get("clienteId");
    const suscripcionId =
      parametros.get("suscripcionId");
    const cuentaId = parametros.get("cuentaId");
    const flujo = parametros.get("flujo");
    const agendaReservaId =
      parametros.get("agendaReservaId");

    setSuscripcionFlujoId(suscripcionId || "");
    setFlujoCaja(flujo || "");
    setAgendaReservaFlujoId(agendaReservaId || "");

    if (agendaReservaId) {
      await cargarReservaAgendaEnCaja(
        empresaId,
        agendaReservaId
      );
      return;
    }

    if (!clienteId) return;

    // Para Salón de Belleza, si se abre Caja con un cliente directo
    // no se consultan cuentas por cobrar ni membresías.
    if (esNegocioSalon()) {
      const { data: cliente, error: errorCliente } =
        await supabase
          .from("clientes")
          .select("*")
          .eq("empresa_id", empresaId)
          .eq("id", clienteId)
          .maybeSingle();

      if (errorCliente || !cliente) {
        alert(
          "No se pudo cargar el cliente enviado a Caja: " +
            (errorCliente?.message || "Cliente no encontrado.")
        );
        return;
      }

      setClienteSeleccionado(cliente);
      setBuscarCliente(cliente.nombre || "");
      setResultadosBusqueda([]);
      setCuentasCliente([]);
      setCuentaSeleccionada(null);
      setTipoMovimiento("Servicio de salón");
      setConcepto("Servicio de salón");

      const cajeroActual =
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("nombreUsuario") ||
        localStorage.getItem("adminKonaxNombre") ||
        "Caja";

      setResponsable(cajeroActual);
      return;
    }

    const [
      respuestaCliente,
      respuestaCuentas,
      respuestaSuscripcion,
    ] = await Promise.all([
      supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("id", clienteId)
        .maybeSingle(),

      supabase
        .from("informacion_comercial")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("cliente_id", clienteId)
        .order("created_at", {
          ascending: false,
        }),

      suscripcionId
        ? supabase
            .from("suscripciones")
            .select("*")
            .eq("empresa_id", empresaId)
            .eq("id", suscripcionId)
            .maybeSingle()
        : supabase
            .from("suscripciones")
            .select("*")
            .eq("empresa_id", empresaId)
            .eq("cliente_id", clienteId)
            .order("fecha_vencimiento", {
              ascending: false,
            })
            .limit(1)
            .maybeSingle(),
    ]);

    if (
      respuestaCliente.error ||
      !respuestaCliente.data
    ) {
      alert(
        "No se pudo cargar el alumno enviado a Caja: " +
          (respuestaCliente.error?.message ||
            "Alumno no encontrado.")
      );
      return;
    }

    if (respuestaCuentas.error) {
      alert(
        "No se pudo cargar la cuenta de la membresía: " +
          respuestaCuentas.error.message
      );
      return;
    }

    if (respuestaSuscripcion.error) {
      alert(
        "No se pudo cargar la membresía seleccionada: " +
          respuestaSuscripcion.error.message
      );
      return;
    }

    const cliente = respuestaCliente.data;
    const cuentas = respuestaCuentas.data || [];
    const suscripcion =
      respuestaSuscripcion.data || null;

    const cuentaSeleccionadaUrl =
      cuentas.find(
        (cuenta) =>
          cuentaId &&
          String(cuenta.id) === String(cuentaId)
      ) ||
      cuentas.find(
        (cuenta) =>
          suscripcion?.informacion_comercial_id &&
          String(cuenta.id) ===
            String(
              suscripcion.informacion_comercial_id
            )
      ) ||
      cuentas[0] ||
      null;

    setClienteSeleccionado(cliente);
    setBuscarCliente(cliente.nombre || "");
    setResultadosBusqueda([]);
    setCuentasCliente(cuentas);
    setCuentaSeleccionada(
      cuentaSeleccionadaUrl
    );

    const esNuevaMembresia =
      flujo === "nueva_membresia";

    const operacion = esNuevaMembresia
      ? "Membresía"
      : "Renovación";

    setTipoMovimiento(operacion);

    const montoSugerido = Number(
      cuentaSeleccionadaUrl?.saldo_actual ||
        cuentaSeleccionadaUrl?.cuota ||
        cuentaSeleccionadaUrl?.monto_total ||
        suscripcion?.precio ||
        0
    );

    setMonto(
      montoSugerido > 0
        ? montoSugerido.toFixed(2)
        : ""
    );

    setConcepto(
      `${operacion}${
        suscripcion?.plan
          ? ` - ${suscripcion.plan}`
          : ""
      }`
    );

    const cajeroActual =
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("nombreUsuario") ||
      localStorage.getItem("adminKonaxNombre") ||
      "Caja";

    setResponsable(cajeroActual);

    /*
      Reparación automática:
      si la membresía sigue Pendiente pero ya existe un pago
      procesado para esta misma cuenta, no se vuelve a cobrar.
      Se activa la membresía y se regresa al listado.
    */
    if (
      suscripcion &&
      normalizar(suscripcion.estado) === "pendiente" &&
      cuentaSeleccionadaUrl?.id
    ) {
      const {
        data: pagoExistente,
        error: errorPagoExistente,
      } = await supabase
        .from("caja")
        .select("id, monto, metodo_pago, estado, tipo")
        .eq("empresa_id", empresaId)
        .eq(
          "informacion_comercial_id",
          cuentaSeleccionadaUrl.id
        )
        .eq("estado", "Procesado")
        .in("tipo", ["Membresía", "Renovación"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!errorPagoExistente && pagoExistente) {
        try {
          await activarMembresiaConPago(
            empresaId,
            suscripcion,
            pagoExistente.metodo_pago || "Efectivo",
            true
          );

          alert(
            `El pago de $${Number(
              pagoExistente.monto || 0
            ).toFixed(
              2
            )} ya estaba registrado. La membresía fue activada sin realizar otro cobro.`
          );

          router.replace("/suscripciones");
          return;
        } catch (errorActivacion) {
          /*
            No se vuelve a cobrar. La Caja se abre y muestra
            el error real para poder corregir permisos o datos.
          */
          alert(
            "El pago ya existe y no debe registrarse otra vez. " +
              "No se pudo activar automáticamente la membresía: " +
              (errorActivacion?.message ||
                "Error desconocido.")
          );

          setMonto("");
          setConcepto(
            `Pago ya registrado - ${
              suscripcion?.plan || "Membresía"
            }`
          );
          return;
        }
      }
    }

    setTimeout(() => {
      document
        .getElementById("caja-operativa-formulario")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 150);
  }

  async function resolverClienteReservaAgenda(
    empresaId,
    reserva
  ) {
    /*
      Primero usamos cliente_id, que es el flujo correcto.
      Si la reserva es antigua y no quedó vinculada, hacemos
      una recuperación por teléfono/nombre sin tildes.
    */

    if (reserva?.cliente_id) {
      const respuesta = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("id", reserva.cliente_id)
        .maybeSingle();

      if (!respuesta.error && respuesta.data) {
        return respuesta;
      }
    }

    const {
      data: clientesEmpresa,
      error,
    } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .limit(5000);

    if (error) {
      return {
        data: null,
        error,
      };
    }

    const telefonoReserva = String(
      reserva?.telefono_reserva || ""
    ).replace(/\D/g, "");

    const nombreReserva = normalizar(
      reserva?.nombre_reserva || ""
    );

    const clienteEncontrado = (clientesEmpresa || []).find(
      (cliente) => {
        const telefonoCliente = String(
          cliente.telefono || ""
        ).replace(/\D/g, "");

        const nombreCliente = normalizar(
          cliente.nombre || ""
        );

        const coincideTelefono =
          telefonoReserva.length >= 7 &&
          telefonoCliente.length >= 7 &&
          telefonoCliente.slice(-8) ===
            telefonoReserva.slice(-8);

        const coincideNombre =
          nombreReserva &&
          nombreCliente === nombreReserva;

        return coincideTelefono || coincideNombre;
      }
    );

    return {
      data: clienteEncontrado || null,
      error: null,
    };
  }

  async function cargarReservaAgendaEnCaja(
    empresaId,
    reservaId
  ) {
    const {
      data: reserva,
      error: errorReserva,
    } = await supabase
      .from("agenda_reservas")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("id", reservaId)
      .maybeSingle();

    if (errorReserva || !reserva) {
      throw new Error(
        "No se pudo cargar la reserva enviada desde Agenda: " +
          (errorReserva?.message || "Reserva no encontrada.")
      );
    }

    if (
      normalizar(reserva.estado) === "cancelada"
    ) {
      throw new Error(
        "La reserva enviada a Caja está cancelada."
      );
    }

    if (
      normalizar(reserva.estado) !== "pendiente_pago"
    ) {
      throw new Error(
        "La reserva ya no se encuentra pendiente de pago."
      );
    }

    const [
      respuestaCliente,
      respuestaServicio,
      respuestaPagoExistente,
    ] = await Promise.all([
      resolverClienteReservaAgenda(
        empresaId,
        reserva
      ),

      supabase
        .from("agenda_servicios")
        .select("id,nombre,tipo")
        .eq("empresa_id", empresaId)
        .eq("id", reserva.servicio_id)
        .maybeSingle(),

      supabase
        .from("caja")
        .select("id,monto,estado")
        .eq("empresa_id", empresaId)
        .eq("agenda_reserva_id", reserva.id)
        .eq("estado", "Procesado")
        .limit(1)
        .maybeSingle(),
    ]);

    if (
      respuestaCliente.error ||
      !respuestaCliente.data
    ) {
      throw new Error(
        "No se pudo cargar el cliente de la reserva: " +
          (respuestaCliente.error?.message ||
            "Cliente no encontrado.")
      );
    }

    if (respuestaServicio.error) {
      throw new Error(
        "No se pudo cargar la clase o servicio: " +
          respuestaServicio.error.message
      );
    }

    if (respuestaPagoExistente.data?.id) {
      const { error: errorConfirmar } =
        await supabase.rpc(
          "confirmar_pago_agenda_desde_caja",
          {
            p_empresa_id: empresaId,
            p_reserva_id: reserva.id,
            p_caja_id:
              respuestaPagoExistente.data.id,
          }
        );

      if (errorConfirmar) {
        throw new Error(
          "El pago ya existe, pero no se pudo confirmar la reserva: " +
            errorConfirmar.message
        );
      }

      alert(
        `El pago de $${Number(
          respuestaPagoExistente.data.monto || 0
        ).toFixed(
          2
        )} ya estaba registrado. La reserva fue confirmada sin realizar otro cobro.`
      );

      window.location.replace("/agenda");
      return;
    }

    const cliente = respuestaCliente.data;
    const servicio = respuestaServicio.data;

    setClienteSeleccionado(cliente);
    setBuscarCliente(cliente.nombre || "");
    setResultadosBusqueda([]);
    setCuentasCliente([]);
    setCuentaSeleccionada(null);

    setTipoMovimiento(
      esNegocioSalon()
        ? "Servicio de salón"
        : "Clase / Sesión individual"
    );
    setMonto(
      Number(reserva.monto || 0) > 0
        ? Number(reserva.monto).toFixed(2)
        : ""
    );

    setConcepto(
      `${
        servicio?.nombre ||
        (esNegocioSalon() ? "Servicio del salón" : "Clase / servicio")
      } · Reserva ${String(
        reserva.fecha_reserva || ""
      )} · ${String(
        reserva.hora_inicio || ""
      ).slice(0, 5)}`
    );

    setObservacion(
      `Cobro asociado a reserva de Agenda ${reserva.id}.`
    );

    const cajeroActual =
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("nombreUsuario") ||
      localStorage.getItem("adminKonaxNombre") ||
      "Caja";

    setResponsable(cajeroActual);

    setTimeout(() => {
      document
        .getElementById("caja-operativa-formulario")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 150);
  }

  function obtenerEmpresaId() {
    const empresaId =
      localStorage.getItem("empresaId") ||
      localStorage.getItem("empresaAdminCreadaId");

    if (!empresaId) {
      alert("No hay empresa activa. Inicie sesión nuevamente.");
      router.replace("/login");
      return null;
    }

    return empresaId;
  }

  function volverDashboard() {
    router.push("/dashboard");
  }

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function calcularDiasMoraCuenta(fechaVencimiento, saldoActual) {
    if (!fechaVencimiento || Number(saldoActual || 0) <= 0) {
      return 0;
    }

    const hoy = new Date(`${obtenerFechaPanama()}T00:00:00`);
    const vencimiento = new Date(
      `${String(fechaVencimiento).slice(0, 10)}T00:00:00`
    );

    if (Number.isNaN(vencimiento.getTime())) {
      return 0;
    }

    const diferencia = hoy.getTime() - vencimiento.getTime();

    return diferencia > 0
      ? Math.floor(diferencia / 86400000)
      : 0;
  }

  function calcularEstadoCobranzaCuenta(
    fechaVencimiento,
    saldoActual
  ) {
    if (Number(saldoActual || 0) <= 0) {
      return "Cancelado";
    }

    return calcularDiasMoraCuenta(
      fechaVencimiento,
      saldoActual
    ) > 0
      ? "Mora"
      : "Al Día";
  }

  function generarTransaccion() {
    return `TX-${Date.now()}`;
  }

  function generarNumeroVenta() {
    return `VTA-${Date.now()}`;
  }

  function esNegocioMembresia() {
    const tipo = normalizar(
      `${categoriaNegocio} ${tipoNegocioEmpresa}`
    );

    return (
      tipo.includes("gimnasio") ||
      tipo.includes("club") ||
      tipo.includes("academia") ||
      tipo.includes("escuela") ||
      tipo.includes("colegio") ||
      tipo.includes("suscripciones") ||
      tipo.includes("membres")
    );
  }

  function esNegocioSalon() {
    const tipoLocal =
      typeof window !== "undefined"
        ? `${localStorage.getItem("categoriaNegocio") || ""} ${
            localStorage.getItem("tipoNegocio") || ""
          }`
        : "";

    const tipo = normalizar(
      `${categoriaNegocio} ${tipoNegocioEmpresa} ${tipoLocal}`
    );

    return (
      tipo.includes("salon de belleza") ||
      tipo.includes("salon belleza") ||
      tipo.includes("belleza") ||
      tipo.includes("peluqueria") ||
      tipo.includes("estetica") ||
      tipo.includes("barberia") ||
      tipo.includes("spa")
    );
  }

  function esMovimientoMembresia() {
    return [
      "Membresía",
      "Renovación",
      "Inscripción / Matrícula",
    ].includes(tipoMovimiento);
  }

  function requiereCuentaMembresia() {
    return ["Membresía", "Renovación"].includes(tipoMovimiento);
  }

  function esMovimientoLibreMembresia() {
    return [
      "Pase diario",
      "Clase / Sesión individual",
      "Servicio adicional",
      "Otro ingreso",
    ].includes(tipoMovimiento);
  }

  function esVentaConProducto() {
    return [
      "Venta Contado",
      "Venta Crédito",
      "Venta de producto",
    ].includes(tipoMovimiento);
  }

  function esVentaCredito() {
    return tipoMovimiento === "Venta Crédito";
  }

  function esVentaContado() {
    return [
      "Venta Contado",
      "Venta de producto",
    ].includes(tipoMovimiento);
  }

  function esAbono() {
    return tipoMovimiento === "Abono";
  }

  function esCuotaCredito() {
    return [
      "Cuota Crédito",
      "Pago Crédito",
      "Pago Credito",
    ].includes(tipoMovimiento);
  }

  function esCancelacion() {
    return tipoMovimiento === "Cancelación";
  }

  function esPagoDeCuenta() {
    return (
      esVentaCredito() ||
      esAbono() ||
      esCuotaCredito() ||
      esCancelacion()
    );
  }

  function requiereCliente() {
    if (esNegocioMembresia()) {
      return esMovimientoMembresia();
    }

    if (esNegocioSalon()) {
      return tipoMovimiento === "Servicio de salón";
    }

    return ![
      "Venta Contado",
      "Servicio Contado",
      "Venta de producto",
    ].includes(tipoMovimiento);
  }

  function clienteEsOpcional() {
    if (esNegocioSalon()) {
      return tipoMovimiento === "Otro ingreso";
    }

    return (
      esNegocioMembresia() &&
      (esMovimientoLibreMembresia() ||
        tipoMovimiento === "Venta de producto")
    );
  }

  function limpiarSeleccionGimnasio({ conservarCliente = true } = {}) {
    setMonto("");
    setValorProducto("");
    setCodigoProducto("");
    setProductoSeleccionado(null);
    setCantidad("1");
    setNumeroVentaAbono("");
    setConcepto("");
    setObservacion("");

    if (!conservarCliente) {
      setBuscarCliente("");
      setResultadosBusqueda([]);
      setClienteSeleccionado(null);
      setCuentasCliente([]);
      setCuentaSeleccionada(null);
    }
  }

  function seleccionarTipoGimnasio(nuevoTipo) {
    limpiarSeleccionGimnasio({ conservarCliente: true });
    setTipoMovimiento(nuevoTipo);
    setMostrarOtrosCobros(false);

    const conceptos = {
      "Pase diario": "Pase diario",
      "Clase / Sesión individual":
        "Clase o sesión individual",
      "Servicio adicional": "Servicio adicional",
      "Otro ingreso": "Otro ingreso",
      "Inscripción / Matrícula":
        "Inscripción o matrícula",
      "Venta de producto": "Venta de producto",
    };

    setConcepto(conceptos[nuevoTipo] || nuevoTipo);
  }

  function seleccionarTipoSalon(nuevoTipo) {
    limpiarSeleccionGimnasio({ conservarCliente: true });
    setTipoMovimiento(nuevoTipo);
    setMostrarOtrosCobros(false);

    const conceptos = {
      "Servicio de salón": "Servicio de salón",
      "Otro ingreso": "Otro ingreso",
    };

    setConcepto(conceptos[nuevoTipo] || nuevoTipo);
  }

  function obtenerEstadoMembresiaVisual() {
    if (!clienteSeleccionado) {
      return {
        etiqueta: "Sin alumno seleccionado",
        color: "#6b7280",
        fondo: "#f3f4f6",
      };
    }

    if (!cuentaSeleccionada?.id) {
      return {
        etiqueta: "Sin membresía configurada",
        color: "#9a6700",
        fondo: "#fff7db",
      };
    }

    const estado = normalizar(
      cuentaSeleccionada.estado_servicio ||
        cuentaSeleccionada.estado
    );

    const fechaVencimiento = String(
      cuentaSeleccionada.fecha_vencimiento || ""
    ).slice(0, 10);

    const hoy = obtenerFechaPanama();

    if (
      ["cancelado", "suspendido", "inactivo"].includes(
        estado
      ) ||
      (fechaVencimiento && fechaVencimiento < hoy)
    ) {
      return {
        etiqueta: "Membresía vencida",
        color: "#b42318",
        fondo: "#fff0ee",
      };
    }

    if (fechaVencimiento) {
      const hoyFecha = new Date(`${hoy}T12:00:00`);
      const venceFecha = new Date(
        `${fechaVencimiento}T12:00:00`
      );

      const dias = Math.ceil(
        (venceFecha.getTime() - hoyFecha.getTime()) /
          86400000
      );

      if (dias >= 0 && dias <= 7) {
        return {
          etiqueta: `Vence en ${dias} ${
            dias === 1 ? "día" : "días"
          }`,
          color: "#956400",
          fondo: "#fff8df",
        };
      }
    }

    return {
      etiqueta: "Membresía activa",
      color: "#08743c",
      fondo: "#e8f7ed",
    };
  }

  function obtenerMontoSugeridoMembresia() {
    return Number(
      cuentaSeleccionada?.cuota ||
        cuentaSeleccionada?.monto_cuota ||
        cuentaSeleccionada?.monto_total ||
        cuentaSeleccionada?.saldo_actual ||
        0
    );
  }

  function etiquetaAccionMembresia() {
    if (!clienteSeleccionado) {
      return "Cobrar membresía";
    }

    if (!cuentaSeleccionada?.id) {
      return "Configurar membresía";
    }

    const estadoVisual = obtenerEstadoMembresiaVisual();

    return estadoVisual.etiqueta === "Membresía vencida"
      ? "Cobrar y renovar"
      : "Renovar membresía";
  }

  function prepararCobroMembresia() {
    if (!clienteSeleccionado) {
      alert(
        "Busque y seleccione al alumno antes de cobrar una membresía."
      );
      return;
    }

    if (!cuentaSeleccionada?.id) {
      router.push(
        `/suscripciones?clienteId=${clienteSeleccionado.id}`
      );
      return;
    }

    limpiarSeleccionGimnasio({ conservarCliente: true });
    setTipoMovimiento("Renovación");
    setConcepto("Renovación de membresía");
    setMostrarOtrosCobros(false);

    const sugerido = obtenerMontoSugeridoMembresia();

    if (sugerido > 0) {
      setMonto(sugerido.toFixed(2));
    }
  }

  function limpiarAlumnoGimnasio() {
    setBuscarCliente("");
    setResultadosBusqueda([]);
    setClienteSeleccionado(null);
    setCuentasCliente([]);
    setCuentaSeleccionada(null);
    setReservasPendientesSalon([]);
    setReservaSalonSeleccionada(null);
    setAgendaReservaFlujoId("");

    if (
      ["Membresía", "Renovación"].includes(tipoMovimiento)
    ) {
      setTipoMovimiento("Pase diario");
      setConcepto("Pase diario");
      setMonto("");
    }
  }

  function obtenerOtrosCobrosGimnasio() {
    const opciones = [
      "Inscripción / Matrícula",
      "Clase / Sesión individual",
      "Servicio adicional",
      "Otro ingreso",
    ];

    if (productos.length > 0) {
      opciones.splice(3, 0, "Venta de producto");
    }

    return opciones;
  }

  async function cargarEmpresa(empresaId) {
    const { data, error } = await supabase
      .from("empresas")
      .select("nombre, categoria_negocio, tipo_negocio")
      .eq("id", empresaId)
      .maybeSingle();

    if (error) {
      alert("Error cargando información del negocio: " + error.message);
      return;
    }

    const nombreLocal =
      localStorage.getItem("empresaNombre") ||
      localStorage.getItem("empresaAdminCreadaNombre") ||
      "";

    const nombreFinal =
      data?.nombre || nombreLocal || "Negocio sin nombre";

    const categoria = data?.categoria_negocio || "";
    const tipo = data?.tipo_negocio || "";
    const tipoCompleto = `${categoria} ${tipo}`.trim() || "General";

    setEmpresaNombre(nombreFinal);
    setCategoriaNegocio(categoria);
    setTipoNegocioEmpresa(tipo);

    localStorage.setItem("empresaNombre", nombreFinal);
    localStorage.setItem("categoriaNegocio", categoria);
    localStorage.setItem("tipoNegocio", tipo);

    const opciones = obtenerOpcionesMovimiento(tipoCompleto);
    const esPerfilSalon =
      normalizar(tipoCompleto).includes("salon de belleza") ||
      normalizar(tipoCompleto).includes("salon belleza") ||
      normalizar(tipoCompleto).includes("belleza") ||
      normalizar(tipoCompleto).includes("peluqueria") ||
      normalizar(tipoCompleto).includes("estetica") ||
      normalizar(tipoCompleto).includes("barberia") ||
      normalizar(tipoCompleto).includes("spa");

    const esPerfilMembresia =
      normalizar(tipoCompleto).includes("gimnasio") ||
      normalizar(tipoCompleto).includes("club") ||
      normalizar(tipoCompleto).includes("academia") ||
      normalizar(tipoCompleto).includes("escuela") ||
      normalizar(tipoCompleto).includes("colegio") ||
      normalizar(tipoCompleto).includes("suscripciones") ||
      normalizar(tipoCompleto).includes("membres");

    setTipoMovimiento(
      esPerfilMembresia
        ? "Pase diario"
        : opciones[0] || ""
    );

    if (esPerfilMembresia) {
      setConcepto("Pase diario");
    } else if (esPerfilSalon) {
      setConcepto("Servicio de salón");
    }
  }

  function obtenerOpcionesMovimiento(tipoNegocio) {
    const tipo = normalizar(tipoNegocio);

    if (
      tipo.includes("salon de belleza") ||
      tipo.includes("salon belleza") ||
      tipo.includes("belleza") ||
      tipo.includes("peluqueria") ||
      tipo.includes("estetica") ||
      tipo.includes("barberia") ||
      tipo.includes("spa")
    ) {
      return [
        "Servicio de salón",
        "Otro ingreso",
      ];
    }

    if (
      tipo.includes("gimnasio") ||
      tipo.includes("club") ||
      tipo.includes("academia") ||
      tipo.includes("escuela") ||
      tipo.includes("colegio") ||
      tipo.includes("suscripciones") ||
      tipo.includes("membres")
    ) {
      return [
        "Inscripción / Matrícula",
        "Membresía",
        "Renovación",
        "Pase diario",
        "Clase / Sesión individual",
        "Venta de producto",
        "Servicio adicional",
        "Otro ingreso",
      ];
    }

    if (
      tipo.includes("muebleria") ||
      tipo.includes("electronica") ||
      tipo.includes("financiera") ||
      tipo.includes("cooperativa") ||
      tipo.includes("empeno")
    ) {
      return [
        "Venta Contado",
        "Venta Crédito",
        "Abono",
        "Cuota Crédito",
        "Cancelación",
      ];
    }

    if (
      tipo.includes("ferreteria") ||
      tipo.includes("farmacia") ||
      tipo.includes("tienda") ||
      tipo.includes("mercado") ||
      tipo.includes("repuestos") ||
      tipo.includes("boutique")
    ) {
      return [
        "Venta Contado",
        "Venta Crédito",
        "Abono",
        "Cuota Crédito",
      ];
    }

    return [
      "Venta Contado",
      "Venta Crédito",
      "Abono",
      "Cuota Crédito",
      "Servicio Contado",
    ];
  }

  const opcionesMovimiento = useMemo(
    () =>
      obtenerOpcionesMovimiento(
        `${categoriaNegocio} ${tipoNegocioEmpresa}`
      ),
    [categoriaNegocio, tipoNegocioEmpresa]
  );

  async function cargarVendedores(empresaId) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("estado", "Activo")
      .in("rol", [
        "Vendedor",
        "Supervisor",
        "Administrador",
        "Cajero",
        "Gestor de Cobro",
        "Recepción",
      ])
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando responsables: " + error.message);
      return;
    }

    setVendedores(data || []);

    const usuarioActual =
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("nombreUsuario") ||
      localStorage.getItem("adminKonaxNombre") ||
      "";

    if (usuarioActual) setResponsable(usuarioActual);
  }

  async function cargarProductos(empresaId) {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando productos: " + error.message);
      return;
    }

    setProductos(data || []);
  }

  async function cargarMovimientos(
    empresaId = obtenerEmpresaId(),
    desde = fechaDesde,
    hasta = fechaHasta
  ) {
    if (!empresaId) return;

    if (!desde || !hasta) {
      alert("Seleccione la fecha desde y hasta.");
      return;
    }

    if (desde > hasta) {
      alert("La fecha desde no puede ser mayor que la fecha hasta.");
      return;
    }

    setFiltrandoMovimientos(true);

    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .gte("fecha_pago", desde)
      .lte("fecha_pago", hasta)
      .order("fecha_pago", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300);

    setFiltrandoMovimientos(false);

    if (error) {
      alert("Error cargando movimientos: " + error.message);
      return;
    }

    setMovimientos(data || []);
  }

  async function buscarMovimientosPorFecha() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    await cargarMovimientos(
      empresaId,
      fechaDesde,
      fechaHasta
    );
  }

  async function mostrarMovimientosHoy() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const hoy = obtenerFechaPanama();

    setFechaDesde(hoy);
    setFechaHasta(hoy);

    await cargarMovimientos(empresaId, hoy, hoy);
  }

  function precioProducto(producto) {
    if (!producto) return 0;

    if (esVentaCredito()) {
      return Number(
        producto.precio_credito ||
          producto.precio_venta ||
          0
      );
    }

    return Number(
      producto.precio_venta ||
        producto.precio_credito ||
        0
    );
  }

  function stockProducto(producto) {
    return Number(
      producto?.stock_actual ||
        producto?.stock ||
        0
    );
  }

  function obtenerImagenProducto(producto) {
    if (!producto) return "";

    return (
      producto.imagen_url ||
      producto.url_imagen ||
      producto.imagen ||
      producto.foto_url ||
      producto.foto ||
      producto.image_url ||
      ""
    );
  }

  function seleccionarProducto(producto) {
    setProductoSeleccionado(producto || null);
    setCodigoProducto(producto?.codigo || "");
    setConcepto(
      producto?.nombre ||
        producto?.descripcion ||
        ""
    );

    if (producto) {
      const total =
        precioProducto(producto) *
        Number(cantidad || 1);

      setValorProducto(String(total));

      if (!esAbono()) {
        setMonto(String(total));
      }
    }
  }

  function seleccionarProductoPorCodigo(codigo) {
    setCodigoProducto(codigo);

    const producto = productos.find(
      (p) =>
        String(p.codigo || "").trim().toLowerCase() ===
        String(codigo || "").trim().toLowerCase()
    );

    if (producto) {
      seleccionarProducto(producto);
      return;
    }

    setProductoSeleccionado(null);
    setValorProducto("");

    if (esVentaContado()) {
      setMonto("");
    }
  }

  function recalcularValorProducto() {
    if (!productoSeleccionado || !esVentaConProducto()) return;

    const total =
      precioProducto(productoSeleccionado) *
      Number(cantidad || 1);

    setValorProducto(String(total));

    if (esVentaContado()) {
      setMonto(String(total));
    }
  }

  async function buscarClientes() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const texto = buscarCliente.trim();

    if (texto.length < 3) {
      alert("Escriba mínimo 3 caracteres para buscar.");
      return;
    }

    const textoSeguro = texto.replace(/[%_,()]/g, "");

    /*
      SALÓN / BELLEZA
      --------------------------------------------------------
      El ILIKE normal de PostgreSQL distingue los acentos:
      "LIA" puede no encontrar "Lía".

      Para el salón cargamos las fichas de ESTA empresa y
      comparamos con normalizar(), que ya elimina tildes.
      Así:
        LIA = Lía = lía = LÍA
    */
    if (esNegocioSalon()) {
      const {
        data: clientesSalon,
        error: errorClientesSalon,
      } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nombre", { ascending: true })
        .limit(5000);

      if (errorClientesSalon) {
        alert(
          "Error buscando cliente: " +
            errorClientesSalon.message
        );
        return;
      }

      const terminoNormalizado = normalizar(textoSeguro);
      const terminoNumerico = String(textoSeguro).replace(
        /\D/g,
        ""
      );

      const coincidencias = (clientesSalon || [])
        .filter((cliente) => {
          const nombreNormalizado = normalizar(
            cliente.nombre || ""
          );

          const cedulaNormalizada = normalizar(
            cliente.cedula || ""
          );

          const telefonoNormalizado = String(
            cliente.telefono || ""
          ).replace(/\D/g, "");

          const coincideTexto =
            nombreNormalizado.includes(terminoNormalizado) ||
            cedulaNormalizada.includes(terminoNormalizado);

          const coincideTelefono =
            terminoNumerico.length >= 3 &&
            telefonoNormalizado.includes(terminoNumerico);

          return coincideTexto || coincideTelefono;
        })
        .slice(0, 30)
        .map((cliente) => ({
          cliente,
          cuenta: null,
        }));

      setResultadosBusqueda(coincidencias);

      if (coincidencias.length === 0) {
        alert(
          "No se encontró ningún cliente con ese nombre o teléfono."
        );
      }

      return;
    }

    // --------------------------------------------------------
    // RESTO DE NEGOCIOS:
    // Se conserva la lógica original.
    // --------------------------------------------------------

    let resultados = [];

    const {
      data: clientesData,
      error: errorClientes,
    } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(
        `nombre.ilike.%${textoSeguro}%,cedula.ilike.%${textoSeguro}%,telefono.ilike.%${textoSeguro}%`
      );

    if (errorClientes) {
      alert("Error buscando cliente: " + errorClientes.message);
      return;
    }

    if (clientesData) {
      resultados = clientesData.map((cliente) => ({
        cliente,
        cuenta: null,
      }));
    }

    const {
      data: cuentasData,
      error: errorCuentas,
    } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .ilike("numero_cuenta", `%${textoSeguro}%`);

    if (errorCuentas) {
      alert("Error buscando cuenta: " + errorCuentas.message);
      return;
    }

    if (cuentasData?.length > 0) {
      const idsClientes = cuentasData
        .map((cuenta) => cuenta.cliente_id)
        .filter(Boolean);

      if (idsClientes.length > 0) {
        const { data: clientesDeCuentas } =
          await supabase
            .from("clientes")
            .select("*")
            .eq("empresa_id", empresaId)
            .in("id", idsClientes);

        cuentasData.forEach((cuenta) => {
          const cliente = clientesDeCuentas?.find(
            (item) => item.id === cuenta.cliente_id
          );

          if (cliente) {
            resultados.push({ cliente, cuenta });
          }
        });
      }
    }

    const unicos = [];
    const claves = new Set();

    resultados.forEach((resultado) => {
      const clave = esNegocioMembresia()
        ? String(resultado.cliente.id)
        : `${resultado.cliente.id}-${
            resultado.cuenta?.id || "sin-cuenta"
          }`;

      if (!claves.has(clave)) {
        claves.add(clave);
        unicos.push(resultado);
      }
    });

    setResultadosBusqueda(unicos);
  }

  function prepararReservaSalonParaCobro(reserva) {
    if (!reserva?.id) return;

    setReservaSalonSeleccionada(reserva);
    setAgendaReservaFlujoId(String(reserva.id));
    setTipoMovimiento("Servicio de salón");

    const montoReserva = Number(reserva.monto || 0);
    setMonto(montoReserva > 0 ? montoReserva.toFixed(2) : "");

    const nombreServicio =
      reserva.servicio_nombre ||
      reserva.nombre_servicio ||
      "Servicio del salón";

    setConcepto(
      `${nombreServicio} · Reserva ${String(
        reserva.fecha_reserva || ""
      ).slice(0, 10)} · ${String(
        reserva.hora_inicio || ""
      ).slice(0, 5)}`
    );

    setObservacion(
      `Cobro asociado a reserva de Agenda ${reserva.id}.`
    );
  }

  async function cargarReservasPendientesClienteSalon(
    empresaId,
    clienteId
  ) {
    setReservasPendientesSalon([]);
    setReservaSalonSeleccionada(null);
    setAgendaReservaFlujoId("");

    if (!empresaId || !clienteId) return [];

    const { data: reservasData, error: errorReservas } =
      await supabase
        .from("agenda_reservas")
        .select(
          "id,cliente_id,servicio_id,fecha_reserva,hora_inicio,hora_fin,monto,estado,requiere_pago"
        )
        .eq("empresa_id", empresaId)
        .eq("cliente_id", clienteId)
        .eq("estado", "pendiente_pago")
        .order("fecha_reserva", { ascending: true })
        .order("hora_inicio", { ascending: true });

    if (errorReservas) {
      throw new Error(
        "No se pudieron consultar las citas pendientes de pago: " +
          errorReservas.message
      );
    }

    const reservasBase = reservasData || [];
    if (!reservasBase.length) {
      return [];
    }

    const idsReservas = reservasBase.map((r) => r.id);

    /*
      Si por una falla anterior existe un movimiento YA vinculado
      a una reserva que todavía figura pendiente, se repara el
      estado antes de ofrecer un segundo cobro.
    */
    const { data: pagosVinculados, error: errorPagos } =
      await supabase
        .from("caja")
        .select("id,agenda_reserva_id,monto,estado")
        .eq("empresa_id", empresaId)
        .in("agenda_reserva_id", idsReservas)
        .eq("estado", "Procesado");

    if (errorPagos) {
      throw new Error(
        "No se pudieron validar los pagos existentes: " +
          errorPagos.message
      );
    }

    const pagosPorReserva = new Map(
      (pagosVinculados || []).map((pago) => [
        String(pago.agenda_reserva_id),
        pago,
      ])
    );

    const reservasSinPago = [];

    for (const reserva of reservasBase) {
      const pago = pagosPorReserva.get(String(reserva.id));

      if (pago?.id) {
        const { error: errorReconciliar } =
          await supabase.rpc(
            "confirmar_pago_agenda_desde_caja",
            {
              p_empresa_id: empresaId,
              p_reserva_id: reserva.id,
              p_caja_id: pago.id,
            }
          );

        if (errorReconciliar) {
          throw new Error(
            "Existe un pago para una cita, pero no se pudo sincronizar con Agenda: " +
              errorReconciliar.message
          );
        }

        continue;
      }

      reservasSinPago.push(reserva);
    }

    if (!reservasSinPago.length) {
      return [];
    }

    const idsServicios = [
      ...new Set(
        reservasSinPago.map((r) => r.servicio_id).filter(Boolean)
      ),
    ];

    let serviciosPorId = new Map();

    if (idsServicios.length) {
      const { data: serviciosData, error: errorServicios } =
        await supabase
          .from("agenda_servicios")
          .select("id,nombre")
          .eq("empresa_id", empresaId)
          .in("id", idsServicios);

      if (errorServicios) {
        throw new Error(
          "No se pudieron cargar los servicios de las citas: " +
            errorServicios.message
        );
      }

      serviciosPorId = new Map(
        (serviciosData || []).map((servicio) => [
          String(servicio.id),
          servicio.nombre,
        ])
      );
    }

    const reservasPreparadas = reservasSinPago.map((reserva) => ({
      ...reserva,
      servicio_nombre:
        serviciosPorId.get(String(reserva.servicio_id)) ||
        "Servicio del salón",
    }));

    setReservasPendientesSalon(reservasPreparadas);

    /*
      Si hay una sola cita pendiente, la seleccionamos
      automáticamente. Si hay varias, Caja obliga a escoger
      cuál se está cobrando.
    */
    if (reservasPreparadas.length === 1) {
      prepararReservaSalonParaCobro(reservasPreparadas[0]);
    } else {
      setMonto("");
      setConcepto("Servicio de salón");
      setObservacion("");
    }

    return reservasPreparadas;
  }

  async function verificarReservaAntesDeCobrar(empresaId) {
    if (!agendaReservaFlujoId) return true;

    const { data: reservaActual, error: errorReserva } =
      await supabase
        .from("agenda_reservas")
        .select("id,estado,monto")
        .eq("empresa_id", empresaId)
        .eq("id", agendaReservaFlujoId)
        .maybeSingle();

    if (errorReserva || !reservaActual) {
      throw new Error(
        "No se pudo validar la reserva antes del cobro: " +
          (errorReserva?.message || "Reserva no encontrada.")
      );
    }

    const { data: pagoExistente, error: errorPago } =
      await supabase
        .from("caja")
        .select("id,monto,estado")
        .eq("empresa_id", empresaId)
        .eq("agenda_reserva_id", agendaReservaFlujoId)
        .eq("estado", "Procesado")
        .limit(1)
        .maybeSingle();

    if (errorPago) {
      throw new Error(
        "No se pudo validar si la reserva ya fue pagada: " +
          errorPago.message
      );
    }

    if (pagoExistente?.id) {
      const { error: errorConfirmar } =
        await supabase.rpc(
          "confirmar_pago_agenda_desde_caja",
          {
            p_empresa_id: empresaId,
            p_reserva_id: agendaReservaFlujoId,
            p_caja_id: pagoExistente.id,
          }
        );

      if (errorConfirmar) {
        throw new Error(
          "La reserva ya tiene un pago, pero no se pudo sincronizar con Agenda: " +
            errorConfirmar.message
        );
      }

      alert(
        `Esta reserva ya estaba pagada por $${Number(
          pagoExistente.monto || 0
        ).toFixed(2)}. No se registró un segundo cobro.`
      );

      return false;
    }

    if (normalizar(reservaActual.estado) !== "pendiente_pago") {
      alert(
        "Esta reserva ya no está pendiente de pago. No se registrará otro cobro."
      );
      return false;
    }

    return true;
  }

  async function seleccionarResultado(resultado) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const cliente = resultado.cliente;

    setClienteSeleccionado(cliente);
    setBuscarCliente(cliente.nombre);
    setResultadosBusqueda([]);

    if (esNegocioSalon()) {
      setCuentasCliente([]);
      setCuentaSeleccionada(null);

      const cajeroActual =
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("nombreUsuario") ||
        localStorage.getItem("adminKonaxNombre") ||
        "Caja";

      setResponsable(cajeroActual);

      try {
        await cargarReservasPendientesClienteSalon(
          empresaId,
          cliente.id
        );
      } catch (errorReservasSalon) {
        alert(
          errorReservasSalon?.message ||
            "No se pudieron consultar las citas pendientes del cliente."
        );
      }

      return;
    }

    const solicitudes = [
      supabase
        .from("informacion_comercial")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false }),
    ];

    if (esNegocioMembresia()) {
      solicitudes.push(
        supabase
          .from("suscripciones")
          .select(
            "id, cliente_id, informacion_comercial_id, estado, fecha_vencimiento, periodicidad"
          )
          .eq("empresa_id", empresaId)
          .eq("cliente_id", cliente.id)
          .order("fecha_vencimiento", { ascending: false })
      );
    }

    const respuestas = await Promise.all(solicitudes);
    const respuestaCuentas = respuestas[0];
    const respuestaSuscripciones = respuestas[1];

    if (respuestaCuentas.error) {
      alert(
        "No se pudieron cargar las cuentas del alumno: " +
          respuestaCuentas.error.message
      );
      setCuentasCliente([]);
      setCuentaSeleccionada(null);
      return;
    }

    let cuentasDisponibles = respuestaCuentas.data || [];

    if (
      esNegocioMembresia() &&
      !respuestaSuscripciones?.error &&
      respuestaSuscripciones?.data?.length
    ) {
      const idsMembresia = new Set(
        respuestaSuscripciones.data
          .map(
            (suscripcion) =>
              suscripcion.informacion_comercial_id
          )
          .filter(Boolean)
          .map(String)
      );

      const cuentasMembresia = cuentasDisponibles.filter(
        (cuenta) => idsMembresia.has(String(cuenta.id))
      );

      if (cuentasMembresia.length > 0) {
        cuentasDisponibles = cuentasMembresia;
      }
    }

    setCuentasCliente(cuentasDisponibles);

    const cuentaResultado = resultado.cuenta
      ? cuentasDisponibles.find(
          (cuenta) =>
            String(cuenta.id) ===
            String(resultado.cuenta.id)
        )
      : null;

    const cuentaInicial =
      cuentaResultado || cuentasDisponibles[0] || null;

    setCuentaSeleccionada(cuentaInicial);

    /*
      El responsable de Caja siempre es el usuario conectado
      que está registrando el movimiento.
    */
    const cajeroActual =
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("nombreUsuario") ||
      localStorage.getItem("adminKonaxNombre") ||
      "Caja";

    setResponsable(cajeroActual);

    if (
      esNegocioMembresia() &&
      cuentaInicial &&
      ["Membresía", "Renovación"].includes(tipoMovimiento)
    ) {
      const sugerido = Number(
        cuentaInicial.cuota ||
          cuentaInicial.monto_cuota ||
          cuentaInicial.monto_total ||
          cuentaInicial.saldo_actual ||
          0
      );

      if (sugerido > 0) {
        setMonto(sugerido.toFixed(2));
      }
    }
  }

  async function descontarInventario(empresaId) {
    if (!productoSeleccionado) return true;

    const stockActual = stockProducto(productoSeleccionado);
    const cantidadVenta = Number(cantidad || 1);

    if (cantidadVenta <= 0) {
      alert("La cantidad debe ser mayor a cero.");
      return false;
    }

    if (stockActual < cantidadVenta) {
      alert(`Stock insuficiente. Disponible: ${stockActual}.`);
      return false;
    }

    const nuevoStock = stockActual - cantidadVenta;

    const { error } = await supabase
      .from("productos")
      .update({ stock_actual: nuevoStock })
      .eq("empresa_id", empresaId)
      .eq("id", productoSeleccionado.id);

    if (error) {
      alert("Error descontando inventario: " + error.message);
      return false;
    }

    const { error: errorMovimiento } =
      await supabase
        .from("movimientos_inventario")
        .insert([
          {
            empresa_id: empresaId,
            producto_id: productoSeleccionado.id,
            tipo_movimiento: "SALIDA",
            cantidad: cantidadVenta,
            stock_anterior: stockActual,
            stock_nuevo: nuevoStock,
            observacion: `${tipoMovimiento} desde caja`,
            usuario:
              localStorage.getItem("usuarioNombre") ||
              localStorage.getItem("adminKonaxNombre") ||
              "Caja",
          },
        ]);

    if (errorMovimiento) {
      alert(
        "El producto se descontó, pero no se pudo registrar el movimiento de inventario: " +
          errorMovimiento.message
      );
    }

    return true;
  }

  async function asegurarClienteParaVenta(empresaId) {
    if (clienteSeleccionado) {
      return clienteSeleccionado;
    }

    if (!nombreContado.trim()) {
      return null;
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert([
        {
          empresa_id: empresaId,
          nombre: nombreContado.trim(),
          cedula: cedulaContado.trim(),
          direccion: direccionContado.trim(),
          telefono: telefonoContado.trim(),
          estado: "Activo",
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Error creando cliente contado: " + error.message);
      return null;
    }

    return data;
  }

  async function consultarPagoCuenta(
    empresaId,
    cuentaAplicar = cuentaSeleccionada
  ) {
    if (!cuentaAplicar?.id) {
      alert("Seleccione una cuenta por cobrar.");
      return null;
    }

    const { data: cuentaActual, error } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("id", cuentaAplicar.id)
      .maybeSingle();

    if (error || !cuentaActual) {
      alert(
        "No se pudo consultar la cuenta por cobrar: " +
          (error?.message || "Cuenta no encontrada.")
      );
      return null;
    }

    const saldoAnterior = Number(
      cuentaActual.saldo_actual || 0
    );

    if (saldoAnterior <= 0) {
      alert("Esta cuenta ya está cancelada.");
      return null;
    }

    let montoPago = Number(monto || 0);

    if (esCancelacion()) {
      montoPago = saldoAnterior;
      setMonto(String(saldoAnterior.toFixed(2)));
    }

    if (!montoPago || montoPago <= 0) {
      alert("Ingrese un monto válido mayor a cero.");
      return null;
    }

    if (montoPago > saldoAnterior) {
      alert(
        `El pago supera el saldo pendiente de $${saldoAnterior.toFixed(
          2
        )}.`
      );
      return null;
    }

    if (
      esCancelacion() &&
      Math.abs(montoPago - saldoAnterior) > 0.009
    ) {
      alert(
        "Para cancelar la cuenta debe pagarse el saldo completo."
      );
      return null;
    }

    const saldoNuevo = Math.max(
      saldoAnterior - montoPago,
      0
    );

    return {
      cuentaActual,
      saldoAnterior,
      montoPago,
      saldoNuevo,
      estadoNuevo:
        saldoNuevo <= 0 ? "Cancelado" : "Activo",
      diasMoraNuevo: calcularDiasMoraCuenta(
        cuentaActual.fecha_vencimiento,
        saldoNuevo
      ),
      estadoCobranzaNuevo:
        calcularEstadoCobranzaCuenta(
          cuentaActual.fecha_vencimiento,
          saldoNuevo
        ),
    };
  }

  async function aplicarPagoCuenta(
    empresaId,
    pagoPreparado
  ) {
    const {
      cuentaActual,
      montoPago,
      saldoNuevo,
      estadoNuevo,
      estadoCobranzaNuevo,
      diasMoraNuevo,
    } = pagoPreparado;

    const { error: errorCuenta } = await supabase
      .from("informacion_comercial")
      .update({
        saldo_actual: saldoNuevo,
        estado: estadoNuevo,
      })
      .eq("empresa_id", empresaId)
      .eq("id", cuentaActual.id);

    if (errorCuenta) {
      throw new Error(
        "No se pudo actualizar el saldo: " +
          errorCuenta.message
      );
    }

    const {
      data: cobranzaActual,
      error: errorConsultarCobranza,
    } = await supabase
      .from("informacion_cobranza")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq(
        "informacion_comercial_id",
        cuentaActual.id
      )
      .maybeSingle();

    if (errorConsultarCobranza) {
      throw new Error(
        "No se pudo consultar la cobranza: " +
          errorConsultarCobranza.message
      );
    }

    const estadoPromesaActual = normalizar(
      cobranzaActual?.estado_promesa
    );

    const promesaAbierta = [
      "activa",
      "pendiente",
      "vencida",
    ].includes(estadoPromesaActual);

    const montoPrometido = Number(
      cobranzaActual?.monto_promesa ||
        cobranzaActual?.monto_prometido ||
        0
    );

    const montoCumplidoAnterior = Number(
      cobranzaActual?.monto_cumplido_promesa || 0
    );

    const montoCumplidoNuevo = promesaAbierta
      ? montoCumplidoAnterior + montoPago
      : montoCumplidoAnterior;

    const promesaCumplida =
      promesaAbierta &&
      montoPrometido > 0 &&
      montoCumplidoNuevo + 0.009 >= montoPrometido;

    const datosCobranza = {
      fecha_ultimo_pago: fechaPago,
      monto_ultimo_pago: montoPago,
      estado_cobranza: estadoCobranzaNuevo,
      dias_mora: diasMoraNuevo,
      observacion_cobro:
        `${tipoMovimiento}. Saldo actualizado a ` +
        `$${saldoNuevo.toFixed(2)}.`,
    };

    if (promesaAbierta) {
      datosCobranza.monto_cumplido_promesa =
        montoCumplidoNuevo;

      if (promesaCumplida) {
        datosCobranza.estado_promesa = "Cumplida";
        datosCobranza.fecha_cumplimiento_promesa =
          fechaPago;
        datosCobranza.proxima_gestion = null;
        datosCobranza.observacion_cobro =
          `Promesa de pago cumplida por $${montoPrometido.toFixed(
            2
          )}. Saldo actualizado a $${saldoNuevo.toFixed(2)}.`;
      }
    }

    if (cobranzaActual?.id) {
      const { error: errorCobranza } = await supabase
        .from("informacion_cobranza")
        .update(datosCobranza)
        .eq("empresa_id", empresaId)
        .eq("id", cobranzaActual.id);

      if (errorCobranza) {
        throw new Error(
          "No se pudo actualizar cobranza: " +
            errorCobranza.message
        );
      }
    } else {
      const { error: errorCrearCobranza } = await supabase
        .from("informacion_cobranza")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: cuentaActual.cliente_id,
            informacion_comercial_id: cuentaActual.id,
            ...datosCobranza,
            responsable_cobro: responsable || null,
          },
        ]);

      if (errorCrearCobranza) {
        throw new Error(
          "No se pudo crear la información de cobranza: " +
            errorCrearCobranza.message
        );
      }
    }

    if (promesaCumplida) {
      const { data: promesasBitacora } = await supabase
        .from("bitacora_cliente")
        .select("id")
        .eq("empresa_id", empresaId)
        .eq("cliente_id", cuentaActual.cliente_id)
        .eq("informacion_comercial_id", cuentaActual.id)
        .eq("tipo_gestion", "Promesa de Pago")
        .order("fecha_gestion", { ascending: false })
        .limit(1);

      const promesaBitacora = promesasBitacora?.[0];

      if (promesaBitacora?.id) {
        await supabase
          .from("bitacora_cliente")
          .update({
            resultado_gestion: "Promesa cumplida",
            descripcion:
              `Promesa cumplida con pago de $${montoPago.toFixed(
                2
              )}.`,
            observacion:
              `Promesa cumplida. Saldo restante: $${saldoNuevo.toFixed(
                2
              )}.`,
          })
          .eq("empresa_id", empresaId)
          .eq("id", promesaBitacora.id);
      }
    }

    const cuentaActualizada = {
      ...cuentaActual,
      saldo_actual: saldoNuevo,
      estado: estadoNuevo,
    };

    setCuentaSeleccionada(cuentaActualizada);
    setCuentasCliente((actuales) =>
      actuales.map((cuenta) =>
        cuenta.id === cuentaActual.id
          ? cuentaActualizada
          : cuenta
      )
    );

    return cuentaActualizada;
  }

  async function revertirPagoCuenta(
    empresaId,
    pagoPreparado
  ) {
    if (!pagoPreparado?.cuentaActual?.id) return;

    await supabase
      .from("informacion_comercial")
      .update({
        saldo_actual: pagoPreparado.saldoAnterior,
        estado: pagoPreparado.cuentaActual.estado || "Activo",
      })
      .eq("empresa_id", empresaId)
      .eq("id", pagoPreparado.cuentaActual.id);
  }

  async function obtenerMembresiaObjetivo(empresaId) {
    if (!cuentaSeleccionada?.id && !suscripcionFlujoId) {
      return {
        suscripcion: null,
        error: new Error(
          "No hay una membresía seleccionada para procesar."
        ),
      };
    }

    let consulta = supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", empresaId);

    if (suscripcionFlujoId) {
      consulta = consulta.eq("id", suscripcionFlujoId);
    } else {
      consulta = consulta.eq(
        "informacion_comercial_id",
        cuentaSeleccionada.id
      );
    }

    const { data, error } = await consulta.maybeSingle();

    return {
      suscripcion: data || null,
      error: error || null,
    };
  }

  async function activarMembresiaConPago(
    empresaId,
    suscripcion,
    metodoAplicado,
    conservarVencimiento = false
  ) {
    const hoy = obtenerFechaPanama();
    const estadoActual = normalizar(
      suscripcion.estado
    );

    const esActivacionInicial =
      conservarVencimiento ||
      flujoCaja === "nueva_membresia" ||
      estadoActual === "pendiente";

    let nuevaFecha =
      suscripcion.fecha_vencimiento || hoy;

    if (!esActivacionInicial) {
      const fechaBase =
        nuevaFecha < hoy ? hoy : nuevaFecha;

      nuevaFecha =
        suscripcion.duracion_cantidad &&
        suscripcion.duracion_unidad
          ? calcularVencimientoPorDuracion(
              fechaBase,
              suscripcion.duracion_cantidad,
              suscripcion.duracion_unidad
            )
          : calcularNuevaFechaVencimiento(
              fechaBase,
              suscripcion.periodicidad
            );
    }

    /*
      La activación se confirma mediante una función segura
      de Supabase. De esta manera no depende de que el RLS
      permita varias actualizaciones separadas desde el
      navegador.
    */
    const {
      data: resultado,
      error: errorActivacion,
    } = await supabase.rpc(
      "confirmar_activacion_membresia",
      {
        p_empresa_id: empresaId,
        p_suscripcion_id: suscripcion.id,
        p_metodo_pago:
          metodoAplicado || "Efectivo",
        p_fecha_vencimiento: nuevaFecha,
      }
    );

    if (errorActivacion) {
      throw new Error(
        "No se pudo activar la membresía: " +
          errorActivacion.message
      );
    }

    if (!resultado?.ok) {
      throw new Error(
        "Supabase no confirmó la activación de la membresía."
      );
    }

    const cuentaId =
      resultado.cuenta_id ||
      suscripcion.informacion_comercial_id ||
      cuentaSeleccionada?.id;

    const fechaConfirmada =
      resultado.fecha_vencimiento ||
      nuevaFecha;

    const cuentaActualizada = {
      ...(cuentaSeleccionada || {}),
      id: cuentaId || cuentaSeleccionada?.id,
      fecha_vencimiento: fechaConfirmada,
      estado: "Activo",
      estado_servicio: "Activo",
      saldo_actual: 0,
    };

    setCuentaSeleccionada(
      cuentaActualizada
    );

    setCuentasCliente((actuales) =>
      actuales.map((cuenta) =>
        String(cuenta.id) === String(cuentaId)
          ? {
              ...cuenta,
              fecha_vencimiento:
                fechaConfirmada,
              estado: "Activo",
              estado_servicio: "Activo",
              saldo_actual: 0,
            }
          : cuenta
      )
    );

    return {
      nuevaFecha: fechaConfirmada,
      resultado,
    };
  }

  async function procesarMembresiaDesdeCaja(
    empresaId,
    metodoAplicado = metodoPago
  ) {
    const { suscripcion, error } =
      await obtenerMembresiaObjetivo(empresaId);

    if (error) {
      throw new Error(
        "Error consultando la membresía: " +
          error.message
      );
    }

    if (!suscripcion) {
      throw new Error(
        "La cuenta seleccionada no está vinculada a una membresía."
      );
    }

    return activarMembresiaConPago(
      empresaId,
      suscripcion,
      metodoAplicado
    );
  }

  async function reconciliarPagoPendienteExistente(
    empresaId
  ) {
    if (!requiereCuentaMembresia()) return false;

    const { suscripcion, error } =
      await obtenerMembresiaObjetivo(empresaId);

    if (error || !suscripcion) return false;

    if (normalizar(suscripcion.estado) !== "pendiente") {
      return false;
    }

    const cuentaId =
      suscripcion.informacion_comercial_id ||
      cuentaSeleccionada?.id;

    if (!cuentaId) return false;

    const { data: pagoExistente, error: errorPago } =
      await supabase
        .from("caja")
        .select(
          "id, monto, metodo_pago, estado, tipo, created_at"
        )
        .eq("empresa_id", empresaId)
        .eq("informacion_comercial_id", cuentaId)
        .eq("estado", "Procesado")
        .in("tipo", ["Membresía", "Renovación"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (errorPago || !pagoExistente) {
      return false;
    }

    await activarMembresiaConPago(
      empresaId,
      suscripcion,
      pagoExistente.metodo_pago || metodoPago,
      true
    );

    alert(
      `El pago de $${Number(
        pagoExistente.monto || 0
      ).toFixed(
        2
      )} ya estaba registrado. La membresía fue activada sin realizar un segundo cobro.`
    );

    return true;
  }

  function obtenerDireccionCliente(cliente) {
    return (
      cliente?.direccion ||
      cliente?.direccion_cliente ||
      ""
    );
  }

  function obtenerTelefonoCliente(cliente) {
    return (
      cliente?.telefono ||
      cliente?.celular ||
      cliente?.telefono_cliente ||
      ""
    );
  }

  function obtenerMensajeExito() {
    const mensajes = {
      "Inscripción / Matrícula":
        "Inscripción registrada correctamente.",
      Membresía:
        "Pago registrado y membresía activada correctamente.",
      Renovación:
        "Pago registrado y membresía renovada correctamente.",
      "Pase diario":
        "Pase diario registrado correctamente.",
      "Clase / Sesión individual":
        "Pago de clase individual registrado correctamente.",
      "Servicio adicional":
        "Servicio adicional registrado correctamente.",
      "Otro ingreso":
        "Ingreso registrado correctamente.",
      "Servicio de salón":
        "Servicio del salón cobrado correctamente.",
      "Servicio Contado":
        "Servicio cobrado correctamente.",
      "Venta de producto":
        "Venta registrada y producto descontado del inventario.",
      "Venta Contado":
        "Venta registrada y producto descontado del inventario.",
      "Venta Crédito":
        "Venta a crédito aplicada y producto descontado del inventario.",
      Abono:
        "Abono registrado correctamente.",
      "Cuota Crédito":
        "Cuota de crédito registrada correctamente.",
      Cancelación:
        "Cuenta cancelada y pago registrado correctamente.",
    };

    return (
      mensajes[tipoMovimiento] ||
      "Movimiento registrado correctamente."
    );
  }

  async function guardarMovimiento() {
    const empresaId = obtenerEmpresaId();

    if (!empresaId || guardando) return;

    if (!tipoMovimiento) {
      alert("Seleccione el tipo de movimiento.");
      return;
    }

    if (!fechaPago) {
      alert("Seleccione la fecha del movimiento.");
      return;
    }

    if (!monto || Number(monto) <= 0) {
      alert("Ingrese un monto válido mayor a cero.");
      return;
    }

    if (requiereCliente() && !clienteSeleccionado) {
      alert("Seleccione un cliente.");
      return;
    }

    if (esPagoDeCuenta() && !cuentaSeleccionada?.id) {
      alert(
        "Seleccione la cuenta por cobrar donde se aplicará el pago."
      );
      return;
    }

    if (
      requiereCuentaMembresia() &&
      !cuentaSeleccionada?.id
    ) {
      alert(
        "Este alumno todavía no tiene una membresía configurada. Abra Membresías y asígnele un plan antes de cobrar."
      );
      return;
    }

    if (
      esVentaConProducto() &&
      !productoSeleccionado
    ) {
      alert(
        "Seleccione un producto válido del inventario."
      );
      return;
    }

    if (
      esVentaConProducto() &&
      Number(cantidad || 0) <= 0
    ) {
      alert("Ingrese una cantidad válida.");
      return;
    }

    if (!responsable) {
      alert("No se pudo identificar al cajero responsable.");
      return;
    }

    setGuardando(true);

    if (esNegocioSalon() && agendaReservaFlujoId) {
      try {
        const puedeCobrarReserva =
          await verificarReservaAntesDeCobrar(empresaId);

        if (!puedeCobrarReserva) {
          setGuardando(false);
          await cargarReservasPendientesClienteSalon(
            empresaId,
            clienteSeleccionado?.id
          );
          return;
        }
      } catch (errorValidacionReserva) {
        setGuardando(false);
        alert(
          errorValidacionReserva?.message ||
            "No se pudo validar la reserva antes del cobro."
        );
        return;
      }
    }

    let movimientoCajaCreado = null;
    let pagoPreparado = null;
    let cuentaActualizada = cuentaSeleccionada;

    try {
      const pagoYaRegistrado =
        await reconciliarPagoPendienteExistente(
          empresaId
        );

      if (pagoYaRegistrado) {
        if (typeof window !== "undefined") {
          window.history.replaceState(
            {},
            "",
            "/caja"
          );
        }

        limpiarFormulario();

        await cargarMovimientos(
          empresaId,
          fechaDesde,
          fechaHasta
        );

        return;
      }

      const numeroTransaccion = generarTransaccion();
      const usuarioRegistro =
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("adminKonaxNombre") ||
        "Caja";

      let clienteBase = clienteSeleccionado;

      if (
        esVentaContado() &&
        (clienteSeleccionado || nombreContado.trim())
      ) {
        clienteBase =
          await asegurarClienteParaVenta(empresaId);
      }

      /*
        Venta Crédito no crea la cuenta.
        La cuenta debe existir previamente en Clientes.
      */
      if (esVentaCredito() && !clienteBase) {
        alert(
          "Seleccione el cliente y la cuenta por cobrar creada previamente."
        );
        return;
      }

      /*
        Antes de guardar se valida el inventario,
        pero todavía no se descuenta.
      */
      if (esVentaConProducto()) {
        const stockActual = stockProducto(
          productoSeleccionado
        );
        const cantidadVenta = Number(cantidad || 0);

        if (cantidadVenta <= 0) {
          alert("La cantidad debe ser mayor a cero.");
          return;
        }

        if (stockActual < cantidadVenta) {
          alert(
            `Stock insuficiente. Disponible: ${stockActual}.`
          );
          return;
        }
      }

      if (esPagoDeCuenta()) {
        pagoPreparado = await consultarPagoCuenta(
          empresaId,
          cuentaSeleccionada
        );

        if (!pagoPreparado) return;
      }

      const montoFinal = pagoPreparado
        ? pagoPreparado.montoPago
        : Number(monto || 0);

      const numeroVenta =
        cuentaSeleccionada?.numero_cuenta ||
        numeroVentaAbono.trim() ||
        (esVentaConProducto()
          ? generarNumeroVenta()
          : null);

      const detalleSaldo = pagoPreparado
        ? ` Saldo anterior: $${pagoPreparado.saldoAnterior.toFixed(
            2
          )}. Pago: $${pagoPreparado.montoPago.toFixed(
            2
          )}. Saldo nuevo: $${pagoPreparado.saldoNuevo.toFixed(
            2
          )}.`
        : "";

      const descripcionFinal =
        `${
          concepto ||
          productoSeleccionado?.nombre ||
          productoSeleccionado?.descripcion ||
          cuentaSeleccionada?.descripcion ||
          tipoMovimiento
        }.${detalleSaldo}${
          observacion ? ` Observación: ${observacion}` : ""
        }`;

      const clienteNombreFinal =
        clienteBase?.nombre ||
        clienteSeleccionado?.nombre ||
        nombreContado ||
        null;

      const clienteCedulaFinal =
        clienteBase?.cedula ||
        clienteSeleccionado?.cedula ||
        cedulaContado ||
        null;

      const clienteDireccionFinal =
        obtenerDireccionCliente(clienteBase) ||
        obtenerDireccionCliente(clienteSeleccionado) ||
        direccionContado ||
        null;

      const clienteTelefonoFinal =
        obtenerTelefonoCliente(clienteBase) ||
        obtenerTelefonoCliente(clienteSeleccionado) ||
        telefonoContado ||
        null;

      const { data: movimientoCreado, error: errorCaja } =
        await supabase
          .from("caja")
          .insert([
            {
              empresa_id: empresaId,
              tipo: tipoMovimiento,
              descripcion: descripcionFinal,
              monto: montoFinal,
              metodo_pago: metodoPago,
              usuario: usuarioRegistro,
              numero_transaccion: numeroTransaccion,
              fecha_pago: fechaPago,
              caja_estado: "Activa",
              cliente_id:
                clienteBase?.id ||
                clienteSeleccionado?.id ||
                null,
              informacion_comercial_id:
                cuentaSeleccionada?.id || null,
              agenda_reserva_id:
                agendaReservaFlujoId || null,
              numero_cuenta:
                cuentaSeleccionada?.numero_cuenta ||
                numeroVenta ||
                null,
              estado: "Procesado",
              cliente_nombre: clienteNombreFinal,
              cliente_cedula: clienteCedulaFinal,
              vendedor_responsable: responsable,
              cliente_direccion: clienteDireccionFinal,
              cliente_telefono: clienteTelefonoFinal,
            },
          ])
          .select()
          .single();

      if (errorCaja) {
        throw new Error(
          "No se pudo registrar el movimiento en caja: " +
            errorCaja.message
        );
      }

      movimientoCajaCreado = movimientoCreado;

      if (agendaReservaFlujoId) {
        const { error: errorConfirmarReserva } =
          await supabase.rpc(
            "confirmar_pago_agenda_desde_caja",
            {
              p_empresa_id: empresaId,
              p_reserva_id:
                agendaReservaFlujoId,
              p_caja_id: movimientoCreado.id,
            }
          );

        if (errorConfirmarReserva) {
          throw new Error(
            "El pago se registró, pero no se pudo confirmar la reserva: " +
              errorConfirmarReserva.message
          );
        }
      }

      if (pagoPreparado) {
        cuentaActualizada = await aplicarPagoCuenta(
          empresaId,
          pagoPreparado
        );
      }

      if (requiereCuentaMembresia()) {
        cuentaActualizada =
          await procesarMembresiaDesdeCaja(empresaId);

        if (!cuentaActualizada) {
          throw new Error(
            "No se pudo completar la actualización de la membresía."
          );
        }
      }

      /*
        Solo las ventas rebajan inventario.
        Abono, Cuota Crédito y Cancelación no lo rebajan.
      */
      if (esVentaConProducto()) {
        const inventarioOk =
          await descontarInventario(empresaId);

        if (!inventarioOk) {
          throw new Error(
            "No se pudo completar el descuento del inventario."
          );
        }
      }

      alert(
        agendaReservaFlujoId
          ? "Pago registrado y reserva confirmada correctamente."
          : obtenerMensajeExito()
      );

      if (agendaReservaFlujoId) {
        window.location.replace("/agenda");
        return;
      }

      if (typeof window !== "undefined") {
        window.history.replaceState(
          {},
          "",
          "/caja"
        );
      }

      limpiarFormulario();

      await Promise.all([
        cargarProductos(empresaId),
        cargarMovimientos(
          empresaId,
          fechaDesde,
          fechaHasta
        ),
      ]);
    } catch (error) {
      /*
        Si falló después de actualizar el saldo,
        intenta devolver la cuenta al estado anterior.
      */
      if (pagoPreparado) {
        await revertirPagoCuenta(
          empresaId,
          pagoPreparado
        );
      }

      if (movimientoCajaCreado?.id) {
        await supabase
          .from("caja")
          .delete()
          .eq("empresa_id", empresaId)
          .eq("id", movimientoCajaCreado.id);
      }

      alert(
        error.message ||
          "No se pudo completar el movimiento."
      );
    } finally {
      setGuardando(false);
    }
  }

  function limpiarFormulario() {
    const opciones =
      obtenerOpcionesMovimiento(
        `${categoriaNegocio} ${tipoNegocioEmpresa}`
      );

    setTipoMovimiento(
      esNegocioMembresia()
        ? "Pase diario"
        : esNegocioSalon()
        ? "Servicio de salón"
        : opciones[0] || ""
    );
    setFechaPago(obtenerFechaPanama());
    setMostrarOtrosCobros(false);
    setSuscripcionFlujoId("");
    setFlujoCaja("");
    setAgendaReservaFlujoId("");
    setReservasPendientesSalon([]);
    setReservaSalonSeleccionada(null);

    setBuscarCliente("");
    setResultadosBusqueda([]);
    setClienteSeleccionado(null);
    setCuentasCliente([]);
    setCuentaSeleccionada(null);

    setNombreContado("");
    setCedulaContado("");
    setDireccionContado("");
    setTelefonoContado("");

    setCodigoProducto("");
    setProductoSeleccionado(null);
    setCantidad("1");
    setValorProducto("");
    setNumeroVentaAbono("");

    setMetodoPago("Efectivo");
    setMonto("");
    setConcepto(
      esNegocioMembresia()
        ? "Pase diario"
        : esNegocioSalon()
        ? "Servicio de salón"
        : ""
    );
    setObservacion("");

    const usuarioActual =
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("nombreUsuario") ||
      localStorage.getItem("adminKonaxNombre") ||
      "";

    setResponsable(usuarioActual);
  }

  const movimientosHoy = useMemo(
    () =>
      movimientos.filter((mov) => {
        const fechaMovimiento = String(
          mov.fecha_pago || ""
        ).slice(0, 10);

        return fechaMovimiento === hoyPanama;
      }),
    [movimientos, hoyPanama]
  );

  const totalHoy = useMemo(
    () =>
      movimientosHoy.reduce(
        (total, mov) =>
          total + Number(mov.monto || 0),
        0
      ),
    [movimientosHoy]
  );

  const totalEfectivoHoy = useMemo(
    () =>
      movimientosHoy
        .filter(
          (mov) =>
            normalizar(mov.metodo_pago) ===
            "efectivo"
        )
        .reduce(
          (total, mov) =>
            total + Number(mov.monto || 0),
          0
        ),
    [movimientosHoy]
  );

  const totalDigitalHoy = useMemo(
    () =>
      movimientosHoy
        .filter(
          (mov) =>
            normalizar(mov.metodo_pago) !==
            "efectivo"
        )
        .reduce(
          (total, mov) =>
            total + Number(mov.monto || 0),
          0
        ),
    [movimientosHoy]
  );

  if (cargando) {
    return (
      <div style={estilos.loading}>
        <img src="/konax-logo.png" alt="KONAX" style={estilos.loadingLogo} />
        <strong style={estilos.loadingTitulo}>Preparando caja</strong>
      </div>
    );
  }

  return (
    <main style={estilos.pagina}>
      <div style={estilos.shell}>
        <header style={estiloResponsivo(estilos.topbar, estilosDesktop.topbar)}>
          <div style={estiloResponsivo(estilos.topbarMarca, estilosDesktop.topbarMarca)}>
            <div style={estiloResponsivo(estilos.topbarLogoCard, estilosDesktop.topbarLogoCard)}><img src="/konax-logo.png" alt="KONAX" style={estiloResponsivo(estilos.topbarLogo, estilosDesktop.topbarLogo)} /></div>
            <div style={estiloResponsivo(estilos.topbarSeparador, estilosDesktop.topbarSeparador)} />
            <div>
              <div style={estiloResponsivo(estilos.topbarModulo, estilosDesktop.topbarModulo)}>
                {esNegocioMembresia()
                  ? "💳 CAJA DEL GIMNASIO"
                  : esNegocioSalon()
                  ? "✂️ CAJA DEL SALÓN"
                  : "🧾 CAJA Y REGISTRO DE INGRESOS"}
              </div>
            </div>
            <div style={estiloResponsivo(estilos.topbarSeparador, estilosDesktop.topbarSeparador)} />
            <div>
              <h1 style={estiloResponsivo(estilos.topbarEmpresa, estilosDesktop.topbarEmpresa)}>{empresaNombre}</h1>
              <p style={estiloResponsivo(estilos.topbarTexto, estilosDesktop.topbarTexto)}>
                {esNegocioMembresia()
                  ? "Cobro de membresías, pases diarios y servicios."
                  : esNegocioSalon()
                  ? "Cobro de citas, servicios de belleza e ingresos."
                  : "Registro de pagos, ventas, servicios e ingresos."}
              </p>
            </div>
          </div>

          <button onClick={volverDashboard} style={estiloResponsivo(estilos.botonVolver, estilosDesktop.botonVolver)}>← Centro de Operaciones</button>
        </header>

        <div style={estiloResponsivo(estilos.contenido, estilosDesktop.contenido)}>
          <section style={estiloResponsivo(estilos.kpisGrid, estilosDesktop.kpisGrid)}>
            <KpiCard titulo="Movimientos hoy" valor={movimientosHoy.length} detalle="Total de transacciones" icono="▤" compacto={esEscritorioCompacto} />
            <KpiCard titulo="Total de hoy" valor={`$${totalHoy.toFixed(2)}`} detalle="Ingresos registrados" icono="💰" destacado compacto={esEscritorioCompacto} />
            <KpiCard titulo="Efectivo hoy" valor={`$${totalEfectivoHoy.toFixed(2)}`} detalle="Pago en efectivo" icono="▣" compacto={esEscritorioCompacto} />
            <KpiCard titulo="Pagos digitales" valor={`$${totalDigitalHoy.toFixed(2)}`} detalle="Tarjetas y otros medios" icono="▤" digital compacto={esEscritorioCompacto} />
          </section>

          {(esNegocioMembresia() || esNegocioSalon()) ? (
            <section style={estilos.gymCajaLayout}>
              <article id="caja-operativa-formulario" style={estiloResponsivo(estilos.gymCobroPanel, estilosDesktop.gymCobroPanel)}>
                <div style={estiloResponsivo(estilos.gymCobroEncabezado, estilosDesktop.gymCobroEncabezado)}>
                  <div>
                    <span style={estilos.gymEyebrow}>
                      REGISTRAR COBRO
                    </span>
                  </div>

                  <div style={estiloResponsivo(estilos.gymFechaCompacta, estilosDesktop.gymFechaCompacta)}>
                    <span style={estilos.label}>Fecha</span>
                    <input
                      type="date"
                      value={fechaPago}
                      onChange={(e) =>
                        setFechaPago(e.target.value)
                      }
                      style={estilos.input}
                    />
                  </div>
                </div>

                {esNegocioSalon() ? (
                  <div style={estiloResponsivo(estilos.gymAccionesPrincipales, estilosDesktop.gymAccionesPrincipales)}>
                    <button
                      type="button"
                      onClick={() =>
                        seleccionarTipoSalon("Servicio de salón")
                      }
                      style={estiloResponsivo(
                        tipoMovimiento === "Servicio de salón"
                          ? estilos.gymAccionActiva
                          : estilos.gymAccion,
                        estilosDesktop.gymAccion
                      )}
                    >
                      <span style={estiloResponsivo(estilos.gymAccionIcono, estilosDesktop.gymAccionIcono)}>✂️</span>
                      <span style={estiloResponsivo(estilos.gymAccionTexto, estilosDesktop.gymAccionTexto)}>
                        <strong>Cobrar cita / servicio</strong>
                        <small>
                          Cobra el servicio realizado al cliente
                        </small>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        seleccionarTipoSalon("Otro ingreso")
                      }
                      style={estiloResponsivo(
                        tipoMovimiento === "Otro ingreso"
                          ? estilos.gymAccionActiva
                          : estilos.gymAccion,
                        estilosDesktop.gymAccion
                      )}
                    >
                      <span style={estiloResponsivo(estilos.gymAccionIcono, estilosDesktop.gymAccionIcono)}>＋</span>
                      <span style={estiloResponsivo(estilos.gymAccionTexto, estilosDesktop.gymAccionTexto)}>
                        <strong>Otro ingreso</strong>
                        <small>
                          Registra un cobro adicional del salón
                        </small>
                      </span>
                    </button>
                  </div>
                ) : (
                <div style={estiloResponsivo(estilos.gymAccionesPrincipales, estilosDesktop.gymAccionesPrincipales)}>
                  <button
                    type="button"
                    onClick={prepararCobroMembresia}
                    style={
                      estiloResponsivo(
                        ["Membresía", "Renovación"].includes(
                          tipoMovimiento
                        )
                          ? estilos.gymAccionActiva
                          : estilos.gymAccion,
                        estilosDesktop.gymAccion
                      )
                    }
                  >
                    <span style={estiloResponsivo(estilos.gymAccionIcono, estilosDesktop.gymAccionIcono)}>🔁</span>
                    <span style={estiloResponsivo(estilos.gymAccionTexto, estilosDesktop.gymAccionTexto)}>
                      <strong>{etiquetaAccionMembresia()}</strong>
                      <small>
                        {clienteSeleccionado
                          ? cuentaSeleccionada?.id
                            ? "Usa el plan asignado al alumno"
                            : "Abre la configuración de membresía"
                          : "Selecciona primero al alumno"}
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      seleccionarTipoGimnasio("Pase diario")
                    }
                    style={
                      estiloResponsivo(
                        tipoMovimiento === "Pase diario"
                          ? estilos.gymAccionActiva
                          : estilos.gymAccion,
                        estilosDesktop.gymAccion
                      )
                    }
                  >
                    <span style={estiloResponsivo(estilos.gymAccionIcono, estilosDesktop.gymAccionIcono)}>🎟️</span>
                    <span style={estiloResponsivo(estilos.gymAccionTexto, estilosDesktop.gymAccionTexto)}>
                      <strong>Pase diario</strong>
                      <small>
                        Registra una entrada sin renovar membresía
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarOtrosCobros(
                        (actual) => !actual
                      )
                    }
                    style={
                      estiloResponsivo(
                        mostrarOtrosCobros ||
                        obtenerOtrosCobrosGimnasio().includes(
                          tipoMovimiento
                        )
                          ? estilos.gymAccionActiva
                          : estilos.gymAccion,
                        estilosDesktop.gymAccion
                      )
                    }
                  >
                    <span style={estiloResponsivo(estilos.gymAccionIcono, estilosDesktop.gymAccionIcono)}>＋</span>
                    <span style={estiloResponsivo(estilos.gymAccionTexto, estilosDesktop.gymAccionTexto)}>
                      <strong>Otro cobro</strong>
                      <small>
                        Inscripción, clase, servicio o producto
                      </small>
                    </span>
                  </button>
                </div>

                )}

                {!esNegocioSalon() && mostrarOtrosCobros && (
                  <div style={estiloResponsivo(estilos.gymOtrosCobros, estilosDesktop.gymOtrosCobros)}>
                    {obtenerOtrosCobrosGimnasio().map(
                      (opcion) => (
                        <button
                          key={opcion}
                          type="button"
                          onClick={() =>
                            seleccionarTipoGimnasio(opcion)
                          }
                          style={
                            tipoMovimiento === opcion
                              ? estilos.gymOtroActivo
                              : estilos.gymOtro
                          }
                        >
                          {opcion}
                        </button>
                      )
                    )}
                  </div>
                )}

                <section style={estiloResponsivo(estilos.gymBloque, estilosDesktop.gymBloque)}>
                  <div style={estiloResponsivo(estilos.gymBloqueCabecera, estilosDesktop.gymBloqueCabecera)}>
                    <div>
                      <span style={estilos.gymEyebrow}>
                        {esNegocioSalon() ? "CLIENTE" : "ALUMNO"}
                      </span>
                      <h3 style={estiloResponsivo(estilos.gymBloqueTitulo, estilosDesktop.gymBloqueTitulo)}>
                        {esNegocioSalon()
                          ? "Buscar por nombre o teléfono"
                          : "Buscar por nombre, teléfono o cédula"}
                      </h3>
                    </div>

                    <span style={estilos.gymOpcional}>
                      {requiereCliente()
                        ? "Requerido"
                        : "Opcional"}
                    </span>
                  </div>

                  <div style={estiloResponsivo(estilos.gymBuscarFila, estilosDesktop.gymBuscarFila)}>
                    <input
                      placeholder="Escriba mínimo 3 caracteres"
                      value={buscarCliente}
                      onChange={(e) =>
                        setBuscarCliente(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          buscarClientes();
                        }
                      }}
                      style={estilos.input}
                    />
                    <button
                      type="button"
                      onClick={buscarClientes}
                      style={estiloResponsivo(estilos.gymBuscarBoton, estilosDesktop.gymBuscarBoton)}
                    >
                      Buscar
                    </button>
                  </div>

                  {resultadosBusqueda.length > 0 && (
                    <div style={estilos.gymResultados}>
                      {resultadosBusqueda.map(
                        (item, index) => (
                          <button
                            key={`${item.cliente.id}-${index}`}
                            type="button"
                            onClick={() =>
                              seleccionarResultado(item)
                            }
                            style={estilos.gymResultado}
                          >
                            <span style={estilos.gymResultadoAvatar}>
                              {String(
                                item.cliente.nombre || "A"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                            <span style={estilos.gymResultadoTexto}>
                              <strong>
                                {item.cliente.nombre}
                              </strong>
                              <small>
                                {item.cliente.telefono ||
                                  item.cliente.celular ||
                                  item.cliente.cedula ||
                                  "Sin teléfono registrado"}
                              </small>
                            </span>
                            <span style={estilos.gymResultadoFlecha}>
                              →
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {clienteSeleccionado ? (
                    <div style={estiloResponsivo(estilos.gymAlumnoCard, estilosDesktop.gymAlumnoCard)}>
                      <div style={estiloResponsivo(estilos.gymAlumnoSuperior, estilosDesktop.gymAlumnoSuperior)}>
                        <div style={estilos.gymAlumnoIdentidad}>
                          <span style={estiloResponsivo(estilos.gymAlumnoAvatar, estilosDesktop.gymAlumnoAvatar)}>
                            {String(
                              clienteSeleccionado.nombre || "A"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <div>
                            <strong style={estiloResponsivo(estilos.gymAlumnoNombre, estilosDesktop.gymAlumnoNombre)}>
                              {clienteSeleccionado.nombre}
                            </strong>
                            <span style={estilos.gymAlumnoDato}>
                              {obtenerTelefonoCliente(
                                clienteSeleccionado
                              ) || "Sin teléfono"}
                              {" · "}
                              {clienteSeleccionado.cedula ||
                                "Sin cédula"}
                            </span>
                          </div>
                        </div>

                        <div style={estilos.gymAlumnoAcciones}>
                          {esNegocioSalon() ? (
                            <span style={estilos.gymEstadoMembresia}>
                              Cliente seleccionado
                            </span>
                          ) : (
                            <span
                              style={{
                                ...estilos.gymEstadoMembresia,
                                color:
                                  obtenerEstadoMembresiaVisual()
                                    .color,
                                background:
                                  obtenerEstadoMembresiaVisual()
                                    .fondo,
                              }}
                            >
                              {
                                obtenerEstadoMembresiaVisual()
                                  .etiqueta
                              }
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={limpiarAlumnoGimnasio}
                            style={estilos.gymQuitarAlumno}
                          >
                            {esNegocioSalon()
                              ? "Cambiar cliente"
                              : "Cambiar alumno"}
                          </button>
                        </div>
                      </div>

                      {!esNegocioSalon() && cuentasCliente.length > 1 && (
                        <div style={estilos.gymCuentaSelector}>
                          <span style={estilos.label}>
                            Membresía o cuenta
                          </span>
                          <select
                            value={
                              cuentaSeleccionada?.id || ""
                            }
                            onChange={(e) => {
                              const cuenta =
                                cuentasCliente.find(
                                  (item) =>
                                    String(item.id) ===
                                    String(e.target.value)
                                );

                              setCuentaSeleccionada(
                                cuenta || null
                              );

                              if (
                                cuenta &&
                                [
                                  "Membresía",
                                  "Renovación",
                                ].includes(tipoMovimiento)
                              ) {
                                const sugerido = Number(
                                  cuenta.cuota ||
                                    cuenta.monto_cuota ||
                                    cuenta.monto_total ||
                                    cuenta.saldo_actual ||
                                    0
                                );

                                setMonto(
                                  sugerido > 0
                                    ? sugerido.toFixed(2)
                                    : ""
                                );
                              }
                            }}
                            style={estilos.input}
                          >
                            {cuentasCliente.map((cuenta) => (
                              <option
                                key={cuenta.id}
                                value={cuenta.id}
                              >
                                {cuenta.descripcion ||
                                  cuenta.numero_cuenta ||
                                  "Membresía"}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {esNegocioSalon() && (
                        <div style={estilos.agendaCobroBloque}>
                          <div style={estilos.agendaCobroHeader}>
                            <div>
                              <span style={estilos.gymEyebrow}>
                                CITAS PENDIENTES DE PAGO
                              </span>
                              <strong style={estilos.agendaCobroTitulo}>
                                {reservasPendientesSalon.length
                                  ? "Selecciona la cita que vas a cobrar"
                                  : "Este cliente no tiene citas pendientes de pago"}
                              </strong>
                            </div>

                            {reservaSalonSeleccionada?.id && (
                              <span style={estilos.agendaCobroSeleccionada}>
                                Cita seleccionada
                              </span>
                            )}
                          </div>

                          {reservasPendientesSalon.length > 0 && (
                            <div style={estilos.agendaCobroLista}>
                              {reservasPendientesSalon.map((reserva) => {
                                const activa =
                                  String(reservaSalonSeleccionada?.id || "") ===
                                  String(reserva.id);

                                return (
                                  <button
                                    key={reserva.id}
                                    type="button"
                                    onClick={() =>
                                      prepararReservaSalonParaCobro(reserva)
                                    }
                                    style={{
                                      ...estilos.agendaCobroItem,
                                      ...(activa
                                        ? estilos.agendaCobroItemActivo
                                        : {}),
                                    }}
                                  >
                                    <span>
                                      <strong>
                                        {reserva.servicio_nombre}
                                      </strong>
                                      <small>
                                        {String(
                                          reserva.fecha_reserva || ""
                                        ).slice(0, 10)}
                                        {" · "}
                                        {String(
                                          reserva.hora_inicio || ""
                                        ).slice(0, 5)}
                                      </small>
                                    </span>

                                    <strong>
                                      ${Number(
                                        reserva.monto || 0
                                      ).toFixed(2)}
                                    </strong>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {!esNegocioSalon() && (
                        <>
                          <div style={estiloResponsivo(estilos.gymAlumnoResumen, estilosDesktop.gymAlumnoResumen)}>
                        <MiniStat
                          label="Plan"
                          value={
                            cuentaSeleccionada?.descripcion ||
                            "Sin plan asignado"
                          }
                        />
                        <MiniStat
                          label="Vencimiento"
                          value={
                            cuentaSeleccionada?.fecha_vencimiento
                              ? String(
                                  cuentaSeleccionada.fecha_vencimiento
                                ).slice(0, 10)
                              : "-"
                          }
                        />
                        <MiniStat
                          label="Monto"
                          value={`$${Number(
                            cuentaSeleccionada?.cuota ||
                              cuentaSeleccionada?.monto_total ||
                              0
                          ).toFixed(2)}`}
                          resaltado
                        />
                        <MiniStat
                          label="Saldo"
                          value={`$${Number(
                            cuentaSeleccionada?.saldo_actual || 0
                          ).toFixed(2)}`}
                        />
                      </div>

                      {!cuentaSeleccionada?.id && (
                        <div style={estilos.gymSinMembresia}>
                          <span>
                            Este alumno no tiene una membresía
                            vinculada.
                          </span>
                          <button
                            type="button"
                            onClick={prepararCobroMembresia}
                            style={estilos.gymConfigurarMembresia}
                          >
                            Configurar membresía
                          </button>
                        </div>
                      )}
                        </>
                      )}

                    </div>
                  ) : (
                    <div style={estiloResponsivo(estilos.gymAlumnoVacio, estilosDesktop.gymAlumnoVacio)}>
                      <span style={estiloResponsivo(estilos.gymAlumnoVacioIcono, estilosDesktop.gymAlumnoVacioIcono)}>
                        👤
                      </span>
                      <div>
                        <strong>
                          {esNegocioSalon()
                            ? "No hay un cliente seleccionado"
                            : "No hay un alumno seleccionado"}
                        </strong>
                        <p>
                          {esNegocioSalon()
                            ? tipoMovimiento === "Servicio de salón"
                              ? "Busca y selecciona al cliente para cobrar el servicio. Si la cita viene desde Agenda se cargará automáticamente."
                              : "Para otro ingreso puedes continuar sin seleccionar un cliente."
                            : "Para pases diarios y otros ingresos puede continuar sin alumno. Para membresías e inscripciones debe seleccionarlo."}
                        </p>
                      </div>
                    </div>
                  )}
                </section>

                {esVentaConProducto() && (
                  <section style={estiloResponsivo(estilos.gymBloque, estilosDesktop.gymBloque)}>
                    <div style={estiloResponsivo(estilos.gymBloqueCabecera, estilosDesktop.gymBloqueCabecera)}>
                      <div>
                        <span style={estilos.gymEyebrow}>
                          PRODUCTO
                        </span>
                        <h3 style={estiloResponsivo(estilos.gymBloqueTitulo, estilosDesktop.gymBloqueTitulo)}>
                          Seleccione el artículo a vender
                        </h3>
                      </div>
                      <span style={estilos.gymInventarioAviso}>
                        Descuenta inventario
                      </span>
                    </div>

                    <div style={estiloResponsivo(estilos.gymProductoGrid, estilosDesktop.gymProductoGrid)}>
                      <Campo label="Producto">
                        <select
                          value={
                            productoSeleccionado?.id || ""
                          }
                          onChange={(e) => {
                            const producto = productos.find(
                              (item) =>
                                String(item.id) ===
                                String(e.target.value)
                            );
                            seleccionarProducto(
                              producto || null
                            );
                          }}
                          style={estilos.input}
                        >
                          <option value="">
                            Seleccione un producto
                          </option>
                          {productos.map((producto) => (
                            <option
                              key={producto.id}
                              value={producto.id}
                            >
                              {producto.codigo} - {producto.nombre}
                              {" · "}Stock {stockProducto(producto)}
                            </option>
                          ))}
                        </select>
                      </Campo>

                      <Campo label="Cantidad">
                        <input
                          type="number"
                          min="1"
                          value={cantidad}
                          onChange={(e) =>
                            setCantidad(e.target.value)
                          }
                          style={estilos.input}
                        />
                      </Campo>

                      <Campo label="Total del producto">
                        <input
                          value={valorProducto}
                          readOnly
                          style={estilos.inputReadOnly}
                        />
                      </Campo>
                    </div>
                  </section>
                )}

                <section style={estiloResponsivo(estilos.gymBloque, estilosDesktop.gymBloque)}>
                  <div style={estiloResponsivo(estilos.gymBloqueCabecera, estilosDesktop.gymBloqueCabecera)}>
                    <div>
                      <span style={estilos.gymEyebrow}>
                        DETALLE DEL PAGO
                      </span>
                      <h3 style={estiloResponsivo(estilos.gymBloqueTitulo, estilosDesktop.gymBloqueTitulo)}>
                        Complete únicamente lo necesario
                      </h3>
                    </div>
                  </div>

                  <div style={estiloResponsivo(estilos.gymPagoGrid, estilosDesktop.gymPagoGrid)}>
                    <Campo label="Método de pago">
                      <select
                        value={metodoPago}
                        onChange={(e) =>
                          setMetodoPago(e.target.value)
                        }
                        style={estilos.input}
                      >
                        <option>Efectivo</option>
                        <option>Yappy</option>
                        <option>Transferencia</option>
                        <option>Tarjeta</option>
                        <option>Cheque</option>
                        <option>Otro</option>
                      </select>
                    </Campo>

                    <Campo label="Monto">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={monto}
                        onChange={(e) =>
                          setMonto(e.target.value)
                        }
                        style={estiloResponsivo(estilos.gymMontoInput, estilosDesktop.gymMontoInput)}
                        placeholder="0.00"
                      />
                    </Campo>

                    <Campo label="Concepto">
                      <input
                        value={concepto}
                        onChange={(e) =>
                          setConcepto(e.target.value)
                        }
                        style={estilos.input}
                        placeholder={esNegocioSalon() ? "Ej. Corte, manicure o pedicure" : "Ej. Pase diario"}
                      />
                    </Campo>

                    <Campo label="Cajero">
                      <input
                        value={responsable}
                        readOnly
                        style={estilos.inputResponsable}
                      />
                    </Campo>

                    <Campo label="Observación">
                      <input
                        value={observacion}
                        onChange={(e) =>
                          setObservacion(e.target.value)
                        }
                        style={estilos.input}
                        placeholder="Opcional"
                      />
                    </Campo>
                  </div>

                  <div style={estiloResponsivo(estilos.gymAccionesCobro, estilosDesktop.gymAccionesCobro)}>
                    <button
                      type="button"
                      onClick={guardarMovimiento}
                      disabled={guardando}
                      style={estiloResponsivo(estilos.gymRegistrarPago, estilosDesktop.gymRegistrarPago)}
                    >
                      {guardando
                        ? "Procesando..."
                        : `Registrar pago${
                            monto
                              ? ` · $${Number(
                                  monto || 0
                                ).toFixed(2)}`
                              : ""
                          }`}
                    </button>

                    <button
                      type="button"
                      onClick={limpiarFormulario}
                      disabled={guardando}
                      style={estiloResponsivo(estilos.gymLimpiar, estilosDesktop.gymLimpiar)}
                    >
                      Limpiar
                    </button>
                  </div>
                </section>
              </article>

            </section>
          ) : (
          <section style={estilos.panelGrid}>
            <div style={estilos.columnaIzquierda}>
              <article style={estilos.panel}>
                <TituloPanel icono="🗓️" titulo="A. Nuevo movimiento" />
                <div style={estilos.nuevoMovimientoGrid}>
                  <Campo label="Fecha">
                    <input type="date" value={fechaPago} onChange={(e)=>setFechaPago(e.target.value)} style={estilos.input} />
                  </Campo>
                  <div>
                    <span style={estilos.label}>Tipo de movimiento</span>
                    <div style={estilos.tabsMovimiento}>
                      {opcionesMovimiento.map((opcion)=>(
                        <button
                          key={opcion}
                          onClick={()=>{
                            setTipoMovimiento(opcion);
                            setMonto("");
                            setValorProducto("");
                            setCodigoProducto("");
                            setProductoSeleccionado(null);
                            setNumeroVentaAbono("");
                            setClienteSeleccionado(null);
                            setCuentasCliente([]);
                            setCuentaSeleccionada(null);
                          }}
                          style={tipoMovimiento===opcion?estilos.tabActivo:estilos.tab}
                        >
                          {opcion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </article>

              {(requiereCliente() || clienteEsOpcional() || esVentaContado()) && (
                <article style={estilos.panel}>
                  <TituloPanel
                    icono="👤"
                    titulo={
                      esNegocioSalon()
                        ? "B. Cliente de la cita"
                        : "B. Cliente y cuenta"
                    }
                  />
                  <div style={estilos.buscarClienteFila}>
                    <input
                      placeholder={
                        esNegocioSalon()
                          ? "Buscar cliente por nombre o teléfono"
                          : "Buscar cliente"
                      }
                      value={buscarCliente}
                      onChange={(e)=>setBuscarCliente(e.target.value)}
                      style={estilos.input}
                    />
                    <button onClick={buscarClientes} style={estilos.botonBuscar}>⌕</button>
                  </div>

                  {resultadosBusqueda.length>0 && (
                    <div style={estilos.resultadosBox}>
                      {resultadosBusqueda.map((item,index)=>(
                        <button key={`${item.cliente.id}-${index}`} onClick={()=>seleccionarResultado(item)} style={estilos.resultadoItem}>
                          <strong>{item.cliente.nombre}</strong>
                          <span>{item.cuenta?.numero_cuenta || "Seleccionar"}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={estilos.clienteCard}>
                    <div style={estilos.clienteDatosFila}>
                      <div style={estilos.avatarCliente}>●</div>
                      <div style={estilos.clienteInfo}>
                        <strong style={estilos.clienteNombre}>{clienteSeleccionado?.nombre || nombreContado || "Cliente no seleccionado"}</strong>
                        <span>Cédula: {clienteSeleccionado?.cedula || cedulaContado || "-"}</span>
                        <span>Tel.: {obtenerTelefonoCliente(clienteSeleccionado) || telefonoContado || "-"}</span>
                      </div>
                      <div style={estilos.cuentaSelectorWrap}>
                        <span style={estilos.label}>Cuenta</span>
                        <select
                          value={cuentaSeleccionada?.id || ""}
                          onChange={(e)=>{
                            const cuenta=cuentasCliente.find((item)=>String(item.id)===String(e.target.value));
                            setCuentaSeleccionada(cuenta || null);
                          }}
                          style={estilos.input}
                        >
                          <option value="">Cuenta principal</option>
                          {cuentasCliente.map((cuenta)=>(
                            <option key={cuenta.id} value={cuenta.id}>{cuenta.numero_cuenta} - {cuenta.descripcion}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={estilos.cuentaStats}>
                      <MiniStat label="Monto original" value={`$${Number(cuentaSeleccionada?.monto_total || 0).toFixed(2)}`} />
                      <MiniStat label="Saldo actual" value={`$${Number(cuentaSeleccionada?.saldo_actual || 0).toFixed(2)}`} resaltado />
                      <MiniStat label="Cuota" value={`$${Number(cuentaSeleccionada?.cuota || 0).toFixed(2)}`} />
                      <MiniStat label="Estado" value={cuentaSeleccionada?.estado || "Activa"} estado />
                    </div>
                  </div>
                </article>
              )}
            </div>

            <div style={estilos.columnaDerecha}>
              {esVentaConProducto() && (
                <article style={estilos.panel}>
                  <TituloPanel icono="📦" titulo="C. Producto e inventario" />
                  <div style={estilos.productoGrid}>
                    <div style={estilos.codigoProductoBloque}>
                      <Campo label="Código del producto">
                        <input value={codigoProducto} onChange={(e)=>seleccionarProductoPorCodigo(e.target.value)} placeholder="Ej. 12345" style={estilos.input} />
                      </Campo>

                      <div style={estilos.miniaturaProductoCampo}>
                        <span style={estilos.label}>Imagen del producto</span>
                        <div style={estilos.miniaturaProductoBox}>
                          {obtenerImagenProducto(productoSeleccionado) ? (
                            <img
                              src={obtenerImagenProducto(productoSeleccionado)}
                              alt={productoSeleccionado?.nombre || "Producto"}
                              style={estilos.miniaturaProducto}
                              onError={(e)=>{
                                e.currentTarget.style.display="none";
                                const siguiente=e.currentTarget.nextElementSibling;
                                if(siguiente) siguiente.style.display="grid";
                              }}
                            />
                          ) : null}
                          <span
                            style={{
                              ...estilos.miniaturaSinImagen,
                              display: obtenerImagenProducto(productoSeleccionado) ? "none" : "grid",
                            }}
                          >
                            📦
                          </span>
                        </div>
                      </div>
                    </div>

                    <Campo label="Seleccionar producto">
                      <select
                        value={productoSeleccionado?.id || ""}
                        onChange={(e)=>{
                          const producto=productos.find((item)=>String(item.id)===String(e.target.value));
                          seleccionarProducto(producto || null);
                        }}
                        style={estilos.input}
                      >
                        <option value="">Seleccione un producto</option>
                        {productos.map((producto)=>(
                          <option key={producto.id} value={producto.id}>{producto.codigo} - {producto.nombre} - Stock {stockProducto(producto)}</option>
                        ))}
                      </select>
                    </Campo>

                    <Campo label="Cantidad">
                      <input type="number" min="1" value={cantidad} onChange={(e)=>setCantidad(e.target.value)} style={estilos.input} />
                    </Campo>
                    <Campo label="Valor total">
                      <input value={valorProducto} readOnly style={estilos.inputReadOnly} />
                    </Campo>
                  </div>
                </article>
              )}

              <article style={estilos.panel}>
                <TituloPanel
                  icono="💳"
                  titulo={
                    esNegocioSalon()
                      ? "D. Cobro del servicio"
                      : "D. Detalle del cobro"
                  }
                />
                <div style={estilos.cobroGrid}>
                  <Campo label="Método de pago">
                    <select value={metodoPago} onChange={(e)=>setMetodoPago(e.target.value)} style={estilos.input}>
                      <option>Efectivo</option><option>Transferencia</option><option>Yappy</option><option>Tarjeta</option><option>Cheque</option><option>Otro</option>
                    </select>
                  </Campo>
                  <Campo label="Monto">
                    <input type="number" min="0" step="0.01" value={monto} readOnly={esCancelacion()} onChange={(e)=>setMonto(e.target.value)} style={esCancelacion()?estilos.inputReadOnly:estilos.input} />
                  </Campo>
                  <Campo label="Concepto">
                    <input value={concepto} onChange={(e)=>setConcepto(e.target.value)} style={estilos.input} />
                  </Campo>
                  <Campo label="Cajero responsable">
                    <input
                      value={responsable}
                      readOnly
                      title={responsable || "Cajero no identificado"}
                      style={estilos.inputResponsable}
                    />
                  </Campo>
                  <Campo label="Observación">
                    <input value={observacion} onChange={(e)=>setObservacion(e.target.value)} placeholder="Observaciones adicionales (opcional)" style={estilos.input} />
                  </Campo>
                </div>
                <div style={estilos.accionesFila}>
                  <button onClick={guardarMovimiento} disabled={guardando} style={estilos.botonPrincipal}>{guardando?"Procesando...":"▣ Registrar movimiento"}</button>
                  <button onClick={limpiarFormulario} disabled={guardando} style={estilos.botonLimpiar}>▤ Limpiar formulario</button>
                </div>
              </article>
            </div>
          </section>

          )}
          {(esNegocioMembresia() || esNegocioSalon()) ? (
            <article style={estiloResponsivo(estilos.gymMovimientosPanel, estilosDesktop.gymMovimientosPanel)}>
              <div style={estiloResponsivo(estilos.gymMovimientosHeader, estilosDesktop.gymMovimientosHeader)}>
                <div>
                  <span style={estilos.gymEyebrow}>
                    MOVIMIENTOS DE CAJA
                  </span>
                  <h2 style={estilos.gymMovimientosTitulo}>
                    Cobros registrados
                  </h2>
                </div>

                <div style={estilos.gymFiltros}>
                  <label style={estilos.gymFiltroCampo}>
                    <span>Desde</span>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) =>
                        setFechaDesde(e.target.value)
                      }
                      style={estilos.inputCompacto}
                    />
                  </label>

                  <label style={estilos.gymFiltroCampo}>
                    <span>Hasta</span>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) =>
                        setFechaHasta(e.target.value)
                      }
                      style={estilos.inputCompacto}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={buscarMovimientosPorFecha}
                    style={estilos.gymFiltrarBoton}
                  >
                    {filtrandoMovimientos
                      ? "Buscando..."
                      : "Filtrar"}
                  </button>

                  <button
                    type="button"
                    onClick={mostrarMovimientosHoy}
                    style={estilos.gymHoyBoton}
                  >
                    Ver hoy
                  </button>
                </div>
              </div>

              <div style={estilos.gymMovimientosLista}>
                {movimientos.length === 0 ? (
                  <div style={estilos.gymMovimientoVacio}>
                    No hay movimientos en el período seleccionado.
                  </div>
                ) : (
                  movimientos.map((movimiento) => (
                    <article
                      key={movimiento.id}
                      style={estiloResponsivo(estilos.gymMovimientoItem, estilosDesktop.gymMovimientoItem)}
                    >
                      <div style={estilos.gymMovimientoFecha}>
                        <strong>
                          {String(
                            movimiento.fecha_pago ||
                              movimiento.created_at ||
                              ""
                          ).slice(8, 10) || "--"}
                        </strong>
                        <span>
                          {String(
                            movimiento.fecha_pago ||
                              movimiento.created_at ||
                              ""
                          ).slice(0, 7)}
                        </span>
                      </div>

                      <div style={estilos.gymMovimientoPrincipal}>
                        <strong>
                          {movimiento.cliente_nombre ||
                            (esNegocioSalon()
                              ? "Ingreso sin cliente"
                              : "Ingreso sin alumno")}
                        </strong>
                        <span>
                          {movimiento.tipo} ·{" "}
                          {movimiento.metodo_pago}
                        </span>
                      </div>

                      <div style={estilos.gymMovimientoResponsable}>
                        <span>Cajero</span>
                        <strong>
                          {movimiento.vendedor_responsable ||
                            movimiento.usuario ||
                            "-"}
                        </strong>
                      </div>

                      <div style={estilos.gymMovimientoMonto}>
                        <strong>
                          ${Number(
                            movimiento.monto || 0
                          ).toFixed(2)}
                        </strong>
                        <span>
                          {movimiento.estado || "Procesado"}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </article>
          ) : (
          <article style={estilos.panelTabla}>
            <div style={estilos.tablaHeaderRow}>
              <TituloPanel icono="📋" titulo="Movimientos registrados" />
              <div style={estilos.filtrosInline}>
                <span>Desde</span>
                <input type="date" value={fechaDesde} onChange={(e)=>setFechaDesde(e.target.value)} style={estilos.inputCompacto} />
                <span>Hasta</span>
                <input type="date" value={fechaHasta} onChange={(e)=>setFechaHasta(e.target.value)} style={estilos.inputCompacto} />
                <input placeholder="Buscar movimientos" style={estilos.inputBuscarTabla} />
                <button onClick={buscarMovimientosPorFecha} style={estilos.botonBuscarMovimientos}>{filtrandoMovimientos?"Buscando...":"⌕"}</button>
                <button onClick={mostrarMovimientosHoy} style={estilos.botonHoy}>▣ Ver hoy</button>
              </div>
            </div>

            <div style={estilos.tablaBox}>
              <table style={estilos.tabla}>
                <thead><tr>
                  <th style={estilos.th}>Fecha</th><th style={estilos.th}>Transacción</th><th style={estilos.th}>Cliente</th><th style={estilos.th}>Cuenta</th><th style={estilos.th}>Tipo</th><th style={estilos.th}>Método</th><th style={estilos.th}>Monto</th><th style={estilos.th}>Responsable</th><th style={estilos.th}>Estado</th><th style={estilos.th}>Acciones</th>
                </tr></thead>
                <tbody>
                  {movimientos.length===0?(
                    <tr><td colSpan="10" style={estilos.tdVacio}>No hay movimientos en el periodo seleccionado.</td></tr>
                  ):movimientos.map((movimiento)=>(
                    <tr key={movimiento.id}>
                      <td style={estilos.td}>{String(movimiento.fecha_pago || movimiento.created_at || "").slice(0,10)}</td>
                      <td style={estilos.td}>{movimiento.numero_transaccion || "-"}</td>
                      <td style={estilos.td}>{movimiento.cliente_nombre || "-"}</td>
                      <td style={estilos.td}>{movimiento.numero_cuenta || "-"}</td>
                      <td style={estilos.td}><span style={estilos.badgeTipo}>{movimiento.tipo}</span></td>
                      <td style={estilos.td}>{movimiento.metodo_pago}</td>
                      <td style={estilos.td}><strong>${Number(movimiento.monto || 0).toFixed(2)}</strong></td>
                      <td style={estilos.tdResponsable} title={movimiento.vendedor_responsable || "-"}>{movimiento.vendedor_responsable || "-"}</td>
                      <td style={estilos.td}><span style={estilos.badgeEstado}>● {movimiento.estado || "Procesado"}</span></td>
                      <td style={estilos.td}>◉ ✎ ⎙</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          )}
        </div>
      </div>
    </main>
  );
}

function Campo({label,children}){
  return <label style={estilos.campo}><span style={estilos.label}>{label}</span>{children}</label>;
}

function TituloPanel({icono,titulo}){
  return <div style={estilos.tituloPanel}><span style={estilos.tituloPanelIcono}>{icono}</span><h2 style={estilos.tituloPanelTexto}>{titulo}</h2></div>;
}

function KpiCard({
  titulo,
  valor,
  detalle,
  icono,
  destacado,
  digital,
  compacto = false,
}){
  const cardBase = destacado
    ? estilos.kpiDestacado
    : estilos.kpiCard;

  const iconoBase = digital
    ? estilos.kpiIconoDigital
    : estilos.kpiIcono;

  return (
    <article
      style={
        compacto
          ? { ...cardBase, ...estilosDesktop.kpiCard }
          : cardBase
      }
    >
      <div
        style={
          compacto
            ? { ...iconoBase, ...estilosDesktop.kpiIcono }
            : iconoBase
        }
      >
        {icono}
      </div>

      <div>
        <span
          style={
            compacto
              ? { ...estilos.kpiTitulo, ...estilosDesktop.kpiTitulo }
              : estilos.kpiTitulo
          }
        >
          {titulo}
        </span>

        <strong
          style={
            compacto
              ? { ...estilos.kpiValor, ...estilosDesktop.kpiValor }
              : estilos.kpiValor
          }
        >
          {valor}
        </strong>

        <small
          style={
            compacto
              ? {
                  ...(destacado
                    ? estilos.kpiDetalleClaro
                    : estilos.kpiDetalle),
                  ...estilosDesktop.kpiDetalle,
                }
              : destacado
              ? estilos.kpiDetalleClaro
              : estilos.kpiDetalle
          }
        >
          {detalle}
        </small>
      </div>
    </article>
  );
}

function MiniStat({label,value,resaltado,estado}){
  return <div style={resaltado?estilos.miniStatResaltado:estilos.miniStat}><span>{label}</span><strong style={estado?estilos.estadoActivo:undefined}>{estado?`● ${value}`:value}</strong></div>;
}

const estilosDesktop = {
  topbar:{
    minHeight:"68px",
    padding:"8px 16px"
  },
  topbarMarca:{
    gap:"11px"
  },
  topbarLogoCard:{
    padding:"7px 12px",
    minHeight:"52px",
    borderRadius:"15px"
  },
  topbarLogo:{
    width:"156px",
    height:"42px"
  },
  topbarSeparador:{
    height:"32px"
  },
  topbarModulo:{
    fontSize:"10px"
  },
  topbarEmpresa:{
    fontSize:"19px"
  },
  topbarTexto:{
    margin:"2px 0 0",
    fontSize:"10px"
  },
  botonVolver:{
    minHeight:"36px",
    padding:"0 13px",
    fontSize:"11px"
  },
  contenido:{
    padding:"10px 12px"
  },
  kpisGrid:{
    gap:"8px",
    marginBottom:"8px"
  },
  kpiCard:{
    gridTemplateColumns:"46px 1fr",
    gap:"9px",
    padding:"10px 12px",
    minHeight:"66px",
    borderRadius:"12px"
  },
  kpiIcono:{
    width:"40px",
    height:"40px",
    fontSize:"18px",
    borderRadius:"12px"
  },
  kpiTitulo:{
    fontSize:"10px"
  },
  kpiValor:{
    marginTop:"2px",
    fontSize:"21px"
  },
  kpiDetalle:{
    marginTop:"2px",
    fontSize:"9px"
  },
  gymCobroPanel:{
    padding:"10px 12px",
    borderRadius:"15px"
  },
  gymCobroEncabezado:{
    marginBottom:"7px",
    gap:"8px"
  },
  gymFechaCompacta:{
    gap:"3px"
  },
  gymAccionesPrincipales:{
    gap:"7px",
    marginBottom:"7px"
  },
  gymAccion:{
    minHeight:"62px",
    padding:"8px 10px",
    gridTemplateColumns:"34px minmax(0,1fr)",
    gap:"8px",
    borderRadius:"11px"
  },
  gymAccionIcono:{
    width:"34px",
    height:"34px",
    borderRadius:"9px",
    fontSize:"16px"
  },
  gymAccionTexto:{
    gap:"1px",
    fontSize:"11px"
  },
  gymOtrosCobros:{
    gap:"5px",
    padding:"7px",
    marginBottom:"7px"
  },
  gymBloque:{
    marginTop:"7px",
    padding:"10px 12px",
    borderRadius:"12px"
  },
  gymBloqueCabecera:{
    marginBottom:"7px",
    gap:"8px"
  },
  gymBloqueTitulo:{
    margin:"3px 0 0",
    fontSize:"15px"
  },
  gymBuscarFila:{
    gap:"6px"
  },
  gymBuscarBoton:{
    minWidth:"72px",
    minHeight:"36px",
    padding:"0 12px",
    fontSize:"11px"
  },
  gymAlumnoCard:{
    marginTop:"7px",
    padding:"9px 10px",
    borderRadius:"11px"
  },
  gymAlumnoSuperior:{
    gap:"8px"
  },
  gymAlumnoAvatar:{
    width:"38px",
    height:"38px",
    borderRadius:"10px",
    fontSize:"16px"
  },
  gymAlumnoNombre:{
    fontSize:"14px"
  },
  gymAlumnoResumen:{
    marginTop:"7px",
    gap:"6px"
  },
  gymAlumnoVacio:{
    marginTop:"7px",
    padding:"9px 10px",
    gridTemplateColumns:"34px minmax(0,1fr)",
    gap:"8px",
    borderRadius:"10px"
  },
  gymAlumnoVacioIcono:{
    width:"34px",
    height:"34px",
    borderRadius:"9px",
    fontSize:"15px"
  },
  gymProductoGrid:{
    gap:"7px"
  },
  gymPagoGrid:{
    gridTemplateColumns:"repeat(5,minmax(0,1fr))",
    gap:"7px"
  },
  gymMontoInput:{
    minHeight:"38px",
    padding:"7px 9px",
    borderRadius:"9px",
    fontSize:"18px"
  },
  gymAccionesCobro:{
    marginTop:"8px",
    gap:"7px"
  },
  gymRegistrarPago:{
    minHeight:"38px",
    borderRadius:"9px",
    fontSize:"12px"
  },
  gymLimpiar:{
    minHeight:"38px",
    borderRadius:"9px",
    fontSize:"11px"
  },
  gymMovimientosPanel:{
    marginTop:"8px",
    padding:"11px 12px",
    borderRadius:"13px"
  },
  gymMovimientosHeader:{
    marginBottom:"8px",
    gap:"8px"
  },
  gymMovimientoItem:{
    padding:"8px",
    gap:"8px",
    borderRadius:"9px"
  }
};

const estilos={
  agendaCobroBloque:{
    marginTop:"12px",
    padding:"12px",
    border:"1px solid #dce8e1",
    borderRadius:"12px",
    background:"#f8fbf9"
  },
  agendaCobroHeader:{
    display:"flex",
    justifyContent:"space-between",
    gap:"10px",
    alignItems:"center",
    flexWrap:"wrap",
    marginBottom:"9px"
  },
  agendaCobroTitulo:{
    display:"block",
    marginTop:"3px",
    fontSize:"13px",
    color:"#17211b"
  },
  agendaCobroSeleccionada:{
    padding:"5px 8px",
    borderRadius:"999px",
    background:"#e8f7ed",
    color:"#08743c",
    fontSize:"9px",
    fontWeight:900
  },
  agendaCobroLista:{
    display:"grid",
    gap:"7px"
  },
  agendaCobroItem:{
    width:"100%",
    padding:"9px 10px",
    display:"flex",
    justifyContent:"space-between",
    gap:"10px",
    alignItems:"center",
    border:"1px solid #d9e2dc",
    borderRadius:"10px",
    background:"#fff",
    color:"#17211b",
    textAlign:"left",
    cursor:"pointer"
  },
  agendaCobroItemActivo:{
    borderColor:"#16834f",
    background:"#eaf8ef",
    boxShadow:"0 0 0 2px rgba(22,131,79,.08)"
  },

  pagina:{minHeight:"100vh",background:"#f4f7f5",color:"#17211b",fontFamily:"Inter,Arial,system-ui,sans-serif"},
  shell:{minHeight:"100vh"},
  loading:{minHeight:"100vh",display:"grid",placeItems:"center",alignContent:"center",gap:"10px",background:"#f4f7f5"},
  loadingLogo:{width:"220px",maxWidth:"75%"},loadingTitulo:{fontSize:"20px"},
  topbar:{minHeight:"92px",padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"18px",flexWrap:"wrap",background:"linear-gradient(120deg,#06331f 0%,#0b4d2d 54%,#0d6c3c 100%)",color:"#fff",boxShadow:"0 10px 28px rgba(11,66,40,.22)"},
  topbarMarca:{display:"flex",alignItems:"center",gap:"16px",minWidth:0,flexWrap:"wrap",flex:"1 1 720px"},topbarLogoCard:{display:"grid",placeItems:"center",padding:"12px 18px",minHeight:"74px",borderRadius:"22px",background:"#ffffff",border:"1px solid rgba(255,255,255,.16)",boxShadow:"0 10px 24px rgba(0,0,0,.18)",flexShrink:0},topbarLogo:{width:"205px",height:"62px",objectFit:"contain",display:"block"},topbarSeparador:{width:"1px",height:"42px",background:"rgba(255,255,255,.22)"},topbarModulo:{fontSize:"13px",fontWeight:900,color:"#79e2a4",whiteSpace:"nowrap",letterSpacing:".3px"},topbarEmpresa:{margin:0,fontSize:"24px",lineHeight:1.05},topbarTexto:{margin:"4px 0 0",fontSize:"12px",color:"#e0f2e7",maxWidth:"420px"},
  botonVolver:{minHeight:"44px",padding:"0 18px",borderRadius:"12px",border:"1px solid #20bc69",background:"rgba(0,0,0,.12)",color:"#fff",fontWeight:800,cursor:"pointer",flexShrink:0},
  contenido:{padding:"18px"},
  kpisGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"14px",marginBottom:"14px"},
  kpiCard:{display:"grid",gridTemplateColumns:"64px 1fr",gap:"14px",alignItems:"center",padding:"18px",border:"1px solid #e1e9e4",borderRadius:"16px",background:"#fff",boxShadow:"0 8px 22px rgba(24,79,49,.08)"},
  kpiDestacado:{display:"grid",gridTemplateColumns:"64px 1fr",gap:"14px",alignItems:"center",padding:"18px",border:"1px solid rgba(255,255,255,.18)",borderRadius:"16px",background:"linear-gradient(135deg,#13924e,#06733a)",color:"#fff",boxShadow:"0 12px 26px rgba(9,118,59,.24)"},
  kpiIcono:{width:"56px",height:"56px",display:"grid",placeItems:"center",borderRadius:"50%",background:"#e8f7ed",color:"#0c8b45",fontSize:"26px",fontWeight:900},kpiIconoDigital:{width:"56px",height:"56px",display:"grid",placeItems:"center",borderRadius:"18px",background:"#f0eaff",color:"#6f42d9",fontSize:"26px",fontWeight:900},
  kpiTitulo:{display:"block",fontSize:"13px",fontWeight:800},kpiValor:{display:"block",marginTop:"4px",fontSize:"28px",lineHeight:1.05},kpiDetalle:{display:"block",marginTop:"5px",fontSize:"12px",color:"#6d7771"},kpiDetalleClaro:{display:"block",marginTop:"5px",fontSize:"12px",color:"#e2f4e8"},
  panelGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",alignItems:"start"},columnaIzquierda:{display:"grid",gap:"12px",minWidth:0},columnaDerecha:{display:"grid",gap:"12px",minWidth:0},
  panel:{padding:"16px",border:"1px solid #dfe7e2",borderRadius:"15px",background:"#fff",boxShadow:"0 7px 18px rgba(18,66,42,.06)"},panelTabla:{marginTop:"12px",padding:"16px",border:"1px solid #dfe7e2",borderRadius:"15px",background:"#fff",boxShadow:"0 7px 18px rgba(18,66,42,.06)"},
  tituloPanel:{display:"flex",alignItems:"center",gap:"12px",marginBottom:"14px"},tituloPanelIcono:{width:"34px",height:"34px",display:"grid",placeItems:"center",borderRadius:"10px",background:"linear-gradient(180deg,#eff8f2,#e3f3e8)",border:"1px solid #d5e8dc",fontSize:"18px",boxShadow:"0 4px 10px rgba(10,155,75,.08)"},tituloPanelTexto:{margin:0,fontSize:"18px"},
  nuevoMovimientoGrid:{display:"grid",gridTemplateColumns:"190px minmax(0,1fr)",gap:"16px",alignItems:"start"},tabsMovimiento:{display:"flex",flexWrap:"wrap",gap:"8px",marginTop:"2px"},tab:{minHeight:"40px",padding:"0 14px",border:"1px solid #dce5df",borderRadius:"10px",background:"#fff",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"},tabActivo:{minHeight:"40px",padding:"0 14px",border:"1px solid #0b8644",borderRadius:"10px",background:"linear-gradient(135deg,#18a45b,#08763d)",color:"#fff",fontWeight:900,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 8px 18px rgba(9,118,59,.18)"},
  campo:{display:"flex",flexDirection:"column",gap:"6px"},label:{fontSize:"12px",fontWeight:800,color:"#283a31"},input:{width:"100%",minHeight:"42px",padding:"10px 12px",boxSizing:"border-box",border:"1px solid #d7dfda",borderRadius:"10px",background:"#fff",color:"#17211b",outline:"none",fontSize:"13px"},inputReadOnly:{width:"100%",minHeight:"42px",padding:"10px 12px",boxSizing:"border-box",border:"1px solid #d7e5dc",borderRadius:"10px",background:"linear-gradient(180deg,#f4f9f6,#edf5f0)",color:"#163c28",fontWeight:900},inputResponsable:{width:"100%",minHeight:"42px",padding:"9px 10px",boxSizing:"border-box",border:"1px solid #d7e5dc",borderRadius:"10px",background:"linear-gradient(180deg,#f4f9f6,#edf5f0)",color:"#163c28",fontWeight:800,fontSize:"11px",textOverflow:"ellipsis"},
  buscarClienteFila:{display:"grid",gridTemplateColumns:"1fr 44px",gap:0},botonBuscar:{border:"none",borderRadius:"0 8px 8px 0",background:"linear-gradient(135deg,#159552,#08743c)",color:"#fff",fontSize:"22px",cursor:"pointer"},resultadosBox:{display:"grid",gap:"8px",marginTop:"10px"},resultadoItem:{padding:"10px 12px",display:"flex",justifyContent:"space-between",border:"1px solid #dde6e0",borderRadius:"8px",background:"#fff",cursor:"pointer"},
  clienteCard:{marginTop:"10px",padding:"14px",border:"1px solid #dce5df",borderRadius:"12px",background:"#fff"},clienteDatosFila:{display:"grid",gridTemplateColumns:"64px minmax(0,1fr) minmax(220px,300px)",gap:"14px",alignItems:"center"},avatarCliente:{width:"58px",height:"58px",display:"grid",placeItems:"center",borderRadius:"50%",background:"linear-gradient(180deg,#e9f8ee,#d4efdf)",color:"#098f47",fontSize:"28px"},clienteInfo:{display:"grid",gap:"3px",fontSize:"12px",color:"#4d5952"},clienteNombre:{fontSize:"17px",color:"#17211b"},cuentaSelectorWrap:{display:"grid",gap:"6px"},cuentaStats:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"10px",marginTop:"14px"},miniStat:{padding:"13px",display:"grid",gap:"6px",border:"1px solid #e1e7e3",borderRadius:"10px",background:"linear-gradient(180deg,#fff,#fafcfb)",fontSize:"12px"},miniStatResaltado:{padding:"13px",display:"grid",gap:"6px",border:"1px solid #f1e2b9",borderRadius:"10px",background:"linear-gradient(180deg,#fffdf5,#fff7dc)",fontSize:"12px"},estadoActivo:{color:"#0a8d46"},
  productoGrid:{display:"grid",gridTemplateColumns:"minmax(150px,.9fr) minmax(210px,1.35fr) minmax(80px,.55fr) minmax(105px,.7fr)",gap:"12px",alignItems:"start"},codigoProductoBloque:{display:"grid",gap:"10px",minWidth:0},miniaturaProductoCampo:{display:"flex",flexDirection:"column",gap:"6px",alignItems:"flex-start"},miniaturaProductoBox:{width:"72px",height:"58px",display:"grid",placeItems:"center",overflow:"hidden",border:"1px solid #d7dfda",borderRadius:"10px",background:"#f6f8f7"},miniaturaProducto:{width:"100%",height:"100%",objectFit:"cover",display:"block"},miniaturaSinImagen:{width:"100%",height:"100%",placeItems:"center",fontSize:"24px",color:"#7d8a82"},cobroGrid:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"12px"},accionesFila:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginTop:"14px"},botonPrincipal:{minHeight:"42px",border:"none",borderRadius:"8px",background:"linear-gradient(135deg,#159552,#08743c)",color:"#fff",fontWeight:900,cursor:"pointer"},botonLimpiar:{minHeight:"42px",border:"1px solid #d8e0dc",borderRadius:"8px",background:"#fff",color:"#17211b",fontWeight:850,cursor:"pointer"},
  tablaHeaderRow:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"14px",flexWrap:"wrap"},filtrosInline:{display:"flex",alignItems:"center",gap:"8px",fontSize:"12px"},inputCompacto:{minHeight:"36px",padding:"7px 10px",border:"1px solid #d8e0dc",borderRadius:"8px",background:"#fff"},inputBuscarTabla:{minHeight:"36px",minWidth:"280px",padding:"7px 10px",border:"1px solid #d8e0dc",borderRadius:"8px",background:"#fff"},botonBuscarMovimientos:{width:"38px",height:"36px",border:"1px solid #d8e0dc",borderRadius:"8px",background:"#fff",cursor:"pointer"},botonHoy:{minHeight:"36px",padding:"0 16px",border:"1px solid #159552",borderRadius:"8px",background:"#fff",color:"#08743c",fontWeight:850,cursor:"pointer"},
  tablaBox:{overflowX:"auto",border:"1px solid #dfe7e2",borderRadius:"10px"},tabla:{width:"100%",minWidth:"1150px",borderCollapse:"collapse"},th:{padding:"11px",background:"linear-gradient(180deg,#f3faf5,#edf6f0)",color:"#1e3327",textAlign:"left",fontSize:"12px",fontWeight:900,whiteSpace:"nowrap"},td:{padding:"10px 11px",borderBottom:"1px solid #edf1ee",fontSize:"12px",whiteSpace:"nowrap"},tdResponsable:{maxWidth:"145px",padding:"8px 9px",borderBottom:"1px solid #edf1ee",fontSize:"10.5px",lineHeight:1.25,whiteSpace:"normal",overflowWrap:"anywhere",verticalAlign:"middle"},tdVacio:{padding:"28px",textAlign:"center",color:"#6b7280"},badgeTipo:{padding:"4px 9px",borderRadius:"999px",background:"#e7f7ed",color:"#0d8244",fontWeight:800},badgeEstado:{color:"#0a8d46",fontWeight:800},

  gymCajaLayout:{
    display:"block"
  },
  gymCobroPanel:{
    width:"100%",
    padding:"18px",
    border:"1px solid #dfe7e2",
    borderRadius:"20px",
    background:"#fff",
    boxShadow:"0 12px 30px rgba(18,66,42,.07)"
  },
  gymCobroEncabezado:{
    display:"flex",
    alignItems:"end",
    justifyContent:"space-between",
    gap:"14px",
    flexWrap:"wrap",
    marginBottom:"12px"
  },
  gymEyebrow:{
    display:"block",
    color:"#16834f",
    fontSize:"9px",
    fontWeight:900,
    letterSpacing:"1.15px"
  },
  gymCobroTitulo:{
    margin:"6px 0 7px",
    fontSize:"clamp(23px,3vw,34px)",
    lineHeight:1.08,
    letterSpacing:"-.7px"
  },
  gymCobroTexto:{
    margin:0,
    color:"#6c7971",
    fontSize:"13px",
    lineHeight:1.55
  },
  gymFechaCompacta:{
    display:"grid",
    gap:"6px"
  },
  gymAccionesPrincipales:{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
    gap:"10px",
    marginBottom:"10px"
  },
  gymAccion:{
    minHeight:"92px",
    padding:"14px",
    display:"grid",
    gridTemplateColumns:"42px minmax(0,1fr)",
    alignItems:"center",
    gap:"10px",
    border:"1px solid #dfe7e2",
    borderRadius:"15px",
    background:"#f9fbfa",
    color:"#17211b",
    textAlign:"left",
    cursor:"pointer"
  },
  gymAccionActiva:{
    minHeight:"92px",
    padding:"14px",
    display:"grid",
    gridTemplateColumns:"42px minmax(0,1fr)",
    alignItems:"center",
    gap:"10px",
    border:"1px solid #16834f",
    borderRadius:"15px",
    background:"linear-gradient(180deg,#ecf9f1,#e5f6eb)",
    color:"#153d29",
    textAlign:"left",
    cursor:"pointer",
    boxShadow:"0 8px 20px rgba(22,131,79,.12)"
  },
  gymAccionIcono:{
    width:"42px",
    height:"42px",
    display:"grid",
    placeItems:"center",
    borderRadius:"12px",
    background:"#fff",
    fontSize:"21px"
  },
  gymAccionTexto:{
    minWidth:0,
    display:"grid",
    gap:"4px"
  },
  gymAccionTextoStrong:{
    fontSize:"14px"
  },
  gymOtrosCobros:{
    display:"flex",
    flexWrap:"wrap",
    gap:"8px",
    padding:"10px",
    marginBottom:"10px",
    border:"1px solid #dfe7e2",
    borderRadius:"13px",
    background:"#f6f9f7"
  },
  gymOtro:{
    minHeight:"36px",
    padding:"0 12px",
    border:"1px solid #d9e3dd",
    borderRadius:"999px",
    background:"#fff",
    color:"#32453a",
    fontWeight:750,
    cursor:"pointer"
  },
  gymOtroActivo:{
    minHeight:"36px",
    padding:"0 12px",
    border:"1px solid #16834f",
    borderRadius:"999px",
    background:"#16834f",
    color:"#fff",
    fontWeight:850,
    cursor:"pointer"
  },
  gymOperacionSeleccionada:{
    marginBottom:"14px",
    padding:"12px 14px",
    display:"flex",
    alignItems:"center",
    justifyContent:"space-between",
    gap:"12px",
    flexWrap:"wrap",
    border:"1px solid #dce7e0",
    borderRadius:"13px",
    background:"#f8fbf9"
  },
  gymOperacionEtiqueta:{
    display:"block",
    color:"#7a867f",
    fontSize:"8px",
    fontWeight:900,
    letterSpacing:"1px"
  },
  gymOperacionValor:{
    display:"block",
    marginTop:"3px",
    color:"#173c2a",
    fontSize:"15px"
  },
  gymInventarioAviso:{
    display:"inline-flex",
    padding:"6px 9px",
    borderRadius:"999px",
    background:"#fff3cd",
    color:"#856404",
    fontSize:"10px",
    fontWeight:800
  },
  gymBloque:{
    marginTop:"12px",
    padding:"16px",
    border:"1px solid #e0e8e3",
    borderRadius:"16px",
    background:"#fff"
  },
  gymBloqueCabecera:{
    marginBottom:"12px",
    display:"flex",
    alignItems:"flex-start",
    justifyContent:"space-between",
    gap:"12px",
    flexWrap:"wrap"
  },
  gymBloqueTitulo:{
    margin:"5px 0 0",
    fontSize:"18px"
  },
  gymOpcional:{
    padding:"6px 9px",
    borderRadius:"999px",
    background:"#eef6f1",
    color:"#4c6457",
    fontSize:"10px",
    fontWeight:800
  },
  gymBuscarFila:{
    display:"grid",
    gridTemplateColumns:"minmax(0,1fr) auto",
    gap:"8px"
  },
  gymBuscarBoton:{
    minWidth:"90px",
    minHeight:"42px",
    padding:"0 16px",
    border:0,
    borderRadius:"10px",
    background:"#16834f",
    color:"#fff",
    fontWeight:850,
    cursor:"pointer"
  },
  gymResultados:{
    marginTop:"9px",
    display:"grid",
    gap:"7px",
    maxHeight:"240px",
    overflowY:"auto"
  },
  gymResultado:{
    width:"100%",
    padding:"10px",
    display:"grid",
    gridTemplateColumns:"38px minmax(0,1fr) auto",
    gap:"10px",
    alignItems:"center",
    border:"1px solid #dfe7e2",
    borderRadius:"11px",
    background:"#fff",
    color:"#17211b",
    textAlign:"left",
    cursor:"pointer"
  },
  gymResultadoAvatar:{
    width:"38px",
    height:"38px",
    display:"grid",
    placeItems:"center",
    borderRadius:"11px",
    background:"#e8f7ed",
    color:"#16834f",
    fontWeight:900
  },
  gymResultadoTexto:{
    minWidth:0,
    display:"grid",
    gap:"3px"
  },
  gymResultadoFlecha:{
    color:"#16834f",
    fontSize:"20px",
    fontWeight:900
  },
  gymAlumnoCard:{
    marginTop:"10px",
    padding:"14px",
    border:"1px solid #cfe4d7",
    borderRadius:"14px",
    background:"linear-gradient(180deg,#fbfefc,#f2f8f4)"
  },
  gymAlumnoSuperior:{
    display:"flex",
    alignItems:"center",
    justifyContent:"space-between",
    gap:"12px",
    flexWrap:"wrap"
  },
  gymAlumnoIdentidad:{
    minWidth:0,
    display:"flex",
    alignItems:"center",
    gap:"11px"
  },
  gymAlumnoAvatar:{
    width:"48px",
    height:"48px",
    flex:"0 0 auto",
    display:"grid",
    placeItems:"center",
    borderRadius:"14px",
    background:"#173c2a",
    color:"#fff",
    fontSize:"20px",
    fontWeight:900
  },
  gymAlumnoNombre:{
    display:"block",
    fontSize:"17px"
  },
  gymAlumnoDato:{
    display:"block",
    marginTop:"4px",
    color:"#6d7b72",
    fontSize:"11px"
  },
  gymAlumnoAcciones:{
    display:"flex",
    alignItems:"center",
    gap:"8px",
    flexWrap:"wrap"
  },
  gymEstadoMembresia:{
    padding:"7px 10px",
    borderRadius:"999px",
    fontSize:"10px",
    fontWeight:900
  },
  gymQuitarAlumno:{
    minHeight:"32px",
    padding:"0 10px",
    border:"1px solid #d6dfda",
    borderRadius:"9px",
    background:"#fff",
    color:"#4b5c52",
    fontWeight:750,
    cursor:"pointer"
  },
  gymCuentaSelector:{
    marginTop:"12px",
    display:"grid",
    gap:"6px"
  },
  gymAlumnoResumen:{
    marginTop:"12px",
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",
    gap:"8px"
  },
  gymSinMembresia:{
    marginTop:"10px",
    padding:"10px 12px",
    display:"flex",
    alignItems:"center",
    justifyContent:"space-between",
    gap:"10px",
    flexWrap:"wrap",
    border:"1px solid #f0d58b",
    borderRadius:"11px",
    background:"#fff9e8",
    color:"#725400",
    fontSize:"11px"
  },
  gymConfigurarMembresia:{
    minHeight:"34px",
    padding:"0 11px",
    border:0,
    borderRadius:"9px",
    background:"#956400",
    color:"#fff",
    fontWeight:850,
    cursor:"pointer"
  },
  gymAlumnoVacio:{
    marginTop:"10px",
    padding:"14px",
    display:"grid",
    gridTemplateColumns:"42px minmax(0,1fr)",
    gap:"11px",
    alignItems:"center",
    border:"1px dashed #cfd9d2",
    borderRadius:"13px",
    background:"#fafcfb"
  },
  gymAlumnoVacioIcono:{
    width:"42px",
    height:"42px",
    display:"grid",
    placeItems:"center",
    borderRadius:"12px",
    background:"#edf4ef",
    fontSize:"19px"
  },
  gymProductoGrid:{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",
    gap:"10px"
  },
  gymPagoGrid:{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
    gap:"10px"
  },
  gymMontoInput:{
    width:"100%",
    minHeight:"52px",
    padding:"10px 12px",
    boxSizing:"border-box",
    border:"2px solid #16834f",
    borderRadius:"11px",
    background:"#f5fff8",
    color:"#123d28",
    outline:"none",
    fontSize:"22px",
    fontWeight:900
  },
  gymAccionesCobro:{
    marginTop:"14px",
    display:"grid",
    gridTemplateColumns:"minmax(0,1fr) minmax(110px,.25fr)",
    gap:"10px"
  },
  gymRegistrarPago:{
    minHeight:"50px",
    padding:"0 18px",
    border:0,
    borderRadius:"12px",
    background:"linear-gradient(135deg,#159552,#08743c)",
    color:"#fff",
    fontSize:"14px",
    fontWeight:900,
    cursor:"pointer",
    boxShadow:"0 10px 22px rgba(8,116,60,.22)"
  },
  gymLimpiar:{
    minHeight:"50px",
    padding:"0 14px",
    border:"1px solid #d7dfda",
    borderRadius:"12px",
    background:"#fff",
    color:"#33463b",
    fontWeight:850,
    cursor:"pointer"
  },
  gymResumenLateral:{
    display:"grid",
    gap:"12px",
    position:"sticky",
    top:"14px"
  },
  gymResumenCard:{
    padding:"17px",
    border:"1px solid #dfe7e2",
    borderRadius:"17px",
    background:"#fff",
    boxShadow:"0 9px 24px rgba(18,66,42,.06)"
  },
  gymResumenTitulo:{
    margin:"5px 0 13px",
    fontSize:"19px"
  },
  gymResumenLista:{
    display:"grid",
    gap:"9px"
  },
  gymResumenFila:{
    paddingBottom:"8px",
    display:"flex",
    alignItems:"center",
    justifyContent:"space-between",
    gap:"12px",
    borderBottom:"1px solid #edf1ee",
    color:"#66736b",
    fontSize:"11px"
  },
  gymResumenListaItem:{
    display:"flex"
  },
  gymResumenMonto:{
    color:"#16834f",
    fontSize:"20px"
  },
  gymResumenNota:{
    margin:"14px 0 0",
    padding:"10px",
    borderRadius:"10px",
    background:"#f3f8f5",
    color:"#617068",
    fontSize:"11px",
    lineHeight:1.45
  },
  gymUltimosLista:{
    display:"grid",
    gap:"9px"
  },
  gymUltimoItem:{
    paddingBottom:"9px",
    display:"flex",
    alignItems:"center",
    justifyContent:"space-between",
    gap:"10px",
    borderBottom:"1px solid #edf1ee"
  },
  gymSinMovimientos:{
    margin:0,
    color:"#748078",
    fontSize:"12px",
    lineHeight:1.45
  },
  gymMovimientosPanel:{
    marginTop:"14px",
    padding:"18px",
    border:"1px solid #dfe7e2",
    borderRadius:"18px",
    background:"#fff",
    boxShadow:"0 8px 22px rgba(18,66,42,.06)"
  },
  gymMovimientosHeader:{
    marginBottom:"13px",
    display:"flex",
    alignItems:"flex-end",
    justifyContent:"space-between",
    gap:"12px",
    flexWrap:"wrap"
  },
  gymMovimientosTitulo:{
    margin:"5px 0 0",
    fontSize:"21px"
  },
  gymFiltros:{
    display:"flex",
    alignItems:"flex-end",
    gap:"8px",
    flexWrap:"wrap"
  },
  gymFiltroCampo:{
    display:"grid",
    gap:"4px",
    color:"#5e6d64",
    fontSize:"10px",
    fontWeight:800
  },
  gymFiltrarBoton:{
    minHeight:"36px",
    padding:"0 13px",
    border:0,
    borderRadius:"9px",
    background:"#16834f",
    color:"#fff",
    fontWeight:850,
    cursor:"pointer"
  },
  gymHoyBoton:{
    minHeight:"36px",
    padding:"0 13px",
    border:"1px solid #16834f",
    borderRadius:"9px",
    background:"#fff",
    color:"#16834f",
    fontWeight:850,
    cursor:"pointer"
  },
  gymMovimientosLista:{
    display:"grid",
    gap:"8px"
  },
  gymMovimientoItem:{
    padding:"11px",
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",
    gap:"12px",
    alignItems:"center",
    border:"1px solid #e3e9e5",
    borderRadius:"12px",
    background:"#fbfcfb"
  },
  gymMovimientoFecha:{
    display:"grid",
    gap:"2px",
    textAlign:"center"
  },
  gymMovimientoPrincipal:{
    minWidth:0,
    display:"grid",
    gap:"3px"
  },
  gymMovimientoResponsable:{
    display:"grid",
    gap:"3px",
    color:"#67746c",
    fontSize:"10px"
  },
  gymMovimientoMonto:{
    display:"grid",
    gap:"3px",
    textAlign:"right"
  },
  gymMovimientoVacio:{
    padding:"24px",
    border:"1px dashed #d7dfda",
    borderRadius:"12px",
    color:"#6d7972",
    textAlign:"center",
    fontSize:"12px"
  }
};
