// ============================================================
// opcionMultiple.js — Pregunta de opción múltiple reutilizable
// (js/utils/opcionMultiple.js) · v6.3: guardarPreguntaExamen() YA NO
// marca nota.enviado — la marca de «enviado» la pone SOLO
// finalizarExamen(): así el envío INDIVIDUAL de UNA respuesta
// (respuestaSimple/video con su botón propio en el examen) guarda su
// valor sin CERRAR el examen entero (antes bastaba enviar una sola
// respuesta para que al reabrir el examen apareciera «enviado» con
// UNA sola pregunta: los demás bloques ya no podían enviar la
// suya). Además sumarPuntos() acepta SUBIR el valor de una pregunta
// ya guardada (total mayor en el 2.º intento): actualiza localStorage
// + Firestore + Sheets con el nuevo total · antes v6.2:
// finalizarExamen() marca el registro compartido
// window.__mcoEnvioExamen (claseId + enviando/enviado) ANTES de
// escribir el bloqueo automático, para que el vigía (clases.js v7.3)
// NO expulse al estudiante por SU propio envío
// («saca los estudiantes») · antes v6.1: finalizarExamen() BLOQUEA la
// pieza para el estudiante en cuanto envía su examen (db.clases.
// bloquearEstudiante → bloqueadas.{uid}: solo puede revisar su
// puntaje con «Mi puntaje») · v6: OPCIONES EN ORDEN ALEATORIO
// (anti-copia) PERSISTENTE por navegador hasta responder (js/utils/
// aleatorio.js); antes v5: TAMAÑO en pantalla — 'columnas'
// (2 = mitad del ancho, 3 = tercio, 4 = cuarto → varias preguntas LADO
// A LADO) o 'ancho' ("320px", "50%", 0.5…); antes v4: FÓRMULAS
// matemáticas ($…$), vía js/utils/formatearFormulas.js (antes v3:
// TIPOS clase/tarea/examen, docente con intentos libres, espejo Sheets)
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: inserta
// una pregunta interactiva en el elemento que se indique.
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { opcionMultiple } from "../../../js/utils/opcionMultiple.js";
//
//   opcionMultiple({
//     contenedor,           // elemento del DOM donde insertar la pregunta
//     perfil,               // perfil del usuario (users/{uid}: uid, rol, nie?)
//     clase,                // { id, grado, materiaId, materia?, dia?, unidad?, leccion? }
//     tipo: "clase",        // "clase" | "tarea" | "examen"  (defecto: "clase")
//     indicacion: "¿Cuánto es $\\frac{3}{4} + \\frac{1}{4}$?",  // ← admite fórmulas
//     respuestas: ["$\\frac{4}{8}$", "$\\frac{1}{2}$", "1", "$\\frac{3}{8}$"],
//                           // entre 2 y 6 textos, cada uno admite $…$
//     respuestaCorrecta: 2, // NÚMERO de la respuesta correcta (1 = primera)
//     puntaje: 2,           // valor de esta pregunta (0 a 10)
//     // columnas: 2,       // NUEVO v5: la pregunta ocupa LA MITAD del ancho
//     //                    //  (2 preguntas montadas en el MISMO contenedor
//     //                    //  quedan LADO A LADO; 3 = tercio, 4 = cuarto)
//     // ancho: "320px",    // NUEVO v5: ancho fijo ("50%", "18rem", 0.5…)
//     // id: "p1",          // (opcional) identificador único y estable
//   }).then((ganado) => { /* nota ganada en ESTA pregunta (oculta) */ });
//
// TAMAÑO EN PANTALLA (v5, TODAS las utils):
//   Si la pregunta y sus respuestas son cortas, el bloque no necesita
//   todo el ancho: 'columnas: 2' lo deja a la mitad y la siguiente
//   pregunta con 'columnas: 2' se coloca A SU LADO (mismo contenedor).
//   'ancho' acepta cualquier valor CSS o una fracción. En móvil
//   (<768px) TODO vuelve a una sola columna para que nada se apriete.
//
// FÓRMULAS (v4): TODO texto (indicación y opciones) acepta LaTeX entre
//   $…$ (en la línea) o $$…$$ (centrado), renderizado con KaTeX por
//   js/utils/formatearFormulas.js. Sin $ se muestra como texto normal
//   (los contenidos viejos siguen igual). Si el CDN no responde, la
//   fórmula se ve como su LaTeX plano: nunca se rompe la página.
//
// REGLA DE PUNTAJE (estudiante): 1.er intento correcto → puntaje
//   completo · 2.º intento correcto → la MITAD con 1 decimal ·
//   fallada en los dos → 0. La nota NUNCA se muestra en pantalla
//   (solo el examen muestra la NOTA final, a cargo del archivo del
//   examen). Si ganó 0 no se guarda nada: la pregunta reaparece
//   fresca en otra sesión; si ya está respondida se bloquea
//   ("Respondida") leyendo la nota en Firestore + localStorage.
//
// ─── TIPO "clase" (defecto) ───
//   Dos intentos (completo/mitad). MUESTRA si la respuesta es
//   correcta (verde/roja + feedback). Botón "Enviar respuesta".
//
// ─── TIPO "tarea" ───
//   Los mismos dos intentos y el mismo puntaje, pero la UI es
//   NEUTRA: nunca dice si la respuesta final fue correcta ni
//   marca opciones en verde/rojo. Botón "Enviar respuesta": el
//   1.er envío vale completo y el 2.º (si lo hay, aunque el 1.º
//   hubiera sido correcto) es EL QUE CUENTA: correcto → mitad,
//   incorrecto → 0. Tras el 2.º envío se bloquea.
//
// ─── TIPO "examen" ───
//   SIN botón propio: el archivo del examen pone SU botón "Enviar"
//   al final y envía todos los bloques de una vez:
//
//     const p = opcionMultiple({ ..., tipo: "examen" });
//     // ... el estudiante responde ...
//     const r = await p.enviar();  // → { puntos, maxPuntaje } del bloque
//     // ... tras todos los bloques:
//     const resumen = await finalizarExamen(perfil, clase, { titulo });
//     // resumen.puntos = nota del examen (mostrarla en pantalla)
//
//   · enviar() califica el bloque (una sola oportunidad: correcta →
//     puntaje completo, vacía/incorrecta → 0), lo guarda con la
//     marca de examen enviado y devuelve el resultado al examen.
//   · finalizarExamen() fija nota.enviado = true y reporta el TOTAL
//     al Sheet UNA sola vez (fila del examen × columna del NIE):
//     el examen queda bloqueado aunque cierre y abra sesión.
//   · Al cargar, si nota.enviado → todos los bloques aparecen
//     bloqueados ("Examen enviado").
//   · No muestra cuáles están correctas. SOLO si el docente marca
//     en la configuración del examen mostrarCorrectas: true se
//     revelan al enviar (opción correcta en verde). La nota
//     obtenida la muestra el archivo del examen con resumen.puntos.
//
// ─── DOCENTE (perfil.rol === "docente") ───
//   Intentos ILIMITADOS y NADA se guarda: ni Firestore, ni Sheets,
//   ni localStorage de notas. El puntaje de la clase se muestra en
//   un head morado DEBAJO DE LA USERBAR (sticky) y vive SOLO en
//   la pestaña (sessionStorage): cerrar la app lo borra.
//
// Persistencia (estudiante): localStorage "mco_nota_{uid}_{claseId}"
//   (instantáneo) + notas/{uid}/clases/{claseId} en Firestore vía
//   js/data/db.js (fuente de verdad) + ESPEJO en Google Sheets
//   (db.notas.reportarActividad) para las tablas del docente y para
//   que una actividad hecha no se rehaga. Cada pregunta guarda su
//   valor UNA sola vez (clave: id, o slug del texto + hash).
//
// SUMATORIA FINAL de la sesión (también oculta):
//   const nota = await obtenerNota(perfil, clase);
//   nota.puntos  // suma de TODAS las preguntas respondidas. NO le
//                // sumes el valor devuelto por opcionMultiple().
//
// TAMAÑO compartido (v5): aplicarTamano() vive aquí y lo usan TAMBIÉN
//   multipleOpcion.js, respuestaSimple.js, relacionar.js y ordenar.js
//   (una sola hoja de estilos "utils-tamano-estilos" para las 5).
//
// Compatibilidad: también acepta los nombres antiguos pregunta /
//   opciones / correcta, y puntaje por defecto = 1.
//
// Compartido con multipleOpcion.js (v4): esta utilidad también exporta
//   esDocente(), prepararDocente() y registrarPuntoDocente() (el head
//   morado del docente: UNO solo para todas las utils) y
//   guardarPreguntaExamen() (guardado de un bloque de examen), para
//   que todas las utilidades se comporten igual.
//
// Convención: CSS implícito · 100% responsivo · fondo blanco · paleta del proyecto.
// ============================================================

