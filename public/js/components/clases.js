// ============================================================
// clases.js — Página "Clases" (js/components/clases.js)
//
// Se abre desde la tarjeta "Clases" del inicio (import dinámico).
//
// Estructura de datos en Firestore:
//   clases/{grado}/{materiaId}/{idClase}
//     { dia, unidad, leccion, clase, creadoEn, creadoPor }
//
// Contenido de cada clase (se creará después):
//   public/clases/{grado}/{materiaId}/{idClase}.js
//   → exporta render(perfil, contenedor, clase). Si el archivo no
//     existe, al hacer clic en la tarjeta solo avisa "no disponible".
//
// DOCENTE: chips de grado y materia (se eligen en modal), buscador
// en tiempo real y botón "Crear clase" (día, unidad, lección, clase).
// ESTUDIANTE: elige SU materia en un modal (chip) y solo ve las clases
// de ESA materia; buscador + caché localStorage de todo su grado para
// pintar el listado al instante. Las tarjetas NO muestran la materia
// (ya está elegida arriba).
//
// Convención: CSS implícito · 100% responsivo · bajo la userbar.
// ============================================================

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

/* ---------------- Estado del módulo ---------------- */

let perfilActual = null;
let contenedorActual = null;
let esDocente = false;
let gradoSel = null;      // docente: id numérico del grado
let materiaSel = null;    // docente: id de MATERIAS
let clasesCache = [];     // listado en memoria (ya ordenado)
let textoBusqueda = "";
let cargando = false;
let estilosListos = false;

const CLAVE_SEL_DOCENTE = "mco_clases_docente";       // última selección del docente
const CLAVE_SEL_ESTUDIANTE = "mco_clases_estudiante"; // última materia del estudiante
const claveCacheEstudiante = (grado) => `mco_clases_g${grado}`;

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
  return normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "clase";
}

function nombreGrado(id) {
  const g = GRADOS.find((x) => x.id === id);
  return g ? g.nombre : `Grado ${id}`;
}

