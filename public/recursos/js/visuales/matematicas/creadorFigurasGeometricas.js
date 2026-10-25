// ============================================================
// ciencias/creadorFigurasGeometricas.js — Recurso visual:
// CREADOR DE FIGURAS GEOMÉTRICAS   ·   v2
// (recursos/js/visuales/ciencias/creadorFigurasGeometricas.js)
//
// v2 · LA FIGURA NUNCA SE CORTA: el viewBox se recalcula con el
//      bounding box REAL del contenido ya renderizado (getBBox) y
//      el bbox interno ya incluye ARCOS EXACTOS, cotas y etiquetas.
// v2 · ROTACIÓN ELEGIBLE: «vista: { giro 0–360°, elevacion 2–85° }»
//      global y «giro» / «elev» PROPIOS de cada figura.
// v2 · ACABADO PROFESIONAL: sombreado Lambert cara a cara, degradados
//      en los sólidos de revolución, sombra proyectada en el suelo,
//      cotas más finas y tipografía numérica tabular.
//
// Dibuja FIGURAS GEOMÉTRICAS A ESCALA con precisión de libro de
// texto: polígonos regulares e irregulares, círculos, elipses,
// prismas (rectos e inclinados), pirámides, poliedros regulares
// (Platónicos), cilindros, conos, conos truncados, esferas y
// COMPOSICIONES de dos o más figuras (vertical u horizontal).
//
// SVG puro generado por trigonometría + proyección isométrica.
// SIN librerías. Todo escala con el ancho del contenedor sin
// deformar proporciones (escala UNIFORME para todas las figuras).
//
// ─── PARÁMETROS (objeto «datos») ───
//   figuras        Lista de figuras. Cada una es un objeto:
//                    { tipo, …medidas…, cotas, borde, relleno,
//                      opacidad, grosor, giro, elev }
//                  giro  → rotación PROPIA en grados (planas: giran en
//                  su plano; sólidos: giran sobre el eje vertical).
//                  elev  → elevación PROPIA de la vista (2–85°, sólidos).
//                  (también se acepta UNA figura suelta sin lista).
//   composicion    "horizontal" (izquierda → derecha, defecto)
//                  o "vertical" (apiladas de arriba hacia abajo).
//   espacio        Separación entre figuras en px (defecto 34).
//   vista          { giro, elevacion } de la proyección isométrica en
//                  grados: giro 0–360 (defecto 45), elevacion 2–85
//                  (defecto 35.26). Cada figura puede sobreescribirlos.
//   borde / grosor Color y grosor del trazo (globales, cada figura
//                  puede sobreescribirlos).
//   relleno        Color de relleno global (defecto: paleta por
//                  figura). opacidad 0.05–1 (defecto 0.35) para ver
//                  la estructura interna de los sólidos.
//   unidad         Texto para las etiquetas, ej "cm" → «r = 5 cm».
//   tema           "clasico" (papel claro, defecto),
//                  "laboratorio" (tarjeta cuadriculada con rótulo)
//                  o "neon" (pizarra oscura con brillo).
//   ancho          Ancho máximo de la escena en px (defecto 960).
//   contenedor     HTMLElement opcional; sin él se centra en <body>.
//
// ─── TIPOS DE FIGURA Y SUS MEDIDAS ───
//   poligono        { regular: true, lados: 3–100, lado: 4 }
//                   { regular: false, lados: [4, 5, 6, 7] }  (se
//                   resuelve como polígono CÍCLICO: real trigonometría)
//   circulo         { radio: 5 }
//   elipse          { radioMayor: 7, radioMenor: 4 }
//   prisma          { lados: 6, lado: 3, altura: 8, inclinacion: 0 }
//                   (inclinación en grados; 0 = prisma recto)
//   piramide        { lados: 4, lado: 4, altura: 7 }
//   poliedroRegular { caras: 4|6|8|12|20, lado: 3 }  (Platónicos)
//   cilindro        { radio: 4, altura: 10 }
//   cono            { radio: 4, altura: 9, generatriz: 0 }  (g opcional:
//                   si no cuadra se usa la geométrica √(r²+h²))
//   conoTruncado    { radioBase: 6, radioSuperior: 3, altura: 8,
//                     generatriz: 0 }
//   esfera          { radio: 5 }
//
// ─── COTAS (arreglo con las medidas visibles) ───
//   Cada figura lleva «cotas»: la lista de dimensiones dibujadas
//   como líneas de cota con flechas y su etiqueta alineada:
//     poligono     "lado" · "lados_individuales" · "apotema" ·
//                  "perimetro" · "area"
//     circulo      "radio" · "diametro" · "perimetro" · "area"
//     elipse       "radioMayor" · "radioMenor" · "largo" · "ancho" · "area"
//     prisma       "lado" · "altura" · "apotemaBase" · "inclinacion" ·
//                  "areaLateral" · "areaTotal" · "volumen"
//     piramide     "lado" · "altura" · "apotemaBase" · "apotemaLateral" ·
//                  "areaLateral" · "areaTotal" · "volumen"
//     poliedro     "lado" · "areaTotal" · "volumen"  (+ ficha F·V·A)
//     cilindro     "radio" · "diametro" · "altura" · áreas · "volumen"
//     cono         "radio" · "diametro" · "altura" · "generatriz" · …
//     conoTruncado "radioBase" · "radioSuperior" · "diametroBase" ·
//                  "diametroSuperior" · "altura" · "generatriz" · …
//     esfera       "radio" · "diametro" · "areaTotal" · "volumen"
//   Si se omite «cotas» se muestran las principales de cada tipo.
//
// ─── GEOMETRÍA ───
//   · Polígonos regulares: circunradio R = L/(2·sen(π/n)) y apotema
//     a = L/(2·tan(π/n)); vértices con lado inferior horizontal.
//   · Polígonos irregulares: polígono CÍCLICO único — se busca por
//     bisección el circunradio R tal que Σ 2·asen(Lᵢ/2R) = 360°.
//   · Sólidos: proyección isométrica ortográfica (giro 0–360° +
//     elevación 2–85°) con algoritmo del PINTOR (caras de lejos a
//     cerca), normales reales por producto cruz para distinguir
//     arista VISIBLE de OCULTA (discontinua), y siluetas de
//     revolución con elipses exactas (rx = r, ry = r·sen ε).
//   · ACABADO: cada cara se sombrea con LAMBERT (brillo según su
//     normal frente a la luz), los sólidos de revolución llevan
//     DEGRADADOS lineales/radiales y sombra proyectada en el suelo;
//     el viewBox final se AJUSTA al bounding box real del SVG ya
//     renderizado (getBBox) → la figura JAMÁS sale cortada.
//   · Platónicos: coordenadas canónicas (φ = número áureo) con las
//     caras reconstruidas por los centros faciales; arista = «lado».
//
// ─── ERRORES ───
//   Si falta una medida, el tipo es desconocido, las caras no son
//   platónicas o los lados no cierran un polígono, la MISMA tarjeta
//   muestra un aviso claro con la pista (nunca pantalla vacía).
//
// ─── DEVUELVE ───
//   El elemento .cfg-tarjeta (data-tema + aria-label), insertado en
//   el contenedor pedido o centrado en el <body>. Trae un EDITOR
//   plegable para modificar todo en vivo (tipo, medidas, cotas,
//   colores, vista y composición) y ver el código resultante.
//
// USO DESDE UNA CLASE (contenido):
//   import { generarFigurasGeometricas } from
//     "../../../recursos/js/visuales/ciencias/creadorFigurasGeometricas.js";
//
//   generarFigurasGeometricas({
//     figuras: [
//       { tipo: "cilindro", radio: 4, altura: 10, cotas: ["radio","altura"] },
//       { tipo: "cono", radio: 4, altura: 9, cotas: ["radio","generatriz"] },
//     ],
//     composicion: "horizontal",
//     tema: "laboratorio",
//   });
// ============================================================

/* ---------------- CSS implícito (inyectado UNA sola vez) ---------------- */

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "visuales-figuras-estilos";
  estilo.textContent = `
    /* Envoltura para mostrar la escena CENTRADA en el <body> */
    .cfg-caja {
      display: flex; align-items: center; justify-content: center;
      width: 100%; min-height: 100vh; min-height: 100svh;
      padding: 26px 14px; box-sizing: border-box;
    }
    .cfg-escena {
      container-type: inline-size;
      width: var(--cfg-ancho, 960px);
      max-width: 100%; margin: 0;
    }
    .cfg-tarjeta {
      box-sizing: border-box; margin: 0; position: relative;
      border-radius: 18px;
      padding: clamp(16px, 3cqw, 40px) clamp(12px, 2.4cqw, 30px);
      -webkit-font-smoothing: antialiased;
    }
    /* ── TEMA CLÁSICO: papel claro, serif de libro de texto ── */
    .cfg-tarjeta[data-tema="clasico"] {
      background: linear-gradient(180deg, #fffefb 0%, #f9f5ec 100%);
      border: 1px solid #e4ddcd;
      box-shadow: 0 14px 38px rgba(31, 41, 55, .10);
      color: #232f3e;
      font-family: Cambria, "Palatino Linotype", Georgia, "Times New Roman", serif;
      --cfg-tinta: #26313d;
      --cfg-cota: #5a6a7d;
      --cfg-suave: #8b94a3;
      --cfg-linea: #d9d2c0;
      --cfg-panelbg: rgba(31, 41, 55, .045);
      --cfg-campo: #fffdf7;
      --cfg-bordecampo: #cfc7b2;
      --cfg-acento: #1a56db;
      --cfg-halo: #fdfaf2;
    }
    /* ── TEMA LABORATORIO: tarjeta cuadriculada con rótulo ── */
    .cfg-tarjeta[data-tema="laboratorio"] {
      background-color: #fdfeff;
      background-image:
        linear-gradient(rgba(13, 110, 253, .05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(13, 110, 253, .05) 1px, transparent 1px);
      background-size: 26px 26px;
      border: 1.5px solid #d3dfec; border-top: 5px solid #0d6efd;
      box-shadow: 0 16px 40px rgba(13, 60, 120, .13);
      color: #17324d;
      font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --cfg-tinta: #17324d;
      --cfg-cota: #47617d;
      --cfg-suave: #77869b;
      --cfg-linea: #c9d8ea;
      --cfg-panelbg: rgba(13, 110, 253, .05);
      --cfg-campo: #ffffff;
      --cfg-bordecampo: #b9cde4;
      --cfg-acento: #0d6efd;
      --cfg-halo: #fdfeff;
    }
    /* ── TEMA NEÓN: pizarra oscura con brillo ── */
    .cfg-tarjeta[data-tema="neon"] {
      background: radial-gradient(130% 150% at 50% -10%, #132244 0%, #0a1024 52%, #060a18 100%);
      border: 1px solid rgba(56, 189, 248, .38);
      box-shadow: inset 0 0 0 1px rgba(56, 189, 248, .08),
                  0 0 46px rgba(34, 211, 238, .15), 0 18px 44px rgba(0, 0, 0, .5);
      color: #e8f7ff;
      font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --cfg-tinta: #eafaff;
      --cfg-cota: #7dd3fc;
      --cfg-suave: #7dd3fc;
      --cfg-linea: rgba(125, 211, 252, .35);
      --cfg-panelbg: rgba(56, 189, 248, .08);
      --cfg-campo: rgba(8, 18, 38, .75);
      --cfg-bordecampo: rgba(125, 211, 252, .4);
      --cfg-acento: #38bdf8;
      --cfg-halo: #0a1024;
    }
    .cfg-rotulo {
      display: flex; align-items: center; gap: .55em;
      font-size: clamp(11px, 1.6cqw, 15px);
      font-weight: 700; letter-spacing: .22em; text-transform: uppercase;
      margin: 0 0 clamp(8px, 1.8cqw, 16px);
    }
    .cfg-rotulo svg { width: 1.25em; height: 1.25em; flex: none; }
    .cfg-tarjeta[data-tema="laboratorio"] .cfg-rotulo { color: #0d6efd; }
    .cfg-tarjeta[data-tema="neon"] .cfg-rotulo { color: #38bdf8; }
    .cfg-resumen {
      font-size: clamp(11.5px, 1.5cqw, 14px);
      opacity: .78; margin: 0 0 clamp(8px, 1.6cqw, 14px);
      letter-spacing: .02em; line-height: 1.45;
    }
    .cfg-lienzo { width: 100%; }
    .cfg-svg { display: block; width: 100%; height: auto; shape-rendering: geometricPrecision; }
    .cfg-svg text { font-family: inherit; font-variant-numeric: tabular-nums; }
    .cfg-cota path, .cfg-cota line { stroke: var(--cfg-cota); fill: none; stroke-width: 1.15; }
    .cfg-cota .cfg-ext { stroke-width: .85; opacity: .9; }
    .cfg-cota polygon { fill: var(--cfg-cota); stroke: none; }
    .cfg-cota circle { fill: var(--cfg-cota); stroke: none; }
    .cfg-sombra { stroke: none; }
    .cfg-cota text {
      fill: var(--cfg-cota); font-size: 12px; font-weight: 700; letter-spacing: .015em;
      paint-order: stroke; stroke: var(--cfg-halo, transparent); stroke-width: 2.8px;
    }
    .cfg-nota rect { fill: var(--cfg-panelbg); stroke: var(--cfg-linea); stroke-width: 1; }
    .cfg-nota text { fill: var(--cfg-tinta); font-size: 11.5px; font-weight: 600; }
    .cfg-tarjeta[data-tema="neon"] .cfg-lineas {
      filter: drop-shadow(0 0 3.5px rgba(103, 232, 249, .55));
    }
    /* ── Editor plegable ── */
    .cfg-editor {
      margin-top: clamp(10px, 1.8cqw, 16px);
      border: 1px solid var(--cfg-linea); border-radius: 13px;
      background: var(--cfg-panelbg);
    }
    .cfg-editor > summary {
      cursor: pointer; padding: 10px 14px; font-weight: 700;
      font-size: 13px; letter-spacing: .07em; user-select: none;
      list-style-position: inside;
    }
    .cfg-panel { padding: 2px 14px 14px; display: grid; gap: 10px; }
    .cfg-fichas { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .cfg-ficha {
      border: 1px solid var(--cfg-bordecampo); border-radius: 999px;
      background: var(--cfg-campo); color: inherit;
      padding: 4px 12px; font: 600 12px/1.2 inherit; font-family: inherit;
      cursor: pointer;
    }
    .cfg-ficha.activa { background: var(--cfg-acento); color: #fff; border-color: transparent; }
    .cfg-mini {
      border: 1px solid var(--cfg-bordecampo); border-radius: 9px;
      background: var(--cfg-campo); color: inherit;
      width: 28px; height: 28px; font: 700 15px/1 inherit; font-family: inherit;
      cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    }
    .cfg-ficha:hover, .cfg-mini:hover { border-color: var(--cfg-acento); }
    .cfg-sub {
      font-size: 11px; font-weight: 800; letter-spacing: .16em;
      text-transform: uppercase; opacity: .75; margin-top: 2px;
    }
    .cfg-grid {
      display: grid; gap: 8px 12px;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }
    .cfg-campo { display: flex; flex-direction: column; gap: 3px; font-size: 12px; }
    .cfg-campo > span { opacity: .8; }
    .cfg-campo input, .cfg-campo select {
      background: var(--cfg-campo); color: inherit;
      border: 1px solid var(--cfg-bordecampo); border-radius: 8px;
      padding: 6px 8px; font: 500 13px inherit; font-family: inherit;
      width: 100%; box-sizing: border-box;
    }
    .cfg-campo input[type="color"] { padding: 2px; height: 31px; }
    .cfg-campo input[type="range"] { padding: 0; accent-color: var(--cfg-acento); }
    .cfg-checos { display: flex; flex-wrap: wrap; gap: 5px 14px; font-size: 12.5px; }
    .cfg-checos label { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; }
    .cfg-checos input { accent-color: var(--cfg-acento); }
    .cfg-codigowrap { border-top: 1px dashed var(--cfg-linea); padding-top: 8px; }
    .cfg-codigowrap summary { cursor: pointer; font-size: 12px; font-weight: 700; opacity: .8; }
    .cfg-codigo {
      margin: 8px 0 0; padding: 10px; border-radius: 8px;
      background: var(--cfg-panelbg); border: 1px solid var(--cfg-linea);
      font: 11.5px/1.5 ui-monospace, "Cascadia Mono", Consolas, monospace;
      white-space: pre-wrap; word-break: break-word;
      max-height: 210px; overflow: auto;
    }
    /* ── Aviso claro cuando faltan datos o algo no cierra ── */
    .cfg-error-cuerpo {
      display: flex; flex-direction: column; align-items: center; gap: .55em;
      text-align: center; padding: clamp(10px, 2.4cqw, 26px) 0;
      font-size: clamp(14px, 2.2cqw, 22px);
    }
    .cfg-error-icono {
      width: 1.9em; height: 1.9em; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.05em;
      background: #fdecec; color: #c02626; border: 2px solid #ef9a9a;
    }
    .cfg-error-titulo { font-weight: 700; letter-spacing: .04em; }
    .cfg-error-msj { font-size: .76em; line-height: 1.55; max-width: 36em; }
    .cfg-tarjeta[data-tema="neon"] .cfg-error-icono {
      background: rgba(244, 63, 94, .16); color: #fda4af;
      border-color: rgba(244, 63, 94, .55);
      box-shadow: 0 0 18px rgba(244, 63, 94, .35);
    }
  `;
  document.head.append(estilo);
}

