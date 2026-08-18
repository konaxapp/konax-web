"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

// KONAX Configuración - Perfil empresarial + Logo - Version 2026.08.17-R

const PLAN_INICIAL = {
  nombre: "",
  descripcion: "",
  precio: "",
  periodicidad: "Mensual",
  duracion_cantidad: 1,
  duracion_unidad: "Meses",
  dias_aviso: 5,
  dias_gracia: 3,
  activo: true,
};

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function esNegocioGimnasio(empresa) {
  const tipo = normalizar(empresa?.tipo_negocio);
  const categoria = normalizar(empresa?.categoria_negocio);

  return (
    tipo.includes("gimnasio") ||
    tipo.includes("gym") ||
    tipo.includes("fitness") ||
    categoria.includes("membresia") ||
    categoria.includes("suscripcion")
  );
}

function extensionArchivo(archivo) {
  const nombre = String(archivo?.name || "");
  const extension = nombre.split(".").pop()?.toLowerCase();

  if (["png", "jpg", "jpeg", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (archivo?.type === "image/png") return "png";
  if (archivo?.type === "image/webp") return "webp";
  return "jpg";
}

export default function AdminConfiguracion() {
  const [seccion, setSeccion] = useState("perfil");
  const [empresa, setEmpresa] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [eliminandoLogo, setEliminandoLogo] = useState(false);

  const [planes, setPlanes] = useState([]);
  const [cargandoPlanes, setCargandoPlanes] = useState(false);
  const [guardandoPlan, setGuardandoPlan] = useState(false);
  const [planEditandoId, setPlanEditandoId] = useState("");
  const [formPlan, setFormPlan] = useState({ ...PLAN_INICIAL });

  const gimnasio = useMemo(() => esNegocioGimnasio(empresa), [empresa]);

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
    const rol = normalizar(localStorage.getItem("usuarioRol"));

    return [
      "administrador",
      "superadmin",
      "admin master",
      "administrador master",
    ].includes(rol);
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

    if (esNegocioGimnasio(empresaData)) {
      await cargarPlanesMembresia(empresaId);
    }

    setCargando(false);
  }

  async function cargarPlanesMembresia(id = obtenerEmpresaId()) {
    if (!id) return;

    setCargandoPlanes(true);

    const { data, error } = await supabase
      .from("planes_membresia")
      .select("*")
      .eq("empresa_id", id)
      .order("activo", { ascending: false })
      .order("nombre", { ascending: true });

    setCargandoPlanes(false);

    if (error) {
      alert("Error cargando planes de membresía: " + error.message);
      setPlanes([]);
      return;
    }

    setPlanes(data || []);
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

  function actualizarPlan(campo, valor) {
    setFormPlan((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  async function subirLogoEmpresa(evento) {
    const archivo = evento.target.files?.[0];
    const empresaId = obtenerEmpresaId();

    evento.target.value = "";

    if (!archivo || !empresaId || !empresa?.id) return;

    if (!archivo.type?.startsWith("image/")) {
      alert("Seleccione una imagen PNG, JPG o WEBP.");
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      alert("El logo no puede pesar más de 5 MB.");
      return;
    }

    setSubiendoLogo(true);

    try {
      const extension = extensionArchivo(archivo);
      const ruta = `empresas/${empresaId}/logo.${extension}`;

      const { error: errorUpload } = await supabase.storage
        .from("logos-empresas")
        .upload(ruta, archivo, {
          upsert: true,
          cacheControl: "3600",
          contentType: archivo.type || undefined,
        });

      if (errorUpload) {
        throw errorUpload;
      }

      const { data: publicData } = supabase.storage
        .from("logos-empresas")
        .getPublicUrl(ruta);

      const logoUrl = `${publicData.publicUrl}?v=${Date.now()}`;

      const { error: errorEmpresa } = await supabase
        .from("empresas")
        .update({
          logo_url: logoUrl,
        })
        .eq("id", empresaId);

      if (errorEmpresa) {
        throw errorEmpresa;
      }

      setEmpresa((prev) => ({
        ...prev,
        logo_url: logoUrl,
      }));

      alert("Logo del negocio actualizado correctamente.");
    } catch (error) {
      alert(
        "No se pudo subir el logo: " +
          (error?.message || "Error inesperado")
      );
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function quitarLogoEmpresa() {
    const empresaId = obtenerEmpresaId();

    if (!empresaId || !empresa?.logo_url || eliminandoLogo) return;

    if (
      !window.confirm(
        "¿Desea quitar el logo actual del negocio?"
      )
    ) {
      return;
    }

    setEliminandoLogo(true);

    try {
      const url = String(empresa.logo_url || "");
      const match = url.match(
        /logos-empresas\/(.+?)(?:\?|$)/
      );

      if (match?.[1]) {
        await supabase.storage
          .from("logos-empresas")
          .remove([decodeURIComponent(match[1])]);
      }

      const { error } = await supabase
        .from("empresas")
        .update({
          logo_url: null,
        })
        .eq("id", empresaId);

      if (error) throw error;

      setEmpresa((prev) => ({
        ...prev,
        logo_url: null,
      }));

      alert("Logo eliminado correctamente.");
    } catch (error) {
      alert(
        "No se pudo quitar el logo: " +
          (error?.message || "Error inesperado")
      );
    } finally {
      setEliminandoLogo(false);
    }
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

  function limpiarFormularioPlan() {
    setPlanEditandoId("");
    setFormPlan({ ...PLAN_INICIAL });
  }

  function editarPlan(plan) {
    setPlanEditandoId(plan.id);

    setFormPlan({
      nombre: plan.nombre || "",
      descripcion: plan.descripcion || "",
      precio:
        plan.precio === null || plan.precio === undefined
          ? ""
          : String(plan.precio),
      periodicidad: plan.periodicidad || "Mensual",
      duracion_cantidad: Number(plan.duracion_cantidad || 1),
      duracion_unidad: plan.duracion_unidad || "Meses",
      dias_aviso: Number(plan.dias_aviso ?? 5),
      dias_gracia: Number(plan.dias_gracia ?? 3),
      activo: plan.activo !== false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardarPlanMembresia() {
    const empresaId = obtenerEmpresaId();

    if (!empresaId || guardandoPlan) return;

    const nombre = String(formPlan.nombre || "").trim();
    const precio = Number(formPlan.precio || 0);

    if (!nombre) {
      alert("Escriba el nombre del plan.");
      return;
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      alert("El precio del plan debe ser mayor que cero.");
      return;
    }

    const payload = {
      empresa_id: empresaId,
      nombre,
      descripcion: String(formPlan.descripcion || "").trim() || null,
      precio,
      periodicidad: formPlan.periodicidad || "Mensual",
      duracion_cantidad: Math.max(
        1,
        Math.floor(Number(formPlan.duracion_cantidad || 1))
      ),
      duracion_unidad: formPlan.duracion_unidad || "Meses",
      dias_aviso: Math.max(
        0,
        Math.floor(Number(formPlan.dias_aviso || 0))
      ),
      dias_gracia: Math.max(
        0,
        Math.floor(Number(formPlan.dias_gracia || 0))
      ),
      activo: Boolean(formPlan.activo),
    };

    setGuardandoPlan(true);

    let error = null;

    if (planEditandoId) {
      const respuesta = await supabase
        .from("planes_membresia")
        .update(payload)
        .eq("id", planEditandoId)
        .eq("empresa_id", empresaId);

      error = respuesta.error;
    } else {
      const respuesta = await supabase
        .from("planes_membresia")
        .insert([payload]);

      error = respuesta.error;
    }

    setGuardandoPlan(false);

    if (error) {
      alert(
        (planEditandoId
          ? "No se pudo actualizar el plan: "
          : "No se pudo crear el plan: ") + error.message
      );
      return;
    }

    alert(
      planEditandoId
        ? "Plan actualizado correctamente."
        : "Plan creado correctamente."
    );

    limpiarFormularioPlan();
    await cargarPlanesMembresia(empresaId);
  }

  async function cambiarEstadoPlan(plan) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId || guardandoPlan) return;

    const nuevoEstado = !Boolean(plan.activo);

    if (
      !window.confirm(
        `¿Desea ${
          nuevoEstado ? "activar" : "desactivar"
        } el plan "${plan.nombre}"?`
      )
    ) {
      return;
    }

    setGuardandoPlan(true);

    const { error } = await supabase
      .from("planes_membresia")
      .update({ activo: nuevoEstado })
      .eq("id", plan.id)
      .eq("empresa_id", empresaId);

    setGuardandoPlan(false);

    if (error) {
      alert("No se pudo cambiar el estado del plan: " + error.message);
      return;
    }

    await cargarPlanesMembresia(empresaId);
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
    <div style={pagina} className="config-page">
      <style>{`
        @media (max-width: 900px), (max-device-width: 900px), (pointer: coarse) {
          html, body {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          .config-page {
            width: 100% !important;
            max-width: 100% !important;
            padding: 10px !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          .config-contenedor,
          .config-contenido {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .config-hero {
            padding: 16px !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 14px !important;
            box-sizing: border-box !important;
          }

          .config-hero-left {
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: 72px minmax(0,1fr) !important;
            gap: 12px !important;
            align-items: center !important;
          }

          .config-hero-left img {
            width: 72px !important;
          }

          .config-hero-left h1 {
            font-size: 29px !important;
            line-height: 1.05 !important;
          }

          .config-hero button {
            width: 100% !important;
          }

          .config-resumen {
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
            gap: 9px !important;
          }

          .config-layout {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .config-menu {
            min-height: auto !important;
            padding: 14px !important;
          }

          .config-card {
            padding: 16px !important;
            box-sizing: border-box !important;
          }

          .config-grid-dos,
          .planes-grid {
            grid-template-columns: 1fr !important;
          }

          .plan-item {
            grid-template-columns: 1fr !important;
          }

          .plan-acciones {
            justify-content: flex-start !important;
          }

          .logo-negocio-box {
            grid-template-columns: 1fr !important;
          }

          .logo-negocio-preview {
            width: 100px !important;
            height: 100px !important;
          }

          .config-page input,
          .config-page select,
          .config-page textarea,
          .config-page button {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .config-page input,
          .config-page select,
          .config-page textarea {
            font-size: 16px !important;
          }
        }

        @media (max-width: 390px), (max-device-width: 390px) {
          .config-resumen {
            grid-template-columns: 1fr !important;
          }

          .config-hero-left {
            grid-template-columns: 60px minmax(0,1fr) !important;
          }

          .config-hero-left img {
            width: 60px !important;
          }

          .config-hero-left h1 {
            font-size: 26px !important;
          }
        }
      `}</style>

      <div style={contenedor} className="config-contenedor">
        <div style={hero} className="config-hero">
          <div style={heroLeft} className="config-hero-left">
            <img src="/konax-logo.png" alt="KONAX" style={logoHero} />

            <div>
              <p style={eyebrow}>Panel Administrativo</p>
              <h1 style={titulo}>Configuraciones</h1>
              <p style={subtitulo}>
                Administra tu perfil, negocio y configuración operativa.
              </p>
            </div>
          </div>

          <button style={botonVolver} onClick={volverDashboard}>
            ← Volver al Dashboard
          </button>
        </div>

        <div style={resumenGrid} className="config-resumen">
          <Resumen
            titulo="Empresa"
            valor={empresa?.nombre || "Sin empresa"}
            icono="🏢"
          />
          <Resumen
            titulo="Plan KONAX"
            valor={empresa?.plan_nombre || "Sin plan"}
            icono="💼"
          />
          <Resumen
            titulo="Usuario"
            valor={usuario?.nombre || "Usuario"}
            icono="👤"
          />
          <Resumen
            titulo="Estado"
            valor={empresa?.estado_plan || empresa?.estado || "Activo"}
            icono="✅"
          />
        </div>

        <div style={layout} className="config-layout">
          <aside style={menu} className="config-menu">
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

            {gimnasio && (
              <Item
                texto="Planes de membresía"
                icono="🏷️"
                activo={seccion === "planes_membresia"}
                onClick={() => {
                  setSeccion("planes_membresia");
                  cargarPlanesMembresia();
                }}
              />
            )}

            <Item
              texto="Mi plan KONAX"
              icono="💼"
              activo={seccion === "plan"}
              onClick={() => setSeccion("plan")}
            />
          </aside>

          <main style={contenido} className="config-contenido">
            {seccion === "perfil" && (
              <Card
                titulo="Mi perfil"
                descripcion="Datos principales del usuario administrador."
                icono="👤"
              >
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
              <Card
                titulo="Perfil empresarial"
                descripcion="Información administrativa del negocio."
                icono="🏢"
              >
                <div
                  className="logo-negocio-box"
                  style={logoNegocioBox}
                >
                  <div
                    className="logo-negocio-preview"
                    style={logoNegocioPreview}
                  >
                    {empresa?.logo_url ? (
                      <img
                        src={empresa.logo_url}
                        alt={empresa?.nombre || "Logo del negocio"}
                        style={logoNegocioImg}
                      />
                    ) : (
                      <span style={logoPlaceholder}>🏢</span>
                    )}
                  </div>

                  <div style={logoNegocioInfo}>
                    <strong style={logoNegocioTitulo}>
                      Logo del negocio
                    </strong>

                    <p style={logoNegocioTexto}>
                      Este logo se mostrará en el portal público de
                      reservas de tu negocio. Recomendado: imagen
                      cuadrada PNG, JPG o WEBP.
                    </p>

                    <div style={logoAcciones}>
                      <label style={botonSubirLogo}>
                        {subiendoLogo
                          ? "Subiendo..."
                          : empresa?.logo_url
                          ? "Cambiar logo"
                          : "Subir logo"}

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={subirLogoEmpresa}
                          disabled={subiendoLogo || eliminandoLogo}
                          style={{ display: "none" }}
                        />
                      </label>

                      {empresa?.logo_url && (
                        <button
                          type="button"
                          style={botonQuitarLogo}
                          onClick={quitarLogoEmpresa}
                          disabled={subiendoLogo || eliminandoLogo}
                        >
                          {eliminandoLogo
                            ? "Quitando..."
                            : "Quitar logo"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <Campo labelTexto="Nombre del negocio">
                  <input
                    value={empresa?.nombre || ""}
                    onChange={(e) =>
                      actualizarEmpresa("nombre", e.target.value)
                    }
                    style={input}
                  />
                </Campo>

                <div style={gridDos} className="config-grid-dos">
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
                </div>

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

            {seccion === "planes_membresia" && gimnasio && (
              <>
                <Card
                  titulo={
                    planEditandoId
                      ? "Editar plan de membresía"
                      : "Crear plan de membresía"
                  }
                  descripcion="Configura los planes que luego podrás asignar a los alumnos desde Membresías."
                  icono="🏷️"
                >
                  <div style={gridDos} className="planes-grid">
                    <Campo labelTexto="Nombre del plan *">
                      <input
                        value={formPlan.nombre}
                        onChange={(e) =>
                          actualizarPlan("nombre", e.target.value)
                        }
                        style={input}
                        placeholder="Ej. Plan Regular"
                      />
                    </Campo>

                    <Campo labelTexto="Precio *">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={formPlan.precio}
                        onChange={(e) =>
                          actualizarPlan("precio", e.target.value)
                        }
                        style={input}
                        placeholder="20.00"
                      />
                    </Campo>

                    <Campo labelTexto="Periodicidad">
                      <select
                        value={formPlan.periodicidad}
                        onChange={(e) =>
                          actualizarPlan("periodicidad", e.target.value)
                        }
                        style={input}
                      >
                        <option>Diaria</option>
                        <option>Semanal</option>
                        <option>Quincenal</option>
                        <option>Mensual</option>
                        <option>Trimestral</option>
                        <option>Semestral</option>
                        <option>Anual</option>
                      </select>
                    </Campo>

                    <Campo labelTexto="Duración">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formPlan.duracion_cantidad}
                        onChange={(e) =>
                          actualizarPlan(
                            "duracion_cantidad",
                            e.target.value
                          )
                        }
                        style={input}
                      />
                    </Campo>

                    <Campo labelTexto="Unidad de duración">
                      <select
                        value={formPlan.duracion_unidad}
                        onChange={(e) =>
                          actualizarPlan(
                            "duracion_unidad",
                            e.target.value
                          )
                        }
                        style={input}
                      >
                        <option>Días</option>
                        <option>Semanas</option>
                        <option>Meses</option>
                        <option>Años</option>
                      </select>
                    </Campo>

                    <Campo labelTexto="Avisar antes de vencer (días)">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formPlan.dias_aviso}
                        onChange={(e) =>
                          actualizarPlan("dias_aviso", e.target.value)
                        }
                        style={input}
                      />
                    </Campo>

                    <Campo labelTexto="Días de gracia">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formPlan.dias_gracia}
                        onChange={(e) =>
                          actualizarPlan("dias_gracia", e.target.value)
                        }
                        style={input}
                      />
                    </Campo>

                    <Campo labelTexto="Estado">
                      <select
                        value={formPlan.activo ? "Activo" : "Inactivo"}
                        onChange={(e) =>
                          actualizarPlan(
                            "activo",
                            e.target.value === "Activo"
                          )
                        }
                        style={input}
                      >
                        <option>Activo</option>
                        <option>Inactivo</option>
                      </select>
                    </Campo>
                  </div>

                  <Campo labelTexto="Descripción">
                    <textarea
                      value={formPlan.descripcion}
                      onChange={(e) =>
                        actualizarPlan("descripcion", e.target.value)
                      }
                      style={textarea}
                      placeholder="Ej. Acceso completo al gimnasio por un mes."
                    />
                  </Campo>

                  <div style={accionesFormularioPlan}>
                    <button
                      type="button"
                      style={botonGuardar}
                      onClick={guardarPlanMembresia}
                      disabled={guardandoPlan}
                    >
                      {guardandoPlan
                        ? "Guardando..."
                        : planEditandoId
                        ? "Actualizar plan"
                        : "Crear plan"}
                    </button>

                    {planEditandoId && (
                      <button
                        type="button"
                        style={botonCancelar}
                        onClick={limpiarFormularioPlan}
                        disabled={guardandoPlan}
                      >
                        Cancelar edición
                      </button>
                    )}
                  </div>
                </Card>

                <div style={{ height: 16 }} />

                <Card
                  titulo="Planes configurados"
                  descripcion="Los planes activos son los que aparecen al asignar una nueva membresía."
                  icono="📋"
                >
                  {cargandoPlanes ? (
                    <p style={textoSuave}>Cargando planes...</p>
                  ) : planes.length === 0 ? (
                    <div style={vacioPlanes}>
                      No hay planes de membresía configurados todavía.
                    </div>
                  ) : (
                    <div style={listaPlanes}>
                      {planes.map((plan) => (
                        <div
                          key={plan.id}
                          style={planItem}
                          className="plan-item"
                        >
                          <div>
                            <div style={planTituloFila}>
                              <strong style={planNombre}>
                                {plan.nombre}
                              </strong>

                              <span
                                style={
                                  plan.activo
                                    ? badgeActivo
                                    : badgeInactivo
                                }
                              >
                                {plan.activo ? "Activo" : "Inactivo"}
                              </span>
                            </div>

                            <div style={planPrecio}>
                              B/. {Number(plan.precio || 0).toFixed(2)}
                            </div>

                            <p style={planDetalle}>
                              {Number(plan.duracion_cantidad || 1)}{" "}
                              {plan.duracion_unidad || "Meses"} ·{" "}
                              {plan.periodicidad || "Mensual"} · Aviso{" "}
                              {Number(plan.dias_aviso ?? 5)} día(s) antes ·
                              Gracia {Number(plan.dias_gracia ?? 3)} día(s)
                            </p>

                            {plan.descripcion && (
                              <p style={planDescripcion}>
                                {plan.descripcion}
                              </p>
                            )}
                          </div>

                          <div style={planAcciones} className="plan-acciones">
                            <button
                              type="button"
                              style={botonEditarPlan}
                              onClick={() => editarPlan(plan)}
                              disabled={guardandoPlan}
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              style={
                                plan.activo
                                  ? botonDesactivar
                                  : botonActivar
                              }
                              onClick={() => cambiarEstadoPlan(plan)}
                              disabled={guardandoPlan}
                            >
                              {plan.activo ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}

            {seccion === "plan" && (
              <Card
                titulo="Mi plan KONAX"
                descripcion="Resumen del plan activo contratado en KONAX."
                icono="💼"
              >
                <div style={planBox}>
                  <div>
                    <p style={labelPlan}>Plan actual</p>
                    <h2 style={nombrePlan}>
                      {empresa?.plan_nombre || "Sin plan"}
                    </h2>
                    <p style={texto}>
                      Los cambios del plan KONAX y sus módulos son
                      administrados por KONAX.
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
    <button
      type="button"
      style={activo ? itemActivo : item}
      onClick={onClick}
    >
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
    <div style={card} className="config-card">
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
  background:
    "linear-gradient(135deg, #eef2f7 0%, #f8fafc 45%, #ecfdf5 100%)",
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
  minWidth: "52px",
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
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
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

const botonCancelar = {
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  padding: "13px 22px",
  borderRadius: "12px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "10px",
};

const accionesFormularioPlan = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
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

const logoNegocioBox = {
  marginBottom: "22px",
  padding: "16px",
  display: "grid",
  gridTemplateColumns: "120px minmax(0,1fr)",
  gap: "18px",
  alignItems: "center",
  border: "1px solid #dfe6e2",
  borderRadius: "18px",
  background: "#f9fbfa",
};

const logoNegocioPreview = {
  width: "120px",
  height: "120px",
  display: "grid",
  placeItems: "center",
  border: "1px solid #d9e2dd",
  borderRadius: "18px",
  background: "#ffffff",
  overflow: "hidden",
};

const logoNegocioImg = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
};

const logoPlaceholder = {
  fontSize: "42px",
};

const logoNegocioInfo = {
  minWidth: 0,
};

const logoNegocioTitulo = {
  display: "block",
  color: "#111827",
  fontSize: "17px",
  marginBottom: "5px",
};

const logoNegocioTexto = {
  margin: "0 0 12px",
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: 1.5,
};

const logoAcciones = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const botonSubirLogo = {
  minHeight: "40px",
  padding: "0 14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "11px",
  background: "#0b7041",
  color: "#ffffff",
  fontWeight: 900,
  fontSize: "13px",
  cursor: "pointer",
};

const botonQuitarLogo = {
  minHeight: "40px",
  padding: "0 14px",
  border: "1px solid #fecaca",
  borderRadius: "11px",
  background: "#fff5f5",
  color: "#b42318",
  fontWeight: 900,
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

const vacioPlanes = {
  padding: "18px",
  border: "1px dashed #cbd5e1",
  borderRadius: "14px",
  background: "#f8fafc",
  color: "#64748b",
  textAlign: "center",
};

const listaPlanes = {
  display: "grid",
  gap: "12px",
};

const planItem = {
  padding: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  background: "#f9fafb",
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) auto",
  gap: "16px",
  alignItems: "center",
};

const planTituloFila = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
};

const planNombre = {
  color: "#111827",
  fontSize: "17px",
};

const planPrecio = {
  marginTop: "7px",
  color: "#166534",
  fontSize: "22px",
  fontWeight: 900,
};

const planDetalle = {
  margin: "7px 0 0",
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: 1.5,
};

const planDescripcion = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: "12px",
};

const badgeActivo = {
  padding: "5px 9px",
  borderRadius: "999px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: "10px",
  fontWeight: 900,
};

const badgeInactivo = {
  padding: "5px 9px",
  borderRadius: "999px",
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: "10px",
  fontWeight: 900,
};

const planAcciones = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const botonEditarPlan = {
  minHeight: "38px",
  padding: "9px 12px",
  border: "none",
  borderRadius: "10px",
  background: "#111827",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};

const botonDesactivar = {
  minHeight: "38px",
  padding: "9px 12px",
  border: "1px solid #fed7aa",
  borderRadius: "10px",
  background: "#fff7ed",
  color: "#c2410c",
  fontWeight: 800,
  cursor: "pointer",
};

const botonActivar = {
  minHeight: "38px",
  padding: "9px 12px",
  border: "1px solid #bbf7d0",
  borderRadius: "10px",
  background: "#f0fdf4",
  color: "#166534",
  fontWeight: 800,
  cursor: "pointer",
};
