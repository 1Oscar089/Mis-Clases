// ============================================================
// ordenar.js — Bloque de ORDENAR objetos arrastrándolos a campos
// (js/utils/ordenar.js) · v4: OBJETOS EN ORDEN ALEATORIO (anti-copia)
// PERSISTENTE por navegador hasta responder (js/utils/aleatorio.js);
// antes v3: TAMAÑO en pantalla — 'columnas'
// (2 = mitad del ancho, 3 = tercio, 4 = cuarto → bloques LADO A LADO)
// o 'ancho' ("320px", "50%", 0.5…); antes v2: FÓRMULAS matemáticas
// ($…$), vía js/utils/formatearFormulas.js (antes v1: TIPOS
// clase/tarea/examen, docente con intentos libres, puntaje local,
// espejo en Sheets)
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: inserta un
// bloque con DOS lados. A la IZQUIERDA aparecen los objetos colocados
// AL AZAR; el estudiante los ARRASTRA hacia los CAMPOS numerados de la
// DERECHA, cada uno a su posición correcta (con ratón o tocando).
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { ordenar } from "../../../js/utils/ordenar.js";
//
//   ordenar({
//     contenedor,           // elemento del DOM donde insertar el bloque
//     perfil,               // perfil del usuario (users/{uid}: uid, rol, nie?)
//     clase,                // { id, grado, materiaId, materia?, titulo? }
//     tipo: "clase",        // "clase" | "tarea" | "examen"  (defecto: "clase")
//     indicacion: "Ordena de MENOR a MAYOR: $-2$, $\\frac{1}{4}$…",
//     lista: ["-2", "$\\frac{1}{4}$", "$\\frac{1}{2}$", "$\\frac{3}{4}$", "5"],
//                           // ENTRE 3 Y 10 objetos, EN SU ORDEN CORRECTO
//                           // (cada uno admite $fórmulas$)
//     distractores: ["$\\sqrt{2}$"],
//                           // 0 A 8 objetos extra que NO van en ningún campo
//     puntaje: 1,           // valor TOTAL del bloque (0 a 10)
//     // columnas: 2,       // NUEVO v3: el bloque ocupa LA MITAD del ancho
//     //                    //  (dos bloques en el MISMO contenedor quedan
//     //                    //  LADO A LADO; 3 = tercio, 4 = cuarto)
//     // ancho: "320px",    // NUEVO v3: ancho fijo ("50%", "18rem", 0.5…)
//     // mostrarCorrectas: true,  // SOLO examen: revela el orden al enviar
//     // id: "o1",          // (opcional) identificador único y estable
//   }).then((ganado) => { /* nota ganada en ESTE bloque (oculta) */ });
//
// MECÁNICA (regla del docente):
//   · La lista se escribe EN ORDEN: el 1.er objeto es el correcto para
//     el campo 1, el 2.º para el campo 2, etc. Los objetos (más los
//     distractores) se muestran ALEATORIAMENTE en la columna izquierda.
//   · Arrastrar un objeto a un campo lo COLOCA. Soltarlo sobre un campo
//     ocupado desde la lista REEMPLAZA (el que estaba vuelve a la
//     lista); de campo a campo ocupado INTERCAMBIA. Soltar sobre la
//     lista lo devuelve. En pantalla táctil: tocar un objeto y luego su
//     campo; tocar un objeto colocado lo devuelve a la lista.
//   · "Limpiar" devuelve a la lista TODOS los objetos no asegurados.
//   · Los DISTRACTORES no van en ningún campo: colocarlos es error.
//
// PUNTAJE REPARTIDO EN PARTES IGUALES (regla del docente):
//   · Cada campo vale  puntaje ÷ número de objetos de la lista
//     (ej.: 5 objetos y puntaje 1 → cada campo vale 0.2).
//
// ─── TIPO "clase" (defecto) ───
//   Dos envíos. "Enviar" exige TODOS los campos llenos (faltan →
//   aviso, no gasta el envío).
//   · 1.er envío: los campos correctos suman su valor COMPLETO y
//     quedan asegurados (verde, fijos); los objetos mal colocados se
//     devuelven a la lista (rojo).
//   · 2.º envío (corregir): los recién correctos valen LA MITAD cada
//     uno; el resto vale 0. Al terminar se revela el orden completo.
//     Se guarda el TOTAL una sola vez (si es > 0); si fue 0 el bloque
//     NO se guarda → reaparece fresco en otra sesión.
//
// ─── TIPO "tarea" ───
//   Los mismos dos envíos, pero la UI es NEUTRA: nunca dice si un
//   objeto está bien (sin verde/rojo, nada se asegura). El 1.er envío
//   es provisional (se puede mover todo) y el 2.º ES EL QUE CUENTA:
//   campo correcto → la MITAD de su valor, incorrecto → 0. Tras el
//   2.º envío se bloquea sin revelar nada.
//
// ─── TIPO "examen" ───
//   SIN botón propio: el archivo del examen pone SU botón "Enviar" al
//   final y envía todos los bloques de una vez:
//
//     const p = ordenar({ ..., tipo: "examen" });
//     // ... el estudiante coloca los objetos ...
//     const r = await p.enviar();  // → { puntos, maxPuntaje } del bloque
//     // ... tras todos los bloques:
//     const resumen = await finalizarExamen(perfil, clase, { titulo });
//     // resumen.puntos = nota del examen (mostrarla en pantalla)
//
//   · enviar() califica con UNA sola oportunidad: campo correcto →
//     valor completo, incorrecto o vacío → 0. Guarda SIEMPRE (0
//     incluido) con la marca de examen enviado.
//   · finalizarExamen() reporta el TOTAL al Sheet UNA sola vez (fila
//     del examen × columna del NIE): el examen queda bloqueado aunque
//     cierre y abra sesión.
//   · Al cargar, si ya está enviado → el bloque aparece bloqueado
//     ("Examen enviado") y enviar() devuelve el valor guardado.
//   · No muestra qué campos están correctos. SOLO si el docente marca
//     mostrarCorrectas: true en la configuración del examen se revela
//     el orden correcto al enviar. La nota la muestra el archivo del
//     examen con resumen.puntos.
//
// ─── DOCENTE (perfil.rol === "docente") ───
//   Intentos ILIMITADOS y NADA se guarda: ni Firestore, ni Sheets, ni
//   localStorage de notas. El puntaje de la clase se muestra en un head
//   morado DEBAJO DE LA USERBAR (sticky, compartido con las otras
//   utils) y vive SOLO en la pestaña (sessionStorage): cerrar la app lo
//   borra.
//   · clase: los campos correctos quedan asegurados y el head muestra
//     el ACUMULADO del bloque (1.er envío completo, siguientes a la
//     mitad).
//   · tarea: cada envío re-evalúa TODOS los campos y el ÚLTIMO valor
//     manda (1.er envío completo, siguientes a la mitad).
//   · examen: enviar() re-gradable a valor completo.
//
// QUÉ DEVUELVE — Promise<number> con lo ganado en ESTE bloque.
//   LA NOTA ES INVISIBLE: el recuadro NO muestra puntos ni los menciona.
//   · Si ya estaba respondida → 0 (no vuelve a sumar).
//   El estudiante solo ve cuántos objetos colocó y si tiene segundo envío.
//
// SUMATORIA FINAL (compartida con opcionMultiple.js, multipleOpcion.js,
// respuestaSimple.js y relacionar.js — usan las MISMAS obtenerNota() y
// sumarPuntos()):
//     const nota = await obtenerNota(perfil, clase);
//     nota.puntos  // suma de TODO lo respondido (esta sesión y anteriores).
//                  //   NO le sumes el valor devuelto por ordenar():
//                  //   sería duplicado.
//
// Persistencia (estudiante): localStorage "mco_nota_{uid}_{claseId}"
//   (instantáneo) + notas/{uid}/clases/{claseId} en Firestore vía db.js
//   (fuente de verdad) + ESPEJO en Google Sheets (clase y tarea
//   re-reportan el TOTAL tras guardar; el examen lo reporta
//   finalizarExamen UNA sola vez). Cada bloque guarda su valor UNA sola
//   vez (clave: id, o slug del texto + hash).
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

