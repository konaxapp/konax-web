"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Suscripciones() {
  const [suscripciones, setSuscripciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);

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

  function convertirFechaLocal(fechaTexto) {
    if (!fechaTexto) return null;
    const [anio, mes, dia] = fechaTexto.split("-").map(Number);
    return new Date(anio, mes - 1, dia);
  }

  function sumarMesesFecha(fechaTexto, meses) {
    if (!fechaTexto) return "";

    const [anio, mes, dia] = fechaTexto.split("-").map(Number);
    const fecha = new Date(anio, mes - 1 + meses, dia);

    const nuevoAnio = fecha.getFullYear();
    const nuevoMes = String(fecha.getMonth() + 1).padStart(2, "0");
    const nuevoDia = String(fecha.getDate()).padStart(2, "0");

    return `${nuevoAnio}-${nuevoMes}-${nuevoDia}`;
  }

  function calcularVencimientoDesde(fechaBase, periodicidad) {
    if (!fechaBase) return "";

    switch (periodicidad) {
      case "Mensual":
        return sumarMesesFecha(fechaBase, 1);
      case "Trimestral":
        return sumarMesesFecha(fechaBase, 3);
      case "Semestral":
        return sumarMesesFecha(fechaBase, 6);
      case "Anual":
        return sumarMesesFecha(fechaBase, 12);
      default:
        return fechaBase;
    }
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

    const vence = convertirFechaLocal(fechaVencimiento);
    if (!vence) return 0;

    vence.setHours(0, 0, 0, 0);

    const diferencia = vence - hoy;
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
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

  useEffect(() => {
    cargarSuscripciones();
    cargarPagos();
  }, []);

  async function cargarSuscripciones() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      alert("Error cargando suscripciones: " + error.message);
      return;
    }

    setSuscripciones(data || []);
  }

  async function cargarPagos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) {
      setPagos(data || []);
    }
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
        const { data: clienteActualizado, error: errorActualizar } =
          await supabase
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

        if (errorActualizar) {
          alert("Error actualizando cliente: " + errorActualizar.message);
          return null;
        }

        return clienteActualizado;
      }

     if (String(clienteExistente.empresa_id) !== String(empresaId)) {
        alert("Esta cédula ya existe asociada a otra empresa.");
        return null;
      }

      return clienteExistente;
                                                      
