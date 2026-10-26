// ============================================================
// botonEnviar.js — BOTÓN ENVIAR DEL EXAMEN (js/utils/botonEnviar.js)
// v1: bloque para colocar el botón «Enviar examen» AL FINAL de un
// examen, ENLAZADO con timer.js: si el tiempo se acaba, el envío se
// dispara solo (mismo flujo, sin confirmación).
//
// USO (desde el archivo del examen, p. ej.
// public/clases/8/matematica/examen-mi-materia.js):
//
//   import { botonEnviar } from "../../../js/utils/botonEnviar.js";
//
//   botonEnviar({
//     contenedor,            // elemento del DOM donde va el botón
//     perfil,                // perfil del usuario (uid, rol, nie?)
//     clase,                 // { id, grado, materiaId, tipo: "examen"… }
//     tipo: "examen",        // (opcional; lo toma de clase.tipo)
//     titulo: "Examen 1",    // (opcional) título para el espejo Sheets
//     texto: "Enviar examen",// (opcional) rótulo del botón
//     confirmar: true,       // (opcional) pedir confirmación al tocar
//                            //  (defecto true; el TIMER nunca confirma)
//     colorTarjeta: "#16a34a", // (opcional) color; REGLA del proyecto:
//                            //  TODOS los utils/visuales lo aceptan
//   });
//
// QUÉ HACE AL ENVIAR (estudiante, examen):
//   1. Califica TODOS los bloques de actividad de la página que el
//      estudiante NO envió uno a uno (los utils se registran solos en
//      window.__mcoEnvioExamen: opcionMultiple, multipleOpcion,
//      respuestaSimple, ordenar, relacionar, sopaLetras, crucigrama,
//      blank…). Lo vacío/incorrecto → 0 (regla de siempre).
//   2. finalizarExamen() (opcionMultiple.js): fija nota.enviado,
//      guarda en Firestore/localStorage y reporta el TOTAL al Sheet
//      UNA vez. NUEVO v7.2: también BLOQUEA la pieza para ese
//      estudiante (db.clases.bloquearEstudiante → bloqueadas.{uid})
//      — ya no puede volver a entrar; solo revisar sus resultados
//      con «Mi puntaje» desde la tarjeta.
//   3. Muestra «Examen enviado · Nota final: X pts», se deshabilita y
//      oculta la caja de envío por defecto (#cg-envio) del archivo
//      generado para NO duplicar botones.
//   · Si el examen YA estaba enviado (nota.enviado) arranca mostrando
//     ese estado con la nota guardada.
//   · DOCENTE: vista de prueba — nada se guarda, nada se confirma.
//   · En CLASE/TAREA: se ve pero avisa que solo aplica a exámenes.
//
// ENLACE CON EL TIMER (timer.js):
//   Este archivo es el DUEÑO del envío compartido:
//     import { enviarExamenAhora, registrarDatosEnvio } from "./botonEnviar.js";
//     await enviarExamenAhora("timer");   // envía SIN confirmar
//   El timer y este botón comparten la misma ejecución: quien llegue
//   primero (el clic o el tiempo) envía una sola vez y el otro queda
//   sincronizado (bandera window.__mcoEnvioExamen.enviado).
//
// PUNTAJE: la promesa resuelve 0 SIEMPRE (el puntaje real vive en la
//   nota del examen: nota.puntos; lo muestra el propio botón al
//   enviar y el modal «Mi puntaje» de la vista).
//
// Persistencia: la MISMA de opcionMultiple.js (localStorage
//   mco_nota_{uid}_{claseId} + notas/{uid}/clases/{claseId} en
//   Firestore vía db.js + espejo Sheets desde finalizarExamen()).
//
// Convención: CSS implícito · 100% responsivo · colorTarjeta opcional
//   con defecto #16a34a (verde envío) · sin dependencias de Shoelace
//   (iconos SVG inline).
// ============================================================

import {
  finalizarExamen,
  obtenerNota,
  marcarEnvioPendiente,
  esDocente,
} from "./opcionMultiple.js";

/* ---------------- Registro compartido del envío ----------------
   window.__mcoEnvioExamen = {
     mapa:   { qid: fn }  → los utils de actividad registran su enviar()
     datos:  { perfil, clase, titulo } → para finalizarExamen
     alEnviado: [fn(puntos, motivo)]  → botones/timers a la escucha
     enviado: true|false · puntos: número|null
   }
   Vive en window para que los utils NO tengan que importarse entre sí
   (regla del proyecto: nada de cadenas de imports que tumben páginas). */

