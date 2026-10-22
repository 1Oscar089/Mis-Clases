// ============================================================
// recursos.js — Página «Recursos» (js/components/recursos.js)
//
// La abre la tarjeta «Recursos» del inicio. Es la MISMA vista de
// piezas que Clases (clases.js) filtrada al tipo "recurso":
//   · SE GUARDA COMO LAS CLASES en Firestore:
//     clases/{grado}/{materiaId}/{id} con tipo:"recurso".
//   · El docente crea y ve el ojo visible/invisible (un recurso
//     invisible NO existe para el estudiante).
//   · El estudiante los ve POR MATERIA y SEPARADOS POR UNIDAD
//     (o en «General» si no llevan unidad).
// ============================================================

import { renderPiezas } from "./clases.js";

export function render(perfil, contenedor) {
  return renderPiezas(perfil, contenedor, "recurso");
}
export { render as renderRecursos };