// REGLA DEL PROYECTO: nada toca Firestore o Sheets directo → todo pasa por db.js
import { db } from "../data/db.js";

// Fórmulas: cargarFormulas() trae KaTeX (una sola vez) y
// textoConFormulas() convierte "$…$" en fórmula renderizada.
import { cargarFormulas, textoConFormulas } from "./formatearFormulas.js";

// Azar anti-copia (v6): orden aleatorio de las opciones PERSISTENTE
// por navegador hasta responder la pregunta (js/utils/aleatorio.js).
import { ordenAlAzar, ordenPersistente, liberarOrden, claveOrden } from "./aleatorio.js";

/* ---------------- Constantes ---------------- */

const LETRAS = ["A", "B", "C", "D", "E", "F"];
const TIPOS = ["clase", "tarea", "examen"];
const CLAVE_NOTA = (uid, claseId) => `mco_nota_${uid}_${claseId}`;
const CLAVE_DOCENTE = (uid, claseId) => `mco_docente_${uid}_${claseId}`;

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

// Mini hash djb2 → evita que dos preguntas distintas compartan id
function hash8(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

// Redondeo a 1 decimal (la mitad del puntaje siempre con un decimal)
function redondear1(n) {
  return Math.round(Number(n) * 10) / 10;
}

/* ---------------- TAMAÑO en pantalla (v5 · compartido) ----------------
   Todas las utils aceptan 'columnas' (2, 3 o 4 → el bloque ocupa la
   mitad/tercio/cuarto del ancho y las preguntas montadas en el MISMO
   contenedor quedan LADO A LADO) o 'ancho' (fracción 0..1 o texto CSS
   tipo "320px", "50%"). Por defecto todo el ancho, como siempre.
   En móvil (<768px) la hoja compartida devuelve todo a una columna.
   La usan TAMBIÉN multipleOpcion / respuestaSimple / relacionar /
   ordenar (misma hoja de estilos, inyectada UNA sola vez). */

let estilosTamanoListos = false;

function inyectarEstilosTamano() {
  if (estilosTamanoListos) return;
  estilosTamanoListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-tamano-estilos";
  estilo.textContent = `
    /* Bloques con tamaño reducido: en línea para que dos o tres
       quepan en la misma fila, alineados por arriba. */
    .utils-media {
      display: inline-block;
      vertical-align: top;
      box-sizing: border-box;
    }
    /* Separación SOLO entre bloques de tamaño (hermanos directos) */
    .utils-media + .utils-media { margin-left: 1rem; }
    /* Móvil: siempre una columna para que nada se apriete */
    @media (max-width: 767px) {
      .utils-media {
        display: block;
        width: 100% !important;
        margin-left: 0 !important;
      }
    }
  `;
  document.head.append(estilo);
}

/** Aplica el tamaño de pantalla a la caja de una utilidad.
 *  columnas: 2|3|4 → calc del ancho en partes iguales ·
 *  ancho: fracción (0<n<1 → %) o texto CSS ("320px", "50%", "18rem").
 *  Devuelve true si aplicó un ancho especial. Errores de contenido:
 *  solo aviso en consola (cosmético, nunca rompe la pregunta).
 *
 *  LLAMAR DESPUÉS de contenedor.append(caja): si la caja quedó SOLA en
 *  su contenedor directo (típico: un div por pregunta), el tamaño se
 *  aplica al CONTENEDOR — así dos preguntas montadas cada una en su
 *  propio div también quedan LADO A LADO. Si el contenedor tiene más
 *  contenido, el tamaño va a la caja (hermanas directas). Nunca se
 *  aplica al contenedor principal de la app (main o #app). */
export function aplicarTamano(caja, opciones = {}) {
  if (!caja || !caja.classList) return false;

  let css = "";
  let columnas = Number(opciones.columnas ?? opciones.cols);
  const ancho = opciones.ancho ?? opciones.width;

  if (columnas != null && Number.isFinite(columnas) && columnas !== 1) {
    if (Number.isInteger(columnas) && columnas >= 2 && columnas <= 4) {
      // k columnas → cada una (100% − (k−1)rem de separaciones) / k
      css = `calc((100% - ${columnas - 1}rem) / ${columnas})`;
    } else {
      console.warn(
        "[utils] 'columnas' debe ser 1, 2, 3 o 4 (llegó:", opciones.columnas,
        "). Se ignora."
      );
    }
  }
  if (!css && ancho != null && ancho !== "") {
    if (typeof ancho === "number" && ancho > 0 && ancho < 1) {
      css = String(Math.round(ancho * 10000) / 100) + "%";
    } else if (typeof ancho === "string" && ancho.trim()) {
      css = ancho.trim();
    } else {
      console.warn(
        "[utils] 'ancho' debe ser una fracción entre 0 y 1 (ej. 0.5) o un " +
        'texto CSS (ej. "320px", "50%"). Llegó:', ancho, ". Se ignora."
      );
    }
  }
  if (!css) return false;

  inyectarEstilosTamano();

  // ¿La caja quedó SOLA en su contenedor directo? (sin otros elementos
  // ni texto) y el contenedor no es el main de la app → el tamaño va al
  // contenedor, para que funcione también con un div por pregunta.
  const padre = caja.parentElement;
  const esPrincipal =
    !padre || padre === document.body ||
    padre.tagName === "MAIN" || padre.id === "app";
  const padreExclusivo =
    !esPrincipal &&
    padre.children.length === 1 && padre.children[0] === caja &&
    ![...padre.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim()
    );

  const el = padreExclusivo ? padre : caja;
  el.classList.add("utils-media");
  el.style.width = css;
  return true;
}

export function esDocente(perfil) {
  return perfil?.rol === "docente";
}

/* ---------------- Head del docente (puntaje SOLO local) ----------------
   Barra sticky justo debajo de la userbar con el puntaje acumulado de
   la clase que el docente está probando. NADA va a ninguna db: vive
   en la pestaña (sessionStorage) y muere al cerrarla. */

let docenteEstado = { clave: null, valores: {}, el: null };

function claveDocente(perfil, clase) {
  return `${perfil?.uid || "?"}::${clase?.id || "?"}`;
}

// Al montar un bloque docente: restaura lo acumulado de esta clase
// (sessionStorage) y pinta el head si ya hay puntaje que mostrar.
export function prepararDocente(perfil, clase) {
  const clave = claveDocente(perfil, clase);
  if (docenteEstado.clave !== clave) {
    docenteEstado = { clave, valores: {}, el: null };
  }
  try {
    const d = JSON.parse(sessionStorage.getItem(CLAVE_DOCENTE(perfil.uid, clase.id)) || "null");
    if (d && d.valores && typeof d.valores === "object") {
      docenteEstado.valores = { ...docenteEstado.valores, ...d.valores };
    }
  } catch (e) { /* sessionStorage no disponible: queda en memoria */ }
  if (Object.keys(docenteEstado.valores).length) pintarHeadDocente();
}

// Registra el último valor ganado en UNA pregunta del docente y
// actualiza el head (cada pregunta aporta su ÚLTIMO valor).
export function registrarPuntoDocente(perfil, clase, qid, valor) {
  const clave = claveDocente(perfil, clase);
  if (docenteEstado.clave !== clave) {
    docenteEstado = { clave, valores: {}, el: null };
  }
  docenteEstado.valores[qid] = redondear1(valor);
  try {
    sessionStorage.setItem(
      CLAVE_DOCENTE(perfil.uid, clase.id),
      JSON.stringify({ valores: docenteEstado.valores })
    );
  } catch (e) { /* ignorar */ }
  pintarHeadDocente();
}

function totalDocente() {
  return redondear1(
    Object.values(docenteEstado.valores).reduce((s, v) => s + (Number(v) || 0), 0)
  );
}

function pintarHeadDocente() {
  const app = document.getElementById("app") || document.body;
  if (!docenteEstado.el || !docenteEstado.el.isConnected) {
    const barra = document.createElement("div");
    barra.className = "om-head-docente";
    barra.setAttribute("role", "status");
    barra.innerHTML =
      '<span class="om-head-docente-etq">Vista docente · puntaje de la clase (solo local, no se guarda)</span>' +
      '<span class="om-head-docente-pts"></span>';
    app.prepend(barra);
    docenteEstado.el = barra;
  }
  docenteEstado.el.querySelector(".om-head-docente-pts").textContent =
    totalDocente() + " pts";
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "opcion-multiple-estilos";
  estilo.textContent = `
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

    .om-caja {
      background: #ffffff;
      border: 1px solid #ece9f6;
      border-left: 4px solid #7c3aed;
      border-radius: 1.1rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
    }

    .om-cab {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .5rem;
    }
    .om-etiqueta {
      background: rgba(124, 58, 237, .12);
      color: #7c3aed;
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .om-chip {
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      white-space: nowrap;
    }
    .om-chip.aviso { background: rgba(249, 115, 22, .14); color: #c2410c; }
    .om-chip.bien { background: rgba(22, 163, 52, .12); color: #15803d; }
    .om-chip.mal { background: rgba(239, 68, 68, .12); color: #b91c1c; }

    .om-pregunta {
      margin: 0 0 .85rem;
      font-size: 1.02rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.45;
    }

    .om-opciones {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: .55rem;
    }
    .om-opcion {
      display: flex;
      align-items: center;
      gap: .6rem;
      text-align: left;
      font-family: inherit;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: .9rem;
      padding: .6rem .7rem;
      cursor: pointer;
      font-size: .92rem;
      color: #374151;
      transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
    }
    .om-opcion:hover:not(:disabled) {
      border-color: #7c3aed;
      box-shadow: 0 4px 14px rgba(124, 58, 237, .12);
    }
    .om-opcion:disabled { cursor: default; opacity: .85; }

    .om-letra {
      flex: none;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: .72rem;
      font-weight: 800;
      background: rgba(124, 58, 237, .12);
      color: #7c3aed;
    }
    .om-texto { flex: 1; min-width: 0; }

    .om-opcion.seleccionada { border-color: #7c3aed; background: rgba(124, 58, 237, .07); }
    .om-opcion.seleccionada .om-letra { background: #7c3aed; color: #ffffff; }

    .om-opcion.correcta { border-color: #16a34a; background: rgba(22, 163, 52, .08); }
    .om-opcion.correcta .om-letra { background: #16a34a; color: #ffffff; }

    .om-opcion.erronea { border-color: #ef4444; background: rgba(239, 68, 68, .07); animation: om-shake .3s ease; }
    .om-opcion.erronea .om-letra { background: #ef4444; color: #ffffff; }
    @keyframes om-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .om-pie {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: .85rem;
    }
    .om-feedback { flex: 1; min-width: 0; font-size: .88rem; font-weight: 600; color: #6b7280; }
    .om-feedback.ok { color: #16a34a; }
    .om-feedback.aviso { color: #f97316; }
    .om-feedback.mal { color: #ef4444; }

    .om-enviar {
      font-family: inherit;
      background: #7c3aed;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .55rem 1.1rem;
      font-size: .88rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(124, 58, 237, .3);
      transition: background .15s ease, transform .15s ease;
    }
    .om-enviar:hover:not(:disabled) { background: #6d28d9; }
    .om-enviar:active:not(:disabled) { transform: scale(.98); }
    .om-enviar:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
    }

    /* Caja roja cuando el contenido llamó a la utilidad con datos inválidos */
    .om-error-dev {
      border: 2px dashed #ef4444;
      border-left: 2px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      box-shadow: none;
    }

    @media (max-width: 767px) {
      .om-head-docente { top: 52px; padding: .4rem 1rem; }
      .om-caja { padding: 1rem; }
      .om-opciones { grid-template-columns: 1fr; }
      .om-pie { flex-direction: column-reverse; align-items: stretch; }
      .om-enviar { justify-content: center; }
    }
  `;
  document.head.append(estilo);
}

/* ------------- Nota de la sesión (localStorage + Firestore + Sheets) ------------- */

function leerNotaLocal(uid, claseId) {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_NOTA(uid, claseId)) || "null");
    if (!d || typeof d !== "object") return { puntos: 0, preguntas: {}, enviado: false };
    return {
      puntos: Number(d.puntos) || 0,
      preguntas: d.preguntas && typeof d.preguntas === "object" ? d.preguntas : {},
      enviado: !!d.enviado,
    };
  } catch (e) {
    return { puntos: 0, preguntas: {}, enviado: false };
  }
}

