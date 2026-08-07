"use client";

// KONAX · Membresías · Versión Premium
// VERSION 2026.08.07-T
//
// CAMBIOS PRINCIPALES:
// - NO muestra una lista interminable de alumnos/membresías.
// - El administrador debe buscar por nombre, cédula, teléfono o plan.
// - Solo aparecen resultados cuando se ejecuta una búsqueda.
// - Resultados limitados para mantener la pantalla limpia.
// - Diseño premium y responsive para escritorio y móvil.
// - Mantiene Nueva membresía + Administrar planes dentro de /suscripciones.
// - "Regresar" vuelve siempre a Membresías, no al panel maestro.

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "../../lib/supabase";

const VERSION = "2026.08.07-T";
const LIMITE_RESULTADOS = 10;
const DIAS_AVISO_DEFAULT = 5;
const DIAS_GRACIA_DEFAULT = 3;

const FORM_MEMBRESIA_INICIAL = {
  planId: "",
  fechaInicio: "",
  descripcion: "",
};

const FORM_PLAN_INICIAL = {
  nombre: "",
  descripcion: "",
  precio: "",
  periodicidad: "Mensual",
  duracionCantidad: "1",
  duracionUnidad: "Meses",
  diasAviso: String(DIAS_AVISO_DEFAULT),
  diasGracia: String(DIAS_GRACIA_DEFAULT),
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

  const [anio, mes, dia] = String(fechaTexto)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!anio || !mes || !dia) return null;

  return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
}

