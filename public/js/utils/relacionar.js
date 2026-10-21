// ============================================================
// relacionar.js — Bloque de RELACIONAR columnas (parejas)
// (js/utils/relacionar.js) · v5: COLUMNAS EN ORDEN ALEATORIO
// (anti-copia) PERSISTENTE por navegador hasta responder (js/utils/
// aleatorio.js); antes v4: TAMAÑO en pantalla — 'columnas'
// (2 = mitad del ancho, 3 = tercio, 4 = cuarto → bloques LADO A LADO)
// o 'ancho' ("320px", "50%", 0.5…); antes v3: FÓRMULAS ($…$) e IMÁGENES
// en las listas (recursos/img/), vía js/utils/formatearFormulas.js;
// antes v2: TIPOS clase/tarea/examen, docente con intentos libres,
// espejo en Sheets
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: inserta un
// bloque con DOS columnas de elementos. El estudiante forma parejas
// haciendo clic en un elemento de cada columna y las verifica con Enviar.
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { relacionar } from "../../../js/utils/relacionar.js";
//
//   relacionar({
//     contenedor,           // elemento del DOM donde insertar el bloque
//     perfil,               // perfil del usuario (users/{uid}: uid, rol, nie?)
//     clase,                // { id, grado, materiaId, materia?, titulo? }
//     tipo: "clase",        // "clase" | "tarea" | "examen"  (defecto: "clase")
//     indicacion: "Relaciona cada figura con su área $A$.",
//     izquierda: ["img:triangulo.png", "$\\frac{1}{2}$", "El Salvador", "img:circulo.png|La rueda"],
//     derecha:   ["$b \\cdot h / 2$", "0.5", "Dólar", "$\\pi r^2$"],
//                           // ENTRE 3 Y 10 elementos cada lista
//     puntaje: 1,           // valor TOTAL del bloque (0 a 10)
//     // columnas: 2,       // NUEVO v4: el bloque ocupa LA MITAD del ancho
//     //                    //  (dos bloques en el MISMO contenedor quedan
//     //                    //  LADO A LADO; 3 = tercio, 4 = cuarto)
//     // ancho: "320px",    // NUEVO v4: ancho fijo ("50%", "18rem", 0.5…)
//     // mostrarCorrectas: true,  // SOLO examen: revela parejas al enviar
//     // id: "r1",          // (opcional) identificador único y estable
//   }).then((ganado) => { /* nota ganada en ESTE bloque (oculta) */ });
//
// FÓRMULAS (v3): cualquier elemento de las listas (y la indicación)
//   acepta LaTeX entre $…$ o $$…$$, renderizado con KaTeX por
//   js/utils/formatearFormulas.js. Sin $ se muestra como texto normal.
//
// IMÁGENES (v3): un elemento puede ser una IMAGEN guardada en
//   public/recursos/img/ — tres formas de escribirlo:
//     "img:fraccion.png"                    → recursos/img/fraccion.png
//     "fraccion.png"  (extensión de imagen) → recursos/img/fraccion.png
//     "recursos/img/fraccion.png" o una URL completa → tal cual
//   Además admite pie de foto (que también admite $fórmulas$):
//     "img:circulo.png|Un círculo de radio $r$"
//   Se pueden MEZCLAR libremente textos, fórmulas e imágenes en la
//   misma lista (las parejas siguen siendo por POSICIÓN).
//
// RELACIÓN POR POSICIÓN (regla del docente):
//   · La PRIMERA de la izquierda se relaciona con la PRIMERA de la
//     derecha, la segunda con la segunda, etc. El bloque coloca los
//     elementos ALEATORIAMENTE en su columna al mostrarse (y evita que
//     una pareja correcta caiga en la misma fila visual, para no dar
//     pistas).
//   · Si una lista tiene MÁS elementos que la otra, los que sobran son
//     DISTRACTORES: no emparejan con nadie.
//
// PUNTAJE REPARTIDO EN PARTES IGUALES (regla del docente):
//   · Cada pareja vale  puntaje ÷ número de parejas
//     (ej.: 5 parejas y puntaje 1 → cada una vale 0.2).
//
// ─── TIPO "clase" (defecto) ───
//   Dos envíos. "Enviar" exige TODAS las parejas formadas (faltan →
//   aviso, no gasta el envío).
//   · 1.er envío: las correctas suman su valor COMPLETO y quedan
//     aseguradas (verde, fijas); las incorrectas se deshacen (rojo).
//   · 2.º envío (corregir las incorrectas): valen LA MITAD cada una;
//     las que sigan mal valen 0. Al terminar se revelan TODAS las
//     parejas correctas. Se guarda el TOTAL una sola vez (si es > 0);
//     si fue 0 el bloque NO se guarda → reaparece fresco en otra sesión.
//
// ─── TIPO "tarea" ───
//   Los mismos dos envíos, pero la UI es NEUTRA: nunca dice si una
//   pareja es correcta (sin verde/rojo, no fija nada, sin cuenta de
//   aciertos). El 1.er envío es provisional (se pueden separar y volver
//   a formar parejas) y el 2.º ES EL QUE CUENTA: pareja correcta → la
//   MITAD de su valor, incorrecta → 0. Tras el 2.º envío se bloquea.
//
// ─── TIPO "examen" ───
//   SIN botón propio: el archivo del examen pone SU botón "Enviar" al
//   final y envía todos los bloques de una vez:
//
//     const p = relacionar({ ..., tipo: "examen" });
//     // ... el estudiante forma las parejas ...
//     const r = await p.enviar();  // → { puntos, maxPuntaje } del bloque
//     // ... tras todos los bloques:
//     const resumen = await finalizarExamen(perfil, clase, { titulo });
//     // resumen.puntos = nota del examen (mostrarla en pantalla)
//
//   · enviar() califica con UNA sola oportunidad: pareja correcta →
//     valor completo, incorrecta o sin formar → 0. Guarda SIEMPRE
//     (0 incluido) con la marca de examen enviado.
//   · finalizarExamen() reporta el TOTAL al Sheet UNA sola vez (fila
//     del examen × columna del NIE): el examen queda bloqueado aunque
//     cierre y abra sesión.
//   · Al cargar, si ya está enviado → el bloque aparece bloqueado
//     ("Examen enviado") y enviar() devuelve el valor guardado.
//   · No muestra cuáles están correctas. SOLO si el docente marca
//     mostrarCorrectas: true en la configuración del examen se revelan
//     las parejas correctas al enviar. La nota obtenida la muestra el
//     archivo del examen con resumen.puntos.
//
// ─── DOCENTE (perfil.rol === "docente") ───
//   Intentos ILIMITADOS y NADA se guarda: ni Firestore, ni Sheets, ni
//   localStorage de notas. El puntaje de la clase se muestra en un head
//   morado DEBAJO DE LA USERBAR (sticky, compartido con las otras
//   utils) y vive SOLO en la pestaña (sessionStorage): cerrar la app lo
//   borra.
//   · clase: las correctas quedan aseguradas y el head muestra el
//     ACUMULADO del bloque (1.er envío completo, siguientes a la mitad).
//   · tarea: cada envío re-evalúa TODAS las parejas formadas y el
//     ÚLTIMO valor manda (1.er envío completo, siguientes a la mitad).
//   · examen: enviar() re-gradable a valor completo.
//
// CÓMO SE FORMAN LAS PAREJAS:
//   · Clic en un elemento de cualquier columna y luego en uno de la otra
//     (en el orden que quieras) → se forma la pareja con un número y
//     color compartidos.
//   · Clic sobre un elemento ya emparejado → deshace la pareja.
//   · "Limpiar" deshace TODAS las parejas no aseguradas.
//   · "Enviar" exige TODAS las parejas formadas (faltan → aviso, no
//     gasta el envío). En el examen no hay botón: lo que quede sin
//     formar vale 0.
//
// QUÉ DEVUELVE — Promise<number> con lo ganado en ESTE bloque.
//   LA NOTA ES INVISIBLE: el recuadro NO muestra puntos ni los menciona.
//   · Si ya estaba respondida → 0 (no vuelve a sumar).
//   El estudiante solo ve cuántas parejas acertó y si tiene segundo envío.
//
// SUMATORIA FINAL (compartida con opcionMultiple.js, multipleOpcion.js
// y respuestaSimple.js — usan las MISMAS obtenerNota() y sumarPuntos()):
//     const nota = await obtenerNota(perfil, clase);
//     nota.puntos  // suma de TODO lo respondido (esta sesión y anteriores).
//                  //   NO le sumes el valor devuelto por relacionar():
//                  //   sería duplicado.
//
// Persistencia (estudiante): localStorage "mco_nota_{uid}_{claseId}"
//   (instantáneo) + notas/{uid}/clases/{claseId} en Firestore vía db.js
//   (fuente de verdad) + ESPEJO en Google Sheets (clase y tarea
//   re-reportan el TOTAL tras guardar; el examen lo reporta
//   finalizarExamen UNA sola vez). Cada bloque guarda su valor UNA sola
//   vez (clave: id, o slug del texto + hash).
//
// Compatibilidad: también acepta los nombres antiguos pregunta /
//   columnaA / columnaB.
//
// Compartido con las otras utils: esta utilidad re-exporta
//   obtenerNota(), sumarPuntos() y finalizarExamen() (viven en
//   opcionMultiple.js junto al head del docente y guardarPreguntaExamen),
//   para que todas las utilidades se comporten igual.
//
// Convención: CSS implícito · 100% responsivo · fondo blanco · paleta del proyecto.
// ============================================================

