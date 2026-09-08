"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabasePortalAlumno as supabase } from "../../../../lib/supabasePortalAlumno";

const VERSION = "2026.09.07-PORTAL-ALUMNO-PRO-GYM-LOGO-V1";
const BUCKET_PERFIL = "alumnos-perfil";

export default function PortalAlumnoInicio() {
  const params = useParams();
  const router = useRouter();

  const slug = String(params?.slug || "").trim();

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [cuenta, setCuenta] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [fotoFirmada, setFotoFirmada] = useState("");
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

      await resolverFoto(dataPerfil?.foto_url || "");
    } catch (err: any) {
      console.error("Error cargando portal del alumno:", err);
      setError(err?.message || "No se pudo cargar tu cuenta.");
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }

  async function resolverFoto(valor: string) {
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

      setPerfil((prev: any) => ({
        ...(prev || {}),
        peso: data?.peso ?? pesoNumero,
        estatura: data?.estatura ?? estaturaNumero,
      }));

      setMensajePerfil("Perfil actualizado.");
      setMostrarEditor(false);
    } catch (err: any) {
      console.error("Error guardando perfil:", err);
      setError(err?.message || "No se pudo guardar el perfil.");
    } finally {
      setGuardandoPerfil(false);
    }
  }

  async function subirSelfie(event: any) {
    const archivo = event?.target?.files?.[0];
    if (!archivo) return;

    setSubiendoFoto(true);
    setMensajePerfil("");
    setError("");

    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
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
        throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
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

      setPerfil((prev: any) => ({
        ...(prev || {}),
        foto_url: ruta,
      }));

      setCuenta((prev: any) => ({
        ...(prev || {}),
        foto_url: ruta,
      }));

      await resolverFoto(ruta);

      setMensajePerfil("Foto actualizada.");
    } catch (err: any) {
      console.error("Error subiendo selfie:", err);
      setError(err?.message || "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);

      if (event?.target) {
        event.target.value = "";
      }
    }
  }

  function formatearFecha(fecha: string) {
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

  function formatearDinero(valor: any) {
    const numero = Number(valor || 0);

    if (!Number.isFinite(numero)) return "$0.00";

    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(numero);
  }

  const membresia = cuenta?.membresia || null;
  const qrToken = String(cuenta?.qr_token || "").trim();

  const qrDisponible = Boolean(cuenta?.qr_disponible && qrToken);
  const accesoPermitido = Boolean(cuenta?.acceso_permitido);

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

  const inicialEmpresa = useMemo(() => {
    return String(cuenta?.empresa_nombre || "G")
      .charAt(0)
      .toUpperCase();
  }, [cuenta?.empresa_nombre]);

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
          background: #07141a;
        }

        input {
          font: inherit;
        }

        @media (max-width: 720px) {
          .portal-shell {
            min-height: 100vh !important;
            border-radius: 0 !important;
            width: 100% !important;
          }

          .portal-content {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .portal-topbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .topbar-actions {
            width: 100% !important;
          }

          .topbar-actions button {
            width: 100% !important;
          }

          .hero-grid {
            grid-template-columns: 1fr !important;
          }

          .member-grid {
            grid-template-columns: 72px minmax(0, 1fr) !important;
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

          .qr-frame {
            max-width: 320px !important;
            margin: 0 auto !important;
          }
        }

        @media (max-width: 430px) {
          .profile-metrics,
          .membership-grid,
          .photo-actions {
            grid-template-columns: 1fr !important;
          }

          .member-name-mobile {
            font-size: 24px !important;
          }

          .hero-title-mobile {
            font-size: 18px !important;
          }
        }
      `}</style>

      <section style={S.shell} className="portal-shell">
        <header style={S.topbar} className="portal-topbar">
          <div style={S.topbarLeft}>
            <div style={S.brandLogoWrap}>
              {cuenta?.empresa_logo_url ? (
                <img
                  src={cuenta.empresa_logo_url}
                  alt={cuenta?.empresa_nombre || "Gimnasio"}
                  style={S.brandLogo}
                />
              ) : (
                <span style={S.brandFallback}>{inicialEmpresa}</span>
              )}
            </div>

            <div style={S.brandTexts}>
              <span style={S.brandEyebrow}>PORTAL DEL ALUMNO</span>
              <strong style={S.brandName}>
                {cuenta?.empresa_nombre || "Gimnasio"}
              </strong>
              <span style={S.powered}>Experiencia digital impulsada por KONAX</span>
            </div>
          </div>

          <div className="topbar-actions" style={S.topbarActions}>
            <button
              type="button"
              onClick={() => cargarTodo(true)}
              disabled={actualizando}
              style={S.refreshButton}
            >
              {actualizando ? "Actualizando..." : "↻ Actualizar"}
            </button>
          </div>
        </header>

        <div style={S.content} className="portal-content">
          {error && (
            <div style={S.inlineError}>
              <strong>Atención:</strong> {error}
            </div>
          )}

          {mensajePerfil && (
            <div style={S.successMessage}>{mensajePerfil}</div>
          )}

          <section style={S.heroPanel} className="hero-grid">
            <div style={S.heroGymCard}>
              <div style={S.heroGymTop}>
                <div style={S.heroGymLogoBox}>
                  {cuenta?.empresa_logo_url ? (
                    <img
                      src={cuenta.empresa_logo_url}
                      alt={cuenta?.empresa_nombre || "Gimnasio"}
                      style={S.heroGymLogo}
                    />
                  ) : (
                    <span style={S.heroGymLogoFallback}>
                      {inicialEmpresa}
                    </span>
                  )}
                </div>

                <div style={S.heroGymTexts}>
                  <span style={S.heroGymEyebrow}>TU GIMNASIO</span>
                  <h2 style={S.heroGymName} className="hero-title-mobile">
                    {cuenta?.empresa_nombre || "Gimnasio"}
                  </h2>
                  <p style={S.heroGymSub}>
                    Administra tu perfil, tu membresía y tu acceso desde un solo lugar.
                  </p>
                </div>
              </div>

              <div style={S.heroGymStats}>
                <div style={S.heroMiniStat}>
                  <span style={S.heroMiniLabel}>Estado</span>
                  <strong style={S.heroMiniValue}>
                    {accesoPermitido ? "Habilitado" : "Pendiente"}
                  </strong>
                </div>

                <div style={S.heroMiniStat}>
                  <span style={S.heroMiniLabel}>Plan</span>
                  <strong style={S.heroMiniValue}>
                    {membresia?.plan || "Sin plan"}
                  </strong>
                </div>

                <div style={S.heroMiniStat}>
                  <span style={S.heroMiniLabel}>Vigencia</span>
                  <strong style={S.heroMiniValue}>
                    {cuenta?.dias_restantes === null || cuenta?.dias_restantes === undefined
                      ? "-"
                      : cuenta.dias_restantes < 0
                      ? "Vencida"
                      : `${cuenta.dias_restantes} días`}
                  </strong>
                </div>
              </div>
            </div>

            <section style={S.memberHeader} className="member-grid">
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
                <span style={S.welcome}>Hola,</span>

                <h1 style={S.memberName} className="member-name-mobile">
                  {cuenta?.nombre}
                </h1>

                <span style={S.memberId}>
                  {cuenta?.cedula ? `ID ${cuenta.cedula}` : "Miembro KONAX"}
                </span>
              </div>

              <div
                style={{
                  ...S.estadoBadge,
                  ...(accesoPermitido ? S.estadoBadgeOk : S.estadoBadgeWarning),
                }}
                className="member-status"
              >
                <span
                  style={{
                    ...S.statusDot,
                    background: accesoPermitido ? "#22C55E" : "#F59E0B",
                  }}
                />
                {estadoVisual}
              </div>
            </section>
          </section>

          <section style={S.profileCard}>
            <div style={S.sectionHeading}>
              <div>
                <span style={S.sectionEyebrow}>MI PERFIL</span>
                <h2 style={S.sectionTitle}>Datos personales</h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarEditor((valor) => !valor)}
                style={S.outlineSmallButton}
              >
                {mostrarEditor ? "Cerrar" : "Editar perfil"}
              </button>
            </div>

            <div style={S.profileBodySimple}>
              <div style={S.profileMetrics} className="profile-metrics">
                <Metric label="Peso" value={pesoVisual} />
                <Metric label="Estatura" value={estaturaVisual} />
              </div>

              <div style={S.photoActions} className="photo-actions">
                <label style={S.selfieButton}>
                  {subiendoFoto ? "Subiendo..." : "📷 Tomar selfie"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    onChange={subirSelfie}
                    disabled={subiendoFoto}
                    style={{ display: "none" }}
                  />
                </label>

                <label style={S.galleryButton}>
                  Elegir foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={subirSelfie}
                    disabled={subiendoFoto}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {mostrarEditor && (
                <div style={S.profileEditor}>
                  <div style={S.fieldGroup}>
                    <label style={S.fieldLabel}>Peso (kg)</label>
                    <input
                      value={peso}
                      onChange={(e) => setPeso(e.target.value)}
                      inputMode="decimal"
                      placeholder="Ej. 82.5"
                      style={S.input}
                    />
                  </div>

                  <div style={S.fieldGroup}>
                    <label style={S.fieldLabel}>Estatura (m)</label>
                    <input
                      value={estatura}
                      onChange={(e) => setEstatura(e.target.value)}
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
                    {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section
            style={{
              ...S.accessBanner,
              ...(accesoPermitido ? S.accessBannerOk : S.accessBannerBlocked),
            }}
          >
            <div
              style={{
                ...S.accessIcon,
                ...(accesoPermitido ? S.accessIconOk : S.accessIconBlocked),
              }}
            >
              {accesoPermitido ? "✓" : "!"}
            </div>

            <div>
              <span style={S.accessLabel}>ESTADO DE ACCESO</span>
              <strong style={S.accessTitle}>
                {accesoPermitido ? "Acceso disponible" : "Acceso no disponible"}
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
                <span style={S.sectionEyebrow}>TU PLAN</span>
                <h2 style={S.sectionTitle}>Membresía</h2>
              </div>

              {membresia && (
                <span style={S.planChip}>
                  {membresia.periodicidad || "Membresía"}
                </span>
              )}
            </div>

            {membresia ? (
              <>
                <div style={S.planHero}>
                  <div>
                    <span style={S.planLabel}>PLAN ACTUAL</span>
                    <strong style={S.planName}>
                      {membresia.plan || "Membresía"}
                    </strong>

                    {membresia.descripcion && (
                      <p style={S.planDescription}>
                        {membresia.descripcion}
                      </p>
                    )}
                  </div>

                  <strong style={S.planPrice}>
                    {formatearDinero(membresia.precio)}
                  </strong>
                </div>

                <div style={S.membershipGrid} className="membership-grid">
                  <Dato
                    label="Inicio"
                    value={formatearFecha(membresia.fecha_inicio)}
                  />

                  <Dato
                    label="Vencimiento"
                    value={formatearFecha(membresia.fecha_vencimiento)}
                    destacado
                  />

                  <Dato label="Estado" value={estadoVisual} />

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
                            cuenta.dias_restantes === 1 ? "" : "s"
                          }`
                    }
                  />
                </div>
              </>
            ) : (
              <div style={S.emptyMembership}>
                <div style={S.emptyIcon}>◇</div>
                <strong>Sin membresía registrada</strong>
                <span>Comunícate con recepción para activar un plan.</span>
              </div>
            )}
          </section>

          <section style={S.qrSection}>
            <div style={S.sectionHeading}>
              <div>
                <span style={S.qrEyebrow}>ACCESO DIGITAL</span>
                <h2 style={S.sectionTitle}>Mi código QR</h2>
              </div>

              <span
                style={{
                  ...S.qrStatus,
                  ...(accesoPermitido ? S.qrStatusActive : S.qrStatusInactive),
                }}
              >
                {accesoPermitido ? "ACTIVO" : "NO DISPONIBLE"}
              </span>
            </div>

            <div style={S.qrLayout} className="qr-layout">
              {qrDisponible ? (
                <div
                  style={{
                    ...S.qrFrame,
                    opacity: accesoPermitido ? 1 : 0.45,
                  }}
                  className="qr-frame"
                >
                  <img
                    src={qrUrl}
                    alt="Mi código QR de acceso"
                    style={S.qrImage}
                  />

                  {!accesoPermitido && (
                    <div style={S.qrBlocked}>
                      <span style={S.qrBlockedIcon}>🔒</span>
                      <strong>Acceso temporalmente bloqueado</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div style={S.noQr}>
                  <span style={S.noQrIcon}>QR</span>
                  <strong>QR no disponible</strong>
                  <span>Solicita a recepción que actualice tu ficha.</span>
                </div>
              )}

              <div style={S.qrInstructions}>
                <span style={S.qrInstructionEyebrow}>CÓMO INGRESAR</span>

                <h3 style={S.qrInstructionTitle}>
                  Muestra este código en recepción
                </h3>

                <p style={S.qrInstructionText}>
                  El personal escaneará tu QR desde el módulo Check-in de KONAX.
                </p>

                <div style={S.steps}>
                  <Paso numero="1" texto="Abre tu Portal del Alumno." />
                  <Paso numero="2" texto="Muestra este QR en recepción." />
                  <Paso
                    numero="3"
                    texto="KONAX valida tu membresía y registra tu entrada."
                  />
                </div>
              </div>
            </div>
          </section>

          <section style={S.contactCard}>
            <span style={S.contactEyebrow}>CONTACTO</span>

            <div style={S.contactRows}>
              <Fila label="Teléfono" value={cuenta?.telefono || "-"} />
              <Fila label="Correo" value={cuenta?.correo || "-"} />
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
              <span>🔒 Acceso seguro</span>
              <span>KONAX</span>
            </div>

            <span style={S.version}>{VERSION}</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.metricCard}>
      <span style={S.metricLabel}>{label}</span>
      <strong style={S.metricValue}>{value}</strong>
    </div>
  );
}