/* ---------------- utilidades ---------------- */

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function numeroSeguro(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function numeroBonito(n) {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

/* Medida obligatoria: si falta o no es válida, avisa con nombre claro. */
function medida(v, nombre, ejemplo) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw { msj: "La medida <b>«" + esc(nombre) + "»</b> falta o no es un número mayor que 0. " + (ejemplo || "") };
  }
  return n;
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const K = 100; /* mundo → px de diseño (escala uniforme, nunca deforma) */

function normalizaTema(t) {
  const s = String(t ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/^(lab|laboratorio|cuadricul|tarjeta)/.test(s)) return "laboratorio";
  if (/^(neon|dark|oscuro|noche)/.test(s)) return "neon";
  return "clasico";
}

function normalizaTipo(t) {
  const s = String(t ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/^(poligono|polygon)/.test(s)) return "poligono";
  if (/^(circulo|circle)/.test(s)) return "circulo";
  if (/^(elipse|ellipse)/.test(s)) return "elipse";
  if (/^prisma|^prism/.test(s)) return "prisma";
  if (/^piramide|^pyramid/.test(s)) return "piramide";
  if (/^(poliedro|platonic)/.test(s)) return "poliedroRegular";
  if (/(truncado|tronco)/.test(s)) return "conoTruncado";
  if (/^cono|^cone/.test(s)) return "cono";
  if (/^(cilindro|cylinder)/.test(s)) return "cilindro";
  if (/^(esfera|sphere|bola)/.test(s)) return "esfera";
  return null;
}

/* Tono derivado de un hex: k < 1 oscurece, k > 1 aclara (hacia blanco).
   Base del sombreado Lambert y de los degradados. */
function tono(hex, k) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const f = (c) => k <= 1 ? Math.round(c * k)
    : Math.round(c + (255 - c) * Math.min(1, k - 1));
  const r = f((v >> 16) & 255), g = f((v >> 8) & 255), b = f(v & 255);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/* Oscurece un color hex (para derivar el borde del relleno). */
function oscurecer(hex, f) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const r = Math.round(((v >> 16) & 255) * f);
  const g = Math.round(((v >> 8) & 255) * f);
  const b = Math.round((v & 255) * f);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const PALETA = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#ec4899"];

/* ── Degradados de la escena (defs SVG, ids únicos por repintado) ── */
let defsAct = [], mapaGrad = new Map(), idSombraAct = "", gradCont = 0;

function reiniciarDefs() {
  defsAct = [];
  mapaGrad = new Map();
  idSombraAct = "cfg-sombra-" + (++gradCont);
  defsAct.push('<radialGradient id="' + idSombraAct + '" cx="0.5" cy="0.5" r="0.5">' +
    '<stop offset="0" stop-color="#0d1b2e" stop-opacity="0.2"/>' +
    '<stop offset="0.68" stop-color="#0d1b2e" stop-opacity="0.1"/>' +
    '<stop offset="1" stop-color="#0d1b2e" stop-opacity="0"/></radialGradient>');
}

function gradLineal(col) {
  const clave = "L" + col;
  if (mapaGrad.has(clave)) return mapaGrad.get(clave);
  const id = "cfg-g" + (++gradCont);
  defsAct.push('<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="' + tono(col, 0.6) + '"/>' +
    '<stop offset="0.3" stop-color="' + tono(col, 1.18) + '"/>' +
    '<stop offset="0.62" stop-color="' + col + '"/>' +
    '<stop offset="1" stop-color="' + tono(col, 0.52) + '"/></linearGradient>');
  mapaGrad.set(clave, "url(#" + id + ")");
  return mapaGrad.get(clave);
}

function gradRadial(col) {
  const clave = "R" + col;
  if (mapaGrad.has(clave)) return mapaGrad.get(clave);
  const id = "cfg-g" + (++gradCont);
  defsAct.push('<radialGradient id="' + id + '" cx="0.35" cy="0.3" r="0.78">' +
    '<stop offset="0" stop-color="' + tono(col, 1.34) + '"/>' +
    '<stop offset="0.55" stop-color="' + col + '"/>' +
    '<stop offset="1" stop-color="' + tono(col, 0.46) + '"/></radialGradient>');
  mapaGrad.set(clave, "url(#" + id + ")");
  return mapaGrad.get(clave);
}

/* Sombra suave proyectada en el suelo (elipse radial difusa). */
function sombraDe(cx, cy, rx) {
  return { k: "sombra", cx, cy, rx, ry: Math.max(5, rx * 0.14) };
}

function sombraPoliedro(P, idxs) {
  const pts = idxs ? idxs.map((i) => P[i]) : P;
  let x0 = Infinity, x1 = -Infinity, yMax = -Infinity;
  pts.forEach((q) => { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); yMax = Math.max(yMax, q.y); });
  const rx = Math.max(8, (x1 - x0) / 2 * 1.06);
  return sombraDe((x0 + x1) / 2, yMax + 3, rx);
}

/* ---------------- catálogos de cotas ---------------- */

const SIMBOLO_COTA = {
  lado: "L", lados_individuales: "L", apotema: "a", apotemaBase: "a",
  apotemaLateral: "a_l", perimetro: "P", area: "A", areaLateral: "A lat",
  areaTotal: "A tot", volumen: "V", radio: "r", diametro: "d",
  radioMayor: "a", radioMenor: "b", largo: "largo", ancho: "ancho",
  altura: "h", generatriz: "g", radioBase: "R", radioSuperior: "r",
  diametroBase: "D", diametroSuperior: "d", inclinacion: "β",
};

function catalogoCotas(fig) {
  switch (fig.tipo) {
    case "poligono":
      return fig.regular === false
        ? ["lados_individuales", "perimetro", "area"]
        : ["lado", "apotema", "perimetro", "area"];
    case "circulo": return ["radio", "diametro", "perimetro", "area"];
    case "elipse": return ["radioMayor", "radioMenor", "largo", "ancho", "area"];
    case "prisma": return ["lado", "altura", "apotemaBase", "inclinacion", "areaLateral", "areaTotal", "volumen"];
    case "piramide": return ["lado", "altura", "apotemaBase", "apotemaLateral", "areaLateral", "areaTotal", "volumen"];
    case "poliedroRegular": return ["lado", "areaTotal", "volumen"];
    case "cilindro": return ["radio", "diametro", "altura", "areaLateral", "areaTotal", "volumen"];
    case "cono": return ["radio", "diametro", "altura", "generatriz", "areaLateral", "areaTotal", "volumen"];
    case "esfera": return ["radio", "diametro", "areaTotal", "volumen"];
    case "conoTruncado": return ["radioBase", "radioSuperior", "diametroBase", "diametroSuperior", "altura", "generatriz", "areaLateral", "areaTotal", "volumen"];
  }
  return [];
}

function cotasDefecto(fig) {
  switch (fig.tipo) {
    case "poligono": return fig.regular === false ? ["lados_individuales"] : ["lado"];
    case "circulo": return ["radio"];
    case "elipse": return ["radioMayor", "radioMenor"];
    case "prisma": return ["lado", "altura"];
    case "piramide": return ["lado", "altura"];
    case "poliedroRegular": return ["lado"];
    case "cilindro": return ["radio", "altura"];
    case "cono": return ["radio", "altura", "generatriz"];
    case "esfera": return ["radio"];
    case "conoTruncado": return ["radioBase", "radioSuperior", "altura", "generatriz"];
  }
  return [];
}

function cotasDe(fig) {
  const cat = catalogoCotas(fig);
  if (!Array.isArray(fig.cotas)) return cat.filter((c) => cotasDefecto(fig).includes(c));
  const malas = fig.cotas.filter((c) => !cat.includes(c));
  if (malas.length) {
    throw { msj: "La cota <b>«" + esc(malas[0]) + "»</b> no existe para el " +
      nombreTipo(fig.tipo) + ". Válidas: " + cat.map((c) => "«" + c + "»").join(", ") + "." };
  }
  return fig.cotas.slice();
}

function nombreTipo(t) {
  const N = { poligono: "polígono", circulo: "círculo", elipse: "elipse", prisma: "prisma",
    piramide: "pirámide", poliedroRegular: "poliedro regular", cilindro: "cilindro",
    cono: "cono", conoTruncado: "cono truncado", esfera: "esfera" };
  return N[t] || t;
}

const NOMBRE_N = { 3: "triangular", 4: "cuadrangular", 5: "pentagonal", 6: "hexagonal",
  7: "heptagonal", 8: "octagonal", 9: "eneagonal", 10: "decagonal", 11: "endecagonal",
  12: "dodecagonal" };
function nombreBase(n) { return NOMBRE_N[n] || (n + "-agonal"); }

/* Unidad actual de las etiquetas (se fija en cada repintado). */
let unidadActual = "";

/* ════════════════════════════════════════════════════════════════════
   GEOMETRÍA: proyección isométrica, polígonos, sólidos platónicos
   ════════════════════════════════════════════════════════════════════ */

/* Proyección isométrica ORTOGRÁFICA de un punto del mundo [x,y,z]
   (x derecha, y hacia el espectador, z arriba) a px de diseño.
   giro: rotación alrededor del eje vertical; elevación: inclinación
   de la mirada. Devuelve además la PROFUNDIDAD d (mayor = más lejos)
   para ordenar las caras (algoritmo del pintor). */
function proyectar(p, vista) {
  const g = vista.giro * RAD, e = vista.elev * RAD;
  const cg = Math.cos(g), sg = Math.sin(g);
  const x1 = p[0] * cg - p[1] * sg;
  const y1 = p[0] * sg + p[1] * cg;
  const se = Math.sin(e), ce = Math.cos(e);
  return { x: x1, y: y1 * se - p[2] * ce, d: p[2] * se - y1 * ce };
}

/* Dirección mundo → cámara (para decidir qué cara mira al frente). */
function camDir(vista) {
  const g = vista.giro * RAD, e = vista.elev * RAD;
  return [Math.sin(e) * Math.sin(g), Math.sin(e) * Math.cos(g), Math.cos(e)];
}

/* Dirección de la LUZ (arriba-izquierda-frente, anclada a la cámara):
   cada cara se sombrea según su normal (difuso de Lambert). */
function luzDe(vista) {
  const c = camDir(vista);
  return norm3([c[0] * 0.3 - 0.55, c[1] * 0.3 - 0.42, c[2] * 0.35 + 0.95]);
}

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function cross3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm3(v) {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}

/* Polígono regular EN EL PLANO de pantalla (y hacia abajo) con el
   lado inferior horizontal. Vértices en ángulos 90° − 180/n + i·360/n. */
function poligonoRegular2D(n, L) {
  const R = L / (2 * Math.sin(Math.PI / n));
  const ap = L / (2 * Math.tan(Math.PI / n));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const f = (90 - 180 / n + i * 360 / n) * RAD;
    pts.push([R * Math.cos(f) * K, R * Math.sin(f) * K]);
  }
  return { R: R * K, ap: ap * K, pts, ladoMundo: L };
}

/* Base poligonal regular en el plano z=0 del mundo (para sólidos),
   con un lado mirando al frente (ángulo central 90° = +y). */
function basePoligonal(n, L) {
  const R = L / (2 * Math.sin(Math.PI / n));
  const ap = L / (2 * Math.tan(Math.PI / n));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (90 - 180 / n + i * 360 / n) * RAD;
    pts.push([R * Math.cos(a), R * Math.sin(a), 0]);
  }
  return { R, ap, pts, areaBase: (n * L * L) / (4 * Math.tan(Math.PI / n)) };
}

/* Polígono IRREGULAR (lados dados): el polígono CÍCLICO único.
   Se busca por bisección el circunradio R que cumple
   Σ 2·asen(Lᵢ / 2R) = 360°. Devuelve null si no cierra. */
