// ============================================================
// multipleOpcion.js — Bloque de selección múltiple (1 o MÁS correctas)
// (js/utils/multipleOpcion.js) · v2: reparto igualitario + DOS intentos, OCULTO
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: inserta un
// bloque en el que el estudiante marca VARIAS opciones y las comprueba.
//
// USO (desde el archivo de contenido de una clase, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { multipleOpcion } from "../../../js/utils/multipleOpcion.js";
//
//   multipleOpcion({
//     contenedor,           // elemento del DOM donde insertar el bloque
//     perfil,               // perfil del usuario (users/{uid}, trae uid)
//     clase,                // objeto de la clase { id, grado, materiaId, ... }
//     indicacion: "Marca todos los números racionales.",
//     opciones: ["√2", "0.75", "π", "1/2", "√3", "5"], // ENTRE 4 Y 10 textos
//     correctas: [2, 4, 6], // NÚMEROS de las opciones correctas (1 = primera),
//                           // 1 o más, sin repetir
//     puntaje: 1,           // valor TOTAL del bloque para la clase (0 a 10)
//     // id: "p4",          // (opcional) identificador único y estable
//     // penalizarErroneas: true, // (opcional, defecto true) las marcas
//     //                          // equivocadas restan su valor; en false,
//     //                          // solo cuentan las correctas encontradas.
//   }).then((ganado) => { /* puntaje obtenido en ESTE bloque (oculto) */ });
//
//   // o dentro de una función async:
//   // const ganado = await multipleOpcion({ ... });
//
// PUNTAJE REPARTIDO EN PARTES IGUALES (regla del docente):
//   · Cada opción correcta vale  puntaje ÷ número de correctas
//     (ej.: puntaje 1 y 4 correctas → cada una vale 0.25).
//   · Cada intento se calcula con las marcas hechas: cada correcta marcada
//     suma su valor y, con penalizarErroneas (defecto), cada marca equivocada
//     RESTA su valor, sin bajar de 0 (así marcar TODAS las opciones no da
//     el puntaje completo). Ej.: 3 buenas de 4 → 0.75 · 3 buenas + 1 mala → 0.5.
//   · Se redondea a 2 decimales.
//
// DOS INTENTOS (la misma regla de opcionMultiple.js y respuestaSimple.js):
//   · 1.er intento que SUMA algo → se guarda ese valor completo (puede ser
//     parcial: 3 buenas de 4 → 0.75) y el bloque queda respondido.
//   · 1.er intento que NO suma nada (0) → segunda oportunidad: al comprobar
//     de nuevo, lo que gane entonces vale LA MITAD (perfecto al 2.º → mitad).
//   · Sin valor en los DOS intentos → 0 (bloqueada esa sesión, reaparece
//     fresca en otra); al final se revelan las correctas.
//
// QUÉ DEVUELVE — Promise<number> con lo ganado en ESTE bloque.
//   LA NOTA ES INVISIBLE: el recuadro NO muestra puntos ni los menciona.
//   · Si ya estaba respondida → 0 (no vuelve a sumar).
//   El estudiante solo ve si acertó, cuántas correctas encontró y si tiene
//   segunda oportunidad (sin puntos).
//
// SUMATORIA FINAL DE LA CLASE (compartida con opcionMultiple.js):
//   Usa las MISMAS obtenerNota() y sumarPuntos() de js/utils/opcionMultiple.js,
//   así que preguntas y bloques alimentan la MISMA nota de la clase:
//     const nota = await obtenerNota(perfil, clase);
//     nota.puntos  // ← suma de TODO lo respondido (esta sesión y anteriores).
//                  //   NO le sumes el valor devuelto por multipleOpcion():
//                  //   sería duplicado.
//
// Persistencia: localStorage "mco_nota_{uid}_{claseId}" (instantáneo)
//   + notas/{uid}/clases/{claseId} en Firestore (mejor esfuerzo).
//   Cada bloque guarda su valor UNA sola vez (clave: id, o slug del
//   texto + hash). Lo no sumado no se guarda → los bloques sin acierto
//   reaparecen frescos en otra sesión.
//
// Convención: CSS implícito · 100% responsivo · fondo blanco · paleta del proyecto.
// ============================================================

