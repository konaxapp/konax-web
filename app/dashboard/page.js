"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabase";
import SidebarKonax from "../../components/SidebarKonax";

const DIA_MS = 86400000;

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function esTipoGimnasio(tipoNegocio, categoriaNegocio = "") {
  const texto = normalizar(
    `${tipoNegocio || ""} ${categoriaNegocio || ""}`
  );

  return [
    "gimnasio",
    "gym",
    "fitness",
    "academia",
    "club",
  ].some((palabra) => texto.includes(palabra));
}

function fechaLocal(fecha) {
  if (!fecha) return null;

  const [a, m, d] = String(fecha)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!a || !m || !d) return null;

  return new Date(a, m - 1, d, 0, 0, 0, 0);
}

function formatoFecha(fecha) {
  if (!fecha) return "-";

  const [a, m, d] = String(fecha)
    .slice(0, 10)
    .split("-");

  return a && m && d ? `${d}/${m}/${a}` : fecha;
}

function calcularDias(fechaFin) {
  const fin = fechaLocal(fechaFin);

  if (!fin) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.ceil((fin.getTime() - hoy.getTime()) / DIA_MS)
  );
}

function construirModulosPorPlan(codigoPlan) {
  const codigo = normalizar(codigoPlan);

  const base = {
    dashboard: true,

    clientes: false,
    vista_cliente: false,

    creditos: false,
    cobranza: false,
    dashboard_cobros: false,
    gestor_cobros: false,

    caja: false,
    control_caja: false,

    reportes: false,

    inventario: false,
    movimientos_inventario: false,

    ventas: false,
    dashboard_ventas: false,

    gastos: false,
    recargos: false,
    suscripciones: false,

    nuevo_pedido: false,
    pedidos_lavanderia: false,
    historial_lavanderia: false,

    usuarios: true,
    configuracion: true,
  };

  if (codigo === "lavanderia_piloto") {
    return {
      ...base,
      dashboard: true,
      nuevo_pedido: true,
      pedidos_lavanderia: true,
      clientes: true,
      caja: true,
      historial_lavanderia: true,
      usuarios: true,
      configuracion: true,
    };
  }

  if (codigo === "cobros") {
    return {
      ...base,
      clientes: true,
      vista_cliente: true,
      caja: true,
      cobranza: true,
      dashboard_cobros: true,
      gestor_cobros: true,
      reportes: true,
    };
  }

  if (codigo === "ventas_gestion") {
    return {
      ...base,
      clientes: true,
      vista_cliente: true,
      creditos: true,
      caja: true,
      control_caja: true,
      cobranza: true,
      dashboard_cobros: true,
      gestor_cobros: true,
      reportes: true,
      inventario: true,
      movimientos_inventario: true,
      ventas: true,
      dashboard_ventas: true,
      gastos: true,
      recargos: true,
      suscripciones: true,
    };
  }

  if (codigo === "pro") {
    return Object.fromEntries(
      Object.keys(base).map((codigoModulo) => [
        codigoModulo,
        true,
      ])
    );
  }

  return base;
}

function leerModuloEmpresa(data, codigo) {
  if (!data) return true;

  if (Object.prototype.hasOwnProperty.call(data, codigo)) {
    return Boolean(data[codigo]);
  }

  const columnasAntiguas = {
    clientes: "clientes",
    vista_cliente: "vista_cliente",
    creditos: "venta_credito",
    caja: "caja",
    control_caja: "control_caja",
    cobranza: "cobranza",
    dashboard_cobros: "dashboard_cobros",
    gestor_cobros: "cobranza",
    reportes: "dashboard_cobros",
    inventario: "inventario",
    movimientos_inventario: "inventario",
    ventas: "venta_credito",
    dashboard_ventas: "dashboard_ventas",
    gastos: "egresos",
    recargos: "recargos",
    suscripciones: "suscripciones",
  };

  const columna = columnasAntiguas[codigo];

  if (
    columna &&
    Object.prototype.hasOwnProperty.call(data, columna)
  ) {
    return Boolean(data[columna]);
  }

  if (
    [
      "nuevo_pedido",
      "pedidos_lavanderia",
      "historial_lavanderia",
    ].includes(codigo)
  ) {
    return true;
  }

  return true;
}

function obtenerMembresiaActualPorAlumno(registros = []) {
  const ordenadas = [...registros].sort((a, b) => {
    const fechaA =
      fechaLocal(a.fecha_vencimiento)?.getTime() || 0;
    const fechaB =
      fechaLocal(b.fecha_vencimiento)?.getTime() || 0;

    return fechaB - fechaA;
  });

  const porAlumno = new Map();

  ordenadas.forEach((membresia) => {
    const clave = membresia.cliente_id || membresia.id;

    if (!porAlumno.has(clave)) {
      porAlumno.set(clave, membresia);
    }
  });

  return Array.from(porAlumno.values());
}

function calcularResumenGimnasio(
  clientes = [],
  suscripciones = []
) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const limiteAviso = new Date(
    hoy.getTime() + 7 * DIA_MS
  );

  const alumnosActivos = clientes.filter((cliente) => {
    const estado = normalizar(cliente.estado);

    return ![
      "inactivo",
      "cancelado",
      "suspendido",
      "bloqueado",
    ].includes(estado);
  }).length;

  const membresiasActuales =
    obtenerMembresiaActualPorAlumno(suscripciones);

  let membresiasActivas = 0;
  let porVencer = 0;
  let vencidas = 0;

  membresiasActuales.forEach((membresia) => {
    const estado = normalizar(membresia.estado);
    const vencimiento = fechaLocal(
      membresia.fecha_vencimiento
    );

    if (
      ["cancelado", "suspendido", "inactivo"].includes(
        estado
      )
    ) {
      return;
    }

    if (estado === "vencida") {
      vencidas += 1;
      return;
    }

    if (!vencimiento) {
      if (["activo", "activa"].includes(estado)) {
        membresiasActivas += 1;
      }

      return;
    }

    if (vencimiento.getTime() < hoy.getTime()) {
      vencidas += 1;
      return;
    }

    membresiasActivas += 1;

    if (
      vencimiento.getTime() <= limiteAviso.getTime()
    ) {
      porVencer += 1;
    }
  });

  return {
    alumnosActivos,
    membresiasActivas,
    porVencer,
    vencidas,
  };
}

function diasHastaFecha(fechaFin) {
  const fin = fechaLocal(fechaFin);

  if (!fin) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return Math.ceil(
    (fin.getTime() - hoy.getTime()) / DIA_MS
  );
}

function obtenerNombreCliente(cliente = {}) {
  const nombreCompleto =
    cliente.nombre_completo ||
    cliente.nombre ||
    cliente.razon_social ||
    [
      cliente.nombres,
      cliente.apellido,
      cliente.apellidos,
    ]
      .filter(Boolean)
      .join(" ");

  return String(nombreCompleto || "Alumno sin nombre").trim();
}

function obtenerDocumentoCliente(cliente = {}) {
  return String(
    cliente.cedula ||
      cliente.documento ||
      cliente.identificacion ||
      cliente.numero_documento ||
      ""
  ).trim();
}

function obtenerTelefonoCliente(cliente = {}) {
  return String(
    cliente.telefono ||
      cliente.celular ||
      cliente.whatsapp ||
      cliente.movil ||
      ""
  ).trim();
}

function obtenerNombrePlan(membresia = {}) {
  return String(
    membresia.plan_nombre ||
      membresia.nombre_plan ||
      membresia.tipo_plan ||
      membresia.plan?.nombre ||
      membresia.nombre ||
      "Plan sin nombre"
  ).trim();
}

function obtenerSaldoMembresia(membresia = {}) {
  const valor =
    membresia.saldo_pendiente ??
    membresia.monto_pendiente ??
    membresia.saldo ??
    membresia.pendiente ??
    0;

  const numero = Number(
    String(valor)
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "")
  );

  return Number.isFinite(numero) ? numero : 0;
}

function evaluarEstadoMembresia(
  membresia,
  estadoCliente = ""
) {
  const cliente = normalizar(estadoCliente);

  if (
    [
      "inactivo",
      "cancelado",
      "suspendido",
      "bloqueado",
    ].includes(cliente)
  ) {
    return {
      codigo: "alumno_inactivo",
      etiqueta: "Alumno inactivo",
    };
  }

  if (!membresia) {
    return {
      codigo: "sin_membresia",
      etiqueta: "Sin membresía",
    };
  }

  const estado = normalizar(membresia.estado);
  const dias = diasHastaFecha(
    membresia.fecha_vencimiento
  );

  if (
    [
      "cancelado",
      "cancelada",
      "suspendido",
      "suspendida",
      "inactivo",
      "inactiva",
    ].includes(estado)
  ) {
    return {
      codigo: "suspendida",
      etiqueta: "Membresía suspendida",
    };
  }

  if (
    [
      "vencido",
      "vencida",
      "moroso",
      "morosa",
    ].includes(estado) ||
    (dias !== null && dias < 0)
  ) {
    return {
      codigo: "vencida",
      etiqueta: "Membresía vencida",
    };
  }

  if (dias !== null && dias <= 7) {
    return {
      codigo: "por_vencer",
      etiqueta:
        dias === 0
          ? "Vence hoy"
          : dias === 1
          ? "Vence mañana"
          : `Vence en ${dias} días`,
    };
  }

  return {
    codigo: "activa",
    etiqueta: "Membresía activa",
  };
}

function construirAlumnosGimnasio(
  clientes = [],
  suscripciones = []
) {
  const membresiasActuales =
    obtenerMembresiaActualPorAlumno(suscripciones);

  const membresiasPorCliente = new Map();

  membresiasActuales.forEach((membresia) => {
    if (membresia.cliente_id) {
      membresiasPorCliente.set(
        String(membresia.cliente_id),
        membresia
      );
    }
  });

  return clientes
    .map((cliente) => {
      const membresia =
        membresiasPorCliente.get(String(cliente.id)) ||
        null;

      const nombre = obtenerNombreCliente(cliente);
      const documento = obtenerDocumentoCliente(cliente);
      const telefono = obtenerTelefonoCliente(cliente);
      const estado = evaluarEstadoMembresia(
        membresia,
        cliente.estado
      );

      return {
        id: cliente.id,
        nombre,
        documento,
        telefono,
        correo: String(cliente.correo || "").trim(),
        estadoCliente: normalizar(cliente.estado),
        membresia,
        planNombre: membresia
          ? obtenerNombrePlan(membresia)
          : "Sin plan activo",
        fechaVencimiento:
          membresia?.fecha_vencimiento || "",
        diasVencimiento: diasHastaFecha(
          membresia?.fecha_vencimiento
        ),
        saldoPendiente: membresia
          ? obtenerSaldoMembresia(membresia)
          : 0,
        estadoCodigo: estado.codigo,
        estadoEtiqueta: estado.etiqueta,
        textoBusqueda: normalizar(
          [
            nombre,
            documento,
            telefono,
            cliente.correo,
          ]
            .filter(Boolean)
            .join(" ")
        ),
      };
    })
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );
}

function crearRutaAlumno(
  ruta,
  alumnoId,
  parametros = {}
) {
  const consulta = new URLSearchParams();

  if (alumnoId) {
    consulta.set("clienteId", String(alumnoId));
  }

  Object.entries(parametros).forEach(
    ([clave, valor]) => {
      if (
        valor !== undefined &&
        valor !== null &&
        valor !== ""
      ) {
        consulta.set(clave, String(valor));
      }
    }
  );

  const texto = consulta.toString();

  return texto ? `${ruta}?${texto}` : ruta;
}

