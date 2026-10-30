// ============================================================
// respuestaSimple.js — Pregunta de respuesta simple (texto o FÓRMULA)
// (js/utils/respuestaSimple.js) · v5.3: enviar UNA respuesta en examen
// YA NO CIERRA el examen entero (guardarPreguntaExamen v6.3 dejó de
// marcar nota.enviado): la respuesta queda fijada y guardada en
// Firebase y el examen sigue ABIERTO para los demás bloques hasta el
// envío final (botón «Enviar examen» / timer). Al reabrir, la pregunta
// ya respondida aparece «Enviada» (no «Examen enviado» si el examen
// sigue abierto). También v5.3 — TAREA: el 2.º envío ES el que cuenta
// y se guarda SIEMPRE (0 incluido) para que Firebase registre la
// respuesta. Antes v5.2: el EXAMEN ya MUESTRA su botón «Enviar
// respuesta» (lo pedía el docente): enviar una respuesta en examen la
// FIJA (una sola oportunidad) y queda guardada; lo pendiente lo
// califica el envío final (botón botonEnviar o el de siempre) vía el
// registro window.__mcoEnvioExamen. Antes v5: MULTI-CAMPO —
// 'respuestas' como LISTA (un campo por respuesta, validados EN ESE
// ORDEN) o NÚMERO (N campos iguales), con 'etiquetas' opcionales +
// TAMAÑO en pantalla ('columnas' / 'ancho'); antes v4: modo esFormula
// con MathLive (campo <math-field> + SU teclado virtual completo);
// antes v3: teclado propio de formatearFormulas.js · antes v2: TIPOS
// clase/tarea/examen, docente con intentos libres, espejo Sheets
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: inserta una
// pregunta con un campo de respuesta y valida lo que escriba el estudiante.
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { respuestaSimple } from "../../../js/utils/respuestaSimple.js";
//
//   respuestaSimple({
//     contenedor,           // elemento del DOM donde insertar la pregunta
//     perfil,               // perfil del usuario (users/{uid}: uid, rol, nie?)
//     clase,                // { id, grado, materiaId, materia?, dia?, unidad?, leccion? }
//     tipo: "clase",        // "clase" | "tarea" | "examen"  (defecto: "clase")
//     indicacion: "¿Quién escribió El Quijote?",
//     respuestaCorrecta: "Miguel de Cervantes", // texto esperado (o LISTA)
//     puntaje: 2,           // valor de esta pregunta (0 a 10)
//     // columnas: 2,       // NUEVO v5: la pregunta ocupa LA MITAD del ancho
//     //                    //  (dos preguntas en el MISMO contenedor quedan
//     //                    //  LADO A LADO; 3 = tercio, 4 = cuarto)
//     // ancho: "320px",    // NUEVO v5: ancho fijo ("50%", "18rem", 0.5…)
//     // id: "p7",          // (opcional) identificador único y estable
//   }).then((ganado) => { /* nota ganada en ESTA pregunta (oculta) */ });
//
// ─── MÚLTIPLES CAMPOS (v5 · modo TEXTO) ───
//   Una sola indicación con VARIOS espacios para responder (p. ej. 5
//   imágenes en la clase y un campo debajo de cada una):
//
//     respuestaSimple({
//       ...,
//       indicacion: "Mira cada figura y escribe la fracción que le toca:",
//       respuestas: ["1/2", "3/4", "2/3", "5/8", "7/10"],
//                       // ← UN CAMPO por respuesta, EN ESE ORDEN:
//                       //    el campo 1 valida "1/2", el 2.º "3/4"…
//       // etiquetas: ["Figura 1", "Figura 2", ...], // rótulos opcionales
//       puntaje: 5,
//     });
//
//   · 'respuestas' también acepta UN NÚMERO: respuestas: 5 → 5 campos
//     que validan TODOS contra 'respuestaCorrecta' (y sus equivalentes).
//   · Cada elemento de la lista puede ser UN texto o UNA LISTA de
//     equivalentes: respuestas: ["3", ["5", "cinco"], "8"].
//   · La comparación por campo es la de siempre (minúsculas, sin
//     espacios, tildes y signos intactos).
//   · PUNTAJE repartido: cada campo vale puntaje ÷ número de campos.
//     Regla de SIEMPRE: los correctos al 1.er envío valen COMPLETO y
//     quedan fijos (verde); los corregidos al 2.º envío valen LA MITAD
//     de su parte; lo fallado en ambos → 0 (lo asegurado sí se guarda).
//   · 'etiquetas' (opcional): rótulo de cada campo. Sin él: "Respuesta
//     1", "Respuesta 2"…
//   · En modo FÓRMULA (esFormula) por ahora SOLO un campo: pasar
//     'respuestas' con más de uno muestra aviso de contenido.
//
// ─── RESPUESTA FÓRMULA: esFormula: true (v4 · MathLive) ───
//   Para matemática (fracciones, raíces, exponentes…):
//
//     respuestaSimple({
//       ...,
//       esFormula: true,                    // ← la respuesta es una FÓRMULA
//       indicacion: "Resuelve $x^2 = 9$ y escribe la solución positiva.",
//       respuestaCorrecta: "x = 3",         // LaTeX (o lista de aceptadas:
//                                           //  ["x = 3", "x = +3"])
//     });
//
//   · La respuesta se arma SOLO con el TECLADO VIRTUAL de MathLive
//     (capas 123 / símbolos / abc / αβγ / funciones: todos los símbolos
//     y letras, fracciones, raíces, exponentes…) que viene con la
//     pregunta: NO hay campo de texto físico ni pegado — el teclado
//     físico y el portapapeles se BLOQUEAN por captura, así NADIE puede
//     escribir otra cosa; el valor guardado es LaTeX limpio de MathLive.
//   · El campo <math-field> muestra la fórmula renderizada en vivo,
//     como en un editor profesional de matemática.
//   · Comparación TOLERANTE (normalizarFormula): espacios fuera,
//     \dfrac = \frac, coma decimal = punto, × = ·, x^2 = x^{2}, etc.
//   · respuestaCorrecta acepta UN string LaTeX o una LISTA de
//     equivalentes (también en modo texto normal).
//
// COMPARACIÓN AL VALIDAR en modo TEXTO (para que no importe cómo la
//   escriba):
//   · Se convierte TODO a MINÚSCULAS (no importa mayúsculas/minúsculas).
//   · Se quitan TODOS los espacios en blanco (antes, dentro y después).
//   · SÍ se respetan las TILDES y los signos: "Árbol" ≠ "arbol", "1.5" ≠ "15".
//     Ej.: "  MIGUEL   de cervantes " = "Miguel de Cervantes" ✓
//   En modo FÓRMULA compara con respuestasEquivalentes() de
//   formatearFormulas.js (normalización de LaTeX tolerante).
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
//   Dos intentos (completo/mitad). MUESTRA si lo escrito es correcto
//   (borde verde/rojo + feedback). Botón "Enviar respuesta".
//
// ─── TIPO "tarea" ───
//   Los mismos dos intentos y el mismo puntaje, pero la UI es
//   NEUTRA: nunca dice si lo enviado fue correcto ni pone el borde
//   verde/rojo. Botón "Enviar respuesta": el 1.er envío vale
//   completo y el 2.º (si lo hay, aunque el 1.º hubiera sido
//   correcto) es EL QUE CUENTA: correcto → mitad, incorrecto → 0.
//   Tras el 2.º envío se bloquea.
//
// ─── TIPO "examen" ───
//   Con botón propio (v5.2) + el botón final del examen:
//
//     const p = respuestaSimple({ ..., tipo: "examen" });
//     // el estudiante responde y PRESIONA «Enviar respuesta»: la
//     // pregunta se califica UNA sola vez (correcto → puntaje
//     // completo, vacío/incorrecto → 0), se guarda y queda fija.
//     // También puede programarse: r = await p.enviar();
//     // ... tras todos los bloques:
//     const resumen = await finalizarExamen(perfil, clase, { titulo });
//     // resumen.puntos = nota del examen (mostrarla en pantalla)
//
//   · Las respuestas que el estudiante NO envió una a una quedan
//     registradas en window.__mcoEnvioExamen: el botón final del
//     examen (utils/botonEnviar.js) o el «Enviar examen» de siempre
//     las califica TODAS justo antes de cerrar (lo vacío → 0).
//   · finalizarExamen() fija nota.enviado = true y reporta el TOTAL
//     al Sheet UNA sola vez (fila del examen × columna del NIE):
//     el examen queda bloqueado aunque cierre y abra sesión.
//   · Al cargar, si nota.enviado → todos los bloques aparecen
//     bloqueados ("Examen enviado").
//   · No muestra si lo escrito es correcto. SOLO si el docente marca
//     en la configuración del examen mostrarCorrectas: true se
//     revelan al enviar (borde verde/rojo + la respuesta correcta).
//     La nota obtenida la muestra el archivo del examen con
//     resumen.puntos.
//
// ─── DOCENTE (perfil.rol === "docente") ───
//   Intentos ILIMITADOS y NADA se guarda: ni Firestore, ni Sheets,
//   ni localStorage de notas. El puntaje de la clase se muestra en
//   un head morado DEBAJO DE LA USERBAR (sticky) y vive SOLO en
//   la pestaña (sessionStorage): cerrar la app lo borra.
//
// Persistencia (estudiante): la MISMA de opcionMultiple.js —
//   localStorage "mco_nota_{uid}_{claseId}" (instantáneo) + notas/
//   {uid}/clases/{claseId} en Firestore vía js/data/db.js (fuente de
//   verdad) + ESPEJO en Google Sheets (db.notas.reportarActividad):
//   clase y tarea re-reportan el TOTAL tras cada pregunta; el examen
//   se reporta UNA vez desde finalizarExamen(). Cada pregunta guarda
//   su valor UNA sola vez (clave: id, o slug del texto + hash). Lo no
//   sumado no se guarda → las preguntas falladas reaparecen frescas.
//   OJO: si el MISMO texto de pregunta se usa en dos utilidades
//   distintas de la misma clase, dales 'id' diferentes.
//
// SUMATORIA FINAL DE LA CLASE (compartida con opcionMultiple.js y
// multipleOpcion.js — usan las MISMAS obtenerNota() y sumarPuntos(),
// re-exportadas aquí):
//     const nota = await obtenerNota(perfil, clase);
//     nota.puntos  // ← suma de TODO lo respondido (esta sesión y anteriores).
//                  //   NO le sumes el valor devuelto por respuestaSimple():
//                  //   sería duplicado.
//
// Compatibilidad: también acepta los nombres antiguos pregunta /
//   respuesta, y puntaje por defecto = 1. Sin 'tipo' se comporta
//   como "clase": los contenidos viejos siguen igual.
//
// Compartido con opcionMultiple.js (v3) y multipleOpcion.js (v4): esta
//   utilidad usa SUS helpers (esDocente, prepararDocente,
//   registrarPuntoDocente, guardarPreguntaExamen, obtenerNota,
//   sumarPuntos, finalizarExamen) para que todas las utilidades se
//   comporten igual (un solo head de docente, una sola lógica de
//   guardado).
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

