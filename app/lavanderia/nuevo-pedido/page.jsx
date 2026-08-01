"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const SERVICIOS = [
  "Lavado",
  "Lavado y secado",
  "Lavado y planchado",
  "Planchado",
  "Servicio express",
  "Otro",
];

const TIPOS_PRENDA = [
  "Camisa",
  "Pantalón",
  "Vestido",
  "Falda",
  "Suéter",
  "Sábana",
  "Toalla",
  "Edredón",
  "Cortina",
  "Otro",
];

const METODOS_PAGO = [
  "Efectivo",
  "Yappy",
  "Transferencia",
  "Tarjeta",
  "Otro",
];

function nuevaPrenda() {
  return {
    idTemporal: crypto.randomUUID(),
    tipo: "",
    servicio: "",
    cantidad: 1,
    precioUnitario: "",
    observacion: "",
  };
}

function convertirNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

export default function NuevoPedidoLavanderia() {
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");

  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [resultadosClientes, setResultadosClientes] = useState([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  const [prendas, setPrendas] = useState([nuevaPrenda()]);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [prioridad, setPrioridad] = useState("Normal");
  const [observaciones, setObservaciones] = useState("");

  const [estadoPago, setEstadoPago] = useState("Pendiente");
  const [montoPagado, setMontoPagado] = useState("");
  const [metodoPago, setMetodoPago] = useState("");

  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const empresa = localStorage.getItem("empresaId");
    const usuario = localStorage.getItem("usuarioId");

    if (!empresa || !usuario) {
      alert("La sesión no es válida.");
      router.replace("/login");
      return;
    }

    setEmpresaId(empresa);
    setUsuarioId(usuario);
  }, [router]);

  const subtotal = useMemo(() => {
    return prendas.reduce((acumulado, prenda) => {
      return (
        acumulado +
        convertirNumero(prenda.cantidad) *
          convertirNumero(prenda.precioUnitario)
      );
    }, 0);
  }, [prendas]);

  const total = subtotal;

  const pagado =
    estadoPago === "Pagado"
      ? total
      : Math.min(convertirNumero(montoPagado), total);

  const saldoPendiente = Math.max(total - pagado, 0);

  async function buscarClientes(valor) {
    setBusquedaCliente(valor);

    if (!empresaId || valor.trim().length < 2) {
      setResultadosClientes([]);
      return;
    }

    setBuscandoCliente(true);

    const texto = valor.trim();

    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, telefono, direccion")
      .eq("empresa_id", empresaId)
      .or(`nombre.ilike.%${texto}%,telefono.ilike.%${texto}%`)
      .limit(8);

    setBuscandoCliente(false);

    if (error) {
      console.error("Error buscando clientes:", error);
      return;
    }

    setResultadosClientes(data || []);
  }

  function seleccionarCliente(cliente) {
    setClienteId(cliente.id);
    setNombreCliente(cliente.nombre || "");
    setTelefonoCliente(cliente.telefono || "");
    setDireccionCliente(cliente.direccion || "");
    setBusquedaCliente(cliente.nombre || cliente.telefono || "");
    setResultadosClientes([]);
  }

  function limpiarCliente() {
    setClienteId("");
    setBusquedaCliente("");
    setNombreCliente("");
    setTelefonoCliente("");
    setDireccionCliente("");
    setResultadosClientes([]);
  }

  function agregarPrenda() {
    setPrendas((actuales) => [...actuales, nuevaPrenda()]);
  }

  function actualizarPrenda(idTemporal, campo, valor) {
    setPrendas((actuales) =>
      actuales.map((prenda) =>
        prenda.idTemporal === idTemporal
          ? { ...prenda, [campo]: valor }
          : prenda
      )
    );
  }

  function eliminarPrenda(idTemporal) {
    setPrendas((actuales) => {
      if (actuales.length === 1) {
        return actuales;
      }

      return actuales.filter(
        (prenda) => prenda.idTemporal !== idTemporal
      );
    });
  }

  async function obtenerOCrearCliente() {
    if (clienteId) {
      return clienteId;
    }

    const nombreLimpio = nombreCliente.trim();
    const telefonoLimpio = telefonoCliente.trim();

    if (!nombreLimpio || !telefonoLimpio) {
      throw new Error(
        "Debe ingresar el nombre y teléfono del cliente."
      );
    }

    const { data: clienteExistente } = await supabase
      .from("clientes")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("telefono", telefonoLimpio)
      .maybeSingle();

    if (clienteExistente?.id) {
      return clienteExistente.id;
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert([
        {
          empresa_id: empresaId,
          nombre: nombreLimpio,
          telefono: telefonoLimpio,
          direccion: direccionCliente.trim() || null,
          estado: "Activo",
        },
      ])
      .select("id")
      .single();

    if (error) {
      throw new Error(
        "No se pudo registrar el cliente: " + error.message
      );
    }

    return data.id;
  }

  function validarFormulario() {
    if (!nombreCliente.trim()) {
      alert("Ingrese el nombre del cliente.");
      return false;
    }

    if (!telefonoCliente.trim()) {
      alert("Ingrese el teléfono del cliente.");
      return false;
    }

    if (!fechaEntrega) {
      alert("Seleccione la fecha de entrega.");
      return false;
    }

    const prendasValidas = prendas.every(
      (prenda) =>
        prenda.tipo &&
        prenda.servicio &&
        convertirNumero(prenda.cantidad) > 0 &&
        convertirNumero(prenda.precioUnitario) >= 0
    );

    if (!prendasValidas) {
      alert(
        "Complete el tipo, servicio, cantidad y precio de todas las prendas."
      );
      return false;
    }

    if (total <= 0) {
      alert("El total del pedido debe ser mayor que cero.");
      return false;
    }

    if (
      estadoPago !== "Pendiente" &&
      !metodoPago
    ) {
      alert("Seleccione el método de pago.");
      return false;
    }

    return true;
  }

  async function guardarPedido(evento) {
    evento.preventDefault();

    if (guardando || !validarFormulario()) {
      return;
    }

    setGuardando(true);

    try {
      const clienteFinalId = await obtenerOCrearCliente();

      const numeroPedido = `LAV-${Date.now()}`;

      const { data: pedido, error: errorPedido } =
        await supabase
          .from("lavanderia_pedidos")
          .insert([
            {
              empresa_id: empresaId,
              cliente_id: clienteFinalId,
              numero_pedido: numeroPedido,
              fecha_recepcion: new Date().toISOString(),
              fecha_entrega: fechaEntrega,
              prioridad,
              estado_pedido: "Recibido",
              estado_pago: estadoPago,
              subtotal,
              descuento: 0,
              total,
              monto_pagado: pagado,
              saldo_pendiente: saldoPendiente,
              metodo_pago:
                estadoPago === "Pendiente"
                  ? null
                  : metodoPago,
              observaciones: observaciones.trim() || null,
              creado_por: usuarioId,
            },
          ])
          .select("id, numero_pedido")
          .single();

      if (errorPedido) {
        throw new Error(
          "No se pudo guardar el pedido: " +
            errorPedido.message
        );
      }

      const detalles = prendas.map((prenda) => ({
        empresa_id: empresaId,
        pedido_id: pedido.id,
        tipo_prenda: prenda.tipo,
        servicio: prenda.servicio,
        cantidad: convertirNumero(prenda.cantidad),
        precio_unitario: convertirNumero(
          prenda.precioUnitario
        ),
        subtotal:
          convertirNumero(prenda.cantidad) *
          convertirNumero(prenda.precioUnitario),
        observacion: prenda.observacion.trim() || null,
      }));

      const { error: errorDetalles } = await supabase
        .from("lavanderia_pedido_detalles")
        .insert(detalles);

      if (errorDetalles) {
        await supabase
          .from("lavanderia_pedidos")
          .delete()
          .eq("id", pedido.id);

        throw new Error(
          "No se pudieron guardar las prendas: " +
            errorDetalles.message
        );
      }

      if (pagado > 0) {
        const { error: errorCaja } = await supabase
          .from("caja_movimientos")
          .insert([
            {
              empresa_id: empresaId,
              tipo: "Ingreso",
              concepto: `Pago pedido ${pedido.numero_pedido}`,
              monto: pagado,
              metodo_pago: metodoPago,
              referencia: pedido.numero_pedido,
              fecha: new Date().toISOString(),
              usuario_id: usuarioId,
            },
          ]);

        if (errorCaja) {
          console.error(
            "El pedido se guardó, pero falló caja:",
            errorCaja
          );
        }
      }

      alert(
        `Pedido ${pedido.numero_pedido} creado correctamente.`
      );

      router.push("/lavanderia/pedidos");
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo guardar el pedido.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="pagina">
      <header className="encabezado">
        <button
          type="button"
          className="volver"
          onClick={() => router.push("/dashboard")}
        >
          ←
        </button>

        <div>
          <span className="etiqueta">KONAX LAVANDERÍA</span>
          <h1>Nuevo pedido</h1>
        </div>
      </header>

      <form onSubmit={guardarPedido} className="formulario">
        <section className="tarjeta">
          <div className="titulo-seccion">
            <span className="numero">1</span>
            <div>
              <h2>Cliente</h2>
              <p>Busca un cliente o registra uno nuevo.</p>
            </div>
          </div>

          <label>Buscar por nombre o teléfono</label>

          <input
            type="text"
            value={busquedaCliente}
            onChange={(e) => buscarClientes(e.target.value)}
            placeholder="Ej. María o 6000-0000"
          />

          {buscandoCliente && (
            <span className="ayuda">Buscando...</span>
          )}

          {resultadosClientes.length > 0 && (
            <div className="resultados">
              {resultadosClientes.map((cliente) => (
                <button
                  key={cliente.id}
                  type="button"
                  onClick={() => seleccionarCliente(cliente)}
                  className="resultado"
                >
                  <strong>{cliente.nombre}</strong>
                  <span>{cliente.telefono}</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid">
            <div>
              <label>Nombre completo</label>
              <input
                value={nombreCliente}
                onChange={(e) =>
                  setNombreCliente(e.target.value)
                }
                placeholder="Nombre del cliente"
              />
            </div>

            <div>
              <label>Teléfono</label>
              <input
                value={telefonoCliente}
                onChange={(e) =>
                  setTelefonoCliente(e.target.value)
                }
                placeholder="Número de teléfono"
              />
            </div>
          </div>

          <label>Dirección, opcional</label>
          <input
            value={direccionCliente}
            onChange={(e) =>
              setDireccionCliente(e.target.value)
            }
            placeholder="Dirección del cliente"
          />

          {clienteId && (
            <button
              type="button"
              onClick={limpiarCliente}
              className="boton-secundario"
            >
              Cambiar cliente
            </button>
          )}
        </section>

        <section className="tarjeta">
          <div className="titulo-seccion">
            <span className="numero">2</span>
            <div>
              <h2>Prendas y servicios</h2>
              <p>Agrega lo que recibiste.</p>
            </div>
          </div>

          {prendas.map((prenda, indice) => (
            <div
              key={prenda.idTemporal}
              className="prenda"
            >
              <div className="prenda-cabecera">
                <strong>Artículo {indice + 1}</strong>

                {prendas.length > 1 && (
                  <button
                    type="button"
                    className="eliminar"
                    onClick={() =>
                      eliminarPrenda(prenda.idTemporal)
                    }
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <div className="grid">
                <div>
                  <label>Tipo de prenda</label>
                  <select
                    value={prenda.tipo}
                    onChange={(e) =>
                      actualizarPrenda(
                        prenda.idTemporal,
                        "tipo",
                        e.target.value
                      )
                    }
                  >
                    <option value="">Seleccionar</option>

                    {TIPOS_PRENDA.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Servicio</label>
                  <select
                    value={prenda.servicio}
                    onChange={(e) =>
                      actualizarPrenda(
                        prenda.idTemporal,
                        "servicio",
                        e.target.value
                      )
                    }
                  >
                    <option value="">Seleccionar</option>

                    {SERVICIOS.map((servicio) => (
                      <option
                        key={servicio}
                        value={servicio}
                      >
                        {servicio}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={prenda.cantidad}
                    onChange={(e) =>
                      actualizarPrenda(
                        prenda.idTemporal,
                        "cantidad",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label>Precio unitario</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prenda.precioUnitario}
                    onChange={(e) =>
                      actualizarPrenda(
                        prenda.idTemporal,
                        "precioUnitario",
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <label>Observación de la prenda</label>
              <input
                value={prenda.observacion}
                onChange={(e) =>
                  actualizarPrenda(
                    prenda.idTemporal,
                    "observacion",
                    e.target.value
                  )
                }
                placeholder="Ej. Mancha en la manga"
              />

              <div className="subtotal-prenda">
                Subtotal:{" "}
                <strong>
                  B/.{" "}
                  {(
                    convertirNumero(prenda.cantidad) *
                    convertirNumero(
                      prenda.precioUnitario
                    )
                  ).toFixed(2)}
                </strong>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={agregarPrenda}
            className="boton-agregar"
          >
            + Agregar otra prenda
          </button>
        </section>

        <section className="tarjeta">
          <div className="titulo-seccion">
            <span className="numero">3</span>
            <div>
              <h2>Entrega</h2>
              <p>Define la fecha y prioridad.</p>
            </div>
          </div>

          <div className="grid">
            <div>
              <label>Fecha estimada de entrega</label>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) =>
                  setFechaEntrega(e.target.value)
                }
              />
            </div>

            <div>
              <label>Prioridad</label>
              <select
                value={prioridad}
                onChange={(e) =>
                  setPrioridad(e.target.value)
                }
              >
                <option value="Normal">Normal</option>
                <option value="Express">Express</option>
              </select>
            </div>
          </div>

          <label>Observaciones generales</label>
          <textarea
            value={observaciones}
            onChange={(e) =>
              setObservaciones(e.target.value)
            }
            placeholder="Instrucciones generales del pedido"
            rows={3}
          />
        </section>

        <section className="tarjeta">
          <div className="titulo-seccion">
            <span className="numero">4</span>
            <div>
              <h2>Pago</h2>
              <p>Registra cómo queda el pedido.</p>
            </div>
          </div>

          <div className="opciones-pago">
            {["Pagado", "Abono", "Pendiente"].map(
              (opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => {
                    setEstadoPago(opcion);

                    if (opcion === "Pagado") {
                      setMontoPagado(
                        total.toFixed(2)
                      );
                    }

                    if (opcion === "Pendiente") {
                      setMontoPagado("");
                      setMetodoPago("");
                    }
                  }}
                  className={
                    estadoPago === opcion
                      ? "opcion activa"
                      : "opcion"
                  }
                >
                  {opcion}
                </button>
              )
            )}
          </div>

          {estadoPago === "Abono" && (
            <div>
              <label>Monto abonado</label>
              <input
                type="number"
                min="0"
                max={total}
                step="0.01"
                value={montoPagado}
                onChange={(e) =>
                  setMontoPagado(e.target.value)
                }
                placeholder="0.00"
              />
            </div>
          )}

          {estadoPago !== "Pendiente" && (
            <div>
              <label>Método de pago</label>
              <select
                value={metodoPago}
                onChange={(e) =>
                  setMetodoPago(e.target.value)
                }
              >
                <option value="">
                  Seleccione un método
                </option>

                {METODOS_PAGO.map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {metodo}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="resumen">
            <div>
              <span>Total</span>
              <strong>B/. {total.toFixed(2)}</strong>
            </div>

            <div>
              <span>Pagado</span>
              <strong>B/. {pagado.toFixed(2)}</strong>
            </div>

            <div>
              <span>Saldo pendiente</span>
              <strong>
                B/. {saldoPendiente.toFixed(2)}
              </strong>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={guardando}
          className="guardar"
        >
          {guardando
            ? "Guardando pedido..."
            : "Guardar pedido"}
        </button>
      </form>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .pagina {
          min-height: 100vh;
          padding: 18px 14px 40px;
          background: #f2f6f3;
          color: #142019;
          font-family: Inter, Arial, sans-serif;
        }

        .encabezado {
          width: min(760px, 100%);
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .encabezado h1 {
          margin: 3px 0 0;
          font-size: 27px;
        }

        .etiqueta {
          color: #16834f;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.1px;
        }

        .volver {
          width: 44px;
          height: 44px;
          border: 1px solid #dce6df;
          border-radius: 12px;
          background: white;
          font-size: 22px;
          cursor: pointer;
        }

        .formulario {
          width: min(760px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .tarjeta {
          padding: 18px;
          border: 1px solid #dde7e0;
          border-radius: 17px;
          background: white;
          box-shadow: 0 8px 22px rgba(21, 45, 31, 0.05);
        }

        .titulo-seccion {
          margin-bottom: 17px;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .titulo-seccion h2 {
          margin: 0;
          font-size: 18px;
        }

        .titulo-seccion p {
          margin: 3px 0 0;
          color: #718078;
          font-size: 12px;
        }

        .numero {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #173c2a;
          color: white;
          font-weight: 900;
        }

        label {
          display: block;
          margin: 12px 0 6px;
          font-size: 13px;
          font-weight: 800;
        }

        input,
        select,
        textarea {
          width: 100%;
          min-height: 47px;
          padding: 11px 12px;
          border: 1px solid #d5dfd8;
          border-radius: 10px;
          background: white;
          color: #142019;
          font-size: 16px;
          outline: none;
        }

        textarea {
          resize: vertical;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #16834f;
          box-shadow: 0 0 0 3px rgba(22, 131, 79, 0.1);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 12px;
        }

        .resultados {
          margin-top: 5px;
          display: grid;
          gap: 4px;
          padding: 6px;
          border: 1px solid #dce6df;
          border-radius: 10px;
          background: white;
        }

        .resultado {
          padding: 10px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border: 0;
          border-radius: 8px;
          background: #f3f8f5;
          text-align: left;
          cursor: pointer;
        }

        .resultado span,
        .ayuda {
          color: #748078;
          font-size: 12px;
        }

        .prenda {
          margin-bottom: 13px;
          padding: 14px;
          border: 1px solid #dce6df;
          border-radius: 13px;
          background: #f8faf9;
        }

        .prenda-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .eliminar {
          border: 0;
          background: transparent;
          color: #b42318;
          font-weight: 800;
          cursor: pointer;
        }

        .subtotal-prenda {
          margin-top: 12px;
          text-align: right;
          font-size: 13px;
        }

        .boton-agregar,
        .boton-secundario {
          width: 100%;
          margin-top: 12px;
          padding: 12px;
          border: 1px solid #a9cfb8;
          border-radius: 10px;
          background: #edf8f1;
          color: #14683e;
          font-weight: 850;
          cursor: pointer;
        }

        .opciones-pago {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
        }

        .opcion {
          min-height: 43px;
          border: 1px solid #d5dfd8;
          border-radius: 10px;
          background: white;
          font-weight: 800;
          cursor: pointer;
        }

        .opcion.activa {
          border-color: #16834f;
          background: #16834f;
          color: white;
        }

        .resumen {
          margin-top: 16px;
          padding: 14px;
          display: grid;
          gap: 10px;
          border-radius: 12px;
          background: #10291d;
          color: white;
        }

        .resumen div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .resumen span {
          color: #b9d8c5;
          font-size: 13px;
        }

        .guardar {
          min-height: 55px;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #117a46,
            #1aa55f
          );
          color: white;
          font-size: 17px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 13px 28px
            rgba(17, 122, 70, 0.22);
        }

        .guardar:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .pagina {
            padding: 12px 10px 30px;
          }

          .tarjeta {
            padding: 15px 13px;
          }

          .grid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .opciones-pago {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