function Dato({
  label,
  value,
  destacado = false,
}: {
  label: string;
  value: string;
  destacado?: boolean;
}) {
  return (
    <div
      style={{
        ...S.dataCard,
        ...(destacado ? S.dataCardHighlight : {}),
      }}
    >
      <span style={S.dataLabel}>{label}</span>
      <strong style={S.dataValue}>{value}</strong>
    </div>
  );
}

function Paso({
  numero,
  texto,
}: {
  numero: string;
  texto: string;
}) {
  return (
    <div style={S.step}>
      <span style={S.stepNumber}>{numero}</span>
      <span style={S.stepText}>{texto}</span>
    </div>
  );
}

function Fila({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <strong style={S.rowValue}>{value}</strong>
    </div>
  );
}

const S: Record<string, any> = {
  page: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 26%), radial-gradient(circle at bottom right, rgba(59,130,246,.10), transparent 24%), linear-gradient(180deg,#07141A 0%,#0B1F27 100%)",
    color: "#E8F2F0",
    fontFamily:
      'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  },

  shell: {
    width: "min(760px,100%)",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 30,
    background: "rgba(9,24,30,.92)",
    boxShadow: "0 30px 90px rgba(0,0,0,.35)",
    backdropFilter: "blur(8px)",
  },

  topbar: {
    minHeight: 92,
    padding: "18px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    background:
      "linear-gradient(135deg, rgba(8,22,28,.96) 0%, rgba(10,35,43,.95) 100%)",
    borderBottom: "1px solid rgba(255,255,255,.07)",
  },

  topbarLeft: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  brandLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg,#0F766E,#155E75)",
    boxShadow: "0 10px 24px rgba(0,0,0,.24)",
    border: "1px solid rgba(255,255,255,.08)",
    flex: "0 0 auto",
  },

  brandLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    background: "#FFFFFF",
  },

  brandFallback: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: 900,
  },

  brandTexts: {
    minWidth: 0,
    display: "grid",
    gap: 3,
  },

  brandEyebrow: {
    color: "#7DD3C7",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.1,
  },

  brandName: {
    display: "block",
    color: "#F7FAFC",
    fontSize: 21,
    fontWeight: 900,
    lineHeight: 1.1,
  },

  powered: {
    display: "block",
    color: "#9DB2B8",
    fontSize: 12,
  },

  topbarActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  refreshButton: {
    minHeight: 44,
    padding: "0 16px",
    border: "1px solid rgba(125,211,199,.28)",
    borderRadius: 14,
    background: "rgba(18,46,56,.95)",
    color: "#D9F5F0",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.04)",
  },

  content: {
    padding: "20px 20px 18px",
  },

  inlineError: {
    marginBottom: 14,
    padding: 13,
    border: "1px solid rgba(248,113,113,.28)",
    borderRadius: 14,
    background: "rgba(127,29,29,.18)",
    color: "#FECACA",
    fontSize: 13,
  },

  successMessage: {
    marginBottom: 14,
    padding: 13,
    border: "1px solid rgba(52,211,153,.22)",
    borderRadius: 14,
    background: "rgba(6,95,70,.22)",
    color: "#CFFAE8",
    fontSize: 13,
    fontWeight: 700,
  },

  heroPanel: {
    display: "grid",
    gridTemplateColumns: "1.1fr .9fr",
    gap: 16,
    marginBottom: 16,
  },

  heroGymCard: {
    padding: 18,
    borderRadius: 24,
    background:
      "linear-gradient(145deg, rgba(10,30,37,1) 0%, rgba(12,49,57,1) 58%, rgba(11,89,95,1) 100%)",
    border: "1px solid rgba(255,255,255,.06)",
    boxShadow: "0 18px 40px rgba(0,0,0,.22)",
  },

  heroGymTop: {
    display: "grid",
    gridTemplateColumns: "82px minmax(0,1fr)",
    gap: 14,
    alignItems: "center",
  },

  heroGymLogoBox: {
    width: 82,
    height: 82,
    borderRadius: 22,
    overflow: "hidden",
    background: "#FFFFFF",
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,.08)",
    boxShadow: "0 10px 30px rgba(0,0,0,.24)",
  },

  heroGymLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  heroGymLogoFallback: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: 900,
  },

  heroGymTexts: {
    minWidth: 0,
  },

  heroGymEyebrow: {
    display: "block",
    color: "#7DD3C7",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.1,
    marginBottom: 4,
  },

  heroGymName: {
    margin: 0,
    color: "#F8FBFC",
    fontSize: 26,
    lineHeight: 1.1,
  },

  heroGymSub: {
    margin: "8px 0 0",
    color: "#B7CBD1",
    fontSize: 13,
    lineHeight: 1.5,
  },

  heroGymStats: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 10,
  },

  heroMiniStat: {
    padding: 12,
    borderRadius: 16,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.05)",
  },

  heroMiniLabel: {
    display: "block",
    color: "#9FC2C9",
    fontSize: 11,
    marginBottom: 6,
  },

  heroMiniValue: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 1.25,
  },

  memberHeader: {
    display: "grid",
    gridTemplateColumns: "76px minmax(0,1fr) auto",
    gap: 14,
    alignItems: "center",
    padding: 18,
    borderRadius: 24,
    background:
      "linear-gradient(145deg, rgba(17,24,39,.98) 0%, rgba(30,41,59,.96) 100%)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,.06)",
    boxShadow: "0 18px 40px rgba(0,0,0,.22)",
  },

  avatar: {
    width: 76,
    height: 76,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 22,
    background: "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.14)",
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: 950,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  memberIdentity: {
    minWidth: 0,
  },

  welcome: {
    display: "block",
    marginBottom: 4,
    color: "#94E7DB",
    fontSize: 12,
  },

  memberName: {
    margin: 0,
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 1.06,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  memberId: {
    display: "block",
    marginTop: 8,
    color: "#A5B8C7",
    fontSize: 12,
  },

  estadoBadge: {
    minHeight: 36,
    padding: "0 14px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  estadoBadgeOk: {
    color: "#D1FAE5",
    background: "rgba(34,197,94,.14)",
    border: "1px solid rgba(34,197,94,.24)",
  },

  estadoBadgeWarning: {
    color: "#FEF3C7",
    background: "rgba(245,158,11,.14)",
    border: "1px solid rgba(245,158,11,.24)",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
  },

  profileCard: {
    marginBottom: 16,
    padding: 18,
    border: "1px solid rgba(255,255,255,.06)",
    borderRadius: 22,
    background: "rgba(255,255,255,.03)",
    boxShadow: "0 16px 32px rgba(0,0,0,.14)",
  },

  profileBodySimple: {
    display: "grid",
    gap: 14,
  },

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
    minHeight: 84,
    padding: 15,
    display: "grid",
    alignContent: "center",
    gap: 4,
    border: "1px solid rgba(255,255,255,.07)",
    borderRadius: 16,
    background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025))",
  },

  metricLabel: {
    color: "#8DA6AD",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  metricValue: {
    color: "#F1F7F8",
    fontSize: 21,
    lineHeight: 1.2,
  },

  selfieButton: {
    minHeight: 48,
    padding: "0 14px",
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "linear-gradient(135deg,#14B8A6,#0F766E)",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "center",
    boxShadow: "0 10px 24px rgba(20,184,166,.24)",
  },

  galleryButton: {
    minHeight: 48,
    padding: "0 14px",
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 14,
    background: "rgba(255,255,255,.04)",
    color: "#D5E5E9",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "center",
  },

  profileEditor: {
    padding: 14,
    display: "grid",
    gap: 12,
    borderRadius: 16,
    background: "rgba(255,255,255,.04)",
    border: "1px solid rgba(255,255,255,.06)",
  },

  fieldGroup: {
    display: "grid",
    gap: 7,
  },

  fieldLabel: {
    color: "#B4C3C8",
    fontSize: 12,
    fontWeight: 700,
  },

  input: {
    width: "100%",
    minHeight: 44,
    padding: "0 12px",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 12,
    outline: "none",
    background: "rgba(5,15,20,.45)",
    color: "#F8FBFC",
    fontSize: 14,
  },

  saveProfileButton: {
    minHeight: 46,
    border: 0,
    borderRadius: 14,
    background: "linear-gradient(135deg,#2563EB,#0EA5E9)",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(37,99,235,.22)",
  },

  outlineSmallButton: {
    minHeight: 38,
    padding: "0 12px",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 12,
    background: "rgba(255,255,255,.04)",
    color: "#D8E5E8",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },

  accessBanner: {
    marginBottom: 16,
    padding: 16,
    display: "grid",
    gridTemplateColumns: "54px minmax(0,1fr)",
    alignItems: "center",
    gap: 13,
    borderRadius: 20,
  },

  accessBannerOk: {
    background: "rgba(16,185,129,.10)",
    border: "1px solid rgba(16,185,129,.18)",
  },

  accessBannerBlocked: {
    background: "rgba(245,158,11,.10)",
    border: "1px solid rgba(245,158,11,.18)",
  },

  accessIcon: {
    width: 54,
    height: 54,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    fontSize: 22,
    fontWeight: 950,
  },

  accessIconOk: {
    background: "rgba(34,197,94,.16)",
    color: "#6EE7B7",
  },

  accessIconBlocked: {
    background: "rgba(245,158,11,.16)",
    color: "#FCD34D",
  },

  accessLabel: {
    display: "block",
    color: "#9CB3B8",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1,
  },

  accessTitle: {
    display: "block",
    marginTop: 3,
    color: "#F4FAFB",
    fontSize: 22,
    lineHeight: 1.2,
  },

  accessText: {
    margin: "5px 0 0",
    color: "#B7C8CD",
    fontSize: 14,
    lineHeight: 1.5,
  },

  section: {
    marginBottom: 16,
    padding: 18,
    border: "1px solid rgba(255,255,255,.06)",
    borderRadius: 22,
    background: "rgba(255,255,255,.03)",
    boxShadow: "0 16px 32px rgba(0,0,0,.12)",
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
    color: "#67E8F9",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.1,
  },

  sectionTitle: {
    margin: "5px 0 0",
    color: "#F5FBFC",
    fontSize: 28,
    lineHeight: 1.1,
  },

  planChip: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(20,184,166,.14)",
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: 900,
  },

  planHero: {
    marginBottom: 14,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 18,
    background:
      "linear-gradient(135deg, rgba(20,184,166,.08), rgba(59,130,246,.08))",
    border: "1px solid rgba(255,255,255,.05)",
  },

  planLabel: {
    display: "block",
    color: "#A1B3B8",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.9,
  },

  planName: {
    display: "block",
    marginTop: 5,
    color: "#F4FBFC",
    fontSize: 24,
    lineHeight: 1.2,
  },

  planDescription: {
    margin: "5px 0 0",
    color: "#B1C2C8",
    fontSize: 13,
    lineHeight: 1.45,
  },

  planPrice: {
    color: "#67E8F9",
    fontSize: 24,
    whiteSpace: "nowrap",
  },

  membershipGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
  },

  dataCard: {
    minHeight: 86,
    padding: 13,
    display: "grid",
    alignContent: "center",
    gap: 5,
    border: "1px solid rgba(255,255,255,.06)",
    borderRadius: 15,
    background: "rgba(255,255,255,.025)",
  },

  dataCardHighlight: {
    background: "rgba(20,184,166,.08)",
    border: "1px solid rgba(20,184,166,.16)",
  },

  dataLabel: {
    color: "#95AAB0",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  dataValue: {
    color: "#F4FBFC",
    fontSize: 15,
    lineHeight: 1.35,
  },

  emptyMembership: {
    minHeight: 150,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 8,
    textAlign: "center",
    color: "#C4D1D5",
  },

  emptyIcon: {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "rgba(255,255,255,.06)",
    color: "#67E8F9",
    fontSize: 24,
  },

  qrSection: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 22,
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(255,255,255,.06)",
    boxShadow: "0 16px 32px rgba(0,0,0,.12)",
  },

  qrEyebrow: {
    display: "block",
    color: "#67E8F9",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1,
  },

  qrStatus: {
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.8,
  },

  qrStatusActive: {
    background: "rgba(34,197,94,.14)",
    color: "#BBF7D0",
  },

  qrStatusInactive: {
    background: "rgba(245,158,11,.14)",
    color: "#FDE68A",
  },

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
    border: "1px solid rgba(255,255,255,.06)",
    boxShadow: "0 18px 36px rgba(0,0,0,.16)",
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
    background: "rgba(255,255,255,.80)",
    color: "#6B4D16",
    backdropFilter: "blur(3px)",
  },

  qrBlockedIcon: {
    fontSize: 26,
  },

  noQr: {
    width: "100%",
    aspectRatio: "1 / 1",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 8,
    padding: 18,
    textAlign: "center",
    borderRadius: 24,
    background: "rgba(255,255,255,.04)",
    border: "1px dashed rgba(255,255,255,.18)",
    color: "#C3D0D5",
  },

  noQrIcon: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "linear-gradient(135deg,#0F766E,#2563EB)",
    color: "#FFFFFF",
    fontWeight: 950,
  },

  qrInstructions: {
    minWidth: 0,
  },

  qrInstructionEyebrow: {
    color: "#67E8F9",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1,
  },

  qrInstructionTitle: {
    margin: "6px 0 8px",
    color: "#F5FBFC",
    fontSize: 24,
    lineHeight: 1.18,
  },

  qrInstructionText: {
    margin: 0,
    color: "#B6C8CD",
    fontSize: 14,
    lineHeight: 1.55,
  },

  steps: {
    marginTop: 14,
    display: "grid",
    gap: 10,
  },

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
    background: "rgba(20,184,166,.14)",
    color: "#8EF2E2",
    fontSize: 12,
    fontWeight: 950,
  },

  stepText: {
    color: "#D3E2E6",
    fontSize: 14,
    lineHeight: 1.4,
  },

  contactCard: {
    marginBottom: 16,
    padding: 18,
    border: "1px solid rgba(255,255,255,.06)",
    borderRadius: 22,
    background: "rgba(255,255,255,.03)",
  },

  contactEyebrow: {
    display: "block",
    marginBottom: 8,
    color: "#67E8F9",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1,
  },

  contactRows: {
    display: "grid",
  },

  row: {
    minHeight: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    borderBottom: "1px solid rgba(255,255,255,.06)",
  },

  rowLabel: {
    color: "#9BB0B6",
    fontSize: 14,
  },

  rowValue: {
    maxWidth: "65%",
    overflowWrap: "anywhere",
    color: "#F1FAFB",
    fontSize: 14,
    textAlign: "right",
  },

  footer: {
    display: "grid",
    justifyItems: "center",
    gap: 12,
    paddingTop: 2,
  },

  logoutButton: {
    width: "100%",
    minHeight: 48,
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 14,
    background: "rgba(255,255,255,.04)",
    color: "#D5E5E9",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },

  secureText: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    color: "#91A7AE",
    fontSize: 11,
  },

  version: {
    color: "#738890",
    fontSize: 10,
  },

  loadingPage: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg,#07141A,#0B1F27)",
    color: "#EAF5F6",
    fontFamily:
      'Inter,ui-sans-serif,system-ui,sans-serif',
  },

  loadingCard: {
    width: "min(390px,100%)",
    padding: 30,
    display: "grid",
    justifyItems: "center",
    gap: 12,
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 24,
    background: "rgba(255,255,255,.05)",
    boxShadow: "0 20px 60px rgba(0,0,0,.24)",
  },

  loadingLogo: {
    width: 140,
    marginBottom: 6,
  },

  loader: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "4px solid rgba(255,255,255,.16)",
    borderTopColor: "#67E8F9",
  },

  loadingText: {
    color: "#A8BDC2",
    fontSize: 13,
  },

  errorCard: {
    width: "min(420px,100%)",
    padding: 28,
    display: "grid",
    justifyItems: "center",
    gap: 12,
    textAlign: "center",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 24,
    background: "rgba(255,255,255,.05)",
    boxShadow: "0 20px 60px rgba(0,0,0,.24)",
  },

  errorLogo: {
    width: 135,
    marginBottom: 6,
  },

  errorIcon: {
    width: 50,
    height: 50,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "rgba(239,68,68,.14)",
    color: "#FCA5A5",
    fontSize: 22,
    fontWeight: 950,
  },

  errorTitle: {
    margin: 0,
    color: "#F4FAFB",
    fontSize: 24,
  },

  errorText: {
    margin: 0,
    color: "#B3C4C8",
    fontSize: 14,
    lineHeight: 1.5,
  },

  primaryButton: {
    width: "100%",
    minHeight: 46,
    marginTop: 4,
    border: 0,
    borderRadius: 12,
    background: "linear-gradient(135deg,#14B8A6,#0F766E)",
    color: "#FFFFFF",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",
    minHeight: 44,
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 12,
    background: "rgba(255,255,255,.04)",
    color: "#E4EEF0",
    fontWeight: 800,
    cursor: "pointer",
  },
};
