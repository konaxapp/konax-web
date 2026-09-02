"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function PortalPublicoNegocio() {
  const params = useParams();

  const slug = useMemo(() => {
    const valor = params?.slug;

    if (Array.isArray(valor)) {
      return valor[0] || "";
    }

    return valor || "";
  }, [params]);

  const [empresa, setEmpresa] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [fotos, setFotos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (slug) {
      cargarPortal();
    }
  }, [slug]);

  async function cargarPortal() {
    setCargando(true);
    setError("");

    try {
      const { data: empresaData, error: empresaError } =
        await supabase
          .from("empresas")
          .select(`
            id,
            nombre,
            descripcion_publica,
            slug_publico,
            logo_url,
            telefono,
            correo,
            direccion,
            provincia,
            distrito,
            corregimiento,
            latitud,
            longitud,
            categoria_negocio,
            marketplace_publicado,
            marketplace_estado
          `)
          .ilike("slug_publico", slug)
          .maybeSingle();

      if (empresaError) {
        throw empresaError;
      }

      if (!empresaData) {
        throw new Error(
          "No encontramos este negocio en KONAX."
        );
      }

      if (
        empresaData.marketplace_publicado !== true ||
        empresaData.marketplace_estado !== "publicado"
      ) {
        throw new Error(
          "Este negocio todavía no está publicado."
        );
      }

      setEmpresa(empresaData);

      const [
        serviciosRespuesta,
        fotosRespuesta,
      ] = await Promise.all([
        supabase
          .from("agenda_servicios")
          .select(`
            id,
            nombre,
            descripcion,
            precio,
            duracion_minutos,
            tipo,
            activo
          `)
          .eq("empresa_id", empresaData.id)
          .eq("activo", true)
          .order("nombre", {
            ascending: true,
          }),

        supabase
          .from("empresa_marketplace_fotos")
          .select(`
            id,
            url,
            tipo,
            orden,
            activo
          `)
          .eq("empresa_id", empresaData.id)
          .eq("activo", true)
          .order("orden", {
            ascending: true,
          }),
      ]);

      if (serviciosRespuesta.error) {
        console.error(
          "Error cargando servicios:",
          serviciosRespuesta.error
        );
      }

      if (fotosRespuesta.error) {
        console.error(
          "Error cargando fotos:",
          fotosRespuesta.error
        );
      }

      setServicios(
        serviciosRespuesta.data || []
      );

      setFotos(
        fotosRespuesta.data || []
      );
    } catch (error) {
      console.error(error);

      setError(
        error?.message ||
          "No se pudo cargar este negocio."
      );
    } finally {
      setCargando(false);
    }
  }

  function reservarGeneral() {
    if (!empresa?.slug_publico) return;

    /*
      POR AHORA:
      Este botón queda preparado.

      Cuando confirmemos la ruta exacta
      del portal actual de reservas,
      sustituimos esta dirección.

      Ejemplo final:
      /reservar/salon-katherine
    */

    window.location.href =
      `/reservar/${empresa.slug_publico}`;
  }

  function reservarServicio(servicio) {
    if (
      !empresa?.slug_publico ||
      !servicio?.id
    ) {
      return;
    }

    /*
      Dejamos el servicio en query string.

      Luego el portal actual de reservas
      puede leer servicio_id y abrir
      directamente ese servicio.
    */

    window.location.href =
      `/reservar/${empresa.slug_publico}` +
      `?servicio_id=${encodeURIComponent(
        servicio.id
      )}`;
  }

  function abrirWhatsApp() {
    const telefono = String(
      empresa?.telefono || ""
    ).replace(/\D/g, "");

    if (!telefono) return;

    const numero =
      telefono.startsWith("507")
        ? telefono
        : `507${telefono}`;

    window.open(
      `https://wa.me/${numero}`,
      "_blank"
    );
  }

  function compartir() {
    const url = window.location.href;

    if (navigator.share) {
      navigator
        .share({
          title:
            empresa?.nombre ||
            "KONAX Negocios",
          text:
            empresa?.nombre ||
            "Mira este negocio en KONAX",
          url,
        })
        .catch(() => {});

      return;
    }

    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        alert(
          "Enlace copiado."
        );
      });
  }

  function abrirMapa() {
    const lat = empresa?.latitud;
    const lng = empresa?.longitud;

    if (lat && lng) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        "_blank"
      );

      return;
    }

    const direccion = [
      empresa?.direccion,
      empresa?.corregimiento,
      empresa?.distrito,
      empresa?.provincia,
      "Panamá",
    ]
      .filter(Boolean)
      .join(", ");

    if (!direccion) return;

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        direccion
      )}`,
      "_blank"
    );
  }

  if (cargando) {
    return (
      <main className="kp-loading">
        <style>{CSS}</style>

        <img
          src="/konax-logo.png"
          alt="KONAX"
        />

        <div className="kp-spinner" />

        <strong>
          Cargando negocio...
        </strong>
      </main>
    );
  }

  if (error || !empresa) {
    return (
      <main className="kp-error-page">
        <style>{CSS}</style>

        <img
          src="/konax-logo.png"
          alt="KONAX"
          className="kp-error-logo"
        />

        <div className="kp-error-card">
          <span>!</span>

          <h1>
            Negocio no disponible
          </h1>

          <p>
            {error ||
              "No encontramos este negocio."}
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Volver a KONAX
          </button>
        </div>
      </main>
    );
  }

  const fotoPortada =
    fotos?.[0]?.url || "";

  return (
    <main className="kp-page">
      <style>{CSS}</style>

      <header className="kp-topbar">
        <img
          src="/konax-logo.png"
          alt="KONAX"
          className="kp-konax-logo"
        />

        <button
          type="button"
          className="kp-share"
          onClick={compartir}
          aria-label="Compartir"
        >
          ↗
        </button>
      </header>

      <section className="kp-hero">
        {fotoPortada ? (
          <img
            src={fotoPortada}
            alt={empresa.nombre}
            className="kp-cover"
          />
        ) : (
          <div className="kp-cover-empty">
            <span>
              {empresa.categoria_negocio
                ? "KONAX NEGOCIOS"
                : "KONAX"}
            </span>
          </div>
        )}

        <div className="kp-overlay" />

        <div className="kp-business-head">
          <div className="kp-logo-box">
            {empresa.logo_url ? (
              <img
                src={empresa.logo_url}
                alt={empresa.nombre}
              />
            ) : (
              <strong>
                {String(
                  empresa.nombre || "K"
                )
                  .charAt(0)
                  .toUpperCase()}
              </strong>
            )}
          </div>

          <div className="kp-business-info">
            {empresa.categoria_negocio && (
              <span className="kp-category">
                {empresa.categoria_negocio}
              </span>
            )}

            <h1>
              {empresa.nombre}
            </h1>

            {(empresa.provincia ||
              empresa.distrito) && (
              <button
                type="button"
                className="kp-location-inline"
                onClick={abrirMapa}
              >
                ⌖{" "}
                {[
                  empresa.distrito,
                  empresa.provincia,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="kp-main">
        <button
          type="button"
          className="kp-reserve-main"
          onClick={reservarGeneral}
        >
          <span>Reservar ahora</span>

          <strong>→</strong>
        </button>

        <div className="kp-quick-actions">
          {empresa.telefono && (
            <button
              type="button"
              onClick={abrirWhatsApp}
            >
              <span>◉</span>

              <small>
                WhatsApp
              </small>
            </button>
          )}

          {(empresa.direccion ||
            empresa.latitud) && (
            <button
              type="button"
              onClick={abrirMapa}
            >
              <span>⌖</span>

              <small>
                Cómo llegar
              </small>
            </button>
          )}

          <button
            type="button"
            onClick={compartir}
          >
            <span>↗</span>

            <small>
              Compartir
            </small>
          </button>
        </div>

        {empresa.descripcion_publica && (
          <section className="kp-section">
            <div className="kp-section-title">
              <span>
                Sobre nosotros
              </span>

              <h2>
                Conoce el negocio
              </h2>
            </div>

            <p className="kp-description">
              {
                empresa.descripcion_publica
              }
            </p>
          </section>
        )}

        <section className="kp-section">
          <div className="kp-section-title">
            <span>
              Reserva en línea
            </span>

            <h2>
              Servicios
            </h2>

            <p>
              Selecciona el servicio que
              deseas reservar.
            </p>
          </div>

          {servicios.length === 0 ? (
            <div className="kp-empty">
              Este negocio todavía no ha
              publicado servicios.
            </div>
          ) : (
            <div className="kp-services">
              {servicios.map(
                (servicio) => (
                  <article
                    key={servicio.id}
                    className="kp-service-card"
                  >
                    <div className="kp-service-content">
                      <span className="kp-service-type">
                        {servicio.tipo ||
                          empresa.categoria_negocio ||
                          "Servicio"}
                      </span>

                      <h3>
                        {servicio.nombre}
                      </h3>

                      {servicio.descripcion && (
                        <p>
                          {
                            servicio.descripcion
                          }
                        </p>
                      )}

                      <div className="kp-service-meta">
                        <span>
                          ◷{" "}
                          {Number(
                            servicio.duracion_minutos ||
                              60
                          )}{" "}
                          min
                        </span>

                        <strong>
                          B/.{" "}
                          {Number(
                            servicio.precio ||
                              0
                          ).toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        reservarServicio(
                          servicio
                        )
                      }
                    >
                      Reservar
                    </button>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        {fotos.length > 0 && (
          <section className="kp-section">
            <div className="kp-section-title">
              <span>
                Nuestro espacio
              </span>

              <h2>
                Galería
              </h2>
            </div>

            <div className="kp-gallery">
              {fotos.map(
                (foto, index) => (
                  <img
                    key={foto.id || index}
                    src={foto.url}
                    alt={`${empresa.nombre} ${
                      index + 1
                    }`}
                  />
                )
              )}
            </div>
          </section>
        )}

        <section className="kp-section">
          <div className="kp-section-title">
            <span>
              Información
            </span>

            <h2>
              Encuéntranos
            </h2>
          </div>

          <div className="kp-info-card">
            {empresa.direccion && (
              <button
                type="button"
                className="kp-info-row"
                onClick={abrirMapa}
              >
                <span className="kp-info-icon">
                  ⌖
                </span>

                <div>
                  <small>
                    Dirección
                  </small>

                  <strong>
                    {
                      empresa.direccion
                    }
                  </strong>

                  <p>
                    {[
                      empresa.corregimiento,
                      empresa.distrito,
                      empresa.provincia,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>

                <b>›</b>
              </button>
            )}

            {empresa.telefono && (
              <button
                type="button"
                className="kp-info-row"
                onClick={abrirWhatsApp}
              >
                <span className="kp-info-icon">
                  ☎
                </span>

                <div>
                  <small>
                    Teléfono / WhatsApp
                  </small>

                  <strong>
                    {
                      empresa.telefono
                    }
                  </strong>
                </div>

                <b>›</b>
              </button>
            )}

            {empresa.correo && (
              <div className="kp-info-row">
                <span className="kp-info-icon">
                  ✉
                </span>

                <div>
                  <small>
                    Correo
                  </small>

                  <strong>
                    {
                      empresa.correo
                    }
                  </strong>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="kp-marketplace-note">
          <img
            src="/konax-logo.png"
            alt="KONAX"
          />

          <p>
            Reserva este negocio de forma
            rápida y segura con KONAX.
          </p>
        </div>
      </section>

      <div className="kp-bottom-reserve">
        <div>
          <small>
            Reserva en línea
          </small>

          <strong>
            {empresa.nombre}
          </strong>
        </div>

        <button
          type="button"
          onClick={reservarGeneral}
        >
          Reservar
        </button>
      </div>
    </main>
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
  background: #f4f6f5;
}

button {
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.kp-page {
  min-height: 100vh;
  padding-bottom: 95px;

  background:
    linear-gradient(
      180deg,
      #ffffff 0%,
      #f4f7f5 100%
    );

  color: #18221c;

  font-family:
    Arial,
    Helvetica,
    sans-serif;
}

.kp-topbar {
  height: 58px;

  padding:
    8px 14px;

  display: grid;

  grid-template-columns:
    40px 1fr 40px;

  align-items: center;

  position: sticky;

  top: 0;

  z-index: 40;

  background:
    rgba(255,255,255,.97);

  border-bottom:
    1px solid #e5ebe7;

  backdrop-filter:
    blur(14px);
}

.kp-konax-logo {
  width: 115px;

  max-height: 32px;

  object-fit: contain;

  justify-self: center;

  grid-column: 2;
}

.kp-share {
  width: 36px;
  height: 36px;

  grid-column: 3;

  border:
    1px solid #dce5df;

  border-radius: 12px;

  background: #fff;

  color: #087a47;

  font-size: 18px;

  font-weight: 900;

  cursor: pointer;
}

/* HERO */

.kp-hero {
  min-height: 280px;

  position: relative;

  overflow: hidden;

  background: #1d2d24;
}

.kp-cover {
  width: 100%;
  height: 310px;

  object-fit: cover;

  display: block;
}

.kp-cover-empty {
  width: 100%;
  height: 300px;

  display: grid;

  place-items: center;

  background:
    radial-gradient(
      circle at 20% 20%,
      rgba(35,190,108,.28),
      transparent 33%
    ),
    linear-gradient(
      145deg,
      #173428,
      #0b6d42
    );

  color:
    rgba(255,255,255,.60);

  font-size: 11px;

  font-weight: 900;

  letter-spacing: 2px;
}

.kp-overlay {
  position: absolute;

  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,.02) 20%,
      rgba(8,19,12,.82) 100%
    );

  pointer-events: none;
}

.kp-business-head {
  width:
    min(100%, 680px);

  padding:
    0 18px 23px;

  position: absolute;

  left: 50%;

  bottom: 0;

  transform:
    translateX(-50%);

  display: flex;

  align-items: flex-end;

  gap: 14px;

  z-index: 3;
}

.kp-logo-box {
  width: 78px;
  height: 78px;

  flex:
    0 0 auto;

  border:
    4px solid #fff;

  border-radius: 22px;

  display: grid;

  place-items: center;

  overflow: hidden;

  background: #fff;

  box-shadow:
    0 8px 25px
    rgba(0,0,0,.18);
}

.kp-logo-box img {
  width: 100%;
  height: 100%;

  object-fit: contain;
}

.kp-logo-box strong {
  color: #087a47;

  font-size: 32px;

  font-weight: 900;
}

.kp-business-info {
  min-width: 0;

  flex: 1;
}

.kp-category {
  display: inline-block;

  margin-bottom: 5px;

  padding:
    5px 9px;

  border-radius: 999px;

  background:
    rgba(255,255,255,.16);

  color: #fff;

  font-size: 9px;

  font-weight: 900;

  backdrop-filter:
    blur(8px);
}

.kp-business-info h1 {
  margin:
    0 0 5px;

  color: #fff;

  font-size:
    clamp(
      26px,
      8vw,
      40px
    );

  line-height: 1;

  letter-spacing: -1px;
}

.kp-location-inline {
  padding: 0;

  border: 0;

  background: transparent;

  color:
    rgba(255,255,255,.82);

  font-size: 11px;

  font-weight: 700;

  cursor: pointer;
}

/* MAIN */

.kp-main {
  width:
    min(100%, 680px);

  margin:
    0 auto;

  padding:
    15px 13px 30px;
}

.kp-reserve-main {
  width: 100%;

  height: 55px;

  padding:
    0 18px;

  border: 0;

  border-radius: 16px;

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 12px;

  background:
    linear-gradient(
      135deg,
      #076c40,
      #0b8d50,
      #13ad61
    );

  color: #fff;

  font-size: 15px;

  font-weight: 900;

  box-shadow:
    0 10px 24px
    rgba(8,130,73,.20);

  cursor: pointer;
}

.kp-reserve-main strong {
  font-size: 21px;
}

/* QUICK ACTIONS */

.kp-quick-actions {
  margin-top: 12px;

  display: grid;

  grid-template-columns:
    repeat(3,minmax(0,1fr));

  gap: 8px;
}

.kp-quick-actions button {
  min-height: 67px;

  padding:
    8px;

  border:
    1px solid #dde6e0;

  border-radius: 15px;

  display: grid;

  place-items: center;

  gap: 3px;

  background: #fff;

  color: #435248;

  cursor: pointer;
}

.kp-quick-actions button > span {
  color: #087a47;

  font-size: 18px;

  font-weight: 900;
}

.kp-quick-actions small {
  font-size: 9px;

  font-weight: 850;
}

/* SECTIONS */

.kp-section {
  padding:
    28px 2px 0;
}

.kp-section-title {
  margin-bottom: 13px;
}

.kp-section-title > span {
  color: #087a47;

  font-size: 9px;

  font-weight: 900;

  letter-spacing: 1.1px;

  text-transform: uppercase;
}

.kp-section-title h2 {
  margin:
    4px 0 3px;

  color: #19241e;

  font-size: 24px;

  line-height: 1.05;

  letter-spacing: -.5px;
}

.kp-section-title p {
  margin: 0;

  color: #78837d;

  font-size: 11px;
}

.kp-description {
  margin: 0;

  padding:
    15px;

  border:
    1px solid #e0e7e3;

  border-radius: 16px;

  background: #fff;

  color: #56645b;

  font-size: 12px;

  line-height: 1.6;
}

/* SERVICES */

.kp-services {
  display: grid;

  gap: 10px;
}

.kp-service-card {
  padding:
    15px;

  border:
    1px solid #dde6e0;

  border-radius: 18px;

  display: grid;

  grid-template-columns:
    minmax(0,1fr)
    auto;

  gap: 12px;

  align-items: center;

  background: #fff;

  box-shadow:
    0 5px 15px
    rgba(25,60,39,.04);
}

.kp-service-content {
  min-width: 0;
}

.kp-service-type {
  color: #09804b;

  font-size: 8px;

  font-weight: 900;

  text-transform: uppercase;

  letter-spacing: .8px;
}

.kp-service-content h3 {
  margin:
    4px 0 5px;

  color: #1c2721;

  font-size: 16px;
}

.kp-service-content p {
  margin:
    0 0 8px;

  color: #758079;

  font-size: 10px;

  line-height: 1.4;
}

.kp-service-meta {
  display: flex;

  align-items: center;

  gap: 12px;

  flex-wrap: wrap;
}

.kp-service-meta span {
  color: #6e7a72;

  font-size: 10px;
}

.kp-service-meta strong {
  color: #087a47;

  font-size: 13px;
}

.kp-service-card > button {
  min-width: 81px;

  height: 39px;

  padding:
    0 12px;

  border:
    1px solid #0b824c;

  border-radius: 12px;

  background: #edf9f2;

  color: #087a47;

  font-size: 11px;

  font-weight: 900;

  cursor: pointer;
}

.kp-empty {
  padding:
    20px 15px;

  border:
    1px dashed #cbd6cf;

  border-radius: 16px;

  background: #fff;

  color: #7c8781;

  text-align: center;

  font-size: 11px;
}

/* GALLERY */

.kp-gallery {
  display: grid;

  grid-template-columns:
    repeat(3,minmax(0,1fr));

  gap: 7px;
}

.kp-gallery img {
  width: 100%;

  aspect-ratio: 1;

  object-fit: cover;

  border-radius: 14px;

  border:
    1px solid #e0e7e3;
}

/* INFO */

.kp-info-card {
  overflow: hidden;

  border:
    1px solid #dde6e0;

  border-radius: 18px;

  background: #fff;
}

.kp-info-row {
  width: 100%;

  min-height: 67px;

  padding:
    11px 13px;

  border: 0;

  border-bottom:
    1px solid #edf1ef;

  display: grid;

  grid-template-columns:
    36px
    minmax(0,1fr)
    auto;

  gap: 10px;

  align-items: center;

  background: #fff;

  color: #26332b;

  text-align: left;
}

.kp-info-row:last-child {
  border-bottom: 0;
}

button.kp-info-row {
  cursor: pointer;
}

.kp-info-icon {
  width: 35px;
  height: 35px;

  border-radius: 11px;

  display: grid;

  place-items: center;

  background: #edf8f2;

  color: #087a47;

  font-size: 17px;
}

.kp-info-row > div {
  min-width: 0;

  display: grid;

  gap: 2px;
}

.kp-info-row small {
  color: #87918b;

  font-size: 8px;

  font-weight: 800;

  text-transform: uppercase;
}

.kp-info-row strong {
  color: #26332b;

  font-size: 11px;

  word-break: break-word;
}

.kp-info-row p {
  margin: 0;

  color: #758179;

  font-size: 9px;
}

.kp-info-row > b {
  color: #9aa39e;

  font-size: 20px;
}

/* KONAX NOTE */

.kp-marketplace-note {
  margin-top: 29px;

  padding:
    17px;

  border-radius: 17px;

  display: flex;

  align-items: center;

  gap: 12px;

  background: #eaf7f0;
}

.kp-marketplace-note img {
  width: 80px;
}

.kp-marketplace-note p {
  margin: 0;

  color: #5f6d64;

  font-size: 10px;

  line-height: 1.4;
}

/* BOTTOM */

.kp-bottom-reserve {
  min-height: 72px;

  padding:
    9px 14px
    max(
      9px,
      env(safe-area-inset-bottom)
    );

  display: grid;

  grid-template-columns:
    minmax(0,1fr)
    auto;

  gap: 10px;

  align-items: center;

  position: fixed;

  left: 0;

  right: 0;

  bottom: 0;

  z-index: 50;

  border-top:
    1px solid #dde5e0;

  background:
    rgba(255,255,255,.96);

  box-shadow:
    0 -5px 20px
    rgba(25,55,38,.07);

  backdrop-filter:
    blur(14px);
}

.kp-bottom-reserve > div {
  min-width: 0;

  display: grid;
}

.kp-bottom-reserve small {
  color: #8a938e;

  font-size: 8px;

  text-transform: uppercase;

  font-weight: 850;
}

.kp-bottom-reserve strong {
  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color: #243129;

  font-size: 12px;
}

.kp-bottom-reserve button {
  height: 43px;

  padding:
    0 18px;

  border: 0;

  border-radius: 13px;

  background:
    linear-gradient(
      135deg,
      #087443,
      #0ca158
    );

  color: #fff;

  font-size: 12px;

  font-weight: 900;

  cursor: pointer;
}

/* LOADING */

.kp-loading {
  min-height: 100vh;

  display: grid;

  place-content: center;

  justify-items: center;

  gap: 14px;

  background: #f4f7f5;

  color: #405047;

  font-family:
    Arial,
    sans-serif;
}

.kp-loading img {
  width: 130px;
}

.kp-loading strong {
  font-size: 12px;
}

.kp-spinner {
  width: 30px;
  height: 30px;

  border:
    3px solid #dce6e0;

  border-top-color:
    #0b804a;

  border-radius: 50%;

  animation:
    kp-spin .8s
    linear infinite;
}

@keyframes kp-spin {
  to {
    transform:
      rotate(360deg);
  }
}

/* ERROR */

.kp-error-page {
  min-height: 100vh;

  padding:
    30px 16px;

  display: grid;

  place-content: center;

  justify-items: center;

  background: #f4f7f5;

  font-family:
    Arial,
    sans-serif;
}

.kp-error-logo {
  width: 120px;

  margin-bottom: 18px;
}

.kp-error-card {
  width:
    min(100%, 390px);

  padding:
    26px 20px;

  border:
    1px solid #e0e7e3;

  border-radius: 22px;

  background: #fff;

  text-align: center;
}

.kp-error-card > span {
  width: 48px;
  height: 48px;

  margin:
    0 auto 12px;

  border-radius: 50%;

  display: grid;

  place-items: center;

  background: #fff2f2;

  color: #a72d2d;

  font-size: 22px;

  font-weight: 900;
}

.kp-error-card h1 {
  margin:
    0 0 7px;

  color: #26332b;

  font-size: 22px;
}

.kp-error-card p {
  margin:
    0 0 17px;

  color: #758079;

  font-size: 11px;

  line-height: 1.5;
}

.kp-error-card button {
  height: 44px;

  padding:
    0 16px;

  border: 0;

  border-radius: 13px;

  background: #087a47;

  color: #fff;

  font-weight: 900;
}

@media (min-width: 700px) {
  .kp-cover,
  .kp-cover-empty {
    height: 390px;
  }

  .kp-business-head {
    padding-bottom: 28px;
  }

  .kp-main {
    padding-top: 20px;
  }

  .kp-bottom-reserve {
    width: 680px;

    left: 50%;

    right: auto;

    transform:
      translateX(-50%);

    border-left:
      1px solid #dde5e0;

    border-right:
      1px solid #dde5e0;

    border-radius:
      18px 18px 0 0;
  }
}

@media (max-width: 360px) {
  .kp-business-head {
    padding-left: 13px;
    padding-right: 13px;
  }

  .kp-logo-box {
    width: 68px;
    height: 68px;

    border-radius: 19px;
  }

  .kp-business-info h1 {
    font-size: 25px;
  }

  .kp-service-card {
    grid-template-columns: 1fr;
  }

  .kp-service-card > button {
    width: 100%;
  }

  .kp-gallery {
    grid-template-columns:
      repeat(2,minmax(0,1fr));
  }
}
`;
