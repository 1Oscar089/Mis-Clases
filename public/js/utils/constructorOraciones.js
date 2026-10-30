// ============================================================
// constructorOraciones.js — CONSTRUYE LA ORACIÓN (arrastra bloques)
// (js/utils/constructorOraciones.js) · v2: enviar EN TAREA guarda el
// 2.º envío SIEMPRE (0 incluido: Firebase registra la tarea respondida)
// y la reentrada de examen con valor guardado ya NO lo re-califica
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: cada
// ORACIÓN llega escrita con sus BLOQUES separados por un símbolo
// (p. ej. «El perro / corre / en el parque»). El bloque toma cada
// oración, la PARTE por el símbolo separador, MEZCLA los bloques y
// los muestra numerados: un BANCO con los bloques desordenados
// (izquierda / abajo) y un área «Tu oración» VACÍA (derecha / arriba)
// donde el estudiante los ARRASTRA y SUELTA para reconstruir la
// oración en orden (con ratón, tocando la pantalla, o tocando los
// bloques: tocar uno del banco lo coloca; tocar uno colocado lo
// devuelve). Un botón EVALUAR califica:
//
//   · 1.er intento → cada oración CORRECTA gana su parte COMPLETA
//     (el puntaje TOTAL del bloque se reparte en partes iguales entre
//     las oraciones) y queda FIJA (verde). Las INCORRECTAS se
//     RESALTAN (borde rojo + sacudida) y se permite un SEGUNDO y
//     ÚLTIMO intento SOLO para corregir esas.
//   · 2.º intento → las oraciones que se corrijan valen EXACTAMENTE
//     LA MITAD de su parte. Después el juego TERMINA: las piezas se
//     BLOQUEAN, las falladas muestran la solución y aparece el
//     MENSAJE con la NOTA FINAL obtenida en el bloque.
//
// ─── TIPOS (misma lógica del resto de utilidades) ───
//   · clase  → el juego de 2 intentos descrito arriba (nota oculta
//     para la sumatoria… PERO este bloque SÍ muestra su nota final al
//     terminar: lo pide así la actividad).
//   · tarea  → 2 envíos neutros; el 2.º envío es el que cuenta (a la
//     mitad, la misma regla de ordenar.js); nunca se revela la
//     solución; al terminar también muestra la nota del bloque.
//   · examen → SIN botón propio: el archivo del examen califica con
//     .enviar() — UNA sola oportunidad a valor completo (guarda SIEMPRE,
//     0 incluido, con guardarPreguntaExamen) y el botón final del
//     examen califica lo no enviado con el REGISTRO GLOBAL
//     (window.__mcoEnvioExamen). Al montar, si el examen ya fue
//     enviado (o el bloque ya respondido), aparece BLOQUEADO.
//   · Docente → intentos libres con los mismos factores, head local
//     arriba (registrarPuntoDocente) y CERO guardado.
//
// Puntaje y nota van por las funciones compartidas de
// opcionMultiple.js (obtenerNota, sumarPuntos, guardarPreguntaExamen,
// finalizarExamen), que usan db.js: esta utilidad NUNCA toca
// Firestore o Sheets directo. Re-exporta obtenerNota/sumarPuntos/
// finalizarExamen para el archivo de contenido (misma API que
// opcionMultiple.js).
//
// ANTI-COPIA: el desorden de los bloques de CADA oración se sortea
// con azar PERSISTENTE por navegador (js/utils/aleatorio.js): igual
// al recargar sin responder, distinto cuando ya respondió. El docente
// ve un orden nuevo en cada montaje.
//
// COLOR (REGLA DEL PROYECTO, aclarada): el color temático llega en
// config.colorTarjeta (HEX o rgb()); si falta o es inválido se usa el
// color PREDEFINIDO de esta utilidad — FIJO (#0f766e verde azulado),
// adaptado y legible; NO cambia en cada montaje. En «Crear» se elige
// con el SELECTOR RGB (input de color) sin escribir nada a mano.
//
// TEXTO: la indicación y los bloques admiten $fórmulas$ LaTeX vía
// formatearFormulas.js (el mismo motor del resto de bloques).
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { constructorOraciones } from "../../../js/utils/constructorOraciones.js";
//
//   constructorOraciones({
//     contenedor,           // elemento del DOM donde insertar el bloque
//     perfil,               // perfil del usuario (users/{uid}: uid, rol, nie?)
//     clase,                // { id, grado, materiaId, materia?, titulo? }
//     tipo: "clase",        // "clase" | "tarea" | "examen"  (defecto: "clase")
//     indicacion: "Arrastra los bloques y arma cada oración.",
//     oraciones: [          // UNA oración por elemento; los bloques van
//       "El perro / corre / en el parque",   // separados por el símbolo
//       "Mi gato / duerme / todo el día",    // separador (defecto «/»)
//     ],
//     separador: "/",       // símbolo que parte cada oración en bloques
//     puntaje: 2,           // valor TOTAL del bloque (0 a 10), repartido
//     colorTarjeta: "#0f766e", // color temático (defecto FIJO #0f766e)
//     // mostrarCorrectas: true, // SOLO examen: revela la solución al enviar
//     // columnas: 2,  // ancho en pantalla (mitad del documento)
//     // ancho: "420px",
//     // id: "or1",    // (opcional) identificador único y estable
//   }).then((ganado) => { /* nota ganada en ESTE bloque */ });
//
// Si una oración NO trae el símbolo separador, se parte por
// PALABRAS (cada palabra = un bloque) para que la actividad siempre
// funcione.
//
// Convención: CSS implícito · 100% responsivo · fondo blanco ·
// sin frameworks ni hojas externas (todo el estilo se inyecta desde
// aquí) · paleta del proyecto.
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

// Azar anti-copia: orden de los bloques PERSISTENTE por navegador
// hasta responder el bloque (js/utils/aleatorio.js).
import { ordenAlAzar, ordenPersistente, liberarOrden, claveOrden } from "./aleatorio.js";

