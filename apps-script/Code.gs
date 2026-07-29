/**
 * ============================================================
 * PORTAL DE EVALUACIONES · MEGA PLAST
 * Backend en Google Apps Script: recibe las evaluaciones y PDFs
 * enviados por el portal (fetch a WEBAPP_URL) y los guarda en
 * Google Sheets (Evaluaciones + Detalle_Actividades) y Google
 * Drive (PDFs_Generados).
 *
 * Despliegue:
 *  1. Reemplaza SPREADSHEET_ID y DRIVE_FOLDER_ID abajo por los
 *     tuyos (ID de la hoja de cálculo y de la carpeta de Drive
 *     donde se guardarán los PDF).
 *  2. Ejecuta inicializarHojas() una vez desde el editor para
 *     crear las 4 hojas con sus encabezados.
 *  3. Implementar > Nueva implementación > Aplicación web
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *  4. Copia la URL /exec resultante en WEBAPP_URL (js/config.js
 *     del portal).
 * ============================================================
 */

const SPREADSHEET_ID = "1rAi8bNWjBgcdX5uz7zIO0K9zY0j2izZDgiJsbzOB8cU";
const DRIVE_FOLDER_ID = "1mVfvQu9TygRAvNOQeK6iJE3TFZKsGAn0";

const SHEET_EVALUACIONES = "Evaluaciones";
const SHEET_DETALLE = "Detalle_Actividades";
const SHEET_PDFS = "PDFs_Generados";
const SHEET_PINES = "Config_Perfiles";

const HEADERS_EVALUACIONES = [
  "Marca_Temporal", "ID_Evaluacion", "Procedimiento", "Procedimiento_Nombre",
  "Evaluador", "Puesto", "Fecha_Evaluacion", "UDN", "Periodo", "Tipo_Evaluacion",
  "Puntaje_Total", "Puntaje_Maximo", "Porcentaje", "Actividades_Evaluadas",
  "Actividades_No_Aplican", "Observaciones_Generales", "Guardado_En_Cliente",
  "Perfil_Id", "Perfil_Nombre",
];

const HEADERS_DETALLE = [
  "ID_Evaluacion", "Fase", "Numero_Actividad", "Actividad", "Responsable",
  "Resultado", "Puntaje", "Comentario", "Razon_No_Aplica",
];

const HEADERS_PDFS = [
  "Marca_Temporal", "Nombre_Archivo", "Enlace_Drive",
];

const HEADERS_PINES = [
  "ID_Perfil", "Nombre", "PIN_Hash",
];

const LOCKOUT_MAX_INTENTOS = 5;
const LOCKOUT_SEGUNDOS = 300; // 5 minutos

// Valores por defecto: se usan solo para sembrar la hoja Config_Perfiles
// la primera vez (si ya tiene filas, estos valores se ignoran) — se
// guarda su HASH, nunca el PIN en claro. Deben coincidir con los IDs
// de PERFILES en js/perfiles.js del portal.
const PERFILES_DEFAULT = [
  { id: "gerencia", nombre: "Gerencia", pin: "1111" },
  { id: "udn_mega", nombre: "Encargado de UDN · Mega Plast", pin: "2222" },
  { id: "udn_reposteria", nombre: "Encargado de UDN · Repos-T-arte", pin: "3333" },
  { id: "udn_temascalapa", nombre: "Encargado de UDN · Temascalapa", pin: "4444" },
];

