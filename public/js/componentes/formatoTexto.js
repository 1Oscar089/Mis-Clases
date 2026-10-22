// ============================================================
// formatoTexto.js — FORMATO DE TEXTO para todo el documento
// (js/componentes/formatoTexto.js) · v4
//
// v3 · EL MOTOR DE FÓRMULAS YA NO ROMPE NADA: antes había un import
//   estático de ../utils/formatearFormulas.js, así que si ese archivo
//   faltaba (o fallaba) en el proyecto, TODOS los componentes de
//   texto fallaban en cadena. Ahora se importa solo cuando un texto
//   trae $fórmulas$ y, si no está, la fórmula se ve como LaTeX plano
//   legible — todo lo demás sigue funcionando igual.
// Convierte TEXTO PLANO con marcas amigables en HTML listo para
// mostrar. Es el motor que usan TODOS los componentes de documento
// (titulo, parrafo, lista, tabla, cita, aviso…), así que lo que
// aprendas aquí funciona en todos lados. Además entiende FÓRMULAS
// con el mismo motor de matemática del proyecto ($…$ → KaTeX, ver
// js/utils/formatearFormulas.js).
//
// ─── MARCAS RECONOCIDAS (se pueden COMBINAR entre sí) ───
//   **negrita**          → negrita            <strong>
//   *cursiva*            → cursiva            <em>
//   __subrayado__        → subrayado          <u>
//   ~~tachado~~          → tachado            <s>
//   ^superíndice^        → x²                 <sup>
//   ~subíndice~          → H₂O                <sub>
//   `código`             → monoespaciado      <code>  (sin formato dentro)
//   ==resaltado==        → subrayado amarillo <mark>
//   ++grande++           → AUMENTA el tamaño de fuente (1.3em)
//   --pequeño--          → DISMINUYE el tamaño de fuente (0.75em)
//   ##sombra##           → texto con SOMBRA (efecto tipo Word)
//   <<texto>>            → palabra ROTADA (inclinada, defecto -8°)
//   <<texto|20>>         → rotada 20° · <<texto|-45>> → 45° a la izq.
//   {{texto|rojo}}       → texto de COLOR. Colores: rojo, azul,
//                          verde, naranja, morado, gris.
//   $x^2 + 1$            → fórmula en la línea (KaTeX)
//   $$\frac{a}{b}$$      → fórmula CENTRADA en bloque (KaTeX)
//   \(a + b\)            → equivalente de $a + b$
//   \$                   → signo $ literal (dinero: "Cuesta \$5")
//   Enter                → salto de línea (fuera de código y fórmulas)
//
//   Ejemplos combinados:
//     "**Regla:** el *área* es $A = \pi r^2$, con π ≈ ^3.14^…"
//     "El agua es H~2~O y el **sulfato ~~de sodio~~** es ==peligroso==."
//     "++ATENCIÓN++: no te --olvides-- del <<paso|10>> ##clave##."
//
// ─── API ───
//   formatoTexto(texto, formatos)
//       → String HTML. `formatos` (opcional) es la forma DIRECTA de
//         pedir conversiones sin marcas: se pasa el texto y A QUÉ
//         convertir cada pedazo:
//           formatoTexto("La mitocondria produce energía", {
//             negrita:   ["mitocondria"],
//             cursiva:   ["energía"],
//             color:     { verde: ["mitocondria"] },
//             grande:    ["energía"],                 // ++…++
//             pequeño:   ["mitocondria"],             // --…--
//             sombra:    ["produce"],                 // ##…##
//             rotacion:  { grados: 15, textos: ["energía"] },
//           });
//         Claves válidas: negrita, cursiva, subrayado, tachado,
//         superindice, subindice, codigo, resaltado, color, grande,
//         pequeño/pequeno, sombra, rotacion
//         (color: { rojo|azul|verde|naranja|morado|gris: [frases] }).
//
//   aplicarFormato(elemento, texto, formatos)
//       → Pone el HTML en el elemento Y (si el texto lleva fórmulas)
//         lo re-pinta solo cuando KaTeX termina de cargar del CDN.
//         Es lo que usan los componentes por dentro.
//
//   Notas de seguridad: TODO el texto se escapa (no se puede inyectar
//   HTML) y KaTeX corre con trust:false. Sin internet, las fórmulas
//   se ven como LaTeX plano legible (no se rompe nada).
// ============================================================

