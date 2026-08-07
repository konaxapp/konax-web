"use client";

// KONAX · Membresías · Versión Premium con filtro cerrado
// VERSION 2026.08.07-Y
//
// PRINCIPAL:
// - NO muestra lista de clientes.
// - NO muestra resultados en la pantalla principal.
// - Solo muestra un botón "Filtrar membresía".
// - Al tocarlo se abre una ventana de búsqueda.
// - La búsqueda NO despliega tarjetas ni una lista interminable.
// - Si hay coincidencias, se elige el alumno desde un selector compacto.
// - Luego se abre UNA sola membresía para administrar.
// - Responsive para escritorio y móvil.
//
// También conserva:
// - Nueva membresía
// - Administrar planes
// - Crear / editar / activar / desactivar planes
// - Alumno -> Membresía -> Caja
// - Regresar siempre a Membresías

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

const VERSION = "2026.08.07-Y";
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

function esRolAdministrador(valor) {
  return [
    "administrador",
    "superadmin",
    "super_admin",
    "admin_master",
    "administrador_master",
  ].includes(normalizar(valor));
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

  return new Date(
    anio,
    mes - 1,
    dia,
    12,
    0,
    0,
    0
  );
}

function formatearFecha(fechaTexto) {
  if (!fechaTexto) return "-";

  const partes = String(fechaTexto)
    .slice(0, 10)
    .split("-");

  if (partes.length !== 3) {
    return String(fechaTexto);
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function sumarDiasFecha(fechaTexto, dias) {
  const fecha = fechaLocal(fechaTexto);

  if (!fecha) return "";

  fecha.setDate(
    fecha.getDate() + Number(dias || 0)
  );

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

  fecha.setMonth(
    fecha.getMonth() + Number(meses || 0)
  );

  const ultimoDia = new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    0
  ).getDate();

  fecha.setDate(
    Math.min(diaOriginal, ultimoDia)
  );

  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function calcularVencimiento(
  fechaBase,
  cantidad,
  unidad
) {
  if (!fechaBase) return "";

  const numero = Math.max(
    1,
    Number(cantidad || 1)
  );

  switch (unidad) {
    case "Días":
      return sumarDiasFecha(
        fechaBase,
        numero
      );

    case "Semanas":
      return sumarDiasFecha(
        fechaBase,
        numero * 7
      );

    case "Años":
      return sumarMesesFecha(
        fechaBase,
        numero * 12
      );

    case "Meses":
    default:
      return sumarMesesFecha(
        fechaBase,
        numero
      );
  }
}

function calcularDiasParaVencer(
  fechaTexto
) {
  const vence = fechaLocal(fechaTexto);
  const hoy = fechaLocal(fechaHoy());

  if (!vence || !hoy) return 0;

  return Math.ceil(
    (vence.getTime() - hoy.getTime()) /
      86400000
  );
}

function obtenerEstadoAutomatico(item) {
  const guardado = normalizar(item.estado);

  if (guardado === "cancelado") {
    return "Cancelado";
  }

  if (guardado === "suspendido") {
    return "Suspendido";
  }

  if (guardado === "pendiente") {
    return "Pendiente";
  }

  const diasAviso = Math.max(
    0,
    Number(
      item.dias_aviso ??
        DIAS_AVISO_DEFAULT
    )
  );

  const diasGracia = Math.max(
    0,
    Number(
      item.dias_gracia ??
        DIAS_GRACIA_DEFAULT
    )
  );

  const dias =
    calcularDiasParaVencer(
      item.fecha_vencimiento
    );

  if (dias < -diasGracia) {
    return "Suspendido";
  }

  if (dias < 0) {
    return "Vencida";
  }

  if (dias <= diasAviso) {
    return "Próxima a vencer";
  }

  return "Activo";
}

function configurarDuracion(
  periodicidad
) {
  const mapa = {
    Diaria: {
      cantidad: "1",
      unidad: "Días",
    },
    Semanal: {
      cantidad: "1",
      unidad: "Semanas",
    },
    Quincenal: {
      cantidad: "15",
      unidad: "Días",
    },
    Mensual: {
      cantidad: "1",
      unidad: "Meses",
    },
    Trimestral: {
      cantidad: "3",
      unidad: "Meses",
    },
    Semestral: {
      cantidad: "6",
      unidad: "Meses",
    },
    Anual: {
      cantidad: "1",
      unidad: "Años",
    },
  };

  return (
    mapa[periodicidad] ||
    mapa.Mensual
  );
}

function colorEstado(estado) {
  const mapa = {
    Activo: {
      fondo: "#eaf8ef",
      color: "#147243",
    },
    "Próxima a vencer": {
      fondo: "#fff7df",
      color: "#8b5b00",
    },
    Pendiente: {
      fondo: "#eaf4ff",
      color: "#1e5f91",
    },
    Vencida: {
      fondo: "#fff0e5",
      color: "#9b4314",
    },
    Suspendido: {
      fondo: "#ffeded",
      color: "#a23030",
    },
    Cancelado: {
      fondo: "#f0f2f1",
      color: "#58635d",
    },
  };

  return (
    mapa[estado] ||
    mapa.Cancelado
  );
}

function SuscripcionesContenido() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const clienteIdUrl =
    searchParams.get("clienteId") || "";

  const modoUrl =
    searchParams.get("modo") || "";

  const [empresaId, setEmpresaId] =
    useState("");

  const [
    empresaNombre,
    setEmpresaNombre,
  ] = useState("");

  const [rolUsuario, setRolUsuario] =
    useState("");

  const puedeAdministrarPlanes =
    esRolAdministrador(rolUsuario);

  const [vista, setVista] =
    useState(
      modoUrl === "nueva" ||
        Boolean(clienteIdUrl)
        ? "nueva"
        : "principal"
    );

  const [esMovil, setEsMovil] =
    useState(false);

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [planes, setPlanes] =
    useState([]);

  const [
    suscripciones,
    setSuscripciones,
  ] = useState([]);

  const [
    clienteSeleccionado,
    setClienteSeleccionado,
  ] = useState(null);

  const [
    buscarCliente,
    setBuscarCliente,
  ] = useState("");

  const [
    resultadosClientes,
    setResultadosClientes,
  ] = useState([]);

  const [
    filtroAbierto,
    setFiltroAbierto,
  ] = useState(false);

  const [
    textoFiltro,
    setTextoFiltro,
  ] = useState("");

  const [
    estadoFiltro,
    setEstadoFiltro,
  ] = useState("Todos");

  const [
    coincidenciasFiltro,
    setCoincidenciasFiltro,
  ] = useState([]);

  const [
    membresiaFiltroId,
    setMembresiaFiltroId,
  ] = useState("");

  const [
    membresiaDetalle,
    setMembresiaDetalle,
  ] = useState(null);

  const [
    membresiaACambiar,
    setMembresiaACambiar,
  ] = useState(null);

  const [
    formMembresia,
    setFormMembresia,
  ] = useState({
    ...FORM_MEMBRESIA_INICIAL,
    fechaInicio: fechaHoy(),
  });

  const [formPlan, setFormPlan] =
    useState(FORM_PLAN_INICIAL);

  const [
    planEditandoId,
    setPlanEditandoId,
  ] = useState(null);

  useEffect(() => {
    inicializar();

    function medir() {
      setEsMovil(
        window.innerWidth <= 840
      );
    }

    medir();

    window.addEventListener(
      "resize",
      medir
    );

    return () => {
      window.removeEventListener(
        "resize",
        medir
      );
    };
  }, [clienteIdUrl]);

  async function inicializar() {
    setCargando(true);

    const id =
      localStorage.getItem(
        "empresaId"
      );

    if (!id) {
      alert(
        "No hay una empresa activa. Inicie sesión nuevamente."
      );

      router.replace("/login");
      return;
    }

    setEmpresaId(id);

    const rolLocal =
      localStorage.getItem("usuarioRol") ||
      localStorage.getItem("rolUsuario") ||
      "";

    setRolUsuario(rolLocal);

    await Promise.all([
      cargarEmpresa(id),
      cargarPlanes(id),
      cargarSuscripciones(id),
    ]);

    if (clienteIdUrl) {
      await cargarClientePorId(
        id,
        clienteIdUrl
      );

      setVista("nueva");
    }

    setCargando(false);
  }

  async function cargarEmpresa(id) {
    const nombreLocal =
      localStorage.getItem(
        "empresaNombre"
      ) ||
      localStorage.getItem(
        "empresaAdminCreadaNombre"
      ) ||
      "";

    const { data, error } =
      await supabase
        .from("empresas")
        .select("nombre")
        .eq("id", id)
        .maybeSingle();

    if (error) {
      console.error(error);

      setEmpresaNombre(
        nombreLocal ||
          "Tu gimnasio"
      );

      return;
    }

    const nombre =
      data?.nombre ||
      nombreLocal ||
      "Tu gimnasio";

    setEmpresaNombre(nombre);

    localStorage.setItem(
      "empresaNombre",
      nombre
    );
  }

  async function cargarPlanes(
    id = empresaId
  ) {
    if (!id) return;

    const { data, error } =
      await supabase
        .from(
          "planes_membresia"
        )
        .select("*")
        .eq(
          "empresa_id",
          id
        )
        .order("activo", {
          ascending: false,
        })
        .order("nombre", {
          ascending: true,
        });

    if (error) {
      alert(
        "Error cargando planes de membresía: " +
          error.message
      );

      return;
    }

    setPlanes(data || []);
  }

  async function cargarSuscripciones(
    id = empresaId
  ) {
    if (!id) return;

    const { data, error } =
      await supabase
        .from("suscripciones")
        .select("*")
        .eq(
          "empresa_id",
          id
        )
        .order(
          "fecha_vencimiento",
          {
            ascending: true,
          }
        );

    if (error) {
      alert(
        "Error cargando membresías: " +
          error.message
      );

      return;
    }

    const lista = data || [];

    const idsClientes = [
      ...new Set(
        lista
          .map(
            (item) =>
              item.cliente_id
          )
          .filter(Boolean)
      ),
    ];

    let clientes = [];

    if (
      idsClientes.length > 0
    ) {
      const {
        data: dataClientes,
        error: errorClientes,
      } = await supabase
        .from("clientes")
        .select(
          "id,nombre,cedula,telefono,correo,estado"
        )
        .eq(
          "empresa_id",
          id
        )
        .in(
          "id",
          idsClientes
        );

      if (!errorClientes) {
        clientes =
          dataClientes || [];
      }
    }

    const mapaClientes =
      new Map(
        clientes.map(
          (cliente) => [
            String(cliente.id),
            cliente,
          ]
        )
      );

    setSuscripciones(
      lista.map((item) => {
        const cliente =
          mapaClientes.get(
            String(
              item.cliente_id
            )
          );

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

  async function cargarClientePorId(
    id,
    clienteId
  ) {
    const { data, error } =
      await supabase
        .from("clientes")
        .select(
          "id,nombre,cedula,telefono,correo,estado"
        )
        .eq(
          "empresa_id",
          id
        )
        .eq(
          "id",
          clienteId
        )
        .maybeSingle();

    if (
      error ||
      !data
    ) {
      alert(
        "No se pudo cargar el alumno: " +
          (
            error?.message ||
            "Alumno no encontrado."
          )
      );

      return;
    }

    seleccionarCliente(data);
  }

  async function buscarClientes() {
    if (!empresaId) return;

    const texto =
      buscarCliente.trim();

    if (
      texto.length < 2
    ) {
      alert(
        "Escriba por lo menos dos caracteres."
      );

      return;
    }

    const seguro =
      texto.replace(
        /[%_,()]/g,
        ""
      );

    const { data, error } =
      await supabase
        .from("clientes")
        .select(
          "id,nombre,cedula,telefono,correo,estado"
        )
        .eq(
          "empresa_id",
          empresaId
        )
        .or(
          `nombre.ilike.%${seguro}%,cedula.ilike.%${seguro}%,telefono.ilike.%${seguro}%`
        )
        .limit(10);

    if (error) {
      alert(
        "Error buscando alumnos: " +
          error.message
      );

      return;
    }

    setResultadosClientes(
      data || []
    );
  }

  function seleccionarCliente(
    cliente
  ) {
    setClienteSeleccionado(
      cliente
    );

    setBuscarCliente(
      cliente.nombre ||
        cliente.cedula ||
        ""
    );

    setResultadosClientes([]);
  }

  const planesActivos =
    useMemo(
      () =>
        planes.filter(
          (plan) =>
            plan.activo !== false
        ),
      [planes]
    );

  const planSeleccionado =
    useMemo(
      () =>
        planesActivos.find(
          (plan) =>
            String(plan.id) ===
            String(
              formMembresia.planId
            )
        ) || null,
      [
        planesActivos,
        formMembresia.planId,
      ]
    );

  const vencimientoNuevo =
    useMemo(() => {
      if (
        !planSeleccionado ||
        !formMembresia.fechaInicio
      ) {
        return "";
      }

      return calcularVencimiento(
        formMembresia.fechaInicio,
        planSeleccionado.duracion_cantidad,
        planSeleccionado.duracion_unidad
      );
    }, [
      planSeleccionado,
      formMembresia.fechaInicio,
    ]);

  const resumen = useMemo(() => {
    const r = {
      activas: 0,
      proximas: 0,
      vencidas: 0,
      suspendidas: 0,
      pendientes: 0,
    };

    suscripciones.forEach(
      (item) => {
        const estado =
          obtenerEstadoAutomatico(
            item
          );

        if (
          estado === "Activo"
        ) {
          r.activas += 1;
        }

        if (
          estado ===
          "Próxima a vencer"
        ) {
          r.proximas += 1;
        }

        if (
          estado === "Vencida"
        ) {
          r.vencidas += 1;
        }

        if (
          estado === "Suspendido"
        ) {
          r.suspendidas += 1;
        }

        if (
          estado === "Pendiente"
        ) {
          r.pendientes += 1;
        }
      }
    );

    return r;
  }, [suscripciones]);

  function abrirFiltro() {
    setFiltroAbierto(true);
    setTextoFiltro("");
    setEstadoFiltro("Todos");
    setCoincidenciasFiltro([]);
    setMembresiaFiltroId("");
  }

  function cerrarFiltro() {
    setFiltroAbierto(false);
    setCoincidenciasFiltro([]);
    setMembresiaFiltroId("");
  }

  function ejecutarFiltro() {
    const texto =
      normalizar(textoFiltro);

    if (
      texto.length < 2
    ) {
      alert(
        "Escriba por lo menos dos caracteres para buscar."
      );

      return;
    }

    const coincidencias =
      suscripciones.filter(
        (item) => {
          const estado =
            obtenerEstadoAutomatico(
              item
            );

          const bolsa =
            normalizar(
              `${
                item.cliente || ""
              } ${
                item.cedula || ""
              } ${
                item.telefono || ""
              } ${
                item.plan || ""
              } ${estado}`
            );

          const coincideTexto =
            bolsa.includes(texto);

          const coincideEstado =
            estadoFiltro ===
              "Todos" ||
            estadoFiltro ===
              estado;

          return (
            coincideTexto &&
            coincideEstado
          );
        }
      );

    if (
      coincidencias.length === 0
    ) {
      setCoincidenciasFiltro([]);
      setMembresiaFiltroId("");

      alert(
        "No se encontró ninguna membresía con ese filtro."
      );

      return;
    }

    setCoincidenciasFiltro(
      coincidencias.slice(0, 25)
    );

    if (
      coincidencias.length === 1
    ) {
      setMembresiaFiltroId(
        String(
          coincidencias[0].id
        )
      );
    } else {
      setMembresiaFiltroId("");
    }
  }

  function abrirMembresiaFiltrada() {
    if (!membresiaFiltroId) {
      alert(
        "Seleccione un alumno."
      );

      return;
    }

    const item =
      coincidenciasFiltro.find(
        (membresia) =>
          String(membresia.id) ===
          String(
            membresiaFiltroId
          )
      );

    if (!item) {
      alert(
        "No se encontró la membresía seleccionada."
      );

      return;
    }

    setMembresiaDetalle(item);
    cerrarFiltro();
  }

  function abrirPrincipal() {
    setVista("principal");
    setMembresiaACambiar(null);
    setClienteSeleccionado(null);
    setBuscarCliente("");
    setResultadosClientes([]);

    setFormMembresia({
      ...FORM_MEMBRESIA_INICIAL,
      fechaInicio: fechaHoy(),
    });

    router.replace(
      "/suscripciones"
    );
  }

  function abrirNueva() {
    setVista("nueva");
    setMembresiaACambiar(null);

    setFormMembresia({
      ...FORM_MEMBRESIA_INICIAL,
      fechaInicio: fechaHoy(),
    });
  }

  function abrirPlanes() {
    if (!puedeAdministrarPlanes) {
      alert(
        "Solo el Administrador puede crear, editar o desactivar planes de membresía."
      );
      return;
    }

    setVista("planes");
    limpiarFormPlan();
  }

  function limpiarFormPlan() {
    setFormPlan(
      FORM_PLAN_INICIAL
    );

    setPlanEditandoId(null);
  }

  function cambiarPeriodicidadPlan(
    periodicidad
  ) {
    const config =
      configurarDuracion(
        periodicidad
      );

    setFormPlan(
      (actual) => ({
        ...actual,
        periodicidad,
        duracionCantidad:
          config.cantidad,
        duracionUnidad:
          config.unidad,
      })
    );
  }

  function editarPlan(plan) {
    setPlanEditandoId(
      plan.id
    );

    setFormPlan({
      nombre:
        plan.nombre || "",
      descripcion:
        plan.descripcion || "",
      precio: String(
        Number(
          plan.precio || 0
        )
      ),
      periodicidad:
        plan.periodicidad ||
        "Mensual",
      duracionCantidad:
        String(
          plan.duracion_cantidad ||
            1
        ),
      duracionUnidad:
        plan.duracion_unidad ||
        "Meses",
      diasAviso:
        String(
          plan.dias_aviso ??
            DIAS_AVISO_DEFAULT
        ),
      diasGracia:
        String(
          plan.dias_gracia ??
            DIAS_GRACIA_DEFAULT
        ),
      activo:
        plan.activo !== false,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function guardarPlan() {
    if (
      !empresaId ||
      guardando
    ) {
      return;
    }

    const nombre =
      formPlan.nombre.trim();

    const precio =
      Number(formPlan.precio);

    const duracionCantidad =
      Number(
        formPlan.duracionCantidad
      );

    const diasAviso =
      Number(
        formPlan.diasAviso || 0
      );

    const diasGracia =
      Number(
        formPlan.diasGracia || 0
      );

    if (!nombre) {
      alert(
        "Escriba el nombre del plan."
      );

      return;
    }

    if (
      !Number.isFinite(precio) ||
      precio <= 0
    ) {
      alert(
        "El precio debe ser mayor que cero."
      );

      return;
    }

    if (
      !Number.isInteger(
        duracionCantidad
      ) ||
      duracionCantidad <= 0
    ) {
      alert(
        "La duración debe ser un número entero mayor que cero."
      );

      return;
    }

    if (
      !Number.isInteger(
        diasAviso
      ) ||
      diasAviso < 0 ||
      !Number.isInteger(
        diasGracia
      ) ||
      diasGracia < 0
    ) {
      alert(
        "Revise los días de aviso y de gracia."
      );

      return;
    }

    const payload = {
      empresa_id: empresaId,
      nombre,
      descripcion:
        formPlan.descripcion.trim() ||
        null,
      precio,
      periodicidad:
        formPlan.periodicidad,
      duracion_cantidad:
        duracionCantidad,
      duracion_unidad:
        formPlan.duracionUnidad,
      dias_aviso:
        diasAviso,
      dias_gracia:
        diasGracia,
      activo:
        Boolean(
          formPlan.activo
        ),
    };

    setGuardando(true);

    try {
      if (planEditandoId) {
        const { error } =
          await supabase
            .from(
              "planes_membresia"
            )
            .update(payload)
            .eq(
              "id",
              planEditandoId
            )
            .eq(
              "empresa_id",
              empresaId
            );

        if (error) throw error;

        alert(
          "Plan actualizado correctamente."
        );
      } else {
        const { error } =
          await supabase
            .from(
              "planes_membresia"
            )
            .insert([payload]);

        if (error) throw error;

        alert(
          "Plan creado correctamente."
        );
      }

      limpiarFormPlan();

      await cargarPlanes(
        empresaId
      );
    } catch (error) {
      alert(
        "No se pudo guardar el plan: " +
          error.message
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstadoPlan(
    plan
  ) {
    if (
      !empresaId ||
      guardando
    ) {
      return;
    }

    const nuevo =
      !Boolean(plan.activo);

    const accion =
      nuevo
        ? "activar"
        : "desactivar";

    const confirmar =
      window.confirm(
        `¿Deseas ${accion} el plan "${plan.nombre}"?`
      );

    if (!confirmar) return;

    setGuardando(true);

    try {
      const { error } =
        await supabase
          .from(
            "planes_membresia"
          )
          .update({
            activo: nuevo,
          })
          .eq("id", plan.id)
          .eq(
            "empresa_id",
            empresaId
          );

      if (error) throw error;

      await cargarPlanes(
        empresaId
      );
    } catch (error) {
      alert(
        "No se pudo cambiar el estado del plan: " +
          error.message
      );
    } finally {
      setGuardando(false);
    }
  }

  function iniciarCambioPlan(item) {
    if (!item?.cliente_id) {
      alert("No se pudo identificar al alumno de esta membresía.");
      return;
    }

    setMembresiaDetalle(null);
    setMembresiaACambiar(item);

    setClienteSeleccionado({
      id: item.cliente_id,
      nombre: item.cliente || "Alumno",
      cedula: item.cedula || "",
      telefono: item.telefono || "",
      correo: item.correo || "",
    });

    setBuscarCliente(item.cliente || "");
    setResultadosClientes([]);

    setFormMembresia({
      ...FORM_MEMBRESIA_INICIAL,
      fechaInicio: fechaHoy(),
      descripcion: `Cambio de plan desde ${item.plan || "membresía actual"}`,
    });

    setVista("nueva");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function procesarCambioPlan(existente) {
    if (!existente?.id || !planSeleccionado) return;

    if (
      String(existente.plan_membresia_id || "") ===
      String(planSeleccionado.id || "")
    ) {
      alert(
        "El alumno ya tiene este mismo plan. Para renovarlo, abre su membresía y utiliza Ir a Caja."
      );
      return;
    }

    const confirmar = window.confirm(
      `${clienteSeleccionado?.nombre || "El alumno"} tiene actualmente ${
        existente.plan || "una membresía activa"
      }.\n\n¿Deseas cambiarla a ${planSeleccionado.nombre}? El cambio quedará pendiente hasta completar el pago en Caja.`
    );

    if (!confirmar) return;

    const precio = Number(planSeleccionado.precio || 0);

    if (!Number.isFinite(precio) || precio <= 0) {
      alert("El nuevo plan no tiene un precio válido.");
      return;
    }

    setGuardando(true);

    let cuentaAnterior = null;
    let suscripcionAnterior = null;

    try {
      const { data: suscripcionActual, error: errorSuscripcionActual } =
        await supabase
          .from("suscripciones")
          .select("*")
          .eq("empresa_id", empresaId)
          .eq("id", existente.id)
          .single();

      if (errorSuscripcionActual || !suscripcionActual) {
        throw new Error(
          "No se pudo cargar la membresía actual para realizar el cambio."
        );
      }

      suscripcionAnterior = suscripcionActual;

      const cuentaId =
        suscripcionActual.informacion_comercial_id ||
        existente.informacion_comercial_id ||
        null;

      if (!cuentaId) {
        throw new Error(
          "La membresía actual no tiene una cuenta comercial vinculada."
        );
      }

      const { data: cuentaActual, error: errorCuentaActual } = await supabase
        .from("informacion_comercial")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("id", cuentaId)
        .single();

      if (errorCuentaActual || !cuentaActual) {
        throw new Error(
          "No se pudo cargar la cuenta actual de la membresía."
        );
      }

      cuentaAnterior = cuentaActual;

      const nuevaDescripcion =
        formMembresia.descripcion.trim() ||
        planSeleccionado.descripcion ||
        `Cambio a ${planSeleccionado.nombre}`;

      const { error: errorActualizarCuenta } = await supabase
        .from("informacion_comercial")
        .update({
          plan_membresia_id: planSeleccionado.id,
          tipo_producto: "Membresía",
          descripcion: `${planSeleccionado.nombre} - ${nuevaDescripcion}`,
          modalidad: planSeleccionado.periodicidad,
          monto_total: precio,
          saldo_actual: precio,
          cuota: precio,
          fecha_inicio: formMembresia.fechaInicio,
          fecha_vencimiento: vencimientoNuevo,
          estado: "Pendiente",
          estado_servicio: "Pendiente",
          observacion: nuevaDescripcion,
        })
        .eq("empresa_id", empresaId)
        .eq("id", cuentaId);

      if (errorActualizarCuenta) {
        throw new Error(
          "No se pudo preparar la cuenta para el cambio de plan: " +
            errorActualizarCuenta.message
        );
      }

      const { error: errorActualizarSuscripcion } = await supabase
        .from("suscripciones")
        .update({
          plan_membresia_id: planSeleccionado.id,
          plan: planSeleccionado.nombre,
          descripcion: nuevaDescripcion,
          precio,
          forma_pago: "Pendiente",
          fecha_inicio: formMembresia.fechaInicio,
          fecha_vencimiento: vencimientoNuevo,
          periodicidad: planSeleccionado.periodicidad,
          duracion_cantidad: Number(
            planSeleccionado.duracion_cantidad || 1
          ),
          duracion_unidad: planSeleccionado.duracion_unidad || "Meses",
          dias_aviso: Number(
            planSeleccionado.dias_aviso ?? DIAS_AVISO_DEFAULT
          ),
          dias_gracia: Number(
            planSeleccionado.dias_gracia ?? DIAS_GRACIA_DEFAULT
          ),
          estado: "Pendiente",
        })
        .eq("empresa_id", empresaId)
        .eq("id", existente.id);

      if (errorActualizarSuscripcion) {
        if (cuentaAnterior?.id) {
          const restaurarCuenta = { ...cuentaAnterior };
          delete restaurarCuenta.id;
          delete restaurarCuenta.created_at;
          delete restaurarCuenta.updated_at;

          await supabase
            .from("informacion_comercial")
            .update(restaurarCuenta)
            .eq("empresa_id", empresaId)
            .eq("id", cuentaAnterior.id);
        }

        throw new Error(
          "No se pudo cambiar el plan de la membresía: " +
            errorActualizarSuscripcion.message
        );
      }

      setMembresiaACambiar(null);

      router.push(
        `/caja?clienteId=${encodeURIComponent(
          clienteSeleccionado.id
        )}&suscripcionId=${encodeURIComponent(
          existente.id
        )}&cuentaId=${encodeURIComponent(
          cuentaId
        )}&flujo=nueva_membresia&cambioPlan=1`
      );
    } catch (error) {
      if (suscripcionAnterior?.id && cuentaAnterior?.id) {
        console.error("Cambio de plan no completado:", error);
      }

      alert(error.message || "No se pudo realizar el cambio de plan.");
    } finally {
      setGuardando(false);
    }
  }

  async function crearMembresia() {
    if (
      !empresaId ||
      guardando
    ) {
      return;
    }

    if (
      !clienteSeleccionado?.id
    ) {
      alert(
        "Seleccione un alumno registrado."
      );

      return;
    }

    if (!planSeleccionado) {
      alert(
        "Seleccione un plan de membresía."
      );

      return;
    }

    if (
      !formMembresia.fechaInicio ||
      !vencimientoNuevo
    ) {
      alert(
        "Seleccione una fecha de inicio válida."
      );

      return;
    }

    const existente =
      suscripciones.find(
        (item) => {
          if (
            String(
              item.cliente_id
            ) !==
            String(
              clienteSeleccionado.id
            )
          ) {
            return false;
          }

          return [
            "Activo",
            "Próxima a vencer",
            "Pendiente",
          ].includes(
            obtenerEstadoAutomatico(
              item
            )
          );
        }
      );

    if (existente) {
      await procesarCambioPlan(existente);
      return;
    }

    const precio =
      Number(
        planSeleccionado.precio ||
          0
      );

    if (
      !Number.isFinite(precio) ||
      precio <= 0
    ) {
      alert(
        "El plan seleccionado no tiene un precio válido."
      );

      return;
    }

    setGuardando(true);

    let comercialCreado =
      null;

    try {
      const numeroCuenta =
        `MEM-${Date.now()}`;

      const responsable =
        localStorage.getItem(
          "usuarioNombre"
        ) ||
        localStorage.getItem(
          "adminKonaxNombre"
        ) ||
        "Administración";

      const {
        data: comercial,
        error: errorComercial,
      } = await supabase
        .from(
          "informacion_comercial"
        )
        .insert([
          {
            empresa_id:
              empresaId,
            cliente_id:
              clienteSeleccionado.id,
            plan_membresia_id:
              planSeleccionado.id,
            numero_cuenta:
              numeroCuenta,
            tipo_producto:
              "Membresía",
            descripcion:
              `${
                planSeleccionado.nombre
              } - ${
                formMembresia.descripcion ||
                planSeleccionado.descripcion ||
                ""
              }`,
            modalidad:
              planSeleccionado.periodicidad,
            monto_total:
              precio,
            saldo_actual:
              precio,
            cuota:
              precio,
            fecha_inicio:
              formMembresia.fechaInicio,
            fecha_vencimiento:
              vencimientoNuevo,
            responsable,
            estado:
              "Pendiente",
            estado_servicio:
              "Pendiente",
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

      comercialCreado =
        comercial;

      const {
        data: suscripcionCreada,
        error: errorSuscripcion,
      } = await supabase
        .from("suscripciones")
        .insert([
          {
            empresa_id:
              empresaId,
            cliente_id:
              clienteSeleccionado.id,
            informacion_comercial_id:
              comercial.id,
            plan_membresia_id:
              planSeleccionado.id,
            cliente:
              clienteSeleccionado.nombre,
            cedula:
              clienteSeleccionado.cedula ||
              "",
            plan:
              planSeleccionado.nombre,
            tipo_servicio:
              "Membresía",
            descripcion:
              formMembresia.descripcion.trim() ||
              planSeleccionado.descripcion ||
              "",
            precio,
            vendedor:
              responsable,
            forma_pago:
              "Pendiente",
            fecha_inicio:
              formMembresia.fechaInicio,
            fecha_vencimiento:
              vencimientoNuevo,
            periodicidad:
              planSeleccionado.periodicidad,
            duracion_cantidad:
              Number(
                planSeleccionado.duracion_cantidad ||
                  1
              ),
            duracion_unidad:
              planSeleccionado.duracion_unidad ||
              "Meses",
            dias_aviso:
              Number(
                planSeleccionado.dias_aviso ??
                  DIAS_AVISO_DEFAULT
              ),
            dias_gracia:
              Number(
                planSeleccionado.dias_gracia ??
                  DIAS_GRACIA_DEFAULT
              ),
            estado:
              "Pendiente",
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
      if (
        comercialCreado?.id
      ) {
        await supabase
          .from(
            "informacion_comercial"
          )
          .delete()
          .eq(
            "id",
            comercialCreado.id
          )
          .eq(
            "empresa_id",
            empresaId
          );
      }

      alert(
        error.message ||
          "No se pudo crear la membresía."
      );
    } finally {
      setGuardando(false);
    }
  }

  function irACaja(item) {
    if (!item?.cliente_id) {
      alert(
        "La membresía no tiene un alumno vinculado."
      );

      return;
    }

    const params =
      new URLSearchParams({
        clienteId:
          String(
            item.cliente_id
          ),
        suscripcionId:
          String(item.id),
        flujo:
          "renovacion",
      });

    if (
      item.informacion_comercial_id
    ) {
      params.set(
        "cuentaId",
        String(
          item.informacion_comercial_id
        )
      );
    }

    setMembresiaDetalle(null);

    router.push(
      `/caja?${params.toString()}`
    );
  }

  function verFicha(item) {
    localStorage.setItem(
      "busquedaVistaCliente",
      item.cedula ||
        item.cliente ||
        ""
    );

    setMembresiaDetalle(null);

    router.push(
      "/vista-cliente"
    );
  }

  if (cargando) {
    return (
      <div style={s.loading}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.loadingLogo}
        />

        <strong>
          Preparando membresías...
        </strong>
      </div>
    );
  }

  if (vista === "planes") {
    if (!puedeAdministrarPlanes) {
      return (
        <main style={s.page}>
          <div
            style={{
              ...s.narrow,
              ...(esMovil ? s.containerMobile : {}),
            }}
          >
            <Header
              etiqueta="PLANES DE MEMBRESÍA"
              titulo="Acceso restringido"
              texto="La administración de planes está reservada para el Administrador."
              boton="← Regresar a Membresías"
              onBack={abrirPrincipal}
              esMovil={esMovil}
            />

            <section style={s.restrictedCard}>
              <div style={s.restrictedIcon}>🔒</div>
              <div>
                <strong style={s.restrictedTitle}>
                  El Vendedor puede asignar planes existentes
                </strong>
                <p style={s.restrictedText}>
                  Puede crear alumnos, asignar membresías, cobrar en Caja y registrar Check-in, pero no crear ni modificar precios o planes.
                </p>
              </div>
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
            etiqueta="PLANES DE MEMBRESÍA"
            titulo="Administrar planes"
            texto="Crea y organiza los planes que luego podrás asignar a cada alumno."
            boton="← Regresar a Membresías"
            onBack={abrirPrincipal}
            esMovil={esMovil}
          />

          <section style={s.cardPremiumStrong}>
            <div style={s.sectionHeaderPremium}>
              <div>
                <span style={s.sectionEyebrow}>
                  {planEditandoId ? "EDITANDO PLAN" : "NUEVO PLAN"}
                </span>

                <h2 style={s.sectionTitleLarge}>
                  {planEditandoId
                    ? "Actualizar plan de membresía"
                    : "Crear plan de membresía"}
                </h2>

                <p style={s.sectionTextSoft}>
                  Define el nombre, precio y vigencia. Solo los planes activos estarán disponibles al momento de asignar una membresía.
                </p>
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

            <div style={s.planFormBlock}>
              <div style={s.formSectionCard}>
                <div style={s.formSectionHeader}>
                  <span style={s.formSectionIndex}>01</span>
                  <div>
                    <strong style={s.formSectionTitle}>
                      Datos del plan
                    </strong>
                    <p style={s.formSectionText}>
                      Información que verá el administrador al asignar una membresía.
                    </p>
                  </div>
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
              </div>

              <div style={s.formSectionCard}>
                <div style={s.formSectionHeader}>
                  <span style={s.formSectionIndex}>02</span>
                  <div>
                    <strong style={s.formSectionTitle}>
                      Vigencia y avisos
                    </strong>
                    <p style={s.formSectionText}>
                      Define cuánto dura la membresía y cuándo debe aparecer como próxima a vencer.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    ...s.formGrid,
                    ...(esMovil ? s.oneColumn : {}),
                  }}
                >
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
              </div>
            </div>

            <div style={s.formBottomBar}>
              <label style={s.checkRowPremium}>
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
                <span>Plan activo y disponible para asignar</span>
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
            </div>
          </section>

          <section style={{ ...s.cardPremiumStrong, marginTop: 16 }}>
            <div style={s.sectionHeaderPremium}>
              <div>
                <span style={s.sectionEyebrow}>PLANES CREADOS</span>
                <h2 style={s.sectionTitleLarge}>
                  Catálogo de membresías
                </h2>
                <p style={s.sectionTextSoft}>
                  Aquí se administran únicamente los planes que ya existen.
                </p>
              </div>

              <span style={s.counterLarge}>{planes.length}</span>
            </div>

            {planes.length === 0 ? (
              <div style={s.emptyPremium}>
                Todavía no hay planes creados.
              </div>
            ) : (
              <div
                style={{
                  ...s.planCatalogGrid,
                  ...(esMovil ? s.oneColumn : {}),
                }}
              >
                {planes.map((plan) => (
                  <article key={plan.id} style={s.planCatalogCard}>
                    <div style={s.planCatalogTop}>
                      <div>
                        <div style={s.planCatalogChips}>
                          <span
                            style={
                              plan.activo
                                ? s.badgeActive
                                : s.badgeInactive
                            }
                          >
                            {plan.activo ? "Activo" : "Inactivo"}
                          </span>

                          <span style={s.planPeriodBadge}>
                            {plan.periodicidad || "Mensual"}
                          </span>
                        </div>

                        <h3 style={s.planCatalogTitle}>
                          {plan.nombre}
                        </h3>
                      </div>

                      <div style={s.planCatalogPriceBox}>
                        <span style={s.planCatalogPriceLabel}>
                          Precio
                        </span>
                        <strong style={s.planCatalogPrice}>
                          B/. {Number(plan.precio || 0).toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    <p style={s.planCatalogDescription}>
                      {plan.descripcion || "Sin descripción registrada."}
                    </p>

                    <div style={s.planCatalogMetaGrid}>
                      <div style={s.planCatalogMetaCard}>
                        <span style={s.planCatalogMetaLabel}>
                          Duración
                        </span>
                        <strong style={s.planCatalogMetaValue}>
                          {Number(plan.duracion_cantidad || 1)} {plan.duracion_unidad || "Meses"}
                        </strong>
                      </div>

                      <div style={s.planCatalogMetaCard}>
                        <span style={s.planCatalogMetaLabel}>
                          Aviso
                        </span>
                        <strong style={s.planCatalogMetaValue}>
                          {Number(plan.dias_aviso ?? DIAS_AVISO_DEFAULT)} días
                        </strong>
                      </div>

                      <div style={s.planCatalogMetaCard}>
                        <span style={s.planCatalogMetaLabel}>
                          Gracia
                        </span>
                        <strong style={s.planCatalogMetaValue}>
                          {Number(plan.dias_gracia ?? DIAS_GRACIA_DEFAULT)} días
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        ...s.planCatalogActions,
                        ...(esMovil ? s.oneColumn : {}),
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => editarPlan(plan)}
                        style={s.secondaryBtn}
                      >
                        Editar plan
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
            ...(esMovil
              ? s.containerMobile
              : {}),
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
              ...(esMovil
                ? s.stepsMobile
                : {}),
            }}
          >
            <span
              style={s.stepDone}
            >
              1. Alumno
            </span>

            <span
              style={s.stepActive}
            >
              2. Membresía
            </span>

            <span
              style={s.step}
            >
              3. Caja
            </span>
          </div>

          {membresiaACambiar && (
            <div style={s.changePlanNotice}>
              <div>
                <span style={s.sectionEyebrow}>CAMBIO DE PLAN</span>
                <strong style={s.changePlanTitle}>
                  Plan actual: {membresiaACambiar.plan || "Membresía"}
                </strong>
                <p style={s.changePlanText}>
                  Selecciona el nuevo plan. El cambio se completa al registrar el pago en Caja.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMembresiaACambiar(null)}
                style={s.secondaryBtn}
              >
                Cancelar cambio
              </button>
            </div>
          )}

          <section
            style={s.cardPremium}
          >
            <div
              style={
                s.sectionHeader
              }
            >
              <div>
                <span
                  style={
                    s.sectionEyebrow
                  }
                >
                  ALUMNO
                </span>

                <h2
                  style={
                    s.sectionTitle
                  }
                >
                  Seleccionar alumno
                </h2>
              </div>
            </div>

            {!clienteSeleccionado ? (
              <>
                <div
                  style={{
                    ...s.searchRow,
                    ...(esMovil
                      ? s.oneColumn
                      : {}),
                  }}
                >
                  <input
                    value={
                      buscarCliente
                    }
                    onChange={(e) =>
                      setBuscarCliente(
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        buscarClientes();
                      }
                    }}
                    placeholder="Nombre, cédula o teléfono"
                    style={s.input}
                  />

                  <button
                    type="button"
                    onClick={
                      buscarClientes
                    }
                    style={s.darkBtn}
                  >
                    Buscar
                  </button>
                </div>

                {resultadosClientes.length >
                  0 && (
                  <div
                    style={
                      s.results
                    }
                  >
                    {resultadosClientes.map(
                      (cliente) => (
                        <button
                          key={
                            cliente.id
                          }
                          type="button"
                          onClick={() =>
                            seleccionarCliente(
                              cliente
                            )
                          }
                          style={
                            s.result
                          }
                        >
                          <strong>
                            {
                              cliente.nombre
                            }
                          </strong>

                          <span>
                            {cliente.cedula ||
                              "Sin cédula"}
                          </span>

                          <small>
                            {cliente.telefono ||
                              "Sin teléfono"}
                          </small>
                        </button>
                      )
                    )}
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  ...s.selectedStudent,
                  ...(esMovil
                    ? s.selectedStudentMobile
                    : {}),
                }}
              >
                <div
                  style={s.avatar}
                >
                  {String(
                    clienteSeleccionado.nombre ||
                      "A"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong
                    style={
                      s.studentName
                    }
                  >
                    {
                      clienteSeleccionado.nombre
                    }
                  </strong>

                  <span
                    style={
                      s.studentData
                    }
                  >
                    Cédula:{" "}
                    {clienteSeleccionado.cedula ||
                      "-"}
                  </span>

                  <span
                    style={
                      s.studentData
                    }
                  >
                    Teléfono:{" "}
                    {clienteSeleccionado.telefono ||
                      "-"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(
                      null
                    );

                    setBuscarCliente(
                      ""
                    );
                  }}
                  style={
                    s.secondaryBtn
                  }
                >
                  Cambiar
                </button>
              </div>
            )}
          </section>

          <section
            style={s.cardPremium}
          >
            <div
              style={
                s.sectionHeader
              }
            >
              <div>
                <span
                  style={
                    s.sectionEyebrow
                  }
                >
                  PLAN
                </span>

                <h2
                  style={
                    s.sectionTitle
                  }
                >
                  Plan y vigencia
                </h2>
              </div>

              {puedeAdministrarPlanes && (
                <button
                  type="button"
                  onClick={abrirPlanes}
                  style={s.secondaryBtn}
                >
                  Administrar planes
                </button>
              )}
            </div>

            {planesActivos.length ===
            0 ? (
              <div
                style={s.noPlans}
              >
                <strong>
                  No hay planes activos.
                </strong>

                <span>
                  Crea primero un
                  plan para poder
                  asignar una membresía.
                </span>

                {puedeAdministrarPlanes ? (
                  <button
                    type="button"
                    onClick={abrirPlanes}
                    style={s.primaryBtn}
                  >
                    + Crear plan
                  </button>
                ) : (
                  <span style={s.roleNotice}>
                    Solicita al Administrador que cree o active un plan.
                  </span>
                )}
              </div>
            ) : (
              <div
                style={{
                  ...s.formGrid,
                  ...(esMovil
                    ? s.oneColumn
                    : {}),
                }}
              >
                <Campo
                  label="Plan *"
                >
                  <select
                    value={
                      formMembresia.planId
                    }
                    onChange={(e) =>
                      setFormMembresia(
                        (actual) => ({
                          ...actual,
                          planId:
                            e.target.value,
                        })
                      )
                    }
                    style={s.input}
                  >
                    <option
                      value=""
                    >
                      Seleccione un plan
                    </option>

                    {planesActivos.map(
                      (plan) => (
                        <option
                          key={plan.id}
                          value={plan.id}
                        >
                          {plan.nombre} · B/.{" "}
                          {Number(
                            plan.precio ||
                              0
                          ).toFixed(
                            2
                          )}
                        </option>
                      )
                    )}
                  </select>
                </Campo>

                <Campo
                  label="Fecha de inicio *"
                >
                  <input
                    type="date"
                    value={
                      formMembresia.fechaInicio
                    }
                    onChange={(e) =>
                      setFormMembresia(
                        (actual) => ({
                          ...actual,
                          fechaInicio:
                            e.target.value,
                        })
                      )
                    }
                    style={s.input}
                  />
                </Campo>

                <Campo
                  label="Precio"
                >
                  <input
                    readOnly
                    value={
                      planSeleccionado
                        ? `B/. ${Number(
                            planSeleccionado.precio ||
                              0
                          ).toFixed(
                            2
                          )}`
                        : ""
                    }
                    style={
                      s.readonlyInput
                    }
                  />
                </Campo>

                <Campo
                  label="Vencimiento"
                >
                  <input
                    readOnly
                    value={
                      formatearFecha(
                        vencimientoNuevo
                      )
                    }
                    style={
                      s.readonlyInput
                    }
                  />
                </Campo>
              </div>
            )}

            <Campo
              label="Observación"
            >
              <textarea
                value={
                  formMembresia.descripcion
                }
                onChange={(e) =>
                  setFormMembresia(
                    (actual) => ({
                      ...actual,
                      descripcion:
                        e.target.value,
                    })
                  )
                }
                placeholder="Opcional"
                style={s.textarea}
              />
            </Campo>

            <button
              type="button"
              onClick={
                crearMembresia
              }
              disabled={
                guardando ||
                planesActivos.length ===
                  0
              }
              style={{
                ...s.primaryBtn,
                opacity:
                  guardando ||
                  planesActivos.length ===
                    0
                    ? 0.6
                    : 1,
              }}
            >
              {guardando
                ? "Guardando..."
                : membresiaACambiar
                ? "Cambiar plan y continuar a Caja →"
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
          ...(esMovil
            ? s.containerMobile
            : {}),
        }}
      >
        <Header
          etiqueta="CONTROL DE MEMBRESÍAS"
          titulo="Membresías del gimnasio"
          texto={`${empresaNombre} · Control claro de planes, vigencias y renovaciones.`}
          boton="← Volver al Dashboard"
          onBack={() =>
            router.push(
              "/dashboard"
            )
          }
          esMovil={esMovil}
        />

        <div
          style={{
            ...s.topActions,
            ...(!puedeAdministrarPlanes ? s.topActionsSingle : {}),
            ...(esMovil ? s.topActionsMobile : {}),
          }}
        >
          <button
            type="button"
            onClick={abrirNueva}
            style={
              s.primaryBtnLarge
            }
          >
            <span
              style={s.actionIcon}
            >
              ＋
            </span>

            <span>
              <strong
                style={s.actionTitle}
              >
                Nueva membresía
              </strong>

              <small
                style={
                  s.actionSubtitle
                }
              >
                Asignar un plan a un alumno
              </small>
            </span>
          </button>

          {puedeAdministrarPlanes && (
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
          )}
        </div>

        <section
          style={{
            ...s.kpiGrid,
            ...(esMovil
              ? s.kpiGridMobile
              : {}),
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

        <section
          style={{
            ...s.filterOnlyCard,
            ...(esMovil ? s.filterOnlyCardMobile : {}),
          }}
        >
          <div
            style={
              s.filterOnlyIcon
            }
          >
            ⌕
          </div>

          <div
            style={s.filterOnlyCopy}
          >
            <span
              style={
                s.sectionEyebrow
              }
            >
              CONSULTAR MEMBRESÍA
            </span>

            <h2
              style={
                s.filterOnlyTitle
              }
            >
              Busca únicamente cuando lo necesites
            </h2>

            <p
              style={
                s.filterOnlyText
              }
            >
              La pantalla principal no muestra listas de alumnos.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirFiltro}
            style={
              s.filterOnlyButton
            }
          >
            Filtrar membresía
          </button>
        </section>

        <div style={s.version}>
          Versión {VERSION}
        </div>
      </div>

      {filtroAbierto && (
        <Modal
          esMovil={esMovil}
          onClose={cerrarFiltro}
        >
          <div
            style={s.modalHeader}
          >
            <div>
              <span
                style={
                  s.sectionEyebrow
                }
              >
                FILTRO
              </span>

              <h2
                style={
                  s.modalTitle
                }
              >
                Buscar membresía
              </h2>

              <p
                style={
                  s.modalText
                }
              >
                Busca por nombre, cédula, teléfono o plan.
              </p>
            </div>

            <button
              type="button"
              onClick={cerrarFiltro}
              style={s.modalClose}
            >
              ×
            </button>
          </div>

          <div
            style={{
              ...s.modalFields,
              ...(esMovil ? s.oneColumn : {}),
            }}
          >
            <Campo
              label="Buscar"
            >
              <input
                autoFocus
                value={textoFiltro}
                onChange={(e) =>
                  setTextoFiltro(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    ejecutarFiltro();
                  }
                }}
                placeholder="Nombre, cédula, teléfono o plan"
                style={s.input}
              />
            </Campo>

            <Campo
              label="Estado"
            >
              <select
                value={estadoFiltro}
                onChange={(e) =>
                  setEstadoFiltro(
                    e.target.value
                  )
                }
                style={s.input}
              >
                <option>
                  Todos
                </option>
                <option>
                  Activo
                </option>
                <option>
                  Próxima a vencer
                </option>
                <option>
                  Pendiente
                </option>
                <option>
                  Vencida
                </option>
                <option>
                  Suspendido
                </option>
                <option>
                  Cancelado
                </option>
              </select>
            </Campo>
          </div>

          <button
            type="button"
            onClick={
              ejecutarFiltro
            }
            style={s.searchModalBtn}
          >
            Buscar
          </button>

          {coincidenciasFiltro.length >
            0 && (
            <div
              style={s.compactSelectBox}
            >
              <Campo
                label="Seleccionar alumno"
              >
                <select
                  value={
                    membresiaFiltroId
                  }
                  onChange={(e) =>
                    setMembresiaFiltroId(
                      e.target.value
                    )
                  }
                  style={s.input}
                >
                  <option
                    value=""
                  >
                    Seleccione una coincidencia
                  </option>

                  {coincidenciasFiltro.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.cliente} ·{" "}
                        {item.cedula ||
                          item.telefono ||
                          "Sin identificación"}{" "}
                        ·{" "}
                        {item.plan ||
                          "Sin plan"}
                      </option>
                    )
                  )}
                </select>
              </Campo>

              <button
                type="button"
                onClick={
                  abrirMembresiaFiltrada
                }
                style={s.primaryBtn}
              >
                Abrir membresía
              </button>
            </div>
          )}
        </Modal>
      )}

      {membresiaDetalle && (
        <Modal
          esMovil={esMovil}
          onClose={() =>
            setMembresiaDetalle(
              null
            )
          }
        >
          <MembresiaDetalle
            item={
              membresiaDetalle
            }
            onClose={() =>
              setMembresiaDetalle(
                null
              )
            }
            onFicha={() =>
              verFicha(
                membresiaDetalle
              )
            }
            onCaja={() =>
              irACaja(
                membresiaDetalle
              )
            }
            onCambiarPlan={() =>
              iniciarCambioPlan(
                membresiaDetalle
              )
            }
            esMovil={esMovil}
          />
        </Modal>
      )}
    </main>
  );
}

function Modal({
  children,
  onClose,
  esMovil,
}) {
  return (
    <div
      style={s.modalOverlay}
      onMouseDown={(e) => {
        if (
          e.target ===
          e.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        style={{
          ...s.modalCard,
          ...(esMovil
            ? s.modalCardMobile
            : {}),
        }}
      >
        {children}
      </section>
    </div>
  );
}

function MembresiaDetalle({
  item,
  onClose,
  onFicha,
  onCaja,
  onCambiarPlan,
  esMovil,
}) {
  const estado =
    obtenerEstadoAutomatico(
      item
    );

  const colores =
    colorEstado(estado);

  return (
    <>
      <div
        style={s.modalHeader}
      >
        <div>
          <span
            style={
              s.sectionEyebrow
            }
          >
            MEMBRESÍA
          </span>

          <h2
            style={
              s.modalTitle
            }
          >
            {item.cliente}
          </h2>

          <p
            style={
              s.modalText
            }
          >
            {item.cedula ||
              "Sin cédula"}{" "}
            {item.telefono
              ? `· ${item.telefono}`
              : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={s.modalClose}
        >
          ×
        </button>
      </div>

      <div
        style={{
          ...s.detailGrid,
          ...(esMovil
            ? s.oneColumn
            : {}),
        }}
      >
        <DetailBox
          label="Plan"
          value={
            item.plan ||
            "Sin plan"
          }
        />

        <DetailBox
          label="Precio"
          value={`B/. ${Number(
            item.precio || 0
          ).toFixed(2)}`}
        />

        <DetailBox
          label="Inicio"
          value={formatearFecha(
            item.fecha_inicio
          )}
        />

        <DetailBox
          label="Vencimiento"
          value={formatearFecha(
            item.fecha_vencimiento
          )}
        />
      </div>

      <div
        style={{
          ...s.detailStatus,
          background:
            colores.fondo,
          color:
            colores.color,
        }}
      >
        {estado}
      </div>

      <div
        style={{
          ...s.detailActions,
          ...(esMovil
            ? s.oneColumn
            : {}),
        }}
      >
        <button
          type="button"
          onClick={onFicha}
          style={
            s.secondaryBtn
          }
        >
          Ver ficha
        </button>

        <button
          type="button"
          onClick={onCambiarPlan}
          style={s.secondaryBtn}
        >
          Cambiar plan
        </button>

        <button
          type="button"
          onClick={onCaja}
          style={
            s.primaryBtn
          }
        >
          Ir a Caja
        </button>
      </div>
    </>
  );
}

function DetailBox({
  label,
  value,
}) {
  return (
    <div
      style={s.detailBox}
    >
      <span
        style={s.detailLabel}
      >
        {label}
      </span>

      <strong
        style={s.detailValue}
      >
        {value}
      </strong>
    </div>
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
        ...(esMovil
          ? s.heroMobile
          : {}),
      }}
    >
      <div>
        <span
          style={s.eyebrow}
        >
          {etiqueta}
        </span>

        <h1
          style={{
            ...s.heroTitle,
            ...(esMovil
              ? s.heroTitleMobile
              : {}),
          }}
        >
          {titulo}
        </h1>

        <p
          style={s.heroText}
        >
          {texto}
        </p>
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

function Campo({
  label,
  children,
}) {
  return (
    <label
      style={s.field}
    >
      <span
        style={s.label}
      >
        {label}
      </span>

      {children}
    </label>
  );
}

function KPI({
  titulo,
  valor,
  tipo,
  icono,
}) {
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
        background:
          fondos[tipo],
      }}
    >
      <div
        style={{
          ...s.kpiIcon,
          color:
            colores[tipo],
        }}
      >
        {icono}
      </div>

      <div>
        <span
          style={s.kpiLabel}
        >
          {titulo}
        </span>

        <strong
          style={{
            ...s.kpiValue,
            color:
              colores[tipo],
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
        <div style={s.loading}>
          Cargando...
        </div>
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
    width:
      "min(1180px, calc(100% - 36px))",
    margin: "0 auto",
    padding: "24px 0 42px",
    boxSizing: "border-box",
  },

  containerMobile: {
    width: "100%",
    maxWidth: "100%",
    padding:
      "12px 12px 28px",
    overflowX: "hidden",
  },

  narrow: {
    width:
      "min(900px, calc(100% - 36px))",
    margin: "0 auto",
    padding: "24px 0 42px",
    boxSizing: "border-box",
  },

  hero: {
    minHeight: 148,
    padding: "25px 27px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 20,
    overflow: "hidden",
    border:
      "1px solid #d8e8de",
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
    gridTemplateColumns:
      "1fr",
    gap: 16,
    borderRadius: 20,
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
    border:
      "1px solid #c8d9ce",
    borderRadius: 12,
    background:
      "rgba(255,255,255,.9)",
    color: "#173c2a",
    fontWeight: 850,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  topActions: {
    margin: "14px 0",
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,280px))",
    gap: 11,
  },

  topActionsMobile: {
    gridTemplateColumns:
      "1fr",
  },

  primaryBtnLarge: {
    minHeight: 76,
    padding: "14px 16px",
    display: "grid",
    gridTemplateColumns:
      "42px minmax(0,1fr)",
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
    gridTemplateColumns:
      "42px minmax(0,1fr)",
    alignItems: "center",
    gap: 12,
    border:
      "1px solid #d5e1d9",
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
    background:
      "rgba(255,255,255,.17)",
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
    color:
      "rgba(255,255,255,.78)",
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
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: 10,
  },

  kpiGridMobile: {
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
  },

  kpi: {
    minHeight: 88,
    padding: 14,
    display: "grid",
    gridTemplateColumns:
      "38px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
    borderRadius: 17,
    border:
      "1px solid rgba(30,65,44,.05)",
    boxShadow:
      "0 8px 20px rgba(15,23,42,.03)",
  },

  kpiIcon: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background:
      "rgba(255,255,255,.72)",
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

  filterOnlyCard: {
    marginTop: 16,
    minHeight: 128,
    padding: 20,
    display: "grid",
    gridTemplateColumns:
      "58px minmax(0,1fr) auto",
    alignItems: "center",
    gap: 15,
    border:
      "1px solid #d9e6de",
    borderRadius: 20,
    background:
      "linear-gradient(135deg,#ffffff,#f4faf6)",
    boxShadow:
      "0 14px 35px rgba(15,23,42,.045)",
  },

  filterOnlyCardMobile: {
    gridTemplateColumns: "1fr",
    justifyItems: "stretch",
    textAlign: "left",
  },

  filterOnlyIcon: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#e8f6ed",
    color: "#16834f",
    fontSize: 30,
  },

  filterOnlyCopy: {
    minWidth: 0,
  },

  filterOnlyTitle: {
    margin: "5px 0 0",
    color: "#17211c",
    fontSize: 19,
    lineHeight: 1.15,
  },

  filterOnlyText: {
    margin: "6px 0 0",
    color: "#728078",
    fontSize: 10.5,
  },

  filterOnlyButton: {
    minHeight: 47,
    padding: "11px 17px",
    border: "none",
    borderRadius: 13,
    background:
      "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 9px 20px rgba(22,131,79,.15)",
    whiteSpace: "nowrap",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    padding: 16,
    display: "grid",
    placeItems: "center",
    background:
      "rgba(15,23,42,.38)",
    backdropFilter:
      "blur(4px)",
  },

  modalCard: {
    width: "min(620px,100%)",
    maxHeight:
      "calc(100vh - 32px)",
    padding: 20,
    overflowY: "auto",
    boxSizing: "border-box",
    border:
      "1px solid #d9e5dd",
    borderRadius: 22,
    background: "#ffffff",
    boxShadow:
      "0 30px 80px rgba(15,23,42,.24)",
  },

  modalCardMobile: {
    width: "100%",
    maxWidth: "100%",
    padding: 16,
    borderRadius: 18,
  },

  modalHeader: {
    marginBottom: 16,
    display: "flex",
    alignItems: "flex-start",
    justifyContent:
      "space-between",
    gap: 15,
  },

  modalTitle: {
    margin: "4px 0 0",
    color: "#17211c",
    fontSize: 24,
  },

  modalText: {
    margin: "6px 0 0",
    color: "#738078",
    fontSize: 10.5,
    lineHeight: 1.45,
  },

  modalClose: {
    width: 38,
    height: 38,
    border:
      "1px solid #dce5df",
    borderRadius: 12,
    background: "#f8faf9",
    color: "#55635b",
    fontSize: 22,
    cursor: "pointer",
  },

  modalFields: {
    display: "grid",
    gridTemplateColumns:
      "1fr 180px",
    gap: 10,
  },

  searchModalBtn: {
    width: "100%",
    minHeight: 46,
    marginTop: 2,
    border: "none",
    borderRadius: 12,
    background:
      "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
  },

  compactSelectBox: {
    marginTop: 16,
    padding: 14,
    border:
      "1px solid #dce8e0",
    borderRadius: 15,
    background: "#f6fbf8",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 10,
  },

  detailBox: {
    padding: 13,
    border:
      "1px solid #e1e8e3",
    borderRadius: 13,
    background: "#fbfdfc",
  },

  detailLabel: {
    display: "block",
    color: "#16834f",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 0.8,
  },

  detailValue: {
    display: "block",
    marginTop: 5,
    color: "#1d2922",
    fontSize: 13,
  },

  detailStatus: {
    marginTop: 12,
    padding: "9px 12px",
    display: "inline-block",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 950,
  },

  detailActions: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: 9,
  },

  cardPremium: {
    marginTop: 14,
    padding: 18,
    border:
      "1px solid #dce7e0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow:
      "0 14px 35px rgba(15,23,42,.05)",
  },

  sectionHeader: {
    marginBottom: 15,
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  sectionEyebrow: {
    display: "block",
    color: "#16834f",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: 1.05,
  },

  sectionTitle: {
    margin: "4px 0 0",
    fontSize: 20,
    color: "#17211c",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 13,
  },

  oneColumn: {
    gridTemplateColumns:
      "1fr",
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
    border:
      "1px solid #ccd8d0",
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
    border:
      "1px solid #dce5df",
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
    border:
      "1px solid #ccd8d0",
    borderRadius: 12,
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: 16,
    outline: "none",
  },

  durationGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(90px,.7fr) minmax(130px,1.3fr)",
    gap: 8,
  },

  inputSuffix: {
    display: "grid",
    gridTemplateColumns:
      "1fr auto",
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
    border:
      "1px solid #cbd8d0",
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
    border:
      "1px solid #fed7aa",
    borderRadius: 9,
    background: "#fff7ed",
    color: "#9a3412",
    fontWeight: 850,
    cursor: "pointer",
  },

  greenOutlineBtn: {
    minHeight: 40,
    padding: "8px 12px",
    border:
      "1px solid #b9d9c4",
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
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 14,
    border:
      "1px solid #e1e8e3",
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
    gridTemplateColumns:
      "1fr 1fr",
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
    gridTemplateColumns:
      "repeat(3,1fr)",
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
    gridTemplateColumns:
      "1fr auto",
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
    border:
      "1px solid #e0e7e2",
    borderRadius: 10,
    background: "#ffffff",
    textAlign: "left",
    cursor: "pointer",
  },

  selectedStudent: {
    padding: 13,
    display: "grid",
    gridTemplateColumns:
      "48px minmax(0,1fr) auto",
    alignItems: "center",
    gap: 11,
    border:
      "1px solid #dbe7df",
    borderRadius: 13,
    background: "#f7fbf8",
  },

  selectedStudentMobile: {
    gridTemplateColumns:
      "48px minmax(0,1fr)",
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
    border:
      "1px dashed #b7cdbd",
    borderRadius: 13,
    background: "#f4fbf6",
    color: "#385044",
  },

  empty: {
    padding: 22,
    border:
      "1px dashed #d3ddd6",
    borderRadius: 12,
    background: "#f9fbfa",
    color: "#758079",
    fontSize: 11,
    textAlign: "center",
  },


  planSummaryStrip: {
    marginTop: 14,
  },

  planSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
  },

  planMiniStat: {
    minHeight: 92,
    padding: 16,
    border: "1px solid #dbe7df",
    borderRadius: 18,
    background: "linear-gradient(135deg,#ffffff,#f6fbf8)",
    boxShadow: "0 12px 28px rgba(15,23,42,.04)",
  },

  planMiniHighlight: {
    minHeight: 92,
    padding: 16,
    border: "1px solid #cfe2d5",
    borderRadius: 18,
    background: "linear-gradient(135deg,#173c2a,#16834f)",
    color: "#ffffff",
    boxShadow: "0 14px 34px rgba(22,131,79,.16)",
  },

  planMiniLabel: {
    display: "block",
    fontSize: 9.5,
    fontWeight: 900,
    color: "#728078",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  planMiniValue: {
    display: "block",
    marginTop: 8,
    fontSize: 28,
    color: "#1a2821",
    lineHeight: 1,
  },

  planMiniValueGreen: {
    display: "block",
    marginTop: 8,
    fontSize: 28,
    color: "#16834f",
    lineHeight: 1,
  },

  planMiniValueMuted: {
    display: "block",
    marginTop: 8,
    fontSize: 28,
    color: "#7a867f",
    lineHeight: 1,
  },

  planMiniValueDark: {
    display: "block",
    marginTop: 8,
    fontSize: 24,
    color: "#ffffff",
    lineHeight: 1.1,
  },

  planMiniHint: {
    display: "block",
    marginTop: 6,
    color: "rgba(255,255,255,.75)",
    fontSize: 9.5,
    lineHeight: 1.45,
  },

  planAdminGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "minmax(0,1.55fr) minmax(280px,.85fr)",
    gap: 16,
    alignItems: "start",
  },

  cardPremiumStrong: {
    marginTop: 0,
    padding: 20,
    border: "1px solid #d8e6dd",
    borderRadius: 24,
    background: "linear-gradient(180deg,#ffffff 0%,#fbfdfc 100%)",
    boxShadow: "0 20px 45px rgba(15,23,42,.05)",
  },

  sectionHeaderPremium: {
    marginBottom: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  },

  sectionTitleLarge: {
    margin: "4px 0 0",
    fontSize: 24,
    color: "#17211c",
    lineHeight: 1.08,
  },

  sectionTextSoft: {
    margin: "7px 0 0",
    color: "#718078",
    fontSize: 11,
    lineHeight: 1.5,
    maxWidth: 620,
  },

  planFormBlock: {
    display: "grid",
    gap: 14,
  },

  formSectionCard: {
    padding: 16,
    border: "1px solid #e2ebe5",
    borderRadius: 18,
    background: "#ffffff",
  },

  formSectionHeader: {
    marginBottom: 14,
    display: "grid",
    gridTemplateColumns: "44px minmax(0,1fr)",
    gap: 12,
    alignItems: "start",
  },

  formSectionIndex: {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#eaf7ef",
    color: "#16834f",
    fontWeight: 950,
    fontSize: 13,
  },

  formSectionTitle: {
    display: "block",
    color: "#17211c",
    fontSize: 14,
  },

  formSectionText: {
    margin: "4px 0 0",
    color: "#728078",
    fontSize: 10.5,
    lineHeight: 1.45,
  },

  formBottomBar: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid #e7ede9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  checkRowPremium: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#334139",
    fontSize: 11,
    fontWeight: 800,
  },

  planPreviewPanel: {
    position: "sticky",
    top: 16,
    padding: 20,
    border: "1px solid #d7e7dc",
    borderRadius: 24,
    background: "linear-gradient(180deg,#173c2a 0%,#16834f 100%)",
    color: "#ffffff",
    boxShadow: "0 24px 50px rgba(15,61,35,.18)",
  },

  previewTitle: {
    margin: "6px 0 0",
    fontSize: 28,
    lineHeight: 1.05,
  },

  previewPriceRow: {
    marginTop: 14,
    display: "flex",
    alignItems: "flex-start",
    gap: 4,
  },

  previewCurrency: {
    marginTop: 8,
    color: "rgba(255,255,255,.82)",
    fontSize: 18,
    fontWeight: 900,
  },

  previewPrice: {
    fontSize: 42,
    lineHeight: 1,
    letterSpacing: -1,
  },

  previewBadge: {
    display: "inline-block",
    marginTop: 10,
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,.14)",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 900,
  },

  previewDescription: {
    margin: "14px 0 0",
    color: "rgba(255,255,255,.82)",
    fontSize: 11,
    lineHeight: 1.6,
  },

  previewMetaList: {
    marginTop: 16,
    display: "grid",
    gap: 8,
  },

  previewMetaItem: {
    padding: "11px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,.11)",
  },

  previewMetaLabel: {
    color: "rgba(255,255,255,.75)",
    fontSize: 10,
  },

  previewMetaValue: {
    color: "#ffffff",
    fontSize: 11,
  },

  previewNoteBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    background: "rgba(0,0,0,.12)",
    border: "1px solid rgba(255,255,255,.12)",
  },

  previewNoteTitle: {
    display: "block",
    fontSize: 11,
  },

  previewNoteText: {
    margin: "6px 0 0",
    color: "rgba(255,255,255,.82)",
    fontSize: 10.5,
    lineHeight: 1.55,
  },

  counterLarge: {
    minWidth: 42,
    height: 42,
    padding: "0 12px",
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    background: "#eaf7ef",
    color: "#16834f",
    fontWeight: 950,
    fontSize: 15,
  },

  emptyPremium: {
    padding: 28,
    border: "1px dashed #d3ddd6",
    borderRadius: 16,
    background: "#f9fbfa",
    color: "#758079",
    fontSize: 12,
    textAlign: "center",
  },

  planCatalogGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 14,
  },

  planCatalogCard: {
    padding: 16,
    border: "1px solid #dbe6df",
    borderRadius: 20,
    background: "linear-gradient(180deg,#ffffff 0%,#f8fbf9 100%)",
    boxShadow: "0 12px 28px rgba(15,23,42,.04)",
  },

  planCatalogTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  planCatalogChips: {
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
  },

  planPeriodBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#eef5f1",
    color: "#516058",
    fontSize: 9,
    fontWeight: 900,
  },

  planCatalogTitle: {
    margin: "10px 0 0",
    color: "#17211c",
    fontSize: 19,
    lineHeight: 1.15,
  },

  planCatalogPriceBox: {
    minWidth: 108,
    padding: "10px 11px",
    borderRadius: 14,
    background: "#edf8f1",
    textAlign: "right",
  },

  planCatalogPriceLabel: {
    display: "block",
    color: "#6c7a72",
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase",
  },

  planCatalogPrice: {
    display: "block",
    marginTop: 5,
    color: "#16834f",
    fontSize: 22,
    lineHeight: 1,
  },

  planCatalogDescription: {
    minHeight: 38,
    margin: "12px 0 0",
    color: "#6e7b74",
    fontSize: 10.5,
    lineHeight: 1.55,
  },

  planCatalogMetaGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 8,
  },

  planCatalogMetaCard: {
    padding: "10px 10px",
    border: "1px solid #e3ebe6",
    borderRadius: 14,
    background: "#ffffff",
  },

  planCatalogMetaLabel: {
    display: "block",
    color: "#6e7b74",
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase",
  },

  planCatalogMetaValue: {
    display: "block",
    marginTop: 5,
    color: "#1a2821",
    fontSize: 11,
    lineHeight: 1.3,
  },

  planCatalogActions: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 9,
  },

  topActionsSingle: {
    gridTemplateColumns: "minmax(0,280px)",
  },

  restrictedCard: {
    marginTop: 16,
    padding: 22,
    display: "grid",
    gridTemplateColumns: "56px minmax(0,1fr)",
    gap: 15,
    alignItems: "center",
    border: "1px solid #dce7e0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 14px 35px rgba(15,23,42,.05)",
  },

  restrictedIcon: {
    width: 56,
    height: 56,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#eef6f1",
    fontSize: 23,
  },

  restrictedTitle: {
    display: "block",
    color: "#1b2921",
    fontSize: 15,
  },

  restrictedText: {
    margin: "6px 0 0",
    color: "#718078",
    fontSize: 10.5,
    lineHeight: 1.55,
  },

  roleNotice: {
    display: "block",
    marginTop: 6,
    color: "#6e7b74",
    fontSize: 10.5,
    lineHeight: 1.45,
  },

  changePlanNotice: {
    margin: "14px 0 0",
    padding: 15,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    border: "1px solid #cde3d5",
    borderRadius: 16,
    background: "linear-gradient(135deg,#f2fbf5,#e9f7ef)",
  },

  changePlanTitle: {
    display: "block",
    marginTop: 4,
    color: "#173c2a",
    fontSize: 13,
  },

  changePlanText: {
    margin: "5px 0 0",
    color: "#637168",
    fontSize: 10.5,
    lineHeight: 1.45,
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
