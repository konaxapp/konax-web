"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function GestionKonax() {
  const [empresas, setEmpresas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [cargando, setCargando] = useState(true);

  const [mostrarPago, setMostrarPago] = useState(false);
  const [empresaPago, setEmpresaPago] = useState(null);
  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Yappy");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [observacionPago, setObservacionPago] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  function fechaHoy() {
    return new Date().toISOString().split("T")[0];
  }

  function sumarDias(fechaTexto, dias) {
    const fecha = fechaTexto ? new Date(fechaTexto) : new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().split("T")[0];
  }

  async function revisarSuspensionesAutomaticas(empresasData) {
    const hoy = fechaHoy();

    for (const empresa of empresasData || []) {
      const vencida =
        empresa.fecha_proxima_facturacion &&
        hoy > empresa.fecha_proxima_facturacion &&
        empresa.estado_pago !== "Al día";

      if (vencida && empresa.estado !== "Suspendido") {
        await supabase
          .from("empresas")
          .update({
            estado: "Suspendido",
            estado_plan: "Suspendido",
            estado_pago: "Pendiente",
          })
          .eq("id", empresa.id);

        await supabase.from("bitacora_konax").insert([
          {
            empresa_id: empresa.id,
            empresa_nombre: empresa.nombre,
            accion: "Suspensión automática",
            descripcion: `La empresa ${empresa.nombre} fue suspendida automáticamente por facturación vencida.`,
            estado_anterior: empresa.estado,
            estado_nuevo: "Suspendido",
            usuario: "Sistema KONAX",
          },
        ]);
      }
    }
  }

  async function cargarDatos() {
    setCargando(true);

    const { data: empresasData, error: errorEmpresas } = await supabase
      .from("empresas")
      .select("*")
      .order("created_at", { ascending: false });

    if (errorEmpresas) {
      alert("Error cargando empresas: " + errorEmpresas.message);
      setCargando(false);
      return;
    }

    await revisarSuspensionesAutomaticas(empresasData || []);

    const { data: empresasActualizadas } = await supabase
      .from("empresas")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: pagosData } = await supabase
      .from("pagos_konax")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: bitacoraData } = await supabase
      .from("bitacora_konax")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);

    setEmpresas(empresasActualizadas || []);
    setPagos(pagosData || []);
    setBitacora(bitacoraData || []);
    setCargando(false);
  }

  function formato(numero) {
    return (
      "$" +
      Number(numero || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      })
    );
  }

  function seleccionarEmpresa(empresa) {
    localStorage.setItem("empresaAdminCreadaId", empresa.id);
    localStorage.setItem("empresaAdminCreadaNombre", empresa.nombre || "");
    localStorage.setItem("categoriaNegocioAdmin", empresa.categoria_negocio || "");
    localStorage.setItem("tipoNegocioAdmin", empresa.tipo_negocio || "");

    alert("Empresa seleccionada: " + empresa.nombre);
  }

  function abrirPago(empresa) {
    setEmpresaPago(empresa);
    setMontoPago(empresa.plan_precio || "");
    setMetodoPago("Yappy");
    setReferenciaPago("");
    setObservacionPago("");
    setMostrarPago(true);
  }

  function cerrarPago() {
    setMostrarPago(false);
    setEmpresaPago(null);
    setMontoPago("");
    setReferenciaPago("");
    setObservacionPago("");
  }

  async function registrarPago() {
    if (!empresaPago) {
      alert("Seleccione una empresa.");
      return;
    }

    if (!montoPago || Number(montoPago) <= 0) {
      alert("Ingrese un monto válido.");
      return;
    }

    if (!referenciaPago) {
      alert("Ingrese la referencia del pago.");
      return;
    }

    const hoy = fechaHoy();
    const proximaFacturacion = sumarDias(hoy, 30);
    const usuario = localStorage.getItem("adminKonaxNombre") || "KONAX";

    const { error: errorPago } = await supabase.from("pagos_konax").insert([
      {
        empresa_id: empresaPago.id,
        empresa_nombre: empresaPago.nombre,
        monto: Number(montoPago),
        metodo_pago: metodoPago,
        referencia: referenciaPago,
        observacion: observacionPago,
        fecha_pago: hoy,
        usuario,
      },
    ]);

    if (errorPago) {
      alert("Error registrando pago: " + errorPago.message);
      return;
    }

    const { error: errorEmpresa } = await supabase
      .from("empresas")
      .update({
        estado: "Activo",
        estado_plan: "Activo",
        estado_pago: "Al día",
        fecha_ultimo_pago: hoy,
        fecha_proxima_facturacion: proximaFacturacion,
      })
      .eq("id", empresaPago.id);

    if (errorEmpresa) {
      alert("Pago guardado, pero error actualizando empresa: " + errorEmpresa.message);
      return;
    }

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: empresaPago.id,
        empresa_nombre: empresaPago.nombre,
        accion: "Pago registrado",
        descripcion: `Pago registrado por ${formato(montoPago)} vía ${metodoPago}. Próxima facturación: ${proximaFacturacion}.`,
        estado_anterior: empresaPago.estado,
        estado_nuevo: "Activo",
        usuario,
      },
    ]);

    alert("Pago registrado correctamente.");
    cerrarPago();
    cargarDatos();
  }

  const empresasFiltradas = empresas.filter((empresa) => {
    const texto = filtro.toLowerCase();

    return (
      !texto ||
      empresa.nombre?.toLowerCase().includes(texto) ||
      empresa.correo?.toLowerCase().includes(texto) ||
      empresa.telefono?.toLowerCase().includes(texto) ||
      empresa.plan_nombre?.toLowerCase().includes(texto) ||
      empresa.estado?.toLowerCase().includes(texto)
    );
  });

  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  const empresasActivas = empresas.filter(
    (e) => e.estado === "Activo" || e.estado === "Activa"
  ).length;

  const empresasSuspendidas = empresas.filter(
    (e) => e.estado === "Suspendido" || e.estado_plan === "Suspendido"
  ).length;

  const ingresosEstimados = empresas
    .filter((e) => e.estado === "Activo" || e.estado === "Activa")
    .reduce((sum, e) => sum + Number(e.plan_precio || 0), 0);

  const pagadoEsteMes = pagos.reduce((sum, pago) => {
    const fecha = pago.fecha_pago || pago.created_at;
    if (!fecha) return sum;

    const fechaPago = new Date(fecha);

    if (
      fechaPago.getMonth() === mesActual &&
      fechaPago.getFullYear() === anioActual
    ) {
      return sum + Number(pago.monto || 0);
    }

    return sum;
  }, 0);

  const proximosVencer = empresas.filter((empresa) => {
    if (!empresa.fecha_proxima_facturacion) return false;

    const hoyTexto = fechaHoy();
    const limite = sumarDias(hoyTexto, 7);

    return (
      empresa.fecha_proxima_facturacion >= hoyTexto &&
      empresa.fecha_proxima_facturacion <= limite
    );
  }).length;

  if (cargando) {
    return <div style={pagina}>Cargando Centro de Gestión KONAX...</div>;
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <p style={etiqueta}>Centro Interno KONAX</p>
              <h1 style={titulo}>Centro de Gestión KONAX</h1>
              <p style={subtitulo}>
                Control interno de empresas, pagos, vencimientos y estado del servicio.
              </p>
            </div>
          </div>

          <div style={accionesTop}>
            <Link href="/empresas" style={botonClaro}>
              Empresas
            </Link>

            <Link href="/admin" style={botonOscuro}>
              Volver al Admin
            </Link>
          </div>
        </div>

        <div style={kpiGrid}>
          <KPI titulo="Empresas Registradas" valor={empresas.length} icono="🏢" />
          <KPI titulo="Empresas Activas" valor={empresasActivas} icono="✅" />
          <KPI titulo="Suspendidas" valor={empresasSuspendidas} icono="⛔" />
          <KPI titulo="Próximas a vencer" valor={proximosVencer} icono="📅" />
          <KPI titulo="Ingreso Estimado" valor={formato(ingresosEstimados)} icono="📈" />
          <KPI titulo="Pagado Este Mes" valor={formato(pagadoEsteMes)} icono="💰" />
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <div>
              <h2 style={tituloSeccion}>Empresas Clientes</h2>
              <p style={textoSuave}>
                Consulta empresas, planes, pagos, vencimientos y registra pagos KONAX.
              </p>
            </div>

            <input
              placeholder="Buscar empresa, correo, teléfono, plan o estado..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              style={inputBuscar}
            />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Empresa</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Precio</th>
                  <th style={th}>Pago</th>
                  <th style={th}>Servicio</th>
                  <th style={th}>Próxima Facturación</th>
                  <th style={th}>Configuración</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {empresasFiltradas.length === 0 ? (
                  <tr>
                    <td style={td} colSpan="8">
                      No hay empresas para mostrar.
                    </td>
                  </tr>
                ) : (
                  empresasFiltradas.map((empresa) => (
                    <tr key={empresa.id}>
                      <td style={td}>
                        <strong>{empresa.nombre}</strong>
                        <br />
                        <span style={textoPequeno}>{empresa.correo || "-"}</span>
                        <br />
                        <span style={textoPequeno}>{empresa.telefono || "-"}</span>
                      </td>

                      <td style={td}>{empresa.plan_nombre || "Sin plan"}</td>
                      <td style={td}>{formato(empresa.plan_precio)}</td>
                      <td style={td}>{empresa.estado_pago || "Pendiente"}</td>

                      <td style={td}>
                        <span
                          style={
                            empresa.estado === "Activo" || empresa.estado === "Activa"
                              ? estadoActivo
                              : estadoSuspendido
                          }
                        >
                          {empresa.estado || "Activo"}
                        </span>
                      </td>

                      <td style={td}>{empresa.fecha_proxima_facturacion || "-"}</td>

                      <td style={td}>
                        {empresa.configuracion_completa ? "Completa" : "Pendiente"}
                      </td>

                      <td style={td}>
                        <button
                          style={botonVerde}
                          onClick={() => seleccionarEmpresa(empresa)}
                        >
                          Seleccionar
                        </button>

                        <button
                          style={botonAzul}
                          onClick={() => {
                            seleccionarEmpresa(empresa);
                            window.location.href = "/planes";
                          }}
                        >
                          Plan
                        </button>

                        <button
                          style={botonDorado}
                          onClick={() => abrirPago(empresa)}
                        >
                          Registrar Pago
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Historial Interno KONAX</h2>
          <p style={textoSuave}>
            Últimas acciones realizadas sobre empresas, planes y pagos.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Empresa</th>
                  <th style={th}>Acción</th>
                  <th style={th}>Descripción</th>
                  <th style={th}>Usuario</th>
                </tr>
              </thead>

              <tbody>
                {bitacora.length === 0 ? (
                  <tr>
                    <td style={td} colSpan="5">
                      No hay historial registrado.
                    </td>
                  </tr>
                ) : (
                  bitacora.map((item) => (
                    <tr key={item.id}>
                      <td style={td}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td style={td}>{item.empresa_nombre || "-"}</td>
                      <td style={td}>{item.accion || "-"}</td>
                      <td style={td}>{item.descripcion || "-"}</td>
                      <td style={td}>{item.usuario || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {mostrarPago && (
          <div style={modalFondo}>
            <div style={modal}>
              <h2 style={tituloSeccion}>Registrar Pago KONAX</h2>

              <p style={textoSuave}>
                Empresa: <strong>{empresaPago?.nombre}</strong>
              </p>

              <label style={label}>Método de pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                style={inputStyle}
              >
                <option>Yappy</option>
                <option>Transferencia Bancaria</option>
              </select>

              <label style={label}>Monto pagado</label>
              <input
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                placeholder="Ej. 49"
                style={inputStyle}
              />

              <label style={label}>Referencia</label>
              <input
                value={referenciaPago}
                onChange={(e) => setReferenciaPago(e.target.value)}
                placeholder="Número de referencia o comprobante"
                style={inputStyle}
              />

              <label style={label}>Observación</label>
              <textarea
                value={observacionPago}
                onChange={(e) => setObservacionPago(e.target.value)}
                placeholder="Observación opcional"
                style={textarea}
              />

              <div style={accionesModal}>
                <button style={botonVerdeGrande} onClick={registrarPago}>
                  Guardar Pago
                </button>

                <button style={botonGrisGrande} onClick={cerrarPago}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ titulo, valor, icono }) {
  return (
    <div style={kpiCard}>
      <div style={kpiIcono}>{icono}</div>
      <p style={kpiTitulo}>{titulo}</p>
      <h2 style={kpiValor}>{valor}</h2>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#eef2f7",
  padding: "30px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1500px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "28px",
  borderRadius: "22px",
  marginBottom: "22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const heroInfo = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const logo = {
  width: "90px",
  height: "auto",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "8px",
};

const etiqueta = {
  margin: 0,
  color: "#bbf7d0",
  fontSize: "14px",
  fontWeight: "bold",
};

const titulo = {
  margin: "4px 0",
  fontSize: "36px",
  fontWeight: "bold",
};

const subtitulo = {
  color: "#dcfce7",
  marginTop: "6px",
  maxWidth: "780px",
};

const accionesTop = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const botonClaro = {
  background: "#ffffff",
  color: "#111827",
  padding: "12px 18px",
  borderRadius: "9px",
  textDecoration: "none",
  fontWeight: "bold",
};

const botonOscuro = {
  background: "#111827",
  color: "#ffffff",
  padding: "12px 18px",
  borderRadius: "9px",
  textDecoration: "none",
  fontWeight: "bold",
  border: "1px solid #ffffff",
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const kpiCard = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
};

const kpiIcono = {
  fontSize: "28px",
  marginBottom: "8px",
};

const kpiTitulo = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
};

const kpiValor = {
  marginTop: "8px",
  color: "#111827",
  fontSize: "26px",
};

const card = {
  background: "#ffffff",
  padding: "24px",
  borderRadius: "18px",
  marginBottom: "20px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const tituloSeccion = {
  margin: 0,
  color: "#111827",
};

const textoSuave = {
  color: "#6b7280",
  marginTop: "6px",
};

const inputBuscar = {
  width: "360px",
  maxWidth: "100%",
  padding: "12px",
  borderRadius: "9px",
  border: "1px solid #d1d5db",
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
  verticalAlign: "top",
};

const textoPequeno = {
  color: "#6b7280",
  fontSize: "12px",
};

const estadoActivo = {
  background: "#dcfce7",
  color: "#166534",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const estadoSuspendido = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
};

const botonVerde = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "5px",
  marginBottom: "5px",
};

const botonAzul = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "5px",
  marginBottom: "5px",
};

const botonDorado = {
  background: "#ca8a04",
  color: "#ffffff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "5px",
  marginBottom: "5px",
};

const modalFondo = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
  zIndex: 999,
};

const modal = {
  width: "460px",
  maxWidth: "100%",
  background: "#ffffff",
  padding: "24px",
  borderRadius: "18px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
};

const label = {
  display: "block",
  marginTop: "14px",
  marginBottom: "6px",
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "9px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const textarea = {
  width: "100%",
  padding: "11px",
  borderRadius: "9px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  minHeight: "80px",
};

const accionesModal = {
  display: "flex",
  gap: "10px",
  marginTop: "18px",
};

const botonVerdeGrande = {
  flex: 1,
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "12px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonGrisGrande = {
  flex: 1,
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "12px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};
