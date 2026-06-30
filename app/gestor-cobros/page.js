"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function GestorCobros() {
  const [cartera, setCartera] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCartera, setFiltroCartera] = useState("Todos");

  useEffect(() => {
    cargarCartera();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      return null;
    }

    return empresaId;
  }

  function obtenerGestorActual() {
    return {
      id:
        localStorage.getItem("usuarioId") ||
        localStorage.getItem("adminKonaxId") ||
        "",
      nombre:
        localStorage.getItem("nombreUsuario") ||
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("adminKonaxNombre") ||
        "",
      correo:
        localStorage.getItem("correoUsuario") ||
        localStorage.getItem("usuarioCorreo") ||
        "",
    };
  }

  function fechaSimple(fecha) {
    return String(fecha || "").slice(0, 10);
  }

  function limpiarTexto(texto) {
    return String(texto || "").toLowerCase().trim();
  }

  function obtenerManana() {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 1);
    return fecha.toISOString().split("T")[0];
  }

  function calcularDias(fechaVencimiento, saldo) {
    if (!fechaVencimiento || Number(saldo || 0) <= 0) return 0;

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diff = hoy - vencimiento;

    if (diff <= 0) return 0;

    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function obtenerSemaforo(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "⚫ Cancelado";
    if (dias <= 0) return "🟢 Al Día";
    if (dias <= 30) return "🟡 Mora 1-30 días";
    if (dias <= 90) return "🟠 Mora 31-90 días";
    if (dias <= 365) return "🔴 Mora mayor a 90 días";
    return "⚫ Mora mayor a 1 año";
  }

  function obtenerEstado(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "Cancelado";
    if (dias <= 0) return "Al Día";
    if (dias <= 30) return "Mora 1-30";
    if (dias <= 90) return "Mora 31-90";
    if (dias <= 365) return "Mora +90";
    return "Mora +1 año";
  }

  function perteneceAlGestor(cobranza, gestor) {
    const responsableId = String(cobranza?.responsable_cobro_id || "");
    const responsableNombre = limpiarTexto(cobranza?.responsable_cobro);
    const gestorId = String(gestor.id || "");
    const gestorNombre = limpiarTexto(gestor.nombre);
    const gestorCorreo = limpiarTexto(gestor.correo);

    return (
      (gestorId && responsableId === gestorId) ||
      (gestorNombre && responsableNombre === gestorNombre) ||
      (gestorCorreo && responsableNombre === gestorCorreo)
    );
  }

  async function cargarCartera() {
    const empresaId = obtenerEmpresaId();
    const gestor = obtenerGestorActual();

    if (!empresaId) return;

    const { data: cobranzaData, error: errorCobranza } = await supabase
      .from("informacion_cobranza")
      .select("*")
      .eq("empresa_id", empresaId);

    if (errorCobranza) {
      alert("Error cargando cartera del gestor: " + errorCobranza.message);
      return;
    }

    const cobranzas = (cobranzaData || []).filter((c) =>
      perteneceAlGestor(c, gestor)
    );

    const cuentaIds = cobranzas
      .map((c) => c.informacion_comercial_id)
      .filter(Boolean);

    const clienteIds = cobranzas.map((c) => c.cliente_id).filter(Boolean);

    let cuentas = [];
    let clientes = [];
    let pagosCaja = [];

    if (cuentaIds.length > 0) {
      const { data } = await supabase
        .from("informacion_comercial")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("id", cuentaIds);

      cuentas = data || [];
    }

    if (clienteIds.length > 0) {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("id", clienteIds);

      clientes = data || [];
    }

    const { data: pagosData } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("estado", "Procesado")
      .in("tipo", [
        "Pago Crédito",
        "Pago Credito",
        "COBRO CRÉDITO",
        "Cobro Crédito",
        "Mensualidad",
      ]);

    pagosCaja = pagosData || [];

    const armada = cobranzas.map((cobranza) => {
      const cuenta = cuentas.find(
        (c) => String(c.id) === String(cobranza.informacion_comercial_id)
      );

      const cliente = clientes.find(
        (c) => String(c.id) === String(cobranza.cliente_id)
      );

      const pagosDeCuenta = pagosCaja.filter((p) => {
        const cuentaPago = String(
          p.numero_cuenta || p.cuenta || p.codigo_cuenta || ""
        ).trim();

        const cedulaPago = String(
          p.cedula || p.cliente_cedula || p.identificacion || ""
        ).trim();

        return (
          cuentaPago === String(cuenta?.numero_cuenta || "").trim() ||
          cedulaPago === String(cliente?.cedula || "").trim() ||
          String(p.cliente_id || "") === String(cliente?.id || "") ||
          String(p.informacion_comercial_id || "") === String(cuenta?.id || "")
        );
      });

      const totalPagado = pagosDeCuenta.reduce(
        (sum, p) => sum + Number(p.monto || 0),
        0
      );

      const montoBase = Number(
        cuenta?.monto_total ||
          cuenta?.saldo_original ||
          cuenta?.precio_credito ||
          cuenta?.saldo_actual ||
          0
      );

      const saldoCalculado = Math.max(montoBase - totalPagado, 0);
      const dias = calcularDias(cuenta?.fecha_vencimiento, saldoCalculado);

      return {
        cobranza,
        cuenta,
        cliente,
        dias,
        saldoCalculado,
        totalPagado,
        estado: obtenerEstado(dias, saldoCalculado),
        semaforo: obtenerSemaforo(dias, saldoCalculado),
      };
    });

    setCartera(armada);
  }

  function obtenerTipoGestion(resultado) {
    if (resultado === "WhatsApp enviado") return "WhatsApp";
    if (resultado === "Seguimiento pendiente") return "Seguimiento";
    return "Llamada";
  }

  async function registrarGestionRealizada(item, resultado) {
    const empresaId = obtenerEmpresaId();
    const gestor = obtenerGestorActual();

    if (!empresaId || !resultado) return;

    const tipoGestion = obtenerTipoGestion(resultado);
    const proximaGestion = obtenerManana();

    const { error } = await supabase
      .from("informacion_cobranza")
      .update({
        ultimo_resultado_gestion: resultado,
        ultima_observacion: `Gestión rápida registrada desde cartera: ${resultado}`,
        fecha_ultima_gestion: new Date().toISOString(),
        proxima_gestion: proximaGestion,
        estado_cobranza: item.estado,
        alerta_cobranza: "Seguimiento programado",
        prioridad_cobranza:
          item.dias > 90 ? "Alta" : item.dias > 0 ? "Media" : "Normal",
      })
      .eq("id", item.cobranza.id);

    if (error) {
      alert("Error registrando gestión: " + error.message);
      return;
    }

    await supabase.from("bitacora_cliente").insert([
      {
        empresa_id: empresaId,
        cliente_id: item.cliente?.id,
        informacion_comercial_id: item.cuenta?.id,
        tipo_gestion: tipoGestion,
        resultado_gestion: resultado,
        descripcion: `Gestión rápida registrada desde Mi Cartera: ${resultado}`,
        usuario: gestor.nombre || gestor.correo || "Gestor",
        fecha_gestion: new Date().toISOString(),
      },
    ]);

    await supabase.from("alertas_cobranza").insert([
      {
        empresa_id: empresaId,
        cliente_id: item.cliente?.id,
        informacion_comercial_id: item.cuenta?.id,
        informacion_cobranza_id: item.cobranza?.id,
        gestor: gestor.nombre || gestor.correo || "Gestor",
        tipo_alerta: "Próxima gestión",
        descripcion: `Próxima gestión programada para ${proximaGestion}. Resultado: ${resultado}`,
        prioridad: item.dias > 90 ? "Alta" : "Media",
        fecha_alerta: proximaGestion,
        fecha_vencimiento: proximaGestion,
        estado: "Activa",
      },
    ]);

    alert("Gestión registrada correctamente. Próxima gestión: mañana.");
    await cargarCartera();
  }

  function verCliente(item) {
    localStorage.setItem(
      "busquedaVistaCliente",
      item.cuenta?.numero_cuenta ||
        item.cliente?.cedula ||
        item.cliente?.nombre ||
        ""
    );

    window.location.href = "/vista-cliente";
  }

  function abrirWhatsApp(cliente) {
    const telefono = String(cliente?.telefono || "").replace(/\D/g, "");

    if (!telefono) {
      alert("Este cliente no tiene teléfono registrado.");
      return;
    }

    window.open(`https://wa.me/507${telefono}`, "_blank");
  }

  function imprimirCartera() {
    window.print();
  }

  const hoy = new Date().toISOString().split("T")[0];

  const carteraFiltrada = cartera.filter((item) => {
    const texto = limpiarTexto(busqueda);

    const coincideBusqueda =
      !texto ||
      limpiarTexto(item.cliente?.nombre).includes(texto) ||
      limpiarTexto(item.cliente?.cedula).includes(texto) ||
      limpiarTexto(item.cuenta?.numero_cuenta).includes(texto);

    if (filtroCartera === "Al Día") {
      return coincideBusqueda && item.dias <= 0 && item.saldoCalculado > 0;
    }

    if (filtroCartera === "Mora total") {
      return coincideBusqueda && item.dias > 0;
    }

    if (filtroCartera === "Mora 1-30 días") {
      return coincideBusqueda && item.dias > 0 && item.dias <= 30;
    }

    if (filtroCartera === "Mora 31-90 días") {
      return coincideBusqueda && item.dias > 30 && item.dias <= 90;
    }

    if (filtroCartera === "Mora mayor a 90 días") {
      return coincideBusqueda && item.dias > 90;
    }

    if (filtroCartera === "Mora mayor a 1 año") {
      return coincideBusqueda && item.dias > 365;
    }

    if (filtroCartera === "Sin teléfono") {
      return coincideBusqueda && !item.cliente?.telefono;
    }

    if (filtroCartera === "Sin gestionar hoy") {
      return (
        coincideBusqueda &&
        fechaSimple(item.cobranza?.fecha_ultima_gestion) !== hoy
      );
    }

    if (filtroCartera === "Promesas vencidas") {
      return (
        coincideBusqueda &&
        item.cobranza?.estado_promesa === "Activa" &&
        item.cobranza?.proxima_gestion &&
        fechaSimple(item.cobranza?.proxima_gestion) < hoy
      );
    }

    return coincideBusqueda;
  });

  const clientesAsignados = cartera.length;

  const gestionesDelDia = cartera.filter(
    (item) => fechaSimple(item.cobranza?.fecha_ultima_gestion) === hoy
  ).length;

  const pendientesGestionHoy = Math.max(clientesAsignados - gestionesDelDia, 0);

  const promesasVencidas = cartera.filter(
    (item) =>
      item.cobranza?.estado_promesa === "Activa" &&
      item.cobranza?.proxima_gestion &&
      fechaSimple(item.cobranza?.proxima_gestion) < hoy
  ).length;

  const moraTotalCantidad = cartera.filter((item) => item.dias > 0).length;
  const moraMayor90Cantidad = cartera.filter((item) => item.dias > 90).length;
  const moraMayorAnoCantidad = cartera.filter((item) => item.dias > 365).length;

  const clientesSinTelefono = cartera.filter(
    (item) => !item.cliente?.telefono
  ).length;

  const montoAsignado = cartera.reduce(
    (sum, item) => sum + Number(item.saldoCalculado || 0),
    0
  );

  const montoAlDia = cartera
    .filter((item) => item.dias <= 0 && item.saldoCalculado > 0)
    .reduce((sum, item) => sum + Number(item.saldoCalculado || 0), 0);

  const montoMoraTotal = cartera
    .filter((item) => item.dias > 0)
    .reduce((sum, item) => sum + Number(item.saldoCalculado || 0), 0);

  const montoMoraMayor90 = cartera
    .filter((item) => item.dias > 90)
    .reduce((sum, item) => sum + Number(item.saldoCalculado || 0), 0);

  const porcentajeAlDia =
    montoAsignado > 0 ? Math.round((montoAlDia / montoAsignado) * 100) : 0;

  const porcentajeMora =
    montoAsignado > 0 ? Math.round((montoMoraTotal / montoAsignado) * 100) : 0;

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />

          <div style={{ flex: 1 }}>
            <h1 style={titulo}>Mi Cartera de Cobro</h1>
            <p style={subtitulo}>Espacio de trabajo del gestor de cobranza.</p>
          </div>

          <button style={botonNegro} onClick={cargarCartera}>
            Actualizar
          </button>

          <button style={botonNegro} onClick={imprimirCartera}>
            Imprimir mi cartera
          </button>
        </div>

        <div style={alertasGrid}>
          <Alerta titulo="Promesas vencidas" valor={promesasVencidas} />
          <Alerta titulo="Pendientes hoy" valor={pendientesGestionHoy} />
          <Alerta titulo="Mora mayor a 90 días" valor={moraMayor90Cantidad} />
          <Alerta titulo="Sin teléfono" valor={clientesSinTelefono} />
        </div>

        <div style={kpiGrid}>
          <KPI titulo="Clientes asignados" valor={clientesAsignados} />
          <KPI titulo="Gestiones del día" valor={gestionesDelDia} />
          <KPI titulo="Pendientes de gestión" valor={pendientesGestionHoy} />
          <KPI titulo="Mora total" valor={moraTotalCantidad} />
          <KPI titulo="Mora +90 días" valor={moraMayor90Cantidad} />
          <KPI titulo="Mora +1 año" valor={moraMayorAnoCantidad} />
          <KPI titulo="Monto asignado" valor={montoAsignado} tipo="dinero" />
          <KPI titulo="Monto Al Día" valor={montoAlDia} tipo="dinero" />
          <KPI titulo="% Al Día" valor={porcentajeAlDia} tipo="porcentaje" />
          <KPI titulo="Monto en Mora" valor={montoMoraTotal} tipo="dinero" />
          <KPI titulo="% Mora" valor={porcentajeMora} tipo="porcentaje" />
          <KPI titulo="Mora +90 $" valor={montoMoraMayor90} tipo="dinero" />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Filtros de cartera</h2>

          <div style={gridFiltros}>
            <Campo label="Buscar cliente, cédula o cuenta">
              <input
                placeholder="Ejemplo: Ana, 8-888, CTA-001"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Ver cartera por estado de mora">
              <select
                value={filtroCartera}
                onChange={(e) => setFiltroCartera(e.target.value)}
                style={inputStyle}
              >
                <option>Todos</option>
                <option>Al Día</option>
                <option>Mora total</option>
                <option>Mora 1-30 días</option>
                <option>Mora 31-90 días</option>
                <option>Mora mayor a 90 días</option>
                <option>Mora mayor a 1 año</option>
                <option>Promesas vencidas</option>
                <option>Sin gestionar hoy</option>
                <option>Sin teléfono</option>
              </select>
            </Campo>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Clientes asignados</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Semáforo</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Teléfono</th>
                  <th style={th}>Cuenta</th>
                  <th style={th}>Saldo</th>
                  <th style={th}>Pagado</th>
                  <th style={th}>Cuota</th>
                  <th style={th}>Días mora</th>
                  <th style={th}>Vista cliente</th>
                  <th style={th}>WhatsApp</th>
                  <th style={th}>Registrar gestión</th>
                </tr>
              </thead>

              <tbody>
                {carteraFiltrada.map((item) => (
                  <tr key={item.cobranza.id}>
                    <td style={td}>{item.semaforo}</td>
                    <td style={td}>{item.cliente?.nombre || "-"}</td>
                    <td style={td}>{item.cliente?.cedula || "-"}</td>
                    <td style={td}>{item.cliente?.telefono || "-"}</td>
                    <td style={td}>{item.cuenta?.numero_cuenta || "-"}</td>
                    <td style={td}>
                      ${Number(item.saldoCalculado || 0).toLocaleString()}
                    </td>
                    <td style={td}>
                      ${Number(item.totalPagado || 0).toLocaleString()}
                    </td>
                    <td style={td}>
                      ${Number(item.cuenta?.cuota || 0).toLocaleString()}
                    </td>
                    <td style={td}>{item.dias}</td>

                    <td style={td}>
                      <button style={boton} onClick={() => verCliente(item)}>
                        Vista cliente
                      </button>
                    </td>

                    <td style={td}>
                      <button
                        style={whatsappBtn}
                        onClick={() => abrirWhatsApp(item.cliente)}
                      >
                        WhatsApp
                      </button>
                    </td>

                    <td style={td}>
                      <select
                        style={inputMini}
                        defaultValue=""
                        onChange={(e) => {
                          registrarGestionRealizada(item, e.target.value);
                          e.target.value = "";
                        }}
                      >
                        <option value="">Seleccionar gestión</option>
                        <option>Llamada realizada</option>
                        <option>WhatsApp enviado</option>
                        <option>No contestó</option>
                        <option>No localizado</option>
                        <option>Número apagado</option>
                        <option>Se conversó con cliente</option>
                        <option>Se mudó</option>
                        <option>Seguimiento pendiente</option>
                      </select>
                    </td>
                  </tr>
                ))}

                {carteraFiltrada.length === 0 && (
                  <tr>
                    <td style={td} colSpan="12">
                      No hay clientes asignados con este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p style={nota}>
            La cartera se actualiza con pagos registrados en caja como Pago Crédito, siempre que coincida cuenta, cédula o cliente.
          </p>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function KPI({ titulo, valor, tipo }) {
  let mostrar = Number(valor || 0).toLocaleString();

  if (tipo === "dinero") mostrar = "$" + Number(valor || 0).toLocaleString();
  if (tipo === "porcentaje") mostrar = Number(valor || 0).toLocaleString() + "%";

  return (
    <div style={cardKpi}>
      <p style={kpiTitulo}>{titulo}</p>
      <h2 style={kpiValor}>{mostrar}</h2>
    </div>
  );
}

function Alerta({ titulo, valor }) {
  return (
    <div style={cardAlerta}>
      <p style={alertaTitulo}>{titulo}</p>
      <h2 style={alertaValor}>{Number(valor || 0).toLocaleString()}</h2>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "18px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1500px",
  margin: "0 auto",
};

const encabezado = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const logo = {
  width: "105px",
  height: "auto",
};

const titulo = {
  fontSize: "32px",
  margin: 0,
  color: "#111827",
};

const subtitulo = {
  marginTop: "5px",
  color: "#6b7280",
  fontSize: "15px",
};

const alertasGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const cardAlerta = {
  background: "#fff7ed",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #fed7aa",
};

const alertaTitulo = {
  margin: 0,
  color: "#9a3412",
  fontSize: "13px",
  fontWeight: "bold",
};

const alertaValor = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#111827",
  fontSize: "24px",
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const cardKpi = {
  background: "#ffffff",
  padding: "17px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const kpiTitulo = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
};

const kpiValor = {
  marginTop: "8px",
  color: "#111827",
  fontSize: "23px",
};

const card = {
  background: "#ffffff",
  padding: "18px",
  borderRadius: "16px",
  marginBottom: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const tituloSeccion = {
  marginBottom: "14px",
  color: "#111827",
};

const gridFiltros = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: "14px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const inputMini = {
  width: "190px",
  padding: "8px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonNegro = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "11px 20px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const whatsappBtn = {
  background: "#25D366",
  color: "#ffffff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  background: "#111827",
  color: "#ffffff",
  padding: "12px",
  textAlign: "left",
  fontSize: "13px",
};

const td = {
  padding: "11px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
};

const nota = {
  marginTop: "12px",
  color: "#6b7280",
  fontSize: "13px",
};
