"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

// KONAX Clientes · Responsive gimnasio · Versión 2026.08.06-M
export default function ClientesPage() {
  const router = useRouter();

  const [accesoValidado, setAccesoValidado] = useState(false);
  const [modoSoloCliente, setModoSoloCliente] = useState(false);
  const [esNegocioMembresias, setEsNegocioMembresias] =
    useState(false);

  const [tipoNegocio, setTipoNegocio] = useState("");
  const [categoriaNegocio, setCategoriaNegocio] = useState("");
  const [planCodigo, setPlanCodigo] = useState("");
  const [gestores, setGestores] = useState([]);

  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [telefonoSecundario, setTelefonoSecundario] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referenciaNombre, setReferenciaNombre] = useState("");
  const [referenciaTelefono, setReferenciaTelefono] = useState("");
  const [estadoCliente, setEstadoCliente] = useState("Activo");
  const [tipoCliente, setTipoCliente] = useState("Miembro");
  const [aceptaWhatsapp, setAceptaWhatsapp] = useState(false);
  const [aceptaEmail, setAceptaEmail] = useState(false);
  const [observacionCliente, setObservacionCliente] = useState("");

  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [tipoProducto, setTipoProducto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [saldoActual, setSaldoActual] = useState("");
  const [cuota, setCuota] = useState("");
  const [periodicidad, setPeriodicidad] = useState("Mensual");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [estadoCuenta, setEstadoCuenta] = useState("Activo");

  const [estadoCobranza, setEstadoCobranza] = useState("Sin definir");
  const [fechaUltimoPago, setFechaUltimoPago] = useState("");
  const [montoUltimoPago, setMontoUltimoPago] = useState("");
  const [responsableCobro, setResponsableCobro] = useState("");
  const [observacionCobro, setObservacionCobro] = useState("");

  const [documentos, setDocumentos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [resultadosCliente, setResultadosCliente] = useState([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState("");
  const [clienteSeleccionadoNombre, setClienteSeleccionadoNombre] = useState("");

  useEffect(() => {
    validarAcceso();
  }, []);

  useEffect(() => {
    if (modoSoloCliente) return;

    const saldoParaCalcular =
      saldoActual !== ""
        ? saldoActual
        : montoTotal !== ""
        ? montoTotal
        : "";

    const estadoAutomatico =
      calcularEstadoCobranzaAutomatico(
        fechaVencimiento,
        saldoParaCalcular
      );

    setEstadoCobranza(estadoAutomatico);

    if (estadoAutomatico === "Cancelado") {
      setEstadoCuenta("Cancelado");
    } else if (
      estadoAutomatico !== "Sin definir" &&
      estadoCuenta === "Cancelado" &&
      convertirMonto(saldoParaCalcular) > 0
    ) {
      setEstadoCuenta("Activo");
    }
  }, [
    fechaVencimiento,
    saldoActual,
    montoTotal,
    modoSoloCliente,
  ]);

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function normalizarCodigo(valor) {
    return normalizar(valor).replace(/\s+/g, "_");
  }

  function limpiarMonto(valor) {
    const texto = String(valor ?? "")
      .replace(/,/g, "")
      .replace(/[^\d.]/g, "");

    const partes = texto.split(".");
    const entero = partes.shift() || "";
    const decimal = partes.join("").slice(0, 2);

    return texto.includes(".")
      ? `${entero}.${decimal}`
      : entero;
  }

  function convertirMonto(valor) {
    const limpio = String(valor ?? "")
      .replace(/,/g, "")
      .trim();

    if (!limpio) {
      return 0;
    }

    const numero = Number(limpio);

    return Number.isFinite(numero)
      ? numero
      : 0;
  }

  function formatearMonto(valor) {
    if (
      valor === "" ||
      valor === null ||
      valor === undefined
    ) {
      return "";
    }

    const numero = convertirMonto(valor);

    return numero.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function esAdministrador(rol) {
    return [
      "administrador",
      "superadmin",
      "admin master",
      "administrador master",
    ].includes(normalizar(rol));
  }

  function limpiarSesionYSalir(mensaje = "") {
    if (mensaje) alert(mensaje);
    localStorage.clear();
    router.replace("/login");
  }

  function obtenerEmpresaId() {
    const empresaId =
      localStorage.getItem("empresaId");

    if (!empresaId) {
      limpiarSesionYSalir(
        "La sesión no tiene una empresa activa. Inicie sesión nuevamente."
      );
      return null;
    }

    return empresaId;
  }

  function obtenerUsuarioId() {
    const usuarioId =
      localStorage.getItem("usuarioId");

    if (!usuarioId) {
      limpiarSesionYSalir(
        "La sesión no tiene un usuario activo. Inicie sesión nuevamente."
      );
      return null;
    }

    return usuarioId;
  }

  async function validarAcceso() {
    setAccesoValidado(false);

    const empresaId =
      localStorage.getItem("empresaId");
    const usuarioId =
      localStorage.getItem("usuarioId");

    if (!empresaId || !usuarioId) {
      limpiarSesionYSalir(
        "La sesión no es válida. Inicie sesión nuevamente."
      );
      return;
    }

    const {
      data: usuario,
      error: errorUsuario,
    } = await supabase
      .from("usuarios")
      .select("id, empresa_id, rol, estado")
      .eq("id", usuarioId)
      .maybeSingle();

    if (errorUsuario) {
      alert(
        "Error validando usuario: " +
          errorUsuario.message
      );
      return;
    }

    if (!usuario) {
      limpiarSesionYSalir(
        "El usuario de esta sesión ya no existe."
      );
      return;
    }

    if (
      normalizar(usuario.estado) !== "activo"
    ) {
      limpiarSesionYSalir(
        "Este usuario se encuentra inactivo."
      );
      return;
    }

    if (
      String(usuario.empresa_id) !==
      String(empresaId)
    ) {
      limpiarSesionYSalir(
        "La empresa activa no corresponde al usuario autenticado."
      );
      return;
    }

    const {
      data: empresa,
      error: errorEmpresa,
    } = await supabase
      .from("empresas")
      .select(`
        id,
        estado,
        estado_plan,
        plan_codigo,
        tipo_negocio,
        categoria_negocio
      `)
      .eq("id", empresaId)
      .maybeSingle();

    if (errorEmpresa) {
      alert(
        "Error validando empresa: " +
          errorEmpresa.message
      );
      return;
    }

    if (!empresa) {
      limpiarSesionYSalir(
        "La empresa de esta sesión ya no existe."
      );
      return;
    }

    if (
      normalizar(empresa.estado) ===
        "suspendido" ||
      normalizar(empresa.estado_plan) ===
        "suspendido"
    ) {
      limpiarSesionYSalir(
        "El servicio de esta empresa está suspendido."
      );
      return;
    }

    const tipoNegocioNormalizado =
      normalizar(empresa.tipo_negocio);

    const categoriaNormalizada =
      normalizar(empresa.categoria_negocio);

    const planNormalizado =
      normalizarCodigo(empresa.plan_codigo);

    const negocioDeMembresias =
      categoriaNormalizada.includes(
        "suscripciones"
      ) ||
      categoriaNormalizada.includes(
        "membresias"
      ) ||
      tipoNegocioNormalizado.includes(
        "gimnasio"
      ) ||
      tipoNegocioNormalizado.includes(
        "gym"
      ) ||
      tipoNegocioNormalizado.includes(
        "fitness"
      ) ||
      tipoNegocioNormalizado.includes(
        "academia"
      ) ||
      tipoNegocioNormalizado.includes(
        "club"
      );

    const negocioBelleza =
      tipoNegocioNormalizado.includes("belleza") ||
      tipoNegocioNormalizado.includes("salon") ||
      tipoNegocioNormalizado.includes("peluqueria") ||
      tipoNegocioNormalizado.includes("estetica") ||
      tipoNegocioNormalizado.includes("barberia") ||
      tipoNegocioNormalizado.includes("spa") ||
      categoriaNormalizada.includes("belleza");

    /*
      Solo los negocios de membresías registran primero
      una ficha neutral del cliente.

      Tanto KONAX Cobros como KONAX Ventas y Gestión
      deben permitir crear la cuenta por cobrar y la
      cobranza inicial desde Clientes.
    */
    const soloCliente =
      negocioDeMembresias || negocioBelleza;

    setTipoNegocio(
      empresa.tipo_negocio || ""
    );

    setCategoriaNegocio(
      empresa.categoria_negocio || ""
    );

    setPlanCodigo(
      empresa.plan_codigo || ""
    );

    setModoSoloCliente(soloCliente);

    setEsNegocioMembresias(
      negocioDeMembresias
    );

    localStorage.setItem(
      "tipoNegocio",
      empresa.tipo_negocio || ""
    );

    localStorage.setItem(
      "categoriaNegocio",
      empresa.categoria_negocio || ""
    );

    localStorage.setItem(
      "planCodigo",
      empresa.plan_codigo || ""
    );

    const {
      data: moduloEmpresa,
      error: errorModulo,
    } = await supabase
      .from("empresa_modulos")
      .select("clientes")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (errorModulo) {
      alert(
        "Error validando módulo Clientes: " +
          errorModulo.message
      );
      return;
    }

    if (!moduloEmpresa?.clientes) {
      alert(
        "El módulo Clientes no está activo para esta empresa."
      );
      router.replace("/dashboard");
      return;
    }

    if (!esAdministrador(usuario.rol)) {
      const {
        data: permiso,
        error: errorPermiso,
      } = await supabase
        .from("permisos_usuarios_empresa")
        .select("activo")
        .eq("empresa_id", empresaId)
        .eq("usuario_id", usuarioId)
        .eq("permiso", "clientes")
        .maybeSingle();

      if (errorPermiso) {
        alert(
          "Error validando permiso Clientes: " +
            errorPermiso.message
        );
        return;
      }

      if (!permiso?.activo) {
        alert(
          "No tienes permiso para acceder al módulo Clientes."
        );
        router.replace("/dashboard");
        return;
      }
    }

    localStorage.setItem(
      "usuarioRol",
      usuario.rol || ""
    );

    if (!soloCliente) {
      await cargarGestores(empresaId);
    }

    setAccesoValidado(true);
  }

  async function cargarGestores(
    empresaId
  ) {
    const { data, error } = await supabase
      .from("usuarios")
      .select(
        "id, nombre, correo, rol, estado"
      )
      .eq("empresa_id", empresaId)
      .eq("estado", "Activo")
      .order("nombre", {
        ascending: true,
      });

    if (error) {
      alert(
        "Error cargando gestores: " +
          error.message
      );
      setGestores([]);
      return;
    }

    const gestoresActivos = (
      data || []
    ).filter((usuario) =>
      [
        "gestor de cobro",
        "gestor de cobros",
        "gestor cobranza",
        "cobrador",
        "supervisor",
        "administrador",
      ].includes(normalizar(usuario.rol))
    );

    setGestores(gestoresActivos);
  }

  function volverCentroOperaciones() {
    router.push("/dashboard");
  }

  function abrirCargaCartera() {
    router.push("/clientes/carga-cartera");
  }

  function generarNumeroCuenta() {
    return "KX-" + Date.now();
  }

  function obtenerFechaLocalISO() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(
      hoy.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      hoy.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function calcularDiasMora(
    fecha,
    saldo = ""
  ) {
    if (
      saldo === "" ||
      saldo === null ||
      saldo === undefined ||
      !fecha ||
      convertirMonto(saldo) <= 0
    ) {
      return 0;
    }

    const hoy = new Date(
      `${obtenerFechaLocalISO()}T00:00:00`
    );

    const vencimiento = new Date(
      `${fecha}T00:00:00`
    );

    if (
      Number.isNaN(
        vencimiento.getTime()
      )
    ) {
      return 0;
    }

    const diferencia =
      hoy.getTime() -
      vencimiento.getTime();

    return diferencia > 0
      ? Math.floor(
          diferencia / 86400000
        )
      : 0;
  }

  function calcularEstadoCobranzaAutomatico(
    fecha,
    saldo
  ) {
    if (
      saldo === "" ||
      saldo === null ||
      saldo === undefined
    ) {
      return "Sin definir";
    }

    const saldoNumero =
      convertirMonto(saldo);

    if (saldoNumero <= 0) {
      return "Cancelado";
    }

    if (!fecha) {
      return "Al Día";
    }

    const hoy = new Date(
      `${obtenerFechaLocalISO()}T00:00:00`
    );

    const vencimiento = new Date(
      `${fecha}T00:00:00`
    );

    if (
      Number.isNaN(
        vencimiento.getTime()
      )
    ) {
      return "Al Día";
    }

    return vencimiento < hoy
      ? "Mora"
      : "Al Día";
  }

  function responsableFinal() {
    return (
      responsableCobro.trim() ||
      "Sin asignar"
    );
  }

  function construirObservacionCliente() {
    const partes = [
      observacionCliente.trim(),

      esNegocioMembresias
        ? `Tipo de cliente: ${tipoCliente}`
        : "",

      `Promociones por WhatsApp: ${
        aceptaWhatsapp ? "Sí" : "No"
      }`,

      `Promociones por correo: ${
        aceptaEmail ? "Sí" : "No"
      }`,
    ].filter(Boolean);

    return partes.join(" | ");
  }

  async function buscarClienteExistente() {
    const empresaId = obtenerEmpresaId();
    const termino = busquedaCliente.trim();
    if (!empresaId || !termino) {
      alert("Escriba una cédula, nombre o teléfono para buscar.");
      return;
    }
    setBuscandoCliente(true);
    setResultadosCliente([]);
    try {
      const terminoSeguro = termino.replace(/,/g, " ");
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .or(`cedula.ilike.%${terminoSeguro}%,nombre.ilike.%${terminoSeguro}%,telefono.ilike.%${terminoSeguro}%,telefono_secundario.ilike.%${terminoSeguro}%`)
        .order("nombre", { ascending: true })
        .limit(10);
      if (error) throw error;
      setResultadosCliente(data || []);
      if (!data || data.length === 0) alert("No se encontró ningún cliente con esos datos.");
    } catch (error) {
      alert("No se pudo buscar el cliente: " + (error?.message || "Error desconocido"));
    } finally {
      setBuscandoCliente(false);
    }
  }

  function usarClienteExistente(cliente) {
    setClienteSeleccionadoId(cliente.id);
    setClienteSeleccionadoNombre(cliente.nombre || "");
    setCedula(cliente.cedula || "");
    setNombre(cliente.nombre || "");
    setCorreo(cliente.correo || "");
    setTelefono(cliente.telefono || "");
    setTelefonoSecundario(cliente.telefono_secundario || "");
    setDireccion(cliente.direccion || "");
    setReferenciaNombre(cliente.referencia_nombre || "");
    setReferenciaTelefono(cliente.referencia_telefono || "");
    setEstadoCliente(cliente.estado || "Activo");
    setObservacionCliente(cliente.observacion || "");
    setResultadosCliente([]);
    setBusquedaCliente(cliente.cedula || cliente.nombre || cliente.telefono || "");
    alert(`Cliente cargado: ${cliente.nombre || "Sin nombre"}. Complete la información de la nueva cuenta.`);
  }

  function crearClienteNuevo() {
    setClienteSeleccionadoId("");
    setClienteSeleccionadoNombre("");
    setBusquedaCliente("");
    setResultadosCliente([]);
    setCedula("");
    setNombre("");
    setCorreo("");
    setTelefono("");
    setTelefonoSecundario("");
    setDireccion("");
    setReferenciaNombre("");
    setReferenciaTelefono("");
    setEstadoCliente("Activo");
    setObservacionCliente("");
  }

  function limpiarFormulario() {
    setCedula("");
    setNombre("");
    setCorreo("");
    setTelefono("");
    setTelefonoSecundario("");
    setDireccion("");
    setReferenciaNombre("");
    setReferenciaTelefono("");
    setEstadoCliente("Activo");
    setTipoCliente("Miembro");
    setAceptaWhatsapp(false);
    setAceptaEmail(false);
    setObservacionCliente("");

    setNumeroCuenta("");
    setTipoProducto("");
    setDescripcion("");
    setMontoTotal("");
    setSaldoActual("");
    setCuota("");
    setPeriodicidad("Mensual");
    setFechaInicio("");
    setFechaVencimiento("");
    setEstadoCuenta("Activo");

    setEstadoCobranza(
      "Sin definir"
    );
    setFechaUltimoPago("");
    setMontoUltimoPago("");
    setResponsableCobro("");
    setObservacionCobro("");
    setDocumentos([]);
    setBusquedaCliente("");
    setResultadosCliente([]);
    setClienteSeleccionadoId("");
    setClienteSeleccionadoNombre("");
  }

  async function validarSesionAntesDeGuardar() {
    const empresaId =
      obtenerEmpresaId();

    const usuarioId =
      obtenerUsuarioId();

    if (!empresaId || !usuarioId) {
      return null;
    }

    const { data: usuario, error } =
      await supabase
        .from("usuarios")
        .select(
          "id, empresa_id, estado"
        )
        .eq("id", usuarioId)
        .maybeSingle();

    if (error) {
      alert(
        "Error validando sesión: " +
          error.message
      );
      return null;
    }

    if (!usuario) {
      limpiarSesionYSalir(
        "La sesión ya no es válida."
      );
      return null;
    }

    if (
      normalizar(usuario.estado) !==
      "activo"
    ) {
      limpiarSesionYSalir(
        "El usuario se encuentra inactivo."
      );
      return null;
    }

    if (
      String(usuario.empresa_id) !==
      String(empresaId)
    ) {
      limpiarSesionYSalir(
        "La empresa activa no corresponde al usuario autenticado."
      );
      return null;
    }

    return {
      empresaId,
      usuarioId,
    };
  }

  async function subirDocumentos(
    clienteId,
    empresaId
  ) {
    if (
      documentos.length === 0
    ) {
      return;
    }

    for (const archivo of documentos) {
      const nombreLimpio =
        archivo.name.replace(
          /\s+/g,
          "_"
        );

      const ruta =
        `empresas/${empresaId}/clientes/${clienteId}/` +
        `${Date.now()}-${nombreLimpio}`;

      const { error } =
        await supabase.storage
          .from("documentos-clientes")
          .upload(ruta, archivo);

      if (error) {
        throw error;
      }
    }
  }

  async function guardarOActualizarCliente(
    empresaId
  ) {
    const cedulaLimpia = cedula.trim();
    const observacionFinal =
      construirObservacionCliente();

    if (clienteSeleccionadoId) {
      const { data: clienteSeleccionado, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("id", clienteSeleccionadoId)
        .maybeSingle();

      if (error) {
        throw new Error(
          "No se pudo cargar el cliente seleccionado: " +
            error.message
        );
      }

      if (!clienteSeleccionado) {
        throw new Error(
          "El cliente seleccionado ya no está disponible. Búsquelo nuevamente."
        );
      }

      return {
        ...clienteSeleccionado,
        fueActualizado: false,
        fueSeleccionado: true,
      };
    }

    const {
      data: clienteExistente,
      error: errorBuscarCliente,
    } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cedula", cedulaLimpia)
      .maybeSingle();

    if (errorBuscarCliente) {
      console.error(
        "Error buscando cliente:",
        errorBuscarCliente
      );

      throw new Error(
        "No se pudo verificar si el cliente ya está registrado."
      );
    }

    if (clienteExistente) {
      const confirmarActualizacion =
        window.confirm(
          "Ya existe un cliente registrado con esta cédula.\n\n" +
            `Cliente encontrado: ${
              clienteExistente.nombre ||
              "Sin nombre"
            }\n\n` +
            "Presione Aceptar para usar este cliente y crearle una cuenta nueva."
        );

      if (!confirmarActualizacion) {
        const errorDuplicado =
          new Error(
            "El cliente no fue duplicado. Use la búsqueda superior para cargarlo."
          );

        errorDuplicado.name =
          "ClienteDuplicado";

        throw errorDuplicado;
      }

      const { data, error } =
        await supabase
          .from("clientes")
          .update({
            nombre: nombre.trim(),
            telefono: telefono.trim(),
            telefono_secundario:
              telefonoSecundario.trim(),
            direccion: direccion.trim(),
            correo: correo.trim(),
            referencia_nombre:
              referenciaNombre.trim(),
            referencia_telefono:
              referenciaTelefono.trim(),
            estado: estadoCliente,
            observacion:
              observacionFinal,
          })
          .eq("empresa_id", empresaId)
          .eq(
            "id",
            clienteExistente.id
          )
          .select()
          .single();

      if (error) {
        console.error(
          "Error actualizando cliente:",
          error
        );

        throw new Error(
          "El cliente ya existe, pero no se pudieron actualizar sus datos."
        );
      }

      return {
        ...data,
        fueActualizado: true,
      };
    }

    const { data, error } =
      await supabase
        .from("clientes")
        .insert([
          {
            empresa_id: empresaId,
            cedula: cedulaLimpia,
            nombre: nombre.trim(),
            telefono: telefono.trim(),
            telefono_secundario:
              telefonoSecundario.trim(),
            direccion: direccion.trim(),
            correo: correo.trim(),
            referencia_nombre:
              referenciaNombre.trim(),
            referencia_telefono:
              referenciaTelefono.trim(),
            estado: estadoCliente,
            observacion:
              observacionFinal,
          },
        ])
        .select()
        .single();

    if (error) {
      console.error(
        "Error guardando cliente:",
        error
      );

      const mensajeError =
        String(
          error.message || ""
        ).toLowerCase();

      if (
        error.code === "23505" ||
        mensajeError.includes(
          "clientes_cedula_key"
        ) ||
        mensajeError.includes(
          "duplicate key"
        )
      ) {
        throw new Error(
          "Ya existe un cliente registrado con esta cédula. Búsquelo en el listado para consultar o actualizar su información."
        );
      }

      throw new Error(
        "No se pudo guardar el cliente. Revise la información e intente nuevamente."
      );
    }

    return {
      ...data,
      fueActualizado: false,
    };
  }

  function esNegocioBellezaActual() {
    const texto = normalizar(
      `${tipoNegocio || ""} ${categoriaNegocio || ""}`
    );

    return [
      "belleza",
      "salon",
      "peluqueria",
      "estetica",
      "barberia",
      "spa",
    ].some((palabra) => texto.includes(palabra));
  }

  async function guardarRegistro() {
    if (guardando) return;

    const sesion =
      await validarSesionAntesDeGuardar();

    if (!sesion) return;

    const { empresaId } = sesion;

    if (
      !cedula ||
      !nombre ||
      !telefono
    ) {
      alert(
        "Complete cédula, nombre y teléfono."
      );
      return;
    }

    if (
      aceptaEmail &&
      !correo.trim()
    ) {
      alert(
        "Ingrese un correo para autorizar promociones por correo electrónico."
      );
      return;
    }

    if (
      aceptaWhatsapp &&
      !telefono.trim()
    ) {
      alert(
        "Ingrese un teléfono para autorizar promociones por WhatsApp."
      );
      return;
    }

    if (!modoSoloCliente) {
      if (!tipoProducto) {
        alert(
          "Seleccione el tipo de cuenta."
        );
        return;
      }

      if (
        !montoTotal &&
        !saldoActual
      ) {
        alert(
          "Ingrese monto original o saldo actual."
        );
        return;
      }
    }

    setGuardando(true);

    try {
      const clienteCreado =
        await guardarOActualizarCliente(
          empresaId
        );

      await subirDocumentos(
        clienteCreado.id,
        empresaId
      );

      if (modoSoloCliente) {
        alert(
          clienteCreado.fueActualizado
            ? "El cliente ya estaba registrado. Sus datos fueron actualizados correctamente."
            : esNegocioMembresias
            ? "Cliente registrado correctamente. Ahora puede buscarlo en Caja o Suscripciones."
            : esNegocioBellezaActual()
            ? "Cliente registrado correctamente. Ya puede utilizarlo en Agenda y Caja."
            : "Cliente registrado correctamente. Ahora puede utilizarlo en Ventas, Caja o Cuentas por Cobrar."
        );

        limpiarFormulario();
        return;
      }

      const montoTotalNumero =
        convertirMonto(
          montoTotal ||
            saldoActual ||
            0
        );

      const saldoActualNumero =
        saldoActual !== ""
          ? convertirMonto(
              saldoActual
            )
          : montoTotalNumero;

      const cuotaNumero =
        cuota !== ""
          ? convertirMonto(cuota)
          : 0;

      if (
        montoTotalNumero < 0 ||
        saldoActualNumero < 0 ||
        cuotaNumero < 0
      ) {
        throw new Error(
          "Los montos no pueden ser negativos."
        );
      }

      if (cuotaNumero <= 0) {
        throw new Error(
          "Ingrese una cuota válida para la cuenta."
        );
      }

      if (!periodicidad) {
        throw new Error(
          "Seleccione la periodicidad de la cuota."
        );
      }

      if (
        saldoActualNumero >
          montoTotalNumero &&
        montoTotalNumero > 0
      ) {
        throw new Error(
          "El saldo actual no puede superar el monto total original."
        );
      }

      const montoUltimoPagoNumero =
        convertirMonto(
          montoUltimoPago
        );

      if (
        montoUltimoPagoNumero < 0
      ) {
        throw new Error(
          "El monto del último pago no puede ser negativo."
        );
      }

      if (
        fechaUltimoPago &&
        montoUltimoPagoNumero <= 0
      ) {
        throw new Error(
          "Si coloca una fecha de último pago, también debe ingresar el monto pagado."
        );
      }

      if (
        !fechaUltimoPago &&
        montoUltimoPagoNumero > 0
      ) {
        throw new Error(
          "Si ingresa un monto de último pago, también debe colocar la fecha del pago."
        );
      }

      const estadoCobranzaFinal =
        calcularEstadoCobranzaAutomatico(
          fechaVencimiento,
          saldoActualNumero
        );

      const diasMora =
        calcularDiasMora(
          fechaVencimiento,
          saldoActualNumero
        );

      const estadoCuentaFinal =
        saldoActualNumero <= 0
          ? "Cancelado"
          : estadoCuenta ===
            "Cancelado"
          ? "Activo"
          : estadoCuenta;

      const cuentaFinal =
        numeroCuenta.trim() ||
        generarNumeroCuenta();

      const {
        data: comercialCreado,
        error: errorComercial,
      } = await supabase
        .from(
          "informacion_comercial"
        )
        .insert([
          {
            empresa_id: empresaId,
            cliente_id:
              clienteCreado.id,
            numero_cuenta:
              cuentaFinal,
            tipo_producto:
              tipoProducto,
            descripcion:
              descripcion.trim(),
            modalidad:
              periodicidad,
            monto_total:
              montoTotalNumero,
            saldo_actual:
              saldoActualNumero,
            cuota:
              cuotaNumero,
            fecha_inicio:
              fechaInicio || null,
            fecha_vencimiento:
              fechaVencimiento ||
              null,
            responsable:
              responsableFinal(),
            estado:
              estadoCuentaFinal,
            observacion:
              observacionCobro.trim(),
          },
        ])
        .select()
        .single();

      if (errorComercial) {
        throw new Error(
          "Error en información comercial: " +
            errorComercial.message
        );
      }

      const {
        error: errorCobranza,
      } = await supabase
        .from(
          "informacion_cobranza"
        )
        .insert([
          {
            empresa_id: empresaId,
            cliente_id:
              clienteCreado.id,
            informacion_comercial_id:
              comercialCreado.id,
            estado_cobranza:
              estadoCobranzaFinal,
            dias_mora: diasMora,
            fecha_ultimo_pago:
              fechaUltimoPago ||
              null,
            monto_ultimo_pago:
              montoUltimoPagoNumero,
            responsable_cobro:
              responsableFinal(),
            observacion_cobro:
              observacionCobro.trim() ||
              "Cuenta creada desde Clientes",
          },
        ]);

      if (errorCobranza) {
        throw new Error(
          "Error en cobranza inicial: " +
            errorCobranza.message
        );
      }

      alert(
        clienteCreado.fueSeleccionado
          ? `Cliente existente utilizado correctamente. Se creó la nueva cuenta ${cuentaFinal} sin duplicar al cliente.`
          : clienteCreado.fueActualizado
          ? `Los datos del cliente fueron actualizados y se creó la cuenta ${cuentaFinal}.`
          : `Cliente y cuenta registrados correctamente. Cuenta: ${cuentaFinal}.`
      );

      limpiarFormulario();
    } catch (error) {
      if (
        error?.name ===
        "ClienteDuplicado"
      ) {
        alert(error.message);
        return;
      }

      alert(
        error?.message ||
          "Ocurrió un error guardando el registro."
      );
    } finally {
      setGuardando(false);
    }
  }

  if (!accesoValidado) {
    return (
      <div
        style={
          styles.cargandoPagina
        }
      >
        <div
          style={
            styles.cargandoCard
          }
        >
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={
              styles.cargandoLogo
            }
          />

          <strong
            style={
              styles.cargandoTitulo
            }
          >
            Validando acceso
          </strong>

          <p
            style={
              styles.cargandoTexto
            }
          >
            Verificando usuario,
            empresa, plan y
            permisos.
          </p>
        </div>
      </div>
    );
  }

  const saldoVisual =
    saldoActual !== ""
      ? convertirMonto(saldoActual)
      : montoTotal !== ""
      ? convertirMonto(montoTotal)
      : 0;

  const saldoParaEstadoVisual =
    saldoActual !== ""
      ? saldoActual
      : montoTotal !== ""
      ? montoTotal
      : "";

  const diasMoraVisual =
    calcularDiasMora(
      fechaVencimiento,
      saldoParaEstadoVisual
    );

  const esGimnasioPerfil = [
    "gimnasio",
    "gym",
    "fitness",
  ].some((palabra) =>
    normalizar(tipoNegocio).includes(palabra)
  );

  const textoPerfilNegocio = normalizar(
    `${tipoNegocio} ${categoriaNegocio}`
  );

  const esBellezaPerfil = [
    "belleza",
    "salon",
    "peluqueria",
    "estetica",
    "barberia",
    "spa",
  ].some((palabra) =>
    textoPerfilNegocio.includes(palabra)
  );

  return (
    <main
      style={styles.pagina}
      className={
        esGimnasioPerfil || esBellezaPerfil
          ? "clientes-page clientes-gym-mobile"
          : "clientes-page"
      }
    >
      <style>{`
        @media (max-width: 900px), (max-device-width: 900px), (pointer: coarse) {
          .clientes-gym-mobile {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 10px !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
          }

          .clientes-gym-mobile .clientes-contenedor {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 auto !important;
          }

          .clientes-gym-mobile .clientes-hero {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin-bottom: 12px !important;
            padding: 16px !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            align-items: stretch !important;
            gap: 14px !important;
            border-radius: 18px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .clientes-gym-mobile .clientes-hero-principal {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            align-items: start !important;
            gap: 12px !important;
          }

          .clientes-gym-mobile .clientes-logo-panel {
            width: 160px !important;
            min-width: 0 !important;
            max-width: 58vw !important;
            height: 70px !important;
            padding: 8px !important;
            border-radius: 14px !important;
          }

          .clientes-gym-mobile .clientes-hero-principal > div:last-child {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .clientes-gym-mobile .clientes-hero-principal h1 {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 0 7px !important;
            font-size: 30px !important;
            line-height: 1.04 !important;
            letter-spacing: -.5px !important;
            overflow-wrap: anywhere !important;
          }

          .clientes-gym-mobile .clientes-hero-principal p {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            font-size: 12px !important;
            line-height: 1.45 !important;
            overflow-wrap: anywhere !important;
          }

          .clientes-gym-mobile .clientes-hero-acciones {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 9px !important;
          }

          .clientes-gym-mobile .clientes-hero-acciones button {
            width: 100% !important;
            min-width: 0 !important;
          }

          .clientes-gym-mobile .clientes-resumen-grid {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: 1fr !important;
            gap: 9px !important;
            margin-bottom: 12px !important;
          }

          .clientes-gym-mobile .clientes-resumen-grid article {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .clientes-gym-mobile .clientes-form-layout {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .clientes-gym-mobile .clientes-main-column,
          .clientes-gym-mobile .clientes-side-column {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .clientes-gym-mobile .clientes-side-column {
            position: static !important;
            top: auto !important;
          }

          .clientes-gym-mobile .clientes-card,
          .clientes-gym-mobile .clientes-busqueda-card,
          .clientes-gym-mobile .clientes-side-card,
          .clientes-gym-mobile .clientes-sticky-actions {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 15px !important;
            border-radius: 17px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .clientes-gym-mobile .clientes-section-header {
            width: 100% !important;
            min-width: 0 !important;
            align-items: flex-start !important;
            gap: 10px !important;
            margin-bottom: 16px !important;
            padding-bottom: 14px !important;
          }

          .clientes-gym-mobile .clientes-section-header > div:last-child {
            min-width: 0 !important;
          }

          .clientes-gym-mobile .clientes-section-header h2 {
            font-size: 20px !important;
            line-height: 1.1 !important;
            overflow-wrap: anywhere !important;
          }

          .clientes-gym-mobile .clientes-section-header p {
            font-size: 11px !important;
            line-height: 1.4 !important;
          }

          .clientes-gym-mobile .clientes-grid {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }

          .clientes-gym-mobile .clientes-busqueda-fila {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            grid-template-columns: 1fr !important;
            gap: 9px !important;
          }

          .clientes-gym-mobile .clientes-busqueda-fila button {
            width: 100% !important;
          }

          .clientes-gym-mobile .clientes-resultado-fila {
            width: 100% !important;
            min-width: 0 !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            align-items: stretch !important;
            gap: 10px !important;
            box-sizing: border-box !important;
          }

          .clientes-gym-mobile .clientes-resultado-fila button {
            width: 100% !important;
          }

          .clientes-gym-mobile .clientes-consentimiento {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .clientes-gym-mobile input,
          .clientes-gym-mobile select,
          .clientes-gym-mobile textarea,
          .clientes-gym-mobile button {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .clientes-gym-mobile input,
          .clientes-gym-mobile select,
          .clientes-gym-mobile textarea {
            font-size: 16px !important;
          }

          .clientes-gym-mobile textarea {
            min-height: 90px !important;
          }

          .clientes-gym-mobile .clientes-sticky-actions {
            position: static !important;
          }

          .clientes-gym-mobile .clientes-sticky-actions button {
            width: 100% !important;
          }

          .clientes-gym-mobile * {
            box-sizing: border-box !important;
          }

          .clientes-gym-mobile .clientes-side-card {
            overflow: visible !important;
          }

          .clientes-gym-mobile .clientes-side-card > div {
            min-width: 0 !important;
          }

          .clientes-gym-mobile .clientes-resumen-fila {
            width: 100% !important;
            min-width: 0 !important;
            gap: 10px !important;
          }

          .clientes-gym-mobile .clientes-resumen-fila > span,
          .clientes-gym-mobile .clientes-resumen-fila > strong {
            min-width: 0 !important;
          }

          .clientes-gym-mobile .clientes-resumen-fila > strong {
            max-width: 55% !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            overflow-wrap: anywhere !important;
          }

          .clientes-gym-mobile .clientes-consentimiento label {
            width: 100% !important;
            min-width: 0 !important;
            align-items: flex-start !important;
            line-height: 1.35 !important;
            overflow-wrap: anywhere !important;
          }

          .clientes-gym-mobile .clientes-consentimiento input[type="checkbox"] {
            flex: 0 0 auto !important;
            margin-top: 2px !important;
          }
        }

        @media (max-width: 390px), (max-device-width: 390px) {
          .clientes-gym-mobile .clientes-hero-principal h1 {
            font-size: 27px !important;
          }

          .clientes-gym-mobile .clientes-logo-panel {
            width: 145px !important;
          }
        }
      `}</style>
      <div style={styles.contenedor} className="clientes-contenedor">
        <header style={styles.hero} className="clientes-hero">
          <div
            style={
              styles.heroPrincipal
            }
            className="clientes-hero-principal"
          >
            <div
              style={
                styles.logoPanel
              }
              className="clientes-logo-panel"
            >
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={styles.logo}
              />
            </div>

            <div>
              <span
                style={
                  styles.etiqueta
                }
              >
                {esGimnasioPerfil
                  ? "GESTIÓN DE ALUMNOS"
                  : modoSoloCliente
                  ? "GESTIÓN DE CLIENTES"
                  : "GESTIÓN DE CARTERA"}
              </span>

              <h1
                style={styles.titulo}
              >
                {esGimnasioPerfil
                  ? "Registrar nuevo alumno"
                  : modoSoloCliente
                  ? "Registrar nuevo cliente"
                  : "Nueva cuenta por cobrar"}
              </h1>

              <p
                style={
                  styles.subtitulo
                }
              >
                {esGimnasioPerfil
                  ? "Registra los datos del alumno para luego asignar su membresía, cobrar y controlar sus accesos."
                  : modoSoloCliente
                  ? esNegocioMembresias
                    ? "Registra miembros, visitas únicas y prospectos para utilizarlos después en Caja o Suscripciones."
                    : "Registra los datos del cliente. La modalidad de venta o pago se seleccionará después en Ventas, Caja o Cuentas por Cobrar."
                  : "Registra al cliente, crea la cuenta y configura la gestión inicial de cobranza."}
              </p>
            </div>
          </div>

          <div style={styles.heroAcciones} className="clientes-hero-acciones">
            {!modoSoloCliente && (
              <button
                type="button"
                onClick={abrirCargaCartera}
                style={styles.botonCargaCartera}
              >
                ↑ Carga de cartera
              </button>
            )}

            <button
              type="button"
              onClick={
                volverCentroOperaciones
              }
              style={
                styles.botonVolver
              }
            >
              ← Centro de Operaciones
            </button>
          </div>
        </header>

        <section
          style={
            styles.resumenGrid
          }
          className="clientes-resumen-grid"
        >

          {esNegocioMembresias ? (
            <KPI
              titulo="Tipo de cliente"
              valor={tipoCliente}
              detalle={
                tipoNegocio ||
                "Membresías"
              }
              icono="🏷️"
            />
          ) : (
            <KPI
              titulo="Estado del cliente"
              valor={estadoCliente}
              detalle={
                tipoNegocio ||
                categoriaNegocio ||
                "Negocio"
              }
              icono="🏷️"
            />
          )}

          <KPI
            titulo="Contacto promocional"
            valor={
              aceptaWhatsapp ||
              aceptaEmail
                ? "Autorizado"
                : "No autorizado"
            }
            detalle={`WhatsApp: ${
              aceptaWhatsapp
                ? "Sí"
                : "No"
            } · Correo: ${
              aceptaEmail
                ? "Sí"
                : "No"
            }`}
            icono="📣"
          />

          {!modoSoloCliente && (
            <KPI
              titulo="Estado de cobranza"
              valor={
                estadoCobranza
              }
              detalle={`${diasMoraVisual} días de mora`}
              icono="📊"
              destacado={
                estadoCobranza ===
                "Mora"
              }
            />
          )}
        </section>

        <section
          style={
            styles.formLayout
          }
          className="clientes-form-layout"
        >
          <div
            style={
              styles.mainColumn
            }
            className="clientes-main-column"
          >
            {!modoSoloCliente && (
              <article style={styles.cardBusquedaCliente} className="clientes-busqueda-card">
                <div style={styles.busquedaClienteHeader}>
                  <div>
                    <span style={styles.sectionNumber}></span>
                    <h2 style={styles.tituloSeccion}>Buscar / Crear</h2>
                    <p style={styles.textoSeccion}></p>
                  </div>
                  {clienteSeleccionadoId && (
                    <span style={styles.clienteSeleccionadoBadge}>Cliente cargado: {clienteSeleccionadoNombre || nombre}</span>
                  )}
                </div>
                <div style={styles.busquedaClienteFila} className="clientes-busqueda-fila">
                  <input
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarClienteExistente(); } }}
                    style={styles.inputStyle}
                    placeholder="Cédula, nombre o teléfono"
                  />
                  <button type="button" onClick={buscarClienteExistente} style={styles.botonBuscarCliente} disabled={buscandoCliente}>
                    {buscandoCliente ? "Buscando..." : "Buscar cliente"}
                  </button>
                  <button type="button" onClick={crearClienteNuevo} style={styles.botonNuevoCliente} disabled={buscandoCliente}>
                    Crear cliente nuevo
                  </button>
                </div>
                {resultadosCliente.length > 0 && (
                  <div style={styles.resultadosCliente}>
                    {resultadosCliente.map((cliente) => (
                      <div key={cliente.id} style={styles.resultadoClienteFila} className="clientes-resultado-fila">
                        <div>
                          <strong>{cliente.nombre || "Sin nombre"}</strong>
                          <div style={styles.resultadoClienteDetalle}>Cédula: {cliente.cedula || "-"} · Teléfono: {cliente.telefono || "-"}</div>
                        </div>
                        <button type="button" onClick={() => usarClienteExistente(cliente)} style={styles.botonUsarCliente}>Usar este cliente</button>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )}

            <article
              style={styles.card}
              className="clientes-card"
            >
              <SectionTitle
                numero="01"
                titulo={
                  esGimnasioPerfil
                    ? "Información del alumno"
                    : "Información del cliente"
                }
                texto={
                  esGimnasioPerfil
                    ? "Datos personales y de contacto del alumno."
                    : esNegocioMembresias
                    ? "Datos personales, contacto y clasificación de membresía."
                    : "Datos personales y de contacto del cliente."
                }
              />

              <div
                style={styles.grid}
              >
                <Campo label="Cédula / Identificación *">
                  <input
                    value={cedula}
                    onChange={(e) =>
                      setCedula(
                        e.target.value
                      )
                    }
                    style={
                      styles.inputStyle
                    }
                    placeholder="Ej. 8-888-888"
                  />
                </Campo>

                <Campo label="Nombre completo *">
                  <input
                    value={nombre}
                    onChange={(e) =>
                      setNombre(
                        e.target.value
                      )
                    }
                    style={
                      styles.inputStyle
                    }
                    placeholder={
                      esGimnasioPerfil
                        ? "Nombre del alumno"
                        : "Nombre del cliente"
                    }
                  />
                </Campo>

                {esNegocioMembresias && (
                  <Campo label="Tipo de cliente">
                    <select
                      value={
                        tipoCliente
                      }
                      onChange={(e) =>
                        setTipoCliente(
                          e.target.value
                        )
                      }
                      style={
                        styles.selectStyle
                      }
                    >
                      <option>
                        Miembro
                      </option>
                      <option>
                        Visita única
                      </option>
                      <option>
                        Prospecto
                      </option>
                    </select>
                  </Campo>
                )}

                <Campo label="Correo electrónico">
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) =>
                      setCorreo(
                        e.target.value
                      )
                    }
                    style={
                      styles.inputStyle
                    }
                    placeholder="correo@cliente.com"
                  />
                </Campo>

                <Campo label="Teléfono principal *">
                  <input
                    value={telefono}
                    onChange={(e) =>
                      setTelefono(
                        e.target.value
                      )
                    }
                    style={
                      styles.inputStyle
                    }
                    placeholder="Teléfono"
                  />
                </Campo>

                <Campo label="Teléfono secundario">
                  <input
                    value={
                      telefonoSecundario
                    }
                    onChange={(e) =>
                      setTelefonoSecundario(
                        e.target.value
                      )
                    }
                    style={
                      styles.inputStyle
                    }
                    placeholder="Opcional"
                  />
                </Campo>

                <Campo
                  label={
                    esGimnasioPerfil
                      ? "Estado del alumno"
                      : "Estado del cliente"
                  }
                >
                  <select
                    value={
                      estadoCliente
                    }
                    onChange={(e) =>
                      setEstadoCliente(
                        e.target.value
                      )
                    }
                    style={
                      styles.selectStyle
                    }
                  >
                    <option>
                      Activo
                    </option>
                    <option>
                      Inactivo
                    </option>
                  </select>
                </Campo>

                <Campo label="Nombre de referencia">
                  <input
                    value={
                      referenciaNombre
                    }
                    onChange={(e) =>
                      setReferenciaNombre(
                        e.target.value
                      )
                    }
                    style={
                      styles.inputStyle
                    }
                  />
                </Campo>

                <Campo label="Teléfono de referencia">
                  <input
                    value={
                      referenciaTelefono
                    }
                    onChange={(e) =>
                      setReferenciaTelefono(
                        e.target.value
                      )
                    }
                    style={
                      styles.inputStyle
                    }
                  />
                </Campo>
              </div>

              <Campo label="Dirección completa">
                <textarea
                  value={direccion}
                  onChange={(e) =>
                    setDireccion(
                      e.target.value
                    )
                  }
                  style={
                    styles.textarea
                  }
                />
              </Campo>

              <Campo
                label={
                  esGimnasioPerfil
                    ? "Observaciones del alumno"
                    : "Observaciones del cliente"
                }
              >
                <textarea
                  value={
                    observacionCliente
                  }
                  onChange={(e) =>
                    setObservacionCliente(
                      e.target.value
                    )
                  }
                  style={
                    styles.textarea
                  }
                  placeholder={
                    esGimnasioPerfil
                      ? "Agregue información útil sobre el alumno."
                      : "Agregue información útil sobre el cliente."
                  }
                />
              </Campo>

              <div
                style={
                  styles.consentimientoBox
                }
                className="clientes-consentimiento"
              >
                <span
                  style={
                    styles.consentimientoTitulo
                  }
                >
                  Autorización para promociones
                </span>

                <label
                  style={
                    styles.checkLabel
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      aceptaWhatsapp
                    }
                    onChange={(e) =>
                      setAceptaWhatsapp(
                        e.target.checked
                      )
                    }
                  />
                  Acepta recibir
                  promociones y
                  novedades por
                  WhatsApp.
                </label>

                <label
                  style={
                    styles.checkLabel
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      aceptaEmail
                    }
                    onChange={(e) =>
                      setAceptaEmail(
                        e.target.checked
                      )
                    }
                  />
                  Acepta recibir
                  promociones y
                  novedades por
                  correo.
                </label>
              </div>

              <Campo label="Documentos del cliente">
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setDocumentos(
                      Array.from(
                        e.target.files ||
                          []
                      )
                    )
                  }
                  style={
                    styles.inputStyle
                  }
                />

                {documentos.length >
                  0 && (
                  <span
                    style={
                      styles.fileCount
                    }
                  >
                    {
                      documentos.length
                    }{" "}
                    archivo(s)
                    seleccionado(s)
                  </span>
                )}
              </Campo>
            </article>

            {!modoSoloCliente && (
              <>
                <article
                  style={
                    styles.card
                  }
                  className="clientes-card"
                >
                  <SectionTitle
                    numero="02"
                    titulo="Información de la cuenta"
                    texto="Monto original, saldo pendiente y fechas."
                  />

                  <div
                    style={
                      styles.grid
                    }
                    className="clientes-grid"
                  >
                    <Campo label="Número de cuenta">
                      <input
                        value={
                          numeroCuenta
                        }
                        onChange={(e) =>
                          setNumeroCuenta(
                            e.target.value
                          )
                        }
                        style={
                          styles.inputStyle
                        }
                      />
                    </Campo>

                    <Campo label="Tipo de cuenta *">
                      <select
                        value={
                          tipoProducto
                        }
                        onChange={(e) =>
                          setTipoProducto(
                            e.target.value
                          )
                        }
                        style={
                          styles.selectStyle
                        }
                      >
                        <option value="">
                          Seleccione tipo
                          de cuenta
                        </option>
                        <option>
                          Crédito
                        </option>
                        <option>
                          Préstamo
                        </option>
                        <option>
                          Cuenta por
                          cobrar
                        </option>
                        <option>
                          Refinanciamiento
                        </option>
                        <option>
                          Servicio
                          pendiente
                        </option>
                      </select>
                    </Campo>

                    <Campo label="Monto total original *">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          montoTotal
                        }
                        onChange={(e) =>
                          setMontoTotal(
                            limpiarMonto(
                              e.target.value
                            )
                          )
                        }
                        onBlur={() =>
                          setMontoTotal(
                            formatearMonto(
                              montoTotal
                            )
                          )
                        }
                        style={
                          styles.inputStyle
                        }
                      />
                    </Campo>

                    <Campo label="Saldo actual *">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          saldoActual
                        }
                        onChange={(e) =>
                          setSaldoActual(
                            limpiarMonto(
                              e.target.value
                            )
                          )
                        }
                        onBlur={() =>
                          setSaldoActual(
                            formatearMonto(
                              saldoActual
                            )
                          )
                        }
                        style={
                          styles.inputStyle
                        }
                      />
                    </Campo>

                    <Campo label="Cuota *">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={cuota}
                        onChange={(e) =>
                          setCuota(
                            limpiarMonto(
                              e.target.value
                            )
                          )
                        }
                        onBlur={() =>
                          setCuota(
                            formatearMonto(
                              cuota
                            )
                          )
                        }
                        style={
                          styles.inputStyle
                        }
                      />
                    </Campo>

                    <Campo label="Periodicidad *">
                      <select
                        value={periodicidad}
                        onChange={(e) =>
                          setPeriodicidad(
                            e.target.value
                          )
                        }
                        style={
                          styles.selectStyle
                        }
                      >
                        <option value="Semanal">
                          Semanal
                        </option>
                        <option value="Quincenal">
                          Quincenal
                        </option>
                        <option value="Mensual">
                          Mensual
                        </option>
                      </select>
                    </Campo>

                    <Campo label="Fecha de inicio">
                      <input
                        type="date"
                        value={
                          fechaInicio
                        }
                        onChange={(e) =>
                          setFechaInicio(
                            e.target.value
                          )
                        }
                        style={
                          styles.inputStyle
                        }
                      />
                    </Campo>

                    <Campo label="Fecha de vencimiento">
                      <input
                        type="date"
                        value={
                          fechaVencimiento
                        }
                        onChange={(e) =>
                          setFechaVencimiento(
                            e.target.value
                          )
                        }
                        style={
                          styles.inputStyle
                        }
                      />
                    </Campo>

                    <Campo label="Estado de cuenta">
                      <select
                        value={
                          estadoCuenta
                        }
                        onChange={(e) =>
                          setEstadoCuenta(
                            e.target.value
                          )
                        }
                        style={
                          styles.selectStyle
                        }
                        disabled={
                          saldoParaEstadoVisual !==
                            "" &&
                          saldoVisual <= 0
                        }
                      >
                        <option>
                          Activo
                        </option>
                        <option>
                          Suspendido
                        </option>
                        <option>
                          Cancelado
                        </option>
                      </select>
                    </Campo>
                  </div>

                  <Campo label="Descripción">
                    <textarea
                      value={
                        descripcion
                      }
                      onChange={(e) =>
                        setDescripcion(
                          e.target.value
                        )
                      }
                      style={
                        styles.textarea
                      }
                    />
                  </Campo>
                </article>

                <article
                  style={
                    styles.card
                  }
                  className="clientes-card"
                >
                  <SectionTitle
                    numero="03"
                    titulo="Cobranza inicial"
                    texto="Estado, mora, último pago y responsable."
                  />

                  <div
                    style={
                      styles.grid
                    }
                    className="clientes-grid"
                  >
                    <Campo label="Estado de cobranza automático">
                      <input
                        value={
                          estadoCobranza
                        }
                        readOnly
                        style={
                          styles.inputAutomatico
                        }
                      />
                    </Campo>

                    <Campo label="Días de mora calculados">
                      <input
                        value={
                          diasMoraVisual
                        }
                        readOnly
                        style={
                          styles.inputAutomatico
                        }
                      />
                    </Campo>

                    <Campo label="Fecha último pago">
                      <input
                        type="date"
                        value={
                          fechaUltimoPago
                        }
                        onChange={(e) =>
                          setFechaUltimoPago(
                            e.target.value
                          )
                        }
                        style={
                          styles.inputStyle
                        }
                      />
                    </Campo>

                    <Campo label="Monto último pago">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          montoUltimoPago
                        }
                        onChange={(e) =>
                          setMontoUltimoPago(
                            limpiarMonto(
                              e.target.value
                            )
                          )
                        }
                        onBlur={() =>
                          setMontoUltimoPago(
                            formatearMonto(
                              montoUltimoPago
                            )
                          )
                        }
                        style={
                          styles.inputStyle
                        }
                      />
                    </Campo>

                    <Campo label="Responsable de cobro">
                      <select
                        value={
                          responsableCobro
                        }
                        onChange={(e) =>
                          setResponsableCobro(
                            e.target.value
                          )
                        }
                        style={
                          styles.selectStyle
                        }
                      >
                        <option value="">
                          Sin asignar
                        </option>

                        {gestores.map(
                          (gestor) => (
                            <option
                              key={
                                gestor.id
                              }
                              value={
                                gestor.nombre
                              }
                            >
                              {
                                gestor.nombre
                              }{" "}
                              -{" "}
                              {
                                gestor.rol
                              }
                            </option>
                          )
                        )}
                      </select>
                    </Campo>
                  </div>

                  <Campo label="Observación inicial / historial previo">
                    <textarea
                      value={
                        observacionCobro
                      }
                      onChange={(e) =>
                        setObservacionCobro(
                          e.target.value
                        )
                      }
                      style={
                        styles.textarea
                      }
                    />
                  </Campo>
                </article>
              </>
            )}
          </div>

          <aside
            style={
              styles.sideColumn
            }
            className="clientes-side-column"
          >
            <div
              style={
                styles.sideCard
              }
              className="clientes-side-card"
            >
              <span
                style={
                  styles.sideEyebrow
                }
              >
                RESUMEN DE REGISTRO
              </span>

              <h3
                style={
                  styles.sideTitle
                }
              >
                Vista previa
              </h3>

              <ResumenFila
                label={
                  esGimnasioPerfil
                    ? "Alumno"
                    : "Cliente"
                }
                value={
                  nombre ||
                  "Pendiente"
                }
              />

              <ResumenFila
                label="Identificación"
                value={
                  cedula ||
                  "Pendiente"
                }
              />

              {!esBellezaPerfil && (
                esNegocioMembresias ? (
                  <ResumenFila
                    label="Tipo de cliente"
                    value={
                      tipoCliente
                    }
                  />
                ) : (
                  <ResumenFila
                    label="Estado del cliente"
                    value={
                      estadoCliente
                    }
                  />
                )
              )}

              <ResumenFila
                label="WhatsApp promocional"
                value={
                  aceptaWhatsapp
                    ? "Sí"
                    : "No"
                }
              />

              <ResumenFila
                label="Correo promocional"
                value={
                  aceptaEmail
                    ? "Sí"
                    : "No"
                }
              />

              {!modoSoloCliente && (
                <>
                  <ResumenFila
                    label="Tipo de cuenta"
                    value={
                      tipoProducto ||
                      "Pendiente"
                    }
                  />

                  <ResumenFila
                    label="Saldo actual"
                    value={`$${saldoVisual.toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}`}
                  />

                  <ResumenFila
                    label="Cuota"
                    value={
                      cuota
                        ? `$${convertirMonto(
                            cuota
                          ).toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}`
                        : "Pendiente"
                    }
                  />

                  <ResumenFila
                    label="Periodicidad"
                    value={periodicidad}
                  />

                  <ResumenFila
                    label="Estado"
                    value={
                      estadoCobranza
                    }
                  />
                </>
              )}
            </div>

            <div
              style={
                styles.stickyActions
              }
              className="clientes-sticky-actions"
            >
              <button
                type="button"
                onClick={
                  guardarRegistro
                }
                style={
                  styles.botonGuardar
                }
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : esGimnasioPerfil
                  ? "Guardar alumno"
                  : modoSoloCliente
                  ? "Guardar cliente"
                  : "Guardar cliente y cuenta"}
              </button>

              <button
                type="button"
                onClick={
                  limpiarFormulario
                }
                style={
                  styles.botonLimpiar
                }
                disabled={guardando}
              >
                Limpiar formulario
              </button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Campo({
  label,
  children,
}) {
  return (
    <div style={styles.campo}>
      <label
        style={
          styles.labelStyle
        }
      >
        {label}
      </label>

      {children}
    </div>
  );
}

function SectionTitle({
  numero,
  titulo,
  texto,
}) {
  return (
    <div
      style={
        styles.sectionHeader
      }
      className="clientes-section-header"
    >
      <div
        style={
          styles.sectionIcon
        }
      >
        {numero}
      </div>

      <div>
        <span
          style={
            styles.sectionNumber
          }
        >
          PASO {numero}
        </span>

        <h2
          style={
            styles.tituloSeccion
          }
        >
          {titulo}
        </h2>

        <p
          style={
            styles.textoSeccion
          }
        >
          {texto}
        </p>
      </div>
    </div>
  );
}

function KPI({
  titulo,
  valor,
  detalle,
  icono,
  destacado = false,
}) {
  return (
    <article
      style={{
        ...styles.resumenCard,
        ...(destacado
          ? styles.resumenCardDanger
          : {}),
      }}
    >
      <div
        style={{
          ...styles.kpiIcono,
          ...(destacado
            ? styles.kpiIconoDanger
            : {}),
        }}
      >
        {icono}
      </div>

      <div>
        <p
          style={
            styles.resumenLabel
          }
        >
          {titulo}
        </p>

        <h3
          style={
            styles.resumenValor
          }
        >
          {valor}
        </h3>

        <span
          style={
            styles.resumenDetalle
          }
        >
          {detalle}
        </span>
      </div>
    </article>
  );
}

function ResumenFila({
  label,
  value,
}) {
  return (
    <div
      style={
        styles.resumenFila
      }
      className="clientes-resumen-fila"
    >
      <span
        style={
          styles.resumenFilaLabel
        }
      >
        {label}
      </span>

      <strong
        style={
          styles.resumenFilaValue
        }
      >
        {value}
      </strong>
    </div>
  );
}

const styles = {
  pagina: {
    minHeight: "100vh",
    padding: "32px",
    background:
      "radial-gradient(circle at top right, rgba(22,131,79,.10), transparent 32%), #f3f6f4",
    color: "#152019",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  contenedor: {
    maxWidth: 1450,
    margin: "0 auto",
  },

  cargandoPagina: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "#f3f6f4",
  },

  cargandoCard: {
    width: "100%",
    maxWidth: 420,
    padding: "34px 30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    border: "1px solid #dce5df",
    borderRadius: 24,
    background: "#fff",
    textAlign: "center",
  },

  cargandoLogo: {
    width: 230,
    maxWidth: "100%",
    marginBottom: 18,
    objectFit: "contain",
  },

  cargandoTitulo: {
    fontSize: 22,
  },

  cargandoTexto: {
    margin: "8px 0 0",
    color: "#6f7b73",
    fontSize: 14,
  },

  hero: {
    marginBottom: 20,
    padding: "30px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
    borderRadius: 26,
    background:
      "linear-gradient(135deg, #09120d 0%, #123b25 62%, #17673e 100%)",
  },

  heroPrincipal: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    flex: 1,
    minWidth: 280,
  },

  logoPanel: {
    width: 220,
    minWidth: 220,
    height: 92,
    padding: 10,
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    borderRadius: 18,
    background: "#fff",
  },

  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  etiqueta: {
    display: "block",
    marginBottom: 8,
    color: "#79dca6",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.45,
  },

  titulo: {
    margin: "0 0 10px",
    color: "#fff",
    fontSize: "clamp(32px,4vw,48px)",
  },

  subtitulo: {
    maxWidth: 760,
    margin: 0,
    color: "#d2e7da",
    fontSize: 15,
    lineHeight: 1.55,
  },

  heroAcciones: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  botonCargaCartera: {
    minHeight: 46,
    padding: "11px 16px",
    border: "1px solid #79dca6",
    borderRadius: 12,
    background: "#ffffff",
    color: "#14683e",
    fontWeight: 900,
    cursor: "pointer",
  },

  botonVolver: {
    minHeight: 46,
    padding: "11px 16px",
    border:
      "1px solid rgba(255,255,255,.18)",
    borderRadius: 12,
    background:
      "rgba(255,255,255,.09)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  resumenGrid: {
    marginBottom: 20,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: 14,
  },

  resumenCard: {
    minHeight: 58,
    padding: "8px 10px",
    display: "grid",
    gridTemplateColumns: "32px 1fr",
    gap: 8,
    alignItems: "center",
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#fff",
  },

  resumenCardDanger: {
    border: "1px solid #fecaca",
    background: "#fffafa",
  },

  kpiIcono: {
    width: 32,
    height: 32,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#eaf7ef",
    color: "#16834f",
  },

  kpiIconoDanger: {
    background: "#fff1f2",
    color: "#be123c",
  },

  resumenLabel: {
    margin: "0 0 3px",
    color: "#6d7971",
    fontSize: 11,
    fontWeight: 800,
  },

  resumenValor: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.1,
  },

  resumenDetalle: {
    display: "block",
    marginTop: 2,
    color: "#8a958e",
    fontSize: 9,
    lineHeight: 1.1,
  },

  formLayout: {
    marginTop: 0,
    display: "grid",
    gridTemplateColumns:
      "minmax(0,1fr) 330px",
    gap: 20,
    alignItems: "start",
  },

  mainColumn: {
    minWidth: 0,
  },

  sideColumn: {
    position: "sticky",
    top: 10,
    display: "grid",
    gap: 14,
  },

  card: {
    marginBottom: 18,
    padding: 26,
    border: "1px solid #dfe7e2",
    borderRadius: 22,
    background: "#fff",
  },

  sectionHeader: {
    marginBottom: 22,
    paddingBottom: 18,
    display: "flex",
    alignItems: "center",
    gap: 14,
    borderBottom:
      "1px solid #edf1ee",
  },

  sectionIcon: {
    width: 48,
    height: 48,
    minWidth: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
    background: "#eaf7ef",
    color: "#16834f",
    fontWeight: 900,
  },

  sectionNumber: {
    display: "block",
    marginBottom: 4,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
  },

  tituloSeccion: {
    margin: 0,
    fontSize: 23,
  },

  textoSeccion: {
    margin: "5px 0 0",
    color: "#758078",
    fontSize: 13,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(235px,1fr))",
    gap: "0 16px",
  },

  campo: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    marginBottom: 16,
  },

  labelStyle: {
    color: "#3f4c44",
    fontSize: 12,
    fontWeight: 800,
  },

  inputStyle: {
    width: "100%",
    minHeight: 46,
    padding: "11px 13px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    background: "#fff",
    fontSize: 14,
  },

  selectStyle: {
    width: "100%",
    minHeight: 46,
    padding: "11px 13px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    background: "#fff",
    fontSize: 14,
  },

  inputAutomatico: {
    width: "100%",
    minHeight: 46,
    padding: "11px 13px",
    boxSizing: "border-box",
    border: "1px solid #91d5ae",
    borderRadius: 11,
    background: "#edf9f2",
    color: "#14683e",
    fontSize: 14,
    fontWeight: 850,
  },

  textarea: {
    width: "100%",
    minHeight: 105,
    padding: "12px 13px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    resize: "vertical",
    fontSize: 14,
    fontFamily: "inherit",
  },

  consentimientoBox: {
    marginBottom: 18,
    padding: 16,
    display: "grid",
    gap: 12,
    border: "1px solid #b7d8c4",
    borderRadius: 14,
    background: "#f3faf6",
  },

  consentimientoTitulo: {
    color: "#17623c",
    fontSize: 13,
    fontWeight: 900,
  },

  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "#3f4c44",
    fontSize: 13,
  },

  fileCount: {
    color: "#16834f",
    fontSize: 11,
    fontWeight: 800,
  },

  sideCard: {
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background: "#fff",
  },

  sideEyebrow: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
  },

  sideTitle: {
    margin: "0 0 18px",
    fontSize: 22,
  },

  resumenFila: {
    padding: "11px 0",
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    borderBottom:
      "1px solid #edf1ee",
  },

  resumenFilaLabel: {
    color: "#77827b",
    fontSize: 12,
  },

  resumenFilaValue: {
    maxWidth: 160,
    overflow: "hidden",
    fontSize: 12,
    textAlign: "right",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  stickyActions: {
    padding: 16,
    display: "grid",
    gap: 9,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#fff",
  },

  botonGuardar: {
    minHeight: 48,
    border: "none",
    borderRadius: 12,
    background: "#16834f",
    color: "#fff",
    fontSize: 14,
    fontWeight: 850,
    cursor: "pointer",
  },

  botonLimpiar: {
    minHeight: 44,
    border:
      "1px solid #ccd7d0",
    borderRadius: 11,
    background: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  cardBusquedaCliente: { marginBottom: 18, padding: 22, border: "1px solid #a7d7ba", borderRadius: 22, background: "#f4fbf7" },
  busquedaClienteHeader: { marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  busquedaClienteFila: { display: "grid", gridTemplateColumns: "minmax(240px,1fr) auto auto", gap: 10, alignItems: "center" },
  botonBuscarCliente: { minHeight: 46, padding: "11px 16px", border: "none", borderRadius: 11, background: "#16834f", color: "#fff", fontWeight: 850, cursor: "pointer" },
  botonNuevoCliente: { minHeight: 46, padding: "11px 16px", border: "1px solid #b7c9bd", borderRadius: 11, background: "#fff", color: "#25352b", fontWeight: 800, cursor: "pointer" },
  clienteSeleccionadoBadge: { padding: "9px 12px", border: "1px solid #8fd2aa", borderRadius: 999, background: "#e4f7eb", color: "#14683e", fontSize: 12, fontWeight: 900 },
  resultadosCliente: { marginTop: 14, display: "grid", gap: 9 },
  resultadoClienteFila: { padding: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, border: "1px solid #d6e7dc", borderRadius: 12, background: "#fff" },
  resultadoClienteDetalle: { marginTop: 4, color: "#748077", fontSize: 12 },
  botonUsarCliente: { minHeight: 40, padding: "9px 13px", border: "none", borderRadius: 10, background: "#17211c", color: "#fff", fontWeight: 800, cursor: "pointer" },

  botonSecundario: {
    minHeight: 44,
    border: "none",
    borderRadius: 11,
    background: "#17211c",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
};
