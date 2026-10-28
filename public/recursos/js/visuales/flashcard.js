// ============================================================
// flashcard.js — Visual: FLASHCARDS (tarjetas imagen ↔ palabra)
// (recursos/js/visuales/flashcard.js)   ·   v1
//
// Tarjetas de estudio de CERO dependencias: el docente da LISTAS
// con la RUTA DE LA IMAGEN de cada tarjeta (URL, enlace, código SVG
// en línea, data URI, «img:archivo.png» o un nombre suelto que se
// resuelve en recursos/img/), su PALABRA asociada y, si quiere, el
// COLOR DEL BORDE de esa tarjeta (el que falta usa el borde
// PREDEFINIDO de este visual — un color FIJO, no cambia cada vez).
//
// ─── ANCHO CON PROPORCIÓN ───
//   El ANCHO de las tarjetas es un parámetro (140–520 px, defecto
//   260) y la ALTURA sale sola de la PROPORCIÓN fija 3:4 de una
//   flashcard de verdad: se cambia el ancho y la tarjeta nunca se
//   deforma (en pantallas chicas el ancho se achica solo, también
//   guardando la proporción).
//
// ─── EL CLIC DA VUELTA LA TARJETA ───
//   Al DAR CLIC (o Enter/Espacio: son botones de verdad) la tarjeta
//   gira con una vuelta 3D y muestra LA OTRA CARA: si está la
//   IMAGEN aparece la PALABRA y viceversa — imagen ↔ palabra,
//   siempre. La cara inicial se elige («imagen» por defecto, o
//   «palabra» para empezar adivinando). La palabra sale en el COLOR
//   DE LETRA elegido (con ajuste automático del tamaño para que quepa).
//
// ─── COLORES (regla del proyecto) ───
//   · colorTarjeta  Color de la TARJETA GRANDE (cabecera, chip,
//                   borde de foco) — defecto PREDEFINIDO y FIJO
//                   #ea580c (naranja). En «Crear» se elige con el
//                   SELECTOR RGB (input de color, sin escribir).
//   · colorBorde    Color del BORDE de cada flashcard que no tenga
//                   el suyo — defecto PREDEFINIDO y FIJO #f59e0b
//                   (ámbar). Cada tarjeta puede traer el suyo.
//   · colorLetra    Color de la LETRA de la palabra — defecto
//                   PREDEFINIDO y FIJO #1f2937. Elegible igual.
//   Los tres son colores FIJOS: NO cambian en cada montaje.
//
// ─── PARÁMETROS (objeto config) ───
//   titulo        Título de la tarjeta grande (defecto «Flashcards»).
//   tarjetas      Lista: objetos { imagen, palabra, color } — la
//                 imagen y la palabra son de a una por tarjeta
//                 (imagen opcional: sin ella la tarjeta gira igual
//                 y muestra un aviso amable); color = color del
//                 borde, OPCIONAL en HEX o rgb(). También acepta
//                 strings sueltas (= la palabra, sin imagen).
//   ancho         Ancho de CADA flashcard en px (140–520; defecto
//                 260). La altura mantiene la proporción 3:4.
//   caraInicial   Qué cara se ve primero: «imagen» (defecto) o
//                 «palabra».
//   colorTarjeta  Color de la tarjeta grande (HEX/rgb; defecto fijo
//                 #ea580c).
//   colorBorde    Borde de las flashcards sin color propio (HEX/rgb;
//                 defecto fijo #f59e0b).
//   colorLetra    Color de la palabra (HEX/rgb; defecto fijo #1f2937).
//   contenedor    HTMLElement o selector: ahí se agrega. Sin
//                 contenedor se muestra centrada en el <body>.
//
// ─── DEVUELVE ───
//   El elemento .fk-caja (con .destruir()). Nunca queda vacía: sin
//   tarjetas muestra un aviso amable. Dependencia CERO: HTML + CSS
//   inyectados desde la propia función (la imagen va dentro de
//   <img>, así el SVG en línea NUNCA ejecuta scripts: seguro).
//
// USO DESDE UNA CLASE (contenido):
//   import { flashcard } from "../../../recursos/js/visuales/flashcard.js";
//
//   flashcard({ contenedor: zona, titulo: "Animales de la granja",
//     colorTarjeta: "#0ea5e9", ancho: 240, caraInicial: "imagen",
//     colorBorde: "#16a34a", colorLetra: "#7c2d12",
//     tarjetas: [
//       { imagen: "vaca.png", palabra: "La vaca", color: "#dc2626" },
//       { imagen: "<svg …>…</svg>", palabra: "El pato" },
//       { palabra: "La gallina" },
//     ] });
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
 * util/visual es PREDEFINIDO — un color FIJO y adaptado, no uno que
 * cambie en cada montaje. La flashcard trae TRES: la tarjeta grande
 * (#ea580c naranja), el borde de las tarjetas sin color propio
 * (#f59e0b ámbar) y la letra de la palabra (#1f2937). En «Crear» el
 * docente los cambia con el selector RGB (input de color) sin
 * escribir nada.
 */
export const COLOR_DEFECTO = [234, 88, 12];       // #ea580c tarjeta
export const COLOR_BORDE_DEFECTO = [245, 158, 11]; // #f59e0b borde
export const COLOR_LETRA_DEFECTO = [31, 41, 55];   // #1f2937 letra

/* ---------------- Fuentes de imagen (URL, SVG, data URI, ruta) ---------------- */

const DIR_IMAGENES = "recursos/img/";

/**
 * Acepta TODO lo prometido y devuelve una URL utilizable para
 * <img>: URL/enlace http(s) tal cual, data:image tal cual, blob: tal
 * cual, CÓDIGO SVG en línea → data URI (dentro de un <img> el SVG
 * NO ejecuta scripts: seguro), «img:nombre.png» y nombres sueltos →
 * recursos/img/nombre.png (misma convención que relacionar.js).
 * Devuelve null si no hay nada utilizable.
 */
function fuenteImagen(valor) {
  let v = String(valor ?? "").trim().split("|")[0].trim();
  if (!v) return null;
  if (/^(data:image\/|blob:)/i.test(v)) return v;
  if (/^<\s*svg[\s>]/i.test(v) || /<\s*svg[\s>]/i.test(v)) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(v);
  }
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("/") ||
      v.startsWith("./") || v.startsWith("../")) {
    return v;
  }
  if (v.startsWith("img:")) v = v.slice(4).trim();
  if (!v) return null;
  if (/^(data:image\/|blob:)/i.test(v)) return v;
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("/") ||
      v.startsWith("./") || v.startsWith("../")) {
    return v;
  }
  return DIR_IMAGENES + encodeURI(v);
}

