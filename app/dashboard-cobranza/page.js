"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DashboardCobranza() {
  const [cuentas, setCuentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cobranzas, setCobranzas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [gestiones, setGestiones] = useState([]);

  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [filtroGestor, setFiltroGestor] = useState("Todos");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      window.location.href = "/login";
      return null;
    }

    return empresaId;
  }

  function fechaSimple(fecha) {
    if (!fecha) return "";
    return String(fecha).slice(0, 10);
  }

  function limpiarTexto(texto) {
    return String(texto || "").toLowerCase().trim();
  }

  function hoyISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function inicioMesActual() {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-01`;
  }

  function finMesActual() {
    const fecha = new Date();
    return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().slice(0, 10);
  }

  function inicioMesSiguiente() {
    const fecha = new Date();
    return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1).toISOString().slice(0, 10);
  }

  function formato(numero) {
    return (
      "USD " +
      Number(numero || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function calcularDiasAtraso(fechaVencimiento, saldoActual) {
    if (!fechaVencimiento || Number(saldoActual || 0) <= 0) return 0;

    const hoy = new Date(`${hoyISO()}T00:00:00`);
    const vencimiento = new Date(`${fechaSimple(fechaVencimiento)}T00:00:00`);
    const diferencia = hoy.getTime() - vencimiento.getTime();

    if (diferencia <= 0) return 0;

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  function estadoCuenta(cuenta, cobranza) {
    const saldo = Number(cuenta?.saldo_actual || 0);

    if (saldo <= 0) return "Cancelado";

    const estadoCobranza = limpiarTexto(cobranza?.estado_cobranza);
    const estadoComercial = limpiarTexto(cuenta?.estado);

    if (estadoCobranza === "legal" || estadoComercial === "legal") return "Legal";
    if (estadoCobranza === "suspendido" || estadoComercial === "suspendido") return "Suspendido";

    const dias = calcularDiasAtraso(cuenta?.fecha_vencimiento, saldo);

    if (dias <= 0) return "Al Día";
    return "Mora";
  }

  function riesgoCartera(dias, saldo, estado) {
    if (Number(saldo || 0) <= 0) return "Cancelado";
    if (estado === "Legal") return "Legal";
    if (dias <= 0) return "Al día";
    if (dias <= 30) return "Riesgo bajo";
    if (dias <= 60) return "Riesgo medio";
    if (dias <= 90) return "Riesgo alto";
    return "Legal";
  }

  function rangoSemaforo(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "Cancelado";
    if (dias <= 0) return "Al día";
    if (dias <= 30) return "1-30 días";
    if (dias <= 60) return "31-60 días";
    if (dias <= 90) return "61-90 días";
    return "Más de 90 días";
  }

  function pagoEsValido(pago) {
    const estado = limpiarTexto(pago?.estado);
    const tipo = limpiarTexto(pago?.tipo);

    if (estado && estado !== "procesado" && estado !== "activo") return false;

    return [
      "pago crédito",
      "pago credito",
      "cobro crédito",
      "cobro credito",
      "mensualidad",
      "cancelación",
      "cancelacion",
    ].includes(tipo);
  }

  function fechaPago(pago) {
    return fechaSimple(pago?.fecha_pago || pago?.fecha || pago?.created_at);
  }

  function pagoPerteneceCuenta(pago, cuenta, cliente) {
    if (!pago || !cuenta) return false;

    const porCuentaId =
      pago.informacion_comercial_id &&
      String(pago.informacion_comercial_id) === String(cuenta.id);

    const porNumeroCuenta =
      pago.numero_cuenta &&
      String(pago.numero_cuenta).trim() === String(cuenta.numero_cuenta || "").trim();

    const porClienteId =
      pago.cliente_id && String(pago.cliente_id) === String(cuenta.cliente_id);

    const cedulaPago = String(
      pago.cliente_cedula || pago.cedula || pago.identificacion || ""
    ).trim();

    const porCedula =
      cliente?.cedula && cedulaPago === String(cliente.cedula).trim();

    return porCuentaId || porNumeroCuenta || porClienteId || porCedula;
  }

  function sumarPagos(pagosCuenta, desde = "", hasta = "") {
    return pagosCuenta
      .filter((pago) => {
        const fecha = fechaPago(pago);
        if (!fecha) return false;
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
        return true;
      })
      .reduce((sum, pago) => sum + Number(pago.monto || 0), 0);
  }

  async function cargarDatos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    setCargando(true);

    const [cuentasRes, clientesRes, cobranzasRes, pagosRes, gestionesRes] =
      await Promise.all([
        supabase.from("informacion_comercial").select("*").eq("empresa_id", empresaId),
        supabase.from("clientes").select("*").eq("empresa_id", empresaId),
        supabase.from("informacion_cobranza").select("*").eq("empresa_id", empresaId),
        supabase.from("caja").select("*").eq("empresa_id", empresaId),
        supabase.from("bitacora_cliente").select("*").eq("empresa_id", empresaId),
      ]);

    if (cuentasRes.error) {
      alert("Error cargando cuentas: " + cuentasRes.error.message);
      setCargando(false);
      return;
    }

    if (clientesRes.error) {
      alert("Error cargando clientes: " + clientesRes.error.message);
      setCargando(false);
      return;
    }

    if (cobranzasRes.error) {
      alert("Error cargando cobranza: " + cobranzasRes.error.message);
      setCargando(false);
      return;
    }

    if (pagosRes.error) {
      alert("Error cargando pagos: " + pagosRes.error.message);
      setCargando(false);
      return;
    }

    if (gestionesRes.error) {
      alert("Error cargando gestiones: " + gestionesRes.error.message);
      setCargando(false);
      return;
    }

    setCuentas(cuentasRes.data || []);
    setClientes(clientesRes.data || []);
    setCobranzas(cobranzasRes.data || []);
    setPagos(pagosRes.data || []);
    setGestiones(gestionesRes.data || []);
    setCargando(false);
  }

  function limpiarFiltros() {
    setFiltroDesde("");
    setFiltroHasta("");
    setFiltroGestor("Todos");
  }

  function imprimirReporte() {
    window.print();
  }

  const inicioMes = inicioMesActual();
  const finMes = finMesActual();
  const inicioSiguiente = inicioMesSiguiente();
  const hoy = hoyISO();

  const cartera = useMemo(() => {
    return cuentas.map((cuenta) => {
      const cliente = clientes.find((c) => String(c.id) === String(cuenta.cliente_id));

      const cobranza = cobranzas.find(
        (c) => String(c.informacion_comercial_id) === String(cuenta.id)
      );

      const pagosCuenta = pagos.filter(
        (pago) => pagoEsValido(pago) && pagoPerteneceCuenta(pago, cuenta, cliente)
      );

      const montoOriginal = Number(cuenta.monto_total || 0);
      const saldoPendiente = Number(cuenta.saldo_actual || 0);
      const recuperadoPorPagos = sumarPagos(pagosCuenta);
      const recuperadoPorSaldo = Math.max(montoOriginal - saldoPendiente, 0);
      const recuperado = Math.max(recuperadoPorPagos, recuperadoPorSaldo);

      const dias = calcularDiasAtraso(cuenta.fecha_vencimiento, saldoPendiente);
      const estado = estadoCuenta(cuenta, cobranza);
      const riesgo = riesgoCartera(dias, saldoPendiente, estado);
      const semaforo = rangoSemaforo(dias, saldoPendiente);

      const gestor =
        cobranza?.responsable_cobro ||
        cuenta?.responsable ||
        cuenta?.vendedor ||
        "Sin asignar";

      const cobradoPeriodo = sumarPagos(pagosCuenta, filtroDesde, filtroHasta);
      const cobradoMes = sumarPagos(pagosCuenta, inicioMes, finMes);
      const cobradoHoy = sumarPagos(pagosCuenta, hoy, hoy);

      return {
        cuenta,
        cliente,
        cobranza,
        pagosCuenta,
        montoOriginal,
        saldoPendiente,
        recuperado,
        dias,
        estado,
        riesgo,
        semaforo,
        gestor,
        cobradoPeriodo,
        cobradoMes,
        cobradoHoy,
      };
    });
  }, [cuentas, clientes, cobranzas, pagos, filtroDesde, filtroHasta]);

  const carteraActiva = cartera.filter((item) => item.saldoPendiente > 0);
  const carteraPorGestor =
    filtroGestor === "Todos"
      ? cartera
      : cartera.filter((item) => item.gestor === filtroGestor);

  const carteraActivaPorGestor = carteraPorGestor.filter((item) => item.saldoPendiente > 0);

  const gestores = ["Todos", ...new Set(cartera.map((item) => item.gestor).filter(Boolean))];

  const gestionesPeriodo = gestiones.filter((g) => {
    const fecha = fechaSimple(g.fecha_gestion || g.created_at);
    if (!fecha) return false;
    if (filtroDesde && fecha < filtroDesde) return false;
    if (filtroHasta && fecha > filtroHasta) return false;

    if (filtroGestor !== "Todos") {
      const usuario = limpiarTexto(g.usuario);
      return usuario === limpiarTexto(filtroGestor) || usuario.startsWith(limpiarTexto(filtroGestor) + " (");
    }

    return true;
  });

  const carteraOriginal = carteraActivaPorGestor.reduce((sum, i) => sum + i.montoOriginal, 0);
  const recuperado = carteraPorGestor.reduce((sum, i) => sum + i.recuperado, 0);
  const saldoPendiente = carteraActivaPorGestor.reduce((sum, i) => sum + i.saldoPendiente, 0);

  const carteraAlDia = carteraActivaPorGestor
    .filter((i) => i.semaforo === "Al día")
    .reduce((sum, i) => sum + i.saldoPendiente, 0);

  const carteraMora = carteraActivaPorGestor
    .filter((i) => i.dias > 0)
    .reduce((sum, i) => sum + i.saldoPendiente, 0);

  const porcentajeMora = saldoPendiente > 0 ? (carteraMora / saldoPendiente) * 100 : 0;

  const cobradoHoy = carteraPorGestor.reduce((sum, i) => sum + i.cobradoHoy, 0);
  const cobradoMes = carteraPorGestor.reduce((sum, i) => sum + i.cobradoMes, 0);
  const cobradoPeriodo = carteraPorGestor.reduce((sum, i) => sum + i.cobradoPeriodo, 0);

  const saldoInicioPeriodo = saldoPendiente + cobradoPeriodo;
  const recuperacionPeriodo = saldoInicioPeriodo > 0 ? (cobradoPeriodo / saldoInicioPeriodo) * 100 : 0;

  const vencimientosMes = carteraPorGestor.filter((item) => {
    const vencimiento = fechaSimple(item.cuenta?.fecha_vencimiento);
    return vencimiento >= inicioMes && vencimiento <= finMes;
  });

  const montoVencimientosMes = vencimientosMes.reduce(
    (sum, item) => sum + item.saldoPendiente + item.cobradoMes,
    0
  );

  const cobradoVencimientosMes = vencimientosMes.reduce(
    (sum, item) => sum + item.cobradoMes,
    0
  );

  const pendienteMes = Math.max(montoVencimientosMes - cobradoVencimientosMes, 0);

  const moraAnterior = carteraPorGestor.filter((item) => {
    const vencimiento = fechaSimple(item.cuenta?.fecha_vencimiento);
    return vencimiento && vencimiento < inicioMes;
  });

  const moraAnteriorInicio = moraAnterior.reduce(
    (sum, item) => sum + item.saldoPendiente + item.cobradoMes,
    0
  );

  const moraAnteriorRecuperada = moraAnterior.reduce((sum, item) => sum + item.cobradoMes, 0);
  const moraAnteriorPendiente = moraAnterior.reduce((sum, item) => sum + item.saldoPendiente, 0);

  const carteraTrasladada = carteraPorGestor
    .filter((item) => {
      const vencimiento = fechaSimple(item.cuenta?.fecha_vencimiento);
      return item.saldoPendiente > 0 && vencimiento && vencimiento < inicioSiguiente;
    })
    .reduce((sum, item) => sum + item.saldoPendiente, 0);

  function promesaTienePago(promesa) {
    const cuentaRelacionada = cartera.find(
      (item) => String(item.cuenta?.id) === String(promesa.informacion_comercial_id)
    );

    if (!cuentaRelacionada) return false;

    const fechaRegistro = fechaSimple(promesa.fecha_gestion || promesa.created_at);
    const fechaPromesa = fechaSimple(promesa.proxima_gestion);

    return cuentaRelacionada.pagosCuenta.some((pago) => {
      const fecha = fechaPago(pago);
      if (!fecha) return false;
      if (fechaRegistro && fecha < fechaRegistro) return false;
      if (fechaPromesa && fecha > fechaPromesa) return false;
      return true;
    });
  }

  const promesasPeriodo = gestionesPeriodo.filter((g) => {
    const tipo = limpiarTexto(g.tipo_gestion);
    const resultado = limpiarTexto(g.resultado_gestion);

    return (
      tipo === "promesa de pago" ||
      resultado === "promesa registrada" ||
      resultado === "promesa de pago"
    );
  });

  const promesasCumplidas = promesasPeriodo.filter((p) => promesaTienePago(p)).length;

  const promesasActivas = promesasPeriodo.filter((p) => {
    const fecha = fechaSimple(p.proxima_gestion);
    return fecha && fecha >= hoy && !promesaTienePago(p);
  }).length;

  const promesasIncumplidas = promesasPeriodo.filter((p) => {
    const fecha = fechaSimple(p.proxima_gestion);
    return fecha && fecha < hoy && !promesaTienePago(p);
  }).length;

  const semaforo = [
    { rango: "Al día", icono: "🟢", dias: "0", items: carteraActivaPorGestor.filter((i) => i.semaforo === "Al día") },
    { rango: "1-30 días", icono: "🟡", dias: "1-30", items: carteraActivaPorGestor.filter((i) => i.semaforo === "1-30 días") },
    { rango: "31-60 días", icono: "🟠", dias: "31-60", items: carteraActivaPorGestor.filter((i) => i.semaforo === "31-60 días") },
    { rango: "61-90 días", icono: "🟧", dias: "61-90", items: carteraActivaPorGestor.filter((i) => i.semaforo === "61-90 días") },
    { rango: "Más de 90 días", icono: "🔴", dias: "+90", items: carteraActivaPorGestor.filter((i) => i.semaforo === "Más de 90 días") },
  ].map((r) => ({
    ...r,
    clientes: r.items.length,
    monto: r.items.reduce((sum, i) => sum + i.saldoPendiente, 0),
  }));

  const riesgo = [
    "Al día",
    "Riesgo bajo",
    "Riesgo medio",
    "Riesgo alto",
    "Legal",
  ].map((r) => {
    const items = carteraActivaPorGestor.filter((i) => i.riesgo === r);
    return {
      riesgo: r,
      clientes: items.length,
      monto: items.reduce((sum, i) => sum + i.saldoPendiente, 0),
    };
  });

  const rankingGestores = gestores
    .filter((g) => g !== "Todos")
    .map((gestor) => {
      const cuentasGestor = cartera.filter((item) => item.gestor === gestor);
      const cuentasActivas = cuentasGestor.filter((item) => item.saldoPendiente > 0);

      const cobrado = cuentasGestor.reduce((sum, item) => sum + item.cobradoPeriodo, 0);
      const saldo = cuentasActivas.reduce((sum, item) => sum + item.saldoPendiente, 0);
      const saldoInicio = saldo + cobrado;

      const gestionesGestor = gestionesPeriodo.filter((g) => {
        const usuario = limpiarTexto(g.usuario);
        return usuario === limpiarTexto(gestor) || usuario.startsWith(limpiarTexto(gestor) + " (");
      });

      const promesasGestor = gestionesGestor.filter((g) => {
        const tipo = limpiarTexto(g.tipo_gestion);
        const resultado = limpiarTexto(g.resultado_gestion);
        return tipo === "promesa de pago" || resultado === "promesa registrada" || resultado === "promesa de pago";
      });

      const promesasCumplidasGestor = promesasGestor.filter((p) => promesaTienePago(p)).length;

      return {
        gestor,
        clientesAsignados: cuentasActivas.length,
        clientesGestionados: new Set(gestionesGestor.map((g) => g.cliente_id).filter(Boolean)).size,
        gestiones: gestionesGestor.length,
        promesas: promesasGestor.length,
        promesasCumplidas: promesasCumplidasGestor,
        cobrado,
        saldo,
        recuperacion: saldoInicio > 0 ? (cobrado / saldoInicio) * 100 : 0,
      };
    });

  const mayorRiesgo = [...carteraActivaPorGestor]
    .sort((a, b) => b.dias - a.dias || b.saldoPendiente - a.saldoPendiente)
    .slice(0, 10);

  const mayorSaldo = [...carteraActivaPorGestor]
    .sort((a, b) => b.saldoPendiente - a.saldoPendiente)
    .slice(0, 10);

  if (cargando) {
    return (
      <div style={pagina}>
        <div style={cargandoBox}>
          <strong>Cargando Dashboard Cobranza...</strong>
          <p>Calculando cartera, mora, promesas y gestores.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={tituloBox}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />
            <div>
              <h1 style={titulo}>Dashboard Cobranza</h1>
              <p style={subtitulo}>
                Administración de cartera, recuperación, riesgo, promesas y gestores.
              </p>
            </div>
          </div>

          <div style={accionesTop}>
            <button style={botonDashboard} onClick={volverDashboard}>
              ← Volver al Dashboard
            </button>
            <button style={botonActualizar} onClick={cargarDatos}>
              Actualizar
            </button>
            <button style={botonNegro} onClick={() => window.print()}>
              Imprimir Reporte
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Filtros de análisis</h2>
          <p style={nota}>
            La cartera actual no cambia por fecha. Las fechas afectan cobros, gestiones, promesas y ranking de gestores.
          </p>

          <div style={gridFiltros}>
            <Campo label="Fecha desde">
              <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Fecha hasta">
              <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Gestor">
              <select value={filtroGestor} onChange={(e) => setFiltroGestor(e.target.value)} style={inputStyle}>
                {gestores.map((gestor) => (
                  <option key={gestor}>{gestor}</option>
                ))}
              </select>
            </Campo>
          </div>

          <button style={botonGris} onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>

        <h2 style={seccionTitulo}>Resumen Ejecutivo</h2>

        <div style={kpiGrid}>
          <KPI titulo="Cartera Original" valor={formato(carteraOriginal)} icono="🏦" />
          <KPI titulo="Recuperado" valor={formato(recuperado)} icono="✅" />
          <KPI titulo="Saldo Pendiente" valor={formato(saldoPendiente)} icono="💰" />
          <KPI titulo="Cartera Al Día" valor={formato(carteraAlDia)} icono="🟢" />
          <KPI titulo="Cartera en Mora" valor={formato(carteraMora)} icono="🔴" />
          <KPI titulo="% Mora" valor={`${porcentajeMora.toFixed(1)}%`} icono="📈" />
          <KPI titulo="Cobrado Periodo" valor={formato(cobradoPeriodo)} icono="🧾" />
          <KPI titulo="% Recuperación Periodo" valor={`${recuperacionPeriodo.toFixed(1)}%`} icono="🎯" />
        </div>

        <h2 style={seccionTitulo}>Cierre Mensual</h2>

        <div style={kpiGrid}>
          <KPI titulo="Vencimientos del Mes" valor={formato(montoVencimientosMes)} icono="📅" />
          <KPI titulo="Cobrado del Mes" valor={formato(cobradoMes)} icono="💵" />
          <KPI titulo="Cobrado de Vencimientos" valor={formato(cobradoVencimientosMes)} icono="✅" />
          <KPI titulo="Pendiente del Mes" valor={formato(pendienteMes)} icono="⏳" />
          <KPI titulo="Mora Anterior" valor={formato(moraAnteriorInicio)} icono="📂" />
          <KPI titulo="Mora Recuperada" valor={formato(moraAnteriorRecuperada)} icono="♻️" />
          <KPI titulo="Mora Pendiente" valor={formato(moraAnteriorPendiente)} icono="⚠️" />
          <KPI titulo="Cartera Trasladada" valor={formato(carteraTrasladada)} icono="➡️" />
        </div>

        <h2 style={seccionTitulo}>Promesas y Actividad</h2>

        <div style={kpiGrid}>
          <KPI titulo="Cobrado Hoy" valor={formato(cobradoHoy)} icono="📅" />
          <KPI titulo="Promesas Activas" valor={promesasActivas} icono="🤝" />
          <KPI titulo="Promesas Cumplidas" valor={promesasCumplidas} icono="✅" />
          <KPI titulo="Promesas Incumplidas" valor={promesasIncumplidas} icono="⚠️" />
          <KPI titulo="Gestiones Periodo" valor={gestionesPeriodo.length} icono="☎️" />
        </div>

        <div style={gridDos}>
          <div style={card}>
            <h2 style={tituloSeccion}>Semáforo de Cartera</h2>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Rango</th>
                  <th style={th}>Clientes</th>
                  <th style={th}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {semaforo.map((item) => (
                  <tr key={item.rango}>
                    <td style={td}>{item.icono} {item.rango}</td>
                    <td style={td}>{item.clientes}</td>
                    <td style={td}>{formato(item.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Riesgo de Cartera</h2>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Riesgo</th>
                  <th style={th}>Clientes</th>
                  <th style={th}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {riesgo.map((item) => (
                  <tr key={item.riesgo}>
                    <td style={td}>{item.riesgo}</td>
                    <td style={td}>{item.clientes}</td>
                    <td style={td}>{formato(item.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Tabla
          titulo="Efectividad por Gestor"
          columnas={[
            "Gestor",
            "Clientes asignados",
            "Clientes gestionados",
            "Gestiones",
            "Promesas",
            "Promesas cumplidas",
            "Monto recuperado",
            "% recuperación",
          ]}
          filas={rankingGestores.map((g) => [
            g.gestor,
            g.clientesAsignados,
            g.clientesGestionados,
            g.gestiones,
            g.promesas,
            g.promesasCumplidas,
            formato(g.cobrado),
            `${g.recuperacion.toFixed(1)}%`,
          ])}
        />

        <Tabla
          titulo="Top Clientes de Mayor Riesgo"
          columnas={["Cliente", "Cuenta", "Días", "Riesgo", "Saldo", "Gestor"]}
          filas={mayorRiesgo.map((item) => [
            item.cliente?.nombre || "Sin nombre",
            item.cuenta?.numero_cuenta || "-",
            item.dias,
            item.riesgo,
            formato(item.saldoPendiente),
            item.gestor,
          ])}
        />

        <Tabla
          titulo="Top Clientes con Mayor Saldo"
          columnas={["Cliente", "Cuenta", "Saldo", "Estado", "Gestor"]}
          filas={mayorSaldo.map((item) => [
            item.cliente?.nombre || "Sin nombre",
            item.cuenta?.numero_cuenta || "-",
            formato(item.saldoPendiente),
            item.estado,
            item.gestor,
          ])}
        />
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function KPI({ titulo, valor, icono }) {
  return (
    <div style={cardIndicador}>
      <div style={iconoBox}>{icono}</div>
      <p style={cardTitulo}>{titulo}</p>
      <h2 style={cardNumero}>{valor}</h2>
    </div>
  );
}

function Tabla({ titulo, columnas, filas }) {
  return (
    <div style={card}>
      <h2 style={tituloSeccion}>{titulo}</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={tabla}>
          <thead>
            <tr>
              {columnas.map((col, index) => (
                <th key={index} style={th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td style={td} colSpan={columnas.length}>No hay datos disponibles.</td>
              </tr>
            ) : (
              filas.map((fila, index) => (
                <tr key={index}>
                  {fila.map((celda, i) => (
                    <td key={i} style={td}>{celda}</td>
                  ))}
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
  minHeight: "100vh",
  background: "#eef2f7",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1500px",
  margin: "0 auto",
};

const cargandoBox = {
  maxWidth: "500px",
  margin: "100px auto",
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
};

const encabezado = {
  background: "linear-gradient(135deg, #111827, #1e40af)",
  color: "#ffffff",
  padding: "24px",
  borderRadius: "20px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
};

const tituloBox = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const logo = {
  width: "90px",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "8px",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
};

const subtitulo = {
  marginTop: "5px",
  color: "#dbeafe",
  fontSize: "15px",
};

const accionesTop = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const botonDashboard = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonActualizar = {
  background: "#16a34a",
  color: "#ffffff",
  border: "1px solid #ffffff",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonNegro = {
  background: "#111827",
  color: "#ffffff",
  border: "1px solid #ffffff",
  padding: "12px 20px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonGris = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "14px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "16px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
};

const tituloSeccion = {
  marginTop: 0,
  marginBottom: "14px",
  color: "#111827",
};

const seccionTitulo = {
  margin: "22px 0 12px",
  color: "#111827",
};

const nota = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: 1.5,
};

const gridFiltros = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: "12px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: "bold",
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const cardIndicador = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
};

const iconoBox = {
  fontSize: "24px",
  marginBottom: "8px",
};

const cardTitulo = {
  margin: 0,
  color: "#6b7280",
  fontSize: "14px",
};

const cardNumero = {
  marginTop: "8px",
  color: "#111827",
  fontSize: "25px",
};

const gridDos = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
  gap: "16px",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  background: "#111827",
  color: "#ffffff",
  padding: "12px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const td = {
  padding: "11px",
  borderBottom: "1px solid #e5e7eb",
};
