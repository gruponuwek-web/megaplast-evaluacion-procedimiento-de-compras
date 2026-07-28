/* ============================================================
   RESUMEN DE RESULTADOS
   Cálculo de totales y renderizado de KPIs, avance por fase
   y avance por responsable en la pantalla de resultados.
   ============================================================ */

function calcData() {
  let total = 0, max = 0, answered = 0, naCount = 0;
  PROC.fases.forEach(f => f.pasos.forEach(p => {
    const v = SC[p.n];
    if (v === "na") { naCount++; }
    else if (v !== undefined) { total += parseInt(v); max += 2; answered++; }
    else { max += 2; }
  }));
  const pct = max > 0 ? Math.round(total / max * 100) : 0;
  return { total, max, answered, naCount, pct };
}

function calcResumen() {
  const { total, max, answered, naCount, pct } = calcData();
  const mc = pct >= 70 ? "#2A8C23" : pct >= 45 ? "#eab308" : "#ef4444";

  document.getElementById("r-tot").textContent = answered > 0 ? total : "—";
  document.getElementById("r-max").textContent = answered > 0 ? ` / ${max}` : "";
  document.getElementById("r-pct").textContent = answered > 0
    ? `${pct}% · ${answered} evaluadas${naCount ? `, ${naCount} N/A` : ""}` : "Sin datos";
  const b = document.getElementById("r-bar");
  b.style.width = (answered > 0 ? pct : 0) + "%"; b.style.background = answered > 0 ? mc : "#e2e8f0";

  let fh = "";
  PROC.fases.forEach(f => {
    let fs = 0, fm = 0;
    f.pasos.forEach(p => { const v = SC[p.n]; if (v !== undefined && v !== "na") { fs += parseInt(v); fm += 2; } });
    const fp = fm > 0 ? Math.round(fs / fm * 100) : 0;
    const fc = fp >= 70 ? "#2A8C23" : fp >= 45 ? "#eab308" : "#ef4444";
    fh += `<div class="fase-row">
      <div class="fase-dot" style="background:rgb(${f.rgb.join(",")})"></div>
      <span class="fase-nm">${f.nombre}</span>
      <div class="fbwrap"><div class="fbfill" style="width:${fp}%;background:rgb(${f.rgb.join(",")})"></div></div>
      <span class="fase-val" style="color:${fc}">${fs}/${fm || "—"}</span>
    </div>`;
  });
  document.getElementById("r-fases").innerHTML = fh;

  const rm = {};
  PROC.fases.flatMap(f => f.pasos).forEach(p => {
    if (!rm[p.r]) rm[p.r] = { t: 0, m: 0 };
    const v = SC[p.n];
    if (v !== undefined && v !== "na") { rm[p.r].t += parseInt(v); rm[p.r].m += 2; }
    else if (v === undefined) { rm[p.r].m += 2; }
  });
  let rh = "";
  Object.entries(rm).sort((a, b) => (a[1].m ? a[1].t / a[1].m : 1) - (b[1].m ? b[1].t / b[1].m : 1)).forEach(([r, v]) => {
    const rp = v.m ? Math.round(v.t / v.m * 100) : 0;
    const rc = rp >= 70 ? "#2A8C23" : rp >= 45 ? "#eab308" : "#ef4444";
    rh += `<div>
      <div class="resp-top"><span>${r}</span><span style="font-weight:700;color:${rc}">${v.t}/${v.m}</span></div>
      <div class="resp-bwrap"><div class="resp-bfill" style="width:${rp}%;background:${rc}"></div></div>
    </div>`;
  });
  document.getElementById("r-resps").innerHTML = rh;
}
