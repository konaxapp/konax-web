"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const MODULOS = [
  ["dashboard", "Inicio / Resumen", "Panel", "📊"],
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

const PERFILES_ROL = {
  cajero: [
    "dashboard",
    "clientes",
    "vista_cliente",
    "caja",
    "inventario",
  ],
  gestor: [
    "dashboard",
    "clientes",
    "vista_cliente",
    "cobranza",
    "dashboard_cobros",
    "gestor_cobros",
  ],
  vendedor: [
    "dashboard",
    "clientes",
    "vista_cliente",
    "caja",
    "inventario",
    "ventas",
  ],
  administrador: MODULOS.map((modulo) => modulo.codigo),
};

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function construirModulosPorPlan(codigoPlan) {
  const codigo = normalizar(codigoPlan);

  const base = Object.fromEntries(
    MODULOS.map((modulo) => [modulo.codigo, false])
  );

  base.dashboard = true;
  base.usuarios = true;
  base.configuracion = true;

  if (codigo === "cobros") {
    return {
      ...base,
      clientes: true,
      vista_cliente: true,
      caja: true,
      cobranza: true,
      dashboard_cobros: true,
      gestor_cobros: true,
      inventario: true,
      movimientos_inventario: true,
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
      MODULOS.map((modulo) => [modulo.codigo, true])
    );
  }

  return base;
}

