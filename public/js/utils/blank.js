// ============================================================
// blank.js — COMPLETAR ESPACIOS EN BLANCO (palabras que faltan)
// (js/utils/blank.js) · v2: enviar EN TAREA guarda el 2.º envío SIEMPRE
// (0 incluido: Firebase registra la tarea respondida) y la reentrada
// de examen con valor guardado ya NO lo re-califica
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: se le pasa
// un TEXTO con marcas donde van los espacios en blanco y la respuesta
// de cada uno. El estudiante escribe en los huecos y, al ENVIAR, cada
// espacio queda marcado BUENO (verde, fijo) o MALO (rojo, para
// corregir y reintentar). Mismo motor de notas y modos que
// respuestaSimple.js / opcionMultiple.js.
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { blank } from "../../../js/utils/blank.js";
//
//   blank({
//     contenedor,           // elemento del DOM donde insertar
//     perfil,               // perfil del usuario (users/{uid})
//     clase,                // { id, grado, materiaId, … }
//     tipo: "clase",        // "clase" | "tarea" | "examen"
//     id: "blank-agua",     // id estable (opcional; si falta se deriva)
//     puntaje: 3,           // valor TOTAL (0 a 10), se reparte entre
//                           // los espacios: cada uno vale puntaje ÷ N
//     texto: "El agua hierve a [[100]] °C y se congela a [[0]] °C.",
//   });
//
// ─── MARCAS PARA LOS ESPACIOS (en 'texto') ───
//   1) Respuesta DENTRO de la marca (lo cómodo):
//        "La [[fotosíntesis]] convierte la luz en alimento."
//        "El sol es una [[estrella|astro]] enorme."
//        ↑ cada solución alternativa va separada por | (acepta cualquiera)
//   2) Hueco VACÍO ___ y respuestas aparte, EN ORDEN:
//        texto: "El símbolo del hierro es ___ y el del oro es ___.",
//        respuestas: ["Fe", ["Au", "aurum"]],   // string o LISTA
//   Ambas formas se pueden MEZCLAR en el mismo texto: las ___ toman
//   'respuestas' en orden de aparición y las [[…]] llevan la suya.
//   (Los espacios admiten $…$ para MOSTRAR fórmulas en la corrección,
//   pero la comparación es de TEXTO simple.)
//
// ─── COMPARACIÓN (igual que respuestaSimple.js) ───
//   Minúsculas y SIN ningún espacio; conserva tildes y signos:
//   "La fotosíntesis" == "lafotosíntesis" (da igual cómo lo espacies),
//   pero Árbol ≠ arbol y 1.5 ≠ 15.
//
// ─── MODOS ───
//   clase (defecto)  → 2 intentos: aciertos del 1.er envío valen
//                        COMPLETO y quedan fijos; los corregidos al
//                        2.º valen la MITAD. Corrección visible.
//   tarea            → 2 envíos neutros (sin colores); el 2.º es el
//                        que cuenta (mitad del valor).
//   examen           → sin botón: el archivo del examen llama
//                        promesa.enviar() al final; guarda SIEMPRE
//                        (0 incluido). Sin corregir en pantalla salvo
//                        que la config del examen pida mostrarCorrectas.
//   docente          → perfil con rol "docente": intentos libres,
//                        puntaje local en el head de arriba, NADA se
//                        guarda.
//   libre            → si NO pasas perfil ni clase (práctica sin
//                        nota): botón "Comprobar" las veces que
//                        quieras + botón "Mostrar respuestas".
//                        (Si pasas perfil o clase a medias → aviso
//                        de datos, igual que las demás utilidades.)
//
// ─── PARÁMETROS (blank({ … })) ───
//   contenedor       Elemento del DOM donde insertar (obligatorio).
//   texto            El texto con las marcas [[…]] / ___ (alias:
//                    indicacion / pregunta). Obligatorio.
//   respuestas       Lista para las ___ (string o lista por hueco).
//   perfil, clase    Usuario y sesión (para la nota; si faltan los
//                    DOS → modo libre). Obligatorios salvo modo libre.
//   tipo             "clase" (defecto) | "tarea" | "examen".
//   id               Id estable de la pregunta (opcional).
//   puntaje          Total de la pregunta, 0 a 10 (defecto 1). Se
//                    reparte entre TODOS los espacios.
//   mostrarCorrectas Solo examen: revela la corrección al enviar.
//   columnas, ancho  Tamaño (mismo sistema de las demás utilidades:
//                    columnas 2/3/4 o ancho "320px" / 0.5).
//
// ─── DEVUELVE ─── Promise<number> con la nota ganada en ESTA
//   pregunta (queda pendiente si nunca la termina; "ya respondida" →
//   0). Con tipo "examen" la promesa trae además .enviar() →
//   Promise<{ puntos, maxPuntaje }> para el botón final del examen.
//   La nota NUNCA se muestra en pantalla: queda oculta para la
//   sumatoria final (la misma de opcionMultiple.js).
//
//   import { blank, obtenerNota, sumarPuntos, finalizarExamen }
//     from "../../../js/utils/blank.js";
// ============================================================

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

