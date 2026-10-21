// ============================================================
// sopaLetras.js — SOPA DE LETRAS jugable con nota al completarla
// (js/utils/sopaLetras.js) · v1
// ============================================================
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: genera una
// sopa de letras distinta PARA CADA ESTUDIANTE y, al encontrar TODAS
// las palabras, guarda la nota igual que cualquier bloque de pregunta.
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/3/ciencias/mi-clase.js):
//
//   import { sopaLetras } from "../../../js/utils/sopaLetras.js";
//
//   sopaLetras({
//     contenedor,           // elemento del DOM donde insertar la sopa
//     perfil,               // perfil del usuario (users/{uid}: uid, rol)
//     clase,                // { id, grado, materiaId, materia?, titulo? }
//     palabras: ["GATO", "PERRO", "CONEJO", "RATÓN", "GALLINA"],
//                           // entre 2 y 12 palabras (tildes y espacios
//                           // se quitan solos: RATÓN queda RATON)
//     puntaje: 2,           // valor del bloque (0 a 10): se gana
//                           // COMPLETO al encontrar todas las palabras
//     // ancho: 520,        // ancho del tablero en PX (o "320px", "50%",
//     //                    //  o fracción 0.5 — igual que las otras utils)
//     // columnas: 2,       // como en las otras utils (mitad del ancho)
//     // id: "sopa-1",      // (opcional) identificador único y estable
//     // tipo: "clase",     // "clase" | "tarea" | "examen"  (defecto: "clase")
//   }).then((ganado) => { /* nota ganada en ESTE bloque (oculta) */ });
//
// CÓMO SE JUEGA
//   · CUADRÍCULA CUADRADA del tamaño MÍNIMO que aguanta la palabra más
//     larga (crece sola si el azar no alcanza a colocar todo).
//   · El estudiante toca la letra INICIAL y luego la letra FINAL de la
//     palabra. La pareja vale si las dos están EN LÍNEA RECTA:
//     horizontal, vertical o diagonal — en los DOS sentidos (8
//     direcciones: → ← ↓ ↑ ↘ ↖ ↙ ↗, las invertidas incluidas).
//   · Las palabras se COLOCAN AL AZAR (una pueden cruzarse con otra
//     cuando comparten letra) y el resto de la cuadrícula se rellena
//     con letras al azar: NINGÚN niño recibe la misma sopa.
//   · Aciertos: las letras quedan marcadas en verde y la palabra se
//     tacha en la lista. Selección equivocada: destello rojo, sin
//     castigo (se puede seguir intentando hasta completar).
//
// ANTI-COPIA PERSISTENTE (js/utils/aleatorio.js):
//   la SEMILLA del tablero se guarda en localStorage mientras la sopa
//   no se complete → si el estudiante recarga (o cierra y abre el
//   navegador), sale LA MISMA cuadrícula. Al completarla la semilla se
//   libera: la próxima vez se genera una sopa DIFERENTE.
//
// NOTA (igual que las preguntas):
//   · Se guarda UNA sola vez, al COMPLETAR la sopa: puntaje completo
//     (localStorage mco_nota_{uid}_{claseId} + Firestore vía db.js +
//     espejo en Sheets). Si nunca la termina no se guarda nada y la
//     sopa reaparece fresca en otra sesión (con OTRO tablero).
//   · LA NOTA ES INVISIBLE: el recuadro NO muestra puntos.
//   · Docente (perfil.rol === "docente"): intentos libres, puntaje
//     local en el head morado y NADA se guarda.
//   · tipo "tarea": igual pero con mensajes neutros. tipo "examen": la
//     sopa NO guarda al completarse — espera el botón "Enviar" del
//     examen (promesa.enviar() → { puntos, maxPuntaje }); si se envía
//     sin completar guarda 0, como los demás bloques.
//
// SUMATORIA FINAL de la sesión (también oculta):
//   const nota = await obtenerNota(perfil, clase);
//   nota.puntos  // NO le sumes el valor devuelto por sopaLetras():
//                // sería duplicado (ya está dentro).
//
// Re-exporta obtenerNota(), sumarPuntos() y finalizarExamen() (viven en
// opcionMultiple.js) para que el archivo de contenido las importe de
// aquí si le resulta más cómodo, igual que las otras utils.
//
// Exporta también generarSopa(palabras, semilla) → { matriz, colocaciones, n }
// (pura y determinista: misma semilla → misma cuadrícula; la usan las
// pruebas headless).
//
// Convención: CSS implícito · 100% responsivo · fondo blanco · paleta
// del proyecto (acento VERDE #059669, libre entre las utils).
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

