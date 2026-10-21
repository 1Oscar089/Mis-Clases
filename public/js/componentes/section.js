// ============================================================
// section.js — SECCIONES / LÁMINAS con flechas para avanzar y regresar
// (js/componentes/section.js) · v1
//
// Divide el contenido de la clase en LÁMINAS: se ve UNA a la vez y
// abajo (o arriba) van las flechas ← Anterior / Siguiente → con el
// contador "1 / 5". Ideal para explicar por partes sin tirar todo
// el texto de golpe.
//
//   ┌────────────────────────────────┐
//   │  (contenido de la lámina)      │
//   └────────────────────────────────┘
//   ← Anterior        2 / 5         Siguiente →
//
// Cada lámina acepta LO QUE SEA, mezclado libremente:
//   · "texto con **formato** y $fórmulas$"   → un párrafo
//   · un HTMLElement ya creado (crearLista, crearImagen, utils…)
//   · { titulo: "Título", texto: "…" }       → título + párrafo
//   · { titulo: "Título", items: [ …mezcla… ] } → título + bloques
//   · una LISTA de todo lo anterior           → varios bloques
//   · { parrafo: "…" } (alias de texto), { contenido: … } (alias)
//
// ─── PARÁMETROS (crearSecciones({ … })) ───
//   secciones         Lista de láminas (ver arriba). Obligatorio.
//   inicio            Índice de la lámina inicial (defecto 0).
//   flechas           true (defecto) dibuja la navegación. Con false
//                     no hay flechas: navega tú con .ir()/.siguiente().
//   mostrarContador   true (defecto) → "2 / 5" entre las flechas.
//   formatoContador   (i, n) => texto. Defecto: `${i} / ${n}`.
//   etiquetaAnterior  Defecto "Anterior".  etiquetaSiguiente: "Siguiente".
//   posicionFlechas   "abajo" (defecto) | "arriba".
//   circular          true → al final se vuelve al inicio (y viceversa).
//                     Defecto false: en los extremos la flecha se apaga.
//   tarjeta           true → cada lámina dentro de una tarjeta con
//                     borde y sombra (look de diapositiva). Defecto
//                     false: flujo del documento, sin caja.
//   alto              Alto de las láminas (número px o CSS "320px"):
//                     se aplica como ALTO MÍNIMO para que todas luzcan
//                     parejas. Defecto: el alto de cada contenido.
//   teclado           true → las flechas ←/→ del teclado navegan
//                     (ignora teclas cuando se escribe en un campo).
//                     Defecto false (por si hay varias en la página).
//   alCambiar         (indice, elementoLamina) → se llama en cada cambio.
//   ancho             Ancho del bloque: número, fracción 0..1 o CSS.
//                     Sin ancho → bloque entero.
//   tamano            Tamaño del texto (número px / CSS).
//   contenedor        Si se pasa, las secciones se agregan ahí.
//
// ─── DEVUELVE ─── el bloque <section class="comp-secciones"> con:
//   .ir(i)          va a la lámina i (1.ª = 0)
//   .siguiente() / .anterior()
//   .actual         índice de la lámina visible (getter)
//   .total          cuántas láminas hay
//   .lamina(i)      el elemento de la lámina i (por si quieres tocarlo)
//   .nav            la barra de flechas (métodos de flechas.js)
//
// USO:
//   import { crearSecciones } from "../../../js/componentes/section.js";
//   crearSecciones({
//     contenedor: zona,
//     secciones: [
//       { titulo: "¿Qué es un ángulo?",
//         texto: "Dos **rectas** que se cortan… y $\\alpha$ lo mide." },
//       [ "Primero veamos el **transportador**.", imagenEl ],
//       { titulo: "Practiquemos", items: [ listaEl, "¡Tú puedes!" ] },
//     ],
//     alCambiar: (i) => console.log("Lámina", i + 1),
//   });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";
import { crearFlechas } from "./flechas.js";

function estilos() {
  inyectarEstilos(
    "comp-secciones-estilos",
    `
    .comp-secciones {
      margin: 1.1rem 0;
      font-family: system-ui, sans-serif;
      max-width: 100%;
    }
    .comp-secciones-escenario {
      position: relative;
      max-width: 100%;
    }
    .comp-seccion {
      font-size: .98rem;
      line-height: 1.65;
      color: #374151;
    }
    .comp-seccion[hidden] { display: none; }
    .comp-seccion.comp-seccion-animada {
      animation: comp-seccion-entrar .3s ease both;
    }
    @keyframes comp-seccion-entrar {
      from { opacity: 0; transform: translateY(7px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Look de diapositiva (tarjeta: true) */
    .comp-secciones.comp-secciones-tarjeta .comp-seccion {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 1.1rem;
      padding: 1.15rem 1.25rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      box-sizing: border-box;
    }

    /* Título interno de la lámina (no es un heading del documento:
       es el rótulo de la diapositiva) */
    .comp-seccion-titulo {
      font-weight: 800;
      font-size: 1.12rem;
      color: #1f2937;
      margin: 0 0 .55rem;
      line-height: 1.35;
    }
    .comp-seccion-bloque { margin: 0 0 .6rem; }
    .comp-seccion-bloque:last-child { margin-bottom: 0; }
    .comp-seccion > *:first-child { margin-top: 0; }
  `
  );
}

/* ---------- Constructor de bloques (string | el | objeto | lista) ---------- */

