// ============================================================
// ciencias/calculadoraCientifica.js — Util: CALCULADORA CIENTÍFICA
// (js/utils/ciencias/calculadoraCientifica.js)   ·   v1
//
// Construye e inserta DIRECTAMENTE una calculadora científica
// interactiva que emula una calculadora física estándar tipo
// FX-991: carcasa oscura mate, pad direccional arriba al centro y
// pantalla LCD de DOS filas:
//
//   · fila superior (matriz de puntos): la expresión escrita con
//     un cursor que parpadea + indicadores de estado — S (SHIFT),
//     A (ALPHA), hyp, M (memoria), STO, RCL y el modo angular
//     DEG / RAD / GRA a la derecha;
//   · // ============================================================
// ciencias/calculadoraCientifica.js — Util: CALCULADORA CIENTÍFICA
// (js/utils/ciencias/calculadoraCientifica.js)   ·   v1
//
// Construye e inserta DIRECTAMENTE una calculadora científica
// interactiva que emula una calculadora física estándar tipo
// FX-991: carcasa oscura mate, pad direccional arriba al centro y
// pantalla LCD de DOS filas:
//
//   · fila superior (matriz de puntos): la expresión escrita con
//     un cursor que parpadea + indicadores de estado — S (SHIFT),
//     A (ALPHA), hyp, M (memoria), STO, RCL y el modo angular
//     DEG / RAD / GRA a la derecha;
//   · fila inferior: dígitos de 7 SEGMENTOS grandes alineados a
//     la derecha (dibujados en SVG con los segmentos apagados
//     tenues, como un LCD real) para el resultado, la notación
//     ×10ⁿ o los errores («Math ERROR»).
//
// Serigrafía fiel: las funciones secundarias de SHIFT van en
// AMARILLO sobre la tecla y las de ALPHA en MAGENTA; DEL y AC
// van en tonos rojo/rosa; las capas SHIFT, ALPHA y hyp están
// completamente funcionales.
//
// ─── FUNCIONALIDAD ───
//   · operaciones básicas, paréntesis (con cierre automático al
//     evaluar), potencias x■ / x² / x³ / x⁻¹, raíces √ y ∛,
//     fracciones a b/c (2⁄3⁄4 = 2 + 3/4) con S⇔D, trigonometría
//     sin/cos/tan, inversas (SHIFT) e hiperbólicas (hyp), log/ln
//     con 10^x y e^x, log□( base , argumento ), π y e, factorial
//     x!, memoria Ans, variables A…F X Y M con STO/RCL, M+/M−,
//     °′″ (marca de grados y conversión a grados-minutos-segundos
//     con SHIFT), notación ingenieril ENG, CALC con petición de
//     valores, ∫dx (integral numérica) y d/dx (derivada numérica)
//     con la variable X, historial con ▲▼, cursor ◀▶ y DEL,
//     menú CONFIG (MODE) para el modo angular y OFF (SHIFT+ON).
//   · el motor de evaluación es propio (tokenizador + parser
//     descendente + evaluador con jerarquía real: paréntesis ›
//     funciones › potencia › postfix › fracción › producto ›
//     suma), multiplicación implícita (2π, 3(4+1)) y errores al
//     estilo Casio: Math ERROR, Syntax ERROR, Stack ERROR.
//
// ─── SISTEMA DE TECLAS DESHABILITADAS (restricción pedagógica) ───
//   funcionesDeshabilitadas acepta un listado (array o texto
//   separado por comas) con TECLAS o FUNCIONES concretas:
//       "sin"          → la tecla sin en su capa normal
//       "SHIFT:sin"    → solo la secundaria sin⁻¹ (sin sigue)
//       "ALPHA:D"      → solo la variable D (sin sigue)
//       "integral"     → la tecla ∫dx
//   Las teclas bloqueadas se ven APAGADAS (grises, sin hover ni
//   clic) y la serigrafía amarilla/magenta de la capa bloqueada
//   se atenúa sola. También se bloquea la entrada desde el
//   TECLADO FÍSICO de la computadora si está mapeada a una
//   función deshabilitada. Alias aceptados: sin⁻¹, sinh, 10^x,
//   e^x, π, x!, ∛, d/dx, M−, STO, OFF, sen, ^, =, +, × …
//
// ─── PARÁMETROS (objeto de opciones; ninguno obligatorio) ───
//   funcionesDeshabilitadas  array o texto «sin, SHIFT:sin, …».
//   modoAngulo               «DEG» (defecto), «RAD» o «GRA».
//   contenedor               HTMLElement o selector: la
//                            calculadora se agrega ahí (así la
//                            usan el editor «Crear» y las
//                            páginas). SIN contenedor se centra
//                            directamente en el <body>.
//   ancho                    Ancho máximo en px (defecto 430).
//
// ─── DEVUELVE ───
//   El elemento .cc-escena (con .destruir() para quitarla y
//   descolgar su teclado físico).
//
// TECLADO FÍSICO: 0-9 . + - * / ^ ! ( ) · Enter = · Backspace
// DEL · Esc AC · s c t sin cos tan · r √ · l log · n ln · i ∫dx
// · f a b/c · u (−) · a Ans · p π · e (número e) · x variable X
// · m M+ · d S⇔D · h hyp · flechas = pad.
//
// USO DESDE UNA CLASE (contenido):
//   import { calculadoraCientifica } from "../../../js/utils/ciencias/calculadoraCientifica.js";
//
//   calculadoraCientifica({ contenedor: zona });                 // completa
//   calculadoraCientifica({ contenedor: zona, modoAngulo: "RAD",
//     funcionesDeshabilitadas: "sin, SHIFT:sin, ALPHA:D" });     // restringida
// ============================================================