// Azar anti-copia: semilla del tablero PERSISTENTE por navegador
// (misma cuadrícula al recargar mientras no se complete) + PRNG
// determinista para reproducirla.
import {
  semillaNueva,
  rngDesdeSemilla,
  leerTexto,
  guardarTexto,
  borrarTexto,
} from "./aleatorio.js";

// Comodines para el archivo de contenido (misma API que opcionMultiple.js)
export { obtenerNota, sumarPuntos, finalizarExamen } from "./opcionMultiple.js";

/* ---------------- Constantes ---------------- */

const TIPOS = ["clase", "tarea", "examen"];
const MAX_PALABRAS = 12;      // 2 a 12 palabras
const MAX_LETRAS_PALABRA = 18; // tablero máximo 26×26 (más, gigante e ilegible)
const INTENTOS_POR_TAMANO = 40; // sorteos por tamaño de tablero antes de agrandar

// Las 8 direcciones (df, dc): horizontal → ←, vertical ↓ ↑ y las
// diagonales ↘ ↖ ↙ ↗ (las invertidas incluidas, como pide el docente).
const DIRECCIONES = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const CLAVE_SEMILLA = (qid) => "mco_sopa_" + qid;

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

// De "Ratón del campo" a "RATONDELCAMPO": mayúsculas, sin tildes ni
// espacios ni signos (solo A-Z y 0-9). La Ñ se vuelve N (como en las
// sopas de letras impresas).
function letraPalabra(palabra) {
  return String(palabra || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

// Alfabeto para el relleno: vocales reforzadas + consonantes comunes
// + las letras que YA usan las palabras (nada de letras ajenas raras).
function alfabetoDe(palabras) {
  const base = "AAAEIIOOUULNRST";
  const extra = [...new Set(palabras.join("").split(""))].join("");
  return (base + extra).split("");
}

/* ---------------- Generador (puro y determinista) ---------------- */

/** Coloca UNA palabra en la matriz al azar (8 direcciones, permitiendo
 *  cruzarse con otra cuando la letra coincide). Devuelve
 *  { fila, col, df, dc } o null si no encontró sitio en 220 intentos. */
function colocarPalabra(matriz, palabra, rng) {
  const n = matriz.length;
  const L = palabra.length;
  for (let intento = 0; intento < 220; intento++) {
    const [df, dc] = DIRECCIONES[Math.floor(rng() * DIRECCIONES.length)];
    const f0 = Math.floor(rng() * n);
    const c0 = Math.floor(rng() * n);
    const f1 = f0 + df * (L - 1);
    const c1 = c0 + dc * (L - 1);
    if (f1 < 0 || f1 >= n || c1 < 0 || c1 >= n) continue; // se sale
    let cabe = true;
    for (let i = 0; i < L; i++) {
      const ch = matriz[f0 + df * i][c0 + dc * i];
      if (ch && ch !== palabra[i]) { cabe = false; break; } // choque de letras
    }
    if (!cabe) continue;
    for (let i = 0; i < L; i++) matriz[f0 + df * i][c0 + dc * i] = palabra[i];
    return { fila: f0, col: c0, df, dc };
  }
  return null;
}

/** Vacia las celdas sin letra con letras al azar del alfabeto dado. */
function rellenarVacias(matriz, alfabeto, rng) {
  const n = matriz.length;
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) {
      if (!matriz[f][c]) matriz[f][c] = alfabeto[Math.floor(rng() * alfabeto.length)];
    }
  }
}

/** GENERADOR DE LA SOPA (exportado para las pruebas).
 *  Determinista: misma lista + misma semilla → EXACTAMENTE la misma
 *  cuadrícula. Palabras más largas primero (encajan mejor); posiciones
 *  y direcciones al azar; al final se rellena con letras al azar.
 *  Devuelve { matriz, colocaciones, n } o null si aun agrandando el
 *  tablero no logró colocarlas todas. */