// Fórmulas (v4): render + comparación tolerante. El TECLADO ya no es
// el propio de formatearFormulas.js: ahora es el de MathLive.
import {
  cargarFormulas,
  textoConFormulas,
  formatearFormula,
  respuestasEquivalentes,
} from "./formatearFormulas.js";

import { escapeHtml } from "./helpers.js";

// Comodines para el archivo de contenido (misma API que opcionMultiple.js)
export { obtenerNota, sumarPuntos, finalizarExamen } from "./opcionMultiple.js";

/* ------------- Carga de MathLive (solo modo fórmula) -------------
   MathLive trae el campo <math-field> (muestra la fórmula renderizada
   en vivo) y SU teclado virtual completo: capas 123, símbolos, letras
   abc, griego y funciones. Versión FIJADA. Si el CDN falla, la zona
   muestra un aviso claro y NO hay campo alternativo a propósito: la
   regla de esFormula es que la respuesta SOLO salga del teclado. */

const MATHLIVE_VERSION = "0.111.1";
const MATHLIVE_URL = `https://cdn.jsdelivr.net/npm/mathlive@${MATHLIVE_VERSION}/mathlive.min.mjs`;
const MATHLIVE_FONTS = `https://cdn.jsdelivr.net/npm/mathlive@${MATHLIVE_VERSION}/fonts`;

let promesaMathLive = null;

