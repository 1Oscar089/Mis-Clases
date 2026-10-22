// ============================================================
// svg.js — FIGURAS SVG: líneas divisorias, flechas, formas, fondos
// (js/componentes/svg.js) · v2: CUALQUIER CÓDIGO SVG DEL USUARIO
// (v2: con etiquetas <svg> se respeta su width/height/viewBox
// PROPIOS — solo se estira si pides ancho/alto o es fondo; con solo
// viewBox se vuelve proporcional; fragmentos sueltos aceptan la
// opción vista: "0 0 24 24". Antes v1: catálogo de figuras)
//
// Dibuja FIGURAS vectoriales como las "formas" de Word: líneas
// divisorias verticales u horizontales, flechas, estrellas, banner,
// globos de diálogo, fondos… También acepta CÓDIGO SVG crudo (con
// sus etiquetas <svg> o sin ellas).
//
//   const fig = crearSvg({
//     figura: "estrella-5",            // nombre del catálogo (abajo)
//     // codigo: "<svg viewBox='0 0 24 24'>…</svg>",  // o SVG crudo
//     ancho: 180, alto: 180,           // escala (número px, fracción
//                                      // 0..1 = %, o CSS "60%")
//     color: "morado",                 // nombre del proyecto, hex o CSS
//     estilo: "ambos",                 // "ambos" = borde y relleno
//                                      // "borde" = solo borde
//                                      // "relleno" = solo relleno
//     grosor: 2,                       // px del borde
//     trazo: "solido",                 // "solido"|"punteado"|"guiones"
//     debajo: true,                    // ← se dibuja POR DEBAJO del
//                                      //   resto del contenido (como
//                                      //   "Detrás del texto" de Word)
//     posicion: { arriba: 20, izquierda: 10 },
//     contenedor: zona,
//   });
//
// ─── POR DEBAJO DEL CONTENIDO (debajo: true) ───
//   La figura queda ABSOLUTA, con z-index -1 y sin clics (decorativa).
//   El contenedor donde la pegues se convierte en "lienzo"
//   automáticamente (si no, llama a hacerLienzo(padre) a mano). El
//   texto y demás contenido quedan ENCIMA de la figura. Sin ancho/alto
//   explícitos, cubre TODO el lienzo (fondo perfecto). Con
//   posicion: { arriba|abajo|izquierda|derecha } la ubicas (número px
//   o CSS). Ejemplos:
//     // fondo suave de toda la lámina:
//     crearSvg({ figura: "rectangulo-redondeado", debajo: true,
//       color: "amarillo", estilo: "relleno", opacidadRelleno: .12,
//       contenedor: lamina });
//     // sol decorado en la esquina:
//     crearSvg({ figura: "sol", debajo: true, ancho: 120, alto: 120,
//       posicion: { arriba: -30, derecha: -20 }, estilo: "borde",
//       color: "naranja", contenedor: lamina });
//
// ─── CATÁLOGO DE FIGURAS (figurasDisponibles() las lista) ───
//   Líneas y divisorias: linea (horizontal), linea-v (vertical),
//     linea-flecha (→), linea-flecha-v (↓), linea-doble-flecha (↔),
//     linea-doble-flecha-v (↕), onda, onda-doble, arco
//   Básicas: rectangulo, rectangulo-redondeado, elipse, triangulo,
//     triangulo-rectangulo, trapecio, paralelogramo, rombo,
//     semicirculo, cuarto-circulo, anillo, cruz, aspa
//   Estrellas: estrella-4, estrella-5, estrella-6, estrella-8,
//     estrella-12, estrella-16, explosion, sol
//   Figuradas: corazon, nube, luna, relampago, gota, prohibido,
//     cilindro, cubo, cinta, globo, globo-ovalo
//   Flechas de bloque: flecha-derecha, flecha-izquierda, flecha-arriba,
//     flecha-abajo, flecha-doble
//   Alias cómodos: rect, cuadrado, fondo, fondo-redondeado, circulo,
//     ovalo, estrella, flecha, flecha-izq, doble-flecha, dona,
//     media-luna, rayo, signo-mas, bocadillo…
//   (Acepta mayúsculas/minúsculas y sin tildes: "Estrella 5", "CORAZON".)
//
// ─── TIPOS DE COLOR (estilo) ───
//   "ambos"  (defecto) → relleno suave del color + borde del color
//   "borde"            → sin relleno, solo el borde
//   "relleno"          → solo relleno sólido, sin borde
//   En las LÍNEAS el color siempre va al trazo (ahí no hay relleno).
//   Colores por nombre: rojo, azul, verde, naranja, morado, gris,
//   amarillo, rosa, celeste, turquesa, lima, negro, blanco — o cualquier
//   valor CSS (#7c3aed, rgb(…), var(…)…). Solo aplican a FIGURAS: si
//   pasas `codigo` SVG, el color es el que tenga tu código.
//
// ─── PARÁMETROS (crearSvg({ … })) ───
//   figura           Nombre del catálogo (defecto "rectangulo").
//   codigo           SVG crudo del usuario. CON etiquetas <svg> se
//                    inserta TAL CUAL (cualquier forma definida por
//                    ti: se respetan su width/height/viewBox, su
//                    gradientes, clases y estilos; solo se estira al
//                    tamaño pedido si pasas ancho/alto, o si es fondo
//                    con debajo). SIN etiquetas se envuelve en un
//                    <svg> nuestro (usa vista para su coordenadas).
//                    Gana sobre `figura`. También llega como opc.svg.
//   vista            viewBox para el SVG crudo SIN etiquetas
//                    (ej. "0 0 24 24"; defecto "0 0 100 100").
//   ancho, alto      Escala: número (px), fracción 0..1 (%) o CSS.
//                    Sin ancho → bloque entero. Sin alto → 150px
//                    (las líneas: 12px). Con debajo → 100% × 100%.
//   color            Color base (solo figuras). Defecto "morado".
//   estilo           "ambos" | "borde" | "relleno" (defecto "ambos").
//   grosor           Grosor del borde en px (defecto 2).
//   trazo            "solido" | "punteado" | "guiones" (defecto solido).
//   opacidadRelleno  Opacidad del relleno en "ambos" (defecto .18).
//                    En "relleno" queda 1 salvo que la cambies.
//   opacidad         Opacidad de TODA la figura (0..1, defecto 1).
//   debajo           true → detrás del contenido (ver arriba).
//   posicion         { arriba, abajo, izquierda, derecha } con debajo.
//   centrado         true → centrada horizontalmente en su bloque.
//   contenedor       Si se pasa, la figura se agrega ahí.
//
// ─── DEVUELVE ─── el <div class="comp-svg"> con métodos encadenables:
//   .setColor(c)            cambia el color
//   .setEstilo(e)           "ambos"|"borde"|"relleno"
//   .setGrosor(px)          grosor del borde
//   .setTrazo(t)            "solido"|"punteado"|"guiones"
//   .setTamano(ancho, alto) cambia la escala
//   .setPosicion({...})     mueve la figura (modos debajo)
//   .setOpacidad(0..1)
//   .figura                 nombre usado ("codigo" si fue SVG crudo)
//
// USO directo como divisoria:
//   import { crearSvg, figurasDisponibles, hacerLienzo }
//     from "../../../js/componentes/svg.js";
//   crearSvg({ figura: "linea", color: "morado", grosor: 3, ancho: .8,
//     centrado: true, contenedor: zona });
//   crearSvg({ figura: "linea-flecha", ancho: "100%", alto: 14,
//     color: "azul", trazo: "guiones", contenedor: zona });
// ============================================================

