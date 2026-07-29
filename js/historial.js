/* ============================================================
   HISTORIAL DE EVALUACIONES
   Persistencia en localStorage + respaldo en Google Sheets,
   y renderizado / eliminación de registros guardados.
   ============================================================ */

/* ── Guardar en historial ── */
function guardarEval() {
  const { total, max, pct, answered, naCount } = calcData();
  if (answered === 0) {
    document.getElementById("save-msg").innerHTML = '<span style="color:#ef4444">Evalúa al menos una actividad antes de guardar.</span>';
    return;
  }

  // Construir detalle por paso
  const detalle = [];
  PROC.fases.forEach(function (f) { f.pasos.forEach(function (p) {
    var v = SC[p.n];
    detalle.push({
      fase: f.nombre, n: p.n, actividad: p.t, responsable: p.r,
      resultado: v === "na" ? "No aplica" : v === undefined ? "Sin evaluar" : parseInt(v) === 2 ? "Se cumple" : parseInt(v) === 1 ? "Cumple parcialmente" : "No se cumple",
      puntaje: v === "na" ? "N/A" : v === undefined ? "-" : v,
      comentario: (document.getElementById("com-" + PROC_ID + "-" + p.n) || { value: "" }).value.trim(),
      razonNA: (document.getElementById("nar-" + PROC_ID + "-" + p.n) || { value: "" }).value.trim(),
    });
  }); });

  // Puntaje por fase
  const porFase = {};
  PROC.fases.forEach(function (f) {
    let fs = 0, fm = 0;
    f.pasos.forEach(function (p) { var v = SC[p.n]; if (v !== undefined && v !== "na") { fs += parseInt(v); fm += 2; } });
    porFase[f.nombre] = { obtenido: fs, maximo: fm, pct: fm ? Math.round(fs / fm * 100) : 0 };
  });

  const registro = {
    id: Date.now(),
    proc: PROC_ID,
    procNombre: PROC.nombre,
    evaluador: document.getElementById("e-nombre").value || "—",
    puesto: document.getElementById("e-puesto").value || "—",
    fecha: document.getElementById("e-fecha").value || "—",
    udn: document.getElementById("e-udn").value || "—",
    periodo: document.getElementById("e-periodo").value || "—",
    tipo: document.getElementById("e-tipo").value || "—",
    obs: (document.getElementById("e-obs") || { value: "" }).value.trim(),
    total, max, pct, answered, naCount,
    porFase, detalle,
    guardadoEn: new Date().toISOString(),
    perfilId: PERFIL_ACTIVO ? PERFIL_ACTIVO.id : null,
    perfilNombre: PERFIL_ACTIVO ? PERFIL_ACTIVO.nombre : null,
  };

  // Guardar en localStorage (respaldo offline)
  const hist = getHist();
  hist.unshift(registro);
  localStorage.setItem(HIST_KEY, JSON.stringify(hist));
  actualizarBadgeHistorial();

  // Generar el mismo PDF que "Exportar PDF" y subirlo a Drive, sin descargarlo localmente
  generarPDF(false);

  // Enviar a Google Sheets
  const saveMsg = document.getElementById("save-msg");
  saveMsg.innerHTML = '<span style="color:#1B3F8B">⏳ Guardando en la nube...</span>';

  fetch(WEBAPP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ evento: "evaluacion" }, registro))
  })
  .then(function () {
    saveMsg.innerHTML = '<span style="color:#2A8C23;font-weight:600">✓ Guardado localmente. Enviado a Google Sheets.</span>';
    setTimeout(function () { saveMsg.textContent = ""; }, 6000);
  })
  .catch(function (err) {
    saveMsg.innerHTML = '<span style="color:#eab308;font-weight:600">⚠ Guardado local OK. Sin conexión a la nube: ' + err.message + '</span>';
    setTimeout(function () { saveMsg.textContent = ""; }, 8000);
  });
}

function getHist() { try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch { return []; } }

// Historial que le corresponde ver al perfil activo: Gerencia ve todo;
// un Encargado de UDN solo ve las evaluaciones que él mismo guardó.
// Esto es solo lo guardado EN ESTE DISPOSITIVO — para lo guardado en
// otros dispositivos ver obtenerHistorialRemoto().
function getHistVisible() {
  const hist = getHist();
  if (PERFIL_ACTIVO && PERFIL_ACTIVO.id !== "gerencia") {
    return hist.filter(function (r) { return r.perfilId === PERFIL_ACTIVO.id; });
  }
  return hist;
}

