"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

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

const SERVICIOS = [
  "Lavado",
  "Lavado y secado",
  "Lavado y planchado",
  "Planchado",
  "Servicio express",
  "Otro",
];

const METODOS_PAGO = [
  "Efectivo",
  "Yappy",
  "Transferencia",
  "Tarjeta",
  "Otro",
];

function crearIdTemporal() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function nuevaPrenda() {
  return {
    idTemporal: crearIdTemporal(),
    tipo: "",
    servicio: "",
    cantidad: 1,
    precioUnitario: "",
    precioCentavos: "",
    observacion: "",
  };
}

function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function mostrarMontoDesdeCentavos(digitos) {
  const limpio = String(digitos || "").replace(/\D/g, "");

  if (!limpio) return "";

  return (Number(limpio) / 100).toFixed(2);
}

function leerEntradaCentavos(digitosActuales, evento) {
  const inputType = evento?.nativeEvent?.inputType || "";
  const dato = evento?.nativeEvent?.data;

  if (inputType.startsWith("delete")) {
    return String(digitosActuales || "").slice(0, -1);
  }

  if (dato && /\d/.test(dato)) {
    return (
      String(digitosActuales || "") +
      String(dato).replace(/\D/g, "")
    )
      .replace(/^0+(?=\d)/, "")
      .slice(0, 10);
  }

  const valorPegado = String(evento?.target?.value || "")
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 10);

  return valorPegado;
}


function limpiarTextoBusqueda(valor) {
  return String(valor || "")
    .replace(/[%(),]/g, " ")
    .trim();
}

function formatoDinero(valor) {
  return `B/. ${numeroSeguro(valor).toFixed(2)}`;
}

function formatoFecha(fechaTexto) {
  if (!fechaTexto) return "-";

  const [anio, mes, dia] = String(fechaTexto)
    .slice(0, 10)
    .split("-");

  return anio && mes && dia
    ? `${dia}/${mes}/${anio}`
    : fechaTexto;
}

function telefonoWhatsApp(telefono) {
  let digitos = String(telefono || "")
    .replace(/\D/g, "");

  if (!digitos) return "";

  if (digitos.startsWith("00")) {
    digitos = digitos.slice(2);
  }

  if (digitos.startsWith("507")) {
    return digitos;
  }

  if (digitos.length === 8) {
    return `507${digitos}`;
  }

  return digitos;
}

