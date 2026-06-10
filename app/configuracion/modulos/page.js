"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ModulosPage() {
  const [modulos, setModulos] = useState(null);

  useEffect(() => {
    cargarModulos();
  }, []);

  async function cargarModulos() {
    const { data, error } = await supabase
  .from("empresa_modulos")
  .select("*");

    if (error) {
  console.log("ERROR MODULOS:", error);
  alert(JSON.stringify(error));
  return;
}

    setModulos(data?.[0]);
  }

 if (!modulos) {
  return <div>NO HAY DATOS DE MODULOS</div>;
}

  return (
    <div style={{ padding: "20px" }}>
      <h1>Configuración de Módulos</h1>

      <ul>
        <li>Clientes: {modulos.clientes ? "✅" : "❌"}</li>
        <li>Caja: {modulos.caja ? "✅" : "❌"}</li>
        <li>Control Caja: {modulos.control_caja ? "✅" : "❌"}</li>
        <li>Vista Cliente: {modulos.vista_cliente ? "✅" : "❌"}</li>

        <li>Cobranza: {modulos.cobranza ? "✅" : "❌"}</li>
        <li>Inventario: {modulos.inventario ? "✅" : "❌"}</li>
        <li>Venta Crédito: {modulos.venta_credito ? "✅" : "❌"}</li>

        <li>Suscripciones: {modulos.suscripciones ? "✅" : "❌"}</li>
        <li>Recargos: {modulos.recargos ? "✅" : "❌"}</li>
        <li>Dashboard Ventas: {modulos.dashboard_ventas ? "✅" : "❌"}</li>
        <li>Dashboard Cobros: {modulos.dashboard_cobros ? "✅" : "❌"}</li>
        <li>Egresos: {modulos.egresos ? "✅" : "❌"}</li>
      </ul>
    </div>
  );
}
