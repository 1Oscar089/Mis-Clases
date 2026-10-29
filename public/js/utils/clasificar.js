// ============================================================
// clasificar.js — CLASIFICAR: tabla de categorías con arrastre
// (js/utils/clasificar.js) · v1
//
// Actividad de CLASIFICACIÓN para el contenido de clases, tareas
// y exámenes: el docente da las CATEGORÍAS y, para cada una, las
// PALABRAS o IMÁGENES que van dentro; el bloque arma una TABLA
// (una columna con su casilla por categoría) y un BANCO con TODAS
// las tarjetas MEZCLADAS. El estudiante ARRASTRA cada tarjeta
// (ratón o dedo) hasta la casilla de su categoría — o la TOCA y
// luego TOCA la casilla — hasta clasificarlas todas.
//
// ─── PALABRAS E IMÁGENES (el js hace el trabajo) ───
//   Cada elemento es un TEXTO y el util decide solo si es tarjeta
//   de PALABRA o tarjeta de IMAGEN:
//     · "img:foto.png"          → recursos/img/foto.png
//     · "foto.png" (extensión)  → recursos/img/foto.png
//     · "https://…/foto.png"    → esa URL tal cual (también //, /, ./, ../)
//     · "data:image/…" y "blob:…" → tal cual
//     · "<svg …>…</svg>"        → código SVG en línea (se convierte a
//       imagen SEGURA dentro de <img>: nunca ejecuta scripts)
//     · cualquier otra cosa     → tarjeta de PALABRA
//   Los elementos se separan por COMA; el corte respeta el código
//   SVG (las comas dentro de <svg>…</svg> NO parten el elemento).
//   La misma palabra puede vivir en DOS categorías: serán dos
//   tarjetas distintas, cada una con SU casilla correcta.
//
// ─── PUNTAJE (se calcula por cantidad) ───
//   El PUNTAJE TOTAL del bloque (0 a 10) se reparte en partes
//   IGUALES entre TODAS las tarjetas (palabras o imágenes cuentan
//   igual): cada tarjeta bien clasificada gana su parte.
//     · clase  → 2 intentos: 1.er intento completo (correcta queda
//       FIJA en verde); el 2.º y último SOLO corrige las marcadas
//       en rojo y vale EXACTAMENTE LA MITAD; al final se bloquea,
//       se muestra la solución y la NOTA FINAL del bloque.
//     · tarea  → 2 envíos neutros; el 2.º es el que cuenta (a la
//       mitad, la misma regla de ordenar.js); nunca revela.
//     · examen → SIN botón propio: el examen califica con .enviar()
//       — UNA sola oportunidad a valor completo (guarda SIEMPRE,
//       0 incluido, con guardarPreguntaExamen) y el botón final del
//       examen califica lo no enviado con el REGISTRO GLOBAL
//       (window.__mcoEnvioExamen). Si ya fue enviado, aparece
//       BLOQUEADO.
//     · docente → intentos libres, puntaje local arriba
//       (registrarPuntoDocente) y CERO guardado; las malas vuelven
//       al banco para volver a clasificar.
//
// Puntaje y nota van por las funciones compartidas de
// opcionMultiple.js (obtenerNota, sumarPuntos, guardarPreguntaExamen,
// finalizarExamen), que usan db.js: esta utilidad NUNCA toca
// Firestore o Sheets directo. Re-exporta obtenerNota/sumarPuntos/
// finalizarExamen para el archivo de contenido (misma API que
// opcionMultiple.js).
//
// ANTI-COPIA: el desorden del banco se sortea con azar PERSISTENTE
// por navegador (js/utils/aleatorio.js): igual al recargar sin
// responder, distinto cuando ya respondió. El docente ve un orden
// nuevo en cada montaje.
//
// COLOR (REGLA DEL PROYECTO, aclarada): el COLOR DE LA SECCIÓN
// llega en config.colorSeccion (HEX o rgb()); si falta o es
// inválido se usa el PREDEFINIDO de esta utilidad — FIJO (#4f46e5
// índigo, adaptado y legible); NO cambia en cada montaje. En
// «Crear» se elige con el SELECTOR RGB (input de color) sin
// escribir nada a mano; botón «Defecto» para volver.
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/8/ciencia/mi-clase.js):
//
//   import { clasificar } from "../../../js/utils/clasificar.js";
//
//   clasificar({
//     contenedor,            // elemento del DOM donde insertar el bloque
//     perfil,                // perfil del usuario (users/{uid}: uid, rol, nie?)
//     clase,                 // { id, grado, materiaId, materia?, titulo? }
//     tipo: "clase",         // "clase" | "tarea" | "examen" (defecto: "clase")
//     categorias: [          // UNA fila por categoría
//       { nombre: "Animales",
//         elementos: ["Perro", "Gato", "img:vaca.png", "https://…/pez.png"] },
//       { nombre: "Plantas",
//         elementos: ["Rosa", "<svg …>…</svg>", "Helecho"] },
//     ],
//     puntaje: 2,            // valor TOTAL del bloque (0 a 10), repartido
//     colorSeccion: "#4f46e5", // color de la sección (defecto FIJO #4f46e5)
//     // columnas: 2,        // ancho en pantalla (mitad del documento)
//     // id: "clasi1",       // (opcional) identificador único y estable
//   }).then((ganado) => { /* nota ganada en ESTE bloque */ });
//
// Convención: CSS implícito · 100% responsivo · fondo blanco ·
// sin frameworks ni hojas externas (todo el estilo se inyecta
// desde aquí) · paleta del proyecto.
// ============================================================

// REGLA DEL PROYECTO: nada toca Firestore o Sheets directo → todo pasa
// por las funciones compartidas de opcionMultiple.js (que usan db.js)
import {
  obtenerNota,
  sumarPuntos,
  finalizarExamen,
  guardarPreguntaExamen,
  esDocente,
  prepararDocente,
  registrarPuntoDocente,
  aplicarTamano,
} from "./opcionMultiple.js";

// Azar anti-copia: orden del banco PERSISTENTE por navegador hasta
// responder el bloque (js/utils/aleatorio.js).
import { ordenPersistente, liberarOrden, claveOrden } from "./aleatorio.js";

// Comodines para el archivo de contenido (misma API que opcionMultiple.js)
export { obtenerNota, sumarPuntos, finalizarExamen } from "./opcionMultiple.js";

/* ---------------- Constantes ---------------- */

const TIPOS = ["clase", "tarea", "examen"];

// Tope defensivo: una tabla con más de 12 categorías o 100 tarjetas
// deja de ser utilizable (el formulario además limita a 8 filas).
const MAX_CATEGORIAS = 12;
const MAX_TARJETAS = 100;

