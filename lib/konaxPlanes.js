import { supabase } from "./supabase";

export const PLANES_KONAX = {
  cobros: {
    codigo: "cobros",
    nombre: "KONAX Cobros",
    precio: 49,
    usuarios: 3,
    modulos: {
      clientes: true,
      vista_cliente: true,
      venta_credito: false,
      caja: true,
      cobranza: true,
      dashboard_cobros: true,
      inventario: false,
      control_caja: false,
      suscripciones: false,
      recargos: false,
      dashboard_ventas: false,
      egresos: false,

      agenda: false,
      servicios_horarios: false,
      profesionales: false,
      reportes: false,
      reporte_financiero: false,
      configuracion: false,
    },
  },

  ventas_gestion: {
    codigo: "ventas_gestion",
    nombre: "KONAX Ventas y Gestión",
    precio: 99,
    usuarios: 6,
    modulos: {
      clientes: true,
      vista_cliente: true,
      venta_credito: true,
      caja: true,
      cobranza: true,
      dashboard_cobros: true,
      inventario: true,
      control_caja: true,
      suscripciones: false,
      recargos: true,
      dashboard_ventas: true,
      egresos: true,

      agenda: false,
      servicios_horarios: false,
      profesionales: false,
      reportes: true,
      reporte_financiero: true,
      configuracion: true,
    },
  },

  lavanderia_piloto: {
    codigo: "lavanderia_piloto",
    nombre: "KONAX Lavandería Piloto",
    precio: 20,
    usuarios: 2,
    modulos: {
      clientes: true,
      vista_cliente: false,
      venta_credito: false,
      caja: true,
      cobranza: false,
      dashboard_cobros: false,
      inventario: false,
      control_caja: false,
      suscripciones: false,
      recargos: false,
      dashboard_ventas: true,
      egresos: false,

      agenda: false,
      servicios_horarios: false,
      profesionales: false,
      reportes: true,
      reporte_financiero: false,
      configuracion: true,
    },
  },

  pro: {
    codigo: "pro",
    nombre: "KONAX Pro",
    precio: 149,
    usuarios: 12,
    modulos: {
      clientes: true,
      vista_cliente: true,
      venta_credito: true,
      caja: true,
      cobranza: true,
      dashboard_cobros: true,
      inventario: true,
      control_caja: true,
      suscripciones: true,
      recargos: true,
      dashboard_ventas: true,
      egresos: true,

      agenda: false,
      servicios_horarios: false,
      profesionales: false,
      reportes: true,
      reporte_financiero: true,
      configuracion: true,
    },
  },
};

// =========================================================
// PLANTILLA OFICIAL · SALÓN DE BELLEZA
// SOLO:
// - Clientes
// - Caja
// - Gastos
// - Reporte Financiero
// - Profesionales
// - Configuración
//
// Panel no necesita bandera: es la pantalla principal.
// =========================================================

const MODULOS_BELLEZA = {
  clientes: true,
  caja: true,
  egresos: true,
  reporte_financiero: true,
  profesionales: true,
  configuracion: true,

  // Desactivar módulos generales
  vista_cliente: false,
  venta_credito: false,
  cobranza: false,
  dashboard_cobros: false,
  inventario: false,
  control_caja: false,
  suscripciones: false,
  recargos: false,
  dashboard_ventas: false,

  // No mostrar estos módulos en Belleza
  agenda: false,
  servicios_horarios: false,
  reportes: false,
};

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function esNegocioBelleza(empresa) {
  const texto = normalizar(
    `${empresa?.categoria_negocio || ""} ${empresa?.tipo_negocio || ""}`
  );

  return [
    "belleza",
    "salon",
    "salon de belleza",
    "peluqueria",
    "barberia",
    "spa",
    "estetica",
  ].some((palabra) =>
    texto.includes(normalizar(palabra))
  );
}

export function obtenerPlanPorCodigo(codigo) {
  return PLANES_KONAX[codigo] || null;
}

export function fechaHoy() {
  return new Date()
    .toISOString()
    .split("T")[0];
}

export function sumarDias(
  fechaTexto,
  dias
) {
  const fecha = fechaTexto
    ? new Date(fechaTexto)
    : new Date();

  fecha.setDate(
    fecha.getDate() + dias
  );

  return fecha
    .toISOString()
    .split("T")[0];
}

export function calcularProximaFacturacion(
  dias = 30
) {
  return sumarDias(
    fechaHoy(),
    dias
  );
}

