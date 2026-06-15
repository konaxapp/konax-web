"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Confirmacion() {
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    cargarEmpresa();
  }, []);

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay empresa activa.");
      return null;
    }

    return empresaId;
  }

  async function cargarEmpresa() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .single();

    if (error) {
      alert("Error cargando empresa: " + error.message);
      return;
    }

    setEmpresa(data);
  }

  const continuar = () => {
    window.location.href = "/usuarios";
  };

  return (
    <div style={pagina}>
      <div style={card}>
        <div style={icono}>✅</div>

        <h1 style={titulo}>Empresa creada correctamente</h1>

        <p style={subtitulo}>
          Tu empresa ya está lista para comenzar a utilizar KONAX.
        </p>

        <div style={resumen}>
          <p>
            <strong>Empresa:</strong> {empresa?.nombre || "Cargando..."}
          </p>

          <p>
            <strong>Plan seleccionado:</strong>{" "}
            {empresa?.plan_nombre || "Sin plan"}
          </p>

          <p>
            <strong>Tipo de plan:</strong>{" "}
            {empresa?.plan_tipo || "-"}
          </p>

          <p>
            <strong>Precio:</strong> $
            {Number(empresa?.plan_precio || 0).toLocaleString()}
          </p>

          <p>
            <strong>Estado:</strong>{" "}
            <span style={estado}>
              {empresa?.estado_plan || "Activo"}
            </span>
          </p>
        </div>

        <button onClick={continuar} style={boton}>
          Continuar
        </button>
      </div>
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Arial",
  padding: "30px",
};

const card = {
  width: "700px",
  background: "white",
  borderRadius: "20px",
  padding: "50px",
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
};

const icono = {
  fontSize: "80px",
  marginBottom: "20px",
};

const titulo = {
  color: "#16a34a",
  marginBottom: "15px",
};

const subtitulo = {
  color: "#666",
  marginBottom: "30px",
};

const resumen = {
  background: "#f9fafb",
  padding: "25px",
  borderRadius: "12px",
  textAlign: "left",
  marginBottom: "30px",
};

const estado = {
  color: "#16a34a",
  fontWeight: "bold",
};

const boton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "15px 40px",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};
