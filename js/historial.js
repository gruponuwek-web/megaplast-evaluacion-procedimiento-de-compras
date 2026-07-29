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

function actualizarBadgeHistorial() {
  document.getElementById("hist-count-badge").textContent = getHistVisible().length;
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
async function renderHistorial() {
  const local = getHistVisible();
  const idsLocales = new Set(local.map(function (r) { return String(r.id); }));
  const cont = document.getElementById("hist-content");

  // Primero lo local (instantáneo, funciona sin conexión)...
  cont.innerHTML = local.length
    ? pintarHistorial(local, idsLocales) + '<div id="hist-sync-msg" style="text-align:center;font-size:11px;color:#94a3b8;padding:8px">⏳ Buscando evaluaciones de otros dispositivos...</div>'
    : '<div id="hist-sync-msg" style="text-align:center;font-size:11px;color:#94a3b8;padding:20px">⏳ Buscando evaluaciones guardadas...</div>';

  // ...luego se completa con lo que haya en la nube (otros dispositivos).
  const remoto = await obtenerHistorialRemoto();
  const combinado = mezclarHistorial(local, remoto);
  if (!combinado.length) { cont.innerHTML = '<div class="hist-empty">📭 Aún no hay evaluaciones guardadas.</div>'; return; }
  cont.innerHTML = pintarHistorial(combinado, idsLocales);
}

// Solo los registros guardados EN ESTE dispositivo (idsLocales) muestran
// botón de eliminar — los que solo existen en la nube no se pueden
// borrar desde aquí todavía.
function pintarHistorial(hist, idsLocales) {
  return hist.map(function (r) {
    const mc = r.pct >= 70 ? "#2A8C23" : r.pct >= 45 ? "#eab308" : "#ef4444";
    const fLocal = new Date(r.guardadoEn).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
    const faseRows = Object.entries(r.porFase || {}).map(([n, v]) => `${n}: ${v.obtenido}/${v.maximo} (${v.pct}%)`).join(" · ");
    const esLocal = idsLocales.has(String(r.id));
    return `<div class="hist-item">
      <div class="hist-item-hdr">
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
