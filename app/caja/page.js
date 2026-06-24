"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Caja() {
  const [tipoMovimiento, setTipoMovimiento] = useState("Venta Contado");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);

  const [buscarCliente, setBuscarCliente] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cuentasCliente, setCuentasCliente] = useState([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);

  const [nombreContado, setNombreContado] = useState("");
  const [cedulaContado, setCedulaContado] = useState("");

  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observacion, setObservacion] = useState("");
  const [movimientos, setMovimientos] = useState([]);

  const requiereCliente = tipoMovimiento !== "Venta Contado";

  useEffect(() => {
    cargarMovimientos();
  }, []);

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de usar Caja.");
      return null;
    }

    return empresaId;
  }

  function generarTransaccion() {
    return "TX-" + Date.now();
  }

  function sumarMesesFecha(fechaTexto, meses) {
    if (!fechaTexto) return "";

    const [anio, mes, dia] = fechaTexto.split("-").map(Number);
    const fecha = new Date(anio, mes - 1 + meses, dia);

    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(fecha.getDate()).padStart(2, "0")}`;
  }

  function calcularDiasParaVencer(fechaVencimiento) {
    if (!fechaVencimiento) return 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [anio, mes, dia] = fechaVencimiento.split("-").map(Number);
    const vence = new Date(anio, mes - 1, dia);
    vence.setHours(0, 0, 0, 0);

    return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
  }

  function calcularNuevoVencimiento(fechaActual, periodicidad) {
    const fechaBase =
      calcularDiasParaVencer(fechaActual) < 0
        ? new Date().toISOString().split("T")[0]
        : fechaActual;

    if (periodicidad === "Mensual") return sumarMesesFecha(fechaBase, 1);
    if (periodicidad === "Trimestral") return sumarMesesFecha(fechaBase, 3);
    if (periodicidad === "Semestral") return sumarMesesFecha(fechaBase, 6);
    if (periodicidad === "Anual") return sumarMesesFecha(fechaBase, 12);

    return sumarMesesFecha(fechaBase, 1);
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

    if (clientesData && clientesData.length > 0) {
      resultados = clientesData.map((cliente) => ({
        cliente,
        cuenta: null,
      }));
    }

    const { data: cuentasData, error: errorCuentas } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .ilike("numero_cuenta", `%${texto}%`);

    if (errorCuentas) {
      alert("Error buscando cuenta: " + errorCuentas.message);
      return;
    }

    if (cuentasData && cuentasData.length > 0) {
      const idsClientes = cuentasData.map((cuenta) => cuenta.cliente_id);

      const { data: clientesDeCuentas, error: errorClientesCuentas } =
        await supabase
          .from("clientes")
          .select("*")
          .eq("empresa_id", empresaId)
          .in("id", idsClientes);

      if (errorClientesCuentas) {
        alert("Error buscando clientes de cuentas: " + errorClientesCuentas.message);
        return;
      }

      cuentasData.forEach((cuenta) => {
        const cliente = clientesDeCuentas?.find(
          (item) => item.id === cuenta.cliente_id
        );

        if (cliente) {
          resultados.push({
            cliente,
            cuenta,
          });
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
      alert("Cliente seleccionado, pero no tiene cuenta comercial.");
      setCuentasCliente([]);
      setCuentaSeleccionada(null);
      return;
    }

    setCuentasCliente(data);
    setCuentaSeleccionada(resultado.cuenta || data[0]);
  }

  async function renovarSuscripcionDesdeCaja(empresaId, cuenta, montoPago) {
    const { data: suscripcion, error } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuenta.id)
      .maybeSingle();

    if (error) {
      alert("Pago registrado, pero error buscando suscripción: " + error.message);
      return;
    }

    if (!suscripcion) {
      alert("Pago registrado, pero no se encontró una suscripción asociada a esta cuenta.");
      return;
    }

    const nuevaFecha = calcularNuevoVencimiento(
      suscripcion.fecha_vencimiento,
      suscripcion.periodicidad
    );

    const precio = Number(suscripcion.precio || cuenta.cuota || montoPago || 0);

    await supabase
      .from("suscripciones")
      .update({
        fecha_vencimiento: nuevaFecha,
        estado: "Activo",
      })
      .eq("id", suscripcion.id)
      .eq("empresa_id", empresaId);

    await supabase
      .from("informacion_comercial")
      .update({
        fecha_vencimiento: nuevaFecha,
        saldo_actual: precio,
        estado: "Activo",
        estado_servicio: "Activo",
        fecha_suspension: null,
        fecha_cancelacion: null,
        motivo_suspension: null,
      })
      .eq("id", cuenta.id)
      .eq("empresa_id", empresaId);

    await supabase
      .from("informacion_cobranza")
      .update({
        estado_cobranza: "Al Día",
        fecha_ultimo_pago: fechaPago,
        monto_ultimo_pago: Number(montoPago),
      })
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuenta.id);
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

    if (requiereCliente && !cuentaSeleccionada) {
      alert("Seleccione una cuenta.");
      return;
    }

    const numeroTransaccion = generarTransaccion();

    const { error } = await supabase.from("caja").insert([
      {
        empresa_id: empresaId,
        numero_transaccion: numeroTransaccion,
        cliente_id: clienteSeleccionado?.id || null,
        informacion_comercial_id: cuentaSeleccionada?.id || null,
        numero_cuenta: cuentaSeleccionada?.numero_cuenta || null,
        fecha_pago: fechaPago,
        tipo: tipoMovimiento,
        descripcion: concepto || observacion || tipoMovimiento,
        monto: Number(monto),
        metodo_pago: metodoPago,
        usuario: responsable || "Caja",
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

    if (requiereCliente && cuentaSeleccionada) {
      const nuevoSaldo =
        Number(cuentaSeleccionada.saldo_actual || 0) - Number(monto);

      const { error: errorSaldo } = await supabase
        .from("informacion_comercial")
        .update({
          saldo_actual: nuevoSaldo < 0 ? 0 : nuevoSaldo,
        })
        .eq("empresa_id", empresaId)
        .eq("id", cuentaSeleccionada.id);

      if (errorSaldo) {
        alert("Movimiento registrado, pero error actualizando saldo: " + errorSaldo.message);
        return;
      }

      const { error: errorCobranza } = await supabase
        .from("informacion_cobranza")
        .update({
          fecha_ultimo_pago: fechaPago,
          monto_ultimo_pago: Number(monto),
        })
        .eq("empresa_id", empresaId)
        .eq("informacion_comercial_id", cuentaSeleccionada.id);

      if (errorCobranza) {
        alert("Movimiento registrado, pero error actualizando cobranza: " + errorCobranza.message);
        return;
      }

      if (tipoMovimiento === "Suscripción" || tipoMovimiento === "Membresía") {
        await renovarSuscripcionDesdeCaja(
          empresaId,
          cuentaSeleccionada,
          const td = {
  padding: "15px",
  borderBottom: "1px solid #f3f4f6",
};