// v4 — CERO dependencias FUERA de esta carpeta: este archivo SOLO
// importa ./base.js (mismo directorio). El escape del texto va AQUÍ
// dentro (antes venía de ../utils/helpers.js: si esa copia faltaba,
// caían en cadena TÍTULO, PÁRRAFO y casi todos los bloques con el
// error «Failed to fetch dynamically imported module»). Ahora un
// bloque de texto nunca depende de carpetas vecinas.
import {
  inyectarEstilos as inyectarEstilosBase,
  aplicarAncho,
  aplicarTamano,
  aplicarAlineacion,
} from "./base.js";

/* ---------------- Escape local (antes: utils/helpers.js) ----------------
   MISMA semántica que utils/helpers.js: escapa & < > " ' para poder
   meter texto del usuario en innerHTML sin riesgo de inyección. */

function escapeHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------- Motor de fórmulas (carga PEREZOSA y a prueba de fallos) ----------------
   Ya NO hay import estático de formatearFormulas.js: se importa una
   sola vez, solo cuando un texto trae $…$ / $$…$$ / \(…\). Si el
   archivo no está (o falla), la fórmula se dibuja como LaTeX plano
   legible y NADA más se rompe. */

let modFormulas = null;        // módulo ya cargado (o null)
let cargandoFormulas = null;   // promesa única (aunque lo pidan mil veces)

function asegurarFormulas() {
  if (modFormulas) return Promise.resolve(true);
  if (!cargandoFormulas) {
    cargandoFormulas = import("../utils/formatearFormulas.js")
      .then((m) => { modFormulas = m; return true; })
      .catch(() => false);   // sin el archivo: false, pero NO explota
  }
  return cargandoFormulas;
}

function renderFormulaPlana(latex, displayMode) {
  const css = displayMode
    ? "display:block;text-align:center;margin:.35rem 0;"
    : "white-space:nowrap;";
  return '<code class="fmt-formula-plana" style="' + css + '">' + escapeHtml(latex) + "</code>";
}

/** $…$ → HTML de la fórmula (KaTeX si está; LaTeX plano si no). */
function formulaAHtml(latex, displayMode) {
  if (modFormulas && typeof modFormulas.formatearFormula === "function") {
    try {
      return modFormulas.formatearFormula(latex, { displayMode });
    } catch (e) { /* LaTeX inválido → plano, no rompe la página */ }
  }
  return renderFormulaPlana(latex, displayMode);
}

/* ---------------- Colores disponibles ---------------- */

const COLORES = {
  rojo: "fmt-color-rojo",
  azul: "fmt-color-azul",
  verde: "fmt-color-verde",
  naranja: "fmt-color-naranja",
  morado: "fmt-color-morado",
  gris: "fmt-color-gris",
};

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  inyectarEstilosBase(
    "formato-texto-estilos",
    `
    .fmt-codigo {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .9em;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: .35rem;
      padding: .05rem .3rem;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .fmt-resaltado {
      background: #fef08a;
      color: inherit;
      border-radius: .2rem;
      padding: 0 .1rem;
    }
    .fmt-sup, .fmt-sub { font-size: .72em; }
    .fmt-sup { vertical-align: super; line-height: 0; }
    .fmt-sub { vertical-align: sub; line-height: 0; }
    .fmt-color-rojo    { color: #dc2626; }
    .fmt-color-azul    { color: #2563eb; }
    .fmt-color-verde   { color: #16a34a; }
    .fmt-color-naranja { color: #ea580c; }
    .fmt-color-morado  { color: #7c3aed; }
    .fmt-color-gris    { color: #6b7280; }
    /* v2 — tamaño de fuente, rotación y sombra */
    .fmt-mas   { font-size: 1.3em; }
    .fmt-menos { font-size: .75em; }
    .fmt-rotado {
      display: inline-block;
      transform-origin: center;
      line-height: 1.2;
    }
    .fmt-sombra {
      text-shadow: 1px 2px 3px rgba(15, 23, 42, .38);
    }
    /* fórmula sin el motor de KaTeX: LaTeX plano legible */
    .fmt-formula-plana {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .92em;
      background: #f5f3ff;
      border: 1px dashed #c4b5fd;
      border-radius: .35rem;
      padding: .05rem .35rem;
      color: #4c1d95;
    }
    /* el componente de documento «Texto con formato» (crearFormatoTexto) */
    .comp-formato {
      margin: 0 0 .9rem;
      color: #374151;
      font-size: .98rem;
      line-height: 1.7;
      font-family: system-ui, sans-serif;
      overflow-wrap: break-word;
    }
  `
  );
}

/* ---------------- Marcas inline (de más "fuerte" a más débil) ----------------
   El orden IMPORTA: ** se prueba antes que *, ~~ antes que ~, __ antes
   que nada con _, y el `código` es hoja (no se analiza por dentro).
   v2 suma: ++grande++, --pequeño--, ##sombra## y <<rotado|ángulo>>. */

const MARCAS = [
  { marca: "**", etiqueta: "strong", clase: "fmt-negrita" },
  { marca: "==", etiqueta: "mark", clase: "fmt-resaltado" },
  { marca: "~~", etiqueta: "s", clase: "fmt-tachado" },
  { marca: "__", etiqueta: "u", clase: "fmt-subrayado" },
  { marca: "`", etiqueta: "code", clase: "fmt-codigo", hoja: true },
  { marca: "++", etiqueta: "span", clase: "fmt-mas" },
  { marca: "--", etiqueta: "span", clase: "fmt-menos" },
  { marca: "##", etiqueta: "span", clase: "fmt-sombra" },
  { marca: "<<", etiqueta: "span", clase: "fmt-rotado", especial: "rotado", cierre: ">>" },
  { marca: "^", etiqueta: "sup", clase: "fmt-sup" },
  { marca: "~", etiqueta: "sub", clase: "fmt-sub" },
  { marca: "*", etiqueta: "em", clase: "fmt-cursiva" },
];

/* ---------------- Convertir formatos explícitos → marcas ---------------- */

const CLAVE_A_MARCA = {
  negrita: "**",
  cursiva: "*",
  subrayado: "__",
  tachado: "~~",
  superindice: "^",
  superíndice: "^",
  subindice: "~",
  subíndice: "~",
  codigo: "`",
  código: "`",
  resaltado: "==",
  grande: "++",
  mas: "++",
  aumenta: "++",
  pequeño: "--",
  pequeno: "--",
  menos: "--",
  reduce: "--",
  sombra: "##",
  sombreado: "##",
};

/** Aplica el pedido directo "a qué convertir" sobre el texto crudo. */
function envolverFormatos(texto, formatos) {
  if (!formatos || typeof formatos !== "object") return texto;
  let salida = texto;

  Object.keys(formatos).forEach((clave) => {
    const pedido = formatos[clave];
    if (clave === "color") {
      // color: { rojo: ["frase1", "frase2"], azul: [...] }
      if (!pedido || typeof pedido !== "object") return;
      Object.keys(pedido).forEach((color) => {
        const lista = Array.isArray(pedido[color]) ? pedido[color] : [pedido[color]];
        lista.forEach((frase) => {
          salida = reemplazarLiteral(salida, frase, (f) => "{{" + f + "|" + color + "}}");
        });
      });
      return;
    }
    if (clave === "rotacion" || clave === "rotación") {
      // rotacion: { grados: 15, textos: ["frase1", …] }  ·  (sin
      // grados queda la inclinación por defecto de <<texto>>)
      if (!pedido || typeof pedido !== "object") return;
      const num = Number(pedido.grados ?? pedido.angulo);
      const grados = Number.isFinite(num) ? num : null;
      const bruto = pedido.textos ?? pedido.frases ?? pedido.palabras ?? [];
      const lista = Array.isArray(bruto) ? bruto : [bruto];
      lista.forEach((frase) => {
        salida = reemplazarLiteral(salida, frase, (f) =>
          "<<"
          + f
          + (grados == null ? "" : "|" + grados)
          + ">>"
        );
      });
      return;
    }
    const marca = CLAVE_A_MARCA[clave];
    if (!marca) return; // clave desconocida: ignorar en silencio
    const lista = Array.isArray(pedido) ? pedido : [pedido];
    lista.forEach((frase) => {
      salida = reemplazarLiteral(salida, frase, (f) => marca + f + marca);
    });
  });

  return salida;
}

/** Reemplaza TODAS las apariciones literales de `busca` usando `como`. */
function reemplazarLiteral(texto, busca, como) {
  const frase = String(busca ?? "");
  if (!frase) return texto;
  return texto.split(frase).join(como(frase));
}

/* ---------------- Analizador (escáner) ----------------

   Recorre el texto CRUDO carácter a carácter:
     1. \$          → signo $ literal
     2. fórmulas    → $$…$$ · $…$ · \(…\)  (hoja: se envía a KaTeX)
     3. marcas      → abre, analiza el interior, cierra
     4. {{t|color}} → span de color
     5. Enter       → <br>
     6. resto       → escapado tal cual
   Todo lo emitido como texto sale ESCAPADO (no se puede inyectar HTML). */

function coincidirFormula(texto, i) {
  // $$…$$ → bloque centrado
  if (texto.startsWith("$$", i)) {
    const fin = texto.indexOf("$$", i + 2);
    if (fin > i + 2) {
      const latex = texto.slice(i + 2, fin);
      if (latex.trim()) return { latex, bloque: true, fin: fin + 2 };
    }
    return null;
  }
  // $…$ → en la línea
  if (texto[i] === "$") {
    const fin = texto.indexOf("$", i + 1);
    if (fin > i + 1) {
      const latex = texto.slice(i + 1, fin);
      if (latex.trim() && !latex.includes("\n")) {
        return { latex, bloque: false, fin: fin + 1 };
      }
    }
    return null;
  }
  // \(…\) → equivalente de $…$
  if (texto.startsWith("\\(", i)) {
    const fin = texto.indexOf("\\)", i + 2);
    if (fin > i + 2) {
      const latex = texto.slice(i + 2, fin);
      if (latex.trim()) return { latex, bloque: false, fin: fin + 2 };
    }
    return null;
  }
  return null;
}

function coincidirMarca(texto, i) {
  for (const regla of MARCAS) {
    if (!texto.startsWith(regla.marca, i)) continue;
    const desde = i + regla.marca.length;
    // cierre distinto al abrir solo en <<…>> (abre "<<", cierra ">>")
    const cierre = regla.cierre || regla.marca;
    const fin = texto.indexOf(cierre, desde);
    if (fin === -1) continue; // sin cierre: la marca queda como texto
    const dentro = texto.slice(desde, fin);
    if (!dentro) continue; // marca vacía: texto
    return { regla, dentro, fin: fin + cierre.length };
  }
  return null;
}

function coincidirColor(texto, i) {
  if (!texto.startsWith("{{", i)) return null;
  const fin = texto.indexOf("}}", i + 2);
  if (fin === -1) return null;
  const dentro = texto.slice(i + 2, fin);
  const barra = dentro.lastIndexOf("|");
  if (barra === -1) return null;
  const textoColor = dentro.slice(0, barra);
  const nombreColor = dentro.slice(barra + 1).toLowerCase().trim();
  if (!textoColor || !COLORES[nombreColor]) return null;
  return { dentro: textoColor, clase: COLORES[nombreColor], fin: fin + 2 };
}

/** Ángulo de rotación: "15", "-45", "20deg"… → número (o defecto). */
const ROTACION_DEFECTO = -8;

function gradosRotacion(parte) {
  const num = parseFloat(String(parte ?? "").replace("deg", "").trim());
  return Number.isFinite(num) ? num : ROTACION_DEFECTO;
}

function parsear(texto) {
  let salida = "";
  let i = 0;
  const largo = texto.length;

  while (i < largo) {
    // \$ → $ literal
    if (texto[i] === "\\" && texto[i + 1] === "$") {
      salida += "$";
      i += 2;
      continue;
    }
    // fórmulas (hoja: van a KaTeX sin tocar; sin el motor, LaTeX plano)
    const formula = coincidirFormula(texto, i);
    if (formula) {
      salida += formulaAHtml(formula.latex, formula.bloque);
      i = formula.fin;
      continue;
    }
    // {{texto|color}}
    const color = coincidirColor(texto, i);
    if (color) {
      salida += '<span class="' + color.clase + '">' + parsear(color.dentro) + "</span>";
      i = color.fin;
      continue;
    }
    // marcas inline
    const hallada = coincidirMarca(texto, i);
    if (hallada) {
      const { regla, dentro } = hallada;
      // v2 — <<texto>> / <<texto|ángulo>>: rotación con ángulo libre
      if (regla.especial === "rotado") {
        const barra = dentro.lastIndexOf("|");
        const parteTexto = barra === -1 ? dentro : dentro.slice(0, barra);
        const grados = barra === -1
          ? ROTACION_DEFECTO
          : gradosRotacion(dentro.slice(barra + 1));
        salida += '<span class="fmt-rotado" style="transform:rotate(' + grados + 'deg)">'
          + parsear(parteTexto)
          + "</span>";
        i = hallada.fin;
        continue;
      }
      const interior = regla.hoja ? escapeHtml(dentro) : parsear(dentro);
      salida += '<' + regla.etiqueta + ' class="' + regla.clase + '">' + interior + "</" + regla.etiqueta + ">";
      i = hallada.fin;
      continue;
    }
    // Enter → salto de línea
    if (texto[i] === "\n") {
      salida += "<br>";
      i += 1;
      continue;
    }
    // cualquier otro carácter: escapado
    salida += escapeHtml(texto[i]);
    i += 1;
  }
  return salida;
}