/* ---------------- CSS implícito (inyectado UNA sola vez) ---------------- */

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-calculadora-cientifica-estilos";
  estilo.textContent = `
    /* Envoltura para mostrar la calculadora CENTRADA en el <body> */
    .cc-caja {
      display: flex; align-items: center; justify-content: center;
      width: 100%; min-height: 100vh; min-height: 100svh;
      padding: 24px 12px; box-sizing: border-box;
    }
    /* Escena: TODO lo de adentro se mide en cqw (1 cqw = 1% del
       ancho de la escena), así la calculadora completa escala
       junta en cualquier lámina, editor o pantalla. */
    .cc-escena {
      container-type: inline-size;
      width: 100%; max-width: var(--cc-ancho, 430px); margin: 0 auto;
      font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #e8eaed;
    }
    .cc-escena *, .cc-escena *::before, .cc-escena *::after {
      box-sizing: border-box; margin: 0; padding: 0; font-family: inherit;
    }

    /* ── Carcasa ── */
    .cc-calc {
      border-radius: max(5.5cqw, 20px);
      padding: max(3.2cqw, 13px) max(3.2cqw, 13px) max(4.2cqw, 17px);
      background: linear-gradient(165deg, #383e44, #262b30 55%, #1e2226);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.09), inset 0 -3px 8px rgba(0,0,0,.5),
                  0 22px 45px rgba(15,20,26,.45);
      user-select: none; -webkit-user-select: none;
    }
    .cc-marca {
      display: flex; align-items: baseline; gap: max(1.6cqw, 6px);
      padding: 0 max(1cqw, 4px) max(2.4cqw, 10px);
      color: #99a3ac; font-size: max(2.5cqw, 9.5px); letter-spacing: .16em;
    }
    .cc-marca b { color: #cfd6dc; font-weight: 800; }
    .cc-marca em { margin-left: auto; font-style: normal; font-size: max(2cqw, 7.5px); opacity: .75; letter-spacing: .1em; }

    /* ── Pantalla LCD de dos filas ── */
    .cc-lcd-marco {
      background: #101417; border-radius: max(1.9cqw, 8px);
      padding: max(2cqw, 8px);
      box-shadow: inset 0 2px 10px rgba(0,0,0,.85), inset 0 -1px 0 rgba(255,255,255,.05),
                  0 1px 0 rgba(255,255,255,.07);
    }
    .cc-lcd {
      display: flex; flex-direction: column;
      min-height: max(33cqw, 138px);
      border-radius: max(1.1cqw, 5px);
      padding: max(1.7cqw, 7px) max(2.4cqw, 10px) max(2.2cqw, 9px);
      background: linear-gradient(180deg, #cdd9c7, #bccbb5);
      color: #252b1f;
      box-shadow: inset 0 2px 12px rgba(35,45,28,.4);
    }
    .cc-ind {
      display: flex; align-items: center; gap: max(2cqw, 8px);
      font-family: "DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: max(2.4cqw, 9px); font-weight: 700;
    }
    .cc-ind span { opacity: .1; }
    .cc-ind span.on { opacity: .92; }
    .cc-ind-ang { margin-left: auto; }
    .cc-expr {
      display: flex; overflow: hidden;
      margin-top: max(1.2cqw, 5px); min-height: max(6.6cqw, 26px);
      font-family: "DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: max(4.5cqw, 16.5px); font-weight: 600;
      letter-spacing: .03em; white-space: pre;
    }
    .cc-expr-in { margin-left: auto; text-shadow: 0 0 .4px currentColor; }
    .cc-cur {
      display: inline-block; width: .54em; height: 1.02em; margin-left: 1px;
      background: currentColor; vertical-align: -.14em;
      animation: cc-parpadeo 1.15s steps(2, start) infinite;
    }
    @keyframes cc-parpadeo { to { visibility: hidden; } }
    .cc-res {
      display: flex; align-items: flex-end; justify-content: flex-end;
      gap: max(.35cqw, 1.5px); margin-top: auto;
      min-height: max(10.5cqw, 42px); padding-top: max(1cqw, 4px);
      color: #232919;
    }
    .cc-res svg { height: max(9.8cqw, 39px); width: auto; display: block; }
    .cc-dig, .cc-punto { transform: skewX(-4deg); }
    .cc-res-txt {
      font-family: "DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: max(6.6cqw, 25px); font-weight: 700; letter-spacing: .04em;
      line-height: 1; text-shadow: 0 0 .5px currentColor;
    }
    .cc-res-txt.cc-error { color: #5a2020; font-size: max(5.4cqw, 20px); }
    .cc-exp {
      font-family: "DejaVu Sans Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: max(3.2cqw, 12px); font-weight: 700;
      margin-left: max(1cqw, 4px); transform: skewX(-4deg);
    }
    .cc-exp sup { font-size: .72em; }
    .cc-menu-t { font-size: max(3.4cqw, 12.5px); opacity: .85; }
    .cc-menu-o { font-size: max(4.4cqw, 16px); }

    /* ── Fila de control (SHIFT · ALPHA · PAD · MODE · ON) ── */
    .cc-controles {
      display: flex; align-items: stretch; gap: max(1.7cqw, 7px);
      margin: max(3cqw, 12px) 0 max(2cqw, 8px);
    }
    .cc-controles .cc-k { width: max(12.5cqw, 50px); }
    .cc-pad {
      flex: 1; display: grid;
      grid-template-rows: repeat(3, 1fr); grid-template-columns: repeat(3, 1fr);
      gap: max(.6cqw, 2px); min-height: max(10.6cqw, 42px); padding: 0 max(1cqw, 4px);
    }
    .cc-pad button {
      border: 0; border-radius: 26%;
      background: linear-gradient(180deg, #4d545b, #33393f);
      color: #d3dade; font-size: max(2.7cqw, 10px); cursor: pointer;
      box-shadow: 0 max(.7cqw, 2.5px) 0 rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.12);
      touch-action: manipulation;
    }
    .cc-pad button:active { transform: translateY(max(.4cqw, 1.5px)); box-shadow: 0 .2cqw 0 rgba(0,0,0,.4); }
    .cc-pc { border-radius: 50%; background: radial-gradient(circle at 35% 30%, #565d64, #2c3237 70%); margin: 22%; }

    /* ── Teclas ── */
    .cc-grid { display: grid; gap: max(1.7cqw, 7px); margin-bottom: max(1.7cqw, 7px); }
    .cc-g5 { grid-template-columns: repeat(5, 1fr); }
    .cc-g6 { grid-template-columns: repeat(6, 1fr); }
    .cc-k { display: flex; flex-direction: column; }
    .cc-serig {
      display: flex; justify-content: space-between;
      height: max(2.8cqw, 11px); padding: 0 max(.8cqw, 3px);
      font-size: max(2.35cqw, 8.6px); font-weight: 700; font-style: italic; line-height: 1;
    }
    .cc-serig .cc-sh { color: #e6b93b; }
    .cc-serig .cc-al { color: #d76fb2; margin-left: auto; }
    .cc-serig .cc-sh:empty, .cc-serig .cc-al:empty { display: none; }
    .cc-k button {
      height: max(8.7cqw, 34px); border: 0; border-radius: max(2cqw, 8px);
      font-size: max(3.5cqw, 13px); font-weight: 600; color: #23272c;
      background: linear-gradient(180deg, #eceef0, #d2d7db);
      box-shadow: 0 max(.8cqw, 3px) 0 #14171a, inset 0 1px 0 rgba(255,255,255,.7);
      cursor: pointer; touch-action: manipulation;
    }
    .cc-k button:hover { filter: brightness(1.05); }
    .cc-k button:active {
      transform: translateY(max(.5cqw, 2px));
      box-shadow: 0 .2cqw 0 #14171a, inset 0 1px 0 rgba(255,255,255,.5);
    }
    .cc-num button { background: linear-gradient(180deg, #f7f8f9, #e1e4e7); }
    .cc-op button { background: linear-gradient(180deg, #dde2e6, #c2c8ce); }
    .cc-trig button { background: linear-gradient(180deg, #f0ede6, #d9d4c8); }
    .cc-eq button { background: linear-gradient(180deg, #b9d7e8, #8fb9d4); color: #12242f; }
    .cc-del button { background: linear-gradient(180deg, #f2b0ae, #e28d8b); color: #5c1717; }
    .cc-ac button { background: linear-gradient(180deg, #e98a89, #dd6a68); color: #fff; }
    .cc-shift button, .cc-alpha button { font-weight: 800; font-size: max(2.9cqw, 11px); letter-spacing: .04em; }
    .cc-shift button { color: #b8901d; }
    .cc-alpha button { color: #b3539a; }
    .cc-mode button, .cc-on button { font-size: max(3cqw, 11.5px); font-weight: 700; }
    .cc-on button { background: linear-gradient(180deg, #39424a, #272e34); color: #ecbb4e; }
    .cc-k button.activa {
      background: linear-gradient(180deg, #f6d98a, #e5b95c); color: #42300a;
    }

    /* ── Teclas / capas DESHABILITADAS (restricción pedagógica) ── */
    .cc-k.cc-bloq button {
      opacity: .34; filter: grayscale(.95); cursor: not-allowed;
      box-shadow: 0 max(.6cqw, 2px) 0 #14171a;
    }
    .cc-k.cc-bloq button:hover { filter: grayscale(.95); }
    .cc-k.cc-bloq button:active { transform: none; }
    .cc-serig .cc-bloq { opacity: .28; filter: grayscale(1); }
  `;
  document.head.appendChild(estilo);
}

/* ---------------- Definición del teclado ---------------- */

/* id → { l: etiqueta principal, s: serigrafía SHIFT (amarilla),
          a: letra ALPHA (magenta), cls: clase de color } */
const TECLAS = {
  shift: { l: "SHIFT", cls: "cc-shift" },
  alpha: { l: "ALPHA", cls: "cc-alpha" },
  mode: { l: "MODE", s: "SETUP", cls: "cc-mode" },
  on: { l: "ON", s: "OFF", cls: "cc-on" },
  calc: { l: "CALC" },
  integral: { l: "∫dx", s: "d/dx" },
  inv: { l: "x⁻¹", s: "x!" },
  logBase: { l: "log□" },
  sqr: { l: "x²" },
  frac: { l: "a b/c" },
  sqrt: { l: "√", s: "∛" },
  cube: { l: "x³" },
  pow: { l: "x■" },
  log: { l: "log", s: "10ˣ" },
  ln: { l: "ln", s: "eˣ" },
  neg: { l: "(−)", a: "A" },
  dms: { l: "°′″", s: "◂DMS", a: "B" },
  hyp: { l: "hyp", a: "C" },
  sin: { l: "sin", s: "sin⁻¹", a: "D", cls: "cc-trig" },
  cos: { l: "cos", s: "cos⁻¹", a: "E", cls: "cc-trig" },
  tan: { l: "tan", s: "tan⁻¹", a: "F", cls: "cc-trig" },
  rcl: { l: "RCL", s: "STO" },
  eng: { l: "ENG" },
  lpar: { l: "(" },
  rpar: { l: ")", a: "X" },
  sd: { l: "S⇔D", a: "Y" },
  mplus: { l: "M+", s: "M−", a: "M" },
  "7": { l: "7", cls: "cc-num" }, "8": { l: "8", cls: "cc-num" }, "9": { l: "9", cls: "cc-num" },
  del: { l: "DEL", cls: "cc-del" }, ac: { l: "AC", cls: "cc-ac" },
  "4": { l: "4", cls: "cc-num" }, "5": { l: "5", cls: "cc-num" }, "6": { l: "6", cls: "cc-num" },
  mul: { l: "×", cls: "cc-op" }, div: { l: "÷", cls: "cc-op" },
  "1": { l: "1", cls: "cc-num" }, "2": { l: "2", cls: "cc-num" }, "3": { l: "3", cls: "cc-num" },
  add: { l: "+", cls: "cc-op" }, sub: { l: "−", cls: "cc-op" },
  "0": { l: "0", cls: "cc-num" }, dot: { l: ".", cls: "cc-num" },
  exp: { l: "×10ˣ", s: "π", a: "e" },
  ans: { l: "Ans" }, eq: { l: "=", cls: "cc-eq" },
};

