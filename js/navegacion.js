/* ============================================================
   NAVEGACIÓN DE PANTALLAS
   Control del flujo entre inicio, datos, evaluación, resultados
   e historial, el stepper superior y el reinicio de evaluación.
   ============================================================ */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("sc-" + id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStep(s) {
  [1, 2, 3].forEach(i => {
    document.getElementById("sn" + i).className = "stp-n" + (i < s ? " done" : i === s ? " active" : "");
    document.getElementById("sl" + i).className = "stp-l" + (i < s ? " done" : i === s ? " active" : "");
  });
  document.getElementById("sla").className = "stp-line" + (s > 1 ? " done" : "");
  document.getElementById("slb").className = "stp-line" + (s > 2 ? " done" : "");
}

function showStepper(v) {
  document.getElementById("stepper").style.display = v ? "flex" : "none";
}

function selProc(id) {
  if (PERFIL_ACTIVO && !PERFIL_ACTIVO.procedimientos.includes(id)) return;
  PROC_ID = id;
  PROC = PROCS[id];
  SC = {};
  document.getElementById("hdr-title").textContent = PROC.nombre;
  document.getElementById("btn-back").classList.add("show");
  document.getElementById("datos-title").textContent = "📋 Datos · " + PROC.nombre;
  document.getElementById("eval-title").textContent = "📝 Evaluación · " + PROC.nombre;
  // Nota del procedimiento
  const notaEl = document.getElementById("nota-proc");
  if (PROC.nota) { notaEl.textContent = PROC.nota; notaEl.style.display = "block"; }
  else { notaEl.style.display = "none"; }
  buildAcordeon();
  aplicarPerfilACampos();
  showStepper(true);
  setStep(1);
  showScreen("datos");
}

function volverInicio() {
  document.getElementById("hdr-title").textContent = "Portal de Evaluaciones";
  document.getElementById("btn-back").classList.remove("show");
  showStepper(false);
  showScreen("inicio");
  actualizarBadgeHistorial();
}

function irHistorial() {
  document.getElementById("hdr-title").textContent = "Historial de evaluaciones";
  document.getElementById("btn-back").classList.add("show");
  showStepper(false);
  renderHistorial();
  showScreen("hist");
}

function irEval() {
  setStep(2);
  showScreen("eval");
}

function irA(n) {
  setStep(n);
  if (n === 1) showScreen("datos");
  if (n === 2) showScreen("eval");
  if (n === 3) { calcResumen(); showScreen("res"); }
}

/* ── Reiniciar evaluación ── */
function nuevaEval() {
  if (!confirm("¿Iniciar nueva evaluación? Se borrarán los datos actuales.")) return;
  SC = {};
  document.querySelectorAll("textarea").forEach(t => t.value = "");
  document.querySelectorAll(".paso").forEach(p => { if (p.id.startsWith("paso-" + PROC_ID)) p.className = "paso"; });
  document.querySelectorAll(".paso-sc").forEach(d => { d.textContent = "—"; d.className = "paso-sc"; });
  document.querySelectorAll(".na-reason").forEach(b => b.style.display = "none");
  document.querySelectorAll(".opc").forEach(o => o.className = "opc");
  ["e-nombre", "e-periodo"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("e-udn").value = "";
  document.getElementById("e-tipo").value = "";
  aplicarPerfilACampos();
  document.getElementById("e-fecha").valueAsDate = new Date();
  PROC.fases.forEach(f => {
    const b = document.getElementById(`badge-${f.id}`);
    if (b) b.textContent = `0 / ${f.pasos.length * 2}`;
  });
  document.getElementById("save-msg").textContent = "";
  document.getElementById("pdf-msg").textContent = "";
  irA(1);
}
