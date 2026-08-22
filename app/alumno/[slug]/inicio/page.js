"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabasePortalAlumno as supabase } from "../../../../lib/supabasePortalAlumno";

const VERSION = "2026.08.22-PORTAL-ALUMNO-QR-V1";

export default function PortalAlumnoInicio() {
  const params = useParams();
  const router = useRouter();

  const slug = String(params?.slug || "").trim();

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const [cuenta, setCuenta] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarCuenta();
  }, [slug]);

  async function cargarCuenta(modoActualizar = false) {
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

    try {
      const {
        data: { session },
        error: errorSesion,
      } = await supabase.auth.getSession();

      if (errorSesion) {
        throw errorSesion;
      }

      if (!session?.user?.id) {
        router.replace(
          `/alumno/${encodeURIComponent(slug)}`
        );

        return;
      }

      const {
        data,
        error: errorCuenta,
      } = await supabase.rpc(
        "obtener_mi_cuenta_alumno",
        {
          p_slug: slug,
        }
      );

      if (errorCuenta) {
        throw errorCuenta;
      }

      if (!data?.ok) {
        throw new Error(
          data?.mensaje ||
            "No se pudo abrir tu portal."
        );
      }

      setCuenta(data);
    } catch (err) {
      console.error(
        "Error cargando portal:",
        err
      );

      setError(
        err?.message ||
          "No se pudo cargar tu cuenta."
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }

  async function cerrarSesion() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace(
        `/alumno/${encodeURIComponent(slug)}`
      );
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return "No definida";

    try {
      return new Intl.DateTimeFormat(
        "es-PA",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      ).format(
        new Date(`${fecha}T12:00:00`)
      );
    } catch {
      return String(fecha);
    }
  }

  function formatearDinero(valor) {
    const numero = Number(valor || 0);

    if (!Number.isFinite(numero)) {
      return "$0.00";
    }

    return new Intl.NumberFormat(
      "es-PA",
      {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }
    ).format(numero);
  }

  const membresia =
    cuenta?.membresia || null;

  const qrToken =
    String(cuenta?.qr_token || "").trim();

  const qrDisponible =
    Boolean(
      cuenta?.qr_disponible &&
        qrToken
    );

  const accesoPermitido =
    Boolean(
      cuenta?.acceso_permitido
    );

  /*
    El QR contiene solamente el qr_token del alumno.
    El módulo Check-in ya puede usar ese valor para
    buscar clientes.qr_token.
  */

  const qrUrl = useMemo(() => {
    if (!qrToken) return "";

    return (
      "https://api.qrserver.com/v1/create-qr-code/" +
      `?size=700x700&margin=24&data=${encodeURIComponent(
        qrToken
      )}`
    );
  }, [qrToken]);

  const iniciales = useMemo(() => {
    const nombre =
      String(
        cuenta?.nombre || "Alumno"
      ).trim();

    const partes =
      nombre.split(/\s+/).filter(Boolean);

    return partes
      .slice(0, 2)
      .map((parte) =>
        parte.charAt(0).toUpperCase()
      )
      .join("");
  }, [cuenta?.nombre]);

  function estiloEstado() {
    if (accesoPermitido) {
      return {
        ...S.statusBadge,
        ...S.statusOk,
      };
    }

    const estado =
      String(
        cuenta?.membresia_estado_visual ||
          ""
      ).toLowerCase();

    if (
      estado.includes("pendiente") ||
      estado.includes("vence")
    ) {
      return {
        ...S.statusBadge,
        ...S.statusWarning,
      };
    }

    return {
      ...S.statusBadge,
      ...S.statusDanger,
    };
  }

  if (cargando) {
    return (
      <main style={S.loadingPage}>
        <div style={S.loadingCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={S.loadingLogo}
          />

          <div style={S.loader} />

          <strong>
            Preparando tu membresía...
          </strong>

          <span style={S.loadingText}>
            Estamos verificando tu acceso.
          </span>
        </div>
      </main>
    );
  }

  if (error || !cuenta?.ok) {
    return (
      <main style={S.loadingPage}>
        <section style={S.errorCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={S.errorLogo}
          />

          <div style={S.errorIcon}>
            !
          </div>

          <h1 style={S.errorTitle}>
            No pudimos abrir tu portal
          </h1>

          <p style={S.errorText}>
            {error ||
              "Tu portal no está disponible."}
          </p>

          <button
            type="button"
            onClick={() =>
              cargarCuenta()
            }
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
        }

        @media (max-width: 620px) {
          .portal-main-card {
            border-radius: 0 !important;
            min-height: 100vh !important;
          }

          .portal-topbar {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .portal-content {
            padding-left: 15px !important;
            padding-right: 15px !important;
          }

          .portal-member-header {
            grid-template-columns: 58px minmax(0, 1fr) !important;
          }

          .portal-member-header-status {
            grid-column: 1 / -1 !important;
            justify-self: start !important;
          }

          .portal-membership-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .portal-qr-layout {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 390px) {
          .portal-membership-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section
        style={S.shell}
        className="portal-main-card"
      >
        {/* TOPBAR */}

        <header
          style={S.topbar}
          className="portal-topbar"
        >
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={S.logo}
          />

          <button
            type="button"
            onClick={() =>
              cargarCuenta(true)
            }
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
          {/* EMPRESA */}

          <div style={S.businessMini}>
            <div style={S.businessIcon}>
              K
            </div>

            <div style={S.businessText}>
              <span style={S.eyebrow}>
                MI MEMBRESÍA
              </span>

              <strong style={S.businessName}>
                {cuenta.empresa_nombre ||
                  "Gimnasio"}
              </strong>
            </div>
          </div>


          {/* ALUMNO */}

          <section
            style={S.memberHeader}
            className="portal-member-header"
          >
            <div style={S.avatar}>
              {cuenta.foto_url ? (
                <img
                  src={cuenta.foto_url}
                  alt={cuenta.nombre}
                  style={S.avatarImage}
                />
              ) : (
                <span>
                  {iniciales || "A"}
                </span>
              )}
            </div>

            <div style={S.memberIdentity}>
              <span style={S.welcome}>
                Hola,
              </span>

              <h1 style={S.memberName}>
                {cuenta.nombre}
              </h1>

              <span style={S.memberId}>
                {cuenta.cedula
                  ? `ID ${cuenta.cedula}`
                  : "Miembro KONAX"}
              </span>
            </div>

            <div
              style={estiloEstado()}
              className="portal-member-header-status"
            >
              <span
                style={{
                  ...S.statusDot,
                  background:
                    accesoPermitido
                      ? "#1FB36A"
                      : "#E2A72F",
                }}
              />

              {cuenta.membresia_estado_visual ||
                "Sin membresía"}
            </div>
          </section>


          {/* ESTADO GENERAL */}

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
              {accesoPermitido
                ? "✓"
                : "!"}
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


          {/* MEMBRESÍA */}

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
                  className="portal-membership-grid"
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
                    value={
                      cuenta.membresia_estado_visual ||
                      membresia.estado ||
                      "-"
                    }
                  />

                  <Dato
                    label="Tiempo restante"
                    value={
                      cuenta.dias_restantes ===
                      null ||
                      cuenta.dias_restantes ===
                        undefined
                        ? "-"
                        : cuenta.dias_restantes < 0
                        ? "Vencida"
                        : cuenta.dias_restantes ===
                          0
                        ? "Vence hoy"
                        : `${cuenta.dias_restantes} día${
                            cuenta.dias_restantes ===
                            1
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
                  Comunícate con recepción para
                  activar un plan.
                </span>
              </div>
            )}
          </section>


          {/* QR */}

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
              className="portal-qr-layout"
            >
              {qrDisponible ? (
                <div
                  style={{
                    ...S.qrFrame,
                    opacity:
                      accesoPermitido
                        ? 1
                        : 0.35,
                  }}
                >
                  <img
                    src={qrUrl}
                    alt="Mi código QR de acceso"
                    style={S.qrImage}
                  />

                  {!accesoPermitido && (
                    <div style={S.qrBlocked}>
                      <span style={S.qrBlockedIcon}>
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
                <span style={S.qrInstructionEyebrow}>
                  CÓMO INGRESAR
                </span>

                <h3 style={S.qrInstructionTitle}>
                  Muestra este código en recepción
                </h3>

                <p style={S.qrInstructionText}>
                  Abre esta pantalla al llegar al
                  gimnasio. El personal escaneará
                  tu QR desde el módulo Check-in
                  de KONAX.
                </p>

                <div style={S.steps}>
                  <Paso
                    numero="1"
                    texto="Abre Mi membresía."
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


          {/* DATOS DE CONTACTO */}

          <section style={S.contactCard}>
            <span style={S.contactEyebrow}>
              MI PERFIL
            </span>

            <div style={S.contactRows}>
              <Fila
                label="Teléfono"
                value={
                  cuenta.telefono || "-"
                }
              />

              <Fila
                label="Correo"
                value={
                  cuenta.correo || "-"
                }
              />
            </div>
          </section>


          {/* FOOTER */}

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

              <span>
                KONAX
              </span>
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
      "radial-gradient(circle at top right,rgba(22,131,79,.13),transparent 35%),radial-gradient(circle at bottom left,rgba(15,85,52,.08),transparent 32%),#EEF4F0",
    color: "#17211C",
    fontFamily:
      'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  },

  shell: {
    width: "min(620px,100%)",
    overflow: "hidden",
    border: "1px solid #D9E6DE",
    borderRadius: 28,
    background: "#F8FAF9",
    boxShadow:
      "0 28px 80px rgba(15,50,31,.13)",
  },

  topbar: {
    minHeight: 78,
    padding: "14px 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    background: "#FFFFFF",
    borderBottom:
      "1px solid #E7EEE9",
  },

  logo: {
    width: 130,
    maxHeight: 48,
    objectFit: "contain",
  },

  refreshButton: {
    minHeight: 36,
    padding: "0 12px",
    border: "1px solid #DCE6E0",
    borderRadius: 10,
    background: "#F8FAF9",
    color: "#426050",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  content: {
    padding: "22px 22px 18px",
  },

  businessMini: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    marginBottom: 17,
  },

  businessIcon: {
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "#163D29",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 950,
  },

  businessText: {
    display: "grid",
    gap: 1,
  },

  eyebrow: {
    color: "#16834F",
    fontSize: 7.5,
    fontWeight: 950,
    letterSpacing: 1.2,
  },

  businessName: {
    color: "#31483A",
    fontSize: 12,
  },

  memberHeader: {
    display: "grid",
    gridTemplateColumns:
      "68px minmax(0,1fr) auto",
    gap: 13,
    alignItems: "center",
    marginBottom: 15,
    padding: 18,
    borderRadius: 20,
    background:
      "linear-gradient(135deg,#173C2A 0%,#11633C 100%)",
    color: "#FFFFFF",
    boxShadow:
      "0 14px 30px rgba(23,60,42,.17)",
  },

  avatar: {
    width: 68,
    height: 68,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 20,
    background:
      "rgba(255,255,255,.13)",
    border:
      "1px solid rgba(255,255,255,.18)",
    color: "#FFFFFF",
    fontSize: 21,
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
    marginBottom: 2,
    color: "#B9DDC8",
    fontSize: 10,
  },

  memberName: {
    margin: 0,
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 23,
    lineHeight: 1.08,
    textOverflow: "ellipsis",
  },

  memberId: {
    display: "block",
    marginTop: 5,
    color: "#B9D2C3",
    fontSize: 9,
  },

  statusBadge: {
    minHeight: 30,
    padding: "0 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  statusOk: {
    color: "#D9FFE8",
    background:
      "rgba(77,210,132,.16)",
    border:
      "1px solid rgba(137,236,176,.21)",
  },

  statusWarning: {
    color: "#FFF0C4",
    background:
      "rgba(242,181,61,.15)",
    border:
      "1px solid rgba(255,217,137,.20)",
  },

  statusDanger: {
    color: "#FFE0DE",
    background:
      "rgba(223,80,73,.17)",
    border:
      "1px solid rgba(255,170,164,.20)",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
  },

  accessBanner: {
    marginBottom: 15,
    padding: 15,
    display: "grid",
    gridTemplateColumns:
      "42px minmax(0,1fr)",
    alignItems: "center",
    gap: 11,
    borderRadius: 16,
  },

  accessBannerOk: {
    background: "#EAF8F0",
    border: "1px solid #C5E9D3",
  },

  accessBannerBlocked: {
    background: "#FFF5E6",
    border: "1px solid #F0D9AB",
  },

  accessIcon: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    fontSize: 18,
    fontWeight: 950,
  },

  accessIconOk: {
    background: "#D6F2E0",
    color: "#16834F",
  },

  accessIconBlocked: {
    background: "#FFEAC5",
    color: "#A66A00",
  },

  accessLabel: {
    display: "block",
    color: "#718077",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1,
  },

  accessTitle: {
    display: "block",
    marginTop: 2,
    color: "#22372B",
    fontSize: 14,
  },

  accessText: {
    margin: "4px 0 0",
    color: "#69786F",
    fontSize: 9.5,
    lineHeight: 1.45,
  },

  section: {
    marginBottom: 15,
    padding: 18,
    border: "1px solid #DFE8E2",
    borderRadius: 19,
    background: "#FFFFFF",
  },

  sectionHeading: {
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  sectionEyebrow: {
    display: "block",
    color: "#16834F",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1.1,
  },

  sectionTitle: {
    margin: "3px 0 0",
    color: "#17251D",
    fontSize: 20,
  },

  planChip: {
    padding: "6px 9px",
    borderRadius: 999,
    background: "#EEF7F1",
    color: "#226442",
    fontSize: 8,
    fontWeight: 850,
  },

  planHero: {
    marginBottom: 12,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    background:
      "linear-gradient(135deg,#F3F9F5,#EDF6F0)",
  },

  planLabel: {
    display: "block",
    color: "#748078",
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: .9,
  },

  planName: {
    display: "block",
    marginTop: 3,
    color: "#183625",
    fontSize: 18,
  },

  planDescription: {
    margin: "4px 0 0",
    color: "#708078",
    fontSize: 9,
    lineHeight: 1.4,
  },

  planPrice: {
    color: "#16834F",
    fontSize: 17,
    whiteSpace: "nowrap",
  },

  membershipGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: 7,
  },

  dataCard: {
    minHeight: 68,
    padding: 10,
    display: "grid",
    alignContent: "center",
    gap: 4,
    border: "1px solid #E5ECE8",
    borderRadius: 12,
    background: "#FAFCFB",
  },

  dataCardHighlight: {
    background: "#F2FAF5",
    border: "1px solid #D2EBDD",
  },

  dataLabel: {
    color: "#839088",
    fontSize: 7,
    fontWeight: 850,
    textTransform: "uppercase",
  },

  dataValue: {
    color: "#31483A",
    fontSize: 9.5,
    lineHeight: 1.3,
  },

  emptyMembership: {
    minHeight: 150,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 7,
    textAlign: "center",
    color: "#67776E",
  },

  emptyIcon: {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#EDF4EF",
    color: "#16834F",
    fontSize: 22,
  },

  qrSection: {
    marginBottom: 15,
    padding: 18,
    borderRadius: 20,
    background:
      "linear-gradient(145deg,#FFFFFF 0%,#F4FAF6 100%)",
    border: "1px solid #D9E7DE",
    boxShadow:
      "0 12px 30px rgba(21,73,46,.05)",
  },

  qrEyebrow: {
    display: "block",
    color: "#16834F",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1,
  },

  qrStatus: {
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 7.5,
    fontWeight: 950,
    letterSpacing: .8,
  },

  qrStatusActive: {
    background: "#DEF5E7",
    color: "#147443",
  },

  qrStatusInactive: {
    background: "#FFF0D3",
    color: "#92600A",
  },

  qrLayout: {
    display: "grid",
    gridTemplateColumns:
      "230px minmax(0,1fr)",
    gap: 20,
    alignItems: "center",
  },

  qrFrame: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    padding: 13,
    overflow: "hidden",
    borderRadius: 22,
    background: "#FFFFFF",
    border: "1px solid #DDE7E1",
    boxShadow:
      "0 16px 36px rgba(17,62,39,.10)",
  },

  qrImage: {
    width: "100%",
    height: "100%",
    display: "block",
    borderRadius: 12,
    objectFit: "contain",
  },

  qrBlocked: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 7,
    padding: 18,
    textAlign: "center",
    background:
      "rgba(255,255,255,.78)",
    color: "#6B4D16",
    backdropFilter: "blur(3px)",
  },

  qrBlockedIcon: {
    fontSize: 24,
  },

  noQr: {
    width: "100%",
    aspectRatio: "1 / 1",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 7,
    padding: 16,
    textAlign: "center",
    borderRadius: 22,
    background: "#F1F5F2",
    border: "1px dashed #BED0C4",
    color: "#64746A",
  },

  noQrIcon: {
    width: 54,
    height: 54,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#183C2A",
    color: "#FFFFFF",
    fontWeight: 950,
  },

  qrInstructions: {
    minWidth: 0,
  },

  qrInstructionEyebrow: {
    color: "#16834F",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1,
  },

  qrInstructionTitle: {
    margin: "5px 0 7px",
    color: "#1F3428",
    fontSize: 18,
    lineHeight: 1.15,
  },

  qrInstructionText: {
    margin: 0,
    color: "#697970",
    fontSize: 9.5,
    lineHeight: 1.5,
  },

  steps: {
    marginTop: 13,
    display: "grid",
    gap: 7,
  },

  step: {
    display: "grid",
    gridTemplateColumns:
      "25px minmax(0,1fr)",
    alignItems: "center",
    gap: 7,
  },

  stepNumber: {
    width: 25,
    height: 25,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    background: "#E5F4EA",
    color: "#16834F",
    fontSize: 8,
    fontWeight: 950,
  },

  stepText: {
    color: "#51645A",
    fontSize: 9,
    lineHeight: 1.35,
  },

  contactCard: {
    marginBottom: 15,
    padding: 16,
    border: "1px solid #E1E9E4",
    borderRadius: 17,
    background: "#FFFFFF",
  },

  contactEyebrow: {
    display: "block",
    marginBottom: 7,
    color: "#16834F",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1,
  },

  contactRows: {
    display: "grid",
  },

  row: {
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    borderBottom: "1px solid #EEF2EF",
  },

  rowLabel: {
    color: "#819087",
    fontSize: 9,
  },

  rowValue: {
    maxWidth: "65%",
    overflowWrap: "anywhere",
    color: "#334A3C",
    fontSize: 9.5,
    textAlign: "right",
  },

  footer: {
    display: "grid",
    justifyItems: "center",
    gap: 10,
    paddingTop: 3,
  },

  logoutButton: {
    width: "100%",
    minHeight: 43,
    border: "1px solid #D9E3DD",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#536259",
    fontSize: 10,
    fontWeight: 850,
    cursor: "pointer",
  },

  secureText: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    color: "#95A098",
    fontSize: 7.5,
  },

  version: {
    color: "#BAC2BD",
    fontSize: 6,
  },

  loadingPage: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background: "#F1F5F2",
    color: "#284434",
    fontFamily:
      'Inter,ui-sans-serif,system-ui,sans-serif',
  },

  loadingCard: {
    width: "min(390px,100%)",
    padding: 28,
    display: "grid",
    justifyItems: "center",
    gap: 10,
    border: "1px solid #DFE7E2",
    borderRadius: 22,
    background: "#FFFFFF",
    boxShadow:
      "0 18px 50px rgba(22,50,34,.08)",
  },

  loadingLogo: {
    width: 140,
    marginBottom: 6,
  },

  loader: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: "4px solid #E1EBE5",
    borderTopColor: "#16834F",
  },

  loadingText: {
    color: "#7B887F",
    fontSize: 9,
  },

  errorCard: {
    width: "min(420px,100%)",
    padding: 27,
    display: "grid",
    justifyItems: "center",
    gap: 11,
    textAlign: "center",
    border: "1px solid #E4E9E6",
    borderRadius: 22,
    background: "#FFFFFF",
    boxShadow:
      "0 20px 60px rgba(22,44,31,.10)",
  },

  errorLogo: {
    width: 135,
    marginBottom: 6,
  },

  errorIcon: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#FFF0E8",
    color: "#B85A2A",
    fontSize: 21,
    fontWeight: 950,
  },

  errorTitle: {
    margin: 0,
    color: "#25382D",
    fontSize: 21,
  },

  errorText: {
    margin: 0,
    color: "#748078",
    fontSize: 10,
    lineHeight: 1.5,
  },

  primaryButton: {
    width: "100%",
    minHeight: 45,
    marginTop: 4,
    border: 0,
    borderRadius: 11,
    background: "#16834F",
    color: "#FFFFFF",
    fontWeight: 900,
    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",
    minHeight: 43,
    border: "1px solid #DAE4DE",
    borderRadius: 11,
    background: "#FFFFFF",
    color: "#4D5F55",
    fontWeight: 850,
    cursor: "pointer",
  },
};