// REGLA DEL PROYECTO: nada toca Firestore o Sheets directo → todo pasa
// por las funciones compartidas de opcionMultiple.js (que usan db.js)
import {
  obtenerNota,
  sumarPuntos,
  finalizarExamen,
  guardarPreguntaExamen,
  esDocente,
  prepararDocente,
  registrarPuntoDocente,
  aplicarTamano,
} from "./opcionMultiple.js";

// Fórmulas: cargarFormulas() trae KaTeX (una sola vez) y
// textoConFormulas() convierte "$…$" en fórmula renderizada.
import { cargarFormulas, textoConFormulas } from "./formatearFormulas.js";

// Azar anti-copia (v5): orden aleatorio de las DOS columnas PERSISTENTE
// por navegador hasta responder el bloque (js/utils/aleatorio.js).
import {
  ordenAlAzar,
  ordenPersistente,
  guardarOrden,
  liberarOrden,
  claveOrden,
} from "./aleatorio.js";

// Comodines para el archivo de contenido (misma API que opcionMultiple.js)
export { obtenerNota, sumarPuntos, finalizarExamen } from "./opcionMultiple.js";

/* ---------------- Constantes ---------------- */

const TIPOS = ["clase", "tarea", "examen"];

// Colores de las parejas (badges): hasta 10 parejas distinguibles
const COLORES = [
  "#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626",
  "#0891b2", "#65a30d", "#db2777", "#ea580c", "#4f46e5",
];

let estilosListos = false;

/* ---------------- Helpers ---------------- */

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slug(texto) {
  return normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "x";
}

