"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [mostrarEmpresas, setMostrarEmpresas] = useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [guardando, setGuardando] = useState(false);

  const categorias = {
    "Ventas a Crédito": [
      "Mueblería",
      "Electrónica",
      "Distribuidora",
      "Cooperativa",
      "Financiera",
      "Casa de Empeño",
    ],
    "Suscripciones y Membresías": [
      "Gimnasio",
      "IPTV",
      "Internet y Cable",
      "Club",
      "Servicio por Membresía",
    ],
    Comercio: [
      "Ferretería",
      "Farmacia",
      "Tienda",
      "Mercado",
      "Repuestos",
      "Boutique",
      "Mueblería",
    ],
    Servicios: [
      "Lavandería",
      "Lavaauto",
      "Seguridad",
      "Limpieza",
      "Jardinería",
      "Mantenimiento",
      "Veterinaria",
      "Clínica",
      "Belleza",
      "Consultoría",
    ],
    Educación: [
      "Escuela",
      "Colegio",
      "Academia",
      "Centro de Capacitación",
    ],
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
  }

  function guardarEmpresaEnLocalStorage(empresa) {
    localStorage.setItem("empresaAdminCreadaId", empresa.id);
    localStorage.setItem("empresaAdminCreadaNombre", empresa.nombre || "");
    localStorage.setItem(
      "categoriaNegocioAdmin",
      empresa.categoria_negocio || ""
    );
    localStorage.setItem("tipoNegocioAdmin", empresa.tipo_negocio || "");

    localStorage.setItem("empresaId", empresa.id);
    localStorage.setItem("empresaNombre", empresa.nombre || "");
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
          estado: "Activo",
          estado_pago: "Pendiente",
          estado_plan: "Pendiente",
          configuracion_completa: false,
          plan_codigo: null,
          plan_nombre: null,
          plan_tipo: null,
          plan_precio: 0,
          fecha_activacion: null,
          fecha_ultimo_pago: null,
          fecha_proxima_facturacion: null,
        },
      ])
      .select()
      .single();

    setGuardando(false);

    if (error) {
      alert("Error al guardar empresa: " + error.message);
      return;
    }

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: data.id,
        empresa_nombre: data.nombre,
        accion: "Empresa creada",
        descripcion: `Se creó la empresa ${data.nombre} en KONAX. Pendiente de asignar plan.`,
        estado_anterior: null,
        estado_nuevo: "Activo",
        usuario: "KONAX",
      },
    ]);

    guardarEmpresaEnLocalStorage(data);
    limpiarFormulario();
    await cargarEmpresas();

    alert("Empresa creada correctamente. Ahora selecciona el plan.");
    window.location.href = "/planes";
  }

  function seleccionarEmpresa(empresa) {
    guardarEmpresaEnLocalStorage(empresa);
    alert("Empresa seleccionada: " + empresa.nombre);
  }

  function irPlan(empresa) {
    guardarEmpresaEnLocalStorage(empresa);
    window.location.href = "/planes";
  }

  function irUsuarioPrincipal(empresa) {
    guardarEmpresaEnLocalStorage(empresa);
    window.location.href = "/usuarios";
  }

  function irAdministrarEmpresa(empresa) {
    guardarEmpresaEnLocalStorage(empresa);
    window.location.href = `/admin-empresa?empresa=${empresa.id}`;
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <h1 style={titulo}>Empresas Clientes</h1>
              <p style={subtitulo}>
                Crea empresas, asigna plan, registra usuario principal y administra permisos.
              </p>
            </div>
          </div>

          <div style={accionesTop}>
            <button
              onClick={() => setMostrarEmpresas(!mostrarEmpresas)}
              style={botonOscuro}
            >
              {mostrarEmpresas ? "Ocultar Empresas" : "Ver Empresas Registradas"}
            </button>

            <Link href="/admin" style={botonVolver}>
              Volver al Admin
            </Link>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Nueva Empresa Cliente</h2>

          <div style={grid}>
            <Campo label="Nombre de la Empresa">
              <input
                type="text"
                placeholder="Ej. Lavandería El Sol"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Teléfono">
              <input
                type="text"
                placeholder="Ej. 6000-0000"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Correo">
              <input
                type="email"
                placeholder="empresa@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Dirección">
              <input
                type="text"
                placeholder="Dirección del negocio"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                style={inputStyle}
              />
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
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Tipo de Negocio">
              <select
                value={tipoNegocio}
                onChange={(e) => setTipoNegocio(e.target.value)}
                style={inputStyle}
                disabled={!categoria}
              >
                <option value="">Seleccione el tipo de negocio</option>
                {categoria &&
                  categorias[categoria].map((negocio) => (
                    <option key={negocio} value={negocio}>
                      {negocio}
                    </option>
                  ))}
              </select>
            </Campo>
          </div>

          <div style={accionesFormulario}>
            <button onClick={guardarEmpresa} style={boton} disabled={guardando}>
              {guardando ? "Guardando..." : "Crear Empresa"}
            </button>

            <button onClick={limpiarFormulario} style={botonGris}>
              Limpiar
            </button>
          </div>
        </div>

        {mostrarEmpresas && (
          <div style={card}>
            <h2 style={tituloSeccion}>Empresas Registradas</h2>

            <div style={{ overflowX: "auto" }}>
              <table style={tabla}>
                <thead>
                  <tr>
                    <th style={th}>Empresa</th>
                    <th style={th}>Teléfono</th>
                    <th style={th}>Negocio</th>
                    <th style={th}>Plan</th>
                    <th style={th}>Pago</th>
                    <th style={th}>Servicio</th>
                    <th style={th}>Facturación</th>
                    <th style={th}>Config.</th>
                    <th style={th}>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {empresas.length === 0 ? (
                    <tr>
                      <td style={td} colSpan="9">
                        No hay empresas registradas.
                      </td>
                    </tr>
                  ) : (
                    empresas.map((empresa) => (
                      <tr key={empresa.id}>
                        <td style={td}>
                          <strong>{empresa.nombre}</strong>
                          <br />
                          <span style={textoPequeno}>
                            {empresa.correo || "-"}
                          </span>
                        </td>

                        <td style={td}>{empresa.telefono || "-"}</td>

                        <td style={td}>
                          {empresa.categoria_negocio || "-"}
                          <br />
                          <span style={textoPequeno}>
                            {empresa.tipo_negocio || "-"}
                          </span>
                        </td>

                        <td style={td}>{empresa.plan_nombre || "Sin plan"}</td>

                        <td style={td}>
                          {empresa.estado_pago || "Pendiente"}
                        </td>

                        <td style={td}>
                          <span
                            style={
                              empresa.estado === "Activo" ||
                              empresa.estado === "Activa"
                                ? estadoActivo
                                : estadoInactivo
                            }
                          >
                            {empresa.estado || "Activo"}
                          </span>
                        </td>

                        <td style={td}>
                          {empresa.fecha_proxima_facturacion || "-"}
                        </td>

                        <td style={td}>
                          {empresa.configuracion_completa
                            ? "Completa"
                            : "Pendiente"}
                        </td>

                        <td style={td}>
                          <button
                            style={botonMiniVerde}
                            onClick={() => irAdministrarEmpresa(empresa)}
                          >
                            Administrar
                          </button>

                          <button
                            style={botonMini}
                            onClick={() => irPlan(empresa)}
                          >
                            Plan
                          </button>

                          <button
                            style={botonMini}
                            onClick={() => irUsuarioPrincipal(empresa)}
                          >
                            Usuario
                          </button>

                          <button
                            style={botonMiniGris}
                            onClick={() => seleccionarEmpresa(empresa)}
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p style={nota}>
              Usa “Administrar” para entrar a la empresa y configurar módulos, roles, usuarios y permisos.
            </p>
          </div>
        )}
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
  background: "#eef2f7",
  padding: "30px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1500px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #1e40af)",
  color: "#ffffff",
  padding: "26px",
  borderRadius: "20px",
  marginBottom: "22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
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
  borderRadius: "14px",
  padding: "8px",
};

const accionesTop = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const titulo = {
  fontSize: "34px",
  margin: 0,
};

const subtitulo = {
  color: "#dbeafe",
  marginTop: "6px",
  maxWidth: "700px",
};

const card = {
  background: "#ffffff",
  padding: "24px",
  borderRadius: "18px",
  marginBottom: "20px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
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
  padding: "12px",
  borderRadius: "9px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
};

const accionesFormulario = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const boton = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  padding: "13px 24px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonGris = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "13px 24px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonOscuro = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "11px 18px",
  borderRadius: "9px",
  textDecoration: "none",
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
  border: "1px solid #ffffff",
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
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "5px",
  marginBottom: "5px",
};

const botonMiniVerde = {
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

const botonMiniGris = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "5px",
  marginBottom: "5px",
};

const nota = {
  marginTop: "12px",
  color: "#6b7280",
  fontSize: "13px",
};
