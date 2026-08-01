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

function inicioDia(fecha = new Date()) {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function inicioSemana(fecha = new Date()) {
  const copia = inicioDia(fecha);
  const dia = copia.getDay();
  const ajuste = dia === 0 ? -6 : 1 - dia;
  copia.setDate(copia.getDate() + ajuste);
  return copia;
}

function inicioMes(fecha = new Date()) {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
}

function esDesde(fechaTexto, fechaInicio) {
  if (!fechaTexto) return false;

  const fecha = new Date(fechaTexto);

  if (Number.isNaN(fecha.getTime())) {
    return false;
  }

  return fecha.getTime() >= fechaInicio.getTime();
}

function fechaHora(fechaTexto) {
  if (!fechaTexto) return "-";

  const fecha = new Date(fechaTexto);

  if (Number.isNaN(fecha.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

export default function CajaLavanderia() {
  const router = useRouter();

  const [empresaId, setEmpresaId] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("hoy");

  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    const empresa =
      localStorage.getItem("empresaId");

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
    await cargarCaja(empresa);
  }

  async function cargarCaja(idEmpresa = empresaId) {
    if (!idEmpresa) return;

    setCargando(true);

    const { data, error } = await supabase
      .from("lavanderia_pedidos")
      .select(`
        id,
        numero_pedido,
        estado_pedido,
        estado_pago,
        total,
        monto_pagado,
        saldo_pendiente,
        metodo_pago,
        created_at,
        cliente_id
      `)
      .eq("empresa_id", idEmpresa)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      alert(
        "No se pudo cargar la caja: " +
          error.message
      );
      setPedidos([]);
      setCargando(false);
      return;
    }

    const lista = data || [];

    const clienteIds = [
      ...new Set(
        lista
          .map((pedido) => pedido.cliente_id)
          .filter(Boolean)
      ),
    ];

    let clientesPorId = {};

    if (clienteIds.length > 0) {
      const {
        data: clientes,
        error: errorClientes,
      } = await supabase
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
          clientesPorId[pedido.cliente_id] ||
          null,
      }))
    );

    setCargando(false);
  }

  const resumen = useMemo(() => {
    const hoy = inicioDia();
    const semana = inicioSemana();
    const mes = inicioMes();

    const cobradoHoy = pedidos
      .filter((pedido) =>
        esDesde(pedido.created_at, hoy)
      )
      .reduce(
        (total, pedido) =>
          total +
          numeroSeguro(pedido.monto_pagado),
        0
      );

    const cobradoSemana = pedidos
      .filter((pedido) =>
        esDesde(pedido.created_at, semana)
      )
      .reduce(
        (total, pedido) =>
          total +
          numeroSeguro(pedido.monto_pagado),
        0
      );

    const cobradoMes = pedidos
      .filter((pedido) =>
        esDesde(pedido.created_at, mes)
      )
      .reduce(
        (total, pedido) =>
          total +
          numeroSeguro(pedido.monto_pagado),
        0
      );

    const pendiente = pedidos.reduce(
      (total, pedido) =>
        total +
        numeroSeguro(
          pedido.saldo_pendiente
        ),
      0
    );

    return {
      hoy: cobradoHoy,
      semana: cobradoSemana,
      mes: cobradoMes,
      pendiente,
    };
  }, [pedidos]);

  const resumenMetodos = useMemo(() => {
    return pedidos.reduce(
      (resultado, pedido) => {
        const monto = numeroSeguro(
          pedido.monto_pagado
        );

        if (monto <= 0) {
          return resultado;
        }

        const metodo =
          pedido.metodo_pago ||
          "Sin especificar";

        resultado[metodo] =
          numeroSeguro(resultado[metodo]) +
          monto;

        return resultado;
      },
      {}
    );
  }, [pedidos]);

  const movimientos = useMemo(() => {
    const hoy = inicioDia();
    const semana = inicioSemana();
    const mes = inicioMes();

    return pedidos.filter((pedido) => {
      if (filtro === "hoy") {
        return esDesde(
          pedido.created_at,
          hoy
        );
      }

      if (filtro === "semana") {
        return esDesde(
          pedido.created_at,
          semana
        );
      }

      if (filtro === "mes") {
        return esDesde(
          pedido.created_at,
          mes
        );
      }

      if (filtro === "pendientes") {
        return (
          numeroSeguro(
            pedido.saldo_pendiente
          ) > 0
        );
      }

      return true;
    });
  }, [pedidos, filtro]);

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
          <span>KONAX LAVANDERÍA</span>
          <h1>Resumen de caja</h1>
          <p>
            Cobros y saldos de la lavandería
          </p>
        </div>

        <button
          type="button"
          className="actualizar"
          onClick={() =>
            cargarCaja(empresaId)
          }
          disabled={cargando}
        >
          {cargando
            ? "..."
            : "Actualizar"}
        </button>
      </header>

      <section className="resumen">
        <article>
          <span>Cobrado hoy</span>
          <strong>{dinero(resumen.hoy)}</strong>
        </article>

        <article>
          <span>Esta semana</span>
          <strong>
            {dinero(resumen.semana)}
          </strong>
        </article>

        <article>
          <span>Este mes</span>
          <strong>{dinero(resumen.mes)}</strong>
        </article>

        <article className="pendiente">
          <span>Pendiente por cobrar</span>
          <strong>
            {dinero(resumen.pendiente)}
          </strong>
        </article>
      </section>

      <section className="metodos">
        <div className="seccion-titulo">
          <div>
            <span>COBROS REGISTRADOS</span>
            <h2>Por método de pago</h2>
          </div>
        </div>

        <div className="metodos-grid">
          {Object.keys(resumenMetodos)
            .length === 0 ? (
            <p className="sin-datos">
              Todavía no hay cobros
              registrados.
            </p>
          ) : (
            Object.entries(
              resumenMetodos
            ).map(([metodo, total]) => (
              <article key={metodo}>
                <span>{metodo}</span>
                <strong>
                  {dinero(total)}
                </strong>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="movimientos">
        <div className="seccion-titulo">
          <div>
            <span>DETALLE</span>
            <h2>Pedidos y cobros</h2>
          </div>
        </div>

        <div className="filtros">
          {[
            ["hoy", "Hoy"],
            ["semana", "Semana"],
            ["mes", "Mes"],
            [
              "pendientes",
              "Pendientes",
            ],
          ].map(([codigo, nombre]) => (
            <button
              key={codigo}
              type="button"
              onClick={() =>
                setFiltro(codigo)
              }
              className={
                filtro === codigo
                  ? "filtro activo"
                  : "filtro"
              }
            >
              {nombre}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="vacio">
            Cargando caja...
          </div>
        ) : movimientos.length === 0 ? (
          <div className="vacio">
            No hay movimientos para este
            filtro.
          </div>
        ) : (
          <div className="lista">
            {movimientos.map((pedido) => (
              <article
                key={pedido.id}
                className="movimiento"
              >
                <div className="movimiento-top">
                  <div>
                    <span className="numero">
                      {pedido.numero_pedido}
                    </span>

                    <h3>
                      {pedido.cliente
                        ?.nombre ||
                        "Cliente"}
                    </h3>

                    <p>
                      {pedido.cliente
                        ?.telefono || "-"}
                    </p>
                  </div>

                  <span
                    className={
                      numeroSeguro(
                        pedido.saldo_pendiente
                      ) <= 0
                        ? "estado pagado"
                        : "estado pendiente"
                    }
                  >
                    {numeroSeguro(
                      pedido.saldo_pendiente
                    ) <= 0
                      ? "Pagado"
                      : pedido.estado_pago ||
                        "Pendiente"}
                  </span>
                </div>

                <div className="datos">
                  <div>
                    <span>Total</span>
                    <strong>
                      {dinero(
                        pedido.total
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Recibido</span>
                    <strong>
                      {dinero(
                        pedido.monto_pagado
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Saldo</span>
                    <strong>
                      {dinero(
                        pedido.saldo_pendiente
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Método</span>
                    <strong>
                      {pedido.metodo_pago ||
                        "-"}
                    </strong>
                  </div>
                </div>

                <div className="fecha">
                  {fechaHora(
                    pedido.created_at
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .pagina {
          min-height: 100vh;
          padding: 14px 12px 34px;
          background: #f2f6f3;
          color: #152019;
          font-family:
            Inter,
            Arial,
            sans-serif;
        }

        .encabezado,
        .resumen,
        .metodos,
        .movimientos {
          width: min(900px, 100%);
          margin-left: auto;
          margin-right: auto;
        }

        .encabezado {
          margin-bottom: 14px;
          display: grid;
          grid-template-columns:
            44px
            minmax(0, 1fr)
            auto;
          align-items: center;
          gap: 10px;
        }

        .encabezado span,
        .seccion-titulo span {
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
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .resumen article {
          padding: 15px 13px;
          border: 1px solid #dce6df;
          border-radius: 14px;
          background: white;
        }

        .resumen article span {
          display: block;
          color: #6e7b73;
          font-size: 11px;
        }

        .resumen article strong {
          display: block;
          margin-top: 7px;
          font-size: 20px;
          overflow-wrap: anywhere;
        }

        .resumen .pendiente {
          border-left: 4px solid #dc8a00;
          background: #fffaf0;
        }

        .metodos,
        .movimientos {
          margin-bottom: 12px;
          padding: 16px;
          border: 1px solid #dce6df;
          border-radius: 16px;
          background: white;
        }

        .seccion-titulo h2 {
          margin: 4px 0 0;
          font-size: 20px;
        }

        .metodos-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .metodos-grid article {
          padding: 12px;
          border-radius: 11px;
          background: #f4f8f5;
        }

        .metodos-grid article span {
          display: block;
          color: #748078;
          font-size: 11px;
        }

        .metodos-grid article strong {
          display: block;
          margin-top: 5px;
          font-size: 16px;
        }

        .sin-datos {
          grid-column: 1 / -1;
          margin: 0;
          color: #748078;
          font-size: 13px;
        }

        .filtros {
          margin-top: 13px;
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
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }

        .movimiento {
          padding: 14px;
          border: 1px solid #e0e8e3;
          border-radius: 13px;
          background: #fbfdfb;
        }

        .movimiento-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .numero {
          color: #16834f;
          font-size: 10px;
          font-weight: 900;
        }

        .movimiento h3 {
          margin: 4px 0 2px;
          font-size: 17px;
        }

        .movimiento p {
          margin: 0;
          color: #758078;
          font-size: 12px;
        }

        .estado {
          flex: 0 0 auto;
          padding: 7px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }

        .estado.pagado {
          background: #dcfce7;
          color: #166534;
        }

        .estado.pendiente {
          background: #fff7ed;
          color: #c2410c;
        }

        .datos {
          margin-top: 12px;
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .datos div {
          padding: 9px;
          border-radius: 9px;
          background: white;
        }

        .datos span {
          display: block;
          color: #768078;
          font-size: 10px;
        }

        .datos strong {
          display: block;
          margin-top: 4px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .fecha {
          margin-top: 9px;
          color: #849087;
          font-size: 10px;
          text-align: right;
        }

        .vacio {
          margin-top: 12px;
          padding: 28px 14px;
          border-radius: 12px;
          background: #f6f8f7;
          color: #748078;
          text-align: center;
          font-size: 13px;
        }

        @media (min-width: 700px) {
          .pagina {
            padding: 22px 18px 40px;
          }

          .resumen {
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
          }

          .metodos-grid {
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
          }

          .datos {
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 430px) {
          .actualizar {
            padding: 8px 10px;
            font-size: 12px;
          }

          .encabezado h1 {
            font-size: 22px;
          }
        }
      `}</style>
    </main>
  );
}

