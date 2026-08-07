"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const VERSION_CHECKIN = "2026.08.06-B";
const DIA_MS = 86400000;

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function fechaLocal(fecha) {
  if (!fecha) return null;

  const [a, m, d] = String(fecha)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!a || !m || !d) return null;

  return new Date(a, m - 1, d, 0, 0, 0, 0);
}

function formatoFecha(fecha) {
  if (!fecha) return "-";

  const texto = String(fecha).slice(0, 10);
  const [a, m, d] = texto.split("-");

  return a && m && d
    ? `${d}/${m}/${a}`
    : texto;
}

function formatoHora(fecha) {
  if (!fecha) return "-";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "es-PA",
    {
      timeZone: "America/Panama",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  ).format(valor);
}

function obtenerNombre(cliente = {}) {
  return String(
    cliente.nombre_completo ||
      cliente.nombre ||
      cliente.razon_social ||
      [
        cliente.nombres,
        cliente.apellido,
        cliente.apellidos,
      ]
        .filter(Boolean)
        .join(" ") ||
      "Alumno sin nombre"
  ).trim();
}

function obtenerDocumento(cliente = {}) {
  return String(
    cliente.cedula ||
      cliente.documento ||
      cliente.identificacion ||
      cliente.numero_documento ||
      ""
  ).trim();
}

function obtenerTelefono(cliente = {}) {
  return String(
    cliente.telefono ||
      cliente.celular ||
      cliente.whatsapp ||
      cliente.movil ||
      ""
  ).trim();
}

function obtenerNombrePlan(membresia = {}) {
  return String(
    membresia.plan_nombre ||
      membresia.nombre_plan ||
      membresia.tipo_plan ||
      membresia.plan?.nombre ||
      membresia.nombre ||
      "Plan sin nombre"
  ).trim();
}