// Azar anti-copia (v4): orden aleatorio de la piscina PERSISTENTE por
// navegador hasta responder el bloque (js/utils/aleatorio.js).
import { ordenAlAzar, ordenPersistente, liberarOrden, claveOrden } from "./aleatorio.js";

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

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "ordenar-estilos";
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

    .or-caja {
      background: #ffffff;
      border: 1px solid #e6e6fa;
      border-left: 4px solid #4f46e5;
      border-radius: 1.1rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
    }

    .or-cab {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .5rem;
    }
    .or-etiqueta {
      background: rgba(79, 70, 229, .12);
      color: #4f46e5;
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .or-chip {
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      white-space: nowrap;
    }
    .or-chip.aviso { background: rgba(249, 115, 22, .14); color: #c2410c; }
    .or-chip.bien { background: rgba(22, 163, 52, .12); color: #15803d; }
    .or-chip.mal { background: rgba(239, 68, 68, .12); color: #b91c1c; }

    .or-indicacion {
      margin: 0 0 .35rem;
      font-size: 1.02rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.45;
    }
    .or-ayuda {
      margin: 0 0 .85rem;
      font-size: .84rem;
      color: #6b7280;
    }

    .or-zonas {
      display: flex;
      gap: .6rem;
      flex-wrap: wrap;
    }
    .or-lado {
      flex: 1 1 170px;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: .5rem;
    }
    .or-lado-titulo {
      margin: 0;
      font-size: .72rem;
      font-weight: 800;
      color: #6b7280;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .or-piscina {
      display: flex;
      flex-direction: column;
      gap: .55rem;
      min-height: 3.2rem;
      padding: .4rem;
      border: 1.5px dashed #d1d5db;
      border-radius: .9rem;
      transition: border-color .15s ease, background .15s ease;
    }
    .or-piscina.sobre { border-color: #4f46e5; background: rgba(79, 70, 229, .05); }

    .or-campos {
      display: flex;
      flex-direction: column;
      gap: .55rem;
    }
    .or-campo {
      display: flex;
      align-items: center;
      gap: .5rem;
      border: 1.5px dashed #d1d5db;
      border-radius: .9rem;
      background: #fafafa;
      padding: .4rem .45rem;
      min-height: 3.2rem;
      transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
    }
    .or-campo.lleno { border-style: solid; border-color: #c7d2fe; background: #ffffff; }
    .or-campo.sobre {
      border-color: #4f46e5;
      background: rgba(79, 70, 229, .06);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, .12);
    }
    .or-campo.buena { border-color: #16a34a; background: rgba(22, 163, 52, .05); }
    .or-num {
      flex: none;
      min-width: 22px;
      height: 22px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: .72rem;
      font-weight: 800;
      color: #3730a3;
      background: #e0e7ff;
    }
    .or-contenido { flex: 1; min-width: 0; display: flex; }

    .or-objeto {
      display: flex;
      align-items: center;
      gap: .55rem;
      width: 100%;
      font-family: inherit;
      text-align: left;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: .9rem;
      padding: .55rem .65rem;
      cursor: grab;
      font-size: .9rem;
      color: #374151;
      transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
    }
    .or-objeto:hover:not(:disabled) {
      border-color: #4f46e5;
      box-shadow: 0 4px 14px rgba(79, 70, 229, .16);
    }
    .or-objeto:active:not(:disabled) { cursor: grabbing; }
    .or-objeto:disabled { cursor: default; opacity: .9; }
    .or-objeto.arrastrando { opacity: .45; }
    .or-objeto.seleccionada { border-color: #4f46e5; background: rgba(79, 70, 229, .07); }
    .or-objeto.buena { border-color: #16a34a; background: rgba(22, 163, 52, .08); }
    .or-objeto.erronea {
      border-color: #ef4444;
      background: rgba(239, 68, 68, .07);
      animation: or-shake .3s ease;
    }
    @keyframes or-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }
    .or-texto { flex: 1; min-width: 0; }

    .or-pie {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: .85rem;
    }
    .or-feedback { flex: 1; min-width: 0; font-size: .88rem; font-weight: 600; color: #6b7280; }
    .or-feedback.ok { color: #16a34a; }
    .or-feedback.aviso { color: #f97316; }
    .or-feedback.mal { color: #ef4444; }

    .or-enviar {
      font-family: inherit;
      background: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .55rem 1.1rem;
      font-size: .88rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(79, 70, 229, .3);
      transition: background .15s ease, transform .15s ease;
    }
    .or-enviar:hover:not(:disabled) { background: #4338ca; }
    .or-enviar:active:not(:disabled) { transform: scale(.98); }
    .or-enviar:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
    }
    .or-limpiar {
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
    .or-limpiar:hover:not(:disabled) { border-color: #4f46e5; color: #4f46e5; }
    .or-limpiar:disabled {
      color: #d1d5db;
      border-color: #f3f4f6;
      cursor: not-allowed;
    }

    /* Caja roja cuando el contenido llamó a la utilidad con datos inválidos */
    .or-error-dev {
      border: 2px dashed #ef4444;
      border-left: 2px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      box-shadow: none;
    }

    @media (max-width: 767px) {
      .om-head-docente { top: 52px; padding: .4rem 1rem; }
      .or-caja { padding: 1rem; }
      .or-pie { flex-direction: column-reverse; align-items: stretch; }
      .or-enviar, .or-limpiar { justify-content: center; text-align: center; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Componente ---------------- */

/**
 * Inserta un bloque de ordenar objetos en el contenedor indicado.
 * Devuelve una Promise<number> con lo ganado en ESTE bloque (campos
 * correctos al 1.er envío valen completo; los corregidos al 2.º, la mitad;
 * en tarea el 2.º envío es el que cuenta; en examen enviar() es una sola
 * oportunidad a valor completo). Esa nota NUNCA se muestra en pantalla:
 * queda oculta para la sumatoria final (la misma de opcionMultiple.js).
 * Con tipo "examen" la promesa trae además .enviar() →
 * Promise<{ puntos, maxPuntaje }> para el botón final del examen.
 */
export function ordenar(config = {}) {
  const { contenedor, perfil, clase, id, indicacion } = config;

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
    console.warn("[ordenar] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
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
    const listaCfg = (Array.isArray(config.lista) ? config.lista : []).map((o) => String(o ?? "").trim());
    const distractores = (Array.isArray(config.distractores) ? config.distractores : [])
      .map((o) => String(o ?? "").trim());

    function errorDev(mensaje) {
      console.error("[ordenar]", mensaje);
      const div = document.createElement("div");
      div.className = "or-caja or-error-dev";
      div.textContent = "[ordenar] " + mensaje;
      contenedor.append(div);
    }

    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[ordenar] Falta 'contenedor' (elemento del DOM donde insertar el bloque).");
      resolve(0);
      return;
    }
    if (!TIPOS.includes(tipo)) {
      errorDev(`'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
      resolve(0);
      return;
    }
    if (!texto) { errorDev("Falta la indicación del bloque."); resolve(0); return; }
    if (listaCfg.length < 3 || listaCfg.length > 10) {
      errorDev(`La 'lista' debe tener entre 3 y 10 objetos en su orden correcto (llegó ${listaCfg.length}).`);
      resolve(0);
      return;
    }
    if (distractores.length > 8) {
      errorDev(`La lista 'distractores' debe tener entre 0 y 8 objetos (llegó ${distractores.length}).`);
      resolve(0);
      return;
    }
    if (listaCfg.some((o) => !o) || distractores.some((o) => !o)) {
      errorDev("Hay objetos vacíos (cada uno necesita texto).");
      resolve(0);
      return;
    }
    const todos = [...listaCfg, ...distractores];
    if (new Set(todos).size !== todos.length) {
      errorDev("Hay objetos repetidos (ni dentro de la lista, ni entre la lista y los distractores: serían indistinguibles).");
      resolve(0);
      return;
    }
    if (!perfil?.uid || !clase?.id) {
      errorDev("Faltan 'perfil' (con uid) o 'clase' (con id): la nota no se puede guardar.");
      resolve(0);
      return;
    }

    const esDoc = esDocente(perfil);

    // Objetos: la lista EN ORDEN primero (pos = campo correcto) y los
    // distractores al final (no van en ningún campo).
    const N = listaCfg.length;
    const objetos = listaCfg
      .map((t, pos) => ({ texto: t, esLista: true, pos }))
      .concat(distractores.map((t) => ({ texto: t, esLista: false, pos: -1 })));
    const valorCampo = puntaje / N; // reparto igualitario entre los campos
    const qid = id ? slug(String(id)) : `${slug(texto)}-${hash8(normalizar(texto))}`;

    // --- Orden ALEATORIO de la columna izquierda (Fisher-Yates), v4
    // PERSISTENTE por navegador (anti-copia): al recargar sin responder
    // sale IGUAL; respondido se libera y vuelve a sortear. El docente
    // ve un orden nuevo en cada montaje y nada se guarda.
    const indices = (n) => Array.from({ length: n }, (_, i) => i);
    const clavePiscina = claveOrden(qid);
    const ordenPiscina = esDoc
      ? mezclar(indices(objetos.length))
      : ordenPersistente(clavePiscina, objetos.length);

    // --- Estado ---
    let envios = 0;             // envíos ya usados en clase/tarea (0 = el próximo es el primero)
    let bloqueada = false;      // bloque terminado (resuelto, agotado, enviado o ya respondido)
    let resuelto = false;
    let yaEnviada = false;      // examen: guardado con la marca de enviado
    let ultimoResultado = null;
    let seleccionado = null;    // objeto tocado (fallback de clic, p. ej. táctil)
    let arrastre = null;        // objeto arrastrado (HTML5 drag & drop)
    let clicTrasArrastre = false; // ignora el clic que algunos navegadores disparan tras soltar
    let campoDe = Array(objetos.length).fill(null); // objeto → campo (null = en la lista)
    const aseguradas = new Set(); // campos correctos fijados (verde)
    let acumuladoExacto = 0;    // valor confirmado del bloque (exacto; se redondea al guardar)
    let logrados = 0;           // campos correctos confirmados
    let verificando = false;    // durante el flash rojo de los mal colocados
    let docenteCompleto = false; // docente clase: ya llenó los N campos bien

    const resolverUnaVez = (valor) => {
      if (!resuelto) {
        resuelto = true;
        // Respondido (o pre-marcado respondido): el orden guardado de
        // la piscina ya no hace falta y se libera para la próxima vez.
        if (!esDoc) liberarOrden(clavePiscina);
        resolve(valor);
      }
    };

    // --- Estructura (SIN ninguna mención al puntaje: queda oculto) ---
    const caja = document.createElement("section");
    caja.className = "or-caja";
    caja.setAttribute("aria-label", texto);
    caja.innerHTML = `
      <div class="or-cab">
        <span class="or-etiqueta">${esExamen ? "Examen" : esTarea ? "Tarea" : "Ordena"}</span>
        <span class="or-chip"></span>
      </div>
      <p class="or-indicacion"></p>
      <p class="or-ayuda"></p>
      <div class="or-zonas">
        <div class="or-lado">
          <p class="or-lado-titulo">Objetos</p>
          <div class="or-piscina" aria-label="Objetos en desorden"></div>
        </div>
        <div class="or-lado">
          <p class="or-lado-titulo">Orden correcto</p>
          <div class="or-campos"></div>
        </div>
      </div>
      <div class="or-pie">
        <span class="or-feedback" aria-live="polite"></span>
        <span style="display:flex; gap:.5rem; flex-wrap:wrap;">
          <button type="button" class="or-limpiar" disabled>Limpiar</button>
          ${esExamen ? "" : '<button type="button" class="or-enviar" disabled>Enviar</button>'}
        </span>
      </div>`;
    caja.querySelector(".or-indicacion").innerHTML = textoConFormulas(texto);

    let ayuda = "Arrastra cada objeto al campo numerado que le corresponde (o tócalo y luego toca su campo). Toca un objeto colocado para devolverlo a la lista.";
    if (distractores.length) ayuda += " Ojo: hay objetos que sobran y no van en ningún campo.";
    caja.querySelector(".or-ayuda").textContent = ayuda;

    const chipEl = caja.querySelector(".or-chip");
    const feedbackEl = caja.querySelector(".or-feedback");
    const btnEnviar = caja.querySelector(".or-enviar"); // null en examen
    const btnLimpiar = caja.querySelector(".or-limpiar");
    const elPiscina = caja.querySelector(".or-piscina");
    const elCampos = caja.querySelector(".or-campos");

    const feedback = (mensaje, tipoFeedback) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "or-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const chip = (mensaje, tipoChip) => {
      chipEl.textContent = mensaje;
      chipEl.className = "or-chip" + (tipoChip ? " " + tipoChip : "");
    };

    // --- Campos de destino (uno por objeto de la lista, numerados) ---
    const camposEl = [];
    for (let f = 0; f < N; f++) {
      const c = document.createElement("div");
      c.className = "or-campo";
      c.dataset.campo = String(f);
      const num = document.createElement("span");
      num.className = "or-num";
      num.textContent = String(f + 1);
      const cont = document.createElement("div");
      cont.className = "or-contenido";
      c.append(num, cont);

      c.addEventListener("dragover", (e) => {
        if (arrastre == null || bloqueada || verificando || aseguradas.has(f)) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = "move"; } catch (err) { /* sin dataTransfer */ }
        c.classList.add("sobre");
      });
      c.addEventListener("dragleave", () => c.classList.remove("sobre"));
      c.addEventListener("drop", (e) => {
        e.preventDefault();
        c.classList.remove("sobre");
        if (arrastre == null || bloqueada || verificando || aseguradas.has(f)) return;
        colocar(arrastre, f);
        arrastre = null;
      });
      c.addEventListener("click", (e) => {
        // El clic sobre una carta la maneja la propia carta (viene burbujeando)
        if (e.target.closest(".or-objeto")) return;
        if (bloqueada || verificando || seleccionado == null || aseguradas.has(f)) return;
        colocar(seleccionado, f);
      });

      elCampos.append(c);
      camposEl.push(c);
    }

    // --- Objetos arrastrables (viven en la piscina o dentro de un campo) ---
    const botones = objetos.map((o, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "or-objeto";
      b.draggable = true;
      b.dataset.obj = String(k);
      const t = document.createElement("span");
      t.className = "or-texto";
      t.innerHTML = textoConFormulas(o.texto); // admite $fórmulas$
      b.append(t);

      b.addEventListener("dragstart", (e) => {
        if (bloqueada || verificando || b.disabled) { e.preventDefault(); return; }
        arrastre = k;
        clicTrasArrastre = true;
        try {
          e.dataTransfer.setData("text/plain", String(k));
          e.dataTransfer.effectAllowed = "move";
        } catch (err) { /* navegador sin dataTransfer */ }
        b.classList.add("arrastrando");
      });
      b.addEventListener("dragend", () => {
        b.classList.remove("arrastrando");
        elPiscina.classList.remove("sobre");
        camposEl.forEach((c) => c.classList.remove("sobre"));
        setTimeout(() => { arrastre = null; clicTrasArrastre = false; }, 0);
      });
      b.addEventListener("click", () => alClicObjeto(k));
      return b;
    });

    // La piscina también recibe soltar → devuelve el objeto a la lista
    elPiscina.addEventListener("dragover", (e) => {
      if (arrastre == null || bloqueada || verificando) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = "move"; } catch (err) { /* sin dataTransfer */ }
      elPiscina.classList.add("sobre");
    });
    elPiscina.addEventListener("dragleave", () => elPiscina.classList.remove("sobre"));
    elPiscina.addEventListener("drop", (e) => {
      e.preventDefault();
      elPiscina.classList.remove("sobre");
      if (arrastre == null || bloqueada || verificando) return;
      devolver(arrastre);
      arrastre = null;
    });

    // Pintado inicial: todos los objetos AL AZAR en la lista izquierda
    repintar();

    // --- Pintar el estado (colocación, colores, selecciones, disabled) ---
    function repintar() {
      elPiscina.innerHTML = "";
      ordenPiscina.forEach((k) => { if (campoDe[k] == null) elPiscina.append(botones[k]); });
      camposEl.forEach((c, f) => {
        const cont = c.querySelector(".or-contenido");
        cont.innerHTML = "";
        const k = campoDe.indexOf(f);
        if (k >= 0) cont.append(botones[k]);
        c.classList.toggle("lleno", k >= 0);
        c.classList.toggle("buena", aseguradas.has(f));
        c.classList.remove("sobre");
      });
      botones.forEach((b, k) => {
        const f = campoDe[k];
        b.classList.remove("seleccionada", "buena", "erronea", "arrastrando");
        if (f != null && aseguradas.has(f)) b.classList.add("buena");
        if (seleccionado === k) b.classList.add("seleccionada");
        b.disabled = bloqueada || (f != null && aseguradas.has(f));
        b.setAttribute("aria-pressed", seleccionado === k ? "true" : "false");
      });
    }

    // --- Pie: chip y botones según el estado/tipo ---
    function actualizarPie() {
      const ocupados = campoDe.filter((v) => v != null).length;
      const colocadasNoFijas = campoDe.some((f, k) => f != null && !aseguradas.has(f));
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
          chip(`${ocupados} de ${N} campos`, "");
        } else {
          chip(esTarea ? "Envío 2 de 2" : "Intento 2 de 2", "aviso");
        }
        if (btnEnviar) btnEnviar.disabled = verificando || docenteCompleto || ocupados < N;
      }
      btnLimpiar.disabled = bloqueada || verificando || !colocadasNoFijas;
    }

    // --- Colocar / devolver (sirven para el arrastre y para el clic) ---
    function colocar(k, f) {
      if (bloqueada || verificando || k == null || f == null) return;
      if (aseguradas.has(f)) return;
      const origen = campoDe[k];
      if (origen != null && aseguradas.has(origen)) return; // fija: no se mueve
      if (origen === f) { seleccionado = null; repintar(); actualizarPie(); return; }
      const ocupante = campoDe.indexOf(f);
      if (ocupante >= 0) {
        // De lista a campo ocupado → el ocupante vuelve a la lista.
        // De campo a campo ocupado → intercambio.
        campoDe[ocupante] = origen != null ? origen : null;
      }
      campoDe[k] = f;
      seleccionado = null;
      repintar();
      actualizarPie();
      feedback("", "");
    }

    function devolver(k) {
      if (k == null || bloqueada || verificando) return;
      const f = campoDe[k];
      if (f == null || aseguradas.has(f)) return;
      campoDe[k] = null;
      repintar();
      actualizarPie();
      feedback("", "");
    }

    // Clic en un objeto (fallback de arrastre: ideal para pantalla táctil)
    function alClicObjeto(k) {
      if (clicTrasArrastre) { clicTrasArrastre = false; return; }
      if (bloqueada || verificando) return;
      const b = botones[k];
      if (b.disabled) return;
      const f = campoDe[k];
      if (f != null) {
        // Colocada → devolverla a la lista y dejarla seleccionada
        if (aseguradas.has(f)) return;
        campoDe[k] = null;
        seleccionado = k;
        repintar();
        actualizarPie();
        feedback("", "");
        return;
      }
      // En la lista → alternar selección (luego se toca el campo)
      seleccionado = seleccionado === k ? null : k;
      repintar();
      actualizarPie();
      feedback("", "");
    }

    // Limpiar: devuelve a la lista TODOS los objetos no asegurados
    btnLimpiar.addEventListener("click", () => {
      if (bloqueada || verificando) return;
      campoDe.forEach((f, k) => { if (f != null && !aseguradas.has(f)) campoDe[k] = null; });
      seleccionado = null;
      repintar();
      actualizarPie();
      feedback("", "");
    });

    // --- Evaluación: campos correctos e incorrectos (salta los fijados) ---
    function evaluarCampos() {
      const buenas = [];
      const malas = [];
      campoDe.forEach((f, k) => {
        if (f == null || aseguradas.has(f)) return;
        if (objetos[k].esLista && objetos[k].pos === f) buenas.push(k);
        else malas.push(k);
      });
      return { buenas, malas };
    }

    const marcarErroneas = (malas) => {
      malas.forEach((k) => botones[k].classList.add("erronea"));
    };

    // Revela el ORDEN correcto: cada campo queda con su objeto (fin de
    // clase/examen con mostrarCorrectas, o bloque ya respondido).
    function revelarCorrectas() {
      const enCampo = new Set();
      for (let f = 0; f < N; f++) {
        const k = objetos.findIndex((o) => o.esLista && o.pos === f);
        campoDe[k] = f;
        enCampo.add(k);
      }
      campoDe.forEach((f, k) => { if (f != null && !enCampo.has(k)) campoDe[k] = null; });
      for (let f = 0; f < N; f++) aseguradas.add(f);
      seleccionado = null;
    }

    function bloquearTodo() {
      bloqueada = true;
      verificando = false;
      if (btnEnviar) btnEnviar.disabled = true;
      btnLimpiar.disabled = true;
      repintar();
    }

    // --- Fin del bloque (estudiante): guarda el TOTAL una vez ---
    function terminar(total, chipTxt, chipTipo, fbTxt, fbTipo, btnTxt, revelarAlFinal) {
      if (revelarAlFinal) revelarCorrectas();
      seleccionado = null;
      bloquearTodo();
      if (btnEnviar) btnEnviar.textContent = btnTxt;
      chip(chipTxt, chipTipo);
      feedback(fbTxt, fbTipo);
      if (total > 0) sumarPuntos(perfil, clase, qid, total, { tipo }).catch(() => {});
      resolverUnaVez(total); // ← la nota solo la recibe el archivo de la clase
    }

    /* --- DOCENTE: verificación con intentos libres, head local y CERO
       guardado. clase: correctos fijos + acumulado; tarea: cada envío
       re-evalúa todos los campos y el ÚLTIMO valor manda. --- */
    function verificarDocente() {
      const primero = envios === 0;
      const factor = primero ? 1 : 1 / 2;
      const { buenas, malas } = evaluarCampos();

      if (revelar) {
        buenas.forEach((k) => aseguradas.add(campoDe[k]));
        logrados += buenas.length;
        acumuladoExacto += buenas.length * valorCampo * factor;
        malas.forEach((k) => { campoDe[k] = null; });
        registrarPuntoDocente(perfil, clase, qid, redondear2(acumuladoExacto));
        resolverUnaVez(redondear2(acumuladoExacto));
        envios++;
        if (aseguradas.size === N) {
          docenteCompleto = true;
          repintar();
          actualizarPie();
          feedback("¡Todos los objetos en su campo! El puntaje está arriba: nada se guarda.", "ok");
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
            feedback(`Vista docente: ${logrados} de ${N}. Los mal colocados se devolvieron: sigue intentando (nada se guarda).`, "aviso");
          }, 900);
        } else {
          repintar();
          actualizarPie();
          feedback(`Vista docente: ${logrados} de ${N}. Sigue colocando y verificando: nada se guarda.`, "aviso");
        }
        return;
      }

      // Tarea (neutra): el último valor evaluado manda en el head
      const total = redondear2(buenas.length * valorCampo * factor);
      registrarPuntoDocente(perfil, clase, qid, total);
      resolverUnaVez(total);
      envios++;
      repintar();
      actualizarPie();
      feedback("Envío realizado. Puedes mover los objetos y verificar otra vez: nada se guarda.", "");
    }

    // --- Enviar (clase y tarea; el examen pasa por enviar()) ---
    async function procesarEnvio() {
      if (bloqueada || verificando) return;
      if (esExamen) return;

      const ocupados = campoDe.filter((v) => v != null).length;
      if (ocupados < N) {
        const faltan = N - ocupados;
        feedback(
          faltan === 1
            ? "Te falta 1 campo por llenar."
            : `Te faltan ${faltan} campos por llenar.`,
          "aviso"
        );
        return; // no gasta el envío
      }

      if (esDoc) {
        verificarDocente();
        return;
      }

      const { buenas, malas } = evaluarCampos();

      /* ESTUDIANTE · CLASE: 1.er envío completo y fijos; 2.º a la mitad */
      if (esTipoClase) {
        const primero = envios === 0;
        const factor = primero ? 1 : 1 / 2;
        buenas.forEach((k) => aseguradas.add(campoDe[k]));
        logrados += buenas.length;
        acumuladoExacto += buenas.length * valorCampo * factor;
        malas.forEach((k) => { campoDe[k] = null; });

        // Todos los campos correctos → el bloque termina aquí
        if (aseguradas.size === N) {
          const total = redondear2(acumuladoExacto);
          if (primero) {
            terminar(total, "Resuelta", "bien", "¡Excelente! Todos los objetos están en su campo.", "ok", "Respondida", true);
          } else {
            terminar(total, "Resuelta (2.º envío)", "bien", "¡Excelente en tu segundo envío! Todos los objetos están en su campo.", "ok", "Respondida", true);
          }
          return;
        }

        if (!primero) {
          // 2.º envío: se acaba el bloque (con flash rojo si hubo malos)
          const total = redondear2(acumuladoExacto);
          const fin = () => {
            if (total > 0) {
              terminar(total, "Respondida (2.º envío)", "aviso", `Encontraste ${logrados} de ${N}. El resto queda revelado.`, "aviso", "Respondida", true);
            } else {
              terminar(0, "Intentos agotados", "mal", "Ningún objeto en su campo. Se agotaron tus envíos: podrás volver a intentarlo en otra sesión.", "mal", "Sin más intentos", true);
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

        // 1.er envío con campos incorrectos → segunda oportunidad
        envios = 1;
        btnEnviar.textContent = "Intentar de nuevo";
        const finFlash = () => {
          verificando = false;
          repintar();
          actualizarPie();
          feedback(`Encontraste ${logrados} de ${N}. Se devolvieron los objetos mal colocados: tienes un segundo envío.`, "aviso");
        };
        if (malas.length) {
          verificando = true;
          actualizarPie();
          marcarErroneas(malas);
          setTimeout(finFlash, 900);
        } else {
          repintar();
          actualizarPie();
          feedback(`Encontraste ${logrados} de ${N}: tienes un segundo envío.`, "aviso");
        }
        return;
      }

      /* ESTUDIANTE · TAREA: 2 envíos neutros; el 2.º es el que cuenta */
      if (esTarea) {
        if (envios === 0) {
          envios = 1;
          actualizarPie(); // chip "Envío 2 de 2"
          btnEnviar.textContent = "Enviar de nuevo";
          feedback("Envío realizado. Puedes mover los objetos antes del segundo envío.", "");
          return; // la respuesta final (2.º envío) decide el puntaje
        }
        const total = redondear2(buenas.length * valorCampo * (1 / 2));
        terminar(total, "Enviada", "", "Respuesta enviada. No hay más envíos.", "", "Enviada", false);
      }
    }

    if (btnEnviar) {
      btnEnviar.addEventListener("click", () => {
        procesarEnvio().catch((e) => console.error("[ordenar]", e));
      });
    }

    // --- EXAMEN: el botón lo pone el archivo del examen ---
    enviarExamen = async function () {
      if (esDoc) {
        const { buenas, malas } = evaluarCampos();
        const total = redondear2(buenas.length * valorCampo);
        if (revelar) malas.forEach((k) => botones[k].classList.add("erronea"));
        registrarPuntoDocente(perfil, clase, qid, total);
        chip("Vista docente", "");
        feedback("Enviado. El puntaje está en el head de arriba; nada se guarda.", "");
        resolverUnaVez(total);
        return { puntos: total, maxPuntaje: puntaje, docente: true };
      }

      if (yaEnviada) {
        return ultimoResultado || { puntos: 0, maxPuntaje: puntaje, yaEnviado: true };
      }

      // UNA sola oportunidad: campo correcto → valor completo;
      // incorrecto o vacío → 0.
      const { buenas } = evaluarCampos();
      const total = redondear2(buenas.length * valorCampo);
      if (revelar) {
        revelarCorrectas();
        repintar();
      }
      bloquearTodo();
      chip("Enviada", "");
      feedback(
        revelar
          ? "Envío del examen realizado. Los campos correctos quedaron marcados."
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
      feedback("Coloca todos los objetos y envía. Tienes hasta dos envíos.", "");
    }

    // --- Al montar (estudiante): ¿ya respondida o examen ya enviado? ---
    if (!esDoc) {
      obtenerNota(perfil, clase).then((nota) => {
        if (resuelto || bloqueada || envios > 0 || campoDe.some((v) => v != null) || seleccionado != null) return;
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
    aplicarTamano(caja, config); // v3: columnas / ancho (tras el montaje)
  }

  if (esExamen) promesa.enviar = () => enviarExamen();
  return promesa;
}