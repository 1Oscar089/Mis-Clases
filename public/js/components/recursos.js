// ============================================================
// recursos.js — Página «Recursos» (js/components/recursos.js) · v5
//
// NUEVO EN v5 (arreglo del guardado + ciclos + materias visibles):
//   · ARREGLADO «No se pudo guardar el recurso: … reading 'indexOf'»:
//     el botón «Crear recurso» llamaba abrirCrear DIRECTAMENTE con
//     addEventListener → el EVENTO del clic entraba como `editando`
//     (esEdicion = true), y al guardar se pedía editando.id =
//     undefined → doc() recibía un segmento undefined y el SDK de
//     Firestore lanzaba ese error. Ahora: función flecha + guardia en
//     abrirCrear (solo es edición si llega id + grado + materia).
//   · MATERIAS POR CICLO (estudiante): usa materiasDeGrado() de
//     clases.js — de 4º a 6º segundo ciclo, de 7º a 9º tercer ciclo.
//   · MATERIAS VISIBLES (docente): botón «Materias visibles» con un
//     grado elegido (mismo diálogo de clases.js, se guarda en
//     clases/{grado}/config/materias vía db.materias). Si oculta una
//     materia, sus recursos desaparecen para los estudiantes de ese
//     grado y el que tenga uno abierto vuelve solo al inicio (VIGÍA).
//
// NUEVO EN v4 (los 3 pedidos):
//   1. PDF CON CACHÉ LOCAL: el PDF se baja UNA sola vez y queda
//      guardado en el navegador (Cache API). Las siguientes
//      aperturas son INSTANTÁNEAS: nada de volver a recargar.
//   2. PÁGINA EXACTA: el visor propio (pdf.js, también cacheado)
//      detecta SOLO la página donde vas mientras lees y la guarda.
//      Al cerrar y reabrir llegas EXACTAMENTE a ella (ej. la 100).
//   3. TARJETAS PREDEFINIDAS: el título ya NO se recorta a 2
//      líneas — «Libro de texto 7mo grado» se lee COMPLETO.
//
// REHECHA «tipo docsdrive.js, pero gestionado desde Firebase».
// Todo vive en ESTE archivo: la vista, el creador y el visor.
//
// SE GUARDA COMO LAS PIEZAS en Firestore (vía db.js, la única capa
// de datos del proyecto):
//   clases/{grado}/{materiaId}/{id}
//     { tipo:"recurso", visible:true|false, dia:"", unidad:"",
//       leccion:"", clase (título), enlace, creadoEn, creadoPor }
//   Los recursos creados con la versión anterior siguen apareciendo.
//
// VISTA DEL DOCENTE — POR GRADOS:
//   · Fila de chips: «Todos los grados» + cada grado (Parvularia 4
//     a 9°). El elegido se recuerda en localStorage.
//   · Debajo, EL LISTADO COMPLETO del grado: agrupado POR MATERIA
//     (A→Z) y dentro de cada materia ordenado POR TÍTULO (A→Z).
//   · Botón «Crear recurso»: pide TÍTULO, ENLACE, GRADO y MATERIA.
//     Detecta el tipo del enlace EN VIVO mientras se escribe.
//   · OJO visible/invisible y PAPELERA eliminar en cada tarjeta
//     (solo iconos, dentro de la tarjeta). Un recurso invisible NO
//     existe para el estudiante; al eliminarlo, los estudiantes que
//     lo tengan abierto vuelven solos al inicio (VIGÍA).
//
// VIGÍA EN TIEMPO REAL (estudiante):
//   · db.clases.vigilar escucha los recursos del grado del estudiante.
//     Si el recurso ABIERTO (modal) se elimina o pasa a invisible,
//     el modal se cierra y el estudiante vuelve solo a inicio.js.
//
// VISTA DEL ESTUDIANTE — UNA SOLA VISTA:
//   · Sin chips ni selecciones: entran y ven TODOS sus recursos del
//     grado, POR MATERIA (A→Z) y por título (A→Z). Solo los VISIBLES.
//
// ENLACES ACEPTADOS (cualquiera, se detecta el tipo solo):
//   · Google Drive/Docs (archivo, documento, hoja, presentación,
//     formulario, carpeta) → visor de Google embebido.
//   · YouTube / Vimeo → reproductor embebido.
//   · Imagen (.png .jpg .gif .webp .svg …) → se muestra.
//   · Audio (.mp3 .wav .ogg …) y video (.mp4 .webm …) → reproductor.
//   · PDF → visor rápido propio: queda en el dispositivo (caché) y
//     la página se detecta/guarda sola (con plan B: visor del navegador).
//   · Cualquier otra URL http(s) → iframe (página web).
//   · URL DEL PROYECTO también vale: «recursos/img/foto.png» o
//     «/recursos/js/visuales/reloj.js» — rutas relativas incluidas.
//
// TARJETA → MODAL: al hacer clic la tarjeta abre un modal con el
// recurso. Solo se cierra con la ✕ (clic afuera y Esc se ignoran,
// misma convención de docsdrive). Botón «Abrir en pestaña nueva»
// siempre a mano.
//
// TAMAÑOS FÁCILES DE CAMBIAR: todo está en el objeto CONFIG de
// abajo (modal, imagen, video, audio, web). Cambia un valor y listo.
//
// PROGRESO en localStorage (clave "mco_recursos_progreso_v1"):
//   · Documentos con páginas (PDF/Drive): pill «Página − n +» que se
//     guarda sola. En los PDF PROPIOS (tipo "pdf") la página se
//     detecta SOLA mientras lees (visor pdf.js) y al reabrir llegas
//     exacto a donde ibas; los de Drive siguen con #page=N manual.
//   · Audio y video: se recuerda el MINUTO donde iba y se retoma.
//   · Cada tarjeta visitada guarda última vez + veces: al volver a
//     entrar, el aviso «Continúa donde ibas» abre el último recurso.
//   · El docente recuerda además su GRADO elegido.
//
// REGLA DEL PROYECTO: nada toca Firestore directo → todo pasa por
// db.js. CSS implícito inyectado UNA vez. 100% responsivo. Textos
// SIEMPRE escapados (escapeHtml). Convención: fondo blanco, paleta
// del proyecto (morado #7c3aed · acentos por tipo de recurso).
// ============================================================

import { db } from "../data/db.js";
import { GRADOS } from "./auth.js";
import { MATERIAS, materiasDeGrado, abrirMateriasVisibles } from "./clases.js";
import { renderUserbar } from "./userbar.js";
import { renderInicio } from "./inicio.js";
import { escapeHtml } from "../utils/helpers.js";

/* ============================================================
   CONFIG — TAMAÑOS (modifícalos aquí si hace falta)
   Cualquier valor acepta unidades CSS ("px", "vh", "min(…)").
   ============================================================ */

export const CONFIG = {
  // Tamaño del MODAL del recurso (el grande que abre la tarjeta)
  modal: { ancho: "min(1100px, 96vw)", alto: "min(860px, 92vh)" },
  // Imagen mostrada dentro del modal
  imagen: { altoMax: "76vh" },
  // Video propio (.mp4/.webm) dentro del modal
  video: { altoMax: "76vh" },
  // Audio dentro del modal
  audio: { ancho: "min(520px, 90%)" },
  // YouTube / Vimeo (se respeta la proporción 16:9)
  web: { ancho: "min(920px, 100%)", relacion: "16 / 9" },
  // En móviles el modal ocupa TODA la pantalla (recomendado: true)
  movilPantallaCompleta: true,
};

/* ---------------- Constantes ---------------- */

const VERSION = 2;
const CLAVE_PROGRESO = "mco_recursos_progreso_v1";
const CLAVE_GRADO_DOCENTE = "mco_recursos_doc_grado";
const cacheDocente = (g) => `mco_recursos_doc_${g}`;
const cacheEstudiante = (g) => `mco_recursos_est_${g}`;

// Etiqueta y colores de la FICHA según el TIPO de recurso
const TIPOS = {
  imagen:   { etiqueta: "IMG",    fondo: "#dcfce7", color: "#15803d" },
  audio:    { etiqueta: "AUDIO",  fondo: "#f3e8ff", color: "#7e22ce" },
  video:    { etiqueta: "VID",    fondo: "#ffe4e6", color: "#be123c" },
  youtube:  { etiqueta: "YT",     fondo: "#ffe4e6", color: "#be123c" },
  vimeo:    { etiqueta: "VID",    fondo: "#ffe4e6", color: "#be123c" },
  pdf:      { etiqueta: "PDF",    fondo: "#ffedd5", color: "#c2410c" },
  garchivo: { etiqueta: "PDF",    fondo: "#ffedd5", color: "#c2410c" },
  gdoc:     { etiqueta: "DOC",    fondo: "#dbeafe", color: "#1d4ed8" },
  ghoja:    { etiqueta: "HOJA",   fondo: "#d1fae5", color: "#047857" },
  gdiap:    { etiqueta: "DIAP",   fondo: "#fef9c3", color: "#a16207" },
  gform:    { etiqueta: "FORM",   fondo: "#ede9fe", color: "#6d28d9" },
  gcarpeta: { etiqueta: "CARPETA", fondo: "#f1f5f9", color: "#475569" },
  descarga: { etiqueta: "ARCHIVO", fondo: "#e2e8f0", color: "#475569" },
  web:      { etiqueta: "LINK",   fondo: "#e0e7ff", color: "#4338ca" },
};

// Tipos con PÁGINAS: llevan la pill «Página − n +» (progreso guardado)
const CON_PAGINAS = new Set(["pdf", "garchivo", "gdoc", "ghoja", "gdiap", "gcarpeta"]);

// Extensiones conocidas (el resto de URL cae como «web»)
const EXT_IMAGEN = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"];
const EXT_AUDIO = ["mp3", "wav", "ogg", "oga", "m4a", "aac", "opus", "flac"];
const EXT_VIDEO = ["mp4", "webm", "ogv", "mov", "m4v", "mkv"];
const EXT_DESCARGA = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "csv", "txt"];

// Sitios que PROHÍBEN ser mostrados dentro de un iframe (responden
// «X-Frame-Options: sameorigin» o una política CSP). Intentarlo solo
// produce el error «Refused to display…» y un modal en blanco: con
// estos dominios se muestra DIRECTO la ficha con el botón «Abrir
// recurso» — sin iframe, sin errores de conexión en la consola.
const DOMINIOS_SIN_IFRAME = [
  "mined.gob.sv", "google.com/search", "facebook.com", "instagram.com",
  "twitter.com", "x.com", "tiktok.com", "whatsapp.com", "wa.me", "t.me",
  "mail.google.com", "gmail.com", "outlook.live.com", "outlook.com",
  "meet.google.com", "zoom.us", "teams.microsoft.com", "linkedin.com",
  "pinterest.com", "reddit.com", "netflix.com", "twitch.tv", "spotify.com",
  "amazon.com", "mercadolibre.com", "ebay.com", "tumblr.com", "discord.com",
];

