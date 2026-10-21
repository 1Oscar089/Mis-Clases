// ============================================================
// formula.js — FÓRMULA destacada (js/componentes/formula.js) · v1
//
// Una fórmula matemática GRANDE y destacada, centrada como en un
// libro de texto. Renderiza con KaTeX (el mismo motor de fórmulas
// del proyecto, js/utils/formatearFormulas.js), así que acepta LaTeX
// escolar: \frac{1}{2}, \sqrt[3]{8}, x^2, a_1, \pi, \sen, \tg, \N…
//
//   · Para fórmulas DENTRO de un texto no hace falta este componente:
//     escribí $x^2 + 1$ dentro del texto de cualquier componente
//     (parrafo, lista, tabla…) y sale solo.
//   · Este componente es para la fórmula PROTAGONISTA, en su propia
//     línea y más grande.
//
// ─── PARÁMETROS (crearFormula({ … })) ───
//   latex       La fórmula en LaTeX. También se acepta `formula` o
//               `texto` como nombre. Si la escriben con $…$ alrededor
//               (por costumbre), se le quitan solos.
//   bloque      true (defecto) → centrada, grande (displayMode).
//               false → en el tamaño del texto, alineada como un
//               párrafo (útil para una fórmula suelta a la izquierda).
//   tamano      Tamaño: número (px) o CSS ("1.4rem"). Defecto 1.25rem.
//   ancho       Ancho del bloque: número, fracción 0..1 o CSS.
//   alineacion  "centro" (defecto) · "izquierda" · "derecha".
//   contenedor  Si se pasa, la fórmula se agrega ahí.
//
// ─── DEVUELVE ─── el <div class="comp-formula"> listo para usar.
//
// USO:
//   import { crearFormula } from "../../../js/componentes/formula.js";
//   crearFormula({ latex: "A = \\pi r^2", contenedor: zona });
//   crearFormula({ latex: "\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}" });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano, aplicarAlineacion } from "./base.js";
import { formatearFormula, cargarFormulas } from "../utils/formatearFormulas.js";

function estilos() {
  inyectarEstilos(
    "comp-formula-estilos",
    `
    .comp-formula {
      margin: 0 0 1rem;
      font-size: 1.25rem;
      overflow-x: auto;
      overflow-y: hidden;
      padding: .2rem 0 .3rem;
      font-family: system-ui, sans-serif;
    }
    .comp-formula .katex { font-size: 1.15em; }
  `
  );
}

/** Quita $…$, $$…$$ o \(…\) que sobren alrededor del LaTeX. */
function limpiarLatex(bruto) {
  let s = String(bruto ?? "").trim();
  if (s.startsWith("$$") && s.endsWith("$$") && s.length > 4) s = s.slice(2, -2).trim();
  else if (s.startsWith("$") && s.endsWith("$") && s.length > 2) s = s.slice(1, -1).trim();
  else if (s.startsWith("\\(") && s.endsWith("\\)") && s.length > 4) s = s.slice(2, -2).trim();
  return s;
}

export function crearFormula(opciones = {}) {
  estilos();
  const opc = opciones || {};
  const latex = limpiarLatex(opc.latex ?? opc.formula ?? opc.texto ?? "");

  const caja = document.createElement("div");
  caja.className = "comp-formula";
  aplicarAncho(caja, opc.ancho);
  aplicarTamano(caja, opc.tamano);

  const bloque = opc.bloque !== false;
  caja.style.textAlign = bloque ? "center" : "left";
  aplicarAlineacion(caja, opc.alineacion);

  const pintar = () => {
    caja.innerHTML = formatearFormula(latex, { displayMode: bloque });
  };
  pintar();

  // Si KaTeX no había cargado aún (fallback plano), re-pintar al llegar
  if (!window.katex && latex) {
    cargarFormulas()
      .then((listo) => {
        if (listo) pintar();
      })
      .catch(() => {});
  }

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(caja);
  }
  return caja;
}