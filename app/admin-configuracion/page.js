"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminConfiguracion() {
  const [seccion, setSeccion] = useState("perfil");
  const [empresa, setEmpresa] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  function obtenerEmpresaId() {
    return localStorage.getItem("empresaId");
  }

  function obtenerUsuarioId() {
    return localStorage.getItem("usuarioId");
  }

  function esAdministrador() {
    const rol = String(localStorage.getItem("usuarioRol") || "")
      .toLowerCase()
      .trim();

    return (
      rol === "administrador" ||
      rol === "superadmin" ||
      rol === "admin master" ||
      rol === "administrador master"
    );
  }

  async function cargarDatos() {
    setCargando(true);

    const empresaId = obtenerEmpresaId();
    const usuarioId = obtenerUsuarioId();

    if (!empresaId || !usuarioId) {
      alert("La sesión no es válida. Inicie sesión nuevamente.");
      localStorage.clear();
      window.location.href = "/login";
      return;
    }

    if (!esAdministrador()) {
      alert("No tienes permiso para acceder a configuración.");
      window.location.href = "/dashboard";
      return;
    }

    const { data: usuarioData, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", usuarioId)
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (errorUsuario) {
      alert("Error cargando usuario: " + errorUsuario.message);
      setCargando(false);
      return;
    }

    const { data: empresaData, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      alert("Error cargando empresa: " + errorEmpresa.message);
      setCargando(false);
      return;
    }

    setUsuario(usuarioData || null);
    setEmpresa(empresaData || null);
    setCargando(false);
  }

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function actualizarUsuario(campoNombre, valor) {
    setUsuario((prev) => ({
      ...prev,
      [campoNombre]: valor,
    }));
  }

  function actualizarEmpresa(campoNombre, valor) {
    setEmpresa((prev) => ({
      ...prev,
      [campoNombre]: valor,
    }));
  }

  async function guardarPerfil() {
    if (!usuario?.id) return;

    setGuardando(true);

    const { error } = await supabase
      .from("usuarios")
      .update({
        nombre: String(usuario.nombre || "").trim(),
        correo: String(usuario.correo || "").trim(),
      })
      .eq("id", usuario.id)
      .eq("empresa_id", obtenerEmpresaId());

    setGuardando(false);

    if (error) {
      alert("Error guardando perfil: " + error.message);
      return;
    }

    localStorage.setItem("usuarioNombre", usuario.nombre || "");
    localStorage.setItem("usuarioCorreo", usuario.correo || "");

    alert("Perfil actualizado correctamente.");
  }

  async function guardarEmpresa() {
    if (!empresa?.id) return;

    setGuardando(true);

    const { error } = await supabase
      .from("empresas")
      .update({
        nombre: String(empresa.nombre || "").trim(),
        telefono: String(empresa.telefono || "").trim(),
        correo: String(empresa.correo || "").trim(),
        direccion: String(empresa.direccion || "").trim(),
        tipo_negocio: String(empresa.tipo_negocio || "").trim(),
        categoria_negocio: String(empresa.categoria_negocio || "").trim(),
      })
      .eq("id", obtenerEmpresaId());

    setGuardando(false);

    if (error) {
      alert("Error guardando empresa: " + error.message);
      return;
    }

    localStorage.setItem("empresaNombre", empresa.nombre || "");
    localStorage.setItem("tipoNegocio", empresa.tipo_negocio || "");
    localStorage.setItem("categoriaNegocio", empresa.categoria_negocio || "");

    alert("Perfil empresarial actualizado correctamente.");
  }

  if (cargando) {
    return (
      <div style={cargandoPagina}>
        <div style={cargandoCard}>
          <img src="/konax-logo.png" alt="KONAX" style={logoCarga} />
          <strong>Cargando configuración...</strong>
          <p style={textoSuave}>Validando empresa y usuario.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroLeft}>
            <img src="/konax-logo.png" alt="KONAX" style={logoHero} />

            <div>
              <p style={eyebrow}>Panel Administrativo</p>
              <h1 style={titulo}>Configuraciones</h1>
              <p style={subtitulo}>
                Administra tu perfil, negocio y plan activo.
              </p>
            </div>
          </div>

          <button style={botonVolver} onClick={volverDashboard}>
            ← Volver al Dashboard
          </button>
        </div>

        <div style={resumenGrid}>
          <Resumen titulo="Empresa" valor={empresa?.nombre || "Sin empresa"} icono="🏢" />
          <Resumen titulo="Plan" valor={empresa?.plan_nombre || "Sin plan"} icono="💼" />
          <Resumen titulo="Usuario" valor={usuario?.nombre || "Usuario"} icono="👤" />
          <Resumen titulo="Estado" valor={empresa?.estado_plan || empresa?.estado || "Activo"} icono="✅" />
        </div>

        <div style={layout}>
          <aside style={menu}>
            <div style={menuBrand}>
              <img src="/konax-logo.png" alt="KONAX" style={logoMenu} />
              <div>
                <strong>KONAX</strong>
                <p style={menuMini}>Configuración</p>
              </div>
            </div>

            <Grupo titulo="Mi cuenta" />

            <Item
              texto="Mi perfil"
              icono="👤"
              activo={seccion === "perfil"}
              onClick={() => setSeccion("perfil")}
            />

            <Separador />

            <Grupo titulo="Mi negocio" />

            <Item
              texto="Perfil empresarial"
              icono="🏢"
              activo={seccion === "empresa"}
              onClick={() => setSeccion("empresa")}
            />

            <Item
              texto="Mi plan"
              icono="💼"
              activo={seccion === "plan"}
              onClick={() => setSeccion("plan")}
            />
          </aside>

          <main style={contenido}>
            {seccion === "perfil" && (
              <Card
                titulo="Mi perfil"
                descripcion="Datos principales del usuario administrador."
                icono="👤"
              >
                <Campo labelTexto="Nombre">
                  <input
                    value={usuario?.nombre || ""}
                    onChange={(e) => actualizarUsuario("nombre", e.target.value)}
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Correo">
                  <input
                    type="email"
                    value={usuario?.correo || ""}
                    onChange={(e) => actualizarUsuario("correo", e.target.value)}
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Rol">
                  <input value={usuario?.rol || ""} disabled style={inputDisabled} />
                </Campo>

                <button style={botonGuardar} onClick={guardarPerfil} disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar perfil"}
                </button>
              </Card>
            )}

            {seccion === "empresa" && (
              <Card
                titulo="Perfil empresarial"
                descripcion="Información administrativa del negocio."
                icono="🏢"
              >
                <Campo labelTexto="Nombre del negocio">
                  <input
                    value={empresa?.nombre || ""}
                    onChange={(e) => actualizarEmpresa("nombre", e.target.value)}
                    style={input}
                  />
                </Campo>

                <div style={gridDos}>
                  <Campo labelTexto="Teléfono">
                    <input
                      value={empresa?.telefono || ""}
                      onChange={(e) => actualizarEmpresa("telefono", e.target.value)}
                      style={input}
                    />
                  </Campo>

                  <Campo labelTexto="Correo">
                    <input
                      type="email"
                      value={empresa?.correo || ""}
                      onChange={(e) => actualizarEmpresa("correo", e.target.value)}
                      style={input}
                    />
                  </Campo>
                </div>

                <Campo labelTexto="Tipo de negocio">
                  <input
                    value={empresa?.tipo_negocio || ""}
                    onChange={(e) => actualizarEmpresa("tipo_negocio", e.target.value)}
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Dirección">
                  <textarea
                    value={empresa?.direccion || ""}
                    onChange={(e) => actualizarEmpresa("direccion", e.target.value)}
                    style={textarea}
                  />
                </Campo>

                <button style={botonGuardar} onClick={guardarEmpresa} disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar negocio"}
                </button>
              </Card>
            )}

            {seccion === "plan" && (
              <Card
                titulo="Mi plan"
                descripcion="Resumen del plan activo contratado en KONAX."
                icono="💼"
              >
                <div style={planBox}>
                  <div>
                    <p style={labelPlan}>Plan actual</p>
                    <h2 style={nombrePlan}>{empresa?.plan_nombre || "Sin plan"}</h2>
                    <p style={texto}>
                      Los cambios de plan y módulos son administrados por KONAX.
                    </p>
                  </div>

                  <span style={badge}>
                    {empresa?.estado_plan || empresa?.estado || "Activo"}
                  </span>
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Resumen({ titulo, valor, icono }) {
  return (
    <div style={resumenCard}>
      <span style={resumenIcono}>{icono}</span>
      <p style={resumenTitulo}>{titulo}</p>
      <h3 style={resumenValor}>{valor}</h3>
    </div>
  );
}

function Grupo({ titulo }) {
  return <p style={grupo}>{titulo}</p>;
}

function Item({ texto, icono, activo, onClick }) {
  return (
    <button type="button" style={activo ? itemActivo : item} onClick={onClick}>
      <span>{icono}</span>
      <span>{texto}</span>
    </button>
  );
}

function Separador() {
  return <div style={separador} />;
}

function Card({ titulo, descripcion, icono, children }) {
  return (
    <div style={card}>
      <div style={cardHeader}>
        <div style={cardIcono}>{icono}</div>
        <div>
          <h2 style={cardTitulo}>{titulo}</h2>
          <p style={cardDescripcion}>{descripcion}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function Campo({ labelTexto, children }) {
  return (
    <div style={campo}>
      <label style={labelStyle}>{labelTexto}</label>
      {children}
    </div>
  );
}

const cargandoPagina = {
  minHeight: "100vh",
  background: "#eef2f7",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Arial, sans-serif",
};

const cargandoCard = {
  background: "#ffffff",
  padding: "28px",
  borderRadius: "18px",
  boxShadow: "0 8px 26px rgba(0,0,0,0.10)",
  color: "#111827",
  textAlign: "center",
};

const logoCarga = {
  width: "80px",
  marginBottom: "14px",
};

const pagina = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #eef2f7 0%, #f8fafc 45%, #ecfdf5 100%)",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1450px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "26px",
  borderRadius: "24px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
};

const heroLeft = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const logoHero = {
  width: "95px",
  background: "#ffffff",
  padding: "9px",
  borderRadius: "18px",
};

const eyebrow = {
  margin: 0,
  color: "#bbf7d0",
  fontSize: "13px",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const titulo = {
  margin: "4px 0",
  fontSize: "38px",
};

const subtitulo = {
  margin: 0,
  color: "#dcfce7",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const resumenCard = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
};

const resumenIcono = {
  fontSize: "25px",
};

const resumenTitulo = {
  color: "#6b7280",
  margin: "8px 0 4px",
  fontSize: "13px",
  fontWeight: "bold",
};

const resumenValor = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
};

const layout = {
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: "22px",
};

const menu = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  padding: "20px",
  borderRadius: "22px",
  minHeight: "640px",
  boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
};

const menuBrand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "#f9fafb",
  padding: "14px",
  borderRadius: "16px",
  marginBottom: "20px",
};

const logoMenu = {
  width: "55px",
  background: "#ffffff",
  padding: "7px",
  borderRadius: "14px",
};

const menuMini = {
  margin: "3px 0 0",
  color: "#6b7280",
  fontSize: "12px",
};

const contenido = {
  minHeight: "640px",
};

const grupo = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "14px 0 10px",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const item = {
  width: "100%",
  background: "transparent",
  border: "none",
  textAlign: "left",
  padding: "14px",
  borderRadius: "14px",
  fontSize: "16px",
  cursor: "pointer",
  color: "#374151",
  marginBottom: "8px",
  display: "flex",
  gap: "10px",
  alignItems: "center",
};

const itemActivo = {
  ...item,
  background: "linear-gradient(135deg, #ecfdf5, #f3f4f6)",
  color: "#064e3b",
  fontWeight: "bold",
  boxShadow: "inset 4px 0 0 #16a34a",
};

const separador = {
  height: "1px",
  background: "#e5e7eb",
  margin: "22px 0",
};

const card = {
  background: "#ffffff",
  padding: "28px",
  borderRadius: "22px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 26px rgba(0,0,0,0.07)",
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "24px",
};

const cardIcono = {
  width: "52px",
  height: "52px",
  borderRadius: "16px",
  background: "#ecfdf5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
};

const cardTitulo = {
  margin: 0,
  color: "#111827",
};

const cardDescripcion = {
  color: "#6b7280",
  margin: "5px 0 0",
};

const campo = {
  marginBottom: "16px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#374151",
  fontWeight: "bold",
  fontSize: "14px",
};

const input = {
  width: "100%",
  padding: "13px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
};

const inputDisabled = {
  ...input,
  background: "#f3f4f6",
  color: "#6b7280",
};

const textarea = {
  ...input,
  minHeight: "110px",
  resize: "vertical",
};

const gridDos = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: "14px",
};

const botonGuardar = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "13px 22px",
  borderRadius: "12px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "10px",
};

const botonVolver = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 18px",
  borderRadius: "12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const planBox = {
  background: "linear-gradient(135deg, #f9fafb, #ecfdf5)",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "22px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  flexWrap: "wrap",
};

const labelPlan = {
  color: "#6b7280",
  margin: 0,
};

const nombrePlan = {
  color: "#111827",
  margin: "8px 0 8px",
};

const badge = {
  display: "inline-block",
  background: "#dbeafe",
  color: "#1d4ed8",
  padding: "8px 15px",
  borderRadius: "999px",
  fontWeight: "bold",
  alignSelf: "flex-start",
};

const texto = {
  color: "#4b5563",
  lineHeight: 1.6,
};

const textoSuave = {
  color: "#6b7280",
  marginBottom: 0,
};
