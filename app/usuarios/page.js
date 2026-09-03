"use client";

// KONAX Usuarios y Roles
// VERSION 2026.09.02-MODULOS-MANUALES
//
// REGLA PRINCIPAL:
// - plan_codigo / plan_nombre = referencia comercial.
// - empresa_modulos = decide qué módulos tiene activos la empresa.
// - Los módulos se activan y desactivan manualmente desde esta pantalla.
// - El plan NO bloquea ni activa automáticamente los módulos.
// - Inicio y Configuración permanecen como base del sistema.
//
// IMPORTANTE:
// Este archivo conserva los perfiles especiales de Lavandería y Gimnasio
// para mostrar sus módulos propios, pero la activación dentro de cada catálogo
// se realiza manualmente.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const MODULOS_GENERALES = [
  ["dashboard", "Inicio / Resumen", "Panel", "📊"],
  ["agenda", "Agenda", "Agenda", "📅"],
  ["reportes", "Reportes", "Panel", "📚"],
  ["clientes", "Clientes", "Clientes", "👥"],
  ["vista_cliente", "Vista Cliente", "Clientes", "📄"],
  ["creditos", "Créditos", "Cobros", "💳"],
  ["cobranza", "Cobranza", "Cobros", "📞"],
  ["dashboard_cobros", "Centro de Cobranza", "Cobros", "📊"],
  ["gestor_cobros", "Mi cartera de cobro", "Cobros", "💼"],
  ["caja", "Caja", "Caja", "💵"],
  ["control_caja", "Control de Caja", "Caja", "🏦"],
  ["gastos", "Gastos", "Caja", "🧮"],
  ["recargos", "Recargos", "Caja", "⚠️"],
  ["inventario", "Inventario", "Inventario", "📦"],
  ["movimientos_inventario", "Movimientos de inventario", "Inventario", "🔄"],
  ["ventas", "Ventas", "Ventas", "🛒"],
  ["dashboard_ventas", "Centro de Ventas", "Ventas", "📈"],
  ["suscripciones", "Suscripciones", "Ventas", "🔁"],
  ["usuarios", "Usuarios y Roles", "Administración", "🔐"],
  ["configuracion", "Configuración", "Administración", "⚙️"],
].map(([codigo, nombre, grupo, icono]) => ({
  codigo,
  nombre,
  grupo,
  icono,
}));

const MODULOS_LAVANDERIA = [
  ["dashboard", "Inicio / Resumen", "Lavandería", "📊"],
  ["nuevo_pedido", "Nuevo pedido", "Lavandería", "➕"],
  ["pedidos_lavanderia", "Pedidos", "Lavandería", "🧺"],
  ["clientes", "Clientes", "Lavandería", "👥"],
  ["caja", "Caja básica", "Lavandería", "💵"],
  ["historial_lavanderia", "Historial", "Lavandería", "🕘"],
  ["usuarios", "Usuarios y Roles", "Administración", "🔐"],
  ["configuracion", "Configuración", "Administración", "⚙️"],
].map(([codigo, nombre, grupo, icono]) => ({
  codigo,
  nombre,
  grupo,
  icono,
}));

const MODULOS_GIMNASIO = [
  ["dashboard", "Inicio / Resumen", "Gimnasio", "📊"],
  ["clientes", "Alumnos", "Gimnasio", "👥"],
  ["suscripciones", "Membresías", "Gimnasio", "🔁"],
  ["checkin_gimnasio", "Check-in", "Gimnasio", "✅"],
  ["agenda", "Agenda", "Gimnasio", "📅"],
  ["caja", "Caja y pagos", "Gimnasio", "💵"],
  ["vista_cliente", "Historial del alumno", "Gimnasio", "🕘"],
  ["reportes", "Reportes", "Gimnasio", "📚"],
  ["usuarios", "Usuarios y Roles", "Administración", "🔐"],
  ["configuracion", "Configuración", "Administración", "⚙️"],
].map(([codigo, nombre, grupo, icono]) => ({
  codigo,
  nombre,
  grupo,
  icono,
}));

// Inicio y Configuración son la base del sistema.
// Agenda, Caja, Clientes, Inventario, etc. se manejan manualmente.
const OBLIGATORIOS_BASE = ["dashboard", "configuracion"];

// Estos módulos comparten columnas en empresa_modulos.
// Cuando dos módulos dependen de la misma columna, se activan/desactivan juntos.
const COLUMNAS_EMPRESA = {
  agenda: "agenda",
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
  suscripciones: "suscripciones",
  recargos: "recargos",
  gastos: "egresos",
};

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

  return ["gimnasio", "gym", "fitness", "academia", "club"].some(
    (palabra) => texto.includes(palabra)
  );
}

function esTipoLavanderia(tipoNegocio, categoriaNegocio = "", planCodigo = "") {
  const texto = normalizar(
    `${tipoNegocio || ""} ${categoriaNegocio || ""} ${planCodigo || ""}`
  );

  return texto.includes("lavanderia");
}

