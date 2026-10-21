// ============================================================
// multipleOpcion.js — Bloque de selección múltiple (1 o MÁS correctas)
// (js/utils/multipleOpcion.js) · v7: OPCIONES EN ORDEN ALEATORIO
// (anti-copia) PERSISTENTE por navegador hasta responder (js/utils/
// aleatorio.js); antes v6: TAMAÑO en pantalla — 'columnas'
// (2 = mitad del ancho, 3 = tercio, 4 = cuarto → bloques LADO A LADO)
// o 'ancho' ("320px", "50%", 0.5…); antes v5: FÓRMULAS matemáticas
// ($…$), vía js/utils/formatearFormulas.js (antes v4: TIPOS
// clase/tarea/examen, docente con intentos libres, espejo en Sheets)
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: inserta un
// bloque en el que el estudiante marca VARIAS opciones y las envía.
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { multipleOpcion } from "../../../js/utils/multipleOpcion.js";
//
//   multipleOpcion({
//     contenedor,           // elemento del DOM donde insertar el bloque
//     perfil,               // perfil del usuario (users/{uid}: uid, rol, nie?)
//     clase,                // { id, grado, materiaId, materia?, dia?, unidad?, leccion? }
//     tipo: "clase",        // "clase" | "tarea" | "examen"  (defecto: "clase")
//     indicacion: "Marca todos los racionales entre $\\sqrt{2}$ y $\\pi$.",
//     opciones: ["$\\sqrt{2}$", "0.75", "$\\pi$", "$\\frac{1}{2}$", "$\\sqrt{3}$", "5"],
//                           // ENTRE 4 Y 10 textos (cada uno admite $…$)
//     correctas: [2, 4, 6], // NÚMEROS de las opciones correctas (1 = primera),
//                           // 1 o más, sin repetir
//     puntaje: 1,           // valor TOTAL del bloque (0 a 10)
//     // columnas: 2,       // NUEVO v6: el bloque ocupa LA MITAD del ancho
//     //                    //  (dos bloques en el MISMO contenedor quedan
//     //                    //  LADO A LADO; 3 = tercio, 4 = cuarto)
//     // ancho: "320px",    // NUEVO v6: ancho fijo ("50%", "18rem", 0.5…)
//     // id: "p4",          // (opcional) identificador único y estable
//     // penalizarErroneas: true, // (opcional, defecto true) las marcas
//     //                          // equivocadas restan su valor; en false,
//     //                          // solo cuentan las correctas encontradas.
//     // mostrarCorrectas: false, // SOLO examen: el docente lo activará en
//     //                          // la configuración del examen para revelar
//     //                          // las correctas al enviar.
//   }).then((ganado) => { /* puntaje obtenido en ESTE bloque (oculto) */ });
//
// FÓRMULAS (v5): TODO texto (indicación y opciones) acepta LaTeX entre
//   $…$ (en la línea) o $$…$$ (centrado), renderizado con KaTeX por
//   js/utils/formatearFormulas.js. Sin $ se muestra como texto normal
//   (los contenidos viejos siguen igual); CDN caído → LaTeX plano.
//
//   // o dentro de una función async:
//   // const ganado = await multipleOpcion({ ... });
//
// REGLA DE PUNTAJE (reparto igualitario, la del docente):
//   · Cada opción correcta vale  puntaje ÷ número de correctas
//     (ej.: puntaje 1 y 4 correctas → cada una vale 0.25).
//   · Con penalizarErroneas (defecto), cada marca equivocada RESTA un
//     valor del intento en que se marcó, sin bajar de 0 (así marcar
//     TODAS las opciones no da el puntaje completo).
//   · El total se redondea a 2 decimales AL GUARDAR (una sola vez).
//
// ─── TIPO "clase" (defecto) ───
//   DOS intentos POR OPCIONES: 1.er intento, cada correcta marcada
//   queda ASEGURADA a valor COMPLETO (verde y fija) y las equivocadas
//   restan (sin bajar de 0); si quedan correctas por encontrar →
//   2.º intento SOLO para las que faltan, cada una a LA MITAD.
//   MUESTRA correctas (verde) y equivocadas (rojas). Guarda el total
//   ganado si es > 0; lo no logrado reaparece fresco en otra sesión.
//
// ─── TIPO "tarea" ───
//   Los mismos DOS envíos, pero la UI es NEUTRA: nunca dice si una
//   opción es correcta ni marca en verde/rojo, ni dice cuántas lleva.
//   El 1.er envío es provisional (las marcas siguen editables) y el
//   2.º ES EL QUE CUENTA: cada correcta marcada vale LA MITAD (menos
//   las equivocadas si penalizarErroneas, sin bajar de 0). Tras el
//   2.º envío se bloquea. Si el total fue 0 no se guarda nada: el
//   bloque reaparece fresco en otra sesión.
//
// ─── TIPO "examen" ───
//   SIN botón propio: el archivo del examen pone SU botón "Enviar" al
//   final y envía todos los bloques de una vez:
//
//     const p = multipleOpcion({ ..., tipo: "examen" });
//     // ... el estudiante responde ...
//     const r = await p.enviar();  // → { puntos, maxPuntaje } del bloque
//     // ... tras todos los bloques:
//     const resumen = await finalizarExamen(perfil, clase, { titulo });
//     // resumen.puntos = nota del examen (mostrarla en pantalla)
//
//   · enviar() califica el bloque UNA sola vez (cada correcta marcada
//     a valor COMPLETO, las equivocadas restan si penalizarErroneas,
//     sin bajar de 0), guarda el valor (0 incluido) con la marca de
//     examen enviado y devuelve el resultado al examen.
//   · finalizarExamen() fija nota.enviado y reporta el TOTAL al Sheet
//     UNA sola vez (fila del examen × columna del NIE): el examen
//     queda bloqueado aunque cierre y abra sesión.
//   · Al cargar, si nota.enviado → el bloque aparece bloqueado
//     ("Examen enviado").
//   · No muestra cuáles son correctas. SOLO si la configuración del
//     examen marca mostrarCorrectas: true se revelan al enviar (las
//     correctas en verde). La NOTA final la muestra el archivo del
//     examen con resumen.puntos.
//
// ─── DOCENTE (perfil.rol === "docente") ───
//   Intentos ILIMITADOS y NADA se guarda: ni Firestore, ni Sheets, ni
//   localStorage de notas. El puntaje de la clase se muestra en el
//   head morado DEBAJO DE LA USERBAR — el MISMO de opcionMultiple.js
//   (una sola barra para todas las utils) — y vive SOLO en la pestaña
//   (sessionStorage): cerrar la app lo borra. Cada bloque aporta su
//   ÚLTIMO valor (1.er envío completo, siguientes a la mitad).
//
// Puntaje oculto: el recuadro NUNCA muestra puntos ni los menciona;
//   la nota ganada en ESTE bloque solo la recibe el archivo de
//   contenido por la Promise.
//
// Persistencia (estudiante): la MISMA de opcionMultiple.js —
//   localStorage "mco_nota_{uid}_{claseId}" (instantáneo) + notas/
//   {uid}/clases/{claseId} en Firestore vía js/data/db.js (fuente de
//   verdad) + ESPEJO en Google Sheets (db.notas.reportarActividad):
//   clase y tarea re-reportan el TOTAL tras cada bloque; el examen se
//   reporta UNA vez desde finalizarExamen(). Cada bloque guarda su
//   valor UNA sola vez (clave: id, o slug del texto + hash). Lo no
//   sumado no se guarda → los bloques sin acierto reaparecen frescos.
//
// SUMATORIA FINAL DE LA CLASE (compartida con opcionMultiple.js):
//   Usa las MISMAS obtenerNota() y sumarPuntos() (re-exportadas aquí):
//     const nota = await obtenerNota(perfil, clase);
//     nota.puntos  // ← suma de TODO lo respondido (esta sesión y anteriores).
//                  //   NO le sumes el valor devuelto por multipleOpcion():
//                  //   sería duplicado.
//
// Compatibilidad: acepta los nombres antiguos pregunta / correcta, y
//   puntaje por defecto = 1.
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

