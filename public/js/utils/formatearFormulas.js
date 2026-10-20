// ============================================================
// formatearFormulas.js — Fórmulas matemáticas profesionales
// (js/utils/formatearFormulas.js) · v1
//
// Motor de FÓRMULAS del proyecto: permite escribir matemática
// profesional (fracciones, raíces, exponentes, subíndices, π, …) en
// las clases y en TODAS las utils de actividad. Renderiza con KaTeX
// (CDN jsdelivr) — la misma calidad visual de un libro de texto — y
// trae además el TECLADO VIRTUAL de fórmulas que usa respuestaSimple
// cuando la respuesta es una fórmula.
//
// ─── CÓMO SE ESCRIBEN LAS FÓRMULAS (LaTeX, estándar escolar) ───
//   En cualquier texto de una util o de una clase, la parte escrita
//   entre $…$ se muestra como FÓRMULA y el resto como texto normal:
//
//     "$\frac{1}{2}$"        → ½ (fracción)
//     "$\sqrt{2}$"           → √2 (raíz cuadrada)
//     "$\sqrt[3]{8}$"        → ∛8 (raíz enésima)
//     "$x^2 + y^2 = 25$"     → x² + y² = 25 (exponentes)
//     "$a_1 + a_n$"          → a₁ + aₙ (subíndices)
//     "$\pi \approx 3.14$"   → π ≈ 3.14
//     "$$\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$" → fórmula CENTRADA
//
//   · $…$ → fórmula en la línea · $$…$$ → fórmula centrada en bloque.
//   · También se acepta \(…\) como equivalente de $…$.
//   · Para un signo $ LITERAL (dinero), escríbelo como \$ : "Cuesta \$5".
//   · Macros amigables ya incluidos: \sen \tg \N \Z \Q \R.
//   · El texto FUERA de las fórmulas se escapa siempre (no hay riesgo
//     de HTML inyectado); KaTeX corre con trust:false (sin \href…).
//
// ─── API ───
//   await cargarFormulas()
//       Carga KaTeX UNA sola vez (todas las utils lo llaman antes de
//       pintarse). Devuelve true/false (false = CDN sin respuesta →
//       los textos se muestran planos, sin romper nada). Idempotente.
//
//   formatearFormula(latex, { displayMode })
//       → String HTML con la fórmula renderizada. Si KaTeX no cargó,
//         devuelve el LaTeX plano escapado (fallback seguro).
//
//   textoConFormulas(texto, { displayMode })
//       → String HTML del texto completo: escapa todo lo que NO está
//         entre $…$ / $$…$$ / \(…\) y renderiza las fórmulas. Es lo
//         que usan las utils para indicaciones, opciones e ítems.
//
//   normalizarFormula(latex)
//       → String normalizado para COMPARAR respuestas: sin espacios,
//         \dfrac=\tfrac=\frac, coma decimal = punto, × = ·, − = -,
//         √ = \sqrt, \sqrt[2]{x} = \sqrt{x}, x^2 = x^{2}, sin \left
//         \right \displaystyle, sin llaves vacías, etc.
//
//   respuestasEquivalentes(valor, aceptadas)
//       → true si la fórmula del estudiante coincide con ALGUNA de las
//         aceptadas (acepta un string o una lista) tras normalizar.
//
//   crearTecladoFormulas({ alCambiar, valorInicial, etiqueta })
//       → { elemento, obtenerValor(), establecerValor(latex),
//           limpiar(), deshabilitar(bool) }
//       Teclado matemático VIRTUAL: botones de dígitos, variables,
//       operadores y ESTRUCTURAS (fracción, raíz, raíz enésima,
//       exponente, subíndice). La respuesta se arma SOLO con botones
//       (nada de teclado físico: así nadie puede "escribir código").
//       · alCambiar(latex, html) se llama tras cada cambio con el
//         LaTeX resultante y su HTML renderizado (vista previa).
//       · Los huecos por llenar se ven como □ celeste en la vista;
//         el valor real (obtenerValor) no incluye adornos.
//       · ◀ ▶ mueven el cursor entre bloques; ⌫ borra el bloque
//         anterior (una fracción vacía se borra entera); C vacía todo.
//
// USO DESDE UNA CLASE (contenido):
//   import { cargarFormulas, textoConFormulas } from "../../../js/utils/formatearFormulas.js";
//   await cargarFormulas();
//   seccion.innerHTML = textoConFormulas("Resuelve $x^2 = 9$.");
//
// Notas: la librería va FIJADA (katex@0.16.11, jsdelivr) para que un
//   cambio del CDN nunca rompa las clases. El CSS del teclado y de
//   las fórmulas se inyecta aquí (CSS implícito, convención del
//   proyecto). Sin conexión: todo degrada a texto plano legible.
// ============================================================

