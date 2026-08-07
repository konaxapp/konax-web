KONAX — RECUPERAR PANEL "PLANES DE MEMBRESÍA"
Archivo: app/admin-configuracion/page.js
Versión: 2026.08.07-P

La tabla ya existe: planes_membresia.
Esta corrección agrega Crear / Editar / Activar / Desactivar planes dentro de Configuración.

==================================================
1) AGREGA ESTA FUNCIÓN DESPUÉS DE LOS IMPORTS
==================================================

function normalizarNegocio(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function esGimnasioConfiguracion(empresa) {
  const tipo = normalizarNegocio(empresa?.tipo_negocio);
  const categoria = normalizarNegocio(empresa?.categoria_negocio);

  return (
    tipo.includes("gimnasio") ||
    tipo.includes("gym") ||
    tipo.includes("fitness") ||
    categoria.includes("membresia") ||
    categoria.includes("suscripcion")
  );
}

==================================================
2) EN EL MENÚ, DESPUÉS DE "PERFIL EMPRESARIAL",
AGREGA ESTE ITEM
==================================================

{esGimnasioConfiguracion(empresa) && (
  <Item
    texto="Planes de membresía"
    icono="🏷️"
    activo={seccion === "planes_membresia"}
    onClick={() => setSeccion("planes_membresia")}
  />
)}

==================================================
3) DENTRO DE <main style={contenido}>,
ANTES DE LA SECCIÓN "MI PLAN", AGREGA:
==================================================

{seccion === "planes_membresia" &&
  esGimnasioConfiguracion(empresa) && (
    <PlanesMembresiaPanel empresaId={empresa?.id} />
  )}

==================================================
4) ANTES DE function Resumen(...), PEGA TODO ESTE
COMPONENTE
==================================================

