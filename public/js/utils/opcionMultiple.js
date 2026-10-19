// ============================================================
// opcionMultiple.js — Pregunta de opción múltiple reutilizable
// (js/utils/opcionMultiple.js)
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: inserta
// una pregunta interactiva en el elemento que se le indique.
//
// USO (desde el archivo de contenido de una clase, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { opcionMultiple } from "../../../js/utils/opcionMultiple.js";
//
//   opcionMultiple({
//     contenedor,   // elemento del DOM donde insertar la pregunta
//     perfil,       // perfil del usuario (users/{uid}, trae uid)
//     clase,        // objeto de la clase { id, grado, materiaId, ... }
//     pregunta: "¿Cuál es el resultado de 3/4 + 1/4?",
//     opciones: ["4/8", "1/2", "1", "3/8"],   // entre 2 y 6 textos
//     correcta: 3,   // NÚMERO de la respuesta correcta (1 = primera opción)
//     // id: "p1",   // (opcional) identificador único de la pregunta
//   });
//
// Nota de la clase (se guarda por usuario y por clase):
//   · Correcta al 1er intento → +1 punto.
//   · Correcta al 2do intento → +0.5 punto.
//   · Fallada 2 veces → 0 puntos (podrá reintentarse en otra sesión).
//   · Cada pregunta solo suma UNA vez (queda registrada).
//   · Guardado: localStorage "mco_nota_{uid}_{claseId}" (instantáneo)
//     + notas/{uid}/clases/{claseId} en Firestore (mejor esfuerzo).
//
// También exporta obtenerNota(perfil, clase) y sumarPuntos(...) por si
// otras utilidades (tareas, exámenes) necesitan la misma nota.
//
// Convención: CSS implícito · 100% responsivo · fondo blanco · paleta del proyecto.
// ============================================================

import { db } from "../data/initFirebase.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

/* ---------------- Constantes ---------------- */

const LETRAS = ["A", "B", "C", "D", "E", "F"];
const CLAVE_NOTA = (uid, claseId) => `mco_nota_${uid}_${claseId}`;

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

