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
  const [guardando, setGuardando] = useState(false);

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

    if (admin) {
      setRolId(admin.id);
    } else if (rolesActivos.length > 0) {
      setRolId(rolesActivos[0].id);
    } else {
      setRolId("");
    }
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

    const { error } = await supabase.from("usuarios").insert([
      {
        empresa_id: empresaId,
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        password: password.trim(),
        rol_id: rolSeleccionado.id,
        rol: rolSeleccionado.nombre,
        estado: "Activo",
      },
    ]);

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
  }

  async function eliminarUsuario(id) {
    const confirmar = confirm("¿Deseas eliminar este usuario?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Error eliminando usuario: " + error.message);
      return;
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
        descripcion: `La empresa ${empresaNombre} quedó configurada con usuarios y roles.`,
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

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <p style={etiqueta}>Administración de Empresa</p>
              <h1 style={titulo}>Usuarios y Roles</h1>
              <p style={subtitulo}>
                Empresa seleccionada: <strong>{empresaNombre}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => (window.location.href = "/dashboard")}
            style={botonVolver}
          >
            ← Volver
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
              Crea usuarios para la empresa y asígnales un rol de acceso.
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
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: "16px",
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
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "20px",
};

const botonAzul = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "13px 24px",
  borderRadius: "10px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonNegro = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "13px 24px",
  borderRadius: "10px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
};

const tablaBox = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  overflowX: "auto",
  marginBottom: "22px",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "850px",
};

const thStyle = {
  textAlign: "left",
  padding: "13px",
  background: "#111827",
  color: "#ffffff",
  fontSize: "13px",
};

const tdStyle = {
  padding: "13px",
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

const nota = {
  color: "#6b7280",
  fontSize: "14px",
  marginBottom: "16px",
  textAlign: "center",
};

const botonVerde = {
  width: "100%",
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "16px",
  borderRadius: "12px",
  fontSize: "17px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(22,163,74,0.30)",
};
