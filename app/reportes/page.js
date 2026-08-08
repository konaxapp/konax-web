"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ReportesPage() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [tipoNegocio, setTipoNegocio] = useState("");
  const [planCodigo, setPlanCodigo] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");

  const [clientes, setClientes] = useState([]);
  const [comercial, setComercial] = useState([]);
  const [cobranza, setCobranza] = useState([]);
  const [caja, setCaja] = useState([]);
  const [suscripciones, setSuscripciones] = useState([]);
  const [productos, setProductos] = useState([]);

  const [fechaDesde, setFechaDesde] = useState(primerDiaMes());
  const [fechaHasta, setFechaHasta] = useState(fechaActual());
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTipoNegocio(localStorage.getItem("tipoNegocio") || "");
      setPlanCodigo(localStorage.getItem("planCodigo") || "");
      setEmpresaNombre(localStorage.getItem("empresaNombre") || "");
    }

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

  async function consultarTabla(tabla, empresaId, opcional = false) {
    const { data, error: errorConsulta } = await supabase
      .from(tabla)
      .select("*")
      .eq("empresa_id", empresaId)
      .limit(10000);

    if (errorConsulta) {
      if (opcional) {
        console.warn(`Tabla opcional ${tabla}:`, errorConsulta.message);
        return [];
      }

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
      const [
        clientesData,
        comercialData,
        cobranzaData,
        cajaData,
        suscripcionesData,
        productosData,
      ] = await Promise.all([
        consultarTabla("clientes", empresaId),
        consultarTabla("informacion_comercial", empresaId, true),
        consultarTabla("informacion_cobranza", empresaId, true),
        consultarTabla("caja", empresaId, true),
        consultarTabla("suscripciones", empresaId, true),
        consultarTabla("productos", empresaId, true),
      ]);

      setClientes(clientesData);
      setComercial(comercialData);
      setCobranza(cobranzaData);
      setCaja(cajaData);
      setSuscripciones(suscripcionesData);
      setProductos(productosData);
    } catch (err) {
      console.error("Error cargando reportes:", err);
      setError(
        "No fue posible cargar todos los datos. Revisa las políticas RLS y el acceso de la empresa."
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

  function obtenerFechaSuscripcion(registro) {
    return fechaCorta(
      registro.fecha_fin ||
        registro.fecha_vencimiento ||
        registro.fecha_proximo_pago ||
        registro.proxima_fecha_pago ||
        registro.vencimiento ||
        registro.created_at
    );
  }

  function obtenerFechaInicioSuscripcion(registro) {
    return fechaCorta(
      registro.fecha_inicio ||
        registro.fecha_alta ||
        registro.created_at
    );
  }

  function obtenerNombreCliente(registro) {
    const cliente = clientes.find(
      (item) => String(item.id) === String(registro.cliente_id)
    );

    return (
      registro.cliente_nombre ||
      registro.nombre_cliente ||
      cliente?.nombre ||
      cliente?.nombre_completo ||
      "Cliente sin nombre"
    );
  }

  const tipoNormalizado = textoNormalizado(tipoNegocio);
  const esGimnasio =
    tipoNormalizado.includes("gimnasio") ||
    tipoNormalizado.includes("fitness") ||
    tipoNormalizado.includes("gym");

  const esReporteSuscripciones =
    esGimnasio ||
    textoNormalizado(planCodigo) === "ventas_gestion";

  const clientesPeriodo = useMemo(() => {
    return clientes.filter((cliente) => estaEnRango(cliente.created_at));
  }, [clientes, fechaDesde, fechaHasta]);

  const comercialPeriodo = useMemo(() => {
    return comercial.filter((registro) => {
      const cumpleFecha = estaEnRango(
        registro.fecha_inicio || registro.created_at
      );

      const cumpleEstado =
        estadoFiltro === "Todos" ||
        textoNormalizado(registro.estado) === textoNormalizado(estadoFiltro);

      return cumpleFecha && cumpleEstado;
    });
  }, [comercial, fechaDesde, fechaHasta, estadoFiltro]);

  const cajaPeriodo = useMemo(() => {
    return caja.filter((movimiento) => {
      const estado = textoNormalizado(movimiento.estado);
      const procesado = !estado || estado === "procesado" || estado === "pagado";

      return (
        procesado &&
        estaEnRango(movimiento.fecha_pago || movimiento.fecha || movimiento.created_at)
      );
    });
  }, [caja, fechaDesde, fechaHasta]);

  const suscripcionesPeriodo = useMemo(() => {
    return suscripciones.filter((registro) => {
      const fecha = obtenerFechaInicioSuscripcion(registro);
      const cumpleFecha = fecha ? estaEnRango(fecha) : true;

      const cumpleEstado =
        estadoFiltro === "Todos" ||
        textoNormalizado(registro.estado) === textoNormalizado(estadoFiltro);

      return cumpleFecha && cumpleEstado;
    });
  }, [suscripciones, fechaDesde, fechaHasta, estadoFiltro]);

  const cobranzaPorCredito = useMemo(() => {
    const mapa = new Map();

    cobranza.forEach((registro) => {
      if (registro.informacion_comercial_id) {
        mapa.set(registro.informacion_comercial_id, registro);
      }
    });

    return mapa;
  }, [cobranza]);

  const resumenCaja = useMemo(() => {
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

    return {
      ingresosCaja,
      egresosCaja,
      balance: ingresosCaja - egresosCaja,
    };
  }, [cajaPeriodo]);

  const resumenGeneral = useMemo(() => {
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
      porcentajeMora,
      ticketPromedio,
      clientesNuevos: clientesPeriodo.length,
      ...resumenCaja,
    };
  }, [
    comercialPeriodo,
    clientesPeriodo,
    cobranzaPorCredito,
    resumenCaja,
  ]);

  const resumenGimnasio = useMemo(() => {
    const hoy = fechaActual();
    const enSieteDias = new Date();
    enSieteDias.setDate(enSieteDias.getDate() + 7);
    const limiteProximo = enSieteDias.toISOString().slice(0, 10);

    const activas = suscripciones.filter((registro) => {
      const estado = textoNormalizado(registro.estado);
      const vencimiento = obtenerFechaSuscripcion(registro);

      if (estado.includes("cancel") || estado.includes("suspend")) return false;
      if (vencimiento && vencimiento < hoy) return false;

      return estado.includes("activ") || !estado;
    });

    const vencidas = suscripciones.filter((registro) => {
      const estado = textoNormalizado(registro.estado);
      const vencimiento = obtenerFechaSuscripcion(registro);

      return (
        estado.includes("venc") ||
        (vencimiento && vencimiento < hoy)
      );
    });

    const proximasVencer = suscripciones.filter((registro) => {
      const vencimiento = obtenerFechaSuscripcion(registro);
      return vencimiento && vencimiento >= hoy && vencimiento <= limiteProximo;
    });

    const renovaciones = suscripcionesPeriodo.filter((registro) => {
      const texto = textoNormalizado(
        `${registro.tipo || ""} ${registro.descripcion || ""} ${registro.estado || ""}`
      );
      return texto.includes("renov");
    }).length;

    const ingresosMembresias = cajaPeriodo
      .filter((movimiento) => {
        const texto = textoNormalizado(
          `${movimiento.tipo || ""} ${movimiento.descripcion || ""} ${movimiento.concepto || ""}`
        );

        return (
          texto.includes("suscripcion") ||
          texto.includes("membresia") ||
          texto.includes("mensualidad") ||
          texto.includes("renovacion")
        );
      })
      .reduce((total, movimiento) => total + numero(movimiento.monto), 0);

    const ventasProductos = comercialPeriodo
      .filter((registro) => {
        const tipo = textoNormalizado(registro.tipo_producto);
        return tipo.includes("venta") && !tipo.includes("credito");
      })
      .reduce((total, registro) => total + numero(registro.monto_total), 0);

    const productosBajoStock = productos.filter((producto) => {
      const stock = numero(producto.stock_actual ?? producto.stock);
      const minimo = numero(producto.stock_minimo);
      return minimo > 0 && stock <= minimo;
    });

    return {
      miembrosActivos: activas.length,
      membresiasVencidas: vencidas.length,
      proximasVencer: proximasVencer.length,
      renovaciones,
      ingresosMembresias,
      ventasProductos,
      clientesNuevos: clientesPeriodo.length,
      productosBajoStock: productosBajoStock.length,
      suscripcionesActivas: activas,
      suscripcionesVencidas: vencidas,
      suscripcionesProximas: proximasVencer,
      ...resumenCaja,
    };
  }, [
    suscripciones,
    suscripcionesPeriodo,
    cajaPeriodo,
    comercialPeriodo,
    clientesPeriodo,
    productos,
    resumenCaja,
  ]);

  const movimientosRecientes = useMemo(() => {
    const movimientosComerciales = comercialPeriodo.map((registro) => ({
      id: `comercial-${registro.id}`,
      fecha: fechaCorta(registro.fecha_inicio || registro.created_at),
      tipo: registro.tipo_producto || "Venta",
      detalle:
        registro.numero_cuenta ||
        registro.descripcion ||
        "Operación comercial",
      responsable: registro.responsable || "Sin asignar",
      monto: numero(registro.monto_total),
    }));

    const movimientosCaja = cajaPeriodo.map((registro) => ({
      id: `caja-${registro.id}`,
      fecha: fechaCorta(
        registro.fecha_pago || registro.fecha || registro.created_at
      ),
      tipo: registro.tipo || "Caja",
      detalle:
        registro.cliente_nombre ||
        registro.descripcion ||
        registro.numero_transaccion ||
        "Movimiento de caja",
      responsable: registro.usuario || registro.responsable || "Sin asignar",
      monto: numero(registro.monto),
    }));

    const movimientosSuscripciones = esReporteSuscripciones
      ? suscripcionesPeriodo.map((registro) => ({
          id: `suscripcion-${registro.id}`,
          fecha: obtenerFechaInicioSuscripcion(registro),
          tipo: "Membresía",
          detalle: `${obtenerNombreCliente(registro)} · ${
            registro.plan_nombre || registro.nombre_plan || "Plan"
          }`,
          responsable: registro.responsable || "Sistema",
          monto: numero(registro.monto || registro.precio || registro.total),
        }))
      : [];

    return [
      ...movimientosComerciales,
      ...movimientosCaja,
      ...movimientosSuscripciones,
    ]
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
      .slice(0, 5);
  }, [
    comercialPeriodo,
    cajaPeriodo,
    suscripcionesPeriodo,
    esReporteSuscripciones,
    clientes,
  ]);

  const cuentasMora = useMemo(() => {
    return comercialPeriodo
      .map((registro) => {
        const datoCobranza = cobranzaPorCredito.get(registro.id);
        const diasMora = numero(datoCobranza?.dias_mora);

        return {
          id: registro.id,
          cuenta: registro.numero_cuenta || "Sin número",
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

  const membresiasTabla = useMemo(() => {
    const hoy = fechaActual();

    return suscripciones
      .map((registro) => {
        const vencimiento = obtenerFechaSuscripcion(registro);
        const diferencia = vencimiento
          ? Math.ceil(
              (new Date(`${vencimiento}T00:00:00`).getTime() -
                new Date(`${hoy}T00:00:00`).getTime()) /
                86400000
            )
          : null;

        let estado = registro.estado || "Activa";

        if (diferencia !== null && diferencia < 0) estado = "Vencida";
        else if (diferencia !== null && diferencia <= 7) estado = "Por vencer";

        return {
          id: registro.id,
          cliente: obtenerNombreCliente(registro),
          plan: registro.plan_nombre || registro.nombre_plan || "Sin plan",
          vencimiento: vencimiento || "Sin fecha",
          dias: diferencia,
          estado,
        };
      })
      .filter((registro) => {
        const estado = textoNormalizado(registro.estado);
        return estado.includes("venc") || estado.includes("por vencer");
      })
      .sort((a, b) =>
        String(a.vencimiento).localeCompare(String(b.vencimiento))
      );
  }, [suscripciones, clientes]);

  function moneda(valor) {
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(numero(valor));
  }

  function exportarExcel() {
    const filas = esReporteSuscripciones
      ? [
          ["REPORTE KONAX - MEMBRESÍAS Y GESTIÓN"],
          ["Empresa", empresaNombre || "Empresa"],
          ["Desde", fechaDesde],
          ["Hasta", fechaHasta],
          [],
          ["Indicador", "Resultado"],
          ["Miembros activos", resumenGimnasio.miembrosActivos],
          ["Membresías próximas a vencer", resumenGimnasio.proximasVencer],
          ["Membresías vencidas", resumenGimnasio.membresiasVencidas],
          ["Renovaciones", resumenGimnasio.renovaciones],
          ["Ingresos por membresías", resumenGimnasio.ingresosMembresias],
          ["Ventas de productos", resumenGimnasio.ventasProductos],
          ["Ingresos de caja", resumenGimnasio.ingresosCaja],
          ["Egresos de caja", resumenGimnasio.egresosCaja],
          ["Balance", resumenGimnasio.balance],
          ["Clientes nuevos", resumenGimnasio.clientesNuevos],
          ["Productos con bajo stock", resumenGimnasio.productosBajoStock],
        ]
      : [
          ["REPORTE GENERAL KONAX"],
          ["Desde", fechaDesde],
          ["Hasta", fechaHasta],
          [],
          ["Indicador", "Resultado"],
          ["Créditos otorgados", resumenGeneral.montoCreditos],
          ["Ventas registradas", resumenGeneral.montoVentas],
          ["Cartera pendiente", resumenGeneral.carteraPendiente],
          ["Cartera vencida", resumenGeneral.carteraVencida],
          ["Cuentas en mora", resumenGeneral.cuentasEnMora],
          ["Ingresos de caja", resumenGeneral.ingresosCaja],
          ["Egresos de caja", resumenGeneral.egresosCaja],
          ["Clientes nuevos", resumenGeneral.clientesNuevos],
          ["Porcentaje de mora", `${resumenGeneral.porcentajeMora.toFixed(2)}%`],
        ];

    const csv =
      "\uFEFF" +
      filas
        .map((fila) =>
          fila
            .map((celda) => `"${String(celda ?? "").replace(/"/g, '""')}"`)
            .join(";")
        )
        .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = `reporte-${fechaDesde}-${fechaHasta}.csv`;
    enlace.click();

    URL.revokeObjectURL(url);
  }

  function descargarPDF() {
    window.print();
  }

  function limpiarFiltros() {
    setFechaDesde(primerDiaMes());
    setFechaHasta(fechaActual());
    setEstadoFiltro("Todos");
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
          <h1 style={estilos.titulo}>
            {esReporteSuscripciones
              ? "Reporte de membresías y gestión"
              : "Reporte general"}
          </h1>
          <p style={estilos.subtitulo}>
            {esReporteSuscripciones
              ? "Información consolidada de miembros, membresías, caja, ventas e inventario."
              : "Información consolidada de créditos, cobranza, caja y clientes."}
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

        <Campo
          label={
            esReporteSuscripciones
              ? "Estado de la membresía"
              : "Estado del crédito"
          }
        >
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            style={estilos.input}
          >
            <option value="Todos">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Vencido">Vencido</option>
            <option value="Suspendido">Suspendido</option>
            <option value="Cancelado">Cancelado</option>
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

      {esReporteSuscripciones ? (
        <>
          <section style={estilos.tarjetas}>
            <Tarjeta
              icono="🏋️"
              titulo="Miembros activos"
              valor={resumenGimnasio.miembrosActivos}
              detalle="Membresías vigentes"
            />

            <Tarjeta
              icono="📅"
              titulo="Próximas a vencer"
              valor={resumenGimnasio.proximasVencer}
              detalle="Vencen en los próximos 7 días"
            />

            <Tarjeta
              icono="⚠️"
              titulo="Membresías vencidas"
              valor={resumenGimnasio.membresiasVencidas}
              detalle="Requieren seguimiento"
            />

            <Tarjeta
              icono="🔁"
              titulo="Renovaciones"
              valor={resumenGimnasio.renovaciones}
              detalle="Registradas en el período"
            />

            <Tarjeta
              icono="💳"
              titulo="Ingresos por membresías"
              valor={moneda(resumenGimnasio.ingresosMembresias)}
              detalle="Mensualidades y renovaciones"
            />

            <Tarjeta
              icono="🛒"
              titulo="Ventas de productos"
              valor={moneda(resumenGimnasio.ventasProductos)}
              detalle="Bebidas, accesorios y otros"
            />

            <Tarjeta
              icono="🏦"
              titulo="Ingresos de caja"
              valor={moneda(resumenGimnasio.ingresosCaja)}
              detalle="Movimientos de entrada"
            />

            <Tarjeta
              icono="📤"
              titulo="Egresos de caja"
              valor={moneda(resumenGimnasio.egresosCaja)}
              detalle="Gastos, retiros y salidas"
            />

            <Tarjeta
              icono="👥"
              titulo="Clientes nuevos"
              valor={resumenGimnasio.clientesNuevos}
              detalle="Registrados en el período"
            />

            <Tarjeta
              icono="📦"
              titulo="Stock bajo"
              valor={resumenGimnasio.productosBajoStock}
              detalle="Productos que requieren reposición"
            />
          </section>

          <section style={estilos.resumenes}>
            <Panel titulo="Resumen de membresías" etiqueta="MEMBRESÍAS">
              <Fila
                nombre="Miembros activos"
                valor={resumenGimnasio.miembrosActivos}
              />
              <Fila
                nombre="Próximas a vencer"
                valor={resumenGimnasio.proximasVencer}
              />
              <Fila
                nombre="Membresías vencidas"
                valor={resumenGimnasio.membresiasVencidas}
              />
              <Fila
                nombre="Renovaciones"
                valor={resumenGimnasio.renovaciones}
              />
            </Panel>

            <Panel titulo="Resumen comercial" etiqueta="VENTAS">
              <Fila
                nombre="Ingresos por membresías"
                valor={moneda(resumenGimnasio.ingresosMembresias)}
              />
              <Fila
                nombre="Ventas de productos"
                valor={moneda(resumenGimnasio.ventasProductos)}
              />
              <Fila
                nombre="Clientes nuevos"
                valor={resumenGimnasio.clientesNuevos}
              />
              <Fila
                nombre="Productos con stock bajo"
                valor={resumenGimnasio.productosBajoStock}
              />
            </Panel>

            <Panel titulo="Resumen de caja" etiqueta="CAJA">
              <Fila
                nombre="Ingresos"
                valor={moneda(resumenGimnasio.ingresosCaja)}
              />
              <Fila
                nombre="Egresos"
                valor={moneda(resumenGimnasio.egresosCaja)}
              />
              <Fila
                nombre="Balance"
                valor={moneda(resumenGimnasio.balance)}
              />
              <Fila nombre="Movimientos" valor={cajaPeriodo.length} />
            </Panel>
          </section>

          <section style={estilos.panelTabla}>
            <div style={estilos.cabeceraPanel}>
              <div>
                <span style={estilos.miniEtiqueta}>SEGUIMIENTO</span>
                <h2 style={estilos.tituloPanel}>
                  Membresías vencidas o próximas a vencer
                </h2>
              </div>
              <span style={estilos.contador}>
                {membresiasTabla.length} registros
              </span>
            </div>

            <div style={estilos.tablaContenedor}>
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>Cliente</th>
                    <th style={estilos.th}>Plan</th>
                    <th style={estilos.th}>Vencimiento</th>
                    <th style={estilos.th}>Estado</th>
                    <th style={estilos.thDerecha}>Días</th>
                  </tr>
                </thead>

                <tbody>
                  {membresiasTabla.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={estilos.sinDatos}>
                        No hay membresías vencidas ni próximas a vencer.
                      </td>
                    </tr>
                  ) : (
                    membresiasTabla.map((registro) => (
                      <tr key={registro.id}>
                        <td style={estilos.td}>{registro.cliente}</td>
                        <td style={estilos.td}>{registro.plan}</td>
                        <td style={estilos.td}>{registro.vencimiento}</td>
                        <td style={estilos.td}>
                          <span
                            style={
                              textoNormalizado(registro.estado).includes("vencida")
                                ? estilos.badgeMora
                                : estilos.badge
                            }
                          >
                            {registro.estado}
                          </span>
                        </td>
                        <td style={estilos.tdDerecha}>
                          {registro.dias === null
                            ? "-"
                            : registro.dias < 0
                            ? `${Math.abs(registro.dias)} vencidos`
                            : `${registro.dias} restantes`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <section style={estilos.tarjetas}>
            <Tarjeta
              icono="💳"
              titulo="Créditos otorgados"
              valor={moneda(resumenGeneral.montoCreditos)}
              detalle={`${comercialPeriodo.length} operaciones en el período`}
            />
            <Tarjeta
              icono="🛒"
              titulo="Ventas registradas"
              valor={moneda(resumenGeneral.montoVentas)}
              detalle="Operaciones no clasificadas como crédito"
            />
            <Tarjeta
              icono="🧾"
              titulo="Cartera pendiente"
              valor={moneda(resumenGeneral.carteraPendiente)}
              detalle="Suma del saldo actual"
            />
            <Tarjeta
              icono="⚠️"
              titulo="Cartera vencida"
              valor={moneda(resumenGeneral.carteraVencida)}
              detalle={`${resumenGeneral.cuentasEnMora} cuentas con días de mora`}
            />
            <Tarjeta
              icono="🏦"
              titulo="Ingresos de caja"
              valor={moneda(resumenGeneral.ingresosCaja)}
              detalle="Movimientos procesados de entrada"
            />
            <Tarjeta
              icono="📤"
              titulo="Egresos de caja"
              valor={moneda(resumenGeneral.egresosCaja)}
              detalle="Gastos, retiros y salidas"
            />
            <Tarjeta
              icono="👥"
              titulo="Clientes nuevos"
              valor={resumenGeneral.clientesNuevos}
              detalle="Registrados dentro del período"
            />
            <Tarjeta
              icono="📊"
              titulo="Porcentaje de mora"
              valor={`${resumenGeneral.porcentajeMora.toFixed(1)}%`}
              detalle="Cartera vencida sobre cartera pendiente"
            />
          </section>

          <section style={estilos.resumenes}>
            <Panel titulo="Resumen comercial" etiqueta="CRÉDITOS Y VENTAS">
              <Fila
                nombre="Créditos otorgados"
                valor={moneda(resumenGeneral.montoCreditos)}
              />
              <Fila
                nombre="Ventas registradas"
                valor={moneda(resumenGeneral.montoVentas)}
              />
              <Fila
                nombre="Ticket promedio"
                valor={moneda(resumenGeneral.ticketPromedio)}
              />
              <Fila nombre="Operaciones" valor={comercialPeriodo.length} />
            </Panel>

            <Panel titulo="Resumen de cartera" etiqueta="COBRANZA">
              <Fila
                nombre="Cartera pendiente"
                valor={moneda(resumenGeneral.carteraPendiente)}
              />
              <Fila
                nombre="Cartera vencida"
                valor={moneda(resumenGeneral.carteraVencida)}
              />
              <Fila
                nombre="Cuentas en mora"
                valor={resumenGeneral.cuentasEnMora}
              />
              <Fila
                nombre="Índice de mora"
                valor={`${resumenGeneral.porcentajeMora.toFixed(1)}%`}
              />
            </Panel>

            <Panel titulo="Resumen de caja" etiqueta="CAJA">
              <Fila
                nombre="Ingresos"
                valor={moneda(resumenGeneral.ingresosCaja)}
              />
              <Fila
                nombre="Egresos"
                valor={moneda(resumenGeneral.egresosCaja)}
              />
              <Fila
                nombre="Balance"
                valor={moneda(resumenGeneral.balance)}
              />
              <Fila nombre="Movimientos" valor={cajaPeriodo.length} />
            </Panel>
          </section>

          <section style={estilos.panelTabla}>
            <div style={estilos.cabeceraPanel}>
              <div>
                <span style={estilos.miniEtiqueta}>MORA REAL</span>
                <h2 style={estilos.tituloPanel}>
                  Cuentas con días de atraso
                </h2>
              </div>
              <span style={estilos.contador}>
                {cuentasMora.length} registros
              </span>
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
                        <td style={estilos.tdDerecha}>
                          {moneda(registro.saldo)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

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
                    <td style={estilos.td}>
                      {registro.fecha || "Sin fecha"}
                    </td>
                    <td style={estilos.td}>
                      <span style={estilos.badge}>{registro.tipo}</span>
                    </td>
                    <td style={estilos.td}>{registro.detalle}</td>
                    <td style={estilos.td}>{registro.responsable}</td>
                    <td style={estilos.tdDerecha}>
                      {moneda(registro.monto)}
                    </td>
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
