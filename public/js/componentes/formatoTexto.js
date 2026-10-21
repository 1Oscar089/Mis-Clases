// ============================================================
// formatoTexto.js — FORMATO DE TEXTO para todo el documento
// (js/componentes/formatoTexto.js) · v1
//
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
//   {{texto|rojo}}       → texto de COLOR. Colores: rojo, azul,
//                          verde, naranja, morado, gris.
//   $x^2 + 1$            → fórmula en la línea (KaTeX)
//   $$\frac{a}{b}$$      → fórmula CENTRADA en bloque (KaTeX)
//   \(a + b\)            → equivalente de $a + b$
//   \$                   → signo $ literal (dinero: "Cuesta \$5")
//   Enter                → salto de línea (fuera de código y fórmulas)
//
//   Ejemplo combinado:
//     "**Regla:** el *área* es $A = \pi r^2$, con π ≈ ^3.14^…"
//     "El agua es H~2~O y el **sulfato ~~de sodio~~** es ==peligroso==."
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
//           });
//         Claves válidas: negrita, cursiva, subrayado, tachado,
//         superindice, subindice, codigo, resaltado, color
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

import { escapeHtml } from "../utils/helpers.js";
import { formatearFormula, cargarFormulas } from "../utils/formatearFormulas.js";
import { inyectarEstilos as inyectarEstilosBase } from "./base.js";

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
  `
  );
}

/* ---------------- Marcas inline (de más "fuerte" a más débil) ----------------
   El orden IMPORTA: ** se prueba antes que *, ~~ antes que ~, __ antes
   que nada con _, y el `código` es hoja (no se analiza por dentro). */

const MARCAS = [
  { marca: "**", etiqueta: "strong", clase: "fmt-negrita" },
  { marca: "==", etiqueta: "mark", clase: "fmt-resaltado" },
  { marca: "~~", etiqueta: "s", clase: "fmt-tachado" },
  { marca: "__", etiqueta: "u", clase: "fmt-subrayado" },
  { marca: "`", etiqueta: "code", clase: "fmt-codigo", hoja: true },
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
    const fin = texto.indexOf(regla.marca, desde);
    if (fin === -1) continue; // sin cierre: la marca queda como texto
    const dentro = texto.slice(desde, fin);
    if (!dentro) continue; // marca vacía: texto
    return { regla, dentro, fin: fin + regla.marca.length };
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
    // fórmulas (hoja: van a KaTeX sin tocar)
    const formula = coincidirFormula(texto, i);
    if (formula) {
      salida += formatearFormula(formula.latex, { displayMode: formula.bloque });
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

  // Si hay fórmulas, asegura que KaTeX se esté cargando (mejor esfuerzo)
  if (/\$\$|\$|\\\(/.test(fuente)) cargarFormulas().catch(() => {});

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
  cargarFormulas()
    .then((listo) => {
      if (!listo) return;
      registrados.forEach((item, el) => {
        el.innerHTML = formatoTexto(item.texto, item.formatos);
      });
    })
    .catch(() => {})
    .finally(() => {
      repintadoEnMarcha = false;
    });
}