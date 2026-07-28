/* ============================================================
   DATOS DE PROCEDIMIENTOS
   Definición de las fases y actividades de cada procedimiento
   evaluable. Estructura consumida por acordeon.js, scoring.js,
   resumen.js, historial.js y pdf.js.
   ============================================================ */

const PROCS = {

  compras: {
    nombre: "Procedimiento de Compras",
    nota: null,
    fases: [
      { id:"c1", nombre:"Identificación de faltantes", rgb:[91,79,191], pasos:[
        {n:1,  t:"Identificar faltantes de productos",                                        r:"Encargado de UDN"},
        {n:2,  t:"Registrar productos faltantes en solicitud de compra",                      r:"Encargado de UDN"},
        {n:3,  t:"Validar existencias en piso, almacén y sistema, revisando última entrega",  r:"Encargado de UDN"},
        {n:4,  t:"Enviar a AyF la Solicitud de Compra en los días autorizados",               r:"Encargado de UDN"},
      ]},
      { id:"c2", nombre:"Gestión de orden de compra", rgb:[42,140,35], pasos:[
        {n:5,  t:"Validar información de la solicitud priorizando por tipo de producto",      r:"Administración y Finanzas"},
        {n:6,  t:"Generar Orden de Compra",                                                   r:"Administración y Finanzas"},
        {n:7,  t:"Enviar solicitud al Coordinador General para su autorización",              r:"Administración y Finanzas"},
        {n:8,  t:"¿Se autoriza la Orden de Compra?",                                         r:"Coordinador General"},
        {n:9,  t:"Realizar ajustes solicitados por el Coordinador General",                   r:"Administración y Finanzas"},
        {n:10, t:"Compartir versión final de OC a AyF",                                      r:"Coordinador General"},
        {n:11, t:"Imprimir y entregar OC impresa a Compras",                                  r:"Administración y Finanzas"},
      ]},
      { id:"c3", nombre:"Compra a proveedores", rgb:[27,63,139], pasos:[
        {n:12, t:"Visitar proveedores y comprar de acuerdo con las rutas establecidas",       r:"Compras"},
        {n:13, t:"Trasladar mercancía a las UDNs",                                            r:"Compras"},
        {n:14, t:"Descargar mercancía en la UDN correspondiente",                             r:"Compras"},
      ]},
      { id:"c4", nombre:"Recepción de mercancía", rgb:[61,182,53], pasos:[
        {n:15, t:"Recibir mercancía cotejando con OC impresa",                                r:"Almacén / Encargado de UDN"},
        {n:16, t:"Colocar nombre y firma de recibido, observaciones e incidencias",           r:"Almacén / Encargado de UDN"},
        {n:17, t:"Acomodar mercancía en almacén conforme al layout (PEPS)",                   r:"Almacén / Encargado de UDN"},
        {n:18, t:"Ingresar mercancía al sistema con base en cantidades de la OC verificadas", r:"Compras"},
        {n:19, t:"Entregar órdenes de compra firmadas a Administración y Finanzas",           r:"Compras"},
      ]},
    ]
  },

  venta: {
    nombre: "Procedimiento de Venta en Piso",
    nota: "⚠ Nota: en las unidades Repos-T-arte y Temascalapa deberán omitirse (marcar como No aplica) las actividades 14, 15, 16, 20 y 21.",
    fases: [
      { id:"v1", nombre:"Recepción de cliente", rgb:[234,88,12], pasos:[
        {n:1,  t:"Llegar al establecimiento",                                                 r:"Cliente"},
        {n:2,  t:"Dirigirse con vendedor disponible",                                         r:"Cliente"},
        {n:3,  t:"Saludar y dar bienvenida al cliente",                                       r:"Vendedor"},
        {n:4,  t:"Preguntar si ya está registrado en sistema",                                r:"Vendedor"},
        {n:5,  t:"¿El cliente está registrado?",                                              r:"Vendedor"},
        {n:6,  t:"Registrar a cliente en sistema (si no está registrado)",                    r:"Vendedor"},
        {n:7,  t:"Solicitar número de cliente o nombre y capturarlo en sistema",              r:"Vendedor"},
        {n:8,  t:"Consultar qué es lo que desea comprar",                                     r:"Vendedor"},
      ]},
      { id:"v2", nombre:"Cotización y Picking", rgb:[124,58,237], pasos:[
        {n:9,  t:"Verificar disponibilidad de los productos solicitados",                     r:"Vendedor / Almacén"},
        {n:10, t:"Cotizar productos en sistema",                                              r:"Vendedor"},
        {n:11, t:"Recopilar productos",                                                       r:"Vendedor / Almacén"},
        {n:12, t:"Guardar cotización en sistema",                                             r:"Vendedor"},
        {n:13, t:"Proporcionar al cliente el folio de la cotización por escrito",             r:"Vendedor"},
      ]},
      { id:"v3", nombre:"Cobro", rgb:[6,148,162], pasos:[
        {n:14, t:"Dirigirse a caja para realizar pago",                                       r:"Cliente"},
        {n:15, t:"Solicitar al cliente el folio de cotización o nombre",                      r:"Caja"},
        {n:16, t:"Buscar cotización por folio o nombre del cliente",                          r:"Caja"},
        {n:17, t:"Cobrar indicando métodos de pago",                                          r:"Caja"},
        {n:18, t:"Cerrar cuenta en sistema",                                                  r:"Caja"},
        {n:19, t:"Entregar ticket a cliente",                                                 r:"Caja"},
      ]},
      { id:"v4", nombre:"Entrega", rgb:[5,150,105], pasos:[
        {n:20, t:"Pasar a zona de picking para recoger pedido con ticket",                    r:"Cliente"},
        {n:21, t:"Cotejar ticket de compra con pedido",                                       r:"Vendedor / Almacén"},
        {n:22, t:"Sellar ticket de compra",                                                   r:"Vendedor / Almacén"},
        {n:23, t:"Entregar pedido",                                                           r:"Vendedor / Almacén"},
        {n:24, t:"Remover cotización del sistema",                                            r:"Vendedor / Almacén"},
      ]},
    ]
  }
};
