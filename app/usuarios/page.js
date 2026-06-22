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
      .update({ configuracion_completa: true })
      .eq("id", empresaId);

    if (error) {
      alert("Error finalizando configuración: " + error.message);
      return;
    }

    alert("Configuración finalizada. Ya puedes entregar las credenciales al cliente.");
    window.location.href = "/dashboard";
  }

  return (
    <div style={pagina}>
      <div style={card}>
        <h1 style={titulo}>Usuario Administrador Inicial</h1>

        <p style={subtitulo}>
          Empresa seleccionada: <strong>{empresaNombre}</strong>
        </p>

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
          Este usuario será el primer acceso del cliente para entrar al Dashboard.
        </p>

        <button onClick={finalizarConfiguracion} style={botonVerde}>
          Finalizar Configuración
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

const titulo = {
  textAlign: "center",
  marginBottom: "10px",
};

const subtitulo = {
  textAlign: "center",
  color: "#666",
  marginBottom: "40px",
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
  marginBottom: "40px",
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
  marginBottom: "25px",
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
};