function poligonoCiclico(medidas) {
  const L = medidas.map(Number);
  if (L.some((l) => !Number.isFinite(l) || l <= 0)) return { error: "Todas las medidas de los lados deben ser números mayores que 0, separadas por coma: «4, 5, 6, 7»." };
  if (L.length < 3) return { error: "Un polígono necesita AL MENOS 3 lados: «lados: [4, 5, 6]»." };
  const suma = L.reduce((a, b) => a + b, 0);
  const maxL = Math.max(...L);
  if (!(maxL < suma - maxL)) {
    return { error: "Esas medidas <b>no cierran un polígono</b>: cada lado debe ser menor que la suma de los demás («" +
      L.map(numeroBonito).join(", ") + "» no cierra)." };
  }
  const f = (R) => L.reduce((s, l) => s + 2 * Math.asin(l / (2 * R)), 0) - 2 * Math.PI;
  let lo = maxL / 2, hi = Math.max(maxL, 1);
  while (f(hi) > 0) hi *= 1.7;
  for (let i = 0; i < 90; i++) {
    const m = (lo + hi) / 2;
    if (f(m) > 0) lo = m; else hi = m;
  }
  const R = (lo + hi) / 2;
  let acc = 0;
  const pts = [];
  for (let i = 0; i < L.length; i++) {
    pts.push([R * Math.cos(acc), R * Math.sin(acc)]);
    acc += 2 * Math.asin(L[i] / (2 * R));
  }
  /* Girar para que el lado 0 quede abajo (ángulo central del lado 0 → 90°). */
  const rot = Math.PI / 2 - Math.asin(L[0] / (2 * R));
  const cr = Math.cos(rot), sr = Math.sin(rot);
  return {
    R, L,
    pts: pts.map((p) => [(p[0] * cr - p[1] * sr) * K, (p[0] * sr + p[1] * cr) * K]),
    area: areaShoelace(pts) * K * K,
  };
}

function areaShoelace(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}

/* ── SÓLIDOS PLATÓNICOS: vértices canónicos + caras por centros ──
   Las caras se reconstruyen tomando, para cada centro facial (dirección
   del sólido dual), los vértices más cercanos, ordenados por ángulo. */
function datosPlatonicos(caras) {
  const F = (1 + Math.sqrt(5)) / 2, IF = 1 / F;
  let V = [], centros = [], nLados = 0;
  const cubo = [];
  for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) cubo.push([sx, sy, sz]);

  if (caras === 4) {
    V = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    centros = V.map((v) => [-v[0], -v[1], -v[2]]); nLados = 3;
  } else if (caras === 6) {
    V = cubo;
    centros = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    nLados = 4;
  } else if (caras === 8) {
    V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    centros = cubo; nLados = 3;
  } else if (caras === 12 || caras === 20) {
    const icosa = [], dodeca = cubo.slice();
    for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
      icosa.push([0, s1, s2 * F], [s1, s2 * F, 0], [s2 * F, 0, s1]);
      dodeca.push([0, s1 * F, s2 * IF], [s1 * F, s2 * IF, 0], [s2 * IF, 0, s1 * F]);
    }
    if (caras === 20) { V = icosa; centros = dodeca; nLados = 3; }
    else { V = dodeca; centros = icosa; nLados = 5; }
  } else {
    return null;
  }

  /* Caras: para cada centro, los nLados vértices más cercanos (producto
     punto sobre vectores unitarios), ordenados por ángulo alrededor. */
  const carasIdx = centros.map((c) => {
    const cn = norm3(c);
    const cerca = V.map((v, i) => ({ i, p: dot3(norm3(v), cn) }))
      .sort((a, b) => b.p - a.p).slice(0, nLados).map((o) => o.i);
    const ref = Math.abs(cn[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u = norm3(cross3(cn, ref)), w = cross3(cn, u);
    const ang = (i) => Math.atan2(dot3(V[i], w), dot3(V[i], u));
    return cerca.sort((a, b) => ang(a) - ang(b));
  });

  /* Escala para que la ARISTA valga «lado». */
  let minD = Infinity;
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
    const d = Math.hypot(...sub3(V[i], V[j]));
    if (d < minD - 1e-9) minD = d;
  }
  const s = 1 / minD;
  return { V: V.map((v) => v.map((x) => x * s)), carasIdx };
}

const NOMBRE_PLATONICO = { 4: "Tetraedro", 6: "Hexaedro (cubo)", 8: "Octaedro", 12: "Dodecaedro", 20: "Icosaedro" };

/* ── Núcleo común de poliedros: caras → primitivas con pintor ──
   Recibe vértices del mundo (ya ×K) e índices de caras; proyecta,
   ordena de lejos a cerca, rellena con SOMBREADO LAMBERT (cada cara
   con su brillo según la normal frente a la luz) y opacidad, y traza
   las aristas: VISIBLES sólidas y OCULTAS discontinuas. */
function pintarPoliedro(V, carasIdx, vista, est) {
  const P = V.map((v) => proyectar(v, vista));
  const cam = camDir(vista);
  const luz = luzDe(vista);
  const info = carasIdx.map((idx) => {
    const a = V[idx[0]], b = V[idx[1]], c = V[idx[2]];
    let n = norm3(cross3(sub3(b, a), sub3(c, a)));
    const centro = idx.reduce((s, i) => [s[0] + V[i][0] / idx.length, s[1] + V[i][1] / idx.length, s[2] + V[i][2] / idx.length], [0, 0, 0]);
    if (dot3(n, centro) < 0) n = [-n[0], -n[1], -n[2]];
    return {
      frontal: dot3(n, cam) > 1e-9,
      brillo: clamp(0.5 + 0.62 * Math.max(0, dot3(n, luz)), 0.38, 1.22),
    };
  });

  const orden = carasIdx.map((idx, i) => ({
    idx, i,
    d: idx.reduce((s, k) => s + P[k].d, 0) / idx.length,
  })).sort((a, b) => b.d - a.d);

  const prims = orden.map((o) => ({
    k: "poli", pts: o.idx.map((k) => [P[k].x, P[k].y]),
    relleno: tono(est.relleno, info[o.i].brillo), opacidad: est.opacidad,
  }));

  const visibles = new Map();
  carasIdx.forEach((idx, ci) => {
    for (let t = 0; t < idx.length; t++) {
      const i = idx[t], j = idx[(t + 1) % idx.length];
      const key = i < j ? i + "-" + j : j + "-" + i;
      visibles.set(key, (visibles.get(key) || false) || info[ci].frontal);
    }
  });
  const edges = [...visibles.entries()].map(([key, vis]) => {
    const [i, j] = key.split("-").map(Number);
    return { i, j, vis };
  });
  const lineas = edges.map((e) => ({
    a: [P[e.i].x, P[e.i].y], b: [P[e.j].x, P[e.j].y],
    clase: e.vis ? "visible" : "oculta",
  }));
  return { prims, lineas, P, edges, mapaAristas: visibles };
}

/* ════════════════════════════════════════════════════════════════════
   COTAS: líneas de dimensión con flechas, extensión y etiqueta
   (todas en px FINALES de pantalla, tamaño constante)
   ════════════════════════════════════════════════════════════════════ */

function punt_svg(p) { return p[0].toFixed(2) + "," + p[1].toFixed(2); }

function flecha(p, dir, tam) {
  const dx = dir[0], dy = dir[1], m = Math.hypot(dx, dy) || 1;
  const ux = dx / m, uy = dy / m, nx = -uy, ny = ux, t = tam || 7.5;
  return '<polygon points="' + punt_svg([p[0], p[1]]) + " " +
    punt_svg([p[0] + ux * t * 0.85 + nx * t * 0.3, p[1] + uy * t * 0.85 + ny * t * 0.3]) + " " +
    punt_svg([p[0] + ux * t * 0.85 - nx * t * 0.3, p[1] + uy * t * 0.85 - ny * t * 0.3]) + '"/>';
}

function texto_svg(x, y, txt, angulo, ancla) {
  let main = String(txt), subTxt = "", resto = "";
  const iu = main.indexOf("_");
  if (iu > -1) {
    const despues = main.slice(iu + 1);
    const ie = despues.indexOf("=");
    if (ie > -1) {
      subTxt = despues.slice(0, ie).trim();
      resto = " = " + despues.slice(ie + 1).trim();
    } else {
      subTxt = despues.trim();
    }
    main = main.slice(0, iu);
  }
  let t = "<text" + (angulo ? ' transform="translate(' + x.toFixed(2) + " " + y.toFixed(2) + ") rotate(" + angulo.toFixed(1) + ')"' : ' transform="translate(' + x.toFixed(2) + " " + y.toFixed(2) + ')"') +
    ' text-anchor="' + (ancla || "middle") + '" dy="0.34em">' + esc(main);
  if (subTxt) {
    t += '<tspan dy="3" font-size="9px">' + esc(subTxt) + "</tspan>";
    if (resto) t += '<tspan dy="-3">' + esc(resto) + "</tspan>";
  }
  return t + "</text>";
}

/* Línea de cota clásica entre dos puntos (con extensiones). */
function cotaDim(c) {
  const off = c.off ?? 16;
  let dx = c.b[0] - c.a[0], dy = c.b[1] - c.a[1];
  const m = Math.hypot(dx, dy) || 1;
  dx /= m; dy /= m;
  let nx = -dy, ny = dx;
  if (c.ref) {
    const mx = (c.a[0] + c.b[0]) / 2 - c.ref[0], my = (c.a[1] + c.b[1]) / 2 - c.ref[1];
    if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
  } else if (c.lado === -1) { nx = -nx; ny = -ny; }
  const A = [c.a[0] + nx * off, c.a[1] + ny * off];
  const B = [c.b[0] + nx * off, c.b[1] + ny * off];
  let s = "";
  const p0 = c.p0 || c.a, p1 = c.p1 || c.b;
  s += '<path class="cfg-ext" d="M ' + punt_svg([p0[0] + nx * 3, p0[1] + ny * 3]) +
    " L " + punt_svg([p0[0] + nx * (off + 3.5), p0[1] + ny * (off + 3.5)]) + '"/>';
  s += '<path class="cfg-ext" d="M ' + punt_svg([p1[0] + nx * 3, p1[1] + ny * 3]) +
    " L " + punt_svg([p1[0] + nx * (off + 3.5), p1[1] + ny * (off + 3.5)]) + '"/>';
  s += '<line x1="' + A[0].toFixed(2) + '" y1="' + A[1].toFixed(2) + '" x2="' + B[0].toFixed(2) + '" y2="' + B[1].toFixed(2) + '"/>';
  s += flecha(A, [-dx, -dy]);
  s += flecha(B, [dx, dy]);
  let ang = Math.atan2(dy, dx) * DEG;
  if (ang > 90 || ang < -90) ang += 180;
  const mx = (A[0] + B[0]) / 2 + nx * 11.5, my = (A[1] + B[1]) / 2 + ny * 11.5;
  s += texto_svg(mx, my, c.texto, ang);
  return s;
}

/* Cota SOBRE una línea existente (alturas interiores): flechas en los
   extremos apuntando hacia afuera + etiqueta al costado. */
function cotaSobre(c) {
  let dx = c.b[0] - c.a[0], dy = c.b[1] - c.a[1];
  const m = Math.hypot(dx, dy) || 1;
  dx /= m; dy /= m;
  let nx = -dy, ny = dx;
  if (c.lado === -1) { nx = -nx; ny = -ny; }
  let s = '<line x1="' + c.a[0].toFixed(2) + '" y1="' + c.a[1].toFixed(2) +
    '" x2="' + c.b[0].toFixed(2) + '" y2="' + c.b[1].toFixed(2) + '" stroke-dasharray="4 3.4"/>';
  s += flecha(c.a, [-dx, -dy]);
  s += flecha(c.b, [dx, dy]);
  const mx = (c.a[0] + c.b[0]) / 2 + nx * 12, my = (c.a[1] + c.b[1]) / 2 + ny * 12;
  s += texto_svg(mx, my, c.texto, 0);
  return s;
}

/* Cota de RADIO: centro → borde con una sola flecha. */
function cotaRadio(c) {
  let dx = c.p[0] - c.c[0], dy = c.p[1] - c.c[1];
  const m = Math.hypot(dx, dy) || 1;
  dx /= m; dy /= m;
  let nx = -dy, ny = dx;
  if (ny > 0 || (Math.abs(ny) < 0.35 && nx > 0)) { nx = -nx; ny = -ny; }
  let s = '<line x1="' + c.c[0].toFixed(2) + '" y1="' + c.c[1].toFixed(2) +
    '" x2="' + c.p[0].toFixed(2) + '" y2="' + c.p[1].toFixed(2) + '"/>';
  s += '<circle cx="' + c.c[0].toFixed(2) + '" cy="' + c.c[1].toFixed(2) + '" r="2.1"/>';
  s += flecha(c.p, [dx, dy]);
  const mx = (c.c[0] + c.p[0]) / 2 + nx * 10.5, my = (c.c[1] + c.p[1]) / 2 + ny * 10.5;
  s += texto_svg(mx, my, c.texto, 0);
  return s;
}

/* Arco de ángulo entre dos direcciones (para la inclinación). */
function cotaAngulo(c) {
  const P1 = [c.v[0] + Math.cos(c.ang1) * c.r, c.v[1] + Math.sin(c.ang1) * c.r];
  const P2 = [c.v[0] + Math.cos(c.ang2) * c.r, c.v[1] + Math.sin(c.ang2) * c.r];
  let delta = c.ang2 - c.ang1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const sweep = delta > 0 ? 1 : 0;
  const medio = c.ang1 + delta / 2;
  let s = "";
  if (c.brazo1) {
    const E1 = [c.v[0] + Math.cos(c.ang1) * (c.r + 15), c.v[1] + Math.sin(c.ang1) * (c.r + 15)];
    s += '<line x1="' + c.v[0].toFixed(2) + '" y1="' + c.v[1].toFixed(2) + '" x2="' + E1[0].toFixed(2) + '" y2="' + E1[1].toFixed(2) + '" stroke-dasharray="4 3.4"/>';
  }
  if (c.brazo2) {
    const E2 = [c.v[0] + Math.cos(c.ang2) * (c.r + 15), c.v[1] + Math.sin(c.ang2) * (c.r + 15)];
    s += '<line x1="' + c.v[0].toFixed(2) + '" y1="' + c.v[1].toFixed(2) + '" x2="' + E2[0].toFixed(2) + '" y2="' + E2[1].toFixed(2) + '"/>';
  }
  s += '<path d="M ' + punt_svg(P1) + " A " + c.r + " " + c.r + " 0 0 " + sweep + " " + punt_svg(P2) + '"/>';
  const L = [c.v[0] + Math.cos(medio) * (c.r + 13), c.v[1] + Math.sin(medio) * (c.r + 13)];
  s += texto_svg(L[0], L[1], c.texto, 0, medio > 0 && medio < Math.PI ? "start" : "end");
  return s;
}

/* Marca de ángulo recto en v, entre dos direcciones unitarias. */
function marcaRecta(c) {
  const t = c.tam || 8.5;
  const A = [c.v[0] + c.u1[0] * t, c.v[1] + c.u1[1] * t];
  const B = [c.v[0] + c.u2[0] * t, c.v[1] + c.u2[1] * t];
  const C = [A[0] + c.u2[0] * t, A[1] + c.u2[1] * t];
  return '<path d="M ' + punt_svg(A) + " L " + punt_svg(C) + " L " + punt_svg(B) + '" stroke-width="1.1"/>';
}

