"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Usuarios() {
  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("empresaAdminCreadaId");
    const nombreEmpresa = localStorage.getItem("empresaAdminCreadaNombre");

    if (!id) {
      alert("Primero debes crear o seleccionar una empresa.");
      window.location.href = "/empresas";
      return;
    }

    setEmpresaId(id);
    setEmpresaNombre(nombreEmpresa || "Empresa seleccionada");
  }, []);

  useEffect(() => {
    if (empresaId) {
      cargarUsuarios();
    }
  }, [empresaId]);

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

  async function crearAdministradorInicial() {
    if (!empresaId) {
      alert("No hay empresa seleccionada.");
      return;
    }

    if (!nombre || !correo || !password) {
      alert("Complete nombre, correo y contraseña.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("usuarios").insert([
      {
        empresa_id: empresaId,
        nombre,
        correo,
        password,
        rol: "Administrador",
        estado: "Activo",
      },
    ]);

    setGuardando(false);

    if (error) {
      alert("Error creando administrador: " + error.message);
      return;
    }

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        accion: "Usuario principal creado",
        descripcion: `Se creó el usuario administrador inicial para ${empresaNombre}.`,
        estado_anterior: null,
        estado_nuevo: "Usuario activo",
        usuario: "KONAX",
      },
    ]);

    alert("Administrador inicial creado correctamente.");

    setNombre("");
    setCorreo("");
    setPassword("");

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
    const tieneAdministrador = usuarios.some(
      (usuario) => usuario.rol === "Administrador" && usuario.estado === "Activo"
    );

    if (!tieneAdministrador) {
      alert("Debe crear al menos un administrador activo.");
      return;
    }

    const { error } = await supabase
      .from("empresas")
      .update({
        configuracion_completa: true,
      })
      .eq("id", empresaId);

    if (error) {
      alert("Error finalizando configuración: " + error.message);
      return;
    }

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        accion: "Configuración finalizada",
        descripcion: `La empresa ${empresaNombre} quedó configurada con usuario principal.`,
        estado_anterior: "Pendiente",
        estado_nuevo: "Completa",
        usuario: "KONAX",
      },
    ]);

    localStorage.removeItem("empresaAdminCreadaId");
    localStorage.removeItem("empresaAdminCreadaNombre");
    localStorage.removeItem("categoriaNegocioAdmin");
    localStorage.removeItem("tipoNegocioAdmin");

    alert("Configuración finalizada. Puedes entregar las credenciales al cliente.");

    window.location.href = "/admin";
  }

  return (
    <div style={pagina}>
      <div style={card}>
        <div style={header}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div>
            <h1 style={titulo}>Usuario Principal</h1>
            <p style={subtitulo}>
              Empresa seleccionada: <strong>{empresaNombre}</strong>
            </p>
          </div>
        </div>

        <div style={bloque}>
          <h2 style={tituloSeccion}>Crear Administrador Inicial</h2>

          <div style={campo}>
            <label>Nombre del Administrador</label>
            <input
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={campo}>
            <label>Correo de Acceso</label>
            <input
              type="email"
              placeholder="admin@empresa.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={campo}>
            <label>Contraseña de Acceso</label>
            <input
              type="text"
              placeholder="Ej. 123456"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            onClick={crearAdministradorInicial}
            style={botonAzul}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Crear Administrador Inicial"}
          </button>
        </div>

        <h2 style={{ marginBottom: "20px" }}>
          Administrador inicial creado ({usuarios.length})
        </h2>

        <div style={tablaBox}>
          <table style={tabla}>
            <thead style={{ background: "#f9fafb" }}>
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
                    No hay administrador creado.
                  </td>
                </tr>
              )}

              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td style={tdStyle}>{usuario.nombre}</td>
                  <td style={tdStyle}>{usuario.correo}</td>
                  <td style={tdStyle}>{usuario.rol}</td>
                  <td style={tdStyle}>{usuario.estado}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: "#dc2626",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                      onClick={() => eliminarUsuario(usuario.id)}
                    >
                      Eliminar
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={nota}>
          Este usuario será el acceso principal del cliente. Al finalizar, regresarás al panel administrativo.
        </p>

        <button onClick={finalizarConfiguracion} style={botonVerde}>
          Finalizar Configuración
        </button>

        <button onClick={() => (window.location.href = "/empresas")} style={botonNegro}>
          Volver a Empresas
        </button>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  display: "flex",
  justifyContent: "center",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const card = {
  width: "900px",
  background: "white",
  borderRadius: "16px",
  padding: "40px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const header = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "30px",
};

const logo = {
  width: "95px",
  height: "auto",
};

const titulo = {
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  color: "#666",
  marginTop: "6px",
};

const bloque = {
  background: "#f9fafb",
  padding: "22px",
  borderRadius: "14px",
  marginBottom: "30px",
  border: "1px solid #e5e7eb",
};

const tituloSeccion = {
  marginTop: 0,
  marginBottom: "18px",
  color: "#111827",
};

const campo = {
  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "8px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const botonAzul = {
  width: "100%",
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "15px",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const tablaBox = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  overflow: "hidden",
  marginBottom: "25px",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  textAlign: "left",
  padding: "15px",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "15px",
  borderBottom: "1px solid #f3f4f6",
};

const nota = {
  color: "#666",
  fontSize: "14px",
  marginBottom: "18px",
  textAlign: "center",
};

const botonVerde = {
  width: "100%",
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "18px",
  borderRadius: "12px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(22,163,74,0.30)",
  marginBottom: "12px",
};

const botonNegro = {
  width: "100%",
  background: "#111827",
  color: "white",
  border: "none",
  padding: "15px",
  borderRadius: "10px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
};
