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

  const [productoId, setProductoId] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaCompra, setFechaCompra] = useState(fechaPanama());
  const [condicionCompra, setCondicionCompra] = useState("Contado");
  const [totalFactura, setTotalFactura] = useState("");
  const [fechaVencimientoPago, setFechaVencimientoPago] = useState("");
  const [observacion, setObservacion] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState(fechaPanama());
  const [fechaHasta, setFechaHasta] = useState(fechaPanama());

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

    setCargando(true);

    const nombre =
      localStorage.getItem("empresaNombre") ||
      localStorage.getItem("empresaAdminCreadaNombre") ||
      "Empresa";

    setEmpresaNombre(nombre);

    await Promise.all([
      cargarProductos(empresaId),
      cargarMovimientos(empresaId, fechaDesde, fechaHasta),
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

  async function cargarMovimientos(
    empresaId = obtenerEmpresaId(),
    desde = fechaDesde,
    hasta = fechaHasta
  ) {
    if (!empresaId) return;

    if (!desde || !hasta) {
      alert("Seleccione las fechas de consulta.");
      return;
    }

    if (desde > hasta) {
      alert("La fecha desde no puede ser mayor que la fecha hasta.");
      return;
    }

    const { data, error } = await supabase
      .from("movimientos_inventario")
      .select("*")
      .eq("empresa_id", empresaId)
      .gte("fecha_compra", desde)
      .lte("fecha_compra", hasta)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      alert("Error cargando movimientos: " + error.message);
      return;
    }

    setMovimientos(data || []);
  }

  const productoSeleccionado = useMemo(
    () =>
      productos.find(
        (producto) => String(producto.id) === String(productoId)
      ) || null,
    [productos, productoId]
  );

  function esSalida() {
    return ["SALIDA", "AJUSTE_SALIDA"].includes(tipoMovimiento);
  }

  function esEntrada() {
    return [
      "ENTRADA",
      "AJUSTE_ENTRADA",
      "NOTA_CREDITO",
      "DEVOLUCION",
    ].includes(tipoMovimiento);
  }

  const stockActual = numero(productoSeleccionado?.stock_actual);
  const cantidadMovimiento = numero(cantidad);

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

  function validar() {
    if (!productoSeleccionado?.id) {
      alert("Seleccione un producto.");
      return false;
    }

    if (!cantidad || cantidadMovimiento <= 0) {
      alert("Ingrese una cantidad válida mayor a cero.");
      return false;
    }

    if (esSalida() && cantidadMovimiento > stockActual) {
      alert(
        `Stock insuficiente. Disponible: ${stockActual}.`
      );
      return false;
    }

    if (
      ["ENTRADA", "NOTA_CREDITO"].includes(tipoMovimiento) &&
      !numeroFactura.trim()
    ) {
      alert("Ingrese el número de factura, orden o documento.");
      return false;
    }

    return true;
  }

  async function guardarMovimiento() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId || guardando || !validar()) return;

    setGuardando(true);

    const usuario =
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("adminKonaxNombre") ||
      "Sistema";

    try {
      const { error: errorStock } = await supabase
        .from("productos")
        .update({
          stock_actual: stockNuevo,
        })
        .eq("empresa_id", empresaId)
        .eq("id", productoSeleccionado.id);

      if (errorStock) {
        throw new Error(
          "No se pudo actualizar el stock: " + errorStock.message
        );
      }

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
            numero_factura: numeroFactura.trim() || null,
            fecha_compra: fechaCompra,
            condicion_compra: condicionCompra,
            total_factura: numero(totalFactura),
            fecha_vencimiento_pago:
              fechaVencimientoPago || null,
            observacion:
              observacion.trim() ||
              `${tipoMovimiento} de inventario`,
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

      limpiarFormulario();

      await Promise.all([
        cargarProductos(empresaId),
        cargarMovimientos(empresaId, fechaDesde, fechaHasta),
      ]);
    } catch (error) {
      alert(error.message || "No se pudo guardar el movimiento.");
    } finally {
      setGuardando(false);
    }
  }

  function limpiarFormulario() {
    setProductoId("");
    setTipoMovimiento("ENTRADA");
    setCantidad("");
    setNumeroFactura("");
    setFechaCompra(fechaPanama());
    setCondicionCompra("Contado");
    setTotalFactura("");
    setFechaVencimientoPago("");
    setObservacion("");
  }

  function volverInventario() {
    router.push("/inventario");
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

  const totalEntradas = useMemo(
    () =>
      movimientos
        .filter((item) =>
          ["ENTRADA", "AJUSTE_ENTRADA", "NOTA_CREDITO", "DEVOLUCION"].includes(
            item.tipo_movimiento
          )
        )
        .reduce((total, item) => total + numero(item.cantidad), 0),
    [movimientos]
  );

  const totalSalidas = useMemo(
    () =>
      movimientos
        .filter((item) =>
          ["SALIDA", "AJUSTE_SALIDA"].includes(item.tipo_movimiento)
        )
        .reduce((total, item) => total + numero(item.cantidad), 0),
    [movimientos]
  );

  if (cargando) {
    return (
      <div style={s.loading}>
        <img src="/konax-logo.png" alt="KONAX" style={s.loadingLogo} />
        <strong>Preparando movimientos de inventario</strong>
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
                Registra entradas, salidas, ajustes, devoluciones y notas de crédito.
              </p>
            </div>
          </div>

          <button onClick={volverInventario} style={s.botonVolver}>
            ← Volver a Inventario
          </button>
        </header>

        <section style={s.kpiGrid}>
          <Kpi titulo="Productos activos" valor={productos.length} icono="📦" />
          <Kpi titulo="Movimientos consultados" valor={movimientos.length} icono="🔄" />
          <Kpi titulo="Unidades de entrada" valor={totalEntradas} icono="📥" destacado />
          <Kpi titulo="Unidades de salida" valor={totalSalidas} icono="📤" />
        </section>

        <section style={s.mainGrid}>
          <article style={s.card}>
            <Cabecera
              titulo="Registrar movimiento"
              texto="Seleccione el producto y la operación que afectará el stock."
              numero="01"
            />

            <div style={s.grid}>
              <Campo label="Buscar producto">
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Código, nombre, categoría o proveedor"
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
                  <option value="ENTRADA">Entrada de mercancía</option>
                  <option value="SALIDA">Salida manual</option>
                  <option value="AJUSTE_ENTRADA">Ajuste positivo</option>
                  <option value="AJUSTE_SALIDA">Ajuste negativo</option>
                  <option value="DEVOLUCION">Devolución de cliente</option>
                  <option value="NOTA_CREDITO">Nota de crédito de proveedor</option>
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
            </div>

            <div style={s.stockGrid}>
              <Dato titulo="Stock actual" valor={stockActual} />
              <Dato titulo="Cantidad" valor={cantidadMovimiento} />
              <Dato titulo="Stock resultante" valor={stockNuevo} destacado />
            </div>

            <div style={s.separador} />

            <Cabecera
              titulo="Documento y compra"
              texto="Complete estos datos cuando el movimiento tenga factura, orden o compromiso de pago."
              numero="02"
            />

            <div style={s.grid}>
              <Campo label="N.° factura / orden / documento">
                <input
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="Ej. FAC-1025 / OC-001"
                  style={s.input}
                />
              </Campo>

              <Campo label="Fecha del movimiento">
                <input
                  type="date"
                  value={fechaCompra}
                  onChange={(e) => setFechaCompra(e.target.value)}
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

              <Campo label="Total factura / orden">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalFactura}
                  onChange={(e) => setTotalFactura(e.target.value)}
                  style={s.input}
                />
              </Campo>

              <Campo label="Fecha vencimiento del pago">
                <input
                  type="date"
                  value={fechaVencimientoPago}
                  onChange={(e) => setFechaVencimientoPago(e.target.value)}
                  style={s.input}
                />
              </Campo>
            </div>

            <Campo label="Observación">
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Motivo del movimiento, condición de la mercancía o comentario interno..."
                style={s.textarea}
              />
            </Campo>

            <div style={s.acciones}>
              <button
                onClick={guardarMovimiento}
                disabled={guardando}
                style={s.botonPrincipal}
              >
                {guardando ? "Guardando..." : "Registrar movimiento"}
              </button>

              <button
                onClick={limpiarFormulario}
                disabled={guardando}
                style={s.botonSecundario}
              >
                Limpiar
              </button>
            </div>
          </article>

          <aside style={s.resumenCard}>
            <Cabecera
              titulo="Resumen"
              texto="Confirme el efecto antes de guardar."
              numero="✓"
            />

            <Fila label="Producto" valor={productoSeleccionado?.nombre || "-"} />
            <Fila label="Código" valor={productoSeleccionado?.codigo || "-"} />
            <Fila label="Movimiento" valor={tipoMovimiento} />
            <Fila label="Stock anterior" valor={stockActual} />
            <Fila label="Cantidad" valor={cantidadMovimiento} />

            <div style={s.totalBox}>
              <span>Stock después del movimiento</span>
              <strong>{stockNuevo}</strong>
            </div>
          </aside>
        </section>

        <article style={s.card}>
          <Cabecera
            titulo="Historial de movimientos"
            texto="Consulta las entradas y salidas registradas en el periodo."
            numero={String(movimientos.length)}
          />

          <div style={s.filtros}>
            <Campo label="Desde">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={s.input}
              />
            </Campo>

            <Campo label="Hasta">
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={s.input}
              />
            </Campo>

            <button
              onClick={() => cargarMovimientos()}
              style={s.botonFiltrar}
            >
              Buscar movimientos
            </button>
          </div>

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
                  <th style={s.th}>Documento</th>
                  <th style={s.th}>Usuario</th>
                  <th style={s.th}>Observación</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={s.tdVacio}>
                      No hay movimientos en el periodo seleccionado.
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
                            movimiento.fecha_compra ||
                              movimiento.created_at ||
                              ""
                          ).slice(0, 10)}
                        </td>
                        <td style={s.td}>
                          {producto?.nombre || "Producto no encontrado"}
                        </td>
                        <td style={s.td}>{movimiento.tipo_movimiento}</td>
                        <td style={s.td}>{numero(movimiento.cantidad)}</td>
                        <td style={s.td}>{numero(movimiento.stock_anterior)}</td>
                        <td style={s.td}>{numero(movimiento.stock_nuevo)}</td>
                        <td style={s.td}>{movimiento.numero_factura || "-"}</td>
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