export async function asignarPlanEmpresa(
  empresaId,
  codigoPlan
) {
  const plan =
    obtenerPlanPorCodigo(
      codigoPlan
    );

  if (!empresaId) {
    return {
      ok: false,
      mensaje:
        "No hay empresa seleccionada.",
    };
  }

  if (!plan) {
    return {
      ok: false,
      mensaje:
        "Plan no válido.",
    };
  }

  const {
    data: empresaActual,
    error: errorBuscarEmpresa,
  } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", empresaId)
    .maybeSingle();

  if (errorBuscarEmpresa) {
    return {
      ok: false,
      mensaje:
        "Error buscando empresa: " +
        errorBuscarEmpresa.message,
    };
  }

  if (!empresaActual) {
    return {
      ok: false,
      mensaje:
        "La empresa seleccionada no existe.",
    };
  }

  const hoy = fechaHoy();

  const proximaFacturacion =
    calcularProximaFacturacion(
      30
    );

  const {
    error: errorEmpresa,
  } = await supabase
    .from("empresas")
    .update({
      plan_codigo:
        plan.codigo,

      plan_nombre:
        plan.nombre,

      plan_tipo:
        "Mensual",

      plan_precio:
        plan.precio,

      usuarios_incluidos:
        plan.usuarios,

      estado:
        "Activo",

      estado_plan:
        "Activo",

      estado_pago:
        "Al día",

      fecha_activacion:
        hoy,

      fecha_proxima_facturacion:
        proximaFacturacion,

      configuracion_completa:
        true,
    })
    .eq(
      "id",
      empresaId
    );

  if (errorEmpresa) {
    return {
      ok: false,
      mensaje:
        "Error actualizando empresa: " +
        errorEmpresa.message,
    };
  }

  const negocioBelleza =
    esNegocioBelleza(
      empresaActual
    );

  // Si es Belleza, la plantilla de Belleza
  // manda sobre cualquier módulo del plan.
  const modulosFinales =
    negocioBelleza
      ? {
          ...plan.modulos,
          ...MODULOS_BELLEZA,
        }
      : {
          ...plan.modulos,
        };

  const modulosPayload = {
    empresa_id:
      empresaId,

    empresa_nombre:
      empresaActual?.nombre ||
      "",

    ...modulosFinales,
  };

  const {
    data: moduloExistente,
    error: errorBuscarModulo,
  } = await supabase
    .from("empresa_modulos")
    .select("id")
    .eq(
      "empresa_id",
      empresaId
    )
    .limit(1)
    .maybeSingle();

  if (errorBuscarModulo) {
    return {
      ok: false,
      mensaje:
        "Error buscando módulos: " +
        errorBuscarModulo.message,
    };
  }

  let errorModulos = null;

  if (
    moduloExistente?.id
  ) {
    const respuesta =
      await supabase
        .from(
          "empresa_modulos"
        )
        .update(
          modulosPayload
        )
        .eq(
          "id",
          moduloExistente.id
        );

    errorModulos =
      respuesta.error;
  } else {
    const respuesta =
      await supabase
        .from(
          "empresa_modulos"
        )
        .insert([
          modulosPayload,
        ]);

    errorModulos =
      respuesta.error;
  }

  if (errorModulos) {
    return {
      ok: false,
      mensaje:
        "Error actualizando módulos: " +
        errorModulos.message,
    };
  }

  const {
    error: errorBitacora,
  } = await supabase
    .from(
      "bitacora_konax"
    )
    .insert([
      {
        empresa_id:
          empresaId,

        empresa_nombre:
          empresaActual?.nombre ||
          "",

        accion:
          "Plan asignado",

        descripcion:
          negocioBelleza
            ? `Se asignó el plan ${plan.nombre} con configuración especial de Salón de Belleza.`
            : `Se asignó el plan ${plan.nombre} a la empresa.`,

        estado_anterior:
          empresaActual
            ?.estado_plan ||
          null,

        estado_nuevo:
          "Activo",

        usuario:
          "KONAX",
      },
    ]);

  if (errorBitacora) {
    console.error(
      "No se pudo registrar la bitácora:",
      errorBitacora.message
    );
  }

  return {
    ok: true,

    plan,

    modulos:
      modulosFinales,

    negocioBelleza,

    mensaje:
      negocioBelleza
        ? `Plan ${plan.nombre} asignado correctamente con módulos exclusivos de Salón de Belleza.`
        : `Plan ${plan.nombre} asignado correctamente.`,
  };
}

export async function suspenderEmpresaPorVencimiento(
  empresa
) {
  if (!empresa?.id) {
    return {
      ok: false,
      mensaje:
        "Empresa inválida.",
    };
  }

  const { error } =
    await supabase
      .from("empresas")
      .update({
        estado:
          "Suspendido",

        estado_plan:
          "Suspendido",

        estado_pago:
          "Pendiente",
      })
      .eq(
        "id",
        empresa.id
      );

  if (error) {
    return {
      ok: false,
      mensaje:
        "Error suspendiendo empresa: " +
        error.message,
    };
  }

  await supabase
    .from(
      "bitacora_konax"
    )
    .insert([
      {
        empresa_id:
          empresa.id,

        empresa_nombre:
          empresa.nombre ||
          "",

        accion:
          "Suspensión automática",

        descripcion:
          `La empresa ${
            empresa.nombre ||
            ""
          } fue suspendida automáticamente por vencimiento de facturación.`,

        estado_anterior:
          empresa.estado ||
          null,

        estado_nuevo:
          "Suspendido",

        usuario:
          "Sistema KONAX",
      },
    ]);

  return {
    ok: true,
    mensaje:
      "Empresa suspendida automáticamente.",
  };
}

