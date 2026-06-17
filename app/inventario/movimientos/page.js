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

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mostrarBusquedaHistorial, setMostrarBusquedaHistorial] = useState(false);
  const [modoBusquedaHistorial, setModoBusquedaHistorial] = useState(false);

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
    cargarHistorialUltimos5();
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

  async function cargarHistorialUltimos5() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("movimientos_inventario")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      alert("Error cargando historial: " + error.message);
      return;
    }

    setHistorial(data || []);
    setModoBusquedaHistorial(false);
  }

  async function buscarHistorialPorFechas() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!fechaDesde || !fechaHasta) {
      alert("Seleccione fecha desde y fecha hasta.");
      return;
    }

    const desde = new Date(fechaDesde);
    desde.setHours(0, 0, 0, 0);

    const hasta = new Date(fechaHasta);
    hasta.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("movimientos_inventario")
      .select("*")
      .eq("empresa_id", empresaId)
      .gte("created_at", desde.toISOString())
      .lte("created_at", hasta.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error buscando historial: " + error.message);
      return;
    }

    setHistorial(data || []);
    setModoBusquedaHistorial(true);
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

    setNuevoProveedor("");
    setMostrarNuevoProveedor(false);

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

    return data.id;
  }

  async function guardarMovimiento() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (Number(precioOferta || 0) > 0 && Number(precioOferta) >= Number(precioVenta)) {
      alert("El precio de oferta debe ser menor que el precio de venta.");
      return;
    }

    if (!cantidad || Number(cantidad) <= 0) {
      alert("Ingrese una cantidad válida.");
      return;
    }

    setGuardando(true);

    let productoFinalId = productoId;
    let proveedorFinalId = proveedorId;

    if (!proveedorFinalId && nuevoProveedor) {
      proveedorFinalId = await crearProveedorNuevo();
    }

    if (!productoFinalId) {
      productoFinalId = await crearProductoNuevo(empresaId);

      if (!productoFinalId) {
        setGuardando(false);
        return;
      }
    }

    const producto = productos.find(
      (p) => String(p.id) === String(productoFinalId)
    );

    const stockAnterior = Number(producto?.stock_actual || 0);
    const cantidadMovimiento = Number(cantidad || 0);

    let stockNuevo = stockAnterior;

    if (tipoMovimiento === "ENTRADA") {
      stockNuevo = stockAnterior + cantidadMovimiento;
    }

    if (tipoMovimiento === "TRANSFERENCIA") {
      stockNuevo = stockAnterior - cantidadMovimiento;
    }

    if (tipoMovimiento === "NOTA_CREDITO") {
      stockNuevo =
        accionNotaCredito === "SUMA"
          ? stockAnterior + cantidadMovimiento
          : stockAnterior - cantidadMovimiento;
    }

    if (stockNuevo < 0) {
      setGuardando(false);
      alert("No puede salir más cantidad que el stock disponible.");
      return;
    }

    const fechaFinal = fechaMovimiento
      ? new Date(fechaMovimiento).toISOString()
      : new Date().toISOString();

    const usuario = localStorage.getItem("usuarioNombre") || "Sistema";

    const { error: errorProducto } = await supabase
      .from("productos")
      .update({
        stock_actual: stockNuevo,
        precio_compra: Number(precioCompra || 0),
        precio_venta: Number(precioVenta || 0),
        precio_oferta: Number(precioOferta || 0),
        ultimo_movimiento_usuario: usuario,
        ultimo_movimiento_fecha: fechaFinal,
      })
      .eq("id", productoFinalId)
      .eq("empresa_id", empresaId);

    if (errorProducto) {
      setGuardando(false);
      alert("Error actualizando producto: " + errorProducto.message);
      return;
    }

    const tipoMovimientoFinal =
      tipoMovimiento === "NOTA_CREDITO"
        ? `NOTA_CREDITO_${accionNotaCredito}`
        : tipoMovimiento;

    const observacionFinal =
      tipoMovimiento === "NOTA_CREDITO"
        ? `${observacion} | Nota de crédito: ${
            accionNotaCredito === "SUMA" ? "suma stock" : "resta stock"
          }`
        : observacion;

    const { error: errorMovimiento } = await supabase
      .from("movimientos_inventario")
      .insert([
        {
          empresa_id: empresaId,
          producto_id: productoFinalId,
          proveedor_id: proveedorFinalId || null,
          tipo_movimiento: tipoMovimientoFinal,
          cantidad: cantidadMovimiento,
          precio_compra: Number(precioCompra || 0),
          numero_factura: numeroFactura,
          total_compra: totalCompra,
          precio_venta: Number(precioVenta || 0),
          precio_oferta: Number(precioOferta || 0),
          porcentaje_ganancia: Number(porcentajeGanancia || 0),
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          observacion: observacionFinal,
          usuario,
          created_at: fechaFinal,
        },
      ]);

    if (errorMovimiento) {
      setGuardando(false);
      alert("Error guardando movimiento: " + errorMovimiento.message);
      return;
    }

    setGuardando(false);
    alert("Producto / movimiento guardado correctamente.");
    router.push("/inventario");
  }

  return (
    <div style={pagina}>
      <h1>Movimientos de Inventario</h1>

      <div style={card}>
        <h2>Producto</h2>

        <label>Seleccionar Producto Existente</label>
        <select
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
          style={input}
        >
          <option value="">Crear producto nuevo / seleccionar producto</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} - {p.nombre}
            </option>
          ))}
        </select>

        {!productoId && (
          <>
            <label>Código del Producto</label>
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

            <label>Nombre del Producto</label>
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

            <label>Descripción del Producto</label>
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

            <label>Stock disponible inicial</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              style={input}
              placeholder="Ejemplo: 10"
            />

            <label>Stock mínimo para alerta</label>
            <input
              type="number"
              value={nuevoProducto.stock_minimo}
              onChange={(e) =>
                setNuevoProducto({
                  ...nuevoProducto,
                  stock_minimo: e.target.value,
                })
              }
              style={input}
              placeholder="Ejemplo: 5"
            />

            <label>Foto del Producto</label>
            <div style={fotoBox}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImagen(e.target.files[0])}
              />

              {imagen && (
                <p style={{ marginTop: "10px", color: "#16a34a", fontWeight: "bold" }}>
                  Imagen seleccionada: {imagen.name}
                </p>
              )}
            </div>
          </>
        )}

        {productoSeleccionado && (
          <div style={stockBox}>
            <p><strong>Código:</strong> {productoSeleccionado.codigo}</p>
            <p><strong>Nombre:</strong> {productoSeleccionado.nombre}</p>
            <p><strong>Descripción:</strong> {productoSeleccionado.descripcion}</p>
            <p><strong>Stock actual:</strong> {productoSeleccionado.stock_actual}</p>
            <p><strong>Stock mínimo:</strong> {productoSeleccionado.stock_minimo || 0}</p>
          </div>
        )}

        <h2>Proveedor</h2>

        <label>Proveedor</label>
        <select
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
          style={input}
        >
          <option value="">Seleccione proveedor</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <button
          onClick={() => setMostrarNuevoProveedor(!mostrarNuevoProveedor)}
          style={botonSecundario}
        >
          Crear Proveedor Nuevo
        </button>

        {mostrarNuevoProveedor && (
          <>
            <label>Nombre del Nuevo Proveedor</label>
            <input
              value={nuevoProveedor}
              onChange={(e) => setNuevoProveedor(e.target.value)}
              style={input}
            />
          </>
        )}

        <h2>Datos de Compra</h2>

        <label>Número de Factura</label>
        <input
          value={numeroFactura}
          onChange={(e) => setNumeroFactura(e.target.value)}
          style={input}
        />

        <label>Tipo de Movimiento</label>
        <select
          value={tipoMovimiento}
          onChange={(e) => setTipoMovimiento(e.target.value)}
          style={input}
        >
          <option value="ENTRADA">Entrada</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="NOTA_CREDITO">Nota de Crédito</option>
        </select>

        {tipoMovimiento === "NOTA_CREDITO" && (
          <>
            <label>¿La nota de crédito suma o resta stock?</label>
            <select
              value={accionNotaCredito}
              onChange={(e) => setAccionNotaCredito(e.target.value)}
              style={input}
            >
              <option value="SUMA">Suma stock</option>
              <option value="RESTA">Resta stock</option>
            </select>
          </>
        )}

        {productoId && (
          <>
            <label>Cantidad</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              style={input}
            />
          </>
        )}

        <label>Precio de Compra</label>
        <input
          type="number"
          value={precioCompra}
          onChange={(e) => setPrecioCompra(e.target.value)}
          style={input}
        />

        <label>Total Compra</label>
        <input value={`$${totalCompra.toFixed(2)}`} disabled style={input} />

        <h2>Precio de Venta</h2>

        <label>Editar Precio de Venta</label>
        <input
          type="number"
          value={precioVenta}
          onChange={(e) => setPrecioVenta(e.target.value)}
          style={input}
        />

        <label>Porcentaje de Ganancia vs Precio de Venta</label>
        <input value={`${porcentajeGanancia}%`} disabled style={input} />

        <label>Precio de Oferta</label>
        <input
          type="number"
          value={precioOferta}
          onChange={(e) => setPrecioOferta(e.target.value)}
          style={input}
        />

        {Number(precioOferta || 0) > 0 &&
          Number(precioOferta || 0) >= Number(precioVenta || 0) && (
            <p style={{ color: "#dc2626", fontWeight: "bold" }}>
              El precio de oferta debe ser menor que el precio de venta.
            </p>
          )}

        <label>Observación</label>
        <textarea
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          style={textarea}
        />

        <label>Fecha del Movimiento</label>
        <input
          type="date"
          value={fechaMovimiento}
          onChange={(e) => setFechaMovimiento(e.target.value)}
          style={input}
        />

        <button
          onClick={guardarMovimiento}
          disabled={guardando}
          style={{
            width: "100%",
            background: guardando ? "#9ca3af" : "#16a34a",
            color: "#fff",
            border: "none",
            padding: "16px",
            borderRadius: "12px",
            cursor: guardando ? "not-allowed" : "pointer",
            fontSize: "17px",
            fontWeight: "bold",
          }}
        >
          {guardando ? "Guardando producto..." : "💾 Guardar Producto / Movimiento"}
        </button>
      </div>

      <h2>{modoBusquedaHistorial ? "Historial por rango" : "Últimos 5 movimientos"}</h2>

      <button
        onClick={() => setMostrarBusquedaHistorial(!mostrarBusquedaHistorial)}
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
            onChange={(e) => setFechaDesde(e.target.value)}
            style={input}
          />

          <label>Fecha hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={input}
          />

          <button onClick={buscarHistorialPorFechas} style={botonBuscar}>
            Buscar
          </button>

          <button onClick={cargarHistorialUltimos5} style={botonLimpiar}>
            Ver últimos 5
          </button>
        </div>
      )}

      <table style={tabla}>
        <thead>
          <tr>
            <th style={th}>Tipo</th>
            <th style={th}>Cantidad</th>
            <th style={th}>Precio Compra</th>
            <th style={th}>Factura</th>
            <th style={th}>Total Compra</th>
            <th style={th}>Precio Venta</th>
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
              <td style={td} colSpan="12">
                No hay movimientos registrados.
              </td>
            </tr>
          ) : (
            historial.map((m) => (
              <tr key={m.id}>
                <td style={td}>{m.tipo_movimiento}</td>
                <td style={td}>{m.cantidad}</td>
                <td style={td}>${Number(m.precio_compra || 0).toFixed(2)}</td>
                <td style={td}>{m.numero_factura}</td>
                <td style={td}>${Number(m.total_compra || 0).toFixed(2)}</td>
                <td style={td}>${Number(m.precio_venta || 0).toFixed(2)}</td>
                <td style={td}>${Number(m.precio_oferta || 0).toFixed(2)}</td>
                <td style={td}>{m.porcentaje_ganancia || 0}%</td>
                <td style={td}>{m.stock_anterior}</td>
                <td style={td}>{m.stock_nuevo}</td>
                <td style={td}>{m.usuario}</td>
                <td style={td}>
                  {m.created_at ? new Date(m.created_at).toLocaleString() : "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const pagina = {
  maxWidth: "1100px",
  margin: "30px auto",
  padding: "20px",
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

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  background: "#fff",
};

const th = {
  borderBottom: "1px solid #ddd",
  padding: "10px",
  textAlign: "left",
};

const td = {
  borderBottom: "1px solid #eee",
  padding: "10px",
};
