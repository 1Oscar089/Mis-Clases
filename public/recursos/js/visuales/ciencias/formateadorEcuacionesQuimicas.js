// ============================================================
// ciencias/formateadorEcuacionesQuimicas.js — Recurso visual:
// FORMATEADOR DE ECUACIONES QUÍMICAS   ·   v1
// (recursos/js/visuales/ciencias/formateadorEcuacionesQuimicas.js)
//
// Construye y muestra en pantalla UNA ECUACIÓN QUÍMICA
// profesional, vistosa y tipográficamente EXACTA: subíndices y
// cargas en su sitio, coeficientes resaltados, estados de
// agregación en tamaño menor, flechas de reacción con sus
// factores externos (calor, Δ, catalizadores, presión,
// temperatura…) centrados sobre y bajo la flecha.
//
// HTML + CSS puros, SIN librerías. La ecuación escala con el
// ancho del contenedor (container queries, unidades cqw), así
// que se ve perfecta en el celular, en la vista previa del
// editor «Crear» o a pantalla completa, sin solapamientos.
//
// ─── PARÁMETROS (objeto «datos») ───
//   reactivos      Lista de sustancias que ENTRAN. Cada una puede
//                  ser un OBJETO { formula, coeficiente, estado }
//                  o la forma corta TEXTO «[coeficiente]fórmula(estado)»:
//                    { formula: "H2SO4", coeficiente: 2, estado: "ac" }
//                    "2H2SO4(ac)"   ·   "O2(g)"   ·   "Ca(OH)2(s)"
//   productos      Lista de sustancias que SALEN, igual que
//                  reactivos, y además cada una puede llevar
//                  «efecto»: "gas" → ↑   ·   "precipitado" → ↓
//                    { formula: "CO2", estado: "g", efecto: "gas" }
//                    "CO2(g)↑"      ·   "AgCl(s)↓"
//   tipoReaccion   La flecha central:
//                    "irreversible"  →   (una flecha, defecto)
//                    "reversible"    ⇌   (dos medias puntas)
//                    "equilibrio"    ⇄   (dos flechas completas)
//   factoresFlecha (opcional) { superior, inferior }: lo que se
//                  escribe SOBRE y DEBAJO de la flecha, centrado:
//                    { superior: "Δ", inferior: "1 atm" }
//                    { superior: "200 °C", inferior: "Pt" }
//   tema           "clasico" (papel claro, defecto),
//                  "laboratorio" (tarjeta cuadriculada con rótulo)
//                  "neon" (oscuro con brillo).
//   ancho          Ancho de la escena en px. (Defecto: 940)
//   contenedor     HTMLElement opcional: la ecuación se agrega
//                  ahí. SIN contenedor se construye y se muestra
//                  DIRECTAMENTE centrada en el cuerpo (<body>).
//
// ─── REGLAS TIPOGRÁFICAS (automáticas) ───
//   · Números tras una letra o tras un paréntesis → SUBÍNDICE:
//       H2O → H₂O      Ca(NO3)2 → Ca(NO₃)₂
//   · Cargas iónicas al final → SUPERÍNDICE, con o sin marca:
//       "SO4 2-" · "SO4^2-" · "SO42-" → SO₄²⁻
//       "Fe3+" → Fe³⁺      "NO3-" → NO₃⁻      "NH4+" → NH₄⁺
//   · Coeficiente estequiométrico DELANTE de la fórmula, un
//     poco más grande y en color de acento (el 1 NO se escribe).
//   · Estado de agregación entre paréntesis y más pequeño:
//       (s) · (l) · (g) · (ac)   (acepta "aq" y palabras)
//   · Punto de hidratación: "CuSO4·5H2O" (también "*").
//
// ─── ERRORES ───
//   Si faltan reactivos o productos, o una fórmula no se puede
//   leer, la MISMA tarjeta muestra un aviso claro con la pista
//   de cómo escribirlo bien (nunca queda la pantalla vacía).
//
// ─── DEVUELVE ───
//   El elemento .feq-tarjeta (con data-tema y aria-label que
//   lee la ecuación en voz alta), ya insertado en el contenedor
//   pedido o centrado en el <body>.
//
// USO DESDE UNA CLASE (contenido):
//   import { generarEcuacionQuimica } from
//     "../../../recursos/js/visuales/ciencias/formateadorEcuacionesQuimicas.js";
//
//   generarEcuacionQuimica({
//     reactivos: ["CaCO3(s)"],
//     productos: [{ formula: "CaO", estado: "s" }, { formula: "CO2", estado: "g", efecto: "gas" }],
//     tipoReaccion: "irreversible",
//     factoresFlecha: { superior: "Δ" },
//     tema: "clasico",
//   });
// ============================================================

