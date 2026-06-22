"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Planes() {
  const [tipoPlan, setTipoPlan] = useState("mensual");
  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("empresaAdminCreadaId");
    const nombre = localStorage.getItem("empresaAdminCreadaNombre");

    if (!id) {
      alert("Primero debes crear o seleccionar una empresa.");
      window.location.href = "/empresas";
      return;
    }

    setEmpresaId(id);
    setEmpresaNombre(nombre || "Empresa seleccionada");
  }, []);

  const planes = [
    {
      nombre: "KONAX Básico",
      codigo: "basico",
      precioMensual: "49",
      precioAnual: "499",
      color: "#2563eb",
      modulos: {
        clientes: true,
        vista_cliente: true,
        caja: false,
        control_caja: false,
        cobranza: true,
        inventario: false,
        venta_credito: true,
        suscripciones: false,
        recargos: false,
        dashboard_ventas: false,
        dashboard_cobros: true,
        egresos: false,
      },
      incluye: [
        "Clientes",
        "Créditos",
        "Cobranza",
        "Pagos",
        "Promesas de pago",
        "Bitácora básica",
        "Dashboard de cobranza",
      ],
    },
    {
      nombre: "KONAX Gestión",
      codigo: "gestion",
      precioMensual: "99",
      precioAnual: "999",
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
      incluye: [
        "Todo Básico",
        "Inventario",
        "Ventas crédito",
        "Caja",
        "Control caja",
        "Gastos",
        "Reportes básicos",
      ],
    },
    {
      nombre: "KONAX Empresarial",
      codigo: "empresarial",
      precioMensual: "499",
      precioAnual: "4990",
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
      incluye: [
        "Todo Gestión",
        "Suscripciones",
        "Recargos",
        "Dashboard gerencial",
        "Reportes avanzados",
        "Módulos personalizados",
        "Soporte especializado",
      ],
    },
  ];

  async function asignarPlan(plan) {
    if (!empresaId) {
      alert("No hay empresa seleccionada.");
      return;
    }

    const precio =
      tipoPlan === "mensual"
        ? Number(plan.precioMensual)
        : Number(plan.precioAnual);

    const confirmar = confirm(
      `Se asignará ${plan.nombre} a ${empresaNombre}. ¿Deseas continuar?`
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
      .eq("id", empresaId);

    if (errorEmpresa) {
      alert("Error al guardar el plan: " + errorEmpresa.message);
      return;
    }

    const payloadModulos = {
  empresa_id: empresaId,
  ...plan.modulos,
};

    const { data: existeModulo, error: errorBuscar } = await supabase
      .from("empresa_modulos")
      .select("id")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (errorBuscar) {
      alert("Plan guardado, pero error verificando módulos: " + errorBuscar.message);
      return;
    }

    let errorModulos;

    if (existeModulo?.id) {
      const res = await supabase
        .from("empresa_modulos")
        .update(payloadModulos)
        .eq("id", existeModulo.id);

      errorModulos = res.error;
    } else {
      const res = await supabase.from("empresa_modulos").insert([payloadModulos]);
      errorModulos = res.error;
    }

    if (errorModulos) {
      alert("Plan guardado, pero error activando módulos: " + errorModulos.message);
      return;
    }

    alert("Plan y módulos asignados correctamente. Ahora crea el usuario administrador inicial.");
    window.location.href = "/usuarios";
  }

  return (
    <div style={pagina}>
      <div style={card}>
        <h1 style={titulo}>Asignar Plan a Empresa</h1>

        <p style={subtitulo}>
          Empresa seleccionada: <strong>{empresaNombre}</strong>
        </p>

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

        <div style={planesBox}>
          {planes.map((plan) => (
            <div
              key={plan.codigo}
              style={{
                flex: 1,
                minWidth: "300px",
                border: `2px solid ${plan.color}`,
                borderRadius: "12px",
                padding: "25px",
              }}
            >
              <h2>{plan.nombre}</h2>

              <h1>
                ${tipoPlan === "mensual" ? plan.precioMensual : plan.precioAnual}
              </h1>

              <ul style={lista}>
                {plan.incluye.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <button
                onClick={() => asignarPlan(plan)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "none",
                  background: plan.color,
                  color: "white",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Asignar Plan
              </button>
            </div>
          ))}
        </div>

        <p style={nota}>
          Flujo: Empresa → Plan → Módulos → Usuario Administrador Inicial.
        </p>

        <a href="/empresas" style={botonVolver}>
          Volver a Empresas
        </a>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const card = {
  maxWidth: "1200px",
  margin: "0 auto",
  background: "white",
  borderRadius: "16px",
  padding: "40px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const titulo = {
  textAlign: "center",
  marginBottom: "10px",
};

const subtitulo = {
  textAlign: "center",
  color: "#666",
  marginBottom: "40px",
};

const toggleBox = {
  display: "flex",
  justifyContent: "center",
  gap: "10px",
  marginBottom: "40px",
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

const planesBox = {
  display: "flex",
  gap: "20px",
  flexWrap: "wrap",
};

const lista = {
  color: "#666",
  paddingLeft: "20px",
  minHeight: "190px",
};

const nota = {
  textAlign: "center",
  marginTop: "30px",
  color: "#777",
  fontSize: "14px",
};

const botonVolver = {
  display: "inline-block",
  marginTop: "20px",
  background: "#111827",
  color: "#ffffff",
  padding: "12px 18px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "bold",
};
