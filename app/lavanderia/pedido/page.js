"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ESTADOS = [
  "Todos",
  "Recibido",
  "En proceso",
  "Listo",
  "Entregado",
  "Cancelado",
];

function formatoDinero(valor) {
  return `B/. ${Number(valor || 0).toFixed(2)}`;
}

function formatoFecha(valor) {
  if (!valor) return "-";

  const fecha = new Date(`${String(valor).slice(0, 10)}T00:00:00`);

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

function claseEstado(estado) {
  const mapa = {
    Recibido: "estado recibido",
    "En proceso": "estado proceso",
    Listo: "estado listo",
    Entregado: "estado entregado",
    Cancelado: "estado cancelado",
  };

  return mapa[estado] || "estado";
}

export default function PedidosLavanderia() {
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [actualizandoId, setActualizandoId] = useState("");

  useEffect(() => {
    const empresa = localStorage.getItem("empresaId");
    const usuario = localStorage.getItem("usuarioId");

    if (!empresa || !usuario) {
      alert("La sesión no es válida. Inicie sesión nuevamente.");
      router.replace("/login");
      return;
    }

    setEmpresaId(empresa);
    cargarPedidos(empresa);
  }, [router]);

  async function cargarPedidos(idEmpresa = empresaId) {
    if (!idEmpresa) return;

    setCargando(true);

    try {
      const { data: pedidosData, error: errorPedidos } = await supabase
        .from("lavanderia_pedidos")
        .select(`
          id,
          empresa_id,
          cliente_id,
          numero_pedido,
          fecha_recepcion,
          fecha_entrega,
          prioridad,
          estado_pedido,
          estado_pago,
          total,
          monto_pagado,
          saldo_pendiente,
          metodo_pago,
          observaciones,
          created_at
        `)
        .eq("empresa_id", idEmpresa)
        .order("created_at", { ascending: false });

      if (errorPedidos) {
        throw new Error(
          "No se pudieron cargar los pedidos: " +
            errorPedidos.message
        );
      }

      const listaPedidos = pedidosData || [];

      if (listaPedidos.length === 0) {
        setPedidos([]);
        return;
      }

      const clienteIds = [
        ...new Set(
          listaPedidos
            .map((pedido) => pedido.cliente_id)
            .filter(Boolean)
        ),
      ];

      const pedidoIds = listaPedidos.map((pedido) => pedido.id);

      const [
        { data: clientesData, error: errorClientes },
        { data: detallesData, error: errorDetalles },
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nombre, telefono")
          .in("id", clienteIds),

        supabase
          .from("lavanderia_pedido_detalles")
          .select("pedido_id, cantidad")
          .in("pedido_id", pedidoIds),
      ]);

      if (errorClientes) {
        console.error("Error cargando clientes:", errorClientes);
      }

      if (errorDetalles) {
        console.error("Error cargando detalles:", errorDetalles);
      }

      const clientesPorId = Object.fromEntries(
        (clientesData || []).map((cliente) => [
          cliente.id,
          cliente,
        ])
      );

      const prendasPorPedido = {};

      (detallesData || []).forEach((detalle) => {
        prendasPorPedido[detalle.pedido_id] =
          (prendasPorPedido[detalle.pedido_id] || 0) +
          Number(detalle.cantidad || 0);
      });

      const resultado = listaPedidos.map((pedido) => ({
        ...pedido,
        cliente:
          clientesPorId[pedido.cliente_id] || {
            nombre: "Cliente no encontrado",
            telefono: "-",
          },
        cantidadPrendas: prendasPorPedido[pedido.id] || 0,
      }));

      setPedidos(resultado);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudieron cargar los pedidos.");
    } finally {
      setCargando(false);
    }
  }

  async function cambiarEstado(pedidoId, nuevoEstado) {
    if (!pedidoId || !nuevoEstado) return;

    setActualizandoId(pedidoId);

    const { error } = await supabase
      .from("lavanderia_pedidos")
      .update({
        estado_pedido: nuevoEstado,
      })
      .eq("id", pedidoId)
      .eq("empresa_id", empresaId);

    setActualizandoId("");

    if (error) {
      alert(
        "No se pudo actualizar el estado: " + error.message
      );
      return;
    }

    setPedidos((actuales) =>
      actuales.map((pedido) =>
        pedido.id === pedidoId
          ? { ...pedido, estado_pedido: nuevoEstado }
          : pedido
      )
    );
  }

  const pedidosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return pedidos.filter((pedido) => {
      const coincideEstado =
        filtroEstado === "Todos" ||
        pedido.estado_pedido === filtroEstado;

      const coincideBusqueda =
        !texto ||
        String(pedido.numero_pedido || "")
          .toLowerCase()
          .includes(texto) ||
        String(pedido.cliente?.nombre || "")
          .toLowerCase()
          .includes(texto) ||
        String(pedido.cliente?.telefono || "")
          .toLowerCase()
          .includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [pedidos, filtroEstado, busqueda]);

  const resumen = useMemo(() => {
    return {
      activos: pedidos.filter((pedido) =>
        ["Recibido", "En proceso", "Listo"].includes(
          pedido.estado_pedido
        )
      ).length,
      listos: pedidos.filter(
        (pedido) => pedido.estado_pedido === "Listo"
      ).length,
      pendientes: pedidos.reduce(
        (total, pedido) =>
          total + Number(pedido.saldo_pendiente || 0),
        0
      ),
    };
  }, [pedidos]);

  return (
    <main className="pagina">
      <header className="encabezado">
        <button
          type="button"
          className="volver"
          onClick={() => router.push("/dashboard")}
          aria-label="Volver al panel"
        >
          ←
        </button>

        <div className="encabezado-texto">
          <span className="etiqueta">KONAX LAVANDERÍA</span>
          <h1>Pedidos</h1>
        </div>

        <button
          type="button"
          className="nuevo"
          onClick={() =>
            router.push("/lavanderia/nuevo-pedido")
          }
        >
          + Nuevo
        </button>
      </header>

      <section className="resumen">
        <article>
          <span>Activos</span>
          <strong>{resumen.activos}</strong>
        </article>

        <article>
          <span>Listos</span>
          <strong>{resumen.listos}</strong>
        </article>

        <article>
          <span>Por cobrar</span>
          <strong>{formatoDinero(resumen.pendientes)}</strong>
        </article>
      </section>

      <section className="controles">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar pedido, cliente o teléfono"
        />

        <div className="filtros">
          {ESTADOS.map((estado) => (
            <button
              key={estado}
              type="button"
              onClick={() => setFiltroEstado(estado)}
              className={
                filtroEstado === estado
                  ? "filtro activo"
                  : "filtro"
              }
            >
              {estado}
            </button>
          ))}
        </div>
      </section>

      {cargando ? (
        <section className="vacio">
          <strong>Cargando pedidos...</strong>
        </section>
      ) : pedidosFiltrados.length === 0 ? (
        <section className="vacio">
          <div className="vacio-icono">🧺</div>
          <strong>No hay pedidos para mostrar</strong>
          <p>
            Crea el primer pedido o cambia los filtros.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/lavanderia/nuevo-pedido")
            }
          >
            Crear pedido
          </button>
        </section>
      ) : (
        <section className="lista">
          {pedidosFiltrados.map((pedido) => (
            <article key={pedido.id} className="pedido">
              <div className="pedido-cabecera">
                <div>
                  <span className="numero-pedido">
                    {pedido.numero_pedido}
                  </span>

                  <h2>{pedido.cliente?.nombre}</h2>

                  <a
                    href={`tel:${pedido.cliente?.telefono || ""}`}
                    className="telefono"
                  >
                    {pedido.cliente?.telefono || "-"}
                  </a>
                </div>

                <span className={claseEstado(pedido.estado_pedido)}>
                  {pedido.estado_pedido}
                </span>
              </div>

              <div className="datos">
                <div>
                  <span>Prendas</span>
                  <strong>{pedido.cantidadPrendas}</strong>
                </div>

                <div>
                  <span>Entrega</span>
                  <strong>
                    {formatoFecha(pedido.fecha_entrega)}
                  </strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong>{formatoDinero(pedido.total)}</strong>
                </div>

                <div>
                  <span>Saldo</span>
                  <strong>
                    {formatoDinero(pedido.saldo_pendiente)}
                  </strong>
                </div>
              </div>

              {pedido.prioridad === "Express" && (
                <div className="express">
                  ⚡ Servicio express
                </div>
              )}

              {pedido.observaciones && (
                <p className="observacion">
                  {pedido.observaciones}
                </p>
              )}

              <div className="acciones">
                <label htmlFor={`estado-${pedido.id}`}>
                  Cambiar estado
                </label>

                <select
                  id={`estado-${pedido.id}`}
                  value={pedido.estado_pedido}
                  disabled={actualizandoId === pedido.id}
                  onChange={(e) =>
                    cambiarEstado(
                      pedido.id,
                      e.target.value
                    )
                  }
                >
                  <option value="Recibido">Recibido</option>
                  <option value="En proceso">
                    En proceso
                  </option>
                  <option value="Listo">Listo</option>
                  <option value="Entregado">
                    Entregado
                  </option>
                  <option value="Cancelado">
                    Cancelado
                  </option>
                </select>
              </div>
            </article>
          ))}
        </section>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .pagina {
          min-height: 100vh;
          padding: 12px 10px 32px;
          background: #f2f6f3;
          color: #142019;
          font-family: Inter, Arial, sans-serif;
        }

        .encabezado {
          width: min(850px, 100%);
          margin: 0 auto 14px;
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
        }

        .encabezado h1 {
          margin: 3px 0 0;
          font-size: 26px;
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

        .nuevo {
          min-height: 44px;
          padding: 10px 14px;
          border: none;
          border-radius: 11px;
          background: #16834f;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .resumen {
          width: min(850px, 100%);
          margin: 0 auto 12px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .resumen article {
          min-width: 0;
          padding: 13px 10px;
          border: 1px solid #dde7e0;
          border-radius: 13px;
          background: white;
        }

        .resumen span {
          display: block;
          color: #718078;
          font-size: 11px;
        }

        .resumen strong {
          display: block;
          margin-top: 5px;
          overflow-wrap: anywhere;
          font-size: 19px;
        }

        .controles {
          width: min(850px, 100%);
          margin: 0 auto 12px;
          padding: 12px;
          border: 1px solid #dde7e0;
          border-radius: 15px;
          background: white;
        }

        .controles input {
          width: 100%;
          min-height: 47px;
          padding: 11px 12px;
          border: 1px solid #d5dfd8;
          border-radius: 10px;
          font-size: 16px;
          outline: none;
        }

        .controles input:focus {
          border-color: #16834f;
          box-shadow: 0 0 0 3px rgba(22, 131, 79, 0.1);
        }

        .filtros {
          margin-top: 10px;
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding-bottom: 3px;
        }

        .filtro {
          flex: 0 0 auto;
          min-height: 38px;
          padding: 8px 12px;
          border: 1px solid #d5dfd8;
          border-radius: 999px;
          background: white;
          color: #33443a;
          font-weight: 800;
          cursor: pointer;
        }

        .filtro.activo {
          border-color: #173c2a;
          background: #173c2a;
          color: white;
        }

        .lista {
          width: min(850px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 11px;
        }

        .pedido {
          padding: 15px;
          border: 1px solid #dde7e0;
          border-radius: 16px;
          background: white;
          box-shadow: 0 8px 20px rgba(21, 45, 31, 0.05);
        }

        .pedido-cabecera {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .numero-pedido {
          display: block;
          color: #16834f;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .pedido h2 {
          margin: 5px 0 3px;
          font-size: 19px;
        }

        .telefono {
          color: #65736b;
          font-size: 13px;
          text-decoration: none;
        }

        .estado {
          flex: 0 0 auto;
          padding: 7px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
        }

        .recibido {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .proceso {
          background: #fff7ed;
          color: #c2410c;
        }

        .listo {
          background: #ecfdf3;
          color: #15803d;
        }

        .entregado {
          background: #f3f4f6;
          color: #374151;
        }

        .cancelado {
          background: #fff1f2;
          color: #be123c;
        }

        .datos {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .datos div {
          padding: 10px;
          border-radius: 10px;
          background: #f6f9f7;
        }

        .datos span {
          display: block;
          color: #748078;
          font-size: 11px;
        }

        .datos strong {
          display: block;
          margin-top: 4px;
          font-size: 14px;
        }

        .express {
          margin-top: 10px;
          padding: 9px 10px;
          border-radius: 9px;
          background: #fff7ed;
          color: #c2410c;
          font-size: 12px;
          font-weight: 850;
        }

        .observacion {
          margin: 10px 0 0;
          padding: 10px;
          border-left: 3px solid #16834f;
          background: #f4f8f5;
          color: #55635b;
          font-size: 12px;
          line-height: 1.5;
        }

        .acciones {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
        }

        .acciones label {
          font-size: 12px;
          font-weight: 850;
        }

        .acciones select {
          width: 100%;
          min-height: 45px;
          padding: 10px;
          border: 1px solid #d5dfd8;
          border-radius: 10px;
          background: white;
          font-size: 15px;
        }

        .vacio {
          width: min(850px, 100%);
          margin: 0 auto;
          padding: 35px 20px;
          border: 1px solid #dde7e0;
          border-radius: 16px;
          background: white;
          text-align: center;
        }

        .vacio-icono {
          font-size: 35px;
        }

        .vacio p {
          color: #718078;
          font-size: 13px;
        }

        .vacio button {
          min-height: 44px;
          padding: 10px 15px;
          border: none;
          border-radius: 10px;
          background: #16834f;
          color: white;
          font-weight: 850;
          cursor: pointer;
        }

        @media (min-width: 700px) {
          .pagina {
            padding: 20px 18px 40px;
          }

          .datos {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .acciones {
            grid-template-columns: 150px 220px;
            align-items: center;
          }
        }

        @media (max-width: 430px) {
          .resumen {
            grid-template-columns: 1fr 1fr;
          }

          .resumen article:last-child {
            grid-column: 1 / -1;
          }

          .nuevo {
            padding: 9px 11px;
          }
        }
      `}</style>
    </main>
  );
}