/* ---------------- CSS implícito (inyectado UNA sola vez) ---------------- */

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "visuales-ecuaciones-estilos";
  estilo.textContent = `
    /* Envoltura para mostrar la ecuación CENTRADA en el <body> */
    .feq-caja {
      display: flex; align-items: center; justify-content: center;
      width: 100%; min-height: 100vh; min-height: 100svh;
      padding: 26px 14px; box-sizing: border-box;
    }
    /* Escena: TODO adentro escala con cqw (1 cqw = 1% del ancho) */
    .feq-escena {
      container-type: inline-size;
      width: var(--feq-ancho, 940px);
      max-width: 100%; margin: 0;
    }
    .feq-tarjeta {
      box-sizing: border-box; margin: 0; position: relative;
      border-radius: 16px;
      padding: clamp(20px, 4.6cqw, 48px) clamp(14px, 3.2cqw, 36px);
      -webkit-font-smoothing: antialiased;
      font-kerning: normal;
    }
    /* ── TEMA CLÁSICO: papel claro, serif de libro de texto ── */
    .feq-tarjeta[data-tema="clasico"] {
      background: linear-gradient(180deg, #fffefb 0%, #faf6ee 100%);
      border: 1px solid #e4ddcd;
      box-shadow: 0 14px 38px rgba(31, 41, 55, .10);
      color: #232f3e;
      font-family: Cambria, "Palatino Linotype", Georgia, "Times New Roman", serif;
    }
    .feq-tarjeta[data-tema="clasico"] .feq-coef   { color: #1a56db; }
    .feq-tarjeta[data-tema="clasico"] .feq-estado { color: #8b94a3; }
    .feq-tarjeta[data-tema="clasico"] .feq-efecto { color: #0e7490; }
    .feq-tarjeta[data-tema="clasico"] .feq-flecha-svg { color: #232f3e; }
    .feq-tarjeta[data-tema="clasico"] .feq-factor { color: #5b6673; }
    .feq-tarjeta[data-tema="clasico"] .feq-mas    { color: #3c4858; }
    /* ── TEMA LABORATORIO: tarjeta cuadriculada con rótulo ── */
    .feq-tarjeta[data-tema="laboratorio"] {
      background-color: #fdfeff;
      background-image:
        linear-gradient(rgba(13, 110, 253, .055) 1px, transparent 1px),
        linear-gradient(90deg, rgba(13, 110, 253, .055) 1px, transparent 1px);
      background-size: 26px 26px;
      border: 1.5px solid #d3dfec; border-top: 5px solid #0d6efd;
      box-shadow: 0 16px 40px rgba(13, 60, 120, .13);
      color: #17324d;
      font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .feq-tarjeta[data-tema="laboratorio"] .feq-coef   { color: #d97706; }
    .feq-tarjeta[data-tema="laboratorio"] .feq-estado { color: #77869b; }
    .feq-tarjeta[data-tema="laboratorio"] .feq-efecto { color: #0d9488; }
    .feq-tarjeta[data-tema="laboratorio"] .feq-flecha-svg { color: #17324d; }
    .feq-tarjeta[data-tema="laboratorio"] .feq-factor { color: #54687d; }
    .feq-tarjeta[data-tema="laboratorio"] .feq-mas    { color: #2c4a68; }
    .feq-rotulo {
      display: flex; align-items: center; gap: .55em;
      font-size: clamp(11px, 1.7cqw, 15px);
      font-weight: 700; letter-spacing: .22em; text-transform: uppercase;
      margin-bottom: clamp(10px, 2.4cqw, 22px);
    }
    .feq-rotulo svg { width: 1.3em; height: 1.3em; flex: none; }
    .feq-tarjeta[data-tema="laboratorio"] .feq-rotulo { color: #0d6efd; }
    /* ── TEMA NEÓN: pizarra oscura con brillo ── */
    .feq-tarjeta[data-tema="neon"] {
      background: radial-gradient(130% 150% at 50% -10%, #132244 0%, #0a1024 52%, #060a18 100%);
      border: 1px solid rgba(56, 189, 248, .38);
      box-shadow: inset 0 0 0 1px rgba(56, 189, 248, .08),
                  0 0 46px rgba(34, 211, 238, .15), 0 18px 44px rgba(0, 0, 0, .5);
      color: #e8f7ff;
      font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      letter-spacing: .015em;
    }
    .feq-tarjeta[data-tema="neon"] .feq-coef {
      color: #f472b6; text-shadow: 0 0 12px rgba(244, 114, 182, .65);
    }
    .feq-tarjeta[data-tema="neon"] .feq-formula { text-shadow: 0 0 16px rgba(34, 211, 238, .5); }
    .feq-tarjeta[data-tema="neon"] .feq-estado  { color: #7dd3fc; opacity: .85; }
    .feq-tarjeta[data-tema="neon"] .feq-efecto {
      color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, .6);
    }
    .feq-tarjeta[data-tema="neon"] .feq-flecha-svg {
      color: #67e8f9; filter: drop-shadow(0 0 6px rgba(103, 232, 249, .75));
    }
    .feq-tarjeta[data-tema="neon"] .feq-factor { color: #93e6ff; }
    .feq-tarjeta[data-tema="neon"] .feq-mas    { color: #b7ecff; }
    .feq-tarjeta[data-tema="neon"] .feq-rotulo { color: #38bdf8; }
    /* ── La ecuación: flex, se acomoda sin solapar ── */
    .feq-ecuacion {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
      column-gap: .5em; row-gap: 1em;
      font-size: clamp(15px, 3.7cqw, 35px); line-height: 1.25;
    }
    .feq-lado {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
      column-gap: .5em; row-gap: 1em; min-width: min-content; max-width: 100%;
    }
    .feq-especie {
      display: inline-flex; align-items: baseline;
      white-space: nowrap; max-width: 100%;
    }
    .feq-coef { font-size: 1.14em; font-weight: 700; margin-right: .17em; }
    .feq-sub, .feq-carga { line-height: 0; }
    .feq-sub   { font-size: .68em; vertical-align: -.27em; }
    .feq-carga { font-size: .68em; vertical-align: .55em; margin-left: .03em; }
    .feq-estado { font-size: .55em; vertical-align: .18em; margin-left: .28em; letter-spacing: .02em; }
    .feq-efecto { font-size: .92em; margin-left: .1em; font-weight: 600; }
    .feq-punto { margin: 0 .1em; font-weight: 600; }
    .feq-mas { padding: 0 .1em; font-weight: 600; opacity: .92; }
    .feq-flecha {
      display: flex; flex-direction: column; align-items: center;
      gap: .26em; padding: 0 .32em; flex: none;
    }
    .feq-flecha-svg { width: clamp(56px, 10.5cqw, 118px); height: auto; display: block; }
    .feq-factor { font-size: .56em; line-height: 1.12; white-space: nowrap; font-weight: 600; }
    /* ── Aviso claro cuando faltan datos o una fórmula no se lee ── */
    .feq-error-cuerpo {
      display: flex; flex-direction: column; align-items: center; gap: .55em;
      text-align: center; padding: clamp(8px, 2cqw, 22px) 0;
      font-size: clamp(14px, 2.6cqw, 24px);
    }
    .feq-error-icono {
      width: 1.9em; height: 1.9em; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.05em;
      background: #fdecec; color: #c02626; border: 2px solid #ef9a9a;
    }
    .feq-error-titulo { font-weight: 700; letter-spacing: .04em; }
    .feq-error-msj { font-size: .78em; line-height: 1.5; max-width: 34em; }
    .feq-tarjeta[data-tema="neon"] .feq-error-icono {
      background: rgba(244, 63, 94, .16); color: #fda4af; border-color: rgba(244, 63, 94, .55);
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

/* ---------------- catálogos para las reglas químicas ---------------- */

/* Cationes sencillos donde los números PEGADOS antes del signo son la
   carga (Fe3+, Ca2+, Al3+…) — la clave es fórmula+cifra. */
const CATIONES = new Set([
  "H1", "Li1", "Na1", "K1", "Rb1", "Cs1", "Ag1", "Au1", "Cu1", "Hg1",
  "Fe2", "Fe3", "Ca2", "Mg2", "Be2", "Sr2", "Ba2", "Ra2", "Zn2", "Cd2",
  "Pb2", "Pb4", "Sn2", "Sn4", "Ni2", "Ni3", "Mn2", "Mn3", "Mn4", "Co2", "Co3",
  "Cr2", "Cr3", "Cu2", "Hg2", "Al3", "Bi3", "Sb3", "Au3", "Ti3", "Ti4",
  "Zr4", "U4", "Ce3", "Ce4", "La3", "Y3", "Sc3",
]);

/* Aniones/poliatómicos donde los números PEGADOS antes del signo son
   SUBÍNDICE y la carga es ±1 (NO3-, OH-, Cl-, HCO3-, C2H3O2-…). */
const ANIONES1 = new Set([
  "F", "Cl", "Br", "I", "At", "OH", "CN", "SCN", "OCN", "CNO", "SeCN",
  "NO2", "NO3", "N3", "O2", "ClO", "ClO2", "ClO3", "ClO4",
  "BrO", "BrO3", "BrO4", "IO", "IO3", "IO4", "MnO4", "TcO4", "ReO4",
  "HCO3", "HSO3", "HSO4", "HS", "H2PO4", "H2PO3", "C2H3O2", "CH3COO",
  "C6H5O7", "C2O4", "BO2", "BO3", "B4O7", "AsO2", "AlO2", "ZnO2", "PbO2",
  "CNO", "CNS", "ClO2", "HCrO4", "CrO3H",
]);

/* Metales: si la base es UN elemento metálico y el signo es +, los
   números pegados se leen como carga (regla Fe3+ / Cr3+). */
const METALOS = new Set([
  "Li", "Na", "K", "Rb", "Cs", "Fr", "Be", "Mg", "Ca", "Sr", "Ba", "Ra",
  "Al", "Ga", "In", "Tl", "Sn", "Pb", "Bi", "Po", "Sc", "Y", "Ti", "Zr",
  "Hf", "V", "Nb", "Ta", "Cr", "Mo", "W", "Mn", "Tc", "Re", "Fe", "Ru",
  "Os", "Co", "Rh", "Ir", "Ni", "Pd", "Pt", "Cu", "Ag", "Au", "Zn", "Cd",
  "Hg", "La", "Ce", "Th", "U", "Pu", "Np", "Am", "Cm",
]);

const MAPA_ESTADOS = {
  s: "s", sólido: "s", solido: "s", solid: "s",
  l: "l", líquido: "l", liquido: "l", liquid: "l",
  g: "g", gas: "g",
  ac: "ac", aq: "ac", acuoso: "ac", acuosa: "ac", aqueous: "ac",
};

/* ---------------- fórmulas: parseo tipográfico ----------------

   parsearFormula("Ca(NO3)2") / ("SO4 2-") / ("Fe3+") / ("CuSO4·5H2O")
   → { html, plano } con subíndices, cargas y punto de hidratación. */

function parsearFormula(texto) {
  let t = String(texto ?? "").trim();
  if (!t) return null;

  /* 1 · CARGA al final: "SO4 2-" · "SO4^2-" · "Fe3+" · "PO43-" · "NH4+" */
  let carga = null;
  const mC = t.match(/(\^?\s?(\d*)([+-]))$/);
  if (mC) {
    const conMarca = /^\^|\s/.test(mC[1]);
    let digitos = mC[2];
    const signo = mC[3] === "-" ? "−" : "+";
    let base = t.slice(0, mC.index);
    if (conMarca) {
      carga = { n: digitos === "" ? 1 : Number(digitos), signo };
    } else if (digitos === "") {
      /* "Na+" · "OH-" · "CrO4-": la carga es ±1 */
      carga = { n: 1, signo };
    } else {
      /* Pegada sin marca: "SO42-" → base "SO" + "42"? NO: si la base
         termina en LETRA y sobran cifras, la ÚLTIMA es la carga y el
         resto son subíndice ("SO42-" → SO₄²⁻, "PO43-" → PO₄³⁻). */
      if (digitos.length >= 2 && /[A-Za-z]$/.test(base)) {
        base += digitos.slice(0, -1);
        digitos = digitos.slice(-1);
      }
      const clave = base + digitos;
      if (/\d$/.test(base)) {
        /* La base ya terminaba en cifra: lo pegado es la carga
           ("PO43-" ya partido, "NH4+" llega sin cifras aquí). */
        carga = { n: Number(digitos), signo };
      } else if (signo === "+" && CATIONES.has(clave)) {
        carga = { n: Number(digitos), signo };              /* Fe3+ */
      } else if (ANIONES1.has(clave)) {
        base += digitos;                                    /* NO3- → NO₃⁻ */
        carga = { n: 1, signo };
      } else if (/^[A-Z][a-z]?$/.test(base)) {
        if (signo === "+" && METALOS.has(base)) {
          carga = { n: Number(digitos), signo };            /* Cr3+ */
        } else {
          base += digitos;                                  /* O2- → O₂⁻ */
          carga = { n: 1, signo };
        }
      } else {
        base += digitos;
        carga = { n: 1, signo };
      }
    }
    t = base.trim();
  }

  /* 2 · Cuerpo: elementos, subíndices, paréntesis y punto de hidratación */
  const toks = tokenizarCadena(t);
  if (!toks.length && !carga) return null;

  let html = "";
  let plano = "";
  let previo = null;
  for (const tok of toks) {
    if (tok.t === "el") {
      html += esc(tok.v);
      plano += tok.v;
    } else if (tok.t === "num") {
      const esSub = previo && (previo.t === "el" || previo.t === "cerrar");
      html += esSub ? '<sub class="feq-sub">' + esc(tok.v) + "</sub>" : esc(tok.v);
      plano += tok.v;
    } else if (tok.t === "abrir" || tok.t === "cerrar") {
      html += esc(tok.v);
      plano += tok.v;
    } else if (tok.t === "punto") {
      html += '<span class="feq-punto">·</span>';
      plano += "·";
    } else {
      html += esc(tok.v);
      plano += tok.v;
    }
    previo = tok;
  }

  /* 3 · Carga como superíndice (la cifra ANTES del signo: ²⁻, ³⁺) */
  if (carga) {
    const txt = (carga.n > 1 ? String(carga.n) : "") + carga.signo;
    html += '<sup class="feq-carga">' + esc(txt) + "</sup>";
    plano += " " + (carga.n > 1 ? carga.n : "") + (carga.signo === "−" ? "-" : "+");
  }

  if (!/[A-Za-z]/.test(plano)) return null;
  return { html, plano };
}

function tokenizarCadena(s) {
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[A-Z]/.test(c)) {
      let sim = c;
      if (/[a-z]/.test(s[i + 1] || "")) sim += s[++i];
      toks.push({ t: "el", v: sim });
    } else if (/[a-z]/.test(c)) {
      /* letra suelta (fórmula escrita en minúsculas): se capitaliza */
      toks.push({ t: "el", v: c.toUpperCase() });
    } else if (/[0-9]/.test(c)) {
      let n = c;
      while (/[0-9]/.test(s[i + 1] || "")) n += s[++i];
      toks.push({ t: "num", v: n });
    } else if (c === "(" || c === "[") {
      toks.push({ t: "abrir", v: c });
    } else if (c === ")" || c === "]") {
      toks.push({ t: "cerrar", v: c });
    } else if (c === "·" || c === "*" || c === "•") {
      toks.push({ t: "punto" });
    } else if (!/\s/.test(c)) {
      toks.push({ t: "txt", v: c });
    }
    i++;
  }
  return toks;
}

/* ---------------- especies: normalización de entradas ----------------

   Acepta el OBJETO de la especificación ({ formula, coeficiente,
   estado, efecto }) o la forma corta TEXTO "2H2O(l)↑". Devuelve
   null cuando no hay fórmula legible. */

function numeroCoef(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function normalizaEstado(e) {
  if (e == null) return null;
  const k = String(e).trim().toLowerCase();
  if (!k) return null;
  return MAPA_ESTADOS[k] !== undefined ? MAPA_ESTADOS[k] : k.slice(0, 6);
}

function normalizaEfecto(e) {
  if (e == null) return null;
  const k = String(e).trim().toLowerCase();
  if (/^(gas|arriba|↑|▲)$/.test(k)) return "↑";
  if (/^(precipitado|precip|abajo|↓|▼|ppd)$/.test(k)) return "↓";
  return null;
}

function normalizarEspecie(e) {
  let coef = null;
  let formula = "";
  let estadoDado = null;
  let efectoDado = null;

  if (e && typeof e === "object") {
    formula = String(e.formula ?? "").trim();
    coef = numeroCoef(e.coeficiente ?? e.coef);
    estadoDado = e.estado ?? null;
    efectoDado = e.efecto ?? null;
  } else {
    formula = String(e ?? "").trim();
  }
  if (!formula) return null;

  /* Coeficiente escrito DELANTE de la fórmula: "2H2O" / "2 H2O" */
  const mCoef = formula.match(/^(\d+)\s*/);
  if (mCoef) {
    if (coef == null) coef = Number(mCoef[1]);
    formula = formula.slice(mCoef[0].length);
  }
  if (!formula) return null;

  /* Efecto y estado al final del texto: "CO2(g)↑" */
  let efecto = null;
  let estado = null;
  const mEf = formula.match(/([↑↓])\s*$/);
  if (mEf) {
    efecto = mEf[1];
    formula = formula.slice(0, mEf.index).trim();
  }
  const mEs = formula.match(/\(([^()]*)\)\s*$/);
  if (mEs) {
    estado = mEs[1].trim();
    formula = formula.slice(0, mEs.index).trim();
  }

  const parsed = parsearFormula(formula);
  if (!parsed) return null;

  return {
    coef,
    html: parsed.html,
    plano: parsed.plano,
    estado: normalizaEstado(estadoDado != null ? estadoDado : estado),
    efecto: normalizaEfecto(efectoDado != null ? efectoDado : efecto),
  };
}

function listaEspecies(x) {
  let arr;
  if (Array.isArray(x)) arr = x;
  else if (typeof x === "string") arr = x.split(",");
  else if (x && typeof x === "object") arr = [x];
  else arr = [];

  const lista = [];
  const malas = [];
  for (const e of arr) {
    if (e == null || String(typeof e === "object" ? e.formula : e).trim() === "") continue;
    const esp = normalizarEspecie(e);
    if (esp) lista.push(esp);
    else malas.push(typeof e === "object" ? JSON.stringify(e) : String(e).trim());
  }
  return { lista, malas };
}

/* ---------------- flecha y factores ---------------- */

function tipoDeFlecha(t) {
  const s = String(t ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/^(reversible|doble|bidireccional|harpoon)/.test(s) || /<=>/.test(s)) return "reversible";
  if (/^(equilibrio|equilibrium|balance)/.test(s)) return "equilibrio";
  return "irreversible"; /* incluye "irreversible", "->", "→", "directa", vacío */
}

const SIMBOLO_FLECHA = { irreversible: "→", reversible: "⇌", equilibrio: "⇄" };

function flechaSvg(tipo) {
  const base = 'class="feq-flecha-svg" viewBox="0 0 120 24" aria-hidden="true" focusable="false"';
  if (tipo === "reversible") {
    return '<svg ' + base + '>' +
      '<g stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round">' +
      '<line x1="7" y1="7.6" x2="110" y2="7.6"/><line x1="10" y1="16.4" x2="113" y2="16.4"/></g>' +
      '<g fill="currentColor"><polygon points="96,1.2 112,7.6 96,7.6"/>' +
      '<polygon points="24,22.8 8,16.4 24,16.4"/></g></svg>';
  }
  if (tipo === "equilibrio") {
    return '<svg ' + base + '>' +
      '<g stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round">' +
      '<line x1="6" y1="7.6" x2="106" y2="7.6"/><line x1="14" y1="16.4" x2="114" y2="16.4"/></g>' +
      '<g fill="currentColor"><polygon points="106,1.6 118,7.6 106,13.6"/>' +
      '<polygon points="14,10.4 2,16.4 14,22.4"/></g></svg>';
  }
  return '<svg ' + base + '>' +
    '<g stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round">' +
    '<line x1="4" y1="12" x2="101" y2="12"/></g>' +
    '<polygon fill="currentColor" points="101,4.6 116,12 101,19.4"/></svg>';
}

function factoresDe(datos) {
  const f = datos && typeof datos === "object" ? datos : {};
  const sup = String(f.superior ?? f.sup ?? "").trim();
  const inf = String(f.inferior ?? f.inf ?? "").trim();
  return { superior: sup || null, inferior: inf || null };
}

/* ---------------- construcción de los lados ---------------- */

function especieHTML(esp, conEfecto) {
  const coef = esp.coef && esp.coef !== 1
    ? '<span class="feq-coef">' + esc(numeroBonito(esp.coef)) + "</span>" : "";
  const estado = esp.estado
    ? '<span class="feq-estado">(' + esc(esp.estado) + ")</span>" : "";
  const efecto = conEfecto && esp.efecto
    ? '<span class="feq-efecto">' + esp.efecto + "</span>" : "";
  return '<span class="feq-especie">' + coef +
    '<span class="feq-formula">' + esp.html + "</span>" + estado + efecto + "</span>";
}

function numeroBonito(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

function ladoHTML(lista, conEfecto) {
  return lista
    .map((esp) => especieHTML(esp, conEfecto))
    .join('<span class="feq-mas">+</span>');
}

const ICONO_FLASK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M9 3h6"/><path d="M10 3v5.2L4.8 17.5A2.4 2.4 0 0 0 7 21h10a2.4 2.4 0 0 0 2.2-3.5L14 8.2V3"/>' +
  '<path d="M7.5 15h9"/></svg>';

function tarjetaError(tema, titulo, msj) {
  return '<div class="feq-error-cuerpo">' +
    '<span class="feq-error-icono">!</span>' +
    '<span class="feq-error-titulo">' + esc(titulo) + "</span>" +
    '<span class="feq-error-msj">' + msj + "</span></div>";
}

/* ════════════════════════════════════════════════════════════════════
   GENERAR ECUACIÓN — construye la tarjeta, la muestra centrada en
   el <body> (o en el contenedor pedido) y la devuelve.
   ════════════════════════════════════════════════════════════════════ */

export function generarEcuacionQuimica(datos = {}) {
  inyectarEstilos();
  const opc = datos || {};

  const tema = normalizaTema(opc.tema);
  const ancho = Math.min(1500, Math.max(300, numeroSeguro(opc.ancho, 940)));
  const tipo = tipoDeFlecha(opc.tipoReaccion);
  const factores = factoresDe(opc.factoresFlecha);

  const izq = listaEspecies(opc.reactivos);
  const der = listaEspecies(opc.productos);

  const escena = document.createElement("div");
  escena.className = "feq-escena";
  escena.style.setProperty("--feq-ancho", ancho + "px");

  const tarjeta = document.createElement("div");
  tarjeta.className = "feq-tarjeta";
  tarjeta.dataset.tema = tema;
  tarjeta.setAttribute("role", "img");

  let aria = "";
  let error = null;

  /* El aviso de fórmula ilegible va ANTES que el de «falta»: si el
     docente escribió especies pero ninguna se puede leer, decir
     «faltan productos» lo despistaría. */
  if (!izq.lista.length && !izq.malas.length) {
    error = tarjetaError(tema, "Faltan los reactivos",
      "Escribe <b>al menos un reactivo</b>, ej: «2H2(g), O2(g)» — " +
      "[coeficiente]fórmula(estado) — o con objetos: " +
      "{ formula: \"H2SO4\", coeficiente: 2, estado: \"ac\" }.");
  } else if (!der.lista.length && !der.malas.length) {
    error = tarjetaError(tema, "Faltan los productos",
      "Escribe <b>al menos un producto</b>, ej: «2H2O(l), CO2(g)↑» — " +
      "con ↑ para gas liberado y ↓ para precipitado.");
  } else if (izq.malas.length || der.malas.length) {
    const malas = izq.malas.concat(der.malas).map((m) => "«" + esc(m) + "»").join(", ");
    error = tarjetaError(tema, "Fórmula ilegible",
      "No pude leer " + malas + ". Una fórmula necesita <b>letras</b> " +
      "(elementos), ej: H2O · Ca(OH)2 · SO4 2- · Fe3+.");
  }

  if (error) {
    tarjeta.classList.add("feq-error");
    aria = "Aviso: la ecuación química está incompleta";
    tarjeta.innerHTML = error;
  } else {
    const sup = factores.superior
      ? '<span class="feq-factor">' + esc(factores.superior) + "</span>" : "";
    const inf = factores.inferior
      ? '<span class="feq-factor">' + esc(factores.inferior) + "</span>" : "";

    tarjeta.innerHTML =
      (tema === "laboratorio"
        ? '<div class="feq-rotulo">' + ICONO_FLASK + "<span>Ecuación química</span></div>"
        : "") +
      '<div class="feq-ecuacion">' +
      '<span class="feq-lado">' + ladoHTML(izq.lista, false) + "</span>" +
      '<span class="feq-flecha">' + sup + flechaSvg(tipo) + inf + "</span>" +
      '<span class="feq-lado">' + ladoHTML(der.lista, true) + "</span>" +
      "</div>";

    const textoIzq = izq.lista.map((e) => planoDe(e)).join(" + ");
    const textoDer = der.lista.map((e) => planoDe(e)).join(" + ");
    aria = "Ecuación química: " + textoIzq + " " + SIMBOLO_FLECHA[tipo] + " " + textoDer;
  }

  tarjeta.setAttribute("aria-label", aria);
  escena.appendChild(tarjeta);

  /* Sin contenedor: la ecuación se muestra DIRECTAMENTE centrada en
     el cuerpo de la página. Con contenedor: se agrega allí (la usa
     la vista previa del editor «Crear» y las páginas generadas). */
  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(escena);
  } else {
    const caja = document.createElement("div");
    caja.className = "feq-caja";
    caja.appendChild(escena);
    document.body.appendChild(caja);
  }

  return tarjeta;
}

function planoDe(esp) {
  const partes = [];
  if (esp.coef && esp.coef !== 1) partes.push(numeroBonito(esp.coef));
  partes.push(esp.plano.replace(/\s+/g, ""));
  if (esp.estado) partes.push("(" + esp.estado + ")");
  if (esp.efecto) partes.push(esp.efecto);
  return partes.join(" ").replace(/ \(/, "(");
}

function normalizaTema(t) {
  const s = String(t ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/^(lab|laboratorio|cuadricul|tarjeta)/.test(s)) return "laboratorio";
  if (/^(neon|dark|oscuro|noche)/.test(s)) return "neon";
  return "clasico";
}