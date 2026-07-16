"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Reportes() {
  const [cargando, setCargando] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState("");

  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [cobranzas, setCobranzas] = useState([]);
  const [movimientosCaja, setMovimientosCaja] = useState([]);

  const [fechaDesde, setFechaDesde] = useState(
    primerDiaDelMes()
  );
  const [fechaHasta, setFechaHasta] = useState(
    fechaHoy()
  );

  const [filtroEstado, setFiltroEstado] =
    useState("Todos");

  useEffect(() => {
    cargarReportes();
  }, []);

  function fechaHoy() {
    return new Date().toISOString().split("T")[0];
  }

  function primerDiaDelMes() {
    const fecha = new Date();
    return new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      1
    )
      .toISOString()
      .split("T")[0];
  }

  function obtenerEmpresaId() {
    if (typeof window === "undefined") return "";

    const empresaId =
      localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay una empresa activa.");
      window.location.href = "/login";
      return "";
    }

    return empresaId;
  }

  async function consultaSegura(tabla, empresaId) {
    try {
      const { data, error } = await supabase
        .from(tabla)
        .select("*")
        .eq("empresa_id", empresaId)
        .limit(5000);

      if (error) {
        console.warn(
          `No fue posible consultar ${tabla}:`,
          error.message
        );

        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn(
        `Error inesperado consultando ${tabla}:`,
        error
      );

      return [];
    }
  }

  async function cargarReportes() {
    const empresaId = obtenerEmpresaId();

    if (!empresaId) return;

    setCargando(true);
    setErrorGeneral("");

    try {
      const [
        datosClientes,
        datosVentas,
        datosCobranza,
        datosCaja,
      ] = await Promise.all([
        consultaSegura("clientes", empresaId),
        consultaSegura(
          "informacion_comercial",
          empresaId
        ),
        consultaSegura(
          "informacion_cobranza",
          empresaId
        ),
        consultaSegura("caja", empresaId),
      ]);

      setClientes(datosClientes);
      setVentas(datosVentas);
      setCobranzas(datosCobranza);
      setMovimientosCaja(datosCaja);
    } catch (error) {
      console.error(
        "Error cargando reportes:",
        error
      );

      setErrorGeneral(
        "No fue posible cargar la información de reportes."
      );
    } finally {
      setCargando(false);
    }
  }

  function obtenerValor(objeto, campos, defecto = 0) {
    for (const campo of campos) {
      const valor = objeto?.[campo];

      if (
        valor !== undefined &&
        valor !== null &&
        valor !== ""
      ) {
        return valor;
      }
    }

    return defecto;
  }

  function obtenerNumero(objeto, campos) {
    const valor = obtenerValor(
      objeto,
      campos,
      0
    );

    const numero = Number(
      String(valor).replace(/,/g, "")
    );

    return Number.isFinite(numero)
      ? numero
      : 0;
  }

  function obtenerFechaRegistro(registro) {
    const valor = obtenerValor(
      registro,
      [
        "fecha",
        "fecha_venta",
        "fecha_pago",
        "fecha_movimiento",
        "fecha_registro",
        "created_at",
        "updated_at",
      ],
      ""
    );

    if (!valor) return "";

    return String(valor).slice(0, 10);
  }

  function estaEnRango(registro) {
    const fecha = obtenerFechaRegistro(registro);

    if (!fecha) return true;

    if (fechaDesde && fecha < fechaDesde) {
      return false;
    }

    if (fechaHasta && fecha > fechaHasta) {
      return false;
    }

    return true;
  }

  function coincideEstado(registro) {
    if (filtroEstado === "Todos") {
      return true;
    }

    const estado = String(
      obtenerValor(
        registro,
        [
          "estado",
          "status",
          "estado_pago",
          "estado_credito",
          "estado_cuenta",
        ],
        ""
      )
    )
      .toLowerCase()
      .trim();

    return estado ===
      filtroEstado.toLowerCase().trim();
  }

  const ventasFiltradas = useMemo(
    () =>
      ventas.filter(
        (item) =>
          estaEnRango(item) &&
          coincideEstado(item)
      ),
    [ventas, fechaDesde, fechaHasta, filtroEstado]
  );

  const cobranzasFiltradas = useMemo(
    () =>
      cobranzas.filter(
        (item) =>
          estaEnRango(item) &&
          coincideEstado(item)
      ),
    [
      cobranzas,
      fechaDesde,
      fechaHasta,
      filtroEstado,
    ]
  );

  const cajaFiltrada = useMemo(
    () =>
      movimientosCaja.filter(
        (item) =>
          estaEnRango(item) &&
          coincideEstado(item)
      ),
    [
      movimientosCaja,
      fechaDesde,
      fechaHasta,
      filtroEstado,
    ]
  );

  const clientesFiltrados = useMemo(
    () => clientes.filter(estaEnRango),
    [clientes, fechaDesde, fechaHasta]
  );

  const resumen = useMemo(() => {
    const ventasTotales =
      ventasFiltradas.reduce(
        (total, venta) =>
          total +
          obtenerNumero(venta, [
            "total",
            "monto_total",
            "total_venta",
            "monto",
            "valor_total",
          ]),
        0
      );

    const ventasCredito =
      ventasFiltradas
        .filter((venta) => {
          const tipo = String(
            obtenerValor(
              venta,
              [
                "tipo_venta",
                "modalidad",
                "forma_pago",
                "condicion_venta",
              ],
              ""
            )
          ).toLowerCase();

          return tipo.includes("crédito") ||
            tipo.includes("credito");
        })
        .reduce(
          (total, venta) =>
            total +
            obtenerNumero(venta, [
              "total",
              "monto_total",
              "total_venta",
              "monto",
              "valor_total",
            ]),
          0
        );

    const carteraPendiente =
      cobranzasFiltradas.reduce(
        (total, cuenta) =>
          total +
          obtenerNumero(cuenta, [
            "saldo",
            "saldo_pendiente",
            "saldo_actual",
            "monto_pendiente",
          ]),
        0
      );

    const carteraVencida =
      cobranzasFiltradas
        .filter((cuenta) => {
          const dias = obtenerNumero(
            cuenta,
            [
              "dias_atraso",
              "dias_mora",
              "dias_vencidos",
            ]
          );

          const estado = String(
            obtenerValor(
              cuenta,
              [
                "estado",
                "status",
                "estado_cuenta",
              ],
              ""
            )
          ).toLowerCase();

          return (
            dias > 0 ||
            estado.includes("mora") ||
            estado.includes("venc")
          );
        })
        .reduce(
          (total, cuenta) =>
            total +
            obtenerNumero(cuenta, [
              "saldo",
              "saldo_pendiente",
              "saldo_actual",
              "monto_pendiente",
            ]),
          0
        );

    const cobradoPeriodo =
      cajaFiltrada
        .filter((movimiento) => {
          const tipo = String(
            obtenerValor(
              movimiento,
              [
                "tipo",
                "tipo_movimiento",
                "categoria",
                "concepto",
              ],
              ""
            )
          ).toLowerCase();

          return (
            tipo.includes("ingreso") ||
            tipo.includes("pago") ||
            tipo.includes("abono") ||
            tipo.includes("cobro")
          );
        })
        .reduce(
          (total, movimiento) =>
            total +
            obtenerNumero(movimiento, [
              "monto",
              "valor",
              "importe",
              "total",
            ]),
          0
        );

    const ingresosCaja =
      cajaFiltrada
        .filter((movimiento) => {
          const tipo = String(
            obtenerValor(
              movimiento,
              [
                "tipo",
                "tipo_movimiento",
                "naturaleza",
              ],
              ""
            )
          ).toLowerCase();

          return (
            tipo.includes("ingreso") ||
            tipo.includes("entrada") ||
            tipo === ""
          );
        })
        .reduce(
          (total, movimiento) =>
            total +
            obtenerNumero(movimiento, [
              "monto",
              "valor",
              "importe",
              "total",
            ]),
          0
        );

    const egresosCaja =
      cajaFiltrada
        .filter((movimiento) => {
          const tipo = String(
            obtenerValor(
              movimiento,
              [
                "tipo",
                "tipo_movimiento",
                "naturaleza",
              ],
              ""
            )
          ).toLowerCase();

          return (
            tipo.includes("egreso") ||
            tipo.includes("salida") ||
            tipo.includes("gasto")
          );
        })
        .reduce(
          (total, movimiento) =>
            total +
            obtenerNumero(movimiento, [
              "monto",
              "valor",
              "importe",
              "total",
            ]),
          0
        );

    const creditosActivos =
      cobranzasFiltradas.filter((cuenta) => {
        const estado = String(
          obtenerValor(
            cuenta,
            [
              "estado",
              "status",
              "estado_credito",
              "estado_cuenta",
            ],
            ""
          )
        ).toLowerCase();

        return (
          estado.includes("activo") ||
          estado.includes("vigente") ||
          estado.includes("al día") ||
          estado.includes("al dia")
        );
      }).length;

    const porcentajeMora =
      carteraPendiente > 0
        ? (carteraVencida / carteraPendiente) *
          100
        : 0;

    return {
      ventasTotales,
      ventasCredito,
      carteraPendiente,
      carteraVencida,
      cobradoPeriodo,
      ingresosCaja,
      egresosCaja,
      creditosActivos,
      clientesNuevos: clientesFiltrados.length,
      porcentajeMora,
    };
  }, [
    ventasFiltradas,
    cobranzasFiltradas,
    cajaFiltrada,
    clientesFiltrados,
  ]);

  const movimientosRecientes = useMemo(() => {
    const ventasMapeadas = ventasFiltradas.map(
      (venta) => ({
        fecha: obtenerFechaRegistro(venta),
        tipo: "Venta",
        descripcion: obtenerValor(
          venta,
          [
            "descripcion",
            "detalle",
            "producto",
            "numero_factura",
          ],
          "Venta registrada"
        ),
        monto: obtenerNumero(venta, [
          "total",
          "monto_total",
          "total_venta",
          "monto",
        ]),
      })
    );

    const cajaMapeada = cajaFiltrada.map(
      (movimiento) => ({
        fecha: obtenerFechaRegistro(movimiento),
        tipo: obtenerValor(
          movimiento,
          [
            "tipo",
            "tipo_movimiento",
            "categoria",
          ],
          "Caja"
        ),
        descripcion: obtenerValor(
          movimiento,
          [
            "descripcion",
            "detalle",
            "concepto",
            "observacion",
          ],
          "Movimiento de caja"
        ),
        monto: obtenerNumero(movimiento, [
          "monto",
          "valor",
          "importe",
          "total",
        ]),
      })
    );

    return [
      ...ventasMapeadas,
      ...cajaMapeada,
    ]
      .sort((a, b) =>
        String(b.fecha).localeCompare(
          String(a.fecha)
        )
      )
      .slice(0, 12);
  }, [ventasFiltradas, cajaFiltrada]);

  function formatoMoneda(valor) {
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Number(valor || 0));
  }

  function exportarCSV() {
    const filas = [
      ["REPORTE GENERAL KONAX"],
      ["Desde", fechaDesde],
      ["Hasta", fechaHasta],
      [],
      ["Indicador", "Resultado"],
      [
        "Ventas totales",
        resumen.ventasTotales,
      ],
      [
        "Ventas a crédito",
        resumen.ventasCredito,
      ],
      [
        "Cobrado en el período",
        resumen.cobradoPeriodo,
      ],
      [
        "Cartera pendiente",
        resumen.carteraPendiente,
      ],
      [
        "Cartera vencida",
        resumen.carteraVencida,
      ],
      [
        "Ingresos de caja",
        resumen.ingresosCaja,
      ],
      [
        "Egresos de caja",
        resumen.egresosCaja,
      ],
      [
        "Créditos activos",
        resumen.creditosActivos,
      ],
      [
        "Clientes nuevos",
        resumen.clientesNuevos,
      ],
      [
        "Porcentaje de mora",
        `${resumen.porcentajeMora.toFixed(2)}%`,
      ],
    ];

    const contenido = filas
      .map((fila) =>
        fila
          .map((celda) =>
            `"${String(celda ?? "").replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      )
      .join("\n");

    const archivo = new Blob([contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(archivo);

    const enlace =
      document.createElement("a");

    enlace.href = url;
    enlace.download = `reporte-general-${fechaDesde}-${fechaHasta}.csv`;
    enlace.click();

    URL.revokeObjectURL(url);
  }

  function descargarPDF() {
    window.print();
  }

  function limpiarFiltros() {
    setFechaDesde(primerDiaDelMes());
    setFechaHasta(fechaHoy());
    setFiltroEstado("Todos");
  }

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  if (cargando) {
    return (
      <div style={pantallaCarga}>
        <div style={spinner}></div>
        <p>Cargando reportes...</p>
      </div>
    );
  }

  return (
    <main style={pagina}>
      <header style={encabezado}>
        <div>
          <span style={etiqueta}>
            CENTRO DE REPORTES Y ANÁLISIS
          </span>

          <h1 style={titulo}>
            Reporte general
          </h1>

          <p style={subtitulo}>
            Consulta el comportamiento de ventas,
            créditos, cobranza, clientes y caja
            desde un solo lugar.
          </p>
        </div>

        <div style={accionesSuperior}>
          <button
            type="button"
            onClick={volverDashboard}
            style={botonSecundario}
          >
            ← Volver al dashboard
          </button>

          <button
            type="button"
            onClick={cargarReportes}
            style={botonActualizar}
          >
            Actualizar datos
          </button>
        </div>
      </header>

      {errorGeneral && (
        <div style={alertaError}>
          {errorGeneral}
        </div>
      )}

      <section style={panelFiltros}>
        <div style={campoFiltro}>
          <label style={labelFiltro}>
            Desde
          </label>

          <input
            type="date"
            value={fechaDesde}
            onChange={(e) =>
              setFechaDesde(e.target.value)
            }
            style={inputFiltro}
          />
        </div>

        <div style={campoFiltro}>
          <label style={labelFiltro}>
            Hasta
          </label>

          <input
            type="date"
            value={fechaHasta}
            onChange={(e) =>
              setFechaHasta(e.target.value)
            }
            style={inputFiltro}
          />
        </div>

        <div style={campoFiltro}>
          <label style={labelFiltro}>
            Estado
          </label>

          <select
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(e.target.value)
            }
            style={inputFiltro}
          >
            <option value="Todos">
              Todos
            </option>
            <option value="Activo">
              Activo
            </option>
            <option value="Al día">
              Al día
            </option>
            <option value="En mora">
              En mora
            </option>
            <option value="Vencido">
              Vencido
            </option>
            <option value="Pagado">
              Pagado
            </option>
          </select>
        </div>

        <div style={botonesFiltro}>
          <button
            type="button"
            onClick={limpiarFiltros}
            style={botonLimpiar}
          >
            Limpiar
          </button>

          <button
            type="button"
            onClick={exportarCSV}
            style={botonExportar}
          >
            Exportar Excel
          </button>

          <button
            type="button"
            onClick={descargarPDF}
            style={botonPDF}
          >
            Descargar PDF
          </button>
        </div>
      </section>

      <section style={gridIndicadores}>
        <TarjetaIndicador
          titulo="Ventas totales"
          valor={formatoMoneda(
            resumen.ventasTotales
          )}
          detalle={`${ventasFiltradas.length} operaciones`}
          icono="📈"
        />

        <TarjetaIndicador
          titulo="Ventas a crédito"
          valor={formatoMoneda(
            resumen.ventasCredito
          )}
          detalle="Monto financiado"
          icono="💳"
        />

        <TarjetaIndicador
          titulo="Cobrado en el período"
          valor={formatoMoneda(
            resumen.cobradoPeriodo
          )}
          detalle="Pagos y abonos"
          icono="💰"
        />

        <TarjetaIndicador
          titulo="Cartera pendiente"
          valor={formatoMoneda(
            resumen.carteraPendiente
          )}
          detalle={`${cobranzasFiltradas.length} cuentas`}
          icono="🧾"
        />

        <TarjetaIndicador
          titulo="Cartera vencida"
          valor={formatoMoneda(
            resumen.carteraVencida
          )}
          detalle="Saldo en mora"
          icono="⚠️"
        />

        <TarjetaIndicador
          titulo="Ingresos de caja"
          valor={formatoMoneda(
            resumen.ingresosCaja
          )}
          detalle="Entradas registradas"
          icono="🏦"
        />

        <TarjetaIndicador
          titulo="Egresos de caja"
          valor={formatoMoneda(
            resumen.egresosCaja
          )}
          detalle="Salidas registradas"
          icono="📤"
        />

        <TarjetaIndicador
          titulo="Créditos activos"
          valor={resumen.creditosActivos}
          detalle="Operaciones vigentes"
          icono="✅"
        />

        <TarjetaIndicador
          titulo="Clientes nuevos"
          valor={resumen.clientesNuevos}
          detalle="En el período"
          icono="👥"
        />

        <TarjetaIndicador
          titulo="Porcentaje de mora"
          valor={`${resumen.porcentajeMora.toFixed(
            1
          )}%`}
          detalle="Sobre cartera pendiente"
          icono="📊"
        />
      </section>

      <section style={gridResumenes}>
        <article style={panelResumen}>
          <div style={cabeceraPanel}>
            <div>
              <span style={miniEtiqueta}>
                VENTAS
              </span>
              <h2 style={tituloPanel}>
                Resumen comercial
              </h2>
            </div>

            <span style={iconoPanel}>📈</span>
          </div>

          <FilaResumen
            nombre="Ventas totales"
            valor={formatoMoneda(
              resumen.ventasTotales
            )}
          />

          <FilaResumen
            nombre="Ventas a crédito"
            valor={formatoMoneda(
              resumen.ventasCredito
            )}
          />

          <FilaResumen
            nombre="Operaciones registradas"
            valor={ventasFiltradas.length}
          />

          <FilaResumen
            nombre="Ticket promedio"
            valor={formatoMoneda(
              ventasFiltradas.length > 0
                ? resumen.ventasTotales /
                    ventasFiltradas.length
                : 0
            )}
          />
        </article>

        <article style={panelResumen}>
          <div style={cabeceraPanel}>
            <div>
              <span style={miniEtiqueta}>
                COBRANZA
              </span>
              <h2 style={tituloPanel}>
                Resumen de cartera
              </h2>
            </div>

            <span style={iconoPanel}>📞</span>
          </div>

          <FilaResumen
            nombre="Cartera pendiente"
            valor={formatoMoneda(
              resumen.carteraPendiente
            )}
          />

          <FilaResumen
            nombre="Cartera vencida"
            valor={formatoMoneda(
              resumen.carteraVencida
            )}
          />

          <FilaResumen
            nombre="Créditos activos"
            valor={resumen.creditosActivos}
          />

          <FilaResumen
            nombre="Índice de mora"
            valor={`${resumen.porcentajeMora.toFixed(
              1
            )}%`}
          />
        </article>

        <article style={panelResumen}>
          <div style={cabeceraPanel}>
            <div>
              <span style={miniEtiqueta}>
                CAJA
              </span>
              <h2 style={tituloPanel}>
                Resumen financiero
              </h2>
            </div>

            <span style={iconoPanel}>🏦</span>
          </div>

          <FilaResumen
            nombre="Ingresos"
            valor={formatoMoneda(
              resumen.ingresosCaja
            )}
          />

          <FilaResumen
            nombre="Egresos"
            valor={formatoMoneda(
              resumen.egresosCaja
            )}
          />

          <FilaResumen
            nombre="Balance del período"
            valor={formatoMoneda(
              resumen.ingresosCaja -
                resumen.egresosCaja
            )}
          />

          <FilaResumen
            nombre="Movimientos"
            valor={cajaFiltrada.length}
          />
        </article>
      </section>

      <section style={panelTabla}>
        <div style={cabeceraTabla}>
          <div>
            <span style={miniEtiqueta}>
              ACTIVIDAD RECIENTE
            </span>

            <h2 style={tituloPanel}>
              Últimos movimientos
            </h2>
          </div>

          <span style={contadorTabla}>
            {movimientosRecientes.length} registros
          </span>
        </div>

        <div style={contenedorTabla}>
          <table style={tabla}>
            <thead>
              <tr>
                <th style={th}>Fecha</th>
                <th style={th}>Tipo</th>
                <th style={th}>
                  Descripción
                </th>
                <th style={thDerecha}>
                  Monto
                </th>
              </tr>
            </thead>

            <tbody>
              {movimientosRecientes.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="4"
                    style={sinDatos}
                  >
                    No hay movimientos para el
                    período seleccionado.
                  </td>
                </tr>
              ) : (
                movimientosRecientes.map(
                  (movimiento, index) => (
                    <tr key={`${movimiento.tipo}-${index}`}>
                      <td style={td}>
                        {movimiento.fecha ||
                          "Sin fecha"}
                      </td>

                      <td style={td}>
                        <span style={badgeTipo}>
                          {movimiento.tipo}
                        </span>
                      </td>

                      <td style={td}>
                        {movimiento.descripcion}
                      </td>

                      <td style={tdDerecha}>
                        {formatoMoneda(
                          movimiento.monto
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function TarjetaIndicador({
  titulo,
  valor,
  detalle,
  icono,
}) {
  return (
    <article style={tarjetaIndicador}>
      <div style={iconoIndicador}>{icono}</div>

      <div>
        <p style={tituloIndicador}>
          {titulo}
        </p>

        <strong style={valorIndicador}>
          {valor}
        </strong>

        <span style={detalleIndicador}>
          {detalle}
        </span>
      </div>
    </article>
  );
}

function FilaResumen({ nombre, valor }) {
  return (
    <div style={filaResumen}>
      <span style={nombreResumen}>
        {nombre}
      </span>

      <strong style={valorResumen}>
        {valor}
      </strong>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  padding: "34px",
  background: "#f4f7f5",
  fontFamily: "Arial, sans-serif",
  color: "#17211c",
};

const pantallaCarga = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: "14px",
  background: "#f4f7f5",
  fontFamily: "Arial, sans-serif",
  color: "#166534",
};

const spinner = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  border: "5px solid #dce9e1",
  borderTopColor: "#16834f",
  animation: "spin 1s linear infinite",
};

const encabezado = {
  maxWidth: "1500px",
  margin: "0 auto 28px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "24px",
};

const etiqueta = {
  display: "inline-block",
  marginBottom: "8px",
  color: "#16834f",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "1.5px",
};

const titulo = {
  margin: "0 0 10px",
  fontSize: "42px",
  lineHeight: 1.08,
};

const subtitulo = {
  maxWidth: "760px",
  margin: 0,
  color: "#68736c",
  fontSize: "17px",
  lineHeight: 1.6,
};

const accionesSuperior = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const botonSecundario = {
  minHeight: "44px",
  padding: "10px 16px",
  border: "1px solid #cfd9d3",
  borderRadius: "10px",
  background: "#ffffff",
  color: "#243129",
  fontWeight: "800",
  cursor: "pointer",
};

const botonActualizar = {
  minHeight: "44px",
  padding: "10px 18px",
  border: "none",
  borderRadius: "10px",
  background: "#16834f",
  color: "#ffffff",
  fontWeight: "800",
  cursor: "pointer",
};

const alertaError = {
  maxWidth: "1500px",
  margin: "0 auto 20px",
  padding: "14px 18px",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  background: "#fef2f2",
  color: "#991b1b",
  fontWeight: "700",
};

const panelFiltros = {
  maxWidth: "1500px",
  margin: "0 auto 24px",
  padding: "20px",
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(160px, 1fr)) auto",
  gap: "14px",
  alignItems: "end",
  border: "1px solid #dde5e0",
  borderRadius: "18px",
  background: "#ffffff",
  boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
};

const campoFiltro = {
  display: "flex",
  flexDirection: "column",
  gap: "7px",
};

const labelFiltro = {
  color: "#4b5850",
  fontSize: "13px",
  fontWeight: "800",
};

const inputFiltro = {
  width: "100%",
  minHeight: "44px",
  padding: "10px 12px",
  border: "1px solid #cfd9d3",
  borderRadius: "10px",
  background: "#ffffff",
  color: "#17211c",
  fontSize: "14px",
  outline: "none",
};

const botonesFiltro = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const botonLimpiar = {
  minHeight: "44px",
  padding: "10px 15px",
  border: "1px solid #cfd9d3",
  borderRadius: "10px",
  background: "#ffffff",
  color: "#334139",
  fontWeight: "800",
  cursor: "pointer",
};

const botonExportar = {
  minHeight: "44px",
  padding: "10px 15px",
  border: "none",
  borderRadius: "10px",
  background: "#0f766e",
  color: "#ffffff",
  fontWeight: "800",
  cursor: "pointer",
};

const botonPDF = {
  minHeight: "44px",
  padding: "10px 15px",
  border: "none",
  borderRadius: "10px",
  background: "#111827",
  color: "#ffffff",
  fontWeight: "800",
  cursor: "pointer",
};

const gridIndicadores = {
  maxWidth: "1500px",
  margin: "0 auto 24px",
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "16px",
};

const tarjetaIndicador = {
  minHeight: "142px",
  padding: "20px",
  display: "grid",
  gridTemplateColumns: "52px 1fr",
  gap: "14px",
  alignItems: "start",
  border: "1px solid #dde5e0",
  borderRadius: "18px",
  background: "#ffffff",
  boxShadow: "0 10px 26px rgba(15,23,42,0.05)",
};

const iconoIndicador = {
  width: "52px",
  height: "52px",
  display: "grid",
  placeItems: "center",
  borderRadius: "14px",
  background: "#eaf7f0",
  fontSize: "25px",
};

const tituloIndicador = {
  margin: "0 0 8px",
  color: "#68736c",
  fontSize: "13px",
  fontWeight: "800",
};

const valorIndicador = {
  display: "block",
  marginBottom: "7px",
  fontSize: "25px",
  lineHeight: 1.1,
};

const detalleIndicador = {
  color: "#7d8881",
  fontSize: "12px",
};

const gridResumenes = {
  maxWidth: "1500px",
  margin: "0 auto 24px",
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(310px, 1fr))",
  gap: "18px",
};

const panelResumen = {
  padding: "24px",
  border: "1px solid #dde5e0",
  borderRadius: "18px",
  background: "#ffffff",
  boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
};

const cabeceraPanel = {
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "15px",
};

const miniEtiqueta = {
  display: "block",
  marginBottom: "6px",
  color: "#16834f",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "1.3px",
};

const tituloPanel = {
  margin: 0,
  fontSize: "22px",
};

const iconoPanel = {
  fontSize: "30px",
};

const filaResumen = {
  padding: "13px 0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  borderBottom: "1px solid #eef2ef",
};

const nombreResumen = {
  color: "#5f6b63",
  fontSize: "14px",
};

const valorResumen = {
  color: "#17211c",
  fontSize: "15px",
};

const panelTabla = {
  maxWidth: "1500px",
  margin: "0 auto",
  padding: "24px",
  border: "1px solid #dde5e0",
  borderRadius: "18px",
  background: "#ffffff",
  boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
};

const cabeceraTabla = {
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
};

const contadorTabla = {
  padding: "7px 11px",
  borderRadius: "999px",
  background: "#edf8f1",
  color: "#16834f",
  fontSize: "12px",
  fontWeight: "800",
};

const contenedorTabla = {
  width: "100%",
  overflowX: "auto",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "720px",
};

const th = {
  padding: "12px",
  textAlign: "left",
  borderBottom: "1px solid #dfe7e2",
  color: "#536058",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.7px",
};

const thDerecha = {
  ...th,
  textAlign: "right",
};

const td = {
  padding: "14px 12px",
  borderBottom: "1px solid #eef2ef",
  color: "#435047",
  fontSize: "14px",
};

const tdDerecha = {
  ...td,
  textAlign: "right",
  color: "#17211c",
  fontWeight: "800",
};

const badgeTipo = {
  display: "inline-block",
  padding: "6px 9px",
  borderRadius: "999px",
  background: "#eef8f2",
  color: "#16834f",
  fontSize: "12px",
  fontWeight: "800",
};

const sinDatos = {
  padding: "36px 15px",
  textAlign: "center",
  color: "#7b867f",
  fontSize: "14px",
};

