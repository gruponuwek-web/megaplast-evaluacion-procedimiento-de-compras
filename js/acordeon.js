/* ============================================================
   ACORDEÓN DE EVALUACIÓN
   Construye dinámicamente las fases y actividades del
   procedimiento activo y controla su apertura/cierre.
   ============================================================ */

function buildAcordeon() {
  let h = "";
  PROC.fases.forEach(f => {
    const cs = `rgb(${f.rgb.join(",")})`;
    const mx = f.pasos.length * 2;
    h += `<div class="acc" id="acc-${f.id}">
      <div class="acc-hdr" onclick="toggleAcc('${f.id}')">
        <div class="acc-dot" style="background:${cs}"></div>
        <span class="acc-name">${f.nombre}</span>
        <span class="acc-badge" id="badge-${f.id}">0 / ${mx}</span>
        <span class="acc-arrow">▼</span>
      </div>
      <div class="acc-body" id="body-${f.id}">`;
    f.pasos.forEach(p => {
      h += `<div class="paso" id="paso-${PROC_ID}-${p.n}">
        <div class="paso-top">
          <div class="paso-n">${p.n}</div>
          <div class="paso-info">
            <div class="paso-titulo">${p.t}</div>
            <span class="paso-resp">${p.r}</span>
          </div>
          <div class="paso-sc" id="psc-${PROC_ID}-${p.n}">—</div>
        </div>
        <div class="opciones">
          <span class="opc" id="o-${PROC_ID}-${p.n}-2"  onclick="selOpc(${p.n},'2')">✓ Se cumple</span>
          <span class="opc" id="o-${PROC_ID}-${p.n}-1"  onclick="selOpc(${p.n},'1')">◑ Parcial</span>
          <span class="opc" id="o-${PROC_ID}-${p.n}-0"  onclick="selOpc(${p.n},'0')">✗ No cumple</span>
          <span class="opc" id="o-${PROC_ID}-${p.n}-na" onclick="selOpc(${p.n},'na')">— No aplica</span>
        </div>
        <div class="cmt">
          <textarea id="com-${PROC_ID}-${p.n}" placeholder="Comentarios u observaciones..."></textarea>
          <div class="na-reason" id="nar-wrap-${PROC_ID}-${p.n}">
            <label>Razón por la que no aplica</label>
            <textarea id="nar-${PROC_ID}-${p.n}" placeholder="Describe el motivo..."></textarea>
          </div>
        </div>
      </div>`;
    });
    h += `</div></div>`;
  });
  document.getElementById("acordeon").innerHTML = h;
}

function toggleAcc(id) {
  document.getElementById("acc-" + id).classList.toggle("open");
}
