// ============================================================
// generador-graficos-universal.js — Recurso visual:
// GENERADOR UNIVERSAL DE GRÁFICOS · v2
// (recursos/js/visuales/generador-graficos-universal.js)
//
// Dibuja gráficos PURAMENTE VISUALES en SVG nativo (cero librerías,
// cero imports, cero eventos) y los muestra DIRECTAMENTE en la
// página: el dibujo se construye con matemática propia (escalas,
// ángulos, agrupaciones) y, si no se pasa «contenedor», se agrega
// solo a la página principal (<main>, #app o <body>).
//
// ─── LOS 15 TIPOS ───
//   columnas · barras (horizontales) · barras-agrupadas · lineas ·
//   lineas-temporales · area · pastel · dona · barras-apiladas ·
//   dispersion · burbujas · histograma · radar · velas · cascada
//   Aceptan variantes sin tilde, con guiones/espacios y alias
//   comunes ("pie", "torta", "donut", "scatter", "waterfall"…).
//
// ─── CONFIGURACIÓN (un solo objeto) ───
//   tipo                 Uno de los 15 · REQUERIDO.
//   modo                 "simple" (un dato por etiqueta) o
//                        "comparacion" (series múltiples: valores
//                        como ARREGLOS por etiqueta). Si llegan
//                        arreglos, la comparación se activa sola.
//                        (Defecto: "simple")
//   etiquetas            ["Ene","Feb",…] · REQUERIDO salvo que pases
//                        «x» (entonces el eje X es numérico y las
//                        etiquetas sobran) o salvo en dispersión y
//                        burbujas (ahí no se dibujan).
//   valores              Números (simple) o arreglos: series en
//                        comparación, [x,y] en dispersión,
//                        [x,y,tamaño] en burbujas y [apertura,
//                        cierre, máximo, mínimo] en velas.
//   x                    ARREGLO DE NÚMEROS para el eje X cuando
//                        él también es numérico (velocidad-tiempo,
//                        posición-tiempo, f(x)…). Solo en «lineas»
//                        y «area»; un valor de x por dato (o por
//                        fila de series). Sin «x», el eje queda
//                        por etiquetas como siempre.
//   series               Nombres de serie OPCIONALES en comparación
//                        (["2025","2026"]); sin ellos: "Serie 1…".
//   colores              Colores propios: por ETIQUETA en simple y
//                        por SERIE en comparación; los que falten
//                        usan la paleta del proyecto. En velas:
//                        [colorAlcista, colorBajista].
//   titulo               Título general. Si no llega NO se dibuja.
//   ejes                 { horizontal, vertical, min, max, paso,
//                        minX, maxX, pasoX, minH, maxH }.
//                        En pastel, dona y radar SE IGNORA todo.
//                        · min/max  → rango del eje de VALORES
//                          (vertical, u horizontal en «barras»);
//                          en dispersión/burbujas escala la Y.
//                        · paso     → ESCALA del eje de valores:
//                          separación exacta entre marcas (si no,
//                          pasos bonitos 1·2·5 automáticos).
//                        · minX/maxX → rango del eje X NUMÉRICO
//                          (con «x», y en dispersión/burbujas;
//                          minH/maxH siguen valiendo como alias).
//                        · pasoX    → escala del eje X numérico.
//                        · horizontal/vertical → nombres de eje
//                          (SOLO se dibujan si se piden).
//   mostrarCantidades    true → dibuja los valores. (Defecto: false)
//   mostrarPorcentajes   true → dibuja % usando «total» o, si no
//                        llega, la SUMA de los valores. (Defecto: false)
//   total                Total explícito para los porcentajes.
//   ancho                Ancho del dibujo en px. (Defecto: 560; el
//                        SVG encoge solo en pantallas angostas)
//   contenedor           HTMLElement opcional. Sin él, el gráfico
//                        se muestra directo en la página principal.
//
// ─── REGLAS VISUALES ───
//   · Se dibuja lo MÍNIMO indispensable para que el gráfico se
//     entienda: título, nombres de eje, cantidades, porcentajes y
//     leyendas SOLO si fueron pedidos (las cifras de la escala y
//     las etiquetas de datos siempre, porque sin ellas no se lee).
//   · PASTEL y DONA: NADA de texto dentro o sobre el círculo. Las
//     etiquetas con su muestra de color viven en una LEYENDA
//     SEPARADA, a un costado o abajo según el espacio.
//   · Estático: sin eventos ni animaciones.
//   · Configuración inválida → LANZA un Error con el motivo (igual
//     que calendario.js: mejor verlo al armar la clase que callarlo).
//
// ─── DEVUELVE ───
//   <div class="grafico-uni" data-tipo data-modo> con el <svg> dentro.
//
// ─── USO ───
//   import { dibujarGrafico } from
//     "../../../recursos/js/visuales/generador-graficos-universal.js";
//
//   dibujarGrafico({ tipo:"columnas", titulo:"Ventas",
//     etiquetas:["L","M","X"], valores:[3,7,5], mostrarCantidades:true });
//
//   // Velocidad contra tiempo: LOS DOS EJES NUMÉRICOS, con rango
//   // y escala pedidos (el área bajo la línea = distancia)
//   dibujarGrafico({ tipo:"lineas", titulo:"MRU",
//     x:[0,1,2,3,4,5], valores:[0,10,20,30,40,50],
//     ejes:{ horizontal:"Tiempo (s)", vertical:"Velocidad (m/s)",
//       min:0, max:50, paso:10, minX:0, maxX:5, pasoX:1 } });
//
//   dibujarGrafico({ tipo:"pastel", etiquetas:["A","B"], valores:[6,4],
//     mostrarPorcentajes:true, contenedor: zona });
// ============================================================

/* ---------------- CSS implícito ---------------- */

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "visuales-graficos-estilos";
  estilo.textContent = `
    .grafico-uni { max-width: 100%; font-family: Arial, Helvetica, sans-serif; }
    .grafico-uni svg { display: block; max-width: 100%; height: auto; }
  `;
  document.head.append(estilo);
}

/* ---------------- Constantes ---------------- */

const FAMILIA = "Arial, Helvetica, sans-serif";
const C_TEXTO = "#1e293b";   // texto principal
const C_SUAVE = "#64748b";   // cifras de escala y nombres de eje
const C_REJILLA = "#e2e8f0"; // líneas de rejilla
const C_EJE = "#94a3b8";     // ejes
const C_TOTAL = "#475569";   // barra «Total» de la cascada

const PALETA = [
  "#7c3aed", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#6366f1",
  "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4", "#a855f7",
];

const NOMBRES_TIPO = {
  "columnas": "columnas", "barras": "barras horizontales",
  "barras-agrupadas": "barras agrupadas", "lineas": "líneas",
  "lineas-temporales": "líneas temporales", "area": "área",
  "pastel": "pastel", "dona": "dona",
  "barras-apiladas": "barras apiladas", "dispersion": "dispersión",
  "burbujas": "burbujas", "histograma": "histograma", "radar": "radar",
  "velas": "velas japonesas", "cascada": "cascada",
};

const ALIAS_TIPO = {
  "columnas": "columnas", "columna": "columnas",
  "barras": "barras", "barra": "barras", "barras-horizontales": "barras",
  "barras-agrupadas": "barras-agrupadas", "agrupadas": "barras-agrupadas",
  "columnas-agrupadas": "barras-agrupadas",
  "lineas": "lineas", "linea": "lineas",
  "lineas-temporales": "lineas-temporales", "linea-temporal": "lineas-temporales",
  "temporal": "lineas-temporales", "linea-de-tiempo": "lineas-temporales",
  "lineas-de-tiempo": "lineas-temporales", "serie-temporal": "lineas-temporales",
  "area": "area", "areas": "area",
  "pastel": "pastel", "pie": "pastel", "torta": "pastel", "circular": "pastel",
  "dona": "dona", "donut": "dona", "anillo": "dona",
  "barras-apiladas": "barras-apiladas", "apiladas": "barras-apiladas",
  "columnas-apiladas": "barras-apiladas", "apilado": "barras-apiladas",
  "dispersion": "dispersion", "scatter": "dispersion", "puntos": "dispersion",
  "burbujas": "burbujas", "burbuja": "burbujas", "bubble": "burbujas",
  "histograma": "histograma", "histogram": "histograma",
  "radar": "radar", "arana": "radar", "telarana": "radar",
  "velas": "velas", "vela": "velas", "velas-japonesas": "velas",
  "candlestick": "velas", "ohlc": "velas",
  "cascada": "cascada", "waterfall": "cascada", "puente": "cascada",
};

/* ---------------- Utilidades ---------------- */

