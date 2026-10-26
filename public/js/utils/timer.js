// ============================================================
// timer.js — TEMPORIZADOR DEL EXAMEN (js/utils/timer.js)
// v1: cuenta regresiva ENLAZADA con botonEnviar.js: el docente pasa
// el tiempo que tienen los estudiantes para el examen y, cuando llega
// a 0, el examen SE ENVÍA SOLO (el mismo flujo del botón Enviar, sin
// confirmación).
//
// USO (desde el archivo del examen, p. ej.
// public/clases/8/matematica/examen-mi-materia.js):
//
//   import { temporizador } from "../../../js/utils/timer.js";
//
//   temporizador({
//     contenedor,             // elemento del DOM donde va el reloj
//     perfil,                 // perfil del usuario (uid, rol, nie?)
//     clase,                  // { id, grado, materiaId, tipo: "examen"… }
//     tipo: "examen",         // (opcional; lo toma de clase.tipo)
//     tiempo: 45,             // MINUTOS (número) — también acepta
//                             //  "45", "45 min", "90m", "1h 30m",
//                             //  "1:30" (1 min 30 s) o "1:00:00" (1 h)
//     texto: "Tiempo restante", // (opcional) rótulo del reloj
//     colorTarjeta: "#0ea5e9",  // (opcional) color; REGLA del proyecto:
//                             //  TODOS los utils/visuales lo aceptan
//     id: "tiempo-examen-1",  // (opcional, recomendado) id estable del
//                             //  reloj para recordar el tiempo que
//                             //  quedaba aunque recarguen la página
//   });
//
// CÓMO FUNCIONA:
//   · Pila arriba: reloj con ⏱ + rótulo + tiempo restante y una barra
//     de progreso del color elegido. Aviso AMBAR cuando queda ≤ 20 %
//     (o ≤ 5 min) y ROJO pulsante cuando queda ≤ 1 min (o ≤ 10 %).
//   · AL LLEGAR A 0 (estudiante + examen): llama al envío compartido
//     enviarExamenAhora("timer") de botonEnviar.js — califica todos
//     los bloques de actividad de la página, finalizarExamen() guarda
//     la nota y la reporta al Sheet, y el botón Enviar queda
//     sincronizado («Se acabó el tiempo…»). El reloj muestra
//     «Tiempo agotado — el examen se envió automáticamente».
//   · ANTI-TRAMPA: el tiempo QUE QUEDA se recuerda en localStorage
//     (clave mco_timer_{uid}_{claseId}_{id}) como FECHA LÍMITE: si el
//     estudiante recarga la página, el reloj SIGUE por donde iba (no
//     reinicia); si la fecha límite ya pasó, envía de inmediato.
//   · Si el examen YA estaba enviado, el reloj arranca detenido
//     mostrando «Examen enviado · Nota final: X pts».
//   · DOCENTE (vista previa): el reloj corre de muestra, no guarda
//     nada y al llegar a 0 NO envía nada.
//   · En CLASE/TAREA: cuenta y avisa «Tiempo agotado», pero NO envía
//     (el envío automático solo aplica a exámenes).
//
// PUNTAJE: la promesa resuelve 0 SIEMPRE (la nota real vive en la
//   nota del examen, igual que botonEnviar.js).
//
// Convención: CSS implícito · 100% responsivo · colorTarjeta opcional
//   con defecto #0ea5e9 (celeste reloj) · iconos SVG inline.
// ============================================================

import {
  obtenerNota,
  esDocente,
} from "./opcionMultiple.js";
import { registrarDatosEnvio, enviarExamenAhora } from "./botonEnviar.js";

/* ---------------- Tiempo ---------------- */

/** Parsea 'tiempo' a SEGUNDOS (entero > 0) o null si no se entiende.
 *  Acepta: 45 (minutos) · "45" · "45 min" · "90m" · "1h" · "1h 30m" ·
 *  "1:30" (mm:ss) · "1:00:00" (hh:mm:ss) · "0:05" (5 segundos, para
 *  pruebas). Coma decimal permitida en los minutos ("1.5" = 90 s). */
export function parseTiempo(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number" || /^\s*\d+(\.\d+)?\s*$/.test(String(v))) {
    const min = Number(v);
    if (!Number.isFinite(min) || min <= 0) return null;
    return Math.max(1, Math.round(min * 60));
  }
  const s = String(v).trim().toLowerCase();

  // hh:mm:ss o mm:ss (2 o 3 partes de dígitos)
  const partes = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (partes) {
    const a = +partes[1], b = +partes[2];
    const c = partes[3] != null ? +partes[3] : null;
    const total = c == null ? a * 60 + b : a * 3600 + b * 60 + c;
    return total > 0 ? Math.round(total) : null;
  }

  // Combinación "1h 30m", "90m", "45 min", "2 h", "1.5h"…
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hora|horas)\b/);
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:m|min|minutos?)\b/);
  const sSec = s.match(/(\d+)\s*(?:s|seg|segundos?)\b/);
  if (h || m || sSec) {
    const total =
      (h ? parseFloat(h[1].replace(",", ".")) * 3600 : 0) +
      (m ? parseFloat(m[1].replace(",", ".")) * 60 : 0) +
      (sSec ? +sSec[1] : 0);
    return total > 0 ? Math.round(total) : null;
  }
  return null;
}

