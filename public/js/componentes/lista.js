// ============================================================
// lista.js — LISTAS con viñetas (js/componentes/lista.js) · v1
//
// Listas con viñetas (o numeradas) donde cada elemento puede llevar:
//   · su texto (con formato del proyecto: **negrita**, $fórmulas$, …)
//   · un PÁRRAFO dentro del elemento (texto aclaratorio debajo)
//   · una SUBLISTA anidada (y la sublista otras sublistas, etc.)
//
// ─── PARÁMETROS (crearLista({ … })) ───
//   items      Lista de elementos. Cada elemento puede ser:
//                 "texto simple"
//              o  { texto:     "texto del elemento (opcional si hay
//                              parrafo o sublista)",
//                   parrafo:   "párrafo dentro del elemento",
//                   sublista:  [ …mismos elementos… ],
//                   tipo:      "vineta" | "numerada"  (solo para la
//                              sublista; si falta hereda el padre) }
//   tipo       "vineta" (defecto, viñetas ·) | "numerada" (1, 2, 3…).
//   tamano     Tamaño del texto: número (px) o CSS ("1.05rem").
//   ancho      Ancho del bloque: número, fracción 0..1 o CSS.
//              Sin ancho → bloque entero.
//   contenedor Si se pasa, la lista se agrega ahí.
//
// ─── DEVUELVE ─── la <ul>/<ol> con clase .comp-lista.
//
// USO:
//   import { crearLista } from "../../../js/componentes/lista.js";
//   crearLista({
//     contenedor: zona,
//     items: [
//       "Las manecillas: **hora** (corta) y **minuto** (larga).",
//       { texto: "La hora en punto",
//         parrafo: "Cuando el minutero apunta al 12.",
//         sublista: ["Ejemplo: 3:00", "Ejemplo: 9:00"] },
//       { texto: "Media hora", sublista: { tipo: "numerada", items: ["…"] } },
//     ],
//   });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

function estilos() {
  inyectarEstilos(
    "comp-lista-estilos",
    `
    .comp-lista {
      margin: 0 0 1rem;
      padding-left: 1.45rem;
      color: #374151;
      font-size: .98rem;
      line-height: 1.65;
      font-family: system-ui, sans-serif;
    }
    .comp-lista li { margin: .3rem 0; overflow-wrap: break-word; }
    .comp-lista li::marker { color: #7c3aed; font-weight: 700; }
    .comp-lista .comp-lista { margin: .3rem 0 .15rem; } /* sublistas */
    .comp-lista-parrafo {
      margin: .12rem 0 .25rem;
      color: #6b7280;
      font-size: .92em;
      line-height: 1.55;
    }
    @media (max-width: 767px) {
      .comp-lista { padding-left: 1.25rem; }
    }
  `
  );
}

/** Construye la lista (recursivo para sublistas). */
function construir(items, ordenada, tipoHeredado) {
  const lista = document.createElement(ordenada ? "ol" : "ul");
  lista.className = "comp-lista";

  (Array.isArray(items) ? items : [items]).forEach((item) => {
    const li = document.createElement("li");

    // Elemento simple: "texto"
    if (item == null || typeof item !== "object") {
      aplicarFormato(li, String(item ?? ""));
      lista.append(li);
      return;
    }

    // Elemento objeto: { texto, parrafo, sublista, tipo }
    const texto = item.texto ?? item.titulo ?? "";
    if (texto) {
      const linea = document.createElement("span");
      aplicarFormato(linea, texto);
      li.append(linea);
    }

    // Párrafo DENTRO del elemento
    if (item.parrafo) {
      const parrafo = document.createElement("div");
      parrafo.className = "comp-lista-parrafo";
      aplicarFormato(parrafo, String(item.parrafo));
      li.append(parrafo);
    }

    // Sublista (acepta `sublista` o `items` como arreglo, o un objeto
    // { tipo, items } para cambiar a numerada/viñetas en el nivel)
    let subItems = item.sublista ?? item.items;
    let subTipo = item.tipo || tipoHeredado;
    if (subItems && !Array.isArray(subItems) && typeof subItems === "object") {
      subTipo = subItems.tipo || subTipo;
      subItems = subItems.items;
    }
    if (Array.isArray(subItems) && subItems.length) {
      li.append(construir(subItems, subTipo === "numerada", subTipo));
    }

    lista.append(li);
  });

  return lista;
}

export function crearLista(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const tipo = String(opc.tipo || "vineta").toLowerCase().trim();
  const items = Array.isArray(opc.items) ? opc.items : opc.items != null ? [opc.items] : [];

  const lista = construir(items, tipo === "numerada", tipo);
  aplicarAncho(lista, opc.ancho);
  aplicarTamano(lista, opc.tamano);

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(lista);
  }
  return lista;
}