/* Distribución física (filas de 5, filas de 6 y bloque numérico) */
const FILA_CTRL = ["shift", "alpha", "mode", "on"]; // el PAD va al centro
const FILA_SUP_A = ["calc", "integral", "inv", "logBase", "sqr"];
const FILA_SUP_B = ["frac", "sqrt", "cube", "pow", "log", "ln"];
const FILA_MEDIA_A = ["neg", "dms", "hyp", "sin", "cos", "tan"];
const FILA_MEDIA_B = ["rcl", "eng", "lpar", "rpar", "sd", "mplus"];
const FILAS_NUM = [
  ["7", "8", "9", "del", "ac"],
  ["4", "5", "6", "mul", "div"],
  ["1", "2", "3", "add", "sub"],
  ["0", "dot", "exp", "ans", "eq"],
];

/* Variables ALPHA: letra → tecla que la lleva (distribución FX-991) */
const LETRA_A_TECLA = { A: "neg", B: "dms", C: "hyp", D: "sin", E: "cos", F: "tan", X: "rpar", Y: "sd", M: "mplus" };

/* ---------------- Sistema de TECLAS DESHABILITADAS ---------------- */

const IDS_TECLA = new Set([
  "shift", "alpha", "mode", "on", "calc", "integral", "inv", "logBase", "sqr",
  "sqrt", "cube", "pow", "log", "ln", "neg", "dms", "hyp", "sin", "cos", "tan",
  "rcl", "eng", "lpar", "rpar", "sd", "mplus", "del", "ac", "add", "sub", "mul",
  "div", "eq", "dot", "exp", "ans", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
]);

/* Alias de funciones secundarias y nombres alternativos → «capa:tecla» */
const ALIAS_BLOQUEO = {
  "sin⁻¹": "s:sin", "sin-1": "s:sin", "asin": "s:sin", "arcsin": "s:sin", "asen": "s:sin", "arcosen": "s:sin", "sen⁻¹": "s:sin",
  "cos⁻¹": "s:cos", "cos-1": "s:cos", "acos": "s:cos", "arccos": "s:cos",
  "tan⁻¹": "s:tan", "tan-1": "s:tan", "atan": "s:tan", "arctan": "s:tan", "atg": "s:tan", "tg⁻¹": "s:tan",
  "sinh": "h:sin", "senh": "h:sin", "cosh": "h:cos", "tanh": "h:tan", "tgh": "h:tan",
  "sinh⁻¹": "sh:sin", "asinh": "sh:sin", "cosh⁻¹": "sh:cos", "acosh": "sh:cos", "tanh⁻¹": "sh:tan", "atanh": "sh:tan",
  "x!": "s:inv", "factorial": "s:inv",
  "∛": "s:sqrt", "raízcúbica": "s:sqrt", "raizcubica": "s:sqrt", "raízcubica": "s:sqrt",
  "10^x": "s:log", "10ˣ": "s:log", "10x": "s:log",
  "e^x": "s:ln", "eˣ": "s:ln", "ex": "s:ln",
  "π": "s:exp", "pi": "s:exp",
  "d/dx": "s:integral", "ddx": "s:integral", "derivada": "s:integral",
  "m−": "s:mplus", "m-": "s:mplus", "mmenos": "s:mplus", "memoria−": "s:mplus",
  "sto": "s:rcl", "almacenar": "s:rcl",
  "off": "s:on", "apagar": "s:on",
  "integral": "n:integral", "∫dx": "n:integral", "∫": "n:integral",
  "euler": "a:exp", "número e": "a:exp", "numeroe": "a:exp",
  "setup": "n:mode", "config": "n:mode", "configuración": "n:mode", "configuracion": "n:mode",
  "s⇔d": "n:sd", "sd": "n:sd",
  "ans": "n:ans",
  "x²": "n:sqr", "x2": "n:sqr", "cuadrado": "n:sqr",
  "x³": "n:cube", "x3": "n:cube", "cubo": "n:cube",
  "x⁻¹": "n:inv", "x^-1": "n:inv", "inversa": "n:inv",
  "√": "n:sqrt", "raíz": "n:sqrt", "raiz": "n:sqrt",
  "x■": "n:pow", "potencia": "n:pow", "^": "n:pow",
  "log□": "n:logBase", "logbase": "n:logBase",
  "×10ˣ": "n:exp", "×10^x": "n:exp", "exp": "n:exp", "ᴇ": "n:exp",
  "m+": "n:mplus", "mplus": "n:mplus",
  "=": "n:eq", "eq": "n:eq", "igual": "n:eq",
  "del": "n:del", "delete": "n:del", "borrar": "n:del",
  "ac": "n:ac", "all clear": "n:ac",
  "on": "n:on",
  "mode": "n:mode",
  "shift": "n:shift", "alpha": "n:alpha", "hyp": "n:hyp", "h": "n:hyp",
  "calc": "n:calc", "rcl": "n:rcl", "eng": "n:eng",
  "(": "n:lpar", ")": "n:rpar", "paréntesis": "n:lpar", "parentesis": "n:lpar",
  "+": "n:add", "-": "n:sub", "−": "n:sub", "menos": "n:sub",
  "*": "n:mul", "×": "n:mul", "por": "n:mul", "x": "n:mul",
  "/": "n:div", "÷": "n:div", "dividido": "n:div",
  ".": "n:dot", "punto": "n:dot", "coma": "n:dot",
  "°′″": "n:dms", "dms": "n:dms", "grados": "n:dms",
  "sen": "n:sin", "tg": "n:tan",
};

/* «sin», «SHIFT:sin», «ALPHA:D», «hyp:sin», «x!»… → «capa:tecla» o null */
function normalizaBloqueo(txt) {
  let t = String(txt == null ? "" : txt).trim();
  if (!t) return null;
  let capa = "n";
  const m = t.match(/^(shift|alpha|hyp)\s*[:\-·]\s*(.+)$/i);
  if (m) {
    capa = m[1].toLowerCase() === "shift" ? "s" : m[1].toLowerCase() === "alpha" ? "a" : "h";
    t = m[2].trim();
  }
  const clave = t.toLowerCase();
  /* letras de variable sueltas o con ALPHA: (la D vive en la tecla sin…) */
  const letra = clave.toUpperCase();
  if (capa === "a" && LETRA_A_TECLA[letra]) return "a:" + LETRA_A_TECLA[letra];
  if (capa === "n") {
    if (/^[abcfxy]$/.test(clave) && LETRA_A_TECLA[letra]) return "a:" + LETRA_A_TECLA[letra];
    if (clave === "m") return "a:mplus";
    if (clave === "e") return "a:exp";
  }
  if (ALIAS_BLOQUEO[clave]) {
    const destino = ALIAS_BLOQUEO[clave];
    /* «SHIFT:x!» ya trae la capa correcta; si el alias la trae, manda ella */
    return destino;
  }
  if (IDS_TECLA.has(clave)) return capa + ":" + clave;
  if (/^[0-9]$/.test(clave)) return "n:" + clave;
  return null;
}

/* ═══════════════════════  MOTOR DE CÁLCULO  ═══════════════════════
   La expresión es una LISTA DE TOKENS (así ◀▶ y DEL editan sin
   re-interpretar texto). El parser descendente la convierte en un
   árbol y el evaluador la resuelve con la jerarquía real de una
   calculadora científica. Errores al estilo Casio. */

const ERR_MATEMATICO = "Math ERROR";
const ERR_SINTAXIS = "Syntax ERROR";
const ERR_PILA = "Stack ERROR";

class ErrorCalc extends Error {
  constructor(msg) { super(msg); this.msgCalc = msg; }
}

const esInicioDeOperando = (tok) =>
  !!tok && (tok.t === "n" || tok.t === "c" || tok.t === "v" || tok.t === "ans" ||
    tok.t === "f" || (tok.t === "p" && tok.v === "("));

const esOperandoCompleto = (tok) =>
  !!tok && (tok.t === "n" || tok.t === "c" || tok.t === "v" || tok.t === "ans" ||
    tok.t === "post" || (tok.t === "p" && tok.v === ")"));