function evaluarMembresia(
  membresia,
  estadoCliente = ""
) {
  const cliente = normalizar(estadoCliente);

  if (
    [
      "inactivo",
      "suspendido",
      "cancelado",
      "bloqueado",
    ].includes(cliente)
  ) {
    return {
      codigo: "denegado",
      etiqueta: "Alumno inactivo",
      permitido: false,
      detalle:
        "La ficha del alumno no está habilitada.",
    };
  }

  if (!membresia) {
    return {
      codigo: "denegado",
      etiqueta: "Sin membresía",
      permitido: false,
      detalle:
        "Debe asignarse y pagarse una membresía.",
    };
  }

  const estado = normalizar(
    membresia.estado
  );

  if (
    !["activo", "activa"].includes(estado)
  ) {
    return {
      codigo: "denegado",
      etiqueta:
        membresia.estado ||
        "Membresía no activa",
      permitido: false,
      detalle:
        "La membresía debe estar activa antes del ingreso.",
    };
  }

  const vencimiento = fechaLocal(
    membresia.fecha_vencimiento
  );

  if (!vencimiento) {
    return {
      codigo: "denegado",
      etiqueta: "Sin vigencia",
      permitido: false,
      detalle:
        "La membresía no tiene fecha de vencimiento.",
    };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const dias = Math.ceil(
    (vencimiento.getTime() -
      hoy.getTime()) /
      DIA_MS
  );

  if (dias < 0) {
    return {
      codigo: "denegado",
      etiqueta: "Membresía vencida",
      permitido: false,
      detalle: `Venció el ${formatoFecha(
        membresia.fecha_vencimiento
      )}.`,
    };
  }

  if (dias <= 7) {
    return {
      codigo: "aviso",
      etiqueta:
        dias === 0
          ? "Vence hoy"
          : dias === 1
          ? "Vence mañana"
          : `Vence en ${dias} días`,
      permitido: true,
      detalle:
        "Puede ingresar, pero requiere seguimiento de renovación.",
    };
  }

  return {
    codigo: "permitido",
    etiqueta: "Acceso disponible",
    permitido: true,
    detalle:
      "La membresía está activa y vigente.",
  };
}

function limitesHoyPanama() {
  const partes = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Panama",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const year =
    partes.find(
      (parte) => parte.type === "year"
    )?.value || "";

  const month =
    partes.find(
      (parte) => parte.type === "month"
    )?.value || "";

  const day =
    partes.find(
      (parte) => parte.type === "day"
    )?.value || "";

  const fecha = `${year}-${month}-${day}`;

  const inicio = new Date(
    `${fecha}T00:00:00-05:00`
  );

  const fin = new Date(
    inicio.getTime() + DIA_MS
  );

  return {
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
  };
}

function colorResultado(resultado) {
  const codigo = normalizar(resultado);

  if (
    codigo === "permitido"
  ) {
    return {
      fondo: "#e9f8ef",
      borde: "#8ed0a7",
      texto: "#14683e",
    };
  }

  if (codigo === "aviso") {
    return {
      fondo: "#fff8df",
      borde: "#e5c562",
      texto: "#8a5d00",
    };
  }

  return {
    fondo: "#fff0ee",
    borde: "#efaaa2",
    texto: "#b42318",
  };
}

export default function CheckInGimnasio() {
  const router = useRouter();

  const [empresaId, setEmpresaId] =
    useState("");
  const [empresaNombre, setEmpresaNombre] =
    useState("");
  const [usuarioNombre, setUsuarioNombre] =
    useState("");

  const [clientes, setClientes] =
    useState([]);
  const [suscripciones, setSuscripciones] =
    useState([]);
  const [asistencias, setAsistencias] =
    useState([]);

  const [busqueda, setBusqueda] =
    useState("");
  const [clienteId, setClienteId] =
    useState("");
  const [mostrarResultados, setMostrarResultados] =
    useState(false);

  const [observacion, setObservacion] =
    useState("");
  const [resultadoRegistro, setResultadoRegistro] =
    useState(null);

  const [cargando, setCargando] =
    useState(true);
  const [registrando, setRegistrando] =
    useState(false);
  const [errorGeneral, setErrorGeneral] =
    useState("");

  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    setCargando(true);
    setErrorGeneral("");

    const empresaSesion =
      localStorage.getItem("empresaId");

    const usuarioSesion =
      localStorage.getItem("usuarioId");

    if (
      !empresaSesion ||
      !usuarioSesion
    ) {
      localStorage.clear();
      router.replace("/login");
      return;
    }

    const [
      respuestaUsuario,
      respuestaEmpresa,
    ] = await Promise.all([
      supabase
        .from("usuarios")
        .select(
          "id, empresa_id, nombre, estado"
        )
        .eq("id", usuarioSesion)
        .maybeSingle(),

      supabase
        .from("empresas")
        .select(
          "id, nombre, tipo_negocio, categoria_negocio, estado"
        )
        .eq("id", empresaSesion)
        .maybeSingle(),
    ]);

    if (
      respuestaUsuario.error ||
      respuestaEmpresa.error ||
      !respuestaUsuario.data ||
      !respuestaEmpresa.data
    ) {
      setErrorGeneral(
        respuestaUsuario.error?.message ||
          respuestaEmpresa.error?.message ||
          "No se pudo validar la sesión."
      );
      setCargando(false);
      return;
    }

    const usuario =
      respuestaUsuario.data;

    const empresa =
      respuestaEmpresa.data;

    if (
      String(usuario.empresa_id) !==
        String(empresaSesion) ||
      normalizar(usuario.estado) !==
        "activo"
    ) {
      localStorage.clear();
      router.replace("/login");
      return;
    }

    const perfil = normalizar(
      `${empresa.tipo_negocio || ""} ${
        empresa.categoria_negocio || ""
      }`
    );

    const esGimnasio = [
      "gimnasio",
      "gym",
      "fitness",
      "academia",
      "club",
    ].some((palabra) =>
      perfil.includes(palabra)
    );

    if (!esGimnasio) {
      setErrorGeneral(
        "La pantalla de check-in está disponible únicamente para empresas con perfil gimnasio."
      );
      setCargando(false);
      return;
    }

    setEmpresaId(empresaSesion);
    setEmpresaNombre(
      empresa.nombre || "Gimnasio"
    );
    setUsuarioNombre(
      usuario.nombre || "Usuario"
    );

    await cargarDatos(empresaSesion);

    const parametros =
      new URLSearchParams(
        window.location.search
      );

    const clienteParametro =
      parametros.get("clienteId") || "";

    if (clienteParametro) {
      setClienteId(clienteParametro);
    }

    setCargando(false);
  }

  async function cargarDatos(idEmpresa) {
    const [
      respuestaClientes,
      respuestaSuscripciones,
    ] = await Promise.all([
      supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", idEmpresa)
        .order("nombre", {
          ascending: true,
        }),

      supabase
        .from("suscripciones")
        .select("*")
        .eq("empresa_id", idEmpresa),
    ]);

    if (respuestaClientes.error) {
      throw new Error(
        "No se pudieron cargar los alumnos: " +
          respuestaClientes.error.message
      );
    }

    if (
      respuestaSuscripciones.error
    ) {
      throw new Error(
        "No se pudieron cargar las membresías: " +
          respuestaSuscripciones.error.message
      );
    }

    setClientes(
      respuestaClientes.data || []
    );

    setSuscripciones(
      respuestaSuscripciones.data || []
    );

    await cargarAsistenciasHoy(
      idEmpresa,
      respuestaClientes.data || []
    );
  }

  async function cargarAsistenciasHoy(
    idEmpresa = empresaId,
    clientesActuales = clientes
  ) {
    if (!idEmpresa) return;

    const { inicio, fin } =
      limitesHoyPanama();

    const { data, error } =
      await supabase
        .from("gimnasio_asistencias")
        .select("*")
        .eq("empresa_id", idEmpresa)
        .gte("fecha_hora", inicio)
        .lt("fecha_hora", fin)
        .order("fecha_hora", {
          ascending: false,
        });

    if (error) {
      setErrorGeneral(
        "No se pudieron cargar las entradas. Ejecute primero el SQL del check-in. Detalle: " +
          error.message
      );
      setAsistencias([]);
      return;
    }

    const mapaClientes =
      new Map(
        clientesActuales.map(
          (cliente) => [
            String(cliente.id),
            cliente,
          ]
        )
      );

    setAsistencias(
      (data || []).map(
        (registro) => ({
          ...registro,
          cliente:
            mapaClientes.get(
              String(
                registro.cliente_id
              )
            ) || null,
        })
      )
    );
  }

  const membresiaPorCliente =
    useMemo(() => {
      const mapa = new Map();

      const ordenadas = [
        ...suscripciones,
      ].sort((a, b) => {
        const activaA = [
          "activo",
          "activa",
        ].includes(
          normalizar(a.estado)
        )
          ? 0
          : 1;

        const activaB = [
          "activo",
          "activa",
        ].includes(
          normalizar(b.estado)
        )
          ? 0
          : 1;

        if (activaA !== activaB) {
          return activaA - activaB;
        }

        const fechaA =
          fechaLocal(
            a.fecha_vencimiento
          )?.getTime() || 0;

        const fechaB =
          fechaLocal(
            b.fecha_vencimiento
          )?.getTime() || 0;

        return fechaB - fechaA;
      });

      ordenadas.forEach(
        (membresia) => {
          const clave = String(
            membresia.cliente_id || ""
          );

          if (
            clave &&
            !mapa.has(clave)
          ) {
            mapa.set(
              clave,
              membresia
            );
          }
        }
      );

      return mapa;
    }, [suscripciones]);

  const alumnos = useMemo(
    () =>
      clientes.map((cliente) => {
        const membresia =
          membresiaPorCliente.get(
            String(cliente.id)
          ) || null;

        return {
          id: cliente.id,
          nombre:
            obtenerNombre(cliente),
          documento:
            obtenerDocumento(cliente),
          telefono:
            obtenerTelefono(cliente),
          estadoCliente:
            cliente.estado,
          membresia,
          plan: membresia
            ? obtenerNombrePlan(
                membresia
              )
            : "Sin plan",
          evaluacion:
            evaluarMembresia(
              membresia,
              cliente.estado
            ),
          textoBusqueda:
            normalizar(
              [
                obtenerNombre(cliente),
                obtenerDocumento(cliente),
                obtenerTelefono(cliente),
              ]
                .filter(Boolean)
                .join(" ")
            ),
        };
      }),
    [
      clientes,
      membresiaPorCliente,
    ]
  );

  const alumnoSeleccionado =
    useMemo(
      () =>
        alumnos.find(
          (alumno) =>
            String(alumno.id) ===
            String(clienteId)
        ) || null,
      [alumnos, clienteId]
    );

  useEffect(() => {
    if (
      alumnoSeleccionado &&
      !busqueda
    ) {
      setBusqueda(
        alumnoSeleccionado.nombre
      );
    }
  }, [
    alumnoSeleccionado,
    busqueda,
  ]);

  const resultados = useMemo(() => {
    const texto =
      normalizar(busqueda);

    if (!texto) return [];

    return alumnos
      .filter((alumno) =>
        alumno.textoBusqueda.includes(
          texto
        )
      )
      .slice(0, 8);
  }, [alumnos, busqueda]);

  const resumenHoy = useMemo(() => {
    const permitidas =
      asistencias.filter(
        (registro) =>
          registro.permitido
      ).length;

    const denegadas =
      asistencias.filter(
        (registro) =>
          !registro.permitido
      ).length;

    const alumnosUnicos =
      new Set(
        asistencias
          .filter(
            (registro) =>
              registro.permitido
          )
          .map(
            (registro) =>
              registro.cliente_id
          )
      ).size;

    return {
      permitidas,
      denegadas,
      alumnosUnicos,
    };
  }, [asistencias]);

  function seleccionarAlumno(alumno) {
    setClienteId(alumno.id);
    setBusqueda(alumno.nombre);
    setMostrarResultados(false);
    setResultadoRegistro(null);
    setObservacion("");
  }

  function limpiarSeleccion() {
    setClienteId("");
    setBusqueda("");
    setMostrarResultados(false);
    setResultadoRegistro(null);
    setObservacion("");
  }

  async function registrarEntrada() {
    if (!alumnoSeleccionado) {
      alert(
        "Seleccione un alumno."
      );
      return;
    }

    if (registrando) return;

    setRegistrando(true);
    setResultadoRegistro(null);

    const { data, error } =
      await supabase.rpc(
        "registrar_checkin_gimnasio",
        {
          p_empresa_id: empresaId,
          p_cliente_id:
            alumnoSeleccionado.id,
          p_observacion:
            observacion.trim() ||
            null,
          p_origen: "Recepción",
        }
      );

    if (error) {
      setRegistrando(false);
      alert(
        "No se pudo registrar el check-in: " +
          error.message
      );
      return;
    }

    setResultadoRegistro(data);
    setRegistrando(false);

    await cargarAsistenciasHoy(
      empresaId,
      clientes
    );
  }

  if (cargando) {
    return (
      <div style={s.cargando}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={s.cargandoLogo}
        />

        <strong>
          Preparando check-in...
        </strong>
      </div>
    );
  }

  if (errorGeneral && !empresaId) {
    return (
      <main style={s.errorPagina}>
        <section style={s.errorCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={s.errorLogo}
          />

          <h1>
            No se pudo abrir el check-in
          </h1>

          <p>{errorGeneral}</p>

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            style={s.botonOscuro}
          >
            Volver al Dashboard
          </button>
        </section>
      </main>
    );
  }

  const coloresSeleccion =
    alumnoSeleccionado
      ? colorResultado(
          alumnoSeleccionado
            .evaluacion.codigo
        )
      : null;

  const coloresRegistro =
    resultadoRegistro
      ? colorResultado(
          resultadoRegistro.resultado
        )
      : null;

  return (
    <main style={s.pagina} className="checkin-page">
      <style>{`
        @media (max-width: 900px), (max-device-width: 900px), (pointer: coarse) {
          html,
          body {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          .checkin-page {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 10px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          .checkin-contenedor {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }

          .checkin-encabezado {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 16px !important;
            margin-bottom: 12px !important;
            display: grid !important;
            grid-template-columns: minmax(0,1fr) !important;
            align-items: stretch !important;
            gap: 14px !important;
            border-radius: 18px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .checkin-marca {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: minmax(0,1fr) !important;
            align-items: start !important;
            gap: 11px !important;
          }

          .checkin-marca > div {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }

          .checkin-marca img {
            width: 150px !important;
            max-width: 55vw !important;
            height: auto !important;
            justify-self: start !important;
          }

          .checkin-marca h1 {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            font-size: 31px !important;
            line-height: 1.02 !important;
            letter-spacing: -.7px !important;
            overflow-wrap: anywhere !important;
            word-break: normal !important;
          }

          .checkin-marca p {
            width: 100% !important;
            max-width: 100% !important;
            margin-top: 7px !important;
            font-size: 11px !important;
            line-height: 1.35 !important;
            overflow-wrap: anywhere !important;
          }

          .checkin-encabezado-acciones {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: minmax(0,1fr) minmax(120px,auto) !important;
            gap: 9px !important;
            align-items: stretch !important;
          }

          .checkin-encabezado-acciones > * {
            min-width: 0 !important;
            max-width: 100% !important;
          }

          .checkin-indicadores {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
            gap: 9px !important;
            margin-bottom: 12px !important;
          }

          .checkin-indicadores > article {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 96px !important;
            padding: 13px !important;
            grid-template-columns: 38px minmax(0,1fr) !important;
            gap: 9px !important;
            box-sizing: border-box !important;
          }

          .checkin-indicadores > article:last-child {
            grid-column: 1 / -1 !important;
          }

          .checkin-grid-principal {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }

          .checkin-panel {
            order: 1 !important;
          }

          .checkin-actividad {
            order: 2 !important;
          }

          .checkin-panel,
          .checkin-actividad {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 0 !important;
            padding: 14px !important;
            border-radius: 17px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .checkin-panel h2,
          .checkin-actividad h2 {
            max-width: 100% !important;
            font-size: 21px !important;
            line-height: 1.1 !important;
            overflow-wrap: anywhere !important;
          }

          .checkin-datos {
            width: 100% !important;
            max-width: 100% !important;
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          .checkin-resultado-item {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: 38px minmax(0,1fr) !important;
            box-sizing: border-box !important;
          }

          .checkin-resultado-item > span:last-child {
            grid-column: 2 !important;
            max-width: 100% !important;
            text-align: left !important;
          }

          .checkin-page input,
          .checkin-page select,
          .checkin-page textarea,
          .checkin-page button {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .checkin-page input,
          .checkin-page textarea {
            font-size: 16px !important;
          }

          .checkin-actividad > div:first-child {
            align-items: center !important;
          }

          .checkin-actividad button {
            min-width: 94px !important;
          }
        }

        @media (max-width: 390px), (max-device-width: 390px) {
          .checkin-encabezado-acciones {
            grid-template-columns: 1fr !important;
          }

          .checkin-marca h1 {
            font-size: 28px !important;
          }

          .checkin-indicadores {
            grid-template-columns: 1fr !important;
          }

          .checkin-indicadores > article:last-child {
            grid-column: auto !important;
          }
        }
      `}</style>
      <div style={s.contenedor} className="checkin-contenedor">
        <header style={s.encabezado} className="checkin-encabezado">
          <div style={s.marca} className="checkin-marca">
            <img
              src="/konax-logo.png"
              alt="KONAX"
              style={s.logo}
            />

            <div>
              <span style={s.etiqueta}>
                CONTROL DE ACCESO
              </span>

              <h1 style={s.titulo}>
                Check-in del gimnasio
              </h1>

              <p style={s.subtitulo}>
                {empresaNombre} · recepción y
                validación de membresías
              </p>
            </div>
          </div>

          <div style={s.encabezadoAcciones} className="checkin-encabezado-acciones">
            <div style={s.usuario}>
              <span>Recepción</span>
              <strong>
                {usuarioNombre}
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard")
              }
              style={s.botonClaro}
            >
              ← Dashboard
            </button>
          </div>
        </header>

        {errorGeneral && (
          <div style={s.avisoError}>
            {errorGeneral}
          </div>
        )}

        <section style={s.indicadores} className="checkin-indicadores">
          <Indicador
            titulo="Entradas hoy"
            valor={
              resumenHoy.permitidas
            }
            detalle="Accesos permitidos"
            icono="✓"
          />

          <Indicador
            titulo="Alumnos hoy"
            valor={
              resumenHoy.alumnosUnicos
            }
            detalle="Personas diferentes"
            icono="👥"
          />

          <Indicador
            titulo="Denegados"
            valor={
              resumenHoy.denegadas
            }
            detalle="Intentos no autorizados"
            icono="!"
          />
        </section>

        <section style={s.gridPrincipal} className="checkin-grid-principal">
          <article style={s.panelCheckin} className="checkin-panel">
            <div style={s.panelTitulo}>
              <div>
                <span style={s.miniEtiqueta}>
                  CHECK-IN MANUAL
                </span>

                <h2 style={s.subtituloPanel}>
                  Buscar y validar alumno
                </h2>
              </div>

              {alumnoSeleccionado && (
                <button
                  type="button"
                  onClick={limpiarSeleccion}
                  style={s.limpiar}
                >
                  Limpiar
                </button>
              )}
            </div>

            <div style={s.buscadorWrap}>
              <div style={s.buscador}>
                <span style={s.iconoBuscar}>
                  ⌕
                </span>

                <input
                  value={busqueda}
                  onFocus={() =>
                    setMostrarResultados(
                      true
                    )
                  }
                  onChange={(event) => {
                    setBusqueda(
                      event.target.value
                    );
                    setMostrarResultados(
                      true
                    );

                    if (
                      alumnoSeleccionado &&
                      event.target.value !==
                        alumnoSeleccionado.nombre
                    ) {
                      setClienteId("");
                      setResultadoRegistro(
                        null
                      );
                    }
                  }}
                  placeholder="Nombre, teléfono o cédula"
                  style={s.inputBusqueda}
                  autoComplete="off"
                />
              </div>

              {mostrarResultados &&
                busqueda.trim() && (
                  <div style={s.resultados}>
                    {resultados.length >
                    0 ? (
                      resultados.map(
                        (alumno) => (
                          <button
                            key={alumno.id}
                            type="button"
                            onClick={() =>
                              seleccionarAlumno(
                                alumno
                              )
                            }
                            style={
                              s.resultadoItem
                            }
                            className="checkin-resultado-item"
                          >
                            <span
                              style={
                                s.resultadoAvatar
                              }
                            >
                              {alumno.nombre
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <span
                              style={
                                s.resultadoTexto
                              }
                            >
                              <strong>
                                {
                                  alumno.nombre
                                }
                              </strong>

                              <small>
                                {[
                                  alumno.documento,
                                  alumno.telefono,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(" · ") ||
                                  "Sin identificación"}
                              </small>
                            </span>

                            <span
                              style={{
                                ...s.estadoPequeno,
                                color:
                                  colorResultado(
                                    alumno
                                      .evaluacion
                                      .codigo
                                  ).texto,
                              }}
                            >
                              {
                                alumno
                                  .evaluacion
                                  .etiqueta
                              }
                            </span>
                          </button>
                        )
                      )
                    ) : (
                      <div
                        style={
                          s.sinResultados
                        }
                      >
                        No se encontró el alumno.
                      </div>
                    )}
                  </div>
                )}
            </div>

            {!alumnoSeleccionado ? (
              <div style={s.vacio}>
                <span style={s.vacioIcono}>
                  👤
                </span>

                <strong>
                  Selecciona un alumno
                </strong>

                <p>
                  KONAX validará su membresía
                  antes de registrar la entrada.
                </p>
              </div>
            ) : (
              <div style={s.ficha}>
                <div style={s.identidad}>
                  <span style={s.avatarGrande}>
                    {alumnoSeleccionado.nombre
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <div>
                    <h3 style={s.nombreAlumno}>
                      {
                        alumnoSeleccionado.nombre
                      }
                    </h3>

                    <p style={s.contacto}>
                      {[
                        alumnoSeleccionado.documento,
                        alumnoSeleccionado.telefono,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        "Sin identificación"}
                    </p>
                  </div>
                </div>

                <div style={s.datos} className="checkin-datos">
                  <Dato
                    etiqueta="Plan"
                    valor={
                      alumnoSeleccionado.plan
                    }
                  />

                  <Dato
                    etiqueta="Vencimiento"
                    valor={
                      alumnoSeleccionado
                        .membresia
                        ?.fecha_vencimiento
                        ? formatoFecha(
                            alumnoSeleccionado
                              .membresia
                              .fecha_vencimiento
                          )
                        : "Sin fecha"
                    }
                  />

                  <Dato
                    etiqueta="Estado"
                    valor={
                      alumnoSeleccionado
                        .membresia
                        ?.estado ||
                      "Sin membresía"
                    }
                  />
                </div>

                <div
                  style={{
                    ...s.validacion,
                    background:
                      coloresSeleccion.fondo,
                    borderColor:
                      coloresSeleccion.borde,
                    color:
                      coloresSeleccion.texto,
                  }}
                >
                  <strong>
                    {
                      alumnoSeleccionado
                        .evaluacion
                        .etiqueta
                    }
                  </strong>

                  <span>
                    {
                      alumnoSeleccionado
                        .evaluacion
                        .detalle
                    }
                  </span>
                </div>

                <textarea
                  value={observacion}
                  onChange={(event) =>
                    setObservacion(
                      event.target.value
                    )
                  }
                  placeholder="Observación opcional"
                  style={s.textarea}
                />

                <button
                  type="button"
                  onClick={
                    registrarEntrada
                  }
                  disabled={registrando}
                  style={{
                    ...s.botonRegistrar,
                    ...(alumnoSeleccionado
                      .evaluacion.permitido
                      ? s.botonPermitido
                      : s.botonDenegado),
                    ...(registrando
                      ? s.botonDeshabilitado
                      : {}),
                  }}
                >
                  {registrando
                    ? "Validando..."
                    : alumnoSeleccionado
                        .evaluacion
                        .permitido
                    ? "✓ Validar y registrar entrada"
                    : "! Validar intento de acceso"}
                </button>
              </div>
            )}

            {resultadoRegistro && (
              <div
                style={{
                  ...s.resultadoGrande,
                  background:
                    coloresRegistro.fondo,
                  borderColor:
                    coloresRegistro.borde,
                  color:
                    coloresRegistro.texto,
                }}
              >
                <span style={s.resultadoIcono}>
                  {resultadoRegistro.permitido
                    ? "✓"
                    : "!"}
                </span>

                <div>
                  <strong style={s.resultadoTitulo}>
                    {resultadoRegistro.duplicado
                      ? "Entrada ya registrada"
                      : resultadoRegistro.permitido
                      ? "Acceso permitido"
                      : "Acceso denegado"}
                  </strong>

                  <p style={s.resultadoMotivo}>
                    {
                      resultadoRegistro.motivo
                    }
                  </p>

                  <small>
                    {formatoHora(
                      resultadoRegistro.fecha_hora
                    )}
                  </small>
                </div>
              </div>
            )}
          </article>

          <aside style={s.panelActividad} className="checkin-actividad">
            <div style={s.panelTitulo}>
              <div>
                <span style={s.miniEtiqueta}>
                  ACTIVIDAD DE HOY
                </span>

                <h2 style={s.subtituloPanel}>
                  Últimos registros
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  cargarAsistenciasHoy()
                }
                style={s.actualizar}
              >
                Actualizar
              </button>
            </div>

            <div style={s.lista}>
              {asistencias
                .slice(0, 15)
                .map((registro) => {
                  const colores =
                    colorResultado(
                      registro.resultado
                    );

                  const nombre =
                    obtenerNombre(
                      registro.cliente ||
                        {}
                    );

                  return (
                    <div
                      key={registro.id}
                      style={s.actividadItem}
                    >
                      <span
                        style={{
                          ...s.actividadEstado,
                          background:
                            colores.fondo,
                          color:
                            colores.texto,
                        }}
                      >
                        {registro.permitido
                          ? "✓"
                          : "!"}
                      </span>

                      <div
                        style={
                          s.actividadTexto
                        }
                      >
                        <strong>
                          {nombre}
                        </strong>

                        <small>
                          {registro.resultado}
                          {" · "}
                          {registro.estado_membresia ||
                            "-"}
                        </small>
                      </div>

                      <span
                        style={
                          s.actividadHora
                        }
                      >
                        {formatoHora(
                          registro.fecha_hora
                        )}
                      </span>
                    </div>
                  );
                })}

              {asistencias.length === 0 && (
                <div style={s.listaVacia}>
                  No hay entradas registradas
                  hoy.
                </div>
              )}
            </div>
          </aside>
        </section>

        <footer style={s.footer}>
          Versión: {VERSION_CHECKIN}
        </footer>
      </div>
    </main>
  );
}

function Indicador({
  titulo,
  valor,
  detalle,
  icono,
}) {
  return (
    <article style={s.indicador}>
      <span style={s.indicadorIcono}>
        {icono}
      </span>

      <div>
        <span style={s.indicadorTitulo}>
          {titulo}
        </span>

        <strong style={s.indicadorValor}>
          {valor}
        </strong>

        <small style={s.indicadorDetalle}>
          {detalle}
        </small>
      </div>
    </article>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <div style={s.dato}>
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  );
}

const s = {
  pagina: {
    minHeight: "100vh",
    padding: 26,
    background:
      "radial-gradient(circle at top right,rgba(22,131,79,.11),transparent 30%),#f2f6f3",
    color: "#142019",
    fontFamily:
      'Inter,system-ui,"Segoe UI",sans-serif',
  },

  contenedor: {
    maxWidth: 1440,
    margin: "0 auto",
  },

  cargando: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 14,
    background: "#f2f6f3",
  },

  cargandoLogo: {
    width: 220,
  },

  errorPagina: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "#f2f6f3",
  },

  errorCard: {
    width: "min(560px,100%)",
    padding: 30,
    border: "1px solid #dfe7e2",
    borderRadius: 22,
    background: "#fff",
    textAlign: "center",
  },

  errorLogo: {
    width: 210,
  },

  encabezado: {
    marginBottom: 16,
    padding: "20px 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    borderRadius: 22,
    background:
      "linear-gradient(135deg,#0e2418,#174d30)",
    color: "#fff",
    boxShadow:
      "0 18px 44px rgba(17,60,38,.15)",
  },

  marca: {
    display: "flex",
    alignItems: "center",
    gap: 18,
  },

  logo: {
    width: 170,
    padding: 8,
    borderRadius: 14,
    background: "#fff",
  },

  etiqueta: {
    display: "block",
    marginBottom: 5,
    color: "#8ce6b1",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.3,
  },

  titulo: {
    margin: 0,
    fontSize:
      "clamp(28px,4vw,42px)",
    lineHeight: 1.05,
  },

  subtitulo: {
    margin: "6px 0 0",
    color: "#d6e9dd",
    fontSize: 12,
  },

  encabezadoAcciones: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  usuario: {
    padding: "9px 12px",
    display: "grid",
    gap: 2,
    border:
      "1px solid rgba(255,255,255,.15)",
    borderRadius: 12,
    background:
      "rgba(255,255,255,.07)",
    fontSize: 10,
  },

  botonClaro: {
    minHeight: 42,
    padding: "9px 14px",
    border:
      "1px solid rgba(255,255,255,.18)",
    borderRadius: 11,
    background:
      "rgba(255,255,255,.08)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },

  botonOscuro: {
    minHeight: 43,
    padding: "9px 15px",
    border: 0,
    borderRadius: 11,
    background: "#173c2a",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },

  avisoError: {
    marginBottom: 14,
    padding: 13,
    border: "1px solid #efaaa2",
    borderRadius: 12,
    background: "#fff0ee",
    color: "#b42318",
    fontSize: 12,
  },

  indicadores: {
    marginBottom: 16,
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: 12,
  },

  indicador: {
    minHeight: 105,
    padding: 17,
    display: "grid",
    gridTemplateColumns:
      "44px minmax(0,1fr)",
    alignItems: "center",
    gap: 12,
    border: "1px solid #dfe7e2",
    borderRadius: 17,
    background: "#fff",
    boxShadow:
      "0 9px 22px rgba(24,54,37,.05)",
  },

  indicadorIcono: {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#eaf8ef",
    color: "#16834f",
    fontSize: 19,
    fontWeight: 900,
  },

  indicadorTitulo: {
    display: "block",
    color: "#6e7d74",
    fontSize: 10,
    fontWeight: 800,
  },

  indicadorValor: {
    display: "block",
    marginTop: 4,
    fontSize: 26,
    lineHeight: 1,
  },

  indicadorDetalle: {
    display: "block",
    marginTop: 6,
    color: "#87928b",
    fontSize: 9,
  },

  gridPrincipal: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1.45fr) minmax(330px,.65fr)",
    gap: 15,
    alignItems: "start",
  },

  panelCheckin: {
    minHeight: 540,
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background: "#fff",
    boxShadow:
      "0 10px 28px rgba(24,54,37,.05)",
  },

  panelActividad: {
    minHeight: 540,
    padding: 20,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background:
      "linear-gradient(180deg,#fff,#f4f8f5)",
  },

  panelTitulo: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  miniEtiqueta: {
    display: "block",
    color: "#16834f",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },

  subtituloPanel: {
    margin: "5px 0 14px",
    fontSize: 22,
  },

  limpiar: {
    minHeight: 36,
    padding: "8px 11px",
    border: "1px solid #d7e0da",
    borderRadius: 10,
    background: "#f8faf9",
    color: "#536158",
    fontWeight: 800,
    cursor: "pointer",
  },

  buscadorWrap: {
    position: "relative",
    zIndex: 20,
  },

  buscador: {
    minHeight: 54,
    padding: "0 14px",
    display: "grid",
    gridTemplateColumns:
      "28px minmax(0,1fr)",
    alignItems: "center",
    gap: 8,
    border: "2px solid #b9dcc7",
    borderRadius: 15,
    background: "#fbfefc",
  },

  iconoBuscar: {
    color: "#16834f",
    fontSize: 24,
  },

  inputBusqueda: {
    width: "100%",
    height: 50,
    border: 0,
    outline: "none",
    background: "transparent",
    fontSize: 15,
  },

  resultados: {
    position: "absolute",
    top: "calc(100% + 7px)",
    left: 0,
    right: 0,
    maxHeight: 330,
    overflowY: "auto",
    padding: 7,
    display: "grid",
    gap: 5,
    border: "1px solid #d7e0da",
    borderRadius: 14,
    background: "#fff",
    boxShadow:
      "0 18px 44px rgba(15,23,42,.16)",
  },

  resultadoItem: {
    width: "100%",
    minHeight: 58,
    padding: 9,
    display: "grid",
    gridTemplateColumns:
      "38px minmax(0,1fr) auto",
    alignItems: "center",
    gap: 10,
    border: 0,
    borderRadius: 10,
    background: "#fff",
    color: "#142019",
    textAlign: "left",
    cursor: "pointer",
  },

  resultadoAvatar: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#eaf8ef",
    color: "#16834f",
    fontWeight: 900,
  },

  resultadoTexto: {
    minWidth: 0,
    display: "grid",
    gap: 3,
  },

  estadoPequeno: {
    maxWidth: 120,
    fontSize: 9,
    fontWeight: 900,
    textAlign: "right",
  },

  sinResultados: {
    padding: 16,
    color: "#748078",
    fontSize: 12,
    textAlign: "center",
  },

  vacio: {
    minHeight: 310,
    marginTop: 16,
    padding: 25,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 9,
    border: "1px dashed #cfdcd4",
    borderRadius: 17,
    background: "#f8fbf9",
    textAlign: "center",
  },

  vacioIcono: {
    width: 58,
    height: 58,
    display: "grid",
    placeItems: "center",
    borderRadius: 17,
    background: "#eaf8ef",
    fontSize: 25,
  },

  ficha: {
    marginTop: 16,
    padding: 20,
    border: "1px solid #dbe5df",
    borderRadius: 18,
    background:
      "linear-gradient(180deg,#fff,#f8fbf9)",
  },

  identidad: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  avatarGrande: {
    width: 54,
    height: 54,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#173c2a",
    color: "#fff",
    fontSize: 21,
    fontWeight: 900,
  },

  nombreAlumno: {
    margin: 0,
    fontSize: 21,
  },

  contacto: {
    margin: "5px 0 0",
    color: "#748078",
    fontSize: 11,
  },

  datos: {
    marginTop: 17,
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: 9,
  },

  dato: {
    padding: 12,
    display: "grid",
    gap: 5,
    border: "1px solid #e0e7e3",
    borderRadius: 12,
    background: "#fff",
    fontSize: 11,
  },

  validacion: {
    marginTop: 13,
    padding: 13,
    display: "grid",
    gap: 4,
    border: "1px solid",
    borderRadius: 12,
    fontSize: 11,
  },

  textarea: {
    width: "100%",
    minHeight: 72,
    marginTop: 13,
    padding: 11,
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    resize: "vertical",
    fontFamily: "inherit",
  },

  botonRegistrar: {
    width: "100%",
    minHeight: 52,
    marginTop: 12,
    border: 0,
    borderRadius: 13,
    color: "#fff",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
  },

  botonPermitido: {
    background:
      "linear-gradient(135deg,#16834f,#0f6a3d)",
  },

  botonDenegado: {
    background:
      "linear-gradient(135deg,#c0392b,#9e2c21)",
  },

  botonDeshabilitado: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  resultadoGrande: {
    marginTop: 14,
    padding: 16,
    display: "grid",
    gridTemplateColumns:
      "48px minmax(0,1fr)",
    alignItems: "center",
    gap: 12,
    border: "2px solid",
    borderRadius: 15,
  },

  resultadoIcono: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "rgba(255,255,255,.7)",
    fontSize: 24,
    fontWeight: 900,
  },

  resultadoTitulo: {
    display: "block",
    fontSize: 18,
  },

  resultadoMotivo: {
    margin: "5px 0",
    fontSize: 11,
    lineHeight: 1.45,
  },

  actualizar: {
    minHeight: 34,
    padding: "7px 10px",
    border: "1px solid #d7e0da",
    borderRadius: 9,
    background: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  lista: {
    display: "grid",
    gap: 7,
  },

  actividadItem: {
    minHeight: 61,
    padding: 10,
    display: "grid",
    gridTemplateColumns:
      "38px minmax(0,1fr) auto",
    alignItems: "center",
    gap: 9,
    border: "1px solid #e1e8e4",
    borderRadius: 12,
    background: "#fff",
  },

  actividadEstado: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    fontWeight: 900,
  },

  actividadTexto: {
    minWidth: 0,
    display: "grid",
    gap: 3,
  },

  actividadHora: {
    color: "#6d7a72",
    fontSize: 10,
    fontWeight: 800,
  },

  listaVacia: {
    minHeight: 150,
    display: "grid",
    placeItems: "center",
    border: "1px dashed #cfdcd4",
    borderRadius: 14,
    color: "#607067",
    fontSize: 12,
  },

  footer: {
    padding: "14px 4px 0",
    color: "#8a958e",
    fontSize: 9,
    textAlign: "right",
  },
};

