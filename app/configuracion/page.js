"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ModulosPage() {
  const [modulos, setModulos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarModulos();
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

  function volverConfiguracion() {
    window.location.href = "/configuracion";
  }

  async function cargarModulos() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    setCargando(true);

    const { data, error } = await supabase
      .from("empresa_modulos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (error) {
      alert("Error cargando módulos: " + error.message);
      setCargando(false);
      return;
    }

    setModulos(data || null);
    setCargando(false);
  }

  async function actualizarModulo(campo, valor) {
    if (!modulos?.id) {
      alert("No hay configuración de módulos para actualizar.");
      return;
    }

    const { error } = await supabase
      .from("empresa_modulos")
      .update({
        [campo]: valor,
      })
      .eq("id", modulos.id);

    if (error) {
      alert("Error actualizando módulo: " + error.message);
      return;
    }

    setModulos({
      ...modulos,
      [campo]: valor,
    });
  }

  const camposModulos = modulos
    ? Object.keys(modulos).filter(
        (key) =>
          !["id", "empresa_id", "created_at", "updated_at"].includes(key) &&
          typeof modulos[key] === "boolean"
      )
    : [];

  if (cargando) {
    return <div style={{ padding: "30px" }}>Cargando módulos...</div>;
  }

  if (!modulos) {
    return (
      <div style={{ padding: "30px" }}>
        <h1>Configuración de Módulos</h1>
        <p>No hay módulos configurados para esta empresa.</p>
        <button onClick={volverConfiguracion}>← Volver</button>
      </div>
    );
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={header}>
          <div>
            <h1 style={titulo}>Configuración de Módulos</h1>
            <p style={subtitulo}>
              Activa o desactiva los módulos disponibles para la empresa actual.
            </p>
          </div>

          <button style={botonVolver} onClick={volverConfiguracion}>
            ← Volver
          </button>
        </div>

        <div style={card}>
          {camposModulos.map((key) => (
            <div key={key} style={fila}>
              <label style={label}>{key.replaceAll("_", " ")}</label>

              <input
                type="checkbox"
                checked={Boolean(modulos[key])}
                onChange={(e) => actualizarModulo(key, e.target.checked)}
                style={checkbox}
              />
            </div>
          ))}

          {camposModulos.length === 0 && (
            <p>No hay campos booleanos de módulos para mostrar.</p>
          )}
        </div>
      </div>
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
  maxWidth: "900px",
  margin: "0 auto",
};

const header = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "24px",
  borderRadius: "18px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
};

const titulo = {
  margin: 0,
  fontSize: "30px",
};

const subtitulo = {
  margin: "6px 0 0",
  color: "#dcfce7",
};

const card = {
  background: "#ffffff",
  padding: "22px",
  borderRadius: "16px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
};

const fila = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  marginBottom: "12px",
  alignItems: "center",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "12px",
};

const label = {
  width: "260px",
  textTransform: "capitalize",
  fontWeight: "700",
  color: "#111827",
};

const checkbox = {
  width: "22px",
  height: "22px",
  cursor: "pointer",
};

const botonVolver = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "11px 18px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};
