"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Suscripciones() {
  const [suscripciones, setSuscripciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busquedaMembresia, setBusquedaMembresia] = useState("");
  const [busquedaPagos, setBusquedaPagos] = useState("");

  const [formulario, setFormulario] = useState({
    cedula: "",
    cliente: "",
    telefono: "",
    correo: "",
    plan: "",
    descripcion: "",
    precio: "",
    vendedor: "",
    fechaInicio: "",
    periodicidad: "Mensual",
    formaPago: "Efectivo",
    estado: "Activo",
  });

  useEffect(() => {
    cargarSuscripciones();
    cargarPagos();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      return null;
    }

    return empresaId;
  }

  function generarNumeroCuenta() {
    return "MEM-" + Date.now();
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

  function calcularVencimientoDesde(fechaBase, periodicidad) {
    if (!fechaBase) return "";

    if (periodicidad === "Mensual") return sumarMesesFecha(fechaBase, 1);
    if (periodicidad === "Trimestral") return sumarMesesFecha(fechaBase, 3);
    if (periodicidad === "Semestral") return sumarMesesFecha(fechaBase, 6);
    if (periodicidad === "Anual") return sumarMesesFecha(fechaBase, 12);

    return fechaBase;
  }

  function calcularVencimiento() {
    return calcularVencimientoDesde(
      formulario.fechaInicio,
      formulario.periodicidad
    );
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

  function obtenerEstadoVisual(item) {
    if (item.estado === "Suspendido") return "Suspendido";
    if (item.estado === "Cancelado") return "Cancelado";

    const dias = calcularDiasParaVencer(item.fecha_vencimiento);

    if (dias < 0) return "Vencida";
    if (dias <= 3) return "Por vencer";

    return item.estado || "Activo";
  }

  function limpiarFormulario() {
    setFormulario({
      cedula: "",
      cliente: "",
      telefono: "",
      correo: "",
      plan: "",
      descripcion: "",
      precio: "",
      vendedor: "",
      fechaInicio: "",
      periodicidad: "Mensual",
      formaPago: "Efectivo",
      estado: "Activo",
    });
  }

  function limpiarTelefono(telefono) {
    const limpio = String(telefono || "").replace(/\D/g, "");

    if (!limpio) return "";
    if (limpio.startsWith("507")) return limpio;
    if (limpio.length === 8) return "507" + limpio;

    return limpio;
  }

  function enviarWhatsApp(item) {
    const telefono = limpiarTelefono(item.telefono);

    if (!telefono) {
      alert("Este cliente no tiene teléfono registrado.");
      return;
    }

    const estado = obtenerEstadoVisual(item);

    const mensaje = `Hola ${item.cliente || ""}. Te recordamos que tu membresía ${
      item.plan || ""
    } ${
      estado === "Vencida"
        ? "se encuentra vencida"
        : estado === "Por vencer"
        ? `vence el ${item.fecha_vencimiento}`
        : `está activa hasta el ${item.fecha_vencimiento}`
    }. Para mantener el servicio activo, puedes realizar tu pago. Gracias.`;

    window.open(
      `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
      "_blank"
    );
  }

  function verHistorialCliente(item) {
    const texto = item.cedula || item.cliente || "";
    setBusquedaPagos(texto);

    setTimeout(() => {
      const seccion = document.getElementById("historial-pagos");
      if (seccion) seccion.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }
 const membresiasFiltradas = useMemo(() => {
    const texto = busquedaMembresia.toLowerCase();

    return suscripciones.filter((item) =>
      `${item.cliente || ""} ${item.cedula || ""} ${item.telefono || ""} ${
        item.plan || ""
      } ${item.estado || ""}`
        .toLowerCase()
        .includes(texto)
    );
  }, [suscripciones, busquedaMembresia]);

  const pagosFiltrados = useMemo(() => {
    const texto = busquedaPagos.toLowerCase();

    return pagos.filter((pago) =>
      `${pago.cliente_nombre || ""} ${pago.cliente_cedula || ""} ${
        pago.descripcion || ""
      } ${pago.metodo_pago || ""}`
        .toLowerCase()
        .includes(texto)
    );
  }, [pagos, busquedaPagos]);

  const totalActivas = suscripciones.filter(
    (item) => obtenerEstadoVisual(item) === "Activo"
  ).length;

  const totalPorVencer = suscripciones.filter(
    (item) => obtenerEstadoVisual(item) === "Por vencer"
  ).length;

  const totalVencidas = suscripciones.filter(
    (item) => obtenerEstadoVisual(item) === "Vencida"
  ).length;

  const totalSuspendidas = suscripciones.filter(
    (item) => obtenerEstadoVisual(item) === "Suspendido"
  ).length;

  const ingresosMes = pagos.reduce((total, pago) => {
    const fecha = pago.fecha_pago || pago.created_at;
    if (!fecha) return total;

    const fechaPago = new Date(fecha);
    const hoy = new Date();

    if (
      fechaPago.getMonth() === hoy.getMonth() &&
      fechaPago.getFullYear() === hoy.getFullYear()
    ) {
      return total + Number(pago.monto || 0);
    }

    return total;
  }, 0);

  const proximosVencimientos = suscripciones
    .filter((item) => {
      const dias = calcularDiasParaVencer(item.fecha_vencimiento);
      return dias >= 0 && dias <= 7 && item.estado !== "Suspendido";
    })
    .sort(
      (a, b) =>
        calcularDiasParaVencer(a.fecha_vencimiento) -
        calcularDiasParaVencer(b.fecha_vencimiento)
    );

  const membresiasVencidas = suscripciones
    .filter((item) => obtenerEstadoVisual(item) === "Vencida")
    .sort(
      (a, b) =>
        calcularDiasParaVencer(a.fecha_vencimiento) -
        calcularDiasParaVencer(b.fecha_vencimiento)
    );

  async function cargarSuscripciones() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      alert("Error cargando membresías: " + error.message);
      return;
    }

    setSuscripciones(data || []);
  }

  async function cargarPagos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(50);

    setPagos(data || []);
  }

  async function buscarClienteParaFormulario() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const texto = formulario.cedula.trim();

    if (texto.length < 3) {
      alert("Escriba la cédula o nombre del cliente en el campo de cédula.");
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(`cedula.ilike.%${texto}%,nombre.ilike.%${texto}%`)
      .limit(1);

    if (error) {
      alert("Error buscando cliente: " + error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert("No se encontró cliente. Puede crearlo con el formulario.");
      return;
    }

    const cliente = data[0];

    setFormulario({
      ...formulario,
      cedula: cliente.cedula || "",
      cliente: cliente.nombre || "",
      telefono: cliente.telefono || "",
      correo: cliente.correo || "",
    });
  }

  async function obtenerOCrearCliente(empresaId) {
    const { data: clienteExistente, error: errorBuscar } = await supabase
      .from("clientes")
      .select("*")
      .eq("cedula", formulario.cedula)
      .maybeSingle();

    if (errorBuscar) {
      alert("Error buscando cliente: " + errorBuscar.message);
      return null;
    }

    if (clienteExistente) {
      if (!clienteExistente.empresa_id) {
        const { data, error } = await supabase
          .from("clientes")
          .update({
            empresa_id: empresaId,
            nombre: formulario.cliente || clienteExistente.nombre,
            telefono: formulario.telefono || clienteExistente.telefono,
            correo: formulario.correo || clienteExistente.correo,
            estado: "Activo",
          })
          .eq("id", clienteExistente.id)
          .select()
          .single();

        if (error) {
          alert("Error actualizando cliente: " + error.message);
          return null;
        }

        return data;
      }

      if (String(clienteExistente.empresa_id) !== String(empresaId)) {
        alert("Esta cédula ya existe asociada a otra empresa.");
        return null;
      }

      return clienteExistente;
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert([
        {
          empresa_id: empresaId,
          cedula: formulario.cedula,
          nombre: formulario.cliente,
          telefono: formulario.telefono,
          correo: formulario.correo,
          estado: "Activo",
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Error creando cliente: " + error.message);
      return null;
    }

    return data;
  }
 async function crearSuscripcion() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (
      !formulario.cedula ||
      !formulario.cliente ||
      !formulario.plan ||
      !formulario.precio ||
      !formulario.fechaInicio
    ) {
      alert("Complete cédula, cliente, plan, precio y fecha de inicio.");
      return;
    }

    setCargando(true);

    const clienteCreado = await obtenerOCrearCliente(empresaId);

    if (!clienteCreado) {
      setCargando(false);
      return;
    }

    const numeroCuenta = generarNumeroCuenta();
    const precio = Number(formulario.precio || 0);
    const fechaVencimiento = calcularVencimiento();

    const { data: comercialCreado, error: errorComercial } = await supabase
      .from("informacion_comercial")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteCreado.id,
          numero_cuenta: numeroCuenta,
          tipo_producto: "Membresía",
          descripcion: `${formulario.plan} - ${formulario.descripcion}`,
          modalidad: formulario.periodicidad,
          monto_total: precio,
          saldo_actual: precio,
          cuota: precio,
          fecha_inicio: formulario.fechaInicio,
          fecha_vencimiento: fechaVencimiento,
          responsable: formulario.vendedor || null,
          estado: formulario.estado,
          observacion: formulario.descripcion,
        },
      ])
      .select()
      .single();

    if (errorComercial) {
      setCargando(false);
      alert("Error creando información comercial: " + errorComercial.message);
      return;
    }

    const { error: errorSuscripcion } = await supabase
      .from("suscripciones")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteCreado.id,
          informacion_comercial_id: comercialCreado.id,
          cliente: formulario.cliente,
          cedula: formulario.cedula,
          telefono: formulario.telefono,
          plan: formulario.plan,
          tipo_servicio: "Membresía",
          descripcion: formulario.descripcion,
          precio,
          vendedor: formulario.vendedor,
          forma_pago: formulario.formaPago,
          fecha_inicio: formulario.fechaInicio,
          fecha_vencimiento: fechaVencimiento,
          periodicidad: formulario.periodicidad,
          estado: formulario.estado,
        },
      ]);

    if (errorSuscripcion) {
      setCargando(false);
      alert("Error creando membresía: " + errorSuscripcion.message);
      return;
    }

    await supabase.from("informacion_cobranza").insert([
      {
        empresa_id: empresaId,
        cliente_id: clienteCreado.id,
        informacion_comercial_id: comercialCreado.id,
        estado_cobranza:
          formulario.estado === "Activo" ? "Al Día" : formulario.estado,
        responsable_cobro: formulario.vendedor || null,
      },