function obtenerAccionInteligente(alumno) {
  if (!alumno) return null;

  if (alumno.estadoCodigo === "alumno_inactivo") {
    return {
      etiqueta: "Revisar alumno",
      detalle: "Consulta su estado antes de continuar",
      ruta: crearRutaAlumno("/clientes", alumno.id),
      icono: "👤",
    };
  }

  if (alumno.saldoPendiente > 0) {
    return {
      etiqueta: "Registrar pago",
      detalle: `Saldo pendiente: $${alumno.saldoPendiente.toFixed(
        2
      )}`,
      ruta: crearRutaAlumno("/caja", alumno.id, {
        origen: "gimnasio",
      }),
      icono: "$",
    };
  }

  if (alumno.estadoCodigo === "sin_membresia") {
    return {
      etiqueta: "Activar membresía",
      detalle: "Asigna el primer plan del alumno",
      ruta: crearRutaAlumno(
        "/suscripciones",
        alumno.id,
        {
          modo: "nueva",
          origen: "dashboard",
        }
      ),
      icono: "＋",
    };
  }

  if (alumno.estadoCodigo === "vencida") {
    return {
      etiqueta: "Cobrar y renovar",
      detalle: "La membresía ya está vencida",
      ruta: crearRutaAlumno(
        "/suscripciones",
        alumno.id,
        {
          accion: "renovar",
        }
      ),
      icono: "↻",
    };
  }

  if (alumno.estadoCodigo === "por_vencer") {
    return {
      etiqueta: "Renovar membresía",
      detalle: alumno.estadoEtiqueta,
      ruta: crearRutaAlumno(
        "/suscripciones",
        alumno.id,
        {
          accion: "renovar",
        }
      ),
      icono: "↻",
    };
  }

  if (alumno.estadoCodigo === "suspendida") {
    return {
      etiqueta: "Revisar membresía",
      detalle: "La membresía está suspendida",
      ruta: crearRutaAlumno(
        "/suscripciones",
        alumno.id
      ),
      icono: "!",
    };
  }

  return {
    etiqueta: "Registrar entrada",
    detalle: "Membresía válida para ingresar",
    ruta: crearRutaAlumno(
      "/gimnasio/check-in",
      alumno.id
    ),
    icono: "✓",
  };
}

