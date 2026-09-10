"use client";

// KONAX · Control de sesión por inactividad
// VERSION PRUEBA 2026.09.10
// Aviso: 20 segundos sin actividad
// Cierre automático: 10 segundos después del aviso

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

/* ============================================
   TIEMPOS DE PRUEBA
   ============================================ */

const TIEMPO_HASTA_AVISO = 20 * 1000; // 20 segundos
const TIEMPO_GRACIA = 10 * 1000; // 10 segundos

const TIEMPO_TOTAL_INACTIVIDAD =
  TIEMPO_HASTA_AVISO + TIEMPO_GRACIA;

const CLAVE_ULTIMA_ACTIVIDAD = "konaxUltimaActividad";

/* ============================================
   RUTAS DONDE NO SE APLICA EL BLOQUEO
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
     MANTENER SINCRONIZADO EL ESTADO DEL AVISO
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

    /*
      Si todavía no existe una última actividad,
      registrar el momento actual.
    */

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
       EVENTOS QUE CUENTAN COMO ACTIVIDAD
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

    /*
      Si KONAX está abierto en otra pestaña,
      mantener la actividad sincronizada.
    */

    window.addEventListener(
      "storage",
      manejarActividadOtraPestana
    );

    /*
      Si el usuario vuelve a la aplicación
      después de dejarla en segundo plano.
    */

    document.addEventListener(
      "visibilitychange",
      manejarVisibilidad
    );

    /*
      Verificación adicional cada 5 segundos
      durante esta prueba.
    */

    const intervaloVerificacion =
      window.setInterval(() => {
        verificarInactividad();
      }, 5000);

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
     LIMPIEZA DE TEMPORIZADORES
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
     OBTENER ÚLTIMA ACTIVIDAD
     ============================================ */

  function obtenerUltimaActividad() {
    return Number(
      localStorage.getItem(
        CLAVE_ULTIMA_ACTIVIDAD
      ) || 0
    );
  }

  /* ============================================
     PROGRAMAR PRÓXIMO AVISO
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

    /*
      Si ya pasó todo el tiempo permitido,
      cerrar.
    */

    if (
      transcurrido >=
      TIEMPO_TOTAL_INACTIVIDAD
    ) {
      cerrarSesion("inactividad");
      return;
    }

    /*
      Si ya pasaron los 20 segundos,
      mostrar aviso.
    */

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
     MOSTRAR AVISO
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

    /*
      Si hubo actividad recientemente,
      no mostrar aviso.
    */

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

    /*
      Programar cierre definitivo.
    */

    timeoutCierreRef.current =
      window.setTimeout(
        () =>
          cerrarSesion("inactividad"),
        restante
      );

    limpiarCuentaRegresiva();

    /*
      Actualizar reloj cada segundo.
    */

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
     REGISTRAR ACTIVIDAD NORMAL
     ============================================ */

  function registrarActividad() {
    if (cerrandoRef.current) return;

    /*
      MUY IMPORTANTE:

      Una vez aparezca el aviso, hacer scroll,
      tocar fuera del modal o mover la pantalla
      NO extiende automáticamente la sesión.

      El usuario tiene que tocar:
      "Sí, continuar sesión".
    */

    if (avisoVisibleRef.current) {
      return;
    }

    const ahora = Date.now();

    /*
      Evitar escribir en localStorage demasiadas
      veces cuando hay muchos eventos seguidos.
    */

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
     OTRA PESTAÑA
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

    /*
      Si hubo actividad en otra pestaña,
      quitar el aviso.
    */

    if (
      transcurrido <
      TIEMPO_HASTA_AVISO
    ) {
      ocultarAviso();
    }

    programarControl();
  }

  /* ============================================
     APP VUELVE A PRIMER PLANO
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

    /*
      Limpiar información local de KONAX.
    */

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

    /*
      Redirección según tipo de usuario.
    */

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
     FORMATO DEL RELOJ
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
     SIN AVISO = NO MOSTRAR NADA
     ============================================ */

  if (!mostrarAviso) {
    return null;
  }

  /* ============================================
     MODAL DE AVISO
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
          Detectamos un periodo sin actividad.
          Para proteger tu información, la
          sesión se cerrará automáticamente si
          no confirmas que deseas continuar.
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
          Al continuar podrás seguir trabajando
          sin volver a ingresar tu correo y
          contraseña.
        </span>
      </div>
    </div>
  );
}

/* ==============================================
   DISEÑO DEL MODAL
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
