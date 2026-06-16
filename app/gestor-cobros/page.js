"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function GestorCobros() {
  const [cartera, setCartera] = useState([]);
  const [gestiones, setGestiones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCartera, setFiltroCartera] = useState("Todos");

  useEffect(() => {
    cargarDatos();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      return null;
    }

    return empresaId;
  }

  function obtenerGestor() {
    return (
      localStorage.getItem("nombreUsuario") ||
      localStorage.getItem("correoUsuario") ||
      "Usuario"
    );
  }

  function fechaSimple(fecha) {
    return String(fecha || "").slice(0, 10);
  }

  function calcularDias(fechaVencimiento, saldo) {
    if (!fechaVencimiento || Number(saldo || 0) <= 0) return 0;

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diff = hoy - vencimiento;

    if (diff <= 0) return 0;

    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function semaforo(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "⚫";
    if (dias <= 0) return "🟢";
    if (dias <= 30) return "🟡";
    if (dias <= 90) return "🟠";
    return "🔴";
  }

  async function cargarDatos() {
    await cargarCartera();
    await cargarGestiones();
  }

  async function cargarCartera() {
    const empresaId = obtenerEmpresaId();
    const gestor = obtenerGestor();

    if (!empresaId) return;

    const { data: cobranzaData, error: errorCobranza } = await supabase
      .from("informacion_cobranza")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("responsable_cobro", gestor);

    if (errorCobranza) {
      alert("Error cargando cartera del gestor: " + errorCobranza.message);
      return;
    }

    const cobranzas = cobranzaData || [];
    const cuentaIds = cobranzas.map((c) => c.informacion_comercial_id).filter(Boolean);
    const clienteIds = cobranzas.map((c) => c.cliente_id).filter(Boolean);

    let cuentas = [];
    let clientes = [];

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

    const armada = cobranzas.map((cobranza) => {
      const cuenta = cuentas.find((c) => c.id === cobranza.informacion_comercial_id);
      const cliente = clientes.find((c) => c.id === cobranza.cliente_id);
      const dias = calcularDias(cuenta?.fecha_vencimiento, cuenta?.saldo_actual);

      return {
        cobranza,
        cuenta,
        cliente,
        dias,
        semaforo: semaforo(dias, cuenta?.saldo_actual),
      };
    });

    setCartera(armada);
  }

  async function cargarGestiones() {
    const empresaId = obtenerEmpresaId();
    const gestor = obtenerGestor();

    if (!empresaId) return;

    const { data } = await supabase
      .from("bitacora_cliente")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("usuario", gestor)
      .order("fecha_gestion", { ascending: false });

    setGestiones(data || []);
  }

  function obtenerTipoGestion(resultado) {
    if (resultado === "WhatsApp enviado") return "WhatsApp";
    if (resultado === "Promesa de pago") return "Promesa de Pago";
    if (resultado === "Pago realizado") return "Pago Realizado";
    return "Llamada";
  }

  async function registrarGestionRealizada(item, resultado) {
    const empresaId = obtenerEmpresaId();
    const gestor = obtenerGestor();

    if (!empresaId || !resultado) return;

    const tipoGestion = obtenerTipoGestion(resultado);

    const { error } = await supabase.from("bitacora_cliente").insert([
      {
        empresa_id: empresaId,
        cliente_id: item.cliente?.id,
        informacion_comercial_id: item.cuenta?.id,
        tipo_gestion: tipoGestion,
        resultado_gestion: resultado,
        observacion: `Gestión registrada desde pantalla de gestor: ${resultado}`,
        usuario: gestor,
        fecha_gestion: new Date().toISOString(),
        origen: "Gestor",
        estado_promesa: resultado === "Promesa de pago" ? "Activa" : "Sin promesa",
      },
    ]);

    if (error) {
      alert("Error registrando gestión: " + error.message);
      return;
    }

    alert("Gestión registrada correctamente.");
    cargarGestiones();
  }

  async function verCliente(item) {
    const empresaId = obtenerEmpresaId();
    const gestor = obtenerGestor();

    if (!empresaId) return;

    await supabase.from("bitacora_cliente").insert([
      {
        empresa_id: empresaId,
        cliente_id: item.cliente?.id,
        informacion_comercial_id: item.cuenta?.id,
        tipo_gestion: "Vista Cliente",
        resultado_gestion: "Cliente revisado",
        observacion: "El gestor abrió la ficha del cliente desde su cartera.",
        usuario: gestor,
        fecha_gestion: new Date().toISOString(),
        origen: "Gestor",
      },
    ]);

    localStorage.setItem(
      "busquedaVistaCliente",
      item.cuenta?.numero_cuenta || item.cliente?.cedula || item.cliente?.nombre || ""
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
    const texto = busqueda.toLowerCase();

    const coincideBusqueda =
      !texto ||
      item.cliente?.nombre?.toLowerCase().includes(texto) ||
      item.cliente?.cedula?.toLowerCase().includes(texto) ||
      item.cuenta?.numero_cuenta?.toLowerCase().includes(texto);

    const promesaHoy = fechaSimple(item.cobranza?.proxima_gestion) === hoy;
    const promesaVencida =
      item.cobranza?.proxima_gestion &&
      fechaSimple(item.cobranza?.proxima_gestion) < hoy;

    const mas30 = item.dias > 30;
    const mas90 = item.dias > 90;

    if (filtroCartera === "Promesas hoy") return coincideBusqueda && promesaHoy;
    if (filtroCartera === "Promesas vencidas") return coincideBusqueda && promesaVencida;
    if (filtroCartera === "Más de 30 días") return coincideBusqueda && mas30;
    if (filtroCartera === "Más de 90 días") return coincideBusqueda && mas90;

    return coincideBusqueda;
  });

  const gestionesHoy = gestiones.filter((g) => fechaSimple(g.fecha_gestion) === hoy);

  const clientesAsignados = cartera.length;
  const promesasHoy = cartera.filter(
    (item) => fechaSimple(item.cobranza?.proxima_gestion) === hoy
  ).length;

  const promesasVencidas = cartera.filter(
    (item) =>
      item.cobranza?.proxima_gestion &&
      fechaSimple(item.cobranza?.proxima_gestion) < hoy
  ).length;

  const clientesGestionadosHoy = [
    ...new Set(gestionesHoy.map((g) => g.cliente_id).filter(Boolean)),
  ].length;

  const llamadasHoy = gestionesHoy.filter((g) => g.tipo_gestion === "Llamada").length;
  const noContestoHoy = gestionesHoy.filter((g) => g.resultado_gestion === "No contestó").length;
  const noLocalizadoHoy = gestionesHoy.filter((g) => g.resultado_gestion === "No localizable").length;
  const telefonoApagadoHoy = gestionesHoy.filter((g) => g.resultado_gestion === "Número apagado").length;
  const whatsappHoy = gestionesHoy.filter((g) => g.resultado_gestion === "WhatsApp enviado").length;

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
          <div style={{ flex: 1 }}>
            <h1 style={titulo}>Mi Cartera de Cobro</h1>
            <p style={subtitulo}>Espacio de trabajo del gestor de cobranza.</p>
          </div>

          <button style={botonNegro} onClick={imprimirCartera}>
            Imprimir mi cartera
          </button>
        </div>

        <div style={kpiGrid}>
          <KPI titulo="Clientes asignados" valor={clientesAsignados} />
          <KPI titulo="Gestionados hoy" valor={clientesGestionadosHoy} />
          <KPI titulo="Gestiones hoy" valor={gestionesHoy.length} />
          <KPI titulo="Promesas hoy" valor={promesasHoy} />
          <KPI titulo="Promesas vencidas" valor={promesasVencidas} />
          <KPI titulo="Llamadas" valor={llamadasHoy} />
          <KPI titulo="No contestó" valor={noContestoHoy} />
          <KPI titulo="No localizable" valor={noLocalizadoHoy} />
          <KPI titulo="Número apagado" valor={telefonoApagadoHoy} />
          <KPI titulo="WhatsApp" valor={whatsappHoy} />
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Filtros</h2>

          <div style={gridFiltros}>
            <Campo label="Buscar cliente, cédula o cuenta">
              <input
                placeholder="Ejemplo: Ana, 8-888, CTA-001"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Filtrar cartera">
              <select
                value={filtroCartera}
                onChange={(e) => setFiltroCartera(e.target.value)}
                style={inputStyle}
              >
                <option>Todos</option>
                <option>Promesas hoy</option>
                <option>Promesas vencidas</option>
                <option>Más de 30 días</option>
                <option>Más de 90 días</option>
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
                  <th style={th}>Estado</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Teléfono</th>
                  <th style={th}>Cuenta</th>
                  <th style={th}>Saldo</th>
                  <th style={th}>Cuota</th>
                  <th style={th}>Días mora</th>
                  <th style={th}>Próxima gestión</th>
                  <th style={th}>Gestión realizada</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {carteraFiltrada.map((item) => (
                  <tr key={item.cobranza.id}>
                    <td style={td}>{item.semaforo}</td>
                    <td style={td}>{item.cliente?.nombre || "-"}</td>
                    <td
                      style={{ ...td, color: "#2563eb", fontWeight: "bold", cursor: "pointer" }}
                      onClick={() => verCliente(item)}
                    >
                      {item.cliente?.cedula || "-"}
                    </td>
                    <td style={td}>{item.cliente?.telefono || "-"}</td>
                    <td style={td}>{item.cuenta?.numero_cuenta || "-"}</td>
                    <td style={td}>${Number(item.cuenta?.saldo_actual || 0).toLocaleString()}</td>
                    <td style={td}>${Number(item.cuenta?.cuota || 0).toLocaleString()}</td>
                    <td style={td}>{item.dias}</td>
                    <td style={td}>{item.cobranza?.proxima_gestion || "-"}</td>
                    <td style={td}>
                      <select
                        style={inputMini}
                        defaultValue=""
                        onChange={(e) => {
                          registrarGestionRealizada(item, e.target.value);
                          e.target.value = "";
                        }}
                      >
                        <option value="">Registrar gestión</option>
                        <option>Llamada realizada</option>
                        <option>WhatsApp enviado</option>
                        <option>No contestó</option>
                        <option>No localizable</option>
                        <option>Número apagado</option>
                        <option>Se conversó con cliente</option>
                        <option>Promesa de pago</option>
                        <option>Pago realizado</option>
                        <option>Se mudó</option>
                        <option>Seguimiento pendiente</option>
                      </select>
                    </td>
                    <td style={td}>
                      <button style={boton} onClick={() => verCliente(item)}>
                        Ver cliente
                      </button>

                      <button style={whatsappBtn} onClick={() => abrirWhatsApp(item.cliente)}>
                        WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}

                {carteraFiltrada.length === 0 && (
                  <tr>
                    <td style={td} colSpan="11">
                      No hay clientes asignados para este gestor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p style={nota}>
            La promesa de pago y la observación completa se registran desde Vista Cliente.
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

function KPI({ titulo, valor }) {
  return (
    <div style={cardKpi}>
      <p style={kpiTitulo}>{titulo}</p>
      <h2 style={kpiValor}>{Number(valor || 0).toLocaleString()}</h2>
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
  marginRight: "6px",
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