export default function Dashboard() {
  const router = useRouter();

  const [modulos, setModulos] = useState({});
  const [permisosUsuario, setPermisosUsuario] =
    useState([]);

  const [empresaNombre, setEmpresaNombre] =
    useState("");
  const [planNombre, setPlanNombre] = useState("");
  const [planCodigo, setPlanCodigo] = useState("");
  const [estadoPlan, setEstadoPlan] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [categoriaNegocio, setCategoriaNegocio] =
    useState("");

  const [usuarioRol, setUsuarioRol] = useState("");
  const [usuarioNombre, setUsuarioNombre] =
    useState("");

  const [estadoSuscripcion, setEstadoSuscripcion] =
    useState("");
  const [fechaInicioPrueba, setFechaInicioPrueba] =
    useState("");
  const [fechaFinPrueba, setFechaFinPrueba] =
    useState("");
  const [diasRestantes, setDiasRestantes] =
    useState(null);

  const [bloqueado, setBloqueado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [esMovil, setEsMovil] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] =
    useState(false);

  const [resumenGimnasio, setResumenGimnasio] =
    useState({
      alumnosActivos: 0,
      membresiasActivas: 0,
      porVencer: 0,
      vencidas: 0,
    });

  const [
    cargandoResumenGimnasio,
    setCargandoResumenGimnasio,
  ] = useState(false);

  const [avisoResumenGimnasio, setAvisoResumenGimnasio] =
    useState("");

  const [alumnosGimnasio, setAlumnosGimnasio] =
    useState([]);

  useEffect(() => {
    cargarDashboard();

    const actualizarVista = () => {
      const movil = window.innerWidth <= 900;

      setEsMovil(movil);

      if (!movil) {
        setMenuMovilAbierto(false);
      }
    };

    actualizarVista();

    window.addEventListener("resize", actualizarVista);

    return () => {
      window.removeEventListener(
        "resize",
        actualizarVista
      );
    };
  }, []);

  function esAdministrador(rol = usuarioRol) {
    return [
      "administrador",
      "superadmin",
      "super_admin",
      "admin_master",
      "administrador_master",
    ].includes(normalizar(rol));
  }

  async function salir(mensaje = "") {
    if (mensaje) {
      alert(mensaje);
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }

    localStorage.clear();
    router.replace("/login");
  }

  async function marcarPruebaVencida(empresaId) {
    const { error } = await supabase
      .from("empresas")
      .update({
        estado_suscripcion: "prueba_vencida",
      })
      .eq("id", empresaId)
      .eq("estado_suscripcion", "prueba");

    if (error) {
      console.error(
        "No se pudo actualizar la prueba:",
        error
      );
    }
  }

  async function cargarDashboard() {
    setCargando(true);

    const empresaId =
      localStorage.getItem("empresaId");

    const usuarioId =
      localStorage.getItem("usuarioId");

    if (!empresaId || !usuarioId) {
      await salir(
        "La sesión no es válida. Inicie sesión nuevamente."
      );
      return;
    }

    const { data: usuario, error: errorUsuario } =
      await supabase
        .from("usuarios")
        .select(
          "id, empresa_id, nombre, correo, rol, rol_id, estado"
        )
        .eq("id", usuarioId)
        .maybeSingle();

    if (errorUsuario) {
      alert(
        "Error validando usuario: " +
          errorUsuario.message
      );
      setCargando(false);
      return;
    }

    if (!usuario) {
      await salir(
        "El usuario de la sesión ya no existe."
      );
      return;
    }

    if (normalizar(usuario.estado) !== "activo") {
      await salir(
        "Este usuario se encuentra inactivo."
      );
      return;
    }

    if (
      String(usuario.empresa_id) !==
      String(empresaId)
    ) {
      await salir(
        "La empresa activa no corresponde al usuario autenticado."
      );
      return;
    }

    const { data: empresa, error: errorEmpresa } =
      await supabase
        .from("empresas")
        .select(`
          id,
          nombre,
          plan_nombre,
          plan_codigo,
          estado_plan,
          estado,
          tipo_negocio,
          categoria_negocio,
          estado_suscripcion,
          fecha_inicio_prueba,
          fecha_fin_prueba
        `)
        .eq("id", empresaId)
        .maybeSingle();

    if (errorEmpresa) {
      alert(
        "Error cargando empresa: " +
          errorEmpresa.message
      );
      setCargando(false);
      return;
    }

    if (!empresa) {
      await salir(
        "La empresa de esta sesión ya no existe."
      );
      return;
    }

    if (
      normalizar(empresa.estado) === "suspendido" ||
      normalizar(empresa.estado_plan) === "suspendido"
    ) {
      await salir(
        "El servicio de esta empresa está suspendido."
      );
      return;
    }

    let suscripcion = normalizar(
      empresa.estado_suscripcion || "activo"
    );

    const fin = fechaLocal(
      empresa.fecha_fin_prueba
    );

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const pruebaVencida =
      suscripcion === "prueba" &&
      fin &&
      fin.getTime() < hoy.getTime();

    if (pruebaVencida) {
      suscripcion = "prueba_vencida";

      await marcarPruebaVencida(empresa.id);
    }

    const accesoBloqueado = [
      "prueba_vencida",
      "pendiente_activacion",
      "cancelado",
    ].includes(suscripcion);

    localStorage.setItem(
      "empresaId",
      empresa.id || ""
    );
    localStorage.setItem(
      "empresaNombre",
      empresa.nombre || ""
    );
    localStorage.setItem(
      "usuarioId",
      usuario.id || ""
    );
    localStorage.setItem(
      "usuarioNombre",
      usuario.nombre || ""
    );
    localStorage.setItem(
      "usuarioCorreo",
      usuario.correo || ""
    );
    localStorage.setItem(
      "usuarioRol",
      usuario.rol || ""
    );
    localStorage.setItem(
      "rolId",
      usuario.rol_id || ""
    );
    localStorage.setItem(
      "tipoNegocio",
      empresa.tipo_negocio || ""
    );
    localStorage.setItem(
      "categoriaNegocio",
      empresa.categoria_negocio || ""
    );
    localStorage.setItem(
      "planCodigo",
      empresa.plan_codigo || ""
    );
    localStorage.setItem(
      "planNombre",
      empresa.plan_nombre || ""
    );
    localStorage.setItem(
      "estadoPlan",
      empresa.estado_plan || ""
    );
    localStorage.setItem(
      "estadoEmpresa",
      empresa.estado || ""
    );
    localStorage.setItem(
      "estadoSuscripcion",
      suscripcion
    );

    setEmpresaNombre(
      empresa.nombre || "Empresa"
    );
    setPlanNombre(
      empresa.plan_nombre || "Sin plan"
    );
    setPlanCodigo(
      empresa.plan_codigo || ""
    );
    setEstadoPlan(
      empresa.estado_plan || "Activo"
    );
    setTipoNegocio(
      empresa.tipo_negocio || ""
    );
    setCategoriaNegocio(
      empresa.categoria_negocio || ""
    );
    setUsuarioRol(usuario.rol || "");
    setUsuarioNombre(usuario.nombre || "");

    setEstadoSuscripcion(suscripcion);
    setFechaInicioPrueba(
      empresa.fecha_inicio_prueba || ""
    );
    setFechaFinPrueba(
      empresa.fecha_fin_prueba || ""
    );
    setDiasRestantes(
      suscripcion === "prueba" &&
        !pruebaVencida
        ? calcularDias(
            empresa.fecha_fin_prueba
          )
        : null
    );

    setBloqueado(accesoBloqueado);

    if (accesoBloqueado) {
      setModulos({});
      setPermisosUsuario([]);
      setCargando(false);
      return;
    }

    const [modulosEmpresa, permisos] =
      await Promise.all([
        cargarModulosEmpresa(
          empresaId,
          empresa.plan_codigo
        ),
        cargarPermisosUsuario(
          empresaId,
          usuarioId
        ),
      ]);

    setModulos(modulosEmpresa);
    setPermisosUsuario(permisos);
    setCargando(false);

    if (
      esTipoGimnasio(
        empresa.tipo_negocio,
        empresa.categoria_negocio
      )
    ) {
      cargarResumenGimnasio(empresaId);
    }
  }

  async function cargarModulosEmpresa(
    empresaId,
    codigoPlan
  ) {
    const permitidos =
      construirModulosPorPlan(codigoPlan);

    const { data, error } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (error) {
      alert(
        "Error cargando módulos de empresa: " +
          error.message
      );

      return permitidos;
    }

    const resultado = {};

    Object.keys(permitidos).forEach(
      (codigoModulo) => {
        const incluidoEnPlan = Boolean(
          permitidos[codigoModulo]
        );

        if (!incluidoEnPlan) {
          resultado[codigoModulo] = false;
          return;
        }

        if (
          [
            "dashboard",
            "nuevo_pedido",
            "pedidos_lavanderia",
            "historial_lavanderia",
            "usuarios",
            "configuracion",
          ].includes(codigoModulo)
        ) {
          resultado[codigoModulo] = true;
          return;
        }

        resultado[codigoModulo] = data
          ? leerModuloEmpresa(
              data,
              codigoModulo
            )
          : true;
      }
    );

    return resultado;
  }

  async function cargarPermisosUsuario(
    empresaId,
    usuarioId
  ) {
    const { data, error } = await supabase
      .from("permisos_usuarios_empresa")
      .select("permiso, activo")
      .eq("empresa_id", empresaId)
      .eq("usuario_id", usuarioId)
      .eq("activo", true);

    if (error) {
      alert(
        "Error cargando permisos del usuario: " +
          error.message
      );

      return [];
    }

    return (data || [])
      .map((item) =>
        normalizar(item.permiso)
      )
      .filter(Boolean);
  }

  async function cargarResumenGimnasio(empresaId) {
    setCargandoResumenGimnasio(true);
    setAvisoResumenGimnasio("");

    const [respuestaClientes, respuestaSuscripciones] =
      await Promise.all([
        supabase
          .from("clientes")
          .select("*")
          .eq("empresa_id", empresaId),

        supabase
          .from("suscripciones")
          .select("*")
          .eq("empresa_id", empresaId),
      ]);

    const errores = [
      respuestaClientes.error,
      respuestaSuscripciones.error,
    ].filter(Boolean);

    if (errores.length > 0) {
      console.error(
        "No se pudo cargar todo el resumen del gimnasio:",
        errores
      );

      setAvisoResumenGimnasio(
        "No fue posible completar toda la información del gimnasio. Verifica las políticas de acceso de clientes y membresías."
      );
    }

    const clientes = respuestaClientes.data || [];
    const suscripciones =
      respuestaSuscripciones.data || [];

    setResumenGimnasio(
      calcularResumenGimnasio(
        clientes,
        suscripciones
      )
    );

    setAlumnosGimnasio(
      construirAlumnosGimnasio(
        clientes,
        suscripciones
      )
    );

    setCargandoResumenGimnasio(false);
  }

  function puedeVer(
    codigoModulo,
    codigoPermiso = codigoModulo
  ) {
    if (bloqueado) return false;

    const modulo = normalizar(codigoModulo);
    const permiso = normalizar(codigoPermiso);

    if (!Boolean(modulos?.[modulo])) {
      return false;
    }

    if (esAdministrador()) {
      return true;
    }

    return (
      permiso === "dashboard" ||
      permisosUsuario.includes(permiso)
    );
  }

  async function cerrarSesion() {
    await salir();
  }

  function contactarKonax() {
    window.open(
      "https://wa.me/50760211024?text=Hola%2C%20deseo%20activar%20un%20plan%20de%20KONAX.",
      "_blank",
      "noopener,noreferrer"
    );
  }

  const esLavanderia =
    normalizar(planCodigo) ===
      "lavanderia_piloto" ||
    normalizar(tipoNegocio) === "lavanderia";

  const esGimnasio = esTipoGimnasio(
    tipoNegocio,
    categoriaNegocio
  );

  const modulosMenu = useMemo(() => {
    const listaLavanderia = [
      [
        "Panel",
        "/dashboard",
        "dashboard",
        "dashboard",
        "▦",
      ],
      [
        "Usuarios y Roles",
        "/usuarios",
        "usuarios",
        "usuarios",
        "🔐",
      ],
      [
        "Configuración",
        "/admin-configuracion",
        "configuracion",
        "configuracion",
        "⚙",
      ],
    ];

    const listaGimnasio = [
      [
        "Panel",
        "/dashboard",
        "dashboard",
        "dashboard",
        "▦",
      ],
      [
        "Alumnos",
        "/clientes",
        "clientes",
        "clientes",
        "👥",
      ],
      [
        "Membresías",
        "/suscripciones",
        "suscripciones",
        "suscripciones",
        "▣",
      ],
      [
        "Caja",
        "/caja",
        "caja",
        "caja",
        "$",
      ],
      [
        "Reportes",
        "/reportes",
        "reportes",
        "reportes",
        "▥",
      ],
      [
        "Usuarios y Roles",
        "/usuarios",
        "usuarios",
        "usuarios",
        "🔐",
      ],
      [
        "Configuración",
        "/admin-configuracion",
        "configuracion",
        "configuracion",
        "⚙",
      ],
    ];

    const listaGeneral = [
      [
        "Panel",
        "/dashboard",
        "dashboard",
        "dashboard",
        "▦",
      ],
      [
        "Clientes",
        "/clientes",
        "clientes",
        "clientes",
        "👥",
      ],
      [
        "Vista Cliente",
        "/vista-cliente",
        "vista_cliente",
        "vista_cliente",
        "📄",
      ],
      [
        "Créditos",
        "/ventas-credito",
        "creditos",
        "creditos",
        "💳",
      ],
      ["Caja", "/caja", "caja", "caja", "▣"],
      [
        "Cobranza",
        "/cobranza",
        "cobranza",
        "cobranza",
        "$",
      ],
      [
        "Centro de Cobranza",
        "/dashboard-cobranza",
        "dashboard_cobros",
        "dashboard_cobros",
        "📊",
      ],
      [
        "Mi cartera de cobro",
        "/gestor-cobros",
        "gestor_cobros",
        "gestor_cobros",
        "💼",
      ],
      [
        "Control Caja",
        "/control-caja",
        "control_caja",
        "control_caja",
        "🏦",
      ],
      [
        "Inventario",
        "/inventario",
        "inventario",
        "inventario",
        "□",
      ],
      [
        "Movimientos Inventario",
        "/inventario/movimientos",
        "movimientos_inventario",
        "movimientos_inventario",
        "🔄",
      ],
      [
        "Ventas",
        "/ventas",
        "ventas",
        "ventas",
        "🛒",
      ],
      [
        "Centro de Ventas",
        "/dashboard-ventas",
        "dashboard_ventas",
        "dashboard_ventas",
        "📈",
      ],
      [
        "Gastos",
        "/gastos",
        "gastos",
        "gastos",
        "🧮",
      ],
      [
        "Suscripciones",
        "/suscripciones",
        "suscripciones",
        "suscripciones",
        "🔁",
      ],
      [
        "Recargos",
        "/recargos",
        "recargos",
        "recargos",
        "⚠️",
      ],
      [
        "Reportes",
        "/reportes",
        "reportes",
        "reportes",
        "▥",
      ],
      [
        "Usuarios y Roles",
        "/usuarios",
        "usuarios",
        "usuarios",
        "🔐",
      ],
      [
        "Configuración",
        "/admin-configuracion",
        "configuracion",
        "configuracion",
        "⚙",
      ],
    ];

    const listaBase = esLavanderia
      ? listaLavanderia
      : esGimnasio
      ? listaGimnasio
      : listaGeneral;

    const lista =
      (esLavanderia || esGimnasio) &&
      !esAdministrador()
        ? listaBase.filter(
            ([, , codigo]) =>
              codigo !== "usuarios"
          )
        : listaBase;

    return lista
      .map(
        ([
          nombre,
          ruta,
          codigo,
          permiso,
          icono,
        ]) => ({
          nombre,
          ruta,
          codigo,
          permiso,
          icono,
          activo: puedeVer(codigo, permiso),
        })
      )
      .filter((item) => item.activo);
  }, [
    modulos,
    permisosUsuario,
    usuarioRol,
    bloqueado,
    esLavanderia,
    esGimnasio,
  ]);

  const accesosRapidos = useMemo(() => {
    if (!esLavanderia) {
      return modulosMenu.filter(
        (item) => item.codigo !== "dashboard"
      );
    }

    const accesosLavanderia = [
      {
        nombre: "Nuevo pedido",
        ruta: "/lavanderia/nuevo-pedido",
        codigo: "nuevo_pedido",
        icono: "nuevo",
      },
      {
        nombre: "Pedidos",
        ruta: "/lavanderia/pedidos",
        codigo: "pedidos_lavanderia",
        icono: "pedidos",
      },
      {
        nombre: "Resumen de caja",
        ruta: "/lavanderia/caja",
        codigo: "caja",
        icono: "caja",
      },
      {
        nombre: "Historial",
        ruta: "/lavanderia/historial",
        codigo: "historial_lavanderia",
        icono: "historial",
      },
    ];

    return accesosLavanderia.filter((item) =>
      puedeVer(item.codigo)
    );
  }, [
    esLavanderia,
    modulosMenu,
    modulos,
    permisosUsuario,
    usuarioRol,
    bloqueado,
  ]);

  if (cargando) {
    return (
      <div style={s.loading}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.loadingLogo}
        />

        <strong style={s.loadingTitle}>
          Preparando tu espacio de trabajo
        </strong>

        <span style={s.loadingText}>
          Validando empresa, plan y permisos.
        </span>
      </div>
    );
  }

  if (bloqueado) {
    return (
      <div style={s.bloqueoPagina}>
        <div style={s.bloqueoTarjeta}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.bloqueoLogo}
          />

          <div style={s.candado}>🔒</div>

          <span style={s.bloqueoEtiqueta}>
            PRUEBA FINALIZADA
          </span>

          <h1 style={s.bloqueoTitulo}>
            El acceso operativo está bloqueado
          </h1>

          <p style={s.bloqueoTexto}>
            La prueba de{" "}
            <strong>{empresaNombre}</strong>{" "}
            finalizó el{" "}
            <strong>
              {formatoFecha(fechaFinPrueba)}
            </strong>
            . Los datos permanecen registrados,
            pero los módulos estarán bloqueados
            hasta activar el plan.
          </p>

          <div style={s.bloqueoAcciones}>
            <button
              onClick={contactarKonax}
              style={s.botonVerde}
            >
              Contactar a KONAX
            </button>

            <button
              onClick={cerrarSesion}
              style={s.botonClaro}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pruebaActiva =
    estadoSuscripcion === "prueba";

  const pendienteInicio =
    estadoSuscripcion ===
    "pendiente_inicio_prueba";

  const alertaCritica =
    pruebaActiva &&
    diasRestantes !== null &&
    diasRestantes <= 5;

  const fechaPanel = new Intl.DateTimeFormat(
    "es-PA",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(new Date());

  const etiquetaPanel = esLavanderia
    ? "KONAX LAVANDERÍA"
    : esGimnasio
    ? "KONAX GIMNASIOS"
    : "PANEL EMPRESARIAL";

  const subtituloPanel = esLavanderia
    ? `Operación diaria · ${fechaPanel}`
    : esGimnasio
    ? `Control de alumnos y membresías · ${fechaPanel}`
    : `Panel general · ${fechaPanel}`;

  return (
    <div
      style={{
        ...s.layout,
        ...(esMovil ? s.layoutMobile : {}),
      }}
    >
      {!esMovil && (
        <SidebarKonax
          items={modulosMenu}
          onLogout={cerrarSesion}
          tituloActivo="Panel"
        />
      )}

      <main
        style={{
          ...s.main,
          ...(esMovil ? s.mainMobile : {}),
        }}
      >
        {esMovil && (
          <>
            <div style={s.mobileBar}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={s.mobileLogo}
              />

              <button
                type="button"
                onClick={() =>
                  setMenuMovilAbierto(
                    (actual) => !actual
                  )
                }
                style={s.mobileMenuButton}
              >
                <span style={s.hamburgerIcon}>
                  {menuMovilAbierto ? "×" : "☰"}
                </span>
                <span>
                  {menuMovilAbierto
                    ? "Cerrar"
                    : "Menú"}
                </span>
              </button>
            </div>

            {menuMovilAbierto && (
              <div style={s.mobileMenu}>
                {modulosMenu.map((item) => (
                  <button
                    key={`${item.ruta}-${item.nombre}`}
                    type="button"
                    onClick={() => {
                      setMenuMovilAbierto(false);
                      router.push(item.ruta);
                    }}
                    style={{
                      ...s.mobileMenuItem,
                      ...(item.codigo ===
                      "dashboard"
                        ? s.mobileMenuItemActivo
                        : {}),
                    }}
                  >
                    <span>{item.icono}</span>
                    <span>{item.nombre}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={cerrarSesion}
                  style={s.mobileLogout}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </>
        )}

        <header
          style={{
            ...s.topbar,
            ...(esMovil
              ? s.topbarMobile
              : {}),
          }}
        >
          <div>
            <span style={s.eyebrow}>
              {etiquetaPanel}
            </span>

            <h1 style={s.pageTitle}>
              {empresaNombre}
            </h1>

            <span style={s.pageSubtitle}>
              {subtituloPanel}
            </span>
          </div>

          {esGimnasio && !esMovil && (
            <div style={s.topbarGymImagenWrap}>
              <span style={s.topbarGymCirculo} />

              <Image
                src="/gym-hero-fitness.png"
                alt="Persona fitness motivada"
                width={190}
                height={150}
                priority
                style={s.topbarGymImagen}
              />
            </div>
          )}

          <div
            style={{
              ...s.userBox,
              ...(esMovil
                ? s.userBoxMobile
                : {}),
            }}
          >
            <div style={s.avatar}>
              {String(
                usuarioNombre || "U"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong style={s.userName}>
                {usuarioNombre || "Usuario"}
              </strong>

              <span style={s.userRole}>
                {usuarioRol || "Sin rol"}
              </span>
            </div>
          </div>
        </header>

        {pendienteInicio && (
          <section
            style={{
              ...s.avisoPendiente,
              ...(esMovil
                ? s.avisoPendienteMobile
                : {}),
            }}
          >
            <div style={s.avisoIcono}>
              ⏱️
            </div>

            <div>
              <span style={s.avisoEtiqueta}>
                DEMOSTRACIÓN APROBADA
              </span>

              <strong style={s.avisoTitulo}>
                La prueba todavía no ha comenzado
              </strong>

              <p style={s.avisoTexto}>
                Un asesor de KONAX activará los
                días cuando la empresa esté lista.
              </p>
            </div>
          </section>
        )}

        {pruebaActiva && (
          <section
            style={{
              ...s.avisoPrueba,
              ...(alertaCritica
                ? s.avisoCritico
                : {}),
              ...(esMovil
                ? s.avisoPruebaMobile
                : {}),
            }}
          >
            <div
              style={{
                ...s.avisoIzquierda,
                ...(esMovil
                  ? s.avisoIzquierdaMobile
                  : {}),
              }}
            >
              <div
                style={{
                  ...s.avisoIcono,
                  ...(esMovil
                    ? s.avisoIconoMobile
                    : {}),
                }}
              >
                ⏱️
              </div>

              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    ...s.avisoEtiqueta,
                    ...(esMovil
                      ? s.avisoEtiquetaMobile
                      : {}),
                  }}
                >
                  PERÍODO DE PRUEBA ACTIVO
                </span>

                <strong
                  style={{
                    ...s.avisoTitulo,
                    ...(esMovil
                      ? s.avisoTituloMobile
                      : {}),
                  }}
                >
                  Estás utilizando KONAX en período de prueba
                </strong>

                <p
                  style={{
                    ...s.avisoTexto,
                    ...(esMovil
                      ? s.avisoTextoMobile
                      : {}),
                  }}
                >
                  Inicio:{" "}
                  {formatoFecha(fechaInicioPrueba)}
                  {" · "}
                  Vencimiento:{" "}
                  {formatoFecha(fechaFinPrueba)}
                </p>
              </div>
            </div>

            <div
              style={{
                ...s.diasCaja,
                ...(esMovil
                  ? s.diasCajaMobile
                  : {}),
              }}
            >
              <strong
                style={{
                  ...s.diasNumero,
                  ...(esMovil
                    ? s.diasNumeroMobile
                    : {}),
                }}
              >
                {diasRestantes ?? 0}
              </strong>

              <span
                style={{
                  ...s.diasTexto,
                  ...(esMovil
                    ? s.diasTextoMobile
                    : {}),
                }}
              >
                {diasRestantes === 1
                  ? "día restante"
                  : "días restantes"}
              </span>
            </div>
          </section>
        )}

        {esLavanderia ? (
          <>
            <section
              style={{
                ...s.bienvenidaLavanderia,
                ...(esMovil
                  ? s.bienvenidaLavanderiaMobile
                  : {}),
              }}
            >
              <div style={s.bienvenidaTexto}>
                <span
                  style={{
                    ...s.heroTag,
                    ...(esMovil
                      ? s.heroTagLavanderiaMobile
                      : {}),
                  }}
                >
                  OPERACIÓN DE HOY
                </span>

                <h2
                  style={{
                    ...s.tituloLavanderia,
                    ...(esMovil
                      ? s.tituloLavanderiaMobile
                      : {}),
                  }}
                >
                  ¿Qué deseas hacer?
                </h2>

                <p
                  style={{
                    ...s.heroText,
                    ...(esMovil
                      ? s.heroTextLavanderiaMobile
                      : {}),
                  }}
                >
                  Registra pedidos, consulta estados, revisa caja
                  e historial desde el teléfono.
                </p>
              </div>

              <div
                style={{
                  ...s.ilustracionLavanderia,
                  ...(esMovil
                    ? s.ilustracionLavanderiaMobile
                    : {}),
                }}
              >
                <IlustracionLavanderia />
              </div>
            </section>

            <section
              style={{
                ...s.accesosGrid,
                ...(esMovil
                  ? s.accesosGridMobile
                  : {}),
              }}
            >
              {accesosRapidos.map((item) => (
                <button
                  key={item.codigo}
                  type="button"
                  aria-label={`Abrir ${item.nombre}`}
                  onClick={() =>
                    router.push(item.ruta)
                  }
                  style={s.accesoCard}
                >
                  <span style={s.accesoIcono}>
                    <IconoAcceso tipo={item.icono} />
                  </span>

                  <strong style={s.accesoTitulo}>
                    {item.nombre}
                  </strong>

                  <span style={s.accesoTexto}>
                    Abrir módulo
                  </span>
                </button>
              ))}
            </section>
          </>
        ) : esGimnasio ? (
          <DashboardGimnasio
            empresaNombre={empresaNombre}
            resumen={resumenGimnasio}
            alumnos={alumnosGimnasio}
            cargandoResumen={
              cargandoResumenGimnasio
            }
            avisoResumen={
              avisoResumenGimnasio
            }
            esMovil={esMovil}
            onNavigate={(ruta) =>
              router.push(ruta)
            }
          />
        ) : (
          <>
            <section
              style={{
                ...s.heroGrid,
                ...(esMovil
                  ? s.heroGridMobile
                  : {}),
              }}
            >
              <article
                style={{
                  ...s.heroMain,
                  ...(esMovil
                    ? s.heroMainMobile
                    : {}),
                }}
              >
                <div style={s.heroAccent} />

                <div style={s.heroContent}>
                  <span style={s.heroTag}>
                    RESUMEN GENERAL
                  </span>

                  <h2
                    style={{
                      ...s.heroTitle,
                      ...(esMovil
                        ? s.heroTitleMobile
                        : {}),
                    }}
                  >
                    Control total de tu negocio
                  </h2>

                  <p style={s.heroText}>
                    Consulta la información
                    principal de {empresaNombre},
                    organiza el acceso por
                    funciones y mantén cada área
                    bajo control.
                  </p>
                </div>

                <div
                  style={{
                    ...s.heroBadge,
                    ...(esMovil
                      ? s.heroBadgeMobile
                      : {}),
                  }}
                >
                  <span style={s.heroBadgeLabel}>
                    TIPO DE NEGOCIO
                  </span>

                  <strong style={s.heroBadgeValue}>
                    {tipoNegocio ||
                      "No definido"}
                  </strong>
                </div>
              </article>

              <article
                style={{
                  ...s.planPanel,
                  ...(esMovil
                    ? s.planPanelMobile
                    : {}),
                }}
              >
                <div style={s.planTop}>
                  <span style={s.planLabel}>
                    {pruebaActiva
                      ? "PLAN EN PRUEBA"
                      : "PLAN ACTUAL"}
                  </span>

                  <span style={s.planStatus}>
                    <span style={s.greenDot} />

                    {pruebaActiva
                      ? "Prueba activa"
                      : pendienteInicio
                      ? "Pendiente de inicio"
                      : estadoPlan || "Activo"}
                  </span>
                </div>

                <strong style={s.planName}>
                  {planNombre}
                </strong>

                <div style={s.planDivider} />

                <div style={s.planFooter}>
                  <div>
                    <span style={s.planSmall}>
                      Funciones disponibles
                    </span>

                    <strong style={s.planCount}>
                      {modulosMenu.length}
                    </strong>
                  </div>

                  <div style={s.planSeal}>K</div>
                </div>
              </article>
            </section>

            <section
              style={{
                ...s.bottomGrid,
                ...(esMovil
                  ? s.bottomGridMobile
                  : {}),
              }}
            >
              <Info
                titulo="ACCESO ACTUAL"
                valor={
                  usuarioRol || "Sin rol"
                }
                icono="🛡️"
                detalle="Nivel de acceso asignado a este usuario."
              />

              <Info
                titulo="TIPO DE NEGOCIO"
                valor={
                  tipoNegocio ||
                  "No definido"
                }
                icono="🏢"
                detalle="Configuración aplicada a esta empresa."
              />

              <Info
                titulo="FUNCIONES ACTIVAS"
                valor={String(
                  modulosMenu.length
                )}
                icono="▦"
                detalle="Módulos habilitados para este acceso."
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function DashboardGimnasio({
  empresaNombre,
  resumen,
  alumnos,
  cargandoResumen,
  avisoResumen,
  esMovil,
  onNavigate,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [
    alumnoSeleccionadoId,
    setAlumnoSeleccionadoId,
  ] = useState("");
  const [
    mostrarResultados,
    setMostrarResultados,
  ] = useState(false);
  const [
    menuAccionesAbierto,
    setMenuAccionesAbierto,
  ] = useState(false);

  const alumnoSeleccionado = useMemo(
    () =>
      alumnos.find(
        (alumno) =>
          String(alumno.id) ===
          String(alumnoSeleccionadoId)
      ) || null,
    [alumnos, alumnoSeleccionadoId]
  );

  const resultadosBusqueda = useMemo(() => {
    const texto = normalizar(busqueda);

    if (!texto) return [];

    return alumnos
      .filter((alumno) =>
        alumno.textoBusqueda.includes(texto)
      )
      .slice(0, 7);
  }, [alumnos, busqueda]);

  const alumnosAtencion = useMemo(() => {
    const prioridad = {
      vencida: 0,
      por_vencer: 1,
      sin_membresia: 2,
      suspendida: 3,
    };

    return alumnos
      .filter((alumno) =>
        Object.prototype.hasOwnProperty.call(
          prioridad,
          alumno.estadoCodigo
        )
      )
      .sort((a, b) => {
        const prioridadA =
          prioridad[a.estadoCodigo] ?? 99;
        const prioridadB =
          prioridad[b.estadoCodigo] ?? 99;

        if (prioridadA !== prioridadB) {
          return prioridadA - prioridadB;
        }

        return (
          (a.diasVencimiento ?? 9999) -
          (b.diasVencimiento ?? 9999)
        );
      })
      .slice(0, 6);
  }, [alumnos]);

  const accionInteligente = useMemo(
    () =>
      obtenerAccionInteligente(
        alumnoSeleccionado
      ),
    [alumnoSeleccionado]
  );

  useEffect(() => {
    if (
      alumnoSeleccionadoId &&
      !alumnos.some(
        (alumno) =>
          String(alumno.id) ===
          String(alumnoSeleccionadoId)
      )
    ) {
      setAlumnoSeleccionadoId("");
      setBusqueda("");
      setMenuAccionesAbierto(false);
    }
  }, [alumnos, alumnoSeleccionadoId]);

  function seleccionarAlumno(alumno) {
    setAlumnoSeleccionadoId(alumno.id);
    setBusqueda(alumno.nombre);
    setMostrarResultados(false);
    setMenuAccionesAbierto(false);
  }

  function limpiarSeleccion() {
    setAlumnoSeleccionadoId("");
    setBusqueda("");
    setMostrarResultados(false);
    setMenuAccionesAbierto(false);
  }

  function describirAtencion(alumno) {
    if (alumno.estadoCodigo === "vencida") {
      return alumno.fechaVencimiento
        ? `Venció el ${formatoFecha(
            alumno.fechaVencimiento
          )}`
        : "Membresía vencida";
    }

    if (alumno.estadoCodigo === "por_vencer") {
      return alumno.fechaVencimiento
        ? `Vence el ${formatoFecha(
            alumno.fechaVencimiento
          )}`
        : alumno.estadoEtiqueta;
    }

    if (
      alumno.estadoCodigo === "sin_membresia"
    ) {
      return "Todavía no tiene un plan activo";
    }

    return alumno.estadoEtiqueta;
  }

  const indicadores = [
    {
      titulo: "Alumnos activos",
      valor: resumen.alumnosActivos,
      detalle: "Personas habilitadas",
      icono: "👥",
      color: "#16834f",
      fondo: "#eaf8ef",
      ruta: "/clientes?estado=activo",
    },
    {
      titulo: "Membresías activas",
      valor: resumen.membresiasActivas,
      detalle: "Planes vigentes",
      icono: "▣",
      color: "#2867a9",
      fondo: "#edf5ff",
      ruta: "/suscripciones?filtro=activas",
    },
    {
      titulo: "Por vencer",
      valor: resumen.porVencer,
      detalle: "Próximos 7 días",
      icono: "◷",
      color: "#956400",
      fondo: "#fff8df",
      ruta: "/suscripciones?filtro=por_vencer",
    },
    {
      titulo: "Vencidas",
      valor: resumen.vencidas,
      detalle: "Requieren seguimiento",
      icono: "!",
      color: "#b42318",
      fondo: "#fff0ee",
      ruta: "/suscripciones?filtro=vencidas",
    },
  ];

  return (
    <>
      {avisoResumen && (
        <div style={s.gymAviso}>
          <strong style={s.gymAvisoIcono}>
            i
          </strong>
          <span>{avisoResumen}</span>
        </div>
      )}

      <section
        style={{
          ...s.gymIndicadores,
          ...(esMovil
            ? s.gymIndicadoresMobile
            : {}),
        }}
      >
        {indicadores.map((item) => (
          <button
            key={item.titulo}
            type="button"
            onClick={() =>
              onNavigate(item.ruta)
            }
            style={s.gymIndicador}
          >
            <div
              style={{
                ...s.gymIndicadorIcono,
                color: item.color,
                background: item.fondo,
              }}
            >
              {item.icono}
            </div>

            <div style={s.gymIndicadorContenido}>
              <span style={s.gymIndicadorEtiqueta}>
                {item.titulo}
              </span>

              <strong style={s.gymIndicadorValor}>
                {cargandoResumen
                  ? "…"
                  : item.valor}
              </strong>

              <p style={s.gymIndicadorDetalle}>
                {item.detalle}
              </p>
            </div>
          </button>
        ))}
      </section>

      <section
        style={{
          ...s.gymHerramientaGrid,
          ...(esMovil
            ? s.gymHerramientaGridMobile
            : {}),
        }}
      >
        <article
          style={{
            ...s.gymPanelInteligente,
            ...(esMovil
              ? s.gymPanelMobile
              : {}),
          }}
        >
          <div style={s.gymPanelEncabezado}>
            <div>
              <span style={s.gymSubEtiqueta}>
                ACCIÓN INTELIGENTE
              </span>

              <h3 style={s.gymSubTitulo}>
                Busca al alumno
              </h3>
            </div>

            {alumnoSeleccionado && (
              <button
                type="button"
                onClick={limpiarSeleccion}
                style={s.gymBotonLimpiar}
              >
                Limpiar
              </button>
            )}
          </div>

          <div style={s.gymBuscadorContenedor}>
            <div style={s.gymBuscador}>
              <span style={s.gymBuscadorIcono}>
                ⌕
              </span>

              <input
                value={busqueda}
                onFocus={() =>
                  setMostrarResultados(true)
                }
                onChange={(event) => {
                  setBusqueda(event.target.value);
                  setMostrarResultados(true);

                  if (
                    alumnoSeleccionado &&
                    event.target.value !==
                      alumnoSeleccionado.nombre
                  ) {
                    setAlumnoSeleccionadoId("");
                    setMenuAccionesAbierto(false);
                  }
                }}
                placeholder="Nombre, teléfono o cédula..."
                style={s.gymBuscadorInput}
              />
            </div>

            {mostrarResultados &&
              busqueda.trim() &&
              !cargandoResumen && (
                <div style={s.gymResultados}>
                  {resultadosBusqueda.length > 0 ? (
                    resultadosBusqueda.map(
                      (alumno) => (
                        <button
                          key={alumno.id}
                          type="button"
                          onClick={() =>
                            seleccionarAlumno(
                              alumno
                            )
                          }
                          style={
                            s.gymResultadoItem
                          }
                        >
                          <span
                            style={
                              s.gymResultadoAvatar
                            }
                          >
                            {alumno.nombre
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <span
                            style={
                              s.gymResultadoTexto
                            }
                          >
                            <strong>
                              {alumno.nombre}
                            </strong>
                            <small>
                              {[
                                alumno.documento,
                                alumno.telefono,
                              ]
                                .filter(Boolean)
                                .join(" · ") ||
                                alumno.estadoEtiqueta}
                            </small>
                          </span>

                          <span
                            style={
                              s.gymResultadoEstado
                            }
                          >
                            {alumno.estadoEtiqueta}
                          </span>
                        </button>
                      )
                    )
                  ) : (
                    <div
                      style={s.gymSinResultados}
                    >
                      No se encontró ningún alumno.
                    </div>
                  )}
                </div>
              )}
          </div>

          {!alumnoSeleccionado ? (
            <div style={s.gymEstadoVacio}>
              <div style={s.gymEstadoVacioIcono}>
                👤
              </div>

              <div>
                <strong style={s.gymEstadoVacioTitulo}>
                  Selecciona un alumno para continuar
                </strong>

                <p style={s.gymEstadoVacioTexto}>
                  KONAX revisará su membresía y te
                  mostrará la acción correcta.
                </p>
              </div>

              <div
                style={{
                  ...s.gymAccionesIniciales,
                  ...(esMovil
                    ? s.gymAccionesInicialesMobile
                    : {}),
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    onNavigate("/clientes")
                  }
                  style={s.gymAccionNeutra}
                >
                  + Registrar alumno
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onNavigate(
                      "/gimnasio/check-in"
                    )
                  }
                  style={s.gymAccionNeutra}
                >
                  Abrir check-in
                </button>
              </div>
            </div>
          ) : (
            <div style={s.gymFichaAlumno}>
              <div style={s.gymFichaSuperior}>
                <div style={s.gymAlumnoIdentidad}>
                  <span style={s.gymAlumnoAvatar}>
                    {alumnoSeleccionado.nombre
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <div>
                    <h4 style={s.gymAlumnoNombre}>
                      {alumnoSeleccionado.nombre}
                    </h4>

                    <p style={s.gymAlumnoContacto}>
                      {[
                        alumnoSeleccionado.documento,
                        alumnoSeleccionado.telefono,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        "Sin documento o teléfono registrado"}
                    </p>
                  </div>
                </div>

                <EstadoMembresia
                  codigo={
                    alumnoSeleccionado.estadoCodigo
                  }
                  etiqueta={
                    alumnoSeleccionado.estadoEtiqueta
                  }
                />
              </div>

              <div style={s.gymDatosMembresia}>
                <DatoAlumno
                  etiqueta="Plan"
                  valor={
                    alumnoSeleccionado.planNombre
                  }
                />

                <DatoAlumno
                  etiqueta="Vencimiento"
                  valor={
                    alumnoSeleccionado.fechaVencimiento
                      ? formatoFecha(
                          alumnoSeleccionado.fechaVencimiento
                        )
                      : "Sin fecha"
                  }
                />

                <DatoAlumno
                  etiqueta="Saldo"
                  valor={`$${alumnoSeleccionado.saldoPendiente.toFixed(
                    2
                  )}`}
                />
              </div>

              <div
                style={{
                  ...s.gymAccionesAlumno,
                  ...(esMovil
                    ? s.gymAccionesAlumnoMobile
                    : {}),
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(
                      accionInteligente.ruta
                    )
                  }
                  style={
                    s.gymBotonInteligente
                  }
                >
                  <span
                    style={
                      s.gymBotonInteligenteIcono
                    }
                  >
                    {accionInteligente.icono}
                  </span>

                  <span>
                    <strong>
                      {
                        accionInteligente.etiqueta
                      }
                    </strong>
                    <small>
                      {
                        accionInteligente.detalle
                      }
                    </small>
                  </span>
                </button>

                <div style={s.gymMasAcciones}>
                  <button
                    type="button"
                    onClick={() =>
                      setMenuAccionesAbierto(
                        (actual) => !actual
                      )
                    }
                    style={s.gymBotonMas}
                  >
                    Más acciones{" "}
                    {menuAccionesAbierto
                      ? "▲"
                      : "▼"}
                  </button>

                  {menuAccionesAbierto && (
                    <div style={s.gymMenuAcciones}>
                      <button
                        type="button"
                        style={s.gymMenuAccionItem}
                        onClick={() =>
                          onNavigate(
                            crearRutaAlumno(
                              "/clientes",
                              alumnoSeleccionado.id
                            )
                          )
                        }
                      >
                        Ver ficha del alumno
                      </button>

                      <button
                        type="button"
                        style={s.gymMenuAccionItem}
                        onClick={() =>
                          onNavigate(
                            crearRutaAlumno(
                              "/suscripciones",
                              alumnoSeleccionado.id,
                              {
                                modo: "nueva",
                                origen: "dashboard",
                              }
                            )
                          )
                        }
                      >
                        Ver o cambiar membresía
                      </button>

                      <button
                        type="button"
                        style={s.gymMenuAccionItem}
                        onClick={() =>
                          onNavigate(
                            crearRutaAlumno(
                              "/caja",
                              alumnoSeleccionado.id,
                              {
                                suscripcionId:
                                  alumnoSeleccionado.membresia?.id ||
                                  "",
                                cuentaId:
                                  alumnoSeleccionado.membresia
                                    ?.informacion_comercial_id ||
                                  "",
                                flujo:
                                  alumnoSeleccionado.membresia
                                    ? "renovacion"
                                    : "otro_pago",
                                origen: "dashboard",
                              }
                            )
                          )
                        }
                      >
                        Registrar otro pago
                      </button>

                      <button
                        type="button"
                        style={s.gymMenuAccionItem}
                        onClick={() =>
                          onNavigate(
                            crearRutaAlumno(
                              "/vista-cliente",
                              alumnoSeleccionado.id
                            )
                          )
                        }
                      >
                        Consultar historial
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </article>

        <aside
          style={{
            ...s.gymPanelAtencion,
            ...(esMovil
              ? s.gymPanelMobile
              : {}),
          }}
        >
          <span style={s.gymSubEtiqueta}>
            SEGUIMIENTO
          </span>

          <h3 style={s.gymSubTitulo}>
            Alumnos que requieren atención
          </h3>

          <p style={s.gymPanelDescripcion}>
            Selecciona una persona para revisar su
            situación y ejecutar la acción
            correspondiente.
          </p>

          <div style={s.gymListaAtencion}>
            {cargandoResumen ? (
              <div style={s.gymListaVacia}>
                Cargando alumnos...
              </div>
            ) : alumnosAtencion.length > 0 ? (
              alumnosAtencion.map((alumno) => (
                <button
                  key={alumno.id}
                  type="button"
                  onClick={() =>
                    seleccionarAlumno(alumno)
                  }
                  style={s.gymAtencionItem}
                >
                  <span style={s.gymAtencionAvatar}>
                    {alumno.nombre
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <span style={s.gymAtencionTexto}>
                    <strong>{alumno.nombre}</strong>
                    <small>
                      {describirAtencion(alumno)}
                    </small>
                  </span>

                  <span style={s.gymAtencionFlecha}>
                    →
                  </span>
                </button>
              ))
            ) : (
              <div style={s.gymListaVacia}>
                <span>✓</span>
                <strong>
                  No hay alumnos que requieran
                  atención inmediata.
                </strong>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              onNavigate("/suscripciones")
            }
            style={s.gymVerTodas}
          >
            Ver membresías activas
          </button>
        </aside>
      </section>
    </>
  );
}

function EstadoMembresia({
  codigo,
  etiqueta,
}) {
  const estilos = {
    activa: {
      color: "#166534",
      fondo: "#dcfce7",
    },
    por_vencer: {
      color: "#92400e",
      fondo: "#fef3c7",
    },
    vencida: {
      color: "#b42318",
      fondo: "#fee2e2",
    },
    sin_membresia: {
      color: "#475569",
      fondo: "#e2e8f0",
    },
    suspendida: {
      color: "#6b21a8",
      fondo: "#f3e8ff",
    },
    alumno_inactivo: {
      color: "#475569",
      fondo: "#e2e8f0",
    },
  };

  const estilo =
    estilos[codigo] || estilos.sin_membresia;

  return (
    <span
      style={{
        ...s.gymEstadoBadge,
        color: estilo.color,
        background: estilo.fondo,
      }}
    >
      {etiqueta}
    </span>
  );
}

function DatoAlumno({ etiqueta, valor }) {
  return (
    <div style={s.gymDatoAlumno}>
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function IlustracionLavanderia() {
  return (
    <svg
      viewBox="0 0 360 230"
      width="100%"
      height="100%"
      role="img"
      aria-label="Lavadora y canasta de ropa"
    >
      <defs>
        <linearGradient id="washerBody" x1="0" x2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8efea" />
        </linearGradient>

        <linearGradient id="basket" x1="0" x2="1">
          <stop offset="0%" stopColor="#2e9d5b" />
          <stop offset="100%" stopColor="#14703f" />
        </linearGradient>

        <radialGradient id="door" cx="50%" cy="45%">
          <stop offset="0%" stopColor="#6f8997" />
          <stop offset="65%" stopColor="#22313a" />
          <stop offset="100%" stopColor="#111a20" />
        </radialGradient>

        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="8"
            floodColor="#173c2a"
            floodOpacity=".18"
          />
        </filter>
      </defs>

      <g filter="url(#softShadow)">
        <rect
          x="205"
          y="32"
          width="122"
          height="166"
          rx="12"
          fill="url(#washerBody)"
          stroke="#cfd9d2"
          strokeWidth="3"
        />
        <rect
          x="215"
          y="43"
          width="102"
          height="28"
          rx="5"
          fill="#f7faf8"
          stroke="#d6dfd9"
        />
        <circle cx="228" cy="57" r="5" fill="#8aa299" />
        <circle cx="247" cy="57" r="5" fill="#8aa299" />
        <rect
          x="273"
          y="51"
          width="30"
          height="11"
          rx="3"
          fill="#173c2a"
        />
        <circle
          cx="266"
          cy="128"
          r="48"
          fill="#e8efeb"
          stroke="#cad6cf"
          strokeWidth="5"
        />
        <circle
          cx="266"
          cy="128"
          r="38"
          fill="url(#door)"
        />
        <ellipse
          cx="255"
          cy="115"
          rx="15"
          ry="10"
          fill="rgba(255,255,255,.18)"
        />

        <g transform="translate(72 120)">
          <path
            d="M0 20 L112 20 L98 92 L14 92 Z"
            fill="url(#basket)"
            stroke="#0f5f35"
            strokeWidth="3"
          />
          <rect
            x="-6"
            y="14"
            width="124"
            height="16"
            rx="8"
            fill="#1a7e47"
          />
          <g
            stroke="#b9e7ca"
            strokeWidth="4"
            opacity=".65"
          >
            <line x1="21" y1="39" x2="19" y2="73" />
            <line x1="43" y1="39" x2="42" y2="76" />
            <line x1="66" y1="39" x2="66" y2="76" />
            <line x1="89" y1="39" x2="91" y2="73" />
          </g>
          <path
            d="M20 11 Q39 -8 61 11"
            fill="none"
            stroke="#f4f7f5"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M49 10 Q70 -13 94 8"
            fill="none"
            stroke="#2f8b55"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M69 12 Q86 -4 105 10"
            fill="none"
            stroke="#d7efe0"
            strokeWidth="13"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}

function IconoAcceso({ tipo }) {
  const propiedades = {
    width: 40,
    height: 40,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (tipo === "nuevo") {
    return (
      <svg {...propiedades}>
        <rect x="7" y="7" width="34" height="34" rx="9" />
        <path d="M24 15v18M15 24h18" />
      </svg>
    );
  }

  if (tipo === "pedidos") {
    return (
      <svg {...propiedades}>
        <rect x="10" y="8" width="28" height="34" rx="6" />
        <path d="M18 8.5V6h12v2.5" />
        <path d="M17 18h14M17 25h14M17 32h9" />
        <circle cx="14" cy="18" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="25" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="32" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (tipo === "caja") {
    return (
      <svg {...propiedades}>
        <rect x="6" y="13" width="36" height="25" rx="6" />
        <path d="M6 20h36" />
        <path d="M29 27h8" />
        <circle cx="19" cy="29" r="6" />
        <path d="M19 25.5v7M16.8 27.2c.8-1 3.6-1.2 4.4.2.8 1.5-.7 2.2-2.2 2.4-1.6.2-2.9 1-2.2 2.3.7 1.4 3.6 1.2 4.5.1" />
      </svg>
    );
  }

  return (
    <svg {...propiedades}>
      <circle cx="24" cy="24" r="16" />
      <path d="M24 15v10l7 4" />
      <path d="M13 9H8v5" />
      <path d="M8.5 14A19 19 0 0 1 24 5" />
    </svg>
  );
}

function Info({
  titulo,
  valor,
  icono,
  detalle,
}) {
  return (
    <article style={s.infoCard}>
      <div style={s.infoTop}>
        <div style={s.infoIcon}>{icono}</div>
        <span style={s.infoLabel}>
          {titulo}
        </span>
      </div>

      <h3 style={s.infoTitle}>{valor}</h3>
      <p style={s.infoText}>{detalle}</p>
    </article>
  );
}

const s = {
  layout: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns:
      "220px minmax(0,1fr)",
    background: "#f3f6f4",
    color: "#142019",
    fontFamily:
      'Inter, system-ui, "Segoe UI", sans-serif',
  },

  loading: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "#f3f6f4",
    fontFamily:
      'Inter, system-ui, "Segoe UI", sans-serif',
  },

  loadingLogo: {
    width: 210,
    marginBottom: 10,
  },

  loadingTitle: {
    fontSize: 22,
  },

  loadingText: {
    color: "#718078",
    fontSize: 14,
  },

  main: {
    minWidth: 0,
    padding: "30px 34px 44px",
    background:
      "linear-gradient(180deg,#f8faf9 0%,#f1f5f2 100%)",
  },

  topbar: {
    maxWidth: 1440,
    margin: "0 auto 24px",
    paddingBottom: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    borderBottom:
      "1px solid #dfe7e2",
  },

  eyebrow: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.5,
  },

  pageTitle: {
    margin: 0,
    fontSize:
      "clamp(25px,3vw,34px)",
    lineHeight: 1.1,
    letterSpacing: "-0.6px",
  },

  pageSubtitle: {
    display: "block",
    marginTop: 7,
    color: "#7a867f",
    fontSize: 12,
    textTransform: "capitalize",
  },

  topbarGymImagenWrap: {
    width: 170,
    height: 94,
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },

  topbarGymCirculo: {
    position: "absolute",
    bottom: -62,
    width: 168,
    height: 168,
    borderRadius: "50%",
    background:
      "linear-gradient(145deg,#d9f0e1,#a9dfbc)",
    opacity: 0.9,
  },

  topbarGymImagen: {
    width: "auto",
    height: 112,
    position: "relative",
    zIndex: 2,
    objectFit: "contain",
    objectPosition: "center bottom",
    filter:
      "drop-shadow(0 8px 10px rgba(21,74,44,.15))",
  },

  userBox: {
    minWidth: 180,
    padding: "9px 12px",
    display: "flex",
    alignItems: "center",
    gap: 11,
    border: "1px solid #dfe7e2",
    borderRadius: 14,
    background: "#fff",
  },

  avatar: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#173c2a",
    color: "#fff",
    fontWeight: 900,
  },

  userName: {
    display: "block",
    fontSize: 13,
  },

  userRole: {
    display: "block",
    marginTop: 2,
    color: "#7d8a82",
    fontSize: 11,
  },

  avisoPendiente: {
    maxWidth: 1440,
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns:
      "48px 1fr",
    gap: 14,
    padding: 17,
    border: "1px solid #e3c868",
    borderRadius: 16,
    background: "#fff9df",
  },

  avisoPrueba: {
    maxWidth: 1440,
    margin: "0 auto 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    padding: 17,
    border: "1px solid #9ed5b5",
    borderRadius: 16,
    background: "#ecf9f1",
  },

  avisoCritico: {
    borderColor: "#efb1aa",
    background: "#fff0ee",
  },

  avisoIzquierda: {
    display: "grid",
    gridTemplateColumns:
      "48px 1fr",
    alignItems: "center",
    gap: 14,
  },

  avisoIcono: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#fff",
    fontSize: 22,
  },

  avisoEtiqueta: {
    display: "block",
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  avisoTitulo: {
    display: "block",
    marginTop: 4,
    fontSize: 15,
  },

  avisoTexto: {
    margin: "4px 0 0",
    color: "#657169",
    fontSize: 12,
  },

  diasCaja: {
    minWidth: 110,
    padding: 11,
    borderRadius: 13,
    background: "#fff",
    textAlign: "center",
  },

  diasNumero: {
    display: "block",
    color: "#173c2a",
    fontSize: 28,
  },

  diasTexto: {
    display: "block",
    color: "#6f7c74",
    fontSize: 10,
    fontWeight: 800,
  },

  gymHeroCompacto: {
    maxWidth: 1440,
    minHeight: 150,
    margin: "0 auto 16px",
    padding: "18px 24px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) minmax(250px,330px)",
    alignItems: "center",
    gap: 20,
    border: "1px solid #dce9e1",
    borderRadius: 22,
    background:
      "linear-gradient(135deg,#ffffff 0%,#f4faf6 62%,#e7f5ec 100%)",
    color: "#15261c",
    overflow: "hidden",
    boxShadow:
      "0 12px 30px rgba(17,60,38,.08)",
  },

  gymHeroCompactoContenido: {
    minWidth: 0,
    paddingLeft: 4,
  },

  gymEtiquetaCompacta: {
    display: "inline-flex",
    padding: "6px 10px",
    border: "1px solid #cbe2d3",
    borderRadius: 999,
    background: "#ecf8f0",
    color: "#157744",
    fontSize: 9,
    fontWeight: 950,
    letterSpacing: 1.2,
  },

  gymNombreEmpresa: {
    margin: "10px 0 6px",
    color: "#13251a",
    fontSize: "clamp(28px,3.1vw,42px)",
    lineHeight: 1.02,
    letterSpacing: "-1px",
  },

  gymDescripcionCompacta: {
    maxWidth: 620,
    margin: 0,
    color: "#607067",
    fontSize: 13,
    lineHeight: 1.55,
  },

  gymImagenWrap: {
    minHeight: 118,
    height: 132,
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    overflow: "visible",
  },

  gymCirculoDecorativo: {
    position: "absolute",
    right: 18,
    bottom: -72,
    width: 235,
    height: 235,
    borderRadius: "50%",
    background:
      "linear-gradient(145deg,#d8f0e1,#a9dfbc)",
    opacity: 0.78,
  },

  gymImagenFitness: {
    width: "auto",
    height: 190,
    position: "relative",
    zIndex: 2,
    objectFit: "contain",
    objectPosition: "center bottom",
    filter:
      "drop-shadow(0 14px 15px rgba(21,74,44,.16))",
  },

  gymHero: {
    maxWidth: 1440,
    minHeight: 220,
    margin: "0 auto 18px",
    padding: "30px 34px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1.5fr) minmax(220px,.5fr)",
    alignItems: "center",
    gap: 24,
    borderRadius: 24,
    background:
      "linear-gradient(135deg,#102b1d 0%,#174d30 62%,#1d7044 100%)",
    color: "#fff",
    overflow: "hidden",
    boxShadow:
      "0 18px 44px rgba(17,60,38,.14)",
  },

  gymHeroContenido: {
    maxWidth: 760,
  },

  gymEtiqueta: {
    display: "inline-flex",
    padding: "7px 11px",
    border: "1px solid rgba(255,255,255,.16)",
    borderRadius: 999,
    background: "rgba(255,255,255,.08)",
    color: "#b7edcc",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.35,
  },

  gymTitulo: {
    margin: "16px 0 12px",
    maxWidth: 760,
    fontSize:
      "clamp(34px,4vw,54px)",
    lineHeight: 1.02,
    letterSpacing: "-1.5px",
  },

  gymDescripcion: {
    maxWidth: 670,
    margin: 0,
    color: "#d7eadf",
    fontSize: 14,
    lineHeight: 1.65,
  },

  gymVisual: {
    minHeight: 160,
    position: "relative",
    display: "grid",
    placeItems: "center",
  },

  gymPesa: {
    display: "flex",
    alignItems: "center",
    transform: "scale(.92)",
    filter:
      "drop-shadow(0 16px 16px rgba(4,20,11,.25))",
  },

  gymBarra: {
    width: 112,
    height: 20,
    background:
      "linear-gradient(180deg,#e7eee9,#8fa49a)",
    borderRadius: 999,
  },

  gymDiscoGrande: {
    width: 32,
    height: 82,
    borderRadius: 10,
    background: "#10291c",
  },

  gymDiscoPequeno: {
    width: 25,
    height: 61,
    borderRadius: 9,
    background:
      "linear-gradient(180deg,#56d98c,#16834f)",
  },

  gymSello: {
    position: "absolute",
    right: 10,
    bottom: 0,
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 17,
    background: "rgba(255,255,255,.08)",
    color: "#8ae6af",
    fontSize: 24,
    fontWeight: 950,
  },

  gymAviso: {
    maxWidth: 1440,
    margin: "0 auto 16px",
    padding: "12px 14px",
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    border: "1px solid #c9dfd2",
    borderRadius: 13,
    background: "#f3faf6",
    color: "#4e6257",
    fontSize: 12,
    lineHeight: 1.5,
  },

  gymAvisoIcono: {
    width: 22,
    height: 22,
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#16834f",
    color: "#fff",
  },

  gymIndicadores: {
    maxWidth: 1440,
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: 12,
  },

  gymIndicador: {
    minHeight: 126,
    padding: 17,
    display: "grid",
    gridTemplateColumns:
      "46px minmax(0,1fr)",
    alignItems: "start",
    gap: 12,
    appearance: "none",
    border: "1px solid #dfe7e2",
    borderRadius: 17,
    background: "#fff",
    color: "#142019",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow:
      "0 9px 22px rgba(24,54,37,.05)",
  },

  gymIndicadorIcono: {
    width: 46,
    height: 46,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    fontSize: 20,
    fontWeight: 900,
  },

  gymIndicadorContenido: {
    minWidth: 0,
  },

  gymIndicadorEtiqueta: {
    display: "block",
    color: "#6e7d74",
    fontSize: 10,
    fontWeight: 800,
  },

  gymIndicadorValor: {
    display: "block",
    marginTop: 5,
    color: "#142019",
    fontSize: 29,
    lineHeight: 1,
  },

  gymIndicadorDetalle: {
    margin: "7px 0 0",
    color: "#839087",
    fontSize: 10,
    lineHeight: 1.35,
  },

  gymHerramientaGrid: {
    maxWidth: 1440,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1.5fr) minmax(300px,.65fr)",
    gap: 16,
    alignItems: "start",
  },

  gymPanelInteligente: {
    minHeight: 420,
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background: "#fff",
    boxShadow:
      "0 10px 28px rgba(24,54,37,.05)",
  },

  gymPanelAtencion: {
    minHeight: 420,
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background:
      "linear-gradient(180deg,#ffffff 0%,#f4f8f5 100%)",
  },

  gymPanelEncabezado: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },

  gymSubEtiqueta: {
    display: "block",
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  gymSubTitulo: {
    margin: "5px 0 14px",
    color: "#142019",
    fontSize: 22,
  },

  gymPanelDescripcion: {
    margin: "-4px 0 14px",
    color: "#748078",
    fontSize: 12,
    lineHeight: 1.5,
  },

  gymBotonLimpiar: {
    minHeight: 36,
    padding: "8px 11px",
    border: "1px solid #d7e0da",
    borderRadius: 10,
    background: "#f8faf9",
    color: "#536158",
    fontWeight: 800,
    cursor: "pointer",
  },

  gymBuscadorContenedor: {
    position: "relative",
    zIndex: 12,
  },

  gymBuscador: {
    minHeight: 54,
    padding: "0 14px",
    display: "grid",
    gridTemplateColumns: "28px minmax(0,1fr)",
    alignItems: "center",
    gap: 8,
    border: "2px solid #b9dcc7",
    borderRadius: 15,
    background: "#fbfefc",
  },

  gymBuscadorIcono: {
    color: "#16834f",
    fontSize: 24,
    lineHeight: 1,
  },

  gymBuscadorInput: {
    width: "100%",
    minWidth: 0,
    height: 50,
    border: 0,
    outline: "none",
    background: "transparent",
    color: "#142019",
    fontFamily: "inherit",
    fontSize: 15,
  },

  gymResultados: {
    position: "absolute",
    top: "calc(100% + 7px)",
    left: 0,
    right: 0,
    maxHeight: 330,
    overflowY: "auto",
    padding: 7,
    display: "grid",
    gap: 5,
    border: "1px solid #d7e0da",
    borderRadius: 14,
    background: "#fff",
    boxShadow:
      "0 18px 44px rgba(15,23,42,.16)",
  },

  gymResultadoItem: {
    width: "100%",
    minHeight: 58,
    padding: 9,
    display: "grid",
    gridTemplateColumns:
      "38px minmax(0,1fr) auto",
    alignItems: "center",
    gap: 10,
    border: 0,
    borderRadius: 10,
    background: "#fff",
    color: "#142019",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "pointer",
  },

  gymResultadoAvatar: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#eaf8ef",
    color: "#16834f",
    fontWeight: 900,
  },

  gymResultadoTexto: {
    minWidth: 0,
    display: "grid",
    gap: 3,
  },

  gymResultadoEstado: {
    maxWidth: 120,
    color: "#66736b",
    fontSize: 9,
    fontWeight: 800,
    textAlign: "right",
  },

  gymSinResultados: {
    padding: 16,
    color: "#748078",
    fontSize: 12,
    textAlign: "center",
  },

  gymEstadoVacio: {
    minHeight: 250,
    marginTop: 16,
    padding: 24,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 10,
    border: "1px dashed #cfdcd4",
    borderRadius: 17,
    background: "#f8fbf9",
    textAlign: "center",
  },

  gymEstadoVacioIcono: {
    width: 56,
    height: 56,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#eaf8ef",
    fontSize: 25,
  },

  gymEstadoVacioTitulo: {
    display: "block",
    fontSize: 16,
  },

  gymEstadoVacioTexto: {
    maxWidth: 440,
    margin: "6px auto 0",
    color: "#748078",
    fontSize: 12,
    lineHeight: 1.5,
  },

  gymAccionesIniciales: {
    marginTop: 7,
    display: "flex",
    justifyContent: "center",
    gap: 9,
    flexWrap: "wrap",
  },

  gymAccionNeutra: {
    minHeight: 42,
    padding: "9px 14px",
    border: "1px solid #c9d8cf",
    borderRadius: 11,
    background: "#fff",
    color: "#173c2a",
    fontWeight: 850,
    cursor: "pointer",
  },

  gymFichaAlumno: {
    marginTop: 16,
    padding: 20,
    border: "1px solid #dbe5df",
    borderRadius: 18,
    background:
      "linear-gradient(180deg,#ffffff 0%,#f8fbf9 100%)",
  },

  gymFichaSuperior: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },

  gymAlumnoIdentidad: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  gymAlumnoAvatar: {
    width: 52,
    height: 52,
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#173c2a",
    color: "#fff",
    fontSize: 20,
    fontWeight: 900,
  },

  gymAlumnoNombre: {
    margin: 0,
    color: "#142019",
    fontSize: 20,
  },

  gymAlumnoContacto: {
    margin: "5px 0 0",
    color: "#748078",
    fontSize: 11,
    lineHeight: 1.4,
  },

  gymEstadoBadge: {
    flex: "0 0 auto",
    padding: "8px 10px",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  gymDatosMembresia: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: 10,
  },

  gymDatoAlumno: {
    padding: 13,
    display: "grid",
    gap: 5,
    border: "1px solid #e0e7e3",
    borderRadius: 13,
    background: "#fff",
  },

  gymAccionesAlumno: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) auto",
    alignItems: "stretch",
    gap: 10,
  },

  gymBotonInteligente: {
    minHeight: 66,
    padding: "11px 15px",
    display: "grid",
    gridTemplateColumns:
      "42px minmax(0,1fr)",
    alignItems: "center",
    gap: 11,
    border: 0,
    borderRadius: 14,
    background:
      "linear-gradient(135deg,#16834f,#0f6a3d)",
    color: "#fff",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow:
      "0 12px 24px rgba(22,131,79,.2)",
  },

  gymBotonInteligenteIcono: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "rgba(255,255,255,.14)",
    fontSize: 20,
    fontWeight: 900,
  },

  gymMasAcciones: {
    position: "relative",
    display: "grid",
  },

  gymBotonMas: {
    minWidth: 145,
    minHeight: 66,
    padding: "10px 14px",
    border: "1px solid #ccd8d1",
    borderRadius: 14,
    background: "#fff",
    color: "#173c2a",
    fontWeight: 850,
    cursor: "pointer",
  },

  gymMenuAcciones: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 7px)",
    zIndex: 20,
    width: 230,
    padding: 7,
    display: "grid",
    gap: 4,
    border: "1px solid #d7e0da",
    borderRadius: 13,
    background: "#fff",
    boxShadow:
      "0 18px 44px rgba(15,23,42,.16)",
  },

  gymMenuAccionItem: {
    minHeight: 40,
    padding: "9px 10px",
    border: 0,
    borderRadius: 9,
    background: "#fff",
    color: "#213028",
    textAlign: "left",
    fontFamily: "inherit",
    fontWeight: 750,
    cursor: "pointer",
  },

  gymListaAtencion: {
    display: "grid",
    gap: 7,
  },

  gymAtencionItem: {
    width: "100%",
    minHeight: 60,
    padding: 10,
    display: "grid",
    gridTemplateColumns:
      "38px minmax(0,1fr) auto",
    alignItems: "center",
    gap: 9,
    border: "1px solid #e1e8e4",
    borderRadius: 12,
    background: "#fff",
    color: "#142019",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "pointer",
  },

  gymAtencionAvatar: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#fff3df",
    color: "#956400",
    fontWeight: 900,
  },

  gymAtencionTexto: {
    minWidth: 0,
    display: "grid",
    gap: 4,
  },

  gymAtencionFlecha: {
    color: "#16834f",
    fontSize: 19,
    fontWeight: 900,
  },

  gymListaVacia: {
    minHeight: 150,
    padding: 20,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 8,
    border: "1px dashed #cfdcd4",
    borderRadius: 14,
    background: "#f8fbf9",
    color: "#607067",
    textAlign: "center",
    fontSize: 12,
  },

  gymVerTodas: {
    width: "100%",
    minHeight: 42,
    marginTop: 12,
    padding: "9px 12px",
    border: "1px solid #c9d8cf",
    borderRadius: 11,
    background: "#fff",
    color: "#173c2a",
    fontWeight: 850,
    cursor: "pointer",
  },

  bienvenidaLavanderia: {
    maxWidth: 1440,
    margin: "0 auto 16px",
    padding: 24,
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) minmax(220px,360px)",
    alignItems: "center",
    gap: 18,
    borderRadius: 20,
    background:
      "linear-gradient(135deg,#ffffff,#edf8f1)",
    border: "1px solid #cfe7d8",
    overflow: "hidden",
  },

  bienvenidaTexto: {
    minWidth: 0,
  },

  ilustracionLavanderia: {
    width: "100%",
    minHeight: 190,
    display: "grid",
    placeItems: "center",
  },

  tituloLavanderia: {
    margin: "7px 0 9px",
    fontSize:
      "clamp(29px,4vw,42px)",
  },

  accesosGrid: {
    maxWidth: 1440,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(150px,1fr))",
    gap: 16,
  },

  accesoCard: {
    minHeight: 148,
    padding: "18px 12px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    appearance: "none",
    border: "1px solid #d9e2dd",
    borderRadius: 22,
    background:
      "linear-gradient(145deg,#ffffff 0%,#eef3f0 100%)",
    color: "#142019",
    textAlign: "center",
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow:
      "8px 10px 20px rgba(22,45,32,.12), -5px -5px 14px rgba(255,255,255,.96), inset 0 1px 0 rgba(255,255,255,.95)",
    WebkitTapHighlightColor: "transparent",
    position: "relative",
    overflow: "hidden",
    transition:
      "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
  },

  accesoIcono: {
    width: 72,
    height: 72,
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    border: "1px solid #dce5e0",
    borderRadius: 19,
    background:
      "linear-gradient(145deg,#ffffff 0%,#e7ece9 100%)",
    color: "#16834f",
    lineHeight: 1,
    boxShadow:
      "7px 9px 15px rgba(26,49,36,.17), -4px -4px 11px rgba(255,255,255,.98), inset 0 1px 0 rgba(255,255,255,.95)",
  },

  accesoTitulo: {
    display: "block",
    maxWidth: "100%",
    color: "#152119",
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1.18,
  },

  accesoTexto: {
    display: "none",
  },

  heroGrid: {
    maxWidth: 1440,
    margin: "0 auto 20px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1.7fr) minmax(280px,.75fr)",
    gap: 16,
  },

  heroMain: {
    minHeight: 240,
    position: "relative",
    overflow: "hidden",
    padding: "34px 34px 30px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) auto",
    alignItems: "end",
    gap: 24,
    border: "1px solid #dfe7e2",
    borderRadius: 22,
    background: "#ffffff",
    boxShadow:
      "0 14px 34px rgba(28,52,39,.07)",
  },

  heroAccent: {
    position: "absolute",
    inset: "0 auto 0 0",
    width: 8,
    background:
      "linear-gradient(180deg,#16a34a,#0f766e)",
  },

  heroContent: {
    maxWidth: 760,
  },

  heroTag: {
    display: "inline-flex",
    marginBottom: 14,
    padding: "7px 10px",
    borderRadius: 999,
    background: "#edf8f1",
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.3,
  },

  heroTitle: {
    margin: "0 0 13px",
    color: "#142019",
    fontSize:
      "clamp(34px,4vw,52px)",
    lineHeight: 1.02,
    letterSpacing: "-1.4px",
  },

  heroText: {
    maxWidth: 660,
    margin: 0,
    color: "#6c7971",
    fontSize: 15,
    lineHeight: 1.7,
  },

  heroBadge: {
    minWidth: 180,
    padding: 18,
    border: "1px solid #d7e7dc",
    borderRadius: 16,
    background: "#f6faf7",
  },

  heroBadgeLabel: {
    display: "block",
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  heroBadgeValue: {
    display: "block",
    marginTop: 9,
    color: "#173c2a",
    fontSize: 20,
  },

  planPanel: {
    minHeight: 240,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    border: "1px solid #173c2a",
    borderRadius: 22,
    background:
      "linear-gradient(160deg,#10231a 0%,#173c2a 100%)",
    boxShadow:
      "0 14px 34px rgba(17,48,31,.13)",
  },

  planTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  planLabel: {
    color: "#91d6af",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  planName: {
    display: "block",
    marginTop: 26,
    color: "#fff",
    fontSize: 27,
    lineHeight: 1.15,
  },

  planStatus: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    color: "#dff4e7",
    fontSize: 10,
    fontWeight: 700,
  },

  greenDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#52dd91",
  },

  planDivider: {
    height: 1,
    margin: "22px 0 18px",
    background:
      "rgba(255,255,255,.12)",
  },

  planFooter: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 18,
  },

  planSmall: {
    display: "block",
    color: "#b9d8c5",
    fontSize: 10,
  },

  planCount: {
    display: "block",
    marginTop: 6,
    color: "#fff",
    fontSize: 30,
  },

  planSeal: {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    border:
      "1px solid rgba(255,255,255,.14)",
    borderRadius: 16,
    background:
      "rgba(255,255,255,.07)",
    color: "#7de0a7",
    fontSize: 24,
    fontWeight: 900,
  },

  bottomGrid: {
    maxWidth: 1440,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: 14,
  },

  infoCard: {
    minHeight: 138,
    padding: 20,
    border: "1px solid #dfe7e2",
    borderRadius: 17,
    background: "#fff",
  },

  infoTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  infoIcon: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#edf6f0",
    fontSize: 18,
  },

  infoLabel: {
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1,
  },

  infoTitle: {
    margin: "16px 0 7px",
    fontSize: 21,
  },

  infoText: {
    margin: 0,
    color: "#748078",
    fontSize: 12,
    lineHeight: 1.5,
  },

  layoutMobile: {
    display: "block",
    width: "100%",
    overflowX: "hidden",
  },

  mainMobile: {
    width: "100%",
    maxWidth: "100%",
    padding: "14px 12px 30px",
    overflowX: "hidden",
  },

  mobileBar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    margin: "-14px -12px 16px",
    padding: "10px 24px 10px 14px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) auto",
    alignItems: "center",
    gap: 12,
    borderBottom:
      "1px solid #dfe7e2",
    background:
      "rgba(255,255,255,.96)",
    backdropFilter: "blur(10px)",
  },

  mobileLogo: {
    width: 145,
    maxWidth: "52vw",
    height: "auto",
    display: "block",
  },

  mobileMenuButton: {
    minWidth: 110,
    minHeight: 44,
    padding: "9px 16px",
    border:
      "1px solid rgba(255,255,255,.18)",
    borderRadius: 14,
    background:
      "linear-gradient(135deg,#173c2a 0%,#0f6a3d 100%)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
    whiteSpace: "nowrap",
    justifySelf: "end",
    marginRight: 4,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow:
      "0 10px 24px rgba(23,60,42,.18)",
  },

  hamburgerIcon: {
    fontSize: 21,
    lineHeight: 1,
    fontWeight: 900,
  },

  mobileMenu: {
    position: "fixed",
    top: 66,
    left: 10,
    right: 10,
    zIndex: 60,
    maxHeight:
      "calc(100vh - 78px)",
    overflowY: "auto",
    padding: 10,
    display: "grid",
    gap: 7,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow:
      "0 24px 60px rgba(15,23,42,.20)",
  },

  mobileMenuItem: {
    minHeight: 46,
    padding: "10px 12px",
    display: "grid",
    gridTemplateColumns:
      "30px minmax(0,1fr)",
    alignItems: "center",
    gap: 9,
    border:
      "1px solid transparent",
    borderRadius: 11,
    background: "#ffffff",
    color: "#213028",
    textAlign: "left",
    fontWeight: 750,
    cursor: "pointer",
  },

  mobileMenuItemActivo: {
    borderColor: "#b9dfc8",
    background: "#edf8f1",
    color: "#14683e",
  },

  mobileLogout: {
    minHeight: 46,
    padding: "10px 12px",
    border: "1px solid #fecaca",
    borderRadius: 11,
    background: "#fff5f5",
    color: "#b42318",
    fontWeight: 850,
    cursor: "pointer",
  },

  topbarMobile: {
    marginBottom: 16,
    paddingBottom: 14,
    display: "grid",
    gridTemplateColumns: "1fr",
    alignItems: "stretch",
    gap: 14,
  },

  userBoxMobile: {
    width: "100%",
    minWidth: 0,
  },

  avisoPendienteMobile: {
    gridTemplateColumns: "1fr",
    padding: 14,
  },

  avisoPruebaMobile: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) 76px",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    padding: "9px 10px",
    borderRadius: 14,
  },

  avisoIzquierdaMobile: {
    gridTemplateColumns:
      "34px minmax(0,1fr)",
    alignItems: "center",
    gap: 8,
  },

  avisoIconoMobile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    fontSize: 16,
  },

  avisoEtiquetaMobile: {
    fontSize: 7,
    letterSpacing: 0.9,
    lineHeight: 1.2,
  },

  avisoTituloMobile: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 1.25,
  },

  avisoTextoMobile: {
    margin: "2px 0 0",
    fontSize: 8.5,
    lineHeight: 1.25,
  },

  diasCajaMobile: {
    width: 76,
    minWidth: 76,
    padding: "7px 4px",
    borderRadius: 10,
  },

  diasNumeroMobile: {
    fontSize: 21,
    lineHeight: 1,
  },

  diasTextoMobile: {
    marginTop: 3,
    fontSize: 7.5,
    lineHeight: 1.1,
  },

  gymHeroCompactoMobile: {
    minHeight: 0,
    padding: "17px 16px 0",
    gridTemplateColumns: "1fr",
    gap: 2,
    borderRadius: 19,
    textAlign: "center",
  },

  gymNombreEmpresaMobile: {
    marginTop: 9,
    fontSize: 29,
    lineHeight: 1.04,
  },

  gymImagenWrapMobile: {
    height: 112,
    minHeight: 112,
    marginTop: 3,
  },

  gymImagenFitnessMobile: {
    height: 142,
  },

  gymHeroMobile: {
    minHeight: 0,
    padding: "22px 18px",
    gridTemplateColumns: "1fr",
    gap: 8,
    borderRadius: 20,
  },

  gymTituloMobile: {
    fontSize: 34,
    lineHeight: 1.03,
  },

  gymVisualMobile: {
    display: "none",
  },

  gymIndicadoresMobile: {
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 9,
  },

  gymHerramientaGridMobile: {
    gridTemplateColumns: "1fr",
  },

  gymPanelMobile: {
    minHeight: 0,
    padding: 16,
  },

  gymAccionesInicialesMobile: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr",
  },

  gymAccionesAlumnoMobile: {
    gridTemplateColumns: "1fr",
  },

  accesosGridMobile: {
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 13,
    marginTop: 3,
  },

  bienvenidaLavanderiaMobile: {
    gridTemplateColumns: "1fr",
    padding: "14px 14px 8px",
    gap: 2,
    minHeight: 0,
    marginBottom: 12,
    borderRadius: 17,
  },

  heroTagLavanderiaMobile: {
    marginBottom: 6,
    padding: "5px 8px",
    fontSize: 7.5,
  },

  tituloLavanderiaMobile: {
    margin: "1px 0 5px",
    fontSize: 25,
    lineHeight: 1.08,
    letterSpacing: "-0.4px",
  },

  heroTextLavanderiaMobile: {
    maxWidth: "100%",
    fontSize: 12.5,
    lineHeight: 1.4,
  },

  ilustracionLavanderiaMobile: {
    width: 165,
    height: 105,
    minHeight: 0,
    justifySelf: "start",
    alignSelf: "start",
    placeItems: "center",
    marginTop: 0,
    marginLeft: -8,
  },

  heroGridMobile: {
    gridTemplateColumns: "1fr",
    gap: 14,
  },

  heroMainMobile: {
    minHeight: 0,
    padding: "26px 20px 22px",
    gridTemplateColumns: "1fr",
    alignItems: "start",
    gap: 18,
  },

  heroTitleMobile: {
    fontSize: 36,
    lineHeight: 1.04,
  },

  heroBadgeMobile: {
    width: "100%",
    minWidth: 0,
  },

  planPanelMobile: {
    minHeight: 210,
    padding: 21,
  },

  bottomGridMobile: {
    gridTemplateColumns: "1fr",
  },

  bloqueoPagina: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(circle at top,#174d30,#07100b 70%)",
    fontFamily:
      'Inter, system-ui, "Segoe UI", sans-serif',
  },

  bloqueoTarjeta: {
    width: "min(650px,100%)",
    padding: 34,
    borderRadius: 24,
    background: "#fff",
    textAlign: "center",
  },

  bloqueoLogo: {
    width: 210,
    maxWidth: "70%",
  },

  candado: {
    width: 66,
    height: 66,
    margin: "20px auto 16px",
    display: "grid",
    placeItems: "center",
    borderRadius: 20,
    background: "#fff0ee",
    fontSize: 30,
  },

  bloqueoEtiqueta: {
    color: "#b42318",
    fontSize: 10,
    fontWeight: 900,
  },

  bloqueoTitulo: {
    margin: "8px 0 12px",
    fontSize: 31,
  },

  bloqueoTexto: {
    color: "#66736b",
    lineHeight: 1.65,
  },

  bloqueoAcciones: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 22,
  },

  botonVerde: {
    minHeight: 44,
    padding: "10px 17px",
    border: "none",
    borderRadius: 11,
    background: "#16834f",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },

  botonClaro: {
    minHeight: 44,
    padding: "10px 17px",
    border: "1px solid #cfd9d2",
    borderRadius: 11,
    background: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
};