function guardarNotaLocal(uid, claseId, nota) {
  try {
    localStorage.setItem(
      CLAVE_NOTA(uid, claseId),
      JSON.stringify({
        puntos: nota.puntos,
        preguntas: nota.preguntas,
        enviado: !!nota.enviado,
      })
    );
  } catch (e) { /* ignorar */ }
}

function recalcular(nota) {
  nota.puntos = redondear1(
    Object.values(nota.preguntas).reduce((s, p) => s + (Number(p) || 0), 0)
  );
  return nota;
}

/** Nota de UNA sesión (clase/tarea/examen) del usuario. El docente
 *  SIEMPRE recibe ceros: él no genera nota ni guarda nada. */
export async function obtenerNota(perfil, clase) {
  if (!perfil?.uid || !clase?.id || esDocente(perfil)) {
    return { puntos: 0, preguntas: {}, enviado: false };
  }
  const local = leerNotaLocal(perfil.uid, clase.id);
  try {
    const remota = await db.notas.leer(perfil.uid, clase.id);
    if (remota) {
      const preguntas = { ...(remota.preguntas || {}), ...local.preguntas };
      // El total SIEMPRE se recalcula del mapa por pregunta (fuente de verdad)
      const nota = {
        puntos: 0,
        preguntas,
        enviado: !!(remota.enviado || local.enviado),
      };
      if (remota.tipo) nota.tipo = remota.tipo;
      recalcular(nota);
      guardarNotaLocal(perfil.uid, clase.id, nota);
      return nota;
    }
  } catch (e) { /* sin Firestore o sin permisos: queda la copia local */ }
  return local;
}

