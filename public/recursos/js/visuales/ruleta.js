// ============================================================
// ruleta.js — Visual: RULETA DE PALABRAS
// (recursos/js/visuales/ruleta.js)   ·   v1
//
// Ruleta personalizada estilo feria: el docente da la LISTA DE
// PALABRAS (máximo 25) y, si quiere, el COLOR de la parte de cada
// una; las que no llevan color reciben UNO AL AZAR — siempre
// DIFERENTE del de las demás (ángulo áureo: matices repartidos y
// lejos de los colores elegidos a mano).
//
// ─── EL GIRO (aquí juegan las físicas) ───
//   Al pulsar GIRAR la ruleta recibe un IMPULSO al azar y frena
//   sola con rozamiento exponencial: ni el punto donde para ni la
//   DURACIÓN del giro se repiten (velocidad y frenado se sortean en
//   cada vuelta, y cada clavija del aro roba un poco de giro al
//   pasar). El puntero/palanca de arriba REBOTA con las clavijas
//   como en una ruleta real y, cuando se detiene demasiado cerca de
//   una, la ruleta se asienta hacia atrás un pelín (nunca queda
//   «clavada» en la raya). DONDE PARA, VUELVE A GIRAR: el ángulo es
//   acumulativo, la siguiente vuelta sigue desde el punto exacto
//   donde se quedó.
//
// ─── RESULTADO ───
//   Al frenar, la parte ganadora se RESALTA, saluda una lluvia de
//   confeti con los colores de la propia ruleta y aparece el banner
//   «Resultado» con la palabra en una pastilla de SU color. Se puede
//   volver a girar cuantas veces se quiera (es un VISUAL: no
//   califica, no guarda ni pide nada).
//
// ─── PARÁMETROS (objeto config) ───
//   titulo        Título de la tarjeta (defecto «Ruleta»).
//   palabras      Lista de palabras: strings u objetos
//                 { palabra, color } — MÁXIMO 25 (las de más se
//                 ignoran). color opcional en HEX o rgb(); vacío o
//                 inválido → color al azar distinto para cada una.
//   tamano        Lado de la ruleta en px (220–680; defecto 420).
//   colorTarjeta  Color de la TARJETA (aro, botón GIRAR, banner) en
//                 HEX o rgb(). REGLA DEL PROYECTO: si no se pasa (o
//                 es inválido) se usa el color PREDEFINIDO de este
//                 visual — un color FIJO (#dc2626 rojo feria), NO
//                 cambia en cada montaje. En «Crear» se elige con el
//                 SELECTOR RGB (input de color, sin escribir nada).
//   contenedor    HTMLElement o selector: ahí se agrega. Sin
//                 contenedor se muestra centrada en el <body>.
//
// ─── DEVUELVE ───
//   El elemento .rl-caja (con .destruir()). Nunca queda vacía: sin
//   palabras muestra un aviso amable. Dependencia CERO: canvas 2D +
//   estilos inyectados desde la propia función.
//
// USO DESDE UNA CLASE (contenido):
//   import { ruleta } from "../../../recursos/js/visuales/ruleta.js";
//
//   ruleta({ contenedor: zona, titulo: "Vocabulario de hoy",
//     colorTarjeta: "#0ea5e9", tamano: 460,
//     palabras: [
//       "fotosíntesis",
//       { palabra: "evaporación", color: "#0ea5e9" },
//       "condensación",
//     ] });
// ============================================================

/* ---------------- Color (regla del proyecto: colorTarjeta) ---------------- */

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

/**
 * REGLA DEL PROYECTO (aclarada): el color por defecto de cada
 * util/visual es PREDEFINIDO — un color FIJO y adaptado, no uno que
 * cambie en cada montaje. Para la ruleta es el rojo feria #dc2626:
 * vive en el aro, el botón GIRAR y el banner; legible con blanco y
 * con buenos tonos claros/oscuros derivados. En «Crear» el docente
 * lo cambia con el selector RGB (input de color) sin escribirlo.
 */
export const COLOR_DEFECTO = [220, 38, 38];   // #dc2626

/* ---------------- Colores al azar, DIFERENTES entre sí ---------------- */

