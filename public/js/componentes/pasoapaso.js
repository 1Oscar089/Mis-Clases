// ============================================================
// pasoapaso.js — PASO A PASO para resolver un ejercicio
// (js/componentes/pasoapaso.js) · v1
//
// Muestra los pasos de una solución UNO A UNO, en orden: al montar
// se ve solo el paso 1 y un botón **Continuar**; cada clic revela el
// siguiente paso (con su numeración 1, 2, 3…) hasta completar todos.
//
//   ①  Plantea la ecuación…        ← visible al montar
//   ②  Despeja la incógnita…       ← aparece al pulsar Continuar
//   ③  Sustituye y calcula…        ← aparece al pulsar Continuar
//   ────────────────────────────────────
//   Paso 2 de 3                [ Continuar → ]
//
// Cada paso acepta LO QUE SEA, mezclado libremente:
//   · "texto con **formato** y $fórmulas$"   → un párrafo
//   · un HTMLElement ya creado (crearLista, crearFormula, utils…)
//   · { titulo: "Paso título", texto: "…" }  → título + texto
//   · { titulo: "…", items: [ …mezcla… ] }    → título + bloques
//   · una LISTA de todo lo anterior           → varios bloques
//   · { parrafo: "…" } (alias de texto), { contenido: … } (alias)
//
// ─── PARÁMETROS (crearPasoAPaso({ … })) ───
//   pasos            Lista de pasos (ver arriba). Obligatorio.
//   textoBoton       Texto del botón (defecto "Continuar").
//   textoFinal       Texto del botón al completar (defecto "¡Listo!").
//   botonFinal       Al terminar: "deshabilitar" (defecto, se ve el
//                    botón apagado) u "ocultar" (desaparece).
//   mensajeFinal     Texto o HTMLElement que aparece debajo cuando se
//                    completan todos los pasos (la conclusión, el
//                    resultado final…). Sin él, no aparece nada.
//   mostrarNumeros   true (defecto) → círculos numerados ①②③.
//   mostrarProgreso  true (defecto) → "Paso 2 de 3" junto al botón.
//   alPaso           (indice) → cada vez que se revela un paso.
//   alTerminar       () → cuando se revela el ÚLTIMO paso (buen lugar
//                    para sumarPuntaje si lo usas como actividad).
//   desplazar        true (defecto): al revelar un paso, la página se
//                    desliza suavecito hasta él (solo si hace falta).
//   ancho            Ancho del bloque: número, fracción 0..1 o CSS.
//                    Sin ancho → bloque entero.
//   tamano           Tamaño del texto (número px / CSS).
//   contenedor       Si se pasa, el paso a paso se agrega ahí.
//
// ─── DEVUELVE ─── el bloque <div class="comp-pasos"> con:
//   .revelarSiguiente()   igual que pulsar Continuar
//   .revelarTodo()        revela TODOS los pasos de una vez
//   .reiniciar()          vuelve al inicio (solo el paso 1 visible)
//   .actual               índice del último paso revelado (getter)
//   .total                cuántos pasos hay
//   .paso(i)              el elemento del paso i
//   .completo             true si ya se revelaron todos (getter)
//
// USO:
//   import { crearPasoAPaso } from "../../../js/componentes/pasoapaso.js";
//   crearPasoAPaso({
//     contenedor: zona,
//     pasos: [
//       "Planteamos la **suma**: $3 + x = 7$.",
//       { titulo: "Despejamos", texto: "Restamos 3 en los dos lados: $x = 7 - 3$." },
//       { titulo: "Resultado", items: [ "Por lo tanto $x = 4$." ] },
//     ],
//     mensajeFinal: "**¡Bien!** Compruébalo: $3 + 4 = 7$ ✓",
//     alTerminar: () => sumarPuntaje(1),
//   });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

