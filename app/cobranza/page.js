"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Usuarios() {
  const [empresaId, setEmpresaId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState("Administrador");
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    cargarEmpresaActiva();
  }, []);

  useEffect(() => {
    if (empresaId) {
      cargarUsuarios();
    }
  }, [empresaId]);

  function actualizarCantidadUsuarios(listaUsuarios) {
    const totalUsuarios = listaUsuarios.length;

    localStorage.setItem("cantidadUsuarios", String(totalUsuarios));

    const empresaConfigurada = localStorage.getItem("empresaConfigurada");

    if (empresaConfigurada) {
      const datosEmpresa = JSON.parse(empresaConfigurada);

      localStorage.setItem(
        "empresaConfigurada",
        JSON.stringify({
          ...datosEmpresa,
          usuarios: totalUsuarios,
        })
      );
    }
  }

  function cargarEmpresaActiva() {
    const empresaIdGuardado = localStorage.getItem("empresaId");

    if (!empresaIdGuardado) {
      alert("No hay empresa activa. Configure la empresa antes de agregar usuarios.");
      return;
    }

    setEmpresaId(empresaIdGuardado);
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

    const listaUsuarios = data || [];

    setUsuarios(listaUsuarios);
    actualizarCantidadUsuarios(listaUsuarios);
  }

  async function agregarUsuario() {
    if (!empresaId) {
      alert("No hay empresa activa.");
      return;
    }

    if (!nombre || !correo || !rol) {
      alert("Complete nombre, correo y rol.");
      return;
    }

    const { error } = await supabase.from("usuarios").insert([
      {
        empresa_id: empresaId,
        nombre,
        correo,
        rol,
        estado: "Activo",
      },
    ]);

    if (error) {
      alert("Error al agregar usuario: " + error.message);
      return;
    }

    setNombre("");
    setCorreo("");
    setRol("Administrador");

    await cargarUsuarios();
  }

  async function eliminarUsuario(id) {
    const confirmar = confirm("¿Desea eliminar este usuario?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Error al eliminar usuario: " + error.message);
      return;
    }

    await cargarUsuarios();
  }

  function finalizarConfiguracion() {
    const tieneAdministrador = usuarios.some(
      (usuario) => usuario.rol === "Administrador"
    );

    if (!tieneAdministrador) {
      alert("Debe agregar al menos un Administrador.");
      return;
    }

    actualizarCantidadUsuarios(usuarios);

    window.location.href = "/finalizar";
  }

  return (
    <div style={pagina}>
      <div style={card}>
        <h1 style={titulo}>Configura tu equipo de trabajo</h1>

        <p style={subtitulo}>Agrega los usuarios que utilizarán KONAX</p>

        <div style={campo}>
          <label>Nombre</label>
          <input
            type="text"
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={campo}>
          <label>Correo Electrónico</label>
          <input
            type="email"
            placeholder="correo@empresa.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={campo}>
          <label>Rol</label>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            style={inputStyle}
          >
            <option>Administrador</option>
            <option>Supervisor</option>
            <option>Gestor</option>
            <option>Caja</option>
            <option>Vendedor</option>
          </select>
        </div>

        <button onClick={agregarUsuario} style={botonAzul}>
          Agregar Usuario
        </button>

        <h2 style={{ marginBottom: "20px" }}>
          Usuarios agregados ({usuarios.length})
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
                    No hay usuarios agregados.
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
          Se requiere al menos un Administrador para finalizar la configuración.
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
  fontFamily: "Arial",
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
