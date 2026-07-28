# Portal de Evaluaciones · Mega Plast

Portal web para que Mega Plast evalúe el cumplimiento de las actividades de cada rol dentro de sus procedimientos operativos (Compras y Venta en Piso). Permite calificar cada actividad, ver un resumen de resultados por etapa y por responsable, guardar evaluaciones en un historial local (con respaldo en Google Sheets/Drive) y exportar los resultados en PDF o CSV.

## Funcionalidades

- Selección del procedimiento a evaluar (**Compras** o **Venta en Piso**).
- Captura de datos generales de la evaluación (evaluador, UDN, periodo, tipo).
- Evaluación por actividad organizada en un acordeón por etapas, con escala Se cumple / Parcial / No cumple / No aplica.
- Resumen de resultados: calificación global, avance por etapa y por responsable.
- Historial de evaluaciones guardado en `localStorage`, con respaldo automático en Google Sheets vía Google Apps Script.
- Exportación de un reporte individual en **PDF** (jsPDF + AutoTable) y del historial completo en **CSV**.

## Estructura del proyecto

```
├── index.html                  # Markup semántico de la aplicación
├── assets/
│   └── logo-megaplast.png      # Logo institucional
├── css/
│   ├── base.css                # Reset y estilos raíz (html, body)
│   ├── layout.css              # Header, stepper, pantallas, tarjetas, rejillas
│   ├── components.css          # Selección de procedimiento, acordeón, pasos, resumen, historial, botones
│   └── utilities.css           # Leyenda y mensajes de estado
└── js/
    ├── config.js                # Constantes: clave de localStorage y endpoint de Apps Script
    ├── state.js                 # Estado global mutable (procedimiento activo y calificaciones)
    ├── data/
    │   └── procedimientos.js    # Definición de fases y actividades de cada procedimiento
    ├── navegacion.js            # Cambio de pantallas, stepper y reinicio de evaluación
    ├── acordeon.js               # Construcción y apertura/cierre del acordeón de actividades
    ├── scoring.js                # Registro de calificaciones por actividad
    ├── resumen.js                # Cálculo y render del resumen de resultados
    ├── historial.js              # Guardado, listado y eliminación de evaluaciones
    ├── exportCSV.js              # Exportación del historial a CSV
    ├── pdf.js                    # Generación del reporte PDF y subida a Drive
    └── main.js                   # Punto de entrada: inicialización de la interfaz
```

Los scripts se cargan como **scripts clásicos** (sin módulos ES6), en el orden de dependencias indicado en `index.html`. Cada archivo expone sus funciones en el ámbito global, que es de donde las invocan los atributos `onclick` del markup.

## Cómo ejecutarlo localmente

No requiere instalación ni build. Al usar scripts clásicos, el proyecto puede abrirse directamente:

1. Clona o descarga el repositorio.
2. Abre `index.html` con doble clic, o sírvelo con cualquier servidor estático, por ejemplo:

```bash
npx serve .
```

```bash
python -m http.server 8000
```

3. Visita la URL indicada (o abre el archivo directamente) en el navegador.

La aplicación requiere conexión a internet para:
- Cargar `jsPDF` y `jspdf-autotable` desde CDN (necesario solo al exportar PDF).
- Enviar el respaldo de cada evaluación al Web App de Google Apps Script (`WEBAPP_URL` en [js/config.js](js/config.js)). Sin conexión, el guardado local en `localStorage` sigue funcionando con normalidad.

## Notas técnicas y de mantenimiento

- El detalle de actividades por procedimiento vive en [js/data/procedimientos.js](js/data/procedimientos.js); modificar fases o actividades solo requiere editar ese archivo.
- El historial se conserva en el `localStorage` del navegador bajo la clave `megaplast_eval_hist_v1`; es un respaldo por dispositivo, independiente del respaldo en la nube.
- El `fetch` a `WEBAPP_URL` se hace con `mode:"no-cors"`, por lo que el navegador nunca deja leer si el Apps Script respondió con éxito o error; el mensaje en pantalla solo confirma que la petición se **envió**, no que el guardado remoto se completó. El respaldo confiable siempre es el `localStorage` local.

### Seguridad: `WEBAPP_URL` visible en el código fuente

`WEBAPP_URL` (en [js/config.js](js/config.js)) es la URL del Web App de Google Apps Script y queda visible en el código fuente del repositorio y de la página, ya que este es un proyecto 100% estático sin backend propio. Cualquiera con la URL puede invocar el endpoint directamente.

Esto es una limitación conocida, no corregida en este refactor porque una solución real (ocultar la URL) requiere infraestructura que este proyecto no tiene — por ejemplo:
- Restringir dentro del propio Apps Script qué operaciones acepta y validar/sanear el payload recibido, en vez de confiar en que solo el portal lo invoca.
- Colocar un backend propio (o una función serverless) entre el portal y Apps Script, que sí pueda mantener la URL en secreto.
- Rotar la URL del Web App periódicamente si se sospecha uso indebido.

Repositorio público + secreto en el cliente es una combinación a evitar: si este repo pasa a ser público en GitHub, considera migrar `WEBAPP_URL` a una variable inyectada en tiempo de build o mover la integración a un backend antes de publicarlo.