/** Espejo en Sheets del TOTAL de la actividad (mejor esfuerzo). */
function reportarEspejo(perfil, clase, tipo, puntos) {
  db.notas
    .reportarActividad({
      perfil: { nie: perfil.nie, nombre: perfil.nombre },
      clase,
      materia: clase.materia || clase.materiaId,
      grado: clase.grado,
      tipo,
      actividadId: tipo === "clase" ? undefined : clase.id,
      puntos,
      titulo: clase.titulo || clase.clase || "",
    })
    .catch(() => {});
}

/** Suma puntos de UNA pregunta. v6.3 — si la pregunta ya tenía valor,
 *  el NUEVO solo entra cuando es MAYOR (el 2.º intento de una clase
 *  que reúne más aciertos actualiza localStorage + Firestore + Sheets
 *  con el total real); igual o menor no toca nada (no baja jamás y no
 *  re-espeja). El docente NO guarda nada (devuelve la nota en ceros). */
export async function sumarPuntos(perfil, clase, preguntaId, puntos, opciones = {}) {
  if (!perfil?.uid || !clase?.id || esDocente(perfil)) {
    return { puntos: 0, preguntas: {}, enviado: false };
  }
  const tipo = String(opciones.tipo || clase.tipo || "clase").toLowerCase();
  const nota = await obtenerNota(perfil, clase);
  const previo = nota.preguntas[preguntaId];
  if (previo != null && Number(previo) >= Number(puntos)) return nota; // ya sumó igual o más

  nota.preguntas[preguntaId] = Number(puntos) || 0;
  nota.tipo = tipo;
  recalcular(nota);
  guardarNotaLocal(perfil.uid, clase.id, nota);

  // 1) Firestore vía db.js (fuente de verdad de la nota). Se pasa el
  //    CONTEXTO de la pieza para el espejo users/{uid}.notas (nota del día).
  try {
    await db.notas.guardar(perfil.uid, clase.id, nota, {
      tipo,
      clase,
      titulo: opciones.titulo,
    });
  } catch (e) {
    console.warn("[nota] Firestore no disponible, queda en localStorage:", e?.code || e);
  }

  // 2) Espejo en Sheets con el TOTAL de la actividad (mejor esfuerzo).
  //    Solo clase y tarea: el examen se reporta UNA vez y con el
  //    total completo desde finalizarExamen().
  if (tipo === "clase" || tipo === "tarea") {
    reportarEspejo(perfil, clase, tipo, nota.puntos);
  }

  return nota;
}