function registro() {
  const reg = (window.__mcoEnvioExamen = window.__mcoEnvioExamen || {});
  if (!reg.mapa) reg.mapa = {};
  if (!reg.alEnviado) reg.alEnviado = [];
  return reg;
}

/** El timer (u otro bloque) fija los datos del examen para el envío
 *  compartido. Si el botón ya los puso, no se pisan (mismo examen). */
export function registrarDatosEnvio(datos = {}) {
  const reg = registro();
  reg.datos = { ...(reg.datos || {}), ...datos };
}

/**
 * ENVÍO COMPARTIDO del examen (lo usan el botón y el timer).
 * 1) califica los bloques pendientes · 2) finalizarExamen() ·
 * 3) bandera enviado + aviso a los suscritos. Idempotente: si ya se
 * está enviando (o ya se envió) espera/devuelve sin repetir nada.
 * Devuelve { puntos, ok, motivo }.
 */
export async function enviarExamenAhora(motivo = "manual") {
  const reg = registro();

  if (reg.enviado) return { ok: true, yaEnviado: true, puntos: reg.puntos, motivo };
  if (reg.promesa) return reg.promesa; // ya hay un envío en marcha

  reg.promesa = (async () => {
    // 1) Bloques de actividad pendientes (en orden de registro)
    const fns = Object.values(reg.mapa || {});
    for (const fn of fns) {
      try { await fn(); } catch (e) { /* un bloque que falla no frena el envío */ }
    }

    // 2) Cierre del examen (nota.enviado + espejo Sheets)
    const d = reg.datos || {};
    let res = null;
    if (d.perfil?.uid && d.clase?.id) {
      try {
        res = await finalizarExamen(d.perfil, d.clase, { titulo: d.titulo });
      } catch (e) { /* igual queda enviado en local */ }
    }

    reg.enviado = true;
    reg.puntos = res && typeof res.puntos === "number" ? res.puntos : null;

    // UI del archivo generado (banner verde + ocultar la caja por defecto)
    try {
      const aviso = document.getElementById("cg-aviso");
      if (aviso) aviso.hidden = true;
      const caja = document.getElementById("cg-envio");
      if (caja) caja.hidden = true;
      const listo = document.getElementById("cg-enviado");
      if (listo) {
        listo.hidden = false;
        const txt = document.getElementById("cg-enviado-txt");
        if (txt) {
          txt.textContent =
            reg.puntos == null
              ? "Examen enviado."
              : "Examen enviado · Nota final: " + reg.puntos + " pts.";
        }
      }
    } catch (e) { /* fuera del archivo generado: nada */ }

    // 3) Avisar a botones y timers suscritos
    (reg.alEnviado || []).forEach((fn) => {
      try { fn(reg.puntos, motivo); } catch (e) { /* aviso propio */ }
    });

    return { ok: true, yaEnviado: false, puntos: reg.puntos, motivo };
  })();

  try {
    return await reg.promesa;
  } finally {
    reg.promesa = null;
  }
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

// Mezcla con negro (k < 0) o con blanco (k > 0)
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
  estilo.id = "boton-enviar-estilos";
  estilo.textContent = `
    .be-caja {
      margin: 1.4rem auto;
      max-width: 520px;
      text-align: center;
      font-family: system-ui, sans-serif;
    }
    .be-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      font: inherit;
      font-size: 1.05rem;
      font-weight: 800;
      color: #ffffff;
      background: var(--be-base, #16a34a);
      border: none;
      border-radius: 999px;
      padding: .8rem 2rem;
      cursor: pointer;
      box-shadow: 0 8px 22px var(--be-sombra, rgba(22, 163, 74, .35));
      transition: transform .12s ease, background .15s ease, box-shadow .15s ease;
    }
    .be-btn:hover:not(:disabled) { background: var(--be-oscuro, #15803d); }
    .be-btn:active:not(:disabled) { transform: scale(.98); }
    .be-btn:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
    }
    .be-btn svg { width: 1.1em; height: 1.1em; flex: none; }
    .be-nota {
      margin: .45rem 0 0;
      font-size: .78rem;
      color: #6b7280;
      line-height: 1.45;
    }
    .be-listo {
      display: inline-flex;
      align-items: center;
      gap: .5rem;
      border: 2px solid var(--be-base, #16a34a);
      background: var(--be-claro, #f0fdf4);
      color: var(--be-oscuro, #15803d);
      border-radius: .9rem;
      padding: .65rem 1.1rem;
      font-size: .95rem;
      font-weight: 800;
    }
    .be-listo svg { width: 1.15em; height: 1.15em; flex: none; }
    .be-aviso {
      margin: 0 0 .6rem;
      padding: .55rem .8rem;
      border: 1px dashed var(--be-base, #16a34a);
      border-radius: .8rem;
      color: var(--be-oscuro, #15803d);
      background: var(--be-claro, #f0fdf4);
      font-size: .82rem;
      font-weight: 600;
    }
    @media (max-width: 560px) {
      .be-btn { width: 100%; }
    }
  `;
  document.head.append(estilo);
}