function Kpi({ titulo, valor, icono, destacado }) {
  return (
    <article style={destacado ? s.kpiDestacado : s.kpi}>
      <span style={s.kpiIcono}>{icono}</span>
      <span style={s.kpiTitulo}>{titulo}</span>
      <strong style={s.kpiValor}>{valor}</strong>
    </article>
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

function Fila({ label, valor }) {
  return (
    <div style={s.fila}>
      <span>{label}</span>
      <strong>{valor}</strong>
    </div>
  );
}

const s = {
  pagina: {
    minHeight: "100vh",
    padding: "26px",
    background:
      "radial-gradient(circle at 88% 4%,rgba(41,163,98,.17),transparent 26%),linear-gradient(135deg,#f7faf8,#eaf3ed)",
    color: "#142019",
    fontFamily: "Inter,Arial,system-ui,sans-serif",
  },
  contenedor: {
    maxWidth: "1500px",
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
    boxShadow: "0 10px 25px rgba(0,0,0,.18)",
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
  kpiGrid: {
    marginBottom: 20,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: 14,
  },
  kpi: {
    padding: 19,
    display: "grid",
    gap: 7,
    border: "1px solid #d9e7de",
    borderRadius: 19,
    background: "#fff",
    boxShadow: "0 9px 22px rgba(18,66,42,.07)",
  },
  kpiDestacado: {
    padding: 19,
    display: "grid",
    gap: 7,
    borderRadius: 19,
    background: "linear-gradient(135deg,#1c8f58,#125d3a)",
    color: "#fff",
    boxShadow: "0 13px 28px rgba(20,102,63,.23)",
  },
  kpiIcono: {
    fontSize: 23,
  },
  kpiTitulo: {
    fontSize: 12,
    fontWeight: 800,
  },
  kpiValor: {
    fontSize: 25,
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) minmax(300px,380px)",
    gap: 20,
    alignItems: "start",
  },
  card: {
    marginBottom: 20,
    padding: 24,
    border: "1px solid #dce8e0",
    borderRadius: 23,
    background: "linear-gradient(180deg,#fff,#fbfdfc)",
    boxShadow: "0 13px 32px rgba(18,66,42,.08)",
  },
  resumenCard: {
    position: "sticky",
    top: 18,
    padding: 23,
    border: "1px solid #d7e4dc",
    borderRadius: 23,
    background: "#fff",
    boxShadow: "0 15px 34px rgba(18,66,42,.1)",
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
    border: "1px solid #c9e4d3",
  },
  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
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
    color: "#55665c",
  },
  datoDestacado: {
    padding: 13,
    display: "grid",
    gap: 5,
    borderRadius: 13,
    background: "#173c2a",
    color: "#fff",
  },
  separador: {
    height: 1,
    margin: "26px 0",
    background: "#e4ece7",
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
    boxShadow: "0 9px 21px rgba(21,106,65,.22)",
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
  fila: {
    padding: "10px 0",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "1px solid #e9efeb",
    color: "#617068",
    fontSize: 12,
  },
  totalBox: {
    marginTop: 18,
    padding: 18,
    display: "grid",
    gap: 5,
    borderRadius: 17,
    background: "linear-gradient(135deg,#102f20,#176a42)",
    color: "#fff",
    boxShadow: "0 12px 26px rgba(17,79,48,.2)",
  },
  filtros: {
    marginBottom: 18,
    padding: 15,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
    alignItems: "end",
    border: "1px solid #dce7df",
    borderRadius: 14,
    background: "#f7faf8",
  },
  botonFiltrar: {
    minHeight: 46,
    padding: "11px 18px",
    border: "none",
    borderRadius: 12,
    background: "#176d43",
    color: "#fff",
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
    minWidth: 1100,
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
