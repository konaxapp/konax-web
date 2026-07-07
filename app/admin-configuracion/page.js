"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminConfiguracion() {
  const [empresa, setEmpresa] = useState(null);
  const [modulos, setModulos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      window.location.href = "/login";
      return null;
    }

    return empresaId;
  }

  function esAdministrador() {
    const rol = String(localStorage.getItem("usuarioRol") || "")
      .toLowerCase()
      .trim();

    return (
      rol === "administrador" ||
      rol === "superadmin" ||
      rol === "admin master" ||
      rol === "administrador master"
    );
  }

  function volverDashboard() {
    window.location.href = "/dashboard";
  }

  function abrirRuta(ruta) {
    window.location.href = ruta;
  }

  async function cargarConfiguracion() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    if (!esAdministrador()) {
      alert("No tienes permiso para acceder a Configuración.");
      window.location.href = "/dashboard";
      return;
    }

    setCargando(true);

    const { data: empresaData, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      alert("Error cargando empresa: " + errorEmpresa.message);
      setCargando(false);
      return;
    }

    const { data: modulosData, error: errorModulos } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (errorModulos) {
      alert("Error cargando módulos: " + errorModulos.message);
      setCargando(false);
      return;
    }

    setEmpresa(empresaData || null);
    setModulos(modulosData || null);
    setCargando(false);
  }

  function moduloActivo(campo) {
    return Boolean(modulos?.[campo]);
  }

  if (cargando) {
    return <div style={{ padding: "30px" }}>Cargando configuración...</div>;
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div>
            <h1 style={tituloHero}>Configuración Administrador</h1>
            <p style={subtituloHero}>
              Centro de ajustes generales de la empresa y parámetros del sistema.
            </p>
          </div>

          <button style={botonClaro} onClick={volverDashboard}>
            ← Volver al Dashboard
          </button>
        </div>

        <div style={empresaCard}>
          <h2 style={tituloSeccion}>{empresa?.nombre || "Empresa"}</h2>

          <p style={texto}>
            Plan: <strong>{empresa?.plan_nombre || "Sin plan"}</strong> · Estado:{" "}
            <strong>{empresa?.estado_plan || empresa?.estado || "Activo"}</strong>
          </p>

          <p style={texto}>
            Tipo de negocio:{" "}
            <strong>{empresa?.tipo_negocio || "No definido"}</strong>
          </p>
        </div>

        <div style={grid}>
          <Modulo
            titulo="Datos de Empresa"
            descripcion="Nombre, teléfono, correo, dirección y datos generales."
            icono="🏢"
            activo={true}
            onClick={() => abrirRuta("/admin-configuracion/empresa")}
          />

          <Modulo
            titulo="Módulos del Plan"
            descripcion="Ver y administrar módulos activos de la empresa."
            icono="🧩"
            activo={true}
            onClick={() => abrirRuta("/configuracion/modulos")}
          />

          <Modulo
            titulo="Reglas de Cobranza"
            descripcion="Mora, legal, recargos, promesas y parámetros de cobro."
            icono="📞"
            activo={moduloActivo("cobranza") || moduloActivo("dashboard_cobros")}
            onClick={() => abrirRuta("/admin-configuracion/cobranza")}
          />

          <Modulo
            titulo="Caja y Pagos"
            descripcion="Métodos de pago, abonos, cancelaciones y recibos."
            icono="💵"
            activo={moduloActivo("caja") || moduloActivo("control_caja")}
            onClick={() => abrirRuta("/admin-configuracion/caja")}
          />

          <Modulo
            titulo="Documentos"
            descripcion="Membrete, cartas de mora, estado de cuenta y firma."
            icono="📄"
            activo={true}
            onClick={() => abrirRuta("/admin-configuracion/documentos")}
          />

          <Modulo
            titulo="Usuarios y Seguridad"
            descripcion="Roles, permisos, contraseñas y accesos."
            icono="🔐"
            activo={true}
            onClick={() => abrirRuta("/usuarios")}
          />

          <Modulo
            titulo="Inventario"
            descripcion="Parámetros de productos, stock y movimientos."
            icono="📦"
            activo={moduloActivo("inventario")}
            onClick={() => abrirRuta("/admin-configuracion/inventario")}
          />

          <Modulo
            titulo="Reportes"
            descripcion="Configuración de reportes e impresión."
            icono="📊"
            activo={moduloActivo("dashboard_cobros") || moduloActivo("dashboard_ventas")}
            onClick={() => abrirRuta("/reportes")}
          />
        </div>
      </div>
    </div>
  );
}

function Modulo({ titulo, descripcion, icono, activo, onClick }) {
  return (
    <div style={activo ? cardActivo : cardInactivo}>
      <div style={iconoBox}>{icono}</div>
      <h3 style={tituloModulo}>{titulo}</h3>
      <p style={descripcionModulo}>{descripcion}</p>

      <button
        style={activo ? botonModulo : botonBloqueado}
        onClick={activo ? onClick : undefined}
        disabled={!activo}
      >
        {activo ? "Abrir" : "No activo"}
      </button>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#eef2f7",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1400px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "26px",
  borderRadius: "22px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const tituloHero = {
  margin: 0,
  fontSize: "36px",
};

const subtituloHero = {
  color: "#dcfce7",
  marginTop: "8px",
  marginBottom: 0,
};

const empresaCard = {
  background: "#ffffff",
  padding: "22px",
  borderRadius: "18px",
  marginBottom: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
};

const tituloSeccion = {
  margin: 0,
  color: "#111827",
};

const texto = {
  color: "#4b5563",
  marginBottom: 0,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
  gap: "16px",
};

const cardActivo = {
  background: "#ffffff",
  padding: "22px",
  borderRadius: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
};

const cardInactivo = {
  ...cardActivo,
  opacity: 0.55,
};

const iconoBox = {
  fontSize: "30px",
  marginBottom: "10px",
};

const tituloModulo = {
  margin: "0 0 8px",
  color: "#111827",
};

const descripcionModulo = {
  color: "#6b7280",
  fontSize: "14px",
  minHeight: "44px",
};

const botonModulo = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "11px 18px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonBloqueado = {
  background: "#9ca3af",
  color: "#ffffff",
  border: "none",
  padding: "11px 18px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "not-allowed",
};

const botonClaro = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 20px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};
