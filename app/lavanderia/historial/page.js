"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function dinero(valor) {
  return `B/. ${numeroSeguro(valor).toFixed(2)}`;
}

function fechaCorta(valor) {
  if (!valor) return "-";

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

export default function HistorialLavanderia() {
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    const empresa = localStorage.getItem("empresaId");
    const usuario = localStorage.getItem("usuarioId");

    if (!empresa || !usuario) {
      alert("La sesión no es válida. Inicie sesión nuevamente.");
      router.replace("/login");
      return;
    }

    setEmpresaId(empresa);
    await cargarHistorial(empresa);
  }

  async function cargarHistorial(idEmpresa = empresaId) {
    if (!idEmpresa) return;

    setCargando(true);

    const { data: pedidosData, error: errorPedidos } = await supabase
      .from("lavanderia_pedidos")
      .select(`
        id,
        empresa_id,
        cliente_id,
        numero_pedido,
        fecha_recepcion,
        fecha_entrega,
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
      .eq("estado_pedido", "Entregado")
      .order("created_at", { ascending: false });

    if (errorPedidos) {
      alert(
        "No se pudo cargar el historial: " +
          errorPedidos.message
      );
      setPedidos([]);
      setCargando(false);
      return;
    }

    const lista = pedidosData || [];

    const clienteIds = [
      ...new Set(
        lista
          .map((pedido) => pedido.cliente_id)
          .filter(Boolean)
      ),
    ];

    let clientesPorId = {};

    if (clienteIds.length > 0) {
      const { data: clientes, error: errorClientes } = await supabase
        .from("clientes")
        .select("id, nombre, telefono")
        .in("id", clienteIds);

      if (errorClientes) {
        console.error(
          "No se pudieron cargar los clientes:",
          errorClientes
        );
      } else {
        clientesPorId = Object.fromEntries(
          (clientes || []).map((cliente) => [
            cliente.id,
            cliente,
          ])
        );
      }
    }

    setPedidos(
      lista.map((pedido) => ({
        ...pedido,
        cliente:
          clientesPorId[pedido.cliente_id] || {
            nombre: "Cliente",
            telefono: "-",
          },
      }))
    );

    setCargando(false);
  }

  const pedidosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (texto.length < 2) {
      return [];
    }

    return pedidos.filter((pedido) => {
      return (
        String(pedido.numero_pedido || "")
          .toLowerCase()
          .includes(texto) ||
        String(pedido.cliente?.nombre || "")
          .toLowerCase()
          .includes(texto) ||
        String(pedido.cliente?.telefono || "")
          .toLowerCase()
          .includes(texto) ||
        String(pedido.metodo_pago || "")
          .toLowerCase()
          .includes(texto)
      );
    });
  }, [pedidos, busqueda]);

  const totalHistorico = useMemo(() => {
    return pedidos.reduce(
      (acumulado, pedido) =>
        acumulado + numeroSeguro(pedido.total),
      0
    );
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

        <div>
          <span>KONAX LAVANDERÍA</span>
          <h1>Historial</h1>
          <p>Pedidos entregados y finalizados</p>
        </div>

        <button
          type="button"
          className="actualizar"
          onClick={() => cargarHistorial(empresaId)}
          disabled={cargando}
        >
          {cargando ? "..." : "Actualizar"}
        </button>
      </header>

      <section className="resumen">
        <article>
          <span>Pedidos entregados</span>
          <strong>{pedidos.length}</strong>
        </article>

        <article>
          <span>Total histórico</span>
          <strong>{dinero(totalHistorico)}</strong>
        </article>
      </section>

      <section className="buscador">
        <div className="buscador-linea">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar pedido, cliente o teléfono"
          />

          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        <small>
          Escribe al menos 2 caracteres para buscar en el historial.
        </small>
      </section>

      {cargando ? (
        <section className="vacio">
          Cargando historial...
        </section>
      ) : busqueda.trim().length < 2 ? (
        <section className="vacio">
          Busca por número de pedido, cliente o teléfono.
        </section>
      ) : pedidosFiltrados.length === 0 ? (
        <section className="vacio">
          No se encontraron pedidos entregados con esa búsqueda.
        </section>
      ) : (
        <section className="lista">
          {pedidosFiltrados.map((pedido) => (
            <article key={pedido.id} className="pedido">
              <div className="pedido-top">
                <div>
                  <span className="numero">
                    {pedido.numero_pedido}
                  </span>

                  <h2>{pedido.cliente?.nombre}</h2>

                  <p>{pedido.cliente?.telefono || "-"}</p>
                </div>

                <span className="estado">
                  Entregado
                </span>
              </div>

              <div className="datos">
                <div>
                  <span>Recepción</span>
                  <strong>
                    {fechaCorta(
                      pedido.fecha_recepcion ||
                        pedido.created_at
                    )}
                  </strong>
                </div>

                <div>
                  <span>Entrega</span>
                  <strong>
                    {fechaCorta(pedido.fecha_entrega)}
                  </strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong>{dinero(pedido.total)}</strong>
                </div>

                <div>
                  <span>Pagado</span>
                  <strong>
                    {dinero(pedido.monto_pagado)}
                  </strong>
                </div>

                <div>
                  <span>Saldo</span>
                  <strong>
                    {dinero(pedido.saldo_pendiente)}
                  </strong>
                </div>

                <div>
                  <span>Método</span>
                  <strong>
                    {pedido.metodo_pago || "-"}
                  </strong>
                </div>
              </div>

              {pedido.observaciones && (
                <p className="observaciones">
                  {pedido.observaciones}
                </p>
              )}
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
          padding: 14px 12px 34px;
          background: #f2f6f3;
          color: #152019;
          font-family: Inter, Arial, sans-serif;
        }

        .encabezado,
        .resumen,
        .buscador,
        .lista,
        .vacio {
          width: min(900px, 100%);
          margin-left: auto;
          margin-right: auto;
        }

        .encabezado {
          margin-bottom: 14px;
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
        }

        .encabezado span {
          color: #16834f;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.1px;
        }

        .encabezado h1 {
          margin: 3px 0 2px;
          font-size: 25px;
        }

        .encabezado p {
          margin: 0;
          color: #748078;
          font-size: 12px;
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

        .actualizar {
          min-height: 42px;
          padding: 9px 12px;
          border: none;
          border-radius: 10px;
          background: #173c2a;
          color: white;
          font-weight: 850;
          cursor: pointer;
        }

        .resumen {
          margin-bottom: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .resumen article {
          padding: 15px 13px;
          border: 1px solid #dce6df;
          border-radius: 14px;
          background: white;
        }

        .resumen span {
          display: block;
          color: #6e7b73;
          font-size: 11px;
        }

        .resumen strong {
          display: block;
          margin-top: 7px;
          font-size: 20px;
        }

        .buscador {
          margin-bottom: 12px;
          padding: 12px;
          border: 1px solid #dce6df;
          border-radius: 14px;
          background: white;
        }

        .buscador-linea {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
        }

        .buscador input {
          width: 100%;
          min-height: 48px;
          padding: 11px 12px;
          border: 1px solid #d5dfd8;
          border-radius: 10px;
          font-size: 16px;
          outline: none;
        }

        .buscador input:focus {
          border-color: #16834f;
          box-shadow:
            0 0 0 3px
            rgba(22, 131, 79, 0.1);
        }

        .buscador button {
          width: 46px;
          height: 46px;
          border: 1px solid #d5dfd8;
          border-radius: 10px;
          background: #f5f8f6;
          color: #173c2a;
          font-size: 24px;
          cursor: pointer;
        }

        .buscador small {
          display: block;
          margin-top: 7px;
          color: #748078;
          font-size: 11px;
        }

        .lista {
          display: grid;
          gap: 10px;
        }

        .pedido {
          padding: 15px;
          border: 1px solid #dce6df;
          border-radius: 15px;
          background: white;
        }

        .pedido-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .numero {
          color: #16834f;
          font-size: 10px;
          font-weight: 900;
        }

        .pedido h2 {
          margin: 5px 0 2px;
          font-size: 18px;
        }

        .pedido p {
          margin: 0;
          color: #748078;
          font-size: 12px;
        }

        .estado {
          flex: 0 0 auto;
          padding: 7px 9px;
          border-radius: 999px;
          background: #f3f4f6;
          color: #374151;
          font-size: 10px;
          font-weight: 900;
        }

        .datos {
          margin-top: 13px;
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
          font-size: 10px;
        }

        .datos strong {
          display: block;
          margin-top: 4px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .observaciones {
          margin-top: 10px !important;
          padding: 10px;
          border-left: 3px solid #16834f;
          background: #f4f8f5;
          line-height: 1.5;
        }

        .vacio {
          padding: 30px 16px;
          border: 1px solid #dce6df;
          border-radius: 15px;
          background: white;
          color: #748078;
          text-align: center;
        }

        @media (min-width: 700px) {
          .pagina {
            padding: 22px 18px 40px;
          }

          .datos {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}
