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
  };

  // Guardar en localStorage (respaldo offline)
  const hist = getHist();
  hist.unshift(registro);
  localStorage.setItem(HIST_KEY, JSON.stringify(hist));
  actualizarBadgeHistorial();

  // Enviar a Google Sheets
  const saveMsg = document.getElementById("save-msg");
  saveMsg.innerHTML = '<span style="color:#1B3F8B">⏳ Guardando en la nube...</span>';

  fetch(WEBAPP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ tipo: "evaluacion" }, registro))
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

function actualizarBadgeHistorial() {
  document.getElementById("hist-count-badge").textContent = getHist().length;
}

/* ── Render del historial ── */
function renderHistorial() {
  const hist = getHist();
  const cont = document.getElementById("hist-content");
  if (!hist.length) { cont.innerHTML = '<div class="hist-empty">📭 Aún no hay evaluaciones guardadas.</div>'; return; }

  let h = "";
  hist.forEach(r => {
    const mc = r.pct >= 70 ? "#2A8C23" : r.pct >= 45 ? "#eab308" : "#ef4444";
    const fLocal = new Date(r.guardadoEn).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
    const faseRows = Object.entries(r.porFase || {}).map(([n, v]) => `${n}: ${v.obtenido}/${v.maximo} (${v.pct}%)`).join(" · ");
    h += `<div class="hist-item">
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
        <button class="hist-del" onclick="eliminarEval(${r.id})">🗑 Eliminar</button>
      </div>
    </div>`;
  });
  cont.innerHTML = h;
}

function eliminarEval(id) {
  if (!confirm("¿Eliminar esta evaluación del historial?")) return;
  const hist = getHist().filter(r => r.id !== id);
  localStorage.setItem(HIST_KEY, JSON.stringify(hist));
  renderHistorial();
  actualizarBadgeHistorial();
}