import { inyectarEstilos, aplicarAncho } from "./base.js";

/* ---------------- Estilos compartidos de las formas ----------------
   Los colores viajan en VARIABLES CSS del wrapper, así .setColor() no
   re-dibuja nada: solo cambia la variable. El borde usa
   vector-effect="non-scaling-stroke" para NO deformarse cuando la
   figura se estira (la forma sí se estira, como en Word). */

const VE = 'vector-effect="non-scaling-stroke"';
const S = "fill:var(--fig-relleno);fill-opacity:var(--fig-op-rel,1);stroke:var(--fig-borde);stroke-width:var(--fig-grosor,2px);stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:var(--fig-trazo,none)";
const T = "fill:none;stroke:var(--fig-borde);stroke-width:var(--fig-grosor,2px);stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:var(--fig-trazo,none)";
const P = "fill:var(--fig-borde);stroke:none"; // relleno sólido (puntas)

const el = (tag, attrs, estilo = S) =>
  `<${tag} ${attrs} style="${estilo}" ${VE}/>`;
const poly = (puntos, extra = "") =>
  `<polygon ${extra} points="${puntos}" style="${S}" ${VE}/>`;
const trazo = (d) => `<path d="${d}" style="${T}" ${VE}/>`;

/* ---------------- Catálogo (formas en 100×100, se estiran) ---------------- */

