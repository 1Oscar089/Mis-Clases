// ============================================================
// presentacion.js — PRESENTACIÓN tipo diapositivas + PANTALLA COMPLETA
// (js/utils/presentacion.js) · v1
//
// Crea una PRESENTACIÓN con láminas tipo diapositiva: se ve UNA a la
// vez, con sus flechas ← Anterior / Siguiente → y el contador
// "Lámina 2 de 8". El botón **⛶ Presentar** abre un MODAL a ventana
// completa (fondo oscuro, como la ventana de presentación de
// PowerPoint): la diapositiva se ve grande al centro, con las mismas
// flechas, y además pide la pantalla completa del navegador (si el
// navegador la permite; si no, el modal cubre la ventana igual).
// Se sale con la ✕ o con Esc.
//
//   ┌ Título de la presentación          [ ⛶ Presentar ] ┐
//   │ ┌──────────────────────────────────────────────┐ │
//   │ │           (lámina tipo diapositiva)          │ │
//   │ └──────────────────────────────────────────────┘ │
//   └── ← Anterior     Lámina 2 de 8      Siguiente → ──┘
//
// Cada lámina acepta LO QUE SEA, mezclado libremente:
//   · "texto con **formato** y $fórmulas$"   → un párrafo
//   · un HTMLElement ya creado (crearLista, crearImagen, utils…)
//   · { titulo: "Título", texto: "…" }       → título + párrafo
//   · { titulo: "Título", items: [ …mezcla… ] } → título + bloques
//   · una LISTA de todo lo anterior           → varios bloques
//   · { parrafo: "…" } (alias de texto), { contenido: … } (alias)
//
// ─── PARÁMETROS (crearPresentacion({ … })) ───
//   laminas           Lista de láminas (ver arriba). Obligatorio.
//   titulo            Título arriba a la izquierda (con formato).
//                     Sin título, la cabecera queda limpia.
//   inicio            Índice de la lámina inicial (defecto 0).
//   mostrarBoton      true (defecto) muestra el botón ⛶ Presentar.
//   etiquetaBoton     Texto del botón (defecto "Presentar").
//   mostrarContador   true (defecto) → "Lámina 2 de 8" entre flechas.
//   formatoContador   (i, n) => texto. Defecto: `Lámina ${i} de ${n}`.
//   etiquetaAnterior  Defecto "Anterior".  etiquetaSiguiente: "Siguiente".
//   alCambiar         (indice, elementoLamina) → en cada cambio.
//   alAbrir           () → al abrir la ventana de presentación.
//   alCerrar          () → al cerrarla.
//   ancho             Ancho del bloque: número, fracción 0..1 o CSS.
//                     Sin ancho → bloque entero.
//   tamano            Tamaño del texto (número px / CSS).
//   contenedor        Si se pasa, la presentación se agrega ahí.
//
// ─── DEVUELVE ─── el bloque <section class="utils-presentacion"> con:
//   .presentar()      abre la ventana a pantalla completa (= .abrir())
//   .cerrar()         la cierra
//   .abierto          true si está abierta (getter)
//   .ir(i)            va a la lámina i (1.ª = 0)
//   .siguiente() / .anterior()
//   .actual           índice de la lámina visible (getter)
//   .total            cuántas láminas hay
//   .lamina(i)        el elemento de la lámina i
//   .escenario        la caja de la diapositiva (se muda al modal al
//                     presentar y vuelve al cerrar)
//   .nav              la barra de flechas (métodos de flechas.js)
//   .modal            el modal de pantalla completa (por si quieres
//                     tocar algo puntual)
//
// TECLADO (solo con la ventana abierta): ← → cambian de lámina y
// Esc sale. Haciendo clic en el fondo NO se cierra: solo ✕ o Esc.
//
// USO:
//   import { crearPresentacion } from "../../../js/utils/presentacion.js";
//   const pre = crearPresentacion({
//     contenedor: zona,
//     titulo: "Las fracciones",
//     laminas: [
//       { titulo: "¿Qué es una fracción?",
//         texto: "Una **parte** de un entero: $\\frac{1}{2}$ es la mitad." },
//       [ "El de **arriba** es el numerador…", listaEl ],
//       { titulo: "Practiquemos", items: ["¿Cuánto es $\\frac{2}{4}$?", "¡Tú puedes!"] },
//     ],
//     alCambiar: (i) => console.log("Lámina", i + 1),
//   });
//   // pre.presentar();  ← también puedes abrirla desde tu código
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano } from "../componentes/base.js";
import { aplicarFormato } from "../componentes/formatoTexto.js";
import { crearFlechas } from "../componentes/flechas.js";