// Muestra primero el conteo local (instantáneo) y lo corrige poco
// después con el total real (local + nube), cuando llega la respuesta.
async function actualizarBadgeHistorial() {
  const local = getHistVisible();
  const badge = document.getElementById("hist-count-badge");
  badge.textContent = local.length;
  if (!PERFIL_ACTIVO) return;
  const remoto = await obtenerHistorialRemoto();
  if (!remoto.length) return;
  badge.textContent = mezclarHistorial(local, remoto).length;
}

// Trae el historial guardado en Google Sheets (incluye lo guardado
// desde otros dispositivos/perfiles). Si no hay conexión, devuelve
// una lista vacía en vez de fallar — el historial local sigue
// funcionando con normalidad sin internet.
async function obtenerHistorialRemoto() {
  if (!PERFIL_ACTIVO) return [];
  try {
    const res = await fetch(WEBAPP_URL + "?accion=historial&perfilId=" + encodeURIComponent(PERFIL_ACTIVO.id));
    const data = await res.json();
    return (data && data.evaluaciones) || [];
  } catch (err) {
    console.warn("No se pudo cargar el historial de la nube (sin conexión o error):", err);
    return [];
  }
}

// Combina el historial local con el de la nube, sin duplicar (por id).
// Si un registro existe en ambos, se prefiere la copia de la nube.
function mezclarHistorial(local, remoto) {
  const mapa = new Map();
  remoto.forEach(function (r) { mapa.set(String(r.id), r); });
  local.forEach(function (r) { if (!mapa.has(String(r.id))) mapa.set(String(r.id), r); });
  return Array.from(mapa.values()).sort(function (a, b) { return (Number(b.id) || 0) - (Number(a.id) || 0); });
}

/* ── Render del historial ── */
let HIST_COMBINADO = [];
let HIST_IDS_LOCALES = new Set();

// Gerencia filtra por Procedimiento + UDN + Fecha; un Encargado de
// UDN ya tiene su procedimiento y su UDN fijos, así que solo ve el
// filtro de Fecha.
function mostrarFiltrosHistorial() {
  const esGerencia = !!PERFIL_ACTIVO && PERFIL_ACTIVO.id === "gerencia";
  document.getElementById("fld-hist-proc").style.display = esGerencia ? "" : "none";
  document.getElementById("fld-hist-udn").style.display = esGerencia ? "" : "none";
}

function limpiarFiltrosHistorial() {
  document.getElementById("hist-filtro-proc").value = "";
  document.getElementById("hist-filtro-udn").value = "";
  document.getElementById("hist-filtro-fecha-desde").value = "";
  document.getElementById("hist-filtro-fecha-hasta").value = "";
  aplicarFiltrosHistorial();
}

function aplicarFiltrosHistorial() {
  const proc = (document.getElementById("hist-filtro-proc") || {}).value || "";
  const udn = (document.getElementById("hist-filtro-udn") || {}).value || "";
  const desde = (document.getElementById("hist-filtro-fecha-desde") || {}).value || "";
  const hasta = (document.getElementById("hist-filtro-fecha-hasta") || {}).value || "";

  const filtrado = HIST_COMBINADO.filter(function (r) {
    if (proc && r.proc !== proc) return false;
    if (udn && r.udn !== udn) return false;
    if (desde && (!r.fecha || r.fecha < desde)) return false;
    if (hasta && (!r.fecha || r.fecha > hasta)) return false;
    return true;
  });

  const totalTxt = document.getElementById("hist-count-txt");
  totalTxt.textContent = (proc || udn || desde || hasta)
    ? "Mostrando " + filtrado.length + " de " + HIST_COMBINADO.length + " evaluaciones"
    : filtrado.length + (filtrado.length === 1 ? " evaluación" : " evaluaciones");

  const cont = document.getElementById("hist-content");
  cont.innerHTML = filtrado.length
    ? pintarHistorial(filtrado, HIST_IDS_LOCALES)
    : '<div class="hist-empty">📭 No hay evaluaciones con esos filtros.</div>';
}