function poligonoPts(n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((Math.PI * 2) / n) * i - Math.PI / 2;
    pts.push((50 + 48 * Math.cos(a)).toFixed(2) + "," + (50 + 48 * Math.sin(a)).toFixed(2));
  }
  return pts.join(" ");
}

function estrellaPts(puntas, interior = 0.42) {
  const pts = [];
  for (let i = 0; i < puntas * 2; i++) {
    const r = i % 2 === 0 ? 48 : 48 * interior;
    const a = (Math.PI / puntas) * i - Math.PI / 2;
    pts.push((50 + r * Math.cos(a)).toFixed(2) + "," + (50 + r * Math.sin(a)).toFixed(2));
  }
  return pts.join(" ");
}

function solFigura() {
  let rayos = "";
  for (let i = 0; i < 12; i++) {
    const a = ((Math.PI * 2) / 12) * i;
    rayos +=
      "M" + (50 + 30 * Math.cos(a)).toFixed(1) + "," + (50 + 30 * Math.sin(a)).toFixed(1)
      + " L" + (50 + 45 * Math.cos(a)).toFixed(1) + "," + (50 + 45 * Math.sin(a)).toFixed(1) + " ";
  }
  return el("circle", 'cx="50" cy="50" r="23"') + trazo(rayos);
}

/* Puntas de flecha para las líneas (en px reales del lienzo) */
function punta(x, y, dir) {
  const L = 9, A = 5;
  if (dir === "der") return poly2(`${x},${y} ${x - L},${y - A} ${x - L},${y + A}`);
  if (dir === "izq") return poly2(`${x},${y} ${x + L},${y - A} ${x + L},${y + A}`);
  if (dir === "aba") return poly2(`${x},${y} ${x - A},${y - L} ${x + A},${y - L}`);
  return poly2(`${x},${y} ${x - A},${y + L} ${x + A},${y + L}`);
}
const poly2 = (p) => `<polygon points="${p}" style="${P}"/>`;

