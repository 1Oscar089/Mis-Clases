// ============================================================
// ingles/traductorEnEs.js — Util: TRADUCTOR INGLÉS → ESPAÑOL
// (js/utils/ingles/traductorEnEs.js)   ·   v1
//
// Tarjeta interactiva de TRADUCCIÓN AUTOMÁTICA para las clases de
// inglés (y para las de español): el estudiante escribe o pega un
// texto y, al presionar «Traducir», recibe la traducción al otro
// idioma apoyándose en servicios de traducción GRATUITOS de internet
// (sin llaves ni cuentas): Google Translate, Bing Microsoft
// Translator, MyMemory y Lingva. Tarjeta COLORIDA (colorTarjeta
// configurable con degradado, REGLA del proyecto) con contador de
// caracteres, botón Copiar y nota del servicio que respondió.
//
// ─── FUNCIONAMIENTO ───
//   · Se escribe el texto (hasta 5000 caracteres) y se presiona
//     «Traducir» (o Ctrl+Enter). La tarjeta llama a los servicios en
//     CADENA: el primero que responda gana y se anota en el resultado
//     («Traducido con Google Translate», «… con Bing Microsoft
//     Translator», etc.). Si uno falla o no tiene red, el siguiente
//     intenta; si TODOS fallan, se avisa con un mensaje claro y la
//     tarjeta queda lista para reintentar (nada se rompe).
//   · COPIAR: el resultado se copia al portapapeles con un clic.
//   · Dirección: por defecto inglés → español (traductorEnEs); con
//     direccion: "es-en" la tarjeta traduce español → inglés.
//
// ─── PROVEEDORES (en orden de intento; todos gratuitos) ───
//   1. Google Translate (translate.googleapis.com, endpoint público
//      «gtx»; textos largos se parten en trozos de ~1400 caracteres).
//   2. Google Translate (clients5.google.com, endpoint «dict-chrome-
//      ex»; variante de respaldo del mismo servicio).
//   3. Bing Microsoft Translator (edge.microsoft.com entrega un
//      token público y api-edge.cognitive.microsofttranslator.com
//      traduce con él).
//   4. MyMemory (api.mymemory.translated.net; trozos de ~450
//      caracteres).
//   5. Lingva (lingva.ml, frente abierto de Google Translate).
//   Cada intento tiene su propio tiempo límite (aborta solo) para que
//   un servicio lento no congele el botón. La traducción sale COMPLETA
//   aunque el texto se haya enviado en varios trozos (se unen en orden).
//
// ─── PARÁMETROS (objeto config) ───
//   titulo         Título de la tarjeta (defecto «Traductor inglés →
//                  español»).
//   indicacion     (opcional) instrucción del docente que se muestra
//                  en una franja de color (ej. «Traduce el párrafo de
//                  la lectura antes de la clase.»).
//   direccion      «en-es» (defecto) o «es-en».
//   colorTarjeta   (opcional) color de la tarjeta en HEX o rgb()
//                  (ej. «#0ea5e9»). Defecto: #2563eb. REGLA DEL
//                  PROYECTO: en adelante TODOS los utils y visuales
//                  aceptan este parámetro.
//   contenedor     HTMLElement o selector: la tarjeta se agrega ahí
//                  (así la usan el editor «Crear» y las clases). Sin
//                  contenedor se muestra centrada en el <body>.
//
// ─── DEVUELVE ───
//   El elemento .tre-caja (con .destruir() para quitarla). Nunca
//   devuelve vacío: sin config se monta con los valores por defecto.
//   No califica ni guarda nada: es una HERRAMIENTA de apoyo (en un
//   examen funciona como diccionario; no participa del puntaje).
//
// USO DESDE UNA CLASE (contenido):
//   import { traductorEnEs } from "../../../js/utils/ingles/traductorEnEs.js";
//
//   traductorEnEs({ contenedor: zona, indicacion: "Traduce las palabras de la lista." });
//   traductorEnEs({ contenedor: zona, direccion: "es-en", colorTarjeta: "#0ea5e9" });
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

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/* ---------------- Estilos (una vez) ---------------- */

