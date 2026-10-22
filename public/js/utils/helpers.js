// ============================================================
// helpers.js — Funciones de ayuda (js/utils/helpers.js)
// ============================================================

/**
 * Escapa caracteres especiales de HTML para poder insertar
 * texto de usuario (nombre, NIE, etc.) de forma segura con innerHTML.
 */
export function escapeHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
