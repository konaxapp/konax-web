"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function fechaPanama(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const valor = (tipo) => p.find((x) => x.type === tipo)?.value || "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function sumarMeses(fechaTexto, meses) {
  if (!fechaTexto) return "";
  const [a, m, d] = String(fechaTexto).slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return "";
  const fecha = new Date(a, m - 1, 1, 12, 0, 0);
  fecha.setMonth(fecha.getMonth() + meses);
  const ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  fecha.setDate(Math.min(d, ultimo));
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function sumarDias(fechaTexto, dias) {
  if (!fechaTexto) return "";
  const [a, m, d] = String(fechaTexto).slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return "";
  const fecha = new Date(a, m - 1, d, 12, 0, 0);
  fecha.setDate(fecha.getDate() + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function nuevaVigencia(fechaBase, periodicidad) {
  if (periodicidad === "Diaria") return sumarDias(fechaBase, 1);
  if (periodicidad === "Semanal") return sumarDias(fechaBase, 7);
  if (periodicidad === "Quincenal") return sumarDias(fechaBase, 15);
  if (periodicidad === "Trimestral") return sumarMeses(fechaBase, 3);
  if (periodicidad === "Semestral") return sumarMeses(fechaBase, 6);
  if (periodicidad === "Anual") return sumarMeses(fechaBase, 12);
  return sumarMeses(fechaBase, 1);
}

export default function Caja() {
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("");
  const [fechaPago, setFechaPago] = useState(fechaPanama());

  const [buscarCliente, setBuscarCliente] = useState("");
  const [resultados, setResultados] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [cuenta, setCuenta] = useState(null);

  const [nombreContado, setNombreContado] = useState("");
  const [cedulaContado, setCedulaContado] = useState("");
  const [telefonoContado, setTelefonoContado] = useState("");
  const [direccionContado, setDireccionContado] = useState("");

  const [productos, setProductos] = useState([]);
  const [producto, setProducto] = useState(null);
  const [codigoProducto, setCodigoProducto] = useState("");
  const [cantidad, setCantidad] = useState("1");

  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observacion, setObservacion] = useState("");

  const [usuarios, setUsuarios] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    iniciar();
  }, []);

  useEffect(() => {
    if (!producto || !esVentaProducto()) return;
    const total = precioProducto(producto) * Number(cantidad || 1);
    setMonto(String(total));
    setConcepto(producto.nombre || producto.descripcion || "Venta de producto");
  }, [producto, cantidad, tipoMovimiento]);

  async function iniciar() {
    const id = localStorage.getItem("empresaId") || localStorage.getItem("empresaAdminCreadaId");
    if (!id) {
      alert("No hay empresa activa.");
      router.replace("/login");
      return;
    }
    setEmpresaId(id);
    setCargando(true);
    await Promise.all([cargarEmpresa(id), cargarUsuarios(id), cargarProductos(id), cargarMovimientos(id)]);
    setCargando(false);
  }

  function esMembresia() {
    const tipo = normalizar(`${categoria} ${tipoNegocio}`);
    return ["gimnasio", "club", "academia", "escuela", "colegio", "suscripciones", "membres"].some((x) => tipo.includes(x));
  }

  function opcionesMovimiento() {
    const tipo = normalizar(`${categoria} ${tipoNegocio}`);
    if (esMembresia()) {
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
    if (["muebleria", "electronica", "financiera", "cooperativa", "empeno"].some((x) => tipo.includes(x))) {
      return ["Venta Contado", "Venta Crédito", "Abono", "Pago Crédito", "Cancelación"];
    }
    return ["Venta Contado", "Venta Crédito", "Abono", "Pago Crédito", "Servicio Contado"];
  }

  function requiereCliente() {
    if (esMembresia()) return ["Inscripción / Matrícula", "Membresía", "Renovación"].includes(tipoMovimiento);
    return !["Venta Contado", "Servicio Contado"].includes(tipoMovimiento);
  }

  function clienteOpcional() {
    return esMembresia() && ["Pase diario", "Clase / Sesión individual", "Venta de producto", "Servicio adicional", "Otro ingreso"].includes(tipoMovimiento);
  }

  function requiereCuentaMembresia() {
    return ["Membresía", "Renovación"].includes(tipoMovimiento);
  }

  function esVentaProducto() {
    return ["Venta Contado", "Venta Crédito", "Abono", "Venta de producto"].includes(tipoMovimiento);
  }

  function esVentaCredito() {
    return tipoMovimiento === "Venta Crédito";
  }

  function esAbono() {
    return tipoMovimiento === "Abono";
  }

  function esPagoCuenta() {
    return ["Pago Crédito", "Cancelación"].includes(tipoMovimiento) || (esAbono() && cuenta?.id);
  }

  async function cargarEmpresa(id) {
    const { data, error } = await supabase
      .from("empresas")
      .select("nombre, categoria_negocio, tipo_negocio")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      alert("Error cargando empresa: " + error.message);
      return;
    }
    const nombre = data?.nombre || localStorage.getItem("empresaNombre") || "Negocio sin nombre";
    setEmpresaNombre(nombre);
    setCategoria(data?.categoria_negocio || "");
    setTipoNegocio(data?.tipo_negocio || "");
    localStorage.setItem("empresaNombre", nombre);

    const lista = (() => {
      const t = normalizar(`${data?.categoria_negocio || ""} ${data?.tipo_negocio || ""}`);
      if (["gimnasio", "club", "academia", "escuela", "colegio", "suscripciones", "membres"].some((x) => t.includes(x))) {
        return ["Inscripción / Matrícula", "Membresía", "Renovación", "Pase diario", "Clase / Sesión individual", "Venta de producto", "Servicio adicional", "Otro ingreso"];
      }
      if (["muebleria", "electronica", "financiera", "cooperativa", "empeno"].some((x) => t.includes(x))) {
        return ["Venta Contado", "Venta Crédito", "Abono", "Pago Crédito", "Cancelación"];
      }
      return ["Venta Contado", "Venta Crédito", "Abono", "Pago Crédito", "Servicio Contado"];
    })();
    setTipoMovimiento(lista[0]);
  }

  async function cargarUsuarios(id) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id,nombre,rol,estado")
      .eq("empresa_id", id)
      .eq("estado", "Activo")
      .order("nombre");
    if (error) return alert("Error cargando responsables: " + error.message);
    setUsuarios(data || []);
    const actual = localStorage.getItem("usuarioNombre") || localStorage.getItem("nombreUsuario") || "";
    if (actual) setResponsable(actual);
  }

  async function cargarProductos(id) {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("empresa_id", id)
      .order("nombre");
    if (error) return alert("Error cargando productos: " + error.message);
    setProductos(data || []);
  }

  async function cargarMovimientos(id = empresaId) {
    if (!id) return;
    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", id)
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) return alert("Error cargando movimientos: " + error.message);
    setMovimientos(data || []);
  }

  function stockProducto(item) {
    return Number(item?.stock_actual ?? item?.stock ?? 0);
  }

  function precioProducto(item) {
    if (!item) return 0;
    if (esVentaCredito() || esAbono()) return Number(item.precio_credito || item.precio_venta || 0);
    return Number(item.precio_venta || item.precio_credito || 0);
  }

  function seleccionarProducto(item) {
    setProducto(item || null);
    setCodigoProducto(item?.codigo || "");
  }

  function seleccionarPorCodigo(codigo) {
    setCodigoProducto(codigo);
    const encontrado = productos.find((p) => String(p.codigo || "").toLowerCase() === String(codigo || "").trim().toLowerCase());
    seleccionarProducto(encontrado || null);
  }

  async function buscarClientes() {
    const texto = buscarCliente.trim().replace(/[%_,()]/g, "");
    if (texto.length < 3) return alert("Escriba mínimo 3 caracteres.");

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(`nombre.ilike.%${texto}%,cedula.ilike.%${texto}%,telefono.ilike.%${texto}%`)
      .limit(20);
    if (error) return alert("Error buscando cliente: " + error.message);
    setResultados((data || []).map((x) => ({ cliente: x })));
  }

  async function seleccionarCliente(resultado) {
    setCliente(resultado.cliente);
    setBuscarCliente(resultado.cliente.nombre || "");
    setResultados([]);

    const { data, error } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", resultado.cliente.id)
      .order("created_at", { ascending: false });
    if (error) return alert("Error cargando cuentas: " + error.message);
    setCuentas(data || []);
    setCuenta(data?.[0] || null);
  }

  async function crearClienteContado() {
    if (cliente) return cliente;
    if (!nombreContado.trim()) return null;
    const { data, error } = await supabase
      .from("clientes")
      .insert([{ empresa_id: empresaId, nombre: nombreContado.trim(), cedula: cedulaContado.trim(), telefono: telefonoContado.trim(), direccion: direccionContado.trim(), estado: "Activo" }])
      .select()
      .single();
    if (error) return alert("Error creando cliente: " + error.message), null;
    return data;
  }

  async function descontarInventario() {
    if (!producto) return true;
    const cant = Number(cantidad || 0);
    const stock = stockProducto(producto);
    if (cant <= 0) return alert("Cantidad inválida."), false;
    if (cant > stock) return alert(`Stock insuficiente. Disponible: ${stock}.`), false;
    const nuevo = stock - cant;
    const { error } = await supabase
      .from("productos")
      .update({ stock_actual: nuevo })
      .eq("empresa_id", empresaId)
      .eq("id", producto.id);
    if (error) return alert("Error descontando inventario: " + error.message), false;

    await supabase.from("movimientos_inventario").insert([{
      empresa_id: empresaId,
      producto_id: producto.id,
      tipo_movimiento: "SALIDA",
      cantidad: cant,
      stock_anterior: stock,
      stock_nuevo: nuevo,
      observacion: `${tipoMovimiento} desde caja`,
      usuario: responsable || "Caja",
    }]);
    return true;
  }

  async function procesarMembresia() {
    if (!requiereCuentaMembresia()) return cuenta;
    if (!cuenta?.id) return alert("Seleccione la cuenta de membresía."), null;

    const { data: suscripcion, error } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuenta.id)
      .maybeSingle();
    if (error) return alert("Error consultando membresía: " + error.message), null;
    if (!suscripcion) return alert("La cuenta seleccionada no está vinculada a una membresía."), null;

    if (tipoMovimiento === "Renovación") {
      const hoy = fechaPanama();
      const base = String(suscripcion.fecha_vencimiento || hoy).slice(0, 10) < hoy ? hoy : String(suscripcion.fecha_vencimiento || hoy).slice(0, 10);
      const nueva = nuevaVigencia(base, suscripcion.periodicidad);

      const { error: e1 } = await supabase
        .from("suscripciones")
        .update({ fecha_vencimiento: nueva, estado: "Activo", forma_pago: metodoPago })
        .eq("empresa_id", empresaId)
        .eq("id", suscripcion.id);
      if (e1) return alert("Error renovando membresía: " + e1.message), null;

      await supabase
        .from("informacion_comercial")
        .update({ fecha_vencimiento: nueva, saldo_actual: 0, estado: "Activo", estado_servicio: "Activo", fecha_suspension: null, fecha_cancelacion: null, motivo_suspension: null })
        .eq("empresa_id", empresaId)
        .eq("id", cuenta.id);

      return { ...cuenta, fecha_vencimiento: nueva, saldo_actual: 0, estado: "Activo" };
    }

    await supabase
      .from("suscripciones")
      .update({ estado: "Activo", forma_pago: metodoPago })
      .eq("empresa_id", empresaId)
      .eq("id", suscripcion.id);

    await supabase
      .from("informacion_comercial")
      .update({ saldo_actual: 0, estado: "Activo", estado_servicio: "Activo" })
      .eq("empresa_id", empresaId)
      .eq("id", cuenta.id);

    return { ...cuenta, saldo_actual: 0, estado: "Activo" };
  }

  async function actualizarSaldoCredito() {
    if (!cuenta?.id) return alert("Seleccione una cuenta."), null;
    const pago = Number(monto || 0);
    const saldo = Number(cuenta.saldo_actual || 0);
    if (pago <= 0) return alert("Monto inválido."), null;
    if (pago > saldo) return alert(`El pago supera el saldo de $${saldo.toFixed(2)}.`), null;
    const nuevo = Math.max(saldo - pago, 0);
    const { error } = await supabase
      .from("informacion_comercial")
      .update({ saldo_actual: nuevo, estado: nuevo <= 0 ? "Cancelado" : "Activo" })
      .eq("empresa_id", empresaId)
      .eq("id", cuenta.id);
    if (error) return alert("Error actualizando saldo: " + error.message), null;
    return { ...cuenta, saldo_actual: nuevo, estado: nuevo <= 0 ? "Cancelado" : "Activo" };
  }

  async function crearCuentaCredito(clienteBase) {
    const total = precioProducto(producto) * Number(cantidad || 1);
    const inicial = esAbono() ? Number(monto || 0) : 0;
    const saldo = Math.max(total - inicial, 0);
    const numero = `VTA-${Date.now()}`;
    const { data, error } = await supabase
      .from("informacion_comercial")
      .insert([{
        empresa_id: empresaId,
        cliente_id: clienteBase.id,
        numero_cuenta: numero,
        tipo_producto: producto?.categoria || "Producto",
        descripcion: producto?.nombre || concepto || tipoMovimiento,
        modalidad: esAbono() ? "Abono" : "Crédito",
        monto_total: total,
        saldo_actual: saldo,
        cuota: inicial,
        fecha_inicio: fechaPago,
        fecha_vencimiento: sumarMeses(fechaPago, 1),
        estado: saldo <= 0 ? "Cancelado" : "Activo",
        vendedor: responsable,
        responsable,
        codigo_producto: producto?.codigo || null,
        producto_id: producto?.id || null,
        numero_venta: numero,
      }])
      .select()
      .single();
    if (error) return alert("Error creando cuenta: " + error.message), null;
    return data;
  }

  async function guardarMovimiento() {
    if (guardando) return;
    if (!tipoMovimiento) return alert("Seleccione el tipo de movimiento.");
    if (!fechaPago) return alert("Seleccione la fecha.");
    if (Number(monto || 0) <= 0) return alert("Ingrese un monto mayor a cero.");
    if (requiereCliente() && !cliente) return alert("Seleccione un cliente.");
    if (requiereCuentaMembresia() && !cuenta) return alert("Seleccione la cuenta de membresía.");
    if (esPagoCuenta() && !cuenta) return alert("Seleccione una cuenta.");
    if (esVentaProducto() && !producto) return alert("Seleccione un producto.");
    if (!responsable) return alert("Seleccione el responsable.");

    setGuardando(true);
    try {
      let clienteBase = cliente;
      if (!clienteBase && (nombreContado.trim() || esVentaProducto())) {
        clienteBase = await crearClienteContado();
      }

      if ((esVentaCredito() || esAbono()) && !clienteBase) {
        alert("La venta a crédito o el abono requieren cliente.");
        return;
      }

      let cuentaMovimiento = cuenta;
      if (esVentaCredito() || (esAbono() && !cuenta?.id)) {
        cuentaMovimiento = await crearCuentaCredito(clienteBase);
        if (!cuentaMovimiento) return;
      } else if (esPagoCuenta()) {
        cuentaMovimiento = await actualizarSaldoCredito();
        if (!cuentaMovimiento) return;
      } else if (requiereCuentaMembresia()) {
        cuentaMovimiento = await procesarMembresia();
        if (!cuentaMovimiento) return;
      }

      const numero = `TX-${Date.now()}`;
      const descripcion = concepto || producto?.nombre || cuentaMovimiento?.descripcion || observacion || tipoMovimiento;

      const { error } = await supabase.from("caja").insert([{
        empresa_id: empresaId,
        tipo: tipoMovimiento,
        descripcion,
        monto: Number(monto),
        metodo_pago: metodoPago,
        usuario: localStorage.getItem("usuarioNombre") || responsable || "Caja",
        numero_transaccion: numero,
        fecha_pago: fechaPago,
        caja_estado: "Activa",
        cliente_id: clienteBase?.id || cliente?.id || null,
        informacion_comercial_id: cuentaMovimiento?.id || null,
        numero_cuenta: cuentaMovimiento?.numero_cuenta || null,
        estado: "Procesado",
        cliente_nombre: clienteBase?.nombre || cliente?.nombre || nombreContado || null,
        cliente_cedula: clienteBase?.cedula || cliente?.cedula || cedulaContado || null,
        vendedor_responsable: responsable,
        cliente_direccion: clienteBase?.direccion || cliente?.direccion || direccionContado || null,
        cliente_telefono: clienteBase?.telefono || cliente?.telefono || telefonoContado || null,
      }]);
      if (error) return alert("Error registrando movimiento: " + error.message);

      if (["Venta Contado", "Venta de producto"].includes(tipoMovimiento) || (esAbono() && !cuenta?.id)) {
        const ok = await descontarInventario();
        if (!ok) return;
      }

      alert(tipoMovimiento === "Renovación" ? "Pago registrado y membresía renovada." : tipoMovimiento === "Membresía" ? "Pago registrado y membresía activada." : "Movimiento registrado correctamente.");
      limpiar();
      await Promise.all([cargarProductos(empresaId), cargarMovimientos(empresaId)]);
    } finally {
      setGuardando(false);
    }
  }

  function limpiar() {
    setTipoMovimiento(opcionesMovimiento()[0] || "");
    setFechaPago(fechaPanama());
    setBuscarCliente("");
    setResultados([]);
    setCliente(null);
    setCuentas([]);
    setCuenta(null);
    setNombreContado("");
    setCedulaContado("");
    setTelefonoContado("");
    setDireccionContado("");
    setProducto(null);
    setCodigoProducto("");
    setCantidad("1");
    setMetodoPago("Efectivo");
    setMonto("");
    setConcepto("");
    setObservacion("");
    setResponsable(localStorage.getItem("usuarioNombre") || localStorage.getItem("nombreUsuario") || "");
  }

  const hoy = fechaPanama();
  const movimientosHoy = useMemo(() => movimientos.filter((m) => String(m.fecha_pago || "").slice(0, 10) === hoy), [movimientos, hoy]);
  const totalHoy = useMemo(() => movimientosHoy.reduce((s, m) => s + Number(m.monto || 0), 0), [movimientosHoy]);
  const efectivoHoy = useMemo(() => movimientosHoy.filter((m) => normalizar(m.metodo_pago) === "efectivo").reduce((s, m) => s + Number(m.monto || 0), 0), [movimientosHoy]);
  const digitalHoy = totalHoy - efectivoHoy;
  const totalHistorico = useMemo(() => movimientos.reduce((s, m) => s + Number(m.monto || 0), 0), [movimientos]);

  if (cargando) {
    return (
      <div style={s.loading}>
        <img src="/konax-logo.png" alt="KONAX" style={s.loadingLogo} />
        <strong style={{ fontSize: 22 }}>Preparando caja</strong>
        <span style={{ color: "#6b7280" }}>Cargando negocio, clientes y movimientos.</span>
      </div>
    );
  }

  return (
    <main style={s.pagina}>
      <div style={s.contenedor}>
        <header style={s.header}>
          <div style={s.headerInfo}>
            <div style={s.logoBox}><img src="/konax-logo.png" alt="KONAX" style={s.logo} /></div>
            <div>
              <span style={s.etiqueta}>CAJA Y REGISTRO DE INGRESOS</span>
              <h1 style={s.nombreNegocio}>{empresaNombre}</h1>
              <p style={s.modulo}>Módulo de Caja</p>
              <p style={s.subtitulo}>Pagos, membresías, ventas, servicios e ingresos desde un solo lugar.</p>
              <div style={s.badges}><span style={s.badge}>{categoria || "Negocio"}</span><span style={s.badge}>{tipoNegocio || "General"}</span></div>
            </div>
          </div>
          <button onClick={() => router.push("/dashboard")} style={s.botonVolver}>← Centro de Operaciones</button>
        </header>

        <section style={s.kpis}>
          <KPI titulo="Movimientos hoy" valor={movimientosHoy.length} icono="🧾" />
          <KPI titulo="Total hoy" valor={`$${totalHoy.toFixed(2)}`} icono="💰" destacado />
          <KPI titulo="Efectivo hoy" valor={`$${efectivoHoy.toFixed(2)}`} icono="💵" />
          <KPI titulo="Pagos digitales" valor={`$${digitalHoy.toFixed(2)}`} icono="📲" />
          <KPI titulo="Total registrado" valor={`$${totalHistorico.toFixed(2)}`} icono="📈" />
        </section>

        <div style={s.dosColumnas}>
          <div>
            <Card titulo="Nuevo movimiento" texto="Seleccione qué está cobrando." numero="01">
              <div style={s.grid}>
                <Campo label="Fecha"><input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} style={s.input} /></Campo>
                <Campo label="N.º de transacción"><input value="Se genera al guardar" readOnly style={s.readOnly} /></Campo>
                <Campo label="Tipo de movimiento">
                  <select value={tipoMovimiento} onChange={(e) => { setTipoMovimiento(e.target.value); setCliente(null); setCuenta(null); setProducto(null); setMonto(""); setConcepto(""); }} style={s.input}>
                    {opcionesMovimiento().map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Campo>
              </div>
              {esMembresia() && <div style={s.ayuda}>{ayudaMovimiento(tipoMovimiento)}</div>}
            </Card>

            {(requiereCliente() || clienteOpcional()) && (
              <Card titulo={requiereCliente() ? "Cliente y cuenta" : "Cliente opcional"} texto={requiereCliente() ? "Seleccione el cliente relacionado con el cobro." : "Puede asociar el ingreso a un cliente."} numero="02">
                <div style={s.toolbar}>
                  <Campo label="Buscar cliente"><input value={buscarCliente} onChange={(e) => setBuscarCliente(e.target.value)} placeholder="Nombre, cédula o teléfono..." style={s.input} /></Campo>
                  <button onClick={buscarClientes} style={s.botonOscuro}>Buscar</button>
                </div>
                {resultados.length > 0 && <div style={s.resultados}>{resultados.map((r) => <button key={r.cliente.id} onClick={() => seleccionarCliente(r)} style={s.resultado}><strong>{r.cliente.nombre}</strong><span>{r.cliente.cedula || "Sin cédula"} · {r.cliente.telefono || "Sin teléfono"}</span></button>)}</div>}
                {cliente && <div style={s.clienteBox}>
                  <span style={s.mini}>CLIENTE SELECCIONADO</span>
                  <h3 style={{ margin: "4px 0" }}>{cliente.nombre}</h3>
                  <p style={{ margin: 0, color: "#68756d" }}>Cédula: {cliente.cedula || "-"} · Teléfono: {cliente.telefono || "-"}</p>
                  {cuentas.length > 0 && <Campo label="Cuenta o membresía"><select value={cuenta?.id || ""} onChange={(e) => setCuenta(cuentas.find((x) => String(x.id) === String(e.target.value)) || null)} style={s.input}><option value="">Seleccione una cuenta</option>{cuentas.map((x) => <option key={x.id} value={x.id}>{x.numero_cuenta} - {x.descripcion} - Saldo ${Number(x.saldo_actual || 0).toFixed(2)}</option>)}</select></Campo>}
                  {cuenta && <div style={s.cuentaResumen}><span>Cuenta: <strong>{cuenta.numero_cuenta}</strong></span><span>Vence: <strong>{String(cuenta.fecha_vencimiento || "-").slice(0, 10)}</strong></span><span>Saldo: <strong>${Number(cuenta.saldo_actual || 0).toFixed(2)}</strong></span></div>}
                </div>}
              </Card>
            )}

            {!requiereCliente() && !clienteOpcional() && (
              <Card titulo="Datos del cliente" texto="Información opcional para identificar la venta." numero="02">
                <div style={s.grid}>
                  <Campo label="Nombre"><input value={nombreContado} onChange={(e) => setNombreContado(e.target.value)} style={s.input} /></Campo>
                  <Campo label="Cédula"><input value={cedulaContado} onChange={(e) => setCedulaContado(e.target.value)} style={s.input} /></Campo>
                  <Campo label="Teléfono"><input value={telefonoContado} onChange={(e) => setTelefonoContado(e.target.value)} style={s.input} /></Campo>
                  <Campo label="Dirección"><input value={direccionContado} onChange={(e) => setDireccionContado(e.target.value)} style={s.input} /></Campo>
                </div>
              </Card>
            )}

            {esVentaProducto() && (
              <Card titulo="Producto e inventario" texto="Seleccione el producto y la cantidad." numero="03">
                <div style={s.grid}>
                  <Campo label="Código"><input value={codigoProducto} onChange={(e) => seleccionarPorCodigo(e.target.value)} style={s.input} /></Campo>
                  <Campo label="Producto"><select value={producto?.id || ""} onChange={(e) => seleccionarProducto(productos.find((x) => String(x.id) === String(e.target.value)) || null)} style={s.input}><option value="">Seleccione producto</option>{productos.map((x) => <option key={x.id} value={x.id}>{x.codigo} - {x.nombre} - Stock {stockProducto(x)}</option>)}</select></Campo>
                  <Campo label="Cantidad"><input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={s.input} /></Campo>
                  <Campo label="Total producto"><input value={producto ? (precioProducto(producto) * Number(cantidad || 1)).toFixed(2) : ""} readOnly style={s.readOnly} /></Campo>
                </div>
              </Card>
            )}

            <Card titulo="Detalle del cobro" texto="Confirme método, monto y responsable." numero={esVentaProducto() ? "04" : "03"}>
              <div style={s.grid}>
                <Campo label="Método de pago"><select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={s.input}><option>Efectivo</option><option>Transferencia</option><option>Yappy</option><option>Tarjeta</option><option>Cheque</option><option>Otro</option></select></Campo>
                <Campo label="Monto"><input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} style={s.input} /></Campo>
                <Campo label="Concepto"><input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Descripción del ingreso" style={s.input} /></Campo>
                <Campo label="Responsable"><select value={responsable} onChange={(e) => setResponsable(e.target.value)} style={s.input}><option value="">Seleccione</option>{usuarios.map((x) => <option key={x.id} value={x.nombre}>{x.nombre} - {x.rol}</option>)}</select></Campo>
              </div>
              <Campo label="Observación"><textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} style={s.textarea} /></Campo>
              <div style={s.acciones}><button onClick={guardarMovimiento} disabled={guardando} style={s.botonPrincipal}>{guardando ? "Procesando..." : "Registrar movimiento"}</button><button onClick={limpiar} disabled={guardando} style={s.botonClaro}>Limpiar formulario</button></div>
            </Card>
          </div>

          <aside>
            <div style={s.resumenSticky}>
              <h2 style={{ marginTop: 0 }}>Resumen del movimiento</h2>
              <Fila label="Negocio" valor={empresaNombre} />
              <Fila label="Movimiento" valor={tipoMovimiento || "-"} />
              <Fila label="Cliente" valor={cliente?.nombre || nombreContado || "Sin cliente"} />
              <Fila label="Cuenta" valor={cuenta?.numero_cuenta || "-"} />
              <Fila label="Método" valor={metodoPago} />
              <Fila label="Responsable" valor={responsable || "-"} />
              <div style={s.total}><span>Total a registrar</span><strong>${Number(monto || 0).toFixed(2)}</strong></div>
              <button onClick={guardarMovimiento} disabled={guardando} style={s.botonAncho}>{guardando ? "Procesando..." : "Confirmar y registrar"}</button>
            </div>
          </aside>
        </div>

        <Card titulo="Movimientos registrados" texto="Historial reciente de ingresos y pagos." numero={String(movimientos.length)}>
          <div style={s.tablaBox}><table style={s.tabla}><thead><tr><th style={s.th}>Fecha</th><th style={s.th}>Transacción</th><th style={s.th}>Cliente</th><th style={s.th}>Cuenta</th><th style={s.th}>Tipo</th><th style={s.th}>Método</th><th style={s.th}>Monto</th><th style={s.th}>Responsable</th><th style={s.th}>Estado</th></tr></thead><tbody>{movimientos.length === 0 ? <tr><td colSpan="9" style={s.vacio}>No hay movimientos.</td></tr> : movimientos.map((m) => <tr key={m.id}><td style={s.td}>{String(m.fecha_pago || m.created_at || "").slice(0, 10)}</td><td style={s.td}>{m.numero_transaccion || "-"}</td><td style={s.td}>{m.cliente_nombre || "-"}</td><td style={s.td}>{m.numero_cuenta || "-"}</td><td style={s.td}>{m.tipo}</td><td style={s.td}>{m.metodo_pago}</td><td style={s.td}><strong>${Number(m.monto || 0).toFixed(2)}</strong></td><td style={s.td}>{m.vendedor_responsable || "-"}</td><td style={s.td}><span style={s.estado}>{m.estado || "Procesado"}</span></td></tr>)}</tbody></table></div>
        </Card>
      </div>
    </main>
  );
}

