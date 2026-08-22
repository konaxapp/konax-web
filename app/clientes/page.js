"use client";
 
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
 
const VERSION = "2026.08.22-KONAX-CLIENTES-QR-PORTAL-V1";
 
export default function ClientesPage() {
  const router = useRouter();
 
  const [accesoValidado, setAccesoValidado] = useState(false);
  const [modoSoloCliente, setModoSoloCliente] = useState(false);
  const [esNegocioMembresias, setEsNegocioMembresias] = useState(false);
 
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
 
  // PORTAL / QR
  const [accesoPortal, setAccesoPortal] = useState(false);
  const [authUserId, setAuthUserId] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [qrToken, setQrToken] = useState("");
 
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
  const [clienteSeleccionadoNombre, setClienteSeleccionadoNombre] =
    useState("");
 
  useEffect(() => {
    validarAcceso();
  }, []);
 
  useEffect(() => {
    if (modoSoloCliente) return;
 
    const saldoParaCalcular =
      saldoActual !== "" ? saldoActual : montoTotal !== "" ? montoTotal : "";
 
    const estadoAutomatico = calcularEstadoCobranzaAutomatico(
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
  }, [fechaVencimiento, saldoActual, montoTotal, modoSoloCliente]);
 
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
 
    return texto.includes(".") ? `${entero}.${decimal}` : entero;
  }
 
  function convertirMonto(valor) {
    const limpio = String(valor ?? "").replace(/,/g, "").trim();
    if (!limpio) return 0;
    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : 0;
  }
 
  function formatearMonto(valor) {
    if (valor === "" || valor === null || valor === undefined) return "";
    return convertirMonto(valor).toLocaleString("en-US", {
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
 
  function esGimnasioActual() {
    const texto = normalizar(`${tipoNegocio} ${categoriaNegocio}`);
    return ["gimnasio", "gym", "fitness", "academia", "club"].some((x) =>
      texto.includes(x)
    );
  }
 
  function esBellezaActual() {
    const texto = normalizar(`${tipoNegocio} ${categoriaNegocio}`);
    return [
      "belleza",
      "salon",
      "peluqueria",
      "estetica",
      "barberia",
      "spa",
    ].some((x) => texto.includes(x));
  }
 
  function limpiarSesionYSalir(mensaje = "") {
    if (mensaje) alert(mensaje);
    localStorage.clear();
    router.replace("/login");
  }
 
  function obtenerEmpresaId() {
    const empresaId = localStorage.getItem("empresaId");
    if (!empresaId) {
      limpiarSesionYSalir(
        "La sesión no tiene una empresa activa. Inicie sesión nuevamente."
      );
      return null;
    }
    return empresaId;
  }
 
  function obtenerUsuarioId() {
    const usuarioId = localStorage.getItem("usuarioId");
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
 
    const empresaId = localStorage.getItem("empresaId");
    const usuarioId = localStorage.getItem("usuarioId");
 
    if (!empresaId || !usuarioId) {
      limpiarSesionYSalir("La sesión no es válida. Inicie sesión nuevamente.");
      return;
    }
 
    const { data: usuario, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("id, empresa_id, rol, estado")
      .eq("id", usuarioId)
      .maybeSingle();
 
    if (errorUsuario) {
      alert("Error validando usuario: " + errorUsuario.message);
      return;
    }
 
    if (!usuario) {
      limpiarSesionYSalir("El usuario de esta sesión ya no existe.");
      return;
    }
 
    if (normalizar(usuario.estado) !== "activo") {
      limpiarSesionYSalir("Este usuario se encuentra inactivo.");
      return;
    }
 
    if (String(usuario.empresa_id) !== String(empresaId)) {
      limpiarSesionYSalir(
        "La empresa activa no corresponde al usuario autenticado."
      );
      return;
    }
 
    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select(
        "id, estado, estado_plan, plan_codigo, tipo_negocio, categoria_negocio"
      )
      .eq("id", empresaId)
      .maybeSingle();
 
    if (errorEmpresa) {
      alert("Error validando empresa: " + errorEmpresa.message);
      return;
    }
 
    if (!empresa) {
      limpiarSesionYSalir("La empresa de esta sesión ya no existe.");
      return;
    }
 
    if (
      normalizar(empresa.estado) === "suspendido" ||
      normalizar(empresa.estado_plan) === "suspendido"
    ) {
      limpiarSesionYSalir("El servicio de esta empresa está suspendido.");
      return;
    }
 
    const tipo = normalizar(empresa.tipo_negocio);
    const categoria = normalizar(empresa.categoria_negocio);
 
    const negocioDeMembresias =
      categoria.includes("suscripciones") ||
      categoria.includes("membresias") ||
      tipo.includes("gimnasio") ||
      tipo.includes("gym") ||
      tipo.includes("fitness") ||
      tipo.includes("academia") ||
      tipo.includes("club");
 
    const negocioBelleza =
      tipo.includes("belleza") ||
      tipo.includes("salon") ||
      tipo.includes("peluqueria") ||
      tipo.includes("estetica") ||
      tipo.includes("barberia") ||
      tipo.includes("spa") ||
      categoria.includes("belleza");
 
    const soloCliente = negocioDeMembresias || negocioBelleza;
 
    setTipoNegocio(empresa.tipo_negocio || "");
    setCategoriaNegocio(empresa.categoria_negocio || "");
    setPlanCodigo(empresa.plan_codigo || "");
    setModoSoloCliente(soloCliente);
    setEsNegocioMembresias(negocioDeMembresias);
 
    localStorage.setItem("tipoNegocio", empresa.tipo_negocio || "");
    localStorage.setItem("categoriaNegocio", empresa.categoria_negocio || "");
    localStorage.setItem("planCodigo", empresa.plan_codigo || "");
 
    const { data: moduloEmpresa, error: errorModulo } = await supabase
      .from("empresa_modulos")
      .select("clientes")
      .eq("empresa_id", empresaId)
      .maybeSingle();
 
    if (errorModulo) {
      alert("Error validando módulo Clientes: " + errorModulo.message);
      return;
    }
 
    if (!moduloEmpresa?.clientes) {
      alert("El módulo Clientes no está activo para esta empresa.");
      router.replace("/dashboard");
      return;
    }
 
    if (!esAdministrador(usuario.rol)) {
      const { data: permiso, error: errorPermiso } = await supabase
        .from("permisos_usuarios_empresa")
        .select("activo")
        .eq("empresa_id", empresaId)
        .eq("usuario_id", usuarioId)
        .eq("permiso", "clientes")
        .maybeSingle();
 
      if (errorPermiso) {
        alert("Error validando permiso Clientes: " + errorPermiso.message);
        return;
      }
 
      if (!permiso?.activo) {
        alert("No tienes permiso para acceder al módulo Clientes.");
        router.replace("/dashboard");
        return;
      }
    }
 
    localStorage.setItem("usuarioRol", usuario.rol || "");
 
    if (!soloCliente) {
      await cargarGestores(empresaId);
    }
 
    setAccesoValidado(true);
  }
 
  async function cargarGestores(empresaId) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nombre, correo, rol, estado")
      .eq("empresa_id", empresaId)
      .eq("estado", "Activo")
      .order("nombre", { ascending: true });
 
    if (error) {
      setGestores([]);
      return;
    }
 
    setGestores(
      (data || []).filter((usuario) =>
        [
          "gestor de cobro",
          "gestor de cobros",
          "gestor cobranza",
          "cobrador",
          "supervisor",
          "administrador",
        ].includes(normalizar(usuario.rol))
      )
    );
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
 
  function generarQrToken() {
    try {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch {}
    return `KXQR-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
 
  function asegurarQrToken() {
    if (qrToken) return qrToken;
    const nuevo = generarQrToken();
    setQrToken(nuevo);
    return nuevo;
  }
 
  function regenerarQrToken() {
    const nuevo = generarQrToken();
    setQrToken(nuevo);
  }
 
  async function copiarQrToken() {
    const token = asegurarQrToken();
    try {
      await navigator.clipboard.writeText(token);
      alert("Token QR copiado.");
    } catch {
      alert("Token QR: " + token);
    }
  }
 
  async function copiarEnlaceCheckin() {
    const token = asegurarQrToken();
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://konax.net";
    const enlace = `${base}/checkin-gimnasio?qr=${encodeURIComponent(token)}`;
 
    try {
      await navigator.clipboard.writeText(enlace);
      alert("Enlace de check-in copiado.");
    } catch {
      alert(enlace);
    }
  }
 
  function obtenerFechaLocalISO() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
 
  function calcularDiasMora(fecha, saldo = "") {
    if (
      saldo === "" ||
      saldo === null ||
      saldo === undefined ||
      !fecha ||
      convertirMonto(saldo) <= 0
    ) {
      return 0;
    }
 
    const hoy = new Date(`${obtenerFechaLocalISO()}T00:00:00`);
    const vencimiento = new Date(`${fecha}T00:00:00`);
 
    if (Number.isNaN(vencimiento.getTime())) return 0;
 
    const diferencia = hoy.getTime() - vencimiento.getTime();
    return diferencia > 0 ? Math.floor(diferencia / 86400000) : 0;
  }
 
  function calcularEstadoCobranzaAutomatico(fecha, saldo) {
    if (saldo === "" || saldo === null || saldo === undefined) {
      return "Sin definir";
    }
 
    const saldoNumero = convertirMonto(saldo);
    if (saldoNumero <= 0) return "Cancelado";
    if (!fecha) return "Al Día";
 
    const hoy = new Date(`${obtenerFechaLocalISO()}T00:00:00`);
    const vencimiento = new Date(`${fecha}T00:00:00`);
 
    if (Number.isNaN(vencimiento.getTime())) return "Al Día";
    return vencimiento < hoy ? "Mora" : "Al Día";
  }
 
  function responsableFinal() {
    return responsableCobro.trim() || "Sin asignar";
  }
 
  function construirObservacionCliente() {
    const partes = [
      observacionCliente.trim(),
      esNegocioMembresias ? `Tipo de cliente: ${tipoCliente}` : "",
      `Promociones por WhatsApp: ${aceptaWhatsapp ? "Sí" : "No"}`,
      `Promociones por correo: ${aceptaEmail ? "Sí" : "No"}`,
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
        .or(
          `cedula.ilike.%${terminoSeguro}%,nombre.ilike.%${terminoSeguro}%,telefono.ilike.%${terminoSeguro}%,telefono_secundario.ilike.%${terminoSeguro}%`
        )
        .order("nombre", { ascending: true })
        .limit(10);
 
      if (error) throw error;
 
      setResultadosCliente(data || []);
 
      if (!data || data.length === 0) {
        alert("No se encontró ningún cliente con esos datos.");
      }
    } catch (error) {
      alert(
        "No se pudo buscar el cliente: " +
          (error?.message || "Error desconocido")
      );
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
 
    setAccesoPortal(Boolean(cliente.acceso_portal));
    setAuthUserId(cliente.auth_user_id || "");
    setFotoUrl(cliente.foto_url || "");
    setQrToken(cliente.qr_token || "");
 
    setResultadosCliente([]);
    setBusquedaCliente(
      cliente.cedula || cliente.nombre || cliente.telefono || ""
    );
  }
 
  function crearClienteNuevo() {
    limpiarFormulario();
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
 
    setAccesoPortal(false);
    setAuthUserId("");
    setFotoUrl("");
    setQrToken("");
 
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
 
    setEstadoCobranza("Sin definir");
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
    const empresaId = obtenerEmpresaId();
    const usuarioId = obtenerUsuarioId();
    if (!empresaId || !usuarioId) return null;
 
    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("id, empresa_id, estado")
      .eq("id", usuarioId)
      .maybeSingle();
 
    if (error || !usuario) {
      limpiarSesionYSalir("No se pudo validar la sesión.");
      return null;
    }
 
    if (
      String(usuario.empresa_id) !== String(empresaId) ||
      normalizar(usuario.estado) !== "activo"
    ) {
      limpiarSesionYSalir("La sesión ya no es válida.");
      return null;
    }
 
    return { empresaId, usuarioId };
  }
 
  async function guardarOActualizarCliente(empresaId) {
    const cedulaLimpia = cedula.trim();
    const observacionFinal = construirObservacionCliente();
 
    // En gimnasio todo alumno debe tener QR estable.
    const qrFinal = esGimnasioActual()
      ? qrToken || generarQrToken()
      : qrToken || null;
 
    const payload = {
      empresa_id: empresaId,
      cedula: cedulaLimpia,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      telefono_secundario: telefonoSecundario.trim(),
      direccion: direccion.trim(),
      correo: correo.trim(),
      referencia_nombre: referenciaNombre.trim(),
      referencia_telefono: referenciaTelefono.trim(),
      estado: estadoCliente,
      observacion: observacionFinal,
 
      // NUEVOS CAMPOS PORTAL / QR
      acceso_portal: Boolean(accesoPortal),
      auth_user_id: authUserId || null,
      foto_url: fotoUrl.trim() || null,
      qr_token: qrFinal,
    };
 
    if (clienteSeleccionadoId) {
      const { data, error } = await supabase
        .from("clientes")
        .update(payload)
        .eq("id", clienteSeleccionadoId)
        .eq("empresa_id", empresaId)
        .select()
        .single();
 
      if (error) {
        throw new Error(
          "No se pudo actualizar el cliente: " + error.message
        );
      }
 
      setQrToken(data.qr_token || qrFinal || "");
 
      return {
        ...data,
        fueSeleccionado: true,
        fueActualizado: true,
      };
    }
 
    const { data: clienteExistente, error: errorBusqueda } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cedula", cedulaLimpia)
      .maybeSingle();
 
    if (errorBusqueda) {
      throw new Error(
        "No se pudo verificar si el cliente ya existe: " +
          errorBusqueda.message
      );
    }
 
    if (clienteExistente) {
      const { data, error } = await supabase
        .from("clientes")
        .update(payload)
        .eq("id", clienteExistente.id)
        .eq("empresa_id", empresaId)
        .select()
        .single();
 
      if (error) {
        throw new Error(
          "El cliente ya existe, pero no se pudieron actualizar sus datos: " +
            error.message
        );
      }
 
      setQrToken(data.qr_token || qrFinal || "");
 
      return {
        ...data,
        fueActualizado: true,
      };
    }
 
    const { data, error } = await supabase
      .from("clientes")
      .insert([payload])
      .select()
      .single();
 
    if (error) {
      const mensajeError = String(error.message || "").toLowerCase();
 
      if (
        error.code === "23505" ||
        mensajeError.includes("clientes_cedula_key") ||
        mensajeError.includes("duplicate key")
      ) {
        throw new Error(
          "Ya existe un cliente registrado con esta cédula."
        );
      }
 
      throw new Error(
        "No se pudo guardar el cliente: " + error.message
      );
    }
 
    setQrToken(data.qr_token || qrFinal || "");
 
    return {
      ...data,
      fueActualizado: false,
    };
  }
 
  async function guardarRegistro(destinoDespues = "ninguno") {
    if (guardando) return;
 
    const sesion = await validarSesionAntesDeGuardar();
    if (!sesion) return;
 
    const { empresaId } = sesion;
 
    if (!cedula.trim() || !nombre.trim() || !telefono.trim()) {
      alert("Complete cédula, nombre y teléfono.");
      return;
    }
 
    if (aceptaEmail && !correo.trim()) {
      alert(
        "Ingrese un correo para autorizar promociones por correo electrónico."
      );
      return;
    }
 
    if (!modoSoloCliente) {
      if (!tipoProducto) {
        alert("Seleccione el tipo de cuenta.");
        return;
      }
 
      if (!montoTotal && !saldoActual) {
        alert("Ingrese monto original o saldo actual.");
        return;
      }
    }
 
    setGuardando(true);
 
    try {
      const clienteCreado = await guardarOActualizarCliente(empresaId);
 
      if (modoSoloCliente) {
        const etiqueta = esGimnasioActual() ? "Alumno" : "Cliente";
 
        alert(
          `${etiqueta} guardado correctamente.${
            esGimnasioActual()
              ? `\nQR asignado: ${clienteCreado.qr_token || "Pendiente"}`
              : ""
          }`
        );
 
        if (destinoDespues === "membresias" && esGimnasioActual()) {
          router.push(`/suscripciones?clienteId=${clienteCreado.id}`);
          return;
        }
 
        limpiarFormulario();
        return;
      }
 
      const montoTotalNumero = convertirMonto(montoTotal);
      const saldoActualNumero =
        saldoActual !== "" ? convertirMonto(saldoActual) : montoTotalNumero;
      const cuotaNumero = convertirMonto(cuota);
      const montoUltimoPagoNumero = convertirMonto(montoUltimoPago);
 
      const estadoCobranzaFinal = calcularEstadoCobranzaAutomatico(
        fechaVencimiento,
        saldoActualNumero
      );
 
      const diasMora = calcularDiasMora(
        fechaVencimiento,
        saldoActualNumero
      );
 
      const estadoCuentaFinal =
        estadoCobranzaFinal === "Cancelado"
          ? "Cancelado"
          : estadoCuenta === "Cancelado"
          ? "Activo"
          : estadoCuenta;
 
      const cuentaFinal = numeroCuenta.trim() || generarNumeroCuenta();
 
      const { data: comercialCreado, error: errorComercial } = await supabase
        .from("informacion_comercial")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: clienteCreado.id,
            numero_cuenta: cuentaFinal,
            tipo_producto: tipoProducto,
            descripcion: descripcion.trim(),
            modalidad: periodicidad,
            monto_total: montoTotalNumero,
            saldo_actual: saldoActualNumero,
            cuota: cuotaNumero,
            fecha_inicio: fechaInicio || null,
            fecha_vencimiento: fechaVencimiento || null,
            responsable: responsableFinal(),
            estado: estadoCuentaFinal,
            observacion: observacionCobro.trim(),
          },
        ])
        .select()
        .single();
 
      if (errorComercial) {
        throw new Error(
          "Error en información comercial: " + errorComercial.message
        );
      }
 
      const { error: errorCobranza } = await supabase
        .from("informacion_cobranza")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: clienteCreado.id,
            informacion_comercial_id: comercialCreado.id,
            estado_cobranza: estadoCobranzaFinal,
            dias_mora: diasMora,
            fecha_ultimo_pago: fechaUltimoPago || null,
            monto_ultimo_pago: montoUltimoPagoNumero,
            responsable_cobro: responsableFinal(),
            observacion_cobro:
              observacionCobro.trim() || "Cuenta creada desde Clientes",
          },
        ]);
 
      if (errorCobranza) {
        throw new Error(
          "Error en cobranza inicial: " + errorCobranza.message
        );
      }
 
      alert(`Cliente y cuenta registrados correctamente. Cuenta: ${cuentaFinal}.`);
      limpiarFormulario();
    } catch (error) {
      alert(error?.message || "Ocurrió un error guardando el registro.");
    } finally {
      setGuardando(false);
    }
  }
 
  const esGimnasioPerfil = esGimnasioActual();
  const saldoVisual =
    saldoActual !== "" ? convertirMonto(saldoActual) : convertirMonto(montoTotal);
 
  const tituloPrincipal = esGimnasioPerfil
    ? "Alumnos"
    : esBellezaActual()
    ? "Clientes del salón"
    : "Clientes";
 
  const subtituloPrincipal = esGimnasioPerfil
    ? "Registra alumnos, genera su QR y prepara su acceso al portal."
    : "Registra y administra la información principal de tus clientes.";
 
  if (!accesoValidado) {
    return (
      <main style={styles.cargando}>
        <div style={styles.spinner} />
        <strong>Validando acceso...</strong>
      </main>
    );
  }
 
  return (
    <main
      style={styles.pagina}
      className={esGimnasioPerfil ? "clientes-gym-mobile" : ""}
    >
      <style jsx global>{`
        @media (max-width: 900px) {
          .clientes-gym-mobile {
            padding: 14px !important;
          }
 
          .clientes-gym-mobile .clientes-hero,
          .clientes-gym-mobile .clientes-form-layout,
          .clientes-gym-mobile .clientes-grid,
          .clientes-gym-mobile .clientes-busqueda-fila {
            grid-template-columns: 1fr !important;
          }
 
          .clientes-gym-mobile .clientes-card,
          .clientes-gym-mobile .clientes-side-card {
            padding: 16px !important;
          }
 
          .clientes-gym-mobile button,
          .clientes-gym-mobile input,
          .clientes-gym-mobile select,
          .clientes-gym-mobile textarea {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
 
          .clientes-gym-mobile input,
          .clientes-gym-mobile select,
          .clientes-gym-mobile textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
 
      <div style={styles.contenedor}>
        <section style={styles.hero} className="clientes-hero">
          <div>
            <span style={styles.eyebrow}>KONAX · {VERSION}</span>
            <h1 style={styles.titulo}>{tituloPrincipal}</h1>
            <p style={styles.subtitulo}>{subtituloPrincipal}</p>
          </div>
 
          <div style={styles.heroAcciones}>
            <button
              type="button"
              style={styles.botonSecundario}
              onClick={volverCentroOperaciones}
            >
              ← Volver al panel
            </button>
 
            {!modoSoloCliente && (
              <button
                type="button"
                style={styles.botonSecundario}
                onClick={abrirCargaCartera}
              >
                Carga de cartera
              </button>
            )}
          </div>
        </section>
 
        <section style={styles.busquedaCard} className="clientes-card">
          <div style={styles.sectionHeadSimple}>
            <div>
              <span style={styles.sectionNumber}>BUSCAR</span>
              <h2 style={styles.tituloSeccion}>Cliente existente</h2>
              <p style={styles.textoSeccion}>
                Busca por cédula, nombre o teléfono para editar sin duplicar.
              </p>
            </div>
          </div>
 
          <div
            style={styles.busquedaFila}
            className="clientes-busqueda-fila"
          >
            <input
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscarClienteExistente();
              }}
              placeholder="Cédula, nombre o teléfono"
              style={styles.inputStyle}
            />
 
            <button
              type="button"
              style={styles.botonPrimario}
              onClick={buscarClienteExistente}
              disabled={buscandoCliente}
            >
              {buscandoCliente ? "Buscando..." : "Buscar"}
            </button>
 
            <button
              type="button"
              style={styles.botonSecundario}
              onClick={crearClienteNuevo}
            >
              Nuevo
            </button>
          </div>
 
          {resultadosCliente.length > 0 && (
            <div style={styles.resultados}>
              {resultadosCliente.map((cliente) => (
                <button
                  key={cliente.id}
                  type="button"
                  style={styles.resultadoItem}
                  onClick={() => usarClienteExistente(cliente)}
                >
                  <strong>{cliente.nombre || "Sin nombre"}</strong>
                  <span>{cliente.cedula || "Sin cédula"}</span>
                  <span>{cliente.telefono || "Sin teléfono"}</span>
                </button>
              ))}
            </div>
          )}
 
          {clienteSeleccionadoId && (
            <div style={styles.seleccionActual}>
              Editando: <strong>{clienteSeleccionadoNombre}</strong>
            </div>
          )}
        </section>
 
        <section
          style={styles.formLayout}
          className="clientes-form-layout"
        >
          <div style={styles.mainColumn}>
            <article style={styles.card} className="clientes-card">
              <SectionTitle
                numero="01"
                titulo={
                  esGimnasioPerfil
                    ? "Datos del alumno"
                    : "Información del cliente"
                }
                texto="Completa los datos principales de identificación y contacto."
              />
 
              <div style={styles.grid} className="clientes-grid">
                <Campo label="Cédula / identificación *">
                  <input
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    style={styles.inputStyle}
                  />
                </Campo>
 
                <Campo label={esGimnasioPerfil ? "Nombre del alumno *" : "Nombre *"}>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={styles.inputStyle}
                  />
                </Campo>
 
                <Campo label="Teléfono / WhatsApp *">
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    style={styles.inputStyle}
                  />
                </Campo>
 
                <Campo label="Teléfono secundario">
                  <input
                    value={telefonoSecundario}
                    onChange={(e) => setTelefonoSecundario(e.target.value)}
                    style={styles.inputStyle}
                  />
                </Campo>
 
                <Campo label="Correo">
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    style={styles.inputStyle}
                  />
                </Campo>
 
                <Campo label="Estado">
                  <select
                    value={estadoCliente}
                    onChange={(e) => setEstadoCliente(e.target.value)}
                    style={styles.inputStyle}
                  >
                    <option>Activo</option>
                    <option>Inactivo</option>
                    <option>Suspendido</option>
                    <option>Cancelado</option>
                  </select>
                </Campo>
 
                {esNegocioMembresias && (
                  <Campo label="Tipo de cliente">
                    <select
                      value={tipoCliente}
                      onChange={(e) => setTipoCliente(e.target.value)}
                      style={styles.inputStyle}
                    >
                      <option>Miembro</option>
                      <option>Visitante</option>
                      <option>Prospecto</option>
                    </select>
                  </Campo>
                )}
 
                <Campo label="Referencia">
                  <input
                    value={referenciaNombre}
                    onChange={(e) => setReferenciaNombre(e.target.value)}
                    style={styles.inputStyle}
                  />
                </Campo>
 
                <Campo label="Teléfono referencia">
                  <input
                    value={referenciaTelefono}
                    onChange={(e) => setReferenciaTelefono(e.target.value)}
                    style={styles.inputStyle}
                  />
                </Campo>
              </div>
 
              <Campo label="Dirección completa">
                <textarea
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  style={styles.textarea}
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
                  value={observacionCliente}
                  onChange={(e) => setObservacionCliente(e.target.value)}
                  style={styles.textarea}
                />
              </Campo>
 
              <div style={styles.consentimientoBox}>
                <strong>Autorización para promociones</strong>
 
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={aceptaWhatsapp}
                    onChange={(e) => setAceptaWhatsapp(e.target.checked)}
                  />
                  Acepta recibir promociones por WhatsApp.
                </label>
 
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={aceptaEmail}
                    onChange={(e) => setAceptaEmail(e.target.checked)}
                  />
                  Acepta recibir promociones por correo.
                </label>
              </div>
 
              <Campo label="Documentos del cliente">
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setDocumentos(Array.from(e.target.files || []))
                  }
                  style={styles.inputStyle}
                />
                {documentos.length > 0 && (
                  <span style={styles.fileCount}>
                    {documentos.length} archivo(s) seleccionado(s)
                  </span>
                )}
              </Campo>
            </article>
 
            {esGimnasioPerfil && (
              <article style={styles.card} className="clientes-card">
                <SectionTitle
                  numero="02"
                  titulo="QR y portal del alumno"
                  texto="El QR identifica al alumno en el check-in. El acceso al portal queda controlado de forma independiente."
                />
 
                <div style={styles.grid} className="clientes-grid">
                  <Campo label="Acceso al portal">
                    <label style={styles.switchRow}>
                      <input
                        type="checkbox"
                        checked={accesoPortal}
                        onChange={(e) => setAccesoPortal(e.target.checked)}
                      />
                      <span>
                        {accesoPortal ? "Portal habilitado" : "Portal deshabilitado"}
                      </span>
                    </label>
                  </Campo>
 
                  <Campo label="Foto URL">
                    <input
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      placeholder="https://..."
                      style={styles.inputStyle}
                    />
                  </Campo>
 
                  <Campo label="Auth User ID">
                    <input
                      value={authUserId}
                      onChange={(e) => setAuthUserId(e.target.value)}
                      placeholder="Se completa cuando el alumno vincule su acceso"
                      style={styles.inputStyle}
                    />
                  </Campo>
 
                  <Campo label="Token QR">
                    <input
                      value={qrToken}
                      readOnly
                      placeholder="Se genera automáticamente al guardar"
                      style={styles.inputStyle}
                    />
                  </Campo>
                </div>
 
                <div style={styles.qrActions}>
                  <button
                    type="button"
                    style={styles.botonSecundario}
                    onClick={regenerarQrToken}
                  >
                    Generar / regenerar QR
                  </button>
 
                  <button
                    type="button"
                    style={styles.botonSecundario}
                    onClick={copiarQrToken}
                  >
                    Copiar token
                  </button>
 
                  <button
                    type="button"
                    style={styles.botonSecundario}
                    onClick={copiarEnlaceCheckin}
                  >
                    Copiar enlace de check-in
                  </button>
                </div>
 
                <div style={styles.notaQr}>
                  <strong>Importante:</strong> el token se guarda en
                  <code> clientes.qr_token </code> y el módulo Check-in puede
                  buscarlo directamente.
                </div>
              </article>
            )}
 
            {!modoSoloCliente && (
              <>
                <article style={styles.card} className="clientes-card">
                  <SectionTitle
                    numero="02"
                    titulo="Información de la cuenta"
                    texto="Monto original, saldo pendiente y fechas."
                  />
 
                  <div style={styles.grid} className="clientes-grid">
                    <Campo label="Número de cuenta">
                      <input
                        value={numeroCuenta}
                        onChange={(e) => setNumeroCuenta(e.target.value)}
                        style={styles.inputStyle}
                      />
                    </Campo>
 
                    <Campo label="Tipo de cuenta *">
                      <select
                        value={tipoProducto}
                        onChange={(e) => setTipoProducto(e.target.value)}
                        style={styles.inputStyle}
                      >
                        <option value="">Seleccione</option>
                        <option>Crédito</option>
                        <option>Préstamo</option>
                        <option>Cuenta por cobrar</option>
                        <option>Refinanciamiento</option>
                        <option>Servicio pendiente</option>
                      </select>
                    </Campo>
 
                    <Campo label="Monto total original">
                      <input
                        value={montoTotal}
                        onChange={(e) => setMontoTotal(limpiarMonto(e.target.value))}
                        onBlur={() =>
                          montoTotal && setMontoTotal(formatearMonto(montoTotal))
                        }
                        inputMode="decimal"
                        style={styles.inputStyle}
                      />
                    </Campo>
 
                    <Campo label="Saldo actual">
                      <input
                        value={saldoActual}
                        onChange={(e) => setSaldoActual(limpiarMonto(e.target.value))}
                        onBlur={() =>
                          saldoActual && setSaldoActual(formatearMonto(saldoActual))
                        }
                        inputMode="decimal"
                        style={styles.inputStyle}
                      />
                    </Campo>
 
                    <Campo label="Cuota">
                      <input
                        value={cuota}
                        onChange={(e) => setCuota(limpiarMonto(e.target.value))}
                        inputMode="decimal"
                        style={styles.inputStyle}
                      />
                    </Campo>
 
                    <Campo label="Periodicidad">
                      <select
                        value={periodicidad}
                        onChange={(e) => setPeriodicidad(e.target.value)}
                        style={styles.inputStyle}
                      >
                        <option>Mensual</option>
                        <option>Quincenal</option>
                        <option>Semanal</option>
                        <option>Único</option>
                      </select>
                    </Campo>
 
                    <Campo label="Fecha inicio">
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        style={styles.inputStyle}
                      />
                    </Campo>
 
                    <Campo label="Fecha vencimiento">
                      <input
                        type="date"
                        value={fechaVencimiento}
                        onChange={(e) => setFechaVencimiento(e.target.value)}
                        style={styles.inputStyle}
                      />
                    </Campo>
 
                    <Campo label="Estado de cuenta">
                      <select
                        value={estadoCuenta}
                        onChange={(e) => setEstadoCuenta(e.target.value)}
                        style={styles.inputStyle}
                      >
                        <option>Activo</option>
                        <option>Cancelado</option>
                        <option>Suspendido</option>
                      </select>
                    </Campo>
                  </div>
 
                  <Campo label="Descripción">
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      style={styles.textarea}
                    />
                  </Campo>
                </article>
 
                <article style={styles.card} className="clientes-card">
                  <SectionTitle
                    numero="03"
                    titulo="Cobranza inicial"
                    texto="Define responsable, último pago y observaciones."
                  />
 
                  <div style={styles.grid} className="clientes-grid">
                    <Campo label="Estado cobranza">
                      <input
                        value={estadoCobranza}
                        readOnly
                        style={styles.inputStyle}
                      />
                    </Campo>
 
                    <Campo label="Responsable">
                      <select
                        value={responsableCobro}
                        onChange={(e) => setResponsableCobro(e.target.value)}
                        style={styles.inputStyle}
                      >
                        <option value="">Sin asignar</option>
                        {gestores.map((gestor) => (
                          <option key={gestor.id} value={gestor.nombre}>
                            {gestor.nombre}
                          </option>
                        ))}
                      </select>
                    </Campo>
 
                    <Campo label="Fecha último pago">
                      <input
                        type="date"
                        value={fechaUltimoPago}
                        onChange={(e) => setFechaUltimoPago(e.target.value)}
                        style={styles.inputStyle}
                      />
                    </Campo>
 
                    <Campo label="Monto último pago">
                      <input
                        value={montoUltimoPago}
                        onChange={(e) =>
                          setMontoUltimoPago(limpiarMonto(e.target.value))
                        }
                        inputMode="decimal"
                        style={styles.inputStyle}
                      />
                    </Campo>
                  </div>
 
                  <Campo label="Observación de cobranza">
                    <textarea
                      value={observacionCobro}
                      onChange={(e) => setObservacionCobro(e.target.value)}
                      style={styles.textarea}
                    />
                  </Campo>
                </article>
              </>
            )}
          </div>
 
          <aside style={styles.sideColumn} className="clientes-side-card">
            <article style={styles.sideCard}>
              <span style={styles.sectionNumber}>RESUMEN</span>
              <h2 style={styles.sideTitle}>
                {esGimnasioPerfil ? "Ficha del alumno" : "Ficha del cliente"}
              </h2>
 
              <ResumenFila label="Nombre" value={nombre || "Pendiente"} />
              <ResumenFila label="Cédula" value={cedula || "Pendiente"} />
              <ResumenFila label="Teléfono" value={telefono || "Pendiente"} />
              <ResumenFila label="Estado" value={estadoCliente} />
 
              {esGimnasioPerfil && (
                <>
                  <ResumenFila
                    label="Portal"
                    value={accesoPortal ? "Habilitado" : "Deshabilitado"}
                  />
                  <ResumenFila
                    label="QR"
                    value={qrToken ? "Asignado" : "Se genera al guardar"}
                  />
                </>
              )}
 
              {!modoSoloCliente && (
                <>
                  <ResumenFila
                    label="Tipo de cuenta"
                    value={tipoProducto || "Pendiente"}
                  />
                  <ResumenFila
                    label="Saldo actual"
                    value={`$${saldoVisual.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                  />
                  <ResumenFila label="Periodicidad" value={periodicidad} />
                  <ResumenFila label="Cobranza" value={estadoCobranza} />
                </>
              )}
            </article>
 
            <div style={styles.stickyActions}>
              <button
                type="button"
                onClick={() => guardarRegistro("ninguno")}
                style={styles.botonGuardar}
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
 
              {esGimnasioPerfil && (
                <button
                  type="button"
                  onClick={() => guardarRegistro("membresias")}
                  style={styles.botonPrimario}
                  disabled={guardando}
                >
                  Guardar y asignar membresía
                </button>
              )}
 
              <button
                type="button"
                onClick={limpiarFormulario}
                style={styles.botonSecundario}
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
 
function Campo({ label, children }) {
  return (
    <div style={styles.campo}>
      <label style={styles.labelStyle}>{label}</label>
      {children}
    </div>
  );
}
 
function SectionTitle({ numero, titulo, texto }) {
  return (
    <div style={styles.sectionHeader}>
      <div style={styles.sectionIcon}>{numero}</div>
 
      <div>
        <span style={styles.sectionNumber}>PASO {numero}</span>
        <h2 style={styles.tituloSeccion}>{titulo}</h2>
        <p style={styles.textoSeccion}>{texto}</p>
      </div>
    </div>
  );
}
 
function ResumenFila({ label, value }) {
  return (
    <div style={styles.resumenFila}>
      <span style={styles.resumenFilaLabel}>{label}</span>
      <strong style={styles.resumenFilaValue}>{value}</strong>
    </div>
  );
}
 
const styles = {
  pagina: {
    minHeight: "100vh",
    padding: 32,
    background:
      "radial-gradient(circle at top right, rgba(22,131,79,.10), transparent 32%), #f3f6f4",
    color: "#152019",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
 
  cargando: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f3f6f4",
    color: "#174d33",
    fontFamily: "system-ui",
  },
 
  spinner: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: "4px solid #d9e6de",
    borderTopColor: "#16834f",
  },
 
  contenedor: {
    maxWidth: 1450,
    margin: "0 auto",
  },
 
  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    gap: 20,
    alignItems: "center",
    marginBottom: 18,
    padding: 26,
    background: "#10271b",
    color: "#fff",
    borderRadius: 24,
    boxShadow: "0 18px 45px rgba(17,39,27,.14)",
  },
 
  eyebrow: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.4,
    color: "#8fe0b3",
  },
 
  titulo: {
    margin: "7px 0 5px",
    fontSize: 34,
    lineHeight: 1.05,
  },
 
  subtitulo: {
    margin: 0,
    color: "#cfe0d6",
    fontSize: 14,
    lineHeight: 1.55,
  },
 
  heroAcciones: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
 
  busquedaCard: {
    background: "#fff",
    border: "1px solid #e2e9e5",
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    boxShadow: "0 10px 30px rgba(17,39,27,.06)",
  },
 
  sectionHeadSimple: {
    marginBottom: 14,
  },
 
  busquedaFila: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto auto",
    gap: 10,
  },
 
  resultados: {
    display: "grid",
    gap: 8,
    marginTop: 12,
  },
 
  resultadoItem: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 10,
    textAlign: "left",
    padding: 12,
    border: "1px solid #dde7e1",
    borderRadius: 13,
    background: "#f9fbfa",
    cursor: "pointer",
  },
 
  seleccionActual: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    background: "#edf8f1",
    color: "#14683e",
    fontSize: 13,
  },
 
  formLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 360px",
    gap: 18,
    alignItems: "start",
  },
 
  mainColumn: {
    display: "grid",
    gap: 18,
    minWidth: 0,
  },
 
  sideColumn: {
    position: "sticky",
    top: 18,
    display: "grid",
    gap: 12,
  },
 
  card: {
    background: "#fff",
    border: "1px solid #e2e9e5",
    borderRadius: 22,
    padding: 24,
    boxShadow: "0 10px 30px rgba(17,39,27,.06)",
  },
 
  sideCard: {
    background: "#fff",
    border: "1px solid #e2e9e5",
    borderRadius: 22,
    padding: 22,
    boxShadow: "0 10px 30px rgba(17,39,27,.06)",
  },
 
  sideTitle: {
    margin: "6px 0 18px",
    fontSize: 23,
  },
 
  sectionHeader: {
    display: "flex",
    gap: 14,
    paddingBottom: 16,
    marginBottom: 18,
    borderBottom: "1px solid #edf1ef",
  },
 
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "#16834f",
    color: "#fff",
    fontWeight: 900,
    flex: "0 0 auto",
  },
 
  sectionNumber: {
    display: "block",
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: 900,
    color: "#16834f",
  },
 
  tituloSeccion: {
    margin: "3px 0 3px",
    fontSize: 21,
  },
 
  textoSeccion: {
    margin: 0,
    color: "#66756c",
    fontSize: 13,
    lineHeight: 1.5,
  },
 
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    columnGap: 16,
    rowGap: 2,
  },
 
  campo: {
    display: "grid",
    gap: 7,
    marginBottom: 15,
    minWidth: 0,
  },
 
  labelStyle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#435348",
  },
 
  inputStyle: {
    width: "100%",
    minHeight: 44,
    border: "1px solid #d9e4de",
    borderRadius: 12,
    padding: "0 12px",
    outline: "none",
    background: "#fff",
    color: "#152019",
  },
 
  textarea: {
    width: "100%",
    minHeight: 90,
    resize: "vertical",
    border: "1px solid #d9e4de",
    borderRadius: 12,
    padding: 12,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
 
  consentimientoBox: {
    display: "grid",
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
    padding: 15,
    border: "1px solid #dce8e1",
    borderRadius: 14,
    background: "#f7faf8",
  },
 
  checkLabel: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 13,
    color: "#405147",
  },
 
  switchRow: {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 12px",
    border: "1px solid #d9e4de",
    borderRadius: 12,
    background: "#f9fbfa",
  },
 
  fileCount: {
    fontSize: 12,
    color: "#66756c",
  },
 
  qrActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
 
  notaQr: {
    marginTop: 14,
    padding: 13,
    borderRadius: 13,
    background: "#f3f8f5",
    color: "#425449",
    fontSize: 12,
    lineHeight: 1.55,
  },
 
  resumenFila: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "11px 0",
    borderBottom: "1px solid #edf1ef",
  },
 
  resumenFilaLabel: {
    color: "#718078",
    fontSize: 12,
  },
 
  resumenFilaValue: {
    color: "#1b2b21",
    fontSize: 12,
    textAlign: "right",
    maxWidth: "55%",
    overflowWrap: "anywhere",
  },
 
  stickyActions: {
    display: "grid",
    gap: 9,
    padding: 14,
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #e2e9e5",
    boxShadow: "0 10px 30px rgba(17,39,27,.06)",
  },
 
  botonGuardar: {
    minHeight: 46,
    border: 0,
    borderRadius: 12,
    background: "#16834f",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    padding: "0 16px",
  },
 
  botonPrimario: {
    minHeight: 44,
    border: 0,
    borderRadius: 12,
    background: "#173f2b",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    padding: "0 16px",
  },
 
  botonSecundario: {
    minHeight: 44,
    border: "1px solid #d3dfd8",
    borderRadius: 12,
    background: "#fff",
    color: "#254433",
    fontWeight: 800,
    cursor: "pointer",
    padding: "0 16px",
  },
};
