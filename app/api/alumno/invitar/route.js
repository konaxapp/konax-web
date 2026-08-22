import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const correo = String(body?.correo || "")
      .trim()
      .toLowerCase();

    if (!correo || !correo.includes("@")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe indicar un correo válido.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "Faltan variables de entorno de Supabase."
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "El servidor no está configurado correctamente.",
        },
        { status: 500 }
      );
    }

    /*
     * IMPORTANTE:
     * Este cliente usa la clave secreta únicamente
     * en el servidor.
     *
     * SUPABASE_SERVICE_ROLE_KEY nunca debe utilizarse
     * en componentes del navegador.
     */
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /*
     * URL a la que llegará el alumno después
     * de aceptar la invitación.
     *
     * Más adelante crearemos esta pantalla.
     */
    const redirectTo =
      "https://app.konax.net/alumno/activar";

    /*
     * Enviamos la invitación utilizando
     * Supabase Auth.
     */
    const {
      data: invitacion,
      error: errorInvitacion,
    } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(
        correo,
        {
          redirectTo,
          data: {
            tipo_usuario: "alumno",
          },
        }
      );

    if (errorInvitacion) {
      console.error(
        "Error invitando alumno:",
        errorInvitacion
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            errorInvitacion.message ||
            "No se pudo enviar la invitación.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        mensaje:
          "Invitación enviada correctamente al alumno.",
        usuario_id:
          invitacion?.user?.id || null,
        correo,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Error inesperado en /api/alumno/invitar:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Ocurrió un error inesperado al procesar la invitación.",
      },
      { status: 500 }
    );
  }
}
