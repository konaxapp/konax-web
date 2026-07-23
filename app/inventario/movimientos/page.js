"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

function fechaPanama() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function numero(valor) {
  return Number(valor || 0);
}

export default function MovimientosInventario() {
  const router = useRouter();

  const [empresaNombre, setEmpresaNombre] = useState("");
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  const [modo, setModo] = useState("crear_producto");

  const [formProducto, setFormProducto] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria: "",
    proveedor: "",
    precio_compra: "",
    precio_venta: "",
    precio_credito: "",
    stock_inicial: "",
    stock_minimo: "",
    numero_factura: "",
    fecha_compra: fechaPanama(),
    condicion_compra: "Contado",
    total_factura: "",
    fecha_vencimiento_pago: "",
    observacion_compra: "",
  });

  const [imagen, setImagen] = useState(null);

  const [productoId, setProductoId] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaMovimiento, setFechaMovimiento] = useState(fechaPanama());
  const [condicionCompra, setCondicionCompra] = useState("Contado");
  const [totalFactura, setTotalFactura] = useState("");
  const [fechaVencimientoPago, setFechaVencimientoPago] = useState("");
  const [observacion, setObservacion] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    iniciar();
  }, []);

  function obtenerEmpresaId() {
    const empresaId =
      localStorage.getItem("empresaId") ||
      localStorage.getItem("empresaAdminCreadaId");

    if (!empresaId) {
      alert("No hay empresa activa. Inicie sesión nuevamente.");
      router.replace("/login");
      return null;
    }

    return empresaId;
  }

  async function iniciar() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    setEmpresaNombre(
      localStorage.getItem("empresaNombre") ||
        localStorage.getItem("empresaAdminCreadaNombre") ||
        "Empresa"
    );

    setCargando(true);

    await Promise.all([
      cargarProductos(empresaId),
      cargarMovimientos(empresaId),
    ]);

    setCargando(false);
  }

  async function cargarProductos(empresaId = obtenerEmpresaId()) {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando productos: " + error.message);
      return;
    }

    setProductos(data || []);
  }

  /*
    Se usa created_at porque la tabla movimientos_inventario
    no tiene la columna fecha_compra.
  */
  async function cargarMovimientos(empresaId = obtenerEmpresaId()) {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("movimientos_inventario")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      alert("Error cargando movimientos: " + error.message);
      return;
    }

    setMovimientos(data || []);
  }

  function actualizarProducto(campo, valor) {
    setFormProducto((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  async function subirImagen(empresaId) {
    if (!imagen) return null;

    const nombreArchivo =
      `${empresaId}/${Date.now()}-` +
      imagen.name.replace(/\s/g, "_");

    const { error } = await supabase.storage
      .from("inventario")
      .upload(nombreArchivo, imagen);

    if (error) throw error;

    const { data } = supabase.storage
      .from("inventario")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function guardarProductoNuevo() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId || guardando) return;

    if (!formProducto.codigo.trim() || !formProducto.nombre.trim()) {
      alert("Complete código y nombre del producto.");
      return;
    }

    if (!formProducto.numero_factura.trim()) {
      alert("Ingrese el número de factura u orden de compra.");
      return;
    }

    const stockInicial = numero(formProducto.stock_inicial);

    if (stockInicial < 0) {
      alert("El stock inicial no puede ser negativo.");
      return;
    }

    setGuardando(true);

    try {
      let imagenUrl = null;

      if (imagen) {
        imagenUrl = await subirImagen(empresaId);
      }

      const { data: producto, error: errorProducto } = await supabase
        .from("productos")
        .insert([
          {
            empresa_id: empresaId,
            codigo: formProducto.codigo.trim(),
            nombre: formProducto.nombre.trim(),
            descripcion: formProducto.descripcion.trim(),
            categoria: formProducto.categoria.trim(),
            proveedor: formProducto.proveedor.trim(),
            precio_compra: numero(formProducto.precio_compra),
            precio_venta: numero(formProducto.precio_venta),
            precio_credito: numero(formProducto.precio_credito),
            stock_actual: stockInicial,
            stock_minimo: numero(formProducto.stock_minimo),
            imagen_url: imagenUrl,
          },
        ])
        .select()
        .single();

      if (errorProducto) {
        throw new Error(
          "Error guardando producto: " + errorProducto.message
        );
      }

      const usuario =
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("adminKonaxNombre") ||
        "Sistema";

      /*
        Los datos de compra se guardan dentro de observacion
        porque la tabla actual no tiene fecha_compra ni otras
        columnas comerciales adicionales.
      */
      const detalleCompra = [
        `Stock inicial`,
        `Factura/Orden: ${formProducto.numero_factura || "-"}`,
        `Fecha: ${formProducto.fecha_compra || "-"}`,
        `Condición: ${formProducto.condicion_compra || "-"}`,
        `Total: $${numero(formProducto.total_factura).toFixed(2)}`,
        `Vencimiento: ${formProducto.fecha_vencimiento_pago || "-"}`,
        formProducto.observacion_compra
          ? `Observación: ${formProducto.observacion_compra}`
          : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const { error: errorMovimiento } = await supabase
        .from("movimientos_inventario")
        .insert([
          {
            empresa_id: empresaId,
            producto_id: producto.id,
            tipo_movimiento: "ENTRADA",
            cantidad: stockInicial,
            stock_anterior: 0,
            stock_nuevo: stockInicial,
            observacion: detalleCompra,
            usuario,
          },
        ]);

      if (errorMovimiento) {
        await supabase
          .from("productos")
          .delete()
          .eq("empresa_id", empresaId)
          .eq("id", producto.id);

        throw new Error(
          "No se pudo registrar la entrada inicial: " +
            errorMovimiento.message
        );
      }

      alert("Producto y entrada inicial registrados correctamente.");

      limpiarProducto();

      await Promise.all([
        cargarProductos(empresaId),
        cargarMovimientos(empresaId),
      ]);
    } catch (error) {
      alert(error.message || "No se pudo guardar el producto.");
    } finally {
      setGuardando(false);
    }
  }

  const productoSeleccionado = useMemo(
    () =>
      productos.find(
        (producto) => String(producto.id) === String(productoId)
      ) || null,
    [productos, productoId]
  );

  const stockActual = numero(productoSeleccionado?.stock_actual);
  const cantidadMovimiento = numero(cantidad);

  function esSalida() {
    return ["SALIDA", "AJUSTE_SALIDA"].includes(tipoMovimiento);
  }

  function esEntrada() {
    return [
      "ENTRADA",
      "AJUSTE_ENTRADA",
      "DEVOLUCION",
      "NOTA_CREDITO",
    ].includes(tipoMovimiento);
  }

  const stockNuevo = useMemo(() => {
    if (!productoSeleccionado || cantidadMovimiento <= 0) {
      return stockActual;
    }

    if (esSalida()) {
      return Math.max(stockActual - cantidadMovimiento, 0);
    }

    if (esEntrada()) {
      return stockActual + cantidadMovimiento;
    }

    return stockActual;
  }, [
    productoSeleccionado,
    cantidadMovimiento,
    tipoMovimiento,
    stockActual,
  ]);

  async function guardarMovimientoExistente() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId || guardando) return;

    if (!productoSeleccionado?.id) {
      alert("Seleccione un producto.");
      return;
    }

    if (!cantidad || cantidadMovimiento <= 0) {
      alert("Ingrese una cantidad válida.");
      return;
    }

    if (esSalida() && cantidadMovimiento > stockActual) {
      alert(`Stock insuficiente. Disponible: ${stockActual}.`);
      return;
    }

    setGuardando(true);

    try {
      const { error: errorStock } = await supabase
        .from("productos")
        .update({ stock_actual: stockNuevo })
        .eq("empresa_id", empresaId)
        .eq("id", productoSeleccionado.id);

      if (errorStock) {
        throw new Error(
          "No se pudo actualizar el stock: " + errorStock.message
        );
      }

      const usuario =
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("adminKonaxNombre") ||
        "Sistema";

      const detalleMovimiento = [
        observacion || tipoMovimiento,
        `Documento: ${numeroFactura || "-"}`,
        `Fecha: ${fechaMovimiento || "-"}`,
        `Condición: ${condicionCompra || "-"}`,
        `Total: $${numero(totalFactura).toFixed(2)}`,
        `Vencimiento: ${fechaVencimientoPago || "-"}`,
      ].join(" | ");

      const { error: errorMovimiento } = await supabase
        .from("movimientos_inventario")
        .insert([
          {
            empresa_id: empresaId,
            producto_id: productoSeleccionado.id,
            tipo_movimiento: tipoMovimiento,
            cantidad: cantidadMovimiento,
            stock_anterior: stockActual,
            stock_nuevo: stockNuevo,
            observacion: detalleMovimiento,
            usuario,
          },
        ]);

      if (errorMovimiento) {
        await supabase
          .from("productos")
          .update({ stock_actual: stockActual })
          .eq("empresa_id", empresaId)
          .eq("id", productoSeleccionado.id);

        throw new Error(
          "No se pudo registrar el movimiento: " +
            errorMovimiento.message
        );
      }

      alert("Movimiento de inventario registrado correctamente.");

      limpiarMovimiento();

      await Promise.all([
        cargarProductos(empresaId),
        cargarMovimientos(empresaId),
      ]);
    } catch (error) {
      alert(error.message || "No se pudo guardar el movimiento.");
    } finally {
      setGuardando(false);
    }
  }

  function limpiarProducto() {
    setFormProducto({
      codigo: "",
      nombre: "",
      descripcion: "",
      categoria: "",
      proveedor: "",
      precio_compra: "",
      precio_venta: "",
      precio_credito: "",
      stock_inicial: "",
      stock_minimo: "",
      numero_factura: "",
      fecha_compra: fechaPanama(),
      condicion_compra: "Contado",
      total_factura: "",
      fecha_vencimiento_pago: "",
      observacion_compra: "",
    });

    setImagen(null);
  }

  function limpiarMovimiento() {
    setProductoId("");
    setTipoMovimiento("ENTRADA");
    setCantidad("");
    setNumeroFactura("");
    setFechaMovimiento(fechaPanama());
    setCondicionCompra("Contado");
    setTotalFactura("");
    setFechaVencimientoPago("");
    setObservacion("");
  }

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return productos;

    return productos.filter((producto) =>
      [
        producto.codigo,
        producto.nombre,
        producto.categoria,
        producto.proveedor,
      ]
        .filter(Boolean)
        .some((valor) =>
          String(valor).toLowerCase().includes(texto)
        )
    );
  }, [productos, busqueda]);

  if (cargando) {
    return (
      <div style={s.loading}>
        <img src="/konax-logo.png" alt="KONAX" style={s.loadingLogo} />
        <strong>Preparando inventario</strong>
      </div>
    );
  }

  return (
    <main style={s.pagina}>
      <div style={s.contenedor}>
        <header style={s.hero}>
          <div style={s.heroInfo}>
            <div style={s.logoBox}>
              <img src="/konax-logo.png" alt="KONAX" style={s.logo} />
            </div>

            <div>
              <span style={s.etiqueta}>CONTROL DE EXISTENCIAS</span>
              <h1 style={s.titulo}>Movimientos de Inventario</h1>
              <p style={s.subtitulo}>
                Crea productos y registra entradas, salidas y ajustes.
              </p>
            </div>
          </div>

          <button onClick={() => router.push("/inventario")} style={s.botonVolver}>
            ← Volver a Inventario
          </button>
        </header>

        <div style={s.tabs}>
          <button
            onClick={() => setModo("crear_producto")}
            style={{
              ...s.tab,
              ...(modo === "crear_producto" ? s.tabActivo : {}),
            }}
          >
            ➕ Crear producto
          </button>

          <button
            onClick={() => setModo("movimiento")}
            style={{
              ...s.tab,
              ...(modo === "movimiento" ? s.tabActivo : {}),
            }}
          >
            🔄 Registrar movimiento
          </button>
        </div>

        {modo === "crear_producto" ? (
          <article style={s.card}>
            <Cabecera
              titulo="Nuevo producto"
              texto="Registra el producto y su entrada inicial al inventario."
              numero="01"
            />

            <div style={s.grid}>
              <Campo label="Código *">
                <input
                  value={formProducto.codigo}
                  onChange={(e) =>
                    actualizarProducto("codigo", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Nombre del producto *">
                <input
                  value={formProducto.nombre}
                  onChange={(e) =>
                    actualizarProducto("nombre", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Categoría">
                <input
                  value={formProducto.categoria}
                  onChange={(e) =>
                    actualizarProducto("categoria", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Proveedor">
                <input
                  value={formProducto.proveedor}
                  onChange={(e) =>
                    actualizarProducto("proveedor", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Precio compra">
                <input
                  type="number"
                  value={formProducto.precio_compra}
                  onChange={(e) =>
                    actualizarProducto("precio_compra", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Precio venta">
                <input
                  type="number"
                  value={formProducto.precio_venta}
                  onChange={(e) =>
                    actualizarProducto("precio_venta", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Precio crédito">
                <input
                  type="number"
                  value={formProducto.precio_credito}
                  onChange={(e) =>
                    actualizarProducto("precio_credito", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Stock inicial">
                <input
                  type="number"
                  value={formProducto.stock_inicial}
                  onChange={(e) =>
                    actualizarProducto("stock_inicial", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Stock mínimo">
                <input
                  type="number"
                  value={formProducto.stock_minimo}
                  onChange={(e) =>
                    actualizarProducto("stock_minimo", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Factura / Orden *">
                <input
                  value={formProducto.numero_factura}
                  onChange={(e) =>
                    actualizarProducto("numero_factura", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Fecha de compra">
                <input
                  type="date"
                  value={formProducto.fecha_compra}
                  onChange={(e) =>
                    actualizarProducto("fecha_compra", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Condición">
                <select
                  value={formProducto.condicion_compra}
                  onChange={(e) =>
                    actualizarProducto("condicion_compra", e.target.value)
                  }
                  style={s.input}
                >
                  <option>Contado</option>
                  <option>Crédito 30 días</option>
                  <option>Crédito 60 días</option>
                  <option>Consignación</option>
                </select>
              </Campo>

              <Campo label="Total factura">
                <input
                  type="number"
                  value={formProducto.total_factura}
                  onChange={(e) =>
                    actualizarProducto("total_factura", e.target.value)
                  }
                  style={s.input}
                />
              </Campo>

              <Campo label="Fecha vencimiento">
                <input
                  type="date"
                  value={formProducto.fecha_vencimiento_pago}
                  onChange={(e) =>
                    actualizarProducto(
                      "fecha_vencimiento_pago",
                      e.target.value
                    )
                  }
                  style={s.input}
                />
              </Campo>
            </div>

            <div style={s.gridInferior}>
              <Campo label="Descripción">
                <textarea
                  value={formProducto.descripcion}
                  onChange={(e) =>
                    actualizarProducto("descripcion", e.target.value)
                  }
                  style={s.textarea}
                />
              </Campo>

              <Campo label="Foto del producto">
                <div style={s.uploadBox}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setImagen(e.target.files?.[0] || null)
                    }
                  />
                  <span style={s.textoArchivo}>
                    {imagen
                      ? imagen.name
                      : "Seleccione una imagen"}
                  </span>
                </div>
              </Campo>
            </div>

            <Campo label="Observación de compra">
              <textarea
                value={formProducto.observacion_compra}
                onChange={(e) =>
                  actualizarProducto(
                    "observacion_compra",
                    e.target.value
                  )
                }
                style={s.textarea}
              />
            </Campo>

            <div style={s.acciones}>
              <button
                onClick={guardarProductoNuevo}
                disabled={guardando}
                style={s.botonPrincipal}
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar producto y entrada"}
              </button>

              <button
                onClick={limpiarProducto}
                disabled={guardando}
                style={s.botonSecundario}
              >
                Limpiar
              </button>
            </div>
          </article>
        ) : (
          <article style={s.card}>
            <Cabecera
              titulo="Movimiento de producto existente"
              texto="Aumenta, disminuye o corrige el stock de un producto."
              numero="02"
            />

            <div style={s.grid}>
              <Campo label="Buscar producto">
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={s.input}
                />
              </Campo>

              <Campo label="Producto">
                <select
                  value={productoId}
                  onChange={(e) => setProductoId(e.target.value)}
                  style={s.input}
                >
                  <option value="">Seleccione producto</option>

                  {productosFiltrados.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.codigo} - {producto.nombre} - Stock{" "}
                      {numero(producto.stock_actual)}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Tipo de movimiento">
                <select
                  value={tipoMovimiento}
                  onChange={(e) => setTipoMovimiento(e.target.value)}
                  style={s.input}
                >
                  <option value="ENTRADA">Entrada</option>
                  <option value="SALIDA">Salida manual</option>
                  <option value="AJUSTE_ENTRADA">Ajuste positivo</option>
                  <option value="AJUSTE_SALIDA">Ajuste negativo</option>
                  <option value="DEVOLUCION">Devolución</option>
                  <option value="NOTA_CREDITO">Nota de crédito</option>
                </select>
              </Campo>

              <Campo label="Cantidad">
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  style={s.input}
                />
              </Campo>

              <Campo label="Documento">
                <input
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  style={s.input}
                />
              </Campo>

              <Campo label="Fecha">
                <input
                  type="date"
                  value={fechaMovimiento}
                  onChange={(e) => setFechaMovimiento(e.target.value)}
                  style={s.input}
                />
              </Campo>

              <Campo label="Condición">
                <select
                  value={condicionCompra}
                  onChange={(e) => setCondicionCompra(e.target.value)}
                  style={s.input}
                >
                  <option>Contado</option>
                  <option>Crédito 30 días</option>
                  <option>Crédito 60 días</option>
                  <option>Consignación</option>
                  <option>No aplica</option>
                </select>
              </Campo>

              <Campo label="Total">
                <input
                  type="number"
                  value={totalFactura}
                  onChange={(e) => setTotalFactura(e.target.value)}
                  style={s.input}
                />
              </Campo>

              <Campo label="Vencimiento">
                <input
                  type="date"
                  value={fechaVencimientoPago}
                  onChange={(e) =>
                    setFechaVencimientoPago(e.target.value)
                  }
                  style={s.input}
                />
              </Campo>
            </div>

            <div style={s.stockGrid}>
              <Dato titulo="Stock actual" valor={stockActual} />
              <Dato titulo="Cantidad" valor={cantidadMovimiento} />
              <Dato titulo="Stock resultante" valor={stockNuevo} destacado />
            </div>

            <Campo label="Observación">
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                style={s.textarea}
              />
            </Campo>

            <div style={s.acciones}>
              <button
                onClick={guardarMovimientoExistente}
                disabled={guardando}
                style={s.botonPrincipal}
              >
                {guardando
                  ? "Guardando..."
                  : "Registrar movimiento"}
              </button>

              <button
                onClick={limpiarMovimiento}
                disabled={guardando}
                style={s.botonSecundario}
              >
                Limpiar
              </button>
            </div>
          </article>
        )}

        <article style={s.card}>
          <Cabecera
            titulo="Historial de movimientos"
            texto="Registro de entradas, salidas y ajustes."
            numero={String(movimientos.length)}
          />

          <div style={s.tablaBox}>
            <table style={s.tabla}>
              <thead>
                <tr>
                  <th style={s.th}>Fecha</th>
                  <th style={s.th}>Producto</th>
                  <th style={s.th}>Tipo</th>
                  <th style={s.th}>Cantidad</th>
                  <th style={s.th}>Stock anterior</th>
                  <th style={s.th}>Stock nuevo</th>
                  <th style={s.th}>Usuario</th>
                  <th style={s.th}>Observación</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={s.tdVacio}>
                      No hay movimientos registrados.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((movimiento) => {
                    const producto = productos.find(
                      (item) =>
                        String(item.id) ===
                        String(movimiento.producto_id)
                    );

                    return (
                      <tr key={movimiento.id}>
                        <td style={s.td}>
                          {String(
                            movimiento.created_at || ""
                          ).slice(0, 10)}
                        </td>
                        <td style={s.td}>
                          {producto?.nombre || "Producto no encontrado"}
                        </td>
                        <td style={s.td}>{movimiento.tipo_movimiento}</td>
                        <td style={s.td}>{numero(movimiento.cantidad)}</td>
                        <td style={s.td}>
                          {numero(movimiento.stock_anterior)}
                        </td>
                        <td style={s.td}>
                          {numero(movimiento.stock_nuevo)}
                        </td>
                        <td style={s.td}>{movimiento.usuario || "-"}</td>
                        <td style={s.td}>{movimiento.observacion || "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </main>
  );
}

function Campo({ label, children }) {
  return (
    <label style={s.campo}>
      <span style={s.label}>{label}</span>
      {children}
    </label>
  );
}

function Cabecera({ titulo, texto, numero }) {
  return (
    <div style={s.cabecera}>
      <div>
        <h2 style={s.tituloSeccion}>{titulo}</h2>
        <p style={s.textoSuave}>{texto}</p>
      </div>
      <span style={s.numeroPaso}>{numero}</span>
    </div>
  );
}

function Dato({ titulo, valor, destacado }) {
  return (
    <div style={destacado ? s.datoDestacado : s.dato}>
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

const s = {
  pagina: {
    minHeight: "100vh",
    padding: 26,
    background:
      "radial-gradient(circle at 88% 4%,rgba(41,163,98,.17),transparent 26%),linear-gradient(135deg,#f7faf8,#eaf3ed)",
    color: "#142019",
    fontFamily: "Inter,Arial,system-ui,sans-serif",
  },
  contenedor: {
    maxWidth: 1500,
    margin: "0 auto",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 12,
    background: "#eef5f1",
  },
  loadingLogo: {
    width: 220,
  },
  hero: {
    marginBottom: 20,
    padding: 28,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    borderRadius: 28,
    background:
      "linear-gradient(135deg,#102d20,#18583a 58%,#1e7c4d)",
    color: "#fff",
    boxShadow: "0 22px 50px rgba(18,66,42,.22)",
  },
  heroInfo: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
  },
  logoBox: {
    width: 190,
    height: 76,
    padding: 10,
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#fff",
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  etiqueta: {
    color: "#a8efc6",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.4,
  },
  titulo: {
    margin: "5px 0",
    fontSize: "clamp(30px,4vw,46px)",
  },
  subtitulo: {
    margin: 0,
    color: "#d9eee2",
  },
  botonVolver: {
    minHeight: 46,
    padding: "11px 18px",
    border: "1px solid rgba(255,255,255,.25)",
    borderRadius: 14,
    background: "rgba(255,255,255,.14)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  tabs: {
    marginBottom: 18,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  tab: {
    minHeight: 46,
    padding: "11px 18px",
    border: "1px solid #cbd9d0",
    borderRadius: 13,
    background: "#fff",
    color: "#294d38",
    fontWeight: 850,
    cursor: "pointer",
  },
  tabActivo: {
    background: "#173c2a",
    color: "#fff",
    borderColor: "#173c2a",
  },
  card: {
    marginBottom: 20,
    padding: 24,
    border: "1px solid #dce8e0",
    borderRadius: 23,
    background: "#fff",
    boxShadow: "0 13px 32px rgba(18,66,42,.08)",
  },
  cabecera: {
    marginBottom: 18,
    paddingBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid #e8efea",
  },
  tituloSeccion: {
    margin: 0,
    fontSize: 21,
  },
  textoSuave: {
    margin: "5px 0 0",
    color: "#6b776f",
    fontSize: 12,
  },
  numeroPaso: {
    minWidth: 37,
    height: 37,
    padding: "0 9px",
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    background: "#e5f5eb",
    color: "#176b42",
    fontWeight: 900,
  },
  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 15,
  },
  gridInferior: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(280px,1fr))",
    gap: 15,
  },
  campo: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  label: {
    color: "#405047",
    fontSize: 12,
    fontWeight: 800,
  },
  input: {
    width: "100%",
    minHeight: 46,
    padding: "11px 13px",
    boxSizing: "border-box",
    border: "1px solid #cbdad0",
    borderRadius: 12,
    background: "#fff",
    color: "#111827",
  },
  textarea: {
    width: "100%",
    minHeight: 105,
    marginTop: 15,
    padding: 13,
    boxSizing: "border-box",
    border: "1px solid #cbdad0",
    borderRadius: 12,
    resize: "vertical",
  },
  uploadBox: {
    minHeight: 105,
    padding: 16,
    display: "grid",
    gap: 10,
    border: "1px dashed #9fb7a8",
    borderRadius: 13,
    background: "#f7faf8",
  },
  textoArchivo: {
    color: "#68766e",
    fontSize: 12,
  },
  stockGrid: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(140px,1fr))",
    gap: 10,
  },
  dato: {
    padding: 13,
    display: "grid",
    gap: 5,
    border: "1px solid #d8e5dc",
    borderRadius: 13,
    background: "#f8fbf9",
  },
  datoDestacado: {
    padding: 13,
    display: "grid",
    gap: 5,
    borderRadius: 13,
    background: "#173c2a",
    color: "#fff",
  },
  acciones: {
    marginTop: 20,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  botonPrincipal: {
    minHeight: 48,
    padding: "12px 22px",
    border: "none",
    borderRadius: 13,
    background: "linear-gradient(135deg,#1d9159,#156a41)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  botonSecundario: {
    minHeight: 48,
    padding: "12px 22px",
    border: "1px solid #cbd9d0",
    borderRadius: 13,
    background: "#fff",
    color: "#294d38",
    fontWeight: 850,
    cursor: "pointer",
  },
  tablaBox: {
    overflowX: "auto",
    border: "1px solid #d8e5dc",
    borderRadius: 15,
  },
  tabla: {
    width: "100%",
    minWidth: 1050,
    borderCollapse: "collapse",
  },
  th: {
    padding: 13,
    background: "linear-gradient(180deg,#183c2a,#102a1d)",
    color: "#fff",
    textAlign: "left",
    whiteSpace: "nowrap",
    fontSize: 12,
  },
  td: {
    padding: 11,
    borderBottom: "1px solid #edf1ee",
    whiteSpace: "nowrap",
  },
  tdVacio: {
    padding: 28,
    color: "#6b7280",
    textAlign: "center",
  },
};
