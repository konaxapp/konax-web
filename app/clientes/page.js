"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const COLOR_PRINCIPAL = "#0B3D2E";
const COLOR_ACCION = "#168A4A";
const COLOR_SUAVE = "#F4F7F5";
const COLOR_BORDE = "#DDE5E0";
const COLOR_TEXTO = "#13231B";
const COLOR_MUTED = "#6F7D75";

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: "12px",
  border: `1px solid ${COLOR_BORDE}`,
  outline: "none",
  fontSize: "15px",
  background: "#FFFFFF",
  color: COLOR_TEXTO,
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#30443A",
};

const botonPrincipal = {
  width: "100%",
  border: "none",
  borderRadius: "12px",
  padding: "14px 18px",
  background: COLOR_ACCION,
  color: "#FFFFFF",
  fontSize: "16px",
  fontWeight: "800",
  cursor: "pointer",
};

const botonSecundario = {
  width: "100%",
  border: `1px solid ${COLOR_BORDE}`,
  borderRadius: "12px",
  padding: "14px 18px",
  background: "#FFFFFF",
  color: COLOR_PRINCIPAL,
  fontSize: "16px",
  fontWeight: "800",
  cursor: "pointer",
};

const cardStyle = {
  background: "#FFFFFF",
  border: `1px solid ${COLOR_BORDE}`,
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 12px 35px rgba(20, 50, 35, 0.07)",
};

function valorTexto(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor);
}

function crearFormularioVacio() {
  return {
    id: "",
    nombre: "",
    cedula: "",
    telefono: "",
    correo: "",
    estado: "Activo",
    referencia: "",
    telefono_referencia: "",
    direccion: "",
    observaciones: "",
  };
}

