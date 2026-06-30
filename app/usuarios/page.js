"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Usuarios() {
  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");

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
        { codigo: "recargos", nombre: "Recargos" },
      ],
    },
    {
      titulo: "Inventario y Ventas",
      icono: "📦",
      permisos: [
        { codigo: "inventario", nombre: "Inventario" },
        { codigo: "movimientos_inventario", nombre: "Movimientos de inventario" },
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

  const permisosDisponibles = gruposPermisos.flatMap((grupo) => grupo.permisos);

  useEffect(() => {
    const id =
      localStorage.getItem("empresaAdminCreadaId") ||
      localStorage.getItem("empresaId");

    const nombreEmpresa =
      localStorage.getItem("empresaAdminCreadaNombre") ||
      localStorage.getItem("empresaNombre");

    if (!id) {
      alert("No hay empresa seleccionada.");
      window.location.href = "/empresas";
      return;
    }

    setEmpresaId(id);
    setEmpresaNombre(nombreEmpresa || "Empresa seleccionada");
  }, []);

  useEffect(() => {
    if (empresaId) {
      cargarRoles();
      cargarUsuarios();
    }
  }, [empresaId]);

  async function cargarRoles() {
    const { data, error } = await supabase
      .from("roles_konax")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando roles: " + error.message);
      return;
    }

    const rolesActivos = data || [];
    setRoles(rolesActivos);

    const admin = rolesActivos.find(
      (rol) => String(rol.nombre || "").toLowerCase().trim() === "administrador"
    );

    if (admin) setRolId(admin.id);
    else if (rolesActivos.length > 0) setRolId(rolesActivos[0].id);
    else setRolId("");
  }

  async function cargarUsuarios() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: true });

    if (error) {
      alert("Error cargando usuarios: " + error.message);
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
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("usuario_id", usuarioId);

    if (error) {
      alert("Error cargando permisos del usuario: " + error.message);
      return;
    }

    const permisosArmados = {};
    (data || []).forEach((permiso) => {
      permisosArmados[permiso.permiso] = permiso.activo;
    });

    setPermisosUsuario(permisosArmados);
  }

  function permisoActivo(codigo) {
    return Boolean(permisosUsuario?.[codigo]);
  }

  async function alternarPermiso(permiso) {
    if (!usuarioSeleccionado) {
      alert("Seleccione un usuario.");
      return;
    }

    const nuevoEstado = !permisoActivo(permiso.codigo);

    const { error } = await supabase.from("permisos_usuarios_empresa").upsert(
      {
        empresa_id: empresaId,
        usuario_id: usuarioSeleccionado.id,
        permiso: permiso.codigo,
        activo: nuevoEstado,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "empresa_id,usuario_id,permiso" }
    );

    if (error) {
      alert("Error actualizando permiso: " + error.message);
      return;
    }

    setPermisosUsuario((prev) => ({
      ...prev,
      [permiso.codigo]: nuevoEstado,
    }));
  }

  async function cambiarTodosPermisos(activo) {
    if (!usuarioSeleccionado) {
      alert("Seleccione un usuario.");
      return;
    }

    const registros = permisosDisponibles.map((permiso) => ({
      empresa_id: empresaId,
      usuario_id: usuarioSeleccionado.id,
      permiso: permiso.codigo,
      activo,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("permisos_usuarios_empresa")
      .upsert(registros, { onConflict: "empresa_id,usuario_id,permiso" });

    if (error) {
      alert("Error actualizando permisos: " + error.message);
      return;
    }

    const nuevos = {};
    permisosDisponibles.forEach((permiso) => {
      nuevos[permiso.codigo] = activo;
    });

    setPermisosUsuario(nuevos);
  }

  function limpiarFormulario() {
    setNombre("");
    setCorreo("");
    setPassword("");

    const admin = roles.find(
      (rol) => String(rol.nombre || "").toLowerCase().trim() === "administrador"
    );

    if (admin) setRolId(admin.id);
  }

  async function crearUsuario() {
    if (!empresaId) {
      alert("No hay empresa seleccionada.");
      return;
    }

    if (!nombre || !correo || !password || !rolId) {
      alert("Complete nombre, correo, contraseña y rol.");
      return;
    }

    const rolSeleccionado = roles.find((rol) => rol.id === rolId);

    if (!rolSeleccionado) {
      alert("Seleccione un rol válido.");
      return;
    }

    setGuardando(true);

    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          empresa_id: empresaId,
          nombre: nombre.trim(),
          correo: correo.trim().toLowerCase(),
          password: password.trim(),
          rol_id: rolSeleccionado.id,
          rol: rolSeleccionado.nombre,
          estado: "Activo",
        },
      ])
      .select()
      .single();

    setGuardando(false);

    if (error) {
      alert("Error creando usuario: " + error.message);
      return;
    }

    const esAdministrador =
      String(rolSeleccionado.nombre || "").toLowerCase().trim() ===
      "administrador";

    const permisosIniciales = permisosDisponibles.map((permiso) => ({
      empresa_id: empresaId,
      usuario_id: data.id,
      permiso: permiso.codigo,
      activo: esAdministrador,
      updated_at: new Date().toISOString(),
    }));

    const { error: errorPermisos } = await supabase
      .from("permisos_usuarios_empresa")
      .upsert(permisosIniciales, {
        onConflict: "empresa_id,usuario_id,permiso",
      });

    if (errorPermisos) {
      alert(
        "Usuario creado, pero hubo error creando permisos: " +
          errorPermisos.message
      );
      return;
    }

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        accion: "Usuario creado",
        descripcion: `Se creó el usuario ${nombre} con rol ${rolSeleccionado.nombre} para ${empresaNombre}.`,
        estado_anterior: null,
        estado_nuevo: "Usuario activo",
        usuario: "KONAX",
      },
    ]);

    alert("Usuario creado correctamente.");

    limpiarFormulario();
    await cargarUsuarios();

    if (data) {
      seleccionarUsuario(data);
    }
  }

  async function eliminarUsuario(id) {
    const confirmar = confirm("¿Deseas eliminar este usuario?");
    if (!confirmar) return;

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
      alert("Error eliminando usuario: " + error.message);
      return;
    }

    if (usuarioSeleccionado?.id === id) {
      setUsuarioSeleccionado(null);
      setPermisosUsuario({});
      setBusquedaUsuario("");
    }

    await cargarUsuarios();
  }

  async function finalizarConfiguracion() {
    const { data: usuariosActuales, error: errorUsuarios } = await supabase
      .from("usuarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("estado", "Activo")
      .order("created_at", { ascending: true });

    if (errorUsuarios) {
      alert("Error verificando usuarios: " + errorUsuarios.message);
      return;
    }

    const administradorEmpresa = (usuariosActuales || []).find(
      (usuario) =>
        String(usuario.rol || "").toLowerCase().trim() === "administrador"
    );

    if (!administradorEmpresa) {
      alert("Debe crear al menos un administrador activo.");
      return;
    }

    const { data: empresaActualizada, error } = await supabase
      .from("empresas")
      .update({ configuracion_completa: true })
      .eq("id", empresaId)
      .select("*")
      .maybeSingle();

    if (error) {
      alert("Error finalizando configuración: " + error.message);
      return;
    }

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        accion: "Configuración finalizada",
        descripcion: `La empresa ${empresaNombre} quedó configurada con usuarios y permisos individuales.`,
        estado_anterior: "Pendiente",
        estado_nuevo: "Completa",
        usuario: "KONAX",
      },
    ]);

    localStorage.removeItem("adminKonaxId");
    localStorage.removeItem("adminKonaxNombre");
    localStorage.removeItem("adminKonaxCorreo");
    localStorage.removeItem("adminKonaxRol");

    localStorage.removeItem("empresaAdminCreadaId");
    localStorage.removeItem("empresaAdminCreadaNombre");
    localStorage.removeItem("categoriaNegocioAdmin");
    localStorage.removeItem("tipoNegocioAdmin");

    localStorage.setItem("usuarioId", administradorEmpresa.id);
    localStorage.setItem("usuarioNombre", administradorEmpresa.nombre || "");
    localStorage.setItem("nombreUsuario", administradorEmpresa.nombre || "");
    localStorage.setItem("usuarioCorreo", administradorEmpresa.correo || "");
    localStorage.setItem("correoUsuario", administradorEmpresa.correo || "");

    localStorage.setItem("empresaId", empresaId);
    localStorage.setItem(
      "empresaNombre",
      empresaActualizada?.nombre || empresaNombre || ""
    );

    localStorage.setItem("usuarioRol", "Administrador");
    localStorage.setItem("rolUsuario", "Administrador");
    localStorage.setItem("rolId", administradorEmpresa.rol_id || "");

    localStorage.setItem("tipoNegocio", empresaActualizada?.tipo_negocio || "");
    localStorage.setItem(
      "categoriaNegocio",
      empresaActualizada?.categoria_negocio || ""
    );

    alert("Configuración finalizada.");
    window.location.replace("/dashboard");
  }

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function volverEmpresas() {
    window.location.href = "/empresas";
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = String(busquedaUsuario || "").toLowerCase().trim();

    if (!texto) return true;

    return (
      String(usuario.nombre || "").toLowerCase().includes(texto) ||
      String(usuario.correo || "").toLowerCase().includes(texto) ||
      String(usuario.rol || "").toLowerCase().includes(texto)
    );
  });

  const permisosActivos = permisosDisponibles.filter((permiso) =>
    permisoActivo(permiso.codigo)
  ).length;

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <p style={etiqueta}>Administración de Empresa</p>
              <h1 style={titulo}>Usuarios y Permisos</h1>
              <p style={subtitulo}>
                Empresa seleccionada: <strong>{empresaNombre}</strong>
              </p>
            </div>
          </div>

          <div style={heroBotones}>
            <button onClick={volverDashboard} style={botonBlanco}>
              ← Dashboard
            </button>

            <button onClick={volverEmpresas} style={botonClaro}>
              Empresas
            </button>
          </div>
        </div>

        <div style={resumenGrid}>
          <KPI titulo="Usuarios" valor={usuarios.length} icono="👥" />
          <KPI titulo="Roles" valor={roles.length} icono="🔐" />
          <KPI
            titulo="Permisos activos"
            valor={
              usuarioSeleccionado
                ? `${permisosActivos}/${permisosDisponibles.length}`
                : "-"
            }
            icono="✅"
          />
        </div>

        <div style={mainGrid}>
          <div>
            <div style={card}>
              <div style={cardHeader}>
                <h2 style={tituloSeccion}>Crear Usuario</h2>
                <p style={textoSuave}>
                  Crea usuarios y asígnales un rol inicial.
                </p>
              </div>

              <div style={grid}>
                <Campo label="Nombre">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={inputStyle}
                  />
                </Campo>

                <Campo label="Correo">
                  <input
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    style={inputStyle}
                  />
                </Campo>

                <Campo label="Contraseña">
                  <input
                    type="text"
                    placeholder="Ej. 123456"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                  />
                </Campo>

                <Campo label="Rol">
                  <select
                    value={rolId}
                    onChange={(e) => setRolId(e.target.value)}
                    style={inputStyle}
                  >
                    {roles.length === 0 && (
                      <option value="">No hay roles configurados</option>
                    )}

                    {roles.map((rol) => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <div style={acciones}>
                <button
                  onClick={crearUsuario}
                  style={botonAzul}
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Crear Usuario"}
                </button>

                <button onClick={limpiarFormulario} style={botonNegro}>
                  Limpiar
                </button>
              </div>
            </div>

            <div style={card}>
              <div style={cardHeader}>
                <h2 style={tituloSeccion}>Buscar usuario</h2>
                <p style={textoSuave}>
                  Selecciona un usuario para modificar sus permisos.
                </p>
              </div>

              <input
                value={busquedaUsuario}
                onChange={(e) => setBusquedaUsuario(e.target.value)}
                placeholder="Buscar por nombre, correo o rol..."
                style={inputStyle}
              />

              <div style={usuariosLista}>
                {usuariosFiltrados.map((usuario) => (
                  <button
                    key={usuario.id}
                    style={
                      usuarioSeleccionado?.id === usuario.id
                        ? usuarioActivo
                        : usuarioInactivo
                    }
                    onClick={() => seleccionarUsuario(usuario)}
                  >
                    <strong>{usuario.nombre}</strong>
                    <span>{usuario.correo}</span>
                    <small>{usuario.rol || "Sin rol"}</small>
                  </button>
                ))}

                {usuariosFiltrados.length === 0 && (
                  <p style={textoSuave}>No hay usuarios con esa búsqueda.</p>
                )}
              </div>
            </div>

            <div style={card}>
              <div style={cardHeader}>
                <h2 style={tituloSeccion}>
                  Usuarios de la Empresa ({usuarios.length})
                </h2>
                <p style={textoSuave}>
                  Administra los usuarios registrados para esta empresa.
                </p>
              </div>

              <div style={tablaBox}>
                <table style={tabla}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Nombre</th>
                      <th style={thStyle}>Correo</th>
                      <th style={thStyle}>Rol</th>
                      <th style={thStyle}>Estado</th>
                      <th style={thStyle}>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usuarios.length === 0 && (
                      <tr>
                        <td style={tdStyle} colSpan="5">
                          No hay usuarios creados.
                        </td>
                      </tr>
                    )}

                    {usuarios.map((usuario) => (
                      <tr key={usuario.id}>
                        <td style={tdStyle}>
                          <strong>{usuario.nombre}</strong>
                        </td>
                        <td style={tdStyle}>{usuario.correo}</td>
                        <td style={tdStyle}>{usuario.rol || "-"}</td>
                        <td style={tdStyle}>
                          <span
                            style={
                              usuario.estado === "Activo"
                                ? estadoActivo
                                : estadoInactivo
                            }
                          >
                            {usuario.estado || "Activo"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <button
                            style={botonEliminar}
                            onClick={() => eliminarUsuario(usuario.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={finalizarConfiguracion} style={botonVerde}>
                Finalizar Configuración
              </button>
            </div>
          </div>

          <div style={panelPermisos}>
            {!usuarioSeleccionado ? (
              <div style={cardSticky}>
                <h2 style={tituloSeccion}>Permisos</h2>
                <p style={textoSuave}>
                  Selecciona un usuario para ver y editar sus permisos.
                </p>
              </div>
            ) : (
              <div style={cardSticky}>
                <div style={permisosHeader}>
                  <div>
                    <h2 style={tituloSeccion}>Permisos del usuario</h2>
                    <p style={textoSuave}>
                      <strong>{usuarioSeleccionado.nombre}</strong> ·{" "}
                      {usuarioSeleccionado.rol || "-"}
                    </p>
                  </div>

                  <div style={contadorPermisos}>
                    {permisosActivos}/{permisosDisponibles.length}
                  </div>
                </div>

                <div style={accionesPermisos}>
                  <button
                    style={botonMiniVerde}
                    onClick={() => cambiarTodosPermisos(true)}
                  >
                    Activar todo
                  </button>

                  <button
                    style={botonMiniGris}
                    onClick={() => cambiarTodosPermisos(false)}
                  >
                    Desactivar todo
                  </button>
                </div>

                <div style={gruposGrid}>
                  {gruposPermisos.map((grupo) => (
                    <div key={grupo.titulo} style={grupoCard}>
                      <h3 style={grupoTitulo}>
                        {grupo.icono} {grupo.titulo}
                      </h3>

                      <div style={permisosCards}>
                        {grupo.permisos.map((permiso) => {
                          const activo = permisoActivo(permiso.codigo);

                          return (
                            <button
                              key={permiso.codigo}
                              type="button"
                              onClick={() => alternarPermiso(permiso)}
                              style={activo ? permisoCardActivo : permisoCard}
                            >
                              <div>
                                <strong>{permiso.nombre}</strong>
                              </div>

                              <span style={activo ? switchOn : switchOff}>
                                <span style={activo ? circuloOn : circuloOff} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div style={campo}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function KPI({ titulo, valor, icono }) {
  return (
    <div style={resumenCard}>
      <div style={kpiIcono}>{icono}</div>
      <span style={resumenLabel}>{titulo}</span>
      <strong style={resumenValor}>{valor}</strong>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #ecfdf5 0%, #f3f4f6 45%, #ffffff 100%)",
  padding: "26px",
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
  gap: "20px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const heroInfo = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const logo = {
  width: "80px",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "8px",
};

const etiqueta = {
  margin: 0,
  color: "#bbf7d0",
  fontSize: "14px",
  fontWeight: "bold",
};

const titulo = {
  margin: "4px 0",
  fontSize: "34px",
  fontWeight: "bold",
};

const subtitulo = {
  color: "#dcfce7",
  marginTop: "6px",
};

const heroBotones = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const botonBlanco = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonClaro = {
  background: "#dcfce7",
  color: "#064e3b",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const resumenCard = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
  display: "grid",
  gap: "6px",
};

const kpiIcono = {
  fontSize: "24px",
};

const resumenLabel = {
  color: "#6b7280",
  fontSize: "13px",
};

const resumenValor = {
  color: "#111827",
  fontSize: "20px",
};

const mainGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(420px, 1fr) minmax(520px, 1.2fr)",
  gap: "18px",
  alignItems: "start",
};

const panelPermisos = {
  minWidth: 0,
};

const card = {
  background: "#ffffff",
  borderRadius: "20px",
  padding: "22px",
  marginBottom: "18px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const cardSticky = {
  background: "#ffffff",
  borderRadius: "20px",
  padding: "22px",
  marginBottom: "18px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
  position: "sticky",
  top: "18px",
};

const cardHeader = {
  marginBottom: "16px",
};

const tituloSeccion = {
  margin: 0,
  color: "#111827",
};

const textoSuave = {
  color: "#6b7280",
  marginTop: "6px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
};

const campo = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle = {
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
};

const acciones = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const botonAzul = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 22px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonNegro = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "12px 22px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const usuariosLista = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "10px",
  marginTop: "14px",
};

const usuarioActivo = {
  background: "#dcfce7",
  color: "#166534",
  border: "2px solid #16a34a",
  borderRadius: "14px",
  padding: "14px",
  display: "grid",
  gap: "5px",
  textAlign: "left",
  cursor: "pointer",
};

const usuarioInactivo = {
  background: "#f9fafb",
  color: "#111827",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "14px",
  display: "grid",
  gap: "5px",
  textAlign: "left",
  cursor: "pointer",
};

const permisosHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  marginBottom: "14px",
};

const contadorPermisos = {
  background: "#064e3b",
  color: "#ffffff",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const accionesPermisos = {
  display: "flex",
  gap: "10px",
  marginBottom: "16px",
  flexWrap: "wrap",
};

const botonMiniVerde = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "9px 14px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonMiniGris = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "9px 14px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const gruposGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: "14px",
};

const grupoCard = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
};

const grupoTitulo = {
  margin: "0 0 10px",
  color: "#111827",
  fontSize: "15px",
};

const permisosCards = {
  display: "grid",
  gap: "8px",
};

const permisoCard = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "11px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
  color: "#111827",
};

const permisoCardActivo = {
  background: "#ecfdf5",
  border: "1px solid #86efac",
  borderRadius: "12px",
  padding: "11px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
  color: "#166534",
};

const switchOn = {
  minWidth: "44px",
  height: "24px",
  borderRadius: "999px",
  background: "#16a34a",
  padding: "3px",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
};

const switchOff = {
  minWidth: "44px",
  height: "24px",
  borderRadius: "999px",
  background: "#d1d5db",
  padding: "3px",
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
};

const circuloOn = {
  width: "18px",
  height: "18px",
  borderRadius: "50%",
  background: "#ffffff",
  display: "block",
};

const circuloOff = {
  width: "18px",
  height: "18px",
  borderRadius: "50%",
  background: "#ffffff",
  display: "block",
};

const tablaBox = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  overflowX: "auto",
  marginBottom: "18px",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "760px",
};

const thStyle = {
  textAlign: "left",
  padding: "12px",
  background: "#111827",
  color: "#ffffff",
  fontSize: "13px",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f3f4f6",
  color: "#111827",
};

const estadoActivo = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const estadoInactivo = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const botonEliminar = {
  background: "#dc2626",
  color: "#ffffff",
  border: "none",
  padding: "8px 11px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botonVerde = {
  width: "100%",
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "15px",
  borderRadius: "12px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};
