"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabasePortalAlumno as supabase } from "../../../lib/supabasePortalAlumno";

const VERSION = "2026.09.07-PORTAL-ALUMNO-PRO-V5";
const BUCKET_PERFIL = "alumnos-perfil";
const BUCKET_LOGOS_CANDIDATOS = [
  "logos-negocios",
  "negocios-logos",
  "empresa-logos",
  "logos",
];

export default function PortalAlumnoInicio() {
  const params = useParams();
  const router = useRouter();

  const slug = String(params?.slug || "").trim();

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [cuenta, setCuenta] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [fotoFirmada, setFotoFirmada] = useState("");
  const [logoNegocioFirmado, setLogoNegocioFirmado] = useState("");
  const [mostrarEditor, setMostrarEditor] = useState(false);

  const [peso, setPeso] = useState("");
  const [estatura, setEstatura] = useState("");

  const [mensajePerfil, setMensajePerfil] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function cargarTodo(modoActualizar = false) {
    if (!slug) {
      setError("El portal no es válido.");
      setCargando(false);
      return;
    }

    if (modoActualizar) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    setError("");
    setMensajePerfil("");

    try {
      const {
        data: { session },
        error: errorSesion,
      } = await supabase.auth.getSession();

      if (errorSesion) throw errorSesion;

      if (!session?.user?.id) {
        router.replace(`/alumno/${encodeURIComponent(slug)}`);
        return;
      }

      const [
        { data: dataCuenta, error: errorCuenta },
        { data: dataPerfil, error: errorPerfil },
      ] = await Promise.all([
        supabase.rpc("obtener_mi_cuenta_alumno", {
          p_slug: slug,
        }),
        supabase.rpc("obtener_mi_perfil_alumno", {
          p_slug: slug,
        }),
      ]);

      if (errorCuenta) throw errorCuenta;

      if (!dataCuenta?.ok) {
        throw new Error(
          dataCuenta?.mensaje || "No se pudo abrir tu portal."
        );
      }

      if (errorPerfil) throw errorPerfil;

      if (!dataPerfil?.ok) {
        throw new Error(
          dataPerfil?.mensaje || "No se pudo cargar tu perfil."
        );
      }

      setCuenta(dataCuenta);
      setPerfil(dataPerfil);

      setPeso(
        dataPerfil?.peso === null || dataPerfil?.peso === undefined
          ? ""
          : String(dataPerfil.peso)
      );

      setEstatura(
        dataPerfil?.estatura === null || dataPerfil?.estatura === undefined
          ? ""
          : String(dataPerfil.estatura)
      );

      await Promise.all([
        resolverFoto(dataPerfil?.foto_url || ""),
        resolverLogoNegocio(dataCuenta?.empresa_logo_url || ""),
      ]);
    } catch (err) {
      console.error("Error cargando portal del alumno:", err);

      setError(err?.message || "No se pudo cargar tu cuenta.");
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }

  async function resolverFoto(valor) {
    const foto = String(valor || "").trim();

    if (!foto) {
      setFotoFirmada("");
      return;
    }

    if (
      foto.startsWith("http://") ||
      foto.startsWith("https://") ||
      foto.startsWith("data:") ||
      foto.startsWith("blob:")
    ) {
      setFotoFirmada(foto);
      return;
    }

    const { data, error: signedError } = await supabase.storage
      .from(BUCKET_PERFIL)
      .createSignedUrl(foto, 60 * 60);

    if (signedError) {
      console.warn("No se pudo crear URL firmada:", signedError);
      setFotoFirmada("");
      return;
    }

    setFotoFirmada(data?.signedUrl || "");
  }

  async function resolverLogoNegocio(valor) {
    const logo = String(valor || "").trim();

    if (!logo) {
      setLogoNegocioFirmado("");
      return;
    }

    if (
      logo.startsWith("http://") ||
      logo.startsWith("https://") ||
      logo.startsWith("data:") ||
      logo.startsWith("blob:") ||
      logo.startsWith("/")
    ) {
      setLogoNegocioFirmado(logo);
      return;
    }

    for (const bucket of BUCKET_LOGOS_CANDIDATOS) {
      try {
        const { data, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(logo, 60 * 60);

        if (!signedError && data?.signedUrl) {
          setLogoNegocioFirmado(data.signedUrl);
          return;
        }
      } catch (err) {
        console.warn(`No se pudo resolver el logo desde ${bucket}:`, err);
      }
    }

    setLogoNegocioFirmado("");
  }

  async function cerrarSesion() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace(`/alumno/${encodeURIComponent(slug)}`);
    }
  }

  async function guardarDatosPerfil() {
    setGuardandoPerfil(true);
    setMensajePerfil("");
    setError("");

    try {
      const pesoNumero =
        String(peso).trim() === ""
          ? null
          : Number(String(peso).replace(",", "."));

      const estaturaNumero =
        String(estatura).trim() === ""
          ? null
          : Number(String(estatura).replace(",", "."));

      if (
        pesoNumero !== null &&
        (!Number.isFinite(pesoNumero) || pesoNumero <= 0 || pesoNumero > 500)
      ) {
        throw new Error("Ingresa un peso válido en kilogramos.");
      }

      if (
        estaturaNumero !== null &&
        (!Number.isFinite(estaturaNumero) ||
          estaturaNumero <= 0 ||
          estaturaNumero > 3)
      ) {
        throw new Error(
          "Ingresa una estatura válida en metros. Ejemplo: 1.76"
        );
      }

      const { data, error: rpcError } = await supabase.rpc(
        "actualizar_mi_perfil_alumno",
        {
          p_slug: slug,
          p_foto_url: null,
          p_peso: pesoNumero,
          p_estatura: estaturaNumero,
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudo guardar el perfil."
        );
      }

      setPerfil((prev) => ({
        ...(prev || {}),
        peso: data?.peso ?? pesoNumero,
        estatura: data?.estatura ?? estaturaNumero,
      }));

      setMensajePerfil("Perfil actualizado.");
      setMostrarEditor(false);
    } catch (err) {
      console.error("Error guardando perfil:", err);

      setError(err?.message || "No se pudo guardar el perfil.");
    } finally {
      setGuardandoPerfil(false);
    }
  }

  async function subirSelfie(event) {
    const archivo = event?.target?.files?.[0];

    if (!archivo) return;

    setSubiendoFoto(true);
    setMensajePerfil("");
    setError("");

    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(archivo.type)
      ) {
        throw new Error("Usa una imagen JPG, PNG o WebP.");
      }

      if (archivo.size > 5 * 1024 * 1024) {
        throw new Error("La foto no puede superar 5 MB.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const userId = session?.user?.id;

      if (!userId) {
        throw new Error(
          "Tu sesión expiró. Vuelve a iniciar sesión."
        );
      }

      const extension =
        archivo.type === "image/png"
          ? "png"
          : archivo.type === "image/webp"
          ? "webp"
          : "jpg";

      const ruta = `${userId}/perfil.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_PERFIL)
        .upload(ruta, archivo, {
          upsert: true,
          cacheControl: "3600",
          contentType: archivo.type,
        });

      if (uploadError) throw uploadError;

      const { data, error: rpcError } = await supabase.rpc(
        "actualizar_mi_perfil_alumno",
        {
          p_slug: slug,
          p_foto_url: ruta,
          p_peso: null,
          p_estatura: null,
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || "No se pudo guardar la foto."
        );
      }

      setPerfil((prev) => ({
        ...(prev || {}),
        foto_url: ruta,
      }));

      setCuenta((prev) => ({
        ...(prev || {}),
        foto_url: ruta,
      }));

      await resolverFoto(ruta);

      setMensajePerfil("Foto actualizada.");
    } catch (err) {
      console.error("Error subiendo selfie:", err);

      setError(err?.message || "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);

      if (event?.target) {
        event.target.value = "";
      }
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return "No definida";

    try {
      return new Intl.DateTimeFormat("es-PA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${fecha}T12:00:00`));
    } catch {
      return String(fecha);
    }
  }

  function formatearDinero(valor) {
    const numero = Number(valor || 0);

    if (!Number.isFinite(numero)) {
      return "$0.00";
    }

    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(numero);
  }

  const membresia = cuenta?.membresia || null;

  const qrToken = String(cuenta?.qr_token || "").trim();

  const qrDisponible = Boolean(
    cuenta?.qr_disponible && qrToken
  );

  const accesoPermitido = Boolean(
    cuenta?.acceso_permitido
  );

  const qrUrl = useMemo(() => {
    if (!qrToken) return "";

    return (
      "https://api.qrserver.com/v1/create-qr-code/" +
      `?size=700x700&margin=24&data=${encodeURIComponent(qrToken)}`
    );
  }, [qrToken]);

  const iniciales = useMemo(() => {
    const nombre = String(cuenta?.nombre || "Alumno").trim();

    const partes = nombre.split(/\s+/).filter(Boolean);

    return (
      partes
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join("") || "A"
    );
  }, [cuenta?.nombre]);

  const estadoVisual =
    cuenta?.membresia_estado_visual ||
    membresia?.estado ||
    "Sin membresía";

  const pesoVisual =
    perfil?.peso === null || perfil?.peso === undefined
      ? "Sin registrar"
      : `${Number(perfil.peso).toFixed(1)} kg`;

  const estaturaVisual =
    perfil?.estatura === null || perfil?.estatura === undefined
      ? "Sin registrar"
      : `${Number(perfil.estatura).toFixed(2)} m`;

  if (cargando) {
    return (
      <main style={S.loadingPage}>
        <section style={S.loadingCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={S.loadingLogo}
          />

          <div style={S.loader} />

          <strong>Preparando tu portal...</strong>

          <span style={S.loadingText}>
            Estamos validando tu acceso.
          </span>
        </section>
      </main>
    );
  }

  if (error && !cuenta?.ok) {
    return (
      <main style={S.loadingPage}>
        <section style={S.errorCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={S.errorLogo}
          />

          <div style={S.errorIcon}>!</div>

          <h1 style={S.errorTitle}>
            No pudimos abrir tu portal
          </h1>

          <p style={S.errorText}>
            {error || "Tu portal no está disponible."}
          </p>

          <button
            type="button"
            onClick={() => cargarTodo()}
            style={S.primaryButton}
          >
            Intentar nuevamente
          </button>

          <button
            type="button"
            onClick={cerrarSesion}
            style={S.secondaryButton}
          >
            Volver al acceso
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={S.page}>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #0b1220;
        }

        input {
          font: inherit;
        }

        @media (max-width: 620px) {
          .portal-shell {
            min-height: 100vh !important;
            border-radius: 0 !important;
          }

          .portal-content {
            padding-left: 15px !important;
            padding-right: 15px !important;
          }

          .member-grid {
            grid-template-columns: 58px minmax(0, 1fr) !important;
          }

          .member-status {
            grid-column: 1 / -1 !important;
            justify-self: start !important;
          }

          .profile-metrics {
            grid-template-columns: 1fr 1fr !important;
          }

          .membership-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .qr-layout {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 390px) {
          .profile-metrics,
          .membership-grid,
          .photo-actions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section
        style={S.shell}
        className="portal-shell"
      >
        <header style={S.topbar}>
          <div style={S.brandBlock}>
            <div style={S.brandMark}>
              {logoNegocioFirmado ? (
                <img
                  src={logoNegocioFirmado}
                  alt={cuenta?.empresa_nombre || "Negocio"}
                  style={S.brandLogo}
                />
              ) : (
                <span>
                  {String(
                    cuenta?.empresa_nombre || "K"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <strong style={S.brandName}>
                {cuenta?.empresa_nombre || "Gimnasio"}
              </strong>

              <span style={S.powered}>
                Portal del Alumno · KONAX
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => cargarTodo(true)}
            disabled={actualizando}
            style={S.refreshButton}
          >
            {actualizando
              ? "Actualizando..."
              : "↻ Actualizar"}
          </button>
        </header>

        <div
          style={S.content}
          className="portal-content"
        >
          {error && (
            <div style={S.inlineError}>
              <strong>Atención:</strong>{" "}
              {error}
            </div>
          )}

          {mensajePerfil && (
            <div style={S.successMessage}>
              {mensajePerfil}
            </div>
          )}

          <section
            style={S.memberHeader}
            className="member-grid"
          >
            <div style={S.avatar}>
              {fotoFirmada ? (
                <img
                  src={fotoFirmada}
                  alt={cuenta?.nombre || "Alumno"}
                  style={S.avatarImage}
                />
              ) : (
                <span>{iniciales}</span>
              )}
            </div>

            <div style={S.memberIdentity}>
              <span style={S.welcome}>
                Hola,
              </span>

              <h1 style={S.memberName}>
                {cuenta?.nombre}
              </h1>

              <span style={S.memberId}>
                {cuenta?.cedula
                  ? `ID ${cuenta.cedula}`
                  : "Miembro KONAX"}
              </span>
            </div>

            <div
              style={{
                ...S.estadoBadge,
                ...(accesoPermitido
                  ? S.estadoBadgeOk
                  : S.estadoBadgeWarning),
              }}
              className="member-status"
            >
              <span
                style={{
                  ...S.statusDot,
                  background: accesoPermitido
                    ? "#1FB36A"
                    : "#E2A72F",
                }}
              />

              {estadoVisual}
            </div>
          </section>

          <section style={S.profileCard}>
            <div style={S.sectionHeading}>
              <div>
                <span style={S.sectionEyebrow}>
                  MI PERFIL
                </span>

                <h2 style={S.sectionTitle}>
                  Datos personales
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMostrarEditor((valor) => !valor)
                }
                style={S.outlineSmallButton}
              >
                {mostrarEditor
                  ? "Cerrar"
                  : "Editar perfil"}
              </button>
            </div>

            <div style={S.profileBodySimple}>
              <div
                style={S.profileMetrics}
                className="profile-metrics"
              >
                <Metric
                  label="Peso"
                  value={pesoVisual}
                />

                <Metric
                  label="Estatura"
                  value={estaturaVisual}
                />
              </div>

              <div
                style={S.photoActions}
                className="photo-actions"
              >
                <label style={S.selfieButton}>
                  {subiendoFoto
                    ? "Subiendo..."
                    : "📷 Tomar selfie"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    onChange={subirSelfie}
                    disabled={subiendoFoto}
                    style={{
                      display: "none",
                    }}
                  />
                </label>

                <label style={S.galleryButton}>
                  Elegir foto

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={subirSelfie}
                    disabled={subiendoFoto}
                    style={{
                      display: "none",
                    }}
                  />
                </label>
              </div>

              {mostrarEditor && (
                <div style={S.profileEditor}>
                  <div style={S.fieldGroup}>
                    <label style={S.fieldLabel}>
                      Peso (kg)
                    </label>

                    <input
                      value={peso}
                      onChange={(e) =>
                        setPeso(e.target.value)
                      }
                      inputMode="decimal"
                      placeholder="Ej. 82.5"
                      style={S.input}
                    />
                  </div>

                  <div style={S.fieldGroup}>
                    <label style={S.fieldLabel}>
                      Estatura (m)
                    </label>

                    <input
                      value={estatura}
                      onChange={(e) =>
                        setEstatura(e.target.value)
                      }
                      inputMode="decimal"
                      placeholder="Ej. 1.76"
                      style={S.input}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={guardarDatosPerfil}
                    disabled={guardandoPerfil}
                    style={S.saveProfileButton}
                  >
                    {guardandoPerfil
                      ? "Guardando..."
                      : "Guardar cambios"}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section
            style={{
              ...S.accessBanner,
              ...(accesoPermitido
                ? S.accessBannerOk
                : S.accessBannerBlocked),
            }}
          >
            <div
              style={{
                ...S.accessIcon,
                ...(accesoPermitido
                  ? S.accessIconOk
                  : S.accessIconBlocked),
              }}
            >
              {accesoPermitido ? "✓" : "!"}
            </div>

            <div>
              <span style={S.accessLabel}>
                ESTADO DE ACCESO
              </span>

              <strong style={S.accessTitle}>
                {accesoPermitido
                  ? "Acceso disponible"
                  : "Acceso no disponible"}
              </strong>

              <p style={S.accessText}>
                {accesoPermitido
                  ? "Tu membresía está habilitada. Muestra tu QR en recepción para ingresar."
                  : "Tu QR no puede autorizar una entrada en este momento. Revisa el estado de tu membresía."}
              </p>
            </div>
          </section>

          <section style={S.section}>
            <div style={S.sectionHeading}>
              <div>
                <span style={S.sectionEyebrow}>
                  TU PLAN
                </span>

                <h2 style={S.sectionTitle}>
                  Membresía
                </h2>
              </div>

              {membresia && (
                <span style={S.planChip}>
                  {membresia.periodicidad ||
                    "Membresía"}
                </span>
              )}
            </div>

            {membresia ? (
              <>
                <div style={S.planHero}>
                  <div>
                    <span style={S.planLabel}>
                      PLAN ACTUAL
                    </span>

                    <strong style={S.planName}>
                      {membresia.plan ||
                        "Membresía"}
                    </strong>

                    {membresia.descripcion && (
                      <p style={S.planDescription}>
                        {membresia.descripcion}
                      </p>
                    )}
                  </div>

                  <strong style={S.planPrice}>
                    {formatearDinero(
                      membresia.precio
                    )}
                  </strong>
                </div>

                <div
                  style={S.membershipGrid}
                  className="membership-grid"
                >
                  <Dato
                    label="Inicio"
                    value={formatearFecha(
                      membresia.fecha_inicio
                    )}
                  />

                  <Dato
                    label="Vencimiento"
                    value={formatearFecha(
                      membresia.fecha_vencimiento
                    )}
                    destacado
                  />

                  <Dato
                    label="Estado"
                    value={estadoVisual}
                  />

                  <Dato
                    label="Tiempo restante"
                    value={
                      cuenta?.dias_restantes === null ||
                      cuenta?.dias_restantes === undefined
                        ? "-"
                        : cuenta.dias_restantes < 0
                        ? "Vencida"
                        : cuenta.dias_restantes === 0
                        ? "Vence hoy"
                        : `${cuenta.dias_restantes} día${
                            cuenta.dias_restantes === 1
                              ? ""
                              : "s"
                          }`
                    }
                  />
                </div>
              </>
            ) : (
              <div style={S.emptyMembership}>
                <div style={S.emptyIcon}>
                  ◇
                </div>

                <strong>
                  Sin membresía registrada
                </strong>

                <span>
                  Comunícate con recepción
                  para activar un plan.
                </span>
              </div>
            )}
          </section>

          <section style={S.qrSection}>
            <div style={S.sectionHeading}>
              <div>
                <span style={S.qrEyebrow}>
                  ACCESO DIGITAL
                </span>

                <h2 style={S.sectionTitle}>
                  Mi código QR
                </h2>
              </div>

              <span
                style={{
                  ...S.qrStatus,
                  ...(accesoPermitido
                    ? S.qrStatusActive
                    : S.qrStatusInactive),
                }}
              >
                {accesoPermitido
                  ? "ACTIVO"
                  : "NO DISPONIBLE"}
              </span>
            </div>

            <div
              style={S.qrLayout}
              className="qr-layout"
            >
              {qrDisponible ? (
                <div
                  style={{
                    ...S.qrFrame,
                    opacity: accesoPermitido
                      ? 1
                      : 0.38,
                  }}
                >
                  <img
                    src={qrUrl}
                    alt="Mi código QR de acceso"
                    style={S.qrImage}
                  />

                  {!accesoPermitido && (
                    <div style={S.qrBlocked}>
                      <span
                        style={S.qrBlockedIcon}
                      >
                        🔒
                      </span>

                      <strong>
                        Acceso temporalmente
                        bloqueado
                      </strong>
                    </div>
                  )}
                </div>
              ) : (
                <div style={S.noQr}>
                  <span style={S.noQrIcon}>
                    QR
                  </span>

                  <strong>
                    QR no disponible
                  </strong>

                  <span>
                    Solicita a recepción que
                    actualice tu ficha.
                  </span>
                </div>
              )}

              <div style={S.qrInstructions}>
                <span
                  style={S.qrInstructionEyebrow}
                >
                  CÓMO INGRESAR
                </span>

                <h3
                  style={S.qrInstructionTitle}
                >
                  Muestra este código en
                  recepción
                </h3>

                <p style={S.qrInstructionText}>
                  El personal escaneará tu QR
                  desde el módulo Check-in de
                  KONAX.
                </p>

                <div style={S.steps}>
                  <Paso
                    numero="1"
                    texto="Abre tu Portal del Alumno."
                  />

                  <Paso
                    numero="2"
                    texto="Muestra este QR en recepción."
                  />

                  <Paso
                    numero="3"
                    texto="KONAX valida tu membresía y registra tu entrada."
                  />
                </div>
              </div>
            </div>
          </section>

          <section style={S.contactCard}>
            <span style={S.contactEyebrow}>
              CONTACTO
            </span>

            <div style={S.contactRows}>
              <Fila
                label="Teléfono"
                value={cuenta?.telefono || "-"}
              />

              <Fila
                label="Correo"
                value={cuenta?.correo || "-"}
              />
            </div>
          </section>

          <footer style={S.footer}>
            <button
              type="button"
              onClick={cerrarSesion}
              style={S.logoutButton}
            >
              Cerrar sesión
            </button>

            <div style={S.secureText}>
              <span>
                🔒 Acceso seguro
              </span>

              <span>KONAX</span>
            </div>

            <span style={S.version}>
              {VERSION}
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
}) {
  return (
    <div style={S.metricCard}>
      <span style={S.metricLabel}>
        {label}
      </span>

      <strong style={S.metricValue}>
        {value}
      </strong>
    </div>
  );
}

function Dato({
  label,
  value,
  destacado = false,
}) {
  return (
    <div
      style={{
        ...S.dataCard,
        ...(destacado
          ? S.dataCardHighlight
          : {}),
      }}
    >
      <span style={S.dataLabel}>
        {label}
      </span>

      <strong style={S.dataValue}>
        {value}
      </strong>
    </div>
  );
}

function Paso({
  numero,
  texto,
}) {
  return (
    <div style={S.step}>
      <span style={S.stepNumber}>
        {numero}
      </span>

      <span style={S.stepText}>
        {texto}
      </span>
    </div>
  );
}

function Fila({
  label,
  value,
}) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>
        {label}
      </span>

      <strong style={S.rowValue}>
        {value}
      </strong>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at top right,rgba(6,182,212,.16),transparent 30%),radial-gradient(circle at bottom left,rgba(37,99,235,.12),transparent 32%),linear-gradient(180deg,#0B1220 0%,#111A2E 100%)",
    color: "#0F172A",
    fontFamily:
      'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  },

  shell: {
    width: "min(720px,100%)",
    overflow: "hidden",
    border: "1px solid rgba(148,163,184,.18)",
    borderRadius: 30,
    background: "linear-gradient(180deg,#F8FBFF 0%,#F3F7FC 100%)",
    boxShadow: "0 32px 90px rgba(2,8,23,.38)",
  },

  topbar: {
    minHeight: 92,
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    background: "rgba(255,255,255,.96)",
    borderBottom: "1px solid #E2EAF4",
  },

  brandBlock: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 13,
  },

  brandMark: {
    width: 58,
    height: 58,
    overflow: "hidden",
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background: "linear-gradient(135deg,#0F172A 0%,#0B3B5B 68%,#0EA5A6 100%)",
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: 950,
    boxShadow: "0 10px 26px rgba(15,23,42,.18)",
  },

  brandLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    background: "#FFFFFF",
  },

  brandName: {
    display: "block",
    maxWidth: 310,
    overflow: "hidden",
    color: "#0F172A",
    fontSize: 18,
    fontWeight: 900,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  powered: {
    display: "block",
    marginTop: 4,
    color: "#64748B",
    fontSize: 11,
    fontWeight: 700,
  },

  refreshButton: {
    minHeight: 42,
    padding: "0 14px",
    border: "1px solid #D7E3F2",
    borderRadius: 13,
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: 12,
    fontWeight: 850,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(15,23,42,.05)",
  },

  content: {
    padding: "22px 22px 20px",
  },

  inlineError: {
    marginBottom: 14,
    padding: 13,
    border: "1px solid #F6C3BD",
    borderRadius: 14,
    background: "#FFF3F1",
    color: "#9B2C2C",
    fontSize: 12,
  },

  successMessage: {
    marginBottom: 14,
    padding: 13,
    border: "1px solid #BFE7D4",
    borderRadius: 14,
    background: "#EDFDF4",
    color: "#166534",
    fontSize: 12,
    fontWeight: 800,
  },

  memberHeader: {
    display: "grid",
    gridTemplateColumns: "82px minmax(0,1fr) auto",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    background: "linear-gradient(135deg,#0F172A 0%,#0B3B5B 52%,#0EA5A6 100%)",
    color: "#FFFFFF",
    boxShadow: "0 18px 38px rgba(15,23,42,.22)",
  },

  avatar: {
    width: 82,
    height: 82,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 24,
    background: "rgba(255,255,255,.12)",
    border: "1px solid rgba(255,255,255,.18)",
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: 950,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  memberIdentity: { minWidth: 0 },

  welcome: {
    display: "block",
    marginBottom: 3,
    color: "#BFEAF2",
    fontSize: 12,
    fontWeight: 650,
  },

  memberName: {
    margin: 0,
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 1.05,
    fontWeight: 900,
    textOverflow: "ellipsis",
  },

  memberId: {
    display: "block",
    marginTop: 7,
    color: "#C7D7E8",
    fontSize: 12,
  },

  estadoBadge: {
    minHeight: 34,
    padding: "0 12px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  estadoBadgeOk: {
    color: "#E9FFF1",
    background: "rgba(34,197,94,.16)",
    border: "1px solid rgba(134,239,172,.28)",
  },

  estadoBadgeWarning: {
    color: "#FFF7E0",
    background: "rgba(245,158,11,.16)",
    border: "1px solid rgba(253,186,116,.26)",
  },

  statusDot: { width: 8, height: 8, borderRadius: "50%" },

  profileCard: {
    marginBottom: 16,
    padding: 20,
    border: "1px solid #E2EAF4",
    borderRadius: 22,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,23,42,.04)",
  },

  profileBodySimple: { display: "grid", gap: 14 },

  profileMetrics: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  photoActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  metricCard: {
    minHeight: 82,
    padding: 14,
    display: "grid",
    alignContent: "center",
    gap: 4,
    border: "1px solid #E7EEF6",
    borderRadius: 16,
    background: "linear-gradient(180deg,#FFFFFF 0%,#F8FBFF 100%)",
  },

  metricLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: .7,
  },

  metricValue: { color: "#0F172A", fontSize: 20, fontWeight: 900 },

  selfieButton: {
    minHeight: 48,
    padding: "0 14px",
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "linear-gradient(135deg,#0F172A 0%,#0B3B5B 100%)",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "center",
  },

  galleryButton: {
    minHeight: 48,
    padding: "0 14px",
    display: "grid",
    placeItems: "center",
    border: "1px solid #D7E3F2",
    borderRadius: 14,
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: 13,
    fontWeight: 850,
    cursor: "pointer",
    textAlign: "center",
  },

  profileEditor: {
    padding: 14,
    display: "grid",
    gap: 12,
    borderRadius: 16,
    background: "#F7FAFE",
    border: "1px solid #E4EDF8",
  },

  fieldGroup: { display: "grid", gap: 6 },
  fieldLabel: { color: "#334155", fontSize: 12, fontWeight: 850 },

  input: {
    width: "100%",
    minHeight: 46,
    padding: "0 13px",
    border: "1px solid #D8E3F0",
    borderRadius: 12,
    outline: "none",
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: 14,
  },

  saveProfileButton: {
    minHeight: 46,
    border: 0,
    borderRadius: 12,
    background: "linear-gradient(135deg,#06B6D4 0%,#2563EB 100%)",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
  },

  outlineSmallButton: {
    minHeight: 38,
    padding: "0 13px",
    border: "1px solid #D8E3F0",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: 12,
    fontWeight: 850,
    cursor: "pointer",
  },

  accessBanner: {
    marginBottom: 16,
    padding: 18,
    display: "grid",
    gridTemplateColumns: "52px minmax(0,1fr)",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
  },

  accessBannerOk: {
    background: "linear-gradient(135deg,#F0FDF4 0%,#ECFEFF 100%)",
    border: "1px solid #BBF7D0",
  },

  accessBannerBlocked: {
    background: "linear-gradient(135deg,#FFF7ED 0%,#FFFBEB 100%)",
    border: "1px solid #FCD34D",
  },

  accessIcon: {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    fontSize: 23,
    fontWeight: 950,
  },

  accessIconOk: { background: "#DCFCE7", color: "#15803D" },
  accessIconBlocked: { background: "#FEF3C7", color: "#B45309" },

  accessLabel: {
    display: "block",
    color: "#64748B",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: .9,
  },

  accessTitle: {
    display: "block",
    marginTop: 3,
    color: "#0F172A",
    fontSize: 22,
    fontWeight: 900,
  },

  accessText: {
    margin: "6px 0 0",
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.55,
  },

  section: {
    marginBottom: 16,
    padding: 20,
    border: "1px solid #E2EAF4",
    borderRadius: 22,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,23,42,.04)",
  },

  sectionHeading: {
    marginBottom: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  sectionEyebrow: {
    display: "block",
    color: "#0EA5A6",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: 1.1,
  },

  sectionTitle: {
    margin: "4px 0 0",
    color: "#0F172A",
    fontSize: 29,
    lineHeight: 1.06,
    fontWeight: 900,
  },

  planChip: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#EEF6FF",
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: 900,
  },

  planHero: {
    marginBottom: 14,
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 18,
    background: "linear-gradient(135deg,#F8FBFF 0%,#EFF6FF 100%)",
    border: "1px solid #DBEAFE",
  },

  planLabel: {
    display: "block",
    color: "#64748B",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: .8,
  },

  planName: {
    display: "block",
    marginTop: 5,
    color: "#0F172A",
    fontSize: 26,
    fontWeight: 900,
  },

  planDescription: {
    margin: "7px 0 0",
    color: "#475569",
    fontSize: 12,
    lineHeight: 1.5,
  },

  planPrice: {
    color: "#0B3B5B",
    fontSize: 25,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  membershipGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
  },

  dataCard: {
    minHeight: 88,
    padding: 13,
    display: "grid",
    alignContent: "center",
    gap: 5,
    border: "1px solid #E7EEF6",
    borderRadius: 16,
    background: "#FAFCFF",
  },

  dataCardHighlight: {
    background: "linear-gradient(135deg,#ECFEFF 0%,#F0FDF4 100%)",
    border: "1px solid #B6F0EF",
  },

  dataLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: .7,
  },

  dataValue: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 1.35,
    fontWeight: 800,
  },

  emptyMembership: {
    minHeight: 140,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 8,
    textAlign: "center",
    color: "#475569",
  },

  emptyIcon: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#EFF6FF",
    color: "#2563EB",
    fontSize: 22,
  },

  qrSection: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 22,
    background: "linear-gradient(145deg,#FFFFFF 0%,#F7FBFF 100%)",
    border: "1px solid #E2EAF4",
    boxShadow: "0 10px 24px rgba(15,23,42,.04)",
  },

  qrEyebrow: {
    display: "block",
    color: "#0EA5A6",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: 1,
  },

  qrStatus: {
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: .8,
  },

  qrStatusActive: { background: "#DCFCE7", color: "#166534" },
  qrStatusInactive: { background: "#FEF3C7", color: "#92400E" },

  qrLayout: {
    display: "grid",
    gridTemplateColumns: "260px minmax(0,1fr)",
    gap: 22,
    alignItems: "center",
  },

  qrFrame: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    padding: 14,
    overflow: "hidden",
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid #E2EAF4",
    boxShadow: "0 18px 40px rgba(15,23,42,.10)",
  },

  qrImage: {
    width: "100%",
    height: "100%",
    display: "block",
    borderRadius: 14,
    objectFit: "contain",
  },

  qrBlocked: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 8,
    padding: 18,
    textAlign: "center",
    background: "rgba(255,255,255,.82)",
    color: "#78350F",
    backdropFilter: "blur(4px)",
  },

  qrBlockedIcon: { fontSize: 24 },

  noQr: {
    width: "100%",
    aspectRatio: "1 / 1",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 8,
    padding: 16,
    textAlign: "center",
    borderRadius: 24,
    background: "#F8FAFC",
    border: "1px dashed #CBD5E1",
    color: "#475569",
  },

  noQrIcon: {
    width: 56,
    height: 56,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "linear-gradient(135deg,#0F172A 0%,#2563EB 100%)",
    color: "#FFFFFF",
    fontWeight: 950,
  },

  qrInstructions: { minWidth: 0 },

  qrInstructionEyebrow: {
    color: "#0EA5A6",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: 1,
  },

  qrInstructionTitle: {
    margin: "6px 0 8px",
    color: "#0F172A",
    fontSize: 25,
    lineHeight: 1.12,
    fontWeight: 900,
  },

  qrInstructionText: {
    margin: 0,
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.55,
  },

  steps: { marginTop: 14, display: "grid", gap: 8 },

  step: {
    display: "grid",
    gridTemplateColumns: "30px minmax(0,1fr)",
    alignItems: "center",
    gap: 10,
  },

  stepNumber: {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#E0F2FE",
    color: "#0369A1",
    fontSize: 11,
    fontWeight: 950,
  },

  stepText: { color: "#334155", fontSize: 13, lineHeight: 1.4 },

  contactCard: {
    marginBottom: 16,
    padding: 18,
    border: "1px solid #E2EAF4",
    borderRadius: 20,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,23,42,.04)",
  },

  contactEyebrow: {
    display: "block",
    marginBottom: 9,
    color: "#0EA5A6",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: 1,
  },

  contactRows: { display: "grid" },

  row: {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    borderBottom: "1px solid #EFF4FA",
  },

  rowLabel: { color: "#64748B", fontSize: 13 },

  rowValue: {
    maxWidth: "65%",
    overflowWrap: "anywhere",
    color: "#0F172A",
    fontSize: 13,
    textAlign: "right",
    fontWeight: 800,
  },

  footer: {
    display: "grid",
    justifyItems: "center",
    gap: 10,
    paddingTop: 4,
  },

  logoutButton: {
    width: "100%",
    minHeight: 48,
    border: "1px solid #DCE5F1",
    borderRadius: 14,
    background: "#FFFFFF",
    color: "#334155",
    fontSize: 13,
    fontWeight: 850,
    cursor: "pointer",
  },

  secureText: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    color: "#94A3B8",
    fontSize: 10,
  },

  version: { color: "#B6C2D0", fontSize: 9 },

  loadingPage: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg,#0B1220 0%,#111A2E 100%)",
    color: "#0F172A",
    fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif',
  },

  loadingCard: {
    width: "min(410px,100%)",
    padding: 30,
    display: "grid",
    justifyItems: "center",
    gap: 11,
    border: "1px solid rgba(148,163,184,.18)",
    borderRadius: 24,
    background: "#FFFFFF",
    boxShadow: "0 20px 60px rgba(2,8,23,.30)",
  },

  loadingLogo: { width: 145, marginBottom: 6 },

  loader: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "4px solid #E2E8F0",
    borderTopColor: "#2563EB",
  },

  loadingText: { color: "#64748B", fontSize: 12 },

  errorCard: {
    width: "min(430px,100%)",
    padding: 28,
    display: "grid",
    justifyItems: "center",
    gap: 12,
    textAlign: "center",
    border: "1px solid rgba(148,163,184,.18)",
    borderRadius: 24,
    background: "#FFFFFF",
    boxShadow: "0 20px 60px rgba(2,8,23,.24)",
  },

  errorLogo: { width: 138, marginBottom: 6 },

  errorIcon: {
    width: 50,
    height: 50,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#FFF1F2",
    color: "#BE123C",
    fontSize: 22,
    fontWeight: 950,
  },

  errorTitle: { margin: 0, color: "#0F172A", fontSize: 23, fontWeight: 900 },

  errorText: {
    margin: 0,
    color: "#64748B",
    fontSize: 13,
    lineHeight: 1.5,
  },

  primaryButton: {
    width: "100%",
    minHeight: 46,
    marginTop: 4,
    border: 0,
    borderRadius: 12,
    background: "linear-gradient(135deg,#06B6D4 0%,#2563EB 100%)",
    color: "#FFFFFF",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",
    minHeight: 44,
    border: "1px solid #D8E3F0",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#334155",
    fontWeight: 850,
    cursor: "pointer",
  },
};