/* ---------------- Datos ---------------- */

/**
 * Normaliza la lista: strings ("palabra", sin imagen) u objetos
 * { imagen, palabra, color }. La PALABRA es obligatoria: las
 * entradas sin palabra se ignoran.
 */
function normalizarTarjetas(tarjetas) {
  const lista = Array.isArray(tarjetas) ? tarjetas : [];
  const fuera = [];
  for (const cruda of lista) {
    if (cruda == null) continue;
    if (typeof cruda === "string" || typeof cruda === "number") {
      const p = String(cruda).trim();
      if (p) fuera.push({ imagen: "", palabra: p, color: "", rgb: null });
      continue;
    }
    if (typeof cruda === "object") {
      const p = String(cruda.palabra ?? cruda.texto ?? cruda.termino ?? "").trim();
      if (!p) continue;
      fuera.push({
        imagen: String(cruda.imagen ?? cruda.img ?? cruda.ruta ?? "").trim(),
        palabra: p,
        color: String(cruda.color ?? cruda.colorBorde ?? cruda.borde ?? "").trim(),
        rgb: null,
      });
    }
  }
  return fuera;
}

/* ---------------- Estilos (una vez) ---------------- */

let estilosListos = false;
function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-flashcard-estilos";
  estilo.textContent = `
    .fk-caja {
      --fk-c: #ea580c;
      --fk-oscuro: #9a3412;
      --fk-claro: #ffedd5;
      --fk-borde-t: #fdba74;
      --fk-letra: #1f2937;
      width: 100%;
      margin: 1rem auto;
      background: #ffffff;
      border: 1px solid var(--fk-borde-t);
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 6px 24px rgba(17, 12, 46, .08);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      box-sizing: border-box;
    }
    .fk-caja *, .fk-caja *::before, .fk-caja *::after { box-sizing: border-box; }
    .fk-caja [hidden] { display: none !important; }

    /* ── Cabecera ── */
    .fk-cab {
      display: flex;
      align-items: center;
      gap: .6rem;
      padding: .95rem 1.1rem .55rem;
      flex-wrap: wrap;
    }
    .fk-icono {
      display: inline-flex;
      flex: none;
      width: 2.1rem;
      height: 2.1rem;
      align-items: center;
      justify-content: center;
      border-radius: .65rem;
      background: linear-gradient(135deg, var(--fk-c), var(--fk-oscuro));
      color: #ffffff;
      box-shadow: 0 3px 10px rgba(17, 12, 46, .16);
    }
    .fk-icono svg { width: 1.25rem; height: 1.25rem; }
    .fk-titulo {
      flex: 1;
      min-width: 0;
      margin: 0;
      font-size: clamp(1.12rem, 2.4vw, 1.4rem);
      font-weight: 800;
      line-height: 1.3;
      color: #111827;
      word-break: break-word;
    }
    .fk-titulo > span {
      background-image: linear-gradient(var(--fk-claro), var(--fk-claro));
      background-repeat: no-repeat;
      background-size: 100% .42em;
      background-position: 0 88%;
      padding: 0 .12em;
      border-bottom: 3px solid var(--fk-c);
    }
    .fk-chip {
      flex: none;
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .04em;
      color: var(--fk-oscuro);
      background: var(--fk-claro);
      border: 1px solid var(--fk-borde-t);
      padding: .22rem .6rem;
      border-radius: 999px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    /* ── Rejilla de flashcards ── */
    .fk-rejilla {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: stretch;
      gap: .95rem;
      padding: .6rem 1rem .3rem;
    }

    /* ── Una flashcard (giro 3D) ── */
    .fk-carta {
      position: relative;
      width: var(--fk-ancho, 260px);
      max-width: 100%;
      aspect-ratio: 3 / 4;
      perspective: 1100px;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: transform .18s ease;
    }
    .fk-carta:hover { transform: translateY(-3px); }
    .fk-carta:focus-visible {
      outline: 3px solid var(--fk-c);
      outline-offset: 3px;
      border-radius: .9rem;
    }
    .fk-giro {
      position: absolute;
      inset: 0;
      transform-style: preserve-3d;
      transition: transform .55s cubic-bezier(.35, .15, .25, 1);
    }
    .fk-giro.girada { transform: rotateY(180deg); }
    .fk-cara {
      position: absolute;
      inset: 0;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #ffffff;
      border: 3px solid var(--fk-borde, #f59e0b);
      border-radius: .9rem;
      box-shadow: 0 4px 14px rgba(17, 12, 46, .10);
      padding: 7%;
    }
    .fk-atras { transform: rotateY(180deg); }
    .fk-contenido {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .fk-cara img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }
    .fk-palabra {
      display: inline-block;
      max-width: 100%;
      font-weight: 900;
      line-height: 1.15;
      text-align: center;
      color: var(--fk-letra);
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .fk-sinimg {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .45rem;
      color: #9ca3af;
      text-align: center;
    }
    .fk-sinimg svg { width: 36%; max-width: 64px; height: auto; }
    .fk-sinimg small { font-size: .72rem; font-weight: 700; }

    /* ── Pie y vacío ── */
    .fk-pie {
      margin: 0;
      padding: .5rem 1.2rem .95rem;
      text-align: center;
      font-size: .74rem;
      color: #6b7280;
    }
    .fk-vacio {
      margin: .4rem 1.1rem 1rem;
      border: 1.5px dashed var(--fk-borde-t);
      background: var(--fk-claro);
      color: #6b7280;
      border-radius: .7rem;
      padding: 1.2rem 1rem;
      text-align: center;
      font-size: .9rem;
      font-weight: 600;
    }

    @media (max-width: 560px) {
      .fk-cab { padding: .8rem .85rem .45rem; }
      .fk-chip { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .fk-giro { transition: none; }
      .fk-carta { transition: none; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- SVG inline ---------------- */

const SVG_FLASHCARD =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3" y="7" width="14" height="12" rx="2"/>' +
  '<path d="M8 3h11a2 2 0 0 1 2 2v11"/>' +
  '<path d="M6.5 11h7M6.5 15h4.5"/>' +
  "</svg>";

const SVG_SINIMAGEN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3" y="4" width="18" height="16" rx="2"/>' +
  '<circle cx="9" cy="10" r="1.7"/>' +
  '<path d="M4 18l5-5 4 4 3-3 4 4"/>' +
  "</svg>";

/* ---------------- Componente ---------------- */

/**
 * Monta las FLASHCARDS. Devuelve el elemento .fk-caja (con
 * .destruir() y con caja.__flashcard, un gancho de lectura para
 * pruebas: cartas/cara/girar/colores/ancho). Visual puro: no
 * califica, no guarda ni pide nada — SOLO el clic que da vuelta
 * cada tarjeta.
 */
export function flashcard(config = {}) {
  const { contenedor } = config;

  // REGLA del proyecto: los tres colores HEX/rgb; VACÍO o inválido
  // → el PREDEFINIDO y FIJO de este visual (no cambia cada vez)
  const color = parseColor(config.colorTarjeta) || COLOR_DEFECTO;
  const colorBordeDef = parseColor(config.colorBorde) || COLOR_BORDE_DEFECTO;
  const colorLetra = parseColor(config.colorLetra) || COLOR_LETRA_DEFECTO;

  // Tarjetas: cada una con SU imagen, SU palabra y SU borde opcional
  const items = normalizarTarjetas(config.tarjetas);

  // Ancho de cada flashcard (140–520 px; defecto 260) — la ALTURA
  // sale sola de la proporción 3:4 (nunca se deforma)
  const ancho = Math.min(520, Math.max(140, Math.round(Number(config.ancho) || 260)));

  // Cara inicial: «imagen» (defecto) o «palabra»
  const caraInicial = String(config.caraInicial || "imagen").trim().toLowerCase() === "palabra"
    ? "palabra" : "imagen";

  const titulo = String(config.titulo || "").trim() || "Flashcards";

  inyectarEstilos();

  const caja = document.createElement("div");
  caja.className = "fk-caja";
  caja.setAttribute("role", "region");
  caja.setAttribute("aria-label", "Flashcards de imagen y palabra");
  caja.style.setProperty("--fk-c", `rgb(${color.join(",")})`);
  caja.style.setProperty("--fk-oscuro", tono(color, -0.28));
  caja.style.setProperty("--fk-claro", tono(color, 0.93));
  caja.style.setProperty("--fk-borde-t", tono(color, 0.55));
  caja.style.setProperty("--fk-letra", `rgb(${colorLetra.join(",")})`);
  caja.style.setProperty("--fk-ancho", ancho + "px");   // ancho de CADA flashcard

  /* ── Cabecera ── */
  const cab = document.createElement("div");
  cab.className = "fk-cab";
  const icono = document.createElement("span");
  icono.className = "fk-icono";
  icono.innerHTML = SVG_FLASHCARD;
  const tituloEl = document.createElement("h3");
  tituloEl.className = "fk-titulo";
  const tituloMarca = document.createElement("span");
  tituloMarca.textContent = titulo;
  tituloEl.appendChild(tituloMarca);
  cab.append(icono, tituloEl);

  const n0 = items.length;
  if (n0) {
    const chip = document.createElement("span");
    chip.className = "fk-chip";
    chip.textContent = n0 + (n0 === 1 ? " tarjeta" : " tarjetas");
    cab.appendChild(chip);
  }

  /* ── Rejilla ── */
  const rejilla = document.createElement("div");
  rejilla.className = "fk-rejilla";

  if (!items.length) {
    const vacio = document.createElement("div");
    vacio.className = "fk-vacio";
    vacio.textContent = "Estas flashcards aún no tienen tarjetas: agrégales al menos una.";
    caja.append(cab, vacio);
    caja.destruir = () => caja.remove();
    return montar(caja, contenedor);
  }

  const cartas = [];   // { raiz, giro, palabraEl, girada, item }

  items.forEach((item, i) => {
    // Color del borde de ESTA tarjeta: el suyo manda; el que falte
    // o no se entienda → el PREDEFINIDO FIJO de este visual
    const rgbBorde = parseColor(item.color) || colorBordeDef;

    const carta = document.createElement("div");
    carta.className = "fk-carta";
    carta.style.setProperty("--fk-borde", `rgb(${rgbBorde.join(",")})`);
    carta.setAttribute("role", "button");
    carta.tabIndex = 0;
    carta.setAttribute("aria-label",
      "Tarjeta " + (i + 1) + " de " + n0 + ": toca para girar entre imagen y palabra");
    carta.setAttribute("aria-pressed", "false");

    const giro = document.createElement("div");
    giro.className = "fk-giro";

    /* ── las dos caras ── */
    const caraImagen = document.createElement("div");
    caraImagen.className = "fk-cara";
    const contenidoImagen = document.createElement("div");
    contenidoImagen.className = "fk-contenido";
    const fuente = fuenteImagen(item.imagen);
    if (fuente) {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = "Imagen de la tarjeta " + (i + 1);
      img.src = fuente;
      img.addEventListener("error", () => {
        // La imagen no cargó: aviso amable (la tarjeta sigue girando)
        contenidoImagen.innerHTML = "";
        const sin = document.createElement("div");
        sin.className = "fk-sinimg";
        sin.innerHTML = SVG_SINIMAGEN;
        const sm = document.createElement("small");
        sm.textContent = "Imagen no encontrada";
        sin.appendChild(sm);
        contenidoImagen.appendChild(sin);
      });
      contenidoImagen.appendChild(img);
    } else {
      const sin = document.createElement("div");
      sin.className = "fk-sinimg";
      sin.innerHTML = SVG_SINIMAGEN;
      const sm = document.createElement("small");
      sm.textContent = "Esta tarjeta no tiene imagen";
      sin.appendChild(sm);
      contenidoImagen.appendChild(sin);
    }
    caraImagen.appendChild(contenidoImagen);

    const caraPalabra = document.createElement("div");
    caraPalabra.className = "fk-cara";
    const contenidoPalabra = document.createElement("div");
    contenidoPalabra.className = "fk-contenido";
    const palabraEl = document.createElement("span");
    palabraEl.className = "fk-palabra";
    palabraEl.textContent = item.palabra;
    contenidoPalabra.appendChild(palabraEl);
    caraPalabra.appendChild(contenidoPalabra);

    // ¿Qué cara se ve primero? («imagen» por defecto, o «palabra»)
    const frente = caraInicial === "palabra" ? caraPalabra : caraImagen;
    const atras = caraInicial === "palabra" ? caraImagen : caraPalabra;
    frente.classList.add("fk-frente");
    atras.classList.add("fk-atras");

    giro.append(frente, atras);
    carta.appendChild(giro);
    rejilla.appendChild(carta);

    const registro = {
      raiz: carta,
      giro,
      palabraEl,
      contenidoImagen,
      girada: false,
      item,
    };

    /* ── EL CLIC: la otra cara (imagen ↔ palabra, siempre) ── */
    const girar = () => {
      registro.girada = !registro.girada;
      giro.classList.toggle("girada", registro.girada);
      carta.setAttribute("aria-pressed", registro.girada ? "true" : "false");
    };
    carta.addEventListener("click", girar);
    carta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        girar();
      }
    });

    registro.girar = girar;
    cartas.push(registro);
  });

  /* ── La palabra SIEMPRE cabe: ajuste automático al ancho real ── */
  function ajustarPalabras() {
    for (const c of cartas) {
      const cont = c.palabraEl.parentElement;
      if (!cont || !c.palabraEl.textContent) continue;
      let fs = Math.max(12, Math.min(44, cont.clientWidth * 0.16));
      c.palabraEl.style.fontSize = fs + "px";
      let guard = 80;
      while (guard-- > 0 && fs > 11 &&
        (c.palabraEl.scrollWidth > cont.clientWidth ||
          c.palabraEl.scrollHeight > cont.clientHeight)) {
        fs -= 1;
        c.palabraEl.style.fontSize = fs + "px";
      }
    }
  }
  let rafAjuste = 0;
  const pedirAjuste = () => {
    if (rafAjuste) cancelAnimationFrame(rafAjuste);
    rafAjuste = requestAnimationFrame(() => {
      rafAjuste = 0;
      ajustarPalabras();
    });
  };
  if (typeof ResizeObserver === "function") {
    var observador = new ResizeObserver(pedirAjuste);
    observador.observe(caja);
  } else {
    window.addEventListener("resize", pedirAjuste);
  }

  /* ── Pie ── */
  const pie = document.createElement("p");
  pie.className = "fk-pie";
  pie.textContent =
    "Haz clic en una tarjeta para ver su otra cara: " +
    (caraInicial === "palabra" ? "palabra ↔ imagen." : "imagen ↔ palabra.");

  caja.append(cab, rejilla, pie);

  /* ── gancho de lectura (pruebas E2E) ── */

  caja.__flashcard = {
    ancho: () => ancho,
    caraInicial: () => caraInicial,
    items: () => items.map((it) => ({
      imagen: it.imagen,
      palabra: it.palabra,
      color: it.color,
    })),
    coloresBorde: () => cartas.map((c) => c.raiz.style.getPropertyValue("--fk-borde").replace(/\s/g, "")),
    girada: (i) => cartas[i].girada,
    cara: (i) => (cartas[i].girada
      ? (caraInicial === "palabra" ? "imagen" : "palabra")
      : caraInicial),
    girar: (i) => cartas[i].girar(),
    ajustar: ajustarPalabras,
  };

  caja.destruir = () => {
    if (rafAjuste) cancelAnimationFrame(rafAjuste);
    if (typeof observador !== "undefined" && observador) observador.disconnect();
    rafAjuste = 0;
    caja.remove();
  };

  requestAnimationFrame(pedirAjuste);
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