export default function ClientesPage() {
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");

  const [formulario, setFormulario] = useState(
    crearFormularioVacio()
  );

  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);

  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const esEdicion = Boolean(formulario.id);

  const esGimnasioPerfil = useMemo(() => {
    const tipo = valorTexto(tipoNegocio)
      .toLowerCase()
      .trim();

    return (
      tipo.includes("gimnas") ||
      tipo.includes("fitness") ||
      tipo.includes("gym")
    );
  }, [tipoNegocio]);

  useEffect(() => {
    const empresaGuardada =
      localStorage.getItem("empresaId") || "";

    const tipoGuardado =
      localStorage.getItem("tipoNegocio") || "";

    setEmpresaId(empresaGuardada);
    setTipoNegocio(tipoGuardado);
  }, []);

  function cambiarCampo(campo, valor) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function limpiarFormulario() {
    setFormulario(crearFormularioVacio());
    setResultados([]);
    setBusqueda("");
  }

  async function buscarCliente() {
    const texto = busqueda.trim();

    if (!texto) {
      alert(
        "Escribe la cédula, nombre o teléfono del cliente."
      );
      return;
    }

    if (!empresaId) {
      alert("No se encontró la empresa activa.");
      return;
    }

    setBuscando(true);

    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .or(
          `nombre.ilike.%${texto}%,cedula.ilike.%${texto}%,telefono.ilike.%${texto}%`
        )
        .limit(20);

      if (error) {
        alert(
          "No se pudo realizar la búsqueda: " +
            error.message
        );
        return;
      }

      setResultados(data || []);

      if (!data || data.length === 0) {
        alert("No se encontraron clientes.");
      }
    } catch (error) {
      console.error(error);

      alert(
        "Ocurrió un error buscando el cliente."
      );
    } finally {
      setBuscando(false);
    }
  }

  function seleccionarCliente(cliente) {
    setFormulario({
      id: valorTexto(cliente.id),
      nombre: valorTexto(cliente.nombre),
      cedula: valorTexto(cliente.cedula),
      telefono: valorTexto(cliente.telefono),
      correo: valorTexto(cliente.correo),
      estado:
        valorTexto(cliente.estado) || "Activo",
      referencia: valorTexto(cliente.referencia),
      telefono_referencia: valorTexto(
        cliente.telefono_referencia
      ),
      direccion: valorTexto(cliente.direccion),
      observaciones: valorTexto(
        cliente.observaciones
      ),
    });

    setResultados([]);
  }

  async function guardarCliente() {
    if (guardando) return;

    if (!empresaId) {
      alert("No se encontró la empresa activa.");
      return;
    }

    if (!formulario.nombre.trim()) {
      alert("El nombre del cliente es obligatorio.");
      return;
    }

    setGuardando(true);

    try {
      const datosCliente = {
        empresa_id: empresaId,
        nombre: formulario.nombre.trim(),
        cedula:
          formulario.cedula.trim() || null,
        telefono:
          formulario.telefono.trim() || null,
        correo:
          formulario.correo.trim().toLowerCase() ||
          null,
        estado: formulario.estado || "Activo",
        referencia:
          formulario.referencia.trim() || null,
        telefono_referencia:
          formulario.telefono_referencia.trim() ||
          null,
        direccion:
          formulario.direccion.trim() || null,
        observaciones:
          formulario.observaciones.trim() || null,
      };

      let error;

      if (esEdicion) {
        const respuesta = await supabase
          .from("clientes")
          .update(datosCliente)
          .eq("id", formulario.id)
          .eq("empresa_id", empresaId);

        error = respuesta.error;
      } else {
        const respuesta = await supabase
          .from("clientes")
          .insert([datosCliente]);

        error = respuesta.error;
      }

      if (error) {
        alert(
          "No se pudo guardar el cliente: " +
            error.message
        );
        return;
      }

      alert(
        esEdicion
          ? "Cliente actualizado correctamente."
          : "Cliente creado correctamente."
      );

      limpiarFormulario();
    } catch (error) {
      console.error(error);

      alert(
        "Ocurrió un error guardando el cliente."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main
      className="clientes-mobile"
      style={{
        minHeight: "100vh",
        background: COLOR_SUAVE,
        padding: "28px",
        color: COLOR_TEXTO,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        {/* CABECERA */}

        <section
          className="clientes-hero"
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) auto",
            gap: "24px",
            alignItems: "center",
            background: COLOR_PRINCIPAL,
            color: "#FFFFFF",
            borderRadius: "26px",
            padding: "32px",
            marginBottom: "24px",
          }}
        >
          <div>
            <div
              style={{
                color: "#7BE0AD",
                fontSize: "13px",
                fontWeight: "900",
                letterSpacing: "2px",
                marginBottom: "10px",
              }}
            >
              KONAX · CLIENTES
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                lineHeight: 1.05,
              }}
            >
              Clientes del salón
            </h1>

            <p
              style={{
                margin: "14px 0 0",
                color: "#D8E7DF",
                fontSize: "17px",
                lineHeight: 1.55,
                maxWidth: "580px",
              }}
            >
              Registra y administra la información
              principal de tus clientes.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            style={{
              border: "none",
              borderRadius: "14px",
              padding: "15px 22px",
              background: "#FFFFFF",
              color: COLOR_PRINCIPAL,
              fontWeight: "800",
              fontSize: "15px",
              cursor: "pointer",
            }}
          >
            ← Volver al panel
          </button>
        </section>

        {/* BUSCADOR */}

        <section
          className="clientes-card"
          style={{
            ...cardStyle,
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              color: COLOR_ACCION,
              fontSize: "13px",
              fontWeight: "900",
              letterSpacing: "2px",
              marginBottom: "5px",
            }}
          >
            BUSCAR
          </div>

          <h2
            style={{
              margin: "0 0 7px",
              fontSize: "29px",
            }}
          >
            Cliente existente
          </h2>

          <p
            style={{
              color: COLOR_MUTED,
              margin: "0 0 20px",
              lineHeight: 1.5,
            }}
          >
            Busca por cédula, nombre o teléfono
            para editar sin duplicar.
          </p>

          <div
            className="clientes-busqueda-fila"
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) auto auto",
              gap: "10px",
            }}
          >
            <input
              type="text"
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  buscarCliente();
                }
              }}
              placeholder="Cédula, nombre o teléfono"
              style={inputStyle}
            />

            <button
              type="button"
              onClick={buscarCliente}
              disabled={buscando}
              style={{
                ...botonPrincipal,
                width: "auto",
                minWidth: "125px",
              }}
            >
              {buscando ? "Buscando..." : "Buscar"}
            </button>

            <button
              type="button"
              onClick={limpiarFormulario}
              style={{
                ...botonSecundario,
                width: "auto",
                minWidth: "110px",
              }}
            >
              Nuevo
            </button>
          </div>

          {resultados.length > 0 && (
            <div
              style={{
                marginTop: "18px",
                display: "grid",
                gap: "9px",
              }}
            >
              {resultados.map((cliente) => (
                <button
                  key={cliente.id}
                  type="button"
                  onClick={() =>
                    seleccionarCliente(cliente)
                  }
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: `1px solid ${COLOR_BORDE}`,
                    background: "#FFFFFF",
                    borderRadius: "12px",
                    padding: "13px",
                    cursor: "pointer",
                    color: COLOR_TEXTO,
                  }}
                >
                  <strong>
                    {cliente.nombre ||
                      "Sin nombre"}
                  </strong>

                  <div
                    style={{
                      marginTop: "5px",
                      color: COLOR_MUTED,
                      fontSize: "13px",
                    }}
                  >
                    {cliente.cedula ||
                      "Sin cédula"}{" "}
                    ·{" "}
                    {cliente.telefono ||
                      "Sin teléfono"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* FORMULARIO + RESUMEN */}

        <section
          className="clientes-form-layout"
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.5fr) minmax(280px, 0.7fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* FORMULARIO */}

          <article
            className="clientes-card"
            style={cardStyle}
          >
            <div
              style={{
                color: COLOR_ACCION,
                fontSize: "13px",
                fontWeight: "900",
                letterSpacing: "2px",
                marginBottom: "5px",
              }}
            >
              {esEdicion
                ? "EDITAR CLIENTE"
                : "NUEVO CLIENTE"}
            </div>

            <h2
              style={{
                margin: "0 0 22px",
                fontSize: "29px",
              }}
            >
              Información del cliente
            </h2>

            <div
              className="clientes-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "17px",
              }}
            >
              <div>
                <label style={labelStyle}>
                  Nombre
                </label>

                <input
                  value={formulario.nombre}
                  onChange={(e) =>
                    cambiarCampo(
                      "nombre",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Cédula
                </label>

                <input
                  value={formulario.cedula}
                  onChange={(e) =>
                    cambiarCampo(
                      "cedula",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  placeholder="Cédula"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Teléfono
                </label>

                <input
                  value={formulario.telefono}
                  onChange={(e) =>
                    cambiarCampo(
                      "telefono",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  placeholder="Teléfono"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Correo
                </label>

                <input
                  type="email"
                  value={formulario.correo}
                  onChange={(e) =>
                    cambiarCampo(
                      "correo",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Estado
                </label>

                <select
                  value={formulario.estado}
                  onChange={(e) =>
                    cambiarCampo(
                      "estado",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="Activo">
                    Activo
                  </option>

                  <option value="Inactivo">
                    Inactivo
                  </option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Referencia
                </label>

                <input
                  value={formulario.referencia}
                  onChange={(e) =>
                    cambiarCampo(
                      "referencia",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  placeholder="Persona de referencia"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Teléfono referencia
                </label>

                <input
                  value={
                    formulario.telefono_referencia
                  }
                  onChange={(e) =>
                    cambiarCampo(
                      "telefono_referencia",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  placeholder="Teléfono"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Dirección
                </label>

                <input
                  value={formulario.direccion}
                  onChange={(e) =>
                    cambiarCampo(
                      "direccion",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                  placeholder="Dirección"
                />
              </div>
            </div>

            <div style={{ marginTop: "17px" }}>
              <label style={labelStyle}>
                Observaciones
              </label>

              <textarea
                value={formulario.observaciones}
                onChange={(e) =>
                  cambiarCampo(
                    "observaciones",
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  minHeight: "110px",
                  resize: "vertical",
                }}
                placeholder="Notas adicionales del cliente"
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
                marginTop: "22px",
              }}
            >
              <button
                type="button"
                onClick={guardarCliente}
                disabled={guardando}
                style={botonPrincipal}
              >
                {guardando
                  ? "Guardando..."
                  : esEdicion
                  ? "Actualizar cliente"
                  : "Guardar cliente"}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                style={botonSecundario}
              >
                Limpiar formulario
              </button>
            </div>
          </article>

          {/* RESUMEN */}

          <aside
            className="clientes-side-card"
            style={{
              ...cardStyle,
              position: "sticky",
              top: "20px",
            }}
          >
            <div
              style={{
                color: COLOR_ACCION,
                fontSize: "13px",
                fontWeight: "900",
                letterSpacing: "2px",
                marginBottom: "5px",
              }}
            >
              RESUMEN
            </div>

            <h2
              style={{
                margin: "0 0 20px",
                fontSize: "29px",
              }}
            >
              Ficha del Cliente
            </h2>

            {[
              [
                "Nombre",
                formulario.nombre ||
                  "Pendiente",
              ],
              [
                "Cédula",
                formulario.cedula ||
                  "Pendiente",
              ],
              [
                "Teléfono",
                formulario.telefono ||
                  "Pendiente",
              ],
              [
                "Estado",
                formulario.estado ||
                  "Activo",
              ],
            ].map(([titulo, valor]) => (
              <div
                key={titulo}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: "12px",
                  padding: "13px 0",
                  borderBottom: `1px solid ${COLOR_BORDE}`,
                }}
              >
                <span
                  style={{
                    color: COLOR_MUTED,
                  }}
                >
                  {titulo}
                </span>

                <strong
                  style={{
                    textAlign: "right",
                    overflowWrap: "anywhere",
                  }}
                >
                  {valor}
                </strong>
              </div>
            ))}

            {esGimnasioPerfil && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#F1F8F4",
                  color: COLOR_PRINCIPAL,
                  lineHeight: 1.5,
                }}
              >
                Este cliente pertenece a un
                perfil de gimnasio. Las funciones
                adicionales del portal y QR se
                mantienen independientes.
              </div>
            )}
          </aside>
        </section>
      </div>

      {/* RESPONSIVE MÓVIL */}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .clientes-mobile {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .clientes-mobile .clientes-hero,
        .clientes-mobile .clientes-card,
        .clientes-mobile .clientes-side-card,
        .clientes-mobile .clientes-form-layout,
        .clientes-mobile .clientes-grid,
        .clientes-mobile .clientes-busqueda-fila {
          min-width: 0;
          max-width: 100%;
        }

        @media (max-width: 900px) {
          .clientes-mobile {
            padding: 10px !important;
          }

          .clientes-mobile > div {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .clientes-mobile .clientes-hero {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
            padding: 18px !important;
            border-radius: 18px !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }

          .clientes-mobile .clientes-hero > div {
            width: 100% !important;
            min-width: 0 !important;
          }

          .clientes-mobile .clientes-hero h1 {
            font-size: 30px !important;
            line-height: 1.05 !important;
            overflow-wrap: anywhere !important;
          }

          .clientes-mobile .clientes-hero button {
            width: 100% !important;
          }

          .clientes-mobile
            .clientes-busqueda-fila {
            grid-template-columns: 1fr !important;
            width: 100% !important;
            gap: 9px !important;
          }

          .clientes-mobile
            .clientes-form-layout {
            grid-template-columns: 1fr !important;
            width: 100% !important;
            gap: 12px !important;
          }

          .clientes-mobile .clientes-grid {
            grid-template-columns: 1fr !important;
            width: 100% !important;
          }

          .clientes-mobile .clientes-card,
          .clientes-mobile
            .clientes-side-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 15px !important;
            border-radius: 17px !important;
            overflow: hidden !important;
          }

          .clientes-mobile
            .clientes-side-card {
            position: static !important;
            top: auto !important;
          }

          .clientes-mobile input,
          .clientes-mobile select,
          .clientes-mobile textarea,
          .clientes-mobile button {
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .clientes-mobile input,
          .clientes-mobile select,
          .clientes-mobile textarea {
            width: 100% !important;
            font-size: 16px !important;
          }

          .clientes-mobile
            .clientes-busqueda-fila
            button {
            width: 100% !important;
          }

          .clientes-mobile .clientes-card *,
          .clientes-mobile
            .clientes-side-card * {
            min-width: 0;
          }

          .clientes-mobile .clientes-card strong,
          .clientes-mobile .clientes-card span,
          .clientes-mobile .clientes-card p,
          .clientes-mobile
            .clientes-side-card strong,
          .clientes-mobile
            .clientes-side-card span,
          .clientes-mobile
            .clientes-side-card p {
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 430px) {
          .clientes-mobile {
            padding: 8px !important;
          }

          .clientes-mobile .clientes-hero {
            padding: 15px !important;
          }

          .clientes-mobile .clientes-hero h1 {
            font-size: 28px !important;
          }

          .clientes-mobile .clientes-card,
          .clientes-mobile
            .clientes-side-card {
            padding: 13px !important;
          }
        }
      `}</style>
    </main>
  );
}