function materiaDe(id) {
  return MATERIAS.find((m) => m.id === id) || { id, nombre: id };
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

// Orden: día → unidad → lección → título (siempre se ve UNA sola materia)
function compararClases(a, b) {
  const d = (Number(a.dia) || 0) - (Number(b.dia) || 0);
  if (d !== 0) return d;
  const u = (Number(a.unidad) || 0) - (Number(b.unidad) || 0);
  if (u !== 0) return u;
  const l = (Number(a.leccion) || 0) - (Number(b.leccion) || 0);
  return l !== 0 ? l : String(a.clase).localeCompare(String(b.clase), "es");
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

    /* Modales de selección y creación */
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
 * Página "Clases" (la llama inicio.js al hacer clic en la tarjeta).
 * @param {object} perfil           perfil del usuario (users/{uid})
 * @param {HTMLElement} contenedor  dónde dibujar (main#app)
 */
export function render(perfil, contenedor) {
  if (!perfil || !contenedor) return;
  perfilActual = perfil;
  contenedorActual = contenedor;
  esDocente = perfil.rol === "docente";
  clasesCache = [];
  textoBusqueda = "";
  inyectarEstilos();

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

  renderUserbar(perfil, "Clases");
  renderInterno();
  cargarListado();
}
export { render as renderClases };

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
        <sl-icon name="plus-lg"></sl-icon> Crear clase
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
                    : "Buscar clase..."}">
          <sl-icon name="search" slot="prefix"></sl-icon>
        </sl-input>
        ${crearDocente}
      </div>

      <div id="zona-listado"></div>
    </div>`;

  // Volver al inicio (restaura el título de la userbar)
  contenedorActual.querySelector("#btn-volver").addEventListener("click", () => {
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
    if (gradoSel != null && materiaSel) cargarClasesDocente();
    else pintarListado();
  } else {
    // Estudiante: solo se carga cuando ya eligió materia
    if (materiaSel) cargarClasesEstudiante();
    else pintarListado();
  }
}

function cardHtml(c) {
  const color = colorDeMateria(c.materiaId);
  // Sin chip de materia: la vista ya filtra por UNA sola materia
  return `
    <article class="clase-card" data-id="${escapeHtml(c.id)}"
             style="--acento:${color};--acento-fondo:${rgba(color, 0.12)}">
      <div class="clase-cab">
        <span class="clase-dia">Día ${escapeHtml(String(c.dia))}</span>
      </div>
      <h3>${escapeHtml(c.clase)}</h3>
      <p>Unidad ${escapeHtml(String(c.unidad))} · Lección ${escapeHtml(String(c.leccion))}</p>
    </article>`;
}

function pintarListado() {
  const zona = contenedorActual.querySelector("#zona-listado");
  if (!zona) return;

  // Docente: sin grado o materia elegidos todavía
  if (esDocente && (gradoSel == null || !materiaSel)) {
    const faltaGrado = gradoSel == null;
    zona.innerHTML = `
      <div class="clases-vacio">
        <sl-icon name="mortarboard"></sl-icon>
        <h3>${faltaGrado ? "Elige un grado" : "Elige una materia"}</h3>
        <p>Selecciona ${faltaGrado ? "el grado" : "la materia"} para ver sus clases.</p>
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
        <p>Selecciona la materia para ver sus clases.</p>
        <button class="clases-btn-crear" id="btn-elegir-materia">Elegir materia</button>
      </div>`;
    zona.querySelector("#btn-elegir-materia").addEventListener("click", abrirModalMateria);
    return;
  }

  if (cargando && clasesCache.length === 0) {
    zona.innerHTML = `<p class="clases-cargando">Cargando clases…</p>`;
    return;
  }

  const texto = normalizar(textoBusqueda);
  const visibles = clasesCache.filter((c) => {
    // Estudiante: solo las clases de SU materia elegida
    if (!esDocente && c.materiaId !== materiaSel) return false;
    if (!texto) return true;
    const campo = normalizar([c.dia, c.unidad, c.leccion, c.clase].join(" "));
    return campo.includes(texto);
  });

  if (visibles.length === 0) {
    zona.innerHTML = texto
      ? `<div class="clases-vacio">
           <h3>Sin resultados</h3>
           <p>Ninguna clase coincide con «${escapeHtml(textoBusqueda)}».</p>
         </div>`
      : `<div class="clases-vacio">
           <sl-icon name="journals"></sl-icon>
           <h3>No hay clases todavía</h3>
           <p>${esDocente
             ? "Usa el botón «Crear clase» para añadir la primera."
             : "Cuando tu docente cree clases de esta materia, aparecerán aquí."}</p>
         </div>`;
    return;
  }

  zona.innerHTML = `<div class="clases-listado">${visibles.map(cardHtml).join("")}</div>`;

  // Clic en cada tarjeta → abrir su contenido
  zona.querySelectorAll(".clase-card").forEach((card) => {
    card.addEventListener("click", () => {
      const clase = visibles.find((c) => c.id === card.dataset.id);
      if (clase) abrirClase(clase);
    });
  });
}

/* ---------------- Datos (Firestore + localStorage) ---------------- */

async function cargarClasesDocente() {
  cargando = true;
  pintarListado();
  try {
    const lista = await db.clases.listar(gradoSel, materiaSel);
    clasesCache = lista
      .map((c) => ({
        grado: gradoSel,
        materiaId: materiaSel,
        materia: materiaDe(materiaSel).nombre,
        ...c,
      }))
      .sort(compararClases);
  } catch (e) {
    clasesCache = [];
    notify("No se pudieron cargar las clases: " + (e?.code || "error"), "danger");
  } finally {
    cargando = false;
    pintarListado();
  }
}

async function cargarClasesEstudiante() {
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
  clasesCache = Array.isArray(cache) ? cache : [];
  pintarListado();

  // 2) Frescura: Firestore (todas las materias del grado, en paralelo)
  cargando = true;
  if (clasesCache.length === 0) pintarListado();
  try {
    const grupos = await Promise.all(
      MATERIAS.map(async (m) => {
        const lista = await db.clases.listar(grado, m.id);
        return lista.map((c) => ({ grado, materiaId: m.id, materia: m.nombre, ...c }));
      })
    );
    clasesCache = grupos.flat().sort(compararClases);
    try {
      localStorage.setItem(claveCacheEstudiante(grado), JSON.stringify(clasesCache));
    } catch (e) { /* ignorar */ }
  } catch (e) {
    if (clasesCache.length === 0) {
      notify("No se pudieron cargar las clases: " + (e?.code || "error"), "danger");
    } else {
      notify("Mostrando copia guardada (sin conexión con Firestore).", "warning");
    }
  } finally {
    cargando = false;
    pintarListado();
  }
}

/* ---------------- Abrir contenido de una clase ---------------- */

async function abrirClase(clase) {
  const ruta = `../../clases/${clase.grado}/${clase.materiaId}/${clase.id}.js`;
  try {
    const mod = await import(ruta);
    if (typeof mod.render === "function") {
      mod.render(perfilActual, contenedorActual, clase);
    } else {
      notify("El contenido de esta clase todavía no está disponible.");
    }
  } catch (e) {
    console.info("[clases] contenido esperado en: public" + ruta.replace("../../", "/"));
    notify("El contenido de esta clase todavía no está disponible.");
  }
}

/* ---------------- Modales ---------------- */

function crearDialogo(label, html) {
  const d = document.createElement("sl-dialog");
  d.className = "clases-dialogo";
  d.setAttribute("label", label);
  d.innerHTML = html;
  document.body.append(d);
  // Esperar SIEMPRE después del append (autoloader perezoso de Shoelace)
  customElements.whenDefined("sl-dialog").then(() => d.show());
  d.addEventListener("sl-after-hide", () => d.remove());
  return d;
}

function abrirModalGrado() {
  const d = crearDialogo("Elige el grado", `
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
  const d = crearDialogo("Elige la materia", `
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
  if (gradoSel == null || !materiaSel) {
    notify("Elige primero grado y materia.", "warning");
    return;
  }

  const d = crearDialogo("Crear clase", `
    <p class="clases-crear-info">
      Grado: <strong>${escapeHtml(nombreGrado(gradoSel))}</strong> ·
      Materia: <strong>${escapeHtml(materiaDe(materiaSel).nombre)}</strong>
    </p>
    <div class="clases-form">
      <sl-input id="c-dia" type="number" min="1" label="Día" placeholder="Ej. 1"
                help-text="Número de día de la clase (1, 2, 3...)"></sl-input>
      <sl-input id="c-unidad" label="Unidad" placeholder="Ej. 1"></sl-input>
      <sl-input id="c-leccion" label="Lección" placeholder="Ej. 1"></sl-input>
      <sl-input id="c-clase" label="Clase (título)" placeholder="Ej. Sumas con llevando"></sl-input>
    </div>
    <sl-button slot="footer" variant="primary" pill id="c-guardar">Crear clase</sl-button>`);

  d.querySelector("#c-guardar").addEventListener("click", async () => {
    const guardar = d.querySelector("#c-guardar");
    const dia = Number(d.querySelector("#c-dia").value);
    const unidad = String(d.querySelector("#c-unidad").value || "").trim();
    const leccion = String(d.querySelector("#c-leccion").value || "").trim();
    const titulo = String(d.querySelector("#c-clase").value || "").trim();

    if (!Number.isInteger(dia) || dia < 1) {
      notify("El día debe ser un número entero mayor a 0.", "warning");
      return;
    }
    if (!unidad || !leccion || !titulo) {
      notify("Completa unidad, lección y título de la clase.", "warning");
      return;
    }

    guardar.loading = true;
    try {
      const id = `d${dia}-u${slug(unidad)}-l${slug(leccion)}-${slug(titulo)}`;
      if (await db.clases.existe(gradoSel, materiaSel, id)) {
        notify("Ya existe una clase con esos datos en esta materia.", "danger");
        return;
      }
      await db.clases.crear(gradoSel, materiaSel, id, {
        dia,
        unidad,
        leccion,
        clase: titulo,
        creadoPor: perfilActual?.uid || "",
      }); // db.js añade creadoEn
      notify(`Clase creada. Contenido en: clases/${gradoSel}/${materiaSel}/${id}.js`, "success", 6000);
      d.hide();
      cargarClasesDocente();
    } catch (e) {
      notify("No se pudo crear la clase: " + (e?.code || e?.message || "error"), "danger");
    } finally {
      guardar.loading = false;
    }
  });
}
