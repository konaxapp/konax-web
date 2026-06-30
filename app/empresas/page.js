async function cargarModulosEmpresas() {
  const { data, error } = await supabase
    .from("modulos_empresa")
    .select("*");

  if (error) {
    alert("Error cargando módulos: " + error.message);
    return;
  }

  const agrupados = {};

  (data || []).forEach((item) => {
    if (!agrupados[item.empresa_id]) {
      agrupados[item.empresa_id] = {};
    }

    agrupados[item.empresa_id][item.modulo] = item;
  });

  setModulosPorEmpresa(agrupados);
}

function moduloActivo(empresaId, modulo) {
  return Boolean(modulosPorEmpresa?.[empresaId]?.[modulo]?.activo);
}

async function alternarModulo(empresa, modulo) {
  const activoActual = moduloActivo(empresa.id, modulo.codigo);
  const nuevoEstado = !activoActual;

  const admin =
    localStorage.getItem("adminKonaxNombre") ||
    localStorage.getItem("adminKonaxCorreo") ||
    "KONAX";

  const { error } = await supabase
    .from("modulos_empresa")
    .upsert(
      {
        empresa_id: empresa.id,
        modulo: modulo.codigo,
        activo: nuevoEstado,
        plan_origen: empresa.plan_nombre || "Manual",
        activado_por: admin,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "empresa_id,modulo",
      }
    );

  if (error) {
    alert("Error actualizando módulo: " + error.message);
    return;
  }

  await cargarModulosEmpresas();
}q
