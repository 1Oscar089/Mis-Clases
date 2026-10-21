// ============================================================
// aleatorio.js — AZAR PERSISTENTE por navegador (anti-copia)
// (js/utils/aleatorio.js) · v1
// ============================================================
//
// Para que NINGÚN estudiante reciba el mismo orden/la misma sopa de
// letras, las utilidades sortean SU ORDEN al azar. Pero un sorteo
// "tonto" cambia SIEMPRE al recargar la página y el estudiante puede
// copiar mirando la pantalla del compañero mientras se recarga.
// Solución: el orden sorteado se GUARDA en localStorage (por navegador)
// mientras la actividad NO se responda:
//
//   · 1.ª vez → se sortea y se guarda.
//   · Recarga sin responder → sale IGUAL (el navegador recuerda SU orden).
//   · Actividad respondida → se LIBERA: la próxima vez llega con otro orden.
//
// El docente nunca guarda nada (convención del proyecto): ve un orden
// nuevo en cada montaje.
//
// Esta pieza NO dibuja nada y NO toca Firestore/Sheets: solo localStorage
// (con try/catch: si está bloqueado, todo sigue funcionando con azar
// puro en memoria).
//
// La usan opcionMultiple.js (v6), multipleOpcion.js (v7),
// relacionar.js (v5), ordenar.js (v4) y sopaLetras.js (v1).
// ============================================================

/* ---------------- Permutaciones ---------------- */

/** Devuelve [0, 1, …, n-1] mezclado al azar (Fisher-Yates con
 *  Math.random). Para el docente y para usos sin persistencia. */
export function ordenAlAzar(n) {
  const orden = Array.from({ length: Math.max(0, n) }, (_, i) => i);
  for (let i = orden.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  return orden;
}

/** ¿Es una permutación válida de n elementos? (defensa contra
 *  localStorage corrupto o editado a mano). */
export function esPermutacion(perm, n) {
  return (
    Array.isArray(perm) &&
    perm.length === n &&
    new Set(perm).size === n &&
    perm.every((v) => Number.isInteger(v) && v >= 0 && v < n)
  );
}

/** Clave estándar de orden para UNA actividad: "mco_orden_" + qid.
 *  (relacionar usa además las variantes clave + "::I" y clave + "::D"). */
export function claveOrden(qid) {
  return "mco_orden_" + String(qid || "x");
}

/* ---------------- localStorage con red de seguridad ---------------- */

function leerJSON(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave) || "null");
  } catch (e) {
    return null;
  }
}

function escribirJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (e) { /* localStorage lleno o bloqueado: se ignora */ }
}

function borrarClave(clave) {
  try {
    localStorage.removeItem(clave);
  } catch (e) { /* ignorar */ }
}

/** Texto plano en localStorage (la semilla de sopaLetras). */
export function leerTexto(clave) {
  try {
    return localStorage.getItem(clave);
  } catch (e) {
    return null;
  }
}

export function guardarTexto(clave, texto) {
  try {
    localStorage.setItem(clave, String(texto));
  } catch (e) { /* ignorar */ }
}

export function borrarTexto(clave) {
  try {
    localStorage.removeItem(clave);
  } catch (e) { /* ignorar */ }
}

/* ---------------- Orden persistente ---------------- */

/** Lee el orden guardado para esta clave; si no existe (o está
 *  corrupto) sortea uno nuevo, lo GUARDA y lo devuelve.
 *  Misma actividad + mismo navegador → el mismo orden hasta que se
 *  llame liberarOrden() al responder. */
export function ordenPersistente(clave, n) {
  if (!Number.isInteger(n) || n < 2) return ordenAlAzar(Math.max(1, n || 1));
  const guardado = leerJSON(clave);
  if (esPermutacion(guardado, n)) return guardado;
  const orden = ordenAlAzar(n);
  escribirJSON(clave, orden);
  return orden;
}

/** Guarda una permutación ya calculada (relacionar la re-guarda cuando
 *  su "guardia" anti-parejas-en-la-misma-fila vuelve a mezclar). */
export function guardarOrden(clave, perm) {
  if (esPermutacion(perm, perm.length)) escribirJSON(clave, perm);
}

/** Borra el orden guardado de UNA actividad. Se llama cuando la
 *  actividad ya se respondió: la próxima vez que aparezca llega con
 *  OTRO orden. También borra las variantes "::I" y "::D" (relacionar
 *  guarda dos columnas bajo la misma clave base). */
export function liberarOrden(clave) {
  borrarClave(clave);
  borrarClave(clave + "::I");
  borrarClave(clave + "::D");
}

/* ---------------- Semillas y PRNG determinista ----------------
   sopaLetras necesita reproducir una CUADRÍCULA completa (posiciones,
   direcciones y relleno) a partir de una semilla guardada: no basta
   con guardar el orden, hay que volver a "tirar los mismos dados". */

/** Semilla nueva aleatoria (32 bits de crypto en base36). */
export function semillaNueva() {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0].toString(36);
  } catch (e) {
    return Math.floor(Math.random() * 0xffffffff).toString(36);
  }
}

/** Generador pseudoaleatorio determinista a partir de una semilla
 *  (mulberry32): misma semilla → la MISMA secuencia de números.
 *  Devuelve una función rng() que da [0, 1). */
export function rngDesdeSemilla(semilla) {
  let t = parseInt(String(semilla ?? ""), 36) >>> 0;
  if (!t) t = 0x9e3779b9;
  return function rng() {
    t = (t + 0x6d2b79f5) >>> 0;
    let z = t;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}