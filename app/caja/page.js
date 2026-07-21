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
      "Abono",
      "Venta de producto",
    ].includes(tipoMovimiento);
  }

  function esVentaCredito() {
    return tipoMovimiento === "Venta Crédito";
  }

  function esVentaContado() {
    return ["Venta Contado", "Venta de producto"].includes(tipoMovimiento);
  }

  function esAbonoProducto() {
    return tipoMovimiento === "Abono";
  }

  function esPagoDeCuenta() {
    return [
      "Pago Crédito",
      "Pago Credito",
      "Cancelación",
    ].includes(tipoMovimiento);
  }

  function esAbonoExistente() {
    return esAbonoProducto() && Boolean(cuentaSeleccionada?.id);
  }

  function esAbonoNuevoConProducto() {
    return (
      esAbonoProducto() &&
      !cuentaSeleccionada?.id &&
      Boolean(productoSeleccionado)
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
        "Pago Crédito",
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
        "Pago Crédito",
      ];
    }

    return [
      "Venta Contado",
      "Venta Crédito",
      "Abono",
      "Pago Crédito",
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

    if (esVentaCredito() || esAbonoProducto()) {
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

      if (!esAbonoProducto()) {
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

    if (!esAbonoProducto()) {
      setMonto("");
    }
  }

  function recalcularValorProducto() {
    if (!productoSeleccionado || !esVentaConProducto()) return;

    const total =
      precioProducto(productoSeleccionado) *
      Number(cantidad || 1);

    setValorProducto(String(total));

    if (!esAbonoProducto()) {
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

  async function crearCuentaComercialVentaCredito(
    empresaId,
    clienteBase,
    numeroVenta
  ) {
    const totalProducto = Number(valorProducto || 0);

    const saldoInicial = esAbonoProducto()
      ? Math.max(
          totalProducto - Number(monto || 0),
          0
        )
      : totalProducto;

    const fechaVencimiento =
      calcularNuevaFechaVencimiento(fechaPago, "Mensual");

    const { data, error } = await supabase
      .from("informacion_comercial")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteBase.id,
          numero_cuenta: numeroVenta,
          tipo_producto:
            productoSeleccionado?.categoria ||
            "Producto",
          descripcion:
            productoSeleccionado?.nombre ||
            productoSeleccionado?.descripcion ||
            concepto ||
            tipoMovimiento,
          modalidad: esAbonoProducto()
            ? "Abono"
            : "Crédito",
          monto_total: totalProducto,
          saldo_actual: saldoInicial,
          cuota: Number(monto || 0),
          fecha_inicio: fechaPago,
          fecha_vencimiento: fechaVencimiento,
          estado:
            saldoInicial <= 0
              ? "Cancelado"
              : "Activo",
          vendedor: responsable,
          responsable,
          codigo_producto:
            codigoProducto ||
            productoSeleccionado?.codigo ||
            null,
          producto_id:
            productoSeleccionado?.id ||
            null,
          numero_venta: numeroVenta,
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Error creando cuenta comercial: " + error.message);
      return null;
    }

    const { error: errorCobranza } =
      await supabase
        .from("informacion_cobranza")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: clienteBase.id,
            informacion_comercial_id: data.id,
            estado_cobranza:
              saldoInicial <= 0
                ? "Cancelado"
                : "Al Día",
            fecha_ultimo_pago:
              esAbonoProducto()
                ? fechaPago
                : null,
            monto_ultimo_pago:
              esAbonoProducto()
                ? Number(monto || 0)
                : 0,
            responsable_cobro: null,
            observacion_cobro:
              esAbonoProducto()
                ? `Abono inicial registrado bajo venta ${numeroVenta}`
                : `Venta crédito registrada bajo venta ${numeroVenta}`,
          },
        ]);

    if (errorCobranza) {
      alert(
        "Cuenta creada, pero hubo error creando cobranza: " +
          errorCobranza.message
      );
    }

    return data;
  }

  async function actualizarSaldoCuenta(
    empresaId,
    cuentaAplicar = cuentaSeleccionada
  ) {
    if (!cuentaAplicar?.id) {
      alert("No se encontró la cuenta comercial.");
      return null;
    }

    const montoPago = Number(monto || 0);

    const { data: cuentaActual, error } =
      await supabase
        .from("informacion_comercial")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("id", cuentaAplicar.id)
        .maybeSingle();

    if (error || !cuentaActual) {
      alert("No se pudo consultar la cuenta comercial.");
      return null;
    }

    const saldoAnterior = Number(
      cuentaActual.saldo_actual || 0
    );

    if (saldoAnterior <= 0) {
      alert("Esta cuenta no tiene saldo pendiente.");
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

    const saldoFinal = Math.max(
      saldoAnterior - montoPago,
      0
    );

    const { error: errorSaldo } =
      await supabase
        .from("informacion_comercial")
        .update({
          saldo_actual: saldoFinal,
          estado:
            saldoFinal <= 0
              ? "Cancelado"
              : "Activo",
        })
        .eq("empresa_id", empresaId)
        .eq("id", cuentaActual.id);

    if (errorSaldo) {
      alert("Error actualizando saldo: " + errorSaldo.message);
      return null;
    }

    const cuentaLocalActualizada = {
      ...cuentaActual,
      saldo_actual: saldoFinal,
      estado:
        saldoFinal <= 0
          ? "Cancelado"
          : "Activo",
    };

    setCuentaSeleccionada(cuentaLocalActualizada);

    setCuentasCliente((actuales) =>
      actuales.map((cuenta) =>
        cuenta.id === cuentaActual.id
          ? cuentaLocalActualizada
          : cuenta
      )
    );

    return cuentaLocalActualizada;
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

    const abonoExistente = esAbonoExistente();
    const abonoNuevoConProducto =
      esAbonoNuevoConProducto();

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

    if (
      requiereCliente() &&
      !clienteSeleccionado
    ) {
      alert("Seleccione un cliente.");
      return;
    }

    if (
      requiereCuentaMembresia() &&
      !cuentaSeleccionada
    ) {
      alert("Seleccione la cuenta de membresía del cliente.");
      return;
    }

    if (
      esPagoDeCuenta() &&
      !cuentaSeleccionada
    ) {
      alert("Seleccione una cuenta para aplicar el pago.");
      return;
    }

    if (
      (esVentaCredito() ||
        abonoNuevoConProducto ||
        tipoMovimiento === "Venta de producto") &&
      !productoSeleccionado
    ) {
      alert("Seleccione un producto válido del inventario.");
      return;
    }

    if (
      esVentaConProducto() &&
      !abonoExistente &&
      Number(cantidad || 0) <= 0
    ) {
      alert("Ingrese una cantidad válida.");
      return;
    }

    if (!responsable) {
      alert("Seleccione el vendedor o responsable.");
      return;
    }

    if (
      esAbonoProducto() &&
      !abonoExistente &&
      Number(monto || 0) >= Number(valorProducto || 0)
    ) {
      alert(
        "El abono debe ser menor que el valor total. Si paga completo use Venta Contado."
      );
      return;
    }

    setGuardando(true);

    try {
      const numeroTransaccion = generarTransaccion();

      const numeroVenta =
        esVentaConProducto()
          ? numeroVentaAbono.trim() ||
            generarNumeroVenta()
          : cuentaSeleccionada?.numero_cuenta ||
            null;

      const usuarioRegistro =
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("adminKonaxNombre") ||
        "Caja";

      let clienteBase = clienteSeleccionado;

      if (
        esVentaConProducto() &&
        (clienteSeleccionado || nombreContado.trim())
      ) {
        clienteBase =
          await asegurarClienteParaVenta(empresaId);
      }

      if (
        (esVentaCredito() || esAbonoProducto()) &&
        !clienteBase
      ) {
        alert(
          "Ingrese o seleccione un cliente para registrar este movimiento."
        );
        return;
      }

      const descripcionFinal =
        concepto ||
        productoSeleccionado?.nombre ||
        productoSeleccionado?.descripcion ||
        cuentaSeleccionada?.descripcion ||
        observacion ||
        tipoMovimiento;

      let cuentaParaMovimiento = cuentaSeleccionada;

      if (
        esVentaCredito() ||
        abonoNuevoConProducto
      ) {
        cuentaParaMovimiento =
          await crearCuentaComercialVentaCredito(
            empresaId,
            clienteBase,
            numeroVenta
          );

        if (!cuentaParaMovimiento) return;
      }

      if (
        esPagoDeCuenta() ||
        abonoExistente
      ) {
        cuentaParaMovimiento =
          await actualizarSaldoCuenta(
            empresaId,
            cuentaParaMovimiento
          );

        if (!cuentaParaMovimiento) return;
      }

      if (requiereCuentaMembresia()) {
        cuentaParaMovimiento =
          await procesarMembresiaDesdeCaja(empresaId);

        if (!cuentaParaMovimiento) return;
      }

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

      const { error } = await supabase
        .from("caja")
        .insert([
          {
            empresa_id: empresaId,
            tipo: tipoMovimiento,
            descripcion: descripcionFinal,
            monto: Number(monto),
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
              cuentaParaMovimiento?.id ||
              null,
            numero_cuenta:
              cuentaParaMovimiento?.numero_cuenta ||
              numeroVenta ||
              null,
            estado: "Procesado",
            cliente_nombre: clienteNombreFinal,
            cliente_cedula: clienteCedulaFinal,
            vendedor_responsable: responsable,
            cliente_direccion: clienteDireccionFinal,
            cliente_telefono: clienteTelefonoFinal,
          },
        ]);

      if (error) {
        alert(
          "No se pudo registrar el movimiento en caja: " +
            error.message
        );
        return;
      }

      const debeDescontarInventario =
        esVentaContado() ||
        abonoNuevoConProducto;

      if (debeDescontarInventario) {
        const ok =
          await descontarInventario(empresaId);

        if (!ok) return;
      }

      alert(
        tipoMovimiento === "Renovación"
          ? "Pago registrado y membresía renovada correctamente."
          : tipoMovimiento === "Membresía"
          ? "Pago registrado y membresía activada correctamente."
          : tipoMovimiento === "Venta de producto"
          ? "Venta registrada y producto descontado del inventario."
          : "Movimiento registrado correctamente."
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
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={estilos.loadingLogo}
        />
        <strong style={estilos.loadingTitulo}>
          Preparando caja
        </strong>
      </div>
    );
  }

  return (
    <main style={estilos.pagina}>
      <div style={estilos.contenedor}>
        <header style={estilos.header}>
          <div style={estilos.headerIzquierda}>
            <div style={estilos.logoBox}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={estilos.logo}
              />
            </div>

            <div>
              <span style={estilos.etiqueta}>
                CAJA Y REGISTRO DE INGRESOS
              </span>

              <h1 style={estilos.nombreNegocio}>
                {empresaNombre}
              </h1>

              <p style={estilos.tituloModulo}>
                Módulo de Caja
              </p>

              <p style={estilos.subtitulo}>
                Registro de pagos, membresías, ventas,
                servicios e ingresos.
              </p>
            </div>
          </div>

          <button
            onClick={volverDashboard}
            style={estilos.botonVolver}
          >
            ← Centro de Operaciones
          </button>
        </header>

        <section style={estilos.resumenGrid}>
          <ResumenCard
            titulo="Movimientos hoy"
            valor={movimientosHoy.length}
            icono="🧾"
          />
          <ResumenCard
            titulo="Total de hoy"
            valor={`$${totalHoy.toFixed(2)}`}
            icono="💰"
            destacado
          />
          <ResumenCard
            titulo="Efectivo hoy"
            valor={`$${totalEfectivoHoy.toFixed(2)}`}
            icono="💵"
          />
          <ResumenCard
            titulo="Pagos digitales"
            valor={`$${totalDigitalHoy.toFixed(2)}`}
            icono="📲"
          />
        </section>

        <section style={estilos.mainGrid}>
          <div>
            <article style={estilos.card}>
              <CabeceraSeccion
                titulo="Nuevo movimiento"
                texto="Seleccione qué está cobrando y complete la información."
                numero="01"
              />

              <div style={estilos.grid}>
                <Campo label="Fecha">
                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) =>
                      setFechaPago(e.target.value)
                    }
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Tipo de movimiento">
                  <select
                    value={tipoMovimiento}
                    onChange={(e) => {
                      setTipoMovimiento(e.target.value);
                      setMonto("");
                      setValorProducto("");
                      setCodigoProducto("");
                      setProductoSeleccionado(null);
                      setNumeroVentaAbono("");
                      setClienteSeleccionado(null);
                      setCuentasCliente([]);
                      setCuentaSeleccionada(null);
                    }}
                    style={estilos.input}
                  >
                    {opcionesMovimiento.map((opcion) => (
                      <option
                        key={opcion}
                        value={opcion}
                      >
                        {opcion}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
            </article>

            {(requiereCliente() ||
              clienteEsOpcional()) && (
              <article style={estilos.card}>
                <CabeceraSeccion
                  titulo={
                    requiereCliente()
                      ? "Cliente y cuenta"
                      : "Cliente opcional"
                  }
                  texto={
                    requiereCliente()
                      ? "Busque y seleccione al cliente relacionado con el pago."
                      : "Puede asociar el ingreso a un cliente o dejarlo sin cliente."
                  }
                  numero="02"
                />

                <div style={estilos.toolbar}>
                  <Campo label="Buscar cliente">
                    <input
                      placeholder="Nombre, cédula, teléfono o cuenta..."
                      value={buscarCliente}
                      onChange={(e) =>
                        setBuscarCliente(e.target.value)
                      }
                      style={estilos.input}
                    />
                  </Campo>

                  <button
                    style={estilos.botonSecundario}
                    onClick={buscarClientes}
                  >
                    Buscar
                  </button>
                </div>

                {resultadosBusqueda.length > 0 && (
                  <div style={estilos.resultadosBox}>
                    {resultadosBusqueda.map(
                      (item, index) => (
                        <button
                          key={`${item.cliente.id}-${index}`}
                          style={estilos.resultadoItem}
                          onClick={() =>
                            seleccionarResultado(item)
                          }
                        >
                          <strong>
                            {item.cliente.nombre}
                          </strong>
                          <span>
                            {item.cuenta?.numero_cuenta ||
                              "Seleccionar"}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}

                {clienteSeleccionado && (
                  <div style={estilos.clienteSeleccionado}>
                    <h3 style={estilos.clienteNombre}>
                      {clienteSeleccionado.nombre}
                    </h3>

                    {cuentasCliente.length > 0 && (
                      <Campo label="Cuenta o membresía">
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
                          }}
                          style={estilos.input}
                        >
                          <option value="">
                            Seleccione una cuenta
                          </option>

                          {cuentasCliente.map((cuenta) => (
                            <option
                              key={cuenta.id}
                              value={cuenta.id}
                            >
                              {cuenta.numero_cuenta} -{" "}
                              {cuenta.descripcion}
                            </option>
                          ))}
                        </select>
                      </Campo>
                    )}
                  </div>
                )}
              </article>
            )}

            {esVentaConProducto() && (
              <article style={estilos.card}>
                <CabeceraSeccion
                  titulo="Producto e inventario"
                  texto="Seleccione el producto y confirme la cantidad."
                  numero="03"
                />

                <div style={estilos.grid}>
                  <Campo label="Código del producto">
                    <input
                      value={codigoProducto}
                      onChange={(e) =>
                        seleccionarProductoPorCodigo(
                          e.target.value
                        )
                      }
                      style={estilos.input}
                    />
                  </Campo>

                  <Campo label="Seleccionar producto">
                    <select
                      value={
                        productoSeleccionado?.id || ""
                      }
                      onChange={(e) => {
                        const producto =
                          productos.find(
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
                        Seleccione producto
                      </option>

                      {productos.map((producto) => (
                        <option
                          key={producto.id}
                          value={producto.id}
                        >
                          {producto.codigo} -{" "}
                          {producto.nombre} - Stock{" "}
                          {stockProducto(producto)}
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

                  <Campo label="Valor total">
                    <input
                      value={valorProducto}
                      readOnly
                      style={estilos.inputReadOnly}
                    />
                  </Campo>
                </div>
              </article>
            )}

            <article style={estilos.card}>
              <CabeceraSeccion
                titulo="Detalle del cobro"
                texto="Confirme el método, monto y responsable."
                numero={esVentaConProducto() ? "04" : "03"}
              />

              <div style={estilos.grid}>
                <Campo label="Método de pago">
                  <select
                    value={metodoPago}
                    onChange={(e) =>
                      setMetodoPago(e.target.value)
                    }
                    style={estilos.input}
                  >
                    <option>Efectivo</option>
                    <option>Transferencia</option>
                    <option>Yappy</option>
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
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Concepto">
                  <input
                    value={concepto}
                    onChange={(e) =>
                      setConcepto(e.target.value)
                    }
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Responsable">
                  <select
                    value={responsable}
                    onChange={(e) =>
                      setResponsable(e.target.value)
                    }
                    style={estilos.input}
                  >
                    <option value="">
                      Seleccione responsable
                    </option>

                    {vendedores.map((vendedor) => (
                      <option
                        key={vendedor.id}
                        value={vendedor.nombre}
                      >
                        {vendedor.nombre} -{" "}
                        {vendedor.rol}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <Campo label="Observación">
                <textarea
                  value={observacion}
                  onChange={(e) =>
                    setObservacion(e.target.value)
                  }
                  style={estilos.textarea}
                />
              </Campo>

              <div style={estilos.acciones}>
                <button
                  style={estilos.botonPrincipal}
                  onClick={guardarMovimiento}
                  disabled={guardando}
                >
                  {guardando
                    ? "Procesando..."
                    : "Registrar movimiento"}
                </button>

                <button
                  style={estilos.botonLimpiar}
                  onClick={limpiarFormulario}
                  disabled={guardando}
                >
                  Limpiar formulario
                </button>
              </div>
            </article>
          </div>

          <aside>
            <article style={estilos.cardSticky}>
              <CabeceraSeccion
                titulo="Resumen del movimiento"
                texto="Revise la información antes de guardar."
                numero="✓"
              />

              <div style={estilos.resumenMovimiento}>
                <FilaResumen
                  label="Negocio"
                  valor={empresaNombre}
                />
                <FilaResumen
                  label="Movimiento"
                  valor={tipoMovimiento || "-"}
                />
                <FilaResumen
                  label="Cliente"
                  valor={
                    clienteSeleccionado?.nombre ||
                    nombreContado ||
                    "Sin cliente"
                  }
                />
                <FilaResumen
                  label="Cuenta"
                  valor={
                    cuentaSeleccionada?.numero_cuenta ||
                    "-"
                  }
                />
                <FilaResumen
                  label="Método"
                  valor={metodoPago}
                />
                <FilaResumen
                  label="Responsable"
                  valor={responsable || "-"}
                />
              </div>

              <div style={estilos.totalBox}>
                <span>Total a registrar</span>
                <strong>
                  ${Number(monto || 0).toFixed(2)}
                </strong>
              </div>
            </article>
          </aside>
        </section>

        <article style={estilos.card}>
          <CabeceraSeccion
            titulo="Movimientos registrados"
            texto="Por defecto se muestran únicamente los movimientos del día. Use las fechas para consultar periodos anteriores."
            numero={String(movimientos.length)}
          />

          <div style={estilos.filtrosMovimientos}>
            <Campo label="Desde">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) =>
                  setFechaDesde(e.target.value)
                }
                style={estilos.input}
              />
            </Campo>

            <Campo label="Hasta">
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) =>
                  setFechaHasta(e.target.value)
                }
                style={estilos.input}
              />
            </Campo>

            <button
              onClick={buscarMovimientosPorFecha}
              style={estilos.botonFiltrar}
              disabled={filtrandoMovimientos}
            >
              {filtrandoMovimientos
                ? "Buscando..."
                : "Buscar movimientos"}
            </button>

            <button
              onClick={mostrarMovimientosHoy}
              style={estilos.botonHoy}
              disabled={filtrandoMovimientos}
            >
              Ver hoy
            </button>
          </div>

          <div style={estilos.tablaBox}>
            <table style={estilos.tabla}>
              <thead>
                <tr>
                  <th style={estilos.th}>Fecha</th>
                  <th style={estilos.th}>Transacción</th>
                  <th style={estilos.th}>Cliente</th>
                  <th style={estilos.th}>Cuenta</th>
                  <th style={estilos.th}>Tipo</th>
                  <th style={estilos.th}>Método</th>
                  <th style={estilos.th}>Monto</th>
                  <th style={estilos.th}>Responsable</th>
                  <th style={estilos.th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.length === 0 ? (
                  <tr>
                    <td
                      style={estilos.tdVacio}
                      colSpan="9"
                    >
                      No hay movimientos en el periodo seleccionado.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((movimiento) => (
                    <tr key={movimiento.id}>
                      <td style={estilos.td}>
                        {String(
                          movimiento.fecha_pago ||
                            movimiento.created_at ||
                            ""
                        ).slice(0, 10)}
                      </td>
                      <td style={estilos.td}>
                        {movimiento.numero_transaccion ||
                          "-"}
                      </td>
                      <td style={estilos.td}>
                        {movimiento.cliente_nombre ||
                          "-"}
                      </td>
                      <td style={estilos.td}>
                        {movimiento.numero_cuenta ||
                          "-"}
                      </td>
                      <td style={estilos.td}>
                        {movimiento.tipo}
                      </td>
                      <td style={estilos.td}>
                        {movimiento.metodo_pago}
                      </td>
                      <td style={estilos.td}>
                        <strong>
                          $
                          {Number(
                            movimiento.monto || 0
                          ).toFixed(2)}
                        </strong>
                      </td>
                      <td style={estilos.td}>
                        {movimiento.vendedor_responsable ||
                          "-"}
                      </td>
                      <td style={estilos.td}>
                        {movimiento.estado ||
                          "Procesado"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
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
      "radial-gradient(circle at top right, rgba(22,131,79,.12), transparent 30%), #eef2f7",
    padding: "24px",
    color: "#111827",
    fontFamily: "Inter, Arial, system-ui, sans-serif",
  },

  contenedor: {
    maxWidth: "1500px",
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
    marginBottom: "20px",
    padding: "28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    borderRadius: "24px",
    background:
      "linear-gradient(135deg, #0a1710, #123924 65%, #17673e)",
    color: "#ffffff",
  },

  headerIzquierda: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },

  logoBox: {
    width: "190px",
    height: "78px",
    padding: "9px",
    display: "grid",
    placeItems: "center",
    borderRadius: "16px",
    background: "#ffffff",
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
    minHeight: "44px",
    padding: "11px 18px",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: "11px",
    background: "rgba(255,255,255,.10)",
    color: "#ffffff",
    fontWeight: "800",
    cursor: "pointer",
  },

  resumenGrid: {
    marginBottom: "20px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: "14px",
  },

  resumenCard: {
    padding: "18px",
    display: "grid",
    gap: "7px",
    border: "1px solid #dfe7e2",
    borderRadius: "17px",
    background: "#ffffff",
  },

  resumenCardDestacado: {
    padding: "18px",
    display: "grid",
    gap: "7px",
    borderRadius: "17px",
    background:
      "linear-gradient(135deg, #16834f, #125b39)",
    color: "#ffffff",
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
    padding: "24px",
    border: "1px solid #e0e7e2",
    borderRadius: "20px",
    background: "#ffffff",
  },

  cardSticky: {
    position: "sticky",
    top: "18px",
    padding: "22px",
    border: "1px solid #dce5df",
    borderRadius: "20px",
    background: "#ffffff",
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
    minWidth: "35px",
    height: "35px",
    padding: "0 9px",
    display: "grid",
    placeItems: "center",
    borderRadius: "999px",
    background: "#eaf7ef",
    color: "#16834f",
    fontWeight: "900",
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
    minHeight: "44px",
    padding: "11px 12px",
    boxSizing: "border-box",
    border: "1px solid #cfd8d2",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#111827",
  },

  inputReadOnly: {
    width: "100%",
    minHeight: "44px",
    padding: "11px 12px",
    boxSizing: "border-box",
    border: "1px solid #d7ded9",
    borderRadius: "10px",
    background: "#f1f5f2",
    color: "#17623c",
    fontWeight: "800",
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

  acciones: {
    marginTop: "18px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  botonPrincipal: {
    minHeight: "44px",
    padding: "11px 20px",
    border: "none",
    borderRadius: "10px",
    background: "#16834f",
    color: "#ffffff",
    fontWeight: "850",
    cursor: "pointer",
  },

  botonLimpiar: {
    minHeight: "44px",
    padding: "11px 20px",
    border: "1px solid #d2dbd5",
    borderRadius: "10px",
    background: "#ffffff",
    fontWeight: "800",
    cursor: "pointer",
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
    padding: "16px",
    display: "grid",
    gap: "5px",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, #0f2f20, #17623c)",
    color: "#ffffff",
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
    border: "1px solid #e1e7e3",
    borderRadius: "13px",
  },

  tabla: {
    width: "100%",
    minWidth: "1000px",
    borderCollapse: "collapse",
  },

  th: {
    padding: "12px",
    background: "#111827",
    color: "#ffffff",
    textAlign: "left",
    whiteSpace: "nowrap",
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
};
