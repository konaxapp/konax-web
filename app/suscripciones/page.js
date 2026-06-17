"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Suscripciones() {
  const [suscripciones, setSuscripciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [formulario, setFormulario] = useState({
    cedula: "",
    cliente: "",
    telefono: "",
    correo: "",
    plan: "",
    descripcion: "",
    precio: "",
    vendedor: "",
    fechaInicio: "",
    periodicidad: "Mensual",
    formaPago: "Efectivo",
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
    return "MEM-" + Date.now();
  }

  function convertirFechaLocal(fechaTexto) {
    if (!fechaTexto) return null;
    const [anio, mes, dia] = fechaTexto.split("-").map(Number);
    return new Date(anio, mes - 1, dia);
  }

  function sumarMesesFecha(fechaTexto, meses) {
    if (!fechaTexto) return "";

    const [anio, mes, dia] = fechaTexto.split("-").map(Number);
    const fecha = new Date(anio, mes - 1 + meses, dia);

    const nuevoAnio = fecha.getFullYear();
    const nuevoMes = String(fecha.getMonth() + 1).padStart(2, "0");
    const nuevoDia = String(fecha.getDate()).padStart(2, "0");

    return `${nuevoAnio}-${nuevoMes}-${nuevoDia}`;
  }

  function calcularVencimientoDesde(fechaBase, periodicidad) {
    if (!fechaBase) return "";

    switch (periodicidad) {
      case "Mensual":
        return sumarMesesFecha(fechaBase, 1);
      case "Trimestral":
        return sumarMesesFecha(fechaBase, 3);
      case "Semestral":
        return sumarMesesFecha(fechaBase, 6);
      case "Anual":
        return sumarMesesFecha(fechaBase, 12);
      default:
        return fechaBase;
    }
  }

  function calcularVencimiento() {
    return calcularVencimientoDesde(
      formulario.fechaInicio,
      formulario.periodicidad
    );
  }

  function calcularDiasParaVencer(fechaVencimiento) {
    if (!fechaVencimiento) return 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vence = convertirFechaLocal(fechaVencimiento);
    if (!vence) return 0;

    vence.setHours(0, 0, 0, 0);

    const diferencia = vence - hoy;
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  function obtenerEstadoVisual(item) {
    if (item.estado === "Suspendido") return "Suspendido";
    if (item.estado === "Cancelado") return "Cancelado";

    const dias = calcularDiasParaVencer(item.fecha_vencimiento);

    if (dias < 0) return "Vencida";
    if (dias <= 3) return "Por vencer";

    return item.estado || "Activo";
  }

  function limpiarFormulario() {
    setFormulario({
      cedula: "",
      cliente: "",
      telefono: "",
      correo: "",
      plan: "",
      descripcion: "",
      precio: "",
      vendedor: "",
      fechaInicio: "",
      periodicidad: "Mensual",
      formaPago: "Efectivo",
      estado: "Activo",
    });
  }

  useEffect(() => {
    cargarSuscripciones();
    cargarPagos();
  }, []);

  async function cargarSuscripciones() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      alert("Error cargando suscripciones: " + error.message);
      return;
    }

    setSuscripciones(data || []);
  }

  async function cargarPagos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) {
      setPagos(data || []);
    }
  }

  async function obtenerOCrearCliente(empresaId) {
    const { data: clienteExistente, error: errorBuscar } = await supabase
      .from("clientes")
      .select("*")
      .eq("cedula", formulario.cedula)
      .maybeSingle();

    if (errorBuscar) {
      alert("Error buscando cliente: " + errorBuscar.message);
      return null;
    }

    if (clienteExistente) {
      if (!clienteExistente.empresa_id) {
        const { data: clienteActualizado, error: errorActualizar } =
          await supabase
            .from("clientes")
            .update({
              empresa_id: empresaId,
              nombre: formulario.cliente || clienteExistente.nombre,
              telefono: formulario.telefono || clienteExistente.telefono,
              correo: formulario.correo || clienteExistente.correo,
              estado: "Activo",
            })
            .eq("id", clienteExistente.id)
            .select()
            .single();

        if (errorActualizar) {
          alert("Error actualizando cliente: " + errorActualizar.message);
          return null;
        }

        return clienteActualizado;
      }

     if (String(clienteExistente.empresa_id) !== String(empresaId)) {
        alert("Esta cédula ya existe asociada a otra empresa.");
        return null;
      }

      return clienteExistente;
      }

    const { data: clienteNuevo, error: errorCrear } = await supabase
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

    if (errorCrear) {
      alert("Error creando cliente: " + errorCrear.message);
      return null;
    }

    return clienteNuevo;
  }

  async function crearSuscripcion() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (
      !formulario.cedula ||
      !formulario.cliente ||
      !formulario.plan ||
      !formulario.precio ||
      !formulario.fechaInicio
    ) {
      alert("Complete cédula, cliente, plan, precio y fecha de inicio.");
      return;
    }

    setCargando(true);

    const clienteCreado = await obtenerOCrearCliente(empresaId);

    if (!clienteCreado) {
      setCargando(false);
      return;
    }

    const numeroCuenta = generarNumeroCuenta();
    const precio = Number(formulario.precio || 0);
    const fechaVencimiento = calcularVencimiento();

    const { data: comercialCreado, error: errorComercial } = await supabase
      .from("informacion_comercial")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: clienteCreado.id,
          numero_cuenta: numeroCuenta,
          tipo_producto: "Membresía",
          descripcion: `${formulario.plan} - ${formulario.descripcion}`,
          modalidad: formulario.periodicidad,
          monto_total: precio,
          saldo_actual: precio,
          cuota: precio,
          fecha_inicio: formulario.fechaInicio,
          fecha_vencimiento: fechaVencimiento,
          responsable: formulario.vendedor || null,
          estado: formulario.estado,
          observacion: formulario.descripcion,
        },
      ])
      .select()
      .single();

    if (errorComercial) {
      setCargando(false);
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
          tipo_servicio: "Membresía",
          descripcion: formulario.descripcion,
          precio,
          vendedor: formulario.vendedor,
          forma_pago: formulario.formaPago,
          fecha_inicio: formulario.fechaInicio,
          fecha_vencimiento: fechaVencimiento,
          periodicidad: formulario.periodicidad,
          estado: formulario.estado,
        },
      ]);

    if (errorSuscripcion) {
      setCargando(false);
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
          estado_cobranza:
            formulario.estado === "Activo" ? "Al Día" : formulario.estado,
          responsable_cobro: formulario.vendedor || null,
        },
      ]);

    if (errorCobranza) {
      setCargando(false);
      alert("Membresía creada, pero hubo error creando cobranza: " + errorCobranza.message);
      return;
    }

    setCargando(false);
    alert("Membresía creada correctamente. Cuenta: " + numeroCuenta);

    limpiarFormulario();
    cargarSuscripciones();
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={logoBox}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
        </div>

        <h1 style={titulo}>Suscripciones y Membresías</h1>

        <p style={subtitulo}>
          Control de membresías, vencimientos, renovaciones y suspensiones.
        </p>

        <div style={card}>
          <h2>Crear Membresía</h2>

          <div style={grid}>
            <input placeholder="Cédula / Identificación" value={formulario.cedula} onChange={(e) => setFormulario({ ...formulario, cedula: e.target.value })} style={input} />
            <input placeholder="Nombre del cliente" value={formulario.cliente} onChange={(e) => setFormulario({ ...formulario, cliente: e.target.value })} style={input} />
            <input placeholder="Teléfono" value={formulario.telefono} onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value })} style={input} />
            <input placeholder="Correo" value={formulario.correo} onChange={(e) => setFormulario({ ...formulario, correo: e.target.value })} style={input} />
            <input placeholder="Plan / Membresía" value={formulario.plan} onChange={(e) => setFormulario({ ...formulario, plan: e.target.value })} style={input} />
            <input placeholder="Precio" type="number" value={formulario.precio} onChange={(e) => setFormulario({ ...formulario, precio: e.target.value })} style={input} />

            <select value={formulario.periodicidad} onChange={(e) => setFormulario({ ...formulario, periodicidad: e.target.value })} style={input}>
              <option>Mensual</option>
              <option>Trimestral</option>
              <option>Semestral</option>
              <option>Anual</option>
            </select>

            <select value={formulario.formaPago} onChange={(e) => setFormulario({ ...formulario, formaPago: e.target.value })} style={input}>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Tarjeta</option>
              <option>Yappy</option>
              <option>ACH</option>
              <option>Débito Directo</option>
            </select>

            <input placeholder="Responsable / Vendedor" value={formulario.vendedor} onChange={(e) => setFormulario({ ...formulario, vendedor: e.target.value })} style={input} />

            <input type="date" value={formulario.fechaInicio} onChange={(e) => setFormulario({ ...formulario, fechaInicio: e.target.value })} style={input} />

            <input value={calcularVencimiento()} readOnly placeholder="Fecha vencimiento" style={{ ...input, background: "#f3f4f6", fontWeight: "bold" }} />

            <select value={formulario.estado} onChange={(e) => setFormulario({ ...formulario, estado: e.target.value })} style={input}>
              <option>Activo</option>
              <option>Pendiente</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
            </select>
          </div>

          <textarea placeholder="Descripción / Nota" value={formulario.descripcion} onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })} style={textarea} />

          <button onClick={crearSuscripcion} disabled={cargando} style={boton}>
            {cargando ? "Guardando..." : "Crear Membresía"}
          </button>
        </div>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1300px",
  margin: "0 auto",
};

const logoBox = {
  textAlign: "center",
  marginBottom: "25px",
};

const logo = {
  width: "260px",
  maxWidth: "100%",
  height: "auto",
};

const titulo = {
  fontSize: "40px",
  marginBottom: "10px",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  fontSize: "18px",
  marginBottom: "30px",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
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
                                                      
