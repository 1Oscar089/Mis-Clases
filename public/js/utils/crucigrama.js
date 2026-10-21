// ============================================================
// crucigrama.js — CRUCIGRAMA jugable con nota al completarlo
// (js/utils/crucigrama.js) · v1
// ============================================================
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: recibe una
// lista de PALABRAS CON SU PISTA (clave), genera un crucigrama DISTINTO
// PARA CADA ESTUDIANTE y, al completar TODAS las palabras, guarda la
// nota igual que cualquier bloque de pregunta.
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/3/ciencias/mi-clase.js):
//
//   import { crucigrama } from "../../../js/utils/crucigrama.js";
//
//   crucigrama({
//     contenedor,            // elemento del DOM donde insertarlo
//     perfil,                // perfil del usuario (users/{uid}: uid, rol)
//     clase,                 // { id, grado, materiaId, materia?, titulo? }
//     palabras: [            // entre 2 y 12 palabras, CADA una con su pista
//       { palabra: "ELEFANTE", pista: "El animal terrestre más grande" },
//       { palabra: "GATO",     pista: "Maúlla y ronronea" },
//       // también acepta: ["GATO", "Maúlla y ronronea"]
//     ],
//     puntaje: 2,            // valor del bloque (0 a 10): se gana COMPLETO
//     // ancho: 560,         // ancho en PX (o "320px", "50%", fracción 0.5)
//     // columnas: 2,        // como en las otras utils (mitad del ancho)
//     // id: "cru-1",        // (opcional) identificador único y estable
//     // tipo: "clase",      // "clase" | "tarea" | "examen" (defecto "clase")
//   }).then((ganado) => { /* nota ganada en ESTE bloque (oculta) */ });
//
// CÓMO SE GENERA
//   · El programa decide SOLO cómo colocar cada palabra: HORIZONTAL (se
//     lee →) o VERTICAL (se lee ↓), siempre CRUZADAS con otra palabra
//     por una letra común (como un crucigrama de verdad). Si una palabra
//     no puede cruzarse con ninguna, se coloca como "isla" aparte.
//   · TILDES y ESPACIOS se quitan solos (MÉXICO queda MEXICO). La Ñ SE
//     CONSERVA (NIÑO lleva su Ñ y se escribe con la tecla Ñ del teclado).
//   · La cuadrícula sale lo más CUADRADA posible: el ANCHO dado manda y
//     el alto se adapta a las palabras (con casillas cuadradas).
//   · Números: cada palabra recibe un NÚMERO según dónde EMPIEZA (orden
//     de lectura); el número sale en la casilla inicial y en su pista.
//
// CÓMO SE JUEGA
//   · El estudiante TOCA una casilla y escribe UNA letra por casilla con
//     el teclado de la pantalla (o el físico). Tocar otra casilla mueve
//     la escritura; si una casilla pertenece a DOS palabras (cruce), se
//     toca OTRA VEZ para cambiar entre horizontal y vertical. ⌫ borra.
//   · Al llenarse una palabra se comprueba: en CLASE queda verde fija si
//     es correcta o destello rojo si no (se puede corregir, sin
//     castigo) y en TAREA lo mismo con mensajes neutros. En EXAMEN nada
//     se revela mientras escribe: solo al completar TODO se avisa
//     "Lista para enviar".
//   · GANA AL COMPLETAR TODAS las palabras: ahí se guarda la nota.
//
// ANTI-COPIA PERSISTENTE (js/utils/aleatorio.js):
//   la SEMILLA del crucigrama se guarda en localStorage mientras no se
//   complete → si el estudiante recarga (o cierra y abre el navegador),
//   sale EL MISMO crucigrama. Al completarlo la semilla se libera: la
//   próxima vez se genera OTRO distinto. NINGÚN niño recibe el mismo.
//
// NOTA (igual que las preguntas y que sopaLetras):
//   · Se guarda UNA sola vez, al COMPLETAR TODO: puntaje completo
//     (localStorage mco_nota_{uid}_{claseId} + Firestore vía db.js +
//     espejo en Sheets). Si nunca lo termina no se guarda nada.
//   · LA NOTA ES INVISIBLE: el recuadro NO muestra puntos.
//   · tipo "tarea": mensajes neutros (no dice qué palabra falló).
//   · tipo "examen": NO guarda al completarse — espera el botón "Enviar"
//     del examen (promesa.enviar() → { puntos, maxPuntaje }); si se
//     envía incompleto guarda 0, como los demás bloques. El examen NO
//     revela si las palabras van bien (a menos que el contenido decida
//     mostrarlo por su cuenta).
//   · Docente (perfil.rol === "docente"): intentos libres, puntaje
//     local en el head morado y NADA se guarda.
//
// SUMATORIA FINAL de la sesión (también oculta):
//   const nota = await obtenerNota(perfil, clase);
//   nota.puntos  // NO le sumes el valor devuelto por crucigrama():
//                // sería duplicado (ya está dentro).
//
// Re-exporta obtenerNota(), sumarPuntos() y finalizarExamen() (viven en
// opcionMultiple.js) para que el archivo de contenido las importe de
// aquí si le resulta más cómodo, igual que las otras utils.
//
// Exporta también generarCrucigrama(palabras, semilla) →
// { filas, cols, matriz, colocaciones } (puro y determinista: misma
// lista + misma semilla → EXACTAMENTE el mismo crucigrama; lo usan las
// pruebas headless).
//
// Convención: CSS implícito · 100% responsivo · fondo blanco · paleta
// del proyecto (acento ÁMBAR #d97706, libre entre las utils).
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

// Azar anti-copia: semilla del crucigrama PERSISTENTE por navegador
// (misma cuadrícula al recargar mientras no se complete) + PRNG
// determinista para reproducirla.
import {
  semillaNueva,
  rngDesdeSemilla,
  leerTexto,
  guardarTexto,
  borrarTexto,
} from "./aleatorio.js";

// Las pistas admiten $fórmulas$ (igual que las preguntas de las utils)
import { cargarFormulas, textoConFormulas } from "./formatearFormulas.js";

// Comodines para el archivo de contenido (misma API que opcionMultiple.js)
export { obtenerNota, sumarPuntos, finalizarExamen } from "./opcionMultiple.js";

