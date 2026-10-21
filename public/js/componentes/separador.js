// ============================================================
// separador.js — SEPARADORES (js/componentes/separador.js) · v1
//
// Divide secciones del documento: una línea, una línea de puntos,
// doble línea o simplemente un ESPACIO EN BLANCO (para respirar el
// contenido sin dibujar nada).
//
// ─── PARÁMETROS (crearSeparador({ … })) ───
//   estilo      "linea" (defecto) | "puntos" | "doble" | "espacio".
//   alto        Solo para estilo "espacio": alto del hueco en px
//               (número, defecto 24) o CSS ("2rem").
//   ancho       Ancho de la línea: número (px), fracción 0..1 o CSS
//               ("50%"). Con fracción o % la línea se CENTRA.
//               Defecto: bloque entero.
//   contenedor  Si se pasa, el separador se agrega ahí.
//
// ─── DEVUELVE ─── el <hr> (o el <div> hueco para "espacio") listo.
//
// USO:
//   import { crearSeparador } from "../../../js/componentes/separador.js";
//   crearSeparador({ contenedor: zona });
//   crearSeparador({ estilo: "puntos", ancho: "60%", contenedor: zona });
//   crearSeparador({ estilo: "espacio", alto: 32, contenedor: zona });
// ============================================================

import { inyectarEstilos, resolverAncho, aplicarAncho } from "./base.js";

function estilos() {
  inyectarEstilos(
    "comp-separador-estilos",
    `
    .comp-separador {
      border: none;
      margin: 1.3rem auto;
      width: 100%;
      max-width: 100%;
    }
    .comp-separador-linea { border-top: 2px solid #e5e7eb; }
    .comp-separador-puntos { border-top: 3px dotted #cbd5e1; }
    .comp-separador-doble {
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
      height: 3px;
    }
    .comp-separador-espacio {
      border: none;
      height: 24px;
    }
  `
  );
}

export function crearSeparador(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const estilo = String(opc.estilo || "linea").toLowerCase().trim();

  // Estilo "espacio": un hueco invisible
  if (estilo === "espacio") {
    const hueco = document.createElement("div");
    hueco.className = "comp-separador comp-separador-espacio";
    const alto = resolverAncho(opc.alto ?? 24);
    if (alto) hueco.style.height = alto;
    if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
      opc.contenedor.appendChild(hueco);
    }
    return hueco;
  }

  const clasesValidas = ["linea", "puntos", "doble"];
  const tipo = clasesValidas.includes(estilo) ? estilo : "linea";

  const hr = document.createElement("hr");
  hr.className = "comp-separador comp-separador-" + tipo;

  const width = resolverAncho(opc.ancho);
  if (width) {
    hr.style.width = width;
    // Con ancho en px también se centra (queda mejor en el documento)
    hr.style.marginLeft = "auto";
    hr.style.marginRight = "auto";
  }

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(hr);
  }
  return hr;
}