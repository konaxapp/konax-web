"use client";

// KONAX · Cierre automático por inactividad
// VERSION 2026.08.27
// Tiempo: 5 minutos

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";

const TIEMPO_INACTIVIDAD = 5 * 60 * 1000;
const CLAVE_ULTIMA_ACTIVIDAD = "konaxUltimaActividad";

const RUTAS_PUBLICAS = [
  "/login",
  "/admin-login",
  "/crear-contrasena",
  "/reservar",
];

export default function SessionInactivityGuard() {
  const pathname = usePathname();

  const cerrandoRef = useRef(false);
  const timeoutRef = useRef(null);
  const ultimaActualizacionRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const esRutaPublica = RUTAS_PUBLICAS.some(
      (ruta) =>
        pathname === ruta ||
        pathname?.startsWith(`${ruta}/`)
    );

    if (esRutaPublica) {
      limpiarTemporizador();
      return;
    }

    const tieneSesionKonax = Boolean(
      localStorage.getItem("usuarioId") ||
        localStorage.getItem("adminKonaxId")
    );

    if (!tieneSesionKonax) {
      limpiarTemporizador();
      return;
    }

    // Si por alguna razón no existe la marca de actividad,
    // comenzamos a contar desde este momento.
    if (!localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)) {
      localStorage.setItem(
        CLAVE_ULTIMA_ACTIVIDAD,
        String(Date.now())
      );
    }

    verificarInactividad();

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

    window.addEventListener(
      "storage",
      manejarActividadOtraPestana
    );

    document.addEventListener(
      "visibilitychange",
      manejarVisibilidad
    );

    // Verificación adicional.
    // Sirve cuando el navegador ralentiza temporizadores
    // mientras la pestaña está en segundo plano.
    const intervalo = window.setInterval(() => {
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

      window.clearInterval(intervalo);

      limpiarTemporizador();
    };
  }, [pathname]);

  function limpiarTemporizador() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function programarCierre() {
    limpiarTemporizador();

    const ultimaActividad = Number(
      localStorage.getItem(
        CLAVE_ULTIMA_ACTIVIDAD
      ) || Date.now()
    );

    const transcurrido =
      Date.now() - ultimaActividad;

    const restante =
      TIEMPO_INACTIVIDAD - transcurrido;

    if (restante <= 0) {
      cerrarPorInactividad();
      return;
    }

    timeoutRef.current = window.setTimeout(
      cerrarPorInactividad,
      restante
    );
  }

  function registrarActividad() {
    if (cerrandoRef.current) return;

    const ahora = Date.now();

    // Evitamos escribir en localStorage cientos de veces
    // por segundo.
    if (
      ahora -
        ultimaActualizacionRef.current <
      1000
    ) {
      return;
    }

    ultimaActualizacionRef.current = ahora;

    localStorage.setItem(
      CLAVE_ULTIMA_ACTIVIDAD,
      String(ahora)
    );

    programarCierre();
  }

  function manejarActividadOtraPestana(evento) {
    if (
      evento.key ===
      CLAVE_ULTIMA_ACTIVIDAD
    ) {
      programarCierre();
    }
  }

  function manejarVisibilidad() {
    if (
      document.visibilityState === "visible"
    ) {
      verificarInactividad();
    }
  }

  function verificarInactividad() {
    if (cerrandoRef.current) return;

    const tieneSesionKonax = Boolean(
      localStorage.getItem("usuarioId") ||
        localStorage.getItem("adminKonaxId")
    );

    if (!tieneSesionKonax) {
      limpiarTemporizador();
      return;
    }

    const ultimaActividad = Number(
      localStorage.getItem(
        CLAVE_ULTIMA_ACTIVIDAD
      ) || 0
    );

    if (!ultimaActividad) {
      registrarActividad();
      return;
    }

    const tiempoTranscurrido =
      Date.now() - ultimaActividad;

    if (
      tiempoTranscurrido >=
      TIEMPO_INACTIVIDAD
    ) {
      cerrarPorInactividad();
      return;
    }

    programarCierre();
  }

  async function cerrarPorInactividad() {
    if (cerrandoRef.current) return;

    cerrandoRef.current = true;

    limpiarTemporizador();

    const eraAdminMaster = Boolean(
      localStorage.getItem(
        "adminKonaxId"
      )
    );

    try {
      // Cerramos solamente la sesión de este navegador.
      await supabase.auth.signOut({
        scope: "local",
      });
    } catch (error) {
      console.error(
        "Error cerrando sesión por inactividad:",
        error
      );
    }

    // Esta bandera permite que el login explique
    // por qué se cerró la sesión.
    sessionStorage.setItem(
      "konaxCierreSesionMotivo",
      "inactividad"
    );

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

    if (eraAdminMaster) {
      window.location.replace(
        "/admin-login?motivo=inactividad"
      );
      return;
    }

    window.location.replace(
      "/login"
    );
  }

  return null;
}
