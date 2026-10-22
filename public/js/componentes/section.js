// ============================================================
// section.js — SECCIONES / LÁMINAS con flechas para avanzar y regresar
// (js/componentes/section.js) · v4
//
// ─── NUEVO v4 · REGLA DEL DOCUMENTO CORRIDO ───
//   · Con UNA sola lámina: NO hay flechas ni paginación — el
//     contenido queda como un DOCUMENTO CORRIDO (todo a la vista).
//   · Con DOS o más: se ve UNA a la vez y se avanza con
//     «Siguiente →» (y «← Anterior» para regresar), con contador.
//   · Esta regla vale igual en el editor «Crear» y en el código
//     generado: el documento se comporta SIEMPRE igual.
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
// ─── NUEVO v3 · flechas según la POSICIÓN (defecto) ───
//   · Las láminas comparten el MISMO ANCHO estándar (el ancho del
//     bloque) y SOLO se ve una: las demás quedan escondidas.
//   · La PRIMERA lámina muestra SOLO la flecha Siguiente →.
//   · Las INTERMEDIAS muestran AMBAS flechas (← Anterior y →).
//   · La ÚLTIMA muestra SOLO ← Anterior (ya no existe Siguiente).
//
// ─── Opcional · modo LECTURA (avance: "lectura") ───
//   · La flecha Siguiente → NO se ve de entrada: APARECE cuando se
//     TERMINA de leer la lámina (al llegar con el scroll al final de
//     su contenido). Entra con una animación suavecita.
//   · Si la lámina es corta y entra completa en pantalla, la flecha
//     aparece de inmediato.
//   · En la ÚLTIMA lámina jamás hay Siguiente (solo Anterior).
//   · Una lámina terminada QUEDA terminada: al volver, la flecha ya
//     está (no vuelve a exigir el scroll).
//   · (La v1 de flechas fijas se obtiene con avance: "libre": todas
//     visibles, apagadas en los extremos.)
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
//   avance            "estandar" (DEFECTO, v3): flechas según la
//                     posición — primera: solo Siguiente · intermedias:
//                     ambas · última: solo Anterior.
//                     "lectura": la flecha Siguiente aparece al
//                     terminar de leer cada lámina (ver arriba).
//                     "libre": todas las flechas visibles, apagadas
//                     en los extremos (como la v1).
//   desplazar         true (defecto en lectura): al cambiar de lámina
//                     la página se desliza hasta ella (solo si hace
//                     falta, con margen para la userbar). false → no
//                     desplaza.
//   mostrarContador   true (defecto) → "2 / 5" entre las flechas.
//   formatoContador   (i, n) => texto. Defecto: `${i} / ${n}`.
//   etiquetaAnterior  Defecto "Anterior".  etiquetaSiguiente: "Siguiente".
//   posicionFlechas   "abajo" (defecto) | "arriba".
//   circular          true → al final se vuelve al inicio (y viceversa).
//                     SOLO funciona con avance: "libre" (en lectura la
//                     última lámina nunca tiene Siguiente). Defecto false.
//   tarjeta           true → cada lámina dentro de una tarjeta con
//                     borde y sombra (look de diapositiva). Defecto
//                     false: flujo del documento, sin caja.
//   alto              Alto de las láminas (número px o CSS "320px"):
//                     se aplica como ALTO MÍNIMO para que todas luzcan
//                     parejas. Defecto: el alto de cada contenido.
//   teclado           true → las flechas ←/→ del teclado navegan
//                     (en lectura, → solo funciona si la lámina ya se
//                     terminó de leer; ignora teclas cuando se escribe
//                     en un campo). Defecto false.
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
//   .terminada(i)   v2: true si la lámina i ya se terminó de leer
//                   (sin argumento = la visible). En modo "libre"
//                   siempre true.
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
//     // avance: "libre",     // flechas fijas (comportamiento v1)
//     // tarjeta: true, teclado: true, alto: 320,
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
      /* margen para la userbar fija al deslizar hasta la lámina */
      scroll-margin-top: 4.6rem;
    }
    .comp-seccion[hidden] { display: none; }
    .comp-seccion.comp-seccion-animada {
      animation: comp-seccion-entrar .3s ease both;
    }
    @keyframes comp-seccion-entrar {
      from { opacity: 0; transform: translateY(7px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    /* Punto invisible al FINAL de cada lámina: cuando entra en
       pantalla, la lámina se da por leída (modo lectura) */
    .comp-seccion-fin {
      display: block;
      height: 1px;
      width: 100%;
      margin: 0;
      padding: 0;
      border: 0;
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

  // v3: modo de avance. "estandar" (defecto) = flechas por posición
  // (primera: solo Siguiente · intermedias: ambas · última: solo
  // Anterior); "lectura" = Siguiente al terminar de leer; "libre" =
  // flechas fijas de la v1. Circular solo en estandar/libre.
  const lectura = (opc.avance ?? "estandar") === "lectura";
  const libre = (opc.avance ?? "estandar") === "libre";
  const circularActivo = !!opc.circular && !lectura;

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

  // --- Láminas (+ punto de fin para el modo lectura) ---
  const laminas = lista.map((item) => {
    const lamina = document.createElement("div");
    lamina.className = "comp-seccion";
    lamina.hidden = true;
    lamina.append(construirBloque(item));

    const fin = document.createElement("span");
    fin.className = "comp-seccion-fin";
    fin.setAttribute("aria-hidden", "true");
    lamina.append(fin);

    if (altoCSS) lamina.style.minHeight = altoCSS;
    escenario.append(lamina);
    return lamina;
  });

  const total = laminas.length;

  // v4 - DOCUMENTO CORRIDO: con una sola lamina no hay paginacion
  // (ni flechas, ni ocultar): todo queda a la vista, como un
  // documento continuo. Con 2 o mas se avanza con Siguiente.
  const corrido = total <= 1;
  if (corrido) raiz.classList.add("comp-secciones-corrida");

  let actual = 0;

  // --- Lectura: qué láminas ya se terminaron de leer ---
  const terminadas = new Set();
  let observador = null;

  if (lectura && "IntersectionObserver" in window && total) {
    observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) terminar(Number(entrada.target.__indice));
      });
    });
    laminas.forEach((lamina, i) => {
      const punto = lamina.querySelector(".comp-seccion-fin");
      punto.__indice = i;
      observador.observe(punto);
    });
  } else if (lectura) {
    // Sin IntersectionObserver (navegador viejo): no exigir scroll
    for (let i = 0; i < total; i++) terminadas.add(i);
  }

  const terminar = (i) => {
    if (i == null || Number.isNaN(i) || i < 0 || i >= total) return;
    if (terminadas.has(i)) return;
    terminadas.add(i);
    if (i === actual) refrescarNav(); // aparece la flecha si es la visible
  };

  const animar = (lamina) => {
    lamina.classList.remove("comp-seccion-animada");
    void lamina.offsetWidth; // reinicia la animación
    lamina.classList.add("comp-seccion-animada");
  };

  // v2: al cambiar de lámina, deslizar la página hasta ella (solo si
  // hace falta: si ya se ve completa, no molesta).
  const desplazarHasta = (lamina) => {
    if (opc.desplazar === false) return;
    let rect;
    try { rect = lamina.getBoundingClientRect(); } catch (e) { return; }
    if (!rect) return;
    const fuera = rect.top < 0 || rect.top > window.innerHeight * 0.55;
    if (!fuera) return;
    try {
      lamina.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      lamina.scrollIntoView();
    }
  };

  const ir = (i) => {
    if (!total) return actual;
    let destino = Number(i) || 0;
    if (circularActivo) {
      destino = ((destino % total) + total) % total;
    } else {
      destino = Math.max(0, Math.min(total - 1, destino));
    }
    if (destino === actual && !laminas[actual].hidden) return actual;
    laminas.forEach((l, k) => { l.hidden = k !== destino; });
    actual = destino;
    animar(laminas[actual]);
    refrescarNav();
    if (lectura) desplazarHasta(laminas[actual]);
    if (typeof opc.alCambiar === "function") opc.alCambiar(actual, laminas[actual]);
    return actual;
  };

  // --- Flechas ---
  let nav = null;
  const refrescarNav = () => {
    if (!nav) return;
    if (lectura) {
      // v3 — igual regla de posición: en la 1.ª no se ve Anterior.
      nav.setPuedeAnterior(true);
      nav.setPuedeSiguiente(true);
      nav.mostrarAnterior(actual > 0);
      // → Siguiente: SOLO existe si hay lámina siguiente Y esta ya
      // se terminó de leer. En la ÚLTIMA lámina jamás aparece.
      nav.mostrarSiguiente(actual < total - 1 && terminadas.has(actual));
    } else if (libre) {
      // v1 — flechas siempre visibles, solo apagadas en los extremos.
      nav.setPuedeAnterior(circularActivo ? total > 1 : actual > 0);
      nav.setPuedeSiguiente(circularActivo ? total > 1 : actual < total - 1);
      nav.mostrarAnterior(true);
      nav.mostrarSiguiente(true);
    } else if (circularActivo) {
      nav.setPuedeAnterior(true);
      nav.setPuedeSiguiente(true);
      nav.mostrarAnterior(total > 1);
      nav.mostrarSiguiente(total > 1);
    } else {
      // v3 — por posición: PRIMERA → solo Siguiente · INTERMEDIAS →
      // ambas · ÚLTIMA → solo Anterior.
      nav.setPuedeAnterior(true);
      nav.setPuedeSiguiente(true);
      nav.mostrarAnterior(actual > 0);
      nav.mostrarSiguiente(actual < total - 1);
    }
    if (opc.mostrarContador !== false && total) {
      const texto = typeof opc.formatoContador === "function"
        ? opc.formatoContador(actual + 1, total)
        : `${actual + 1} / ${total}`;
      nav.setTexto(texto);
    } else {
      nav.setTexto("");
    }
  };

  if (opc.flechas !== false && total > 1) {
    nav = crearFlechas({
      alAnterior: () => ir(actual - 1),
      alSiguiente: () => ir(actual + 1),
      etiquetaAnterior: opc.etiquetaAnterior ?? "Anterior",
      etiquetaSiguiente: opc.etiquetaSiguiente ?? "Siguiente",
    });
    if ((opc.posicionFlechas || "abajo") === "arriba") raiz.prepend(nav);
    else raiz.append(nav);
  }

  // --- Teclado (opcional): ← / → navegan si no se está escribiendo.
  //     En lectura, → solo pasa si la lámina ya se terminó. ---
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
      else if ((circularActivo || libre || actual < total - 1) && (!lectura || terminadas.has(actual))) {
        ir(actual + 1); e.preventDefault();
      }
    });
  }

  // --- API pública ---
  raiz.ir = ir;
  raiz.siguiente = () => ir(actual + 1);
  raiz.anterior = () => ir(actual - 1);
  Object.defineProperty(raiz, "actual", { get: () => actual });
  Object.defineProperty(raiz, "total", { get: () => total });
  raiz.lamina = (i) => laminas[i] || null;
  raiz.terminada = (i) => {
    if (!lectura) return true;
    const indice = i == null ? actual : Number(i);
    return terminadas.has(indice);
  };
  raiz.nav = nav;

  // Estado inicial (sin animación de entrada ni desplazamiento).
  // v4: en documento corrido NADA se oculta — la lámina queda
  // siempre a la vista.
  if (total && !corrido) {
    const inicial = circularActivo
      ? ((Number(opc.inicio) || 0) % total + total) % total
      : Math.max(0, Math.min(total - 1, Number(opc.inicio) || 0));
    laminas.forEach((l, k) => { l.hidden = k !== inicial; });
    actual = inicial;
    laminas[actual].hidden = false;
  } else if (total) {
    laminas.forEach((l) => { l.hidden = false; });
    actual = 0;
  }
  refrescarNav();

  aplicarAncho(raiz, opc.ancho);
  aplicarTamano(raiz, opc.tamano);

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(raiz);
  }
  return raiz;
}