function estilos() {
  inyectarEstilos(
    "comp-pasos-estilos",
    `
    .comp-pasos {
      margin: 1.1rem 0;
      font-family: system-ui, sans-serif;
      max-width: 100%;
    }
    .comp-pasos-lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: .8rem;
    }
    .comp-paso {
      display: flex;
      align-items: flex-start;
      gap: .75rem;
      font-size: .98rem;
      line-height: 1.65;
      color: #374151;
    }
    .comp-paso[hidden] { display: none; }
    .comp-paso.comp-paso-animado { animation: comp-paso-entrar .35s ease both; }
    @keyframes comp-paso-entrar {
      from { opacity: 0; transform: translateY(7px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .comp-paso-num {
      flex: none;
      width: 1.7rem;
      height: 1.7rem;
      border-radius: 999px;
      background: #f3e8ff;
      color: #7c3aed;
      font-weight: 800;
      font-size: .88rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: .1rem;
      user-select: none;
    }
    .comp-paso-cuerpo { flex: 1; min-width: 0; }
    .comp-paso-titulo {
      font-weight: 800;
      color: #1f2937;
      margin: 0 0 .2rem;
      line-height: 1.35;
    }
    .comp-paso-bloque { margin: 0 0 .55rem; }
    .comp-paso-bloque:last-child { margin-bottom: 0; }

    /* Mensaje final (conclusión / resultado) */
    .comp-pasos-final {
      margin: .9rem 0 0;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 1rem;
      padding: .85rem 1rem;
      color: #14532d;
      font-size: .98rem;
      line-height: 1.6;
    }
    .comp-pasos-final[hidden] { display: none; }

    /* Pie: progreso + botón Continuar */
    .comp-pasos-pie {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .comp-pasos-progreso {
      font-size: .84rem;
      font-weight: 700;
      color: #6b7280;
    }
    .comp-pasos-progreso.ok { color: #16a34a; }

    .comp-pasos-btn {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      font-family: inherit;
      background: #7c3aed;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .58rem 1.25rem;
      font-size: .9rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(124, 58, 237, .28);
      transition: background .15s ease, transform .1s ease, box-shadow .15s ease;
    }
    .comp-pasos-btn:hover:not(:disabled) { background: #6d28d9; }
    .comp-pasos-btn:active:not(:disabled) { transform: scale(.97); }
    .comp-pasos-btn:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
    }
    .comp-pasos-btn[hidden] { display: none; }
    .comp-pasos-flecha { font-size: 1.1em; font-weight: 800; line-height: 1; }

    @media (max-width: 575px) {
      .comp-pasos-pie { flex-direction: column-reverse; align-items: stretch; }
      .comp-pasos-btn { justify-content: center; }
    }
  `
  );
}

/* ---------- Constructor del cuerpo de un paso (mismo criterio que section.js) ---------- */

function construirCuerpo(item) {
  if (item == null || typeof item !== "object") {
    const div = document.createElement("div");
    div.className = "comp-paso-bloque";
    aplicarFormato(div, String(item ?? ""));
    return div;
  }
  if (item instanceof HTMLElement) return item;
  if (Array.isArray(item)) {
    const frag = document.createDocumentFragment();
    item.forEach((sub) => frag.append(construirCuerpo(sub)));
    return frag;
  }

  const frag = document.createDocumentFragment();
  const titulo = item.titulo ?? item.subtitulo;
  if (titulo) {
    const t = document.createElement("div");
    t.className = "comp-paso-titulo";
    aplicarFormato(t, String(titulo));
    frag.append(t);
  }
  const cuerpo = item.texto ?? item.parrafo ?? item.contenido;
  if (cuerpo != null) frag.append(construirCuerpo(cuerpo));
  if (Array.isArray(item.items)) item.items.forEach((sub) => frag.append(construirCuerpo(sub)));
  return frag;
}

/* ---------------- Componente ---------------- */

