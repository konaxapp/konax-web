"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ReportesPage() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [clientes, setClientes] = useState([]);
  const [comercial, setComercial] = useState([]);
  const [cobranza, setCobranza] = useState([]);
  const [caja, setCaja] = useState([]);

  const [fechaDesde, setFechaDesde] = useState(primerDiaMes());
  const [fechaHasta, setFechaHasta] = useState(fechaActual());
  const [estadoCredito, setEstadoCredito] = useState("Todos");

  useEffect(() => {
    cargarDatos();
  }, []);

  function fechaActual() {
    return new Date().toISOString().slice(0, 10);
  }

  function primerDiaMes() {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return primerDia.toISOString().slice(0, 10);
  }

  function obtenerEmpresaId() {
    if (typeof window === "undefined") return null;

    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay una empresa activa.");
      window.location.href = "/login";
      return null;
    }

    return empresaId;
  }

  async function consultarTabla(tabla, empresaId) {
    const { data, error: errorConsulta } = await supabase
      .from(tabla)
      .select("*")
      .eq("empresa_id", empresaId)
      .limit(10000);

    if (errorConsulta) {
      throw new Error(`${tabla}: ${errorConsulta.message}`);
    }

    return Array.isArray(data) ? data : [];
  }

  async function cargarDatos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    setCargando(true);
    setError("");

    try {
      const [clientesData, comercialData, cobranzaData, cajaData] =
        await Promise.all([
          consultarTabla("clientes", empresaId),
          consultarTabla("informacion_comercial", empresaId),
          consultarTabla("informacion_cobranza", empresaId),
          consultarTabla("caja", empresaId),
        ]);

      setClientes(clientesData);
      setComercial(comercialData);
      setCobranza(cobranzaData);
      setCaja(cajaData);
    } catch (err) {
      console.error("Error cargando reportes:", err);
      setError(
        "No fue posible cargar todos los datos. Revisa las políticas RLS y que el usuario tenga acceso a las tablas."
      );
    } finally {
      setCargando(false);
    }
  }

  function numero(valor) {
    const resultado = Number(valor ?? 0);
    return Number.isFinite(resultado) ? resultado : 0;
  }

  function fechaCorta(valor) {
    if (!valor) return "";
    return String(valor).slice(0, 10);
  }

  function estaEnRango(valorFecha) {
    const fecha = fechaCorta(valorFecha);
    if (!fecha) return false;

    if (fechaDesde && fecha < fechaDesde) return false;
    if (fechaHasta && fecha > fechaHasta) return false;

    return true;
  }

  function textoNormalizado(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  const clientesPeriodo = useMemo(() => {
    return clientes.filter((cliente) => estaEnRango(cliente.created_at));
  }, [clientes, fechaDesde, fechaHasta]);

  const comercialPeriodo = useMemo(() => {
    return comercial.filter((registro) => {
      const cumpleFecha = estaEnRango(
        registro.fecha_inicio || registro.created_at
      );

      const cumpleEstado =
        estadoCredito === "Todos" ||
        textoNormalizado(registro.estado) ===
          textoNormalizado(estadoCredito);

      return cumpleFecha && cumpleEstado;
    });
  }, [comercial, fechaDesde, fechaHasta, estadoCredito]);

  const cajaPeriodo = useMemo(() => {
    return caja.filter((movimiento) => {
      const procesado =
        textoNormalizado(movimiento.estado) === "procesado";

      return (
        procesado &&
        estaEnRango(movimiento.fecha_pago || movimiento.created_at)
      );
    });
  }, [caja, fechaDesde, fechaHasta]);

  const cobranzaPorCredito = useMemo(() => {
    const mapa = new Map();

    cobranza.forEach((registro) => {
      if (registro.informacion_comercial_id) {
        mapa.set(registro.informacion_comercial_id, registro);
      }
    });

    return mapa;
  }, [cobranza]);

  const resumen = useMemo(() => {
    const creditosPeriodo = comercialPeriodo.filter((registro) =>
      textoNormalizado(registro.tipo_producto).includes("credito")
    );

    const ventasPeriodo = comercialPeriodo.filter((registro) => {
      const tipo = textoNormalizado(registro.tipo_producto);
      return tipo.includes("venta") && !tipo.includes("credito");
    });

    const montoCreditos = creditosPeriodo.reduce(
      (total, registro) => total + numero(registro.monto_total),
      0
    );

    const montoVentas = ventasPeriodo.reduce(
      (total, registro) => total + numero(registro.monto_total),
      0
    );

    const carteraPendiente = comercialPeriodo.reduce(
      (total, registro) => total + numero(registro.saldo_actual),
      0
    );

    const carteraVencida = comercialPeriodo.reduce((total, registro) => {
      const datoCobranza = cobranzaPorCredito.get(registro.id);
      const diasMora = numero(datoCobranza?.dias_mora);

      return diasMora > 0
        ? total + numero(registro.saldo_actual)
        : total;
    }, 0);

    const cuentasEnMora = comercialPeriodo.filter((registro) => {
      const datoCobranza = cobranzaPorCredito.get(registro.id);
      return numero(datoCobranza?.dias_mora) > 0;
    }).length;

    const cobrado = cajaPeriodo
      .filter((movimiento) => {
        const tipo = textoNormalizado(movimiento.tipo);
        return (
          tipo.includes("pago") ||
          tipo.includes("abono") ||
          tipo.includes("cobro")
        );
      })
      .reduce((total, movimiento) => total + numero(movimiento.monto), 0);

    const ingresosCaja = cajaPeriodo
      .filter((movimiento) => {
        const tipo = textoNormalizado(movimiento.tipo);

        return !(
          tipo.includes("egreso") ||
          tipo.includes("gasto") ||
          tipo.includes("retiro") ||
          tipo.includes("salida")
        );
      })
      .reduce((total, movimiento) => total + numero(movimiento.monto), 0);

    const egresosCaja = cajaPeriodo
      .filter((movimiento) => {
        const tipo = textoNormalizado(movimiento.tipo);

        return (
          tipo.includes("egreso") ||
          tipo.includes("gasto") ||
          tipo.includes("retiro") ||
          tipo.includes("salida")
        );
      })
      .reduce((total, movimiento) => total + numero(movimiento.monto), 0);

    const creditosActivos = comercialPeriodo.filter(
      (registro) => textoNormalizado(registro.estado) === "activo"
    ).length;

    const porcentajeMora =
      carteraPendiente > 0
        ? (carteraVencida / carteraPendiente) * 100
        : 0;

    const ticketPromedio =
      comercialPeriodo.length > 0
        ? comercialPeriodo.reduce(
            (total, registro) => total + numero(registro.monto_total),
            0
          ) / comercialPeriodo.length
        : 0;

    return {
      montoCreditos,
      montoVentas,
      carteraPendiente,
      carteraVencida,
      cuentasEnMora,
      cobrado,
      ingresosCaja,
      egresosCaja,
      creditosActivos,
      clientesNuevos: clientesPeriodo.length,
      porcentajeMora,
      ticketPromedio,
    };
  }, [
    comercialPeriodo,
    cajaPeriodo,
    clientesPeriodo,
    cobranzaPorCredito,
  ]);

  const movimientosRecientes = useMemo(() => {
    const movimientosCredito = comercialPeriodo.map((registro) => ({
      id: `comercial-${registro.id}`,
      fecha: fechaCorta(registro.fecha_inicio || registro.created_at),
      tipo: registro.tipo_producto || "Crédito",
      detalle:
        registro.numero_cuenta ||
        registro.descripcion ||
        "Operación comercial",
      responsable: registro.responsable || "Sin asignar",
      monto: numero(registro.monto_total),
    }));

    const movimientosCaja = cajaPeriodo.map((registro) => ({
      id: `caja-${registro.id}`,
      fecha: fechaCorta(registro.fecha_pago || registro.created_at),
      tipo: registro.tipo || "Caja",
      detalle:
        registro.cliente_nombre ||
        registro.descripcion ||
        registro.numero_transaccion ||
        "Movimiento de caja",
      responsable: registro.usuario || "Sin asignar",
      monto: numero(registro.monto),
    }));

    return [...movimientosCredito, ...movimientosCaja]
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
      .slice(0, 15);
  }, [comercialPeriodo, cajaPeriodo]);

  const cuentasMora = useMemo(() => {
    return comercialPeriodo
      .map((registro) => {
        const datoCobranza = cobranzaPorCredito.get(registro.id);
        const diasMora = numero(datoCobranza?.dias_mora);

        return {
          id: registro.id,
          cuenta: registro.numero_cuenta || "Sin número",
          clienteId: registro.cliente_id,
          saldo: numero(registro.saldo_actual),
          diasMora,
          estadoCobranza:
            datoCobranza?.estado_cobranza || "Sin gestión",
          responsable:
            datoCobranza?.responsable_cobro ||
            registro.responsable ||
            "Sin asignar",
        };
      })
      .filter((registro) => registro.diasMora > 0)
      .sort((a, b) => b.diasMora - a.diasMora);
  }, [comercialPeriodo, cobranzaPorCredito]);

  function moneda(valor) {
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(numero(valor));
  }

  function exportarExcel() {
    const filas = [
      ["REPORTE GENERAL KONAX"],
      ["Desde", fechaDesde],
      ["Hasta", fechaHasta],
      [],
      ["Indicador", "Resultado"],
      ["Créditos otorgados", resumen.montoCreditos],
      ["Ventas registradas", resumen.montoVentas],
      ["Cobrado en el período", resumen.cobrado],
      ["Cartera pendiente", resumen.carteraPendiente],
      ["Cartera vencida", resumen.carteraVencida],
      ["Cuentas en mora", resumen.cuentasEnMora],
      ["Ingresos de caja", resumen.ingresosCaja],
      ["Egresos de caja", resumen.egresosCaja],
      ["Créditos activos", resumen.creditosActivos],
      ["Clientes nuevos", resumen.clientesNuevos],
      ["Porcentaje de mora", `${resumen.porcentajeMora.toFixed(2)}%`],
    ];

    const csv = "\uFEFF" + filas
      .map((fila) =>
        fila
          .map((celda) =>
            `"${String(celda ?? "").replace(/"/g, '""')}"`
          )
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = `reporte-general-${fechaDesde}-${fechaHasta}.csv`;
    enlace.click();

    URL.revokeObjectURL(url);
  }

  function descargarPDF() {
    window.print();
  }

  function limpiarFiltros() {
    setFechaDesde(primerDiaMes());
    setFechaHasta(fechaActual());
    setEstadoCredito("Todos");
  }

  if (cargando) {
    return (
      <main style={estilos.carga}>
        <div style={estilos.spinner}></div>
        <p style={{ margin: 0, fontWeight: 700 }}>
          Cargando datos reales de Supabase...
        </p>
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <header style={estilos.encabezado}>
        <div>
          <span style={estilos.etiqueta}>CENTRO DE REPORTES Y ANÁLISIS</span>
          <h1 style={estilos.titulo}>Reporte general</h1>
          <p style={estilos.subtitulo}>
            Información consolidada de créditos, cobranza, caja y clientes.
          </p>
        </div>

        <div style={estilos.acciones}>
          <button
            type="button"
            style={estilos.botonBlanco}
            onClick={() => (window.location.href = "/dashboard")}
          >
            ← Volver al dashboard
          </button>

          <button
            type="button"
            style={estilos.botonVerde}
            onClick={cargarDatos}
          >
            Actualizar datos
          </button>
        </div>
      </header>

      {error && <div style={estilos.error}>{error}</div>}

      <section style={estilos.filtros}>
        <Campo label="Desde">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={estilos.input}
          />
        </Campo>

        <Campo label="Hasta">
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={estilos.input}
          />
        </Campo>

        <Campo label="Estado del crédito">
          <select
            value={estadoCredito}
            onChange={(e) => setEstadoCredito(e.target.value)}
            style={estilos.input}
          >
            <option value="Todos">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Pagado">Pagado</option>
            <option value="Cancelado">Cancelado</option>
            <option value="Suspendido">Suspendido</option>
          </select>
        </Campo>

        <div style={estilos.botonesFiltros}>
          <button
            type="button"
            style={estilos.botonBlanco}
            onClick={limpiarFiltros}
          >
            Limpiar
          </button>

          <button
            type="button"
            style={estilos.botonTurquesa}
            onClick={exportarExcel}
          >
            Exportar Excel
          </button>

          <button
            type="button"
            style={estilos.botonOscuro}
            onClick={descargarPDF}
          >
            Descargar PDF
          </button>
        </div>
      </section>

      <section style={estilos.tarjetas}>
        <Tarjeta
          icono="💳"
          titulo="Créditos otorgados"
          valor={moneda(resumen.montoCreditos)}
          detalle={`${comercialPeriodo.length} operaciones en el período`}
        />

        <Tarjeta
          icono="🛒"
          titulo="Ventas registradas"
          valor={moneda(resumen.montoVentas)}
          detalle="Operaciones no clasificadas como crédito"
        />

        <Tarjeta
          icono="💰"
          titulo="Cobrado en el período"
          valor={moneda(resumen.cobrado)}
          detalle={`${cajaPeriodo.length} movimientos procesados`}
        />

        <Tarjeta
          icono="🧾"
          titulo="Cartera pendiente"
          valor={moneda(resumen.carteraPendiente)}
          detalle="Suma del saldo actual"
        />

        <Tarjeta
          icono="⚠️"
          titulo="Cartera vencida"
          valor={moneda(resumen.carteraVencida)}
          detalle={`${resumen.cuentasEnMora} cuentas con días de mora`}
        />

        <Tarjeta
          icono="🏦"
          titulo="Ingresos de caja"
          valor={moneda(resumen.ingresosCaja)}
          detalle="Movimientos procesados de entrada"
        />

        <Tarjeta
          icono="📤"
          titulo="Egresos de caja"
          valor={moneda(resumen.egresosCaja)}
          detalle="Gastos, retiros y salidas"
        />

        <Tarjeta
          icono="✅"
          titulo="Créditos activos"
          valor={resumen.creditosActivos}
          detalle="Estado Activo"
        />

        <Tarjeta
          icono="👥"
          titulo="Clientes nuevos"
          valor={resumen.clientesNuevos}
          detalle="Registrados dentro del período"
        />

        <Tarjeta
          icono="📊"
          titulo="Porcentaje de mora"
          valor={`${resumen.porcentajeMora.toFixed(1)}%`}
          detalle="Cartera vencida sobre cartera pendiente"
        />
      </section>

      <section style={estilos.resumenes}>
        <Panel titulo="Resumen comercial" etiqueta="CRÉDITOS Y VENTAS">
          <Fila nombre="Créditos otorgados" valor={moneda(resumen.montoCreditos)} />
          <Fila nombre="Ventas registradas" valor={moneda(resumen.montoVentas)} />
          <Fila nombre="Ticket promedio" valor={moneda(resumen.ticketPromedio)} />
          <Fila nombre="Operaciones" valor={comercialPeriodo.length} />
        </Panel>

        <Panel titulo="Resumen de cartera" etiqueta="COBRANZA">
          <Fila nombre="Cartera pendiente" valor={moneda(resumen.carteraPendiente)} />
          <Fila nombre="Cartera vencida" valor={moneda(resumen.carteraVencida)} />
          <Fila nombre="Cuentas en mora" valor={resumen.cuentasEnMora} />
          <Fila
            nombre="Índice de mora"
            valor={`${resumen.porcentajeMora.toFixed(1)}%`}
          />
        </Panel>

        <Panel titulo="Resumen de caja" etiqueta="CAJA">
          <Fila nombre="Ingresos" valor={moneda(resumen.ingresosCaja)} />
          <Fila nombre="Egresos" valor={moneda(resumen.egresosCaja)} />
          <Fila
            nombre="Balance"
            valor={moneda(resumen.ingresosCaja - resumen.egresosCaja)}
          />
          <Fila nombre="Movimientos" valor={cajaPeriodo.length} />
        </Panel>
      </section>

      <section style={estilos.panelTabla}>
        <div style={estilos.cabeceraPanel}>
          <div>
            <span style={estilos.miniEtiqueta}>MORA REAL</span>
            <h2 style={estilos.tituloPanel}>Cuentas con días de atraso</h2>
          </div>
          <span style={estilos.contador}>{cuentasMora.length} registros</span>
        </div>

        <div style={estilos.tablaContenedor}>
          <table style={estilos.tabla}>
            <thead>
              <tr>
                <th style={estilos.th}>Cuenta</th>
                <th style={estilos.th}>Días de mora</th>
                <th style={estilos.th}>Estado de cobranza</th>
                <th style={estilos.th}>Responsable</th>
                <th style={estilos.thDerecha}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {cuentasMora.length === 0 ? (
                <tr>
                  <td colSpan="5" style={estilos.sinDatos}>
                    No hay cuentas con días de mora en el período seleccionado.
                  </td>
                </tr>
              ) : (
                cuentasMora.map((registro) => (
                  <tr key={registro.id}>
                    <td style={estilos.td}>{registro.cuenta}</td>
                    <td style={estilos.td}>
                      <span style={estilos.badgeMora}>
                        {registro.diasMora} días
                      </span>
                    </td>
                    <td style={estilos.td}>{registro.estadoCobranza}</td>
                    <td style={estilos.td}>{registro.responsable}</td>
                    <td style={estilos.tdDerecha}>{moneda(registro.saldo)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={estilos.panelTabla}>
        <div style={estilos.cabeceraPanel}>
          <div>
            <span style={estilos.miniEtiqueta}>ACTIVIDAD</span>
            <h2 style={estilos.tituloPanel}>Últimos movimientos</h2>
          </div>
          <span style={estilos.contador}>
            {movimientosRecientes.length} registros
          </span>
        </div>

        <div style={estilos.tablaContenedor}>
          <table style={estilos.tabla}>
            <thead>
              <tr>
                <th style={estilos.th}>Fecha</th>
                <th style={estilos.th}>Tipo</th>
                <th style={estilos.th}>Detalle</th>
                <th style={estilos.th}>Responsable</th>
                <th style={estilos.thDerecha}>Monto</th>
              </tr>
            </thead>

            <tbody>
              {movimientosRecientes.length === 0 ? (
                <tr>
                  <td colSpan="5" style={estilos.sinDatos}>
                    No hay movimientos dentro del período seleccionado.
                  </td>
                </tr>
              ) : (
                movimientosRecientes.map((registro) => (
                  <tr key={registro.id}>
                    <td style={estilos.td}>{registro.fecha || "Sin fecha"}</td>
                    <td style={estilos.td}>
                      <span style={estilos.badge}>{registro.tipo}</span>
                    </td>
                    <td style={estilos.td}>{registro.detalle}</td>
                    <td style={estilos.td}>{registro.responsable}</td>
                    <td style={estilos.tdDerecha}>{moneda(registro.monto)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Campo({ label, children }) {
  return (
    <label style={estilos.campo}>
      <span style={estilos.label}>{label}</span>
      {children}
    </label>
  );
}

function Tarjeta({ icono, titulo, valor, detalle }) {
  return (
    <article style={estilos.tarjeta}>
      <div style={estilos.icono}>{icono}</div>
      <div>
        <p style={estilos.tituloTarjeta}>{titulo}</p>
        <strong style={estilos.valorTarjeta}>{valor}</strong>
        <span style={estilos.detalleTarjeta}>{detalle}</span>
      </div>
    </article>
  );
}

function Panel({ titulo, etiqueta, children }) {
  return (
    <article style={estilos.panel}>
      <span style={estilos.miniEtiqueta}>{etiqueta}</span>
      <h2 style={estilos.tituloPanel}>{titulo}</h2>
      <div style={{ marginTop: 14 }}>{children}</div>
    </article>
  );
}

function Fila({ nombre, valor }) {
  return (
    <div style={estilos.fila}>
      <span style={estilos.nombreFila}>{nombre}</span>
      <strong style={estilos.valorFila}>{valor}</strong>
    </div>
  );
}

const estilos = {
  pagina: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f4f7f5",
    color: "#17211c",
    fontFamily: "Arial, sans-serif",
  },
  carga: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 14,
    background: "#f4f7f5",
    color: "#166534",
    fontFamily: "Arial, sans-serif",
  },
  spinner: {
    width: 42,
    height: 42,
    border: "5px solid #dce9e1",
    borderTopColor: "#16834f",
    borderRadius: "50%",
  },
  encabezado: {
    maxWidth: 1500,
    margin: "0 auto 26px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    flexWrap: "wrap",
  },
  etiqueta: {
    display: "block",
    marginBottom: 7,
    color: "#16834f",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1.4,
  },
  titulo: {
    margin: "0 0 9px",
    fontSize: "clamp(30px, 4vw, 43px)",
    lineHeight: 1.08,
  },
  subtitulo: {
    margin: 0,
    color: "#68736c",
    fontSize: 16,
    lineHeight: 1.55,
  },
  acciones: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  error: {
    maxWidth: 1500,
    margin: "0 auto 20px",
    padding: "14px 16px",
    border: "1px solid #fecaca",
    borderRadius: 12,
    background: "#fef2f2",
    color: "#991b1b",
    fontWeight: 700,
  },
  filtros: {
    maxWidth: 1500,
    margin: "0 auto 22px",
    padding: 18,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 13,
    alignItems: "end",
    border: "1px solid #dce5df",
    borderRadius: 17,
    background: "#fff",
    boxShadow: "0 8px 25px rgba(15, 23, 42, 0.05)",
  },
  campo: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  label: {
    color: "#506057",
    fontSize: 13,
    fontWeight: 800,
  },
  input: {
    width: "100%",
    minHeight: 43,
    padding: "9px 11px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    background: "#fff",
    color: "#17211c",
    fontSize: 14,
  },
  botonesFiltros: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  botonBlanco: {
    minHeight: 43,
    padding: "9px 14px",
    border: "1px solid #ccd7d0",
    borderRadius: 10,
    background: "#fff",
    color: "#26342b",
    fontWeight: 800,
    cursor: "pointer",
  },
  botonVerde: {
    minHeight: 43,
    padding: "9px 16px",
    border: "none",
    borderRadius: 10,
    background: "#16834f",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  botonTurquesa: {
    minHeight: 43,
    padding: "9px 14px",
    border: "none",
    borderRadius: 10,
    background: "#0f766e",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  botonOscuro: {
    minHeight: 43,
    padding: "9px 14px",
    border: "none",
    borderRadius: 10,
    background: "#111827",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  tarjetas: {
    maxWidth: 1500,
    margin: "0 auto 22px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 15,
  },
  tarjeta: {
    minHeight: 137,
    padding: 19,
    display: "grid",
    gridTemplateColumns: "50px 1fr",
    gap: 13,
    border: "1px solid #dce5df",
    borderRadius: 17,
    background: "#fff",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  },
  icono: {
    width: 50,
    height: 50,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#eaf7f0",
    fontSize: 24,
  },
  tituloTarjeta: {
    margin: "0 0 7px",
    color: "#68736c",
    fontSize: 13,
    fontWeight: 800,
  },
  valorTarjeta: {
    display: "block",
    marginBottom: 6,
    fontSize: 24,
    lineHeight: 1.12,
  },
  detalleTarjeta: {
    display: "block",
    color: "#7d8881",
    fontSize: 12,
    lineHeight: 1.4,
  },
  resumenes: {
    maxWidth: 1500,
    margin: "0 auto 22px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
    gap: 16,
  },
  panel: {
    padding: 22,
    border: "1px solid #dce5df",
    borderRadius: 17,
    background: "#fff",
    boxShadow: "0 8px 25px rgba(15, 23, 42, 0.05)",
  },
  miniEtiqueta: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.2,
  },
  tituloPanel: {
    margin: 0,
    fontSize: 21,
  },
  fila: {
    padding: "12px 0",
    display: "flex",
    justifyContent: "space-between",
    gap: 15,
    borderBottom: "1px solid #edf1ee",
  },
  nombreFila: {
    color: "#5e6a62",
    fontSize: 14,
  },
  valorFila: {
    color: "#17211c",
    fontSize: 14,
  },
  panelTabla: {
    maxWidth: 1500,
    margin: "0 auto 22px",
    padding: 22,
    border: "1px solid #dce5df",
    borderRadius: 17,
    background: "#fff",
    boxShadow: "0 8px 25px rgba(15, 23, 42, 0.05)",
  },
  cabeceraPanel: {
    marginBottom: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  contador: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 12,
    fontWeight: 800,
  },
  tablaContenedor: {
    width: "100%",
    overflowX: "auto",
  },
  tabla: {
    width: "100%",
    minWidth: 760,
    borderCollapse: "collapse",
  },
  th: {
    padding: "11px 12px",
    borderBottom: "1px solid #dce5df",
    color: "#536058",
    fontSize: 12,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  thDerecha: {
    padding: "11px 12px",
    borderBottom: "1px solid #dce5df",
    color: "#536058",
    fontSize: 12,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  td: {
    padding: "13px 12px",
    borderBottom: "1px solid #edf1ee",
    color: "#435047",
    fontSize: 14,
  },
  tdDerecha: {
    padding: "13px 12px",
    borderBottom: "1px solid #edf1ee",
    color: "#17211c",
    fontSize: 14,
    fontWeight: 800,
    textAlign: "right",
  },
  badge: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: 999,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 12,
    fontWeight: 800,
  },
  badgeMora: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: 999,
    background: "#fff1f2",
    color: "#be123c",
    fontSize: 12,
    fontWeight: 800,
  },
  sinDatos: {
    padding: "32px 12px",
    color: "#7b867f",
    fontSize: 14,
    textAlign: "center",
  },
};
