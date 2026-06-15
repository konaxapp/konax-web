"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Empresas() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [tipoRecargo, setTipoRecargo] = useState("Sin recargo");
  const [guardando, setGuardando] = useState(false);

  const categorias = {
    "Ventas a Crédito": [
      "Mueblería",
      "Electrónica",
      "Distribuidora",
      "Cooperativa",
      "Financiera",
      "Casa de Empeño",
    ],
    "Suscripciones y Membresías": [
      "Gimnasio",
      "IPTV",
      "Internet y Cable",
      "Club",
      "Servicio por Membresía",
    ],
    Comercio: [
      "Ferretería",
      "Farmacia",
      "Tienda",
      "Mercado",
      "Repuestos",
      "Boutique",
    ],
    Servicios: [
      "Seguridad",
      "Limpieza",
      "Jardinería",
      "Mantenimiento",
      "Veterinaria",
      "Clínica",
      "Belleza",
      "Consultoría",
    ],
    Educación: [
      "Escuela",
      "Colegio",
      "Academia",
      "Centro de Capacitación",
    ],
  };

  async function guardarEmpresa() {
    if (!nombre || !telefono || !categoria || !tipoNegocio) {
      alert("Complete nombre, teléfono, categoría y tipo de negocio.");
      return;
    }

    setGuardando(true);

    const { data, error } = await supabase
      .from("empresas")
      .insert([
        {
          nombre,
          telefono,
          correo,
          direccion,
          categoria_negocio: categoria,
          tipo_negocio: tipoNegocio,
          tipo_recargo: tipoRecargo,
          estado: "Activa",
        },
      ])
      .select()
      .single();

    setGuardando(false);

    if (error) {
      alert("Error al guardar empresa: " + error.message);
      return;
    }

    localStorage.setItem("empresaId", data.id);
    localStorage.setItem("empresaNombre", data.nombre);
    localStorage.setItem("categoriaNegocio", categoria);
    localStorage.setItem("tipoNegocio", tipoNegocio);

    window.location.href = "/planes";
  }

  return (
    <div style={pagina}>
      <div style={card}>
        <h1 style={titulo}>KONAX</h1>

        <h2 style={subtitulo}>Configuración de Empresa</h2>

        <div style={campo}>
          <label>Nombre de la Empresa</label>
          <input
            type="text"
            placeholder="Ej. Mueblería Central"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={campo}>
          <label>Teléfono</label>
          <input
            type="text"
            placeholder="Ej. 6000-0000"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={campo}>
          <label>Correo de la Empresa</label>
          <input
            type="email"
            placeholder="empresa@correo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={campo}>
          <label>Dirección</label>
          <input
            type="text"
            placeholder="Dirección del negocio"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={campo}>
          <label>Categoría del Negocio</label>
          <select
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              setTipoNegocio("");
            }}
            style={inputStyle}
          >
            <option value="">Seleccione una categoría</option>
            {Object.keys(categorias).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {categoria && (
          <div style={campo}>
            <label>Tipo de Negocio</label>
            <select
              value={tipoNegocio}
              onChange={(e) => setTipoNegocio(e.target.value)}
              style={inputStyle}
            >
              <option value="">Seleccione el tipo de negocio</option>
              {categorias[categoria].map((negocio) => (
                <option key={negocio} value={negocio}>
                  {negocio}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={campo}>
          <label>Tipo de Recargo</label>
          <select
            value={tipoRecargo}
            onChange={(e) => setTipoRecargo(e.target.value)}
            style={inputStyle}
          >
            <option>Sin recargo</option>
            <option>Mensual</option>
            <option>Semanal</option>
            <option>Diario</option>
            <option>Personalizado</option>
          </select>
        </div>

        <button onClick={guardarEmpresa} style={boton} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar Configuración"}
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
  background: "white",
  width: "700px",
  padding: "40px",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
};

const titulo = {
  marginBottom: "10px",
  textAlign: "center",
};

const subtitulo = {
  textAlign: "center",
  color: "#666",
  marginBottom: "40px",
};

const campo = {
  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "8px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const boton = {
  width: "100%",
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "15px",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};