// Mini hash djb2 → evita que dos bloques distintos compartan id
function hash8(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

// Redondeo a 2 decimales (el reparto igualitario puede dar 0.2, 0.25, …)
function redondear2(n) {
  return Math.round(Number(n) * 100) / 100;
}

// Fisher-Yates sobre una copia
function mezclar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- Imágenes (v3) ----------------
   Un ítem es IMAGEN si empieza con "img:", o si termina en extensión
   de imagen (png/jpg/jpeg/gif/webp/svg/avif/bmp). Sin carpeta ni URL
   completa se busca SIEMPRE en recursos/img/ (convención del
   proyecto: rutas relativas a public/). Formato con pie de foto:
   "img:foto.png|Texto del pie (admite $fórmulas$)". */

const EXT_IMAGEN = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i;
const DIR_IMAGENES = "recursos/img/";

function esImagen(valor) {
  const v = String(valor ?? "").trim();
  if (!v || v.startsWith("img:")) return !!v;
  return EXT_IMAGEN.test(v.split("|")[0].trim());
}

function rutaImagen(valor) {
  let v = String(valor ?? "").trim().split("|")[0].trim();
  if (v.startsWith("img:")) v = v.slice(4).trim();
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("/") || v.startsWith("./") || v.startsWith("../")) return v;
  return DIR_IMAGENES + v;
}

