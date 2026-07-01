"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CuentasPorCobrar() {
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [telefonoSecundario, setTelefonoSecundario] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referenciaNombre, setReferenciaNombre] = useState("");
  const [referenciaTelefono, setReferenciaTelefono] = useState("");
  const [estadoCliente, setEstadoCliente] = useState("Activo");

  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [tipoProducto, setTipoProducto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [saldoActual, setSaldoActual] = useState("");
  const [cuota, setCuota] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [estadoCuenta, setEstadoCuenta] = useState("Activo");

  const [productos, setProductos] = useState([]);
  const [productoId, setProductoId] = useState("");
  const [codigoProducto, setCodigoProducto] = useState("");
  const [cantidadProducto, setCantidadProducto] = useState("1");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [totalProducto, setTotalProducto] = useState("");

  const [estadoCobranza, setEstadoCobranza] = useState("Al Día");
  const [fechaUltimoPago, setFechaUltimoPago] = useState("");
  const [montoUltimoPago, setMontoUltimoPago] = useState("");
  const [responsableCobro, setResponsableCobro] = useState("");
  const [observacionCobro, setObservacionCobro] = useState("");
  const [documentos, setDocumentos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const empresaId = obtenerEmpresaIdSilencioso();
    if (empresaId) cargarProductos(empresaId);
  }, []);

  useEffect(() => {
    calcularTotalProducto();
  }, [cantidadProducto, precioUnitario]);

  function obtenerEmpresaIdSilencioso() {
    return localStorage.getItem("empresaId");
  }

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de guardar.");
      return null;
    }

    return empresaId;
  }

  function volverCentroOperaciones() {
    window.location.href = "/dashboard";
  }

  function generarNumeroCuenta() {
    return "KX-" + Date.now();
  }

  function calcularDiasMora(fecha) {
    if (!fecha) return 0;

    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const diferencia = hoy - vencimiento;

    if (diferencia <= 0) return 0;

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
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

  function stockProducto(producto) {
    return Number(producto?.stock_actual || producto?.stock || 0);
  }

  function precioProducto(producto) {
    if (!producto) return 0;

    return Number(
      producto.precio_credito ||
        producto.precio_venta ||
        producto.precio_oferta ||
        0
    );
  }

  function seleccionarProducto(id) {
    setProductoId(id);

    const producto = productos.find((item) => String(item.id) === String(id));

    if (!producto) {
      setCodigoProducto("");
      setPrecioUnitario("");
      setTotalProducto("");
      return;
    }

    const precio = precioProducto(producto);

    setCodigoProducto(producto.codigo || "");
    setPrecioUnitario(precio);

    const cantidad = Number(cantidadProducto || 1);
    const total = precio * cantidad;

    setTotalProducto(total);

    if (!montoTotal || Number(montoTotal || 0) === 0) {
      setMontoTotal(total);
    }

    if (!saldoActual || Number(saldoActual || 0) === 0) {
      setSaldoActual(total);
    }

    if (!descripcion) {
      setDescripcion(producto.nombre || producto.descripcion || "");
    }

    if (!tipoProducto) {
      setTipoProducto("Crédito");
    }
  }

  function calcularTotalProducto() {
    const cantidad = Number(cantidadProducto || 0);
    const precio = Number(precioUnitario || 0);
    const total = cantidad * precio;

    if (precio > 0 && cantidad > 0) {
      setTotalProducto(total);

      if (!montoTotal || Number(montoTotal || 0) === 0) {
        setMontoTotal(total);
      }

      if (!saldoActual || Number(saldoActual || 0) === 0) {
        setSaldoActual(total);
      }
    }
  }

  function limpiarFormulario() {
    setCedula("");
    setNombre("");
    setCorreo("");
    setTelefono("");
    setTelefonoSecundario("");
    setDireccion("");
    setReferenciaNombre("");
    setReferenciaTelefono("");
    setEstadoCliente("Activo");

    setNumeroCuenta("");
    setTipoProducto("");
    setDescripcion("");
    setModalidad("");
    setMontoTotal("");
    setSaldoActual("");
    setCuota("");
    setFechaInicio("");
    setFechaVencimiento("");
    setEstadoCuenta("Activo");

    setProductoId("");
    setCodigoProducto("");
    setCantidadProducto("1");
    setPrecioUnitario("");
    setTotalProducto("");

    setEstadoCobranza("Al Día");
    setFechaUltimoPago("");
    setMontoUltimoPago("");
    setResponsableCobro("");
    setObservacionCobro("");
    setDocumentos([]);
  }

  async function subirDocumentos(clienteId, empresaId) {
    if (documentos.length === 0) return;

    for (const archivo of documentos) {
      const nombreLimpio = archivo.name.replace(/\s+/g, "_");
      const ruta = `empresas/${empresaId}/clientes/${clienteId}/${Date.now()}-${nombreLimpio}`;

      const { error } = await supabase.storage
        .from("documentos-clientes")
        .upload(ruta, archivo);

      if (error) throw error;
    }
  }

  async function guardarCuenta() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!cedula || !nombre || !telefono) {
      alert("Complete cédula, nombre y teléfono.");
      return;
    }

    if (!tipoProducto) {
      alert("Seleccione el tipo de cuenta.");
      return;
    }

    if (!montoTotal && !saldoActual && !totalProducto) {
      alert("Ingrese monto original, saldo actual o seleccione un producto vendido.");
      return;
    }

    if (!responsableCobro) {
      alert("Ingrese responsable de cobro.");
      return;
    }

    setGuardando(true);

    let clienteCreado = null;

    const { data: clienteExistente, error: errorBuscarCliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cedula", cedula)
      .maybeSingle();

    if (errorBuscarCliente) {
      setGuardando(false);
      alert("Error buscando cliente: " + errorBuscarCliente.message);
      return;
    }

    if (clienteExistente) {
      clienteCreado = clienteExistente;

      const { error: errorActualizarCliente } = await supabase
        .from("clientes")
        .update({
          nombre,
          telefono,
          telefono_secundario: telefonoSecundario,
          direccion,
          correo,
          referencia_nombre: referenciaNombre,
          referencia_telefono: referenciaTelefono,
          estado: estadoCliente,
          observacion: observacionCobro,
        })
        .eq("empresa_id", empresaId)
        .eq("id", clienteExistente.id);

      if (errorActualizarCliente) {
        setGuardando(false);
        alert("Error actualizando cliente: " + errorActualizarCliente.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("clientes")
        .insert([
          {
            empresa_id: empresaId,
            cedula,
            nombre,
            telefono,
            telefono_secundario: telefonoSecundario,
            direccion,
            correo,
            referencia_nombre: referenciaNombre,
            referencia_telefono: referenciaTelefono,
            estado: estadoCliente,
            observacion: observacionCobro,
          },
        ])
        .select()
        .single();

      if (error) {
        setGuardando(false);
        alert("Error al guardar cliente: " + error.message);
        return;
      }

      clienteCreado = data;
    }

    const cuentaFinal = numeroCuenta || generarNumeroCuenta();

    const montoTotalNumero = Number(montoTotal || totalProducto || 0);
    const saldoActualNumero =
      saldoActual !== "" ? Number(saldoActual || 0) : montoTotalNumero;

    const productoSeleccionado = productos.find(
      (item) => String(item.id) === String(productoId)
    );

    const { data: comercialCreado, error: errorComercial } = await supabase
      .from("informacion_comercial")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteCreado.id,
          numero_cuenta: cuentaFinal,
          tipo_producto: tipoProducto,
          descripcion,
          modalidad: modalidad || null,
          monto_total: montoTotalNumero,
          saldo_actual: saldoActualNumero,
          cuota: cuota === "" ? null : Number(cuota || 0),
          fecha_inicio: fechaInicio || null,
          fecha_vencimiento: fechaVencimiento || null,
          responsable: responsableCobro,
          estado: estadoCuenta,
          observacion: observacionCobro,
          producto_id: productoId || null,
          codigo_producto: codigoProducto || null,
          producto_nombre:
            productoSeleccionado?.nombre ||
            productoSeleccionado?.descripcion ||
            null,
          cantidad_producto: productoId ? Number(cantidadProducto || 0) : null,
          precio_unitario: productoId ? Number(precioUnitario || 0) : null,
          total_producto: productoId ? Number(totalProducto || 0) : null,
          inventario_descontado: false,
        },
      ])
      .select()
      .single();

    if (errorComercial) {
      setGuardando(false);
      alert("Error en información comercial: " + errorComercial.message);
      return;
    }

    const diasMora = calcularDiasMora(fechaVencimiento);

    const { error: errorCobranza } = await supabase
      .from("informacion_cobranza")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteCreado.id,
          informacion_comercial_id: comercialCreado.id,
          estado_cobranza: estadoCobranza || "Al Día",
          dias_mora: diasMora,
          fecha_ultimo_pago: fechaUltimoPago || null,
          monto_ultimo_pago: Number(montoUltimoPago || 0),
          responsable_cobro: responsableCobro,
          observacion_cobro:
            observacionCobro || "Cuenta creada desde Cuentas por Cobrar",
        },
      ]);

    if (errorCobranza) {
      setGuardando(false);
      alert("Error en cobranza inicial: " + errorCobranza.message);
      return;
    }

    try {
      await subirDocumentos(clienteCreado.id, empresaId);
    } catch (error) {
      setGuardando(false);
      alert(
        "Cuenta creada, pero hubo error subiendo documentos: " + error.message
      );
      return;
    }

    setGuardando(false);
    alert("Cuenta por cobrar registrada correctamente. Cuenta: " + cuentaFinal);
    limpiarFormulario();
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <p style={etiqueta}>Carga Inicial</p>
              <h1 style={titulo}>Cuentas por Cobrar</h1>
              <p style={subtitulo}>
                Registra clientes existentes, cuentas, saldos, cobranza inicial y documentos.
              </p>
            </div>
          </div>

          <button onClick={volverCentroOperaciones} style={botonVolver}>
            ← Centro de Operaciones
          </button>
        </div>

        <div style={resumenGrid}>
          <KPI titulo="Cliente" valor={nombre || "Sin seleccionar"} icono="👤" />
          <KPI
            titulo="Saldo actual"
            valor={`$${Number(saldoActual || montoTotal || totalProducto || 0).toFixed(2)}`}
            icono="💰"
          />
          <KPI titulo="Estado cobranza" valor={estadoCobranza} icono="📞" />
        </div>

        <div style={card}>
          <SectionTitle
            icono="👤"
            titulo="Información del Cliente"
            texto="Datos personales, contacto y referencias del cliente."
          />

          <div style={grid}>
            <Campo label="Cédula / Identificación *">
              <input
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                style={inputStyle}
                placeholder="Ej. 8-888-888"
              />
            </Campo>

            <Campo label="Nombre completo *">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={inputStyle}
                placeholder="Nombre del cliente"
              />
            </Campo>

            <Campo label="Correo electrónico">
              <input
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={inputStyle}
                placeholder="correo@cliente.com"
              />
            </Campo>

            <Campo label="Teléfono principal *">
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                style={inputStyle}
                placeholder="Teléfono"
              />
            </Campo>

            <Campo label="Teléfono secundario">
              <input
                value={telefonoSecundario}
                onChange={(e) => setTelefonoSecundario(e.target.value)}
                style={inputStyle}
                placeholder="Opcional"
              />
            </Campo>

            <Campo label="Estado del cliente">
              <select
                value={estadoCliente}
                onChange={(e) => setEstadoCliente(e.target.value)}
                style={selectStyle}
              >
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
            </Campo>

            <Campo label="Nombre de referencia">
              <input
                value={referenciaNombre}
                onChange={(e) => setReferenciaNombre(e.target.value)}
                style={inputStyle}
                placeholder="Referencia personal"
              />
            </Campo>

            <Campo label="Teléfono de referencia">
              <input
                value={referenciaTelefono}
                onChange={(e) => setReferenciaTelefono(e.target.value)}
                style={inputStyle}
                placeholder="Teléfono referencia"
              />
            </Campo>
          </div>

          <Campo label="Dirección completa">
            <textarea
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              style={textarea}
              placeholder="Dirección del cliente..."
            />
          </Campo>
        </div>

        <div style={card}>
          <SectionTitle
            icono="🧾"
            titulo="Información de la Cuenta por Cobrar"
            texto="Monto, saldo, producto vendido, fechas y condiciones opcionales de cobro."
          />

          <div style={grid}>
            <Campo label="Número de cuenta">
              <input
                value={numeroCuenta}
                onChange={(e) => setNumeroCuenta(e.target.value)}
                style={inputStyle}
                placeholder="Opcional, se genera automático"
              />
            </Campo>

            <Campo label="Tipo de cuenta *">
              <select
                value={tipoProducto}
                onChange={(e) => setTipoProducto(e.target.value)}
                style={selectStyle}
              >
                <option value="">Seleccione tipo de cuenta</option>
                <option>Crédito</option>
                <option>Préstamo</option>
                <option>Cuenta por cobrar</option>
                <option>Separación / Abono inicial</option>
                <option>Membresía</option>
                <option>Suscripción</option>
                <option>Mensualidad</option>
                <option>Refinanciamiento</option>
                <option>Servicio pendiente</option>
              </select>
            </Campo>

            <Campo label="Monto total original *">
              <input
                type="number"
                value={montoTotal}
                onChange={(e) => setMontoTotal(e.target.value)}
                style={inputStyle}
                placeholder="0.00"
              />
            </Campo>

            <Campo label="Saldo actual *">
              <input
                type="number"
                value={saldoActual}
                onChange={(e) => setSaldoActual(e.target.value)}
                style={inputStyle}
                placeholder="0.00"
              />
            </Campo>

            <Campo label="Fecha de inicio">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Fecha de vencimiento">
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Estado de cuenta">
              <select
                value={estadoCuenta}
                onChange={(e) => setEstadoCuenta(e.target.value)}
                style={selectStyle}
              >
                <option>Activo</option>
                <option>Suspendido</option>
                <option>Cancelado</option>
              </select>
            </Campo>
          </div>

          <div style={opcionalBox}>
            <h3 style={subtituloInterno}>Condición de cobro opcional</h3>

            <div style={grid}>
              <Campo label="Cuota sugerida">
                <input
                  type="number"
                  value={cuota}
                  onChange={(e) => setCuota(e.target.value)}
                  style={inputStyle}
                  placeholder="Opcional. Ej. 50.00"
                />
              </Campo>

              <Campo label="Frecuencia sugerida">
                <select
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Sin frecuencia fija</option>
                  <option>Semanal</option>
                  <option>Quincenal</option>
                  <option>Mensual</option>
                  <option>Trimestral</option>
                  <option>Semestral</option>
                  <option>Anual</option>
                  <option>Personalizada</option>
                </select>
              </Campo>
            </div>

            <p style={notaSuave}>
              Estos campos no son obligatorios. Úsalos solo si el negocio maneja
              cuotas o una frecuencia pactada. Si el cliente abona montos
              variables, déjalos vacíos.
            </p>
          </div>

          <div style={productoBox}>
            <h3 style={subtituloInterno}>Producto vendido</h3>

            <div style={grid}>
              <Campo label="Producto del inventario">
                <select
                  value={productoId}
                  onChange={(e) => seleccionarProducto(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Seleccione producto vendido</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.codigo} - {producto.nombre} - Stock{" "}
                      {stockProducto(producto)}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Código del producto">
                <input
                  value={codigoProducto}
                  onChange={(e) => setCodigoProducto(e.target.value)}
                  style={inputStyle}
                  placeholder="Se llena automático"
                />
              </Campo>

              <Campo label="Cantidad vendida">
                <input
                  type="number"
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(e.target.value)}
                  style={inputStyle}
                  placeholder="1"
                />
              </Campo>

              <Campo label="Precio unitario">
                <input
                  type="number"
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(e.target.value)}
                  style={inputStyle}
                  placeholder="0.00"
                />
              </Campo>

              <Campo label="Precio total">
                <input
                  type="number"
                  value={totalProducto}
                  readOnly
                  style={inputReadOnly}
                  placeholder="0.00"
                />
              </Campo>
            </div>

            <p style={notaProducto}>
              Este registro solo asocia el producto a la cuenta. El descuento de
              inventario se debe hacer desde Caja cuando se registre el primer
              abono o la venta.
            </p>
          </div>

          <Campo label="Descripción">
            <textarea
              placeholder="Ej: Cliente separó sala, cuenta con saldo pendiente, abonos variables..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              style={textarea}
            />
          </Campo>
        </div>

        <div style={card}>
          <SectionTitle
            icono="📞"
            titulo="Información de Cobranza Inicial"
            texto="Estado inicial, último pago, responsable y observaciones de cobro."
          />

          <div style={grid}>
            <Campo label="Estado de cobranza">
              <select
                value={estadoCobranza}
                onChange={(e) => setEstadoCobranza(e.target.value)}
                style={selectStyle}
              >
                <option>Al Día</option>
                <option>Mora</option>
                <option>Legal</option>
                <option>Suspendido</option>
                <option>Cancelado</option>
              </select>
            </Campo>

            <Campo label="Fecha último pago">
              <input
                type="date"
                value={fechaUltimoPago}
                onChange={(e) => setFechaUltimoPago(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Monto último pago">
              <input
                type="number"
                value={montoUltimoPago}
                onChange={(e) => setMontoUltimoPago(e.target.value)}
                style={inputStyle}
                placeholder="0.00"
              />
            </Campo>

            <Campo label="Responsable de cobro *">
              <input
                value={responsableCobro}
                onChange={(e) => setResponsableCobro(e.target.value)}
                style={inputStyle}
                placeholder="Nombre del gestor"
              />
            </Campo>
          </div>

          <Campo label="Observación inicial / historial previo">
            <textarea
              placeholder="Observación inicial / historial previo de cobro"
              value={observacionCobro}
              onChange={(e) => setObservacionCobro(e.target.value)}
              style={textarea}
            />
          </Campo>

          <Campo label="Documentos del Cliente">
            <input
              type="file"
              multiple
              onChange={(e) => setDocumentos(Array.from(e.target.files))}
              style={inputStyle}
            />
          </Campo>

          <div style={acciones}>
            <button
              onClick={guardarCuenta}
              style={botonGuardar}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Guardar Cuenta por Cobrar"}
            </button>

            <button onClick={limpiarFormulario} style={botonLimpiar}>
              Limpiar
            </button>

            <button onClick={volverCentroOperaciones} style={botonSecundario}>
              Salir
            </button>
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

function SectionTitle({ icono, titulo, texto }) {
  return (
    <div style={sectionHeader}>
      <div style={sectionIcon}>{icono}</div>
      <div>
        <h2 style={tituloSeccion}>{titulo}</h2>
        <p style={textoSeccion}>{texto}</p>
      </div>
    </div>
  );
}

function KPI({ titulo, valor, icono }) {
  return (
    <div style={resumenCard}>
      <div style={kpiIcono}>{icono}</div>
      <p style={resumenLabel}>{titulo}</p>
      <h3 style={resumenValor}>{valor}</h3>
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
  maxWidth: "1350px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "28px",
  borderRadius: "22px",
  marginBottom: "22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const heroInfo = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const logo = {
  width: "85px",
  height: "auto",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "8px",
};

const etiqueta = {
  margin: 0,
  color: "#bbf7d0",
  fontSize: "14px",
  fontWeight: "bold",
};

const titulo = {
  margin: "4px 0",
  fontSize: "36px",
  fontWeight: "bold",
};

const subtitulo = {
  color: "#dcfce7",
  marginTop: "6px",
  maxWidth: "820px",
};

const botonVolver = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 18px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const resumenCard = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
};

const kpiIcono = {
  fontSize: "26px",
  marginBottom: "6px",
};

const resumenLabel = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
};

const resumenValor = {
  margin: "8px 0 0",
  color: "#111827",
  fontSize: "20px",
};

const card = {
  background: "#ffffff",
  padding: "26px",
  borderRadius: "20px",
  marginBottom: "20px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
};

const sectionIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  background: "#ecfdf5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const tituloSeccion = {
  margin: 0,
  color: "#111827",
};

const textoSeccion = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: "14px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(245px,1fr))",
  gap: "16px",
};

const campo = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginBottom: "16px",
};

const labelStyle = {
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  backgroundColor: "#ffffff",
  color: "#111827",
};

const inputReadOnly = {
  ...inputStyle,
  backgroundColor: "#f3f4f6",
  color: "#6b7280",
  fontWeight: "bold",
};

const selectStyle = {
  ...inputStyle,
  fontWeight: "600",
};

const textarea = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
};

const opcionalBox = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "18px",
  marginTop: "8px",
  marginBottom: "18px",
};

const productoBox = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "18px",
  marginTop: "8px",
  marginBottom: "18px",
};

const subtituloInterno = {
  margin: "0 0 14px",
  color: "#111827",
};

const notaSuave = {
  margin: "4px 0 0",
  color: "#475569",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  padding: "12px",
  borderRadius: "12px",
  fontSize: "13px",
};

const notaProducto = {
  margin: "4px 0 0",
  color: "#1e40af",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  padding: "12px",
  borderRadius: "12px",
  fontSize: "13px",
  fontWeight: "bold",
};

const acciones = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "20px",
};

const botonGuardar = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "14px 26px",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
};

const botonLimpiar = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
};

const botonSecundario = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
};
