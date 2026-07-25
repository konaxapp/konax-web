CAMBIOS PARA app/login/page.js

1. AGREGAR ESTE ESTADO JUNTO A LOS DEMÁS useState:

const [recuperando, setRecuperando] = useState(false);

2. REEMPLAZAR COMPLETAMENTE ESTA FUNCIÓN:

function recuperarPassword() {
  alert(
    "Para recuperar su contraseña, contacte al administrador de su empresa o al soporte de KONAX."
  );
}

POR ESTA:

async function recuperarPassword() {
  if (recuperando) return;

  const correoLimpio = correo.trim().toLowerCase();

  if (!correoLimpio || !correoLimpio.includes("@")) {
    alert(
      "Escriba primero el correo de la cuenta que desea recuperar."
    );
    return;
  }

  setRecuperando(true);

  try {
    const redirectTo =
      `${window.location.origin}/restablecer-password`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        correoLimpio,
        { redirectTo }
      );

    if (error) {
      alert(
        "No se pudo enviar el correo de recuperación: " +
          error.message
      );
      return;
    }

    alert(
      "Se envió un enlace de recuperación al correo indicado. Revise también la carpeta de correo no deseado."
    );
  } catch (error) {
    alert(
      "No se pudo iniciar la recuperación: " +
        (error?.message || "Error desconocido.")
    );
  } finally {
    setRecuperando(false);
  }
}

3. REEMPLAZAR EL BOTÓN ¿OLVIDASTE TU CONTRASEÑA? POR:

<button
  type="button"
  className={styles.forgotLink}
  onClick={recuperarPassword}
  disabled={recuperando}
>
  {recuperando
    ? "Enviando enlace..."
    : "¿Olvidaste tu contraseña?"}
</button>
