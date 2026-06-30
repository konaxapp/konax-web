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

  const permisosDisponibles = [
    { codigo: "dashboard", nombre: "Inicio / Resumen" },
    { codigo: "clientes", nombre: "Clientes" },
    { codigo: "cuentas_por_cobrar", nombre: "Cuentas por cobrar" },
    { codigo: "vista_cliente", nombre: "Vista Cliente" },
    { codigo: "ventas_credito", nombre: "Créditos" },
    { codigo: "caja", nombre: "Caja" },
    { codigo: "control_caja", nombre: "Control Caja" },
    { codigo: "cobranza", nombre: "Cobranza" },
    { codigo: "dashboard_cobros", nombre: "Centro de Cobranza" },
    { codigo: "gestor_cobros", nombre: "Gestor de Cobros" },
    { codigo: "inventario", nombre: "Inventario" },
    { codigo: "inventario_nuevo", nombre: "Nuevo Producto" },
    { codigo: "suscripciones", nombre: "Suscripciones" },
    { codigo: "recargos", nombre: "Recargos" },
    { codigo: "dashboard_ventas", nombre: "Centro de Ventas" },
    { codigo: "gastos", nombre: "Gastos" },
    { codigo: "usuarios", nombre: "Usuarios y Roles" },
  ];

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

    const activoActual = permisoActivo(permiso.codigo);
    const nuevoEstado = !activoActual;

    const { error } = await supabase.from("permisos_usuarios_empresa").upsert(
      {
        empresa_id: empresaId,
        usuario_id: usuarioSeleccionado.id,
        permiso: permiso.codigo,
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

    setPermisosUsuario((prev) => ({
      ...prev,
      [permiso.codigo]: nuevoEstado,
    }));
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
      .update({
        configuracion_completa: true,
      })
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

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = String(busquedaUsuario || "").toLowerCase().trim();

    if (!texto) return true;

    return (
      String(usuario.nombre || "").toLowerCase().includes(texto) ||
      String(usuario.correo || "").toLowerCase().includes(texto) ||
      String(usuario.rol || "").toLowerCase().includes(texto)
    );
  });

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

          <button
            onClick={() => (window.location.href = "/empresas")}
            style={botonVolver}
          >
            ← Volver a Empresas
          </button>
        </div>

        <div style={resumenGrid}>
          <KPI titulo="Usuarios creados" valor={usuarios.length} icono="👥" />
          <KPI titulo="Roles disponibles" valor={roles.length} icono="🔐" />
          <KPI titulo="Empresa" valor={empresaNombre} icono="🏢" />
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <h2 style={tituloSeccion}>Crear Usuario</h2>
            <p style={textoSuave}>
              Crea usuarios para la empresa y asígnales un rol.
            </p>
          </div>

          <div style={grid}>
            <Campo label="Nombre del Usuario">
              <input
                type="text"
                placeholder="Nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Correo de Acceso">
              <input
                type="email"
                placeholder="usuario@empresa.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Contraseña de Acceso">
              <input
                type="text"
                placeholder="Ej. 123456"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Rol del Usuario">
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
            <h2 style={tituloSeccion}>Buscar usuario para permisos</h2>
            <p style={textoSuave}>
              Selecciona un usuario y activa o desactiva sus funciones.
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

        {usuarioSeleccionado && (
          <div style={card}>
            <div style={cardHeader}>
              <h2 style={tituloSeccion}>Permisos del usuario</h2>
              <p style={textoSuave}>
                Usuario seleccionado:{" "}
                <strong>{usuarioSeleccionado.nombre}</strong> · Rol:{" "}
                <strong>{usuarioSeleccionado.rol || "-"}</strong>
              </p>
            </div>

            <div style={permisosLista}>
              {permisosDisponibles.map((permiso) => {
                const activo = permisoActivo(permiso.codigo);

                return (
                  <div key={permiso.codigo} style={permisoFila}>
                    <div>
                      <strong style={permisoNombre}>{permiso.nombre}</strong>
                      <p style={permisoCodigo}>{permiso.codigo}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => alternarPermiso(permiso)}
                      style={activo ? switchActivo : switchInactivo}
                    >
                      <span
                        style={
                          activo ? switchCirculoActivo : switchCirculoInactivo
                        }
                      />
                    </button>

                    <span style={activo ? textoActivo : textoInactivo}>
                      {activo ? "Activado" : "Desactivado"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={card}>
          <div style={cardHeader}>
            <h2 style={tituloSeccion}>
              Usuarios de la Empresa ({usuarios.length})
            </h2>
            <p style={textoSuave}>
              Debe existir al menos un Administrador activo para finalizar.
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

          <p style={nota}>
            Al finalizar, la empresa quedará lista para ingresar al Centro de
            Operaciones.
          </p>

          <button onClick={finalizarConfiguracion} style={botonVerde}>
            Finalizar Configuración
          </button>
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
  padding: "35px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "28px",
  borderRadius: "22px",
  marginBottom: "22px",
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
  gap: "18px",
};

const logo = {
  width: "85px",
  height: "auto",
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
  fontSize: "36px",
  fontWeight: "bold",
};

const subtitulo = {
  color: "#dcfce7",
  marginTop: "6px",
};

const botonVolver = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 18px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const resumenCard = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
  display: "grid",
  gap: "6px",
};

const kpiIcono = {
  fontSize: "26px",
};

const resumenLabel = {
  color: "#6b7280",
  fontSize: "13px",
};

const resumenValor = {
  color: "#111827",
  fontSize: "20px",
};

const card = {
  background: "#ffffff",
  borderRadius: "20px",
  padding: "26px",
  marginBottom: "20px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const cardHeader = {
  marginBottom: "18px",
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
  gridTemplate