/* Ficha de texto (perímetro, área, volumen, F·V·A…). */
function cotaNota(n) {
  const ancho = n.texto.length * 6.1 + 16;
  return '<g class="cfg-nota"><rect x="' + (n.x - ancho / 2).toFixed(1) + '" y="' + (n.y - 10).toFixed(1) +
    '" width="' + ancho.toFixed(1) + '" height="20" rx="9.5"/>' +
    texto_svg(n.x, n.y, n.texto, 0) + "</g>";
}

/* ════════════════════════════════════════════════════════════════════
   CONSTRUCTORES POR TIPO DE FIGURA
   Cada uno devuelve: { nombre, detalle, prims, lineas, cotas, notas,
   margenExtra } en px de diseño LOCALES (el mundo va multiplicado ×K).
   ════════════════════════════════════════════════════════════════════ */

function enteroEntre(v, min, max, nombre) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) {
    throw { msj: "«" + esc(nombre) + "» debe ser un entero entre " + min + " y " + max + "." };
  }
  return n;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function etiqueta(sim, valor) {
  return sim + " = " + numeroBonito(valor) + (unidadActual ? " " + unidadActual : "");
}
function conU(txt) { return txt + (unidadActual ? " " + unidadActual : ""); }
function conU2(txt) { return txt + (unidadActual ? " " + unidadActual + "\u00b2" : ""); }
function conU3(txt) { return txt + (unidadActual ? " " + unidadActual + "\u00b3" : ""); }

function centroide(pts) {
  const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
  return c;
}

/* Elige la arista inferior-frontal visible (para la cota «lado»). */
function aristaInferior(edges, P, minZ, maxZ) {
  const t = minZ + 0.4 * (maxZ - minZ);
  let mejor = null, mejorY = -Infinity, mejorB = null, mejorBY = -Infinity;
  for (const e of edges) {
    if (!e.vis) continue;
    const y = (P[e.i].y + P[e.j].y) / 2;
    if (y > mejorBY) { mejorBY = y; mejorB = e; }
    if (P[e.i].z <= t && P[e.j].z <= t && y > mejorY) { mejorY = y; mejor = e; }
  }
  return mejor || mejorB;
}

function pintadoDe(V, carasIdx, vista, est) {
  const pint = pintarPoliedro(V, carasIdx, vista, est);
  const zs = V.map((v) => v[2]);
  pint.minZ = Math.min(...zs); pint.maxZ = Math.max(...zs);
  return pint;
}

/* ─────────────────────────  POLÍGONO  ───────────────────────── */

function construirPoligono(fig, est) {
  const pedidas = cotasDe(fig);
  const prims = [], lineas = [], cotas = [], notas = [];
  let nombre, detalle, area, pts, ap = 0, apMundo = 0, L;

  if (fig.regular === false) {
    let medidas = fig.medidas;
    if (!Array.isArray(medidas)) medidas = String(medidas ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const cic = poligonoCiclico(medidas);
    if (cic.error) throw { msj: cic.error };
    pts = cic.pts; area = cic.area; L = cic.L;
    nombre = "Polígono irregular";
    detalle = L.length + " lados: " + L.map(numeroBonito).join(", ");
  } else {
    const n = enteroEntre(fig.lados ?? 6, 3, 100, "lados (3 a 100)");
    L = medida(fig.lado, "lado (medida del lado del polígono regular)",
      "Ej: { tipo: \"poligono\", regular: true, lados: 6, lado: 4 }.");
    const g = poligonoRegular2D(n, L);
    pts = g.pts; ap = g.ap;
    apMundo = L / (2 * Math.tan(Math.PI / n));
    area = (n * L * L) / (4 * Math.tan(Math.PI / n));
    nombre = "Polígono " + nombreBase(n);
    detalle = "L = " + numeroBonito(L);
  }
  const centro = centroide(pts);
  prims.push({ k: "poli", pts, relleno: est.relleno, opacidad: est.opacidad });
  for (let i = 0; i < pts.length; i++) {
    lineas.push({ a: pts[i], b: pts[(i + 1) % pts.length], clase: "visible" });
  }

  if (pedidas.includes("lado") && ap) {
    cotas.push({ tipo: "dim", a: pts[0], b: pts[1], ref: centro, texto: etiqueta("L", L) });
  }
  if (pedidas.includes("apotema") && ap) {
    cotas.push({ tipo: "radio", c: centro, p: [centro[0], centro[1] + ap], texto: etiqueta("a", apMundo) });
  }
  if (pedidas.includes("lados_individuales")) {
    L.forEach((m, i) => {
      cotas.push({ tipo: "dim", a: pts[i], b: pts[(i + 1) % pts.length], ref: centro, texto: "L_" + (i + 1) + " = " + numeroBonito(m) });
    });
  }
  if (pedidas.includes("perimetro")) notas.push(conU("P = " + numeroBonito(L.reduce ? L.reduce((a, b) => a + b, 0) : L * pts.length)));
  if (pedidas.includes("area")) notas.push(conU2("A = " + numeroBonito(area)));

  return { nombre, detalle, prims, lineas, cotas, notas, plano: true };
}

/* ─────────────────────────  CÍRCULO  ───────────────────────── */

function construirCirculo(fig, est) {
  const pedidas = cotasDe(fig);
  const r = medida(fig.radio, "radio", "Ej: { tipo: \"circulo\", radio: 5 }.");
  const R = r * K;
  const prims = [{ k: "circ", cx: 0, cy: 0, r: R, relleno: est.relleno, opacidad: est.opacidad }];
  const cotas = [], notas = [];
  if (pedidas.includes("radio")) {
    cotas.push({ tipo: "radio", c: [0, 0], p: [R * Math.cos(-24 * RAD), R * Math.sin(-24 * RAD)], texto: etiqueta("r", r) });
  }
  if (pedidas.includes("diametro")) {
    cotas.push({ tipo: "dim", a: [-R, 0], b: [R, 0], ref: [0, 7], texto: etiqueta("d", 2 * r) });
  }
  if (pedidas.includes("perimetro")) notas.push(conU("P = " + numeroBonito(2 * Math.PI * r)));
  if (pedidas.includes("area")) notas.push(conU2("A = " + numeroBonito(Math.PI * r * r)));
  return { nombre: "Círculo", detalle: "r = " + numeroBonito(r), prims, lineas: [], cotas, notas, plano: true };
}

/* ─────────────────────────  ELIPSE  ───────────────────────── */

function construirElipse(fig, est) {
  const pedidas = cotasDe(fig);
  const a = medida(fig.radioMayor, "radioMayor", "Ej: { tipo: \"elipse\", radioMayor: 7, radioMenor: 4 }.");
  const b = medida(fig.radioMenor, "radioMenor", "Ej: { tipo: \"elipse\", radioMayor: 7, radioMenor: 4 }.");
  const A = a * K, B = b * K;
  const prims = [{ k: "elipse", cx: 0, cy: 0, rx: A, ry: B, relleno: est.relleno, opacidad: est.opacidad }];
  const cotas = [], notas = [];
  if (pedidas.includes("radioMayor")) cotas.push({ tipo: "radio", c: [0, 0], p: [A, 0], texto: etiqueta("a", a) });
  if (pedidas.includes("radioMenor")) cotas.push({ tipo: "radio", c: [0, 0], p: [0, -B], texto: etiqueta("b", b) });
  if (pedidas.includes("largo")) cotas.push({ tipo: "dim", a: [-A, 0], b: [A, 0], ref: [0, 9], texto: etiqueta("largo", 2 * a) });
  if (pedidas.includes("ancho")) cotas.push({ tipo: "dim", a: [0, -B], b: [0, B], ref: [9, 0], texto: etiqueta("ancho", 2 * b) });
  if (pedidas.includes("area")) notas.push(conU2("A = " + numeroBonito(Math.PI * a * b)));
  return { nombre: "Elipse", detalle: "a = " + numeroBonito(a) + ", b = " + numeroBonito(b), prims, lineas: [], cotas, notas, plano: true };
}

/* ─────────────────────────  PRISMA  ───────────────────────── */

function construirPrisma(fig, vista, est) {
  const pedidas = cotasDe(fig);
  const n = enteroEntre(fig.lados ?? 6, 3, 100, "lados de la base");
  const L = medida(fig.lado, "lado de la base", "Ej: { tipo: \"prisma\", lados: 6, lado: 3, altura: 8 }.");
  const h = medida(fig.altura, "altura", "Ej: { tipo: \"prisma\", lados: 6, lado: 3, altura: 8 }.");
  const inc = clamp(numeroSeguro(fig.inclinacion, 0), -55, 55);
  const base = basePoligonal(n, L);
  const dx = h * Math.tan(inc * RAD);
  const B = base.pts.map((p) => [p[0] * K, p[1] * K, 0]);
  const T = base.pts.map((p) => [(p[0] + dx) * K, p[1] * K, h * K]);
  const V = B.concat(T);
  const carasIdx = [];
  for (let i = 0; i < n; i++) carasIdx.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
  carasIdx.push(Array.from({ length: n }, (_, i) => n + i));
  carasIdx.push(Array.from({ length: n }, (_, i) => i));

  const pint = pintadoDe(V, carasIdx, vista, est);
  const prims = [sombraPoliedro(pint.P, Array.from({ length: n }, (_, i) => i))].concat(pint.prims);
  const lineas = pint.lineas.slice(), cotas = [], notas = [];
  const centro = centroide(pint.P.map((p) => [p.x, p.y]));

  const edgeBase = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    edgeBase.push({ i, j, vis: aristaVisible(pint, i, j) });
  }
  if (pedidas.includes("lado")) {
    const e = aristaInferior(edgeBase, pint.P, pint.minZ, pint.maxZ);
    cotas.push({ tipo: "dim", a: [pint.P[e.i].x, pint.P[e.i].y], b: [pint.P[e.j].x, pint.P[e.j].y], ref: centro, texto: etiqueta("L", L) });
  }
  if (pedidas.includes("altura")) {
    const k = argMin(pint.P.slice(0, n), (p) => p.d);
    const arriba = proyectar([B[k][0], B[k][1], h * K], vista);
    cotas.push({
      tipo: "dim", a: [pint.P[k].x, pint.P[k].y], b: [arriba.x, arriba.y],
      p0: [pint.P[k].x, pint.P[k].y], p1: [arriba.x, arriba.y],
      ref: centro, texto: etiqueta("h", h),
    });
    if (Math.abs(inc) > 0.01) {
      lineas.push({ a: [pint.P[n + k].x, pint.P[n + k].y], b: [arriba.x, arriba.y], clase: "aux" });
    }
  }
  if (pedidas.includes("apotemaBase")) {
    const e = edgeBase.filter((x) => x.vis).sort((p, q) =>
      (pint.P[q.i].y + pint.P[q.j].y) - (pint.P[p.i].y + pint.P[p.j].y))[0];
    if (e) {
      const mid = [(B[e.i][0] + B[e.j][0]) / 2, (B[e.i][1] + B[e.j][1]) / 2, 0];
      const pm = proyectar(mid, vista);
      cotas.push({ tipo: "radio", c: [proyectar([0, 0, 0], vista).x, proyectar([0, 0, 0], vista).y], p: [pm.x, pm.y], texto: etiqueta("a", base.ap) });
    }
  }
  if (pedidas.includes("inclinacion")) {
    const k = argMin(pint.P.slice(0, n), (p) => p.d);
    const v = [pint.P[k].x, pint.P[k].y];
    const pv = proyectar([B[k][0], B[k][1], 0.6 * K], vista);
    const pt = [pint.P[n + k].x, pint.P[n + k].y];
    cotas.push({
      tipo: "angulo", v, r: 26, margenExtra: 24,
      ang1: Math.atan2(pv.y - v[1], pv.x - v[0]),
      ang2: Math.atan2(pt[1] - v[1], pt[0] - v[0]),
      brazo1: true, brazo2: false, texto: "β = " + numeroBonito(Math.abs(inc)) + "°",
    });
  }
  const al = h / Math.cos(inc * RAD);
  if (pedidas.includes("areaLateral")) notas.push(conU2("A lat = " + numeroBonito(n * L * al)));
  if (pedidas.includes("areaTotal")) notas.push(conU2("A tot = " + numeroBonito(n * L * al + 2 * base.areaBase)));
  if (pedidas.includes("volumen")) notas.push(conU3("V = " + numeroBonito(base.areaBase * h)));

  return {
    nombre: "Prisma " + nombreBase(n) + (Math.abs(inc) > 0.01 ? " inclinado" : ""),
    detalle: "L = " + numeroBonito(L) + ", h = " + numeroBonito(h) + (Math.abs(inc) > 0.01 ? ", β = " + numeroBonito(inc) + "°" : ""),
    prims, lineas, cotas, notas, margenExtra: pedidas.includes("inclinacion") ? 22 : 0,
  };
}

/* ─────────────────────────  PIRÁMIDE  ───────────────────────── */

function construirPiramide(fig, vista, est) {
  const pedidas = cotasDe(fig);
  const n = enteroEntre(fig.lados ?? 4, 3, 100, "lados de la base");
  const L = medida(fig.lado, "lado de la base", "Ej: { tipo: \"piramide\", lados: 4, lado: 4, altura: 7 }.");
  const h = medida(fig.altura, "altura", "Ej: { tipo: \"piramide\", lados: 4, lado: 4, altura: 7 }.");
  const base = basePoligonal(n, L);
  const B = base.pts.map((p) => [p[0] * K, p[1] * K, 0]);
  const V = B.concat([[0, 0, h * K]]);
  const apex = n;
  const carasIdx = [];
  for (let i = 0; i < n; i++) carasIdx.push([i, (i + 1) % n, apex]);
  carasIdx.push(Array.from({ length: n }, (_, i) => i));

  const pint = pintadoDe(V, carasIdx, vista, est);
  const prims = [sombraPoliedro(pint.P, Array.from({ length: n }, (_, i) => i))].concat(pint.prims);
  const lineas = pint.lineas.slice(), cotas = [], notas = [];
  const centro = centroide(pint.P.map((p) => [p.x, p.y]));
  const pc = proyectar([0, 0, 0], vista);

  const edgeBase = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    edgeBase.push({ i, j, vis: aristaVisible(pint, i, j) });
  }
  if (pedidas.includes("lado")) {
    const e = aristaInferior(edgeBase, pint.P, pint.minZ, pint.maxZ);
    cotas.push({ tipo: "dim", a: [pint.P[e.i].x, pint.P[e.i].y], b: [pint.P[e.j].x, pint.P[e.j].y], ref: centro, texto: etiqueta("L", L) });
  }
  if (pedidas.includes("altura")) {
    cotas.push({ tipo: "sobre", a: [pint.P[apex].x, pint.P[apex].y], b: [pc.x, pc.y], texto: etiqueta("h", h) });
    const u1 = norm2([pint.P[apex].x - pc.x, pint.P[apex].y - pc.y]);
    let u2 = [-u1[1], u1[0]];
    if (u2[0] < 0) u2 = [-u2[0], -u2[1]];
    cotas.push({ tipo: "recto", v: [pc.x, pc.y], u1, u2 });
  }
  if (pedidas.includes("apotemaBase") || pedidas.includes("apotemaLateral")) {
    const e = edgeBase.filter((x) => x.vis).sort((p, q) =>
      (pint.P[q.i].y + pint.P[q.j].y) - (pint.P[p.i].y + pint.P[p.j].y))[0];
    if (e) {
      const mid = [(B[e.i][0] + B[e.j][0]) / 2, (B[e.i][1] + B[e.j][1]) / 2, 0];
      const pm = proyectar(mid, vista);
      if (pedidas.includes("apotemaBase")) {
        cotas.push({ tipo: "radio", c: [pc.x, pc.y], p: [pm.x, pm.y], texto: etiqueta("a", base.ap) });
      }
      if (pedidas.includes("apotemaLateral")) {
        cotas.push({ tipo: "sobre", a: [pint.P[apex].x, pint.P[apex].y], b: [pm.x, pm.y], texto: etiqueta("a_l", Math.sqrt(h * h + base.ap * base.ap)), ref: centro });
      }
    }
  }
  const al = Math.sqrt(h * h + base.ap * base.ap);
  if (pedidas.includes("areaLateral")) notas.push(conU2("A lat = " + numeroBonito((n * L * al) / 2)));
  if (pedidas.includes("areaTotal")) notas.push(conU2("A tot = " + numeroBonito((n * L * al) / 2 + base.areaBase)));
  if (pedidas.includes("volumen")) notas.push(conU3("V = " + numeroBonito((base.areaBase * h) / 3)));

  return { nombre: "Pirámide " + nombreBase(n), detalle: "L = " + numeroBonito(L) + ", h = " + numeroBonito(h), prims, lineas, cotas, notas };
}

