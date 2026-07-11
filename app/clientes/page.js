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

  const [estadoCobranza, setEstadoCobranza] = useState("Al Día");
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
    const saldoNumero =
      saldoActual !== ""
        ? Number(saldoActual || 0)
        : Number(montoTotal || 0);

    const estadoAutomatico = calcularEstadoCobranzaAutomatico(
      fechaVencimiento,
      saldoNumero
    );

    setEstadoCobranza(estadoAutomatico);

    if (estadoAutomatico === "Cancelado") {
      setEstadoCuenta("Cancelado");
    } else if (estadoCuenta === "Cancelado" && saldoNumero > 0) {
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

  function calcularDiasMora(fecha, saldo = 0) {
    if (!fecha || Number(saldo || 0) <= 0) return 0;

    const hoyTexto = obtenerFechaLocalISO();
    const hoy = new Date(`${hoyTexto}T00:00:00`);
    const vencimiento = new Date(`${fecha}T00:00:00`);

    if (Number.isNaN(vencimiento.getTime())) return 0;

    const diferencia = hoy.getTime() - vencimiento.getTime();

    if (diferencia <= 0) return 0;

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  function calcularEstadoCobranzaAutomatico(fecha, saldo) {
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

    setEstadoCobranza("Al Día");
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
      <div style={cargandoPagina}>
        <div style={cargandoCard}>
          <strong>Validando acceso...</strong>
          <p>Verificando usuario, empresa y permisos.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pagina}>
      <div style={contenedor}>
        <div style={hero}>
          <div style={heroInfo}>
            <img src="/konax-logo.png" alt="KONAX" style={logo} />

            <div>
              <p style={etiqueta}>Carga Inicial</p>

              <h1 style={titulo}>Cuentas por Cobrar</h1>

              <p style={subtitulo}>
                Registra clientes existentes, cuentas, saldos,
                cobranza inicial y documentos.
              </p>
            </div>
          </div>

          <button
            onClick={volverCentroOperaciones}
            style={botonVolver}
          >
            ← Centro de Operaciones
          </button>
        </div>

        <div style={resumenGrid}>
          <KPI
            titulo="Cliente"
            valor={nombre || "Sin seleccionar"}
            icono="👤"
          />

          <KPI
            titulo="Saldo actual"
            valor={`$${Number(
              saldoActual || montoTotal || 0
            ).toFixed(2)}`}
            icono="💰"
          />

          <KPI
            titulo="Estado cobranza"
            valor={estadoCobranza}
            icono="📞"
          />
        </div>

        <div style={card}>
          <SectionTitle
            icono="👤"
            titulo="Información del Cliente"
            texto="Datos personales, contacto y referencias del cliente."
          />

          <div style={grid}>
            <Campo label="Cédula / Identificación *">
              <input
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                style={inputStyle}
                placeholder="Ej. 8-888-888"
              />
            </Campo>

            <Campo label="Nombre completo *">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={inputStyle}
                placeholder="Nombre del cliente"
              />
            </Campo>

            <Campo label="Correo electrónico">
              <input
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={inputStyle}
                placeholder="correo@cliente.com"
              />
            </Campo>

            <Campo label="Teléfono principal *">
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                style={inputStyle}
                placeholder="Teléfono"
              />
            </Campo>

            <Campo label="Teléfono secundario">
              <input
                value={telefonoSecundario}
                onChange={(e) =>
                  setTelefonoSecundario(e.target.value)
                }
                style={inputStyle}
                placeholder="Opcional"
              />
            </Campo>

            <Campo label="Estado del cliente">
              <select
                value={estadoCliente}
                onChange={(e) => setEstadoCliente(e.target.value)}
                style={selectStyle}
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
                style={inputStyle}
                placeholder="Referencia personal"
              />
            </Campo>

            <Campo label="Teléfono de referencia">
              <input
                value={referenciaTelefono}
                onChange={(e) =>
                  setReferenciaTelefono(e.target.value)
                }
                style={inputStyle}
                placeholder="Teléfono referencia"
              />
            </Campo>
          </div>

          <Campo label="Dirección completa">
            <textarea
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              style={textarea}
              placeholder="Dirección del cliente..."
            />
          </Campo>
        </div>

        <div style={card}>
          <SectionTitle
            icono="🧾"
            titulo="Información de la Cuenta por Cobrar"
            texto="Registre el monto original, saldo pendiente y fechas de la cuenta por cobrar."
          />

          <div style={grid}>
            <Campo label="Número de cuenta">
              <input
                value={numeroCuenta}
                onChange={(e) => setNumeroCuenta(e.target.value)}
                style={inputStyle}
                placeholder="Opcional, se genera automático"
              />
            </Campo>

            <Campo label="Tipo de cuenta *">
              <select
                value={tipoProducto}
                onChange={(e) => setTipoProducto(e.target.value)}
                style={selectStyle}
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
                style={inputStyle}
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
                style={inputStyle}
                placeholder="0.00"
              />
            </Campo>

            <Campo label="Fecha de inicio">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={inputStyle}
              />
            </Campo>

            <Campo label="Fecha de vencimiento">
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) =>
                  setFechaVencimiento(e.target.value)
                }
                style={inputStyle}
              />
            </Campo>

            <Campo label="Estado de cuenta">
              <select
                value={estadoCuenta}
                onChange={(e) => setEstadoCuenta(e.target.value)}
                style={selectStyle}
                disabled={Number(saldoActual || montoTotal || 0) <= 0}
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
              style={textarea}
            />
          </Campo>
        </div>

        <div style={card}>
          <SectionTitle
            icono="📞"
            titulo="Información de Cobranza Inicial"
            texto="El estado se calcula automáticamente con el saldo y la fecha de vencimiento."
          />

          <div style={grid}>
            <Campo label="Estado de cobranza automático">
              <input
                value={estadoCobranza}
                readOnly
                style={inputAutomatico}
              />
            </Campo>

            <Campo label="Días de mora calculados">
              <input
                value={calcularDiasMora(
                  fechaVencimiento,
                  saldoActual !== ""
                    ? Number(saldoActual || 0)
                    : Number(montoTotal || 0)
                )}
                readOnly
                style={inputAutomatico}
              />
            </Campo>

            <Campo label="Fecha último pago">
              <input
                type="date"
                value={fechaUltimoPago}
                onChange={(e) =>
                  setFechaUltimoPago(e.target.value)
                }
                style={inputStyle}
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
                style={inputStyle}
                placeholder="0.00"
              />
            </Campo>

            <Campo label="Responsable de cobro">
              <select
                value={responsableCobro}
                onChange={(e) =>
                  setResponsableCobro(e.target.value)
                }
                style={selectStyle}
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

          <p style={notaSuave}>
            Si la cuenta tiene saldo y la fecha de vencimiento ya pasó,
            el sistema la guardará como <strong>Mora</strong>. Si el saldo
            es cero, quedará <strong>Cancelada</strong>. Si no está vencida,
            quedará <strong>Al Día</strong>. La fecha del último pago debe
            quedar vacía cuando todavía no existe un pago real.
          </p>

          <Campo label="Observación inicial / historial previo">
            <textarea
              placeholder="Observación inicial / historial previo de cobro"
              value={observacionCobro}
              onChange={(e) =>
                setObservacionCobro(e.target.value)
              }
              style={textarea}
            />
          </Campo>

          <Campo label="Documentos del Cliente">
            <input
              type="file"
              multiple
              onChange={(e) =>
                setDocumentos(Array.from(e.target.files || []))
              }
              style={inputStyle}
            />
          </Campo>

          <div style={acciones}>
            <button
              onClick={guardarCuenta}
              style={botonGuardar}
              disabled={guardando}
            >
              {guardando
                ? "Guardando..."
                : "Guardar Cuenta por Cobrar"}
            </button>

            <button
              onClick={limpiarFormulario}
              style={botonLimpiar}
              disabled={guardando}
            >
              Limpiar
            </button>

            <button
              onClick={volverCentroOperaciones}
              style={botonSecundario}
              disabled={guardando}
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div style={campo}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ icono, titulo, texto }) {
  return (
    <div style={sectionHeader}>
      <div style={sectionIcon}>{icono}</div>

      <div>
        <h2 style={tituloSeccion}>{titulo}</h2>
        <p style={textoSeccion}>{texto}</p>
      </div>
    </div>
  );
}