import { obtenerNota, sumarPuntos } from "./opcionMultiple.js";

/* ---------------- Constantes ---------------- */

const LETRAS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

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
 * Devuelve una Promise<number> con lo ganado en ESTE bloque (el valor de
 * cada correcta marcada, con resta por equivocadas si penalizarErroneas).
 * Esa nota NUNCA se muestra en pantalla: queda oculta para la sumatoria
 * final de la clase (la misma de opcionMultiple.js).
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

  // PUNTAJE OCULTO total del bloque (0 a 10). Defecto: 1.
  let puntaje = Number(config.puntaje ?? 1);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 10) {
    console.warn("[multipleOpcion] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
    puntaje = 1;
  }
  puntaje = redondear2(puntaje);

  return new Promise((resolve) => {
    inyectarEstilos();

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

    const setCorrectas = new Set(nums.map((n) => n - 1)); // índices 0-based
    const numCorrectas = setCorrectas.size;
    const qid = id ? slug(String(id)) : `${slug(texto)}-${hash8(normalizar(texto))}`;

    let bloqueada = false;
    let intento = 0;        // ceros acumulados (0 = primer intento, 1 = segunda oportunidad)
    const marcadas = new Set(); // índices 0-based marcados por el estudiante

    // --- Estructura (SIN ninguna mención al puntaje: queda oculto) ---
    const caja = document.createElement("section");
    caja.className = "mo-caja";
    caja.setAttribute("aria-label", texto);
    caja.innerHTML = `
      <div class="mo-cab">
        <span class="mo-etiqueta">Pregunta</span>
        <span class="mo-chip">0 marcadas</span>
      </div>
      <p class="mo-pregunta"></p>
      <p class="mo-ayuda"></p>
      <div class="mo-opciones"></div>
      <div class="mo-pie">
        <span class="mo-feedback" aria-live="polite"></span>
        <button type="button" class="mo-enviar" disabled>Comprobar</button>
      </div>`;
    caja.querySelector(".mo-pregunta").textContent = texto;
    caja.querySelector(".mo-ayuda").textContent =
      numCorrectas > 1
        ? "Puede haber más de una correcta: marca todas las que creas y comprueba."
        : "Marca la opción que creas correcta y comprueba.";

    const chipEl = caja.querySelector(".mo-chip");
    const feedbackEl = caja.querySelector(".mo-feedback");
    const btnEnviar = caja.querySelector(".mo-enviar");

    const feedback = (mensaje, tipo) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "mo-feedback" + (tipo ? " " + tipo : "");
    };
    const chip = (mensaje, tipo) => {
      chipEl.textContent = mensaje;
      chipEl.className = "mo-chip" + (tipo ? " " + tipo : "");
    };
    const refrescarChip = () => {
      chip(`${marcadas.size} marcada${marcadas.size === 1 ? "" : "s"}`, "");
    };

    const bloquear = () => {
      bloqueada = true;
      btnEnviar.disabled = true;
      botones.forEach((b) => (b.disabled = true));
    };

    const botones = lista.map((textoOpcion, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mo-opcion";
      b.setAttribute("aria-pressed", "false");

      const letra = document.createElement("span");
      letra.className = "mo-letra";
      letra.textContent = LETRAS[i];

      const t = document.createElement("span");
      t.className = "mo-texto";
      t.textContent = textoOpcion;

      b.append(letra, t);
      b.addEventListener("click", () => {
        if (bloqueada) return;
        const puesta = !marcadas.has(i);
        if (puesta) marcadas.add(i);
        else marcadas.delete(i);
        b.classList.toggle("seleccionada", puesta);
        b.setAttribute("aria-pressed", String(puesta));
        btnEnviar.disabled = marcadas.size === 0;
        if (marcadas.size === 0) feedback("", "");
        refrescarChip();
      });
      return b;
    });
    caja.querySelector(".mo-opciones").append(...botones);

    // --- ¿Ya respondida antes? (el valor guardado NO se muestra: solo se bloquea) ---
    obtenerNota(perfil, clase).then((nota) => {
      if (bloqueada || marcadas.size > 0) return; // ya interactuó en esta sesión
      if (nota.preguntas[qid] != null) {
        bloquear();
        botones.forEach((b, i) => {
          if (setCorrectas.has(i)) b.classList.add("correcta");
        });
        btnEnviar.textContent = "Respondida";
        chip("Respondida", "bien");
        feedback("Ya respondiste este bloque.", "ok");
        resolve(0); // no vuelve a sumar
      }
    });

    // --- Comprobar (2 intentos: el 1.º que suma se guarda completo;
    //     si no suma nada hay 2.ª oportunidad y lo ganado vale la mitad) ---
    btnEnviar.addEventListener("click", () => {
      if (bloqueada || marcadas.size === 0) return;

      let aciertos = 0;
      let errores = 0;
      marcadas.forEach((i) => (setCorrectas.has(i) ? aciertos++ : errores++));
      const neto = penalizar ? Math.max(0, aciertos - errores) : aciertos;
      const ganado = redondear2((neto / numCorrectas) * puntaje);
      const perfecto = aciertos === numCorrectas && errores === 0;
      const primero = intento === 0;

      if (ganado > 0) {
        // Suma algo → se guarda (completo al 1.er intento, MITAD al 2.º).
        const premio = primero ? ganado : redondear2(ganado / 2);
        bloquear();
        botones.forEach((b, i) => {
          if (setCorrectas.has(i)) b.classList.add("correcta");   // revela TODAS las correctas
          else if (marcadas.has(i)) b.classList.add("erronea");   // marcas equivocadas en rojo
          b.classList.remove("seleccionada");
          b.setAttribute("aria-pressed", "false");
        });
        if (perfecto) {
          btnEnviar.textContent = "Respondida";
          chip(primero ? "Resuelta" : "Resuelta (2.º intento)", "bien");
          feedback(
            primero
              ? "¡Excelente! Marcaste todas las correctas."
              : "¡Excelente en tu segundo intento! Marcaste todas las correctas.",
            "ok"
          );
        } else {
          btnEnviar.textContent = "Respondida";
          chip(primero ? "Respondida" : "Respondida (2.º intento)", "aviso");
          feedback(
            errores > 0
              ? `Encontraste ${aciertos} de ${numCorrectas} correctas, pero también marcaste ${errores} incorrecta${errores === 1 ? "" : "s"}.`
              : `Encontraste ${aciertos} de ${numCorrectas} correctas.`,
            "aviso"
          );
        }
        resolve(premio); // ← la nota solo la recibe el archivo de la clase
        sumarPuntos(perfil, clase, qid, premio).catch(() => {});
        return;
      }

      // Sin valor esta vez (ganado 0)
      if (primero) {
        // 1.er intento sin valor → segunda oportunidad (lo que gane vale la mitad).
        // NO se revelan las correctas todavía. Las marcas equivocadas se
        // quedan rojas + deshabilitadas; las correctas siguen marcadas.
        intento = 1;
        botones.forEach((b, i) => {
          if (marcadas.has(i) && !setCorrectas.has(i)) {
            marcadas.delete(i);
            b.classList.remove("seleccionada");
            b.setAttribute("aria-pressed", "false");
            b.classList.add("erronea");
            b.disabled = true;
          }
        });
        btnEnviar.disabled = marcadas.size === 0;
        chip("Intento 2 de 2", "aviso");
        btnEnviar.textContent = "Intentar de nuevo";
        feedback("Esta vez el resultado no suma. Ajusta tus marcas: tienes una segunda oportunidad.", "aviso");
        return;
      }

      // Sin valor en los DOS intentos → agotada (reaparece fresca en otra sesión).
      bloquear();
      botones.forEach((b, i) => {
        if (setCorrectas.has(i)) b.classList.add("correcta");   // revela TODAS las correctas
        else if (marcadas.has(i)) b.classList.add("erronea");
        b.classList.remove("seleccionada");
        b.setAttribute("aria-pressed", "false");
      });
      btnEnviar.textContent = "Sin más intentos";
      chip("Intentos agotados", "mal");
      feedback("Esta vez el resultado no suma otra vez. Se agotaron tus intentos: podrás volver a intentarlo en otra sesión.", "mal");
      resolve(0);
    });

    contenedor.append(caja);
  });
}