/* ───────────────────  POLIEDRO REGULAR (Platónico)  ─────────────────── */

const AREA_PLATONICO = {
  4: (L) => Math.sqrt(3) * L * L,
  6: (L) => 6 * L * L,
  8: (L) => 2 * Math.sqrt(3) * L * L,
  12: (L) => 3 * Math.sqrt(25 + 10 * Math.sqrt(5)) * L * L,
  20: (L) => 5 * Math.sqrt(3) * L * L,
};
const VOL_PLATONICO = {
  4: (L) => (L * L * L) / (6 * Math.sqrt(2)),
  6: (L) => L * L * L,
  8: (L) => (Math.sqrt(2) / 3) * L * L * L,
  12: (L) => ((15 + 7 * Math.sqrt(5)) / 4) * L * L * L,
  20: (L) => ((5 * (3 + Math.sqrt(5))) / 12) * L * L * L,
};

function construirPoliedroRegular(fig, vista, est) {
  const pedidas = cotasDe(fig);
  const c = Math.round(Number(fig.caras ?? 8));
  if (![4, 6, 8, 12, 20].includes(c)) {
    throw { msj: "Las caras de un poliedro regular solo pueden ser <b>4</b> (tetraedro), <b>6</b> (cubo), <b>8</b> (octaedro), <b>12</b> (dodecaedro) o <b>20</b> (icosaedro). Recibí: «" + esc(fig.caras ?? "") + "»." };
  }
  const L = medida(fig.lado, "lado (arista)", "Ej: { tipo: \"poliedroRegular\", caras: 8, lado: 3 }.");
  const d = datosPlatonicos(c);
  const V = d.V.map((v) => [v[0] * L * K, v[1] * L * K, v[2] * L * K]);
  const pint = pintadoDe(V, d.carasIdx, vista, est);
  const prims = [sombraPoliedro(pint.P)].concat(pint.prims);
  const lineas = pint.lineas.slice(), cotas = [], notas = [];
  const centro = centroide(pint.P.map((p) => [p.x, p.y]));

  if (pedidas.includes("lado")) {
    const edges = pint.edges.filter((e) => e.vis);
    const e = aristaInferior(edges, pint.P, pint.minZ, pint.maxZ);
    cotas.push({ tipo: "dim", a: [pint.P[e.i].x, pint.P[e.i].y], b: [pint.P[e.j].x, pint.P[e.j].y], ref: centro, texto: etiqueta("L", L) });
  }
  notas.push("F = " + c + " · V = " + d.V.length + " · A = " + pint.edges.length);
  if (pedidas.includes("areaTotal")) notas.push(conU2("A tot = " + numeroBonito(AREA_PLATONICO[c](L))));
  if (pedidas.includes("volumen")) notas.push(conU3("V = " + numeroBonito(VOL_PLATONICO[c](L))));

  return { nombre: NOMBRE_PLATONICO[c], detalle: "L = " + numeroBonito(L), prims, lineas, cotas, notas };
}

/* ─────────────────────────  CILINDRO  ───────────────────────── */

function construirCilindro(fig, vista, est) {
  const pedidas = cotasDe(fig);
  const r = medida(fig.radio, "radio", "Ej: { tipo: \"cilindro\", radio: 4, altura: 10 }.");
  const h = medida(fig.altura, "altura", "Ej: { tipo: \"cilindro\", radio: 4, altura: 10 }.");
  const e = vista.elev * RAD;
  const se = Math.sin(e), ce = Math.cos(e);
  const R = r * K, ry = R * se, yT = -h * K * ce;
  const prims = [
    sombraDe(0, ry + 3, R * 1.04),
    { k: "path", segs: [["M", -R, yT], ["A", R, ry, 0, 1, R, yT], ["L", R, 0], ["A", R, ry, 0, 1, -R, 0], ["Z"]], relleno: gradLineal(est.relleno), opacidad: est.opacidad },
    { k: "elipse", cx: 0, cy: yT, rx: R, ry, relleno: tono(est.relleno, 1.24), opacidad: Math.min(1, est.opacidad * 0.85 + 0.05) },
  ];
  const lineas = [
    { k: "pline", segs: [["M", -R, yT], ["A", R, ry, 0, 1, R, yT], ["A", R, ry, 0, 1, -R, yT]], clase: "visible" },
    { a: [-R, yT], b: [-R, 0], clase: "visible" },
    { a: [R, yT], b: [R, 0], clase: "visible" },
    { k: "pline", segs: [["M", -R, 0], ["A", R, ry, 0, 0, R, 0]], clase: "visible" },
    { k: "pline", segs: [["M", -R, 0], ["A", R, ry, 0, 1, R, 0]], clase: "oculta" },
  ];
  const cotas = [], notas = [];
  const yBase = 0;
  if (pedidas.includes("radio")) {
    cotas.push({ tipo: "radio", c: [0, yBase], p: [R * Math.cos(-22 * RAD), yBase + ry * Math.sin(-22 * RAD)], texto: etiqueta("r", r) });
  }
  if (pedidas.includes("diametro")) {
    cotas.push({ tipo: "dim", a: [-R, yBase], b: [R, yBase], ref: [0, 7], texto: etiqueta("d", 2 * r) });
  }
  if (pedidas.includes("altura")) {
    cotas.push({ tipo: "dim", a: [R, yBase], b: [R, yT], ref: [0, yT / 2], texto: etiqueta("h", h) });
  }
  if (pedidas.includes("areaLateral")) notas.push(conU2("A lat = " + numeroBonito(2 * Math.PI * r * h)));
  if (pedidas.includes("areaTotal")) notas.push(conU2("A tot = " + numeroBonito(2 * Math.PI * r * (h + r))));
  if (pedidas.includes("volumen")) notas.push(conU3("V = " + numeroBonito(Math.PI * r * r * h)));
  return { nombre: "Cilindro", detalle: "r = " + numeroBonito(r) + ", h = " + numeroBonito(h), prims, lineas, cotas, notas };
}

/* ─────────────────────────  CONO  ───────────────────────── */

function construirCono(fig, vista, est) {
  const pedidas = cotasDe(fig);
  const r = medida(fig.radio, "radio de la base", "Ej: { tipo: \"cono\", radio: 4, altura: 9 }.");
  const h = medida(fig.altura, "altura", "Ej: { tipo: \"cono\", radio: 4, altura: 9 }.");
  const geoG = Math.sqrt(r * r + h * h);
  const gDada = numeroSeguro(fig.generatriz, 0);
  const g = gDada >= geoG * 0.995 ? gDada : geoG;
  const e = vista.elev * RAD;
  const se = Math.sin(e), ce = Math.cos(e);
  const R = r * K, ry = R * se, yA = -h * K * ce;
  const prims = [
    sombraDe(0, ry + 3, R * 1.05),
    { k: "path", segs: [["M", 0, yA], ["L", R, 0], ["A", R, ry, 0, 1, -R, 0], ["Z"]], relleno: gradLineal(est.relleno), opacidad: est.opacidad },
  ];
  const lineas = [
    { a: [0, yA], b: [-R, 0], clase: "visible" },
    { a: [0, yA], b: [R, 0], clase: "visible" },
    { k: "pline", segs: [["M", -R, 0], ["A", R, ry, 0, 0, R, 0]], clase: "visible" },
    { k: "pline", segs: [["M", -R, 0], ["A", R, ry, 0, 1, R, 0]], clase: "oculta" },
  ];
  const cotas = [], notas = [];
  if (pedidas.includes("radio")) {
    cotas.push({ tipo: "radio", c: [0, 0], p: [R * Math.cos(-22 * RAD), ry * Math.sin(-22 * RAD)], texto: etiqueta("r", r) });
  }
  if (pedidas.includes("diametro")) {
    cotas.push({ tipo: "dim", a: [-R, 0], b: [R, 0], ref: [0, 7], texto: etiqueta("d", 2 * r) });
  }
  if (pedidas.includes("altura")) {
    cotas.push({ tipo: "sobre", a: [0, yA], b: [0, 0], texto: etiqueta("h", h) });
    cotas.push({ tipo: "recto", v: [0, 0], u1: [0, -1], u2: norm2([0.94, -0.34]) });
  }
  if (pedidas.includes("generatriz")) {
    cotas.push({ tipo: "dim", a: [0, yA], b: [R, 0], ref: [-6, yA / 2], texto: etiqueta("g", g) });
  }
  if (pedidas.includes("areaLateral")) notas.push(conU2("A lat = " + numeroBonito(Math.PI * r * g)));
  if (pedidas.includes("areaTotal")) notas.push(conU2("A tot = " + numeroBonito(Math.PI * r * (g + r))));
  if (pedidas.includes("volumen")) notas.push(conU3("V = " + numeroBonito((Math.PI * r * r * h) / 3)));
  return { nombre: "Cono", detalle: "r = " + numeroBonito(r) + ", h = " + numeroBonito(h) + ", g = " + numeroBonito(g), prims, lineas, cotas, notas };
}

/* ─────────────────────  CONO TRUNCADO  ───────────────────── */

function construirConoTruncado(fig, vista, est) {
  const pedidas = cotasDe(fig);
  const Rb = medida(fig.radioBase, "radioBase", "Ej: { tipo: \"conoTruncado\", radioBase: 6, radioSuperior: 3, altura: 8 }.");
  const rs = medida(fig.radioSuperior, "radioSuperior", "Ej: { tipo: \"conoTruncado\", radioBase: 6, radioSuperior: 3, altura: 8 }.");
  const h = medida(fig.altura, "altura", "Ej: { tipo: \"conoTruncado\", radioBase: 6, radioSuperior: 3, altura: 8 }.");
  const geoG = Math.sqrt(h * h + (Rb - rs) * (Rb - rs));
  const gDada = numeroSeguro(fig.generatriz, 0);
  const g = gDada >= geoG * 0.995 ? gDada : geoG;
  const e = vista.elev * RAD;
  const se = Math.sin(e), ce = Math.cos(e);
  const RB = Rb * K, Rs = rs * K, ryB = RB * se, rys = Rs * se, yT = -h * K * ce;
  const prims = [
    sombraDe(0, ryB + 3, RB * 1.05),
    { k: "path", segs: [["M", -Rs, yT], ["A", Rs, rys, 0, 1, Rs, yT], ["L", RB, 0], ["A", RB, ryB, 0, 1, -RB, 0], ["Z"]], relleno: gradLineal(est.relleno), opacidad: est.opacidad },
    { k: "elipse", cx: 0, cy: yT, rx: Rs, ry: rys, relleno: tono(est.relleno, 1.24), opacidad: Math.min(1, est.opacidad * 0.85 + 0.05) },
  ];
  const lineas = [
    { k: "pline", segs: [["M", -Rs, yT], ["A", Rs, rys, 0, 1, Rs, yT], ["A", Rs, rys, 0, 1, -Rs, yT]], clase: "visible" },
    { a: [-Rs, yT], b: [-RB, 0], clase: "visible" },
    { a: [Rs, yT], b: [RB, 0], clase: "visible" },
    { k: "pline", segs: [["M", -RB, 0], ["A", RB, ryB, 0, 0, RB, 0]], clase: "visible" },
    { k: "pline", segs: [["M", -RB, 0], ["A", RB, ryB, 0, 1, RB, 0]], clase: "oculta" },
  ];
  const cotas = [], notas = [];
  if (pedidas.includes("radioBase")) {
    cotas.push({ tipo: "radio", c: [0, 0], p: [RB * Math.cos(-22 * RAD), ryB * Math.sin(-22 * RAD)], texto: etiqueta("R", Rb) });
  }
  if (pedidas.includes("radioSuperior")) {
    cotas.push({ tipo: "radio", c: [0, yT], p: [Rs * Math.cos(-22 * RAD), yT + rys * Math.sin(-22 * RAD)], texto: etiqueta("r", rs) });
  }
  if (pedidas.includes("diametroBase")) {
    cotas.push({ tipo: "dim", a: [-RB, 0], b: [RB, 0], ref: [0, 7], texto: etiqueta("D", 2 * Rb) });
  }
  if (pedidas.includes("diametroSuperior")) {
    cotas.push({ tipo: "dim", a: [-Rs, yT], b: [Rs, yT], ref: [0, yT + 7], texto: etiqueta("d", 2 * rs) });
  }
  if (pedidas.includes("altura")) {
    cotas.push({ tipo: "dim", a: [RB, 0], b: [RB, yT], p0: [RB, 0], p1: [Rs, yT], ref: [0, yT / 2], texto: etiqueta("h", h) });
  }
  if (pedidas.includes("generatriz")) {
    cotas.push({ tipo: "dim", a: [Rs, yT], b: [RB, 0], ref: [0, yT / 2 - 6], off: 26, texto: etiqueta("g", g) });
  }
  if (pedidas.includes("areaLateral")) notas.push(conU2("A lat = " + numeroBonito(Math.PI * (Rb + rs) * g)));
  if (pedidas.includes("areaTotal")) notas.push(conU2("A tot = " + numeroBonito(Math.PI * (Rb + rs) * g + Math.PI * (Rb * Rb + rs * rs))));
  if (pedidas.includes("volumen")) notas.push(conU3("V = " + numeroBonito((Math.PI * h * (Rb * Rb + Rb * rs + rs * rs)) / 3)));
  return { nombre: "Cono truncado", detalle: "R = " + numeroBonito(Rb) + ", r = " + numeroBonito(rs) + ", h = " + numeroBonito(h) + ", g = " + numeroBonito(g), prims, lineas, cotas, notas };
}