const CATALOGO = {
  /* ── Líneas y divisorias (se dibujan a px reales) ── */
  linea: (w, h) => `<line x1="1" y1="${h / 2}" x2="${w - 1}" y2="${h / 2}" style="${T}" ${VE}/>`,
  "linea-v": (w, h) => `<line x1="${w / 2}" y1="1" x2="${w / 2}" y2="${h - 1}" style="${T}" ${VE}/>`,
  "linea-flecha": (w, h) => {
    const c = h / 2;
    return `<line x1="1" y1="${c}" x2="${w - 8}" y2="${c}" style="${T}" ${VE}/>` + punta(w, c, "der");
  },
  "linea-flecha-v": (w, h) => {
    const c = w / 2;
    return `<line x1="${c}" y1="1" x2="${c}" y2="${h - 8}" style="${T}" ${VE}/>` + punta(c, h, "aba");
  },
  "linea-doble-flecha": (w, h) => {
    const c = h / 2;
    return `<line x1="8" y1="${c}" x2="${w - 8}" y2="${c}" style="${T}" ${VE}/>`
      + punta(w, c, "der") + punta(0, c, "izq");
  },
  "linea-doble-flecha-v": (w, h) => {
    const c = w / 2;
    return `<line x1="${c}" y1="8" x2="${c}" y2="${h - 8}" style="${T}" ${VE}/>`
      + punta(c, h, "aba") + punta(c, 0, "arr");
  },
  onda: (w, h) => {
    const y = h / 2, a = Math.max(2, y - 1);
    return trazo(`M1,${y} Q${(w * 0.25).toFixed(1)},${y - a} ${(w / 2).toFixed(1)},${y} T${w - 1},${y}`);
  },
  "onda-doble": (w, h) => {
    const y1 = h * 0.32, y2 = h * 0.68, a = Math.max(2, h * 0.18);
    return trazo(`M1,${y1.toFixed(1)} Q${(w * 0.25).toFixed(1)},${(y1 - a).toFixed(1)} ${(w / 2).toFixed(1)},${y1.toFixed(1)} T${w - 1},${y1.toFixed(1)}`)
      + trazo(`M1,${y2.toFixed(1)} Q${(w * 0.25).toFixed(1)},${(y2 - a).toFixed(1)} ${(w / 2).toFixed(1)},${y2.toFixed(1)} T${w - 1},${y2.toFixed(1)}`);
  },
  arco: (w, h) =>
    trazo(`M1,${h - 1} A${((w - 2) / 2).toFixed(1)},${Math.max(2, h - 2)} 0 0 1 ${w - 1},${h - 1}`),

  /* ── Básicas ── */
  rectangulo: () => el("rect", 'x="2" y="2" width="96" height="96"'),
  "rectangulo-redondeado": () => el("rect", 'x="2" y="2" width="96" height="96" rx="14" ry="14"'),
  elipse: () => el("ellipse", 'cx="50" cy="50" rx="48" ry="48"'),
  triangulo: () => poly("50,3 97,95 3,95"),
  "triangulo-rectangulo": () => poly("3,3 3,95 97,95"),
  trapecio: () => poly("20,4 80,4 96,96 4,96"),
  paralelogramo: () => poly("24,4 97,4 76,96 3,96"),
  rombo: () => poly("50,2 98,50 50,98 2,50"),
  semicirculo: () => `<path d="M2,50 A48,48 0 0 1 98,50 Z" style="${S}" ${VE}/>`,
  "cuarto-circulo": () => `<path d="M4,96 L4,8 A88,88 0 0 1 92,96 Z" style="${S}" ${VE}/>`,
  anillo: () =>
    `<path fill-rule="evenodd" d="M50,2 A48,48 0 1 0 50,98 A48,48 0 1 0 50,2 Z M50,30 A20,20 0 1 1 50,70 A20,20 0 1 1 50,30 Z" style="${S}" ${VE}/>`,
  cruz: () => poly("36,2 64,2 64,36 98,36 98,64 64,64 64,98 36,98 36,64 2,64 2,36 36,36"),
  aspa: () => trazo("M6,6 L94,94 M94,6 L6,94"),

  /* ── Estrellas ── */
  "estrella-4": () => poly(estrellaPts(4, 0.32)),
  "estrella-5": () => poly(estrellaPts(5)),
  "estrella-6": () => poly(estrellaPts(6)),
  "estrella-8": () => poly(estrellaPts(8, 0.45)),
  "estrella-12": () => poly(estrellaPts(12, 0.55)),
  "estrella-16": () => poly(estrellaPts(16, 0.62)),
  explosion: () => poly(estrellaPts(12, 0.3)),
  sol: solFigura,

  /* ── Figuradas ── */
  corazon: () =>
    `<path d="M50,88 C20,64 4,46 4,28 C4,14 15,4 28,4 C37,4 45,9 50,17 C55,9 63,4 72,4 C85,4 96,14 96,28 C96,46 80,64 50,88 Z" style="${S}" ${VE}/>`,
  nube: () =>
    `<path d="M18,72 A16,16 0 0 1 18,40 A20,20 0 0 1 60,30 A18,18 0 0 1 82,72 Z" style="${S}" ${VE}/>`,
  luna: () =>
    `<path fill-rule="evenodd" d="M62,4 A46,46 0 1 0 62,96 A38,38 0 1 1 62,4 Z" style="${S}" ${VE}/>`,
  relampago: () => poly("58,2 22,54 44,54 34,98 78,42 54,42"),
  gota: () =>
    `<path d="M50,4 C50,4 14,46 14,66 A36,36 0 0 0 86,66 C86,46 50,4 50,4 Z" style="${S}" ${VE}/>`,
  prohibido: () => el("circle", 'cx="50" cy="50" r="46"') + trazo("M20,80 L80,20"),
  cilindro: () =>
    `<path d="M6,18 H94 V82 A44,12 0 0 1 6,82 Z" style="${S}" ${VE}/>`
    + el("ellipse", 'cx="50" cy="18" rx="44" ry="12"'),
  cubo: () =>
    poly("6,22 20,4 94,4 80,22") + poly("80,22 94,4 94,78 80,96") + poly("6,22 80,22 80,96 6,96"),
  cinta: () =>
    poly("2,8 14,8 14,56 2,56 8,32") + poly("86,8 98,8 98,56 86,56 92,32")
    + el("rect", 'x="8" y="14" width="84" height="36"'),
  globo: () =>
    `<path d="M10,4 H90 Q98,4 98,12 V56 Q98,64 90,64 H40 L20,92 L30,64 H10 Q2,64 2,56 V12 Q2,4 10,4 Z" style="${S}" ${VE}/>`,
  "globo-ovalo": () =>
    `<path d="M36,62 L22,92 L56,66 Z" style="${S}" ${VE}/>`
    + el("ellipse", 'cx="50" cy="36" rx="46" ry="30"'),

  /* ── Flechas de bloque ── */
  "flecha-derecha": () => poly("2,32 60,32 60,12 98,50 60,88 60,68 2,68"),
  "flecha-izquierda": () => poly("2,32 60,32 60,12 98,50 60,88 60,68 2,68", 'transform="rotate(180 50 50)"'),
  "flecha-arriba": () => poly("2,32 60,32 60,12 98,50 60,88 60,68 2,68", 'transform="rotate(-90 50 50)"'),
  "flecha-abajo": () => poly("2,32 60,32 60,12 98,50 60,88 60,68 2,68", 'transform="rotate(90 50 50)"'),
  "flecha-doble": () => poly("2,50 20,32 20,42 80,42 80,32 98,50 80,68 80,58 20,58 20,68"),
};

