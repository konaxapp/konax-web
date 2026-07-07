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
.select("*")
.limit(1);

if (error) {  
  console.log(error);  
  return;  
}  

setModulos(data?.[0]);

}

async function actualizarModulo(campo, valor) {
const { error } = await supabase
.from("empresa_modulos")
.update({
[campo]: valor,
})
.eq("id", modulos.id);

if (!error) {  
  setModulos({  
    ...modulos,  
    [campo]: valor,  
  });  
}

}

if (!modulos) {
return <div>Cargando módulos...</div>;
}

return (
<div style={{ padding: "20px" }}>
<h1>Configuración de Módulos</h1>

{Object.keys(modulos)  
    .filter(  
      (key) =>  
        !["id", "empresa_id", "created_at"].includes(key)  
    )  
    .map((key) => (  
      <div  
        key={key}  
        style={{  
          display: "flex",  
          gap: "10px",  
          marginBottom: "10px",  
          alignItems: "center",  
        }}  
      >  
        <label

style={{
width: "220px",
textTransform: "capitalize",
fontWeight: "600",
}}

> 

{key.replaceAll("_", " ")}
</label>

<input  
          type="checkbox"  
          checked={modulos[key]}  
          onChange={(e) =>  
            actualizarModulo(  
              key,  
              e.target.checked  
            )  
          }  
        />  
      </div>  
    ))}  
</div>

);
}
