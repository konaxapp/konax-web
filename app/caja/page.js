"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Caja() {
  const [tipoMovimiento, setTipoMovimiento] = useState("Venta Contado");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);
  const [buscarCliente, setBuscarCliente] = useState("");
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);

  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observacion, setObservacion] = useState("");
  const [movimientos, setMovimientos] = useState([]);

  useEffect(() => {
    cargarMovimientos();
  }, []);

  const requiereCliente = tipoMovimiento !== "Venta Contado";

  function generarTransaccion() {
    return "TX-" + Date.now();
  }

  async function buscarClientes() {
    if (buscarCliente.trim().length < 3) {
      alert("Escriba mínimo 3 caracteres para buscar.");
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .or(
        `nombre.ilike.%${buscarCliente}%,cedula.ilike.%${buscarCliente}%,telefono.ilike.%${buscarCliente}%`
      );

    if (error) {
      alert("Error buscando cliente: " + error.message);
      return;
    }

    setClientes(data || []);
  }

  async function seleccionarCliente(cliente) {
    setClienteSeleccionado(cliente);
    setBuscarCliente(cliente.nombre);
    setClientes([]);

    const { data, error } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      alert("Cliente seleccionado, pero no tiene cuenta comercial.");
      setCuentaSeleccionada(null);
      return;
    }

    setCuentaSeleccionada(data);
  }

  async function cargarMovimientos() {
    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setMovimientos(data || []);
    }
  }

  async function guardarMovimiento() {
    if (!monto) {
      alert("Ingrese el monto.");
      return;
    }

    if (requiereCliente && !clienteSeleccionado) {
      alert("Seleccione un cliente.");
      return;
    }

    if (requiereCliente && !cuentaSeleccionada) {
      alert("Este cliente no tiene cuenta comercial asociada.");
      return;
    }

    const numeroTransaccion = generarTransaccion();

    const { error } = await supabase.from("caja").insert([
      {
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
      },
    ]);

    if (error) {
      alert("Error al registrar movimiento: " + error.message);
      return;
    }

    if (requiereCliente && cuentaSeleccionada?.saldo_actual !== null) {
      const nuevoSaldo = Number(cuentaSeleccionada.saldo_actual || 0) - Number(monto);

      await supabase
        .from("informacion_comercial")
        .update({ saldo_actual: nuevoSaldo < 0 ? 0 : nuevoSaldo })
        .eq("id", cuentaSeleccionada.id);
    }

    alert("Movimiento registrado correctamente.");
    limpiarFormulario();
    cargarMovimientos();
  }

  function limpiarFormulario() {
    setTipoMovimiento("Venta Contado");
    setFechaPago(new Date().toISOString().split("T")[0]);
    setBuscarCliente("");
    setClientes([]);
    setClienteSeleccionado(null);
    setCuentaSeleccionada(null);
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
          Registro de ventas contado, pagos, abonos, mensualidades, suscripciones y contratos.
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

        {requiereCliente && (
          <div style={card}>
            <h2 style={tituloSeccion}>Cliente</h2>

            <div style={grid}>
              <input
                placeholder="Buscar cliente por nombre, cédula o teléfono..."
                value={buscarCliente}
                onChange={(e) => setBuscarCliente(e.target.value)}
                style={inputStyle}
              />

              <button style={botonSecundario} onClick={buscarClientes}>
                Buscar Cliente
              </button>
            </div>

            {clientes.length > 0 && (
              <div style={{ marginTop: "15px", overflowX: "auto" }}>
                <table style={tabla}>
                  <tbody>
                    {clientes.map((cliente) => (
                      <tr key={cliente.id}>
                        <td style={td}>{cliente.nombre}</td>
                        <td style={td}>{cliente.cedula}</td>
                        <td style={td}>{cliente.telefono}</td>
                        <td style={td}>
                          <button
                            style={boton}
                            onClick={() => seleccionarCliente(cliente)}
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
                <p><strong>Cliente:</strong> {clienteSeleccionado.nombre}</p>
                <p><strong>Cédula:</strong> {clienteSeleccionado.cedula}</p>
                <p><strong>Teléfono:</strong> {clienteSeleccionado.telefono}</p>
                <p><strong>Cuenta:</strong> {cuentaSeleccionada?.numero_cuenta || "Sin cuenta"}</p>
                <p><strong>Saldo actual:</strong> ${Number(cuentaSeleccionada?.saldo_actual || 0).toLocaleString()}</p>
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