/**
 * REGLA DEL PROYECTO (aclarada): el color por defecto de cada
 * util/visual es PREDEFINIDO — un color FIJO y adaptado, no uno que
 * cambie en cada montaje. Para «Clasificar» es el índigo #4f46e5:
 * vivo, distinto de los defectos de las demás utilidades, legible
 * con buenos tonos claros/oscuros derivados. En «Crear» el docente
 * lo cambia con el selector RGB (input de color) sin escribirlo.
 */
export const COLOR_SECCION_DEFECTO = [79, 70, 229];   // #4f46e5

/* ---------------- Helpers ---------------- */

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slug(texto) {
  return normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "x";
}

// Mini hash djb2 → evita que dos bloques distintos compartan id
function hash8(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

// Redondeo a 2 decimales (el reparto igualitario puede dar decimales)
function redondear2(n) {
  return Math.round(Number(n) * 100) / 100;
}

// Fisher-Yates sobre una copia (para el docente)
function mezclar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- Color (regla del proyecto: colorSeccion) ---------------- */

function parseColor(v) {
  const s = String(v || "").trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return m[1].split("").map((c) => parseInt(c + c, 16));
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = s.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}

function tono([r, g, b], k) {
  const f = (c) =>
    Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)
      .toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}

/* ---------------- Datos: categorías con sus elementos ---------------- */

/**
 * Parte la lista de elementos de UNA categoría por COMA sin romper
 * el código SVG: primero se apuntan los bloques <svg>…</svg> (con
 * un marcador), se parte lo restante por coma y se restauran.
 */
function partirElementos(texto) {
  const svgs = [];
  const protegido = String(texto ?? "").replace(/<svg[\s\S]*?<\/svg\s*>/gi, (m) => {
    svgs.push(m.trim());
    return "\u0001svg" + (svgs.length - 1) + "\u0001";
  });
  return protegido
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p !== "")
    .map((p) => p.replace(/\u0001svg(\d+)\u0001/g, (_, i) => svgs[Number(i)] ?? ""));
}

/**
 * Acepta las categorías como ARREGLO de objetos
 * { nombre, elementos: [...] } (alias: items / palabras; también
 * acepta elementos como TEXTO separado por coma). Devuelve
 * [{ nombre, elementos: [texto, …] }] sin categorías vacías.
 */
function normalizarCategorias(cfg) {
  const lista = Array.isArray(cfg) ? cfg : [];
  const fuera = [];
  for (const c of lista) {
    const nombre = String(c && c.nombre != null ? c.nombre : (c && c.categoria) || "").trim();
    const crudos = c && (Array.isArray(c.elementos) ? c.elementos
      : Array.isArray(c.items) ? c.items
      : Array.isArray(c.palabras) ? c.palabras
      : c.elementos != null ? partirElementos(c.elementos)
      : []);
    const elementos = [];
    if (Array.isArray(crudos)) {
      for (const e of crudos) {
        const t = String(e ?? "").trim();
        if (t) elementos.push(t);
      }
    }
    // las categorías SIN elementos se CONSERVAN: el aviso de desarrollo
    // las cita por su nombre («no tienen elementos»)
    if (nombre) fuera.push({ nombre, elementos });
  }
  return fuera;
}

/* ---------------- Imágenes (convención del proyecto) ----------------
   Un elemento es IMAGEN si empieza con "img:", si termina en
   extensión de imagen, si es una URL/ruta, un data:image/blob: o
   lleva código <svg>. Todo lo demás es PALABRA. Sin carpeta ni URL
   completa se busca SIEMPRE en recursos/img/ (convención del
   proyecto: rutas relativas a public/). */

const EXT_IMAGEN = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i;
const DIR_IMAGENES = "recursos/img/";

function esImagen(valor) {
  const v = String(valor ?? "").trim();
  if (!v) return false;
  if (v.startsWith("img:")) return true;
  if (/^(data:image\/|blob:)/i.test(v)) return true;
  if (/<\s*svg[\s>]/i.test(v)) return true;
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("/") || v.startsWith("./") || v.startsWith("../")) return true;
  return EXT_IMAGEN.test(v);
}

