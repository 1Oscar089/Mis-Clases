// ============================================================
// tabla.js — TABLAS personalizadas (js/componentes/tabla.js) · v1
//
// Tablas donde se pasan las FILAS, las COLUMNAS y qué va DENTRO de
// cada celda, con soporte de ROWSPAN y COLSPAN (celdas que ocupan
// varias filas o columnas, como en los cuadros de doble entrada).
// Cada celda admite el formato del proyecto: **negrita**,
// $fórmulas$, {{texto|azul}}, Enter para saltar de línea…
//
// ─── PARÁMETROS (crearTabla({ … })) ───
//   contenido     MATRIZ de celdas: contenido[fila][columna].
//                 Cada celda puede ser:
//                    "texto"
//                 o  { texto:      "…",
//                      colspan:    n   (ocupa n columnas),
//                      rowspan:    n   (ocupa n filas),
//                      encabezado: true (celda th),
//                      alineacion: "izquierda|centro|derecha" }
//   filas         Cantidad de filas (opcional si está `contenido`;
//                 las filas que falten se crean vacías).
//   columnas      Cantidad de columnas (igual; se deducen de la
//                 matriz si faltan; las filas cortas se rellenan
//                 con celdas vacías).
//   titulo        Texto del <caption> (título de la tabla, opcional).
//   primeraFila   true → la primera fila es encabezado (th).
//                 (alias: primeraFilaEncabezado)
//   primeraColumna true → la primera columna es encabezado (th).
//                 (alias: primeraColumnaEncabezado)
//   franjas       true (defecto) → filas alternas gris claro (zebra).
//   tamano        Tamaño del texto: número (px) o CSS (".9rem").
//   ancho         Ancho del bloque: número, fracción 0..1 o CSS.
//                 Sin ancho → bloque entero.
//   contenedor    Si se pasa, la tabla se agrega ahí.
//
// ─── DEVUELVE ─── el <div class="comp-tabla-env"> con la <table>
//                  adentro (con scroll horizontal en pantallas
//                  angostas, para que nunca se rompa el celular).
//
// USO:
//   import { crearTabla } from "../../../js/componentes/tabla.js";
//   crearTabla({
//     contenedor: zona,
//     titulo: "Comparación de figuras",
//     primeraFila: true, primeraColumna: true,
//     contenido: [
//       ["Figura", "Lados", "Perímetro", "Área"],
//       [{ texto: "Cuadrado", rowspan: 2 }, "4", "$4 \\cdot l$", "$l^2$"],
//       ["Rectángulo", "4", "$2(b+h)$", "$b \\cdot h$"],
//       [{ texto: "Triángulo", colspan: 2 }, "$a+b+c$", "$\\frac{b\\,h}{2}$"],
//     ],
//   });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

function estilos() {
  inyectarEstilos(
    "comp-tabla-estilos",
    `
    .comp-tabla-env {
      margin: 0 0 1.1rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      font-family: system-ui, sans-serif;
    }
    .comp-tabla {
      border-collapse: collapse;
      width: 100%;
      font-size: .93rem;
      line-height: 1.5;
      color: #374151;
      background: #ffffff;
    }
    .comp-tabla caption {
      caption-side: top;
      text-align: left;
      font-weight: 700;
      color: #1f2937;
      font-size: .95rem;
      padding: 0 0 .45rem;
    }
    .comp-tabla th,
    .comp-tabla td {
      border: 1px solid #e5e7eb;
      padding: .5rem .65rem;
      text-align: left;
      vertical-align: top;
      overflow-wrap: break-word;
    }
    .comp-tabla th {
      background: rgba(124, 58, 237, .09);
      color: #5b21b6;
      font-weight: 700;
    }
    .comp-tabla tbody tr:nth-child(even) td { background: #f9fafb; }
    .comp-tabla.comp-tabla-sin-franjas tbody tr:nth-child(even) td { background: transparent; }
    @media (max-width: 767px) {
      .comp-tabla th, .comp-tabla td { padding: .42rem .5rem; font-size: .9rem; }
    }
  `
  );
}

/** Normaliza una celda a { texto, colspan, rowspan, encabezado, alineacion }. */
function celda(cruda) {
  if (cruda == null || typeof cruda !== "object") {
    return { texto: cruda, colspan: 0, rowspan: 0, encabezado: false, alineacion: "" };
  }
  return {
    texto: cruda.texto ?? cruda.contenido ?? "",
    colspan: Math.max(0, Number(cruda.colspan) || 0),
    rowspan: Math.max(0, Number(cruda.rowspan) || 0),
    encabezado: !!cruda.encabezado,
    alineacion: String(cruda.alineacion || "").toLowerCase().trim(),
  };
}

export function crearTabla(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const cruda = Array.isArray(opc.contenido) ? opc.contenido : [];
  const matriz = cruda.map((fila) => (Array.isArray(fila) ? fila : [fila]));

  // Cantidad de columnas: la fila más larga (o la pedida)
  let columnas = Number(opc.columnas) || 0;
  matriz.forEach((fila) => (columnas = Math.max(columnas, fila.length)));
  let filas = Number(opc.filas) || matriz.length;
  if (!columnas) columnas = filas > 0 ? 1 : 0;

  const esEncPrimeraFila = opc.primeraFila === true || opc.primeraFilaEncabezado === true;
  const esEncPrimeraColumna = opc.primeraColumna === true || opc.primeraColumnaEncabezado === true;

  const envoltorio = document.createElement("div");
  envoltorio.className = "comp-tabla-env";
  aplicarAncho(envoltorio, opc.ancho);

  const tabla = document.createElement("table");
  tabla.className = "comp-tabla" + (opc.franjas === false ? " comp-tabla-sin-franjas" : "");
  aplicarTamano(tabla, opc.tamano);

  if (opc.titulo) {
    const caption = document.createElement("caption");
    aplicarFormato(caption, String(opc.titulo));
    tabla.append(caption);
  }

  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  let hayThead = false;

  const ALINEACIONES = { centro: "center", derecha: "right", izquierda: "left" };

  for (let f = 0; f < filas; f++) {
    const filaGrupo = f === 0 && esEncPrimeraFila;
    const filaEl = document.createElement("tr");

    for (let c = 0; c < columnas; c++) {
      const cel = celda(matriz[f] ? matriz[f][c] : "");
      const encabezado = cel.encabezado || filaGrupo || (esEncPrimeraColumna && c === 0);

      const tag = document.createElement(encabezado ? "th" : "td");
      aplicarFormato(tag, cel.texto);
      if (cel.colspan > 1) tag.colSpan = cel.colspan;
      if (cel.rowspan > 1) tag.rowSpan = cel.rowspan;

      const alin = ALINEACIONES[cel.alineacion];
      if (alin) tag.style.textAlign = alin;

      filaEl.append(tag);
    }

    if (filaGrupo) {
      thead.append(filaEl);
      hayThead = true;
    } else {
      tbody.append(filaEl);
    }
  }

  if (hayThead) tabla.append(thead);
  tabla.append(tbody);
  envoltorio.append(tabla);

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(envoltorio);
  }
  return envoltorio;
}