// Comodines para el archivo de contenido (misma API que opcionMultiple.js)
export { obtenerNota, sumarPuntos, finalizarExamen } from "./opcionMultiple.js";

/* ---------------- Constantes ---------------- */

const TIPOS = ["clase", "tarea", "examen"];

/**
 * REGLA DEL PROYECTO (aclarada): el color por defecto de cada
 * util/visual es PREDEFINIDO — un color FIJO y adaptado, no uno que
 * cambie en cada montaje. Para «Construye la oración» es el verde
 * azulado #0f766e: vivo, legible con texto blanco y con buenos tonos
 * claros/oscuros derivados. En «Crear» el docente lo cambia con el
 * selector RGB (input de color) sin escribirlo a mano.
 */
export const COLOR_DEFECTO = [15, 118, 110];   // #0f766e

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

// Redondeo a 2 decimales (el reparto igualitario puede dar decimales)
function redondear2(n) {
  return Math.round(Number(n) * 100) / 100;
}

// Fisher-Yates sobre una copia (para el docente)
function mezclar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- Color (regla del proyecto: colorTarjeta) ---------------- */

function parseColor(v) {
  const s = String(v || "").trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return m[1].split("").map((c) => parseInt(c + c, 16));
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = s.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}

function tono([r, g, b], k) {
  const f = (c) =>
    Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)
      .toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}

/* ---------------- Datos ---------------- */

/**
 * Acepta la lista de oraciones como ARREGLO (una oración por elemento)
 * o como TEXTO con una oración por línea. Devuelve [{ texto }] sin
 * elementos vacíos.
 */
function normalizarOraciones(cfg) {
  const crudas = Array.isArray(cfg)
    ? cfg
    : String(cfg ?? "").split(/\r?\n/);
  const salidas = [];
  for (const cruda of crudas) {
    const texto = String(cruda ?? "").trim();
    if (texto) salidas.push({ texto });
  }
  return salidas;
}

/**
 * Parte UNA oración en bloques con el símbolo separador (p. ej. «/»).
 * Si la oración no trae el símbolo, se parte por PALABRAS para que la
 * actividad siempre funcione. Los bloques vacíos se descartan.
 */
