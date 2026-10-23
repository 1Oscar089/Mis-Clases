// ============================================================
// examenes.js — Página «Exámenes» (js/components/examenes.js)
//
// La abre la tarjeta «Exámenes» del inicio. Es la MISMA vista de
// piezas que Clases (clases.js v6) filtrada al tipo "examen":
//   · SE GUARDA COMO LAS CLASES en Firestore:
//     clases/{grado}/{materiaId}/{id} con tipo:"examen".
//   · El docente crea, edita el título, ve el ojo visible/invisible,
//     ELIMINA con la papelera y abre el modal de RESULTADOS
//     (nota por actividad + nota final).
//   · El estudiante las ve POR MATERIA y SEPARADAS POR UNIDAD.
//   · Al abrirla: la página del examen NO se puede cerrar sin
//     ENVIAR (si insiste en salir, se envía lo respondido; lo que
//     no, queda como incorrecto). Si el docente elimina el examen
//     abierto, el estudiante vuelve solo al inicio.
// ============================================================

import { renderPiezas } from "./clases.js";

export function render(perfil, contenedor) {
  return renderPiezas(perfil, contenedor, "examen");
}
export { render as renderExamenes };