"use client";

// KONAX · Suscripciones / Membresías · 2026.08.07-S
// MISMO archivo: pantalla principal + nueva membresía + administrar planes.
// No usa /planes y no necesita una carpeta nueva.

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

const DIAS_AVISO = 5;
const DIAS_GRACIA = 3;

const MEMBRESIA_INICIAL = {
  planId: "",
  fechaInicio: "",
  descripcion: "",
};

const PLAN_INICIAL = {
  nombre: "",
  descripcion: "",
  precio: "",
  periodicidad: "Mensual",
  duracionCantidad: "1",
  duracionUnidad: "Meses",
  diasAviso: String(DIAS_AVISO),
  diasGracia: String(DIAS_GRACIA),
  activo: true,
};

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fechaHoy() {
  const hoy = new Date();
  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("-");
}

function fechaLocal(fechaTexto) {
  if (!fechaTexto) return null;
  const [a, m, d] = String(fechaTexto).slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d, 12, 0, 0, 0);
}

function formatearFecha(fechaTexto) {
  if (!fechaTexto) return "-";
  const [a, m, d] = String(fechaTexto).slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : String(fechaTexto);
}

function sumarDias(fechaTexto, dias) {
  const fecha = fechaLocal(fechaTexto);
  if (!fecha) return "";
  fecha.setDate(fecha.getDate() + Number(dias || 0));
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function sumarMeses(fechaTexto, meses) {
  const fecha = fechaLocal(fechaTexto);
  if (!fecha) return "";
  const diaOriginal = fecha.getDate();
  fecha.setDate(1);
  fecha.setMonth(fecha.getMonth() + Number(meses || 0));
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  fecha.setDate(Math.min(diaOriginal, ultimoDia));
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function calcularVencimiento(fechaBase, cantidad, unidad) {
  if (!fechaBase) return "";
  const n = Math.max(1, Number(cantidad || 1));

  if (unidad === "Días") return sumarDias(fechaBase, n);
  if (unidad === "Semanas") return sumarDias(fechaBase, n * 7);
  if (unidad === "Años") return sumarMeses(fechaBase, n * 12);
  return sumarMeses(fechaBase, n);
}

function diasParaVencer(fechaTexto) {
  const vence = fechaLocal(fechaTexto);
  const hoy = fechaLocal(fechaHoy());
  if (!vence || !hoy) return 0;
  return Math.ceil((vence.getTime() - hoy.getTime()) / 86400000);
}

function estadoAutomatico(item) {
  const guardado = normalizar(item.estado);
  if (guardado === "cancelado") return "Cancelado";
  if (guardado === "suspendido") return "Suspendido";
  if (guardado === "pendiente") return "Pendiente";

  const aviso = Math.max(0, Number(item.dias_aviso ?? DIAS_AVISO));
  const gracia = Math.max(0, Number(item.dias_gracia ?? DIAS_GRACIA));
  const dias = diasParaVencer(item.fecha_vencimiento);

  if (dias < -gracia) return "Suspendido";
  if (dias < 0) return "Vencida";
  if (dias <= aviso) return "Próxima a vencer";
  return "Activo";
}

function duracionPorPeriodicidad(periodicidad) {
  const mapa = {
    Diaria: ["1", "Días"],
    Semanal: ["1", "Semanas"],
    Quincenal: ["15", "Días"],
    Mensual: ["1", "Meses"],
    Trimestral: ["3", "Meses"],
    Semestral: ["6", "Meses"],
    Anual: ["1", "Años"],
  };
  return mapa[periodicidad] || mapa.Mensual;
}

function SuscripcionesContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clienteIdUrl = searchParams.get("clienteId") || "";
  const modoUrl = searchParams.get("modo") || "";

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [vista, setVista] = useState(
    modoUrl === "nueva" || clienteIdUrl ? "nueva" : "principal"
  );
  const [esMovil, setEsMovil] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [planes, setPlanes] = useState([]);
  const [suscripciones, setSuscripciones] = useState([]);

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [buscarCliente, setBuscarCliente] = useState("");
  const [resultadosClientes, setResultadosClientes] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const [formMembresia, setFormMembresia] = useState({
    ...MEMBRESIA_INICIAL,
    fechaInicio: fechaHoy(),
  });

  const [formPlan, setFormPlan] = useState(PLAN_INICIAL);
  const [planEditandoId, setPlanEditandoId] = useState(null);

  useEffect(() => {
    inicializar();

    const medir = () => setEsMovil(window.innerWidth <= 820);
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [clienteIdUrl]);

  async function inicializar() {
    setCargando(true);

    const id = localStorage.getItem("empresaId");
    if (!id) {
      alert("No hay una empresa activa. Inicie sesión nuevamente.");
      router.replace("/login");
      return;
    }

    setEmpresaId(id);

    await Promise.all([
      cargarEmpresa(id),
      cargarPlanes(id),
      cargarSuscripciones(id),
    ]);

    if (clienteIdUrl) {
      await cargarClientePorId(id, clienteIdUrl);
      setVista("nueva");
    }

    setCargando(false);
  }

  async function cargarEmpresa(id) {
    const nombreLocal =
      localStorage.getItem("empresaNombre") ||
      localStorage.getItem("empresaAdminCreadaNombre") ||
      "";

    const { data, error } = await supabase
      .from("empresas")
      .select("nombre")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(error);
      setEmpresaNombre(nombreLocal || "Tu gimnasio");
      return;
    }

    const nombre = data?.nombre || nombreLocal || "Tu gimnasio";
    setEmpresaNombre(nombre);
    localStorage.setItem("empresaNombre", nombre);
  }

  async function cargarPlanes(id = empresaId) {
    if (!id) return;

    const { data, error } = await supabase
      .from("planes_membresia")
      .select("*")
      .eq("empresa_id", id)
      .order("activo", { ascending: false })
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando planes de membresía: " + error.message);
      return;
    }

    setPlanes(data || []);
  }

  async function cargarSuscripciones(id = empresaId) {
    if (!id) return;

    const { data, error } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", id)
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      alert("Error cargando membresías: " + error.message);
      return;
    }

    const lista = data || [];
    const ids = [...new Set(lista.map((x) => x.cliente_id).filter(Boolean))];

    let clientes = [];
    if (ids.length > 0) {
      const { data: clientesData, error: errorClientes } = await supabase
        .from("clientes")
        .select("id,nombre,cedula,telefono,correo,estado")
        .eq("empresa_id", id)
        .in("id", ids);

      if (!errorClientes) clientes = clientesData || [];
    }

    const mapa = new Map(clientes.map((x) => [String(x.id), x]));

    setSuscripciones(
      lista.map((item) => {
        const cliente = mapa.get(String(item.cliente_id));
        return {
          ...item,
          cliente: item.cliente || cliente?.nombre || "Alumno",
          cedula: item.cedula || cliente?.cedula || "",
          telefono: cliente?.telefono || "",
          correo: cliente?.correo || "",
        };
      })
    );
  }

  async function cargarClientePorId(id, clienteId) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nombre,cedula,telefono,correo,estado")
      .eq("empresa_id", id)
      .eq("id", clienteId)
      .maybeSingle();

    if (error || !data) {
      alert("No se pudo cargar el alumno: " + (error?.message || "Alumno no encontrado."));
      return;
    }

    seleccionarCliente(data);
  }

  async function buscarClientes() {
    if (!empresaId) return;

    const texto = buscarCliente.trim();
    if (texto.length < 3) {
      alert("Escriba por lo menos tres caracteres.");
      return;
    }

    const seguro = texto.replace(/[%_,()]/g, "");

    const { data, error } = await supabase
      .from("clientes")
      .select("id,nombre,cedula,telefono,correo,estado")
      .eq("empresa_id", empresaId)
      .or(`nombre.ilike.%${seguro}%,cedula.ilike.%${seguro}%,telefono.ilike.%${seguro}%`)
      .limit(12);

    if (error) {
      alert("Error buscando alumnos: " + error.message);
      return;
    }

    setResultadosClientes(data || []);
  }

  function seleccionarCliente(cliente) {
    setClienteSeleccionado(cliente);
    setBuscarCliente(cliente.nombre || cliente.cedula || "");
    setResultadosClientes([]);
  }

  const planesActivos = useMemo(
    () => planes.filter((plan) => plan.activo !== false),
    [planes]
  );

  const planSeleccionado = useMemo(
    () =>
      planesActivos.find(
        (plan) => String(plan.id) === String(formMembresia.planId)
      ) || null,
    [planesActivos, formMembresia.planId]
  );

  const vencimientoNuevo = useMemo(() => {
    if (!planSeleccionado || !formMembresia.fechaInicio) return "";
    return calcularVencimiento(
      formMembresia.fechaInicio,
      planSeleccionado.duracion_cantidad,
      planSeleccionado.duracion_unidad
    );
  }, [planSeleccionado, formMembresia.fechaInicio]);

  const resumen = useMemo(() => {
    const r = { activas: 0, proximas: 0, vencidas: 0, suspendidas: 0 };

    suscripciones.forEach((item) => {
      const estado = estadoAutomatico(item);
      if (estado === "Activo") r.activas += 1;
      if (estado === "Próxima a vencer") r.proximas += 1;
      if (estado === "Vencida") r.vencidas += 1;
      if (estado === "Suspendido") r.suspendidas += 1;
    });

    return r;
  }, [suscripciones]);

  const membresiasFiltradas = useMemo(() => {
    const texto = normalizar(busqueda);

    return suscripciones.filter((item) => {
      const estado = estadoAutomatico(item);
      const coincideTexto = normalizar(
        `${item.cliente || ""} ${item.cedula || ""} ${item.telefono || ""} ${item.plan || ""} ${estado}`
      ).includes(texto);
      const coincideEstado = filtroEstado === "Todos" || estado === filtroEstado;
      return coincideTexto && coincideEstado;
    });
  }, [suscripciones, busqueda, filtroEstado]);

  function abrirPrincipal() {
    setVista("principal");
    setClienteSeleccionado(null);
    setBuscarCliente("");
    setResultadosClientes([]);
    setFormMembresia({ ...MEMBRESIA_INICIAL, fechaInicio: fechaHoy() });
    router.replace("/suscripciones");
  }

  function abrirNueva() {
    setVista("nueva");
    setFormMembresia({ ...MEMBRESIA_INICIAL, fechaInicio: fechaHoy() });
  }

  function abrirPlanes() {
    setVista("planes");
    limpiarPlan();
  }

  function limpiarPlan() {
    setFormPlan(PLAN_INICIAL);
    setPlanEditandoId(null);
  }

  function cambiarPeriodicidad(periodicidad) {
    const [cantidad, unidad] = duracionPorPeriodicidad(periodicidad);
    setFormPlan((actual) => ({
      ...actual,
      periodicidad,
      duracionCantidad: cantidad,
      duracionUnidad: unidad,
    }));
  }

  function editarPlan(plan) {
    setPlanEditandoId(plan.id);
    setFormPlan({
      nombre: plan.nombre || "",
      descripcion: plan.descripcion || "",
      precio: String(Number(plan.precio || 0)),
      periodicidad: plan.periodicidad || "Mensual",
      duracionCantidad: String(plan.duracion_cantidad || 1),
      duracionUnidad: plan.duracion_unidad || "Meses",
      diasAviso: String(plan.dias_aviso ?? DIAS_AVISO),
      diasGracia: String(plan.dias_gracia ?? DIAS_GRACIA),
      activo: plan.activo !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarPlan() {
    if (!empresaId || guardando) return;

    const nombre = formPlan.nombre.trim();
    const precio = Number(formPlan.precio);
    const duracion = Number(formPlan.duracionCantidad);
    const aviso = Number(formPlan.diasAviso || 0);
    const gracia = Number(formPlan.diasGracia || 0);

    if (!nombre) return alert("Escriba el nombre del plan.");
    if (!Number.isFinite(precio) || precio <= 0) return alert("El precio debe ser mayor que cero.");
    if (!Number.isInteger(duracion) || duracion <= 0) return alert("La duración debe ser mayor que cero.");
    if (!Number.isInteger(aviso) || aviso < 0 || !Number.isInteger(gracia) || gracia < 0) {
      return alert("Revise los días de aviso y de gracia.");
    }

    const payload = {
      empresa_id: empresaId,
      nombre,
      descripcion: formPlan.descripcion.trim() || null,
      precio,
      periodicidad: formPlan.periodicidad,
      duracion_cantidad: duracion,
      duracion_unidad: formPlan.duracionUnidad,
      dias_aviso: aviso,
      dias_gracia: gracia,
      activo: Boolean(formPlan.activo),
    };

    setGuardando(true);

    try {
      if (planEditandoId) {
        const { error } = await supabase
          .from("planes_membresia")
          .update(payload)
          .eq("id", planEditandoId)
          .eq("empresa_id", empresaId);
        if (error) throw error;
        alert("Plan actualizado correctamente.");
      } else {
        const { error } = await supabase.from("planes_membresia").insert([payload]);
        if (error) throw error;
        alert("Plan creado correctamente.");
      }

      limpiarPlan();
      await cargarPlanes(empresaId);
    } catch (error) {
      alert("No se pudo guardar el plan: " + error.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstadoPlan(plan) {
    if (!empresaId || guardando) return;

    const nuevoEstado = !Boolean(plan.activo);
    const accion = nuevoEstado ? "activar" : "desactivar";
    if (!confirm(`¿Deseas ${accion} el plan \"${plan.nombre}\"?`)) return;

    setGuardando(true);
    try {
      const { error } = await supabase
        .from("planes_membresia")
        .update({ activo: nuevoEstado })
        .eq("id", plan.id)
        .eq("empresa_id", empresaId);
      if (error) throw error;
      await cargarPlanes(empresaId);
    } catch (error) {
      alert("No se pudo cambiar el estado del plan: " + error.message);
    } finally {
      setGuardando(false);
    }
  }

  async function crearMembresia() {
    if (!empresaId || guardando) return;
    if (!clienteSeleccionado?.id) return alert("Seleccione un alumno registrado.");
    if (!planSeleccionado) return alert("Seleccione un plan de membresía.");
    if (!formMembresia.fechaInicio || !vencimientoNuevo) return alert("Seleccione una fecha de inicio válida.");

    const existente = suscripciones.find((item) => {
      if (String(item.cliente_id) !== String(clienteSeleccionado.id)) return false;
      return ["Activo", "Próxima a vencer", "Pendiente"].includes(estadoAutomatico(item));
    });

    if (existente) {
      return alert(`${clienteSeleccionado.nombre} ya tiene una membresía ${estadoAutomatico(existente).toLowerCase()}.`);
    }

    const precio = Number(planSeleccionado.precio || 0);
    if (!Number.isFinite(precio) || precio <= 0) return alert("El plan seleccionado no tiene un precio válido.");

    setGuardando(true);
    let comercialCreado = null;

    try {
      const numeroCuenta = `MEM-${Date.now()}`;
      const responsable =
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("adminKonaxNombre") ||
        "Administración";

      const { data: comercial, error: errorComercial } = await supabase
        .from("informacion_comercial")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: clienteSeleccionado.id,
            plan_membresia_id: planSeleccionado.id,
            numero_cuenta: numeroCuenta,
            tipo_producto: "Membresía",
            descripcion: `${planSeleccionado.nombre} - ${
              formMembresia.descripcion || planSeleccionado.descripcion || ""
            }`,
            modalidad: planSeleccionado.periodicidad,
            monto_total: precio,
            saldo_actual: precio,
            cuota: precio,
            fecha_inicio: formMembresia.fechaInicio,
            fecha_vencimiento: vencimientoNuevo,
            responsable,
            estado: "Pendiente",
            estado_servicio: "Pendiente",
            observacion:
              formMembresia.descripcion.trim() || planSeleccionado.descripcion || null,
          },
        ])
        .select()
        .single();

      if (errorComercial) throw new Error("Error creando información comercial: " + errorComercial.message);
      comercialCreado = comercial;

      const { data: suscripcionCreada, error: errorSuscripcion } = await supabase
        .from("suscripciones")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: clienteSeleccionado.id,
            informacion_comercial_id: comercial.id,
            plan_membresia_id: planSeleccionado.id,
            cliente: clienteSeleccionado.nombre,
            cedula: clienteSeleccionado.cedula || "",
            plan: planSeleccionado.nombre,
            tipo_servicio: "Membresía",
            descripcion:
              formMembresia.descripcion.trim() || planSeleccionado.descripcion || "",
            precio,
            vendedor: responsable,
            forma_pago: "Pendiente",
            fecha_inicio: formMembresia.fechaInicio,
            fecha_vencimiento: vencimientoNuevo,
            periodicidad: planSeleccionado.periodicidad,
            duracion_cantidad: Number(planSeleccionado.duracion_cantidad || 1),
            duracion_unidad: planSeleccionado.duracion_unidad || "Meses",
            dias_aviso: Number(planSeleccionado.dias_aviso ?? DIAS_AVISO),
            dias_gracia: Number(planSeleccionado.dias_gracia ?? DIAS_GRACIA),
            estado: "Pendiente",
          },
        ])
        .select("id,cliente_id,informacion_comercial_id")
        .single();

      if (errorSuscripcion) throw new Error("Error creando membresía: " + errorSuscripcion.message);

      router.push(
        `/caja?clienteId=${encodeURIComponent(clienteSeleccionado.id)}` +
          `&suscripcionId=${encodeURIComponent(suscripcionCreada.id)}` +
          `&cuentaId=${encodeURIComponent(comercial.id)}` +
          `&flujo=nueva_membresia`
      );
    } catch (error) {
      if (comercialCreado?.id) {
        await supabase
          .from("informacion_comercial")
          .delete()
          .eq("id", comercialCreado.id)
          .eq("empresa_id", empresaId);
      }
      alert(error.message || "No se pudo crear la membresía.");
    } finally {
      setGuardando(false);
    }
  }

  function irACaja(item) {
    if (!item?.cliente_id) return alert("La membresía no tiene un alumno vinculado.");

    const params = new URLSearchParams({
      clienteId: String(item.cliente_id),
      suscripcionId: String(item.id),
      flujo: "renovacion",
    });

    if (item.informacion_comercial_id) {
      params.set("cuentaId", String(item.informacion_comercial_id));
    }

    router.push(`/caja?${params.toString()}`);
  }

  if (cargando) {
    return (
      <div style={s.loading}>
        <img src="/konax-logo.png" alt="KONAX" style={s.loadingLogo} />
        <strong>Preparando membresías...</strong>
      </div>
    );
  }

  // ---------------- ADMINISTRAR PLANES ----------------
  if (vista === "planes") {
    return (
      <main style={s.page}>
        <div style={{ ...s.container, ...(esMovil ? s.mobileContainer : {}) }}>
          <Header
            etiqueta="PLANES DE MEMBRESÍA"
            titulo="Administrar planes"
            texto="Crea los planes que luego podrás asignar a cada alumno."
            boton="← Regresar a Membresías"
            onBack={abrirPrincipal}
            esMovil={esMovil}
          />

          <section style={s.card}>
            <div style={s.sectionHeader}>
              <div>
                <span style={s.eyebrow}>{planEditandoId ? "EDITANDO PLAN" : "NUEVO PLAN"}</span>
                <h2 style={s.sectionTitle}>
                  {planEditandoId ? "Actualizar plan de membresía" : "Crear plan de membresía"}
                </h2>
              </div>
              {planEditandoId && (
                <button type="button" onClick={limpiarPlan} style={s.secondaryBtn}>
                  Cancelar edición
                </button>
              )}
            </div>

            <div style={{ ...s.formGrid, ...(esMovil ? s.oneColumn : {}) }}>
              <Field label="Nombre del plan *">
                <input
                  value={formPlan.nombre}
                  onChange={(e) => setFormPlan((x) => ({ ...x, nombre: e.target.value }))}
                  placeholder="Ej. Plan Regular"
                  style={s.input}
                />
              </Field>

              <Field label="Precio *">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formPlan.precio}
                  onChange={(e) => setFormPlan((x) => ({ ...x, precio: e.target.value }))}
                  placeholder="20.00"
                  style={s.input}
                />
              </Field>

              <Field label="Periodicidad">
                <select
                  value={formPlan.periodicidad}
                  onChange={(e) => cambiarPeriodicidad(e.target.value)}
                  style={s.input}
                >
                  <option>Diaria</option>
                  <option>Semanal</option>
                  <option>Quincenal</option>
                  <option>Mensual</option>
                  <option>Trimestral</option>
                  <option>Semestral</option>
                  <option>Anual</option>
                </select>
              </Field>

              <Field label="Duración">
                <div style={s.durationGrid}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formPlan.duracionCantidad}
                    onChange={(e) => setFormPlan((x) => ({ ...x, duracionCantidad: e.target.value }))}
                    style={s.input}
                  />
                  <select
                    value={formPlan.duracionUnidad}
                    onChange={(e) => setFormPlan((x) => ({ ...x, duracionUnidad: e.target.value }))}
                    style={s.input}
                  >
                    <option>Días</option>
                    <option>Semanas</option>
                    <option>Meses</option>
                    <option>Años</option>
                  </select>
                </div>
              </Field>

              <Field label="Avisar antes de vencer">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formPlan.diasAviso}
                  onChange={(e) => setFormPlan((x) => ({ ...x, diasAviso: e.target.value }))}
                  style={s.input}
                />
              </Field>

              <Field label="Días de gracia">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formPlan.diasGracia}
                  onChange={(e) => setFormPlan((x) => ({ ...x, diasGracia: e.target.value }))}
                  style={s.input}
                />
              </Field>
            </div>

            <Field label="Descripción">
              <textarea
                value={formPlan.descripcion}
                onChange={(e) => setFormPlan((x) => ({ ...x, descripcion: e.target.value }))}
                placeholder="Ej. Acceso mensual al gimnasio"
                style={s.textarea}
              />
            </Field>

            <label style={s.checkRow}>
              <input
                type="checkbox"
                checked={formPlan.activo}
                onChange={(e) => setFormPlan((x) => ({ ...x, activo: e.target.checked }))}
              />
              Plan activo
            </label>

            <button
              type="button"
              onClick={guardarPlan}
              disabled={guardando}
              style={{ ...s.primaryBtn, opacity: guardando ? 0.6 : 1 }}
            >
              {guardando ? "Guardando..." : planEditandoId ? "Actualizar plan" : "Crear plan"}
            </button>
          </section>

          <section style={s.card}>
            <div style={s.sectionHeader}>
              <div>
                <span style={s.eyebrow}>CATÁLOGO</span>
                <h2 style={s.sectionTitle}>Planes disponibles</h2>
              </div>
              <span style={s.counter}>{planes.length}</span>
            </div>

            {planes.length === 0 ? (
              <div style={s.empty}>Todavía no hay planes creados.</div>
            ) : (
              <div style={s.list}>
                {planes.map((plan) => (
                  <article key={plan.id} style={s.planCard}>
                    <div>
                      <div style={s.titleRow}>
                        <strong>{plan.nombre}</strong>
                        <span style={plan.activo ? s.activeBadge : s.inactiveBadge}>
                          {plan.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <strong style={s.price}>B/. {Number(plan.precio || 0).toFixed(2)}</strong>
                      <span style={s.meta}>
                        {plan.periodicidad || "Mensual"} · {Number(plan.duracion_cantidad || 1)} {plan.duracion_unidad || "Meses"}
                      </span>
                      {plan.descripcion && <p style={s.description}>{plan.descripcion}</p>}
                    </div>

                    <div style={{ ...s.actions, ...(esMovil ? s.actionsMobile : {}) }}>
                      <button type="button" onClick={() => editarPlan(plan)} style={s.secondaryBtn}>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => cambiarEstadoPlan(plan)}
                        style={plan.activo ? s.warningBtn : s.greenOutlineBtn}
                      >
                        {plan.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  // ---------------- NUEVA MEMBRESÍA ----------------
  if (vista === "nueva") {
    return (
      <main style={s.page}>
        <div style={{ ...s.narrow, ...(esMovil ? s.mobileContainer : {}) }}>
          <Header
            etiqueta="NUEVA MEMBRESÍA"
            titulo="Asignar membresía"
            texto="Selecciona el alumno, el plan y continúa a Caja."
            boton="← Regresar a Membresías"
            onBack={abrirPrincipal}
            esMovil={esMovil}
          />

          <div style={s.steps}>
            <span style={s.stepDone}>1. Alumno</span>
            <span style={s.stepActive}>2. Membresía</span>
            <span style={s.step}>3. Caja</span>
          </div>

          <section style={s.card}>
            <span style={s.eyebrow}>ALUMNO</span>
            <h2 style={s.sectionTitle}>Seleccionar alumno</h2>

            {!clienteSeleccionado ? (
              <>
                <div style={{ ...s.searchRow, ...(esMovil ? s.oneColumn : {}) }}>
                  <input
                    value={buscarCliente}
                    onChange={(e) => setBuscarCliente(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && buscarClientes()}
                    placeholder="Nombre, cédula o teléfono"
                    style={s.input}
                  />
                  <button type="button" onClick={buscarClientes} style={s.darkBtn}>
                    Buscar
                  </button>
                </div>

                {resultadosClientes.length > 0 && (
                  <div style={s.list}>
                    {resultadosClientes.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => seleccionarCliente(cliente)}
                        style={s.result}
                      >
                        <strong>{cliente.nombre}</strong>
                        <span>{cliente.cedula || "Sin cédula"}</span>
                        <small>{cliente.telefono || "Sin teléfono"}</small>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={s.studentCard}>
                <div style={s.avatar}>{String(clienteSeleccionado.nombre || "A").charAt(0).toUpperCase()}</div>
                <div>
                  <strong>{clienteSeleccionado.nombre}</strong>
                  <span style={s.meta}>Cédula: {clienteSeleccionado.cedula || "-"}</span>
                  <span style={s.meta}>Teléfono: {clienteSeleccionado.telefono || "-"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setBuscarCliente("");
                  }}
                  style={s.secondaryBtn}
                >
                  Cambiar
                </button>
              </div>
            )}
          </section>

          <section style={s.card}>
            <div style={s.sectionHeader}>
              <div>
                <span style={s.eyebrow}>PLAN</span>
                <h2 style={s.sectionTitle}>Plan y vigencia</h2>
              </div>
              <button type="button" onClick={abrirPlanes} style={s.secondaryBtn}>
                ⚙ Administrar planes
              </button>
            </div>

            {planesActivos.length === 0 ? (
              <div style={s.noPlans}>
                <strong>No hay planes activos.</strong>
                <span>Crea primero un plan para poder asignar una membresía.</span>
                <button type="button" onClick={abrirPlanes} style={s.primaryBtn}>
                  + Crear plan
                </button>
              </div>
            ) : (
              <div style={{ ...s.formGrid, ...(esMovil ? s.oneColumn : {}) }}>
                <Field label="Plan *">
                  <select
                    value={formMembresia.planId}
                    onChange={(e) => setFormMembresia((x) => ({ ...x, planId: e.target.value }))}
                    style={s.input}
                  >
                    <option value="">Seleccione un plan</option>
                    {planesActivos.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} · B/. {Number(plan.precio || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Fecha de inicio *">
                  <input
                    type="date"
                    value={formMembresia.fechaInicio}
                    onChange={(e) => setFormMembresia((x) => ({ ...x, fechaInicio: e.target.value }))}
                    style={s.input}
                  />
                </Field>

                <Field label="Precio">
                  <input
                    readOnly
                    value={
                      planSeleccionado
                        ? `B/. ${Number(planSeleccionado.precio || 0).toFixed(2)}`
                        : ""
                    }
                    style={s.readonly}
                  />
                </Field>

                <Field label="Vencimiento">
                  <input readOnly value={formatearFecha(vencimientoNuevo)} style={s.readonly} />
                </Field>
              </div>
            )}

            <Field label="Observación">
              <textarea
                value={formMembresia.descripcion}
                onChange={(e) => setFormMembresia((x) => ({ ...x, descripcion: e.target.value }))}
                placeholder="Opcional"
                style={s.textarea}
              />
            </Field>

            <button
              type="button"
              onClick={crearMembresia}
              disabled={guardando || planesActivos.length === 0}
              style={{
                ...s.primaryBtn,
                opacity: guardando || planesActivos.length === 0 ? 0.6 : 1,
              }}
            >
              {guardando ? "Guardando..." : "Guardar y continuar a Caja →"}
            </button>
          </section>
        </div>
      </main>
    );
  }

  // ---------------- PANTALLA PRINCIPAL ----------------
  return (
    <main style={s.page}>
      <div style={{ ...s.container, ...(esMovil ? s.mobileContainer : {}) }}>
        <Header
          etiqueta="CONTROL DE MEMBRESÍAS"
          titulo="Membresías del gimnasio"
          texto={`${empresaNombre} · Control de planes, vigencias y renovaciones.`}
          boton="← Volver al Dashboard"
          onBack={() => router.push("/dashboard")}
          esMovil={esMovil}
        />

        <div style={{ ...s.topActions, ...(esMovil ? s.oneColumn : {}) }}>
          <button type="button" onClick={abrirNueva} style={s.primaryBtn}>
            + Nueva membresía
          </button>
          <button type="button" onClick={abrirPlanes} style={s.secondaryBtn}>
            ⚙ Administrar planes
          </button>
        </div>

        <section style={{ ...s.kpiGrid, ...(esMovil ? s.kpiGridMobile : {}) }}>
          <KPI titulo="Activas" valor={resumen.activas} tipo="verde" />
          <KPI titulo="Próximas a vencer" valor={resumen.proximas} tipo="amarillo" />
          <KPI titulo="Vencidas" valor={resumen.vencidas} tipo="naranja" />
          <KPI titulo="Suspendidas" valor={resumen.suspendidas} tipo="rojo" />
        </section>

        <section style={s.card}>
          <div style={{ ...s.filters, ...(esMovil ? s.oneColumn : {}) }}>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar alumno, cédula, teléfono o plan"
              style={s.input}
            />
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={s.input}>
              <option>Todos</option>
              <option>Activo</option>
              <option>Próxima a vencer</option>
              <option>Pendiente</option>
              <option>Vencida</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
            </select>
          </div>

          <div style={s.list}>
            {membresiasFiltradas.length === 0 ? (
              <div style={s.empty}>No hay membresías para mostrar.</div>
            ) : (
              membresiasFiltradas.map((item) => {
                const estado = estadoAutomatico(item);
                return (
                  <article key={item.id} style={s.memberCard}>
                    <div style={{ ...s.memberGrid, ...(esMovil ? s.oneColumn : {}) }}>
                      <div>
                        <strong>{item.cliente}</strong>
                        <span style={s.meta}>
                          {item.cedula || "Sin cédula"} · {item.telefono || "Sin teléfono"}
                        </span>
                      </div>
                      <div>
                        <strong>{item.plan || "Sin plan"}</strong>
                        <span style={s.meta}>
                          B/. {Number(item.precio || 0).toFixed(2)} · vence {formatearFecha(item.fecha_vencimiento)}
                        </span>
                      </div>
                      <Estado estado={estado} />
                    </div>
                    <div style={s.memberActions}>
                      <button type="button" onClick={() => irACaja(item)} style={s.greenOutlineBtn}>
                        Ir a Caja
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Header({ etiqueta, titulo, texto, boton, onBack, esMovil }) {
  return (
    <header style={{ ...s.hero, ...(esMovil ? s.heroMobile : {}) }}>
      <div>
        <span style={s.eyebrow}>{etiqueta}</span>
        <h1 style={{ ...s.heroTitle, ...(esMovil ? s.heroTitleMobile : {}) }}>{titulo}</h1>
        <p style={s.heroText}>{texto}</p>
      </div>
      <button type="button" onClick={onBack} style={s.heroBack}>
        {boton}
      </button>
    </header>
  );
}

function Field({ label, children }) {
  return (
    <label style={s.field}>
      <span style={s.label}>{label}</span>
      {children}
    </label>
  );
}

function KPI({ titulo, valor, tipo }) {
  const fondo = {
    verde: "#ecfdf3",
    amarillo: "#fffbeb",
    naranja: "#fff7ed",
    rojo: "#fef2f2",
  }[tipo];

  const color = {
    verde: "#166534",
    amarillo: "#92400e",
    naranja: "#9a3412",
    rojo: "#991b1b",
  }[tipo];

  return (
    <div style={{ ...s.kpi, background: fondo }}>
      <span style={s.kpiLabel}>{titulo}</span>
      <strong style={{ ...s.kpiValue, color }}>{valor}</strong>
    </div>
  );
}

function Estado({ estado }) {
  const estilos = {
    Activo: ["#dcfce7", "#166534"],
    "Próxima a vencer": ["#fef3c7", "#92400e"],
    Pendiente: ["#e0f2fe", "#075985"],
    Vencida: ["#ffedd5", "#9a3412"],
    Suspendido: ["#fee2e2", "#991b1b"],
    Cancelado: ["#f3f4f6", "#4b5563"],
  };

  const [background, color] = estilos[estado] || estilos.Cancelado;

  return (
    <span style={{ ...s.status, background, color }}>
      {estado}
    </span>
  );
}

export default function Suscripciones() {
  return (
    <Suspense fallback={<div style={s.loading}>Cargando...</div>}>
      <SuscripcionesContenido />
    </Suspense>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f4f7f5",
    color: "#17211c",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  container: {
    width: "min(1180px, calc(100% - 36px))",
    margin: "0 auto",
    padding: "24px 0 42px",
    boxSizing: "border-box",
  },
  narrow: {
    width: "min(900px, calc(100% - 36px))",
    margin: "0 auto",
    padding: "24px 0 42px",
    boxSizing: "border-box",
  },
  mobileContainer: {
    width: "100%",
    padding: "12px 12px 30px",
    overflowX: "hidden",
  },
  hero: {
    padding: "24px 26px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    border: "1px solid #d5e8dc",
    borderRadius: 22,
    background: "linear-gradient(135deg,#f9fffb,#e9f7ee)",
    boxShadow: "0 12px 28px rgba(20,70,43,.07)",
  },
  heroMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    padding: "19px 17px",
  },
  eyebrow: {
    display: "block",
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.15,
    marginBottom: 6,
  },
  heroTitle: {
    margin: 0,
    fontSize: 31,
    lineHeight: 1.08,
  },
  heroTitleMobile: { fontSize: 27 },
  heroText: {
    margin: "8px 0 0",
    color: "#65736a",
    fontSize: 12.5,
    lineHeight: 1.5,
  },
  heroBack: {
    minHeight: 42,
    padding: "10px 14px",
    border: "1px solid #bed4c5",
    borderRadius: 11,
    background: "#fff",
    color: "#173c2a",
    fontWeight: 850,
    cursor: "pointer",
  },
  topActions: {
    margin: "14px 0",
    display: "grid",
    gridTemplateColumns: "max-content max-content",
    gap: 10,
  },
  card: {
    marginTop: 14,
    padding: 18,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#fff",
    boxShadow: "0 8px 24px rgba(15,23,42,.045)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  sectionTitle: { margin: "4px 0 0", fontSize: 20 },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 12,
  },
  oneColumn: { gridTemplateColumns: "1fr" },
  field: { display: "grid", gap: 6, marginBottom: 12 },
  label: { color: "#39473f", fontSize: 10.5, fontWeight: 800 },
  input: {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    boxSizing: "border-box",
    border: "1px solid #ccd8d0",
    borderRadius: 10,
    background: "#fff",
    color: "#17211c",
    fontSize: 16,
    outline: "none",
  },
  readonly: {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    boxSizing: "border-box",
    border: "1px solid #dce5df",
    borderRadius: 10,
    background: "#f5f8f6",
    color: "#526159",
    fontSize: 16,
  },
  textarea: {
    width: "100%",
    minHeight: 84,
    padding: "11px 12px",
    boxSizing: "border-box",
    border: "1px solid #ccd8d0",
    borderRadius: 10,
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: 16,
  },
  durationGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(90px,.7fr) minmax(130px,1.3fr)",
    gap: 8,
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "2px 0 14px",
    fontSize: 11,
    fontWeight: 800,
  },
  primaryBtn: {
    minHeight: 45,
    padding: "10px 15px",
    border: 0,
    borderRadius: 11,
    background: "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryBtn: {
    minHeight: 42,
    padding: "9px 13px",
    border: "1px solid #cbd8d0",
    borderRadius: 10,
    background: "#fff",
    color: "#26342c",
    fontWeight: 850,
    cursor: "pointer",
  },
  darkBtn: {
    minHeight: 44,
    padding: "10px 15px",
    border: 0,
    borderRadius: 10,
    background: "#173c2a",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  warningBtn: {
    minHeight: 40,
    padding: "8px 12px",
    border: "1px solid #fed7aa",
    borderRadius: 9,
    background: "#fff7ed",
    color: "#9a3412",
    fontWeight: 850,
    cursor: "pointer",
  },
  greenOutlineBtn: {
    minHeight: 40,
    padding: "8px 12px",
    border: "1px solid #b9d9c4",
    borderRadius: 9,
    background: "#f4fbf6",
    color: "#166534",
    fontWeight: 850,
    cursor: "pointer",
  },
  counter: {
    minWidth: 33,
    height: 33,
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    background: "#eaf7ef",
    color: "#16834f",
    fontWeight: 900,
  },
  list: { display: "grid", gap: 9, marginTop: 10 },
  planCard: {
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    border: "1px solid #e1e8e3",
    borderRadius: 14,
    background: "#fbfdfc",
  },
  titleRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  price: { display: "block", marginTop: 7, color: "#16834f", fontSize: 20 },
  meta: { display: "block", marginTop: 3, color: "#65736a", fontSize: 10.5 },
  description: { margin: "6px 0 0", color: "#65736a", fontSize: 10.5 },
  activeBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 9,
    fontWeight: 900,
  },
  inactiveBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 9,
    fontWeight: 900,
  },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  actionsMobile: { width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr" },
  steps: {
    margin: "14px 0",
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 8,
    fontSize: 11,
  },
  step: {
    padding: "10px 8px",
    borderRadius: 10,
    background: "#f1f4f2",
    color: "#7a867f",
    textAlign: "center",
    fontWeight: 850,
  },
  stepDone: {
    padding: "10px 8px",
    borderRadius: 10,
    background: "#eaf7ef",
    color: "#166534",
    textAlign: "center",
    fontWeight: 850,
  },
  stepActive: {
    padding: "10px 8px",
    borderRadius: 10,
    background: "#16834f",
    color: "#fff",
    textAlign: "center",
    fontWeight: 900,
  },
  searchRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 9, marginTop: 12 },
  result: {
    padding: 11,
    display: "grid",
    gap: 3,
    border: "1px solid #e0e7e2",
    borderRadius: 10,
    background: "#fff",
    textAlign: "left",
    cursor: "pointer",
  },
  studentCard: {
    marginTop: 12,
    padding: 13,
    display: "grid",
    gridTemplateColumns: "48px minmax(0,1fr) auto",
    alignItems: "center",
    gap: 11,
    border: "1px solid #dbe7df",
    borderRadius: 13,
    background: "#f7fbf8",
  },
  avatar: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#dff2e6",
    color: "#16834f",
    fontWeight: 950,
  },
  noPlans: {
    padding: 18,
    display: "grid",
    gap: 9,
    justifyItems: "start",
    border: "1px dashed #b7cdbd",
    borderRadius: 13,
    background: "#f4fbf6",
  },
  kpiGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
  },
  kpiGridMobile: { gridTemplateColumns: "repeat(2,minmax(0,1fr))" },
  kpi: { padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,.04)" },
  kpiLabel: { display: "block", color: "#65736a", fontSize: 9.5, fontWeight: 800 },
  kpiValue: { display: "block", marginTop: 5, fontSize: 23 },
  filters: { display: "grid", gridTemplateColumns: "1fr 210px", gap: 9 },
  memberCard: {
    padding: 13,
    border: "1px solid #e1e8e3",
    borderRadius: 13,
    background: "#fff",
  },
  memberGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr auto",
    gap: 12,
    alignItems: "center",
  },
  memberActions: { marginTop: 10, display: "flex", gap: 7, flexWrap: "wrap" },
  status: { padding: "6px 9px", borderRadius: 999, fontSize: 9, fontWeight: 900, whiteSpace: "nowrap" },
  empty: {
    padding: 22,
    border: "1px dashed #d3ddd6",
    borderRadius: 12,
    background: "#f9fbfa",
    color: "#758079",
    fontSize: 11,
    textAlign: "center",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 10,
    background: "#f4f7f5",
    color: "#173c2a",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loadingLogo: { width: 170, height: "auto" },
};
