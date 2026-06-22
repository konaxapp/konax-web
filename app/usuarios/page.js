"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Usuarios() {
  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("empresaAdminCreadaId");
    const nombreEmpresa = localStorage.getItem("empresaAdminCreadaNombre");

    if (!id) {
      alert("Primero debes crear o seleccionar una empresa.");
      window.location.href = "/empresas";
      return;
    }

    setEmpresaId(id);
    setEmpresaNombre(nombreEmpresa || "Empresa seleccionada");
  }, []);

  useEffect(() => {
    if (empresaId) cargarUsuarios();
  }, [empresaId]);

  async function cargarUsuarios() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: true });

    if (error) {
      alert("Error carg
