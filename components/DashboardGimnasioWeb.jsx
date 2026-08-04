"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const DIA_MS = 86400000;

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fechaLocal(fecha) {
  if (!fecha) return null;

  const [anio, mes, dia] = String(fecha)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!anio || !mes || !dia) return null;

  return new Date(anio, mes - 1, dia, 0, 0, 0, 0);
}

function obtenerMembresiaActualPorAlumno(registros = []) {
  const ordenados = [...registros].sort((a, b) => {
    const fechaA =
      fechaLocal(a.fecha_vencimiento)?.getTime() || 0;
    const fechaB =
      fechaLocal(b.fecha_vencimiento)?.getTime() || 0;

    return fechaB - fechaA;
  });

  const mapa = new Map();

  ordenados.forEach((membresia) => {
    const clave = membresia.cliente_id || membresia.id;

    if (!mapa.has(clave)) {
      mapa.set(clave, membresia);
    }
  });

  return Array.from(mapa.values());
}

function calcularResumen(clientes = [], suscripciones = []) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const limiteAviso = new Date(
    hoy.getTime() + 7 * DIA_MS
  );

  const alumnosActivos = clientes.filter((cliente) => {
    const estado = normalizar(cliente.estado);

    return ![
      "inactivo",
      "cancelado",
      "suspendido",
      "bloqueado",
    ].includes(estado);
  }).length;

  const membresiasActuales =
    obtenerMembresiaActualPorAlumno(suscripciones);

  let membresiasActivas = 0;
  let porVencer = 0;
  let vencidas = 0;

  membresiasActuales.forEach((membresia) => {
    const estado = normalizar(membresia.estado);
    const vencimiento = fechaLocal(
      membresia.fecha_vencimiento
    );

    if (
      ["cancelado", "suspendido", "inactivo"].includes(
        estado
      )
    ) {
      return;
    }

    if (estado === "vencida") {
      vencidas += 1;
      return;
    }

    if (!vencimiento) {
      if (["activo", "activa"].includes(estado)) {
        membresiasActivas += 1;
      }

      return;
    }

    if (vencimiento.getTime() < hoy.getTime()) {
      vencidas += 1;
      return;
    }

    membresiasActivas += 1;

    if (
      vencimiento.getTime() <= limiteAviso.getTime()
    ) {
      porVencer += 1;
    }
  });

  return {
    alumnosActivos,
    membresiasActivas,
    porVencer,
    vencidas,
  };
}