/** URL final para el <img> (SVG en línea → data:image URI SEGURA). */
function rutaImagen(valor) {
  let v = String(valor ?? "").trim();
  if (/<\s*svg[\s>]/i.test(v)) {
    // un SVG sin width/height colapsa a 0×0 dentro de <img>: si faltan
    // medidas se INYECTAN desde su viewBox (o 64×64 por defecto)
    if (!/\swidth\s*=/.test(v) || !/\sheight\s*=/.test(v)) {
      const vb = v.match(/viewBox\s*=\s*["']\s*[\d.eE+-]+[\s,]+[\d.eE+-]+[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)/i);
      const dims = vb ? ` width="${vb[1]}" height="${vb[2]}"` : ' width="64" height="64"';
      v = v.replace(/<svg\b/i, "<svg" + dims);
    }
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(v);
  }
  if (v.startsWith("img:")) v = v.slice(4).trim();
  if (/^(data:image\/|blob:)/i.test(v)) return v;
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("/") || v.startsWith("./") || v.startsWith("../")) return v;
  return DIR_IMAGENES + encodeURI(v);
}

/* ---------------- CSS implícito ---------------- */

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-clasificar-estilos";
  estilo.textContent = `
    .cl-caja {
      --cl-c: #4f46e5;
      --cl-oscuro: #3b34c4;
      --cl-claro: #eef0fe;
      --cl-borde: #b6baf5;
      --cl-suave: rgba(79, 70, 229, .12);
      --cl-sombra: rgba(79, 70, 229, .28);
      background: #ffffff;
      border: 1px solid #e9eaf8;
      border-left: 4px solid var(--cl-c);
      border-radius: 1.1rem;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937;
      box-sizing: border-box;
    }
    .cl-caja *, .cl-caja *::before, .cl-caja *::after { box-sizing: border-box; }
    .cl-caja [hidden] { display: none !important; }

    .cl-cab {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .6rem;
    }
    .cl-etiqueta {
      background: var(--cl-suave);
      color: var(--cl-oscuro);
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .cl-chip {
      font-size: .72rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      white-space: nowrap;
    }
    .cl-chip.aviso { background: rgba(249, 115, 22, .14); color: #c2410c; }
    .cl-chip.bien { background: rgba(22, 163, 52, .12); color: #15803d; }
    .cl-chip.mal { background: rgba(239, 68, 68, .12); color: #b91c1c; }

    .cl-ayuda {
      margin: 0 0 .85rem;
      font-size: .84rem;
      color: #6b7280;
      line-height: 1.4;
    }

    /* ── Banco: tarjetas mezcladas por clasificar ── */
    .cl-lado-titulo {
      margin: 0 0 .35rem;
      font-size: .7rem;
      font-weight: 800;
      color: #6b7280;
      letter-spacing: .04em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: .45rem;
    }
    .cl-banco-chip {
      font-size: .68rem;
      font-weight: 800;
      padding: .1rem .5rem;
      border-radius: 999px;
      background: #f3f4f6;
      color: #6b7280;
      letter-spacing: 0;
    }
    .cl-zona {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      align-content: flex-start;
      gap: .45rem;
      min-height: 3.4rem;
      padding: .45rem;
      border: 1.5px dashed #d1d5db;
      border-radius: .8rem;
      background: #fafafa;
      transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
    }
    .cl-zona.sobre {
      border-color: var(--cl-c);
      background: var(--cl-claro);
      box-shadow: 0 0 0 3px var(--cl-suave);
    }
    .cl-banco-vacio {
      font-size: .78rem;
      color: #9ca3af;
      font-weight: 600;
      padding: .3rem .2rem;
    }

    /* ── Tabla: una columna con su casilla por categoría ── */
    .cl-tabla {
      display: flex;
      flex-wrap: wrap;
      gap: .6rem;
      margin-top: .8rem;
    }
    .cl-col {
      flex: 1 1 168px;
      min-width: 150px;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      border: 1.5px solid var(--cl-borde);
      border-radius: .9rem;
      overflow: hidden;
      background: #ffffff;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .cl-col.sobre { border-color: var(--cl-c); box-shadow: 0 0 0 3px var(--cl-suave); }
    .cl-col-cab {
      padding: .5rem .6rem;
      text-align: center;
      font-weight: 800;
      font-size: .92rem;
      line-height: 1.25;
      background: var(--cl-claro);
      color: var(--cl-oscuro);
      border-bottom: 1.5px solid var(--cl-borde);
      overflow-wrap: anywhere;
    }
    .cl-col-cab small {
      display: block;
      font-size: .62rem;
      font-weight: 750;
      letter-spacing: .05em;
      text-transform: uppercase;
      opacity: .7;
      margin-top: 1px;
    }
    .cl-casilla {
      flex: 1;
      min-height: 128px;
      border: none;
      border-radius: 0;
      background: #fcfcfd;
    }
    .cl-col.lleno .cl-casilla { background: #ffffff; }

    /* ── Tarjetas arrastrables (palabra o imagen) ── */
    .cl-tarjeta {
      font-family: inherit;
      font-size: .9rem;
      line-height: 1.35;
      color: #374151;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-bottom-width: 3px;
      border-bottom-color: var(--cl-borde);
      border-radius: .7rem;
      padding: .42rem .7rem;
      cursor: grab;
      max-width: 100%;
      text-align: center;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: .25rem;
      box-shadow: 0 1px 3px rgba(17, 12, 46, .07);
      transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
    }
    .cl-tarjeta:hover:not(:disabled) {
      border-color: var(--cl-c);
      box-shadow: 0 4px 12px var(--cl-suave);
      transform: translateY(-1px);
    }
    .cl-tarjeta:active:not(:disabled) { cursor: grabbing; }
    .cl-tarjeta:disabled { cursor: default; opacity: .96; }
    .cl-tarjeta.arrastrando { opacity: .45; }
    .cl-tarjeta.seleccionada {
      border-color: var(--cl-c);
      box-shadow: 0 0 0 3px var(--cl-sombra);
      transform: translateY(-1px);
    }
    .cl-tarjeta-texto {
      overflow-wrap: anywhere;
      word-break: break-word;
      max-width: 190px;
    }
    .cl-tarjeta-img {
      display: block;
      max-height: 64px;
      max-width: 130px;
      /* mínimo visible: los SVG pequeños no se desdibujan en un punto */
      min-height: 44px;
      min-width: 56px;
      object-fit: contain;
    }
    .cl-tarjeta-img-fallo {
      font-size: .68rem;
      font-weight: 700;
      color: #b91c1c;
      max-width: 120px;
    }
    /* tarjeta correcta FIJA (verde) · incorrecta marcada (roja) · solución (ámbar) */
    .cl-tarjeta.fija {
      border-color: #16a34a;
      border-bottom-color: #16a34a;
      background: rgba(22, 163, 52, .07);
    }
    .cl-tarjeta.mala {
      border-color: #ef4444;
      border-bottom-color: #ef4444;
      background: rgba(239, 68, 68, .06);
      animation: cl-shake .3s ease;
    }
    .cl-tarjeta.solucion {
      border-style: dashed;
      border-color: #f59e0b;
      border-bottom-color: #f59e0b;
      background: rgba(245, 158, 11, .07);
    }
    @keyframes cl-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    /* ── Nota final (aparece al terminar el juego) ── */
    .cl-final {
      margin-top: .9rem;
      border: 2px solid var(--cl-c);
      border-radius: 1rem;
      background: linear-gradient(180deg, #ffffff, var(--cl-claro));
      padding: .9rem 1rem 1rem;
      text-align: center;
    }
    .cl-final[hidden] { display: none; }
    .cl-final-titulo {
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .cl-final-puntos {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.15;
      color: var(--cl-oscuro);
      font-variant-numeric: tabular-nums;
    }
    .cl-final-puntos span {
      font-size: .92rem;
      font-weight: 700;
      color: #6b7280;
    }
    .cl-final-barra {
      height: .55rem;
      border-radius: 999px;
      background: #e5e7eb;
      overflow: hidden;
      margin: .55rem auto .45rem;
      max-width: 320px;
    }
    .cl-final-barra span {
      display: block;
      height: 100%;
      width: 0;
      border-radius: 999px;
      background: var(--cl-c);
      transition: width .5s ease;
    }
    .cl-final-mensaje {
      margin: .25rem 0 0;
      font-size: .88rem;
      font-weight: 650;
      color: #4b5563;
    }

    /* ── Pie: feedback + botones ── */
    .cl-pie {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: .85rem;
    }
    .cl-feedback {
      font-size: .84rem;
      font-weight: 650;
      color: #6b7280;
      min-width: 0;
    }
    .cl-feedback.ok { color: #15803d; }
    .cl-feedback.aviso { color: #c2410c; }
    .cl-feedback.mal { color: #b91c1c; }
    .cl-caja button:focus-visible {
      outline: 3px solid #1e293b;
      outline-offset: 2px;
    }
    .cl-btn {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      font: 750 .85rem/1 system-ui, sans-serif;
      padding: .68rem 1.15rem;
      border: 1.5px solid transparent;
      border-radius: .7rem;
      background: var(--cl-oscuro);
      color: #ffffff;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(15, 23, 42, .22);
    }
    .cl-btn:hover:not(:disabled) { filter: brightness(0.92); }
    .cl-btn:disabled { opacity: .45; cursor: not-allowed; }
    .cl-btn--fantasma {
      background: #ffffff;
      color: #475569;
      border-color: #cbd5e1;
      box-shadow: none;
    }
    .cl-btn--fantasma:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }

    @media (max-width: 560px) {
      .cl-col { flex: 1 1 100%; }
      .cl-pie { flex-direction: column-reverse; align-items: stretch; }
      .cl-pie > span:last-child { display: flex; gap: .5rem; }
      .cl-btn { flex: 1; justify-content: center; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cl-tarjeta.mala, .cl-tarjeta { animation: none; }
      .cl-final-barra span { transition: none; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Componente ---------------- */

/**
 * Inserta un bloque de CLASIFICAR en el contenedor indicado.
 * Devuelve una Promise<number> con lo ganado en ESTE bloque (cada
 * tarjeta bien clasificada vale puntaje/N: completo al 1.er intento;
 * las corregidas al 2.º, la mitad; en tarea el 2.º envío es el que
 * cuenta; en examen enviar() es una sola oportunidad a valor
 * completo). Con tipo "examen" la promesa trae además .enviar() →
 * Promise<{ puntos, maxPuntaje }> para el botón final del examen.
 */
export function clasificar(config = {}) {
  const { contenedor, perfil, clase, id } = config;

  const tipo = String(config.tipo || clase?.tipo || "clase").toLowerCase().trim();
  const esTipoClase = tipo === "clase";
  const esTarea = tipo === "tarea";
  const esExamen = tipo === "examen";
  // ¿Se revela la solución al terminar? clase: sí (al acabar el
  // juego); tarea y examen: nunca.
  const revelar = esTipoClase;

  // PUNTAJE TOTAL del bloque (0 a 10). Defecto: 1. Se reparte en
  // partes IGUALES entre TODAS las tarjetas (palabras o imágenes).
  let puntaje = Number(config.puntaje ?? 1);
  if (!Number.isFinite(puntaje) || puntaje < 0 || puntaje > 10) {
    console.warn("[clasificar] 'puntaje' debe ser un número entre 0 y 10 (llegó:", config.puntaje, "). Se usará 1.");
    puntaje = 1;
  }
  puntaje = redondear2(puntaje);

  let enviarExamen = null; // se define dentro del executor (solo examen)

  const promesa = new Promise((resolve) => {
    inyectarEstilos();
    construir(resolve);
  });

  function construir(resolve) {

    // --- Validaciones (avisos claros para quien escribe el contenido) ---
    const categoriasCfg = normalizarCategorias(config.categorias);

    function errorDev(mensaje) {
      console.error("[clasificar]", mensaje);
      if (contenedor && typeof contenedor.append === "function") {
        const div = document.createElement("div");
        div.className = "cl-caja cl-error-dev";
        div.style.borderLeftColor = "#ef4444";
        div.textContent = "[clasificar] " + mensaje;
        contenedor.append(div);
      }
    }

    if (!contenedor || typeof contenedor.append !== "function") {
      console.error("[clasificar] Falta 'contenedor' (elemento del DOM donde insertar el bloque).");
      resolve(0);
      return;
    }
    if (!TIPOS.includes(tipo)) {
      errorDev(`'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
      resolve(0);
      return;
    }
    if (!categoriasCfg.length || categoriasCfg.length < 2) {
      errorDev("Se necesitan AL MENOS 2 categorías con sus elementos (cada una con al menos 1 palabra o imagen).");
      resolve(0);
      return;
    }
    if (categoriasCfg.length > MAX_CATEGORIAS) {
      errorDev(`Demasiadas categorías (${categoriasCfg.length}): el máximo es ${MAX_CATEGORIAS}.`);
      resolve(0);
      return;
    }
    const sinElementos = categoriasCfg.filter((c) => !c.elementos.length);
    if (sinElementos.length) {
      errorDev(`Estas categorías no tienen elementos: ${sinElementos.map((c) => `«${c.nombre}»`).join(", ")}.`);
      resolve(0);
      return;
    }

    // Arma las TARJETAS: identidad por (categoría, posición) — la
    // misma palabra en dos categorías son dos tarjetas distintas.
    const tarjetasCfg = [];
    categoriasCfg.forEach((c, ci) => {
      c.elementos.forEach((texto, ei) => {
        tarjetasCfg.push({
          id: `c${ci}e${ei}`,
          ci,                  // casilla CORRECTA (índice de categoría)
          texto,
          esImg: esImagen(texto),
        });
      });
    });
    if (!tarjetasCfg.length) {
      errorDev("No hay tarjetas: agrega palabras o imágenes a las categorías.");
      resolve(0);
      return;
    }
    if (tarjetasCfg.length > MAX_TARJETAS) {
      errorDev(`Demasiadas tarjetas (${tarjetasCfg.length}): el máximo es ${MAX_TARJETAS}.`);
      resolve(0);
      return;
    }

    if (!perfil?.uid || !clase?.id) {
      errorDev("Faltan 'perfil' (con uid) o 'clase' (con id): la nota no se puede guardar.");
      resolve(0);
      return;
    }

    const esDoc = esDocente(perfil);
    const N = tarjetasCfg.length;
    const valorTarjeta = puntaje / N; // parte IGUAL de cada tarjeta (exacta)
    const baseId = id ? String(id) : categoriasCfg.map((c) => c.nombre).join("|");
    const qid = id ? slug(String(id)) : `clasificar-${hash8(normalizar(baseId))}`;

    // --- Orden ALEATORIO del banco (anti-copia, PERSISTENTE por
    // navegador hasta responder; el docente ve uno nuevo cada vez) ---
    const claveBanco = claveOrden(qid + "-banco");
    const ordenInicial = esDoc
      ? mezclar(tarjetasCfg.map((_, k) => k))
      : ordenPersistente(claveBanco, N);
    let bancoOrden = ordenInicial.slice(); // orden VIVO del banco (devolver empuja al final)

    // --- Estado ---
    let envios = 0;             // intentos ya usados en clase/tarea
    let bloqueada = false;      // juego terminado (o ya respondido)
    let resuelto = false;
    let yaEnviada = false;      // examen: guardado con la marca de enviado
    let ultimoResultado = null;
    let arrastre = null;        // tarjeta arrastrada (HTML5 drag & drop)
    let clicTrasArrastre = false; // ignora el clic que algunos navegadores disparan tras soltar
    let seleccion = null;       // tarjeta tocada (fallback táctil: tocar tarjeta → tocar casilla)
    let verificando = false;    // durante el flash rojo de las malas
    let docenteCompleto = false;
    // Estado por tarjeta: dónde está (-1 = banco) y su chip de evaluación
    tarjetasCfg.forEach((t) => {
      t.ubicacion = -1;
      t.fija = false;         // correcta y FIJA (verde)
      t.chip = "";            // "" | "bien" | "mal" | "medio" | "solucion"
    });
    let acumuladoExacto = 0;  // valor confirmado del bloque (exacto)
    let logradas = 0;         // tarjetas bien clasificadas confirmadas

    const resolverUnaVez = (valor) => {
      if (!resuelto) {
        resuelto = true;
        // Respondido: el desorden guardado del banco ya no hace falta
        // y se libera para la próxima vez.
        if (!esDoc) liberarOrden(claveBanco);
        resolve(valor);
      }
    };

    // REGLA del proyecto: colorSeccion HEX/rgb; VACÍO o inválido →
    // color PREDEFINIDO FIJO de esta utilidad (#4f46e5, no cambia)
    const color = parseColor(config.colorSeccion) || COLOR_SECCION_DEFECTO;

    // --- Estructura (SIN mención al puntaje: la nota final solo se
    //     revela en el mensaje final, al terminar el juego) ---
    const caja = document.createElement("section");
    caja.className = "cl-caja";
    caja.style.setProperty("--cl-c", `rgb(${color.join(",")})`);
    caja.style.setProperty("--cl-oscuro", tono(color, -0.18));
    caja.style.setProperty("--cl-claro", tono(color, 0.92));
    caja.style.setProperty("--cl-borde", tono(color, 0.55));
    caja.style.setProperty("--cl-suave", `rgba(${color.join(",")},.12)`);
    caja.style.setProperty("--cl-sombra", `rgba(${color.join(",")},.35)`);
    caja.setAttribute("role", "region");
    caja.setAttribute("aria-label", "Clasificar: " + categoriasCfg.map((c) => c.nombre).join(", "));
    caja.innerHTML = `
      <div class="cl-cab">
        <span class="cl-etiqueta">${esExamen ? "Examen" : esTarea ? "Tarea" : "Clasificar"}</span>
        <span class="cl-chip"></span>
      </div>
      <p class="cl-ayuda"></p>
      <div class="cl-zona-banco">
        <p class="cl-lado-titulo">Tarjetas por clasificar <span class="cl-banco-chip"></span></p>
        <div class="cl-zona cl-banco" aria-label="Tarjetas sin clasificar"></div>
      </div>
      <div class="cl-tabla"></div>
      <div class="cl-final" hidden>
        <div class="cl-final-titulo">Nota final</div>
        <div class="cl-final-puntos"></div>
        <div class="cl-final-barra"><span></span></div>
        <p class="cl-final-mensaje"></p>
      </div>
      <div class="cl-pie">
        <span class="cl-feedback" aria-live="polite"></span>
        <span style="display:flex; gap:.5rem; flex-wrap:wrap;">
          <button type="button" class="cl-limpiar cl-btn cl-btn--fantasma" disabled>Limpiar</button>
          ${esExamen ? "" : '<button type="button" class="cl-enviar cl-btn" disabled>Evaluar</button>'}
        </span>
      </div>`;
    caja.querySelector(".cl-ayuda").textContent =
      "Arrastra cada tarjeta a la casilla de su categoría (o tócala y luego toca la casilla). " +
      (esExamen ? "El examen enviará todas tus respuestas al final."
        : esTarea ? "Tienes dos envíos: el segundo es el que cuenta."
        : "Cuando clasifiques todas, pulsa Evaluar.");

    const chipEl = caja.querySelector(".cl-chip");
    const feedbackEl = caja.querySelector(".cl-feedback");
    const btnEvaluar = caja.querySelector(".cl-enviar"); // null en examen
    const btnLimpiar = caja.querySelector(".cl-limpiar");
    const elBanco = caja.querySelector(".cl-banco");
    const elBancoChip = caja.querySelector(".cl-banco-chip");
    const elTabla = caja.querySelector(".cl-tabla");
    const elFinal = caja.querySelector(".cl-final");

    const feedback = (mensaje, tipoFeedback) => {
      feedbackEl.textContent = mensaje;
      feedbackEl.className = "cl-feedback" + (tipoFeedback ? " " + tipoFeedback : "");
    };
    const chip = (mensaje, tipoChip) => {
      chipEl.textContent = mensaje;
      chipEl.className = "cl-chip" + (tipoChip ? " " + tipoChip : "");
    };

    // --- Columnas de la tabla (cabecera + casilla de arrastre) ---
    const cols = categoriasCfg.map((c, ci) => {
      const col = document.createElement("div");
      col.className = "cl-col";
      col.dataset.ci = String(ci);
      col.innerHTML = `
        <div class="cl-col-cab"></div>
        <div class="cl-zona cl-casilla" aria-label="Casilla de la categoría ${c.nombre}"></div>`;
      col.querySelector(".cl-col-cab").textContent = c.nombre;
      elTabla.append(col);
      return { col, casilla: col.querySelector(".cl-casilla") };
    });

    // --- Tarjetas arrastrables (viven en el banco o en una casilla) ---
    const botones = tarjetasCfg.map((t, k) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cl-tarjeta";
      btn.draggable = true;
      btn.dataset.t = t.id;
      btn.dataset.k = String(k);
      if (t.esImg) {
        const img = document.createElement("img");
        img.className = "cl-tarjeta-img";
        img.alt = "Imagen";
        img.draggable = false;
        img.addEventListener("error", () => {
          img.remove();
          const fallo = document.createElement("span");
          fallo.className = "cl-tarjeta-img-fallo";
          fallo.textContent = "Imagen no encontrada";
          btn.prepend(fallo);
        });
        img.src = rutaImagen(t.texto);
        btn.append(img);
      } else {
        const sp = document.createElement("span");
        sp.className = "cl-tarjeta-texto";
        sp.textContent = t.texto;
        btn.append(sp);
      }
      btn.addEventListener("dragstart", (e) => {
        if (bloqueada || verificando || btn.disabled) { e.preventDefault(); return; }
        arrastre = k;
        clicTrasArrastre = true;
        try {
          e.dataTransfer.setData("text/plain", t.id);
          e.dataTransfer.effectAllowed = "move";
        } catch (err) { /* navegador sin dataTransfer */ }
        btn.classList.add("arrastrando");
      });
      btn.addEventListener("dragend", () => {
        btn.classList.remove("arrastrando");
        cols.forEach((c) => c.col.classList.remove("sobre"));
        elBanco.classList.remove("sobre");
        setTimeout(() => { arrastre = null; clicTrasArrastre = false; }, 0);
      });
      btn.addEventListener("click", (e) => {
        // el toque en la tarjeta NO debe burbujear a su zona (el banco
        // o la casilla borrarían la selección recién puesta)
        e.stopPropagation();
        alClicTarjeta(k);
      });
      return btn;
    });
    const botonDe = (k) => botones[k];

    // TODAS las zonas (banco + casillas) reciben el arrastre
    const recibir = (zona) => (e) => {
      if (arrastre == null || bloqueada || verificando) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = "move"; } catch (err) { /* sin dataTransfer */ }
      zona.classList.add("sobre");
    };
    const dejarEn = (zona, ci) => (e) => {
      e.preventDefault();
      zona.classList.remove("sobre");
      if (arrastre == null || bloqueada || verificando) return;
      if (ci == null) devolver(arrastre);
      else colocar(arrastre, ci);
      arrastre = null;
    };
    elBanco.addEventListener("dragover", recibir(elBanco));
    elBanco.addEventListener("dragleave", () => elBanco.classList.remove("sobre"));
    elBanco.addEventListener("drop", dejarEn(elBanco, null));
    cols.forEach((c, ci) => {
      c.casilla.addEventListener("dragover", recibir(c.col));
      c.casilla.addEventListener("dragleave", () => c.col.classList.remove("sobre"));
      c.casilla.addEventListener("drop", dejarEn(c.casilla, ci));
      // tocar la casilla con una tarjeta seleccionada (fallback táctil)
      c.casilla.addEventListener("click", () => {
        if (seleccion == null || bloqueada || verificando) return;
        colocar(seleccion, ci);
        seleccion = null;
        repintar();
      });
    });
    // tocar el banco con una tarjeta seleccionada la devuelve
    elBanco.addEventListener("click", () => {
      if (seleccion == null || bloqueada || verificando) return;
      devolver(seleccion);
      seleccion = null;
      repintar();
    });

    // --- Pintar el estado (colocación, colores, disabled) ---
    function repintar() {
      elBanco.innerHTML = "";
      cols.forEach((c) => { c.casilla.innerHTML = ""; });
      tarjetasCfg.forEach((t, k) => {
        const btn = botonDe(k);
        btn.classList.remove("arrastrando", "seleccionada");
        btn.classList.toggle("fija", t.chip === "bien" || t.chip === "medio");
        btn.classList.toggle("mala", t.chip === "mal");
        btn.classList.toggle("solucion", t.chip === "solucion");
        btn.disabled = bloqueada || verificando || t.fija;
        btn.draggable = !btn.disabled;
        if (seleccion === k && !btn.disabled) btn.classList.add("seleccionada");
      });
      // el banco conserva SU orden (anti-copia); las casillas van por tarjeta
      bancoOrden.forEach((k) => elBanco.append(botonDe(k)));
      const enBanco = bancoOrden.length;
      tarjetasCfg.forEach((t, k) => {
        if (t.ubicacion >= 0) cols[t.ubicacion].casilla.append(botonDe(k));
      });
      // aviso amable cuando el banco queda vacío
      if (!enBanco) {
        const v = document.createElement("span");
        v.className = "cl-banco-vacio";
        v.textContent = bloqueada ? "Banco vacío" : "Banco vacío: todas están en la tabla";
        elBanco.append(v);
      }
      elBancoChip.textContent = `${enBanco} en el banco`;
      cols.forEach((c, ci) => {
        const n = tarjetasCfg.filter((t) => t.ubicacion === ci).length;
        c.col.classList.toggle("lleno", n > 0);
      });
      btnLimpiar.disabled = bloqueada || verificando ||
        !tarjetasCfg.some((t) => !t.fija && t.ubicacion >= 0);
    }

    // --- Pie: chip y botón según el estado/tipo ---
    function actualizarPie() {
      const colocadas = tarjetasCfg.filter((t) => t.ubicacion >= 0).length;
      if (!bloqueada) {
        if (esDoc) {
          chip(
            docenteCompleto
              ? "Resuelto · vista docente"
              : envios === 0 ? "Vista docente" : `Vista docente · intento ${envios + 1}`,
            docenteCompleto ? "bien" : ""
          );
        } else if (esExamen) {
          chip("Sin enviar", "");
        } else if (envios === 0) {
          chip(`Intento 1 de 2 · ${colocadas} de ${N} clasificadas`, "");
        } else {
          chip(esTarea ? "Envío 2 de 2" : "Intento 2 de 2 · último", "aviso");
        }
        if (btnEvaluar) btnEvaluar.disabled = verificando || docenteCompleto || colocadas < N;
      }
      btnLimpiar.disabled = bloqueada || verificando ||
        !tarjetasCfg.some((t) => !t.fija && t.ubicacion >= 0);
    }

    // --- Colocar / devolver (sirven para el arrastre y para el toque) ---
    function colocar(k, ci) {
      if (bloqueada || verificando || k == null || ci == null) return;
      const t = tarjetasCfg[k];
      if (t.fija) return;
      if (t.ubicacion === ci) return;
      t.ubicacion = ci;
      t.chip = "";
      bancoOrden = bancoOrden.filter((x) => x !== k);
      repintar();
      actualizarPie();
      feedback("", "");
    }

    function devolver(k) {
      if (bloqueada || verificando || k == null) return;
      const t = tarjetasCfg[k];
      if (t.fija) return;
      if (t.ubicacion < 0) return;
      t.ubicacion = -1;
      t.chip = "";
      bancoOrden.push(k);
      repintar();
      actualizarPie();
      feedback("", "");
    }

    // Toque en una tarjeta (fallback de arrastre: ideal para pantalla táctil)
    function alClicTarjeta(k) {
      if (clicTrasArrastre) { clicTrasArrastre = false; return; }
      if (bloqueada || verificando) return;
      const btn = botonDe(k);
      if (btn.disabled) return;
      if (seleccion === k) seleccion = null;
      else seleccion = k;
      repintar();
    }

    // Limpiar: devuelve al banco TODAS las tarjetas no fijas
    btnLimpiar.addEventListener("click", () => {
      if (bloqueada || verificando) return;
      tarjetasCfg.forEach((t, k) => {
        if (t.fija) return;
        if (t.ubicacion >= 0) bancoOrden.push(k);
        t.ubicacion = -1;
        t.chip = "";
      });
      seleccion = null;
      repintar();
      actualizarPie();
      feedback("", "");
    });

    // --- Evaluación: tarjetas bien y mal clasificadas (salta las fijas) ---
    function evaluarTarjetas() {
      const buenas = [];
      const malas = [];
      tarjetasCfg.forEach((t, k) => {
        if (t.fija) return;
        (t.ubicacion === t.ci ? buenas : malas).push(k);
      });
      return { buenas, malas };
    }

    // Revela la SOLUCIÓN de las tarjetas no resueltas: cada una viaja
    // a SU casilla correcta con el chip ámbar «Solución».
    function revelarCorrectas() {
      tarjetasCfg.forEach((t) => {
        if (t.fija) return;
        t.ubicacion = t.ci;
        t.chip = "solucion";
      });
      seleccion = null;
    }

    function bloquearTodo() {
      bloqueada = true;
      verificando = false;
      seleccion = null;
      if (btnEvaluar) btnEvaluar.disabled = true;
      btnLimpiar.disabled = true;
      repintar();
    }

    // --- MENSAJE con la NOTA FINAL (lo pide la actividad) ---
    function mostrarNotaFinal(total) {
      if (!elFinal) return;
      elFinal.hidden = false;
      const pct = puntaje > 0 ? Math.round((total / puntaje) * 100) : 0;
      elFinal.querySelector(".cl-final-puntos").innerHTML =
        `${redondear2(total)} <span>de ${puntaje} ${puntaje === 1 ? "punto" : "puntos"}</span>`;
      elFinal.querySelector(".cl-final-barra span").style.width = pct + "%";
      const mensaje =
        pct >= 100 ? "¡Perfecto! Todo en su casilla al primer intento."
        : pct >= 90 ? "¡Excelente trabajo!"
        : pct >= 60 ? "¡Bien! Lo corregido al segundo intento contó la mitad."
        : pct >= 40 ? "Puedes mejorar: repasa las tarjetas mal clasificadas."
        : "A seguir practicando: revisa la solución y vuelve a intentarlo.";
      elFinal.querySelector(".cl-final-mensaje").textContent = mensaje;
    }

    // --- Fin del bloque (estudiante): guarda el TOTAL una vez ---
    function terminar(total, chipTxt, chipTipo, fbTxt, fbTipo, btnTxt, revelarAlFinal) {
      if (revelarAlFinal) revelarCorrectas();
      bloquearTodo();
      if (btnEvaluar) btnEvaluar.textContent = btnTxt;
      chip(chipTxt, chipTipo);
      feedback(fbTxt, fbTipo);
      if (!esDoc && (esTipoClase || esTarea)) mostrarNotaFinal(total);
      if (total > 0) sumarPuntos(perfil, clase, qid, total, { tipo }).catch(() => {});
      resolverUnaVez(total); // ← la nota solo la recibe el archivo de la clase
    }

    /* --- DOCENTE: verificación con intentos libres, head local y CERO
       guardado. Las incorrectas vuelven al banco para volver a clasificar. --- */
    function verificarDocente() {
      const primero = envios === 0;
      const factor = primero ? 1 : 1 / 2;
      const { buenas, malas } = evaluarTarjetas();

      buenas.forEach((k) => {
        const t = tarjetasCfg[k];
        t.fija = true;
        t.chip = primero ? "bien" : "medio";
      });
      logradas += buenas.length;
      acumuladoExacto += buenas.length * valorTarjeta * factor;
      malas.forEach((k) => {
        const t = tarjetasCfg[k];
        t.ubicacion = -1;      // vuelve al banco
        bancoOrden.push(k);
        t.chip = "mal";        // flash rojo mientras dura el aviso
      });
      registrarPuntoDocente(perfil, clase, qid, redondear2(acumuladoExacto));
      resolverUnaVez(redondear2(acumuladoExacto));
      envios++;

      if (tarjetasCfg.every((t) => t.fija)) {
        docenteCompleto = true;
        repintar();
        actualizarPie();
        feedback("¡Todas las tarjetas en su casilla! El puntaje está arriba: nada se guarda.", "ok");
        return;
      }
      const finFlash = () => {
        verificando = false;
        malas.forEach((k) => { tarjetasCfg[k].chip = ""; });
        repintar();
        actualizarPie();
        feedback(`Vista docente: ${logradas} de ${N} bien clasificadas. Las incorrectas volvieron al banco: sigue (nada se guarda).`, "aviso");
      };
      if (malas.length) {
        verificando = true;
        actualizarPie();
        repintar();
        setTimeout(finFlash, 900);
      } else {
        repintar();
        actualizarPie();
        feedback(`Vista docente: ${logradas} de ${N} bien clasificadas. Sigue clasificando y verificando: nada se guarda.`, "aviso");
      }
    }

    // --- Evaluar (clase y tarea; el examen pasa por enviar()) ---
    async function procesarEvaluar() {
      if (bloqueada || verificando) return;
      if (esExamen) return;

      const enBanco = tarjetasCfg.filter((t) => t.ubicacion < 0 && !t.fija).length;
      if (enBanco) {
        feedback(
          enBanco === 1
            ? "Te falta 1 tarjeta por clasificar (está en el banco)."
            : `Te faltan ${enBanco} tarjetas por clasificar (están en el banco).`,
          "aviso"
        );
        return; // no gasta el intento
      }

      if (esDoc) {
        verificarDocente();
        return;
      }

      const { buenas, malas } = evaluarTarjetas();

      /* ESTUDIANTE · CLASE: 1.er intento completo y fijo; 2.º a la mitad */
      if (esTipoClase) {
        const primero = envios === 0;
        const factor = primero ? 1 : 1 / 2;
        buenas.forEach((k) => {
          const t = tarjetasCfg[k];
          t.fija = true;
          t.chip = primero ? "bien" : "medio";
        });
        logradas += buenas.length;
        acumuladoExacto += buenas.length * valorTarjeta * factor;
        malas.forEach((k) => { tarjetasCfg[k].chip = "mal"; });

        // Todas correctas → el juego termina aquí
        if (tarjetasCfg.every((t) => t.fija)) {
          const total = redondear2(acumuladoExacto);
          terminar(
            total,
            primero ? "Resuelto" : "Resuelto (2.º intento)",
            "bien",
            primero
              ? "¡Excelente! Todas las tarjetas están en su casilla."
              : "¡Excelente en tu segundo intento! Todo quedó correcto.",
            "ok",
            "Respondida",
            false
          );
          return;
        }

        if (!primero) {
          // 2.º intento: se acaba el juego (las falladas muestran la solución)
          const total = redondear2(acumuladoExacto);
          const fin = () => {
            if (total > 0) {
              terminar(total, "Terminado", "aviso", `Clasificaste bien ${logradas} de ${N} tarjetas. Las demás muestran la solución.`, "aviso", "Respondida", true);
            } else {
              terminar(0, "Intentos agotados", "mal", "Ninguna tarjeta quedó en su casilla. Se agotaron tus intentos: revisa la solución.", "mal", "Sin más intentos", true);
            }
          };
          if (malas.length) {
            verificando = true;
            actualizarPie();
            repintar();
            setTimeout(fin, 900);
          } else {
            fin();
          }
          return;
        }

        // 1.er intento con tarjetas incorrectas → segundo y último intento
        envios = 1;
        btnEvaluar.textContent = "Evaluar (último intento)";
        const finFlash = () => {
          verificando = false;
          repintar();
          actualizarPie();
          feedback(`Bien clasificadas: ${logradas} de ${N}. Tienes UN segundo intento solo para las marcadas en rojo (valdrán la mitad).`, "aviso");
        };
        if (malas.length) {
          verificando = true;
          actualizarPie();
          repintar();
          setTimeout(finFlash, 900);
        } else {
          repintar();
          actualizarPie();
          feedback(`Bien clasificadas: ${logradas} de ${N}. Tienes UN segundo intento solo para las marcadas (valdrán la mitad).`, "aviso");
        }
        return;
      }

      /* ESTUDIANTE · TAREA: 2 envíos neutros; el 2.º es el que cuenta */
      if (esTarea) {
        if (envios === 0) {
          envios = 1;
          actualizarPie(); // chip "Envío 2 de 2"
          btnEvaluar.textContent = "Enviar de nuevo";
          feedback("Envío realizado. Puedes corregir tus tarjetas antes del segundo envío.", "");
          return; // la respuesta final (2.º envío) decide el puntaje
        }
        const total = redondear2(buenas.length * valorTarjeta * (1 / 2));
        terminar(total, "Enviado", "", "Respuesta enviada. No hay más envíos.", "", "Enviado", false);
      }
    }

    if (btnEvaluar) {
      btnEvaluar.addEventListener("click", () => {
        procesarEvaluar().catch((e) => console.error("[clasificar]", e));
      });
    }

    // --- EXAMEN: el botón lo pone el archivo del examen ---
    enviarExamen = async function () {
      if (esDoc) {
        const { buenas } = evaluarTarjetas();
        const total = redondear2(buenas.length * valorTarjeta);
        registrarPuntoDocente(perfil, clase, qid, total);
        chip("Vista docente", "");
        feedback("Enviado. El puntaje está en el head de arriba; nada se guarda.", "");
        resolverUnaVez(total);
        return { puntos: total, maxPuntaje: puntaje, docente: true };
      }

      if (yaEnviada) {
        return ultimoResultado || { puntos: 0, maxPuntaje: puntaje, yaEnviado: true };
      }

      // UNA sola oportunidad: tarjeta en SU casilla → valor completo;
      // mal clasificada o sin clasificar → 0.
      const { buenas } = evaluarTarjetas();
      const total = redondear2(buenas.length * valorTarjeta);
      bloquearTodo();
      chip("Enviado", "");
      feedback("Envío del examen realizado.", "");
      await guardarPreguntaExamen(perfil, clase, qid, total); // guarda SIEMPRE (0 incluido)
      yaEnviada = true;
      ultimoResultado = { puntos: total, maxPuntaje: puntaje };
      resolverUnaVez(total);
      return { puntos: total, maxPuntaje: puntaje };
    };

    // --- Estado inicial por tipo y rol ---
    repintar();
    actualizarPie();
    if (esDoc) {
      feedback("Intentos libres, puntaje local arriba y nada se guarda.", "");
      prepararDocente(perfil, clase); // restaura el head local si ya hay puntaje
    } else if (esExamen) {
      feedback("Clasifica las tarjetas: el examen enviará todas tus respuestas al final.", "");
    } else if (esTarea) {
      feedback("Clasifica las tarjetas y envía. Tienes hasta dos envíos.", "");
    } else {
      feedback("Clasifica todas las tarjetas y pulsa Evaluar. Tienes dos intentos: el segundo solo corrige las marcadas.", "");
    }

    // --- Al montar (estudiante): ¿ya respondida o examen ya enviado? ---
    if (!esDoc) {
      obtenerNota(perfil, clase).then((nota) => {
        if (resuelto || bloqueada || envios > 0 ||
            tarjetasCfg.some((t) => t.ubicacion >= 0)) return;
        const guardado = nota.preguntas ? nota.preguntas[qid] : undefined;
        const hecha = guardado != null;

        if (esExamen && (nota.enviado || hecha)) {
          yaEnviada = true;
          ultimoResultado = { puntos: Number(guardado) || 0, maxPuntaje: puntaje, yaEnviado: true };
          bloquearTodo();
          chip("Examen enviado", "");
          feedback("Ya enviaste este examen.", "");
          resolverUnaVez(0);
          return;
        }
        if (hecha) {
          if (revelar) revelarCorrectas();
          bloquearTodo();
          if (btnEvaluar) btnEvaluar.textContent = "Respondida";
          chip("Respondida", "bien");
          feedback(esTarea ? "Ya enviaste esta tarea." : "Ya respondiste este bloque.", "ok");
          resolverUnaVez(0); // no vuelve a sumar
        }
      });
    }

    // REGISTRO GLOBAL DE ENVÍO (window.__mcoEnvioExamen): el botón
    // final del examen (utils/botonEnviar.js) o el «Enviar examen» de
    // siempre califican aquí las respuestas que el estudiante NO envió
    // una a una. Clave = qid: si el bloque se remonta, la última
    // instancia reemplaza a la vieja (nunca se califica dos veces).
    try {
      const reg = (window.__mcoEnvioExamen = window.__mcoEnvioExamen || { mapa: {} });
      if (reg.mapa && typeof reg.mapa === "object") {
        reg.mapa[qid] = () => Promise.resolve(enviarExamen()).catch(() => null);
      }
    } catch (e) { /* sin window: el flujo manual sigue igual */ }

    contenedor.append(caja);
    aplicarTamano(caja, config); // columnas / ancho (tras el montaje)

    // gancho de lectura (pruebas E2E)
    caja.__clasificar = {
      tarjetas: () => tarjetasCfg.map((t) => ({ id: t.id, ci: t.ci, ubicacion: t.ubicacion, chip: t.chip, fija: t.fija, texto: t.texto, esImg: t.esImg })),
      banco: () => tarjetasCfg.filter((t) => t.ubicacion < 0).length,
      colocadas: () => tarjetasCfg.filter((t) => t.ubicacion >= 0).length,
      total: () => N,
      categorias: () => categoriasCfg.map((c) => c.nombre),
      seleccion: () => seleccion,
      imagenes: () => tarjetasCfg.filter((t) => t.esImg).length,
      colores: () => ({ seccion: `rgb(${color.join(",")})` }),
      colocar,
      devolver,
      evaluar: () => (btnEvaluar ? btnEvaluar.click() : enviarExamen()),
    };
  }

  if (esExamen) promesa.enviar = () => enviarExamen();
  return promesa;
}
