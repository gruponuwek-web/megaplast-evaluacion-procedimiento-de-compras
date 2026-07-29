/* ============================================================
   INIT
   Punto de entrada: se ejecuta al cargar el script (los demás
   archivos ya definieron sus funciones globales en el scope
   de window, por lo que basta con inicializar el estado inicial
   de la interfaz).
   ============================================================ */

document.getElementById("e-fecha").valueAsDate = new Date();
iniciarSesion();
