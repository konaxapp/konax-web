import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function responder(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizar(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return responder(
      {
        error: "Método no permitido.",
      },
      405,
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return responder(
        {
          error:
            "Faltan las variables internas de Supabase.",
        },
        500,
      );
    }

    const authorization =
      req.headers.get("Authorization");

    if (
      !authorization?.startsWith("Bearer ")
    ) {
      return responder(
        {
          error:
            "No se recibió una sesión válida.",
        },
        401,
      );
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // ========================================================
    // 1. VALIDAR QUIÉN ESTÁ ENVIANDO LA INVITACIÓN
    // ========================================================

    const {
      data: datosAuth,
      error: errorAuth,
    } = await supabaseAdmin.auth.getUser(
      accessToken,
    );

    if (
      errorAuth ||
      !datosAuth?.user
    ) {
      console.error(
        "Error validando la sesión:",
        errorAuth,
      );

      return responder(
        {
          error:
            "La sesión no es válida o ha vencido.",
        },
        401,
      );
    }

    const correoAutenticado = String(
      datosAuth.user.email || "",
    )
      .trim()
      .toLowerCase();

    // ========================================================
    // 2. LEER DATOS
    // ========================================================

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return responder(
        {
          error:
            "No se recibieron datos válidos.",
        },
        400,
      );
    }

    const nombre =
      String(body.nombre || "").trim();

    const correo =
      String(body.correo || "")
        .trim()
        .toLowerCase();

    const rol =
      String(body.rol || "").trim();

    const rolId =
      body.rol_id ||
      body.rolId ||
      null;

    const empresaIdSolicitada =
      String(
        body.empresa_id ||
          body.empresaId ||
          "",
      ).trim();

    if (!nombre) {
      return responder(
        {
          error:
            "Ingrese el nombre del usuario.",
        },
        400,
      );
    }

    if (
      !correo ||
      !correo.includes("@")
    ) {
      return responder(
        {
          error:
            "Ingrese un correo válido.",
        },
        400,
      );
    }

    if (!rol) {
      return responder(
        {
          error:
            "Seleccione un rol.",
        },
        400,
      );
    }

    // ========================================================
    // 3. VALIDAR ADMINISTRADOR KONAX
    // ========================================================

    const {
      data: adminMaster,
      error: errorAdminMaster,
    } = await supabaseAdmin
      .from("administradores_konax")
      .select(
        "id,nombre,correo,rol,estado,auth_user_id",
      )
      .or(
        `auth_user_id.eq.${datosAuth.user.id},correo.ilike.${correoAutenticado}`,
      )
      .maybeSingle();

    if (errorAdminMaster) {
      return responder(
        {
          error:
            "No se pudo validar al administrador KONAX: " +
            errorAdminMaster.message,
        },
        500,
      );
    }

    // ========================================================
    // 4. VALIDAR ADMINISTRADOR DE EMPRESA
    // ========================================================

    const {
      data: administradorEmpresa,
      error: errorAdministradorEmpresa,
    } = await supabaseAdmin
      .from("usuarios")
      .select(
        "id,empresa_id,nombre,correo,rol,estado,auth_user_id",
      )
      .or(
        `auth_user_id.eq.${datosAuth.user.id},correo.ilike.${correoAutenticado}`,
      )
      .maybeSingle();

    if (errorAdministradorEmpresa) {
      return responder(
        {
          error:
            "No se pudo validar al usuario de la empresa: " +
            errorAdministradorEmpresa.message,
        },
        500,
      );
    }

    if (
      !adminMaster &&
      !administradorEmpresa
    ) {
      return responder(
        {
          error:
            "El usuario autenticado no está vinculado con KONAX.",
        },
        403,
      );
    }

    // ========================================================
    // 5. DETERMINAR EMPRESA
    // ========================================================

    let empresaId = "";
    let tipoCreador = "";

    if (adminMaster) {
      if (
        normalizar(adminMaster.estado) !==
        "activo"
      ) {
        return responder(
          {
            error:
              "El administrador KONAX está inactivo.",
          },
          403,
        );
      }

      const rolesAdminMaster = [
        "superadmin",
        "admin_master",
        "administrador_master",
        "administrador",
      ];

      if (
        !rolesAdminMaster.includes(
          normalizar(adminMaster.rol),
        )
      ) {
        return responder(
          {
            error:
              "No tiene autorización para crear usuarios.",
          },
          403,
        );
      }

      if (!empresaIdSolicitada) {
        return responder(
          {
            error:
              "No se recibió la empresa seleccionada.",
          },
          400,
        );
      }

      const {
        data: empresa,
        error: errorEmpresa,
      } = await supabaseAdmin
        .from("empresas")
        .select("id,nombre")
        .eq("id", empresaIdSolicitada)
        .maybeSingle();

      if (errorEmpresa) {
        return responder(
          {
            error:
              "No se pudo validar la empresa: " +
              errorEmpresa.message,
          },
          500,
        );
      }

      if (!empresa) {
        return responder(
          {
            error:
              "La empresa seleccionada no existe.",
          },
          404,
        );
      }

      empresaId = empresaIdSolicitada;
      tipoCreador = "admin_master";
    }

    if (
      !adminMaster &&
      administradorEmpresa
    ) {
      if (
        normalizar(
          administradorEmpresa.estado,
        ) !== "activo"
      ) {
        return responder(
          {
            error:
              "El usuario administrador está inactivo.",
          },
          403,
        );
      }

      const rolesEmpresaAutorizados = [
        "administrador",
        "superadmin",
      ];

      if (
        !rolesEmpresaAutorizados.includes(
          normalizar(
            administradorEmpresa.rol,
          ),
        )
      ) {
        return responder(
          {
            error:
              "Solo un administrador puede crear usuarios.",
          },
          403,
        );
      }

      if (
        !administradorEmpresa.empresa_id
      ) {
        return responder(
          {
            error:
              "El administrador no tiene una empresa vinculada.",
          },
          403,
        );
      }

      empresaId = String(
        administradorEmpresa.empresa_id,
      );

      tipoCreador =
        "administrador_empresa";

      if (
        empresaIdSolicitada &&
        empresaIdSolicitada !== empresaId
      ) {
        return responder(
          {
            error:
              "No puede crear usuarios para otra empresa.",
          },
          403,
        );
      }
    }

    if (!empresaId) {
      return responder(
        {
          error:
            "No se pudo determinar la empresa del usuario.",
        },
        400,
      );
    }

    // ========================================================
    // 6. EVITAR DUPLICADOS EN USUARIOS
    // ========================================================

    const {
      data: usuarioExistente,
      error: errorBuscarExistente,
    } = await supabaseAdmin
      .from("usuarios")
      .select(
        "id,correo,empresa_id,auth_user_id",
      )
      .ilike("correo", correo)
      .maybeSingle();

    if (errorBuscarExistente) {
      return responder(
        {
          error:
            "No se pudo verificar el correo: " +
            errorBuscarExistente.message,
        },
        500,
      );
    }

    if (usuarioExistente) {
      return responder(
        {
          error:
            "Ya existe un usuario KONAX con ese correo.",
        },
        409,
      );
    }

    // ========================================================
    // 7. ENVIAR INVITACIÓN
    //
    // IMPORTANTE:
    // Aquí ya NO existe ninguna contraseña inicial.
    // ========================================================

    const {
      data: invitacion,
      error: errorInvitacion,
    } =
      await supabaseAdmin.auth.admin
        .inviteUserByEmail(
          correo,
          {
            redirectTo:
              "https://app.konax.net/crear-contrasena",

            data: {
              nombre,
              rol,
              empresa_id: empresaId,
              origen: "konax_invitacion",
            },
          },
        );

    if (
      errorInvitacion ||
      !invitacion?.user
    ) {
      console.error(
        "Error enviando invitación:",
        errorInvitacion,
      );

      return responder(
        {
          error:
            "No se pudo enviar la invitación: " +
            (
              errorInvitacion?.message ||
              "Error desconocido"
            ),
        },
        400,
      );
    }

    // ========================================================
    // 8. REGISTRAR USUARIO EN KONAX
    // ========================================================

    const {
      data: nuevoUsuario,
      error: errorCrearUsuario,
    } = await supabaseAdmin
      .from("usuarios")
      .insert([
        {
          empresa_id: empresaId,
          nombre,
          correo,
          rol,
          rol_id: rolId,

          // El usuario está habilitado en KONAX,
          // pero todavía debe crear su contraseña.
          estado: "Activo",

          auth_user_id:
            invitacion.user.id,
        },
      ])
      .select(
        `
          id,
          empresa_id,
          nombre,
          correo,
          rol,
          rol_id,
          estado,
          auth_user_id
        `,
      )
      .single();

    if (errorCrearUsuario) {
      console.error(
        "Error guardando usuario KONAX:",
        errorCrearUsuario,
      );

      // Evitamos dejar un usuario huérfano en Auth.
      await supabaseAdmin.auth.admin.deleteUser(
        invitacion.user.id,
      );

      return responder(
        {
          error:
            "La invitación se generó, pero no se pudo guardar el usuario en KONAX: " +
            errorCrearUsuario.message,
        },
        500,
      );
    }

    // ========================================================
    // 9. RESPUESTA
    // ========================================================

    return responder({
      ok: true,

      message:
        `Invitación enviada correctamente a ${correo}. ` +
        "El usuario deberá abrir el correo y crear su propia contraseña.",

      tipo_creador: tipoCreador,

      empresa_id: empresaId,

      invitacion_enviada: true,

      usuario: nuevoUsuario,
    });
  } catch (error) {
    console.error(
      "Error inesperado:",
      error,
    );

    return responder(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      },
      500,
    );
  }
});
