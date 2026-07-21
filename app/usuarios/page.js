"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Usuarios() {
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [planNombre, setPlanNombre] = useState("");
  const [planCodigo, setPlanCodigo] = useState("");
  const [modulosPlan, setModulosPlan] = useState({});
  const [adminMasterKonax, setAdminMasterKonax] = useState(false);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState("");

  const [roles, setRoles] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [busquedaUsuario, setBusquedaUsuario] = useState("");
  const [permisosUsuario, setPermisosUsuario] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const gruposPermisos = [
    {
      titulo: "Panel",
      icono: "📊",
      permisos: [
        { codigo: "dashboard", nombre: "Inicio / Resumen" },
        { codigo: "reportes", nombre: "Reportes" },
      ],
    },
    {
      titulo: "Clientes",
      icono: "👥",
      permisos: [
        { codigo: "clientes", nombre: "Clientes" },
        { codigo: "vista_cliente", nombre: "Ficha del cliente" },
      ],
    },
    {
      titulo: "Créditos y Cobranza",
      icono: "💳",
      permisos: [
        { codigo: "creditos", nombre: "Créditos" },
        { codigo: "cobranza", nombre: "Administrar cobranza" },
        { codigo: "gestor_cobros", nombre: "Mi cartera de cobro" },
        { codigo: "abonos", nombre: "Registrar abonos" },
      ],
    },
    {
      titulo: "Caja y Finanzas",
      icono: "💵",
      permisos: [
        { codigo: "caja", nombre: "Caja" },
        { codigo: "control_caja", nombre: "Control de caja" },
        { codigo: "gastos", nombre: "Gastos" },
        { codigo: "recargos", nombre: "Recargos opcionales" },
      ],
    },
    {
      titulo: "Inventario y Ventas",
      icono: "📦",
      permisos: [
        { codigo: "inventario", nombre: "Inventario" },
        {
          codigo: "movimientos_inventario",
          nombre: "Movimientos de inventario",
        },
        { codigo: "ventas", nombre: "Ventas" },
      ],
    },
    {
      titulo: "Administración",
      icono: "⚙️",
      permisos: [
        { codigo: "suscripciones", nombre: "Suscripciones" },
        { codigo: "usuarios", nombre: "Usuarios" },
        { codigo: "configuracion", nombre: "Configuración" },
      ],
    },
  ];

  const permisosDisponibles = gruposPermisos.flatMap(
    (grupo) => grupo.permisos
  );

  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    const id =
      localStorage.getItem("empresaAdminCreadaId") ||
      localStorage.getItem("empresaId");

    const nombreEmpresa =
      localStorage.getItem("empresaAdminCreadaNombre") ||
      localStorage.getItem("empresaNombre");

    const rolActual =
      localStorage.getItem("adminKonaxRol") ||
      localStorage.getItem("usuarioRol") ||
      localStorage.getItem("rolUsuario") ||
      "";

    const correoActual =
      localStorage.getItem("adminKonaxCorreo") ||
      localStorage.getItem("usuarioCorreo") ||
      localStorage.getItem("correoUsuario") ||
      "";

    const rolNormalizado = String(rolActual).toLowerCase().trim();
    const correoNormalizado = String(correoActual).toLowerCase().trim();

    const esMaster =
      ["superadmin", "admin master", "administrador master"].includes(
        rolNormalizado
      ) || correoNormalizado.includes("admin");

    setAdminMasterKonax(esMaster);

    if (!id) {
      alert("No hay empresa seleccionada.");
      router.replace("/empresas");
      return;
    }

    setEmpresaId(id);
    setEmpresaNombre(nombreEmpresa || "Empresa seleccionada");

    await cargarTodo(id);
  }

  async function cargarTodo(id) {
    setCargando(true);

    await Promise.all([
      cargarEmpresa(id),
      cargarModulosPlan(id),
      cargarRoles(),
      cargarUsuarios(id),
    ]);

    setCargando(false);
  }

  function construirModulosPorPlan(codigoPlan) {
    const codigo = String(codigoPlan || "").toLowerCase().trim();

    const base = {
      dashboard: true,
      reportes: false,
      clientes: false,
      vista_cliente: false,
      creditos: false,
      cobranza: false,
      gestor_cobros: false,
      abonos: false,
      caja: false,
      control_caja: false,
      gastos: false,
      recargos: false,
      inventario: false,
      movimientos_inventario: false,
      ventas: false,
      suscripciones: false,
      dashboard_ventas: false,
      usuarios: false,
      configuracion: false,
    };

    if (codigo === "cobros") {
      return {
        ...base,
        reportes: true,
        clientes: true,
        vista_cliente: true,
        creditos: true,
        cobranza: true,
        gestor_cobros: true,
        abonos: true,
        caja: true,
        control_caja: true,
        usuarios: true,
        configuracion: true,
      };
    }

    if (codigo === "ventas_gestion") {
      return {
        ...base,
        reportes: true,
        clientes: true,
        vista_cliente: true,
        caja: true,
        control_caja: true,
        gastos: true,

        /*
          Recargos está incluido en el plan, pero es opcional:
          cada administrador puede activarlo o desactivarlo
          para cada usuario desde esta pantalla.
        */
        recargos: true,

        inventario: true,
        movimientos_inventario: true,
        ventas: true,
        dashboard_ventas: true,
        suscripciones: true,
        usuarios: true,
        configuracion: true,

        creditos: false,
        cobranza: false,
        gestor_cobros: false,
        abonos: false,
      };
    }

    if (codigo === "pro") {
      return {
        ...base,
        reportes: true,
        clientes: true,
        vista_cliente: true,
        creditos: true,
        cobranza: true,
        gestor_cobros: true,
        abonos: true,
        caja: true,
        control_caja: true,
        gastos: true,
        recargos: true,
        inventario: true,
        movimientos_inventario: true,
        ventas: true,
        suscripciones: true,
        dashboard_ventas: true,
        usuarios: true,
        configuracion: true,
      };
    }

    return base;
  }

  async function cargarEmpresa(id = empresaId) {
    if (!id) return;

    const { data, error } = await supabase
      .from("empresas")
      .select("nombre, plan_nombre, plan_codigo")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      alert("Error cargando empresa: " + error.message);
      return;
    }

    if (!data) return;

    setEmpresaNombre(data.nombre || "Empresa seleccionada");
    setPlanNombre(data.plan_nombre || "Sin plan");
    setPlanCodigo(data.plan_codigo || "");
  }

  async function cargarModulosPlan(id = empresaId) {
    if (!id) return;

    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("plan_codigo, plan_nombre")
      .eq("id", id)
      .maybeSingle();

    if (errorEmpresa) {
      alert(
        "Error cargando plan de empresa: " +
          errorEmpresa.message
      );
      setModulosPlan(construirModulosPorPlan(""));
      return;
    }

    const codigoPlan = String(
      empresa?.plan_codigo || ""
    )
      .toLowerCase()
      .trim();

    const modulosBase =
      construirModulosPorPlan(codigoPlan);

    /*
      Esta tabla es opcional. Si tiene filas, permite
      activar o desactivar módulos para toda la empresa.
      Si no existe una fila para un módulo, se conserva
      lo definido por el plan.
    */
    const { data, error } = await supabase
      .from("modulos_empresa")
      .select("modulo, activo")
      .eq("empresa_id", id);

    if (error) {
      setModulosPlan(modulosBase);
      return;
    }

    const mapaTabla = {};

    (data || []).forEach((item) => {
      mapaTabla[item.modulo] = Boolean(item.activo);
    });

    const mapaFinal = {};

    Object.keys(modulosBase).forEach((modulo) => {
      const incluidoEnPlan = Boolean(
        modulosBase[modulo]
      );

      if (!incluidoEnPlan) {
        mapaFinal[modulo] = false;
        return;
      }

      if (
        ["dashboard", "usuarios", "configuracion"].includes(
          modulo
        )
      ) {
        mapaFinal[modulo] = true;
        return;
      }

      mapaFinal[modulo] =
        typeof mapaTabla[modulo] === "boolean"
          ? mapaTabla[modulo]
          : incluidoEnPlan;
    });

    /*
      Compatibilidad con configuraciones antiguas:
      Suscripciones y Recargos forman parte de
      Ventas y Gestión. Recargos sigue siendo opcional
      por usuario y puede apagarse desde sus permisos.
    */
    if (codigoPlan === "ventas_gestion") {
      mapaFinal.dashboard = true;
      mapaFinal.reportes = true;
      mapaFinal.clientes = true;
      mapaFinal.vista_cliente = true;
      mapaFinal.caja = true;
      mapaFinal.control_caja = true;
      mapaFinal.gastos = true;
      mapaFinal.recargos = true;
      mapaFinal.inventario = true;
      mapaFinal.movimientos_inventario = true;
      mapaFinal.ventas = true;
      mapaFinal.dashboard_ventas = true;
      mapaFinal.suscripciones = true;
      mapaFinal.usuarios = true;
      mapaFinal.configuracion = true;

      mapaFinal.creditos = false;
      mapaFinal.cobranza = false;
      mapaFinal.gestor_cobros = false;
      mapaFinal.abonos = false;
    }

    if (codigoPlan === "cobros") {
      mapaFinal.dashboard = true;
      mapaFinal.reportes = true;
      mapaFinal.clientes = true;
      mapaFinal.vista_cliente = true;
      mapaFinal.creditos = true;
      mapaFinal.cobranza = true;
      mapaFinal.gestor_cobros = true;
      mapaFinal.abonos = true;
      mapaFinal.caja = true;
      mapaFinal.control_caja = true;
      mapaFinal.usuarios = true;
      mapaFinal.configuracion = true;

      mapaFinal.gastos = false;
      mapaFinal.recargos = false;
      mapaFinal.inventario = false;
      mapaFinal.movimientos_inventario = false;
      mapaFinal.ventas = false;
      mapaFinal.suscripciones = false;
      mapaFinal.dashboard_ventas = false;
    }

    setModulosPlan(mapaFinal);
  }

  async function cargarRoles() {
    const { data, error } = await supabase
      .from("roles_konax")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando roles: " + error.message);
      return;
    }

    const lista = data || [];
    setRoles(lista);

    const administrador = lista.find(
      (rol) =>
        String(rol.nombre || "")
          .toLowerCase()
          .trim() === "administrador"
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
      alert(
        "Error cargando usuarios: " + error.message
      );
      return;
    }

    setUsuarios(data || []);
  }

  async function seleccionarUsuario(usuario) {
    setUsuarioSeleccionado(usuario);
    setBusquedaUsuario(usuario.nombre || "");
    await cargarPermisosUsuario(usuario.id);
  }

  async function cargarPermisosUsuario(usuarioId) {
    const { data, error } = await supabase
      .from("permisos_usuarios_empresa")
      .select("permiso, activo")
      .eq("empresa_id", empresaId)
      .eq("usuario_id", usuarioId);

    if (error) {
      alert(
        "Error cargando permisos del usuario: " +
          error.message
      );
      return;
    }

    const permisosArmados = {};

    (data || []).forEach((permiso) => {
      permisosArmados[permiso.permiso] =
        Boolean(permiso.activo);
    });

    setPermisosUsuario(permisosArmados);
  }

  function esAdminMasterKonax() {
    return Boolean(adminMasterKonax);
  }

  function moduloPermitidoPorPlan(codigo) {
    if (esAdminMasterKonax()) return true;
    if (codigo === "dashboard") return true;
    return Boolean(modulosPlan?.[codigo]);
  }

  function permisoActivo(codigo) {
    return Boolean(permisosUsuario?.[codigo]);
  }

  async function alternarPermiso(permiso) {
    if (!usuarioSeleccionado) {
      alert("Seleccione un usuario.");
      return;
    }

    if (!moduloPermitidoPorPlan(permiso.codigo)) {
      alert(
        `El módulo "${permiso.nombre}" no está incluido en el plan ${
          planNombre || "actual"
        }.`
      );
      return;
    }

    const nuevoEstado =
      !permisoActivo(permiso.codigo);

    const { error } = await supabase
      .from("permisos_usuarios_empresa")
      .upsert(
        {
          empresa_id: empresaId,
          usuario_id: usuarioSeleccionado.id,
          permiso: permiso.codigo,
          activo: nuevoEstado,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            "empresa_id,usuario_id,permiso",
        }
      );

    if (error) {
      alert(
        "Error actualizando permiso: " +
          error.message
      );
      return;
    }

    setPermisosUsuario((previo) => ({
      ...previo,
      [permiso.codigo]: nuevoEstado,
    }));
  }

  async function cambiarTodosPermisos(activo) {
    if (!usuarioSeleccionado) {
      alert("Seleccione un usuario.");
      return;
    }

    const permitidos = permisosDisponibles.filter(
      (permiso) =>
        esAdminMasterKonax() ||
        moduloPermitidoPorPlan(permiso.codigo)
    );

    const bloqueados = esAdminMasterKonax()
      ? []
      : permisosDisponibles.filter(
          (permiso) =>
            !moduloPermitidoPorPlan(
              permiso.codigo
            )
        );

    const registros = [
      ...permitidos.map((permiso) => ({
        empresa_id: empresaId,
        usuario_id: usuarioSeleccionado.id,
        permiso: permiso.codigo,
        activo,
        updated_at: new Date().toISOString(),
      })),
      ...bloqueados.map((permiso) => ({
        empresa_id: empresaId,
        usuario_id: usuarioSeleccionado.id,
        permiso: permiso.codigo,
        activo: false,
        updated_at: new Date().toISOString(),
      })),
    ];

    const { error } = await supabase
      .from("permisos_usuarios_empresa")
      .upsert(registros, {
        onConflict:
          "empresa_id,usuario_id,permiso",
      });

    if (error) {
      alert(
        "Error actualizando permisos: " +
          error.message
      );
      return;
    }

    const nuevos = {};

    permitidos.forEach((permiso) => {
      nuevos[permiso.codigo] = activo;
    });

    bloqueados.forEach((permiso) => {
      nuevos[permiso.codigo] = false;
    });

    setPermisosUsuario(nuevos);
  }

  function limpiarFormulario() {
    setNombre("");
    setCorreo("");
    setPassword("");

    const administrador = roles.find(
      (rol) =>
        String(rol.nombre || "")
          .toLowerCase()
          .trim() === "administrador"
    );

    setRolId(administrador?.id || roles[0]?.id || "");
  }

  async function crearUsuario() {
    if (!empresaId) {
      alert("No hay empresa seleccionada.");
      return;
    }

    if (
      !nombre.trim() ||
      !correo.trim() ||
      !password.trim() ||
      !rolId
    ) {
      alert(
        "Complete nombre, correo, contraseña y rol."
      );
      return;
    }

    const rolSeleccionado = roles.find(
      (rol) => String(rol.id) === String(rolId)
    );

    if (!rolSeleccionado) {
      alert("Seleccione un rol válido.");
      return;
    }

    setGuardando(true);

    try {
      const { data, error } = await supabase
        .from("usuarios")
        .insert([
          {
            empresa_id: empresaId,
            nombre: nombre.trim(),
            correo: correo
              .trim()
              .toLowerCase(),
            password: password.trim(),
            rol_id: rolSeleccionado.id,
            rol: rolSeleccionado.nombre,
            estado: "Activo",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const esAdministrador =
        String(rolSeleccionado.nombre || "")
          .toLowerCase()
          .trim() === "administrador";

      const permisosIniciales =
        permisosDisponibles.map((permiso) => ({
          empresa_id: empresaId,
          usuario_id: data.id,
          permiso: permiso.codigo,
          activo:
            esAdministrador &&
            moduloPermitidoPorPlan(
              permiso.codigo
            ),
          updated_at: new Date().toISOString(),
        }));

      const { error: errorPermisos } =
        await supabase
          .from("permisos_usuarios_empresa")
          .upsert(permisosIniciales, {
            onConflict:
              "empresa_id,usuario_id,permiso",
          });

      if (errorPermisos) {
        throw new Error(
          "Usuario creado, pero hubo un error asignando permisos: " +
            errorPermisos.message
        );
      }

      await supabase
        .from("bitacora_konax")
        .insert([
          {
            empresa_id: empresaId,
            empresa_nombre: empresaNombre,
            accion: "Usuario creado",
            descripcion:
              `Se creó el usuario ${nombre.trim()} con rol ` +
              `${rolSeleccionado.nombre} para ${empresaNombre}.`,
            estado_anterior: null,
            estado_nuevo: "Usuario activo",
            usuario: "KONAX",
          },
        ]);

      alert("Usuario creado correctamente.");

      limpiarFormulario();
      await cargarUsuarios(empresaId);
      await seleccionarUsuario(data);
    } catch (error) {
      alert(
        "Error creando usuario: " +
          (error.message || "Error desconocido")
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarUsuario(id) {
    if (
      !confirm("¿Deseas eliminar este usuario?")
    ) {
      return;
    }

    await supabase
      .from("permisos_usuarios_empresa")
      .delete()
      .eq("empresa_id", empresaId)
      .eq("usuario_id", id);

    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert(
        "Error eliminando usuario: " +
          error.message
      );
      return;
    }

    if (usuarioSeleccionado?.id === id) {
      setUsuarioSeleccionado(null);
      setPermisosUsuario({});
      setBusquedaUsuario("");
    }

    await cargarUsuarios(empresaId);
  }

  async function finalizarConfiguracion() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("estado", "Activo")
      .order("created_at", { ascending: true });

    if (error) {
      alert(
        "Error verificando usuarios: " +
          error.message
      );
      return;
    }

    const administradorEmpresa = (data || []).find(
      (usuario) =>
        String(usuario.rol || "")
          .toLowerCase()
          .trim() === "administrador"
    );

    if (!administradorEmpresa) {
      alert(
        "Debe crear al menos un administrador activo."
      );
      return;
    }

    const {
      data: empresaActualizada,
      error: errorEmpresa,
    } = await supabase
      .from("empresas")
      .update({ configuracion_completa: true })
      .eq("id", empresaId)
      .select("*")
      .maybeSingle();

    if (errorEmpresa) {
      alert(
        "Error finalizando configuración: " +
          errorEmpresa.message
      );
      return;
    }

    localStorage.removeItem("adminKonaxId");
    localStorage.removeItem("adminKonaxNombre");
    localStorage.removeItem("adminKonaxCorreo");
    localStorage.removeItem("adminKonaxRol");
    localStorage.removeItem("empresaAdminCreadaId");
    localStorage.removeItem(
      "empresaAdminCreadaNombre"
    );
    localStorage.removeItem(
      "categoriaNegocioAdmin"
    );
    localStorage.removeItem("tipoNegocioAdmin");

    localStorage.setItem(
      "usuarioId",
      administradorEmpresa.id
    );
    localStorage.setItem(
      "usuarioNombre",
      administradorEmpresa.nombre || ""
    );
    localStorage.setItem(
      "usuarioCorreo",
      administradorEmpresa.correo || ""
    );
    localStorage.setItem("empresaId", empresaId);
    localStorage.setItem(
      "empresaNombre",
      empresaActualizada?.nombre ||
        empresaNombre ||
        ""
    );
    localStorage.setItem(
      "usuarioRol",
      "Administrador"
    );
    localStorage.setItem(
      "rolUsuario",
      "Administrador"
    );
    localStorage.setItem(
      "rolId",
      administradorEmpresa.rol_id || ""
    );

    alert("Configuración finalizada.");
    router.replace("/dashboard");
  }

  const usuariosFiltrados = useMemo(() => {
    const texto = String(busquedaUsuario || "")
      .toLowerCase()
      .trim();

    if (!texto) return usuarios;

    return usuarios.filter(
      (usuario) =>
        String(usuario.nombre || "")
          .toLowerCase()
          .includes(texto) ||
        String(usuario.correo || "")
          .toLowerCase()
          .includes(texto) ||
        String(usuario.rol || "")
          .toLowerCase()
          .includes(texto)
    );
  }, [usuarios, busquedaUsuario]);

  const permisosActivos =
    permisosDisponibles.filter(
      (permiso) =>
        permisoActivo(permiso.codigo) &&
        moduloPermitidoPorPlan(permiso.codigo)
    ).length;

  const permisosPermitidosTotal =
    permisosDisponibles.filter((permiso) =>
      moduloPermitidoPorPlan(permiso.codigo)
    ).length;

  if (cargando) {
    return (
      <div style={s.loading}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.loadingLogo}
        />
        <strong style={s.loadingTitle}>
          Preparando usuarios y permisos
        </strong>
        <span style={s.textoSuave}>
          Validando empresa, plan y módulos.
        </span>
      </div>
    );
  }

  return (
    <main style={s.pagina}>
      <div style={s.contenedor}>
        <header style={s.hero}>
          <div style={s.heroInfo}>
            <div style={s.logoBox}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={s.logo}
              />
            </div>

            <div>
              <span style={s.etiqueta}>
                ADMINISTRACIÓN DE EMPRESA
              </span>
              <h1 style={s.titulo}>
                Usuarios y Permisos
              </h1>
              <p style={s.subtitulo}>
                Empresa: <strong>{empresaNombre}</strong>
                <br />
                Plan:{" "}
                <strong>
                  {planNombre || planCodigo || "Sin plan"}
                </strong>
              </p>

              {adminMasterKonax && (
                <span style={s.modoMaster}>
                  Modo Administrador KONAX
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            style={s.botonBlanco}
          >
            ← Dashboard
          </button>
        </header>

        <section style={s.resumenGrid}>
          <KPI
            titulo="Usuarios"
            valor={usuarios.length}
            icono="👥"
          />
          <KPI
            titulo="Roles"
            valor={roles.length}
            icono="🔐"
          />
          <KPI
            titulo="Permisos activos"
            valor={
              usuarioSeleccionado
                ? `${permisosActivos}/${permisosPermitidosTotal}`
                : "-"
            }
            icono="✅"
          />
        </section>

        <section style={s.mainGrid}>
          <div>
            <article style={s.card}>
              <h2 style={s.tituloSeccion}>
                Crear usuario
              </h2>
              <p style={s.textoSuave}>
                Crea usuarios y asígnales un rol inicial.
              </p>

              <div style={s.grid}>
                <Campo label="Nombre">
                  <input
                    value={nombre}
                    onChange={(e) =>
                      setNombre(e.target.value)
                    }
                    style={s.input}
                    placeholder="Nombre completo"
                  />
                </Campo>

                <Campo label="Correo">
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) =>
                      setCorreo(e.target.value)
                    }
                    style={s.input}
                    placeholder="usuario@empresa.com"
                  />
                </Campo>

                <Campo label="Contraseña">
                  <input
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    style={s.input}
                    placeholder="Contraseña inicial"
                  />
                </Campo>

                <Campo label="Rol">
                  <select
                    value={rolId}
                    onChange={(e) =>
                      setRolId(e.target.value)
                    }
                    style={s.input}
                  >
                    {roles.length === 0 && (
                      <option value="">
                        No hay roles configurados
                      </option>
                    )}

                    {roles.map((rol) => (
                      <option
                        key={rol.id}
                        value={rol.id}
                      >
                        {rol.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <div style={s.acciones}>
                <button
                  onClick={crearUsuario}
                  style={s.botonAzul}
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : "Crear usuario"}
                </button>

                <button
                  onClick={limpiarFormulario}
                  style={s.botonNegro}
                >
                  Limpiar
                </button>
              </div>
            </article>

            <article style={s.card}>
              <h2 style={s.tituloSeccion}>
                Buscar usuario
              </h2>
              <p style={s.textoSuave}>
                Selecciona un usuario para modificar sus permisos.
              </p>

              <input
                value={busquedaUsuario}
                onChange={(e) =>
                  setBusquedaUsuario(e.target.value)
                }
                style={s.input}
                placeholder="Buscar por nombre, correo o rol..."
              />

              <div style={s.usuariosLista}>
                {usuariosFiltrados.map((usuario) => (
                  <button
                    key={usuario.id}
                    onClick={() =>
                      seleccionarUsuario(usuario)
                    }
                    style={
                      usuarioSeleccionado?.id ===
                      usuario.id
                        ? s.usuarioActivo
                        : s.usuarioInactivo
                    }
                  >
                    <strong>{usuario.nombre}</strong>
                    <span>{usuario.correo}</span>
                    <small>
                      {usuario.rol || "Sin rol"}
                    </small>
                  </button>
                ))}
              </div>
            </article>

            <article style={s.card}>
              <h2 style={s.tituloSeccion}>
                Usuarios de la empresa ({usuarios.length})
              </h2>

              <div style={s.tablaBox}>
                <table style={s.tabla}>
                  <thead>
                    <tr>
                      <th style={s.th}>Nombre</th>
                      <th style={s.th}>Correo</th>
                      <th style={s.th}>Rol</th>
                      <th style={s.th}>Estado</th>
                      <th style={s.th}>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usuarios.length === 0 ? (
                      <tr>
                        <td
                          style={s.tdVacio}
                          colSpan="5"
                        >
                          No hay usuarios creados.
                        </td>
                      </tr>
                    ) : (
                      usuarios.map((usuario) => (
                        <tr key={usuario.id}>
                          <td style={s.td}>
                            <strong>
                              {usuario.nombre}
                            </strong>
                          </td>
                          <td style={s.td}>
                            {usuario.correo}
                          </td>
                          <td style={s.td}>
                            {usuario.rol || "-"}
                          </td>
                          <td style={s.td}>
                            <span
                              style={
                                String(
                                  usuario.estado || ""
                                ).toLowerCase() ===
                                "activo"
                                  ? s.estadoActivo
                                  : s.estadoInactivo
                              }
                            >
                              {usuario.estado ||
                                "Activo"}
                            </span>
                          </td>
                          <td style={s.td}>
                            <button
                              onClick={() =>
                                eliminarUsuario(
                                  usuario.id
                                )
                              }
                              style={s.botonEliminar}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <button
                onClick={finalizarConfiguracion}
                style={s.botonVerde}
              >
                Finalizar configuración
              </button>
            </article>
          </div>

          <aside>
            {!usuarioSeleccionado ? (
              <article style={s.cardSticky}>
                <h2 style={s.tituloSeccion}>
                  Permisos
                </h2>
                <p style={s.textoSuave}>
                  Selecciona un usuario para ver y editar sus permisos.
                </p>
              </article>
            ) : (
              <article style={s.cardSticky}>
                <div style={s.permisosHeader}>
                  <div>
                    <h2 style={s.tituloSeccion}>
                      Permisos del usuario
                    </h2>
                    <p style={s.textoSuave}>
                      <strong>
                        {usuarioSeleccionado.nombre}
                      </strong>{" "}
                      ·{" "}
                      {usuarioSeleccionado.rol || "-"}
                    </p>
                  </div>

                  <span style={s.contadorPermisos}>
                    {permisosActivos}/
                    {permisosPermitidosTotal}
                  </span>
                </div>

                <div style={s.accionesPermisos}>
                  <button
                    onClick={() =>
                      cambiarTodosPermisos(true)
                    }
                    style={s.botonMiniVerde}
                  >
                    Activar permitidos
                  </button>

                  <button
                    onClick={() =>
                      cambiarTodosPermisos(false)
                    }
                    style={s.botonMiniGris}
                  >
                    Desactivar todo
                  </button>
                </div>

                <div style={s.gruposGrid}>
                  {gruposPermisos.map((grupo) => (
                    <section
                      key={grupo.titulo}
                      style={s.grupoCard}
                    >
                      <h3 style={s.grupoTitulo}>
                        {grupo.icono} {grupo.titulo}
                      </h3>

                      <div style={s.permisosCards}>
                        {grupo.permisos.map(
                          (permiso) => {
                            const activo =
                              permisoActivo(
                                permiso.codigo
                              );

                            const permitido =
                              moduloPermitidoPorPlan(
                                permiso.codigo
                              );

                            return (
                              <button
                                key={permiso.codigo}
                                type="button"
                                onClick={() =>
                                  alternarPermiso(
                                    permiso
                                  )
                                }
                                style={
                                  !permitido
                                    ? s.permisoBloqueado
                                    : activo
                                    ? s.permisoActivo
                                    : s.permisoNormal
                                }
                              >
                                <div>
                                  <strong>
                                    {permiso.nombre}
                                    {!permitido
                                      ? " 🔒"
                                      : ""}
                                  </strong>

                                  {permiso.codigo ===
                                    "recargos" &&
                                    permitido && (
                                      <small
                                        style={
                                          s.textoOpcional
                                        }
                                      >
                                        Opcional por usuario
                                      </small>
                                    )}

                                  {!permitido && (
                                    <small
                                      style={
                                        s.textoBloqueado
                                      }
                                    >
                                      No incluido en el plan
                                    </small>
                                  )}
                                </div>

                                <span
                                  style={
                                    activo && permitido
                                      ? s.switchOn
                                      : s.switchOff
                                  }
                                >
                                  <span
                                    style={s.circulo}
                                  />
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function Campo({ label, children }) {
  return (
    <label style={s.campo}>
      <span style={s.label}>{label}</span>
      {children}
    </label>
  );
}

function KPI({ titulo, valor, icono }) {
  return (
    <article style={s.resumenCard}>
      <span style={s.kpiIcono}>{icono}</span>
      <span style={s.resumenLabel}>
        {titulo}
      </span>
      <strong style={s.resumenValor}>
        {valor}
      </strong>
    </article>
  );
}

const s = {
  pagina: {
    minHeight: "100vh",
    padding: "26px",
    background:
      "linear-gradient(135deg,#ecfdf5 0%,#f3f4f6 45%,#fff 100%)",
    fontFamily:
      'Inter, Arial, system-ui, sans-serif',
  },
  contenedor: {
    maxWidth: 1500,
    margin: "0 auto",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 10,
    background: "#f3f6f4",
    fontFamily:
      'Inter, Arial, system-ui, sans-serif',
  },
  loadingLogo: {
    width: 230,
    maxWidth: "75%",
  },
  loadingTitle: {
    fontSize: 22,
  },
  hero: {
    marginBottom: 18,
    padding: 26,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    borderRadius: 22,
    background:
      "linear-gradient(135deg,#111827,#064e3b)",
    color: "#fff",
    boxShadow:
      "0 12px 30px rgba(0,0,0,.16)",
  },
  heroInfo: {
    display: "flex",
    alignItems: "center",
    gap: 18,
  },
  logoBox: {
    width: 180,
    height: 74,
    padding: 8,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#fff",
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  etiqueta: {
    color: "#bbf7d0",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.25,
  },
  titulo: {
    margin: "5px 0",
    fontSize: 34,
  },
  subtitulo: {
    margin: 0,
    color: "#dcfce7",
    lineHeight: 1.5,
  },
  modoMaster: {
    display: "inline-block",
    marginTop: 9,
    padding: "7px 10px",
    borderRadius: 9,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 11,
    fontWeight: 900,
  },
  botonBlanco: {
    minHeight: 44,
    padding: "10px 17px",
    border: "none",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    fontWeight: 800,
    cursor: "pointer",
  },
  resumenGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 14,
    marginBottom: 18,
  },
  resumenCard: {
    padding: 18,
    display: "grid",
    gap: 6,
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    background: "#fff",
    boxShadow:
      "0 5px 16px rgba(0,0,0,.05)",
  },
  kpiIcono: {
    fontSize: 24,
  },
  resumenLabel: {
    color: "#6b7280",
    fontSize: 13,
  },
  resumenValor: {
    color: "#111827",
    fontSize: 22,
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(420px,1fr) minmax(520px,1.2fr)",
    gap: 18,
    alignItems: "start",
  },
  card: {
    marginBottom: 18,
    padding: 22,
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    background: "#fff",
    boxShadow:
      "0 8px 22px rgba(0,0,0,.07)",
  },
  cardSticky: {
    marginBottom: 18,
    padding: 22,
    position: "sticky",
    top: 18,
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    background: "#fff",
    boxShadow:
      "0 8px 22px rgba(0,0,0,.07)",
  },
  tituloSeccion: {
    margin: 0,
    color: "#111827",
  },
  textoSuave: {
    marginTop: 6,
    color: "#6b7280",
  },
  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 14,
    marginTop: 16,
  },
  campo: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    color: "#374151",
    fontSize: 13,
    fontWeight: 800,
  },
  input: {
    width: "100%",
    minHeight: 44,
    padding: 12,
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    fontSize: 14,
  },
  acciones: {
    marginTop: 18,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  botonAzul: {
    minHeight: 44,
    padding: "10px 20px",
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  botonNegro: {
    minHeight: 44,
    padding: "10px 20px",
    border: "none",
    borderRadius: 10,
    background: "#111827",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  usuariosLista: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 10,
  },
  usuarioActivo: {
    padding: 14,
    display: "grid",
    gap: 5,
    border: "2px solid #16a34a",
    borderRadius: 14,
    background: "#dcfce7",
    color: "#166534",
    textAlign: "left",
    cursor: "pointer",
  },
  usuarioInactivo: {
    padding: 14,
    display: "grid",
    gap: 5,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#f9fafb",
    color: "#111827",
    textAlign: "left",
    cursor: "pointer",
  },
  tablaBox: {
    marginTop: 16,
    marginBottom: 18,
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
  },
  tabla: {
    width: "100%",
    minWidth: 760,
    borderCollapse: "collapse",
  },
  th: {
    padding: 12,
    background: "#111827",
    color: "#fff",
    textAlign: "left",
    fontSize: 13,
  },
  td: {
    padding: 12,
    borderBottom: "1px solid #f3f4f6",
    color: "#111827",
  },
  tdVacio: {
    padding: 26,
    color: "#6b7280",
    textAlign: "center",
  },
  estadoActivo: {
    padding: "5px 9px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 12,
    fontWeight: 800,
  },
  estadoInactivo: {
    padding: "5px 9px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 800,
  },
  botonEliminar: {
    padding: "8px 11px",
    border: "none",
    borderRadius: 8,
    background: "#dc2626",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  botonVerde: {
    width: "100%",
    minHeight: 48,
    border: "none",
    borderRadius: 12,
    background: "#16a34a",
    color: "#fff",
    fontSize: 16,
    fontWeight: 850,
    cursor: "pointer",
  },
  permisosHeader: {
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  contadorPermisos: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "#064e3b",
    color: "#fff",
    fontWeight: 800,
  },
  accionesPermisos: {
    marginBottom: 16,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  botonMiniVerde: {
    padding: "9px 14px",
    border: "none",
    borderRadius: 9,
    background: "#16a34a",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  botonMiniGris: {
    padding: "9px 14px",
    border: "none",
    borderRadius: 9,
    background: "#6b7280",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  gruposGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(240px,1fr))",
    gap: 14,
  },
  grupoCard: {
    padding: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#f9fafb",
  },
  grupoTitulo: {
    margin: "0 0 10px",
    color: "#111827",
    fontSize: 15,
  },
  permisosCards: {
    display: "grid",
    gap: 8,
  },
  permisoNormal: {
    padding: 11,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    color: "#111827",
    textAlign: "left",
    cursor: "pointer",
  },
  permisoActivo: {
    padding: 11,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    border: "1px solid #86efac",
    borderRadius: 12,
    background: "#ecfdf5",
    color: "#166534",
    textAlign: "left",
    cursor: "pointer",
  },
  permisoBloqueado: {
    padding: 11,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    border: "1px dashed #9ca3af",
    borderRadius: 12,
    background: "#f3f4f6",
    color: "#6b7280",
    opacity: 0.85,
    textAlign: "left",
    cursor: "not-allowed",
  },
  textoBloqueado: {
    display: "block",
    marginTop: 4,
    color: "#9ca3af",
    fontSize: 11,
  },
  textoOpcional: {
    display: "block",
    marginTop: 4,
    color: "#16834f",
    fontSize: 11,
  },
  switchOn: {
    minWidth: 44,
    height: 24,
    padding: 3,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    borderRadius: 999,
    background: "#16a34a",
  },
  switchOff: {
    minWidth: 44,
    height: 24,
    padding: 3,
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    borderRadius: 999,
    background: "#d1d5db",
  },
  circulo: {
    width: 18,
    height: 18,
    display: "block",
    borderRadius: "50%",
    background: "#fff",
  },
};
