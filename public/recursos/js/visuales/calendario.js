// ============================================================
// calendario.js — Recurso visual: CALENDARIO de un mes · MULTIIDIOMA
// (recursos/js/visuales/calendario.js) · v2
//
// Dibuja el calendario REAL del mes y año indicados: descubre solo
// con qué día de la semana empieza y cuántos días tiene el mes
// (años bisiestos incluidos). Encabezado AZUL CLARO con letras
// negras, cuadrícula para los días y — si se pide — las
// FESTIVIDADES marcadas en rojo y listadas debajo.
//
// NUEVO EN v2 — MULTIIDIOMA: el idioma sale SOLO del nombre del mes
// que se le pasa (o del parámetro "idioma", que gana):
//   mes: "July"   + 2027 → título "July 2027", semana MON TUE WED…,
//                          lista "Holidays" — TODO en inglés.
//   mes: "Julio"  + 2027 → título "Julio 2027", semana LUN MAR MIÉ…,
//                          lista "Festividades" — TODO en español.
//   mes: "juillet"       → francés · "Julho" → portugués ·
//   "Juli" → alemán · "Luglio" → italiano.
//   mes: 7 (número)      → español por defecto; con idioma:"en" → inglés.
// Idiomas soportados: español (es) · English (en) · français (fr) ·
// português (pt) · deutsch (de) · italiano (it).
//
// SVG no: es HTML + CSS implícito (convención del proyecto) y SIN
// imports ni librerías, para que cualquier clase lo llame directo.
//
// ─── PARÁMETROS (objeto de opciones) ───
//   mes                  1–12 o el NOMBRE del mes en cualquiera de
//                        los 6 idiomas ("July", "Julio", "juillet",
//                        "Julho", "Juli", "Luglio", abreviaturas de
//                        3+ letras "sep", "Dec"…) · REQUERIDO.
//                        Si el nombre existe en varios idiomas
//                        (ej. "abril", "agosto") gana el ESPAÑOL;
//                        para otro idioma escríbelo como se escribe
//                        ahí ("april", "August") o pasa idioma.
//   anio                 Año del calendario (entero, ej. 2027) · REQUERIDO
//   idioma               OPCIONAL: fija el idioma de TODO (título,
//                        semana, lista). Acepta código o nombre en
//                        cualquier idioma: "es", "en", "english",
//                        "inglés", "fr", "français"… Si se pasa, el
//                        título usa el nombre del mes EN ESE idioma
//                        (mes:"julio" + idioma:"en" → "July 2027").
//   ancho                Ancho del recurso en px. (Defecto: 320). La
//                       ALTURA sale sola del ancho: celdas cuadradas
//                       + encabezado + lista de festividades. En
//                       pantallas angostas se encoge (max-width 100%).
//   mostrarFestividades  true → marca las festividades del mes y las
//                        lista debajo. (Defecto: false)
//   festividades         Lista [{ dia: 15, nombre: "…" }, …]: el día
//                       es SOLO el número (el mes ya está dado) y el
//                       nombre acepta un texto o una LISTA. Varias
//                       entradas del mismo día se agrupan. Los días
//                       fuera del mes se ignoran (mejor esfuerzo).
//                       Los nombres se muestran TAL CUAL (son
//                       contenido de la clase, no se traducen).
//   iniciaEn             "lunes" (defecto, LUN…DOM) o "domingo"
//                        (DOM…SÁB) — acepta también "monday"/"sunday"
//                        y sus equivalentes en los otros idiomas.
//   contenedor           HTMLElement opcional: si se pasa, el
//                       calendario se agrega ahí; si no, solo se
//                       devuelve para insertarlo a mano.
//
// ─── DEVUELVE ───
//   El elemento <div class="vis-cal" data-idioma="es|en|…"> listo
//   para usar. Si el mes, año o idioma no son válidos LANZA un Error
//   con el motivo (un calendario mal configurado debe verse al armar
//   la clase, no callarse).
//
// USO DESDE UNA CLASE (contenido):
//   import { dibujarCalendario } from "../../../recursos/js/visuales/calendario.js";
//
//   dibujarCalendario({ mes: "July", anio: 2027, ancho: 320, contenedor: zona });
//   dibujarCalendario({
//     mes: "Septiembre", anio: 2026, ancho: 320,
//     mostrarFestividades: true,
//     festividades: [{ dia: 15, nombre: "Día de la Independencia" }],
//     contenedor: zona,
//   });
// ============================================================

/* ---------------- Idiomas ---------------- */

