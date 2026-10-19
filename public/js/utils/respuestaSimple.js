// ============================================================
// respuestaSimple.js — Pregunta de respuesta simple (texto escrito)
// (js/utils/respuestaSimple.js) · v1: DOS intentos (mitad al 2.º), nota OCULTA
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: inserta una
// pregunta con un campo de texto libre y valida lo que escriba el estudiante.
//
// USO (desde el archivo de contenido de una clase, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { respuestaSimple } from "../../../js/utils/respuestaSimple.js";
//
//   respuestaSimple({
//     contenedor,           // elemento del DOM donde insertar la pregunta
//     perfil,               // perfil del usuario (users/{uid}, trae uid)
//     clase,                // objeto de la clase { id, grado, materiaId, ... }
//     indicacion: "¿Quién escribió El Quijote?",
//     respuestaCorrecta: "Miguel de Cervantes", // texto esperado
//     puntaje: 2,           // valor de esta pregunta para la clase (0 a 10)
//     // id: "p7",          // (opcional) identificador único y estable
//   }).then((ganado) => { /* nota obtenida en ESTA pregunta (oculta) */ });
//
//   // o dentro de una función async:
//   // const ganado = await respuestaSimple({ ... });
//
// COMPARACIÓN AL VALIDAR (para que no importe cómo la escriba):
//   · Se convierte TODO a MINÚSCULAS (no importa mayúsculas/minúsculas).
//   · Se quitan TODOS los espacios en blanco (antes, dentro y después).
//   · SÍ se respetan las TILDES y los signos: "Árbol" ≠ "arbol", "1.5" ≠ "15".
//     Ej.: "  MIGUEL   de cervantes " = "Miguel de Cervantes" ✓
//
// QUÉ DEVUELVE — Promise<number> con lo ganado en ESTA pregunta.
//   LA NOTA ES INVISIBLE: el recuadro NO muestra puntos ni los menciona.
//   · SIEMPRE hay DOS intentos:
//     - Correcta al 1er intento → el puntaje COMPLETO (ej. 2).
//     - Correcta al 2do intento → la MITAD con un decimal (ej. 1).
//     - Mala en los dos         → 0 (podrá reintentar en otra sesión).
//   · Si ya estaba respondida → 0 (no vuelve a sumar).
//   · Al agotar los intentos se revela la respuesta correcta.
//   El estudiante solo ve si acertó, en qué intento va y si puede reintentar.
//
// SUMATORIA FINAL DE LA CLASE (compartida con opcionMultiple.js y
// multipleOpcion.js — usan las MISMAS obtenerNota() y sumarPuntos()):
//     const nota = await obtenerNota(perfil, clase);
//     nota.puntos  // ← suma de TODO lo respondido (esta sesión y anteriores).
//                  //   NO le sumes el valor devuelto por respuestaSimple():
//                  //   sería duplicado.
//
// Persistencia: localStorage "mco_nota_{uid}_{claseId}" (instantáneo)
//   + notas/{uid}/clases/{claseId} en Firestore (mejor esfuerzo).
//   Cada pregunta guarda su valor UNA sola vez (clave: id, o slug del
//   texto + hash). Lo no sumado no se guarda → las preguntas falladas
//   2 veces reaparecen frescas en otra sesión.
//   OJO: si el MISMO texto de pregunta se usa en dos utilidades distintas
//   de la misma clase, dales 'id' diferentes para que no colisionen.
//
// Convención: CSS implícito · 100% responsivo · fondo blanco · paleta del proyecto.
// ============================================================

