// ============================================================
// docsdrive.js — Biblioteca de RECURSOS de Google Drive
// (js/utils/docsdrive.js) · v1
//
// Utilidad para la VISTA DE RECURSOS (y para cualquier página de
// clase): recibe enlaces de Google Drive con la MATERIA y el GRADO
// o GRADOS para los que sirve cada documento; muestra SOLO los del
// grado indicado, ORDENADOS POR MATERIA, y al hacer clic abre el
// PDF o documento en un MODAL que SOLO se cierra con la ✕.
//
// PROGRESO: en localStorage (clave "mco_docsdrive_progreso_v1") se
// guarda la PÁGINA donde iba el estudiante en cada documento. Al
// reabrir —en la misma sesión, más tarde o incluso en otra
// pestaña/día— se retoma: la pill de página se restaura, sale el
// aviso "Continuar en la pág. N" y la tarjeta muestra "Retomar".
//
// USO (desde la vista de recursos o desde una clase):
//
//   import { crearDocsdrive } from "../../../js/utils/docsdrive.js";
//
//   const biblioteca = crearDocsdrive({
//     contenedor,                 // (opcional) elemento donde montar
//     titulo: "Recursos",         // (opcional) encabezado de la biblioteca
//     grado: 3,                   // grado ACTUAL: solo se ven los suyos
//     docs: [
//       {
//         enlace: "https://drive.google.com/file/d/ID/view?usp=sharing",
//         materia: "Matemáticas",
//         grados: [3, 4],         // 1 o más: 3, "3", "3°", "3-5", [3,4]…
//         titulo: "Guía de fracciones",   // (opcional, recomendado)
//       },
//       // ... más documentos
//     ],
//   });
//
//   biblioteca.elemento;                  // la <section> montada
//   biblioteca.actualizar({ grado: 4 });  // re-filtra y re-pinta
//   biblioteca.abrir(docs[0]);            // abre el modal a mano
//   biblioteca.cerrar();                  // cierra (igual que la ✕)
//   biblioteca.abierto;                   // true si el modal está visible
//
// ENLACES RECONOCIDOS (el ID se saca solo):
//   drive.google.com/file/d/ID/…            → visor de archivo (PDF…)
//   docs.google.com/document/d/ID/…         → Documento de Google
//   docs.google.com/spreadsheets/d/ID/…     → Hoja de cálculo
//   docs.google.com/presentation/d/ID/…     → Presentación
//   docs.google.com/forms/d/ID/…            → Formulario
//   drive.google.com/drive/folders/ID…      → Carpeta de Drive
//   cualquier otra URL http(s)              → se incrusta tal cual
//
// GRADOS: cada doc declara para QUIÉN es. Acepta 3 · "3" · "3°" ·
//   "3-5" (rango) · [3, 4] · ["3°", "4°"]. El filtro compara el
//   grado de la biblioteca contra esos números. Documento sin
//   grados o materia vacía → Error "docsdrive.js: …" (mejor verlo
//   al armar la lista que callarlo).
//
// MODAL: pantalla completa con cabecera (icono del tipo, título,
//   materia y grados, aviso de retomar, PILL "Página − n +" y el
//   botón ✕). El clic en el fondo NO cierra y la tecla Esc NO
//   cierra: SOLO el botón ✕ (petición explícita: un clic de más no
//   puede botar el documento). Mientras está abierto se bloquea el
//   scroll de la página y el foco queda atrapado dentro del modal.
//
// PÁGINA GUARDADA: el visor de Drive vive en un iframe de OTRO
//   origen, así que su scroll interno no se puede leer. La solución
//   es la pill "Página − n +" de la cabecera: el estudiante la
//   ajusta y se guarda SOLA al cambiar (con retardo corto), al
//   cerrar con ✕, y también al cerrar la pestaña o el navegador
//   (pagehide + visibilitychange). Al reabrir se restaura la pill y
//   para los PDF de Drive se intenta abrir el visor directo en esa
//   página (#page=N — mejor esfuerzo: si el visor lo ignora, el
//   aviso "Continuar en la pág. N" igual le dice dónde iba).
//
// PUREZA: componente SOLO DE PANTALLA — no toca Firestore ni
//   Sheets, no puntúa, no importa db.js. Su única escritura es
//   localStorage (progreso de lectura). CSS implícito inyectado UNA
//   sola vez (id "docsdrive-estilos"). 100% responsivo (en móvil el
//   modal ocupa toda la pantalla y la rejilla baja de columnas).
// Convención: fondo blanco · paleta del proyecto
//   (morado/rojo/naranja/azul/verde) · textos SIEMPRE escapados.
// ============================================================