const IDIOMAS = {
  es: {
    meses: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
    semLunes: ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"],
    semDomingo: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"],
    tituloFests: "Festividades",
    aria: "Calendario de {mes} de {anio}",
  },
  en: {
    meses: ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"],
    semLunes: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    semDomingo: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
    tituloFests: "Holidays",
    aria: "Calendar for {mes} {anio}",
  },
  fr: {
    meses: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
    semLunes: ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"],
    semDomingo: ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"],
    tituloFests: "Fêtes",
    aria: "Calendrier de {mes} {anio}",
  },
  pt: {
    meses: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    semLunes: ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"],
    semDomingo: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"],
    tituloFests: "Feriados",
    aria: "Calendário de {mes} de {anio}",
  },
  de: {
    meses: ["Januar", "Februar", "März", "April", "Mai", "Juni",
      "Juli", "August", "September", "Oktober", "November", "Dezember"],
    semLunes: ["MO", "DI", "MI", "DO", "FR", "SA", "SO"],
    semDomingo: ["SO", "MO", "DI", "MI", "DO", "FR", "SA"],
    tituloFests: "Feiertage",
    aria: "Kalender {mes} {anio}",
  },
  it: {
    meses: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
      "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
    semLunes: ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"],
    semDomingo: ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"],
    tituloFests: "Festività",
    aria: "Calendario di {mes} {anio}",
  },
};

// Al desambiguar nombres compartidos entre idiomas (ej. "abril",
// "agosto") gana el PRIMERO de esta lista — el español, idioma del
// proyecto. Para otro idioma, escribir el mes como se escribe allí.
const ORDEN_IDIOMAS = ["es", "en", "fr", "pt", "de", "it"];

// Alias aceptados en el parámetro "idioma" (código o nombre, sin
// acentos ni mayúsculas).
const ALIAS_IDIOMA = {
  es: ["es", "espanol", "castellano", "spanish"],
  en: ["en", "english", "ingles"],
  fr: ["fr", "francais", "french", "frances"],
  pt: ["pt", "portugues", "portuguese"],
  de: ["de", "deutsch", "german", "aleman"],
  it: ["it", "italiano", "italian"],
};

// Semana que empieza en DOMINGO: sinónimos aceptados en iniciaEn.
const SINONIMOS_DOMINGO = ["domingo", "sunday", "dimanche", "domenica", "sonntag", "dom", "sun"];