async function renderHistorial() {
  mostrarFiltrosHistorial();
  document.getElementById("hist-filtro-proc").value = "";
  document.getElementById("hist-filtro-udn").value = "";
  document.getElementById("hist-filtro-fecha-desde").value = "";
  document.getElementById("hist-filtro-fecha-hasta").value = "";

  const local = getHistVisible();
  HIST_IDS_LOCALES = new Set(local.map(function (r) { return String(r.id); }));
  HIST_COMBINADO = local;

  const cont = document.getElementById("hist-content");
  const totalTxt = document.getElementById("hist-count-txt");

  // Primero lo local (instantáneo, funciona sin conexión)...
  if (local.length) {
    totalTxt.textContent = local.length + (local.length === 1 ? " evaluación" : " evaluaciones");
    aplicarFiltrosHistorial();
    cont.insertAdjacentHTML("beforeend", '<div id="hist-sync-msg" style="text-align:center;font-size:11px;color:#94a3b8;padding:8px">⏳ Buscando evaluaciones de otros dispositivos...</div>');
  } else {
    totalTxt.textContent = "";
    cont.innerHTML = '<div id="hist-sync-msg" style="text-align:center;font-size:11px;color:#94a3b8;padding:20px">⏳ Buscando evaluaciones guardadas...</div>';
  }

  // ...luego se completa con lo que haya en la nube (otros dispositivos).
  const remoto = await obtenerHistorialRemoto();
  HIST_COMBINADO = mezclarHistorial(local, remoto);
  if (!HIST_COMBINADO.length) { cont.innerHTML = '<div class="hist-empty">📭 Aún no hay evaluaciones guardadas.</div>'; return; }
  aplicarFiltrosHistorial();
}

// Solo los registros guardados EN ESTE dispositivo (idsLocales) muestran
// botón de eliminar — los que solo existen en la nube no se pueden
// borrar desde aquí todavía. Se numeran en el orden mostrado (más
// reciente = #1) para poder contar cuántos hay de un vistazo.
function pintarHistorial(hist, idsLocales) {
  return hist.map(function (r, i) {
    const mc = r.pct >= 70 ? "#2A8C23" : r.pct >= 45 ? "#eab308" : "#ef4444";
    const fLocal = new Date(r.guardadoEn).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
    const faseRows = Object.entries(r.porFase || {}).map(([n, v]) => `${n}: ${v.obtenido}/${v.maximo} (${v.pct}%)`).join(" · ");
    const esLocal = idsLocales.has(String(r.id));
    return `<div class="hist-item">
      <div class="hist-item-hdr">
        <span class="hist-num">#${i + 1}</span>
        <span class="hist-proc-tag">${r.proc === "compras" ? "🛒 Compras" : "🏪 Venta"}</span>
        <span class="hist-date">Guardado: ${fLocal}</span>
      </div>
      <div class="hist-meta">
        <strong>${r.evaluador}</strong> · ${r.puesto} · ${r.udn} · ${r.periodo || r.fecha}
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">${faseRows}</div>
      <div class="hist-score">
        <span class="hist-score-num" style="color:${mc}">${r.total}/${r.max}</span>
        <span class="hist-pct" style="color:${mc}">${r.pct}%</span>
        <div class="hist-bwrap"><div class="hist-bfill" style="width:${r.pct}%;background:${mc}"></div></div>
      </div>
      ${r.obs ? `<div style="margin-top:8px;font-size:11px;color:#475569;background:#f8fafc;border-radius:6px;padding:6px 10px">${r.obs}</div>` : ""}
      <div class="hist-actions">
        ${esLocal ? `<button class="hist-del" onclick="eliminarEval(${r.id})">🗑 Eliminar</button>` : `<span style="font-size:10px;color:#94a3b8">☁ De otro dispositivo</span>`}
      </div>
    </div>`;
  }).join("");
}

function eliminarEval(id) {
  if (!confirm("¿Eliminar esta evaluación del historial?")) return;
  const hist = getHist().filter(r => r.id !== id);
  localStorage.setItem(HIST_KEY, JSON.stringify(hist));
  renderHistorial();
  actualizarBadgeHistorial();
}