function estilos() {
  inyectarEstilos(
    "utils-presentacion-estilos",
    `
    .utils-presentacion {
      margin: 1.2rem 0;
      font-family: system-ui, sans-serif;
      max-width: 100%;
    }

    /* Cabecera: título + botón Presentar */
    .pre-cabecera {
      display: flex;
      align-items: center;
      gap: .8rem;
      flex-wrap: wrap;
      margin-bottom: .7rem;
    }
    .pre-titulo {
      flex: 1 1 auto;
      min-width: 0;
      font-weight: 800;
      font-size: 1.08rem;
      color: #1f2937;
      line-height: 1.35;
    }
    .pre-titulo[hidden] { display: none; }
    .pre-boton-presentar {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      font-family: inherit;
      background: #7c3aed;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .55rem 1.15rem;
      font-size: .88rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(124, 58, 237, .28);
      transition: background .15s ease, transform .1s ease, box-shadow .15s ease;
    }
    .pre-boton-presentar:hover { background: #6d28d9; }
    .pre-boton-presentar:active { transform: scale(.97); }
    .pre-boton-presentar[hidden] { display: none; }
    .pre-boton-presentar svg { flex: none; }

    /* Diapositiva (look de lámina) */
    .pre-escenario {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 1.1rem;
      padding: 1.35rem 1.45rem;
      box-shadow: 0 4px 18px rgba(17, 12, 46, .07);
      box-sizing: border-box;
      max-width: 100%;
    }
    .pre-lamina {
      font-size: .99rem;
      line-height: 1.65;
      color: #374151;
    }
    .pre-lamina[hidden] { display: none; }
    .pre-lamina.pre-lamina-animada { animation: pre-lamina-entrar .3s ease both; }
    @keyframes pre-lamina-entrar {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pre-lamina-titulo {
      font-weight: 800;
      font-size: 1.12rem;
      color: #1f2937;
      margin: 0 0 .55rem;
      line-height: 1.35;
    }
    .pre-bloque { margin: 0 0 .6rem; }
    .pre-bloque:last-child { margin-bottom: 0; }
    .pre-lamina > *:first-child { margin-top: 0; }

    /* ── MODAL a ventana completa (presentación de PowerPoint) ── */
    html.pre-abierto { overflow: hidden !important; }
    .pre-modal {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: radial-gradient(1200px 700px at 50% 38%, #2c2c33, #141418);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.1rem;
      box-sizing: border-box;
    }
    .pre-modal[hidden] { display: none; }
    .pre-modal-caja {
      width: min(1100px, 94vw);
      max-width: 100%;
      display: flex;
      flex-direction: column;
      gap: .9rem;
      animation: pre-modal-entrar .25s ease both;
    }
    @keyframes pre-modal-entrar {
      from { opacity: 0; transform: scale(.97) translateY(8px); }
      to   { opacity: 1; transform: none; }
    }
    .pre-modal .pre-escenario {
      border-color: #4b4b55;
      box-shadow: 0 22px 70px rgba(0, 0, 0, .55);
      max-height: min(72vh, calc(100vh - 250px));
      min-height: 120px;
      overflow: auto;
      overscroll-behavior: contain;
    }
    .pre-modal .comp-flechas { margin: .2rem 0 0; }
    .pre-modal .comp-flechas-texto { color: #d1d5db; }
    .pre-modal-hint {
      text-align: center;
      color: #8b8b96;
      font-size: .8rem;
      font-weight: 600;
    }
    .pre-modal-cerrar {
      position: absolute;
      top: .85rem;
      right: 1rem;
      width: 2.3rem;
      height: 2.3rem;
      border-radius: 999px;
      border: 1px solid #4b4b55;
      background: rgba(255, 255, 255, .08);
      color: #e5e7eb;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background .15s ease, border-color .15s ease, color .15s ease;
    }
    .pre-modal-cerrar:hover {
      background: rgba(255, 255, 255, .16);
      border-color: #7c3aed;
      color: #ffffff;
    }

    @media (max-width: 575px) {
      .pre-modal { padding: .7rem; }
      .pre-modal .pre-escenario {
        max-height: calc(100vh - 235px);
        padding: 1rem;
      }
    }
  `
  );
}