/** Segundos → "45:00" o "1:00:00". */
export function fmtTiempo(seg) {
  const s = Math.max(0, Math.ceil(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const dos = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dos(m)}:${dos(r)}` : `${dos(m)}:${dos(r)}`;
}

/* ---------------- Color (regla del proyecto: colorTarjeta) ---------------- */

function parseColor(v) {
  const s = String(v || "").trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return m[1].split("").map((c) => parseInt(c + c, 16));
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = s.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}

function tono([r, g, b], k) {
  const f = (c) =>
    Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)
      .toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}

/* ---------------- Estilos (una vez) ---------------- */

let estilosListos = false;
function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "timer-estilos";
  estilo.textContent = `
    .tm-caja {
      margin: 1rem auto;
      max-width: 520px;
      background: #ffffff;
      border: 1px solid var(--tm-borde, #bae6fd);
      border-left: 4px solid var(--tm-base, #0ea5e9);
      border-radius: 1rem;
      padding: .75rem 1rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      font-family: system-ui, sans-serif;
    }
    .tm-fila {
      display: flex;
      align-items: center;
      gap: .55rem;
      flex-wrap: wrap;
    }
    .tm-icono { color: var(--tm-base, #0ea5e9); display: inline-flex; }
    .tm-icono svg { width: 1.25rem; height: 1.25rem; }
    .tm-rotulo {
      font-size: .8rem;
      font-weight: 800;
      letter-spacing: .03em;
      text-transform: uppercase;
      color: var(--tm-oscuro, #0369a1);
      flex: 1;
      min-width: 0;
    }
    .tm-reloj {
      font-variant-numeric: tabular-nums;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--tm-oscuro, #0369a1);
      line-height: 1;
      white-space: nowrap;
    }
    .tm-barra {
      height: 7px;
      border-radius: 999px;
      background: var(--tm-claro, #e0f2fe);
      overflow: hidden;
      margin-top: .55rem;
    }
    .tm-barra > span {
      display: block;
      height: 100%;
      width: 100%;
      border-radius: 999px;
      background: var(--tm-base, #0ea5e9);
      transition: width .5s linear, background .3s ease;
    }
    .tm-nota {
      margin: .4rem 0 0;
      font-size: .78rem;
      font-weight: 600;
      color: #6b7280;
      line-height: 1.4;
    }
    /* Aviso: queda poco tiempo */
    .tm-caja.tm-aviso {
      border-color: #fbbf24;
      border-left-color: #f59e0b;
    }
    .tm-caja.tm-aviso .tm-reloj,
    .tm-caja.tm-aviso .tm-rotulo,
    .tm-caja.tm-aviso .tm-icono { color: #b45309; }
    .tm-caja.tm-aviso .tm-barra > span { background: #f59e0b; }
    /* Crítico: casi sin tiempo */
    .tm-caja.tm-critico {
      border-color: #fca5a5;
      border-left-color: #ef4444;
      animation: tm-pulso 1s ease-in-out infinite;
    }
    .tm-caja.tm-critico .tm-reloj,
    .tm-caja.tm-critico .tm-rotulo,
    .tm-caja.tm-critico .tm-icono { color: #b91c1c; }
    .tm-caja.tm-critico .tm-barra > span { background: #ef4444; }
    @keyframes tm-pulso {
      0%, 100% { box-shadow: 0 4px 16px rgba(239, 68, 68, .10); }
      50% { box-shadow: 0 4px 20px rgba(239, 68, 68, .38); }
    }
    /* Agotado / enviado */
    .tm-caja.tm-listo { animation: none; }
    .tm-caja.tm-listo .tm-reloj,
    .tm-caja.tm-listo .tm-rotulo,
    .tm-caja.tm-listo .tm-icono { color: #15803d; }
    .tm-caja.tm-listo .tm-barra > span { background: #16a34a; width: 100%; }
    /* Datos inválidos */
    .tm-error {
      border: 2px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      font-weight: 600;
      padding: .8rem 1rem;
      border-radius: 1rem;
      margin: 1rem auto;
      max-width: 520px;
    }
  `;
  document.head.append(estilo);
}

const SVG_RELOJ =
  '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>';

/* ---------------- Componente ---------------- */

/**
 * Inserta el TEMPORIZADOR del examen. Devuelve una Promise<number>
 * que resuelve 0 (el puntaje real vive en la nota del examen).
 */
export function temporizador(config = {}) {
  const {
    contenedor,
    perfil,
    clase,
    id,
    tiempo,
    texto,        // rótulo (defecto "Tiempo restante")
  } = config;

  const tipo = String(config.tipo || clase?.tipo || "").toLowerCase().trim();
  const esExamen = tipo === "examen";
  const color = parseColor(config.colorTarjeta) || [14, 165, 233]; // #0ea5e9
  const segundos = parseTiempo(tiempo);

  const promesa = new Promise((resolve) => {
    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[timer] Falta 'contenedor' (elemento del DOM donde insertar el reloj).");
      resolve(0);
      return;
    }
    if (!segundos) {
      console.error(
        "[timer] 'tiempo' no se entiende (llegó:", tiempo,
        "). Pasa MINUTOS (45), «45 min», «1h 30m», «mm:ss» o «hh:mm:ss»."
      );
      const err = document.createElement("div");
      err.className = "tm-error";
      err.textContent =
        "[timer] El TIEMPO no se entiende: pasa minutos (45), «45 min», «1h 30m», «1:30» (1 min 30 s) o «1:00:00» (1 hora).";
      contenedor.append(err);
      resolve(0);
      return;
    }
    // SIN perfil/clase (llamadores manuales, laboratorios) el reloj
    // NO desaparece: corre en MODO DEMO (nada se guarda ni se envía).
    // Antes aquí se cortaba con console.error y el bloque quedaba
    // vacío — en la vista previa parecía que «no renderiza».
    const demoSinDatos = !perfil?.uid || !clase?.id;
    if (demoSinDatos) {
      console.warn(
        "[timer] Faltan 'perfil' (con uid) o 'clase' (con id): el reloj corre de MUESTRA — no recuerda nada y al llegar a 0 NO envía."
      );
    }

    inyectarEstilos();

    const esDoc = esDocente(perfil) || demoSinDatos;
    const rotulo = String(texto || "").trim() || "Tiempo restante";

    // Datos para el envío compartido (si el botón no los puso ya).
    // SOLO con datos reales: {perfil: undefined} PISARÍA los buenos
    // que dejó el botón (reg.datos se mezcla con spread).
    if (!demoSinDatos) {
      registrarDatosEnvio({
        perfil,
        clase,
        titulo: String(clase.titulo ?? clase.clase ?? "").trim() || undefined,
      });
    }

    // Clave del tiempo recordado (anti-recarga). Sin 'id' se deriva del
    // examen mismo (un reloj por examen: el caso normal). En DEMO sin
    // datos NO se toca perfil/clase (no hay nada que recordar).
    const sid = String(id || "").trim()
      ? "id-" + String(id).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
      : "x";
    const clave = demoSinDatos
      ? ""
      : "mco_timer_" + perfil.uid + "_" + clase.id + "_" + sid;

    // Caja
    const caja = document.createElement("div");
    caja.className = "tm-caja";
    caja.setAttribute("role", "timer");
    caja.setAttribute("aria-label", rotulo);
    caja.style.setProperty("--tm-base", `rgb(${color.join(",")})`);
    caja.style.setProperty("--tm-oscuro", tono(color, -0.25));
    caja.style.setProperty("--tm-claro", tono(color, 0.88));
    caja.style.setProperty("--tm-borde", tono(color, 0.55));
    caja.innerHTML = `
      <div class="tm-fila">
        <span class="tm-icono">${SVG_RELOJ}</span>
        <span class="tm-rotulo">${esc(rotulo)}</span>
        <span class="tm-reloj">--:--</span>
      </div>
      <div class="tm-barra"><span></span></div>
      <p class="tm-nota"></p>`;

    const relojEl = caja.querySelector(".tm-reloj");
    const barraEl = caja.querySelector(".tm-barra > span");
    const notaEl = caja.querySelector(".tm-nota");
    let intervalo = null; // intervalo PROPIO de esta instancia (nunca global)

    function esc(s) {
      return String(s).replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
      );
    }

    function pintar(resta) {
      relojEl.textContent = fmtTiempo(resta);
      const p = Math.max(0, Math.min(1, resta / segundos));
      barraEl.style.width = (p * 100).toFixed(1) + "%";
      const fraccion = resta / segundos;
      const aviso = resta <= Math.max(300, segundos * 0.2) && resta > 0;
      const critico = resta <= Math.max(60, segundos * 0.1) && resta > 0;
      caja.classList.toggle("tm-aviso", aviso && !critico);
      caja.classList.toggle("tm-critico", critico);
    }

    function detener(claseFinal, mensajeFinal) {
      clearInterval(intervalo);
      intervalo = null;
      caja.classList.remove("tm-aviso", "tm-critico");
      if (claseFinal) caja.classList.add(claseFinal);
      if (mensajeFinal) notaEl.textContent = mensajeFinal;
    }

    // Ya enviado: reloj detenido con la nota guardada
    function mostrarYaEnviado(puntos) {
      relojEl.textContent = "0:00";
      barraEl.style.width = "0%";
      detener("tm-listo");
      notaEl.textContent =
        puntos != null
          ? `Examen enviado · Nota final: ${puntos} pts.`
          : "Examen enviado.";
      try { localStorage.removeItem(clave); } catch (e) { /* nada */ }
      resolve(0);
    }

    // Cuando el envío llegue desde CUALQUIER lado (botón, otro reloj…)
    const alEnviado = (puntos) => {
      if (!caja.isConnected) return;
      clearInterval(intervalo);
      intervalo = null;
      mostrarYaEnviado(puntos);
    };

    // DOCENTE (o demo sin datos): corre de muestra, no persiste y NO envía
    if (esDoc) {
      let resta = segundos;
      pintar(resta);
      notaEl.textContent = demoSinDatos
        ? "Modo demo (faltan perfil/clase): al llegar a 0 NO se envía nada."
        : "Vista docente (demo): al llegar a 0 NO se envía nada.";
      const t = setInterval(() => {
        resta -= 1;
        if (resta <= 0) {
          clearInterval(t);
          intervalo = null;
          relojEl.textContent = "0:00";
          barraEl.style.width = "0%";
          detener("tm-listo", "Tiempo agotado (demo): nada se envía en la vista docente.");
          resolve(0);
          return;
        }
        pintar(resta);
      }, 1000);
      intervalo = t;
      contenedor.append(caja);
      resolve(0);
      return;
    }

    // ESTUDIANTE
    (async () => {
      // ¿Examen ya enviado? (reentrada) → detenido con la nota
      try {
        const nota = await obtenerNota(perfil, clase);
        if (nota && nota.enviado) {
          contenedor.append(caja); // visible aunque venga ya enviado
          mostrarYaEnviado(typeof nota.puntos === "number" ? nota.puntos : null);
          return;
        }
      } catch (e) { /* sin conexión: sigue el reloj */ }

      // Fecha límite recordada (sobrevive recargas: NO reinicia)
      let limite = 0;
      try {
        const guardado = Number(localStorage.getItem(clave));
        if (Number.isFinite(guardado) && guardado > 0) limite = guardado;
      } catch (e) { /* nada */ }
      if (!limite) {
        limite = Date.now() + segundos * 1000;
        try { localStorage.setItem(clave, String(limite)); } catch (e) { /* nada */ }
      }

      let enviado = false;

      const agotar = async () => {
        if (enviado) return;
        enviado = true;
        clearInterval(temporizador._intervalo);
        temporizador._intervalo = null;
        relojEl.textContent = "0:00";
        barraEl.style.width = "0%";
        caja.classList.remove("tm-aviso", "tm-critico");

        if (!esExamen) {
          caja.classList.add("tm-listo");
          notaEl.textContent = "Tiempo agotado. (El envío automático solo aplica a exámenes.)";
          resolve(0);
          return;
        }

        notaEl.textContent = "¡Tiempo agotado! Enviando tu examen…";
        try {
          const r = await enviarExamenAhora("timer");
          clearInterval(intervalo);
          intervalo = null;
          caja.classList.add("tm-listo");
          notaEl.textContent =
            "Tiempo agotado — el examen se envió automáticamente" +
            (r && typeof r.puntos === "number" ? ` · Nota final: ${r.puntos} pts.` : ".");
          try { localStorage.removeItem(clave); } catch (e) { /* nada */ }
        } catch (e) {
          console.warn("[timer]", e);
          caja.classList.add("tm-listo");
          notaEl.textContent = "Tiempo agotado. No se pudo enviar (revisa tu conexión) — usa el botón Enviar.";
        }
        resolve(0);
      };

      // Suscrito al envío compartido (botón u otro reloj lo disparó)
      try {
        const reg = (window.__mcoEnvioExamen = window.__mcoEnvioExamen || {});
        if (!reg.alEnviado) reg.alEnviado = [];
        reg.alEnviado.push(alEnviado);
      } catch (e) { /* nada */ }

      // Tick
      const tick = () => {
        const resta = (limite - Date.now()) / 1000;
        if (resta <= 0) {
          pintar(0);
          agotar();
          return;
        }
        pintar(resta);
      };
      tick();
      intervalo = setInterval(tick, 500);
      contenedor.append(caja);
    })();
  });

  return promesa;
}
