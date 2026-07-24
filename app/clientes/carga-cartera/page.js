"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const COLUMNAS_REQUERIDAS = [
  "cedula",
  "nombre",
  "telefono",
  "tipo_cuenta",
  "monto_total",
  "saldo_actual",
];

const COLUMNAS_PLANTILLA = [
  "cedula",
  "nombre",
  "telefono",
  "correo",
  "direccion",
  "numero_cuenta",
  "tipo_cuenta",
  "monto_total",
  "saldo_actual",
  "cuota",
  "periodicidad",
  "numero_cuotas",
  "fecha_inicio",
  "fecha_vencimiento",
  "fecha_proxima_cuota",
  "gestor",
  "observacion",
];

export default function CargaCarteraPage() {
  const router = useRouter();

  const [accesoValidado, setAccesoValidado] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [archivoNombre, setArchivoNombre] = useState("");
  const [filas, setFilas] = useState([]);
  const [erroresArchivo, setErroresArchivo] = useState([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [accionDuplicados, setAccionDuplicados] = useState(
    "actualizar_cliente_y_crear_cuenta"
  );

  useEffect(() => {
    validarAcceso();
  }, []);

  const resumen = useMemo(() => {
    const validas = filas.filter((fila) => fila.valida).length;
    const invalidas = filas.length - validas;
    const duplicadas = filas.filter((fila) => fila.duplicada).length;

    return {
      total: filas.length,
      validas,
      invalidas,
      duplicadas,
    };
  }, [filas]);

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function normalizarEncabezado(texto) {
    return normalizar(texto)
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "_");
  }

  function limpiarSesionYSalir(mensaje = "") {
    if (mensaje) alert(mensaje);
    localStorage.clear();
    router.replace("/login");
  }

  function esAdministrador(rol) {
    return [
      "administrador",
      "superadmin",
      "admin master",
      "administrador master",
    ].includes(normalizar(rol));
  }

  async function validarAcceso() {
    const empresaLocal = localStorage.getItem("empresaId");
    const usuarioLocal = localStorage.getItem("usuarioId");

    if (!empresaLocal || !usuarioLocal) {
      limpiarSesionYSalir(
        "La sesión no es válida. Inicie sesión nuevamente."
      );
      return;
    }

    const { data: usuario, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("id, empresa_id, rol, estado")
      .eq("id", usuarioLocal)
      .maybeSingle();

    if (errorUsuario || !usuario) {
      limpiarSesionYSalir(
        "No se pudo validar el usuario de esta sesión."
      );
      return;
    }

    if (normalizar(usuario.estado) !== "activo") {
      limpiarSesionYSalir(
        "Este usuario se encuentra inactivo."
      );
      return;
    }

    if (String(usuario.empresa_id) !== String(empresaLocal)) {
      limpiarSesionYSalir(
        "La empresa activa no corresponde al usuario autenticado."
      );
      return;
    }

    if (!esAdministrador(usuario.rol)) {
      const { data: permiso, error: errorPermiso } = await supabase
        .from("permisos_usuarios_empresa")
        .select("activo")
        .eq("empresa_id", empresaLocal)
        .eq("usuario_id", usuarioLocal)
        .eq("permiso", "clientes")
        .maybeSingle();

      if (errorPermiso || !permiso?.activo) {
        alert(
          "No tienes permiso para realizar una carga de cartera."
        );
        router.replace("/clientes");
        return;
      }
    }

    setEmpresaId(empresaLocal);
    setUsuarioId(usuarioLocal);
    setAccesoValidado(true);
  }

  function detectarSeparador(texto) {
    const primeraLinea = String(texto || "").split(/\r?\n/)[0] || "";
    const comas = (primeraLinea.match(/,/g) || []).length;
    const puntoComa = (primeraLinea.match(/;/g) || []).length;
    const tabulaciones = (primeraLinea.match(/\t/g) || []).length;

    if (tabulaciones > comas && tabulaciones > puntoComa) return "\t";
    return puntoComa > comas ? ";" : ",";
  }

  function parsearCSV(texto) {
    const separador = detectarSeparador(texto);
    const registros = [];
    let fila = [];
    let campo = "";
    let entreComillas = false;

    for (let i = 0; i < texto.length; i += 1) {
      const caracter = texto[i];
      const siguiente = texto[i + 1];

      if (caracter === '"') {
        if (entreComillas && siguiente === '"') {
          campo += '"';
          i += 1;
        } else {
          entreComillas = !entreComillas;
        }
      } else if (caracter === separador && !entreComillas) {
        fila.push(campo.trim());
        campo = "";
      } else if (
        (caracter === "\n" || caracter === "\r") &&
        !entreComillas
      ) {
        if (caracter === "\r" && siguiente === "\n") {
          i += 1;
        }

        fila.push(campo.trim());

        if (fila.some((valor) => String(valor).trim() !== "")) {
          registros.push(fila);
        }

        fila = [];
        campo = "";
      } else {
        campo += caracter;
      }
    }

    fila.push(campo.trim());

    if (fila.some((valor) => String(valor).trim() !== "")) {
      registros.push(fila);
    }

    return registros;
  }

  function convertirNumero(valor) {
    const limpio = String(valor || "")
      .replace(/\$/g, "")
      .replace(/\s/g, "")
      .replace(/,/g, "");

    if (limpio === "") return null;

    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : null;
  }

  function convertirEntero(valor) {
    if (String(valor || "").trim() === "") return null;
    const numero = Number.parseInt(String(valor), 10);
    return Number.isFinite(numero) ? numero : null;
  }

  function convertirFecha(valor) {
    const limpio = String(valor || "").trim();
    if (!limpio) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(limpio)) {
      return limpio;
    }

    const partes = limpio.split(/[\/\-]/);

    if (partes.length === 3) {
      const [a, b, c] = partes;

      if (a.length === 4) {
        return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
      }

      if (c.length === 4) {
        return `${c}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
      }
    }

    return null;
  }

  function generarNumeroCuenta(indice) {
    return `MIG-${Date.now()}-${indice + 1}`;
  }

  function calcularDiasMora(fechaVencimiento, saldoActual) {
    if (!fechaVencimiento || Number(saldoActual || 0) <= 0) return 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vencimiento = new Date(`${fechaVencimiento}T00:00:00`);

    if (Number.isNaN(vencimiento.getTime())) return 0;

    const diferencia = hoy.getTime() - vencimiento.getTime();

    return diferencia > 0
      ? Math.floor(diferencia / 86400000)
      : 0;
  }

  function calcularEstadoCobranza(fechaVencimiento, saldoActual) {
    if (Number(saldoActual || 0) <= 0) return "Cancelado";
    return calcularDiasMora(fechaVencimiento, saldoActual) > 0
      ? "Mora"
      : "Al Día";
  }

  async function manejarArchivo(evento) {
    const archivo = evento.target.files?.[0];

    setResultado(null);
    setFilas([]);
    setErroresArchivo([]);

    if (!archivo) {
      setArchivoNombre("");
      return;
    }

    if (!archivo.name.toLowerCase().endsWith(".csv")) {
      setErroresArchivo([
        "La primera versión admite archivos CSV. Descarga la plantilla, complétala y guárdala como CSV.",
      ]);
      setArchivoNombre("");
      return;
    }

    setArchivoNombre(archivo.name);

    try {
      const texto = await archivo.text();
      const registros = parsearCSV(texto);

      if (registros.length < 2) {
        setErroresArchivo([
          "El archivo no contiene filas de datos.",
        ]);
        return;
      }

      const encabezados = registros[0].map(normalizarEncabezado);
      const faltantes = COLUMNAS_REQUERIDAS.filter(
        (columna) => !encabezados.includes(columna)
      );

      if (faltantes.length > 0) {
        setErroresArchivo([
          `Faltan columnas obligatorias: ${faltantes.join(", ")}.`,
        ]);
        return;
      }

      const filasProcesadas = registros.slice(1).map((valores, indice) => {
        const objeto = {};

        encabezados.forEach((encabezado, posicion) => {
          objeto[encabezado] = valores[posicion] ?? "";
        });

        return {
          indice,
          numeroFila: indice + 2,
          original: objeto,
        };
      });

      await validarFilas(filasProcesadas);
    } catch (error) {
      console.error(error);
      setErroresArchivo([
        "No se pudo leer el archivo CSV. Verifique su formato.",
      ]);
    }
  }

  async function validarFilas(filasCrudas) {
    const cedulas = filasCrudas
      .map((fila) => String(fila.original.cedula || "").trim())
      .filter(Boolean);

    const { data: existentes, error: errorExistentes } = await supabase
      .from("clientes")
      .select("id, cedula, nombre")
      .eq("empresa_id", empresaId)
      .in("cedula", cedulas.length > 0 ? cedulas : ["__sin_cedula__"]);

    if (errorExistentes) {
      setErroresArchivo([
        "No se pudieron verificar los clientes existentes: " +
          errorExistentes.message,
      ]);
      return;
    }

    const mapaExistentes = new Map(
      (existentes || []).map((cliente) => [
        String(cliente.cedula || "").trim(),
        cliente,
      ])
    );

    const vistas = filasCrudas.map((fila) => {
      const datos = fila.original;
      const errores = [];

      const cedula = String(datos.cedula || "").trim();
      const nombre = String(datos.nombre || "").trim();
      const telefono = String(datos.telefono || "").trim();
      const correo = String(datos.correo || "").trim().toLowerCase();
      const direccion = String(datos.direccion || "").trim();
      const numeroCuenta =
        String(datos.numero_cuenta || "").trim() ||
        generarNumeroCuenta(fila.indice);
      const tipoCuenta = String(datos.tipo_cuenta || "").trim();
      const montoTotal = convertirNumero(datos.monto_total);
      const saldoActual = convertirNumero(datos.saldo_actual);
      const cuota = convertirNumero(datos.cuota);
      const periodicidad = String(datos.periodicidad || "").trim();
      const numeroCuotas = convertirEntero(datos.numero_cuotas);
      const fechaInicio = convertirFecha(datos.fecha_inicio);
      const fechaVencimiento = convertirFecha(datos.fecha_vencimiento);
      const fechaProximaCuota = convertirFecha(datos.fecha_proxima_cuota);
      const gestor = String(datos.gestor || "").trim();
      const observacion = String(datos.observacion || "").trim();

      if (!cedula) errores.push("Cédula requerida.");
      if (!nombre) errores.push("Nombre requerido.");
      if (!telefono) errores.push("Teléfono requerido.");
      if (!tipoCuenta) errores.push("Tipo de cuenta requerido.");
      if (montoTotal === null || montoTotal < 0) {
        errores.push("Monto total inválido.");
      }
      if (saldoActual === null || saldoActual < 0) {
        errores.push("Saldo actual inválido.");
      }
      if (
        montoTotal !== null &&
        saldoActual !== null &&
        saldoActual > montoTotal
      ) {
        errores.push("El saldo supera el monto total.");
      }
      if (cuota !== null && cuota < 0) {
        errores.push("Cuota inválida.");
      }
      if (numeroCuotas !== null && numeroCuotas < 1) {
        errores.push("Número de cuotas inválido.");
      }
      if (datos.fecha_inicio && !fechaInicio) {
        errores.push("Fecha de inicio inválida.");
      }
      if (datos.fecha_vencimiento && !fechaVencimiento) {
        errores.push("Fecha de vencimiento inválida.");
      }
      if (datos.fecha_proxima_cuota && !fechaProximaCuota) {
        errores.push("Fecha próxima cuota inválida.");
      }

      const periodicidadesValidas = [
        "",
        "semanal",
        "quincenal",
        "mensual",
        "bimensual",
        "trimestral",
      ];

      if (!periodicidadesValidas.includes(normalizar(periodicidad))) {
        errores.push(
          "Periodicidad no válida. Use Semanal, Quincenal, Mensual, Bimensual o Trimestral."
        );
      }

      const duplicado = mapaExistentes.get(cedula) || null;

      return {
        numeroFila: fila.numeroFila,
        valida: errores.length === 0,
        duplicada: Boolean(duplicado),
        clienteExistente: duplicado,
        errores,
        datos: {
          cedula,
          nombre,
          telefono,
          correo,
          direccion,
          numeroCuenta,
          tipoCuenta,
          montoTotal,
          saldoActual,
          cuota,
          periodicidad,
          numeroCuotas,
          fechaInicio,
          fechaVencimiento,
          fechaProximaCuota,
          gestor,
          observacion,
        },
      };
    });

    setFilas(vistas);
  }

  function descargarPlantilla() {
    const ejemplo = [
      "8-888-888",
      "Cliente de ejemplo",
      "6000-0000",
      "cliente@correo.com",
      "La Chorrera",
      "PREST-001",
      "Préstamo",
      "1200.00",
      "950.00",
      "100.00",
      "Quincenal",
      "12",
      "2026-01-15",
      "2026-07-15",
      "2026-02-15",
      "Gestor de prueba",
      "Cartera migrada a KONAX",
    ];

    const contenido =
      COLUMNAS_PLANTILLA.join(",") +
      "\n" +
      ejemplo.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(",");

    const blob = new Blob(["\uFEFF" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = "plantilla_carga_cartera_konax.csv";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }

  async function crearOActualizarCliente(fila) {
    const datos = fila.datos;

    if (fila.duplicada && fila.clienteExistente) {
      if (accionDuplicados === "ignorar") {
        return {
          cliente: fila.clienteExistente,
          ignorada: true,
        };
      }

      const { data, error } = await supabase
        .from("clientes")
        .update({
          nombre: datos.nombre,
          telefono: datos.telefono,
          correo: datos.correo,
          direccion: datos.direccion,
          estado: "Activo",
          observacion: datos.observacion,
        })
        .eq("empresa_id", empresaId)
        .eq("id", fila.clienteExistente.id)
        .select()
        .single();

      if (error) throw error;

      return {
        cliente: data,
        ignorada: false,
      };
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert([
        {
          empresa_id: empresaId,
          cedula: datos.cedula,
          nombre: datos.nombre,
          telefono: datos.telefono,
          correo: datos.correo,
          direccion: datos.direccion,
          estado: "Activo",
          observacion: datos.observacion,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      cliente: data,
      ignorada: false,
    };
  }

  async function importarCartera() {
    if (importando) return;

    const filasValidas = filas.filter((fila) => fila.valida);

    if (filasValidas.length === 0) {
      alert("No hay filas válidas para importar.");
      return;
    }

    const confirmar = window.confirm(
      `Se importarán ${filasValidas.length} fila(s).\n\n` +
        "Revise la vista previa antes de continuar."
    );

    if (!confirmar) return;

    setImportando(true);
    setResultado(null);

    let clientesCreados = 0;
    let clientesActualizados = 0;
    let cuentasCreadas = 0;
    let filasIgnoradas = 0;
    const errores = [];

    for (const fila of filasValidas) {
      try {
        const respuestaCliente = await crearOActualizarCliente(fila);

        if (respuestaCliente.ignorada) {
          filasIgnoradas += 1;
          continue;
        }

        if (fila.duplicada) {
          clientesActualizados += 1;
        } else {
          clientesCreados += 1;
        }

        const clienteId = respuestaCliente.cliente.id;
        const datos = fila.datos;
        const estadoCuenta =
          Number(datos.saldoActual || 0) <= 0 ? "Cancelado" : "Activo";
        const estadoCobranza = calcularEstadoCobranza(
          datos.fechaVencimiento,
          datos.saldoActual
        );
        const diasMora = calcularDiasMora(
          datos.fechaVencimiento,
          datos.saldoActual
        );

        const { data: cuenta, error: errorCuenta } = await supabase
          .from("informacion_comercial")
          .insert([
            {
              empresa_id: empresaId,
              cliente_id: clienteId,
              numero_cuenta: datos.numeroCuenta,
              tipo_producto: datos.tipoCuenta,
              descripcion: datos.observacion,
              modalidad: null,
              monto_total: datos.montoTotal,
              saldo_actual: datos.saldoActual,
              cuota: datos.cuota,
              periodicidad: datos.periodicidad || null,
              numero_cuotas: datos.numeroCuotas,
              fecha_inicio: datos.fechaInicio,
              fecha_vencimiento: datos.fechaVencimiento,
              fecha_proxima_cuota: datos.fechaProximaCuota,
              responsable: datos.gestor || "Sin asignar",
              estado: estadoCuenta,
              observacion: datos.observacion,
            },
          ])
          .select()
          .single();

        if (errorCuenta) throw errorCuenta;

        const { error: errorCobranza } = await supabase
          .from("informacion_cobranza")
          .insert([
            {
              empresa_id: empresaId,
              cliente_id: clienteId,
              informacion_comercial_id: cuenta.id,
              estado_cobranza: estadoCobranza,
              dias_mora: diasMora,
              fecha_ultimo_pago: null,
              monto_ultimo_pago: 0,
              responsable_cobro: datos.gestor || "Sin asignar",
              observacion_cobro:
                datos.observacion || "Cuenta importada desde carga de cartera",
            },
          ]);

        if (errorCobranza) throw errorCobranza;

        cuentasCreadas += 1;
      } catch (error) {
        console.error("Error importando fila", fila.numeroFila, error);

        errores.push({
          fila: fila.numeroFila,
          mensaje: error?.message || "Error desconocido.",
        });
      }
    }

    setResultado({
      clientesCreados,
      clientesActualizados,
      cuentasCreadas,
      filasIgnoradas,
      errores,
    });

    setImportando(false);
  }

  function limpiarCarga() {
    setArchivoNombre("");
    setFilas([]);
    setErroresArchivo([]);
    setResultado(null);

    const input = document.getElementById("archivo-cartera");

    if (input) input.value = "";
  }

  if (!accesoValidado) {
    return (
      <main style={styles.cargandoPagina}>
        <div style={styles.cargandoCard}>
          <img
            src="/konax-logo.png"
            alt="KONAX"
            style={styles.logoCarga}
          />
          <strong>Validando acceso</strong>
          <p>Verificando empresa, usuario y permisos.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.pagina}>
      <div style={styles.contenedor}>
        <header style={styles.hero}>
          <div>
            <span style={styles.etiqueta}>MIGRACIÓN DE DATOS</span>
            <h1 style={styles.titulo}>Carga de cartera</h1>
            <p style={styles.subtitulo}>
              Importe clientes y cuentas existentes mediante un archivo CSV,
              revise los errores y confirme la carga antes de guardar.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/clientes")}
            style={styles.botonVolver}
          >
            ← Volver a Clientes
          </button>
        </header>

        <section style={styles.gridPrincipal}>
          <article style={styles.card}>
            <div style={styles.encabezadoSeccion}>
              <div style={styles.numeroPaso}>01</div>
              <div>
                <h2 style={styles.tituloSeccion}>Preparar archivo</h2>
                <p style={styles.textoSeccion}>
                  Descargue la plantilla, complete la información y guárdela
                  como CSV.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={descargarPlantilla}
              style={styles.botonSecundario}
            >
              Descargar plantilla CSV
            </button>

            <div style={styles.nota}>
              No elimine ni cambie los encabezados de la plantilla.
            </div>
          </article>

          <article style={styles.card}>
            <div style={styles.encabezadoSeccion}>
              <div style={styles.numeroPaso}>02</div>
              <div>
                <h2 style={styles.tituloSeccion}>Subir y validar</h2>
                <p style={styles.textoSeccion}>
                  Seleccione el archivo y espere la revisión automática.
                </p>
              </div>
            </div>

            <input
              id="archivo-cartera"
              type="file"
              accept=".csv,text/csv"
              onChange={manejarArchivo}
              style={styles.inputArchivo}
            />

            {archivoNombre && (
              <div style={styles.archivoSeleccionado}>
                Archivo seleccionado: <strong>{archivoNombre}</strong>
              </div>
            )}

            {erroresArchivo.length > 0 && (
              <div style={styles.errorBox}>
                {erroresArchivo.map((error, indice) => (
                  <div key={indice}>{error}</div>
                ))}
              </div>
            )}

            <label style={styles.label}>
              Acción cuando la cédula ya existe
            </label>

            <select
              value={accionDuplicados}
              onChange={(e) => setAccionDuplicados(e.target.value)}
              style={styles.select}
            >
              <option value="actualizar_cliente_y_crear_cuenta">
                Actualizar cliente y crear nueva cuenta
              </option>
              <option value="ignorar">
                Ignorar la fila duplicada
              </option>
            </select>
          </article>
        </section>

        {filas.length > 0 && (
          <>
            <section style={styles.resumenGrid}>
              <KPI titulo="Filas leídas" valor={resumen.total} />
              <KPI titulo="Válidas" valor={resumen.validas} />
              <KPI titulo="Con errores" valor={resumen.invalidas} />
              <KPI titulo="Cédulas existentes" valor={resumen.duplicadas} />
            </section>

            <article style={styles.card}>
              <div style={styles.encabezadoSeccion}>
                <div style={styles.numeroPaso}>03</div>
                <div>
                  <h2 style={styles.tituloSeccion}>Vista previa</h2>
                  <p style={styles.textoSeccion}>
                    Corrija en el archivo las filas marcadas con error y
                    vuelva a cargarlo.
                  </p>
                </div>
              </div>

              <div style={styles.tablaContenedor}>
                <table style={styles.tabla}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Fila</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>Cédula</th>
                      <th style={styles.th}>Cliente</th>
                      <th style={styles.th}>Cuenta</th>
                      <th style={styles.th}>Saldo</th>
                      <th style={styles.th}>Cuota</th>
                      <th style={styles.th}>Periodicidad</th>
                      <th style={styles.th}>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila) => (
                      <tr key={fila.numeroFila}>
                        <td style={styles.td}>{fila.numeroFila}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.estado,
                              ...(fila.valida
                                ? styles.estadoValido
                                : styles.estadoError),
                            }}
                          >
                            {fila.valida ? "Válida" : "Error"}
                          </span>
                        </td>
                        <td style={styles.td}>{fila.datos.cedula}</td>
                        <td style={styles.td}>{fila.datos.nombre}</td>
                        <td style={styles.td}>{fila.datos.numeroCuenta}</td>
                        <td style={styles.td}>
                          ${Number(fila.datos.saldoActual || 0).toFixed(2)}
                        </td>
                        <td style={styles.td}>
                          {fila.datos.cuota === null
                            ? "—"
                            : `$${Number(fila.datos.cuota).toFixed(2)}`}
                        </td>
                        <td style={styles.td}>
                          {fila.datos.periodicidad || "—"}
                        </td>
                        <td style={styles.td}>
                          {fila.errores.length > 0
                            ? fila.errores.join(" ")
                            : fila.duplicada
                            ? "Cliente existente"
                            : "Lista para importar"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.acciones}>
                <button
                  type="button"
                  onClick={importarCartera}
                  style={styles.botonImportar}
                  disabled={importando || resumen.validas === 0}
                >
                  {importando
                    ? "Importando cartera..."
                    : `Importar ${resumen.validas} fila(s) válida(s)`}
                </button>

                <button
                  type="button"
                  onClick={limpiarCarga}
                  style={styles.botonLimpiar}
                  disabled={importando}
                >
                  Limpiar carga
                </button>
              </div>
            </article>
          </>
        )}

        {resultado && (
          <article style={styles.resultadoCard}>
            <h2 style={styles.tituloSeccion}>Resultado de importación</h2>

            <div style={styles.resultadoGrid}>
              <Resultado
                label="Clientes creados"
                valor={resultado.clientesCreados}
              />
              <Resultado
                label="Clientes actualizados"
                valor={resultado.clientesActualizados}
              />
              <Resultado
                label="Cuentas creadas"
                valor={resultado.cuentasCreadas}
              />
              <Resultado
                label="Filas ignoradas"
                valor={resultado.filasIgnoradas}
              />
            </div>

            {resultado.errores.length > 0 && (
              <div style={styles.errorBox}>
                <strong>Filas que no se pudieron importar:</strong>
                {resultado.errores.map((error) => (
                  <div key={`${error.fila}-${error.mensaje}`}>
                    Fila {error.fila}: {error.mensaje}
                  </div>
                ))}
              </div>
            )}
          </article>
        )}
      </div>
    </main>
  );
}

function KPI({ titulo, valor }) {
  return (
    <article style={styles.kpi}>
      <span style={styles.kpiLabel}>{titulo}</span>
      <strong style={styles.kpiValor}>{valor}</strong>
    </article>
  );
}

function Resultado({ label, valor }) {
  return (
    <div style={styles.resultadoItem}>
      <span>{label}</span>
      <strong>{valor}</strong>
    </div>
  );
}

const styles = {
  pagina: {
    minHeight: "100vh",
    padding: 30,
    background: "#f3f6f4",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#17211c",
  },
  contenedor: {
    maxWidth: 1450,
    margin: "0 auto",
  },
  cargandoPagina: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f3f6f4",
    padding: 24,
  },
  cargandoCard: {
    maxWidth: 420,
    padding: 30,
    background: "#fff",
    borderRadius: 20,
    textAlign: "center",
    border: "1px solid #dfe7e2",
  },
  logoCarga: {
    width: 220,
    maxWidth: "100%",
    marginBottom: 16,
  },
  hero: {
    padding: "28px 30px",
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    alignItems: "center",
    borderRadius: 24,
    background:
      "linear-gradient(135deg, #09120d 0%, #123b25 62%, #17673e 100%)",
    marginBottom: 20,
  },
  etiqueta: {
    color: "#79dca6",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.4,
  },
  titulo: {
    color: "#fff",
    fontSize: "clamp(32px,4vw,48px)",
    margin: "7px 0 10px",
  },
  subtitulo: {
    color: "#d2e7da",
    margin: 0,
    maxWidth: 760,
    lineHeight: 1.5,
  },
  botonVolver: {
    minHeight: 45,
    padding: "10px 16px",
    borderRadius: 11,
    border: "1px solid rgba(255,255,255,.2)",
    background: "rgba(255,255,255,.1)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  gridPrincipal: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: 18,
    marginBottom: 18,
  },
  card: {
    background: "#fff",
    border: "1px solid #dfe7e2",
    borderRadius: 20,
    padding: 24,
    marginBottom: 18,
  },
  encabezadoSeccion: {
    display: "flex",
    gap: 13,
    alignItems: "center",
    marginBottom: 20,
  },
  numeroPaso: {
    width: 46,
    height: 46,
    minWidth: 46,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#eaf7ef",
    color: "#16834f",
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
  botonSecundario: {
    minHeight: 44,
    padding: "10px 15px",
    border: "none",
    borderRadius: 11,
    background: "#17211c",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  nota: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    background: "#f3faf6",
    color: "#17623c",
    fontSize: 13,
  },
  inputArchivo: {
    width: "100%",
    padding: 12,
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    boxSizing: "border-box",
    marginBottom: 12,
  },
  archivoSeleccionado: {
    fontSize: 13,
    marginBottom: 14,
    color: "#3f4c44",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 7,
    color: "#3f4c44",
  },
  select: {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    background: "#fff",
  },
  errorBox: {
    margin: "12px 0",
    padding: 14,
    borderRadius: 12,
    background: "#fff1f2",
    border: "1px solid #fecaca",
    color: "#9f1239",
    fontSize: 13,
    display: "grid",
    gap: 6,
  },
  resumenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 12,
    marginBottom: 18,
  },
  kpi: {
    padding: 17,
    borderRadius: 16,
    border: "1px solid #dfe7e2",
    background: "#fff",
  },
  kpiLabel: {
    display: "block",
    color: "#758078",
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 7,
  },
  kpiValor: {
    fontSize: 26,
  },
  tablaContenedor: {
    overflowX: "auto",
    border: "1px solid #e2e8e4",
    borderRadius: 13,
  },
  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1100,
  },
  th: {
    padding: 12,
    background: "#f5f8f6",
    borderBottom: "1px solid #dfe7e2",
    textAlign: "left",
    fontSize: 12,
  },
  td: {
    padding: 12,
    borderBottom: "1px solid #edf1ee",
    fontSize: 12,
    verticalAlign: "top",
  },
  estado: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 999,
    fontWeight: 800,
  },
  estadoValido: {
    background: "#eaf7ef",
    color: "#17623c",
  },
  estadoError: {
    background: "#fff1f2",
    color: "#9f1239",
  },
  acciones: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  botonImportar: {
    minHeight: 46,
    padding: "11px 17px",
    border: "none",
    borderRadius: 11,
    background: "#16834f",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
  },
  botonLimpiar: {
    minHeight: 46,
    padding: "11px 17px",
    border: "1px solid #ccd7d0",
    borderRadius: 11,
    background: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  resultadoCard: {
    background: "#f3faf6",
    border: "1px solid #b7d8c4",
    borderRadius: 20,
    padding: 24,
    marginBottom: 18,
  },
  resultadoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
    gap: 12,
    marginTop: 18,
  },
  resultadoItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #dfe7e2",
  },
};
