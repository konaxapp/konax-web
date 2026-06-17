"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Recargos() {
  const [configuracion, setConfiguracion] = useState(null);
  const [cuentasMora, setCuentasMora] = useState([]);
  const [historial, setHistorial] = useState([]);

  const [recargoAutomatico, setRecargoAutomatico] = useState(false);
  const [tipoRecargo, setTipoRecargo] = useState("PORCENTAJE");
  const [porcentaje, setPorcentaje] = useState("");
  const [montoFijo, setMontoFijo] = useState("");
  const [diasGracia, setDiasGracia] = useState("");
  const [aplicarSobre, setAplicarSobre] = useState("SALDO_ACTUAL");

  const [guardando, setGuardando] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
    cargarCuentasEnMora();
    cargarHistorial();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      return null;
    }

    return empresaId;
  }

  function calcularDiasAtraso(fechaVencimiento, saldoActual) {
    if (!fechaVencimiento || Number(saldoActual || 0) <= 0) return 0;

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = hoy - vencimiento;

    if (diferencia <= 0) return 0;

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  function calcularRecargo(cuenta) {
    const base =
      aplicarSobre === "CUOTA"
        ? Number(cuenta.cuota || 0)
        : Number(cuenta.saldo_actual || 0);

    if (tipoRecargo === "PORCENTAJE") {
      return (base * Number(porcentaje || 0)) / 100;
    }

    return Number(montoFijo || 0);
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
      setTipoRecargo(data.tipo_recargo || "PORCENTAJE");
      setPorcentaje(data.porcentaje || "");
      setMontoFijo(data.monto_fijo || "");
      setDiasGracia(data.dias_gracia || "");
      setAplicarSobre(data.aplicar_sobre || "SALDO_ACTUAL");
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
      estado: "Activo",
      updated_at: new Date().toISOString(),
    };

    let error;

    if (configuracion?.id) {
      const respuesta = await supabase
        .from("configuracion_recargos")
        .update(payload)
        .eq("id", configuracion.id)
        .eq("empresa_id", empresaId);

      error = respuesta.error;
    } else {
      const respuesta = await supabase
        .from("configuracion_recargos")
        .insert([payload]);

      error = respuesta.error;
    }

    setGuardando(false);

    if (error) {
      alert("Error guardando configuración: " + error.message);
      return;
    }

    alert("Configuración de recargos guardada correctamente.");
    cargarConfiguracion();
  }

  async function cargarCuentasEnMora() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .gt("saldo_actual", 0)
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      alert("Error cargando cuentas en mora: " + error.message);
      return;
    }

    const cuentas = (data || []).filter((cuenta) => {
      const dias = calcularDiasAtraso(cuenta.fecha_vencimiento, cuenta.saldo_actual);
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
      .limit(20);

    if (error) {
      alert("Error cargando historial: " + error.message);
      return;
    }

    setHistorial(data || []);
  }

  async function aplicarRecargoCuenta(cuenta) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const diasAtraso = calcularDiasAtraso(
      cuenta.fecha_vencimiento,
      cuenta.saldo_actual
    );

    if (diasAtraso <= Number(diasGracia || 0)) {
      alert("Esta cuenta aún no supera los días de gracia.");
      return;
    }

    const saldoAnterior = Number(cuenta.saldo_actual || 0);
    const montoRecargo = calcularRecargo(cuenta);
    const saldoNuevo = saldoAnterior + montoRecargo;

    if (montoRecargo <= 0) {
      alert("El recargo debe ser mayor a cero.");
      return;
    }

    const usuario = localStorage.getItem("usuarioNombre") || "Sistema";

    const { error: errorCuenta } = await supabase
      .from("informacion_comercial")
      .update({
        saldo_actual: saldoNuevo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cuenta.id)
      .eq("empresa_id", empresaId);

    if (errorCuenta) {
      alert("Error actualizando saldo: " + errorCuenta.message);
      return;
    }

    const { error: errorHistorial } = await supabase
      .from("historial_recargos")
      .insert([
        {
          empresa_id: empresaId,
          cliente_id: cuenta.cliente_id,
          informacion_comercial_id: cuenta.id,
          numero_cuenta: cuenta.numero_cuenta,
          tipo_recargo: tipoRecargo,
          aplicar_sobre: aplicarSobre,
          porcentaje: Number(porcentaje || 0),
          monto_fijo: Number(montoFijo || 0),
          monto_recargo: montoRecargo,
          saldo_anterior: saldoAnterior,
          saldo_nuevo: saldoNuevo,
          dias_atraso: diasAtraso,
          usuario,
          created_at: new Date().toISOString(),
        },
      ]);

    if (errorHistorial) {
      alert("Saldo actualizado, pero error guardando historial: " + errorHistorial.message);
      return;
    }

    alert("Recargo aplicado correctamente.");
    cargarCuentasEnMora();
    cargarHistorial();
  }

  async function aplicarRecargoMasivo() {
    if (cuentasMora.length === 0) {
      alert("No hay cuentas en mora para aplicar recargo.");
      return;
    }

    const confirmar = confirm(
      `Se aplicará recargo a ${cuentasMora.length} cuenta(s). ¿Desea continuar?`
    );

    if (!confirmar) return;

    setAplicando(true);

    for (const cuenta of cuentasMora) {
      await aplicarRecargoCuenta(cuenta);
    }

    setAplicando(false);
    alert("Aplicación masiva finalizada.");
  }

  return (
    <div style={pagina}>
      <h1>Módulo 6 - Recargos</h1>

      <div style={card}>
        <h2>Configuración de Recargos</h2>

        <label>
          <input
            type="checkbox"
            checked={recargoAutomatico}
            onChange={(e) => setRecargoAutomatico(e.target.checked)}
          />{" "}
          Recargo automático activo
        </label>

        <label>Tipo de recargo</label>
        <select
          value={tipoRecargo}
          onChange={(e) => setTipoRecargo(e.target.value)}
          style={input}
        >
          <option value="PORCENTAJE">Porcentaje</option>
          <option value="FIJO">Monto fijo</option>
        </select>

        {tipoRecargo === "PORCENTAJE" && (
          <>
            <label>Porcentaje de recargo</label>
            <input
              type="number"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              style={input}
              placeholder="Ejemplo: 10"
            />
          </>
        )}

        {tipoRecargo === "FIJO" && (
          <>
            <label>Monto fijo</label>
            <input
              type="number"
              value={montoFijo}
              onChange={(e) => setMontoFijo(e.target.value)}
              style={input}
              placeholder="Ejemplo: 5"
            />
          </>
        )}

        <label>Días de gracia</label>
        <input
          type="number"
          value={diasGracia}
          onChange={(e) => setDiasGracia(e.target.value)}
          style={input}
          placeholder="Ejemplo: 3"
        />

        <label>Aplicar sobre</label>
        <select
          value={aplicarSobre}
          onChange={(e) => setAplicarSobre(e.target.value)}
          style={input}
        >
          <option value="SALDO_ACTUAL">Saldo actual</option>
          <option value="CUOTA">Cuota</option>
        </select>

        <button onClick={guardarConfiguracion} disabled={guardando} style={botonGuardar}>
          {guardando ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>

      <div style={card}>
        <div style={header}>
          <h2>Cuentas en Mora</h2>

          <button onClick={cargarCuentasEnMora} style={botonSecundario}>
            Actualizar
          </button>
        </div>

        <button onClick={aplicarRecargoMasivo} disabled={aplicando} style={botonRojo}>
          {aplicando ? "Aplicando..." : "Aplicar recargo masivo"}
        </button>

        <table style={tabla}>
          <thead>
            <tr>
              <th style={th}>Cuenta</th>
              <th style={th}>Descripción</th>
              <th style={th}>Saldo</th>
              <th style={th}>Cuota</th>
              <th style={th}>Vencimiento</th>
              <th style={th}>Días atraso</th>
              <th style={th}>Recargo</th>
              <th style={th}>Acción</th>
            </tr>
          </thead>

          <tbody>
            {cuentasMora.length === 0 ? (
              <tr>
                <td style={td} colSpan="8">
                  No hay cuentas en mora según la configuración actual.
                </td>
              </tr>
            ) : (
              cuentasMora.map((cuenta) => {
                const dias = calcularDiasAtraso(
                  cuenta.fecha_vencimiento,
                  cuenta.saldo_actual
                );

                const recargo = calcularRecargo(cuenta);

                return (
                  <tr key={cuenta.id}>
                    <td style={td}>{cuenta.numero_cuenta}</td>
                    <td style={td}>{cuenta.descripcion || "-"}</td>
                    <td style={td}>${Number(cuenta.saldo_actual || 0).toFixed(2)}</td>
                    <td style={td}>${Number(cuenta.cuota || 0).toFixed(2)}</td>
                    <td style={td}>{cuenta.fecha_vencimiento || "-"}</td>
                    <td style={td}>{dias}</td>
                    <td style={td}>${Number(recargo || 0).toFixed(2)}</td>
                    <td style={td}>
                      <button
                        onClick={() => aplicarRecargoCuenta(cuenta)}
                        style={botonPequeno}
                      >
                        Aplicar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h2>Historial de Recargos</h2>

        <table style={tabla}>
          <thead>
            <tr>
              <th style={th}>Fecha</th>
              <th style={th}>Cuenta</th>
              <th style={th}>Tipo</th>
              <th style={th}>Días</th>
              <th style={th}>Recargo</th>
              <th style={th}>Saldo anterior</th>
              <th style={th}>Saldo nuevo</th>
              <th style={th}>Usuario</th>
            </tr>
          </thead>

          <tbody>
            {historial.length === 0 ? (
              <tr>
                <td style={td} colSpan="8">
                  No hay recargos registrados.
                </td>
              </tr>
            ) : (
              historial.map((item) => (
                <tr key={item.id}>
                  <td style={td}>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td style={td}>{item.numero_cuenta || "-"}</td>
                  <td style={td}>{item.tipo_recargo}</td>
                  <td style={td}>{item.dias_atraso}</td>
                  <td style={td}>${Number(item.monto_recargo || 0).toFixed(2)}</td>
                  <td style={td}>${Number(item.saldo_anterior || 0).toFixed(2)}</td>
                  <td style={td}>${Number(item.saldo_nuevo || 0).toFixed(2)}</td>
                  <td style={td}>{item.usuario || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const pagina = {
  maxWidth: "1200px",
  margin: "30px auto",
  padding: "20px",
};

const card = {
  background: "#fff",
  padding: "22px",
  borderRadius: "14px",
  marginBottom: "25px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const input = {
  width: "100%",
  padding: "11px",
  marginBottom: "15px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const botonGuardar = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "13px 20px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
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
};

const botonPequeno = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "7px",
  cursor: "pointer",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
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
