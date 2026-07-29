/* ============================================================
   PERFILES DE USUARIO
   Define los perfiles disponibles, el PIN de acceso de cada uno
   y qué procedimientos y valores precargados les corresponden.

   El PIN es solo una barrera básica en el navegador (evita entrar
   "por accidente" al perfil de alguien más) — NO es seguridad
   real: este es un proyecto 100% estático y cualquiera con acceso
   al código fuente puede leerlo, igual que ocurre con WEBAPP_URL
   en config.js. Si necesitas seguridad real, esto requeriría un
   backend con autenticación propia.
   ============================================================ */

const PERFILES = [
  {
    id: "gerencia",
    nombre: "Gerencia",
    icono: "🧭",
    pin: "1111",
    procedimientos: ["compras", "venta"],
    puestoOpciones: ["Coordinador General", "Hunter", "Evaluador", "Consultoría"],
    puestoFijo: null,
    udnDefault: null,
  },
  {
    id: "udn_mega",
    nombre: "Encargado de UDN · Mega Plast",
    icono: "🏬",
    pin: "2222",
    procedimientos: ["venta"],
    puestoOpciones: null,
    puestoFijo: "Encargado de UDN",
    udnDefault: "Mega Plast",
  },
  {
    id: "udn_reposteria",
    nombre: "Encargado de UDN · Repos-T-arte",
    icono: "🥐",
    pin: "3333",
    procedimientos: ["venta"],
    puestoOpciones: null,
    puestoFijo: "Encargado de UDN",
    udnDefault: "Repos-T-arte",
  },
  {
    id: "udn_temascalapa",
    nombre: "Encargado de UDN · Temascalapa",
    icono: "🏭",
    pin: "4444",
    procedimientos: ["venta"],
    puestoOpciones: null,
    puestoFijo: "Encargado de UDN",
    udnDefault: "Temascalapa",
  },
];

const PERFIL_KEY = "megaplast_perfil_activo_v1";

let PERFIL_ACTIVO = null;
let PERFIL_SEL_ID = null;

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

function confirmarPerfil() {
  const perfil = getPerfilPorId(PERFIL_SEL_ID);
  if (!perfil) return;
  const pin = document.getElementById("perfil-pin").value.trim();
  if (pin !== perfil.pin) {
    document.getElementById("perfil-pin-error").textContent = "PIN incorrecto.";
    document.getElementById("perfil-pin").value = "";
    document.getElementById("perfil-pin").focus();
    return;
  }
  guardarPerfilActivo(perfil.id);
  aplicarPerfilActivo(perfil.id);
  showScreen("inicio");
}

function confirmarCambioPerfil() {
  if (!confirm("¿Cambiar de perfil? Se cerrará la sesión actual.")) return;
  cerrarPerfil();
  location.reload();
}

/* ── Aplicar el perfil activo a la interfaz ── */
function aplicarPerfilActivo(id) {
  PERFIL_ACTIVO = getPerfilPorId(id);
  if (!PERFIL_ACTIVO) return;
  document.getElementById("hdr-sub").textContent = "Mega Plast Materias Primas · " + PERFIL_ACTIVO.nombre;
  document.getElementById("btn-perfil").classList.add("show");
  aplicarPerfilAProcedimientos();
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
