"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

const DIAS_PROXIMO_VENCER = 5;
const DIAS_GRACIA = 3;
const VERSION_SUSCRIPCIONES = "2026.08.06-I";

const FORMULARIO_INICIAL = {
  planId: "",
  fechaInicio: "",
  descripcion: "",
};

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fechaHoy() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function fechaLocal(fechaTexto) {
  if (!fechaTexto) return null;

  const [anio, mes, dia] = String(fechaTexto)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
}

function formatearFecha(fechaTexto) {
  if (!fechaTexto) return "-";

  const [anio, mes, dia] = String(fechaTexto)
    .slice(0, 10)
    .split("-");

  return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fechaTexto);
}

function sumarMesesFecha(fechaTexto, meses) {
  const fecha = fechaLocal(fechaTexto);
  if (!fecha) return "";

  const diaOriginal = fecha.getDate();
  fecha.setDate(1);
  fecha.setMonth(fecha.getMonth() + meses);

  const ultimoDiaMes = new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    0
  ).getDate();

  fecha.setDate(Math.min(diaOriginal, ultimoDiaMes));

  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function sumarDiasFecha(fechaTexto, dias) {
  const fecha = fechaLocal(fechaTexto);
  if (!fecha) return "";

  fecha.setDate(fecha.getDate() + dias);

  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0"),
  ].join("-");
}

function calcularVencimientoPorDuracion(fechaBase, cantidad, unidad) {
  const numero = Math.max(1, Number(cantidad || 1));

  switch (unidad) {
    case "Días":
      return sumarDiasFecha(fechaBase, numero);
    case "Semanas":
      return sumarDiasFecha(fechaBase, numero * 7);
    case "Años":
      return sumarMesesFecha(fechaBase, numero * 12);
    case "Meses":
    default:
      return sumarMesesFecha(fechaBase, numero);
  }
}

function calcularDiasParaVencer(fechaVencimiento) {
  const vence = fechaLocal(fechaVencimiento);
  const hoy = fechaLocal(fechaHoy());

  if (!vence || !hoy) return 0;

  return Math.ceil((vence.getTime() - hoy.getTime()) / 86400000);
}

function estadoNormalizado(estado) {
  return normalizar(estado);
}

function obtenerEstadoAutomatico(item) {
  const estadoGuardado = estadoNormalizado(item.estado);

  if (estadoGuardado === "cancelado") return "Cancelado";
  if (estadoGuardado === "suspendido") return "Suspendido";
  if (estadoGuardado === "pendiente") return "Pendiente";

  const diasAviso = Math.max(
    0,
    Number(item.dias_aviso ?? DIAS_PROXIMO_VENCER)
  );
  const diasGracia = Math.max(0, Number(item.dias_gracia ?? DIAS_GRACIA));
  const dias = calcularDiasParaVencer(item.fecha_vencimiento);

  if (dias < -diasGracia) return "Suspendido";
  if (dias < 0) return "Vencida";
  if (dias <= diasAviso) return "Próxima a vencer";
  return "Activo";
}

function limpiarTelefono(telefono) {
  const limpio = String(telefono || "").replace(/\D/g, "");

  if (!limpio) return "";
  if (limpio.startsWith("507")) return limpio;
  if (limpio.length === 8) return `507${limpio}`;
  return limpio;
}

function SuscripcionesContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clienteIdFlujo = searchParams.get("clienteId") || "";
  const modoParametro = searchParams.get("modo") || "";
  const flujoParametro = searchParams.get("flujo") || "";

  const modoCreacion =
    modoParametro === "nueva" ||
    flujoParametro === "nuevo" ||
    flujoParametro === "nueva_membresia" ||
    Boolean(clienteIdFlujo);

  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [suscripciones, setSuscripciones] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  const [busquedaMembresia, setBusquedaMembresia] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [buscarCliente, setBuscarCliente] = useState("");
  const [resultadosClientes, setResultadosClientes] = useState([]);
  const [formulario, setFormulario] = useState({
    ...FORMULARIO_INICIAL,
    fechaInicio: fechaHoy(),
  });

  useEffect(() => {
    inicializar();
  }, [clienteIdFlujo]);

  async function inicializar() {
    setCargando(true);

    const id = localStorage.getItem("empresaId");

    if (!id) {
      alert("No hay una empresa activa. Inicie sesión nuevamente.");
      router.replace("/login");
      return;
    }

    setEmpresaId(id);

    await Promise.all([
      cargarEmpresa(id),
      cargarPlanes(id),
      cargarSuscripciones(id),
    ]);

    if (modoCreacion && clienteIdFlujo) {
      await cargarClientePorId(id, clienteIdFlujo);
    }

    setCargando(false);
  }

  async function cargarEmpresa(id) {
    const nombreLocal =
      localStorage.getItem("empresaNombre") ||
      localStorage.getItem("empresaAdminCreadaNombre") ||
      "";

    const { data, error } = await supabase
      .from("empresas")
      .select("nombre")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(
        "No se pudo cargar el nombre del negocio:",
        error
      );

      setEmpresaNombre(
        nombreLocal || "Tu gimnasio"
      );
      return;
    }

    const nombreFinal =
      data?.nombre ||
      nombreLocal ||
      "Tu gimnasio";

    setEmpresaNombre(nombreFinal);
    localStorage.setItem(
      "empresaNombre",
      nombreFinal
    );
  }

  async function cargarPlanes(id = empresaId) {
    if (!id) return;

    const { data, error } = await supabase
      .from("planes_membresia")
      .select("*")
      .eq("empresa_id", id)
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando planes de membresía: " + error.message);
      return;
    }

    setPlanes(data || []);
  }

  async function cargarSuscripciones(id = empresaId) {
    if (!id) return;

    const { data, error } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", id)
      .order("fecha_vencimiento", { ascending: true });

    if (error) {
      alert("Error cargando membresías: " + error.message);
      return;
    }

    const lista = data || [];
    const idsClientes = [...new Set(lista.map((item) => item.cliente_id).filter(Boolean))];

    let clientes = [];

    if (idsClientes.length > 0) {
      const { data: clientesData, error: errorClientes } = await supabase
        .from("clientes")
        .select("id, nombre, cedula, telefono, correo, estado")
        .eq("empresa_id", id)
        .in("id", idsClientes);

      if (errorClientes) {
        console.error("No se pudieron completar los datos de los alumnos:", errorClientes);
      } else {
        clientes = clientesData || [];
      }
    }

    const mapaClientes = new Map(clientes.map((cliente) => [String(cliente.id), cliente]));

    const enriquecidas = lista.map((item) => {
      const cliente = mapaClientes.get(String(item.cliente_id));

      return {
        ...item,
        cliente: item.cliente || cliente?.nombre || "Alumno",
        cedula: item.cedula || cliente?.cedula || "",
        telefono: cliente?.telefono || "",
        correo: cliente?.correo || "",
        estado_cliente: cliente?.estado || "",
      };
    });

    setSuscripciones(enriquecidas);
    await sincronizarEstadosAutomaticos(id, enriquecidas);
  }

  async function sincronizarEstadosAutomaticos(id, lista) {
    if (sincronizando || lista.length === 0) return;

    const cambios = lista.filter((item) => {
      const actual = estadoNormalizado(item.estado);
      const calculado = estadoNormalizado(obtenerEstadoAutomatico(item));
      return actual !== calculado;
    });

    if (cambios.length === 0) return;

    setSincronizando(true);

    try {
      await Promise.all(
        cambios.map(async (item) => {
          const nuevoEstado = obtenerEstadoAutomatico(item);

          const { error: errorSuscripcion } = await supabase
            .from("suscripciones")
            .update({ estado: nuevoEstado })
            .eq("id", item.id)
            .eq("empresa_id", id);

          if (errorSuscripcion) throw errorSuscripcion;

          if (item.informacion_comercial_id) {
            const payload = {
              estado: nuevoEstado,
              estado_servicio: nuevoEstado,
            };

            if (nuevoEstado === "Suspendido") {
              payload.fecha_suspension = fechaHoy();
              payload.motivo_suspension = "Suspensión automática por vencimiento";
            }

            if (["Activo", "Próxima a vencer"].includes(nuevoEstado)) {
              payload.fecha_suspension = null;
              payload.motivo_suspension = null;
            }

            const { error: errorComercial } = await supabase
              .from("informacion_comercial")
              .update(payload)
              .eq("id", item.informacion_comercial_id)
              .eq("empresa_id", id);

            if (errorComercial) {
              console.error("No se sincronizó la vista comercial:", errorComercial);
            }
          }
        })
      );

      setSuscripciones((actuales) =>
        actuales.map((item) => ({
          ...item,
          estado: obtenerEstadoAutomatico(item),
        }))
      );
    } catch (error) {
      console.error("No se pudieron sincronizar todos los estados:", error);
    } finally {
      setSincronizando(false);
    }
  }

  async function cargarClientePorId(id, clienteId) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, cedula, telefono, correo, estado")
      .eq("empresa_id", id)
      .eq("id", clienteId)
      .maybeSingle();

    if (error || !data) {
      alert(
        "No se pudo cargar el alumno: " +
          (error?.message || "Alumno no encontrado.")
      );
      return;
    }

    seleccionarCliente(data);
  }

  async function buscarClientes() {
    if (!empresaId) return;

    const texto = buscarCliente.trim();

    if (texto.length < 3) {
      alert("Escriba por lo menos tres caracteres.");
      return;
    }

    const textoSeguro = texto.replace(/[%_,()]/g, "");

    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, cedula, telefono, correo, estado")
      .eq("empresa_id", empresaId)
      .or(
        `nombre.ilike.%${textoSeguro}%,cedula.ilike.%${textoSeguro}%,telefono.ilike.%${textoSeguro}%`
      )
      .limit(12);

    if (error) {
      alert("Error buscando alumnos: " + error.message);
      return;
    }

    setResultadosClientes(data || []);
  }

  function seleccionarCliente(cliente) {
    setClienteSeleccionado(cliente);
    setBuscarCliente(cliente.nombre || cliente.cedula || "");
    setResultadosClientes([]);
  }

  const planSeleccionado = useMemo(
    () =>
      planes.find(
        (plan) => String(plan.id) === String(formulario.planId)
      ) || null,
    [planes, formulario.planId]
  );

  const fechaVencimientoNueva = useMemo(() => {
    if (!planSeleccionado || !formulario.fechaInicio) return "";

    return calcularVencimientoPorDuracion(
      formulario.fechaInicio,
      planSeleccionado.duracion_cantidad,
      planSeleccionado.duracion_unidad
    );
  }, [planSeleccionado, formulario.fechaInicio]);

  async function crearSuscripcion() {
    if (!empresaId || guardando) return;

    if (!clienteSeleccionado?.id) {
      alert("Seleccione un alumno registrado.");
      return;
    }

    if (!planSeleccionado) {
      alert("Seleccione un plan de membresía.");
      return;
    }

    if (!formulario.fechaInicio || !fechaVencimientoNueva) {
      alert("Seleccione una fecha de inicio válida.");
      return;
    }

    const membresiaExistente = suscripciones.find((item) => {
      if (String(item.cliente_id) !== String(clienteSeleccionado.id)) {
        return false;
      }

      return ["Activo", "Próxima a vencer", "Pendiente"].includes(
        obtenerEstadoAutomatico(item)
      );
    });

    if (membresiaExistente) {
      alert(
        `${clienteSeleccionado.nombre} ya tiene una membresía ${obtenerEstadoAutomatico(
          membresiaExistente
        ).toLowerCase()}. Revísela en el listado antes de crear otra.`
      );
      return;
    }

    const precio = Number(planSeleccionado.precio || 0);

    if (!Number.isFinite(precio) || precio <= 0) {
      alert("El plan seleccionado no tiene un precio válido.");
      return;
    }

    setGuardando(true);
    let comercialCreado = null;

    try {
      const numeroCuenta = `MEM-${Date.now()}`;
      const responsable =
        localStorage.getItem("usuarioNombre") ||
        localStorage.getItem("adminKonaxNombre") ||
        "Administración";

      const { data: comercial, error: errorComercial } = await supabase
        .from("informacion_comercial")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: clienteSeleccionado.id,
            plan_membresia_id: planSeleccionado.id,
            numero_cuenta: numeroCuenta,
            tipo_producto: "Membresía",
            descripcion: `${planSeleccionado.nombre} - ${
              formulario.descripcion || planSeleccionado.descripcion || ""
            }`,
            modalidad: planSeleccionado.periodicidad,
            monto_total: precio,
            saldo_actual: precio,
            cuota: precio,
            fecha_inicio: formulario.fechaInicio,
            fecha_vencimiento: fechaVencimientoNueva,
            responsable,
            estado: "Pendiente",
            estado_servicio: "Pendiente",
            observacion:
              formulario.descripcion.trim() ||
              planSeleccionado.descripcion ||
              null,
          },
        ])
        .select()
        .single();

      if (errorComercial) {
        throw new Error(
          "Error creando información comercial: " + errorComercial.message
        );
      }

      comercialCreado = comercial;

      const { data: suscripcionCreada, error: errorSuscripcion } = await supabase
        .from("suscripciones")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: clienteSeleccionado.id,
            informacion_comercial_id: comercial.id,
            plan_membresia_id: planSeleccionado.id,
            cliente: clienteSeleccionado.nombre,
            cedula: clienteSeleccionado.cedula || "",
            plan: planSeleccionado.nombre,
            tipo_servicio: "Membresía",
            descripcion:
              formulario.descripcion.trim() ||
              planSeleccionado.descripcion ||
              "",
            precio,
            vendedor: responsable,
            forma_pago: "Pendiente",
            fecha_inicio: formulario.fechaInicio,
            fecha_vencimiento: fechaVencimientoNueva,
            periodicidad: planSeleccionado.periodicidad,
            duracion_cantidad: Number(planSeleccionado.duracion_cantidad || 1),
            duracion_unidad: planSeleccionado.duracion_unidad || "Meses",
            dias_aviso: Number(planSeleccionado.dias_aviso ?? DIAS_PROXIMO_VENCER),
            dias_gracia: Number(planSeleccionado.dias_gracia ?? DIAS_GRACIA),
            estado: "Pendiente",
          },
        ])
        .select("id, cliente_id, informacion_comercial_id")
        .single();

      if (errorSuscripcion) {
        throw new Error("Error creando membresía: " + errorSuscripcion.message);
      }

      const { error: errorCliente } = await supabase
        .from("clientes")
        .update({ estado: "Activo" })
        .eq("id", clienteSeleccionado.id)
        .eq("empresa_id", empresaId);

      if (errorCliente) {
        console.error("La membresía se creó, pero no se actualizó el alumno:", errorCliente);
      }

      router.push(
        `/caja?clienteId=${encodeURIComponent(
          clienteSeleccionado.id
        )}&suscripcionId=${encodeURIComponent(
          suscripcionCreada.id
        )}&cuentaId=${encodeURIComponent(
          comercial.id
        )}&flujo=nueva_membresia`
      );
    } catch (error) {
      if (comercialCreado?.id) {
        await supabase
          .from("informacion_comercial")
          .delete()
          .eq("id", comercialCreado.id)
          .eq("empresa_id", empresaId);
      }

      alert(error.message || "No se pudo crear la membresía.");
    } finally {
      setGuardando(false);
    }
  }

  function irACaja(item) {
    if (!item?.cliente_id) {
      alert("La membresía no tiene un alumno vinculado.");
      return;
    }

    const parametros = new URLSearchParams({
      clienteId: String(item.cliente_id),
      suscripcionId: String(item.id),
      flujo: "renovacion",
    });

    if (item.informacion_comercial_id) {
      parametros.set("cuentaId", String(item.informacion_comercial_id));
    }

    router.push(`/caja?${parametros.toString()}`);
  }

  function abrirWhatsApp(item, mensaje) {
    const telefono = limpiarTelefono(item.telefono);

    if (!telefono) {
      alert("Este alumno no tiene teléfono registrado.");
      return;
    }

    window.open(
      `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function enviarRecordatorio(item) {
    const estado = obtenerEstadoAutomatico(item);
    const dias = calcularDiasParaVencer(item.fecha_vencimiento);

    const detalle =
      estado === "Próxima a vencer"
        ? dias === 0
          ? "vence hoy"
          : `vence en ${dias} ${dias === 1 ? "día" : "días"}`
        : `venció el ${formatearFecha(item.fecha_vencimiento)}`;

    const saludo = `Hola ${item.cliente || "cliente"} \u{1F44B}`;

    const firma =
      empresaNombre ||
      localStorage.getItem("empresaNombre") ||
      "Tu gimnasio";

    abrirWhatsApp(
      item,
      `${saludo}\n\nTe recordamos que tu membresía ${
        item.plan || ""
      } ${detalle}.\n\nMonto de renovación: B/. ${Number(
        item.precio || 0
      ).toFixed(
        2
      )}.\n\nPuedes realizar tu pago para mantener activo el servicio.\n\nGracias por preferirnos.\n${firma}`
    );
  }

  async function cambiarEstado(item, nuevoEstado) {
    if (!empresaId || guardando) return;

    if (!confirm(`¿Cambiar la membresía de ${item.cliente} a ${nuevoEstado}?`)) {
      return;
    }

    setGuardando(true);

    try {
      const { error: errorSuscripcion } = await supabase
        .from("suscripciones")
        .update({ estado: nuevoEstado })
        .eq("id", item.id)
        .eq("empresa_id", empresaId);

      if (errorSuscripcion) throw errorSuscripcion;

      if (item.informacion_comercial_id) {
        const payload = {
          estado: nuevoEstado,
          estado_servicio: nuevoEstado,
        };

        if (nuevoEstado === "Suspendido") {
          payload.fecha_suspension = fechaHoy();
          payload.motivo_suspension = "Suspensión manual";
        }

        if (nuevoEstado === "Activo") {
          payload.fecha_suspension = null;
          payload.fecha_cancelacion = null;
          payload.motivo_suspension = null;
        }

        const { error: errorComercial } = await supabase
          .from("informacion_comercial")
          .update(payload)
          .eq("id", item.informacion_comercial_id)
          .eq("empresa_id", empresaId);

        if (errorComercial) throw errorComercial;
      }

      await cargarSuscripciones(empresaId);
    } catch (error) {
      alert("No se pudo cambiar el estado: " + error.message);
    } finally {
      setGuardando(false);
    }
  }

  const resumen = useMemo(() => {
    const resultado = {
      activas: 0,
      proximas: 0,
      vencidas: 0,
      suspendidas: 0,
      pendientes: 0,
    };

    suscripciones.forEach((item) => {
      const estado = obtenerEstadoAutomatico(item);

      if (estado === "Activo") resultado.activas += 1;
      if (estado === "Próxima a vencer") resultado.proximas += 1;
      if (estado === "Vencida") resultado.vencidas += 1;
      if (estado === "Suspendido") resultado.suspendidas += 1;
      if (estado === "Pendiente") resultado.pendientes += 1;
    });

    return resultado;
  }, [suscripciones]);

  const proximosVencimientos = useMemo(
    () =>
      suscripciones
        .filter(
          (item) => obtenerEstadoAutomatico(item) === "Próxima a vencer"
        )
        .sort(
          (a, b) =>
            calcularDiasParaVencer(a.fecha_vencimiento) -
            calcularDiasParaVencer(b.fecha_vencimiento)
        ),
    [suscripciones]
  );

  const requierenAtencion = useMemo(
    () =>
      suscripciones
        .filter((item) =>
          ["Vencida", "Suspendido", "Pendiente"].includes(
            obtenerEstadoAutomatico(item)
          )
        )
        .sort(
          (a, b) =>
            calcularDiasParaVencer(a.fecha_vencimiento) -
            calcularDiasParaVencer(b.fecha_vencimiento)
        ),
    [suscripciones]
  );

  const membresiasFiltradas = useMemo(() => {
    const texto = normalizar(busquedaMembresia);

    return suscripciones
      .filter((item) => {
        const estado = obtenerEstadoAutomatico(item);

        const coincideTexto = normalizar(
          `${item.cliente} ${item.cedula} ${item.telefono} ${item.plan} ${estado}`
        ).includes(texto);

        const coincideEstado = filtroEstado === "Todos" || estado === filtroEstado;

        return coincideTexto && coincideEstado;
      })
      .sort((a, b) => {
        const prioridad = {
          Activo: 1,
          "Próxima a vencer": 2,
          Pendiente: 3,
          Vencida: 4,
          Suspendido: 5,
          Cancelado: 6,
        };

        return (
          (prioridad[obtenerEstadoAutomatico(a)] || 99) -
          (prioridad[obtenerEstadoAutomatico(b)] || 99)
        );
      });
  }, [suscripciones, busquedaMembresia, filtroEstado]);

  if (cargando) {
    return (
      <div style={s.loadingPage}>
        <img src="/konax-logo.png" alt="KONAX" style={s.loadingLogo} />
        <strong style={s.loadingTitle}>Preparando membresías</strong>
      </div>
    );
  }

  if (modoCreacion) {
    return (
      <main style={s.pagina} className="suscripciones-page">
        <div style={s.contenedorAngosto} className="suscripciones-contenedor-angosto">
          <header style={s.heroCompacto} className="suscripciones-hero">
            <div>
              <span style={s.etiqueta}>NUEVA MEMBRESÍA</span>
              <h1 style={s.tituloHero}>Asignar plan al alumno</h1>
              <p style={s.subtituloHero}>
                Selecciona el plan y continúa directamente a Caja.
              </p>
            </div>

            <button onClick={() => router.push("/suscripciones")} style={s.botonClaro}>
              ← Cancelar
            </button>
          </header>

          <div style={s.pasos}>
            <span style={s.pasoCompleto}>1. Alumno</span>
            <span style={s.pasoActivo}>2. Membresía</span>
            <span style={s.paso}>3. Caja</span>
          </div>

          <section style={s.card} className="suscripciones-card">
            <div style={s.cabeceraSeccion} className="suscripciones-cabecera">
              <div>
                <h2 style={s.tituloSeccion}>Alumno</h2>
                <p style={s.textoSeccion}>
                  Debe ser un alumno registrado previamente.
                </p>
              </div>
            </div>

            {!clienteSeleccionado ? (
              <>
                <div style={s.toolbar}>
                  <input
                    value={buscarCliente}
                    onChange={(e) => setBuscarCliente(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") buscarClientes();
                    }}
                    placeholder="Buscar por nombre, cédula o teléfono"
                    style={s.input}
                  />
                  <button onClick={buscarClientes} style={s.botonOscuro}>
                    Buscar
                  </button>
                </div>

                {resultadosClientes.length > 0 && (
                  <div style={s.resultados}>
                    {resultadosClientes.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => seleccionarCliente(cliente)}
                        style={s.resultado}
                      >
                        <strong>{cliente.nombre}</strong>
                        <span>{cliente.cedula || "Sin cédula"}</span>
                        <small>{cliente.telefono || "Sin teléfono"}</small>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={s.alumnoSeleccionado} className="suscripciones-alumno-seleccionado">
                <div style={s.avatar}>{String(clienteSeleccionado.nombre || "A").charAt(0)}</div>
                <div>
                  <strong style={s.nombreAlumno}>{clienteSeleccionado.nombre}</strong>
                  <span style={s.datoAlumno}>Cédula: {clienteSeleccionado.cedula || "-"}</span>
                  <span style={s.datoAlumno}>Teléfono: {clienteSeleccionado.telefono || "-"}</span>
                </div>
                <button
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setBuscarCliente("");
                  }}
                  style={s.botonSecundario}
                >
                  Cambiar
                </button>
              </div>
            )}
          </section>

          <section style={s.card} className="suscripciones-card">
            <div style={s.cabeceraSeccion}>
              <div>
                <h2 style={s.tituloSeccion}>Plan y vigencia</h2>
                <p style={s.textoSeccion}>
                  El pago se registrará en la siguiente pantalla.
                </p>
              </div>
            </div>

            {planes.length === 0 ? (
              <div style={s.avisoVacio}>
                No hay planes activos configurados para esta empresa.
              </div>
            ) : (
              <div style={s.gridFormulario} className="suscripciones-grid-formulario">
                <label style={s.campo}>
                  <span style={s.label}>Plan *</span>
                  <select
                    value={formulario.planId}
                    onChange={(e) =>
                      setFormulario((actual) => ({
                        ...actual,
                        planId: e.target.value,
                      }))
                    }
                    style={s.input}
                  >
                    <option value="">Seleccione un plan</option>
                    {planes.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} · B/. {Number(plan.precio || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={s.campo}>
                  <span style={s.label}>Fecha de inicio *</span>
                  <input
                    type="date"
                    value={formulario.fechaInicio}
                    onChange={(e) =>
                      setFormulario((actual) => ({
                        ...actual,
                        fechaInicio: e.target.value,
                      }))
                    }
                    style={s.input}
                  />
                </label>

                <label style={s.campo}>
                  <span style={s.label}>Precio</span>
                  <input
                    value={
                      planSeleccionado
                        ? `B/. ${Number(planSeleccionado.precio || 0).toFixed(2)}`
                        : ""
                    }
                    readOnly
                    style={s.inputLectura}
                  />
                </label>

                <label style={s.campo}>
                  <span style={s.label}>Vencimiento</span>
                  <input
                    value={formatearFecha(fechaVencimientoNueva)}
                    readOnly
                    style={s.inputLectura}
                  />
                </label>
              </div>
            )}

            <label style={{ ...s.campo, marginTop: 14 }}>
              <span style={s.label}>Observación</span>
              <textarea
                value={formulario.descripcion}
                onChange={(e) =>
                  setFormulario((actual) => ({
                    ...actual,
                    descripcion: e.target.value,
                  }))
                }
                placeholder="Opcional"
                style={s.textarea}
              />
            </label>

            <button
              onClick={crearSuscripcion}
              disabled={guardando || planes.length === 0}
              style={{
                ...s.botonPrincipal,
                opacity: guardando || planes.length === 0 ? 0.6 : 1,
              }}
            >
              {guardando ? "Guardando..." : "Guardar y continuar a Caja →"}
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={s.pagina} className="suscripciones-page">
      <style>{`
        @media (max-width: 900px), (max-device-width: 900px), (pointer: coarse) {
          html,
          body {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          .suscripciones-page {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 10px !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          .suscripciones-contenedor,
          .suscripciones-contenedor-angosto {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }

          .suscripciones-hero {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin-bottom: 12px !important;
            padding: 17px 16px !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            align-items: stretch !important;
            gap: 14px !important;
            border-radius: 18px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .suscripciones-hero > div {
            min-width: 0 !important;
            max-width: 100% !important;
          }

          .suscripciones-hero h1 {
            width: 100% !important;
            max-width: 100% !important;
            margin: 5px 0 !important;
            font-size: 31px !important;
            line-height: 1.05 !important;
            letter-spacing: -.5px !important;
            overflow-wrap: anywhere !important;
          }

          .suscripciones-hero p {
            width: 100% !important;
            max-width: 100% !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
            overflow-wrap: anywhere !important;
          }

          .suscripciones-hero button {
            width: 100% !important;
            max-width: 100% !important;
          }

          .suscripciones-version {
            width: 100% !important;
            max-width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 4px !important;
            margin-bottom: 12px !important;
            padding: 9px 11px !important;
            box-sizing: border-box !important;
          }

          .suscripciones-resumen {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
            gap: 9px !important;
            margin-bottom: 12px !important;
          }

          .suscripciones-resumen > article {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 104px !important;
            padding: 12px !important;
            grid-template-columns: 40px minmax(0,1fr) !important;
            gap: 9px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .suscripciones-resumen > article > div:first-child {
            width: 40px !important;
            height: 40px !important;
            border-radius: 12px !important;
            font-size: 18px !important;
          }

          .suscripciones-resumen > article > div:last-child {
            min-width: 0 !important;
          }

          .suscripciones-resumen > article span {
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            line-height: 1.2 !important;
          }

          .suscripciones-resumen > article strong {
            font-size: 25px !important;
          }

          .suscripciones-doble-grid {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .suscripciones-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 15px !important;
            border-radius: 17px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .suscripciones-cabecera {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            align-items: flex-start !important;
            gap: 9px !important;
          }

          .suscripciones-cabecera > div {
            min-width: 0 !important;
          }

          .suscripciones-cabecera h2 {
            font-size: 20px !important;
            line-height: 1.08 !important;
            overflow-wrap: anywhere !important;
          }

          .suscripciones-cabecera p {
            font-size: 11px !important;
            line-height: 1.4 !important;
            overflow-wrap: anywhere !important;
          }

          .suscripciones-item-atencion {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            align-items: stretch !important;
            gap: 10px !important;
            box-sizing: border-box !important;
          }

          .suscripciones-item-atencion > div:first-child {
            min-width: 0 !important;
          }

          .suscripciones-acciones-compactas {
            width: 100% !important;
            justify-content: flex-start !important;
          }

          .suscripciones-filtros {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: 1fr !important;
            gap: 9px !important;
          }

          .suscripciones-filtros input,
          .suscripciones-filtros select,
          .suscripciones-filtros button {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .suscripciones-tabla-wrap {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
          }

          .suscripciones-tabla {
            width: 100% !important;
            min-width: 0 !important;
            border-collapse: separate !important;
            border-spacing: 0 !important;
          }

          .suscripciones-tabla thead {
            display: none !important;
          }

          .suscripciones-tabla tbody {
            width: 100% !important;
            display: grid !important;
            gap: 10px !important;
          }

          .suscripciones-tabla tr {
            width: 100% !important;
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 0 !important;
            padding: 12px !important;
            border: 1px solid #dfe7e2 !important;
            border-radius: 14px !important;
            background: #fff !important;
            box-sizing: border-box !important;
          }

          .suscripciones-tabla td {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 8px 0 !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 12px !important;
            border-bottom: 1px solid #edf1ee !important;
            white-space: normal !important;
            box-sizing: border-box !important;
            text-align: right !important;
            overflow-wrap: anywhere !important;
          }

          .suscripciones-tabla td:last-child {
            border-bottom: 0 !important;
          }

          .suscripciones-tabla td::before {
            content: attr(data-label);
            flex: 0 0 92px;
            color: #6f7b74;
            font-size: 10px;
            font-weight: 900;
            text-align: left;
          }

          .suscripciones-tabla td[data-label="Alumno"] {
            display: block !important;
            text-align: left !important;
          }

          .suscripciones-tabla td[data-label="Alumno"]::before {
            display: block !important;
            margin-bottom: 5px !important;
          }

          .suscripciones-tabla td[data-label="Acciones"] {
            display: block !important;
            text-align: left !important;
          }

          .suscripciones-tabla td[data-label="Acciones"]::before {
            display: block !important;
            margin-bottom: 8px !important;
          }

          .suscripciones-tabla td[colspan] {
            display: block !important;
            text-align: center !important;
          }

          .suscripciones-tabla td[colspan]::before {
            display: none !important;
          }

          .suscripciones-tabla .acciones-mobile {
            width: 100% !important;
            justify-content: flex-start !important;
          }

          .suscripciones-grid-formulario {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: 1fr !important;
            gap: 11px !important;
          }

          .suscripciones-alumno-seleccionado {
            width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: 46px minmax(0,1fr) !important;
            box-sizing: border-box !important;
          }

          .suscripciones-alumno-seleccionado > button {
            grid-column: 1 / -1 !important;
            width: 100% !important;
          }

          .suscripciones-page input,
          .suscripciones-page select,
          .suscripciones-page textarea,
          .suscripciones-page button {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .suscripciones-page input,
          .suscripciones-page select,
          .suscripciones-page textarea {
            font-size: 16px !important;
          }
        }

        @media (max-width: 390px), (max-device-width: 390px) {
          .suscripciones-resumen {
            grid-template-columns: 1fr !important;
          }

          .suscripciones-hero h1 {
            font-size: 28px !important;
          }
        }
      `}</style>

      <div style={s.contenedor} className="suscripciones-contenedor">
        <header style={s.heroCompacto} className="suscripciones-hero">
          <div>
            <span style={s.etiqueta}>CONTROL DE MEMBRESÍAS</span>
            <h1 style={s.tituloHero}>Membresías del gimnasio</h1>
            <p style={s.subtituloHero}>
              Activas, próximas a vencer y casos que requieren seguimiento.
            </p>
          </div>

          <button onClick={() => router.push("/dashboard")} style={s.botonClaro}>
            ← Volver al Dashboard
          </button>
        </header>

        <div style={s.versionBar} className="suscripciones-version">
          <span>{sincronizando ? "Actualizando estados..." : "Estados actualizados"}</span>
          <span>Versión: {VERSION_SUSCRIPCIONES}</span>
        </div>

        <section style={s.resumenGrid} className="suscripciones-resumen">
          <KPI titulo="Activas" valor={resumen.activas} icono="✓" tipo="verde" />
          <KPI titulo="Próximas a vencer" valor={resumen.proximas} icono="◷" tipo="amarillo" />
          <KPI
            titulo="Morosas / vencidas"
            valor={resumen.vencidas}
            icono="!"
            tipo="naranja"
          />
          <KPI
            titulo="Suspendidas"
            valor={resumen.suspendidas}
            icono="×"
            tipo="rojo"
          />
        </section>

        <section style={s.dobleGrid} className="suscripciones-doble-grid">
          <article style={s.card} className="suscripciones-card">
            <CabeceraSeccion
              titulo="Próximas a vencer"
              texto="Alumnos que conviene contactar antes del vencimiento."
              cantidad={proximosVencimientos.length}
            />

            {proximosVencimientos.length === 0 ? (
              <p style={s.vacio}>No hay membresías próximas a vencer.</p>
            ) : (
              <div style={s.listaAtencion}>
                {proximosVencimientos.map((item) => {
                  const dias = calcularDiasParaVencer(item.fecha_vencimiento);

                  return (
                    <div key={item.id} style={s.itemAtencion} className="suscripciones-item-atencion">
                      <div>
                        <strong>{item.cliente}</strong>
                        <span style={s.detalleItem}>
                          {item.plan} · {dias === 0 ? "vence hoy" : `vence en ${dias} días`}
                        </span>
                      </div>

                      <div style={s.accionesCompactas} className="suscripciones-acciones-compactas">
                        <button onClick={() => enviarRecordatorio(item)} style={s.botonWhatsApp}>
                          WhatsApp
                        </button>
                        <button onClick={() => irACaja(item)} style={s.botonMiniVerde}>
                          Ir a Caja
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article style={s.card} className="suscripciones-card">
            <CabeceraSeccion
              titulo="Morosas y suspendidas"
              texto="Membresías vencidas, suspendidas o pendientes de pago."
              cantidad={requierenAtencion.length}
            />

            {requierenAtencion.length === 0 ? (
              <p style={s.vacio}>No hay casos pendientes de seguimiento.</p>
            ) : (
              <div style={s.listaAtencion}>
                {requierenAtencion.map((item) => {
                  const estado = obtenerEstadoAutomatico(item);

                  return (
                    <div key={item.id} style={s.itemAtencion} className="suscripciones-item-atencion">
                      <div>
                        <strong>{item.cliente}</strong>
                        <span style={s.detalleItem}>
                          {item.plan} · {estado}
                        </span>
                      </div>

                      <div style={s.accionesCompactas} className="suscripciones-acciones-compactas">
                        <button onClick={() => irACaja(item)} style={s.botonMiniVerde}>
                          Ir a Caja
                        </button>
                        {estado !== "Pendiente" && (
                          <button onClick={() => enviarRecordatorio(item)} style={s.botonWhatsApp}>
                            WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section style={s.card} className="suscripciones-card">
          <CabeceraSeccion
            titulo="Clientes con membresía"
            texto="Consulta el estado actual y envía los cobros a Caja."
            cantidad={membresiasFiltradas.length}
          />

          <div style={s.filtros} className="suscripciones-filtros">
            <input
              value={busquedaMembresia}
              onChange={(e) => setBusquedaMembresia(e.target.value)}
              placeholder="Buscar alumno, cédula, teléfono o plan"
              style={s.input}
            />

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={s.input}
            >
              <option>Todos</option>
              <option>Activo</option>
              <option>Próxima a vencer</option>
              <option>Pendiente</option>
              <option>Vencida</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
            </select>

            <button
              onClick={() => {
                setBusquedaMembresia("");
                setFiltroEstado("Todos");
              }}
              style={s.botonOscuro}
            >
              Limpiar
            </button>
          </div>

          <div style={s.tablaContenedor} className="suscripciones-tabla-wrap">
            <table style={s.tabla} className="suscripciones-tabla">
              <thead>
                <tr>
                  <th style={s.th}>Alumno</th>
                  <th style={s.th}>Teléfono</th>
                  <th style={s.th}>Plan</th>
                  <th style={s.th}>Vence</th>
                  <th style={s.th}>Estado</th>
                  <th style={s.th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {membresiasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={s.tdVacio}>
                      No hay membresías para mostrar.
                    </td>
                  </tr>
                ) : (
                  membresiasFiltradas.map((item) => {
                    const estado = obtenerEstadoAutomatico(item);

                    return (
                      <tr key={item.id}>
                        <td style={s.td} data-label="Alumno">
                          <strong>{item.cliente}</strong>
                          <span style={s.subdato}>{item.cedula || "Sin cédula"}</span>
                        </td>
                        <td style={s.td} data-label="Teléfono">{item.telefono || "-"}</td>
                        <td style={s.td} data-label="Plan">{item.plan}</td>
                        <td style={s.td} data-label="Vence">{formatearFecha(item.fecha_vencimiento)}</td>
                        <td style={s.td} data-label="Estado">
                          <span style={estiloEstado(estado)}>{estado}</span>
                        </td>
                        <td style={s.td} data-label="Acciones">
                          <div style={s.accionesTabla} className="acciones-mobile">
                            <button onClick={() => irACaja(item)} style={s.botonMiniVerde}>
                              Ir a Caja
                            </button>
                            {item.telefono && (
                              <button onClick={() => enviarRecordatorio(item)} style={s.botonWhatsApp}>
                                WhatsApp
                              </button>
                            )}
                            {!["Suspendido", "Cancelado"].includes(estado) && (
                              <button
                                onClick={() => cambiarEstado(item, "Suspendido")}
                                style={s.botonMiniNaranja}
                              >
                                Suspender
                              </button>
                            )}
                            {["Suspendido", "Vencida"].includes(estado) && (
                              <button
                                onClick={() => cambiarEstado(item, "Activo")}
                                style={s.botonMiniAzul}
                              >
                                Reactivar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}


export default function Suscripciones() {
  return (
    <Suspense fallback={<CargandoSuscripciones />}>
      <SuscripcionesContenido />
    </Suspense>
  );
}

function CargandoSuscripciones() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        alignContent: "center",
        gap: "12px",
        padding: "24px",
        background: "#eef2f7",
        fontFamily: 'Inter, Arial, system-ui, sans-serif',
      }}
    >
      <img
        src="/konax-logo.png"
        alt="KONAX"
        style={{
          width: "220px",
          maxWidth: "75%",
        }}
      />

      <strong
        style={{
          color: "#111827",
          fontSize: "20px",
        }}
      >
        Preparando membresías
      </strong>

      <span
        style={{
          color: "#6b7280",
          fontSize: "13px",
        }}
      >
        Cargando el alumno y los planes disponibles.
      </span>
    </div>
  );
}

function KPI({ titulo, valor, icono, tipo }) {
  const fondos = {
    verde: { background: "#eaf8ef", color: "#166534" },
    amarillo: { background: "#fff8df", color: "#956400" },
    naranja: { background: "#fff0e6", color: "#c2410c" },
    rojo: { background: "#fff0ee", color: "#b42318" },
  };

  return (
    <article style={s.kpiCard}>
      <div style={{ ...s.kpiIcono, ...(fondos[tipo] || fondos.verde) }}>{icono}</div>
      <div>
        <span style={s.kpiTitulo}>{titulo}</span>
        <strong style={s.kpiValor}>{valor}</strong>
      </div>
    </article>
  );
}

function CabeceraSeccion({ titulo, texto, cantidad }) {
  return (
    <div style={s.cabeceraSeccion}>
      <div>
        <h2 style={s.tituloSeccion}>{titulo}</h2>
        <p style={s.textoSeccion}>{texto}</p>
      </div>
      <span style={s.contador}>{cantidad}</span>
    </div>
  );
}

function estiloEstado(estado) {
  const base = {
    display: "inline-flex",
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };

  if (estado === "Activo") return { ...base, background: "#dcfce7", color: "#166534" };
  if (estado === "Próxima a vencer") return { ...base, background: "#fef3c7", color: "#92400e" };
  if (estado === "Pendiente") return { ...base, background: "#e0f2fe", color: "#075985" };
  if (estado === "Vencida") return { ...base, background: "#ffedd5", color: "#c2410c" };
  return { ...base, background: "#fee2e2", color: "#991b1b" };
}

const s = {
  pagina: {
    minHeight: "100vh",
    padding: 22,
    background: "#f1f5f2",
    color: "#152019",
    fontFamily: 'Inter, Arial, system-ui, sans-serif',
  },
  contenedor: { maxWidth: 1450, margin: "0 auto" },
  contenedorAngosto: { maxWidth: 1000, margin: "0 auto" },
  loadingPage: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 10,
    background: "#f1f5f2",
  },
  loadingLogo: { width: 220, maxWidth: "75%" },
  loadingTitle: { fontSize: 21 },
  heroCompacto: {
    marginBottom: 16,
    padding: "24px 26px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    borderRadius: 20,
    background: "linear-gradient(135deg,#102b1d,#174d30)",
    color: "#fff",
  },
  etiqueta: {
    color: "#8ae6af",
    fontSize: 9,
    fontWeight: 950,
    letterSpacing: 1.3,
  },
  tituloHero: { margin: "5px 0", fontSize: "clamp(28px,4vw,42px)" },
  subtituloHero: { margin: 0, color: "#d8eadf", fontSize: 13 },
  botonClaro: {
    minHeight: 42,
    padding: "10px 15px",
    border: "1px solid rgba(255,255,255,.24)",
    borderRadius: 10,
    background: "rgba(255,255,255,.08)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  versionBar: {
    marginBottom: 15,
    padding: "9px 12px",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    border: "1px solid #d9e5dd",
    borderRadius: 11,
    background: "#fff",
    color: "#6b766f",
    fontSize: 10,
  },
  pasos: {
    marginBottom: 16,
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 8,
  },
  paso: {
    padding: 11,
    borderRadius: 10,
    background: "#fff",
    color: "#77827b",
    textAlign: "center",
    fontSize: 12,
    fontWeight: 800,
  },
  pasoCompleto: {
    padding: 11,
    borderRadius: 10,
    background: "#dcfce7",
    color: "#166534",
    textAlign: "center",
    fontSize: 12,
    fontWeight: 900,
  },
  pasoActivo: {
    padding: 11,
    borderRadius: 10,
    background: "#173c2a",
    color: "#fff",
    textAlign: "center",
    fontSize: 12,
    fontWeight: 900,
  },
  resumenGrid: {
    marginBottom: 16,
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 12,
  },
  kpiCard: {
    minHeight: 112,
    padding: 16,
    display: "grid",
    gridTemplateColumns: "48px 1fr",
    alignItems: "center",
    gap: 12,
    border: "1px solid #dfe7e2",
    borderRadius: 16,
    background: "#fff",
  },
  kpiIcono: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    fontSize: 22,
    fontWeight: 950,
  },
  kpiTitulo: { display: "block", color: "#6f7b74", fontSize: 11, fontWeight: 850 },
  kpiValor: { display: "block", marginTop: 5, fontSize: 29 },
  dobleGrid: {
    marginBottom: 16,
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 16,
  },
  card: {
    marginBottom: 16,
    padding: 20,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#fff",
    boxShadow: "0 8px 24px rgba(20,58,37,.05)",
  },
  cabeceraSeccion: {
    marginBottom: 14,
    paddingBottom: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid #edf1ee",
  },
  tituloSeccion: { margin: 0, fontSize: 20 },
  textoSeccion: { margin: "4px 0 0", color: "#758078", fontSize: 11 },
  contador: {
    minWidth: 34,
    height: 34,
    padding: "0 9px",
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    background: "#eaf8ef",
    color: "#16834f",
    fontWeight: 900,
  },
  vacio: { margin: 0, color: "#758078", fontSize: 12 },
  listaAtencion: { display: "grid", gap: 9 },
  itemAtencion: {
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: "1px solid #e5ebe7",
    borderRadius: 12,
    background: "#fafcfb",
  },
  detalleItem: { display: "block", marginTop: 4, color: "#758078", fontSize: 11 },
  accionesCompactas: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  filtros: {
    marginBottom: 13,
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 220px auto",
    gap: 10,
  },
  input: {
    width: "100%",
    minHeight: 43,
    padding: "10px 11px",
    boxSizing: "border-box",
    border: "1px solid #cfd9d2",
    borderRadius: 9,
    background: "#fff",
    fontSize: 13,
  },
  inputLectura: {
    width: "100%",
    minHeight: 43,
    padding: "10px 11px",
    boxSizing: "border-box",
    border: "1px solid #d9e5dd",
    borderRadius: 9,
    background: "#f1f7f3",
    color: "#17623c",
    fontWeight: 850,
  },
  textarea: {
    width: "100%",
    minHeight: 85,
    padding: 11,
    boxSizing: "border-box",
    border: "1px solid #cfd9d2",
    borderRadius: 9,
    resize: "vertical",
    fontFamily: "inherit",
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: 10,
  },
  resultados: { marginTop: 10, display: "grid", gap: 7 },
  resultado: {
    padding: 11,
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    gap: 12,
    border: "1px solid #dfe7e2",
    borderRadius: 10,
    background: "#fff",
    textAlign: "left",
    cursor: "pointer",
  },
  alumnoSeleccionado: {
    padding: 14,
    display: "grid",
    gridTemplateColumns: "54px 1fr auto",
    alignItems: "center",
    gap: 12,
    border: "1px solid #cfe4d7",
    borderRadius: 13,
    background: "#f1faf4",
  },
  avatar: {
    width: 54,
    height: 54,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#173c2a",
    color: "#fff",
    fontSize: 22,
    fontWeight: 950,
  },
  nombreAlumno: { display: "block", fontSize: 17 },
  datoAlumno: { display: "block", marginTop: 3, color: "#6d7871", fontSize: 11 },
  gridFormulario: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 13,
  },
  campo: { display: "grid", gap: 6 },
  label: { color: "#405047", fontSize: 11, fontWeight: 850 },
  avisoVacio: {
    padding: 14,
    border: "1px solid #f1d58b",
    borderRadius: 11,
    background: "#fff9df",
    color: "#795800",
    fontSize: 12,
  },
  botonPrincipal: {
    width: "100%",
    minHeight: 46,
    marginTop: 15,
    border: 0,
    borderRadius: 10,
    background: "#16834f",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  botonOscuro: {
    minHeight: 43,
    padding: "10px 15px",
    border: 0,
    borderRadius: 9,
    background: "#111827",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  botonSecundario: {
    minHeight: 40,
    padding: "9px 13px",
    border: "1px solid #cad5ce",
    borderRadius: 9,
    background: "#fff",
    color: "#26332b",
    fontWeight: 800,
    cursor: "pointer",
  },
  botonMiniVerde: {
    padding: "7px 9px",
    border: 0,
    borderRadius: 8,
    background: "#16834f",
    color: "#fff",
    fontSize: 11,
    fontWeight: 850,
    cursor: "pointer",
  },
  botonWhatsApp: {
    padding: "7px 9px",
    border: 0,
    borderRadius: 8,
    background: "#128c4c",
    color: "#fff",
    fontSize: 11,
    fontWeight: 850,
    cursor: "pointer",
  },
  botonMiniNaranja: {
    padding: "7px 9px",
    border: 0,
    borderRadius: 8,
    background: "#f97316",
    color: "#fff",
    fontSize: 11,
    fontWeight: 850,
    cursor: "pointer",
  },
  botonMiniAzul: {
    padding: "7px 9px",
    border: 0,
    borderRadius: 8,
    background: "#2563eb",
    color: "#fff",
    fontSize: 11,
    fontWeight: 850,
    cursor: "pointer",
  },
  tablaContenedor: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e1e8e3",
    borderRadius: 11,
  },
  tabla: { width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12 },
  th: {
    padding: 11,
    background: "#111827",
    color: "#fff",
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  td: {
    padding: 11,
    borderBottom: "1px solid #edf1ee",
    verticalAlign: "top",
    whiteSpace: "nowrap",
  },
  subdato: { display: "block", marginTop: 3, color: "#77827b", fontSize: 10 },
  tdVacio: { padding: 26, textAlign: "center", color: "#758078" },
  accionesTabla: { display: "flex", gap: 5, flexWrap: "wrap" },
};
