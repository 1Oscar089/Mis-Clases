// ============================================================
// titulo.js — TÍTULO de la clase (js/componentes/titulo.js) · v1
//
// El título principal del documento (h1). Admite el mismo formato de
// texto que todo el proyecto: **negrita**, *cursiva*, $fórmulas$, …
//
// ─── PARÁMETROS (crearTitulo({ … })) ───
//   texto       Texto del título (con formato inline si querés).
//   tamano      Tamaño del texto: número (px) o CSS ("2rem").
//   ancho       Ancho del bloque: número (px), fracción 0..1 o CSS.
//               Sin ancho → bloque entero.
//   alineacion  "izquierda" (defecto) · "centro" · "derecha".
//   contenedor  Si se pasa, el título se agrega ahí.
//
// ─── DEVUELVE ─── el <h1 class="comp-titulo"> listo para usar.
//
// USO:
//   import { crearTitulo } from "../../../js/componentes/titulo.js";
//   crearTitulo({ texto: "El reloj y el calendario", contenedor: zona });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano, aplicarAlineacion } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

function estilos() {
  inyectarEstilos(
    "comp-titulo-estilos",
    `
    .comp-titulo {
      margin: .1rem 0 .9rem;
      font-size: 1.6rem;
      font-weight: 800;
      line-height: 1.25;
      color: #111827;
      font-family: system-ui, sans-serif;
      overflow-wrap: break-word;
    }
    @media (max-width: 767px) {
      .comp-titulo { font-size: 1.4rem; }
    }
  `
  );
}

export function crearTitulo(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const titulo = document.createElement("h1");
  titulo.className = "comp-titulo";
  aplicarAncho(titulo, opc.ancho);
  aplicarTamano(titulo, opc.tamano);
  aplicarAlineacion(titulo, opc.alineacion);
  aplicarFormato(titulo, opc.texto ?? "");

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(titulo);
  }
  return titulo;
}