function partirEnBloques(texto, separador) {
  const sep = String(separador || "/").trim() || "/";
  const escapado = sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let partes = String(texto ?? "")
    .split(new RegExp(escapado))
    .map((s) => s.trim())
    .filter((s) => s !== "");
  if (partes.length < 2) {
    partes = String(texto ?? "").split(/\s+/).map((s) => s.trim()).filter((s) => s !== "");
  }
  return partes;
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-constructor-oraciones-estilos";
  estilo.textContent = `
    .co-caja {
      --co-c: #0f766e;
      --co-oscuro: #0b5d57;
      --co-claro: #e7f5f3;
      --co-borde: #9bd0ca;
      --co-suave: rgba(15, 118, 110, .12);
      --co-sombra: rgba(15, 118, 110, .28);
      background: #ffffff;
      border: 1px solid #e6f0ee;
      border-left: 4px solid var(--co-c);
      border-radius: 1.1rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937;
      box-sizing: border-box;
    }
    .co-caja *, .co-caja *::before, .co-caja *::after { box-sizing: border-box; }

    .co-cab {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .5rem;
    }
    .co-etiqueta {
      background: var(--co-suave);
      color: var(--co-oscuro);
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .co-chip {
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      white-space: nowrap;
    }
    .co-chip.aviso { background: rgba(249, 115, 22, .14); color: #c2410c; }
    .co-chip.bien { background: rgba(22, 163, 52, .12); color: #15803d; }
    .co-chip.mal { background: rgba(239, 68, 68, .12); color: #b91c1c; }

    .co-indicacion {
      margin: 0 0 .35rem;
      font-size: 1.02rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.45;
    }
    .co-ayuda {
      margin: 0 0 .85rem;
      font-size: .84rem;
      color: #6b7280;
    }

    /* ── Lista de oraciones ── */
    .co-oraciones {
      display: flex;
      flex-direction: column;
      gap: .75rem;
    }
    .co-oracion {
      border: 1.5px solid var(--co-borde);
      border-radius: .9rem;
      padding: .6rem .7rem .7rem;
      background: #ffffff;
      transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
    }
    .co-oracion.asegurada {
      border-color: #16a34a;
      background: rgba(22, 163, 52, .05);
    }
    .co-oracion.erronea {
      border-color: #ef4444;
      background: rgba(239, 68, 68, .04);
      animation: co-shake .3s ease;
    }
    .co-oracion.revelada {
      border-style: dashed;
      border-color: #f59e0b;
      background: rgba(245, 158, 11, .06);
    }
    @keyframes co-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .co-oracion-cab {
      display: flex;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .5rem;
    }
    .co-num {
      flex: none;
      min-width: 22px;
      height: 22px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: .72rem;
      font-weight: 800;
      color: var(--co-oscuro);
      background: var(--co-claro);
    }
    .co-oracion-titulo {
      flex: 1;
      min-width: 0;
      font-size: .84rem;
      font-weight: 800;
      color: #374151;
    }
    .co-oracion-chip {
      font-size: .7rem;
      font-weight: 800;
      padding: .14rem .55rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #6b7280;
      white-space: nowrap;
    }
    .co-oracion-chip.bien { background: rgba(22, 163, 52, .14); color: #15803d; }
    .co-oracion-chip.mal { background: rgba(239, 68, 68, .14); color: #b91c1c; }
    .co-oracion-chip.medio { background: rgba(249, 115, 22, .14); color: #c2410c; }
    .co-oracion-chip.solucion { background: rgba(245, 158, 11, .16); color: #92400e; }

    /* ── Zonas: respuesta ARRIBA/DERECHA · banco ABAJO/IZQUIERDA ── */
    .co-zonas { display: flex; flex-direction: column; gap: .5rem; }
    @media (min-width: 700px) {
      /* ancho: banco a la IZQUIERDA y respuesta a la DERECHA */
      .co-zonas { flex-direction: row-reverse; }
      .co-lado { flex: 1 1 0; }
    }
    .co-lado { min-width: 0; display: flex; flex-direction: column; gap: .35rem; }
    .co-lado-titulo {
      margin: 0;
      font-size: .7rem;
      font-weight: 800;
      color: #6b7280;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .co-zona {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      align-content: flex-start;
      gap: .45rem;
      min-height: 3.3rem;
      padding: .4rem;
      border: 1.5px dashed #d1d5db;
      border-radius: .8rem;
      background: #fafafa;
      transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
    }
    .co-zona.sobre {
      border-color: var(--co-c);
      background: var(--co-claro);
      box-shadow: 0 0 0 3px var(--co-suave);
    }
    .co-respuesta.lleno { border-style: solid; border-color: var(--co-borde); background: #ffffff; }
    .co-oracion.asegurada .co-zona { border-style: solid; border-color: #a7d3b9; background: #ffffff; }
    .co-oracion.revelada .co-respuesta { border-style: dashed; border-color: #f2cf8a; }

    /* ── Bloques arrastrables ── */
    .co-bloque {
      font-family: inherit;
      font-size: .9rem;
      line-height: 1.35;
      color: #374151;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-bottom-width: 3px;
      border-radius: .7rem;
      padding: .42rem .7rem;
      cursor: grab;
      max-width: 100%;
      text-align: left;
      box-shadow: 0 1px 3px rgba(17, 12, 46, .07);
      transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
    }
    .co-bloque:hover:not(:disabled) {
      border-color: var(--co-c);
      box-shadow: 0 4px 12px var(--co-suave);
      transform: translateY(-1px);
    }
    .co-bloque:active:not(:disabled) { cursor: grabbing; transform: none; }
    .co-bloque:disabled { cursor: default; opacity: .95; }
    .co-bloque.arrastrando { opacity: .45; }

    /* ── Nota final (aparece al terminar el juego) ── */
    .co-final {
      margin-top: .9rem;
      border: 2px solid var(--co-c);
      border-radius: 1rem;
      background: linear-gradient(180deg, #ffffff, var(--co-claro));
      padding: .9rem 1rem 1rem;
      text-align: center;
    }
    .co-final[hidden] { display: none; }
    .co-final-titulo {
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .co-final-puntos {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.15;
      color: var(--co-oscuro);
      font-variant-numeric: tabular-nums;
    }
    .co-final-puntos span {
      font-size: .92rem;
      font-weight: 700;
      color: #6b7280;
    }
    .co-final-barra {
      height: .55rem;
      border-radius: 999px;
      background: #e5e7eb;
      overflow: hidden;
      margin: .45rem auto .5rem;
      max-width: 340px;
    }
    .co-final-barra span {
      display: block;
      height: 100%;
      width: 0;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--co-c), var(--co-oscuro));
      transition: width .8s ease;
    }
    .co-final-mensaje {
      margin: 0;
      font-size: .88rem;
      font-weight: 600;
      color: #4b5563;
    }

    /* ── Pie: feedback + botones ── */
    .co-pie {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: .85rem;
    }
    .co-feedback { flex: 1; min-width: 0; font-size: .88rem; font-weight: 600; color: #6b7280; }
    .co-feedback.ok { color: #16a34a; }
    .co-feedback.aviso { color: #f97316; }
    .co-feedback.mal { color: #ef4444; }

    .co-enviar {
      font-family: inherit;
      background: var(--co-c);
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .55rem 1.1rem;
      font-size: .88rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 18px var(--co-sombra);
      transition: filter .15s ease, transform .15s ease;
    }
    .co-enviar:hover:not(:disabled) { filter: brightness(1.08); }
    .co-enviar:active:not(:disabled) { transform: scale(.98); }
    .co-enviar:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
    }
    .co-limpiar {
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
    .co-limpiar:hover:not(:disabled) { border-color: var(--co-c); color: var(--co-oscuro); }
    .co-limpiar:disabled { color: #d1d5db; border-color: #f3f4f6; cursor: not-allowed; }

    /* Caja roja cuando el contenido llamó a la utilidad con datos inválidos */
    .co-error-dev {
      border: 2px dashed #ef4444;
      border-left: 2px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      box-shadow: none;
    }

    @media (max-width: 767px) {
      .co-caja { padding: 1rem; }
      .co-pie { flex-direction: column-reverse; align-items: stretch; }
      .co-enviar, .co-limpiar { justify-content: center; text-align: center; }
      .co-final-puntos { font-size: 1.7rem; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Componente ---------------- */

/**
 * Inserta un bloque de CONSTRUYE LA ORACIÓN en el contenedor indicado.
 * Devuelve una Promise<number> con lo ganado en ESTE bloque (oraciones
 * correctas al 1.er intento valen completo; las corregidas al 2.º, la
 * mitad; en tarea el 2.º envío es el que cuenta; en examen enviar() es
 * una sola oportunidad a valor completo). Al terminar el juego el
 * bloque MUESTRA su nota final en pantalla (lo pide la actividad).
 * Con tipo "examen" la promesa trae además .enviar() →
 * Promise<{ puntos, maxPuntaje }> para el botón final del examen.
 */
export function constructorOraciones(config = {}) {
  const { contenedor, perfil, clase, id, indicacion } = config;

  const tipo = String(config.tipo || clase?.tipo || "clase").toLowerCase().trim();
  const esTipoClase = tipo === "clase";
  const esTarea = tipo === "tarea";
  const esExamen = tipo === "examen";
  // mostrarCorrectas: SOLO examen (el docente lo marcará en la
  // configuración del examen; defecto false = nunca se revela).
  const mostrarCorrectas = !!config.mostrarCorrectas;
  // ¿Se revela la corrección? clase: al terminar el juego · tarea:
  // nunca · examen: solo si la config del examen lo permite.
  const revelar = esTipoClase || (esExamen && mostrarCorrectas);

  // PUNTAJE TOTAL del bloque (0 a 10). Defecto: 1. Se reparte en
  // partes IGUALES entre las oraciones.
  let puntaje = Number(config.puntaje ?? 1);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 10) {
    console.warn("[constructorOraciones] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
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
    const texto = String(indicacion ?? "").trim();
    const separador = String(config.separador ?? "/").trim() || "/";
    const oracionesCfg = normalizarOraciones(config.oraciones);

    function errorDev(mensaje) {
      console.error("[constructorOraciones]", mensaje);
      if (contenedor && typeof contenedor.append === "function") {
        const div = document.createElement("div");
        div.className = "co-caja co-error-dev";
        div.textContent = "[constructorOraciones] " + mensaje;
        contenedor.append(div);
      }
    }

    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[constructorOraciones] Falta 'contenedor' (elemento del DOM donde insertar el bloque).");
      resolve(0);
      return;
    }
    if (!TIPOS.includes(tipo)) {
      errorDev(`'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
      resolve(0);
      return;
    }
    if (!texto) { errorDev("Falta la indicación del bloque."); resolve(0); return; }
    if (!oracionesCfg.length) {
      errorDev("Falta la lista de oraciones (una por línea, con los bloques separados por «" + separador + "»).");
      resolve(0);
      return;
    }

    // Parte cada oración y valida que queden al menos 2 bloques
    oracionesCfg.forEach((o) => { o.bloques = partirEnBloques(o.texto, separador); });
    const malasPartes = oracionesCfg
      .map((o, i) => ({ i, n: o.bloques.length }))
      .filter((o) => o.n < 2);
    if (malasPartes.length) {
      const nums = malasPartes.map((o) => "#" + (o.i + 1)).join(", ");
      errorDev(
        `La(s) oración(es) ${nums} no se pueden partir en bloques: usa el símbolo separador «${separador}» entre las partes (o escribe la oración con varias palabras).`
      );
      resolve(0);
      return;
    }
    if (!perfil?.uid || !clase?.id) {
      errorDev("Faltan 'perfil' (con uid) o 'clase' (con id): la nota no se puede guardar.");
      resolve(0);
      return;
    }

    const esDoc = esDocente(perfil);
    const N = oracionesCfg.length;
    const valorOracion = puntaje / N; // parte IGUAL de cada oración (exacta)
    const qid = id ? slug(String(id)) : `${slug(texto)}-${hash8(normalizar(texto))}`;

    // --- Orden ALEATORIO de cada banco (anti-copia, PERSISTENTE por
    // navegador hasta responder; el docente ve uno nuevo cada vez) ---
    const clavesBanco = oracionesCfg.map((o, i) => claveOrden(qid + "-o" + i));
    oracionesCfg.forEach((o, i) => {
      o.ordenBanco = esDoc
        ? mezclar(o.bloques.map((_, k) => k))
        : ordenPersistente(clavesBanco[i], o.bloques.length);
    });

    // --- Estado ---
    let envios = 0;             // intentos ya usados en clase/tarea
    let bloqueada = false;      // juego terminado (o ya respondido)
    let resuelto = false;
    let yaEnviada = false;      // examen: guardado con la marca de enviado
    let ultimoResultado = null;
    let arrastre = null;        // bloque arrastrado (HTML5 drag & drop)
    let clicTrasArrastre = false; // ignora el clic que algunos navegadores disparan tras soltar
    let verificando = false;    // durante el flash rojo de las malas
    let docenteCompleto = false;
    // Estado por oración: bloques en la RESPUESTA (en orden de armado)
    // y en el BANCO (en su orden sorteado)
    oracionesCfg.forEach((o) => {
      o.respOrden = [];       // bloques colocados, EN ORDEN de armado
      o.bancoOrden = o.ordenBanco.slice();
      o.asegurada = false;    // correcta y FIJA (verde)
      o.estadoChip = "";      // "" | "bien" | "mal" | "medio" | "solucion"
    });
    let acumuladoExacto = 0;  // valor confirmado del bloque (exacto)
    let logradas = 0;         // oraciones correctas confirmadas

    const resolverUnaVez = (valor) => {
      if (!resuelto) {
        resuelto = true;
        // Respondido: el desorden guardado de cada banco ya no hace
        // falta y se libera para la próxima vez.
        if (!esDoc) clavesBanco.forEach((c) => liberarOrden(c));
        resolve(valor);
      }
    };

    // --- Estructura (SIN mención al puntaje: la nota final solo se
    //     revela en el mensaje final, al terminar el juego) ---
    // REGLA del proyecto: colorTarjeta HEX/rgb; VACÍO o inválido →
    // color PREDEFINIDO FIJO de esta utilidad (#0f766e, no cambia)
    const color = parseColor(config.colorTarjeta) || COLOR_DEFECTO;

    const caja = document.createElement("section");
    caja.className = "co-caja";
    caja.style.setProperty("--co-c", `rgb(${color.join(",")})`);
    caja.style.setProperty("--co-oscuro", tono(color, -0.25));
    caja.style.setProperty("--co-claro", tono(color, 0.92));
    caja.style.setProperty("--co-borde", tono(color, 0.55));
    caja.style.setProperty("--co-suave", `rgba(${color.join(",")},.12)`);
    caja.style.setProperty("--co-sombra", `rgba(${color.join(",")},.28)`);
    caja.setAttribute("aria-label", texto);
    caja.innerHTML = `
      <div class="co-cab">
        <span class="co-etiqueta">${esExamen ? "Examen" : esTarea ? "Tarea" : "Construye la oración"}</span>
        <span class="co-chip"></span>
      </div>
      <p class="co-indicacion"></p>
      <p class="co-ayuda"></p>
      <div class="co-oraciones"></div>
      <div class="co-final" hidden>
        <div class="co-final-titulo">Nota final</div>
        <div class="co-final-puntos"></div>
        <div class="co-final-barra"><span></span></div>
        <p class="co-final-mensaje"></p>
      </div>
      <div class="co-pie">
        <span class="co-feedback" aria-live="polite"></span>
        <span style="display:flex; gap:.5rem; flex-wrap:wrap;">
          <button type="button" class="co-limpiar" disabled>Limpiar</button>
          ${esExamen ? "" : '<button type="button" class="co-enviar" disabled>Evaluar</button>'}
        </span>
      </div>`;
    caja.querySelector(".co-indicacion").innerHTML = textoConFormulas(texto);

    let ayuda = "Arrastra los bloques al área «Tu oración» hasta armarla en el orden correcto (o toca un bloque del banco para colocarlo; toca uno colocado para devolverlo).";
    if (esExamen) ayuda += " El examen enviará todas tus respuestas al final.";
    if (esTarea) ayuda += " Tienes dos envíos: el segundo es el que cuenta.";
    caja.querySelector(".co-ayuda").textContent = ayuda;

    const chipEl = caja.querySelector(".co-chip");
    const feedbackEl = caja.querySelector(".co-feedback");
    const btnEvaluar = caja.querySelector(".co-enviar"); // null en examen
    const btnLimpiar = caja.querySelector(".co-limpiar");
    const elOraciones = caja.querySelector(".co-oraciones");
    const elFinal = caja.querySelector(".co-final");

    const feedback = (mensaje, tipoFeedback) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "co-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const chip = (mensaje, tipoChip) => {
      chipEl.textContent = mensaje;
      chipEl.className = "co-chip" + (tipoChip ? " " + tipoChip : "");
    };

    // --- Tarjetas de cada oración (respuesta arriba/derecha · banco
    //     abajo/izquierda; el CSS invierte el orden en pantallas anchas) ---
    const tarjetas = oracionesCfg.map((o, i) => {
      const tarjeta = document.createElement("div");
      tarjeta.className = "co-oracion";
      tarjeta.dataset.oracion = String(i);
      tarjeta.innerHTML = `
        <div class="co-oracion-cab">
          <span class="co-num">${i + 1}</span>
          <span class="co-oracion-titulo">Oración ${i + 1}</span>
          <span class="co-oracion-chip"></span>
        </div>
        <div class="co-zonas">
          <div class="co-lado co-lado-respuesta">
            <p class="co-lado-titulo">Tu oración</p>
            <div class="co-zona co-respuesta" aria-label="Área para armar la oración ${i + 1}"></div>
          </div>
          <div class="co-lado co-lado-banco">
            <p class="co-lado-titulo">Bloques desordenados</p>
            <div class="co-zona co-banco" aria-label="Bloques desordenados de la oración ${i + 1}"></div>
          </div>
        </div>`;
      const chipOracion = tarjeta.querySelector(".co-oracion-chip");
      elOraciones.append(tarjeta);
      return { tarjeta, chipOracion, respuesta: tarjeta.querySelector(".co-respuesta"), banco: tarjeta.querySelector(".co-banco") };
    });

    const chipDeOracion = (o, i) => {
      const t = tarjetas[i];
      t.chipOracion.textContent = o.estadoChip
        ? { bien: "Correcta", mal: "Revisa", medio: "A medias", solucion: "Solución" }[o.estadoChip] || ""
        : "";
      t.chipOracion.className = "co-oracion-chip" + (o.estadoChip ? " " + o.estadoChip : "");
    };

    // --- Bloques arrastrables (viven en el banco o en la respuesta) ---
    const botones = [];
    oracionesCfg.forEach((o, i) => {
      o.bloques.forEach((b, k) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "co-bloque";
        btn.draggable = true;
        btn.dataset.oracion = String(i);
        btn.dataset.bloque = String(k);
        btn.innerHTML = textoConFormulas(b);
        btn.addEventListener("dragstart", (e) => {
          if (bloqueada || verificando || btn.disabled) { e.preventDefault(); return; }
          arrastre = { i, k };
          clicTrasArrastre = true;
          try {
            e.dataTransfer.setData("text/plain", i + ":" + k);
            e.dataTransfer.effectAllowed = "move";
          } catch (err) { /* navegador sin dataTransfer */ }
          btn.classList.add("arrastrando");
        });
        btn.addEventListener("dragend", () => {
          btn.classList.remove("arrastrando");
          tarjetas.forEach((t) => {
            t.respuesta.classList.remove("sobre");
            t.banco.classList.remove("sobre");
          });
          setTimeout(() => { arrastre = null; clicTrasArrastre = false; }, 0);
        });
        btn.addEventListener("click", () => alClicBloque(i, k));
        botones.push({ i, k, btn });
      });
    });
    const botonDe = (i, k) => botones.find((b) => b.i === i && b.k === k).btn;

    // Las DOS zonas de cada oración reciben el arrastre
    tarjetas.forEach((t, i) => {
      const recibir = (zona) => (e) => {
        if (arrastre == null || bloqueada || verificando) return;
        if (arrastre.i !== i) return;          // solo su propia oración
        e.preventDefault();
        try { e.dataTransfer.dropEffect = "move"; } catch (err) { /* sin dataTransfer */ }
        zona.classList.add("sobre");
      };
      const dejarEn = (zona, aRespuesta) => (e) => {
        e.preventDefault();
        zona.classList.remove("sobre");
        if (arrastre == null || bloqueada || verificando) return;
        if (arrastre.i !== i) return;
        if (aRespuesta) colocar(arrastre.i, arrastre.k);
        else devolver(arrastre.i, arrastre.k);
        arrastre = null;
      };
      t.respuesta.addEventListener("dragover", recibir(t.respuesta));
      t.respuesta.addEventListener("dragleave", () => t.respuesta.classList.remove("sobre"));
      t.respuesta.addEventListener("drop", dejarEn(t.respuesta, true));
      t.banco.addEventListener("dragover", recibir(t.banco));
      t.banco.addEventListener("dragleave", () => t.banco.classList.remove("sobre"));
      t.banco.addEventListener("drop", dejarEn(t.banco, false));
    });

    // --- Pintar el estado (colocación, colores, disabled) ---
    function repintar() {
      oracionesCfg.forEach((o, i) => {
        const t = tarjetas[i];
        t.respuesta.innerHTML = "";
        t.banco.innerHTML = "";
        o.respOrden.forEach((k) => t.respuesta.append(botonDe(i, k)));
        o.bancoOrden.forEach((k) => t.banco.append(botonDe(i, k)));
        t.respuesta.classList.toggle("lleno", o.respOrden.length === o.bloques.length);
        t.tarjeta.classList.toggle("asegurada", o.asegurada);
        // estados de tarjeta derivados del estado: rojo = pendiente de
        // corregir (persiste hasta el próximo intento) · ámbar = solución
        t.tarjeta.classList.toggle("erronea", !o.asegurada && o.estadoChip === "mal");
        t.tarjeta.classList.toggle("revelada", !o.asegurada && o.estadoChip === "solucion");
        chipDeOracion(o, i);
      });
      botones.forEach(({ i, k, btn }) => {
        const o = oracionesCfg[i];
        const fija = o.asegurada;
        btn.classList.remove("arrastrando");
        btn.disabled = bloqueada || verificando || fija;
        btn.draggable = !btn.disabled;
      });
      btnLimpiar.disabled = bloqueada || verificando ||
        !oracionesCfg.some((o) => !o.asegurada && o.respOrden.length);
    }

    // --- Pie: chip y botón según el estado/tipo ---
    function actualizarPie() {
      const armadas = oracionesCfg.filter((o) => o.respOrden.length === o.bloques.length).length;
      if (!bloqueada) {
        if (esDoc) {
          chip(
            docenteCompleto
              ? "Resuelta · vista docente"
              : envios === 0 ? "Vista docente" : `Vista docente · intento ${envios + 1}`,
            docenteCompleto ? "bien" : ""
          );
        } else if (esExamen) {
          chip("Sin enviar", "");
        } else if (envios === 0) {
          chip(`Intento 1 de 2 · ${armadas} de ${N} armadas`, "");
        } else {
          chip(esTarea ? "Envío 2 de 2" : "Intento 2 de 2 · último", "aviso");
        }
        if (btnEvaluar) btnEvaluar.disabled = verificando || docenteCompleto || armadas < N;
      }
      btnLimpiar.disabled = bloqueada || verificando ||
        !oracionesCfg.some((o) => !o.asegurada && o.respOrden.length);
    }

    // --- Colocar / devolver (sirven para el arrastre y para el clic) ---
    function colocar(i, k) {
      if (bloqueada || verificando || i == null || k == null) return;
      const o = oracionesCfg[i];
      if (o.asegurada) return;
      if (o.respOrden.includes(k)) return;
      o.bancoOrden = o.bancoOrden.filter((x) => x !== k);
      o.respOrden.push(k);            // la oración se arma EN ORDEN de armado
      repintar();
      actualizarPie();
      feedback("", "");
    }

    function devolver(i, k) {
      if (bloqueada || verificando || i == null || k == null) return;
      const o = oracionesCfg[i];
      if (o.asegurada) return;
      if (!o.respOrden.includes(k)) return;
      o.respOrden = o.respOrden.filter((x) => x !== k);
      o.bancoOrden.push(k);
      repintar();
      actualizarPie();
      feedback("", "");
    }

    // Clic en un bloque (fallback de arrastre: ideal para pantalla táctil)
    function alClicBloque(i, k) {
      if (clicTrasArrastre) { clicTrasArrastre = false; return; }
      if (bloqueada || verificando) return;
      const btn = botonDe(i, k);
      if (btn.disabled) return;
      const o = oracionesCfg[i];
      if (o.respOrden.includes(k)) devolver(i, k);
      else colocar(i, k);
    }

    // Limpiar: devuelve al banco TODOS los bloques no asegurados
    btnLimpiar.addEventListener("click", () => {
      if (bloqueada || verificando) return;
      oracionesCfg.forEach((o) => {
        if (o.asegurada) return;
        o.bancoOrden.push(...o.respOrden);
        o.respOrden = [];
      });
      repintar();
      actualizarPie();
      feedback("", "");
    });

    // --- Evaluación: oraciones correctas e incorrectas (salta las fijas) ---
    function evaluarOraciones() {
      const buenas = [];
      const malas = [];
      oracionesCfg.forEach((o, i) => {
        if (o.asegurada) return;
        const armada = o.respOrden.map((k) => o.bloques[k]).join("\u0001");
        const correcta = o.bloques.join("\u0001");
        (armada === correcta ? buenas : malas).push(i);
      });
      return { buenas, malas };
    }

    // Revela la SOLUCIÓN de las oraciones no resueltas (fin de clase o
    // bloque ya respondido; en examen solo si mostrarCorrectas).
    function revelarCorrectas() {
      oracionesCfg.forEach((o, i) => {
        if (o.asegurada) return;
        o.respOrden = o.bloques.map((_, k) => k);
        o.bancoOrden = [];
        o.estadoChip = "solucion";
      });
    }

    function bloquearTodo() {
      bloqueada = true;
      verificando = false;
      if (btnEvaluar) btnEvaluar.disabled = true;
      btnLimpiar.disabled = true;
      repintar();
    }

    // --- MENSAJE con la NOTA FINAL (lo pide la actividad) ---
    function mostrarNotaFinal(total) {
      if (!elFinal) return;
      elFinal.hidden = false;
      const pct = puntaje > 0 ? Math.round((total / puntaje) * 100) : 0;
      elFinal.querySelector(".co-final-puntos").innerHTML =
        `${redondear2(total)} <span>de ${puntaje} ${puntaje === 1 ? "punto" : "puntos"}</span>`;
      elFinal.querySelector(".co-final-barra span").style.width = pct + "%";
      const mensaje =
        pct >= 100 ? "¡Perfecto! Todo correcto al primer intento."
        : pct >= 90 ? "¡Excelente trabajo!"
        : pct >= 60 ? "¡Bien! Lo corregido al segundo intento contó la mitad."
        : pct >= 40 ? "Puedes mejorar: repasa las oraciones falladas."
        : "A seguir practicando: revisa la solución y vuelve a intentarlo.";
      elFinal.querySelector(".co-final-mensaje").textContent = mensaje;
    }

    // --- Fin del bloque (estudiante): guarda el TOTAL una vez ---
    function terminar(total, chipTxt, chipTipo, fbTxt, fbTipo, btnTxt, revelarAlFinal) {
      if (revelarAlFinal) revelarCorrectas();
      bloquearTodo();
      if (btnEvaluar) btnEvaluar.textContent = btnTxt;
      chip(chipTxt, chipTipo);
      feedback(fbTxt, fbTipo);
      if (!esDoc && (esTipoClase || esTarea)) mostrarNotaFinal(total);
      // v2 — CLASE: total 0 no se guarda (reintentable en otra sesión).
      // TAREA: el 2.º envío es EL que cuenta → se guarda SIEMPRE (0 incluido).
      if (total > 0 || esTarea) sumarPuntos(perfil, clase, qid, total, { tipo }).catch(() => {});
      resolverUnaVez(total); // ← la nota solo la recibe el archivo de la clase
    }

    /* --- DOCENTE: verificación con intentos libres, head local y CERO
       guardado. Las incorrectas vuelven al banco para volver a armar. --- */
    function verificarDocente() {
      const primero = envios === 0;
      const factor = primero ? 1 : 1 / 2;
      const { buenas, malas } = evaluarOraciones();

      buenas.forEach((i) => {
        const o = oracionesCfg[i];
        o.asegurada = true;
        o.estadoChip = "bien";
      });
      logradas += buenas.length;
      acumuladoExacto += buenas.length * valorOracion * factor;
      malas.forEach((i) => {
        const o = oracionesCfg[i];
        o.bancoOrden.push(...o.respOrden);
        o.respOrden = [];
        o.estadoChip = "";
      });
      registrarPuntoDocente(perfil, clase, qid, redondear2(acumuladoExacto));
      resolverUnaVez(redondear2(acumuladoExacto));
      envios++;

      if (oracionesCfg.every((o) => o.asegurada)) {
        docenteCompleto = true;
        repintar();
        actualizarPie();
        feedback("¡Todas las oraciones correctas! El puntaje está arriba: nada se guarda.", "ok");
        return;
      }
      const finFlash = () => {
        verificando = false;
        repintar();
        actualizarPie();
        feedback(`Vista docente: ${logradas} de ${N}. Las incorrectas volvieron al banco: sigue armando (nada se guarda).`, "aviso");
      };
      if (malas.length) {
        verificando = true;
        actualizarPie();
        malas.forEach((i) => tarjetas[i].tarjeta.classList.add("erronea"));
        setTimeout(finFlash, 900);
      } else {
        repintar();
        actualizarPie();
        feedback(`Vista docente: ${logradas} de ${N}. Sigue armando y verificando: nada se guarda.`, "aviso");
      }
    }

    // --- Evaluar (clase y tarea; el examen pasa por enviar()) ---
    async function procesarEvaluar() {
      if (bloqueada || verificando) return;
      if (esExamen) return;

      const incompletas = oracionesCfg.filter((o) => o.respOrden.length < o.bloques.length);
      if (incompletas.length) {
        const nums = incompletas.map((o) => "#" + (oracionesCfg.indexOf(o) + 1)).join(", ");
        feedback(
          incompletas.length === 1
            ? `Te faltan bloques por colocar en la oración ${nums}.`
            : `Te faltan bloques por colocar en las oraciones ${nums}.`,
          "aviso"
        );
        return; // no gasta el intento
      }

      if (esDoc) {
        verificarDocente();
        return;
      }

      const { buenas, malas } = evaluarOraciones();

      /* ESTUDIANTE · CLASE: 1.er intento completo y fijo; 2.º a la mitad */
      if (esTipoClase) {
        const primero = envios === 0;
        const factor = primero ? 1 : 1 / 2;
        buenas.forEach((i) => {
          const o = oracionesCfg[i];
          o.asegurada = true;
          o.estadoChip = primero ? "bien" : "medio";
        });
        logradas += buenas.length;
        acumuladoExacto += buenas.length * valorOracion * factor;
        malas.forEach((i) => { oracionesCfg[i].estadoChip = "mal"; });

        // Todas correctas → el juego termina aquí
        if (oracionesCfg.every((o) => o.asegurada)) {
          const total = redondear2(acumuladoExacto);
          terminar(
            total,
            primero ? "Resuelta" : "Resuelta (2.º intento)",
            "bien",
            primero
              ? "¡Excelente! Todas las oraciones están correctas."
              : "¡Excelente en tu segundo intento! Todo quedó correcto.",
            "ok",
            "Respondida",
            false
          );
          return;
        }

        if (!primero) {
          // 2.º intento: se acaba el juego (las falladas muestran la solución)
          const total = redondear2(acumuladoExacto);
          const fin = () => {
            if (total > 0) {
              terminar(total, "Terminada", "aviso", `Armaste bien ${logradas} de ${N} oraciones. Las demás muestran la solución.`, "aviso", "Respondida", true);
            } else {
              terminar(0, "Intentos agotados", "mal", "Ninguna oración quedó correcta. Se agotaron tus intentos: revisa la solución.", "mal", "Sin más intentos", true);
            }
          };
          if (malas.length) {
            verificando = true;
            actualizarPie();
            malas.forEach((i) => tarjetas[i].tarjeta.classList.add("erronea"));
            setTimeout(fin, 900);
          } else {
            fin();
          }
          return;
        }

        // 1.er intento con oraciones incorrectas → segundo y último intento
        envios = 1;
        btnEvaluar.textContent = "Evaluar (último intento)";
        const finFlash = () => {
          verificando = false;
          repintar();
          actualizarPie();
          feedback(`Correctas: ${logradas} de ${N}. Tienes UN segundo intento solo para las marcadas en rojo (valdrán la mitad).`, "aviso");
        };
        if (malas.length) {
          verificando = true;
          actualizarPie();
          malas.forEach((i) => tarjetas[i].tarjeta.classList.add("erronea"));
          setTimeout(finFlash, 900);
        } else {
          repintar();
          actualizarPie();
          feedback(`Correctas: ${logradas} de ${N}. Tienes UN segundo intento solo para las marcadas (valdrán la mitad).`, "aviso");
        }
        return;
      }

      /* ESTUDIANTE · TAREA: 2 envíos neutros; el 2.º es el que cuenta */
      if (esTarea) {
        if (envios === 0) {
          envios = 1;
          actualizarPie(); // chip "Envío 2 de 2"
          btnEvaluar.textContent = "Enviar de nuevo";
          feedback("Envío realizado. Puedes corregir tus oraciones antes del segundo envío.", "");
          return; // la respuesta final (2.º envío) decide el puntaje
        }
        const total = redondear2(buenas.length * valorOracion * (1 / 2));
        terminar(total, "Enviada", "", "Respuesta enviada. No hay más envíos.", "", "Enviada", false);
      }
    }

    if (btnEvaluar) {
      btnEvaluar.addEventListener("click", () => {
        procesarEvaluar().catch((e) => console.error("[constructorOraciones]", e));
      });
    }

    // --- EXAMEN: el botón lo pone el archivo del examen ---
    enviarExamen = async function () {
      if (esDoc) {
        const { buenas, malas } = evaluarOraciones();
        const total = redondear2(buenas.length * valorOracion);
        if (revelar) malas.forEach((i) => tarjetas[i].tarjeta.classList.add("erronea"));
        registrarPuntoDocente(perfil, clase, qid, total);
        chip("Vista docente", "");
        feedback("Enviado. El puntaje está en el head de arriba; nada se guarda.", "");
        resolverUnaVez(total);
        return { puntos: total, maxPuntaje: puntaje, docente: true };
      }

      if (yaEnviada) {
        return ultimoResultado || { puntos: 0, maxPuntaje: puntaje, yaEnviado: true };
      }

      // UNA sola oportunidad: oración correcta → valor completo;
      // incorrecta o incompleta → 0.
      const { buenas } = evaluarOraciones();
      const total = redondear2(buenas.length * valorOracion);
      if (revelar) {
        revelarCorrectas();
        repintar();
      }
      bloquearTodo();
      chip("Enviada", "");
      feedback(
        revelar
          ? "Envío del examen realizado. Las oraciones correctas quedaron marcadas."
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
    repintar();
    actualizarPie();
    if (esDoc) {
      feedback("Intentos libres, puntaje local arriba y nada se guarda.", "");
      prepararDocente(perfil, clase); // restaura el head local si ya hay puntaje
    } else if (esExamen) {
      feedback("Arma las oraciones: el examen enviará todas tus respuestas al final.", "");
    } else if (esTarea) {
      feedback("Arma las oraciones y envía. Tienes hasta dos envíos.", "");
    } else {
      feedback("Arma todas las oraciones y pulsa Evaluar. Tienes dos intentos: el segundo solo corrige las marcadas.", "");
    }

    // --- Al montar (estudiante): ¿ya respondida o examen ya enviado? ---
    if (!esDoc) {
      obtenerNota(perfil, clase).then((nota) => {
        if (resuelto || bloqueada || envios > 0 ||
            oracionesCfg.some((o) => o.respOrden.length || o.bancoOrden.length !== o.ordenBanco.length)) return;
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
          if (btnEvaluar) btnEvaluar.textContent = "Respondida";
          chip("Respondida", "bien");
          feedback(esTarea ? "Ya enviaste esta tarea." : "Ya respondiste este bloque.", "ok");
          // v2 — en examen con el valor ya guardado (sin examen cerrado),
          // el recorrido del envío final NO re-califica ni pisa el valor.
          if (esExamen) {
            yaEnviada = true;
            ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje };
          }
          resolverUnaVez(0); // no vuelve a sumar
        }
      });
    }

    // REGISTRO GLOBAL DE ENVÍO (window.__mcoEnvioExamen): el botón
    // final del examen (utils/botonEnviar.js) o el «Enviar examen» de
    // siempre califican aquí las respuestas que el estudiante NO envió
    // una a una. Clave = qid: si el bloque se remonta, la última
    // instancia reemplaza a la vieja (nunca se califica dos veces).
    try {
      const reg = (window.__mcoEnvioExamen = window.__mcoEnvioExamen || { mapa: {} });
      if (reg.mapa && typeof reg.mapa === "object") {
        reg.mapa[qid] = () => Promise.resolve(enviarExamen()).catch(() => null);
      }
    } catch (e) { /* sin window: el flujo manual sigue igual */ }

    contenedor.append(caja);
    aplicarTamano(caja, config); // columnas / ancho (tras el montaje)
  }

  if (esExamen) promesa.enviar = () => enviarExamen();
  return promesa;
}