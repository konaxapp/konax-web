"use client";

import { useState } from "react";

export default function Cartera() {
  const [buscar, setBuscar] = useState("");
  const [filtroGestor, setFiltroGestor] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroAtraso, setFiltroAtraso] = useState("Todos");
  const [filtroProximoPago, setFiltroProximoPago] = useState("");
  const [filtroPromesaPago, setFiltroPromesaPago] = useState("");
  const [ultimaEjecucionRecargos, setUltimaEjecucionRecargos] = useState("");

  const [clientes, setClientes] = useState([
    {
      cliente: "Juan Pérez",
      cedula: "8-123-456",
      telefono: "6000-0000",
      saldo: 1500,
      cuota: 125,
      recargoValor: 0,
      recargoAplicado: "",
      ultimoPago: "2026-06-01",
      proximoPago: "2026-06-15",
      promesaPago: "",
      diasAtraso: 0,
      estado: "Al Día",
      semaforo: "🟢",
      gestor: "Gestor 1",
    },
    {
      cliente: "María Díaz",
      cedula: "8-456-789",
      telefono: "6999-9999",
      saldo: 800,
      cuota: 100,
      recargoValor: 25,
      recargoAplicado: "",
      ultimoPago: "2026-05-15",
      proximoPago: "2026-05-30",
      promesaPago: "2026-06-10",
      diasAtraso: 18,
      estado: "Pendiente",
      semaforo: "🟡",
      gestor: "Gestor 2",
    },
    {
      cliente: "Pedro Gómez",
      cedula: "8-777-111",
      telefono: "6555-1111",
      saldo: 3200,
      cuota: 150,
      recargoValor: 50,
      recargoAplicado: "",
      ultimoPago: "2026-04-01",
      proximoPago: "2026-04-15",
      promesaPago: "2026-06-12",
      diasAtraso: 55,
      estado: "Mora",
      semaforo: "🟠",
      gestor: "Gestor 1",
    },
    {
      cliente: "Ana López",
      cedula: "8-999-222",
      telefono: "6888-2222",
      saldo: 5500,
      cuota: 200,
      recargoValor: 75,
      recargoAplicado: "",
      ultimoPago: "2026-02-01",
      proximoPago: "2026-02-15",
      promesaPago: "",
      diasAtraso: 120,
      estado: "Crítico",
      semaforo: "🔴",
      gestor: "Gestor 3",
    },
  ]);

  const mesActual = new Date().toISOString().slice(0, 7);

  const aplicarRecargosDelMes = () => {
    let recargosAplicados = 0;

    const carteraActualizada = clientes.map((cliente) => {
      const yaAplicadoEsteMes =
        cliente.recargoAplicado &&
        cliente.recargoAplicado.slice(0, 7) === mesActual;

      if (cliente.recargoValor > 0 && !yaAplicadoEsteMes) {
        recargosAplicados++;

        return {
          ...cliente,
          saldo: cliente.saldo + cliente.recargoValor,
          recargoAplicado: new Date().toISOString().slice(0, 10),
        };
      }

      return cliente;
    });

    setClientes(carteraActualizada);
    setUltimaEjecucionRecargos(new Date().toLocaleDateString("es-PA"));

    if (recargosAplicados > 0) {
      alert("Recargos aplicados correctamente.");
    } else {
      alert("No hay recargos pendientes este mes.");
    }
  };

  const cumpleRangoAtraso = (dias) => {
    if (filtroAtraso === "Todos") return true;
    if (filtroAtraso === "0-29") return dias >= 0 && dias <= 29;
    if (filtroAtraso === "30-59") return dias >= 30 && dias <= 59;
    if (filtroAtraso === "60-89") return dias >= 60 && dias <= 89;
    if (filtroAtraso === "90+") return dias >= 90;
    return true;
  };

  const clientesFiltrados = clientes.filter((item) => {
    const texto = buscar.toLowerCase();

    const coincideBusqueda =
      item.cliente.toLowerCase().includes(texto) ||
      item.cedula.toLowerCase().includes(texto) ||
      item.telefono.toLowerCase().includes(texto);

    const coincideGestor =
      filtroGestor === "Todos" || item.gestor === filtroGestor;

    const coincideEstado =
      filtroEstado === "Todos" || item.estado === filtroEstado;

    const coincideAtraso = cumpleRangoAtraso(item.diasAtraso);

    const coincideProximoPago =
      !filtroProximoPago || item.proximoPago === filtroProximoPago;

    const coincidePromesaPago =
      !filtroPromesaPago || item.promesaPago === filtroPromesaPago;

    return (
      coincideBusqueda &&
      coincideGestor &&
      coincideEstado &&
      coincideAtraso &&
      coincideProximoPago &&
      coincidePromesaPago
    );
  });

  const verCliente = (cedula) => {
    alert("Aquí abrirá Vista Cliente para la cédula: " + cedula);
  };

  const registrarPromesa = () => {
    alert("Aquí se registrará una promesa de pago.");
  };

  const enviarWhatsApp = () => {
    alert("Aquí se abrirá WhatsApp para contactar al cliente.");
  };

  const imprimirCartera = () => {
    window.print();
  };

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={logoBox}>
          <img src="/konax-logo.png" alt="KONAX" style={logo} />
        </div>

        <h1 style={titulo}>Cartera</h1>

        <p style={subtitulo}>
          Gestión de clientes, saldos, atrasos y seguimiento de cobranza.
        </p>

        <div style={card}>
          <h2 style={tituloSeccion}>Recargos del mes</h2>

          <p style={texto}>
            Última ejecución:{" "}
            {ultimaEjecucionRecargos || "No ejecutado este mes"}
          </p>

          <button style={boton} onClick={aplicarRecargosDelMes}>
            Aplicar recargos del mes
          </button>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Filtros de cartera</h2>

          <div style={grid}>
            <input
              placeholder="Buscar por nombre, cédula o teléfono..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              style={inputStyle}
            />

            <select
              value={filtroGestor}
              onChange={(e) => setFiltroGestor(e.target.value)}
              style={inputStyle}
            >
              <option>Todos</option>
              <option>Gestor 1</option>
              <option>Gestor 2</option>
              <option>Gestor 3</option>
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={inputStyle}
            >
              <option>Todos</option>
              <option>Al Día</option>
              <option>Pendiente</option>
              <option>Mora</option>
              <option>Crítico</option>
              <option>Legal</option>
            </select>

            <select
              value={filtroAtraso}
              onChange={(e) => setFiltroAtraso(e.target.value)}
              style={inputStyle}
            >
              <option>Todos</option>
              <option>0-29</option>
              <option>30-59</option>
              <option>60-89</option>
              <option>90+</option>
            </select>

            <div>
              <label style={label}>Fecha próximo pago</label>
              <input
                type="date"
                value={filtroProximoPago}
                onChange={(e) => setFiltroProximoPago(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={label}>Fecha promesa de pago</label>
              <input
                type="date"
                value={filtroPromesaPago}
                onChange={(e) => setFiltroPromesaPago(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={acciones}>
            <button style={botonSecundario} onClick={imprimirCartera}>
              Imprimir cartera filtrada
            </button>
          </div>
        </div>

        <div style={card}>
          <h2 style={tituloSeccion}>Clientes en cartera</h2>

          <div style={{ overflowX: "auto" }}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Estado</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Teléfono</th>
                  <th style={th}>Saldo</th>
                  <th style={th}>Cuota</th>
                  <th style={th}>Recargo</th>
                  <th style={th}>Último pago</th>
                  <th style={th}>Próximo pago</th>
                  <th style={th}>Promesa</th>
                  <th style={th}>Días atraso</th>
                  <th style={th}>Gestor</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map((item, index) => (
                  <tr key={index}>
                    <td style={td}>
                      {item.semaforo} {item.estado}
                    </td>

                    <td style={td}>{item.cliente}</td>
                    <td style={td}>{item.cedula}</td>
                    <td style={td}>{item.telefono}</td>
                    <td style={td}>${item.saldo.toLocaleString()}</td>
                    <td style={td}>${item.cuota.toLocaleString()}</td>
                    <td style={td}>${item.recargoValor.toLocaleString()}</td>
                    <td style={td}>{item.ultimoPago}</td>
                    <td style={td}>{item.proximoPago}</td>
                    <td style={td}>{item.promesaPago || "Sin promesa"}</td>
                    <td style={td}>{item.diasAtraso}</td>
                    <td style={td}>{item.gestor}</td>

                    <td style={td}>
                      <button
                        style={accionBtn}
                        onClick={() => verCliente(item.cedula)}
                      >
                        Ver Cliente
                      </button>

                      <button style={accionBtn} onClick={registrarPromesa}>
                        Promesa
                      </button>

                      <button style={accionBtn} onClick={enviarWhatsApp}>
                        WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}

                {clientesFiltrados.length === 0 && (
                  <tr>
                    <td style={td} colSpan="13">
                      No se encontraron clientes con los filtros seleccionados.
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

const pagina = {
  minHeight: "100vh",
  background: "#f3f4f6",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1400px",
  margin: "0 auto",
};

const logoBox = {
  textAlign: "center",
  marginBottom: "25px",
};

const logo = {
  width: "260px",
  maxWidth: "100%",
  height: "auto",
};

const titulo = {
  fontSize: "40px",
  marginBottom: "10px",
  color: "#111827",
};

const subtitulo = {
  color: "#6b7280",
  fontSize: "18px",
  marginBottom: "30px",
};

const card = {
  background: "#ffffff",
  padding: "25px",
  borderRadius: "16px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
};

const tituloSeccion = {
  marginBottom: "20px",
  color: "#111827",
};

const texto = {
  color: "#4b5563",
  marginBottom: "15px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
  gap: "15px",
};

const label = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  color: "#374151",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const acciones = {
  marginTop: "20px",
  display: "flex",
  gap: "15px",
  flexWrap: "wrap",
};

const boton = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "14px 28px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const botonSecundario = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const tabla = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  textAlign: "left",
  padding: "15px",
  borderBottom: "1px solid #e5e7eb",
  background: "#111827",
  color: "#ffffff",
  whiteSpace: "nowrap",
};

const td = {
  padding: "15px",
  borderBottom: "1px solid #f3f4f6",
  whiteSpace: "nowrap",
};

const accionBtn = {
  padding: "8px 12px",
  marginRight: "8px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
};
