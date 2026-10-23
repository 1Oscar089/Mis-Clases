// ============================================================
// clases.js — VISTA de piezas: Clases · Exámenes · Tareas ·
//             Recursos (js/components/clases.js) · v6
//
// UNA SOLA implementación para las cuatro páginas del inicio:
//   renderPiezas(perfil, contenedor, tipo)  con  tipo =
//     "clase" | "examen" | "tarea" | "recurso"
//   · clases.js    → render(perfil, contenedor) = piezas "clase"
//   · examenes.js  → piezas "examen"
//   · tareas.js    → piezas "tarea"
//   · recursos.js  → piezas "recurso"
//
// GUARDADO (todo "como clases" en Firestore):
//   clases/{grado}/{materiaId}/{id}
//     { tipo:"clase"|"examen"|"tarea"|"recurso",
//       visible:true|false, dia, unidad, leccion, clase (título),
//       creadoEn, creadoPor }
//   · EXÁMENES y TAREAS viven EXACTAMENTE IGUAL que las clases:
//     cambia solo el campo tipo. El contenido (.js) vive en
//     public/clases/{grado}/{materiaId}/{id}.js.
//
// VISIBLE / INVISIBLE (docente):
//   · Cada tarjeta del docente lleva el OJO: visible ⇄ invisible.
//     Es UN boolean en Firebase (clase.visible). Una pieza invisible
//     NO se muestra al estudiante — para él no existe.
//
// ACCIONES DEL DOCENTE (dentro de la tarjeta, SOLO ICONOS):
//   · lápiz = editar título · ojo = visible/invisible ·
//     gráfica = resultados (clase/tarea/examen) ·
//     papelera = ELIMINAR (con confirmación). Al eliminar, los
//     estudiantes que estén DENTRO vuelven solos al inicio.
//
// VIGÍA EN TIEMPO REAL (estudiante):
//   · Mientras el estudiante está en esta vista (o DENTRO de una
//     pieza), db.clases.vigilar escucha sus materias. Si la pieza
//     abierta se elimina o pasa a invisible, el estudiante vuelve
//     solo a inicio.js y, si era CLASE, la nota se consolida
//     (Sheets + users/{uid}/notas/{materiaId}.diaN vía db.js).
//
// ESTUDIANTE:
//   · Elige SU materia (chip) y ve las piezas VISIBLES de ese tipo,
//     SEPARADAS POR UNIDAD (Unidad 1, Unidad 2… y «General» al final
//     si algo no tiene unidad).
//
// DOCENTE:
//   · Chips de grado y materia · buscador · botón «Crear …» (día,
//     unidad, lección, título) · ojo visible/invisible por pieza ·
//     MODAL DE RESULTADOS por pieza: cada estudiante del grado con
//     su nota POR ACTIVIDAD y la NOTA FINAL (viene de notas/{uid}/
//     clases/{claseId}; la misma nota queda espejada en el user del
//     estudiante como nota del día).
//
// REGLA DEL PROYECTO: nada toca Firestore directo → todo pasa por db.js
import { db } from "../data/db.js";
import { GRADOS } from "./auth.js";
import { renderUserbar } from "./userbar.js";
import { renderInicio } from "./inicio.js";
import { escapeHtml } from "../utils/helpers.js";

/* ---------------- Materias ---------------- */

export const MATERIAS = [
  { id: "comunicacion", nombre: "Comunicación" },
  { id: "comunicacion-y-literatura", nombre: "Comunicación y Literatura" },
  { id: "lengua-y-literatura", nombre: "Lengua y Literatura" },
  { id: "ingles", nombre: "Inglés" },
  { id: "numeros-y-formas", nombre: "Números y Formas" },
  { id: "aritmetica-y-finanzas", nombre: "Aritmética y Finanzas" },
  { id: "matematica-y-datos", nombre: "Matemática y Datos" },
  { id: "ciencia-y-tecnologia", nombre: "Ciencia y Tecnología" },
  { id: "ciudadania-y-valores", nombre: "Ciudadanía y Valores" },
  { id: "desarrollo-corporal", nombre: "Desarrollo Corporal" },
  { id: "educacion-fisica", nombre: "Educación Física" },
  { id: "artes", nombre: "Artes" },
];

/* ---------------- Tipos de pieza ---------------- */

export const TIPOS = {
  clase: {
    etiqueta: "clase",
    plural: "Clases",
    icono: "book",
    color: "#2563eb",
    crear: "Crear clase",
    descrip: "Las clases de la materia",
  },
  examen: {
    etiqueta: "examen",
    plural: "Exámenes",
    icono: "file-earmark-text",
    color: "#ef4444",
    crear: "Crear examen",
    descrip: "Pruebas que no se pueden salir sin enviar",
  },
  tarea: {
    etiqueta: "tarea",
    plural: "Tareas",
    icono: "list-check",
    color: "#7c3aed",
    crear: "Crear tarea",
    descrip: "Tareas para hacer fuera de clase",
  },
  recurso: {
    etiqueta: "recurso",
    plural: "Recursos",
    icono: "folder2-open",
    color: "#16a34a",
    crear: "Crear recurso",
    descrip: "Material y archivos de apoyo",
  },
};

/* ---------------- Estado del módulo ---------------- */

let perfilActual = null;
let contenedorActual = null;
let esDocente = false;
let tipoActual = "clase";
let gradoSel = null;      // docente: id numérico del grado
let materiaSel = null;    // materia elegida (docente y estudiante)
let piezasCache = [];     // listado en memoria (ya ordenado)
let textoBusqueda = "";
let cargando = false;
let estilosListos = false;
let vigia = null;         // vigía del grado (estudiante): { quitar() }
let piezaAbierta = null;  // pieza abierta por el estudiante: { clase, raiz }

const CLAVE_SEL_DOCENTE = "mco_clases_docente";       // última selección del docente
const CLAVE_SEL_ESTUDIANTE = "mco_clases_estudiante"; // última materia del estudiante
const claveCacheEstudiante = (grado) => `mco_clases_g${grado}`;
// caché del DOCENTE por tipo (pintado instantáneo + frescura Firestore)
const claveCacheDocente = (grado, materia, tipo) =>
  `mco_piezas_g${grado}_${materia}_${tipo}`;

const PALETA = ["#7c3aed", "#ef4444", "#f97316", "#2563eb", "#16a34a", "#0891b2"];
const colorDeMateria = (materiaId) => {
  const i = MATERIAS.findIndex((m) => m.id === materiaId);
  return PALETA[(i < 0 ? 0 : i) % PALETA.length];
};

/* ---------------- Helpers ---------------- */

// "#7c3aed", 0.12 → "rgba(124, 58, 237, 0.12)"
function rgba(hex, alfa) {
  const n = (hex || "#000000").replace("#", "");
  return `rgba(${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)}, ${alfa})`;
}

