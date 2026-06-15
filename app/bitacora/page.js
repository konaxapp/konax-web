"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function BitacoraCliente() {
  const [buscarCliente, setBuscarCliente] = useState("");
  const [resultados, setResultados] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cuentasCliente, setCuentasCliente] = useState([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);

  const [tipoGestion, setTipoGestion] = useState("Llamada");
  const [comentario, setComentario] = useState("");
  const [resultado, setResultado] = useState("Pendiente");
  const [proximaGestion, setProximaGestion] = useState("");
  const [usuario, setUsuario] = useState("");

  const [historial, setHistorial] = useState([]);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa. Configure la empresa antes de usar Bitácora.");
      return null;
    }

    return empresaId;
  }

  useEffect(() => {
    cargarHistorialGeneral();
  }, []);

  async function cargarHistorialGeneral() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("bitacora_cliente")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando bitácora: " + error.message);
      return;
    }

    setHistorial(data || []);
  }

  async function buscarClientes() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const texto = buscarCliente.trim();

    if (texto.length < 3) {
      alert("Escriba mínimo 3 caracteres.");
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .or(`nombre.ilike.%${texto}%,cedula.ilike.%${texto}%`);

    if (error) {
      alert("Error buscando cliente: " + error.message);
      return;
    }

    setResultados(data || []);
  }

  async function seleccionarCliente(cliente) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    setClienteSeleccionado(cliente);
    setBuscarCliente(cliente.nombre);
    setResultados([]);

    const { data, error } = await supabase
      .from("informacion_comercial")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando cuentas: " + error.message);
      return;
    }

    setCuentasCliente(data || []);
    setCuentaSeleccionada(data?.[0] || null);

    cargarHistorialCliente(cliente.id);
  }

  async function cargarHistorialCliente(clienteId) {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("bitacora_cliente")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando historial del cliente: " + error.message);
      return;
    }

    setHistorial(data || []);
  }

  async function guardarGestion() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!clienteSeleccionado) {
      alert("Seleccione un cliente.");
      return;
    }

    if (!comentario) {
      alert("Escriba el comentario de la gestión.");
      return;
    }

    const { error } = await supabase.from("bitacora_cliente").insert([
      {
        empresa_id: empresaId,
        cliente_id: clienteSeleccionado.id,
        informacion_comercial_id: cuentaSeleccionada?.id || null,
        tipo_gestion: tipoGestion,
        comentario,
        resultado,
        proxima_gestion: proximaGestion || null,
        usuario: usuario || "Gestor",
        estado: "Activo",
      },
    ]);

    if (error) {
      alert("Error guardando gestión: " + error.message);
      return;
    }

    alert("Gestión guardada correctamente.");

    setTipoGestion("Llamada");
    setComentario("");
    setResultado("Pendiente");
    setProximaGestion("");
    setUsuario("");

    cargarHistorialCliente(clienteSeleccionado.id);
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <h1 style={titulo}>Bitácora de Cliente</h1>

        <p style={subtitulo}>
          Registra llamadas, WhatsApp, visitas, promesas y seguimientos por cliente.
        </p>

        <div style={card}>
          <h2 style={tituloSeccion}>Buscar Cliente</h2>

          <div style={grid}>
            <input
              placeholder="Buscar por nombre o cédula..."
              value={buscarCliente}
              onChange={(e) => setBuscarCliente(e.target.value)}
              style={input}
            />

            <button onClick={buscarClientes} style={botonSecundario}>
              Buscar
            </button>
          </div>

          {resultados.length > 0 && (
            <div style={{ marginTop: "15px", overflowX: "auto" }}>
              <table style={tabla}>
                <tbody>
                  {resultados.map((cliente) => (
                    <tr key={cliente.id}>
                      <td style={td}>{cliente.nombre}</td>
                      <td style={td}>{cliente.cedula}</td>
                      <td style={td}>{cliente.telefono || "-"}</td>
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
            <div style={clienteBox}>
              <p>
                <strong>Cliente:</strong> {clienteSeleccionado.nombre}
              </p>
              <p>
                <strong>Cédula:</strong> {clienteSeleccionado.cedula}
              </p>

              {cuentasCliente.length > 0 && (
                <>
                  <label style={label}>Cuenta / Crédito</label>
                  <select
                    value={cuentaSeleccionada?.id || ""}
                    onChange={(e) => {
                      const cuenta = cuentasCliente.find(
                        (item) => item.id === e.target.value
                      );
                      setCuentaSeleccionada(cuenta);
                    }}
                    style={input}
                  >
                    {cuentasCliente.map((cuenta) => (
                      <option key={cuenta.id} value={cuenta.id}>
                        {cuenta.numero_cuenta} - {cuenta.descripcion || "Cuenta"} - Saldo $
                        {Number(cuenta.saldo_actual || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Nueva Gestión</h2>

          <div style={grid}>
            <div>
              <label style={label}>Tipo de gestión</label>
              <select
                value={tipoGestion}
                onChange={(e) => setTipoGestion(e.target.value)}
                style={input}
              >
                <option>Llamada</option>
                <option>WhatsApp</option>
                <option>Visita</option>
                <option>Correo</option>
                <option>Promesa de pago</option>
                <option>Acuerdo</option>
                <option>Legal</option>
                <option>Otro</option>
              </select>
            </div>

            <div>
              <label style={label}>Resultado</label>
              <select
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                style={input}
              >
                <option>Pendiente</option>
                <option>Contactado</option>
                <option>No contestó</option>
                <option>Promesa de pago</option>
                <option>Incumplida</option>
                <option>Pagó</option>
                <option>Enviar a legal</option>
              </select>
            </div>

            <div>
              <label style={label}>Próxima gestión</label>
              <input
                type="date"
                value={proximaGestion}
                onChange={(e) => setProximaGestion(e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>Usuario / Gestor</label>
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Nombre del gestor"
                style={input}
              />
            </div>
          </div>

          <textarea
            placeholder="Comentario de la gestión..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            style={textarea}
          />

          <button onClick={guardarGestion} style={boton}>
            Guardar Gestión
          </button>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Historial</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Comentario</th>
                  <th style={th}>Resultado</th>
                  <th style={th}>Próxima</th>
                  <th style={th}>Usuario</th>
                </tr>
              </thead>

              <tbody>
                {historial.length === 0 && (
                  <tr>
                    <td style={td} colSpan="6">
                      No hay gestiones registradas.
                    </td>
                  </tr>
                )}

                {historial.map((item) => (
                  <tr key={item.id}>
                    <td style={td}>{item.created_at}</td>
                    <td style={td}>{item.tipo_gestion}</td>
                    <td style={td}>{item.comentario}</td>
                    <td style={td}>{item.resultado}</td>
                    <td style={td}>{item.proxima_gestion || "-"}</td>
                    <td style={td}>{item.usuario}</td>
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
  maxWidth: "1200px",
  margin: "0 auto",
};

const titulo = {
  fontSize: "38px",
  marginBottom: "10px",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  fontSize: "17px",
  marginBottom: "25px",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginBottom: "18px",
  color: "#111827",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: "15px",
};

const label = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  color: "#374151",
  fontWeight: "bold",
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const textarea = {
  ...input,
  minHeight: "120px",
  marginTop: "18px",
  marginBottom: "18px",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "13px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonSecundario = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "13px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const clienteBox = {
  background: "#f9fafb",
  padding: "15px",
  borderRadius: "12px",
  marginTop: "18px",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const td = {
  padding: "14px",
  borderBottom: "1px solid #f3f4f6",
};
