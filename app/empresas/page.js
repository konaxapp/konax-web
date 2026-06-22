"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [tipoRecargo, setTipoRecargo] = useState("Sin recargo");
  const [estado, setEstado] = useState("Activo");
  const [guardando, setGuardando] = useState(false);

  const categorias = {
    "Ventas a Crédito": ["Mueblería", "Electrónica", "Distribuidora", "Cooperativa", "Financiera", "Casa de Empeño"],
    "Suscripciones y Membresías": ["Gimnasio", "IPTV", "Internet y Cable", "Club", "Servicio por Membresía"],
    Comercio: ["Ferretería", "Farmacia", "Tienda", "Mercado", "Repuestos", "Boutique"],
    Servicios: ["Seguridad", "Limpieza", "Jardinería", "Mantenimiento", "Veterinaria", "Clínica", "Belleza", "Consultoría"],
    Educación: ["Escuela", "Colegio", "Academia", "Centro de Capacitación"],
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  async function cargarEmpresas() {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando empresas: " + error.message);
      return;
    }

    setEmpresas(data || []);
  }

  function limpiarFormulario() {
    setNombre("");
    setTelefono("");
    setCorreo("");
    setDireccion("");
    setCategoria("");
    setTipoNegocio("");
    setTipoRecargo("Sin recargo");
    setEstado("Activo");
  }

  async function guardarEmpresa() {
    if (!nombre || !telefono || !categoria || !tipoNegocio) {
      alert("Complete nombre, teléfono, categoría y tipo de negocio.");
      return;
    }

    setGuardando(true);

    const { data, error } = await supabase
      .from("empresas")
      .insert([
        {
          nombre,
          telefono,
          correo,
          direccion,
          categoria_negocio: categoria,
          tipo_negocio: tipoNegocio,
          tipo_recargo: tipoRecargo,
          estado,
          configuracion_completa: false,
          estado_plan: "Pendiente",
          plan_codigo: null,
          plan_nombre: null,
          plan_tipo: null,
          plan_precio: 0,
        },
      ])
      .select()
      .single();

    setGuardando(false);

    if (error) {
      alert("Error al guardar empresa: " + error.message);
      return;
    }

    localStorage.setItem("empresaAdminCreadaId", data.id);
    localStorage.setItem("empresaAdminCreadaNombre", data.nombre || "");
    localStorage.setItem("categoriaNegocioAdmin", data.categoria_negocio || "");
    localStorage.setItem("tipoNegocioAdmin", data.tipo_negocio || "");

    alert("Empresa creada correctamente. Ahora selecciona el plan.");
    limpiarFormulario();
    cargarEmpresas();

    window.location.href = "/planes";
  }

  async function cambiarEstadoEmpresa(empresa, nuevoEstado) {
    const { error } = await supabase
      .from("empresas")
      .update({ estado: nuevoEstado })
      .eq("id", empresa.id);

    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }

    cargarEmpresas();
  }

  function seleccionarEmpresa(empresa) {
    localStorage.setItem("empresaAdminCreadaId", empresa.id);
    localStorage.setItem("empresaAdminCreadaNombre", empresa.nombre || "");
    localStorage.setItem("categoriaNegocioAdmin", empresa.categoria_negocio || "");
    localStorage.setItem("tipoNegocioAdmin", empresa.tipo_negocio || "");

    alert("Empresa seleccionada para configuración: " + empresa.nombre);
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={header}>
          <div>
            <h1 style={titulo}>Empresas Clientes</h1>
            <p style={subtitulo}>
              Crea empresas clientes para luego asignar plan, módulos y usuario administrador inicial.
            </p>
          </div>

          <Link href="/admin" style={botonVolver}>
            Volver al Admin
          </Link>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Nueva Empresa</h2>

          <div style={grid}>
            <Campo label="Nombre de la Empresa">
              <input type="text" placeholder="Ej. Hot Dog City" value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Teléfono">
              <input type="text" placeholder="Ej. 6000-0000" value={telefono} onChange={(e) => setTelefono(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Correo">
              <input type="email" placeholder="empresa@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Dirección">
              <input type="text" placeholder="Dirección del negocio" value={direccion} onChange={(e) => setDireccion(e.target.value)} style={inputStyle} />
            </Campo>

            <Campo label="Categoría del Negocio">
              <select
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value);
                  setTipoNegocio("");
                }}
                style={inputStyle}
              >
                <option value="">Seleccione una categoría</option>
                {Object.keys(categorias).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Tipo de Negocio">
              <select value={tipoNegocio} onChange={(e) => setTipoNegocio(e.target.value)} style={inputStyle} disabled={!categoria}>
                <option value="">Seleccione el tipo de negocio</option>
                {categoria &&
                  categorias[categoria].map((negocio) => (
                    <option key={negocio} value={negocio}>{negocio}</option>
                  ))}
              </select>
            </Campo>

            <Campo label="Tipo de Recargo">
              <select value={tipoRecargo} onChange={(e) => setTipoRecargo(e.target.value)} style={inputStyle}>
                <option>Sin recargo</option>
                <option>Mensual</option>
                <option>Semanal</option>
                <option>Diario</option>
                <option>Personalizado</option>
              </select>
            </Campo>

            <Campo label="Estado">
              <select value={estado} onChange={(e) => setEstado(e.target.value)} style={inputStyle}>
                <option>Activo</option>
                <option>Suspendido</option>
                <option>Cancelado</option>
              </select>
            </Campo>
          </div>

          <button onClick={guardarEmpresa} style={boton} disabled={guardando}>
            {guardando ? "Guardando..." : "Crear Empresa"}
          </button>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Empresas Registradas</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Empresa</th>
                  <th style={th}>Teléfono</th>
                  <th style={th}>Categoría</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Estado Plan</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Configuración</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {empresas.length === 0 ? (
                  <tr>
                    <td style={td} colSpan="9">No hay empresas registradas.</td>
                  </tr>
                ) : (
                  empresas.map((empresa) => (
                    <tr key={empresa.id}>
                      <td style={td}>
                        <strong>{empresa.nombre}</strong>
                        <br />
                        <span style={textoPequeno}>{empresa.correo || "-"}</span>
                      </td>

                      <td style={td}>{empresa.telefono || "-"}</td>
                      <td style={td}>{empresa.categoria_negocio || "-"}</td>
                      <td style={td}>{empresa.tipo_negocio || "-"}</td>
                      <td style={td}>{empresa.plan_nombre || "Sin plan"}</td>
                      <td style={td}>{empresa.estado_plan || "Pendiente"}</td>

                      <td style={td}>
                        <span style={empresa.estado === "Activo" || empresa.estado === "Activa" ? estadoActivo : estadoInactivo}>
                          {empresa.estado || "Activo"}
                        </span>
                      </td>

                      <td style={td}>
                        {empresa.configuracion_completa ? "Completa" : "Pendiente"}
                      </td>

                      <td style={td}>
                        <button style={botonMini} onClick={() => seleccionarEmpresa(empresa)}>
                          Seleccionar
                        </button>

                        <Link href="/planes" style={linkMini}>
                          Plan
                        </Link>

                        <Link href="/modulos" style={linkMini}>
                          Módulos
                        </Link>

                        <Link href="/usuarios" style={linkMini}>
                          Admin
                        </Link>

                        <button style={botonNaranja} onClick={() => cambiarEstadoEmpresa(empresa, "Suspendido")}>
                          Suspender
                        </button>

                        <button style={botonMini} onClick={() => cambiarEstadoEmpresa(empresa, "Activo")}>
                          Activar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p style={nota}>
            Flujo: crear empresa → asignar plan → activar módulos → crear usuario administrador inicial.
          </p>
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

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "30px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1500px",
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const titulo = {
  fontSize: "34px",
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  marginTop: "6px",
  maxWidth: "700px",
};

const card = {
  background: "#ffffff",
  padding: "22px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const tituloSeccion = {
  marginTop: 0,
  marginBottom: "18px",
  color: "#111827",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
  gap: "15px",
};

const campo = {
  marginBottom: "12px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const boton = {
  marginTop: "18px",
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  padding: "13px 24px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonVolver = {
  background: "#111827",
  color: "#ffffff",
  padding: "11px 18px",
  borderRadius: "9px",
  textDecoration: "none",
  fontWeight: "bold",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  background: "#111827",
  color: "#ffffff",
  padding: "12px",
  textAlign: "left",
  fontSize: "13px",
};

const td = {
  padding: "11px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
  verticalAlign: "top",
};

const textoPequeno = {
  color: "#6b7280",
  fontSize: "12px",
};

const estadoActivo = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const estadoInactivo = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const botonMini = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "5px",
  marginBottom: "5px",
};

const botonNaranja = {
  background: "#f97316",
  color: "#ffffff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "5px",
  marginBottom: "5px",
};

const linkMini = {
  display: "inline-block",
  background: "#111827",
  color: "#ffffff",
  padding: "7px 10px",
  borderRadius: "7px",
  fontWeight: "bold",
  textDecoration: "none",
  marginRight: "5px",
  marginBottom: "5px",
};

const nota = {
  marginTop: "12px",
  color: "#6b7280",
  fontSize: "13px",
};