/** CIERRE DE UN EXAMEN: fija la marca de "enviado" en la nota y
 *  reporta el TOTAL al Sheet UNA sola vez. La llama el archivo del
 *  examen justo después de enviar todos los bloques; los bloques ya
 *  guardaron su valor al responder enviar(). Docente: no hace nada.
 *  NUEVO v7.2 — BLOQUEO AUTOMÁTICO: tras guardar la nota, deja la
 *  pieza BLOQUEADA para ese estudiante (bloqueadas.{uid} = true vía
 *  db.clases.bloquearEstudiante; mejor esfuerzo). Ya no puede volver
 *  a entrar: solo revisar sus resultados con «Mi puntaje». */
export async function finalizarExamen(perfil, clase, opciones = {}) {
  if (!perfil?.uid || !clase?.id) return { ok: false, razon: "datos" };
  if (esDocente(perfil)) {
    return { ok: true, docente: true, yaEnviado: false, puntos: 0 };
  }
  const titulo = String(
    opciones.titulo ?? clase.titulo ?? clase.clase ?? ""
  ).trim();

  // ── NUEVO v6.2 · REGISTRO COMPARTIDO DEL ENVÍO ──
  // Antes de tocar Firestore, marca en window.__mcoEnvioExamen que
  // ESTE examen (claseId) está ENVIANDO. El vigía de clases.js v7.3
  // lee esta marca cuando llega el bloqueo automático
  // (bloqueadas.{uid}) y así NO expulsa al estudiante por SU PROPIO
  // envío aunque la nota local de localStorage falte o falle.
  try {
    const reg = (window.__mcoEnvioExamen = window.__mcoEnvioExamen || {});
    reg.claseId = clase.id;
    reg.enviando = true;
  } catch (e) { /* sin window: queda la nota local */ }

  const nota = await obtenerNota(perfil, clase);
  const yaEnviado = !!nota.enviado;
  nota.enviado = true;
  nota.tipo = "examen";
  recalcular(nota);
  guardarNotaLocal(perfil.uid, clase.id, nota); // SIEMPRE antes de bloquear

  try {
    await db.notas.guardar(perfil.uid, clase.id, nota, {
      tipo: "examen",
      clase,
      titulo,
    });
  } catch (e) {
    console.warn("[finalizarExamen] Firestore no disponible:", e?.code || e);
  }

  // ── NUEVO v7.2 · BLOQUEO AUTOMÁTICO POR ENVÍO ──
  // En cuanto el examen queda ENVIADO, la pieza se bloquea SOLA para
  // ese estudiante (db.clases.bloquearEstudiante escribe
  // bloqueadas.{uid} = true, sin pisar el mapa del docente): ya no
  // puede volver a entrar; solo revisar sus resultados desde la
  // tarjeta (botón «Mi puntaje»). El TIMER y el botón de enviar
  // llegan aquí por el mismo camino, y también el auto-envío de la
  // próxima visita tras una salida forzada. MEJOR ESFUERZO: si
  // falla (sin conexión / pieza borrada), el envío no se pierde y
  // el bloqueo se vuelve a intentar en la próxima visita.
  try {
    if (clase.grado != null && clase.materiaId) {
      await db.clases.bloquearEstudiante(
        clase.grado, clase.materiaId, clase.id, perfil.uid
      );
    }
  } catch (e) {
    console.warn("[finalizarExamen] bloqueo automático no guardó:", e?.code || e);
  } finally {
    // v6.2 — el envío terminó (con o sin bloqueo): queda ENVIADO en
    // el registro compartido; el vigía ya no lo expulsa por esto.
    try {
      const reg2 = window.__mcoEnvioExamen;
      if (reg2 && reg2.claseId === clase.id) {
        reg2.enviando = false;
        reg2.enviado = true;
      }
    } catch (e) { /* nada */ }
  }

  const espejo = await db.notas
    .reportarActividad({
      perfil: { nie: perfil.nie, nombre: perfil.nombre },
      clase,
      materia: clase.materia || clase.materiaId,
      grado: clase.grado,
      tipo: "examen",
      actividadId: clase.id,
      puntos: nota.puntos,
      titulo,
    })
    .catch(() => ({ ok: false, razon: "red" }));

  return { ok: true, yaEnviado, puntos: nota.puntos, espejo };
}

