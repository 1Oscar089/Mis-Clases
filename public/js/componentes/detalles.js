// ============================================================
// detalles.js — CONTENIDO DESPLEGABLE (js/componentes/detalles.js)
// (js/componentes/detalles.js) · v1
//
// Una caja plegable: el estudiante ve el RÓTULO y hace clic para
// abrir el contenido (y clic de nuevo para cerrar). Perfecto para
// respuestas ocultas ("¿Ya lo intentaste? Mira la solución"),
// glosarios, curiosidades y material opcional.
//
// ─── PARÁMETROS (crearDetalles({ … })) ───
//   titulo       Rótulo del cierre (siempre visible).
//   contenido    Lo que se oculta. Puede ser:
//                  "un texto"              → un párrafo (con formato)
//                  ["texto 1", "texto 2"]  → un párrafo por texto
//   abierto      true → arranca abierto. Defecto: cerrado.
//   tamano       Tamaño del texto: número (px) o CSS (".95rem").
//   ancho        Ancho del bloque: número, fracción 0..1 o CSS.
//   contenedor   Si se pasa, la caja se agrega ahí.
//
// ─── DEVUELVE ─── el <details class="comp-detalles"> listo para
//                  usar (con .abierto(true|false) para manejarlo
//                  desde la clase, y evento "toggle" nativo).
//
// USO:
//   import { crearDetalles } from "../../../js/componentes/detalles.js";
//   crearDetalles({
//     titulo: "Ver la solución",
//     contenido: ["Paso 1: cuenta de 5 en 5…", "Paso 2: resta el total…"],
//     contenedor: zona,
//   });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

function estilos() {
  inyectarEstilos(
    "comp-detalles-estilos",
    `
    .comp-detalles {
      margin: 0 0 1.1rem;
      border: 1px solid #e5e7eb;
      border-radius: .8rem;
      background: #ffffff;
      overflow: hidden;
      font-family: system-ui, sans-serif;
    }
    .comp-detalles summary {
      cursor: pointer;
      padding: .68rem .95rem;
      font-weight: 700;
      font-size: .95rem;
      color: #5b21b6;
      background: #f9fafb;
      list-style: none;
      display: flex;
      align-items: center;
      gap: .5rem;
      user-select: none;
      -webkit-user-select: none;
    }
    .comp-detalles summary::-webkit-details-marker { display: none; }
    .comp-detalles summary::before {
      content: "▸";
      color: #7c3aed;
      font-size: .95rem;
      transition: transform .18s ease;
      flex: none;
    }
    .comp-detalles[open] summary::before { transform: rotate(90deg); }
    .comp-detalles[open] summary {
      border-bottom: 1px solid #e5e7eb;
      background: #faf5ff;
    }
    .comp-detalles-cuerpo {
      padding: .8rem .95rem;
      color: #374151;
      font-size: .95rem;
      line-height: 1.65;
    }
    .comp-detalles-cuerpo .comp-parrafo { margin: 0 0 .55rem; }
    .comp-detalles-cuerpo .comp-parrafo:last-child { margin-bottom: 0; }
  `
  );
}

export function crearDetalles(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const caja = document.createElement("details");
  caja.className = "comp-detalles";
  if (opc.abierto) caja.open = true;
  aplicarAncho(caja, opc.ancho);
  aplicarTamano(caja, opc.tamano);

  const resumen = document.createElement("summary");
  aplicarFormato(resumen, opc.titulo ?? "Más información");
  caja.append(resumen);

  const cuerpo = document.createElement("div");
  cuerpo.className = "comp-detalles-cuerpo";

  const contenido = opc.contenido;
  if (Array.isArray(contenido)) {
    contenido.forEach((parrafo) => {
      const p = document.createElement("p");
      p.className = "comp-parrafo";
      aplicarFormato(p, String(parrafo ?? ""));
      cuerpo.append(p);
    });
  } else if (contenido != null && contenido !== "") {
    const p = document.createElement("p");
    p.className = "comp-parrafo";
    aplicarFormato(p, String(contenido));
    cuerpo.append(p);
  }
  caja.append(cuerpo);

  caja.abierto = (valor) => {
    caja.open = !!valor;
  };

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(caja);
  }
  return caja;
}