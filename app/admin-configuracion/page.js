"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const SONIDOS_DEFAULT = {
  pago: true,
  cuenta: true,
  gestion: true,
  promesa: true,
};

export default function AdminConfiguracion() {
  const [seccion, setSeccion] = useState("perfil");
  const [empresa, setEmpresa] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [sonidos, setSonidos] = useState(SONIDOS_DEFAULT);

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

    if (!usuarioData || !empresaData) {
      alert("No se pudo cargar la configuración.");
      setCargando(false);
      return;
    }

    setUsuario(usuarioData);
    setEmpresa(empresaData);

    try {
      const sonidosGuardados = localStorage.getItem("konaxSonidos");

      if (sonidosGuardados) {
        const parseado = JSON.parse(sonidosGuardados);

        setSonidos({
          pago: parseado?.pago ?? true,
          cuenta: parseado?.cuenta ?? true,
          gestion: parseado?.gestion ?? true,
          promesa: parseado?.promesa ?? true,
        });
      }
    } catch (error) {
      localStorage.removeItem("konaxSonidos");
      setSonidos(SONIDOS_DEFAULT);
    }

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

    const empresaId = obtenerEmpresaId();

    setGuardando(true);

    const { error } = await supabase
      .from("usuarios")
      .update({
        nombre: String(usuario.nombre || "").trim(),
        correo: String(usuario.correo || "").trim(),
      })
      .eq("id", usuario.id)
      .eq("empresa_id", empresaId);

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

    const empresaId = obtenerEmpresaId();

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
      .eq("id", empresaId);

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

  function actualizarSonido(campoNombre, valor) {
    const nuevaConfiguracion = {
      ...sonidos,
      [campoNombre]: valor,
    };

    setSonidos(nuevaConfiguracion);
    localStorage.setItem("konaxSonidos", JSON.stringify(nuevaConfiguracion));
  }

  function probarSonido() {
    const audio = new Audio("/sounds/konax-alert.wav");
    audio.volume = 0.7;

    audio.play().catch(() => {
      alert(
        "No se pudo reproducir el sonido. Verifica que exista public/sounds/konax-alert.wav"
      );
    });
  }

  if (cargando) {
    return (
      <div style={cargandoPagina}>
        <div style={cargandoCard}>
          <strong>Cargando configuración...</strong>
          <p>Consultando perfil, empresa y preferencias.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={header}>
          <div>
            <h1 style={titulo}>Configuraciones</h1>
            <p style={subtitulo}>
              Ajustes básicos de cuenta, negocio, plan y notificaciones.
            </p>
          </div>

          <button style={botonVolver} onClick={volverDashboard}>
            ← Volver
          </button>
        </div>

        <div style={layout}>
          <aside style={menu}>
            <Grupo titulo="Mi cuenta" />

            <Item
              texto="Mi perfil"
              activo={seccion === "perfil"}
              onClick={() => setSeccion("perfil")}
            />

            <Separador />

            <Grupo titulo="Mi negocio" />

            <Item
              texto="Perfil empresarial"
              activo={seccion === "empresa"}
              onClick={() => setSeccion("empresa")}
            />

            <Item
              texto="Mi plan"
              activo={seccion === "plan"}
              onClick={() => setSeccion("plan")}
            />

            <Item
              texto="Sonidos y notificaciones"
              activo={seccion === "sonidos"}
              onClick={() => setSeccion("sonidos")}
            />
          </aside>

          <main style={contenido}>
            {seccion === "perfil" && (
              <Card titulo="Mi perfil">
                <Campo labelTexto="Nombre">
                  <input
                    value={usuario?.nombre || ""}
                    onChange={(e) =>
                      actualizarUsuario("nombre", e.target.value)
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Correo">
                  <input
                    type="email"
                    value={usuario?.correo || ""}
                    onChange={(e) =>
                      actualizarUsuario("correo", e.target.value)
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Rol">
                  <input
                    value={usuario?.rol || ""}
                    disabled
                    style={inputDisabled}
                  />
                </Campo>

                <button
                  style={botonGuardar}
                  onClick={guardarPerfil}
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Guardar perfil"}
                </button>
              </Card>
            )}

            {seccion === "empresa" && (
              <Card titulo="Perfil empresarial">
                <Campo labelTexto="Nombre del negocio">
                  <input
                    value={empresa?.nombre || ""}
                    onChange={(e) =>
                      actualizarEmpresa("nombre", e.target.value)
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Teléfono">
                  <input
                    value={empresa?.telefono || ""}
                    onChange={(e) =>
                      actualizarEmpresa("telefono", e.target.value)
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Correo">
                  <input
                    type="email"
                    value={empresa?.correo || ""}
                    onChange={(e) =>
                      actualizarEmpresa("correo", e.target.value)
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Tipo de negocio">
                  <input
                    value={empresa?.tipo_negocio || ""}
                    onChange={(e) =>
                      actualizarEmpresa("tipo_negocio", e.target.value)
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Dirección">
                  <textarea
                    value={empresa?.direccion || ""}
                    onChange={(e) =>
                      actualizarEmpresa("direccion", e.target.value)
                    }
                    style={textarea}
                  />
                </Campo>

                <button
                  style={botonGuardar}
                  onClick={guardarEmpresa}
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Guardar negocio"}
                </button>
              </Card>
            )}

            {seccion === "plan" && (
              <Card titulo="Mi plan">
                <div style={planBox}>
                  <p style={labelPlan}>Plan actual</p>

                  <h2 style={nombrePlan}>
                    {empresa?.plan_nombre || "Sin plan"}
                  </h2>

                  <span style={badge}>
                    {empresa?.estado_plan || empresa?.estado || "Activo"}
                  </span>
                </div>

                <p style={texto}>
                  Este apartado es informativo. Los cambios de plan y módulos
                  son administrados por KONAX.
                </p>
              </Card>
            )}

            {seccion === "sonidos" && (
              <Card titulo="Sonidos y notificaciones">
                <p style={texto}>
                  Activa sonidos para eventos importantes del negocio.
                </p>

                <Switch
                  labelTexto="Sonido cuando se registra un pago"
                  checked={sonidos.pago}
                  onChange={(valor) => actualizarSonido("pago", valor)}
                />

                <Switch
                  labelTexto="Sonido cuando se crea una cuenta"
                  checked={sonidos.cuenta}
                  onChange={(valor) => actualizarSonido("cuenta", valor)}
                />

                <Switch
                  labelTexto="Sonido cuando se guarda una gestión"
                  checked={sonidos.gestion}
                  onChange={(valor) => actualizarSonido("gestion", valor)}
                />

                <Switch
                  labelTexto="Sonido para promesas vencidas"
                  checked={sonidos.promesa}
                  onChange={(valor) => actualizarSonido("promesa", valor)}
                />

                <button style={botonProbar} onClick={probarSonido}>
                  ▶ Probar sonido
                </button>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Grupo({ titulo }) {
  return <p style={grupo}>{titulo}</p>;
}

function Item({ texto, activo, onClick }) {
  return (
    <button type="button" style={activo ? itemActivo : item} onClick={onClick}>
      {texto}
    </button>
  );
}

function Separador() {
  return <div style={separador} />;
}

function Card({ titulo, children }) {
  return (
    <div style={card}>
      <h2 style={cardTitulo}>{titulo}</h2>
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

function Switch({ labelTexto, checked, onChange }) {
  return (
    <div style={switchFila}>
      <span>{labelTexto}</span>

      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        style={check}
      />
    </div>
  );
}

const cargandoPagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Arial, sans-serif",
};

const cargandoCard = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
  color: "#111827",
};

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1400px",
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
  gap: "14px",
  flexWrap: "wrap",
};

const titulo = {
  margin: 0,
  fontSize: "42px",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  marginTop: "6px",
};

const layout = {
  display: "grid",
  gridTemplateColumns: "300px minmax(0, 1fr)",
  gap: "24px",
};

const menu = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  padding: "22px",
  borderRadius: "16px",
  minHeight: "620px",
};

const contenido = {
  minHeight: "620px",
};

const grupo = {
  color: "#6b7280",
  fontSize: "17px",
  margin: "10px 0 14px",
};

const item = {
  width: "100%",
  background: "transparent",
  border: "none",
  textAlign: "left",
  padding: "14px",
  borderRadius: "10px",
  fontSize: "18px",
  cursor: "pointer",
  color: "#374151",
  marginBottom: "8px",
};

const itemActivo = {
  ...item,
  background: "#f3f4f6",
  color: "#111827",
  fontWeight: "bold",
};

const separador = {
  height: "1px",
  background: "#e5e7eb",
  margin: "24px 0",
};

const card = {
  background: "#ffffff",
  padding: "26px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 3px 12px rgba(0,0,0,0.05)",
};

const cardTitulo = {
  marginTop: 0,
  marginBottom: "22px",
  color: "#111827",
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
  padding: "12px",
  borderRadius: "10px",
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
  minHeight: "100px",
  resize: "vertical",
};

const botonGuardar = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "13px 22px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "10px",
};

const botonProbar = {
  background: "#047857",
  color: "#ffffff",
  border: "none",
  padding: "13px 22px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "10px",
};

const botonVolver = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const planBox = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "20px",
  marginBottom: "18px",
};

const labelPlan = {
  color: "#6b7280",
  margin: 0,
};

const nombrePlan = {
  color: "#111827",
  margin: "8px 0 12px",
};

const badge = {
  display: "inline-block",
  background: "#dbeafe",
  color: "#1d4ed8",
  padding: "7px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const texto = {
  color: "#4b5563",
  lineHeight: 1.6,
};

const switchFila = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  marginBottom: "12px",
  color: "#111827",
};

const check = {
  width: "22px",
  height: "22px",
  cursor: "pointer",
};
