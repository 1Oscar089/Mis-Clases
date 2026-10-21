// ============================================================
// parrafo.js — PÁRRAFO de texto (js/componentes/parrafo.js) · v1
//
// Un párrafo normal del documento. Admite TODO el formato del
// proyecto: **negrita**, *cursiva*, __subrayado__, ~~tachado~~,
// ^superíndice^, ~subíndice~, `código`, ==resaltado==,
// {{texto|rojo}}, fórmulas $x^2$ / $$…$$ y Enter = salto de línea.
//
// ─── PARÁMETROS (crearParrafo({ … })) ───
//   texto       El párrafo (una línea o varias; cada Enter salta).
//   tamano      Tamaño del texto: número (px) o CSS ("1.1rem").
//   ancho       Ancho del bloque: número, fracción 0..1 o CSS.
//               Sin ancho → bloque entero.
//   alineacion  "izquierda" (defecto) · "centro" · "derecha" ·
//               "justificado".
//   contenedor  Si se pasa, el párrafo se agrega ahí.
//
// ─── DEVUELVE ─── el <p class="comp-parrafo"> listo para usar.
//
// USO:
//   import { crearParrafo } from "../../../js/componentes/parrafo.js";
//   crearParrafo({
//     texto: "El **minuto** es la manecilla *larga*. Marca las $10{:}30$.",
//     contenedor: zona,
//   });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano, aplicarAlineacion } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

function estilos() {
  inyectarEstilos(
    "comp-parrafo-estilos",
    `
    .comp-parrafo {
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

export function crearParrafo(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const parrafo = document.createElement("p");
  parrafo.className = "comp-parrafo";
  aplicarAncho(parrafo, opc.ancho);
  aplicarTamano(parrafo, opc.tamano);
  aplicarAlineacion(parrafo, opc.alineacion);
  aplicarFormato(parrafo, opc.texto ?? "");

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(parrafo);
  }
  return parrafo;
}