import { cargarFormulas, textoConFormulas } from "./formatearFormulas.js";

import { escapeHtml } from "./helpers.js";

// Comodines para el archivo de contenido (misma API que opcionMultiple.js)
export { obtenerNota, sumarPuntos, finalizarExamen } from "./opcionMultiple.js";

/* ---------------- Constantes ---------------- */

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

// Comparación de la respuesta: minúsculas y SIN ningún espacio,
// conservando tildes y signos (Árbol ≠ arbol · "1.5" ≠ "15").
function comparable(texto) {
  return String(texto ?? "").toLowerCase().replace(/\s+/g, "");
}

/* ---------------- Lectura del texto (marcas) ----------------
   [[solución|alterna]]  → blanco con respuestas dentro
   ___ / _____ (3+ guiones bajos) → blanco que toma 'respuestas'
   en orden. Devuelve { partes, blancos, errores, avisos }. */

function listaDeSoluciones(x) {
  if (Array.isArray(x)) return x.map((s) => String(s ?? "").trim()).filter(Boolean);
  return [String(x ?? "").trim()].filter(Boolean);
}

function parsearTexto(texto, respuestasLista) {
  const partes = []; // { t: "txt", s } | { t: "bl", i }
  const blancos = []; // { sol: […] }
  const errores = [];
  const avisos = [];
  const fuente = String(texto ?? "");
  const re = /\[\[([^\[\]]+)\]\]|_{3,}/g;
  let ultimo = 0;
  let consumidas = 0;
  let m;

  while ((m = re.exec(fuente))) {
    if (m.index > ultimo) partes.push({ t: "txt", s: fuente.slice(ultimo, m.index) });
    if (m[1] != null) {
      // [[solución|alterna|…]] → respuestas dentro de la marca
      const sols = m[1].split("|").map((s) => s.trim()).filter(Boolean);
      if (!sols.length) {
        errores.push(`El espacio ${blancos.length + 1} ("[[${m[1]}]]") quedó vacío: escribe la respuesta dentro de la marca.`);
      }
      blancos.push({ sol: sols });
    } else {
      // ___ → toma la respuesta N de 'respuestas'
      const sols = listaDeSoluciones(respuestasLista?.[consumidas]);
      if (!sols.length) {
        errores.push(`El texto tiene un hueco "___" (espacio ${blancos.length + 1}) pero 'respuestas' no trae valor para él. Pásalo así: respuestas: [ … ].`);
      }
      blancos.push({ sol: sols });
      consumidas++;
    }
    partes.push({ t: "bl", i: blancos.length - 1 });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < fuente.length) partes.push({ t: "txt", s: fuente.slice(ultimo) });

  if (Array.isArray(respuestasLista) && respuestasLista.length > consumidas) {
    avisos.push(
      `'respuestas' trae ${respuestasLista.length} valor(es) pero el texto solo usa ${consumidas} hueco(s) "___" ` +
      "(las respuestas sobrantes se ignoran; las [[…]] llevan la suya dentro)."
    );
  }
  return { partes, blancos, errores, avisos };
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "blank-estilos";
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

    .bl-caja {
      background: #ffffff;
      border: 1px solid #eef2e0;
      border-left: 4px solid #4d7c0f;
      border-radius: 1.1rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
    }

    .bl-cab {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .5rem;
    }
    .bl-etiqueta {
      background: rgba(77, 124, 15, .12);
      color: #4d7c0f;
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .bl-chip {
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      white-space: nowrap;
    }
    .bl-chip.aviso { background: rgba(249, 115, 22, .14); color: #c2410c; }
    .bl-chip.bien { background: rgba(22, 163, 52, .12); color: #15803d; }
    .bl-chip.mal { background: rgba(239, 68, 68, .12); color: #b91c1c; }

    /* El texto con los huecos: conserva los saltos de línea que
       escribió el docente y deja fluir los inputs DENTRO del párrafo */
    .bl-texto {
      margin: 0 0 .25rem;
      font-size: 1.02rem;
      color: #1f2937;
      line-height: 2.05;       /* aire para los inputs de la línea */
      white-space: pre-wrap;   /* respeta saltos y espacios del autor */
      overflow-wrap: anywhere;
    }

    .bl-entrada {
      display: inline-block;
      box-sizing: border-box;
      font-family: inherit;
      font-size: .98rem; /* ~16px: evita el zoom automático en iOS */
      line-height: 1.4;
      color: #1f2937;
      text-align: center;
      background: #fbfdf5;
      border: 1px solid #d3dcbb;
      border-bottom: 2px solid #4d7c0f;
      border-radius: .55rem;
      padding: .16rem .4rem;
      margin: 0 .12rem;
      vertical-align: baseline;
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
    }
    .bl-entrada::placeholder { color: #b6c29a; }
    .bl-entrada:focus {
      outline: none;
      border-color: #4d7c0f;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(77, 124, 15, .16);
    }
    .bl-entrada:disabled { background: #f9fafb; color: #4b5563; }
    .bl-entrada.bien {
      border-color: #16a34a;
      border-bottom-color: #16a34a;
      background: rgba(22, 163, 52, .08);
      color: #15803d;
      font-weight: 700;
    }
    .bl-entrada.mal {
      border-color: #ef4444;
      border-bottom-color: #ef4444;
      background: rgba(239, 68, 68, .06);
      color: #b91c1c;
      animation: bl-shake .3s ease;
    }
    .bl-entrada.revelada {
      border-style: dashed;
      border-color: #4d7c0f;
      background: rgba(77, 124, 15, .07);
      color: #4d7c0f;
      font-style: italic;
    }
    @keyframes bl-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .bl-pie {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: .75rem;
    }
    .bl-feedback { flex: 1; min-width: 0; font-size: .88rem; font-weight: 600; color: #6b7280; }
    .bl-feedback.ok { color: #16a34a; }
    .bl-feedback.aviso { color: #f97316; }
    .bl-feedback.mal { color: #ef4444; }
    .bl-feedback .katex { font-size: 1em; }

    .bl-enviar {
      font-family: inherit;
      background: #4d7c0f;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .55rem 1.1rem;
      font-size: .88rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(77, 124, 15, .28);
      transition: background .15s ease, transform .15s ease;
    }
    .bl-enviar:hover:not(:disabled) { background: #3f6212; }
    .bl-enviar:active:not(:disabled) { transform: scale(.98); }
    .bl-enviar:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
    }

    .bl-ver {
      font-family: inherit;
      background: transparent;
      color: #4d7c0f;
      border: 1px solid rgba(77, 124, 15, .4);
      border-radius: 999px;
      padding: .42rem .9rem;
      font-size: .8rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: background .15s ease, box-shadow .15s ease;
    }
    .bl-ver:hover { background: rgba(77, 124, 15, .1); box-shadow: 0 3px 10px rgba(77, 124, 15, .12); }

    /* Caja roja cuando el contenido llamó a la utilidad con datos inválidos */
    .bl-error-dev {
      border: 2px dashed #ef4444;
      border-left: 2px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      box-shadow: none;
    }

    @media (max-width: 767px) {
      .om-head-docente { top: 52px; padding: .4rem 1rem; }
      .bl-caja { padding: 1rem; }
      .bl-pie { flex-direction: column-reverse; align-items: stretch; }
      .bl-enviar, .bl-ver { justify-content: center; text-align: center; }
      .bl-texto { line-height: 2.25; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Componente ---------------- */

/**
 * Inserta un ejercicio de completar espacios en blanco.
 * Devuelve una Promise<number> con la nota ganada en ESTA pregunta
 * (puntaje completo / mitad con 1 decimal / 0; queda pendiente si el
 * estudiante nunca la termina). Con tipo "examen" la promesa trae
 * además .enviar() → Promise<{ puntos, maxPuntaje }> para el botón
 * final del examen. La nota NUNCA se muestra en pantalla: queda
 * oculta para la sumatoria final (la misma de opcionMultiple.js).
 */
export function blank(config = {}) {
  const {
    contenedor,
    perfil,
    clase,
    id,
    texto,
    indicacion, pregunta, // alias (compatibilidad con las demás utilidades)
    respuestas: respuestasHuecos,
  } = config;

  const tipo = String(config.tipo || clase?.tipo || "clase").toLowerCase().trim();
  const esTipoClase = tipo === "clase";
  const esTarea = tipo === "tarea";
  const esExamen = tipo === "examen";
  // mostrarCorrectas: SOLO examen (defecto false = nunca se revela).
  const mostrarCorrectas = !!config.mostrarCorrectas;
  // ¿Se revela la corrección? clase: siempre · tarea: nunca ·
  // examen: solo si la config del examen lo permite.
  const revelar = esTipoClase || (esExamen && mostrarCorrectas);

  // MODO LIBRE (sin perfil NI clase): práctica sin nota. Si pasaron
  // uno de los dos a medias sí es error (querían guardar la nota).
  const pasaronPerfil = perfil != null;
  const pasaronClase = clase != null;
  const esLibre = !pasaronPerfil && !pasaronClase;

  // PUNTAJE OCULTO de esta pregunta (0 a 10), repartido entre espacios.
  let puntaje = Number(config.puntaje ?? 1);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 10) {
    console.warn("[blank] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
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
    const fuente = String(texto ?? indicacion ?? pregunta ?? "").trim();
    const lectura = parsearTexto(fuente, respuestasHuecos);

    function errorDev(mensaje) {
      console.error("[blank]", mensaje);
      const div = document.createElement("div");
      div.className = "bl-caja bl-error-dev";
      div.textContent = "[blank] " + mensaje;
      contenedor.append(div);
    }

    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[blank] Falta 'contenedor' (elemento del DOM donde insertar el ejercicio).");
      resolve(0);
      return;
    }
    if (!TIPOS.includes(tipo)) {
      errorDev(`'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
      resolve(0);
      return;
    }
    if (!fuente) { errorDev("Falta el 'texto' con los espacios en blanco."); resolve(0); return; }
    if (!lectura.blancos.length) {
      errorDev(
        "El texto no tiene ningún espacio en blanco. Marca los huecos con [[respuesta]] " +
        '(o "___" y pásalos en respuestas: [ … ]).'
      );
      resolve(0);
      return;
    }
    if (lectura.errores.length) { errorDev(lectura.errores.join(" ")); resolve(0); return; }
    lectura.avisos.forEach((a) => console.warn("[blank]", a));
    if (!esLibre && (!perfil?.uid || !clase?.id)) {
      errorDev(
        "Faltan 'perfil' (con uid) o 'clase' (con id): la nota no se puede guardar. " +
        "Si es práctica sin nota, NO pases ni perfil ni clase (modo libre)."
      );
      resolve(0);
      return;
    }

    const esDoc = !esLibre && esDocente(perfil);
    const qid = id
      ? slug(String(id))
      : `${slug(fuente.slice(0, 60))}-${hash8(normalizar(fuente))}`;

    let envios = 0;         // envíos ya usados (0 = el próximo es el primero)
    let bloqueada = false;  // ejercicio terminado (resuelto, agotado o ya respondido)
    let resuelto = false;
    let yaEnviada = false;  // examen: guardado con la marca de enviado
    let ultimoResultado = null;
    let ganadoExacto = 0;   // valor acumulado (los fijos del 1.er envío
                            // valen COMPLETO; los corregidos al 2.º, MITAD)

    const resolverUnaVez = (valor) => {
      if (!resuelto) { resuelto = true; resolve(valor); }
    };

    // --- Estructura (SIN ninguna mención al puntaje: queda oculto) ---
    const caja = document.createElement("section");
    caja.className = "bl-caja";
    caja.setAttribute("aria-label", "Completar los espacios en blanco");
    caja.innerHTML = `
      <div class="bl-cab">
        <span class="bl-etiqueta">${esExamen ? "Examen" : esTarea ? "Tarea" : esLibre ? "Práctica" : "Completar"}</span>
        <span class="bl-chip"></span>
      </div>
      <p class="bl-texto"></p>
      <div class="bl-pie">
        <span class="bl-feedback" aria-live="polite"></span>
        ${esExamen ? "" : `<button type="button" class="bl-enviar" disabled>${esLibre ? "Comprobar" : "Enviar"}</button>`}
        ${esLibre ? '<button type="button" class="bl-ver">Mostrar respuestas</button>' : ""}
      </div>`;
    const parrafo = caja.querySelector(".bl-texto");
    const chipEl = caja.querySelector(".bl-chip");
    const feedbackEl = caja.querySelector(".bl-feedback");
    const btnEnviar = caja.querySelector(".bl-enviar"); // null en examen
    const btnVer = caja.querySelector(".bl-ver");       // null fuera de libre

    // Pintar el texto: segmentos (con $…$ renderizado) y huecos.
    lectura.partes.forEach((p) => {
      if (p.t === "txt") {
        const span = document.createElement("span");
        span.innerHTML = textoConFormulas(p.s);
        parrafo.append(span);
        return;
      }
      const b = lectura.blancos[p.i];
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "bl-entrada";
      inp.autocomplete = "off";
      inp.autocapitalize = "off";
      inp.autocorrect = "off";
      inp.spellcheck = false;
      inp.setAttribute("enterkeyhint", "done");
      inp.setAttribute("aria-label", `Espacio ${p.i + 1} de ${lectura.blancos.length}`);
      inp.placeholder = "…";
      // El hueco mide lo que su respuesta más larga (5..30 caracteres)
      const masLarga = Math.max(...b.sol.map((s) => s.length));
      inp.style.width = Math.min(30, Math.max(5, masLarga + 2)) + "ch";
      parrafo.append(inp);
      b.input = inp;
    });

    const blancos = lectura.blancos;
    const inputs = blancos.map((b) => b.input);

    const feedback = (mensaje, tipoFeedback) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "bl-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const feedbackHtml = (html, tipoFeedback) => {
      feedbackEl.innerHTML = html;
      feedbackEl.className = "bl-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const chip = (mensaje, tipoChip) => {
      chipEl.textContent = mensaje;
      chipEl.className = "bl-chip" + (tipoChip ? " " + tipoChip : "");
    };

    // Solución de UN espacio (comparación de texto: minúsculas y sin
    // ningún espacio, conservando tildes y signos).
    const esCorrectoCampo = (i, valor) =>
      (blancos[i].sol || []).some((s) => comparable(valor) === comparable(s));

    // Feedback que revela TODAS las respuestas EN SU ORDEN
    const decirSoluciones = (prefijo, tipoFeedback) => {
      const lista = blancos
        .map((b) => '<span class="bl-sol">' + textoConFormulas(b.sol[0]) + "</span>")
        .join(" · ");
      feedbackHtml(escapeHtml(prefijo) + " " + lista + ".", tipoFeedback);
    };

    // Revela en los PROPIOS huecos (en contexto) lo que faltaba
    const revelarEnHuecos = () => {
      blancos.forEach((b) => {
        if (b.asegurado) return;
        b.input.value = b.sol[0] || "";
        b.input.classList.remove("mal");
        b.input.classList.add("revelada");
      });
    };

    const bloquear = () => {
      bloqueada = true;
      if (btnEnviar) btnEnviar.disabled = true;
      inputs.forEach((inp) => (inp.disabled = true));
    };

    const refrescarEnviar = () => {
      if (!btnEnviar) return;
      if (bloqueada) return;
      if (esLibre) {
        btnEnviar.disabled = !inputs.some((inp) => inp.value.trim() !== "");
        return;
      }
      // clase/tarea: listo cuando TODOS los espacios vivos tienen texto
      btnEnviar.disabled = blancos.some(
        (b, i) => !b.asegurado && b.input.value.trim() === ""
      );
    };

    inputs.forEach((inp) => {
      inp.addEventListener("input", () => {
        if (bloqueada) return;
        inp.classList.remove("mal", "bien", "revelada");
        refrescarEnviar();
        if (inputs.every((x) => x.value.trim() === "")) feedback("", "");
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && btnEnviar && !btnEnviar.disabled) btnEnviar.click();
      });
    });
    refrescarEnviar(); // estado inicial: todo vacío → deshabilitado

    if (btnVer) {
      btnVer.addEventListener("click", () => {
        if (bloqueada) return;
        revelarEnHuecos();
        feedback("Estas son las respuestas. Puedes corregir y comprobar de nuevo.", "");
      });
    }

    // Valor de la parte de UN espacio (el total se reparte entre todos)
    const parte = puntaje / blancos.length;
    const pendientes = () =>
      blancos.map((_, i) => i).filter((i) => !blancos[i].asegurado);

    // --- Envío de clase, tarea y libre (botón) ---
    async function procesarEnvio() {
      if (bloqueada) return null;
      if (esExamen) return null; // el examen pasa por enviar()

      /* ─── PRÁCTICA LIBRE: comprobar sin límite, nada se guarda ─── */
      if (esLibre) {
        let correctos = 0;
        blancos.forEach((b, i) => {
          const inp = b.input;
          if (!inp.value.trim()) { inp.classList.remove("bien", "mal"); return; }
          const ok = esCorrectoCampo(i, inp.value);
          inp.classList.toggle("bien", ok);
          inp.classList.toggle("mal", !ok);
          if (ok) correctos++;
        });
        if (correctos === blancos.length) {
          chip("¡Completo!", "bien");
          feedback("¡Excelente! Todos los espacios están correctos.", "ok");
        } else {
          chip("Comprobado", "");
          feedback(
            `Correctos: ${correctos} de ${blancos.length}. Corrige los rojos y vuelve a comprobar.`,
            correctos > 0 ? "aviso" : ""
          );
        }
        return null;
      }

      /* ─── DOCENTE: intentos libres, puntaje local, nada se guarda ─── */
      if (esDoc) {
        const correctos = pendientes().filter((i) =>
          esCorrectoCampo(i, blancos[i].input.value)
        ).length;
        const ganado = redondear1(correctos * parte * (envios === 0 ? 1 : 1 / 2));
        envios++;
        if (revelar) {
          pendientes().forEach((i) => {
            const inp = blancos[i].input;
            const ok = esCorrectoCampo(i, inp.value);
            inp.classList.remove("mal");
            inp.classList.add(ok ? "bien" : "mal");
            if (!ok) {
              setTimeout(() => {
                if (!inp.classList.contains("bien")) inp.classList.remove("mal");
              }, 700);
            }
          });
        }
        if (correctos === blancos.length) {
          registrarPuntoDocente(perfil, clase, qid, ganado);
          chip(envios === 1 ? "Resuelto" : "Resuelto (intento " + envios + ")", "bien");
          feedback("¡Correcto! Vista docente: el puntaje está arriba y nada se guarda.", "ok");
          resolverUnaVez(ganado);
          return ganado;
        }
        if (correctos > 0) {
          registrarPuntoDocente(perfil, clase, qid, ganado);
          resolverUnaVez(ganado); // el archivo recibe el último envío que sumó
        }
        chip("Vista docente · intento " + (envios + 1), "");
        feedback(
          correctos > 0
            ? `Acertaste ${correctos} de ${blancos.length} espacios. Vista docente: el puntaje está arriba y nada se guarda.`
            : "Ningún espacio correcto. Puedes seguir intentando: nada se guarda.",
          correctos > 0 ? "ok" : "aviso"
        );
        return null;
      }

      /* ─── ESTUDIANTE · CLASE: 2 intentos, los buenos quedan fijos ─── */
      if (esTipoClase) {
        const primero = envios === 0;
        pendientes().forEach((i) => {
          const inp = blancos[i].input;
          if (esCorrectoCampo(i, inp.value)) {
            blancos[i].asegurado = true;
            inp.classList.remove("mal");
            inp.classList.add("bien");
            inp.disabled = true;
            ganadoExacto += parte * (primero ? 1 : 1 / 2);
          } else {
            inp.classList.add("mal");
            inp.value = ""; // limpiar para el reintento
          }
        });
        envios++;
        const asegurados = blancos.filter((b) => b.asegurado).length;
        const faltan = blancos.length - asegurados;

        if (faltan === 0) {
          const total = redondear1(ganadoExacto);
          bloquear();
          btnEnviar.textContent = "Respondido";
          chip(primero ? "Resuelto" : "Resuelto (2.º intento)", "bien");
          feedback(primero ? "¡Correcto! Muy bien." : "¡Correcto en tu segundo intento! Muy bien.", "ok");
          if (total > 0) sumarPuntos(perfil, clase, qid, total, { tipo }).catch(() => {});
          resolverUnaVez(total);
          return total;
        }

        if (primero) {
          chip("Intento 2 de 2", "aviso");
          btnEnviar.textContent = "Intentar de nuevo";
          feedback(
            `Acertaste ${asegurados} de ${blancos.length}. Tienes una segunda oportunidad: los espacios corregidos valen la mitad.`,
            "aviso"
          );
          btnEnviar.disabled = true; // hasta rellenar los que faltan
          const primeroVacio = blancos.find((b) => !b.asegurado && !b.input.disabled);
          if (primeroVacio) primeroVacio.input.focus();
          return null;
        }

        // Fin del 2.º envío sin completar → agotado (lo asegurado cuenta)
        const total = redondear1(ganadoExacto);
        bloquear();
        btnEnviar.textContent = "Sin más intentos";
        chip("Intentos agotados", "mal");
        decirSoluciones("Incorrecto otra vez. Se agotaron tus intentos: podrás volver a intentarlo en otra sesión.", "mal");
        revelarEnHuecos();
        if (total > 0) sumarPuntos(perfil, clase, qid, total, { tipo }).catch(() => {});
        resolverUnaVez(total);
        return total;
      }

      /* ─── ESTUDIANTE · TAREA: 2 envíos neutros; el 2.º decide ─── */
      if (esTarea) {
        if (envios === 0) {
          envios++;
          chip("Envío 2 de 2", "aviso");
          btnEnviar.textContent = "Enviar de nuevo";
          feedback("Respuesta enviada. Puedes modificarla y enviar una segunda vez.", "");
          return null; // la respuesta final (2.º envío) decide el puntaje
        }
        const correctos = pendientes().filter((i) =>
          esCorrectoCampo(i, blancos[i].input.value)
        ).length;
        const ganado = redondear1(correctos * parte * (1 / 2));
        bloquear();
        chip("Enviado", "");
        feedback("Respuesta enviada. No hay más envíos.", "");
        // v2 — el 2.º envío es EL que cuenta: se guarda SIEMPRE (0
        // incluido) para que Firebase registre la tarea respondida.
        sumarPuntos(perfil, clase, qid, ganado, { tipo }).catch(() => {});
        resolverUnaVez(ganado);
        return ganado;
      }

      return null;
    }

    if (btnEnviar) {
      btnEnviar.addEventListener("click", () => {
        procesarEnvio().catch((e) => console.error("[blank]", e));
      });
    }

    // Estado en vivo de los espacios (ya montados arriba)
    // Estado inicial por tipo y rol
    if (esDoc) {
      chip("Vista docente", "");
      feedback("Intentos libres, puntaje local arriba y nada se guarda.", "");
    } else if (esExamen) {
      chip("Sin enviar", "");
      feedback("El examen enviará todas tus respuestas al final.", "");
    } else if (esTarea) {
      chip("Envío 1 de 2", "");
      feedback("Completa los espacios y envía. Tienes hasta dos envíos.", "");
    } else if (esLibre) {
      chip("Práctica libre", "");
      feedback("Escribe en los huecos y comprueba las veces que quieras.", "");
    } else {
      chip("Intento 1 de 2", "");
    }

    if (esDoc) prepararDocente(perfil, clase); // restaura el head local si ya hay puntaje

    // --- Al montar (estudiante): ¿ya respondido o examen ya enviado? ---
    if (!esDoc && !esLibre) {
      obtenerNota(perfil, clase).then((nota) => {
        if (resuelto || bloqueada || envios > 0 || inputs.some((inp) => inp.value.trim() !== "")) return;
        const guardado = nota.preguntas ? nota.preguntas[qid] : undefined;
        const hecha = guardado != null;

        if (esExamen && (nota.enviado || hecha)) {
          yaEnviada = true;
          ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje, yaEnviado: true };
          bloquear();
          if (revelar) {
            revelarEnHuecos();
            decirSoluciones("Ya enviaste este examen.", "ok");
          } else {
            feedback("Ya enviaste este examen.", "");
          }
          chip("Examen enviado", "");
          resolverUnaVez(0);
          return;
        }
        if (hecha) {
          bloquear();
          if (revelar) {
            revelarEnHuecos();
            decirSoluciones("Ya completaste este ejercicio.", "ok");
          } else {
            feedback(esTarea ? "Ya enviaste esta tarea." : "Ya completaste este ejercicio.", "ok");
          }
          btnEnviar.textContent = "Respondido";
          chip("Respondido", "bien");
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

    // --- Guardado del examen (estudiante): valor + marca de enviado ---
    async function guardarExamen(ganado) {
      await guardarPreguntaExamen(perfil, clase, qid, ganado);
      yaEnviada = true;
      ultimoResultado = { puntos: ganado, maxPuntaje: puntaje };
    }

    // --- EXAMEN: el botón lo pone el archivo del examen ---
    enviarExamen = async function () {
      if (esDoc) {
        const correctos = pendientes().filter((i) =>
          esCorrectoCampo(i, blancos[i].input.value)
        ).length;
        const ganado = redondear1(correctos * parte);
        if (revelar) {
          pendientes().forEach((i) => {
            const inp = blancos[i].input;
            inp.classList.remove("mal");
            inp.classList.add(esCorrectoCampo(i, inp.value) ? "bien" : "mal");
          });
        }
        registrarPuntoDocente(perfil, clase, qid, ganado);
        chip("Vista docente", "");
        feedback("Enviado. El puntaje está en el head de arriba; nada se guarda.", "");
        resolverUnaVez(ganado);
        return { puntos: ganado, maxPuntaje: puntaje, docente: true };
      }

      if (yaEnviada) {
        return ultimoResultado || { puntos: 0, maxPuntaje: puntaje, yaEnviado: true };
      }

      const correctos = pendientes().filter((i) =>
        esCorrectoCampo(i, blancos[i].input.value)
      ).length;
      const ganado = redondear1(correctos * parte);
      if (revelar) {
        blancos.forEach((b, i) => {
          if (b.asegurado) return;
          b.input.classList.remove("mal");
          b.input.classList.add(esCorrectoCampo(i, b.input.value) ? "bien" : "mal");
        });
        if (correctos === blancos.length) feedback("Respuesta correcta.", "ok");
        else if (correctos > 0) feedback(`Respuesta enviada. Acertaste ${correctos} de ${blancos.length} espacios.`, "");
        else decirSoluciones("Respuesta incorrecta.", "mal");
      } else {
        feedback("Respuesta enviada.", "");
      }
      bloquear();
      chip("Enviado", "");
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
    aplicarTamano(caja, config); // columnas / ancho (tras el montaje)
    if (esLibre) resolverUnaVez(0); // la libre no genera nota
  }

  if (esExamen) promesa.enviar = () => enviarExamen();
  return promesa;
}

// Alias cómodo en español
export const completar = blank;