/* ============================================================
   PUNTO DE ENTRADA (Web App)
   ============================================================ */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    Logger.log("doPost recibido: " + e.postData.contents);
    const data = JSON.parse(e.postData.contents);

    if (data.evento === "evaluacion") {
      guardarEvaluacion(data);
    } else if (data.evento === "pdf") {
      guardarPDF(data);
    } else if (data.evento === "actualizarPines") {
      actualizarPines(data);
    } else if (data.evento === "verificarPin") {
      // Único evento que responde con datos reales (no solo {ok:true});
      // el PIN nunca sale del servidor, solo el resultado sí/no.
      return respuestaJSON(verificarPin(data));
    } else {
      throw new Error("Campo 'evento' desconocido o ausente: " + data.evento);
    }

    Logger.log("doPost completado OK para evento=" + data.evento);
    return respuestaJSON({ ok: true });
  } catch (err) {
    Logger.log("Error en doPost: " + err.message + " | stack: " + err.stack);
    return respuestaJSON({ ok: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const accion = e && e.parameter && e.parameter.accion;
  if (accion === "historial") {
    const perfilId = (e.parameter.perfilId || "").trim();
    return respuestaJSON({ ok: true, evaluaciones: obtenerHistorial(perfilId) });
  }
  // La verificación de PIN se hace por POST (evento "verificarPin"),
  // y solo devuelve sí/no, nunca el valor.
  return ContentService.createTextOutput("Portal de Evaluaciones Mega Plast · Web App activo.");
}

function respuestaJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   GUARDAR EVALUACIÓN
   Hoja "Evaluaciones" (1 fila resumen) + "Detalle_Actividades"
   (1 fila por actividad, relacionadas por ID_Evaluacion).
   ============================================================ */

function guardarEvaluacion(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Logger.log("guardarEvaluacion: spreadsheet abierto, id=" + data.id);

  const shEval = getOrCreateSheet(ss, SHEET_EVALUACIONES, HEADERS_EVALUACIONES);
  shEval.appendRow([
    new Date(),
    data.id,
    data.proc,
    data.procNombre,
    data.evaluador,
    data.puesto,
    data.fecha,
    data.udn,
    data.periodo,
    data.tipo,
    data.total,
    data.max,
    data.pct,
    data.answered,
    data.naCount,
    data.obs,
    data.guardadoEn,
    data.perfilId || "",
    data.perfilNombre || "",
  ]);
  Logger.log("guardarEvaluacion: fila agregada en " + SHEET_EVALUACIONES);

  const detalle = data.detalle || [];
  if (detalle.length) {
    const shDet = getOrCreateSheet(ss, SHEET_DETALLE, HEADERS_DETALLE);
    const filas = detalle.map(function (item) {
      return [
        data.id,
        item.fase,
        item.n,
        item.actividad,
        item.responsable,
        item.resultado,
        item.puntaje,
        item.comentario,
        item.razonNA,
      ];
    });
    shDet.getRange(shDet.getLastRow() + 1, 1, filas.length, HEADERS_DETALLE.length).setValues(filas);
    Logger.log("guardarEvaluacion: " + filas.length + " filas agregadas en " + SHEET_DETALLE);
  }
}

/* ============================================================
   OBTENER HISTORIAL (para ver el historial en otro dispositivo)
   Junta "Evaluaciones" con "Detalle_Actividades" (por
   ID_Evaluacion) y reconstruye el mismo formato que usa el
   portal para el historial local. Si perfilId es "gerencia" o
   viene vacío, devuelve todo; para cualquier otro perfil, solo
   sus propias evaluaciones (columna Perfil_Id).
   ============================================================ */

function obtenerHistorial(perfilId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const shDet = getOrCreateSheet(ss, SHEET_DETALLE, HEADERS_DETALLE);
  const filasDet = shDet.getDataRange().getValues();
  const detallePorId = {};
  for (let i = 1; i < filasDet.length; i++) {
    const fila = filasDet[i];
    const id = fila[0];
    if (!detallePorId[id]) detallePorId[id] = [];
    detallePorId[id].push({
      fase: fila[1], n: fila[2], actividad: fila[3], responsable: fila[4],
      resultado: fila[5], puntaje: fila[6], comentario: fila[7], razonNA: fila[8],
    });
  }

  const shEval = getOrCreateSheet(ss, SHEET_EVALUACIONES, HEADERS_EVALUACIONES);
  const filasEval = shEval.getDataRange().getValues();

  const evaluaciones = [];
  for (let i = 1; i < filasEval.length; i++) {
    const fila = filasEval[i];
    const filaPerfilId = fila[17] || "";
    if (perfilId && perfilId !== "gerencia" && filaPerfilId !== perfilId) continue;

    const id = fila[1];
    const detalle = detallePorId[id] || [];
    const porFase = {};
    detalle.forEach(function (d) {
      if (!porFase[d.fase]) porFase[d.fase] = { obtenido: 0, maximo: 0 };
      if (d.puntaje !== "N/A" && d.puntaje !== "-" && d.puntaje !== "") {
        porFase[d.fase].obtenido += Number(d.puntaje);
        porFase[d.fase].maximo += 2;
      }
    });
    Object.keys(porFase).forEach(function (k) {
      porFase[k].pct = porFase[k].maximo ? Math.round(porFase[k].obtenido / porFase[k].maximo * 100) : 0;
    });

    evaluaciones.push({
      id: id,
      proc: fila[2],
      procNombre: fila[3],
      evaluador: fila[4],
      puesto: fila[5],
      fecha: fila[6],
      udn: fila[7],
      periodo: fila[8],
      tipo: fila[9],
      total: fila[10],
      max: fila[11],
      pct: fila[12],
      answered: fila[13],
      naCount: fila[14],
      obs: fila[15],
      guardadoEn: fila[16],
      perfilId: filaPerfilId,
      perfilNombre: fila[18] || "",
      porFase: porFase,
      detalle: detalle,
    });
  }

  evaluaciones.sort(function (a, b) { return (Number(b.id) || 0) - (Number(a.id) || 0); });
  return evaluaciones;
}

/* ============================================================
   GUARDAR PDF
   Decodifica el base64 recibido, lo guarda en Drive y registra
   el enlace resultante en la hoja "PDFs_Generados".
   ============================================================ */

function guardarPDF(data) {
  const carpeta = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const bytes = Utilities.base64Decode(data.base64);
  const blob = Utilities.newBlob(bytes, "application/pdf", data.filename);
  const archivo = carpeta.createFile(blob);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const shPdf = getOrCreateSheet(ss, SHEET_PDFS, HEADERS_PDFS);
  shPdf.appendRow([new Date(), data.filename, archivo.getUrl()]);
}

/* ============================================================
   PIN DE ACCESO POR PERFIL
   Hoja "Config_Perfiles": guarda el HASH (SHA-256) del PIN de
   cada perfil, nunca el PIN en claro. La verificación ocurre
   siempre en el servidor — el navegador solo recibe sí/no, y
   Gerencia puede sobrescribir (no leer) los PIN desde el portal.
   Además, tras varios intentos fallidos seguidos el perfil queda
   bloqueado unos minutos (CacheService), para que probar los
   10,000 PIN de 4 dígitos uno por uno no sea viable.
   ============================================================ */

function verificarPin(data) {
  const perfilId = data.perfilId;
  const pin = String(data.pin || "");

  if (perfilBloqueado(perfilId)) {
    return { ok: false, bloqueado: true };
  }

  const mapa = obtenerPinesHash();
  const hashEsperado = mapa[perfilId];
  const correcto = !!hashEsperado && hashEsperado === hashPin(perfilId, pin);
  registrarIntento(perfilId, correcto);

  return { ok: correcto };
}

function actualizarPines(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, SHEET_PINES, HEADERS_PINES);
  asegurarFilasPines(sh);
  const pines = data.pines || {};
  const filas = sh.getDataRange().getValues();
  Object.keys(pines).forEach(function (id) {
    const hash = hashPin(id, pines[id]);
    for (let i = 1; i < filas.length; i++) {
      if (filas[i][0] === id) {
        sh.getRange(i + 1, 3).setValue(hash);
        return;
      }
    }
  });
  Logger.log("actualizarPines: PIN actualizados (hash) para " + Object.keys(pines).join(", "));
}

// Uso interno del servidor únicamente — nunca se envía al cliente.
function obtenerPinesHash() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, SHEET_PINES, HEADERS_PINES);
  asegurarFilasPines(sh);
  const filas = sh.getDataRange().getValues();
  const mapa = {};
  for (let i = 1; i < filas.length; i++) {
    mapa[filas[i][0]] = String(filas[i][2]);
  }
  return mapa;
}