const SVG_ENVIAR =
  '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M.989 8 .064 2.68a1 1 0 0 1 1.329-1.102l13.5 5.32a1 1 0 0 1 0 1.866l-13.5 5.32A1 1 0 0 1 .989 12.32L1.914 8H7a1 1 0 0 1 0-2H.989Z"/></svg>';
const SVG_LISTO =
  '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>';

/* ---------------- Componente ---------------- */

/**
 * Inserta el BOTÓN ENVIAR del examen. Devuelve una Promise<number>
 * que resuelve 0 cuando el examen queda enviado (o de inmediato si
 * ya venía enviado / es vista docente / no es examen).
 */
export function botonEnviar(config = {}) {
  const {
    contenedor,
    perfil,
    clase,
    id,
    titulo,
    texto,          // rótulo del botón (defecto "Enviar examen")
    confirmar,      // confirmación al tocar (defecto true)
  } = config;

  const tipo = String(config.tipo || clase?.tipo || "").toLowerCase().trim();
  const esExamen = tipo === "examen";
  const color = parseColor(config.colorTarjeta) || [22, 163, 74]; // #16a34a
  const pideConfirmar = config.confirmar !== false;

  const promesa = new Promise((resolve) => {
    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[botonEnviar] Falta 'contenedor' (elemento del DOM donde insertar el botón).");
      resolve(0);
      return;
    }
    // SIN perfil/clase (llamadores manuales, laboratorios) el botón
    // NO desaparece: entra en MODO DEMO (nada se guarda ni se envía).
    // Antes aquí se cortaba con console.error y el bloque quedaba
    // vacío — en la vista previa parecía que «no renderiza».
    const demoSinDatos = !perfil?.uid || !clase?.id;
    if (demoSinDatos) {
      console.warn(
        "[botonEnviar] Faltan 'perfil' (con uid) o 'clase' (con id): el botón se ve en MODO DEMO — no guarda ni envía nada."
      );
    }

    inyectarEstilos();

    const esDoc = esDocente(perfil) || demoSinDatos;
    const rotulo = String(texto || "").trim() || "Enviar examen";
    const tituloExamen = String(titulo ?? clase?.titulo ?? clase?.clase ?? "").trim();

    // Datos del envío compartido (los usa el timer también).
    // SOLO con datos reales: {perfil: undefined} PISARÍA los buenos
    // que dejó otro bloque (reg.datos se mezcla con spread).
    if (!demoSinDatos) {
      registrarDatosEnvio({ perfil, clase, titulo: tituloExamen || undefined });
    }

    const caja = document.createElement("div");
    caja.className = "be-caja";
    caja.setAttribute("role", "group");
    caja.setAttribute("aria-label", "Envío del examen");
    caja.style.setProperty("--be-base", `rgb(${color.join(",")})`);
    caja.style.setProperty("--be-oscuro", tono(color, -0.18));
    caja.style.setProperty("--be-claro", tono(color, 0.9));
    caja.style.setProperty(
      "--be-sombra",
      `rgba(${color.join(",")}, .35)`
    );
    caja.innerHTML = `
      <button type="button" class="be-btn">
        ${SVG_ENVIAR}<span>${esc(rotulo)}</span>
      </button>
      <p class="be-nota">Al enviar se califica todo, se guarda tu nota y el examen se bloquea para ti: solo podrás revisar tu puntaje.</p>`;

    const btn = caja.querySelector(".be-btn");
    const nota = caja.querySelector(".be-nota");

    function esc(s) {
      return String(s).replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
      );
    }

    // Estado ENVIADO (al cargar ya enviado, o al enviar ahora)
    function mostrarEnviado(puntos, conNota = true) {
      btn.disabled = true;
      caja.querySelector(".be-nota")?.remove();
      const listo = document.createElement("div");
      listo.className = "be-listo";
      listo.innerHTML =
        SVG_LISTO +
        "<span>" +
        (conNota && puntos != null
          ? `Examen enviado · Nota final: ${esc(String(puntos))} pts.`
          : "Examen enviado.") +
        "</span>";
      btn.replaceWith(listo);
    }

    // Cuando el TIMER (u otro) dispare el envío compartido
    const alEnviado = (puntos, motivo) => {
      if (!caja.isConnected) return;
      mostrarEnviado(puntos, true);
      if (motivo === "timer") {
        const aviso = document.createElement("p");
        aviso.className = "be-aviso";
        aviso.textContent = "Se acabó el tiempo: el examen se envió automáticamente.";
        caja.prepend(aviso);
      }
    };
    registro().alEnviado.push(alEnviado);

    // En CLASE/TAREA: el bloque se ve pero no envía nada
    if (!esExamen) {
      const aviso = document.createElement("p");
      aviso.className = "be-aviso";
      aviso.textContent =
        "Este botón es para EXÁMENES: aquí no hay nada que enviar (no se guarda nada).";
      caja.prepend(aviso);
      btn.addEventListener("click", () => {
        nota.textContent = "Solo envía exámenes: colócalo en un examen.";
      });
      contenedor.append(caja);
      resolve(0);
      return;
    }

    // DOCENTE (o demo sin datos): demo sin guardado
    if (esDoc) {
      btn.addEventListener("click", () => {
        btn.disabled = true;
        btn.innerHTML = `${SVG_LISTO}<span>Vista docente</span>`;
        nota.textContent = demoSinDatos
          ? "Modo demo (faltan perfil/clase): en un examen real esto envía todo, guarda la nota y cierra. Nada se guarda ahora."
          : "Vista docente (demo): en un examen real esto envía todo, guarda la nota y cierra. Nada se guarda ahora.";
        resolve(0);
      });
      contenedor.append(caja);
      resolve(0);
      return;
    }

    // ESTUDIANTE · EXAMEN
    (async () => {
      // ¿Ya venía enviado? (reentrada tras enviar o salida forzada)
      try {
        const notaAntes = await obtenerNota(perfil, clase);
        if (notaAntes && notaAntes.enviado) {
          mostrarEnviado(notaAntes.puntos, true);
          registro().enviado = true;
          registro().puntos = typeof notaAntes.puntos === "number" ? notaAntes.puntos : null;
          contenedor.append(caja); // ← también en la reentrada (bug del E2E)
          resolve(0);
          return;
        }
      } catch (e) { /* sin conexión: sigue disponible */ }

      // Salida forzada sin enviar → auto-envío en la próxima visita
      // (la MISMA marca que usa el archivo generado; idempotente)
      try {
        window.addEventListener("pagehide", () => {
          marcarEnvioPendiente(perfil, clase);
        });
      } catch (e) { /* nada */ }

      btn.addEventListener("click", async () => {
        if (registro().enviado || btn.disabled) return;
        if (pideConfirmar) {
          const seguir = window.confirm(
            "¿ENVIAR el examen?\n\n" +
              "Se califican todas tus respuestas (lo que quedó vacío cuenta como incorrecto), " +
              "se guarda tu nota y el examen se cierra: no podrás cambiar nada.\n\n" +
              "Después solo podrás revisar tus resultados (Mi puntaje)."
          );
          if (!seguir) return;
        }
        btn.disabled = true;
        btn.innerHTML = `${SVG_ENVIAR}<span>Enviando…</span>`;
        nota.textContent = "Calificando y guardando tu examen…";
        try {
          const r = await enviarExamenAhora("manual");
          if (!registro().enviado) {
            // Sin datos de envío (no debiera pasar): igual queda enviado
            registro().enviado = true;
          }
          if (caja.isConnected && r && r.yaEnviado) mostrarEnviado(r.puntos ?? registro().puntos, true);
        } catch (e) {
          console.warn("[botonEnviar]", e);
          btn.disabled = false;
          btn.innerHTML = `${SVG_ENVIAR}<span>${esc(rotulo)}</span>`;
          nota.textContent = "No se pudo enviar (revisa tu conexión) — intenta de nuevo.";
        }
      });

      contenedor.append(caja);
      resolve(0); // el puntaje real lo maneja la nota del examen
    })();
  });

  return promesa;
}
