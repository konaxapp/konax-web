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
      descripcion:
