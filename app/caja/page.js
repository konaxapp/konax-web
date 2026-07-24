"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";


function normalizarClave(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function construirModulosPorPlan(codigoPlan) {
  const codigo = normalizarClave(codigoPlan);
  const base = {
    dashboard: true, clientes: false, vista_cliente: false, creditos: false,
    cobranza: false, dashboard_cobros: false, gestor_cobros: false, caja: false,
    control_caja: false, reportes: false, inventario: false,
    movimientos_inventario: false, ventas: false, dashboard_ventas: false,
    gastos: false, recargos: false, suscripciones: false, usuarios: true,
    configuracion: true,
  };
  if (codigo === "cobros") {
    return { ...base, clientes: true, vista_cliente: true, caja: true, cobranza: true, dashboard_cobros: true, gestor_cobros: true, inventario: true, movimientos_inventario: true, reportes: true };
  }
  if (codigo === "ventas_gestion") {
    return { ...base, clientes: true, vista_cliente: true, creditos: true, caja: true, control_caja: true, cobranza: true, dashboard_cobros: true, gestor_cobros: true, reportes: true, inventario: true, movimientos_inventario: true, ventas: true, dashboard_ventas: true, gastos: true, recargos: true, suscripciones: true };
  }
  if (codigo === "pro") {
    return Object.fromEntries(Object.keys(base).map((codigoModulo) => [codigoModulo, true]));
  }
  return base;
}

function leerModuloEmpresa(data, codigo) {
  if (!data) return true;
  if (Object.prototype.hasOwnProperty.call(data, codigo)) return Boolean(data[codigo]);
  const columnasAntiguas = {
    clientes: "clientes", vista_cliente: "vista_cliente", creditos: "venta_credito",
    caja: "caja", control_caja: "control_caja", cobranza: "cobranza",
    dashboard_cobros: "dashboard_cobros", gestor_cobros: "cobranza",
    reportes: "dashboard_cobros", inventario: "inventario",
    movimientos_inventario: "inventario", ventas: "venta_credito",
    dashboard_ventas: "dashboard_ventas", gastos: "egresos", recargos: "recargos",
    suscripciones: "suscripciones",
  };
  const columna = columnasAntiguas[codigo];
  if (columna && Object.prototype.hasOwnProperty.call(data, columna)) return Boolean(data[columna]);
  return true;
}

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

export default function Caja() {
  const router = useRouter();
  const pathname = usePathname();

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
  const [buscarProductoCaja, setBuscarProductoCaja] = useState("");
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

  const [modulosNavegacion, setModulosNavegacion] = useState({});
  const [permisosNavegacion, setPermisosNavegacion] = useState([]);
  const [usuarioRolNavegacion, setUsuarioRolNavegacion] = useState("");

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

  function esAdministradorNavegacion(rol = usuarioRolNavegacion) {
    return ["administrador", "superadmin", "admin_master", "administrador_master"].includes(normalizarClave(rol));
  }

  async function cargarNavegacionCaja(empresaId) {
    const usuarioId = localStorage.getItem("usuarioId");
    const rolLocal = localStorage.getItem("usuarioRol") || "";
    setUsuarioRolNavegacion(rolLocal);

    const { data: empresa } = await supabase
      .from("empresas")
      .select("plan_codigo")
      .eq("id", empresaId)
      .maybeSingle();

    const permitidos = construirModulosPorPlan(empresa?.plan_codigo || localStorage.getItem("planCodigo") || "");
    const { data: configuracion } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    const resultado = {};
    Object.keys(permitidos).forEach((codigoModulo) => {
      if (!permitidos[codigoModulo]) { resultado[codigoModulo] = false; return; }
      if (["dashboard", "usuarios", "configuracion"].includes(codigoModulo)) { resultado[codigoModulo] = true; return; }
      resultado[codigoModulo] = configuracion ? leerModuloEmpresa(configuracion, codigoModulo) : true;
    });
    setModulosNavegacion(resultado);

    if (usuarioId) {
      const { data: permisos } = await supabase
        .from("permisos_usuarios_empresa")
        .select("permiso, activo")
        .eq("empresa_id", empresaId)
        .eq("usuario_id", usuarioId)
        .eq("activo", true);
      setPermisosNavegacion((permisos || []).map((item) => normalizarClave(item.permiso)).filter(Boolean));
    }
  }

  function puedeVerNavegacion(codigoModulo) {
    const codigo = normalizarClave(codigoModulo);
    if (!Boolean(modulosNavegacion?.[codigo])) return false;
    if (esAdministradorNavegacion()) return true;
    return codigo === "dashboard" || permisosNavegacion.includes(codigo);
  }

  async function cerrarSesionCaja() {
    try { await supabase.auth.signOut(); } catch (error) { console.error(error); }
    localStorage.clear();
    router.replace("/login");
  }

  async function iniciarCaja() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    setCargando(true);

    await Promise.all([
      cargarEmpresa(empresaId),
      cargarVendedores(empresaId),
      cargarProductos(empresaId),
      cargarMovimientos(empresaId, hoyPanama, hoyPanama),
      cargarNavegacionCaja(empresaId),
    ]);

    setCargando(false);
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

    return ![
      "Venta Contado",
      "Servicio Contado",
      "Venta de producto",
    ].includes(tipoMovimiento);
  }

  function clienteEsOpcional() {
    return (
      esNegocioMembresia() &&
      (esMovimientoLibreMembresia() ||
        tipoMovimiento === "Venta de producto")
    );
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

    const opciones = obtenerOpcionesMovimiento(tipoCompleto);
    setTipoMovimiento(opciones[0] || "");
  }

  function obtenerOpcionesMovimiento(tipoNegocio) {
    const tipo = normalizar(tipoNegocio);

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
      const clave = `${resultado.cliente.id}-${
        resultado.cuenta?.id || "sin-cuenta"
      }`;

      if (!claves.has(clave)) {
        claves.add(clave);
        unicos.push(resultado);
      }
    });

    setResultadosBusqueda(unicos);
  }

  async function seleccionarResultado(resultado) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const cliente = resultado.cliente;

    setClienteSeleccionado(cliente);
    setBuscarCliente(cliente.nombre);
    setResultadosBusqueda([]);

    const { data, error } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });

    if (error || !data?.length) {
      setCuentasCliente([]);
      setCuentaSeleccionada(null);
      return;
    }

    setCuentasCliente(data);
    setCuentaSeleccionada(resultado.cuenta || data[0]);

    const vendedorCuenta =
      resultado.cuenta?.responsable ||
      resultado.cuenta?.vendedor ||
      data[0]?.responsable ||
      data[0]?.vendedor ||
      "";

    if (vendedorCuenta) {
      setResponsable(vendedorCuenta);
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

  async function procesarMembresiaDesdeCaja(empresaId) {
    if (!requiereCuentaMembresia()) {
      return cuentaSeleccionada;
    }

    if (!cuentaSeleccionada?.id) {
      alert("Seleccione la cuenta de membresía del cliente.");
      return null;
    }

    const { data: suscripcion, error } =
      await supabase
        .from("suscripciones")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq(
          "informacion_comercial_id",
          cuentaSeleccionada.id
        )
        .maybeSingle();

    if (error) {
      alert("Error consultando la membresía: " + error.message);
      return null;
    }

    if (!suscripcion) {
      alert(
        "La cuenta seleccionada no está vinculada a una membresía."
      );
      return null;
    }

    if (tipoMovimiento === "Renovación") {
      const hoy = obtenerFechaPanama();
      const fechaActual =
        suscripcion.fecha_vencimiento || hoy;

      const fechaBase =
        fechaActual < hoy ? hoy : fechaActual;

      const nuevaFecha =
        calcularNuevaFechaVencimiento(
          fechaBase,
          suscripcion.periodicidad
        );

      const { error: errorSuscripcion } =
        await supabase
          .from("suscripciones")
          .update({
            fecha_vencimiento: nuevaFecha,
            estado: "Activo",
            forma_pago: metodoPago,
          })
          .eq("id", suscripcion.id)
          .eq("empresa_id", empresaId);

      if (errorSuscripcion) {
        alert(
          "No se pudo renovar la membresía: " +
            errorSuscripcion.message
        );
        return null;
      }

      await supabase
        .from("informacion_comercial")
        .update({
          fecha_vencimiento: nuevaFecha,
          saldo_actual: 0,
          estado: "Activo",
          estado_servicio: "Activo",
          fecha_suspension: null,
          fecha_cancelacion: null,
          motivo_suspension: null,
        })
        .eq("id", cuentaSeleccionada.id)
        .eq("empresa_id", empresaId);

      return {
        ...cuentaSeleccionada,
        fecha_vencimiento: nuevaFecha,
        estado: "Activo",
        saldo_actual: 0,
      };
    }

    const { error: errorSuscripcion } =
      await supabase
        .from("suscripciones")
        .update({
          estado: "Activo",
          forma_pago: metodoPago,
        })
        .eq("id", suscripcion.id)
        .eq("empresa_id", empresaId);

    if (errorSuscripcion) {
      alert(
        "No se pudo activar la membresía: " +
          errorSuscripcion.message
      );
      return null;
    }

    await supabase
      .from("informacion_comercial")
      .update({
        saldo_actual: 0,
        estado: "Activo",
        estado_servicio: "Activo",
      })
      .eq("id", cuentaSeleccionada.id)
      .eq("empresa_id", empresaId);

    return {
      ...cuentaSeleccionada,
      estado: "Activo",
      saldo_actual: 0,
    };
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
      alert("Seleccione el vendedor o responsable.");
      return;
    }

    setGuardando(true);

    let movimientoCajaCreado = null;
    let pagoPreparado = null;
    let cuentaActualizada = cuentaSeleccionada;

    try {
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

      if (pagoPreparado) {
        cuentaActualizada = await aplicarPagoCuenta(
          empresaId,
          pagoPreparado
        );
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
        esCancelacion()
          ? "Cuenta cancelada y pago registrado correctamente."
          : esCuotaCredito()
          ? "Cuota de crédito registrada correctamente."
          : esAbono()
          ? "Abono registrado correctamente."
          : esVentaCredito()
          ? "Venta a crédito aplicada a la cuenta y producto descontado."
          : "Venta registrada y producto descontado del inventario."
      );

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

    setTipoMovimiento(opciones[0] || "");
    setFechaPago(obtenerFechaPanama());

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
    setConcepto("");
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


  const productosFiltradosCaja = useMemo(() => {
    const texto = normalizar(buscarProductoCaja);
    if (!texto) return productos;

    return productos.filter((producto) =>
      normalizar(
        `${producto.nombre || ""} ${producto.codigo || ""} ${producto.descripcion || ""}`
      ).includes(texto)
    );
  }, [productos, buscarProductoCaja]);

  function obtenerImagenProducto(producto) {
    return (
      producto?.imagen_url ||
      producto?.imagen ||
      producto?.foto_url ||
      producto?.url_imagen ||
      ""
    );
  }

  function prepararCobro(tipo) {
    if (!productoSeleccionado) {
      alert("Seleccione un producto para continuar.");
      return;
    }

    setTipoMovimiento(tipo);
    setMonto(String(precioProducto(productoSeleccionado) * Number(cantidad || 1)));
  }

  function cambiarTipoOperacion(tipo) {
    setTipoMovimiento(tipo);
    setMonto("");
    setConcepto("");
    setCodigoProducto("");
    setProductoSeleccionado(null);
    setCantidad("1");
    setValorProducto("");
    setBuscarCliente("");
    setResultadosBusqueda([]);
    setClienteSeleccionado(null);
    setCuentasCliente([]);
    setCuentaSeleccionada(null);
  }
  const modulosMenuCaja = useMemo(() => {
    const lista = [
      ["Clientes", "/clientes", "clientes", "👥"],
      ["Vista Cliente", "/vista-cliente", "vista_cliente", "📄"],
      ["Créditos", "/ventas-credito", "creditos", "💳"],
      ["Caja", "/caja", "caja", "💵"],
      ["Cobranza", "/cobranza", "cobranza", "📞"],
      ["Centro de Cobranza", "/dashboard-cobranza", "dashboard_cobros", "📊"],
      ["Mi cartera de cobro", "/gestor-cobros", "gestor_cobros", "💼"],
      ["Control Caja", "/control-caja", "control_caja", "🏦"],
      ["Inventario", "/inventario", "inventario", "📦"],
      ["Movimientos Inventario", "/inventario/movimientos", "movimientos_inventario", "🔄"],
      ["Ventas", "/ventas", "ventas", "🛒"],
      ["Centro de Ventas", "/dashboard-ventas", "dashboard_ventas", "📈"],
      ["Gastos", "/gastos", "gastos", "🧮"],
      ["Suscripciones", "/suscripciones", "suscripciones", "🔁"],
      ["Recargos", "/recargos", "recargos", "⚠️"],
      ["Reportes", "/reportes", "reportes", "📚"],
      ["Usuarios y Roles", "/usuarios", "usuarios", "🔐"],
      ["Configuración", "/admin-configuracion", "configuracion", "⚙️"],
    ];
    return lista
      .map(([nombre, ruta, codigo, icono]) => ({ nombre, ruta, codigo, icono, activo: puedeVerNavegacion(codigo) }))
      .filter((item) => item.activo);
  }, [modulosNavegacion, permisosNavegacion, usuarioRolNavegacion]);

  if (cargando) {
    return (
      <div style={estilos.loading}>
        <img src="/konax-logo.png" alt="KONAX" style={estilos.loadingLogo} />
        <strong style={estilos.loadingTitulo}>Preparando caja</strong>
      </div>
    );
  }

  const subtotalActual = productoSeleccionado
    ? precioProducto(productoSeleccionado) * Number(cantidad || 1)
    : 0;

  const totalOperacionActual = esVentaConProducto()
    ? subtotalActual
    : Number(monto || 0);

  return (
    <main style={estilos.posPagina}>
      <header style={estilos.posHeader}>
        <img src="/konax-logo.png" alt="KONAX" style={estilos.posLogo} />
        <div style={estilos.posHeaderInfo}>
          <span>▣ Caja 01</span>
          <span style={estilos.posSeparador}>|</span>
          <span>♙ Usuario: {responsable || "Usuario"}</span>
          <span style={estilos.posSeparador}>|</span>
          <span>▦ {new Intl.DateTimeFormat("es-PA", { dateStyle: "long", timeZone: "America/Panama" }).format(new Date())}</span>
          <button onClick={volverDashboard} style={estilos.posVolver}>Centro de Operaciones</button>
        </div>
      </header>

      <div style={estilos.posLayout}>
        <section style={estilos.posContenido}>
          <div style={estilos.posOperacionBar}>
            <div>
              <span style={estilos.posOperacionEtiqueta}>TIPO DE OPERACIÓN</span>
              <h2 style={estilos.posOperacionTitulo}>
                {esVentaConProducto() ? "Punto de venta" : "Cobro de cuenta"}
              </h2>
            </div>
            <div style={estilos.posOperacionTabs}>
              {opcionesMovimiento.map((opcion) => (
                <button
                  key={opcion}
                  onClick={() => cambiarTipoOperacion(opcion)}
                  style={tipoMovimiento === opcion ? estilos.posOperacionTabActivo : estilos.posOperacionTab}
                >
                  {opcion}
                </button>
              ))}
            </div>
            <div style={estilos.posOperacionDatos}>
              <Campo label="Fecha">
                <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} style={estilos.posInputCompacto} />
              </Campo>
              <Campo label="Responsable">
                <select value={responsable} onChange={(e) => setResponsable(e.target.value)} style={estilos.posInputCompacto}>
                  <option value="">Seleccione responsable</option>
                  {vendedores.map((v) => <option key={v.id} value={v.nombre}>{v.nombre} - {v.rol}</option>)}
                </select>
              </Campo>
            </div>
          </div>

          <div style={estilos.posPrincipalGrid}>
            <div style={estilos.posCatalogo}>
              {esVentaConProducto() ? (
                <>
              <div style={estilos.posBuscadorBox}>
                <span style={estilos.posLupa}>⌕</span>
                <input
                  value={buscarProductoCaja}
                  onChange={(e) => setBuscarProductoCaja(e.target.value)}
                  placeholder="Buscar producto o escanear código"
                  style={estilos.posBuscador}
                />
                <span style={estilos.posBarcode}>▥</span>
              </div>

              <div style={estilos.posCategorias}>
                <button style={estilos.posCategoriaActiva}>Todos</button>
                <button style={estilos.posCategoria}>Muebles</button>
                <button style={estilos.posCategoria}>Hogar</button>
                <button style={estilos.posCategoria}>Farmacia</button>
                <button style={estilos.posCategoria}>Abarrotes</button>
                <button style={estilos.posCategoria}>Electro</button>
              </div>

              <div style={estilos.posProductosGrid}>
                {productosFiltradosCaja.slice(0, 12).map((producto) => {
                  const seleccionado = productoSeleccionado?.id === producto.id;
                  const imagen = obtenerImagenProducto(producto);
                  return (
                    <button
                      key={producto.id}
                      onClick={() => seleccionarProducto(producto)}
                      style={seleccionado ? estilos.posProductoActivo : estilos.posProductoCard}
                    >
                      <div style={estilos.posProductoImagenBox}>
                        {imagen ? (
                          <img src={imagen} alt={producto.nombre} style={estilos.posProductoImagen} />
                        ) : (
                          <span style={estilos.posProductoSinImagen}>▣</span>
                        )}
                      </div>
                      <strong style={estilos.posProductoNombre}>{producto.nombre}</strong>
                      <span style={estilos.posProductoPrecio}>${precioProducto(producto).toFixed(2)}</span>
                      <span style={estilos.posProductoStock}>Stock: {stockProducto(producto)}</span>
                    </button>
                  );
                })}
              </div>

              <div style={estilos.posAccionesRapidas}>
                {[["%", "Descuento"], ["◷", "En espera"], ["↻", "Recuperar"], ["▱", "Eliminar"], ["↩", "Devolución"]].map(([icono, texto]) => (
                  <button key={texto} style={estilos.posAccionRapida} onClick={() => texto === "Eliminar" && seleccionarProducto(null)}>
                    <span style={estilos.posAccionIcono}>{icono}</span>
                    <span>{texto}</span>
                  </button>
                ))}
              </div>

              <div style={estilos.posMetodosBox}>
                <h3 style={estilos.posMetodosTitulo}>Métodos de pago</h3>
                <div style={estilos.posMetodosGrid}>
                  {["Efectivo", "Tarjeta", "Transferencia"].map((metodo) => (
                    <button key={metodo} onClick={() => setMetodoPago(metodo)} style={metodoPago === metodo ? estilos.posMetodoActivo : estilos.posMetodo}>
                      <span style={estilos.posMetodoIcono}>{metodo === "Efectivo" ? "▭" : metodo === "Tarjeta" ? "▤" : "▥"}</span>
                      <span><strong>{metodo}</strong><small>${subtotalActual.toFixed(2)}</small></span>
                    </button>
                  ))}
                </div>
              </div>
                </>
              ) : (
                <div style={estilos.posCobroCuentaBox}>
                  <div style={estilos.posCobroEncabezado}>
                    <div>
                      <span style={estilos.posOperacionEtiqueta}>GESTIÓN DE CARTERA</span>
                      <h2 style={estilos.posCobroTitulo}>{tipoMovimiento}</h2>
                      <p style={estilos.posCobroTexto}>Busque al cliente y seleccione la cuenta donde se aplicará el pago.</p>
                    </div>
                    <span style={estilos.posCobroIcono}>$</span>
                  </div>

                  <div style={estilos.posBuscarClienteFila}>
                    <Campo label="Buscar cliente o cuenta">
                      <input value={buscarCliente} onChange={(e) => setBuscarCliente(e.target.value)} placeholder="Nombre, cédula, teléfono o número de cuenta" style={estilos.input} />
                    </Campo>
                    <button onClick={buscarClientes} style={estilos.posBotonBuscarCliente}>Buscar</button>
                  </div>

                  {resultadosBusqueda.length > 0 && (
                    <div style={estilos.resultadosBox}>
                      {resultadosBusqueda.map((item, index) => (
                        <button key={`${item.cliente.id}-${index}`} onClick={() => seleccionarResultado(item)} style={estilos.resultadoItem}>
                          <span><strong>{item.cliente.nombre}</strong><small style={estilos.posResultadoDetalle}>{item.cliente.cedula || "Sin cédula"}</small></span>
                          <span>{item.cuenta?.numero_cuenta || "Seleccionar"}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {clienteSeleccionado ? (
                    <div style={estilos.posClienteCuentaSeleccionado}>
                      <div style={estilos.posClienteCuentaCabecera}>
                        <span style={estilos.posClienteIcono}>♙</span>
                        <div><strong>{clienteSeleccionado.nombre}</strong><small>{clienteSeleccionado.cedula || "Sin cédula"}</small></div>
                      </div>

                      <Campo label="Cuenta por cobrar">
                        <select value={cuentaSeleccionada?.id || ""} onChange={(e) => setCuentaSeleccionada(cuentasCliente.find((c) => String(c.id) === String(e.target.value)) || null)} style={estilos.input}>
                          <option value="">Seleccione una cuenta</option>
                          {cuentasCliente.map((c) => <option key={c.id} value={c.id}>{c.numero_cuenta} - {c.descripcion} - Saldo ${Number(c.saldo_actual || 0).toFixed(2)}</option>)}
                        </select>
                      </Campo>

                      {cuentaSeleccionada && (
                        <div style={estilos.posCuentaResumenGrid}>
                          <div><span>Cuenta</span><strong>{cuentaSeleccionada.numero_cuenta || "-"}</strong></div>
                          <div><span>Saldo actual</span><strong>${Number(cuentaSeleccionada.saldo_actual || 0).toFixed(2)}</strong></div>
                          <div><span>Cuota</span><strong>${Number(cuentaSeleccionada.cuota || 0).toFixed(2)}</strong></div>
                          <div><span>Estado</span><strong>{cuentaSeleccionada.estado || "Activo"}</strong></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={estilos.posEstadoVacioCuenta}>Seleccione un cliente para consultar sus cuentas.</div>
                  )}

                  <div style={estilos.posCobroCampos}>
                    <Campo label={esCancelacion() ? "Monto de cancelación" : "Monto a registrar"}>
                      <input type="number" min="0" step="0.01" value={monto} readOnly={esCancelacion()} onChange={(e) => setMonto(e.target.value)} style={esCancelacion() ? estilos.inputReadOnly : estilos.input} />
                    </Campo>
                    <Campo label="Método de pago">
                      <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={estilos.input}><option>Efectivo</option><option>Transferencia</option><option>Yappy</option><option>Tarjeta</option><option>Cheque</option><option>Otro</option></select>
                    </Campo>
                    <Campo label="Concepto">
                      <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder={`Ej. ${tipoMovimiento}`} style={estilos.input} />
                    </Campo>
                  </div>
                  <Campo label="Observación"><textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} style={estilos.textarea} /></Campo>
                </div>
              )}
            </div>

            <aside style={estilos.posVentaPanel}>
              <div style={estilos.posVentaHeader}>
                <h2 style={estilos.posVentaTitulo}>{esVentaConProducto() ? "Venta actual" : "Cobro actual"}</h2>
                <button onClick={() => seleccionarProducto(null)} style={estilos.posBotonBorrar}>▱</button>
              </div>

              <div style={estilos.posTablaHeader}>
                <span>Producto</span><span>Cant.</span><span>Precio</span><span>Total</span>
              </div>

              {esVentaConProducto() ? (
                productoSeleccionado ? (
                  <div style={estilos.posLineaVenta}>
                    <div style={estilos.posLineaProducto}>
                      <div style={estilos.posMiniaturaBox}>
                        {obtenerImagenProducto(productoSeleccionado) ? (
                          <img src={obtenerImagenProducto(productoSeleccionado)} alt="" style={estilos.posMiniatura} />
                        ) : "▣"}
                      </div>
                      <strong>{productoSeleccionado.nombre}</strong>
                    </div>
                    <div style={estilos.posCantidadControl}>
                      <button onClick={() => setCantidad(String(Math.max(1, Number(cantidad || 1) - 1)))} style={estilos.posCantidadBtn}>−</button>
                      <strong>{cantidad}</strong>
                      <button onClick={() => setCantidad(String(Number(cantidad || 1) + 1))} style={estilos.posCantidadBtnMas}>+</button>
                    </div>
                    <span>${precioProducto(productoSeleccionado).toFixed(2)}</span>
                    <strong>${subtotalActual.toFixed(2)}</strong>
                  </div>
                ) : (
                  <div style={estilos.posVentaVacia}>Seleccione un producto para iniciar la venta.</div>
                )
              ) : (
                <div style={estilos.posResumenCobroCuenta}>
                  <div><span>Operación</span><strong>{tipoMovimiento || "-"}</strong></div>
                  <div><span>Cliente</span><strong>{clienteSeleccionado?.nombre || "Sin seleccionar"}</strong></div>
                  <div><span>Cuenta</span><strong>{cuentaSeleccionada?.numero_cuenta || "-"}</strong></div>
                  <div><span>Saldo actual</span><strong>{cuentaSeleccionada ? `$${Number(cuentaSeleccionada.saldo_actual || 0).toFixed(2)}` : "-"}</strong></div>
                </div>
              )}

              <div style={estilos.posTotalesBox}>
                <div style={estilos.posTotalFila}><span>Subtotal</span><strong>${totalOperacionActual.toFixed(2)}</strong></div>
                <div style={estilos.posTotalFilaVerde}><span>Descuento</span><strong>-$0.00</strong></div>
                <div style={estilos.posTotalFila}><span>Impuesto</span><strong>$0.00</strong></div>
                <div style={estilos.posGranTotal}><span>TOTAL</span><strong>${totalOperacionActual.toFixed(2)}</strong></div>
              </div>

              <div style={estilos.posClienteCard}>
                <span style={estilos.posClienteIcono}>♙</span>
                <div style={estilos.posClienteInfo}>
                  <strong>{clienteSeleccionado?.nombre || "Cliente no seleccionado"}</strong>
                  <small>Cédula: {clienteSeleccionado?.cedula || "-"}</small>
                  <small>Tel.: {obtenerTelefonoCliente(clienteSeleccionado) || "-"}</small>
                </div>
                <button onClick={() => document.getElementById("panel-cliente")?.scrollIntoView({ behavior: "smooth" })} style={estilos.posCambiar}>Cambiar</button>
              </div>

              <div style={estilos.posBotonesCobro}>
                {esVentaConProducto() ? (
                  <>
                    <button onClick={() => prepararCobro("Venta Contado")} disabled={guardando} style={estilos.posCobrarContado}>▭ COBRAR CONTADO</button>
                    <button onClick={() => prepararCobro("Venta Crédito")} disabled={guardando} style={estilos.posVenderCredito}>▤ VENDER A CRÉDITO</button>
                  </>
                ) : (
                  <button onClick={guardarMovimiento} disabled={guardando} style={estilos.posRegistrarCobro}>
                    {guardando ? "PROCESANDO..." : esCancelacion() ? "✓ CANCELAR CUENTA" : `✓ REGISTRAR ${String(tipoMovimiento || "PAGO").toUpperCase()}`}
                  </button>
                )}
              </div>
            </aside>
          </div>

          <div style={estilos.posPanelInferior}>
            <article style={estilos.card}>
              <CabeceraSeccion titulo="Movimientos registrados" texto="Consulte los movimientos del día o de un periodo." numero={String(movimientos.length)} />
              <div style={estilos.filtrosMovimientos}>
                <Campo label="Desde"><input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={estilos.input} /></Campo>
                <Campo label="Hasta"><input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={estilos.input} /></Campo>
                <button onClick={buscarMovimientosPorFecha} style={estilos.botonFiltrar}>Buscar movimientos</button>
                <button onClick={mostrarMovimientosHoy} style={estilos.botonHoy}>Ver hoy</button>
              </div>
              <div style={estilos.tablaBox}><table style={estilos.tabla}><thead><tr>{["Fecha","Transacción","Cliente","Cuenta","Tipo","Método","Monto","Responsable","Estado"].map((h) => <th key={h} style={estilos.th}>{h}</th>)}</tr></thead><tbody>{movimientos.length === 0 ? <tr><td colSpan="9" style={estilos.tdVacio}>No hay movimientos en el periodo seleccionado.</td></tr> : movimientos.map((mov) => <tr key={mov.id}><td style={estilos.td}>{String(mov.fecha_pago || mov.created_at || "").slice(0,10)}</td><td style={estilos.td}>{mov.numero_transaccion || "-"}</td><td style={estilos.td}>{mov.cliente_nombre || "-"}</td><td style={estilos.td}>{mov.numero_cuenta || "-"}</td><td style={estilos.td}>{mov.tipo}</td><td style={estilos.td}>{mov.metodo_pago}</td><td style={estilos.td}><strong>${Number(mov.monto || 0).toFixed(2)}</strong></td><td style={estilos.td}>{mov.vendedor_responsable || "-"}</td><td style={estilos.td}>{mov.estado || "Procesado"}</td></tr>)}</tbody></table></div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

function Campo({ label, children }) {
  return (
    <label style={estilos.campo}>
      <span style={estilos.label}>{label}</span>
      {children}
    </label>
  );
}

function ResumenCard({
  titulo,
  valor,
  icono,
  destacado,
}) {
  return (
    <article
      style={
        destacado
          ? estilos.resumenCardDestacado
          : estilos.resumenCard
      }
    >
      <span style={estilos.kpiIcono}>{icono}</span>
      <span style={estilos.kpiTitulo}>{titulo}</span>
      <strong style={estilos.kpiValor}>{valor}</strong>
    </article>
  );
}

function CabeceraSeccion({
  titulo,
  texto,
  numero,
}) {
  return (
    <div style={estilos.cabeceraSeccion}>
      <div>
        <h2 style={estilos.tituloSeccion}>
          {titulo}
        </h2>
        <p style={estilos.textoSeccion}>{texto}</p>
      </div>

      <span style={estilos.numeroPaso}>
        {numero}
      </span>
    </div>
  );
}

function FilaResumen({ label, valor }) {
  return (
    <div style={estilos.filaResumen}>
      <span>{label}</span>
      <strong>{valor}</strong>
    </div>
  );
}

const estilos = {
  pagina: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 88% 5%, rgba(41,163,98,.16), transparent 26%), radial-gradient(circle at 8% 12%, rgba(16,87,55,.10), transparent 24%), linear-gradient(135deg,#f7faf8 0%,#edf4f0 48%,#e7f1eb 100%)",
    padding: "26px",
    color: "#132019",
    fontFamily: "Inter, Arial, system-ui, sans-serif",
  },

  contenedor: {
    maxWidth: "1540px",
    margin: "0 auto",
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: "10px",
    background: "#eef2f7",
  },

  loadingLogo: {
    width: "230px",
    maxWidth: "75%",
  },

  loadingTitulo: {
    fontSize: "22px",
  },

  header: {
    position: "relative",
    overflow: "hidden",
    marginBottom: "22px",
    padding: "30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    borderRadius: "28px",
    background:
      "linear-gradient(135deg,#102d20 0%,#18583a 58%,#1e7c4d 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,.14)",
    boxShadow: "0 24px 55px rgba(18,66,42,.22)",
  },

  headerIzquierda: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },

  logoBox: {
    width: "200px",
    height: "82px",
    padding: "10px",
    display: "grid",
    placeItems: "center",
    borderRadius: "20px",
    background: "linear-gradient(180deg,#ffffff,#f7fbf8)",
    border: "1px solid rgba(255,255,255,.7)",
    boxShadow: "0 12px 30px rgba(0,0,0,.20)",
  },

  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  etiqueta: {
    color: "#82e1ac",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1.3px",
  },

  nombreNegocio: {
    margin: "5px 0 2px",
    fontSize: "clamp(30px, 4vw, 44px)",
  },

  tituloModulo: {
    margin: "7px 0 0",
    color: "#b9ddc8",
    fontWeight: "800",
  },

  subtitulo: {
    margin: "5px 0 0",
    color: "#d6eadf",
  },

  botonVolver: {
    minHeight: "46px",
    padding: "11px 19px",
    border: "1px solid rgba(255,255,255,.28)",
    borderRadius: "14px",
    background: "rgba(255,255,255,.14)",
    color: "#ffffff",
    fontWeight: "850",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0,0,0,.12)",
    backdropFilter: "blur(10px)",
  },

  resumenGrid: {
    marginBottom: "20px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: "14px",
  },

  resumenCard: {
    padding: "20px",
    display: "grid",
    gap: "7px",
    border: "1px solid #d9e7de",
    borderRadius: "20px",
    background:
      "linear-gradient(180deg,#ffffff 0%,#f8fbf9 100%)",
    boxShadow: "0 10px 24px rgba(24,79,49,.08)",
  },

  resumenCardDestacado: {
    padding: "20px",
    display: "grid",
    gap: "7px",
    borderRadius: "20px",
    background:
      "linear-gradient(135deg,#1c8f58 0%,#14663f 72%,#104d32 100%)",
    color: "#ffffff",
    boxShadow: "0 14px 30px rgba(20,102,63,.24)",
    border: "1px solid rgba(255,255,255,.18)",
  },

  kpiIcono: { fontSize: "24px" },
  kpiTitulo: { fontSize: "12px", fontWeight: "800" },
  kpiValor: { fontSize: "25px" },

  mainGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) minmax(300px, 390px)",
    gap: "20px",
    alignItems: "start",
  },

  card: {
    marginBottom: "20px",
    padding: "25px",
    border: "1px solid #dce8e0",
    borderRadius: "24px",
    background:
      "linear-gradient(180deg,#ffffff 0%,#fbfdfc 100%)",
    boxShadow: "0 14px 34px rgba(18,66,42,.08)",
  },

  cardSticky: {
    position: "sticky",
    top: "18px",
    padding: "24px",
    border: "1px solid #d7e4dc",
    borderRadius: "24px",
    background:
      "linear-gradient(180deg,#ffffff 0%,#f7fbf8 100%)",
    boxShadow: "0 16px 36px rgba(18,66,42,.11)",
  },

  cabeceraSeccion: {
    marginBottom: "18px",
    paddingBottom: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    borderBottom: "1px solid #edf1ee",
  },

  tituloSeccion: {
    margin: 0,
    fontSize: "21px",
  },

  textoSeccion: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "12px",
  },

  numeroPaso: {
    minWidth: "38px",
    height: "38px",
    padding: "0 10px",
    display: "grid",
    placeItems: "center",
    borderRadius: "999px",
    background:
      "linear-gradient(135deg,#e7f7ed,#d7efe1)",
    color: "#176b42",
    fontWeight: "900",
    border: "1px solid #c8e4d2",
    boxShadow: "0 6px 14px rgba(23,107,66,.10)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "15px",
  },

  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: "12px",
    alignItems: "end",
  },

  campo: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    color: "#425048",
    fontSize: "12px",
    fontWeight: "800",
  },

  input: {
    width: "100%",
    minHeight: "46px",
    padding: "11px 13px",
    boxSizing: "border-box",
    border: "1px solid #cbdad0",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    boxShadow: "inset 0 1px 2px rgba(17,24,39,.03)",
  },

  inputReadOnly: {
    width: "100%",
    minHeight: "46px",
    padding: "11px 13px",
    boxSizing: "border-box",
    border: "1px solid #cfe0d5",
    borderRadius: "12px",
    background:
      "linear-gradient(180deg,#f3f8f5,#edf5f0)",
    color: "#17623c",
    fontWeight: "850",
  },

  textarea: {
    width: "100%",
    minHeight: "100px",
    marginTop: "15px",
    padding: "12px",
    boxSizing: "border-box",
    border: "1px solid #cfd8d2",
    borderRadius: "10px",
  },

  botonSecundario: {
    minHeight: "44px",
    padding: "11px 18px",
    border: "none",
    borderRadius: "10px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "800",
    cursor: "pointer",
  },

  resultadosBox: {
    marginTop: "14px",
    display: "grid",
    gap: "8px",
  },

  resultadoItem: {
    padding: "12px",
    display: "flex",
    justifyContent: "space-between",
    border: "1px solid #dfe7e2",
    borderRadius: "12px",
    background: "#ffffff",
    cursor: "pointer",
  },

  clienteSeleccionado: {
    marginTop: "15px",
    padding: "16px",
    border: "1px solid #b9dfc7",
    borderRadius: "14px",
    background: "#f1faf4",
  },

  clienteNombre: {
    margin: "0 0 12px",
  },

  detalleCuentaGrid: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(140px,1fr))",
    gap: "10px",
  },

  detalleCuentaItem: {
    padding: "12px",
    display: "grid",
    gap: "5px",
    border: "1px solid #cfe2d5",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#4b5f53",
    fontSize: "12px",
  },

  acciones: {
    marginTop: "18px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  botonPrincipal: {
    minHeight: "48px",
    padding: "12px 22px",
    border: "none",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg,#1d9159,#156a41)",
    color: "#ffffff",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(21,106,65,.22)",
  },

  botonLimpiar: {
    minHeight: "48px",
    padding: "12px 22px",
    border: "1px solid #cbd9d0",
    borderRadius: "13px",
    background: "#ffffff",
    color: "#294d38",
    fontWeight: "850",
    cursor: "pointer",
    boxShadow: "0 7px 18px rgba(18,66,42,.07)",
  },

  resumenMovimiento: {
    display: "grid",
    gap: "10px",
  },

  filaResumen: {
    paddingBottom: "9px",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    borderBottom: "1px solid #edf1ee",
    color: "#657169",
    fontSize: "12px",
  },

  totalBox: {
    marginTop: "18px",
    padding: "18px",
    display: "grid",
    gap: "6px",
    borderRadius: "18px",
    background:
      "linear-gradient(135deg,#102f20 0%,#176a42 70%,#1b7d4d 100%)",
    color: "#ffffff",
    boxShadow: "0 14px 28px rgba(17,79,48,.22)",
    border: "1px solid rgba(255,255,255,.14)",
  },

  filtrosMovimientos: {
    marginBottom: "18px",
    padding: "15px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: "12px",
    alignItems: "end",
    border: "1px solid #dfe7e2",
    borderRadius: "14px",
    background: "#f7faf8",
  },

  botonFiltrar: {
    minHeight: "44px",
    padding: "11px 18px",
    border: "none",
    borderRadius: "10px",
    background: "#16834f",
    color: "#ffffff",
    fontWeight: "800",
    cursor: "pointer",
  },

  botonHoy: {
    minHeight: "44px",
    padding: "11px 18px",
    border: "1px solid #cfd8d2",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#26342c",
    fontWeight: "800",
    cursor: "pointer",
  },

  tablaBox: {
    overflowX: "auto",
    border: "1px solid #d8e5dc",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(18,66,42,.06)",
  },

  tabla: {
    width: "100%",
    minWidth: "1000px",
    borderCollapse: "collapse",
  },

  th: {
    padding: "13px",
    background:
      "linear-gradient(180deg,#183c2a,#102a1d)",
    color: "#ffffff",
    textAlign: "left",
    whiteSpace: "nowrap",
    fontSize: "12px",
    letterSpacing: ".2px",
  },

  td: {
    padding: "11px",
    borderBottom: "1px solid #edf1ee",
    whiteSpace: "nowrap",
  },

  tdVacio: {
    padding: "28px",
    color: "#6b7280",
    textAlign: "center",
  },
  posPagina: { minHeight: "100vh", background: "#f5f7f6", color: "#111827", fontFamily: "Inter, Arial, system-ui, sans-serif" },
  posHeader: { height: "80px", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg,#07131f,#0d1824)", color: "white", borderBottom: "1px solid rgba(255,255,255,.08)", position: "sticky", top: 0, zIndex: 30 },
  posLogo: { width: "142px", height: "52px", objectFit: "contain" },
  posHeaderInfo: { display: "flex", alignItems: "center", gap: "15px", fontSize: "14px", flexWrap: "wrap", justifyContent: "flex-end", color: "rgba(255,255,255,.96)" },
  posSeparador: { opacity: .4 },
  posVolver: { padding: "9px 13px", border: "1px solid rgba(255,255,255,.25)", borderRadius: "10px", background: "transparent", color: "white", cursor: "pointer" },
  posLayout: { display: "block", minHeight: "calc(100vh - 80px)" },
  posSidebar: { width: "248px", minWidth: "248px", height: "calc(100vh - 80px)", position: "sticky", top: "80px", padding: "18px 14px", boxSizing: "border-box", background: "linear-gradient(180deg,#06131d 0%,#0a1824 55%,#06111a 100%)", color: "#ffffff", display: "flex", flexDirection: "column", overflowY: "auto", borderRight: "1px solid rgba(255,255,255,.05)", boxShadow: "12px 0 28px rgba(4,10,16,.28)" },
  posMenuItem: { position: "relative", width: "100%", minHeight: "50px", display: "grid", gridTemplateColumns: "32px 1fr 6px", alignItems: "center", gap: "10px", padding: "9px 12px", border: "1px solid transparent", borderRadius: "14px", background: "transparent", color: "rgba(255,255,255,.84)", fontSize: "13px", fontWeight: 750, textAlign: "left", cursor: "pointer" },
  posMenuActivo: { background: "linear-gradient(135deg,#14994e,#0a7c3d)", color: "#ffffff", borderColor: "rgba(255,255,255,.06)", boxShadow: "0 10px 24px rgba(10,124,61,.30)", transform: "translateX(2px)" },
  posMenuIcono: { width: "32px", height: "32px", display: "grid", placeItems: "center", borderRadius: "10px", background: "rgba(255,255,255,.08)", fontSize: "16px" },
  posContenido: { maxWidth: "1440px", margin: "0 auto", padding: "18px 20px 32px", overflow: "hidden", minWidth: 0 },
  posPrincipalGrid: { display: "grid", gridTemplateColumns: "minmax(0,1.08fr) minmax(420px,.92fr)", gap: "16px", alignItems: "start" },
  posCatalogo: { minWidth: 0 },
  posBuscadorBox: { height: "68px", display: "flex", alignItems: "center", gap: "12px", padding: "0 18px", background: "white", border: "1px solid #dfe5e2", borderRadius: "14px", boxShadow: "0 5px 16px rgba(15,23,42,.04)" },
  posLupa: { fontSize: "32px", lineHeight: 1 },
  posBuscador: { flex: 1, border: 0, outline: 0, fontSize: "17px", background: "transparent" },
  posBarcode: { fontSize: "26px" },
  posCategorias: { display: "flex", gap: "10px", margin: "18px 0", flexWrap: "wrap" },
  posCategoria: { minHeight: "40px", padding: "0 20px", border: "1px solid #d7ddda", borderRadius: "999px", background: "white", cursor: "pointer", fontWeight: 700 },
  posCategoriaActiva: { minHeight: "40px", padding: "0 22px", border: 0, borderRadius: "999px", background: "linear-gradient(135deg,#14994e,#0a7c3d)", color: "white", cursor: "pointer", fontWeight: 800 },
  posProductosGrid: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "12px" },
  posProductoCard: { minHeight: "250px", padding: "14px", border: "1px solid #dfe5e2", borderRadius: "14px", background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", cursor: "pointer", boxShadow: "0 5px 16px rgba(15,23,42,.04)" },
  posProductoActivo: { minHeight: "250px", padding: "14px", border: "2px solid #12934b", borderRadius: "14px", background: "#f5fff8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", cursor: "pointer", boxShadow: "0 8px 22px rgba(18,147,75,.13)" },
  posProductoImagenBox: { height: "145px", width: "100%", display: "grid", placeItems: "center", marginBottom: "8px" },
  posProductoImagen: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  posProductoSinImagen: { fontSize: "58px", color: "#9aa6a0" },
  posProductoNombre: { fontSize: "16px", textAlign: "center", marginTop: "4px" },
  posProductoPrecio: { marginTop: "10px", color: "#108343", fontSize: "18px", fontWeight: 900 },
  posProductoStock: { marginTop: "8px", color: "#5c6b63", fontSize: "13px" },
  posAccionesRapidas: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "10px", marginTop: "14px" },
  posAccionRapida: { minHeight: "96px", border: "1px solid #dfe5e2", borderRadius: "12px", background: "white", display: "grid", placeItems: "center", gap: "3px", cursor: "pointer", fontWeight: 700 },
  posAccionIcono: { fontSize: "30px", color: "#128647" },
  posMetodosBox: { marginTop: "14px", padding: "14px 18px", border: "1px solid #dfe5e2", borderRadius: "14px", background: "white" },
  posMetodosTitulo: { margin: "0 0 10px", fontSize: "18px" },
  posMetodosGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" },
  posMetodo: { border: 0, borderRight: "1px solid #e5e7eb", background: "transparent", display: "flex", gap: "12px", alignItems: "center", textAlign: "left", cursor: "pointer" },
  posMetodoActivo: { border: "1px solid #b7dfc7", borderRadius: "10px", background: "#effaf3", display: "flex", gap: "12px", alignItems: "center", textAlign: "left", cursor: "pointer", padding: "8px" },
  posMetodoIcono: { fontSize: "30px", color: "#0a8b43" },
  posVentaPanel: { minHeight: "760px", border: "1px solid #dfe5e2", borderRadius: "14px", background: "white", boxShadow: "0 8px 24px rgba(15,23,42,.06)", overflow: "hidden", position: "sticky", top: "96px" },
  posVentaHeader: { height: "68px", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" },
  posVentaTitulo: { margin: 0, fontSize: "23px" },
  posBotonBorrar: { border: 0, background: "transparent", color: "#ef4444", fontSize: "25px", cursor: "pointer" },
  posTablaHeader: { display: "grid", gridTemplateColumns: "1.7fr .55fr .75fr .75fr", gap: "10px", padding: "14px 20px", borderBottom: "1px solid #e5e7eb", fontWeight: 800, fontSize: "13px" },
  posLineaVenta: { display: "grid", gridTemplateColumns: "1.7fr .55fr .75fr .75fr", gap: "10px", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" },
  posLineaProducto: { display: "flex", alignItems: "center", gap: "10px", minWidth: 0 },
  posMiniaturaBox: { width: "54px", height: "54px", borderRadius: "8px", background: "#f2f4f3", display: "grid", placeItems: "center", flexShrink: 0 },
  posMiniatura: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  posCantidadControl: { display: "flex", alignItems: "center", gap: "8px" },
  posCantidadBtn: { width: "30px", height: "30px", border: "1px solid #d7ddda", borderRadius: "7px", background: "white", cursor: "pointer" },
  posCantidadBtnMas: { width: "30px", height: "30px", border: "1px solid #b6dec6", borderRadius: "7px", background: "white", color: "#0a8b43", fontSize: "20px", cursor: "pointer" },
  posVentaVacia: { padding: "60px 20px", textAlign: "center", color: "#758178" },
  posTotalesBox: { margin: "16px", padding: "16px", border: "1px solid #e1e6e3", borderRadius: "12px" },
  posTotalFila: { display: "flex", justifyContent: "space-between", padding: "7px 0" },
  posTotalFilaVerde: { display: "flex", justifyContent: "space-between", padding: "7px 0", color: "#0a8b43" },
  posGranTotal: { marginTop: "10px", paddingTop: "14px", borderTop: "1px dashed #cbd5d0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "25px" },
  posClienteCard: { margin: "16px", padding: "15px", display: "grid", gridTemplateColumns: "58px 1fr auto", alignItems: "center", gap: "12px", border: "1px solid #e1e6e3", borderRadius: "12px" },
  posClienteIcono: { width: "52px", height: "52px", borderRadius: "50%", display: "grid", placeItems: "center", background: "#e9f7ee", color: "#0a8b43", fontSize: "28px" },
  posClienteInfo: { display: "grid", gap: "3px" },
  posCambiar: { padding: "10px 18px", border: "1px solid #0a8b43", borderRadius: "8px", background: "white", color: "#0a8b43", fontWeight: 800, cursor: "pointer" },
  posBotonesCobro: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "0 16px 16px" },
  posCobrarContado: { minHeight: "88px", border: 0, borderRadius: "12px", background: "linear-gradient(135deg,#159b50,#0a7e3e)", color: "white", fontSize: "18px", fontWeight: 900, cursor: "pointer" },
  posVenderCredito: { minHeight: "88px", border: 0, borderRadius: "12px", background: "linear-gradient(135deg,#182635,#0b1722)", color: "white", fontSize: "18px", fontWeight: 900, cursor: "pointer" },
  posPanelInferior: { marginTop: "24px" },

  posOperacionBar: { marginBottom: "16px", padding: "16px 18px", display: "grid", gridTemplateColumns: "minmax(180px,.7fr) minmax(340px,1.5fr) minmax(280px,1fr)", gap: "18px", alignItems: "end", background: "#ffffff", border: "1px solid #e2e8e5", borderRadius: "18px", boxShadow: "0 8px 24px rgba(15,23,42,.05)" },
  posOperacionEtiqueta: { display: "block", marginBottom: "4px", color: "#11814c", fontSize: "10px", fontWeight: "900", letterSpacing: "1.1px" },
  posOperacionTitulo: { margin: 0, fontSize: "22px", color: "#0f172a" },
  posOperacionTabs: { display: "flex", gap: "8px", flexWrap: "wrap" },
  posOperacionTab: { minHeight: "38px", padding: "8px 13px", border: "1px solid #d8e1dc", borderRadius: "999px", background: "#ffffff", color: "#334155", fontWeight: "800", cursor: "pointer" },
  posOperacionTabActivo: { minHeight: "38px", padding: "8px 13px", border: "1px solid #13844e", borderRadius: "999px", background: "linear-gradient(135deg,#169b59,#0f7544)", color: "#ffffff", fontWeight: "900", cursor: "pointer", boxShadow: "0 7px 16px rgba(15,117,68,.20)" },
  posOperacionDatos: { display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "10px" },
  posInputCompacto: { width: "100%", minHeight: "40px", padding: "8px 10px", boxSizing: "border-box", border: "1px solid #d4ded8", borderRadius: "10px", background: "#ffffff", color: "#111827" },
  posCobroCuentaBox: { minHeight: "620px", padding: "22px", border: "1px solid #e0e7e3", borderRadius: "18px", background: "linear-gradient(180deg,#ffffff,#f8fbf9)", boxShadow: "0 10px 28px rgba(15,23,42,.05)" },
  posCobroEncabezado: { marginBottom: "18px", paddingBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e8eeea" },
  posCobroTitulo: { margin: "2px 0 5px", fontSize: "28px", color: "#0f172a" },
  posCobroTexto: { margin: 0, color: "#64748b", fontSize: "13px" },
  posCobroIcono: { width: "54px", height: "54px", display: "grid", placeItems: "center", borderRadius: "16px", background: "#e6f6ed", color: "#0f8b4f", fontSize: "28px", fontWeight: "900" },
  posBuscarClienteFila: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "10px", alignItems: "end" },
  posBotonBuscarCliente: { minHeight: "46px", padding: "10px 22px", border: 0, borderRadius: "12px", background: "#111c28", color: "#ffffff", fontWeight: "900", cursor: "pointer" },
  posResultadoDetalle: { display: "block", marginTop: "3px", color: "#718096" },
  posClienteCuentaSeleccionado: { marginTop: "16px", padding: "16px", border: "1px solid #bfe3cf", borderRadius: "16px", background: "#f0faf4" },
  posClienteCuentaCabecera: { marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" },
  posCuentaResumenGrid: { marginTop: "14px", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "9px" },
  posEstadoVacioCuenta: { marginTop: "16px", padding: "34px", textAlign: "center", border: "1px dashed #cdd8d2", borderRadius: "14px", color: "#64748b", background: "#ffffff" },
  posCobroCampos: { marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "12px" },
  posResumenCobroCuenta: { display: "grid", gap: "0", borderBottom: "1px solid #e7ece9" },
  posRegistrarCobro: { width: "100%", minHeight: "66px", border: 0, borderRadius: "14px", background: "linear-gradient(135deg,#169b59,#0b6b3d)", color: "#ffffff", fontSize: "16px", fontWeight: "950", cursor: "pointer", boxShadow: "0 12px 26px rgba(11,107,61,.24)" },

  posSidebarBrand: { minHeight: "74px", display: "flex", alignItems: "center", gap: "10px", padding: "4px 6px 18px", borderBottom: "1px solid rgba(255,255,255,.08)" },
  posSidebarLogoCard: { minHeight: "52px", display: "grid", placeItems: "center", padding: "8px 10px", borderRadius: "16px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" },
  posSidebarLogo: { width: "120px", maxWidth: "100%", height: "auto", objectFit: "contain" },
  posSidebarCaption: { display: "grid", gap: "2px" },
  posSidebarEyebrow: { color: "#72d9a0", fontSize: "8px", fontWeight: 900, letterSpacing: "1px" },
  posSidebarTitle: { color: "#ffffff", fontSize: "14px", letterSpacing: "1.2px" },
  posSidebarNav: { display: "grid", gap: "8px", paddingTop: "10px" },
  posMenuIconoActivo: { background: "rgba(255,255,255,.16)", boxShadow: "none" },
  posMenuTexto: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  posMenuIndicador: { width: "5px", height: "24px", borderRadius: "999px", background: "#ffffff" },
  posLogout: { minHeight: "44px", marginTop: "auto", border: "1px solid rgba(255,255,255,.12)", borderRadius: "11px", background: "rgba(255,255,255,.06)", color: "#ffffff", fontWeight: 750, cursor: "pointer" },

};