export default function DashboardGimnasioWeb({
  empresaNombre = "Gimnasio",
}) {
  const router = useRouter();

  const [resumen, setResumen] = useState({
    alumnosActivos: 0,
    membresiasActivas: 0,
    porVencer: 0,
    vencidas: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    cargarResumen();
  }, []);

  async function cargarResumen() {
    setCargando(true);
    setAviso("");

    const empresaId =
      localStorage.getItem("empresaId");

    if (!empresaId) {
      setAviso(
        "No se encontró la empresa activa de esta sesión."
      );
      setCargando(false);
      return;
    }

    const [respuestaClientes, respuestaSuscripciones] =
      await Promise.all([
        supabase
          .from("clientes")
          .select("id, estado")
          .eq("empresa_id", empresaId),

        supabase
          .from("suscripciones")
          .select(
            "id, cliente_id, estado, fecha_inicio, fecha_vencimiento"
          )
          .eq("empresa_id", empresaId),
      ]);

    const errores = [
      respuestaClientes.error,
      respuestaSuscripciones.error,
    ].filter(Boolean);

    if (errores.length > 0) {
      console.error(
        "Error cargando resumen del gimnasio:",
        errores
      );

      setAviso(
        "La pantalla del gimnasio ya está disponible. Algunos indicadores se completarán cuando terminemos de conectar la seguridad y los pagos de membresías."
      );
    }

    setResumen(
      calcularResumen(
        respuestaClientes.data || [],
        respuestaSuscripciones.data || []
      )
    );

    setCargando(false);
  }

  const indicadores = useMemo(
    () => [
      {
        titulo: "Alumnos activos",
        valor: resumen.alumnosActivos,
        detalle: "Alumnos habilitados en el gimnasio",
        icono: "👥",
        color: "#16834f",
        fondo: "#eaf8ef",
      },
      {
        titulo: "Membresías activas",
        valor: resumen.membresiasActivas,
        detalle: "Planes con vigencia disponible",
        icono: "▣",
        color: "#2867a9",
        fondo: "#edf5ff",
      },
      {
        titulo: "Por vencer",
        valor: resumen.porVencer,
        detalle: "Vencen durante los próximos 7 días",
        icono: "◷",
        color: "#956400",
        fondo: "#fff8df",
      },
      {
        titulo: "Vencidas",
        valor: resumen.vencidas,
        detalle: "Requieren renovación o seguimiento",
        icono: "!",
        color: "#b42318",
        fondo: "#fff0ee",
      },
    ],
    [resumen]
  );

  const accesos = [
    {
      nombre: "Registrar alumno",
      detalle: "Crear o consultar la ficha del alumno",
      icono: "＋",
      ruta: "/clientes",
    },
    {
      nombre: "Membresías",
      detalle: "Activar, renovar o revisar un plan",
      icono: "▣",
      ruta: "/suscripciones",
    },
    {
      nombre: "Registrar entrada",
      detalle: "Validar el acceso del alumno",
      icono: "✓",
      ruta: "/gimnasio/check-in",
    },
    {
      nombre: "Cobrar",
      detalle: "Registrar mensualidad o servicio",
      icono: "$",
      ruta: "/caja",
    },
  ];

  return (
    <>
      <section style={s.hero}>
        <div style={s.heroContenido}>
          <span style={s.etiqueta}>
            GESTIÓN DEL GIMNASIO
          </span>

          <h2 style={s.titulo}>
            Controla alumnos, membresías y accesos
          </h2>

          <p style={s.descripcion}>
            Administra la operación diaria de{" "}
            <strong>{empresaNombre}</strong>, revisa los
            vencimientos y registra cada movimiento desde
            una sola plataforma.
          </p>

          <div style={s.botonesHero}>
            <button
              type="button"
              onClick={() => router.push("/clientes")}
              style={s.botonPrincipal}
            >
              Registrar alumno
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/gimnasio/check-in")
              }
              style={s.botonSecundario}
            >
              Abrir check-in
            </button>
          </div>
        </div>

        <div style={s.visual}>
          <div style={s.pesa}>
            <span style={s.discoGrande} />
            <span style={s.discoPequeno} />
            <span style={s.barra} />
            <span style={s.discoPequeno} />
            <span style={s.discoGrande} />
          </div>

          <div style={s.sello}>K</div>
        </div>
      </section>

      {aviso && (
        <div style={s.aviso}>
          <strong style={s.avisoIcono}>i</strong>
          <span>{aviso}</span>
        </div>
      )}

      <section style={s.indicadores}>
        {indicadores.map((item) => (
          <article
            key={item.titulo}
            style={s.indicador}
          >
            <div
              style={{
                ...s.indicadorIcono,
                color: item.color,
                background: item.fondo,
              }}
            >
              {item.icono}
            </div>

            <div>
              <span style={s.indicadorEtiqueta}>
                {item.titulo}
              </span>

              <strong style={s.indicadorValor}>
                {cargando ? "…" : item.valor}
              </strong>

              <p style={s.indicadorDetalle}>
                {item.detalle}
              </p>
            </div>
          </article>
        ))}
      </section>

      <section style={s.contenidoInferior}>
        <article style={s.panelAcciones}>
          <span style={s.subEtiqueta}>
            ACCIONES RÁPIDAS
          </span>

          <h3 style={s.subTitulo}>
            ¿Qué deseas hacer?
          </h3>

          <div style={s.accesos}>
            {accesos.map((item) => (
              <button
                key={item.nombre}
                type="button"
                onClick={() => router.push(item.ruta)}
                style={s.acceso}
              >
                <span style={s.accesoIcono}>
                  {item.icono}
                </span>

                <span style={s.accesoTexto}>
                  <strong>{item.nombre}</strong>
                  <small>{item.detalle}</small>
                </span>

                <span style={s.flecha}>→</span>
              </button>
            ))}
          </div>
        </article>

        <aside style={s.panelAtencion}>
          <span style={s.subEtiqueta}>
            ATENCIÓN DE HOY
          </span>

          <h3 style={s.subTitulo}>
            Prioridades del gimnasio
          </h3>

          <Prioridad
            titulo="Renovaciones próximas"
            detalle="Contacta a los alumnos antes del vencimiento."
            valor={cargando ? "…" : resumen.porVencer}
            onClick={() => router.push("/suscripciones")}
          />

          <Prioridad
            titulo="Membresías vencidas"
            detalle="Revisa los casos pendientes de renovación."
            valor={cargando ? "…" : resumen.vencidas}
            onClick={() => router.push("/suscripciones")}
          />

          <Prioridad
            titulo="Control de accesos"
            detalle="Valida la membresía antes de registrar la entrada."
            valor="Abrir"
            onClick={() =>
              router.push("/gimnasio/check-in")
            }
          />
        </aside>
      </section>
    </>
  );
}

function Prioridad({
  titulo,
  detalle,
  valor,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={s.prioridad}
    >
      <span style={s.prioridadTexto}>
        <strong>{titulo}</strong>
        <small>{detalle}</small>
      </span>

      <span style={s.prioridadValor}>{valor}</span>
    </button>
  );
}

