"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RestablecerPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [sesionLista, setSesionLista] = useState(false);
  const [mensaje, setMensaje] = useState("Validando enlace de recuperación...");

  useEffect(() => {
    validarSesionRecuperacion();

    const { data: suscripcion } = supabase.auth.onAuthStateChange(
      (evento, sesion) => {
        if (evento === "PASSWORD_RECOVERY" || sesion?.user) {
          setSesionLista(true);
          setMensaje("Escriba una contraseña nueva para su cuenta.");
        }
      }
    );

    return () => {
      suscripcion?.subscription?.unsubscribe();
    };
  }, []);

  async function validarSesionRecuperacion() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setMensaje("No se pudo validar el enlace. Solicite uno nuevo.");
      return;
    }

    if (data?.session?.user) {
      setSesionLista(true);
      setMensaje("Escriba una contraseña nueva para su cuenta.");
      return;
    }

    setTimeout(async () => {
      const { data: sesionPosterior } = await supabase.auth.getSession();

      if (!sesionPosterior?.session?.user) {
        setMensaje(
          "El enlace no es válido o venció. Regrese al inicio de sesión y solicite uno nuevo."
        );
      }
    }, 1800);
  }

  async function guardarPassword() {
    if (guardando) return;

    if (!sesionLista) {
      alert("El enlace de recuperación no está listo o ya venció.");
      return;
    }

    if (password.length < 8) {
      alert("La contraseña debe tener mínimo 8 caracteres.");
      return;
    }

    if (password !== confirmacion) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        alert("No se pudo actualizar la contraseña: " + error.message);
        return;
      }

      alert(
        "Contraseña actualizada correctamente. Inicie sesión con su nueva contraseña."
      );

      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      alert(
        "No se pudo actualizar la contraseña: " +
          (error?.message || "Error desconocido.")
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main style={s.pagina}>
      <section style={s.card}>
        <img src="/konax-logo.png" alt="KONAX" style={s.logo} />
        <span style={s.etiqueta}>SEGURIDAD DE LA CUENTA</span>
        <h1 style={s.titulo}>Crear contraseña nueva</h1>
        <p style={s.texto}>{mensaje}</p>

        <label style={s.campo}>
          <span>Nueva contraseña</span>
          <div style={s.passwordWrap}>
            <input
              type={mostrar ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              style={s.input}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setMostrar((v) => !v)} style={s.ver}>
              {mostrar ? "Ocultar" : "Ver"}
            </button>
          </div>
        </label>

        <label style={s.campo}>
          <span>Confirmar contraseña</span>
          <input
            type={mostrar ? "text" : "password"}
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            placeholder="Repita la contraseña"
            style={s.input}
            autoComplete="new-password"
          />
        </label>

        <button
          type="button"
          onClick={guardarPassword}
          disabled={!sesionLista || guardando}
          style={!sesionLista || guardando ? s.botonDeshabilitado : s.boton}
        >
          {guardando ? "Actualizando..." : "Guardar nueva contraseña"}
        </button>

        <button type="button" onClick={() => router.replace("/login")} style={s.volver}>
          Volver al inicio de sesión
        </button>
      </section>
    </main>
  );
}

const s = {
  pagina: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 22, boxSizing: "border-box", background: "radial-gradient(circle at top,#17673e,#07100b 72%)", fontFamily: 'Inter, Arial, system-ui, sans-serif' },
  card: { width: "min(470px,100%)", padding: 30, boxSizing: "border-box", borderRadius: 24, background: "#ffffff", boxShadow: "0 28px 70px rgba(0,0,0,.28)" },
  logo: { display: "block", width: 210, maxWidth: "75%", margin: "0 auto 20px" },
  etiqueta: { display: "block", color: "#16834f", fontSize: 10, fontWeight: 900, letterSpacing: 1.2, textAlign: "center" },
  titulo: { margin: "7px 0 10px", color: "#17211c", fontSize: 29, textAlign: "center" },
  texto: { margin: "0 0 22px", color: "#68756d", lineHeight: 1.55, textAlign: "center" },
  campo: { display: "grid", gap: 7, marginBottom: 15, color: "#374151", fontSize: 13, fontWeight: 800 },
  passwordWrap: { display: "grid", gridTemplateColumns: "1fr auto" },
  input: { width: "100%", minHeight: 46, padding: "11px 13px", boxSizing: "border-box", border: "1px solid #ccd7d0", borderRadius: 11, background: "#fff", fontSize: 14 },
  ver: { marginLeft: 7, padding: "0 13px", border: "1px solid #ccd7d0", borderRadius: 11, background: "#f5f7f6", fontWeight: 800, cursor: "pointer" },
  boton: { width: "100%", minHeight: 48, marginTop: 4, border: "none", borderRadius: 12, background: "linear-gradient(135deg,#159552,#08743c)", color: "#fff", fontWeight: 900, cursor: "pointer" },
  botonDeshabilitado: { width: "100%", minHeight: 48, marginTop: 4, border: "none", borderRadius: 12, background: "#cbd5cf", color: "#647069", fontWeight: 900, cursor: "not-allowed" },
  volver: { width: "100%", minHeight: 44, marginTop: 10, border: "1px solid #ccd7d0", borderRadius: 11, background: "#fff", color: "#17211c", fontWeight: 800, cursor: "pointer" },
};