// Siembra la hoja con los PIN por defecto (ya hasheados) solo si
// está vacía (primera vez que se usa), para no pisar cambios ya
// guardados.
function asegurarFilasPines(sh) {
  if (sh.getLastRow() > 1) return;
  PERFILES_DEFAULT.forEach(function (p) {
    sh.appendRow([p.id, p.nombre, hashPin(p.id, p.pin)]);
  });
}

// SHA-256 de "idPerfil:pin" — el id como sal evita que dos perfiles
// con el mismo PIN produzcan el mismo hash guardado en la hoja.
function hashPin(perfilId, pin) {
  const crudo = perfilId + ":" + String(pin);
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, crudo, Utilities.Charset.UTF_8);
  return digest.map(function (b) {
    const v = (b + 256) % 256;
    return ("0" + v.toString(16)).slice(-2);
  }).join("");
}

/* ── Bloqueo temporal tras intentos fallidos (CacheService, self-expiring) ── */
function perfilBloqueado(perfilId) {
  const cache = CacheService.getScriptCache();
  const intentos = Number(cache.get("intentos_" + perfilId) || 0);
  return intentos >= LOCKOUT_MAX_INTENTOS;
}

function registrarIntento(perfilId, correcto) {
  const cache = CacheService.getScriptCache();
  const key = "intentos_" + perfilId;
  if (correcto) {
    cache.remove(key);
  } else {
    const intentos = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(intentos), LOCKOUT_SEGUNDOS);
  }
}