/* ---------------- CSS implícito ---------------- */

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "visuales-calendario-estilos";
  estilo.textContent = `
    .vis-cal {
      background: #ffffff;
      border: 1px solid #94a3b8;
      border-radius: .6rem;
      overflow: hidden;
      max-width: 100%;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      box-sizing: border-box;
      /* Contenedor de query: las fuentes en cqw se recalculan con el
         ancho REAL (así el calendario de 640px encogido a 366px por
         max-width encoge también sus letras y no se recorta) */
      container-type: inline-size;
    }
    /* Encabezado azul claro con letras negras */
    .vis-cal-cab {
      background: #bae6fd;
      color: #000000;
      font-weight: 800;
      text-align: center;
      letter-spacing: .02em;
    }
    /* La cuadrícula: el fondo gris del contenedor ES la línea,
       las celdas se separan 1px (rejilla limpia sin bordes raros) */
    .vis-cal-cuerpo {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
      background: #94a3b8;
      border-top: 1px solid #94a3b8;
      border-bottom: 1px solid #94a3b8;
    }
    .vis-cal-sem {
      background: #e0f2fe;
      color: #000000;
      font-weight: 800;
      text-align: center;
      padding: .4em 0;
    }
    .vis-cal-celda {
      background: #ffffff;
      color: #000000;
      font-weight: 600;
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    /* Día con festividad: número en rojo sobre rojo claro */
    .vis-cal-fest {
      background: #fee2e2;
      color: #dc2626;
      font-weight: 800;
    }
    /* Lista de festividades debajo de la cuadrícula */
    .vis-cal-fests {
      background: #ffffff;
      color: #000000;
      padding: .5em .7em;
    }
    .vis-cal-fests-titulo {
      font-weight: 800;
      font-size: .92em;
      margin-bottom: .25em;
    }
    .vis-cal-fest-item {
      display: flex;
      gap: .55em;
      align-items: baseline;
      line-height: 1.45;
    }
    .vis-cal-fest-dia {
      color: #dc2626;
      font-weight: 800;
      min-width: 1.7em;
      text-align: right;
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Utilidades ---------------- */

function sinAcentos(texto) {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapar(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Código de idioma desde el parámetro "idioma" (o null si no vino). */
function normalizarIdioma(crudo) {
  if (crudo === undefined || crudo === null || String(crudo).trim() === "") return null;
  const t = sinAcentos(crudo).trim().toLowerCase();
  for (const codigo of ORDEN_IDIOMAS) {
    if (ALIAS_IDIOMA[codigo].includes(t)) return codigo;
  }
  throw new Error('calendario.js: no reconozco el idioma "' + crudo +
    '" (soportados: es, en, fr, pt, de, it — también "english", "français", …).');
}

/**
 * Busca el mes por NOMBRE en los 6 idiomas (completo o de 3+ letras,
 * sin acentos/mayúsculas). Coincidencia EXACTA manda sobre la por
 * prefijo; a igualdad gana el idioma que aparezca primero en
 * ORDEN_IDIOMAS (español). Devuelve { mes, idioma } o null.
 */
function buscarMesPorNombre(t, idiomaPedido) {
  const exactos = [];
  const prefijos = [];
  for (const codigo of ORDEN_IDIOMAS) {
    IDIOMAS[codigo].meses.forEach((nombre, i) => {
      const norm = sinAcentos(nombre.toLowerCase());
      if (norm === t) exactos.push({ mes: i + 1, idioma: codigo });
      else if (norm.startsWith(t)) prefijos.push({ mes: i + 1, idioma: codigo });
    });
  }
  const delIdioma = (lista) => (idiomaPedido ? lista.filter((c) => c.idioma === idiomaPedido) : []);
  const elegidos =
    delIdioma(exactos).length ? delIdioma(exactos) :
    delIdioma(prefijos).length ? delIdioma(prefijos) :
    exactos.length ? exactos :
    prefijos;
  return elegidos.length ? elegidos[0] : null;
}

/**
 * Resuelve el parámetro mes → número 1-12 (LANZA Error si es
 * irreconocible) y el idioma del calendario (el pedido gana; si no
 * hay, el detectado por el nombre; con número → español).
 */
function resolverMesEIdioma(mes, idiomaPedido) {
  const crudo = mes ?? "";
  // ¿Vino como número (o como texto numérico "9")?
  if (typeof crudo === "number" || (typeof crudo === "string" && crudo.trim() !== "" && !Number.isNaN(Number(crudo)))) {
    const n = Math.round(Number(crudo));
    if (n >= 1 && n <= 12) return { mesNum: n, idioma: idiomaPedido || "es" };
    throw new Error('calendario.js: el mes debe ser 1-12 (recibí: "' + crudo + '").');
  }
  const t = sinAcentos(String(crudo)).trim().toLowerCase();
  if (t.length >= 3) {
    const hallado = buscarMesPorNombre(t, idiomaPedido);
    if (hallado) {
      return { mesNum: hallado.mes, idioma: idiomaPedido || hallado.idioma };
    }
  }
  throw new Error('calendario.js: no reconozco el mes "' + crudo +
    '". Usa 1-12 o el nombre del mes en cualquier idioma soportado (español, english, français, português, deutsch, italiano), ej. "July", "Julio", "juillet".');
}

/* ---------------- Dibujo ---------------- */

/**
 * Dibuja el calendario del mes/año y lo devuelve como elemento.
 * (Ver la cabecera del archivo para los parámetros.)
 */
export function dibujarCalendario(opciones = {}) {
  inyectarEstilos();
  const opc = opciones || {};

  /* --- validación (fallar AL ARMAR, no callarse) --- */
  const idiomaPedido = normalizarIdioma(opc.idioma);
  const { mesNum, idioma } = resolverMesEIdioma(opc.mes, idiomaPedido);
  const IDI = IDIOMAS[idioma];

  const y = Number(opc.anio);
  if (!Number.isInteger(y) || y < 1 || y > 9999) {
    throw new Error('calendario.js: el año debe ser un número entero entre 1 y 9999 (recibí: "' + (opc.anio ?? "") + '").');
  }

  /* --- medidas: TODO se deriva del ancho ---
     Cada tamaño se emite en px (respaldo) y en cqw (% del ancho real
     del calendario): si max-width lo encoge, todo escala junto. */
  const W = Math.max(160, Number(opc.ancho) || 320);
  const aCqw = (px) => String(Math.round((px / W) * 100000) / 1000) + "cqw";
  const estiloTam = (px) => "font-size:" + px + "px;font-size:" + aCqw(px);
  const fuenteCab = Math.max(14, Math.round(W * 0.052));  // 320 → 17px
  const fuenteSem = Math.max(8, Math.round(W * 0.033));   // 320 → 11px
  const fuenteDia = Math.max(10, Math.round(W * 0.041));  // 320 → 13px
  const fuenteFest = Math.max(10, Math.round(W * 0.037)); // 320 → 12px
  const padCab = Math.max(6, Math.round(W * 0.02));

  /* --- fechas REALES del mes pedido --- */
  const idxMes = mesNum - 1;
  const diasMes = new Date(y, idxMes + 1, 0).getDate();          // bisiestos incluidos
  const primerDia = new Date(y, idxMes, 1).getDay();             // 0 = domingo
  const iniciaDomingo = SINONIMOS_DOMINGO.includes(sinAcentos(String(opc.iniciaEn || "lunes")).trim().toLowerCase());
  const offset = iniciaDomingo ? primerDia : (primerDia + 6) % 7; // huecos antes del día 1
  const filas = Math.ceil((offset + diasMes) / 7);
  const celdas = filas * 7;                                       // cuadrícula rectangular

  /* --- festividades: agrupadas por día (mejor esfuerzo) --- */
  const mapa = new Map();
  if (opc.mostrarFestividades) {
    const lista = Array.isArray(opc.festividades) ? opc.festividades : (opc.festividades ? [opc.festividades] : []);
    lista.forEach((f) => {
      if (!f) return;
      const d = Math.round(Number(f.dia));
      if (!Number.isInteger(d) || d < 1 || d > diasMes) return; // día fuera del mes → ignorar
      const nombres = Array.isArray(f.nombre) ? f.nombre : [f.nombre];
      nombres.forEach((n) => {
        const texto = String(n ?? "").trim();
        if (!texto) return;
        if (!mapa.has(d)) mapa.set(d, []);
        mapa.get(d).push(texto);
      });
    });
  }

  /* --- celdas (renglón de la semana EN EL IDIOMA del calendario) --- */
  const SEMANA = iniciaDomingo ? IDI.semDomingo : IDI.semLunes;
  let cuerpo = "";
  SEMANA.forEach((s) => {
    cuerpo += '<div class="vis-cal-sem" style="' + estiloTam(fuenteSem) + '">' + s + "</div>";
  });
  for (let i = 0; i < celdas; i++) {
    const dia = i - offset + 1;
    if (dia < 1 || dia > diasMes) {
      cuerpo += '<div class="vis-cal-celda"></div>'; // hueco antes/después del mes
      continue;
    }
    const fests = mapa.get(dia);
    if (fests) {
      cuerpo +=
        '<div class="vis-cal-celda vis-cal-fest" style="' + estiloTam(fuenteDia) + '"' +
        ' title="' + escapar(fests.join(" · ")) + '">' + dia + "</div>";
    } else {
      cuerpo += '<div class="vis-cal-celda" style="' + estiloTam(fuenteDia) + '">' + dia + "</div>";
    }
  }

  /* --- lista de festividades debajo de la cuadrícula (título traducido) --- */
  let listaHtml = "";
  if (opc.mostrarFestividades && mapa.size) {
    let items = "";
    [...mapa.keys()].sort((a, b) => a - b).forEach((d) => {
      items +=
        '<div class="vis-cal-fest-item" style="' + estiloTam(fuenteFest) + '">' +
        '<span class="vis-cal-fest-dia">' + d + "</span>" +
        "<span>" + escapar(mapa.get(d).join(" · ")) + "</span></div>";
    });
    listaHtml =
      '<div class="vis-cal-fests" style="' + estiloTam(fuenteFest) + '">' +
      '<div class="vis-cal-fests-titulo">' + IDI.tituloFests + "</div>" + items + "</div>";
  }

  /* --- caja final --- */
  const nombreMes = IDI.meses[idxMes];
  const caja = document.createElement("div");
  caja.className = "vis-cal";
  caja.style.width = W + "px";
  caja.setAttribute("role", "img");
  caja.setAttribute("data-idioma", idioma);
  caja.setAttribute("aria-label", IDI.aria.replace("{mes}", nombreMes).replace("{anio}", String(y)));
  caja.innerHTML =
    '<div class="vis-cal-cab" style="' + estiloTam(fuenteCab) + ";padding:" + padCab + "px;padding:" + aCqw(padCab) + '">' +
    escapar(nombreMes) + " " + y + "</div>" +
    '<div class="vis-cal-cuerpo">' + cuerpo + "</div>" +
    listaHtml;

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(caja);
  }
  return caja;
}