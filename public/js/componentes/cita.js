// ============================================================
// cita.js — CITA o frase destacada (js/componentes/cita.js) · v1
//
// Un bloque de cita con barra morada a la izquierda: frases de
// autores, definiciones importantes, consignas destacadas… Puede
// llevar AUTOR y FUENTE debajo.
//
// ─── PARÁMETROS (crearCita({ … })) ───
//   texto       La cita (admite formato: **negrita**, $fórmulas$, …).
//   autor       Quien la dijo (opcional; se muestra como "— Autor").
//   fuente      De dónde salió (libro, página…; opcional, se muestra
//               junto al autor entre paréntesis).
//   tamano      Tamaño del texto: número (px) o CSS ("1.1rem").
//   ancho       Ancho del bloque: número, fracción 0..1 o CSS.
//   alineacion  "izquierda" (defecto) · "centro" · "derecha".
//   contenedor  Si se pasa, la cita se agrega ahí.
//
// ─── DEVUELVE ─── el <blockquote class="comp-cita"> listo para usar.
//
// USO:
//   import { crearCita } from "../../../js/componentes/cita.js";
//   crearCita({
//     texto: "Las matemáticas son la poesía de las ciencias.",
//     autor: "Lorca", fuente: "clase de literatura",
//     contenedor: zona,
//   });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano, aplicarAlineacion } from "./base.js";
import { aplicarFormato, formatoTexto } from "./formatoTexto.js";

function estilos() {
  inyectarEstilos(
    "comp-cita-estilos",
    `
    .comp-cita {
      margin: 0 0 1.1rem;
      border-left: 4px solid #7c3aed;
      background: #faf5ff;
      border-radius: 0 .7rem .7rem 0;
      padding: .8rem 1.1rem;
      color: #4b5563;
      font-style: italic;
      font-size: 1.02rem;
      line-height: 1.65;
      font-family: system-ui, sans-serif;
      overflow-wrap: break-word;
    }
    .comp-cita-autor {
      margin-top: .45rem;
      font-style: normal;
      font-weight: 700;
      font-size: .87rem;
      color: #6b7280;
    }
    @media (max-width: 767px) {
      .comp-cita { padding: .7rem .85rem; }
    }
  `
  );
}

export function crearCita(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const cita = document.createElement("blockquote");
  cita.className = "comp-cita";
  aplicarAncho(cita, opc.ancho);
  aplicarTamano(cita, opc.tamano);
  aplicarAlineacion(cita, opc.alineacion);

  const cuerpo = document.createElement("div");
  aplicarFormato(cuerpo, opc.texto ?? "");
  cita.append(cuerpo);

  if (opc.autor || opc.fuente) {
    const pie = document.createElement("div");
    pie.className = "comp-cita-autor";
    // autor y fuente son texto simple: escapados de una vez
    const autor = opc.autor ? formatoTexto("— " + opc.autor) : "";
    const fuente = opc.fuente ? formatoTexto(" (" + opc.fuente + ")") : "";
    pie.innerHTML = autor + fuente;
    cita.append(pie);
  }

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(cita);
  }
  return cita;
}