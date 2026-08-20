"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

const PROVINCIAS = [
  "Bocas del Toro",
  "Coclé",
  "Colón",
  "Chiriquí",
  "Darién",
  "Herrera",
  "Los Santos",
  "Panamá",
  "Panamá Oeste",
  "Veraguas",
];

const SERVICIO_INICIAL = {
  nombre: "",
  descripcion: "",
  precio: "",
  duracion_minutos: 60,
};

function slugificar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function obtenerRegistroTemporal() {
  try {
    const guardado = sessionStorage.getItem(
      "konaxNegociosRegistro"
    );

    if (!guardado) return {};

    return JSON.parse(guardado) || {};
  } catch {
    return {};
  }
}

function normalizarNombreTemporal(nombre) {
  return (
    String(nombre || "")
      .trim()
      .toLowerCase() === "mi negocio"
  );
}

export default function OnboardingKonaxNegocios() {
  const [empresaId, setEmpresaId] = useState("");
  const [empresa, setEmpresa] = useState(null);

  const [paso, setPaso] = useState(1);

  const [categorias, setCategorias] = useState([]);

  const [
    categoriasSeleccionadas,
    setCategoriasSeleccionadas,
  ] = useState([]);

  const [grupoAbierto, setGrupoAbierto] = useState("");

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [fotosFiles, setFotosFiles] = useState([]);
  const [fotosPreview, setFotosPreview] = useState([]);

  const [servicios, setServicios] = useState([]);

  const [servicioForm, setServicioForm] = useState({
    ...SERVICIO_INICIAL,
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");

  useEffect(() => {
    iniciar();
  }, []);

  const categoriaPrincipal = useMemo(() => {
    if (!categoriasSeleccionadas.length) {
      return null;
    }

    return categorias.find(
      (item) =>
        item.id === categoriasSeleccionadas[0]
    );
  }, [categorias, categoriasSeleccionadas]);

  const categoriasAgrupadas = useMemo(() => {
    const grupos = {};

    categorias.forEach((categoria) => {
      const grupo =
        String(categoria.grupo || "").trim() ||
        "Otros";

      if (!grupos[grupo]) {
        grupos[grupo] = [];
      }

      grupos[grupo].push(categoria);
    });

    return grupos;
  }, [categorias]);

  const grupos = useMemo(() => {
    return Object.keys(categoriasAgrupadas);
  }, [categoriasAgrupadas]);

  const categoriasSeleccionadasDetalle =
    useMemo(() => {
      return categoriasSeleccionadas
        .map((id) =>
          categorias.find(
            (categoria) => categoria.id === id
          )
        )
        .filter(Boolean);
    }, [categorias, categoriasSeleccionadas]);

  async function iniciar() {
    setCargando(true);
    setMensaje("");
    setTipoMensaje("");

    try {
      const {
        data: { session },
        error: errorSesion,
      } = await supabase.auth.getSession();

      if (errorSesion) {
        throw errorSesion;
      }

      if (!session?.user?.id) {
        window.location.href = "/negocios/registro";
        return;
      }

      const idEmpresa =
        await resolverEmpresaUsuario(session.user);

      if (!idEmpresa) {
        throw new Error(
          "No pudimos preparar el negocio para esta cuenta."
        );
      }

      setEmpresaId(idEmpresa);

      await Promise.all([
        cargarEmpresa(idEmpresa),
        cargarCategorias(idEmpresa),
        cargarServicios(idEmpresa),
      ]);
    } catch (error) {
      console.error(
        "Error iniciando onboarding:",
        error
      );

      setTipoMensaje("error");

      setMensaje(
        error?.message ||
          "No se pudo preparar el registro del negocio."
      );
    } finally {
      setCargando(false);
    }
  }

  async function resolverEmpresaUsuario(user) {
    const empresaLocal =
      localStorage.getItem("empresaId");

    if (empresaLocal) {
      const { data, error } = await supabase
        .from("empresas")
        .select("id,nombre")
        .eq("id", empresaLocal)
        .maybeSingle();

      if (!error && data?.id) {
        if (data.nombre) {
          localStorage.setItem(
            "empresaNombre",
            data.nombre
          );
        }

        return data.id;
      }

      localStorage.removeItem("empresaId");
      localStorage.removeItem("empresaNombre");
    }

    const registro = obtenerRegistroTemporal();

    const metadata = user?.user_metadata || {};

    const correo = String(
      user?.email ||
        registro?.correo ||
        ""
    )
      .trim()
      .toLowerCase();

    const nombreUsuario = String(
      registro?.nombreCompleto ||
        metadata?.nombre_completo ||
        [
          metadata?.nombre,
          metadata?.apellido,
        ]
          .filter(Boolean)
          .join(" ") ||
        registro?.nombre ||
        correo.split("@")[0] ||
        "Administrador"
    ).trim();

    const telefono = String(
      registro?.telefono ||
        metadata?.telefono ||
        ""
    ).trim();

    const nombreEmpresaTemporal =
      String(
        localStorage.getItem("empresaNombre") ||
          "Mi negocio"
      ).trim() || "Mi negocio";

    if (!correo) {
      throw new Error(
        "No encontramos el correo de la cuenta."
      );
    }

    const { data, error } = await supabase.rpc(
      "crear_empresa_konax_negocios",
      {
        p_nombre_usuario:
          nombreUsuario || "Administrador",
        p_correo: correo,
        p_telefono: telefono || "",
        p_nombre_empresa: nombreEmpresaTemporal,
      }
    );

    if (error) {
      console.error(
        "Error crear_empresa_konax_negocios:",
        error
      );

      throw new Error(
        error.message ||
          "No se pudo crear el negocio."
      );
    }

    const resultado = Array.isArray(data)
      ? data[0]
      : data;

    const nuevoEmpresaId =
      resultado?.empresa_id || "";

    if (!nuevoEmpresaId) {
      console.error(
        "Respuesta RPC inesperada:",
        data
      );

      throw new Error(
        "La empresa fue procesada, pero no recibimos su identificador."
      );
    }

    localStorage.setItem(
      "empresaId",
      nuevoEmpresaId
    );

    localStorage.setItem(
      "empresaNombre",
      resultado?.empresa_nombre ||
        nombreEmpresaTemporal
    );

    if (resultado?.usuario_id) {
      localStorage.setItem(
        "usuarioId",
        resultado.usuario_id
      );
    }

    return nuevoEmpresaId;
  }

  async function cargarEmpresa(id) {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "La empresa no pudo cargarse."
      );
    }

    setEmpresa(data);

    localStorage.setItem(
      "empresaId",
      data.id
    );

    if (data.nombre) {
      localStorage.setItem(
        "empresaNombre",
        data.nombre
      );
    }

    const pasoGuardado = Number(
      data.onboarding_paso || 1
    );

    setPaso(
      pasoGuardado >= 1 &&
        pasoGuardado <= 4
        ? pasoGuardado
        : 1
    );

    if (data.logo_url) {
      setLogoPreview(data.logo_url);
    }
  }

  async function cargarCategorias(id) {
    const { data, error } = await supabase
      .from("marketplace_categorias")
      .select("*")
      .eq("activo", true)
      .order("grupo", {
        ascending: true,
      })
      .order("orden", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    setCategorias(data || []);

    const {
      data: seleccionadas,
      error: errorSeleccionadas,
    } = await supabase
      .from("empresa_marketplace_categorias")
      .select(
        "categoria_id, es_principal"
      )
      .eq("empresa_id", id)
      .order("es_principal", {
        ascending: false,
      });

    if (errorSeleccionadas) {
      console.error(
        errorSeleccionadas
      );

      return;
    }

    setCategoriasSeleccionadas(
      (seleccionadas || []).map(
        (item) => item.categoria_id
      )
    );
  }

  async function cargarServicios(id) {
    const { data, error } = await supabase
      .from("agenda_servicios")
      .select(
        "id,nombre,descripcion,precio,duracion_minutos,activo"
      )
      .eq("empresa_id", id)
      .eq("activo", true)
      .order("nombre", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      return;
    }

    setServicios(data || []);
  }

  function actualizarEmpresa(campo, valor) {
    setEmpresa((prev) => ({
      ...(prev || {}),
      [campo]: valor,
    }));

    limpiarMensaje();
  }

  function limpiarMensaje() {
    if (mensaje) {
      setMensaje("");
      setTipoMensaje("");
    }
  }

  function mostrarError(texto) {
    setTipoMensaje("error");
    setMensaje(texto);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function mostrarExito(texto) {
    setTipoMensaje("success");
    setMensaje(texto);
  }

  function abrirGrupo(grupo) {
    setGrupoAbierto((prev) =>
      prev === grupo ? "" : grupo
    );
  }

  function seleccionarCategoria(id) {
    limpiarMensaje();

    setCategoriasSeleccionadas(
      (prev) => {
        if (prev.includes(id)) {
          return prev.filter(
            (item) => item !== id
          );
        }

        if (prev.length >= 4) {
          mostrarError(
            "Puedes seleccionar máximo 4 categorías."
          );

          return prev;
        }

        return [...prev, id];
      }
    );
  }

  async function guardarPaso1() {
    if (guardando || !empresaId) return;

    const nombre = String(
      empresa?.nombre || ""
    ).trim();

    const descripcion = String(
      empresa?.descripcion_publica || ""
    ).trim();

    if (
      !nombre ||
      normalizarNombreTemporal(nombre)
    ) {
      mostrarError(
        "Escribe el nombre real de tu negocio."
      );
      return;
    }

    if (!categoriasSeleccionadas.length) {
      mostrarError(
        "Selecciona al menos una categoría para tu negocio."
      );
      return;
    }

    if (!descripcion) {
      mostrarError(
        "Escribe una breve descripción del negocio."
      );
      return;
    }

    let slug =
      String(
        empresa?.slug_publico || ""
      ).trim() ||
      slugificar(nombre);

    if (!slug) {
      mostrarError(
        "No se pudo generar la URL del negocio."
      );
      return;
    }

    setGuardando(true);

    try {
      const {
        data: slugExistente,
        error: errorSlug,
      } = await supabase
        .from("empresas")
        .select("id")
        .ilike(
          "slug_publico",
          slug
        )
        .neq("id", empresaId)
        .limit(1);

      if (errorSlug) {
        throw errorSlug;
      }

      if (slugExistente?.length) {
        slug = `${slug}-${String(
          empresaId
        ).slice(0, 6)}`;
      }

      const { error } = await supabase
        .from("empresas")
        .update({
          nombre,
          descripcion_publica:
            descripcion,
          slug_publico: slug,
          categoria_negocio:
            categoriaPrincipal?.nombre ||
            null,
          onboarding_paso: 2,
          marketplace_actualizado_en:
            new Date().toISOString(),
        })
        .eq("id", empresaId);

      if (error) throw error;

      const {
        error: eliminarError,
      } = await supabase
        .from(
          "empresa_marketplace_categorias"
        )
        .delete()
        .eq(
          "empresa_id",
          empresaId
        );

      if (eliminarError) {
        throw eliminarError;
      }

      const categoriasPayload =
        categoriasSeleccionadas.map(
          (categoriaId, index) => ({
            empresa_id: empresaId,
            categoria_id:
              categoriaId,
            es_principal:
              index === 0,
          })
        );

      const {
        error: insertarError,
      } = await supabase
        .from(
          "empresa_marketplace_categorias"
        )
        .insert(
          categoriasPayload
        );

      if (insertarError) {
        throw insertarError;
      }

      setEmpresa((prev) => ({
        ...prev,
        nombre,
        descripcion_publica:
          descripcion,
        slug_publico: slug,
        categoria_negocio:
          categoriaPrincipal?.nombre ||
          null,
        onboarding_paso: 2,
      }));

      localStorage.setItem(
        "empresaNombre",
        nombre
      );

      setPaso(2);

      mostrarExito(
        "Información guardada."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(error);

      mostrarError(
        error?.message ||
          "No se pudo guardar la información."
      );
    } finally {
      setGuardando(false);
    }
  }

  function usarUbicacionActual() {
    if (!navigator.geolocation) {
      mostrarError(
        "Tu dispositivo no permite obtener la ubicación."
      );
      return;
    }

    limpiarMensaje();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEmpresa((prev) => ({
          ...prev,
          latitud: Number(
            position.coords.latitude
          ),
          longitud: Number(
            position.coords.longitude
          ),
        }));

        mostrarExito(
          "Ubicación obtenida correctamente."
        );
      },

      () => {
        mostrarError(
          "No pudimos obtener tu ubicación. Puedes escribir la dirección manualmente."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }

  async function guardarPaso2() {
    if (guardando || !empresaId) return;

    const direccion = String(
      empresa?.direccion || ""
    ).trim();

    const provincia = String(
      empresa?.provincia || ""
    ).trim();

    if (!direccion) {
      mostrarError(
        "Escribe la dirección del negocio."
      );
      return;
    }

    if (!provincia) {
      mostrarError(
        "Selecciona la provincia."
      );
      return;
    }

    setGuardando(true);

    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          direccion,
          provincia,
          distrito:
            String(
              empresa?.distrito || ""
            ).trim() || null,
          corregimiento:
            String(
              empresa?.corregimiento ||
                ""
            ).trim() || null,
          latitud:
            empresa?.latitud === "" ||
            empresa?.latitud === null ||
            empresa?.latitud ===
              undefined
              ? null
              : Number(
                  empresa.latitud
                ),
          longitud:
            empresa?.longitud === "" ||
            empresa?.longitud === null ||
            empresa?.longitud ===
              undefined
              ? null
              : Number(
                  empresa.longitud
                ),
          onboarding_paso: 3,
          marketplace_actualizado_en:
            new Date().toISOString(),
        })
        .eq("id", empresaId);

      if (error) throw error;

      setEmpresa((prev) => ({
        ...prev,
        onboarding_paso: 3,
      }));

      setPaso(3);

      mostrarExito(
        "Ubicación guardada."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      mostrarError(
        error?.message ||
          "No se pudo guardar la ubicación."
      );
    } finally {
      setGuardando(false);
    }
  }

  function seleccionarLogo(e) {
    const archivo =
      e.target.files?.[0];

    if (!archivo) return;

    if (
      !archivo.type.startsWith(
        "image/"
      )
    ) {
      mostrarError(
        "Selecciona una imagen válida."
      );
      return;
    }

    setLogoFile(archivo);

    if (
      logoPreview?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        logoPreview
      );
    }

    setLogoPreview(
      URL.createObjectURL(
        archivo
      )
    );
  }

  function seleccionarFotos(e) {
    const archivos = Array.from(
      e.target.files || []
    ).filter((archivo) =>
      archivo.type.startsWith(
        "image/"
      )
    );

    if (!archivos.length) return;

    if (
      fotosFiles.length +
        archivos.length >
      6
    ) {
      mostrarError(
        "Puedes subir máximo 6 fotos del negocio."
      );
      return;
    }

    setFotosFiles((prev) => [
      ...prev,
      ...archivos,
    ]);

    setFotosPreview((prev) => [
      ...prev,
      ...archivos.map(
        (archivo) =>
          URL.createObjectURL(
            archivo
          )
      ),
    ]);
  }

  function quitarFoto(index) {
    setFotosFiles((prev) =>
      prev.filter(
        (_, i) => i !== index
      )
    );

    setFotosPreview((prev) => {
      const url = prev[index];

      if (
        url?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(url);
      }

      return prev.filter(
        (_, i) => i !== index
      );
    });
  }

  async function subirArchivo(
    archivo,
    carpeta
  ) {
    const extension =
      archivo.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg";

    const nombreArchivo =
      `${Date.now()}-` +
      `${Math.random()
        .toString(36)
        .slice(2, 9)}.` +
      extension;

    const ruta =
      `${empresaId}/` +
      `${carpeta}/` +
      nombreArchivo;

    const { error } =
      await supabase.storage
        .from(
          "marketplace-negocios"
        )
        .upload(
          ruta,
          archivo,
          {
            cacheControl:
              "3600",
            upsert: false,
          }
        );

    if (error) throw error;

    const { data } =
      supabase.storage
        .from(
          "marketplace-negocios"
        )
        .getPublicUrl(ruta);

    return (
      data?.publicUrl || ""
    );
  }

  async function guardarPaso3() {
    if (guardando || !empresaId) return;

    if (
      !logoPreview &&
      !empresa?.logo_url
    ) {
      mostrarError(
        "Sube el logo del negocio."
      );
      return;
    }

    setGuardando(true);

    try {
      let logoUrl =
        empresa?.logo_url || "";

      if (logoFile) {
        logoUrl =
          await subirArchivo(
            logoFile,
            "logo"
          );
      }

      const fotosUrls = [];

      for (
        const archivo of fotosFiles
      ) {
        const url =
          await subirArchivo(
            archivo,
            "galeria"
          );

        if (url) {
          fotosUrls.push(url);
        }
      }

      const {
        error: empresaError,
      } = await supabase
        .from("empresas")
        .update({
          logo_url: logoUrl,
          onboarding_paso: 4,
          marketplace_actualizado_en:
            new Date().toISOString(),
        })
        .eq("id", empresaId);

      if (empresaError) {
        throw empresaError;
      }

      if (fotosUrls.length) {
        const payloadFotos =
          fotosUrls.map(
            (url, index) => ({
              empresa_id:
                empresaId,
              url,
              tipo: "galeria",
              orden: index + 1,
              activo: true,
            })
          );

        const {
          error: fotosError,
        } = await supabase
          .from(
            "empresa_marketplace_fotos"
          )
          .insert(
            payloadFotos
          );

        if (fotosError) {
          throw fotosError;
        }
      }

      setEmpresa((prev) => ({
        ...prev,
        logo_url: logoUrl,
        onboarding_paso: 4,
      }));

      setLogoFile(null);
      setFotosFiles([]);
      setFotosPreview([]);

      setPaso(4);

      mostrarExito(
        "Imágenes guardadas."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      mostrarError(
        error?.message ||
          "No se pudieron guardar las imágenes."
      );
    } finally {
      setGuardando(false);
    }
  }

  function actualizarServicio(
    campo,
    valor
  ) {
    setServicioForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));

    limpiarMensaje();
  }

  async function agregarServicio() {
    if (guardando || !empresaId) return;

    const nombre = String(
      servicioForm.nombre || ""
    ).trim();

    const precio = Number(
      servicioForm.precio || 0
    );

    const duracion = Math.max(
      15,
      Number(
        servicioForm
          .duracion_minutos || 60
      )
    );

    if (!nombre) {
      mostrarError(
        "Escribe el nombre del servicio."
      );
      return;
    }

    if (
      !Number.isFinite(precio) ||
      precio < 0
    ) {
      mostrarError(
        "Escribe un precio válido."
      );
      return;
    }

    setGuardando(true);

    try {
      const { data, error } =
        await supabase
          .from(
            "agenda_servicios"
          )
          .insert([
            {
              empresa_id:
                empresaId,

              nombre,

              tipo:
                categoriaPrincipal
                  ?.nombre ||
                empresa
                  ?.categoria_negocio ||
                "Servicio",

              descripcion:
                String(
                  servicioForm
                    .descripcion || ""
                ).trim() ||
                null,

              duracion_minutos:
                duracion,

              requiere_membresia:
                false,

              requiere_pago:
                precio > 0,

              precio,

              activo: true,
            },
          ])
          .select(
            "id,nombre,descripcion,precio,duracion_minutos,activo"
          )
          .single();

      if (error) throw error;

      setServicios((prev) => [
        ...prev,
        data,
      ]);

      setServicioForm({
        ...SERVICIO_INICIAL,
      });

      mostrarExito(
        "Servicio agregado correctamente."
      );
    } catch (error) {
      mostrarError(
        error?.message ||
          "No se pudo agregar el servicio."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarServicio(id) {
    if (
      !window.confirm(
        "¿Quieres eliminar este servicio?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "agenda_servicios"
        )
        .update({
          activo: false,
        })
        .eq("id", id)
        .eq(
          "empresa_id",
          empresaId
        );

    if (error) {
      mostrarError(
        "No se pudo eliminar el servicio."
      );
      return;
    }

    setServicios((prev) =>
      prev.filter(
        (servicio) =>
          servicio.id !== id
      )
    );
  }

  async function publicarNegocio() {
    if (publicando || !empresaId) return;

    if (!servicios.length) {
      mostrarError(
        "Agrega al menos un servicio antes de publicar tu negocio."
      );
      return;
    }

    setPublicando(true);

    try {
      const { error } =
        await supabase
          .from("empresas")
          .update({
            onboarding_paso: 4,
            onboarding_completado:
              true,
            marketplace_estado:
              "publicado",
            marketplace_publicado:
              true,
            marketplace_fecha_publicacion:
              new Date().toISOString(),
            marketplace_actualizado_en:
              new Date().toISOString(),
            configuracion_completa:
              true,
          })
          .eq(
            "id",
            empresaId
          );

      if (error) throw error;

      localStorage.setItem(
        "empresaNombre",
        empresa?.nombre ||
          "Mi negocio"
      );

      sessionStorage.removeItem(
        "konaxNegociosRegistro"
      );

      sessionStorage.removeItem(
        "konaxNegociosAuthUserId"
      );

      sessionStorage.removeItem(
        "konaxNegociosCorreoVerificado"
      );

      mostrarExito(
        "¡Tu negocio ya está listo en KONAX!"
      );

      setTimeout(() => {
        window.location.href =
          "/dashboard";
      }, 1200);
    } catch (error) {
      mostrarError(
        error?.message ||
          "No se pudo publicar el negocio."
      );
    } finally {
      setPublicando(false);
    }
  }

  function cambiarPaso(nuevoPaso) {
    if (
      nuevoPaso < 1 ||
      nuevoPaso > 4
    ) {
      return;
    }

    const maximo = Number(
      empresa?.onboarding_paso || 1
    );

    if (nuevoPaso > maximo) {
      return;
    }

    setPaso(nuevoPaso);

    limpiarMensaje();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function salir() {
    window.location.href = "/";
  }

  if (cargando) {
    return (
      <main className="ko-loading">
        <style>{CSS}</style>

        <img
          src="/konax-logo.png"
          alt="KONAX"
        />

        <strong>
          Preparando tu negocio...
        </strong>
      </main>
    );
  }

  return (
    <main className="ko-page">
      <style>{CSS}</style>

      <header className="ko-header">
        <button
          type="button"
          className="ko-back"
          onClick={salir}
        >
          ‹
        </button>

        <img
          src="/konax-logo.png"
          alt="KONAX"
          className="ko-logo"
        />

        <span className="ko-badge">
          Negocios
        </span>
      </header>

      <section className="ko-shell">
        <div className="ko-intro">
          <span>
            KONAX NEGOCIOS
          </span>

          <h1>
            Registra tu negocio
          </h1>

          <p>
            Completa estos pasos para
            preparar tu negocio y aparecer
            en KONAX.
          </p>
        </div>

        <Stepper
          paso={paso}
          maxPaso={Number(
            empresa?.onboarding_paso ||
              1
          )}
          onChange={cambiarPaso}
        />

        {mensaje && (
          <div
            className={
              tipoMensaje ===
              "success"
                ? "ko-alert success"
                : "ko-alert error"
            }
          >
            {mensaje}
          </div>
        )}

        {paso === 1 && empresa && (
          <section className="ko-card">
            <CabeceraPaso
              numero="1"
              titulo="Información básica"
              descripcion="Cuéntanos sobre tu negocio."
            />

            <Campo titulo="Nombre del negocio *">
              <input
                value={
                  normalizarNombreTemporal(
                    empresa?.nombre
                  )
                    ? ""
                    : empresa?.nombre ||
                      ""
                }
                onChange={(e) =>
                  actualizarEmpresa(
                    "nombre",
                    e.target.value
                  )
                }
                placeholder="Ej. Salón Katherine"
              />
            </Campo>

            <div className="ko-field">
              <label>
                Tipo de negocio *
              </label>

              <p className="ko-help">
                Selecciona hasta 4.
                La primera será tu categoría
                principal.
              </p>

              {categoriasSeleccionadasDetalle.length >
                0 && (
                <div className="ko-selected-area">
                  <div className="ko-selected-title">
                    <strong>
                      Seleccionadas
                    </strong>

                    <span>
                      {
                        categoriasSeleccionadasDetalle.length
                      }{" "}
                      de 4
                    </span>
                  </div>

                  <div className="ko-selected-list">
                    {categoriasSeleccionadasDetalle.map(
                      (
                        categoria,
                        index
                      ) => (
                        <button
                          key={
                            categoria.id
                          }
                          type="button"
                          className={
                            index === 0
                              ? "ko-selected-chip principal"
                              : "ko-selected-chip"
                          }
                          onClick={() =>
                            seleccionarCategoria(
                              categoria.id
                            )
                          }
                        >
                          <span>
                            {categoria.icono ||
                              "•"}
                          </span>

                          {
                            categoria.nombre
                          }

                          {index ===
                            0 && (
                            <small>
                              Principal
                            </small>
                          )}

                          <b>×</b>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="ko-groups">
                {grupos.map(
                  (grupo) => {
                    const abierto =
                      grupoAbierto ===
                      grupo;

                    const items =
                      categoriasAgrupadas[
                        grupo
                      ] || [];

                    const cantidadSeleccionadas =
                      items.filter(
                        (item) =>
                          categoriasSeleccionadas.includes(
                            item.id
                          )
                      ).length;

                    return (
                      <div
                        key={grupo}
                        className={
                          abierto
                            ? "ko-group open"
                            : "ko-group"
                        }
                      >
                        <button
                          type="button"
                          className="ko-group-header"
                          onClick={() =>
                            abrirGrupo(
                              grupo
                            )
                          }
                        >
                          <div>
                            <strong>
                              {grupo}
                            </strong>

                            <small>
                              {
                                items.length
                              }{" "}
                              opciones
                            </small>
                          </div>

                          <div className="ko-group-right">
                            {cantidadSeleccionadas >
                              0 && (
                              <span className="ko-count">
                                {
                                  cantidadSeleccionadas
                                }
                              </span>
                            )}

                            <b>
                              {abierto
                                ? "⌃"
                                : "⌄"}
                            </b>
                          </div>
                        </button>

                        {abierto && (
                          <div className="ko-group-content">
                            {items.map(
                              (
                                categoria
                              ) => {
                                const activa =
                                  categoriasSeleccionadas.includes(
                                    categoria.id
                                  );

                                return (
                                  <button
                                    key={
                                      categoria.id
                                    }
                                    type="button"
                                    className={
                                      activa
                                        ? "ko-category active"
                                        : "ko-category"
                                    }
                                    onClick={() =>
                                      seleccionarCategoria(
                                        categoria.id
                                      )
                                    }
                                  >
                                    <span>
                                      {categoria.icono ||
                                        "•"}
                                    </span>

                                    <strong>
                                      {
                                        categoria.nombre
                                      }
                                    </strong>

                                    {activa && (
                                      <b>
                                        ✓
                                      </b>
                                    )}
                                  </button>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <Campo titulo="Descripción *">
              <textarea
                value={
                  empresa
                    ?.descripcion_publica ||
                  ""
                }
                onChange={(e) =>
                  actualizarEmpresa(
                    "descripcion_publica",
                    e.target.value
                  )
                }
                placeholder="Describe tu negocio, especialidades, experiencia..."
              />
            </Campo>

            <Campo titulo="URL única de tu negocio">
              <div className="ko-slug">
                <span>
                  konax.net/
                </span>

                <input
                  value={
                    empresa
                      ?.slug_publico ||
                    slugificar(
                      normalizarNombreTemporal(
                        empresa?.nombre
                      )
                        ? ""
                        : empresa
                            ?.nombre ||
                            ""
                    )
                  }
                  onChange={(e) =>
                    actualizarEmpresa(
                      "slug_publico",
                      slugificar(
                        e.target.value
                      )
                    )
                  }
                  placeholder="mi-negocio"
                />
              </div>
            </Campo>

            <BotonSiguiente
              texto={
                guardando
                  ? "Guardando..."
                  : "Siguiente"
              }
              onClick={
                guardarPaso1
              }
              disabled={
                guardando
              }
            />
          </section>
        )}

        {paso === 2 && empresa && (
          <section className="ko-card">
            <CabeceraPaso
              numero="2"
              titulo="Ubicación"
              descripcion="Ayuda a tus clientes a encontrarte."
            />

            <div className="ko-location-card">
              <div className="ko-map-placeholder">
                <span>⌖</span>

                {empresa?.latitud &&
                empresa?.longitud ? (
                  <>
                    <strong>
                      Ubicación guardada
                    </strong>

                    <small>
                      {Number(
                        empresa.latitud
                      ).toFixed(5)}
                      ,{" "}
                      {Number(
                        empresa.longitud
                      ).toFixed(5)}
                    </small>
                  </>
                ) : (
                  <>
                    <strong>
                      Ubicación del negocio
                    </strong>

                    <small>
                      Puedes usar la
                      ubicación actual de
                      tu dispositivo.
                    </small>
                  </>
                )}
              </div>

              <button
                type="button"
                className="ko-location-button"
                onClick={
                  usarUbicacionActual
                }
              >
                ⌖ Usar mi ubicación actual
              </button>
            </div>

            <Campo titulo="Dirección *">
              <input
                value={
                  empresa?.direccion ||
                  ""
                }
                onChange={(e) =>
                  actualizarEmpresa(
                    "direccion",
                    e.target.value
                  )
                }
                placeholder="Calle, edificio, local..."
              />
            </Campo>

            <Campo titulo="Provincia *">
              <select
                value={
                  empresa?.provincia ||
                  ""
                }
                onChange={(e) =>
                  actualizarEmpresa(
                    "provincia",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Selecciona provincia
                </option>

                {PROVINCIAS.map(
                  (provincia) => (
                    <option
                      key={provincia}
                      value={provincia}
                    >
                      {provincia}
                    </option>
                  )
                )}
              </select>
            </Campo>

            <div className="ko-two">
              <Campo titulo="Distrito">
                <input
                  value={
                    empresa?.distrito ||
                    ""
                  }
                  onChange={(e) =>
                    actualizarEmpresa(
                      "distrito",
                      e.target.value
                    )
                  }
                  placeholder="Distrito"
                />
              </Campo>

              <Campo titulo="Corregimiento">
                <input
                  value={
                    empresa
                      ?.corregimiento ||
                    ""
                  }
                  onChange={(e) =>
                    actualizarEmpresa(
                      "corregimiento",
                      e.target.value
                    )
                  }
                  placeholder="Corregimiento"
                />
              </Campo>
            </div>

            <Navegacion
              anterior={() =>
                cambiarPaso(1)
              }
              siguiente={
                guardarPaso2
              }
              cargando={
                guardando
              }
            />
          </section>
        )}

        {paso === 3 && empresa && (
          <section className="ko-card">
            <CabeceraPaso
              numero="3"
              titulo="Imágenes del negocio"
              descripcion="Haz que tu perfil se vea profesional."
            />

            <div className="ko-field">
              <label>
                Logo del negocio *
              </label>

              <div className="ko-logo-upload">
                {logoPreview ? (
                  <img
                    src={
                      logoPreview
                    }
                    alt="Logo del negocio"
                  />
                ) : (
                  <div className="ko-upload-empty">
                    ↑
                  </div>
                )}

                <label className="ko-upload-button">
                  {logoPreview
                    ? "Cambiar logo"
                    : "Subir logo"}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={
                      seleccionarLogo
                    }
                    hidden
                  />
                </label>
              </div>
            </div>

            <div className="ko-field">
              <label>
                Fotos del negocio
              </label>

              <p className="ko-help">
                Puedes subir hasta 6
                fotos.
              </p>

              <div className="ko-gallery">
                {fotosPreview.map(
                  (url, index) => (
                    <div
                      className="ko-photo"
                      key={`${url}-${index}`}
                    >
                      <img
                        src={url}
                        alt={`Foto ${
                          index + 1
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          quitarFoto(
                            index
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  )
                )}

                {fotosPreview.length <
                  6 && (
                  <label className="ko-add-photo">
                    <span>↑</span>

                    <small>
                      Añadir
                    </small>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={
                        seleccionarFotos
                      }
                      hidden
                    />
                  </label>
                )}
              </div>
            </div>

            <Navegacion
              anterior={() =>
                cambiarPaso(2)
              }
              siguiente={
                guardarPaso3
              }
              cargando={
                guardando
              }
            />
          </section>
        )}

        {paso === 4 && empresa && (
          <section className="ko-card">
            <CabeceraPaso
              numero="4"
              titulo="Servicios"
              descripcion="Agrega lo que tus clientes podrán reservar."
            />

            <div className="ko-service-form">
              <Campo titulo="Servicio *">
                <input
                  value={
                    servicioForm.nombre
                  }
                  onChange={(e) =>
                    actualizarServicio(
                      "nombre",
                      e.target.value
                    )
                  }
                  placeholder="Ej. Corte de cabello"
                />
              </Campo>

              <div className="ko-two">
                <Campo titulo="Precio">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={
                      servicioForm.precio
                    }
                    onChange={(e) =>
                      actualizarServicio(
                        "precio",
                        e.target.value
                      )
                    }
                    placeholder="10.00"
                  />
                </Campo>

                <Campo titulo="Duración">
                  <select
                    value={
                      servicioForm
                        .duracion_minutos
                    }
                    onChange={(e) =>
                      actualizarServicio(
                        "duracion_minutos",
                        Number(
                          e.target.value
                        )
                      )
                    }
                  >
                    <option value={15}>
                      15 min
                    </option>

                    <option value={30}>
                      30 min
                    </option>

                    <option value={45}>
                      45 min
                    </option>

                    <option value={60}>
                      60 min
                    </option>

                    <option value={90}>
                      90 min
                    </option>

                    <option value={120}>
                      120 min
                    </option>
                  </select>
                </Campo>
              </div>

              <Campo titulo="Descripción">
                <textarea
                  value={
                    servicioForm
                      .descripcion
                  }
                  onChange={(e) =>
                    actualizarServicio(
                      "descripcion",
                      e.target.value
                    )
                  }
                  placeholder="Describe brevemente el servicio..."
                />
              </Campo>

              <button
                type="button"
                className="ko-add-service"
                onClick={
                  agregarServicio
                }
                disabled={
                  guardando
                }
              >
                + Agregar servicio
              </button>
            </div>

            <div className="ko-services-list">
              <h3>
                Servicios agregados
              </h3>

              {servicios.length ===
              0 ? (
                <div className="ko-empty">
                  Agrega al menos un
                  servicio para publicar
                  tu negocio.
                </div>
              ) : (
                servicios.map(
                  (servicio) => (
                    <div
                      key={
                        servicio.id
                      }
                      className="ko-service"
                    >
                      <div>
                        <strong>
                          {
                            servicio.nombre
                          }
                        </strong>

                        <span>
                          {Number(
                            servicio
                              .duracion_minutos ||
                              60
                          )}{" "}
                          min
                        </span>

                        <b>
                          USD{" "}
                          {Number(
                            servicio.precio ||
                              0
                          ).toFixed(2)}
                        </b>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          eliminarServicio(
                            servicio.id
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  )
                )
              )}
            </div>

            <div className="ko-ready">
              <span>✓</span>

              <div>
                <strong>
                  Ya casi terminamos
                </strong>

                <p>
                  Al publicar, tu negocio
                  quedará listo para formar
                  parte de KONAX.
                </p>
              </div>
            </div>

            <div className="ko-final-actions">
              <button
                type="button"
                className="ko-secondary"
                onClick={() =>
                  cambiarPaso(3)
                }
              >
                ← Anterior
              </button>

              <button
                type="button"
                className="ko-publish"
                onClick={
                  publicarNegocio
                }
                disabled={
                  publicando ||
                  !servicios.length
                }
              >
                {publicando
                  ? "Publicando..."
                  : "Publicar mi negocio →"}
              </button>
            </div>
          </section>
        )}

        <footer className="ko-footer">
          <img
            src="/konax-logo.png"
            alt="KONAX"
          />
        </footer>
      </section>
    </main>
  );
}

function Stepper({
  paso,
  maxPaso,
  onChange,
}) {
  const pasos = [
    [1, "Información"],
    [2, "Ubicación"],
    [3, "Imágenes"],
    [4, "Servicios"],
  ];

  return (
    <div className="ko-stepper">
      {pasos.map(
        ([numero, texto], index) => {
          const completado =
            numero < paso;

          const activo =
            numero === paso;

          const habilitado =
            numero <= maxPaso;

          return (
            <div
              key={numero}
              className="ko-step"
            >
              <div className="ko-step-top">
                <button
                  type="button"
                  className={[
                    "ko-circle",

                    activo
                      ? "active"
                      : "",

                    completado
                      ? "done"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={
                    !habilitado
                  }
                  onClick={() =>
                    habilitado &&
                    onChange(numero)
                  }
                >
                  {completado
                    ? "✓"
                    : numero}
                </button>

                {index <
                  pasos.length -
                    1 && (
                  <span
                    className={[
                      "ko-line",

                      numero < paso
                        ? "done"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                )}
              </div>

              <small
                className={
                  activo ||
                  completado
                    ? "active"
                    : ""
                }
              >
                {texto}
              </small>
            </div>
          );
        }
      )}
    </div>
  );
}

function CabeceraPaso({
  numero,
  titulo,
  descripcion,
}) {
  return (
    <div className="ko-card-header">
      <span>
        PASO {numero} DE 4
      </span>

      <h2>{titulo}</h2>

      <p>{descripcion}</p>
    </div>
  );
}

function Campo({
  titulo,
  children,
}) {
  return (
    <div className="ko-field">
      <label>{titulo}</label>

      {children}
    </div>
  );
}

function BotonSiguiente({
  texto,
  onClick,
  disabled,
}) {
  return (
    <button
      type="button"
      className="ko-next"
      onClick={onClick}
      disabled={disabled}
    >
      {texto}

      {!disabled && (
        <span>→</span>
      )}
    </button>
  );
}

function Navegacion({
  anterior,
  siguiente,
  cargando,
}) {
  return (
    <div className="ko-navigation">
      <button
        type="button"
        className="ko-secondary"
        onClick={anterior}
      >
        ← Anterior
      </button>

      <button
        type="button"
        className="ko-next small"
        onClick={siguiente}
        disabled={cargando}
      >
        {cargando
          ? "Guardando..."
          : "Siguiente →"}
      </button>
    </div>
  );
}

const CSS = `
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  background: #f4f7f5;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

.ko-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(14,158,88,.09),
      transparent 26%
    ),
    linear-gradient(
      180deg,
      #f8faf9 0%,
      #eef5f1 100%
    );
  color: #17211c;
  font-family:
    Inter,
    Arial,
    Helvetica,
    sans-serif;
  padding-bottom:
    max(
      25px,
      env(safe-area-inset-bottom)
    );
}

.ko-loading {
  min-height: 100vh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 15px;
  background: #f4f7f5;
  color: #26352d;
  font-family: Arial,sans-serif;
}

.ko-loading img {
  width: 160px;
}

.ko-header {
  min-height: 64px;
  padding:
    max(
      8px,
      env(safe-area-inset-top)
    )
    13px
    8px;
  display: grid;
  grid-template-columns:
    42px 1fr 42px;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 30;
  background:
    rgba(255,255,255,.96);
  border-bottom:
    1px solid #dfe7e2;
}

.ko-back {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 12px;
  background: #edf3ef;
  color: #18231d;
  font-size: 31px;
  cursor: pointer;
}

.ko-logo {
  width: 140px;
  max-height: 39px;
  object-fit: contain;
  justify-self: center;
}

.ko-badge {
  display: none;
}

.ko-shell {
  width:
    min(100%, 670px);
  margin: 0 auto;
  padding:
    16px 12px 8px;
}

.ko-intro {
  padding:
    3px 5px 17px;
  text-align: center;
}

.ko-intro > span {
  color: #0b7a4b;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.3px;
}

.ko-intro h1 {
  margin: 7px 0 6px;
  font-size:
    clamp(31px, 9vw, 44px);
  line-height: 1;
  letter-spacing: -1.3px;
}

.ko-intro p {
  max-width: 470px;
  margin: 0 auto;
  color: #6c7971;
  font-size: 14px;
  line-height: 1.45;
}

.ko-stepper {
  margin-bottom: 18px;
  padding:
    15px 8px 12px;
  display: grid;
  grid-template-columns:
    repeat(4,minmax(0,1fr));
  border: 1px solid #dae5de;
  border-radius: 21px;
  background: #fff;
  box-shadow:
    0 8px 25px
    rgba(26,60,41,.05);
}

.ko-step {
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 7px;
}

.ko-step-top {
  width: 100%;
  display: flex;
  align-items: center;
}

.ko-circle {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e7ece9;
  color: #626d67;
  font-size: 13px;
  font-weight: 900;
}

.ko-circle.active {
  background:
    linear-gradient(
      145deg,
      #07693e,
      #11a45d
    );
  color: #fff;
}

.ko-circle.done {
  background: #dff4e7;
  color: #087442;
}

.ko-line {
  height: 3px;
  flex: 1;
  margin: 0 3px;
  border-radius: 999px;
  background:
    radial-gradient(
      circle,
      #9da8a2 1.2px,
      transparent 1.4px
    )
    center / 8px 3px
    repeat-x;
}

.ko-line.done {
  background: #0b7a4b;
}

.ko-step small {
  color: #859089;
  font-size: 8px;
  font-weight: 850;
  text-align: center;
}

.ko-step small.active {
  color: #087442;
}

.ko-alert {
  margin-bottom: 16px;
  padding: 13px 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.4;
}

.ko-alert.success {
  border: 1px solid #b9e5cc;
  background: #effbf4;
  color: #087442;
}

.ko-alert.error {
  border: 1px solid #f4c5c5;
  background: #fff3f3;
  color: #9b2222;
}

.ko-card {
  padding: 22px 16px;
  border: 1px solid #dce5e0;
  border-radius: 23px;
  background: #fff;
  box-shadow:
    0 15px 38px
    rgba(19,57,35,.07);
}

.ko-card-header {
  margin-bottom: 24px;
}

.ko-card-header > span {
  color: #087a47;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.3px;
}

.ko-card-header h2 {
  margin: 6px 0 5px;
  font-size: 28px;
  line-height: 1.05;
}

.ko-card-header p {
  margin: 0;
  color: #748078;
  font-size: 14px;
}

.ko-field {
  margin-bottom: 18px;
}

.ko-field > label {
  display: block;
  margin-bottom: 7px;
  color: #334139;
  font-size: 13px;
  font-weight: 850;
}

.ko-help {
  margin:
    -2px 0 11px;
  color: #839089;
  font-size: 11px;
  line-height: 1.4;
}

.ko-selected-area {
  margin-bottom: 13px;
  padding: 12px;
  border-radius: 15px;
  background: #f1f8f4;
}

.ko-selected-title {
  margin-bottom: 9px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ko-selected-title strong {
  color: #34433a;
  font-size: 11px;
}

.ko-selected-title span {
  color: #087442;
  font-size: 10px;
  font-weight: 900;
}

.ko-selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.ko-selected-chip {
  min-height: 34px;
  padding: 6px 9px;
  border: 1px solid #bddcca;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  color: #31503f;
  font-size: 10px;
  font-weight: 800;
}

.ko-selected-chip.principal {
  border-color: #0b7a4b;
  background: #e9f8ef;
  color: #087442;
}

.ko-selected-chip small {
  padding: 2px 5px;
  border-radius: 999px;
  background: #0b7a4b;
  color: #fff;
  font-size: 7px;
}

.ko-selected-chip b {
  margin-left: 2px;
  font-size: 14px;
}

.ko-groups {
  display: grid;
  gap: 8px;
}

.ko-group {
  border: 1px solid #dbe4df;
  border-radius: 15px;
  overflow: hidden;
  background: #fff;
}

.ko-group.open {
  border-color: #b9d9c7;
}

.ko-group-header {
  width: 100%;
  min-height: 58px;
  padding: 10px 13px;
  border: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  color: #2d3c33;
  text-align: left;
  cursor: pointer;
}

.ko-group-header > div:first-child {
  display: grid;
  gap: 2px;
}

.ko-group-header strong {
  font-size: 13px;
}

.ko-group-header small {
  color: #87928c;
  font-size: 9px;
}

.ko-group-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ko-group-right > b {
  color: #66736b;
  font-size: 16px;
}

.ko-count {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #0b7a4b;
  color: #fff;
  font-size: 9px;
  font-weight: 900;
}

.ko-group-content {
  padding: 10px;
  display: grid;
  grid-template-columns:
    repeat(2,minmax(0,1fr));
  gap: 7px;
  border-top: 1px solid #e3eae6;
  background: #f8faf9;
}

.ko-category {
  min-height: 51px;
  padding: 8px 10px;
  border: 1px solid #d9e2dd;
  border-radius: 13px;
  display: grid;
  grid-template-columns:
    auto minmax(0,1fr) auto;
  align-items: center;
  gap: 7px;
  background: #fff;
  color: #334139;
  text-align: left;
  cursor: pointer;
}

.ko-category > span {
  font-size: 16px;
}

.ko-category strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  line-height: 1.25;
}

.ko-category > b {
  color: #087442;
  font-size: 13px;
}

.ko-category.active {
  border-color: #0b7a4b;
  background: #eaf8ef;
  color: #087442;
  box-shadow:
    inset 0 0 0 1px #0b7a4b;
}

.ko-field input,
.ko-field select,
.ko-field textarea {
  width: 100%;
  min-height: 55px;
  padding: 0 15px;
  border: 1px solid #cbd7d0;
  outline: none;
  border-radius: 15px;
  background: #fff;
  color: #17211c;
  font-size: 16px;
}

.ko-field textarea {
  min-height: 115px;
  padding-top: 14px;
  resize: vertical;
}

.ko-two {
  display: grid;
  grid-template-columns:
    repeat(2,minmax(0,1fr));
  gap: 12px;
}

.ko-slug {
  min-height: 55px;
  display: grid;
  grid-template-columns:
    auto minmax(0,1fr);
  align-items: center;
  border: 1px solid #cbd7d0;
  border-radius: 15px;
  overflow: hidden;
  background: #fff;
}

.ko-slug span {
  padding-left: 14px;
  color: #748078;
  font-size: 13px;
  white-space: nowrap;
}

.ko-slug input {
  border: 0;
  border-radius: 0;
}

.ko-next,
.ko-publish {
  width: 100%;
  min-height: 56px;
  border: 0;
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  background:
    linear-gradient(
      135deg,
      #076039,
      #0b804a,
      #13a85f
    );
  color: #fff;
  font-size: 15px;
  font-weight: 900;
}

.ko-location-card {
  margin-bottom: 20px;
  overflow: hidden;
  border: 1px solid #dbe5df;
  border-radius: 20px;
  background: #f5faf7;
}

.ko-map-placeholder {
  min-height: 170px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 6px;
  background: #eff8f3;
  text-align: center;
}

.ko-map-placeholder > span {
  font-size: 40px;
  color: #0b7a4b;
}

.ko-location-button {
  width: 100%;
  min-height: 50px;
  border: 0;
  border-top: 1px solid #dbe5df;
  background: #fff;
  color: #087442;
  font-weight: 850;
}

.ko-navigation,
.ko-final-actions {
  display: grid;
  grid-template-columns:
    .8fr 1.2fr;
  gap: 10px;
}

.ko-secondary {
  min-height: 54px;
  border: 1px solid #d1dcd6;
  border-radius: 15px;
  background: #fff;
  color: #536159;
  font-weight: 850;
}

.ko-logo-upload {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.ko-logo-upload img,
.ko-upload-empty {
  width: 100px;
  height: 100px;
  border: 1px solid #d9e2dd;
  border-radius: 20px;
  object-fit: contain;
  background: #fff;
}

.ko-upload-empty {
  display: grid;
  place-items: center;
  border-style: dashed;
  font-size: 30px;
}

.ko-upload-button {
  min-height: 44px;
  padding: 0 17px;
  border: 1px solid #cfe1d7;
  border-radius: 999px;
  display: flex;
  align-items: center;
  background: #f1faf5;
  color: #087442;
  font-size: 13px;
  font-weight: 900;
}

.ko-gallery {
  display: grid;
  grid-template-columns:
    repeat(3,minmax(0,1fr));
  gap: 9px;
}

.ko-photo,
.ko-add-photo {
  aspect-ratio: 1;
  border-radius: 17px;
  overflow: hidden;
}

.ko-photo {
  position: relative;
}

.ko-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ko-photo button {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #111;
  color: #fff;
}

.ko-add-photo {
  border: 2px dashed #9fafa6;
  display: grid;
  place-content: center;
  justify-items: center;
}

.ko-service-form {
  padding: 17px;
  margin-bottom: 23px;
  border: 1px solid #dce5df;
  border-radius: 20px;
  background: #f8faf9;
}

.ko-add-service {
  width: 100%;
  min-height: 49px;
  border: 1px solid #0b7a4b;
  border-radius: 14px;
  background: #edf9f2;
  color: #087442;
  font-weight: 900;
}

.ko-empty {
  padding: 20px;
  border: 1px dashed #cbd7d0;
  border-radius: 16px;
  color: #7a867f;
  text-align: center;
}

.ko-service {
  min-height: 77px;
  padding: 14px;
  margin-bottom: 9px;
  border: 1px solid #dce5df;
  border-radius: 16px;
  display: grid;
  grid-template-columns:
    1fr auto;
  align-items: center;
}

.ko-service > div {
  display: grid;
  gap: 4px;
}

.ko-service b {
  color: #087442;
}

.ko-service > button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: #fff0f0;
  color: #a12d2d;
}

.ko-ready {
  margin-top: 21px;
  padding: 15px;
  border-radius: 17px;
  display: flex;
  gap: 11px;
  background: #edf9f2;
}

.ko-ready > span {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #0b7a4b;
  color: #fff;
}

.ko-ready p {
  margin: 3px 0 0;
  font-size: 11px;
  color: #607067;
}

.ko-footer {
  padding: 24px 5px 7px;
  display: flex;
  justify-content: center;
}

.ko-footer img {
  width: 82px;
}

@media (max-width: 370px) {
  .ko-group-content,
  .ko-two {
    grid-template-columns: 1fr;
  }

  .ko-gallery {
    grid-template-columns:
      repeat(2,minmax(0,1fr));
  }

  .ko-navigation,
  .ko-final-actions {
    grid-template-columns: 1fr;
  }

  .ko-step small {
    font-size: 7px;
  }
}
`;
