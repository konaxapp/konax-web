"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Test() {
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("*");

    if (error) {
      console.log(error);
      return;
    }

    setClientes(data);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Clientes Supabase</h1>

      <pre>
        {JSON.stringify(clientes, null, 2)}
      </pre>
    </div>
  );
}
