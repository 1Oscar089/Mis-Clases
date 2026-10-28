// ============================================================
// board.js — Util: PIZARRA (blanca de marcador o verde de tiza)
// con escritura, borrador y PANTALLA COMPLETA
// (js/utils/board.js)   ·   v1
//
// Inserta UNA PIZARRA de verdad, con su forma exacta:
//   · PIZARRA BLANCA DE MARCADOR: superficie blanca brillante,
//     marco acanalado y bandeja inferior con marcadores y el
//     borrador apoyados.
//   · PIZARRA VERDE DE TIZA: superficie verde con textura de
//     tiza, marco de madera y bandeja con tizas y el borrador
//     de fieltro.
// El tipo se elige en dos lados: como PARÁMETRO (tipo: «marcador»
// por defecto o «tiza») y ADEMÁS desde la propia pizarra con los
// botones Marcador / Tiza (se cambia al instante, sin perder lo
// dibujado).
//
// ─── ESCRIBIR Y BORRAR: SOLO EN PANTALLA COMPLETA ───
//   Para escribir SÍ o SÍ hay que entrar en PANTALLA COMPLETA
//   (botón ⛶): fuera de ella la pizarra se ve pero NO se puede
//   escribir ni borrar (si intentas, el aviso se sacude para
//   recordártelo). Dentro de la pantalla completa aparecen las
//   herramientas Escribir (lápiz) y Borrador, el dibujo va con el
//   mouse o el dedo y se sale con el mismo botón o con Esc.
//   Lo dibujado se queda: al entrar y salir de pantalla completa
//   los trazos se redibujan escalados (coordenadas normalizadas),
//   así nunca se pierden ni se deforman.
//
// ─── ANCHO Y LARGO EN EL DOCUMENTO ───
//   · ancho  Ancho de la pizarra en el documento (320–1200 px,
//            defecto 800). En pantallas chicas se achica sola
//            (max-width: 100%) sin romper nada.
//   · alto   Alto (largo) de la pizarra en el documento
//            (240–900 px, defecto 500). La bandeja añade unos
//            30 px por debajo. En pantalla completa la pizarra
//            se adapta a TODA la pantalla (ancho y alto del
//            documento no aplican ahí).
//
// ─── COLORES (regla del proyecto) ───
//   · colorBorde  Color del MARCO de la pizarra (y de su
//                 bandeja) — defecto PREDEFINIDO y FIJO #8b5e3c
//                 (marrón madera). Elegible con el SELECTOR RGB
//                 en «Crear».
//   · colorTrazo  Color del MARCADOR o de la TIZA con el que se
//                 escribe — defecto PREDEFINIDO y FIJO #1d4ed8
//                 (azul, sirve sobre blanco y sobre verde).
//                 Elegible igual (pick de color, sin escribir).
//   Son colores FIJOS: NO cambian en cada montaje.
//
// ─── PARÁMETROS (objeto config) ───
//   tipo        «marcador» (defecto: pizarra blanca) o «tiza»
//               (pizarra verde de tiza).
//   ancho       Ancho en el documento (px, 320–1200; defecto 800).
//   alto        Alto/largo en el documento (px, 240–900; defecto
//               500). También acepta el alias «largo».
//   colorBorde  Color del marco (HEX/rgb; defecto fijo #8b5e3c).
//   colorTrazo  Color del marcador o la tiza (HEX/rgb; defecto
//               fijo #1d4ed8).
//   contenedor  HTMLElement o selector: ahí se agrega. Sin
//               contenedor se muestra centrada en el <body>.
//
// ─── DEVUELVE ───
//   El elemento .pzb-caja (con .destruir() y con caja.__board,
//   un gancho de lectura para pruebas). Dependencia CERO: HTML +
//   CSS inyectados desde la propia función; el dibujo va en un
//   <canvas> con trazos guardados como coordenadas normalizadas.
//
// USO DESDE UNA CLASE (contenido):
//   import { board } from "../js/utils/board.js";
//
//   board({ contenedor: zona, tipo: "tiza", ancho: 900, alto: 520,
//     colorBorde: "#5d4037", colorTrazo: "#f8fafc" });
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