export async function validarEmpresaActiva(
  empresaId
) {
  if (!empresaId) {
    return {
      ok: false,
      suspendida: true,
      mensaje:
        "No hay empresa asignada.",
    };
  }

  const {
    data: empresa,
    error,
  } = await supabase
    .from("empresas")
    .select("*")
    .eq(
      "id",
      empresaId
    )
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      suspendida: true,
      mensaje:
        "Error verificando empresa: " +
        error.message,
    };
  }

  if (!empresa) {
    return {
      ok: false,
      suspendida: true,
      mensaje:
        "Empresa no encontrada.",
    };
  }

  const hoy =
    fechaHoy();

  const vencida =
    empresa.fecha_proxima_facturacion &&
    hoy >
      empresa.fecha_proxima_facturacion &&
    empresa.estado_pago !==
      "Al día";

  if (
    empresa.estado ===
      "Suspendido" ||
    empresa.estado_plan ===
      "Suspendido" ||
    vencida
  ) {
    if (
      vencida &&
      empresa.estado_plan !==
        "Suspendido"
    ) {
      await suspenderEmpresaPorVencimiento(
        empresa
      );
    }

    return {
      ok: false,
      suspendida: true,
      empresa,
      mensaje:
        "El servicio de esta empresa está suspendido por facturación pendiente.",
    };
  }

  return {
    ok: true,
    suspendida: false,
    empresa,
    mensaje:
      "Empresa activa.",
  };
}

export async function registrarPagoEmpresa({
  empresa,
  monto,
  metodo,
  referencia,
  observacion,
  usuario = "KONAX",
}) {
  if (!empresa?.id) {
    return {
      ok: false,
      mensaje:
        "Empresa inválida.",
    };
  }

  if (
    !monto ||
    Number(monto) <= 0
  ) {
    return {
      ok: false,
      mensaje:
        "Ingrese un monto válido.",
    };
  }

  const hoy =
    fechaHoy();

  const proximaFacturacion =
    calcularProximaFacturacion(
      30
    );

  const {
    error: errorPago,
  } = await supabase
    .from("pagos_konax")
    .insert([
      {
        empresa_id:
          empresa.id,

        empresa_nombre:
          empresa.nombre ||
          "",

        plan_codigo:
          empresa.plan_codigo ||
          "",

        plan_nombre:
          empresa.plan_nombre ||
          "",

        plan_tipo:
          empresa.plan_tipo ||
          "Mensual",

        monto:
          Number(monto),

        metodo_pago:
          metodo ||
          "Yappy",

        referencia_pago:
          referencia ||
          "",

        fecha_factura:
          hoy,

        fecha_pago:
          hoy,

        fecha_vencimiento:
          proximaFacturacion,

        estado_pago:
          "Pagado",

        estado_servicio:
          "Activo",

        observacion:
          observacion ||
          "",

        usuario_registro:
          usuario,
      },
    ]);

  if (errorPago) {
    return {
      ok: false,
      mensaje:
        "Error registrando pago: " +
        errorPago.message,
    };
  }

  const {
    error: errorEmpresa,
  } = await supabase
    .from("empresas")
    .update({
      estado:
        "Activo",

      estado_plan:
        "Activo",

      estado_pago:
        "Al día",

      fecha_ultimo_pago:
        hoy,

      fecha_proxima_facturacion:
        proximaFacturacion,
    })
    .eq(
      "id",
      empresa.id
    );

  if (errorEmpresa) {
    return {
      ok: false,
      mensaje:
        "Pago guardado, pero error actualizando empresa: " +
        errorEmpresa.message,
    };
  }

  await supabase
    .from(
      "bitacora_konax"
    )
    .insert([
      {
        empresa_id:
          empresa.id,

        empresa_nombre:
          empresa.nombre ||
          "",

        accion:
          "Pago registrado",

        descripcion:
          `Pago registrado por ${Number(
            monto
          ).toFixed(
            2
          )} vía ${
            metodo ||
            "Yappy"
          }. Próxima facturación: ${proximaFacturacion}.`,

        estado_anterior:
          empresa.estado ||
          null,

        estado_nuevo:
          "Activo",

        usuario,
      },
    ]);

  return {
    ok: true,
    mensaje:
      "Pago registrado y empresa activada correctamente.",
    proximaFacturacion,
  };
}
