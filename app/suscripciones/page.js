"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Suscripciones() {
  const [formulario, setFormulario] = useState({
    cedula: "",
    cliente: "",
    telefono: "",
    correo: "",
    plan: "",
    tipoServicio: "Membresía",
    descripcion: "",
    precio: "",
    vendedor: "",
    fechaInicio: "",
    periodicidad: "Mensual",
    estado: "Activo",
  });

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      return null;
    }

    return empresaId;
  }

  function generarNumeroCuenta() {
    return "SUB-" + Date.now();
  }

  function calcularVencimiento() {
    if (!formulario.fechaInicio) return "";

    const fecha = new Date(formulario.fechaInicio);

    switch (formulario.periodicidad) {
      case "Mensual":
        fecha.setMonth(fecha.getMonth() + 1);
        break;
      case "Trimestral":
        fecha.setMonth(fecha.getMonth() + 3);
        break;
      case "Semestral":
        fecha.setMonth(fecha.getMonth() + 6);
        break;
      case "Anual":
        fecha.setFullYear(fecha.getFullYear() + 1);
        break;
      default:
        break;
    }

    return fecha.toISOString().split("T")[0];
  }

  async function guardar() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!formulario.cedula || !formulario.cliente || !formulario.plan || !formulario.precio) {
      alert("Complete cédula, cliente, plan y precio.");
      return;
    }

    let clienteCreado = null;

    const { data: clienteExistente, error: errorBuscar } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cedula", formulario.cedula)
      .maybeSingle();

    if (errorBuscar) {
      alert("Error buscando cliente: " + errorBuscar.message);
      return;
    }

    if (clienteExistente) {
      clienteCreado = clienteExistente;
    } else {
      const { data, error } = await supabase
        .from("clientes")
        .insert([
          {
            empresa_id: empresaId,
            cedula: formulario.cedula,
            nombre: formulario.cliente,
            telefono: formulario.telefono,
            correo: formulario.correo,
            estado: "Activo",
          },
        ])
        .select()
        .single();

      if (error) {
        alert("Error creando cliente: " + error.message);
        return;
      }

      clienteCreado = data;
    }

    const numeroCuenta = generarNumeroCuenta();
    const fechaVencimiento = calcularVencimiento();
    const precio = Number(formulario.precio || 0);

    const { data: comercialCreado, error: errorComercial } = await supabase
      .from("informacion_comercial")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteCreado.id,
          numero_cuenta: numeroCuenta,
          tipo_producto: formulario.tipoServicio,
          descripcion: formulario.plan + " - " + formulario.descripcion,
          modalidad: formulario.periodicidad,
          monto_total: precio,
          saldo_actual: precio,
          cuota: precio,
          fecha_inicio: formulario.fechaInicio || null,
          fecha_vencimiento: fechaVencimiento || null,
          responsable: formulario.vendedor || null,
          estado: formulario.estado,
          observacion: formulario.descripcion,
        },
      ])
      .select()
      .single();

    if (errorComercial) {
      alert("Error creando información comercial: " + errorComercial.message);
      return;
    }

    const { error: errorSuscripcion } = await supabase
      .from("suscripciones")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteCreado.id,
          informacion_comercial_id: comercialCreado.id,
          cliente: formulario.cliente,
          cedula: formulario.cedula,
          plan: formulario.plan,
          tipo_servicio: formulario.tipoServicio,
          descripcion: formulario.descripcion,
          precio,
          vendedor: formulario.vendedor,
          fecha_inicio: formulario.fechaInicio || null,
          fecha_vencimiento: fechaVencimiento || null,
          periodicidad: formulario.periodicidad,
          estado: formulario.estado,
        },
      ]);

    if (errorSuscripcion) {
      alert("Error creando suscripción: " + errorSuscripcion.message);
      return;
    }

    const { error: errorCobranza } = await supabase
      .from("informacion_cobranza")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteCreado.id,
          informacion_comercial_id: comercialCreado.id,
          estado_cobranza: formulario.estado === "Activo" ? "Al Día" : formulario.estado,
          responsable_cobro: formulario.vendedor || null,
        },
      ]);

    if (errorCobranza) {
      alert("Suscripción creada, pero hubo error creando cobranza: " + errorCobranza.message);
      return;
    }

    alert("Suscripción creada correctamente. Cuenta: " + numeroCuenta);

    setFormulario({
      cedula: "",
      cliente: "",
      telefono: "",
      correo: "",
      plan: "",
      tipoServicio: "Membresía",
      descripcion: "",
      precio: "",
      vendedor: "",
      fechaInicio: "",
      periodicidad: "Mensual",
      estado: "Activo",
    });
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <h1 style={titulo}>Suscripciones y Membresías</h1>

        <div style={card}>
          <h2>Crear Suscripción</h2>

          <div style={grid}>
            <input
              placeholder="Cédula / Identificación"
              value={formulario.cedula}
              onChange={(e) => setFormulario({ ...formulario, cedula: e.target.value })}
              style={input}
            />

            <input
              placeholder="Cliente"
              value={formulario.cliente}
              onChange={(e) => setFormulario({ ...formulario, cliente: e.target.value })}
              style={input}
            />

            <input
              placeholder="Teléfono"
              value={formulario.telefono}
              onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value })}
              style={input}
            />

            <input
              placeholder="Correo"
              value={formulario.correo}
              onChange={(e) => setFormulario({ ...formulario, correo: e.target.value })}
              style={input}
            />

            <select
              value={formulario.tipoServicio}
              onChange={(e) => setFormulario({ ...formulario, tipoServicio: e.target.value })}
              style={input}
            >
              <option>Gimnasio</option>
              <option>Academia</option>
              <option>Escuela</option>
              <option>Membresía</option>
              <option>Software SaaS</option>
              <option>Servicio Recurrente</option>
            </select>

            <input
              placeholder="Plan"
              value={formulario.plan}
              onChange={(e) => setFormulario({ ...formulario, plan: e.target.value })}
              style={input}
            />

            <input
              placeholder="Precio"
              type="number"
              value={formulario.precio}
              onChange={(e) => setFormulario({ ...formulario, precio: e.target.value })}
              style={input}
            />

            <input
              placeholder="Vendedor / Responsable"
              value={formulario.vendedor}
              onChange={(e) => setFormulario({ ...formulario, vendedor: e.target.value })}
              style={input}
            />

            <input
              type="date"
              value={formulario.fechaInicio}
              onChange={(e) => setFormulario({ ...formulario, fechaInicio: e.target.value })}
              style={input}
            />

            <select
              value={formulario.periodicidad}
              onChange={(e) => setFormulario({ ...formulario, periodicidad: e.target.value })}
              style={input}
            >
              <option>Mensual</option>
              <option>Trimestral</option>
              <option>Semestral</option>
              <option>Anual</option>
            </select>

            <input
              value={calcularVencimiento()}
              readOnly
              placeholder="Fecha vencimiento"
              style={{ ...input, background: "#f3f4f6", fontWeight: "bold" }}
            />

            <select
              value={formulario.estado}
              onChange={(e) => setFormulario({ ...formulario, estado: e.target.value })}
              style={input}
            >
              <option>Activo</option>
              <option>Pendiente</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
            </select>
          </div>

          <textarea
            placeholder="Descripción"
            value={formulario.descripcion}
            onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
            style={textarea}
          />

          <button onClick={guardar} style={boton}>
            Crear Suscripción
          </button>
        </div>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "20px",
};

const contenedor = {
  maxWidth: "1200px",
  margin: "0 auto",
};

const titulo = {
  fontSize: "32px",
  marginBottom: "20px",
};

const card = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "16px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
  gap: "15px",
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const textarea = {
  width: "100%",
  minHeight: "100px",
  marginTop: "15px",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const boton = {
  marginTop: "15px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "12px 25px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};
