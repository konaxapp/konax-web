"use client";

// KONAX · Control de sesión por inactividad
// VERSION 2026.09.10
// Aviso: 15 minutos sin actividad
// Cierre automático: 2 minutos después del aviso

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

/* ============================================
   CONFIGURACIÓN
   ============================================ */

const TIEMPO_HASTA_AVISO = 15 * 60 * 1000; // 15 minutos
const TIEMPO_GRACIA = 2 * 60 * 1000; // 2 minutos

const TIEMPO_TOTAL_INACTIVIDAD =
  TIEMPO_HASTA_AVISO + TIEMPO_GRACIA;

const CLAVE_ULTIMA_ACTIVIDAD = "konaxUltimaActividad";

/* ============================================
   RUTAS PÚBLICAS
   ============================================ */

const RUTAS_PUBLICAS = [
  "/login",
  "/admin-login",
  "/crear-contrasena",
  "/reservar",
];

export default function SessionInactivityGuard() {
  const pathname = usePathname();

  const [mostrarAviso, setMostrarAviso] = useState(false);

  const [segundosRestantes, setSegundosRestantes] =
    useState(Math.floor(TIEMPO_GRACIA / 1000));

  const cerrandoRef = useRef(false);
  const avisoVisibleRef = useRef(false);

  const timeoutAvisoRef = useRef(null);
  const timeoutCierreRef = useRef(null);
  const intervaloCuentaRef = useRef(null);

  const ultimaActualizacionRef = useRef(0);

  /* ============================================
     SINCRONIZAR AVISO
     ============================================ */

  useEffect(() => {
    avisoVisibleRef.current = mostrarAviso;
  }, [mostrarAviso]);

  /* ============================================
     CONTROL GENERAL
     ============================================ */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const esRutaPublica = RUTAS_PUBLICAS.some(
      (ruta) =>
        pathname === ruta ||
        pathname?.startsWith(`${ruta}/`)
    );

    if (esRutaPublica) {
      limpiarTodo();
      ocultarAviso();
      return;
    }

    const tieneSesionKonax = Boolean(
      localStorage.getItem("usuarioId") ||
        localStorage.getItem("adminKonaxId")
    );

    if (!tieneSesionKonax) {
      limpiarTodo();
      ocultarAviso();
      return;
    }

    if (
      !localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)
    ) {
      localStorage.setItem(
        CLAVE_ULTIMA_ACTIVIDAD,
        String(Date.now())
      );
    }

    verificarInactividad();

    /* ========================================
       ACTIVIDAD DEL USUARIO
       ======================================== */

    const eventos = [
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "pointerdown",
    ];

    eventos.forEach((evento) => {
      window.addEventListener(
        evento,
        registrarActividad,
        { passive: true }
      );
    });

    /* ========================================
       SINCRONIZACIÓN ENTRE PESTAÑAS
       ======================================== */

    window.addEventListener(
      "storage",
      manejarActividadOtraPestana
    );

    /* ========================================
       CUANDO REGRESA A LA APP
       ======================================== */

    document.addEventListener(
      "visibilitychange",
      manejarVisibilidad
    );

    /* ========================================
       VERIFICACIÓN DE RESPALDO
       ======================================== */

    const intervaloVerificacion =
      window.setInterval(() => {
        verificarInactividad();
      }, 15000);

    return () => {
      eventos.forEach((evento) => {
        window.removeEventListener(
          evento,
          registrarActividad
        );
      });

      window.removeEventListener(
        "storage",
        manejarActividadOtraPestana
      );

      document.removeEventListener(
        "visibilitychange",
        manejarVisibilidad
      );

      window.clearInterval(
        intervaloVerificacion
      );

      limpiarTodo();
    };
  }, [pathname]);

  /* ============================================
     LIMPIAR TEMPORIZADORES
     ============================================ */

  function limpiarTimeoutAviso() {
    if (timeoutAvisoRef.current) {
      window.clearTimeout(
        timeoutAvisoRef.current
      );

      timeoutAvisoRef.current = null;
    }
  }

  function limpiarTimeoutCierre() {
    if (timeoutCierreRef.current) {
      window.clearTimeout(
        timeoutCierreRef.current
      );

      timeoutCierreRef.current = null;
    }
  }

  function limpiarCuentaRegresiva() {
    if (intervaloCuentaRef.current) {
      window.clearInterval(
        intervaloCuentaRef.current
      );

      intervaloCuentaRef.current = null;
    }
  }

  function limpiarTodo() {
    limpiarTimeoutAviso();
    limpiarTimeoutCierre();
    limpiarCuentaRegresiva();
  }

  /* ============================================
     OCULTAR AVISO
     ============================================ */

  function ocultarAviso() {
    avisoVisibleRef.current = false;

    setMostrarAviso(false);

    setSegundosRestantes(
      Math.floor(TIEMPO_GRACIA / 1000)
    );
  }

  /* ============================================
     ÚLTIMA ACTIVIDAD
     ============================================ */

  function obtenerUltimaActividad() {
    return Number(
      localStorage.getItem(
        CLAVE_ULTIMA_ACTIVIDAD
      ) || 0
    );
  }

  /* ============================================
     PROGRAMAR AVISO
     ============================================ */

  function programarControl() {
    if (cerrandoRef.current) return;

    limpiarTodo();

    const ultimaActividad =
      obtenerUltimaActividad();

    if (!ultimaActividad) {
      const ahora = Date.now();

      localStorage.setItem(
        CLAVE_ULTIMA_ACTIVIDAD,
        String(ahora)
      );

      timeoutAvisoRef.current =
        window.setTimeout(
          abrirAvisoInactividad,
          TIEMPO_HASTA_AVISO
        );

      return;
    }

    const transcurrido =
      Date.now() - ultimaActividad;

    /* ========================================
       YA PASARON LOS 17 MINUTOS
       ======================================== */

    if (
      transcurrido >=
      TIEMPO_TOTAL_INACTIVIDAD
    ) {
      cerrarSesion("inactividad");
      return;
    }

    /* ========================================
       YA PASARON LOS 15 MINUTOS
       ======================================== */

    if (
      transcurrido >=
      TIEMPO_HASTA_AVISO
    ) {
      abrirAvisoInactividad();
      return;
    }

    const restanteHastaAviso =
      TIEMPO_HASTA_AVISO - transcurrido;

    timeoutAvisoRef.current =
      window.setTimeout(
        abrirAvisoInactividad,
        restanteHastaAviso
      );
  }

  /* ============================================
     ABRIR AVISO
     ============================================ */

  function abrirAvisoInactividad() {
    if (cerrandoRef.current) return;

    const ultimaActividad =
      obtenerUltimaActividad();

    if (!ultimaActividad) {
      registrarActividadForzada();
      return;
    }

    const transcurrido =
      Date.now() - ultimaActividad;

    if (
      transcurrido <
      TIEMPO_HASTA_AVISO
    ) {
      programarControl();
      return;
    }

    const restante =
      TIEMPO_TOTAL_INACTIVIDAD -
      transcurrido;

    if (restante <= 0) {
      cerrarSesion("inactividad");
      return;
    }

    avisoVisibleRef.current = true;

    setMostrarAviso(true);

    actualizarCuentaRegresiva();

    limpiarTimeoutCierre();

    timeoutCierreRef.current =
      window.setTimeout(
        () =>
          cerrarSesion("inactividad"),
        restante
      );

    limpiarCuentaRegresiva();

    intervaloCuentaRef.current =
      window.setInterval(() => {
        actualizarCuentaRegresiva();
      }, 1000);
  }

  /* ============================================
     CUENTA REGRESIVA
     ============================================ */

  function actualizarCuentaRegresiva() {
    const ultimaActividad =
      obtenerUltimaActividad();

    if (!ultimaActividad) return;

    const transcurrido =
      Date.now() - ultimaActividad;

    const restante =
      TIEMPO_TOTAL_INACTIVIDAD -
      transcurrido;

    const segundos = Math.max(
      0,
      Math.ceil(restante / 1000)
    );

    setSegundosRestantes(segundos);

    if (segundos <= 0) {
      limpiarCuentaRegresiva();
    }
  }

  /* ============================================
     ACTIVIDAD NORMAL
     ============================================ */

  function registrarActividad() {
    if (cerrandoRef.current) return;

    /*
      IMPORTANTE:

      Cuando el aviso ya está visible,
      tocar fuera, hacer scroll o mover
      la pantalla NO renueva la sesión.

      Debe tocar:
      "Sí, continuar sesión".
    */

    if (avisoVisibleRef.current) {
      return;
    }

    const ahora = Date.now();

    if (
      ahora -
        ultimaActualizacionRef.current <
      1000
    ) {
      return;
    }

    ultimaActualizacionRef.current =
      ahora;

    localStorage.setItem(
      CLAVE_ULTIMA_ACTIVIDAD,
      String(ahora)
    );

    programarControl();
  }

  /* ============================================
     CONTINUAR SESIÓN
     ============================================ */

  function registrarActividadForzada() {
    if (cerrandoRef.current) return;

    const ahora = Date.now();

    ultimaActualizacionRef.current =
      ahora;

    localStorage.setItem(
      CLAVE_ULTIMA_ACTIVIDAD,
      String(ahora)
    );

    ocultarAviso();

    programarControl();
  }

  function continuarSesion() {
    registrarActividadForzada();
  }

  /* ============================================
     ACTIVIDAD EN OTRA PESTAÑA
     ============================================ */

  function manejarActividadOtraPestana(
    evento
  ) {
    if (
      evento.key !==
      CLAVE_ULTIMA_ACTIVIDAD
    ) {
      return;
    }

    const ultimaActividad = Number(
      evento.newValue || 0
    );

    if (!ultimaActividad) return;

    const transcurrido =
      Date.now() - ultimaActividad;

    if (
      transcurrido <
      TIEMPO_HASTA_AVISO
    ) {
      ocultarAviso();
    }

    programarControl();
  }

  /* ============================================
     REGRESAR A PRIMER PLANO
     ============================================ */

  function manejarVisibilidad() {
    if (
      document.visibilityState ===
      "visible"
    ) {
      verificarInactividad();
    }
  }

  /* ============================================
     VERIFICAR INACTIVIDAD
     ============================================ */

  function verificarInactividad() {
    if (cerrandoRef.current) return;

    const tieneSesionKonax = Boolean(
      localStorage.getItem("usuarioId") ||
        localStorage.getItem(
          "adminKonaxId"
        )
    );

    if (!tieneSesionKonax) {
      limpiarTodo();
      ocultarAviso();
      return;
    }

    const ultimaActividad =
      obtenerUltimaActividad();

    if (!ultimaActividad) {
      registrarActividadForzada();
      return;
    }

    const tiempoTranscurrido =
      Date.now() - ultimaActividad;

    if (
      tiempoTranscurrido >=
      TIEMPO_TOTAL_INACTIVIDAD
    ) {
      cerrarSesion("inactividad");
      return;
    }

    if (
      tiempoTranscurrido >=
      TIEMPO_HASTA_AVISO
    ) {
      abrirAvisoInactividad();
      return;
    }

    ocultarAviso();

    programarControl();
  }

  /* ============================================
     CERRAR SESIÓN
     ============================================ */

  async function cerrarSesion(
    motivo = "manual"
  ) {
    if (cerrandoRef.current) return;

    cerrandoRef.current = true;

    limpiarTodo();

    ocultarAviso();

    const eraAdminMaster = Boolean(
      localStorage.getItem(
        "adminKonaxId"
      )
    );

    try {
      await supabase.auth.signOut({
        scope: "local",
      });
    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );
    }

    sessionStorage.setItem(
      "konaxCierreSesionMotivo",
      motivo
    );

    /* ========================================
       LIMPIAR DATOS LOCALES
       ======================================== */

    const clavesKonax = [
      "empresaId",
      "empresaNombre",

      "usuarioId",
      "authUserId",
      "usuarioNombre",
      "usuarioCorreo",
      "usuarioRol",
      "rolId",

      "tipoNegocio",
      "categoriaNegocio",

      "planCodigo",
      "planNombre",
      "estadoPlan",
      "estadoEmpresa",

      "recordarme",

      "konaxAccessToken",
      "konaxRefreshToken",
      "konaxUltimaActividad",

      "empresaAdminCreadaId",
      "empresaAdminCreadaNombre",

      "adminKonaxId",
      "adminKonaxNombre",
      "adminKonaxCorreo",
      "adminKonaxRol",
      "adminKonaxRole",
    ];

    clavesKonax.forEach((clave) => {
      localStorage.removeItem(clave);
    });

    /* ========================================
       REDIRECCIÓN
       ======================================== */

    if (eraAdminMaster) {
      window.location.replace(
        motivo === "inactividad"
          ? "/admin-login?motivo=inactividad"
          : "/admin-login"
      );

      return;
    }

    window.location.replace(
      motivo === "inactividad"
        ? "/login?motivo=inactividad"
        : "/login"
    );
  }

  /* ============================================
     RELOJ
     ============================================ */

  function formatearTiempo(segundos) {
    const minutos =
      Math.floor(segundos / 60);

    const segundosValor =
      segundos % 60;

    return `${String(minutos).padStart(
      2,
      "0"
    )}:${String(segundosValor).padStart(
      2,
      "0"
    )}`;
  }

  /* ============================================
     SIN AVISO
     ============================================ */

  if (!mostrarAviso) {
    return null;
  }

  /* ============================================
     MODAL
     ============================================ */

  return (
    <div style={s.overlay}>
      <div
        style={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="konax-aviso-inactividad"
      >
        <div style={s.iconBox}>
          ⏱
        </div>

        <span style={s.eyebrow}>
          SEGURIDAD KONAX
        </span>

        <h2
          id="konax-aviso-inactividad"
          style={s.title}
        >
          ¿Deseas continuar?
        </h2>

        <p style={s.text}>
          Detectamos varios minutos sin
          actividad. Para proteger tu
          información, la sesión se cerrará
          automáticamente si no confirmas que
          deseas continuar.
        </p>

        <div style={s.timerBox}>
          <span style={s.timerLabel}>
            Tiempo para responder
          </span>

          <strong style={s.timerValue}>
            {formatearTiempo(
              segundosRestantes
            )}
          </strong>
        </div>

        <button
          type="button"
          onClick={continuarSesion}
          style={s.continueButton}
          autoFocus
        >
          Sí, continuar sesión
        </button>

        <button
          type="button"
          onClick={() =>
            cerrarSesion("manual")
          }
          style={s.logoutButton}
        >
          Cerrar sesión
        </button>

        <span style={s.note}>
          Al continuar podrás seguir
          trabajando sin volver a ingresar tu
          correo ni contraseña.
        </span>
      </div>
    </div>
  );
}