/**
 * REGLA DEL PROYECTO (aclarada): el color por defecto de cada
 * util/visual es PREDEFINIDO — un color FIJO y adaptado, no uno
 * que cambie en cada montaje. La pizarra trae DOS: el marco
 * (#8b5e3c madera) y el trazo del marcador o la tiza (#1d4ed8
 * azul, que se ve bien sobre la pizarra blanca Y sobre la verde).
 * En «Crear» se eligen con el selector RGB (input de color) sin
 * escribir nada.
 */
export const COLOR_BORDE_DEFECTO = [139, 94, 60];  // #8b5e3c marco
export const COLOR_TRAZO_DEFECTO = [29, 78, 216];  // #1d4ed8 trazo

/* Grosor de los trazos como fracción del ancho del lienzo: así
   escalan solos al pasar a pantalla completa y al volver. */
const GROSOR_TRAZO = 0.0045;   // marcador/tiza
const GROSOR_BORRA = 0.034;    // borrador (más ancho)
const PASO_PUNTO = 0.0025;     // distancia mínima entre puntos

/* ---------------- Estilos (una vez) ---------------- */

let estilosListos = false;
function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-board-estilos";
  estilo.textContent = `
    .pzb-caja {
      --pzb-borde: #8b5e3c;
      --pzb-borde-claro: #c9a37e;
      --pzb-borde-oscuro: #5b3d28;
      --pzb-trazo: #1d4ed8;
      --pzb-alto: 500px;
      width: 100%;
      margin: 1.2rem auto;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
    }
    .pzb-caja *, .pzb-caja *::before, .pzb-caja *::after { box-sizing: border-box; }
    .pzb-caja [hidden] { display: none !important; }

    /* ── El tablero: marco + superficie + bandeja ── */
    .pzb-tablero { width: 100%; }

    .pzb-marco {
      position: relative;
      display: flex;
      height: var(--pzb-alto);
      max-width: 100%;
      padding: 13px;
      border-radius: 12px;
      background: linear-gradient(150deg, var(--pzb-borde-claro) 0%, var(--pzb-borde) 42%, var(--pzb-borde-oscuro) 100%);
      box-shadow:
        0 10px 26px rgba(15, 23, 42, .17),
        inset 0 1px 0 rgba(255, 255, 255, .38),
        inset 0 -2px 6px rgba(0, 0, 0, .24);
    }

    .pzb-superficie {
      position: relative;
      flex: 1;
      min-width: 0;
      min-height: 0;
      border-radius: 6px;
      overflow: hidden;
    }

    /* Pizarra BLANCA de marcador: superficie blanca con brillo */
    .pzb-sup--marcador {
      background: linear-gradient(165deg, #ffffff 0%, #fbfdff 45%, #eef3f8 100%);
      box-shadow:
        inset 0 0 0 1px rgba(100, 116, 139, .30),
        inset 0 2px 10px rgba(71, 85, 105, .15);
    }
    .pzb-sup--marcador::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(115deg, rgba(255, 255, 255, .55) 0%, rgba(255, 255, 255, 0) 34%);
    }

    /* Pizarra VERDE de tiza: superficie verde con polvo de tiza */
    .pzb-sup--tiza {
      background:
        radial-gradient(90% 70% at 18% 12%, rgba(255, 255, 255, .09), transparent 42%),
        radial-gradient(80% 65% at 82% 85%, rgba(255, 255, 255, .07), transparent 46%),
        radial-gradient(60% 50% at 55% 40%, rgba(255, 255, 255, .05), transparent 55%),
        linear-gradient(160deg, #3d7a63 0%, #2f6450 55%, #275443 100%);
      box-shadow:
        inset 0 0 70px rgba(4, 26, 18, .42),
        inset 0 0 0 1px rgba(0, 0, 0, .22);
    }

    .pzb-lienzo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
      cursor: default;
    }
    .pzb-completa .pzb-lienzo { cursor: crosshair; }

    /* ── Aviso (fuera de pantalla completa / primer uso) ── */
    .pzb-aviso {
      position: absolute;
      left: 50%;
      bottom: 14px;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      max-width: 92%;
      padding: .45rem .9rem;
      border-radius: 999px;
      font-size: .8rem;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
      background: rgba(15, 23, 42, .74);
      color: #f8fafc;
      box-shadow: 0 3px 12px rgba(2, 6, 23, .28);
      pointer-events: none;
      z-index: 3;
    }
    .pzb-aviso svg { width: 1rem; height: 1rem; flex: none; }
    .pzb-aviso--fuerte {
      background: #b91c1c;
      animation: pzb-sacudir .5s ease;
    }
    @keyframes pzb-sacudir {
      0%, 100% { transform: translateX(-50%); }
      25% { transform: translateX(calc(-50% - 7px)); }
      75% { transform: translateX(calc(-50% + 7px)); }
    }

    /* ── Bandeja con los útiles (su forma exacta) ── */
    .pzb-bandeja {
      position: relative;
      height: 27px;
      margin: 0 30px;
    }
    .pzb-tabla {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 5px;
      height: 12px;
      border-radius: 3px;
      background: linear-gradient(180deg, var(--pzb-borde-claro), var(--pzb-borde-oscuro));
      box-shadow:
        0 3px 8px rgba(15, 23, 42, .30),
        inset 0 1px 0 rgba(255, 255, 255, .32);
    }
    .pzb-prop {
      position: absolute;
      bottom: 15px;
      border-radius: 3px;
      box-shadow: 0 2px 5px rgba(15, 23, 42, .30);
    }
    /* marcador de verdad: cuerpo + tapitel claro */
    .pzb-prop--marcador {
      width: 44px;
      height: 13px;
      border-radius: 6px;
    }
    .pzb-prop--marcador::after {
      content: "";
      position: absolute;
      right: 4px;
      top: 2px;
      bottom: 2px;
      width: 9px;
      border-radius: 3px;
      background: rgba(255, 255, 255, .38);
    }
    /* tiza de verdad: barrita corta y redondeada */
    .pzb-prop--tiza {
      width: 30px;
      height: 9px;
      border-radius: 4.5px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .55), 0 2px 5px rgba(15, 23, 42, .30);
    }
    /* borrador de fieltro (los dos tipos lo traen) */
    .pzb-prop--borrador {
      width: 58px;
      height: 17px;
      border-radius: 4px;
      background: linear-gradient(180deg, #94a3b8 0 45%, #475569 45% 100%);
    }

    /* ── Barra de controles (bajo la pizarra) ── */
    .pzb-barra {
      display: flex;
      align-items: center;
      gap: .55rem;
      flex-wrap: wrap;
      margin-top: .6rem;
      padding: 0;
    }
    .pzb-seg {
      display: inline-flex;
      overflow: hidden;
      border: 1.5px solid #cbd5e1;
      border-radius: .65rem;
      background: #ffffff;
    }
    .pzb-seg button {
      font: 700 .8rem/1 system-ui, sans-serif;
      padding: .55rem .85rem;
      border: none;
      background: transparent;
      color: #475569;
      cursor: pointer;
    }
    .pzb-seg button + button { border-left: 1.5px solid #e2e8f0; }
    .pzb-seg button[aria-pressed="true"] {
      background: #1e293b;
      color: #f8fafc;
    }
    .pzb-btn {
      display: inline-flex;
      align-items: center;
      gap: .42rem;
      font: 700 .8rem/1 system-ui, sans-serif;
      padding: .55rem .85rem;
      border: 1.5px solid #cbd5e1;
      border-radius: .65rem;
      background: #ffffff;
      color: #334155;
      cursor: pointer;
    }
    .pzb-btn svg { width: 1rem; height: 1rem; flex: none; }
    .pzb-btn:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
    .pzb-btn:disabled {
      opacity: .45;
      cursor: not-allowed;
    }
    .pzb-btn[data-activo="true"] {
      background: #1e293b;
      border-color: #1e293b;
      color: #f8fafc;
    }
    .pzb-btn--pc { margin-left: auto; }
    .pzb-caja button:focus-visible {
      outline: 3px solid #1e293b;
      outline-offset: 2px;
    }

    /* ── PANTALLA COMPLETA (real o simulada) ── */
    .pzb-caja:fullscreen, .pzb-caja.pzb-sim {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      width: 100%;
      height: 100%;
      max-width: none;
      margin: 0;
      border-radius: 0;
      padding: 12px 16px;
      background: #0b1220;
      display: flex;
      flex-direction: column;
    }
    .pzb-caja:fullscreen .pzb-tablero, .pzb-caja.pzb-sim .pzb-tablero {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .pzb-caja:fullscreen .pzb-marco, .pzb-caja.pzb-sim .pzb-marco {
      flex: 1;
      min-height: 0;
      height: auto;
    }
    .pzb-caja:fullscreen .pzb-barra, .pzb-caja.pzb-sim .pzb-barra {
      margin-top: .55rem;
      padding: .5rem .7rem;
      border: 1px solid rgba(148, 163, 184, .22);
      border-radius: .9rem;
      background: rgba(2, 6, 23, .66);
    }
    .pzb-caja:fullscreen .pzb-seg, .pzb-caja.pzb-sim .pzb-seg,
    .pzb-caja:fullscreen .pzb-btn, .pzb-caja.pzb-sim .pzb-btn {
      background: rgba(15, 23, 42, .55);
      border-color: rgba(148, 163, 184, .30);
      color: #e2e8f0;
    }
    .pzb-caja:fullscreen .pzb-seg button, .pzb-caja.pzb-sim .pzb-seg button {
      color: #cbd5e1;
    }
    .pzb-caja:fullscreen .pzb-seg button + button, .pzb-caja.pzb-sim .pzb-seg button + button {
      border-left-color: rgba(148, 163, 184, .25);
    }
    .pzb-caja:fullscreen .pzb-seg button[aria-pressed="true"],
    .pzb-caja.pzb-sim .pzb-seg button[aria-pressed="true"],
    .pzb-caja:fullscreen .pzb-btn[data-activo="true"],
    .pzb-caja.pzb-sim .pzb-btn[data-activo="true"] {
      background: #e2e8f0;
      border-color: #e2e8f0;
      color: #0f172a;
    }
    .pzb-caja:fullscreen button:focus-visible, .pzb-caja.pzb-sim button:focus-visible {
      outline-color: #e2e8f0;
    }

    @media (max-width: 560px) {
      .pzb-marco { padding: 9px; }
      .pzb-bandeja { margin: 0 18px; }
      .pzb-btn--pc { margin-left: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .pzb-aviso--fuerte { animation: none; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- SVG de los botones ---------------- */

const SVG_LAPIZ =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

const SVG_BORRADOR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>' +
  '<path d="M22 21H7"/><path d="m5 11 9 9"/></svg>';

const SVG_EXPANDIR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>' +
  '<path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';

const SVG_CONTRAER =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>' +
  '<path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';

/* ---------------- Util ---------------- */

/**
 * Monta la PIZARRA. Devuelve el elemento .pzb-caja (con
 * .destruir() y con caja.__board, un gancho de lectura para
 * pruebas E2E). Escribir y borrar SOLO se pueden en pantalla
 * completa (real, o simulada si el navegador la bloquea).
 */
export function board(config = {}) {
  const { contenedor } = config;

  // REGLA del proyecto: los colores HEX/rgb; VACÍO o inválido
  // → el PREDEFINIDO y FIJO de este util (no cambia cada vez)
  const colorBorde = parseColor(config.colorBorde) || COLOR_BORDE_DEFECTO;
  const colorTrazo = parseColor(config.colorTrazo) || COLOR_TRAZO_DEFECTO;
  const rgbBorde = `rgb(${colorBorde.join(",")})`;
  const rgbTrazo = `rgb(${colorTrazo.join(",")})`;

  // Tipo: «marcador» (defecto) o «tiza»
  let tipoActual = String(config.tipo || "marcador").trim().toLowerCase() === "tiza"
    ? "tiza" : "marcador";

  // Ancho y alto (largo) de la pizarra EN EL DOCUMENTO
  const ancho = Math.min(1200, Math.max(320, Math.round(Number(config.ancho) || 800)));
  const alto = Math.min(900, Math.max(240, Math.round(Number(config.alto ?? config.largo) || 500)));

  inyectarEstilos();

  /* ── Estructura ── */
  const caja = document.createElement("div");
  caja.className = "pzb-caja";
  caja.setAttribute("role", "region");
  caja.setAttribute("aria-label", "Pizarra interactiva con pantalla completa");
  caja.style.width = ancho + "px";
  caja.style.maxWidth = "100%";
  caja.style.setProperty("--pzb-borde", rgbBorde);
  caja.style.setProperty("--pzb-borde-claro", tono(colorBorde, 0.26));
  caja.style.setProperty("--pzb-borde-oscuro", tono(colorBorde, -0.34));
  caja.style.setProperty("--pzb-trazo", rgbTrazo);
  caja.style.setProperty("--pzb-alto", alto + "px");   // alto (largo) del marco

  const tablero = document.createElement("div");
  tablero.className = "pzb-tablero";

  const marco = document.createElement("div");
  marco.className = "pzb-marco";

  const superficie = document.createElement("div");
  superficie.className = "pzb-superficie";

  const lienzo = document.createElement("canvas");
  lienzo.className = "pzb-lienzo";
  lienzo.setAttribute("role", "img");
  lienzo.setAttribute("aria-label", "Superficie de la pizarra para escribir");

  const aviso = document.createElement("div");
  aviso.className = "pzb-aviso";
  const avisoTexto = document.createElement("span");
  avisoTexto.textContent = "Entra en pantalla completa para escribir";
  aviso.append(svg(SVG_EXPANDIR), avisoTexto);

  superficie.append(lienzo, aviso);
  marco.appendChild(superficie);

  const bandeja = document.createElement("div");
  bandeja.className = "pzb-bandeja";
  const props = document.createElement("div");
  props.style.cssText = "position:absolute;inset:0;";
  bandeja.appendChild(props);

  tablero.append(marco, bandeja);

  /* ── Barra de controles ── */
  const barra = document.createElement("div");
  barra.className = "pzb-barra";

  const seg = document.createElement("div");
  seg.className = "pzb-seg";
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", "Tipo de pizarra");
  const btnMarcador = document.createElement("button");
  btnMarcador.type = "button";
  btnMarcador.textContent = "Marcador";
  btnMarcador.setAttribute("aria-label", "Pizarra blanca de marcador");
  const btnTiza = document.createElement("button");
  btnTiza.type = "button";
  btnTiza.textContent = "Tiza";
  btnTiza.setAttribute("aria-label", "Pizarra verde de tiza");
  seg.append(btnMarcador, btnTiza);

  const btnEscribir = document.createElement("button");
  btnEscribir.type = "button";
  btnEscribir.className = "pzb-btn";
  btnEscribir.innerHTML = SVG_LAPIZ + "<span>Escribir</span>";
  btnEscribir.setAttribute("aria-label", "Escribir con el marcador o la tiza");
  const btnBorrador = document.createElement("button");
  btnBorrador.type = "button";
  btnBorrador.className = "pzb-btn";
  btnBorrador.innerHTML = SVG_BORRADOR + "<span>Borrador</span>";
  btnBorrador.setAttribute("aria-label", "Borrar con el borrador");

  const btnPC = document.createElement("button");
  btnPC.type = "button";
  btnPC.className = "pzb-btn pzb-btn--pc";
  btnPC.setAttribute("aria-label", "Entrar en pantalla completa");

  barra.append(seg, btnEscribir, btnBorrador, btnPC);
  caja.append(tablero, barra);

  /* ── Estado ── */
  let herramienta = "trazo";      // «trazo» (escribir) | «borra» (borrador)
  let completa = false;           // ¿en pantalla completa (real o simulada)?
  let simulada = false;           // ¿pantalla completa simulada (fallback)?
  let dibujando = null;           // trazo en curso
  let dibujoAlgo = false;         // ya se dibujó al menos una vez
  const trazos = [];              // trazos terminados (coordenadas 0..1)
  const ctx = lienzo.getContext("2d");

  /* ── Los útiles de la bandeja (su forma exacta) ── */
  function construirProps() {
    props.innerHTML = "";
    const tabla = document.createElement("div");
    tabla.className = "pzb-tabla";
    props.appendChild(tabla);
    const prop = (clase, colorFondo, css) => {
      const p = document.createElement("div");
      p.className = "pzb-prop " + clase;
      if (colorFondo) p.style.background = colorFondo;
      p.style.cssText += ";" + css;
      props.appendChild(p);
      return p;
    };
    if (tipoActual === "marcador") {
      // tres marcadores: el del trazo elegido, uno negro y uno rojo
      prop("pzb-prop--marcador", rgbTrazo, "left:12px; transform:rotate(-3deg);");
      prop("pzb-prop--marcador", "#0f172a", "left:64px; transform:rotate(2deg);");
      prop("pzb-prop--marcador", "#dc2626", "left:116px; transform:rotate(-1.5deg);");
    } else {
      // tres tizas: la del trazo elegido, una blanca y una amarilla
      prop("pzb-prop--tiza", rgbTrazo, "left:14px; transform:rotate(-4deg);");
      prop("pzb-prop--tiza", "#f8fafc", "left:52px; transform:rotate(3deg);");
      prop("pzb-prop--tiza", "#fde68a", "left:90px; transform:rotate(-2deg);");
    }
    prop("pzb-prop--borrador", "", "right:12px;");
  }
  function ponerTipo(t) {
    tipoActual = t === "tiza" ? "tiza" : "marcador";
    superficie.classList.toggle("pzb-sup--marcador", tipoActual === "marcador");
    superficie.classList.toggle("pzb-sup--tiza", tipoActual === "tiza");
    construirProps();
    refrescarUI();
  }

  /* ── Lienzo: tamaño real (con DPR) y redibujo ── */
  function ajustarLienzo() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(lienzo.clientWidth * dpr));
    const h = Math.max(1, Math.round(lienzo.clientHeight * dpr));
    if (lienzo.width !== w || lienzo.height !== h) {
      lienzo.width = w;
      lienzo.height = h;
    }
    redibujar();
  }

  function redibujar() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = lienzo.width / dpr;
    const h = lienzo.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const t of trazos) pintarTrazo(t, w, h);
    if (dibujando) pintarTrazo(dibujando, w, h);
    ctx.globalCompositeOperation = "source-over";
  }

  function pintarTrazo(t, w, h) {
    const pts = t.puntos;
    if (!pts.length) return;
    ctx.globalCompositeOperation = t.modo === "borra" ? "destination-out" : "source-over";
    ctx.strokeStyle = t.modo === "borra" ? "rgba(0,0,0,1)" : t.color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = Math.max(1.2, t.grosor * w);
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0][0] * w, pts[0][1] * h, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = ((pts[i][0] + pts[i + 1][0]) / 2) * w;
      const my = ((pts[i][1] + pts[i + 1][1]) / 2) * h;
      ctx.quadraticCurveTo(pts[i][0] * w, pts[i][1] * h, mx, my);
    }
    const u = pts[pts.length - 1];
    ctx.lineTo(u[0] * w, u[1] * h);
    ctx.stroke();
  }

  /* ── Dibujo con el puntero (SOLO en pantalla completa) ── */
  function puntoDe(e) {
    const r = lienzo.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return [x, y];
  }

  let temblorTimer = 0;
  function sacudirAviso() {
    aviso.hidden = false;
    aviso.classList.remove("pzb-aviso--fuerte");
    void aviso.offsetWidth;           // reinicia la animación
    aviso.classList.add("pzb-aviso--fuerte");
    if (temblorTimer) clearTimeout(temblorTimer);
    temblorTimer = setTimeout(() => {
      temblorTimer = 0;
      aviso.classList.remove("pzb-aviso--fuerte");
      refrescarUI();                  // vuelve el aviso normal
    }, 1300);
  }

  lienzo.addEventListener("pointerdown", (e) => {
    if (!completa) { sacudirAviso(); return; }   // SI O SI pantalla completa
    if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    try { lienzo.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    dibujando = {
      modo: herramienta,
      color: rgbTrazo,
      grosor: herramienta === "borra" ? GROSOR_BORRA : GROSOR_TRAZO,
      puntos: [puntoDe(e)],
    };
    redibujar();
  });

  lienzo.addEventListener("pointermove", (e) => {
    if (!dibujando) return;
    const p = puntoDe(e);
    const pts = dibujando.puntos;
    const u = pts[pts.length - 1];
    if (Math.hypot(p[0] - u[0], p[1] - u[1]) < PASO_PUNTO) return;
    pts.push(p);
    redibujar();                     // el trazo en curso se repinta entero
  });

  const terminarTrazo = () => {
    if (!dibujando) return;
    if (dibujando.puntos.length) trazos.push(dibujando);
    dibujando = null;
    if (!dibujoAlgo) { dibujoAlgo = true; }
    redibujar();
    refrescarUI();                   // oculta el aviso del primer dibujo
  };
  lienzo.addEventListener("pointerup", terminarTrazo);
  lienzo.addEventListener("pointercancel", terminarTrazo);
  lienzo.addEventListener("pointerleave", (e) => {
    if (dibujando && e.pointerType === "mouse" && !lienzo.hasPointerCapture?.(e.pointerId)) {
      terminarTrazo();
    }
  });

  /* ── Pantalla completa (real, con fallback simulado) ── */
  const enReal = () =>
    typeof document.fullscreenElement !== "undefined" && document.fullscreenElement === caja;

  const alCambioCompleta = () => {
    if (enReal()) {
      completa = true;
      refrescarUI();
      ajustarLienzo();
    } else if (!simulada) {
      completa = false;
      terminarTrazo();
      refrescarUI();
      ajustarLienzo();
    }
  };
  document.addEventListener("fullscreenchange", alCambioCompleta);

  const alTecla = (e) => {
    if (!completa || (e.key !== "Escape" && e.key !== "Esc")) return;
    if (simulada) { salirCompleta(); return; }
    // real: algunos navegadores no la sueltan solos → la soltamos
    if (enReal() && typeof document.exitFullscreen === "function") {
      try { document.exitFullscreen(); } catch (err) { /* sigue */ }
    }
  };
  document.addEventListener("keydown", alTecla);

  const entrarCompleta = async () => {
    if (completa) return;
    if (typeof caja.requestFullscreen === "function") {
      try {
        await caja.requestFullscreen();
        // el evento fullscreenchange pone completa = true
        if (enReal()) return;
      } catch (err) { /* el navegador la bloqueó → simulada */ }
    }
    simulada = true;
    caja.classList.add("pzb-sim");
    completa = true;
    refrescarUI();
    ajustarLienzo();
  };

  const salirCompleta = async () => {
    if (!completa) return;
    if (enReal() && typeof document.exitFullscreen === "function") {
      try { await document.exitFullscreen(); } catch (err) { /* sigue */ }
      if (enReal()) return;
    }
    simulada = false;
    caja.classList.remove("pzb-sim");
    completa = false;
    terminarTrazo();
    refrescarUI();
    ajustarLienzo();
  };

  /* ── UI de la barra ── */
  function refrescarUI() {
    btnMarcador.setAttribute("aria-pressed", tipoActual === "marcador" ? "true" : "false");
    btnTiza.setAttribute("aria-pressed", tipoActual === "tiza" ? "true" : "false");
    btnEscribir.disabled = !completa;
    btnBorrador.disabled = !completa;
    const bloqueo = "Entra en pantalla completa para escribir";
    btnEscribir.title = completa ? "" : bloqueo;
    btnBorrador.title = completa ? "" : bloqueo;
    btnEscribir.dataset.activo = completa && herramienta === "trazo" ? "true" : "false";
    btnBorrador.dataset.activo = completa && herramienta === "borra" ? "true" : "false";
    btnPC.innerHTML = completa
      ? SVG_CONTRAER + "<span>Salir</span>"
      : SVG_EXPANDIR + "<span>Pantalla completa</span>";
    btnPC.setAttribute("aria-label", completa ? "Salir de pantalla completa" : "Entrar en pantalla completa");
    if (!temblorTimer) {
      if (completa && dibujoAlgo) {
        aviso.hidden = true;
      } else {
        aviso.hidden = false;
        avisoTexto.textContent = completa ? "Dibuja con el mouse o el dedo" : bloqueo;
      }
    }
  }

  btnMarcador.addEventListener("click", () => ponerTipo("marcador"));
  btnTiza.addEventListener("click", () => ponerTipo("tiza"));
  btnEscribir.addEventListener("click", () => {
    if (!completa) return;
    herramienta = "trazo";
    refrescarUI();
  });
  btnBorrador.addEventListener("click", () => {
    if (!completa) return;
    herramienta = "borra";
    refrescarUI();
  });
  btnPC.addEventListener("click", () => (completa ? salirCompleta() : entrarCompleta()));

  /* ── El lienzo sigue los cambios de tamaño ── */
  let observador = null;
  if (typeof ResizeObserver === "function") {
    observador = new ResizeObserver(ajustarLienzo);
    observador.observe(superficie);
  } else {
    window.addEventListener("resize", ajustarLienzo);
  }

  /* ── gancho de lectura (pruebas E2E) ── */
  caja.__board = {
    tipo: () => tipoActual,
    ponerTipo,
    herramienta: () => herramienta,
    ponerHerramienta: (h) => {
      if (!completa) return false;
      herramienta = h === "borra" ? "borra" : "trazo";
      refrescarUI();
      return true;
    },
    completa: () => completa,
    real: () => enReal(),
    entrar: entrarCompleta,
    salir: salirCompleta,
    trazos: () => trazos.length,
    ultimoTrazo: () => {
      const t = trazos[trazos.length - 1];
      return t ? { modo: t.modo, color: t.color, puntos: t.puntos.length, grosor: Math.round(t.grosor * 100000) / 100000 } : null;
    },
    medidas: () => ({
      ancho, alto,
      lienzoAncho: lienzo.clientWidth,
      lienzoAlto: lienzo.clientHeight,
    }),
    colores: () => ({ borde: rgbBorde, trazo: rgbTrazo }),
    avisoVisible: () => !aviso.hidden,
  };

  caja.destruir = () => {
    document.removeEventListener("fullscreenchange", alCambioCompleta);
    document.removeEventListener("keydown", alTecla);
    if (temblorTimer) clearTimeout(temblorTimer);
    if (observador) observador.disconnect();
    if (enReal() && typeof document.exitFullscreen === "function") {
      try { document.exitFullscreen(); } catch (err) { /* sigue */ }
    }
    caja.remove();
  };

  ponerTipo(tipoActual);
  requestAnimationFrame(ajustarLienzo);
  return montar(caja, contenedor);
}

/* ---------------- SVG suelto (icono del aviso) ---------------- */

function svg(codigo) {
  const env = document.createElement("span");
  env.style.cssText = "display:inline-flex;width:1rem;height:1rem;flex:none;";
  env.innerHTML = codigo;
  return env;
}

/* ¿Dónde vive? — con contenedor: dentro de él; sin contenedor:
   centrada en el <body> (como el resto de utils del proyecto). */
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