// Dominio (o ruta si no hay esquema) de una URL — para mensajes.
function hostDe(url) {
  const t = String(url || "").trim();
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(t);
  return m ? m[1] : t.split(/[/?#]/)[0] || t;
}

// ¿Admite esta URL ser embebida en un iframe? (mejor esfuerzo por
// dominio conocido; lo desconocido SÍ se intenta, con la nota de
// «usa el botón Abrir» ya presente para el tipo web).
function puedeIframe(url) {
  const t = String(url || "").trim().toLowerCase();
  if (!t) return false;
  let host = hostDe(t).toLowerCase();
  if (host.startsWith("www.")) host = host.slice(4);
  return !DOMINIOS_SIN_IFRAME.some((d) => {
    if (d.includes("/")) return t.includes(d); // rutas p. ej. "google.com/search"
    return host === d || host.endsWith("." + d);
  });
}

// Colores que rotan por materia (punto del encabezado de grupo)
const COLORES_MATERIA = [
  "#7c3aed", "#dc2626", "#ea580c", "#2563eb",
  "#16a34a", "#0891b2", "#db2777", "#65a30d",
];

const SVG_X =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2.6" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M6 6l12 12M18 6L6 18"/></svg>';

const SVG_OJO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';

const SVG_LAPIZ =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';

const SVG_PAPELERA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
  '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
  '<path d="M10 11v6M14 11v6"/></svg>';

const SVG_CANDADO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

const SVG_CANDADO_ABIERTO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>';

let estilosListos = false;
let vigiaCierreListo = false; // listeners globales de guardado (una sola vez)

/* ---------------- Helpers de texto ---------------- */

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// "Sumas con llevando" → "sumas-con-llevando" (para ids de documento)
function slug(texto) {
  return (
    normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) ||
    "recurso"
  );
}

function nombreGrado(id) {
  const g = GRADOS.find((x) => x.id === Number(id));
  return g ? g.nombre : `Grado ${id}`;
}

function materiaDe(id) {
  return MATERIAS.find((m) => m.id === id) || { id, nombre: id };
}

function colorMateria(materiaId) {
  let h = 0;
  const t = normalizar(materiaId);
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return COLORES_MATERIA[h % COLORES_MATERIA.length];
}

// Toast de aviso (mismo patrón que clases.js / auth.js)
function notify(mensaje, variant = "warning", duracion = 4200) {
  try {
    const alerta = document.createElement("sl-alert");
    alerta.setAttribute("variant", variant);
    alerta.setAttribute("closable", "");
    alerta.setAttribute("duration", String(duracion));
    alerta.textContent = mensaje;
    document.body.append(alerta);
    customElements.whenDefined("sl-alert").then(() => alerta.toast());
  } catch (e) {
    console.warn("[aviso]", mensaje);
  }
}

/* ---------------- Enlaces: tipo y visor ---------------- */

// Extensión del archivo quitando ?query y #hash → "png", "pdf"…
function extensionDe(url) {
  const limpia = String(url || "").split(/[?#]/)[0];
  const m = /\.([a-z0-9]{1,5})$/i.exec(limpia);
  return m ? m[1].toLowerCase() : "";
}

// Solo http(s) o rutas SIN esquema (relativas del proyecto).
// Bloquea javascript:, data:, file:, etc.
function esUrlSegura(url) {
  const t = String(url || "").trim();
  if (!t) return false;
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(t);
  if (m) return /^https?$/i.test(m[1]);
  return true;
}

/**
 * resolverEnlace("…") → { tipo, id }
 * tipo: imagen · audio · video · youtube · vimeo · pdf · garchivo
 *       gdoc · ghoja · gdiap · gform · gcarpeta · descarga · web
 * Lanza Error con mensaje claro si el enlace está vacío o no es
 * http(s)/ruta del proyecto.
 */
export function resolverEnlace(enlace) {
  const url = String(enlace || "").trim();
  if (!url) throw new Error("Escribe el enlace del recurso.");
  if (!esUrlSegura(url)) {
    throw new Error(`El enlace "${url}" no es válido: usa http(s)… o una ruta del proyecto (recursos/…).`);
  }

  let m;
  // Google Drive / Docs
  m = url.match(/drive\.google\.com\/file\/d\/([-\w]{10,})/i);
  if (m) return { tipo: "garchivo", id: m[1] };
  m = url.match(/docs\.google\.com\/document\/d\/([-\w]{10,})/i);
  if (m) return { tipo: "gdoc", id: m[1] };
  m = url.match(/docs\.google\.com\/spreadsheets\/d\/([-\w]{10,})/i);
  if (m) return { tipo: "ghoja", id: m[1] };
  m = url.match(/docs\.google\.com\/presentation\/d\/([-\w]{10,})/i);
  if (m) return { tipo: "gdiap", id: m[1] };
  m = url.match(/docs\.google\.com\/forms\/d(?:_e)?\/([-\w]{10,})/i);
  if (m) return { tipo: "gform", id: m[1] };
  m = url.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([-\w]{10,})/i);
  if (m) return { tipo: "gcarpeta", id: m[1] };
  if (/drive\.google\.com/i.test(url)) {
    m = url.match(/[?&]id=([-\w]{10,})/i); // open?id=… de Drive
    if (m) return { tipo: "garchivo", id: m[1] };
  }

  // YouTube / Vimeo
  m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([-\w]{6,})/i);
  if (m) return { tipo: "youtube", id: m[1] };
  m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/i);
  if (m) return { tipo: "vimeo", id: m[1] };

  // Por extensión (incluye rutas del proyecto: recursos/img/foto.png)
  const ext = extensionDe(url);
  if (EXT_IMAGEN.includes(ext)) return { tipo: "imagen", id: url };
  if (EXT_AUDIO.includes(ext)) return { tipo: "audio", id: url };
  if (EXT_VIDEO.includes(ext)) return { tipo: "video", id: url };
  if (ext === "pdf") return { tipo: "pdf", id: url };
  if (EXT_DESCARGA.includes(ext)) return { tipo: "descarga", id: url };

  return { tipo: "web", id: url };
}

// URL que se METE DENTRO del modal (visor embebible)
function urlInterna(rec) {
  const { tipo, id } = rec._res;
  switch (tipo) {
    case "garchivo":  return `https://drive.google.com/file/d/${id}/preview`;
    case "gdoc":      return `https://docs.google.com/document/d/${id}/preview`;
    case "ghoja":     return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    case "gdiap":     return `https://docs.google.com/presentation/d/${id}/preview`;
    case "gform":     return `https://docs.google.com/forms/d/${id}/viewform?embedded=true`;
    case "gcarpeta":  return `https://drive.google.com/embeddedfolderview?id=${id}#list`;
    case "youtube":   return `https://www.youtube.com/embed/${id}`;
    case "vimeo":     return `https://player.vimeo.com/video/${id}`;
    default:          return rec.enlace; // imagen/audio/video/pdf/web/descarga: tal cual
  }
}

// URL que se abre EN PESTAÑA NUEVA (el original, no el visor)
function urlExterna(rec) {
  const { tipo, id } = rec._res;
  if (tipo === "youtube") return `https://www.youtube.com/watch?v=${id}`;
  if (tipo === "vimeo") return `https://vimeo.com/${id}`;
  return rec.enlace;
}

function textoTipo(rec) {
  const frases = {
    imagen: "Imagen: se muestra directamente",
    audio: "Audio: reproductor con posición guardada",
    video: "Video: reproductor con posición guardada",
    youtube: "Video de YouTube",
    vimeo: "Video de Vimeo",
    pdf: "PDF: queda guardado en tu dispositivo; la página se marca sola",
    garchivo: "Archivo de Google Drive (PDF u otro)",
    gdoc: "Documento de Google",
    ghoja: "Hoja de cálculo de Google",
    gdiap: "Presentación de Google",
    gform: "Formulario de Google",
    gcarpeta: "Carpeta de Google Drive",
    descarga: "Archivo para abrir o descargar",
    web: "Página web embebida",
  };
  return frases[rec._res.tipo] || "Enlace";
}

/* ---------------- Progreso en localStorage ----------------
   Un registro por recurso: clave "{grado}/{materiaId}/{id}".
   { pagina, tiempo, ultimaVez, veces }  */

function leerProgreso() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_PROGRESO) || "{}");
    return datos && typeof datos === "object" ? datos : {};
  } catch {
    return {}; // JSON corrupto o localStorage bloqueado: se empieza limpio
  }
}

function escribirProgreso(datos) {
  try {
    localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(datos));
  } catch {
    /* modo privado / lleno: el progreso simplemente no se recuerda */
  }
}

function registroProgreso(clave) {
  return leerProgreso()[clave] || null;
}

function fusionar(clave, cambios) {
  const mapa = leerProgreso();
  const antes = mapa[clave] || {};
  mapa[clave] = {
    pagina: Math.max(1, Number(antes.pagina) || 1),
    tiempo: Math.max(0, Number(antes.tiempo) || 0),
    ultimaVez: antes.ultimaVez || null,
    veces: Number(antes.veces) || 0,
    ...cambios,
  };
  escribirProgreso(mapa);
}

// Marca la APERTURA de un recurso (veces + última vez; conserva página/tiempo)
function marcarApertura(clave) {
  fusionar(clave, {
    ultimaVez: new Date().toISOString(),
    veces: (Number(registroProgreso(clave)?.veces) || 0) + 1,
  });
}

function guardarPagina(clave, pagina) {
  fusionar(clave, { pagina: Math.max(1, Math.round(Number(pagina) || 1)) });
}

function guardarTiempo(clave, segundos) {
  fusionar(clave, { tiempo: Math.max(0, Math.round(Number(segundos) || 0)) });
}

// Al MOVER un recurso (otro grado/materia) su progreso —página y
// minuto— viaja a la clave nueva sin perderse.
function migrarProgreso(claveVieja, claveNueva) {
  if (!claveVieja || !claveNueva || claveVieja === claveNueva) return;
  const mapa = leerProgreso();
  if (mapa[claveVieja]) {
    mapa[claveNueva] = mapa[claveVieja];
    delete mapa[claveVieja];
    escribirProgreso(mapa);
  }
}

// ¿Lleva progreso digno de «Retomar»? (página > 1 o más de 5 s de media)
function llevaProgreso(reg) {
  if (!reg) return false;
  return (Number(reg.pagina) || 1) > 1 || (Number(reg.tiempo) || 0) >= 5;
}

function textoRetomar(reg) {
  const pag = Number(reg.pagina) || 1;
  const seg = Number(reg.tiempo) || 0;
  if (pag > 1) return `pág. ${pag}`;
  const min = Math.floor(seg / 60);
  const resto = Math.round(seg % 60);
  return min > 0 ? `min ${min}:${String(resto).padStart(2, "0")}` : `${seg} s`;
}

/* ---------------- Estilos (UNA sola vez) ----------------
   Los tamaños salen de CONFIG: cambia CONFIG y cambia todo. */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const C = CONFIG;
  const estilo = document.createElement("style");
  estilo.id = "recursos-estilos";
  estilo.textContent = `
    .rec-vista { max-width: 1100px; margin: 0 auto;
      padding: 1.25rem clamp(1rem, 4vw, 2rem) 2.5rem;
      font-family: system-ui, sans-serif; color: #0f172a; }
    .rec-vista *, .rec-vista *::before, .rec-vista *::after { box-sizing: border-box; }

    /* ── Barra superior: volver + chips de grados + crear ── */
    .rec-barra { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-bottom: .75rem; }
    .rec-btn-volver { display: inline-flex; align-items: center; gap: .3rem;
      border: 1px solid #e5e7eb; background: #fff; color: #4b5563;
      border-radius: 999px; padding: .42rem .85rem; font-size: .85rem; font-weight: 600;
      cursor: pointer; transition: border-color .15s, color .15s, box-shadow .15s; }
    .rec-btn-volver:hover { border-color: #7c3aed; color: #7c3aed;
      box-shadow: 0 4px 14px rgba(124, 58, 237, .12); }

    .rec-chips { display: flex; flex-wrap: wrap; gap: .4rem; flex: 1; min-width: 0; }
    .rec-chip { display: inline-flex; align-items: center; gap: .35rem;
      border: 1px solid #e5e7eb; background: #fff; color: #6b7280;
      border-radius: 999px; padding: .38rem .8rem; font-size: .84rem; font-weight: 600;
      cursor: pointer; white-space: nowrap; transition: border-color .15s, background .15s, color .15s; }
    .rec-chip:hover { border-color: #7c3aed; color: #7c3aed; }
    .rec-chip.activa { background: #7c3aed; border-color: #7c3aed; color: #fff; }
    .rec-chip .rec-cuenta { font-size: .7rem; font-weight: 800; opacity: .75; }

    .rec-btn-crear { display: inline-flex; align-items: center; gap: .4rem;
      background: #16a34a; color: #fff; border: none; border-radius: 999px;
      padding: .55rem 1rem; font-size: .88rem; font-weight: 700; cursor: pointer;
      white-space: nowrap; box-shadow: 0 6px 18px rgba(22, 163, 74, .28);
      transition: background .15s, transform .15s; }
    .rec-btn-crear:hover { background: #15803d; }
    .rec-btn-crear:active { transform: scale(.98); }

    /* ── Buscador ── */
    .rec-buscador-fila { display: flex; gap: .6rem; align-items: center; margin-bottom: 1.1rem; }
    .rec-buscador { flex: 1; min-width: 0; }

    /* ── Aviso «Continúa donde ibas» ── */
    .rec-retomar { display: flex; align-items: center; flex-wrap: wrap; gap: .55rem;
      background: #fffbeb; border: 1px solid #fde68a; color: #92400e;
      border-radius: .8rem; padding: .6rem .85rem; margin: 0 0 1rem; font-size: .88rem; }
    .rec-retomar sl-icon { font-size: 1.1rem; }
    .rec-retomar b { color: #78350f; }
    .rec-retomar-btn { border: none; background: #f59e0b; color: #fff;
      border-radius: 999px; padding: .32rem .9rem; font-size: .8rem; font-weight: 800;
      cursor: pointer; margin-left: auto; transition: filter .15s; }
    .rec-retomar-btn:hover { filter: brightness(1.08); }

    /* ── Listado por materia ── */
    .rec-sub { color: #64748b; font-size: .88rem; margin: 0 0 1rem; }
    .rec-materia { margin: 0 0 1.35rem; }
    .rec-materia-cab { display: flex; align-items: center; gap: .5rem; margin: 0 0 .6rem; }
    .rec-punto { width: 11px; height: 11px; border-radius: 50%; flex: none; }
    .rec-materia-titulo { font-size: 1.02rem; font-weight: 700; margin: 0; }
    .rec-conteo { font-size: .72rem; font-weight: 600; color: #475569;
      background: #f1f5f9; border-radius: 999px; padding: 2px 9px; }

    .rec-rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: .75rem; }

    /* ── Tarjeta del recurso ── */
    /* flex-wrap: en tarjetas angostas los botones del docente BAJAN a
       una segunda fila y el título recupera su ancho (antes quedaba
       con espacio 0 y se partía letra por letra). */
    .rec-tarjeta { display: flex; flex-wrap: wrap; align-items: center;
      gap: .55rem .7rem; text-align: left;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: .65rem .7rem; cursor: pointer; font: inherit; color: inherit;
      transition: border-color .15s, box-shadow .15s, transform .15s; }
    .rec-tarjeta:hover { border-color: #6ee7b7;
      box-shadow: 0 4px 14px rgba(22, 163, 74, .14); transform: translateY(-1px); }
    .rec-tarjeta:focus-visible { outline: 2px solid #16a34a; outline-offset: 2px; }
    .rec-tarjeta.esta-oculta { opacity: .78; border-style: dashed; }
    .rec-tarjeta.esta-bloqueada { cursor: not-allowed; }
    .rec-ficha { width: 46px; height: 46px; border-radius: 10px; flex: none;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: .6rem; letter-spacing: .02em; }
    .rec-ficha[data-tipo="gcarpeta"], .rec-ficha[data-tipo="descarga"] { font-size: .48rem; }
    /* flex-basis AUTO (no 0): con flex-wrap, el título RESERVA su ancho
       de contenido y los botones del docente bajan a la 2ª fila; con
       basis 0 la línea «cerraba» con el título en ~0px y se partía
       letra por letra. */
    .rec-cuerpo { min-width: 0; flex: 1 1 auto; }
    /* TARJETA PREDEFINIDA: el título NO se recorta — se lee COMPLETO
       (p. ej. «Libro de texto 7mo grado»); min-height fija 2 líneas
       para que todas las tarjetas se vean uniformes. */
    .rec-nombre { font-size: .92rem; font-weight: 650; color: #1e293b; line-height: 1.3;
      min-height: 2.6em; overflow-wrap: anywhere; }
    .rec-datos { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .3rem; }
    .rec-dato { font-size: .68rem; font-weight: 600; color: #475569;
      background: #f1f5f9; padding: 1px 7px; border-radius: 999px; }
    .rec-aviso-pag { font-weight: 700; color: #1d4ed8; background: #dbeafe;
      border: 1px solid #bfdbfe; white-space: nowrap; }
    .rec-retomar-chip { font-size: .68rem; font-weight: 700; color: #92400e;
      background: #fef3c7; border: 1px solid #fde68a; padding: 1px 7px; border-radius: 999px; }
    .rec-oculta-tag { display: inline-flex; align-items: center; gap: .25rem;
      font-size: .68rem; font-weight: 800; color: #b91c1c;
      background: #fef2f2; border: 1px solid #fecaca; padding: 1px 7px; border-radius: 999px; }
    .rec-bloqueada-tag { display: inline-flex; align-items: center; gap: .25rem;
      font-size: .68rem; font-weight: 800; color: #b45309;
      background: #fffbeb; border: 1px solid #fde68a; padding: 1px 7px; border-radius: 999px; }
    .rec-ojo { display: inline-flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; border-radius: 9px; border: 1px solid #e5e7eb;
      background: #f9fafb; color: #6b7280; cursor: pointer; flex: none;
      transition: border-color .15s, color .15s, background .15s; }
    .rec-ojo:hover { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }
    .rec-ojo.visible { border-color: #a7f3d0; background: #ecfdf5; color: #059669; }
    .rec-ojo.eliminar:hover { border-color: #fca5a5; background: #fef2f2; color: #b91c1c; }
    .rec-ojo svg { width: 17px; height: 17px; }
    /* Grupo de botones del docente: baja COMPLETO a la segunda fila
       cuando la tarjeta es angosta (no botón por botón). */
    .rec-acciones { display: flex; align-items: center; gap: .35rem;
      margin-left: auto; flex: none; }

    /* ── Estados vacíos / cargando ── */
    .rec-vacio { border: 2px dashed #e5e7eb; border-radius: 1rem; padding: 2.1rem 1.2rem;
      text-align: center; color: #6b7280; background: #f8fafc; }
    .rec-vacio sl-icon { font-size: 2rem; color: #16a34a; }
    .rec-vacio h3 { margin: .55rem 0 .3rem; color: #374151; font-size: 1.05rem; }
    .rec-vacio p { margin: 0; font-size: .9rem; }
    .rec-cargando { text-align: center; color: #9ca3af; padding: 2rem 0; font-size: .92rem; }

    /* ── MODAL del recurso (SOLO se cierra con la ✕) ── */
    html.rec-abierto, html.rec-abierto body { overflow: hidden !important; }
    .rec-fondo { position: fixed; inset: 0; z-index: 9990;
      background: rgba(15, 23, 42, .58);
      display: flex; align-items: center; justify-content: center; padding: 1.2rem; }
    .rec-modal { width: ${C.modal.ancho}; height: ${C.modal.alto};
      background: #fff; border-radius: 14px;
      box-shadow: 0 25px 60px rgba(2, 6, 23, .35);
      display: flex; flex-direction: column; overflow: hidden; }
    .rec-modal-cab { display: flex; align-items: center; gap: .6rem;
      padding: .55rem .7rem; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
    .rec-modal-ficha { width: 38px; height: 38px; border-radius: 9px; flex: none;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: .55rem; letter-spacing: .02em; }
    .rec-modal-ficha[data-tipo="gcarpeta"], .rec-modal-ficha[data-tipo="descarga"] { font-size: .44rem; }
    .rec-modal-titulos { min-width: 0; flex: 1 1 200px; }
    .rec-modal-titulo { font-size: .98rem; font-weight: 700; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rec-modal-sub { display: flex; flex-wrap: wrap; gap: .3rem; font-size: .74rem; color: #64748b; margin-top: 1px; }
    .rec-pill { display: inline-flex; align-items: center; gap: .4rem;
      background: #f1f5f9; border-radius: 999px; padding: 3px 6px 3px 10px;
      font-size: .78rem; font-weight: 600; color: #334155; white-space: nowrap; }
    .rec-pill button { width: 24px; height: 24px; border-radius: 50%;
      border: 1px solid #cbd5e1; background: #fff; color: #334155;
      font-size: .95rem; line-height: 1; cursor: pointer;
      display: flex; align-items: center; justify-content: center; padding: 0; }
    .rec-pill button:hover { background: #f1f5f9; }
    .rec-pill input { width: 46px; text-align: center; border: 1px solid #e2e8f0;
      border-radius: 6px; font: inherit; font-weight: 700; color: #0f172a;
      padding: 2px 2px; background: #fff; }
    .rec-pill input::-webkit-outer-spin-button,
    .rec-pill input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .rec-pill input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
    .rec-abrir-btn { display: inline-flex; align-items: center; gap: .3rem;
      border: 1px solid #e2e8f0; background: #fff; color: #475569;
      border-radius: 999px; padding: .3rem .75rem; font-size: .76rem; font-weight: 700;
      cursor: pointer; text-decoration: none; white-space: nowrap;
      transition: border-color .15s, color .15s; }
    .rec-abrir-btn:hover { border-color: #7c3aed; color: #7c3aed; }
    .rec-x { width: 38px; height: 38px; border-radius: 50%; border: none;
      background: #fee2e2; color: #b91c1c; cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex: none; margin-left: auto; }
    .rec-x:hover { background: #fecaca; }
    .rec-x:focus-visible { outline: 2px solid #b91c1c; outline-offset: 2px; }
    .rec-x svg { width: 16px; height: 16px; }
    .rec-modal-cuerpo { flex: 1; min-height: 0; background: #f8fafc; position: relative; }
    .rec-iframe { width: 100%; height: 100%; border: 0; display: block; }
    .rec-nota-web { font-size: .72rem; color: #64748b; background: #f1f5f9;
      padding: 3px 12px; border-bottom: 1px solid #e2e8f0; }

    /* ── Visor PDF PROPIO (caché local + página detectada sola) ── */
    .rec-pdf { position: absolute; inset: 0; overflow: auto;
      overscroll-behavior: contain; background: #525659;
      -webkit-overflow-scrolling: touch; }
    .rec-pdf-estado { position: absolute; inset: 0; display: flex; flex-direction: column;
      gap: .45rem; align-items: center; justify-content: center; color: #e5e7eb;
      font-size: .92rem; text-align: center; padding: 1rem; }
    .rec-pdf-estado sl-icon { font-size: 1.6rem; animation: rec-gira 1.1s linear infinite; }
    .rec-pdf-estado .rec-pdf-pct { font-weight: 800; }
    .rec-pdf-estado .rec-pdf-nota { font-size: .72rem; color: #cbd5e1; max-width: 330px; }
    @keyframes rec-gira { to { transform: rotate(360deg); } }
    .rec-pdf-flujo { display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 14px 0 22px; }
    .rec-pdf-pag { position: relative; background: #fff; border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, .45); overflow: hidden; max-width: 100%; }
    .rec-pdf-pag canvas { display: block; max-width: 100%; height: auto !important; }
    .rec-pdf-num { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #94a3b8; font-size: .95rem; font-weight: 700; }
    .rec-pdf-pag.lista .rec-pdf-num { display: none; }

    /* Cuerpos según tipo (tamaños desde CONFIG) */
    .rec-centro { width: 100%; height: 100%; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: .8rem; padding: 1rem; }
    .rec-centro img { max-width: 100%; max-height: ${C.imagen.altoMax};
      border-radius: 10px; box-shadow: 0 10px 30px rgba(2, 6, 23, .16); background: #fff; }
    .rec-centro video { max-width: 100%; max-height: ${C.video.altoMax};
      border-radius: 10px; box-shadow: 0 10px 30px rgba(2, 6, 23, .16); background: #000; }
    .rec-centro audio { width: ${C.audio.ancho}; }
    .rec-centro sl-icon { font-size: 2.6rem; color: #a78bfa; }
    .rec-web-video { width: ${C.web.ancho}; aspect-ratio: ${C.web.relacion};
      border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(2, 6, 23, .16);
      background: #000; }
    .rec-web-video iframe { width: 100%; height: 100%; border: 0; display: block; }
    .rec-descarga-caja { text-align: center; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 14px; padding: 1.6rem 1.4rem; max-width: 420px; }
    .rec-descarga-caja sl-icon { font-size: 2.4rem; color: #475569; }
    .rec-descarga-caja h3 { margin: .5rem 0 .25rem; font-size: 1rem; color: #1e293b; }
    .rec-descarga-caja p { margin: 0 0 .9rem; font-size: .82rem; color: #64748b;
      word-break: break-all; }
    .rec-sin-enlace { max-width: 460px; text-align: center; background: #fef2f2;
      border: 1px solid #fecaca; color: #7f1d1d; border-radius: 14px; padding: 1.4rem;
      font-size: .9rem; }

    /* ── Modal CREAR recurso ── */
    .rec-dialogo { --width: min(520px, 94vw); }
    .rec-dialogo::part(panel) { border-radius: 1.25rem; }
    .rec-dialogo sl-button[data-variante="guardar"]::part(base) {
      background: #16a34a; border-color: #16a34a; }
    .rec-dialogo sl-button[data-variante="guardar"]::part(base):hover {
      background: #15803d; border-color: #15803d; }
    .rec-form { display: grid; gap: .8rem; }
    .rec-form sl-input, .rec-form sl-select { width: 100%; }
    .rec-tipo-detectado { display: flex; align-items: center; gap: .45rem;
      font-size: .82rem; color: #475569; background: #f8fafc;
      border: 1px dashed #e2e8f0; border-radius: .6rem; padding: .5rem .65rem; }
    .rec-tipo-detectado .rec-ficha { width: 34px; height: 34px; font-size: .5rem;
      border-radius: 8px; flex: none; }
    .rec-tipo-detectado.err { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
    .rec-crea-info { margin: 0 0 .8rem; font-size: .82rem; color: #6b7280; }

    /* ── Celular ── */
    @media (max-width: 640px) {
      ${C.movilPantallaCompleta ? `
      .rec-fondo { padding: 0; }
      .rec-modal { width: 100%; height: 100%; border-radius: 0; }` : ""}
      .rec-rejilla { grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: .55rem; }
      .rec-ojo { width: 30px; height: 30px; }
      .rec-ojo svg { width: 15px; height: 15px; }
      .rec-modal-ficha { display: none; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Estado del módulo ---------------- */

let perfilActual = null;
let contenedorActual = null;
let esDocente = false;
let gradoSel = null;        // docente: número de grado | "todos" | null (sin elegir)
let recursosCache = [];     // [{ grado, materiaId, id, clase, enlace, visible, … }]
let textoBusqueda = "";
let cargando = false;
let vigiaRec = null;        // vigía del grado (estudiante): { quitar() }
let visibilidadMaterias = {}; // mapa del grado (estudiante): { materiaId: false… }

/* ---------------- Render ---------------- */

/**
 * Página «Recursos» (la llama inicio.js al hacer clic en la tarjeta).
 * @param {object} perfil           perfil del usuario (users/{uid})
 * @param {HTMLElement} contenedor  dónde dibujar (main#app)
 */
export function render(perfil, contenedor) {
  if (!perfil || !contenedor) return;
  perfilActual = perfil;
  contenedorActual = contenedor;
  esDocente = perfil.rol === "docente";
  recursosCache = [];
  textoBusqueda = "";
  cargando = false;
  gradoSel = null;
  visibilidadMaterias = {};

  if (esDocente) {
    try {
      const sel = JSON.parse(localStorage.getItem(CLAVE_GRADO_DOCENTE) || "null");
      if (sel && (sel.grado === "todos" || GRADOS.some((g) => g.id === Number(sel.grado)))) {
        gradoSel = sel.grado === "todos" ? "todos" : Number(sel.grado);
      }
    } catch (e) { /* localStorage no disponible: ignorar */ }
  }

  inyectarEstilos();
  vigilarCierre();
  renderUserbar(perfil, "Recursos");
  iniciarVigia();   // estudiante: cierra el modal si el recurso desaparece
  renderInterno();
  cargarListado();

  // Estudiante: mapa de MATERIAS VISIBLES del grado (db.js v5).
  // Repinta cuando llegue; el vigía (iniciarVigia) lo mantiene al día.
  if (!esDocente) {
    const grado = (perfil.grados || [])[0];
    if (grado != null) {
      db.materias.deGrado(grado).then((mapa) => {
        if (perfilActual !== perfil || esDocente) return; // ya cambió de vista
        visibilidadMaterias = mapa || {};
        pintarListado();
      });
    }
  }
}
export { render as renderRecursos };

/* ---------------- Estructura de la vista ---------------- */

function renderInterno() {
  const chips = esDocente
    ? `<div class="rec-chips" id="rec-chips">
        <button class="rec-chip${gradoSel === "todos" ? " activa" : ""}" data-grado="todos">
          <sl-icon name="stack"></sl-icon> Todos los grados
        </button>
        ${GRADOS.map(
          (g) => `
        <button class="rec-chip${gradoSel === g.id ? " activa" : ""}" data-grado="${g.id}">
          ${escapeHtml(g.nombre)}</button>`
        ).join("")}
      </div>
      <button class="rec-btn-crear" id="rec-btn-crear">
        <sl-icon name="plus-lg"></sl-icon> Crear recurso
      </button>
      ${gradoSel != null && gradoSel !== "todos" ? `
      <button class="rec-btn-volver" id="rec-btn-materias"
        title="Elegir qué materias ven los estudiantes de ${escapeHtml(nombreGrado(gradoSel))}">
        <sl-icon name="eye"></sl-icon> Materias visibles
      </button>` : ""}`
    : "";

  contenedorActual.innerHTML = `
    <div class="rec-vista">
      <div class="rec-barra">
        <button class="rec-btn-volver" id="rec-btn-volver">
          <sl-icon name="arrow-left"></sl-icon> Inicio
        </button>
        ${chips}
      </div>

      <div class="rec-buscador-fila">
        <sl-input class="rec-buscador" id="rec-buscador" clearable
          placeholder="Buscar recurso por título, materia o enlace…">
          <sl-icon name="search" slot="prefix"></sl-icon>
        </sl-input>
      </div>

      <div id="rec-retomar"></div>
      <div id="rec-zona"></div>
    </div>`;

  contenedorActual.querySelector("#rec-btn-volver").addEventListener("click", () => {
    quitarVigia();
    renderUserbar(perfilActual);
    renderInicio(perfilActual, contenedorActual);
  });

  if (esDocente) {
    // ⚠ CON FUNCIÓN FLECHA: addEventListener pasa el EVENTO como primer
    // argumento — abrirCrear(evento) entraba en modo EDICIÓN con
    // editando = evento (editando.id = undefined) y al guardar doc()
    // recibía un segmento undefined: «… reading 'indexOf'».
    contenedorActual.querySelector("#rec-btn-crear").addEventListener("click", () => abrirCrear());
    const btnMat = contenedorActual.querySelector("#rec-btn-materias");
    if (btnMat) btnMat.addEventListener("click", () => abrirMateriasVisibles(gradoSel));
    contenedorActual.querySelector("#rec-chips").addEventListener("click", (e) => {
      const btn = e.target.closest(".rec-chip");
      if (!btn) return;
      const valor = btn.dataset.grado;
      const nuevo = valor === "todos" ? "todos" : Number(valor);
      const cambio = gradoSel !== nuevo;
      gradoSel = nuevo;
      guardarGradoDocente();
      if (cambio) {
        renderInterno();
        cargarListado();
      }
    });
  }

  const buscador = contenedorActual.querySelector("#rec-buscador");
  buscador.value = textoBusqueda;
  buscador.addEventListener("sl-input", () => {
    textoBusqueda = buscador.value || "";
    pintarListado();
  });

  pintarListado();
}

function guardarGradoDocente() {
  try {
    localStorage.setItem(CLAVE_GRADO_DOCENTE, JSON.stringify({ grado: gradoSel }));
  } catch (e) { /* ignorar */ }
}

/* ---------------- Datos (Firestore vía db.js + caché) ---------------- */

function gradosDeLaVista() {
  if (!esDocente) return [(perfilActual.grados || [])[0]].filter((g) => g != null);
  if (gradoSel === "todos") return GRADOS.map((g) => g.id);
  return gradoSel == null ? [] : [gradoSel];
}

function claveCacheActual() {
  if (!esDocente) {
    const g = (perfilActual.grados || [])[0];
    return g == null ? null : cacheEstudiante(g);
  }
  return cacheDocente(gradoSel === "todos" ? "todos" : gradoSel);
}

function esRecurso(fila) {
  return (fila.tipo || "clase") === "recurso";
}

function leerCache() {
  const clave = claveCacheActual();
  if (!clave) return [];
  try {
    const lista = JSON.parse(localStorage.getItem(clave) || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function guardarCache() {
  const clave = claveCacheActual();
  if (!clave) return;
  try {
    // Sin los campos derivados (_res, _clave, _titulo): se recalculan
    const base = recursosCache.map((r) => {
      const { _res, _clave, _titulo, ...resto } = r;
      return resto;
    });
    localStorage.setItem(clave, JSON.stringify(base));
  } catch (e) { /* ignorar */ }
}

/** Carga el listado del (de los) grado(s) de la vista: caché primero,
 *  Firestore después (frescura). Filtra por tipo "recurso". */
async function cargarListado() {
  // 1) Caché local: pintado instantáneo
  recursosCache = leerCache().filter(esRecurso);
  pintarListado();

  const grados = gradosDeLaVista();
  if (!grados.length) { cargando = false; pintarListado(); return; }

  // 2) Frescura: Firestore (grado × materia, en paralelo). El
  //    estudiante SOLO carga las materias de SU ciclo; el docente, todas.
  cargando = true;
  if (!recursosCache.length) pintarListado();
  const pares = [];
  grados.forEach((g) => {
    const lista = esDocente ? MATERIAS : materiasDeGrado(g);
    lista.forEach((m) => pares.push({ grado: g, materiaId: m.id }));
  });
  try {
    const trozos = await Promise.all(
      pares.map(async (p) => {
        const lista = await db.clases.listar(p.grado, p.materiaId);
        return lista.map((d) => ({ ...p, ...d }));
      })
    );
    recursosCache = trozos.flat().filter(esRecurso);
    guardarCache();
  } catch (e) {
    if (!recursosCache.length) {
      notify("No se pudieron cargar los recursos: " + (e?.code || e?.message || "error"), "danger");
    } else {
      notify("Mostrando copia guardada (sin conexión con Firestore).", "warning");
    }
  } finally {
    cargando = false;
    pintarListado();
  }
}

/* ---------------- Listado: grupos por materia A→Z, títulos A→Z ---------------- */

function pintarListado() {
  const zona = contenedorActual.querySelector("#rec-zona");
  const zonaRetomar = contenedorActual.querySelector("#rec-retomar");
  if (!zona) return;

  // Docente sin grado elegido todavía
  if (esDocente && gradoSel == null) {
    zonaRetomar.innerHTML = "";
    zona.innerHTML = `
      <div class="rec-vacio">
        <sl-icon name="mortarboard"></sl-icon>
        <h3>Elige un grado</h3>
        <p>Selecciona un grado (o «Todos los grados») para ver sus recursos
           ordenados por materia.</p>
      </div>`;
    return;
  }

  // Estudiante sin grado en el perfil
  if (!esDocente && !(perfilActual.grados || []).length) {
    zonaRetomar.innerHTML = "";
    zona.innerHTML = `
      <div class="rec-vacio">
        <sl-icon name="mortarboard"></sl-icon>
        <h3>Sin grado asignado</h3>
        <p>Tu perfil no tiene grado asignado. Pide a tu institución que te lo configure.</p>
      </div>`;
    return;
  }

  // Estudiante: TODAS sus materias (de ciclo) ocultas por el docente
  const gradoEst = esDocente ? null : (perfilActual.grados || [])[0];
  if (!esDocente && gradoEst != null && materiasDeGrado(gradoEst).every(
    (m) => visibilidadMaterias[m.id] === false
  )) {
    zonaRetomar.innerHTML = "";
    zona.innerHTML = `
      <div class="rec-vacio">
        <sl-icon name="eye-slash"></sl-icon>
        <h3>Sin materias visibles</h3>
        <p>Tu docente no tiene ninguna materia visible para
           ${escapeHtml(nombreGrado(gradoEst))} por ahora.</p>
      </div>`;
    return;
  }

  if (cargando && !recursosCache.length) {
    zonaRetomar.innerHTML = "";
    zona.innerHTML = `<p class="rec-cargando">Cargando recursos…</p>`;
    return;
  }

  // Filtro por texto (título + materia + enlace) sobre filas enriquecidas
  const texto = normalizar(textoBusqueda);
  // Materias del CICLO del estudiante (la caché vieja puede traer
  // filas de otras materias: ya no se muestran)
  const materiasDelCiclo = new Set(
    gradoEst == null ? [] : materiasDeGrado(gradoEst).map((m) => m.id)
  );
  const visibles = recursosCache.map(prepararFila).filter((r) => {
    if (!esDocente) {
      // Piezas invisibles NO existen · materias ocultas por el docente
      // tampoco · y solo materias del ciclo del estudiante
      if (r.visible === false) return false;
      if (visibilidadMaterias[r.materiaId] === false) return false;
      if (!materiasDelCiclo.has(String(r.materiaId))) return false;
    }
    if (!texto) return true;
    const campo = normalizar(
      [r._titulo, materiaDe(r.materiaId).nombre, r.enlace, nombreGrado(r.grado)].join(" ")
    );
    return campo.includes(texto);
  });

  // Orden: materias A→Z y, dentro, títulos A→Z
  const grupos = new Map();
  for (const r of visibles) {
    if (!grupos.has(r.materiaId)) grupos.set(r.materiaId, []);
    grupos.get(r.materiaId).push(r);
  }
  const materias = [...grupos.keys()].sort((a, b) =>
    materiaDe(a).nombre.localeCompare(materiaDe(b).nombre, "es", { sensitivity: "base" })
  );

  const etiquetaGrados =
    !esDocente
      ? nombreGrado((perfilActual.grados || [])[0])
      : gradoSel === "todos"
        ? "todos los grados"
        : nombreGrado(gradoSel);
  const resumen = `${visibles.length} ${visibles.length === 1 ? "recurso" : "recursos"} · ${etiquetaGrados}`;

  let html = `<p class="rec-sub">${escapeHtml(resumen)}</p>`;

  if (!visibles.length) {
    html += `
      <div class="rec-vacio">
        <sl-icon name="folder2-open"></sl-icon>
        <h3>${texto ? "Sin resultados" : "No hay recursos todavía"}</h3>
        <p>${
          texto
            ? `Nada coincide con «${escapeHtml(textoBusqueda)}».`
            : esDocente
              ? "Usa el botón «Crear recurso» para añadir el primero: pide título, enlace, grado y materia."
              : "Cuando tu docente agregue recursos, aparecerán aquí ordenados por materia."
        }</p>
      </div>`;
    zona.innerHTML = html;
    pintarRetomar(zonaRetomar, []);
    return;
  }

  html += materias
    .map((materiaId) => {
      const filas = grupos
        .get(materiaId)
        .sort((a, b) =>
          a._titulo.localeCompare(b._titulo, "es", { sensitivity: "base" })
        );
      const color = colorMateria(materiaId);
      return `
      <div class="rec-materia">
        <div class="rec-materia-cab">
          <span class="rec-punto" style="background:${color}"></span>
          <h3 class="rec-materia-titulo">${escapeHtml(materiaDe(materiaId).nombre)}</h3>
          <span class="rec-conteo">${filas.length === 1 ? "1 recurso" : filas.length + " recursos"}</span>
        </div>
        <div class="rec-rejilla">${filas.map((r) => tarjetaHtml(r)).join("")}</div>
      </div>`;
    })
    .join("");

  zona.innerHTML = html;
  pintarRetomar(zonaRetomar, visibles);

  // Clic en cada tarjeta → abrir el recurso (el ojo NO abre el visor)
  zona.querySelectorAll(".rec-tarjeta").forEach((card) => {
    card.addEventListener("click", (e) => {
      const acc = e.target.closest?.("[data-acc]");
      const fila = visibles.find((r) => r._clave === card.dataset.clave);
      if (!fila) return;
      if (acc) {
        e.stopPropagation();
        if (acc.dataset.acc === "ojo") alternarVisible(fila);
        else if (acc.dataset.acc === "candado") alternarBloqueo(fila);
        else if (acc.dataset.acc === "editar") abrirEditar(fila);
        else if (acc.dataset.acc === "eliminar") abrirConfirmarEliminar(fila);
        return;
      }
      if (!esDocente && fila.bloqueada === true) {
        notify("«" + (fila._titulo || fila.id) + "» está bloqueado por tu docente.", "warning");
        return;
      }
      abrirRecurso(fila);
    });
  });
}

function tarjetaHtml(r) {
  const tipo = TIPOS[r._res.tipo] || TIPOS.web;
  const oculta = esDocente && r.visible === false;
  const bloqueada = r.bloqueada === true;
  const reg = registroProgreso(r._clave);
  const retomar = llevaProgreso(reg)
    ? `<span class="rec-retomar-chip">Retomar ${escapeHtml(textoRetomar(reg))}</span>`
    : "";
  const chipGrado =
    esDocente && gradoSel === "todos"
      ? `<span class="rec-dato">${escapeHtml(nombreGrado(r.grado))}</span>`
      : "";
  const sinEnlace = !String(r.enlace || "").trim()
    ? `<span class="rec-dato">sin enlace</span>`
    : "";

  return `
    <article class="rec-tarjeta${oculta ? " esta-oculta" : ""}${bloqueada && !esDocente ? " esta-bloqueada" : ""}" data-clave="${escapeHtml(r._clave)}"
             aria-label="Abrir ${escapeHtml(r._titulo)}">
      <span class="rec-ficha" data-tipo="${r._res.tipo}"
        style="background:${tipo.fondo};color:${tipo.color}">${tipo.etiqueta}</span>
      <span class="rec-cuerpo">
        <span class="rec-nombre">${escapeHtml(r._titulo)}</span>
        <span class="rec-datos">${chipGrado}${retomar}${sinEnlace}
          ${oculta ? `<span class="rec-oculta-tag"><sl-icon name="eye-slash"></sl-icon> Invisible</span>` : ""}
          ${bloqueada ? `<span class="rec-bloqueada-tag"><sl-icon name="lock"></sl-icon> Bloqueado</span>` : ""}
        </span>
      </span>
      ${esDocente ? `
      <span class="rec-acciones">
        <button class="rec-ojo" data-acc="editar" title="Editar recurso: título, enlace, grado y materia"
          aria-label="Editar recurso">${SVG_LAPIZ}</button>
        <button class="rec-ojo${oculta ? "" : " visible"}" data-acc="ojo" title="${oculta
          ? "Hacerlo visible para los estudiantes"
          : "Hacerlo invisible: no existirá para los estudiantes"}"
          aria-label="Cambiar visibilidad">${SVG_OJO}</button>
        <button class="rec-ojo${bloqueada ? "" : " visible"}" data-acc="candado" title="${bloqueada
          ? "Quitar el bloqueo: los estudiantes podrán abrirlo"
          : "Bloquear: lo verán pero no podrán abrirlo"}"
          aria-label="Bloquear o desbloquear">${bloqueada ? SVG_CANDADO : SVG_CANDADO_ABIERTO}</button>
        <button class="rec-ojo eliminar" data-acc="eliminar" title="Eliminar recurso"
          aria-label="Eliminar recurso">${SVG_PAPELERA}</button>
      </span>` : ""}
    </article>`;
}

/* ---------------- Aviso «Continúa donde ibas» ---------------- */

function pintarRetomar(zonaRetomar, visibles) {
  if (!zonaRetomar) return;
  const mapa = leerProgreso();
  let mejor = null;
  for (const r of visibles) {
    if (r.bloqueada === true) continue; // bloqueado: no se puede abrir
    const reg = mapa[r._clave];
    if (!reg || !reg.ultimaVez) continue;
    if (!mejor || String(reg.ultimaVez) > String(mapa[mejor._clave]?.ultimaVez)) mejor = r;
  }
  if (!mejor) { zonaRetomar.innerHTML = ""; return; }

  const reg = mapa[mejor._clave];
  const det = llevaProgreso(reg) ? ` — vas por ${escapeHtml(textoRetomar(reg))}` : "";
  zonaRetomar.innerHTML = `
    <div class="rec-retomar">
      <sl-icon name="arrow-clockwise"></sl-icon>
      <span>Continúa donde ibas: <b>${escapeHtml(mejor._titulo)}</b>${det}</span>
      <button class="rec-retomar-btn" id="rec-retomar-abrir">Abrir</button>
    </div>`;
  zonaRetomar.querySelector("#rec-retomar-abrir").addEventListener("click", () => abrirRecurso(mejor));
}

/* ---------------- Visible ⇄ invisible (docente) ---------------- */

async function alternarVisible(r) {
  const nuevo = r.visible === false;
  try {
    await db.clases.actualizar(r.grado, r.materiaId, r.id, { visible: nuevo });
    // la fila enriquecida es una COPIA: actualiza la fila CRUDA de la caché
    const cruda = recursosCache.find(
      (x) => x.grado === r.grado && x.materiaId === r.materiaId && x.id === r.id
    );
    if (cruda) cruda.visible = nuevo;
    guardarCache();
    pintarListado();
    notify(
      nuevo
        ? "«" + (r._titulo || r.id) + "» es VISIBLE: los estudiantes ya lo ven."
        : "«" + (r._titulo || r.id) + "» quedó INVISIBLE: para los estudiantes no existe.",
      "success"
    );
  } catch (e) {
    notify("No se pudo cambiar la visibilidad: " + (e?.code || e?.message || "error"), "danger");
  }
}

/* ---------------- Bloquear ⇄ desbloquear (docente) ----------------
   BLOQUEADO = el estudiante LO VE en el listado pero NO puede
   abrirlo. Es independiente del ojo: invisible = no existe. */

async function alternarBloqueo(r) {
  const nuevo = !(r.bloqueada === true);
  try {
    await db.clases.actualizar(r.grado, r.materiaId, r.id, { bloqueada: nuevo });
    // la fila enriquecida es una COPIA: actualiza la fila CRUDA de la caché
    const cruda = recursosCache.find(
      (x) => x.grado === r.grado && x.materiaId === r.materiaId && x.id === r.id
    );
    if (cruda) cruda.bloqueada = nuevo;
    guardarCache();
    pintarListado();
    notify(
      nuevo
        ? "«" + (r._titulo || r.id) + "» quedó BLOQUEADO: lo verán pero no podrán abrirlo."
        : "«" + (r._titulo || r.id) + "» se DESBLOQUEÓ: los estudiantes ya pueden abrirlo.",
      "success"
    );
  } catch (e) {
    notify("No se pudo cambiar el bloqueo: " + (e?.code || e?.message || "error"), "danger");
  }
}

/* ---------------- ELIMINAR recurso (docente, con confirmación) ---------------- */

function abrirConfirmarEliminar(r) {
  const d = document.createElement("sl-dialog");
  d.className = "rec-dialogo";
  d.setAttribute("label", "Eliminar recurso");
  d.innerHTML = `
    <p class="rec-crea-info">
      ¿Eliminar <strong>${escapeHtml(r._titulo || r.id)}</strong> de
      <strong>${escapeHtml(nombreGrado(r.grado))}</strong> ·
      <strong>${escapeHtml(materiaDe(r.materiaId).nombre)}</strong>?
      Los estudiantes que lo tengan abierto volverán al inicio automáticamente.
      Esta acción no se puede deshacer.
    </p>
    <sl-button slot="footer" id="rd-no">Cancelar</sl-button>
    <sl-button slot="footer" variant="danger" pill id="rd-si">Eliminar</sl-button>`;

  document.body.append(d);
  customElements.whenDefined("sl-dialog").then(() => d.show());
  d.addEventListener("sl-after-hide", (e) => {
    if (e.target !== d) return;
    d.remove();
  });

  d.querySelector("#rd-no").addEventListener("click", () => d.hide());
  d.querySelector("#rd-si").addEventListener("click", async () => {
    const si = d.querySelector("#rd-si");
    si.loading = true;
    try {
      await db.clases.eliminar(r.grado, r.materiaId, r.id);
      recursosCache = recursosCache.filter(
        (x) => !(x.id === r.id && x.materiaId === r.materiaId && x.grado === r.grado)
      );
      guardarCache();
      d.hide();
      cerrarModal(); // por si estaba abierto en segundo plano
      pintarListado();
      notify("Recurso «" + (r._titulo || r.id) + "» eliminado.", "success");
    } catch (e) {
      notify("No se pudo eliminar: " + (e?.code || e?.message || "error"), "danger");
    } finally {
      si.loading = false;
    }
  });
}

/* ---------------- VIGÍA (estudiante): recurso cerrado/eliminado en vivo ----------------
   Mientras el estudiante navega Recursos, db.clases.vigilar escucha
   sus materias. Si el recurso ABIERTO (modal) se elimina o pasa a
   invisible, el modal se cierra y vuelve solo a inicio.js. */

function iniciarVigia() {
  quitarVigia();
  if (esDocente) return;
  const grado = (perfilActual.grados || [])[0];
  if (grado == null) return;
  // Piezas de las materias del CICLO del estudiante (las de fuera ya
  // no le llegan ni las puede abrir)
  const quites = materiasDeGrado(grado).map((m) =>
    db.clases.vigilar(grado, m.id, (id, motivo) => {
      // BLOQUEO en vivo: refresca la copia local; si el recurso no
      // está abierto, basta con repintar (tarjeta con candado y sin
      // clic). Si está abierto, más abajo vuelve al inicio.
      if (motivo === "bloqueada") {
        const cruda = recursosCache.find((x) => x.materiaId === m.id && x.id === id);
        if (cruda) cruda.bloqueada = true;
        if (!modal || !filaActual) {
          guardarCache();
          pintarListado();
          return;
        }
      }
      // Solo interesa si ESTE recurso está abierto en el modal
      if (!modal || !filaActual) return;
      if (filaActual.materiaId !== m.id || filaActual.id !== id) return;
      const titulo = String(filaActual._titulo || filaActual.id || "");
      cerrarModal();
      renderUserbar(perfilActual);
      renderInicio(perfilActual, contenedorActual);
      notify(
        motivo === "eliminada"
          ? "«" + titulo + "» fue eliminado por tu docente. Volviste al inicio."
          : motivo === "bloqueada"
            ? "«" + titulo + "» fue bloqueado por tu docente. Volviste al inicio."
            : "«" + titulo + "» fue cerrado por tu docente.",
        "warning",
        6500
      );
    })
  );
  // VIGÍA DE MATERIAS VISIBLES: si el docente OCULTA la materia del
  // recurso abierto, el estudiante vuelve solo al inicio; si no hay
  // modal abierto, basta con repintar el listado.
  quites.push(
    db.materias.vigilar(grado, (mapa) => {
      visibilidadMaterias = mapa || {};
      if (modal && filaActual && visibilidadMaterias[filaActual.materiaId] === false) {
        const titulo = String(filaActual._titulo || filaActual.id || "");
        const materia = materiaDe(filaActual.materiaId).nombre;
        cerrarModal();
        renderUserbar(perfilActual);
        renderInicio(perfilActual, contenedorActual);
        notify(
          "Tu docente ocultó la materia «" + materia +
          "» (cerró «" + titulo + "»). Volviste al inicio.",
          "warning",
          6500
        );
        return;
      }
      pintarListado();
    })
  );
  vigiaRec = {
    quitar: () => quites.forEach((q) => { try { q(); } catch (e) { /* nada */ } }),
  };
}

function quitarVigia() {
  try { vigiaRec?.quitar(); } catch (e) { /* nada */ }
  vigiaRec = null;
}

/* ============================================================
   PDF PROPIO (tipo «pdf»): CACHÉ LOCAL + VISOR pdf.js
   ============================================================
   1) CACHÉ LOCAL — la primera vez el PDF se descarga (con % de
      avance) y queda guardado en el navegador (Cache API,
      «mco-pdf-v1»); a partir de ahí abre AL INSTANTE desde el
      dispositivo, sin volver a bajarlo (ahorra tiempo y datos).
      Cada 7 días se refresca solo en segundo plano.
   2) PÁGINA EXACTA — el visor pdf.js detecta SOLO la página donde
      vas (scroll) y la guarda; al cerrar y reabrir llegas
      EXACTAMENTE a esa página (ej. la 100).
   3) PLAN B — si algo falla (sin red la primera vez, sitio sin
      CORS, pdf.js inalcanzable) se usa el visor del navegador
      como siempre: iframe + #page=N (o la caja «Abrir recurso»
      si el sitio prohíbe iframes).
   pdf.js se baja UNA vez del CDN y también queda en caché local.
   ============================================================ */

const CACHE_PDF = "mco-pdf-v1";       // bytes de los PDF
const CACHE_PDFJS = "mco-pdfjs-v1";   // librería pdf.js (script + worker)
const PDFJS_BASE = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
const PDF_REFRESCO_MS = 7 * 24 * 60 * 60 * 1000; // revalida copia local: 7 días
const PDF_RENDER_MAX = 3;   // páginas renderizándose a la vez
const PDF_KEEPS = 16;       // lienzos en memoria antes de soltar lejanos

let pdfjsPromesa = null;    // carga única (y cacheada) de pdf.js
let visorPdf = null;        // control del visor activo: { irA, destruir }
let visorPdfUrl = null;     // blob: URL del plan B (visor nativo)

async function cacheAbierta(nombre) {
  try {
    if (!("caches" in window)) return null;
    return await caches.open(nombre);
  } catch { return null; }
}

async function pdfEnCache(url) {
  const c = await cacheAbierta(CACHE_PDF);
  if (!c) return null;
  try {
    const r = await c.match(url);
    if (!r) return null;
    const blob = new Blob([await r.blob()], { type: "application/pdf" });
    return { blob, fecha: Number(r.headers.get("x-mco-fecha")) || 0 };
  } catch { return null; }
}

async function guardarPdfEnCache(url, blob) {
  const c = await cacheAbierta(CACHE_PDF);
  if (!c) return;
  try {
    await c.put(url, new Response(blob, {
      headers: { "Content-Type": "application/pdf", "x-mco-fecha": String(Date.now()) },
    }));
  } catch { /* cuota llena: sin caché, se baja cada vez */ }
}

// Copia local vieja → refresca en segundo plano (para la PRÓXIMA vez)
async function refrescarPdfEnFondo(url, fechaGuardada) {
  if (!fechaGuardada || Date.now() - fechaGuardada < PDF_REFRESCO_MS) return;
  try {
    const fresco = await descargarPdf(url, null);
    await guardarPdfEnCache(url, fresco);
  } catch { /* sin red: la copia local sigue sirviendo */ }
}

// Descarga (con % si el servidor da el tamaño) → Blob PDF
async function descargarPdf(url, alProgreso) {
  const resp = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  const total = Number(resp.headers.get("content-length")) || 0;
  if (!resp.body || !total) return new Blob([await resp.blob()], { type: "application/pdf" });
  const lector = resp.body.getReader();
  const trozos = [];
  let recibidos = 0;
  let ultimoAviso = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    trozos.push(value);
    recibidos += value.length;
    if (alProgreso && Date.now() - ultimoAviso > 250) {
      ultimoAviso = Date.now();
      alProgreso(Math.min(1, recibidos / total), recibidos, total);
    }
  }
  return new Blob(trozos, { type: "application/pdf" });
}

/* ---- pdf.js: se baja UNA vez y queda cacheado en el navegador ---- */

async function textoDeCache(url) {
  const c = await cacheAbierta(CACHE_PDFJS);
  if (!c) return null;
  try {
    const r = await c.match(url);
    return r ? await r.text() : null;
  } catch { return null; }
}

async function guardarTextoEnCache(url, texto) {
  const c = await cacheAbierta(CACHE_PDFJS);
  if (!c) return;
  try {
    await c.put(url, new Response(texto, { headers: { "Content-Type": "text/javascript" } }));
  } catch { /* sin caché: se baja del CDN */ }
}

function inyectarScriptTexto(texto) {
  return new Promise((hecho, fallo) => {
    try {
      const url = URL.createObjectURL(new Blob([texto], { type: "text/javascript" }));
      const s = document.createElement("script");
      s.onload = () => { URL.revokeObjectURL(url); hecho(); };
      s.onerror = () => fallo(new Error("No se pudo ejecutar pdf.js"));
      s.src = url;
      document.head.append(s);
    } catch (e) { fallo(e); }
  });
}

function cargarScriptDirecto(url) {
  return new Promise((hecho, fallo) => {
    const s = document.createElement("script");
    s.onload = () => hecho();
    s.onerror = () => fallo(new Error("No se pudo bajar pdf.js"));
    s.src = url;
    document.head.append(s);
  });
}

async function cargarPdfjsReal() {
  const urlLib = PDFJS_BASE + "pdf.min.js";
  const urlWorker = PDFJS_BASE + "pdf.worker.min.js";
  if (!window.pdfjsLib) {
    let texto = await textoDeCache(urlLib);
    if (texto) {
      await inyectarScriptTexto(texto);
    } else {
      try {
        const resp = await fetch(urlLib); // cdnjs permite CORS
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        texto = await resp.text();
        await guardarTextoEnCache(urlLib, texto);
        await inyectarScriptTexto(texto);
      } catch (e) {
        await cargarScriptDirecto(urlLib); // última chance: sin caché
      }
    }
  }
  const lib = window.pdfjsLib;
  if (!lib) throw new Error("pdf.js no disponible");
  if (!lib.GlobalWorkerOptions.workerSrc) {
    let textoW = null;
    try { textoW = await textoDeCache(urlWorker); } catch (e) { /* nada */ }
    if (!textoW) {
      try {
        const rw = await fetch(urlWorker);
        if (rw.ok) { textoW = await rw.text(); await guardarTextoEnCache(urlWorker, textoW); }
      } catch (e) { /* nada */ }
    }
    lib.GlobalWorkerOptions.workerSrc = textoW
      ? URL.createObjectURL(new Blob([textoW], { type: "text/javascript" }))
      : urlWorker; // cross-origin: pdf.js cae a «fake worker» y sigue
  }
  return lib;
}

function cargarPdfjs() {
  if (!pdfjsPromesa) {
    pdfjsPromesa = cargarPdfjsReal()
      .catch(() => null)
      .then((lib) => { if (!lib) pdfjsPromesa = null; return lib; });
  }
  return pdfjsPromesa;
}

/* ---- El visor: páginas perezosas + página SOLA detectada y guardada ----
   Depende SOLO de lo que recibe (probable fuera del modal):
   zona          → div .rec-pdf (el que hace scroll)
   clave         → clave de progreso "{grado}/{materia}/{id}"
   blob          → bytes del PDF ya en memoria (de la caché o de la red)
   paginaInicial → página a la que llegar al abrir
   guardar(n)    → guarda la página actual
   vivo()        → false cuando el modal ya se cerró */

async function montarVisorPdfEn(zona, clave, blob, paginaInicial, guardar, vivo = () => true) {
  const lib = window.pdfjsLib;
  const datos = new Uint8Array(await blob.arrayBuffer());
  const doc = await lib.getDocument({ data: datos }).promise;
  if (!vivo()) { try { doc.destroy(); } catch (e) { /* nada */ } return null; }

  const total = doc.numPages;
  const primera = await doc.getPage(1);
  const vp1 = primera.getViewport({ scale: 1 });
  if (!vivo()) { try { doc.destroy(); } catch (e) { /* nada */ } return null; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  // Ancho disponible → escala «ajustar al ancho» (con límites sanos)
  const ancho = Math.max(200, (zona.clientWidth || 640) - 28);
  const escala = Math.min(2.5, Math.max(0.35, ancho / vp1.width));
  const altoBase = Math.round(vp1.height * escala);
  const anchoBase = Math.round(vp1.width * escala);

  zona.innerHTML = `<div class="rec-pdf-flujo"></div>`;
  const flujo = zona.querySelector(".rec-pdf-flujo");

  const paginas = [];
  for (let n = 1; n <= total; n++) {
    const div = document.createElement("div");
    div.className = "rec-pdf-pag";
    div.dataset.pagina = n;
    div.style.width = anchoBase + "px";
    div.style.height = altoBase + "px";
    div.innerHTML = `<span class="rec-pdf-num">${n}</span>`;
    flujo.append(div);
    paginas.push({ n, div, lienzo: null, tarea: null, lista: false });
  }
  const mapa = new Map(paginas.map((p) => [p.n, p]));

  let paginaActual = Math.min(total, Math.max(1, paginaInicial || 1));

  async function pintar(p) {
    if (!p || p.lista || p.tarea || !vivo()) return;
    p.tarea = "montando";
    try {
      const page = await doc.getPage(p.n);
      if (!vivo()) return;
      const vp = page.getViewport({ scale: escala });
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.floor(vp.width * dpr);
      lienzo.height = Math.floor(vp.height * dpr);
      lienzo.style.width = Math.floor(vp.width) + "px";
      lienzo.style.height = Math.floor(vp.height) + "px";
      const ctx = lienzo.getContext("2d");
      const tarea = page.render({
        canvasContext: ctx,
        viewport: vp,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
      });
      p.tarea = tarea;
      await tarea.promise;
      if (!vivo()) return;
      p.div.style.height = Math.floor(vp.height) + "px";
      p.div.append(lienzo);
      p.div.classList.add("lista");
      p.lienzo = lienzo;
      p.lista = true;
    } catch (e) {
      /* cancelado o fallido: la página queda pendiente y se reintenta */
    } finally {
      p.tarea = null;
    }
  }

  // Cola de render: máximo PDF_RENDER_MAX páginas a la vez
  const cola = [];
  let activos = 0;
  function encolar(n) {
    const p = mapa.get(n);
    if (!p || p.lista || p.tarea || cola.includes(n)) return;
    cola.push(n);
    bombear();
  }
  function bombear() {
    while (activos < PDF_RENDER_MAX && cola.length) {
      const p = mapa.get(cola.shift());
      if (!p || p.lista || p.tarea) continue;
      activos++;
      pintar(p).finally(() => { activos--; bombear(); });
    }
  }

  // Las que se acercan al viewport (±900px) se renderizan solas
  const io = new IntersectionObserver(
    (entradas) => {
      for (const en of entradas) {
        if (en.isIntersecting) encolar(Number(en.target.dataset.pagina));
      }
    },
    { root: zona, rootMargin: "900px 0px", threshold: 0 }
  );
  paginas.forEach((p) => io.observe(p.div));

  function sincronizarPill(n) {
    const entrada = zona.closest(".rec-modal")?.querySelector(".rec-pill input");
    if (entrada && Number(entrada.value) !== n) entrada.value = n;
  }

  let temporizadorGuardado = null;
  function programarGuardado(n) {
    clearTimeout(temporizadorGuardado);
    temporizadorGuardado = setTimeout(() => {
      try { guardar(n); } catch (e) { /* ignorar */ }
    }, 700);
  }

  // Lienzos lejanos fuera de memoria (los grandes no deben tumbarse)
  function soltarLejanas() {
    const listas = paginas.filter((p) => p.lista);
    if (listas.length <= PDF_KEEPS) return;
    for (const p of listas) {
      if (Math.abs(p.n - paginaActual) > 8) {
        p.lienzo?.remove();
        p.lienzo = null;
        p.lista = false;
        p.div.classList.remove("lista");
      }
    }
  }

  let temporizadorScroll = null;
  function alScroll() {
    if (temporizadorScroll) return;
    temporizadorScroll = setTimeout(() => {
      temporizadorScroll = null;
      if (!vivo()) return;
      const caja = zona.getBoundingClientRect();
      const linea = caja.top + caja.height * 0.3;
      let i = paginaActual - 1;
      if (!paginas[i]) return;
      while (i + 1 < paginas.length && paginas[i + 1].div.getBoundingClientRect().top <= linea) i++;
      while (i > 0 && paginas[i].div.getBoundingClientRect().top > linea) i--;
      if (paginas[i].n !== paginaActual) {
        paginaActual = paginas[i].n;
        sincronizarPill(paginaActual);
        programarGuardado(paginaActual);
      }
      encolar(paginaActual); encolar(paginaActual - 1); encolar(paginaActual + 1);
      soltarLejanas();
    }, 160);
  }
  zona.addEventListener("scroll", alScroll, { passive: true });

  // Saltar a una página (pill − / + / número o restauración al abrir)
  let temporizadorIrA = null;
  function irA(n) {
    const destino = Math.min(total, Math.max(1, Math.round(Number(n) || 1)));
    clearTimeout(temporizadorIrA);
    temporizadorIrA = setTimeout(() => {
      const p = mapa.get(destino);
      if (!p || !vivo()) return;
      paginaActual = destino;
      p.div.scrollIntoView({ block: "start", behavior: "auto" });
      sincronizarPill(destino);
      programarGuardado(destino);
      encolar(destino); encolar(destino + 1); encolar(destino + 2);
    }, 220);
  }

  // Restauración inicial: llegar EXACTO a la página donde iba
  if (paginaActual > 1) irA(paginaActual);

  let destruido = false;
  function destruir() {
    if (destruido) return;
    destruido = true;
    clearTimeout(temporizadorScroll);
    clearTimeout(temporizadorIrA);
    clearTimeout(temporizadorGuardado);
    try { io.disconnect(); } catch (e) { /* nada */ }
    for (const p of paginas) {
      try { if (p.tarea && p.tarea.cancel) p.tarea.cancel(); } catch (e) { /* nada */ }
    }
    try { doc.destroy(); } catch (e) { /* nada */ }
  }

  return { irA, destruir, totalPaginas: total, paginaActual: () => paginaActual };
}

/* ---------------- MODAL del recurso ----------------
   Cabecera: ficha + título + materia/grado + pill de página (si el
   contenido tiene páginas) + «Abrir en pestaña nueva» + ✕.
   Cuerpo según el tipo (imagen, audio, video, iframe, descarga…).
   Progreso: página (pill) y minuto (audio/video) se guardan solos. */

let modal = null;       // elemento .rec-fondo abierto
let filaActual = null;  // recurso abierto
let focoAntes = null;
let temporizadorPagina = null;
let mediaAbierta = null; // <audio> / <video> del modal (para guardar el minuto)

function guardarEstadoActual() {
  if (!modal || !filaActual) return;
  if (CON_PAGINAS.has(filaActual._res.tipo)) {
    const entrada = modal.querySelector(".rec-pill input");
    const valor = Number(entrada && entrada.value) || 1;
    guardarPagina(filaActual._clave, valor);
  }
  if (mediaAbierta && Number.isFinite(mediaAbierta.currentTime) &&
      (mediaAbierta.currentTime >= 0.5 || mediaAbierta.duration === 0)) {
    // No se guarda una posición casi nula: conservaría… o borraría el
    // minuto previo si el navegador aún no aplicó el seek restaurado.
    try { guardarTiempo(filaActual._clave, mediaAbierta.currentTime); } catch (e) { /* ignorar */ }
  }
}

function abrirRecurso(fila) {
  cerrarModal();
  filaActual = fila;
  marcarApertura(fila._clave);

  const reg = registroProgreso(fila._clave);
  const pagina = Math.max(1, Number(reg && reg.pagina) || 1);
  const conPaginas = CON_PAGINAS.has(fila._res.tipo);
  const continuar = conPaginas && pagina > 1;

  focoAntes = document.activeElement;

  const tipo = TIPOS[fila._res.tipo] || TIPOS.web;
  const chipsSub = [
    `<span>${escapeHtml(materiaDe(fila.materiaId).nombre)}</span>`,
    `<span>${escapeHtml(nombreGrado(fila.grado))}</span>`,
  ].join("");
  const src = urlInterna(fila);
  const externa = urlExterna(fila);

  // Mejor esfuerzo: los PDF abren directo en la página guardada (#page=N)
  let srcPaginado = src;
  if (continuar && (fila._res.tipo === "pdf" || fila._res.tipo === "garchivo")) {
    srcPaginado += (srcPaginado.includes("#") ? "&" : "#") + "page=" + pagina;
  }

  modal = document.createElement("div");
  modal.className = "rec-fondo";
  modal.innerHTML = `
    <div class="rec-modal" role="dialog" aria-modal="true"
      aria-label="${escapeHtml(fila._titulo)}">
      <div class="rec-modal-cab">
        <span class="rec-modal-ficha" data-tipo="${fila._res.tipo}"
          style="background:${tipo.fondo};color:${tipo.color}">${tipo.etiqueta}</span>
        <span class="rec-modal-titulos">
          <p class="rec-modal-titulo">${escapeHtml(fila._titulo)}</p>
          <span class="rec-modal-sub">${chipsSub}</span>
        </span>
        ${continuar ? `<span class="rec-dato rec-aviso-pag">Continúa en la pág. ${pagina}</span>` : ""}
        ${conPaginas ? `
        <span class="rec-pill" title="Marca tu página: se guarda sola">
          <span>Página</span>
          <button type="button" class="rec-menos" aria-label="Página anterior">−</button>
          <input type="number" min="1" step="1" inputmode="numeric"
            value="${pagina}" aria-label="Página del documento" />
          <button type="button" class="rec-mas" aria-label="Página siguiente">+</button>
        </span>` : ""}
        <a class="rec-abrir-btn" href="${escapeHtml(externa)}" target="_blank" rel="noopener noreferrer"
          title="Abrir fuera de la vista">
          <sl-icon name="box-arrow-up-right"></sl-icon> Abrir
        </a>
        <button type="button" class="rec-x" aria-label="Cerrar recurso">${SVG_X}</button>
      </div>
      ${cuerpoModal(fila, srcPaginado)}
    </div>`;

  document.body.append(modal);
  document.documentElement.classList.add("rec-abierto");

  // SOLO la ✕ cierra: clic en el fondo y Esc se IGNORAN a propósito
  modal.querySelector(".rec-x").addEventListener("click", cerrarModal);
  if (conPaginas) {
    const entrada = modal.querySelector(".rec-pill input");
    // En PDF propio la pill SALTA de página (visor propio) y también
    // se actualiza SOLA cuando el scroll detecta la página actual.
    const saltar = () => { if (fila._res.tipo === "pdf") visorPdf?.irA(Number(entrada.value) || 1); };
    modal.querySelector(".rec-menos").addEventListener("click", () => {
      entrada.value = Math.max(1, (Number(entrada.value) || 1) - 1);
      programarPagina();
      saltar();
    });
    modal.querySelector(".rec-mas").addEventListener("click", () => {
      entrada.value = (Number(entrada.value) || 1) + 1;
      programarPagina();
      saltar();
    });
    entrada.addEventListener("input", () => { programarPagina(); saltar(); });
  }

  // Atrapar el foco dentro del modal (Tab no se escapa)
  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focos = [...modal.querySelectorAll("button, input, a[href], audio, video")].filter(
      (el) => !el.disabled && el.offsetParent !== null
    );
    if (!focos.length) return;
    const primero = focos[0];
    const ultimo = focos[focos.length - 1];
    if (e.shiftKey && document.activeElement === primero) { ultimo.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { primero.focus(); e.preventDefault(); }
  });

  modal.querySelector(".rec-x").focus();

  // PDF propio: arranca el visor rápido (caché local + página exacta)
  if (fila._res.tipo === "pdf") iniciarVisorPdf(fila, pagina);

  // Audio/video: recordar el MINUTO donde iba (se guarda solo)
  const media = modal.querySelector("audio, video");
  if (media) {
    mediaAbierta = media;
    const clave = fila._clave;
    const guardado = Number(registroProgreso(clave)?.tiempo) || 0;
    // Restaurar en loadedmetadata y reintentar en canplay (si el navegador
    // descartó el seek por falta de datos, la segunda pasada lo recupera)
    const restaurar = (marca) => {
      if (
        guardado > 1 &&
        Number.isFinite(media.duration) &&
        guardado < media.duration - 2 &&
        !(marca === "canplay" && media.currentTime > 1)
      ) {
        try { media.currentTime = guardado; } catch (e) { /* ignorar */ }
      }
    };
    media.addEventListener("loadedmetadata", () => restaurar("loadedmetadata"));
    media.addEventListener("canplay", () => restaurar("canplay"));
    let ultimo = 0;
    media.addEventListener("timeupdate", () => {
      // Solo durante reproducción real y ya avanzado: el propio ajuste
      // de la posición dispara timeupdate (con el valor aún a 0 en
      // navegadores que difieren el seek) y BORRARÍA el progreso.
      if (media.paused || media.currentTime < 0.5) return;
      const ahora = Date.now();
      if (ahora - ultimo < 2500) return;
      ultimo = ahora;
      try { guardarTiempo(clave, media.currentTime); } catch (e) { /* ignorar */ }
    });
    media.addEventListener("pause", () => {
      if (media.currentTime < 0.5) return; // pausa al inicio: conserva el progreso anterior
      try { guardarTiempo(clave, media.currentTime); } catch (e) { /* ignorar */ }
    });
  }
}

// Cuerpo del modal según el TIPO (los tamaños salen de CONFIG vía CSS)
function cuerpoModal(fila, src) {
  const tipo = fila._res.tipo;
  const enlace = String(fila.enlace || "").trim();

  if (!enlace) {
    return `<div class="rec-modal-cuerpo"><div class="rec-centro">
      <div class="rec-sin-enlace">
        <strong>Este recurso no tiene enlace guardado.</strong><br/>
        Fue creado con la versión anterior (solo ficha). Vuelve a crearlo
        con «Crear recurso» pegando su enlace (imagen, PDF, Drive, video…).
      </div></div></div>`;
  }

  if (tipo === "imagen") {
    return `<div class="rec-modal-cuerpo"><div class="rec-centro">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(fila._titulo)}"
        onerror="this.replaceWith(Object.assign(document.createElement('p'),{textContent:'No se pudo cargar la imagen.'}))">
    </div></div>`;
  }

  if (tipo === "audio" || tipo === "video") {
    const etiqueta = tipo === "audio" ? "music-note-beamed" : "camera-reels";
    return `<div class="rec-modal-cuerpo"><div class="rec-centro">
      <sl-icon name="${etiqueta}"></sl-icon>
      <${tipo} src="${escapeHtml(src)}" controls ${tipo === "video" ? 'playsinline' : ''}
        preload="metadata"></${tipo}>
    </div></div>`;
  }

  if (tipo === "youtube" || tipo === "vimeo") {
    return `<div class="rec-modal-cuerpo"><div class="rec-centro">
      <div class="rec-web-video">
        <iframe src="${escapeHtml(src)}" title="${escapeHtml(fila._titulo)}"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowfullscreen></iframe>
      </div>
    </div></div>`;
  }

  if (tipo === "pdf") {
    // Visor rápido PROPIO: caché local + página detectada sola.
    // El arranque async lo hace iniciarVisorPdf tras montar el modal;
    // si algo falla, volverAlNativo deja el visor del navegador aquí.
    return `<div class="rec-modal-cuerpo"><div class="rec-pdf" id="rec-pdf-zona">
      <div class="rec-pdf-estado">
        <sl-icon name="arrow-clockwise"></sl-icon> Preparando documento…
      </div>
    </div></div>`;
  }

  if (tipo === "descarga") {
    return `<div class="rec-modal-cuerpo"><div class="rec-centro">
      <div class="rec-descarga-caja">
        <sl-icon name="file-earmark-arrow-down"></sl-icon>
        <h3>Archivo para abrir fuera de la vista</h3>
        <p>${escapeHtml(enlace)}</p>
        <a class="rec-btn-crear" style="text-decoration:none" href="${escapeHtml(enlace)}"
          target="_blank" rel="noopener noreferrer">Abrir / descargar</a>
      </div>
    </div></div>`;
  }

  // pdf · garchivo · gdoc · ghoja · gdiap · gform · gcarpeta · web → iframe
  // Si el sitio PROHÍBE ser embebido (X-Frame-Options, ej. mined.gob.sv)
  // NO se intenta el iframe: se muestra la ficha con el botón «Abrir
  // recurso» — sin «Refused to display» ni modal en blanco.
  if (!puedeIframe(src)) {
    return `<div class="rec-modal-cuerpo"><div class="rec-centro">
      <div class="rec-descarga-caja">
        <sl-icon name="box-arrow-up-right"></sl-icon>
        <h3>Este recurso no se puede mostrar aquí</h3>
        <p>El sitio <b>${escapeHtml(hostDe(src))}</b> no permite mostrarse dentro
        de otras páginas. Ábrelo en una pestaña nueva:</p>
        <a class="rec-btn-crear" style="text-decoration:none" href="${escapeHtml(src)}"
          target="_blank" rel="noopener noreferrer">Abrir recurso</a>
      </div>
    </div></div>`;
  }
  const nota = tipo === "web"
    ? `<div class="rec-nota-web">Si la página no carga aquí (algunos sitios lo bloquean),
        usa el botón «Abrir» de la cabecera.</div>`
    : "";
  return `<div class="rec-modal-cuerpo">${nota}
    <iframe class="rec-iframe" src="${escapeHtml(src)}"
      title="${escapeHtml(fila._titulo)}"
      allow="autoplay; fullscreen; encrypted-media"></iframe>
  </div>`;
}

function programarPagina() {
  clearTimeout(temporizadorPagina);
  temporizadorPagina = setTimeout(() => {
    if (!modal || !filaActual) return;
    const entrada = modal.querySelector(".rec-pill input");
    guardarPagina(filaActual._clave, Number(entrada && entrada.value) || 1);
    pintarListado(); // refresca el chip «Retomar pág. N» de la tarjeta
  }, 500);
}

function cerrarModal() {
  if (!modal) return;
  guardarEstadoActual();
  if (visorPdf) { try { visorPdf.destruir(); } catch (e) { /* nada */ } visorPdf = null; }
  if (visorPdfUrl) { try { URL.revokeObjectURL(visorPdfUrl); } catch (e) { /* nada */ } visorPdfUrl = null; }
  clearTimeout(temporizadorPagina);
  mediaAbierta = null;
  modal.remove();
  modal = null;
  filaActual = null;
  document.documentElement.classList.remove("rec-abierto");
  if (focoAntes && focoAntes.focus) focoAntes.focus();
  focoAntes = null;
  pintarListado(); // refresca chips «Retomar»
}

/* ---------------- Arranque del visor PDF propio ----------------
   1) bytes: CACHÉ LOCAL primero (instantáneo) → red (con %);
   2) visor pdf.js renderiza y detecta la página sola;
   3) si algo falla → volverAlNativo (visor del navegador). */

async function iniciarVisorPdf(fila, paginaInicial) {
  const zona = modal?.querySelector("#rec-pdf-zona");
  if (!zona) return;
  const clave = fila._clave;
  const url = String(fila.enlace || "").trim();
  const ponEstado = (html) => {
    const e = modal?.querySelector("#rec-pdf-zona .rec-pdf-estado");
    if (e) e.innerHTML = html;
  };

  // 1) Bytes: caché local → red (con porcentaje la primera vez)
  let guardado = await pdfEnCache(url);
  if (!guardado) {
    ponEstado(`<sl-icon name="cloud-download"></sl-icon>
      Descargando documento… <span class="rec-pdf-pct"></span>
      <span class="rec-pdf-nota">Se guarda en tu dispositivo: la próxima vez abre al instante</span>`);
    try {
      const blob = await descargarPdf(url, (fr) => {
        const pct = modal?.querySelector("#rec-pdf-zona .rec-pdf-pct");
        if (pct) pct.textContent = Math.round(fr * 100) + "%";
      });
      await guardarPdfEnCache(url, blob);
      guardado = { blob, fecha: Date.now() };
    } catch (e) {
      volverAlNativo(fila, null,
        "No se pudo descargar el PDF (sin conexión o el sitio lo bloquea). Se usa el visor del navegador.");
      return;
    }
  } else {
    refrescarPdfEnFondo(url, guardado.fecha); // copia vieja → refresca para la próxima
  }
  if (!modal || filaActual !== fila) return; // el modal se cerró mientras tanto

  // 2) Visor rápido (pdf.js, cacheado también él)
  ponEstado(`<sl-icon name="arrow-clockwise"></sl-icon> Preparando documento…`);
  const lib = await cargarPdfjs();
  if (!lib) { volverAlNativo(fila, guardado.blob); return; }
  if (!modal || filaActual !== fila) return;

  try {
    const zona2 = modal.querySelector("#rec-pdf-zona");
    if (!zona2) return;
    visorPdf = await montarVisorPdfEn(
      zona2,
      clave,
      guardado.blob,
      paginaInicial,
      (n) => guardarPagina(clave, n),
      () => !!modal && filaActual === fila
    );
  } catch (e) {
    visorPdf = null;
    volverAlNativo(fila, guardado.blob,
      "El visor rápido no pudo abrir este PDF; se usa el del navegador.");
    return;
  }
  if (!visorPdf && modal && filaActual === fila) volverAlNativo(fila, guardado.blob);
}

// PLAN B: visor del navegador (desde la CACHÉ local si hay bytes)
function volverAlNativo(fila, blob, aviso) {
  if (!modal || filaActual !== fila) return;
  const zona = modal.querySelector("#rec-pdf-zona");
  if (!zona) return;
  if (aviso) notify(aviso, "warning", 6500);

  const reg = registroProgreso(fila._clave);
  const pag = Math.max(1, Number(reg && reg.pagina) || 1);
  const srcDirecto = urlInterna(fila);

  // ¿El sitio prohíbe iframes? → caja «Abrir recurso» (como siempre)
  if (!puedeIframe(srcDirecto)) {
    zona.innerHTML = `<div class="rec-centro"><div class="rec-descarga-caja">
      <sl-icon name="box-arrow-up-right"></sl-icon>
      <h3>Este recurso no se puede mostrar aquí</h3>
      <p>El sitio <b>${escapeHtml(hostDe(srcDirecto))}</b> no permite mostrarse
      dentro de otras páginas. Ábrelo en una pestaña nueva:</p>
      <a class="rec-btn-crear" style="text-decoration:none" href="${escapeHtml(urlExterna(fila))}"
        target="_blank" rel="noopener noreferrer">Abrir recurso</a>
    </div></div>`;
    return;
  }

  let src = srcDirecto;
  if (pag > 1) src += (src.includes("#") ? "&" : "#") + "page=" + pag;
  if (blob) {
    // Bytes locales → el visor del navegador abre AL INSTANTE, sin red
    try {
      if (visorPdfUrl) { URL.revokeObjectURL(visorPdfUrl); visorPdfUrl = null; }
      visorPdfUrl = URL.createObjectURL(blob);
      src = visorPdfUrl + (pag > 1 ? "#page=" + pag : "");
    } catch (e) { /* se queda con el src original */ }
  }
  zona.innerHTML = `<iframe class="rec-iframe" src="${escapeHtml(src)}"
    title="${escapeHtml(fila._titulo)}" allow="autoplay; fullscreen; encrypted-media"></iframe>`;
}

/* ---------------- Guardado al cerrar pestaña/navegador ---------------- */

function vigilarCierre() {
  if (vigiaCierreListo) return;
  vigiaCierreListo = true;
  window.addEventListener("pagehide", () => { if (modal) guardarEstadoActual(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && modal) guardarEstadoActual();
  });
}

/* ---------------- Fila enriquecida (tipo + clave + título) ----------------
   Cada fila cruda de Firestore/cache se complementa con:
   · _res    → resolverEnlace(enlace) { tipo, id }
   · _clave  → "{grado}/{materiaId}/{id}" (clave del progreso)
   · _titulo → clase (título) con reservas para datos viejos */

function prepararFila(f) {
  let res = { tipo: "web", id: "" };
  try { res = resolverEnlace(f.enlace); } catch (e) { /* sin enlace: ficha «sin enlace» */ }
  return {
    ...f,
    _res: res,
    _clave: `${f.grado}/${f.materiaId}/${f.id}`,
    _titulo: String(f.clase || f.titulo || f.id || "Recurso").trim() || "Recurso",
  };
}

/* ---------------- CREAR / EDITAR RECURSO (docente) ----------------
   Pide TÍTULO, ENLACE, GRADO y MATERIA. Detecta el tipo del enlace
   EN VIVO debajo del campo. Guarda en clases/{grado}/{materia}/{id}
   con tipo:"recurso" (db.clases.crear añade creadoEn).
   El MISMO diálogo sirve para EDITAR (abrirEditar): sale con los
   datos prefelados y TODO es modificable; si cambia el grado o la
   materia, el recurso se MUEVE (copia al lugar nuevo + borrado del
   doc viejo, conservando su progreso de página/minuto). */

function abrirCrear(editando = null) {
  // SOLO es EDICIÓN si llega la pieza COMPLETA (id + grado + materia).
  // Así ningún argumento raro (p. ej. el evento de un addEventListener
  // que llama abrirCrear directo) puede colar el diálogo en modo
  // edición con datos undefined — el bug «reading 'indexOf'».
  const esEdicion = !!(editando && editando.id && editando.grado != null && editando.materiaId);
  const yaHayGrado = esEdicion || (gradoSel != null && gradoSel !== "todos");

  const d = document.createElement("sl-dialog");
  d.className = "rec-dialogo";
  d.setAttribute("label", esEdicion ? "Editar recurso" : "Crear recurso");
  d.innerHTML = `
    <p class="rec-crea-info">
      ${esEdicion
        ? `Modifica lo que necesites: <strong>título, enlace, grado y materia</strong>.
           Si cambias el grado o la materia, el recurso SE MUEVE de lugar
           (conserva su progreso de página/minuto).`
        : `El enlace puede ser de <strong>Google Drive/Docs, YouTube, una imagen,
           un audio, un video, un PDF, cualquier página web… o una ruta del
           proyecto</strong> (ej. <code>recursos/img/prueba-circulo.svg</code>).`}
    </p>
    <div class="rec-form">
      <sl-input id="rc-titulo" label="Título" placeholder="Ej. Guía de fracciones"
        clearable value="${escapeHtml(esEdicion ? String(editando.clase || editando.titulo || "") : "")}"></sl-input>
      <sl-input id="rc-enlace" label="Enlace" clearable
        placeholder="https://…  o  recursos/img/foto.png"
        value="${escapeHtml(esEdicion ? String(editando.enlace || "") : "")}"></sl-input>
      <div class="rec-tipo-detectado" id="rc-tipo" hidden></div>
      <sl-select id="rc-grado" label="Grado" hoist
        placeholder="${yaHayGrado ? "" : "Elige el grado"}">
        ${GRADOS.map((g) => `<sl-option value="${g.id}">${escapeHtml(g.nombre)}</sl-option>`).join("")}
      </sl-select>
      <sl-select id="rc-materia" label="Materia" hoist placeholder="Elige la materia">
        ${MATERIAS.map((m) => `<sl-option value="${m.id}">${escapeHtml(m.nombre)}</sl-option>`).join("")}
      </sl-select>
    </div>
    <sl-button slot="footer" variant="primary" pill data-variante="guardar" id="rc-guardar">
      ${esEdicion ? "Guardar cambios" : "Crear recurso"}
    </sl-button>`;

  document.body.append(d);
  customElements.whenDefined("sl-dialog").then(() => d.show());
  // ⚠ Los sl-select de Grado/Materia también emiten sl-after-hide (por su
  // propia lista de opciones, con burbuja): ese evento NO debe eliminar el
  // diálogo. Solo se limpia cuando el que se oculta es el DIÁLOGO mismo.
  d.addEventListener("sl-after-hide", (e) => {
    if (e.target !== d) return;
    d.remove();
  });

  // Valores iniciales: en EDICIÓN van el grado y la materia del
  // recurso; en creación, el grado elegido en la vista viene prellenado.
  Promise.all([
    customElements.whenDefined("sl-select"),
    customElements.whenDefined("sl-option"),
  ]).then(() => {
    if (esEdicion) {
      d.querySelector("#rc-grado").value = String(editando.grado);
      d.querySelector("#rc-materia").value = String(editando.materiaId);
    } else if (yaHayGrado) {
      d.querySelector("#rc-grado").value = String(gradoSel);
    }
  });

  // Detección del tipo EN VIVO mientras se escribe el enlace
  const entradaEnlace = d.querySelector("#rc-enlace");
  const cajaTipo = d.querySelector("#rc-tipo");
  const actualizarTipo = () => {
    const valor = String(entradaEnlace.value || "").trim();
    if (!valor) { cajaTipo.hidden = true; return; }
    try {
      const res = resolverEnlace(valor);
      const t = TIPOS[res.tipo];
      cajaTipo.className = "rec-tipo-detectado";
      cajaTipo.innerHTML = `
        <span class="rec-ficha" data-tipo="${res.tipo}"
          style="background:${t.fondo};color:${t.color}">${t.etiqueta}</span>
        <span>Se abrirá como <b>${escapeHtml(textoTipo({ _res: res }))}</b></span>`;
      cajaTipo.hidden = false;
    } catch (e) {
      cajaTipo.className = "rec-tipo-detectado err";
      cajaTipo.textContent = e.message;
      cajaTipo.hidden = false;
    }
  };
  entradaEnlace.addEventListener("sl-input", actualizarTipo);
  if (esEdicion) actualizarTipo(); // tipo del enlace ya guardado

  d.querySelector("#rc-guardar").addEventListener("click", async () => {
    const guardar = d.querySelector("#rc-guardar");
    const titulo = String(d.querySelector("#rc-titulo").value || "").trim();
    const enlace = String(entradaEnlace.value || "").trim();
    const valorGrado = String(d.querySelector("#rc-grado").value ?? "").trim();
    const valorMateria = String(d.querySelector("#rc-materia").value || "").trim();

    if (!titulo) { notify("Escribe el título del recurso.", "warning"); return; }
    let res;
    try { res = resolverEnlace(enlace); }
    catch (e) { notify(e.message, "warning"); return; }
    if (valorGrado === "") { notify("Elige el grado.", "warning"); return; }
    const grado = Number(valorGrado);
    if (!GRADOS.some((g) => g.id === grado)) { notify("Elige el grado.", "warning"); return; }
    if (!MATERIAS.some((m) => m.id === valorMateria)) { notify("Elige la materia.", "warning"); return; }

    guardar.loading = true;
    try {
      if (esEdicion) {
        const mismoLugar =
          grado === Number(editando.grado) && valorMateria === editando.materiaId;
        if (mismoLugar) {
          if (titulo === String(editando.clase || "") && enlace === String(editando.enlace || "")) {
            d.hide(); // no cambió nada: cerrar sin tocar Firebase
            return;
          }
          await db.clases.actualizar(editando.grado, editando.materiaId, editando.id, {
            clase: titulo,
            enlace,
          });
        } else {
          // MOVER: la misma pieza (mismo id) a otro grado/materia.
          // 1) copia en el lugar nuevo · 2) borra el doc viejo ·
          // 3) el progreso (página/minuto) viaja a la clave nueva.
          if (await db.clases.existe(grado, valorMateria, editando.id)) {
            notify(
              "Ya existe un recurso con ese identificador en " +
                nombreGrado(grado) + " · " + materiaDe(valorMateria).nombre +
                ". Cambia el título para que el id quede libre.",
              "danger"
            );
            return;
          }
          await db.clases.crear(grado, valorMateria, editando.id, {
            tipo: "recurso",
            visible: editando.visible !== false,
            dia: editando.dia ?? "",
            unidad: editando.unidad ?? "",
            leccion: editando.leccion ?? "",
            clase: titulo,
            enlace,
            creadoPor: editando.creadoPor || perfilActual?.uid || "",
          }); // db.js añade creadoEn
          await db.clases.eliminar(editando.grado, editando.materiaId, editando.id);
          migrarProgreso(
            `${editando.grado}/${editando.materiaId}/${editando.id}`,
            `${grado}/${valorMateria}/${editando.id}`
          );
        }
        notify(
          mismoLugar
            ? "Recurso actualizado."
            : "Recurso actualizado y movido a " + nombreGrado(grado) + " · " +
              materiaDe(valorMateria).nombre + ".",
          "success"
        );
        d.hide();
        cargarListado();
      } else {
        // id único: recurso-{título} · recurso-{título}-2 · -3 …
        const base = "recurso-" + slug(titulo);
        let id = base;
        for (let n = 2; n < 30; n++) {
          if (!(await db.clases.existe(grado, valorMateria, id))) break;
          id = `${base}-${n}`;
        }
        await db.clases.crear(grado, valorMateria, id, {
          tipo: "recurso",
          visible: true,         // el docente lo apaga con el ojo
          dia: "", unidad: "", leccion: "",
          clase: titulo,
          enlace,
          creadoPor: perfilActual?.uid || "",
        }); // db.js añade creadoEn
        notify(
          `Recurso creado en ${nombreGrado(grado)} · ${materiaDe(valorMateria).nombre}.`,
          "success"
        );
        d.hide();
        cargarListado();
      }
    } catch (e) {
      notify("No se pudo guardar el recurso: " + (e?.code || e?.message || "error"), "danger");
    } finally {
      guardar.loading = false;
    }
  });
}

// EDITAR RECURSO (docente): el lápiz de la tarjeta abre el MISMO
// diálogo de crear, en modo edición — todo modificable: título,
// enlace, grado y materia.
function abrirEditar(fila) {
  abrirCrear({
    grado: fila.grado,
    materiaId: fila.materiaId,
    id: fila.id,
    clase: String(fila.clase ?? ""),
    enlace: String(fila.enlace ?? ""),
    visible: fila.visible,
    dia: fila.dia,
    unidad: fila.unidad,
    leccion: fila.leccion,
    creadoPor: fila.creadoPor,
  });
}