"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Recargos() {
  const [empresa, setEmpresa] = useState(null);
  const [configuracion, setConfiguracion] = useState(null);
  const [cuentasMora, setCuentasMora] = useState([]);
  const [historial, setHistorial] = useState([]);

  const [recargoAutomatico, setRecargoAutomatico] = useState(false);
  const [tipoRecargo, setTipoRecargo] = useState("FIJO");
  const [porcentaje, setPorcentaje] = useState("");
  const [montoFijo, setMontoFijo] = useState("");
  const [diasGracia, setDiasGracia] = useState("");
  const [aplicarSobre, setAplicarSobre] = useState("SALDO_ACTUAL");

  const [suspensionAutomatica, setSuspensionAutomatica] = useState(false);
  const [diasParaSuspender, setDiasParaSuspender] = useState("30");
  const [accionServicio, setAccionServicio] = useState("Suspender");

  const [busquedaManual, setBusquedaManual] = useState("");
  const [resultadosManual, setResultadosManual] = useState([]);
  const [cuentaManual, setCuentaManual] = useState(null);
  const [montoManual, setMontoManual] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    await cargarEmpresa();
    await cargarConfiguracion();
    await cargarCuentasEnMora();
    await cargarHistorial();
  }

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      return null;
    }

    return empresaId;
  }

  function obtenerUsuario() {
    return (
      localStorage.getItem("nombreUsuario") ||
      localStorage.getItem("usuarioNombre") ||
      localStorage.getItem("correoUsuario") ||
      "Sistema"
    );
  }

  function fechaSimple(fecha) {
    return String(fecha || "").slice(0, 10);
  }

  function calcularDiasAtraso(fechaVencimiento, saldoActual) {
    if (!fechaVencimiento || Number(saldoActual || 0) <= 0) return 0;

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diff = hoy - vencimiento;

    if (diff <= 0) return 0;

    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function calcularRecargo(cuenta, montoManualAplicar = null) {
    const saldo = Number(cuenta?.saldo_actual || 0);
    const cuota = Number(cuenta?.cuota || 0);
    const base = aplicarSobre === "CUOTA" ? cuota : saldo;

    if (tipoRecargo === "PORCENTAJE_SALDO") {
      return (saldo * Number(porcentaje || 0)) / 100;
    }

    if (tipoRecargo === "MANUAL") {
      return Number(montoManualAplicar || montoManual || 0);
    }

    if (tipoRecargo === "FIJO") return Number(montoFijo || 0);
    if (tipoRecargo === "MENSUAL") return Number(montoFijo || 0);
    if (tipoRecargo === "POR_VENCIMIENTO") return Number(montoFijo || 0);

    return base > 0 ? Number(montoFijo || 0) : 0;
  }

  async function cargarEmpresa() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (error) {
      alert("Error cargando empresa: " + error.message);
      return;
    }

    setEmpresa(data || null);
  }

  async function cargarConfiguracion() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("configuracion_recargos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (error) {
      alert("Error cargando configuración: " + error.message);
      return;
    }

    if (data) {
      setConfiguracion(data);
      setRecargoAutomatico(data.recargo_automatico || false);
      setTipoRecargo(data.tipo_recargo || "FIJO");
      setPorcentaje(data.porcentaje || "");
      setMontoFijo(data.monto_fijo || "");
      setDiasGracia(data.dias_gracia || "");
      setAplicarSobre(data.aplicar_sobre || "SALDO_ACTUAL");
      setSuspensionAutomatica(data.suspension_automatica || false);
      setDiasParaSuspender(data.dias_para_suspender || "30");
      setAccionServicio(data.accion_servicio || "Suspender");
    }
  }

  async function guardarConfiguracion() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    setGuardando(true);

    const payload = {
      empresa_id: empresaId,
      recargo_automatico: recargoAutomatico,
      tipo_recargo: tipoRecargo,
      porcentaje: Number(porcentaje || 0),
      monto_fijo: Number(montoFijo || 0),
      dias_gracia: Number(diasGracia || 0),
      aplicar_sobre: aplicarSobre,
      suspension_automatica: suspensionAutomatica,
      dias_para_suspender: Number(diasParaSuspender || 30),
      accion_servicio: accionServicio,
      estado: "Activo",
      updated_at: new Date().toISOString(),
    };

    let error;

    if (configuracion?.id) {
      const res = await supabase
        .from("configuracion_recargos")
        .update(payload)
        .eq("id", configuracion.id)
        .eq("empresa_id", empresaId);

      error = res.error;
    } else {
      const res = await supabase
        .from("configuracion_recargos")
        .insert([payload]);

      error = res.error;
    }

    setGuardando(false);

    if (error) {
      alert("Error guardando configuración: " + error.message);
      return;
    }

    alert("Configuración guardada correctamente.");
    cargarConfiguracion();
    cargarCuentasEnMora();
  }

  async function cargarCuentasEnMora() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("informacion_comercial")
      .select("*, clientes(nombre, cedula, telefono)")
      .eq("empresa_id", empresaId)
      .gt("saldo_actual", 0)
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      alert("Error cargando cuentas en mora: " + error.message);
      return;
    }

    const cuentas = (data || []).filter((cuenta) => {
      const dias = calcularDiasAtraso(
        cuenta.fecha_vencimiento,
        cuenta.saldo_actual
      );

      return dias > Number(diasGracia || 0);
    });

    setCuentasMora(cuentas);
  }

  async function cargarHistorial() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("historial_recargos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      alert("Error cargando historial: " + error.message);
      return;
    }

    setHistorial(data || []);
  }

  async function yaTieneRecargo(cuenta) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return true;

    if (tipoRecargo === "MANUAL") return false;

    const hoy = new Date();
    const hoyTexto = hoy.toISOString().slice(0, 10);
    const mesActual = hoy.toISOString().slice(0, 7);

    const { data, error } = await supabase
      .from("historial_recargos")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("informacion_comercial_id", cuenta.id)
      .eq("tipo_recargo", tipoRecargo);

    if (error) {
      alert("Error verificando recargo duplicado: " + error.message);
      return true;
    }

    if (tipoRecargo === "MENSUAL") {
      return (data || []).some((r) =>
        fechaSimple(r.created_at).startsWith(mesActual)
      );
    }

    return (data || []).some((r) => fechaSimple(r.created_at) === hoyTexto);
  }

  async function aplicarRecargoCuenta(
    cuenta,
    mostrarAlerta = true,
    montoManualAplicar = null
  ) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return false;

    const diasAtraso = calcularDiasAtraso(
      cuenta.fecha_vencimiento,
      cuenta.saldo_actual
    );

    if (tipoRecargo !== "MANUAL" && diasAtraso <= Number(diasGracia || 0)) {
      if (mostrarAlerta) alert("Esta cuenta aún no supera los días de gracia.");
      return false;
    }

    const duplicado = await yaTieneRecargo(cuenta);

    if (duplicado) {
      if (mostrarAlerta) {
        alert("Esta cuenta ya tiene recargo aplicado según la regla configurada.");
      }

      return false;
    }

    const saldoAnterior = Number(cuenta.saldo_actual || 0);
    const montoRecargo = calcularRecargo(cuenta, montoManualAplicar);
    const saldoNuevo = saldoAnterior + montoRecargo;

    if (montoRecargo <= 0) {
      if (mostrarAlerta) alert("El recargo debe ser mayor a cero.");
      return false;
    }

    const usuario = obtenerUsuario();

    const { error: errorCuenta } = await supabase
      .from("informacion_comercial")
      .update({
        saldo_actual: saldoNuevo,
        total_recargos: Number(cuenta.total_recargos || 0) + montoRecargo,
        ultimo_recargo_fecha: new Date().toISOString(),
        ultimo_recargo_monto: montoRecargo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cuenta.id)
      .eq("empresa_id", empresaId);

    if (errorCuenta) {
      alert("Error actualizando saldo: " + errorCuenta.message);
      return false;
    }

    const { error: errorHistorial } = await supabase
      .from("historial_recargos")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: cuenta.cliente_id,
          informacion_comercial_id: cuenta.id,
          numero_cuenta: cuenta.numero_cuenta,
          cliente: cuenta.clientes?.nombre || cuenta.cliente || "",
          cedula: cuenta.clientes?.cedula || cuenta.cedula || "",
          tipo_recargo: tipoRecargo,
          aplicar_sobre: aplicarSobre,
          porcentaje: Number(porcentaje || 0),
          monto_fijo: Number(montoFijo || 0),
          monto_recargo: montoRecargo,
          saldo_anterior: saldoAnterior,
          saldo_nuevo: saldoNuevo,
          dias_atraso: diasAtraso,
          usuario,
          observacion:
            tipoRecargo === "MANUAL"
              ? "Recargo manual aplicado"
              : "Recargo aplicado desde módulo de recargos",
          created_at: new Date().toISOString(),
        },
      ]);

    if (errorHistorial) {
      alert(
        "Saldo actualizado, pero error guardando historial: " +
          errorHistorial.message
      );

      return false;
    }

    if (mostrarAlerta) {
      alert("Recargo aplicado correctamente.");
      cargarCuentasEnMora();
      cargarHistorial();
    }

    return true;
  }

  async function aplicarRecargoMasivo() {
    if (tipoRecargo === "MANUAL") {
      alert("El recargo manual se aplica solo a una cuenta seleccionada.");
      return;
    }

    if (cuentasMora.length === 0) {
      alert("No hay cuentas en mora para aplicar recargo.");
      return;
    }

    const confirmar = confirm(
      `Se aplicará recargo a ${cuentasMora.length} cuenta(s). ¿Deseas continuar?`
    );

    if (!confirmar) return;

    setAplicando(true);

    let aplicados = 0;

    for (const cuenta of cuentasMora) {
      const ok = await aplicarRecargoCuenta(cuenta, false);
      if (ok) aplicados += 1;
    }

    setAplicando(false);

    alert(`Aplicación masiva finalizada. Recargos aplicados: ${aplicados}.`);
    cargarCuentasEnMora();
    cargarHistorial();
  }

  async function buscarCuentaManual() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (busquedaManual.trim().length < 2) {
      alert("Escribe nombre, cédula o número de cuenta.");
      return;
    }

    const texto = busquedaManual.trim();

    const { data, error } = await supabase
      .from("informacion_comercial")
      .select("*, clientes(nombre, cedula, telefono)")
      .eq("empresa_id", empresaId)
      .or(`numero_cuenta.ilike.%${texto}%,descripcion.ilike.%${texto}%`);

    if (error) {
      alert("Error buscando cuenta: " + error.message);
      return;
    }

    setResultadosManual(data || []);
  }
  async function aplicarRecargoManual() {
    if (!cuentaManual) {
      alert("Seleccione una cuenta.");
      return;
    }

    if (!montoManual || Number(montoManual) <= 0) {
      alert("Ingrese un monto manual válido.");
      return;
    }

    await aplicarRecargoCuenta(cuentaManual, true, Number(montoManual));
    setCuentaManual(null);
    setMontoManual("");
    setBusquedaManual("");
    setResultadosManual([]);
  }

  async function actualizarSuscripcionPorCuenta(
    cuentaId,
    empresaId,
    nuevoEstado
  ) {
    await supabase
      .from("suscripciones")
      .update({
        estado: nuevoEstado,
      })
      .eq("informacion_comercial_id", cuentaId)
      .eq("empresa_id", empresaId);
  }

  async function cambiarEstadoServicio(cuenta, nuevoEstado) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const payload = {
      estado_servicio: nuevoEstado,
      motivo_suspension:
        nuevoEstado === "Activo" ? null : `Cambio manual a ${nuevoEstado}`,
    };

    if (nuevoEstado === "Suspendido") {
      payload.fecha_suspension = new Date().toISOString().slice(0, 10);
    }

    if (nuevoEstado === "Cancelado") {
      payload.fecha_cancelacion = new Date().toISOString().slice(0, 10);
    }

    const { error } = await supabase
      .from("informacion_comercial")
      .update(payload)
      .eq("id", cuenta.id)
      .eq("empresa_id", empresaId);

    if (error) {
      alert("Error actualizando servicio: " + error.message);
      return;
    }

    await actualizarSuscripcionPorCuenta(
      cuenta.id,
      empresaId,
      nuevoEstado
    );

    alert(`Servicio actualizado a: ${nuevoEstado}`);
    cargarCuentasEnMora();
  }

  async function ejecutarSuspensionAutomatica() {
    if (!suspensionAutomatica) {
      alert("La suspensión automática no está activa.");
      return;
    }

    const confirmar = confirm(
      `Se revisarán cuentas con más de ${diasParaSuspender} días vencidas. Acción: ${accionServicio}. ¿Continuar?`
    );

    if (!confirmar) return;

    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    let actualizadas = 0;

    for (const cuenta of cuentasMora) {
      const dias = calcularDiasAtraso(
        cuenta.fecha_vencimiento,
        cuenta.saldo_actual
      );

      if (dias >= Number(diasParaSuspender || 30)) {
        const nuevoEstado =
          accionServicio === "Cancelar" ? "Cancelado" : "Suspendido";

        const payload = {
          estado_servicio: nuevoEstado,
          motivo_suspension: `${nuevoEstado} automático por ${dias} días sin pago`,
        };

        if (nuevoEstado === "Suspendido") {
          payload.fecha_suspension = new Date().toISOString().slice(0, 10);
        }

        if (nuevoEstado === "Cancelado") {
          payload.fecha_cancelacion = new Date().toISOString().slice(0, 10);
        }

        const { error } = await supabase
          .from("informacion_comercial")
          .update(payload)
          .eq("id", cuenta.id)
          .eq("empresa_id", empresaId);

        if (!error) {
          await actualizarSuscripcionPorCuenta(
            cuenta.id,
            empresaId,
            nuevoEstado
          );

          actualizadas += 1;
        }
      }
    }

    alert(`Proceso finalizado. Servicios actualizados: ${actualizadas}.`);
    cargarCuentasEnMora();
  }
  return (
    <div style={pagina}>
      <h1>Recargos</h1>

      <p style={subtitulo}>
        Configuración, aplicación masiva, recargo manual e historial.
      </p>

      <div style={cardEmpresa}>
        <h2>Empresa activa</h2>

        <p>
          <strong>
            {empresa?.nombre ||
              empresa?.nombre_empresa ||
              empresa?.razon_social ||
              "Empresa no identificada"}
          </strong>
        </p>
      </div>

      {/* AQUÍ SIGUE TODO TU RETURN ACTUAL */}

      {/* Configuración */}
      {/* Aplicación Manual */}
      {/* Cuentas en Mora */}
      {/* Historial */}

      {/* NO CAMBIES NADA DE TU RETURN ORIGINAL */}
      {/* SOLO PEGA EL RETURN COMPLETO QUE YA TENÍAS */}

    </div>
  );
}

const pagina = {
  maxWidth: "1200px",
  margin: "30px auto",
  padding: "20px",
};

const subtitulo = {
  color: "#6b7280",
  marginTop: "-8px",
  marginBottom: "20px",
};

const card = {
  background: "#fff",
  padding: "22px",
  borderRadius: "14px",
  marginBottom: "25px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

const cardEmpresa = {
  background: "#eef2ff",
  padding: "22px",
  borderRadius: "14px",
  marginBottom: "25px",
  border: "1px solid #c7d2fe",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
};

const input = {
  width: "100%",
  padding: "11px",
  marginBottom: "15px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const labelCheck = {
  display: "block",
  marginBottom: "15px",
};

const botonGuardar = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "13px 20px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "10px",
};

const botonSecundario = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botonRojo = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "bold",
  marginBottom: "15px",
  marginRight: "10px",
};

const botonNegro = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: "bold",
  marginBottom: "15px",
};

const botonPequeno = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  cursor: "pointer",
  marginRight: "5px",
  marginBottom: "5px",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  marginTop: "12px",
};

const th = {
  padding: "10px",
  borderBottom: "1px solid #ddd",
  textAlign: "left",
  background: "#f9fafb",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};