// Toast de aviso (mismo patrón que auth.js / clases.js)
function notify(mensaje, variant = "warning", duracion = 4000) {
  try {
    const alerta = document.createElement("sl-alert");
    alerta.setAttribute("variant", variant);
    alerta.setAttribute("closable", "");
    alerta.setAttribute("duration", String(duracion));
    alerta.textContent = mensaje;
    document.body.append(alerta);
    customElements.whenDefined("sl-alert").then(() => alerta.toast());
  } catch (e) {
    console.warn("[aviso]", mensaje);
  }
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "opcion-multiple-estilos";
  estilo.textContent = `
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
    .om-nota { font-size: .8rem; color: #6b7280; }
    .om-nota b { color: #7c3aed; font-size: .95rem; }

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
      .om-caja { padding: 1rem; }
      .om-opciones { grid-template-columns: 1fr; }
      .om-pie { flex-direction: column-reverse; align-items: stretch; }
      .om-enviar { justify-content: center; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Nota de la clase (localStorage + Firestore) ---------------- */

function leerNotaLocal(uid, claseId) {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_NOTA(uid, claseId)) || "null");
    if (!d || typeof d !== "object") return { puntos: 0, preguntas: {} };
    return {
      puntos: Number(d.puntos) || 0,
      preguntas: d.preguntas && typeof d.preguntas === "object" ? d.preguntas : {},
    };
  } catch (e) {
    return { puntos: 0, preguntas: {} };
  }
}

function guardarNotaLocal(uid, claseId, nota) {
  try {
    localStorage.setItem(CLAVE_NOTA(uid, claseId), JSON.stringify(nota));
  } catch (e) { /* ignorar */ }
}

/** Nota de una clase para el usuario: fusiona lo local con lo de Firestore. */
export async function obtenerNota(perfil, clase) {
  if (!perfil?.uid || !clase?.id) return { puntos: 0, preguntas: {} };
  const local = leerNotaLocal(perfil.uid, clase.id);
  try {
    const snap = await getDoc(doc(db, "notas", perfil.uid, "clases", clase.id));
    if (snap.exists()) {
      const remota = snap.data() || {};
      const preguntas = { ...(remota.preguntas || {}), ...local.preguntas };
      // El total SIEMPRE se recalcula del mapa por pregunta (fuente de verdad)
      const puntos = Object.values(preguntas).reduce((s, p) => s + (Number(p) || 0), 0);
      const nota = { puntos, preguntas };
      guardarNotaLocal(perfil.uid, clase.id, nota);
      return nota;
    }
  } catch (e) { /* sin Firestore o sin permisos: queda la copia local */ }
  return local;
}

/** Suma puntos de UNA pregunta (solo la primera vez que se responde). */
export async function sumarPuntos(perfil, clase, preguntaId, puntos) {
  if (!perfil?.uid || !clase?.id) return { puntos: 0, preguntas: {} };
  const nota = await obtenerNota(perfil, clase);
  if (nota.preguntas[preguntaId] != null) return nota; // ya sumó antes

  nota.preguntas[preguntaId] = puntos;
  nota.puntos = Object.values(nota.preguntas).reduce((s, p) => s + (Number(p) || 0), 0);
  guardarNotaLocal(perfil.uid, clase.id, nota);

  try {
    await setDoc(
      doc(db, "notas", perfil.uid, "clases", clase.id),
      { ...nota, actualizadoEn: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn("[nota] Firestore no disponible, queda en localStorage:", e?.code || e);
  }
  return nota;
}

/* ---------------- Componente ---------------- */

/**
 * Inserta una pregunta de opción múltiple en el contenedor indicado.
 * Devuelve el elemento creado (o null si los parámetros son inválidos).
 */
export function opcionMultiple({ contenedor, perfil, clase, pregunta, opciones, correcta, id } = {}) {
  inyectarEstilos();

  // --- Validaciones (avisos claros para quien escribe el contenido) ---
  const texto = String(pregunta ?? "").trim();
  const lista = Array.isArray(opciones) ? opciones.map((o) => String(o ?? "").trim()) : [];
  const idx = Number(correcta);

  function errorDev(mensaje) {
    console.error("[opcionMultiple]", mensaje);
    const div = document.createElement("div");
    div.className = "om-caja om-error-dev";
    div.textContent = "[opcionMultiple] " + mensaje;
    contenedor.append(div);
    return null;
  }

  if (!contenedor || typeof contenedor.append !== "function") {
    console.error("[opcionMultiple] Falta 'contenedor' (elemento del DOM donde insertar la pregunta).");
    return null;
  }
  if (!texto) return errorDev("Falta el texto de la pregunta.");
  if (lista.length < 2 || lista.length > 6) {
    return errorDev(`Las opciones deben ser entre 2 y 6 (llegaron ${lista.length}).`);
  }
  if (lista.some((o) => !o)) return errorDev("Hay opciones vacías (cada respuesta necesita texto).");
  if (!Number.isInteger(idx) || idx < 1 || idx > lista.length) {
    return errorDev(`'correcta' debe ser un número entero entre 1 y ${lista.length} (1 = primera opción).`);
  }
  if (!perfil?.uid || !clase?.id) {
    return errorDev("Faltan 'perfil' (con uid) o 'clase' (con id): la nota no se puede guardar.");
  }

  const idxCorrecta = idx - 1;
  const qid = id ? slug(String(id)) : `${slug(texto)}-${hash8(normalizar(texto))}`;

  let intento = 0;        // 0 = primer intento, 1 = segunda oportunidad
  let seleccion = -1;
  let bloqueada = false;  // pregunta terminada (resuelta o agotada)

  // --- Estructura ---
  const caja = document.createElement("section");
  caja.className = "om-caja";
  caja.setAttribute("aria-label", texto);
  caja.innerHTML = `
    <div class="om-cab">
      <span class="om-etiqueta">Pregunta</span>
      <span class="om-nota">Nota de la clase: <b>0</b> pts</span>
    </div>
    <p class="om-pregunta"></p>
    <div class="om-opciones"></div>
    <div class="om-pie">
      <span class="om-feedback" aria-live="polite"></span>
      <button type="button" class="om-enviar" disabled>Enviar respuesta</button>
    </div>`;
  caja.querySelector(".om-pregunta").textContent = texto;

  const feedbackEl = caja.querySelector(".om-feedback");
  const btnEnviar = caja.querySelector(".om-enviar");
  const notaEl = caja.querySelector(".om-nota b");

  const feedback = (mensaje, tipo) => {
    feedbackEl.textContent = mensaje;
    feedbackEl.className = "om-feedback" + (tipo ? " " + tipo : "");
  };

  const pintarNota = (puntos) => {
    notaEl.textContent = String(puntos);
  };

  const bloquear = () => {
    bloqueada = true;
    btnEnviar.disabled = true;
    botones.forEach((b) => {
      b.disabled = true;
      b.classList.remove("seleccionada");
    });
  };

  const botones = lista.map((textoOpcion, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "om-opcion";
    b.setAttribute("aria-pressed", "false");

    const letra = document.createElement("span");
    letra.className = "om-letra";
    letra.textContent = LETRAS[i];

    const t = document.createElement("span");
    t.className = "om-texto";
    t.textContent = textoOpcion;

    b.append(letra, t);
    b.addEventListener("click", () => {
      if (bloqueada) return;
      seleccion = i;
      botones.forEach((x, j) => {
        x.classList.toggle("seleccionada", j === i);
        x.setAttribute("aria-pressed", String(j === i));
      });
      btnEnviar.disabled = false;
      feedback("", "");
    });
    return b;
  });
  caja.querySelector(".om-opciones").append(...botones);

  // --- Nota inicial: local al instante, Firestore de fondo ---
  obtenerNota(perfil, clase).then((nota) => {
    pintarNota(nota.puntos);
    if (nota.preguntas[qid] != null) {
      // Ya respondida antes: se muestra resuelta y bloqueada
      bloquear();
      botones[idxCorrecta].classList.add("correcta");
      btnEnviar.textContent = "Respondida";
      feedback(`Ya respondiste esta pregunta: +${nota.preguntas[qid]} punto(s).`, "ok");
    }
  });

  // --- Enviar respuesta ---
  btnEnviar.addEventListener("click", async () => {
    if (bloqueada || seleccion < 0) return;

    if (seleccion === idxCorrecta) {
      const puntos = intento === 0 ? 1 : 0.5;
      bloquear();
      botones[idxCorrecta].classList.add("correcta");
      btnEnviar.textContent = "Respondida";
      feedback(
        intento === 0
          ? "¡Correcta! +1 punto para tu nota."
          : "¡Correcta al segundo intento! +0.5 punto para tu nota.",
        "ok"
      );
      notify(`+${puntos} punto${puntos === 1 ? "" : "s"} en esta pregunta`, "success", 3000);
      const nota = await sumarPuntos(perfil, clase, qid, puntos);
      pintarNota(nota.puntos);
      return;
    }

    // Respuesta incorrecta
    botones[seleccion].classList.remove("seleccionada");
    botones[seleccion].classList.add("erronea");
    botones[seleccion].disabled = true;
    seleccion = -1;
    btnEnviar.disabled = true;
    intento++;

    if (intento === 1) {
      feedback("No es correcta. Tienes una segunda oportunidad: si aciertas sumarás medio punto.", "aviso");
    } else {
      bloquear();
      botones[idxCorrecta].classList.add("correcta");
      btnEnviar.textContent = "Sin más intentos";
      feedback("Incorrecta otra vez. Esta pregunta no suma puntos esta vez; podrás intentarlo de nuevo en otra sesión.", "mal");
    }
  });

  contenedor.append(caja);
  return caja;
}