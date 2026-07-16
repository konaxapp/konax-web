"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function CuentasPorCobrar() {
  const router = useRouter();

  const [accesoValidado, setAccesoValidado] = useState(false);
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

  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [tipoProducto, setTipoProducto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [saldoActual, setSaldoActual] = useState("");
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

  useEffect(() => {
    validarAcceso();
  }, []);

  useEffect(() => {
    const saldoParaCalcular =
      saldoActual !== ""
        ? saldoActual
        : montoTotal !== ""
        ? montoTotal
        : "";

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
      Number(saldoParaCalcular || 0) > 0
    ) {
      setEstadoCuenta("Activo");
    }
  }, [fechaVencimiento, saldoActual, montoTotal]);

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function esAdministrador(rol) {
    const rolNormalizado = normalizar(rol);

    return (
      rolNormalizado === "administrador" ||
      rolNormalizado === "superadmin" ||
      rolNormalizado === "admin master" ||
      rolNormalizado === "administrador master"
    );
  }

  function limpiarSesionYSalir(mensaje = "") {
    if (mensaje) {
      alert(mensaje);
    }

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
      limpiarSesionYSalir(
        "La sesión no es válida. Inicie sesión nuevamente."
      );
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
      .select("id, estado, estado_plan")
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
      limpiarSesionYSalir(
        "El servicio de esta empresa está suspendido."
      );
      return;
    }

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

    await cargarGestores(empresaId);

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
      alert("Error cargando gestores: " + error.message);
      setGestores([]);
      return;
    }

    const gestoresActivos = (data || []).filter((usuario) => {
      const rol = normalizar(usuario.rol);

      return (
        rol === "gestor de cobro" ||
        rol === "gestor de cobros" ||
        rol === "gestor cobranza" ||
        rol === "cobrador" ||
        rol === "supervisor" ||
        rol === "administrador"
      );
    });

    setGestores(gestoresActivos);
  }

  function volverCentroOperaciones() {
    router.push("/dashboard");
  }

  function generarNumeroCuenta() {
    return "KX-" + Date.now();
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
      Number(saldo || 0) <= 0
    ) {
      return 0;
    }

    const hoyTexto = obtenerFechaLocalISO();
    const hoy = new Date(`${hoyTexto}T00:00:00`);
    const vencimiento = new Date(`${fecha}T00:00:00`);

    if (Number.isNaN(vencimiento.getTime())) return 0;

    const diferencia = hoy.getTime() - vencimiento.getTime();

    if (diferencia <= 0) return 0;

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  function calcularEstadoCobranzaAutomatico(fecha, saldo) {
    if (saldo === "" || saldo === null || saldo === undefined) {
      return "Sin definir";
    }

    const saldoNumero = Number(saldo || 0);

    if (saldoNumero <= 0) {
      return "Cancelado";
    }

    if (!fecha) {
      return "Al Día";
    }

    const hoyTexto = obtenerFechaLocalISO();
    const hoy = new Date(`${hoyTexto}T00:00:00`);
    const vencimiento = new Date(`${fecha}T00:00:00`);

    if (Number.isNaN(vencimiento.getTime())) {
      return "Al Día";
    }

    return vencimiento < hoy ? "Mora" : "Al Día";
  }

  function responsableFinal() {
    return responsableCobro.trim() || "Sin asignar";
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

    setNumeroCuenta("");
    setTipoProducto("");
    setDescripcion("");
    setMontoTotal("");
    setSaldoActual("");
    setFechaInicio("");
    setFechaVencimiento("");
    setEstadoCuenta("Activo");

    setEstadoCobranza("Sin definir");
    setFechaUltimoPago("");
    setMontoUltimoPago("");
    setResponsableCobro("");
    setObservacionCobro("");

    setDocumentos([]);
  }

  async function validarSesionAntesDeGuardar() {
    const empresaId = obtenerEmpresaId();
    const usuarioId = obtenerUsuarioId();

    if (!empresaId || !usuarioId) {
      return null;
    }

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("id, empresa_id, estado")
      .eq("id", usuarioId)
      .maybeSingle();

    if (error) {
      alert("Error validando sesión: " + error.message);
      return null;
    }

    if (!usuario) {
      limpiarSesionYSalir("La sesión ya no es válida.");
      return null;
    }

    if (normalizar(usuario.estado) !== "activo") {
      limpiarSesionYSalir("El usuario se encuentra inactivo.");
      return null;
    }

    if (String(usuario.empresa_id) !== String(empresaId)) {
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

  async function subirDocumentos(clienteId, empresaId) {
    if (documentos.length === 0) return;

    for (const archivo of documentos) {
      const nombreLimpio = archivo.name.replace(/\s+/g, "_");

      const ruta =
        `empresas/${empresaId}/clientes/${clienteId}/` +
        `${Date.now()}-${nombreLimpio}`;

      const { error } = await supabase.storage
        .from("documentos-clientes")
        .upload(ruta, archivo);

      if (error) {
        throw error;
      }
    }
  }

  async function guardarCuenta() {
    const sesion = await validarSesionAntesDeGuardar();

    if (!sesion) return;

    const { empresaId } = sesion;

    if (!cedula || !nombre || !telefono) {
      alert("Complete cédula, nombre y teléfono.");
      return;
    }

    if (!tipoProducto) {
      alert("Seleccione el tipo de cuenta.");
      return;
    }

    if (!montoTotal && !saldoActual) {
      alert("Ingrese monto original o saldo actual.");
      return;
    }

    const montoTotalNumero = Number(montoTotal || saldoActual || 0);

    const saldoActualNumero =
      saldoActual !== ""
        ? Number(saldoActual || 0)
        : montoTotalNumero;

    if (montoTotalNumero < 0 || saldoActualNumero < 0) {
      alert("Los montos no pueden ser negativos.");
      return;
    }

    if (saldoActualNumero > montoTotalNumero && montoTotalNumero > 0) {
      alert("El saldo actual no puede superar el monto total original.");
      return;
    }

    const montoUltimoPagoNumero = Number(montoUltimoPago || 0);

    if (montoUltimoPagoNumero < 0) {
      alert("El monto del último pago no puede ser negativo.");
      return;
    }

    if (fechaUltimoPago && montoUltimoPagoNumero <= 0) {
      alert(
        "Si coloca una fecha de último pago, también debe ingresar el monto pagado."
      );
      return;
    }

    if (!fechaUltimoPago && montoUltimoPagoNumero > 0) {
      alert(
        "Si ingresa un monto de último pago, también debe colocar la fecha del pago."
      );
      return;
    }

    const estadoCobranzaFinal = calcularEstadoCobranzaAutomatico(
      fechaVencimiento,
      saldoActualNumero
    );

    const diasMora = calcularDiasMora(
      fechaVencimiento,
      saldoActualNumero
    );

    const estadoCuentaFinal =
      saldoActualNumero <= 0
        ? "Cancelado"
        : estadoCuenta === "Cancelado"
        ? "Activo"
        : estadoCuenta;

    setGuardando(true);

    try {
      let clienteCreado = null;

      const {
        data: clienteExistente,
        error: errorBuscarCliente,
      } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("cedula", cedula.trim())
        .maybeSingle();

      if (errorBuscarCliente) {
        throw new Error(
          "Error buscando cliente: " + errorBuscarCliente.message
        );
      }

      if (clienteExistente) {
        clienteCreado = clienteExistente;

        const { error: errorActualizarCliente } = await supabase
          .from("clientes")
          .update({
            nombre: nombre.trim(),
            telefono: telefono.trim(),
            telefono_secundario: telefonoSecundario.trim(),
            direccion: direccion.trim(),
            correo: correo.trim(),
            referencia_nombre: referenciaNombre.trim(),
            referencia_telefono: referenciaTelefono.trim(),
            estado: estadoCliente,
            observacion: observacionCobro.trim(),
          })
          .eq("empresa_id", empresaId)
          .eq("id", clienteExistente.id);

        if (errorActualizarCliente) {
          throw new Error(
            "Error actualizando cliente: " +
              errorActualizarCliente.message
          );
        }
      } else {
        const { data, error } = await supabase
          .from("clientes")
          .insert([
            {
              empresa_id: empresaId,
              cedula: cedula.trim(),
              nombre: nombre.trim(),
              telefono: telefono.trim(),
              telefono_secundario: telefonoSecundario.trim(),
              direccion: direccion.trim(),
              correo: correo.trim(),
              referencia_nombre: referenciaNombre.trim(),
              referencia_telefono: referenciaTelefono.trim(),
              estado: estadoCliente,
              observacion: observacionCobro.trim(),
            },
          ])
          .select()
          .single();

        if (error) {
          throw new Error("Error al guardar cliente: " + error.message);
        }

        clienteCreado = data;
      }

      const cuentaFinal = numeroCuenta.trim() || generarNumeroCuenta();

      const {
        data: comercialCreado,
        error: errorComercial,
      } = await supabase
        .from("informacion_comercial")
        .insert([
          {
            empresa_id: empresaId,
            cliente_id: clienteCreado.id,
            numero_cuenta: cuentaFinal,
            tipo_producto: tipoProducto,
            descripcion: descripcion.trim(),
            modalidad: null,
            monto_total: montoTotalNumero,
            saldo_actual: saldoActualNumero,
            cuota: null,
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
          "Error en información comercial: " +
            errorComercial.message
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
              observacionCobro.trim() ||
              "Cuenta creada desde Cuentas por Cobrar",
          },
        ]);

      if (errorCobranza) {
        throw new Error(
          "Error en cobranza inicial: " + errorCobranza.message
        );
      }

      await subirDocumentos(clienteCreado.id, empresaId);

      alert(
        `Cuenta por cobrar registrada correctamente. Cuenta: ${cuentaFinal}. Estado: ${estadoCobranzaFinal}. Días de mora: ${diasMora}.`
      );

      limpiarFormulario();
    } catch (error) {
      alert(error.message || "Ocurrió un error guardando la cuenta.");
    } finally {
      setGuardando(false);
    }
  }

  if (!accesoValidado) {
    return (
      <div style={styles.cargandoPagina}>
        <div style={styles.cargandoCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={styles.cargandoLogo}
          />
          <strong style={styles.cargandoTitulo}>Validando acceso</strong>
          <p style={styles.cargandoTexto}>
            Verificando usuario, empresa y permisos.
          </p>
        </div>
      </div>
    );
  }

  const saldoVisual =
    saldoActual !== ""
      ? Number(saldoActual || 0)
      : montoTotal !== ""
      ? Number(montoTotal || 0)
      : 0;

  const saldoParaEstadoVisual =
    saldoActual !== ""
      ? saldoActual
      : montoTotal !== ""
      ? montoTotal
      : "";

  const diasMoraVisual = calcularDiasMora(
    fechaVencimiento,
    saldoParaEstadoVisual
  );

  return (
    <main style={styles.pagina}>
      <div style={styles.contenedor}>
        <header style={styles.hero}>
          <div style={styles.heroPrincipal}>
            <div style={styles.logoPanel}>
              <img
                src="/konax-logo.png"
                alt="KONAX"
                style={styles.logo}
              />
            </div>

            <div>
              <span style={styles.etiqueta}>GESTIÓN DE CARTERA</span>
              <h1 style={styles.titulo}>Nueva cuenta por cobrar</h1>
              <p style={styles.subtitulo}>
                Registra al cliente, crea la cuenta y configura la gestión
                inicial de cobranza desde un solo formulario.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={volverCentroOperaciones}
            style={styles.botonVolver}
          >
            <Icon name="arrowLeft" size={18} />
            Centro de Operaciones
          </button>
        </header>

        <section style={styles.resumenGrid}>
          <KPI
            titulo="Cliente"
            valor={nombre || "Pendiente"}
            detalle={cedula || "Sin identificación"}
            icono="user"
          />

          <KPI
            titulo="Saldo actual"
            valor={`$${saldoVisual.toFixed(2)}`}
            detalle={tipoProducto || "Tipo de cuenta sin definir"}
            icono="wallet"
          />

          <KPI
            titulo="Estado de cobranza"
            valor={estadoCobranza}
            detalle={`${diasMoraVisual} días de mora`}
            icono="activity"
            destacado={estadoCobranza === "Mora"}
          />
        </section>

        <section style={styles.formLayout}>
          <div style={styles.mainColumn}>
            <article style={styles.card}>
              <SectionTitle
                numero="01"
                icono="user"
                titulo="Información del cliente"
                texto="Datos personales, contacto y referencias."
              />

              <div style={styles.grid}>
                <Campo label="Cédula / Identificación *">
                  <input
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    style={styles.inputStyle}
                    placeholder="Ej. 8-888-888"
                  />
                </Campo>

                <Campo label="Nombre completo *">
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={styles.inputStyle}
                    placeholder="Nombre del cliente"
                  />
                </Campo>

                <Campo label="Correo electrónico">
                  <input
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    style={styles.inputStyle}
                    placeholder="correo@cliente.com"
                  />
                </Campo>

                <Campo label="Teléfono principal *">
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    style={styles.inputStyle}
                    placeholder="Teléfono"
                  />
                </Campo>

                <Campo label="Teléfono secundario">
                  <input
                    value={telefonoSecundario}
                    onChange={(e) =>
                      setTelefonoSecundario(e.target.value)
                    }
                    style={styles.inputStyle}
                    placeholder="Opcional"
                  />
                </Campo>

                <Campo label="Estado del cliente">
                  <select
                    value={estadoCliente}
                    onChange={(e) => setEstadoCliente(e.target.value)}
                    style={styles.selectStyle}
                  >
                    <option>Activo</option>
                    <option>Inactivo</option>
                  </select>
                </Campo>

                <Campo label="Nombre de referencia">
                  <input
                    value={referenciaNombre}
                    onChange={(e) =>
                      setReferenciaNombre(e.target.value)
                    }
                    style={styles.inputStyle}
                    placeholder="Referencia personal"
                  />
                </Campo>

                <Campo label="Teléfono de referencia">
                  <input
                    value={referenciaTelefono}
                    onChange={(e) =>
                      setReferenciaTelefono(e.target.value)
                    }
                    style={styles.inputStyle}
                    placeholder="Teléfono referencia"
                  />
                </Campo>
              </div>

              <Campo label="Dirección completa">
                <textarea
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  style={styles.textarea}
                  placeholder="Dirección del cliente..."
                />
              </Campo>
            </article>

            <article style={styles.card}>
              <SectionTitle
                numero="02"
                icono="document"
                titulo="Información de la cuenta"
                texto="Monto original, saldo pendiente y fechas."
              />

              <div style={styles.grid}>
                <Campo label="Número de cuenta">
                  <input
                    value={numeroCuenta}
                    onChange={(e) => setNumeroCuenta(e.target.value)}
                    style={styles.inputStyle}
                    placeholder="Opcional, se genera automático"
                  />
                </Campo>

                <Campo label="Tipo de cuenta *">
                  <select
                    value={tipoProducto}
                    onChange={(e) => setTipoProducto(e.target.value)}
                    style={styles.selectStyle}
                  >
                    <option value="">Seleccione tipo de cuenta</option>
                    <option>Crédito</option>
                    <option>Préstamo</option>
                    <option>Cuenta por cobrar</option>
                    <option>Refinanciamiento</option>
                    <option>Servicio pendiente</option>
                  </select>
                </Campo>

                <Campo label="Monto total original *">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoTotal}
                    onChange={(e) => setMontoTotal(e.target.value)}
                    style={styles.inputStyle}
                    placeholder="0.00"
                  />
                </Campo>

                <Campo label="Saldo actual *">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={saldoActual}
                    onChange={(e) => setSaldoActual(e.target.value)}
                    style={styles.inputStyle}
                    placeholder="0.00"
                  />
                </Campo>

                <Campo label="Fecha de inicio">
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    style={styles.inputStyle}
                  />
                </Campo>

                <Campo label="Fecha de vencimiento">
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) =>
                      setFechaVencimiento(e.target.value)
                    }
                    style={styles.inputStyle}
                  />
                </Campo>

                <Campo label="Estado de cuenta">
                  <select
                    value={estadoCuenta}
                    onChange={(e) => setEstadoCuenta(e.target.value)}
                    style={styles.selectStyle}
                    disabled={saldoParaEstadoVisual !== "" && saldoVisual <= 0}
                  >
                    <option>Activo</option>
                    <option>Suspendido</option>
                    <option>Cancelado</option>
                  </select>
                </Campo>
              </div>

              <Campo label="Descripción">
                <textarea
                  placeholder="Ej: Cuenta con saldo pendiente, historial previo, condiciones pactadas..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  style={styles.textarea}
                />
              </Campo>
            </article>

            <article style={styles.card}>
              <SectionTitle
                numero="03"
                icono="phone"
                titulo="Cobranza inicial"
                texto="Estado, mora, último pago y responsable."
              />

              <div style={styles.grid}>
                <Campo label="Estado de cobranza automático">
                  <input
                    value={estadoCobranza}
                    readOnly
                    style={styles.inputAutomatico}
                  />
                </Campo>

                <Campo label="Días de mora calculados">
                  <input
                    value={diasMoraVisual}
                    readOnly
                    style={styles.inputAutomatico}
                  />
                </Campo>

                <Campo label="Fecha último pago">
                  <input
                    type="date"
                    value={fechaUltimoPago}
                    onChange={(e) =>
                      setFechaUltimoPago(e.target.value)
                    }
                    style={styles.inputStyle}
                  />
                </Campo>

                <Campo label="Monto último pago">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoUltimoPago}
                    onChange={(e) =>
                      setMontoUltimoPago(e.target.value)
                    }
                    style={styles.inputStyle}
                    placeholder="0.00"
                  />
                </Campo>

                <Campo label="Responsable de cobro">
                  <select
                    value={responsableCobro}
                    onChange={(e) =>
                      setResponsableCobro(e.target.value)
                    }
                    style={styles.selectStyle}
                  >
                    <option value="">Sin asignar</option>

                    {gestores.map((gestor) => (
                      <option key={gestor.id} value={gestor.nombre}>
                        {gestor.nombre} - {gestor.rol}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>

              <Campo label="Observación inicial / historial previo">
                <textarea
                  placeholder="Observación inicial / historial previo de cobro"
                  value={observacionCobro}
                  onChange={(e) =>
                    setObservacionCobro(e.target.value)
                  }
                  style={styles.textarea}
                />
              </Campo>

              <Campo label="Documentos del cliente">
                <label style={styles.fileBox}>
                  <Icon name="upload" size={22} />
                  <div>
                    <strong style={styles.fileTitle}>
                      Adjuntar documentos
                    </strong>
                    <span style={styles.fileText}>
                      Selecciona uno o varios archivos del cliente.
                    </span>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setDocumentos(Array.from(e.target.files || []))
                    }
                    style={styles.fileInput}
                  />
                </label>

                {documentos.length > 0 && (
                  <span style={styles.fileCount}>
                    {documentos.length} archivo(s) seleccionado(s)
                  </span>
                )}
              </Campo>
            </article>
          </div>

          <aside style={styles.sideColumn}>
            <div style={styles.sideCard}>
              <span style={styles.sideEyebrow}>RESUMEN DE REGISTRO</span>
              <h3 style={styles.sideTitle}>Vista previa</h3>

              <ResumenFila
                label="Cliente"
                value={nombre || "Pendiente"}
              />
              <ResumenFila
                label="Identificación"
                value={cedula || "Pendiente"}
              />
              <ResumenFila
                label="Tipo de cuenta"
                value={tipoProducto || "Pendiente"}
              />
              <ResumenFila
                label="Monto original"
                value={`$${Number(montoTotal || 0).toFixed(2)}`}
              />
              <ResumenFila
                label="Saldo actual"
                value={`$${saldoVisual.toFixed(2)}`}
              />
              <ResumenFila
                label="Estado"
                value={estadoCobranza}
              />
              <ResumenFila
                label="Responsable"
                value={responsableFinal()}
              />

              <div style={styles.sideNotice}>
                <Icon name="shield" size={18} />
                <span>
                  El estado y los días de mora se calculan automáticamente.
                </span>
              </div>
            </div>

            <div style={styles.stickyActions}>
              <button
                type="button"
                onClick={guardarCuenta}
                style={styles.botonGuardar}
                disabled={guardando}
              >
                <Icon name="save" size={18} />
                {guardando
                  ? "Guardando..."
                  : "Guardar cuenta por cobrar"}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                style={styles.botonLimpiar}
                disabled={guardando}
              >
                Limpiar formulario
              </button>

              <button
                type="button"
                onClick={volverCentroOperaciones}
                style={styles.botonSecundario}
                disabled={guardando}
              >
                Salir
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

function SectionTitle({ numero, icono, titulo, texto }) {
  return (
    <div style={styles.sectionHeader}>
      <div style={styles.sectionIcon}>
        <Icon name={icono} size={21} />
      </div>

      <div style={styles.sectionTitleBox}>
        <span style={styles.sectionNumber}>PASO {numero}</span>
        <h2 style={styles.tituloSeccion}>{titulo}</h2>
        <p style={styles.textoSeccion}>{texto}</p>
      </div>
    </div>
  );
}

function KPI({ titulo, valor, detalle, icono, destacado = false }) {
  return (
    <article
      style={{
        ...styles.resumenCard,
        ...(destacado ? styles.resumenCardDanger : {}),
      }}
    >
      <div
        style={{
          ...styles.kpiIcono,
          ...(destacado ? styles.kpiIconoDanger : {}),
        }}
      >
        <Icon name={icono} size={22} />
      </div>

      <div>
        <p style={styles.resumenLabel}>{titulo}</p>
        <h3 style={styles.resumenValor}>{valor}</h3>
        <span style={styles.resumenDetalle}>{detalle}</span>
      </div>
    </article>
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

function Icon({ name, size = 20 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const paths = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h13" />
        <path d="M16 13h5" />
      </>
    ),
    activity: (
      <>
        <path d="M3 12h4l2-6 4 12 2-6h6" />
      </>
    ),
    document: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" />
    ),
    upload: (
      <>
        <path d="M12 3v12M7 8l5-5 5 5" />
        <path d="M5 21h14" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    save: (
      <>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8M7 3v5h8" />
      </>
    ),
    arrowLeft: (
      <>
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </>
    ),
  };

  return <svg {...props}>{paths[name] || paths.user}</svg>;
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
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
    background: "#ffffff",
    boxShadow: "0 24px 60px rgba(15,23,42,.10)",
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
    boxShadow: "0 24px 56px rgba(11,48,29,.18)",
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
    background: "#ffffff",
    boxShadow: "0 14px 30px rgba(0,0,0,.20)",
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
    color: "#ffffff",
    fontSize: "clamp(32px,4vw,48px)",
    lineHeight: 1.04,
    letterSpacing: -1,
  },
  subtitulo: {
    maxWidth: 760,
    margin: 0,
    color: "#d2e7da",
    fontSize: 15,
    lineHeight: 1.58,
  },
  botonVolver: {
    minHeight: 46,
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    padding: "11px 16px",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 12,
    background: "rgba(255,255,255,.09)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
  resumenGrid: {
    marginBottom: 20,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
    gap: 14,
  },
  resumenCard: {
    minHeight: 118,
    padding: 18,
    display: "grid",
    gridTemplateColumns: "48px 1fr",
    gap: 14,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 10px 28px rgba(15,23,42,.05)",
  },
  resumenCardDanger: {
    border: "1px solid #fecaca",
    background: "#fffafa",
  },
  kpiIcono: {
    width: 48,
    height: 48,
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
    margin: "1px 0 6px",
    color: "#6d7971",
    fontSize: 12,
    fontWeight: 800,
  },
  resumenValor: {
    margin: 0,
    color: "#152019",
    fontSize: 22,
    lineHeight: 1.15,
  },
  resumenDetalle: {
    display: "block",
    marginTop: 6,
    color: "#8a958e",
    fontSize: 11,
  },
  formLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 330px",
    gap: 20,
    alignItems: "start",
  },
  mainColumn: {
    minWidth: 0,
  },
  sideColumn: {
    position: "sticky",
    top: 20,
    display: "grid",
    gap: 14,
  },
  card: {
    marginBottom: 18,
    padding: 26,
    border: "1px solid #dfe7e2",
    borderRadius: 22,
    background: "#ffffff",
    boxShadow: "0 12px 34px rgba(15,23,42,.055)",
  },
  sectionHeader: {
    marginBottom: 22,
    paddingBottom: 18,
    display: "flex",
    alignItems: "center",
    gap: 14,
    borderBottom: "1px solid #edf1ee",
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
  },
  sectionTitleBox: {
    minWidth: 0,
  },
  sectionNumber: {
    display: "block",
    marginBottom: 4,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.2,
  },
  tituloSeccion: {
    margin: 0,
    color: "#162019",
    fontSize: 23,
    letterSpacing: -0.3,
  },
  textoSeccion: {
    margin: "5px 0 0",
    color: "#758078",
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(235px,1fr))",
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
    outline: "none",
    background: "#ffffff",
    color: "#18221c",
    fontSize: 14,
  },
  selectStyle: {
    width: "100%",
    minHeight: 46,
    padding: "11px 13px",
    boxSizing: "border-box",
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    outline: "none",
    background: "#ffffff",
    color: "#18221c",
    fontSize: 14,
    fontWeight: 650,
  },
  inputAutomatico: {
    width: "100%",
    minHeight: 46,
    padding: "11px 13px",
    boxSizing: "border-box",
    border: "1px solid #91d5ae",
    borderRadius: 11,
    outline: "none",
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
    outline: "none",
    resize: "vertical",
    background: "#ffffff",
    color: "#18221c",
    fontSize: 14,
    fontFamily: "inherit",
  },
  fileBox: {
    minHeight: 84,
    padding: 16,
    display: "grid",
    gridTemplateColumns: "40px 1fr",
    gap: 12,
    alignItems: "center",
    border: "1px dashed #9fc9b1",
    borderRadius: 14,
    background: "#f5fbf7",
    color: "#17623c",
    cursor: "pointer",
  },
  fileTitle: {
    display: "block",
    fontSize: 13,
  },
  fileText: {
    display: "block",
    marginTop: 4,
    color: "#708078",
    fontSize: 11,
  },
  fileInput: {
    display: "none",
  },
  fileCount: {
    marginTop: 7,
    color: "#16834f",
    fontSize: 11,
    fontWeight: 800,
  },
  sideCard: {
    padding: 22,
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 12px 34px rgba(15,23,42,.055)",
  },
  sideEyebrow: {
    display: "block",
    marginBottom: 5,
    color: "#16834f",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.15,
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
    borderBottom: "1px solid #edf1ee",
  },
  resumenFilaLabel: {
    color: "#77827b",
    fontSize: 12,
  },
  resumenFilaValue: {
    maxWidth: 160,
    overflow: "hidden",
    color: "#1a251e",
    fontSize: 12,
    textAlign: "right",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sideNotice: {
    marginTop: 18,
    padding: 13,
    display: "grid",
    gridTemplateColumns: "22px 1fr",
    gap: 9,
    borderRadius: 13,
    background: "#edf8f1",
    color: "#17623c",
    fontSize: 11,
    lineHeight: 1.45,
  },
  stickyActions: {
    padding: 16,
    display: "grid",
    gap: 9,
    border: "1px solid #dfe7e2",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 12px 34px rgba(15,23,42,.055)",
  },
  botonGuardar: {
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    border: "none",
    borderRadius: 12,
    background: "#16834f",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 850,
    cursor: "pointer",
  },
  botonLimpiar: {
    minHeight: 44,
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    background: "#ffffff",
    color: "#243129",
    fontWeight: 800,
    cursor: "pointer",
  },
  botonSecundario: {
    minHeight: 44,
    border: "none",
    borderRadius: 11,
    background: "#17211c",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
};
