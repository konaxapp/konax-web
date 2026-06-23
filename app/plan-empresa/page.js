"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function PlanEmpresa() {
  const [empresa, setEmpresa] = useState(null);
  const [modulos, setModulos] = useState(null);
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
        clientes: true,
        vista_cliente: true,
        caja: true,
        control_caja: false,
        cobranza: true,
        inventario: false,
        venta_credito: false,
        suscripciones: false,
        recargos: false,
        dashboard_ventas: false,
        dashboard_cobros: true,
        egresos: false,
      },
    },
    {
      nombre: "KONAX Ventas y Gestión",
      codigo: "ventas_gestion",
      precioMensual: 99,
      precioAnual: 999,
      color: "#10b981",
      modulos: {
        clientes: true,
        vista_cliente: true,
        caja: true,
        control_caja: true,
        cobranza: true,
        inventario: true,
        venta_credito: true,
        suscripciones: false,
        recargos: false,
        dashboard_ventas: true,
        dashboard_cobros: true,
        egresos: true,
      },
    },
    {
      nombre: "KONAX Pro",
      codigo: "pro",
      precioMensual: 149,
      precioAnual: 1499,
      color: "#111827",
      modulos: {
        clientes: true,
        vista_cliente: true,
        caja: true,
        control_caja: true,
        cobranza: true,
        inventario: true,
        venta_credito: true,
        suscripciones: true,
        recargos: true,
        dashboard_ventas: true,
        dashboard_cobros: true,
        egresos: true,
      },
    },
  ];

  useEffect(() => {
    cargarEmpresa();
  }, []);

  async function cargarEmpresa() {
    const params = new URLSearchParams(window.location.search);
    const empresaId = params.get("empresa") || localStorage.getItem("empresaAdminCreadaId");

    if (!empresaId) {
      alert("No hay empresa seleccionada.");
      window.location.href = "/empresas";
      return;
    }

    const { data: empresaData, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      alert("Error cargando empresa: " + errorEmpresa.message);
      return;
    }

    if (!empresaData) {
      alert("Empresa no encontrada.");
      window.location.href = "/empresas";
      return;
    }

    const { data: modulosData } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    setEmpresa(empresaData);
    setModulos(modulosData || null);
    setTipoPlan(empresaData.plan_tipo || "mensual");
    setCargando(false);
  }

  async function cambiarPlan(plan) {
    const precio = tipoPlan === "mensual" ? plan.precioMensual : plan.precioAnual;

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

    const payloadModulos = {
      empresa_id: empresa.id,
      ...plan.modulos,
    };

    let errorModulos = null;

    if (modulos?.id) {
      const res = await supabase
        .from("empresa_modulos")
        .update(payloadModulos)
        .eq("id", modulos.id);

      errorModulos = res.error;
    } else {
      const res = await supabase.from("empresa_modulos").insert([payloadModulos]);
      errorModulos = res.error;
    }

    if (errorModulos) {
      alert("Plan cambiado, pero error actualizando módulos: " + errorModulos.message);
      return;
    }

    alert("Plan y módulos actualizados correctamente.");
    cargarEmpresa();
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

        <p>
          <strong>Plan:</strong> {empresa.plan_nombre || "Sin plan"}
        </p>

        <p>
          <strong>Tipo:</strong> {empresa.plan_tipo || "No definido"}
        </p>

        <p>
          <strong>Precio:</strong> ${Number(empresa.plan_precio || 0).toFixed(2)}
        </p>

        <p>
          <strong>Estado:</strong> {empresa.estado_plan || "Pendiente"}
        </p>
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
          const precio = tipoPlan === "mensual" ? plan.precioMensual : plan.precioAnual;
          const esActual = empresa.plan_codigo === plan.codigo;

          return (
            <div key={plan.codigo} style={{ ...card, border: `2px solid ${plan.color}` }}>
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
  display:
