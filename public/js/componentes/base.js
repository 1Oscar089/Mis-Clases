// ============================================================
// base.js — Ayudantes compartidos de los COMPONENTES DE DOCUMENTO
// (js/componentes/base.js) · v1
//
// Piezas mínimas que usan TODOS los componentes de js/componentes/
// para que se comporten igual y con la misma convención:
//
//   inyectarEstilos(id, css)      CSS implícito: inyecta una hoja una
//                                 sola vez (idempotente, como en
//                                 visuales/ y utils/).
//
//   resolverAncho(ancho)          → String CSS o null.
//       500        → "500px"     (número = píxeles)
//       0.5        → "50%"       (fracción entre 0 y 1 = porcentaje)
//       "60%"      → "60%"       (texto CSS tal cual: rem, %, px…)
//       undefined  → null        (sin ancho → BLOQUE ENTERO)
//
//   aplicarAncho(el, ancho)       Pone el ancho si vino uno; SIEMPRE
//                                 garantiza max-width:100% para que
//                                 nada rompa el celular.
//
//   aplicarTamano(el, tamano)     Tamaño del texto: número → px,
//                                 texto CSS tal cual ("1.2rem").
//
//   aplicarAlineacion(el, alinea) "izquierda" (defecto) · "centro" ·
//                                 "derecha" · "justificado".
//
// CONVENCIÓN DE LOS COMPONENTES (igual que visuales/):
//   cada componente es una función fábrica `crearX(opciones)` que
//   devuelve el elemento listo para usar; si le pasan `contenedor`,
//   se agrega ahí solito. El texto que reciben admite formato
//   inline (ver formatoTexto.js): **negrita**, *cursiva*, $fórmulas$, …
// ============================================================

/**
 * Inyecta una hoja de estilos una sola vez (CSS implícito).
 * @param {string} id   id único para <style> (si ya existe no toca nada)
 * @param {string} css  contenido CSS
 */
export function inyectarEstilos(id, css) {
  if (document.getElementById(id)) return;
  const estilo = document.createElement("style");
  estilo.id = id;
  estilo.textContent = css;
  document.head.append(estilo);
}

/**
 * Convierte el parámetro `ancho` a un valor CSS de width.
 * Acepta número (px), fracción 0..1 (%) o texto CSS ("60%", "25rem").
 * Devuelve null si no hay ancho (→ bloque entero).
 */
export function resolverAncho(ancho) {
  if (ancho == null || ancho === "") return null;
  if (typeof ancho === "number" && Number.isFinite(ancho)) {
    if (ancho <= 0) return null;
    return ancho <= 1 ? String(ancho * 100) + "%" : ancho + "px";
  }
  const texto = String(ancho).trim();
  return texto ? texto : null;
}

/** Aplica el ancho al elemento (con max-width:100% siempre). */
export function aplicarAncho(el, ancho) {
  if (!el) return;
  el.style.maxWidth = "100%";
  const width = resolverAncho(ancho);
  if (width) el.style.width = width;
}

/** Aplica tamaño de texto (número → px, texto CSS tal cual). */
export function aplicarTamano(el, tamano) {
  if (!el || tamano == null || tamano === "") return;
  if (typeof tamano === "number" && Number.isFinite(tamano) && tamano > 0) {
    el.style.fontSize = tamano + "px";
    return;
  }
  const texto = String(tamano).trim();
  if (texto) el.style.fontSize = texto;
}

/** Aplica alineación del texto. Defecto: izquierda (no toca nada). */
export function aplicarAlineacion(el, alineacion) {
  if (!el) return;
  const mapa = {
    izquierda: "left",
    izquierdo: "left",
    centro: "center",
    derecha: "right",
    derecho: "right",
    justificado: "justify",
    justificada: "justify",
  };
  const valor = mapa[String(alineacion || "").toLowerCase().trim()];
  if (valor) el.style.textAlign = valor;
}