/* ---------- Constructor de bloques (igual criterio que section.js) ---------- */

function construirBloque(item) {
  if (item == null || typeof item !== "object") {
    const div = document.createElement("div");
    div.className = "pre-bloque";
    aplicarFormato(div, String(item ?? ""));
    return div;
  }

  if (item instanceof HTMLElement) return item;

  if (Array.isArray(item)) {
    const frag = document.createDocumentFragment();
    item.forEach((sub) => frag.append(construirBloque(sub)));
    return frag;
  }

  const frag = document.createDocumentFragment();

  const titulo = item.titulo ?? item.subtitulo;
  if (titulo) {
    const t = document.createElement("div");
    t.className = "pre-lamina-titulo";
    aplicarFormato(t, String(titulo));
    frag.append(t);
  }

  const cuerpo = item.texto ?? item.parrafo ?? item.contenido;
  if (cuerpo != null) frag.append(construirBloque(cuerpo));
  if (Array.isArray(item.items)) item.items.forEach((sub) => frag.append(construirBloque(sub)));

  return frag;
}

/** Quita marcas de formato para el aria-label. */
function textoPlano(t) {
  return String(t ?? "").replace(/[*_~`$\\]/g, "").replace(/\s+/g, " ").trim();
}

/* ---------------- Componente ---------------- */

export function crearPresentacion(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const lista = Array.isArray(opc.laminas)
    ? opc.laminas
    : opc.laminas != null
      ? [opc.laminas]
      : [];

  const raiz = document.createElement("section");
  raiz.className = "utils-presentacion";

  /* --- Cabecera: título + botón ⛶ Presentar --- */
  const cabecera = document.createElement("div");
  cabecera.className = "pre-cabecera";

  const tituloEl = document.createElement("div");
  tituloEl.className = "pre-titulo";
  if (opc.titulo != null && opc.titulo !== "") aplicarFormato(tituloEl, String(opc.titulo));
  else tituloEl.hidden = true;

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "pre-boton-presentar";
  boton.innerHTML =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/>' +
    '<path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>' +
    '<span class="pre-boton-texto"></span>';
  boton.querySelector(".pre-boton-texto").textContent = opc.etiquetaBoton ?? "Presentar";
  if (opc.mostrarBoton === false) boton.hidden = true;

  cabecera.append(tituloEl, boton);
  raiz.append(cabecera);

  /* --- Cuerpo inline: la diapositiva + flechas (se mudan al modal) --- */
  const cuerpo = document.createElement("div");
  cuerpo.className = "pre-cuerpo";
  raiz.append(cuerpo);

  const escenario = document.createElement("div");
  escenario.className = "pre-escenario";
  cuerpo.append(escenario);

  const laminas = lista.map((item) => {
    const lamina = document.createElement("div");
    lamina.className = "pre-lamina";
    lamina.hidden = true;
    lamina.append(construirBloque(item));
    escenario.append(lamina);
    return lamina;
  });

  const total = laminas.length;
  let actual = Math.max(0, Math.min(Math.max(total - 1, 0), Number(opc.inicio) || 0));
  let abierto = false;

  const animar = (lamina) => {
    lamina.classList.remove("pre-lamina-animada");
    void lamina.offsetWidth;
    lamina.classList.add("pre-lamina-animada");
  };

  const textoContador = () => {
    if (opc.mostrarContador === false || !total) return "";
    return typeof opc.formatoContador === "function"
      ? opc.formatoContador(actual + 1, total)
      : `Lámina ${actual + 1} de ${total}`;
  };

  // --- Flechas (compartidas por la vista en página y el modal) ---
  let nav = null;
  if (total > 0) {
    nav = crearFlechas({
      alAnterior: () => ir(actual - 1),
      alSiguiente: () => ir(actual + 1),
      etiquetaAnterior: opc.etiquetaAnterior ?? "Anterior",
      etiquetaSiguiente: opc.etiquetaSiguiente ?? "Siguiente",
    });
    cuerpo.append(nav);
  }

  const refrescar = () => {
    if (!nav) return;
    nav.setPuedeAnterior(actual > 0);
    nav.setPuedeSiguiente(actual < total - 1);
    nav.setTexto(textoContador());
  };

  const ir = (i) => {
    if (!total) return actual;
    const destino = Math.max(0, Math.min(total - 1, Number(i) || 0));
    if (destino === actual && !laminas[actual].hidden) return actual;
    laminas.forEach((l, k) => { l.hidden = k !== destino; });
    actual = destino;
    animar(laminas[actual]);
    refrescar();
    if (typeof opc.alCambiar === "function") opc.alCambiar(actual, laminas[actual]);
    return actual;
  };

  /* --- Modal a ventana completa (como PowerPoint) --- */
  const modal = document.createElement("div");
  modal.className = "pre-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", textoPlano(opc.titulo) || "Presentación");
  modal.innerHTML =
    '<button type="button" class="pre-modal-cerrar" aria-label="Cerrar presentación">✕</button>' +
    '<div class="pre-modal-caja">' +
    '<div class="pre-modal-hint">← → para cambiar de lámina · Esc para salir</div>' +
    '</div>';
  if (document.body) document.body.append(modal);
  else document.documentElement.append(modal);

  const caja = modal.querySelector(".pre-modal-caja");
  const hint = modal.querySelector(".pre-modal-hint");
  const botonCerrar = modal.querySelector(".pre-modal-cerrar");

  // Pantalla completa real del navegador (si la permite; si no, el
  // modal cubre la ventana igual y nada se rompe).
  const pantallaCompleta = (entrar) => {
    try {
      if (entrar) {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          const p = document.documentElement.requestFullscreen();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        const p = document.exitFullscreen();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    } catch (e) { /* sin pantalla completa: no pasa nada */ }
  };

  let focoPrevio = null;

  const presentar = () => {
    if (abierto || !total) return;
    abierto = true;
    focoPrevio = document.activeElement;
    hint.before(escenario);       // la diapositiva se muda al modal…
    if (nav) hint.before(nav);    // …con sus flechas
    modal.hidden = false;
    document.documentElement.classList.add("pre-abierto");
    pantallaCompleta(true);
    refrescar();
    try { botonCerrar.focus(); } catch (e) { /* sin foco disponible */ }
    if (typeof opc.alAbrir === "function") opc.alAbrir();
  };

  const cerrar = () => {
    if (!abierto) return;
    abierto = false;
    modal.hidden = true;
    document.documentElement.classList.remove("pre-abierto");
    pantallaCompleta(false);
    cuerpo.append(escenario);     // todo vuelve a la página
    if (nav) cuerpo.append(nav);
    if (focoPrevio && typeof focoPrevio.focus === "function") {
      try { focoPrevio.focus(); } catch (e) { /* sin foco disponible */ }
    }
    if (typeof opc.alCerrar === "function") opc.alCerrar();
  };

  // Teclado SOLO con la ventana abierta: ← → navegan, Esc sale
  document.addEventListener("keydown", (e) => {
    if (!abierto || !modal.isConnected) return;
    const t = e.target;
    if (t instanceof HTMLElement &&
        (t.isContentEditable || /^(input|textarea|select|math-field)$/i.test(t.tagName))) return;
    if (e.key === "Escape") { cerrar(); e.preventDefault(); }
    else if (e.key === "ArrowRight" && actual < total - 1) { ir(actual + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft" && actual > 0) { ir(actual - 1); e.preventDefault(); }
  });

  boton.addEventListener("click", presentar);
  botonCerrar.addEventListener("click", cerrar);

  /* --- API pública --- */
  raiz.presentar = presentar;
  raiz.abrir = presentar;
  raiz.cerrar = cerrar;
  raiz.ir = ir;
  raiz.siguiente = () => ir(actual + 1);
  raiz.anterior = () => ir(actual - 1);
  Object.defineProperty(raiz, "actual", { get: () => actual });
  Object.defineProperty(raiz, "total", { get: () => total });
  Object.defineProperty(raiz, "abierto", { get: () => abierto });
  raiz.lamina = (i) => laminas[i] || null;
  raiz.escenario = escenario;
  raiz.nav = nav;
  raiz.modal = modal;

  // Estado inicial (sin animación)
  laminas.forEach((l, k) => { l.hidden = k !== actual; });
  refrescar();

  aplicarAncho(raiz, opc.ancho);
  aplicarTamano(raiz, opc.tamano);

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(raiz);
  }
  return raiz;
}