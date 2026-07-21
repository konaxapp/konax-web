"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function MovimientosInventario() {
  const router = useRouter();

  const [accesoValidado, setAccesoValidado] = useState(false);
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

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mostrarBusquedaHistorial, setMostrarBusquedaHistorial] =
    useState(false);
  const [modoBusquedaHistorial, setModoBusquedaHistorial] =
    useState(false);

  const [nuevoProveedor, setNuevoProveedor] = useState("");
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] =
    useState(false);

  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    stock_minimo: "",
  });

  const productoSeleccionado = useMemo(
    () =>
      productos.find(
        (p) => String(p.id) === String(productoId)
      ),
    [productos, productoId]
  );

  const totalCompra =
    Number(cantidad || 0) * Number(precioCompra || 0);

  const porcentajeGanancia =
    Number(precioCompra || 0) > 0 &&
    Number(precioVenta || 0) > 0
      ? (
          ((Number(precioVenta) -
            Number(precioCompra)) /
            Number(precioCompra)) *
          100
        ).toFixed(2)
      : "0.00";

  useEffect(() => {
    validarAccesoYCargar();
  }, []);

  useEffect(() => {
    if (!productoSeleccionado) return;

    setPrecioCompra(
      productoSeleccionado.precio_compra ?? ""
    );
    setPrecioVenta(
      productoSeleccionado.precio_venta ?? ""
    );
    setPrecioOferta(
      productoSeleccionado.precio_oferta ?? ""
    );
  }, [productoSeleccionado]);

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function esAdministrador(rol) {
    return [
      "administrador",
      "superadmin",
      "admin master",
      "administrador master",
    ].includes(normalizar(rol));
  }

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay una empresa activa.");
      router.replace("/login");
      return null;
    }

    return empresaId;
  }

  function obtenerUsuarioId() {
    const usuarioId = localStorage.getItem("usuarioId");

    if (!usuarioId) {
      alert("No hay un usuario activo.");
      router.replace("/login");
      return null;
    }

    return usuarioId;
  }

  async function validarAccesoYCargar() {
    setAccesoValidado(false);

    const empresaId = obtenerEmpresaId();
    const usuarioId = obtenerUsuarioId();

    if (!empresaId || !usuarioId) return;

    const { data: usuario, error: errorUsuario } =
      await supabase
        .from("usuarios")
        .select("id, empresa_id, rol, estado")
        .eq("id", usuarioId)
        .maybeSingle();

    if (errorUsuario) {
      alert(
        "Error validando usuario: " +
          errorUsuario.message
      );
      return;
    }

    if (
      !usuario ||
      String(usuario.empresa_id) !== String(empresaId) ||
      normalizar(usuario.estado) !== "activo"
    ) {
      alert("La sesión no es válida.");
      router.replace("/login");
      return;
    }

    const { data: empresa, error: errorEmpresa } =
      await supabase
        .from("empresas")
        .select("id, estado, estado_plan")
        .eq("id", empresaId)
        .maybeSingle();

    if (errorEmpresa) {
      alert(
        "Error validando empresa: " +
          errorEmpresa.message
      );
      return;
    }

    if (!empresa) {
      alert("La empresa ya no existe.");
      router.replace("/login");
      return;
    }

    if (
      normalizar(empresa.estado) === "suspendido" ||
      normalizar(empresa.estado_plan) === "suspendido"
    ) {
      alert("El servicio de esta empresa está suspendido.");
      router.replace("/dashboard");
      return;
    }

    const { data: modulos, error: errorModulos } =
      await supabase
        .from("empresa_modulos")
        .select("inventario")
        .eq("empresa_id", empresaId)
        .maybeSingle();

    if (errorModulos) {
      alert(
        "Error validando módulos de inventario: " +
          errorModulos.message
      );
      return;
    }

    if (!modulos?.inventario) {
      alert(
        "El módulo Inventario no está activo para esta empresa."
      );
      router.replace("/dashboard");
      return;
    }

    if (!esAdministrador(usuario.rol)) {
      const { data: permiso, error: errorPermiso } =
        await supabase
          .from("permisos_usuarios_empresa")
          .select("activo")
          .eq("empresa_id", empresaId)
          .eq("usuario_id", usuarioId)
          .eq("permiso", "movimientos_inventario")
          .maybeSingle();

      if (errorPermiso) {
        alert(
          "Error validando permiso de inventario: " +
            errorPermiso.message
        );
        return;
      }

      if (!permiso?.activo) {
        alert(
          "No tienes permiso para registrar movimientos de inventario."
        );
        router.replace("/dashboard");
        return;
      }
    }

    await Promise.all([
      cargarProductos(empresaId),
      cargarProveedores(empresaId),
      cargarHistorialUltimos5(empresaId),
    ]);

    setAccesoValidado(true);
  }

  async function cargarProductos(
    empresaIdRecibido = null
  ) {
    const empresaId =
      empresaIdRecibido || obtenerEmpresaId();

    if (!empresaId) return [];

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nombre");

    if (error) {
      alert(
        "Error cargando productos: " + error.message
      );
      return [];
    }

    const lista = data || [];
    setProductos(lista);
    return lista;
  }

  async function cargarProveedores(
    empresaIdRecibido = null
  ) {
    const empresaId =
      empresaIdRecibido || obtenerEmpresaId();

    if (!empresaId) return [];

    const { data, error } = await supabase
      .from("proveedores")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nombre");

    if (error) {
      alert(
        "Error cargando proveedores: " +
          error.message
      );
      return [];
    }

    const lista = data || [];
    setProveedores(lista);
    return lista;
  }

  async function cargarHistorialUltimos5(
    empresaIdRecibido = null
  ) {
    const empresaId =
      empresaIdRecibido || obtenerEmpresaId();

    if (!empresaId) return;

    const { data, error } = await supabase
      .from("movimientos_inventario")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      alert(
        "Error cargando historial: " + error.message
      );
      return;
    }

    setHistorial(data || []);
    setModoBusquedaHistorial(false);
  }

  async function buscarHistorialPorFechas() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!fechaDesde || !fechaHasta) {
      alert(
        "Seleccione fecha desde y fecha hasta."
      );
      return;
    }

    if (fechaDesde > fechaHasta) {
      alert(
        "La fecha desde no puede ser mayor que la fecha hasta."
      );
      return;
    }

    const desde = new Date(
      `${fechaDesde}T00:00:00`
    );
    const hasta = new Date(
      `${fechaHasta}T23:59:59.999`
    );

    const { data, error } = await supabase
      .from("movimientos_inventario")
      .select("*")
      .eq("empresa_id", empresaId)
      .gte("created_at", desde.toISOString())
      .lte("created_at", hasta.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      alert(
        "Error buscando historial: " +
          error.message
      );
      return;
    }

    setHistorial(data || []);
    setModoBusquedaHistorial(true);
  }

  async function subirImagen(
    empresaId,
    codigoProducto
  ) {
    if (!imagen) return null;

    const extension =
      imagen.name.split(".").pop()?.toLowerCase() ||
      "jpg";

    const codigoLimpio = codigoProducto
      .replace(/\s+/g, "_")
      .toLowerCase();

    const nombreArchivo =
      `${empresaId}/${Date.now()}-` +
      `${codigoLimpio}.${extension}`;

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

  async function crearProveedorNuevo(empresaId) {
    const nombreLimpio = nuevoProveedor.trim();

    if (!nombreLimpio) return proveedorId || null;

    const proveedorDuplicado = proveedores.find(
      (proveedor) =>
        normalizar(proveedor.nombre) ===
        normalizar(nombreLimpio)
    );

    if (proveedorDuplicado) {
      return proveedorDuplicado.id;
    }

    const { data, error } = await supabase
      .from("proveedores")
      .insert([
        {
          empresa_id: empresaId,
          nombre: nombreLimpio,
          estado: "Activo",
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(
        "Error creando proveedor: " +
          error.message
      );
    }

    setNuevoProveedor("");
    setMostrarNuevoProveedor(false);
    setProveedores((actuales) =>
      [...actuales, data].sort((a, b) =>
        String(a.nombre).localeCompare(
          String(b.nombre)
        )
      )
    );

    return data.id;
  }

  async function validarCodigoDuplicado(
    empresaId,
    codigo
  ) {
    const codigoLimpio = codigo.trim();

    const { data, error } = await supabase
      .from("productos")
      .select("id, codigo, nombre")
      .eq("empresa_id", empresaId)
      .ilike("codigo", codigoLimpio)
      .limit(1);

    if (error) {
      throw new Error(
        "Error validando código de producto: " +
          error.message
      );
    }

    return data?.[0] || null;
  }

  async function crearProductoNuevo(empresaId) {
    const codigo = nuevoProducto.codigo.trim();
    const nombre = nuevoProducto.nombre.trim();

    if (!codigo || !nombre) {
      throw new Error(
        "Complete código y nombre del producto nuevo."
      );
    }

    const duplicado =
      await validarCodigoDuplicado(
        empresaId,
        codigo
      );

    if (duplicado) {
      throw new Error(
        `El código ${codigo} ya pertenece al producto ${duplicado.nombre}.`
      );
    }

    const compra = Number(precioCompra || 0);
    const venta = Number(precioVenta || 0);
    const oferta = Number(precioOferta || 0);

    if (compra < 0 || venta < 0 || oferta < 0) {
      throw new Error(
        "Los precios no pueden ser negativos."
      );
    }

    let imagenUrl = null;

    if (imagen) {
      imagenUrl = await subirImagen(
        empresaId,
        codigo
      );
    }

    const { data, error } = await supabase
      .from("productos")
      .insert([
        {
          empresa_id: empresaId,
          codigo,
          nombre,
          descripcion:
            nuevoProducto.descripcion.trim(),
          precio_compra: compra,
          precio_venta: venta,
          precio_oferta: oferta,
          stock_actual: 0,
          stock_minimo: Number(
            nuevoProducto.stock_minimo || 0
          ),
          imagen_url: imagenUrl,
          estado: "Activo",
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(
        "Error creando producto: " + error.message
      );
    }

    setProductos((actuales) =>
      [...actuales, data].sort((a, b) =>
        String(a.nombre).localeCompare(
          String(b.nombre)
        )
      )
    );

    return data;
  }

  function obtenerFechaMovimientoISO() {
    if (!fechaMovimiento) {
      return new Date().toISOString();
    }

    return new Date(
      `${fechaMovimiento}T12:00:00`
    ).toISOString();
  }

  function calcularStockNuevo(
    stockAnterior,
    cantidadMovimiento
  ) {
    if (tipoMovimiento === "ENTRADA") {
      return stockAnterior + cantidadMovimiento;
    }

    if (tipoMovimiento === "SALIDA") {
      return stockAnterior - cantidadMovimiento;
    }

    if (tipoMovimiento === "NOTA_CREDITO") {
      return accionNotaCredito === "SUMA"
        ? stockAnterior + cantidadMovimiento
        : stockAnterior - cantidadMovimiento;
    }

    return stockAnterior;
  }

  async function guardarMovimiento() {
    if (guardando) return;

    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const cantidadMovimiento = Number(
      cantidad || 0
    );

    if (
      !Number.isFinite(cantidadMovimiento) ||
      cantidadMovimiento <= 0
    ) {
      alert("Ingrese una cantidad válida.");
      return;
    }

    const compra = Number(precioCompra || 0);
    const venta = Number(precioVenta || 0);
    const oferta = Number(precioOferta || 0);

    if (
      compra < 0 ||
      venta < 0 ||
      oferta < 0
    ) {
      alert("Los precios no pueden ser negativos.");
      return;
    }

    if (oferta > 0 && oferta >= venta) {
      alert(
        "El precio de oferta debe ser menor que el precio de venta."
      );
      return;
    }

    if (
      tipoMovimiento === "ENTRADA" &&
      compra <= 0
    ) {
      alert(
        "Ingrese el precio de compra para la entrada."
      );
      return;
    }

    setGuardando(true);

    let productoCreado = false;
    let productoFinal = productoSeleccionado;
    let proveedorFinalId = proveedorId || null;

    try {
      if (
        !proveedorFinalId &&
        nuevoProveedor.trim()
      ) {
        proveedorFinalId =
          await crearProveedorNuevo(empresaId);
      }

      if (!productoFinal) {
        productoFinal =
          await crearProductoNuevo(empresaId);
        productoCreado = true;
      }

      if (!productoFinal?.id) {
        throw new Error(
          "No fue posible identificar el producto."
        );
      }

      const stockAnterior = Number(
        productoFinal.stock_actual || 0
      );

      const stockNuevo = calcularStockNuevo(
        stockAnterior,
        cantidadMovimiento
      );

      if (stockNuevo < 0) {
        throw new Error(
          `Stock insuficiente. Disponible: ${stockAnterior}.`
        );
      }

      const fechaFinal =
        obtenerFechaMovimientoISO();

      const usuario =
        localStorage.getItem("usuarioNombre") ||
        "Sistema";

      const tipoMovimientoFinal =
        tipoMovimiento === "NOTA_CREDITO"
          ? `NOTA_CREDITO_${accionNotaCredito}`
          : tipoMovimiento;

      const observacionFinal =
        tipoMovimiento === "NOTA_CREDITO"
          ? `${observacion.trim()}${
              observacion.trim() ? " | " : ""
            }Nota de crédito: ${
              accionNotaCredito === "SUMA"
                ? "suma stock"
                : "resta stock"
            }`
          : observacion.trim();

      const totalCompraMovimiento =
        tipoMovimiento === "ENTRADA" ||
        (tipoMovimiento === "NOTA_CREDITO" &&
          accionNotaCredito === "SUMA")
          ? cantidadMovimiento * compra
          : 0;

      const movimiento = {
        empresa_id: empresaId,
        producto_id: productoFinal.id,
        proveedor_id: proveedorFinalId,
        tipo_movimiento: tipoMovimientoFinal,
        cantidad: cantidadMovimiento,
        precio_compra: compra,
        numero_factura:
          numeroFactura.trim() || null,
        total_compra: totalCompraMovimiento,
        precio_venta: venta,
        precio_oferta: oferta,
        porcentaje_ganancia: Number(
          porcentajeGanancia || 0
        ),
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        observacion: observacionFinal,
        usuario,
        created_at: fechaFinal,
      };

      const actualizacionProducto = {
        stock_actual: stockNuevo,
        ultimo_movimiento_usuario: usuario,
        ultimo_movimiento_fecha: fechaFinal,
      };

      const debeActualizarPrecios =
        productoCreado ||
        tipoMovimiento === "ENTRADA" ||
        (tipoMovimiento === "NOTA_CREDITO" &&
          accionNotaCredito === "SUMA");

      if (debeActualizarPrecios) {
        actualizacionProducto.precio_compra =
          compra;
        actualizacionProducto.precio_venta =
          venta;
        actualizacionProducto.precio_oferta =
          oferta;
      }

      const { error: errorProducto } =
        await supabase
          .from("productos")
          .update(actualizacionProducto)
          .eq("id", productoFinal.id)
          .eq("empresa_id", empresaId);

      if (errorProducto) {
        throw new Error(
          "Error actualizando producto: " +
            errorProducto.message
        );
      }

      const { error: errorMovimiento } =
        await supabase
          .from("movimientos_inventario")
          .insert([movimiento]);

      if (errorMovimiento) {
        const restauracion = {
          stock_actual: stockAnterior,
        };

        if (debeActualizarPrecios) {
          restauracion.precio_compra = Number(
            productoFinal.precio_compra || 0
          );
          restauracion.precio_venta = Number(
            productoFinal.precio_venta || 0
          );
          restauracion.precio_oferta = Number(
            productoFinal.precio_oferta || 0
          );
        }

        await supabase
          .from("productos")
          .update(restauracion)
          .eq("id", productoFinal.id)
          .eq("empresa_id", empresaId);

        throw new Error(
          "Error guardando movimiento: " +
            errorMovimiento.message
        );
      }

      alert(
        "Movimiento de inventario guardado correctamente."
      );

      router.push("/inventario");
    } catch (error) {
      alert(
        error.message ||
          "Ocurrió un error guardando el movimiento."
      );
    } finally {
      setGuardando(false);
    }
  }

  function nombreProducto(productoIdMovimiento) {
    const producto = productos.find(
      (p) =>
        String(p.id) ===
        String(productoIdMovimiento)
    );

    return producto
      ? `${producto.codigo} - ${producto.nombre}`
      : "Producto no disponible";
  }

  function nombreProveedor(
    proveedorIdMovimiento
  ) {
    if (!proveedorIdMovimiento) return "-";

    const proveedor = proveedores.find(
      (p) =>
        String(p.id) ===
        String(proveedorIdMovimiento)
    );

    return proveedor?.nombre || "Proveedor no disponible";
  }

  if (!accesoValidado) {
    return (
      <div style={cargandoPagina}>
        <div style={cargandoCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={cargandoLogo}
          />
          <strong>Validando inventario</strong>
          <span style={cargandoTexto}>
            Verificando empresa, módulos y permisos.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={pagina}>
      <div style={encabezado}>
        <div>
          <span style={etiqueta}>
            INVENTARIO Y PRODUCTOS
          </span>
          <h1 style={titulo}>
            Movimientos de Inventario
          </h1>
          <p style={subtitulo}>
            Registra entradas, salidas, devoluciones y
            ajustes de productos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/inventario")}
          style={botonVolver}
        >
          Volver a Inventario
        </button>
      </div>

      <div style={card}>
        <h2>1. Producto</h2>

        <label>Seleccionar producto existente</label>
        <select
          value={productoId}
          onChange={(e) =>
            setProductoId(e.target.value)
          }
          style={input}
        >
          <option value="">
            Crear producto nuevo / seleccionar producto
          </option>

          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} - {p.nombre}
            </option>
          ))}
        </select>

        {!productoId && (
          <>
            <label>Código del producto *</label>
            <input
              value={nuevoProducto.codigo}
              onChange={(e) =>
                setNuevoProducto({
                  ...nuevoProducto,
                  codigo: e.target.value,
                })
              }
              style={input}
            />

            <label>Nombre del producto *</label>
            <input
              value={nuevoProducto.nombre}
              onChange={(e) =>
                setNuevoProducto({
                  ...nuevoProducto,
                  nombre: e.target.value,
                })
              }
              style={input}
            />

            <label>Descripción</label>
            <textarea
              value={nuevoProducto.descripcion}
              onChange={(e) =>
                setNuevoProducto({
                  ...nuevoProducto,
                  descripcion: e.target.value,
                })
              }
              style={textarea}
            />

            <label>
              Cantidad inicial / entrada
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={cantidad}
              onChange={(e) =>
                setCantidad(e.target.value)
              }
              style={input}
            />

            <label>
              Stock mínimo para alerta
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={nuevoProducto.stock_minimo}
              onChange={(e) =>
                setNuevoProducto({
                  ...nuevoProducto,
                  stock_minimo: e.target.value,
                })
              }
              style={input}
            />

            <label>Foto del producto</label>
            <div style={fotoBox}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setImagen(
                    e.target.files?.[0] || null
                  )
                }
              />

              {imagen && (
                <p style={archivoSeleccionado}>
                  Imagen seleccionada: {imagen.name}
                </p>
              )}
            </div>
          </>
        )}

        {productoSeleccionado && (
          <div style={stockBox}>
            <p>
              <strong>Código:</strong>{" "}
              {productoSeleccionado.codigo}
            </p>
            <p>
              <strong>Nombre:</strong>{" "}
              {productoSeleccionado.nombre}
            </p>
            <p>
              <strong>Descripción:</strong>{" "}
              {productoSeleccionado.descripcion || "-"}
            </p>
            <p>
              <strong>Stock actual:</strong>{" "}
              {productoSeleccionado.stock_actual}
            </p>
            <p>
              <strong>Stock mínimo:</strong>{" "}
              {productoSeleccionado.stock_minimo || 0}
            </p>
          </div>
        )}

        <h2>2. Proveedor</h2>

        <label>Proveedor</label>
        <select
          value={proveedorId}
          onChange={(e) =>
            setProveedorId(e.target.value)
          }
          style={input}
        >
          <option value="">
            Sin proveedor / seleccione proveedor
          </option>

          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() =>
            setMostrarNuevoProveedor(
              !mostrarNuevoProveedor
            )
          }
          style={botonSecundario}
        >
          Crear proveedor nuevo
        </button>

        {mostrarNuevoProveedor && (
          <>
            <label>
              Nombre del nuevo proveedor
            </label>
            <input
              value={nuevoProveedor}
              onChange={(e) =>
                setNuevoProveedor(e.target.value)
              }
              style={input}
            />
          </>
        )}

        <h2>3. Movimiento</h2>

        <label>Tipo de movimiento</label>
        <select
          value={tipoMovimiento}
          onChange={(e) =>
            setTipoMovimiento(e.target.value)
          }
          style={input}
        >
          <option value="ENTRADA">
            Entrada de mercancía
          </option>
          <option value="SALIDA">
            Salida manual / ajuste
          </option>
          <option value="NOTA_CREDITO">
            Nota de crédito / devolución
          </option>
        </select>

        {tipoMovimiento === "NOTA_CREDITO" && (
          <>
            <label>
              Acción de la nota de crédito
            </label>
            <select
              value={accionNotaCredito}
              onChange={(e) =>
                setAccionNotaCredito(e.target.value)
              }
              style={input}
            >
              <option value="SUMA">
                Producto devuelto al inventario
              </option>
              <option value="RESTA">
                Producto devuelto al proveedor
              </option>
            </select>
          </>
        )}

        <label>Cantidad *</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={cantidad}
          onChange={(e) =>
            setCantidad(e.target.value)
          }
          style={input}
        />

        <label>Número de factura</label>
        <input
          value={numeroFactura}
          onChange={(e) =>
            setNumeroFactura(e.target.value)
          }
          style={input}
        />

        <label>Precio de compra</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={precioCompra}
          onChange={(e) =>
            setPrecioCompra(e.target.value)
          }
          style={input}
          disabled={tipoMovimiento === "SALIDA"}
        />

        <label>Total de compra</label>
        <input
          value={`$${(
            tipoMovimiento === "SALIDA"
              ? 0
              : totalCompra
          ).toFixed(2)}`}
          disabled
          style={input}
        />

        <h2>4. Precio de venta</h2>

        <label>Precio de venta</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={precioVenta}
          onChange={(e) =>
            setPrecioVenta(e.target.value)
          }
          style={input}
          disabled={tipoMovimiento === "SALIDA"}
        />

        <label>
          Porcentaje de ganancia
        </label>
        <input
          value={`${porcentajeGanancia}%`}
          disabled
          style={input}
        />

        <label>Precio de oferta</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={precioOferta}
          onChange={(e) =>
            setPrecioOferta(e.target.value)
          }
          style={input}
          disabled={tipoMovimiento === "SALIDA"}
        />

        {Number(precioOferta || 0) > 0 &&
          Number(precioOferta || 0) >=
            Number(precioVenta || 0) && (
            <p style={mensajeError}>
              El precio de oferta debe ser menor
              que el precio de venta.
            </p>
          )}

        <label>Observación</label>
        <textarea
          value={observacion}
          onChange={(e) =>
            setObservacion(e.target.value)
          }
          style={textarea}
          placeholder="Ejemplo: compra de bebidas, ajuste por producto dañado o devolución."
        />

        <label>Fecha del movimiento</label>
        <input
          type="date"
          value={fechaMovimiento}
          onChange={(e) =>
            setFechaMovimiento(e.target.value)
          }
          style={input}
        />

        <button
          type="button"
          onClick={guardarMovimiento}
          disabled={guardando}
          style={{
            ...botonGuardar,
            background: guardando
              ? "#9ca3af"
              : "#16834f",
            cursor: guardando
              ? "not-allowed"
              : "pointer",
          }}
        >
          {guardando
            ? "Guardando movimiento..."
            : "Guardar movimiento"}
        </button>
      </div>

      <h2>
        {modoBusquedaHistorial
          ? "Historial por rango"
          : "Últimos 5 movimientos"}
      </h2>

      <button
        type="button"
        onClick={() =>
          setMostrarBusquedaHistorial(
            !mostrarBusquedaHistorial
          )
        }
        style={botonSecundario}
      >
        Buscar historial por fechas
      </button>

      {mostrarBusquedaHistorial && (
        <div style={cardFiltro}>
          <label>Fecha desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) =>
              setFechaDesde(e.target.value)
            }
            style={input}
          />

          <label>Fecha hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) =>
              setFechaHasta(e.target.value)
            }
            style={input}
          />

          <button
            type="button"
            onClick={buscarHistorialPorFechas}
            style={botonBuscar}
          >
            Buscar
          </button>

          <button
            type="button"
            onClick={() =>
              cargarHistorialUltimos5()
            }
            style={botonLimpiar}
          >
            Ver últimos 5
          </button>
        </div>
      )}

      <div style={tablaContenedor}>
        <table style={tabla}>
          <thead>
            <tr>
              <th style={th}>Producto</th>
              <th style={th}>Proveedor</th>
              <th style={th}>Tipo</th>
              <th style={th}>Cantidad</th>
              <th style={th}>Compra</th>
              <th style={th}>Factura</th>
              <th style={th}>Total</th>
              <th style={th}>Venta</th>
              <th style={th}>Oferta</th>
              <th style={th}>Ganancia</th>
              <th style={th}>Antes</th>
              <th style={th}>Después</th>
              <th style={th}>Usuario</th>
              <th style={th}>Fecha</th>
            </tr>
          </thead>

          <tbody>
            {historial.length === 0 ? (
              <tr>
                <td style={td} colSpan="14">
                  No hay movimientos registrados.
                </td>
              </tr>
            ) : (
              historial.map((m) => (
                <tr key={m.id}>
                  <td style={td}>
                    {nombreProducto(m.producto_id)}
                  </td>
                  <td style={td}>
                    {nombreProveedor(m.proveedor_id)}
                  </td>
                  <td style={td}>
                    {m.tipo_movimiento}
                  </td>
                  <td style={td}>{m.cantidad}</td>
                  <td style={td}>
                    $
                    {Number(
                      m.precio_compra || 0
                    ).toFixed(2)}
                  </td>
                  <td style={td}>
                    {m.numero_factura || "-"}
                  </td>
                  <td style={td}>
                    $
                    {Number(
                      m.total_compra || 0
                    ).toFixed(2)}
                  </td>
                  <td style={td}>
                    $
                    {Number(
                      m.precio_venta || 0
                    ).toFixed(2)}
                  </td>
                  <td style={td}>
                    $
                    {Number(
                      m.precio_oferta || 0
                    ).toFixed(2)}
                  </td>
                  <td style={td}>
                    {m.porcentaje_ganancia || 0}%
                  </td>
                  <td style={td}>
                    {m.stock_anterior}
                  </td>
                  <td style={td}>
                    {m.stock_nuevo}
                  </td>
                  <td style={td}>
                    {m.usuario}
                  </td>
                  <td style={td}>
                    {m.created_at
                      ? new Date(
                          m.created_at
                        ).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const pagina = {
  maxWidth: "1250px",
  margin: "30px auto",
  padding: "20px",
  fontFamily:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const encabezado = {
  marginBottom: 24,
  padding: "26px 28px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
  borderRadius: 22,
  background:
    "linear-gradient(135deg, #09120d, #17673e)",
  color: "#fff",
};

const etiqueta = {
  display: "block",
  marginBottom: 6,
  color: "#79dca6",
  fontSize: 11,
  fontWeight: 900,
};

const titulo = {
  margin: "0 0 8px",
  fontSize: 36,
};

const subtitulo = {
  margin: 0,
  color: "#d2e7da",
};

const botonVolver = {
  padding: "11px 16px",
  border: "1px solid rgba(255,255,255,.22)",
  borderRadius: 10,
  background: "rgba(255,255,255,.10)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const card = {
  background: "#fff",
  padding: "25px",
  borderRadius: "14px",
  marginBottom: "30px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
};

const cardFiltro = {
  background: "#fff",
  padding: "18px",
  borderRadius: "12px",
  marginBottom: "20px",
  boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
};

const input = {
  width: "100%",
  padding: "11px",
  marginBottom: "15px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const textarea = {
  ...input,
  height: "80px",
};

const fotoBox = {
  border: "2px dashed #d1d5db",
  borderRadius: "12px",
  padding: "20px",
  textAlign: "center",
  marginBottom: "15px",
  background: "#f9fafb",
};

const archivoSeleccionado = {
  marginTop: 10,
  color: "#16a34a",
  fontWeight: "bold",
};

const stockBox = {
  background: "#f3f4f6",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "15px",
};

const botonSecundario = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "10px 15px",
  borderRadius: "8px",
  cursor: "pointer",
  marginBottom: "15px",
};

const botonBuscar = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "11px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
  marginRight: "10px",
};

const botonLimpiar = {
  background: "#6b7280",
  color: "#fff",
  border: "none",
  padding: "11px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botonGuardar = {
  width: "100%",
  color: "#fff",
  border: "none",
  padding: "16px",
  borderRadius: "12px",
  fontSize: "17px",
  fontWeight: "bold",
};

const mensajeError = {
  color: "#dc2626",
  fontWeight: "bold",
};

const tablaContenedor = {
  width: "100%",
  overflowX: "auto",
  background: "#fff",
  borderRadius: 12,
};

const tabla = {
  width: "100%",
  minWidth: "1450px",
  borderCollapse: "collapse",
  fontSize: "14px",
  background: "#fff",
};

const th = {
  borderBottom: "1px solid #ddd",
  padding: "10px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const td = {
  borderBottom: "1px solid #eee",
  padding: "10px",
  whiteSpace: "nowrap",
};

const cargandoPagina = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#f3f6f4",
};

const cargandoCard = {
  padding: 30,
  display: "grid",
  justifyItems: "center",
  gap: 10,
  borderRadius: 20,
  background: "#fff",
};

const cargandoLogo = {
  width: 220,
  maxWidth: "100%",
};

const cargandoTexto = {
  color: "#6b7280",
  fontSize: 13,
};