/* ─────────────────────────  ESFERA  ───────────────────────── */

function construirEsfera(fig, vista, est) {
  const pedidas = cotasDe(fig);
  const r = medida(fig.radio, "radio", "Ej: { tipo: \"esfera\", radio: 5 }.");
  const e = vista.elev * RAD;
  const se = Math.sin(e);
  const R = r * K, ry = R * se, rm = R * se;
  const prims = [
    sombraDe(0, R + 2, R * 0.94),
    { k: "circ", cx: 0, cy: 0, r: R, relleno: gradRadial(est.relleno), opacidad: est.opacidad },
  ];
  const lineas = [
    { k: "pline", segs: [["M", -R, 0], ["A", R, ry, 0, 0, R, 0]], clase: "visible" },
    { k: "pline", segs: [["M", -R, 0], ["A", R, ry, 0, 1, R, 0]], clase: "oculta" },
    { k: "pline", segs: [["M", 0, -R], ["A", rm, R, 0, 0, 0, R]], clase: "aux" },
    { k: "pline", segs: [["M", 0, -R], ["A", rm, R, 0, 1, 0, R]], clase: "aux" },
  ];
  const cotas = [], notas = [];
  if (pedidas.includes("radio")) {
    cotas.push({ tipo: "radio", c: [0, 0], p: [R * Math.cos(-42 * RAD), R * Math.sin(-42 * RAD)], texto: etiqueta("r", r) });
  }
  if (pedidas.includes("diametro")) {
    cotas.push({ tipo: "dim", a: [-R, 0], b: [R, 0], ref: [0, 7], texto: etiqueta("d", 2 * r) });
  }
  if (pedidas.includes("areaTotal")) notas.push(conU2("A tot = " + numeroBonito(4 * Math.PI * r * r)));
  if (pedidas.includes("volumen")) notas.push(conU3("V = " + numeroBonito((4 * Math.PI * r * r * r) / 3)));
  return { nombre: "Esfera", detalle: "r = " + numeroBonito(r), prims, lineas, cotas, notas };
}

/* ── helpers de aritmética 2D/estructura ── */

function norm2(v) {
  const m = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / m, v[1] / m];
}
function argMin(arr, f) {
  let bi = 0, bv = Infinity;
  arr.forEach((x, i) => { const v = f(x); if (v < bv) { bv = v; bi = i; } });
  return bi;
}
function aristaVisible(pint, i, j) {
  const key = i < j ? i + "-" + j : j + "-" + i;
  return pint.mapaAristas.get(key) === true;
}

const ES_PLANA = { poligono: 1, circulo: 1, elipse: 1 };

function construirFigura(fig, vista, estado) {
  if (!fig.tipo) {
    throw { msj: "Tipo de figura " + (fig.tipoOriginal ? "«" + esc(fig.tipoOriginal) + "» " : "") + "no reconocido. Válidos: polígono, círculo, elipse, prisma, pirámide, poliedroRegular, cilindro, cono, conoTruncado, esfera." };
  }
  const est = { relleno: fig.relleno, opacidad: fig.opacidad, borde: fig.borde, grosor: fig.grosor };
  /* Rotación PROPIA de la figura: en planas gira el dibujo en su plano
     (SVG transform), en sólidos se suma al giro de la vista; «elev»
     permite a cada sólido su propia elevación de cámara. */
  const giroF = ((numeroSeguro(fig.giro, 0) % 360) + 360) % 360;
  const vistaF = ES_PLANA[fig.tipo] ? vista : {
    giro: vista.giro + giroF,
    elev: fig.elev != null ? fig.elev : vista.elev,
  };
  let p;
  switch (fig.tipo) {
    case "poligono": p = construirPoligono(fig, est); break;
    case "circulo": p = construirCirculo(fig, est); break;
    case "elipse": p = construirElipse(fig, est); break;
    case "prisma": p = construirPrisma(fig, vistaF, est); break;
    case "piramide": p = construirPiramide(fig, vistaF, est); break;
    case "poliedroRegular": p = construirPoliedroRegular(fig, vistaF, est); break;
    case "cilindro": p = construirCilindro(fig, vistaF, est); break;
    case "cono": p = construirCono(fig, vistaF, est); break;
    case "conoTruncado": p = construirConoTruncado(fig, vistaF, est); break;
    case "esfera": p = construirEsfera(fig, vistaF, est); break;
    default:
      throw { msj: "Tipo de figura «" + esc(fig.tipo) + "» no reconocido. Válidos: polígono, círculo, elipse, prisma, pirámide, poliedroRegular, cilindro, cono, conoTruncado, esfera." };
  }
  p.tipo = fig.tipo;
  p.borde = est.borde;
  p.grosor = est.grosor;
  if (ES_PLANA[fig.tipo] && giroF > 0.01) p.rot = giroF;
  return p;
}

/* ════════════════════════════════════════════════════════════════════
   TRANSFORMACIÓN (escala uniforme + acomodo) Y RENDER SVG
   ════════════════════════════════════════════════════════════════════ */

function segsTransformados(segs, T, s) {
  return segs.map((g) => {
    if (g[0] === "M" || g[0] === "L") return [g[0], ...T([g[1], g[2]])];
    if (g[0] === "A") return ["A", g[1] * s, g[2] * s, g[3], g[4], ...T([g[5], g[6]])];
    return g.slice();
  });
}

function bboxDe(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; };
  recorrerPrims(p, add);
  /* Las COTAS también pintan fuera de la figura: extensiones, flechas
     y etiquetas. Se estima con la MISMA geometría de los dibujadores. */
  for (const c of p.cotas) {
    for (const kk of ["a", "b", "c", "p", "v", "p0", "p1"]) if (c[kk]) add(c[kk][0], c[kk][1]);
    const L = Math.min(52, String(c.texto || "").length * 3.4);
    const cajaRot = (x, y, ux, uy, half, w2) => {
      add(x - ux * half - uy * w2, y - uy * half - ux * w2);
      add(x + ux * half + uy * w2, y + uy * half + ux * w2);
      add(x - ux * half + uy * w2, y - uy * half + ux * w2);
      add(x + ux * half - uy * w2, y + uy * half - ux * w2);
    };
    if (c.tipo === "dim" && c.a && c.b) {
      const off = c.off ?? 16;
      let dx = c.b[0] - c.a[0], dy = c.b[1] - c.a[1];
      const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      let nx = -dy, ny = dx;
      if (c.ref) {
        const mx = (c.a[0] + c.b[0]) / 2 - c.ref[0], my = (c.a[1] + c.b[1]) / 2 - c.ref[1];
        if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
      } else if (c.lado === -1) { nx = -nx; ny = -ny; }
      cajaRot((c.a[0] + c.b[0]) / 2 + nx * (off + 11.5), (c.a[1] + c.b[1]) / 2 + ny * (off + 11.5), dx, dy, L, 8);
      add(c.a[0] + nx * (off + 8), c.a[1] + ny * (off + 8));
      add(c.b[0] + nx * (off + 8), c.b[1] + ny * (off + 8));
    } else if (c.tipo === "sobre" && c.a && c.b) {
      let dx = c.b[0] - c.a[0], dy = c.b[1] - c.a[1];
      const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      let nx = -dy, ny = dx;
      if (c.lado === -1) { nx = -nx; ny = -ny; }
      cajaRot((c.a[0] + c.b[0]) / 2 + nx * 12, (c.a[1] + c.b[1]) / 2 + ny * 12, 1, 0, L, 8);
    } else if (c.tipo === "radio" && c.c && c.p) {
      let dx = c.p[0] - c.c[0], dy = c.p[1] - c.c[1];
      const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      let nx = -dy, ny = dx;
      if (ny > 0 || (Math.abs(ny) < 0.35 && nx > 0)) { nx = -nx; ny = -ny; }
      cajaRot((c.c[0] + c.p[0]) / 2 + nx * 10.5, (c.c[1] + c.p[1]) / 2 + ny * 10.5, 1, 0, L, 8);
    } else if (c.tipo === "angulo" && c.v) {
      for (let k = 0; k < 8; k++) {
        const t = k * Math.PI / 4;
        add(c.v[0] + Math.cos(t) * (c.r + 16), c.v[1] + Math.sin(t) * (c.r + 16));
      }
    }
  }
  return { x0, y0, x1, y1 };
}

/* Puntos extremos EXACTOS de un arco elíptico axis-aligned (centro
   según la especificación SVG): sin esto el bbox ignora el VENTRE
   de cada elipse y las figuras salían cortadas arriba/abajo. */
function extremosArco(x1, y1, seg, add) {
  const rx = Math.abs(+seg[1]), ry = Math.abs(+seg[2]);
  const fA = seg[3], fS = seg[4], x2 = +seg[5], y2 = +seg[6];
  if (!rx || !ry) return;
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const lam = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  let RX = rx, RY = ry;
  if (lam > 1) { const s = Math.sqrt(lam); RX = rx * s; RY = ry * s; }
  const num = RX * RX * RY * RY - RX * RX * dy * dy - RY * RY * dx * dx;
  const den = RX * RX * dy * dy + RY * RY * dx * dx;
  const co = den ? (fA !== fS ? 1 : -1) * Math.sqrt(Math.max(0, num / den)) : 0;
  const cx = co * RX * dy / RY + (x1 + x2) / 2;
  const cy = -co * RY * dx / RX + (y1 + y2) / 2;
  const ang = (px, py) => Math.atan2((py - cy) / RY, (px - cx) / RX);
  const t1 = ang(x1, y1), t2 = ang(x2, y2);
  let delta = t2 - t1;
  if (fS && delta <= 0) delta += 2 * Math.PI;
  if (!fS && delta >= 0) delta -= 2 * Math.PI;
  for (let k = 0; k < 4; k++) {
    const obj = k * Math.PI / 2;
    let dif = fS ? (obj - t1) % (2 * Math.PI) : (t1 - obj) % (2 * Math.PI);
    if (dif < 0) dif += 2 * Math.PI;
    if (dif <= Math.abs(delta) + 1e-9) {
      add(cx + RX * Math.cos(obj), cy + RY * Math.sin(obj));
    }
  }
}

function recorrerSegs(segs, add) {
  let cur = null;
  for (const g of segs) {
    if (g[0] === "M" || g[0] === "L") { add(g[1], g[2]); cur = [g[1], g[2]]; }
    else if (g[0] === "A") {
      if (cur) extremosArco(cur[0], cur[1], g, add);
      add(g[5], g[6]); cur = [g[5], g[6]];
    }
  }
}

function recorrerPrims(p, add) {
  for (const pr of p.prims) {
    if (pr.k === "poli") pr.pts.forEach((q) => add(q[0], q[1]));
    else if (pr.k === "circ") { add(pr.cx - pr.r, pr.cy - pr.r); add(pr.cx + pr.r, pr.cy + pr.r); }
    else if (pr.k === "elipse" || pr.k === "sombra") { add(pr.cx - pr.rx, pr.cy - pr.ry); add(pr.cx + pr.rx, pr.cy + pr.ry); }
    else if (pr.k === "path" || pr.k === "pline") recorrerSegs(pr.segs, add);
  }
  for (const l of p.lineas || []) {
    if (l.k === "pline") recorrerSegs(l.segs, add);
    else { add(l.a[0], l.a[1]); add(l.b[0], l.b[1]); }
  }
}

function transformar(p, s, dx, dy) {
  const T = (pt) => [(pt[0] + p.off[0]) * s + dx, (pt[1] + p.off[1]) * s + dy];
  for (const pr of p.prims) {
    if (pr.k === "poli") pr.pts = pr.pts.map(T);
    else if (pr.k === "circ") { const c = T([pr.cx, pr.cy]); pr.cx = c[0]; pr.cy = c[1]; pr.r *= s; }
    else if (pr.k === "elipse" || pr.k === "sombra") { const c = T([pr.cx, pr.cy]); pr.cx = c[0]; pr.cy = c[1]; pr.rx *= s; pr.ry *= s; }
    else if (pr.k === "path" || pr.k === "pline") pr.segs = segsTransformados(pr.segs, T, s);
  }
  for (const l of p.lineas || []) {
    if (l.k === "pline") l.segs = segsTransformados(l.segs, T, s);
    else { l.a = T(l.a); l.b = T(l.b); }
  }
  for (const c of p.cotas) {
    for (const kk of ["a", "b", "c", "p", "v", "p0", "p1", "ref"]) if (c[kk]) c[kk] = T(c[kk]);
  }
  /* bbox FINAL (para colocar las fichas de notas dentro) */
  let x0 = Infinity, y1 = -Infinity;
  recorrerPrims(p, (x, y) => { if (x < x0) x0 = x; if (y > y1) y1 = y; });
  p.notas = (p.notas || []).map((raw) => (typeof raw === "string" ? { texto: raw } : raw));
  p.notas.forEach((n, i) => {
    const w = n.texto.length * 6.1 + 16;
    n.x = x0 + 5 + w / 2;
    n.y = y1 - 13 - i * 23;
  });
}

function segsAD(segs) {
  return segs.map((g) => {
    if (g[0] === "Z") return "Z";
    if (g[0] === "A") {
      /* [A, rx, ry, large, sweep, x, y] → d con rotación de eje 0 */
      return "A " + (+g[1].toFixed(2)) + " " + (+g[2].toFixed(2)) + " 0 " +
        g[3] + " " + g[4] + " " + (+g[5].toFixed(2)) + " " + (+g[6].toFixed(2));
    }
    return g[0] + " " + g.slice(1).map((v) => (typeof v === "number" ? +v.toFixed(2) : v)).join(" ");
  }).join(" ");
}

const claseDash = (cl) =>
  cl === "oculta" ? ' stroke-dasharray="6.5 4.5"' : cl === "aux" ? ' stroke-dasharray="2.6 3.6"' : "";

function primsSvg(p) {
  let s = "";
  for (const pr of p.prims) {
    if (pr.k === "poli") {
      s += '<polygon stroke="none" fill="' + pr.relleno + '" fill-opacity="' + pr.opacidad + '" points="' + pr.pts.map(punt_svg).join(" ") + '"/>';
    } else if (pr.k === "circ") {
      s += '<circle cx="' + pr.cx.toFixed(2) + '" cy="' + pr.cy.toFixed(2) + '" r="' + pr.r.toFixed(2) + '" fill="' + pr.relleno + '" fill-opacity="' + pr.opacidad + '"/>';
    } else if (pr.k === "elipse") {
      s += '<ellipse cx="' + pr.cx.toFixed(2) + '" cy="' + pr.cy.toFixed(2) + '" rx="' + pr.rx.toFixed(2) + '" ry="' + pr.ry.toFixed(2) + '" fill="' + pr.relleno + '" fill-opacity="' + pr.opacidad + '"/>';
    } else if (pr.k === "sombra") {
      s += '<ellipse class="cfg-sombra" cx="' + pr.cx.toFixed(2) + '" cy="' + pr.cy.toFixed(2) + '" rx="' + pr.rx.toFixed(2) + '" ry="' + pr.ry.toFixed(2) + '" fill="url(#' + idSombraAct + ')"/>';
    } else if (pr.k === "path") {
      s += '<path stroke="none" fill="' + pr.relleno + '" fill-opacity="' + pr.opacidad + '" d="' + segsAD(pr.segs) + '"/>';
    }
  }
  return s;
}