function construirBloque(item) {
  // Texto plano con formato → párrafo de la lámina
  if (item == null || typeof item !== "object") {
    const div = document.createElement("div");
    div.className = "comp-seccion-bloque";
    aplicarFormato(div, String(item ?? ""));
    return div;
  }

  // Elemento ya construido → tal cual
  if (item instanceof HTMLElement) return item;

  // Lista → varios bloques seguidos
  if (Array.isArray(item)) {
    const frag = document.createDocumentFragment();
    item.forEach((sub) => frag.append(construirBloque(sub)));
    return frag;
  }

  const frag = document.createDocumentFragment();

  // { titulo } → rótulo de la lámina
  const titulo = item.titulo ?? item.subtitulo;
  if (titulo) {
    const t = document.createElement("div");
    t.className = "comp-seccion-titulo";
    aplicarFormato(t, String(titulo));
    frag.append(t);
  }

  // { texto | parrafo | contenido | items }
  const cuerpo = item.texto ?? item.parrafo ?? item.contenido;
  if (cuerpo != null) frag.append(construirBloque(cuerpo));
  if (Array.isArray(item.items)) item.items.forEach((sub) => frag.append(construirBloque(sub)));

  return frag;
}

/* ---------------- Componente ---------------- */

export function crearSecciones(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const lista = Array.isArray(opc.secciones)
    ? opc.secciones
    : opc.secciones != null
      ? [opc.secciones]
      : [];

  const raiz = document.createElement("section");
  raiz.className = "comp-secciones";
  if (opc.tarjeta) raiz.classList.add("comp-secciones-tarjeta");

  const escenario = document.createElement("div");
  escenario.className = "comp-secciones-escenario";
  raiz.append(escenario);

  // Alto mínimo parejo (opcional)
  const altoCSS =
    typeof opc.alto === "number" && Number.isFinite(opc.alto) && opc.alto > 0
      ? opc.alto + "px"
      : opc.alto
        ? String(opc.alto)
        : null;

  // --- Láminas ---
  const laminas = lista.map((item) => {
    const lamina = document.createElement("div");
    lamina.className = "comp-seccion";
    lamina.hidden = true;
    lamina.append(construirBloque(item));
    if (altoCSS) lamina.style.minHeight = altoCSS;
    escenario.append(lamina);
    return lamina;
  });

  const total = laminas.length;
  let actual = 0;

  const animar = (lamina) => {
    lamina.classList.remove("comp-seccion-animada");
    void lamina.offsetWidth; // reinicia la animación
    lamina.classList.add("comp-seccion-animada");
  };

  const ir = (i) => {
    if (!total) return actual;
    let destino = Number(i) || 0;
    if (opc.circular) {
      destino = ((destino % total) + total) % total;
    } else {
      destino = Math.max(0, Math.min(total - 1, destino));
    }
    if (destino === actual && !laminas[actual].hidden) return actual;
    laminas.forEach((l, k) => { l.hidden = k !== destino; });
    actual = destino;
    animar(laminas[actual]);
    refrescarNav();
    if (typeof opc.alCambiar === "function") opc.alCambiar(actual, laminas[actual]);
    return actual;
  };

  // --- Flechas ---
  let nav = null;
  const refrescarNav = () => {
    if (!nav) return;
    nav.setPuedeAnterior(opc.circular ? total > 1 : actual > 0);
    nav.setPuedeSiguiente(opc.circular ? total > 1 : actual < total - 1);
    if (opc.mostrarContador !== false && total) {
      const texto = typeof opc.formatoContador === "function"
        ? opc.formatoContador(actual + 1, total)
        : `${actual + 1} / ${total}`;
      nav.setTexto(texto);
    } else {
      nav.setTexto("");
    }
  };

  if (opc.flechas !== false && total > 0) {
    nav = crearFlechas({
      alAnterior: () => ir(actual - 1),
      alSiguiente: () => ir(actual + 1),
      etiquetaAnterior: opc.etiquetaAnterior ?? "Anterior",
      etiquetaSiguiente: opc.etiquetaSiguiente ?? "Siguiente",
    });
    if ((opc.posicionFlechas || "abajo") === "arriba") raiz.prepend(nav);
    else raiz.append(nav);
  }

  // --- Teclado (opcional): ← / → navegan si no se está escribiendo ---
  if (opc.teclado) {
    const esCampo = (el) =>
      el instanceof HTMLElement &&
      (el.isContentEditable ||
        /^(input|textarea|select)$/i.test(el.tagName) ||
        el.tagName === "MATH-FIELD" ||
        el.closest("input, textarea, select, math-field, [contenteditable='true'], sl-input, sl-select, sl-textarea"));
    document.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (esCampo(e.target)) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (!raiz.isConnected) return;
      if (e.key === "ArrowLeft") { ir(actual - 1); e.preventDefault(); }
      else { ir(actual + 1); e.preventDefault(); }
    });
  }

  // --- API pública ---
  raiz.ir = ir;
  raiz.siguiente = () => ir(actual + 1);
  raiz.anterior = () => ir(actual - 1);
  Object.defineProperty(raiz, "actual", { get: () => actual });
  Object.defineProperty(raiz, "total", { get: () => total });
  raiz.lamina = (i) => laminas[i] || null;
  raiz.nav = nav;

  // Estado inicial
  if (total) {
    const inicial = opc.circular
      ? ((Number(opc.inicio) || 0) % total + total) % total
      : Math.max(0, Math.min(total - 1, Number(opc.inicio) || 0));
    laminas.forEach((l, k) => { l.hidden = k !== inicial; });
    actual = inicial;
    laminas[actual].hidden = false;
  }
  refrescarNav();

  aplicarAncho(raiz, opc.ancho);
  aplicarTamano(raiz, opc.tamano);

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(raiz);
  }
  return raiz;
}