/** GUARDADO DE UNA PREGUNTA/BLOQUE DE EXAMEN (estudiante): fija el
 *  valor (0 incluido) y lo guarda en localStorage + Firestore vía
 *  db.js. v6.3 — YA NO marca nota.enviado: la marca de «enviado» la
 *  fija SOLO finalizarExamen(), que corre SIEMPRE justo después del
 *  recorrido del registro (botón Enviar, timer, volver-insistente,
 *  auto-envío de reentrada). Con esto el guardado INDIVIDUAL de una
 *  respuesta (respuestaSimple/video con botón propio en el examen)
 *  no cierra el examen entero: los demás bloques siguen disponibles
 *  y sus respuestas SÍ llegan a Firebase en el envío final. El ESPEJO
 *  en Sheets NO va aquí: lo reporta finalizarExamen() UNA sola vez
 *  con el TOTAL. Compartida por opcionMultiple.js, multipleOpcion.js,
 *  relacionar.js, blank.js, ordenar.js, constructorOraciones.js,
 *  clasificar.js, sopaLetras.js, crucigrama.js y respuestaSimple.js.
 *  Docente: no hace nada. */
export async function guardarPreguntaExamen(perfil, clase, preguntaId, ganado) {
  if (!perfil?.uid || !clase?.id || esDocente(perfil)) return null;
  const nota = await obtenerNota(perfil, clase);
  nota.preguntas[preguntaId] = Number(ganado) || 0; // el examen guarda SIEMPRE (0 incluido)
  nota.tipo = "examen";
  // v6.3 — SIN nota.enviado aquí: el examen sigue ABIERTO hasta que
  // finalizarExamen() lo cierre (marcado + bloqueo + Sheets).
  recalcular(nota);
  guardarNotaLocal(perfil.uid, clase.id, nota);
  try {
    await db.notas.guardar(perfil.uid, clase.id, nota, { tipo: "examen", clase });
  } catch (e) {
    console.warn("[examen] Firestore no disponible, queda en localStorage:", e?.code || e);
  }
  return nota;
}

/** NUEVO v6 — MARCA DE SALIDA FORZADA (estudiante, examen): deja
 *  escrito en localStorage que el examen quedó ENVIADO con lo que
 *  llevaba. La llama la página del examen en `pagehide` (cierre de
 *  pestaña / recarga / logout) mientras NO se haya enviado: es una
 *  escritura SÍNCRONA, sobrevive al cierre. En la próxima visita la
 *  página ve nota.enviado → auto-finaliza (reporta el TOTAL al Sheet;
 *  lo no respondido ya quedó sin puntos = incorrecto).
 *  Devuelve true si dejó la marca. Docente: no hace nada. */
