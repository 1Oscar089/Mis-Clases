// ============================================================
// subtitulo.js — SUBTÍTULOS por niveles (js/componentes/subtitulo.js)
// (js/componentes/subtitulo.js) · v1
//
// Encabezados de sección DEBAJO del título. Se les pasa el ORDEN:
//   orden 1 → el que sigue del título  (h2, el más grande)
//   orden 2 → el que sigue del 1       (h3)
//   orden 3 → h4   ·  orden 4 → h5   ·  orden 5 → h6
//   orden 6 → el más pequeño de todos (h6 compacto)
// (si mandan 0 o más de 6, se recorta al rango 1–6).
//
// Admite el formato de texto del proyecto: **negrita**, *cursiva*,
// $fórmulas$, {{texto|color}}, …
//
// ─── PARÁMETROS (crearSubtitulo({ … })) ───
//   texto       Texto del subtítulo.
//   orden       1..6 (defecto 1). Ver escalera de arriba.
//   tamano      Tamaño del texto: número (px) o CSS ("1.2rem").
//               Si se pasa, pisa el tamaño del nivel.
//   ancho       Ancho del bloque: número, fracción 0..1 o CSS.
//   alineacion  "izquierda" (defecto) · "centro" · "derecha".
//   contenedor  Si se pasa, el subtítulo se agrega ahí.
//
// ─── DEVUELVE ─── el <h2>…<h6> con clase .comp-subtitulo.
//
// USO:
//   import { crearSubtitulo } from "../../../js/componentes/subtitulo.js";
//   crearSubtitulo({ texto: "1 · La hora en punto", orden: 1, contenedor: zona });
//   crearSubtitulo({ texto: "Media hora más", orden: 2, contenedor: zona });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano, aplicarAlineacion } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

// etiqueta y tamaño (rem) de cada nivel de la escalera 1..6
const NIVELES = [
  { etiqueta: "h2", rem: 1.32 },
  { etiqueta: "h3", rem: 1.16 },
  { etiqueta: "h4", rem: 1.05 },
  { etiqueta: "h5", rem: 0.98 },
  { etiqueta: "h6", rem: 0.9 },
  { etiqueta: "h6", rem: 0.82 }, // orden 6: el más pequeño
];

function estilos() {
  inyectarEstilos(
    "comp-subtitulo-estilos",
    `
    .comp-subtitulo {
      margin: 1.1rem 0 .5rem;
      font-weight: 700;
      line-height: 1.3;
      color: #1f2937;
      font-family: system-ui, sans-serif;
      overflow-wrap: break-word;
    }
    .comp-subtitulo.comp-sub-1 { font-size: 1.32rem; }
    .comp-subtitulo.comp-sub-2 { font-size: 1.16rem; }
    .comp-subtitulo.comp-sub-3 { font-size: 1.05rem; }
    .comp-subtitulo.comp-sub-4 { font-size: .98rem; }
    .comp-subtitulo.comp-sub-5 { font-size: .9rem; }
    .comp-subtitulo.comp-sub-6 { font-size: .82rem; color: #4b5563; }
  `
  );
}

export function crearSubtitulo(opciones = {}) {
  estilos();
  const opc = opciones || {};

  let orden = Math.round(Number(opc.orden ?? 1));
  if (!Number.isFinite(orden)) orden = 1;
  orden = Math.min(6, Math.max(1, orden));
  const nivel = NIVELES[orden - 1];

  const sub = document.createElement(nivel.etiqueta);
  sub.className = "comp-subtitulo comp-sub-" + orden;
  if (opc.tamano == null) sub.style.fontSize = nivel.rem + "rem";
  aplicarAncho(sub, opc.ancho);
  aplicarTamano(sub, opc.tamano);
  aplicarAlineacion(sub, opc.alineacion);
  aplicarFormato(sub, opc.texto ?? "");

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(sub);
  }
  return sub;
}