function ayudaMovimiento(tipo) {
  const mensajes = {
    "Inscripción / Matrícula": "Cobro inicial de ingreso. No renueva la membresía.",
    Membresía: "Activa una membresía ya creada para el cliente.",
    Renovación: "Registra el pago y extiende automáticamente el vencimiento.",
    "Pase diario": "Cobro por una visita. No crea ni renueva membresía.",
    "Clase / Sesión individual": "Cobro por una clase o sesión sin membresía.",
    "Venta de producto": "Registra la venta y descuenta el inventario.",
    "Servicio adicional": "Cobro por un servicio fuera de la membresía.",
    "Otro ingreso": "Ingreso adicional no incluido en las categorías anteriores.",
  };
  return mensajes[tipo] || "Complete los datos del movimiento.";
}

function Campo({ label, children }) {
  return <label style={s.campo}><span style={s.label}>{label}</span>{children}</label>;
}

function KPI({ titulo, valor, icono, destacado }) {
  return <article style={destacado ? s.kpiDestacado : s.kpi}><span style={{ fontSize: 24 }}>{icono}</span><span style={{ fontSize: 12, fontWeight: 800 }}>{titulo}</span><strong style={{ fontSize: 25 }}>{valor}</strong></article>;
}

function Card({ titulo, texto, numero, children }) {
  return <article style={s.card}><div style={s.cardHeader}><div><h2 style={{ margin: 0 }}>{titulo}</h2><p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 12 }}>{texto}</p></div><span style={s.numero}>{numero}</span></div>{children}</article>;
}

