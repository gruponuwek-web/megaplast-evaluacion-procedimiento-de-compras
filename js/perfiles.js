/* ============================================================
   PERFILES DE USUARIO
   Define los perfiles disponibles y qué procedimientos y valores
   precargados les corresponden. El PIN de cada perfil NO vive
   aquí ni en ningún otro archivo del cliente: se verifica en el
   servidor (Apps Script), que solo responde sí/no — ver
   verificarPinRemoto() más abajo y verificarPin() en Code.gs.
   ============================================================ */

const PERFILES = [
  {
    id: "gerencia",
    nombre: "Gerencia",
    icono: "🧭",
    procedimientos: ["compras", "venta"],
    puestoOpciones: ["Coordinador General", "Hunter", "Evaluador", "Consultoría"],
    puestoFijo: null,
    udnDefault: null,
  },
  {
    id: "udn_mega",
    nombre: "Encargado de UDN · Mega Plast",
    icono: "🏬",
    procedimientos: ["venta"],
    puestoOpciones: null,
    puestoFijo: "Encargado de UDN",
    udnDefault: "Mega Plast",
  },
  {
    id: "udn_reposteria",
    nombre: "Encargado de UDN · Repos-T-arte",
    icono: "🥐",
    procedimientos: ["venta"],
    puestoOpciones: null,
    puestoFijo: "Encargado de UDN",
    udnDefault: "Repos-T-arte",
  },
  {
    id: "udn_temascalapa",
    nombre: "Encargado de UDN · Temascalapa",
    icono: "🏭",
    procedimientos: ["venta"],
    puestoOpciones: null,
    puestoFijo: "Encargado de UDN",
    udnDefault: "Temascalapa",
  },
];

const PERFIL_KEY = "megaplast_perfil_activo_v1";

let PERFIL_ACTIVO = null;
let PERFIL_SEL_ID = null;

/* ── Verificación de PIN contra el servidor ──
   Requiere conexión: el PIN nunca se compara en el navegador. Una
   vez iniciada sesión, el perfil se recuerda en este dispositivo
   (localStorage) y el resto de la app sigue funcionando sin
   conexión como siempre — solo el login en sí necesita internet. */
async function verificarPinRemoto(perfilId, pin) {
  const res = await fetch(WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ evento: "verificarPin", perfilId: perfilId, pin: pin }),
  });
  return res.json();
}

function getPerfilPorId(id) {
  return PERFILES.find(function (p) { return p.id === id; }) || null;
}

function cargarPerfilGuardado() {
  const id = localStorage.getItem(PERFIL_KEY);
  return id ? getPerfilPorId(id) : null;
}

function guardarPerfilActivo(id) {
  localStorage.setItem(PERFIL_KEY, id);
}

function cerrarPerfil() {
  localStorage.removeItem(PERFIL_KEY);
  PERFIL_ACTIVO = null;
}

/* ── Pantalla de selección de perfil ── */
function renderPerfilGrid() {
  const cont = document.getElementById("perfil-grid");
  cont.innerHTML = PERFILES.map(function (p) {
    return '<div class="proc-card perfil-card" id="perfil-card-' + p.id + '" onclick="seleccionarPerfil(\'' + p.id + '\')">' +
      '<div class="proc-icon">' + p.icono + '</div>' +
      '<div class="proc-name">' + p.nombre + '</div>' +
      '</div>';
  }).join("");
}

function seleccionarPerfil(id) {
  PERFIL_SEL_ID = id;
  document.querySelectorAll(".perfil-card").forEach(function (c) { c.classList.remove("sel"); });
  document.getElementById("perfil-card-" + id).classList.add("sel");
  document.getElementById("perfil-pin-error").textContent = "";
  const pin = document.getElementById("perfil-pin");
  pin.value = "";
  document.getElementById("perfil-pin-wrap").style.display = "block";
  pin.focus();
}

function cancelarSeleccionPerfil() {
  PERFIL_SEL_ID = null;
  document.querySelectorAll(".perfil-card").forEach(function (c) { c.classList.remove("sel"); });
  document.getElementById("perfil-pin-wrap").style.display = "none";
}

async function confirmarPerfil() {
  const perfil = getPerfilPorId(PERFIL_SEL_ID);
  if (!perfil) return;
  const pin = document.getElementById("perfil-pin").value.trim();
  const errorEl = document.getElementById("perfil-pin-error");
  const btn = document.querySelector("#perfil-pin-wrap .btn-blue");
  const textoOriginal = btn.textContent;
  btn.textContent = "⏳ Verificando..."; btn.disabled = true;

  let resultado;
  try {
    resultado = await verificarPinRemoto(perfil.id, pin);
  } catch (err) {
    errorEl.textContent = "Sin conexión: no se pudo verificar el PIN. Intenta de nuevo con internet.";
    btn.textContent = textoOriginal; btn.disabled = false;
    return;
  }
  btn.textContent = textoOriginal; btn.disabled = false;

  if (resultado && resultado.bloqueado) {
    errorEl.textContent = "Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.";
    document.getElementById("perfil-pin").value = "";
    return;
  }
  if (!resultado || !resultado.ok) {
    errorEl.textContent = "PIN incorrecto.";
    document.getElementById("perfil-pin").value = "";
    document.getElementById("perfil-pin").focus();
    return;
  }

  guardarPerfilActivo(perfil.id);
  aplicarPerfilActivo(perfil.id);
  showScreen("inicio");
}

