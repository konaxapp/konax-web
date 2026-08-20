"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

const VERSION = "2026.08.19-KONAX-NEGOCIOS-ONBOARDING-V1";

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

export default function OnboardingKonaxNegocios() {
  const [empresaId, setEmpresaId] = useState("");
  const [empresa, setEmpresa] = useState(null);

  const [paso, setPaso] = useState(1);

  const [categorias, setCategorias] = useState([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] =
    useState([]);

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
    if (!categoriasSeleccionadas.length) return null;

    return categorias.find(
      (item) => item.id === categoriasSeleccionadas[0]
    );
  }, [categorias, categoriasSeleccionadas]);

  async function iniciar() {
    setCargando(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        window.location.href = "/negocios/registro";
        return;
      }

      const idLocal = localStorage.getItem("empresaId");

      if (!idLocal) {
        setTipoMensaje("error");
        setMensaje(
          "No encontramos el negocio asociado a esta cuenta."
        );
        setCargando(false);
        return;
      }

      setEmpresaId(idLocal);

      await Promise.all([
        cargarEmpresa(idLocal),
        cargarCategorias(idLocal),
        cargarServicios(idLocal),
      ]);
    } catch (error) {
      console.error(error);

      setTipoMensaje("error");
      setMensaje(
        "No se pudo cargar la configuración del negocio."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarEmpresa(id) {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Empresa no encontrada.");
    }

    setEmpresa(data);

    const pasoGuardado = Number(data.onboarding_paso || 1);

    setPaso(
      pasoGuardado >= 1 && pasoGuardado <= 4
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
      .order("grupo", { ascending: true })
      .order("orden", { ascending: true });

    if (error) {
      throw error;
    }

    setCategorias(data || []);

    const { data: seleccionadas, error: errorSeleccionadas } =
      await supabase
        .from("empresa_marketplace_categorias")
        .select("categoria_id, es_principal")
        .eq("empresa_id", id)
        .order("es_principal", { ascending: false });

    if (errorSeleccionadas) {
      console.error(errorSeleccionadas);
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
      .order("nombre", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setServicios(data || []);
  }

  function actualizarEmpresa(campo, valor) {
    setEmpresa((prev) => ({
      ...prev,
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

  function seleccionarCategoria(id) {
    limpiarMensaje();

    setCategoriasSeleccionadas((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }

      if (prev.length >= 4) {
        mostrarError(
          "Puedes seleccionar máximo 4 categorías."
        );

        return prev;
      }

      return [...prev, id];
    });
  }

  async function guardarPaso1() {
    if (guardando) return;

    const nombre = String(empresa?.nombre || "").trim();
    const descripcion = String(
      empresa?.descripcion_publica || ""
    ).trim();

    if (!nombre) {
      mostrarError("Escribe el nombre del negocio.");
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
      String(empresa?.slug_publico || "").trim() ||
      slugificar(nombre);

    if (!slug) {
      mostrarError(
        "No se pudo generar la URL del negocio."
      );
      return;
    }

    setGuardando(true);

    try {
      const { data: slugExistente, error: errorSlug } =
        await supabase
          .from("empresas")
          .select("id")
          .ilike("slug_publico", slug)
          .neq("id", empresaId)
          .limit(1);

      if (errorSlug) {
        throw errorSlug;
      }

      if (slugExistente?.length) {
        slug = `${slug}-${String(empresaId).slice(0, 6)}`;
      }

      const { error } = await supabase
        .from("empresas")
        .update({
          nombre,
          descripcion_publica: descripcion,
          slug_publico: slug,
          categoria_negocio:
            categoriaPrincipal?.nombre || null,
          onboarding_paso: 2,
          marketplace_actualizado_en: new Date().toISOString(),
        })
        .eq("id", empresaId);

      if (error) throw error;

      const { error: eliminarError } = await supabase
        .from("empresa_marketplace_categorias")
        .delete()
        .eq("empresa_id", empresaId);

      if (eliminarError) throw eliminarError;

      const categoriasPayload =
        categoriasSeleccionadas.map(
          (categoriaId, index) => ({
            empresa_id: empresaId,
            categoria_id: categoriaId,
            es_principal: index === 0,
          })
        );

      const { error: insertarError } = await supabase
        .from("empresa_marketplace_categorias")
        .insert(categoriasPayload);

      if (insertarError) throw insertarError;

      setEmpresa((prev) => ({
        ...prev,
        nombre,
        descripcion_publica: descripcion,
        slug_publico: slug,
        onboarding_paso: 2,
      }));

      setPaso(2);

      mostrarExito("Información guardada.");

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
        actualizarEmpresa(
          "latitud",
          Number(position.coords.latitude)
        );

        actualizarEmpresa(
          "longitud",
          Number(position.coords.longitude)
        );

        mostrarExito(
          "Ubicación obtenida correctamente."
        );
      },

      (error) => {
        console.error(error);

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
    if (guardando) return;

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
      mostrarError("Selecciona la provincia.");
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
            String(empresa?.distrito || "").trim() ||
            null,
          corregimiento:
            String(
              empresa?.corregimiento || ""
            ).trim() || null,
          latitud:
            empresa?.latitud === "" ||
            empresa?.latitud === null
              ? null
              : Number(empresa.latitud),
          longitud:
            empresa?.longitud === "" ||
            empresa?.longitud === null
              ? null
              : Number(empresa.longitud),
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

      mostrarExito("Ubicación guardada.");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(error);

      mostrarError(
        error?.message ||
          "No se pudo guardar la ubicación."
      );
    } finally {
      setGuardando(false);
    }
  }

  function seleccionarLogo(e) {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      mostrarError(
        "Selecciona una imagen válida."
      );
      return;
    }

    setLogoFile(archivo);

    if (logoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoPreview(
      URL.createObjectURL(archivo)
    );
  }

  function seleccionarFotos(e) {
    const archivos = Array.from(
      e.target.files || []
    ).filter((archivo) =>
      archivo.type.startsWith("image/")
    );

    if (!archivos.length) return;

    const totalActual =
      fotosFiles.length + archivos.length;

    if (totalActual > 6) {
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
      ...archivos.map((archivo) =>
        URL.createObjectURL(archivo)
      ),
    ]);
  }

  function quitarFoto(index) {
    setFotosFiles((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setFotosPreview((prev) => {
      const url = prev[index];

      if (url?.startsWith("blob:")) {
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
      archivo.name.split(".").pop() || "jpg";

    const nombreArchivo = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}.${extension}`;

    const ruta = `${empresaId}/${carpeta}/${nombreArchivo}`;

    const { error } = await supabase.storage
      .from("marketplace-negocios")
      .upload(ruta, archivo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("marketplace-negocios")
      .getPublicUrl(ruta);

    return data?.publicUrl || "";
  }

  async function guardarPaso3() {
    if (guardando) return;

    if (!logoPreview && !empresa?.logo_url) {
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
        logoUrl = await subirArchivo(
          logoFile,
          "logo"
        );
      }

      if (!logoUrl) {
        throw new Error(
          "No se pudo guardar el logo."
        );
      }

      const fotosUrls = [];

      for (const archivo of fotosFiles) {
        const url = await subirArchivo(
          archivo,
          "galeria"
        );

        if (url) fotosUrls.push(url);
      }

      const { error: empresaError } =
        await supabase
          .from("empresas")
          .update({
            logo_url: logoUrl,
            onboarding_paso: 4,
            marketplace_actualizado_en:
              new Date().toISOString(),
          })
          .eq("id", empresaId);

      if (empresaError) throw empresaError;

      if (fotosUrls.length) {
        const payloadFotos =
          fotosUrls.map((url, index) => ({
            empresa_id: empresaId,
            url,
            tipo: "galeria",
            orden: index + 1,
            activo: true,
          }));

        const { error: fotosError } =
          await supabase
            .from("empresa_marketplace_fotos")
            .insert(payloadFotos);

        if (fotosError) throw fotosError;
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

      mostrarExito("Imágenes guardadas.");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(error);

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
    if (guardando) return;

    const nombre = String(
      servicioForm.nombre || ""
    ).trim();

    const precio = Number(
      servicioForm.precio || 0
    );

    const duracion = Math.max(
      15,
      Number(
        servicioForm.duracion_minutos || 60
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
      const { data, error } = await supabase
        .from("agenda_servicios")
        .insert([
          {
            empresa_id: empresaId,
            nombre,
            tipo:
              categoriaPrincipal?.nombre ||
              empresa?.categoria_negocio ||
              "Servicio",
            descripcion:
              String(
                servicioForm.descripcion || ""
              ).trim() || null,
            duracion_minutos: duracion,
            requiere_membresia: false,
            requiere_pago: precio > 0,
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
      console.error(error);

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

    const { error } = await supabase
      .from("agenda_servicios")
      .update({
        activo: false,
      })
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      mostrarError(
        "No se pudo eliminar el servicio."
      );
      return;
    }

    setServicios((prev) =>
      prev.filter(
        (servicio) => servicio.id !== id
      )
    );
  }

  async function publicarNegocio() {
    if (publicando) return;

    if (!servicios.length) {
      mostrarError(
        "Agrega al menos un servicio antes de publicar tu negocio."
      );
      return;
    }

    setPublicando(true);

    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          onboarding_paso: 4,
          onboarding_completado: true,

          /*
            El negocio queda listo para mostrarse.

            Si más adelante quieres aprobación manual
            de KONAX, cambiamos "publicado" por "revision".
          */

          marketplace_estado: "publicado",
          marketplace_publicado: true,
          marketplace_fecha_publicacion:
            new Date().toISOString(),
          marketplace_actualizado_en:
            new Date().toISOString(),
          configuracion_completa: true,
        })
        .eq("id", empresaId);

      if (error) throw error;

      setEmpresa((prev) => ({
        ...prev,
        onboarding_completado: true,
        marketplace_estado: "publicado",
        marketplace_publicado: true,
      }));

      localStorage.setItem(
        "empresaNombre",
        empresa?.nombre || "Mi negocio"
      );

      mostrarExito(
        "¡Tu negocio ya está listo en KONAX!"
      );

      setTimeout(() => {
        window.location.href =
          "/dashboard";
      }, 1300);
    } catch (error) {
      console.error(error);

      mostrarError(
        error?.message ||
          "No se pudo publicar el negocio."
      );
    } finally {
      setPublicando(false);
    }
  }

  async function cambiarPaso(nuevoPaso) {
    if (nuevoPaso < 1 || nuevoPaso > 4) {
      return;
    }

    if (
      nuevoPaso >
      Number(empresa?.onboarding_paso || 1)
    ) {
      return;
    }

    setPaso(nuevoPaso);

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
          <span>KONAX NEGOCIOS</span>

          <h1>
            Registra tu negocio
          </h1>

          <p>
            Completa estos pasos para preparar
            tu negocio y aparecer en KONAX.
          </p>
        </div>

        <Stepper
          paso={paso}
          maxPaso={Number(
            empresa?.onboarding_paso || 1
          )}
          onChange={cambiarPaso}
        />

        {mensaje && (
          <div
            className={
              tipoMensaje === "success"
                ? "ko-alert success"
                : "ko-alert error"
            }
          >
            {mensaje}
          </div>
        )}

        {paso === 1 && (
          <section className="ko-card">
            <CabeceraPaso
              numero="1"
              titulo="Información básica"
              descripcion="Cuéntanos sobre tu negocio."
            />

            <Campo
              titulo="Nombre del negocio *"
            >
              <input
                value={empresa?.nombre || ""}
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
                El primero que selecciones será
                tu categoría principal. Puedes
                seleccionar hasta 4.
              </p>

              <div className="ko-categories">
                {categorias.map(
                  (categoria) => {
                    const activa =
                      categoriasSeleccionadas.includes(
                        categoria.id
                      );

                    return (
                      <button
                        key={categoria.id}
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
                          {categoria.nombre}
                        </strong>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <Campo titulo="Descripción *">
              <textarea
                value={
                  empresa?.descripcion_publica ||
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
                    empresa?.slug_publico ||
                    slugificar(
                      empresa?.nombre || ""
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
              onClick={guardarPaso1}
              disabled={guardando}
            />
          </section>
        )}

        {paso === 2 && (
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
                      Puedes usar la ubicación
                      actual de tu dispositivo.
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
                  empresa?.direccion || ""
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
                  empresa?.provincia || ""
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
                    empresa?.distrito || ""
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
                    empresa?.corregimiento ||
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
              siguiente={guardarPaso2}
              cargando={guardando}
            />
          </section>
        )}

        {paso === 3 && (
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
                    src={logoPreview}
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
                Puedes subir hasta 6 fotos.
              </p>

              <div className="ko-gallery">
                {fotosPreview.map(
                  (url, index) => (
                    <div
                      className="ko-photo"
                      key={url}
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
                          quitarFoto(index)
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
              siguiente={guardarPaso3}
              cargando={guardando}
            />
          </section>
        )}

        {paso === 4 && (
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
                      servicioForm.duracion_minutos
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
                    servicioForm.descripcion
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
                onClick={agregarServicio}
                disabled={guardando}
              >
                + Agregar servicio
              </button>
            </div>

            <div className="ko-services-list">
              <h3>
                Servicios agregados
              </h3>

              {servicios.length === 0 ? (
                <div className="ko-empty">
                  Agrega al menos un servicio
                  para publicar tu negocio.
                </div>
              ) : (
                servicios.map(
                  (servicio) => (
                    <div
                      key={servicio.id}
                      className="ko-service"
                    >
                      <div>
                        <strong>
                          {servicio.nombre}
                        </strong>

                        <span>
                          {Number(
                            servicio.duracion_minutos ||
                              60
                          )}{" "}
                          min
                        </span>

                        <b>
                          USD{" "}
                          {Number(
                            servicio.precio || 0
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

          <span>
            KONAX Negocios · {VERSION}
          </span>
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
                  disabled={!habilitado}
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
                  pasos.length - 1 && (
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
      {!disabled && <span>→</span>}
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
  min-height: 76px;
  padding:
    max(
      10px,
      env(safe-area-inset-top)
    )
    18px
    10px;
  display: grid;
  grid-template-columns:
    48px 1fr auto;
  align-items: center;
  gap: 8px;
  position: sticky;
  top: 0;
  z-index: 30;
  background:
    rgba(255,255,255,.94);
  border-bottom:
    1px solid #dfe7e2;
  backdrop-filter: blur(14px);
}

.ko-back {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 14px;
  background: #edf3ef;
  color: #18231d;
  font-size: 37px;
  line-height: 1;
  cursor: pointer;
}

.ko-logo {
  width:
    min(185px, 52vw);
  max-height: 48px;
  object-fit: contain;
  justify-self: center;
}

.ko-badge {
  padding: 7px 10px;
  border-radius: 999px;
  background: #e7f6ed;
  color: #087442;
  font-size: 10px;
  font-weight: 900;
}

.ko-shell {
  width:
    min(100%, 670px);
  margin: 0 auto;
  padding: 25px 17px 10px;
}

.ko-intro {
  padding: 3px 5px 22px;
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
  color: #16211b;
  font-size:
    clamp(31px, 9vw, 46px);
  line-height: 1;
  letter-spacing: -1.4px;
}

.ko-intro p {
  max-width: 470px;
  margin: 0 auto;
  color: #6c7971;
  font-size: 15px;
  line-height: 1.5;
}

.ko-stepper {
  margin-bottom: 18px;
  padding: 18px 15px 14px;
  display: grid;
  grid-template-columns:
    repeat(4,minmax(0,1fr));
  gap: 0;
  border: 1px solid #dae5de;
  border-radius: 21px;
  background:
    rgba(255,255,255,.94);
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
  box-shadow:
    0 6px 15px
    rgba(11,112,65,.24);
}

.ko-circle.done {
  background: #dff4e7;
  color: #087442;
}

.ko-circle:disabled {
  cursor: default;
}

.ko-line {
  height: 3px;
  flex: 1;
  margin: 0 6px;
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
  line-height: 1.15;
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
  border:
    1px solid #b9e5cc;
  background: #effbf4;
  color: #087442;
}

.ko-alert.error {
  border:
    1px solid #f4c5c5;
  background: #fff3f3;
  color: #9b2222;
}

.ko-card {
  padding: 27px 22px;
  border:
    1px solid #dce5e0;
  border-radius: 27px;
  background:
    rgba(255,255,255,.98);
  box-shadow:
    0 17px 45px
    rgba(19,57,35,.08);
}

.ko-card-header {
  margin-bottom: 25px;
}

.ko-card-header > span {
  color: #087a47;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.3px;
}

.ko-card-header h2 {
  margin: 6px 0 5px;
  color: #17211c;
  font-size: 30px;
  line-height: 1.05;
  letter-spacing: -.8px;
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

.ko-field input,
.ko-field select,
.ko-field textarea {
  width: 100%;
  min-height: 55px;
  padding: 0 15px;
  border:
    1px solid #cbd7d0;
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

.ko-field input:focus,
.ko-field select:focus,
.ko-field textarea:focus {
  border-color: #0b7a4b;
  box-shadow:
    0 0 0 4px
    rgba(11,122,75,.09);
}

.ko-field input::placeholder,
.ko-field textarea::placeholder {
  color: #a0aaa4;
}

.ko-two {
  display: grid;
  grid-template-columns:
    repeat(2,minmax(0,1fr));
  gap: 12px;
}

.ko-categories {
  display: grid;
  grid-template-columns:
    repeat(2,minmax(0,1fr));
  gap: 9px;
}

.ko-category {
  min-height: 55px;
  padding: 10px 12px;
  border:
    1px solid #d9e2dd;
  border-radius: 15px;
  display: flex;
  align-items: center;
  gap: 9px;
  background: #fff;
  color: #334139;
  text-align: left;
  cursor: pointer;
}

.ko-category span {
  font-size: 18px;
}

.ko-category strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  white-space: nowrap;
}

.ko-category.active {
  border-color: #0b7a4b;
  background: #edf9f2;
  color: #087442;
  box-shadow:
    inset 0 0 0 1px
    #0b7a4b;
}

.ko-slug {
  min-height: 55px;
  display: grid;
  grid-template-columns:
    auto minmax(0,1fr);
  align-items: center;
  border:
    1px solid #cbd7d0;
  border-radius: 15px;
  overflow: hidden;
  background: #fff;
}

.ko-slug:focus-within {
  border-color: #0b7a4b;
  box-shadow:
    0 0 0 4px
    rgba(11,122,75,.09);
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
  box-shadow: none !important;
}

.ko-next,
.ko-publish {
  width: 100%;
  min-height: 58px;
  padding: 0 20px;
  border: 0;
  border-radius: 17px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  background:
    linear-gradient(
      135deg,
      #076039,
      #0b804a,
      #13a85f
    );
  color: #fff;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  box-shadow:
    0 11px 24px
    rgba(11,122,75,.20);
}

.ko-next span {
  font-size: 22px;
}

.ko-next:disabled,
.ko-publish:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.ko-location-card {
  margin-bottom: 20px;
  overflow: hidden;
  border:
    1px solid #dbe5df;
  border-radius: 20px;
  background: #f5faf7;
}

.ko-map-placeholder {
  min-height: 180px;
  padding: 28px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 6px;
  background:
    radial-gradient(
      circle at 30% 20%,
      rgba(22,166,96,.15),
      transparent 30%
    ),
    linear-gradient(
      145deg,
      #e9f6ef,
      #f7faf8
    );
  color: #536159;
  text-align: center;
}

.ko-map-placeholder > span {
  font-size: 42px;
  color: #0b7a4b;
}

.ko-map-placeholder strong {
  color: #253229;
}

.ko-map-placeholder small {
  color: #738078;
}

.ko-location-button {
  width: 100%;
  min-height: 51px;
  border: 0;
  border-top:
    1px solid #dbe5df;
  background: #fff;
  color: #087442;
  font-weight: 850;
  cursor: pointer;
}

.ko-navigation {
  margin-top: 5px;
  display: grid;
  grid-template-columns:
    minmax(0,.8fr)
    minmax(0,1.2fr);
  gap: 10px;
}

.ko-secondary {
  min-height: 55px;
  padding: 0 14px;
  border:
    1px solid #d1dcd6;
  border-radius: 16px;
  background: #fff;
  color: #536159;
  font-weight: 850;
  cursor: pointer;
}

.ko-next.small {
  min-height: 55px;
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
  flex: 0 0 auto;
  border:
    1px solid #d9e2dd;
  border-radius: 20px;
  object-fit: contain;
  background: #fff;
}

.ko-upload-empty {
  display: grid;
  place-items: center;
  border-style: dashed;
  color: #77847c;
  font-size: 30px;
}

.ko-upload-button {
  min-height: 44px;
  padding: 0 17px;
  border:
    1px solid #cfe1d7;
  border-radius: 999px;
  display: flex;
  align-items: center;
  background: #f1faf5;
  color: #087442;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
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
  border:
    1px solid #d9e2dd;
}

.ko-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ko-photo button {
  width: 28px;
  height: 28px;
  position: absolute;
  top: 6px;
  right: 6px;
  border: 0;
  border-radius: 50%;
  background:
    rgba(10,20,14,.82);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}

.ko-add-photo {
  border:
    2px dashed #9fafA6;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 3px;
  color: #69766e;
  cursor: pointer;
}

.ko-add-photo span {
  font-size: 27px;
}

.ko-add-photo small {
  font-weight: 800;
}

.ko-service-form {
  padding: 17px;
  margin-bottom: 23px;
  border:
    1px solid #dce5df;
  border-radius: 20px;
  background: #f8faf9;
}

.ko-add-service {
  width: 100%;
  min-height: 49px;
  border:
    1px solid #0b7a4b;
  border-radius: 14px;
  background: #edf9f2;
  color: #087442;
  font-weight: 900;
  cursor: pointer;
}

.ko-services-list h3 {
  margin:
    0 0 11px;
  color: #243129;
  font-size: 16px;
}

.ko-empty {
  padding: 20px;
  border:
    1px dashed #cbd7d0;
  border-radius: 16px;
  color: #7a867f;
  text-align: center;
  font-size: 13px;
}

.ko-service {
  min-height: 77px;
  padding: 14px;
  margin-bottom: 9px;
  border:
    1px solid #dce5df;
  border-radius: 16px;
  display: grid;
  grid-template-columns:
    1fr auto;
  gap: 10px;
  align-items: center;
  background: #fff;
}

.ko-service > div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.ko-service strong {
  color: #19241e;
  font-size: 15px;
}

.ko-service span {
  color: #77837c;
  font-size: 11px;
}

.ko-service b {
  color: #087442;
  font-size: 13px;
}

.ko-service > button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: #fff0f0;
  color: #a12d2d;
  font-size: 20px;
  cursor: pointer;
}

.ko-ready {
  margin-top: 21px;
  padding: 15px;
  border-radius: 17px;
  display: flex;
  gap: 11px;
  align-items: flex-start;
  background: #edf9f2;
}

.ko-ready > span {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #0b7a4b;
  color: #fff;
  font-weight: 900;
}

.ko-ready strong {
  color: #17452d;
  font-size: 13px;
}

.ko-ready p {
  margin: 3px 0 0;
  color: #607067;
  font-size: 11px;
  line-height: 1.4;
}

.ko-final-actions {
  margin-top: 18px;
  display: grid;
  grid-template-columns:
    minmax(0,.7fr)
    minmax(0,1.3fr);
  gap: 10px;
}

.ko-footer {
  padding: 25px 5px 7px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 9px;
  color: #89938e;
  font-size: 8px;
}

.ko-footer img {
  width: 75px;
}

@media (max-width: 480px) {
  .ko-header {
    min-height: 70px;
    padding-left: 13px;
    padding-right: 13px;
  }

  .ko-badge {
    display: none;
  }

  .ko-header {
    grid-template-columns:
      44px 1fr 44px;
  }

  .ko-shell {
    padding:
      19px 13px 8px;
  }

  .ko-card {
    padding:
      24px 17px;
    border-radius: 24px;
  }

  .ko-card-header h2 {
    font-size: 28px;
  }

  .ko-stepper {
    padding:
      16px 9px 13px;
  }

  .ko-line {
    margin:
      0 3px;
  }
}

@media (max-width: 370px) {
  .ko-categories,
  .ko-two {
    grid-template-columns: 1fr;
  }

  .ko-step small {
    font-size: 7px;
  }

  .ko-circle {
    width: 31px;
    height: 31px;
  }

  .ko-gallery {
    grid-template-columns:
      repeat(2,minmax(0,1fr));
  }

  .ko-navigation,
  .ko-final-actions {
    grid-template-columns: 1fr;
  }
}
`;