function lineasSvg(p) {
  let s = '<g class="cfg-lineas">';
  for (const pr of p.prims) {
    if (pr.k === "pline") s += '<path d="' + segsAD(pr.segs) + '"' + claseDash(pr.clase) + "/>";
  }
  for (const l of p.lineas || []) {
    if (l.k === "pline") {
      s += '<path d="' + segsAD(l.segs) + '"' + claseDash(l.clase) + "/>";
    } else {
      s += '<line x1="' + l.a[0].toFixed(2) + '" y1="' + l.a[1].toFixed(2) + '" x2="' + l.b[0].toFixed(2) + '" y2="' + l.b[1].toFixed(2) + '"' + claseDash(l.clase) + "/>";
    }
  }
  return s + "</g>";
}

function cotasSvg(p) {
  let s = "";
  for (const c of p.cotas) {
    if (c.tipo === "dim") s += cotaDim(c);
    else if (c.tipo === "sobre") s += cotaSobre(c);
    else if (c.tipo === "radio") s += cotaRadio(c);
    else if (c.tipo === "angulo") s += cotaAngulo(c);
    else if (c.tipo === "recto") s += marcaRecta(c);
  }
  return s;
}

/* Las fichas (P, A, V, F·V·A) van FUERA del grupo girado: si la figura
   está rotada, las fichas siguen legibles horizontales. */
function notasSvg(p) {
  return (p.notas || []).map(cotaNota).join("");
}

/* ── Plan completo: construir → acomodar → escalar → SVG ── */

