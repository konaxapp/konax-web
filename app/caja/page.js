"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Caja() {
  const [tipoMovimiento, setTipoMovimiento] = useState("Venta Contado");
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [buscarCliente, setBuscarCliente] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cuentasCliente, setCuentasCliente] = useState([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);

  const [nombreContado, setNombreContado] = useState("");
  const [cedulaContado, setCedulaContado] = useState("");

  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observacion, setObservacion] = useState("");
  const [movimientos, setMovimientos] = useState([]);

  const requiereCliente = tipoMovimiento !== "Venta Contado";

  useEffect(() => {
    cargarMovimientos();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de usar Caja.");
      return null;
    }

    return empresaId;
  }

  function generarTransaccion() {
    return "TX-" + Date.now();
  }

  async function cargarMovimientos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando movimientos: " + error.message);
      return;
    }

    setMovimientos(data || []);
  }

  async function buscarClientes() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const texto = buscarCliente.trim();

    if (texto.length < 3) {
      alert("Escriba mínimo 3 caracteres para buscar.");
      return;
    }

    let resultados = [];

    const { data: clientesData, error: errorClientes } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(`nombre.ilike.%${texto}%,cedula.ilike.%${texto}%`);

    if (errorClientes) {
      alert("Error buscando cliente: " + errorClientes.message);
      return;
    }

    if (clientesData && clientesData.length > 0) {
      resultados = clientesData.map((cliente) => ({
        cliente,
        cuenta: null,
      }));
    }

    const { data: cuentasData, error: errorCuentas } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .ilike("numero_cuenta", `%${texto}%`);

    if (errorCuentas) {
      alert("Error buscando cuenta: " + errorCuentas.message);
      return;
    }

    if (cuentasData && cuentasData.length > 0) {
      const idsClientes = cuentasData.map((cuenta) => cuenta.cliente_id);

      const { data: clientesDeCuentas, error: errorClientesCuentas } =
        await supabase
          .from("clientes")
          .select("*")
          .eq("empresa_id", empresaId)
          .in("id", idsClientes);

      if (errorClientesCuentas) {
        alert("Error buscando clientes de cuentas: " + errorClientesCuentas.message);
        return;
      }

      cuentasData.forEach((cuenta) => {
        const cliente = clientesDeCuentas?.find(
          (item) => item.id === cuenta.cliente_id
        );

        if (cliente) {
          resultados.push({
            cliente,
            cuenta,
          });
        }
      });
    }

    setResultadosBusqueda(resultados);
  }

  async function seleccionarResultado(resultado) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const cliente = resultado.cliente;

    setClienteSeleccionado(cliente);
    setBuscarCliente(cliente.nombre);
    setResultadosBusqueda([]);

    const { data, error } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      alert("Cliente seleccionado, pero no tiene cuenta comercial.");
      setCuentasCliente([]);
      setCuentaSeleccionada(null);
      return;
    }

    setCuentasCliente(data);

    if (resultado.cuenta) {
      setCuentaSeleccionada(resultado.cuenta);
    } else {
      setCuentaSeleccionada(data[0]);
    }
  }

  async function guardarMovimiento() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!monto) {
      alert("Ingrese el monto.");
      return;
    }

    if (requiereCliente && !clienteSeleccionado) {
      alert("Seleccione un cliente.");
      return;
    }

    if (requiereCliente && !cuentaSeleccionada) {
      alert("Seleccione una cuenta.");
      return;
    }

    const numeroTransaccion = generarTransaccion();

    const { error } = await supabase.from("caja").insert([
      {
        empresa_id: empresaId,
        numero_transaccion: numeroTransaccion,
        cliente_id: clienteSeleccionado?.id || null,
        informacion_comercial_id: cuentaSeleccionada?.id || null,
        numero_cuenta: cuentaSeleccionada?.numero_cuenta || null,
        fecha_pago: fechaPago,
        tipo: tipoMovimiento,
        descripcion: concepto || observacion || tipoMovimiento,
        monto: Number(monto),
        metodo_pago: metodoPago,
        usuario: responsable || "Caja",
        estado: "Procesado",
        cliente_nombre: requiereCliente
          ? clienteSeleccionado?.nombre
          : nombreContado || null,
        cliente_cedula: requiereCliente
          ? clienteSeleccionado?.cedula
          : cedulaContado || null,
      },
    ]);

    if (error) {
      alert("Error al registrar movimiento: " + error.message);
      return;
    }

    if (requiereCliente && cuentaSeleccionada) {
      const nuevoSaldo =
        Number(cuentaSeleccionada.saldo_actual || 0) - Number(monto);

      const { error: errorSaldo } = await supabase
        .from("informacion_comercial")
        .update({
          saldo_actual: nuevoSaldo < 0 ? 0 : nuevoSaldo,
        })
        .eq("empresa_id", empresaId)
        .eq("id", cuentaSeleccionada.id);

      if (errorSaldo) {
        alert("Movimiento registrado, pero error actualizando saldo: " + errorSaldo.message);
        return;
      }

      const { error: errorCobranza } = await supabase
        .from("informacion_cobranza")
        .update({
          fecha_ultimo_pago: fechaPago,
          monto_ultimo_pago: Number(monto),
        })
        .eq("empresa_id", empresaId)
        .eq("informacion_comercial_id", cuentaSeleccionada.id);

      if (errorCobranza) {
        alert("Movimiento registrado, pero error actualizando cobranza: " + errorCobranza.message);
        return;
      }
    }

    alert("Movimiento registrado correctamente.");
    limpiarFormulario();
    cargarMovimientos();
  }

  function limpiarFormulario() {
    setTipoMovimiento("Venta Contado");
    setFechaPago(new Date().toISOString().split("T")[0]);
    setBuscarCliente("");
    setResultadosBusqueda([]);
    setClienteSeleccionado(null);
    setCuentasCliente([]);
    setCuentaSeleccionada(null);
    setNombreContado("");
    setCedulaContado("");
    setMetodoPago("Efectivo");
    setMonto("");
    setConcepto("");
    setResponsable("");
    setObservacion("");
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={logoBox}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
        </div>

        <h1 style={titulo}>Caja</h1>

        <p style={subtitulo}>
          Registro de ventas contado, pagos, abonos, mensualidades,
          suscripciones y contratos.
        </p>

        <div style={card}>
          <h2 style={tituloSeccion}>Información General</h2>

          <div style={grid}>
            <div>
              <label style={label}>Fecha</label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={label}>N° Transacción</label>
              <input value="Automático al guardar" readOnly style={inputStyle} />
            </div>

            <div>
              <label style={label}>Tipo de movimiento</label>
              <select
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value)}
                style={inputStyle}
              >
                <option>Venta Contado</option>
                <option>Venta Crédito</option>
                <option>Abono</option>
                <option>Pago Crédito</option>
                <option>Mensualidad</option>
                <option>Suscripción</option>
                <option>Contrato</option>
              </select>
            </div>
          </div>
        </div>

        {!requiereCliente && (
          <div style={card}>
            <h2 style={tituloSeccion}>Cliente</h2>

            <div style={grid}>
              <input
                placeholder="Nombre del cliente (opcional)"
                value={nombreContado}
                onChange={(e) => setNombreContado(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Cédula (opcional)"
                value={cedulaContado}
                onChange={(e) => setCedulaContado(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {requiereCliente && (
          <div style={card}>
            <h2 style={tituloSeccion}>Cliente / Cuenta</h2>

            <div style={grid}>
              <input
                placeholder="Buscar por nombre, cédula o número de cuenta..."
                value={buscarCliente}
                onChange={(e) => setBuscarCliente(e.target.value)}
                style={inputStyle}
              />

              <button style={botonSecundario} onClick={buscarClientes}>
                Buscar
              </button>
            </div>

            {resultadosBusqueda.length > 0 && (
              <div style={{ marginTop: "15px", overflowX: "auto" }}>
                <table style={tabla}>
                  <tbody>
                    {resultadosBusqueda.map((item, index) => (
                      <tr key={index}>
                        <td style={td}>{item.cliente.nombre}</td>
                        <td style={td}>{item.cliente.cedula}</td>
                        <td style={td}>
                          {item.cuenta?.numero_cuenta || "Ver cuentas"}
                        </td>
                        <td style={td}>
                          <button
                            style={boton}
                            onClick={() => seleccionarResultado(item)}
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {clienteSeleccionado && (
              <div style={{ marginTop: "15px" }}>
                <p>
                  <strong>Cliente:</strong> {clienteSeleccionado.nombre}
                </p>
                <p>
                  <strong>Cédula:</strong> {clienteSeleccionado.cedula}
                </p>

                {cuentasCliente.length > 1 && (
                  <div style={{ marginTop: "12px" }}>
                    <label style={label}>Seleccionar cuenta</label>

                    <select
                      value={cuentaSeleccionada?.id || ""}
                      onChange={(e) => {
                        const cuenta = cuentasCliente.find(
                          (item) => item.id === e.target.value
                        );
                        setCuentaSeleccionada(cuenta);
                      }}
                      style={inputStyle}
                    >
                      {cuentasCliente.map((cuenta) => (
                        <option key={cuenta.id} value={cuenta.id}>
                          {cuenta.numero_cuenta} - {cuenta.descripcion} - Saldo $
                          {Number(cuenta.saldo_actual || 0).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <p>
                  <strong>Cuenta:</strong>{" "}
                  {cuentaSeleccionada?.numero_cuenta || "Sin cuenta"}
                </p>
                <p>
                  <strong>Saldo actual:</strong> $
                  {Number(cuentaSeleccionada?.saldo_actual || 0).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        <div style={card}>
          <h2 style={tituloSeccion}>Detalle del Movimiento</h2>

          <div style={grid}>
            <div>
              <label style={label}>Método de pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                style={inputStyle}
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Yappy</option>
                <option>Tarjeta</option>
                <option>Cheque</option>
                <option>Otro</option>
              </select>
            </div>

            <input
              placeholder="Monto"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Concepto / Descripción"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Vendedor / Responsable"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              style={inputStyle}
            />
          </div>

          <textarea
            placeholder="Observación del movimiento..."
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            style={textarea}
          />

          <div style={acciones}>
            <button style={boton} onClick={guardarMovimiento}>
              Registrar Movimiento
            </button>

            <button style={botonSecundario} onClick={limpiarFormulario}>
              Limpiar
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Movimientos registrados</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Transacción</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Cuenta</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Método</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Concepto</th>
                  <th style={th}>Responsable</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td style={td}>{movimiento.fecha_pago || movimiento.created_at}</td>
                    <td style={td}>{movimiento.numero_transaccion}</td>
                    <td style={td}>{movimiento.cliente_nombre || "-"}</td>
                    <td style={td}>{movimiento.cliente_cedula || "-"}</td>
                    <td style={td}>{movimiento.numero_cuenta || "-"}</td>
                    <td style={td}>{movimiento.tipo}</td>
                    <td style={td}>{movimiento.metodo_pago}</td>
                    <td style={td}>${Number(movimiento.monto || 0).toLocaleString()}</td>
                    <td style={td}>{movimiento.descripcion}</td>
                    <td style={td}>{movimiento.usuario}</td>
                    <td style={td}>{movimiento.estado}</td>
                  </tr>
                ))}
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

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginBottom: "20px",
  color: "#111827",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
  gap: "15px",
};

const label = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  color: "#374151",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const textarea = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  minHeight: "110px",
  marginTop: "20px",
};

const acciones = {
  display: "flex",
  gap: "15px",
  flexWrap: "wrap",
  marginTop: "20px",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "14px 28px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonSecundario = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "15px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const td = {
  padding: "15px",
  borderBottom: "1px solid #f3f4f6",
};