function PlanesMembresiaPanel({ empresaId }) {
  const planInicial = {
    nombre: "",
    descripcion: "",
    precio: "",
    periodicidad: "Mensual",
    duracion_cantidad: 1,
    duracion_unidad: "Meses",
    dias_aviso: 5,
    dias_gracia: 3,
    activo: true,
  };

  const [planes, setPlanes] = useState([]);
  const [formulario, setFormulario] = useState(planInicial);
  const [editandoId, setEditandoId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (empresaId) cargarPlanes();
  }, [empresaId]);

  async function cargarPlanes() {
    if (!empresaId) return;

    setCargando(true);

    const { data, error } = await supabase
      .from("planes_membresia")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("activo", { ascending: false })
      .order("nombre", { ascending: true });

    setCargando(false);

    if (error) {
      alert("Error cargando planes de membresía: " + error.message);
      return;
    }

    setPlanes(data || []);
  }

  function actualizar(campo, valor) {
    setFormulario((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function limpiar() {
    setEditandoId("");
    setFormulario({ ...planInicial });
  }

  function editar(plan) {
    setEditandoId(plan.id);

    setFormulario({
      nombre: plan.nombre || "",
      descripcion: plan.descripcion || "",
      precio:
        plan.precio === null || plan.precio === undefined
          ? ""
          : String(plan.precio),
      periodicidad: plan.periodicidad || "Mensual",
      duracion_cantidad: Number(plan.duracion_cantidad || 1),
      duracion_unidad: plan.duracion_unidad || "Meses",
      dias_aviso: Number(plan.dias_aviso ?? 5),
      dias_gracia: Number(plan.dias_gracia ?? 3),
      activo: plan.activo !== false,
    });
  }

  async function guardarPlan() {
    if (!empresaId || guardando) return;

    const nombre = String(formulario.nombre || "").trim();
    const precio = Number(formulario.precio || 0);

    if (!nombre) {
      alert("Escriba el nombre del plan.");
      return;
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      alert("Ingrese un precio válido mayor que cero.");
      return;
    }

    const payload = {
      empresa_id: empresaId,
      nombre,
      descripcion:
        String(formulario.descripcion || "").trim() || null,
      precio,
      periodicidad: formulario.periodicidad || "Mensual",
      duracion_cantidad: Math.max(
        1,
        Number(formulario.duracion_cantidad || 1)
      ),
      duracion_unidad: formulario.duracion_unidad || "Meses",
      dias_aviso: Math.max(
        0,
        Number(formulario.dias_aviso || 0)
      ),
      dias_gracia: Math.max(
        0,
        Number(formulario.dias_gracia || 0)
      ),
      activo: Boolean(formulario.activo),
    };

    setGuardando(true);

    let error;

    if (editandoId) {
      const respuesta = await supabase
        .from("planes_membresia")
        .update(payload)
        .eq("id", editandoId)
        .eq("empresa_id", empresaId);

      error = respuesta.error;
    } else {
      const respuesta = await supabase
        .from("planes_membresia")
        .insert([payload]);

      error = respuesta.error;
    }

    setGuardando(false);

    if (error) {
      alert(
        (editandoId
          ? "No se pudo actualizar el plan: "
          : "No se pudo crear el plan: ") + error.message
      );
      return;
    }

    alert(
      editandoId
        ? "Plan actualizado correctamente."
        : "Plan creado correctamente."
    );

    limpiar();
    await cargarPlanes();
  }

  async function cambiarEstado(plan) {
    if (guardando) return;

    const nuevoEstado = !Boolean(plan.activo);

    if (
      !window.confirm(
        `¿Desea ${
          nuevoEstado ? "activar" : "desactivar"
        } el plan "${plan.nombre}"?`
      )
    ) {
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from("planes_membresia")
      .update({ activo: nuevoEstado })
      .eq("id", plan.id)
      .eq("empresa_id", empresaId);

    setGuardando(false);

    if (error) {
      alert("No se pudo cambiar el estado: " + error.message);
      return;
    }

    await cargarPlanes();
  }

  return (
    <>
      <Card
        titulo={
          editandoId
            ? "Editar plan de membresía"
            : "Crear plan de membresía"
        }
        descripcion="Estos planes aparecerán al asignar una membresía a un alumno."
        icono="🏷️"
      >
        <div style={gridDos}>
          <Campo labelTexto="Nombre del plan *">
            <input
              value={formulario.nombre}
              onChange={(e) => actualizar("nombre", e.target.value)}
              style={input}
              placeholder="Ej. Plan Regular"
            />
          </Campo>

          <Campo labelTexto="Precio *">
            <input
              type="number"
              min="0"
              step="0.01"
              value={formulario.precio}
              onChange={(e) => actualizar("precio", e.target.value)}
              style={input}
              placeholder="20.00"
            />
          </Campo>

          <Campo labelTexto="Periodicidad">
            <select
              value={formulario.periodicidad}
              onChange={(e) =>
                actualizar("periodicidad", e.target.value)
              }
              style={input}
            >
              <option>Diaria</option>
              <option>Semanal</option>
              <option>Quincenal</option>
              <option>Mensual</option>
              <option>Trimestral</option>
              <option>Semestral</option>
              <option>Anual</option>
            </select>
          </Campo>

          <Campo labelTexto="Duración">
            <input
              type="number"
              min="1"
              step="1"
              value={formulario.duracion_cantidad}
              onChange={(e) =>
                actualizar("duracion_cantidad", e.target.value)
              }
              style={input}
            />
          </Campo>

          <Campo labelTexto="Unidad de duración">
            <select
              value={formulario.duracion_unidad}
              onChange={(e) =>
                actualizar("duracion_unidad", e.target.value)
              }
              style={input}
            >
              <option>Días</option>
              <option>Semanas</option>
              <option>Meses</option>
              <option>Años</option>
            </select>
          </Campo>

          <Campo labelTexto="Avisar antes de vencer (días)">
            <input
              type="number"
              min="0"
              step="1"
              value={formulario.dias_aviso}
              onChange={(e) =>
                actualizar("dias_aviso", e.target.value)
              }
              style={input}
            />
          </Campo>

          <Campo labelTexto="Días de gracia">
            <input
              type="number"
              min="0"
              step="1"
              value={formulario.dias_gracia}
              onChange={(e) =>
                actualizar("dias_gracia", e.target.value)
              }
              style={input}
            />
          </Campo>

          <Campo labelTexto="Estado">
            <select
              value={formulario.activo ? "Activo" : "Inactivo"}
              onChange={(e) =>
                actualizar(
                  "activo",
                  e.target.value === "Activo"
                )
              }
              style={input}
            >
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
          </Campo>
        </div>

        <Campo labelTexto="Descripción">
          <textarea
            value={formulario.descripcion}
            onChange={(e) =>
              actualizar("descripcion", e.target.value)
            }
            style={textarea}
            placeholder="Ej. Acceso completo por un mes."
          />
        </Campo>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={guardarPlan}
            disabled={guardando}
            style={botonGuardar}
          >
            {guardando
              ? "Guardando..."
              : editandoId
              ? "Actualizar plan"
              : "Crear plan"}
          </button>

          {editandoId && (
            <button
              type="button"
              onClick={limpiar}
              disabled={guardando}
              style={{
                ...botonGuardar,
                background: "#ffffff",
                color: "#374151",
                border: "1px solid #d1d5db",
              }}
            >
              Cancelar edición
            </button>
          )}
        </div>
      </Card>

      <div style={{ height: 18 }} />

      <Card
        titulo="Planes configurados"
        descripcion="Los planes activos aparecerán dentro de Membresías."
        icono="📋"
      >
        {cargando ? (
          <p style={textoSuave}>Cargando planes...</p>
        ) : planes.length === 0 ? (
          <p style={textoSuave}>
            No hay planes configurados todavía.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {planes.map((plan) => (
              <div
                key={plan.id}
                style={{
                  padding: 15,
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  background: "#f9fafb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <strong>{plan.nombre}</strong>

                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: plan.activo
                          ? "#dcfce7"
                          : "#fee2e2",
                        color: plan.activo
                          ? "#166534"
                          : "#991b1b",
                        fontSize: 10,
                        fontWeight: 900,
                      }}
                    >
                      {plan.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      color: "#166534",
                      fontSize: 20,
                      fontWeight: 900,
                    }}
                  >
                    B/. {Number(plan.precio || 0).toFixed(2)}
                  </div>

                  <small style={{ color: "#6b7280" }}>
                    {Number(plan.duracion_cantidad || 1)}{" "}
                    {plan.duracion_unidad || "Meses"} ·{" "}
                    {plan.periodicidad || "Mensual"} · Aviso{" "}
                    {Number(plan.dias_aviso ?? 5)} día(s) antes ·
                    Gracia {Number(plan.dias_gracia ?? 3)} día(s)
                  </small>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => editar(plan)}
                    style={{
                      padding: "9px 12px",
                      border: 0,
                      borderRadius: 9,
                      background: "#111827",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarEstado(plan)}
                    style={{
                      padding: "9px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 9,
                      background: "#fff",
                      color: plan.activo ? "#c2410c" : "#166534",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {plan.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

==================================================
RESULTADO
==================================================

Configuración
→ Perfil empresarial
→ Planes de membresía
   → Crear plan
   → Editar
   → Activar / Desactivar
→ Mi plan KONAX

Membresías seguirá leyendo solamente los planes activos con:
.eq("activo", true)

NO modifica el flujo de Caja.
NO modifica suscripciones existentes.
NO requiere crear una tabla nueva.
