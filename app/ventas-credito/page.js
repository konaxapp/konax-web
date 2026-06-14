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
  const mostrarResumen = credito.precioCredito !== "" || credito.inicial !== "";

  const formato = (numero) =>
    "$" +
    Number(numero || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

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
  }

  async function buscarProductoPorCodigo() {
    if (!credito.codigo) {
      alert("Ingrese el código del producto.");
      return;
    }

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("codigo", credito.codigo)
      .maybeSingle();

    if (error) {
      alert("Error buscando producto: " + error.message);
      return;
    }

    if (!data) {
      alert("No se encontró el producto en inventario.");
      setProductoId(null);
      return;
    }

    setProductoId(data.id);
    setStockDisponible(Number(data.stock_actual || 0));

    setCredito((prev) => ({
      ...prev,
      producto: data.nombre || "",
      descripcion: data.descripcion || "",
      precioCompra: data.precio_compra || "",
      precioVenta: data.precio_venta || "",
      precioCredito: data.precio_credito || "",
    }));
  }

  async function guardarCredito() {
    if (!credito.cliente || !credito.cedula || !credito.codigo || !productoId) {
      alert("Complete cliente, cédula y código de producto válido.");
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

    if (!credito.precioCredito || precioCredito <= 0) {
      alert("El producto no tiene precio crédito válido.");
      return;
    }

    if (!plazo || plazo <= 0) {
      alert("Ingrese el plazo o cantidad de cuotas.");
      return;
    }

    const numeroCuenta = "KX-" + Date.now();
    const usuario = localStorage.getItem("usuarioNombre") || credito.vendedor || "Administrador";
    const fechaMovimiento = new Date().toISOString();

    const { error: errorCredito } = await supabase.from("creditos").insert([
      {
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

    const nuevoStock = stockDisponible - cantidad;

    const { error: errorStock } = await supabase
      .from("productos")
      .update({
        stock_actual: nuevoStock,
        ultimo_movimiento_usuario: usuario,
        ultimo_movimiento_fecha: fechaMovimiento,
      })
      .eq("id", productoId);

    if (errorStock) {
      alert("Crédito creado, pero hubo error al descontar inventario: " + errorStock.message);
      return;
    }

    const { error: errorMovimiento } = await supabase
      .from("movimientos_inventario")
      .insert([
        {
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
      alert("Crédito creado, inventario descontado, pero no se registró movimiento: " + errorMovimiento.message);
      return;
    }

    alert("Crédito creado correctamente. Cuenta: " + numeroCuenta);
    limpiarFormulario();
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div>
            <h1 style={titulo}>Venta Crédito</h1>
            <p style={subtitulo}>
              Creación de crédito, cálculo de cuota y descuento de inventario.
            </p>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Información del Cliente</h2>

          <div style={grid}>
            <Campo label="Nombre del cliente">
              <input value={credito.cliente} onChange={(e) => actualizar("cliente", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Cédula">
              <input value={credito.cedula} onChange={(e) => actualizar("cedula", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Teléfono">
              <input value={credito.telefono} onChange={(e) => actualizar("telefono", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Vendedor">
              <input value={credito.vendedor} onChange={(e) => actualizar("vendedor", e.target.value)} style={inputStyle} />
            </Campo>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Producto</h2>

          <div style={grid}>
            <Campo label="Código de producto">
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={credito.codigo} onChange={(e) => actualizar("codigo", e.target.value)} style={inputStyle} />
                <button onClick={buscarProductoPorCodigo} style={botonBuscar}>
                  Buscar
                </button>
              </div>
            </Campo>

            <Campo label="Producto">
              <input value={credito.producto} readOnly style={inputReadOnly} />
            </Campo>

            <Campo label="Descripción">
              <input value={credito.descripcion} readOnly style={inputReadOnly} />
            </Campo>

            <Campo label="Stock disponible">
              <input value={stockDisponible} readOnly style={inputReadOnly} />
            </Campo>

            <Campo label="Cantidad">
              <input type="number" value={credito.cantidad} onChange={(e) => actualizar("cantidad", e.target.value)} style={inputStyle} />
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

            <Campo label="% Ganancia sobre venta">
              <input value={`${porcentajeGanancia.toFixed(2)}%`} readOnly style={inputReadOnly} />
            </Campo>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Condiciones del Crédito</h2>

          <div style={grid}>
            <Campo label="Abono inicial">
              <input type="number" value={credito.inicial} onChange={(e) => actualizar("inicial", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Plazo / cantidad de cuotas">
              <input type="number" value={credito.plazo} onChange={(e) => actualizar("plazo", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Modalidad">
              <select value={credito.modalidad} onChange={(e) => actualizar("modalidad", e.target.value)} style={inputStyle}>
                <option>Pago voluntario</option>
                <option>Descuento directo</option>
              </select>
            </Campo>

            <Campo label="Frecuencia">
              <select value={credito.frecuencia} onChange={(e) => actualizar("frecuencia", e.target.value)} style={inputStyle}>
                <option>Semanal</option>
                <option>Quincenal</option>
                <option>Mensual</option>
              </select>
            </Campo>

            <Campo label="Días de pago">
              <input value={credito.diasPago} onChange={(e) => actualizar("diasPago", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Primer pago">
              <input type="date" value={credito.primerPago} onChange={(e) => actualizar("primerPago", e.target.value)} style={inputStyle} />
            </Campo>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Cargos y Cálculo</h2>

          <div style={grid}>
            <Campo label="Tasa de interés mensual %">
              <input type="number" value={credito.tasaInteres} onChange={(e) => actualizar("tasaInteres", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Gastos de manejo">
              <input type="number" value={credito.gastosManejo} onChange={(e) => actualizar("gastosManejo", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Comisión">
              <input type="number" value={credito.comision} onChange={(e) => actualizar("comision", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Seguro total">
              <input type="number" value={credito.seguro} onChange={(e) => actualizar("seguro", e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Cuota final">
              <input value={formato(cuotaFinal)} readOnly style={{ ...inputReadOnly, fontWeight: "bold", color: "#16a34a" }} />
            </Campo>
          </div>

          {mostrarResumen && (
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
            <textarea value={credito.observacion} onChange={(e) => actualizar("observacion", e.target.value)} style={textarea} />
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
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
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
  background: "#f3f4f6",
  padding: "18px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1400px",
  margin: "0 auto",
};

const encabezado = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "18px",
};

const logo = {
  width: "90px",
  height: "auto",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  marginTop: "5px",
  fontSize: "15px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginBottom: "16px",
  color: "#111827",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
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
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
};

const inputReadOnly = {
  ...inputStyle,
  background: "#f3f4f6",
};

const botonBuscar = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "12px 16px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const resumenCredito = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
  marginTop: "16px",
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
  borderRadius: "8px",
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
