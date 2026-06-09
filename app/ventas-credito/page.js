"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function VentasCredito() {
  const [credito, setCredito] = useState({
    cliente: "",
    cedula: "",
    telefono: "",
    vendedor: "",
    gestor: "",
    codigo: "",
    producto: "",
    cantidad: "1",
    descripcion: "",
    precioContado: "",
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

  const precioCredito = Number(credito.precioCredito || 0);
  const inicial = Number(credito.inicial || 0);
  const plazo = Number(credito.plazo || 0);
  const tasaInteres = Number(credito.tasaInteres || 0);
  const gastosManejo = Number(credito.gastosManejo || 0);
  const seguro = Number(credito.seguro || 0);
  const comision = Number(credito.comision || 0);
  const cantidad = Number(credito.cantidad || 1);

  const montoFinanciado = precioCredito - inicial;
  const interesTotal = montoFinanciado * (tasaInteres / 100) * plazo;
  const totalFinanciado =
    montoFinanciado + interesTotal + gastosManejo + seguro + comision;
  const cuotaCalculada = plazo > 0 ? totalFinanciado / plazo : 0;

  const mostrarResumen = credito.precioCredito !== "" || credito.inicial !== "";

  const formato = (numero) =>
    "$" +
    Number(numero || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });

  function limpiarFormulario() {
    setCredito({
      cliente: "",
      cedula: "",
      telefono: "",
      vendedor: "",
      gestor: "",
      codigo: "",
      producto: "",
      cantidad: "1",
      descripcion: "",
      precioContado: "",
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
  }

  async function guardarCredito() {
    if (!credito.cliente || !credito.cedula || !credito.codigo || !credito.precioCredito) {
      alert("Complete cliente, cédula, código de producto y precio crédito.");
      return;
    }

    if (cantidad <= 0) {
      alert("La cantidad debe ser mayor a cero.");
      return;
    }

    const { data: productoInventario, error: errorInventario } = await supabase
      .from("inventario")
      .select("*")
      .eq("codigo", credito.codigo)
      .single();

    if (errorInventario || !productoInventario) {
      alert("No se encontró el producto en inventario.");
      return;
    }

    const stockActual = Number(productoInventario.stock || 0);

    if (stockActual < cantidad) {
      alert("No hay suficiente stock disponible.");
      return;
    }

    const numeroCuenta = "KX-" + Date.now();

    const { error: errorCredito } = await supabase.from("creditos").insert([
      {
        numero_cuenta: numeroCuenta,
        cliente: credito.cliente,
        cedula: credito.cedula,
        telefono: credito.telefono,
        vendedor: credito.vendedor,
        gestor: credito.gestor,
        codigo_producto: credito.codigo,
        producto: credito.producto,
        cantidad,
        descripcion: credito.descripcion,
        precio_contado: Number(credito.precioContado || 0),
        precio_credito: precioCredito,
        abono_inicial: inicial,
        monto_financiado: montoFinanciado,
        plazo,
        modalidad: credito.modalidad,
        dias_pago: credito.diasPago,
        frecuencia: credito.frecuencia,
        tasa_interes_mensual: tasaInteres,
        gastos_manejo: gastosManejo,
        seguro,
        comision,
        interes_total: interesTotal,
        total_financiado: totalFinanciado,
        total_pagar: totalFinanciado,
        cuota: cuotaCalculada,
        saldo_actual: totalFinanciado,
        primer_pago: credito.primerPago || null,
        estado: "Activo",
        observacion: credito.observacion,
      },
    ]);

    if (errorCredito) {
      alert("Error al guardar crédito: " + errorCredito.message);
      return;
    }

    const { error: errorStock } = await supabase
      .from("inventario")
      .update({
        stock: stockActual - cantidad,
      })
      .eq("codigo", credito.codigo);

    if (errorStock) {
      alert("Crédito creado, pero hubo error al descontar inventario: " + errorStock.message);
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
              Cotización, cálculo financiero, creación de crédito y descuento de inventario.
            </p>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Información del Cliente</h2>

          <div style={grid}>
            <input placeholder="Nombre del cliente" value={credito.cliente} onChange={(e) => setCredito({ ...credito, cliente: e.target.value })} style={inputStyle} />
            <input placeholder="Cédula" value={credito.cedula} onChange={(e) => setCredito({ ...credito, cedula: e.target.value })} style={inputStyle} />
            <input placeholder="Teléfono" value={credito.telefono} onChange={(e) => setCredito({ ...credito, telefono: e.target.value })} style={inputStyle} />
            <input placeholder="Vendedor" value={credito.vendedor} onChange={(e) => setCredito({ ...credito, vendedor: e.target.value })} style={inputStyle} />
            <input placeholder="Gestor asignado" value={credito.gestor} onChange={(e) => setCredito({ ...credito, gestor: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Producto</h2>

          <div style={grid}>
            <input placeholder="Código de producto" value={credito.codigo} onChange={(e) => setCredito({ ...credito, codigo: e.target.value })} style={inputStyle} />
            <input placeholder="Producto" value={credito.producto} onChange={(e) => setCredito({ ...credito, producto: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Cantidad" value={credito.cantidad} onChange={(e) => setCredito({ ...credito, cantidad: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Precio contado" value={credito.precioContado} onChange={(e) => setCredito({ ...credito, precioContado: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Precio crédito" value={credito.precioCredito} onChange={(e) => setCredito({ ...credito, precioCredito: e.target.value })} style={inputStyle} />
          </div>

          <textarea placeholder="Descripción del producto o crédito" value={credito.descripcion} onChange={(e) => setCredito({ ...credito, descripcion: e.target.value })} style={textarea} />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Condiciones del Crédito</h2>

          <div style={grid}>
            <input type="number" placeholder="Abono inicial" value={credito.inicial} onChange={(e) => setCredito({ ...credito, inicial: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Plazo / cantidad de cuotas" value={credito.plazo} onChange={(e) => setCredito({ ...credito, plazo: e.target.value })} style={inputStyle} />

            <select value={credito.modalidad} onChange={(e) => setCredito({ ...credito, modalidad: e.target.value })} style={inputStyle}>
              <option>Pago voluntario</option>
              <option>Descuento directo</option>
            </select>

            <select value={credito.frecuencia} onChange={(e) => setCredito({ ...credito, frecuencia: e.target.value })} style={inputStyle}>
              <option>Semanal</option>
              <option>Quincenal</option>
              <option>Mensual</option>
            </select>

            <input placeholder="Días de pago. Ej: 15 y 30 / viernes / quincena" value={credito.diasPago} onChange={(e) => setCredito({ ...credito, diasPago: e.target.value })} style={inputStyle} />
            <input type="date" value={credito.primerPago} onChange={(e) => setCredito({ ...credito, primerPago: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Cargos y Cálculo</h2>

          <div style={grid}>
            <input type="number" placeholder="Tasa de interés mensual %" value={credito.tasaInteres} onChange={(e) => setCredito({ ...credito, tasaInteres: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Gastos de manejo" value={credito.gastosManejo} onChange={(e) => setCredito({ ...credito, gastosManejo: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Seguro" value={credito.seguro} onChange={(e) => setCredito({ ...credito, seguro: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Comisión" value={credito.comision} onChange={(e) => setCredito({ ...credito, comision: e.target.value })} style={inputStyle} />
            <input value={formato(cuotaCalculada)} readOnly style={{ ...inputStyle, fontWeight: "bold", color: "#16a34a" }} />
          </div>

          {mostrarResumen && (
            <div style={resumenCredito}>
              <div style={totalCard}><span style={totalLabel}>Precio crédito</span><strong style={totalValor}>{formato(precioCredito)}</strong></div>
              <div style={totalCard}><span style={totalLabel}>Abono inicial</span><strong style={totalValor}>{formato(inicial)}</strong></div>
              <div style={totalCardPrincipal}><span style={totalLabel}>Monto financiado</span><strong style={totalValorPrincipal}>{formato(montoFinanciado)}</strong></div>
              <div style={totalCard}><span style={totalLabel}>Interés total</span><strong style={totalValor}>{formato(interesTotal)}</strong></div>
              <div style={totalCard}><span style={totalLabel}>Gastos + seguro + comisión</span><strong style={totalValor}>{formato(gastosManejo + seguro + comision)}</strong></div>
              <div style={totalCardPrincipal}><span style={totalLabel}>Total a pagar</span><strong style={totalValorPrincipal}>{formato(totalFinanciado)}</strong></div>
              <div style={totalCardPrincipal}><span style={totalLabel}>Cuota sugerida</span><strong style={totalValorPrincipal}>{formato(cuotaCalculada)}</strong></div>
              <div style={totalCardPrincipal}><span style={totalLabel}>Saldo inicial</span><strong style={totalValorPrincipal}>{formato(totalFinanciado)}</strong></div>
            </div>
          )}

          <textarea placeholder="Observación del crédito..." value={credito.observacion} onChange={(e) => setCredito({ ...credito, observacion: e.target.value })} style={textarea} />

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

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
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
  marginTop: "16px",
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
