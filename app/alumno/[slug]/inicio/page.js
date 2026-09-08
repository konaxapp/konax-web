"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabasePortalAlumno as supabase } from "../../../../lib/supabasePortalAlumno";

const VERSION = "2026.09.08-PORTAL-ALUMNO-MENU-RETORNO-V7";
const BUCKET_PERFIL = "alumnos-perfil";

const MENU = [
  { id: "inicio", label: "Inicio", icon: "⌂" },
  { id: "clases", label: "Clases", icon: "▣" },
  { id: "reservas", label: "Mis reservas", icon: "◷" },
  { id: "whiteboard", label: "Whiteboard", icon: "▤" },
  { id: "resultados", label: "Resultados", icon: "▥" },
  { id: "configuracion", label: "Configuración", icon: "⚙" },
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
  const [portalPublico, setPortalPublico] = useState(null);

  const [fotoFirmada, setFotoFirmada] = useState("");
  const [mostrarEditor, setMostrarEditor] = useState(false);

  const [peso, setPeso] = useState("");
  const [estatura, setEstatura] = useState("");

  const [mensajePerfil, setMensajePerfil] = useState("");
  const [error, setError] = useState("");

  const [menuAbierto, setMenuAbierto] = useState(true);
  const [seccion, setSeccion] = useState("inicio");

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
        { data: dataPortalPublico, error: errorPortalPublico },
      ] = await Promise.all([
        supabase.rpc("obtener_mi_cuenta_alumno", {
          p_slug: slug,
        }),
        supabase.rpc("obtener_mi_perfil_alumno", {
          p_slug: slug,
        }),
        supabase.rpc("obtener_portal_alumno_publico", {
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
          dataPerfil?.mensaje || "No se pudo cargar tu configuración."
        );
      }

      setCuenta(dataCuenta);
      setPerfil(dataPerfil);

      if (!errorPortalPublico && dataPortalPublico?.ok) {
        setPortalPublico(dataPortalPublico);
      } else {
        setPortalPublico(null);
      }

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
          data?.mensaje || "No se pudo guardar la configuración."
        );
      }

      setPerfil((prev) => ({
        ...(prev || {}),
        peso: data?.peso ?? pesoNumero,
        estatura: data?.estatura ?? estaturaNumero,
      }));

      setMensajePerfil("Configuración actualizada.");
      setMostrarEditor(false);
    } catch (err) {
      console.error("Error guardando configuración:", err);
      setError(err?.message || "No se pudo guardar la configuración.");
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
        throw new Error(data?.mensaje || "No se pudo guardar la foto.");
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

  function cambiarSeccion(id) {
    setSeccion(id);

    if (id === "inicio") {
      setMenuAbierto(true);
    } else {
      setMenuAbierto(false);
    }

    window?.scrollTo?.({ top: 0, behavior: "smooth" });
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

  const empresaNombre =
    cuenta?.empresa_nombre ||
    portalPublico?.empresa_nombre ||
    portalPublico?.titulo ||
    portalPublico?.titulo_publico ||
    "Gimnasio";

  const empresaLogoUrl =
    cuenta?.empresa_logo_url ||
    cuenta?.logo_url ||
    portalPublico?.empresa_logo_url ||
    portalPublico?.logo_url ||
    portalPublico?.logo ||
    "";

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
          <img src="/konax-logo.png" alt="KONAX" style={S.loadingLogo} />
          <div style={S.loader} />
          <strong>Preparando tu portal...</strong>
          <span style={S.loadingText}>Estamos validando tu acceso.</span>
        </section>
      </main>
    );
  }

  if (error && !cuenta?.ok) {
    return (
      <main style={S.loadingPage}>
        <section style={S.errorCard}>
          <img src="/konax-logo.png" alt="KONAX" style={S.errorLogo} />
          <div style={S.errorIcon}>!</div>
          <h1 style={S.errorTitle}>No pudimos abrir tu portal</h1>
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
          background: #eef3ef;
        }

        button,
        input {
          font: inherit;
        }

        @media (max-width: 620px) {
          .portal-shell {
            width: 100% !important;
            min-height: 100vh !important;
            border-radius: 0 !important;
            border-left: 0 !important;
            border-right: 0 !important;
          }

          .portal-content {
            padding-left: 15px !important;
            padding-right: 15px !important;
            padding-bottom: 28px !important;
          }

          .desktop-nav {
            display: none !important;
          }

          .member-grid {
            grid-template-columns: 58px minmax(0, 1fr) !important;
          }

          .member-status {
            grid-column: 1 / -1 !important;
            justify-self: start !important;
          }

          .membership-grid,
          .config-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .qr-layout {
            grid-template-columns: 1fr !important;
          }

          .profile-settings-shell {
            grid-template-columns: 1fr !important;
          }

          .profile-fields-grid {
            grid-template-columns: 1fr !important;
          }

          .app-home-summary {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 390px) {
          .membership-grid,
          .config-grid,
          .photo-actions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section style={S.shell} className="portal-shell">
        <header style={S.topbar}>
          <div style={S.topUserRow}>
            <div style={S.topUserBlock}>
              <div style={S.topUserAvatar}>
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

              <div style={S.topUserText}>
                <strong style={S.topUserName}>
                  {cuenta?.nombre || "Alumno"}
                </strong>
                <span style={S.topUserState}>
                  {estadoVisual}
                </span>
              </div>
            </div>

            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMenuAbierto(true)}
              style={S.topMenuIconButton}
            >
              ☰
            </button>
          </div>
        </header>

        {menuAbierto && (
          <>
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMenuAbierto(false)}
              style={S.menuOverlay}
            />

            <aside style={S.drawer}>
              <div style={S.drawerBusiness}>
                <div style={S.drawerBusinessLogo}>
                  {empresaLogoUrl ? (
                    <img
                      src={empresaLogoUrl}
                      alt={`Logo de ${empresaNombre}`}
                      style={S.brandLogo}
                    />
                  ) : (
                    <span>
                      {String(empresaNombre || "G")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <div style={S.drawerBusinessText}>
                  <strong style={S.drawerBusinessName}>
                    {empresaNombre}
                  </strong>
                  <span style={S.drawerBusinessSub}>
                    Portal del Alumno · KONAX
                  </span>
                </div>
              </div>

              <div style={S.drawerHeader}>
                <div style={S.drawerAvatar}>
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

                <div style={{ minWidth: 0 }}>
                  <strong style={S.drawerName}>{cuenta?.nombre}</strong>
                  <span style={S.drawerState}>{estadoVisual}</span>
                </div>
              </div>

              <nav style={S.drawerNav}>
                {MENU.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => cambiarSeccion(item.id)}
                    style={{
                      ...S.drawerItem,
                      ...(seccion === item.id ? S.drawerItemActive : {}),
                    }}
                  >
                    <span style={S.drawerIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              <div style={S.drawerFooter}>
                <button
                  type="button"
                  onClick={cerrarSesion}
                  style={S.drawerLogout}
                >
                  Cerrar sesión
                </button>
              </div>
            </aside>
          </>
        )}

        <div style={S.content} className="portal-content">
          {error && (
            <div style={S.inlineError}>
              <strong>Atención:</strong> {error}
            </div>
          )}

          {mensajePerfil && (
            <div style={S.successMessage}>{mensajePerfil}</div>
          )}

          {seccion === "inicio" && (
            <Inicio />
          )}

          {seccion === "clases" && (
            <SeccionVacia
              eyebrow="ENTRENAMIENTO"
              titulo="Clases"
              texto="Aquí aparecerán las clases disponibles del gimnasio para reservar desde tu cuenta."
              icono="▦"
              accion="Volver al inicio"
              onAccion={() => cambiarSeccion("inicio")}
            />
          )}

          {seccion === "reservas" && (
            <SeccionVacia
              eyebrow="AGENDA"
              titulo="Mis reservas"
              texto="Aquí verás tus próximas clases reservadas y el historial de reservas."
              icono="◷"
              accion="Volver al inicio"
              onAccion={() => cambiarSeccion("inicio")}
            />
          )}

          {seccion === "whiteboard" && (
            <SeccionVacia
              eyebrow="COMUNIDAD"
              titulo="Whiteboard"
              texto="Aquí se mostrarán los resultados publicados por el gimnasio y los atletas del día."
              icono="▤"
              accion="Volver al inicio"
              onAccion={() => cambiarSeccion("inicio")}
            />
          )}

          {seccion === "resultados" && (
            <SeccionVacia
              eyebrow="PROGRESO"
              titulo="Resultados"
              texto="Aquí podrás consultar tus marcas, tiempos, pesos, repeticiones y evolución."
              icono="★"
              accion="Volver al inicio"
              onAccion={() => cambiarSeccion("inicio")}
            />
          )}

          {seccion === "configuracion" && (
            <Configuracion
              cuenta={cuenta}
              perfil={perfil}
              membresia={membresia}
              estadoVisual={estadoVisual}
              accesoPermitido={accesoPermitido}
              formatearFecha={formatearFecha}
              fotoFirmada={fotoFirmada}
              iniciales={iniciales}
              peso={peso}
              setPeso={setPeso}
              estatura={estatura}
              setEstatura={setEstatura}
              pesoVisual={pesoVisual}
              estaturaVisual={estaturaVisual}
              mostrarEditor={mostrarEditor}
              setMostrarEditor={setMostrarEditor}
              guardandoPerfil={guardandoPerfil}
              guardarDatosPerfil={guardarDatosPerfil}
              subiendoFoto={subiendoFoto}
              subirSelfie={subirSelfie}
              cerrarSesion={cerrarSesion}
            />
          )}

          <footer style={S.footer}>
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

function Inicio() {
  return (
    <section style={S.homeCompact}>
      <div style={S.homeCompactLine} />
    </section>
  );
}

function Configuracion({
  cuenta,
  membresia,
  estadoVisual,
  accesoPermitido,
  formatearFecha,
  fotoFirmada,
  iniciales,
  peso,
  setPeso,
  estatura,
  setEstatura,
  pesoVisual,
  estaturaVisual,
  mostrarEditor,
  setMostrarEditor,
  guardandoPerfil,
  guardarDatosPerfil,
  subiendoFoto,
  subirSelfie,
  cerrarSesion,
}) {
  const [tabConfig, setTabConfig] = useState("perfil");
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [mensajeClave, setMensajeClave] = useState("");

  async function cambiarClave() {
    setMensajeClave("");

    if (String(nuevaClave).length < 8) {
      setMensajeClave("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (nuevaClave !== confirmarClave) {
      setMensajeClave("Las contraseñas no coinciden.");
      return;
    }

    setGuardandoClave(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: nuevaClave,
      });

      if (error) throw error;

      setNuevaClave("");
      setConfirmarClave("");
      setMensajeClave("Contraseña actualizada correctamente.");
    } catch (err) {
      setMensajeClave(err?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setGuardandoClave(false);
    }
  }

  const tabs = [
    { id: "perfil", label: "Perfil" },
    { id: "clave", label: "Cambiar contraseña" },
    { id: "membresia", label: "Membresía" },
    { id: "pagos", label: "Pagos" },
    { id: "notificaciones", label: "Notificaciones" },
    { id: "fisico", label: "Seguimiento físico" },
  ];

  return (
    <section style={S.profileSettingsShell} className="profile-settings-shell">
      <aside style={S.profileSummaryCard}>
        <div style={S.profileSummaryAvatar}>
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

        <strong style={S.profileSummaryName}>
          {cuenta?.nombre || "Alumno"}
        </strong>

        <span style={S.profileSummaryRole}>Cliente</span>

        <label style={S.changePhotoButton}>
          {subiendoFoto ? "Subiendo..." : "✎ Cambiar foto"}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={subirSelfie}
            disabled={subiendoFoto}
            style={{ display: "none" }}
          />
        </label>

        <div style={S.profileSummaryDivider} />

        <ResumenFila
          label="Estado"
          value={accesoPermitido ? "Activo" : estadoVisual}
        />

        <ResumenFila
          label="Membresía"
          value={membresia?.plan || "Sin plan"}
        />

        <ResumenFila
          label="Vencimiento"
          value={
            membresia?.fecha_vencimiento
              ? formatearFecha(membresia.fecha_vencimiento)
              : "-"
          }
        />

        <ResumenFila
          label="Check-ins"
          value={cuenta?.checkins_total ?? cuenta?.checkins ?? "—"}
        />

        <button
          type="button"
          onClick={cerrarSesion}
          style={S.profileLogoutButton}
        >
          Cerrar sesión
        </button>
      </aside>

      <div style={S.profileSettingsMain}>
        <div style={S.profileTabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabConfig(tab.id)}
              style={{
                ...S.profileTabButton,
                ...(tabConfig === tab.id ? S.profileTabButtonActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tabConfig === "perfil" && (
          <div style={S.profilePanel}>
            <div style={S.profilePanelHeading}>
              <div>
                <span style={S.sectionEyebrow}>PERFIL</span>
                <h2 style={S.profilePanelTitle}>Datos personales</h2>
              </div>
            </div>

            <div style={S.profileFieldsGrid} className="profile-fields-grid">
              <ProfileField
                label="Nombre y apellidos"
                value={cuenta?.nombre || "-"}
              />
              <ProfileField
                label="ID Cliente"
                value={cuenta?.cedula || "-"}
              />
              <ProfileField
                label="Email"
                value={cuenta?.correo || "-"}
              />
              <ProfileField
                label="Teléfono"
                value={cuenta?.telefono || "-"}
              />
              <ProfileField
                label="Estado"
                value={accesoPermitido ? "Activo" : estadoVisual}
              />
              <ProfileField
                label="Plan actual"
                value={membresia?.plan || "Sin membresía"}
              />
            </div>
          </div>
        )}

        {tabConfig === "clave" && (
          <div style={S.profilePanel}>
            <span style={S.sectionEyebrow}>SEGURIDAD</span>
            <h2 style={S.profilePanelTitle}>Cambiar contraseña</h2>

            <div style={S.passwordForm}>
              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Nueva contraseña</label>
                <input
                  type="password"
                  value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={S.input}
                />
              </div>

              <div style={S.fieldGroup}>
                <label style={S.fieldLabel}>Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmarClave}
                  onChange={(e) => setConfirmarClave(e.target.value)}
                  placeholder="Repite la contraseña"
                  style={S.input}
                />
              </div>

              {mensajeClave && (
                <div style={S.passwordMessage}>{mensajeClave}</div>
              )}

              <button
                type="button"
                onClick={cambiarClave}
                disabled={guardandoClave}
                style={S.saveProfileButton}
              >
                {guardandoClave
                  ? "Actualizando..."
                  : "Actualizar contraseña"}
              </button>
            </div>
          </div>
        )}

        {tabConfig === "membresia" && (
          <div style={S.profilePanel}>
            <span style={S.sectionEyebrow}>SUSCRIPCIÓN</span>
            <h2 style={S.profilePanelTitle}>Mi membresía</h2>

            {membresia ? (
              <div style={S.membershipProfileCard}>
                <strong style={S.membershipProfilePlan}>
                  {membresia.plan || "Membresía"}
                </strong>

                <div style={S.profileFieldsGrid} className="profile-fields-grid">
                  <ProfileField
                    label="Estado"
                    value={estadoVisual}
                  />
                  <ProfileField
                    label="Periodicidad"
                    value={membresia.periodicidad || "-"}
                  />
                  <ProfileField
                    label="Fecha de inicio"
                    value={
                      membresia.fecha_inicio
                        ? formatearFecha(membresia.fecha_inicio)
                        : "-"
                    }
                  />
                  <ProfileField
                    label="Vencimiento"
                    value={
                      membresia.fecha_vencimiento
                        ? formatearFecha(membresia.fecha_vencimiento)
                        : "-"
                    }
                  />
                </div>
              </div>
            ) : (
              <ConfigEmpty
                title="Sin membresía registrada"
                text="Cuando el gimnasio te asigne una membresía aparecerá aquí."
              />
            )}
          </div>
        )}

        {tabConfig === "pagos" && (
          <div style={S.profilePanel}>
            <span style={S.sectionEyebrow}>PAGOS</span>
            <h2 style={S.profilePanelTitle}>Facturación y pagos</h2>
            <ConfigEmpty
              title="Sin movimientos para mostrar"
              text="Esta sección quedará preparada para mostrar tus pagos y comprobantes cuando conectemos el historial financiero del alumno."
            />
          </div>
        )}

        {tabConfig === "notificaciones" && (
          <div style={S.profilePanel}>
            <span style={S.sectionEyebrow}>PREFERENCIAS</span>
            <h2 style={S.profilePanelTitle}>Notificaciones</h2>
            <ConfigEmpty
              title="Preferencias de notificación"
              text="Aquí podrás administrar avisos de reservas, cambios de horario y vencimiento de membresía."
            />
          </div>
        )}

        {tabConfig === "fisico" && (
          <div style={S.profilePanel}>
            <div style={S.profilePanelHeading}>
              <div>
                <span style={S.sectionEyebrow}>SEGUIMIENTO FÍSICO</span>
                <h2 style={S.profilePanelTitle}>Peso y estatura</h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarEditor((valor) => !valor)}
                style={S.outlineSmallButton}
              >
                {mostrarEditor ? "Cerrar" : "Editar"}
              </button>
            </div>

            <div style={S.configGrid} className="config-grid">
              <Metric label="Peso" value={pesoVisual} />
              <Metric label="Estatura" value={estaturaVisual} />
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
        )}
      </div>
    </section>
  );
}

function ResumenFila({ label, value }) {
  return (
    <div style={S.profileSummaryRow}>
      <span style={S.profileSummaryLabel}>{label}</span>
      <strong style={S.profileSummaryValue}>{value}</strong>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div style={S.profileField}>
      <span style={S.profileFieldLabel}>{label}</span>
      <strong style={S.profileFieldValue}>{value}</strong>
    </div>
  );
}

function ConfigEmpty({ title, text }) {
  return (
    <div style={S.configEmpty}>
      <div style={S.configEmptyIcon}>◇</div>
      <strong style={S.configEmptyTitle}>{title}</strong>
      <span style={S.configEmptyText}>{text}</span>
    </div>
  );
}

function SeccionVacia({
  eyebrow,
  titulo,
  texto,
  icono,
  accion,
  onAccion,
}) {
  return (
    <section style={S.emptyPageCard}>
      <div style={S.emptyPageIcon}>{icono}</div>
      <span style={S.sectionEyebrow}>{eyebrow}</span>
      <h1 style={S.emptyPageTitle}>{titulo}</h1>
      <p style={S.emptyPageText}>{texto}</p>

      <button
        type="button"
        onClick={onAccion}
        style={S.primaryButton}
      >
        {accion}
      </button>
    </section>
  );
}

function QuickCard({ icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={S.quickCard}
    >
      <span style={S.quickIcon}>{icon}</span>
      <span style={S.quickCopy}>
        <strong style={S.quickTitle}>{title}</strong>
        <span style={S.quickSubtitle}>{subtitle}</span>
      </span>
      <span style={S.quickArrow}>›</span>
    </button>
  );
}

function Metric({ label, value }) {
  return (
    <div style={S.metricCard}>
      <span style={S.metricLabel}>{label}</span>
      <strong style={S.metricValue}>{value}</strong>
    </div>
  );
}

function Fila({ label, value }) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <strong style={S.rowValue}>{value}</strong>
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
    position: "relative",
    width: "min(680px,100%)",
    minHeight: 760,
    overflow: "hidden",
    border: "1px solid #D9E6DE",
    borderRadius: 28,
    background: "#F6F8FB",
    boxShadow: "0 28px 80px rgba(15,50,31,.13)",
  },

  topUserRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  topMenuIconButton: {
    width: 44,
    height: 44,
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    border: 0,
    borderRadius: 13,
    background: "#0B1628",
    color: "#FFFFFF",
    fontSize: 21,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(15,23,42,.12)",
  },

  topUserButton: {
    minWidth: 0,
    padding: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: 0,
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
  },

  topUserBlock: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  topUserAvatar: {
    width: 46,
    height: 46,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    borderRadius: 14,
    background: "#E9EEF4",
    color: "#0F172A",
    fontSize: 16,
    fontWeight: 950,
  },

  topUserText: {
    minWidth: 0,
  },

  topUserName: {
    display: "block",
    maxWidth: 230,
    overflow: "hidden",
    color: "#111827",
    fontSize: 14,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  topUserState: {
    display: "block",
    marginTop: 2,
    color: "#7A8797",
    fontSize: 8.5,
  },

  topbar: {
    minHeight: 74,
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "#FFFFFF",
    borderBottom: "1px solid #E6EBF1",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },

  menuButton: {
    width: 40,
    height: 40,
    border: 0,
    borderRadius: 12,
    background: "#0F172A",
    color: "#FFFFFF",
    fontSize: 19,
    cursor: "pointer",
  },

  brandBlock: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  brandTextWrap: {
    minWidth: 0,
  },

  brandMark: {
    width: 48,
    height: 48,
    overflow: "hidden",
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#FFFFFF",
    border: "1px solid #DDE8E1",
    color: "#0F172A",
    fontSize: 17,
    fontWeight: 950,
  },

  brandLogo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    background: "#FFFFFF",
  },

  brandName: {
    display: "block",
    maxWidth: 260,
    overflow: "hidden",
    color: "#0F172A",
    fontSize: 13,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  powered: {
    display: "block",
    marginTop: 2,
    color: "#829088",
    fontSize: 8,
  },

  refreshButton: {
    width: 40,
    height: 40,
    border: "1px solid #DCE6E0",
    borderRadius: 12,
    background: "#F8FAF9",
    color: "#426050",
    fontSize: 18,
    fontWeight: 850,
    cursor: "pointer",
  },

  content: {
    padding: "18px 18px 26px",
  },

  menuOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 90,
    border: 0,
    background: "rgba(8,18,12,.55)",
    backdropFilter: "blur(2px)",
  },

  drawer: {
    position: "fixed",
    zIndex: 100,
    top: 0,
    left: 0,
    bottom: 0,
    width: "min(360px,88vw)",
    padding: "18px 16px",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    background: "linear-gradient(180deg,#07111F 0%,#0B1628 55%,#0A1422 100%)",
    color: "#FFFFFF",
    boxShadow: "18px 0 50px rgba(0,0,0,.22)",
  },

  drawerBusiness: {
    padding: "4px 8px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid rgba(255,255,255,.09)",
  },

  drawerBusinessLogo: {
    width: 52,
    height: 52,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: 16,
    fontWeight: 950,
  },

  drawerBusinessText: {
    minWidth: 0,
  },

  drawerBusinessName: {
    display: "block",
    minWidth: 0,
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 900,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  drawerBusinessSub: {
    display: "block",
    marginTop: 2,
    color: "#72839A",
    fontSize: 8,
  },

  drawerHeader: {
    padding: "8px 8px 18px",
    display: "grid",
    gridTemplateColumns: "56px minmax(0,1fr)",
    gap: 11,
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,.09)",
  },

  drawerAvatar: {
    width: 56,
    height: 56,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background: "rgba(255,255,255,.10)",
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 950,
  },

  drawerName: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 14,
  },

  drawerState: {
    display: "block",
    marginTop: 3,
    color: "#8FB9D1",
    fontSize: 9,
  },

  drawerNav: {
    padding: "16px 0",
    display: "grid",
    alignContent: "start",
    gap: 5,
  },

  drawerItem: {
    width: "100%",
    minHeight: 48,
    padding: "0 13px",
    display: "grid",
    gridTemplateColumns: "31px minmax(0,1fr)",
    alignItems: "center",
    gap: 8,
    border: 0,
    borderRadius: 12,
    background: "transparent",
    color: "#D5DEE8",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 750,
    cursor: "pointer",
  },

  drawerItemActive: {
    background: "linear-gradient(90deg,#0B3C5D 0%,#0D506B 100%)",
    color: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(0,0,0,.16)",
  },

  drawerIcon: {
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    borderRadius: 9,
    background: "rgba(255,255,255,.07)",
    fontSize: 14,
  },

  drawerFooter: {
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,.09)",
  },

  drawerLogout: {
    width: "100%",
    minHeight: 44,
    border: "1px solid rgba(255,255,255,.13)",
    borderRadius: 11,
    background: "transparent",
    color: "#D8E2DC",
    fontSize: 10,
    fontWeight: 800,
  },

  inlineError: {
    marginBottom: 12,
    padding: 11,
    border: "1px solid #F0C9C4",
    borderRadius: 12,
    background: "#FFF2F0",
    color: "#8B3C34",
    fontSize: 9,
  },

  successMessage: {
    marginBottom: 12,
    padding: 11,
    border: "1px solid #BFE3CE",
    borderRadius: 12,
    background: "#ECF9F1",
    color: "#196D42",
    fontSize: 9,
    fontWeight: 800,
  },

  hero: {
    marginBottom: 15,
    padding: 18,
    borderRadius: 21,
    background:
      "linear-gradient(135deg,#173C2A 0%,#0F6B40 100%)",
    color: "#FFFFFF",
    boxShadow: "0 16px 34px rgba(23,60,42,.18)",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  heroIdentity: {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "62px minmax(0,1fr)",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 62,
    height: 62,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "rgba(255,255,255,.13)",
    border: "1px solid rgba(255,255,255,.18)",
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: 950,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  welcome: {
    display: "block",
    marginBottom: 2,
    color: "#B9DDC8",
    fontSize: 9,
  },

  memberName: {
    margin: 0,
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 1.08,
    textOverflow: "ellipsis",
  },

  memberId: {
    display: "block",
    marginTop: 5,
    color: "#B9D2C3",
    fontSize: 8.5,
  },

  estadoBadge: {
    minHeight: 28,
    padding: "0 9px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    fontSize: 8.5,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  estadoBadgeOk: {
    color: "#D9FFE8",
    background: "rgba(77,210,132,.16)",
    border: "1px solid rgba(137,236,176,.21)",
  },

  estadoBadgeWarning: {
    color: "#FFF0C4",
    background: "rgba(242,181,61,.15)",
    border: "1px solid rgba(255,217,137,.20)",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
  },

  heroStats: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },

  heroStat: {
    padding: 11,
    borderRadius: 13,
    background: "rgba(255,255,255,.09)",
    border: "1px solid rgba(255,255,255,.09)",
  },

  heroStatLabel: {
    display: "block",
    color: "#A9CDB8",
    fontSize: 7,
    fontWeight: 900,
    letterSpacing: 1,
  },

  heroStatValue: {
    display: "block",
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 1.3,
  },

  quickSection: {
    marginBottom: 15,
    padding: 17,
    border: "1px solid #DFE8E2",
    borderRadius: 19,
    background: "#FFFFFF",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 9,
  },

  quickCard: {
    minHeight: 82,
    padding: 12,
    display: "grid",
    gridTemplateColumns: "38px minmax(0,1fr) 14px",
    alignItems: "center",
    gap: 8,
    border: "1px solid #E2EAE5",
    borderRadius: 14,
    background: "#F9FBFA",
    textAlign: "left",
    cursor: "pointer",
  },

  quickIcon: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background: "#E6F4EB",
    color: "#0EA5A6",
    fontSize: 16,
    fontWeight: 900,
  },

  quickCopy: {
    minWidth: 0,
    display: "grid",
    gap: 2,
  },

  quickTitle: {
    color: "#243A2D",
    fontSize: 11,
  },

  quickSubtitle: {
    color: "#829088",
    fontSize: 7.5,
  },

  quickArrow: {
    color: "#AAB6AF",
    fontSize: 20,
  },

  accessBanner: {
    marginBottom: 15,
    padding: 15,
    display: "grid",
    gridTemplateColumns: "42px minmax(0,1fr)",
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
    color: "#0EA5A6",
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
    color: "#0EA5A6",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1.1,
  },

  sectionTitle: {
    margin: "3px 0 0",
    color: "#17251D",
    fontSize: 20,
  },

  qrSection: {
    marginBottom: 15,
    padding: 18,
    borderRadius: 20,
    background:
      "linear-gradient(145deg,#FFFFFF 0%,#F4FAF6 100%)",
    border: "1px solid #D9E7DE",
  },

  qrEyebrow: {
    display: "block",
    color: "#0EA5A6",
    fontSize: 7,
    fontWeight: 950,
    letterSpacing: 1,
  },

  qrStatus: {
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 7.5,
    fontWeight: 950,
    letterSpacing: 0.8,
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
    gridTemplateColumns: "210px minmax(0,1fr)",
    gap: 18,
    alignItems: "center",
  },

  qrFrame: {
    width: "100%",
    aspectRatio: "1 / 1",
    padding: 13,
    overflow: "hidden",
    borderRadius: 22,
    background: "#FFFFFF",
    border: "1px solid #DDE7E1",
    boxShadow: "0 16px 36px rgba(17,62,39,.10)",
  },

  qrImage: {
    width: "100%",
    height: "100%",
    display: "block",
    borderRadius: 12,
    objectFit: "contain",
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
    color: "#0EA5A6",
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

  configHero: {
    marginBottom: 15,
    padding: 18,
    display: "grid",
    gridTemplateColumns: "76px minmax(0,1fr)",
    gap: 14,
    alignItems: "center",
    borderRadius: 20,
    background: "#173C2A",
    color: "#FFFFFF",
  },

  configAvatar: {
    width: 76,
    height: 76,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 22,
    background: "rgba(255,255,255,.12)",
    fontSize: 22,
    fontWeight: 950,
  },

  configTitle: {
    margin: "3px 0 2px",
    fontSize: 21,
    lineHeight: 1.1,
  },

  configSubtitle: {
    color: "#B9D2C3",
    fontSize: 8.5,
  },

  configGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 10,
  },

  metricCard: {
    minHeight: 68,
    padding: 12,
    display: "grid",
    alignContent: "center",
    gap: 3,
    border: "1px solid #E3ECE6",
    borderRadius: 12,
    background: "#F8FBF9",
  },

  metricLabel: {
    color: "#839088",
    fontSize: 7,
    fontWeight: 900,
    textTransform: "uppercase",
  },

  metricValue: {
    color: "#274433",
    fontSize: 14,
  },

  photoActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },

  selfieButton: {
    minHeight: 42,
    padding: "0 10px",
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#0EA5A6",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "center",
  },

  galleryButton: {
    minHeight: 42,
    padding: "0 10px",
    display: "grid",
    placeItems: "center",
    border: "1px solid #D7E3DB",
    borderRadius: 11,
    background: "#FFFFFF",
    color: "#4E6658",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
    textAlign: "center",
  },

  profileEditor: {
    marginTop: 10,
    padding: 12,
    display: "grid",
    gap: 10,
    borderRadius: 13,
    background: "#F4F8F5",
  },

  fieldGroup: {
    display: "grid",
    gap: 5,
  },

  fieldLabel: {
    color: "#617269",
    fontSize: 8,
    fontWeight: 850,
  },

  input: {
    width: "100%",
    minHeight: 40,
    padding: "0 11px",
    border: "1px solid #D6E1DA",
    borderRadius: 10,
    outline: "none",
    background: "#FFFFFF",
    color: "#21372A",
    fontSize: 12,
  },

  saveProfileButton: {
    minHeight: 41,
    border: 0,
    borderRadius: 10,
    background: "#0F172A",
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 900,
    cursor: "pointer",
  },

  outlineSmallButton: {
    minHeight: 32,
    padding: "0 10px",
    border: "1px solid #D7E3DB",
    borderRadius: 9,
    background: "#FFFFFF",
    color: "#456353",
    fontSize: 8,
    fontWeight: 850,
    cursor: "pointer",
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
    color: "#0EA5A6",
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

  appHome: {
    minHeight: 560,
    display: "grid",
    alignContent: "start",
    gap: 16,
  },

  appHomeHero: {
    padding: 22,
    display: "grid",
    gridTemplateColumns: "82px minmax(0,1fr)",
    gap: 16,
    alignItems: "center",
    borderRadius: 24,
    background:
      "linear-gradient(135deg,#0F172A 0%,#17324B 62%,#0E7490 100%)",
    boxShadow: "0 20px 42px rgba(15,23,42,.22)",
    color: "#FFFFFF",
  },

  appHomeAvatar: {
    width: 82,
    height: 82,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: 22,
    background: "rgba(255,255,255,.10)",
    border: "1px solid rgba(255,255,255,.15)",
    fontSize: 26,
    fontWeight: 950,
  },

  appHomeCopy: {
    minWidth: 0,
  },

  appHomeEyebrow: {
    display: "block",
    marginBottom: 4,
    color: "#8ED8E2",
    fontSize: 8,
    fontWeight: 950,
    letterSpacing: 1.2,
  },

  appHomeName: {
    margin: 0,
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 1.05,
  },

  appHomeState: {
    display: "inline-block",
    marginTop: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,.10)",
    color: "#D7F5F8",
    fontSize: 9,
    fontWeight: 850,
  },

  appHomeSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 10,
  },

  appHomeStat: {
    minHeight: 92,
    padding: 14,
    display: "grid",
    alignContent: "center",
    gap: 5,
    border: "1px solid #DEE6EF",
    borderRadius: 17,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,23,42,.05)",
  },

  appHomeStatLabel: {
    color: "#7A8797",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: .8,
  },

  appHomeStatValue: {
    color: "#172033",
    fontSize: 12,
    lineHeight: 1.3,
  },

  homeHint: {
    padding: 18,
    display: "grid",
    gridTemplateColumns: "48px minmax(0,1fr)",
    gap: 12,
    alignItems: "center",
    border: "1px solid #DCE6EF",
    borderRadius: 18,
    background: "#FFFFFF",
  },

  homeHintIcon: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#E8F6F8",
    color: "#0E7490",
    fontSize: 22,
    fontWeight: 900,
  },

  homeHintTitle: {
    display: "block",
    color: "#172033",
    fontSize: 13,
  },

  homeHintText: {
    margin: "4px 0 0",
    color: "#6F7C8C",
    fontSize: 9,
    lineHeight: 1.45,
  },

  homeCompact: {
    minHeight: 120,
    padding: "18px 0 8px",
    background: "transparent",
  },

  homeCompactLine: {
    width: 44,
    height: 4,
    margin: "0 auto",
    borderRadius: 999,
    background: "#D8E0E8",
  },

  cleanHome: {
    minHeight: 620,
    borderRadius: 22,
    background:
      "linear-gradient(180deg,#F8FAFC 0%,#F3F6FA 100%)",
    border: "1px solid #E3E9F0",
    position: "relative",
    overflow: "hidden",
  },

  cleanHomeMark: {
    position: "absolute",
    width: 180,
    height: 180,
    right: -55,
    bottom: -55,
    borderRadius: "50%",
    background:
      "radial-gradient(circle,rgba(14,165,166,.10) 0%,rgba(14,165,166,0) 70%)",
  },

  profileSettingsShell: {
    marginBottom: 15,
    display: "grid",
    gridTemplateColumns: "220px minmax(0,1fr)",
    gap: 14,
    alignItems: "start",
  },

  profileSummaryCard: {
    padding: 18,
    display: "grid",
    justifyItems: "center",
    gap: 8,
    border: "1px solid #DDE8E1",
    borderRadius: 18,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,50,31,.05)",
  },

  profileSummaryAvatar: {
    width: 96,
    height: 96,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#EAF2ED",
    border: "4px solid #F3F7F4",
    color: "#173C2A",
    fontSize: 30,
    fontWeight: 950,
  },

  profileSummaryName: {
    marginTop: 4,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#1B3023",
    fontSize: 17,
    textAlign: "center",
  },

  profileSummaryRole: {
    color: "#829088",
    fontSize: 9,
  },

  changePhotoButton: {
    width: "100%",
    minHeight: 36,
    marginTop: 4,
    display: "grid",
    placeItems: "center",
    border: "1px solid #D9E4DD",
    borderRadius: 10,
    background: "#F8FAF9",
    color: "#385345",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
  },

  profileSummaryDivider: {
    width: "100%",
    height: 1,
    margin: "6px 0 1px",
    background: "#E8EEEA",
  },

  profileSummaryRow: {
    width: "100%",
    minHeight: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottom: "1px solid #EFF3F0",
  },

  profileSummaryLabel: {
    color: "#7B8981",
    fontSize: 8.5,
  },

  profileSummaryValue: {
    maxWidth: "58%",
    overflow: "hidden",
    color: "#2B4435",
    fontSize: 8.5,
    textAlign: "right",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  profileLogoutButton: {
    width: "100%",
    minHeight: 38,
    marginTop: 7,
    border: "1px solid #E1E8E3",
    borderRadius: 10,
    background: "#FFFFFF",
    color: "#6A766F",
    fontSize: 9,
    fontWeight: 850,
    cursor: "pointer",
  },

  profileSettingsMain: {
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid #DDE8E1",
    borderRadius: 18,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(15,50,31,.05)",
  },

  profileTabs: {
    display: "flex",
    gap: 0,
    overflowX: "auto",
    borderBottom: "1px solid #E4EBE6",
    background: "#FBFCFB",
  },

  profileTabButton: {
    minHeight: 48,
    padding: "0 14px",
    flex: "0 0 auto",
    border: 0,
    borderBottom: "3px solid transparent",
    background: "transparent",
    color: "#6F7F76",
    fontSize: 9,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  profileTabButtonActive: {
    color: "#0EA5A6",
    borderBottomColor: "#0EA5A6",
    background: "#FFFFFF",
  },

  profilePanel: {
    minHeight: 430,
    padding: 20,
  },

  profilePanelHeading: {
    marginBottom: 16,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  profilePanelTitle: {
    margin: "4px 0 0",
    color: "#17251D",
    fontSize: 22,
  },

  profileFieldsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  profileField: {
    minHeight: 70,
    padding: "11px 12px",
    display: "grid",
    alignContent: "center",
    gap: 4,
    border: "1px solid #E4EBE6",
    borderRadius: 11,
    background: "#FAFCFB",
  },

  profileFieldLabel: {
    color: "#7E8C84",
    fontSize: 7.5,
    fontWeight: 850,
    textTransform: "uppercase",
  },

  profileFieldValue: {
    overflowWrap: "anywhere",
    color: "#263F31",
    fontSize: 11,
    lineHeight: 1.35,
  },

  passwordForm: {
    maxWidth: 430,
    marginTop: 18,
    display: "grid",
    gap: 12,
  },

  passwordMessage: {
    padding: 10,
    borderRadius: 10,
    background: "#F2F7F4",
    color: "#476052",
    fontSize: 9,
  },

  membershipProfileCard: {
    marginTop: 16,
    padding: 15,
    border: "1px solid #DDE8E1",
    borderRadius: 14,
    background: "#F8FBF9",
  },

  membershipProfilePlan: {
    display: "block",
    marginBottom: 12,
    color: "#173C2A",
    fontSize: 18,
  },

  configEmpty: {
    minHeight: 280,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 8,
    textAlign: "center",
  },

  configEmptyIcon: {
    width: 54,
    height: 54,
    display: "grid",
    placeItems: "center",
    borderRadius: 16,
    background: "#EAF4EE",
    color: "#0EA5A6",
    fontSize: 24,
  },

  configEmptyTitle: {
    color: "#2A4033",
    fontSize: 14,
  },

  configEmptyText: {
    maxWidth: 360,
    color: "#7A8780",
    fontSize: 9,
    lineHeight: 1.5,
  },

  emptyPageCard: {
    minHeight: 430,
    padding: 30,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 10,
    border: "1px solid #DFE8E2",
    borderRadius: 22,
    background: "#FFFFFF",
    textAlign: "center",
  },

  emptyPageIcon: {
    width: 72,
    height: 72,
    display: "grid",
    placeItems: "center",
    marginBottom: 2,
    borderRadius: 22,
    background: "#E7F4EC",
    color: "#0EA5A6",
    fontSize: 30,
    fontWeight: 900,
  },

  emptyPageTitle: {
    margin: 0,
    color: "#1C3426",
    fontSize: 28,
  },

  emptyPageText: {
    maxWidth: 390,
    margin: 0,
    color: "#748179",
    fontSize: 10,
    lineHeight: 1.6,
  },

  primaryButton: {
    minWidth: 160,
    minHeight: 44,
    marginTop: 4,
    padding: "0 16px",
    border: 0,
    borderRadius: 11,
    background: "#0EA5A6",
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

  footer: {
    display: "grid",
    justifyItems: "center",
    gap: 8,
    paddingTop: 5,
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

  mobileBottom: {
    display: "none",
    position: "fixed",
    zIndex: 40,
    left: 0,
    right: 0,
    bottom: 0,
    gridTemplateColumns: "repeat(5,1fr)",
    minHeight: 72,
    padding: "7px 5px max(7px,env(safe-area-inset-bottom))",
    background: "rgba(255,255,255,.97)",
    borderTop: "1px solid #E0E8E3",
    boxShadow: "0 -8px 26px rgba(17,45,29,.08)",
    backdropFilter: "blur(12px)",
  },

  bottomItem: {
    minWidth: 0,
    border: 0,
    background: "transparent",
    color: "#839088",
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 3,
    fontSize: 7.5,
    fontWeight: 850,
  },

  bottomItemActive: {
    color: "#0EA5A6",
  },

  bottomIcon: {
    fontSize: 19,
    lineHeight: 1,
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
    boxShadow: "0 18px 50px rgba(22,50,34,.08)",
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
    borderTopColor: "#0EA5A6",
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
    boxShadow: "0 20px 60px rgba(22,44,31,.10)",
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
};
