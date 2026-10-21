// ============================================================
// codigo.js — BLOQUE DE CÓDIGO (js/componentes/codigo.js) · v1
//
// Un bloque de programación o de texto "tal cual" (comandos, código,
// operaciones paso a paso alineadas…). Se muestra VERBATIM: lo que
// escribes es EXACTAMENTE lo que se ve (aquí NO funcionan las marcas
// de formato, y eso es a propósito: es código).
//
// ─── PARÁMETROS (crearCodigo({ … })) ───
//   codigo      El texto del bloque (respetando espacios y saltos).
//   lenguaje    Etiqueta opcional del lenguaje ("Python", "JS", …):
//               se muestra como chip en la esquina.
//   tamano      Tamaño del texto: número (px) o CSS (".88rem").
//   ancho       Ancho del bloque: número, fracción 0..1 o CSS.
//               Sin ancho → bloque entero (con scroll horizontal si
//               una línea es muy larga; nunca rompe el celular).
//   contenedor  Si se pasa, el bloque se agrega ahí.
//
// ─── DEVUELVE ─── el <pre class="comp-codigo"> listo para usar.
//
// USO:
//   import { crearCodigo } from "../../../js/componentes/codigo.js";
//   crearCodigo({
//     codigo: "for i in range(5):\n    print(i)",
//     lenguaje: "Python",
//     contenedor: zona,
//   });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano } from "./base.js";

function estilos() {
  inyectarEstilos(
    "comp-codigo-estilos",
    `
    .comp-codigo {
      position: relative;
      margin: 0 0 1.1rem;
      background: #111827;
      color: #e5e7eb;
      border-radius: .8rem;
      padding: .9rem 1rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .88rem;
      line-height: 1.6;
      tab-size: 4;
      white-space: pre;
    }
    .comp-codigo-lenguaje {
      position: absolute;
      top: .55rem;
      right: .6rem;
      background: rgba(255, 255, 255, .12);
      color: #c4b5fd;
      font-family: system-ui, sans-serif;
      font-size: .68rem;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
      padding: .12rem .5rem;
      border-radius: 999px;
      pointer-events: none;
    }
    @media (max-width: 767px) {
      .comp-codigo { font-size: .8rem; padding: .8rem .8rem; }
    }
  `
  );
}

export function crearCodigo(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const bloque = document.createElement("pre");
  bloque.className = "comp-codigo";
  aplicarAncho(bloque, opc.ancho);
  aplicarTamano(bloque, opc.tamano);

  // VERBATIM: textContent muestra el código tal cual, sin HTML
  bloque.textContent = String(opc.codigo ?? "");

  if (opc.lenguaje) {
    const chip = document.createElement("span");
    chip.className = "comp-codigo-lenguaje";
    chip.textContent = String(opc.lenguaje);
    bloque.append(chip);
  }

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(bloque);
  }
  return bloque;
}