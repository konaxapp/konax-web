"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabasePortalAlumno as supabase } from "../../../../lib/supabasePortalAlumno";

export default function PortalAlumnoInicioTemporal() {
  const params = useParams();
  const router = useRouter();

  const slug = String(params?.slug || "").trim();

  const [cargando, setCargando] = useState(true);
  const [cuenta, setCuenta] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarCuenta();
  }, [slug]);

  async function cargarCuenta() {
    if (!slug) {
      setError("Portal inválido.");
      setCargando(false);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        router.replace(
          `/alumno/${encodeURIComponent(slug)}`
        );
        return;
      }

      const { data, error: errorCuenta } =
        await supabase.rpc(
          "obtener_mi_cuenta_alumno",
          {
            p_slug: slug,
          }
        );

      if (errorCuenta) throw errorCuenta;

      setCuenta(data);
    } catch (err) {
      setError(
        err?.message ||
          "No se pudo cargar tu cuenta."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();

    router.replace(
      `/alumno/${encodeURIComponent(slug)}`
    );
  }

  if (cargando) {
    return (
      <main style={s.center}>
        <strong>Validando tu cuenta...</strong>
      </main>
    );
  }

  if (error || !cuenta?.ok) {
    return (
      <main style={s.center}>
        <div style={s.card}>
          <strong>No pudimos abrir tu cuenta</strong>
          <span>{error}</span>

          <button
            type="button"
            onClick={cerrarSesion}
            style={s.button}
          >
            Volver al acceso
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <section style={s.card}>
        <span style={s.eyebrow}>
          PORTAL DEL ALUMNO · FASE 1
        </span>

        <h1 style={s.title}>
          Hola, {cuenta.nombre}
        </h1>

        <p style={s.text}>
          Tu acceso quedó conectado correctamente con{" "}
          <strong>{cuenta.empresa_nombre}</strong>.
        </p>

        <div style={s.okBox}>
          <strong>✓ Acceso del alumno funcionando</strong>
          <span>
            El siguiente paso será convertir esta pantalla
            en el Portal completo: membresía, QR, pagos,
            agenda y progreso.
          </span>
        </div>

        <div style={s.infoGrid}>
          <Dato
            label="Identificación"
            value={cuenta.cedula || "-"}
          />

          <Dato
            label="Teléfono"
            value={cuenta.telefono || "-"}
          />

          <Dato
            label="Correo"
            value={cuenta.correo || "-"}
          />
        </div>

        <button
          type="button"
          onClick={cerrarSesion}
          style={s.button}
        >
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}

function Dato({ label, value }) {
  return (
    <div style={s.info}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background: "#F2F6F3",
    color: "#17211C",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, sans-serif',
  },

  center: {
    minHeight: "100vh",
    padding: 18,
    display: "grid",
    placeItems: "center",
    background: "#F2F6F3",
    color: "#173C2A",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, sans-serif',
  },

  card: {
    width: "min(620px,100%)",
    padding: 24,
    display: "grid",
    gap: 14,
    border: "1px solid #D8E5DD",
    borderRadius: 21,
    background: "#FFFFFF",
    boxShadow:
      "0 18px 45px rgba(15,23,42,.07)",
  },

  eyebrow: {
    color: "#16834F",
    fontSize: 8.5,
    fontWeight: 950,
    letterSpacing: 1,
  },

  title: {
    margin: 0,
    fontSize: 30,
  },

  text: {
    margin: 0,
    color: "#65736B",
    fontSize: 11,
    lineHeight: 1.55,
  },

  okBox: {
    padding: 14,
    display: "grid",
    gap: 5,
    border: "1px solid #BFE0CB",
    borderRadius: 13,
    background: "#EFF9F3",
    color: "#17663D",
    fontSize: 10,
    lineHeight: 1.5,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(150px,1fr))",
    gap: 8,
  },

  info: {
    padding: 11,
    display: "grid",
    gap: 4,
    borderRadius: 11,
    background: "#F7FAF8",
  },

  button: {
    minHeight: 42,
    border: 0,
    borderRadius: 10,
    background: "#173C2A",
    color: "#FFFFFF",
    fontWeight: 900,
    cursor: "pointer",
  },
};