import { escapeHtml } from "./helpers.js";

/* ---------------- Constantes ---------------- */

const VERSION = 1;
const CLAVE_PROGRESO = "mco_docsdrive_progreso_v1";

// Etiqueta y colores por TIPO de documento (paleta del proyecto)
const TIPOS = {
  archivo:      { etiqueta: "PDF",    fondo: "#fee2e2", color: "#b91c1c" },
  documento:    { etiqueta: "DOC",    fondo: "#dbeafe", color: "#1d4ed8" },
  hoja:         { etiqueta: "HOJA",   fondo: "#dcfce7", color: "#15803d" },
  presentacion: { etiqueta: "DIAP",   fondo: "#ffedd5", color: "#c2410c" },
  formulario:   { etiqueta: "FORM",   fondo: "#ede9fe", color: "#6d28d9" },
  carpeta:      { etiqueta: "CARPETA", fondo: "#fef3c7", color: "#b45309" },
  enlace:       { etiqueta: "URL",    fondo: "#e2e8f0", color: "#475569" },
};

// Colores que rotan por materia (punto de la sección)
const COLORES_MATERIA = [
  "#7c3aed", "#dc2626", "#ea580c", "#2563eb",
  "#16a34a", "#0891b2", "#db2777", "#65a30d",
];

const SVG_X =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2.6" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M6 6l12 12M18 6L6 18"/></svg>';

let estilosListos = false;

/* ---------------- Helpers de texto ---------------- */

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* ---------------- Enlaces: tipo + ID ---------------- */

function resolverEnlace(enlace) {
  const url = String(enlace || "").trim();
  if (!url) {
    throw new Error(
      "docsdrive.js: cada documento necesita su 'enlace' de Google Drive (llegó uno vacío)."
    );
  }
  let m = url.match(/drive\.google\.com\/file\/d\/([-\w]{10,})/i);
  if (m) return { tipo: "archivo", id: m[1] };
  m = url.match(/docs\.google\.com\/document\/d\/([-\w]{10,})/i);
  if (m) return { tipo: "documento", id: m[1] };
  m = url.match(/docs\.google\.com\/spreadsheets\/d\/([-\w]{10,})/i);
  if (m) return { tipo: "hoja", id: m[1] };
  m = url.match(/docs\.google\.com\/presentation\/d\/([-\w]{10,})/i);
  if (m) return { tipo: "presentacion", id: m[1] };
  m = url.match(/docs\.google\.com\/forms\/d(?:_e)?\/([-\w]{10,})/i);
  if (m) return { tipo: "formulario", id: m[1] };
  m = url.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([-\w]{10,})/i);
  if (m) return { tipo: "carpeta", id: m[1] };
  m = url.match(/[?&]id=([-\w]{10,})/i); // open?id=… de Drive
  if (m) return { tipo: "archivo", id: m[1] };
  if (/^https?:\/\//i.test(url)) return { tipo: "enlace", id: url };
  throw new Error(
    `docsdrive.js: no pude sacar el ID del enlace "${url}". Usa un enlace de ` +
    "Google Drive (…/file/d/ID/…, …/document/d/ID/…) u otra URL http(s)."
  );
}

