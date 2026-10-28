// ============================================================
// simulador.js — Util: SIMULADOR DE SORTEO (caja de papeles)
// (js/utils/simulador.js)   ·   v1
//
// Una CAJA llena de PAPELES con frases o palabras: le das la
// lista (cada frase es UN papel) y el util monta una caja de
// cartón de verdad con los papeles asomando por la boca; al
// pulsar «Extraer papel» la caja se sacude, un papel sale
// volando de la boca y la frase cae escrita en UN PAPEL grande
// sobre la TARJETA del resultado.
//
// ─── COMPLETAMENTE ALEATORIO ───
//   El papel sale con crypto.getRandomValues (uniforme SIN
//   sesgo de módulo: el intervalo sobrante se descarta y se
//   vuelve a sortear). Ninguna frase «pesa» más que otra por
//   su posición: todas las salidas son equiprobables.
//
// ─── CON O SIN REPETICIÓN ───
//   · Con repetición (defecto): el papel extraído VUELVE a la
//     caja, así que siempre hay la misma cantidad y una frase
//     puede salir más de una vez.
//   · Sin repetición: el papel que sale NO vuelve; se acabó
//     cuando la caja queda vacía (el botón pasa a «Volver a
//     llenar la caja» y hay un «Reiniciar» a medio camino).
//   · PROBABILIDAD A MANO: si escribes la MISMA frase en varias
//     filas, la caja lleva varios papeles iguales y esa frase
//     tiene MÁS probabilidades de salir (peso por duplicado).
//
// ─── COLORES (regla del proyecto) ───
//   · colorCaja     Color del CARTÓN de la caja — defecto
//                   PREDEFINIDO y FIJO #b45309 (marrón cartón).
//   · colorTarjeta  Fondo de la TARJETA donde aterriza el
//                   resultado — defecto PREDEFINIDO y FIJO
//                   #eff6ff (azul clarito).
//   · colorPapel    Fondo de los PAPELES (los de adentro, el
//                   que vuela y el grande con la frase, además
//                   de la etiqueta de la caja) — defecto
//                   PREDEFINIDO y FIJO #fefce8 (crema papel).
//   Son colores FIJOS: NO cambian en cada montaje. La LETRA de
//   la frase y del papel se adapta sola (oscura sobre fondos
//   claros, clara sobre oscuros) para que SIEMPRE se lea.
//   Elegibles con el SELECTOR DE COLOR RGB en «Crear» (un
//   input de color: clic, escoges y listo; botón «Defecto»).
//
// ─── PARÁMETROS (objeto config) ───
//   frases       Lista de palabras o frases: UNA por papel
//                (array de textos; se admiten duplicados a
//                propósito — cada duplicado es otro papel).
//   repeticion   true (defecto) = el papel vuelve a la caja;
//                false = sin repetición. También acepta
//                «si»/«no».
//   colorCaja     HEX/rgb (defecto fijo #b45309).
//   colorTarjeta  HEX/rgb (defecto fijo #eff6ff).
//   colorPapel    HEX/rgb (defecto fijo #fefce8).
//   contenedor   HTMLElement o selector: ahí se agrega. Sin
//                contenedor se muestra centrado en el <body>.
//
// ─── DEVUELVE ───
//   El elemento .sim-caja (con .destruir() y con caja.__simulador,
//   un gancho de lectura para pruebas). Dependencia CERO:
//   HTML + CSS inyectados desde la propia función. Es una
//   HERRAMIENTA visual: no califica, no guarda ni pide nada.
//
// USO DESDE UNA CLASE (contenido):
//   import { simulador } from "../js/utils/simulador.js";
//
//   simulador({ contenedor: zona, frases: ["La fotosíntesis",
//     "La fotosíntesis", "El ciclo del agua", "Los ecosistemas"],
//     repeticion: false, colorCaja: "#a16207" });
// ============================================================

/* ---------------- Color (regla del proyecto) ---------------- */

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

function oscurecer([r, g, b], k) {
  return [Math.round(r * (1 - k)), Math.round(g * (1 - k)), Math.round(b * (1 - k))];
}

