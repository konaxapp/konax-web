"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function MovimientosInventario() {
  const router = useRouter();

  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [historial, setHistorial] = useState([]);

  const [productoId, setProductoId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("ENTRADA");
  const [accionNotaCredito, setAccionNotaCredito] = useState("SUMA");

  const [cantidad, setCantidad] = useState("");
  const [precioCompra, setPrecioCompra] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [precioOferta, setPrecioOferta] = useState("");
  const [observacion, setObservacion] = useState("");
  const [fechaMovimiento, setFechaMovimiento] = useState("");

  const [nuevoProveedor, setNuevoProveedor] = useState("");
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false);

  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    stock_minimo: "",
  });

  const productoSeleccionado = productos.find(
    (p) => String(p.id) === String(productoId)
  );

  const totalCompra = Number(cantidad || 0) * Number(precioCompra || 0);

  const porcentajeGanancia =
    Number(precioCompra || 0) > 0 && Number(precioVenta || 0) > 0
      ? (
          ((Number(precioVenta) - Number(precioCompra)) /
            Number(precioCompra)) *
          100
        ).toFixed(2)
      : "0.00";

  useEffect(() => {
    cargarProductos();
    cargarProveedores();
    cargarHistorial();
  }, []);

  useEffect(() => {
    if (productoSeleccionado) {
      setPrecioCompra(productoSeleccionado.precio_compra || "");
      setPrecioVenta(productoSeleccionado.precio_venta || "");
      setPrecioOferta(productoSeleccionado.precio_oferta || "");
    }
  }, [productoId]);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      return null;
    }

    return empresaId;
  }

  async function cargarProductos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nombre");

    if (error) {
      alert("Error cargando productos: " + error.message);
      return;
    }

    setProductos(data || []);
  }

  async function cargarProveedores() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("proveedores")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nombre");

    if (error) {
      alert("Error cargando proveedores: " + error.message);
      return;
    }

    setProveedores(data || []);
  }

  async function cargarHistorial() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("movimientos_inventario")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando historial: " + error.message);
      return;
    }

    setHistorial(data || []);
  }

  async function subirImagen(empresaId, codigoProducto) {
    if (!imagen) return null;

    const extension = imagen.name.split(".").pop();
    const codigoLimpio = codigoProducto.replace(/\s/g, "_").toLowerCase();
    const nombreArchivo = `${empresaId}/${Date.now()}-${codigoLimpio}.${extension}`;

    const { error } = await supabase.storage
      .from("inventario")
      .upload(nombreArchivo, imagen, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("inventario")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function crearProveedorNuevo() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return null;

    if (!nuevoProveedor) {
      alert("Escriba el nombre del proveedor.");
      return null;
    }

    const { data, error } = await supabase
      .from("proveedores")
      .insert([
        {
          empresa_id: empresaId,
          nombre: nuevoProveedor,
          estado: "Activo",
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Error creando proveedor: " + error.message);
      return null;
    }

    return data.id;
  }

  async function crearProductoNuevo(empresaId) {
    if (!nuevoProducto.codigo || !nuevoProducto.nombre) {
      alert("Complete código y nombre del producto nuevo.");
      return null;
    }

    let imagenUrl = null;

    try {
      imagenUrl = await subirImagen(empresaId, nuevoProducto.codigo);
    } catch (error) {
      alert("Error subiendo imagen: " + error.message);
      return null;
    }

    const { data, error } = await supabase
      .from("productos")
      .insert([
        {
          empresa_id: empresaId,
          codigo: nuevoProducto.codigo,
          nombre: nuevoProducto.nombre,
          descripcion: nuevoProducto.descripcion,
          precio_compra: Number(precioCompra || 0),
          precio_venta: Number(precioVenta || 0),
          precio_oferta: Number(precioOferta || 0),
          stock_actual: 0,
          stock_minimo: Number(nuevoProducto.stock_minimo || 0),
          imagen_url: imagenUrl,
          estado: "Activo",
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Error creando producto: " + error.message);
      return null;
    }

    return data
