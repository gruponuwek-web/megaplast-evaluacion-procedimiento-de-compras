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
 *     crear las 3 hojas con sus encabezados.
 *  3. Implementar > Nueva implementación > Aplicación web
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *  4. Copia la URL /exec resultante en WEBAPP_URL (js/config.js
 *     del portal).
 * ============================================================
 */

const SPREADSHEET_ID = "1rAi8bNWjBgcdX5uz7zIO0K9zY0j2izZDgiJsbzOB8cU";
const DRIVE_FOLDER_ID = "REEMPLAZAR_CON_TU_ID_DE_CARPETA_DRIVE";

const SHEET_EVALUACIONES = "Evaluaciones";
const SHEET_DETALLE = "Detalle_Actividades";
const SHEET_PDFS = "PDFs_Generados";

const HEADERS_EVALUACIONES = [
  "Marca_Temporal", "ID_Evaluacion", "Procedimiento", "Procedimiento_Nombre",
  "Evaluador", "Puesto", "Fecha_Evaluacion", "UDN", "Periodo", "Tipo_Evaluacion",
  "Puntaje_Total", "Puntaje_Maximo", "Porcentaje", "Actividades_Evaluadas",
  "Actividades_No_Aplican", "Observaciones_Generales", "Guardado_En_Cliente",
];

const HEADERS_DETALLE = [
  "ID_Evaluacion", "Fase", "Numero_Actividad", "Actividad", "Responsable",
  "Resultado", "Puntaje", "Comentario", "Razon_No_Aplica",
];

const HEADERS_PDFS = [
  "Marca_Temporal", "Nombre_Archivo", "Enlace_Drive",
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

function doGet() {
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
 * (seleccionar esta función y pulsar "Ejecutar") para crear las 3
 * hojas con sus encabezados antes del primer despliegue.
 */
function inicializarHojas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  getOrCreateSheet(ss, SHEET_EVALUACIONES, HEADERS_EVALUACIONES);
  getOrCreateSheet(ss, SHEET_DETALLE, HEADERS_DETALLE);
  getOrCreateSheet(ss, SHEET_PDFS, HEADERS_PDFS);
}
