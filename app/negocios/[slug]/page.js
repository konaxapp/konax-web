"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function PortalNegocioPublico() {
  const params = useParams();

  const slug = useMemo(() => {
    const valor = params?.slug;
    return Array.isArray(valor) ? valor[0] || "" : valor || "";
  }, [params]);

  const [empresa, setEmpresa] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (slug) cargarPortal();
  }, [slug]);

  async function cargarPortal() {
    setCargando(true);
    setError("");

    try {
      const { data: empresaData, error: empresaError } = await supabase
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

      if (empresaError) throw empresaError;

      if (!empresaData) {
        throw new Error("No encontramos este negocio en KONAX.");
      }

      if (
        empresaData.marketplace_publicado !== true ||
        empresaData.marketplace_estado !== "publicado"
      ) {
        throw new Error("Este negocio todavía no está publicado.");
      }

      setEmpresa(empresaData);

      const [serviciosResp, fotosResp] = await Promise.all([
        supabase
          .from("agenda_servicios")
          .select(`
            id,
            nombre,
            descripcion,
            precio,
            duracion_minutos,
            tipo,
            activo,
            imagen_url
          `)
          .eq("empresa_id", empresaData.id)
          .eq("activo", true)
          .order("nombre", { ascending: true }),

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
          .order("orden", { ascending: true }),
      ]);

      if (serviciosResp.error) {
        console.error("Servicios:", serviciosResp.error);
      }

      if (fotosResp.error) {
        console.error("Fotos:", fotosResp.error);
      }

      setServicios(serviciosResp.data || []);
      setFotos(fotosResp.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo cargar el negocio.");
    } finally {
      setCargando(false);
    }
  }

  const serviciosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return servicios;

    return servicios.filter((servicio) => {
      return [
        servicio.nombre,
        servicio.descripcion,
        servicio.tipo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [servicios, busqueda]);

  const fotoPortada = useMemo(() => {
    return (
      fotos.find((foto) => foto.tipo === "portada")?.url ||
      fotos[0]?.url ||
      ""
    );
  }, [fotos]);

  const galeria = useMemo(() => {
    return fotos.filter((foto) => foto?.url);
  }, [fotos]);

  function reservarGeneral() {
    if (!empresa?.slug_publico) return;

    window.location.href = `/reservar/${empresa.slug_publico}`;
  }

  function reservarServicio(servicio) {
    if (!empresa?.slug_publico || !servicio?.id) return;

    window.location.href =
      `/reservar/${empresa.slug_publico}` +
      `?servicio_id=${encodeURIComponent(servicio.id)}`;
  }

  function abrirWhatsApp() {
    const telefono = String(empresa?.telefono || "").replace(/\D/g, "");

    if (!telefono) return;

    const numero = telefono.startsWith("507")
      ? telefono
      : `507${telefono}`;

    const mensaje = encodeURIComponent(
      `Hola, vi su perfil en KONAX y quisiera información sobre sus servicios.`
    );

    window.open(
      `https://wa.me/${numero}?text=${mensaje}`,
      "_blank"
    );
  }

  function abrirMapa() {
    if (empresa?.latitud && empresa?.longitud) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${empresa.latitud},${empresa.longitud}`,
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

  async function compartir() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: empresa?.nombre || "KONAX Negocios",
          text: `Conoce ${empresa?.nombre || "este negocio"} en KONAX`,
          url,
        });
      } catch {}

      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      alert("Enlace copiado.");
    } catch {}
  }

  function irAServicios() {
    document
      .getElementById("servicios")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  if (cargando) {
    return (
      <main className="kp-loading">
        <style>{CSS}</style>

        <div className="kp-loading-brand">
          <img src="/konax-logo.png" alt="KONAX" />
          <span>NEGOCIOS</span>
        </div>

        <div className="kp-spinner" />

        <p>Cargando perfil...</p>
      </main>
    );
  }

  if (error || !empresa) {
    return (
      <main className="kp-error-page">
        <style>{CSS}</style>

        <div className="kp-error-box">
          <img src="/konax-logo.png" alt="KONAX" />

          <div className="kp-error-icon">!</div>

          <h1>Perfil no disponible</h1>

          <p>{error || "No encontramos este negocio."}</p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Ir a KONAX
          </button>
        </div>
      </main>
    );
  }

  const ubicacionCorta = [
    empresa.distrito,
    empresa.provincia,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="kp-page">
      <style>{CSS}</style>

      {/* TOP */}

      <header className="kp-header">
        <div className="kp-header-inner">
          <div className="kp-brand">
            <img src="/konax-logo.png" alt="KONAX" />

            <span>NEGOCIOS</span>
          </div>

          <div className="kp-header-actions">
            <button type="button" onClick={compartir}>
              <ShareIcon />
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="kp-hero">
        {fotoPortada ? (
          <img
            src={fotoPortada}
            alt={empresa.nombre}
            className="kp-hero-image"
          />
        ) : (
          <div className="kp-hero-placeholder">
            <div className="kp-hero-letter">
              {String(empresa.nombre || "K")
                .charAt(0)
                .toUpperCase()}
            </div>

            <span>KONAX NEGOCIOS</span>
          </div>
        )}

        <div className="kp-hero-gradient" />

        <button
          type="button"
          className="kp-floating-share"
          onClick={compartir}
        >
          <ShareIcon />
        </button>
      </section>

      {/* PERFIL */}

      <section className="kp-profile">
        <div className="kp-profile-top">
          <div className="kp-business-logo">
            {empresa.logo_url ? (
              <img
                src={empresa.logo_url}
                alt={empresa.nombre}
              />
            ) : (
              <span>
                {String(empresa.nombre || "K")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="kp-round-actions">
            {empresa.telefono && (
              <button type="button" onClick={abrirWhatsApp}>
                <MessageIcon />
              </button>
            )}

            {(empresa.direccion ||
              empresa.latitud) && (
              <button type="button" onClick={abrirMapa}>
                <MapIcon />
              </button>
            )}
          </div>
        </div>

        <div className="kp-profile-content">
          <div className="kp-business-type">
            {empresa.categoria_negocio || "Negocio local"}
          </div>

          <h1>{empresa.nombre}</h1>

          <div className="kp-meta-row">
            <span className="kp-status">
              <span className="kp-status-dot" />
              Disponible para reservas
            </span>

            {ubicacionCorta && (
              <>
                <span className="kp-separator">•</span>

                <button
                  type="button"
                  className="kp-location-link"
                  onClick={abrirMapa}
                >
                  {ubicacionCorta}
                </button>
              </>
            )}
          </div>

          {empresa.descripcion_publica && (
            <p className="kp-intro">
              {empresa.descripcion_publica}
            </p>
          )}

          <div className="kp-hero-buttons">
            <button
              type="button"
              className="kp-primary"
              onClick={irAServicios}
            >
              Ver servicios
            </button>

            {empresa.telefono && (
              <button
                type="button"
                className="kp-secondary"
                onClick={abrirWhatsApp}
              >
                <MessageIcon />
                Contactar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* NAVEGACIÓN */}

      <nav className="kp-navigation">
        <div className="kp-navigation-inner">
          <a href="#servicios">Servicios</a>

          {galeria.length > 0 && (
            <a href="#galeria">Galería</a>
          )}

          <a href="#informacion">Información</a>
        </div>
      </nav>

      {/* CONTENIDO */}

      <div className="kp-body">
        {/* SERVICIOS */}

        <section
          id="servicios"
          className="kp-section kp-services-section"
        >
          <div className="kp-section-header">
            <div>
              <span className="kp-eyebrow">
                RESERVA ONLINE
              </span>

              <h2>Elige tu servicio</h2>

              <p>
                Selecciona una opción para comenzar tu reserva.
              </p>
            </div>

            {servicios.length > 3 && (
              <div className="kp-search">
                <SearchIcon />

                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar servicio"
                />
              </div>
            )}
          </div>

          {serviciosFiltrados.length === 0 ? (
            <div className="kp-services-empty">
              <div className="kp-empty-icon">
                <CalendarIcon />
              </div>

              <h3>
                {busqueda
                  ? "No encontramos ese servicio"
                  : "Servicios próximamente"}
              </h3>

              <p>
                {busqueda
                  ? "Prueba buscando con otro nombre."
                  : "Este negocio todavía no ha publicado sus servicios."}
              </p>
            </div>
          ) : (
            <div className="kp-services-grid">
              {serviciosFiltrados.map((servicio) => (
                <article
                  className="kp-service"
                  key={servicio.id}
                >
                  <div className="kp-service-media">
                    {servicio.imagen_url ? (
                      <img
                        src={servicio.imagen_url}
                        alt={servicio.nombre}
                      />
                    ) : (
                      <div className="kp-service-placeholder">
                        <span>
                          {String(servicio.nombre || "S")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="kp-duration-badge">
                      <ClockIcon />

                      {Number(
                        servicio.duracion_minutos || 60
                      )}{" "}
                      min
                    </div>
                  </div>

                  <div className="kp-service-info">
                    <div className="kp-service-heading">
                      <div>
                        {servicio.tipo && (
                          <span className="kp-service-category">
                            {servicio.tipo}
                          </span>
                        )}

                        <h3>{servicio.nombre}</h3>
                      </div>

                      <strong>
                        B/.{" "}
                        {Number(
                          servicio.precio || 0
                        ).toFixed(2)}
                      </strong>
                    </div>

                    {servicio.descripcion && (
                      <p className="kp-service-description">
                        {servicio.descripcion}
                      </p>
                    )}

                    <button
                      type="button"
                      className="kp-book-service"
                      onClick={() =>
                        reservarServicio(servicio)
                      }
                    >
                      Reservar
                      <ArrowIcon />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* GALERÍA */}

        {galeria.length > 0 && (
          <section
            id="galeria"
            className="kp-section"
          >
            <div className="kp-section-header">
              <div>
                <span className="kp-eyebrow">
                  CONOCE EL LUGAR
                </span>

                <h2>Nuestro espacio</h2>

                <p>
                  Una mirada al lugar antes de tu visita.
                </p>
              </div>
            </div>

            <div
              className={`kp-gallery kp-gallery-${Math.min(
                galeria.length,
                5
              )}`}
            >
              {galeria.slice(0, 5).map((foto, index) => (
                <div
                  className={`kp-gallery-item kp-gallery-item-${index}`}
                  key={foto.id || index}
                >
                  <img
                    src={foto.url}
                    alt={`${empresa.nombre} ${index + 1}`}
                  />

                  {index === 4 && galeria.length > 5 && (
                    <div className="kp-more-overlay">
                      +{galeria.length - 5}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* INFORMACIÓN */}

        <section
          id="informacion"
          className="kp-section"
        >
          <div className="kp-section-header">
            <div>
              <span className="kp-eyebrow">
                INFORMACIÓN
              </span>

              <h2>Visítanos</h2>

              <p>
                Toda la información que necesitas para llegar.
              </p>
            </div>
          </div>

          <div className="kp-information-layout">
            <div className="kp-information-card">
              {(empresa.direccion ||
                empresa.distrito ||
                empresa.provincia) && (
                <button
                  type="button"
                  className="kp-info-option"
                  onClick={abrirMapa}
                >
                  <div className="kp-info-icon">
                    <MapIcon />
                  </div>

                  <div className="kp-info-copy">
                    <span>UBICACIÓN</span>

                    <strong>
                      {empresa.direccion ||
                        ubicacionCorta ||
                        "Ver ubicación"}
                    </strong>

                    {empresa.direccion &&
                      ubicacionCorta && (
                        <p>{ubicacionCorta}</p>
                      )}
                  </div>

                  <ArrowIcon />
                </button>
              )}

              {empresa.telefono && (
                <button
                  type="button"
                  className="kp-info-option"
                  onClick={abrirWhatsApp}
                >
                  <div className="kp-info-icon">
                    <MessageIcon />
                  </div>

                  <div className="kp-info-copy">
                    <span>WHATSAPP</span>

                    <strong>{empresa.telefono}</strong>

                    <p>Escríbenos directamente</p>
                  </div>

                  <ArrowIcon />
                </button>
              )}

              {empresa.correo && (
                <div className="kp-info-option">
                  <div className="kp-info-icon">
                    <MailIcon />
                  </div>

                  <div className="kp-info-copy">
                    <span>CORREO</span>

                    <strong>{empresa.correo}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="kp-about">
              <span className="kp-eyebrow">
                SOBRE NOSOTROS
              </span>

              <h3>{empresa.nombre}</h3>

              <p>
                {empresa.descripcion_publica ||
                  "Conoce nuestros servicios y reserva tu próxima cita de forma rápida y sencilla."}
              </p>

              <button
                type="button"
                onClick={reservarGeneral}
              >
                Reservar una cita
                <ArrowIcon />
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}

        <footer className="kp-footer">
          <div className="kp-footer-brand">
            <img src="/konax-logo.png" alt="KONAX" />

            <span>NEGOCIOS</span>
          </div>

          <p>
            Reservas y gestión digital para negocios.
          </p>

          <small>
            Este perfil es administrado a través de KONAX.
          </small>
        </footer>
      </div>

      {/* RESERVA MÓVIL */}

      <div className="kp-mobile-booking">
        <div>
          <span>Reserva tu cita</span>

          <strong>{empresa.nombre}</strong>
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

/* ICONOS */

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M18 8a3 3 0 1 0-2.83-4A3 3 0 0 0 15 5c0 .19.02.38.05.56l-6.1 3.05A3 3 0 0 0 7 8a3 3 0 1 0 1.95 5.28l6.1 3.05A3 3 0 0 0 15 17a3 3 0 1 0 .83-2.07L9.75 11.9a3.1 3.1 0 0 0 0-1.8l6.08-3.03A3 3 0 0 0 18 8Z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5Z" />
      <path d="M8.5 10h7M8.5 13h4.5" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 9h16" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

const CSS = `
* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

html,
body {
  margin: 0;
  width: 100%;
  overflow-x: hidden;
  background: #f7f7f5;
}

body,
button,
input {
  font-family:
    Inter,
    ui-sans-serif,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Arial,
    sans-serif;
}

button {
  font: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.kp-page {
  min-height: 100vh;
  padding-bottom: 80px;

  background: #f7f7f5;
  color: #17201b;
}

/* HEADER */

.kp-header {
  height: 66px;

  position: sticky;
  top: 0;
  z-index: 100;

  background: rgba(255,255,255,.96);
  border-bottom: 1px solid rgba(18,35,25,.08);
  backdrop-filter: blur(16px);
}

.kp-header-inner {
  width: min(1180px, calc(100% - 32px));
  height: 100%;

  margin: 0 auto;

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kp-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kp-brand img {
  width: 105px;
  max-height: 30px;
  object-fit: contain;
}

.kp-brand span {
  padding-left: 10px;

  border-left: 1px solid #d9dfdb;

  color: #8a948e;

  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.6px;
}

.kp-header-actions button {
  width: 40px;
  height: 40px;

  display: grid;
  place-items: center;

  border: 1px solid #e0e5e2;
  border-radius: 50%;

  background: #fff;
  color: #27362d;

  cursor: pointer;
}

/* HERO */

.kp-hero {
  width: min(1180px, 100%);
  height: 430px;

  margin: 0 auto;

  position: relative;
  overflow: hidden;

  background: #dfe6e1;
}

.kp-hero-image {
  width: 100%;
  height: 100%;

  display: block;
  object-fit: cover;
}

.kp-hero-gradient {
  position: absolute;
  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(10,18,13,.01) 45%,
      rgba(10,18,13,.40) 100%
    );
}

.kp-hero-placeholder {
  width: 100%;
  height: 100%;

  display: grid;
  place-content: center;
  justify-items: center;
  gap: 18px;

  background:
    radial-gradient(
      circle at 22% 20%,
      rgba(43,122,82,.14),
      transparent 35%
    ),
    radial-gradient(
      circle at 85% 70%,
      rgba(24,103,65,.12),
      transparent 38%
    ),
    linear-gradient(
      145deg,
      #e8eeea,
      #d3e1d8
    );
}

.kp-hero-letter {
  width: 86px;
  height: 86px;

  display: grid;
  place-items: center;

  border: 1px solid rgba(17,91,55,.15);
  border-radius: 26px;

  background: rgba(255,255,255,.65);

  color: #176d46;

  font-size: 40px;
  font-weight: 800;

  backdrop-filter: blur(12px);
}

.kp-hero-placeholder > span {
  color: rgba(29,75,50,.42);

  font-size: 10px;
  font-weight: 900;
  letter-spacing: 3px;
}

.kp-floating-share {
  display: none;

  position: absolute;
  right: 16px;
  top: 16px;

  width: 42px;
  height: 42px;

  border: 0;
  border-radius: 50%;

  place-items: center;

  background: rgba(255,255,255,.94);
  color: #1f3026;

  box-shadow: 0 6px 18px rgba(0,0,0,.12);
}

/* PROFILE */

.kp-profile {
  width: min(1080px, calc(100% - 40px));

  margin: -52px auto 0;

  position: relative;
  z-index: 5;

  padding: 0 44px 38px;

  border: 1px solid #e2e6e3;
  border-radius: 26px;

  background: #fff;

  box-shadow:
    0 18px 55px rgba(25,45,33,.09);
}

.kp-profile-top {
  min-height: 93px;

  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.kp-business-logo {
  width: 116px;
  height: 116px;

  margin-top: -34px;

  display: grid;
  place-items: center;

  overflow: hidden;

  border: 6px solid #fff;
  border-radius: 27px;

  background: #fff;

  box-shadow:
    0 10px 28px rgba(24,44,31,.14);
}

.kp-business-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.kp-business-logo span {
  width: 100%;
  height: 100%;

  display: grid;
  place-items: center;

  background: #eff5f1;

  color: #176d46;

  font-size: 44px;
  font-weight: 800;
}

.kp-round-actions {
  padding-top: 20px;

  display: flex;
  gap: 8px;
}

.kp-round-actions button {
  width: 43px;
  height: 43px;

  display: grid;
  place-items: center;

  border: 1px solid #dde4df;
  border-radius: 50%;

  background: #fff;
  color: #26533c;

  cursor: pointer;

  transition: .18s ease;
}

.kp-round-actions button:hover {
  background: #f2f7f4;
  border-color: #c8d9ce;
}

.kp-profile-content {
  max-width: 720px;
}

.kp-business-type {
  width: fit-content;

  margin-bottom: 8px;
  padding: 6px 10px;

  border-radius: 999px;

  background: #eef6f1;
  color: #176f47;

  font-size: 9px;
  font-weight: 850;
  letter-spacing: .3px;
}

.kp-profile h1 {
  margin: 0;

  color: #17201b;

  font-size: clamp(30px,4vw,45px);
  line-height: 1.03;
  letter-spacing: -1.4px;
}

.kp-meta-row {
  margin-top: 11px;

  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;

  color: #717d75;

  font-size: 11px;
}

.kp-status {
  display: flex;
  align-items: center;
  gap: 6px;

  color: #4f5e54;

  font-weight: 600;
}

.kp-status-dot {
  width: 7px;
  height: 7px;

  border-radius: 50%;
  background: #16a163;

  box-shadow:
    0 0 0 4px rgba(22,161,99,.09);
}

.kp-separator {
  color: #bcc4bf;
}

.kp-location-link {
  padding: 0;

  border: 0;
  background: transparent;

  color: #69766e;

  cursor: pointer;
}

.kp-intro {
  max-width: 680px;

  margin: 18px 0 0;

  color: #627067;

  font-size: 13px;
  line-height: 1.65;
}

.kp-hero-buttons {
  margin-top: 23px;

  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.kp-primary,
.kp-secondary {
  height: 46px;

  padding: 0 20px;

  border-radius: 13px;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  font-size: 11px;
  font-weight: 800;

  cursor: pointer;
}

.kp-primary {
  min-width: 146px;

  border: 0;

  background: #116f47;
  color: #fff;

  box-shadow:
    0 9px 20px rgba(17,111,71,.17);
}

.kp-secondary {
  border: 1px solid #dce3de;

  background: #fff;
  color: #314239;
}

.kp-secondary svg {
  width: 17px;
  height: 17px;
}

/* NAV */

.kp-navigation {
  width: 100%;

  position: sticky;
  top: 66px;
  z-index: 80;

  margin-top: 26px;

  background: rgba(247,247,245,.94);
  border-bottom: 1px solid #e3e7e4;
  backdrop-filter: blur(15px);
}

.kp-navigation-inner {
  width: min(1080px, calc(100% - 40px));

  margin: 0 auto;

  display: flex;
  align-items: center;
  gap: 33px;
}

.kp-navigation a {
  height: 52px;

  display: flex;
  align-items: center;

  position: relative;

  color: #657169;

  text-decoration: none;

  font-size: 11px;
  font-weight: 750;
}

.kp-navigation a:first-child {
  color: #176f47;
}

.kp-navigation a:first-child::after {
  content: "";

  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;

  height: 2px;

  border-radius: 999px;

  background: #176f47;
}

/* BODY */

.kp-body {
  width: min(1080px, calc(100% - 40px));

  margin: 0 auto;
}

.kp-section {
  padding: 64px 0;

  scroll-margin-top: 125px;

  border-bottom: 1px solid #e1e5e2;
}

.kp-section-header {
  margin-bottom: 26px;

  display: flex;
  justify-content: space-between;
  gap: 30px;
  align-items: flex-end;
}

.kp-eyebrow {
  color: #17734a;

  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.kp-section-header h2 {
  margin: 6px 0 7px;

  color: #19231d;

  font-size: clamp(25px,3vw,35px);
  line-height: 1.05;
  letter-spacing: -.8px;
}

.kp-section-header p {
  margin: 0;

  color: #7b857e;

  font-size: 11px;
}

/* SEARCH */

.kp-search {
  width: 260px;
  height: 43px;

  padding: 0 13px;

  border: 1px solid #dfe4e1;
  border-radius: 13px;

  display: flex;
  align-items: center;
  gap: 8px;

  background: #fff;
}

.kp-search svg {
  width: 17px;
  height: 17px;

  color: #7c8880;
}

.kp-search input {
  width: 100%;

  border: 0;
  outline: 0;

  background: transparent;

  color: #26342c;

  font-size: 10px;
}

/* SERVICES */

.kp-services-grid {
  display: grid;

  grid-template-columns:
    repeat(2,minmax(0,1fr));

  gap: 20px;
}

.kp-service {
  min-width: 0;

  overflow: hidden;

  border: 1px solid #e0e5e2;
  border-radius: 21px;

  background: #fff;

  box-shadow:
    0 8px 28px rgba(29,52,37,.045);

  transition:
    transform .18s ease,
    box-shadow .18s ease;
}

.kp-service:hover {
  transform: translateY(-2px);

  box-shadow:
    0 15px 35px rgba(29,52,37,.09);
}

.kp-service-media {
  height: 235px;

  position: relative;
  overflow: hidden;

  background: #edf2ef;
}

.kp-service-media img {
  width: 100%;
  height: 100%;

  display: block;
  object-fit: cover;

  transition: transform .35s ease;
}

.kp-service:hover .kp-service-media img {
  transform: scale(1.025);
}

.kp-service-placeholder {
  width: 100%;
  height: 100%;

  display: grid;
  place-items: center;

  background:
    radial-gradient(
      circle at 25% 20%,
      rgba(32,120,75,.12),
      transparent 33%
    ),
    linear-gradient(
      145deg,
      #e8f0eb,
      #d5e4db
    );
}

.kp-service-placeholder span {
  width: 62px;
  height: 62px;

  border-radius: 20px;

  display: grid;
  place-items: center;

  background: rgba(255,255,255,.75);
  color: #167248;

  font-size: 26px;
  font-weight: 800;
}

.kp-duration-badge {
  height: 31px;

  padding: 0 10px;

  position: absolute;
  left: 13px;
  bottom: 13px;

  display: flex;
  align-items: center;
  gap: 5px;

  border-radius: 9px;

  background: rgba(255,255,255,.94);
  color: #304038;

  font-size: 9px;
  font-weight: 750;

  backdrop-filter: blur(10px);

  box-shadow:
    0 5px 15px rgba(0,0,0,.09);
}

.kp-duration-badge svg {
  width: 14px;
  height: 14px;
}

.kp-service-info {
  padding: 20px;
}

.kp-service-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.kp-service-heading > div {
  min-width: 0;
}

.kp-service-category {
  display: block;

  margin-bottom: 5px;

  color: #178052;

  font-size: 8px;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: .7px;
}

.kp-service-heading h3 {
  margin: 0;

  color: #1c2720;

  font-size: 18px;
  line-height: 1.15;
  letter-spacing: -.3px;
}

.kp-service-heading > strong {
  flex: 0 0 auto;

  color: #176f47;

  font-size: 15px;
}

.kp-service-description {
  min-height: 37px;

  margin: 10px 0 18px;

  color: #78837b;

  font-size: 10px;
  line-height: 1.55;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;

  overflow: hidden;
}

.kp-book-service {
  width: 100%;
  height: 42px;

  padding: 0 13px;

  border: 1px solid #d8e3dc;
  border-radius: 12px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  background: #f5f9f7;
  color: #176f47;

  font-size: 10px;
  font-weight: 850;

  cursor: pointer;
}

.kp-book-service svg {
  width: 16px;
  height: 16px;
}

.kp-services-empty {
  min-height: 240px;

  padding: 35px;

  display: grid;
  place-content: center;
  justify-items: center;

  border: 1px dashed #ced7d1;
  border-radius: 20px;

  background: #fafbf9;

  text-align: center;
}

.kp-empty-icon {
  width: 52px;
  height: 52px;

  margin-bottom: 12px;

  border-radius: 16px;

  display: grid;
  place-items: center;

  background: #edf5f0;
  color: #1b764d;
}

.kp-empty-icon svg {
  width: 23px;
  height: 23px;
}

.kp-services-empty h3 {
  margin: 0;

  color: #28352d;

  font-size: 17px;
}

.kp-services-empty p {
  margin: 7px 0 0;

  color: #838c86;

  font-size: 10px;
}

/* GALERÍA */

.kp-gallery {
  height: 500px;

  display: grid;
  grid-template-columns: 1.35fr .65fr .65fr;
  grid-template-rows: 1fr 1fr;

  gap: 10px;
}

.kp-gallery-item {
  min-width: 0;
  min-height: 0;

  position: relative;

  overflow: hidden;

  border-radius: 18px;

  background: #e5e9e6;
}

.kp-gallery-item-0 {
  grid-row: 1 / 3;
}

.kp-gallery-item img {
  width: 100%;
  height: 100%;

  display: block;
  object-fit: cover;

  transition: transform .35s ease;
}

.kp-gallery-item:hover img {
  transform: scale(1.025);
}

.kp-more-overlay {
  position: absolute;
  inset: 0;

  display: grid;
  place-items: center;

  background: rgba(12,24,16,.58);
  color: #fff;

  font-size: 25px;
  font-weight: 700;
}

/* INFO */

.kp-information-layout {
  display: grid;
  grid-template-columns: 1fr .82fr;

  gap: 22px;
}

.kp-information-card {
  overflow: hidden;

  border: 1px solid #e0e5e2;
  border-radius: 21px;

  background: #fff;
}

.kp-info-option {
  width: 100%;
  min-height: 88px;

  padding: 17px 19px;

  border: 0;
  border-bottom: 1px solid #edf0ee;

  display: grid;
  grid-template-columns: 46px minmax(0,1fr) auto;

  gap: 13px;
  align-items: center;

  background: #fff;
  color: #26342c;

  text-align: left;
}

button.kp-info-option {
  cursor: pointer;
}

.kp-info-option:last-child {
  border-bottom: 0;
}

.kp-info-icon {
  width: 45px;
  height: 45px;

  border-radius: 14px;

  display: grid;
  place-items: center;

  background: #eff6f2;
  color: #176f47;
}

.kp-info-icon svg {
  width: 20px;
  height: 20px;
}

.kp-info-copy {
  min-width: 0;

  display: grid;
  gap: 3px;
}

.kp-info-copy > span {
  color: #929b95;

  font-size: 7px;
  font-weight: 900;
  letter-spacing: .7px;
}

.kp-info-copy strong {
  overflow-wrap: anywhere;

  color: #26342c;

  font-size: 11px;
}

.kp-info-copy p {
  margin: 0;

  color: #87918b;

  font-size: 9px;
}

.kp-info-option > svg {
  width: 17px;
  height: 17px;

  color: #abb3ae;
}

.kp-about {
  padding: 31px;

  border-radius: 21px;

  background:
    linear-gradient(
      145deg,
      #152b20,
      #1b432f
    );

  color: #fff;
}

.kp-about .kp-eyebrow {
  color: #82c49e;
}

.kp-about h3 {
  margin: 9px 0 12px;

  font-size: 25px;
  letter-spacing: -.6px;
}

.kp-about p {
  margin: 0;

  color: rgba(255,255,255,.70);

  font-size: 11px;
  line-height: 1.7;
}

.kp-about button {
  height: 42px;

  margin-top: 24px;
  padding: 0 14px;

  border: 1px solid rgba(255,255,255,.22);
  border-radius: 12px;

  display: flex;
  align-items: center;
  gap: 12px;

  background: rgba(255,255,255,.08);
  color: #fff;

  font-size: 10px;
  font-weight: 800;

  cursor: pointer;
}

.kp-about button svg {
  width: 15px;
  height: 15px;
}

/* FOOTER */

.kp-footer {
  padding: 48px 0 34px;

  text-align: center;
}

.kp-footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
}

.kp-footer-brand img {
  width: 87px;
}

.kp-footer-brand span {
  padding-left: 9px;

  border-left: 1px solid #d4dad6;

  color: #89938d;

  font-size: 7px;
  font-weight: 900;
  letter-spacing: 1.4px;
}

.kp-footer p {
  margin: 10px 0 4px;

  color: #606c64;

  font-size: 9px;
}

.kp-footer small {
  color: #a0a8a3;

  font-size: 8px;
}

/* BOTTOM MOBILE */

.kp-mobile-booking {
  display: none;
}

/* LOADING */

.kp-loading,
.kp-error-page {
  min-height: 100vh;

  display: grid;
  place-content: center;
  justify-items: center;

  background: #f7f8f6;
}

.kp-loading-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kp-loading-brand img {
  width: 105px;
}

.kp-loading-brand span {
  padding-left: 8px;

  border-left: 1px solid #d6ddd8;

  color: #8b958f;

  font-size: 7px;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.kp-spinner {
  width: 28px;
  height: 28px;

  margin-top: 22px;

  border: 3px solid #dfe6e1;
  border-top-color: #17734a;
  border-radius: 50%;

  animation: kpSpin .8s linear infinite;
}

.kp-loading p {
  margin-top: 9px;

  color: #7c8780;

  font-size: 9px;
}

@keyframes kpSpin {
  to {
    transform: rotate(360deg);
  }
}

/* ERROR */

.kp-error-box {
  width: min(390px, calc(100vw - 30px));

  padding: 32px 25px;

  border: 1px solid #e0e5e2;
  border-radius: 23px;

  background: #fff;

  text-align: center;
}

.kp-error-box > img {
  width: 110px;
}

.kp-error-icon {
  width: 48px;
  height: 48px;

  margin: 22px auto 10px;

  border-radius: 15px;

  display: grid;
  place-items: center;

  background: #fff1f1;
  color: #a83737;

  font-weight: 900;
}

.kp-error-box h1 {
  margin: 0;

  color: #26332b;
  font-size: 21px;
}

.kp-error-box p {
  margin: 8px 0 17px;

  color: #818b85;
  font-size: 10px;
}

.kp-error-box button {
  height: 42px;

  padding: 0 16px;

  border: 0;
  border-radius: 12px;

  background: #176f47;
  color: #fff;

  font-weight: 800;
}

/* TABLET */

@media (max-width: 850px) {
  .kp-hero {
    height: 360px;
  }

  .kp-profile {
    padding-left: 27px;
    padding-right: 27px;
  }

  .kp-services-grid {
    gap: 14px;
  }

  .kp-service-media {
    height: 190px;
  }

  .kp-gallery {
    height: 400px;
  }
}

/* MOBILE */

@media (max-width: 650px) {
  .kp-page {
    padding-bottom: 82px;
  }

  .kp-header {
    height: 55px;
  }

  .kp-header-inner {
    width: calc(100% - 26px);
  }

  .kp-brand img {
    width: 94px;
  }

  .kp-brand span {
    font-size: 6px;
  }

  .kp-header-actions {
    display: none;
  }

  .kp-hero {
    height: 260px;
  }

  .kp-floating-share {
    display: grid;
  }

  .kp-profile {
    width: 100%;

    margin: 0;

    padding: 0 17px 24px;

    border: 0;
    border-bottom: 1px solid #e3e7e4;
    border-radius: 0;

    box-shadow: none;
  }

  .kp-profile-top {
    min-height: 65px;
  }

  .kp-business-logo {
    width: 83px;
    height: 83px;

    margin-top: -34px;

    border-width: 4px;
    border-radius: 22px;
  }

  .kp-business-logo span {
    font-size: 31px;
  }

  .kp-round-actions {
    padding-top: 10px;
  }

  .kp-round-actions button {
    width: 37px;
    height: 37px;
  }

  .kp-round-actions svg {
    width: 17px;
    height: 17px;
  }

  .kp-business-type {
    margin-bottom: 6px;

    padding: 5px 8px;

    font-size: 7px;
  }

  .kp-profile h1 {
    font-size: 28px;
    letter-spacing: -.8px;
  }

  .kp-meta-row {
    margin-top: 8px;
    font-size: 9px;
  }

  .kp-intro {
    margin-top: 13px;

    font-size: 10px;
    line-height: 1.55;
  }

  .kp-hero-buttons {
    margin-top: 17px;
  }

  .kp-primary,
  .kp-secondary {
    height: 43px;

    flex: 1;

    padding: 0 12px;

    font-size: 9px;
  }

  .kp-navigation {
    top: 55px;
    margin-top: 0;
  }

  .kp-navigation-inner {
    width: 100%;

    padding: 0 17px;

    gap: 27px;

    overflow-x: auto;
  }

  .kp-navigation a {
    height: 46px;

    flex: 0 0 auto;

    font-size: 9px;
  }

  .kp-body {
    width: 100%;
  }

  .kp-section {
    padding: 38px 14px;

    scroll-margin-top: 105px;
  }

  .kp-section-header {
    margin-bottom: 17px;

    display: grid;

    gap: 15px;
  }

  .kp-eyebrow {
    font-size: 7px;
  }

  .kp-section-header h2 {
    margin-top: 4px;

    font-size: 25px;
  }

  .kp-section-header p {
    font-size: 9px;
  }

  .kp-search {
    width: 100%;
    height: 41px;
  }

  .kp-services-grid {
    grid-template-columns: 1fr;

    gap: 14px;
  }

  .kp-service {
    border-radius: 18px;
  }

  .kp-service-media {
    height: 205px;
  }

  .kp-service-info {
    padding: 16px;
  }

  .kp-service-heading h3 {
    font-size: 16px;
  }

  .kp-service-heading > strong {
    font-size: 13px;
  }

  .kp-service-description {
    margin-bottom: 14px;
  }

  .kp-gallery {
    height: 360px;

    grid-template-columns: 1.4fr .8fr;
    grid-template-rows: 1fr 1fr;

    gap: 6px;
  }

  .kp-gallery-item {
    border-radius: 13px;
  }

  .kp-gallery-item-0 {
    grid-row: 1 / 3;
  }

  .kp-gallery-item:nth-child(n+4) {
    display: none;
  }

  .kp-information-layout {
    grid-template-columns: 1fr;

    gap: 12px;
  }

  .kp-info-option {
    min-height: 74px;

    padding: 13px;
  }

  .kp-info-icon {
    width: 39px;
    height: 39px;

    border-radius: 12px;
  }

  .kp-about {
    padding: 23px;

    border-radius: 18px;
  }

  .kp-about h3 {
    font-size: 22px;
  }

  .kp-footer {
    padding: 38px 15px 25px;
  }

  .kp-mobile-booking {
    min-height: 68px;

    padding:
      8px 13px
      max(8px, env(safe-area-inset-bottom));

    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;

    z-index: 150;

    display: grid;
    grid-template-columns: minmax(0,1fr) auto;

    gap: 12px;
    align-items: center;

    border-top: 1px solid #dfe4e1;

    background: rgba(255,255,255,.97);

    box-shadow:
      0 -5px 22px rgba(22,43,30,.08);

    backdrop-filter: blur(14px);
  }

  .kp-mobile-booking > div {
    min-width: 0;

    display: grid;
    gap: 2px;
  }

  .kp-mobile-booking span {
    color: #8d9791;

    font-size: 7px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .kp-mobile-booking strong {
    overflow: hidden;

    color: #26342c;

    font-size: 10px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kp-mobile-booking button {
    height: 43px;

    padding: 0 19px;

    border: 0;
    border-radius: 12px;

    background: #116f47;
    color: #fff;

    font-size: 10px;
    font-weight: 850;
  }
}

@media (max-width: 360px) {
  .kp-hero {
    height: 230px;
  }

  .kp-profile h1 {
    font-size: 25px;
  }

  .kp-secondary {
    max-width: 130px;
  }

  .kp-service-media {
    height: 185px;
  }
}
`;