// hsl(h 0–360, s%, l%) → [r, g, b]
function hslARgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [0, 8, 4].map((n) => Math.round(f(n) * 255));
}

// Matiz (0–360) de un color; null si es gris o casi gris (sin matiz útil)
function matizDe([r, g, b]) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const d = max - min;
  if (d < 0.08) return null;
  let h;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return ((h * 60) + 360) % 360;
}

// Distancia circular entre dos matices (0–180)
function distMatiz(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Colores AL AZAR para las porciones sin color elegido, TODOS
 * DIFERENTES: se reparten con el ángulo áureo (137.508°) — cada
 * nuevo matiz cae lejos de los anteriores — arrancando de un matiz
 * sorteado, y se esquivan los matices de los colores ELEGIDOS a mano
 * para que ninguna parte se confunda con otra. Misma familia de
 * saturación/luminosidad → siempre legibles con el texto encima.
 */
function coloresAlAzar(cuantos, elegidos) {
  const matices = elegidos.map(matizDe).filter((h) => h !== null);
  const paso = 137.508;                 // ángulo áureo
  const fuera = [];
  let h = Math.random() * 360;          // arranque al azar
  for (let i = 0; i < cuantos; i++) {
    // busca un matiz lejos de los demás; si la rueda se llena (25
    // porciones llenan los matices), el margen se afloja poco a poco
    for (let t = 0; t < 90; t++) {
      const margen = Math.max(4, 14 - t * 0.12);
      if (matices.every((u) => distMatiz(h, u) >= margen)) break;
      h = (h + paso) % 360;
    }
    matices.push(h);
    // luminosidad ALTERNADA: dos porciones vecinas jamás se confunden
    const l = i % 2 === 0 ? 45 + Math.random() * 6 : 38 + Math.random() * 5;
    fuera.push(hslARgb(h, 63 + Math.random() * 9, l));
    h = (h + paso) % 360;
  }
  return fuera;
}

/* ---------------- Datos ---------------- */

/**
 * Normaliza la lista: strings ("meta") u objetos { palabra, color }.
 * La PALABRA es obligatoria: las entradas sin palabra se ignoran.
 */
function normalizarItems(palabras) {
  const lista = Array.isArray(palabras) ? palabras : [];
  const fuera = [];
  for (const cruda of lista) {
    if (cruda == null) continue;
    if (typeof cruda === "string" || typeof cruda === "number") {
      const p = String(cruda).trim();
      if (p) fuera.push({ palabra: p, color: "", rgb: null });
      continue;
    }
    if (typeof cruda === "object") {
      const p = String(cruda.palabra ?? cruda.texto ?? cruda.termino ?? "").trim();
      if (!p) continue;
      fuera.push({
        palabra: p,
        color: String(cruda.color ?? "").trim(),
        rgb: null,
      });
    }
  }
  return fuera;
}

// Texto legible SOBRE un color: negro si el fondo es muy claro
function textoSobre([r, g, b]) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.72 ? "#1f2937" : "#ffffff";
}

const mod2pi = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

/* ---------------- Estilos (una vez) ---------------- */

