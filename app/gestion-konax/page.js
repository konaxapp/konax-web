"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function GestionKonax() {
  const [empresas, setEmpresas] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

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

    const { data: bitacoraData } = await supabase
      .from("bitacora_konax")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    setEmpresas(empresasData || []);
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

  async function cambiarEstadoEmpresa(empresa, nuevoEstado) {
    const confirmar = confirm(
      `¿Seguro que deseas ${
        nuevoEstado === "Activo" ? "activar" : "suspender"
      } esta empresa?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("empresas")
      .update({
        estado: nuevoEstado,
        estado_plan: nuevoEstado === "Activo" ? "Activo" : "Suspendido",
      })
      .eq("id", empresa.id);

    if (error) {
      alert("Error actualizando empresa: " + error.message);
      return;
    }

    await supabase.from("bitacora_konax").insert([
      {
        empresa_id: empresa.id,
        empresa_nombre: empresa.nombre,
        accion: nuevoEstado === "Activo" ? "Empresa activada" : "Empresa suspendida",
        descripcion: `La empresa ${empresa.nombre} cambió a estado ${nuevoEstado}.`,
        estado_anterior: empresa.estado,
        estado_nuevo: nuevoEstado,
        usuario: localStorage.getItem("adminKonaxNombre") || "KONAX",
      },
    ]);

    alert("Estado actualizado correctamente.");
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

  const empresasActivas = empresas.filter(
    (e) => e.estado === "Activo" || e.estado === "Activa"
  ).length;

  const empresasSuspendidas = empresas.filter(
    (e) => e.estado === "Suspendido" || e.estado_plan === "Suspendido"
  ).length;

  const pendientesPago = empresas.filter(
    (e) => e.estado_pago && e.estado_pago !== "Al día"
  ).length;

  const ingresosMensuales = empresas
    .filter((e) => e.estado === "Activo" || e.estado === "Activa")
    .reduce((sum, e) => sum + Number(e.plan_precio || 0), 0);

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
              <p style={etiqueta}>Control Center</p>
              <h1 style={titulo}>Centro de Gestión KONAX</h1>
              <p style={subtitulo}>
                Ver empresas, pagos, vencimientos, activaciones, suspensiones e
                historial interno de KONAX.
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
          <KPI titulo="Pendientes de Pago" valor={pendientesPago} icono="⚠️" />
          <KPI
            titulo="Ingreso Mensual Estimado"
            valor={formato(ingresosMensuales)}
            icono="💰"
          />
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <div>
              <h2 style={tituloSeccion}>Empresas Clientes</h2>
              <p style={textoSuave}>
                Control de planes, pagos, vencimientos, activaciones y suspensiones.
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
                  <th style={th}>Estado</th>
                  <th style={th}>Próxima Facturación</th>
                  <th style={th}>Configuración</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {empresasFiltradas.map((empresa) => (
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

                    <td style={td}>
                      {empresa.fecha_proxima_facturacion || "-"}
                    </td>

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
                          window.location.href = "/plan-empresa";
                        }}
                      >
                        Plan
                      </button>

                      <button
                        style={botonAzul}
                        onClick={() => {
                          seleccionarEmpresa(empresa);
                          window.location.href = "/modulos";
                        }}
                      >
                        Módulos
                      </button>

                      <button
                        style={botonRojo}
                        onClick={() => cambiarEstadoEmpresa(empresa, "Suspendido")}
                      >
                        Suspender
                      </button>

                      <button
                        style={botonVerde}
                        onClick={() => cambiarEstadoEmpresa(empresa, "Activo")}
                      >
                        Activar
                      </button>
                    </td>
                  </tr>
                ))}

                {empresasFiltradas.length === 0 && (
                  <tr>
                    <td style={td} colSpan="8">
                      No hay empresas para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Historial Interno KONAX</h2>
          <p style={textoSuave}>
            Últimas acciones realizadas sobre empresas, planes, pagos y estados.
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
                {bitacora.map((item) => (
                  <tr key={item.id}>
                    <td style={td}>{item.created_at || "-"}</td>
                    <td style={td}>{item.empresa_nombre || "-"}</td>
                    <td style={td}>{item.accion || "-"}</td>
                    <td style={td}>{item.descripcion || "-"}</td>
                    <td style={td}>{item.usuario || "-"}</td>
                  </tr>
                ))}

                {bitacora.length === 0 && (
                  <tr>
                    <td style={td} colSpan="5">
                      No hay historial registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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
  background: "linear-gradient(135deg, #111827, #1e40af)",
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
  color: "#bfdbfe",
  fontSize: "14px",
  fontWeight: "bold",
};

const titulo = {
  margin: "4px 0",
  fontSize: "36px",
  fontWeight: "bold",
};

const subtitulo = {
  color: "#dbeafe",
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
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
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

const botonRojo = {
  background: "#dc2626",
  color: "#ffffff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "7px",
  fontWeight: "bold",
  cursor: "pointer",
  marginRight: "5px",
  marginBottom: "5px",
};
