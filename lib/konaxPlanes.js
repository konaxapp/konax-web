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
    return { ok: false, mensaje: "No hay empresa seleccionada." };
  }

  if (!plan) {
    return { ok: false, mensaje: "Plan no válido." };
  }

  const { data: empresaActual } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", empresaId)
    .maybeSingle();

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
    empresa_nombre: empresaActual?.nombre || "",
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
      empresa_nombre: empresaActual?.nombre || "",
      accion: "Plan asignado",
      descripcion: `Se asignó el plan ${plan.nombre} a la empresa.`,
      estado_anterior: empresaActual?.estado_plan || null,
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
