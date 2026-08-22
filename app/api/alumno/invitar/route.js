import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
}

function limpiarCorreo(valor) {
  return limpiarTexto(valor).toLowerCase();
}

export async function POST(request) {
  try {
    // =====================================================
    // 1. VARIABLES DEL SERVIDOR
    // =====================================================

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
            "El servidor no tiene configuradas las credenciales necesarias.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // 2. LEER PETICIÓN
    // =====================================================

    const body = await request.json();

    const clienteId = limpiarTexto(
      body?.clienteId
    );

    const empresaId = limpiarTexto(
      body?.empresaId
    );

    if (!clienteId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se recibió el ID del alumno.",
        },
        {
          status: 400,
        }
      );
    }

    if (!empresaId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se recibió la empresa del alumno.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // 3. CLIENTE ADMINISTRATIVO DE SUPABASE
    // =====================================================
    //
    // IMPORTANTE:
    // Este cliente existe únicamente en el servidor.
    //
    // SUPABASE_SERVICE_ROLE_KEY
    // JAMÁS debe utilizarse en un archivo "use client".
    // =====================================================

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

    // =====================================================
    // 4. VALIDAR LA SESIÓN EMPRESARIAL
    // =====================================================

    const authorization =
      request.headers.get("authorization") || "";

    const accessToken =
      authorization.startsWith("Bearer ")
        ? authorization.substring(7).trim()
        : "";

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No existe una sesión empresarial válida.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (
      authError ||
      !authData?.user?.id
    ) {
      console.error(
        "Error validando sesión:",
        authError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "La sesión empresarial no es válida o ha vencido.",
        },
        {
          status: 401,
        }
      );
    }

    const authUserId =
      authData.user.id;

    // =====================================================
    // 5. BUSCAR USUARIO EMPRESARIAL
    // =====================================================

    const {
      data: usuarioEmpresa,
      error: errorUsuario,
    } = await supabaseAdmin
      .from("usuarios")
      .select(
        `
          id,
          auth_user_id,
          empresa_id,
          nombre,
          correo,
          rol,
          estado
        `
      )
      .eq(
        "auth_user_id",
        authUserId
      )
      .maybeSingle();

    if (errorUsuario) {
      console.error(
        "Error buscando usuario empresarial:",
        errorUsuario
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo validar el usuario empresarial.",
        },
        {
          status: 500,
        }
      );
    }

    if (!usuarioEmpresa) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La cuenta autenticada no corresponde a un usuario empresarial de KONAX.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      limpiarTexto(usuarioEmpresa.estado)
        .toLowerCase() !== "activo"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El usuario empresarial se encuentra inactivo.",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================================
    // 6. VALIDAR QUE LA EMPRESA SEA LA MISMA
    // =====================================================

    if (
      String(usuarioEmpresa.empresa_id) !==
      String(empresaId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No tiene autorización para activar alumnos de esta empresa.",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================================
    // 7. BUSCAR ALUMNO
    // =====================================================

    const {
      data: alumno,
      error: errorAlumno,
    } = await supabaseAdmin
      .from("clientes")
      .select(
        `
          id,
          empresa_id,
          nombre,
          correo,
          estado,
          auth_user_id,
          acceso_portal,
          portal_activado_en
        `
      )
      .eq("id", clienteId)
      .eq(
        "empresa_id",
        usuarioEmpresa.empresa_id
      )
      .maybeSingle();

    if (errorAlumno) {
      console.error(
        "Error buscando alumno:",
        errorAlumno
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo consultar el alumno.",
        },
        {
          status: 500,
        }
      );
    }

    if (!alumno) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El alumno no existe o no pertenece a esta empresa.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // 8. VALIDAR CORREO DEL ALUMNO
    // =====================================================

    const correoAlumno =
      limpiarCorreo(alumno.correo);

    if (
      !correoAlumno ||
      !correoAlumno.includes("@")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El alumno no tiene un correo electrónico válido. Agregue su correo antes de activar el portal.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // 9. EVITAR ACTIVACIÓN DUPLICADA
    // =====================================================

    if (
      alumno.auth_user_id &&
      alumno.acceso_portal
    ) {
      return NextResponse.json(
        {
          ok: true,
          yaActivado: true,
          mensaje:
            "Este alumno ya tiene el portal activado.",
          clienteId: alumno.id,
          authUserId:
            alumno.auth_user_id,
          correo: correoAlumno,
        },
        {
          status: 200,
        }
      );
    }

    // =====================================================
    // 10. URL DE ACTIVACIÓN DEL ALUMNO
    // =====================================================
    //
    // Esta será la próxima pantalla que construiremos.
    // =====================================================

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      "https://app.konax.net";

    const redirectTo =
      `${origin}/alumno/activar`;

    // =====================================================
    // 11. INVITAR AL ALUMNO EN SUPABASE AUTH
    // =====================================================

    const {
      data: invitacion,
      error: errorInvitacion,
    } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(
        correoAlumno,
        {
          redirectTo,
          data: {
            tipo_usuario:
              "alumno",
            cliente_id:
              String(alumno.id),
            empresa_id:
              String(alumno.empresa_id),
            nombre:
              alumno.nombre || "",
          },
        }
      );

    if (errorInvitacion) {
      console.error(
        "Error creando invitación del alumno:",
        errorInvitacion
      );

      const mensaje =
        limpiarTexto(
          errorInvitacion.message
        ).toLowerCase();

      if (
        mensaje.includes(
          "already"
        ) ||
        mensaje.includes(
          "registered"
        ) ||
        mensaje.includes(
          "exists"
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            codigo:
              "CORREO_YA_REGISTRADO",
            error:
              "Ese correo ya existe en Supabase Auth. No se creó una segunda cuenta. Debemos revisar a qué usuario pertenece antes de vincularlo.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            errorInvitacion.message ||
            "No se pudo enviar la invitación al alumno.",
        },
        {
          status: 400,
        }
      );
    }

    const nuevoAuthUserId =
      invitacion?.user?.id;

    if (!nuevoAuthUserId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase procesó la invitación, pero no devolvió el usuario creado.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // 12. VINCULAR AUTH CON CLIENTES
    // =====================================================
    //
    // Utilizamos la función que YA creamos:
    //
    // public.activar_portal_alumno(
    //   p_cliente_id,
    //   p_auth_user_id
    // )
    //
    // =====================================================

    const {
      data: portalActivado,
      error: errorActivacion,
    } = await supabaseAdmin.rpc(
      "activar_portal_alumno",
      {
        p_cliente_id:
          alumno.id,
        p_auth_user_id:
          nuevoAuthUserId,
      }
    );

    if (errorActivacion) {
      console.error(
        "Error vinculando portal:",
        errorActivacion
      );

      /*
       * IMPORTANTE:
       *
       * Si llegamos aquí, Supabase Auth ya creó
       * el usuario.
       *
       * NO eliminamos automáticamente ese usuario
       * porque queremos evitar borrar una cuenta
       * por accidente.
       */

      return NextResponse.json(
        {
          ok: false,
          codigo:
            "ERROR_VINCULACION",
          error:
            "La invitación fue creada, pero no se pudo vincular el usuario con el alumno. No vuelva a invitarlo hasta revisar este registro.",
          authUserId:
            nuevoAuthUserId,
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // 13. RESPUESTA FINAL
    // =====================================================

    return NextResponse.json(
      {
        ok: true,
        yaActivado: false,
        mensaje:
          "Portal del alumno activado e invitación enviada correctamente.",
        clienteId:
          alumno.id,
        authUserId:
          nuevoAuthUserId,
        correo:
          correoAlumno,
        portalActivado:
          Boolean(portalActivado),
      },
      {
        status: 200,
      }
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
          "Ocurrió un error inesperado al activar el portal del alumno.",
      },
      {
        status: 500,
      }
    );
  }
}
