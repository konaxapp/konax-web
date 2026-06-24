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
    },
  },

  ventas_gestion: {
    codigo: "ventas_gestion",
    nombre: "KONAX Ventas y Gestión",
    precio: 99,
    usuarios: 5,
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
    },
  },

  pro: {
    codigo: "pro",
    nombre: "KONAX Pro",
    precio: 149,
    usuarios: 10,
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
    },
  },
};

export function obtenerPlanPorCodigo(codigo) {
  return PLANES_KONAX[codigo] || null;
}

export function fechaHoy() {
  return new Date().toISOString().split("T")[0];
}

export function sumarDias(fechaTexto, dias) {
  const fecha = fechaTexto ? new Date(fechaTexto) : new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().split("T")[0];
}

export function calcularProximaFacturacion(dias = 30) {
  return sumarDias(fechaHoy(), dias);
}

export async function asignarPlanEmpresa(empresaId, codigoPlan) {
  const plan = obtenerPlanPorCodigo(codigoPlan);

  if (!empresaId) {
    return {
      ok: false,
      mensaje: "No hay empresa seleccionada.",
    };
  }

  if (!plan) {
    return {
      ok: false,
      mensaje: "Plan no válido.",
    };
  }

  const hoy = fechaHoy();
  const proximaFacturacion = calcularProximaFacturacion(30);

  const { error: errorEmpresa } = await supabase
    .from("empresas")
    .update({
      plan_codigo: plan.codigo,
      plan_nombre: plan.nombre,
      plan_tipo: "Mensual",
      plan_precio: plan.precio,
      usuarios_incluidos: plan.usuarios,
      estado: "Activo",
      estado_plan: "Activo",
      estado_pago: "Al día",
      fecha_activacion: hoy,
      fecha_proxima_facturacion: proximaFacturacion,
      configuracion_completa: true,
    })
    .eq("id", empresaId);

  if (errorEmpresa) {
    return {
      ok: false,
      mensaje: "Error actualizando empresa: " + errorEmpresa.message,
    };
  }

  const modulosPayload = {
    empresa_id: empresaId,
    ...plan.modulos,
  };

  const { error: errorModulos } = await supabase
    .from("empresa_modulos")
    .upsert([modulosPayload], {
      onConflict: "empresa_id",
    });

  if (errorModulos) {
    return {
      ok: false,
      mensaje: "Error actualizando módulos: " + errorModulos.message,
    };
  }

  await supabase.from("bitacora_konax").insert([
    {
      empresa_id: empresaId,
      empresa_nombre: null,
      accion: "Plan asignado",
      descripcion: `Se asignó el plan ${plan.nombre} a la empresa.`,
      estado_anterior: null,
      estado_nuevo: "Activo",
      usuario: "KONAX",
    },
  ]);

  return {
    ok: true,
    plan,
    mensaje: `Plan ${plan.nombre} asignado correctamente.`,
  };
}

export async function suspenderEmpresaPorVencimiento(empresa) {
  if (!empresa?.id) {
    return {
      ok: false,
      mensaje: "Empresa inválida.",
    };
  }

  const { error } = await supabase
    .from("empresas")
    .update({
      estado: "Suspendido",
      estado_plan: "Suspendido",
      estado_pago: "Pendiente",
    })
    .eq("id", empresa.id);

  if (error) {
    return {
      ok: false,
      mensaje: "Error suspendiendo empresa: " + error.message,
    };
  }

  await supabase.from("bitacora_konax").insert([
    {
      empresa_id: empresa.id,
      empresa_nombre: empresa.nombre || "",
      accion: "Suspensión automática",
      descripcion: `La empresa ${empresa.nombre || ""} fue suspendida automáticamente por vencimiento de facturación.`,
      estado_anterior: empresa.estado || null,
      estado_nuevo: "Suspendido",
      usuario: "Sistema KONAX",
    },
  ]);

  return {
    ok: true,
    mensaje: "Empresa suspendida automáticamente.",
  };
}

export async function validarEmpresaActiva(empresaId) {
  if (!empresaId) {
    return {
      ok: false,
      suspendida: true,
      mensaje: "No hay empresa asignada.",
    };
  }

  const { data: empresa, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", empresaId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      suspendida: true,
      mensaje: "Error verificando empresa: " + error.message,
    };
  }

  if (!empresa) {
    return {
      ok: false,
      suspendida: true,
      mensaje: "Empresa no encontrada.",
    };
  }

  const hoy = fechaHoy();

  const vencida =
    empresa.fecha_proxima_facturacion &&
    hoy > empresa.fecha_proxima_facturacion &&
    empresa.estado_pago !== "Al día";

  if (
    empresa.estado === "Suspendido" ||
    empresa.estado_plan === "Suspendido" ||
    vencida
  ) {
    if (vencida && empresa.estado_plan !== "Suspendido") {
      await suspenderEmpresaPorVencimiento(empresa);
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
    mensaje: "Empresa activa.",
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
      mensaje: "Empresa inválida.",
    };
  }

  if (!monto || Number(monto) <= 0) {
    return {
      ok: false,
      mensaje: "Ingrese un monto válido.",
    };
  }

  const hoy = fechaHoy();
  const proximaFacturacion = calcularProximaFacturacion(30);

  const { error: errorPago } = await supabase.from("pagos_konax").insert([
    {
      empresa_id: empresa.id,
      empresa_nombre: empresa.nombre || "",
      monto: Number(monto),
      metodo_pago: metodo || "Yappy",
      referencia: referencia || "",
      observacion: observacion || "",
      fecha_pago: hoy,
      usuario,
    },
  ]);

  if (errorPago) {
    return {
      ok: false,
      mensaje: "Error registrando pago: " + errorPago.message,
    };
  }

  const { error: errorEmpresa } = await supabase
    .from("empresas")
    .update({
      estado: "Activo",
      estado_plan: "Activo",
      estado_pago: "Al día",
      fecha_ultimo_pago: hoy,
      fecha_proxima_facturacion: proximaFacturacion,
    })
    .eq("id", empresa.id);

  if (errorEmpresa) {
    return {
      ok: false,
      mensaje: "Pago guardado, pero error actualizando empresa: " + errorEmpresa.message,
    };
  }

  await supabase.from("bitacora_konax").insert([
    {
      empresa_id: empresa.id,
      empresa_nombre: empresa.nombre || "",
      accion: "Pago registrado",
      descripcion: `Pago registrado por ${Number(monto).toFixed(2)} vía ${metodo || "Yappy"}. Próxima facturación: ${proximaFacturacion}.`,
      estado_anterior: empresa.estado || null,
      estado_nuevo: "Activo",
      usuario,
    },
  ]);

  return {
    ok: true,
    mensaje: "Pago registrado y empresa activada correctamente.",
    proximaFacturacion,
  };
}