/* parser: tokens → AST. Lanza ErrorCalc. */
function parsear(tokens) {
  let pos = 0;
  const mira = () => tokens[pos];
  const sigue = () => tokens[pos++];

  function expr(d) {
    if (d > 110) throw new ErrorCalc(ERR_PILA);
    let l = termino(d);
    while (mira() && mira().t === "o" && (mira().v === "+" || mira().v === "−")) {
      const op = sigue().v;
      l = { t: "bin", op, l, r: termino(d) };
    }
    return l;
  }

  function termino(d) {
    let l = unario(d);
    for (;;) {
      const m = mira();
      if (m && m.t === "o" && (m.v === "×" || m.v === "÷")) {
        sigue();
        l = { t: "bin", op: m.v, l, r: unario(d) };
      } else if (esInicioDeOperando(m)) {
        l = { t: "bin", op: "×", l, r: unario(d) }; // multiplicación implícita: 2π, 3(4+1)
      } else break;
    }
    return l;
  }

  function unario(d) {
    const m = mira();
    if (m && m.t === "o" && m.v === "−") { sigue(); return { t: "un", x: unario(d) }; }
    if (m && m.t === "f") return llamada(d);
    return potencia(d);
  }

  function potencia(d) {
    const base = postfijo(d);
    if (mira() && mira().t === "o" && mira().v === "^") {
      sigue();
      return { t: "bin", op: "^", l: base, r: unario(d) }; // asociativa a derecha
    }
    return base;
  }

  function postfijo(d) {
    let x = fraccion(d);
    while (mira() && mira().t === "post") x = { t: "post", op: sigue().v, x };
    return x;
  }

  function fraccion(d) {
    const p1 = primario(d);
    if (!mira() || mira().t !== "frac") return p1;
    const partes = [p1];
    while (mira() && mira().t === "frac") { sigue(); partes.push(primario(d)); }
    if (partes.length === 2) return { t: "frac", a: partes[0], b: partes[1] };
    if (partes.length === 3) return { t: "mixta", e: partes[0], a: partes[1], b: partes[2] };
    throw new ErrorCalc(ERR_SINTAXIS);
  }

  function primario(d) {
    const m = mira();
    if (!m) throw new ErrorCalc(ERR_SINTAXIS);
    if (m.t === "n") {
      sigue();
      let v = parseFloat(m.v);
      if (mira() && mira().t === "E") {         // 1.5×10^3 → notación ᴇ
        sigue();
        let neg = false;
        if (mira() && mira().t === "o" && mira().v === "−") { neg = true; sigue(); }
        const e = mira();
        if (!e || e.t !== "n") throw new ErrorCalc(ERR_SINTAXIS);
        sigue();
        const ee = parseFloat(e.v);
        v = v * Math.pow(10, neg ? -ee : ee);
      }
      return { t: "num", v };
    }
    if (m.t === "c") { sigue(); return { t: "const", v: m.v }; }
    if (m.t === "v") { sigue(); return { t: "var", v: m.v }; }
    if (m.t === "ans") { sigue(); return { t: "ans" }; }
    if (m.t === "p" && m.v === "(") {
      sigue();
      const x = expr(d + 1);
      if (mira() && mira().t === "p" && mira().v === ")") sigue(); // cierre automático si falta
      return { t: "grupo", x };
    }
    if (m.t === "f") return llamada(d);
    throw new ErrorCalc(ERR_SINTAXIS);
  }

  function llamada(d) {
    const nombre = sigue().v;
    const args = [];
    if (mira() && mira().t === "p" && mira().v === "(") {
      sigue();
      if (mira() && mira().t === "p" && mira().v === ")") {
        sigue(); // sin argumentos → Syntax ERROR abajo
      } else {
        args.push(expr(d + 1));
        while (mira() && mira().t === ",") { sigue(); args.push(expr(d + 1)); }
        if (mira() && mira().t === "p" && mira().v === ")") sigue();
      }
    } else {
      args.push(unario(d + 1)); // sin paréntesis: un argumento (sin 30)
    }
    const esperados = nombre === "logb" || nombre === "deriv" ? 2 : nombre === "integ" ? 3 : 1;
    if (args.length !== esperados) throw new ErrorCalc(ERR_SINTAXIS);
    return { t: "fn", v: nombre, args };
  }

  const ast = expr(0);
  if (pos < tokens.length) throw new ErrorCalc(ERR_SINTAXIS); // sobrante (p. ej. «)» suelto)
  return ast;
}

/* potencia con rescate de raíces reales: (−8)^(1÷3) = −2 */
function potencia(a, b) {
  const r = Math.pow(a, b);
  if (!Number.isNaN(r)) return r;
  if (a < 0) {
    for (let d = 2; d <= 64; d++) {
      const ni = Math.round(b * d);
      if (Math.abs(b * d - ni) < 1e-9 && Math.abs(ni) % 2 === 1) return -Math.pow(-a, b);
    }
  }
  return r; // NaN → Math ERROR
}

const conX = (ctx, xi) => ({ ang: ctx.ang, ans: ctx.ans, vars: Object.assign({}, ctx.vars, { X: xi }) });

/* evaluador: AST + contexto { ang, vars, ans } → número (lanza ErrorCalc) */
function evaluarAst(nd, ctx) {
  const ang = ctx.ang;
  const convIn = (g) => (ang === "DEG" ? (g * Math.PI) / 180 : ang === "GRA" ? (g * Math.PI) / 200 : g);
  const convOut = (r) => (ang === "DEG" ? (r * 180) / Math.PI : ang === "GRA" ? (r * 200) / Math.PI : r);
  const fin = (v) => {
    if (typeof v !== "number" || Number.isNaN(v) || !Number.isFinite(v)) throw new ErrorCalc(ERR_MATEMATICO);
    if (Math.abs(v) >= 1e100) throw new ErrorCalc(ERR_MATEMATICO);
    if (Math.abs(v) < 1e-99) return 0;
    return v;
  };
  switch (nd.t) {
    case "num": return nd.v;
    case "const": return nd.v === "π" ? Math.PI : Math.E;
    case "var": { const m = ctx.vars[nd.v]; return typeof m === "number" && isFinite(m) ? m : 0; }
    case "ans": return typeof ctx.ans === "number" ? ctx.ans : 0;
    case "grupo": return evaluarAst(nd.x, ctx);
    case "un": return fin(-evaluarAst(nd.x, ctx));
    case "bin": {
      const a = evaluarAst(nd.l, ctx);
      const b = evaluarAst(nd.r, ctx);
      if (nd.op === "+") return fin(a + b);
      if (nd.op === "−") return fin(a - b);
      if (nd.op === "×") return fin(a * b);
      if (nd.op === "÷") { if (b === 0) throw new ErrorCalc(ERR_MATEMATICO); return fin(a / b); }
      if (nd.op === "^") return fin(potencia(a, b));
      throw new ErrorCalc(ERR_SINTAXIS);
    }
    case "frac": {
      const a = evaluarAst(nd.a, ctx), b = evaluarAst(nd.b, ctx);
      if (b === 0) throw new ErrorCalc(ERR_MATEMATICO);
      return fin(a / b);
    }
    case "mixta": {
      const e = evaluarAst(nd.e, ctx), a = evaluarAst(nd.a, ctx), b = evaluarAst(nd.b, ctx);
      if (b === 0) throw new ErrorCalc(ERR_MATEMATICO);
      return fin(e + a / b);
    }
    case "post": {
      const x = evaluarAst(nd.x, ctx);
      if (nd.op === "²") return fin(x * x);
      if (nd.op === "³") return fin(x * x * x);
      if (nd.op === "⁻¹") { if (x === 0) throw new ErrorCalc(ERR_MATEMATICO); return fin(1 / x); }
      if (nd.op === "!") {
        if (!Number.isInteger(x) || x < 0 || x > 170) throw new ErrorCalc(ERR_MATEMATICO);
        let r = 1;
        for (let i = 2; i <= x; i++) r *= i;
        return fin(r);
      }
      if (nd.op === "%") return fin(x / 100);
      if (nd.op === "°") return fin(ang === "DEG" ? x : ang === "GRA" ? (x * 10) / 9 : (x * Math.PI) / 180);
      throw new ErrorCalc(ERR_SINTAXIS);
    }
    case "fn": return fin(aplicarFn(nd, ctx, convIn, convOut));
  }
  throw new ErrorCalc(ERR_SINTAXIS);
}