function cargarMathLive() {
  if (!promesaMathLive) {
    promesaMathLive = import(MATHLIVE_URL)
      .then((ml) => {
        if (ml && ml.MathfieldElement) {
          try {
            // Fuentes junto al módulo (CDN) y sin sonidos: menos peticiones.
            ml.MathfieldElement.fontsDirectory = MATHLIVE_FONTS;
            ml.MathfieldElement.soundsDirectory = null;
          } catch (e) { /* opciones no disponibles en esta versión */ }
        }
        return ml;
      });
    // Si falla, permitir reintentarlo en el próximo montaje
    promesaMathLive.catch(() => { promesaMathLive = null; });
  }
  return promesaMathLive;
}

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
// pero conservando tildes y signos (Árbol ≠ arbol · "1.5" ≠ "15").
function comparable(texto) {
  return String(texto ?? "").toLowerCase().replace(/\s+/g, "");
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "respuesta-simple-estilos";
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

    .re-caja {
      background: #ffffff;
      border: 1px solid #e0f4f7;
      border-left: 4px solid #0891b2;
      border-radius: 1.1rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
    }

    .re-cab {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .5rem;
    }
    .re-etiqueta {
      background: rgba(8, 145, 178, .12);
      color: #0891b2;
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .re-chip {
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      white-space: nowrap;
    }
    .re-chip.aviso { background: rgba(249, 115, 22, .14); color: #c2410c; }
    .re-chip.bien { background: rgba(22, 163, 52, .12); color: #15803d; }
    .re-chip.mal { background: rgba(239, 68, 68, .12); color: #b91c1c; }

    .re-pregunta {
      margin: 0 0 .75rem;
      font-size: 1.02rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.45;
    }

    /* ── MULTI-CAMPO (v5): varios espacios para responder ── */
    .re-campos {
      display: flex;
      flex-direction: column;
      gap: .6rem;
      margin-bottom: .25rem;
    }
    .re-campo {
      display: flex;
      flex-direction: column;
      gap: .3rem;
      min-width: 0;
    }
    .re-campo-etq {
      font-size: .8rem;
      font-weight: 800;
      color: #0e7490;
      line-height: 1.3;
    }

    .re-input {
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
      font-size: 1rem; /* 16px: evita el zoom automático en iOS */
      line-height: 1.4;
      color: #1f2937;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: .9rem;
      padding: .6rem .8rem;
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
    }
    .re-input::placeholder { color: #9ca3af; }
    .re-input:focus {
      outline: none;
      border-color: #0891b2;
      box-shadow: 0 0 0 3px rgba(8, 145, 178, .15);
    }
    .re-input:disabled { background: #f9fafb; color: #6b7280; }
    .re-input.bien { border-color: #16a34a; background: rgba(22, 163, 52, .06); }
    .re-input.mal {
      border-color: #ef4444;
      background: rgba(239, 68, 68, .05);
      animation: re-shake .3s ease;
    }
    @keyframes re-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .re-pie {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: .75rem;
    }
    .re-feedback { flex: 1; min-width: 0; font-size: .88rem; font-weight: 600; color: #6b7280; }
    .re-feedback.ok { color: #16a34a; }
    .re-feedback.aviso { color: #f97316; }
    .re-feedback.mal { color: #ef4444; }

    .re-enviar {
      font-family: inherit;
      background: #0891b2;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .55rem 1.1rem;
      font-size: .88rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(8, 145, 178, .3);
      transition: background .15s ease, transform .15s ease;
    }
    .re-enviar:hover:not(:disabled) { background: #0e7490; }
    .re-enviar:active:not(:disabled) { transform: scale(.98); }
    .re-enviar:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
    }

    /* ── Modo FÓRMULA (esFormula: true → MathLive) ── */
    .re-formula-zona { margin: 0 0 .25rem; }
    .re-mathfield {
      display: block;
      width: 100%;
      box-sizing: border-box;
      min-height: 3.2rem;
      font-size: 1.15rem;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: .9rem;
      padding: .3rem .65rem;
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
      --caret-color: #0891b2;
      --caret-background-color: #0891b2;
    }
    .re-mathfield:focus-within {
      outline: none;
      border-color: #0891b2;
      box-shadow: 0 0 0 3px rgba(8, 145, 178, .15);
    }
    .re-mathfield.bien { border-color: #16a34a; background: rgba(22, 163, 52, .06); }
    .re-mathfield.mal {
      border-color: #ef4444;
      background: rgba(239, 68, 68, .05);
      animation: re-shake .3s ease;
    }
    .re-mathfield:disabled { background: #f9fafb; opacity: .85; }
    /* El menú ☰ de MathLive trae "pegar LaTeX": fuera (setOptions({menuItems})
       se ignora en 0.111.x, pero expone el part menu-toggle). El botón ▦ que
       abre el teclado virtual se queda. */
    .re-mathfield::part(menu-toggle) { display: none !important; }
    .re-formula-cargando {
      display: block;
      padding: .85rem;
      font-size: .85rem;
      color: #9ca3af;
    }
    .re-formula-aviso {
      margin: 0;
      padding: .7rem .85rem;
      background: rgba(249, 115, 22, .08);
      border: 1px dashed #f97316;
      border-radius: .9rem;
      color: #c2410c;
      font-size: .85rem;
      font-weight: 600;
    }
    .re-formula-pie {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: .35rem;
    }
    .re-formula-nota {
      margin: 0;
      font-size: .78rem;
      color: #6b7280;
      flex: 1;
      min-width: 0;
    }
    .re-btn-teclado {
      font-family: inherit;
      background: #ecfeff;
      color: #0e7490;
      border: 1px solid rgba(8, 145, 178, .35);
      border-radius: 999px;
      padding: .42rem .9rem;
      font-size: .82rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
    }
    .re-btn-teclado:hover:not(:disabled) {
      background: rgba(8, 145, 178, .12);
      box-shadow: 0 3px 10px rgba(8, 145, 178, .15);
    }
    .re-btn-teclado:disabled { opacity: .5; cursor: not-allowed; }
    .re-solucion .katex { font-size: 1em; }

    /* Caja roja cuando el contenido llamó a la utilidad con datos inválidos */
    .re-error-dev {
      border: 2px dashed #ef4444;
      border-left: 2px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      box-shadow: none;
    }

    @media (max-width: 767px) {
      .om-head-docente { top: 52px; padding: .4rem 1rem; }
      .re-caja { padding: 1rem; }
      .re-pie { flex-direction: column-reverse; align-items: stretch; }
      .re-enviar { justify-content: center; }
      .re-formula-pie { flex-direction: column-reverse; align-items: stretch; }
      .re-btn-teclado { justify-content: center; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Componente ---------------- */

/**
 * Inserta una pregunta de respuesta simple en el contenedor indicado.
 * Devuelve una Promise<number> con la nota ganada en ESTA pregunta
 * (puntaje completo / mitad con 1 decimal / 0; queda pendiente si el
 * estudiante nunca la termina). Con tipo "examen" la promesa trae
 * además .enviar() → Promise<{ puntos, maxPuntaje }> para el botón
 * final del examen. Esa nota NUNCA se muestra en pantalla: queda
 * oculta para la sumatoria final (la misma de opcionMultiple.js y
 * multipleOpcion.js).
 */
export function respuestaSimple(config = {}) {
  const {
    contenedor,
    perfil,
    clase,
    id,
    indicacion, pregunta,               // pregunta = alias (compatibilidad)
    respuestaCorrecta, respuesta,       // respuesta = alias (compatibilidad)
    respuestas: respuestasMulti,        // NUEVO v5: lista o número de campos
    etiquetas,                          // NUEVO v5: rótulos opcionales por campo
  } = config;

  // MODO FÓRMULA (v3): esFormula: true → la respuesta se arma SOLO con
  // el teclado virtual de fórmulas (sin campo de texto físico).
  const esFormula = !!config.esFormula;

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
    console.warn("[respuestaSimple] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
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
    // Aceptadas: UN string o una LISTA de strings (todos equivalentes).
    const soluciones = (Array.isArray(respuestaCorrecta ?? respuesta)
      ? (respuestaCorrecta ?? respuesta)
      : [(respuestaCorrecta ?? respuesta)])
      .map((s) => String(s ?? "").trim())
      .filter(Boolean);

    // ─── MULTI-CAMPO (v5): 'respuestas' define UN campo por respuesta ───
    //   · LISTA de N textos → N campos; el campo i valida respuestas[i]
    //     (cada elemento puede ser un texto o una lista de equivalentes).
    //   · NÚMERO N → N campos que validan TODOS contra 'respuestaCorrecta'.
    //   Sin 'respuestas' → 1 campo (flujo v4 intacto).
    let camposSol = null; // lista de listas: equivalentes válidos por campo
    let nCampos = 1;
    if (Array.isArray(respuestasMulti)) {
      camposSol = respuestasMulti.map((x) =>
        Array.isArray(x)
          ? x.map((s) => String(s ?? "").trim()).filter(Boolean)
          : [String(x ?? "").trim()].filter(Boolean) // "" suelto → campo sin solución
      );
      nCampos = camposSol.length;
    } else if (respuestasMulti != null && respuestasMulti !== "") {
      const n = Number(respuestasMulti);
      if (Number.isInteger(n) && n >= 1 && n <= 10) {
        nCampos = n;
        camposSol = Array.from({ length: n }, () => soluciones.slice());
      }
    }

    // v5.1 — CORRECCIÓN: con UN solo campo definido por 'respuestas'
    // (el formulario que genera el editor), sus equivalentes SON la
    // solución. Antes se validaba contra 'respuestaCorrecta' (que el
    // código generado no trae) y NINGUNA respuesta contaba como
    // correcta. 'respuestaCorrecta' sigue ganando si viene.
    if (camposSol && nCampos === 1 && !soluciones.length && camposSol[0].length) {
      soluciones.push(...camposSol[0]);
    }

    // Rótulos de cada campo (defecto: "Respuesta 1", "Respuesta 2"…)
    let rotulos = null;
    if (Array.isArray(etiquetas) && etiquetas.length === nCampos && nCampos > 0) {
      rotulos = etiquetas.map((e) => String(e ?? "").trim());
    } else if (etiquetas != null && etiquetas !== "") {
      console.warn(
        "[respuestaSimple] 'etiquetas' debe ser una lista con EXACTAMENTE",
        nCampos, "texto(s), uno por campo. Se ignora."
      );
    }
    const rotuloDe = (i) =>
      (rotulos && rotulos[i]) || `Respuesta ${i + 1}`;

    function errorDev(mensaje) {
      console.error("[respuestaSimple]", mensaje);
      const div = document.createElement("div");
      div.className = "re-caja re-error-dev";
      div.textContent = "[respuestaSimple] " + mensaje;
      contenedor.append(div);
    }

    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[respuestaSimple] Falta 'contenedor' (elemento del DOM donde insertar la pregunta).");
      resolve(0);
      return;
    }
    if (!TIPOS.includes(tipo)) {
      errorDev(`'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
      resolve(0);
      return;
    }
    if (!texto) { errorDev("Falta la indicación de la pregunta."); resolve(0); return; }
    if (!soluciones.length && !Array.isArray(respuestasMulti)) {
      errorDev(esFormula
        ? "Falta la 'respuestaCorrecta' (LaTeX esperado; también puede ser una lista de equivalentes)."
        : "Falta la 'respuestaCorrecta' (texto esperado; también puede ser una lista de equivalentes).");
      resolve(0);
      return;
    }
    if (respuestasMulti != null && respuestasMulti !== "" && !Array.isArray(respuestasMulti)) {
      const n = Number(respuestasMulti);
      if (!Number.isInteger(n) || n < 1 || n > 10) {
        errorDev(`'respuestas' como número debe ser un entero entre 1 y 10 (llegó: ${JSON.stringify(respuestasMulti)}).`);
        resolve(0);
        return;
      }
      if (!soluciones.length) {
        errorDev("'respuestas' como número necesita 'respuestaCorrecta' (los campos validan todos contra ella). Falta.");
        resolve(0);
        return;
      }
    }
    if (Array.isArray(respuestasMulti)) {
      if (!nCampos) {
        errorDev("'respuestas' está vacía: pasa al menos una respuesta (o usa 'respuestaCorrecta' para un solo campo).");
        resolve(0);
        return;
      }
      if (nCampos > 10) {
        errorDev(`'respuestas' admite entre 1 y 10 campos (llegaron ${nCampos}).`);
        resolve(0);
        return;
      }
      const vacio = camposSol.findIndex((lista) => !lista.length);
      if (vacio >= 0) {
        errorDev(`La respuesta ${vacio + 1} de 'respuestas' está vacía (cada campo necesita su texto esperado).`);
        resolve(0);
        return;
      }
      if (esFormula && nCampos > 1) {
        errorDev("Por ahora el modo fórmula (esFormula) admite UN solo campo: usa 'respuestas' solo en modo texto.");
        resolve(0);
        return;
      }
    }
    if (!perfil?.uid || !clase?.id) {
      errorDev("Faltan 'perfil' (con uid) o 'clase' (con id): la nota no se puede guardar.");
      resolve(0);
      return;
    }

    const esDoc = esDocente(perfil);
    const qid = id ? slug(String(id)) : `${slug(texto)}-${hash8(normalizar(texto))}`;

    let envios = 0;         // envíos ya usados (0 = el próximo es el primero)
    let bloqueada = false;  // pregunta terminada (resuelta, agotada o ya respondida)
    let resuelto = false;
    let yaEnviada = false;  // examen: guardado con la marca de enviado
    let ultimoResultado = null;

    const resolverUnaVez = (valor) => {
      if (!resuelto) { resuelto = true; resolve(valor); }
    };

    // --- Estructura (SIN ninguna mención al puntaje: queda oculto) ---
    const caja = document.createElement("section");
    caja.className = "re-caja";
    caja.setAttribute("aria-label", texto);
    const esMulti = nCampos > 1 && !esFormula; // multi-campo SOLO en texto
    caja.innerHTML = `
      <div class="re-cab">
        <span class="re-etiqueta">${esExamen ? "Examen" : esTarea ? "Tarea" : "Pregunta"}</span>
        <span class="re-chip"></span>
      </div>
      <p class="re-pregunta"></p>
      ${esMulti
        ? `<div class="re-campos">${camposSol
            .map(
              (_, i) =>
                '<div class="re-campo">' +
                `<span class="re-campo-etq"></span>` +
                '<input type="text" class="re-input" aria-label="Tu respuesta"' +
                ' placeholder="Escribe tu respuesta…" autocomplete="off"' +
                ' autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">' +
                "</div>"
            )
            .join("")}</div>`
        : esFormula
        ? '<div class="re-formula-zona"><span class="re-formula-cargando">Cargando el teclado de fórmulas…</span></div>' +
          '<div class="re-formula-pie">' +
          '<p class="re-formula-nota">Responde SOLO con el teclado virtual de MathLive: toca el campo (o el botón) para abrirlo. Aquí no funciona el teclado físico.</p>' +
          '<button type="button" class="re-btn-teclado" disabled>⌨ Teclado</button>' +
          '</div>'
        : '<input type="text" class="re-input" aria-label="Tu respuesta"' +
          ' placeholder="Escribe tu respuesta…" autocomplete="off"' +
          ' autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">'}
      <div class="re-pie">
        <span class="re-feedback" aria-live="polite"></span>
        <button type="button" class="re-enviar" disabled>Enviar respuesta</button>
      </div>`;
    caja.querySelector(".re-pregunta").innerHTML = textoConFormulas(texto);

    const chipEl = caja.querySelector(".re-chip");
    const feedbackEl = caja.querySelector(".re-feedback");
    // En modo fórmula NO hay input: la respuesta vive en el math-field
    // de MathLive. En modo texto, el input normal. En MULTI-CAMPO los
    // inputs viven en inputsMulti (el input único queda en null para no
    // cruzar flujos).
    const input = esMulti ? null : caja.querySelector(".re-input");  // null en fórmula y multi
    const zonaFormula = caja.querySelector(".re-formula-zona"); // null en modo texto
    const btnEnviar = caja.querySelector(".re-enviar"); // null en examen
    let mfFormula = null;      // <math-field> de MathLive (solo modo fórmula)
    let btnTeclado = caja.querySelector(".re-btn-teclado"); // null en modo texto
    let marcaPendiente = null; // por si se marca/bloquea antes de que cargue MathLive

    /* MULTI-CAMPO (v5): los N inputs, su rótulo, los campos ya
       ASEGURADOS (correctos fijados) y el valor exacto acumulado. */
    const inputsMulti = esMulti ? [...caja.querySelectorAll(".re-input")] : [];
    const asegurados = new Set(); // índices correctos fijados (multi)
    let exacto = 0;               // valor exacto acumulado (se redondea al guardar)

    // Botón Enviar consciente de los campos pendientes: en multi se
    // habilita solo cuando TODOS los campos no asegurados tienen texto
    // (los asegurados ya valieron y no cuentan).
    const refrescarEnviar = () => {
      if (!btnEnviar || bloqueada || !esMulti) return;
      btnEnviar.disabled = inputsMulti.some(
        (inp, i) => !asegurados.has(i) && inp.value.trim() === ""
      );
    };

    if (esMulti) {
      inputsMulti.forEach((inp, i) => {
        const etq = caja.querySelectorAll(".re-campo-etq")[i];
        if (etq) etq.textContent = rotuloDe(i);
        inp.setAttribute("aria-label", rotuloDe(i));
        inp.addEventListener("input", () => {
          if (bloqueada) return;
          inp.classList.remove("mal");
          refrescarEnviar();
          if (inp.value.trim() === "") feedback("", "");
        });
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && btnEnviar && !btnEnviar.disabled) btnEnviar.click();
        });
      });
      refrescarEnviar(); // estado inicial: todo vacío → deshabilitado
    }

    /* MathLive: campo + teclado virtual EXCLUSIVO. El teclado físico y
       el portapapeles se bloquean por CAPTURA en la zona (el evento
       muere antes de llegar al campo) y el teclado de MathLive trae
       TODOS los símbolos y letras. Si el CDN falla, la zona muestra un
       aviso claro: no hay campo alternativo a propósito. */
    if (esFormula) montarFormula();

    function montarFormula() {
      cargarMathLive()
        .then((ml) => {
          if (!ml || !ml.MathfieldElement) throw new Error("MathLive no disponible");
          if (!zonaFormula || !zonaFormula.isConnected) return; // ya desmontada
          const mf = new ml.MathfieldElement({
            virtualKeyboardMode: "manual", // el teclado lo abrimos NOSOTROS
            fontsDirectory: MATHLIVE_FONTS,
            soundsDirectory: null,
          });
          mf.className = "re-mathfield";
          if (marcaPendiente) mf.classList.add(marcaPendiente);
          mf.setAttribute("aria-label", "Tu respuesta en fórmula");
          try { mf.menuItems = []; } catch (e) { /* sin menú si la versión no lo permite */ }
          mfFormula = mf;
          zonaFormula.replaceChildren(mf);
          if (btnTeclado) btnTeclado.disabled = bloqueada;

          // ── SOLO teclado virtual: el teclado físico NUNCA llega ──
          const bloquearFisico = (e) => {
            if (e.target === mf || (e.target && mf.contains(e.target))) {
              e.preventDefault();
              e.stopPropagation();
            }
          };
          ["keydown", "paste", "drop", "contextmenu"].forEach((tipoEvento) => {
            zonaFormula.addEventListener(tipoEvento, bloquearFisico, true);
          });

          // Teclado virtual de MathLive. OJO: NUNCA acoplar show/hide a
          // focus/blur — al abrir el teclado MathLive hace blur y
          // re-foco del campo (gestión interna), y acoplarlo crea un
          // BUCLE show/hide que re-crea el teclado sin parar. Se abre con
          // POINTERDOWN en el campo (intención del usuario) o con el
          // botón, y se cierra con clic FUERA, con el botón, al enviar o
          // al bloquearse.
          const vk = () => window.mathVirtualKeyboard || null;
          const abrirTeclado = () => {
            const v = vk();
            if (v && !bloqueada && !v.visible) { try { mf.focus(); } catch (e) { /* noop */ } v.show(); }
          };
          const cerrarTeclado = () => { const v = vk(); if (v && v.hide) v.hide(); };
          const actualizarBtnTeclado = () => {
            const v = vk();
            if (btnTeclado) btnTeclado.textContent = v && v.visible ? "⌨ Ocultar teclado" : "⌨ Teclado";
          };
          mf.addEventListener("pointerdown", abrirTeclado);
          if (btnTeclado) {
            btnTeclado.addEventListener("click", () => {
              const v = vk();
              if (!v) return;
              if (v.visible) cerrarTeclado(); else { try { mf.focus(); } catch (e) { /* noop */ } v.show(); }
              actualizarBtnTeclado();
            });
          }
          // Clic FUERA (fuera del campo y del propio teclado) lo cierra,
          // como un teclado de celular. El botón Enviar queda fuera de la
          // zona → al enviar, el teclado se cierra solo.
          const cerrarSiFuera = (e) => {
            const v = vk();
            if (!v || !v.visible) return;
            const kb = document.querySelector(".ML__keyboard");
            const enTeclado = kb && e.target instanceof Node && kb.contains(e.target);
            const enCampo = e.target instanceof Node && zonaFormula.contains(e.target);
            if (!enTeclado && !enCampo) cerrarTeclado();
          };
          document.addEventListener("pointerdown", cerrarSiFuera, true);
          try {
            const v = vk();
            if (v && v.addEventListener) v.addEventListener("virtual-keyboard-toggle", actualizarBtnTeclado);
          } catch (e) { /* solo cosmético */ }

          // Estado en vivo: habilita Enviar y limpia el rojo al cambiar
          mf.addEventListener("input", () => {
            if (bloqueada) return;
            const vacio = valorActual().trim() === "";
            mf.classList.remove("mal");
            if (btnEnviar) btnEnviar.disabled = vacio;
            if (vacio) feedback("", "");
          });

          if (bloqueada) bloquearFormula();
        })
        .catch(() => {
          if (zonaFormula && zonaFormula.isConnected) {
            zonaFormula.innerHTML =
              '<p class="re-formula-aviso">No se pudo cargar el editor de fórmulas (MathLive). ' +
              "Revisa tu conexión a internet y vuelve a entrar a la clase.</p>";
          }
          if (btnTeclado) btnTeclado.style.display = "none";
        });
    }

    const feedback = (mensaje, tipoFeedback) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "re-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const chip = (mensaje, tipoChip) => {
      chipEl.textContent = mensaje;
      chipEl.className = "re-chip" + (tipoChip ? " " + tipoChip : "");
    };

    // Valor actual de la respuesta (texto escrito o LaTeX de MathLive).
    // Los \placeholder{} VACÍOS (huecos sin llenar del teclado) se quitan
    // para comparar limpio; si un hueco tiene contenido, MathLive lo
    // serializa con su contenido dentro. En MULTI-CAMPO, valorActual(i)
    // devuelve el texto del campo i.
    const valorActual = (i = -1) => {
      if (esMulti) return i >= 0 ? inputsMulti[i].value : "";
      if (!esFormula) return input.value;
      if (!mfFormula) return "";
      try {
        return String(mfFormula.value ?? "").split("\\placeholder{}").join("");
      } catch (e) {
        return "";
      }
    };
    const hayTexto = () =>
      esMulti
        ? inputsMulti.some((inp) => inp.value.trim() !== "")
        : valorActual().trim() !== "";
    // Marca visual verde/roja: input en texto, math-field en fórmula
    const campoMarca = () => (esFormula ? mfFormula : input);
    const marcar = (clase) => {
      marcaPendiente = clase;
      const campo = campoMarca();
      if (campo) campo.classList.add(clase);
    };
    const desmarcar = (...clases) => {
      const campo = campoMarca();
      if (campo) campo.classList.remove(...clases);
    };

    // Comparación: fórmula → tolerante vía normalizarFormula; texto →
    // minúsculas y sin espacios (conservando tildes y signos).
    const esCorrecto = (valor) =>
      esFormula
        ? respuestasEquivalentes(valor, soluciones)
        : soluciones.some((s) => comparable(valor) === comparable(s));

    // MULTI: el campo i valida contra SU lista de equivalentes (en orden)
    const esCorrectoCampo = (i, valor) =>
      (camposSol[i] || []).some((s) => comparable(valor) === comparable(s));

    // Feedback que revela la respuesta correcta (con fórmula renderizada)
    const decirSolucion = (prefijo, tipoFeedback) => {
      if (esFormula) {
        feedbackEl.innerHTML =
          escapeHtml(prefijo) +
          ' <span class="re-solucion">' +
          formatearFormula(soluciones[0]) +
          "</span>";
        feedbackEl.className = "re-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
      } else {
        feedback(prefijo + " La respuesta era: " + soluciones[0] + ".", tipoFeedback);
      }
    };

    // MULTI: revela TODAS las respuestas correctas EN SU ORDEN
    const decirSolucionesMulti = (prefijo, tipoFeedback) => {
      const lista = camposSol.map((s) => s[0]).join(" · ");
      feedback(prefijo + " Las respuestas eran: " + lista + ".", tipoFeedback);
    };

    const bloquearFormula = () => {
      if (mfFormula) { try { mfFormula.disabled = true; } catch (e) { /* noop */ } }
      const v = window.mathVirtualKeyboard;
      if (v && v.hide) { try { v.hide(); } catch (e) { /* noop */ } }
      if (btnTeclado) btnTeclado.disabled = true;
    };

    const bloquear = () => {
      bloqueada = true;
      if (btnEnviar) btnEnviar.disabled = true;
      if (input) input.disabled = true;
      inputsMulti.forEach((inp) => (inp.disabled = true)); // multi
      bloquearFormula();
    };

    if (input) {
      input.addEventListener("input", () => {
        if (bloqueada) return;
        input.classList.remove("mal");
        if (btnEnviar) btnEnviar.disabled = input.value.trim() === "";
        if (input.value.trim() === "") feedback("", "");
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && btnEnviar && !btnEnviar.disabled) btnEnviar.click();
      });
    }

    // Estado inicial por tipo y rol
    if (esDoc) {
      chip("Vista docente", "");
      feedback("Intentos libres, puntaje local arriba y nada se guarda.", "");
    } else if (esExamen) {
      chip("Sin enviar", "");
      feedback("Envíala cuando la termines: se fija y no se puede cambiar. Al final, el botón Enviar del examen cierra todo.", "");
    } else if (esTarea) {
      chip("Envío 1 de 2", "");
      feedback("Escribe tu respuesta y envíala. Tienes hasta dos envíos.", "");
    } else {
      chip("Intento 1 de 2", "");
    }

    if (esDoc) prepararDocente(perfil, clase); // restaura el head local si ya hay puntaje

    // --- Al montar (estudiante): ¿ya respondida o examen ya enviado? ---
    if (!esDoc) {
      obtenerNota(perfil, clase).then((nota) => {
        if (resuelto || bloqueada || envios > 0 || hayTexto()) return; // ya interactuó en esta sesión
        const guardado = nota.preguntas ? nota.preguntas[qid] : undefined;
        const hecha = guardado != null;

        if (esExamen && nota.enviado) {
          // v5.3 — examen YA CERRADO (envío real/timer/salida forzada):
          // todo aparece enviado con la nota final.
          yaEnviada = true;
          ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje, yaEnviado: true };
          bloquear();
          if (revelar) {
            if (esMulti) decirSolucionesMulti("Ya enviaste este examen.", "ok");
            else { marcar("bien"); decirSolucion("Ya enviaste este examen.", "ok"); }
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
            if (esMulti) decirSolucionesMulti(esExamen ? "Ya enviaste esta respuesta." : "Ya respondiste esta pregunta.", "ok");
            else { marcar("bien"); decirSolucion(esExamen ? "Ya enviaste esta respuesta." : "Ya respondiste esta pregunta.", "ok"); }
          } else {
            feedback(esExamen
              ? "Ya enviaste esta respuesta. El examen se cierra con el botón «Enviar examen»."
              : esTarea ? "Ya enviaste esta tarea." : "Ya respondiste esta pregunta.", "ok");
          }
          // v5.3 — en examen con la respuesta fijada PERO sin envío final,
          // el chip NO dice «Examen enviado»: el examen sigue abierto. Y
          // queda marcada como ya enviada AQUÍ: el recorrido del envío
          // final NO re-califica el campo (vacío) ni pisa el valor guardado.
          if (esExamen) {
            yaEnviada = true;
            ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje };
          }
          chip(esExamen ? "Enviada" : "Respondida", "bien");
          if (btnEnviar && !esExamen) btnEnviar.textContent = "Respondida";
          resolverUnaVez(0); // no vuelve a sumar
        }
      });
    }

    // --- Guardado del examen (estudiante): valor + marca de enviado ---
    // (la lógica vive en guardarPreguntaExamen(), compartida con
    // opcionMultiple.js y multipleOpcion.js)
    async function guardarExamen(ganado) {
      await guardarPreguntaExamen(perfil, clase, qid, ganado);
      yaEnviada = true;
      ultimoResultado = { puntos: ganado, maxPuntaje: puntaje };
    }

    // --- Envío de clase, tarea y EXAMEN (botón) ---
    async function procesarEnvio() {
      if (bloqueada || !hayTexto()) return null;
      // v5.2 — examen: el botón califica ESTA respuesta (una sola
      // oportunidad) con el MISMO flujo de enviar(): guardar + fijar.
      if (esExamen) {
        const r = await enviarExamen();
        return r && typeof r.puntos === "number" ? r.puntos : null;
      }

      /* ─── MULTI-CAMPO (v5): N campos, validación EN ESE ORDEN ───
         Puntaje repartido: cada campo vale puntaje ÷ N. Los correctos
         al 1.er envío valen COMPLETO y quedan fijos (verde); los
         corregidos al 2.º envío valen LA MITAD de su parte. Lo
         asegurado se guarda aunque el bloque termine agotado. */
      if (esMulti) {
        const parte = puntaje / nCampos; // valor de UN campo
        const pendientes = () =>
          inputsMulti.map((_, i) => i).filter((i) => !asegurados.has(i));

        /* DOCENTE: intentos libres, proporción local, nada se guarda */
        if (esDoc) {
          const correctos = pendientes().filter((i) =>
            esCorrectoCampo(i, inputsMulti[i].value)
          ).length;
          const ganado = redondear1(correctos * parte * (envios === 0 ? 1 : 1 / 2));
          envios++;
          if (revelar) {
            inputsMulti.forEach((inp, i) => {
              if (asegurados.has(i)) return;
              const ok = esCorrectoCampo(i, inp.value);
              inp.classList.remove("mal");
              inp.classList.add(ok ? "bien" : "mal");
              if (!ok) {
                const el = inp;
                setTimeout(() => {
                  if (!el.classList.contains("bien")) el.classList.remove("mal");
                }, 700);
              }
            });
          }
          if (correctos === nCampos) {
            registrarPuntoDocente(perfil, clase, qid, ganado);
            chip(envios === 1 ? "Resuelta" : "Resuelta (intento " + envios + ")", "bien");
            feedback("¡Correcta! Vista docente: el puntaje está arriba y nada se guarda.", "ok");
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
              ? `Acertaste ${correctos} de ${nCampos} campos. Vista docente: el puntaje está arriba y nada se guarda.`
              : "Ningún campo correcto. Puedes seguir intentando: nada se guarda.",
            correctos > 0 ? "ok" : "aviso"
          );
          return null;
        }

        /* ESTUDIANTE · CLASE: los correctos al 1.er envío quedan fijos */
        if (esTipoClase) {
          const primero = envios === 0;
          pendientes().forEach((i) => {
            const inp = inputsMulti[i];
            if (esCorrectoCampo(i, inp.value)) {
              asegurados.add(i);
              inp.classList.remove("mal");
              inp.classList.add("bien");
              inp.disabled = true;
              exacto += parte * (primero ? 1 : 1 / 2);
            } else {
              inp.classList.add("mal");
              inp.value = ""; // limpiar para el reintento
            }
          });
          envios++;
          const faltan = nCampos - asegurados.size;

          if (faltan === 0) {
            const total = redondear1(exacto);
            bloquear();
            btnEnviar.textContent = "Respondida";
            chip(primero ? "Resuelta" : "Resuelta (2.º intento)", "bien");
            feedback(primero ? "¡Correcta! Muy bien." : "¡Correcta en tu segundo intento! Muy bien.", "ok");
            if (total > 0) sumarPuntos(perfil, clase, qid, total, { tipo }).catch(() => {});
            resolverUnaVez(total);
            return total;
          }

          if (primero) {
            chip("Intento 2 de 2", "aviso");
            btnEnviar.textContent = "Intentar de nuevo";
            feedback(
              `Acertaste ${asegurados.size} de ${nCampos}. Tienes una segunda oportunidad: los campos corregidos valen la mitad.`,
              "aviso"
            );
            btnEnviar.disabled = true; // hasta rellenar los que faltan
            const primeroVacio = inputsMulti.find((inp) => !inp.disabled);
            if (primeroVacio) primeroVacio.focus();
            return null;
          }

          // Fin del 2.º envío sin completar → agotado (lo asegurado cuenta)
          const total = redondear1(exacto);
          bloquear();
          btnEnviar.textContent = "Sin más intentos";
          chip("Intentos agotados", "mal");
          decirSolucionesMulti("Incorrecta otra vez. Se agotaron tus intentos: podrás volver a intentarlo en otra sesión.", "mal");
          if (total > 0) sumarPuntos(perfil, clase, qid, total, { tipo }).catch(() => {});
          resolverUnaVez(total);
          return total;
        }

        /* ESTUDIANTE · TAREA: 2 envíos neutros; el 2.º es el que cuenta */
        if (esTarea) {
          if (envios === 0) {
            envios++;
            chip("Envío 2 de 2", "aviso");
            btnEnviar.textContent = "Enviar de nuevo";
            feedback("Respuesta enviada. Puedes modificarla y enviar una segunda vez.", "");
            return null; // la respuesta final (2.º envío) decide el puntaje
          }
          const correctos = pendientes().filter((i) =>
            esCorrectoCampo(i, inputsMulti[i].value)
          ).length;
          const ganado = redondear1(correctos * parte * (1 / 2));
          bloquear();
          chip("Enviada", "");
          feedback("Respuesta enviada. No hay más envíos.", "");
          // v5.3 — el 2.º envío es EL que cuenta: se guarda SIEMPRE (0
          // incluido) para que Firebase registre la tarea respondida.
          sumarPuntos(perfil, clase, qid, ganado, { tipo }).catch(() => {});
          resolverUnaVez(ganado);
          return ganado;
        }

        return null;
      }

      const acierto = esCorrecto(valorActual());

      /* DOCENTE · clase y tarea: intentos libres, puntaje local, nada se guarda */
      if (esDoc) {
        const ganado = acierto ? (envios === 0 ? puntaje : redondear1(puntaje / 2)) : 0;
        envios++;
        if (acierto) {
          if (revelar) {
            desmarcar("mal");
            marcar("bien");
          }
          registrarPuntoDocente(perfil, clase, qid, ganado);
          if (revelar) {
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
          marcar("mal");
          const elCampo = campoMarca();
          setTimeout(() => {
            if (elCampo && !elCampo.classList.contains("bien")) elCampo.classList.remove("mal");
          }, 700);
          chip("Vista docente · intento " + (envios + 1), "");
          feedback("No es correcta. Puedes seguir intentando: nada se guarda.", "aviso");
        } else {
          chip("Vista docente · envío " + (envios + 1), "");
          feedback("Respuesta enviada. Puedes enviar otra vez: nada se guarda.", "");
        }
        return null;
      }

      /* ESTUDIANTE · CLASE: 2 intentos, revela la corrección */
      if (esTipoClase) {
        if (acierto) {
          const ganado = envios === 0 ? puntaje : redondear1(puntaje / 2);
          bloquear();
          marcar("bien");
          btnEnviar.textContent = "Respondida";
          chip(envios === 0 ? "Resuelta" : "Resuelta (2.º intento)", "bien");
          feedback(envios === 0 ? "¡Correcta! Muy bien." : "¡Correcta en tu segundo intento! Muy bien.", "ok");
          if (ganado > 0) sumarPuntos(perfil, clase, qid, ganado, { tipo }).catch(() => {});
          resolverUnaVez(ganado);
          return ganado;
        }
        envios++;
        marcar("mal");
        if (envios === 1) {
          chip("Intento 2 de 2", "aviso");
          btnEnviar.textContent = "Intentar de nuevo";
          // Vaciar ANTES del feedback: si MathLive dispara input al vaciar,
          // su listener limpia el mensaje y el aviso sobrevive al final
          if (input) input.value = "";
          if (mfFormula) { try { mfFormula.value = ""; } catch (e) { /* noop */ } }
          feedback("No es correcta. Tienes una segunda oportunidad.", "aviso");
          btnEnviar.disabled = true;
          if (input) input.focus();
        } else {
          bloquear();
          btnEnviar.textContent = "Sin más intentos";
          chip("Intentos agotados", "mal");
          decirSolucion("Incorrecta otra vez. Se agotaron tus intentos: podrás volver a intentarlo en otra sesión.", "mal");
          resolverUnaVez(0);
        }
        return null;
      }

      /* ESTUDIANTE · TAREA: 2 envíos neutros; el 2.º es el que cuenta */
      if (esTarea) {
        if (envios === 0) {
          envios++;
          desmarcar("mal");
          chip("Envío 2 de 2", "aviso");
          btnEnviar.textContent = "Enviar de nuevo";
          feedback("Respuesta enviada. Puedes modificarla y enviar una segunda vez.", "");
          return null; // la respuesta final (2.º envío) decide el puntaje
        }
        const ganado = acierto ? redondear1(puntaje / 2) : 0;
        bloquear();
        chip("Enviada", "");
        feedback("Respuesta enviada. No hay más envíos.", "");
        // v5.3 — el 2.º envío es EL que cuenta: se guarda SIEMPRE (0
        // incluido) para que Firebase registre la tarea respondida.
        sumarPuntos(perfil, clase, qid, ganado, { tipo }).catch(() => {});
        resolverUnaVez(ganado);
        return ganado;
      }

      return null;
    }

    if (btnEnviar) {
      btnEnviar.addEventListener("click", () => {
        procesarEnvio().catch((e) => console.error("[respuestaSimple]", e));
      });
    }

    // --- EXAMEN: el botón lo pone el archivo del examen ---
    enviarExamen = async function () {
      if (esDoc) {
        if (esMulti) {
          const correctos = inputsMulti.filter((inp, i) =>
            esCorrectoCampo(i, inp.value)
          ).length;
          const ganado = redondear1(correctos * (puntaje / nCampos));
          if (revelar) {
            inputsMulti.forEach((inp, i) => {
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
        const acierto = esCorrecto(valorActual());
        const ganado = acierto ? puntaje : 0;
        registrarPuntoDocente(perfil, clase, qid, ganado);
        if (revelar) {
          desmarcar("mal");
          marcar(acierto ? "bien" : "mal");
        }
        chip("Vista docente", "");
        feedback("Enviado. El puntaje está en el head de arriba; nada se guarda.", "");
        resolverUnaVez(ganado);
        return { puntos: ganado, maxPuntaje: puntaje, docente: true };
      }

      if (yaEnviada) {
        return ultimoResultado || { puntos: 0, maxPuntaje: puntaje, yaEnviado: true };
      }

      if (esMulti) {
        const correctos = inputsMulti.filter((inp, i) =>
          esCorrectoCampo(i, inp.value)
        ).length;
        const ganado = redondear1(correctos * (puntaje / nCampos));
        if (revelar) {
          inputsMulti.forEach((inp, i) => {
            inp.classList.remove("mal");
            inp.classList.add(esCorrectoCampo(i, inp.value) ? "bien" : "mal");
          });
          if (correctos === nCampos) feedback("Respuesta correcta.", "ok");
          else if (correctos > 0) feedback(`Respuesta enviada. Acertaste ${correctos} de ${nCampos} campos.`, "");
          else decirSolucionesMulti("Respuesta incorrecta.", "mal");
        } else {
          feedback("Respuesta enviada.", "");
        }
        bloquear();
        chip("Enviada", "");
        if (btnEnviar) btnEnviar.textContent = "Respondida";
        await guardarExamen(ganado);
        resolverUnaVez(ganado);
        return { puntos: ganado, maxPuntaje: puntaje };
      }

      const acierto = esCorrecto(valorActual());
      const ganado = acierto ? puntaje : 0;
      if (revelar) {
        marcar(acierto ? "bien" : "mal");
        if (acierto) feedback("Respuesta correcta.", "ok");
        else decirSolucion("Respuesta incorrecta.", "mal");
      } else {
        feedback("Respuesta enviada.", "");
      }
      bloquear();
      chip("Enviada", "");
      if (btnEnviar) btnEnviar.textContent = "Respondida";
      await guardarExamen(ganado);
      resolverUnaVez(ganado);
      return { puntos: ganado, maxPuntaje: puntaje };
    };

    // v5.2 — REGISTRO GLOBAL DE ENVÍO: el botón final del examen
    // (botonEnviar.js) o el «Enviar examen» de siempre leen esta
    // lista para calificar las respuestas que el estudiante NO envió
    // una a una. Clave = qid: si el bloque se remonta, la última
    // instancia reemplaza a la vieja (nunca se califica dos veces).
    // Docente: registrar es inofensivo (enviarExamen no guarda nada).
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