/* ---------------- API ---------------- */

/**
 * Texto (con marcas o con el pedido directo `formatos`) → HTML.
 * Ejemplos en la cabecera del archivo.
 */
export function formatoTexto(texto, formatos = null) {
  inyectarEstilos();
  const fuente = String(texto ?? "");
  if (!fuente) return "";

  // Si hay fórmulas, asegura que el motor se esté importando (mejor
  // esfuerzo: si falta el archivo, todo sigue funcionando)
  if (/\$\$|\$|\\\(/.test(fuente)) asegurarFormulas();

  const preparado = envolverFormatos(fuente, formatos);
  return parsear(preparado);
}

/* --- Re-pintado automático cuando KaTeX termina de cargar ---
   Si el texto llevaba fórmulas y el CDN aún no respondió, queda el
   LaTeX plano; cuando KaTeX llega, todo lo registrado se re-pinta. */

const registrados = new Map(); // elemento → { texto, formatos }
let repintadoEnMarcha = false;

/**
 * Pone `formatoTexto(texto, formatos)` dentro del elemento y, si el
 * texto lleva fórmulas, lo re-pinta solo cuando KaTeX cargue.
 */
export function aplicarFormato(elemento, texto, formatos = null) {
  if (!elemento) return;
  const fuente = String(texto ?? "");
  elemento.innerHTML = formatoTexto(fuente, formatos);

  if (!/\$\$|\$|\\\(/.test(fuente)) return; // sin fórmulas: nada más
  registrados.set(elemento, { texto: fuente, formatos });

  if (repintadoEnMarcha) return;
  repintadoEnMarcha = true;
  // 1) importa el motor (si está) · 2) espera el KaTeX del CDN ·
  // 3) re-pinta TODO lo registrado ya en el documento.
  asegurarFormulas()
    .then((ok) => {
      if (!ok || !modFormulas) return;   // sin motor: queda plano legible
      const cargar = typeof modFormulas.cargarFormulas === "function"
        ? Promise.resolve(modFormulas.cargarFormulas())
        : Promise.resolve(true);
      return cargar.then((listo) => {
        if (!listo) return;
        registrados.forEach((item, el) => {
          if (el.isConnected) el.innerHTML = formatoTexto(item.texto, item.formatos);
        });
      });
    })
    .catch(() => {})
    .finally(() => {
      repintadoEnMarcha = false;
    });
}

/* ---------------- COMPONENTE DE DOCUMENTO «Texto con formato» ----------------
   El párrafo libre con TODAS las marcas del proyecto, como fábrica con
   la convención de js/componentes/ (crearX({…}) + contenedor). Es lo
   que usa el editor «Crear» para su tarjeta "Texto con formato".

   ─── PARÁMETROS (crearFormatoTexto({ … })) ───
     texto       El texto con marcas (**negrita**, $fórmulas$, {{color}}…).
     tamano      Tamaño del texto: número (px) o CSS ("1.1rem").
     ancho       Ancho del bloque: número, fracción 0..1 o CSS.
                 Sin ancho → bloque entero.
     alineacion  "izquierda" (defecto) · "centro" · "derecha" · "justificado".
     contenedor  Si se pasa, el texto se agrega ahí.

   ─── DEVUELVE ─── el <div class="comp-formato"> listo para usar.

   USO:
     import { crearFormatoTexto } from "../../../js/componentes/formatoTexto.js";
     crearFormatoTexto({ texto: "El agua es H~2~O", contenedor: zona });
*/
export function crearFormatoTexto(opciones = {}) {
  inyectarEstilos();
  const opc = opciones || {};

  const caja = document.createElement("div");
  caja.className = "comp-formato";
  aplicarAncho(caja, opc.ancho);
  aplicarTamano(caja, opc.tamano);
  aplicarAlineacion(caja, opc.alineacion);
  aplicarFormato(caja, opc.texto ?? "");

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(caja);
  }
  return caja;
}