/* Letra que SE LEE sobre el fondo dado: oscura en claros,
   clara en oscuros (regla: los defectos van adaptados). */
function textoSobre([r, g, b]) {
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#1f2937" : "#f8fafc";
}

/**
 * REGLA DEL PROYECTO (aclarada): el color por defecto de cada
 * util/visual es PREDEFINIDO — un color FIJO y adaptado, no uno
 * que cambie en cada montaje. El simulador trae TRES: el cartón
 * de la caja (#b45309), el fondo de la tarjeta del resultado
 * (#eff6ff) y el fondo de los papeles (#fefce8).
 * En «Crear» se eligen con el selector RGB (input de color) sin
 * escribir nada.
 */
export const COLOR_CAJA_DEFECTO = [180, 83, 9];       // #b45309 cartón
export const COLOR_TARJETA_DEFECTO = [239, 246, 255]; // #eff6ff tarjeta
export const COLOR_PAPEL_DEFECTO = [254, 252, 232];   // #fefce8 papel

/* ---------------- Azar de verdad (uniforme, sin sesgo) ---------------- */

function indiceAzar(n) {
  if (!(n > 1)) return 0;
  const cripto = typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
    ? crypto : null;
  if (!cripto) return Math.floor(Math.random() * n);
  // Rechazo: el sobrante del módulo se descarta (todos los
  // restantes son equiprobables — sin sesgo de módulo).
  const tope = Math.floor(4294967296 / n) * n;
  const buf = new Uint32Array(1);
  let v;
  do { cripto.getRandomValues(buf); v = buf[0]; } while (v >= tope);
  return v % n;
}

/* ---------------- Frases: una por papel (duplicados intactos) ---------------- */

function normalizarFrases(v) {
  const lista = Array.isArray(v) ? v : [];
  const fuera = [];
  for (const it of lista) {
    const t = (typeof it === "string" ? it : String(it && it.texto != null ? it.texto : (it && it.frase) || "")).trim();
    if (t) fuera.push(t);
  }
  return fuera;
}

/* Tamaño de letra de la frase: cabe SIEMPRE (encoge con el largo). */
function tamLetra(t) {
  const n = t.length;
  if (n <= 26) return "1.5rem";
  if (n <= 60) return "1.25rem";
  if (n <= 110) return "1.05rem";
  return "0.92rem";
}

/* ---------------- Estilos (una vez) ---------------- */

