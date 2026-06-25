"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function VentasCredito() {
  const [credito, setCredito] = useState({
    cliente: "",
    cedula: "",
    telefono: "",
    vendedor: "",
    codigo: "",
    producto: "",
    descripcion: "",
    cantidad: "1",
    precioCompra: "",
    precioVenta: "",
    precioCredito: "",
    inicial: "",
    plazo: "",
    modalidad: "Pago voluntario",
    diasPago: "",
    frecuencia: "Semanal",
    tasaInteres: "",
    gastosManejo: "",
    seguro: "",
    comision: "",
    primerPago: "",
    observacion: "",
  });

  const [stockDisponible, setStockDisponible] = useState(0);
  const [productoId, setProductoId] = useState(null);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [resultadosProductos, setResultadosProductos] = useState([]);
  const [mostrarCotizacion, setMostrarCotizacion] = useState(false);

  const precioCompra = Number(credito.precioCompra || 0);
  const precioVenta = Number(credito.precioVenta || 0);
  const precioCredito = Number(credito.precioCredito || 0);
  const inicial = Number(credito.inicial || 0);
  const plazo = Number(credito.plazo || 0);
  const tasaInteres = Number(credito.tasaInteres || 0);
  const gastosManejo = Number(credito.gastosManejo || 0);
  const seguro = Number(credito.seguro || 0);
  const comision = Number(credito.comision || 0);
  const cantidad = Number(credito.cantidad || 1);

  const ganancia = precioVenta - precioCompra;
  const porcentajeGanancia =
    precioCompra > 0 ? (ganancia / precioCompra) * 100 : 0;

  const montoBase = precioCredito * cantidad - inicial;

  const mesesEquivalentes =
    credito.frecuencia === "Semanal"
      ? plazo / 4.33
      : credito.frecuencia === "Quincenal"
      ? plazo / 2
      : plazo;

  const interesTotal = montoBase * (tasaInteres / 100) * mesesEquivalentes;
  const totalCredito = montoBase + interesTotal + gastosManejo + comision;
  const cuotaCredito = plazo > 0 ? totalCredito / plazo : 0;
  const seguroPorCuota = plazo > 0 ? seguro / plazo : 0;
  const cuotaFinal = cuotaCredito + seguroPorCuota;
  const totalPagar = cuotaFinal * plazo;

  const formato = (numero) =>
    "$" +
    Number(numero || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de continuar.");
      return null;
    }

    return empresaId;
  }

  function actualizar(campo, valor) {
    setCredito((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function limpiarFormulario() {
    setCredito({
      cliente: "",
      cedula: "",
      telefono: "",
      vendedor: "",
      codigo: "",
      producto: "",
      descripcion: "",
      cantidad: "1",
      precioCompra: "",
      precioVenta: "",
      precioCredito: "",
      inicial: "",
      plazo: "",
      modalidad: "Pago voluntario",
      diasPago: "",
      frecuencia: "Semanal",
      tasaInteres: "",
      gastosManejo: "",
      seguro: "",
      comision: "",
      primerPago: "",
      observacion: "",
    });

    setStockDisponible(0);
    setProductoId(null);
    setBusquedaProducto("");
    setResultadosProductos([]);
    setMostrarCotizacion(false);
  }

  function limpiarProducto() {
    setProductoId(null);
    setStockDisponible(0);
    setBusquedaProducto("");
    setResultadosProductos([]);

    setCredito((prev) => ({
      ...prev,
      codigo: "",
      producto: "",
      descripcion: "",
      cantidad: "1",
      precioCompra: "",
      precioVenta: "",
      precioCredito: "",
    }));
  }

  async function buscarProductos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const texto = busquedaProducto.trim();

    if (texto.length < 2) {
      alert("Escriba al menos 2 caracteres para buscar.");
      return;
    }

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(
        `codigo.ilike.%${texto}%,nombre.ilike.%${texto}%,descripcion.ilike.%${texto}%`
      )
      .order("nombre");

    if (error) {
      alert("Error buscando producto: " + error.message);
      return;
    }

    setResultadosProductos(data || []);
  }

  function seleccionarProducto(producto) {
    setProductoId(producto.id);
    setStockDisponible(Number(producto.stock_actual || 0));
    setBusquedaProducto("");
    setResultadosProductos([]);

    setCredito((prev) => ({
      ...prev,
      codigo: producto.codigo || "",
      producto: producto.nombre || "",
      descripcion: producto.descripcion || "",
      precioCompra: producto.precio_compra || "",
      precioVenta: producto.precio_venta || "",
      precioCredito: producto.precio_credito || "",
    }));
  }

  function cotizarCredito() {
    if (!productoId || !credito.precioCredito) {
      alert("Primero seleccione un producto del inventario.");
      return;
    }

    if (!plazo || plazo <= 0) {
      alert("Ingrese el plazo o cantidad de cuotas.");
      return;
    }

    setMostrarCotizacion(true);
  }

  async function guardarCredito() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!credito.cliente || !credito.cedula || !productoId) {
      alert("Complete cliente, cédula y producto válido.");
      return;
    }

    if (!credito.vendedor) {
      alert("Ingrese el vendedor.");
      return;
    }

    if (cantidad <= 0) {
      alert("La cantidad debe ser mayor a cero.");
      return;
    }

    if (stockDisponible < cantidad) {
      alert("No hay suficiente stock disponible.");
      return;
    }

    if (!plazo || plazo <= 0) {
      alert("Ingrese el plazo o cantidad de cuotas.");
      return;
    }

    const numeroCuenta = "KX-" + Date.now();
    const usuario = credito.vendedor;
    const fechaMovimiento = new Date().toISOString();
    const fechaHoy = new Date().toISOString().split("T")[0];
    const nuevoStock = stockDisponible - cantidad;

    const { error: errorCredito } = await supabase.from("creditos").insert([
      {
        empresa_id: empresaId,
        numero_cuenta: numeroCuenta,
        cliente: credito.cliente,
        cedula: credito.cedula,
        telefono: credito.telefono,
        vendedor: credito.vendedor,
        producto_id: productoId,
        codigo_producto: credito.codigo,
        producto: credito.producto,
        cantidad,
        descripcion: credito.descripcion,
        precio_compra: precioCompra,
        precio_venta: precioVenta,
        precio_credito: precioCredito,
        ganancia,
        porcentaje_ganancia: porcentajeGanancia,
        abono_inicial: inicial,
        monto_financiado: montoBase,
        plazo,
        modalidad: credito.modalidad,
        dias_pago: credito.diasPago,
        frecuencia: credito.frecuencia,
        tasa_interes_mensual: tasaInteres,
        gastos_manejo: gastosManejo,
        seguro,
        comision,
        interes_total: interesTotal,
        total_financiado: totalCredito,
        total_pagar: totalPagar,
        cuota: cuotaFinal,
        saldo_actual: totalCredito,
        primer_pago: credito.primerPago || null,
        estado: "Activo",
        observacion: credito.observacion,
      },
    ]);

    if (errorCredito) {
      alert("Error al guardar crédito: " + errorCredito.message);
      return;
    }

    const { data: infoComercial, error: errorInfoComercial } = await supabase
      .from("informacion_comercial")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: null,
          numero_cuenta: numeroCuenta,
          tipo_producto: credito.producto,
          modalidad: credito.modalidad,
          descripcion: credito.descripcion,
          monto_total: totalPagar,
          saldo_actual: totalCredito,
          cuota: cuotaFinal,
          fecha_inicio: fechaHoy,
          fecha_vencimiento: credito.primerPago || null,
          responsable: credito.vendedor,
          estado: "Activo",
        },
      ])
      .select()
      .single();

    if (errorInfoComercial) {
      alert(
        "Crédito creado, pero error creando información comercial: " +
          errorInfoComercial.message
      );
      return;
    }

    const { error: errorInfoCobranza } = await supabase
      .from("informacion_cobranza")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: null,
          informacion_comercial_id: infoComercial.id,
          estado_cobranza: "Al Día",
          dias_mora: 0,
          responsable_cob: credito.vendedor,
          observacion_cob: "Crédito creado desde Venta Crédito",
        },
      ]);

    if (errorInfoCobranza) {
      alert(
        "Crédito creado, pero error creando información de cobranza: " +
          errorInfoCobranza.message
      );
      return;
    }

    const { error: errorStock } = await supabase
      .from("productos")
      .update({
        stock_actual: nuevoStock,
        ultimo_movimiento_usuario: usuario,
        ultimo_movimiento_fecha: fechaMovimiento,
      })
      .eq("id", productoId)
      .eq("empresa_id", empresaId);

    if (errorStock) {
      alert(
        "Crédito creado, pero hubo error al descontar inventario: " +
          errorStock.message
      );
      return;
    }

    const { error: errorMovimiento } = await supabase
      .from("movimientos_inventario")
      .insert([
        {
          empresa_id: empresaId,
          producto_id: productoId,
          tipo_movimiento: "SALIDA",
          cantidad,
          stock_anterior: stockDisponible,
          stock_nuevo: nuevoStock,
          observacion: `Venta crédito ${numeroCuenta} - ${credito.cliente}`,
          usuario,
        },
      ]);

    if (errorMovimiento) {
      alert(
        "Crédito creado, inventario descontado, pero no se registró movimiento: " +
          errorMovimiento.message
      );
      return;
    }

    alert("Crédito creado correctamente. Cuenta: " + numeroCuenta);
    limpiarFormulario();
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <p style={etiqueta}>Módulo comercial</p>
              <h1 style={titulo}>Venta a Crédito</h1>
              <p style={subtitulo}>
                Crea créditos, calcula cuotas, descuenta inventario y activa cobranza.
              </p>
            </div>
          </div>

          <button onClick={volverDashboard} style={botonClaro}>
            ← Volver al Dashboard
          </button>
        </div>

        <div style={kpiGrid}>
          <KPI titulo="Monto base" valor={formato(montoBase)} icono="💳" />
          <KPI titulo="Cuota final" valor={formato(cuotaFinal)} icono="📆" destacado />
          <KPI titulo="Total a pagar" valor={formato(totalPagar)} icono="💰" />
          <KPI titulo="Stock disponible" valor={stockDisponible} icono="📦" numero />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Cliente</h2>

          <div style={grid}>
            <Campo label="Nombre del cliente">
              <input
                value={credito.cliente}
                onChange={(e) => actualizar("cliente", e.target.value)}
                style={inputStyle}
                placeholder="Nombre completo"
              />
            </Campo>

            <Campo label="Cédula">
              <input
                value={credito.cedula}
                onChange={(e) => actualizar("cedula", e.target.value)}
                style={inputStyle}
                placeholder="Cédula o identificación"
              />
            </Campo>

            <Campo label="Teléfono">
              <input
                value={credito.telefono}
                onChange={(e) => actualizar("telefono", e.target.value)}
                style={inputStyle}
                placeholder="Teléfono del cliente"
              />
            </Campo>

            <Campo label="Vendedor">
              <input
                value={credito.vendedor}
                onChange={(e) => actualizar("vendedor", e.target.value)}
                style={inputStyle}
                placeholder="Responsable de la venta"
              />
            </Campo>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Producto del Inventario</h2>

          <div style={grid}>
            <Campo label="Buscar artículo">
              <div style={busquedaBox}>
                <input
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  style={inputStyle}
                  placeholder="Código, nombre o descripción"
                />
                <button onClick={buscarProductos} style={botonBuscar}>
                  Buscar
                </button>
              </div>
            </Campo>

            <Campo label="Código">
              <input value={credito.codigo} readOnly style={inputReadOnly} />
            </Campo>

            <Campo label="Producto">
              <input value={credito.producto} readOnly style={inputReadOnly} />
            </Campo>

            <Campo label="Stock disponible">
              <input value={stockDisponible} readOnly style={inputReadOnly} />
            </Campo>

            <Campo label="Cantidad">
              <input
                type="number"
                value={credito.cantidad}
                onChange={(e) => actualizar("cantidad", e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Precio compra">
              <input value={formato(precioCompra)} readOnly style={inputReadOnly} />
            </Campo>

            <Campo label="Precio venta">
              <input value={formato(precioVenta)} readOnly style={inputReadOnly} />
            </Campo>

            <Campo label="Precio crédito">
              <input value={formato(precioCredito)} readOnly style={inputReadOnly} />
            </Campo>

            <Campo label="% Ganancia">
              <input
                value={`${porcentajeGanancia.toFixed(2)}%`}
                readOnly
                style={inputReadOnly}
              />
            </Campo>
          </div>

          <Campo label="Descripción">
            <input value={credito.descripcion} readOnly style={inputReadOnly} />
          </Campo>

          {resultadosProductos.length > 0 && (
            <div style={tablaBox}>
              <table style={tabla}>
                <thead>
                  <tr>
                    <th style={th}>Código</th>
                    <th style={th}>Producto</th>
                    <th style={th}>Stock</th>
                    <th style={th}>Precio Crédito</th>
                    <th style={th}>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {resultadosProductos.map((p) => (
                    <tr key={p.id}>
                      <td style={td}>{p.codigo}</td>
                      <td style={td}>{p.nombre}</td>
                      <td style={td}>{p.stock_actual}</td>
                      <td style={td}>{formato(p.precio_credito)}</td>
                      <td style={td}>
                        <button
                          style={botonMini}
                          onClick={() => seleccionarProducto(p)}
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

          {productoId && (
            <button onClick={limpiarProducto} style={botonGrisPequeno}>
              Limpiar Producto
            </button>
          )}
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Condiciones del Crédito</h2>

          <div style={grid}>
            <Campo label="Abono inicial">
              <input
                type="number"
                value={credito.inicial}
                onChange={(e) => actualizar("inicial", e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Plazo / cantidad de cuotas">
              <input
                type="number"
                value={credito.plazo}
                onChange={(e) => actualizar("plazo", e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Modalidad">
              <select
                value={credito.modalidad}
                onChange={(e) => actualizar("modalidad", e.target.value)}
                style={inputStyle}
              >
                <option>Pago voluntario</option>
                <option>Descuento directo</option>
              </select>
            </Campo>

            <Campo label="Frecuencia">
              <select
                value={credito.frecuencia}
                onChange={(e) => actualizar("frecuencia", e.target.value)}
                style={inputStyle}
              >
                <option>Semanal</option>
                <option>Quincenal</option>
                <option>Mensual</option>
              </select>
            </Campo>

            <Campo label="Regla de pago">
              <input
                value={credito.diasPago}
                onChange={(e) => actualizar("diasPago", e.target.value)}
                style={inputStyle}
                placeholder="Ej. todos los viernes"
              />
            </Campo>

            <Campo label="Primer pago">
              <input
                type="date"
                value={credito.primerPago}
                onChange={(e) => actualizar("primerPago", e.target.value)}
                style={inputStyle}
              />
            </Campo>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Cargos y Cálculo</h2>

          <div style={grid}>
            <Campo label="Tasa de interés mensual %">
              <input
                type="number"
                value={credito.tasaInteres}
                onChange={(e) => actualizar("tasaInteres", e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Gastos de manejo">
              <input
                type="number"
                value={credito.gastosManejo}
                onChange={(e) => actualizar("gastosManejo", e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Comisión">
              <input
                type="number"
                value={credito.comision}
                onChange={(e) => actualizar("comision", e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Seguro total">
              <input
                type="number"
                value={credito.seguro}
                onChange={(e) => actualizar("seguro", e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Cuota final">
              <input
                value={formato(cuotaFinal)}
                readOnly
                style={{
                  ...inputReadOnly,
                  fontWeight: "bold",
                  color: "#16a34a",
                }}
              />
            </Campo>
          </div>

          <div style={acciones}>
            <button style={botonAzul} onClick={cotizarCredito}>
              Generar Cotización
            </button>
          </div>

          {mostrarCotizacion && (
            <div style={resumenCredito}>
              <Resumen label="Monto base" valor={formato(montoBase)} principal />
              <Resumen label="Interés total" valor={formato(interesTotal)} />
              <Resumen label="Gastos de manejo" valor={formato(gastosManejo)} />
              <Resumen label="Comisión" valor={formato(comision)} />
              <Resumen label="Total crédito" valor={formato(totalCredito)} principal />
              <Resumen label="Seguro por cuota" valor={formato(seguroPorCuota)} />
              <Resumen label="Cuota crédito" valor={formato(cuotaCredito)} />
              <Resumen label="Cuota final" valor={formato(cuotaFinal)} principal />
              <Resumen label="Total a pagar" valor={formato(totalPagar)} principal />
            </div>
          )}

          <Campo label="Observación">
            <textarea
              value={credito.observacion}
              onChange={(e) => actualizar("observacion", e.target.value)}
              style={textarea}
              placeholder="Observación de la venta..."
            />
          </Campo>

          <div style={acciones}>
            <button style={boton} onClick={guardarCredito}>
              Crear Crédito
            </button>

            <button style={botonGris} onClick={limpiarFormulario}>
              Limpiar
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

function KPI({ titulo, valor, icono, destacado, numero }) {
  return (
    <div style={destacado ? kpiCardDestacado : kpiCard}>
      <div style={kpiIcono}>{icono}</div>
      <p style={kpiTitulo}>{titulo}</p>
      <h2 style={kpiValor}>{numero ? valor : valor}</h2>
    </div>
  );
}

function Resumen({ label, valor, principal }) {
  return (
    <div style={principal ? totalCardPrincipal : totalCard}>
      <span style={totalLabel}>{label}</span>
      <strong style={principal ? totalValorPrincipal : totalValor}>{valor}</strong>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#eef2f7",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1450px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #1e40af)",
  color: "#ffffff",
  padding: "26px",
  borderRadius: "22px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const heroInfo = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const logo = {
  width: "90px",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "8px",
};

const etiqueta = {
  margin: 0,
  color: "#bfdbfe",
  fontSize: "13px",
  fontWeight: "bold",
};

const titulo = {
  fontSize: "34px",
  margin: "4px 0",
};

const subtitulo = {
  color: "#dbeafe",
  margin: 0,
};

const botonClaro = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
  marginBottom: "18px",
};

const kpiCard = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "18px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
  border: "1px solid #e5e7eb",
};

const kpiCardDestacado = {
  background: "linear-gradient(135deg, #16a34a, #166534)",
  color: "#ffffff",
  padding: "18px",
  borderRadius: "18px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
};

const kpiIcono = {
  fontSize: "25px",
  marginBottom: "8px",
};

const kpiTitulo = {
  margin: 0,
  fontSize: "14px",
  color: "inherit",
};

const kpiValor = {
  marginTop: "8px",
  fontSize: "27px",
  color: "inherit",
};

const card = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  marginBottom: "18px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
};

const tituloSeccion = {
  marginTop: 0,
  marginBottom: "16px",
  color: "#111827",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
};

const campo = {
  marginBottom: "10px",
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
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
};

const inputReadOnly = {
  ...inputStyle,
  background: "#f3f4f6",
  color: "#374151",
};

const busquedaBox = {
  display: "flex",
  gap: "8px",
};

const botonBuscar = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "12px 16px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonMini = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonAzul = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonGrisPequeno = {
  marginTop: "14px",
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const resumenCredito = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
  marginTop: "16px",
  marginBottom: "16px",
};

const totalCard = {
  background: "#f9fafb",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
};

const totalCardPrincipal = {
  background: "#ecfdf5",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #bbf7d0",
};

const totalLabel = {
  display: "block",
  color: "#6b7280",
  fontSize: "14px",
  marginBottom: "6px",
};

const totalValor = {
  color: "#111827",
  fontSize: "22px",
};

const totalValorPrincipal = {
  color: "#16a34a",
  fontSize: "24px",
};

const textarea = {
  width: "100%",
  padding: "12px",
  borderRadius: "9px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
  minHeight: "90px",
};

const acciones = {
  display: "flex",
  gap: "10px",
  marginTop: "16px",
  flexWrap: "wrap",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonGris = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const tablaBox = {
  marginTop: "18px",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  overflowX: "auto",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "12px",
  background: "#111827",
  color: "#ffffff",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #f3f4f6",
};
