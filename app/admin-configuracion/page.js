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

  function obtenerRolUsuario() {
    return String(localStorage.getItem("usuarioRol") || "")
      .toLowerCase()
      .trim();
  }

  function esAdministrador() {
    const rol = obtenerRolUsuario();

    return (
      rol === "administrador" ||
      rol === "superadmin" ||
      rol === "admin master" ||
      rol === "administrador master"
    );
  }

  function cerrarSesionYSalir(mensaje) {
    if (mensaje) {
      alert(mensaje);
    }

    localStorage.clear();
    window.location.href = "/login";
  }

  async function cargarDatos() {
    setCargando(true);

    try {
      const empresaId = obtenerEmpresaId();
      const usuarioId = obtenerUsuarioId();

      if (!empresaId || !usuarioId) {
        cerrarSesionYSalir(
          "La sesión no es válida. Inicie sesión nuevamente."
        );
        return;
      }

      if (!esAdministrador()) {
        alert("No tienes permiso para acceder a configuración.");
        window.location.href = "/dashboard";
        return;
      }

      const { data: usuarioData, error: errorUsuario } = await supabase
        .from("usuarios")
        .select("id,empresa_id,nombre,correo,rol,estado")
        .eq("id", usuarioId)
        .eq("empresa_id", empresaId)
        .maybeSingle();

      if (errorUsuario) {
        throw new Error(
          "Error cargando usuario: " + errorUsuario.message
        );
      }

      if (!usuarioData) {
        cerrarSesionYSalir(
          "El usuario de la sesión no existe o no pertenece a esta empresa."
        );
        return;
      }

      if (
        String(usuarioData.estado || "")
          .toLowerCase()
          .trim() !== "activo"
      ) {
        cerrarSesionYSalir("Este usuario se encuentra inactivo.");
        return;
      }

      const { data: empresaData, error: errorEmpresa } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .maybeSingle();

      if (errorEmpresa) {
        throw new Error(
          "Error cargando empresa: " + errorEmpresa.message
        );
      }

      if (!empresaData) {
        cerrarSesionYSalir(
          "La empresa de esta sesión ya no existe."
        );
        return;
      }

      setUsuario(usuarioData);
      setEmpresa(empresaData);

      cargarPreferenciasSonido();
    } catch (error) {
      console.error("Error cargando configuración:", error);

      alert(
        error?.message ||
          "Ocurrió un error cargando la configuración."
      );
    } finally {
      setCargando(false);
    }
  }

  function cargarPreferenciasSonido() {
    try {
      const sonidosGuardados =
        localStorage.getItem("konaxSonidos");

      if (!sonidosGuardados) {
        setSonidos(SONIDOS_DEFAULT);
        return;
      }

      const sonidosParseados = JSON.parse(sonidosGuardados);

      if (
        !sonidosParseados ||
        typeof sonidosParseados !== "object" ||
        Array.isArray(sonidosParseados)
      ) {
        localStorage.removeItem("konaxSonidos");
        setSonidos(SONIDOS_DEFAULT);
        return;
      }

      setSonidos({
        pago:
          typeof sonidosParseados.pago === "boolean"
            ? sonidosParseados.pago
            : true,

        cuenta:
          typeof sonidosParseados.cuenta === "boolean"
            ? sonidosParseados.cuenta
            : true,

        gestion:
          typeof sonidosParseados.gestion === "boolean"
            ? sonidosParseados.gestion
            : true,

        promesa:
          typeof sonidosParseados.promesa === "boolean"
            ? sonidosParseados.promesa
            : true,
      });
    } catch (error) {
      console.error(
        "Preferencias de sonido inválidas:",
        error
      );

      localStorage.removeItem("konaxSonidos");
      setSonidos(SONIDOS_DEFAULT);
    }
  }

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function actualizarUsuario(campoNombre, valor) {
    setUsuario((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        [campoNombre]: valor,
      };
    });
  }

  function actualizarEmpresa(campoNombre, valor) {
    setEmpresa((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        [campoNombre]: valor,
      };
    });
  }

  async function guardarPerfil() {
    if (!usuario?.id) {
      alert("No hay usuario cargado.");
      return;
    }

    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      alert("No hay empresa activa.");
      return;
    }

    const nombre = String(usuario.nombre || "").trim();
    const correo = String(usuario.correo || "").trim();

    if (!nombre) {
      alert("Ingrese el nombre del usuario.");
      return;
    }

    if (!correo) {
      alert("Ingrese el correo del usuario.");
      return;
    }

    setGuardando(true);

    try {
      const { data, error } = await supabase
        .from("usuarios")
        .update({
          nombre,
          correo,
        })
        .eq("id", usuario.id)
        .eq("empresa_id", empresaId)
        .select("id,nombre,correo,rol,estado")
        .maybeSingle();

      if (error) {
        throw new Error(
          "Error guardando perfil: " + error.message
        );
      }

      if (!data) {
        throw new Error(
          "No se encontró el usuario para actualizar."
        );
      }

      setUsuario((prev) => ({
        ...prev,
        ...data,
      }));

      localStorage.setItem("usuarioNombre", data.nombre || "");
      localStorage.setItem("usuarioCorreo", data.correo || "");

      alert("Perfil actualizado correctamente.");
    } catch (error) {
      console.error("Error guardando perfil:", error);

      alert(
        error?.message ||
          "Ocurrió un error guardando el perfil."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEmpresa() {
    if (!empresa?.id) {
      alert("No hay empresa cargada.");
      return;
    }

    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      alert("No hay empresa activa.");
      return;
    }

    const nombre = String(empresa.nombre || "").trim();

    if (!nombre) {
      alert("Ingrese el nombre del negocio.");
      return;
    }

    setGuardando(true);

    try {
      const datosActualizar = {
        nombre,
        telefono: String(empresa.telefono || "").trim(),
        correo: String(empresa.correo || "").trim(),
        direccion: String(empresa.direccion || "").trim(),
        tipo_negocio: String(empresa.tipo_negocio || "").trim(),
        categoria_negocio: String(
          empresa.categoria_negocio || ""
        ).trim(),
      };

      const { data, error } = await supabase
        .from("empresas")
        .update(datosActualizar)
        .eq("id", empresaId)
        .select("*")
        .maybeSingle();

      if (error) {
        throw new Error(
          "Error guardando empresa: " + error.message
        );
      }

      if (!data) {
        throw new Error(
          "No se encontró la empresa para actualizar."
        );
      }

      setEmpresa(data);

      localStorage.setItem("empresaNombre", data.nombre || "");
      localStorage.setItem(
        "tipoNegocio",
        data.tipo_negocio || ""
      );
      localStorage.setItem(
        "categoriaNegocio",
        data.categoria_negocio || ""
      );

      alert("Perfil empresarial actualizado correctamente.");
    } catch (error) {
      console.error("Error guardando empresa:", error);

      alert(
        error?.message ||
          "Ocurrió un error guardando la empresa."
      );
    } finally {
      setGuardando(false);
    }
  }

  function actualizarSonido(campoNombre, valor) {
    setSonidos((prev) => {
      const nuevasPreferencias = {
        ...prev,
        [campoNombre]: valor,
      };

      try {
        localStorage.setItem(
          "konaxSonidos",
          JSON.stringify(nuevasPreferencias)
        );
      } catch (error) {
        console.error(
          "Error guardando preferencias de sonido:",
          error
        );
      }

      return nuevasPreferencias;
    });
  }

  function probarSonido() {
    try {
      const audio = new Audio("/sounds/konax-alert.mp3");

      audio.currentTime = 0;

      audio.play().catch((error) => {
        console.error("Error reproduciendo sonido:", error);

        alert(
          "No se pudo reproducir el sonido. Verifica que exista el archivo public/sounds/konax-alert.mp3."
        );
      });
    } catch (error) {
      console.error("Error creando audio:", error);

      alert("No se pudo iniciar la reproducción del sonido.");
    }
  }

  if (cargando) {
    return (
      <div style={paginaCarga}>
        <div style={cardCarga}>
          <strong>Cargando configuración...</strong>
          <p style={textoCarga}>
            Validando usuario y empresa.
          </p>
        </div>
      </div>
    );
  }

  if (!usuario || !empresa) {
    return (
      <div style={paginaCarga}>
        <div style={cardCarga}>
          <strong>No fue posible cargar la configuración.</strong>

          <button
            style={botonVolver}
            onClick={volverDashboard}
          >
            ← Volver al Dashboard
          </button>
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
              Ajustes de cuenta, negocio, plan y notificaciones.
            </p>
          </div>

          <button
            type="button"
            style={botonVolver}
            onClick={volverDashboard}
          >
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
                    type="text"
                    value={usuario.nombre || ""}
                    onChange={(e) =>
                      actualizarUsuario(
                        "nombre",
                        e.target.value
                      )
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Correo">
                  <input
                    type="email"
                    value={usuario.correo || ""}
                    onChange={(e) =>
                      actualizarUsuario(
                        "correo",
                        e.target.value
                      )
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Rol">
                  <input
                    type="text"
                    value={usuario.rol || ""}
                    disabled
                    style={inputDisabled}
                  />
                </Campo>

                <button
                  type="button"
                  style={
                    guardando
                      ? botonGuardarDeshabilitado
                      : botonGuardar
                  }
                  onClick={guardarPerfil}
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar perfil"}
                </button>
              </Card>
            )}

            {seccion === "empresa" && (
              <Card titulo="Perfil empresarial">
                <Campo labelTexto="Nombre del negocio">
                  <input
                    type="text"
                    value={empresa.nombre || ""}
                    onChange={(e) =>
                      actualizarEmpresa(
                        "nombre",
                        e.target.value
                      )
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Teléfono">
                  <input
                    type="text"
                    value={empresa.telefono || ""}
                    onChange={(e) =>
                      actualizarEmpresa(
                        "telefono",
                        e.target.value
                      )
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Correo">
                  <input
                    type="email"
                    value={empresa.correo || ""}
                    onChange={(e) =>
                      actualizarEmpresa(
                        "correo",
                        e.target.value
                      )
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Tipo de negocio">
                  <input
                    type="text"
                    value={empresa.tipo_negocio || ""}
                    onChange={(e) =>
                      actualizarEmpresa(
                        "tipo_negocio",
                        e.target.value
                      )
                    }
                    style={input}
                  />
                </Campo>

                <Campo labelTexto="Dirección">
                  <textarea
                    value={empresa.direccion || ""}
                    onChange={(e) =>
                      actualizarEmpresa(
                        "direccion",
                        e.target.value
                      )
                    }
                    style={textarea}
                  />
                </Campo>

                <button
                  type="button"
                  style={
                    guardando
                      ? botonGuardarDeshabilitado
                      : botonGuardar
                  }
                  onClick={guardarEmpresa}
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar negocio"}
                </button>
              </Card>
            )}

            {seccion === "plan" && (
              <Card titulo="Mi plan">
                <div style={planBox}>
                  <p style={labelPlan}>Plan actual</p>

                  <h2 style={nombrePlan}>
                    {empresa.plan_nombre || "Sin plan"}
                  </h2>

                  <span style={badge}>
                    {empresa.estado_plan ||
                      empresa.estado ||
                      "Activo"}
                  </span>
                </div>

                <p style={texto}>
                  Este apartado es informativo. Los cambios de
                  plan y módulos son administrados por KONAX.
                </p>
              </Card>
            )}

            {seccion === "sonidos" && (
              <Card titulo="Sonidos y notificaciones">
                <p style={texto}>
                  Activa o desactiva los sonidos para eventos
                  importantes del negocio.
                </p>

                <Switch
                  labelTexto="Sonido cuando se registra un pago"
                  checked={Boolean(sonidos.pago)}
                  onChange={(valor) =>
                    actualizarSonido("pago", valor)
                  }
                />

                <Switch
                  labelTexto="Sonido cuando se crea una cuenta"
                  checked={Boolean(sonidos.cuenta)}
                  onChange={(valor) =>
                    actualizarSonido("cuenta", valor)
                  }
                />

                <Switch
                  labelTexto="Sonido cuando se guarda una gestión"
                  checked={Boolean(sonidos.gestion)}
                  onChange={(valor) =>
                    actualizarSonido("gestion", valor)
                  }
                />

                <Switch
                  labelTexto="Sonido para promesas vencidas"
                  checked={Boolean(sonidos.promesa)}
                  onChange={(valor) =>
                    actualizarSonido("promesa", valor)
                  }
                />

                <button
                  type="button"
                  style={botonGuardar}
                  onClick={probarSonido}
                >
                  Probar sonido
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
    <button
      type="button"
      style={activo ? itemActivo : itemMenu}
      onClick={onClick}
    >
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

function Switch({
  labelTexto,
  checked,
  onChange,
}) {
  return (
    <div style={switchFila}>
      <span>{labelTexto}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
        }
        style={check}
      />
    </div>
  );
}

const paginaCarga = {
  minHeight: "100vh",
  background: "#f3f4f6",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
};

const cardCarga = {
  background: "#ffffff",
  padding: "26px",
  borderRadius: "16px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
  display: "grid",
  gap: "14px",
  color: "#111827",
};

const textoCarga = {
  margin: 0,
  color: "#6b7280",
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
  minWidth: 0,
  minHeight: "620px",
};

const grupo = {
  color: "#6b7280",
  fontSize: "17px",
  margin: "10px 0 14px",
};

const itemMenu = {
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
  ...itemMenu,
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

const botonGuardarDeshabilitado = {
  ...botonGuardar,
  opacity: 0.6,
  cursor: "not-allowed",
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
  marginBottom: "14px",
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
  gap: "20px",
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
  flexShrink: 0,
};