let estilosListos = false;
function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-traductor-ingles-estilos";
  estilo.textContent = `
    .tre-caja {
      --tre-c: #2563eb;
      --tre-oscuro: #1d4ed8;
      --tre-claro: #eff6ff;
      --tre-borde: #bfdbfe;
      width: 100%;
      max-width: 720px;
      margin: 1rem auto;
      background: #ffffff;
      border: 1px solid var(--tre-borde);
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 6px 24px rgba(17, 12, 46, .08);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      box-sizing: border-box;
    }
    .tre-caja *, .tre-caja *::before, .tre-caja *::after { box-sizing: border-box; }
    .tre-caja [hidden] { display: none !important; }
    .tre-cab {
      display: flex;
      align-items: center;
      gap: .6rem;
      padding: .8rem 1rem;
      background: linear-gradient(135deg, var(--tre-c), var(--tre-oscuro));
      color: #ffffff;
    }
    .tre-icono { display: inline-flex; flex: none; }
    .tre-icono svg { width: 1.35rem; height: 1.35rem; }
    .tre-titulo { font-weight: 800; font-size: 1rem; line-height: 1.25; flex: 1; min-width: 0; }
    .tre-direccion {
      font-weight: 800;
      font-size: .72rem;
      letter-spacing: .05em;
      background: rgba(255, 255, 255, .22);
      border: 1px solid rgba(255, 255, 255, .5);
      padding: .18rem .6rem;
      border-radius: 999px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .tre-cuerpo { padding: .9rem 1rem 1rem; display: flex; flex-direction: column; gap: .55rem; }
    .tre-indicacion {
      background: var(--tre-claro);
      border: 1px solid var(--tre-borde);
      color: #1f2937;
      border-radius: .6rem;
      padding: .55rem .7rem;
      font-size: .88rem;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .tre-etiqueta {
      font-size: .75rem;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--tre-oscuro);
    }
    .tre-area {
      width: 100%;
      min-height: 96px;
      resize: vertical;
      border: 1.5px solid var(--tre-borde);
      border-radius: .6rem;
      padding: .6rem .7rem;
      font: inherit;
      font-size: .95rem;
      line-height: 1.5;
      color: #111827;
      background: #ffffff;
    }
    .tre-area:focus {
      outline: 2px solid var(--tre-c);
      outline-offset: 1px;
      border-color: var(--tre-c);
    }
    .tre-fila {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      flex-wrap: wrap;
    }
    .tre-contador {
      font-size: .75rem;
      color: #6b7280;
      font-variant-numeric: tabular-nums;
    }
    .tre-boton {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      border: 0;
      cursor: pointer;
      color: #ffffff;
      font-weight: 800;
      font-size: .92rem;
      font-family: inherit;
      padding: .55rem 1.1rem;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--tre-c), var(--tre-oscuro));
      box-shadow: 0 3px 10px rgba(17, 12, 46, .18);
      transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
    }
    .tre-boton:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(17, 12, 46, .24); }
    .tre-boton:disabled { opacity: .65; cursor: progress; }
    .tre-boton svg { width: 1rem; height: 1rem; }
    .tre-boton.tre-ocupado svg { animation: tre-late 1s ease-in-out infinite; }
    @keyframes tre-late { 50% { opacity: .3; } }
    .tre-resultado {
      border: 1.5px solid var(--tre-borde);
      border-left: 5px solid var(--tre-c);
      border-radius: .7rem;
      background: var(--tre-claro);
      padding: .6rem .75rem;
    }
    .tre-res-cab {
      display: flex;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin-bottom: .3rem;
    }
    .tre-res-rotulo {
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--tre-oscuro);
      flex: 1;
      min-width: 0;
    }
    .tre-res-servicio { font-size: .72rem; color: #6b7280; }
    .tre-copiar {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      border: 1px solid var(--tre-borde);
      background: #ffffff;
      color: var(--tre-oscuro);
      font-weight: 700;
      font-size: .75rem;
      font-family: inherit;
      padding: .25rem .6rem;
      border-radius: 999px;
      cursor: pointer;
    }
    .tre-copiar:hover { background: var(--tre-claro); }
    .tre-copiar svg { width: .85rem; height: .85rem; }
    .tre-res-texto {
      font-size: 1rem;
      line-height: 1.55;
      color: #111827;
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 1.2em;
    }
    .tre-error {
      border: 1.5px dashed #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .85rem;
      font-weight: 600;
      border-radius: .7rem;
      padding: .6rem .75rem;
      line-height: 1.45;
    }
    .tre-pie { padding: 0 1rem .8rem; font-size: .72rem; color: #9ca3af; line-height: 1.4; }
    @media (max-width: 480px) {
      .tre-titulo { font-size: .9rem; }
      .tre-cab { flex-wrap: wrap; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Texto: límites y troceo ---------------- */

const MAX_TEXTO = 5000;      // techo de la caja de texto
const TIEMPO_RED = 9000;     // ms por intento a un proveedor

/** Parte el texto en trozos de a lo sumo `max` caracteres SIN cortar
 *  feo: primero por oraciones (. ! ? …) y, si una oración sola excede
 *  el máximo, por palabras. Los trozos conservan el orden. */
export function partirTexto(texto, max) {
  const t = String(texto || "").trim();
  if (!t) return [];
  if (t.length <= max) return [t];

  // 1) unidades: oraciones; las que solas excedan max, se parten por palabras
  const unidades = [];
  const oraciones = t.match(/[^\n.!?\u2026]+[\n.!?\u2026]*\s*/g) || [t];
  for (const cruda of oraciones) {
    const o = cruda.trim();
    if (!o) continue;
    if (o.length <= max) { unidades.push(o); continue; }
    let pedazo = "";
    for (const palabra of o.split(/\s+/)) {
      if (pedazo && (pedazo + " " + palabra).length > max) {
        unidades.push(pedazo);
        pedazo = palabra;
      } else {
        pedazo = pedazo ? pedazo + " " + palabra : palabra;
      }
    }
    if (pedazo) unidades.push(pedazo);
  }

  // 2) empacar unidades en trozos ≤ max (unidos con espacio)
  const trozos = [];
  let actual = "";
  for (const u of unidades) {
    if (actual && (actual + " " + u).length > max) {
      trozos.push(actual);
      actual = u;
    } else {
      actual = actual ? actual + " " + u : u;
    }
  }
  if (actual) trozos.push(actual);
  return trozos;
}

const unir = (partes) =>
  partes.map((p) => String(p || "").trim()).filter(Boolean).join(" ");

/** fetch con tiempo límite propio (un proveedor lento no congela todo). */
async function pedir(url, opciones = {}, ms = TIEMPO_RED) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opciones, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ---------------- Proveedores (el primero que responde gana) ---------------- */

/** 1 · Google Translate — endpoint público «gtx». */
async function porGoogle(texto, de, a) {
  const trozos = partirTexto(texto, 1400);
  const partes = [];
  for (const t of trozos) {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t" +
      "&sl=" + encodeURIComponent(de) + "&tl=" + encodeURIComponent(a) +
      "&q=" + encodeURIComponent(t);
    const r = await pedir(url);
    if (!r.ok) throw new Error("Google " + r.status);
    const d = await r.json();
    if (!Array.isArray(d) || !Array.isArray(d[0])) throw new Error("Google: respuesta rara");
    const txt = d[0]
      .map((f) => (Array.isArray(f) && typeof f[0] === "string" ? f[0] : ""))
      .join("");
    if (!txt.trim()) throw new Error("Google: sin texto");
    partes.push(txt);
  }
  return { texto: unir(partes), servicio: "Google Translate" };
}

/** 2 · Google Translate — endpoint «dict-chrome-ex» (respaldo). */
async function porGoogleDict(texto, de, a) {
  const trozos = partirTexto(texto, 1400);
  const partes = [];
  for (const t of trozos) {
    const url =
      "https://clients5.google.com/translate_a/t?client=dict-chrome-ex" +
      "&sl=" + encodeURIComponent(de) + "&tl=" + encodeURIComponent(a) +
      "&q=" + encodeURIComponent(t);
    const r = await pedir(url);
    if (!r.ok) throw new Error("Google(dict) " + r.status);
    const txt = textoDeDict(await r.json());
    if (!txt.trim()) throw new Error("Google(dict): sin texto");
    partes.push(txt);
  }
  return { texto: unir(partes), servicio: "Google Translate" };
}

/** Acepta las variantes de respuesta del endpoint dict:
 *  ["Hola"] · [["Hola","en"]] · [[["Hola","en"]]] · {sentences:[{trans}]} */
function textoDeDict(d) {
  if (d && Array.isArray(d.sentences)) {
    return d.sentences.map((s) => (s && typeof s.trans === "string" ? s.trans : "")).join("");
  }
  if (Array.isArray(d)) {
    if (typeof d[0] === "string") return d.filter((s) => typeof s === "string").join(" ");
    if (Array.isArray(d[0])) {
      if (Array.isArray(d[0][0])) {
        return d[0].map((f) => (Array.isArray(f) && typeof f[0] === "string" ? f[0] : "")).join("");
      }
      return typeof d[0][0] === "string" ? String(d[0][0]) : "";
    }
  }
  return "";
}

/** 3 · Bing Microsoft Translator — token público de Edge + API de
 *  traducción (POST; el texto va completo en una llamada). */
async function porBing(texto, de, a) {
  const rAuth = await pedir("https://edge.microsoft.com/translate/auth", {}, 6000);
  if (!rAuth.ok) throw new Error("Bing: sin token " + rAuth.status);
  const token = (await rAuth.text()).trim();
  if (!token) throw new Error("Bing: token vacío");
  const r = await pedir(
    "https://api-edge.cognitive.microsofttranslator.com/translate" +
    "?from=" + encodeURIComponent(de) + "&to=" + encodeURIComponent(a) +
    "&api-version=3.0",
    {
      method: "POST",
      headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify([{ Text: texto }]),
    }
  );
  if (!r.ok) throw new Error("Bing " + r.status);
  const d = await r.json();
  const txt = d && d[0] && d[0].translations && d[0].translations[0] && d[0].translations[0].text;
  if (!txt) throw new Error("Bing: sin texto");
  return { texto: String(txt), servicio: "Bing Microsoft Translator" };
}

/** 4 · MyMemory — API gratuita (trozos de ~450 caracteres). */
async function porMyMemory(texto, de, a) {
  const trozos = partirTexto(texto, 450);
  const partes = [];
  for (const t of trozos) {
    const url =
      "https://api.mymemory.translated.net/get" +
      "?q=" + encodeURIComponent(t) +
      "&langpair=" + encodeURIComponent(de + "|" + a);
    const r = await pedir(url);
    if (!r.ok) throw new Error("MyMemory " + r.status);
    const d = await r.json();
    const txt = d && d.responseData && d.responseData.translatedText;
    if (!txt || /MYMEMORY WARNING/i.test(txt)) {
      throw new Error("MyMemory: " + (txt ? "límite diario" : "sin texto"));
    }
    partes.push(txt);
  }
  return { texto: unir(partes), servicio: "MyMemory" };
}

/** 5 · Lingva — frente abierto de Google Translate. */
async function porLingva(texto, de, a) {
  const trozos = partirTexto(texto, 1500);
  const partes = [];
  for (const t of trozos) {
    const url =
      "https://lingva.ml/api/v1/" + encodeURIComponent(de) + "/" +
      encodeURIComponent(a) + "/" + encodeURIComponent(t);
    const r = await pedir(url);
    if (!r.ok) throw new Error("Lingva " + r.status);
    const d = await r.json();
    if (!d || !d.translation) throw new Error("Lingva: sin texto");
    partes.push(d.translation);
  }
  return { texto: unir(partes), servicio: "Lingva" };
}

porGoogle.nombre = "Google Translate";
porGoogleDict.nombre = "Google Translate";
porBing.nombre = "Bing Microsoft Translator";
porMyMemory.nombre = "MyMemory";
porLingva.nombre = "Lingva";

const CADENA = [porGoogle, porGoogleDict, porBing, porMyMemory, porLingva];

/**
 * Traduce `texto` de `de` a `a` probando los servicios en cadena.
 * Devuelve { texto, servicio }. Si TODOS fallan, lanza un Error con
 * el detalle de cada intento (err.intentos).
 */
export async function traducirTexto(texto, de, a) {
  const limpio = String(texto || "").trim().slice(0, MAX_TEXTO);
  if (!limpio) throw new Error("No hay texto para traducir.");
  const intentos = [];
  for (const proveedor of CADENA) {
    try {
      const r = await proveedor(limpio, de, a);
      if (r && r.texto && r.texto.trim()) return r;
      intentos.push(proveedor.nombre + ": sin texto");
    } catch (e) {
      intentos.push(proveedor.nombre + ": " + (e && e.message ? e.message : e));
    }
  }
  const err = new Error("Ningún servicio respondió. " + intentos.join(" · "));
  err.intentos = intentos;
  throw err;
}

/* ---------------- SVG inline ---------------- */

const SVG_TRADUCIR =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>';

const SVG_FLECHA =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';

const SVG_COPIAR =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';

/* ---------------- Componente ---------------- */

/**
 * Monta la TARJETA TRADUCTORA (inglés ↔ español). Devuelve el
 * elemento .tre-caja (con .destruir()). No califica ni guarda nada.
 */
export function traductorEnEs(config = {}) {
  const { contenedor } = config;

  // Dirección: «en-es» (defecto) o «es-en»
  const dirEsEn = String(config.direccion || "").toLowerCase().trim() === "es-en";
  const de = dirEsEn ? "es" : "en";
  const a = dirEsEn ? "en" : "es";
  const pill = dirEsEn ? "ES → EN" : "EN → ES";
  const nombreDe = dirEsEn ? "español" : "inglés";
  const nombreA = dirEsEn ? "inglés" : "español";

  // REGLA del proyecto: colorTarjeta en HEX/rgb; inválido → defecto
  const color = parseColor(config.colorTarjeta) || [37, 99, 235]; // #2563eb

  inyectarEstilos();

  const caja = document.createElement("div");
  caja.className = "tre-caja";
  caja.setAttribute("role", "region");
  caja.setAttribute("aria-label", "Traductor");
  caja.style.setProperty("--tre-c", `rgb(${color.join(",")})`);
  caja.style.setProperty("--tre-oscuro", tono(color, -0.25));
  caja.style.setProperty("--tre-claro", tono(color, 0.92));
  caja.style.setProperty("--tre-borde", tono(color, 0.55));

  const titulo = String(config.titulo || "").trim() ||
    (dirEsEn ? "Traductor español → inglés" : "Traductor inglés → español");
  const indicacion = String(config.indicacion || "").trim();
  const idOrigen = "tre-origen-" + Math.random().toString(36).slice(2, 8);

  caja.innerHTML = `
    <div class="tre-cab">
      <span class="tre-icono">${SVG_TRADUCIR}</span>
      <span class="tre-titulo">${esc(titulo)}</span>
      <span class="tre-direccion">${pill}</span>
    </div>
    <div class="tre-cuerpo">
      ${indicacion ? `<div class="tre-indicacion">${esc(indicacion)}</div>` : ""}
      <label class="tre-etiqueta" for="${idOrigen}">Texto en ${nombreDe}</label>
      <textarea class="tre-area" id="${idOrigen}" maxlength="${MAX_TEXTO}" rows="4"
        placeholder="Escribe o pega aquí tu texto en ${nombreDe}…"></textarea>
      <div class="tre-fila">
        <span class="tre-contador">0 / ${MAX_TEXTO}</span>
        <button type="button" class="tre-boton">
          ${SVG_FLECHA}<span>Traducir</span>
        </button>
      </div>
      <div class="tre-error" hidden></div>
      <div class="tre-resultado" hidden>
        <div class="tre-res-cab">
          <span class="tre-res-rotulo">Traducción al ${nombreA}</span>
          <span class="tre-res-servicio"></span>
          <button type="button" class="tre-copiar" title="Copiar la traducción">
            ${SVG_COPIAR}<span>Copiar</span>
          </button>
        </div>
        <div class="tre-res-texto" aria-live="polite"></div>
      </div>
    </div>
    <div class="tre-pie">Traducción automática: úsala como ayuda y revisa la respuesta con tu docente.</div>`;

  const area = caja.querySelector(".tre-area");
  const contador = caja.querySelector(".tre-contador");
  const boton = caja.querySelector(".tre-boton");
  const botonTexto = boton.querySelector("span");
  const errorCaja = caja.querySelector(".tre-error");
  const resultado = caja.querySelector(".tre-resultado");
  const resTexto = caja.querySelector(".tre-res-texto");
  const resServicio = caja.querySelector(".tre-res-servicio");
  const copiar = caja.querySelector(".tre-copiar");
  const copiarTexto = copiar.querySelector("span");

  area.addEventListener("input", () => {
    contador.textContent = area.value.length + " / " + MAX_TEXTO;
  });

  area.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      traducirAhora();
    }
  });

  boton.addEventListener("click", traducirAhora);
  copiar.addEventListener("click", copiarResultado);

  async function traducirAhora() {
    errorCaja.hidden = true;
    const texto = area.value.trim();
    if (!texto) {
      errorCaja.textContent = "Escribe algo en " + nombreDe + " para traducir.";
      errorCaja.hidden = false;
      area.focus();
      return;
    }
    boton.disabled = true;
    boton.classList.add("tre-ocupado");
    botonTexto.textContent = "Traduciendo…";
    resultado.hidden = true;
    try {
      const r = await traducirTexto(texto, de, a);
      resTexto.textContent = r.texto;
      resServicio.textContent = "Traducido con " + r.servicio + ".";
      errorCaja.hidden = true;
      resultado.hidden = false;
    } catch (e) {
      console.warn("[traductorEnEs]", e && e.message ? e.message : e);
      errorCaja.textContent =
        "No se pudo traducir ahora (revisa tu conexión). Presiona «Traducir» para intentarlo de nuevo.";
      errorCaja.hidden = false;
    } finally {
      boton.disabled = false;
      boton.classList.remove("tre-ocupado");
      botonTexto.textContent = "Traducir";
    }
  }

  async function copiarResultado() {
    const t = resTexto.textContent || "";
    if (!t) return;
    let bien = false;
    try {
      await navigator.clipboard.writeText(t);
      bien = true;
    } catch (e) { /* sin permiso: fallback abajo */ }
    if (!bien) {
      try {
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.append(ta);
        ta.select();
        bien = document.execCommand("copy");
        ta.remove();
      } catch (e) { bien = false; }
    }
    copiarTexto.textContent = bien ? "¡Copiado!" : "No se pudo copiar";
    setTimeout(() => { copiarTexto.textContent = "Copiar"; }, 1600);
  }

  // ¿Dónde vive? — con contenedor: dentro de él; sin contenedor:
  // centrada en el <body> (como el resto de utils del proyecto).
  if (typeof contenedor === "string" && document.querySelector(contenedor)) {
    document.querySelector(contenedor).append(caja);
  } else if (contenedor && typeof contenedor.append === "function") {
    contenedor.append(caja);
  } else {
    const envoltura = document.createElement("div");
    envoltura.style.cssText =
      "display:flex;justify-content:center;align-items:flex-start;" +
      "width:100%;min-height:100vh;min-height:100svh;padding:26px 12px;box-sizing:border-box;";
    envoltura.append(caja);
    document.body.append(envoltura);
    caja.destruir = () => { caja.remove(); envoltura.remove(); };
    return caja;
  }

  caja.destruir = () => caja.remove();
  return caja;
}