// URL del visor embebible según el tipo
function urlVisor(doc) {
  const { tipo, id } = doc._res;
  switch (tipo) {
    case "archivo":      return `https://drive.google.com/file/d/${id}/preview`;
    case "documento":    return `https://docs.google.com/document/d/${id}/preview`;
    case "hoja":         return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    case "presentacion": return `https://docs.google.com/presentation/d/${id}/preview`;
    case "formulario":   return `https://docs.google.com/forms/d/${id}/viewform?embedded=true`;
    case "carpeta":      return `https://drive.google.com/embeddedfolderview?id=${id}#list`;
    default:             return id; // enlace directo http(s)
  }
}

function tituloDesdeEnlace(doc) {
  if (doc._res.tipo !== "enlace") return "";
  try {
    const sinQuery = doc._res.id.split(/[?#]/)[0];
    const partes = sinQuery.split("/").filter(Boolean);
    const nombre = decodeURIComponent(partes[partes.length - 1] || "");
    return nombre.replace(/\.[a-z0-9]{2,5}$/i, "");
  } catch {
    return "";
  }
}

/* ---------------- Grados: normalización ----------------
   3 · "3" · "3°" · "grado 3"  →  {3}       (etiqueta "3°")
   "3-5"                       →  {3,4,5}   (etiqueta "3° a 5°")
   [3, "4°", "5-6"]            →  {3,4,5,6} (etiquetas por pieza)   */

function normalizarGradoNumero(valor) {
  const texto = String(valor ?? "").trim();
  // Acepta negativos: convención del proyecto — Parvularia4=-2, Parvularia5=-1,
  // Parvularia6=0 y 1°..99°=1..99.
  const m = texto.match(/-?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isInteger(n) && n >= -2 && n <= 99 ? n : null;
}

// Nombre para MOSTRAR: 3 → "3°" · -2 → "Parvularia 4" (convención del proyecto)
function etiquetaGrado(n) {
  if (n >= 1) return n + "°";
  if (n >= -2) return "Parvularia " + (n + 6);
  return String(n);
}

function normalizarGrados(valor) {
  const numeros = new Set();
  const etiquetas = [];
  const pieza = (v) => {
    if (v == null || v === "") return;
    if (Array.isArray(v)) { v.forEach(pieza); return; }
    if (typeof v === "number" || (typeof v === "string" && /^\s*-?\d+\s*$/.test(v))) {
      const n = normalizarGradoNumero(v);
      if (n != null) { numeros.add(n); etiquetas.push(etiquetaGrado(n)); }
      return;
    }
    const texto = String(v).trim();
    const rango = texto.match(/^(\d+)\s*(?:[-–aA]\s*|\s*a\s*)(\d+)$/);
    if (rango) {
      const a = normalizarGradoNumero(rango[1]);
      const b = normalizarGradoNumero(rango[2]);
      if (a != null && b != null && a <= b) {
        for (let n = a; n <= b; n++) numeros.add(n);
        etiquetas.push(`${a}° a ${b}°`);
        return;
      }
    }
    const n = normalizarGradoNumero(texto); // "3°", "grado 3", "-2", "3-A"…
    if (n != null) {
      numeros.add(n);
      const soloNumero = /^-?\d+$/.test(texto);
      etiquetas.push(soloNumero ? etiquetaGrado(n) : texto.replace(/^grado\s*/i, ""));
    }
  };
  pieza(valor);
  return { numeros, etiquetas: [...new Set(etiquetas)] };
}

/* ---------------- Progreso en localStorage ---------------- */

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

function registroProgreso(idDoc) {
  return leerProgreso()[idDoc] || null;
}

// Marca la APERTURA de un documento (veces + última vez; conserva página)
function marcarApertura(idDoc) {
  const mapa = leerProgreso();
  const antes = mapa[idDoc] || {};
  mapa[idDoc] = {
    pagina: Math.max(1, Number(antes.pagina) || 1),
    ultimaVez: new Date().toISOString(),
    veces: (Number(antes.veces) || 0) + 1,
  };
  escribirProgreso(mapa);
}

function guardarPagina(idDoc, pagina) {
  const mapa = leerProgreso();
  const antes = mapa[idDoc] || {};
  mapa[idDoc] = {
    pagina: Math.max(1, Math.round(Number(pagina) || 1)),
    ultimaVez: antes.ultimaVez || new Date().toISOString(),
    veces: Math.max(1, Number(antes.veces) || 1),
  };
  escribirProgreso(mapa);
}

/* ---------------- Estilos (UNA sola vez) ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "docsdrive-estilos";
  estilo.textContent = `
    .dd-biblioteca { width: 100%; box-sizing: border-box; color: #0f172a; }
    .dd-biblioteca *, .dd-biblioteca *::before, .dd-biblioteca *::after {
      box-sizing: border-box;
    }
    .dd-cab { display: flex; align-items: baseline; gap: .6rem;
      flex-wrap: wrap; margin: 0 0 1rem; }
    .dd-titulo { font-size: 1.25rem; font-weight: 800; margin: 0; }
    .dd-sub { color: #64748b; font-size: .9rem; font-weight: 500; }

    .dd-materia { margin: 0 0 1.35rem; }
    .dd-materia-cab { display: flex; align-items: center; gap: .5rem;
      margin: 0 0 .6rem; }
    .dd-punto { width: 11px; height: 11px; border-radius: 50%; flex: none; }
    .dd-materia-titulo { font-size: 1.02rem; font-weight: 700; margin: 0; }
    .dd-conteo { font-size: .72rem; font-weight: 600; color: #475569;
      background: #f1f5f9; border-radius: 999px; padding: 2px 9px; }

    .dd-rejilla { display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: .75rem; }
    .dd-tarjeta { display: flex; align-items: center; gap: .7rem;
      text-align: left; width: 100%; background: #fff;
      border: 1px solid #e2e8f0; border-radius: 12px; padding: .65rem .7rem;
      cursor: pointer; font: inherit; color: inherit;
      transition: border-color .15s, box-shadow .15s, transform .15s; }
    .dd-tarjeta:hover { border-color: #a78bfa;
      box-shadow: 0 4px 14px rgba(79, 70, 229, .12);
      transform: translateY(-1px); }
    .dd-tarjeta:focus-visible { outline: 2px solid #7c3aed;
      outline-offset: 2px; }
    .dd-ficha { width: 46px; height: 46px; border-radius: 10px; flex: none;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: .66rem; letter-spacing: .02em; }
    .dd-ficha[data-tipo="carpeta"] { font-size: .52rem; }
    .dd-cuerpo { min-width: 0; flex: 1; }
    .dd-nombre { font-size: .92rem; font-weight: 650; color: #1e293b;
      line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden; }
    .dd-datos { display: flex; flex-wrap: wrap; gap: .3rem;
      margin-top: .3rem; }
    .dd-chip { font-size: .68rem; font-weight: 600; color: #475569;
      background: #f1f5f9; padding: 1px 7px; border-radius: 999px; }
    .dd-retomar { font-size: .68rem; font-weight: 700; color: #92400e;
      background: #fef3c7; border: 1px solid #fde68a;
      padding: 1px 7px; border-radius: 999px; }

    .dd-vacio { border: 1.5px dashed #cbd5e1; border-radius: 12px;
      padding: 1.6rem 1rem; text-align: center; color: #64748b;
      font-size: .95rem; background: #f8fafc; }
    .dd-vacio strong { color: #334155; }

    /* ---------- Modal (SOLO se cierra con la ✕) ---------- */
    html.dd-abierto, html.dd-abierto body { overflow: hidden !important; }
    .dd-fondo { position: fixed; inset: 0; z-index: 9990;
      background: rgba(15, 23, 42, .58);
      display: flex; align-items: center; justify-content: center;
      padding: 1.2rem; }
    .dd-modal { width: min(1100px, 100%); height: min(880px, 100%);
      background: #fff; border-radius: 14px;
      box-shadow: 0 25px 60px rgba(2, 6, 23, .35);
      display: flex; flex-direction: column; overflow: hidden; }
    .dd-modal-cab { display: flex; align-items: center; gap: .6rem;
      padding: .55rem .7rem; border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap; }
    .dd-modal-ficha { width: 38px; height: 38px; border-radius: 9px;
      flex: none; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: .58rem; letter-spacing: .02em; }
    .dd-modal-ficha[data-tipo="carpeta"] { font-size: .46rem; }
    .dd-modal-titulos { min-width: 0; flex: 1 1 220px; }
    .dd-modal-titulo { font-size: .98rem; font-weight: 700; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dd-modal-sub { font-size: .74rem; color: #64748b; margin-top: 1px; }
    .dd-aviso { font-size: .72rem; font-weight: 700; color: #1d4ed8;
      background: #dbeafe; border: 1px solid #bfdbfe; padding: 3px 9px;
      border-radius: 999px; white-space: nowrap; }
    .dd-pill { display: inline-flex; align-items: center; gap: .4rem;
      background: #f1f5f9; border-radius: 999px; padding: 3px 6px 3px 10px;
      font-size: .78rem; font-weight: 600; color: #334155;
      white-space: nowrap; }
    .dd-pill button { width: 24px; height: 24px; border-radius: 50%;
      border: 1px solid #cbd5e1; background: #fff; color: #334155;
      font-size: .95rem; line-height: 1; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      padding: 0; }
    .dd-pill button:hover { background: #f1f5f9; }
    .dd-pill button:focus-visible { outline: 2px solid #7c3aed; }
    .dd-pill input { width: 46px; text-align: center;
      border: 1px solid #e2e8f0; border-radius: 6px; font: inherit;
      font-weight: 700; color: #0f172a; padding: 2px 2px; background: #fff; }
    .dd-pill input::-webkit-outer-spin-button,
    .dd-pill input::-webkit-inner-spin-button { -webkit-appearance: none;
      margin: 0; }
    .dd-pill input[type="number"] { -moz-appearance: textfield;
      appearance: textfield; }
    .dd-x { width: 38px; height: 38px; border-radius: 50%; border: none;
      background: #fee2e2; color: #b91c1c; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex: none; margin-left: auto; }
    .dd-x:hover { background: #fecaca; }
    .dd-x:focus-visible { outline: 2px solid #b91c1c; outline-offset: 2px; }
    .dd-x svg { width: 16px; height: 16px; }
    .dd-modal-cuerpo { flex: 1; min-height: 0; background: #f8fafc; }
    .dd-iframe { width: 100%; height: 100%; border: 0; display: block; }

    @media (max-width: 640px) {
      .dd-fondo { padding: 0; }
      .dd-modal { width: 100%; height: 100%; border-radius: 0; }
      .dd-rejilla { grid-template-columns: repeat(auto-fill,
        minmax(160px, 1fr)); gap: .55rem; }
      .dd-modal-ficha { display: none; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Utilidad interna ---------------- */

function colorMateria(materia) {
  let h = 0;
  const t = normalizar(materia);
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return COLORES_MATERIA[h % COLORES_MATERIA.length];
}

function prepararDocs(docs) {
  if (!Array.isArray(docs)) {
    throw new Error(
      "docsdrive.js: 'docs' debe ser una LISTA de documentos " +
      "({ enlace, materia, grados, titulo? })."
    );
  }
  return docs.map((doc, i) => {
    if (!doc || typeof doc !== "object") {
      throw new Error(
        `docsdrive.js: el documento #${i + 1} no es un objeto ` +
        "{ enlace, materia, grados, titulo? }."
      );
    }
    const res = resolverEnlace(doc.enlace);
    const materia = String(doc.materia || "").trim();
    if (!materia) {
      throw new Error(
        `docsdrive.js: el documento #${i + 1} (${doc.enlace}) necesita ` +
        "'materia' para poder agruparlo."
      );
    }
    const grados = normalizarGrados(doc.grados ?? doc.grado);
    if (!grados.numeros.size) {
      throw new Error(
        `docsdrive.js: el documento "${materia}" (#${i + 1}) necesita ` +
        "'grados' (uno o más: 3, \"3°\", \"3-5\", [3, 4])."
      );
    }
    const provisional = { _res: res };
    const titulo =
      String(doc.titulo || "").trim() || tituloDesdeEnlace(provisional) || "Documento";
    return {
      enlace: String(doc.enlace).trim(),
      materia,
      titulo,
      grados,
      _res: res,
      _idx: i, // índice en la LISTA original → lo usan las tarjetas
    };
  });
}

/* ============================================================
   crearDocsdrive(opciones) — fábrica de la biblioteca
   ============================================================ */

export function crearDocsdrive(opciones = {}) {
  inyectarEstilos();

  /* ---- estado ---- */
  const estado = {
    docs: opciones.docs != null ? prepararDocs(opciones.docs) : [],
    grado: null,
    titulo: opciones.titulo != null ? String(opciones.titulo).trim() : "Recursos",
  };
  if (opciones.grado != null && opciones.grado !== "") {
    const g = normalizarGradoNumero(opciones.grado);
    if (g == null) {
      throw new Error(
        "docsdrive.js: 'grado' debe ser un número (3, \"3\", \"3°\"). " +
        `Llegó: ${opciones.grado}.`
      );
    }
    estado.grado = g;
  }

  /* ---- sección raíz ---- */
  const seccion = document.createElement("section");
  seccion.className = "dd-biblioteca";
  seccion.dataset.docsdrive = "v" + VERSION;
  if (opciones.contenedor) {
    (typeof opciones.contenedor === "string"
      ? document.querySelector(opciones.contenedor)
      : opciones.contenedor
    )?.append(seccion);
  }

  /* ---- pintar la biblioteca ---- */
  function pintar() {
    const g = estado.grado;
    const visibles = estado.docs.filter(
      (d) => !g || d.grados.numeros.has(g)
    );

    // agrupar por materia (orden de llegada) y ordenar materias A→Z
    const grupos = new Map();
    for (const d of visibles) {
      if (!grupos.has(d.materia)) grupos.set(d.materia, []);
      grupos.get(d.materia).push(d);
    }
    const materias = [...grupos.keys()].sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );

    const sub =
      g == null
        ? `${visibles.length} ${visibles.length === 1 ? "documento" : "documentos"} · todos los grados`
        : `${visibles.length} ${visibles.length === 1 ? "documento" : "documentos"} · ${
            g >= 1 ? "grado " + g + "°" : etiquetaGrado(g)
          }`;

    let html = `<div class="dd-cab">
      <h2 class="dd-titulo">${escapeHtml(estado.titulo)}</h2>
      <span class="dd-sub">${escapeHtml(sub)}</span>
    </div>`;

    if (!visibles.length) {
      html += `<div class="dd-vacio">No hay recursos ${
        g != null
          ? `para el <strong>${g >= 1 ? "grado " + g + "°" : escapeHtml(etiquetaGrado(g))}</strong>`
          : "por ahora"
      }. Cuando el docente agregue documentos, aparecerán aquí ordenados por materia.</div>`;
    } else {
      html += materias
        .map((materia, gi) => {
          const docsMateria = grupos.get(materia);
          const color = colorMateria(materia);
          const tarjetas = docsMateria
            .map((d) => {
              const prog = registroProgreso(d._res.id);
              const retomar =
                prog && Number(prog.pagina) > 1
                  ? `<span class="dd-retomar">Retomar pág. ${Number(prog.pagina)}</span>`
                  : "";
              const chips = d.grados.etiquetas
                .map((e) => `<span class="dd-chip">${escapeHtml(e)}</span>`)
                .join("");
              return `<button type="button" class="dd-tarjeta" data-idx="${d._idx}"
                  aria-label="Abrir ${escapeHtml(d.titulo)} — ${escapeHtml(d.materia)}">
                <span class="dd-ficha" data-tipo="${d._res.tipo}"
                  style="background:${TIPOS[d._res.tipo].fondo};color:${TIPOS[d._res.tipo].color}">
                  ${TIPOS[d._res.tipo].etiqueta}</span>
                <span class="dd-cuerpo">
                  <span class="dd-nombre">${escapeHtml(d.titulo)}</span>
                  <span class="dd-datos">${chips}${retomar}</span>
                </span>
              </button>`;
            })
            .join("");
          return `<div class="dd-materia">
            <div class="dd-materia-cab">
              <span class="dd-punto" style="background:${color}"></span>
              <h3 class="dd-materia-titulo">${escapeHtml(materia)}</h3>
              <span class="dd-conteo">${
                docsMateria.length === 1 ? "1 recurso" : docsMateria.length + " recursos"
              }</span>
            </div>
            <div class="dd-rejilla">${tarjetas}</div>
          </div>`;
        })
        .join("");
    }

    seccion.innerHTML = html;

    seccion.querySelectorAll(".dd-tarjeta").forEach((btn) => {
      btn.addEventListener("click", () => {
        const doc = estado.docs[Number(btn.dataset.idx)];
        if (doc) abrirDoc(doc);
      });
    });
  }

  /* ---- MODAL (solo se cierra con la ✕) ---- */

  let modal = null;          // elemento .dd-fondo abierto
  let docActual = null;      // documento abierto
  let focoAntes = null;      // foco que devolvemos al cerrar
  let temporizadorPagina = null;

  function guardarPaginaActual() {
    if (!modal || !docActual) return;
    const entrada = modal.querySelector(".dd-pill input");
    const valor = Number(entrada && entrada.value) || 1;
    guardarPagina(docActual._res.id, valor);
    pintar(); // refresca la tarjeta "Retomar pág. N"
  }

  function programarGuardado() {
    clearTimeout(temporizadorPagina);
    temporizadorPagina = setTimeout(guardarPaginaActual, 500);
  }

  function abrirDoc(doc) {
    cerrarModal();
    docActual = doc;
    marcarApertura(doc._res.id);

    const prog = registroProgreso(doc._res.id);
    const pagina = Math.max(1, Number(prog && prog.pagina) || 1);
    const continuar = pagina > 1;

    focoAntes = document.activeElement;

    const tipo = TIPOS[doc._res.tipo];
    const chips = doc.grados.etiquetas
      .map((e) => `<span class="dd-chip">${escapeHtml(e)}</span>`)
      .join("");
    const sub = [
      doc.materia ? escapeHtml(doc.materia) : "",
      chips,
    ].filter(Boolean).join(" · ");

    // Mejor esfuerzo para PDF de Drive: abrir directo en la página guardada
    let src = urlVisor(doc);
    if (continuar && doc._res.tipo === "archivo") src += `#page=${pagina}`;

    modal = document.createElement("div");
    modal.className = "dd-fondo";
    modal.innerHTML = `
      <div class="dd-modal" role="dialog" aria-modal="true"
        aria-label="${escapeHtml(doc.titulo)}">
        <div class="dd-modal-cab">
          <span class="dd-modal-ficha" data-tipo="${doc._res.tipo}"
            style="background:${tipo.fondo};color:${tipo.color}">
            ${tipo.etiqueta}</span>
          <span class="dd-modal-titulos">
            <p class="dd-modal-titulo">${escapeHtml(doc.titulo)}</p>
            <div class="dd-modal-sub">${sub}</div>
          </span>
          ${continuar ? `<span class="dd-aviso">Continuar en la pág. ${pagina}</span>` : ""}
          <span class="dd-pill" title="Marca tu página: se guarda sola">
            <span>Página</span>
            <button type="button" class="dd-menos" aria-label="Página anterior">−</button>
            <input type="number" min="1" step="1" inputmode="numeric"
              value="${pagina}" aria-label="Página del documento" />
            <button type="button" class="dd-mas" aria-label="Página siguiente">+</button>
          </span>
          <button type="button" class="dd-x" aria-label="Cerrar documento">
            ${SVG_X}</button>
        </div>
        <div class="dd-modal-cuerpo">
          <iframe class="dd-iframe" title="${escapeHtml(doc.titulo)}"
            src="${escapeHtml(src)}"
            allow="autoplay; fullscreen; encrypted-media"></iframe>
        </div>
      </div>`;

    document.body.append(modal);
    document.documentElement.classList.add("dd-abierto");

    // SOLO la ✕ cierra: clic en el fondo y Esc se IGNORAN a propósito
    modal.querySelector(".dd-x").addEventListener("click", cerrarModal);
    modal.querySelector(".dd-menos").addEventListener("click", () => {
      const entrada = modal.querySelector(".dd-pill input");
      entrada.value = Math.max(1, (Number(entrada.value) || 1) - 1);
      programarGuardado();
    });
    modal.querySelector(".dd-mas").addEventListener("click", () => {
      const entrada = modal.querySelector(".dd-pill input");
      entrada.value = (Number(entrada.value) || 1) + 1;
      programarGuardado();
    });
    modal.querySelector(".dd-pill input").addEventListener("input", programarGuardado);

    // Atrapar el foco dentro del modal (Tab no se escapa)
    modal.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focos = [...modal.querySelectorAll("button, input")].filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
      if (!focos.length) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        ultimo.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        primero.focus();
        e.preventDefault();
      }
    });

    // Cerrar pestaña/navegador con el modal abierto: lo cubren los
    // listeners globales (pagehide / visibilitychange) de la biblioteca.

    const botonX = modal.querySelector(".dd-x");
    botonX.focus();
  }

  function cerrarModal() {
    if (!modal) return;
    guardarPaginaActual();
    clearTimeout(temporizadorPagina);
    modal.remove();
    modal = null;
    docActual = null;
    document.documentElement.classList.remove("dd-abierto");
    if (focoAntes && focoAntes.focus) focoAntes.focus();
    focoAntes = null;
  }

  /* ---- guardado global (pestaña/navegador cerrados) ----
     Registrado UNA vez por biblioteca (no por apertura). */
  const alEsconder = () => {
    if (modal) guardarPaginaActual();
  };
  window.addEventListener("pagehide", alEsconder);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") alEsconder();
  });

  /* ---- API pública ---- */
  const api = {
    elemento: seccion,

    actualizar(cambios = {}) {
      if (cambios.docs != null) estado.docs = prepararDocs(cambios.docs);
      if ("grado" in cambios) {
        if (cambios.grado == null || cambios.grado === "") {
          estado.grado = null; // sin filtro: todos los grados
        } else {
          const g = normalizarGradoNumero(cambios.grado);
          if (g == null) {
            throw new Error(
              "docsdrive.js: 'grado' debe ser un número (3, \"3\", \"3°\"). " +
              `Llegó: ${cambios.grado}.`
            );
          }
          estado.grado = g;
        }
      }
      if ("titulo" in cambios) {
        estado.titulo =
          cambios.titulo != null ? String(cambios.titulo).trim() : "Recursos";
      }
      pintar();
    },

    abrir(docOEnlace) {
      let doc = null;
      if (typeof docOEnlace === "string") {
        const res = resolverEnlace(docOEnlace);
        doc = estado.docs.find((d) => d._res.id === res.id) || {
          enlace: docOEnlace,
          materia: "",
          titulo: "Documento",
          grados: { numeros: new Set(), etiquetas: [] },
          _res: res,
        };
      } else if (docOEnlace && typeof docOEnlace === "object") {
        doc =
          estado.docs.find((d) => d.enlace === docOEnlace.enlace) ||
          prepararDocs([docOEnlace])[0];
      } else {
        throw new Error(
          "docsdrive.js: abrir() necesita un documento ({ enlace, … }) o un enlace."
        );
      }
      abrirDoc(doc);
    },

    cerrar: cerrarModal,

    get abierto() {
      return !!modal;
    },
  };

  pintar();
  return api;
}