function aplicarFn(nd, ctx, convIn, convOut) {
  const v = nd.args.map((a) => evaluarAst(a, ctx));
  const x = v[0];
  switch (nd.v) {
    case "sin": return Math.sin(convIn(x));
    case "cos": return Math.cos(convIn(x));
    case "tan": { if (Math.abs(Math.cos(convIn(x))) < 1e-13) throw new ErrorCalc(ERR_MATEMATICO); return Math.tan(convIn(x)); }
    case "asin": { if (x < -1 || x > 1) throw new ErrorCalc(ERR_MATEMATICO); return convOut(Math.asin(x)); }
    case "acos": { if (x < -1 || x > 1) throw new ErrorCalc(ERR_MATEMATICO); return convOut(Math.acos(x)); }
    case "atan": return convOut(Math.atan(x));
    case "sinh": return Math.sinh(x);
    case "cosh": return Math.cosh(x);
    case "tanh": return Math.tanh(x);
    /* las hiperbólicas NO dependen del modo angular (como en la física) */
    case "asinh": return Math.asinh(x);
    case "acosh": { if (x < 1) throw new ErrorCalc(ERR_MATEMATICO); return Math.acosh(x); }
    case "atanh": { if (x <= -1 || x >= 1) throw new ErrorCalc(ERR_MATEMATICO); return Math.atanh(x); }
    case "log": { if (x <= 0) throw new ErrorCalc(ERR_MATEMATICO); return Math.log10(x); }
    case "ln": { if (x <= 0) throw new ErrorCalc(ERR_MATEMATICO); return Math.log(x); }
    case "logb": {
      const b = v[0], a2 = v[1];
      if (b <= 0 || Math.abs(b - 1) < 1e-15 || a2 <= 0) throw new ErrorCalc(ERR_MATEMATICO);
      return Math.log(a2) / Math.log(b);
    }
    case "pow10": return Math.pow(10, x);
    case "powe": return Math.exp(x);
    case "sqrt": { if (x < 0) throw new ErrorCalc(ERR_MATEMATICO); return Math.sqrt(x); }
    case "cbrt": return Math.cbrt(x);
    case "deriv": {
      const a2 = v[1];
      const h = 1e-5 * Math.max(1, Math.abs(a2));
      const s1 = evaluarAst(nd.args[0], conX(ctx, a2 + h));
      const s2 = evaluarAst(nd.args[0], conX(ctx, a2 - h));
      return (s1 - s2) / (2 * h);
    }
    case "integ": {
      const a2 = v[1], b = v[2];
      if (a2 === b) return 0;
      const n = 600, h = (b - a2) / n;
      let s = 0;
      for (let i = 0; i <= n; i++) {
        const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2; // Simpson
        s += w * evaluarAst(nd.args[0], conX(ctx, a2 + h * i));
      }
      return (s * h) / 3;
    }
  }
  throw new ErrorCalc(ERR_SINTAXIS);
}

/* ═══════════════  FORMATO: decimales, fracciones, DMS, ENG  ═══════════════ */

function quitaCeros(s) { return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s; }

/* 10 dígitos significativos; notación ×10ⁿ fuera de 1e-9…1e10 */
function formatoDecimal(v) {
  if (v === 0) return { seg: "0", exp: null };
  const a = Math.abs(v);
  const sig = v < 0 ? "-" : "";
  if (a >= 1e10 || a < 1e-9) {
    let e = Math.floor(Math.log10(a));
    let m = a / Math.pow(10, e);
    if (m >= 9.99999999) { m /= 10; e += 1; }
    return { seg: sig + quitaCeros(m.toFixed(7)), exp: e };
  }
  const dec = Math.max(0, Math.min(15, 9 - Math.floor(Math.log10(a))));
  const s = quitaCeros(a.toFixed(dec));
  if (s.replace(".", "").length > 12) {
    const e = Math.floor(Math.log10(a));
    return { seg: sig + quitaCeros((a / Math.pow(10, e)).toFixed(7)), exp: e };
  }
  return { seg: sig + s, exp: null };
}

/* fracción continuada: 0.5 → 1/2 · 0.1+0.2 → 3/10 · √2 → null */
function aFraccion(v) {
  if (typeof v !== "number" || !isFinite(v)) return null;
  if (Number.isInteger(v) && Math.abs(v) < 1e15) return { n: v, d: 1 };
  const signo = v < 0 ? -1 : 1;
  const x = Math.abs(v);
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
  for (let i = 0; i < 40; i++) {
    const ai = Math.floor(b);
    const h2 = ai * h1 + h0, k2 = ai * k1 + k0;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (k1 > 0 && Math.abs(h1 / k1 - x) <= 1e-11 * Math.max(1, x)) {
      if (k1 > 9999 || Math.abs(h1) > 1e12) return null;
      return { n: signo * h1, d: k1 };
    }
    const f = b - ai;
    if (f < 1e-13) break;
    b = 1 / f;
  }
  return null;
}

/* 12.3456 → 12°20′44.2″ */
function textoDMS(v) {
  if (!isFinite(v)) return "—";
  const s = v < 0 ? "−" : "";
  const a = Math.abs(v);
  let g = Math.floor(a + 1e-9);
  let m = Math.floor((a - g) * 60 + 1e-9);
  let se = Math.round(((a - g) * 60 - m) * 60 * 10) / 10;
  if (se >= 59.95) { se = 0; m += 1; }
  if (m >= 60) { m = 0; g += 1; }
  return s + g + "°" + m + "′" + (se % 1 ? se.toFixed(1) : String(se)) + "″";
}

/* notación ingenieril: exponente múltiplo de 3 (ENG) */
function formatoEng(v, e) {
  if (v === 0) return { seg: "0", exp: null };
  const sig = v < 0 ? "-" : "";
  const m = Math.abs(v) / Math.pow(10, e);
  return { seg: sig + quitaCeros(m.toFixed(7)), exp: e };
}

/* ═══════════════════  DÍGITOS DE 7 SEGMENTOS (SVG)  ═══════════════════ */

const SEG_RECTS = {
  a: [8, 3, 40, 9], b: [45, 9, 9, 36], c: [45, 51, 9, 36],
  d: [8, 84, 40, 9], e: [2, 51, 9, 36], f: [2, 9, 9, 36], g: [8, 43.5, 40, 9],
};
const SEG_DIG = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd",
  "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "",
};

function svgDigito(ch) {
  const lit = SEG_DIG[ch] != null ? SEG_DIG[ch] : "";
  let h = '<svg class="cc-dig" viewBox="0 0 56 100" aria-hidden="true">';
  for (const k of ["a", "b", "c", "d", "e", "f", "g"]) {
    const r = SEG_RECTS[k];
    h += `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="4" fill="currentColor" opacity="${lit.includes(k) ? 1 : 0.09}"/>`;
  }
  return h + "</svg>";
}

function svgPunto(on) {
  return `<svg class="cc-punto" viewBox="0 0 22 100" aria-hidden="true"><rect x="6" y="84" width="11" height="11" rx="2" fill="currentColor" opacity="${on ? 1 : 0.09}"/></svg>`;
}

function segSvg(seg) {
  let h = "";
  const cs = String(seg);
  for (let i = 0; i < cs.length; i++) {
    const ch = cs[i];
    if (ch === ".") { h += svgPunto(true); continue; }
    h += svgDigito(ch);
    if (cs[i + 1] !== ".") h += svgPunto(false); // punto fantasma como en el LCD real
  }
  return h;
}

/* ── texto de cada token para la fila de matriz de puntos ──
   (los nombres van SIN paréntesis: lo aporta el token «(») */
const TXT_FN = {
  sin: "sin", asin: "sin⁻¹", sinh: "sinh", asinh: "sinh⁻¹",
  cos: "cos", acos: "cos⁻¹", cosh: "cosh", acosh: "cosh⁻¹",
  tan: "tan", atan: "tan⁻¹", tanh: "tanh", atanh: "tanh⁻¹",
  log: "log", logb: "log□", ln: "ln", pow10: "10^", powe: "e^",
  sqrt: "√", cbrt: "∛", integ: "∫", deriv: "d/dx",
};

function textoTok(t) {
  switch (t.t) {
    case "n": return t.v;
    case "o": return t.v;
    case "p": return t.v;
    case "f": return TXT_FN[t.v] || t.v;
    case "c": return t.v;
    case "v": return t.v;
    case "ans": return "Ans";
    case "post": return t.v;
    case "frac": return "/";
    case "E": return "×10^";
    case ",": return ",";
  }
  return "?";
}

function textoExpr(tokens) { return tokens.map(textoTok).join(""); }

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ════════════════════════════════════════════════════════════════════
   CALCULADORA — construye la calculadora, la muestra centrada en el
   <body> (o en el contenedor pedido) y la devuelve.
   ════════════════════════════════════════════════════════════════════ */