function pieImagen(valor) {
  const partes = String(valor ?? "").split("|");
  return partes.length > 1 ? partes.slice(1).join("|").trim() : "";
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "relacionar-estilos";
  estilo.textContent = `
    /* Head del docente (compartido con opcionMultiple.js: mismas reglas
       por si esta utilidad carga sola en la página) */
    .om-head-docente {
      position: sticky;
      top: 56px;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      background: #f5f3ff;
      border-bottom: 1px solid #e9d5ff;
      padding: .45rem clamp(1rem, 4vw, 2rem);
      font-size: .84rem;
      font-weight: 700;
      color: #5b21b6;
      box-shadow: 0 2px 10px rgba(124, 58, 237, .08);
    }
    .om-head-docente-pts {
      background: #7c3aed;
      color: #ffffff;
      border-radius: 999px;
      padding: .18rem .7rem;
      font-size: .8rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .rl-caja {
      background: #ffffff;
      border: 1px solid #fbe7f1;
      border-left: 4px solid #db2777;
      border-radius: 1.1rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
    }

    .rl-cab {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .5rem;
    }
    .rl-etiqueta {
      background: rgba(219, 39, 119, .12);
      color: #db2777;
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .rl-chip {
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      white-space: nowrap;
    }
    .rl-chip.aviso { background: rgba(249, 115, 22, .14); color: #c2410c; }
    .rl-chip.bien { background: rgba(22, 163, 52, .12); color: #15803d; }
    .rl-chip.mal { background: rgba(239, 68, 68, .12); color: #b91c1c; }

    .rl-indicacion {
      margin: 0 0 .35rem;
      font-size: 1.02rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.45;
    }
    .rl-ayuda {
      margin: 0 0 .85rem;
      font-size: .84rem;
      color: #6b7280;
    }

    .rl-columnas {
      display: flex;
      gap: .6rem;
      flex-wrap: wrap;
    }
    .rl-col {
      flex: 1 1 160px;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: .55rem;
    }
    .rl-item {
      display: flex;
      align-items: center;
      gap: .55rem;
      width: 100%;
      text-align: left;
      font-family: inherit;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: .9rem;
      padding: .55rem .65rem;
      cursor: pointer;
      font-size: .9rem;
      color: #374151;
      transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
    }
    .rl-item:hover:not(:disabled) {
      border-color: #db2777;
      box-shadow: 0 4px 14px rgba(219, 39, 119, .14);
    }
    .rl-item:disabled { cursor: default; opacity: .85; }

    .rl-badge {
      flex: none;
      min-width: 22px;
      height: 22px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: .72rem;
      font-weight: 800;
      color: #ffffff;
      background: #d1d5db;
      visibility: hidden;
    }
    .rl-badge.visible { visibility: visible; }
    .rl-texto { flex: 1; min-width: 0; }

    /* Ítems con IMAGEN (v3) */
    .rl-imagen {
      display: block;
      max-width: 100%;
      max-height: 4.2rem;
      object-fit: contain;
      margin: 0 auto .25rem;
      border-radius: .4rem;
    }
    .rl-pie-foto {
      display: block;
      font-size: .78rem;
      color: #6b7280;
      text-align: center;
      line-height: 1.3;
    }
    .rl-imagen-falta {
      display: block;
      font-size: .78rem;
      color: #b91c1c;
      background: #fef2f2;
      border: 1px dashed #ef4444;
      border-radius: .4rem;
      padding: .3rem .4rem;
      text-align: center;
      word-break: break-word;
    }

    .rl-item.seleccionada { border-color: #db2777; background: rgba(219, 39, 119, .07); }
    .rl-item.pareada { background: #f9fafb; }
    .rl-item.buena { border-color: #16a34a; background: rgba(22, 163, 52, .08); }
    .rl-item.erronea {
      border-color: #ef4444;
      background: rgba(239, 68, 68, .07);
      animation: rl-shake .3s ease;
    }
    @keyframes rl-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .rl-pie {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: .85rem;
    }
    .rl-feedback { flex: 1; min-width: 0; font-size: .88rem; font-weight: 600; color: #6b7280; }
    .rl-feedback.ok { color: #16a34a; }
    .rl-feedback.aviso { color: #f97316; }
    .rl-feedback.mal { color: #ef4444; }

    .rl-enviar {
      font-family: inherit;
      background: #db2777;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .55rem 1.1rem;
      font-size: .88rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(219, 39, 119, .3);
      transition: background .15s ease, transform .15s ease;
    }
    .rl-enviar:hover:not(:disabled) { background: #be185d; }
    .rl-enviar:active:not(:disabled) { transform: scale(.98); }
    .rl-enviar:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
    }
    .rl-limpiar {
      font-family: inherit;
      background: #ffffff;
      color: #6b7280;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      padding: .5rem .9rem;
      font-size: .82rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: border-color .15s ease, color .15s ease;
    }
    .rl-limpiar:hover:not(:disabled) { border-color: #db2777; color: #db2777; }
    .rl-limpiar:disabled {
      color: #d1d5db;
      border-color: #f3f4f6;
      cursor: not-allowed;
    }

    /* Caja roja cuando el contenido llamó a la utilidad con datos inválidos */
    .rl-error-dev {
      border: 2px dashed #ef4444;
      border-left: 2px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      box-shadow: none;
    }

    @media (max-width: 767px) {
      .om-head-docente { top: 52px; padding: .4rem 1rem; }
      .rl-caja { padding: 1rem; }
      .rl-pie { flex-direction: column-reverse; align-items: stretch; }
      .rl-enviar, .rl-limpiar { justify-content: center; text-align: center; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Componente ---------------- */

/**
 * Inserta un bloque de relacionar columnas en el contenedor indicado.
 * Devuelve una Promise<number> con lo ganado en ESTE bloque (parejas
 * correctas al 1.er envío valen completo; las corregidas al 2.º, la mitad;
 * en tarea el 2.º envío es el que cuenta; en examen enviar() es una sola
 * oportunidad a valor completo). Esa nota NUNCA se muestra en pantalla:
 * queda oculta para la sumatoria final (la misma de opcionMultiple.js).
 * Con tipo "examen" la promesa trae además .enviar() →
 * Promise<{ puntos, maxPuntaje }> para el botón final del examen.
 */
export function relacionar(config = {}) {
  const {
    contenedor,
    perfil,
    clase,
    id,
    indicacion, pregunta,   // pregunta = alias (compatibilidad)
    izquierda, columnaA,    // columnaA = alias
    derecha, columnaB,      // columnaB = alias
  } = config;

  const tipo = String(config.tipo || clase?.tipo || "clase").toLowerCase().trim();
  const esTipoClase = tipo === "clase";
  const esTarea = tipo === "tarea";
  const esExamen = tipo === "examen";
  // mostrarCorrectas: SOLO examen (el docente lo marcará en la
  // configuración del examen; defecto false = nunca se revela).
  const mostrarCorrectas = !!config.mostrarCorrectas;
  // ¿Se revela la corrección? clase: siempre · tarea: nunca ·
  // examen: solo si la config del examen lo permite.
  const revelar = esTipoClase || (esExamen && mostrarCorrectas);

  // PUNTAJE OCULTO total del bloque (0 a 10). Defecto: 1 (compatibilidad v1).
  let puntaje = Number(config.puntaje ?? 1);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 10) {
    console.warn("[relacionar] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
    puntaje = 1;
  }
  puntaje = redondear2(puntaje);

  let enviarExamen = null; // se define dentro del executor (solo examen)

  const promesa = new Promise((resolve) => {
    inyectarEstilos();
    // Fórmulas: cargar KaTeX ANTES de pintar (si el CDN falla sigue
    // adelante y los textos se muestran planos).
    cargarFormulas().catch(() => null).then(() => construir(resolve));
  });

  function construir(resolve) {

    // --- Validaciones (avisos claros para quien escribe el contenido) ---
    const texto = String(indicacion ?? pregunta ?? "").trim();
    const listaIzq = (Array.isArray(izquierda) ? izquierda
      : Array.isArray(columnaA) ? columnaA : []).map((o) => String(o ?? "").trim());
    const listaDer = (Array.isArray(derecha) ? derecha
      : Array.isArray(columnaB) ? columnaB : []).map((o) => String(o ?? "").trim());

    function errorDev(mensaje) {
      console.error("[relacionar]", mensaje);
      const div = document.createElement("div");
      div.className = "rl-caja rl-error-dev";
      div.textContent = "[relacionar] " + mensaje;
      contenedor.append(div);
    }

    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[relacionar] Falta 'contenedor' (elemento del DOM donde insertar el bloque).");
      resolve(0);
      return;
    }
    if (!TIPOS.includes(tipo)) {
      errorDev(`'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
      resolve(0);
      return;
    }
    if (!texto) { errorDev("Falta la indicación del bloque."); resolve(0); return; }
    if (listaIzq.length < 3 || listaIzq.length > 10 || listaDer.length < 3 || listaDer.length > 10) {
      errorDev(`Las listas 'izquierda' y 'derecha' deben tener entre 3 y 10 elementos cada una (llegaron ${listaIzq.length} y ${listaDer.length}).`);
      resolve(0);
      return;
    }
    if (listaIzq.some((o) => !o) || listaDer.some((o) => !o)) {
      errorDev("Hay elementos vacíos (cada uno necesita texto).");
      resolve(0);
      return;
    }
    if (new Set(listaIzq).size !== listaIzq.length || new Set(listaDer).size !== listaDer.length) {
      errorDev("Hay elementos repetidos DENTRO de la misma lista (deben ser distintos para poder distinguirlos).");
      resolve(0);
      return;
    }
    if (!perfil?.uid || !clase?.id) {
      errorDev("Faltan 'perfil' (con uid) o 'clase' (con id): la nota no se puede guardar.");
      resolve(0);
      return;
    }

    const esDoc = esDocente(perfil);

    // Parejas correctas: (izquierda[i], derecha[i]) para i < k.
    // Los elementos extra de la lista más larga son distractores.
    const k = Math.min(listaIzq.length, listaDer.length);
    const valorPareja = puntaje / k;
    const qid = id ? slug(String(id)) : `${slug(texto)}-${hash8(normalizar(texto))}`;

    // --- Orden aleatorio de cada columna (Fisher-Yates), v5
    // PERSISTENTE por navegador (anti-copia): al recargar sin responder
    // sale IGUAL; respondido se libera y vuelve a sortear. El docente
    // ve un orden nuevo en cada montaje y nada se guarda. Sigue
    // evitando que una pareja correcta (i, i) caiga en la MISMA fila
    // visual: ver los dos elementos juntos daría la respuesta.
    const indices = (n) => Array.from({ length: n }, (_, i) => i);
    const claveIzq = claveOrden(qid) + "::I";
    const claveDer = claveOrden(qid) + "::D";
    const ordenIzq = esDoc
      ? mezclar(indices(listaIzq.length))
      : ordenPersistente(claveIzq, listaIzq.length);
    let ordenDer = esDoc
      ? mezclar(indices(listaDer.length))
      : ordenPersistente(claveDer, listaDer.length);
    let guardia = 0;
    const chocaEnFila = () => {
      for (let fila = 0; fila < k; fila++) {
        if (ordenIzq[fila] === ordenDer[fila] && ordenIzq[fila] < k) return true;
      }
      return false;
    };
    while (chocaEnFila() && guardia++ < 50) {
      ordenDer = mezclar(indices(listaDer.length));
      if (!esDoc) guardarOrden(claveDer, ordenDer); // la copia guardada sigue a la buena
    }

    // --- Estado ---
    let envios = 0;             // envíos ya usados en clase/tarea (0 = el próximo es el primero)
    let bloqueada = false;      // bloque terminado (resuelto, agotado, enviado o ya respondido)
    let resuelto = false;
    let yaEnviada = false;      // examen: guardado con la marca de enviado
    let ultimoResultado = null;
    let selIzq = null;          // índice original seleccionado en la izquierda
    let selDer = null;          // índice original seleccionado en la derecha
    let parejas = [];           // parejas tentativas: { i: idxIzq, j: idxDer }
    const aseguradas = new Set(); // índices i de parejas correctas (i, i) fijas
    let acumuladoExacto = 0;    // valor confirmado del bloque (exacto; se redondea al guardar)
    let logradas = 0;           // parejas correctas confirmadas
    let verificando = false;    // durante el flash rojo de las incorrectas
    let docenteCompleto = false; // docente clase: ya logró las k parejas

    const resolverUnaVez = (valor) => {
      if (!resuelto) {
        resuelto = true;
        // Respondido (o pre-marcado respondido): los órdenes guardados
        // de las dos columnas ya no hacen falta y se liberan.
        if (!esDoc) {
          liberarOrden(claveIzq);
          liberarOrden(claveDer);
        }
        resolve(valor);
      }
    };

    // --- Estructura (SIN ninguna mención al puntaje: queda oculto) ---
    const caja = document.createElement("section");
    caja.className = "rl-caja";
    caja.setAttribute("aria-label", texto);
    caja.innerHTML = `
      <div class="rl-cab">
        <span class="rl-etiqueta">${esExamen ? "Examen" : esTarea ? "Tarea" : "Relaciona"}</span>
        <span class="rl-chip"></span>
      </div>
      <p class="rl-indicacion"></p>
      <p class="rl-ayuda"></p>
      <div class="rl-columnas">
        <div class="rl-col" aria-label="Columna izquierda"></div>
        <div class="rl-col" aria-label="Columna derecha"></div>
      </div>
      <div class="rl-pie">
        <span class="rl-feedback" aria-live="polite"></span>
        <span style="display:flex; gap:.5rem; flex-wrap:wrap;">
          <button type="button" class="rl-limpiar" disabled>Limpiar</button>
          ${esExamen ? "" : '<button type="button" class="rl-enviar" disabled>Enviar</button>'}
        </span>
      </div>`;
    caja.querySelector(".rl-indicacion").innerHTML = textoConFormulas(texto);

    let ayuda = "Haz clic en un elemento de cada columna (en el orden que quieras) para formar una pareja. Clic sobre uno emparejado la deshace.";
    if (listaIzq.length !== listaDer.length) {
      ayuda += " Ojo: hay elementos que sobran y no emparejan con nadie.";
    }
    caja.querySelector(".rl-ayuda").textContent = ayuda;

    const chipEl = caja.querySelector(".rl-chip");
    const feedbackEl = caja.querySelector(".rl-feedback");
    const btnEnviar = caja.querySelector(".rl-enviar"); // null en examen
    const btnLimpiar = caja.querySelector(".rl-limpiar");
    const colIzq = caja.querySelectorAll(".rl-col")[0];
    const colDer = caja.querySelectorAll(".rl-col")[1];

    const feedback = (mensaje, tipoFeedback) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "rl-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const chip = (mensaje, tipoChip) => {
      chipEl.textContent = mensaje;
      chipEl.className = "rl-chip" + (tipoChip ? " " + tipoChip : "");
    };

    // Botones: botonesIzq[i] es el elemento i de la lista izquierda
    // (la posición en pantalla la da ordenIzq, no el índice).
    // v3: el contenido admite TEXTO con $fórmulas$ e IMÁGENES de
    // recursos/img/ (img:foto.png · foto.png · ruta completa), con
    // pie de foto opcional separado por "|".
    const crearItem = (valorItem) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rl-item";
      b.setAttribute("aria-pressed", "false");
      const badge = document.createElement("span");
      badge.className = "rl-badge";
      const t = document.createElement("span");
      t.className = "rl-texto";

      if (esImagen(valorItem)) {
        const ruta = rutaImagen(valorItem);
        const pie = pieImagen(valorItem);
        const img = document.createElement("img");
        img.className = "rl-imagen";
        img.loading = "lazy";
        img.alt = pie || ruta.split("/").pop() || "imagen";
        img.src = encodeURI(ruta);
        img.addEventListener("error", () => {
          // La imagen no existe: aviso rojo con la ruta pedida
          t.innerHTML =
            '<span class="rl-imagen-falta">Imagen no encontrada: ' +
            textoConFormulas(ruta) +
            "</span>" +
            (pie ? '<span class="rl-pie-foto">' + textoConFormulas(pie) + "</span>" : "");
        });
        t.append(img);
        if (pie) {
          const elPie = document.createElement("span");
          elPie.className = "rl-pie-foto";
          elPie.innerHTML = textoConFormulas(pie); // admite $fórmulas$
          t.append(elPie);
        }
      } else {
        t.innerHTML = textoConFormulas(valorItem); // admite $fórmulas$
      }

      b.append(badge, t);
      return b;
    };
    const botonesIzq = listaIzq.map(crearItem);
    const botonesDer = listaDer.map(crearItem);
    botonesIzq.forEach((b, i) => { b.dataset.lado = "izq"; b.dataset.idx = String(i); });
    botonesDer.forEach((b, j) => { b.dataset.lado = "der"; b.dataset.idx = String(j); });
    ordenIzq.forEach((idx) => colIzq.append(botonesIzq[idx]));
    ordenDer.forEach((idx) => colDer.append(botonesDer[idx]));

    // --- Pintar el estado (badges, colores, selecciones, disabled) ---
    function repintar() {
      const limpiar = (b) => {
        b.classList.remove("seleccionada", "pareada", "buena", "erronea");
        const badge = b.querySelector(".rl-badge");
        badge.textContent = "";
        badge.style.background = "";
        badge.classList.remove("visible");
      };
      botonesIzq.forEach(limpiar);
      botonesDer.forEach(limpiar);

      // Aseguradas primero (por índice), luego las tentativas en su orden.
      const lista = [];
      [...aseguradas].sort((a, b) => a - b).forEach((i) => lista.push({ i, j: i, fija: true }));
      parejas.forEach((p) => lista.push({ i: p.i, j: p.j, fija: false }));
      lista.forEach((p, n) => {
        const color = COLORES[n % COLORES.length];
        const num = String(n + 1);
        [
          [botonesIzq[p.i], p.i],
          [botonesDer[p.j], p.j],
        ].forEach(([b]) => {
          const badge = b.querySelector(".rl-badge");
          badge.textContent = num;
          badge.style.background = color;
          badge.classList.add("visible");
          b.classList.add("pareada");
          if (p.fija) b.classList.add("buena");
        });
      });

      if (selIzq != null) botonesIzq[selIzq].classList.add("seleccionada");
      if (selDer != null) botonesDer[selDer].classList.add("seleccionada");

      botonesIzq.forEach((b, i) => { b.disabled = bloqueada || aseguradas.has(i); });
      botonesDer.forEach((b, j) => { b.disabled = bloqueada || aseguradas.has(j); });
    }

    // --- Pie: chip y botones según el estado/tipo ---
    function actualizarPie() {
      const formadas = aseguradas.size + parejas.length;
      if (!bloqueada) {
        if (esDoc) {
          chip(
            docenteCompleto
              ? "Resuelta · vista docente"
              : envios === 0 ? "Vista docente" : `Vista docente · envío ${envios + 1}`,
            docenteCompleto ? "bien" : ""
          );
        } else if (esExamen) {
          chip("Sin enviar", "");
        } else if (envios === 0) {
          chip(`${formadas} de ${k} parejas`, "");
        } else {
          chip(esTarea ? "Envío 2 de 2" : "Intento 2 de 2", "aviso");
        }
        if (btnEnviar) btnEnviar.disabled = verificando || docenteCompleto || formadas < k;
      }
      btnLimpiar.disabled = bloqueada || verificando || parejas.length === 0;
    }

    const marcarErroneas = (malas) => {
      malas.forEach((p) => {
        botonesIzq[p.i].classList.add("erronea");
        botonesDer[p.j].classList.add("erronea");
      });
    };

    // Revela TODAS las parejas correctas (fin de clase/examen con
    // mostrarCorrectas, o bloque ya respondido).
    function revelarCorrectas() {
      for (let i = 0; i < k; i++) aseguradas.add(i);
      parejas = [];
      selIzq = null;
      selDer = null;
    }

    function bloquearTodo() {
      bloqueada = true;
      verificando = false;
      if (btnEnviar) btnEnviar.disabled = true;
      btnLimpiar.disabled = true;
      repintar();
    }

    // --- Clic en un elemento ---
    function alHacerClic(lado, idx) {
      if (bloqueada || verificando) return;
      const btn = lado === "izq" ? botonesIzq[idx] : botonesDer[idx];
      if (btn.disabled) return;

      // ¿Ya tiene pareja tentativa? → deshacerla y dejarlo seleccionado
      const pos = parejas.findIndex((p) => (lado === "izq" ? p.i === idx : p.j === idx));
      if (pos >= 0) {
        parejas.splice(pos, 1);
        if (lado === "izq") { selIzq = idx; selDer = null; }
        else { selDer = idx; selIzq = null; }
        repintar();
        actualizarPie();
        feedback("", "");
        return;
      }

      // Alternar selección (una por lado)
      if (lado === "izq") selIzq = selIzq === idx ? null : idx;
      else selDer = selDer === idx ? null : idx;

      // Una selección en cada lado → se forma la pareja
      if (selIzq != null && selDer != null) {
        parejas.push({ i: selIzq, j: selDer });
        selIzq = null;
        selDer = null;
      }

      repintar();
      actualizarPie();
      feedback("", "");
    }

    botonesIzq.forEach((b, i) => {
      b.addEventListener("click", () => alHacerClic("izq", i));
    });
    botonesDer.forEach((b, j) => {
      b.addEventListener("click", () => alHacerClic("der", j));
    });

    // Limpiar: deshace todas las parejas no aseguradas
    btnLimpiar.addEventListener("click", () => {
      if (bloqueada || verificando) return;
      parejas = [];
      selIzq = null;
      selDer = null;
      repintar();
      actualizarPie();
      feedback("", "");
    });

    // --- Fin del bloque (estudiante): guarda el TOTAL una vez ---
    function terminar(total, chipTxt, chipTipo, fbTxt, fbTipo, btnTxt, revelarAlFinal) {
      if (revelarAlFinal) revelarCorrectas();
      selIzq = null;
      selDer = null;
      bloquearTodo();
      if (btnEnviar) btnEnviar.textContent = btnTxt;
      chip(chipTxt, chipTipo);
      feedback(fbTxt, fbTipo);
      if (total > 0) sumarPuntos(perfil, clase, qid, total, { tipo }).catch(() => {});
      resolverUnaVez(total); // ← la nota solo la recibe el archivo de la clase
    }

    /* --- DOCENTE: verificación con intentos libres, head local y CERO
       guardado. clase: correctas fijas + acumulado; tarea: cada envío
       re-evalúa todo lo formado y el ÚLTIMO valor manda. --- */
    function verificarDocente() {
      const primero = envios === 0;
      const factor = primero ? 1 : 1 / 2;
      const buenas = parejas.filter((p) => p.i === p.j);
      const malas = parejas.filter((p) => p.i !== p.j);

      if (revelar) {
        buenas.forEach((p) => aseguradas.add(p.i));
        logradas += buenas.length;
        acumuladoExacto += buenas.length * valorPareja * factor;
        parejas = [];
        registrarPuntoDocente(perfil, clase, qid, redondear2(acumuladoExacto));
        resolverUnaVez(redondear2(acumuladoExacto));
        envios++;
        if (aseguradas.size === k) {
          docenteCompleto = true;
          repintar();
          actualizarPie();
          feedback("¡Todas las parejas correctas! El puntaje está arriba: nada se guarda.", "ok");
          return;
        }
        if (malas.length) {
          verificando = true;
          actualizarPie();
          marcarErroneas(malas);
          setTimeout(() => {
            verificando = false;
            repintar();
            actualizarPie();
            feedback(`Vista docente: ${logradas} de ${k} parejas. Las incorrectas se deshicieron: sigue intentando (nada se guarda).`, "aviso");
          }, 900);
        } else {
          repintar();
          actualizarPie();
          feedback(`Vista docente: ${logradas} de ${k} parejas. Sigue formando y verificando: nada se guarda.`, "aviso");
        }
        return;
      }

      // Tarea (neutra): el último valor evaluado manda en el head
      const total = redondear2(buenas.length * valorPareja * factor);
      registrarPuntoDocente(perfil, clase, qid, total);
      resolverUnaVez(total);
      envios++;
      repintar();
      actualizarPie();
      feedback("Envío realizado. Puedes separar y volver a formar parejas y verificar otra vez: nada se guarda.", "");
    }

    // --- Enviar (clase y tarea; el examen pasa por enviar()) ---
    async function procesarEnvio() {
      if (bloqueada || verificando) return;
      if (esExamen) return;

      const formadas = aseguradas.size + parejas.length;
      if (formadas < k) {
        const faltan = k - formadas;
        feedback(
          faltan === 1
            ? "Te falta 1 pareja por formar."
            : `Te faltan ${faltan} parejas por formar.`,
          "aviso"
        );
        return; // no gasta el envío
      }

      if (esDoc) {
        verificarDocente();
        return;
      }

      const buenas = parejas.filter((p) => p.i === p.j);
      const malas = parejas.filter((p) => p.i !== p.j);

      /* ESTUDIANTE · CLASE: 1.er envío completo y fijas; 2.º a la mitad */
      if (esTipoClase) {
        const primero = envios === 0;
        const factor = primero ? 1 : 1 / 2;
        buenas.forEach((p) => aseguradas.add(p.i));
        logradas += buenas.length;
        acumuladoExacto += buenas.length * valorPareja * factor;
        parejas = [];

        // Todas las parejas correctas → el bloque termina aquí
        if (aseguradas.size === k) {
          const total = redondear2(acumuladoExacto);
          if (primero) {
            terminar(total, "Resuelta", "bien", "¡Excelente! Todas las parejas son correctas.", "ok", "Respondida", true);
          } else {
            terminar(total, "Resuelta (2.º envío)", "bien", "¡Excelente en tu segundo envío! Todas las parejas son correctas.", "ok", "Respondida", true);
          }
          return;
        }

        if (!primero) {
          // 2.º envío: se acaba el bloque (con flash rojo si hubo malas)
          const total = redondear2(acumuladoExacto);
          const fin = () => {
            if (total > 0) {
              terminar(total, "Respondida (2.º envío)", "aviso", `Encontraste ${logradas} de ${k} parejas. El resto queda revelado.`, "aviso", "Respondida", true);
            } else {
              terminar(0, "Intentos agotados", "mal", "Ninguna pareja correcta. Se agotaron tus envíos: podrás volver a intentarlo en otra sesión.", "mal", "Sin más intentos", true);
            }
          };
          if (malas.length) {
            verificando = true;
            actualizarPie();
            marcarErroneas(malas);
            setTimeout(fin, 900);
          } else {
            fin();
          }
          return;
        }

        // 1.er envío con parejas incorrectas → segunda oportunidad
        envios = 1;
        btnEnviar.textContent = "Intentar de nuevo";
        if (malas.length) {
          verificando = true;
          actualizarPie();
          marcarErroneas(malas);
          setTimeout(() => {
            verificando = false;
            repintar();
            actualizarPie();
            feedback(`Encontraste ${logradas} de ${k} parejas. Se deshicieron las incorrectas: tienes un segundo envío.`, "aviso");
          }, 900);
        } else {
          repintar();
          actualizarPie();
          feedback(`Encontraste ${logradas} de ${k} parejas: tienes un segundo envío.`, "aviso");
        }
        return;
      }

      /* ESTUDIANTE · TAREA: 2 envíos neutros; el 2.º es el que cuenta */
      if (esTarea) {
        if (envios === 0) {
          envios = 1;
          actualizarPie(); // chip "Envío 2 de 2"
          btnEnviar.textContent = "Enviar de nuevo";
          feedback("Envío realizado. Puedes separar y volver a formar parejas antes del segundo envío.", "");
          return; // la respuesta final (2.º envío) decide el puntaje
        }
        const total = redondear2(buenas.length * valorPareja * (1 / 2));
        terminar(total, "Enviada", "", "Respuesta enviada. No hay más envíos.", "", "Enviada", false);
      }
    }

    if (btnEnviar) {
      btnEnviar.addEventListener("click", () => {
        procesarEnvio().catch((e) => console.error("[relacionar]", e));
      });
    }

    // --- EXAMEN: el botón lo pone el archivo del examen ---
    enviarExamen = async function () {
      if (esDoc) {
        const buenas = parejas.filter((p) => p.i === p.j);
        const total = redondear2(buenas.length * valorPareja);
        registrarPuntoDocente(perfil, clase, qid, total);
        if (revelar) {
          parejas.filter((p) => p.i !== p.j).forEach((p) => {
            botonesIzq[p.i].classList.add("erronea");
            botonesDer[p.j].classList.add("erronea");
          });
        }
        chip("Vista docente", "");
        feedback("Enviado. El puntaje está en el head de arriba; nada se guarda.", "");
        resolverUnaVez(total);
        return { puntos: total, maxPuntaje: puntaje, docente: true };
      }

      if (yaEnviada) {
        return ultimoResultado || { puntos: 0, maxPuntaje: puntaje, yaEnviado: true };
      }

      // UNA sola oportunidad: correcta → valor completo; incorrecta o
      // sin formar → 0.
      const buenas = parejas.filter((p) => p.i === p.j);
      const total = redondear2(buenas.length * valorPareja);
      if (revelar) {
        revelarCorrectas();
        repintar();
      }
      bloquearTodo();
      chip("Enviada", "");
      feedback(
        revelar
          ? "Envío del examen realizado. Las parejas correctas quedaron marcadas."
          : "Envío del examen realizado.",
        revelar ? "ok" : ""
      );
      await guardarPreguntaExamen(perfil, clase, qid, total); // guarda SIEMPRE (0 incluido)
      yaEnviada = true;
      ultimoResultado = { puntos: total, maxPuntaje: puntaje };
      resolverUnaVez(total);
      return { puntos: total, maxPuntaje: puntaje };
    };

    // --- Estado inicial por tipo y rol ---
    actualizarPie();
    if (esDoc) {
      feedback("Intentos libres, puntaje local arriba y nada se guarda.", "");
      prepararDocente(perfil, clase); // restaura el head local si ya hay puntaje
    } else if (esExamen) {
      feedback("El examen enviará todas tus respuestas al final.", "");
    } else if (esTarea) {
      feedback("Forma todas las parejas y envía. Tienes hasta dos envíos.", "");
    }

    // --- Al montar (estudiante): ¿ya respondida o examen ya enviado? ---
    if (!esDoc) {
      obtenerNota(perfil, clase).then((nota) => {
        if (resuelto || bloqueada || envios > 0 || parejas.length > 0 || selIzq != null || selDer != null) return;
        const guardado = nota.preguntas ? nota.preguntas[qid] : undefined;
        const hecha = guardado != null;

        if (esExamen && (nota.enviado || hecha)) {
          yaEnviada = true;
          ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje, yaEnviado: true };
          if (revelar) revelarCorrectas();
          bloquearTodo();
          chip("Examen enviado", "");
          feedback("Ya enviaste este examen.", "");
          resolverUnaVez(0);
          return;
        }
        if (hecha) {
          if (revelar) revelarCorrectas();
          bloquearTodo();
          if (btnEnviar) btnEnviar.textContent = "Respondida";
          chip("Respondida", "bien");
          feedback(esTarea ? "Ya enviaste esta tarea." : "Ya respondiste este bloque.", "ok");
          resolverUnaVez(0); // no vuelve a sumar
        }
      });
    }

    contenedor.append(caja);
    aplicarTamano(caja, config); // v4: columnas / ancho (tras el montaje)
  }

  if (esExamen) promesa.enviar = () => enviarExamen();
  return promesa;
}