"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

// KONAX Configuración · Perfil empresarial + Gimnasio + Profesionales Belleza
// Version 2026.08.21-PROFESIONALES-MOVIL-FIX2

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

const PROFESIONAL_INICIAL = {
  nombre: "",
  especialidad: "",
  telefono: "",
  correo: "",
  foto_url: "",
  servicio_ids: [],
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
  const texto = normalizar(
    `${empresa?.tipo_negocio || ""} ${empresa?.categoria_negocio || ""}`
  );
  return ["gimnasio", "gym", "fitness", "membresia", "suscripcion"].some(
    (p) => texto.includes(p)
  );
}

function esNegocioSalonBelleza(empresa) {
  const texto = normalizar(
    `${empresa?.tipo_negocio || ""} ${empresa?.categoria_negocio || ""}`
  );
  return ["belleza", "salon", "peluqueria", "estetica", "barberia", "spa"].some(
    (p) => texto.includes(p)
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

function nuevoProfesional() {
  return { ...PROFESIONAL_INICIAL, servicio_ids: [] };
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

  const [profesionales, setProfesionales] = useState([]);
  const [serviciosSalon, setServiciosSalon] = useState([]);
  const [cargandoProfesionales, setCargandoProfesionales] = useState(false);
  const [guardandoProfesional, setGuardandoProfesional] = useState(false);
  const [subiendoFotoProfesional, setSubiendoFotoProfesional] = useState(false);
  const [profesionalEditandoId, setProfesionalEditandoId] = useState("");
  const [formProfesional, setFormProfesional] = useState(nuevoProfesional());

  const gimnasio = useMemo(() => esNegocioGimnasio(empresa), [empresa]);
  const salonBelleza = useMemo(() => esNegocioSalonBelleza(empresa), [empresa]);

  useEffect(() => {
    cargarDatos();

    const params = new URLSearchParams(window.location.search);
    const solicitada = params.get("seccion");
    if (["perfil", "empresa", "planes_membresia", "profesionales", "plan"].includes(solicitada || "")) {
      setSeccion(solicitada);
    }
  }, []);

  function empresaId() {
    return localStorage.getItem("empresaId");
  }

  function usuarioId() {
    return localStorage.getItem("usuarioId");
  }

  function esAdministrador() {
    return [
      "administrador",
      "superadmin",
      "super_admin",
      "admin master",
      "admin_master",
      "administrador master",
      "administrador_master",
    ].includes(normalizar(localStorage.getItem("usuarioRol")));
  }

  async function cargarDatos() {
    setCargando(true);
    const eId = empresaId();
    const uId = usuarioId();

    if (!eId || !uId) {
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

    const [ru, re] = await Promise.all([
      supabase.from("usuarios").select("*").eq("id", uId).eq("empresa_id", eId).maybeSingle(),
      supabase.from("empresas").select("*").eq("id", eId).maybeSingle(),
    ]);

    if (ru.error) {
      alert("Error cargando usuario: " + ru.error.message);
      setCargando(false);
      return;
    }
    if (re.error) {
      alert("Error cargando empresa: " + re.error.message);
      setCargando(false);
      return;
    }

    setUsuario(ru.data || null);
    setEmpresa(re.data || null);

    const tareas = [];
    if (esNegocioGimnasio(re.data)) tareas.push(cargarPlanesMembresia(eId));
    if (esNegocioSalonBelleza(re.data)) {
      tareas.push(cargarProfesionales(eId));
      tareas.push(cargarServiciosSalon(eId));
    }
    if (tareas.length) await Promise.all(tareas);
    setCargando(false);
  }

  async function cargarPlanesMembresia(id = empresaId()) {
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

  async function cargarServiciosSalon(id = empresaId()) {
    if (!id) return;
    const { data, error } = await supabase
      .from("agenda_servicios")
      .select("id,nombre,activo")
      .eq("empresa_id", id)
      .order("nombre", { ascending: true });
    if (error) {
      console.error(error);
      setServiciosSalon([]);
      return;
    }
    setServiciosSalon(data || []);
  }

  async function cargarProfesionales(id = empresaId()) {
    if (!id) return;
    setCargandoProfesionales(true);
    const { data, error } = await supabase
      .from("profesionales")
      .select("*")
      .eq("empresa_id", String(id))
      .order("activo", { ascending: false })
      .order("nombre", { ascending: true });
    setCargandoProfesionales(false);
    if (error) {
      console.error(error);
      setProfesionales([]);
      return;
    }
    setProfesionales(data || []);
  }

  function actualizarUsuario(campo, valor) {
    setUsuario((p) => ({ ...p, [campo]: valor }));
  }

  function actualizarEmpresa(campo, valor) {
    setEmpresa((p) => ({ ...p, [campo]: valor }));
  }

  function actualizarPlan(campo, valor) {
    setFormPlan((p) => ({ ...p, [campo]: valor }));
  }

  function actualizarProfesional(campo, valor) {
    setFormProfesional((p) => ({ ...p, [campo]: valor }));
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
      .eq("empresa_id", empresaId());
    setGuardando(false);
    if (error) return alert("Error guardando perfil: " + error.message);
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
      .eq("id", empresaId());
    setGuardando(false);
    if (error) return alert("Error guardando empresa: " + error.message);
    localStorage.setItem("empresaNombre", empresa.nombre || "");
    localStorage.setItem("tipoNegocio", empresa.tipo_negocio || "");
    localStorage.setItem("categoriaNegocio", empresa.categoria_negocio || "");
    alert("Perfil empresarial actualizado correctamente.");
  }

  async function subirLogoEmpresa(evento) {
    const archivo = evento.target.files?.[0];
    const eId = empresaId();
    evento.target.value = "";
    if (!archivo || !eId) return;
    if (!archivo.type?.startsWith("image/")) return alert("Seleccione una imagen PNG, JPG o WEBP.");
    if (archivo.size > 5 * 1024 * 1024) return alert("El logo no puede pesar más de 5 MB.");

    setSubiendoLogo(true);
    try {
      const ext = extensionArchivo(archivo);
      const ruta = `empresas/${eId}/logo.${ext}`;
      const up = await supabase.storage.from("logos-empresas").upload(ruta, archivo, {
        upsert: true,
        cacheControl: "3600",
        contentType: archivo.type || undefined,
      });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from("logos-empresas").getPublicUrl(ruta);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const save = await supabase.from("empresas").update({ logo_url: url }).eq("id", eId);
      if (save.error) throw save.error;
      setEmpresa((p) => ({ ...p, logo_url: url }));
      alert("Logo del negocio actualizado correctamente.");
    } catch (error) {
      alert("No se pudo subir el logo: " + (error?.message || "Error inesperado"));
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function quitarLogoEmpresa() {
    const eId = empresaId();
    if (!eId || !empresa?.logo_url || eliminandoLogo) return;
    if (!window.confirm("¿Desea quitar el logo actual del negocio?")) return;
    setEliminandoLogo(true);
    try {
      const url = String(empresa.logo_url || "");
      const match = url.match(/logos-empresas\/(.+?)(?:\?|$)/);
      if (match?.[1]) await supabase.storage.from("logos-empresas").remove([decodeURIComponent(match[1])]);
      const { error } = await supabase.from("empresas").update({ logo_url: null }).eq("id", eId);
      if (error) throw error;
      setEmpresa((p) => ({ ...p, logo_url: null }));
      alert("Logo eliminado correctamente.");
    } catch (error) {
      alert("No se pudo quitar el logo: " + (error?.message || "Error inesperado"));
    } finally {
      setEliminandoLogo(false);
    }
  }

  function limpiarProfesional() {
    setProfesionalEditandoId("");
    setFormProfesional(nuevoProfesional());
  }

  function editarProfesional(prof) {
    setProfesionalEditandoId(prof.id);
    setFormProfesional({
      nombre: prof.nombre || "",
      especialidad: prof.especialidad || "",
      telefono: prof.telefono || "",
      correo: prof.correo || "",
      foto_url: prof.foto_url || "",
      servicio_ids: Array.isArray(prof.servicio_ids) ? prof.servicio_ids.map(String) : [],
      activo: prof.activo !== false,
    });
    setSeccion("profesionales");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function alternarServicio(id) {
    const clave = String(id);
    setFormProfesional((p) => ({
      ...p,
      servicio_ids: p.servicio_ids.includes(clave)
        ? p.servicio_ids.filter((x) => x !== clave)
        : [...p.servicio_ids, clave],
    }));
  }

  async function subirFotoProfesional(evento) {
    const archivo = evento.target.files?.[0];
    const eId = empresaId();
    evento.target.value = "";
    if (!archivo || !eId) return;
    if (!archivo.type?.startsWith("image/")) return alert("Seleccione una imagen PNG, JPG o WEBP.");
    if (archivo.size > 5 * 1024 * 1024) return alert("La foto no puede pesar más de 5 MB.");

    setSubiendoFotoProfesional(true);
    try {
      const ext = extensionArchivo(archivo);
      const identificador = profesionalEditandoId || `nuevo-${Date.now()}`;
      const ruta = `empresas/${eId}/${identificador}.${ext}`;
      const up = await supabase.storage.from("profesionales").upload(ruta, archivo, {
        upsert: true,
        cacheControl: "3600",
        contentType: archivo.type || undefined,
      });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from("profesionales").getPublicUrl(ruta);
      actualizarProfesional("foto_url", `${data.publicUrl}?v=${Date.now()}`);
    } catch (error) {
      alert("No se pudo subir la foto: " + (error?.message || "Error inesperado"));
    } finally {
      setSubiendoFotoProfesional(false);
    }
  }

  async function guardarProfesional() {
    const eId = empresaId();
    if (!eId || guardandoProfesional) return;
    const nombre = String(formProfesional.nombre || "").trim();
    if (!nombre) return alert("Escriba el nombre del profesional.");

    const payload = {
      empresa_id: String(eId),
      nombre,
      especialidad: String(formProfesional.especialidad || "").trim() || null,
      telefono: String(formProfesional.telefono || "").trim() || null,
      correo: String(formProfesional.correo || "").trim() || null,
      foto_url: String(formProfesional.foto_url || "").trim() || null,
      servicio_ids: formProfesional.servicio_ids.map(String),
      activo: Boolean(formProfesional.activo),
      updated_at: new Date().toISOString(),
    };

    setGuardandoProfesional(true);
    const respuesta = profesionalEditandoId
      ? await supabase.from("profesionales").update(payload).eq("id", profesionalEditandoId).eq("empresa_id", String(eId))
      : await supabase.from("profesionales").insert([payload]);
    setGuardandoProfesional(false);

    if (respuesta.error) {
      return alert("No se pudo guardar el profesional: " + respuesta.error.message);
    }

    alert(profesionalEditandoId ? "Perfil profesional actualizado." : "Perfil profesional creado.");
    limpiarProfesional();
    await cargarProfesionales(eId);
  }

  async function cambiarEstadoProfesional(prof) {
    const eId = empresaId();
    if (!eId) return;
    setGuardandoProfesional(true);
    const { error } = await supabase
      .from("profesionales")
      .update({ activo: !Boolean(prof.activo), updated_at: new Date().toISOString() })
      .eq("id", prof.id)
      .eq("empresa_id", String(eId));
    setGuardandoProfesional(false);
    if (error) return alert("No se pudo cambiar el estado: " + error.message);
    await cargarProfesionales(eId);
  }

  function limpiarPlan() {
    setPlanEditandoId("");
    setFormPlan({ ...PLAN_INICIAL });
  }

  function editarPlan(plan) {
    setPlanEditandoId(plan.id);
    setFormPlan({
      nombre: plan.nombre || "",
      descripcion: plan.descripcion || "",
      precio: plan.precio == null ? "" : String(plan.precio),
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
    const eId = empresaId();
    if (!eId || guardandoPlan) return;
    const nombre = String(formPlan.nombre || "").trim();
    const precio = Number(formPlan.precio || 0);
    if (!nombre) return alert("Escriba el nombre del plan.");
    if (!Number.isFinite(precio) || precio <= 0) return alert("El precio del plan debe ser mayor que cero.");

    const payload = {
      empresa_id: eId,
      nombre,
      descripcion: String(formPlan.descripcion || "").trim() || null,
      precio,
      periodicidad: formPlan.periodicidad || "Mensual",
      duracion_cantidad: Math.max(1, Math.floor(Number(formPlan.duracion_cantidad || 1))),
      duracion_unidad: formPlan.duracion_unidad || "Meses",
      dias_aviso: Math.max(0, Math.floor(Number(formPlan.dias_aviso || 0))),
      dias_gracia: Math.max(0, Math.floor(Number(formPlan.dias_gracia || 0))),
      activo: Boolean(formPlan.activo),
    };

    setGuardandoPlan(true);
    const respuesta = planEditandoId
      ? await supabase.from("planes_membresia").update(payload).eq("id", planEditandoId).eq("empresa_id", eId)
      : await supabase.from("planes_membresia").insert([payload]);
    setGuardandoPlan(false);
    if (respuesta.error) return alert("No se pudo guardar el plan: " + respuesta.error.message);
    alert(planEditandoId ? "Plan actualizado correctamente." : "Plan creado correctamente.");
    limpiarPlan();
    await cargarPlanesMembresia(eId);
  }

  async function cambiarEstadoPlan(plan) {
    const eId = empresaId();
    if (!eId || guardandoPlan) return;
    const nuevo = !Boolean(plan.activo);
    if (!window.confirm(`¿Desea ${nuevo ? "activar" : "desactivar"} el plan "${plan.nombre}"?`)) return;
    setGuardandoPlan(true);
    const { error } = await supabase.from("planes_membresia").update({ activo: nuevo }).eq("id", plan.id).eq("empresa_id", eId);
    setGuardandoPlan(false);
    if (error) return alert("No se pudo cambiar el estado del plan: " + error.message);
    await cargarPlanesMembresia(eId);
  }

  if (cargando) {
    return (
      <div style={S.loadingPage}>
        <div style={S.loadingCard}>
          <img src="/konax-logo.png" alt="KONAX" style={{ width: 80, marginBottom: 14 }} />
          <strong>Cargando configuración...</strong>
          <p style={S.muted}>Validando empresa y usuario.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page} className="config-page">
      <style>{CSS}</style>
      <div style={S.container}>
        <header style={S.hero} className="config-hero">
          <div style={S.heroLeft} className="config-hero-left">
            <img src="/konax-logo.png" alt="KONAX" style={S.heroLogo} />
            <div>
              <p style={S.eyebrow}>Panel Administrativo</p>
              <h1 style={S.title}>Configuraciones</h1>
              <p style={S.subtitle}>Administra tu perfil, negocio y configuración operativa.</p>
            </div>
          </div>
          <button style={S.back} onClick={() => (window.location.href = "/dashboard")}>← Volver al Dashboard</button>
        </header>

        <div style={S.summaryGrid} className="config-resumen">
          <Resumen titulo="Empresa" valor={empresa?.nombre || "Sin empresa"} icono="🏢" />
          <Resumen titulo="Plan KONAX" valor={empresa?.plan_nombre || "Sin plan"} icono="💼" />
          <Resumen titulo="Usuario" valor={usuario?.nombre || "Usuario"} icono="👤" />
          <Resumen titulo="Estado" valor={empresa?.estado_plan || empresa?.estado || "Activo"} icono="✅" />
        </div>

        <div style={S.layout} className="config-layout">
          <aside style={S.menu} className="config-menu">
            <div style={S.brand}>
              <img src="/konax-logo.png" alt="KONAX" style={S.menuLogo} />
              <div><strong>KONAX</strong><p style={S.mutedSmall}>Configuración</p></div>
            </div>

            <Grupo titulo="Mi cuenta" />
            <Item texto="Mi perfil" icono="👤" activo={seccion === "perfil"} onClick={() => setSeccion("perfil")} />
            <Separador />
            <Grupo titulo="Mi negocio" />
            <Item texto="Perfil empresarial" icono="🏢" activo={seccion === "empresa"} onClick={() => setSeccion("empresa")} />

            {salonBelleza && (
              <Item
                texto="Perfiles profesionales"
                icono="✂️"
                activo={seccion === "profesionales"}
                onClick={() => {
                  setSeccion("profesionales");
                  cargarProfesionales();
                  cargarServiciosSalon();
                }}
              />
            )}

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

            <Item texto="Mi plan KONAX" icono="💼" activo={seccion === "plan"} onClick={() => setSeccion("plan")} />
          </aside>

          <main style={{ minWidth: 0 }}>
            {seccion === "perfil" && (
              <Card titulo="Mi perfil" descripcion="Datos principales del usuario administrador." icono="👤">
                <Campo label="Nombre"><input style={S.input} value={usuario?.nombre || ""} onChange={(e) => actualizarUsuario("nombre", e.target.value)} /></Campo>
                <Campo label="Correo"><input style={S.input} type="email" value={usuario?.correo || ""} onChange={(e) => actualizarUsuario("correo", e.target.value)} /></Campo>
                <Campo label="Rol"><input style={{ ...S.input, background: "#f3f4f6" }} value={usuario?.rol || ""} disabled /></Campo>
                <button style={S.primary} onClick={guardarPerfil} disabled={guardando}>{guardando ? "Guardando..." : "Guardar perfil"}</button>
              </Card>
            )}

            {seccion === "empresa" && (
              <Card titulo="Perfil empresarial" descripcion="Información administrativa del negocio." icono="🏢">
                <div style={S.logoBox} className="logo-box">
                  <div style={S.logoPreview}>
                    {empresa?.logo_url ? <img src={empresa.logo_url} alt="Logo" style={S.coverContain} /> : <span style={{ fontSize: 42 }}>🏢</span>}
                  </div>
                  <div>
                    <strong>Logo del negocio</strong>
                    <p style={S.muted}>Este logo se mostrará en el portal público de reservas.</p>
                    <div style={S.actions}>
                      <label style={S.greenLabel}>{subiendoLogo ? "Subiendo..." : empresa?.logo_url ? "Cambiar logo" : "Subir logo"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={subirLogoEmpresa} style={{ display: "none" }} /></label>
                      {empresa?.logo_url && <button style={S.dangerLight} onClick={quitarLogoEmpresa}>{eliminandoLogo ? "Quitando..." : "Quitar logo"}</button>}
                    </div>
                  </div>
                </div>

                <Campo label="Nombre del negocio"><input style={S.input} value={empresa?.nombre || ""} onChange={(e) => actualizarEmpresa("nombre", e.target.value)} /></Campo>
                <div style={S.twoCols} className="two-cols">
                  <Campo label="Teléfono"><input style={S.input} value={empresa?.telefono || ""} onChange={(e) => actualizarEmpresa("telefono", e.target.value)} /></Campo>
                  <Campo label="Correo"><input style={S.input} type="email" value={empresa?.correo || ""} onChange={(e) => actualizarEmpresa("correo", e.target.value)} /></Campo>
                </div>
                <Campo label="Tipo de negocio"><input style={S.input} value={empresa?.tipo_negocio || ""} onChange={(e) => actualizarEmpresa("tipo_negocio", e.target.value)} /></Campo>
                <Campo label="Dirección"><textarea style={S.textarea} value={empresa?.direccion || ""} onChange={(e) => actualizarEmpresa("direccion", e.target.value)} /></Campo>
                <button style={S.primary} onClick={guardarEmpresa} disabled={guardando}>{guardando ? "Guardando..." : "Guardar negocio"}</button>
              </Card>
            )}

            {seccion === "profesionales" && salonBelleza && (
              <>
                <Card
                  titulo={profesionalEditandoId ? "Editar perfil profesional" : "Nuevo perfil profesional"}
                  descripcion="Configura quién atiende, su foto y los servicios que puede realizar."
                  icono="✂️"
                >
                  <div style={S.profHeader} className="prof-header">
                    <div style={S.profPhoto}>
                      {formProfesional.foto_url ? <img src={formProfesional.foto_url} alt="Profesional" style={S.cover} /> : <span style={S.profInitial}>{String(formProfesional.nombre || "P").charAt(0).toUpperCase()}</span>}
                    </div>
                    <div>
                      <strong style={{ fontSize: 17 }}>Foto del profesional</strong>
                      <p style={S.muted}>Esta imagen podrá mostrarse en el portal de citas para que el cliente identifique quién lo atenderá.</p>
                      <label style={S.greenLabel}>{subiendoFotoProfesional ? "Subiendo..." : formProfesional.foto_url ? "Cambiar foto" : "Subir foto"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={subirFotoProfesional} style={{ display: "none" }} /></label>
                    </div>
                  </div>

                  <div style={S.twoCols} className="two-cols">
                    <Campo label="Nombre *"><input style={S.input} value={formProfesional.nombre} onChange={(e) => actualizarProfesional("nombre", e.target.value)} placeholder="Ej. Ana López" /></Campo>
                    <Campo label="Especialidad"><input style={S.input} value={formProfesional.especialidad} onChange={(e) => actualizarProfesional("especialidad", e.target.value)} placeholder="Ej. Estilista / Manicurista" /></Campo>
                    <Campo label="Teléfono"><input style={S.input} value={formProfesional.telefono} onChange={(e) => actualizarProfesional("telefono", e.target.value)} /></Campo>
                    <Campo label="Correo"><input style={S.input} type="email" value={formProfesional.correo} onChange={(e) => actualizarProfesional("correo", e.target.value)} /></Campo>
                    <Campo label="Estado"><select style={S.input} value={formProfesional.activo ? "Activo" : "Inactivo"} onChange={(e) => actualizarProfesional("activo", e.target.value === "Activo")}><option>Activo</option><option>Inactivo</option></select></Campo>
                  </div>

                  <Campo label="Servicios que realiza">
                    {serviciosSalon.length === 0 ? (
                      <div style={S.empty}>Primero crea los servicios desde Agenda → Servicios y horarios.</div>
                    ) : (
                      <div className="service-grid">
                        {serviciosSalon.map((servicio) => {
                          const activo = formProfesional.servicio_ids.includes(String(servicio.id));
                          return <button key={servicio.id} type="button" style={activo ? S.serviceActive : S.service} onClick={() => alternarServicio(servicio.id)}>{activo ? "✓" : "+"} {servicio.nombre}</button>;
                        })}
                      </div>
                    )}
                  </Campo>

                  <div style={S.actions}>
                    <button style={S.primary} onClick={guardarProfesional} disabled={guardandoProfesional}>{guardandoProfesional ? "Guardando..." : profesionalEditandoId ? "Actualizar profesional" : "Crear profesional"}</button>
                    {profesionalEditandoId && <button style={S.secondary} onClick={limpiarProfesional}>Cancelar edición</button>}
                  </div>
                </Card>

                <div style={{ height: 16 }} />

                <Card titulo="Equipo del salón" descripcion="Perfiles que podrán utilizarse en Agenda y en el portal de citas." icono="👥">
                  {cargandoProfesionales ? <p style={S.muted}>Cargando profesionales...</p> : profesionales.length === 0 ? <div style={S.empty}>Todavía no hay profesionales registrados.</div> : (
                    <div className="prof-list">
                      {profesionales.map((prof) => {
                        const nombres = serviciosSalon.filter((s) => Array.isArray(prof.servicio_ids) && prof.servicio_ids.map(String).includes(String(s.id))).map((s) => s.nombre);
                        return (
                          <article key={prof.id} style={S.profCard} className="prof-card">
                            <div style={S.profCardTop} className="prof-card-top">
                              <div style={S.profAvatar}>{prof.foto_url ? <img src={prof.foto_url} alt={prof.nombre} style={S.cover} /> : String(prof.nombre || "P").charAt(0).toUpperCase()}</div>
                              <div style={{ minWidth: 0 }}><strong>{prof.nombre}</strong><span style={S.profSpec}>{prof.especialidad || "Sin especialidad definida"}</span></div>
                              <span style={prof.activo ? S.badgeActive : S.badgeInactive}>{prof.activo ? "Activo" : "Inactivo"}</span>
                            </div>
                            <p style={S.mutedSmall}>{nombres.length ? nombres.join(" · ") : "Sin servicios asignados"}</p>
                            <div style={S.actions}><button style={S.darkSmall} onClick={() => editarProfesional(prof)}>Editar</button><button style={prof.activo ? S.warningSmall : S.successSmall} onClick={() => cambiarEstadoProfesional(prof)}>{prof.activo ? "Desactivar" : "Activar"}</button></div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </>
            )}

            {seccion === "planes_membresia" && gimnasio && (
              <>
                <Card titulo={planEditandoId ? "Editar plan de membresía" : "Crear plan de membresía"} descripcion="Configura los planes que podrás asignar a los alumnos." icono="🏷️">
                  <div style={S.twoCols} className="two-cols">
                    <Campo label="Nombre del plan *"><input style={S.input} value={formPlan.nombre} onChange={(e) => actualizarPlan("nombre", e.target.value)} /></Campo>
                    <Campo label="Precio *"><input style={S.input} type="number" min="0" step="0.01" value={formPlan.precio} onChange={(e) => actualizarPlan("precio", e.target.value)} /></Campo>
                    <Campo label="Periodicidad"><select style={S.input} value={formPlan.periodicidad} onChange={(e) => actualizarPlan("periodicidad", e.target.value)}>{["Diaria","Semanal","Quincenal","Mensual","Trimestral","Semestral","Anual"].map((x) => <option key={x}>{x}</option>)}</select></Campo>
                    <Campo label="Duración"><input style={S.input} type="number" min="1" value={formPlan.duracion_cantidad} onChange={(e) => actualizarPlan("duracion_cantidad", e.target.value)} /></Campo>
                    <Campo label="Unidad de duración"><select style={S.input} value={formPlan.duracion_unidad} onChange={(e) => actualizarPlan("duracion_unidad", e.target.value)}>{["Días","Semanas","Meses","Años"].map((x) => <option key={x}>{x}</option>)}</select></Campo>
                    <Campo label="Avisar antes de vencer (días)"><input style={S.input} type="number" min="0" value={formPlan.dias_aviso} onChange={(e) => actualizarPlan("dias_aviso", e.target.value)} /></Campo>
                    <Campo label="Días de gracia"><input style={S.input} type="number" min="0" value={formPlan.dias_gracia} onChange={(e) => actualizarPlan("dias_gracia", e.target.value)} /></Campo>
                    <Campo label="Estado"><select style={S.input} value={formPlan.activo ? "Activo" : "Inactivo"} onChange={(e) => actualizarPlan("activo", e.target.value === "Activo")}><option>Activo</option><option>Inactivo</option></select></Campo>
                  </div>
                  <Campo label="Descripción"><textarea style={S.textarea} value={formPlan.descripcion} onChange={(e) => actualizarPlan("descripcion", e.target.value)} /></Campo>
                  <div style={S.actions}><button style={S.primary} onClick={guardarPlanMembresia}>{guardandoPlan ? "Guardando..." : planEditandoId ? "Actualizar plan" : "Crear plan"}</button>{planEditandoId && <button style={S.secondary} onClick={limpiarPlan}>Cancelar edición</button>}</div>
                </Card>

                <div style={{ height: 16 }} />
                <Card titulo="Planes configurados" descripcion="Los planes activos aparecen al asignar una nueva membresía." icono="📋">
                  {cargandoPlanes ? <p style={S.muted}>Cargando planes...</p> : planes.length === 0 ? <div style={S.empty}>No hay planes de membresía configurados todavía.</div> : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {planes.map((plan) => <article key={plan.id} style={S.planCard}><div><strong>{plan.nombre}</strong><div style={S.planPrice}>B/. {Number(plan.precio || 0).toFixed(2)}</div><p style={S.mutedSmall}>{Number(plan.duracion_cantidad || 1)} {plan.duracion_unidad || "Meses"} · {plan.periodicidad || "Mensual"}</p></div><div style={S.actions}><button style={S.darkSmall} onClick={() => editarPlan(plan)}>Editar</button><button style={plan.activo ? S.warningSmall : S.successSmall} onClick={() => cambiarEstadoPlan(plan)}>{plan.activo ? "Desactivar" : "Activar"}</button></div></article>)}
                    </div>
                  )}
                </Card>
              </>
            )}

            {seccion === "plan" && (
              <Card titulo="Mi plan KONAX" descripcion="Resumen del plan activo contratado en KONAX." icono="💼">
                <div style={S.planBox}><div><p style={S.muted}>Plan actual</p><h2>{empresa?.plan_nombre || "Sin plan"}</h2><p style={S.muted}>Los cambios del plan KONAX y sus módulos son administrados por KONAX.</p></div><span style={S.badgeBlue}>{empresa?.estado_plan || empresa?.estado || "Activo"}</span></div>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Resumen({ titulo, valor, icono }) {
  return <div style={S.summaryCard}><span style={{ fontSize: 25 }}>{icono}</span><p style={S.summaryTitle}>{titulo}</p><h3 style={S.summaryValue}>{valor}</h3></div>;
}
function Grupo({ titulo }) { return <p style={S.group}>{titulo}</p>; }
function Separador() { return <div style={S.separator} />; }
function Item({ texto, icono, activo, onClick }) { return <button type="button" style={activo ? S.itemActive : S.item} onClick={onClick}><span>{icono}</span><span>{texto}</span></button>; }
function Card({ titulo, descripcion, icono, children }) { return <section style={S.card} className="config-card"><div style={S.cardHead}><div style={S.cardIcon}>{icono}</div><div><h2 style={{ margin: 0 }}>{titulo}</h2><p style={S.muted}>{descripcion}</p></div></div>{children}</section>; }
function Campo({ label, children }) { return <div style={{ marginBottom: 16 }}><label style={S.label}>{label}</label>{children}</div>; }

const CSS = `
  .config-page, .config-page * { box-sizing:border-box; }
  .service-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; }
  .prof-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
  @media(max-width:900px){
    html,body{width:100%!important;max-width:100%!important;overflow-x:hidden!important}
    .config-page{padding:10px!important;width:100%!important;max-width:100%!important;overflow-x:hidden!important}
    .config-hero{display:grid!important;grid-template-columns:1fr!important;padding:16px!important;gap:14px!important}
    .config-hero-left{display:grid!important;grid-template-columns:72px minmax(0,1fr)!important;gap:12px!important}
    .config-hero-left img{width:72px!important}
    .config-resumen{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    .config-layout{grid-template-columns:1fr!important;gap:12px!important}
    .config-menu{min-height:auto!important;padding:14px!important}
    .config-card{padding:16px!important}
    .two-cols,.logo-box,.prof-header{grid-template-columns:1fr!important}
    .prof-list{
      grid-template-columns:minmax(0,1fr)!important;
      width:100%!important;
      min-width:0!important;
    }
    .prof-list>*{
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      box-sizing:border-box!important;
    }
    .prof-card{
      overflow:hidden!important;
      padding:13px!important;
    }
    .prof-card-top{
      grid-template-columns:50px minmax(0,1fr)!important;
      gap:9px!important;
      min-width:0!important;
    }
    .prof-card-top>div:nth-child(2){
      min-width:0!important;
    }
    .prof-card-top>span:last-child{
      grid-column:2!important;
      justify-self:start!important;
      margin-top:2px!important;
    }
    .service-grid{
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      width:100%!important;
      min-width:0!important;
    }
    .service-grid>button{
      width:100%!important;
      min-width:0!important;
      min-height:42px!important;
      padding:8px 9px!important;
      font-size:11px!important;
      overflow-wrap:anywhere!important;
    }
    .prof-header{
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      overflow:hidden!important;
      padding:12px!important;
    }
    .prof-header>div:last-child{
      min-width:0!important;
    }
    .config-page input,.config-page select,.config-page textarea{font-size:16px!important}
  }
  @media(max-width:390px){.config-resumen{grid-template-columns:1fr!important}.service-grid{grid-template-columns:1fr!important}}
`;

const S = {
  loadingPage:{minHeight:"100vh",background:"#eef2f7",display:"grid",placeItems:"center",fontFamily:"Arial,sans-serif"},
  loadingCard:{background:"#fff",padding:28,borderRadius:18,boxShadow:"0 8px 26px rgba(0,0,0,.10)",textAlign:"center"},
  page:{minHeight:"100vh",background:"linear-gradient(135deg,#eef2f7 0%,#f8fafc 45%,#ecfdf5 100%)",padding:24,fontFamily:"Arial,sans-serif",color:"#111827"},
  container:{maxWidth:1450,margin:"0 auto"},
  hero:{background:"linear-gradient(135deg,#111827,#064e3b)",color:"#fff",padding:26,borderRadius:24,marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",boxShadow:"0 12px 32px rgba(0,0,0,.18)"},
  heroLeft:{display:"flex",alignItems:"center",gap:18}, heroLogo:{width:95,background:"#fff",padding:9,borderRadius:18}, eyebrow:{margin:0,color:"#bbf7d0",fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:".08em"}, title:{margin:"4px 0",fontSize:38}, subtitle:{margin:0,color:"#dcfce7"},
  back:{background:"#fff",color:"#111827",border:0,padding:"12px 18px",borderRadius:12,fontWeight:800,cursor:"pointer"},
  summaryGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:18}, summaryCard:{background:"rgba(255,255,255,.88)",border:"1px solid #e5e7eb",borderRadius:18,padding:18,boxShadow:"0 4px 16px rgba(0,0,0,.06)"}, summaryTitle:{color:"#6b7280",margin:"8px 0 4px",fontSize:13,fontWeight:800}, summaryValue:{margin:0,fontSize:20},
  layout:{display:"grid",gridTemplateColumns:"320px minmax(0,1fr)",gap:22}, menu:{background:"#fff",border:"1px solid #e5e7eb",padding:20,borderRadius:22,minHeight:640,boxShadow:"0 6px 20px rgba(0,0,0,.06)"}, brand:{display:"flex",alignItems:"center",gap:12,background:"#f9fafb",padding:14,borderRadius:16,marginBottom:20}, menuLogo:{width:55,background:"#fff",padding:7,borderRadius:14},
  group:{color:"#6b7280",fontSize:14,margin:"14px 0 10px",fontWeight:800,textTransform:"uppercase",letterSpacing:".06em"}, item:{width:"100%",background:"transparent",border:0,textAlign:"left",padding:14,borderRadius:14,fontSize:16,cursor:"pointer",color:"#374151",marginBottom:8,display:"flex",gap:10,alignItems:"center"}, itemActive:{width:"100%",border:0,textAlign:"left",padding:14,borderRadius:14,fontSize:16,cursor:"pointer",marginBottom:8,display:"flex",gap:10,alignItems:"center",background:"linear-gradient(135deg,#ecfdf5,#f3f4f6)",color:"#064e3b",fontWeight:800,boxShadow:"inset 4px 0 0 #16a34a"}, separator:{height:1,background:"#e5e7eb",margin:"22px 0"},
  card:{background:"#fff",padding:28,borderRadius:22,border:"1px solid #e5e7eb",boxShadow:"0 8px 26px rgba(0,0,0,.07)"}, cardHead:{display:"flex",alignItems:"center",gap:14,marginBottom:24}, cardIcon:{width:52,height:52,minWidth:52,borderRadius:16,background:"#ecfdf5",display:"grid",placeItems:"center",fontSize:26},
  label:{display:"block",marginBottom:6,color:"#374151",fontWeight:800,fontSize:14}, input:{width:"100%",padding:13,borderRadius:12,border:"1px solid #d1d5db",fontSize:15,background:"#fff",color:"#111827"}, textarea:{width:"100%",padding:13,borderRadius:12,border:"1px solid #d1d5db",fontSize:15,minHeight:110,resize:"vertical"}, twoCols:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14},
  primary:{background:"#111827",color:"#fff",border:0,padding:"13px 22px",borderRadius:12,fontWeight:800,cursor:"pointer",marginTop:10}, secondary:{background:"#fff",color:"#374151",border:"1px solid #d1d5db",padding:"13px 22px",borderRadius:12,fontWeight:800,cursor:"pointer",marginTop:10}, actions:{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"},
  logoBox:{marginBottom:22,padding:16,display:"grid",gridTemplateColumns:"120px minmax(0,1fr)",gap:18,alignItems:"center",border:"1px solid #dfe6e2",borderRadius:18,background:"#f9fbfa"}, logoPreview:{width:120,height:120,display:"grid",placeItems:"center",border:"1px solid #d9e2dd",borderRadius:18,background:"#fff",overflow:"hidden"}, coverContain:{width:"100%",height:"100%",objectFit:"contain"}, cover:{width:"100%",height:"100%",objectFit:"cover"}, greenLabel:{minHeight:40,padding:"0 14px",display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:11,background:"#0b7041",color:"#fff",fontWeight:900,fontSize:13,cursor:"pointer"}, dangerLight:{minHeight:40,padding:"0 14px",border:"1px solid #fecaca",borderRadius:11,background:"#fff5f5",color:"#b42318",fontWeight:900,cursor:"pointer"},
  profHeader:{marginBottom:20,padding:16,display:"grid",gridTemplateColumns:"128px minmax(0,1fr)",gap:18,alignItems:"center",minWidth:0,border:"1px solid #dfe6e2",borderRadius:18,background:"#f9fbfa"}, profPhoto:{width:128,height:128,borderRadius:"50%",overflow:"hidden",display:"grid",placeItems:"center",background:"#e7f5ec",border:"4px solid #fff",boxShadow:"0 6px 16px rgba(16,72,43,.12)"}, profInitial:{color:"#167044",fontSize:42,fontWeight:900},
  service:{minHeight:42,padding:"9px 11px",border:"1px solid #d7e0da",borderRadius:11,background:"#fff",color:"#46534c",fontSize:12,fontWeight:800,cursor:"pointer",textAlign:"left"}, serviceActive:{minHeight:42,padding:"9px 11px",border:"1px solid #16834f",borderRadius:11,background:"#e9f7ef",color:"#126c42",fontSize:12,fontWeight:800,cursor:"pointer",textAlign:"left"},
  profCard:{padding:16,border:"1px solid #e1e8e4",borderRadius:16,background:"#fff",boxShadow:"0 6px 16px rgba(22,72,45,.05)"}, profCardTop:{display:"grid",gridTemplateColumns:"54px minmax(0,1fr) auto",gap:11,alignItems:"center",minWidth:0}, profAvatar:{width:54,height:54,borderRadius:"50%",overflow:"hidden",display:"grid",placeItems:"center",background:"#e8f6ed",color:"#147344",fontWeight:900,fontSize:18}, profSpec:{display:"block",marginTop:3,color:"#6b7280",fontSize:11},
  badgeActive:{padding:"5px 9px",borderRadius:999,background:"#dcfce7",color:"#166534",fontSize:10,fontWeight:900}, badgeInactive:{padding:"5px 9px",borderRadius:999,background:"#fee2e2",color:"#991b1b",fontSize:10,fontWeight:900}, darkSmall:{minHeight:38,padding:"9px 12px",border:0,borderRadius:10,background:"#111827",color:"#fff",fontWeight:800,cursor:"pointer"}, warningSmall:{minHeight:38,padding:"9px 12px",border:"1px solid #fed7aa",borderRadius:10,background:"#fff7ed",color:"#c2410c",fontWeight:800,cursor:"pointer"}, successSmall:{minHeight:38,padding:"9px 12px",border:"1px solid #bbf7d0",borderRadius:10,background:"#f0fdf4",color:"#166534",fontWeight:800,cursor:"pointer"},
  empty:{padding:18,border:"1px dashed #cbd5e1",borderRadius:14,background:"#f8fafc",color:"#64748b",textAlign:"center"}, muted:{color:"#6b7280",lineHeight:1.5}, mutedSmall:{margin:"6px 0 0",color:"#6b7280",fontSize:12,lineHeight:1.5}, planCard:{padding:16,border:"1px solid #e5e7eb",borderRadius:16,background:"#f9fafb",display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap"}, planPrice:{marginTop:7,color:"#166534",fontSize:22,fontWeight:900}, planBox:{background:"linear-gradient(135deg,#f9fafb,#ecfdf5)",border:"1px solid #e5e7eb",borderRadius:18,padding:22,display:"flex",justifyContent:"space-between",gap:18,flexWrap:"wrap"}, badgeBlue:{display:"inline-block",background:"#dbeafe",color:"#1d4ed8",padding:"8px 15px",borderRadius:999,fontWeight:800,alignSelf:"flex-start"},
};