/* ---------------- Constantes ---------------- */

const TIPOS = ["clase", "tarea", "examen"];
const MAX_PALABRAS = 12;       // 2 a 12 palabras
const MAX_LETRAS_PALABRA = 18; // la palabra más larga mide el ancho mínimo
const INTENTOS_GENERADOR = 50; // re-generaciones para buscar la más cuadrada

const CLAVE_SEMILLA = (qid) => "mco_cruci_" + qid;

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

// Mini hash djb2 (misma técnica que opcionMultiple.js)
function hash8(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

function redondear1(n) {
  return Math.round(Number(n) * 10) / 10;
}

// Letras de la palabra para el tablero: mayúsculas, SIN tildes NI
// espacios NI signos… pero CONSERVANDO la Ñ (aquí se escribe letra por
// letra, así que la Ñ sí puede pedirse: NIÑO, OTOÑO…).
function letrasDe(texto) {
  return String(texto || "")
    .toUpperCase()
    .replaceAll("Ñ", "\u0001")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("\u0001", "Ñ")
    .replace(/[^A-ZÑ]/g, "");
}

/* ---------------- Generador (puro y determinista) ----------------
   Palabras HORIZONTALES (se leen →) o VERTICALES (se leen ↓), cruzadas
   entre sí por letras comunes. La validez de cada colocación sigue las
   reglas clásicas del crucigrama:

   · Las celdas ANTES del inicio y DESPUÉS del final deben estar vacías
     (si no, dos palabras se "pegarían" y formarían una más larga).
   · Una celda ocupada solo se permite si la letra ES LA MISMA (ahí hay
     un cruce real entre las dos palabras).
   · Una celda NUEVA no puede tener letras ENCIMA y DEBAJO (o a los
     lados, si es vertical): crearía una palabra accidental de 2 letras.

   Con esas reglas toda letra del tablero pertenece a UNA palabra en
   cada dirección como máximo, y no existen palabras "fantasma". */

/** ¿Cabe la palabra en (f0, c0) con esa dirección, respetando las
 *  reglas de arriba, contra las celdas ya ocupadas? */
function esValida(palabra, f0, c0, dir, celdas) {
  const L = palabra.length;
  // Celda justo ANTES del inicio y justo DESPUÉS del final: vacías
  const antesF = dir === "V" ? f0 - 1 : f0;
  const antesC = dir === "H" ? c0 - 1 : c0;
  if (celdas.has(antesF + "," + antesC)) return false;
  const despF = dir === "V" ? f0 + L : f0;
  const despC = dir === "H" ? c0 + L : c0;
  if (celdas.has(despF + "," + despC)) return false;

  for (let i = 0; i < L; i++) {
    const f = dir === "V" ? f0 + i : f0;
    const c = dir === "H" ? c0 + i : c0;
    const existente = celdas.get(f + "," + c);
    if (existente !== undefined) {
      if (existente !== palabra[i]) return false; // cruce con letra distinta
    } else {
      // Celda nueva: sus laterales perpendiculares deben estar vacíos
      // (si no, se crearía o pegaría una palabra accidental).
      if (dir === "H") {
        if (celdas.has(f - 1 + "," + c) || celdas.has(f + 1 + "," + c)) return false;
      } else {
        if (celdas.has(f + "," + (c - 1)) || celdas.has(f + "," + (c + 1))) return false;
      }
    }
  }
  return true;
}

/** Caja que ocupan las palabras colocadas (+ una candidata opcional). */
function extremosDe(colocadas, extra) {
  let minF = Infinity, maxF = -Infinity, minC = Infinity, maxC = -Infinity;
  const ver = (f, c) => {
    if (f < minF) minF = f;
    if (f > maxF) maxF = f;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  };
  for (const p of colocadas) {
    for (let i = 0; i < p.palabra.length; i++) {
      ver(p.dir === "H" ? p.f : p.f + i, p.dir === "H" ? p.c + i : p.c);
    }
  }
  if (extra) {
    for (let i = 0; i < extra.palabra.length; i++) {
      ver(extra.dir === "H" ? extra.f : extra.f + i, extra.dir === "H" ? extra.c + i : extra.c);
    }
  }
  return {
    minF, maxF, minC, maxC,
    filas: maxF - minF + 1,
    cols: maxC - minC + 1,
  };
}

/** Coloca UNA palabra: buscando CRUCES con las ya colocadas (elige el
 *  cruce que deja la caja más cuadrada) o, si no hay cruce posible,
 *  como "isla" aparte en un hueco libre. Devuelve
 *  { palabra, f, c, dir } o null si no encontró sitio. */
function colocarPalabra(palabra, colocadas, celdas, rng) {
  const L = palabra.length;

  // La 1.ª palabra: horizontal o vertical al azar, en el origen.
  if (colocadas.length === 0) {
    return { palabra, f: 0, c: 0, dir: rng() < 0.5 ? "H" : "V" };
  }

  // --- Candidatas por CRUCE con cada palabra ya colocada ---
  const candidatas = [];
  for (const p of colocadas) {
    for (let i = 0; i < L; i++) {
      for (let j = 0; j < p.palabra.length; j++) {
        if (palabra[i] !== p.palabra[j]) continue;
        // Siempre PERPENDICULAR a la palabra que ya está: si ella es
        // horizontal, la nueva va vertical (y viceversa).
        let f0, c0;
        if (p.dir === "H") {
          f0 = p.f - i;        // la letra i de la nueva cae en (p.f, p.c + j)
          c0 = p.c + j;
        } else {
          f0 = p.f + j;        // la letra i de la nueva cae en (p.f + j, p.c)
          c0 = p.c - i;
        }
        const dir = p.dir === "H" ? "V" : "H";
        if (!esValida(palabra, f0, c0, dir, celdas)) continue;
        const bb = extremosDe(colocadas, { palabra, f: f0, c: c0, dir });
        candidatas.push({
          f: f0, c: c0, dir,
          puntaje: Math.abs(bb.filas - bb.cols) * 100 + bb.filas * bb.cols + rng() * 8,
        });
      }
    }
  }
  if (candidatas.length) {
    candidatas.sort((a, b) => a.puntaje - b.puntaje);
    // Entre las 3 mejores se elige AL AZAR: todas dejan la caja
    // cuadrada, pero semillas distintas producen cruces distintos.
    const top = candidatas.slice(0, Math.min(3, candidatas.length));
    const elegida = top[Math.floor(rng() * top.length)];
    return { palabra, f: elegida.f, c: elegida.c, dir: elegida.dir };
  }

  // --- Sin cruces posibles: ISLA aparte en un hueco libre ---
  const bb = extremosDe(colocadas, null);
  for (let t = 0; t < 80; t++) {
    const dir = rng() < 0.5 ? "H" : "V";
    const margen = 2 + Math.floor(rng() * 3);
    const f0 = bb.minF - margen - L + Math.floor(rng() * (bb.filas + 2 * (margen + L)));
    const c0 = bb.minC - margen - L + Math.floor(rng() * (bb.cols + 2 * (margen + L)));
    if (esValida(palabra, f0, c0, dir, celdas)) return { palabra, f: f0, c: c0, dir };
  }
  return null;
}

/** Un intento completo: coloca TODAS las palabras (más largas primero)
 *  o falla. Devuelve { colocaciones } sin normalizar. */
function intentarGenerar(orden, rng) {
  const celdas = new Map(); // "f,c" → letra
  const colocadas = [];
  for (const palabra of orden) {
    const puesta = colocarPalabra(palabra, colocadas, celdas, rng);
    if (!puesta) return null;
    colocadas.push(puesta);
    for (let i = 0; i < palabra.length; i++) {
      const f = puesta.dir === "H" ? puesta.f : puesta.f + i;
      const c = puesta.dir === "H" ? puesta.c + i : puesta.c;
      celdas.set(f + "," + c, palabra[i]);
    }
  }
  return { colocaciones: colocadas };
}

/** GENERADOR DEL CRUCIGRAMA (exportado para las pruebas).
 *  Determinista: misma lista + misma semilla → EXACTAMENTE el mismo
 *  crucigrama. Genera muchos tableros, se queda con los DISTINTOS y
 *  elige AL AZAR entre los 6 más cuadrados (el ancho dado manda; el
 *  alto se adapta).
 *  Devuelve { filas, cols, matriz, colocaciones } con las coordenadas
 *  ya normalizadas a (0,0) y el número de cada palabra, o null si no
 *  logró colocarlas todas. */
export function generarCrucigrama(palabras, semilla) {
  const rng = rngDesdeSemilla(semilla);
  // Más largas primero (encajan mejor); desempate al azar para que
  // cada semilla pruebe órdenes distintos.
  const orden = [...palabras]
    .map((p) => ({ p, k: rng() }))
    .sort((a, b) => b.p.length - a.p.length || a.k - b.k)
    .map((x) => x.p);

  // Se generan VARIOS tableros completos. Se DESCARTAN LOS REPETIDOS
  // (dos intentos con la misma forma solo desplazada dan el MISMO
  // crucigrama tras normalizar) y entre los distintos se elige al azar
  // entre los 6 mejores: si se tomara SIEMPRE el número 1 en estricto,
  // semillas distintas acabarían convergiendo en EL MISMO tablero y
  // dos niños recibirían el mismo crucigrama.
  const vistos = new Set();
  const candidatas = [];
  for (let intento = 0; intento < INTENTOS_GENERADOR; intento++) {
    const res = intentarGenerar(orden, rng);
    if (!res) continue;
    const norm = normalizarColocaciones(res.colocaciones);
    if (!norm) continue;
    const clave = JSON.stringify(norm.colocaciones);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    candidatas.push({
      norm,
      puntaje: Math.abs(norm.filas - norm.cols) * 1000 + norm.filas * norm.cols,
    });
  }
  if (!candidatas.length) return null;
  candidatas.sort((a, b) => a.puntaje - b.puntaje);
  const top = candidatas.slice(0, Math.min(6, candidatas.length));
  const elegida = top[Math.floor(rng() * top.length)].norm;

  // --- Construir la matriz + los números del tablero elegido ---
  const { filas, cols, colocaciones: sinNum } = elegida;
  const matriz = Array.from({ length: filas }, () => Array(cols).fill(""));
  for (const col of sinNum) {
    for (let i = 0; i < col.palabra.length; i++) {
      const f = col.dir === "H" ? col.f : col.f + i;
      const c = col.dir === "H" ? col.c + i : col.c;
      matriz[f][c] = col.palabra[i];
    }
  }

  // --- Números en orden de LECTURA (fila por fila, de izquierda a
  //     derecha): cada casilla donde EMPIEZA una palabra lleva número;
  //     si empieza una horizontal y una vertical en la misma casilla,
  //     las DOS comparten el mismo número (crucigrama clásico). ---
  const inicios = [...new Set(sinNum.map((c) => c.f + "," + c.c))]
    .map((s) => s.split(",").map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const numDe = new Map(inicios.map((fc, i) => [fc[0] + "," + fc[1], i + 1]));
  const colocacionesConNum = sinNum
    .map((c) => ({ ...c, num: numDe.get(c.f + "," + c.c) }))
    .sort((a, b) => a.num - b.num || (a.dir === "H" ? -1 : 1));

  return { filas, cols, matriz, colocaciones: colocacionesConNum };
}

/** Normaliza las colocaciones de un intento a coordenadas (0,0) y
 *  calcula la caja que ocupan: { filas, cols, colocaciones }. */
function normalizarColocaciones(colocadas) {
  const minF = Math.min(...colocadas.map((c) => c.f));
  const minC = Math.min(...colocadas.map((c) => c.c));
  const colocaciones = colocadas.map((c) => ({
    palabra: c.palabra,
    f: c.f - minF,
    c: c.c - minC,
    dir: c.dir,
  }));
  const filas = Math.max(...colocaciones.map((c) => (c.dir === "H" ? c.f : c.f + c.palabra.length - 1))) + 1;
  const cols = Math.max(...colocaciones.map((c) => (c.dir === "H" ? c.c + c.palabra.length - 1 : c.c))) + 1;
  return { filas, cols, colocaciones };
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "crucigrama-estilos";
  estilo.textContent = `
    .cr-caja {
      background: #ffffff;
      border: 1px solid #fdf3e3;
      border-left: 4px solid #d97706;
      border-radius: 1.1rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
    }

    .cr-cab {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .5rem;
    }
    .cr-etiqueta {
      background: rgba(217, 119, 6, .12);
      color: #b45309;
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .cr-chip {
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      white-space: nowrap;
    }
    .cr-chip.bien { background: rgba(22, 163, 52, .12); color: #15803d; }

    .cr-indicacion {
      margin: 0 0 .8rem;
      font-size: .92rem;
      color: #4b5563;
      line-height: 1.45;
    }
    .cr-indicacion b { color: #92400e; }

    /* Tablero: las casillas son CUADRADAS (aspect-ratio), así el alto
       sale solo del ancho y de la cantidad de filas. Las casillas que
       no pertenecen a ninguna palabra se ven como BLOQUES OSCUROS. */
    .cr-tablero {
      --cr-cols: 10;
      width: 100%;
      max-width: 620px;
      margin: 0 auto .8rem;
      display: grid;
      grid-template-columns: repeat(var(--cr-cols), 1fr);
      gap: 3px;
      padding: 4px;
      box-sizing: border-box;
      background: #e7ebf1;
      border-radius: .8rem;
      container-type: inline-size;
    }
    .cr-celda {
      position: relative;
      aspect-ratio: 1 / 1;
      font-family: inherit;
      font-weight: 800;
      color: #1f2937;
      background: #ffffff;
      border: none;
      border-radius: 5px;
      padding: 0;
      margin: 0;
      min-width: 0;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-user-select: none;
      user-select: none;
      font-size: 14px;
      font-size: clamp(9px, calc(70cqi / var(--cr-cols)), 22px);
      transition: background .12s ease, transform .12s ease;
    }
    .cr-celda:hover:not(:disabled):not(.cr-vacia) { background: #fff7e6; }
    .cr-celda:active:not(:disabled):not(.cr-vacia) { transform: scale(.93); }
    .cr-celda.cr-vacia {
      background: #0f172a;
      cursor: default;
      border-radius: 4px;
    }
    .cr-celda.activa { background: #fde9c3; }
    .cr-celda.cr-sel {
      background: #f59e0b;
      color: #ffffff;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, .35);
    }
    .cr-celda.fija { background: #a7f3d0; color: #065f46; }
    .cr-celda.erronea { background: #fecaca; color: #b91c1c; }
    .cr-celda:disabled { cursor: default; }
    .cr-num {
      position: absolute;
      top: 1px;
      left: 3px;
      font-size: 7px;
      font-size: clamp(6px, calc(30cqi / var(--cr-cols)), 11px);
      font-weight: 800;
      color: #b45309;
      line-height: 1;
      pointer-events: none;
    }
    .cr-celda.fija .cr-num { color: #047857; }

    /* Pistas numeradas por dirección */
    .cr-pistas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: .8rem 1.4rem;
      margin: 0 0 .8rem;
    }
    .cr-col h4 {
      margin: 0 0 .4rem;
      font-size: .82rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .05em;
      color: #b45309;
    }
    .cr-lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: .3rem;
    }
    .cr-lista li {
      display: flex;
      gap: .45rem;
      align-items: baseline;
      font-size: .88rem;
      line-height: 1.4;
      color: #374151;
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      border-radius: .6rem;
      padding: .3rem .55rem;
      cursor: pointer;
      transition: background .12s ease;
    }
    .cr-lista li:hover { background: #fff7e6; }
    .cr-lista li .cr-pref { font-weight: 800; color: #b45309; flex: none; }
    .cr-lista li .cr-texto { min-width: 0; }
    .cr-lista li.activa { background: #fde9c3; border-color: #f59e0b; }
    .cr-lista li.hecha {
      background: #ecfdf5;
      border-color: #a7f3d0;
      color: #065f46;
    }
    .cr-lista li.hecha .cr-pref { color: #047857; }
    .cr-lista li.hecha .cr-texto { text-decoration: line-through; }

    /* Teclado en pantalla (una letra por casilla, con Ñ y ⌫) */
    .cr-teclado {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(37px, 1fr));
      gap: 4px;
      max-width: 500px;
      margin: 0 auto .4rem;
    }
    .cr-tecla {
      font-family: inherit;
      font-weight: 800;
      font-size: .95rem;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: .55rem;
      padding: .5rem 0;
      cursor: pointer;
      transition: background .12s ease, transform .1s ease;
    }
    .cr-tecla:hover:not(:disabled) { background: #fde68a; }
    .cr-tecla:active:not(:disabled) { transform: scale(.94); }
    .cr-tecla.cr-borrar {
      grid-column: span 3;
      color: #b45309;
      background: #ffffff;
      border-color: #f59e0b;
    }
    .cr-tecla:disabled { opacity: .45; cursor: default; }

    .cr-pie {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .6rem;
    }
    .cr-feedback { flex: 1; min-width: 0; font-size: .88rem; font-weight: 600; color: #6b7280; }
    .cr-feedback.ok { color: #16a34a; }
    .cr-feedback.aviso { color: #f97316; }

    /* Caja roja cuando el contenido llamó a la utilidad con datos inválidos */
    .cr-error-dev {
      border: 2px dashed #ef4444;
      border-left: 2px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      box-shadow: none;
    }

    @media (max-width: 767px) {
      .cr-caja { padding: 1rem; }
      .cr-teclado { grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); }
      .cr-feedback { font-size: .82rem; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Componente ---------------- */

/**
 * Genera un crucigrama jugable en el contenedor indicado.
 * Devuelve una Promise<number> con la nota ganada en ESTE bloque
 * (puntaje completo al completar TODAS las palabras; 0 si ya estaba
 * respondida o —en examen— si se envía incompleto; queda pendiente si
 * el estudiante nunca lo termina). Con tipo "examen" la promesa trae
 * además .enviar() → Promise<{ puntos, maxPuntaje }> para el botón
 * final del examen.
 */
export function crucigrama(config = {}) {
  const { contenedor, perfil, clase, id } = config;

  const tipo = String(config.tipo || clase?.tipo || "clase").toLowerCase().trim();
  const esTipoClase = tipo === "clase";
  const esTarea = tipo === "tarea";
  const esExamen = tipo === "examen";

  // PUNTAJE OCULTO del bloque (0 a 10). Defecto: 1 (compatibilidad).
  let puntaje = Number(config.puntaje ?? 1);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 10) {
    console.warn("[crucigrama] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
    puntaje = 1;
  }
  puntaje = redondear1(puntaje);

  let enviarExamen = null; // se define dentro del executor (solo examen)

  const promesa = new Promise((resolve) => {
    inyectarEstilos();
    // Pistas con $fórmulas$: igual que las preguntas, se construye tras
    // cargar KaTeX (si el CDN falla, construye igual con texto plano).
    cargarFormulas().catch(() => null).then(() => construir(resolve));
  });

  function construir(resolve) {

    // --- Validaciones (avisos claros para quien escribe el contenido) ---
    const crudas = Array.isArray(config.palabras) ? config.palabras : null;

    function errorDev(mensaje) {
      console.error("[crucigrama]", mensaje);
      const div = document.createElement("div");
      div.className = "cr-caja cr-error-dev";
      div.textContent = "[crucigrama] " + mensaje;
      contenedor.append(div);
    }

    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[crucigrama] Falta 'contenedor' (elemento del DOM donde insertar el crucigrama).");
      resolve(0);
      return;
    }
    if (!TIPOS.includes(tipo)) {
      errorDev(`'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
      resolve(0);
      return;
    }
    if (!crudas) {
      errorDev("Falta 'palabras' (lista de 2 a 12 palabras, cada una con su pista).");
      resolve(0);
      return;
    }

    // Cada item: { palabra, pista } · ["PALABRA", "pista"] (la pista
    // también acepta el nombre antiguo "clave"). El texto de la pista
    // es CONTENIDO y admite $fórmulas$.
    const items = [];
    const sinPista = [];
    for (const it of crudas) {
      let palabra = null;
      let pista = null;
      if (it && typeof it === "object" && !Array.isArray(it)) {
        palabra = it.palabra ?? it.palabras;
        pista = it.pista ?? it.clave ?? it.definicion;
      } else if (Array.isArray(it)) {
        palabra = it[0];
        pista = it[1];
      }
      const letras = letrasDe(palabra);
      const textoPista = String(pista ?? "").trim();
      if (!textoPista) sinPista.push(letras || String(palabra ?? "?"));
      items.push({ letras, pista: textoPista });
    }
    if (sinPista.length) {
      errorDev(`Cada palabra necesita su pista (clave). Sin pista: ${sinPista.join(", ")}.`);
      resolve(0);
      return;
    }
    if (items.length < 2 || items.length > MAX_PALABRAS) {
      errorDev(`Las palabras deben ser entre 2 y ${MAX_PALABRAS} (llegaron ${items.length}).`);
      resolve(0);
      return;
    }
    if (items.some((it) => it.letras.length < 2)) {
      errorDev("Hay palabras con menos de 2 letras (después de quitar tildes, espacios y signos).");
      resolve(0);
      return;
    }
    if (items.some((it) => it.letras.length > MAX_LETRAS_PALABRA)) {
      errorDev(`Hay palabras de más de ${MAX_LETRAS_PALABRA} letras: la cuadrícula saldría demasiado grande.`);
      resolve(0);
      return;
    }
    const listaPalabras = items.map((it) => it.letras);
    if (new Set(listaPalabras).size !== listaPalabras.length) {
      errorDev("Hay palabras repetidas (quitando tildes, espacios y signos: quedarían indistinguibles).");
      resolve(0);
      return;
    }
    if (!perfil?.uid || !clase?.id) {
      errorDev("Faltan 'perfil' (con uid) o 'clase' (con id): la nota no se puede guardar.");
      resolve(0);
      return;
    }

    const esDoc = esDocente(perfil);
    const qid = id ? slug(String(id)) : `cruci-${hash8(listaPalabras.join("|"))}`;
    const claveSemilla = CLAVE_SEMILLA(qid);

    // --- Semilla PERSISTENTE por navegador (anti-copia): mientras el
    // crucigrama no se complete, recargar sale con EL MISMO tablero. El
    // docente no guarda nada: semilla nueva en cada montaje.
    let semilla = esDoc ? null : leerTexto(claveSemilla);
    if (!semilla) {
      semilla = semillaNueva();
      if (!esDoc) guardarTexto(claveSemilla, semilla);
    }

    // --- Generar el tablero (determinista con la semilla) ---
    const gen = generarCrucigrama(listaPalabras, semilla);
    if (!gen) {
      errorDev("No se pudo colocar todas las palabras. Recarga: el sorteo es aleatorio y normalmente entra sobrado.");
      if (!esDoc) borrarTexto(claveSemilla);
      resolve(0);
      return;
    }
    const FILAS = gen.filas;
    const COLS = gen.cols;
    const totalPalabras = gen.colocaciones.length;
    const celdasPalabra = new Set(); // "f,c" que pertenecen a ALGUNA palabra
    for (const p of gen.colocaciones) {
      for (let i = 0; i < p.palabra.length; i++) {
        celdasPalabra.add((p.dir === "H" ? p.f : p.f + i) + "," + (p.dir === "H" ? p.c + i : p.c));
      }
    }
    const totalLetras = celdasPalabra.size;

    // --- Estado ---
    const letras = new Map();  // "f,c" → letra escrita por el estudiante
    const fijas = new Set();   // "f,c" bloqueadas (palabra lograda/revelada)
    let sel = null;            // casilla seleccionada { f, c }
    let dirSel = "H";          // dirección de la palabra que se está escribiendo
    let logradas = new Set();  // palabras ya correctas
    let bloqueada = false;
    let resuelto = false;
    let tocado = false;        // el estudiante ya interactuó en esta sesión
    let yaEnviada = false;     // examen: guardado con la marca de enviado
    let ultimoResultado = null;

    const resolverUnaVez = (valor) => {
      if (!resuelto) {
        resuelto = true;
        // Respondida (o pre-marcada respondida): la semilla se libera
        // para que el próximo crucigrama de este contenido sea OTRO.
        if (!esDoc) borrarTexto(claveSemilla);
        resolve(valor);
      }
    };

    // --- Estructura (SIN ninguna mención al puntaje: queda oculto) ---
    const caja = document.createElement("section");
    caja.className = "cr-caja";
    caja.setAttribute("aria-label", "Crucigrama");
    caja.innerHTML = `
      <div class="cr-cab">
        <span class="cr-etiqueta">${esExamen ? "Examen" : esTarea ? "Tarea" : "Crucigrama"}</span>
        <span class="cr-chip"></span>
      </div>
      <p class="cr-indicacion">Lee las pistas y escribe la respuesta: toca una casilla y escribe <b>una letra por casilla</b> con el teclado. Si una casilla pertenece a <b>dos palabras</b>, tócala otra vez para cambiar de dirección. ⌫ borra.</p>
      <div class="cr-tablero" role="grid" aria-label="Cuadrícula del crucigrama"></div>
      <div class="cr-pistas">
        <div class="cr-col" data-dir="H"><h4>Horizontal</h4><ol class="cr-lista"></ol></div>
        <div class="cr-col" data-dir="V"><h4>Vertical</h4><ol class="cr-lista"></ol></div>
      </div>
      <div class="cr-teclado" aria-label="Teclado de letras"></div>
      <div class="cr-pie">
        <span class="cr-feedback" aria-live="polite"></span>
      </div>`;

    const chipEl = caja.querySelector(".cr-chip");
    const feedbackEl = caja.querySelector(".cr-feedback");
    const tablero = caja.querySelector(".cr-tablero");
    const teclado = caja.querySelector(".cr-teclado");
    const colH = caja.querySelector('.cr-col[data-dir="H"] .cr-lista');
    const colV = caja.querySelector('.cr-col[data-dir="V"] .cr-lista');

    const feedback = (mensaje, tipoFeedback) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "cr-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const chip = (mensaje, tipoChip) => {
      chipEl.textContent = mensaje;
      chipEl.className = "cr-chip" + (tipoChip ? " " + tipoChip : "");
    };

    // --- Tablero: FILAS × COLS casillas botón (las vacías, oscuras) ---
    tablero.style.setProperty("--cr-cols", String(COLS));
    const celdas = [];
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "cr-celda";
        b.dataset.f = String(f);
        b.dataset.c = String(c);
        b.setAttribute("role", "gridcell");
        const enUso = celdasPalabra.has(f + "," + c);
        if (!enUso) {
          b.classList.add("cr-vacia");
          b.disabled = true;
          b.tabIndex = -1;
          b.setAttribute("aria-hidden", "true");
        } else {
          b.setAttribute("aria-label", `Fila ${f + 1}, columna ${c + 1}`);
          b.addEventListener("click", () => alClic(f, c, b));
          const inicio = gen.colocaciones.find((p) => p.f === f && p.c === c);
          if (inicio) {
            const n = document.createElement("span");
            n.className = "cr-num";
            n.textContent = String(inicio.num);
            b.append(n);
          }
          const l = document.createElement("span");
          l.className = "cr-letra";
          b.append(l);
        }
        tablero.append(b);
        celdas.push(b);
      }
    }

    const celdaEn = (f, c) =>
      tablero.querySelector(`.cr-celda[data-f="${f}"][data-c="${c}"]`);

    // --- Pistas numeradas (agrupadas por dirección, en orden) ---
    // El generador devuelve solo las PALABRAS: las pistas se recuperan
    // de la lista validada (las palabras no se repiten).
    const pistaDe = new Map(items.map((it) => [it.letras, it.pista]));
    const liDe = new Map(); // colocación → <li>
    for (const p of gen.colocaciones) {
      const li = document.createElement("li");
      li.dataset.dir = p.dir;
      li.dataset.num = String(p.num);
      const pref = document.createElement("span");
      pref.className = "cr-pref";
      pref.textContent = `${p.num}.`;
      const tex = document.createElement("span");
      tex.className = "cr-texto";
      tex.innerHTML = textoConFormulas(pistaDe.get(p.palabra) || ""); // admite $fórmulas$       li.append(pref, tex);
      li.addEventListener("click", () => {
        if (bloqueada) return;
        dirSel = p.dir;
        // La primera casilla LIBRE de la palabra (o la inicial si todo
        // está lleno): de un toque en la pista se llega a escribir.
        const claves = celdasDePalabra(p);
        const libre = claves.find((k) => !fijas.has(k) && !letras.has(k)) || claves[0];
        const [f, c] = libre.split(",").map(Number);
        sel = { f, c };
        tocado = true;
        pintarSeleccion();
        celdaEn(f, c)?.focus({ preventScroll: true });
      });
      (p.dir === "H" ? colH : colV).append(li);
      liDe.set(p, li);
    }
    // Columnas sin pistas: se retiran (no queda un hueco vacío)
    if (!colH.children.length) colH.closest(".cr-col").style.display = "none";
    if (!colV.children.length) colV.closest(".cr-col").style.display = "none";

    // --- Teclado en pantalla (con Ñ y ⌫) ---
    for (const t of "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("")) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cr-tecla";
      b.textContent = t;
      b.addEventListener("click", () => {
        escribir(t);
        if (sel) celdaEn(sel.f, sel.c)?.focus({ preventScroll: true });
      });
      teclado.append(b);
    }
    const btnBorrar = document.createElement("button");
    btnBorrar.type = "button";
    btnBorrar.className = "cr-tecla cr-borrar";
    btnBorrar.textContent = "⌫ Borrar";
    btnBorrar.addEventListener("click", () => {
      retroceso();
      if (sel) celdaEn(sel.f, sel.c)?.focus({ preventScroll: true });
    });
    teclado.append(btnBorrar);

    // Teclado FÍSICO: una letra por casilla también con el de la PC.
    caja.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        retroceso();
        return;
      }
      if (e.key && e.key.length === 1) {
        const letra = letrasDe(e.key);
        if (letra.length === 1) {
          e.preventDefault();
          escribir(letra);
        }
      }
    });

    // --- Helpers de palabras ---
    const celdasDePalabra = (p) => {
      const claves = [];
      for (let i = 0; i < p.palabra.length; i++) {
        claves.push((p.dir === "H" ? p.f : p.f + i) + "," + (p.dir === "H" ? p.c + i : p.c));
      }
      return claves;
    };
    const palabraEn = (f, c, dir) =>
      gen.colocaciones.find((p) => {
        if (p.dir !== dir) return false;
        if (dir === "H") return p.f === f && c >= p.c && c < p.c + p.palabra.length;
        return p.c === c && f >= p.f && f < p.f + p.palabra.length;
      });

    const pintarCelda = (clave) => {
      const [f, c] = clave.split(",").map(Number);
      const b = celdaEn(f, c);
      if (!b) return;
      b.querySelector(".cr-letra").textContent = letras.get(clave) || "";
      b.classList.toggle("fija", fijas.has(clave));
    };

    const pintarSeleccion = () => {
      celdas.forEach((b) => b.classList.remove("activa", "cr-sel"));
      colH.querySelectorAll("li").forEach((li) => li.classList.remove("activa"));
      colV.querySelectorAll("li").forEach((li) => li.classList.remove("activa"));
      if (!sel) return;
      const p = palabraEn(sel.f, sel.c, dirSel);
      if (p) {
        for (const clave of celdasDePalabra(p)) {
          const [f, c] = clave.split(",").map(Number);
          celdaEn(f, c)?.classList.add("activa");
        }
        liDe.get(p)?.classList.add("activa");
      }
      celdaEn(sel.f, sel.c)?.classList.add("cr-sel");
    };

    const refrescarChip = () => {
      if (esTipoClase) {
        chip(`${logradas.size} de ${totalPalabras} palabras`, logradas.size > 0 ? "bien" : "");
      } else {
        chip(`${letras.size} de ${totalLetras} letras`, "");
      }
    };

    const bloquearTodo = () => {
      bloqueada = true;
      sel = null;
      pintarSeleccion();
      celdas.forEach((b) => (b.disabled = true));
      teclado.querySelectorAll("button").forEach((b) => (b.disabled = true));
    };

    const destello = (claves) => {
      claves.forEach((k) => {
        const [f, c] = k.split(",").map(Number);
        celdaEn(f, c)?.classList.add("erronea");
      });
      setTimeout(() => {
        claves.forEach((k) => {
          const [f, c] = k.split(",").map(Number);
          celdaEn(f, c)?.classList.remove("erronea");
        });
      }, 900);
    };

    // Marca una palabra como LOGRADA: verde fija + pista tachada (la
    // parte VISUAL; el set logradas lo maneja validarTrasEscribir).
    const fijarPalabra = (p) => {
      for (const clave of celdasDePalabra(p)) {
        fijas.add(clave);
        pintarCelda(clave);
      }
      const li = liDe.get(p);
      if (li) li.classList.add("hecha");
    };

    const revelarSolucion = () => {
      for (const p of gen.colocaciones) {
        const claves = celdasDePalabra(p);
        claves.forEach((clave, i) => {
          letras.set(clave, p.palabra[i]);
        });
        logradas.add(p.palabra);
        liDe.get(p)?.classList.add("hecha");
      }
      fijas.clear();
      celdasPalabra.forEach((clave) => fijas.add(clave));
      celdasPalabra.forEach(pintarCelda);
      refrescarChip();
    };

    // --- Escribir UNA letra en la casilla seleccionada y avanzar ---
    function escribir(letra) {
      if (bloqueada || !sel) return;
      const clave = sel.f + "," + sel.c;
      if (fijas.has(clave)) {
        // Casilla asegurada (verde): la letra NO se pierde, pasa a la
        // siguiente casilla libre de la palabra que se está escribiendo.
        avanzar();
        if (fijas.has(sel.f + "," + sel.c)) return; // no queda ninguna libre
      }
      tocado = true;
      const clave2 = sel.f + "," + sel.c;
      letras.set(clave2, letra);
      pintarCelda(clave2);
      validarTrasEscribir(sel.f, sel.c);
      if (bloqueada || resuelto) return; // completar() cerró el tablero
      avanzar();
      refrescarChip();
    }

    /** Al llenarse una palabra se comprueba al instante, según el tipo:
     *  · CLASE: correcta → verde fija + aviso con la palabra; incorrecta
     *    → destello rojo (sin castigo: se puede corregir).
     *  · TAREA: igual pero con mensajes neutros.
     *  · EXAMEN: NADA se revela mientras escribe (ni verde ni rojo): la
     *    palabra correcta solo se cuenta por dentro y, cuando TODAS lo
     *    están, se avisa "Lista para enviar". Si edita una palabra ya
     *    correcta, se vuelve a evaluar. */
    function validarTrasEscribir(f, c) {
      for (const dir of ["H", "V"]) {
        const p = palabraEn(f, c, dir);
        if (!p) continue;
        const claves = celdasDePalabra(p);
        const llena = claves.every((k) => letras.has(k));
        const correcta = llena && claves.every((k, i) => letras.get(k) === p.palabra[i]);
        if (correcta) {
          const yaEstaba = logradas.has(p.palabra);
          logradas.add(p.palabra);
          if (!yaEstaba && !esExamen) {
            fijarPalabra(p); // verde fija + pista tachada (clase y tarea)
            if (esTipoClase) {
              feedback(`«${p.palabra}» completa (${logradas.size} de ${totalPalabras}). ¡Muy bien!`, "ok");
            } else {
              feedback(`Palabra completa (${logradas.size} de ${totalPalabras}).`, "");
            }
          }
          if (logradas.size === totalPalabras) {
            completar();
            return;
          }
        } else {
          logradas.delete(p.palabra); // la edición la deshizo (examen)
          if (llena && !esExamen) {
            destello(claves);
            feedback(
              esTipoClase
                ? "Esa palabra no coincide con la pista. Revísala y corrígela."
                : "Hay palabras que no coinciden con su pista. Revísalas.",
              "aviso"
            );
          }
        }
      }
    }

    /** Pasa a la SIGUIENTE casilla libre de la palabra activa. */
    function avanzar() {
      if (!sel) return;
      const p = palabraEn(sel.f, sel.c, dirSel);
      if (!p) return;
      const claves = celdasDePalabra(p);
      const i = claves.indexOf(sel.f + "," + sel.c);
      for (let k = i + 1; k < claves.length; k++) {
        if (!fijas.has(claves[k])) {
          const [f, c] = claves[k].split(",").map(Number);
          sel = { f, c };
          pintarSeleccion();
          celdaEn(f, c)?.focus({ preventScroll: true });
          return;
        }
      }
      // Llegó al final de la palabra: se queda en la última casilla.
    }

    /** ⌫: borra la letra de la casilla (o retrocede y borra si vacía). */
    function retroceso() {
      if (bloqueada || !sel) return;
      const clave = sel.f + "," + sel.c;
      if (!fijas.has(clave) && letras.has(clave)) {
        letras.delete(clave);
        pintarCelda(clave);
      } else {
        const p = palabraEn(sel.f, sel.c, dirSel);
        if (!p) return;
        const claves = celdasDePalabra(p);
        const i = claves.indexOf(clave);
        if (i > 0) {
          const anterior = claves[i - 1];
          const [f, c] = anterior.split(",").map(Number);
          sel = { f, c };
          if (!fijas.has(anterior)) {
            letras.delete(anterior);
            pintarCelda(anterior);
          }
          pintarSeleccion();
          celdaEn(f, c)?.focus({ preventScroll: true });
        }
      }
      refrescarChip();
    }

    // --- CLIC sobre una casilla: seleccionarla (y alternar dirección
    //     en los CRUCES, donde conviven dos palabras) ---
    function alClic(f, c, b) {
      if (bloqueada) return;
      tocado = true;
      const enH = palabraEn(f, c, "H");
      const enV = palabraEn(f, c, "V");
      if (sel && sel.f === f && sel.c === c) {
        if (enH && enV) dirSel = dirSel === "H" ? "V" : "H"; // cruce: alterna
      } else {
        sel = { f, c };
        if (enH && enV) { /* cruce: conserva la dirección que ya usaba */ }
        else dirSel = enV && !enH ? "V" : "H";
      }
      feedback("", "");
      pintarSeleccion();
      b.focus({ preventScroll: true });
    }

    // --- TODAS las palabras completas → cierre del bloque según tipo y rol ---
    function completar() {
      bloquearTodo();
      if (esDoc) {
        registrarPuntoDocente(perfil, clase, qid, puntaje);
        chip("¡Completada! · vista docente", "bien");
        feedback("¡Crucigrama completo! El puntaje está arriba y nada se guarda.", "ok");
        resolverUnaVez(puntaje);
        return;
      }
      if (esExamen) {
        // El examen guarda al ENVIAR (botón final del archivo del examen)
        chip("Lista para enviar", "bien");
        feedback("¡Crucigrama completo! El examen lo enviará con el botón final.", "ok");
        resolverUnaVez(puntaje);
        return;
      }
      chip("¡Completada!", "bien");
      feedback("¡Excelente! Completaste todo el crucigrama.", "ok");
      // Nota UNA sola vez, como cualquier bloque (localStorage + Firestore + espejo)
      sumarPuntos(perfil, clase, qid, puntaje, { tipo }).catch(() => {});
      resolverUnaVez(puntaje);
    }

    // --- Estado inicial según tipo y rol ---
    if (esDoc) {
      chip("Vista docente", "");
      feedback("Intentos libres, puntaje local arriba y nada se guarda.", "");
      prepararDocente(perfil, clase); // restaura el head local si ya hay puntaje
    } else if (esExamen) {
      chip("Sin enviar", "");
      feedback("Completa el crucigrama; el examen lo enviará todo al final.", "");
    } else if (esTarea) {
      refrescarChip();
      feedback("Completa todas las palabras para terminar la tarea.", "");
    } else {
      refrescarChip();
    }

    // --- EXAMEN: el botón lo pone el archivo del examen ---
    enviarExamen = async function () {
      if (esDoc) {
        const ganado = logradas.size === totalPalabras ? puntaje : 0;
        registrarPuntoDocente(perfil, clase, qid, ganado);
        chip("Vista docente", "");
        feedback("Enviado. El puntaje está en el head de arriba; nada se guarda.", "");
        resolverUnaVez(ganado);
        return { puntos: ganado, maxPuntaje: puntaje, docente: true };
      }

      if (yaEnviada) {
        return ultimoResultado || { puntos: 0, maxPuntaje: puntaje, yaEnviado: true };
      }

      // UNA sola oportunidad: completo → puntaje completo; incompleto →
      // 0 (igual que los demás bloques del examen). Se guarda SIEMPRE.
      const ganado = logradas.size === totalPalabras ? puntaje : 0;
      bloquearTodo();
      chip("Enviada", "");
      feedback(
        ganado > 0
          ? "Crucigrama enviado: estaba completo."
          : "Crucigrama enviado sin completar todas las palabras.",
        ""
      );
      await guardarPreguntaExamen(perfil, clase, qid, ganado); // guarda SIEMPRE (0 incluido)
      yaEnviada = true;
      ultimoResultado = { puntos: ganado, maxPuntaje: puntaje };
      resolverUnaVez(ganado);
      return { puntos: ganado, maxPuntaje: puntaje };
    };

    // --- Al montar (estudiante): ¿ya respondida o examen ya enviado? ---
    if (!esDoc) {
      obtenerNota(perfil, clase).then((nota) => {
        if (resuelto || bloqueada || tocado) return; // ya interactuó en esta sesión
        const guardado = nota.preguntas ? nota.preguntas[qid] : undefined;
        const hecha = guardado != null;

        if (esExamen && (nota.enviado || hecha)) {
          yaEnviada = true;
          ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje, yaEnviado: true };
          revelarSolucion();
          bloquearTodo();
          chip("Examen enviado", "");
          feedback("Ya enviaste este examen.", "");
          resolverUnaVez(0);
          return;
        }
        if (hecha) {
          revelarSolucion(); // clase/tarea: el crucigrama resuelto queda a la vista
          bloquearTodo();
          chip("Respondida", "bien");
          feedback(esTarea ? "Ya enviaste esta tarea." : "Ya completaste este crucigrama.", "ok");
          resolverUnaVez(0); // no vuelve a sumar
        }
      });
    }

    contenedor.append(caja);

    // v1: ancho (px si llega número) / columnas — igual que las otras utils
    const tam = {};
    if (config.columnas != null) tam.columnas = config.columnas;
    if (config.ancho != null && config.ancho !== "") {
      tam.ancho =
        typeof config.ancho === "number" && config.ancho >= 1
          ? `${config.ancho}px`
          : config.ancho;
    }
    aplicarTamano(caja, tam);
  }

  if (esExamen) promesa.enviar = () => enviarExamen();
  return promesa;
}
