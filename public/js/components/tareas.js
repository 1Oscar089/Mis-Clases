// ============================================================
// tareas.js — Página «Tareas» (js/components/tareas.js)
//
// La abre la tarjeta «Tareas» del inicio. Es la MISMA vista de
// piezas que Clases (clases.js) filtrada al tipo "tarea":
//   · SE GUARDA COMO LAS CLASES en Firestore:
//     clases/{grado}/{materiaId}/{id} con tipo:"tarea".
//   · El docente crea, ve el ojo visible/invisible y el modal de
//     RESULTADOS (nota por actividad + nota final).
//   · El estudiante las ve POR MATERIA y SEPARADAS POR UNIDAD.
// ============================================================

import { renderPiezas } from "./clases.js";

export function render(perfil, contenedor) {
  return renderPiezas(perfil, contenedor, "tarea");
}
export { render as renderTareas };