/* ============================================================
   UTILIDADES
   ============================================================ */

function getOrCreateSheet(ss, nombre, headers) {
  let sheet = ss.getSheetByName(nombre);
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Ejecutar manualmente una sola vez desde el editor de Apps Script
 * (seleccionar esta función y pulsar "Ejecutar") para crear las 4
 * hojas con sus encabezados antes del primer despliegue.
 */
function inicializarHojas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  getOrCreateSheet(ss, SHEET_EVALUACIONES, HEADERS_EVALUACIONES);
  getOrCreateSheet(ss, SHEET_DETALLE, HEADERS_DETALLE);
  getOrCreateSheet(ss, SHEET_PDFS, HEADERS_PDFS);
  asegurarFilasPines(getOrCreateSheet(ss, SHEET_PINES, HEADERS_PINES));
}

/**
 * RECUPERACIÓN DE PIN OLVIDADO (incluye Gerencia)
 * Como cambiar un PIN normalmente requiere haber iniciado sesión como
 * Gerencia, si se te olvida el PIN de Gerencia quedas sin forma de
 * entrar desde el portal. Este es el "botón de emergencia": se corre
 * directo desde aquí (Apps Script), sin pasar por el login del portal.
 *
 * Uso: cambia PERFIL_A_RESETEAR y NUEVO_PIN abajo, selecciona esta
 * función en el desplegable de "Ejecutar" (arriba del editor) y
 * pulsa Ejecutar. Revisa el registro (Ver > Registros) para
 * confirmar el mensaje de éxito.
 *
 * IDs válidos: gerencia, udn_mega, udn_reposteria, udn_temascalapa
 */
function resetearPinPerfil() {
  const PERFIL_A_RESETEAR = "gerencia";
  const NUEVO_PIN = "1111";

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, SHEET_PINES, HEADERS_PINES);
  asegurarFilasPines(sh);
  const filas = sh.getDataRange().getValues();
  for (let i = 1; i < filas.length; i++) {
    if (filas[i][0] === PERFIL_A_RESETEAR) {
      sh.getRange(i + 1, 3).setValue(hashPin(PERFIL_A_RESETEAR, NUEVO_PIN));
      Logger.log("✓ PIN de '" + PERFIL_A_RESETEAR + "' reseteado a '" + NUEVO_PIN + "'.");
      return;
    }
  }
  Logger.log("✗ No se encontró el perfil '" + PERFIL_A_RESETEAR + "'. Revisa el ID.");
}