function confirmarCambioPerfil() {
  cerrarPerfil();
  location.reload();
}

/* ── Aplicar el perfil activo a la interfaz ── */
function aplicarPerfilActivo(id) {
  PERFIL_ACTIVO = getPerfilPorId(id);
  if (!PERFIL_ACTIVO) return;
  document.getElementById("hdr-sub").textContent = "Mega Plast Materias Primas · " + PERFIL_ACTIVO.nombre;
  document.getElementById("btn-perfil").classList.add("show");
  document.getElementById("card-gestion-pines").style.display = PERFIL_ACTIVO.id === "gerencia" ? "" : "none";
  aplicarPerfilAProcedimientos();
  actualizarBadgeHistorial();
}

function aplicarPerfilAProcedimientos() {
  if (!PERFIL_ACTIVO) return;
  const permitidos = PERFIL_ACTIVO.procedimientos;
  document.getElementById("proc-compras").style.display = permitidos.includes("compras") ? "" : "none";
  document.getElementById("proc-venta").style.display = permitidos.includes("venta") ? "" : "none";
}

/* ── Aplicar el perfil activo a los campos de "Datos" ── */
function renderCampoPuesto(perfil) {
  const cont = document.getElementById("fld-puesto");
  if (perfil.puestoOpciones) {
    cont.innerHTML = '<label for="e-puesto">Puesto / Rol</label><select id="e-puesto">' +
      '<option value="">Seleccionar...</option>' +
      perfil.puestoOpciones.map(function (o) { return "<option>" + o + "</option>"; }).join("") +
      "</select>";
  } else {
    cont.innerHTML = '<label for="e-puesto">Puesto / Rol</label>' +
      '<input type="text" id="e-puesto" value="' + (perfil.puestoFijo || "") + '" disabled>';
  }
}

function aplicarPerfilACampos() {
  if (!PERFIL_ACTIVO) return;
  renderCampoPuesto(PERFIL_ACTIVO);
  if (PERFIL_ACTIVO.udnDefault) document.getElementById("e-udn").value = PERFIL_ACTIVO.udnDefault;
}

/* ── Punto de entrada: perfil guardado vs. pantalla de login ── */
function iniciarSesion() {
  const perfil = cargarPerfilGuardado();
  if (perfil) {
    aplicarPerfilActivo(perfil.id);
    showScreen("inicio");
  } else {
    renderPerfilGrid();
    showScreen("login");
  }
}

/* ── Gestión de PIN (solo Gerencia) ──
   Los campos siempre empiezan vacíos: el servidor nunca devuelve
   el PIN vigente, así que no hay nada que precargar. Gerencia solo
   escribe el PIN nuevo de los perfiles que quiera cambiar y deja
   el resto en blanco. */
function irGestionPines() {
  renderPinesForm();
  showScreen("pines");
}

function renderPinesForm() {
  const cont = document.getElementById("pines-form");
  cont.innerHTML = PERFILES.map(function (p) {
    return '<div class="fld" style="margin-bottom:12px">' +
      '<label for="pin-edit-' + p.id + '">' + p.nombre + '</label>' +
      '<input type="text" inputmode="numeric" maxlength="6" id="pin-edit-' + p.id + '" placeholder="Nuevo PIN (dejar vacío para no cambiar)">' +
      '</div>';
  }).join("");
}

async function guardarPinesDesdeForm() {
  const msg = document.getElementById("pines-msg");
  const mapa = {};
  PERFILES.forEach(function (p) {
    const val = document.getElementById("pin-edit-" + p.id).value.trim();
    if (val) mapa[p.id] = val;
  });
  if (!Object.keys(mapa).length) {
    msg.innerHTML = '<span style="color:#eab308;font-weight:600">No escribiste ningún PIN nuevo.</span>';
    setTimeout(function () { msg.textContent = ""; }, 4000);
    return;
  }
  msg.innerHTML = '<span style="color:#1B3F8B">⏳ Guardando en la nube...</span>';
  try {
    await fetch(WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento: "actualizarPines", pines: mapa }),
    });
    msg.innerHTML = '<span style="color:#2A8C23;font-weight:600">✓ PIN actualizados y enviados a la nube.</span>';
    renderPinesForm();
  } catch (err) {
    msg.innerHTML = '<span style="color:#eab308;font-weight:600">⚠ Sin conexión a la nube: ' + err.message + '</span>';
  }
  setTimeout(function () { msg.textContent = ""; }, 6000);
}
