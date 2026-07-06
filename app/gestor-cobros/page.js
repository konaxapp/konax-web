"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function GestorCobros() {
  const [cartera, setCartera] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCartera, setFiltroCartera] = useState("Todos");
  const [accesoValidado, setAccesoValidado] = useState(false);

  useEffect(() => {
    validarAcceso();
  }, []);

  async function validarAcceso() {
    const empresaId = localStorage.getItem("empresaId");
    const usuarioId = localStorage.getItem("usuarioId");
    const rol = localStorage.getItem("usuarioRol") || localStorage.getItem("rolUsuario") || "";

    if (!empresaId || !usuarioId) {
      window.location.href = "/login";
      return;
    }

    const rolNormalizado = String(rol || "").toLowerCase().trim();
    const esAdmin = rolNormalizado === "administrador" || rolNormalizado === "superadmin";

    const { data: moduloEmpresa, error: errorModulo } = await supabase
      .from("empresa_modulos")
      .select("cobranza, dashboard_cobros")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (errorModulo) {
      alert("Error validando función: " + errorModulo.message);
      window.location.href = "/dashboard";
      return;
    }

    const moduloActivo = Boolean(moduloEmpresa?.cobranza || moduloEmpresa?.dashboard_cobros);

    if (!moduloActivo) {
      alert("Mi Cartera de Cobro no está activa en el plan de esta empresa.");
      window.location.href = "/dashboard";
      return;
    }

    if (!esAdmin) {
      const { data: permisoUsuario, error: errorPermiso } = await supabase
        .from("permisos_usuarios_empresa")
        .select("activo")
        .eq("empresa_id", empresaId)
        .eq("usuario_id", usuarioId)
        .eq("permiso", "gestor_cobros")
        .maybeSingle();

      if (errorPermiso) {
        alert("Error validando permiso: " + errorPermiso.message);
        window.location.href = "/dashboard";
        return;
      }

      if (!permisoUsuario?.activo) {
        alert("No tienes permiso para acceder a Mi Cartera de Cobro.");
        window.location.href = "/dashboard";
        return;
      }
    }

    setAccesoValidado(true);
    await cargarCartera();
  }

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");
    if (!empresaId) alert("No hay empresa activa.");
    return empresaId;
  }

  function obtenerGestorActual() {
    return {
      id: localStorage.getItem("usuarioId") || localStorage.getItem("adminKonaxId") || "",
      nombre:
        localStorage.getItem("nombreUsuario") ||
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("adminKonaxNombre") ||
        "",
      correo: localStorage.getItem("correoUsuario") || localStorage.getItem("usuarioCorreo") || "",
    };
  }

  function fechaSimple(fecha) {
    return String(fecha || "").slice(0, 10);
  }

  function limpiarTexto(texto) {
    return String(texto || "").toLowerCase().trim();
  }

  function dinero(valor) {
    return "$" + Number(valor || 0).toLocaleString();
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
    if (dias <= 30) return "🟡 Mora 1-30";
    if (dias <= 90) return "🟠 Mora 31-90";
    if (dias <= 365) return "🔴 Mora +90";
    return "⚫ Mora +1 año";
  }

  function obtenerEstado(dias, saldo) {
    if (Number(saldo || 0) <= 0) return "Cancelado";
    if (dias <= 0) return "Al Día";
    if (dias <= 30) return "Mora 1-30";
    if (dias <= 90) return "Mora 31-90";
    if (dias <= 365) return "Mora +90";
    return "Mora +1 año";
  }

  function tienePromesaActiva(cobranza) {
    return (
      String(cobranza?.estado_promesa || "").toLowerCase() === "activa" ||
      Boolean(cobranza?.fecha_promesa) ||
      Boolean(cobranza?.proxima_gestion)
    );
  }

  function fechaPromesa(cobranza) {
    return fechaSimple(cobranza?.fecha_promesa) || fechaSimple(cobranza?.proxima_gestion) || "";
  }

  function montoPromesa(cobranza) {
    return Number(cobranza?.monto_promesa || cobranza?.monto_prometido || 0);
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

    const cobranzas = (cobranzaData || []).filter((c) => perteneceAlGestor(c, gestor));
    const cuentaIds = cobranzas.map((c) => c.informacion_comercial_id).filter(Boolean);
    const clienteIds = cobranzas.map((c) => c.cliente_id).filter(Boolean);

    let cuentas = [];
    let clientes = [];

    if (cuentaIds.length > 0) {
      const { data, error } = await supabase
        .from("informacion_comercial")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("id", cuentaIds);

      if (error) {
        alert("Error cargando cuentas comerciales: " + error.message);
        return;
      }
      cuentas = data || [];
    }

    if (clienteIds.length > 0) {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("id", clienteIds);

      if (error) {
        alert("Error cargando clientes: " + error.message);
        return;
      }
      clientes = data || [];
    }

    const hoy = fechaSimple(new Date());

    const armada = cobranzas.map((cobranza) => {
      const cuenta = cuentas.find((c) => String(c.id) === String(cobranza.informacion_comercial_id));
      const cliente = clientes.find((c) => String(c.id) === String(cobranza.cliente_id));

      const montoTotal = Number(cuenta?.monto_total || 0);
      const saldoReal = Number(cuenta?.saldo_actual || 0);
      const totalPagado = Math.max(montoTotal - saldoReal, 0);
      const dias = calcularDias(cuenta?.fecha_vencimiento, saldoReal);
      const promesaActiva = tienePromesaActiva(cobranza);
      const fechaPromesaValor = fechaPromesa(cobranza);
      const promesaVencida = promesaActiva && fechaPromesaValor && fechaPromesaValor < hoy;

      return {
        cobranza,
        cuenta,
        cliente,
        dias,
        saldoReal,
        totalPagado,
        montoTotal,
        promesaActiva,
        fechaPromesa: fechaPromesaValor,
        montoPromesa: montoPromesa(cobranza),
        promesaVencida,
        estado: obtenerEstado(dias, saldoReal),
        semaforo: obtenerSemaforo(dias, saldoReal),
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
        prioridad_cobranza: item.dias > 90 ? "Alta" : item.dias > 0 ? "Media" : "Normal",
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

  if (!accesoValidado) {
    return <div style={{ padding: "30px" }}>Validando acceso...</div>;
  }

  const hoy = fechaSimple(new Date());

  const carteraFiltrada = cartera.filter((item) => {
    const texto = limpiarTexto(busqueda);
    const coincideBusqueda =
      !texto ||
      limpiarTexto(item.cliente?.nombre).includes(texto) ||
      limpiarTexto(item.cliente?.cedula).includes(texto) ||
      limpiarTexto(item.cuenta?.numero_cuenta).includes(texto);

    if (filtroCartera === "Al Día") return coincideBusqueda && item.dias <= 0 && item.saldoReal > 0;
    if (filtroCartera === "Mora total") return coincideBusqueda && item.dias > 0;
    if (filtroCartera === "Mora 1-30 días") return coincideBusqueda && item.dias > 0 && item.dias <= 30;
    if (filtroCartera === "Mora 31-90 días") return coincideBusqueda && item.dias > 30 && item.dias <= 90;
    if (filtroCartera === "Mora mayor a 90 días") return coincideBusqueda && item.dias > 90;
    if (filtroCartera === "Mora mayor a 1 año") return coincideBusqueda && item.dias > 365;
    if (filtroCartera === "Sin teléfono") return coincideBusqueda && !item.cliente?.telefono;
    if (filtroCartera === "Sin gestionar hoy") return coincideBusqueda && fechaSimple(item.cobranza?.fecha_ultima_gestion) !== hoy;
    if (filtroCartera === "Promesas pendientes") return coincideBusqueda && item.promesaActiva && !item.promesaVencida;
    if (filtroCartera === "Promesas vencidas") return coincideBusqueda && item.promesaVencida;
    return coincideBusqueda;
  });

  const clientesAsignados = cartera.length;
  const gestionesDelDia = cartera.filter((item) => fechaSimple(item.cobranza?.fecha_ultima_gestion) === hoy).length;
  const pendientesGestionHoy = Math.max(clientesAsignados - gestionesDelDia, 0);
  const promesasPendientes = cartera.filter((item) => item.promesaActiva && !item.promesaVencida).length;
  const promesasVencidas = cartera.filter((item) => item.promesaVencida).length;
  const clientesSinTelefono = cartera.filter((item) => !item.cliente?.telefono).length;
  const montoAsignado = cartera.reduce((sum, item) => sum + Number(item.saldoReal || 0), 0);
  const montoAlDia = cartera.filter((item) => item.dias <= 0 && item.saldoReal > 0).reduce((sum, item) => sum + Number(item.saldoReal || 0), 0);
  const montoMoraTotal = cartera.filter((item) => item.dias > 0).reduce((sum, item) => sum + Number(item.saldoReal || 0), 0);
  const montoMoraMayor90 = cartera.filter((item) => item.dias > 90).reduce((sum, item) => sum + Number(item.saldoReal || 0), 0);
  const porcentajeAlDia = montoAsignado > 0 ? Math.round((montoAlDia / montoAsignado) * 100) : 0;

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={encabezado}>
          <div style={marcaBox}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />
            <div>
              <p style={eyebrow}>Cobranza</p>
              <h1 style={titulo}>Mi Cartera de Cobro</h1>
              <p style={subtitulo}>Seguimiento, promesas y recuperación por gestor.</p>
            </div>
          </div>

          <div style={accionesHeader}>
            <button style={botonClaro} onClick={volverDashboard}>← Dashboard</button>
            <button style={botonOscuro} onClick={cargarCartera}>Actualizar</button>
            <button style={botonOscuro} onClick={imprimirCartera}>Imprimir</button>
          </div>
        </div>

        <div style={panelResumen}>
          <KPI titulo="Clientes" valor={clientesAsignados} icono="👥" />
          <KPI titulo="Saldo asignado" valor={montoAsignado} tipo="dinero" icono="💰" />
          <KPI titulo="Al día" valor={montoAlDia} tipo="dinero" icono="🟢" />
          <KPI titulo="% al día" valor={porcentajeAlDia} tipo="porcentaje" icono="📈" />
          <KPI titulo="Promesas pendientes" valor={promesasPendientes} icono="📌" alerta={promesasPendientes > 0} />
          <KPI titulo="Promesas vencidas" valor={promesasVencidas} icono="⚠️" alerta={promesasVencidas > 0} />
          <KPI titulo="Pendientes gestión" valor={pendientesGestionHoy} icono="☎️" />
          <KPI titulo="Mora total" valor={montoMoraTotal} tipo="dinero" icono="🔴" />
          <KPI titulo="Mora +90" valor={montoMoraMayor90} tipo="dinero" icono="⏰" />
          <KPI titulo="Sin teléfono" valor={clientesSinTelefono} icono="📵" />
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <div>
              <h2 style={tituloSeccion}>Filtros de cartera</h2>
              <p style={textoSuave}>Busca por cliente, cédula o número de cuenta.</p>
            </div>
          </div>

          <div style={gridFiltros}>
            <Campo label="Buscar cliente, cédula o cuenta">
              <input
                placeholder="Ejemplo: Ana, 8-888, KX-001"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Estado de cartera">
              <select value={filtroCartera} onChange={(e) => setFiltroCartera(e.target.value)} style={inputStyle}>
                <option>Todos</option>
                <option>Al Día</option>
                <option>Mora total</option>
                <option>Mora 1-30 días</option>
                <option>Mora 31-90 días</option>
                <option>Mora mayor a 90 días</option>
                <option>Mora mayor a 1 año</option>
                <option>Promesas pendientes</option>
                <option>Promesas vencidas</option>
                <option>Sin gestionar hoy</option>
                <option>Sin teléfono</option>
              </select>
            </Campo>
          </div>
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <div>
              <h2 style={tituloSeccion}>Clientes asignados</h2>
              <p style={textoSuave}>El saldo se toma directamente de informacion_comercial.saldo_actual.</p>
            </div>
            <div style={badgeResultado}>{carteraFiltrada.length} resultados</div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Estado</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Contacto</th>
                  <th style={th}>Cuenta</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Saldo real</th>
                  <th style={th}>Pagado</th>
                  <th style={th}>Promesa</th>
                  <th style={th}>Mora</th>
                  <th style={th}>Acciones</th>
                  <th style={th}>Gestión rápida</th>
                </tr>
              </thead>

              <tbody>
                {carteraFiltrada.map((item) => (
                  <tr key={item.cobranza.id}>
                    <td style={td}><span style={estadoPill(item.estado)}>{item.semaforo}</span></td>
                    <td style={td}><strong>{item.cliente?.nombre || "-"}</strong><div style={textoTabla}>Cédula: {item.cliente?.cedula || "-"}</div></td>
                    <td style={td}><div>{item.cliente?.telefono || "Sin teléfono"}</div><div style={textoTabla}>{item.cliente?.correo || ""}</div></td>
                    <td style={td}><strong>{item.cuenta?.numero_cuenta || "-"}</strong><div style={textoTabla}>{item.cuenta?.descripcion || "-"}</div></td>
                    <td style={td}>{dinero(item.montoTotal)}</td>
                    <td style={td}><strong>{dinero(item.saldoReal)}</strong></td>
                    <td style={td}>{dinero(item.totalPagado)}</td>
                    <td style={td}>
                      {item.promesaActiva ? (
                        <div style={item.promesaVencida ? promesaVencidaBox : promesaBox}>
                          <strong>{item.promesaVencida ? "Vencida" : "Pendiente"}</strong>
                          <span>{item.fechaPromesa || "-"}</span>
                          <span>{item.montoPromesa > 0 ? dinero(item.montoPromesa) : ""}</span>
                        </div>
                      ) : (
                        <span style={textoTabla}>Sin promesa</span>
                      )}
                    </td>
                    <td style={td}><strong>{item.dias}</strong><div style={textoTabla}>días</div></td>
                    <td style={td}>
                      <div style={accionesTabla}>
                        <button style={botonVerde} onClick={() => verCliente(item)}>Vista cliente</button>
                        <button style={botonWhatsApp} onClick={() => abrirWhatsApp(item.cliente)}>WhatsApp</button>
                      </div>
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
                        <option value="">Seleccionar</option>
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
                  <tr><td style={tdVacio} colSpan="11">No hay clientes asignados con este filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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

function KPI({ titulo, valor, tipo, icono, alerta }) {
  let mostrar = Number(valor || 0).toLocaleString();
  if (tipo === "dinero") mostrar = "$" + Number(valor || 0).toLocaleString();
  if (tipo === "porcentaje") mostrar = Number(valor || 0).toLocaleString() + "%";

  return (
    <div style={alerta ? cardKpiAlerta : cardKpi}>
      <div style={kpiTop}><span style={kpiIcono}>{icono}</span><p style={kpiTitulo}>{titulo}</p></div>
      <h2 style={kpiValor}>{mostrar}</h2>
    </div>
  );
}

function estadoPill(estado) {
  if (estado === "Al Día") return pillVerde;
  if (estado === "Cancelado") return pillGris;
  if (String(estado || "").includes("Mora")) return pillRojo;
  return pillAzul;
}

const pagina = { minHeight: "100vh", background: "linear-gradient(135deg, #ecfdf5 0%, #f3f4f6 45%, #ffffff 100%)", padding: "28px", fontFamily: "Arial, sans-serif" };
const contenedor = { maxWidth: "1600px", margin: "0 auto" };
const encabezado = { background: "linear-gradient(135deg, #111827, #064e3b)", color: "#ffffff", borderRadius: "24px", padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "18px", boxShadow: "0 10px 28px rgba(0,0,0,0.18)" };
const marcaBox = { display: "flex", alignItems: "center", gap: "16px" };
const logo = { width: "84px", background: "#ffffff", borderRadius: "16px", padding: "8px" };
const eyebrow = { margin: 0, color: "#bbf7d0", fontSize: "13px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em" };
const titulo = { margin: "3px 0", fontSize: "34px", color: "#ffffff" };
const subtitulo = { color: "#dcfce7", margin: 0 };
const accionesHeader = { display: "flex", gap: "10px", flexWrap: "wrap" };
const botonClaro = { background: "#ffffff", color: "#111827", border: "none", padding: "12px 16px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" };
const botonOscuro = { background: "#111827", color: "#ffffff", border: "1px solid rgba(255,255,255,0.25)", padding: "12px 16px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" };
const panelResumen = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "14px", marginBottom: "18px" };
const cardKpi = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "18px", padding: "18px", boxShadow: "0 5px 16px rgba(0,0,0,0.06)" };
const cardKpiAlerta = { ...cardKpi, background: "#fff7ed", border: "1px solid #fed7aa" };
const kpiTop = { display: "flex", alignItems: "center", gap: "8px" };
const kpiIcono = { fontSize: "20px" };
const kpiTitulo = { margin: 0, color: "#6b7280", fontSize: "13px", fontWeight: "bold" };
const kpiValor = { margin: "8px 0 0", color: "#111827", fontSize: "27px" };
const card = { background: "#ffffff", borderRadius: "20px", padding: "22px", marginBottom: "18px", boxShadow: "0 6px 20px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb" };
const cardHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", marginBottom: "16px", flexWrap: "wrap" };
const tituloSeccion = { margin: 0, color: "#111827" };
const textoSuave = { margin: "5px 0 0", color: "#6b7280", fontSize: "13px" };
const gridFiltros = { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" };
const labelStyle = { display: "block", marginBottom: "6px", fontWeight: "bold", color: "#374151", fontSize: "13px" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box", background: "#ffffff", color: "#111827" };
const inputMini = { ...inputStyle, minWidth: "175px", padding: "9px" };
const badgeResultado = { background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0", padding: "9px 12px", borderRadius: "999px", fontWeight: "bold", fontSize: "13px" };
const tabla = { width: "100%", borderCollapse: "separate", borderSpacing: "0", minWidth: "1380px" };
const th = { textAlign: "left", padding: "13px", background: "#111827", color: "#ffffff", fontSize: "13px", whiteSpace: "nowrap" };
const td = { padding: "13px", borderBottom: "1px solid #f3f4f6", color: "#111827", fontSize: "13px", verticalAlign: "top" };
const tdVacio = { ...td, textAlign: "center", color: "#6b7280", padding: "28px" };
const textoTabla = { color: "#6b7280", fontSize: "12px", marginTop: "4px" };
const accionesTabla = { display: "flex", gap: "8px", flexWrap: "wrap" };
const botonVerde = { background: "#16a34a", color: "#ffffff", border: "none", padding: "9px 12px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };
const botonWhatsApp = { background: "#22c55e", color: "#ffffff", border: "none", padding: "9px 12px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };
const pillVerde = { background: "#dcfce7", color: "#166534", border: "1px solid #86efac", padding: "7px 10px", borderRadius: "999px", fontWeight: "bold", display: "inline-block" };
const pillRojo = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "7px 10px", borderRadius: "999px", fontWeight: "bold", display: "inline-block" };
const pillAzul = { background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe", padding: "7px 10px", borderRadius: "999px", fontWeight: "bold", display: "inline-block" };
const pillGris = { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", padding: "7px 10px", borderRadius: "999px", fontWeight: "bold", display: "inline-block" };
const promesaBox = { display: "grid", gap: "3px", background: "#ecfdf5", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "9px" };
const promesaVencidaBox = { ...promesaBox, background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