const s = {
  hero: {
    maxWidth: 1440,
    minHeight: 280,
    margin: "0 auto 18px",
    padding: "34px 38px",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1.45fr) minmax(250px,.65fr)",
    alignItems: "center",
    gap: 28,
    borderRadius: 26,
    background:
      "linear-gradient(135deg,#102b1d 0%,#174d30 62%,#1d7044 100%)",
    color: "#fff",
    overflow: "hidden",
    boxShadow:
      "0 20px 50px rgba(17,60,38,.16)",
  },

  heroContenido: {
    maxWidth: 760,
  },

  etiqueta: {
    display: "inline-flex",
    padding: "7px 11px",
    border: "1px solid rgba(255,255,255,.16)",
    borderRadius: 999,
    background: "rgba(255,255,255,.08)",
    color: "#b7edcc",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.35,
  },

  titulo: {
    margin: "18px 0 14px",
    maxWidth: 760,
    fontSize: "clamp(38px,4.5vw,62px)",
    lineHeight: 1,
    letterSpacing: "-1.8px",
  },

  descripcion: {
    maxWidth: 690,
    margin: 0,
    color: "#d7eadf",
    fontSize: 15,
    lineHeight: 1.7,
  },

  botonesHero: {
    marginTop: 24,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },

  botonPrincipal: {
    minHeight: 46,
    padding: "11px 18px",
    border: 0,
    borderRadius: 12,
    background: "#56d98c",
    color: "#0e2c1c",
    fontWeight: 900,
    cursor: "pointer",
  },

  botonSecundario: {
    minHeight: 46,
    padding: "11px 18px",
    border: "1px solid rgba(255,255,255,.24)",
    borderRadius: 12,
    background: "rgba(255,255,255,.08)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },

  visual: {
    minHeight: 210,
    position: "relative",
    display: "grid",
    placeItems: "center",
  },

  pesa: {
    display: "flex",
    alignItems: "center",
    filter:
      "drop-shadow(0 16px 16px rgba(4,20,11,.25))",
  },

  barra: {
    width: 125,
    height: 22,
    background:
      "linear-gradient(180deg,#e7eee9,#8fa49a)",
    borderRadius: 999,
  },

  discoGrande: {
    width: 34,
    height: 88,
    borderRadius: 10,
    background: "#10291c",
  },

  discoPequeno: {
    width: 27,
    height: 65,
    borderRadius: 9,
    background:
      "linear-gradient(180deg,#56d98c,#16834f)",
  },

  sello: {
    position: "absolute",
    right: 22,
    bottom: 10,
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 18,
    background: "rgba(255,255,255,.08)",
    color: "#8ae6af",
    fontSize: 27,
    fontWeight: 950,
  },

  aviso: {
    maxWidth: 1440,
    margin: "0 auto 16px",
    padding: "12px 14px",
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    border: "1px solid #c9dfd2",
    borderRadius: 13,
    background: "#f3faf6",
    color: "#4e6257",
    fontSize: 12,
    lineHeight: 1.5,
  },

  avisoIcono: {
    width: 22,
    height: 22,
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#16834f",
    color: "#fff",
  },

  indicadores: {
    maxWidth: 1440,
    margin: "0 auto 18px",
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: 14,
  },

  indicador: {
    minHeight: 150,
    padding: 19,
    display: "grid",
    gridTemplateColumns:
      "50px minmax(0,1fr)",
    alignItems: "start",
    gap: 14,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#fff",
    boxShadow:
      "0 10px 26px rgba(24,54,37,.06)",
  },

  indicadorIcono: {
    width: 50,
    height: 50,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    fontSize: 22,
    fontWeight: 900,
  },

  indicadorEtiqueta: {
    display: "block",
    color: "#6e7d74",
    fontSize: 11,
    fontWeight: 800,
  },

  indicadorValor: {
    display: "block",
    marginTop: 6,
    color: "#142019",
    fontSize: 32,
    lineHeight: 1,
  },

  indicadorDetalle: {
    margin: "9px 0 0",
    color: "#839087",
    fontSize: 11,
    lineHeight: 1.4,
  },

  contenidoInferior: {
    maxWidth: 1440,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1.45fr) minmax(300px,.65fr)",
    gap: 16,
  },

  panelAcciones: {
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background: "#fff",
  },

  panelAtencion: {
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background:
      "linear-gradient(180deg,#ffffff 0%,#f4f8f5 100%)",
  },

  subEtiqueta: {
    display: "block",
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  subTitulo: {
    margin: "5px 0 16px",
    color: "#142019",
    fontSize: 22,
  },

  accesos: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 12,
  },

  acceso: {
    minHeight: 112,
    padding: 15,
    display: "grid",
    gridTemplateColumns:
      "48px minmax(0,1fr) auto",
    alignItems: "center",
    gap: 12,
    border: "1px solid #dde7e1",
    borderRadius: 16,
    background: "#f9fbfa",
    color: "#142019",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "pointer",
  },

  accesoIcono: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#eaf8ef",
    color: "#16834f",
    fontSize: 23,
    fontWeight: 900,
  },

  accesoTexto: {
    minWidth: 0,
    display: "grid",
    gap: 5,
  },

  flecha: {
    color: "#16834f",
    fontSize: 22,
    fontWeight: 900,
  },

  prioridad: {
    width: "100%",
    padding: "14px 0",
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) auto",
    alignItems: "center",
    gap: 12,
    border: 0,
    borderBottom: "1px solid #e4ebe7",
    background: "transparent",
    color: "#142019",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "pointer",
  },

  prioridadTexto: {
    display: "grid",
    gap: 4,
  },

  prioridadValor: {
    minWidth: 46,
    height: 38,
    padding: "0 10px",
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#eaf8ef",
    color: "#16834f",
    fontSize: 15,
    fontWeight: 900,
  },
};