const r2 = (n) => Math.round(n * 100) / 100;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function numeroSeguro(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function sinTildes(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Números con máximo 2 decimales, sin ceros de más. */
function fmtNum(n) {
  if (!Number.isFinite(n)) return "—";
  return String(r2(n));
}

/** Porcentaje legible: 26 → "26%" · 25.5 → "25.5%". */
function fmtPct(p) {
  const r = r2(p);
  return (r % 1 === 0 ? String(Math.round(r)) : String(r)) + "%";
}

/** Ancho estimado de un texto (Arial ≈ 0.6·tamaño por carácter). */
function estimarAncho(texto, tam) {
  return String(texto).length * tam * 0.6;
}

/** Recorta con «…» para que quepa en maxPx. */
function recortar(texto, maxPx, tam) {
  if (estimarAncho(texto, tam) <= maxPx) return texto;
  let s = String(texto);
  while (s.length > 1 && estimarAncho(s + "…", tam) > maxPx) s = s.slice(0, -1);
  return s + "…";
}

function normalizarTipo(t) {
  const clave = sinTildes(t || "").trim().replace(/[\s_]+/g, "-");
  const tipo = ALIAS_TIPO[clave];
  if (!tipo) {
    throw new Error('generador-graficos: tipo desconocido («' + (t || "") + "»). Válidos: " +
      Object.keys(NOMBRES_TIPO).join(", ") + ".");
  }
  return tipo;
}

/* ---------------- Primitivas SVG ---------------- */

function txt(x, y, contenido, o = {}) {
  return '<text x="' + r2(x) + '" y="' + r2(y) + '" text-anchor="' + (o.ancla || "middle") +
    '" font-family="' + FAMILIA + '" font-size="' + (o.tam || 12) + '"' +
    (o.peso ? ' font-weight="' + o.peso + '"' : "") +
    ' fill="' + (o.color || C_TEXTO) + '"' +
    (o.rot ? ' transform="rotate(' + o.rot + " " + r2(x) + " " + r2(y) + ')"' : "") +
    ">" + esc(contenido) + "</text>";
}

function linea(x1, y1, x2, y2, color, grosor, dash) {
  return '<line x1="' + r2(x1) + '" y1="' + r2(y1) + '" x2="' + r2(x2) + '" y2="' + r2(y2) +
    '" stroke="' + color + '" stroke-width="' + (grosor || 1) + '"' +
    (dash ? ' stroke-dasharray="' + dash + '"' : "") + " />";
}

function recta(x, y, w, h, fill, rx) {
  if (h < 0) { y += h; h = -h; }
  return '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(Math.max(0, w)) +
    '" height="' + r2(Math.max(0, h)) + '" fill="' + fill + '"' +
    (rx ? ' rx="' + rx + '"' : "") + " />";
}

function circulo(cx, cy, r, fill, op, stroke, sw) {
  return '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="' + fill + '"' +
    (op != null ? ' fill-opacity="' + op + '"' : "") +
    (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 1) + '"' : "") + " />";
}

function polilinea(puntos, color, grosor) {
  if (puntos.length < 2) return "";
  return '<polyline points="' + puntos.map((p) => r2(p[0]) + "," + r2(p[1])).join(" ") +
    '" fill="none" stroke="' + color + '" stroke-width="' + grosor +
    '" stroke-linejoin="round" stroke-linecap="round" />';
}

function poligono(puntos, fill, op, stroke, grosor) {
  return '<polygon points="' + puntos.map((p) => r2(p[0]) + "," + r2(p[1])).join(" ") +
    '" fill="' + fill + '" fill-opacity="' + op + '"' +
    (stroke ? ' stroke="' + stroke + '" stroke-width="' + grosor + '"' : "") +
    ' stroke-linejoin="round" />';
}

/* ---------------- Escalas «bonitas» ---------------- */

function pasoBonito(crudo) {
  if (!Number.isFinite(crudo) || crudo <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(crudo)));
  const n = crudo / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

/**
 * Devuelve { min, max, paso, ticks } para un rango de datos.
 * minF/maxF (ejes.min / ejes.max) mandan si llegan; pasoF (ejes.paso
 * o ejes.pasoX) fija la ESCALA exacta entre marcas si llega; ceroBase
 * ancla el cero (columnas, áreas, cascada…); si no hay nada fijo, se
 * usa el rango con pasos 1·2·5 redondeados hacia afuera.
 */
function escalaBonita(minD, maxD, minF, maxF, ceroBase, pasoF) {
  let min, max;
  const fijo = Number.isFinite(minF) || Number.isFinite(maxF);
  if (fijo) {
    min = Number.isFinite(minF) ? minF : (ceroBase ? Math.min(0, minD) : minD);
    max = Number.isFinite(maxF) ? maxF : (ceroBase ? Math.max(0, maxD) : maxD);
  } else if (ceroBase) {
    min = Math.min(0, minD);
    max = Math.max(0, maxD);
  } else {
    min = minD; max = maxD;
    if (min === max) { min -= 1; max += 1; }
  }
  if (max - min <= 0) max = min + 1;
  const paso = Number.isFinite(pasoF) && pasoF > 0
    ? pasoF
    : pasoBonito((max - min) / 4);
  if (!fijo) {
    min = Math.floor(min / paso) * paso;
    max = Math.ceil(max / paso) * paso;
    if (max === min) max = min + paso;
  }
  const ticks = [];
  for (let t = min, g = 0; t <= max + paso / 2 && g < 30; t += paso, g++) ticks.push(r2(t));
  return { min, max, paso, ticks };
}

/* ---------------- Colores, leyendas y etiquetas ---------------- */

/** Color por índice: el pedido gana; si falta, paleta del proyecto. */
function colorDe(d, i) {
  const c = d.colores && d.colores[i];
  return typeof c === "string" && c.trim() ? c.trim() : PALETA[i % PALETA.length];
}

function mostrarLeyenda(d) {
  return d.tipo !== "pastel" && d.tipo !== "dona" &&
    (d.nSeries > 1 || d.serieExplicita);
}

/** Cuántas filas ocupa la leyenda de series (para reservar alto). */
function filasDeLeyenda(d, anchoMax) {
  if (!mostrarLeyenda(d)) return 0;
  let x = 0, filas = 1;
  for (let i = 0; i < d.nSeries; i++) {
    const w = 40 + estimarAncho(d.seriesNombres[i], 12);
    if (x > 0 && x + w > anchoMax) { x = 0; filas++; }
    x += w;
  }
  return filas;
}

/** Dibuja la leyenda de series: caja, línea o punto + nombre. */
function leyendaSeries(d, marcador, x0, y0, anchoMax) {
  let svg = "", x = x0, y = y0;
  for (let i = 0; i < d.nSeries; i++) {
    const w = 40 + estimarAncho(d.seriesNombres[i], 12);
    if (x > x0 && x + w - 18 > x0 + anchoMax) { x = x0; y += 21; }
    const color = colorDe(d, i);
    if (marcador === "linea") {
      svg += linea(x, y + 6, x + 16, y + 6, color, 2.5) + circulo(x + 8, y + 6, 3, color);
    } else if (marcador === "punto") {
      svg += circulo(x + 7, y + 6, 4.5, color);
    } else {
      svg += recta(x, y, 12, 12, color, 3);
    }
    svg += txt(x + 20, y + 10, d.seriesNombres[i], { ancla: "start", tam: 12 });
    x += w;
  }
  return svg;
}

/** ¿Las etiquetas del eje X caben derechas en su ranura? */
function rotacionPara(etiquetas, ranura) {
  return etiquetas.every((e) => estimarAncho(e, 11.5) <= Math.max(ranura - 8, 18)) ? 0 : -35;
}

/** Etiquetas del eje X (derechas o inclinadas −35°; en temporales
    solo se dibuja una de cada «pasoVer» para que no se pisen). */
function etiquetasX(d, centroDe, yBase, rot, pasoVer) {
  let svg = "";
  const y = yBase + (rot ? 12 : 16);
  for (let i = 0; i < d.etiquetas.length; i++) {
    if (pasoVer > 1 && i % pasoVer !== 0) continue;
    const x = centroDe(i);
    svg += rot
      ? txt(x + 2, y, d.etiquetas[i], { ancla: "end", tam: 11.5, rot: -35 })
      : txt(x, y, d.etiquetas[i], { tam: 11.5 });
  }
  return svg;
}

/** Nombres de eje (SOLO si fueron pedidos en «ejes»). */
function nombresEjes(d, izq, plotW, arriba, plotH, alto, verticalRotada) {
  let svg = "";
  if (d.ejes.vertical) {
    svg += verticalRotada
      ? txt(13, arriba + plotH / 2, d.ejes.vertical, { tam: 12, color: C_SUAVE, rot: -90 })
      : txt(izq - 10, arriba - 5, d.ejes.vertical, { ancla: "end", tam: 12, color: C_SUAVE });
  }
  if (d.ejes.horizontal) {
    svg += txt(izq + plotW / 2, alto - 4, d.ejes.horizontal, { tam: 12, color: C_SUAVE });
  }
  return svg;
}

/** Cantidad (y % si se pidieron) sobre/bajo el extremo de una barra. */
function etiquetaValor(d, v, cx, y, yMin, yMax) {
  const texto = d.mostrarCant && d.mostrarPct
    ? fmtNum(v) + " (" + d.pct(v) + ")"
    : (d.mostrarPct ? d.pct(v) : fmtNum(v));
  const encima = v >= 0;
  let yy = encima ? y - 6 : y + 15;
  let dentro = false;
  if (encima && yy < yMin + 9) { yy = y + 13; dentro = true; }
  if (!encima && yy > yMax - 4) { yy = y - 7; dentro = true; }
  return txt(cx, yy, texto, { tam: 10.5, peso: 600, color: dentro ? "#ffffff" : C_TEXTO });
}

/* ---------------- Normalización de la configuración ---------------- */

function normalizarDatos(cfg, tipo) {
  const nativos = tipo === "dispersion" || tipo === "burbujas" || tipo === "velas";
  let modo = /^comp/.test(sinTildes(cfg.modo || "")) ? "comparacion" : "simple";

  // Eje X NUMÉRICO (solo en líneas y área): llega «x» como números.
  // Con «x», las etiquetas dejan de ser obligatorias (el eje se
  // marca con la escala numérica, no con textos).
  const conX = (tipo === "lineas" || tipo === "area") &&
    Array.isArray(cfg.x) && cfg.x.length > 0;
  let xValores = null;
  if (conX) {
    xValores = cfg.x.map((v) => numeroSeguro(v, NaN));
    if (xValores.some((v) => !Number.isFinite(v))) {
      throw new Error('generador-graficos: «x» debe ser una lista de NÚMEROS (ej. x: [0, 2, 4, 6]).');
    }
  }

  // Dispersión y burbujas no dibujan etiquetas (los dos ejes son
  // números): ahí son OPCIONALES y se rellenan solo por dentro.
  const sinEtiquetasReales = tipo === "dispersion" || tipo === "burbujas";

  const etiquetas = (Array.isArray(cfg.etiquetas) ? cfg.etiquetas : []).map((e) => String(e));
  const crudos = Array.isArray(cfg.valores) ? cfg.valores : [];
  if (!etiquetas.length && !conX && !sinEtiquetasReales) {
    throw new Error('generador-graficos: faltan las «etiquetas» (ej. etiquetas: ["Ene","Feb"]) — o pasa «x» numérico para un eje X de números.');
  }
  if (conX && etiquetas.length && etiquetas.length !== xValores.length) {
    throw new Error("generador-graficos: «x» tiene " + xValores.length + " valores y hay " +
      etiquetas.length + " etiquetas — usa solo una de las dos (o iguálalas).");
  }
  const etiquetasFinales = etiquetas.length ? etiquetas
    : conX ? xValores.map(fmtNum)
    : crudos.map((_, i) => "Dato " + (i + 1));
  if (crudos.length !== etiquetasFinales.length) {
    throw new Error("generador-graficos: hay " + etiquetasFinales.length + " etiquetas y " +
      crudos.length + " valores — las dos listas deben coincidir.");
  }

  const conArreglos = crudos.some(Array.isArray);

  if (tipo === "burbujas" || tipo === "velas") {
    if (!conArreglos) {
      throw new Error("generador-graficos: «" + tipo + "» necesita arreglos de valores " +
        (tipo === "burbujas" ? "[x, y, tamaño]" : "[apertura, cierre, máximo, mínimo]") +
        " por etiqueta.");
    }
  } else if (tipo === "cascada") {
    if (conArreglos) {
      throw new Error("generador-graficos: la cascada no soporta series múltiples — pasa valores numéricos simples.");
    }
  } else if (tipo === "dispersion") {
    // Vale [x,y] por etiqueta (simple) o arreglos de puntos por serie (comparación).
  } else if (conArreglos) {
    modo = "comparacion"; // llegaron arreglos → comparación automática
  } else if (modo === "comparacion") {
    throw new Error('generador-graficos: el modo "comparacion" necesita ARREGLOS de valores por etiqueta (ej. valores: [[4,6],[7,2]]).');
  }

  let filas = crudos.map((v) => (Array.isArray(v) ? v.slice() : [v]));

  if (tipo === "pastel" || tipo === "dona") {
    filas = filas.map((f) => [f.reduce((a, v) => a + numeroSeguro(v, 0), 0)]);
  }

  let nSeries = 1;
  if (modo === "comparacion" && tipo !== "pastel" && tipo !== "dona") {
    nSeries = Math.max(...filas.map((f) => f.length));
  }
  if (tipo === "burbujas" && filas.some((f) => f.length < 3)) {
    throw new Error("generador-graficos: cada burbuja debe ser [x, y, tamaño].");
  }
  if (tipo === "velas" && filas.some((f) => f.length < 4)) {
    throw new Error("generador-graficos: cada vela debe ser [apertura, cierre, máximo, mínimo].");
  }

  const serieExplicita = Array.isArray(cfg.series) && cfg.series.length > 0;
  const seriesNombres = serieExplicita
    ? cfg.series.map((s) => String(s))
    : Array.from({ length: Math.max(1, nSeries) }, (_, i) => "Serie " + (i + 1));

  const mostrarCant = cfg.mostrarCantidades === true;
  const mostrarPct = cfg.mostrarPorcentajes === true;

  let total = numeroSeguro(cfg.total, NaN);
  if (!(total > 0)) {
    total = 0;
    filas.forEach((f) => f.forEach((v) => { total += numeroSeguro(v, 0); }));
  }
  const pct = mostrarPct && total > 0 ? (v) => fmtPct((v / total) * 100) : null;

  const ej = cfg.ejes || {};
  const ejes = {
    horizontal: ej.horizontal != null ? String(ej.horizontal) : "",
    vertical: ej.vertical != null ? String(ej.vertical) : "",
    min: numeroSeguro(ej.min, NaN),
    max: numeroSeguro(ej.max, NaN),
    paso: numeroSeguro(ej.paso, NaN),
    minX: numeroSeguro(ej.minX, NaN),
    maxX: numeroSeguro(ej.maxX, NaN),
    pasoX: numeroSeguro(ej.pasoX, NaN),
    minH: numeroSeguro(ej.minH, NaN),   // alias antiguo del eje X (dispersión)
    maxH: numeroSeguro(ej.maxH, NaN),
  };
  if (tipo === "pastel" || tipo === "dona" || tipo === "radar") {
    ejes.horizontal = ""; ejes.vertical = "";
    ejes.min = NaN; ejes.max = NaN; ejes.paso = NaN;
    ejes.minX = NaN; ejes.maxX = NaN; ejes.pasoX = NaN;
    ejes.minH = NaN; ejes.maxH = NaN;
  }

  return {
    tipo, modo, etiquetas: etiquetasFinales, filas, nSeries, seriesNombres, serieExplicita,
    mostrarCant, mostrarPct, pct, total, ejes,
    xNumerica: !!xValores, xValores,
    titulo: cfg.titulo != null && String(cfg.titulo).trim() ? String(cfg.titulo).trim() : "",
    ancho: Math.min(1400, Math.max(260, numeroSeguro(cfg.ancho, 560))),
  };
}

/* ---------------- Envolvente y accesibilidad ---------------- */

function envolver(svgInterno, d, ancho, alto) {
  const div = document.createElement("div");
  div.className = "grafico-uni";
  div.dataset.tipo = d.tipo;
  div.dataset.modo = d.modo;
  const aria = (d.titulo ? d.titulo + ". " : "") +
    "Gráfico de " + NOMBRES_TIPO[d.tipo] + " con " + d.etiquetas.length + " datos.";
  div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + r2(ancho) + " " +
    r2(alto) + '" width="' + r2(ancho) + '" height="' + r2(alto) +
    '" role="img" aria-label="' + esc(aria) + '">' + svgInterno + "</svg>";
  return div;
}

/** Página principal: <main> · #app · #contenido · <body>. */
function destinoPrincipal() {
  return document.querySelector("main") ||
    document.getElementById("app") ||
    document.getElementById("contenido") ||
    document.body || null;
}

/* ============================================================
   GRÁFICOS CARTESIANOS — cabecera común
   (título + leyenda + rejilla + ticks del eje de valores)
   ============================================================ */

function cabeceraComun(d, S, izq, plotW) {
  if (d.titulo) S.push(txt(d.ancho / 2, 27, d.titulo, { tam: 16, peso: 700 }));
  const filasLey = filasDeLeyenda(d, plotW);
  if (filasLey) {
    S.push(leyendaSeries(d, d._marcador || "caja", izq, d.titulo ? 46 : 12, plotW));
  }
  return filasLey;
}

function arribaComun(d, filasLey) {
  return (d.titulo ? 46 : 12) + filasLey * 21 + (filasLey ? 8 : 0);
}

function valorExtremos(d) {
  let minD = Infinity, maxD = -Infinity;
  d.filas.forEach((f) => f.forEach((v) => {
    const n = numeroSeguro(v, NaN);
    if (Number.isFinite(n)) { minD = Math.min(minD, n); maxD = Math.max(maxD, n); }
  }));
  if (!Number.isFinite(minD)) {
    throw new Error("generador-graficos: no hay valores numéricos que graficar.");
  }
  return { minD, maxD };
}

/* ============================================================
   COLUMNAS y BARRAS AGRUPADAS (verticales)
   ============================================================ */

function graficarColumnas(d, agrupado) {
  const n = d.etiquetas.length;
  const { minD, maxD } = valorExtremos(d);
  const esc = escalaBonita(minD, maxD, d.ejes.min, d.ejes.max, true, d.ejes.paso);

  const anchoTickY = Math.max(12, ...esc.ticks.map((t) => estimarAncho(fmtNum(t), 11)));
  const izq = 16 + anchoTickY + (d.ejes.vertical ? 22 : 0);
  const plotW = Math.max(60, d.ancho - izq - 16);
  const ranura = plotW / n;
  const rot = rotacionPara(d.etiquetas, ranura);
  const maxWEtiq = Math.max(...d.etiquetas.map((e) => estimarAncho(e, 11.5)));
  const altoEtiq = rot ? Math.min(72, 14 + maxWEtiq * 0.62) : 20;

  const filasLey = filasDeLeyenda(d, plotW);
  d._marcador = "caja";
  const arriba = arribaComun(d, filasLey);
  const plotH = 300;
  const abajo = altoEtiq + (d.ejes.horizontal ? 24 : 0) + 10;
  const alto = Math.round(arriba + plotH + abajo);

  const yDe = (v) => arriba + plotH * (1 - (v - esc.min) / (esc.max - esc.min));
  const vBase = esc.min < 0 ? 0 : esc.min;
  const centroDe = (i) => izq + ranura * (i + 0.5);
  const S = [];

  cabeceraComun(d, S, izq, plotW);

  for (const t of esc.ticks) {
    const y = yDe(t);
    const esBase = t === esc.min;
    S.push(linea(izq, y, izq + plotW, y, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
    S.push(txt(izq - 7, y + 4, fmtNum(t), { ancla: "end", tam: 11, color: C_SUAVE }));
  }
  S.push(linea(izq, arriba, izq, arriba + plotH, C_EJE, 1));

  for (let i = 0; i < n; i++) {
    const fila = d.filas[i];
    if (!agrupado || d.nSeries === 1) {
      const v = numeroSeguro(fila[0], NaN);
      if (!Number.isFinite(v)) continue;
      const bw = Math.min(ranura * 0.62, 46);
      const cx = centroDe(i);
      S.push(recta(cx - bw / 2, Math.min(yDe(v), yDe(vBase)), bw,
        Math.abs(yDe(v) - yDe(vBase)), colorDe(d, i), 2));
      if (d.mostrarCant || d.mostrarPct) {
        S.push(etiquetaValor(d, v, cx, yDe(v), arriba, arriba + plotH));
      }
    } else {
      const innerW = ranura * 0.8;
      const bw = Math.max(6, (innerW - (d.nSeries - 1) * 3) / d.nSeries);
      const x0 = centroDe(i) - innerW / 2;
      for (let s = 0; s < d.nSeries; s++) {
        const v = numeroSeguro(fila[s], NaN);
        if (!Number.isFinite(v)) continue;
        const x = x0 + s * (bw + 3);
        S.push(recta(x, Math.min(yDe(v), yDe(vBase)), bw,
          Math.abs(yDe(v) - yDe(vBase)), colorDe(d, s), 2));
        if (d.mostrarCant || d.mostrarPct) {
          S.push(etiquetaValor(d, v, x + bw / 2, yDe(v), arriba, arriba + plotH));
        }
      }
    }
  }

  S.push(etiquetasX(d, centroDe, arriba + plotH, rot));
  S.push(nombresEjes(d, izq, plotW, arriba, plotH, alto, true));
  return envolver(S.join(""), d, d.ancho, alto);
}

/* ============================================================
   BARRAS (horizontales) — también en modo comparación
   ============================================================ */

function cantidadH(d, v, xExtremo, cy, xMaxDibujo) {
  const texto = d.mostrarCant && d.mostrarPct
    ? fmtNum(v) + " (" + d.pct(v) + ")"
    : (d.mostrarPct ? d.pct(v) : fmtNum(v));
  const w = estimarAncho(texto, 10.5);
  if (xExtremo + 6 + w <= xMaxDibujo + 10) {
    return txt(xExtremo + 6, cy + 4, texto, { ancla: "start", tam: 10.5, peso: 600 });
  }
  return txt(xExtremo - 6, cy + 4, texto, { ancla: "end", tam: 10.5, peso: 600, color: "#ffffff" });
}

function graficarBarrasH(d, agrupado) {
  const n = d.etiquetas.length;
  const { minD, maxD } = valorExtremos(d);
  const esc = escalaBonita(minD, maxD, d.ejes.min, d.ejes.max, true, d.ejes.paso);

  const maxWEtiq = Math.max(...d.etiquetas.map((e) => estimarAncho(e, 12)));
  const catW = Math.min(maxWEtiq + 12, Math.round(d.ancho * 0.42));
  const izq = catW + 12;
  const plotW = Math.max(60, d.ancho - izq - 16);

  const filasLey = filasDeLeyenda(d, plotW);
  d._marcador = "caja";
  let arriba = arribaComun(d, filasLey);
  if (d.ejes.vertical) arriba += 14; // encabezado de la columna de categorías
  const ranuraH = agrupado && d.nSeries > 1 ? 64 : 48;
  const plotH = Math.max(160, Math.min(460, n * ranuraH));
  const abajo = 32 + (d.ejes.horizontal ? 24 : 0);
  const alto = Math.round(arriba + plotH + abajo);

  const xDe = (v) => izq + plotW * (v - esc.min) / (esc.max - esc.min);
  const vBase = esc.min < 0 ? 0 : esc.min;
  const S = [];

  if (d.titulo) S.push(txt(d.ancho / 2, 27, d.titulo, { tam: 16, peso: 700 }));
  if (filasLey) S.push(leyendaSeries(d, "caja", izq, d.titulo ? 46 : 12, plotW));
  if (d.ejes.vertical) {
    S.push(txt(izq - 10, arriba - 6, d.ejes.vertical, { ancla: "end", tam: 12, color: C_SUAVE }));
  }

  for (const t of esc.ticks) {
    const x = xDe(t);
    const esBase = t === esc.min;
    S.push(linea(x, arriba, x, arriba + plotH, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
    S.push(txt(x, arriba + plotH + 16, fmtNum(t), { tam: 11, color: C_SUAVE }));
  }

  for (let i = 0; i < n; i++) {
    const cy = arriba + plotH * (i + 0.5) / n;
    S.push(txt(izq - 10, cy + 4, recortar(d.etiquetas[i], catW - 8, 12), { ancla: "end", tam: 12 }));
    if (!agrupado || d.nSeries === 1) {
      const v = numeroSeguro(d.filas[i][0], NaN);
      if (!Number.isFinite(v)) continue;
      const bh = Math.min((plotH / n) * 0.62, 34);
      const x0 = xDe(Math.min(vBase, v));
      const x1 = xDe(Math.max(vBase, v));
      S.push(recta(x0, cy - bh / 2, x1 - x0, bh, colorDe(d, i), 2));
      if (d.mostrarCant || d.mostrarPct) S.push(cantidadH(d, v, x1, cy, izq + plotW));
    } else {
      const innerH = (plotH / n) * 0.8;
      const bh = Math.max(6, (innerH - (d.nSeries - 1) * 3) / d.nSeries);
      const y0 = cy - innerH / 2;
      for (let s = 0; s < d.nSeries; s++) {
        const v = numeroSeguro(d.filas[i][s], NaN);
        if (!Number.isFinite(v)) continue;
        const yy = y0 + s * (bh + 3);
        const x0 = xDe(Math.min(vBase, v));
        const x1 = xDe(Math.max(vBase, v));
        S.push(recta(x0, yy, x1 - x0, bh, colorDe(d, s), 2));
        if (d.mostrarCant || d.mostrarPct) S.push(cantidadH(d, v, x1, yy + bh / 2, izq + plotW));
      }
    }
  }

  S.push(nombresEjes(d, izq, plotW, arriba, plotH, alto, false));
  return envolver(S.join(""), d, d.ancho, alto);
}

/* ============================================================
   BARRAS APILADAS (columnas apiladas por serie)
   ============================================================ */

function graficarApiladas(d) {
  const n = d.etiquetas.length;
  // Extremos APILADOS: el tope real lo marca la suma de cada columna
  // (positivos hacia arriba, negativos hacia abajo del cero).
  let minD = 0, maxD = 0;
  for (let i = 0; i < n; i++) {
    let pos = 0, neg = 0;
    for (let s = 0; s < d.nSeries; s++) {
      const v = numeroSeguro(d.filas[i][s], NaN);
      if (!Number.isFinite(v)) continue;
      if (v >= 0) pos += v; else neg += v;
    }
    maxD = Math.max(maxD, pos);
    minD = Math.min(minD, neg);
  }
  const esc = escalaBonita(minD, maxD, d.ejes.min, d.ejes.max, true, d.ejes.paso);

  const anchoTickY = Math.max(12, ...esc.ticks.map((t) => estimarAncho(fmtNum(t), 11)));
  const izq = 16 + anchoTickY + (d.ejes.vertical ? 22 : 0);
  const plotW = Math.max(60, d.ancho - izq - 16);
  const ranura = plotW / n;
  const rot = rotacionPara(d.etiquetas, ranura);
  const maxWEtiq = Math.max(...d.etiquetas.map((e) => estimarAncho(e, 11.5)));
  const altoEtiq = rot ? Math.min(72, 14 + maxWEtiq * 0.62) : 20;

  const filasLey = filasDeLeyenda(d, plotW);
  d._marcador = "caja";
  const arriba = arribaComun(d, filasLey);
  const plotH = 300;
  const abajo = altoEtiq + (d.ejes.horizontal ? 24 : 0) + 10;
  const alto = Math.round(arriba + plotH + abajo);

  const yDe = (v) => arriba + plotH * (1 - (v - esc.min) / (esc.max - esc.min));
  const bw = Math.min(ranura * 0.62, 46);
  const S = [];

  cabeceraComun(d, S, izq, plotW);

  for (const t of esc.ticks) {
    const y = yDe(t);
    const esBase = t === Math.max(esc.min, 0);
    S.push(linea(izq, y, izq + plotW, y, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
    S.push(txt(izq - 7, y + 4, fmtNum(t), { ancla: "end", tam: 11, color: C_SUAVE }));
  }
  S.push(linea(izq, arriba, izq, arriba + plotH, C_EJE, 1));

  for (let i = 0; i < n; i++) {
    let pos = 0, neg = 0;
    const bx = izq + ranura * (i + 0.5) - bw / 2;
    for (let s = 0; s < d.nSeries; s++) {
      const v = numeroSeguro(d.filas[i][s], NaN);
      if (!Number.isFinite(v) || v === 0) continue;
      const desde = v >= 0 ? pos : neg;
      const hasta = desde + v;
      const y1 = yDe(desde), y2 = yDe(hasta);
      S.push(recta(bx, Math.min(y1, y2), bw, Math.abs(y1 - y2), colorDe(d, s), 0));
      if (d.mostrarCant || d.mostrarPct) {
        const texto = d.mostrarCant && d.mostrarPct
          ? fmtNum(v) + " (" + d.pct(v) + ")"
          : (d.mostrarPct ? d.pct(v) : fmtNum(v));
        const hSeg = Math.abs(y1 - y2);
        if (hSeg >= 15 && estimarAncho(texto, 10.5) <= bw - 4) {
          S.push(txt(bx + bw / 2, (y1 + y2) / 2 + 4, texto,
            { tam: 10.5, peso: 600, color: "#ffffff" }));
        }
      }
      if (v >= 0) pos = hasta; else neg = hasta;
    }
  }

  S.push(etiquetasX(d, (i) => izq + ranura * (i + 0.5), arriba + plotH, rot));
  S.push(nombresEjes(d, izq, plotW, arriba, plotH, alto, true));
  return envolver(S.join(""), d, d.ancho, alto);
}

/* ============================================================
   LÍNEAS y LÍNEAS TEMPORALES
   ============================================================ */

function graficarLinea(d, temporal) {
  const n = d.etiquetas.length;
  const { minD, maxD } = valorExtremos(d);
  const rango = maxD - minD;
  const pad = rango > 0 ? rango * 0.1 : Math.abs(minD || 1) * 0.5 + 1;
  const esc = escalaBonita(minD - pad, maxD + pad, d.ejes.min, d.ejes.max, false, d.ejes.paso);

  // Eje X NUMÉRICO (velocidad-tiempo…): el X también tiene rango
  // (minX/maxX) y escala (pasoX); los puntos se ubican por su valor.
  const numX = d.xNumerica && !temporal;
  let escX = null;
  if (numX) {
    escX = escalaBonita(Math.min(...d.xValores), Math.max(...d.xValores),
      d.ejes.minX, d.ejes.maxX, false, d.ejes.pasoX);
  }

  const anchoTickY = Math.max(12, ...esc.ticks.map((t) => estimarAncho(fmtNum(t), 11)));
  const izq = 16 + anchoTickY + (d.ejes.vertical ? 22 : 0);
  const plotW = Math.max(60, d.ancho - izq - 16);
  const rot = numX || temporal ? 0 : rotacionPara(d.etiquetas, plotW / n);
  const maxWEtiq = Math.max(...d.etiquetas.map((e) => estimarAncho(e, 11.5)));
  const altoEtiq = rot ? Math.min(72, 14 + maxWEtiq * 0.62) : 20;
  // Las temporales NUNCA rotan: se dejan caer las etiquetas que no caben.
  const pasoVer = temporal
    ? Math.max(1, Math.ceil((n * (maxWEtiq + 12)) / plotW)) : 1;

  const filasLey = filasDeLeyenda(d, plotW);
  d._marcador = "linea";
  const arriba = arribaComun(d, filasLey);
  const plotH = 300;
  const abajo = (numX ? 32 : altoEtiq + 10) + (d.ejes.horizontal ? 24 : 0);
  const alto = Math.round(arriba + plotH + abajo);

  const yDe = (v) => arriba + plotH * (1 - (v - esc.min) / (esc.max - esc.min));
  const xDe = numX
    ? (v) => izq + plotW * (v - escX.min) / (escX.max - escX.min)
    : null;
  const puntoEn = numX
    ? (i) => xDe(d.xValores[i])
    : (i) => izq + plotW * (i + 0.5) / n;
  const S = [];

  cabeceraComun(d, S, izq, plotW);

  for (const t of esc.ticks) {
    const y = yDe(t);
    const esBase = t === esc.min;
    S.push(linea(izq, y, izq + plotW, y, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
    S.push(txt(izq - 7, y + 4, fmtNum(t), { ancla: "end", tam: 11, color: C_SUAVE }));
  }
  S.push(linea(izq, arriba, izq, arriba + plotH, C_EJE, 1));

  if (numX) {
    // Rejilla vertical + cifras de la escala X (bajo el eje)
    for (const t of escX.ticks) {
      const x = xDe(t);
      const esBase = t === escX.min;
      S.push(linea(x, arriba, x, arriba + plotH, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
      S.push(txt(x, arriba + plotH + 16, fmtNum(t), { tam: 11, color: C_SUAVE }));
    }
  } else if (temporal) {
    for (let i = 0; i < n; i += pasoVer) {
      S.push(linea(puntoEn(i), arriba, puntoEn(i), arriba + plotH, C_REJILLA, 1));
    }
  }

  for (let s = 0; s < d.nSeries; s++) {
    const color = colorDe(d, s);
    let tramo = [];
    const cerrar = () => {
      if (tramo.length > 1) S.push(polilinea(tramo, color, 2.5));
      tramo = [];
    };
    for (let i = 0; i < n; i++) {
      const v = numeroSeguro(d.filas[i][s], NaN);
      if (Number.isFinite(v)) {
        tramo.push([puntoEn(i), yDe(v)]);
      } else { cerrar(); }
    }
    cerrar();
    for (let i = 0; i < n; i++) {
      const v = numeroSeguro(d.filas[i][s], NaN);
      if (!Number.isFinite(v)) continue;
      const px = puntoEn(i), py = yDe(v);
      S.push(circulo(px, py, 3.5, color, 1, "#ffffff", 1.4));
      if (d.mostrarCant || d.mostrarPct) {
        const texto = d.mostrarCant && d.mostrarPct
          ? fmtNum(v) + " (" + d.pct(v) + ")"
          : (d.mostrarPct ? d.pct(v) : fmtNum(v));
        S.push(txt(px, py - 8 < arriba + 9 ? py + 16 : py - 8, texto,
          { tam: 10, peso: 600 }));
      }
    }
  }

  if (!numX) S.push(etiquetasX(d, puntoEn, arriba + plotH, rot, temporal ? pasoVer : 1));
  S.push(nombresEjes(d, izq, plotW, arriba, plotH, alto, true));
  return envolver(S.join(""), d, d.ancho, alto);
}

/* ============================================================
   ÁREA (línea con relleno hasta el cero)
   ============================================================ */

function graficarArea(d) {
  const n = d.etiquetas.length;
  const { minD, maxD } = valorExtremos(d);
  const rango = maxD - minD;
  const pad = rango > 0 ? rango * 0.08 : Math.abs(minD || 1) * 0.4 + 1;
  const esc = escalaBonita(minD - pad, maxD + pad, d.ejes.min, d.ejes.max, true, d.ejes.paso);

  // Eje X numérico (misma matemática que en líneas)
  const numX = d.xNumerica;
  let escX = null;
  if (numX) {
    escX = escalaBonita(Math.min(...d.xValores), Math.max(...d.xValores),
      d.ejes.minX, d.ejes.maxX, false, d.ejes.pasoX);
  }

  const anchoTickY = Math.max(12, ...esc.ticks.map((t) => estimarAncho(fmtNum(t), 11)));
  const izq = 16 + anchoTickY + (d.ejes.vertical ? 22 : 0);
  const plotW = Math.max(60, d.ancho - izq - 16);
  const rot = numX ? 0 : rotacionPara(d.etiquetas, plotW / n);
  const maxWEtiq = Math.max(...d.etiquetas.map((e) => estimarAncho(e, 11.5)));
  const altoEtiq = rot ? Math.min(72, 14 + maxWEtiq * 0.62) : 20;

  const filasLey = filasDeLeyenda(d, plotW);
  d._marcador = "linea";
  const arriba = arribaComun(d, filasLey);
  const plotH = 300;
  const abajo = (numX ? 32 : altoEtiq + 10) + (d.ejes.horizontal ? 24 : 0);
  const alto = Math.round(arriba + plotH + abajo);

  const yDe = (v) => arriba + plotH * (1 - (v - esc.min) / (esc.max - esc.min));
  const vBase = esc.min < 0 ? 0 : esc.min;
  const xDe = numX
    ? (v) => izq + plotW * (v - escX.min) / (escX.max - escX.min)
    : null;
  const puntoEn = numX
    ? (i) => xDe(d.xValores[i])
    : (i) => izq + plotW * (i + 0.5) / n;
  const S = [];

  cabeceraComun(d, S, izq, plotW);

  for (const t of esc.ticks) {
    const y = yDe(t);
    const esBase = t === Math.max(esc.min, vBase);
    S.push(linea(izq, y, izq + plotW, y, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
    S.push(txt(izq - 7, y + 4, fmtNum(t), { ancla: "end", tam: 11, color: C_SUAVE }));
  }
  S.push(linea(izq, arriba, izq, arriba + plotH, C_EJE, 1));

  if (numX) {
    for (const t of escX.ticks) {
      const x = xDe(t);
      const esBase = t === escX.min;
      S.push(linea(x, arriba, x, arriba + plotH, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
      S.push(txt(x, arriba + plotH + 16, fmtNum(t), { tam: 11, color: C_SUAVE }));
    }
  }

  for (let s = 0; s < d.nSeries; s++) {
    const color = colorDe(d, s);
    let tramo = [];
    const cerrar = () => {
      if (tramo.length > 1) {
        const cierres = [[tramo[tramo.length - 1][0], yDe(vBase)], [tramo[0][0], yDe(vBase)]];
        S.push(poligono(tramo.concat(cierres), color, 0.28, color, 2));
      }
      tramo = [];
    };
    for (let i = 0; i < n; i++) {
      const v = numeroSeguro(d.filas[i][s], NaN);
      if (Number.isFinite(v)) tramo.push([puntoEn(i), yDe(v)]);
      else cerrar();
    }
    cerrar();
    if (d.mostrarCant || d.mostrarPct) {
      for (let i = 0; i < n; i++) {
        const v = numeroSeguro(d.filas[i][s], NaN);
        if (!Number.isFinite(v)) continue;
        const texto = d.mostrarCant && d.mostrarPct
          ? fmtNum(v) + " (" + d.pct(v) + ")"
          : (d.mostrarPct ? d.pct(v) : fmtNum(v));
        S.push(txt(puntoEn(i), yDe(v) - 8 < arriba + 9 ? yDe(v) + 16 : yDe(v) - 8, texto,
          { tam: 10, peso: 600 }));
      }
    }
  }

  if (!numX) S.push(etiquetasX(d, puntoEn, arriba + plotH, rot));
  S.push(nombresEjes(d, izq, plotW, arriba, plotH, alto, true));
  return envolver(S.join(""), d, d.ancho, alto);
}

/* ============================================================
   HISTOGRAMA (barras contiguas por intervalo)
   ============================================================ */

function graficarHistograma(d) {
  const n = d.etiquetas.length;
  const { minD, maxD } = valorExtremos(d);
  const esc = escalaBonita(minD, maxD, d.ejes.min, d.ejes.max, true, d.ejes.paso);

  const anchoTickY = Math.max(12, ...esc.ticks.map((t) => estimarAncho(fmtNum(t), 11)));
  const izq = 16 + anchoTickY + (d.ejes.vertical ? 22 : 0);
  const plotW = Math.max(60, d.ancho - izq - 16);
  const rot = rotacionPara(d.etiquetas, plotW / n);
  const maxWEtiq = Math.max(...d.etiquetas.map((e) => estimarAncho(e, 11.5)));
  const altoEtiq = rot ? Math.min(72, 14 + maxWEtiq * 0.62) : 20;

  const filasLey = filasDeLeyenda(d, plotW);
  d._marcador = "caja";
  const arriba = arribaComun(d, filasLey);
  const plotH = 300;
  const abajo = altoEtiq + (d.ejes.horizontal ? 24 : 0) + 10;
  const alto = Math.round(arriba + plotH + abajo);

  const yDe = (v) => arriba + plotH * (1 - (v - esc.min) / (esc.max - esc.min));
  const vBase = esc.min < 0 ? 0 : esc.min;
  const binW = plotW / n;
  const S = [];

  cabeceraComun(d, S, izq, plotW);

  for (const t of esc.ticks) {
    const y = yDe(t);
    const esBase = t === esc.min;
    S.push(linea(izq, y, izq + plotW, y, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
    S.push(txt(izq - 7, y + 4, fmtNum(t), { ancla: "end", tam: 11, color: C_SUAVE }));
  }
  S.push(linea(izq, arriba, izq, arriba + plotH, C_EJE, 1));

  for (let i = 0; i < n; i++) {
    const binX = izq + binW * i;
    if (!d.modo || d.nSeries === 1) {
      const v = numeroSeguro(d.filas[i][0], NaN);
      if (!Number.isFinite(v) || v <= 0) continue;
      const color = d.colores && d.colores[i] ? colorDe(d, i) : PALETA[0];
      S.push(recta(binX + 0.5, yDe(v), binW - 1, yDe(vBase) - yDe(v), color, 0));
      if (d.mostrarCant || d.mostrarPct) {
        S.push(etiquetaValor(d, v, binX + binW / 2, yDe(v), arriba, arriba + plotH));
      }
    } else {
      const subW = binW / d.nSeries;
      for (let s = 0; s < d.nSeries; s++) {
        const v = numeroSeguro(d.filas[i][s], NaN);
        if (!Number.isFinite(v) || v <= 0) continue;
        S.push(recta(binX + s * subW + 0.5, yDe(v), subW - 1, yDe(vBase) - yDe(v), colorDe(d, s), 0));
        if (d.mostrarCant || d.mostrarPct) {
          S.push(etiquetaValor(d, v, binX + s * subW + subW / 2, yDe(v), arriba, arriba + plotH));
        }
      }
    }
  }

  S.push(etiquetasX(d, (i) => izq + binW * (i + 0.5), arriba + plotH, rot));
  S.push(nombresEjes(d, izq, plotW, arriba, plotH, alto, true));
  return envolver(S.join(""), d, d.ancho, alto);
}

/* ============================================================
   DISPERSIÓN y BURBUJAS (dos ejes numéricos)
   ============================================================ */

function graficarDispersion(d, burbujas) {
  // Armar grupos: comparación = arreglo de puntos por serie;
  // simple = un punto [x, y(, tamaño)] por etiqueta.
  const porSerie = d.modo === "comparacion" && d.filas.some((f) => Array.isArray(f[0]));
  const grupos = [];
  if (porSerie) {
    for (let s = 0; s < d.nSeries; s++) {
      const puntos = [];
      d.filas.forEach((f) => {
        const p = f[s];
        if (Array.isArray(p)) puntos.push({ x: numeroSeguro(p[0], NaN), y: numeroSeguro(p[1], NaN), r: burbujas ? numeroSeguro(p[2], 1) : 0 });
      });
      grupos.push({ color: colorDe(d, s), nombre: d.seriesNombres[s], puntos });
    }
  } else {
    const puntos = d.filas
      .map((f, i) => (Array.isArray(f)
        ? { x: numeroSeguro(f[0], NaN), y: numeroSeguro(f[1], NaN), r: burbujas ? numeroSeguro(f[2], 1) : 0, color: colorDe(d, i) }
        : null))
      .filter(Boolean);
    grupos.push({ nombre: d.seriesNombres[0], puntos });
  }
  const todos = grupos.flatMap((g) => g.puntos).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!todos.length) {
    throw new Error("generador-graficos: cada punto debe ser " + (burbujas ? "[x, y, tamaño]" : "[x, y]") + " con números.");
  }

  const minX = Math.min(...todos.map((p) => p.x)), maxX = Math.max(...todos.map((p) => p.x));
  const minY = Math.min(...todos.map((p) => p.y)), maxY = Math.max(...todos.map((p) => p.y));
  const padX = maxX - minX > 0 ? (maxX - minX) * 0.08 : Math.abs(minX || 1) * 0.3 + 0.5;
  const padY = maxY - minY > 0 ? (maxY - minY) * 0.08 : Math.abs(minY || 1) * 0.3 + 0.5;
  // El eje X numérico acepta minX/maxX (o su alias antiguo minH/maxH)
  // y pasoX; el de valores (Y) acepta min/max y paso.
  const minXF = Number.isFinite(d.ejes.minX) ? d.ejes.minX : d.ejes.minH;
  const maxXF = Number.isFinite(d.ejes.maxX) ? d.ejes.maxX : d.ejes.maxH;
  const escX = escalaBonita(minX - padX, maxX + padX, minXF, maxXF, false, d.ejes.pasoX);
  const escY = escalaBonita(minY - padY, maxY + padY, d.ejes.min, d.ejes.max, false, d.ejes.paso);

  const anchoTickY = Math.max(12, ...escY.ticks.map((t) => estimarAncho(fmtNum(t), 11)));
  const izq = 16 + anchoTickY + (d.ejes.vertical ? 22 : 0);
  const plotW = Math.max(60, d.ancho - izq - 16);

  const filasLey = porSerie ? filasDeLeyenda(d, plotW) : 0;
  d._marcador = "punto";
  const arriba = porSerie ? arribaComun(d, filasLey) : (d.titulo ? 46 : 12);
  const plotH = 320;
  const abajo = 32 + (d.ejes.horizontal ? 24 : 0);
  const alto = Math.round(arriba + plotH + abajo);

  const xDe = (v) => izq + plotW * (v - escX.min) / (escX.max - escX.min);
  const yDe = (v) => arriba + plotH * (1 - (v - escY.min) / (escY.max - escY.min));
  const S = [];

  if (d.titulo) S.push(txt(d.ancho / 2, 27, d.titulo, { tam: 16, peso: 700 }));
  if (porSerie) S.push(leyendaSeries(d, "punto", izq, d.titulo ? 46 : 12, plotW));

  for (const t of escY.ticks) {
    const y = yDe(t);
    const esBase = t === escY.min;
    S.push(linea(izq, y, izq + plotW, y, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
    S.push(txt(izq - 7, y + 4, fmtNum(t), { ancla: "end", tam: 11, color: C_SUAVE }));
  }
  for (const t of escX.ticks) {
    const x = xDe(t);
    const esBase = t === escX.min;
    S.push(linea(x, arriba, x, arriba + plotH, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
    S.push(txt(x, arriba + plotH + 16, fmtNum(t), { tam: 11, color: C_SUAVE }));
  }

  const rMax = Math.max(1, ...todos.map((p) => (Number.isFinite(p.r) ? p.r : 0)));
  const radioMaxPx = Math.min(36, Math.max(12, plotW / (todos.length * 2.4)));
  const kR = radioMaxPx / Math.sqrt(rMax);

  for (const g of grupos) {
    for (const p of g.puntos) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const px = xDe(p.x), py = yDe(p.y);
      if (burbujas) {
        const rpx = Math.max(3.5, Math.sqrt(Math.max(p.r, 0)) * kR);
        S.push(circulo(px, py, rpx, g.color != null ? g.color : p.color, 0.5, g.color != null ? g.color : p.color, 1.6));
        if (d.mostrarCant && rpx >= 15) {
          S.push(txt(px, py + 3.5, fmtNum(p.r), { tam: 10, peso: 600, color: "#ffffff" }));
        }
      } else {
        const color = g.color != null ? g.color : p.color;
        S.push(circulo(px, py, 4.5, color, 1, "#ffffff", 1.2));
        if (d.mostrarCant) {
          S.push(txt(px + 7, py - 7, "(" + fmtNum(p.x) + ", " + fmtNum(p.y) + ")",
            { ancla: "start", tam: 10, color: C_SUAVE }));
        }
      }
    }
  }

  S.push(nombresEjes(d, izq, plotW, arriba, plotH, alto, true));
  return envolver(S.join(""), d, d.ancho, alto);
}

/* ============================================================
   VELAS JAPONESAS ([apertura, cierre, máximo, mínimo])
   ============================================================ */

function graficarVelas(d) {
  const n = d.etiquetas.length;
  const velas = d.filas.map((f) => {
    const a = numeroSeguro(f[0], NaN), c = numeroSeguro(f[1], NaN);
    const h = Math.max(a, c, numeroSeguro(f[2], -Infinity));
    const l = Math.min(a, c, numeroSeguro(f[3], Infinity));
    return { a, c, h, l };
  });
  if (velas.some((v) => !Number.isFinite(v.a) || !Number.isFinite(v.c))) {
    throw new Error("generador-graficos: cada vela debe ser [apertura, cierre, máximo, mínimo] numéricos.");
  }

  const minD = Math.min(...velas.map((v) => v.l));
  const maxD = Math.max(...velas.map((v) => v.h));
  const rango = maxD - minD;
  const pad = rango > 0 ? rango * 0.08 : Math.abs(minD || 1) * 0.3 + 1;
  const esc = escalaBonita(minD - pad, maxD + pad, d.ejes.min, d.ejes.max, false, d.ejes.paso);

  const anchoTickY = Math.max(12, ...esc.ticks.map((t) => estimarAncho(fmtNum(t), 11)));
  const izq = 16 + anchoTickY + (d.ejes.vertical ? 22 : 0);
  const plotW = Math.max(60, d.ancho - izq - 16);
  const ranura = plotW / n;
  const rot = rotacionPara(d.etiquetas, ranura);
  const maxWEtiq = Math.max(...d.etiquetas.map((e) => estimarAncho(e, 11.5)));
  const altoEtiq = rot ? Math.min(72, 14 + maxWEtiq * 0.62) : 20;

  const arriba = d.titulo ? 46 : 14;
  const plotH = 300;
  const abajo = altoEtiq + (d.ejes.horizontal ? 24 : 0) + 10;
  const alto = Math.round(arriba + plotH + abajo);

  const yDe = (v) => arriba + plotH * (1 - (v - esc.min) / (esc.max - esc.min));
  const cuerpoW = Math.min(ranura * 0.55, 30);
  const alcista = d.colores && typeof d.colores[0] === "string" ? d.colores[0] : "#10b981";
  const bajista = d.colores && typeof d.colores[1] === "string" ? d.colores[1] : "#ef4444";
  const S = [];

  if (d.titulo) S.push(txt(d.ancho / 2, 27, d.titulo, { tam: 16, peso: 700 }));

  for (const t of esc.ticks) {
    const y = yDe(t);
    const esBase = t === esc.min;
    S.push(linea(izq, y, izq + plotW, y, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
    S.push(txt(izq - 7, y + 4, fmtNum(t), { ancla: "end", tam: 11, color: C_SUAVE }));
  }
  S.push(linea(izq, arriba, izq, arriba + plotH, C_EJE, 1));

  for (let i = 0; i < n; i++) {
    const v = velas[i];
    const cx = izq + ranura * (i + 0.5);
    const color = v.c >= v.a ? alcista : bajista;
    S.push(linea(cx, yDe(v.h), cx, yDe(v.l), color, 1.6));
    const yCuerpo = yDe(Math.max(v.a, v.c));
    const hCuerpo = Math.max(2, Math.abs(yDe(v.a) - yDe(v.c)));
    S.push(recta(cx - cuerpoW / 2, yCuerpo, cuerpoW, hCuerpo, color, 1.5));
    if (d.mostrarCant || d.mostrarPct) {
      const texto = d.mostrarCant && d.mostrarPct
        ? fmtNum(v.c) + " (" + d.pct(v.c) + ")"
        : (d.mostrarPct ? d.pct(v.c) : fmtNum(v.c));
      const yTxt = yDe(v.h) - 6 >= arriba + 9 ? yDe(v.h) - 6 : yDe(v.l) + 15;
      S.push(txt(cx, yTxt, texto, { tam: 10, peso: 600 }));
    }
  }

  S.push(etiquetasX(d, (i) => izq + ranura * (i + 0.5), arriba + plotH, rot, 1));
  S.push(nombresEjes(d, izq, plotW, arriba, plotH, alto, true));
  return envolver(S.join(""), d, d.ancho, alto);
}

/* ============================================================
   CASCADA (acumulado con aumentos, bajadas y «Total»)
   ============================================================ */

function graficarCascada(d) {
  const n = d.etiquetas.length;
  const valores = d.filas.map((f) => numeroSeguro(f[0], NaN));
  if (valores.some((v) => !Number.isFinite(v))) {
    throw new Error("generador-graficos: todos los valores de la cascada deben ser números.");
  }

  const segmentos = [];
  let acumulado = 0;
  for (let i = 0; i < n; i++) {
    if (/total/i.test(d.etiquetas[i])) {
      segmentos.push({ desde: 0, hasta: acumulado, esTotal: true });
    } else {
      segmentos.push({ desde: acumulado, hasta: acumulado + valores[i], esTotal: false });
      acumulado += valores[i];
    }
  }
  const minD = Math.min(0, ...segmentos.map((s) => Math.min(s.desde, s.hasta)));
  const maxD = Math.max(0, ...segmentos.map((s) => Math.max(s.desde, s.hasta)));
  const esc = escalaBonita(minD, maxD, d.ejes.min, d.ejes.max, true, d.ejes.paso);

  const anchoTickY = Math.max(12, ...esc.ticks.map((t) => estimarAncho(fmtNum(t), 11)));
  const izq = 16 + anchoTickY + (d.ejes.vertical ? 22 : 0);
  const plotW = Math.max(60, d.ancho - izq - 16);
  const ranura = plotW / n;
  const rot = rotacionPara(d.etiquetas, ranura);
  const maxWEtiq = Math.max(...d.etiquetas.map((e) => estimarAncho(e, 11.5)));
  const altoEtiq = rot ? Math.min(72, 14 + maxWEtiq * 0.62) : 20;

  const arriba = d.titulo ? 46 : 14;
  const plotH = 300;
  const abajo = altoEtiq + (d.ejes.horizontal ? 24 : 0) + 10;
  const alto = Math.round(arriba + plotH + abajo);

  const yDe = (v) => arriba + plotH * (1 - (v - esc.min) / (esc.max - esc.min));
  const bw = Math.min(ranura * 0.62, 46);
  const S = [];

  if (d.titulo) S.push(txt(d.ancho / 2, 27, d.titulo, { tam: 16, peso: 700 }));

  for (const t of esc.ticks) {
    const y = yDe(t);
    const esBase = t === Math.max(esc.min, 0);
    S.push(linea(izq, y, izq + plotW, y, esBase ? C_EJE : C_REJILLA, esBase ? 1.4 : 1));
    S.push(txt(izq - 7, y + 4, fmtNum(t), { ancla: "end", tam: 11, color: C_SUAVE }));
  }
  S.push(linea(izq, arriba, izq, arriba + plotH, C_EJE, 1));

  for (let i = 0; i < n; i++) {
    const seg = segmentos[i];
    const cx = izq + ranura * (i + 0.5);
    const color = seg.esTotal ? C_TOTAL : colorDe(d, i);
    const y1 = yDe(seg.desde), y2 = yDe(seg.hasta);
    S.push(recta(cx - bw / 2, Math.min(y1, y2), bw, Math.abs(y1 - y2), color, 2));
    if (i < n - 1) {
      S.push(linea(cx + bw / 2 + 1, yDe(seg.hasta),
        izq + ranura * (i + 1.5) - bw / 2 - 1, yDe(seg.hasta), C_SUAVE, 1.2, "4 3"));
    }
    if (d.mostrarCant || d.mostrarPct) {
      const valor = seg.esTotal ? seg.hasta : seg.hasta - seg.desde;
      const texto = d.mostrarCant && d.mostrarPct
        ? fmtNum(valor) + " (" + d.pct(valor) + ")"
        : (d.mostrarPct ? d.pct(valor) : fmtNum(valor));
      const yTope = yDe(Math.max(seg.desde, seg.hasta));
      const yPiso = yDe(Math.min(seg.desde, seg.hasta));
      S.push(txt(cx, yTope - 6 >= arriba + 9 ? yTope - 6 : yPiso + 15, texto,
        { tam: 10.5, peso: 600 }));
    }
  }

  S.push(etiquetasX(d, (i) => izq + ranura * (i + 0.5), arriba + plotH, rot, 1));
  S.push(nombresEjes(d, izq, plotW, arriba, plotH, alto, true));
  return envolver(S.join(""), d, d.ancho, alto);
}

/* ============================================================
   PASTEL y DONA — círculo LIMPIO + leyenda separada
   (Regla estricta: NADA de texto sobre las partes del círculo)
   ============================================================ */

function puntoCircular(cx, cy, anguloGrados, radio) {
  const rad = (anguloGrados * Math.PI) / 180;
  return { x: cx + radio * Math.sin(rad), y: cy - radio * Math.cos(rad) };
}

function graficarCircular(d, dona) {
  const valores = d.filas.map((f) => numeroSeguro(f[0], 0));
  if (valores.some((v) => !(v > 0))) {
    throw new Error("generador-graficos: «" + (dona ? "dona" : "pastel") + "» necesita valores positivos (cero o negativo no se puede dibujar).");
  }
  const suma = valores.reduce((a, b) => a + b, 0);

  // Textos de leyenda (etiqueta · cantidad · porcentaje, solo lo pedido)
  const filas = d.etiquetas.map((et, i) => {
    let t = et;
    if (d.mostrarCant) t += " · " + fmtNum(valores[i]);
    if (d.mostrarPct && d.pct) t += " (" + d.pct(valores[i]) + ")";
    return { texto: t, color: colorDe(d, i), valor: valores[i] };
  });
  const anchoFila = Math.max(...filas.map((f) => estimarAncho(f.texto, 13))) + 21 + 14;

  const arriba = d.titulo ? 44 : 14;
  const deLado = d.ancho >= 460 && anchoFila <= d.ancho * 0.34;
  let cx, cy, alto, leyX, leyY0;
  const radio = deLado
    ? Math.min(150, (d.ancho - anchoFila - 60) / 2)
    : Math.min(150, (d.ancho - 36) / 2);
  cy = arriba + radio + 10;
  if (deLado) {
    cx = Math.round((d.ancho - anchoFila) / 2);
    leyX = cx + radio + 24;
    leyY0 = Math.round(cy - (filas.length * 22) / 2);
    alto = Math.round(cy + radio + 16);
  } else {
    cx = Math.round(d.ancho / 2);
    leyX = Math.round(cx - anchoFila / 2);
    leyY0 = Math.round(cy + radio + 22);
    alto = Math.round(leyY0 + filas.length * 22 + 10);
  }

  let S = "";
  if (d.titulo) S += txt(d.ancho / 2, 27, d.titulo, { tam: 16, peso: 700 });

  // Partes del círculo (empiezan a las 12 y giran en sentido horario)
  if (valores.length === 1) {
    S += circulo(cx, cy, radio, filas[0].color);
    if (dona) S += circulo(cx, cy, radio * 0.55, "#ffffff");
  } else {
    let a = 0;
    for (let i = 0; i < valores.length; i++) {
      const a1 = a + 360 * valores[i] / suma;
      const grande = a1 - a > 180 ? 1 : 0;
      const p0 = puntoCircular(cx, cy, a, radio);
      const p1 = puntoCircular(cx, cy, a1, radio);
      if (!dona) {
        S += '<path d="M ' + r2(cx) + " " + r2(cy) +
          " L " + r2(p0.x) + " " + r2(p0.y) +
          " A " + r2(radio) + " " + r2(radio) + " 0 " + grande + " 1 " + r2(p1.x) + " " + r2(p1.y) +
          ' Z" fill="' + filas[i].color + '" stroke="#ffffff" stroke-width="2.5" />';
      } else {
        const rIn = radio * 0.55;
        const q0 = puntoCircular(cx, cy, a, rIn);
        const q1 = puntoCircular(cx, cy, a1, rIn);
        S += '<path d="M ' + r2(p0.x) + " " + r2(p0.y) +
          " A " + r2(radio) + " " + r2(radio) + " 0 " + grande + " 1 " + r2(p1.x) + " " + r2(p1.y) +
          " L " + r2(q1.x) + " " + r2(q1.y) +
          " A " + r2(rIn) + " " + r2(rIn) + " 0 " + grande + " 0 " + r2(q0.x) + " " + r2(q0.y) +
          ' Z" fill="' + filas[i].color + '" stroke="#ffffff" stroke-width="2.5" />';
      }
      a = a1;
    }
  }

  // LEYENDA SEPARADA: muestra de color + texto (nunca sobre el círculo)
  for (let i = 0; i < filas.length; i++) {
    const yFila = leyY0 + i * 22;
    S += recta(leyX, yFila - 11, 13, 13, filas[i].color, 3.5);
    S += txt(leyX + 21, yFila, filas[i].texto, { ancla: "start", tam: 13 });
  }

  const div = envolver(S, d, d.ancho, alto);
  return div;
}

/* ============================================================
   RADAR (telaraña de ejes por etiqueta)
   ============================================================ */

function graficarRadar(d) {
  const n = d.etiquetas.length;
  if (n < 3) {
    throw new Error("generador-graficos: el radar necesita al menos 3 etiquetas.");
  }
  let maxD = -Infinity;
  d.filas.forEach((f) => f.forEach((v) => {
    const x = numeroSeguro(v, NaN);
    if (Number.isFinite(x)) maxD = Math.max(maxD, x);
  }));
  if (!Number.isFinite(maxD)) {
    throw new Error("generador-graficos: no hay valores numéricos que graficar.");
  }
  const paso = pasoBonito(maxD / 4);
  const vmax = Math.max(1, Math.ceil(maxD / paso) * paso);

  const anchoEtiqueta = Math.min(120, Math.max(...d.etiquetas.map((e) => estimarAncho(e, 12))) + 12);
  const R = Math.max(70, Math.min(150, (d.ancho - 2 * anchoEtiqueta - 30) / 2));
  const filasLey = filasDeLeyenda(d, d.ancho);
  d._marcador = "punto";
  const arriba = (d.titulo ? 46 : 12) + filasLey * 21 + (filasLey ? 8 : 0);
  const cx = Math.round(d.ancho / 2);
  const cy = Math.round(arriba + R + 24);
  const alto = Math.round(cy + R + 30);

  const anguloDe = (i) => (i * 360) / n;
  const puntoDe = (i, radio) => puntoCircular(cx, cy, anguloDe(i), radio);
  const S = [];

  if (d.titulo) S.push(txt(d.ancho / 2, 27, d.titulo, { tam: 16, peso: 700 }));
  if (filasLey) S.push(leyendaSeries(d, "punto", cx - d.ancho / 2 + 10, d.titulo ? 46 : 12, d.ancho - 20));

  // Anillos (n-gones) + cifra de escala en el rayo vertical
  for (let k = 1; k <= 4; k++) {
    const anillo = [];
    for (let i = 0; i < n; i++) {
      const p = puntoDe(i, (R * k) / 4);
      anillo.push([p.x, p.y]);
    }
    S.push(poligono(anillo, "none", 0, C_REJILLA, 1));
    S.push(txt(cx + 6, cy - (R * k) / 4 - 3, fmtNum((vmax * k) / 4),
      { ancla: "start", tam: 9.5, color: C_SUAVE }));
  }
  for (let i = 0; i < n; i++) {
    const p = puntoDe(i, R);
    S.push(linea(cx, cy, p.x, p.y, "#cbd5e1", 1));
  }

  // Polígonos por serie
  for (let s = 0; s < d.nSeries; s++) {
    const color = colorDe(d, s);
    const puntos = [];
    for (let i = 0; i < n; i++) {
      const v = numeroSeguro(d.filas[i][s], 0);
      const p = puntoDe(i, (R * Math.max(0, v)) / vmax);
      puntos.push([p.x, p.y]);
    }
    S.push(poligono(puntos, color, 0.15, color, 2));
    for (const p of puntos) S.push(circulo(p[0], p[1], 3, color));
    if (d.mostrarCant || d.mostrarPct) {
      for (let i = 0; i < n; i++) {
        const v = numeroSeguro(d.filas[i][s], 0);
        const texto = d.mostrarCant && d.mostrarPct
          ? fmtNum(v) + " (" + d.pct(v) + ")"
          : (d.mostrarPct ? d.pct(v) : fmtNum(v));
        const p = puntoDe(i, (R * Math.max(0, v)) / vmax + 12);
        S.push(txt(p.x, p.y + 3, texto, { tam: 9.5, peso: 600 }));
      }
    }
  }

  // Etiquetas de los rayos (son datos: siempre)
  for (let i = 0; i < n; i++) {
    const rad = (anguloDe(i) * Math.PI) / 180;
    const p = puntoDe(i, R + 14);
    const sen = Math.sin(rad), cos = Math.cos(rad);
    const ancla = Math.abs(sen) < 0.35 ? "middle" : (sen > 0 ? "start" : "end");
    const dy = cos < -0.35 ? 10 : (cos > 0.35 ? -2 : 4);
    S.push(txt(p.x, p.y + dy, d.etiquetas[i], { ancla, tam: 12 }));
  }

  return envolver(S.join(""), d, d.ancho, alto);
}

/* ============================================================
   ENSAMBLE — la única función exportada
   ============================================================ */

export function dibujarGrafico(configuracion = {}) {
  const cfg = configuracion || {};
  const tipo = normalizarTipo(cfg.tipo);
  const d = normalizarDatos(cfg, tipo);
  inyectarEstilos();

  let el;
  switch (tipo) {
    case "columnas":          el = graficarColumnas(d, false); break;
    case "barras-agrupadas":  el = graficarColumnas(d, true); break;
    case "barras":            el = graficarBarrasH(d, false); break;
    case "barras-apiladas":   el = graficarApiladas(d); break;
    case "lineas":            el = graficarLinea(d, false); break;
    case "lineas-temporales": el = graficarLinea(d, true); break;
    case "area":              el = graficarArea(d); break;
    case "histograma":        el = graficarHistograma(d); break;
    case "dispersion":        el = graficarDispersion(d, false); break;
    case "burbujas":          el = graficarDispersion(d, true); break;
    case "velas":             el = graficarVelas(d); break;
    case "cascada":           el = graficarCascada(d); break;
    case "pastel":            el = graficarCircular(d, false); break;
    case "dona":              el = graficarCircular(d, true); break;
    case "radar":             el = graficarRadar(d); break;
  }

  const destino = (cfg.contenedor && typeof cfg.contenedor.appendChild === "function")
    ? cfg.contenedor
    : destinoPrincipal();
  if (destino && el) destino.appendChild(el);
  return el;
}