/* ==============================================
   DISEÑO
   ============================================== */

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 99999,
    padding: 18,
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    background:
      "rgba(3, 17, 10, .72)",
    backdropFilter: "blur(6px)",
  },

  modal: {
    width: 420,
    maxWidth: "100%",
    padding: "28px 24px 22px",
    boxSizing: "border-box",
    border:
      "1px solid rgba(255,255,255,.8)",
    borderRadius: 24,
    background:
      "linear-gradient(180deg,#ffffff 0%,#f7faf8 100%)",
    boxShadow:
      "0 30px 90px rgba(0,0,0,.32)",
    textAlign: "center",
    color: "#17211c",
  },

  iconBox: {
    width: 58,
    height: 58,
    margin: "0 auto 14px",
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "#e9f7ef",
    color: "#16834f",
    fontSize: 27,
  },

  eyebrow: {
    display: "block",
    marginBottom: 7,
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.3,
  },

  title: {
    margin: 0,
    fontSize: 27,
    lineHeight: 1.1,
    fontWeight: 900,
  },

  text: {
    margin: "12px auto 0",
    maxWidth: 345,
    color: "#68756d",
    fontSize: 13,
    lineHeight: 1.55,
  },

  timerBox: {
    margin: "19px 0 16px",
    padding: "13px 14px",
    border:
      "1px solid #dce8e0",
    borderRadius: 15,
    background: "#f4f9f6",
  },

  timerLabel: {
    display: "block",
    color: "#7a877f",
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  timerValue: {
    display: "block",
    marginTop: 5,
    color: "#137347",
    fontSize: 25,
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: 1,
  },

  continueButton: {
    width: "100%",
    minHeight: 50,
    border: "none",
    borderRadius: 14,
    background:
      "linear-gradient(135deg,#16834f,#0f693d)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 12px 24px rgba(22,131,79,.20)",
  },

  logoutButton: {
    width: "100%",
    minHeight: 45,
    marginTop: 9,
    border:
      "1px solid #d7e0da",
    borderRadius: 14,
    background: "#fff",
    color: "#58655e",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },

  note: {
    display: "block",
    marginTop: 13,
    color: "#89958e",
    fontSize: 9.5,
    lineHeight: 1.4,
  },
};
