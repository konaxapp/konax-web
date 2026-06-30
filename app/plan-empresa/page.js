"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function PlanEmpresa() {
  const [empresa, setEmpresa] = useState(null);
  const [tipoPlan, setTipoPlan] = useState("mensual");
  const [cargando, setCargando] = useState(true);

  const planes = [
    {
      nombre: "KONAX Cobros",
      codigo: "cobros",
      precioMensual: 49,
      precioAnual: 499,
      color: "#2563eb",
      modulos: {
        dashboard: true,
        clientes: true,
        vista_cliente: true,
        creditos: true,
        cobranza: true,
        gestor_cobros: true,
        abonos: true,
        pagos: true,
        caja: true,
        control_caja: false,
        gastos: false,
        recargos: false,
        inventario: false,
        movimientos_inventario: false,
        ventas: false,
        suscripciones: false,
        reportes: true,
        usuarios: true,
        configuracion: true,
      },
    },
    {
      nombre: "KONAX Ventas y Gestión",
      codigo: "ventas_gestion",
      precioMensual: 99,
      precioAnual: 999,
      color: "#10b981",
      modulos: {
        dashboard: true,
        clientes: true,
        vista_cliente: true,
        creditos: true,
        cobranza: true,
        gestor_cobros: true,
        abonos: true,
        pagos: true,
        caja: true,
        control_caja: true,
        gastos: true,
        recargos: false,
        inventario: true,
        movimientos_inventario: true,
        ventas: true,
        suscripciones: false,
        reportes: true,
        usuarios: true,
        configuracion: true,
      },
    },
    {
      nombre: "KONAX Pro",
      codigo: "pro",
      precioMensual: 149,
      precioAnual: 1499,
      color: "#111827",
      modulos: {
        dashboard: true,
        clientes: true,
        vista_cliente: true,
        creditos: true,
        cobranza: true,
        gestor_cobros: true,
        abonos: true,
        pagos: true,
        caja: true,
        control_caja: true,
        gastos: true,
        recargos: true,
        inventario: true,
        movimientos_inventario: true,
        ventas: true,
        suscripciones: true,
        reportes: true,
        usuarios: true,
        configuracion: true,
      },
    },
  ];

  useEffect(() => {
    cargarEmpresa();
  }, []);

  async function cargarEmpresa() {
    const params = new URLSearchParams(window.location.search);

    const empresaId =
      params.get("empresa") || localStorage.getItem("empresaAdminCreadaId");

    if (!empresaId) {
      alert("No hay empresa seleccionada.");
      window.location.href = "/empresas";
      return;
    }

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (error) {
      alert("Error cargando empresa: " + error.message);
      return;
    }

    if (!data) {
      alert("Empresa no encontrada.");
      window.location.href = "/empresas";
      return;
    }

    setEmpresa(data);
    setTipoPlan(data.plan_tipo || "mensual");
    setCargando(false);
  }

  async function cambiarPlan(plan) {
    const precio =
      tipoPlan === "mensual" ? plan.precioMensual : plan.precioAnual;

    const confirmar = confirm(
      `¿Deseas cambiar el plan de ${empresa.nombre} a ${plan.nombre}?`
    );

    if (!confirmar) return;

    const { error: errorEmpresa } = await supabase
      .from("empresas")
      .update({
        plan_codigo: plan.codigo,
        plan_nombre: plan.nombre,
        plan_tipo: tipoPlan,
        plan_precio: precio,
        estado_plan: "Activo",
      })
      .eq("id", empresa.id);

    if (errorEmpresa) {
      alert("Error actualizando plan: " + errorEmpresa.message);
      return;
    }

    const admin =
      localStorage.getItem("adminKonaxNombre") ||
      localStorage.getItem("adminKonaxCorreo") ||
      "KONAX";

    const registros = Object.entries(plan.modulos).map(([modulo, activo]) => ({
      empresa_id: empresa.id,
      modulo,
      activo,
      plan_origen: plan.nombre,
      activado_por: admin,
      updated_at: new Date().toISOString(),
    }));

    const { error: errorModulos } = await supabase
      .from("modulos_empresa")
      .upsert(registros, {
        onConflict: "empresa_id,modulo",
      });

    if (errorModulos) {
      alert("Plan cambiado, pero error actualizando módulos: " + errorModulos.message);
      return;
    }

    alert("Plan y funciones actualizadas correctamente.");
    await cargarEmpresa();
  }

  if (cargando) {
    return <div style={{ padding: "30px" }}>Cargando plan de empresa...</div>;
  }

  return (
    <div style={pagina}>
      <div style={header}>
        <div>
          <h1 style={titulo}>Gestionar Plan</h1>
          <p style={subtitulo}>
            Empresa: <strong>{empresa.nombre}</strong>
          </p>
        </div>

        <Link href="/empresas" style={botonVolver}>
          Volver a Empresas
        </Link>
      </div>

      <div style={cardActual}>
        <h2>Plan Actual</h2>
        <p><strong>Plan:</strong> {empresa.plan_nombre || "Sin plan"}</p>
        <p><strong>Tipo:</strong> {empresa.plan_tipo || "No definido"}</p>
        <p><strong>Precio:</strong> ${Number(empresa.plan_precio || 0).toFixed(2)}</p>
        <p><strong>Estado:</strong> {empresa.estado_plan || "Pendiente"}</p>
      </div>

      <div style={toggleBox}>
        <button
          onClick={() => setTipoPlan("mensual")}
          style={tipoPlan === "mensual" ? botonActivo : botonInactivo}
        >
          Mensual
        </button>

        <button
          onClick={() => setTipoPlan("anual")}
          style={tipoPlan === "anual" ? botonActivo : botonInactivo}
        >
          Anual
        </button>
      </div>

      <div style={grid}>
        {planes.map((plan) => {
          const precio =
            tipoPlan === "mensual" ? plan.precioMensual : plan.precioAnual;

          const esActual = empresa.plan_codigo === plan.codigo;

          return (
            <div
              key={plan.codigo}
              style={{ ...card, border: `2px solid ${plan.color}` }}
            >
              <h2>{plan.nombre}</h2>
              <h1>${precio}</h1>

              {esActual && <p style={actual}>Plan actual</p>}

              <button
                onClick={() => cambiarPlan(plan)}
                style={{ ...botonPlan, background: plan.color }}
              >
                {esActual ? "Actualizar Plan Actual" : "Cambiar a este Plan"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "35px",
  fontFamily: "Arial, sans-serif",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "25px",
};

const titulo = {
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
};

const botonVolver = {
  background: "#111827",
  color: "#ffffff",
  padding: "12px 18px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "bold",
};

const cardActual = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  marginBottom: "25px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const toggleBox = {
  display: "flex",
  justifyContent: "center",
  gap: "10px",
  marginBottom: "30px",
};

const botonActivo = {
  padding: "12px 25px",
  borderRadius: "10px",
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonInactivo = {
  padding: "12px 25px",
  borderRadius: "10px",
  border: "1px solid #2563eb",
  background: "white",
  color: "#2563eb",
  fontWeight: "bold",
  cursor: "pointer",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
  gap: "20px",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const actual = {
  background: "#dcfce7",
  color: "#166534",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "bold",
  display: "inline-block",
};

const botonPlan = {
  width: "100%",
  marginTop: "20px",
  padding: "13px",
  border: "none",
  borderRadius: "9px",
  color: "#ffffff",
  fontWeight: "bold",
  cursor: "pointer",
};