// Azar anti-copia (v7): orden aleatorio de las opciones PERSISTENTE
// por navegador hasta responder el bloque (js/utils/aleatorio.js).
import { ordenAlAzar, ordenPersistente, liberarOrden, claveOrden } from "./aleatorio.js";

// Comodines para el archivo de contenido (misma API que opcionMultiple.js)
export { obtenerNota, sumarPuntos, finalizarExamen } from "./opcionMultiple.js";

/* ---------------- Constantes ---------------- */

const LETRAS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const TIPOS = ["clase", "tarea", "examen"];

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

// Redondeo a 2 decimales (el reparto igualitario puede dar 0.25, 0.75, …)
function redondear2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "multiple-opcion-estilos";
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

    .mo-caja {
      background: #ffffff;
      border: 1px solid #e6edf8;
      border-left: 4px solid #2563eb;
      border-radius: 1.1rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
    }

    .mo-cab {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .5rem;
    }
    .mo-etiqueta {
      background: rgba(37, 99, 235, .12);
      color: #2563eb;
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .mo-chip {
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      white-space: nowrap;
    }
    .mo-chip.aviso { background: rgba(249, 115, 22, .14); color: #c2410c; }
    .mo-chip.bien { background: rgba(22, 163, 52, .12); color: #15803d; }
    .mo-chip.mal { background: rgba(239, 68, 68, .12); color: #b91c1c; }

    .mo-pregunta {
      margin: 0 0 .35rem;
      font-size: 1.02rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.45;
    }
    .mo-ayuda {
      margin: 0 0 .85rem;
      font-size: .84rem;
      color: #6b7280;
    }

    .mo-opciones {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: .55rem;
    }
    .mo-opcion {
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
    .mo-opcion:hover:not(:disabled) {
      border-color: #2563eb;
      box-shadow: 0 4px 14px rgba(37, 99, 235, .14);
    }
    .mo-opcion:disabled { cursor: default; opacity: .85; }

    .mo-letra {
      flex: none;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: .72rem;
      font-weight: 800;
      background: rgba(37, 99, 235, .12);
      color: #2563eb;
    }
    .mo-texto { flex: 1; min-width: 0; }

    .mo-opcion.seleccionada { border-color: #2563eb; background: rgba(37, 99, 235, .07); }
    .mo-opcion.seleccionada .mo-letra { background: #2563eb; color: #ffffff; }

    .mo-opcion.correcta { border-color: #16a34a; background: rgba(22, 163, 52, .08); }
    .mo-opcion.correcta .mo-letra { background: #16a34a; color: #ffffff; }

    .mo-opcion.erronea { border-color: #ef4444; background: rgba(239, 68, 68, .07); animation: mo-shake .3s ease; }
    .mo-opcion.erronea .mo-letra { background: #ef4444; color: #ffffff; }
    @keyframes mo-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .mo-pie {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: .85rem;
    }
    .mo-feedback { flex: 1; min-width: 0; font-size: .88rem; font-weight: 600; color: #6b7280; }
    .mo-feedback.ok { color: #16a34a; }
    .mo-feedback.aviso { color: #f97316; }
    .mo-feedback.mal { color: #ef4444; }

    .mo-enviar {
      font-family: inherit;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .55rem 1.1rem;
      font-size: .88rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(37, 99, 235, .3);
      transition: background .15s ease, transform .15s ease;
    }
    .mo-enviar:hover:not(:disabled) { background: #1d4ed8; }
    .mo-enviar:active:not(:disabled) { transform: scale(.98); }
    .mo-enviar:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
    }

    /* Caja roja cuando el contenido llamó a la utilidad con datos inválidos */
    .mo-error-dev {
      border: 2px dashed #ef4444;
      border-left: 2px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      box-shadow: none;
    }

    @media (max-width: 767px) {
      .om-head-docente { top: 52px; padding: .4rem 1rem; }
      .mo-caja { padding: 1rem; }
      .mo-opciones { grid-template-columns: 1fr; }
      .mo-pie { flex-direction: column-reverse; align-items: stretch; }
      .mo-enviar { justify-content: center; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Componente ---------------- */

/**
 * Inserta un bloque de selección múltiple en el contenedor indicado.
 * Devuelve una Promise<number> con el TOTAL ganado en ESTE bloque
 * (oculto en pantalla; se resuelve al terminar: perfecto al 1.er
 * intento, al acabar el 2.º envío/intento o al enviar el examen).
 * Con tipo "examen" la promesa trae además .enviar() →
 * Promise<{ puntos, maxPuntaje }> para el botón final del examen.
 */
export function multipleOpcion(config = {}) {
  const {
    contenedor,
    perfil,
    clase,
    id,
    indicacion, pregunta,               // pregunta = alias (compatibilidad)
    opciones,
    correctas, respuestasCorrectas,     // 1 o más números (1 = primera opción)
    respuestaCorrecta, correcta,        // compatibilidad: UNA correcta suelta
  } = config;

  const penalizar = config.penalizarErroneas !== false; // defecto: true

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

  // PUNTAJE OCULTO total del bloque (0 a 10). Defecto: 1.
  let puntaje = Number(config.puntaje ?? 1);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 10) {
    console.warn("[multipleOpcion] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
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
    const lista = (Array.isArray(opciones) ? opciones : []).map((o) => String(o ?? "").trim());

    // Correctas: lista de números 1-based (acepta un número suelto).
    let cr = config.correctas ?? config.respuestasCorrectas;
    if (cr == null && (respuestaCorrecta != null || correcta != null)) {
      cr = [respuestaCorrecta ?? correcta];
    }
    if (typeof cr === "number") cr = [cr];

    function errorDev(mensaje) {
      console.error("[multipleOpcion]", mensaje);
      const div = document.createElement("div");
      div.className = "mo-caja mo-error-dev";
      div.textContent = "[multipleOpcion] " + mensaje;
      contenedor.append(div);
    }

    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[multipleOpcion] Falta 'contenedor' (elemento del DOM donde insertar el bloque).");
      resolve(0);
      return;
    }
    if (!TIPOS.includes(tipo)) {
      errorDev(`'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
      resolve(0);
      return;
    }
    if (!texto) { errorDev("Falta la indicación del bloque."); resolve(0); return; }
    if (lista.length < 4 || lista.length > 10) {
      errorDev(`Las opciones deben ser entre 4 y 10 (llegaron ${lista.length}).`);
      resolve(0);
      return;
    }
    if (lista.some((o) => !o)) { errorDev("Hay opciones vacías (cada una necesita texto)."); resolve(0); return; }

    const nums = (Array.isArray(cr) ? cr : []).map(Number);
    const correctasOk =
      nums.length >= 1 &&
      nums.every((n) => Number.isInteger(n) && n >= 1 && n <= lista.length) &&
      new Set(nums).size === nums.length;
    if (!correctasOk) {
      errorDev(`'correctas' debe ser una lista de 1 a ${lista.length} NÚMEROS enteros (1 = primera opción), sin repetir. Ej.: correctas: [1, 3].`);
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

    // v7 · ORDEN ALEATORIO de las opciones (anti-copia): cada navegador
    // guarda SU orden en localStorage mientras el bloque no se
    // responda — al recargar sale IGUAL; respondido se libera. El
    // docente ve un orden nuevo en cada montaje y nada se guarda.
    const claveOrdenBloque = claveOrden(qid);
    const ordenOpciones = esDoc
      ? ordenAlAzar(lista.length)
      : ordenPersistente(claveOrdenBloque, lista.length);
    const listaVista = ordenOpciones.map((j) => lista[j]); // opciones ya mezcladas
    // Correctas remapeadas a la posición VISUAL tras el sorteo
    const setCorrectas = new Set(nums.map((n) => ordenOpciones.indexOf(n - 1))); // 0-based visuales
    const numCorrectas = setCorrectas.size;

    let bloqueada = false;
    let resuelto = false;
    let intento = 0;             // clase: 0 = 1.er intento · 1 = segunda oportunidad
    let envios = 0;              // tarea/docente: envíos ya hechos
    const marcadas = new Set();  // índices 0-based marcados por el estudiante
    const aseguradas = new Set();// clase: correctas ya encontradas y FIJAS (0-based)
    let aseguradoExacto = 0;     // clase: valor exacto acumulado (se redondea al guardar)
    let logradas = 0;            // clase: correctas que encontró el estudiante
    let totalErrores = 0;        // clase: marcas equivocadas acumuladas (feedback)
    let yaEnviada = false;       // examen: guardado con la marca de enviado
    let ultimoResultado = null;

    const resolverUnaVez = (valor) => {
      if (!resuelto) {
        resuelto = true;
        // Respondido (o pre-marcado respondido): el orden guardado ya
        // no hace falta y se libera para la próxima vez.
        if (!esDoc) liberarOrden(claveOrdenBloque);
        resolve(valor);
      }
    };

    // --- Estructura (SIN ninguna mención al puntaje: queda oculto) ---
    const caja = document.createElement("section");
    caja.className = "mo-caja";
    caja.setAttribute("aria-label", texto);
    caja.innerHTML = `
      <div class="mo-cab">
        <span class="mo-etiqueta">${esExamen ? "Examen" : esTarea ? "Tarea" : "Pregunta"}</span>
        <span class="mo-chip"></span>
      </div>
      <p class="mo-pregunta"></p>
      <p class="mo-ayuda"></p>
      <div class="mo-opciones"></div>
      <div class="mo-pie">
        <span class="mo-feedback" aria-live="polite"></span>
        ${esExamen ? "" : '<button type="button" class="mo-enviar" disabled>Enviar respuesta</button>'}
      </div>`;
    caja.querySelector(".mo-pregunta").innerHTML = textoConFormulas(texto);
    caja.querySelector(".mo-ayuda").textContent =
      (numCorrectas > 1
        ? "Puede haber más de una correcta: marca todas las que creas"
        : "Marca la opción que creas correcta") +
      (esExamen
        ? ". El examen las enviará todas al final."
        : esTarea
          ? ". Tienes hasta dos envíos: la última enviada es la que cuenta."
          : " y comprueba.");

    const chipEl = caja.querySelector(".mo-chip");
    const feedbackEl = caja.querySelector(".mo-feedback");
    const btnEnviar = caja.querySelector(".mo-enviar"); // null en examen

    const feedback = (mensaje, tipoFeedback) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "mo-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const chip = (mensaje, tipoChip) => {
      chipEl.textContent = mensaje;
      chipEl.className = "mo-chip" + (tipoChip ? " " + tipoChip : "");
    };
    const cuentaMarcadas = () =>
      `${marcadas.size} marcada${marcadas.size === 1 ? "" : "s"}`;
    const refrescarChip = () => {
      if (bloqueada) return;
      if (esExamen) { chip(cuentaMarcadas(), ""); return; }
      if (esDoc) {
        chip(
          envios === 0 ? cuentaMarcadas() : "Vista docente · " + (esTarea ? "envío " : "intento ") + (envios + 1),
          ""
        );
        return;
      }
      if (esTarea) {
        chip(envios === 0 ? cuentaMarcadas() : "Envío 2 de 2", envios === 0 ? "" : "aviso");
        return;
      }
      chip(intento === 0 ? cuentaMarcadas() : "Intento 2 de 2", intento === 0 ? "" : "aviso");
    };

    const bloquearTodo = () => {
      bloqueada = true;
      if (btnEnviar) btnEnviar.disabled = true;
      botones.forEach((b) => (b.disabled = true));
    };

    const botones = listaVista.map((textoOpcion, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mo-opcion";
      b.setAttribute("aria-pressed", "false");

      const letra = document.createElement("span");
      letra.className = "mo-letra";
      letra.textContent = LETRAS[i];

      const t = document.createElement("span");
      t.className = "mo-texto";
      t.innerHTML = textoConFormulas(textoOpcion); // admite $fórmulas$

      b.append(letra, t);
      b.addEventListener("click", () => {
        if (bloqueada) return;
        const puesta = !marcadas.has(i);
        if (puesta) marcadas.add(i);
        else marcadas.delete(i);
        b.classList.toggle("seleccionada", puesta);
        b.setAttribute("aria-pressed", String(puesta));
        if (esDoc && revelar) pintarResultado(false); // docente: repinta al ajustar
        if (btnEnviar) btnEnviar.disabled = marcadas.size === 0;
        if (marcadas.size === 0) feedback("", "");
        refrescarChip();
      });
      return b;
    });
    caja.querySelector(".mo-opciones").append(...botones);

    // Evalúa la selección ACTUAL: aciertos = correctas marcadas,
    // errores = equivocadas marcadas, neto = lo que cuenta (las
    // equivocadas restan si penalizarErroneas, sin bajar de 0).
    function evaluarSeleccion() {
      let aciertos = 0;
      let errores = 0;
      marcadas.forEach((i) => (setCorrectas.has(i) ? aciertos++ : errores++));
      const neto = penalizar ? Math.max(0, aciertos - errores) : aciertos;
      return { aciertos, errores, neto };
    }

    // Pinta el resultado: con revelarTodo pinta TODAS las correctas en
    // verde (repaso de examen); sin él, solo las marcadas (verde las
    // correctas marcadas, rojo las equivocadas marcadas).
    function pintarResultado(revelarTodo) {
      botones.forEach((b, i) => {
        b.classList.remove("correcta", "erronea");
        if (revelarTodo && setCorrectas.has(i)) {
          b.classList.add("correcta");
          return;
        }
        if (marcadas.has(i)) {
          b.classList.add(setCorrectas.has(i) ? "correcta" : "erronea");
        }
      });
    }

    // Estado inicial por tipo y rol
    if (esDoc) {
      chip("Vista docente", "");
      feedback("Intentos libres, puntaje local arriba y nada se guarda.", "");
    } else if (esExamen) {
      chip("Sin enviar", "");
      feedback("El examen enviará todas tus respuestas al final.", "");
    } else if (esTarea) {
      chip("Envío 1 de 2", "");
      feedback("Elige tus respuestas y envíalas. Tienes hasta dos envíos.", "");
    } else {
      chip("Intento 1 de 2", "");
    }

    if (esDoc) prepararDocente(perfil, clase); // restaura el head local si ya hay puntaje

    // --- Al montar (estudiante): ¿ya respondida o examen ya enviado? ---
    if (!esDoc) {
      obtenerNota(perfil, clase).then((nota) => {
        if (resuelto || bloqueada || marcadas.size > 0) return; // ya interactuó en esta sesión
        const guardado = nota.preguntas ? nota.preguntas[qid] : undefined;
        const hecha = guardado != null;

        if (esExamen && (nota.enviado || hecha)) {
          yaEnviada = true;
          ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje, yaEnviado: true };
          bloquearTodo();
          if (revelar) pintarResultado(true);
          chip("Examen enviado", "");
          feedback("Ya enviaste este examen.", "");
          resolverUnaVez(0);
          return;
        }
        if (hecha) {
          bloquearTodo();
          if (revelar) pintarResultado(true);
          if (btnEnviar) btnEnviar.textContent = "Respondida";
          chip("Respondida", "bien");
          feedback(esTarea ? "Ya enviaste esta tarea." : "Ya respondiste este bloque.", "ok");
          resolverUnaVez(0); // no vuelve a sumar
        }
      });
    }

    // --- Comprobar / Enviar (clase y tarea; el examen pasa por enviar()) ---
    if (btnEnviar) {
      btnEnviar.addEventListener("click", () => {
        procesarEnvio().catch((e) => console.error("[multipleOpcion]", e));
      });
    }

    async function procesarEnvio() {
      if (bloqueada || marcadas.size === 0) return null;
      if (esExamen) return null; // el examen pasa por enviar()

      /* DOCENTE · clase y tarea: intentos libres, puntaje local, nada se guarda */
      if (esDoc) {
        const { aciertos, errores, neto } = evaluarSeleccion();
        const ganado = redondear2(
          (neto / numCorrectas) * puntaje * (envios === 0 ? 1 : 1 / 2)
        );
        envios++;
        if (revelar) pintarResultado(false); // clase: muestra el resultado de esta pasada
        if (neto > 0) {
          registrarPuntoDocente(perfil, clase, qid, ganado);
          resolverUnaVez(ganado);
        }
        chip("Vista docente · " + (esTarea ? "envío " : "intento ") + (envios + 1), "");
        if (esTarea) {
          feedback("Respuesta enviada. Vista docente: el puntaje está arriba y nada se guarda.", "");
        } else if (neto > 0) {
          feedback(
            `Encontraste ${aciertos} de ${numCorrectas} correctas. Vista docente: el puntaje está arriba y nada se guarda.`,
            "ok"
          );
        } else {
          feedback("Ninguna correcta en esta selección. Ajusta tus marcas: intentos libres.", "aviso");
        }
        return null;
      }

      /* ESTUDIANTE · CLASE: 2 intentos POR OPCIONES (las correctas
         marcadas al 1.er intento se aseguran a valor COMPLETO; las que
         falten valen LA MITAD en el 2.º intento) */
      if (esTipoClase) {
        // Solo cuentan las marcas NUEVAS de este intento (las aseguradas ya valieron).
        const nuevas = [...marcadas].filter((i) => !aseguradas.has(i));
        let aciertos = 0;
        let errores = 0;
        nuevas.forEach((i) => (setCorrectas.has(i) ? aciertos++ : errores++));
        const neto = penalizar ? Math.max(0, aciertos - errores) : aciertos;
        const primero = intento === 0;

        // Correctas nuevas: si el intento SUMA algo (neto > 0) se aseguran
        // (verde + fija); si quedó en 0 (anuladas por las equivocadas)
        // siguen marcadas y se re-evalúan a la mitad en el 2.º intento.
        // Equivocadas: rojas + deshabilitadas.
        nuevas.forEach((i) => {
          const b = botones[i];
          if (setCorrectas.has(i) && neto > 0) {
            aseguradas.add(i);
            b.classList.remove("seleccionada");
            b.setAttribute("aria-pressed", "false");
            b.classList.add("correcta");
            b.disabled = true;
          } else if (!setCorrectas.has(i)) {
            marcadas.delete(i);
            b.classList.remove("seleccionada");
            b.setAttribute("aria-pressed", "false");
            b.classList.add("erronea");
            b.disabled = true;
          }
        });
        totalErrores += errores;
        if (neto > 0) {
          logradas += aciertos;
          // Valor completo al 1.er intento, LA MITAD al 2.º (se acumula
          // exacto y se redondea UNA sola vez al guardar).
          aseguradoExacto += (neto / numCorrectas) * puntaje * (primero ? 1 : 1 / 2);
        }

        const quedan = numCorrectas - aseguradas.size;

        // ¿Se aseguraron TODAS al 1.er intento? → bloque terminado
        if (primero && aseguradas.size === numCorrectas) {
          terminar();
          return null;
        }

        if (primero) {
          // Quedan correctas por encontrar → segunda oportunidad SOLO
          // para las que faltan (valdrán la mitad).
          intento = 1;
          chip("Intento 2 de 2", "aviso");
          btnEnviar.textContent = "Intentar de nuevo";
          if (neto > 0) {
            feedback(
              `Encontraste ${logradas} de ${numCorrectas} correctas. Te queda${quedan === 1 ? "" : "n"} ${quedan} por encontrar: tienes un segundo intento.`,
              "aviso"
            );
          } else {
            feedback("Esta vez el resultado no suma. Ajusta tus marcas: tienes una segunda oportunidad.", "aviso");
          }
          btnEnviar.disabled = marcadas.size === 0;
          return null;
        }

        // Fin del 2.º intento → el bloque termina pase lo que pase.
        terminar();
        return null;
      }

      /* ESTUDIANTE · TAREA: 2 envíos neutros; el 2.º es el que cuenta */
      if (esTarea) {
        if (envios === 0) {
          envios++;
          chip("Envío 2 de 2", "aviso");
          btnEnviar.textContent = "Enviar de nuevo";
          feedback("Respuesta enviada. Puedes ajustar tus marcas y enviar una segunda vez: la última enviada es la que cuenta.", "");
          return null; // provisional: las marcas siguen editables, nada se revela
        }
        const { neto } = evaluarSeleccion();
        const ganado = redondear2((neto / numCorrectas) * puntaje * (1 / 2));
        bloquearTodo();
        chip("Enviada", "");
        feedback("Respuesta enviada. No hay más envíos.", "");
        if (ganado > 0) sumarPuntos(perfil, clase, qid, ganado, { tipo }).catch(() => {});
        resolverUnaVez(ganado);
        return ganado;
      }

      return null;
    }

    function terminar() {
      bloqueada = true;
      const total = redondear2(aseguradoExacto);
      botones.forEach((b, i) => {
        b.classList.remove("seleccionada");
        b.setAttribute("aria-pressed", "false");
        if (setCorrectas.has(i)) b.classList.add("correcta");   // revela TODAS las correctas
        else if (marcadas.has(i)) b.classList.add("erronea");   // marcas equivocadas en rojo
        b.disabled = true;
      });
      btnEnviar.disabled = true;
      btnEnviar.textContent = total > 0 ? "Respondida" : "Sin más intentos";
      if (logradas === numCorrectas && totalErrores === 0) {
        chip(intento === 0 ? "Resuelta" : "Resuelta (2.º intento)", "bien");
        feedback(
          intento === 0
            ? "¡Excelente! Marcaste todas las correctas."
            : "¡Excelente en tu segundo intento! Marcaste todas las correctas.",
          "ok"
        );
      } else if (logradas === numCorrectas) {
        chip(intento === 0 ? "Respondida" : "Respondida (2.º intento)", "aviso");
        feedback(`Encontraste todas las correctas, pero también marcaste ${totalErrores} incorrecta${totalErrores === 1 ? "" : "s"}.`, "aviso");
      } else if (total > 0) {
        chip("Respondida (2.º intento)", "aviso");
        feedback(`Encontraste ${logradas} de ${numCorrectas} correctas.`, "aviso");
      } else {
        chip("Intentos agotados", "mal");
        feedback("Esta vez el resultado no suma otra vez. Se agotaron tus intentos: podrás volver a intentarlo en otra sesión.", "mal");
      }
      if (total > 0) sumarPuntos(perfil, clase, qid, total, { tipo }).catch(() => {});
      resolverUnaVez(total); // ← la nota solo la recibe el archivo de la clase (y libera el orden guardado)
    }

    // --- EXAMEN: el botón lo pone el archivo del examen ---
    enviarExamen = async function () {
      /* DOCENTE: re-gradable, puntaje local, nada se guarda */
      if (esDoc) {
        const { neto } = evaluarSeleccion();
        const ganado = redondear2((neto / numCorrectas) * puntaje);
        registrarPuntoDocente(perfil, clase, qid, ganado);
        if (revelar) pintarResultado(true);
        chip("Vista docente", "");
        feedback("Enviado. El puntaje está en el head de arriba; nada se guarda.", "");
        resolverUnaVez(ganado);
        return { puntos: ganado, maxPuntaje: puntaje, docente: true };
      }

      if (yaEnviada) {
        return ultimoResultado || { puntos: 0, maxPuntaje: puntaje, yaEnviado: true };
      }

      /* ESTUDIANTE: una sola oportunidad, valor COMPLETO por correcta */
      const { aciertos, errores, neto } = evaluarSeleccion();
      const ganado = redondear2((neto / numCorrectas) * puntaje);
      bloquearTodo();
      if (revelar) {
        pintarResultado(true);
        feedback(
          neto === numCorrectas && errores === 0
            ? "Respuesta correcta."
            : neto > 0
              ? "Respuesta enviada. Las correctas quedaron en verde."
              : "Respuesta incorrecta.",
          neto === numCorrectas && errores === 0 ? "ok" : neto > 0 ? "" : "mal"
        );
      } else {
        feedback("Respuesta enviada.", "");
      }
      chip("Enviada", "");
      await guardarPreguntaExamen(perfil, clase, qid, ganado);
      yaEnviada = true;
      ultimoResultado = { puntos: ganado, maxPuntaje: puntaje };
      resolverUnaVez(ganado);
      return ultimoResultado;
    };

    contenedor.append(caja);
    aplicarTamano(caja, config); // v6: columnas / ancho (tras el montaje)
  }

  if (esExamen) promesa.enviar = () => enviarExamen();
  return promesa;
}
