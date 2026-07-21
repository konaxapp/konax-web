"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const DIAS_PROXIMO_VENCER = 5;
const DIAS_GRACIA = 3;

const FORMULARIO_INICIAL = {
  cedula: "",
  cliente: "",
  telefono: "",
  correo: "",
  plan: "",
  descripcion: "",
  precio: "",
  vendedor: "",
  fechaInicio: "",
  periodicidad: "Mensual",
  formaPago: "Efectivo",
  estado: "Activo",
};

const PAGO_INICIAL = {
  item: null,
  monto: "",
  metodo: "Efectivo",
  observacion: "",
};

export default function Suscripciones() {
  const router = useRouter();

  const [suscripciones, setSuscripciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  const [busquedaMembresia, setBusquedaMembresia] = useState("");
  const [busquedaPagos, setBusquedaPagos] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [pagoModal, setPagoModal] = useState(PAGO_INICIAL);

  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    setCargando(true);

    const empresaId = obtenerEmpresaId();

    if (!empresaId) {
      setCargando(false);
      return;
    }

    await Promise.all([
      cargarSuscripciones(empresaId),
      cargarPagos(empresaId),
    ]);

    setCargando(false);
  }

  function volverDashboard() {
    router.push("/dashboard");
  }

  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");

    if (!empresaId) {
      alert("No hay una empresa activa. Inicie sesión nuevamente.");
      router.replace("/login");
      return null;
    }

    return empresaId;
  }

  function generarNumeroCuenta() {
    return `MEM-${Date.now()}`;
  }

  function fechaHoy() {
    return new Date().toISOString().split("T")[0];
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

    return anio && mes && dia
      ? `${dia}/${mes}/${anio}`
      : fechaTexto;
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

  function calcularVencimientoDesde(fechaBase, periodicidad) {
    if (!fechaBase) return "";

    switch (periodicidad) {
      case "Diaria":
        return sumarDiasFecha(fechaBase, 1);
      case "Semanal":
        return sumarDiasFecha(fechaBase, 7);
      case "Quincenal":
        return sumarDiasFecha(fechaBase, 15);
      case "Mensual":
        return sumarMesesFecha(fechaBase, 1);
      case "Trimestral":
        return sumarMesesFecha(fechaBase, 3);
      case "Semestral":
        return sumarMesesFecha(fechaBase, 6);
      case "Anual":
        return sumarMesesFecha(fechaBase, 12);
      default:
        return fechaBase;
    }
  }

  function calcularVencimiento() {
    return calcularVencimientoDesde(
      formulario.fechaInicio,
      formulario.periodicidad
    );
  }

  function calcularDiasParaVencer(fechaVencimiento) {
    const vence = fechaLocal(fechaVencimiento);
    if (!vence) return 0;

    const hoy = fechaLocal(fechaHoy());

    return Math.ceil(
      (vence.getTime() - hoy.getTime()) / 86400000
    );
  }

  function estadoNormalizado(estado) {
    return String(estado || "")
      .toLowerCase()
      .trim();
  }

  function obtenerEstadoAutomatico(item) {
    const estadoGuardado = estadoNormalizado(item.estado);

    if (estadoGuardado === "cancelado") {
      return "Cancelado";
    }

    if (estadoGuardado === "suspendido") {
      return "Suspendido";
    }

    const dias = calcularDiasParaVencer(
      item.fecha_vencimiento
    );

    if (dias < -DIAS_GRACIA) {
      return "Suspendido";
    }

    if (dias < 0) {
      return "Vencida";
    }

    if (dias <= DIAS_PROXIMO_VENCER) {
      return "Próxima a vencer";
    }

    return "Activo";
  }

  function estadoCobroVisual(item) {
    const estado = obtenerEstadoAutomatico(item);

    if (estado === "Vencida") return "Morosa";
    if (estado === "Suspendido") return "Suspendida";
    if (estado === "Próxima a vencer") {
      return "Próxima a vencer";
    }

    return estado;
  }

  function limpiarFormulario() {
    setFormulario(FORMULARIO_INICIAL);
  }

  function limpiarTelefono(telefono) {
    const limpio = String(telefono || "")
      .replace(/\D/g, "");

    if (!limpio) return "";
    if (limpio.startsWith("507")) return limpio;
    if (limpio.length === 8) return `507${limpio}`;

    return limpio;
  }

  function abrirWhatsApp(item, mensaje) {
    const telefono = limpiarTelefono(item.telefono);

    if (!telefono) {
      alert("Este cliente no tiene teléfono registrado.");
      return;
    }

    window.open(
      `https://wa.me/${telefono}?text=${encodeURIComponent(
        mensaje
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function enviarWhatsAppRecordatorio(item) {
    const estado = obtenerEstadoAutomatico(item);
    const dias = calcularDiasParaVencer(
      item.fecha_vencimiento
    );

    let textoEstado = "";

    if (estado === "Suspendido") {
      textoEstado =
        `se encuentra suspendida por falta de renovación. ` +
        `La fecha de vencimiento fue el ${formatearFecha(
          item.fecha_vencimiento
        )}`;
    } else if (estado === "Vencida") {
      textoEstado =
        `se encuentra vencida desde el ${formatearFecha(
          item.fecha_vencimiento
        )}`;
    } else if (estado === "Próxima a vencer") {
      textoEstado =
        dias === 0
          ? "vence hoy"
          : `vence en ${dias} ${
              dias === 1 ? "día" : "días"
            }, el ${formatearFecha(
              item.fecha_vencimiento
            )}`;
    } else {
      textoEstado =
        `está activa hasta el ${formatearFecha(
          item.fecha_vencimiento
        )}`;
    }

    const mensaje = `Hola ${item.cliente || ""} 👋

Te recordamos que tu membresía ${
      item.plan || ""
    } ${textoEstado}.

Monto de renovación: $${Number(
      item.precio || 0
    ).toFixed(2)}

Puedes realizar tu pago para mantener activo el servicio.

Gracias por preferirnos.`;

    abrirWhatsApp(item, mensaje);
  }

  function enviarWhatsAppPromocion(item) {
    const mensaje = `Hola ${item.cliente || ""} 👋

Tenemos una promoción especial para ti.

🔥 Renueva tu membresía hoy y consulta el beneficio disponible.

Plan actual: ${item.plan || ""}
Monto: $${Number(item.precio || 0).toFixed(2)}

Responde este mensaje para recibir más información.

Gracias por ser parte de nosotros.`;

    abrirWhatsApp(item, mensaje);
  }

  function enviarWhatsAppReactivacion(item) {
    const mensaje = `Hola ${item.cliente || ""} 👋

Queremos invitarte a reactivar tu membresía ${
      item.plan || ""
    }.

Tu membresía aparece como ${estadoCobroVisual(
      item
    ).toLowerCase()}.

Monto de renovación: $${Number(
      item.precio || 0
    ).toFixed(2)}

Responde este mensaje y te ayudamos a reactivarla.`;

    abrirWhatsApp(item, mensaje);
  }

  function verHistorialCliente(item) {
    const texto = item.cedula || item.cliente || "";
    setBusquedaPagos(texto);

    setTimeout(() => {
      document
        .getElementById("historial-pagos")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  const membresiasFiltradas = useMemo(() => {
    const texto = busquedaMembresia
      .toLowerCase()
      .trim();

    return suscripciones.filter((item) => {
      const estado = obtenerEstadoAutomatico(item);

      const coincideTexto = `${item.cliente || ""} ${
        item.cedula || ""
      } ${item.telefono || ""} ${item.plan || ""} ${estado}`
        .toLowerCase()
        .includes(texto);

      const coincideEstado =
        filtroEstado === "Todos" ||
        estado === filtroEstado;

      return coincideTexto && coincideEstado;
    });
  }, [
    suscripciones,
    busquedaMembresia,
    filtroEstado,
  ]);

  const pagosFiltrados = useMemo(() => {
    const texto = busquedaPagos
      .toLowerCase()
      .trim();

    return pagos.filter((pago) =>
      `${pago.cliente_nombre || ""} ${
        pago.cliente_cedula || ""
      } ${pago.descripcion || ""} ${
        pago.metodo_pago || ""
      }`
        .toLowerCase()
        .includes(texto)
    );
  }, [pagos, busquedaPagos]);

  const resumen = useMemo(() => {
    const resultado = {
      activas: 0,
      proximas: 0,
      vencidas: 0,
      suspendidas: 0,
      canceladas: 0,
    };

    suscripciones.forEach((item) => {
      const estado = obtenerEstadoAutomatico(item);

      if (estado === "Activo") resultado.activas += 1;
      if (estado === "Próxima a vencer") {
        resultado.proximas += 1;
      }
      if (estado === "Vencida") {
        resultado.vencidas += 1;
      }
      if (estado === "Suspendido") {
        resultado.suspendidas += 1;
      }
      if (estado === "Cancelado") {
        resultado.canceladas += 1;
      }
    });

    return resultado;
  }, [suscripciones]);

  const ingresosMes = useMemo(() => {
    return pagos.reduce((total, pago) => {
      const fecha =
        pago.fecha_pago || pago.created_at;

      if (!fecha) return total;

      const fechaPago = new Date(fecha);
      const hoy = new Date();

      const mismoMes =
        fechaPago.getMonth() === hoy.getMonth() &&
        fechaPago.getFullYear() === hoy.getFullYear();

      return mismoMes
        ? total + Number(pago.monto || 0)
        : total;
    }, 0);
  }, [pagos]);

  const proximosVencimientos = useMemo(() => {
    return suscripciones
      .filter(
        (item) =>
          obtenerEstadoAutomatico(item) ===
          "Próxima a vencer"
      )
      .sort(
        (a, b) =>
          calcularDiasParaVencer(
            a.fecha_vencimiento
          ) -
          calcularDiasParaVencer(
            b.fecha_vencimiento
          )
      );
  }, [suscripciones]);

  const membresiasMorosas = useMemo(() => {
    return suscripciones
      .filter((item) =>
        ["Vencida", "Suspendido"].includes(
          obtenerEstadoAutomatico(item)
        )
      )
      .sort(
        (a, b) =>
          calcularDiasParaVencer(
            a.fecha_vencimiento
          ) -
          calcularDiasParaVencer(
            b.fecha_vencimiento
          )
      );
  }, [suscripciones]);

  async function cargarSuscripciones(
    empresaId = obtenerEmpresaId()
  ) {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fecha_vencimiento", {
        ascending: true,
      });

    if (error) {
      alert(
        "Error cargando membresías: " +
          error.message
      );
      return;
    }

    const lista = data || [];

    setSuscripciones(lista);

    await sincronizarEstadosAutomaticos(
      empresaId,
      lista
    );
  }

  async function sincronizarEstadosAutomaticos(
    empresaId,
    lista
  ) {
    if (sincronizando || lista.length === 0) return;

    const cambios = lista.filter((item) => {
      const actual = estadoNormalizado(item.estado);
      const calculado =
        estadoNormalizado(
          obtenerEstadoAutomatico(item)
        );

      return actual !== calculado;
    });

    if (cambios.length === 0) return;

    setSincronizando(true);

    try {
      await Promise.all(
        cambios.map(async (item) => {
          const nuevoEstado =
            obtenerEstadoAutomatico(item);

          const { error: errorSuscripcion } =
            await supabase
              .from("suscripciones")
              .update({ estado: nuevoEstado })
              .eq("id", item.id)
              .eq("empresa_id", empresaId);

          if (errorSuscripcion) {
            throw errorSuscripcion;
          }

          if (item.informacion_comercial_id) {
            const payloadComercial = {
              estado: nuevoEstado,
              estado_servicio: nuevoEstado,
            };

            if (nuevoEstado === "Suspendido") {
              payloadComercial.fecha_suspension =
                fechaHoy();
              payloadComercial.motivo_suspension =
                "Suspensión automática por vencimiento";
            }

            if (
              nuevoEstado === "Activo" ||
              nuevoEstado === "Próxima a vencer"
            ) {
              payloadComercial.fecha_suspension =
                null;
              payloadComercial.motivo_suspension =
                null;
            }

            const { error: errorComercial } =
              await supabase
                .from("informacion_comercial")
                .update(payloadComercial)
                .eq(
                  "id",
                  item.informacion_comercial_id
                )
                .eq("empresa_id", empresaId);

            if (errorComercial) {
              throw errorComercial;
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
      console.error(
        "No se pudieron sincronizar todos los estados:",
        error
      );
    } finally {
      setSincronizando(false);
    }
  }

  async function cargarPagos(
    empresaId = obtenerEmpresaId()
  ) {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("caja")
      .select("*")
      .eq("empresa_id", empresaId)
      .in("tipo", ["Suscripción", "Membresía"])
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      alert(
        "Error cargando pagos: " + error.message
      );
      return;
    }

    setPagos(data || []);
  }

  async function buscarClienteParaFormulario() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId) return;

    const texto = formulario.cedula.trim();

    if (texto.length < 3) {
      alert(
        "Escriba por lo menos tres caracteres de la cédula o nombre."
      );
      return;
    }

    const textoSeguro = texto.replace(
      /[%_,()]/g,
      ""
    );

    const { data, error } = await supabase
      .from("clientes")
      .select(
        "id, cedula, nombre, telefono, correo"
      )
      .eq("empresa_id", empresaId)
      .or(
        `cedula.ilike.%${textoSeguro}%,nombre.ilike.%${textoSeguro}%`
      )
      .limit(1);

    if (error) {
      alert(
        "Error buscando cliente: " +
          error.message
      );
      return;
    }

    if (!data || data.length === 0) {
      alert(
        "No se encontró el cliente. Puede registrarlo desde este formulario."
      );
      return;
    }

    const cliente = data[0];

    setFormulario((actual) => ({
      ...actual,
      cedula: cliente.cedula || "",
      cliente: cliente.nombre || "",
      telefono: cliente.telefono || "",
      correo: cliente.correo || "",
    }));
  }

  async function obtenerOCrearCliente(empresaId) {
    const cedula = formulario.cedula.trim();

    const { data: clienteExistente, error } =
      await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("cedula", cedula)
        .maybeSingle();

    if (error) {
      alert(
        "Error buscando cliente: " +
          error.message
      );
      return null;
    }

    if (clienteExistente) {
      const { data, error: errorActualizar } =
        await supabase
          .from("clientes")
          .update({
            nombre:
              formulario.cliente ||
              clienteExistente.nombre,
            telefono:
              formulario.telefono ||
              clienteExistente.telefono,
            correo:
              formulario.correo ||
              clienteExistente.correo,
            estado: "Activo",
          })
          .eq("id", clienteExistente.id)
          .eq("empresa_id", empresaId)
          .select()
          .single();

      if (errorActualizar) {
        alert(
          "Error actualizando cliente: " +
            errorActualizar.message
        );
        return null;
      }

      return data;
    }

    const { data, error: errorCrear } =
      await supabase
        .from("clientes")
        .insert([
          {
            empresa_id: empresaId,
            cedula,
            nombre: formulario.cliente.trim(),
            telefono: formulario.telefono.trim(),
            correo: formulario.correo.trim(),
            estado: "Activo",
          },
        ])
        .select()
        .single();

    if (errorCrear) {
      alert(
        "Error creando cliente: " +
          errorCrear.message
      );
      return null;
    }

    return data;
  }

  async function crearSuscripcion() {
    const empresaId = obtenerEmpresaId();
    if (!empresaId || guardando) return;

    const camposObligatorios = [
      formulario.cedula,
      formulario.cliente,
      formulario.plan,
      formulario.precio,
      formulario.fechaInicio,
    ];

    if (
      camposObligatorios.some(
        (valor) => !String(valor || "").trim()
      )
    ) {
      alert(
        "Complete cédula, cliente, plan, precio y fecha de inicio."
      );
      return;
    }

    const precio = Number(formulario.precio);

    if (!Number.isFinite(precio) || precio <= 0) {
      alert(
        "El precio de la membresía debe ser mayor que cero."
      );
      return;
    }

    const fechaVencimiento = calcularVencimiento();

    if (!fechaVencimiento) {
      alert(
        "No se pudo calcular la fecha de vencimiento."
      );
      return;
    }

    setGuardando(true);

    try {
      const clienteCreado =
        await obtenerOCrearCliente(empresaId);

      if (!clienteCreado) return;

      const numeroCuenta = generarNumeroCuenta();

      const {
        data: comercialCreado,
        error: errorComercial,
      } = await supabase
        .from("informacion_comercial")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: clienteCreado.id,
            numero_cuenta: numeroCuenta,
            tipo_producto: "Membresía",
            tipo_cuenta: "Suscripción",
            descripcion: `${formulario.plan} - ${
              formulario.descripcion || ""
            }`,
            modalidad: formulario.periodicidad,
            monto_total: precio,
            saldo_actual: precio,
            cuota: precio,
            fecha_inicio: formulario.fechaInicio,
            fecha_vencimiento: fechaVencimiento,
            responsable:
              formulario.vendedor || null,
            estado: formulario.estado,
            estado_servicio:
              formulario.estado,
            observacion:
              formulario.descripcion || null,
          },
        ])
        .select()
        .single();

      if (errorComercial) {
        throw new Error(
          "Error creando información comercial: " +
            errorComercial.message
        );
      }

      const { error: errorSuscripcion } =
        await supabase
          .from("suscripciones")
          .insert([
            {
              empresa_id: empresaId,
              cliente_id: clienteCreado.id,
              informacion_comercial_id:
                comercialCreado.id,
              cliente: formulario.cliente.trim(),
              cedula: formulario.cedula.trim(),
              telefono:
                formulario.telefono.trim(),
              plan: formulario.plan.trim(),
              tipo_servicio: "Membresía",
              descripcion:
                formulario.descripcion.trim(),
              precio,
              vendedor:
                formulario.vendedor.trim(),
              forma_pago:
                formulario.formaPago,
              fecha_inicio:
                formulario.fechaInicio,
              fecha_vencimiento:
                fechaVencimiento,
              periodicidad:
                formulario.periodicidad,
              estado: formulario.estado,
            },
          ]);

      if (errorSuscripcion) {
        await supabase
          .from("informacion_comercial")
          .delete()
          .eq("id", comercialCreado.id)
          .eq("empresa_id", empresaId);

        throw new Error(
          "Error creando membresía: " +
            errorSuscripcion.message
        );
      }

      alert(
        `Membresía creada correctamente. Cuenta: ${numeroCuenta}`
      );

      limpiarFormulario();

      await cargarSuscripciones(empresaId);
    } catch (error) {
      alert(error.message || "No se pudo crear la membresía.");
    } finally {
      setGuardando(false);
    }
  }

  function abrirModalPago(item) {
    setPagoModal({
      item,
      monto: String(
        Number(item.precio || 0).toFixed(2)
      ),
      metodo:
        item.forma_pago || "Efectivo",
      observacion: "",
    });
  }

  function cerrarModalPago() {
    if (guardando) return;
    setPagoModal(PAGO_INICIAL);
  }

  async function registrarPagoYRenovar() {
    const empresaId = obtenerEmpresaId();
    const item = pagoModal.item;

    if (!empresaId || !item || guardando) return;

    const monto = Number(pagoModal.monto || 0);

    if (!Number.isFinite(monto) || monto <= 0) {
      alert(
        "El monto del pago debe ser mayor que cero."
      );
      return;
    }

    setGuardando(true);

    try {
      const estadoActual =
        obtenerEstadoAutomatico(item);

      const fechaBase =
        ["Vencida", "Suspendido"].includes(
          estadoActual
        )
          ? fechaHoy()
          : item.fecha_vencimiento;

      const nuevaFecha =
        calcularVencimientoDesde(
          fechaBase,
          item.periodicidad
        );

      const { error: errorCaja } =
        await supabase.from("caja").insert([
          {
            empresa_id: empresaId,
            cliente_id: item.cliente_id,
            informacion_comercial_id:
              item.informacion_comercial_id,
            tipo: "Membresía",
            tipo_movimiento:
              "PAGO_MEMBRESIA",
            descripcion:
              `Pago y renovación de membresía: ${
                item.plan
              }${
                pagoModal.observacion
                  ? ` - ${pagoModal.observacion}`
                  : ""
              }`,
            monto,
            metodo_pago: pagoModal.metodo,
            fecha_pago: new Date().toISOString(),
            estado: "Procesado",
            cliente_nombre:
              item.cliente || null,
            cliente_cedula:
              item.cedula || null,
          },
        ]);

      if (errorCaja) {
        throw new Error(
          "Error registrando pago: " +
            errorCaja.message
        );
      }

      const { error: errorSuscripcion } =
        await supabase
          .from("suscripciones")
          .update({
            fecha_vencimiento: nuevaFecha,
            estado: "Activo",
            forma_pago: pagoModal.metodo,
          })
          .eq("id", item.id)
          .eq("empresa_id", empresaId);

      if (errorSuscripcion) {
        throw new Error(
          "El pago fue registrado, pero no se pudo renovar la membresía: " +
            errorSuscripcion.message
        );
      }

      if (item.informacion_comercial_id) {
        const { error: errorComercial } =
          await supabase
            .from("informacion_comercial")
            .update({
              fecha_vencimiento: nuevaFecha,
              saldo_actual: 0,
              estado: "Activo",
              estado_servicio: "Activo",
              fecha_suspension: null,
              fecha_cancelacion: null,
              motivo_suspension: null,
            })
            .eq(
              "id",
              item.informacion_comercial_id
            )
            .eq("empresa_id", empresaId);

        if (errorComercial) {
          throw new Error(
            "La membresía fue renovada, pero no se pudo actualizar la vista comercial: " +
              errorComercial.message
          );
        }
      }

      await supabase
        .from("clientes")
        .update({ estado: "Activo" })
        .eq("id", item.cliente_id)
        .eq("empresa_id", empresaId);

      alert(
        `Pago registrado y membresía renovada hasta el ${formatearFecha(
          nuevaFecha
        )}.`
      );

      cerrarModalPago();

      await Promise.all([
        cargarSuscripciones(empresaId),
        cargarPagos(empresaId),
      ]);
    } catch (error) {
      alert(
        error.message ||
          "No se pudo registrar el pago."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(
    item,
    nuevoEstado
  ) {
    const empresaId = obtenerEmpresaId();

    if (!empresaId || guardando) return;

    if (
      !confirm(
        `¿Cambiar la membresía de ${item.cliente} a ${nuevoEstado}?`
      )
    ) {
      return;
    }

    setGuardando(true);

    try {
      const payloadComercial = {
        estado: nuevoEstado,
        estado_servicio: nuevoEstado,
      };

      if (nuevoEstado === "Suspendido") {
        payloadComercial.fecha_suspension =
          fechaHoy();
        payloadComercial.motivo_suspension =
          "Suspensión manual";
      }

      if (nuevoEstado === "Cancelado") {
        payloadComercial.fecha_cancelacion =
          fechaHoy();
        payloadComercial.motivo_suspension =
          "Cancelación manual";
      }

      if (nuevoEstado === "Activo") {
        payloadComercial.fecha_suspension =
          null;
        payloadComercial.fecha_cancelacion =
          null;
        payloadComercial.motivo_suspension =
          null;
      }

      const { error: errorSuscripcion } =
        await supabase
          .from("suscripciones")
          .update({ estado: nuevoEstado })
          .eq("id", item.id)
          .eq("empresa_id", empresaId);

      if (errorSuscripcion) {
        throw errorSuscripcion;
      }

      if (item.informacion_comercial_id) {
        const { error: errorComercial } =
          await supabase
            .from("informacion_comercial")
            .update(payloadComercial)
            .eq(
              "id",
              item.informacion_comercial_id
            )
            .eq("empresa_id", empresaId);

        if (errorComercial) {
          throw errorComercial;
        }
      }

      alert(
        `Membresía actualizada a ${nuevoEstado}.`
      );

      await cargarSuscripciones(empresaId);
    } catch (error) {
      alert(
        "No se pudo cambiar el estado: " +
          error.message
      );
    } finally {
      setGuardando(false);
    }
  }

  function estiloEstado(estado) {
    if (estado === "Activo") {
      return estadoVerde;
    }

    if (estado === "Próxima a vencer") {
      return estadoAmarillo;
    }

    if (estado === "Vencida") {
      return estadoNaranja;
    }

    return estadoRojo;
  }

  if (cargando) {
    return (
      <div style={loadingPage}>
        <img
          src="/konax-logo.png"
          alt="KONAX"
          style={loadingLogo}
        />
        <strong style={loadingTitle}>
          Preparando membresías
        </strong>
        <span style={textoSuave}>
          Cargando clientes, vencimientos y pagos.
        </span>
      </div>
    );
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <div style={logoBox}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={logoHero}
              />
            </div>

            <div>
              <p style={etiqueta}>
                MÓDULO DE MEMBRESÍAS
              </p>
              <h1 style={tituloHero}>
                Suscripciones y Membresías
              </h1>
              <p style={subtituloHero}>
                Control automático de estados,
                renovaciones, morosidad y
                recordatorios por WhatsApp.
              </p>
            </div>
          </div>

          <button
            onClick={volverDashboard}
            style={botonClaro}
          >
            ← Centro de Operaciones
          </button>
        </div>

        <div style={reglasBox}>
          <strong>Reglas automáticas activas:</strong>
          <span>
            Próxima a vencer: {DIAS_PROXIMO_VENCER} días antes
          </span>
          <span>
            Suspensión automática: después de {DIAS_GRACIA} días de gracia
          </span>
          {sincronizando && (
            <span style={{ color: "#166534" }}>
              Actualizando estados...
            </span>
          )}
        </div>

        <div style={resumenGrid}>
          <KPI
            titulo="Activas"
            valor={resumen.activas}
            icono="✅"
          />
          <KPI
            titulo="Próximas a vencer"
            valor={resumen.proximas}
            icono="🟡"
          />
          <KPI
            titulo="Vencidas / morosas"
            valor={resumen.vencidas}
            icono="🔴"
          />
          <KPI
            titulo="Suspendidas"
            valor={resumen.suspendidas}
            icono="⛔"
          />
          <KPI
            titulo="Ingresos del mes"
            valor={`$${ingresosMes.toFixed(2)}`}
            icono="💰"
            destacado
          />
        </div>

        <div style={gridDos}>
          <div style={card}>
            <CabeceraSeccion
              titulo="Próximas a vencer"
              texto="Miembros que deben recibir un recordatorio."
              cantidad={proximosVencimientos.length}
            />

            {proximosVencimientos.length === 0 ? (
              <p style={textoSuave}>
                No hay membresías próximas a vencer.
              </p>
            ) : (
              proximosVencimientos.map((item) => {
                const dias =
                  calcularDiasParaVencer(
                    item.fecha_vencimiento
                  );

                return (
                  <div
                    key={item.id}
                    style={alertaBox}
                  >
                    <div style={panelItemHeader}>
                      <div>
                        <strong>{item.cliente}</strong>
                        <p style={panelTexto}>
                          {item.plan} · vence{" "}
                          {dias === 0
                            ? "hoy"
                            : `en ${dias} ${
                                dias === 1
                                  ? "día"
                                  : "días"
                              }`}
                        </p>
                      </div>

                      <span style={estadoAmarillo}>
                        Próxima a vencer
                      </span>
                    </div>

                    <div style={accionesFlex}>
                      <button
                        style={whatsappBtn}
                        onClick={() =>
                          enviarWhatsAppRecordatorio(
                            item
                          )
                        }
                      >
                        WhatsApp
                      </button>

                      <button
                        style={botonPequeno}
                        onClick={() =>
                          abrirModalPago(item)
                        }
                      >
                        Registrar pago
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={card}>
            <CabeceraSeccion
              titulo="Morosas y suspendidas"
              texto="Membresías vencidas que requieren seguimiento."
              cantidad={membresiasMorosas.length}
            />

            {membresiasMorosas.length === 0 ? (
              <p style={textoSuave}>
                No hay membresías morosas.
              </p>
            ) : (
              membresiasMorosas.map((item) => {
                const estado =
                  obtenerEstadoAutomatico(item);
                const dias = Math.abs(
                  calcularDiasParaVencer(
                    item.fecha_vencimiento
                  )
                );

                return (
                  <div
                    key={item.id}
                    style={vencidaBox}
                  >
                    <div style={panelItemHeader}>
                      <div>
                        <strong>{item.cliente}</strong>
                        <p style={panelTexto}>
                          {item.plan} ·{" "}
                          {estado === "Suspendido"
                            ? "servicio suspendido"
                            : `venció hace ${dias} ${
                                dias === 1
                                  ? "día"
                                  : "días"
                              }`}
                        </p>
                      </div>

                      <span
                        style={estiloEstado(estado)}
                      >
                        {estadoCobroVisual(item)}
                      </span>
                    </div>

                    <div style={accionesFlex}>
                      <button
                        style={botonPequeno}
                        onClick={() =>
                          abrirModalPago(item)
                        }
                      >
                        Registrar pago
                      </button>

                      <button
                        style={whatsappBtn}
                        onClick={() =>
                          enviarWhatsAppRecordatorio(
                            item
                          )
                        }
                      >
                        Recordatorio
                      </button>

                      <button
                        style={promoBtn}
                        onClick={() =>
                          enviarWhatsAppReactivacion(
                            item
                          )
                        }
                      >
                        Reactivación
                      </button>

                      {estado !== "Suspendido" && (
                        <button
                          style={botonNaranja}
                          onClick={() =>
                            cambiarEstado(
                              item,
                              "Suspendido"
                            )
                          }
                        >
                          Suspender
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={card}>
          <CabeceraSeccion
            titulo="Crear membresía"
            texto="Registra un miembro, su plan y la fecha de vencimiento."
          />

          <div style={toolbar}>
            <input
              placeholder="Buscar cliente por cédula o nombre..."
              value={formulario.cedula}
              onChange={(e) =>
                setFormulario({
                  ...formulario,
                  cedula: e.target.value,
                })
              }
              style={input}
            />

            <button
              onClick={buscarClienteParaFormulario}
              style={botonSecundario}
            >
              Buscar cliente
            </button>
          </div>

          <div style={grid}>
            <Campo etiqueta="Nombre del cliente *">
              <input
                placeholder="Nombre completo"
                value={formulario.cliente}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    cliente: e.target.value,
                  })
                }
                style={input}
              />
            </Campo>

            <Campo etiqueta="Teléfono / WhatsApp">
              <input
                placeholder="Ej. 6000-0000"
                value={formulario.telefono}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    telefono: e.target.value,
                  })
                }
                style={input}
              />
            </Campo>

            <Campo etiqueta="Correo">
              <input
                placeholder="correo@ejemplo.com"
                value={formulario.correo}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    correo: e.target.value,
                  })
                }
                style={input}
              />
            </Campo>

            <Campo etiqueta="Plan / Membresía *">
              <input
                placeholder="Ej. Plan mensual"
                value={formulario.plan}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    plan: e.target.value,
                  })
                }
                style={input}
              />
            </Campo>

            <Campo etiqueta="Precio *">
              <input
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
                value={formulario.precio}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    precio: e.target.value,
                  })
                }
                style={input}
              />
            </Campo>

            <Campo etiqueta="Periodicidad">
              <select
                value={formulario.periodicidad}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    periodicidad:
                      e.target.value,
                  })
                }
                style={input}
              >
                <option>Diaria</option>
                <option>Semanal</option>
                <option>Quincenal</option>
                <option>Mensual</option>
                <option>Trimestral</option>
                <option>Semestral</option>
                <option>Anual</option>
              </select>
            </Campo>

            <Campo etiqueta="Forma de pago">
              <select
                value={formulario.formaPago}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    formaPago: e.target.value,
                  })
                }
                style={input}
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Yappy</option>
                <option>ACH</option>
                <option>Débito Directo</option>
              </select>
            </Campo>

            <Campo etiqueta="Responsable">
              <input
                placeholder="Administrador o vendedor"
                value={formulario.vendedor}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    vendedor: e.target.value,
                  })
                }
                style={input}
              />
            </Campo>

            <Campo etiqueta="Fecha de inicio *">
              <input
                type="date"
                value={formulario.fechaInicio}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    fechaInicio: e.target.value,
                  })
                }
                style={input}
              />
            </Campo>

            <Campo etiqueta="Fecha de vencimiento">
              <input
                value={calcularVencimiento()}
                readOnly
                style={inputLectura}
              />
            </Campo>

            <Campo etiqueta="Estado inicial">
              <select
                value={formulario.estado}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    estado: e.target.value,
                  })
                }
                style={input}
              >
                <option>Activo</option>
                <option>Pendiente</option>
                <option>Suspendido</option>
                <option>Cancelado</option>
              </select>
            </Campo>
          </div>

          <textarea
            placeholder="Descripción o nota de la membresía"
            value={formulario.descripcion}
            onChange={(e) =>
              setFormulario({
                ...formulario,
                descripcion: e.target.value,
              })
            }
            style={textarea}
          />

          <button
            onClick={crearSuscripcion}
            disabled={guardando}
            style={{
              ...boton,
              opacity: guardando ? 0.65 : 1,
            }}
          >
            {guardando
              ? "Guardando..."
              : "Crear membresía"}
          </button>
        </div>

        <div style={card}>
          <CabeceraSeccion
            titulo="Clientes con membresía"
            texto="Consulta estados, pagos, renovaciones y acciones."
            cantidad={membresiasFiltradas.length}
          />

          <div style={filtrosGrid}>
            <input
              placeholder="Buscar cliente, cédula, teléfono o plan..."
              value={busquedaMembresia}
              onChange={(e) =>
                setBusquedaMembresia(
                  e.target.value
                )
              }
              style={input}
            />

            <select
              value={filtroEstado}
              onChange={(e) =>
                setFiltroEstado(e.target.value)
              }
              style={input}
            >
              <option>Todos</option>
              <option>Activo</option>
              <option>Próxima a vencer</option>
              <option>Vencida</option>
              <option>Suspendido</option>
              <option>Cancelado</option>
            </select>

            <button
              onClick={() => {
                setBusquedaMembresia("");
                setFiltroEstado("Todos");
              }}
              style={botonSecundario}
            >
              Limpiar
            </button>
          </div>

          <div style={tablaContenedor}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Teléfono</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Precio</th>
                  <th style={th}>Vence</th>
                  <th style={th}>Días</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {membresiasFiltradas.length === 0 ? (
                  <tr>
                    <td style={tdVacio} colSpan="9">
                      No hay membresías registradas.
                    </td>
                  </tr>
                ) : (
                  membresiasFiltradas.map((item) => {
                    const dias =
                      calcularDiasParaVencer(
                        item.fecha_vencimiento
                      );
                    const estado =
                      obtenerEstadoAutomatico(item);

                    return (
                      <tr key={item.id}>
                        <td style={td}>
                          <strong>{item.cliente}</strong>
                        </td>
                        <td style={td}>{item.cedula}</td>
                        <td style={td}>
                          {item.telefono || "-"}
                        </td>
                        <td style={td}>{item.plan}</td>
                        <td style={td}>
                          $
                          {Number(
                            item.precio || 0
                          ).toFixed(2)}
                        </td>
                        <td style={td}>
                          {formatearFecha(
                            item.fecha_vencimiento
                          )}
                        </td>
                        <td style={td}>
                          {dias >= 0
                            ? dias
                            : `${Math.abs(
                                dias
                              )} vencido`}
                        </td>
                        <td style={td}>
                          <span
                            style={estiloEstado(
                              estado
                            )}
                          >
                            {estado}
                          </span>
                        </td>
                        <td style={td}>
                          <div style={accionesFlex}>
                            <button
                              style={botonPequeno}
                              onClick={() =>
                                abrirModalPago(item)
                              }
                            >
                              Registrar pago
                            </button>

                            {estado !== "Suspendido" &&
                              estado !==
                                "Cancelado" && (
                                <button
                                  style={botonNaranja}
                                  onClick={() =>
                                    cambiarEstado(
                                      item,
                                      "Suspendido"
                                    )
                                  }
                                >
                                  Suspender
                                </button>
                              )}

                            {estado !== "Activo" &&
                              estado !==
                                "Próxima a vencer" && (
                                <button
                                  style={botonAzul}
                                  onClick={() =>
                                    cambiarEstado(
                                      item,
                                      "Activo"
                                    )
                                  }
                                >
                                  Reactivar
                                </button>
                              )}

                            {estado !== "Cancelado" && (
                              <button
                                style={botonRojoMini}
                                onClick={() =>
                                  cambiarEstado(
                                    item,
                                    "Cancelado"
                                  )
                                }
                              >
                                Cancelar
                              </button>
                            )}

                            <button
                              style={
                                botonSecundarioMini
                              }
                              onClick={() =>
                                verHistorialCliente(
                                  item
                                )
                              }
                            >
                              Historial
                            </button>

                            <button
                              style={whatsappBtn}
                              onClick={() =>
                                enviarWhatsAppRecordatorio(
                                  item
                                )
                              }
                            >
                              WhatsApp
                            </button>

                            <button
                              style={promoBtn}
                              onClick={() =>
                                enviarWhatsAppPromocion(
                                  item
                                )
                              }
                            >
                              Promoción
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card} id="historial-pagos">
          <CabeceraSeccion
            titulo="Historial de pagos"
            texto="Últimos pagos registrados por membresías."
            cantidad={pagosFiltrados.length}
          />

          <div style={toolbar}>
            <input
              placeholder="Buscar por cliente, cédula, método o descripción..."
              value={busquedaPagos}
              onChange={(e) =>
                setBusquedaPagos(e.target.value)
              }
              style={input}
            />

            <button
              onClick={() =>
                setBusquedaPagos("")
              }
              style={botonSecundario}
            >
              Ver todos
            </button>
          </div>

          <div style={tablaContenedor}>
            <table style={tabla}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Cédula</th>
                  <th style={th}>Descripción</th>
                  <th style={th}>Monto</th>
                  <th style={th}>Método</th>
                </tr>
              </thead>

              <tbody>
                {pagosFiltrados.length === 0 ? (
                  <tr>
                    <td style={tdVacio} colSpan="6">
                      No hay pagos registrados.
                    </td>
                  </tr>
                ) : (
                  pagosFiltrados.map((pago) => (
                    <tr key={pago.id}>
                      <td style={td}>
                        {pago.fecha_pago
                          ? new Date(
                              pago.fecha_pago
                            ).toLocaleString()
                          : "-"}
                      </td>
                      <td style={td}>
                        {pago.cliente_nombre || "-"}
                      </td>
                      <td style={td}>
                        {pago.cliente_cedula || "-"}
                      </td>
                      <td style={td}>
                        {pago.descripcion || "-"}
                      </td>
                      <td style={td}>
                        $
                        {Number(
                          pago.monto || 0
                        ).toFixed(2)}
                      </td>
                      <td style={td}>
                        {pago.metodo_pago || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {pagoModal.item && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={modalHeader}>
              <div>
                <span style={modalEyebrow}>
                  REGISTRAR PAGO
                </span>
                <h2 style={modalTitle}>
                  Renovar membresía
                </h2>
                <p style={textoSuave}>
                  {pagoModal.item.cliente} ·{" "}
                  {pagoModal.item.plan}
                </p>
              </div>

              <button
                onClick={cerrarModalPago}
                style={cerrarModal}
                disabled={guardando}
              >
                ×
              </button>
            </div>

            <Campo etiqueta="Monto recibido">
              <input
                type="number"
                min="0"
                step="0.01"
                value={pagoModal.monto}
                onChange={(e) =>
                  setPagoModal({
                    ...pagoModal,
                    monto: e.target.value,
                  })
                }
                style={input}
              />
            </Campo>

            <Campo etiqueta="Método de pago">
              <select
                value={pagoModal.metodo}
                onChange={(e) =>
                  setPagoModal({
                    ...pagoModal,
                    metodo: e.target.value,
                  })
                }
                style={input}
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Yappy</option>
                <option>ACH</option>
                <option>Débito Directo</option>
              </select>
            </Campo>

            <Campo etiqueta="Observación">
              <textarea
                value={pagoModal.observacion}
                onChange={(e) =>
                  setPagoModal({
                    ...pagoModal,
                    observacion:
                      e.target.value,
                  })
                }
                style={textareaModal}
                placeholder="Observación opcional"
              />
            </Campo>

            <div style={modalResumen}>
              <span>
                Vencimiento actual:{" "}
                <strong>
                  {formatearFecha(
                    pagoModal.item
                      .fecha_vencimiento
                  )}
                </strong>
              </span>
              <span>
                Nueva vigencia:{" "}
                <strong>
                  {formatearFecha(
                    calcularVencimientoDesde(
                      ["Vencida", "Suspendido"].includes(
                        obtenerEstadoAutomatico(
                          pagoModal.item
                        )
                      )
                        ? fechaHoy()
                        : pagoModal.item
                            .fecha_vencimiento,
                      pagoModal.item.periodicidad
                    )
                  )}
                </strong>
              </span>
            </div>

            <div style={modalActions}>
              <button
                onClick={cerrarModalPago}
                style={botonCancelar}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                onClick={registrarPagoYRenovar}
                style={boton}
                disabled={guardando}
              >
                {guardando
                  ? "Procesando..."
                  : "Registrar pago y renovar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({
  titulo,
  valor,
  icono,
  destacado,
}) {
  return (
    <div
      style={
        destacado
          ? resumenCardDestacado
          : resumenCard
      }
    >
      <div style={kpiIcono}>{icono}</div>
      <span style={kpiTitulo}>{titulo}</span>
      <strong style={kpiValor}>{valor}</strong>
    </div>
  );
}

function Campo({ etiqueta, children }) {
  return (
    <label style={campo}>
      <span style={campoEtiqueta}>
        {etiqueta}
      </span>
      {children}
    </label>
  );
}

function CabeceraSeccion({
  titulo,
  texto,
  cantidad,
}) {
  return (
    <div style={cabeceraSeccion}>
      <div>
        <h2 style={tituloSeccion}>
          {titulo}
        </h2>
        <p style={textoSeccion}>{texto}</p>
      </div>

      {typeof cantidad === "number" && (
        <span style={contador}>
          {cantidad}
        </span>
      )}
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top right, rgba(22,163,74,.10), transparent 28%), #eef2f7",
  padding: "24px",
  color: "#111827",
  fontFamily:
    'Inter, Arial, system-ui, sans-serif',
};

const contenedor = {
  maxWidth: "1450px",
  margin: "0 auto",
};

const loadingPage = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  background: "#eef2f7",
  fontFamily:
    'Inter, Arial, system-ui, sans-serif',
};

const loadingLogo = {
  width: "230px",
  maxWidth: "75%",
  marginBottom: "10px",
};

const loadingTitle = {
  fontSize: "22px",
};

const hero = {
  background:
    "linear-gradient(135deg, #0a1710, #123924 65%, #17673e)",
  color: "#ffffff",
  padding: "28px",
  borderRadius: "24px",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  boxShadow:
    "0 20px 50px rgba(10, 60, 35, 0.20)",
};

const heroInfo = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
  minWidth: "280px",
};

const logoBox = {
  width: "185px",
  height: "76px",
  padding: "8px",
  display: "grid",
  placeItems: "center",
  background: "#ffffff",
  borderRadius: "16px",
};

const logoHero = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
};

const etiqueta = {
  margin: 0,
  color: "#82e1ac",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "1.3px",
};

const tituloHero = {
  margin: "4px 0",
  fontSize: "clamp(30px, 4vw, 44px)",
  fontWeight: "bold",
};

const subtituloHero = {
  color: "#d6eadf",
  marginTop: "7px",
  marginBottom: 0,
  fontSize: "14px",
  lineHeight: 1.5,
};

const botonClaro = {
  background: "rgba(255,255,255,.10)",
  color: "#ffffff",
  border:
    "1px solid rgba(255,255,255,.20)",
  padding: "12px 18px",
  borderRadius: "11px",
  fontWeight: "bold",
  cursor: "pointer",
};

const reglasBox = {
  marginBottom: "18px",
  padding: "13px 16px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  background: "#ffffff",
  border: "1px solid #dbe5de",
  borderRadius: "14px",
  color: "#526058",
  fontSize: "12px",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: "15px",
  marginBottom: "20px",
};

const resumenCard = {
  background: "#ffffff",
  padding: "18px",
  border: "1px solid #e0e7e2",
  borderRadius: "17px",
  boxShadow:
    "0 8px 24px rgba(15,23,42,.05)",
  display: "grid",
  gap: "8px",
};

const resumenCardDestacado = {
  background:
    "linear-gradient(135deg, #16834f, #125b39)",
  color: "#ffffff",
  padding: "18px",
  borderRadius: "17px",
  boxShadow:
    "0 12px 28px rgba(22,131,79,.20)",
  display: "grid",
  gap: "8px",
};

const kpiIcono = {
  fontSize: "25px",
};

const kpiTitulo = {
  color: "inherit",
  fontSize: "12px",
  fontWeight: "800",
};

const kpiValor = {
  fontSize: "26px",
};

const gridDos = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(340px,1fr))",
  gap: "20px",
};

const card = {
  background: "#ffffff",
  padding: "24px",
  border: "1px solid #e0e7e2",
  borderRadius: "20px",
  marginBottom: "20px",
  boxShadow:
    "0 10px 30px rgba(15,23,42,.055)",
};

const cabeceraSeccion = {
  marginBottom: "17px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  paddingBottom: "14px",
  borderBottom: "1px solid #edf1ee",
};

const tituloSeccion = {
  margin: 0,
  color: "#111827",
  fontSize: "22px",
};

const textoSeccion = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: "12px",
};

const contador = {
  minWidth: "35px",
  height: "35px",
  padding: "0 9px",
  display: "grid",
  placeItems: "center",
  borderRadius: "999px",
  background: "#eaf7ef",
  color: "#16834f",
  fontWeight: "900",
};

const textoSuave = {
  color: "#6b7280",
};

const alertaBox = {
  background: "#fffbea",
  padding: "15px",
  borderRadius: "13px",
  marginBottom: "10px",
  border: "1px solid #f0d98a",
};

const vencidaBox = {
  background: "#fff5f3",
  padding: "15px",
  borderRadius: "13px",
  marginBottom: "10px",
  border: "1px solid #efc5bf",
};

const panelItemHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const panelTexto = {
  margin: "5px 0 0",
  color: "#68756d",
  fontSize: "12px",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(230px,1fr))",
  gap: "15px",
};

const campo = {
  display: "flex",
  flexDirection: "column",
  gap: "7px",
};

const campoEtiqueta = {
  color: "#425048",
  fontSize: "12px",
  fontWeight: "800",
};

const toolbar = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0,1fr) auto",
  gap: "12px",
  marginBottom: "15px",
};

const filtrosGrid = {
  display: "grid",
  gridTemplateColumns:
    "minmax(260px,1fr) 220px auto",
  gap: "12px",
  marginBottom: "15px",
};

const input = {
  width: "100%",
  minHeight: "44px",
  padding: "11px 12px",
  borderRadius: "10px",
  border: "1px solid #cfd8d2",
  background: "#ffffff",
  boxSizing: "border-box",
  fontSize: "14px",
};

const inputLectura = {
  ...input,
  background: "#f1f5f2",
  color: "#17623c",
  fontWeight: "bold",
};

const textarea = {
  width: "100%",
  minHeight: "100px",
  marginTop: "15px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #cfd8d2",
  boxSizing: "border-box",
  resize: "vertical",
  fontFamily: "inherit",
};

const textareaModal = {
  ...textarea,
  marginTop: 0,
};

const boton = {
  marginTop: "15px",
  background: "#16834f",
  color: "#fff",
  border: "none",
  minHeight: "44px",
  padding: "11px 20px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botonCancelar = {
  ...boton,
  marginTop: "15px",
  background: "#ffffff",
  color: "#243129",
  border: "1px solid #cfd8d2",
};

const botonSecundario = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  minHeight: "44px",
  padding: "11px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const accionesFlex = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "12px",
};

const botonBaseMini = {
  color: "#ffffff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botonPequeno = {
  ...botonBaseMini,
  background: "#16834f",
};

const botonNaranja = {
  ...botonBaseMini,
  background: "#f97316",
};

const botonAzul = {
  ...botonBaseMini,
  background: "#2563eb",
};

const botonRojoMini = {
  ...botonBaseMini,
  background: "#dc2626",
};

const botonSecundarioMini = {
  ...botonBaseMini,
  background: "#111827",
};

const whatsappBtn = {
  ...botonBaseMini,
  background: "#128c4c",
};

const promoBtn = {
  ...botonBaseMini,
  background: "#7c3aed",
};

const tablaContenedor = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #e2e8e4",
  borderRadius: "13px",
};

const tabla = {
  width: "100%",
  minWidth: "1050px",
  borderCollapse: "collapse",
  fontSize: "13px",
};

const th = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  background: "#111827",
  color: "#ffffff",
  whiteSpace: "nowrap",
};

const td = {
  padding: "11px",
  borderBottom: "1px solid #edf1ee",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const tdVacio = {
  ...td,
  padding: "28px",
  color: "#6b7280",
  textAlign: "center",
};

const estadoBase = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 9px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "11px",
  whiteSpace: "nowrap",
};

const estadoVerde = {
  ...estadoBase,
  background: "#dcfce7",
  color: "#166534",
};

const estadoAmarillo = {
  ...estadoBase,
  background: "#fef3c7",
  color: "#92400e",
};

const estadoNaranja = {
  ...estadoBase,
  background: "#ffedd5",
  color: "#c2410c",
};

const estadoRojo = {
  ...estadoBase,
  background: "#fee2e2",
  color: "#991b1b",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "grid",
  placeItems: "center",
  padding: "20px",
  background: "rgba(10,23,16,.62)",
  backdropFilter: "blur(3px)",
};

const modalCard = {
  width: "min(520px,100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: "24px",
  borderRadius: "20px",
  background: "#ffffff",
  boxShadow:
    "0 30px 80px rgba(0,0,0,.28)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  marginBottom: "18px",
};

const modalEyebrow = {
  color: "#16834f",
  fontSize: "10px",
  fontWeight: "900",
  letterSpacing: "1.2px",
};

const modalTitle = {
  margin: "5px 0",
  fontSize: "25px",
};

const cerrarModal = {
  width: "38px",
  height: "38px",
  border: "1px solid #d9e1dc",
  borderRadius: "10px",
  background: "#ffffff",
  fontSize: "23px",
  cursor: "pointer",
};

const modalResumen = {
  marginTop: "16px",
  padding: "14px",
  display: "grid",
  gap: "8px",
  borderRadius: "12px",
  background: "#f2f7f4",
  color: "#4d5a52",
  fontSize: "12px",
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
};