// minúsculas y sin acentos (para buscar y para nombres de archivo)
function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// "Sumas con llevando" → "sumas-con-llevando" (para ids de archivo)
function slug(texto) {
  return normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "pieza";
}

function nombreGrado(id) {
  const g = GRADOS.find((x) => x.id === id);
  return g ? g.nombre : `Grado ${id}`;
}

function materiaDe(id) {
  return MATERIAS.find((m) => m.id === id) || { id, nombre: id };
}

function tipoDe(id) {
  return TIPOS[id] || TIPOS.clase;
}

// Toast de aviso (mismo patrón que auth.js)
function notify(mensaje, variant = "warning", duracion = 4000) {
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

// Orden: día → unidad → lección → título (siempre UNA materia y tipo)
function compararPiezas(a, b) {
  const d = (Number(a.dia) || 0) - (Number(b.dia) || 0);
  if (d !== 0) return d;
  const ua = Number(a.unidad);
  const ub = Number(b.unidad);
  const u = (Number.isFinite(ua) ? ua : Number.MAX_SAFE_INTEGER) -
            (Number.isFinite(ub) ? ub : Number.MAX_SAFE_INTEGER);
  if (u !== 0) return u;
  const l = (Number(a.leccion) || 0) - (Number(b.leccion) || 0);
  return l !== 0 ? l : String(a.clase || "").localeCompare(String(b.clase || ""), "es");
}

// Etiqueta del grupo de unidad: "Unidad 3" · el texto tal cual · "General"
function etiquetaUnidad(u) {
  const t = String(u ?? "").trim();
  return t === "" ? "General" : /^-?\d+(\.\d+)?$/.test(t) ? "Unidad " + t : t;
}

// Agrupa la lista por unidad: [{ unidad, etiqueta, piezas }]
// — numéricas primero (asc), luego las de texto (alfabético),
//   «General» (sin unidad) SIEMPRE al final.
function gruposPorUnidad(lista) {
  const mapa = new Map();
  lista.forEach((c) => {
    const t = String(c.unidad ?? "").trim();
    const esNum = t !== "" && /^-?\d+(\.\d+)?$/.test(t);
    const clave = t === "" ? "§general" : (esNum ? "§num:" + t : "§txt:" + normalizar(t));
    if (!mapa.has(clave)) mapa.set(clave, { clave, unidad: t, esNum, piezas: [] });
    mapa.get(clave).piezas.push(c);
  });
  const grupos = [...mapa.values()];
  const rango = (g) =>
    g.clave === "§general" ? 2 : g.esNum ? 0 : 1;
  grupos.sort((a, b) => {
    const ra = rango(a);
    const rb = rango(b);
    if (ra !== rb) return ra - rb;
    if (a.esNum && b.esNum) return Number(a.unidad) - Number(b.unidad);
    return a.unidad.localeCompare(b.unidad, "es");
  });
  return grupos.map((g) => ({
    unidad: g.unidad,
    etiqueta: etiquetaUnidad(g.unidad),
    piezas: g.piezas.sort(compararPiezas),
  }));
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "clases-estilos";
  estilo.textContent = `
    .clases-vista {
      max-width: 1100px;
      margin: 0 auto;
      padding: 1.25rem clamp(1rem, 4vw, 2rem) 2.5rem;
      font-family: system-ui, sans-serif;
    }

    .clases-barra {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .5rem;
      margin-bottom: .75rem;
    }

    .clases-btn-volver {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      color: #4b5563;
      border-radius: 999px;
      padding: .42rem .85rem;
      font-size: .85rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color .15s ease, color .15s ease, box-shadow .15s ease;
    }
    .clases-btn-volver:hover {
      border-color: #7c3aed;
      color: #7c3aed;
      box-shadow: 0 4px 14px rgba(124, 58, 237, .12);
    }

    .clases-chip {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      border-radius: 999px;
      padding: .42rem .85rem;
      font-size: .88rem;
      color: #6b7280;
      cursor: pointer;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .clases-chip b { color: #7c3aed; font-weight: 700; }
    .clases-chip:hover {
      border-color: #7c3aed;
      box-shadow: 0 4px 14px rgba(124, 58, 237, .12);
    }

    .clases-buscador-fila {
      display: flex;
      gap: .6rem;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .clases-buscador { flex: 1; min-width: 0; }

    .clases-btn-crear {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      background: #7c3aed;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .68rem 1.15rem;
      font-size: .9rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 6px 18px rgba(124, 58, 237, .3);
      transition: background .15s ease, transform .15s ease;
    }
    .clases-btn-crear:hover { background: #6d28d9; }
    .clases-btn-crear:active { transform: scale(.98); }

    /* ── Encabezado de UNIDAD (separación por unidad) ── */
    .pz-unidad {
      margin: 1.35rem 0 .7rem;
      display: flex;
      align-items: center;
      gap: .6rem;
    }
    .pz-unidad:first-child { margin-top: 0; }
    .pz-unidad h3 {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 800;
      color: #4c1d95;
      white-space: nowrap;
    }
    .pz-unidad::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #e5e7eb;
    }
    .pz-unidad span {
      font-size: .74rem;
      font-weight: 700;
      color: #9ca3af;
      white-space: nowrap;
    }

    .clases-listado {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 1rem;
    }

    .clase-card {
      background: #ffffff;
      border: 1px solid #ece9f6;
      border-left: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-radius: 1.1rem;
      padding: 1rem 1.1rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      cursor: pointer;
      user-select: none;
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .clase-card:hover {
      transform: scale(1.03);
      border-left-color: var(--acento, #7c3aed);
      border-bottom-color: var(--acento, #7c3aed);
      box-shadow: 0 10px 26px rgba(17, 12, 46, .14);
    }
    .clase-card:active { transform: scale(1.01); }

    .clase-cab {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .35rem;
      margin-bottom: .55rem;
    }
    .clase-dia {
      display: inline-block;
      padding: .18rem .6rem;
      border-radius: 999px;
      font-size: .74rem;
      font-weight: 800;
      background: var(--acento-fondo, #f3f0ff);
      color: var(--acento, #7c3aed);
    }
    /* Distintivo INVISIBLE (solo lo ve el docente) */
    .clase-oculta {
      display: inline-flex;
      align-items: center;
      gap: .25rem;
      padding: .18rem .55rem;
      border-radius: 999px;
      font-size: .72rem;
      font-weight: 800;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }
    .clase-card.esta-oculta { opacity: .78; border-style: dashed; }

    .clase-card h3 {
      margin: 0 0 .2rem;
      font-size: 1rem;
      color: #1f2937;
      line-height: 1.3;
    }
    .clase-card p {
      margin: 0;
      font-size: .8rem;
      color: #9ca3af;
    }

    /* Acciones del docente EN la tarjeta (solo iconos):
       lápiz · ojo · resultados · papelera */
    .clase-acciones {
      display: flex;
      flex-wrap: wrap;
      gap: .35rem;
      margin-top: .7rem;
    }
    .clase-accion {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 30px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      color: #6b7280;
      border-radius: .55rem;
      cursor: pointer;
      padding: 0;
      transition: border-color .15s ease, color .15s ease, background .15s ease;
    }
    .clase-accion sl-icon { font-size: 1rem; }
    .clase-accion:hover { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }
    .clase-accion.activa { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }
    .clase-accion.eliminar:hover { border-color: #dc2626; color: #dc2626; background: #fef2f2; }

    .clases-vacio {
      border: 2px dashed #e5e7eb;
      border-radius: 1.25rem;
      padding: 2.25rem 1.25rem;
      text-align: center;
      color: #6b7280;
    }
    .clases-vacio sl-icon { font-size: 2rem; color: #7c3aed; }
    .clases-vacio h3 { margin: .6rem 0 .3rem; color: #374151; font-size: 1.05rem; }
    .clases-vacio p { margin: 0 0 1rem; font-size: .9rem; }

    .clases-cargando {
      text-align: center;
      color: #9ca3af;
      padding: 2rem 0;
      font-size: .92rem;
    }

    /* Modales de selección, creación y resultados */
    .clases-dialogo { --width: min(500px, 92vw); }
    .clases-dialogo::part(panel) { border-radius: 1.25rem; }
    .clases-dialogo sl-button[variant="primary"]::part(base) {
      background: #7c3aed;
      border-color: #7c3aed;
    }
    .clases-dialogo sl-button[variant="primary"]::part(base):hover {
      background: #6d28d9;
      border-color: #6d28d9;
    }

    .clases-opciones {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: .5rem;
    }
    .clases-opcion {
      border: 1px solid #e5e7eb;
      background: #ffffff;
      border-radius: .9rem;
      padding: .6rem .5rem;
      font-size: .85rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: border-color .15s ease, background .15s ease, color .15s ease;
    }
    .clases-opcion:hover { border-color: #7c3aed; color: #7c3aed; }
    .clases-opcion.activa {
      background: #7c3aed;
      border-color: #7c3aed;
      color: #ffffff;
    }

    .clases-crear-info {
      margin: 0 0 .9rem;
      font-size: .88rem;
      color: #6b7280;
    }
    .clases-crear-info strong { color: #7c3aed; }

    .clases-form { display: grid; gap: .75rem; }
    .clases-form sl-input { width: 100%; }

    /* ── Modal de RESULTADOS (docente) ── */
    .pz-dialogo-resultados { --width: min(860px, 94vw); }
    .pz-res-info {
      margin: 0 0 .8rem;
      font-size: .88rem;
      color: #6b7280;
      line-height: 1.5;
    }
    .pz-res-info strong { color: #7c3aed; }
    .pz-res-cargando {
      display: flex;
      align-items: center;
      gap: .5rem;
      color: #6b7280;
      font-size: .9rem;
      padding: 1.2rem 0;
    }
    .pz-res-cargando[hidden] { display: none; }
    .pz-res-tabla {
      max-height: min(420px, 55vh);
      overflow: auto;
      border: 1px solid #e5e7eb;
      border-radius: .8rem;
    }
    .pz-res-tabla table {
      width: 100%;
      border-collapse: collapse;
      font-size: .84rem;
    }
    .pz-res-tabla th, .pz-res-tabla td {
      padding: .5rem .6rem;
      border-bottom: 1px solid #f1f0f7;
      text-align: left;
      white-space: nowrap;
    }
    .pz-res-tabla th {
      position: sticky;
      top: 0;
      background: #f9f7ff;
      color: #4c1d95;
      font-size: .74rem;
      text-transform: uppercase;
      letter-spacing: .03em;
      z-index: 1;
    }
    .pz-res-tabla th small {
      display: block;
      font-size: .68rem;
      font-weight: 600;
      color: #9ca3af;
      text-transform: none;
      letter-spacing: 0;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pz-res-tabla td.num { text-align: center; font-variant-numeric: tabular-nums; }
    .pz-res-tabla tr:last-child td { border-bottom: none; }
    .pz-res-total {
      font-weight: 800;
      color: #4c1d95;
      text-align: center;
    }
    .pz-res-estado {
      display: inline-block;
      padding: .12rem .5rem;
      border-radius: 999px;
      font-size: .7rem;
      font-weight: 800;
    }
    .pz-res-estado.enviado { background: #dcfce7; color: #15803d; }
    .pz-res-estado.curso   { background: #fef9c3; color: #a16207; }
    .pz-res-estado.nada    { background: #f3f4f6; color: #6b7280; }
    .pz-res-vacio {
      padding: 1.4rem 1rem;
      text-align: center;
      color: #6b7280;
      font-size: .9rem;
    }

    /* Celular: buscador y botón apilados */
    @media (max-width: 767px) {
      .clases-buscador-fila { flex-direction: column; align-items: stretch; }
      .clases-btn-crear { justify-content: center; }
      .clase-card h3 { font-size: .95rem; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Render ---------------- */

/**
 * Página «Clases» (la llama inicio.js al hacer clic en la tarjeta).
 */
export function render(perfil, contenedor) {
  return renderPiezas(perfil, contenedor, "clase");
}
export { render as renderClases };

/**
 * Página genérica de un TIPO de pieza (clase/examen/tarea/recurso).
 * Es la que usan clases.js, examenes.js, tareas.js y recursos.js.
 * @param {object} perfil           perfil del usuario (users/{uid})
 * @param {HTMLElement} contenedor  dónde dibujar (main#app)
 * @param {string} tipo             "clase" | "examen" | "tarea" | "recurso"
 */
export function renderPiezas(perfil, contenedor, tipo = "clase") {
  if (!perfil || !contenedor) return;
  tipoActual = TIPOS[tipo] ? tipo : "clase";
  perfilActual = perfil;
  contenedorActual = contenedor;
  esDocente = perfil.rol === "docente";
  piezasCache = [];
  textoBusqueda = "";
  piezaAbierta = null;
  inyectarEstilos();
  iniciarVigia();   // estudiante: escucha eliminadas/invisibles en vivo

  gradoSel = null;
  materiaSel = null;
  try {
    if (esDocente) {
      // Recordar la última selección del docente (si sigue siendo válida)
      const sel = JSON.parse(localStorage.getItem(CLAVE_SEL_DOCENTE) || "null");
      if (sel && GRADOS.some((g) => g.id === sel.grado) && MATERIAS.some((m) => m.id === sel.materia)) {
        gradoSel = sel.grado;
        materiaSel = sel.materia;
      }
    } else {
      // Recordar la última materia elegida por el estudiante
      const sel = JSON.parse(localStorage.getItem(CLAVE_SEL_ESTUDIANTE) || "null");
      if (sel && MATERIAS.some((m) => m.id === sel.materia)) materiaSel = sel.materia;
    }
  } catch (e) { /* localStorage no disponible: ignorar */ }

  renderUserbar(perfil, tipoDe(tipoActual).plural);
  renderInterno();
  cargarListado();
}

function guardarSel() {
  try {
    if (esDocente) {
      localStorage.setItem(CLAVE_SEL_DOCENTE, JSON.stringify({ grado: gradoSel, materia: materiaSel }));
    } else {
      localStorage.setItem(CLAVE_SEL_ESTUDIANTE, JSON.stringify({ materia: materiaSel }));
    }
  } catch (e) { /* ignorar */ }
}

function renderInterno() {
  const info = tipoDe(tipoActual);

  // Docente: chips de grado y materia · Estudiante: solo chip de materia
  const chips = esDocente ? `
      <button class="clases-chip" id="chip-grado">
        <sl-icon name="mortarboard"></sl-icon>
        Grado: <b>${gradoSel != null ? escapeHtml(nombreGrado(gradoSel)) : "elegir"}</b>
        <sl-icon name="chevron-down"></sl-icon>
      </button>
      <button class="clases-chip" id="chip-materia">
        <sl-icon name="journal-bookmark"></sl-icon>
        Materia: <b>${materiaSel ? escapeHtml(materiaDe(materiaSel).nombre) : "elegir"}</b>
        <sl-icon name="chevron-down"></sl-icon>
      </button>` : `
      <button class="clases-chip" id="chip-materia">
        <sl-icon name="journal-bookmark"></sl-icon>
        Materia: <b>${materiaSel ? escapeHtml(materiaDe(materiaSel).nombre) : "elegir"}</b>
        <sl-icon name="chevron-down"></sl-icon>
      </button>`;

  const crearDocente = esDocente ? `
      <button class="clases-btn-crear" id="btn-crear">
        <sl-icon name="plus-lg"></sl-icon> ${escapeHtml(info.crear)}
      </button>` : "";

  contenedorActual.innerHTML = `
    <div class="clases-vista">
      <div class="clases-barra">
        <button class="clases-btn-volver" id="btn-volver">
          <sl-icon name="arrow-left"></sl-icon> Inicio
        </button>
        ${chips}
      </div>

      <div class="clases-buscador-fila">
        <sl-input class="clases-buscador" id="buscador" clearable
                  placeholder="${esDocente
                    ? "Buscar por día, unidad, lección o título..."
                    : "Buscar " + escapeHtml(info.etiqueta) + "..."}">
          <sl-icon name="search" slot="prefix"></sl-icon>
        </sl-input>
        ${crearDocente}
      </div>

      <div id="zona-listado"></div>
    </div>`;

  // Volver al inicio (restaura el título de la userbar y apaga el vigía)
  contenedorActual.querySelector("#btn-volver").addEventListener("click", () => {
    quitarVigia();
    piezaAbierta = null;
    renderUserbar(perfilActual);
    renderInicio(perfilActual, contenedorActual);
  });

  if (esDocente) {
    contenedorActual.querySelector("#chip-grado").addEventListener("click", abrirModalGrado);
    contenedorActual.querySelector("#btn-crear").addEventListener("click", abrirModalCrear);
  }
  contenedorActual.querySelector("#chip-materia").addEventListener("click", abrirModalMateria);

  // Buscador en tiempo real (solo re-pinta el listado: no pierde el foco)
  const buscador = contenedorActual.querySelector("#buscador");
  buscador.value = textoBusqueda;
  buscador.addEventListener("sl-input", () => {
    textoBusqueda = buscador.value || "";
    pintarListado();
  });

  pintarListado();
}

/** Carga el listado según el rol y la selección actual. */
function cargarListado() {
  if (esDocente) {
    if (gradoSel != null && materiaSel) cargarDocente();
    else pintarListado();
  } else {
    // Estudiante: solo se carga cuando ya eligió materia
    if (materiaSel) cargarEstudiante();
    else pintarListado();
  }
}

function cardHtml(c) {
  const color = colorDeMateria(c.materiaId);
  const oculta = esDocente && c.visible === false;
  const info = tipoDe(c.tipo || tipoActual);
  const sub = (c.unidad != null && c.unidad !== "") || (c.leccion != null && c.leccion !== "")
    ? `Unidad ${escapeHtml(String(c.unidad ?? "—"))} · Lección ${escapeHtml(String(c.leccion ?? "—"))}`
    : "Material de apoyo";

  return `
    <article class="clase-card${oculta ? " esta-oculta" : ""}" data-id="${escapeHtml(c.id)}"
             style="--acento:${color};--acento-fondo:${rgba(color, 0.12)}">
      <div class="clase-cab">
        ${c.dia != null && c.dia !== "" ? `<span class="clase-dia">Día ${escapeHtml(String(c.dia))}</span>` : ""}
        ${oculta ? `<span class="clase-oculta"><sl-icon name="eye-slash"></sl-icon> Invisible</span>` : ""}
      </div>
      <h3>${escapeHtml(c.clase || c.id)}</h3>
      <p>${sub}</p>
      ${esDocente ? `
      <div class="clase-acciones">
        <button class="clase-accion" data-acc="editar" title="Editar el título" aria-label="Editar el título">
          <sl-icon name="pencil"></sl-icon>
        </button>
        <button class="clase-accion${oculta ? "" : " activa"}" data-acc="ojo" title="${oculta ? "Hacerla visible para los estudiantes" : "Hacerla invisible: no existirá para los estudiantes"}" aria-label="Cambiar visibilidad">
          <sl-icon name="${oculta ? "eye-slash" : "eye"}"></sl-icon>
        </button>
        ${c.tipo !== "recurso" ? `
        <button class="clase-accion" data-acc="resultados" title="Resultados del estudiante por actividad y nota final" aria-label="Ver resultados">
          <sl-icon name="clipboard-data"></sl-icon>
        </button>` : ""}
        <button class="clase-accion eliminar" data-acc="eliminar" title="Eliminar ${escapeHtml(info.etiqueta)}" aria-label="Eliminar ${escapeHtml(info.etiqueta)}">
          <sl-icon name="trash3"></sl-icon>
        </button>
      </div>` : ""}
    </article>`;
}

function pintarListado() {
  const zona = contenedorActual.querySelector("#zona-listado");
  if (!zona) return;
  const info = tipoDe(tipoActual);

  // Docente: sin grado o materia elegidos todavía
  if (esDocente && (gradoSel == null || !materiaSel)) {
    const faltaGrado = gradoSel == null;
    zona.innerHTML = `
      <div class="clases-vacio">
        <sl-icon name="mortarboard"></sl-icon>
        <h3>${faltaGrado ? "Elige un grado" : "Elige una materia"}</h3>
        <p>Selecciona ${faltaGrado ? "el grado" : "la materia"} para ver sus ${escapeHtml(info.plural.toLowerCase())}.</p>
        <button class="clases-btn-crear" id="btn-elegir">
          Elegir ${faltaGrado ? "grado" : "materia"}
        </button>
      </div>`;
    zona.querySelector("#btn-elegir").addEventListener("click", faltaGrado ? abrirModalGrado : abrirModalMateria);
    return;
  }

  // Estudiante sin grado en el perfil
  if (!esDocente && !(perfilActual.grados || []).length) {
    zona.innerHTML = `
      <div class="clases-vacio">
        <sl-icon name="mortarboard"></sl-icon>
        <h3>Sin grado asignado</h3>
        <p>Tu perfil no tiene grado asignado. Pide a tu institución que te lo configure.</p>
      </div>`;
    return;
  }

  // Estudiante sin materia elegida todavía
  if (!esDocente && !materiaSel) {
    zona.innerHTML = `
      <div class="clases-vacio">
        <sl-icon name="journal-bookmark"></sl-icon>
        <h3>Elige una materia</h3>
        <p>Selecciona la materia para ver sus ${escapeHtml(info.plural.toLowerCase())}.</p>
        <button class="clases-btn-crear" id="btn-elegir-materia">Elegir materia</button>
      </div>`;
    zona.querySelector("#btn-elegir-materia").addEventListener("click", abrirModalMateria);
    return;
  }

  if (cargando && piezasCache.length === 0) {
    zona.innerHTML = `<p class="clases-cargando">Cargando ${escapeHtml(info.plural.toLowerCase())}…</p>`;
    return;
  }

  const texto = normalizar(textoBusqueda);
  const visibles = piezasCache.filter((c) => {
    // Estudiante: SOLO su materia, SOLO este tipo y SOLO las VISIBLES
    // (una pieza invisible no existe para el estudiante)
    if (!esDocente) {
      if (c.materiaId !== materiaSel) return false;
      if (c.visible === false) return false;
    }
    if (!texto) return true;
    const campo = normalizar([c.dia, c.unidad, c.leccion, c.clase, c.id].join(" "));
    return campo.includes(texto);
  });

  if (visibles.length === 0) {
    zona.innerHTML = texto
      ? `<div class="clases-vacio">
           <h3>Sin resultados</h3>
           <p>Ninguna ${escapeHtml(info.etiqueta)} coincide con «${escapeHtml(textoBusqueda)}».</p>
         </div>`
      : `<div class="clases-vacio">
           <sl-icon name="${info.icono}"></sl-icon>
           <h3>No hay ${escapeHtml(info.plural.toLowerCase())} todavía</h3>
           <p>${esDocente
             ? "Usa el botón «" + escapeHtml(info.crear) + "» para añadir la primera."
             : "Cuando tu docente cree " + escapeHtml(info.plural.toLowerCase()) + " de esta materia, aparecerán aquí."}</p>
         </div>`;
    return;
  }

  // SEPARADO POR UNIDAD: grupos con su encabezado + tarjetas
  const grupos = gruposPorUnidad(visibles);
  zona.innerHTML = grupos.map((g) => `
    <div class="pz-unidad">
      <h3>${escapeHtml(g.etiqueta)}</h3>
      <span>${g.piezas.length} ${escapeHtml(g.piezas.length === 1 ? info.etiqueta : info.plural.toLowerCase())}</span>
    </div>
    <div class="clases-listado">${g.piezas.map(cardHtml).join("")}</div>`).join("");

  // Clic en cada tarjeta → abrir su contenido
  zona.querySelectorAll(".clase-card").forEach((card) => {
    const hallar = () => visibles.find((c) => c.id === card.dataset.id);
    card.addEventListener("click", (e) => {
      const clase = hallar();
      if (!clase) return;
      const acc = e.target.closest?.("[data-acc]");
      if (acc) {
        e.stopPropagation();
        if (acc.dataset.acc === "ojo") alternarVisible(clase);
        else if (acc.dataset.acc === "editar") abrirEditarTitulo(clase);
        else if (acc.dataset.acc === "resultados") abrirResultados(clase);
        else if (acc.dataset.acc === "eliminar") abrirConfirmarEliminar(clase);
        return;
      }
      abrirPieza(clase);
    });
  });
}

/* ---------------- Datos (Firestore + localStorage) ---------------- */

// El docente SOLO ve las piezas de ESTE tipo (las otras van en su página)
function deTipo(lista) {
  return lista.filter((c) => (c.tipo || "clase") === tipoActual);
}

async function cargarDocente() {
  cargando = true;
  // 1) Caché local: pintado instantáneo
  let cache = [];
  try {
    cache = JSON.parse(localStorage.getItem(claveCacheDocente(gradoSel, materiaSel, tipoActual)) || "[]");
  } catch (e) { cache = []; }
  if (Array.isArray(cache) && cache.length) {
    piezasCache = deTipo(cache).map((c) => ({
      grado: gradoSel, materiaId: materiaSel, materia: materiaDe(materiaSel).nombre, ...c,
    }));
  }
  pintarListado();

  // 2) Frescura: Firestore
  try {
    const lista = await db.clases.listar(gradoSel, materiaSel);
    piezasCache = deTipo(lista)
      .map((c) => ({
        grado: gradoSel,
        materiaId: materiaSel,
        materia: materiaDe(materiaSel).nombre,
        ...c,
      }))
      .sort(compararPiezas);
    try {
      localStorage.setItem(claveCacheDocente(gradoSel, materiaSel, tipoActual), JSON.stringify(piezasCache));
    } catch (e) { /* ignorar */ }
  } catch (e) {
    if (!piezasCache.length) {
      piezasCache = [];
      notify("No se pudieron cargar las piezas: " + (e?.code || "error"), "danger");
    } else {
      notify("Mostrando copia guardada (sin conexión con Firestore).", "warning");
    }
  } finally {
    cargando = false;
    pintarListado();
  }
}

async function cargarEstudiante() {
  const grado = (perfilActual.grados || [])[0];
  if (grado == null) {
    pintarListado();
    return;
  }

  // 1) Caché local: pintado instantáneo del listado
  let cache = [];
  try {
    cache = JSON.parse(localStorage.getItem(claveCacheEstudiante(grado)) || "[]");
  } catch (e) { cache = []; }
  piezasCache = Array.isArray(cache) ? deTipo(cache) : [];
  pintarListado();

  // 2) Frescura: Firestore (todas las materias del grado, en paralelo)
  cargando = true;
  if (piezasCache.length === 0) pintarListado();
  try {
    const grupos = await Promise.all(
      MATERIAS.map(async (m) => {
        const lista = await db.clases.listar(grado, m.id);
        return lista.map((c) => ({ grado, materiaId: m.id, materia: m.nombre, ...c }));
      })
    );
    piezasCache = grupos.flat().sort(compararPiezas);
    try {
      localStorage.setItem(claveCacheEstudiante(grado), JSON.stringify(piezasCache));
    } catch (e) { /* ignorar */ }
  } catch (e) {
    if (piezasCache.length === 0) {
      notify("No se pudieron cargar las piezas: " + (e?.code || "error"), "danger");
    } else {
      notify("Mostrando copia guardada (sin conexión con Firestore).", "warning");
    }
  } finally {
    cargando = false;
    pintarListado();
  }
}

/* ---------------- Visible ⇄ invisible (boolean en Firebase) ---------------- */

async function alternarVisible(c) {
  const nuevo = c.visible === false;
  try {
    await db.clases.actualizar(c.grado, c.materiaId, c.id, { visible: nuevo });
    c.visible = nuevo;
    try {
      localStorage.setItem(
        claveCacheDocente(c.grado, c.materiaId, tipoActual),
        JSON.stringify(piezasCache)
      );
    } catch (e) { /* ignorar */ }
    pintarListado();
    notify(
      nuevo
        ? "«" + (c.clase || c.id) + "» es VISIBLE: los estudiantes ya la ven."
        : "«" + (c.clase || c.id) + "» quedó INVISIBLE: para los estudiantes no existe.",
      "success"
    );
  } catch (e) {
    notify("No se pudo cambiar la visibilidad: " + (e?.code || e?.message || "error"), "danger");
  }
}

/* ---------------- ELIMINAR pieza (docente, con confirmación) ----------------
   La papelera de la tarjeta. Borra el doc en Firestore; si un
   estudiante está DENTRO, el vigía lo regresa al inicio (y si era
   clase, su nota se consolida). */

function abrirConfirmarEliminar(c) {
  const info = tipoDe(c.tipo || tipoActual);
  const d = crearDialogo("", "Eliminar " + info.etiqueta, `
    <p class="clases-crear-info">
      ¿Eliminar <strong>${escapeHtml(c.clase || c.id)}</strong> de
      <strong>${escapeHtml(nombreGrado(c.grado))}</strong> ·
      <strong>${escapeHtml(c.materia || materiaDe(c.materiaId).nombre)}</strong>?
      Los estudiantes que estén dentro volverán al inicio automáticamente.
      Esta acción no se puede deshacer.
    </p>
    <sl-button slot="footer" id="el-no">Cancelar</sl-button>
    <sl-button slot="footer" variant="danger" pill id="el-si">Eliminar</sl-button>`);

  d.querySelector("#el-no").addEventListener("click", () => d.hide());
  d.querySelector("#el-si").addEventListener("click", async () => {
    const si = d.querySelector("#el-si");
    si.loading = true;
    try {
      await db.clases.eliminar(c.grado, c.materiaId, c.id);
      piezasCache = piezasCache.filter(
        (x) => !(x.id === c.id && x.materiaId === c.materiaId && x.grado === c.grado)
      );
      try {
        localStorage.setItem(
          claveCacheDocente(c.grado, c.materiaId, tipoActual),
          JSON.stringify(piezasCache)
        );
      } catch (e) { /* ignorar */ }
      d.hide();
      pintarListado();
      notify(
        info.etiqueta.charAt(0).toUpperCase() + info.etiqueta.slice(1) +
        " «" + (c.clase || c.id) + "» eliminada.",
        "success"
      );
    } catch (e) {
      notify("No se pudo eliminar: " + (e?.code || e?.message || "error"), "danger");
    } finally {
      si.loading = false;
    }
  });
}

/* ---------------- VIGÍA (estudiante): cierre/eliminación en vivo ----------------
   Mientras el estudiante está en esta vista — o DENTRO de una pieza —
   escucha sus materias con db.clases.vigilar. Si la pieza abierta se
   elimina o pasa a invisible:
     · vuelve solo a inicio.js (renderUserbar + renderInicio),
     · si era CLASE, la nota se consolida: Sheets (columna D·U·L +
       Σ/Media) y Firebase (users/{uid}/notas/{materiaId}.diaN).
   «Dentro» = la raíz de la pieza sigue conectada al DOM: al pulsar
   «Volver» la raíz se desconecta y el vigía deja de actuar. */

function iniciarVigia() {
  quitarVigia();
  if (esDocente) return;
  const grado = (perfilActual.grados || [])[0];
  if (grado == null) return;
  const quites = MATERIAS.map((m) =>
    db.clases.vigilar(grado, m.id, (id, motivo) => piezaCerradaRemota(m.id, id, motivo))
  );
  vigia = {
    quitar: () => quites.forEach((q) => { try { q(); } catch (e) { /* nada */ } }),
  };
}

function quitarVigia() {
  try { vigia?.quitar(); } catch (e) { /* nada */ }
  vigia = null;
}

function piezaCerradaRemota(materiaId, id, motivo) {
  const p = piezaAbierta;
  // ¿Sigue DENTRO? (la raíz de la pieza sigue conectada al DOM)
  if (!p || !p.raiz || !p.raiz.isConnected) return;
  if (p.clase.materiaId !== materiaId || p.clase.id !== id) return;
  cerrarPorDocente(p.clase, motivo);
}

async function cerrarPorDocente(clase, motivo) {
  piezaAbierta = null;
  const titulo = String(clase.clase || clase.id || "");
  // Nota del día a Sheets y Firebase (solo clases): mejor esfuerzo
  if ((clase.tipo || "clase") === "clase") {
    try { await db.notas.consolidarCierre(perfilActual, clase); } catch (e) { /* nada */ }
  }
  quitarVigia();
  renderUserbar(perfilActual);
  renderInicio(perfilActual, contenedorActual);
  notify(
    motivo === "eliminada"
      ? "«" + titulo + "» fue eliminada por tu docente. Volviste al inicio."
      : "«" + titulo + "» fue cerrada por tu docente. Tu nota quedó guardada.",
    "warning",
    6500
  );
}

/* ---------------- EDITAR TÍTULO (docente) ----------------
   Clases, tareas y exámenes: solo se les edita el TÍTULO (día,
   unidad y lección se quedan como están; el contenido .js no se
   toca). El título vive en el campo "clase" del doc de Firestore. */

function abrirEditarTitulo(c) {
  const info = tipoDe(tipoActual);
  const d = crearDialogo("", "Editar título", `
    <p class="clases-crear-info">
      ${escapeHtml(info.etiqueta.charAt(0).toUpperCase() + info.etiqueta.slice(1))}:
      <strong>${escapeHtml(c.clase || c.id)}</strong> ·
      Grado: <strong>${escapeHtml(nombreGrado(c.grado))}</strong> ·
      Materia: <strong>${escapeHtml(c.materia || materiaDe(c.materiaId).nombre)}</strong>
    </p>
    <div class="clases-form">
      <sl-input id="e-titulo" label="Nuevo título" value="${escapeHtml(c.clase || "")}"
                placeholder="Ej. Sumas con llevando" clearable></sl-input>
    </div>
    <sl-button slot="footer" variant="primary" pill id="e-guardar">Guardar cambios</sl-button>`);

  const guardarCambios = async () => {
    const guardar = d.querySelector("#e-guardar");
    const titulo = String(d.querySelector("#e-titulo").value || "").trim();
    if (!titulo) {
      notify("Escribe el nuevo título.", "warning");
      return;
    }
    if (titulo === String(c.clase || "")) {
      d.hide(); // no cambió nada: cerrar sin tocar Firebase
      return;
    }
    guardar.loading = true;
    try {
      await db.clases.actualizar(c.grado, c.materiaId, c.id, { clase: titulo });
      c.clase = titulo; // fila enriquecida del listado actual
      const cruda = piezasCache.find(
        (x) => x.grado === c.grado && x.materiaId === c.materiaId && x.id === c.id
      );
      if (cruda) cruda.clase = titulo; // también en la caché cruda
      try {
        localStorage.setItem(
          claveCacheDocente(c.grado, c.materiaId, tipoActual),
          JSON.stringify(piezasCache)
        );
      } catch (e) { /* ignorar */ }
      d.hide();
      pintarListado();
      notify("Título actualizado a «" + titulo + "».", "success");
    } catch (e) {
      notify("No se pudo actualizar el título: " + (e?.code || e?.message || "error"), "danger");
    } finally {
      guardar.loading = false;
    }
  };

  d.querySelector("#e-guardar").addEventListener("click", guardarCambios);
  d.querySelector("#e-titulo").addEventListener("keydown", (e) => {
    if (e.key === "Enter") guardarCambios();
  });
}

/* ---------------- Abrir contenido de una pieza ---------------- */

async function abrirPieza(clase) {
  // El contenido vive en public/clases/{grado}/{materia}/{id}.js y usa
  // rutas "../../../js/…" (3 carpetas más adentro, con components,
  // componentes y utils). Desde js/components/, "../../" es public/.
  const ruta = `../../clases/${clase.grado}/${clase.materiaId}/${clase.id}.js`;
  try {
    const mod = await import(ruta);
    if (typeof mod.render === "function") {
      mod.render(perfilActual, contenedorActual, clase);
      // Recuerda la pieza abierta y su raíz en el DOM: mientras esa raíz
      // siga conectada, el estudiante sigue DENTRO (si la pieza se
      // elimina u oculta en vivo, el vigía lo regresa al inicio).
      piezaAbierta = { clase, raiz: contenedorActual.firstElementChild || null };
    } else {
      notify("El contenido de esta " + tipoDe(tipoActual).etiqueta + " todavía no está disponible.");
    }
  } catch (e) {
    console.info("[clases] contenido esperado en: public" + ruta.replace("../../", "/"));
    notify("El contenido de esta " + tipoDe(tipoActual).etiqueta + " todavía no está disponible.");
  }
}

/* ---------------- Modales ---------------- */

function crearDialogo(claseCss, label, html) {
  const d = document.createElement("sl-dialog");
  d.className = claseCss || "clases-dialogo";
  d.setAttribute("label", label);
  d.innerHTML = html;
  document.body.append(d);
  // Esperar SIEMPRE después del append (autoloader perezoso de Shoelace)
  customElements.whenDefined("sl-dialog").then(() => d.show());
  d.addEventListener("sl-after-hide", () => d.remove());
  return d;
}

function abrirModalGrado() {
  const d = crearDialogo("", "Elige el grado", `
    <div class="clases-opciones">
      ${GRADOS.map((g) => `
        <button class="clases-opcion ${g.id === gradoSel ? "activa" : ""}" data-grado="${g.id}">
          ${escapeHtml(g.nombre)}
        </button>`).join("")}
    </div>`);

  d.querySelector(".clases-opciones").addEventListener("click", (e) => {
    const btn = e.target.closest(".clases-opcion");
    if (!btn) return;
    const cambio = gradoSel !== Number(btn.dataset.grado);
    gradoSel = Number(btn.dataset.grado);
    guardarSel();
    d.hide();
    if (cambio) {
      renderInterno();
      cargarListado();
    }
  });
}

function abrirModalMateria() {
  const d = crearDialogo("", "Elige la materia", `
    <div class="clases-opciones">
      ${MATERIAS.map((m) => `
        <button class="clases-opcion ${m.id === materiaSel ? "activa" : ""}" data-materia="${m.id}">
          ${escapeHtml(m.nombre)}
        </button>`).join("")}
    </div>`);

  d.querySelector(".clases-opciones").addEventListener("click", (e) => {
    const btn = e.target.closest(".clases-opcion");
    if (!btn) return;
    const cambio = materiaSel !== btn.dataset.materia;
    materiaSel = btn.dataset.materia;
    guardarSel();
    d.hide();
    if (cambio) {
      renderInterno();
      cargarListado();
    }
  });
}

function abrirModalCrear() {
  const info = tipoDe(tipoActual);
  if (gradoSel == null || !materiaSel) {
    notify("Elige primero grado y materia.", "warning");
    return;
  }

  // Para CLASE día/unidad/lección son obligatorios (van a la hoja
  // D{día}·U{unidad}·L{lección}); para examen/tarea/recurso quedan
  // opcionales (agrupan y ordenan).
  const esClase = tipoActual === "clase";
  // ⚠ El «(opcional)» va como TEXTO PLANO dentro del atributo label:
  // meter HTML en un atributo rompe el texto (se veía «<span style=»).
  const op = esClase ? "" : " (opcional)";

  const d = crearDialogo("", info.crear, `
    <p class="clases-crear-info">
      Grado: <strong>${escapeHtml(nombreGrado(gradoSel))}</strong> ·
      Materia: <strong>${escapeHtml(materiaDe(materiaSel).nombre)}</strong>
    </p>
    <div class="clases-form">
      <sl-input id="c-dia" type="number" min="1" label="Día${op}" placeholder="Ej. 1"
                help-text="${esClase ? "Número de día de la clase (1, 2, 3...)" : "Número de día (opcional)"}"></sl-input>
      <sl-input id="c-unidad" label="Unidad${op}" placeholder="Ej. 1"></sl-input>
      <sl-input id="c-leccion" label="Lección${op}" placeholder="Ej. 1"></sl-input>
      <sl-input id="c-clase" label="${escapeHtml(info.etiqueta.charAt(0).toUpperCase() + info.etiqueta.slice(1))} (título)" placeholder="Ej. Sumas con llevando"></sl-input>
    </div>
    <sl-button slot="footer" variant="primary" pill id="c-guardar">${escapeHtml(info.crear)}</sl-button>`);

  d.querySelector("#c-guardar").addEventListener("click", async () => {
    const guardar = d.querySelector("#c-guardar");
    const diaRaw = String(d.querySelector("#c-dia").value || "").trim();
    const dia = diaRaw === "" ? null : Number(diaRaw);
    const unidad = String(d.querySelector("#c-unidad").value || "").trim();
    const leccion = String(d.querySelector("#c-leccion").value || "").trim();
    const titulo = String(d.querySelector("#c-clase").value || "").trim();

    if (dia !== null && (!Number.isInteger(dia) || dia < 1)) {
      notify("El día debe ser un número entero mayor a 0.", "warning");
      return;
    }
    if (esClase && (dia === null || !unidad || !leccion || !titulo)) {
      notify("Completa día, unidad, lección y título de la clase.", "warning");
      return;
    }
    if (!titulo) {
      notify("Escribe el título de la " + info.etiqueta + ".", "warning");
      return;
    }

    guardar.loading = true;
    try {
      // id tipo-clase:  d1-u1-l1-sumas  ·  examen: examen-d2-u3-l1-… (o sin D·U·L)
      const partes = [];
      if (dia != null) partes.push("d" + dia);
      if (unidad) partes.push("u" + slug(unidad));
      if (leccion) partes.push("l" + slug(leccion));
      const idBase = (esClase ? "" : tipoActual + "-") + partes.join("-") + "-" + slug(titulo);
      const id = idBase.replace(/^-+/, "");
      if (await db.clases.existe(gradoSel, materiaSel, id)) {
        notify("Ya existe una " + info.etiqueta + " con esos datos en esta materia.", "danger");
        return;
      }
      await db.clases.crear(gradoSel, materiaSel, id, {
        tipo: tipoActual,
        visible: true,          // el docente la puede apagar con el ojo
        dia: dia != null ? dia : "",
        unidad,
        leccion,
        clase: titulo,
        creadoPor: perfilActual?.uid || "",
      }); // db.js añade creadoEn
      notify(
        info.etiqueta.charAt(0).toUpperCase() + info.etiqueta.slice(1) +
        " creada. Contenido (.js) en: clases/" + gradoSel + "/" + materiaSel + "/" + id + ".js",
        "success", 6500
      );
      d.hide();
      cargarDocente();
    } catch (e) {
      notify("No se pudo crear: " + (e?.code || e?.message || "error"), "danger");
    } finally {
      guardar.loading = false;
    }
  });
}

/* ---------------- MODAL DE RESULTADOS (docente) ----------------
   Por pieza: cada estudiante del grado con su nota POR ACTIVIDAD
   (una columna por pregunta respondida) y la NOTA FINAL. Viene de
   notas/{uid}/clases/{claseId} en Firestore (la misma nota que
   bloquea las actividades ya respondidas y que queda espejada en
   users/{uid}.notas.{claseId} como nota del día/clase). */

function estadoNota(nota) {
  if (!nota || nota.preguntas == null || !Object.keys(nota.preguntas).length) {
    return { txt: "Sin empezar", cls: "nada" };
  }
  if (nota.enviado) return { txt: "Enviado", cls: "enviado" };
  return { txt: "En curso", cls: "curso" };
}

function abrirResultados(clase) {
  if (gradoSel == null) {
    notify("Elige primero el grado.", "warning");
    return;
  }

  const d = crearDialogo(
    "pz-dialogo-resultados",
    "Resultados — " + (clase.clase || clase.id),
    `
    <p class="pz-res-info">
      <strong>${escapeHtml(clase.clase || clase.id)}</strong> ·
      ${escapeHtml(nombreGrado(clase.grado))} · ${escapeHtml(clase.materia || materiaDe(clase.materiaId).nombre)}
      <br/>Nota por actividad y nota final (retroalimentación). El total también vive
      espejado en el perfil de cada estudiante (nota del día) y en Google Sheets.
    </p>
    <div class="pz-res-cargando" id="pr-cargando">
      <sl-spinner></sl-spinner> Cargando estudiantes y notas…
    </div>
    <div class="pz-res-tabla" id="pr-tabla" hidden></div>`
  );

  // La carga va en una función aparte: el botón «Reintentar» del error
  // vuelve a llamarla sin cerrar el modal.
  const cargar = async () => {
    const cargandoEl = d.querySelector("#pr-cargando");
    const zonaTabla = d.querySelector("#pr-tabla");
    cargandoEl.hidden = false;
    zonaTabla.hidden = true;
    try {
      // 1) Estudiantes del grado (users/{uid} con ese grado)
      const estudiantes = (await db.usuarios.porGrado(gradoSel))
        .filter((x) => x.rol !== "docente")
        .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));

      // 2) Nota de CADA estudiante en ESTA pieza (mejor esfuerzo)
      const filas = await db.notas.deEstudiantes(estudiantes, clase.id);

      // 3) Columnas = actividades (qid) en el orden en que aparecieron
      const qids = [];
      filas.forEach((f) => {
        const ps = f.nota && f.nota.preguntas ? f.nota.preguntas : {};
        Object.keys(ps).forEach((q) => { if (!qids.includes(q)) qids.push(q); });
      });

      const tabla = d.querySelector("#pr-tabla");
      d.querySelector("#pr-cargando").hidden = true;

      if (!filas.length) {
        tabla.hidden = false;
        tabla.innerHTML = `<div class="pz-res-vacio">No hay estudiantes registrados en ${escapeHtml(nombreGrado(gradoSel))}.</div>`;
        return;
      }

      tabla.hidden = false;
      tabla.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              ${qids.map((q, i) => `
                <th title="${escapeHtml(q)}">A${i + 1}<small>${escapeHtml(q)}</small></th>`).join("")}
              <th title="Nota final (suma de las actividades)">Nota final</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${filas.map((f) => {
              const ps = f.nota && f.nota.preguntas ? f.nota.preguntas : {};
              const est = estadoNota(f.nota);
              return `
                <tr>
                  <td>${escapeHtml(f.nombre || "(sin nombre)")}${f.nie !== "" ? ` <small style="color:#9ca3af">· ${escapeHtml(String(f.nie))}</small>` : ""}</td>
                  ${qids.map((q) => `<td class="num">${ps[q] != null ? escapeHtml(String(ps[q])) : "—"}</td>`).join("")}
                  <td class="pz-res-total">${f.nota && f.nota.preguntas ? escapeHtml(String(f.nota.puntos ?? 0)) : "—"}</td>
                  <td><span class="pz-res-estado ${est.cls}">${est.txt}</span></td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>`;
    } catch (e) {
      d.querySelector("#pr-cargando").hidden = true;
      const tabla = d.querySelector("#pr-tabla");
      tabla.hidden = false;
      tabla.innerHTML = `
        <div class="pz-res-vacio">
          No se pudieron leer los resultados (${escapeHtml(String(e?.code || e?.message || "error"))}).<br/>
          Revisa las reglas de Firestore: el docente necesita leer
          <b>users</b> y <b>notas/{uid}/clases</b> de su grado.
          <br/><button class="clases-btn-crear" id="pr-reintentar" style="margin-top:.7rem">Reintentar</button>
        </div>`;
      tabla.querySelector("#pr-reintentar").addEventListener("click", cargar);
    }
  };

  cargar();
}