let estilosListos = false;
function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-ruleta-estilos";
  estilo.textContent = `
    .rl-caja {
      --rl-c: #dc2626;
      --rl-oscuro: #9f1d1d;
      --rl-claro: #fee2e2;
      --rl-borde: #fecaca;
      width: 100%;
      margin: 1rem auto;
      background: #ffffff;
      border: 1px solid var(--rl-borde);
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 6px 24px rgba(17, 12, 46, .08);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      box-sizing: border-box;
    }
    .rl-caja *, .rl-caja *::before, .rl-caja *::after { box-sizing: border-box; }
    .rl-caja [hidden] { display: none !important; }

    /* ── Cabecera ── */
    .rl-cab {
      display: flex;
      align-items: center;
      gap: .6rem;
      padding: .95rem 1.1rem .55rem;
      flex-wrap: wrap;
    }
    .rl-icono {
      display: inline-flex;
      flex: none;
      width: 2.1rem;
      height: 2.1rem;
      align-items: center;
      justify-content: center;
      border-radius: .65rem;
      background: linear-gradient(135deg, var(--rl-c), var(--rl-oscuro));
      color: #ffffff;
      box-shadow: 0 3px 10px rgba(17, 12, 46, .16);
    }
    .rl-icono svg { width: 1.25rem; height: 1.25rem; }
    .rl-titulo {
      flex: 1;
      min-width: 0;
      margin: 0;
      font-size: clamp(1.12rem, 2.4vw, 1.4rem);
      font-weight: 800;
      line-height: 1.3;
      color: #111827;
      word-break: break-word;
    }
    .rl-titulo > span {
      background-image: linear-gradient(var(--rl-claro), var(--rl-claro));
      background-repeat: no-repeat;
      background-size: 100% .42em;
      background-position: 0 88%;
      padding: 0 .12em;
      border-bottom: 3px solid var(--rl-c);
    }
    .rl-chip {
      flex: none;
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .04em;
      color: var(--rl-oscuro);
      background: var(--rl-claro);
      border: 1px solid var(--rl-borde);
      padding: .22rem .6rem;
      border-radius: 999px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    /* ── Escenario: ruleta + puntero + botón ── */
    .rl-escenario {
      display: flex;
      justify-content: center;
      padding: .5rem .9rem .2rem;
    }
    .rl-zona {
      position: relative;
      width: 100%;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
    }
    .rl-zona canvas { display: block; width: 100%; height: 100%; }
    .rl-confeti {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 3;
    }
    .rl-girar {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 27%;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      border: 4px solid #ffffff;
      background: radial-gradient(circle at 32% 28%, var(--rl-c), var(--rl-oscuro) 78%);
      color: #ffffff;
      font-family: inherit;
      font-weight: 900;
      letter-spacing: .07em;
      line-height: 1.1;
      cursor: pointer;
      box-shadow: 0 5px 18px rgba(0, 0, 0, .38), inset 0 -3px 8px rgba(0, 0, 0, .22);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
    }
    .rl-girar:hover:enabled { transform: translate(-50%, -50%) scale(1.045); }
    .rl-girar:active:enabled { transform: translate(-50%, -50%) scale(.97); }
    .rl-girar:disabled { filter: saturate(.55) brightness(.92); cursor: default; }
    .rl-zona canvas.rl-lienzo { cursor: pointer; }
    .rl-zona canvas.rl-lienzo:active { cursor: grabbing; }

    /* ── Resultado ── */
    .rl-resultado {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .55rem;
      flex-wrap: wrap;
      margin: .55rem 1.1rem 0;
      padding: .55rem .8rem;
      border: 1.5px dashed var(--rl-borde);
      border-left: 5px solid var(--rl-c);
      border-radius: .7rem;
      background: var(--rl-claro);
    }
    .rl-resultado-et {
      font-size: .74rem;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--rl-oscuro);
    }
    .rl-resultado-palabra {
      display: inline-block;
      max-width: 100%;
      padding: .28rem .85rem;
      border-radius: 999px;
      font-size: 1.12rem;
      font-weight: 900;
      line-height: 1.35;
      word-break: break-word;
      box-shadow: 0 2px 8px rgba(17, 12, 46, .18);
    }

    /* ── Pie y vacío ── */
    .rl-pie {
      margin: 0;
      padding: .5rem 1.2rem .95rem;
      text-align: center;
      font-size: .74rem;
      color: #6b7280;
    }
    .rl-vacio {
      margin: .4rem 1.1rem 1rem;
      border: 1.5px dashed var(--rl-borde);
      background: var(--rl-claro);
      color: #6b7280;
      border-radius: .7rem;
      padding: 1.2rem 1rem;
      text-align: center;
      font-size: .9rem;
      font-weight: 600;
    }

    @media (max-width: 560px) {
      .rl-cab { padding: .8rem .85rem .45rem; }
      .rl-chip { display: none; }
      .rl-resultado { margin: .5rem .85rem 0; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- SVG inline ---------------- */

const SVG_RULETA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/>' +
  '<path d="M12 3v6.6M12 14.4V21M3 12h6.6M14.4 12H21M5.6 5.6l4.7 4.7M13.7 13.7l4.7 4.7M18.4 5.6l-4.7 4.7M10.3 13.7l-4.7 4.7"/>' +
  "</svg>";

/* ---------------- Componente ---------------- */

/**
 * Monta la RULETA DE PALABRAS. Devuelve el elemento .rl-caja (con
 * .destruir() y con caja.__ruleta, un gancho de lectura para
 * pruebas: angulo/girando/items/ganador/girar). Visual puro: no
 * califica ni guarda nada.
 */
export function ruleta(config = {}) {
  const { contenedor } = config;

  // REGLA del proyecto: colorTarjeta HEX/rgb; VACÍO o inválido →
  // color PREDEFINIDO FIJO de este visual (#dc2626, no cambia cada vez)
  const color = parseColor(config.colorTarjeta) || COLOR_DEFECTO;

  // Palabras: MÁXIMO 25 (las de más se ignoran, con aviso por consola)
  let items = normalizarItems(config.palabras);
  if (items.length > 25) {
    console.warn("[ruleta] la lista admite MÁXIMO 25 palabras; se conservan las primeras 25 (" +
      items.length + " recibidas).");
    items = items.slice(0, 25);
  }

  // Color de CADA porción: el elegido manda; el que falte o no se
  // entienda → UNO AL AZAR, distinto del de todas las demás.
  const elegidos = items
    .map((it) => parseColor(it.color))
    .filter(Boolean);
  const alAzar = coloresAlAzar(items.filter((it) => !parseColor(it.color)).length, elegidos);
  let vuelta = 0;
  items.forEach((it) => {
    const fijo = parseColor(it.color);
    it.rgb = fijo || alAzar[vuelta++];
  });

  // Lado de la ruleta (220–680 px; defecto 420)
  const tamano = Math.min(680, Math.max(220, Math.round(Number(config.tamano) || 420)));
  const titulo = String(config.titulo || "").trim() || "Ruleta";

  inyectarEstilos();

  const caja = document.createElement("div");
  caja.className = "rl-caja";
  caja.setAttribute("role", "region");
  caja.setAttribute("aria-label", "Ruleta de palabras");
  caja.style.maxWidth = (tamano + 56) + "px";
  caja.style.setProperty("--rl-c", `rgb(${color.join(",")})`);
  caja.style.setProperty("--rl-oscuro", tono(color, -0.28));
  caja.style.setProperty("--rl-claro", tono(color, 0.93));
  caja.style.setProperty("--rl-borde", tono(color, 0.55));

  /* ── Cabecera ── */
  const cab = document.createElement("div");
  cab.className = "rl-cab";
  const icono = document.createElement("span");
  icono.className = "rl-icono";
  icono.innerHTML = SVG_RULETA;
  const tituloEl = document.createElement("h3");
  tituloEl.className = "rl-titulo";
  const tituloMarca = document.createElement("span");
  tituloMarca.textContent = titulo;
  tituloEl.appendChild(tituloMarca);
  cab.append(icono, tituloEl);

  const n0 = items.length;
  if (n0) {
    const chip = document.createElement("span");
    chip.className = "rl-chip";
    chip.textContent = n0 + (n0 === 1 ? " palabra" : " palabras");
    cab.appendChild(chip);
  }

  /* ── Escenario (ruleta + palanca + botón GIRAR) ── */
  const escenario = document.createElement("div");
  escenario.className = "rl-escenario";
  const zona = document.createElement("div");
  zona.className = "rl-zona";
  zona.style.maxWidth = tamano + "px";
  escenario.appendChild(zona);

  if (!items.length) {
    const vacio = document.createElement("div");
    vacio.className = "rl-vacio";
    vacio.textContent = "Esta ruleta aún no tiene palabras: agrégale al menos una.";
    caja.append(cab, vacio);
    caja.destruir = () => caja.remove();
    return montar(caja, contenedor);
  }

  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const lienzo = document.createElement("canvas");
  lienzo.className = "rl-lienzo";
  lienzo.width = Math.round(tamano * dpr);
  lienzo.height = Math.round(tamano * dpr);
  lienzo.setAttribute("role", "img");
  lienzo.setAttribute("aria-label",
    "Ruleta con " + n0 + (n0 === 1 ? " palabra" : " palabras") + ": pulsa GIRAR");
  const ctx = lienzo.getContext("2d");

  const confetiCv = document.createElement("canvas");
  confetiCv.className = "rl-confeti";
  confetiCv.width = lienzo.width;
  confetiCv.height = lienzo.height;
  const ctxC = confetiCv.getContext("2d");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "rl-girar";
  btn.textContent = "GIRAR";
  btn.style.fontSize = Math.max(11, Math.round(tamano * 0.043)) + "px";
  btn.title = "Gira la ruleta (también puedes tocar la ruleta)";

  zona.append(lienzo, confetiCv, btn);

  /* ── Banner de resultado + pie ── */
  const resultado = document.createElement("div");
  resultado.className = "rl-resultado";
  resultado.hidden = true;
  resultado.setAttribute("aria-live", "polite");
  const resultadoEt = document.createElement("span");
  resultadoEt.className = "rl-resultado-et";
  resultadoEt.textContent = "Resultado";
  const resultadoPalabra = document.createElement("span");
  resultadoPalabra.className = "rl-resultado-palabra";
  resultado.append(resultadoEt, resultadoPalabra);

  const pie = document.createElement("p");
  pie.className = "rl-pie";
  pie.textContent =
    "Pulsa GIRAR: acelera al azar, frena sola con sus físicas y la próxima vuelta sigue desde donde paró.";

  caja.append(cab, escenario, resultado, pie);

  /* ══════════ MOTOR: dibujo + físicas ══════════ */

  const n = items.length;
  const arco = (Math.PI * 2) / n;               // ancho de CADA porción (rad)
  const PUNTERO = -Math.PI / 2;                 // la palanca apunta desde arriba
  // Arranque con la porción 1 centrada bajo el puntero
  let angulo = PUNTERO - arco / 2;
  let girando = false;
  let w = 0;                                    // velocidad angular (rad/s)
  let friccion = 1;                             // 1/s, se sortea en cada giro
  let resaltado = -1;
  let ganadorIdx = -1;
  let palanca = 0;                              // rebote del puntero (rad)
  let palancaV = 0;
  let tPrevio = 0;
  let rafId = 0;

  const c = tamano / 2;
  const RADIO = c - 4;
  const ARO = Math.max(9, Math.round(tamano * 0.026));
  const RPORTION = RADIO - ARO;                 // radio de las porciones

  function rgbCss([r, g, b]) {
    return `rgb(${r},${g},${b})`;
  }
  function aclarar([r, g, b], k) {
    return [
      Math.round(r + (255 - r) * k),
      Math.round(g + (255 - g) * k),
      Math.round(b + (255 - b) * k),
    ];
  }

  function dibujar() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, tamano, tamano);

    // aro exterior con degradado del color de la tarjeta
    const degrad = ctx.createLinearGradient(0, 0, 0, tamano);
    degrad.addColorStop(0, tono(color, -0.38));
    degrad.addColorStop(1, tono(color, -0.12));
    ctx.beginPath();
    ctx.arc(c, c, RADIO - ARO / 2, 0, Math.PI * 2);
    ctx.lineWidth = ARO;
    ctx.strokeStyle = degrad;
    ctx.stroke();

    // sombra suave bajo la ruleta
    ctx.beginPath();
    ctx.arc(c, c + 6, RADIO, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(17,12,46,.10)";
    ctx.fill();

    // porciones
    for (let i = 0; i < n; i++) {
      const a0 = angulo + i * arco;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, RPORTION, a0, a0 + arco);
      ctx.closePath();
      ctx.fillStyle = rgbCss(i === resaltado ? aclarar(items[i].rgb, 0.16) : items[i].rgb);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.stroke();
    }

    // anillo del ganador (una vez frenada)
    if (resaltado >= 0 && !girando) {
      const a0 = angulo + resaltado * arco;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, RPORTION - 1.5, a0, a0 + arco);
      ctx.closePath();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }

    // clavijas del aro (una en cada raya; la palanca rebota en ellas)
    for (let i = 0; i < n; i++) {
      const a = angulo + i * arco;
      const x = c + Math.cos(a) * (RADIO - ARO / 2);
      const y = c + Math.sin(a) * (RADIO - ARO / 2);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, tamano * 0.006), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.fill();
    }

    // palabras, a lo largo del radio, encogiendo/recortando si no caben
    const anchoUtil = RPORTION - Math.max(22, tamano * 0.075);
    let fs = Math.max(9.5, Math.min(17,
      2 * anchoUtil * Math.sin(arco / 2) * 0.52));
    for (let i = 0; i < n; i++) {
      const m = angulo + (i + 0.5) * arco;
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(m);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      let txt = items[i].palabra;
      let fsI = fs;
      ctx.font = `800 ${fsI}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
      while (ctx.measureText(txt).width > anchoUtil && fsI > 8.5) {
        fsI -= 0.5;
        ctx.font = `800 ${fsI}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
      }
      while (ctx.measureText(txt).width > anchoUtil && txt.length > 1) {
        txt = txt.slice(0, -2) + "…";
      }
      ctx.shadowColor = "rgba(0,0,0,.35)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = textoSobre(items[i].rgb);
      ctx.fillText(txt, RPORTION - 14, 0);
      ctx.restore();
    }

    // palanca/puntero de arriba (rebota con las clavijas)
    ctx.save();
    ctx.translate(c, c - RADIO + 2);
    ctx.rotate(palanca);
    ctx.beginPath();
    ctx.moveTo(-tamano * 0.024, -tamano * 0.02);
    ctx.lineTo(tamano * 0.024, -tamano * 0.02);
    ctx.lineTo(0, tamano * 0.052);
    ctx.closePath();
    ctx.fillStyle = tono(color, -0.18);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -tamano * 0.006, Math.max(2.6, tamano * 0.009), 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }

  /* ── un giro: impulso al azar + rozamiento exponencial + clavijas ── */

  function girar() {
    if (girando || !items.length) return;
    girando = true;
    resaltado = -1;
    ganadorIdx = -1;
    resultado.hidden = true;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    w = 11 + Math.random() * 5.5;          // impulso distinto en cada vuelta
    friccion = 0.95 + Math.random() * 0.5; // frenado distinto en cada vuelta
    tPrevio = performance.now();
    rafId = requestAnimationFrame(paso);
  }

  function paso(t) {
    const dt = Math.min(0.05, (t - tPrevio) / 1000);
    tPrevio = t;

    // ¿cuántas clavijas pasaron por el puntero este fotograma?
    const idxAntes = (PUNTERO - angulo) / arco;
    angulo += w * dt;
    const idxDespues = (PUNTERO - angulo) / arco;
    const cruces = Math.min(3, Math.floor(idxAntes) - Math.floor(idxDespues));
    if (cruces > 0 && w > 0.2) {
      palancaV += (4.5 + w * 0.5) * cruces;      // la clavija levanta la palanca
      w *= 0.988 + Math.random() * 0.008;        // …y le roba un poco de giro
    }

    // muelle de la palanca: vuelve a su sitio vibrando un pelín
    palancaV += (-170 * palanca - 9.5 * palancaV) * dt;
    palanca = Math.max(-0.06, Math.min(0.9, palanca + palancaV * dt));

    // físicas: rozamiento exponencial + freno final más fuerte
    w *= Math.exp(-friccion * dt);
    if (w < 0.2) w *= Math.exp(-2.2 * dt);

    if (w <= 0.02) {
      detenerse();
      return;
    }
    dibujar();
    rafId = requestAnimationFrame(paso);
  }

  function detenerse() {
    girando = false;
    w = 0;
    // asentado físico: si frenó pegado a una clavija, retrocede un
    // pelín (la clavija la empuja de vuelta) — JAMÁS queda en la raya.
    // OJO: lo que se mide es la posición DENTRO de SU porción
    // (offTotal % arco), no el ángulo absoluto.
    const offTotal = mod2pi(PUNTERO - angulo);
    const dentro = offTotal % arco;
    const margen = arco * 0.06;
    if (dentro < margen) angulo -= (margen - dentro) + 0.004;
    else if (dentro > arco - margen) angulo += (dentro - (arco - margen)) + 0.004;

    ganadorIdx = Math.floor(mod2pi(PUNTERO - angulo) / arco) % n;
    resaltado = ganadorIdx;

    // banner con la palabra y SU color
    const it = items[ganadorIdx];
    resultadoPalabra.textContent = it.palabra;
    resultadoPalabra.style.background = rgbCss(it.rgb);
    resultadoPalabra.style.color = textoSobre(it.rgb);
    resultado.hidden = false;

    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    lanzarConfeti();
    dibujar();
  }

  /* ── confeti con los colores de la propia ruleta ── */

  let confetiRaf = 0;
  let confetiPartes = [];
  let confetiPrevio = 0;

  function lanzarConfeti() {
    const paleta = items.map((it) => rgbCss(it.rgb));
    const y0 = c - tamano * 0.14;
    for (let i = 0; i < 72; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.1;
      const v = 210 + Math.random() * 270;
      confetiPartes.push({
        x: c + (Math.random() - 0.5) * 26,
        y: y0,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        w: 4.5 + Math.random() * 4.5,
        h: 7 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 11,
        color: paleta[i % paleta.length],
        vida: 1.05 + Math.random() * 0.4,
      });
    }
    if (!confetiRaf) {
      confetiPrevio = performance.now();
      confetiRaf = requestAnimationFrame(pasoConfeti);
    }
  }

  function pasoConfeti(t) {
    const dt = Math.min(0.05, (t - confetiPrevio) / 1000);
    confetiPrevio = t;
    ctxC.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxC.clearRect(0, 0, tamano, tamano);
    confetiPartes = confetiPartes.filter((p) => p.vida > 0);
    for (const p of confetiPartes) {
      p.vy += 660 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.vida -= dt;
      p.vx *= 1 - 0.9 * dt;
      ctxC.save();
      ctxC.globalAlpha = Math.max(0, Math.min(1, p.vida));
      ctxC.translate(p.x, p.y);
      ctxC.rotate(p.rot);
      ctxC.fillStyle = p.color;
      ctxC.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctxC.restore();
    }
    if (confetiPartes.length) {
      confetiRaf = requestAnimationFrame(pasoConfeti);
    } else {
      confetiRaf = 0;
      ctxC.clearRect(0, 0, tamano, tamano);
    }
  }

  /* ── eventos: botón central y también tocar la ruleta ── */

  btn.addEventListener("click", girar);
  lienzo.addEventListener("click", girar);

  /* ── gancho de lectura (pruebas E2E) ── */

  caja.__ruleta = {
    angulo: () => angulo,
    girando: () => girando,
    items: () => items.map((it) => ({ palabra: it.palabra, color: it.color })),
    colores: () => items.map((it) => rgbCss(it.rgb)),
    ganador: () => ganadorIdx,
    girar,
  };

  dibujar();

  caja.destruir = () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (confetiRaf) cancelAnimationFrame(confetiRaf);
    rafId = 0;
    confetiRaf = 0;
    caja.remove();
  };
  return montar(caja, contenedor);
}

/* ¿Dónde vive? — con contenedor: dentro de él; sin contenedor:
   centrada en el <body> (como el resto de visuales del proyecto). */
function montar(caja, contenedor) {
  if (typeof contenedor === "string" && document.querySelector(contenedor)) {
    document.querySelector(contenedor).append(caja);
  } else if (contenedor && typeof contenedor.append === "function") {
    contenedor.append(caja);
  } else {
    const fuera = document.createElement("div");
    fuera.style.cssText =
      "display:flex;justify-content:center;align-items:flex-start;" +
      "width:100%;min-height:100vh;min-height:100svh;padding:26px 12px;box-sizing:border-box;";
    fuera.append(caja);
    document.body.append(fuera);
    const destruir = caja.destruir;
    caja.destruir = () => { caja.remove(); fuera.remove(); void destruir; };
    return caja;
  }
  return caja;
}