export function crearPasoAPaso(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const lista = Array.isArray(opc.pasos)
    ? opc.pasos
    : opc.pasos != null
      ? [opc.pasos]
      : [];

  const total = lista.length;
  const botonFinal = opc.botonFinal === "ocultar" ? "ocultar" : "deshabilitar";
  let actual = -1;      // índice del último paso revelado (-1 = ninguno)
  let terminado = false;

  const raiz = document.createElement("div");
  raiz.className = "comp-pasos";

  const listaEl = document.createElement("ol");
  listaEl.className = "comp-pasos-lista";
  raiz.append(listaEl);

  // --- Pasos (todos construidos; se van REVELANDO) ---
  const pasos = lista.map((item, i) => {
    const li = document.createElement("li");
    li.className = "comp-paso";
    li.hidden = true;

    if (opc.mostrarNumeros !== false) {
      const num = document.createElement("span");
      num.className = "comp-paso-num";
      num.textContent = String(i + 1);
      num.setAttribute("aria-hidden", "true");
      li.append(num);
    }

    const cuerpo = document.createElement("div");
    cuerpo.className = "comp-paso-cuerpo";
    cuerpo.append(construirCuerpo(item));
    li.append(cuerpo);

    listaEl.append(li);
    return li;
  });

  // --- Mensaje final ---
  let finalEl = null;
  if (opc.mensajeFinal != null) {
    finalEl = document.createElement("div");
    finalEl.className = "comp-pasos-final";
    finalEl.hidden = true;
    if (opc.mensajeFinal instanceof HTMLElement) finalEl.append(opc.mensajeFinal);
    else aplicarFormato(finalEl, String(opc.mensajeFinal));
    raiz.append(finalEl);
  }

  // --- Pie: progreso + botón ---
  const pie = document.createElement("div");
  pie.className = "comp-pasos-pie";
  const progreso = document.createElement("span");
  progreso.className = "comp-pasos-progreso";
  pie.append(progreso);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "comp-pasos-btn";
  const btnTexto = document.createElement("span");
  btnTexto.textContent = opc.textoBoton || "Continuar";
  const btnFlecha = document.createElement("span");
  btnFlecha.className = "comp-pasos-flecha";
  btnFlecha.setAttribute("aria-hidden", "true");
  btnFlecha.textContent = "→";
  btn.append(btnTexto, btnFlecha);
  pie.append(btn);
  raiz.append(pie);

  const pintarProgreso = () => {
    if (opc.mostrarProgreso === false) { progreso.hidden = true; return; }
    if (!total) { progreso.hidden = true; return; }
    progreso.hidden = false;
    if (terminado) {
      progreso.textContent = "¡Completo!";
      progreso.classList.add("ok");
    } else {
      progreso.textContent = `Paso ${actual + 1} de ${total}`;
      progreso.classList.remove("ok");
    }
  };

  const revelar = (i) => {
    if (total && !terminado && i >= 0 && i < total) {
      const li = pasos[i];
      li.hidden = false;
      li.classList.remove("comp-paso-animado");
      void li.offsetWidth; // reinicia la animación
      li.classList.add("comp-paso-animado");
      actual = i;
      if (typeof opc.alPaso === "function") opc.alPaso(i);
      if (opc.desplazar !== false && li.scrollIntoView) {
        try { li.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { /* navegador viejo */ }
      }
      if (actual === total - 1) terminar();
      else pintarProgreso();
    }
  };

  const terminar = () => {
    terminado = true;
    if (finalEl) finalEl.hidden = false;
    if (botonFinal === "ocultar") btn.hidden = true;
    else {
      btn.disabled = true;
      btnTexto.textContent = opc.textoFinal || "¡Listo!";
      btnFlecha.hidden = true;
    }
    pintarProgreso();
    if (typeof opc.alTerminar === "function") opc.alTerminar();
  };

  btn.addEventListener("click", () => revelar(actual + 1));

  // --- API pública ---
  raiz.revelarSiguiente = () => revelar(actual + 1);
  raiz.revelarTodo = () => {
    if (terminado || !total) return;
    while (actual < total - 1) {
      const li = pasos[actual + 1];
      li.hidden = false;
      actual++;
      if (typeof opc.alPaso === "function") opc.alPaso(actual);
    }
    terminar();
  };
  raiz.reiniciar = () => {
    terminado = false;
    actual = -1;
    pasos.forEach((li) => { li.hidden = true; li.classList.remove("comp-paso-animado"); });
    if (finalEl) finalEl.hidden = true;
    btn.hidden = false;
    btn.disabled = false;
    btnTexto.textContent = opc.textoBoton || "Continuar";
    btnFlecha.hidden = false;
    // Como al montar: primer paso visible (y si era el único, terminado)
    if (total) {
      pasos[0].hidden = false;
      actual = 0;
      if (typeof opc.alPaso === "function") opc.alPaso(0);
      if (total === 1) terminar();
      else pintarProgreso();
    }
  };
  Object.defineProperty(raiz, "actual", { get: () => actual });
  Object.defineProperty(raiz, "total", { get: () => total });
  Object.defineProperty(raiz, "completo", { get: () => terminado });
  raiz.paso = (i) => pasos[i] || null;

  // Estado inicial: primer paso visible
  if (total) {
    pasos[0].hidden = false;
    actual = 0;
    if (typeof opc.alPaso === "function") opc.alPaso(0);
    if (total === 1) terminar();
    else pintarProgreso();
  } else {
    pie.hidden = true;
  }

  aplicarAncho(raiz, opc.ancho);
  aplicarTamano(raiz, opc.tamano);

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(raiz);
  }
  return raiz;
}