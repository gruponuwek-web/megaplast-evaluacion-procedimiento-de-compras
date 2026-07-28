/* ============================================================
   ESTADO GLOBAL DE LA APLICACIÓN
   Variables mutables compartidas entre los distintos scripts.
   ============================================================ */

let PROC_ID = null;  // "compras" | "venta"
let PROC    = null;  // objeto del procedimiento activo (de PROCS)
let SC      = {};    // scores por actividad: { [n]: "2" | "1" | "0" | "na" }
