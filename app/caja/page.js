"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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

  async function iniciarCaja() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    setCargando(true);

    await Promise.all([
      cargarEmpresa(empresaId),
      cargarVendedores(empresaId),
      cargarProductos(empresaId),
      cargarMovimientos(empresaId, hoyPanama, hoyPanama),
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
        <header style={estilos.topbar}>
          <div style={estilos.topbarMarca}>
            <img src="/konax-logo.png" alt="KONAX" style={estilos.topbarLogo} />
            <div style={estilos.topbarSeparador} />
            <div>
              <div style={estilos.topbarModulo}>▣ CAJA Y REGISTRO DE INGRESOS</div>
            </div>
            <div style={estilos.topbarSeparador} />
            <div>
              <h1 style={estilos.topbarEmpresa}>{empresaNombre}</h1>
              <p style={estilos.topbarTexto}>Registro de pagos, membresías, ventas, servicios e ingresos.</p>
            </div>
          </div>

          <button onClick={volverDashboard} style={estilos.botonVolver}>← Centro de Operaciones</button>
        </header>

        <div style={estilos.contenido}>
          <section style={estilos.kpisGrid}>
            <KpiCard titulo="Movimientos hoy" valor={movimientosHoy.length} detalle="Total de transacciones" icono="▤" />
            <KpiCard titulo="Total de hoy" valor={`$${totalHoy.toFixed(2)}`} detalle="Ingresos registrados" icono="💰" destacado />
            <KpiCard titulo="Efectivo hoy" valor={`$${totalEfectivoHoy.toFixed(2)}`} detalle="Pago en efectivo" icono="▣" />
            <KpiCard titulo="Pagos digitales" valor={`$${totalDigitalHoy.toFixed(2)}`} detalle="Tarjetas y otros medios" icono="▤" digital />
          </section>

          <section style={estilos.panelGrid}>
            <div style={estilos.columnaIzquierda}>
              <article style={estilos.panel}>
                <TituloPanel icono="▦" titulo="A. Nuevo movimiento" />
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
                  <TituloPanel icono="♙" titulo="B. Cliente y cuenta" />
                  <div style={estilos.buscarClienteFila}>
                    <input
                      placeholder="Buscar cliente"
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
                  <TituloPanel icono="◇" titulo="C. Producto e inventario" />
                  <div style={estilos.productoGrid}>
                    <Campo label="Código del producto">
                      <input value={codigoProducto} onChange={(e)=>seleccionarProductoPorCodigo(e.target.value)} placeholder="Ej. 12345" style={estilos.input} />
                    </Campo>
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
                <TituloPanel icono="$" titulo="D. Detalle del cobro" />
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
                    <input value={concepto} onChange={(e)=>setConcepto(e.target.value)} placeholder="Ej. Pago de producto" style={estilos.input} />
                  </Campo>
                  <Campo label="Responsable">
                    <select value={responsable} onChange={(e)=>setResponsable(e.target.value)} style={estilos.input}>
                      <option value="">Seleccione responsable</option>
                      {vendedores.map((vendedor)=><option key={vendedor.id} value={vendedor.nombre}>{vendedor.nombre} - {vendedor.rol}</option>)}
                    </select>
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

          <article style={estilos.panelTabla}>
            <div style={estilos.tablaHeaderRow}>
              <TituloPanel icono="▤" titulo="Movimientos registrados" />
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
                      <td style={estilos.td}>{movimiento.vendedor_responsable || "-"}</td>
                      <td style={estilos.td}><span style={estilos.badgeEstado}>● {movimiento.estado || "Procesado"}</span></td>
                      <td style={estilos.td}>◉ ✎ ⎙</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
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

function KpiCard({titulo,valor,detalle,icono,destacado,digital}){
  return (
    <article style={destacado?estilos.kpiDestacado:estilos.kpiCard}>
      <div style={digital?estilos.kpiIconoDigital:estilos.kpiIcono}>{icono}</div>
      <div><span style={estilos.kpiTitulo}>{titulo}</span><strong style={estilos.kpiValor}>{valor}</strong><small style={destacado?estilos.kpiDetalleClaro:estilos.kpiDetalle}>{detalle}</small></div>
    </article>
  );
}

function MiniStat({label,value,resaltado,estado}){
  return <div style={resaltado?estilos.miniStatResaltado:estilos.miniStat}><span>{label}</span><strong style={estado?estilos.estadoActivo:undefined}>{estado?`● ${value}`:value}</strong></div>;
}

const estilos={
  pagina:{minHeight:"100vh",background:"#f4f7f5",color:"#17211b",fontFamily:"Inter,Arial,system-ui,sans-serif"},
  shell:{minHeight:"100vh"},
  loading:{minHeight:"100vh",display:"grid",placeItems:"center",alignContent:"center",gap:"10px",background:"#f4f7f5"},
  loadingLogo:{width:"220px",maxWidth:"75%"},loadingTitulo:{fontSize:"20px"},
  topbar:{minHeight:"92px",padding:"18px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"20px",background:"linear-gradient(120deg,#06331f 0%,#0b4d2d 54%,#0d6c3c 100%)",color:"#fff",boxShadow:"0 10px 28px rgba(11,66,40,.22)"},
  topbarMarca:{display:"flex",alignItems:"center",gap:"22px",minWidth:0},topbarLogo:{width:"165px",height:"52px",objectFit:"contain"},topbarSeparador:{width:"1px",height:"50px",background:"rgba(255,255,255,.28)"},topbarModulo:{fontSize:"14px",fontWeight:900,color:"#79e2a4",whiteSpace:"nowrap"},topbarEmpresa:{margin:0,fontSize:"28px",lineHeight:1.05},topbarTexto:{margin:"5px 0 0",fontSize:"13px",color:"#e0f2e7"},
  botonVolver:{minHeight:"46px",padding:"0 20px",borderRadius:"12px",border:"1px solid #20bc69",background:"rgba(0,0,0,.12)",color:"#fff",fontWeight:800,cursor:"pointer"},
  contenido:{padding:"18px"},
  kpisGrid:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"14px",marginBottom:"14px"},
  kpiCard:{display:"grid",gridTemplateColumns:"64px 1fr",gap:"14px",alignItems:"center",padding:"18px",border:"1px solid #e1e9e4",borderRadius:"16px",background:"#fff",boxShadow:"0 8px 22px rgba(24,79,49,.08)"},
  kpiDestacado:{display:"grid",gridTemplateColumns:"64px 1fr",gap:"14px",alignItems:"center",padding:"18px",border:"1px solid rgba(255,255,255,.18)",borderRadius:"16px",background:"linear-gradient(135deg,#13924e,#06733a)",color:"#fff",boxShadow:"0 12px 26px rgba(9,118,59,.24)"},
  kpiIcono:{width:"56px",height:"56px",display:"grid",placeItems:"center",borderRadius:"50%",background:"#e8f7ed",color:"#0c8b45",fontSize:"26px",fontWeight:900},kpiIconoDigital:{width:"56px",height:"56px",display:"grid",placeItems:"center",borderRadius:"18px",background:"#f0eaff",color:"#6f42d9",fontSize:"26px",fontWeight:900},
  kpiTitulo:{display:"block",fontSize:"13px",fontWeight:800},kpiValor:{display:"block",marginTop:"4px",fontSize:"28px",lineHeight:1.05},kpiDetalle:{display:"block",marginTop:"5px",fontSize:"12px",color:"#6d7771"},kpiDetalleClaro:{display:"block",marginTop:"5px",fontSize:"12px",color:"#e2f4e8"},
  panelGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",alignItems:"start"},columnaIzquierda:{display:"grid",gap:"12px"},columnaDerecha:{display:"grid",gap:"12px"},
  panel:{padding:"16px",border:"1px solid #dfe7e2",borderRadius:"15px",background:"#fff",boxShadow:"0 7px 18px rgba(18,66,42,.06)"},panelTabla:{marginTop:"12px",padding:"16px",border:"1px solid #dfe7e2",borderRadius:"15px",background:"#fff",boxShadow:"0 7px 18px rgba(18,66,42,.06)"},
  tituloPanel:{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"},tituloPanelIcono:{color:"#0a9b4b",fontSize:"22px",fontWeight:900},tituloPanelTexto:{margin:0,fontSize:"18px"},
  nuevoMovimientoGrid:{display:"grid",gridTemplateColumns:"200px minmax(0,1fr)",gap:"16px",alignItems:"end"},tabsMovimiento:{display:"grid",gridTemplateColumns:"repeat(5,minmax(110px,1fr))",border:"1px solid #d8e1dc",borderRadius:"10px",overflow:"hidden"},tab:{minHeight:"38px",border:"none",borderRight:"1px solid #e1e8e4",background:"#fff",fontWeight:700,cursor:"pointer"},tabActivo:{minHeight:"38px",border:"none",background:"linear-gradient(135deg,#18a45b,#08763d)",color:"#fff",fontWeight:900,cursor:"pointer"},
  campo:{display:"flex",flexDirection:"column",gap:"6px"},label:{fontSize:"12px",fontWeight:800,color:"#283a31"},input:{width:"100%",minHeight:"40px",padding:"9px 12px",boxSizing:"border-box",border:"1px solid #d7dfda",borderRadius:"8px",background:"#fff",color:"#17211b",outline:"none",fontSize:"13px"},inputReadOnly:{width:"100%",minHeight:"40px",padding:"9px 12px",boxSizing:"border-box",border:"1px solid #d7e5dc",borderRadius:"8px",background:"linear-gradient(180deg,#f4f9f6,#edf5f0)",color:"#163c28",fontWeight:900},
  buscarClienteFila:{display:"grid",gridTemplateColumns:"1fr 44px",gap:0},botonBuscar:{border:"none",borderRadius:"0 8px 8px 0",background:"linear-gradient(135deg,#159552,#08743c)",color:"#fff",fontSize:"22px",cursor:"pointer"},resultadosBox:{display:"grid",gap:"8px",marginTop:"10px"},resultadoItem:{padding:"10px 12px",display:"flex",justifyContent:"space-between",border:"1px solid #dde6e0",borderRadius:"8px",background:"#fff",cursor:"pointer"},
  clienteCard:{marginTop:"10px",padding:"14px",border:"1px solid #dce5df",borderRadius:"12px",background:"#fff"},clienteDatosFila:{display:"grid",gridTemplateColumns:"64px 1fr minmax(250px,340px)",gap:"14px",alignItems:"center"},avatarCliente:{width:"58px",height:"58px",display:"grid",placeItems:"center",borderRadius:"50%",background:"linear-gradient(180deg,#e9f8ee,#d4efdf)",color:"#098f47",fontSize:"28px"},clienteInfo:{display:"grid",gap:"3px",fontSize:"12px",color:"#4d5952"},clienteNombre:{fontSize:"17px",color:"#17211b"},cuentaSelectorWrap:{display:"grid",gap:"6px"},cuentaStats:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"10px",marginTop:"14px"},miniStat:{padding:"13px",display:"grid",gap:"6px",border:"1px solid #e1e7e3",borderRadius:"10px",background:"linear-gradient(180deg,#fff,#fafcfb)",fontSize:"12px"},miniStatResaltado:{padding:"13px",display:"grid",gap:"6px",border:"1px solid #f1e2b9",borderRadius:"10px",background:"linear-gradient(180deg,#fffdf5,#fff7dc)",fontSize:"12px"},estadoActivo:{color:"#0a8d46"},
  productoGrid:{display:"grid",gridTemplateColumns:"1fr 1.25fr .65fr",gap:"14px"},cobroGrid:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"12px"},accionesFila:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginTop:"14px"},botonPrincipal:{minHeight:"42px",border:"none",borderRadius:"8px",background:"linear-gradient(135deg,#159552,#08743c)",color:"#fff",fontWeight:900,cursor:"pointer"},botonLimpiar:{minHeight:"42px",border:"1px solid #d8e0dc",borderRadius:"8px",background:"#fff",color:"#17211b",fontWeight:850,cursor:"pointer"},
  tablaHeaderRow:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"14px",flexWrap:"wrap"},filtrosInline:{display:"flex",alignItems:"center",gap:"8px",fontSize:"12px"},inputCompacto:{minHeight:"36px",padding:"7px 10px",border:"1px solid #d8e0dc",borderRadius:"8px",background:"#fff"},inputBuscarTabla:{minHeight:"36px",minWidth:"280px",padding:"7px 10px",border:"1px solid #d8e0dc",borderRadius:"8px",background:"#fff"},botonBuscarMovimientos:{width:"38px",height:"36px",border:"1px solid #d8e0dc",borderRadius:"8px",background:"#fff",cursor:"pointer"},botonHoy:{minHeight:"36px",padding:"0 16px",border:"1px solid #159552",borderRadius:"8px",background:"#fff",color:"#08743c",fontWeight:850,cursor:"pointer"},
  tablaBox:{overflowX:"auto",border:"1px solid #dfe7e2",borderRadius:"10px"},tabla:{width:"100%",minWidth:"1150px",borderCollapse:"collapse"},th:{padding:"11px",background:"linear-gradient(180deg,#f3faf5,#edf6f0)",color:"#1e3327",textAlign:"left",fontSize:"12px",fontWeight:900,whiteSpace:"nowrap"},td:{padding:"10px 11px",borderBottom:"1px solid #edf1ee",fontSize:"12px",whiteSpace:"nowrap"},tdVacio:{padding:"28px",textAlign:"center",color:"#6b7280"},badgeTipo:{padding:"4px 9px",borderRadius:"999px",background:"#e7f7ed",color:"#0d8244",fontWeight:800},badgeEstado:{color:"#0a8d46",fontWeight:800}
};