/* ---------------- Nombres: normalización y alias ---------------- */

const LINEALES = new Set([
  "linea", "linea-v", "linea-flecha", "linea-flecha-v",
  "linea-doble-flecha", "linea-doble-flecha-v", "onda", "onda-doble", "arco",
]);

const ALIAS = {
  "linea-horizontal": "linea", "linea-h": "linea",
  "linea-vertical": "linea-v",
  rect: "rectangulo", cuadrado: "rectangulo", fondo: "rectangulo",
  "fondo-redondeado": "rectangulo-redondeado", redondeado: "rectangulo-redondeado",
  circulo: "elipse", ovalo: "elipse", circunferencia: "elipse",
  "triangulo-rect": "triangulo-rectangulo",
  estrella: "estrella-5", estrella5: "estrella-5",
  flecha: "flecha-derecha", "flecha-der": "flecha-derecha",
  "flecha-izq": "flecha-izquierda",
  "doble-flecha": "flecha-doble",
  "flecha-linea": "linea-flecha", "linea-con-flecha": "linea-flecha",
  "linea-flecha-vertical": "linea-flecha-v",
  "linea-doble": "linea-doble-flecha", "doble-flecha-linea": "linea-doble-flecha",
  "signo-mas": "cruz", mas: "cruz",
  dona: "anillo",
  "media-luna": "luna",
  rayo: "relampago",
  bocadillo: "globo", "globo-dialogo": "globo",
};