/* mapa del teclado físico de la computadora → tecla (+capa fija) */
const MAPA_TECLADO = {
  "0": { id: "0" }, "1": { id: "1" }, "2": { id: "2" }, "3": { id: "3" }, "4": { id: "4" },
  "5": { id: "5" }, "6": { id: "6" }, "7": { id: "7" }, "8": { id: "8" }, "9": { id: "9" },
  ".": { id: "dot" }, ",": { id: "dot" },
  "+": { id: "add" }, "-": { id: "sub" }, "*": { id: "mul" }, "/": { id: "div" }, "^": { id: "pow" },
  "!": { id: "inv", capa: "s" }, "(": { id: "lpar" }, ")": { id: "rpar" },
  Enter: { id: "eq" }, "=": { id: "eq" }, Backspace: { id: "del" }, Escape: { id: "ac" }, Delete: { id: "ac" },
  s: { id: "sin" }, c: { id: "cos" }, t: { id: "tan" }, r: { id: "sqrt" }, l: { id: "log" }, n: { id: "ln" },
  i: { id: "integral" }, f: { id: "frac" }, u: { id: "neg" }, a: { id: "ans" },
  p: { id: "exp", capa: "s" }, e: { id: "exp", capa: "a" }, x: { id: "rpar", capa: "a" },
  m: { id: "mplus" }, d: { id: "sd" }, h: { id: "hyp" },
  ArrowUp: { id: "up" }, ArrowDown: { id: "down" }, ArrowLeft: { id: "left" }, ArrowRight: { id: "right" },
};

const SIN_CONSUMIR_CAPA = new Set(["shift", "alpha", "hyp", "up", "down", "left", "right"]);