import { escapeHtml } from "./helpers.js";

/* ---------------- Constantes ---------------- */

const VERSION_KATEX = "0.16.11";
const URL_CSS =
  "https://cdn.jsdelivr.net/npm/katex@" + VERSION_KATEX + "/dist/katex.min.css";
const URL_JS =
  "https://cdn.jsdelivr.net/npm/katex@" + VERSION_KATEX + "/dist/katex.min.js";

// Longitud máxima de una fórmula (protección ante entradas patológicas)
const MAX_LATEX = 600;

// Macros amigables para quien escribe el contenido (español matemático)
const MACROS = {
  "\\sen": "\\operatorname{sen}",
  "\\tg": "\\operatorname{tg}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\Q": "\\mathbb{Q}",
  "\\R": "\\mathbb{R}",
};

// Resguardo interno para el $ literal (\$)
const DOLAR = "\u0000DOLAR\u0000";

// ¿Se está cargando KaTeX? (evita doble <script>)
let cargaEnMarcha = null;
let estilosListos = false;

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "formatear-formulas-estilos";
  estilo.textContent = `
    /* Fórmulas dentro de textos (bloque centrado $$…$$) */
    .ff-display {
      display: block;
      text-align: center;
      margin: .45rem 0;
      overflow-x: auto;
      overflow-y: hidden;
      padding: .1rem 0 .2rem;
    }
    /* Respaldo cuando el CDN no respondió: LaTeX plano, legible */
    .ff-fallback,
    .ff-error {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: .88em;
      word-break: break-word;
    }
    .ff-error { color: #b91c1c; }

    /* Teclado virtual de fórmulas (respuestaSimple con esFormula) */
    .ff-teclado {
      display: flex;
      flex-direction: column;
      gap: .35rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: .9rem;
      padding: .55rem;
      margin-top: .55rem;
      user-select: none;
      -webkit-user-select: none;
    }
    .ff-teclado-fila {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: .35rem;
    }
    .ff-tecla {
      font-family: inherit;
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: .65rem;
      padding: .45rem .15rem;
      min-height: 2.45rem;
      cursor: pointer;
      display: grid;
      place-items: center;
      line-height: 1.1;
      transition: border-color .12s ease, background .12s ease, transform .12s ease;
    }
    .ff-tecla:hover:not(:disabled) { border-color: #0891b2; background: rgba(8, 145, 178, .06); }
    .ff-tecla:active:not(:disabled) { transform: scale(.97); }
    .ff-tecla.accion { background: #f3f4f6; color: #374151; font-weight: 700; }
    .ff-tecla.estructura { background: #ecfeff; color: #0e7490; border-color: #a5f3fc; }
    .ff-tecla.estructura:hover:not(:disabled) { border-color: #0891b2; background: rgba(8, 145, 178, .1); }
    .ff-tecla:disabled { opacity: .45; cursor: not-allowed; }
    .ff-tecla .katex { font-size: .95em; }

    @media (max-width: 767px) {
      .ff-teclado { padding: .45rem; gap: .3rem; }
      .ff-teclado-fila { gap: .3rem; }
      .ff-tecla { min-height: 2.35rem; padding: .4rem .1rem; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Carga de KaTeX (una sola vez) ---------------- */

/**
 * Carga KaTeX (CSS + JS) desde el CDN si aún no está. Idempotente y
 * con reintento si falló antes. Resuelve true si quedó listo.
 */
export function cargarFormulas() {
  if (window.katex) return Promise.resolve(true);
  if (cargaEnMarcha) return cargaEnMarcha;

  cargaEnMarcha = new Promise((resolver) => {
    inyectarEstilos();
    if (!document.querySelector('link[data-mco-katex]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = URL_CSS;
      link.dataset.mcoKatex = "1";
      document.head.append(link);
    }
    const previo = document.querySelector('script[data-mco-katex]');
    if (previo) {
      // Otro módulo ya pidió el script: esperar a que aparezca katex
      const t0 = Date.now();
      const sondear = () => {
        if (window.katex) { resolver(true); return; }
        if (Date.now() - t0 > 10000) { cargaEnMarcha = null; resolver(false); return; }
        setTimeout(sondear, 100);
      };
      sondear();
      return;
    }
    const script = document.createElement("script");
    script.src = URL_JS;
    script.dataset.mcoKatex = "1";
    script.async = true;
    script.onload = () => resolver(!!window.katex);
    script.onerror = () => { cargaEnMarcha = null; resolver(false); };
    document.head.append(script);
  });
  return cargaEnMarcha;
}

/* ---------------- Render de fórmulas ---------------- */

/**
 * Renderiza UNA fórmula LaTeX a HTML. Sin KaTeX (CDN caído) devuelve
 * el LaTeX plano escapado para no romper la página.
 */
export function formatearFormula(latex, opciones = {}) {
  inyectarEstilos();
  const displayMode = !!opciones.displayMode;
  const fuente = String(latex ?? "").trim().slice(0, MAX_LATEX);
  if (!fuente) return "";

  const katex = window.katex;
  if (!katex) {
    return '<span class="ff-fallback">' + escapeHtml(fuente) + "</span>";
  }
  try {
    const html = katex.renderToString(fuente, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,      // sin \href ni HTML embebido: seguro
      output: "html",
      macros: MACROS,
    });
    return displayMode ? '<span class="ff-display">' + html + "</span>" : html;
  } catch (e) {
    return '<span class="ff-error">' + escapeHtml(fuente) + "</span>";
  }
}

/**
 * Texto con fórmulas incrustadas → HTML seguro.
 *   $…$    fórmula en la línea        $$…$$   fórmula centrada
 *   \(…\)  equivalente de $…$         \$      signo $ literal
 * Todo lo demás sale escapado (tal cual lo escribió el docente).
 */
export function textoConFormulas(texto, opciones = {}) {
  const fuente = String(texto ?? "").replace(/\\\$/g, DOLAR);
  if (!fuente) return "";
  const partes = fuente.split(/(\$\$[^$]+\$\$|\$[^$]+\$|\\\([\s\S]*?\\\))/g);
  const salida = partes.map((parte) => {
    if (!parte) return "";
    if (parte.length > 4 && parte.startsWith("$$") && parte.endsWith("$$")) {
      return formatearFormula(parte.slice(2, -2), { ...opciones, displayMode: true });
    }
    if (parte.length > 2 && parte.startsWith("$") && parte.endsWith("$")) {
      return formatearFormula(parte.slice(1, -1), opciones);
    }
    if (parte.startsWith("\\(") && parte.endsWith("\\)") && parte.length > 4) {
      return formatearFormula(parte.slice(2, -2), opciones);
    }
    // Texto normal: restaurar los $ literales y escapar
    return escapeHtml(parte.split(DOLAR).join("$"));
  });
  return salida.join("");
}

/* ---------------- Comparación tolerante de fórmulas ---------------- */

/**
 * Normaliza una fórmula LaTeX para poder COMPARAR respuestas:
 *  · sin espacios                      · \dfrac/\tfrac → \frac
 *  · coma decimal entre dígitos → punto · ×/· → \cdot · − → -
 *  · √ → \sqrt · ÷ → \div              · \left/\right/\displaystyle fuera
 *  · \sqrt[2]{x} → \sqrt{x}            · x^2 → x^{2}  (y subíndices)
 *  · \frac12 → \frac{1}{2}             · macros \sen \N … expandidos
 *  · sin llaves vacías {}              · \textcolor{c} y \square fuera
 */
export function normalizarFormula(latex) {
  let s = String(latex ?? "").trim();

  // Macros propios → su forma expandida (más largos primero)
  Object.keys(MACROS)
    .sort((a, b) => b.length - a.length)
    .forEach((m) => { s = s.split(m).join(MACROS[m]); });

  s = s
    .replace(/\s+/g, "")                            // espacios fuera
    .replace(/\\(dfrac|tfrac)/g, "\\frac")          // variantes de frac
    .replace(/\\times/g, "\\cdot")                  // × LaTeX ≡ · LaTeX
    .replace(/\\left|\\right|\\displaystyle|\\limits/g, "")
    .replace(/\\textcolor\{[^{}]*\}/g, "")          // adornos del teclado
    .replace(/\\square/g, "")
    .replace(/[−–—]/g, "-")                         // minus unicode → -
    .replace(/[×·]/g, "\\cdot")                     // × y · → \cdot
    .replace(/÷/g, "\\div")
    .replace(/√/g, "\\sqrt")
    .replace(/π/g, "\\pi");

  // Coma decimal → punto (1,5 → 1.5); repetir por si hay varios
  let antes = null;
  while (antes !== s) {
    antes = s;
    s = s.replace(/(\d),(\d)/g, "$1.$2");
  }

  // \sqrt[2]{x} → \sqrt{x}   ·   \sqrt2 → \sqrt{2}   ·   \frac12 → \frac{1}{2}
  s = s.replace(/\\sqrt\[2\]/g, "\\sqrt");
  s = s.replace(/\\sqrt(\d|[a-zA-Z])(?![a-zA-Z0-9])/g, "\\sqrt{$1}");
  s = s.replace(/\\frac(\d|[a-zA-Z])(\d|[a-zA-Z])(?![a-zA-Z0-9])/g, "\\frac{$1}{$2}");
  // x^2 → x^{2} · x_1 → x_{1}
  s = s.replace(/\^(\d|[a-zA-Z])(?![a-zA-Z0-9])/g, "^{$1}");
  s = s.replace(/_(\d|[a-zA-Z])(?![a-zA-Z0-9])/g, "_{$1}");
  // Llaves vacías fuera (base {} de un exponente sin operando, huecos…)
  s = s.replace(/\{\}/g, "");

  return s;
}

/**
 * ¿La fórmula del estudiante equivale a ALGUNA de las aceptadas?
 * aceptadas: string o lista de strings en LaTeX.
 */
export function respuestasEquivalentes(valor, aceptadas) {
  const objetivo = normalizarFormula(valor);
  if (!objetivo) return false;
  const lista = Array.isArray(aceptadas) ? aceptadas : [aceptadas];
  return lista.some((a) => {
    const otra = normalizarFormula(a);
    return otra !== "" && otra === objetivo;
  });
}

/* ---------------- Teclado virtual de fórmulas ----------------
   La respuesta se guarda como ÁRBOL de nodos (nunca texto libre):
     · string                    → hoja (dígito, letra, operador…)
     · {t:"frac", a:[], b:[]}    → \frac{a}{b}
     · {t:"sqrt", a:[]}          → \sqrt{a}
     · {t:"root", n:[], a:[]}    → \sqrt[n]{a}
     · {t:"sup",  a:[]}          → ^{a}   (exponente)
     · {t:"sub",  a:[]}          → _{a}   (subíndice)
   El cursor apunta a { cont: arreglo, idx } (posición entre nodos).
   Así ⌫ borra SIEMPRE bloques completos (nunca deja "\frac{ suelto") y
   el LaTeX producido está siempre bien formado. */

const CLAVES = {
  frac: ["a", "b"],
  sqrt: ["a"],
  root: ["n", "a"],
  sup: ["a"],
  sub: ["a"],
};

// Definición de las teclas: [rótulo, token, clase?, latexDelRótulo?]
//   token: texto a insertar · acción especial · estructura a crear
const FILAS = [
  [
    ["7", "7"], ["8", "8"], ["9", "9"], ["÷", "\\div"], ["⌫", "BORRAR", "accion"],
  ],
  [
    ["4", "4"], ["5", "5"], ["6", "6"], ["×", "\\times"], ["C", "LIMPIAR", "accion"],
  ],
  [
    ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+"], ["◀", "IZQ", "accion"],
  ],
  [
    ["0", "0"], [",", ","], [".", "."], ["−", "-"], ["▶", "DER", "accion"],
  ],
  [
    ["(", "("], [")", ")"], ["=", "="], ["<", "<"], [">", ">"],
  ],
  [
    ["≤", "\\leq"], ["≥", "\\geq"], ["≠", "\\neq"], ["π", "\\pi"], ["x", "x"],
  ],
  [
    ["y", "y"], ["z", "z"], ["a", "a"], ["b", "b"], ["n", "n"],
  ],
  [
    ["FRAC", "FRAC", "estructura", "\\frac{\\square}{\\square}"],
    ["SQRT", "SQRT", "estructura", "\\sqrt{\\square}"],
    ["ROOT", "ROOT", "estructura", "\\sqrt[\\square]{\\square}"],
    ["SUP", "SUP", "estructura", "x^{\\square}"],
    ["SUB", "SUB", "estructura", "x_{\\square}"],
  ],
];

const ROTULOS_PLANO = { FRAC: "a/b", SQRT: "√", ROOT: "ⁿ√", SUP: "x^□", SUB: "x_□" };

/**
 * Crea el teclado de fórmulas. Opciones:
 *   alCambiar    (latex, html) → llamado tras cada cambio
 *   valorInicial LaTeX inicial (opcional)
 *   etiqueta     aria-label del grupo (defecto "Teclado de fórmulas")
 * Devuelve { elemento, obtenerValor, establecerValor, limpiar,
 *            deshabilitar }.
 */
export function crearTecladoFormulas(opciones = {}) {
  inyectarEstilos();
  const { alCambiar = null, valorInicial = "", etiqueta = "Teclado de fórmulas" } = opciones;

  const raiz = [];
  let cursor = { cont: raiz, idx: 0 };
  let deshabilitado = false;

  const esNodo = (x) => !!x && typeof x === "object";

  /* --- utilidades de navegación sobre el árbol --- */
  function localizar(arr, cont = raiz) {
    for (let i = 0; i < cont.length; i++) {
      const n = cont[i];
      if (!esNodo(n)) continue;
      for (const clave of CLAVES[n.t]) {
        if (n[clave] === arr) return { cont, idx: i };
        const hallado = localizar(arr, n[clave]);
        if (hallado) return hallado;
      }
    }
    return null;
  }

  function siguiente(cont, idx) {
    if (idx < cont.length) {
      const n = cont[idx];
      if (esNodo(n)) return { cont: n[CLAVES[n.t][0]], idx: 0 };
      return { cont, idx: idx + 1 };
    }
    // Al final de `cont`: si es un slot de una estructura con OTRO slot
    // después (numerador → denominador, índice → radicando…), entrar ahí.
    const loc = localizar(cont);
    if (!loc) return null;
    const nodo = loc.cont[loc.idx];
    const claves = CLAVES[nodo.t];
    const k = claves.findIndex((c) => nodo[c] === cont);
    if (k >= 0 && k < claves.length - 1) {
      const proximo = nodo[claves[k + 1]];
      return { cont: proximo, idx: 0 };
    }
    return siguiente(loc.cont, loc.idx + 1);
  }

  function anterior(cont, idx) {
    if (idx > 0) {
      const n = cont[idx - 1];
      if (esNodo(n)) {
        const claves = CLAVES[n.t];
        const ultimo = n[claves[claves.length - 1]];
        return { cont: ultimo, idx: ultimo.length };
      }
      return { cont, idx: idx - 1 };
    }
    // Al inicio de un slot: si es el 2.º slot de una estructura, volver
    // al FINAL del slot anterior (denominador → numerador).
    const loc = localizar(cont);
    if (!loc) return null;
    const nodo = loc.cont[loc.idx];
    const claves = CLAVES[nodo.t];
    const k = claves.findIndex((c) => nodo[c] === cont);
    if (k > 0) {
      const previo = nodo[claves[k - 1]];
      return { cont: previo, idx: previo.length };
    }
    return { cont: loc.cont, idx: loc.idx };
  }

  /* --- serializar árbol → LaTeX --- */
  function hueco(arr, pantalla) {
    if (arr.length) return serializar(arr, pantalla);
    return pantalla ? "\\textcolor{#0891b2}{\\square}" : "";
  }

  function serializar(cont, pantalla) {
    let salida = "";
    cont.forEach((n, i) => {
      if (!esNodo(n)) { salida += n; return; }
      if (n.t === "frac") salida += "\\frac{" + hueco(n.a, pantalla) + "}{" + hueco(n.b, pantalla) + "}";
      else if (n.t === "sqrt") salida += "\\sqrt{" + hueco(n.a, pantalla) + "}";
      else if (n.t === "root") {
        const indice = n.n.length ? serializar(n.n, pantalla) : pantalla ? "\\square" : "";
        salida += "\\sqrt[" + indice + "]{" + hueco(n.a, pantalla) + "}";
      } else if (n.t === "sup") {
        salida += (i > 0 ? "" : "{}") + "^{" + hueco(n.a, pantalla) + "}";
      } else if (n.t === "sub") {
        salida += (i > 0 ? "" : "{}") + "_{" + hueco(n.a, pantalla) + "}";
      }
    });
    return salida;
  }

  /* --- analizar LaTeX simple → árbol (para establecerValor) --- */
  function analizar(texto) {
    const nodos = [];
    let i = 0;
    const ver = (n) => texto.substr(i, n);

    function grupo() {
      // consume un {…} balanceado y devuelve su contenido
      if (ver(1) !== "{") return null;
      i += 1; // consume la llave inicial
      let prof = 1;
      const t0 = i;
      while (i < texto.length && prof > 0) {
        if (texto[i] === "{") prof++;
        else if (texto[i] === "}") prof--;
        if (prof > 0) i++;
      }
      if (prof !== 0) return null;
      const dentro = texto.slice(t0, i);
      i++; // consume la llave final
      return dentro;
    }

    while (i < texto.length) {
      if (ver(5) === "\\frac") {
        i += 5;
        const a = grupo();
        const b = grupo();
        const nodo = { t: "frac", a: a != null ? analizar(a) : [], b: b != null ? analizar(b) : [] };
        nodos.push(nodo);
        continue;
      }
      if (ver(5) === "\\sqrt") {
        i += 5;
        let n = [];
        if (ver(1) === "[") {
          i++;
          let prof = 1;
          const t0 = i;
          while (i < texto.length && prof > 0) {
            if (texto[i] === "[") prof++;
            else if (texto[i] === "]") prof--;
            if (prof > 0) i++;
          }
          n = analizar(texto.slice(t0, i));
          i++;
        }
        const a = grupo();
        nodos.push({ t: n.length ? "root" : "sqrt", n, a: a != null ? analizar(a) : [] });
        continue;
      }
      if (ver(2) === "^{" || ver(2) === "_{") {
        const t = ver(1) === "^" ? "sup" : "sub";
        i += 1;
        const a = grupo();
        nodos.push({ t, a: a != null ? analizar(a) : [] });
        continue;
      }
      if (ver(1) === "\\") {
        // comando simple (\pi, \leq, …): \ + letras
        let j = i + 1;
        while (j < texto.length && /[a-zA-Z]/.test(texto[j])) j++;
        nodos.push(texto.slice(i, j));
        i = j;
        continue;
      }
      nodos.push(texto[i]);
      i++;
    }
    return nodos;
  }

  /* --- operaciones --- */
  function aviso() {
    const latex = serializar(raiz, false);
    if (alCambiar) alCambiar(latex, formatearFormula(serializar(raiz, true)));
  }

  function insertar(texto) {
    if (deshabilitado) return;
    cursor.cont.splice(cursor.idx, 0, texto);
    cursor.idx++;
    aviso();
  }

  function estructura(tipo) {
    if (deshabilitado) return;
    const nodo = { t: tipo };
    CLAVES[tipo].forEach((k) => { nodo[k] = []; });
    cursor.cont.splice(cursor.idx, 0, nodo);
    cursor = { cont: nodo[CLAVES[tipo][0]], idx: 0 };
    aviso();
  }

  function borrar() {
    if (deshabilitado) return;
    const atras = anterior(cursor.cont, cursor.idx);
    if (!atras) return;
    const n = atras.cont[atras.idx];
    if (esNodo(n)) {
      const vacia = CLAVES[n.t].every((k) => n[k].length === 0);
      if (vacia) {
        atras.cont.splice(atras.idx, 1);
        cursor = { cont: atras.cont, idx: atras.idx };
      } else {
        const claves = CLAVES[n.t];
        const ultimo = n[claves[claves.length - 1]];
        cursor = { cont: ultimo, idx: ultimo.length };
      }
    } else {
      atras.cont.splice(atras.idx, 1);
      cursor = { cont: atras.cont, idx: atras.idx };
    }
    aviso();
  }

  function mover(dir) {
    if (deshabilitado) return;
    const nueva = dir === "izq" ? anterior(cursor.cont, cursor.idx) : siguiente(cursor.cont, cursor.idx);
    if (nueva) cursor = nueva;
    aviso();
  }

  function limpiar() {
    if (deshabilitado) return;
    raiz.length = 0;
    cursor = { cont: raiz, idx: 0 };
    aviso();
  }

  /* --- UI del teclado --- */
  const elemento = document.createElement("div");
  elemento.className = "ff-teclado";
  elemento.setAttribute("role", "group");
  elemento.setAttribute("aria-label", etiqueta);

  const acciones = {
    BORRAR: () => borrar(),
    LIMPIAR: () => limpiar(),
    IZQ: () => mover("izq"),
    DER: () => mover("der"),
    FRAC: () => estructura("frac"),
    SQRT: () => estructura("sqrt"),
    ROOT: () => estructura("root"),
    SUP: () => estructura("sup"),
    SUB: () => estructura("sub"),
  };

  const botones = [];
  FILAS.forEach((fila) => {
    const filaEl = document.createElement("div");
    filaEl.className = "ff-teclado-fila";
    fila.forEach(([rotulo, token, clase, latexRotulo]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ff-tecla" + (clase ? " " + clase : "");
      b.dataset.tecla = token;
      if (latexRotulo && window.katex) {
        b.innerHTML = formatearFormula(latexRotulo);
        b.setAttribute("aria-label", ROTULOS_PLANO[token] || rotulo);
      } else {
        b.textContent = ROTULOS_PLANO[token] || rotulo;
      }
      b.addEventListener("click", () => {
        if (acciones[token]) acciones[token]();
        else insertar(token);
      });
      botones.push(b);
      filaEl.append(b);
    });
    elemento.append(filaEl);
  });

  if (valorInicial) establecerValor(valorInicial);

  function establecerValor(latex) {
    raiz.length = 0;
    const nodos = analizar(String(latex ?? "").trim());
    nodos.forEach((n) => raiz.push(n));
    cursor = { cont: raiz, idx: raiz.length };
    aviso();
  }

  function deshabilitar(bool) {
    deshabilitado = !!bool;
    botones.forEach((b) => (b.disabled = deshabilitado));
  }

  return {
    elemento,
    obtenerValor: () => serializar(raiz, false),
    establecerValor,
    limpiar,
    deshabilitar,
  };
}