import { obtenerNota, sumarPuntos } from "./opcionMultiple.js";

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
      .re-caja { padding: 1rem; }
      .re-pie { flex-direction: column-reverse; align-items: stretch; }
      .re-enviar { justify-content: center; }
    }
  `;
  document.head.append(estilo);
}

let estilosListos = false;

/* ---------------- Componente ---------------- */

/**
 * Inserta una pregunta de respuesta simple en el contenedor indicado.
 * Devuelve una Promise<number> con la nota ganada en ESTA pregunta
 * (puntaje completo al 1er intento / mitad con un decimal al 2.º / 0).
 * Esa nota NUNCA se muestra en pantalla: queda oculta para la sumatoria
 * final de la clase (la misma de opcionMultiple.js y multipleOpcion.js).
 */
export function respuestaSimple(config = {}) {
  const {
    contenedor,
    perfil,
    clase,
    id,
    indicacion, pregunta,               // pregunta = alias (compatibilidad)
    respuestaCorrecta, respuesta,       // respuesta = alias (compatibilidad)
  } = config;

  // PUNTAJE OCULTO de esta pregunta (0 a 10). Defecto: 1.
  let puntaje = Number(config.puntaje ?? 1);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 10) {
    console.warn("[respuestaSimple] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
    puntaje = 1;
  }
  puntaje = redondear1(puntaje);

  return new Promise((resolve) => {
    inyectarEstilos();

    // --- Validaciones (avisos claros para quien escribe el contenido) ---
    const texto = String(indicacion ?? pregunta ?? "").trim();
    const solucion = String(respuestaCorrecta ?? respuesta ?? "").trim();

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
    if (!texto) { errorDev("Falta la indicación de la pregunta."); resolve(0); return; }
    if (!solucion) { errorDev("Falta la 'respuestaCorrecta' (texto esperado)."); resolve(0); return; }
    if (!perfil?.uid || !clase?.id) {
      errorDev("Faltan 'perfil' (con uid) o 'clase' (con id): la nota no se puede guardar.");
      resolve(0);
      return;
    }

    const qid = id ? slug(String(id)) : `${slug(texto)}-${hash8(normalizar(texto))}`;

    let intento = 0;        // fallos acumulados (0 = primer intento, 1 = segunda oportunidad)
    let bloqueada = false;  // pregunta terminada (resuelta, agotada o ya respondida)

    // --- Estructura (SIN ninguna mención al puntaje: queda oculto) ---
    const caja = document.createElement("section");
    caja.className = "re-caja";
    caja.setAttribute("aria-label", texto);
    caja.innerHTML = `
      <div class="re-cab">
        <span class="re-etiqueta">Pregunta</span>
        <span class="re-chip">Intento 1 de 2</span>
      </div>
      <p class="re-pregunta"></p>
      <input type="text" class="re-input" aria-label="Tu respuesta"
             placeholder="Escribe tu respuesta…" autocomplete="off"
             autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
      <div class="re-pie">
        <span class="re-feedback" aria-live="polite"></span>
        <button type="button" class="re-enviar" disabled>Enviar respuesta</button>
      </div>`;
    caja.querySelector(".re-pregunta").textContent = texto;

    const chipEl = caja.querySelector(".re-chip");
    const feedbackEl = caja.querySelector(".re-feedback");
    const input = caja.querySelector(".re-input");
    const btnEnviar = caja.querySelector(".re-enviar");

    const feedback = (mensaje, tipo) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "re-feedback" + (tipo ? " " + tipo : "");
    };
    const chip = (mensaje, tipo) => {
      chipEl.textContent = mensaje;
      chipEl.className = "re-chip" + (tipo ? " " + tipo : "");
    };

    const bloquear = () => {
      bloqueada = true;
      btnEnviar.disabled = true;
      input.disabled = true;
    };

    input.addEventListener("input", () => {
      if (bloqueada) return;
      input.classList.remove("mal");
      btnEnviar.disabled = input.value.trim() === "";
      if (input.value.trim() === "") feedback("", "");
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !btnEnviar.disabled) btnEnviar.click();
    });

    // --- ¿Ya respondida antes? (el valor guardado NO se muestra: solo se bloquea) ---
    obtenerNota(perfil, clase).then((nota) => {
      if (bloqueada || input.value.trim() !== "") return; // ya interactuó en esta sesión
      if (nota.preguntas[qid] != null) {
        bloquear();
        input.classList.add("bien");
        btnEnviar.textContent = "Respondida";
        chip("Respondida", "bien");
        feedback(`Ya respondiste esta pregunta. La respuesta era: ${solucion}.`, "ok");
        resolve(0); // no vuelve a sumar
      }
    });

    // --- Enviar respuesta (SIEMPRE dos intentos: completo / mitad / 0) ---
    btnEnviar.addEventListener("click", () => {
      if (bloqueada || input.value.trim() === "") return;

      if (comparable(input.value) === comparable(solucion)) {
        const primero = intento === 0;
        // Nota OCULTA: completa al 1.er intento, mitad con 1 decimal al 2.º.
        const ganado = primero ? redondear1(puntaje) : redondear1(puntaje / 2);
        bloquear();
        input.classList.add("bien");
        btnEnviar.textContent = "Respondida";
        chip(primero ? "Resuelta" : "Resuelta (2.º intento)", "bien");
        feedback(primero ? "¡Correcta! Muy bien." : "¡Correcta en tu segundo intento! Muy bien.", "ok");
        resolve(ganado); // ← la nota solo la recibe el archivo de la clase
        sumarPuntos(perfil, clase, qid, ganado).catch(() => {});
        return;
      }

      // Respuesta incorrecta
      intento++;
      input.classList.add("mal");

      if (intento === 1) {
        chip("Intento 2 de 2", "aviso");
        btnEnviar.textContent = "Intentar de nuevo";
        feedback("No es correcta. Tienes una segunda oportunidad.", "aviso");
        input.value = "";
        btnEnviar.disabled = true;
        input.focus();
      } else {
        bloquear();
        btnEnviar.textContent = "Sin más intentos";
        chip("Intentos agotados", "mal");
        feedback(
          `Incorrecta otra vez. Se agotaron tus intentos: podrás volver a intentarlo en otra sesión. La respuesta era: ${solucion}.`,
          "mal"
        );
        resolve(0);
      }
    });

    contenedor.append(caja);
  });
}