export default function NuevoPedidoLavanderia() {
  const router = useRouter();

  const [empresaId, setEmpresaId] =
    useState("");
  const [empresaNombre, setEmpresaNombre] =
    useState("");
  const [usuarioId, setUsuarioId] =
    useState("");

  const [busquedaCliente, setBusquedaCliente] =
    useState("");
  const [clienteId, setClienteId] =
    useState("");
  const [nombreCliente, setNombreCliente] =
    useState("");
  const [telefonoCliente, setTelefonoCliente] =
    useState("");
  const [direccionCliente, setDireccionCliente] =
    useState("");
  const [
    resultadosClientes,
    setResultadosClientes,
  ] = useState([]);
  const [buscandoCliente, setBuscandoCliente] =
    useState(false);

  const [prendas, setPrendas] = useState([
    nuevaPrenda(),
  ]);
  const [fechaEntrega, setFechaEntrega] =
    useState("");
  const [prioridad, setPrioridad] =
    useState("Normal");
  const [observaciones, setObservaciones] =
    useState("");

  const [estadoPago, setEstadoPago] =
    useState("Pendiente");
  const [montoPagado, setMontoPagado] =
    useState("");
  const [montoPagadoCentavos, setMontoPagadoCentavos] =
    useState("");
  const [metodoPago, setMetodoPago] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);
  const [comprobante, setComprobante] =
    useState(null);

  useEffect(() => {
    const empresa =
      localStorage.getItem("empresaId");
    const nombreEmpresa =
      localStorage.getItem("empresaNombre");
    const usuario =
      localStorage.getItem("usuarioId");

    if (!empresa || !usuario) {
      alert(
        "La sesión no es válida. Inicie sesión nuevamente."
      );
      router.replace("/login");
      return;
    }

    setEmpresaId(empresa);
    setEmpresaNombre(
      nombreEmpresa || "KONAX Lavandería"
    );
    setUsuarioId(usuario);
  }, [router]);

  const subtotal = useMemo(() => {
    return prendas.reduce(
      (acumulado, prenda) =>
        acumulado +
        numeroSeguro(prenda.cantidad) *
          numeroSeguro(
            prenda.precioUnitario
          ),
      0
    );
  }, [prendas]);

  const total = subtotal;

  const pagado =
    estadoPago === "Pagado"
      ? total
      : estadoPago === "Abono"
      ? Math.min(
          numeroSeguro(montoPagado),
          total
        )
      : 0;

  const saldoPendiente = Math.max(
    total - pagado,
    0
  );

  async function buscarClientes(valor) {
    setBusquedaCliente(valor);

    const texto =
      limpiarTextoBusqueda(valor);

    if (!empresaId || texto.length < 2) {
      setResultadosClientes([]);
      return;
    }

    setBuscandoCliente(true);

    const { data, error } = await supabase
      .from("clientes")
      .select(
        "id, nombre, telefono, direccion"
      )
      .eq("empresa_id", empresaId)
      .or(
        `nombre.ilike.%${texto}%,telefono.ilike.%${texto}%`
      )
      .limit(8);

    setBuscandoCliente(false);

    if (error) {
      console.error(
        "Error buscando clientes:",
        error
      );
      return;
    }

    setResultadosClientes(data || []);
  }

  function seleccionarCliente(cliente) {
    setClienteId(cliente.id);
    setNombreCliente(cliente.nombre || "");
    setTelefonoCliente(
      cliente.telefono || ""
    );
    setDireccionCliente(
      cliente.direccion || ""
    );
    setBusquedaCliente(
      cliente.nombre ||
        cliente.telefono ||
        ""
    );
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
    setPrendas((actuales) => [
      ...actuales,
      nuevaPrenda(),
    ]);
  }

  function actualizarPrenda(
    idTemporal,
    campo,
    valor
  ) {
    setPrendas((actuales) =>
      actuales.map((prenda) =>
        prenda.idTemporal === idTemporal
          ? {
              ...prenda,
              [campo]: valor,
            }
          : prenda
      )
    );
  }

  function actualizarPrecioPrenda(idTemporal, evento) {
    setPrendas((actuales) =>
      actuales.map((prenda) => {
        if (prenda.idTemporal !== idTemporal) {
          return prenda;
        }

        const nuevosCentavos = leerEntradaCentavos(
          prenda.precioCentavos,
          evento
        );

        return {
          ...prenda,
          precioCentavos: nuevosCentavos,
          precioUnitario: nuevosCentavos
            ? Number(nuevosCentavos) / 100
            : "",
        };
      })
    );
  }

  function eliminarPrenda(idTemporal) {
    setPrendas((actuales) =>
      actuales.length === 1
        ? actuales
        : actuales.filter(
            (prenda) =>
              prenda.idTemporal !==
              idTemporal
          )
    );
  }

  async function obtenerOCrearCliente() {
    if (clienteId) return clienteId;

    const nombreLimpio =
      nombreCliente.trim();
    const telefonoLimpio =
      telefonoCliente.trim();

    if (
      !nombreLimpio ||
      !telefonoLimpio
    ) {
      throw new Error(
        "Debe ingresar el nombre y teléfono del cliente."
      );
    }

    const {
      data: clienteExistente,
      error: errorBusqueda,
    } = await supabase
      .from("clientes")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("telefono", telefonoLimpio)
      .maybeSingle();

    if (errorBusqueda) {
      throw new Error(
        "No se pudo validar el cliente: " +
          errorBusqueda.message
      );
    }

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
          direccion:
            direccionCliente.trim() ||
            null,
          estado: "Activo",
          modalidad: "Lavandería",
          observacion:
            "Cliente registrado desde Nuevo pedido",
        },
      ])
      .select("id")
      .single();

    if (error) {
      throw new Error(
        "No se pudo registrar el cliente: " +
          error.message
      );
    }

    return data.id;
  }

  function validarFormulario() {
    if (!nombreCliente.trim()) {
      alert(
        "Ingrese el nombre del cliente."
      );
      return false;
    }

    if (!telefonoCliente.trim()) {
      alert(
        "Ingrese el teléfono del cliente."
      );
      return false;
    }

    if (!fechaEntrega) {
      alert(
        "Seleccione la fecha de entrega."
      );
      return false;
    }

    const prendasValidas =
      prendas.every(
        (prenda) =>
          prenda.tipo &&
          prenda.servicio &&
          numeroSeguro(
            prenda.cantidad
          ) > 0 &&
          numeroSeguro(
            prenda.precioUnitario
          ) > 0
      );

    if (!prendasValidas) {
      alert(
        "Complete el tipo, servicio, cantidad y precio de todas las prendas."
      );
      return false;
    }

    if (total <= 0) {
      alert(
        "El total del pedido debe ser mayor que cero."
      );
      return false;
    }

    if (
      estadoPago === "Abono" &&
      (pagado <= 0 || pagado >= total)
    ) {
      alert(
        "El abono debe ser mayor que cero y menor que el total."
      );
      return false;
    }

    if (
      estadoPago !== "Pendiente" &&
      !metodoPago
    ) {
      alert(
        "Seleccione el método de pago."
      );
      return false;
    }

    return true;
  }

  function construirMensajeWhatsApp(
    datos
  ) {
    const detallePrendas = datos.prendas
      .map(
        (prenda) =>
          `• ${prenda.cantidad} ${prenda.tipo} - ${prenda.servicio}`
      )
      .join("\n");

    const pagoTexto =
      datos.estadoPago === "Pendiente"
        ? "Pendiente"
        : `${datos.estadoPago} por ${datos.metodoPago}`;

    return [
      `*${datos.empresaNombre}*`,
      "",
      `Hola ${datos.nombreCliente}, recibimos tu pedido.`,
      "",
      `*Pedido:* ${datos.numeroPedido}`,
      `*Estado:* En proceso`,
      `*Entrega estimada:* ${formatoFecha(
        datos.fechaEntrega
      )}`,
      `*Prioridad:* ${datos.prioridad}`,
      "",
      "*Prendas y servicios:*",
      detallePrendas,
      "",
      `*Total:* ${formatoDinero(
        datos.total
      )}`,
      `*Pagado:* ${formatoDinero(
        datos.pagado
      )}`,
      `*Saldo:* ${formatoDinero(
        datos.saldoPendiente
      )}`,
      `*Pago:* ${pagoTexto}`,
      datos.observaciones
        ? `*Indicaciones:* ${datos.observaciones}`
        : "",
      "",
      "Conserva este mensaje para retirar tu pedido.",
      "Gracias por preferirnos.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function enviarWhatsApp() {
    if (!comprobante) return;

    const telefono = telefonoWhatsApp(
      comprobante.telefonoCliente
    );

    if (!telefono) {
      alert(
        "El cliente no tiene un teléfono válido."
      );
      return;
    }

    const mensaje =
      construirMensajeWhatsApp(
        comprobante
      );

    const url =
      `https://wa.me/${telefono}` +
      `?text=${encodeURIComponent(
        mensaje
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function reiniciarFormulario() {
    setBusquedaCliente("");
    setClienteId("");
    setNombreCliente("");
    setTelefonoCliente("");
    setDireccionCliente("");
    setResultadosClientes([]);

    setPrendas([nuevaPrenda()]);
    setFechaEntrega("");
    setPrioridad("Normal");
    setObservaciones("");

    setEstadoPago("Pendiente");
    setMontoPagado("");
    setMontoPagadoCentavos("");
    setMetodoPago("");

    setComprobante(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function guardarPedido(evento) {
    evento.preventDefault();

    if (
      guardando ||
      !validarFormulario()
    ) {
      return;
    }

    setGuardando(true);

    try {
      const clienteFinalId =
        await obtenerOCrearCliente();

      const numeroPedido =
        `LAV-${Date.now()}`;

      const {
        data: pedido,
        error: errorPedido,
      } = await supabase
        .from("lavanderia_pedidos")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: clienteFinalId,
            numero_pedido: numeroPedido,
            fecha_recepcion:
              new Date().toISOString(),
            fecha_entrega: fechaEntrega,
            prioridad,
            estado_pedido:
              "En proceso",
            estado_pago: estadoPago,
            subtotal,
            descuento: 0,
            total,
            monto_pagado: pagado,
            saldo_pendiente:
              saldoPendiente,
            metodo_pago:
              estadoPago === "Pendiente"
                ? null
                : metodoPago,
            observaciones:
              observaciones.trim() ||
              null,
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

      const detalles = prendas.map(
        (prenda) => ({
          empresa_id: empresaId,
          pedido_id: pedido.id,
          tipo_prenda: prenda.tipo,
          servicio: prenda.servicio,
          cantidad: numeroSeguro(
            prenda.cantidad
          ),
          precio_unitario:
            numeroSeguro(
              prenda.precioUnitario
            ),
          subtotal:
            numeroSeguro(
              prenda.cantidad
            ) *
            numeroSeguro(
              prenda.precioUnitario
            ),
          observacion:
            prenda.observacion.trim() ||
            null,
        })
      );

      const { error: errorDetalles } =
        await supabase
          .from(
            "lavanderia_pedido_detalles"
          )
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

      setComprobante({
        pedidoId: pedido.id,
        numeroPedido:
          pedido.numero_pedido,
        empresaNombre,
        nombreCliente:
          nombreCliente.trim(),
        telefonoCliente:
          telefonoCliente.trim(),
        fechaEntrega,
        prioridad,
        observaciones:
          observaciones.trim(),
        estadoPago,
        metodoPago,
        total,
        pagado,
        saldoPendiente,
        prendas: prendas.map(
          (prenda) => ({
            tipo: prenda.tipo,
            servicio:
              prenda.servicio,
            cantidad:
              numeroSeguro(
                prenda.cantidad
              ),
          })
        ),
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Error guardando pedido:",
        error
      );

      alert(
        error.message ||
          "No se pudo guardar el pedido."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (comprobante) {
    return (
      <main className="pagina">
        <section className="comprobante">
          <div className="check">✓</div>

          <span className="etiqueta">
            PEDIDO GUARDADO
          </span>

          <h1>
            {comprobante.numeroPedido}
          </h1>

          <p className="confirmacion">
            El pedido quedó en{" "}
            <strong>En proceso</strong>.
          </p>

          <div className="comprobante-datos">
            <div>
              <span>Cliente</span>
              <strong>
                {
                  comprobante.nombreCliente
                }
              </strong>
            </div>

            <div>
              <span>Teléfono</span>
              <strong>
                {
                  comprobante.telefonoCliente
                }
              </strong>
            </div>

            <div>
              <span>Entrega</span>
              <strong>
                {formatoFecha(
                  comprobante.fechaEntrega
                )}
              </strong>
            </div>

            <div>
              <span>Total</span>
              <strong>
                {formatoDinero(
                  comprobante.total
                )}
              </strong>
            </div>

            <div>
              <span>Pagado</span>
              <strong>
                {formatoDinero(
                  comprobante.pagado
                )}
              </strong>
            </div>

            <div>
              <span>Saldo</span>
              <strong>
                {formatoDinero(
                  comprobante.saldoPendiente
                )}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="whatsapp"
            onClick={enviarWhatsApp}
          >
            Abrir comprobante en WhatsApp
          </button>

          <div className="acciones-comprobante">
            <button
              type="button"
              className="nuevo"
              onClick={reiniciarFormulario}
            >
              Crear otro pedido
            </button>

            <button
              type="button"
              className="ver-pedidos"
              onClick={() =>
                router.push(
                  "/lavanderia/pedidos"
                )
              }
            >
              Ver pedidos
            </button>
          </div>
        </section>

        <style jsx>{`
          * {
            box-sizing: border-box;
          }

          .pagina {
            min-height: 100vh;
            padding: 18px 12px 36px;
            display: grid;
            place-items: center;
            background: #f2f6f3;
            color: #142019;
            font-family:
              Inter,
              Arial,
              sans-serif;
          }

          .comprobante {
            width: min(620px, 100%);
            padding: 24px 18px;
            border: 1px solid #cfe2d6;
            border-radius: 22px;
            background: white;
            box-shadow:
              0 18px 48px
              rgba(21, 45, 31, 0.1);
            text-align: center;
          }

          .check {
            width: 68px;
            height: 68px;
            margin: 0 auto 14px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: #dcfce7;
            color: #16834f;
            font-size: 36px;
            font-weight: 900;
          }

          .etiqueta {
            color: #16834f;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 1.2px;
          }

          h1 {
            margin: 7px 0 4px;
            font-size: 27px;
            overflow-wrap: anywhere;
          }

          .confirmacion {
            margin: 0 0 18px;
            color: #6d7a72;
          }

          .comprobante-datos {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 9px;
            text-align: left;
          }

          .comprobante-datos div {
            padding: 12px;
            border-radius: 11px;
            background: #f5f8f6;
          }

          .comprobante-datos span {
            display: block;
            color: #718078;
            font-size: 11px;
          }

          .comprobante-datos strong {
            display: block;
            margin-top: 4px;
            overflow-wrap: anywhere;
          }

          .whatsapp {
            width: 100%;
            min-height: 54px;
            margin-top: 17px;
            border: 0;
            border-radius: 13px;
            background: #25d366;
            color: white;
            font-size: 16px;
            font-weight: 900;
            cursor: pointer;
          }

          .acciones-comprobante {
            margin-top: 9px;
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .nuevo,
          .ver-pedidos {
            min-height: 48px;
            padding: 10px;
            border-radius: 11px;
            font-weight: 850;
            cursor: pointer;
          }

          .nuevo {
            border: 1px solid #a9cfb8;
            background: #edf8f1;
            color: #14683e;
          }

          .ver-pedidos {
            border: 0;
            background: #173c2a;
            color: white;
          }

          @media (max-width: 430px) {
            .acciones-comprobante {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="pagina">
      <header className="encabezado">
        <button
          type="button"
          className="volver"
          onClick={() =>
            router.push("/dashboard")
          }
          aria-label="Volver al panel"
        >
          ←
        </button>

        <div>
          <span className="etiqueta">
            KONAX LAVANDERÍA
          </span>
          <h1>Nuevo pedido</h1>
        </div>
      </header>

      <form
        onSubmit={guardarPedido}
        className="formulario"
      >
        <section className="tarjeta">
          <TituloSeccion
            numero="1"
            titulo="Cliente"
            texto="Busca un cliente o registra uno nuevo."
          />

          <label>
            Buscar por nombre o teléfono
          </label>

          <input
            type="text"
            value={busquedaCliente}
            onChange={(e) =>
              buscarClientes(e.target.value)
            }
            placeholder="Ej. María o 6000-0000"
          />

          {buscandoCliente && (
            <span className="ayuda">
              Buscando...
            </span>
          )}

          {resultadosClientes.length >
            0 && (
            <div className="resultados">
              {resultadosClientes.map(
                (cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() =>
                      seleccionarCliente(
                        cliente
                      )
                    }
                    className="resultado"
                  >
                    <strong>
                      {cliente.nombre}
                    </strong>
                    <span>
                      {cliente.telefono}
                    </span>
                  </button>
                )
              )}
            </div>
          )}

          <div className="grid">
            <div>
              <label>
                Nombre completo
              </label>
              <input
                value={nombreCliente}
                onChange={(e) =>
                  setNombreCliente(
                    e.target.value
                  )
                }
                placeholder="Nombre del cliente"
              />
            </div>

            <div>
              <label>Teléfono</label>
              <input
                value={telefonoCliente}
                onChange={(e) =>
                  setTelefonoCliente(
                    e.target.value
                  )
                }
                placeholder="Número de teléfono"
              />
            </div>
          </div>

          <label>
            Dirección, opcional
          </label>

          <input
            value={direccionCliente}
            onChange={(e) =>
              setDireccionCliente(
                e.target.value
              )
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
          <TituloSeccion
            numero="2"
            titulo="Prendas y servicios"
            texto="Agrega las prendas recibidas."
          />

          {prendas.map(
            (prenda, indice) => (
              <div
                key={
                  prenda.idTemporal
                }
                className="prenda"
              >
                <div className="prenda-cabecera">
                  <strong>
                    Artículo {indice + 1}
                  </strong>

                  {prendas.length >
                    1 && (
                    <button
                      type="button"
                      className="eliminar"
                      onClick={() =>
                        eliminarPrenda(
                          prenda.idTemporal
                        )
                      }
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="grid">
                  <div>
                    <label>
                      Tipo de prenda
                    </label>
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
                      <option value="">
                        Seleccionar
                      </option>
                      {TIPOS_PRENDA.map(
                        (tipo) => (
                          <option
                            key={tipo}
                            value={tipo}
                          >
                            {tipo}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label>Servicio</label>
                    <select
                      value={
                        prenda.servicio
                      }
                      onChange={(e) =>
                        actualizarPrenda(
                          prenda.idTemporal,
                          "servicio",
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Seleccionar
                      </option>
                      {SERVICIOS.map(
                        (servicio) => (
                          <option
                            key={servicio}
                            value={
                              servicio
                            }
                          >
                            {servicio}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        prenda.cantidad
                      }
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
                    <label>
                      Precio unitario
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={mostrarMontoDesdeCentavos(
                        prenda.precioCentavos
                      )}
                      onChange={(e) =>
                        actualizarPrecioPrenda(
                          prenda.idTemporal,
                          e
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <label>
                  Observación de la prenda
                </label>

                <input
                  value={
                    prenda.observacion
                  }
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
                    {formatoDinero(
                      numeroSeguro(
                        prenda.cantidad
                      ) *
                        numeroSeguro(
                          prenda.precioUnitario
                        )
                    )}
                  </strong>
                </div>
              </div>
            )
          )}

          <button
            type="button"
            onClick={agregarPrenda}
            className="boton-agregar"
          >
            + Agregar otra prenda
          </button>
        </section>

        <section className="tarjeta">
          <TituloSeccion
            numero="3"
            titulo="Entrega"
            texto="Define la fecha y prioridad."
          />

          <div className="grid">
            <div>
              <label>
                Fecha estimada de entrega
              </label>

              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) =>
                  setFechaEntrega(
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <label>Prioridad</label>

              <select
                value={prioridad}
                onChange={(e) =>
                  setPrioridad(
                    e.target.value
                  )
                }
              >
                <option value="Normal">
                  Normal
                </option>
                <option value="Express">
                  Express
                </option>
              </select>
            </div>
          </div>

          <label>
            Observaciones generales
          </label>

          <textarea
            value={observaciones}
            onChange={(e) =>
              setObservaciones(
                e.target.value
              )
            }
            placeholder="Instrucciones generales del pedido"
            rows={3}
          />
        </section>

        <section className="tarjeta">
          <TituloSeccion
            numero="4"
            titulo="Pago"
            texto="Registra el estado del pago."
          />

          <div className="opciones-pago">
            {[
              "Pagado",
              "Abono",
              "Pendiente",
            ].map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => {
                  setEstadoPago(opcion);

                  if (
                    opcion === "Pagado"
                  ) {
                    setMontoPagado(
                      total.toFixed(2)
                    );
                    setMontoPagadoCentavos(
                      String(
                        Math.round(total * 100)
                      )
                    );
                  }

                  if (
                    opcion ===
                    "Pendiente"
                  ) {
                    setMontoPagado("");
                    setMontoPagadoCentavos("");
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
            ))}
          </div>

          {estadoPago === "Abono" && (
            <div>
              <label>Monto abonado</label>

              <input
                type="text"
                inputMode="numeric"
                value={mostrarMontoDesdeCentavos(
                  montoPagadoCentavos
                )}
                onChange={(e) => {
                  const nuevosCentavos =
                    leerEntradaCentavos(
                      montoPagadoCentavos,
                      e
                    );

                  setMontoPagadoCentavos(
                    nuevosCentavos
                  );

                  setMontoPagado(
                    nuevosCentavos
                      ? (
                          Number(nuevosCentavos) /
                          100
                        ).toFixed(2)
                      : ""
                  );
                }}
                placeholder="0.00"
              />
            </div>
          )}

          {estadoPago !==
            "Pendiente" && (
            <div>
              <label>
                Método de pago
              </label>

              <select
                value={metodoPago}
                onChange={(e) =>
                  setMetodoPago(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Seleccione un método
                </option>

                {METODOS_PAGO.map(
                  (metodo) => (
                    <option
                      key={metodo}
                      value={metodo}
                    >
                      {metodo}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          <div className="resumen">
            <div>
              <span>Total</span>
              <strong>
                {formatoDinero(total)}
              </strong>
            </div>

            <div>
              <span>Pagado</span>
              <strong>
                {formatoDinero(pagado)}
              </strong>
            </div>

            <div>
              <span>
                Saldo pendiente
              </span>
              <strong>
                {formatoDinero(
                  saldoPendiente
                )}
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
          padding: 12px 10px 30px;
          background: #f2f6f3;
          color: #142019;
          font-family:
            Inter,
            Arial,
            sans-serif;
        }

        .encabezado {
          width: min(760px, 100%);
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .encabezado h1 {
          margin: 3px 0 0;
          font-size: 25px;
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
          flex: 0 0 44px;
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
          gap: 12px;
        }

        .tarjeta {
          padding: 15px 13px;
          border: 1px solid #dde7e0;
          border-radius: 17px;
          background: white;
          box-shadow:
            0 8px 22px
            rgba(21, 45, 31, 0.05);
        }

        :global(.titulo-seccion) {
          margin-bottom: 17px;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        :global(.titulo-seccion h2) {
          margin: 0;
          font-size: 18px;
        }

        :global(.titulo-seccion p) {
          margin: 3px 0 0;
          color: #718078;
          font-size: 12px;
        }

        :global(.numero) {
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
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
          min-height: 48px;
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
          box-shadow:
            0 0 0 3px
            rgba(22, 131, 79, 0.1);
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
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
          min-height: 46px;
          padding: 10px;
          display: flex;
          justify-content:
            space-between;
          align-items: center;
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
          justify-content:
            space-between;
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
          min-height: 46px;
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
          grid-template-columns: 1fr;
          gap: 7px;
        }

        .opcion {
          min-height: 45px;
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
          justify-content:
            space-between;
          gap: 12px;
        }

        .resumen span {
          color: #b9d8c5;
          font-size: 13px;
        }

        .guardar {
          position: sticky;
          bottom: 10px;
          z-index: 10;
          min-height: 56px;
          border: 0;
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              #117a46,
              #1aa55f
            );
          color: white;
          font-size: 17px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            0 13px 28px
            rgba(17, 122, 70, 0.25);
        }

        .guardar:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (min-width: 640px) {
          .pagina {
            padding:
              18px 14px 40px;
          }

          .tarjeta {
            padding: 18px;
          }

          .grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
            gap: 12px;
          }

          .opciones-pago {
            grid-template-columns:
              repeat(3, 1fr);
          }

          .guardar {
            position: static;
          }
        }
      `}</style>
    </main>
  );
}

function TituloSeccion({
  numero,
  titulo,
  texto,
}) {
  return (
    <div className="titulo-seccion">
      <span className="numero">
        {numero}
      </span>

      <div>
        <h2>{titulo}</h2>
        <p>{texto}</p>
      </div>
    </div>
  );
}
