// ============================================================
// examenes.js — Página «Exámenes» (js/components/examenes.js)
// ESQUELETO · v7.3 (reparado)
//
// La abre la tarjeta «Exámenes» del inicio. Es la MISMA vista de
// piezas que Clases (clases.js v7.3) filtrada al tipo "examen":
//
//   · SE GUARDA COMO LAS CLASES en Firestore:
//       clases/{grado}/{materiaId}/{id}  con  tipo:"examen".
//   · El docente crea, edita el título, ve el ojo visible/invisible,
//     elimina con la papelera y abre el modal de RESULTADOS
//     (nota por actividad + nota final).
//   · El estudiante las ve POR MATERIA y SEPARADAS POR UNIDAD.
//
// REPARACIONES v7.3 (esto arregla «saca los estudiantes» y «les envía
// el examen solo» — la maquinaria vive en clases.js v7.3 y
// opcionMultiple.js v6.2; este esqueleto solo delega):
//   · El VIGÍA ya NO expulsa al estudiante cuando el bloqueo que
//     llega es el AUTOMÁTICO de SU PROPIO envío (bloqueadas.{uid}
//     escrito por finalizarExamen). Solo el bloqueo del DOCENTE
//     expulsa en vivo.
//   · El bloqueo por envío es SOLO PARA ESE estudiante
//     (bloqueadas.{uid} = true); los demás siguen entrando.
//   · El candado del docente ya no borra bloqueos si la lista de
//     estudiantes no terminó de cargar.
//   · El TIMER ya no envía solo con fechas límite vencidas guardadas
//     (localStorage) si el examen nunca quedó enviado.
//   · En la página del EXAMEN, el botón «Enviar examen» va AL FINAL
//     DE LA ÚLTIMA SECCIÓN solamente (ver el esqueleto de examen:
//     examen-esqueleto.js / examen-ingles-7-u1.js).
// ============================================================

import { renderPiezas } from "./clases.js";

/**
 * Página «Exámenes»: lista de piezas tipo "examen".
 * @param {object} perfil           perfil del usuario (users/{uid})
 * @param {HTMLElement} contenedor  dónde dibujar (main#app)
 */
export function render(perfil, contenedor) {
  return renderPiezas(perfil, contenedor, "examen");
}

export { render as renderExamenes };
