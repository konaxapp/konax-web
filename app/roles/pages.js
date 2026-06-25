"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [permisosRol, setPermisosRol] = useState([]);
  const [rolSeleccionado, setRolSeleccionado] = useState("");
  const [nombreRol, setNombreRol] = useState("");
  const [descripcionRol, setDescripcionRol] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (rolSeleccionado) {
      cargarPermisosDelRol(rolSeleccionado);
    }
  }, [rolSeleccionado]);

  async function cargarDatos() {
    const { data: rolesData, error: errorRoles } = await supabase
      .from("roles_konax")
      .select("*")
      .order("nombre", { ascending: true });

    if (errorRoles) {
      alert("Error cargando roles: " + errorRoles.message);
      return;
    }

    const { data: permisosData, error: errorPermisos } = await supabase
      .from("permisos_konax")
      .select("*")
      .order("modulo", { ascending: true })
      .order("accion", { ascending: true });

    if (errorPermisos) {
      alert("Error cargando permisos: " + errorPermisos.message);
      return;
    }

    setRoles(rolesData || []);
    setPermisos(permisosData || []);

    if (rolesData && rolesData.length > 0) {
      setRolSeleccionado(rolesData[0].id);
    }
  }

  async function cargarPermisosDelRol(rolId) {
    const { data, error } = await supabase
      .from("roles_permisos_konax")
      .select("permiso_id")
      .eq("rol_id", rolId)
      .eq("activo", true);

    if (error) {
      alert("Error cargando permisos del rol: " + error.message);
      return;
    }

    setPermisosRol((data || []).map((item) => item.permiso_id));
  }

  async function crearRol() {
    if (!nombreRol) {
      alert("Escriba el nombre del rol.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("roles_konax").insert([
      {
        nombre: nombreRol,
        descripcion: descripcionRol,
        activo: true,
      },
    ]);

    setGuardando(false);

    if (error) {
      alert("Error creando rol: " + error.message);
      return;
    }

    alert("Rol creado correctamente.");

    setNombreRol("");
    setDescripcionRol("");
    cargarDatos();
  }

  async function cambiarPermiso(permisoId, marcado) {
    if (!rolSeleccionado) return;

    if (marcado) {
      const { error } = await supabase.from("roles_permisos_konax").insert([
        {
          rol_id: rolSeleccionado,
          permiso_id: permisoId,
          activo: true,
        },
      ]);

      if (error) {
        alert("Error asignando permiso: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("roles_permisos_konax")
        .delete()
        .eq("rol_id", rolSeleccionado)
        .eq("permiso_id", permisoId);

      if (error) {
        alert("Error quitando permiso: " + error.message);
        return;
      }
    }

    cargarPermisosDelRol(rolSeleccionado);
  }

  function volver() {
    const empresaId = localStorage.getItem("empresaId");

    if (empresaId) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/admin";
    }
  }

  const permisosAgrupados = permisos.reduce((grupo, permiso) => {
    if (!grupo[permiso.modulo]) {
      grupo[permiso.modulo] = [];
    }

    grupo[permiso.modulo].push(permiso);
    return grupo;
  }, {});

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <p style={etiqueta}>Seguridad KONAX</p>
              <h1 style={titulo}>Roles y Permisos</h1>
              <p style={subtitulo}>
                Crea roles y define qué módulos puede ver o usar cada usuario.
              </p>
            </div>
          </div>

          <button onClick={volver} style={botonVolver}>
            ← Volver
          </button>
        </div>

        <div style={gridPrincipal}>
          <div style={card}>
            <h2 style={tituloSeccion}>Crear Nuevo Rol</h2>

            <Campo label="Nombre del rol">
              <input
                placeholder="Ej. Cajero, Vendedor, Supervisor"
                value={nombreRol}
                onChange={(e) => setNombreRol(e.target.value)}
                style={input}
              />
            </Campo>

            <Campo label="Descripción">
              <textarea
                placeholder="Describe qué hará este rol..."
                value={descripcionRol}
                onChange={(e) => setDescripcionRol(e.target.value)}
                style={textarea}
              />
            </Campo>

            <button onClick={crearRol} disabled={guardando} style={botonGuardar}>
              {guardando ? "Guardando..." : "Crear Rol"}
            </button>
          </div>

          <div style={card}>
            <h2 style={tituloSeccion}>Seleccionar Rol</h2>

            <Campo label="Rol">
              <select
                value={rolSeleccionado}
                onChange={(e) => setRolSeleccionado(e.target.value)}
                style={input}
              >
                {roles.length === 0 && <option>No hay roles creados</option>}

                {roles.map((rol) => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <div style={infoBox}>
              <strong>Roles creados:</strong> {roles.length}
              <br />
              <strong>Permisos disponibles:</strong> {permisos.length}
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Permisos del Rol</h2>
          <p style={textoSuave}>
            Marca lo que este rol podrá ver o hacer dentro del sistema.
          </p>

          {Object.keys(permisosAgrupados).length === 0 && (
            <div style={sinDatos}>
              No hay permisos creados. Primero debes cargar permisos en Supabase.
            </div>
          )}

          <div style={permisosGrid}>
            {Object.keys(permisosAgrupados).map((modulo) => (
              <div key={modulo} style={moduloCard}>
                <h3 style={moduloTitulo}>{formatearModulo(modulo)}</h3>

                {permisosAgrupados[modulo].map((permiso) => (
                  <label key={permiso.id} style={checkFila}>
                    <input
                      type="checkbox"
                      checked={permisosRol.includes(permiso.id)}
                      onChange={(e) =>
                        cambiarPermiso(permiso.id, e.target.checked)
                      }
                    />

                    <span>
                      <strong>{permiso.accion}</strong>
                      <br />
                      <small>{permiso.descripcion}</small>
                    </span>
                  </label>
                ))}
              </div>
            ))}
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

function formatearModulo(texto) {
  return String(texto || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

const pagina = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #ecfdf5 0%, #f3f4f6 45%, #ffffff 100%)",
  padding: "35px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1400px",
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

const gridPrincipal = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
  gap: "20px",
  marginBottom: "20px",
};

const card = {
  background: "#ffffff",
  padding: "26px",
  borderRadius: "20px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const tituloSeccion = {
  margin: "0 0 14px 0",
  color: "#111827",
};

const textoSuave = {
  color: "#6b7280",
  marginTop: "-5px",
  marginBottom: "18px",
};

const campo = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginBottom: "15px",
};

const labelStyle = {
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const textarea = {
  ...input,
  minHeight: "90px",
  resize: "vertical",
};

const botonGuardar = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "13px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const infoBox = {
  background: "#ecfdf5",
  color: "#064e3b",
  border: "1px solid #bbf7d0",
  padding: "14px",
  borderRadius: "14px",
  marginTop: "15px",
  lineHeight: "26px",
};

const permisosGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
  gap: "16px",
};

const moduloCard = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "18px",
};

const moduloTitulo = {
  marginTop: 0,
  color: "#111827",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "10px",
};

const checkFila = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
  cursor: "pointer",
};

const sinDatos = {
  background: "#fef3c7",
  color: "#92400e",
  padding: "15px",
  borderRadius: "12px",
  fontWeight: "bold",
};