export function generarSopa(palabras, semilla) {
  const rng = rngDesdeSemilla(semilla);
  const maxLen = Math.max(...palabras.map((p) => p.length));
  const porLargo = [...palabras].sort((a, b) => b.length - a.length);
  let n = maxLen; // cuadrícula MÍNIMA según la palabra más larga
  const tope = maxLen + 8;
  while (n <= tope) {
    for (let intento = 0; intento < INTENTOS_POR_TAMANO; intento++) {
      const matriz = Array.from({ length: n }, () => Array(n).fill(""));
      const colocaciones = [];
      let bien = true;
      for (const p of porLargo) {
        const puesta = colocarPalabra(matriz, p, rng);
        if (!puesta) { bien = false; break; }
        colocaciones.push({ palabra: p, ...puesta });
      }
      if (bien) {
        rellenarVacias(matriz, alfabetoDe(palabras), rng);
        return { matriz, colocaciones, n };
      }
    }
    n += 1; // el azar no alcanzó: cuadrícula un poco mayor
  }
  return null;
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "sopa-letras-estilos";
  estilo.textContent = `
    .sl-caja {
      background: #ffffff;
      border: 1px solid #e9f5f0;
      border-left: 4px solid #059669;
      border-radius: 1.1rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
    }

    .sl-cab {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .5rem;
    }
    .sl-etiqueta {
      background: rgba(5, 150, 105, .12);
      color: #047857;
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .sl-chip {
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      white-space: nowrap;
    }
    .sl-chip.bien { background: rgba(22, 163, 52, .12); color: #15803d; }

    .sl-indicacion {
      margin: 0 0 .8rem;
      font-size: .92rem;
      color: #4b5563;
      line-height: 1.45;
    }
    .sl-indicacion b { color: #065f46; }

    /* Tablero cuadrado: N columnas y N filas iguales (grid-auto-rows),
       la letra escala con el ancho (cqi) para no recortarse jamás. */
    .sl-tablero {
      --sl-n: 10;
      width: 100%;
      max-width: 620px;
      margin: 0 auto .8rem;
      aspect-ratio: 1 / 1;
      display: grid;
      grid-template-columns: repeat(var(--sl-n), 1fr);
      grid-auto-rows: 1fr;
      gap: 3px;
      padding: 4px;
      box-sizing: border-box;
      background: #eef2f7;
      border-radius: .8rem;
      container-type: inline-size;
    }
    .sl-celda {
      font-family: inherit;
      font-weight: 700;
      color: #1f2937;
      background: #ffffff;
      border: none;
      border-radius: 6px;
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
      font-size: clamp(8px, calc(72cqi / var(--sl-n)), 24px);
      transition: background .12s ease, transform .12s ease;
    }
    .sl-celda:hover:not(:disabled) { background: #ecfdf5; }
    .sl-celda:active:not(:disabled) { transform: scale(.93); }
    .sl-celda.inicio {
      background: #f59e0b;
      color: #ffffff;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, .35);
    }
    .sl-celda.hallada { background: #a7f3d0; color: #065f46; font-weight: 800; }
    .sl-celda.erronea { background: #fecaca; color: #b91c1c; }
    .sl-celda:disabled { cursor: default; }

    .sl-palabras {
      display: flex;
      flex-wrap: wrap;
      gap: .4rem;
      justify-content: center;
      margin: 0 0 .6rem;
    }
    .sl-palabra {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #e5e7eb;
      font-size: .82rem;
      font-weight: 700;
      padding: .22rem .7rem;
      border-radius: 999px;
    }
    .sl-palabra.tachada {
      background: #d1fae5;
      border-color: #a7f3d0;
      color: #065f46;
      text-decoration: line-through;
    }

    .sl-pie {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .6rem;
    }
    .sl-feedback { flex: 1; min-width: 0; font-size: .88rem; font-weight: 600; color: #6b7280; }
    .sl-feedback.ok { color: #16a34a; }
    .sl-feedback.aviso { color: #f97316; }

    /* Caja roja cuando el contenido llamó a la utilidad con datos inválidos */
    .sl-error-dev {
      border: 2px dashed #ef4444;
      border-left: 2px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      box-shadow: none;
    }

    @media (max-width: 767px) {
      .sl-caja { padding: 1rem; }
      .sl-feedback { font-size: .82rem; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Componente ---------------- */

/**
 * Genera una sopa de letras jugable en el contenedor indicado.
 * Devuelve una Promise<number> con la nota ganada en ESTE bloque
 * (puntaje completo al encontrar TODAS las palabras; 0 si ya estaba
 * respondida o —en examen— si se envía sin completar; queda pendiente
 * si el estudiante nunca la termina). Con tipo "examen" la promesa
 * trae además .enviar() → Promise<{ puntos, maxPuntaje }> para el
 * botón final del examen.
 */
export function sopaLetras(config = {}) {
  const { contenedor, perfil, clase, id } = config;

  const tipo = String(config.tipo || clase?.tipo || "clase").toLowerCase().trim();
  const esTipoClase = tipo === "clase";
  const esTarea = tipo === "tarea";
  const esExamen = tipo === "examen";

  // PUNTAJE OCULTO del bloque (0 a 10). Defecto: 1 (compatibilidad).
  let puntaje = Number(config.puntaje ?? 1);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 10) {
    console.warn("[sopaLetras] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
    puntaje = 1;
  }
  puntaje = redondear1(puntaje);

  let enviarExamen = null; // se define dentro del executor (solo examen)

  const promesa = new Promise((resolve) => {
    inyectarEstilos();
    construir(resolve);
  });

  function construir(resolve) {

    // --- Validaciones (avisos claros para quien escribe el contenido) ---
    const crudas = Array.isArray(config.palabras) ? config.palabras : null;
    const lista = crudas ? crudas.map(letraPalabra) : [];

    function errorDev(mensaje) {
      console.error("[sopaLetras]", mensaje);
      const div = document.createElement("div");
      div.className = "sl-caja sl-error-dev";
      div.textContent = "[sopaLetras] " + mensaje;
      contenedor.append(div);
    }

    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[sopaLetras] Falta 'contenedor' (elemento del DOM donde insertar la sopa de letras).");
      resolve(0);
      return;
    }
    if (!TIPOS.includes(tipo)) {
      errorDev(`'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
      resolve(0);
      return;
    }
    if (!crudas) {
      errorDev("Falta 'palabras' (lista de palabras a ubicar, entre 2 y 12).");
      resolve(0);
      return;
    }
    if (lista.length < 2 || lista.length > MAX_PALABRAS) {
      errorDev(`Las palabras deben ser entre 2 y ${MAX_PALABRAS} (llegaron ${lista.length}).`);
      resolve(0);
      return;
    }
    if (lista.some((p) => p.length < 2)) {
      errorDev("Hay palabras con menos de 2 letras (después de quitar tildes, espacios y signos).");
      resolve(0);
      return;
    }
    if (lista.some((p) => p.length > MAX_LETRAS_PALABRA)) {
      errorDev(`Hay palabras de más de ${MAX_LETRAS_PALABRA} letras: la cuadrícula saldría demasiado grande.`);
      resolve(0);
      return;
    }
    if (new Set(lista).size !== lista.length) {
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
    const qid = id ? slug(String(id)) : `sopa-${hash8(lista.join("|"))}`;
    const claveSemilla = CLAVE_SEMILLA(qid);

    // --- Semilla PERSISTENTE por navegador (anti-copia): mientras la
    // sopa no se complete, recargar sale con LA MISMA cuadrícula. El
    // docente no guarda nada: semilla nueva en cada montaje.
    let semilla = esDoc ? null : leerTexto(claveSemilla);
    if (!semilla) {
      semilla = semillaNueva();
      if (!esDoc) guardarTexto(claveSemilla, semilla);
    }

    // --- Generar la cuadrícula (determinista con la semilla) ---
    const gen = generarSopa(lista, semilla);
    if (!gen) {
      errorDev("No se pudo colocar todas las palabras en la cuadrícula. Recarga: el sorteo es aleatorio y normalmente entra sobrado.");
      if (!esDoc) borrarTexto(claveSemilla);
      resolve(0);
      return;
    }
    const N = gen.n;
    const lugarDe = new Map(gen.colocaciones.map((x) => [x.palabra, x]));

    // --- Estado ---
    const pendientes = new Set(lista); // palabras sin encontrar
    let halladas = 0;
    let inicio = null;          // celda de la letra INICIAL marcada { f, c }
    let bloqueada = false;
    let resuelto = false;
    let yaEnviada = false;      // examen: guardado con la marca de enviado
    let ultimoResultado = null;

    const resolverUnaVez = (valor) => {
      if (!resuelto) {
        resuelto = true;
        // Respondida (o pre-marcada respondida): la semilla se libera
        // para que la próxima sopa de este contenido sea OTRA distinta.
        if (!esDoc) borrarTexto(claveSemilla);
        resolve(valor);
      }
    };

    // --- Estructura (SIN ninguna mención al puntaje: queda oculto) ---
    const caja = document.createElement("section");
    caja.className = "sl-caja";
    caja.setAttribute("aria-label", "Sopa de letras: " + lista.join(", "));
    caja.innerHTML = `
      <div class="sl-cab">
        <span class="sl-etiqueta">${esExamen ? "Examen" : esTarea ? "Tarea" : "Sopa de letras"}</span>
        <span class="sl-chip"></span>
      </div>
      <p class="sl-indicacion">Encuentra todas las palabras: toca la letra <b>inicial</b> y luego la letra <b>final</b>. Pueden estar horizontal, vertical o diagonal, incluso <b>al revés</b>.</p>
      <div class="sl-tablero" role="grid" aria-label="Cuadrícula de letras"></div>
      <div class="sl-palabras" aria-label="Palabras por encontrar"></div>
      <div class="sl-pie">
        <span class="sl-feedback" aria-live="polite"></span>
      </div>`;

    const chipEl = caja.querySelector(".sl-chip");
    const feedbackEl = caja.querySelector(".sl-feedback");
    const tablero = caja.querySelector(".sl-tablero");
    const contPalabras = caja.querySelector(".sl-palabras");

    const feedback = (mensaje, tipoFeedback) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "sl-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const chip = (mensaje, tipoChip) => {
      chipEl.textContent = mensaje;
      chipEl.className = "sl-chip" + (tipoChip ? " " + tipoChip : "");
    };

    // --- Tablero: N × N celdas botón ---
    tablero.style.setProperty("--sl-n", String(N));
    const celdas = [];
    for (let f = 0; f < N; f++) {
      for (let c = 0; c < N; c++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sl-celda";
        b.textContent = gen.matriz[f][c];
        b.dataset.f = String(f);
        b.dataset.c = String(c);
        b.setAttribute("role", "gridcell");
        b.setAttribute("aria-label", `Fila ${f + 1}, columna ${c + 1}, letra ${gen.matriz[f][c]}`);
        b.addEventListener("click", () => alClic(f, c, b));
        tablero.append(b);
        celdas.push(b);
      }
    }

    // --- Lista de palabras (chips; tachadas al encontrarlas) ---
    const chips = new Map();
    lista.forEach((p) => {
      const s = document.createElement("span");
      s.className = "sl-palabra";
      s.textContent = p;
      contPalabras.append(s);
      chips.set(p, s);
    });

    const celdaEn = (f, c) =>
      tablero.querySelector(`.sl-celda[data-f="${f}"][data-c="${c}"]`);

    const refrescarChip = () => {
      chip(`${halladas} de ${lista.length} palabras`, halladas > 0 ? "bien" : "");
    };

    const limpiarSeleccion = () => {
      inicio = null;
      // OJO: solo quita la marca de INICIO — el destello rojo (erronea)
      // se quita solo a los 700 ms (quitarlo aquí mataría el aviso).
      celdas.forEach((b) => b.classList.remove("inicio"));
    };

    const destello = (listaCeldas) => {
      listaCeldas.forEach((b) => b && b.classList.add("erronea"));
      setTimeout(() => {
        listaCeldas.forEach((b) => b && b.classList.remove("erronea"));
      }, 700);
    };

    // Marca en verde todas las letras de una palabra hallada
    const marcarHallada = (palabra) => {
      const p = lugarDe.get(palabra);
      if (!p) return;
      for (let i = 0; i < palabra.length; i++) {
        const b = celdaEn(p.fila + p.df * i, p.col + p.dc * i);
        if (b) b.classList.add("hallada");
      }
      const chipPalabra = chips.get(palabra);
      if (chipPalabra) chipPalabra.classList.add("tachada");
    };

    const revelarTodas = () => {
      pendientes.forEach((p) => marcarHallada(p));
      halladas = lista.length;
      pendientes.clear();
      refrescarChip();
    };

    const bloquearTodo = () => {
      bloqueada = true;
      limpiarSeleccion();
      celdas.forEach((b) => (b.disabled = true));
    };

    // --- CLIC sobre una celda: marcar inicial, luego final ---
    function alClic(f, c, b) {
      if (bloqueada) return;

      // 1.er toque: queda marcada como letra INICIAL
      if (!inicio) {
        inicio = { f, c };
        b.classList.add("inicio");
        feedback("Ahora toca la letra FINAL de la palabra.", "");
        return;
      }

      // Mismo lugar → se deshace la selección
      if (inicio.f === f && inicio.c === c) {
        limpiarSeleccion();
        feedback("", "");
        return;
      }

      // 2.º toque: ¿está en línea recta con la inicial?
      const df = f - inicio.f;
      const dc = c - inicio.c;
      const enLinea = df === 0 || dc === 0 || Math.abs(df) === Math.abs(dc);
      if (!enLinea) {
        feedback("La letra final debe estar en LÍNEA RECTA con la inicial (horizontal, vertical o diagonal).", "aviso");
        destello([b, celdaEn(inicio.f, inicio.c)]);
        limpiarSeleccion();
        return;
      }

      // Las letras del segmento, en los dos sentidos
      const largo = Math.max(Math.abs(df), Math.abs(dc)) + 1;
      const pf = Math.sign(df);
      const pc = Math.sign(dc);
      let recto = "";
      let alReves = "";
      for (let i = 0; i < largo; i++) {
        const ch = gen.matriz[inicio.f + pf * i][inicio.c + pc * i];
        recto += ch;
        alReves = ch + alReves;
      }
      const candidata = pendientes.has(recto) ? recto : pendientes.has(alReves) ? alReves : null;

      if (!candidata) {
        feedback("Esas letras no forman una palabra pendiente. Sigue buscando.", "aviso");
        destello([b, celdaEn(inicio.f, inicio.c)]);
        limpiarSeleccion();
        return;
      }

      // La palabra puede empezar en la 1.ª celda tocada o al revés: el
      // trazo verde usa la colocación conocida del generador (fiable).
      marcarHallada(candidata); // usa la colocación conocida (fiable siempre)
      pendientes.delete(candidata);
      halladas += 1;
      limpiarSeleccion();

      if (pendientes.size === 0) {
        completar();
        return;
      }
      refrescarChip();
      feedback(`Encontraste "${candidata}" (${halladas} de ${lista.length}). Sigue así.`, "ok");
    }

    // --- TODAS encontradas → cierre del bloque según tipo y rol ---
    function completar() {
      bloquearTodo();
      if (esDoc) {
        registrarPuntoDocente(perfil, clase, qid, puntaje);
        chip("¡Completada! · vista docente", "bien");
        feedback("¡Todas las palabras encontradas! El puntaje está arriba y nada se guarda.", "ok");
        resolverUnaVez(puntaje);
        return;
      }
      if (esExamen) {
        // El examen guarda al ENVIAR (botón final del archivo del examen)
        chip("Lista para enviar", "bien");
        feedback("¡Sopa completada! El examen la enviará con el botón final.", "ok");
        resolverUnaVez(puntaje);
        return;
      }
      chip("¡Completada!", "bien");
      feedback("¡Excelente! Encontraste todas las palabras.", "ok");
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
      feedback("Completa la sopa; el examen la enviará todas al final.", "");
    } else if (esTarea) {
      refrescarChip();
      feedback("Encuentra todas las palabras para completar la tarea.", "");
    } else {
      refrescarChip();
    }

    // --- EXAMEN: el botón lo pone el archivo del examen ---
    enviarExamen = async function () {
      if (esDoc) {
        const ganado = pendientes.size === 0 ? puntaje : 0;
        registrarPuntoDocente(perfil, clase, qid, ganado);
        chip("Vista docente", "");
        feedback("Enviado. El puntaje está en el head de arriba; nada se guarda.", "");
        resolverUnaVez(ganado);
        return { puntos: ganado, maxPuntaje: puntaje, docente: true };
      }

      if (yaEnviada) {
        return ultimoResultado || { puntos: 0, maxPuntaje: puntaje, yaEnviado: true };
      }

      // UNA sola oportunidad: completada → puntaje completo; sin
      // completar → 0 (igual que los demás bloques del examen).
      const ganado = pendientes.size === 0 ? puntaje : 0;
      bloquearTodo();
      chip("Enviada", "");
      feedback(
        ganado > 0
          ? "Sopa enviada: estaba completada."
          : "Sopa enviada sin completar todas las palabras.",
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
        if (resuelto || bloqueada || halladas > 0 || inicio) return; // ya interactuó en esta sesión
        const guardado = nota.preguntas ? nota.preguntas[qid] : undefined;
        const hecha = guardado != null;

        if (esExamen && (nota.enviado || hecha)) {
          yaEnviada = true;
          ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje, yaEnviado: true };
          revelarTodas();
          bloquearTodo();
          chip("Examen enviado", "");
          feedback("Ya enviaste este examen.", "");
          resolverUnaVez(0);
          return;
        }
        if (hecha) {
          revelarTodas(); // clase: las palabras quedan a la vista, como las correctas de una pregunta
          bloquearTodo();
          chip("Respondida", "bien");
          feedback(esTarea ? "Ya enviaste esta tarea." : "Ya completaste esta sopa de letras.", "ok");
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