function KPI({ titulo, valor, icono }) {
  return (
    <div style={resumenCard}>
      <div style={kpiIcono}>{icono}</div>
      <p style={resumenLabel}>{titulo}</p>
      <h3 style={resumenValor}>{valor}</h3>
    </div>
  );
}

const cargandoPagina = {
  minHeight: "100vh",
  background: "#eef2f7",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Arial, sans-serif",
};

const cargandoCard = {
  background: "#ffffff",
  padding: "24px",
  borderRadius: "16px",
  boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
  color: "#111827",
};

const pagina = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg, #ecfdf5 0%, #f3f4f6 45%, #ffffff 100%)",
  padding: "35px",
  fontFamily: "Arial, sans-serif",
};

const contenedor = {
  maxWidth: "1350px",
  margin: "0 auto",
};

const hero = {
  background: "linear-gradient(135deg, #111827, #064e3b)",
  color: "#ffffff",
  padding: "28px",
  borderRadius: "22px",
  marginBottom: "22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
};

const heroInfo = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const logo = {
  width: "85px",
  height: "auto",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "8px",
};

const etiqueta = {
  margin: 0,
  color: "#bbf7d0",
  fontSize: "14px",
  fontWeight: "bold",
};

const titulo = {
  margin: "4px 0",
  fontSize: "36px",
  fontWeight: "bold",
};

const subtitulo = {
  color: "#dcfce7",
  marginTop: "6px",
  maxWidth: "820px",
};

const botonVolver = {
  background: "#ffffff",
  color: "#111827",
  border: "none",
  padding: "12px 18px",
  borderRadius: "9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const resumenGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const resumenCard = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "18px",
  boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
};

const kpiIcono = {
  fontSize: "26px",
  marginBottom: "6px",
};

const resumenLabel = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
};

const resumenValor = {
  margin: "8px 0 0",
  color: "#111827",
  fontSize: "20px",
};

const card = {
  background: "#ffffff",
  padding: "26px",
  borderRadius: "20px",
  marginBottom: "20px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
};

const sectionIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  background: "#ecfdf5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const tituloSeccion = {
  margin: 0,
  color: "#111827",
};

const textoSeccion = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: "14px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(245px,1fr))",
  gap: "16px",
};

const campo = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginBottom: "16px",
};

const labelStyle = {
  color: "#374151",
  fontSize: "13px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
  backgroundColor: "#ffffff",
  color: "#111827",
};

const inputAutomatico = {
  ...inputStyle,
  backgroundColor: "#ecfdf5",
  color: "#166534",
  border: "1px solid #86efac",
  fontWeight: "bold",
};

const selectStyle = {
  ...inputStyle,
  fontWeight: "600",
};

const textarea = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
};

const notaSuave = {
  margin: "4px 0 14px",
  color: "#475569",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  padding: "12px",
  borderRadius: "12px",
  fontSize: "13px",
  lineHeight: 1.5,
};

const acciones = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "20px",
};

const botonGuardar = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "14px 26px",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
};

const botonLimpiar = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
};

const botonSecundario = {
  background: "#6b7280",
  color: "#ffffff",
  border: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
};