export function marcarEnvioPendiente(perfil, clase) {
  if (!perfil?.uid || !clase?.id || esDocente(perfil)) return false;
  try {
    const nota = leerNotaLocal(perfil.uid, clase.id);
    if (nota.enviado) return false;                       // ya estaba enviada
    if (!Object.keys(nota.preguntas || {}).length) return false;  // nada respondido
    nota.enviado = true;
    nota.tipo = "examen";
    guardarNotaLocal(perfil.uid, clase.id, nota);
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------------- Componente ---------------- */

/**
 * Inserta una pregunta de opción múltiple en el contenedor indicado.
 * Devuelve una Promise<number> con la nota ganada en ESTA pregunta
 * (puntaje completo / mitad con 1 decimal / 0; queda pendiente si el
 * estudiante nunca la termina). Con tipo "examen" la promesa trae
 * además .enviar() → Promise<{ puntos, maxPuntaje }> para el botón
 * final del examen.
 */
export function opcionMultiple(config = {}) {
  const {
    contenedor,
    perfil,
    clase,
    id,
    indicacion, pregunta,         // pregunta = nombre antiguo (compatibilidad)
    respuestas, opciones,         // opciones   = nombre antiguo (compatibilidad)
    respuestaCorrecta, correcta,  // correcta   = nombre antiguo (compatibilidad)
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

  // PUNTAJE OCULTO de esta pregunta (0 a 10). Defecto: 1 (compatibilidad v1).
  let puntaje = Number(config.puntaje ?? 1);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 10) {
    console.warn("[opcionMultiple] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
    puntaje = 1;
  }
  puntaje = redondear1(puntaje);

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
    const lista = (Array.isArray(respuestas) ? respuestas
      : Array.isArray(opciones) ? opciones : []).map((o) => String(o ?? "").trim());
    const idx = Number(respuestaCorrecta ?? correcta);

    function errorDev(mensaje) {
      console.error("[opcionMultiple]", mensaje);
      const div = document.createElement("div");
      div.className = "om-caja om-error-dev";
      div.textContent = "[opcionMultiple] " + mensaje;
      contenedor.append(div);
    }

    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[opcionMultiple] Falta 'contenedor' (elemento del DOM donde insertar la pregunta).");
      resolve(0);
      return;
    }
    if (!TIPOS.includes(tipo)) {
      errorDev(`'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
      resolve(0);
      return;
    }
    if (!texto) { errorDev("Falta la indicación de la pregunta."); resolve(0); return; }
    if (lista.length < 2 || lista.length > 6) {
      errorDev(`Las respuestas deben ser entre 2 y 6 (llegaron ${lista.length}).`);
      resolve(0);
      return;
    }
    if (lista.some((o) => !o)) { errorDev("Hay respuestas vacías (cada una necesita texto)."); resolve(0); return; }
    if (!Number.isInteger(idx) || idx < 1 || idx > lista.length) {
      errorDev(`'respuestaCorrecta' debe ser un número entero entre 1 y ${lista.length} (1 = primera respuesta).`);
      resolve(0);
      return;
    }
    if (!perfil?.uid || !clase?.id) {
      errorDev("Faltan 'perfil' (con uid) o 'clase' (con id): la nota no se puede guardar.");
      resolve(0);
      return;
    }

    const esDoc = esDocente(perfil);
    const qid = id ? slug(String(id)) : `${slug(texto)}-${hash8(normalizar(texto))}`;

    // v6 · ORDEN ALEATORIO de las opciones (anti-copia): cada navegador
    // guarda SU orden en localStorage mientras la pregunta no se
    // responda — al recargar sale IGUAL y nadie copia mirando a otro;
    // respondida se libera y la próxima vez llega con otro orden. El
    // docente ve un orden nuevo en cada montaje y nada se guarda.
    const claveOrdenPregunta = claveOrden(qid);
    const ordenOpciones = esDoc
      ? ordenAlAzar(lista.length)
      : ordenPersistente(claveOrdenPregunta, lista.length);
    const listaVista = ordenOpciones.map((j) => lista[j]); // opciones ya mezcladas
    const idxCorrecta = ordenOpciones.indexOf(idx - 1);    // posición VISUAL de la correcta

    let envios = 0;         // envíos/intentos ya usados (0 = el próximo es el primero)
    let seleccion = -1;
    let bloqueada = false;
    let resuelto = false;
    let yaEnviada = false;  // examen: guardado con la marca de enviado
    let ultimoResultado = null;

    const resolverUnaVez = (valor) => {
      if (!resuelto) {
        resuelto = true;
        // Respondida (o pre-marcada respondida): el orden guardado de
        // las opciones ya no hace falta y se libera para la próxima vez.
        if (!esDoc) liberarOrden(claveOrdenPregunta);
        resolve(valor);
      }
    };

    // --- Estructura (SIN ninguna mención al puntaje: queda oculto) ---
    const caja = document.createElement("section");
    caja.className = "om-caja";
    caja.setAttribute("aria-label", texto);
    caja.innerHTML = `
      <div class="om-cab">
        <span class="om-etiqueta">${esExamen ? "Examen" : esTarea ? "Tarea" : "Pregunta"}</span>
        <span class="om-chip"></span>
      </div>
      <p class="om-pregunta"></p>
      <div class="om-opciones"></div>
      <div class="om-pie">
        <span class="om-feedback" aria-live="polite"></span>
        ${esExamen ? "" : '<button type="button" class="om-enviar" disabled>Enviar respuesta</button>'}
      </div>`;
    caja.querySelector(".om-pregunta").innerHTML = textoConFormulas(texto);

    const chipEl = caja.querySelector(".om-chip");
    const feedbackEl = caja.querySelector(".om-feedback");
    const btnEnviar = caja.querySelector(".om-enviar"); // null en examen

    const feedback = (mensaje, tipoFeedback) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "om-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const chip = (mensaje, tipoChip) => {
      chipEl.textContent = mensaje;
      chipEl.className = "om-chip" + (tipoChip ? " " + tipoChip : "");
    };

    const bloquearTodo = () => {
      bloqueada = true;
      if (btnEnviar) btnEnviar.disabled = true;
      botones.forEach((b) => {
        b.disabled = true;
        b.classList.remove("seleccionada");
      });
    };

    const botones = listaVista.map((textoOpcion, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "om-opcion";
      b.setAttribute("aria-pressed", "false");

      const letra = document.createElement("span");
      letra.className = "om-letra";
      letra.textContent = LETRAS[i];

      const t = document.createElement("span");
      t.className = "om-texto";
      t.innerHTML = textoConFormulas(textoOpcion); // admite $fórmulas$

      b.append(letra, t);
      b.addEventListener("click", () => {
        if (bloqueada) return;
        seleccion = i;
        botones.forEach((x, j) => {
          x.classList.toggle("seleccionada", j === i);
          x.setAttribute("aria-pressed", String(j === i));
        });
        if (btnEnviar) btnEnviar.disabled = false;
        feedback("", "");
      });
      return b;
    });
    caja.querySelector(".om-opciones").append(...botones);

    // Estado inicial por tipo y rol
    if (esDoc) {
      chip("Vista docente", "");
      feedback("Intentos libres, puntaje local arriba y nada se guarda.", "");
    } else if (esExamen) {
      chip("Sin enviar", "");
      feedback("El examen enviará todas tus respuestas al final.", "");
    } else if (esTarea) {
      chip("Envío 1 de 2", "");
      feedback("Elige una respuesta y envíala. Tienes hasta dos envíos.", "");
    } else {
      chip("Intento 1 de 2", "");
    }

    if (esDoc) prepararDocente(perfil, clase); // restaura el head local si ya hay puntaje

    // --- Al montar (estudiante): ¿ya respondida o examen ya enviado? ---
    if (!esDoc) {
      obtenerNota(perfil, clase).then((nota) => {
        if (resuelto || bloqueada || envios > 0 || seleccion >= 0) return;
        const guardado = nota.preguntas ? nota.preguntas[qid] : undefined;
        const hecha = guardado != null;

        if (esExamen && (nota.enviado || hecha)) {
          yaEnviada = true;
          ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje, yaEnviado: true };
          bloquearTodo();
          if (revelar) botones[idxCorrecta].classList.add("correcta");
          chip("Examen enviado", "");
          feedback("Ya enviaste este examen.", "");
          resolverUnaVez(0);
          return;
        }
        if (hecha) {
          bloquearTodo();
          if (revelar) botones[idxCorrecta].classList.add("correcta");
          if (btnEnviar) btnEnviar.textContent = "Respondida";
          chip("Respondida", "bien");
          feedback(esTarea ? "Ya enviaste esta tarea." : "Ya respondiste esta pregunta.", "ok");
          // v6.3 — en examen con el valor ya guardado (sin examen cerrado),
          // el recorrido del envío final NO re-califica ni pisa el valor.
          if (esExamen) {
            yaEnviada = true;
            ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje };
          }
          resolverUnaVez(0); // no vuelve a sumar
        }
      });
    }

    // --- Guardado del examen (estudiante): valor + marca de enviado ---
    // (la lógica vive en guardarPreguntaExamen(), compartida con multipleOpcion.js)
    async function guardarExamen(ganado) {
      await guardarPreguntaExamen(perfil, clase, qid, ganado);
      yaEnviada = true;
      ultimoResultado = { puntos: ganado, maxPuntaje: puntaje };
    }

    // --- Envío de clase y tarea (botón) ---
    async function procesarEnvio() {
      if (bloqueada || seleccion < 0) return null;
      if (esExamen) return null; // el examen pasa por enviar()

      /* DOCENTE · clase y tarea: intentos libres, puntaje local, nada se guarda */
      if (esDoc) {
        const acierto = seleccion === idxCorrecta;
        const ganado = acierto ? (envios === 0 ? puntaje : redondear1(puntaje / 2)) : 0;
        envios++;
        if (acierto) {
          registrarPuntoDocente(perfil, clase, qid, ganado);
          if (revelar) {
            botones[idxCorrecta].classList.add("correcta");
            chip(envios === 1 ? "Resuelta" : "Resuelta (intento " + envios + ")", "bien");
            feedback("¡Correcta! Vista docente: el puntaje está arriba y nada se guarda.", "ok");
          } else {
            chip("Enviada", "");
            feedback("Respuesta enviada. Vista docente: el puntaje está arriba y nada se guarda.", "");
          }
          resolverUnaVez(ganado);
          return ganado;
        }
        if (revelar) {
          botones[seleccion].classList.remove("seleccionada");
          botones[seleccion].classList.add("erronea");
          const equivocada = seleccion;
          setTimeout(() => {
            if (botones[equivocada]) botones[equivocada].classList.remove("erronea");
          }, 700);
          chip("Vista docente · intento " + (envios + 1), "");
          feedback("No es correcta. Puedes seguir intentando: nada se guarda.", "aviso");
        } else {
          chip("Vista docente · envío " + (envios + 1), "");
          feedback("Respuesta enviada. Puedes enviar otra vez: nada se guarda.", "");
        }
        seleccion = -1;
        btnEnviar.disabled = true;
        return null;
      }

      /* ESTUDIANTE · CLASE: 2 intentos, revela la corrección */
      if (esTipoClase) {
        if (seleccion === idxCorrecta) {
          const ganado = envios === 0 ? puntaje : redondear1(puntaje / 2);
          bloquearTodo();
          botones[idxCorrecta].classList.add("correcta");
          chip(envios === 0 ? "Resuelta" : "Resuelta (2.º intento)", "bien");
          feedback(envios === 0 ? "¡Correcta! Muy bien." : "¡Correcta en tu segundo intento! Muy bien.", "ok");
          if (ganado > 0) sumarPuntos(perfil, clase, qid, ganado, { tipo }).catch(() => {});
          resolverUnaVez(ganado);
          return ganado;
        }
        envios++;
        botones[seleccion].classList.remove("seleccionada");
        botones[seleccion].classList.add("erronea");
        botones[seleccion].disabled = true;
        seleccion = -1;
        btnEnviar.disabled = true;
        if (envios === 1) {
          chip("Intento 2 de 2", "aviso");
          btnEnviar.textContent = "Intentar de nuevo";
          feedback("No es correcta. Tienes una segunda oportunidad.", "aviso");
        } else {
          bloquearTodo();
          botones[idxCorrecta].classList.add("correcta");
          chip("Intentos agotados", "mal");
          feedback("Incorrecta otra vez. Se agotaron tus intentos: podrás volver a intentarlo en otra sesión.", "mal");
          resolverUnaVez(0);
        }
        return null;
      }

      /* ESTUDIANTE · TAREA: 2 envíos neutros; el 2.º es el que cuenta */
      if (esTarea) {
        const acierto = seleccion === idxCorrecta;
        if (envios === 0) {
          envios++;
          chip("Envío 2 de 2", "aviso");
          btnEnviar.textContent = "Enviar de nuevo";
          feedback("Respuesta enviada. Puedes modificarla y enviar una segunda vez.", "");
          return null; // la respuesta final (2.º envío) decide el puntaje
        }
        const ganado = acierto ? redondear1(puntaje / 2) : 0;
        bloquearTodo();
        chip("Enviada", "");
        feedback("Respuesta enviada. No hay más envíos.", "");
        // v6.3 — el 2.º envío es EL que cuenta: se guarda SIEMPRE (0
        // incluido) para que Firebase registre la tarea respondida y no
        // se pueda repetir al volver a entrar.
        sumarPuntos(perfil, clase, qid, ganado, { tipo }).catch(() => {});
        resolverUnaVez(ganado);
        return ganado;
      }

      return null;
    }

    if (btnEnviar) {
      btnEnviar.addEventListener("click", () => {
        procesarEnvio().catch((e) => console.error("[opcionMultiple]", e));
      });
    }

    // --- EXAMEN: el botón lo pone el archivo del examen ---
    enviarExamen = async function () {
      if (esDoc) {
        const acierto = seleccion === idxCorrecta;
        const ganado = acierto ? puntaje : 0;
        registrarPuntoDocente(perfil, clase, qid, ganado);
        if (revelar) {
          botones[idxCorrecta].classList.add("correcta");
          if (seleccion >= 0 && !acierto) botones[seleccion].classList.add("erronea");
        }
        chip("Vista docente", "");
        feedback("Enviado. El puntaje está en el head de arriba; nada se guarda.", "");
        resolverUnaVez(ganado);
        return { puntos: ganado, maxPuntaje: puntaje, docente: true };
      }

      if (yaEnviada) {
        return ultimoResultado || { puntos: 0, maxPuntaje: puntaje, yaEnviado: true };
      }

      const acierto = seleccion === idxCorrecta;
      const ganado = acierto ? puntaje : 0;
      if (revelar) {
        botones[idxCorrecta].classList.add("correcta");
        if (seleccion >= 0 && !acierto) botones[seleccion].classList.add("erronea");
      }
      bloquearTodo();
      if (revelar) {
        feedback(acierto ? "Respuesta correcta." : "Respuesta incorrecta.", acierto ? "ok" : "mal");
      } else {
        feedback("Respuesta enviada.", "");
      }
      chip("Enviada", "");
      await guardarExamen(ganado);
      resolverUnaVez(ganado);
      return { puntos: ganado, maxPuntaje: puntaje };
    };

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
    aplicarTamano(caja, config); // v5: columnas / ancho (tras el montaje)
  }

  if (esExamen) promesa.enviar = () => enviarExamen();
  return promesa;
}