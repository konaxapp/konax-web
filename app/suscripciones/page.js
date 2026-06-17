"use client";
 
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
 
export default function Suscripciones() {
  const [suscripciones, setSuscripciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busquedaMembresia, setBusquedaMembresia] = useState("");
  const [busquedaPagos, setBusquedaPagos] = useState("");
 
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
 
  useEffect(() => {
    cargarSuscripciones();
    cargarPagos();
  }, []);
 
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
 
  function sumarMesesFecha(fechaTexto, meses) {
    if (!fechaTexto) return "";
 
    const [anio, mes, dia] = fechaTexto.split("-").map(Number);
    const fecha = new Date(anio, mes - 1 + meses, dia);
 
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(fecha.getDate()).padStart(2, "0")}`;
  }
 
  function calcularVencimientoDesde(fechaBase, periodicidad) {
    if (!fechaBase) return "";
 
    if (periodicidad === "Mensual") return sumarMesesFecha(fechaBase, 1);
    if (periodicidad === "Trimestral") return sumarMesesFecha(fechaBase, 3);
    if (periodicidad === "Semestral") return sumarMesesFecha(fechaBase, 6);
    if (periodicidad === "Anual") return sumarMesesFecha(fechaBase, 12);
 
    return fechaBase;
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
 
    const [anio, mes, dia] = fechaVencimiento.split("-").map(Number);
    const vence = new Date(anio, mes - 1, dia);
    vence.setHours(0, 0, 0, 0);
 
    return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
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
 
  function limpiarTelefono(telefono) {
    return String(telefono || "").replace(/\D/g, "");
  }
 
  function enviarWhatsApp(item) {
    const telefono = limpiarTelefono(item.telefono);
 
    if (!telefono) {
      alert("Este cliente no tiene teléfono registrado.");
      return;
    }
 
    const estado = obtenerEstadoVisual(item);
    const mensaje = `Hola ${item.cliente || ""}. Te recordamos que tu membresía ${
      item.plan || ""
    } ${
      estado === "Vencida"
        ? "se encuentra vencida"
        : estado === "Por vencer"
        ? `vence el ${item.fecha_vencimiento}`
        : `está activa hasta el ${item.fecha_vencimiento}`
    }. Para mantener el servicio activo, puedes realizar tu pago. Gracias.`;
 
    window.open(
      `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
      "_blank"
    );
  }
 
  const membresiasFiltradas = suscripciones.filter((item) =>
    `${item.cliente || ""} ${item.cedula || ""} ${item.telefono || ""} ${
      item.plan || ""
    } ${item.estado || ""}`
      .toLowerCase()
      .includes(busquedaMembresia.toLowerCase())
  );
 
  const pagosFiltrados = pagos.filter((pago) =>
    `${pago.cliente_nombre || ""} ${pago.cliente_cedula || ""} ${
      pago.descripcion || ""
    } ${pago.metodo_pago || ""}`
      .toLowerCase()
      .includes(busquedaPagos.toLowerCase())
  );
 
  const totalActivas = suscripciones.filter(
    (item) => obtenerEstadoVisual(item) === "Activo"
  ).length;
 
  const totalPorVencer = suscripciones.filter(
    (item) => obtenerEstadoVisual(item) === "Por vencer"
  ).length;
 
  const totalVencidas = suscripciones.filter(
    (item) => obtenerEstadoVisual(item) === "Vencida"
  ).length;
 
  const totalSuspendidas = suscripciones.filter(
    (item) => obtenerEstadoVisual(item) === "Suspendido"
  ).length;
 
  const ingresosMes = pagos.reduce((total, pago) => {
    const fecha = pago.fecha_pago || pago.created_at;
    if (!fecha) return total;
 
    const fechaPago = new Date(fecha);
    const hoy = new Date();
 
    if (
      fechaPago.getMonth() === hoy.getMonth() &&
      fechaPago.getFullYear() === hoy.getFullYear()
    ) {
      return total + Number(pago.monto || 0);
    }
 
    return total;
  }, 0);
 
  async function cargarSuscripciones() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;
 
    const { data, error } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fecha_vencimiento", { ascending: true });
 
    if (error) {
      alert("Error cargando membresías: " + error.message);
      return;
    }
 
    setSuscripciones(data || []);
  }
 
  async function cargarPagos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;
 
    const { data } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(50);
 
    setPagos(data || []);
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
        const { data, error } = await supabase
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
 
        if (error) {
          alert("Error actualizando cliente: " + error.message);
          return null;
        }
 
        return data;
      }
 
      if (String(clienteExistente.empresa_id) !== String(empresaId)) {
        alert("Esta cédula ya existe asociada a otra empresa.");
        return null;
      }
 
      return clienteExistente;
    }
 
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
      return null;
    }
 
    return data;
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
          telefono: formulario.telefono,
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
      alert("Error creando membresía: " + errorSuscripcion.message);
      return;
    }
 
    await supabase.from("informacion_cobranza").insert([
      {
        empresa_id: empresaId,
        cliente_id: clienteCreado.id,
        informacion_comercial_id: comercialCreado.id,
        estado_cobranza:
          formulario.estado === "Activo" ? "Al Día" : formulario.estado,
        responsable_cobro: formulario.vendedor || null,
      },
    ]);
 
    setCargando(false);
    alert("Membresía creada correctamente. Cuenta: " + numeroCuenta);
 
    limpiarFormulario();
    cargarSuscripciones();
  }
 
  async function renovarSuscripcion(item) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;
 
    const confirmar = confirm(
      `¿Registrar pago y renovar membresía de ${item.cliente}?`
    );
 
    if (!confirmar) return;
 
    const precio = Number(item.precio || 0);
 
    const fechaBase =
      calcularDiasParaVencer(item.fecha_vencimiento) < 0
        ? new Date().toISOString().split("T")[0]
        : item.fecha_vencimiento;
 
    const nuevaFecha = calcularVencimientoDesde(fechaBase, item.periodicidad);
 
    const { error: errorCaja } = await supabase.from("caja").insert([
      {
        empresa_id: empresaId,
        cliente_id: item.cliente_id,
        informacion_comercial_id: item.informacion_comercial_id,
        tipo: "Suscripción",
        tipo_movimiento: "PAGO_MEMBRESIA",
        descripcion: `Renovación de membresía: ${item.plan}`,
        monto: precio,
        metodo_pago: item.forma_pago || "Efectivo",
        fecha_pago: new Date().toISOString(),
        estado: "Procesado",
        cliente_nombre: item.cliente || null,
        cliente_cedula: item.cedula || null,
      },
    ]);
 
    if (errorCaja) {
      alert("Error registrando pago: " + errorCaja.message);
      return;
    }
 
    await supabase
      .from("suscripciones")
      .update({
        fecha_vencimiento: nuevaFecha,
        estado: "Activo",
      })
      .eq("id", item.id)
      .eq("empresa_id", empresaId);
 
    await supabase
      .from("informacion_comercial")
      .update({
        fecha_vencimiento: nuevaFecha,
        saldo_actual: precio,
        estado: "Activo",
      })
      .eq("id", item.informacion_comercial_id)
      .eq("empresa_id", empresaId);
 
    await supabase
      .from("informacion_cobranza")
      .update({
        estado_cobranza: "Al Día",
        fecha_ultimo_pago: new Date().toISOString(),
        monto_ultimo_pago: precio,
      })
      .eq("informacion_comercial_id", item.informacion_comercial_id)
      .eq("empresa_id", empresaId);
 
    alert("Membresía renovada correctamente.");
    cargarSuscripciones();
    cargarPagos();
  }
 
  async function cambiarEstado(item, nuevoEstado) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;
 
    await supabase
      .from("suscripciones")
      .update({ estado: nuevoEstado })
      .eq("id", item.id)
      .eq("empresa_id", empresaId);
 
    await supabase
      .from("informacion_comercial")
      .update({ estado: nuevoEstado })
      .eq("id", item.informacion_comercial_id)
      .eq("empresa_id", empresaId);
 
    await supabase
      .from("informacion_cobranza")
      .update({ estado_cobranza: nuevoEstado })
      .eq("informacion_comercial_id", item.informacion_comercial_id)
      .eq("empresa_id", empresaId);
 
    alert(`Membresía actualizada a ${nuevoEstado}.`);
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
 
        <div style={resumenGrid}>
          <div style={resumenCard}>
            <span>Activas</span>
            <strong>{totalActivas}</strong>
          </div>
 
          <div style={resumenCard}>
            <span>Por vencer</span>
            <strong>{totalPorVencer}</strong>
          </div>
 
          <div style={resumenCard}>
            <span>Vencidas</span>
            <strong>{totalVencidas}</strong>
          </div>
 
          <div style={resumenCard}>
            <span>Suspendidas</span>
            <strong>{totalSuspendidas}</strong>
          </div>
 
          <div style={resumenCard}>
            <span>Ingresos del mes</span>
            <strong>${ingresosMes.toFixed(2)}</strong>
          </div>
        </div>
 
        <div style={card}>
          <h2>Crear Membresía</h2>
 
          <div style={grid}>
            <input placeholder="Cédula / Identificación" value={formulario.cedula} onChange={(e) => setFormulario({ ...formulario, cedula: e.target.value })} style={input} />
            <input placeholder="Nombre del cliente" value={formulario.cliente} onChange={(e) => setFormulario({ ...formulario, cliente: e.target.value })} style={input} />
            <input placeholder="Teléfono para WhatsApp" value={formulario.telefono} onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value })} style={input} />
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
 
        <div style={card}>
          <h2>Clientes con Membresía</h2>
 
          <div style={toolbar}>
            <input
              placeholder="Buscar cliente, cédula, teléfono o plan..."
              value={busquedaMembresia}
              onChange={(e) => setBusquedaMembresia(e.target.value)}
              style={input}
            />
 
            <button onClick={() => setBusquedaMembresia("")} style={botonSecundario}>
              Ver todos
            </button>
          </div>
 
          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Precio</th>
                  <th style={th}>Vence</th>
                  <th style={th}>Días</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>
 
              <tbody>
                {membresiasFiltradas.length === 0 ? (
                  <tr>
                    <td style={td} colSpan="8">No hay membresías registradas.</td>
                  </tr>
                ) : (
                  membresiasFiltradas.map((item) => {
                    const dias = calcularDiasParaVencer(item.fecha_vencimiento);
                    const estado = obtenerEstadoVisual(item);
 
                    return (
                      <tr key={item.id}>
                        <td style={td}>{item.cliente}</td>
                        <td style={td}>{item.cedula}</td>
                        <td style={td}>{item.plan}</td>
                        <td style={td}>${Number(item.precio || 0).toFixed(2)}</td>
                        <td style={td}>{item.fecha_vencimiento || "-"}</td>
                        <td style={td}>{dias}</td>
                        <td style={td}>
                          <span style={estado === "Vencida" || estado === "Suspendido" ? estadoRojo : estadoVerde}>
                            {estado}
                          </span>
                        </td>
                        <td style={td}>
                          <button style={botonPequeno} onClick={() => renovarSuscripcion(item)}>Renovar</button>
                          <button style={botonNaranja} onClick={() => cambiarEstado(item, "Suspendido")}>Suspender</button>
                          <button style={botonAzul} onClick={() => cambiarEstado(item, "Activo")}>Reactivar</button>
                          <button style={whatsappBtn} onClick={() => enviarWhatsApp(item)}>WhatsApp</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
 
        <div style={card}>
          <h2>Historial de Pagos</h2>
 
          <div style={toolbar}>
            <input
              placeholder="Buscar historial por cliente, cédula, método o descripción..."
              value={busquedaPagos}
              onChange={(e) => setBusquedaPagos(e.target.value)}
              style={input}
            />
 
            <button onClick={() => setBusquedaPagos("")} style={botonSecundario}>
              Ver todos
            </button>
          </div>
 
          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Descripción</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Método</th>
                </tr>
              </thead>
 
              <tbody>
                {pagosFiltrados.length === 0 ? (
                  <tr>
                    <td style={td} colSpan="6">No hay pagos registrados.</td>
                  </tr>
                ) : (
                  pagosFiltrados.map((pago) => (
                    <tr key={pago.id}>
                      <td style={td}>{pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleString() : "-"}</td>
                      <td style={td}>{pago.cliente_nombre || "-"}</td>
                      <td style={td}>{pago.cliente_cedula || "-"}</td>
                      <td style={td}>{pago.descripcion || "-"}</td>
                      <td style={td}>${Number(pago.monto || 0).toFixed(2)}</td>
                      <td style={td}>{pago.metodo_pago || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
 
const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: "15px",
  marginBottom: "20px",
};
 
const resumenCard = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "14px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  display: "grid",
  gap: "8px",
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
 
const toolbar = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "12px",
  marginBottom: "15px",
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
 
const botonSecundario = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};
 
const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "15px",
  fontSize: "14px",
};
 
const th = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
};
 
const td = {
  padding: "10px",
  borderBottom: "1px solid #f3f4f6",
};
 
const botonPequeno = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  cursor: "pointer",
  marginRight: "6px",
  marginBottom: "5px",
  fontWeight: "bold",
};
 
const botonNaranja = {
  background: "#f97316",
  color: "#fff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  cursor: "pointer",
  marginRight: "6px",
  marginBottom: "5px",
  fontWeight: "bold",
};
 
const botonAzul = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  cursor: "pointer",
  marginRight: "6px",
  marginBottom: "5px",
  fontWeight: "bold",
};
 
const whatsappBtn = {
  background: "#25D366",
  color: "#fff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  cursor: "pointer",
  marginBottom: "5px",
  fontWeight: "bold",
};
 
const estadoVerde = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
};
 
const estadoRojo = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "5px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
};