function Fila({ label, valor }) {
  return <div style={s.fila}><span>{label}</span><strong>{valor}</strong></div>;
}

const s = {
  pagina: { minHeight: "100vh", background: "radial-gradient(circle at top right,rgba(22,131,79,.12),transparent 30%),#eef2f7", padding: 24, color: "#111827", fontFamily: "Inter,Arial,system-ui,sans-serif" },
  contenedor: { maxWidth: 1500, margin: "0 auto" },
  loading: { minHeight: "100vh", display: "grid", placeItems: "center", alignContent: "center", gap: 10, background: "#eef2f7", fontFamily: "Inter,Arial,sans-serif" },
  loadingLogo: { width: 230, maxWidth: "75%" },
  header: { marginBottom: 20, padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", borderRadius: 24, background: "linear-gradient(135deg,#0a1710,#123924 65%,#17673e)", color: "#fff", boxShadow: "0 20px 50px rgba(10,60,35,.20)" },
  headerInfo: { display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" },
  logoBox: { width: 190, height: 78, padding: 9, display: "grid", placeItems: "center", borderRadius: 16, background: "#fff" },
  logo: { width: "100%", height: "100%", objectFit: "contain" },
  etiqueta: { color: "#82e1ac", fontSize: 11, fontWeight: 900, letterSpacing: 1.3 },
  nombreNegocio: { margin: "5px 0 2px", fontSize: "clamp(30px,4vw,44px)", lineHeight: 1.05 },
  modulo: { margin: "7px 0 0", color: "#b9ddc8", fontSize: 15, fontWeight: 800 },
  subtitulo: { margin: "5px 0 0", color: "#d6eadf", fontSize: 14 },
  badges: { marginTop: 11, display: "flex", gap: 8, flexWrap: "wrap" },
  badge: { padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.17)", color: "#eafff2", fontSize: 11, fontWeight: 800 },
  botonVolver: { minHeight: 44, padding: "11px 18px", border: "1px solid rgba(255,255,255,.2)", borderRadius: 11, background: "rgba(255,255,255,.10)", color: "#fff", fontWeight: 800, cursor: "pointer" },
  kpis: { marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 },
  kpi: { padding: 18, display: "grid", gap: 7, border: "1px solid #dfe7e2", borderRadius: 17, background: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,.05)" },
  kpiDestacado: { padding: 18, display: "grid", gap: 7, borderRadius: 17, background: "linear-gradient(135deg,#16834f,#125b39)", color: "#fff", boxShadow: "0 12px 28px rgba(22,131,79,.20)" },
  dosColumnas: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(300px,390px)", gap: 20, alignItems: "start" },
  card: { marginBottom: 20, padding: 24, border: "1px solid #e0e7e2", borderRadius: 20, background: "#fff", boxShadow: "0 10px 30px rgba(15,23,42,.055)" },
  cardHeader: { marginBottom: 18, paddingBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: "1px solid #edf1ee" },
  numero: { minWidth: 35, height: 35, padding: "0 9px", display: "grid", placeItems: "center", borderRadius: 999, background: "#eaf7ef", color: "#16834f", fontWeight: 900 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 15 },
  toolbar: { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "end" },
  campo: { display: "flex", flexDirection: "column", gap: 7 },
  label: { color: "#425048", fontSize: 12, fontWeight: 800 },
  input: { width: "100%", minHeight: 44, padding: "11px 12px", boxSizing: "border-box", border: "1px solid #cfd8d2", borderRadius: 10, background: "#fff", color: "#111827", fontSize: 14 },
  readOnly: { width: "100%", minHeight: 44, padding: "11px 12px", boxSizing: "border-box", border: "1px solid #d7ded9", borderRadius: 10, background: "#f1f5f2", color: "#17623c", fontSize: 14, fontWeight: 800 },
  textarea: { width: "100%", minHeight: 100, marginTop: 15, padding: 12, boxSizing: "border-box", border: "1px solid #cfd8d2", borderRadius: 10, resize: "vertical", fontFamily: "inherit" },
  ayuda: { marginTop: 14, padding: "12px 14px", border: "1px solid #b9dfc7", borderRadius: 12, background: "#edf9f1", color: "#17623c", fontSize: 12, fontWeight: 800 },
  botonOscuro: { minHeight: 44, padding: "11px 18px", border: 0, borderRadius: 10, background: "#111827", color: "#fff", fontWeight: 800, cursor: "pointer" },
  resultados: { marginTop: 14, display: "grid", gap: 8 },
  resultado: { padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: "1px solid #dfe7e2", borderRadius: 12, background: "#fff", color: "#111827", textAlign: "left", cursor: "pointer" },
  clienteBox: { marginTop: 15, padding: 16, display: "grid", gap: 14, border: "1px solid #b9dfc7", borderRadius: 14, background: "#f1faf4" },
  mini: { color: "#16834f", fontSize: 10, fontWeight: 900, letterSpacing: 1 },
  cuentaResumen: { padding: 12, display: "flex", gap: 16, flexWrap: "wrap", borderRadius: 10, background: "#fff", color: "#506057", fontSize: 12 },
  acciones: { marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" },
  botonPrincipal: { minHeight: 44, padding: "11px 20px", border: 0, borderRadius: 10, background: "#16834f", color: "#fff", fontWeight: 850, cursor: "pointer" },
  botonClaro: { minHeight: 44, padding: "11px 20px", border: "1px solid #d2dbd5", borderRadius: 10, background: "#fff", color: "#26342c", fontWeight: 800, cursor: "pointer" },
  resumenSticky: { position: "sticky", top: 18, padding: 22, border: "1px solid #dce5df", borderRadius: 20, background: "#fff", boxShadow: "0 12px 32px rgba(15,23,42,.08)" },
  fila: { paddingBottom: 9, marginBottom: 9, display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #edf1ee", color: "#657169", fontSize: 12 },
  total: { marginTop: 18, padding: 16, display: "grid", gap: 5, borderRadius: 14, background: "linear-gradient(135deg,#0f2f20,#17623c)", color: "#fff" },
  botonAncho: { width: "100%", minHeight: 48, marginTop: 15, border: 0, borderRadius: 11, background: "#16834f", color: "#fff", fontWeight: 850, cursor: "pointer" },
  tablaBox: { overflowX: "auto", border: "1px solid #e1e7e3", borderRadius: 13 },
  tabla: { width: "100%", minWidth: 1000, borderCollapse: "collapse", fontSize: 13 },
  th: { padding: 12, background: "#111827", color: "#fff", textAlign: "left", whiteSpace: "nowrap" },
  td: { padding: 11, borderBottom: "1px solid #edf1ee", whiteSpace: "nowrap" },
  vacio: { padding: 28, color: "#6b7280", textAlign: "center" },
  estado: { padding: "5px 9px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 800 },
};