export function calculadoraCientifica(opciones = {}) {
  inyectarEstilos();
  const opc = opciones || {};

  const ancho = Math.min(640, Math.max(300, Number(opc.ancho) || 430));
  const listaBloq = Array.isArray(opc.funcionesDeshabilitadas)
    ? opc.funcionesDeshabilitadas
    : String(opc.funcionesDeshabilitadas || "").split(",");
  const bloq = new Set(listaBloq.map(normalizaBloqueo).filter(Boolean));
  const bloqueada = (capa, id) => bloq.has(capa + ":" + id);
  const txtModo = String(opc.modoAngulo || "").toLowerCase();
  const modoInicial = txtModo.startsWith("rad") ? "RAD" : txtModo.startsWith("gra") ? "GRA" : "DEG";

  /* ── estado de la instancia ── */
  const mem = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0 };
  const st = {
    expr: [], cur: 0, postRes: false,
    shift: false, alpha: false, hyp: false,
    ang: modoInicial, error: null, result: null, ans: 0,
    menu: false, off: false, sto: false, rcl: false, calcFase: null,
    hist: [], hIdx: -1, engExp: null,
  };

  /* ── utilidades de edición ── */
  function insertar(tok) { st.expr.splice(st.cur, 0, tok); st.cur++; }
  function nuevaSiPost() {
    if (st.postRes) { st.expr = []; st.cur = 0; st.postRes = false; }
  }
  function abiertas() {
    let n = 0;
    for (const t of st.expr) { if (t.t === "p" && t.v === "(") n++; else if (t.t === "p" && t.v === ")") n--; }
    return n;
  }

  function digito(d) {
    nuevaSiPost();
    const prev = st.cur > 0 ? st.expr[st.cur - 1] : null;
    if (prev && prev.t === "n") {
      if (prev.v.replace(".", "").length >= 15) return;
      if (d === "." && prev.v.includes(".")) return;
      prev.v += d;
      return;
    }
    if (d === ".") {
      /* punto en el exponente (tras ×10ˣ) no tiene sentido */
      if (prev && prev.t === "E") return;
      if (prev && prev.t === "n" && st.expr[st.cur - 2] && st.expr[st.cur - 2].t === "E") return;
      insertar({ t: "n", v: "0." });
      return;
    }
    insertar({ t: "n", v: d });
  }

  function operador(o) {
    if (st.postRes) { st.expr = [{ t: "ans" }, { t: "o", v: o }]; st.cur = 2; st.postRes = false; return; }
    const prev = st.cur > 0 ? st.expr[st.cur - 1] : null;
    if (!prev) { if (o === "−") insertar({ t: "o", v: "−" }); return; }
    if (prev.t === "o") {
      if (o === "−") return;              // 5 × − 3 se queda como 5×(−3)
      prev.v = o; return;                 // reemplaza el operador anterior
    }
    if (prev.t === "p" && prev.v === "(") { if (o === "−") insertar({ t: "o", v: "−" }); return; }
    if (prev.t === "frac") { st.expr[st.cur - 1] = { t: "o", v: o }; return; }
    insertar({ t: "o", v: o });
  }

  function negativo() {                    // tecla (−): signo unario
    nuevaSiPost();
    const prev = st.cur > 0 ? st.expr[st.cur - 1] : null;
    if (prev && prev.t === "o" && prev.v === "−") return; // ya hay signo
    insertar({ t: "o", v: "−" });
  }

  function insertarFn(nombre) {
    nuevaSiPost();
    const base = [{ t: "f", v: nombre }, { t: "p", v: "(", de: "f" }];
    if (nombre === "logb" || nombre === "deriv") base.push({ t: "," }, { t: "p", v: ")" });
    if (nombre === "integ") base.push({ t: "," }, { t: "," }, { t: "p", v: ")" });
    const inicio = st.cur;
    st.expr.splice(inicio, 0, ...base);
    st.cur = inicio + 2;                   // el cursor queda dentro, tras «(»
  }

  function postfijo(v) {
    nuevaSiPost();
    const prev = st.cur > 0 ? st.expr[st.cur - 1] : null;
    if (esOperandoCompleto(prev)) insertar({ t: "post", v });
  }

  function borrar() {
    st.postRes = false;                    // tras «=», DEL edita la expresión
    if (st.cur === 0) return;
    const prev = st.expr[st.cur - 1];
    if (prev.t === "n" && prev.v.length > 1) { prev.v = prev.v.slice(0, -1); return; }
    st.expr.splice(st.cur - 1, 1);
    st.cur--;
    const sig = st.expr[st.cur];
    if (prev.t === "f" && sig && sig.t === "p" && sig.de === "f") st.expr.splice(st.cur, 1);
    else if (prev.t === "p" && prev.de === "f" && st.expr[st.cur - 1] && st.expr[st.cur - 1].t === "f") {
      st.cur--; st.expr.splice(st.cur, 1);
    }
  }

  function limpiarEntrada() {
    st.expr = []; st.cur = 0; st.postRes = false; st.error = null; st.result = null;
    st.menu = false; st.calcFase = null; st.shift = st.alpha = st.hyp = false;
    st.sto = st.rcl = false; st.engExp = null;
  }

  /* ── evaluación ──
     verFrac true: como en MathIO, si el resultado es una fracción
     limpia se muestra COMO FRACCIÓN (S⇔D alterna). */
  function hacerResultado(v) { return { v, frac: aFraccion(v), verFrac: true, dms: false }; }

  function evaluarActual() {
    const ast = parsear(st.expr);
    return evaluarAst(ast, { ang: st.ang, vars: mem, ans: st.ans });
  }

  function igual() {
    if (!st.expr.length || st.error) { if (st.error) st.error = null; if (!st.expr.length) return; }
    try {
      const v = evaluarActual();
      st.error = null;
      st.result = hacerResultado(v);
      st.ans = v;
      st.hist.unshift({ toks: st.expr.map((t) => ({ ...t })), txt: textoExpr(st.expr) });
      if (st.hist.length > 40) st.hist.length = 40;
      st.hIdx = -1; st.postRes = true; st.engExp = null;
    } catch (e) {
      st.error = e && e.msgCalc ? e.msgCalc : ERR_SINTAXIS;
      st.postRes = false;
    }
  }

  function masMemoria(s) {
    try {
      let v;
      if (st.expr.length) {
        v = evaluarActual();
        st.error = null;
        st.result = hacerResultado(v);
        st.ans = v;
        st.postRes = true;
      } else v = st.result ? st.result.v : st.ans;
      mem.M += s * v;
    } catch (e) { st.error = e && e.msgCalc ? e.msgCalc : ERR_SINTAXIS; }
  }

  function sdAlternar() {
    if (!st.result) return;
    st.engExp = null; st.result.dms = false;
    const f = st.result.frac;
    if (!f || f.d < 2) return;
    st.result.verFrac = !st.result.verFrac;
  }

  function dmsAlternar() {
    if (!st.result) return;
    st.engExp = null; st.result.verFrac = false;
    st.result.dms = !st.result.dms;
  }

  function engCiclo() {
    if (!st.result || !isFinite(st.result.v) || st.result.v === 0) return;
    st.result.verFrac = false; st.result.dms = false;
    const a = Math.abs(st.result.v);
    if (st.engExp == null) st.engExp = Math.floor(Math.log10(a) / 3) * 3;
    else {
      st.engExp -= 3;
      if (Math.abs(st.result.v) / Math.pow(10, st.engExp) >= 1e10) st.engExp = Math.floor(Math.log10(a) / 3) * 3;
    }
  }

  function historico(dir) {
    if (!st.hist.length) return;
    if (dir < 0) {                          // ▲: hacia el pasado
      st.hIdx = st.hIdx < 0 ? 0 : Math.min(st.hIdx + 1, st.hist.length - 1);
    } else {                                // ▼: hacia el presente
      if (st.hIdx < 0) return;
      st.hIdx--;
      if (st.hIdx < 0) { st.postRes = false; return; }
    }
    const h = st.hist[st.hIdx];
    if (!h) return;
    st.expr = h.toks.map((t) => ({ ...t }));
    st.cur = st.expr.length;
    st.postRes = false; st.error = null;
  }

  /* ── CALC: pide el valor de cada variable de la expresión ── */
  function calcular() {
    if (!st.expr.length) return;
    const vars = [];
    for (const t of st.expr) if (t.t === "v" && !vars.includes(t.v)) vars.push(t.v);
    if (!vars.length) return igual();
    st.calcFase = { vars, i: 0, buf: "" };
    st.error = null; st.postRes = false;
  }

  function teclaCalc(id) {
    const f = st.calcFase;
    if (id === "ac") { st.calcFase = null; limpiarEntrada(); return; }
    if (id === "eq") {
      const nombre = f.vars[f.i];
      if (f.buf === "") {
        if (typeof mem[nombre] !== "number" || !isFinite(mem[nombre])) mem[nombre] = 0;
      } else {
        const v = Number(f.buf.replace("−", "-"));
        if (!isFinite(v)) { st.error = ERR_MATEMATICO; st.calcFase = null; return; }
        mem[nombre] = v;
      }
      f.i++;
      if (f.i < f.vars.length) { f.buf = ""; return; }
      st.calcFase = null;
      igual();
      return;
    }
    if (/^[0-9]$/.test(id)) { if (f.buf.replace(/[.−]/g, "").length < 12) f.buf += id; return; }
    if (id === "dot") { if (!f.buf.includes(".")) f.buf += f.buf === "" ? "0." : "."; return; }
    if (id === "neg") { f.buf = f.buf.startsWith("−") ? f.buf.slice(1) : "−" + f.buf; return; }
    if (id === "del") { f.buf = f.buf.slice(0, -1); return; }
  }

  function manejarMenu(id) {
    if (id === "1" || id === "2" || id === "3") {
      st.ang = id === "1" ? "DEG" : id === "2" ? "RAD" : "GRA";
      st.menu = false;
      return;
    }
    if (id === "mode") { st.menu = false; return; }
    if (id === "ac") { st.menu = false; limpiarEntrada(); return; }
    if (id === "on") { st.menu = false; limpiarEntrada(); return; }
  }

  /* ── despacho de cada tecla según su capa (n/s/h/sh) ── */
  function ejecutar(id, capa) {
    if (capa === "a") {
      const def = TECLAS[id];
      if (id === "exp") { nuevaSiPost(); insertar({ t: "c", v: "e" }); }
      else if (def && def.a) { nuevaSiPost(); insertar({ t: "v", v: def.a }); }
      return;
    }
    switch (id) {
      case "shift": st.shift = !st.shift; if (st.shift) st.alpha = false; return;
      case "alpha": st.alpha = !st.alpha; if (st.alpha) st.shift = false; return;
      case "hyp": st.hyp = !st.hyp; return;
      case "on": if (capa === "s") apagar(); else limpiarEntrada(); return;
      case "mode": st.menu = true; return;
      case "up": historico(-1); return;
      case "down": historico(1); return;
      case "left": if (st.cur > 0) { st.cur--; st.postRes = false; } return;
      case "right": if (st.cur < st.expr.length) { st.cur++; st.postRes = false; } return;
      case "del": borrar(); return;
      case "ac": limpiarEntrada(); return;
      case "eq": igual(); return;
      case "calc": calcular(); return;
      case "eng": engCiclo(); return;
      case "sd": sdAlternar(); return;
      case "dms": if (capa === "s") dmsAlternar(); else postfijo("°"); return;
      case "mplus": masMemoria(capa === "s" ? -1 : 1); return;
      case "rcl": if (capa === "s") st.sto = true; else st.rcl = true; return;
      case "exp": {
        nuevaSiPost();
        if (capa === "s") { insertar({ t: "c", v: "π" }); return; }
        const prev = st.cur > 0 ? st.expr[st.cur - 1] : null;
        if (prev && prev.t === "n" && !(st.expr[st.cur - 2] && st.expr[st.cur - 2].t === "E")) insertar({ t: "E" });
        return;
      }
      case "add": operador("+"); return;
      case "sub": operador("−"); return;
      case "mul": operador("×"); return;
      case "div": operador("÷"); return;
      case "neg": negativo(); return;
      case "pow": {
        nuevaSiPost();
        const prev = st.cur > 0 ? st.expr[st.cur - 1] : null;
        if (esOperandoCompleto(prev)) insertar({ t: "o", v: "^" });
        return;
      }
      case "sqr": postfijo("²"); return;
      case "cube": postfijo("³"); return;
      case "inv": postfijo(capa === "s" ? "!" : "⁻¹"); return;
      case "frac": {
        nuevaSiPost();
        const prev = st.cur > 0 ? st.expr[st.cur - 1] : null;
        if (esOperandoCompleto(prev)) insertar({ t: "frac" });
        return;
      }
      case "sqrt": insertarFn(capa === "s" ? "cbrt" : "sqrt"); return;
      case "log": insertarFn(capa === "s" ? "pow10" : "log"); return;
      case "ln": insertarFn(capa === "s" ? "powe" : "ln"); return;
      case "logBase": insertarFn("logb"); return;
      case "integral": insertarFn(capa === "s" ? "deriv" : "integ"); return;
      case "sin": case "cos": case "tan": {
        const base = id;
        const nombre = capa === "s" ? "a" + base : capa === "h" ? base + "h" : capa === "sh" ? "a" + base + "h" : base;
        insertarFn(nombre);
        return;
      }
      case "lpar": nuevaSiPost(); insertar({ t: "p", v: "(" }); return;
      case "rpar": nuevaSiPost(); if (abiertas() > 0) insertar({ t: "p", v: ")" }); return;
      case "ans": nuevaSiPost(); insertar({ t: "ans" }); return;
    }
    if (/^[0-9]$/.test(id)) digito(id);
    else if (id === "dot") digito(".");
  }

  /* ── pulsación: capas, bloqueos y estados especiales ── */
  function pulsar(id, capaFija) {
    const def = TECLAS[id];
    if (st.off) { if (id === "on") { st.off = false; st.error = null; pintar(); } return; }
    if (st.calcFase) { teclaCalc(id); pintar(); return; }
    if (st.menu) { manejarMenu(id); pintar(); return; }
    if (st.sto || st.rcl) {
      const letra = def && def.a && LETRA_A_TECLA[def.a] ? def.a : null;
      if (letra) {
        if (st.sto) mem[letra] = st.result ? st.result.v : st.ans;
        else { st.result = hacerResultado(mem[letra]); st.postRes = true; }
        st.sto = st.rcl = false;
        pintar();
        return;
      }
      st.sto = st.rcl = false;             // tecla sin variable: se cancela y actúa
    }
    if (st.error) {
      /* con un ERROR en pantalla, como en la física: solo AC/ON (o el
         cursor ◀▶ para re-editar la expresión) responden */
      if (id === "ac" || id === "on" || id === "left" || id === "right") st.error = null;
      else { pintar(); return; }
    }
    const capa = capaFija || (st.alpha ? "a"
      : st.shift && st.hyp ? "sh"
      : st.shift ? "s"
      : st.hyp ? "h"
      : "n");
    if (st.error) st.error = null;         // cualquier tecla limpia el error previo
    if (bloqueada(capa, id)) { st.shift = st.alpha = st.hyp = false; pintar(); return; }
    ejecutar(id, capa);
    if (!SIN_CONSUMIR_CAPA.has(id)) st.shift = st.alpha = st.hyp = false;
    pintar();
  }

  /* ── OFF (SHIFT+ON): pantalla apagada hasta pulsar ON ──
     Como en la física: al encender de nuevo arranca limpia (Ans,
     variables y memoria se conservan). */
  function apagar() { limpiarEntrada(); st.off = true; }

  /* ════════════════ MONTAJE DEL DOM ════════════════ */

  const escena = document.createElement("div");
  escena.className = "cc-escena";
  escena.style.setProperty("--cc-ancho", ancho + "px");
  escena.setAttribute("role", "group");
  escena.setAttribute("aria-label", "Calculadora científica interactiva");

  const celdaDe = (id) => {
    const d = TECLAS[id];
    const serig = (d.s || d.a)
      ? `<div class="cc-serig"><i class="cc-sh${bloqueada("s", id) ? " cc-bloq" : ""}">${esc(d.s || "")}</i><i class="cc-al${bloqueada("a", id) ? " cc-bloq" : ""}">${esc(d.a || "")}</i></div>`
      : `<div class="cc-serig"><i class="cc-sh"></i><i class="cc-al"></i></div>`;
    const cls = "cc-k" + (d.cls ? " " + d.cls : "") + (bloqueada("n", id) ? " cc-bloq" : "");
    const aria = "Tecla " + d.l + (d.s ? " (SHIFT: " + d.s + ")" : "") + (d.a ? " (ALPHA: " + d.a + ")" : "");
    return `<div class="${cls}">${serig}<button type="button" data-id="${id}" aria-label="${esc(aria)}">${esc(d.l)}</button></div>`;
  };

  const gridDe = (ids, g) => `<div class="cc-grid ${g}">${ids.map(celdaDe).join("")}</div>`;

  escena.innerHTML = `
    <div class="cc-calc">
      <div class="cc-marca"><b>MCO·SCI</b><span>fx-CM991</span><em>NATURAL-V.P.A.M.</em></div>
      <div class="cc-lcd-marco">
        <div class="cc-lcd">
          <div class="cc-ind" aria-hidden="true">
            <span data-ind="S">S</span><span data-ind="A">A</span><span data-ind="hyp">hyp</span>
            <span data-ind="M">M</span><span data-ind="STO">STO</span><span data-ind="RCL">RCL</span>
            <span class="cc-ind-ang" data-ind="ang">${modoInicial}</span>
          </div>
          <div class="cc-expr" aria-live="polite"><span class="cc-expr-in"></span></div>
          <div class="cc-res" data-valor="0" aria-live="polite"></div>
        </div>
      </div>
      <div class="cc-controles">
        ${celdaDe("shift")}${celdaDe("alpha")}
        <div class="cc-pad" role="group" aria-label="Pad direccional">
          <button type="button" data-id="up" aria-label="Arriba: historial" style="grid-area:1/2">▲</button>
          <button type="button" data-id="left" aria-label="Izquierda: cursor" style="grid-area:2/1">◀</button>
          <span class="cc-pc" style="grid-area:2/2"></span>
          <button type="button" data-id="right" aria-label="Derecha: cursor" style="grid-area:2/3">▶</button>
          <button type="button" data-id="down" aria-label="Abajo: historial" style="grid-area:3/2">▼</button>
        </div>
        ${celdaDe("mode")}${celdaDe("on")}
      </div>
      ${gridDe(FILA_SUP_A, "cc-g5")}
      ${gridDe(FILA_SUP_B, "cc-g6")}
      ${gridDe(FILA_MEDIA_A, "cc-g6")}
      ${gridDe(FILA_MEDIA_B, "cc-g6")}
      ${FILAS_NUM.map((f) => gridDe(f, "cc-g5")).join("")}
    </div>`;

  const lcd = escena.querySelector(".cc-lcd");
  const exprIn = lcd.querySelector(".cc-expr-in");
  const resEl = lcd.querySelector(".cc-res");
  const indEls = {};
  lcd.querySelectorAll("[data-ind]").forEach((n) => { indEls[n.dataset.ind] = n; });
  const btnDe = {};
  escena.querySelectorAll("button[data-id]").forEach((b) => { if (!btnDe[b.dataset.id]) btnDe[b.dataset.id] = b; });

  /* ── pintado completo de la pantalla ── */
  const CURSOR = '<span class="cc-cur"></span>';

  function pintarResultado(r) {
    if (st.engExp != null && isFinite(r.v) && r.v !== 0) {
      const f = formatoEng(r.v, st.engExp);
      const exp = f.exp === 0 ? null : f.exp;
      return {
        html: segSvg(f.seg) + (exp != null ? `<span class="cc-exp">×10<sup>${exp}</sup></span>` : ""),
        texto: f.seg + (exp != null ? "e" + exp : ""),
      };
    }
    if (r.verFrac && r.frac && r.frac.d > 1) {
      const t = (r.frac.n < 0 ? "−" : "") + Math.abs(r.frac.n) + "/" + r.frac.d;
      return { html: `<span class="cc-res-txt">${esc(t)}</span>`, texto: t };
    }
    if (r.dms) {
      const t = textoDMS(r.v);
      return { html: `<span class="cc-res-txt">${esc(t)}</span>`, texto: t };
    }
    const f = formatoDecimal(r.v);
    return {
      html: segSvg(f.seg) + (f.exp != null ? `<span class="cc-exp">×10<sup>${f.exp}</sup></span>` : ""),
      texto: f.seg + (f.exp != null ? "e" + f.exp : ""),
    };
  }

  function pintar() {
    indEls.S.classList.toggle("on", st.shift);
    indEls.A.classList.toggle("on", st.alpha);
    indEls.hyp.classList.toggle("on", st.hyp);
    indEls.M.classList.toggle("on", mem.M !== 0);
    indEls.STO.classList.toggle("on", st.sto);
    indEls.RCL.classList.toggle("on", st.rcl);
    indEls.ang.textContent = st.ang;
    indEls.ang.classList.toggle("on", !st.off);   // apagada: LCD en blanco
    btnDe.shift.classList.toggle("activa", st.shift);
    btnDe.alpha.classList.toggle("activa", st.alpha);
    btnDe.hyp.classList.toggle("activa", st.hyp);

    let exHtml = "";
    let resHtml = "";
    let resTexto = "0";

    if (st.off) {
      resTexto = "";
    } else if (st.menu) {
      exHtml = `<span class="cc-menu-t">CONFIG ▸ modo angular</span>`;
      resHtml = `<span class="cc-res-txt cc-menu-o">1:DEG  2:RAD  3:GRA</span>`;
      resTexto = "1:DEG 2:RAD 3:GRA";
    } else {
      let h = "";
      for (let i = 0; i <= st.expr.length; i++) {
        if (!st.postRes && i === st.cur) h += CURSOR;
        if (i < st.expr.length) h += esc(textoTok(st.expr[i]));
      }
      exHtml = h;
      if (st.calcFase) {
        const f = st.calcFase;
        resHtml = `<span class="cc-res-txt">${esc(f.vars[f.i])} = ${esc(f.buf || "?")}</span>`;
        resTexto = f.vars[f.i] + "=" + (f.buf || "?");
      } else if (st.error) {
        resHtml = `<span class="cc-res-txt cc-error">${esc(st.error)}</span>`;
        resTexto = st.error;
      } else if (st.result) {
        const p = pintarResultado(st.result);
        resHtml = p.html;
        resTexto = p.texto;
      } else {
        resHtml = segSvg("0");
      }
    }

    exprIn.innerHTML = exHtml;
    resEl.innerHTML = resHtml;
    resEl.dataset.valor = resTexto;
    resEl.setAttribute("aria-label", resTexto ? "Resultado: " + resTexto : "Pantalla apagada");
  }

  /* ── eventos: clic del mouse/touch ── */
  escena.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b || !escena.contains(b)) return;
    pulsar(b.dataset.id);
  });

  /* ── eventos: teclado físico de la computadora ── */
  function enTeclado(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ""))) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const m = MAPA_TECLADO[k];
    if (!m) return;
    e.preventDefault();
    if (st.off) return;
    if (m.capa && bloqueada(m.capa, m.id)) return;
    if (m.id === "on" && m.capa === "s") { apagar(); pintar(); return; }
    pulsar(m.id, m.capa);
  }
  document.addEventListener("keydown", enTeclado);

  escena.destruir = () => {
    document.removeEventListener("keydown", enTeclado);
    const caja = escena.parentElement && escena.parentElement.classList.contains("cc-caja") ? escena.parentElement : null;
    if (caja && caja.parentElement) caja.parentElement.removeChild(caja);
    else if (escena.parentElement) escena.parentElement.removeChild(escena);
  };

  pintar();

  /* Sin contenedor: la calculadora se muestra DIRECTAMENTE centrada
     en el cuerpo de la página. Con contenedor (elemento o selector):
     se agrega allí (la usan el editor «Crear» y las páginas). */
  let destino = null;
  if (typeof opc.contenedor === "string") destino = document.querySelector(opc.contenedor);
  else if (opc.contenedor && typeof opc.contenedor.appendChild === "function") destino = opc.contenedor;
  if (destino) {
    destino.appendChild(escena);
  } else {
    const caja = document.createElement("div");
    caja.className = "cc-caja";
    caja.appendChild(escena);
    document.body.appendChild(caja);
  }

  return escena;
}