function construirPlan(estado, W) {
  unidadActual = estado.unidad || "";
  reiniciarDefs();
  if (!estado.figuras.length) {
    throw { msj: "Añade <b>AL MENOS UNA figura</b>. Ej: { figuras: [{ tipo: \"cilindro\", radio: 4, altura: 10 }] } o directamente { tipo: \"circulo\", radio: 5 }." };
  }
  const vista = {
    giro: ((numeroSeguro(estado.vista.giro, 45) % 360) + 360) % 360,
    elev: clamp(numeroSeguro(estado.vista.elevacion, 35.264), 2, 85),
  };
  const piezas = estado.figuras.map((f) => construirFigura(f, vista, estado));
  piezas.forEach((p) => {
    p.bbox = bboxDe(p);
    /* Una figura plana rotada ocupa más: expandir su bbox girado. */
    if (p.rot) {
      const cx = (p.bbox.x0 + p.bbox.x1) / 2, cy = (p.bbox.y0 + p.bbox.y1) / 2;
      const cw = (p.bbox.x1 - p.bbox.x0) / 2, ch = (p.bbox.y1 - p.bbox.y0) / 2;
      const a = p.rot * RAD, c = Math.abs(Math.cos(a)), s2 = Math.abs(Math.sin(a));
      const hw = cw * c + ch * s2, hh = cw * s2 + ch * c;
      p.bbox = { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
    }
  });

  const margenDe = (p) => 30 + (p.margenExtra || 0);
  const dims = piezas.map((p) => ({
    w: p.bbox.x1 - p.bbox.x0 + 2 * margenDe(p),
    h: p.bbox.y1 - p.bbox.y0 + 2 * margenDe(p),
  }));
  const horizontal = estado.composicion !== "vertical";
  const n = piezas.length;
  let totalW, totalH;
  if (horizontal) {
    totalW = dims.reduce((s2, d) => s2 + d.w, 0) + estado.espacio * (n - 1);
    totalH = Math.max(...dims.map((d) => d.h));
  } else {
    totalH = dims.reduce((s2, d) => s2 + d.h, 0) + estado.espacio * (n - 1);
    totalW = Math.max(...dims.map((d) => d.w));
  }
  /* escala ÚNICA y uniforme: nunca deforma proporciones */
  const s = Math.max(0.02, Math.min(W / totalW, 580 / totalH, 3));
  let cursor = 0;
  piezas.forEach((p, i) => {
    const cx = (p.bbox.x0 + p.bbox.x1) / 2, cy = (p.bbox.y0 + p.bbox.y1) / 2;
    if (horizontal) {
      const slotCx = cursor + dims[i].w / 2;
      cursor += dims[i].w + (i < n - 1 ? estado.espacio : 0);
      p.off = [slotCx - cx, totalH / 2 - cy];
    } else {
      const slotCy = cursor + dims[i].h / 2;
      cursor += dims[i].h + (i < n - 1 ? estado.espacio : 0);
      p.off = [totalW / 2 - cx, slotCy - cy];
    }
  });
  const H = Math.max(240, totalH * s);
  const dx = Math.max(0, (W - totalW * s) / 2);
  const dy = Math.max(0, (H - totalH * s) / 2);
  piezas.forEach((p) => transformar(p, s, dx, dy));

  /* Cada figura en su grupo (con su rotación propia si la tiene); las
     cotas giran con la figura y las fichas de medidas quedan legibles. */
  let cuerpo = "";
  piezas.forEach((p) => {
    let rot = "";
    if (p.rot) {
      const bb = bboxDe(p);
      rot = ' transform="rotate(' + (+p.rot.toFixed(2)) + " " +
        ((bb.x0 + bb.x1) / 2).toFixed(1) + " " + ((bb.y0 + bb.y1) / 2).toFixed(1) + ')"';
    }
    cuerpo += "<g" + rot + '><g stroke="' + esc(p.borde) + '" stroke-width="' + (+p.grosor || 2.4) +
      '" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      primsSvg(p) + lineasSvg(p) + "</g>" +
      '<g class="cfg-cota">' + cotasSvg(p) + "</g></g>" + notasSvg(p);
  });

  const nombres = piezas.map((p) => p.nombre + (p.detalle ? " (" + p.detalle + ")" : ""));
  const resumen = (n > 1 ? (horizontal ? "Composición horizontal — " : "Composición vertical — ") : "") + nombres.join("  +  ");
  const aria = "Figuras geométricas: " + nombres.join(", ");
  const svg = '<svg class="cfg-svg" viewBox="0 0 ' + (+W.toFixed(1)) + " " + (+H.toFixed(1)) +
    '" role="img" aria-label="' + esc(aria) + '" focusable="false">' +
    (defsAct.length ? "<defs>" + defsAct.join("") + "</defs>" : "") +
    '<g class="cfg-raiz">' + cuerpo + "</g></svg>";
  return { svg, resumen, aria };
}

/* ════════════════════════════════════════════════════════════════════
   PANEL INTERACTIVO (editor plegable dentro de la tarjeta)
   ════════════════════════════════════════════════════════════════════ */

const DEFECTOS = {
  poligono: { regular: true, lados: 6, lado: 4, medidas: "4,5,5,6,7" },
  circulo: { radio: 5 },
  elipse: { radioMayor: 7, radioMenor: 4 },
  prisma: { lados: 6, lado: 3, altura: 8, inclinacion: 0 },
  piramide: { lados: 4, lado: 4, altura: 7 },
  poliedroRegular: { caras: 8, lado: 3 },
  cilindro: { radio: 4, altura: 10 },
  cono: { radio: 4, altura: 9, generatriz: 0 },
  esfera: { radio: 5 },
  conoTruncado: { radioBase: 6, radioSuperior: 3, altura: 8, generatriz: 0 },
};

const NOMBRE_CORTO = { poligono: "Polígono", circulo: "Círculo", elipse: "Elipse", prisma: "Prisma",
  piramide: "Pirámide", poliedroRegular: "Poliedro", cilindro: "Cilindro", cono: "Cono",
  conoTruncado: "Cono trunc.", esfera: "Esfera" };
function nombreCorto(fig) { return NOMBRE_CORTO[fig.tipo] || "Figura"; }

const CAMPOS = {
  poligono: (fig) => fig.regular === false
    ? [["medidas", "Medidas de los lados (separadas por coma)", "txt"]]
    : [["lados", "Lados (3–100)", "num"], ["lado", "Medida del lado", "num"]],
  circulo: () => [["radio", "Radio", "num"]],
  elipse: () => [["radioMayor", "Radio mayor", "num"], ["radioMenor", "Radio menor", "num"]],
  prisma: () => [["lados", "Lados de la base", "num"], ["lado", "Lado de la base", "num"], ["altura", "Altura", "num"], ["inclinacion", "Inclinación en grados (0 = recto)", "num"]],
  piramide: () => [["lados", "Lados de la base", "num"], ["lado", "Lado de la base", "num"], ["altura", "Altura", "num"]],
  poliedroRegular: () => [["caras", "Caras (sólido platónico)", "selCaras"], ["lado", "Arista (lado)", "num"]],
  cilindro: () => [["radio", "Radio", "num"], ["altura", "Altura", "num"]],
  cono: () => [["radio", "Radio de la base", "num"], ["altura", "Altura", "num"], ["generatriz", "Generatriz (opcional)", "num"]],
  esfera: () => [["radio", "Radio", "num"]],
  conoTruncado: () => [["radioBase", "Radio de la base", "num"], ["radioSuperior", "Radio superior", "num"], ["altura", "Altura", "num"], ["generatriz", "Generatriz (opcional)", "num"]],
};

function campoNum(k, et, fig) {
  const val = fig[k] === undefined || fig[k] === null ? "" : String(fig[k]);
  return '<label class="cfg-campo"><span>' + esc(et) + '</span>' +
    '<input data-k="' + k + '" data-tiponum="1" type="number" step="any" value="' + esc(val) + '"></label>';
}

function htmlPanel(estado) {
  const fig = estado.figuras[estado.activa];
  const fichas = estado.figuras.map((f, i) =>
    '<button type="button" class="cfg-ficha' + (i === estado.activa ? " activa" : "") + '" data-ficha="' + i + '">' +
    (i + 1) + " · " + esc(nombreCorto(f)) + "</button>").join("");

  if (!fig) {
    return '<div class="cfg-fichas">' + fichas +
      '<button type="button" class="cfg-mini" data-add title="Añadir figura">＋</button></div>' +
      '<div class="cfg-checos" style="opacity:.8">No hay figuras todavía: pulsa ＋ para añadir la primera.</div>' +
      '<details class="cfg-codigowrap"><summary>Ver el código de esta escena</summary><pre class="cfg-codigo"></pre></details>';
  }

  let campos = "";
  if (fig.tipo === "poligono") {
    campos += '<label class="cfg-campo"><span>¿Regular?</span><select data-k="regular">' +
      '<option value="si"' + (fig.regular === false ? "" : " selected") + '>Sí — con la medida del lado</option>' +
      '<option value="no"' + (fig.regular === false ? " selected" : "") + '>No — con la lista de lados</option></select></label>';
  }
  campos += (CAMPOS[fig.tipo] ? CAMPOS[fig.tipo](fig) : []).map((c) => {
    const [k, et, kind] = c;
    if (kind === "selCaras") {
      return '<label class="cfg-campo"><span>' + esc(et) + '</span><select data-k="caras">' +
        [4, 6, 8, 12, 20].map((nn) => '<option value="' + nn + '"' + (Number(fig.caras) === nn ? " selected" : "") + ">" + nn + "</option>").join("") +
        "</select></label>";
    }
    return campoNum(k, et, fig);
  }).join("");

  const checos = catalogoCotas(fig).map((c) => {
    const activa = Array.isArray(fig.cotas) ? fig.cotas.includes(c) : cotasDefecto(fig).includes(c);
    const sim = SIMBOLO_COTA[c];
    return '<label><input type="checkbox" name="cota" value="' + c + '"' + (activa ? " checked" : "") + "> " +
      c + (sim && sim !== c ? " (" + sim + ")" : "") + "</label>";
  }).join("");

  const con3d = estado.figuras.some((f) => !["poligono", "circulo", "elipse"].includes(f.tipo));
  const multi = estado.figuras.length > 1;
  const esPlana = ["poligono", "circulo", "elipse"].includes(fig.tipo);

  /* ROTACIÓN ELEGIBLE: propia de cada figura (giro siempre; elev solo
     en sólidos, porque en planas no hay cámara inclinada). */
  const rotCampos =
    '<label class="cfg-campo"><span>Rotación de la figura (°)</span>' +
    '<input data-k="giro" data-tiponum="1" type="number" step="1" min="-360" max="360" value="' + esc(fig.giro ? fig.giro : 0) + '"></label>' +
    (esPlana ? "" : '<label class="cfg-campo"><span>Elevación propia (°, opcional)</span>' +
      '<input data-k="elev" data-tiponum="1" type="number" step="0.5" min="2" max="85" value="' + esc(fig.elev ?? "") + '"></label>');

  const gridEstilo =
    '<label class="cfg-campo"><span>Borde</span><input data-est="borde" type="color" value="' + esc(fig.borde) + '"></label>' +
    '<label class="cfg-campo"><span>Grosor del trazo (' + (+fig.grosor || 2.4).toFixed(1) + ')</span><input data-est="grosor" type="range" min="1" max="6" step="0.2" value="' + (+fig.grosor || 2.4) + '"></label>' +
    '<label class="cfg-campo"><span>Relleno</span><input data-est="relleno" type="color" value="' + esc(fig.relleno) + '"></label>' +
    '<label class="cfg-campo"><span>Opacidad del relleno (' + (+fig.opacidad).toFixed(2) + ')</span><input data-est="opacidad" type="range" min="0.05" max="1" step="0.05" value="' + (+fig.opacidad) + '"></label>';

  const gridVista = con3d
    ? '<div class="cfg-grid">' +
      '<label class="cfg-campo"><span>Giro de la vista (' + Math.round(estado.vista.giro) + '°)</span><input data-vist="giro" type="range" min="0" max="360" step="1" value="' + estado.vista.giro + '"></label>' +
      '<label class="cfg-campo"><span>Elevación de la vista (' + (+estado.vista.elevacion).toFixed(1) + '°)</span><input data-vist="elevacion" type="range" min="2" max="85" step="0.5" value="' + estado.vista.elevacion + '"></label></div>'
    : "";

  const gridCompo = (multi ? '<label class="cfg-campo"><span>Orientación de la composición</span><select data-k="composicion">' +
      '<option value="horizontal"' + (estado.composicion !== "vertical" ? " selected" : "") + '>Horizontal — de izquierda a derecha</option>' +
      '<option value="vertical"' + (estado.composicion === "vertical" ? " selected" : "") + '>Vertical — apiladas de arriba hacia abajo</option></select></label>' +
    '<label class="cfg-campo"><span>Espacio entre figuras (px)</span><input data-k="espacio" type="number" step="1" min="6" max="140" value="' + estado.espacio + '"></label>' : "") +
    '<label class="cfg-campo"><span>Unidad de las cotas (opcional)</span><input data-k="unidad" type="text" value="' + esc(estado.unidad) + '" placeholder="cm, m, u…"></label>' +
    '<label class="cfg-campo"><span>Tema visual</span><select data-k="tema">' +
      ["clasico", "laboratorio", "neon"].map((t) => '<option value="' + t + '"' + (estado.tema === t ? " selected" : "") + ">" + t + "</option>").join("") +
      "</select></label>";

  return '<div class="cfg-fichas">' + fichas +
    '<button type="button" class="cfg-mini" data-add title="Añadir figura">＋</button>' +
    (multi ? '<button type="button" class="cfg-mini" data-del title="Quitar esta figura">－</button>' : "") + "</div>" +
    '<div class="cfg-grid"><label class="cfg-campo"><span>Tipo de figura</span><select data-k="tipo">' +
    Object.keys(DEFECTOS).map((t) => '<option value="' + t + '"' + (fig.tipo === t ? " selected" : "") + ">" + NOMBRE_CORTO[t] + "</option>").join("") +
    "</select></label>" + campos + rotCampos + "</div>" +
    '<div class="cfg-sub">Cotas visibles (arreglo «cotas»)</div>' +
    '<div class="cfg-checos">' + checos + "</div>" +
    '<div class="cfg-sub">Estilo de esta figura</div>' +
    '<div class="cfg-grid">' + gridEstilo + "</div>" +
    (con3d ? '<div class="cfg-sub">Vista isométrica</div>' + gridVista : "") +
    '<div class="cfg-grid">' + gridCompo + "</div>" +
    '<details class="cfg-codigowrap"><summary>Ver el código de esta escena</summary><pre class="cfg-codigo"></pre></details>';
}

function codigoDe(estado) {
  const figs = estado.figuras.map((f) => {
    const o = { tipo: f.tipo };
    for (const k of ["lados", "lado", "altura", "radio", "radioMayor", "radioMenor", "radioBase", "radioSuperior", "generatriz", "inclinacion", "caras", "giro", "elev"]) {
      if (f[k] !== undefined && f[k] !== null && f[k] !== "") o[k] = Number(f[k]);
    }
    if (!o.giro) delete o.giro;
    if (o.elev === undefined || o.elev === "") delete o.elev;
    if (f.tipo === "poligono" && f.regular === false) {
      o.regular = false;
      o.medidas = Array.isArray(f.medidas) ? f.medidas.slice() : String(f.medidas ?? "").split(",").map((x) => x.trim()).filter(Boolean).map(Number);
      delete o.lados; delete o.lado;
    }
    if (Array.isArray(f.cotas)) o.cotas = f.cotas.slice();
    o.relleno = f.relleno; o.borde = f.borde;
    o.opacidad = Math.round(f.opacidad * 100) / 100;
    o.grosor = Math.round(f.grosor * 10) / 10;
    return o;
  });
  const d = { figuras: figs };
  if (figs.length > 1) { d.composicion = estado.composicion; d.espacio = estado.espacio; }
  d.vista = { giro: Math.round(estado.vista.giro * 10) / 10, elevacion: Math.round(estado.vista.elevacion * 10) / 10 };
  d.tema = estado.tema;
  if (estado.unidad) d.unidad = estado.unidad;
  return "generarFigurasGeometricas(" + JSON.stringify(d, null, 1) + ");";
}

/* ════════════════════════════════════════════════════════════════════
   GENERAR FIGURAS — construye la tarjeta, la muestra centrada en el
   <body> (o en el contenedor pedido) y la devuelve.
   ════════════════════════════════════════════════════════════════════ */

function normalizarFigura(f, i, opc) {
  f = f && typeof f === "object" ? f : {};
  const out = { tipo: normalizaTipo(f.tipo), tipoOriginal: String(f.tipo ?? "") };
  for (const k of ["lados", "lado", "altura", "radio", "radioMayor", "radioMenor", "radioBase", "radioSuperior", "generatriz", "inclinacion", "caras", "medidas"]) {
    if (f[k] !== undefined && f[k] !== null && f[k] !== "") out[k] = f[k];
  }
  out.regular = f.regular === false || f.regular === "no" ? false : true;
  out.cotas = Array.isArray(f.cotas) ? f.cotas.map(String) : undefined;
  /* Rotación propia: giro 0–360° y elevación 2–85° (solo afecta a los
     sólidos; en planas el giro rota el dibujo en su plano). */
  out.giro = ((numeroSeguro(f.giro, 0) % 360) + 360) % 360;
  out.elev = (f.elev === undefined || f.elev === null || f.elev === "") ? undefined
    : clamp(numeroSeguro(f.elev, 35.264), 2, 85);
  const relleno = (typeof f.relleno === "string" && f.relleno.trim()) ||
    (i === 0 && typeof opc.relleno === "string" && opc.relleno.trim()) ||
    PALETA[i % PALETA.length];
  out.relleno = relleno.trim();
  out.borde = (typeof f.borde === "string" && f.borde.trim()) ||
    (i === 0 && typeof opc.borde === "string" && opc.borde.trim()) ||
    oscurecer(out.relleno, 0.52);
  out.borde = out.borde.trim();
  out.grosor = numeroSeguro(f.grosor !== undefined ? f.grosor : opc.grosor, 2.4);
  out.opacidad = clamp(numeroSeguro(f.opacidad !== undefined ? f.opacidad : opc.opacidad, 0.35), 0.05, 1);
  return out;
}

export function generarFigurasGeometricas(datos = {}) {
  inyectarEstilos();
  const opc = datos && typeof datos === "object" ? datos : {};
  const lista = Array.isArray(opc.figuras) && opc.figuras.length
    ? opc.figuras
    : (opc.tipo ? [opc] : []);

  const estado = {
    figuras: lista.map((f, i) => normalizarFigura(f, i, opc)),
    activa: 0,
    composicion: String(opc.composicion ?? "horizontal").trim().toLowerCase().startsWith("v") ? "vertical" : "horizontal",
    espacio: clamp(numeroSeguro(opc.espacio, 34), 6, 140),
    vista: {
      giro: numeroSeguro(opc.vista && opc.vista.giro, 45),
      elevacion: numeroSeguro(opc.vista && opc.vista.elevacion, 35.264),
    },
    unidad: String(opc.unidad ?? "").trim(),
    tema: normalizaTema(opc.tema),
    ancho: clamp(numeroSeguro(opc.ancho, 960), 300, 1500),
  };

  const escena = document.createElement("div");
  escena.className = "cfg-escena";
  escena.style.setProperty("--cfg-ancho", estado.ancho + "px");

  const tarjeta = document.createElement("div");
  tarjeta.className = "cfg-tarjeta";
  tarjeta.dataset.tema = estado.tema;
  tarjeta.innerHTML =
    (estado.tema === "laboratorio"
      ? '<div class="cfg-rotulo">' + ICONO_GEOMETRIA + "<span>Figuras geométricas</span></div>"
      : "") +
    '<div class="cfg-resumen"></div><div class="cfg-lienzo"></div>' +
    '<details class="cfg-editor"' + (opc.contenedor ? "" : " open") +
    '><summary>✏️ Editor de figuras</summary><div class="cfg-panel"></div></details>';

  const lienzo = tarjeta.querySelector(".cfg-lienzo");
  const resumenEl = tarjeta.querySelector(".cfg-resumen");
  const panel = tarjeta.querySelector(".cfg-panel");
  const editor = tarjeta.querySelector(".cfg-editor");

  function medir() {
    const base = (opc.contenedor && opc.contenedor.clientWidth) ? opc.contenedor.clientWidth
      : Math.min(window.innerWidth - 28, 960);
    return clamp(Math.min(base, estado.ancho), 300, 1500);
  }

  function ponerCodigo() {
    const pre = tarjeta.querySelector(".cfg-codigo");
    if (pre) pre.textContent = codigoDe(estado);
  }

  function repintar() {
    let plan;
    try {
      plan = construirPlan(estado, medir());
    } catch (e) {
      if (!e || !e.msj) console.error("creadorFigurasGeometricas:", e);
      const msj = (e && e.msj) ? e.msj : "No pude dibujar la figura. Revisa las medidas.";
      lienzo.innerHTML = '<div class="cfg-error-cuerpo"><span class="cfg-error-icono">!</span>' +
        '<span class="cfg-error-titulo">Figura incompleta</span>' +
        '<span class="cfg-error-msj">' + msj + "</span></div>";
      resumenEl.textContent = "";
      tarjeta.setAttribute("aria-label", "Aviso: la figura geométrica está incompleta");
      ponerCodigo();
      return;
    }
    lienzo.innerHTML = plan.svg;
    /* AJUSTE FINAL: el viewBox se recalcula con el bounding box REAL
       del contenido ya renderizado (incluye etiquetas, flechas, arcos
       y rotaciones) → la figura JAMÁS sale cortada, a ningún ancho. */
    const svgEl = lienzo.querySelector("svg");
    const raiz = svgEl && svgEl.querySelector(".cfg-raiz");
    if (raiz && typeof raiz.getBBox === "function") {
      try {
        const b = raiz.getBBox();
        if (b.width > 4 && b.height > 4 && Number.isFinite(b.x)) {
          const pad = Math.max(8, Math.min(26, Math.min(b.width, b.height) * 0.05));
          svgEl.setAttribute("viewBox", (b.x - pad).toFixed(1) + " " + (b.y - pad).toFixed(1) + " " +
            (b.width + 2 * pad).toFixed(1) + " " + (b.height + 2 * pad).toFixed(1));
        }
      } catch (_) { /* el viewBox calculado ya es válido */ }
    }
    resumenEl.textContent = plan.resumen;
    tarjeta.setAttribute("aria-label", plan.aria);
    ponerCodigo();
  }

  function reconstruir() {
    panel.innerHTML = htmlPanel(estado);
    repintar();
  }

  panel.addEventListener("input", (ev) => {
    const t = ev.target;
    const fig = estado.figuras[estado.activa];
    if (!fig) return;
    if (t.dataset.est) {
      const k = t.dataset.est;
      fig[k] = (t.type === "range" || t.type === "number") ? Number(t.value) : t.value;
      const ver = panel.querySelector('[data-est="grosor"]');
      if (k === "grosor" && ver) ver.closest(".cfg-campo").querySelector("span").textContent = "Grosor del trazo (" + (+t.value).toFixed(1) + ")";
      const ver2 = panel.querySelector('[data-est="opacidad"]');
      if (k === "opacidad" && ver2) ver2.closest(".cfg-campo").querySelector("span").textContent = "Opacidad del relleno (" + (+t.value).toFixed(2) + ")";
      repintar();
      return;
    }
    if (t.dataset.vist) {
      estado.vista[t.dataset.vist] = Number(t.value);
      const ver3 = panel.querySelector('[data-vist="' + t.dataset.vist + '"]');
      if (ver3) ver3.closest(".cfg-campo").querySelector("span").textContent =
        (t.dataset.vist === "giro" ? "Giro de la vista (" + Math.round(t.value) + "°)" : "Elevación de la vista (" + (+t.value).toFixed(1) + "°)");
      repintar();
      return;
    }
    if (t.name === "cota") {
      if (!Array.isArray(fig.cotas)) fig.cotas = cotasDefecto(fig).slice();
      if (t.checked) { if (!fig.cotas.includes(t.value)) fig.cotas.push(t.value); }
      else fig.cotas = fig.cotas.filter((x) => x !== t.value);
      repintar();
      return;
    }
    switch (t.dataset.k) {
      case "tipo": {
        const nuevo = t.value;
        for (const kk of Object.keys(fig)) {
          if (!["relleno", "borde", "opacidad", "grosor", "cotas", "tipoOriginal"].includes(kk)) delete fig[kk];
        }
        Object.assign(fig, DEFECTOS[nuevo] ? { ...DEFECTOS[nuevo] } : {});
        fig.tipo = nuevo;
        fig.cotas = undefined;
        reconstruir();
        return;
      }
      case "regular":
        fig.regular = t.value !== "no";
        if (!fig.regular && fig.medidas === undefined) fig.medidas = "4,5,5,6,7";
        fig.cotas = undefined;
        reconstruir();
        return;
      case "caras":
        fig.caras = Number(t.value);
        repintar();
        return;
      case "composicion":
        estado.composicion = t.value;
        repintar();
        return;
      case "tema":
        estado.tema = t.value;
        tarjeta.dataset.tema = t.value;
        repintar();
        return;
      case "unidad":
        estado.unidad = String(t.value).trim();
        repintar();
        return;
      case "espacio":
        estado.espacio = clamp(numeroSeguro(t.value, 34), 6, 140);
        repintar();
        return;
      default:
        if (t.dataset.k) {
          const v = String(t.value).trim();
          fig[t.dataset.k] = v === "" ? undefined : (t.dataset.tiponum === "1" ? Number(v) : v);
          repintar();
        }
    }
  });

  panel.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-ficha],[data-add],[data-del]");
    if (!b) return;
    if (b.dataset.ficha !== undefined) estado.activa = Number(b.dataset.ficha);
    if (b.dataset.add !== undefined) {
      const nuevo = { tipo: "cilindro", ...DEFECTOS.cilindro, cotas: undefined };
      nuevo.relleno = PALETA[estado.figuras.length % PALETA.length];
      nuevo.borde = oscurecer(nuevo.relleno, 0.52);
      estado.figuras.push(nuevo);
      estado.activa = estado.figuras.length - 1;
    }
    if (b.dataset.del !== undefined && estado.figuras.length > 1) {
      estado.figuras.splice(estado.activa, 1);
      estado.activa = Math.max(0, estado.activa - 1);
    }
    reconstruir();
  });

  reconstruir();

  /* Sin contenedor: centrado directamente en el cuerpo de la página. */
  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(escena);
  } else {
    const caja = document.createElement("div");
    caja.className = "cfg-caja";
    caja.appendChild(escena);
    document.body.appendChild(caja);
  }
  escena.appendChild(tarjeta);

  /* Repintar YA DENTRO del documento: el auto-ajuste del viewBox usa
     getBBox(), que devuelve vacío si el SVG está suelto (sin render).
     Sin esto, la primera escena montada podía salir cortada. */
  repintar();

  /* Redibuja al cambiar el ancho real del contenedor (la escala es
     uniforme, así que NUNCA se deforman las proporciones). */
  if (typeof ResizeObserver !== "undefined") {
    let w0 = medir();
    let raf = 0;
    const ro = new ResizeObserver(() => {
      const w = medir();
      if (Math.abs(w - w0) > 1) {
        w0 = w;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(repintar);
      }
    });
    ro.observe(opc.contenedor || document.body);
  }

  return tarjeta;
}

const ICONO_GEOMETRIA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M12 3 21 19H3Z"/><path d="M12 3v16"/><path d="M7.5 11 12 19"/>' +
  '<circle cx="12" cy="19" r="0.4"/></svg>';