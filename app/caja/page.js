"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Caja() {
  const [tipoNegocioEmpresa, setTipoNegocioEmpresa] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);

  const [buscarCliente, setBuscarCliente] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cuentasCliente, setCuentasCliente] = useState([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);

  const [nombreContado, setNombreContado] = useState("");
  const [cedulaContado, setCedulaContado] = useState("");

  const [productos, setProductos] = useState([]);
  const [codigoProducto, setCodigoProducto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState("1");
  const [valorProducto, setValorProducto] = useState("");

  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observacion, setObservacion] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const [vendedores, setVendedores] = useState([]);

  useEffect(() => {
    iniciarCaja();
  }, []);

  useEffect(() => {
    recalcularValorProducto();
  }, [tipoMovimiento, productoSeleccionado, cantidad]);

  async function iniciarCaja() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    await cargarTipoNegocioEmpresa(empresaId);
    await cargarVendedores(empresaId);
    await cargarProductos(empresaId);
    await cargarMovimientos();
  }

  function obtenerEmpresaId() {
    const empresaId =
      localStorage.getItem("empresaId") ||
      localStorage.getItem("empresaAdminCreadaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de usar Caja.");
      return null;
    }

    return empresaId;
  }

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function generarTransaccion() {
    return "TX-" + Date.now();
  }

  function esVentaConProducto() {
    return [
      "Venta Contado",
      "Venta Crédito",
      "Abono"
    ].includes(tipoMovimiento);
  }

  function esPagoDeCuenta() {
    return [
      "Pago Crédito",
      "Pago Credito",
      "Mensualidad",
      "Renovación",
      "Cancelación"
    ].includes(tipoMovimiento);
  }

  const movimientosSinCliente = ["Venta Contado", "Servicio Contado"];
  const requiereCliente = !movimientosSinCliente.includes(tipoMovimiento);

  async function cargarTipoNegocioEmpresa(empresaId) {
    const { data, error } = await supabase
      .from("empresas")
      .select("categoria_negocio, tipo_negocio")
      .eq("id", empresaId)
      .maybeSingle();

    if (error) {
      alert("Error cargando tipo de negocio: " + error.message);
      return;
    }

    const categoria = data?.categoria_negocio || "";
    const tipo = data?.tipo_negocio || "";
    const tipoCompleto = `${categoria} ${tipo}`.trim() || "General";

    setTipoNegocioEmpresa(tipoCompleto);

    const opciones = obtenerOpcionesMovimiento(tipoCompleto);
    setTipoMovimiento(opciones[0]);
  }

  function obtenerOpcionesMovimiento(tipoNegocio) {
    const tipo = String(tipoNegocio || "").toLowerCase();

    if (
      tipo.includes("gimnasio") ||
      tipo.includes("club") ||
      tipo.includes("academia") ||
      tipo.includes("suscripciones") ||
      tipo.includes("membres")
    ) {
      return ["Inscripción / Membresía", "Mensualidad", "Renovación", "Abono"];
    }

    if (
      tipo.includes("muebleria") ||
      tipo.includes("mueblería") ||
      tipo.includes("electronica") ||
      tipo.includes("electrónica") ||
      tipo.includes("financiera") ||
      tipo.includes("cooperativa") ||
      tipo.includes("empeño")
    ) {
      return ["Venta Contado", "Venta Crédito", "Abono", "Pago Crédito", "Cancelación"];
    }

    return ["Venta Contado", "Venta Crédito", "Abono", "Pago Crédito", "Mensualidad"];
  }

  const opcionesMovimiento = obtenerOpcionesMovimiento(tipoNegocioEmpresa);

  async function cargarVendedores(empresaId) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("estado", "Activo")
      .in("rol", ["Vendedor", "Supervisor", "Administrador"])
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando vendedores: " + error.message);
      return;
    }

    setVendedores(data || []);
  }

  async function cargarProductos(empresaId) {
    const { data, error } = await supabase
      .from("inventario")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando inventario: " + error.message);
      return;
    }

    setProductos(data || []);
  }

  async function cargarMovimientos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando movimientos: " + error.message);
      return;
    }

    setMovimientos(data || []);
  }

  function seleccionarProductoPorCodigo(codigo) {
    setCodigoProducto(codigo);

    const producto = productos.find(
      (p) => String(p.codigo || "").trim() === String(codigo || "").trim()
    );

    setProductoSeleccionado(producto || null);

    if (producto) {
      const precio =
        tipoMovimiento === "Venta Crédito"
          ? Number(producto.precio_credito || 0)
          : Number(producto.precio_contado || 0);

      setValorProducto(precio);
      setConcepto(producto.nombre || producto.descripcion || "");
      setMonto(precio);
    }
  }

  function recalcularValorProducto() {
    if (!productoSeleccionado || !esVentaConProducto()) return;

    const precioUnitario =
      tipoMovimiento === "Venta Crédito"
        ? Number(productoSeleccionado.precio_credito || 0)
        : Number(productoSeleccionado.precio_contado || 0);

    const total = precioUnitario * Number(cantidad || 1);

    setValorProducto(total);
    setMonto(total);
  }

  async function buscarClientes() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const texto = buscarCliente.trim();

    if (texto.length < 3) {
      alert("Escriba mínimo 3 caracteres para buscar.");
      return;
    }

    let resultados = [];

    const { data: clientesData, error: errorClientes } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(`nombre.ilike.%${texto}%,cedula.ilike.%${texto}%`);

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

    const { data: cuentasData } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .ilike("numero_cuenta", `%${texto}%`);

    if (cuentasData && cuentasData.length > 0) {
      const idsClientes = cuentasData.map((cuenta) => cuenta.cliente_id);

      const { data: clientesDeCuentas } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("id", idsClientes);

      cuentasData.forEach((cuenta) => {
        const cliente = clientesDeCuentas?.find((item) => item.id === cuenta.cliente_id);

        if (cliente) {
          resultados.push({ cliente, cuenta });
        }
      });
    }

    setResultadosBusqueda(resultados);
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

    if (error || !data || data.length === 0) {
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

    if (vendedorCuenta) setResponsable(vendedorCuenta);
  }

  async function descontarInventario(empresaId) {
    if (!productoSeleccionado) return true;

    const stockActual = Number(productoSeleccionado.stock || 0);
    const cantidadVenta = Number(cantidad || 1);

    if (cantidadVenta <= 0) {
      alert("La cantidad debe ser mayor a cero.");
      return false;
    }

    if (stockActual < cantidadVenta) {
      alert("Stock insuficiente para este producto.");
      return false;
    }

    const nuevoStock = stockActual - cantidadVenta;

    const { error } = await supabase
      .from("inventario")
      .update({
        stock: nuevoStock,
      })
      .eq("empresa_id", empresaId)
      .eq("id", productoSeleccionado.id);

    if (error) {
      alert("Error descontando inventario: " + error.message);
      return false;
    }

    return true;
  }

  async function actualizarSaldoCuenta(empresaId) {
    if (!cuentaSeleccionada) return true;

    const nuevoSaldo = Number(cuentaSeleccionada.saldo_actual || 0) - Number(monto || 0);
    const saldoFinal = nuevoSaldo < 0 ? 0 : nuevoSaldo;

    const { error: errorSaldo } = await supabase
      .from("informacion_comercial")
      .update({
        saldo_actual: saldoFinal,
        estado: saldoFinal <= 0 ? "Cancelado" : cuentaSeleccionada.estado,
      })
      .eq("empresa_id", empresaId)
      .eq("id", cuentaSeleccionada.id);

    if (errorSaldo) {
      alert("Movimiento registrado, pero error actualizando saldo: " + errorSaldo.message);
      return false;
    }

    const datosCobranza = {
      fecha_ultimo_pago: fechaPago,
      monto_ultimo_pago: Number(monto),
    };

    if (saldoFinal <= 0) {
      datosCobranza.estado_cobranza = "Cancelado";
      datosCobranza.estado_promesa = null;
    }

    const { error: errorCobranza } = await supabase
      .from("informacion_cobranza")
      .update(datosCobranza)
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuentaSeleccionada.id);

    if (errorCobranza) {
      alert("Movimiento registrado, pero error actualizando cobranza: " + errorCobranza.message);
      return false;
    }

    return true;
  }

  async function guardarMovimiento() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!monto || Number(monto) <= 0) {
      alert("Ingrese un monto válido mayor a cero.");
      return;
    }

    if (requiereCliente && !clienteSeleccionado) {
      alert("Seleccione un cliente.");
      return;
    }

    if (esPagoDeCuenta() && !cuentaSeleccionada) {
      alert("Seleccione una cuenta para aplicar el pago.");
      return;
    }

    if (esVentaConProducto() && !productoSeleccionado) {
      alert("Seleccione un producto del inventario.");
      return;
    }

    if (!responsable) {
      alert("Seleccione el vendedor o responsable.");
      return;
    }

    const numeroTransaccion = generarTransaccion();
    const usuarioRegistro =
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("adminKonaxNombre") ||
      "Caja";

    const descripcionFinal =
      concepto ||
      productoSeleccionado?.nombre ||
      productoSeleccionado?.descripcion ||
      observacion ||
      tipoMovimiento;

    const { error } = await supabase.from("caja").insert([
      {
        empresa_id: empresaId,
        numero_transaccion: numeroTransaccion,
        cliente_id: clienteSeleccionado?.id || null,
        informacion_comercial_id: cuentaSeleccionada?.id || null,
        numero_cuenta: cuentaSeleccionada?.numero_cuenta || null,
        fecha_pago: fechaPago,
        tipo: tipoMovimiento,
        descripcion: descripcionFinal,
        monto: Number(monto),
        metodo_pago: metodoPago,
        usuario: usuarioRegistro,
        vendedor_responsable: responsable,
        estado: "Procesado",
        cliente_nombre: requiereCliente
          ? clienteSeleccionado?.nombre
          : nombreContado || null,
        cliente_cedula: requiereCliente
          ? clienteSeleccionado?.cedula
          : cedulaContado || null,
      },
    ]);

    if (error) {
      alert("Error al registrar movimiento: " + error.message);
      return;
    }

    if (esVentaConProducto()) {
      const okInventario = await descontarInventario(empresaId);
      if (!okInventario) return;
    }

    if (esPagoDeCuenta()) {
      const okSaldo = await actualizarSaldoCuenta(empresaId);
      if (!okSaldo) return;
    }

    alert("Movimiento registrado correctamente.");

    limpiarFormulario();
    await cargarProductos(empresaId);
    await cargarMovimientos();
  }

  function limpiarFormulario() {
    const opciones = obtenerOpcionesMovimiento(tipoNegocioEmpresa);

    setTipoMovimiento(opciones[0]);
    setFechaPago(new Date().toISOString().split("T")[0]);
    setBuscarCliente("");
    setResultadosBusqueda([]);
    setClienteSeleccionado(null);
    setCuentasCliente([]);
    setCuentaSeleccionada(null);
    setNombreContado("");
    setCedulaContado("");
    setCodigoProducto("");
    setProductoSeleccionado(null);
    setCantidad("1");
    setValorProducto("");
    setMetodoPago("Efectivo");
    setMonto("");
    setConcepto("");
    setResponsable("");
    setObservacion("");
  }

  const totalCaja = movimientos.reduce(
    (total, mov) => total + Number(mov.monto || 0),
    0
  );

  const movimientosHoy = movimientos.filter((mov) => {
    const fecha = String(mov.fecha_pago || mov.created_at || "").split("T")[0];
    return fecha === new Date().toISOString().split("T")[0];
  });

  const totalHoy = movimientosHoy.reduce(
    (total, mov) => total + Number(mov.monto || 0),
    0
  );

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={header}>
          <div>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />
            <h1 style={titulo}>Caja</h1>
            <p style={subtitulo}>
              Registro de ventas, pagos, abonos, mensualidades y contratos.
            </p>
            <p style={negocioTexto}>
              Tipo de negocio: <strong>{tipoNegocioEmpresa || "General"}</strong>
            </p>
          </div>

          <button onClick={volverDashboard} style={botonVolver}>
            ← Centro de Operaciones
          </button>
        </div>

        <div style={resumenGrid}>
          <div style={resumenCard}>
            <span>Movimientos</span>
            <strong>{movimientos.length}</strong>
          </div>

          <div style={resumenCard}>
            <span>Total registrado</span>
            <strong>${totalCaja.toFixed(2)}</strong>
          </div>

          <div style={resumenCard}>
            <span>Movimientos hoy</span>
            <strong>{movimientosHoy.length}</strong>
          </div>

          <div style={resumenCard}>
            <span>Total hoy</span>
            <strong>${totalHoy.toFixed(2)}</strong>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Información General</h2>

          <div style={grid}>
            <Campo label="Fecha">
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="N° Transacción">
              <input value="Automático al guardar" readOnly style={inputReadOnly} />
            </Campo>

            <Campo label="Tipo de movimiento">
              <select
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value)}
                style={inputStyle}
              >
                {opcionesMovimiento.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        </div>

        {!requiereCliente && (
          <div style={card}>
            <h2 style={tituloSeccion}>Cliente Contado</h2>

            <div style={grid}>
              <Campo label="Nombre del cliente">
                <input
                  value={nombreContado}
                  onChange={(e) => setNombreContado(e.target.value)}
                  style={inputStyle}
                />
              </Campo>

              <Campo label="Cédula">
                <input
                  value={cedulaContado}
                  onChange={(e) => setCedulaContado(e.target.value)}
                  style={inputStyle}
                />
              </Campo>
            </div>
          </div>
        )}

        {requiereCliente && (
          <div style={card}>
            <h2 style={tituloSeccion}>Cliente / Cuenta</h2>

            <div style={toolbar}>
              <Campo label="Buscar cliente">
                <input
                  placeholder="Nombre, cédula o número de cuenta..."
                  value={buscarCliente}
                  onChange={(e) => setBuscarCliente(e.target.value)}
                  style={inputStyle}
                />
              </Campo>

              <div style={botonBuscarBox}>
                <button style={botonSecundario} onClick={buscarClientes}>
                  Buscar
                </button>
              </div>
            </div>

            {resultadosBusqueda.length > 0 && (
              <div style={{ marginTop: "15px", overflowX: "auto" }}>
                <table style={tabla}>
                  <tbody>
                    {resultadosBusqueda.map((item, index) => (
                      <tr key={index}>
                        <td style={td}>{item.cliente.nombre}</td>
                        <td style={td}>{item.cliente.cedula}</td>
                        <td style={td}>{item.cuenta?.numero_cuenta || "Ver cuentas"}</td>
                        <td style={td}>
                          <button
                            style={botonPequeno}
                            onClick={() => seleccionarResultado(item)}
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {clienteSeleccionado && (
              <div style={clienteBox}>
                <strong>{clienteSeleccionado.nombre}</strong>
                <p>Cédula: {clienteSeleccionado.cedula}</p>

                {cuentasCliente.length > 0 && (
                  <Campo label="Seleccionar cuenta">
                    <select
                      value={cuentaSeleccionada?.id || ""}
                      onChange={(e) => {
                        const cuenta = cuentasCliente.find(
                          (item) => item.id === e.target.value
                        );

                        setCuentaSeleccionada(cuenta);

                        const vendedorCuenta =
                          cuenta?.responsable || cuenta?.vendedor || "";

                        if (vendedorCuenta) setResponsable(vendedorCuenta);
                      }}
                      style={inputStyle}
                    >
                      {cuentasCliente.map((cuenta) => (
                        <option key={cuenta.id} value={cuenta.id}>
                          {cuenta.numero_cuenta} - {cuenta.descripcion} - Saldo $
                          {Number(cuenta.saldo_actual || 0).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </Campo>
                )}

                <p>
                  Cuenta:{" "}
                  <strong>{cuentaSeleccionada?.numero_cuenta || "Sin cuenta"}</strong>
                </p>

                <p>
                  Saldo actual:{" "}
                  <strong>
                    ${Number(cuentaSeleccionada?.saldo_actual || 0).toFixed(2)}
                  </strong>
                </p>
              </div>
            )}
          </div>
        )}

        {esVentaConProducto() && (
          <div style={card}>
            <h2 style={tituloSeccion}>Producto / Inventario</h2>

            <div style={grid}>
              <Campo label="Código del producto">
                <input
                  value={codigoProducto}
                  onChange={(e) => seleccionarProductoPorCodigo(e.target.value)}
                  placeholder="Ej. SALA-001"
                  style={inputStyle}
                />
              </Campo>

              <Campo label="Seleccionar producto">
                <select
                  value={productoSeleccionado?.id || ""}
                  onChange={(e) => {
                    const producto = productos.find(
                      (item) => String(item.id) === String(e.target.value)
                    );

                    setProductoSeleccionado(producto || null);
                    setCodigoProducto(producto?.codigo || "");
                    setConcepto(producto?.nombre || producto?.descripcion || "");
                  }}
                  style={inputStyle}
                >
                  <option value="">Seleccione producto</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.codigo} - {producto.nombre} - Stock {producto.stock}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Cantidad">
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  style={inputStyle}
                />
              </Campo>

              <Campo label="Valor producto">
                <input value={valorProducto} readOnly style={inputReadOnly} />
              </Campo>
            </div>

            {productoSeleccionado && (
              <div style={clienteBox}>
                <strong>{productoSeleccionado.nombre}</strong>
                <p>Código: {productoSeleccionado.codigo}</p>
                <p>Stock disponible: {productoSeleccionado.stock}</p>
                <p>Precio contado: ${Number(productoSeleccionado.precio_contado || 0).toFixed(2)}</p>
                <p>Precio crédito: ${Number(productoSeleccionado.precio_credito || 0).toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        <div style={card}>
          <h2 style={tituloSeccion}>Detalle del Movimiento</h2>

          <div style={grid}>
            <Campo label="Método de pago">
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                style={inputStyle}
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
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Concepto / Descripción">
              <input
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Vendedor / Responsable">
              <select
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                style={inputStyle}
              >
                <option value="">Seleccione responsable</option>

                {vendedores.map((vendedor) => (
                  <option key={vendedor.id} value={vendedor.nombre}>
                    {vendedor.nombre} - {vendedor.rol}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo label="Observación">
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              style={textarea}
            />
          </Campo>

          <div style={acciones}>
            <button style={boton} onClick={guardarMovimiento}>
              Registrar Movimiento
            </button>

            <button style={botonLimpiar} onClick={limpiarFormulario}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Movimientos Registrados</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Transacción</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Cuenta</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Método</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Concepto</th>
                  <th style={th}>Registrado por</th>
                  <th style={th}>Vendedor / Responsable</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.length === 0 ? (
                  <tr>
                    <td style={td} colSpan="12">
                      No hay movimientos registrados.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((movimiento) => (
                    <tr key={movimiento.id}>
                      <td style={td}>{movimiento.fecha_pago || movimiento.created_at}</td>
                      <td style={td}>{movimiento.numero_transaccion || "-"}</td>
                      <td style={td}>{movimiento.cliente_nombre || "-"}</td>
                      <td style={td}>{movimiento.cliente_cedula || "-"}</td>
                      <td style={td}>{movimiento.numero_cuenta || "-"}</td>
                      <td style={td}>{movimiento.tipo}</td>
                      <td style={td}>{movimiento.metodo_pago}</td>
                      <td style={td}>${Number(movimiento.monto || 0).toFixed(2)}</td>
                      <td style={td}>{movimiento.descripcion || "-"}</td>
                      <td style={td}>{movimiento.usuario || "-"}</td>
                      <td style={td}>
                        {movimiento.vendedor_responsable || movimiento.responsable || "-"}
                      </td>
                      <td style={td}>{movimiento.estado}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div style={campo}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #ecfdf5 0%, #f3f4f6 45%, #ffffff 100%)",
  padding: "35px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1450px",
  margin: "0 auto",
};

const header = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  borderRadius: "22px",
  padding: "28px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "22px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const logo = {
  width: "125px",
  height: "auto",
  marginBottom: "10px",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "8px",
};

const titulo = {
  fontSize: "38px",
  margin: "0 0 8px 0",
  color: "#ffffff",
};

const subtitulo = {
  color: "#dcfce7",
  fontSize: "16px",
  margin: 0,
};

const negocioTexto = {
  color: "#bbf7d0",
  fontSize: "14px",
  marginTop: "8px",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const resumenCard = {
  background: "#ffffff",
  color: "#111827",
  padding: "20px",
  borderRadius: "16px",
  display: "grid",
  gap: "8px",
  boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "18px",
  marginBottom: "20px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.07)",
  border: "1px solid #e5e7eb",
};

const tituloSeccion = {
  marginTop: 0,
  marginBottom: "20px",
  color: "#111827",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
  gap: "15px",
};

const toolbar = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "12px",
  alignItems: "end",
};

const campo = {
  display: "flex",
  flexDirection: "column",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  color: "#374151",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "9px",
  border: "1px solid #9ca3af",
  fontSize: "14px",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
};

const inputReadOnly = {
  ...inputStyle,
  background: "#f3f4f6",
  color: "#6b7280",
  fontWeight: "bold",
};

const textarea = {
  ...inputStyle,
  minHeight: "110px",
  marginTop: "0px",
};

const botonBuscarBox = {
  display: "flex",
  alignItems: "end",
};

const acciones = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "14px 28px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonLimpiar = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "14px 28px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonVolver = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "13px 20px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonSecundario = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonPequeno = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const clienteBox = {
  marginTop: "15px",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  padding: "16px",
  borderRadius: "14px",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "13px",
  borderBottom: "1px solid #e5e7eb",
  background: "#111827",
  color: "#ffffff",
  fontSize: "13px",
};

const td = {
  padding: "13px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "13px",
};
