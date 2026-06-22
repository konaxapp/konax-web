"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [tipoRecargo, setTipoRecargo] = useState("Sin recargo");
  const [estado, setEstado] = useState("Activo");
  const [guardando, setGuardando] = useState(false);

  const categorias = {
    "Ventas a Crédito": [
      "Mueblería",
      "Electrónica",
      "Distribuidora",
      "Cooperativa",
      "Financiera",
      "Casa de Empeño",
    ],
    "Suscripciones y Membresías": [
      "Gimnasio",
      "IPTV",
      "Internet y Cable",
      "Club",
      "Servicio por Membresía",
    ],
    Comercio: [
      "Ferretería",
      "Farmacia",
      "Tienda",
      "Mercado",
      "Repuestos",
      "Boutique",
    ],
    Servicios: [
      "Seguridad",
      "Limpieza",
      "Jardinería",
      "Mantenimiento",
      "Veterinaria",
      "Clínica",
      "Belleza",
      "Consultoría",
    ],
    Educación: [
      "Escuela",
      "Colegio",
      "Academia",
      "Centro de Capacitación",
    ],
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  async function cargarEmpresas() {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando empresas: " + error.message);
      return;
    }

    setEmpresas(data || []);
  }

  function limpiarFormulario() {
    setNombre("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setCategoria("");
    setTipoNegocio("");
    setTipoRecargo("Sin recargo");
    setEstado("Activo");
  }

  async function guardarEmpresa() {
    if (!nombre || !telefono || !categoria || !tipoNegocio) {
      alert("Complete nombre, teléfono, categoría y tipo de negocio.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("empresas").insert([
      {
        nombre,
        telefono,
        correo,
        direccion,
        categoria_negocio: categoria,
        tipo_negocio: tipoNegocio,
        tipo_recargo: tipoRecargo,
        estado,
        configuracion_completa: false,
        estado_plan: "Pendiente",
        plan_codigo: null,
        plan_nombre: null,
        plan_tipo: null,
        plan_precio: 0,
      },
    ]);

    setGuardando(false);

    if (error) {
      alert("Error al guardar empresa: " + error.message);
      return;
    }

    alert("Empresa creada correctamente. Ahora asigna plan, módulos y usuario administrador inicial.");
    limpiarFormulario();
    cargarEmpresas();
  }

  async function cambiarEstadoEmpresa(empresa, nuevoEstado) {
    const { error } = await supabase
      .from("empresas")
      .update({ estado: nuevoEstado })
      .eq("id", empresa.id);

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    cargarEmpresas();
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={header}>
          <div>
            <h1 style={titulo}>Empresas Clientes</h1>
            <p style={subtitulo}>
              Crea empresas clientes para luego asignar plan, módulos y usuario administrador inicial.
            </p>
          </div>

          <a href="/admin" style={botonVolver}>
            Volver al Admin
          </a>
        </div>

        <div style={card}>
          <h2>Nueva Empresa</h2>

          <div style={grid}>
            <div style={campo}>
              <label>Nombre de la Empresa</label>
              <input
                type="text"
                placeholder="Ej. Hot Dog City"
