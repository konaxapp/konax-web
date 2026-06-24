"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { asignarPlanEmpresa } from "../../lib/konaxPlanes";
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
      nombre: "KONAX Cobros",
      codigo: "cobros",
      etiqueta: "Cartera y cobranza",
      precioMensual: 49,
      precioAnual: 499,
      usuariosIncluidos: 3,
      precioUsuarioExtra: 10.99,
      color: "#2563eb",
      fondo: "#eff6ff",
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
      incluye: [
        "3 usuarios incluidos",
        "Clientes",
        "Vista Cliente",
        "Cuentas por Cobrar",
        "Caja Básica",
        "Cobranza",
        "Gestión de Cobros",
        "Promesas de Pago",
        "Dashboard de Cobranza",
        "Usuario adicional: $10.99/mes",
      ],
    },
    {
      nombre: "KONAX Ventas y Gestión",
      codigo: "ventas_gestion",
      etiqueta: "Operación completa",
      precioMensual: 99,
      precioAnual: 999,
      usuariosIncluidos: 6,
      precioUsuarioExtra: 10.99,
      color: "#10b981",
      fondo: "#ecfdf5",
      destacado: true,
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
        "6 usuarios incluidos",
        "Todo KONAX Cobros",
        "Inventario",
        "Venta Crédito",
        "Caja",
        "Control de Caja",
        "Gastos / Egresos",
        "Recargos",
        "Dashboard de Ventas",
        "Reportes Operativos",
        "Usuario adicional: $10.99/mes",
      ],
    },
    {
      nombre: "KONAX Pro",
      codigo: "pro",
      etiqueta: "Gerencia y crecimiento",
      precioMensual: 149,
      precioAnual: 1499,
      usuariosIncluidos: 12,
      precioUsuarioExtra: 10.99,
      color: "#111827",
      fondo: "#f9fafb",
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
        "12 usuarios incluidos",
        "Todo KONAX Ventas y Gestión",
        "Dashboard Ejecutivo",
        "Reportes Avanzados",
        "Comisiones",
        "Metas por Vendedor",
        "Metas por Gestor",
        "Multi Sucursales",
        "Comparativos Mensuales",
        "Presupuesto vs Resultado",
        "Indicadores Gerenciales",
        "Soporte Prioritario",
        "Usuario adicional: $10.99/mes",
      ],
    },
  ];

  async function asignarPlan(plan) {
  if (!empresaId) {
    alert("No hay empresa seleccionada.");
    return;
  }

  const confirmar = confirm(
    `Se asignará ${plan.nombre} a ${empresaNombre}. ¿Deseas continuar?`
  );

  if (!confirmar) return;

  const resultado = await asignarPlanEmpresa(
    empresaId,
    plan.codigo
  );

  if (!resultado.ok) {
    alert(resultado.mensaje);
    return;
  }

  alert(
    resultado.mensaje +
      " Ahora crea el Usuario Principal."
  );

  window.location.href = "/usuarios";
}

    const precio = tipoPlan === "mensual" ? plan.precioMensual : plan.precioAnual;

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

    let errorModulos = null;

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

    alert("Plan y módulos asignados correctamente. Ahora crea el Usuario Principal.");
    window.location.href = "/usuarios";
  }

  return (
    <div style={pagina}>
      <div style={cardPrincipal}>
        <div style={logoBox}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
        </div>

        <h1 style={titulo}>Selecciona el plan de la empresa</h1>

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
          {planes.map((plan) => {
            const precio =
              tipoPlan === "mensual" ? plan.precioMensual : plan.precioAnual;

            return (
              <div
                key={plan.codigo}
                style={{
                  ...planCard,
                  border: `2px solid ${plan.color}`,
                  background: plan.fondo,
                  transform: plan.destacado ? "scale(1.02)" : "scale(1)",
                }}
              >
                {plan.destacado && (
                  <div style={recomendado}>Más recomendado</div>
                )}

                <div
                  style={{
                    ...badge,
                    background: plan.color,
                  }}
                >
                  {plan.etiqueta}
                </div>

                <h2 style={planTitulo}>{plan.nombre}</h2>

                <div style={precioBox}>
                  <span style={signo}>$</span>
                  <span style={precioGrande}>{precio}</span>
                </div>

                <p style={precioTexto}>
                  {tipoPlan === "mensual" ? "Pago mensual" : "Pago anual con ahorro"}
                </p>

                <p style={usuariosTexto}>
                  {plan.usuariosIncluidos} usuarios incluidos
                </p>

                <ul style={lista}>
                  {plan.incluye.map((item) => (
                    <li key={item} style={li}>
                      ✓ {item}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => asignarPlan(plan)}
                  style={{
                    ...botonPlan,
                    background: plan.color,
                  }}
                >
                  Asignar {plan.nombre}
                </button>
              </div>
            );
          })}
        </div>

        <p style={nota}>
          Flujo: Empresa → Plan → Módulos → Usuario Principal.
        </p>

        <Link href="/empresas" style={botonVolver}>
          Volver a Empresas
        </Link>
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

const cardPrincipal = {
  maxWidth: "1300px",
  margin: "0 auto",
  background: "white",
  borderRadius: "20px",
  padding: "40px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

const logoBox = {
  textAlign: "center",
  marginBottom: "18px",
};

const logo = {
  width: "190px",
  maxWidth: "100%",
  height: "auto",
};

const titulo = {
  textAlign: "center",
  marginBottom: "10px",
  fontSize: "34px",
  color: "#111827",
};

const subtitulo = {
  textAlign: "center",
  color: "#6b7280",
  marginBottom: "28px",
};

const toggleBox = {
  display: "flex",
  justifyContent: "center",
  gap: "10px",
  marginBottom: "35px",
};

const botonActivo = {
  padding: "12px 28px",
  borderRadius: "999px",
  border: "1px solid #111827",
  background: "#111827",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonInactivo = {
  padding: "12px 28px",
  borderRadius: "999px",
  border: "1px solid #d1d5db",
  background: "white",
  color: "#111827",
  fontWeight: "bold",
  cursor: "pointer",
};

const planesBox = {
  display: "flex",
  gap: "22px",
  flexWrap: "wrap",
  alignItems: "stretch",
};

const planCard = {
  flex: 1,
  minWidth: "300px",
  borderRadius: "18px",
  padding: "26px",
  position: "relative",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
};

const recomendado = {
  position: "absolute",
  top: "-14px",
  right: "20px",
  background: "#facc15",
  color: "#111827",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
};

const badge = {
  display: "inline-block",
  color: "#ffffff",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
  marginBottom: "14px",
};

const planTitulo = {
  fontSize: "24px",
  color: "#111827",
  marginBottom: "10px",
};

const precioBox = {
  display: "flex",
  alignItems: "flex-start",
  gap: "2px",
  marginBottom: "0px",
};

const signo = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#111827",
  marginTop: "8px",
};

const precioGrande = {
  fontSize: "54px",
  fontWeight: "900",
  color: "#111827",
};

const precioTexto = {
  color: "#6b7280",
  marginTop: "-5px",
  marginBottom: "12px",
  fontSize: "14px",
};

const usuariosTexto = {
  background: "#ffffff",
  padding: "11px",
  borderRadius: "10px",
  fontWeight: "bold",
  color: "#111827",
  border: "1px solid #e5e7eb",
};

const lista = {
  color: "#374151",
  paddingLeft: "0",
  listStyle: "none",
  minHeight: "330px",
  lineHeight: "27px",
  fontSize: "14px",
};

const li = {
  marginBottom: "4px",
};

const botonPlan = {
  width: "100%",
  padding: "14px",
  border: "none",
  color: "white",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "15px",
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
