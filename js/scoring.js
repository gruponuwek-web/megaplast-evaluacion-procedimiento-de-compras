/* ============================================================
   SCORING
   Registra la calificación de cada actividad y actualiza los
   indicadores visuales (puntaje, color del paso y badge de fase).
   ============================================================ */

function selOpc(n, v) {
  SC[n] = v;
  // reset opciones visuales
  ["2", "1", "0", "na"].forEach(opt => {
    const el = document.getElementById(`o-${PROC_ID}-${n}-${opt}`);
    if (el) el.className = "opc";
  });
  const sel = document.getElementById(`o-${PROC_ID}-${n}-${v}`);
  if (sel) sel.className = `opc sel-${v}`;

  const sc = document.getElementById(`psc-${PROC_ID}-${n}`);
  const paso = document.getElementById(`paso-${PROC_ID}-${n}`);
  const narW = document.getElementById(`nar-wrap-${PROC_ID}-${n}`);
  if (v === "na") {
    sc.textContent = "N/A"; sc.className = "paso-sc sna";
    paso.className = "paso cna"; narW.style.display = "block";
  } else {
    narW.style.display = "none";
    const iv = parseInt(v);
    sc.textContent = iv; sc.className = `paso-sc s${iv}`;
    paso.className = `paso c${iv}`;
  }
  // badge de fase
  PROC.fases.forEach(f => {
    if (f.pasos.some(p => p.n === n)) {
      let fs = 0, fm = 0;
      f.pasos.forEach(p => { const pv = SC[p.n]; if (pv !== undefined && pv !== "na") { fs += parseInt(pv); fm += 2; } else if (pv === undefined) { fm += 2; } });
      const b = document.getElementById(`badge-${f.id}`);
      if (b) b.textContent = `${fs} / ${fm || f.pasos.length * 2}`;
    }
  });
}