const COLUMNAS_EMPRESA = {
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

export default function Usuarios() {
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [planNombre, setPlanNombre] = useState("");
  const [planCodigo, setPlanCodigo] = useState("");

  const [modulosPermitidos, setModulosPermitidos] = useState({});
  const [modulosEmpresa, setModulosEmpresa] = useState({});

  const [roles, setRoles] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [permisosUsuario, setPermisosUsuario] = useState({});

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [seccionActiva, setSeccionActiva] = useState("modulos");
  const [gruposAbiertos, setGruposAbiertos] = useState({
    Panel: true,
  });

  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    const id =
      localStorage.getItem("empresaAdminCreadaId") ||
      localStorage.getItem("empresaId");

    if (!id) {
      alert("No hay empresa seleccionada.");
      router.replace("/login");
      return;
    }

    setEmpresaId(id);
    setCargando(true);

    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("id, nombre, plan_nombre, plan_codigo")
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

    const permitidos = construirModulosPorPlan(empresa.plan_codigo);

    setEmpresaNombre(empresa.nombre || "Empresa");
    setPlanNombre(empresa.plan_nombre || "Sin plan");
    setPlanCodigo(empresa.plan_codigo || "");
    setModulosPermitidos(permitidos);

    await Promise.all([
      cargarModulosEmpresa(id, permitidos),
      cargarRoles(),
      cargarUsuarios(id),
    ]);

    setCargando(false);
  }

  async function cargarModulosEmpresa(id, permitidos) {
    const { data, error } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", id)
      .maybeSingle();

    if (error) {
      alert("Error cargando módulos: " + error.message);
      setModulosEmpresa(permitidos);
      return;
    }

    const mapa = {};

    MODULOS.forEach((modulo) => {
      const permitido = Boolean(permitidos[modulo.codigo]);

      if (!permitido) {
        mapa[modulo.codigo] = false;
        return;
      }

      if (
        ["dashboard", "usuarios", "configuracion"].includes(
          modulo.codigo
        )
      ) {
        mapa[modulo.codigo] = true;
        return;
      }

      if (!data) {
        mapa[modulo.codigo] = true;
        return;
      }

      const columna = COLUMNAS_EMPRESA[modulo.codigo];

      mapa[modulo.codigo] =
        columna &&
        Object.prototype.hasOwnProperty.call(data, columna)
          ? Boolean(data[columna])
          : true;
    });

    setModulosEmpresa(mapa);
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
    setSeccionActiva("permisos");

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
    const permitido = Boolean(modulosPermitidos[modulo.codigo]);

    if (!permitido) {
      alert(`"${modulo.nombre}" no está incluido en ${planNombre}.`);
      return;
    }

    if (
      ["dashboard", "usuarios", "configuracion"].includes(
        modulo.codigo
      )
    ) {
      alert("Este módulo es obligatorio.");
      return;
    }

    const columna = COLUMNAS_EMPRESA[modulo.codigo];

    if (!columna) {
      alert(
        `El módulo "${modulo.nombre}" no tiene columna asociada en empresa_modulos.`
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
        { onConflict: "empresa_id" }
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
      const { error: errorPermisos } = await supabase
        .from("permisos_usuarios_empresa")
        .update({
          activo: false,
          updated_at: new Date().toISOString(),
        })
        .eq("empresa_id", empresaId)
        .in("permiso", relacionados);

      if (errorPermisos) {
        console.error(errorPermisos.message);
      }
    }
  }

  async function alternarPermiso(modulo) {
    if (!usuarioSeleccionado) {
      alert("Seleccione un usuario.");
      return;
    }

    if (!modulosPermitidos[modulo.codigo]) {
      alert(`"${modulo.nombre}" no está incluido en el plan.`);
      return;
    }

    if (!modulosEmpresa[modulo.codigo]) {
      alert(`"${modulo.nombre}" está desactivado para la empresa.`);
      return;
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
        { onConflict: "empresa_id,usuario_id,permiso" }
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

  async function aplicarPerfilRol() {
    if (!usuarioSeleccionado) {
      alert("Seleccione un usuario.");
      return;
    }

    const rolNormalizado = normalizar(usuarioSeleccionado.rol);
    const perfil =
      PERFILES_ROL[rolNormalizado] ||
      PERFILES_ROL.cajero;

    const registros = MODULOS.map((modulo) => {
      const habilitado =
        Boolean(modulosPermitidos[modulo.codigo]) &&
        Boolean(modulosEmpresa[modulo.codigo]);

      return {
        empresa_id: empresaId,
        usuario_id: usuarioSeleccionado.id,
        permiso: modulo.codigo,
        activo:
          habilitado &&
          perfil.includes(modulo.codigo),
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from("permisos_usuarios_empresa")
      .upsert(registros, {
        onConflict: "empresa_id,usuario_id,permiso",
      });

    if (error) {
      alert("No se pudo aplicar el perfil: " + error.message);
      return;
    }

    const mapa = {};
    registros.forEach((registro) => {
      mapa[registro.permiso] = registro.activo;
    });

    setPermisosUsuario(mapa);

    alert(
      `Permisos de ${usuarioSeleccionado.rol || "usuario"} aplicados correctamente.`
    );
  }

  async function desactivarTodosPermisos() {
    if (!usuarioSeleccionado) {
      alert("Seleccione un usuario.");
      return;
    }

    const registros = MODULOS.map((modulo) => ({
      empresa_id: empresaId,
      usuario_id: usuarioSeleccionado.id,
      permiso: modulo.codigo,
      activo: false,
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
      mapa[registro.permiso] = false;
    });

    setPermisosUsuario(mapa);
  }

  async function crearUsuario() {
    if (guardando) return;

    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim().toLowerCase();
    const passwordLimpio = password;
    const rolSeleccionado = roles.find(
      (rol) => String(rol.id) === String(rolId)
    );

    if (!empresaId) {
      alert("No hay una empresa seleccionada.");
      return;
    }

    if (!nombreLimpio) {
      alert("Ingrese el nombre del usuario.");
      return;
    }

    if (!correoLimpio || !correoLimpio.includes("@")) {
      alert("Ingrese un correo válido.");
      return;
    }

    if (!passwordLimpio || passwordLimpio.length < 8) {
      alert("La contraseña inicial debe tener mínimo 8 caracteres.");
      return;
    }

    if (!rolSeleccionado) {
      alert("Seleccione un rol válido.");
      return;
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
            password: passwordLimpio,
            rol: rolSeleccionado.nombre,
            rol_id: rolSeleccionado.id,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        let detalle = error.message || "No se pudo crear el usuario.";

        try {
          const contexto = await error.context?.json();
          if (contexto?.error) detalle = contexto.error;
        } catch {
          // Mantener el mensaje original.
        }

        alert(detalle);
        return;
      }

      if (!data?.ok) {
        alert(data?.error || "No se pudo crear el usuario.");
        return;
      }

      alert(data.message || "Usuario creado correctamente.");

      setNombre("");
      setCorreo("");
      setPassword("");

      const administrador = roles.find(
        (rol) => normalizar(rol.nombre) === "administrador"
      );

      setRolId(administrador?.id || roles[0]?.id || "");

      await cargarUsuarios(empresaId);

      if (data.usuario) {
        await seleccionarUsuario(data.usuario);
      }
    } catch (error) {
      alert(
        "No se pudo crear el usuario: " +
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
      const payload = {
        empresa_id: empresaId,
        clientes: Boolean(modulosEmpresa.clientes),
        vista_cliente: Boolean(modulosEmpresa.vista_cliente),
        venta_credito:
          Boolean(modulosEmpresa.creditos) ||
          Boolean(modulosEmpresa.ventas),
        caja: Boolean(modulosEmpresa.caja),
        control_caja: Boolean(modulosEmpresa.control_caja),
        cobranza: Boolean(modulosEmpresa.cobranza),
        dashboard_cobros: Boolean(modulosEmpresa.dashboard_cobros),
        inventario:
          Boolean(modulosEmpresa.inventario) ||
          Boolean(modulosEmpresa.movimientos_inventario),
        dashboard_ventas: Boolean(modulosEmpresa.dashboard_ventas),
        suscripciones: Boolean(modulosEmpresa.suscripciones),
        recargos: Boolean(modulosEmpresa.recargos),
        egresos: Boolean(modulosEmpresa.gastos),
      };

      const { error: errorModulos } = await supabase
        .from("empresa_modulos")
        .upsert(payload, { onConflict: "empresa_id" });

      if (errorModulos) throw errorModulos;

      const { error: errorEmpresa } = await supabase
        .from("empresas")
        .update({ configuracion_completa: true })
        .eq("id", empresaId);

      if (errorEmpresa) throw errorEmpresa;

      localStorage.setItem("empresaId", empresaId);
      localStorage.setItem("empresaNombre", empresaNombre);
      localStorage.setItem("planCodigo", planCodigo);
      localStorage.setItem("planNombre", planNombre);

      alert("Configuración finalizada correctamente.");
      router.replace("/dashboard");
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

    if (!texto) return usuarios;

    return usuarios.filter((usuario) =>
      normalizar(
        `${usuario.nombre} ${usuario.correo} ${usuario.rol}`
      ).includes(texto)
    );
  }, [usuarios, busqueda]);

  const grupos = useMemo(() => {
    return MODULOS.reduce((resultado, modulo) => {
      if (!resultado[modulo.grupo]) {
        resultado[modulo.grupo] = [];
      }

      resultado[modulo.grupo].push(modulo);
      return resultado;
    }, {});
  }, []);

  function alternarGrupo(grupo) {
    setGruposAbiertos((previo) => ({
      ...previo,
      [grupo]: !previo[grupo],
    }));
  }

  if (cargando) {
    return (
      <div style={s.loading}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.loadingLogo}
        />
        <strong>Preparando usuarios y módulos</strong>
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
                Usuarios, roles y permisos
              </h1>

              <p style={s.subtitulo}>
                Empresa: <strong>{empresaNombre}</strong>
                <br />
                Plan: <strong>{planNombre || planCodigo}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            style={s.botonBlanco}
          >
            ← Dashboard
          </button>
        </header>

        <nav style={s.pasos}>
          <button
            type="button"
            onClick={() => setSeccionActiva("modulos")}
            style={
              seccionActiva === "modulos"
                ? s.pasoActivo
                : s.pasoNormal
            }
          >
            1. Módulos de la empresa
          </button>

          <button
            type="button"
            onClick={() => setSeccionActiva("usuarios")}
            style={
              seccionActiva === "usuarios"
                ? s.pasoActivo
                : s.pasoNormal
            }
          >
            2. Usuarios
          </button>

          <button
            type="button"
            onClick={() => setSeccionActiva("permisos")}
            style={
              seccionActiva === "permisos"
                ? s.pasoActivo
                : s.pasoNormal
            }
          >
            3. Permisos
          </button>
        </nav>

        {seccionActiva === "modulos" && (
          <section style={s.card}>
            <div style={s.encabezadoSeccion}>
              <div>
                <span style={s.numeroPaso}>PASO 1</span>
                <h2 style={s.tituloSeccion}>
                  Módulos disponibles para la empresa
                </h2>
                <p style={s.textoSuave}>
                  Aquí defines qué funciones están habilitadas según el plan contratado.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSeccionActiva("usuarios")}
                style={s.botonSiguiente}
              >
                Continuar a usuarios →
              </button>
            </div>

            <div style={s.modulosGrid}>
              {MODULOS.map((modulo) => {
                const permitido = Boolean(
                  modulosPermitidos[modulo.codigo]
                );

                const activo = Boolean(
                  modulosEmpresa[modulo.codigo]
                );

                const obligatorio = [
                  "dashboard",
                  "usuarios",
                  "configuracion",
                ].includes(modulo.codigo);

                return (
                  <button
                    key={modulo.codigo}
                    type="button"
                    onClick={() => alternarModuloEmpresa(modulo)}
                    style={
                      !permitido
                        ? s.moduloBloqueado
                        : activo
                        ? s.moduloActivo
                        : s.moduloInactivo
                    }
                  >
                    <span style={s.moduloIcono}>
                      {modulo.icono}
                    </span>

                    <span style={s.moduloTexto}>
                      <strong>{modulo.nombre}</strong>
                      <small>
                        {!permitido
                          ? "No incluido en el plan"
                          : obligatorio
                          ? "Obligatorio"
                          : activo
                          ? "Activo para la empresa"
                          : "Desactivado"}
                      </small>
                    </span>

                    <span
                      style={
                        activo && permitido
                          ? s.switchOn
                          : s.switchOff
                      }
                    >
                      <span style={s.circulo} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {seccionActiva === "usuarios" && (
          <section style={s.dosColumnas}>
            <article style={s.card}>
              <span style={s.numeroPaso}>PASO 2</span>
              <h2 style={s.tituloSeccion}>Crear usuario</h2>
              <p style={s.textoSuave}>
                Crea el acceso y luego selecciona al usuario para asignarle permisos.
              </p>

              <div style={s.grid}>
                <Campo label="Nombre">
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={s.input}
                  />
                </Campo>

                <Campo label="Correo">
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    style={s.input}
                    autoComplete="email"
                    placeholder="usuario@empresa.com"
                  />
                </Campo>

                <Campo label="Contraseña inicial">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={s.input}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                  />
                </Campo>

                <Campo label="Rol">
                  <select
                    value={rolId}
                    onChange={(e) => setRolId(e.target.value)}
                    style={s.input}
                  >
                    {roles.map((rol) => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <button
                type="button"
                onClick={crearUsuario}
                disabled={guardando}
                style={s.botonCrearUsuario}
              >
                {guardando ? "Creando usuario..." : "Crear usuario"}
              </button>
            </article>

            <article style={s.card}>
              <div style={s.encabezadoSeccion}>
                <div>
                  <span style={s.numeroPaso}>USUARIOS REGISTRADOS</span>
                  <h2 style={s.tituloSeccion}>
                    Selecciona un usuario
                  </h2>
                </div>
              </div>

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, correo o rol..."
                style={s.input}
              />

              <div style={s.usuariosLista}>
                {usuariosFiltrados.map((usuario) => (
                  <button
                    key={usuario.id}
                    type="button"
                    onClick={() => seleccionarUsuario(usuario)}
                    style={
                      usuarioSeleccionado?.id === usuario.id
                        ? s.usuarioActivo
                        : s.usuarioInactivo
                    }
                  >
                    <div style={s.avatarUsuario}>
                      {String(usuario.nombre || "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <span style={s.usuarioDatos}>
                      <strong>{usuario.nombre}</strong>
                      <small>{usuario.correo}</small>
                      <em>{usuario.rol || "Sin rol"}</em>
                    </span>

                    <span style={s.flecha}>→</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSeccionActiva("permisos")}
                disabled={!usuarioSeleccionado}
                style={
                  usuarioSeleccionado
                    ? s.botonSiguienteAncho
                    : s.botonDeshabilitado
                }
              >
                Configurar permisos →
              </button>
            </article>
          </section>
        )}

        {seccionActiva === "permisos" && (
          <section style={s.card}>
            <span style={s.numeroPaso}>PASO 3</span>

            {!usuarioSeleccionado ? (
              <div style={s.estadoVacio}>
                <div style={s.estadoIcono}>👤</div>
                <h2 style={s.tituloSeccion}>
                  Selecciona un usuario primero
                </h2>
                <p style={s.textoSuave}>
                  Ve al paso Usuarios y selecciona la persona que deseas configurar.
                </p>

                <button
                  type="button"
                  onClick={() => setSeccionActiva("usuarios")}
                  style={s.botonSiguiente}
                >
                  Ir a usuarios
                </button>
              </div>
            ) : (
              <>
                <div style={s.usuarioResumen}>
                  <div style={s.avatarGrande}>
                    {String(usuarioSeleccionado.nombre || "?")
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div>
                    <small style={s.etiquetaOscura}>
                      USUARIO SELECCIONADO
                    </small>
                    <h2 style={s.nombreUsuario}>
                      {usuarioSeleccionado.nombre}
                    </h2>
                    <p style={s.textoSuave}>
                      {usuarioSeleccionado.correo} ·{" "}
                      <strong>{usuarioSeleccionado.rol}</strong>
                    </p>
                  </div>
                </div>

                <div style={s.accionesPermisos}>
                  <button
                    type="button"
                    onClick={aplicarPerfilRol}
                    style={s.botonPerfil}
                  >
                    Aplicar permisos de {usuarioSeleccionado.rol}
                  </button>

                  <button
                    type="button"
                    onClick={desactivarTodosPermisos}
                    style={s.botonMiniGris}
                  >
                    Desactivar todo
                  </button>
                </div>

                <div style={s.acordeones}>
                  {Object.entries(grupos).map(
                    ([grupo, modulos]) => {
                      const abierto = Boolean(gruposAbiertos[grupo]);

                      const activos = modulos.filter(
                        (modulo) =>
                          Boolean(permisosUsuario[modulo.codigo])
                      ).length;

                      return (
                        <section key={grupo} style={s.acordeon}>
                          <button
                            type="button"
                            onClick={() => alternarGrupo(grupo)}
                            style={s.acordeonCabecera}
                          >
                            <span>
                              <strong>{grupo}</strong>
                              <small>
                                {activos} permiso(s) activo(s)
                              </small>
                            </span>

                            <span style={s.acordeonFlecha}>
                              {abierto ? "−" : "+"}
                            </span>
                          </button>

                          {abierto && (
                            <div style={s.permisosCards}>
                              {modulos.map((modulo) => {
                                const permitidoPlan = Boolean(
                                  modulosPermitidos[modulo.codigo]
                                );

                                const activoEmpresa = Boolean(
                                  modulosEmpresa[modulo.codigo]
                                );

                                const habilitado =
                                  permitidoPlan && activoEmpresa;

                                const activo = Boolean(
                                  permisosUsuario[modulo.codigo]
                                );

                                return (
                                  <button
                                    key={modulo.codigo}
                                    type="button"
                                    onClick={() =>
                                      alternarPermiso(modulo)
                                    }
                                    style={
                                      !habilitado
                                        ? s.permisoBloqueado
                                        : activo
                                        ? s.permisoActivo
                                        : s.permisoNormal
                                    }
                                  >
                                    <span style={s.permisoIcono}>
                                      {modulo.icono}
                                    </span>

                                    <span style={s.permisoTexto}>
                                      <strong>{modulo.nombre}</strong>
                                      <small>
                                        {!permitidoPlan
                                          ? "No incluido en el plan"
                                          : !activoEmpresa
                                          ? "Desactivado para la empresa"
                                          : activo
                                          ? "Permitido"
                                          : "Sin permiso"}
                                      </small>
                                    </span>

                                    <span
                                      style={
                                        activo && habilitado
                                          ? s.switchOn
                                          : s.switchOff
                                      }
                                    >
                                      <span style={s.circulo} />
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </section>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  onClick={finalizarConfiguracion}
                  disabled={guardando}
                  style={s.botonVerde}
                >
                  {guardando
                    ? "Guardando..."
                    : "Finalizar configuración"}
                </button>
              </>
            )}
          </section>
        )}
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

const s = {
  pagina: {
    minHeight: "100vh",
    padding: 26,
    background:
      "linear-gradient(135deg,#ecfdf5 0%,#f3f4f6 45%,#fff 100%)",
    fontFamily: 'Inter, Arial, system-ui, sans-serif',
  },
  contenedor: {
    maxWidth: 1450,
    margin: "0 auto",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 12,
    background: "#f3f6f4",
  },
  loadingLogo: {
    width: 230,
    maxWidth: "75%",
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
  etiquetaOscura: {
    color: "#15803d",
    fontWeight: 900,
    letterSpacing: 1,
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
  pasos: {
    marginBottom: 18,
    padding: 8,
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 8,
    border: "1px solid #d1fae5",
    borderRadius: 16,
    background: "#ffffff",
    boxShadow: "0 8px 24px rgba(15,23,42,.06)",
  },
  pasoNormal: {
    minHeight: 48,
    border: "none",
    borderRadius: 11,
    background: "#f3f4f6",
    color: "#4b5563",
    fontWeight: 800,
    cursor: "pointer",
  },
  pasoActivo: {
    minHeight: 48,
    border: "none",
    borderRadius: 11,
    background:
      "linear-gradient(135deg,#15803d,#16a34a)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  card: {
    marginBottom: 18,
    padding: 24,
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    background: "#fff",
    boxShadow: "0 8px 22px rgba(0,0,0,.07)",
  },
  encabezadoSeccion: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  numeroPaso: {
    display: "inline-block",
    marginBottom: 6,
    color: "#15803d",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1.1,
  },
  tituloSeccion: {
    margin: 0,
    color: "#111827",
  },
  textoSuave: {
    marginTop: 6,
    color: "#6b7280",
  },
  modulosGrid: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(245px,1fr))",
    gap: 10,
  },
  moduloActivo: {
    padding: 13,
    display: "grid",
    gridTemplateColumns: "30px 1fr 50px",
    alignItems: "center",
    gap: 10,
    border: "1px solid #86efac",
    borderRadius: 14,
    background: "#ecfdf5",
    textAlign: "left",
    cursor: "pointer",
  },
  moduloInactivo: {
    padding: 13,
    display: "grid",
    gridTemplateColumns: "30px 1fr 50px",
    alignItems: "center",
    gap: 10,
    border: "1px solid #d1d5db",
    borderRadius: 14,
    background: "#fff",
    textAlign: "left",
    cursor: "pointer",
  },
  moduloBloqueado: {
    padding: 13,
    display: "grid",
    gridTemplateColumns: "30px 1fr 50px",
    alignItems: "center",
    gap: 10,
    border: "1px dashed #9ca3af",
    borderRadius: 14,
    background: "#f3f4f6",
    color: "#6b7280",
    textAlign: "left",
    cursor: "not-allowed",
  },
  moduloIcono: {
    fontSize: 21,
  },
  moduloTexto: {
    display: "grid",
    gap: 3,
  },
  dosColumnas: {
    display: "grid",
    gridTemplateColumns:
      "minmax(360px,.9fr) minmax(460px,1.1fr)",
    gap: 18,
    alignItems: "start",
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
    fontSize: 14,
  },
  botonCrearUsuario: {
    marginTop: 16,
    minHeight: 46,
    padding: "11px 22px",
    border: "none",
    borderRadius: 11,
    background:
      "linear-gradient(135deg,#16a34a,#15803d)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
    boxShadow:
      "0 8px 18px rgba(22,163,74,.22)",
  },
  usuariosLista: {
    marginTop: 14,
    display: "grid",
    gap: 10,
  },
  usuarioActivo: {
    padding: 14,
    display: "grid",
    gridTemplateColumns: "46px 1fr 24px",
    alignItems: "center",
    gap: 12,
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
    gridTemplateColumns: "46px 1fr 24px",
    alignItems: "center",
    gap: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#f9fafb",
    color: "#111827",
    textAlign: "left",
    cursor: "pointer",
  },
  avatarUsuario: {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#111827",
    color: "#fff",
    fontWeight: 900,
  },
  usuarioDatos: {
    display: "grid",
    gap: 3,
  },
  flecha: {
    fontSize: 22,
    fontWeight: 900,
  },
  botonSiguiente: {
    minHeight: 44,
    padding: "10px 17px",
    border: "none",
    borderRadius: 10,
    background: "#111827",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  botonSiguienteAncho: {
    width: "100%",
    marginTop: 16,
    minHeight: 46,
    border: "none",
    borderRadius: 11,
    background: "#111827",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  botonDeshabilitado: {
    width: "100%",
    marginTop: 16,
    minHeight: 46,
    border: "none",
    borderRadius: 11,
    background: "#d1d5db",
    color: "#6b7280",
    fontWeight: 850,
    cursor: "not-allowed",
  },
  estadoVacio: {
    minHeight: 350,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    textAlign: "center",
  },
  estadoIcono: {
    fontSize: 54,
  },
  usuarioResumen: {
    marginTop: 10,
    padding: 18,
    display: "flex",
    alignItems: "center",
    gap: 16,
    border: "1px solid #bbf7d0",
    borderRadius: 16,
    background: "#f0fdf4",
  },
  avatarGrande: {
    width: 64,
    height: 64,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#111827",
    color: "#fff",
    fontSize: 24,
    fontWeight: 900,
  },
  nombreUsuario: {
    margin: "3px 0",
  },
  accionesPermisos: {
    margin: "18px 0",
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  botonPerfil: {
    padding: "10px 16px",
    border: "none",
    borderRadius: 10,
    background:
      "linear-gradient(135deg,#15803d,#16a34a)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  botonMiniGris: {
    padding: "10px 16px",
    border: "none",
    borderRadius: 10,
    background: "#6b7280",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  acordeones: {
    display: "grid",
    gap: 10,
  },
  acordeon: {
    border: "1px solid #e5e7eb",
    borderRadius: 15,
    overflow: "hidden",
    background: "#f9fafb",
  },
  acordeonCabecera: {
    width: "100%",
    padding: 15,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "none",
    background: "#fff",
    color: "#111827",
    textAlign: "left",
    cursor: "pointer",
  },
  acordeonFlecha: {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#ecfdf5",
    color: "#15803d",
    fontSize: 22,
    fontWeight: 900,
  },
  permisosCards: {
    padding: 12,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: 8,
  },
  permisoNormal: {
    padding: 12,
    display: "grid",
    gridTemplateColumns: "28px 1fr 48px",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    textAlign: "left",
    cursor: "pointer",
  },
  permisoActivo: {
    padding: 12,
    display: "grid",
    gridTemplateColumns: "28px 1fr 48px",
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
    padding: 12,
    display: "grid",
    gridTemplateColumns: "28px 1fr 48px",
    alignItems: "center",
    gap: 10,
    border: "1px dashed #9ca3af",
    borderRadius: 12,
    background: "#f3f4f6",
    color: "#6b7280",
    textAlign: "left",
    cursor: "not-allowed",
  },
  permisoIcono: {
    fontSize: 20,
  },
  permisoTexto: {
    display: "grid",
    gap: 3,
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
  botonVerde: {
    width: "100%",
    marginTop: 20,
    minHeight: 50,
    border: "none",
    borderRadius: 12,
    background: "#16a34a",
    color: "#fff",
    fontSize: 16,
    fontWeight: 850,
    cursor: "pointer",
  },
};
