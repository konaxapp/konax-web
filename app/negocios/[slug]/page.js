"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function PortalPublicoNegocio() {
  const params = useParams();

  const slug = useMemo(() => {
    const value = params?.slug;
    if (Array.isArray(value)) return value[0] || "";
    return value || "";
  }, [params]);

  const [empresa, setEmpresa] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [tab, setTab] = useState("servicios");

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
        console.error(serviciosResp.error);
      }

      if (fotosResp.error) {
        console.error(fotosResp.error);
      }

      setServicios(serviciosResp.data || []);
      setFotos(fotosResp.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo cargar este negocio.");
    } finally {
      setCargando(false);
    }
  }

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

    window.open(`https://wa.me/${numero}`, "_blank");
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

  async function compartir() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: empresa?.nombre || "KONAX Negocios",
          text: empresa?.nombre || "Mira este negocio en KONAX",
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

  if (cargando) {
    return (
      <main className="kn-loading">
        <style>{CSS}</style>

        <img src="/konax-logo.png" alt="KONAX" />

        <div className="kn-spinner" />

        <strong>Cargando negocio...</strong>
      </main>
    );
  }

  if (error || !empresa) {
    return (
      <main className="kn-error-page">
        <style>{CSS}</style>

        <img
          src="/konax-logo.png"
          alt="KONAX"
          className="kn-error-logo"
        />

        <div className="kn-error-card">
          <div className="kn-error-circle">!</div>

          <h1>Negocio no disponible</h1>

          <p>{error || "No encontramos este negocio."}</p>

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
    fotos?.find((foto) => foto.tipo === "portada")?.url ||
    fotos?.[0]?.url ||
    "";

  const galeria = fotos.filter((foto) => foto.url !== fotoPortada);

  return (
    <main className="kn-page">
      <style>{CSS}</style>

      <header className="kn-top">
        <img src="/konax-logo.png" alt="KONAX" />

        <button
          type="button"
          className="kn-share-top"
          onClick={compartir}
          aria-label="Compartir"
        >
          ↗
        </button>
      </header>

      <section className="kn-cover-wrap">
        {fotoPortada ? (
          <img
            src={fotoPortada}
            alt={empresa.nombre}
            className="kn-cover"
          />
        ) : (
          <div className="kn-cover-fallback">
            <span>KONAX NEGOCIOS</span>
          </div>
        )}

        <div className="kn-cover-shade" />
      </section>

      <section className="kn-profile">
        <div className="kn-logo">
          {empresa.logo_url ? (
            <img src={empresa.logo_url} alt={empresa.nombre} />
          ) : (
            <strong>
              {String(empresa.nombre || "K")
                .charAt(0)
                .toUpperCase()}
            </strong>
          )}
        </div>

        <div className="kn-profile-actions">
          <button type="button" onClick={abrirWhatsApp}>
            💬
          </button>

          <button type="button" onClick={abrirMapa}>
            ⌖
          </button>

          <button type="button" onClick={compartir}>
            ↗
          </button>
        </div>

        <div className="kn-profile-copy">
          {empresa.categoria_negocio && (
            <span className="kn-category">
              {empresa.categoria_negocio}
            </span>
          )}

          <h1>{empresa.nombre}</h1>

          <div className="kn-subline">
            <span>★ Nuevo</span>

            {(empresa.distrito || empresa.provincia) && (
              <>
                <b>·</b>

                <button type="button" onClick={abrirMapa}>
                  {[
                    empresa.distrito,
                    empresa.provincia,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </button>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          className="kn-main-cta"
          onClick={reservarGeneral}
        >
          Reservar cita
        </button>
      </section>

      <nav className="kn-tabs">
        <button
          type="button"
          className={tab === "servicios" ? "active" : ""}
          onClick={() => setTab("servicios")}
        >
          Servicios
        </button>

        <button
          type="button"
          className={tab === "equipo" ? "active" : ""}
          onClick={() => setTab("equipo")}
        >
          Equipo
        </button>

        <button
          type="button"
          className={tab === "info" ? "active" : ""}
          onClick={() => setTab("info")}
        >
          Información
        </button>
      </nav>

      <section className="kn-content">
        {tab === "servicios" && (
          <>
            <div className="kn-heading">
              <span>Reserva en línea</span>
              <h2>Servicios</h2>
            </div>

            {servicios.length === 0 ? (
              <div className="kn-empty">
                Este negocio todavía no ha publicado servicios.
              </div>
            ) : (
              <div className="kn-services">
                {servicios.map((servicio) => (
                  <article
                    key={servicio.id}
                    className="kn-service-card"
                  >
                    <div className="kn-service-photo">
                      {servicio.imagen_url ? (
                        <img
                          src={servicio.imagen_url}
                          alt={servicio.nombre}
                        />
                      ) : (
                        <div className="kn-service-photo-empty">
                          <span>K</span>
                        </div>
                      )}
                    </div>

                    <div className="kn-service-body">
                      <div className="kn-service-top">
                        <div>
                          <small>
                            {servicio.tipo ||
                              empresa.categoria_negocio ||
                              "Servicio"}
                          </small>

                          <h3>{servicio.nombre}</h3>
                        </div>

                        <strong>
                          B/.{" "}
                          {Number(servicio.precio || 0).toFixed(2)}
                        </strong>
                      </div>

                      {servicio.descripcion && (
                        <p>{servicio.descripcion}</p>
                      )}

                      <div className="kn-service-bottom">
                        <span>
                          ◷{" "}
                          {Number(
                            servicio.duracion_minutos || 60
                          )}{" "}
                          min
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            reservarServicio(servicio)
                          }
                        >
                          Reservar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {empresa.descripcion_publica && (
              <section className="kn-section">
                <div className="kn-heading">
                  <span>Sobre nosotros</span>
                  <h2>Conoce el negocio</h2>
                </div>

                <div className="kn-about-card">
                  <p>{empresa.descripcion_publica}</p>
                </div>
              </section>
            )}

            {fotos.length > 0 && (
              <section className="kn-section">
                <div className="kn-heading">
                  <span>Nuestro espacio</span>
                  <h2>Galería</h2>
                </div>

                <div className="kn-gallery-feature">
                  <div className="kn-gallery-main">
                    <img
                      src={fotoPortada || fotos[0]?.url}
                      alt={empresa.nombre}
                    />
                  </div>

                  <div className="kn-gallery-side">
                    {(galeria.length > 0 ? galeria : fotos)
                      .slice(0, 2)
                      .map((foto, index) => (
                        <img
                          key={foto.id || index}
                          src={foto.url}
                          alt={`${empresa.nombre} ${index + 1}`}
                        />
                      ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {tab === "equipo" && (
          <section className="kn-tab-placeholder">
            <div className="kn-icon-placeholder">👤</div>

            <h2>Equipo</h2>

            <p>
              Aquí mostraremos los profesionales o colaboradores
              disponibles para reservar.
            </p>
          </section>
        )}

        {tab === "info" && (
          <>
            <div className="kn-heading">
              <span>Información</span>
              <h2>Sobre el negocio</h2>
            </div>

            <div className="kn-info-card">
              {empresa.direccion && (
                <button
                  type="button"
                  className="kn-info-row"
                  onClick={abrirMapa}
                >
                  <span className="kn-info-icon">⌖</span>

                  <div>
                    <small>Dirección</small>
                    <strong>{empresa.direccion}</strong>

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
                  className="kn-info-row"
                  onClick={abrirWhatsApp}
                >
                  <span className="kn-info-icon">💬</span>

                  <div>
                    <small>WhatsApp</small>
                    <strong>{empresa.telefono}</strong>
                  </div>

                  <b>›</b>
                </button>
              )}

              {empresa.correo && (
                <div className="kn-info-row">
                  <span className="kn-info-icon">✉</span>

                  <div>
                    <small>Correo</small>
                    <strong>{empresa.correo}</strong>
                  </div>
                </div>
              )}
            </div>

            {empresa.descripcion_publica && (
              <section className="kn-section">
                <div className="kn-heading">
                  <span>Descripción</span>
                  <h2>Sobre nosotros</h2>
                </div>

                <div className="kn-about-card">
                  <p>{empresa.descripcion_publica}</p>
                </div>
              </section>
            )}
          </>
        )}

        <div className="kn-powered">
          <img src="/konax-logo.png" alt="KONAX" />

          <span>
            Reservas y gestión digital con KONAX
          </span>
        </div>
      </section>

      <div className="kn-bottom">
        <div>
          <small>Reserva en línea</small>
          <strong>{empresa.nombre}</strong>
        </div>

        <button type="button" onClick={reservarGeneral}>
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
  overflow-x: hidden;
  background: #f5f6f5;
}

body {
  font-family: Arial, Helvetica, sans-serif;
}

button {
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.kn-page {
  min-height: 100vh;
  padding-bottom: 90px;
  background: #f6f7f6;
  color: #18221c;
}

.kn-top {
  height: 56px;
  padding: 7px 14px;

  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;

  position: sticky;
  top: 0;
  z-index: 50;

  background: rgba(255,255,255,.97);
  border-bottom: 1px solid #e5e8e6;
  backdrop-filter: blur(12px);
}

.kn-top img {
  grid-column: 2;
  width: 112px;
  max-height: 30px;
  object-fit: contain;
  justify-self: center;
}

.kn-share-top {
  grid-column: 3;

  width: 36px;
  height: 36px;

  border: 1px solid #dfe4e1;
  border-radius: 50%;

  background: #fff;
  color: #167348;

  font-size: 17px;
  font-weight: 900;
  cursor: pointer;
}

.kn-cover-wrap {
  height: 220px;
  position: relative;
  overflow: hidden;
  background: #dfe5e1;
}

.kn-cover {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.kn-cover-fallback {
  width: 100%;
  height: 100%;

  display: grid;
  place-items: center;

  background:
    radial-gradient(
      circle at 20% 20%,
      rgba(58,151,102,.20),
      transparent 38%
    ),
    linear-gradient(
      145deg,
      #dfe8e3,
      #bdd2c5
    );

  color: rgba(30,80,55,.35);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
}

.kn-cover-shade {
  position: absolute;
  inset: 0;

  background:
    linear-gradient(
      180deg,
      rgba(0,0,0,0) 45%,
      rgba(0,0,0,.30) 100%
    );
}

.kn-profile {
  width: min(100%, 720px);
  margin: 0 auto;

  padding: 0 15px 16px;

  position: relative;

  background: #fff;
  border-bottom: 1px solid #e8ebe9;
}

.kn-logo {
  width: 82px;
  height: 82px;

  margin-top: -41px;

  position: relative;
  z-index: 4;

  border: 4px solid #fff;
  border-radius: 22px;

  overflow: hidden;

  display: grid;
  place-items: center;

  background: #fff;

  box-shadow:
    0 8px 22px rgba(25,50,35,.16);
}

.kn-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.kn-logo strong {
  font-size: 32px;
  color: #138052;
}

.kn-profile-actions {
  position: absolute;
  right: 15px;
  top: 11px;

  display: flex;
  gap: 7px;
}

.kn-profile-actions button {
  width: 37px;
  height: 37px;

  border: 1px solid #dfe5e1;
  border-radius: 50%;

  background: #fff;
  color: #176f48;

  display: grid;
  place-items: center;

  font-size: 15px;
  cursor: pointer;
}

.kn-profile-copy {
  padding-top: 13px;
}

.kn-category {
  display: inline-block;

  margin-bottom: 5px;
  padding: 4px 8px;

  border-radius: 999px;

  background: #eef6f1;
  color: #147a4d;

  font-size: 9px;
  font-weight: 900;
}

.kn-profile-copy h1 {
  margin: 0 0 7px;

  font-size: 27px;
  line-height: 1.05;
  letter-spacing: -.6px;

  color: #19231d;
}

.kn-subline {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;

  color: #737f78;

  font-size: 10px;
}

.kn-subline span {
  color: #57675d;
  font-weight: 800;
}

.kn-subline b {
  color: #b3bbb6;
}

.kn-subline button {
  padding: 0;
  border: 0;
  background: transparent;

  color: #737f78;
  font-size: 10px;
  cursor: pointer;
}

.kn-main-cta {
  width: 100%;
  height: 47px;

  margin-top: 15px;

  border: 0;
  border-radius: 14px;

  background: #117c4d;
  color: #fff;

  font-size: 13px;
  font-weight: 900;

  box-shadow:
    0 7px 16px rgba(20,125,77,.16);

  cursor: pointer;
}

.kn-tabs {
  width: min(100%, 720px);
  margin: 0 auto;

  display: grid;
  grid-template-columns: repeat(3,1fr);

  position: sticky;
  top: 56px;
  z-index: 40;

  background: #fff;
  border-bottom: 1px solid #e4e8e5;
}

.kn-tabs button {
  height: 48px;

  border: 0;
  border-bottom: 2px solid transparent;

  background: #fff;
  color: #747e78;

  font-size: 10px;
  font-weight: 850;

  cursor: pointer;
}

.kn-tabs button.active {
  color: #14764a;
  border-bottom-color: #14764a;
}

.kn-content {
  width: min(100%, 720px);
  margin: 0 auto;

  padding: 20px 13px 28px;
}

.kn-heading {
  margin-bottom: 12px;
}

.kn-heading span {
  color: #15794c;

  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.kn-heading h2 {
  margin: 3px 0 0;

  color: #1d2821;

  font-size: 22px;
  line-height: 1.08;
  letter-spacing: -.4px;
}

.kn-services {
  display: grid;
  gap: 10px;
}

.kn-service-card {
  min-height: 116px;

  display: grid;
  grid-template-columns: 105px minmax(0,1fr);

  overflow: hidden;

  border: 1px solid #e0e6e2;
  border-radius: 17px;

  background: #fff;

  box-shadow:
    0 5px 15px rgba(25,55,38,.04);
}

.kn-service-photo {
  min-height: 116px;
  background: #eef1ef;
}

.kn-service-photo img {
  width: 100%;
  height: 100%;

  display: block;
  object-fit: cover;
}

.kn-service-photo-empty {
  width: 100%;
  height: 100%;

  display: grid;
  place-items: center;

  background:
    linear-gradient(
      145deg,
      #edf4f0,
      #d9e7de
    );
}

.kn-service-photo-empty span {
  width: 37px;
  height: 37px;

  border-radius: 50%;

  display: grid;
  place-items: center;

  background: #fff;
  color: #148052;

  font-size: 16px;
  font-weight: 900;
}

.kn-service-body {
  min-width: 0;

  padding: 11px 11px 10px;

  display: grid;
  align-content: space-between;
}

.kn-service-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.kn-service-top > div {
  min-width: 0;
}

.kn-service-top small {
  color: #188054;

  font-size: 7px;
  font-weight: 900;
  text-transform: uppercase;
}

.kn-service-top h3 {
  margin: 3px 0 0;

  color: #222d26;

  font-size: 14px;
  line-height: 1.12;
}

.kn-service-top strong {
  flex: 0 0 auto;

  color: #166e48;

  font-size: 12px;
}

.kn-service-body p {
  margin: 6px 0;

  color: #78827c;

  font-size: 9px;
  line-height: 1.35;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.kn-service-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 8px;
}

.kn-service-bottom span {
  color: #7b857f;

  font-size: 9px;
}

.kn-service-bottom button {
  height: 31px;

  padding: 0 11px;

  border: 1px solid #178251;
  border-radius: 10px;

  background: #f1f8f4;
  color: #14764a;

  font-size: 9px;
  font-weight: 900;

  cursor: pointer;
}

.kn-section {
  padding-top: 27px;
}

.kn-about-card {
  padding: 15px;

  border: 1px solid #e1e6e3;
  border-radius: 16px;

  background: #fff;
}

.kn-about-card p {
  margin: 0;

  color: #626f67;

  font-size: 11px;
  line-height: 1.6;
}

.kn-gallery-feature {
  height: 210px;

  display: grid;
  grid-template-columns: 1.55fr .8fr;

  gap: 7px;
}

.kn-gallery-main,
.kn-gallery-side {
  min-width: 0;
  min-height: 0;
}

.kn-gallery-main img {
  width: 100%;
  height: 100%;

  display: block;
  object-fit: cover;

  border-radius: 16px;
}

.kn-gallery-side {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 7px;
}

.kn-gallery-side img {
  width: 100%;
  height: 100%;

  min-height: 0;

  display: block;
  object-fit: cover;

  border-radius: 13px;
}

.kn-info-card {
  overflow: hidden;

  border: 1px solid #e0e6e2;
  border-radius: 17px;

  background: #fff;
}

.kn-info-row {
  width: 100%;

  min-height: 64px;
  padding: 10px 12px;

  border: 0;
  border-bottom: 1px solid #edf0ee;

  display: grid;
  grid-template-columns: 37px minmax(0,1fr) auto;

  gap: 10px;
  align-items: center;

  background: #fff;

  text-align: left;
  color: #26322b;
}

.kn-info-row:last-child {
  border-bottom: 0;
}

button.kn-info-row {
  cursor: pointer;
}

.kn-info-icon {
  width: 35px;
  height: 35px;

  border-radius: 11px;

  display: grid;
  place-items: center;

  background: #eef6f1;
  color: #16764b;
}

.kn-info-row > div {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.kn-info-row small {
  color: #8b958f;
  font-size: 7px;
  font-weight: 900;
  text-transform: uppercase;
}

.kn-info-row strong {
  color: #26322b;
  font-size: 10px;
  word-break: break-word;
}

.kn-info-row p {
  margin: 0;
  color: #7e8982;
  font-size: 9px;
}

.kn-info-row > b {
  color: #a8b0ab;
  font-size: 19px;
}

.kn-tab-placeholder {
  min-height: 280px;

  padding: 40px 22px;

  display: grid;
  place-content: center;
  justify-items: center;

  text-align: center;

  border: 1px solid #e1e6e3;
  border-radius: 18px;

  background: #fff;
}

.kn-icon-placeholder {
  width: 52px;
  height: 52px;

  margin-bottom: 10px;

  border-radius: 50%;

  display: grid;
  place-items: center;

  background: #eef6f1;

  font-size: 21px;
}

.kn-tab-placeholder h2 {
  margin: 0 0 6px;

  color: #27332c;

  font-size: 19px;
}

.kn-tab-placeholder p {
  margin: 0;

  max-width: 280px;

  color: #7b857f;

  font-size: 10px;
  line-height: 1.45;
}

.kn-empty {
  padding: 22px 14px;

  border: 1px dashed #cfd7d2;
  border-radius: 16px;

  background: #fff;

  color: #7d8781;
  text-align: center;

  font-size: 10px;
}

.kn-powered {
  margin-top: 30px;

  padding: 15px;

  display: flex;
  justify-content: center;
  align-items: center;
  gap: 9px;

  border-top: 1px solid #e3e7e4;
}

.kn-powered img {
  width: 72px;
}

.kn-powered span {
  color: #88928c;
  font-size: 8px;
}

.kn-bottom {
  min-height: 70px;

  padding:
    9px 13px
    max(9px, env(safe-area-inset-bottom));

  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;

  z-index: 60;

  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 10px;
  align-items: center;

  background: rgba(255,255,255,.98);
  border-top: 1px solid #dee4e0;

  box-shadow:
    0 -5px 18px rgba(20,45,30,.06);

  backdrop-filter: blur(12px);
}

.kn-bottom > div {
  min-width: 0;
  display: grid;
}

.kn-bottom small {
  color: #929b95;

  font-size: 7px;
  font-weight: 800;
  text-transform: uppercase;
}

.kn-bottom strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  color: #28342d;
  font-size: 11px;
}

.kn-bottom button {
  height: 42px;

  padding: 0 18px;

  border: 0;
  border-radius: 12px;

  background: #117d4d;
  color: #fff;

  font-size: 11px;
  font-weight: 900;

  cursor: pointer;
}

.kn-loading {
  min-height: 100vh;

  display: grid;
  place-content: center;
  justify-items: center;
  gap: 13px;

  background: #f4f6f5;
  color: #47554c;
}

.kn-loading img {
  width: 125px;
}

.kn-loading strong {
  font-size: 11px;
}

.kn-spinner {
  width: 30px;
  height: 30px;

  border: 3px solid #dce5df;
  border-top-color: #147c4d;
  border-radius: 50%;

  animation: kn-spin .8s linear infinite;
}

@keyframes kn-spin {
  to {
    transform: rotate(360deg);
  }
}

.kn-error-page {
  min-height: 100vh;

  padding: 30px 16px;

  display: grid;
  place-content: center;
  justify-items: center;

  background: #f4f6f5;
}

.kn-error-logo {
  width: 120px;
  margin-bottom: 17px;
}

.kn-error-card {
  width: min(100%, 390px);

  padding: 24px 19px;

  border: 1px solid #e1e6e3;
  border-radius: 20px;

  background: #fff;

  text-align: center;
}

.kn-error-circle {
  width: 46px;
  height: 46px;

  margin: 0 auto 11px;

  border-radius: 50%;

  display: grid;
  place-items: center;

  background: #fff1f1;
  color: #a73333;

  font-size: 20px;
  font-weight: 900;
}

.kn-error-card h1 {
  margin: 0 0 6px;

  color: #27332c;
  font-size: 21px;
}

.kn-error-card p {
  margin: 0 0 16px;

  color: #7b857f;
  font-size: 10px;
  line-height: 1.45;
}

.kn-error-card button {
  height: 42px;

  padding: 0 15px;

  border: 0;
  border-radius: 12px;

  background: #147c4d;
  color: #fff;

  font-weight: 900;
}

@media (min-width: 720px) {
  .kn-cover-wrap {
    width: 720px;
    height: 280px;
    margin: 0 auto;
  }

  .kn-profile {
    border-left: 1px solid #e7ebe8;
    border-right: 1px solid #e7ebe8;
  }

  .kn-tabs {
    border-left: 1px solid #e7ebe8;
    border-right: 1px solid #e7ebe8;
  }

  .kn-content {
    background: #f6f7f6;
  }

  .kn-bottom {
    width: 720px;

    left: 50%;
    right: auto;

    transform: translateX(-50%);

    border-left: 1px solid #dee4e0;
    border-right: 1px solid #dee4e0;

    border-radius: 17px 17px 0 0;
  }
}

@media (max-width: 380px) {
  .kn-cover-wrap {
    height: 195px;
  }

  .kn-logo {
    width: 72px;
    height: 72px;
    margin-top: -36px;
  }

  .kn-profile-copy h1 {
    font-size: 24px;
  }

  .kn-service-card {
    grid-template-columns: 92px minmax(0,1fr);
  }

  .kn-service-photo {
    min-height: 108px;
  }

  .kn-gallery-feature {
    height: 185px;
  }
}
`;