function generarCorreoPrueba(correoBase, empresaId = "") {
  const correoLimpio = String(correoBase || "")
    .trim()
    .toLowerCase();

  const posicionArroba = correoLimpio.lastIndexOf("@");

  if (posicionArroba <= 0) {
    return correoLimpio;
  }

  const localOriginal = correoLimpio.slice(0, posicionArroba);
  const dominio = correoLimpio.slice(posicionArroba + 1);
  const localBase = localOriginal.split("+")[0];

  const empresaCorta = String(empresaId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 5)
    .toLowerCase();

  const tiempo = Date.now().toString(36);
  const aleatorio = Math.random().toString(36).slice(2, 6);

  const sufijo = [
    "konax",
    empresaCorta || "demo",
    tiempo,
    aleatorio,
  ].join("-");

  return `${localBase}+${sufijo}@${dominio}`;
}

// El plan ya NO decide cuáles módulos están permitidos.
// Todo módulo del catálogo de esa empresa puede configurarse manualmente.
function construirModulosPermitidos(modulos) {
  return Object.fromEntries(
    modulos.map((modulo) => [modulo.codigo, true])
  );
}

export default function Usuarios() {
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [planNombre, setPlanNombre] = useState("");
  const [planCodigo, setPlanCodigo] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [categoriaNegocio, setCategoriaNegocio] = useState("");

  const [esLavanderia, setEsLavanderia] = useState(false);
  const [esGimnasio, setEsGimnasio] = useState(false);

  const [modulos, setModulos] = useState(MODULOS_GENERALES);
  const [modulosPermitidos, setModulosPermitidos] = useState({});
  const [modulosEmpresa, setModulosEmpresa] = useState({});

  const [roles, setRoles] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [permisosUsuario, setPermisosUsuario] = useState({});

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rolId, setRolId] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [modoPrueba, setModoPrueba] = useState(false);
  const [ultimoCorreoPrueba, setUltimoCorreoPrueba] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    inicializar();
  }, []);

  function volverSegunContexto() {
    const tieneSesionAdminMaster = Boolean(
      localStorage.getItem("adminKonaxId")
    );

    const rolActual = normalizar(
      localStorage.getItem("usuarioRol") ||
        localStorage.getItem("adminKonaxRol") ||
        localStorage.getItem("adminKonaxRole")
    );

    const esAdminMaster =
      tieneSesionAdminMaster ||
      [
        "superadmin",
        "super_admin",
        "admin_master",
        "administrador_master",
      ].includes(rolActual);

    if (esAdminMaster) {
      router.push("/admin");
      return;
    }

    router.push("/dashboard");
  }

  async function inicializar() {
    const empresaSesion = localStorage.getItem("empresaId");
    const empresaConfiguracion = localStorage.getItem(
      "empresaAdminCreadaId"
    );

    const rolSesion = normalizar(
      localStorage.getItem("usuarioRol") ||
        localStorage.getItem("adminKonaxRol") ||
        localStorage.getItem("adminKonaxRole")
    );

    const tieneSesionAdmin = Boolean(
      localStorage.getItem("adminKonaxId")
    );

    const esSuperadmin =
      tieneSesionAdmin ||
      [
        "superadmin",
        "super_admin",
        "admin_master",
        "administrador_master",
      ].includes(rolSesion);

    const id =
      esSuperadmin && empresaConfiguracion
        ? empresaConfiguracion
        : empresaSesion;

    if (!id) {
      alert("No hay empresa seleccionada.");
      router.replace(esSuperadmin ? "/admin" : "/login");
      return;
    }

    setEmpresaId(id);
    setCargando(true);

    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select(`
        id,
        nombre,
        plan_nombre,
        plan_codigo,
        tipo_negocio,
        categoria_negocio
      `)
      .eq("id", id)
      .maybeSingle();

    if (errorEmpresa || !empresa) {
      alert(
        "No fue posible cargar la empresa: " +
          (errorEmpresa?.message || "Empresa no encontrada.")
      );
      setCargando(false);
      return;
    }

    const perfilLavanderia = esTipoLavanderia(
      empresa.tipo_negocio,
      empresa.categoria_negocio,
      empresa.plan_codigo
    );

    const perfilGimnasio = esTipoGimnasio(
      empresa.tipo_negocio,
      empresa.categoria_negocio
    );

    /*
      REGLA:
      - El tipo de negocio decide qué catálogo especial necesita.
      - El plan NO decide qué módulos se pueden activar.
      - Una empresa de Belleza con plan Agenda seguirá usando
        MODULOS_GENERALES y tú decides manualmente si dejas:
          Inicio + Agenda + Configuración
        o si además habilitas:
          Clientes + Caja + Gastos + Inventario + etc.
    */
    const catalogo = perfilLavanderia
      ? MODULOS_LAVANDERIA
      : perfilGimnasio
      ? MODULOS_GIMNASIO
      : MODULOS_GENERALES;

    const permitidos = construirModulosPermitidos(catalogo);

    setModulos(catalogo);
    setEmpresaNombre(empresa.nombre || "Empresa");
    setPlanNombre(empresa.plan_nombre || "Sin plan");
    setPlanCodigo(empresa.plan_codigo || "");
    setTipoNegocio(empresa.tipo_negocio || "");
    setCategoriaNegocio(empresa.categoria_negocio || "");

    setEsLavanderia(perfilLavanderia);
    setEsGimnasio(perfilGimnasio);
    setModulosPermitidos(permitidos);

    await Promise.all([
      cargarModulosEmpresa(id, permitidos, catalogo),
      cargarRoles(perfilGimnasio),
      cargarUsuarios(id),
    ]);

    setCargando(false);
  }

  async function cargarModulosEmpresa(
    id,
    permitidos,
    catalogo
  ) {
    const { data, error } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", id)
      .maybeSingle();

    if (error) {
      alert("Error cargando módulos: " + error.message);

      const respaldo = {};
      catalogo.forEach((modulo) => {
        respaldo[modulo.codigo] =
          OBLIGATORIOS_BASE.includes(modulo.codigo);
      });

      setModulosEmpresa(respaldo);
      return;
    }

    const mapa = {};

    catalogo.forEach((modulo) => {
      if (!permitidos[modulo.codigo]) {
        mapa[modulo.codigo] = false;
        return;
      }

      if (OBLIGATORIOS_BASE.includes(modulo.codigo)) {
        mapa[modulo.codigo] = true;
        return;
      }

      const columna = COLUMNAS_EMPRESA[modulo.codigo];

      /*
        Módulos sin columna propia:
        - dashboard y configuracion son base.
        - usuarios se mantiene disponible para administración,
          pero no se fuerza como módulo operativo del negocio.
        - módulos especiales de nicho que todavía no tienen columna
          continúan visibles sin alterar la estructura actual.
      */
      if (!columna) {
        mapa[modulo.codigo] =
          modulo.codigo === "usuarios"
            ? true
            : Boolean(data);
        return;
      }

      if (!data) {
        mapa[modulo.codigo] = false;
        return;
      }

      mapa[modulo.codigo] = Object.prototype.hasOwnProperty.call(
        data,
        columna
      )
        ? Boolean(data[columna])
        : false;
    });

    setModulosEmpresa(mapa);
  }

  async function cargarRoles(perfilGimnasio = esGimnasio) {
    const { data, error } = await supabase
      .from("roles_konax")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando roles: " + error.message);
      return;
    }

    let lista = data || [];

    if (perfilGimnasio) {
      lista = lista.filter((rol) =>
        ["administrador", "vendedor"].includes(normalizar(rol.nombre))
      );
    }

    setRoles(lista);

    const administrador = lista.find(
      (rol) => normalizar(rol.nombre) === "administrador"
    );

    setRolId(administrador?.id || lista[0]?.id || "");
  }

  async function cargarUsuarios(id = empresaId) {
    if (!id) return;

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("empresa_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      alert("Error cargando usuarios: " + error.message);
      return;
    }

    setUsuarios(data || []);
  }

  async function seleccionarUsuario(usuario) {
    setUsuarioSeleccionado(usuario);

    const { data, error } = await supabase
      .from("permisos_usuarios_empresa")
      .select("permiso, activo")
      .eq("empresa_id", empresaId)
      .eq("usuario_id", usuario.id);

    if (error) {
      alert("Error cargando permisos: " + error.message);
      return;
    }

    const mapa = {};

    (data || []).forEach((item) => {
      mapa[item.permiso] = Boolean(item.activo);
    });

    setPermisosUsuario(mapa);
  }

  async function alternarModuloEmpresa(modulo) {
    if (OBLIGATORIOS_BASE.includes(modulo.codigo)) {
      alert(
        modulo.codigo === "dashboard"
          ? "Inicio / Resumen es parte base de KONAX y permanece activo."
          : "Configuración es parte base de KONAX y permanece activa."
      );
      return;
    }

    const columna = COLUMNAS_EMPRESA[modulo.codigo];

    if (!columna) {
      alert(
        `El módulo "${modulo.nombre}" todavía no tiene una columna propia en empresa_modulos. ` +
          "Por seguridad no se modificó la base de datos."
      );
      return;
    }

    const nuevoEstado = !Boolean(modulosEmpresa[modulo.codigo]);

    const { error } = await supabase
      .from("empresa_modulos")
      .upsert(
        {
          empresa_id: empresaId,
          [columna]: nuevoEstado,
        },
        {
          onConflict: "empresa_id",
        }
      );

    if (error) {
      alert("Error actualizando módulo: " + error.message);
      return;
    }

    const relacionados = Object.entries(COLUMNAS_EMPRESA)
      .filter(([, columnaRelacionada]) => columnaRelacionada === columna)
      .map(([codigo]) => codigo);

    setModulosEmpresa((previo) => {
      const siguiente = { ...previo };

      relacionados.forEach((codigo) => {
        siguiente[codigo] = nuevoEstado;
      });

      return siguiente;
    });

    if (!nuevoEstado) {
      await supabase
        .from("permisos_usuarios_empresa")
        .update({
          activo: false,
          updated_at: new Date().toISOString(),
        })
        .eq("empresa_id", empresaId)
        .in("permiso", relacionados);
    }
  }

  async function alternarPermiso(modulo) {
    if (!usuarioSeleccionado) {
      alert("Seleccione un usuario.");
      return;
    }

    if (!modulosEmpresa[modulo.codigo]) {
      alert(`"${modulo.nombre}" está desactivado para la empresa.`);
      return;
    }

    if (esGimnasio) {
      const rolUsuario = normalizar(usuarioSeleccionado.rol);

      if (rolUsuario === "administrador") {
        alert(
          "El Administrador del gimnasio mantiene acceso a todos los módulos que estén activos para la empresa."
        );
        return;
      }

      if (
        rolUsuario === "vendedor" &&
        ![
          "dashboard",
          "clientes",
          "suscripciones",
          "checkin_gimnasio",
          "caja",
        ].includes(modulo.codigo)
      ) {
        alert(
          "El Vendedor del gimnasio puede usar Panel, Alumnos, Membresías, Check-in y Caja cuando esos módulos estén activos para la empresa."
        );
        return;
      }
    }

    const nuevoEstado = !Boolean(permisosUsuario[modulo.codigo]);

    const { error } = await supabase
      .from("permisos_usuarios_empresa")
      .upsert(
        {
          empresa_id: empresaId,
          usuario_id: usuarioSeleccionado.id,
          permiso: modulo.codigo,
          activo: nuevoEstado,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "empresa_id,usuario_id,permiso",
        }
      );

    if (error) {
      alert("Error actualizando permiso: " + error.message);
      return;
    }

    setPermisosUsuario((previo) => ({
      ...previo,
      [modulo.codigo]: nuevoEstado,
    }));
  }

  async function cambiarTodosPermisos(activo) {
    if (!usuarioSeleccionado) {
      alert("Seleccione un usuario.");
      return;
    }

    const registros = modulos.map((modulo) => ({
      empresa_id: empresaId,
      usuario_id: usuarioSeleccionado.id,
      permiso: modulo.codigo,
      activo:
        activo && Boolean(modulosEmpresa[modulo.codigo]),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("permisos_usuarios_empresa")
      .upsert(registros, {
        onConflict: "empresa_id,usuario_id,permiso",
      });

    if (error) {
      alert("Error actualizando permisos: " + error.message);
      return;
    }

    const mapa = {};

    registros.forEach((registro) => {
      mapa[registro.permiso] = registro.activo;
    });

    setPermisosUsuario(mapa);
  }

  async function aplicarPermisosInicialesGimnasio(usuario, nombreRol) {
    if (!esGimnasio || !usuario?.id) {
      return;
    }

    const rol = normalizar(nombreRol);
    const esAdmin = rol === "administrador";
    const esVendedor = rol === "vendedor";

    const registros = MODULOS_GIMNASIO.map((modulo) => {
      const moduloActivoEmpresa = Boolean(
        modulosEmpresa[modulo.codigo]
      );

      let permitidoRol = false;

      if (esAdmin) {
        permitidoRol = true;
      } else if (esVendedor) {
        permitidoRol = [
          "dashboard",
          "clientes",
          "suscripciones",
          "checkin_gimnasio",
          "caja",
        ].includes(modulo.codigo);
      }

      return {
        empresa_id: empresaId,
        usuario_id: usuario.id,
        permiso: modulo.codigo,
        activo: moduloActivoEmpresa && permitidoRol,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from("permisos_usuarios_empresa")
      .upsert(registros, {
        onConflict: "empresa_id,usuario_id,permiso",
      });

    if (error) {
      throw new Error(
        "El usuario fue creado, pero no se pudieron aplicar sus permisos iniciales: " +
          error.message
      );
    }
  }

  async function aplicarPermisosInicialesGeneral(usuario, nombreRol) {
    if (!usuario?.id || esGimnasio) {
      return;
    }

    const esAdmin =
      normalizar(nombreRol) === "administrador";

    const registros = modulos.map((modulo) => ({
      empresa_id: empresaId,
      usuario_id: usuario.id,
      permiso: modulo.codigo,
      activo:
        esAdmin && Boolean(modulosEmpresa[modulo.codigo]),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("permisos_usuarios_empresa")
      .upsert(registros, {
        onConflict: "empresa_id,usuario_id,permiso",
      });

    if (error) {
      throw new Error(
        "El usuario fue creado, pero no se pudieron aplicar sus permisos iniciales: " +
          error.message
      );
    }
  }

  async function crearUsuario() {
    if (guardando) return;

    const nombreLimpio = nombre.trim();
    const correoBase = correo.trim().toLowerCase();

    const rolSeleccionado = roles.find(
      (rol) => String(rol.id) === String(rolId)
    );

    if (!nombreLimpio) {
      alert("Ingrese el nombre del usuario.");
      return;
    }

    if (!correoBase || !correoBase.includes("@")) {
      alert("Ingrese un correo válido.");
      return;
    }

    if (!rolSeleccionado) {
      alert("Seleccione un rol válido.");
      return;
    }

    const correoLimpio = modoPrueba
      ? generarCorreoPrueba(correoBase, empresaId)
      : correoBase;

    if (modoPrueba) {
      setUltimoCorreoPrueba(correoLimpio);
    } else {
      setUltimoCorreoPrueba("");
    }

    setGuardando(true);

    try {
      const {
        data: { session },
        error: errorSesion,
      } = await supabase.auth.getSession();

      if (errorSesion || !session?.access_token) {
        alert(
          "No se pudo validar la sesión segura. Cierre sesión, vuelva a ingresar y pruebe nuevamente."
        );
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "crear-usuario-konax",
        {
          body: {
            empresa_id: empresaId,
            nombre: nombreLimpio,
            correo: correoLimpio,
            rol: rolSeleccionado.nombre,
            rol_id: rolSeleccionado.id,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        let detalle =
          error.message || "No se pudo enviar la invitación.";

        try {
          const contexto = await error.context?.json();

          if (contexto?.error) {
            detalle = contexto.error;
          }
        } catch {}

        alert(detalle);
        return;
      }

      if (!data?.ok) {
        alert(data?.error || "No se pudo enviar la invitación.");
        return;
      }

      if (modoPrueba) {
        alert(
          "Usuario de prueba creado correctamente.\n\n" +
            "Correo base: " +
            correoBase +
            "\n\nCorreo utilizado por KONAX: " +
            correoLimpio +
            "\n\nLa invitación debe llegar al mismo buzón si tu proveedor acepta alias con +."
        );
      } else {
        alert(data.message || "Invitación enviada correctamente.");
      }

      setNombre("");

      if (!modoPrueba) {
        setCorreo("");
      }

      await cargarUsuarios(empresaId);

      if (data.usuario) {
        if (esGimnasio) {
          await aplicarPermisosInicialesGimnasio(
            data.usuario,
            rolSeleccionado.nombre
          );
        } else {
          await aplicarPermisosInicialesGeneral(
            data.usuario,
            rolSeleccionado.nombre
          );
        }

        await seleccionarUsuario(data.usuario);
      }
    } catch (error) {
      alert(
        "No se pudo enviar la invitación: " +
          (error?.message || "Error desconocido.")
      );
    } finally {
      setGuardando(false);
    }
  }

  async function finalizarConfiguracion() {
    const administrador = usuarios.find(
      (usuario) =>
        normalizar(usuario.rol) === "administrador" &&
        normalizar(usuario.estado) === "activo"
    );

    if (!administrador) {
      alert("Debe existir al menos un administrador activo.");
      return;
    }

    setGuardando(true);

    try {
      /*
        Aquí NO se aplica ningún paquete por plan.
        Se guarda exactamente lo que tú dejaste encendido/apagado.
      */
      const payload = {
        empresa_id: empresaId,

        agenda: Boolean(modulosEmpresa.agenda),

        clientes: Boolean(modulosEmpresa.clientes),

        vista_cliente: Boolean(modulosEmpresa.vista_cliente),

        venta_credito:
          Boolean(modulosEmpresa.creditos) ||
          Boolean(modulosEmpresa.ventas),

        caja: Boolean(modulosEmpresa.caja),

        control_caja: Boolean(modulosEmpresa.control_caja),

        cobranza: Boolean(modulosEmpresa.cobranza),

        dashboard_cobros:
          Boolean(modulosEmpresa.dashboard_cobros) ||
          Boolean(modulosEmpresa.reportes),

        inventario:
          Boolean(modulosEmpresa.inventario) ||
          Boolean(modulosEmpresa.movimientos_inventario),

        dashboard_ventas: Boolean(
          modulosEmpresa.dashboard_ventas
        ),

        suscripciones: Boolean(modulosEmpresa.suscripciones),

        recargos: Boolean(modulosEmpresa.recargos),

        egresos: Boolean(modulosEmpresa.gastos),
      };

      const { error: errorModulos } = await supabase
        .from("empresa_modulos")
        .upsert(payload, {
          onConflict: "empresa_id",
        });

      if (errorModulos) {
        throw errorModulos;
      }

      const { error: errorEmpresa } = await supabase
        .from("empresas")
        .update({
          configuracion_completa: true,
        })
        .eq("id", empresaId);

      if (errorEmpresa) {
        throw errorEmpresa;
      }

      alert(
        "Configuración guardada correctamente. Los módulos activos de la empresa quedaron exactamente como los seleccionaste."
      );

      const tieneSesionAdminMaster = Boolean(
        localStorage.getItem("adminKonaxId")
      );

      const rolActual = normalizar(
        localStorage.getItem("usuarioRol") ||
          localStorage.getItem("adminKonaxRol") ||
          localStorage.getItem("adminKonaxRole")
      );

      const esAdminMaster =
        tieneSesionAdminMaster ||
        [
          "superadmin",
          "super_admin",
          "admin_master",
          "administrador_master",
        ].includes(rolActual);

      router.replace(esAdminMaster ? "/admin" : "/dashboard");
    } catch (error) {
      alert(
        "No se pudo finalizar la configuración: " +
          (error.message || "Error desconocido")
      );
    } finally {
      setGuardando(false);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const texto = normalizar(busqueda);

    if (!texto) {
      return usuarios;
    }

    return usuarios.filter((usuario) =>
      normalizar(
        `${usuario.nombre} ${usuario.correo} ${usuario.rol}`
      ).includes(texto)
    );
  }, [usuarios, busqueda]);

  const grupos = useMemo(() => {
    return modulos.reduce((resultado, modulo) => {
      if (!resultado[modulo.grupo]) {
        resultado[modulo.grupo] = [];
      }

      resultado[modulo.grupo].push(modulo);
      return resultado;
    }, {});
  }, [modulos]);

  const nombrePerfil = esGimnasio
    ? "Perfil Gimnasio"
    : esLavanderia
    ? "Perfil Lavandería"
    : "Módulos manuales";

  const correoPruebaPreview =
    modoPrueba && correo.trim().includes("@")
      ? generarCorreoPrueba(correo.trim(), empresaId)
      : "";

  if (cargando) {
    return (
      <div className="cargando">
        <img src="/konax-logo.png" alt="KONAX" />
        <strong>Preparando usuarios y módulos...</strong>
      </div>
    );
  }

  return (
    <main className="pagina">
      <header className="hero">
        <img src="/konax-logo.png" alt="KONAX" />

        <div>
          <span>ADMINISTRACIÓN DE EMPRESA</span>

          <h1>Usuarios, roles y módulos</h1>

          <p>
            Empresa: <strong>{empresaNombre}</strong>
            <br />
            Plan comercial: <strong>{planNombre || planCodigo}</strong>
            <br />
            Configuración: <strong>{nombrePerfil}</strong>
          </p>
        </div>

        <button type="button" onClick={volverSegunContexto}>
          ← Volver
        </button>
      </header>

      <section className="aviso-perfil">
        <div className="aviso-icono">🎛️</div>

        <div>
          <strong>Activación manual de módulos</strong>
          <p>
            El plan comercial ya no decide qué módulos quedan activos.
            Activa solamente las funciones que tendrá esta empresa.
            Por ejemplo, para un salón con KONAX Agenda puedes dejar
            únicamente Inicio, Agenda y Configuración. Si después compra
            Caja, Clientes o Inventario, los activas aquí sin crear otra empresa.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="titulo-card">
          <div>
            <h2>Módulos de la empresa</h2>

            <p>
              Activa o desactiva manualmente las funciones que utilizará
              esta empresa. Inicio y Configuración permanecen como base.
            </p>
          </div>

          <span className="perfil">{nombrePerfil}</span>
        </div>

        <div className="modulos">
          {modulos.map((modulo) => {
            const activo = Boolean(
              modulosEmpresa[modulo.codigo]
            );

            const obligatorio = OBLIGATORIOS_BASE.includes(
              modulo.codigo
            );

            const tieneColumna =
              Boolean(COLUMNAS_EMPRESA[modulo.codigo]) ||
              obligatorio;

            return (
              <button
                key={modulo.codigo}
                type="button"
                onClick={() => alternarModuloEmpresa(modulo)}
                className={
                  activo
                    ? "modulo activo"
                    : "modulo"
                }
              >
                <span className="icono">{modulo.icono}</span>

                <span className="texto">
                  <strong>{modulo.nombre}</strong>

                  <small>
                    {obligatorio
                      ? "Base de KONAX"
                      : !tieneColumna
                      ? "Sin control individual en empresa_modulos"
                      : activo
                      ? "Activo para la empresa"
                      : "Desactivado"}
                  </small>
                </span>

                <span className={activo ? "switch on" : "switch"}>
                  <span />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="principal">
        <div>
          <section className="card">
            <h2>Invitar usuario</h2>

            <p className="texto-ayuda">
              Ingresa el nombre, correo y rol. KONAX enviará una
              invitación para que la persona cree su propia contraseña.
            </p>

            <div className="modo-prueba-box">
              <div className="modo-prueba-info">
                <div className="modo-prueba-icono">🧪</div>

                <div>
                  <strong>Modo prueba</strong>
                  <p>
                    Úsalo para demos. Puedes escribir siempre el mismo
                    correo y KONAX generará un alias único para evitar el
                    mensaje de correo ya utilizado.
                  </p>
                </div>
              </div>

              <label className="toggle-prueba">
                <input
                  type="checkbox"
                  checked={modoPrueba}
                  onChange={(e) => {
                    setModoPrueba(e.target.checked);

                    if (!e.target.checked) {
                      setUltimoCorreoPrueba("");
                    }
                  }}
                />

                <span>
                  {modoPrueba
                    ? "Modo prueba activado"
                    : "Activar modo prueba"}
                </span>
              </label>
            </div>

            {modoPrueba && (
              <div className="aviso-prueba">
                <strong>Puedes reutilizar tu mismo correo.</strong>

                <span>
                  Por ejemplo, si escribes <b>correo@gmail.com</b>,
                  KONAX enviará la invitación usando un correo interno
                  con <b>+konax</b>.
                </span>

                <small>
                  Recomendado con Gmail o proveedores compatibles con
                  alias usando el signo +.
                </small>
              </div>
            )}

            <div className="grid">
              <label>
                Nombre
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={
                    modoPrueba
                      ? "Ej. Usuario Demo"
                      : "Nombre del usuario"
                  }
                />
              </label>

              <label>
                {modoPrueba ? "Correo base para pruebas" : "Correo"}

                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder={
                    modoPrueba
                      ? "micorreo@gmail.com"
                      : "usuario@empresa.com"
                  }
                />
              </label>

              <label>
                Rol
                <select
                  value={rolId}
                  onChange={(e) => setRolId(e.target.value)}
                >
                  {roles.map((rol) => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {modoPrueba && correoPruebaPreview && (
              <div className="preview-correo">
                <span>
                  KONAX generará automáticamente un alias único al
                  enviar.
                </span>
                <small>
                  El alias cambia en cada invitación para que Supabase
                  lo considere un usuario nuevo.
                </small>
              </div>
            )}

            {ultimoCorreoPrueba && (
              <div className="ultimo-correo">
                <span>Último correo de prueba creado:</span>
                <strong>{ultimoCorreoPrueba}</strong>
              </div>
            )}

            <button
              className="crear"
              onClick={crearUsuario}
              disabled={guardando}
            >
              {guardando
                ? modoPrueba
                  ? "Creando usuario de prueba..."
                  : "Enviando invitación..."
                : modoPrueba
                ? "Crear usuario de prueba"
                : "Enviar invitación"}
            </button>
          </section>

          <section className="card">
            <h2>Usuarios de la empresa</h2>

            <input
              className="buscar"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar usuario..."
            />

            <div className="usuarios">
              {usuariosFiltrados.map((usuario) => (
                <button
                  key={usuario.id}
                  onClick={() => seleccionarUsuario(usuario)}
                  className={
                    usuarioSeleccionado?.id === usuario.id
                      ? "usuario seleccionado"
                      : "usuario"
                  }
                >
                  <strong>{usuario.nombre}</strong>
                  <span>{usuario.correo}</span>
                  <small>{usuario.rol}</small>
                </button>
              ))}
            </div>

            <button
              className="finalizar"
              onClick={finalizarConfiguracion}
              disabled={guardando}
            >
              {guardando
                ? "Guardando..."
                : "Guardar módulos de la empresa"}
            </button>
          </section>
        </div>

        <aside className="card permisos">
          <h2>Permisos del usuario</h2>

          {!usuarioSeleccionado ? (
            <p>Selecciona un usuario para configurar sus permisos.</p>
          ) : (
            <>
              <strong>{usuarioSeleccionado.nombre}</strong>

              <div className="acciones">
                <button onClick={() => cambiarTodosPermisos(true)}>
                  Activar módulos de la empresa
                </button>

                <button onClick={() => cambiarTodosPermisos(false)}>
                  Desactivar todo
                </button>
              </div>

              {Object.entries(grupos).map(([grupo, lista]) => (
                <section key={grupo} className="grupo">
                  <h3>{grupo}</h3>

                  {lista.map((modulo) => {
                    const habilitado = Boolean(
                      modulosEmpresa[modulo.codigo]
                    );

                    const activo = Boolean(
                      permisosUsuario[modulo.codigo]
                    );

                    return (
                      <button
                        key={modulo.codigo}
                        onClick={() => alternarPermiso(modulo)}
                        className={
                          !habilitado
                            ? "permiso bloqueado"
                            : activo
                            ? "permiso activo"
                            : "permiso"
                        }
                      >
                        <span>
                          <strong>{modulo.nombre}</strong>

                          <small>
                            {!habilitado
                              ? "Desactivado para la empresa"
                              : activo
                              ? "Permitido"
                              : "Sin permiso"}
                          </small>
                        </span>

                        <span className={activo ? "switch on" : "switch"}>
                          <span />
                        </span>
                      </button>
                    );
                  })}
                </section>
              ))}
            </>
          )}
        </aside>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .pagina {
          min-height: 100vh;
          padding: 24px;
          background: #f2f6f3;
          font-family: Arial, sans-serif;
        }

        .hero {
          max-width: 1450px;
          margin: 0 auto 18px;
          padding: 24px;
          display: grid;
          grid-template-columns: 170px 1fr auto;
          gap: 18px;
          align-items: center;
          border-radius: 20px;
          background: linear-gradient(135deg, #111827, #064e3b);
          color: white;
        }

        .hero img {
          width: 165px;
          padding: 8px;
          border-radius: 14px;
          background: white;
        }

        .hero h1 {
          margin: 5px 0;
        }

        .hero p {
          margin: 0;
          color: #dcfce7;
          line-height: 1.55;
        }

        .hero button,
        .acciones button {
          padding: 10px 15px;
          border: 0;
          border-radius: 9px;
          font-weight: bold;
          cursor: pointer;
        }

        .aviso-perfil {
          max-width: 1450px;
          margin: 0 auto 18px;
          padding: 18px 20px;
          display: grid;
          grid-template-columns: 50px minmax(0, 1fr);
          align-items: center;
          gap: 14px;
          border: 1px solid #9ed5b5;
          border-radius: 17px;
          background: #ecf9f1;
          color: #173c2a;
        }

        .aviso-perfil p {
          margin: 5px 0 0;
          color: #53675b;
          font-size: 13px;
          line-height: 1.5;
        }

        .aviso-icono {
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: white;
          font-size: 24px;
        }

        .card {
          max-width: 1450px;
          margin: 0 auto 18px;
          padding: 22px;
          border-radius: 18px;
          background: white;
          border: 1px solid #e5e7eb;
        }

        .titulo-card {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .titulo-card h2 {
          margin: 0;
        }

        .titulo-card p {
          margin: 7px 0 0;
          color: #6b7280;
          font-size: 13px;
        }

        .perfil {
          padding: 8px 12px;
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .modulos {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 10px;
        }

        .modulo,
        .permiso {
          padding: 13px;
          display: grid;
          grid-template-columns: 30px 1fr 46px;
          gap: 10px;
          align-items: center;
          border: 1px solid #d1d5db;
          border-radius: 13px;
          background: white;
          text-align: left;
          cursor: pointer;
        }

        .modulo.activo,
        .permiso.activo {
          border-color: #86efac;
          background: #ecfdf5;
        }

        .bloqueado {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .texto,
        .permiso span:first-child {
          display: grid;
          gap: 3px;
        }

        small {
          color: #6b7280;
        }

        .switch {
          width: 44px;
          height: 24px;
          padding: 3px;
          display: flex;
          border-radius: 999px;
          background: #d1d5db;
        }

        .switch.on {
          justify-content: flex-end;
          background: #16a34a;
        }

        .switch span {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
        }

        .principal {
          max-width: 1450px;
          margin: auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.8fr);
          gap: 18px;
          align-items: start;
        }

        .texto-ayuda {
          margin: -4px 0 18px;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.55;
        }

        .modo-prueba-box {
          margin-bottom: 16px;
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 1px solid #c7d8cc;
          border-radius: 14px;
          background: #f7faf8;
        }

        .modo-prueba-info {
          min-width: 0;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          align-items: center;
          gap: 11px;
        }

        .modo-prueba-icono {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e0e8e3;
          font-size: 20px;
        }

        .modo-prueba-info p {
          margin: 4px 0 0;
          color: #647168;
          font-size: 12px;
          line-height: 1.45;
        }

        .toggle-prueba {
          min-width: 190px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #b8c9be;
          border-radius: 11px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
        }

        .toggle-prueba input {
          width: 17px;
          height: 17px;
          min-height: 0;
          padding: 0;
          margin: 0;
          accent-color: #16a34a;
          cursor: pointer;
        }

        .aviso-prueba {
          margin: -4px 0 16px;
          padding: 13px 14px;
          display: grid;
          gap: 5px;
          border: 1px solid #86efac;
          border-radius: 12px;
          background: #ecfdf5;
          color: #14532d;
        }

        .aviso-prueba span {
          font-size: 12px;
          line-height: 1.45;
        }

        .aviso-prueba small {
          color: #4f6b59;
          font-size: 11px;
        }

        .preview-correo {
          margin-top: 12px;
          padding: 11px 13px;
          display: grid;
          gap: 3px;
          border-radius: 10px;
          background: #f3f7f4;
          color: #34463b;
          font-size: 11px;
        }

        .ultimo-correo {
          margin-top: 12px;
          padding: 11px 13px;
          display: grid;
          gap: 4px;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          background: #f0fdf4;
          color: #166534;
          font-size: 11px;
          word-break: break-all;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        label {
          display: grid;
          gap: 6px;
          font-weight: bold;
        }

        input,
        select {
          width: 100%;
          min-height: 44px;
          padding: 11px;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          font-size: 15px;
        }

        .crear,
        .finalizar {
          margin-top: 16px;
          min-height: 46px;
          padding: 11px 20px;
          border: 0;
          border-radius: 10px;
          background: #16a34a;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }

        .crear:disabled,
        .finalizar:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .finalizar {
          width: 100%;
        }

        .buscar {
          margin: 12px 0;
        }

        .usuarios {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 10px;
        }

        .usuario {
          padding: 13px;
          display: grid;
          gap: 4px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
          text-align: left;
          cursor: pointer;
        }

        .usuario.seleccionado {
          border: 2px solid #16a34a;
          background: #dcfce7;
        }

        .permisos {
          position: sticky;
          top: 16px;
        }

        .acciones {
          margin: 13px 0;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .grupo {
          margin-top: 12px;
          padding: 12px;
          border-radius: 12px;
          background: #f9fafb;
        }

        .grupo h3 {
          margin-top: 0;
        }

        .permiso {
          width: 100%;
          margin-top: 7px;
          grid-template-columns: 1fr 46px;
        }

        .cargando {
          min-height: 100vh;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 12px;
        }

        .cargando img {
          width: 220px;
        }

        @media (max-width: 850px) {
          .pagina {
            padding: 12px;
          }

          .hero {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .hero img {
            margin: auto;
          }

          .aviso-perfil {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .aviso-icono {
            margin: auto;
          }

          .titulo-card {
            display: grid;
          }

          .perfil {
            justify-self: start;
          }

          .principal {
            grid-template-columns: 1fr;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .permisos {
            position: static;
          }

          .modo-prueba-box {
            display: grid;
          }

          .toggle-prueba {
            width: 100%;
            min-width: 0;
          }

          input,
          select {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  );
}