function formatearFecha(fechaTexto) {
  if (!fechaTexto) return "-";

  const partes = String(fechaTexto)
    .slice(0, 10)
    .split("-");

  if (partes.length !== 3) return String(fechaTexto);

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function sumarDiasFecha(fechaTexto, dias) {
  const fecha = fechaLocal(fechaTexto);
  if (!fecha) return "";

  fecha.setDate(fecha.getDate() + Number(dias || 0));

  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function sumarMesesFecha(fechaTexto, meses) {
  const fecha = fechaLocal(fechaTexto);
  if (!fecha) return "";

  const diaOriginal = fecha.getDate();

  fecha.setDate(1);
  fecha.setMonth(fecha.getMonth() + Number(meses || 0));

  const ultimoDia = new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    0
  ).getDate();

  fecha.setDate(Math.min(diaOriginal, ultimoDia));

  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function calcularVencimiento(fechaBase, cantidad, unidad) {
  if (!fechaBase) return "";

  const numero = Math.max(1, Number(cantidad || 1));

  switch (unidad) {
    case "Días":
      return sumarDiasFecha(fechaBase, numero);

    case "Semanas":
      return sumarDiasFecha(fechaBase, numero * 7);

    case "Años":
      return sumarMesesFecha(fechaBase, numero * 12);

    case "Meses":
    default:
      return sumarMesesFecha(fechaBase, numero);
  }
}

function calcularDiasParaVencer(fechaTexto) {
  const vence = fechaLocal(fechaTexto);
  const hoy = fechaLocal(fechaHoy());

  if (!vence || !hoy) return 0;

  return Math.ceil(
    (vence.getTime() - hoy.getTime()) / 86400000
  );
}

function obtenerEstadoAutomatico(item) {
  const guardado = normalizar(item.estado);

  if (guardado === "cancelado") return "Cancelado";
  if (guardado === "suspendido") return "Suspendido";
  if (guardado === "pendiente") return "Pendiente";

  const diasAviso = Math.max(
    0,
    Number(item.dias_aviso ?? DIAS_AVISO_DEFAULT)
  );

  const diasGracia = Math.max(
    0,
    Number(item.dias_gracia ?? DIAS_GRACIA_DEFAULT)
  );

  const dias = calcularDiasParaVencer(item.fecha_vencimiento);

  if (dias < -diasGracia) return "Suspendido";
  if (dias < 0) return "Vencida";
  if (dias <= diasAviso) return "Próxima a vencer";

  return "Activo";
}

function configurarDuracion(periodicidad) {
  const mapa = {
    Diaria: { cantidad: "1", unidad: "Días" },
    Semanal: { cantidad: "1", unidad: "Semanas" },
    Quincenal: { cantidad: "15", unidad: "Días" },
    Mensual: { cantidad: "1", unidad: "Meses" },
    Trimestral: { cantidad: "3", unidad: "Meses" },
    Semestral: { cantidad: "6", unidad: "Meses" },
    Anual: { cantidad: "1", unidad: "Años" },
  };

  return mapa[periodicidad] || mapa.Mensual;
}

function colorEstado(estado) {
  const mapa = {
    Activo: { fondo: "#eaf8ef", color: "#147243" },
    "Próxima a vencer": { fondo: "#fff7df", color: "#8b5b00" },
    Pendiente: { fondo: "#eaf4ff", color: "#1e5f91" },
    Vencida: { fondo: "#fff0e5", color: "#9b4314" },
    Suspendido: { fondo: "#ffeded", color: "#a23030" },
    Cancelado: { fondo: "#f0f2f1", color: "#58635d" },
  };

  return mapa[estado] || mapa.Cancelado;
}

function SuscripcionesContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clienteIdUrl = searchParams.get("clienteId") || "";
  const modoUrl = searchParams.get("modo") || "";

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [vista, setVista] = useState(
    modoUrl === "nueva" || Boolean(clienteIdUrl)
      ? "nueva"
      : "principal"
  );

  const [esMovil, setEsMovil] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [planes, setPlanes] = useState([]);
  const [suscripciones, setSuscripciones] = useState([]);

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [buscarCliente, setBuscarCliente] = useState("");
  const [resultadosClientes, setResultadosClientes] = useState([]);

  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const [formMembresia, setFormMembresia] = useState({
    ...FORM_MEMBRESIA_INICIAL,
    fechaInicio: fechaHoy(),
  });

  const [formPlan, setFormPlan] = useState(FORM_PLAN_INICIAL);
  const [planEditandoId, setPlanEditandoId] = useState(null);

  useEffect(() => {
    inicializar();

    const medir = () => {
      setEsMovil(window.innerWidth <= 840);
    };

    medir();
    window.addEventListener("resize", medir);

    return () => {
      window.removeEventListener("resize", medir);
    };
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

    const idsClientes = [
      ...new Set(
        lista
          .map((item) => item.cliente_id)
          .filter(Boolean)
      ),
    ];

    let clientes = [];

    if (idsClientes.length > 0) {
      const { data: dataClientes, error: errorClientes } = await supabase
        .from("clientes")
        .select("id,nombre,cedula,telefono,correo,estado")
        .eq("empresa_id", id)
        .in("id", idsClientes);

      if (!errorClientes) {
        clientes = dataClientes || [];
      }
    }

    const mapaClientes = new Map(
      clientes.map((cliente) => [String(cliente.id), cliente])
    );

    setSuscripciones(
      lista.map((item) => {
        const cliente = mapaClientes.get(String(item.cliente_id));

        return {
          ...item,
          cliente:
            item.cliente ||
            cliente?.nombre ||
            "Alumno",
          cedula:
            item.cedula ||
            cliente?.cedula ||
            "",
          telefono:
            cliente?.telefono ||
            "",
          correo:
            cliente?.correo ||
            "",
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
      alert(
        "No se pudo cargar el alumno: " +
          (error?.message || "Alumno no encontrado.")
      );
      return;
    }

    seleccionarCliente(data);
  }

  async function buscarClientes() {
    if (!empresaId) return;

    const texto = buscarCliente.trim();

    if (texto.length < 2) {
      alert("Escriba por lo menos dos caracteres.");
      return;
    }

    const seguro = texto.replace(/[%_,()]/g, "");

    const { data, error } = await supabase
      .from("clientes")
      .select("id,nombre,cedula,telefono,correo,estado")
      .eq("empresa_id", empresaId)
      .or(
        `nombre.ilike.%${seguro}%,cedula.ilike.%${seguro}%,telefono.ilike.%${seguro}%`
      )
      .limit(10);

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
        (plan) =>
          String(plan.id) === String(formMembresia.planId)
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
    const r = {
      activas: 0,
      proximas: 0,
      vencidas: 0,
      suspendidas: 0,
      pendientes: 0,
    };

    suscripciones.forEach((item) => {
      const estado = obtenerEstadoAutomatico(item);

      if (estado === "Activo") r.activas += 1;
      if (estado === "Próxima a vencer") r.proximas += 1;
      if (estado === "Vencida") r.vencidas += 1;
      if (estado === "Suspendido") r.suspendidas += 1;
      if (estado === "Pendiente") r.pendientes += 1;
    });

    return r;
  }, [suscripciones]);

  const resultadosBusqueda = useMemo(() => {
    const texto = normalizar(busquedaAplicada);

    if (!texto) return [];

    return suscripciones
      .filter((item) => {
        const estado = obtenerEstadoAutomatico(item);

        const bolsa = normalizar(
          `${item.cliente || ""} ${item.cedula || ""} ${
            item.telefono || ""
          } ${item.plan || ""} ${estado}`
        );

        const coincideTexto = bolsa.includes(texto);
        const coincideEstado =
          filtroEstado === "Todos" || filtroEstado === estado;

        return coincideTexto && coincideEstado;
      })
      .slice(0, LIMITE_RESULTADOS);
  }, [suscripciones, busquedaAplicada, filtroEstado]);

  const totalCoincidencias = useMemo(() => {
    const texto = normalizar(busquedaAplicada);

    if (!texto) return 0;

    return suscripciones.filter((item) => {
      const estado = obtenerEstadoAutomatico(item);

      const bolsa = normalizar(
        `${item.cliente || ""} ${item.cedula || ""} ${
          item.telefono || ""
        } ${item.plan || ""} ${estado}`
      );

      const coincideTexto = bolsa.includes(texto);
      const coincideEstado =
        filtroEstado === "Todos" || filtroEstado === estado;

      return coincideTexto && coincideEstado;
    }).length;
  }, [suscripciones, busquedaAplicada, filtroEstado]);

  function ejecutarBusqueda() {
    const texto = textoBusqueda.trim();

    if (texto.length < 2) {
      alert("Escriba por lo menos dos caracteres para buscar.");
      return;
    }

    setBusquedaAplicada(texto);
  }

  function limpiarBusqueda() {
    setTextoBusqueda("");
    setBusquedaAplicada("");
    setFiltroEstado("Todos");
  }

  function abrirPrincipal() {
    setVista("principal");
    setClienteSeleccionado(null);
    setBuscarCliente("");
    setResultadosClientes([]);

    setFormMembresia({
      ...FORM_MEMBRESIA_INICIAL,
      fechaInicio: fechaHoy(),
    });

    router.replace("/suscripciones");
  }

  function abrirNueva() {
    setVista("nueva");

    setFormMembresia({
      ...FORM_MEMBRESIA_INICIAL,
      fechaInicio: fechaHoy(),
    });
  }

  function abrirPlanes() {
    setVista("planes");
    limpiarFormPlan();
  }

  function limpiarFormPlan() {
    setFormPlan(FORM_PLAN_INICIAL);
    setPlanEditandoId(null);
  }

  function cambiarPeriodicidadPlan(periodicidad) {
    const config = configurarDuracion(periodicidad);

    setFormPlan((actual) => ({
      ...actual,
      periodicidad,
      duracionCantidad: config.cantidad,
      duracionUnidad: config.unidad,
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
      diasAviso: String(
        plan.dias_aviso ?? DIAS_AVISO_DEFAULT
      ),
      diasGracia: String(
        plan.dias_gracia ?? DIAS_GRACIA_DEFAULT
      ),
      activo: plan.activo !== false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarPlan() {
    if (!empresaId || guardando) return;

    const nombre = formPlan.nombre.trim();
    const precio = Number(formPlan.precio);
    const duracionCantidad = Number(formPlan.duracionCantidad);
    const diasAviso = Number(formPlan.diasAviso || 0);
    const diasGracia = Number(formPlan.diasGracia || 0);

    if (!nombre) {
      alert("Escriba el nombre del plan.");
      return;
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      alert("El precio debe ser mayor que cero.");
      return;
    }

    if (
      !Number.isInteger(duracionCantidad) ||
      duracionCantidad <= 0
    ) {
      alert("La duración debe ser un número entero mayor que cero.");
      return;
    }

    if (
      !Number.isInteger(diasAviso) ||
      diasAviso < 0 ||
      !Number.isInteger(diasGracia) ||
      diasGracia < 0
    ) {
      alert("Revise los días de aviso y de gracia.");
      return;
    }

    const payload = {
      empresa_id: empresaId,
      nombre,
      descripcion: formPlan.descripcion.trim() || null,
      precio,
      periodicidad: formPlan.periodicidad,
      duracion_cantidad: duracionCantidad,
      duracion_unidad: formPlan.duracionUnidad,
      dias_aviso: diasAviso,
      dias_gracia: diasGracia,
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
        const { error } = await supabase
          .from("planes_membresia")
          .insert([payload]);

        if (error) throw error;

        alert("Plan creado correctamente.");
      }

      limpiarFormPlan();
      await cargarPlanes(empresaId);
    } catch (error) {
      alert("No se pudo guardar el plan: " + error.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstadoPlan(plan) {
    if (!empresaId || guardando) return;

    const nuevo = !Boolean(plan.activo);
    const accion = nuevo ? "activar" : "desactivar";

    const confirmar = window.confirm(
      `¿Deseas ${accion} el plan "${plan.nombre}"?`
    );

    if (!confirmar) return;

    setGuardando(true);

    try {
      const { error } = await supabase
        .from("planes_membresia")
        .update({ activo: nuevo })
        .eq("id", plan.id)
        .eq("empresa_id", empresaId);

      if (error) throw error;

      await cargarPlanes(empresaId);
    } catch (error) {
      alert(
        "No se pudo cambiar el estado del plan: " +
          error.message
      );
    } finally {
      setGuardando(false);
    }
  }

  async function crearMembresia() {
    if (!empresaId || guardando) return;

    if (!clienteSeleccionado?.id) {
      alert("Seleccione un alumno registrado.");
      return;
    }

    if (!planSeleccionado) {
      alert("Seleccione un plan de membresía.");
      return;
    }

    if (!formMembresia.fechaInicio || !vencimientoNuevo) {
      alert("Seleccione una fecha de inicio válida.");
      return;
    }

    const existente = suscripciones.find((item) => {
      if (
        String(item.cliente_id) !==
        String(clienteSeleccionado.id)
      ) {
        return false;
      }

      return [
        "Activo",
        "Próxima a vencer",
        "Pendiente",
      ].includes(obtenerEstadoAutomatico(item));
    });

    if (existente) {
      alert(
        `${clienteSeleccionado.nombre} ya tiene una membresía ${obtenerEstadoAutomatico(
          existente
        ).toLowerCase()}.`
      );
      return;
    }

    const precio = Number(planSeleccionado.precio || 0);

    if (!Number.isFinite(precio) || precio <= 0) {
      alert("El plan seleccionado no tiene un precio válido.");
      return;
    }

    setGuardando(true);

    let comercialCreado = null;

    try {
      const numeroCuenta = `MEM-${Date.now()}`;

      const responsable =
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("adminKonaxNombre") ||
        "Administración";

      const { data: comercial, error: errorComercial } =
        await supabase
          .from("informacion_comercial")
          .insert([
            {
              empresa_id: empresaId,
              cliente_id: clienteSeleccionado.id,
              plan_membresia_id: planSeleccionado.id,
              numero_cuenta: numeroCuenta,
              tipo_producto: "Membresía",
              descripcion: `${planSeleccionado.nombre} - ${
                formMembresia.descripcion ||
                planSeleccionado.descripcion ||
                ""
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
                formMembresia.descripcion.trim() ||
                planSeleccionado.descripcion ||
                null,
            },
          ])
          .select()
          .single();

      if (errorComercial) {
        throw new Error(
          "Error creando información comercial: " +
            errorComercial.message
        );
      }

      comercialCreado = comercial;

      const { data: suscripcionCreada, error: errorSuscripcion } =
        await supabase
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
                formMembresia.descripcion.trim() ||
                planSeleccionado.descripcion ||
                "",
              precio,
              vendedor: responsable,
              forma_pago: "Pendiente",
              fecha_inicio: formMembresia.fechaInicio,
              fecha_vencimiento: vencimientoNuevo,
              periodicidad: planSeleccionado.periodicidad,
              duracion_cantidad: Number(
                planSeleccionado.duracion_cantidad || 1
              ),
              duracion_unidad:
                planSeleccionado.duracion_unidad || "Meses",
              dias_aviso: Number(
                planSeleccionado.dias_aviso ??
                  DIAS_AVISO_DEFAULT
              ),
              dias_gracia: Number(
                planSeleccionado.dias_gracia ??
                  DIAS_GRACIA_DEFAULT
              ),
              estado: "Pendiente",
            },
          ])
          .select(
            "id,cliente_id,informacion_comercial_id"
          )
          .single();

      if (errorSuscripcion) {
        throw new Error(
          "Error creando membresía: " +
            errorSuscripcion.message
        );
      }

      router.push(
        `/caja?clienteId=${encodeURIComponent(
          clienteSeleccionado.id
        )}&suscripcionId=${encodeURIComponent(
          suscripcionCreada.id
        )}&cuentaId=${encodeURIComponent(
          comercial.id
        )}&flujo=nueva_membresia`
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
    if (!item?.cliente_id) {
      alert("La membresía no tiene un alumno vinculado.");
      return;
    }

    const params = new URLSearchParams({
      clienteId: String(item.cliente_id),
      suscripcionId: String(item.id),
      flujo: "renovacion",
    });

    if (item.informacion_comercial_id) {
      params.set(
        "cuentaId",
        String(item.informacion_comercial_id)
      );
    }

    router.push(`/caja?${params.toString()}`);
  }

  function verFicha(item) {
    localStorage.setItem(
      "busquedaVistaCliente",
      item.cedula || item.cliente || ""
    );

    router.push("/vista-cliente");
  }

  if (cargando) {
    return (
      <div style={s.loading}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.loadingLogo}
        />
        <strong>Preparando membresías...</strong>
      </div>
    );
  }

  if (vista === "planes") {
    return (
      <main style={s.page}>
        <div
          style={{
            ...s.container,
            ...(esMovil ? s.containerMobile : {}),
          }}
        >
          <Header
            etiqueta="PLANES DE MEMBRESÍA"
            titulo="Administrar planes"
            texto="Crea, edita y activa los planes que luego podrás asignar a cada alumno."
            boton="← Regresar a Membresías"
            onBack={abrirPrincipal}
            esMovil={esMovil}
          />

          <section style={s.cardPremium}>
            <div style={s.sectionHeader}>
              <div>
                <span style={s.sectionEyebrow}>
                  {planEditandoId ? "EDITANDO PLAN" : "NUEVO PLAN"}
                </span>

                <h2 style={s.sectionTitle}>
                  {planEditandoId
                    ? "Actualizar plan de membresía"
                    : "Crear plan de membresía"}
                </h2>
              </div>

              {planEditandoId && (
                <button
                  type="button"
                  onClick={limpiarFormPlan}
                  style={s.secondaryBtn}
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <div
              style={{
                ...s.formGrid,
                ...(esMovil ? s.oneColumn : {}),
              }}
            >
              <Campo label="Nombre del plan *">
                <input
                  value={formPlan.nombre}
                  onChange={(e) =>
                    setFormPlan((actual) => ({
                      ...actual,
                      nombre: e.target.value,
                    }))
                  }
                  placeholder="Ej. Plan Regular"
                  style={s.input}
                />
              </Campo>

              <Campo label="Precio *">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formPlan.precio}
                  onChange={(e) =>
                    setFormPlan((actual) => ({
                      ...actual,
                      precio: e.target.value,
                    }))
                  }
                  placeholder="20.00"
                  style={s.input}
                />
              </Campo>

              <Campo label="Periodicidad">
                <select
                  value={formPlan.periodicidad}
                  onChange={(e) =>
                    cambiarPeriodicidadPlan(e.target.value)
                  }
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
              </Campo>

              <Campo label="Duración">
                <div style={s.durationGrid}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formPlan.duracionCantidad}
                    onChange={(e) =>
                      setFormPlan((actual) => ({
                        ...actual,
                        duracionCantidad: e.target.value,
                      }))
                    }
                    style={s.input}
                  />

                  <select
                    value={formPlan.duracionUnidad}
                    onChange={(e) =>
                      setFormPlan((actual) => ({
                        ...actual,
                        duracionUnidad: e.target.value,
                      }))
                    }
                    style={s.input}
                  >
                    <option>Días</option>
                    <option>Semanas</option>
                    <option>Meses</option>
                    <option>Años</option>
                  </select>
                </div>
              </Campo>

              <Campo label="Avisar antes de vencer">
                <div style={s.inputSuffix}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formPlan.diasAviso}
                    onChange={(e) =>
                      setFormPlan((actual) => ({
                        ...actual,
                        diasAviso: e.target.value,
                      }))
                    }
                    style={s.input}
                  />
                  <span>días</span>
                </div>
              </Campo>

              <Campo label="Días de gracia">
                <div style={s.inputSuffix}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formPlan.diasGracia}
                    onChange={(e) =>
                      setFormPlan((actual) => ({
                        ...actual,
                        diasGracia: e.target.value,
                      }))
                    }
                    style={s.input}
                  />
                  <span>días</span>
                </div>
              </Campo>
            </div>

            <Campo label="Descripción">
              <textarea
                value={formPlan.descripcion}
                onChange={(e) =>
                  setFormPlan((actual) => ({
                    ...actual,
                    descripcion: e.target.value,
                  }))
                }
                placeholder="Ej. Acceso mensual al gimnasio"
                style={s.textarea}
              />
            </Campo>

            <label style={s.checkRow}>
              <input
                type="checkbox"
                checked={formPlan.activo}
                onChange={(e) =>
                  setFormPlan((actual) => ({
                    ...actual,
                    activo: e.target.checked,
                  }))
                }
              />
              Plan activo
            </label>

            <button
              type="button"
              onClick={guardarPlan}
              disabled={guardando}
              style={{
                ...s.primaryBtn,
                opacity: guardando ? 0.6 : 1,
              }}
            >
              {guardando
                ? "Guardando..."
                : planEditandoId
                ? "Actualizar plan"
                : "Crear plan"}
            </button>
          </section>

          <section style={s.cardPremium}>
            <div style={s.sectionHeader}>
              <div>
                <span style={s.sectionEyebrow}>CATÁLOGO</span>
                <h2 style={s.sectionTitle}>Planes disponibles</h2>
              </div>

              <span style={s.counter}>{planes.length}</span>
            </div>

            {planes.length === 0 ? (
              <div style={s.empty}>
                Todavía no hay planes creados.
              </div>
            ) : (
              <div style={s.planList}>
                {planes.map((plan) => (
                  <article key={plan.id} style={s.planCard}>
                    <div>
                      <div style={s.planTitleRow}>
                        <strong style={s.planName}>
                          {plan.nombre}
                        </strong>

                        <span
                          style={
                            plan.activo
                              ? s.badgeActive
                              : s.badgeInactive
                          }
                        >
                          {plan.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      <strong style={s.planPrice}>
                        B/. {Number(plan.precio || 0).toFixed(2)}
                      </strong>

                      <span style={s.planMeta}>
                        {plan.periodicidad || "Mensual"} ·{" "}
                        {Number(plan.duracion_cantidad || 1)}{" "}
                        {plan.duracion_unidad || "Meses"}
                      </span>

                      {plan.descripcion && (
                        <p style={s.planDescription}>
                          {plan.descripcion}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        ...s.actions,
                        ...(esMovil ? s.actionsMobile : {}),
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => editarPlan(plan)}
                        style={s.secondaryBtn}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => cambiarEstadoPlan(plan)}
                        style={
                          plan.activo
                            ? s.warningBtn
                            : s.greenOutlineBtn
                        }
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

  if (vista === "nueva") {
    return (
      <main style={s.page}>
        <div
          style={{
            ...s.narrow,
            ...(esMovil ? s.containerMobile : {}),
          }}
        >
          <Header
            etiqueta="NUEVA MEMBRESÍA"
            titulo="Asignar membresía"
            texto="Selecciona el alumno, el plan y continúa a Caja."
            boton="← Regresar a Membresías"
            onBack={abrirPrincipal}
            esMovil={esMovil}
          />

          <div
            style={{
              ...s.steps,
              ...(esMovil ? s.stepsMobile : {}),
            }}
          >
            <span style={s.stepDone}>1. Alumno</span>
            <span style={s.stepActive}>2. Membresía</span>
            <span style={s.step}>3. Caja</span>
          </div>

          <section style={s.cardPremium}>
            <div style={s.sectionHeader}>
              <div>
                <span style={s.sectionEyebrow}>ALUMNO</span>
                <h2 style={s.sectionTitle}>Seleccionar alumno</h2>
              </div>
            </div>

            {!clienteSeleccionado ? (
              <>
                <div
                  style={{
                    ...s.searchRow,
                    ...(esMovil ? s.oneColumn : {}),
                  }}
                >
                  <input
                    value={buscarCliente}
                    onChange={(e) =>
                      setBuscarCliente(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") buscarClientes();
                    }}
                    placeholder="Nombre, cédula o teléfono"
                    style={s.input}
                  />

                  <button
                    type="button"
                    onClick={buscarClientes}
                    style={s.darkBtn}
                  >
                    Buscar
                  </button>
                </div>

                {resultadosClientes.length > 0 && (
                  <div style={s.results}>
                    {resultadosClientes.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => seleccionarCliente(cliente)}
                        style={s.result}
                      >
                        <strong>{cliente.nombre}</strong>
                        <span>
                          {cliente.cedula || "Sin cédula"}
                        </span>
                        <small>
                          {cliente.telefono || "Sin teléfono"}
                        </small>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  ...s.selectedStudent,
                  ...(esMovil ? s.selectedStudentMobile : {}),
                }}
              >
                <div style={s.avatar}>
                  {String(clienteSeleccionado.nombre || "A")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong style={s.studentName}>
                    {clienteSeleccionado.nombre}
                  </strong>

                  <span style={s.studentData}>
                    Cédula: {clienteSeleccionado.cedula || "-"}
                  </span>

                  <span style={s.studentData}>
                    Teléfono: {clienteSeleccionado.telefono || "-"}
                  </span>
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

          <section style={s.cardPremium}>
            <div style={s.sectionHeader}>
              <div>
                <span style={s.sectionEyebrow}>PLAN</span>
                <h2 style={s.sectionTitle}>Plan y vigencia</h2>
              </div>

              <button
                type="button"
                onClick={abrirPlanes}
                style={s.secondaryBtn}
              >
                Administrar planes
              </button>
            </div>

            {planesActivos.length === 0 ? (
              <div style={s.noPlans}>
                <strong>No hay planes activos.</strong>
                <span>
                  Crea primero un plan para poder asignar una membresía.
                </span>

                <button
                  type="button"
                  onClick={abrirPlanes}
                  style={s.primaryBtn}
                >
                  + Crear plan
                </button>
              </div>
            ) : (
              <div
                style={{
                  ...s.formGrid,
                  ...(esMovil ? s.oneColumn : {}),
                }}
              >
                <Campo label="Plan *">
                  <select
                    value={formMembresia.planId}
                    onChange={(e) =>
                      setFormMembresia((actual) => ({
                        ...actual,
                        planId: e.target.value,
                      }))
                    }
                    style={s.input}
                  >
                    <option value="">Seleccione un plan</option>

                    {planesActivos.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} · B/.{" "}
                        {Number(plan.precio || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Fecha de inicio *">
                  <input
                    type="date"
                    value={formMembresia.fechaInicio}
                    onChange={(e) =>
                      setFormMembresia((actual) => ({
                        ...actual,
                        fechaInicio: e.target.value,
                      }))
                    }
                    style={s.input}
                  />
                </Campo>

                <Campo label="Precio">
                  <input
                    readOnly
                    value={
                      planSeleccionado
                        ? `B/. ${Number(
                            planSeleccionado.precio || 0
                          ).toFixed(2)}`
                        : ""
                    }
                    style={s.readonlyInput}
                  />
                </Campo>

                <Campo label="Vencimiento">
                  <input
                    readOnly
                    value={formatearFecha(vencimientoNuevo)}
                    style={s.readonlyInput}
                  />
                </Campo>
              </div>
            )}

            <Campo label="Observación">
              <textarea
                value={formMembresia.descripcion}
                onChange={(e) =>
                  setFormMembresia((actual) => ({
                    ...actual,
                    descripcion: e.target.value,
                  }))
                }
                placeholder="Opcional"
                style={s.textarea}
              />
            </Campo>

            <button
              type="button"
              onClick={crearMembresia}
              disabled={
                guardando || planesActivos.length === 0
              }
              style={{
                ...s.primaryBtn,
                opacity:
                  guardando || planesActivos.length === 0
                    ? 0.6
                    : 1,
              }}
            >
              {guardando
                ? "Guardando..."
                : "Guardar y continuar a Caja →"}
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <div
        style={{
          ...s.container,
          ...(esMovil ? s.containerMobile : {}),
        }}
      >
        <Header
          etiqueta="CONTROL DE MEMBRESÍAS"
          titulo="Membresías del gimnasio"
          texto={`${empresaNombre} · Control claro de planes, vigencias y renovaciones.`}
          boton="← Volver al Dashboard"
          onBack={() => router.push("/dashboard")}
          esMovil={esMovil}
        />

        <div
          style={{
            ...s.topActions,
            ...(esMovil ? s.topActionsMobile : {}),
          }}
        >
          <button
            type="button"
            onClick={abrirNueva}
            style={s.primaryBtnLarge}
          >
            <span style={s.actionIcon}>＋</span>
            <span>
              <strong style={s.actionTitle}>Nueva membresía</strong>
              <small style={s.actionSubtitle}>
                Asignar un plan a un alumno
              </small>
            </span>
          </button>

          <button
            type="button"
            onClick={abrirPlanes}
            style={s.secondaryActionLarge}
          >
            <span style={s.actionIconSoft}>⚙</span>
            <span>
              <strong style={s.actionTitleDark}>
                Administrar planes
              </strong>
              <small style={s.actionSubtitleDark}>
                Crear, editar o desactivar planes
              </small>
            </span>
          </button>
        </div>

        <section
          style={{
            ...s.kpiGrid,
            ...(esMovil ? s.kpiGridMobile : {}),
          }}
        >
          <KPI
            titulo="Activas"
            valor={resumen.activas}
            tipo="verde"
            icono="✓"
          />

          <KPI
            titulo="Próximas"
            valor={resumen.proximas}
            tipo="amarillo"
            icono="!"
          />

          <KPI
            titulo="Vencidas"
            valor={resumen.vencidas}
            tipo="naranja"
            icono="↻"
          />

          <KPI
            titulo="Suspendidas"
            valor={resumen.suspendidas}
            tipo="rojo"
            icono="×"
          />
        </section>

        <section style={s.searchPanel}>
          <div style={s.searchPanelHeader}>
            <div>
              <span style={s.sectionEyebrow}>BUSCAR MEMBRESÍA</span>
              <h2 style={s.searchTitle}>
                Encuentra un alumno sin recorrer listas
              </h2>
              <p style={s.searchText}>
                Busca por nombre, cédula, teléfono o nombre del plan.
              </p>
            </div>

            <div style={s.searchMiniBadge}>
              {suscripciones.length} registradas
            </div>
          </div>

          <div
            style={{
              ...s.searchPremiumGrid,
              ...(esMovil ? s.searchPremiumGridMobile : {}),
            }}
          >
            <div style={s.searchInputWrap}>
              <span style={s.searchIcon}>⌕</span>

              <input
                value={textoBusqueda}
                onChange={(e) =>
                  setTextoBusqueda(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") ejecutarBusqueda();
                }}
                placeholder="Ej. Katherine, 8-826..., 6106..., Plan Regular"
                style={s.searchInput}
              />
            </div>

            <select
              value={filtroEstado}
              onChange={(e) =>
                setFiltroEstado(e.target.value)
              }
              style={s.filterSelect}
            >
              <option>Todos</option>
              <option>Activo</option>
              <option>Próxima a vencer</option>
              <option>Pendiente</option>
              <option>Vencida</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
            </select>

            <button
              type="button"
              onClick={ejecutarBusqueda}
              style={s.searchButton}
            >
              Buscar
            </button>

            {busquedaAplicada && (
              <button
                type="button"
                onClick={limpiarBusqueda}
                style={s.clearButton}
              >
                Limpiar
              </button>
            )}
          </div>
        </section>

        {!busquedaAplicada ? (
          <section style={s.searchEmptyPremium}>
            <div style={s.emptySearchIcon}>⌕</div>

            <div>
              <strong style={s.emptySearchTitle}>
                Busca al alumno que deseas administrar
              </strong>

              <p style={s.emptySearchText}>
                La pantalla ya no carga una lista completa. Escribe el
                nombre, cédula, teléfono o plan y KONAX mostrará solo
                las coincidencias.
              </p>
            </div>
          </section>
        ) : (
          <section style={s.resultsSection}>
            <div style={s.resultsHeader}>
              <div>
                <span style={s.sectionEyebrow}>RESULTADOS</span>
                <h2 style={s.resultsTitle}>
                  {totalCoincidencias === 0
                    ? "No encontramos coincidencias"
                    : totalCoincidencias === 1
                    ? "1 membresía encontrada"
                    : `${totalCoincidencias} membresías encontradas`}
                </h2>
              </div>

              {totalCoincidencias > LIMITE_RESULTADOS && (
                <span style={s.limitBadge}>
                  Mostrando primeras {LIMITE_RESULTADOS}
                </span>
              )}
            </div>

            {resultadosBusqueda.length === 0 ? (
              <div style={s.noResults}>
                <strong>No encontramos ese alumno.</strong>
                <span>
                  Revisa el nombre, cédula o teléfono e intenta nuevamente.
                </span>
              </div>
            ) : (
              <div style={s.premiumResultsList}>
                {resultadosBusqueda.map((item) => {
                  const estado = obtenerEstadoAutomatico(item);
                  const colores = colorEstado(estado);

                  return (
                    <article
                      key={item.id}
                      style={{
                        ...s.resultPremiumCard,
                        ...(esMovil ? s.resultPremiumCardMobile : {}),
                      }}
                    >
                      <div style={s.resultIdentity}>
                        <div style={s.resultAvatar}>
                          {String(item.cliente || "A")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <strong style={s.resultName}>
                            {item.cliente}
                          </strong>

                          <span style={s.resultDetail}>
                            {item.cedula || "Sin cédula"}
                            {item.telefono
                              ? ` · ${item.telefono}`
                              : ""}
                          </span>
                        </div>
                      </div>

                      <div style={s.resultPlan}>
                        <span style={s.resultLabel}>PLAN</span>
                        <strong>{item.plan || "Sin plan"}</strong>
                        <small style={s.resultDetail}>
                          B/. {Number(item.precio || 0).toFixed(2)}
                        </small>
                      </div>

                      <div style={s.resultDate}>
                        <span style={s.resultLabel}>VENCIMIENTO</span>
                        <strong>
                          {formatearFecha(item.fecha_vencimiento)}
                        </strong>
                        <small style={s.resultDetail}>
                          {item.periodicidad || "Membresía"}
                        </small>
                      </div>

                      <div
                        style={{
                          ...s.resultStatus,
                          background: colores.fondo,
                          color: colores.color,
                        }}
                      >
                        {estado}
                      </div>

                      <div
                        style={{
                          ...s.resultActions,
                          ...(esMovil ? s.resultActionsMobile : {}),
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => verFicha(item)}
                          style={s.secondaryBtn}
                        >
                          Ver ficha
                        </button>

                        <button
                          type="button"
                          onClick={() => irACaja(item)}
                          style={s.greenOutlineBtn}
                        >
                          Ir a Caja
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <div style={s.version}>Versión {VERSION}</div>
      </div>
    </main>
  );
}

function Header({
  etiqueta,
  titulo,
  texto,
  boton,
  onBack,
  esMovil,
}) {
  return (
    <header
      style={{
        ...s.hero,
        ...(esMovil ? s.heroMobile : {}),
      }}
    >
      <div style={s.heroCopy}>
        <span style={s.eyebrow}>{etiqueta}</span>

        <h1
          style={{
            ...s.heroTitle,
            ...(esMovil ? s.heroTitleMobile : {}),
          }}
        >
          {titulo}
        </h1>

        <p style={s.heroText}>{texto}</p>
      </div>

      <button
        type="button"
        onClick={onBack}
        style={s.heroBack}
      >
        {boton}
      </button>
    </header>
  );
}

function Campo({ label, children }) {
  return (
    <label style={s.field}>
      <span style={s.label}>{label}</span>
      {children}
    </label>
  );
}

function KPI({ titulo, valor, tipo, icono }) {
  const fondos = {
    verde: "#eefaf2",
    amarillo: "#fff9e8",
    naranja: "#fff4ea",
    rojo: "#fff0f0",
  };

  const colores = {
    verde: "#167044",
    amarillo: "#8b6300",
    naranja: "#9a4e1a",
    rojo: "#9f3434",
  };

  return (
    <div
      style={{
        ...s.kpi,
        background: fondos[tipo],
      }}
    >
      <div
        style={{
          ...s.kpiIcon,
          color: colores[tipo],
        }}
      >
        {icono}
      </div>

      <div>
        <span style={s.kpiLabel}>{titulo}</span>

        <strong
          style={{
            ...s.kpiValue,
            color: colores[tipo],
          }}
        >
          {valor}
        </strong>
      </div>
    </div>
  );
}

export default function Suscripciones() {
  return (
    <Suspense
      fallback={
        <div style={s.loading}>Cargando...</div>
      }
    >
      <SuscripcionesContenido />
    </Suspense>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg,#f7faf8 0%,#eef4f0 100%)",
    color: "#17211c",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  container: {
    width: "min(1180px, calc(100% - 36px))",
    margin: "0 auto",
    padding: "24px 0 42px",
    boxSizing: "border-box",
  },

  containerMobile: {
    width: "100%",
    maxWidth: "100%",
    padding: "12px 12px 28px",
    overflowX: "hidden",
  },

  narrow: {
    width: "min(900px, calc(100% - 36px))",
    margin: "0 auto",
    padding: "24px 0 42px",
    boxSizing: "border-box",
  },

  hero: {
    minHeight: 148,
    padding: "25px 27px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    overflow: "hidden",
    border: "1px solid #d8e8de",
    borderRadius: 24,
    background:
      "linear-gradient(135deg,#ffffff 0%,#f0faf4 52%,#e3f3e9 100%)",
    boxShadow:
      "0 18px 45px rgba(28,73,46,.08)",
    boxSizing: "border-box",
  },

  heroMobile: {
    minHeight: 0,
    padding: "20px 17px",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
    borderRadius: 20,
  },

  heroCopy: {
    minWidth: 0,
  },

  eyebrow: {
    display: "block",
    marginBottom: 7,
    color: "#16834f",
    fontSize: 9,
    fontWeight: 950,
    letterSpacing: 1.25,
  },

  heroTitle: {
    margin: 0,
    color: "#17211c",
    fontSize: 34,
    lineHeight: 1.06,
    letterSpacing: -0.8,
  },

  heroTitleMobile: {
    fontSize: 28,
  },

  heroText: {
    maxWidth: 690,
    margin: "9px 0 0",
    color: "#627068",
    fontSize: 12.5,
    lineHeight: 1.55,
  },

  heroBack: {
    minHeight: 43,
    padding: "10px 14px",
    border: "1px solid #c8d9ce",
    borderRadius: 12,
    background: "rgba(255,255,255,.9)",
    color: "#173c2a",
    fontWeight: 850,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  topActions: {
    margin: "14px 0",
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,280px))",
    gap: 11,
  },

  topActionsMobile: {
    gridTemplateColumns: "1fr",
  },

  primaryBtnLarge: {
    minHeight: 76,
    padding: "14px 16px",
    display: "grid",
    gridTemplateColumns: "42px minmax(0,1fr)",
    alignItems: "center",
    gap: 12,
    border: "none",
    borderRadius: 17,
    background:
      "linear-gradient(135deg,#18844f,#106d40)",
    color: "#ffffff",
    textAlign: "left",
    cursor: "pointer",
    boxShadow:
      "0 12px 28px rgba(22,131,79,.18)",
  },

  secondaryActionLarge: {
    minHeight: 76,
    padding: "14px 16px",
    display: "grid",
    gridTemplateColumns: "42px minmax(0,1fr)",
    alignItems: "center",
    gap: 12,
    border: "1px solid #d5e1d9",
    borderRadius: 17,
    background: "#ffffff",
    color: "#1e2c24",
    textAlign: "left",
    cursor: "pointer",
    boxShadow:
      "0 9px 25px rgba(15,23,42,.045)",
  },

  actionIcon: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "rgba(255,255,255,.17)",
    fontSize: 25,
    fontWeight: 500,
  },

  actionIconSoft: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 19,
  },

  actionTitle: {
    display: "block",
    fontSize: 13,
  },

  actionTitleDark: {
    display: "block",
    color: "#1b2921",
    fontSize: 13,
  },

  actionSubtitle: {
    display: "block",
    marginTop: 3,
    color: "rgba(255,255,255,.78)",
    fontSize: 9.5,
    fontWeight: 600,
  },

  actionSubtitleDark: {
    display: "block",
    marginTop: 3,
    color: "#718078",
    fontSize: 9.5,
    fontWeight: 600,
  },

  kpiGrid: {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
  },

  kpiGridMobile: {
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  },

  kpi: {
    minHeight: 88,
    padding: 14,
    display: "grid",
    gridTemplateColumns: "38px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
    borderRadius: 17,
    border: "1px solid rgba(30,65,44,.05)",
    boxShadow:
      "0 8px 20px rgba(15,23,42,.03)",
  },

  kpiIcon: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "rgba(255,255,255,.72)",
    fontSize: 18,
    fontWeight: 900,
  },

  kpiLabel: {
    display: "block",
    color: "#69776f",
    fontSize: 9.5,
    fontWeight: 800,
  },

  kpiValue: {
    display: "block",
    marginTop: 3,
    fontSize: 24,
    lineHeight: 1,
  },

  searchPanel: {
    marginTop: 14,
    padding: 20,
    border: "1px solid #dce7e0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow:
      "0 14px 35px rgba(15,23,42,.05)",
  },

  searchPanelHeader: {
    marginBottom: 15,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },

  sectionEyebrow: {
    display: "block",
    color: "#16834f",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: 1.05,
  },

  searchTitle: {
    margin: "5px 0 0",
    color: "#17211c",
    fontSize: 21,
    lineHeight: 1.15,
  },

  searchText: {
    margin: "6px 0 0",
    color: "#758179",
    fontSize: 10.5,
    lineHeight: 1.45,
  },

  searchMiniBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#f0f8f3",
    color: "#397055",
    fontSize: 9,
    fontWeight: 850,
  },

  searchPremiumGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 190px 110px auto",
    gap: 9,
    alignItems: "stretch",
  },

  searchPremiumGridMobile: {
    gridTemplateColumns: "1fr",
  },

  searchInputWrap: {
    minWidth: 0,
    position: "relative",
  },

  searchIcon: {
    position: "absolute",
    left: 13,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#7b8a81",
    fontSize: 20,
    pointerEvents: "none",
  },

  searchInput: {
    width: "100%",
    minHeight: 48,
    padding: "11px 13px 11px 42px",
    boxSizing: "border-box",
    border: "1px solid #ccd9d1",
    borderRadius: 13,
    background: "#fbfdfc",
    color: "#17211c",
    fontSize: 16,
    outline: "none",
  },

  filterSelect: {
    width: "100%",
    minHeight: 48,
    padding: "10px 12px",
    boxSizing: "border-box",
    border: "1px solid #ccd9d1",
    borderRadius: 13,
    background: "#ffffff",
    color: "#324238",
    fontSize: 14,
    outline: "none",
  },

  searchButton: {
    minHeight: 48,
    padding: "10px 16px",
    border: "none",
    borderRadius: 13,
    background:
      "linear-gradient(135deg,#16834f,#0f6b3e)",
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 8px 18px rgba(22,131,79,.15)",
  },

  clearButton: {
    minHeight: 48,
    padding: "10px 14px",
    border: "1px solid #d7e0da",
    borderRadius: 13,
    background: "#ffffff",
    color: "#66736b",
    fontWeight: 850,
    cursor: "pointer",
  },

  searchEmptyPremium: {
    marginTop: 14,
    minHeight: 170,
    padding: 25,
    display: "grid",
    gridTemplateColumns: "56px minmax(0,1fr)",
    alignItems: "center",
    gap: 15,
    border: "1px dashed #cbdad1",
    borderRadius: 20,
    background:
      "linear-gradient(135deg,#fbfdfc,#f3f8f5)",
  },

  emptySearchIcon: {
    width: 56,
    height: 56,
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background: "#e7f5ec",
    color: "#16834f",
    fontSize: 28,
  },

  emptySearchTitle: {
    display: "block",
    color: "#1c2a22",
    fontSize: 15,
  },

  emptySearchText: {
    maxWidth: 680,
    margin: "6px 0 0",
    color: "#758179",
    fontSize: 10.5,
    lineHeight: 1.55,
  },

  resultsSection: {
    marginTop: 14,
    padding: 18,
    border: "1px solid #dce7e0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow:
      "0 14px 35px rgba(15,23,42,.045)",
  },

  resultsHeader: {
    marginBottom: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  resultsTitle: {
    margin: "4px 0 0",
    fontSize: 18,
    color: "#17211c",
  },

  limitBadge: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "#fff7df",
    color: "#8b5b00",
    fontSize: 8.5,
    fontWeight: 850,
  },

  premiumResultsList: {
    display: "grid",
    gap: 9,
  },

  resultPremiumCard: {
    padding: 14,
    display: "grid",
    gridTemplateColumns:
      "minmax(220px,1.5fr) minmax(140px,.8fr) minmax(135px,.7fr) auto auto",
    alignItems: "center",
    gap: 12,
    border: "1px solid #e1e8e3",
    borderRadius: 15,
    background: "#fcfefd",
  },

  resultPremiumCardMobile: {
    gridTemplateColumns: "1fr",
    alignItems: "stretch",
  },

  resultIdentity: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "42px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
  },

  resultAvatar: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background:
      "linear-gradient(145deg,#e8f7ed,#d9eee1)",
    color: "#16834f",
    fontWeight: 950,
  },

  resultName: {
    display: "block",
    overflow: "hidden",
    color: "#1a2720",
    fontSize: 12.5,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  resultDetail: {
    display: "block",
    marginTop: 3,
    color: "#76827a",
    fontSize: 9.5,
    lineHeight: 1.4,
  },

  resultPlan: {
    display: "grid",
    gap: 2,
  },

  resultDate: {
    display: "grid",
    gap: 2,
  },

  resultLabel: {
    color: "#16834f",
    fontSize: 7.5,
    fontWeight: 950,
    letterSpacing: 0.8,
  },

  resultStatus: {
    justifySelf: "start",
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 8.5,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },

  resultActions: {
    display: "flex",
    gap: 7,
    justifyContent: "flex-end",
  },

  resultActionsMobile: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
  },

  noResults: {
    padding: 22,
    display: "grid",
    gap: 5,
    justifyItems: "center",
    border: "1px dashed #d3ddd6",
    borderRadius: 14,
    background: "#f9fbfa",
    color: "#758079",
    fontSize: 10.5,
    textAlign: "center",
  },

  cardPremium: {
    marginTop: 14,
    padding: 18,
    border: "1px solid #dce7e0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow:
      "0 14px 35px rgba(15,23,42,.05)",
  },

  sectionHeader: {
    marginBottom: 15,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: "4px 0 0",
    fontSize: 20,
    color: "#17211c",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 13,
  },

  oneColumn: {
    gridTemplateColumns: "1fr",
  },

  field: {
    display: "grid",
    gap: 6,
    marginBottom: 12,
  },

  label: {
    color: "#39473f",
    fontSize: 10.5,
    fontWeight: 800,
  },

  input: {
    width: "100%",
    minHeight: 46,
    padding: "10px 12px",
    boxSizing: "border-box",
    border: "1px solid #ccd8d0",
    borderRadius: 12,
    background: "#ffffff",
    color: "#17211c",
    fontSize: 16,
    outline: "none",
  },

  readonlyInput: {
    width: "100%",
    minHeight: 46,
    padding: "10px 12px",
    boxSizing: "border-box",
    border: "1px solid #dce5df",
    borderRadius: 12,
    background: "#f5f8f6",
    color: "#526159",
    fontSize: 16,
  },

  textarea: {
    width: "100%",
    minHeight: 86,
    padding: "11px 12px",
    boxSizing: "border-box",
    border: "1px solid #ccd8d0",
    borderRadius: 12,
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: 16,
    outline: "none",
  },

  durationGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(90px,.7fr) minmax(130px,1.3fr)",
    gap: 8,
  },

  inputSuffix: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 8,
  },

  checkRow: {
    margin: "4px 0 15px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    fontWeight: 800,
  },

  primaryBtn: {
    minHeight: 45,
    padding: "10px 15px",
    border: "none",
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 9px 20px rgba(22,131,79,.16)",
  },

  secondaryBtn: {
    minHeight: 40,
    padding: "8px 12px",
    border: "1px solid #cbd8d0",
    borderRadius: 10,
    background: "#ffffff",
    color: "#26342c",
    fontWeight: 850,
    cursor: "pointer",
  },

  darkBtn: {
    minHeight: 46,
    padding: "10px 15px",
    border: "none",
    borderRadius: 11,
    background: "#173c2a",
    color: "#ffffff",
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
    borderRadius: 10,
    background: "#f4fbf6",
    color: "#166534",
    fontWeight: 850,
    cursor: "pointer",
  },

  planList: {
    display: "grid",
    gap: 10,
  },

  planCard: {
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    border: "1px solid #e1e8e3",
    borderRadius: 14,
    background: "#fbfdfc",
    flexWrap: "wrap",
  },

  planTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  planName: {
    fontSize: 14,
  },

  planPrice: {
    display: "block",
    marginTop: 7,
    color: "#16834f",
    fontSize: 20,
  },

  planMeta: {
    display: "block",
    marginTop: 4,
    color: "#65736a",
    fontSize: 10.5,
  },

  planDescription: {
    margin: "6px 0 0",
    color: "#65736a",
    fontSize: 10.5,
  },

  badgeActive: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 9,
    fontWeight: 900,
  },

  badgeInactive: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 9,
    fontWeight: 900,
  },

  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  actionsMobile: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
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

  steps: {
    margin: "14px 0",
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 8,
  },

  stepsMobile: {
    fontSize: 10,
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
    color: "#ffffff",
    textAlign: "center",
    fontWeight: 900,
  },

  searchRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 9,
  },

  results: {
    marginTop: 10,
    display: "grid",
    gap: 7,
  },

  result: {
    padding: 11,
    display: "grid",
    gap: 3,
    border: "1px solid #e0e7e2",
    borderRadius: 10,
    background: "#ffffff",
    textAlign: "left",
    cursor: "pointer",
  },

  selectedStudent: {
    padding: 13,
    display: "grid",
    gridTemplateColumns: "48px minmax(0,1fr) auto",
    alignItems: "center",
    gap: 11,
    border: "1px solid #dbe7df",
    borderRadius: 13,
    background: "#f7fbf8",
  },

  selectedStudentMobile: {
    gridTemplateColumns: "48px minmax(0,1fr)",
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

  studentName: {
    display: "block",
    fontSize: 14,
  },

  studentData: {
    display: "block",
    marginTop: 3,
    color: "#65736a",
    fontSize: 10.5,
  },

  noPlans: {
    padding: 18,
    display: "grid",
    gap: 9,
    justifyItems: "start",
    border: "1px dashed #b7cdbd",
    borderRadius: 13,
    background: "#f4fbf6",
    color: "#385044",
  },

  empty: {
    padding: 22,
    border: "1px dashed #d3ddd6",
    borderRadius: 12,
    background: "#f9fbfa",
    color: "#758079",
    fontSize: 11,
    textAlign: "center",
  },

  version: {
    marginTop: 14,
    color: "#87928b",
    fontSize: 9,
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
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  loadingLogo: {
    width: 170,
    height: "auto",
  },
};
