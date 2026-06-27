"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CobranzaGeneral() {
  const [cartera, setCartera] = useState([]);
  const [gestiones, setGestiones] = useState([]);
  const [usuariosGestores, setUsuariosGestores] = useState([]);

  const [tipoBusqueda, setTipoBusqueda] = useState("Cédula");
  const [valorBusqueda, setValorBusqueda] = useState("");
  const [estadoBusqueda, setEstadoBusqueda] = useState("Todos");
  const [moraBusqueda, setMoraBusqueda] = useState("Todos");

  const [filtrosAplicados, setFiltrosAplicados] = useState({
    tipoBusqueda: "Cédula",
    valorBusqueda: "",
    estadoBusqueda: "Todos",
    moraBusqueda: "Todos",
  });

  const [cuentasSeleccionadas, setCuentasSeleccionadas] = useState([]);
  const [gestorMasivo, setGestorMasivo] = useState("");
  const [observacionMasiva, setObservacionMasiva] = useState("");

  const [modalAsignar, setModalAsignar] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [gestorSeleccionado, setGestorSeleccionado] = useState("");
  const [observacionAsignacion, setObservacionAsignacion] = useState("");

  const [gestorMedicion, setGestorMedicion] = useState("Todos");

  useEffect(() => {
    cargarDatos();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      window.location.href = "/login";
      return null;
    }

    return empresaId;
  }

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function fechaSimple(fecha) {
    return String(fecha || "").slice(0, 10);
  }

  function limpiarTexto(texto) {
    return String(texto || "").toLowerCase().trim();
  }

  function limpiarCedula(texto) {
    return String(texto || "")
      .toLowerCase()
      .replace(/-/g, "")
      .replace(/\s/g, "")
      .trim();
  }

  function usuarioActual() {
    return (
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("nombreUsuario") ||
      localStorage.getItem("adminKonaxNombre") ||
      "KONAX"
    );
  }

  function calcularDiasAtraso(fechaVencimiento, saldoActual) {
    if (!fechaVencimiento || Number(saldoActual || 0) <= 0) return 0;

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = hoy - vencimiento;

    if (diferencia <= 0) return 0;

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  function obtenerRangoMora(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "Cancelado";
    if (dias <= 0) return "Al Día";
    if (dias <= 30) return "1-30 días";
    if (dias <= 90) return "31-90 días";
    if (dias <= 180) return "91-180 días";
    return "181+ días";
  }

  function obtenerEstadoPorDias(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "Cancelado";
    if (dias <= 0) return "Al Día";
    if (dias <= 90) return "Mora";
    return "Legal";
  }

  async function cargarDatos() {
    await cargarGestores();
    await cargarCartera();
    await cargarGestiones();
  }

  async function cargarGestores() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("estado", "Activo")
      .in("rol", [
        "Gestor de Cobro",
        "Gestor de Cobranza",
        "Cobranza",
        "Supervisor",
      ])
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando gestores: " + error.message);
      return;
    }

    setUsuariosGestores(data || []);
  }

  async function cargarCartera() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data: cuentasData, error: errorCuentas } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (errorCuentas) {
      alert("Error cargando cartera: " + errorCuentas.message);
      return;
    }

    const cuentas = cuentasData || [];
    const clienteIds = [
      ...new Set(cuentas.map((c) => c.cliente_id).filter(Boolean)),
    ];
    const cuentaIds = cuentas.map((c) => c.id);

    let clientes = [];
    let cobranzas = [];

    if (clienteIds.length > 0) {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("id", clienteIds);

      clientes = data || [];
    }

    if (cuentaIds.length > 0) {
      const { data } = await supabase
        .from("informacion_cobranza")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("informacion_comercial_id", cuentaIds)
        .order("fecha_asignacion", { ascending: false });

      cobranzas = data || [];
    }

    const carteraArmada = cuentas.map((cuenta) => {
      const cliente = clientes.find((c) => c.id === cuenta.cliente_id);

      const cobranza = cobranzas.find(
        (c) => String(c.informacion_comercial_id) === String(cuenta.id)
      );

      const dias = calcularDiasAtraso(
        cuenta.fecha_vencimiento,
        cuenta.saldo_actual
      );

      const estado =
        cobranza?.estado_cobranza ||
        cuenta.estado ||
        obtenerEstadoPorDias(dias, cuenta.saldo_actual);

      return {
        cuenta,
        cliente,
        cobranza,
        dias,
        estado,
        rangoMora: obtenerRangoMora(dias, cuenta.saldo_actual),
      };
    });

    setCartera(carteraArmada);
  }

  async function cargarGestiones() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data } = await supabase
      .from("bitacora_cliente")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fecha_gestion", { ascending: false });

    setGestiones(data || []);
  }

  function aplicarBusqueda() {
    setFiltrosAplicados({
      tipoBusqueda,
      valorBusqueda,
      estadoBusqueda,
      moraBusqueda,
    });

    setCuentasSeleccionadas([]);
  }

  function limpiarFiltros() {
    setTipoBusqueda("Cédula");
    setValorBusqueda("");
    setEstadoBusqueda("Todos");
    setMoraBusqueda("Todos");

    setFiltrosAplicados({
      tipoBusqueda: "Cédula",
      valorBusqueda: "",
      estadoBusqueda: "Todos",
      moraBusqueda: "Todos",
    });

    setCuentasSeleccionadas([]);
  }

  function coincideTipoBusqueda(item) {
    const valor = limpiarTexto(filtrosAplicados.valorBusqueda);

    if (!valor) return true;

    const cliente = item.cliente || {};
    const cuenta = item.cuenta || {};
    const gestor = item.cobranza?.responsable_cobro || "Sin asignar";

    if (filtrosAplicados.tipoBusqueda === "Cédula") {
      const cedulaCliente = limpiarCedula(cliente.cedula);
      const cedulaBuscada = limpiarCedula(valor);
      return cedulaCliente.includes(cedulaBuscada);
    }

    if (filtrosAplicados.tipoBusqueda === "Cliente") {
      return limpiarTexto(cliente.nombre).includes(valor);
    }

    if (filtrosAplicados.tipoBusqueda === "Dirección") {
      return limpiarTexto(cliente.direccion).includes(valor);
    }

    if (filtrosAplicados.tipoBusqueda === "Producto") {
      return limpiarTexto(cuenta.tipo_producto || cuenta.descripcion).includes(
        valor
      );
    }

    if (filtrosAplicados.tipoBusqueda === "Fecha inicio") {
      return fechaSimple(cuenta.fecha_inicio) === valor;
    }

    if (filtrosAplicados.tipoBusqueda === "Gestor actual") {
      return limpiarTexto(gestor).includes(valor);
    }

    if (filtrosAplicados.tipoBusqueda === "Cuenta") {
      return limpiarTexto(cuenta.numero_cuenta).includes(valor);
    }

    return true;
  }

  const carteraFiltrada = cartera.filter((item) => {
    const coincideBusqueda = coincideTipoBusqueda(item);

    const coincideEstado =
      filtrosAplicados.estadoBusqueda === "Todos" ||
      item.estado === filtrosAplicados.estadoBusqueda;

    const coincideMora =
      filtrosAplicados.moraBusqueda === "Todos" ||
      item.rangoMora === filtrosAplicados.moraBusqueda;

    return coincideBusqueda && coincideEstado && coincideMora;
  });

  function toggleCuenta(id) {
    setCuentasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function seleccionarTodosFiltrados() {
    setCuentasSeleccionadas(carteraFiltrada.map((item) => item.cuenta.id));
  }

  function limpiarSeleccion() {
    setCuentasSeleccionadas([]);
  }

  function abrirModalAsignar(item) {
    setCuentaSeleccionada(item);
    setGestorSeleccionado(item.cobranza?.responsable_cobro_id || "");
    setObservacionAsignacion("");
    setModalAsignar(true);
  }

  function cerrarModalAsignar() {
    setModalAsignar(false);
    setCuentaSeleccionada(null);
    setGestorSeleccionado("");
    setObservacionAsignacion("");
  }

  async function guardarAsignacionGestor() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!cuentaSeleccionada?.cuenta?.id) {
      alert("No hay cuenta seleccionada.");
      return;
    }

    if (!gestorSeleccionado) {
      alert("Seleccione un gestor.");
      return;
    }

    const gestor = usuariosGestores.find(
      (u) => String(u.id) === String(gestorSeleccionado)
    );

    if (!gestor) {
      alert("Gestor no encontrado.");
      return;
    }

    const usuarioAsignacion = usuarioActual();
    const fechaAsignacion = new Date().toISOString().split("T")[0];

    const payload = {
      empresa_id: empresaId,
      cliente_id:
        cuentaSeleccionada.cliente?.id ||
        cuentaSeleccionada.cuenta?.cliente_id ||
        null,
      informacion_comercial_id: cuentaSeleccionada.cuenta.id,
      responsable_cobro: gestor.nombre,
      responsable_cobro_id: gestor.id,
      fecha_asignacion: fechaAsignacion,
      usuario_asignacion: usuarioAsignacion,
      observacion_asignacion: observacionAsignacion,
      estado_cobranza: cuentaSeleccionada.estado || "Al Día",
    };

    let error = null;

    if (cuentaSeleccionada.cobranza?.id) {
      const res = await supabase
        .from("informacion_cobranza")
        .update(payload)
        .eq("empresa_id", empresaId)
        .eq("informacion_comercial_id", cuentaSeleccionada.cuenta.id);

      error = res.error;
    } else {
      const res = await supabase.from("informacion_cobranza").insert([payload]);
      error = res.error;
    }

    if (error) {
      alert("Error asignando gestor: " + error.message);
      return;
    }

    await registrarBitacoraAsignacion([
      {
        item: cuentaSeleccionada,
        gestor: gestor.nombre,
        observacion: observacionAsignacion,
        tipo: "Asignación de gestor",
      },
    ]);

    alert("Gestor asignado correctamente.");

    cerrarModalAsignar();
    await cargarDatos();
  }

  async function guardarAsignacionMasiva() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (cuentasSeleccionadas.length === 0) {
      alert("Seleccione al menos una cuenta.");
      return;
    }

    if (!gestorMasivo) {
      alert("Seleccione el gestor que recibirá la cartera.");
      return;
    }

    const gestor = usuariosGestores.find(
      (u) => String(u.id) === String(gestorMasivo)
    );

    if (!gestor) {
      alert("Gestor no encontrado.");
      return;
    }

    const confirmar = confirm(
      `¿Deseas asignar ${cuentasSeleccionadas.length} cuenta(s) a ${gestor.nombre}?`
    );

    if (!confirmar) return;

    const usuarioAsignacion = usuarioActual();
    const fechaAsignacion = new Date().toISOString().split("T")[0];

    const cuentasParaAsignar = cartera.filter((item) =>
      cuentasSeleccionadas.includes(item.cuenta.id)
    );

    for (const item of cuentasParaAsignar) {
      const payload = {
        empresa_id: empresaId,
        cliente_id: item.cliente?.id || item.cuenta?.cliente_id || null,
        informacion_comercial_id: item.cuenta.id,
        responsable_cobro: gestor.nombre,
        responsable_cobro_id: gestor.id,
        fecha_asignacion: fechaAsignacion,
        usuario_asignacion: usuarioAsignacion,
        observacion_asignacion: observacionMasiva || "Reasignación de cartera",
        estado_cobranza: item.estado || "Al Día",
      };

      let error = null;

      if (item.cobranza?.id) {
        const res = await supabase
          .from("informacion_cobranza")
          .update(payload)
          .eq("empresa_id", empresaId)
          .eq("informacion_comercial_id", item.cuenta.id);

        error = res.error;
      } else {
        const res = await supabase
          .from("informacion_cobranza")
          .insert([payload]);

        error = res.error;
      }

      if (error) {
        alert("Error asignando cuenta: " + error.message);
        return;
      }
    }

    await registrarBitacoraAsignacion(
      cuentasParaAsignar.map((item) => ({
        item,
        gestor: gestor.nombre,
        observacion: observacionMasiva,
        tipo: "Reasignación de cartera",
      }))
    );

    alert("Cartera reasignada correctamente.");

    setCuentasSeleccionadas([]);
    setGestorMasivo("");
    setObservacionMasiva("");
    await cargarDatos();
  }

  async function registrarBitacoraAsignacion(registros) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId || registros.length === 0) return;

    const usuarioAsignacion = usuarioActual();

    const payload = registros.map((r) => ({
      empresa_id: empresaId,
      cliente_id: r.item.cliente?.id || r.item.cuenta?.cliente_id || null,
      informacion_comercial_id: r.item.cuenta.id,
      tipo_gestion: r.tipo,
      resultado_gestion: "Gestor asignado",
      descripcion: `Cuenta asignada a ${r.gestor}. ${r.observacion || ""}`,
      usuario: usuarioAsignacion,
      fecha_gestion: new Date().toISOString(),
    }));

    await supabase.from("bitacora_cliente").insert(payload);
  }

  const gestores = [
    { id: "Todos", nombre: "Todos" },
    ...usuariosGestores.map((u) => ({
      id: String(u.id),
      nombre: u.nombre,
    })),
    { id: "Sin asignar", nombre: "Sin asignar" },
  ];

  const gestoresMedicion = gestores
    .filter((g) => g.id !== "Todos")
    .filter((g) => gestorMedicion === "Todos" || g.id === gestorMedicion)
    .map((gestor) => {
      const carteraGestor = cartera.filter((item) => {
        const responsableId = item.cobranza?.responsable_cobro_id;

        if (gestor.id === "Sin asignar") {
          return !responsableId && !item.cobranza?.responsable_cobro;
        }

        return String(responsableId) === String(gestor.id);
      });

      const clientesAsignados = [
        ...new Set(carteraGestor.map((item) => item.cliente?.id).filter(Boolean)),
      ].length;

      const gestionesGestor = gestiones.filter((g) => {
        return carteraGestor.some(
          (item) =>
            String(item.cuenta.id) === String(g.informacion_comercial_id)
        );
      });

      const clientesGestionados = [
        ...new Set(gestionesGestor.map((g) => g.cliente_id).filter(Boolean)),
      ].length;

      const pendientes = Math.max(clientesAsignados - clientesGestionados, 0);

      const porcentaje =
        clientesAsignados > 0
          ? Math.round((clientesGestionados / clientesAsignados) * 100)
          : 0;

      return {
        gestor: gestor.nombre,
        asignados: clientesAsignados,
        gestionados: clientesGestionados,
        pendientes,
        porcentaje,
      };
    });

  const totalSeleccionado = cuentasSeleccionadas.length;
  const totalResultado = carteraFiltrada.length;

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div>
            <h1 style={tituloHero}>Cobranza General</h1>
            <p style={subtituloHero}>
              Busca cartera, selecciona cuentas y asigna gestores de cobro.
            </p>
          </div>

          <button style={botonClaro} onClick={volverDashboard}>
            ← Volver
          </button>
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <div>
              <h2 style={tituloSeccion}>Buscar cartera</h2>
              <p style={ayuda}>
                Filtra la cartera por cliente, cédula, dirección, producto,
                fecha, estado o gestor.
              </p>
            </div>
          </div>

          <div style={gridFiltros}>
            <Campo label="Buscar por">
              <select
                value={tipoBusqueda}
                onChange={(e) => {
                  setTipoBusqueda(e.target.value);
                  setValorBusqueda("");
                }}
                style={inputStyle}
              >
                <option>Cédula</option>
                <option>Cliente</option>
                <option>Dirección</option>
                <option>Producto</option>
                <option>Fecha inicio</option>
                <option>Gestor actual</option>
                <option>Cuenta</option>
              </select>
            </Campo>

            <Campo
              label={
                tipoBusqueda === "Cédula"
                  ? "Número de cédula"
                  : "Valor de búsqueda"
              }
            >
              <input
                type={tipoBusqueda === "Fecha inicio" ? "date" : "text"}
                value={valorBusqueda}
                onChange={(e) => setValorBusqueda(e.target.value)}
                placeholder={
                  tipoBusqueda === "Cédula"
                    ? "Ej. 8-888-888"
                    : tipoBusqueda === "Dirección"
                    ? "Ej. La Chorrera"
                    : tipoBusqueda === "Producto"
                    ? "Ej. Lavadora"
                    : "Escriba aquí"
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Estado">
              <select
                value={estadoBusqueda}
                onChange={(e) => setEstadoBusqueda(e.target.value)}
                style={inputStyle}
              >
                <option>Todos</option>
                <option>Al Día</option>
                <option>Mora</option>
                <option>Legal</option>
                <option>Suspendido</option>
                <option>Cancelado</option>
              </select>
            </Campo>

            <Campo label="Mora">
              <select
                value={moraBusqueda}
                onChange={(e) => setMoraBusqueda(e.target.value)}
                style={inputStyle}
              >
                <option>Todos</option>
                <option>Al Día</option>
                <option>1-30 días</option>
                <option>31-90 días</option>
                <option>91-180 días</option>
                <option>181+ días</option>
              </select>
            </Campo>

            <Campo label="Acciones">
              <div style={botonesLinea}>
                <button style={botonBuscar} onClick={aplicarBusqueda}>
                  Buscar
                </button>

                <button style={botonLimpiar} onClick={limpiarFiltros}>
                  Limpiar
                </button>
              </div>
            </Campo>
          </div>
        </div>

        <div style={card}>
          <div style={asignacionHeader}>
            <div>
              <h2 style={tituloSeccion}>Asignar cartera</h2>
              <p style={ayuda}>
                Resultado: <strong>{totalResultado}</strong> cuenta(s) ·
                Seleccionadas: <strong>{totalSeleccionado}</strong>
              </p>
            </div>

            <div style={botonesLinea}>
              <button style={botonNegro} onClick={seleccionarTodosFiltrados}>
                Seleccionar resultado
              </button>

              <button style={botonLimpiar} onClick={limpiarSeleccion}>
                Quitar selección
              </button>
            </div>
          </div>

          <div style={gridAsignacion}>
            <Campo label="Asignar a gestor">
              <select
                value={gestorMasivo}
                onChange={(e) => setGestorMasivo(e.target.value)}
                style={inputStyle}
              >
                <option value="">Seleccione gestor</option>
                {usuariosGestores.map((gestor) => (
                  <option key={gestor.id} value={gestor.id}>
                    {gestor.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Motivo">
              <input
                value={observacionMasiva}
                onChange={(e) => setObservacionMasiva(e.target.value)}
                placeholder="Ej. Cambio de zona, producto o carga de trabajo"
                style={inputStyle}
              />
            </Campo>

            <Campo label="Acción">
              <button style={botonAsignar} onClick={guardarAsignacionMasiva}>
                Reasignar cartera
              </button>
            </Campo>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Cuentas encontradas</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Sel.</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Dirección</th>
                  <th style={th}>Producto</th>
                  <th style={th}>Cuenta</th>
                  <th style={th}>Saldo</th>
                  <th style={th}>Vence</th>
                  <th style={th}>Días</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Gestor</th>
                  <th style={th}>Acción</th>
                </tr>
              </thead>

              <tbody>
                {carteraFiltrada.map((item) => (
                  <tr key={item.cuenta.id}>
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={cuentasSeleccionadas.includes(item.cuenta.id)}
                        onChange={() => toggleCuenta(item.cuenta.id)}
                      />
                    </td>
                    <td style={td}>{item.cliente?.nombre || "-"}</td>
                    <td style={td}>{item.cliente?.cedula || "-"}</td>
                    <td style={td}>{item.cliente?.direccion || "-"}</td>
                    <td style={td}>
                      {item.cuenta?.tipo_producto ||
                        item.cuenta?.descripcion ||
                        "-"}
                    </td>
                    <td style={td}>{item.cuenta?.numero_cuenta || "-"}</td>
                    <td style={td}>
                      ${Number(item.cuenta?.saldo_actual || 0).toLocaleString()}
                    </td>
                    <td style={td}>{item.cuenta?.fecha_vencimiento || "-"}</td>
                    <td style={td}>{item.dias}</td>
                    <td style={td}>
                      <span
                        style={item.estado === "Al Día" ? estadoVerde : estadoRojo}
                      >
                        {item.estado}
                      </span>
                    </td>
                    <td style={td}>
                      {item.cobranza?.responsable_cobro || "Sin asignar"}
                    </td>
                    <td style={td}>
                      <button
                        style={botonMini}
                        onClick={() => abrirModalAsignar(item)}
                      >
                        Cambiar
                      </button>
                    </td>
                  </tr>
                ))}

                {carteraFiltrada.length === 0 && (
                  <tr>
                    <td style={td} colSpan="12">
                      No hay cuentas con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <div style={asignacionHeader}>
            <div>
              <h2 style={tituloSeccion}>Medición de gestores</h2>
              <p style={ayuda}>
                Revisa la carga asignada y avance de gestión por cobrador.
              </p>
            </div>

            <div style={{ minWidth: "220px" }}>
              <label style={labelStyle}>Gestor</label>
              <select
                value={gestorMedicion}
                onChange={(e) => setGestorMedicion(e.target.value)}
                style={inputStyle}
              >
                {gestores.map((gestor) => (
                  <option key={gestor.id} value={gestor.id}>
                    {gestor.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={tablaMedicion}>
              <thead>
                <tr>
                  <th style={th}>Gestor</th>
                  <th style={th}>Asignados</th>
                  <th style={th}>Gestionados</th>
                  <th style={th}>Pendientes</th>
                  <th style={th}>% Gestión</th>
                </tr>
              </thead>

              <tbody>
                {gestoresMedicion.map((item) => (
                  <tr key={item.gestor}>
                    <td style={td}>{item.gestor}</td>
                    <td style={td}>{item.asignados}</td>
                    <td style={td}>{item.gestionados}</td>
                    <td style={td}>{item.pendientes}</td>
                    <td style={td}>
                      <strong>{item.porcentaje}%</strong>
                    </td>
                  </tr>
                ))}

                {gestoresMedicion.length === 0 && (
                  <tr>
                    <td style={td} colSpan="5">
                      No hay gestores para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalAsignar && (
          <div style={modalFondo}>
            <div style={modal}>
              <h2 style={tituloSeccion}>Cambiar gestor</h2>

              <p style={ayuda}>
                Cliente:{" "}
                <strong>{cuentaSeleccionada?.cliente?.nombre || "-"}</strong>
                <br />
                Cuenta:{" "}
                <strong>
                  {cuentaSeleccionada?.cuenta?.numero_cuenta || "-"}
                </strong>
              </p>

              <Campo label="Gestor">
                <select
                  value={gestorSeleccionado}
                  onChange={(e) => setGestorSeleccionado(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccione gestor</option>
                  {usuariosGestores.map((gestor) => (
                    <option key={gestor.id} value={gestor.id}>
                      {gestor.nombre}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Motivo">
                <textarea
                  value={observacionAsignacion}
                  onChange={(e) => setObservacionAsignacion(e.target.value)}
                  placeholder="Motivo del cambio de gestor"
                  style={textarea}
                />
              </Campo>

              <div style={accionesModal}>
                <button style={botonAsignar} onClick={guardarAsignacionGestor}>
                  Guardar cambio
                </button>

                <button style={botonLimpiar} onClick={cerrarModalAsignar}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
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

const pagina = {
  minHeight: "100vh",
  background: "#eef2f7",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1500px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "26px",
  borderRadius: "22px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const tituloHero = {
  margin: 0,
  fontSize: "36px",
  fontWeight: "bold",
};

const subtituloHero = {
  color: "#dcfce7",
  marginTop: "8px",
  marginBottom: 0,
  fontSize: "15px",
};

const card = {
  background: "#ffffff",
  padding: "22px",
  borderRadius: "18px",
  marginBottom: "16px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const asignacionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const tituloSeccion = {
  margin: 0,
  color: "#111827",
  fontSize: "22px",
};

const ayuda = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#6b7280",
  fontSize: "14px",
};

const gridFiltros = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: "14px",
  alignItems: "end",
};

const gridAsignacion = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
  gap: "14px",
  alignItems: "end",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
  fontSize: "14px",
};

const textarea = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
};

const botonesLinea = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const botonClaro = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 20px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonBuscar = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonAsignar = {
  background: "#047857",
  color: "#ffffff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
};

const botonNegro = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonLimpiar = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonMini = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1150px",
};

const tablaMedicion = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "700px",
};

const th = {
  background: "#111827",
  color: "#ffffff",
  padding: "12px",
  textAlign: "left",
  fontSize: "13px",
};

const td = {
  padding: "11px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
  color: "#111827",
};

const estadoVerde = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const estadoRojo = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "5px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const modalFondo = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
  zIndex: 999,
};

const modal = {
  width: "480px",
  maxWidth: "100%",
  background: "#ffffff",
  padding: "24px",
  borderRadius: "18px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
};

const accionesModal = {
  display: "flex",
  gap: "10px",
  marginTop: "18px",
};