function normalizarNombre(nombre) {
  return String(nombre ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function resolverFigura(nombre) {
  const n = normalizarNombre(nombre);
  if (!n) return null;
  return CATALOGO[n] ? n : ALIAS[n] || null;
}

/** Lista de todas las figuras disponibles (para documentar/menus). */
export function figurasDisponibles() {
  return Object.keys(CATALOGO).sort();
}

/* ---------------- Colores por nombre del proyecto ---------------- */

const NOMBRES_COLOR = {
  rojo: "#dc2626", azul: "#2563eb", verde: "#16a34a", naranja: "#ea580c",
  morado: "#7c3aed", gris: "#6b7280", amarillo: "#eab308", rosa: "#db2777",
  celeste: "#0ea5e9", turquesa: "#0d9488", lima: "#65a30d",
  negro: "#111827", blanco: "#ffffff",
};

function resolverColor(color, defecto) {
  if (color == null || color === "") return defecto;
  const n = normalizarNombre(color);
  return NOMBRES_COLOR[n] || String(color).trim();
}

/* ---------------- CSS implícito ---------------- */

function estilos() {
  inyectarEstilos(
    "comp-svg-estilos",
    `
    .comp-svg {
      position: relative;
      display: block;
      max-width: 100%;
      margin: .8rem 0;
      font-size: 0;
      line-height: 0;
    }
    .comp-svg svg { display: block; }
    /* Solo el svg GENERADO aquí se estira al wrapper. El código crudo
       del usuario respeta su propio width/height/viewBox (v2). */
    .comp-svg > svg.comp-svg-propio {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .comp-svg-centrado { margin-left: auto; margin-right: auto; }
    /* POR DEBAJO del contenido (como "Detrás del texto" de Word):
       absoluta, detrás (z-index -1) y sin capturar clics. El padre se
       convierte en lienzo con hacerLienzo() para que el -1 no caiga
       por detrás del fondo del padre. */
    .comp-svg-fondo {
      position: absolute;
      z-index: -1;
      margin: 0 !important;
      pointer-events: none;
    }
  `
  );
}

/* ---------------- Medidas y posición ---------------- */

function resolverMedida(valor) {
  if (valor == null || valor === "") return null;
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor > 0 ? valor + "px" : null;
  }
  const texto = String(valor).trim();
  return texto || null;
}

function aplicarPosicion(elWrapper, posicion) {
  if (!posicion || typeof posicion !== "object") return;
  const mapa = { arriba: "top", abajo: "bottom", izquierda: "left", derecha: "right" };
  Object.keys(mapa).forEach((clave) => {
    const v = posicion[clave];
    if (v == null || v === "") return;
    elWrapper.style[mapa[clave]] =
      typeof v === "number" && Number.isFinite(v) ? v + "px" : String(v);
  });
}

/**
 * Convierte un contenedor en LIENZO para figuras `debajo: true`:
 * aísla su apilamiento y lo vuelve relativo, de modo que la figura
 * con z-index -1 queda ENCIMA del fondo del lienzo pero DEBAJO de su
 * contenido. (Se llama sola cuando usas `contenedor`.)
 */
export function hacerLienzo(elLienzo) {
  if (!elLienzo || elLienzo === document.documentElement) return;
  if (getComputedStyle(elLienzo).position === "static") elLienzo.style.position = "relative";
  elLienzo.style.isolation = "isolate";
}

/* ---------------- Componente ---------------- */

export function crearSvg(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const codigo = String(opc.codigo ?? opc.svg ?? "").trim();
  const codigoConEtiquetas = /<svg[\s>]/i.test(codigo);
  const nombreFigura = resolverFigura(opc.figura ?? (codigo ? null : "rectangulo"));
  if (!codigo && opc.figura != null && !nombreFigura) {
    console.warn("[svg.js] Figura desconocida: \"" + opc.figura + "\". Usa figurasDisponibles(). Se dibuja un rectángulo.");
  }
  const fig = codigo ? null : nombreFigura || "rectangulo";
  const esLineal = !codigo && LINEALES.has(fig);

  const wrapper = document.createElement("div");
  wrapper.className = "comp-svg" + (opc.debajo ? " comp-svg-fondo" : "");
  if (opc.centrado) wrapper.classList.add("comp-svg-centrado");
  aplicarPosicion(wrapper, opc.posicion);

  // Tamaño: debajo → cubre el lienzo; líneas → flaca; SVG crudo con
  // etiquetas → el que tenga; resto → 150px
  aplicarAncho(wrapper, opc.ancho ?? (opc.debajo ? "100%" : null));
  const defectoAlto = opc.debajo ? "100%"
    : esLineal ? "12px"
    : codigoConEtiquetas ? "auto"
    : "150px";
  const altoCSS = resolverMedida(opc.alto ?? defectoAlto);
  if (altoCSS) wrapper.style.height = altoCSS;
  if (opc.opacidad != null) {
    const n = Number(opc.opacidad);
    if (Number.isFinite(n)) wrapper.style.opacity = String(Math.min(1, Math.max(0, n)));
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "comp-svg-propio"); // solo ESTE se estira
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("preserveAspectRatio", "none");
  wrapper.append(svg);

  // ---- Estado de color (variables CSS: cambiarlas NO re-dibuja) ----
  const estado = {
    color: resolverColor(opc.color, "#7c3aed"),
    estilo: ["ambos", "borde", "relleno"].includes(String(opc.estilo ?? "ambos").toLowerCase())
      ? String(opc.estilo).toLowerCase()
      : "ambos",
    grosor: Math.max(0.5, Number(opc.grosor) || 2),
    trazo: String(opc.trazo ?? "solido").toLowerCase(),
    opRelleno: Number.isFinite(Number(opc.opacidadRelleno)) && opc.opacidadRelleno != null
      ? Number(opc.opacidadRelleno)
      : null,
  };

  const pintarVars = () => {
    const relleno = esLineal || estado.estilo === "borde" ? "none" : estado.color;
    const borde = estado.estilo === "relleno" && !esLineal ? "none" : estado.color;
    const opRel = estado.opRelleno != null
      ? estado.opRelleno
      : estado.estilo === "ambos" && !esLineal ? 0.18 : 1;
    const trazos = { solido: "none", punteado: "0.1 6", puntos: "0.1 6", guiones: "11 7" };
    wrapper.style.setProperty("--fig-relleno", relleno);
    wrapper.style.setProperty("--fig-borde", borde);
    wrapper.style.setProperty("--fig-op-rel", String(opRel));
    wrapper.style.setProperty("--fig-grosor", estado.grosor + "px");
    wrapper.style.setProperty("--fig-trazo", trazos[estado.trazo] ?? "none");
  };

  // ---- Pintado ----
  const pintarFigura = () => {
    if (esLineal) {
      // viewBox en px reales: líneas y ondas perfectas a cualquier ancho
      const w = Math.max(1, Math.round(wrapper.clientWidth || 1));
      const h = Math.max(1, Math.round(wrapper.clientHeight || 1));
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.innerHTML = CATALOGO[fig](w, h);
    } else {
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.innerHTML = CATALOGO[fig]();
    }
  };

  // Las líneas se re-dibujan si el ancho cambia (ventana, contenedor…)
  const observarTamano = () => {
    if ("ResizeObserver" in window) {
      const obs = new ResizeObserver(() => pintarFigura());
      obs.observe(wrapper);
    } else {
      let intentos = 0;
      const probar = () => {
        pintarFigura();
        if (wrapper.clientWidth < 2 && ++intentos < 300) requestAnimationFrame(probar);
      };
      requestAnimationFrame(probar);
    }
  };

  if (codigo) {
    // SVG crudo del usuario:
    //  · CON etiquetas <svg> → se inserta TAL CUAL (sus gradientes,
    //    clases y medidas se respetan). Solo se estira al wrapper si
    //    pediste ancho/alto o si es fondo (debajo: true).
    //  · SIN etiquetas → se envuelve en el <svg> nuestro; su sistema
    //    de coordenadas va en `vista` (defecto "0 0 100 100").
    if (codigoConEtiquetas) {
      wrapper.innerHTML = codigo;
      const suyo = wrapper.querySelector("svg");
      if (suyo) {
        suyo.style.display = "block";
        suyo.style.maxWidth = "100%";
        const vb = (suyo.getAttribute("viewBox") || "").trim();
        const wAttr = suyo.getAttribute("width");
        const hAttr = suyo.getAttribute("height");
        if (opc.ancho != null || opc.alto != null || opc.debajo) {
          // Escala pedida (o fondo que cubre el lienzo)
          suyo.style.width = "100%";
          suyo.style.height = "100%";
          if (vb) suyo.setAttribute("preserveAspectRatio", "none");
        } else if (vb && wAttr == null && hAttr == null) {
          // Solo viewBox → proporcional: el wrapper toma su forma
          const p = vb.split(/[\s,]+/).map(Number);
          if (p.length === 4 && p[2] > 0 && p[3] > 0) {
            wrapper.style.aspectRatio = p[2] + " / " + p[3];
            suyo.style.width = "100%";
            suyo.style.height = "100%";
          }
        }
        // Con width/height PROPIOS → se respetan tal cual
      }
    } else {
      const vista = String(opc.vista ?? opc.viewBox ?? "").trim();
      svg.setAttribute("viewBox", vista || "0 0 100 100");
      svg.innerHTML = codigo;
    }
  } else {
    pintarVars();
    pintarFigura();
    if (esLineal) observarTamano();
  }

  // ---- Métodos encadenables ----
  wrapper.setColor = (c) => { estado.color = resolverColor(c, estado.color); pintarVars(); return wrapper; };
  wrapper.setEstilo = (e) => {
    const v = String(e ?? "").toLowerCase();
    if (["ambos", "borde", "relleno"].includes(v)) { estado.estilo = v; pintarVars(); }
    return wrapper;
  };
  wrapper.setGrosor = (g) => { estado.grosor = Math.max(0.5, Number(g) || 2); pintarVars(); return wrapper; };
  wrapper.setTrazo = (t) => { estado.trazo = String(t ?? "solido").toLowerCase(); pintarVars(); return wrapper; };
  wrapper.setTamano = (ancho, alto) => {
    aplicarAncho(wrapper, ancho);
    const h = resolverMedida(alto);
    if (h) wrapper.style.height = h;
    return wrapper;
  };
  wrapper.setPosicion = (p) => { aplicarPosicion(wrapper, p); return wrapper; };
  wrapper.setOpacidad = (o) => {
    const n = Number(o);
    if (Number.isFinite(n)) wrapper.style.opacity = String(Math.min(1, Math.max(0, n)));
    return wrapper;
  };
  Object.defineProperty(wrapper, "figura", {
    get: () => (codigo ? "codigo" : fig),
  });

  // ---- Insertar (y preparar lienzo si va por debajo) ----
  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    if (opc.debajo) hacerLienzo(opc.contenedor);
    opc.contenedor.appendChild(wrapper);
  } else if (opc.debajo) {
    // sin contenedor: en cuanto la cuelguen, preparar el padre
    let intentos = 0;
    const esperar = () => {
      if (wrapper.isConnected) hacerLienzo(wrapper.parentElement);
      else if (++intentos < 600) requestAnimationFrame(esperar);
    };
    requestAnimationFrame(esperar);
  }

  return wrapper;
}