let estilosListos = false;
function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-simulador-estilos";
  estilo.textContent = `
    .sim-caja {
      --sim-caja: #b45309;
      --sim-caja-claro: #d59453;
      --sim-caja-oscuro: #7b3a06;
      --sim-tarjeta: #eff6ff;
      --sim-tarjeta-borde: #c8dbf7;
      --sim-tarjeta-texto: #1f2937;
      --sim-papel: #fefce8;
      --sim-papel-texto: #1f2937;
      --sim-papel-doblez: #f2e9c0;
      --sim-papel-chip: #e9dfa8;
      --sim-mini-linea: #e0d5a4;
      --sim-btn: #703c06;
      --sim-btn-hover: #572e05;
      --sim-btn-texto: #f8fafc;
      width: 100%;
      margin: 1.2rem auto;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
    }
    .sim-caja *, .sim-caja *::before, .sim-caja *::after { box-sizing: border-box; }
    .sim-caja [hidden] { display: none !important; }

    /* ── Escena: tarjeta (resultado) + caja ── */
    .sim-escena {
      display: flex;
      gap: 1.2rem;
      align-items: stretch;
      flex-wrap: wrap;
    }

    .sim-tarjeta {
      position: relative;
      flex: 1 1 300px;
      min-width: 260px;
      min-height: 236px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.15rem;
      border-radius: 16px;
      background: var(--sim-tarjeta);
      border: 1.5px solid var(--sim-tarjeta-borde);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .65),
        0 8px 20px rgba(15, 23, 42, .08);
    }

    .sim-vacio {
      text-align: center;
      color: var(--sim-tarjeta-texto);
      opacity: .68;
      font-size: .95rem;
      font-weight: 600;
      line-height: 1.45;
      max-width: 30ch;
    }
    .sim-vacio svg { width: 1.9rem; height: 1.9rem; display: block; margin: 0 auto .55rem; opacity: .8; }

    /* ── El papel extraído (grande, con su doblez) ── */
    .sim-papel {
      position: relative;
      width: 100%;
      max-width: 460px;
      margin: auto;
      padding: 1.5rem 1.4rem 1.15rem;
      border-radius: 6px;
      background: var(--sim-papel);
      color: var(--sim-papel-texto);
      box-shadow:
        0 12px 24px rgba(15, 23, 42, .16),
        0 2px 6px rgba(15, 23, 42, .10);
      transform: rotate(-1.4deg);
      animation: sim-entra .32s ease;
    }
    .sim-papel::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      width: 0;
      height: 0;
      border-top: 20px solid var(--sim-papel-doblez);
      border-left: 20px solid transparent;
      border-top-right-radius: 6px;
    }
    .sim-frase {
      font-weight: 650;
      line-height: 1.35;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .sim-chip {
      display: inline-block;
      margin-top: .85rem;
      padding: .24rem .65rem;
      border-radius: 999px;
      font-size: .72rem;
      font-weight: 750;
      letter-spacing: .03em;
      background: var(--sim-papel-chip);
      opacity: .9;
    }

    /* ── La caja de cartón ── */
    .sim-cajonera {
      position: relative;
      flex: 0 0 232px;
      width: 232px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .sim-saliente {
      position: relative;
      z-index: 1;
      height: 56px;
      margin-bottom: -8px;
    }
    .sim-mini {
      position: absolute;
      bottom: 0;
      width: 30px;
      border-radius: 3px 3px 2px 2px;
      background: var(--sim-papel);
      box-shadow: 0 -1px 3px rgba(15, 23, 42, .20);
      transform-origin: bottom center;
    }
    .sim-mini::after {
      content: "";
      position: absolute;
      left: 6px;
      right: 6px;
      top: 9px;
      height: 2px;
      border-radius: 2px;
      background: var(--sim-mini-linea);
      box-shadow: 0 6px 0 var(--sim-mini-linea), 0 12px 0 var(--sim-mini-linea);
    }
    .sim-cuerpo {
      position: relative;
      z-index: 2;
      height: 122px;
      border-radius: 10px 10px 13px 13px;
      background: linear-gradient(160deg, var(--sim-caja-claro) 0%, var(--sim-caja) 52%, var(--sim-caja-oscuro) 100%);
      box-shadow:
        inset 0 2px 0 rgba(255, 255, 255, .32),
        inset 0 -3px 8px rgba(0, 0, 0, .22),
        0 10px 22px rgba(15, 23, 42, .20);
    }
    .sim-boca {
      position: absolute;
      top: 7px;
      left: 14px;
      right: 14px;
      height: 15px;
      border-radius: 8px;
      background: linear-gradient(180deg, #0b1220 0%, #1f2937 100%);
      box-shadow: inset 0 2px 5px rgba(0, 0, 0, .70);
    }
    .sim-etiqueta {
      position: absolute;
      left: 50%;
      bottom: 15px;
      transform: translateX(-50%) rotate(-2deg);
      min-width: 98px;
      padding: .42rem .95rem .5rem;
      border-radius: 8px;
      background: var(--sim-papel);
      color: var(--sim-papel-texto);
      text-align: center;
      box-shadow: 0 3px 8px rgba(15, 23, 42, .28);
    }
    .sim-etiqueta b {
      display: block;
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1;
    }
    .sim-etiqueta small {
      display: block;
      font-size: .6rem;
      font-weight: 750;
      letter-spacing: .09em;
      text-transform: uppercase;
      opacity: .72;
      margin-top: 2px;
    }
    .sim-piso {
      height: 12px;
      margin: 2px 12px 0;
      border-radius: 50%;
      background: rgba(15, 23, 42, .16);
      filter: blur(4px);
    }

    /* ── Animaciones del sorteo ── */
    .sim-sacude { animation: sim-sacudir .55s ease; }
    @keyframes sim-sacudir {
      0%, 100% { transform: translateX(0) rotate(0); }
      20% { transform: translateX(-5px) rotate(-1.3deg); }
      40% { transform: translateX(5px) rotate(1.3deg); }
      60% { transform: translateX(-4px) rotate(-1deg); }
      80% { transform: translateX(4px) rotate(1deg); }
    }
    .sim-volador {
      position: absolute;
      left: 50%;
      bottom: 112px;
      width: 34px;
      height: 44px;
      margin-left: -17px;
      border-radius: 4px;
      background: var(--sim-papel);
      box-shadow: 0 8px 16px rgba(15, 23, 42, .28);
      z-index: 3;
      pointer-events: none;
      animation: sim-salir .72s ease forwards;
    }
    @keyframes sim-salir {
      0% { transform: translateY(12px) rotate(0); opacity: 0; }
      18% { opacity: 1; }
      55% { transform: translateY(-58px) rotate(-9deg); opacity: 1; }
      100% { transform: translateY(-98px) rotate(7deg); opacity: 0; }
    }
    @keyframes sim-entra {
      0% { transform: rotate(-1.4deg) scale(.82); opacity: 0; }
      60% { transform: rotate(-1.4deg) scale(1.04); opacity: 1; }
      100% { transform: rotate(-1.4deg) scale(1); }
    }

    /* ── Barra de controles ── */
    .sim-barra {
      display: flex;
      align-items: center;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: .9rem;
    }
    .sim-btn {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      font: 750 .85rem/1 system-ui, sans-serif;
      padding: .68rem 1.15rem;
      border: 1.5px solid transparent;
      border-radius: .7rem;
      background: var(--sim-btn);
      color: var(--sim-btn-texto);
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(15, 23, 42, .22);
    }
    .sim-btn svg { width: 1rem; height: 1rem; flex: none; }
    .sim-btn:hover:not(:disabled) { background: var(--sim-btn-hover); }
    .sim-btn:disabled { opacity: .45; cursor: not-allowed; }
    .sim-btn--fantasma {
      background: #ffffff;
      color: #475569;
      border-color: #cbd5e1;
      box-shadow: none;
    }
    .sim-btn--fantasma:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
    .sim-estado {
      margin-left: auto;
      font-size: .78rem;
      font-weight: 650;
      color: #64748b;
      text-align: right;
    }
    .sim-caja button:focus-visible {
      outline: 3px solid #1e293b;
      outline-offset: 2px;
    }

    @media (max-width: 620px) {
      .sim-escena { flex-direction: column-reverse; }
      .sim-cajonera { margin: 0 auto; }
      .sim-estado { margin-left: 0; width: 100%; text-align: left; }
    }
    @media (prefers-reduced-motion: reduce) {
      .sim-papel, .sim-volador, .sim-sacude { animation: none; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- SVG de los botones / avisos ---------------- */

const SVG_MANO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/>' +
  '<path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>';

const SVG_DADO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>' +
  '<path d="M16 8h.01"/><path d="M12 12h.01"/><path d="M8 16h.01"/></svg>';

const SVG_REINICIAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';

function svg(codigo) {
  const env = document.createElement("span");
  env.style.cssText = "display:inline-flex;width:1rem;height:1rem;flex:none;";
  env.innerHTML = codigo;
  return env;
}

/* Posición fija de los papeles asomando (variedad sin caos) */
const MINI = [
  { izq: 10, rot: -8, alt: 1 },
  { izq: 36, rot: 6, alt: 0.84 },
  { izq: 62, rot: -3, alt: 0.94 },
  { izq: 88, rot: 9, alt: 0.8 },
  { izq: 114, rot: -6, alt: 0.9 },
  { izq: 140, rot: 4, alt: 0.97 },
];

/**
 * Monta el SIMULADOR DE SORTEO. Devuelve el elemento .sim-caja
 * (con .destruir() y con caja.__simulador, un gancho de lectura
 * para pruebas E2E). Completamente aleatorio (crypto uniforme),
 * con o sin repetición y con probabilidades a mano por duplicado.
 */
export function simulador(config = {}) {
  const { contenedor } = config;

  // REGLA del proyecto: colores HEX/rgb; VACÍO o inválido
  // → el PREDEFINIDO y FIJO de este util (no cambia cada vez)
  const cCaja = parseColor(config.colorCaja) || COLOR_CAJA_DEFECTO;
  const cTarjeta = parseColor(config.colorTarjeta) || COLOR_TARJETA_DEFECTO;
  const cPapel = parseColor(config.colorPapel) || COLOR_PAPEL_DEFECTO;
  const rgbCaja = `rgb(${cCaja.join(",")})`;
  const rgbTarjeta = `rgb(${cTarjeta.join(",")})`;
  const rgbPapel = `rgb(${cPapel.join(",")})`;

  // Lista: UNA frase por papel (los duplicados cuentan: más probabilidad)
  const frases = normalizarFrases(config.frases);
  const total = frases.length;

  // Con repetición (defecto) o sin ella
  const rep = !(config.repeticion === false ||
    String(config.repeticion == null ? "" : config.repeticion).trim().toLowerCase() === "no");

  inyectarEstilos();

  /* ── Estructura ── */
  const caja = document.createElement("div");
  caja.className = "sim-caja";
  caja.setAttribute("role", "region");
  caja.setAttribute("aria-label", "Simulador de sorteo: caja con papeles al azar");

  /* Colores → variables CSS (derivadas: claros/oscuros, doblez,
     líneas de los mini papeles, botón y letra adaptada al fondo) */
  const cBtn = oscurecer(cCaja, 0.38);
  const cBtnHover = oscurecer(cCaja, 0.52);
  caja.style.setProperty("--sim-caja", rgbCaja);
  caja.style.setProperty("--sim-caja-claro", tono(cCaja, 0.30));
  caja.style.setProperty("--sim-caja-oscuro", tono(cCaja, -0.32));
  caja.style.setProperty("--sim-tarjeta", rgbTarjeta);
  caja.style.setProperty("--sim-tarjeta-borde", tono(cTarjeta, -0.16));
  caja.style.setProperty("--sim-tarjeta-texto", textoSobre(cTarjeta));
  caja.style.setProperty("--sim-papel", rgbPapel);
  caja.style.setProperty("--sim-papel-texto", textoSobre(cPapel));
  caja.style.setProperty("--sim-papel-doblez", tono(cPapel, -0.16));
  caja.style.setProperty("--sim-papel-chip", tono(cPapel, -0.09));
  caja.style.setProperty("--sim-mini-linea", tono(cPapel, -0.22));
  caja.style.setProperty("--sim-btn", `rgb(${cBtn.join(",")})`);
  caja.style.setProperty("--sim-btn-hover", `rgb(${cBtnHover.join(",")})`);
  caja.style.setProperty("--sim-btn-texto", textoSobre(cBtn));

  const escena = document.createElement("div");
  escena.className = "sim-escena";

  // TARJETA del resultado (aria-live: los lectores la anuncian)
  const tarjeta = document.createElement("div");
  tarjeta.className = "sim-tarjeta";
  tarjeta.setAttribute("aria-live", "polite");

  // LA CAJA
  const cajonera = document.createElement("div");
  cajonera.className = "sim-cajonera";
  const saliente = document.createElement("div");
  saliente.className = "sim-saliente";
  const cuerpo = document.createElement("div");
  cuerpo.className = "sim-cuerpo";
  const boca = document.createElement("div");
  boca.className = "sim-boca";
  const etiqueta = document.createElement("div");
  etiqueta.className = "sim-etiqueta";
  const etiNum = document.createElement("b");
  const etiTxt = document.createElement("small");
  etiTxt.textContent = "papeles";
  etiqueta.append(etiNum, etiTxt);
  cuerpo.append(boca, etiqueta);
  const piso = document.createElement("div");
  piso.className = "sim-piso";
  cajonera.append(saliente, cuerpo, piso);

  escena.append(tarjeta, cajonera);

  /* ── Barra de controles ── */
  const barra = document.createElement("div");
  barra.className = "sim-barra";
  const btnExtraer = document.createElement("button");
  btnExtraer.type = "button";
  btnExtraer.className = "sim-btn";
  btnExtraer.setAttribute("aria-label", "Extraer un papel al azar de la caja");
  const btnReiniciar = document.createElement("button");
  btnReiniciar.type = "button";
  btnReiniciar.className = "sim-btn sim-btn--fantasma";
  btnReiniciar.hidden = true;
  btnReiniciar.append(svg(SVG_REINICIAR));
  const txtReiniciar = document.createElement("span");
  txtReiniciar.textContent = "Reiniciar";
  btnReiniciar.appendChild(txtReiniciar);
  const estado = document.createElement("span");
  estado.className = "sim-estado";
  barra.append(btnExtraer, btnReiniciar, estado);
  caja.append(escena, barra);

  /* ── Estado ── */
  let bolsillo = [];          // sin repetición: índices que quedan
  let salieron = [];          // resultados ya mostrados (conteo)
  let ultimo = null;          // { i, texto, papel, total }
  let vacia = false;          // sin repetición y bolsillo agotado
  let voladorTimer = 0;

  const quedan = () => (rep ? total : bolsillo.length);

  /* ── Papeles asomando por la boca ── */
  function pintarPapeles() {
    saliente.innerHTML = "";
    if (vacia || !total) return;
    const n = Math.min(MINI.length, total);
    for (let i = 0; i < n; i++) {
      const p = MINI[i];
      const m = document.createElement("div");
      m.className = "sim-mini";
      m.style.left = p.izq + "px";
      m.style.height = Math.round(40 * p.alt) + "px";
      m.style.transform = `rotate(${p.rot}deg)`;
      saliente.appendChild(m);
    }
  }

  /* ── Tarjeta: vacía / papel con la frase / caja sin papeles ── */
  function pintarVacio() {
    tarjeta.innerHTML = "";
    const v = document.createElement("div");
    v.className = "sim-vacio";
    v.appendChild(svg(SVG_DADO));
    const t = document.createElement("span");
    t.textContent = total
      ? "Dale a «Extraer papel» y saldrá uno al azar"
      : "Esta caja no tiene papeles: agrega frases o palabras";
    v.appendChild(t);
    tarjeta.appendChild(v);
  }

  function pintarResultado() {
    tarjeta.innerHTML = "";
    const papel = document.createElement("div");
    papel.className = "sim-papel";
    const frase = document.createElement("div");
    frase.className = "sim-frase";
    frase.textContent = ultimo.texto;
    frase.style.fontSize = tamLetra(ultimo.texto);
    const chip = document.createElement("span");
    chip.className = "sim-chip";
    chip.textContent = `Papel ${ultimo.papel} de ${ultimo.total}`;
    papel.append(frase, chip);
    tarjeta.appendChild(papel);
  }

  /* Cuando la caja se vacía el ÚLTIMO papel sigue en la tarjeta
     (es el resultado que acaba de salir) y el aviso «la caja quedó
     vacía» vive en la línea de estado, junto al botón «Volver a
     llenar la caja». */
  function pintarEtiqueta() {
    etiNum.textContent = vacia ? "0" : String(quedan());
  }

  function pintarEstado() {
    if (!total) { estado.textContent = "Caja sin papeles"; return; }
    if (rep) {
      estado.textContent = `Con repetición · ${total} papeles en la caja · salieron ${salieron.length}`;
    } else if (vacia) {
      estado.textContent = "Sin repetición · la caja quedó vacía";
    } else {
      estado.textContent = `Sin repetición · quedan ${bolsillo.length} de ${total} · salieron ${salieron.length}`;
    }
  }

  function pintarBotones() {
    if (!total) {
      btnExtraer.disabled = true;
      btnExtraer.replaceChildren(svg(SVG_MANO), document.createTextNode("Extraer papel"));
      btnReiniciar.hidden = true;
      return;
    }
    if (vacia) {
      btnExtraer.disabled = false;
      btnExtraer.replaceChildren(svg(SVG_REINICIAR), document.createTextNode("Volver a llenar la caja"));
      btnReiniciar.hidden = true;
      return;
    }
    btnExtraer.disabled = false;
    btnExtraer.replaceChildren(svg(SVG_MANO), document.createTextNode("Extraer papel"));
    btnReiniciar.hidden = rep || !salieron.length;
  }

  function refrescarTodo() {
    pintarEtiqueta();
    pintarEstado();
    pintarBotones();
    pintarPapeles();
  }

  /* ── SORTEO (completamente aleatorio) ── */
  function extraer() {
    if (!total || vacia) return null;
    let i;
    if (rep) {
      i = indiceAzar(total);              // el papel SIEMPRE vuelve
    } else {
      const k = indiceAzar(bolsillo.length);
      i = bolsillo.splice(k, 1)[0];       // el papel NO vuelve
    }
    ultimo = { i, texto: frases[i], papel: i + 1, total };
    salieron.push(ultimo);
    pintarResultado();
    if (!rep && !bolsillo.length) vacia = true;
    refrescarTodo();
    return ultimo;
  }

  function reiniciar() {
    bolsillo = frases.map((_, i) => i);
    salieron = [];
    ultimo = null;
    vacia = false;
    pintarVacio();
    refrescarTodo();
  }

  /* ── Animaciones del clic (adornos; el resultado es inmediato) ── */
  function animar() {
    cajonera.classList.remove("sim-sacude");
    void cajonera.offsetWidth;            // reinicia la animación
    cajonera.classList.add("sim-sacude");
    const volador = document.createElement("div");
    volador.className = "sim-volador";
    cajonera.appendChild(volador);
    if (voladorTimer) clearTimeout(voladorTimer);
    voladorTimer = setTimeout(() => {
      voladorTimer = 0;
      volador.remove();
      cajonera.classList.remove("sim-sacude");
    }, 760);
  }

  btnExtraer.addEventListener("click", () => {
    if (!total) return;
    if (vacia) { reiniciar(); return; }   // «Volver a llenar la caja»
    if (extraer()) animar();
  });
  btnReiniciar.addEventListener("click", reiniciar);

  /* ── gancho de lectura (pruebas E2E) ── */
  caja.__simulador = {
    frases: () => total,
    repeticion: () => rep,
    quedan,
    salieron: () => salieron.length,
    ultimo: () => (ultimo ? { ...ultimo } : null),
    estado: () => (!total ? "sin-frases" : vacia ? "vacia" : "listo"),
    extraer,
    reiniciar,
    colores: () => ({ caja: rgbCaja, tarjeta: rgbTarjeta, papel: rgbPapel }),
    papelesDentro: () => saliente.querySelectorAll(".sim-mini").length,
    botones: () => ({
      extraer: btnExtraer.textContent.trim(),
      deshabilitado: btnExtraer.disabled,
      reiniciarVisible: !btnReiniciar.hidden,
    }),
    tarjetaTexto: () => tarjeta.textContent.trim(),
    estadoTexto: () => estado.textContent.trim(),
  };

  caja.destruir = () => {
    if (voladorTimer) clearTimeout(voladorTimer);
    caja.remove();
  };

  /* ── Primer pintado ── */
  const btnMano = svg(SVG_MANO);
  const btnTxt = document.createElement("span");
  btnTxt.textContent = "Extraer papel";
  btnExtraer.append(btnMano, btnTxt);

  if (!total) {
    pintarVacio();
  } else if (!rep) {
    bolsillo = frases.map((_, i) => i);
    pintarVacio();
  } else {
    pintarVacio();
  }
  refrescarTodo();

  return montar(caja, contenedor);
}

/* ¿Dónde vive? — con contenedor: dentro de él; sin contenedor:
   centrado en el <body> (como el resto de utils del proyecto). */
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
