// ============================================================
// cuadriculaVocabulario.js — Visual: CUADRÍCULA DE VOCABULARIO
// (js/utils/cuadriculaVocabulario.js)   ·   v2 (color predefinido fijo)
//
// Componente VISUAL para mostrar vocabulario en formato de
// cuadrícula: un título principal decorado con el color temático y,
// debajo, una cuadrícula que respeta EXACTAMENTE la cantidad de
// columnas elegida (entre 1 y 5). Pensado para listas de palabras
// con imagen, traducción y descripción opcionales.
//
// ─── DOS DISEÑOS SEGÚN LAS COLUMNAS ───
//   · 1 o 2 columnas → tarjetas ANCHAS: imagen a la izquierda
//     (cuadrada), y a la derecha el TÉRMINO alineado en la MISMA
//     LÍNEA que su traducción (separados por una flecha del color
//     temático); debajo de esa línea va la descripción.
//   · 3, 4 o 5 columnas → tarjetas COMPACTAS apiladas en vertical:
//     imagen arriba (cuadrada), luego el término, luego la
//     traducción y la descripción al fondo de la tarjeta.
//
// ─── IMÁGENES ───
//   Cada palabra acepta una imagen OPCIONAL que puede ser: un link/
//   URL (https://…, una ruta relativa), una imagen PNG/JPG/WebP
//   (por URL o en data:base64) o CÓDIGO SVG pegado tal cual
//   («<svg …>…</svg>»). La imagen SIEMPRE se escala de forma
//   CUADRADA (recuadro 1:1) y su lado se adapta al tamaño de la
//   cuadrícula: en 1 columna es más grande, en 5 queda pequeña.
//   Si la URL falla, el recuadro muestra la inicial del término
//   (la cuadrícula nunca se rompe).
//
// ─── TEXTO FORMATEADO ───
//   Título, términos, traducciones y descripciones admiten el
//   formato del proyecto: **negrita**, *cursiva*, __subrayado__,
//   ~~tachado~~, ==resaltado==, `código`, $fórmulas$ LaTeX…
//   (usa formatoTexto.js, el mismo motor del resto de bloques).
//
// ─── PARÁMETROS (objeto config) ───
//   titulo         Título principal (defecto «Vocabulario»).
//   columnas       Cantidad de columnas de la cuadrícula, entre 1
//                  y 5 (defecto 3). Se RESPETA exacta; un valor
//                  inválido se ajusta al rango.
//   colorTarjeta   Color temático en HEX o rgb() (ej. «#0ea5e9»).
//                  REGLA DEL PROYECTO: si no se pasa (o es inválido)
//                  se usa el color PREDEFINIDO de este visual — un
//                  color FIJO (#7c3aed violeta), adaptado y legible;
//                  NO cambia en cada montaje. En «Crear» se elige
//                  con el SELECTOR RGB (input de color, sin escribir
//                  nada a mano).
//   palabras       Lista de palabras. Cada palabra es el término
//                  principal (OBLIGATORIO) y de forma OPCIONAL una
//                  imagen, una traducción y una descripción:
//                    ["dog", { termino: "cat", traduccion: "gato" }]
//   contenedor     HTMLElement o selector: la cuadrícula se agrega
//                  ahí (así la usan el editor «Crear» y las
//                  clases). Sin contenedor se muestra centrada en
//                  el <body>.
//
// ─── DEVUELVE ───
//   El elemento .cvv-caja (con .destruir() para quitarla). Nunca
//   devuelve vacío: sin config se monta con los valores por
//   defecto. Es un VISUAL: no califica, no guarda ni pide nada.
//
// USO DESDE UNA CLASE (contenido):
//   import { cuadriculaVocabulario } from "../../../js/utils/cuadriculaVocabulario.js";
//
//   cuadriculaVocabulario({ contenedor: zona, titulo: "Animales", columnas: 2,
//     colorTarjeta: "#0ea5e9",
//     palabras: [
//       { termino: "dog", imagen: "https://…/dog.png", traduccion: "perro",
//         descripcion: "El mejor amigo del hogar" },
//       { termino: "cat", traduccion: "gato" },
//     ] });
// ============================================================

import { aplicarFormato } from "../componentes/formatoTexto.js";

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
 * cambie en cada montaje. Para la cuadrícula de vocabulario es el
 * violeta #7c3aed: vivo, legible con texto blanco y con buenos
 * tonos claros/oscuros derivados. En «Crear» el docente lo cambia
 * con el selector RGB (input de color) sin escribirlo a mano.
 */
export const COLOR_DEFECTO = [124, 58, 237];   // #7c3aed

/* ---------------- Estilos (una vez) ---------------- */

let estilosListos = false;
function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-cuadricula-vocabulario-estilos";
  estilo.textContent = `
    .cvv-caja {
      --cvv-c: #7c3aed;
      --cvv-oscuro: #6d28d9;
      --cvv-claro: #f5f3ff;
      --cvv-borde: #ddd6fe;
      width: 100%;
      max-width: 980px;
      margin: 1rem auto;
      background: #ffffff;
      border: 1px solid var(--cvv-borde);
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 6px 24px rgba(17, 12, 46, .08);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      box-sizing: border-box;
    }
    .cvv-caja *, .cvv-caja *::before, .cvv-caja *::after { box-sizing: border-box; }
    .cvv-caja [hidden] { display: none !important; }

    /* ── Cabecera: título decorado con el color temático ── */
    .cvv-cab {
      display: flex;
      align-items: center;
      gap: .6rem;
      padding: .95rem 1.1rem .6rem;
      flex-wrap: wrap;
    }
    .cvv-icono {
      display: inline-flex;
      flex: none;
      width: 2.1rem;
      height: 2.1rem;
      align-items: center;
      justify-content: center;
      border-radius: .65rem;
      background: linear-gradient(135deg, var(--cvv-c), var(--cvv-oscuro));
      color: #ffffff;
      box-shadow: 0 3px 10px rgba(17, 12, 46, .16);
    }
    .cvv-icono svg { width: 1.2rem; height: 1.2rem; }
    .cvv-titulo {
      flex: 1;
      min-width: 0;
      font-size: clamp(1.12rem, 2.4vw, 1.4rem);
      font-weight: 800;
      line-height: 1.3;
      color: #111827;
      word-break: break-word;
    }
    /* decoración del título: marcador del color temático bajo el texto */
    .cvv-titulo > span {
      background-image: linear-gradient(var(--cvv-claro), var(--cvv-claro));
      background-repeat: no-repeat;
      background-size: 100% .42em;
      background-position: 0 88%;
      padding: 0 .12em;
      border-bottom: 3px solid var(--cvv-c);
    }
    .cvv-chip {
      flex: none;
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .04em;
      color: var(--cvv-oscuro);
      background: var(--cvv-claro);
      border: 1px solid var(--cvv-borde);
      padding: .22rem .6rem;
      border-radius: 999px;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    /* ── Cuadrícula: EXACTAMENTE las columnas pedidas ── */
    .cvv-grid {
      display: grid;
      gap: .65rem;
      padding: .3rem 1.1rem 1.1rem;
      align-items: stretch;
    }

    /* ── Tarjeta ── */
    .cvv-tarjeta {
      position: relative;
      background: #ffffff;
      border: 1.5px solid var(--cvv-borde);
      border-radius: .8rem;
      padding: .8rem .75rem .7rem;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: .5rem;
      overflow: hidden;
    }
    .cvv-tarjeta::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--cvv-c), var(--cvv-oscuro));
    }

    /* imagen SIEMPRE cuadrada; el lado se adapta a la cuadrícula */
    .cvv-img {
      position: relative;
      aspect-ratio: 1 / 1;
      flex: none;
      overflow: hidden;
      border-radius: .65rem;
      background: var(--cvv-claro);
      border: 1px solid var(--cvv-borde);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cvv-img img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .cvv-img svg {
      width: 100%;
      height: 100%;
      display: block;
      padding: .3rem;
    }
    .cvv-img.cvv-mala img { display: none; }
    .cvv-img.cvv-mala::after {
      content: attr(data-letra);
      font-weight: 800;
      font-size: 1.7rem;
      color: var(--cvv-c);
      font-family: inherit;
    }

    /* ── Tarjeta ANCHA (1–2 columnas) ── */
    .cvv-tarjeta.ancha {
      flex-direction: row;
      align-items: center;
      gap: .85rem;
      padding: .85rem .9rem;
    }
    .cvv-tarjeta.ancha .cvv-img {
      width: var(--cvv-img-lado, 100px);
      align-self: flex-start;
    }
    .cvv-cuerpo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .3rem; }
    .cvv-linea {
      display: flex;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
    }
    .cvv-termino {
      font-weight: 800;
      font-size: 1.08rem;
      line-height: 1.3;
      color: #111827;
      word-break: break-word;
    }
    .cvv-flecha { display: inline-flex; flex: none; color: var(--cvv-c); }
    .cvv-flecha svg { width: 1.15rem; height: 1.15rem; }
    .cvv-traduccion {
      font-weight: 700;
      font-size: 1rem;
      line-height: 1.3;
      color: var(--cvv-oscuro);
      word-break: break-word;
    }
    .cvv-desc {
      font-size: .86rem;
      line-height: 1.5;
      color: #4b5563;
      word-break: break-word;
    }

    /* ── Tarjeta COMPACTA (3–5 columnas): todo apilado ── */
    .cvv-tarjeta.compacta { align-items: center; text-align: center; }
    .cvv-tarjeta.compacta .cvv-img { width: 100%; max-width: 150px; }
    .cvv-tarjeta.compacta .cvv-termino { font-size: 1rem; }
    .cvv-tarjeta.compacta .cvv-traduccion { font-size: .92rem; }
    .cvv-tarjeta.compacta .cvv-desc {
      margin-top: auto;
      padding-top: .15rem;
      border-top: 1px dashed var(--cvv-borde);
      width: 100%;
      font-size: .78rem;
      color: #6b7280;
    }

    /* ── Vacío ── */
    .cvv-vacio {
      grid-column: 1 / -1;
      border: 1.5px dashed var(--cvv-borde);
      background: var(--cvv-claro);
      color: #6b7280;
      border-radius: .7rem;
      padding: 1rem;
      text-align: center;
      font-size: .9rem;
      font-weight: 600;
    }

    @media (max-width: 560px) {
      .cvv-cab { padding: .8rem .85rem .5rem; }
      .cvv-grid { gap: .5rem; padding: .25rem .85rem .85rem; }
      .cvv-tarjeta.ancha { gap: .6rem; }
      .cvv-tarjeta.ancha .cvv-img { width: 78px; }
      .cvv-chip { display: none; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- SVG inline ---------------- */

const SVG_CUADRICULA =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z"/></svg>';

const SVG_FLECHA =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';

/* ---------------- Datos ---------------- */

/**
 * Normaliza la lista de palabras: acepta strings ("dog") u objetos
 * { termino, imagen, traduccion, descripcion }. El TÉRMINO es
 * obligatorio: las entradas sin término se ignoran (y la tarjeta
 * jamás queda vacía).
 */
function normalizarItems(palabras) {
  const lista = Array.isArray(palabras) ? palabras : [];
  const items = [];
  for (const cruda of lista) {
    if (cruda == null) continue;
    if (typeof cruda === "string" || typeof cruda === "number") {
      const t = String(cruda).trim();
      if (t) items.push({ termino: t, imagen: "", traduccion: "", descripcion: "" });
      continue;
    }
    if (typeof cruda === "object") {
      const t = String(cruda.termino ?? cruda.palabra ?? cruda.texto ?? "").trim();
      if (!t) continue;
      items.push({
        termino: t,
        imagen: String(cruda.imagen ?? "").trim(),
        traduccion: String(cruda.traduccion ?? "").trim(),
        descripcion: String(cruda.descripcion ?? "").trim(),
      });
    }
  }
  return items;
}

/**
 * La imagen puede ser: link/URL (http… o ruta), PNG/JPG/WebP por URL
 * o data:base64, o CÓDIGO SVG pegado tal cual. Devuelve { svg } o
 * { url }, o null si no hay imagen.
 */
function resolverImagen(valor) {
  const v = String(valor || "").trim();
  if (!v) return null;
  if (/<svg[\s>]/i.test(v)) return { svg: v };
  return { url: v };
}

/* ---------------- Componente ---------------- */

/**
 * Monta la CUADRÍCULA DE VOCABULARIO. Devuelve el elemento .cvv-caja
 * (con .destruir()). Visual puro: no califica ni guarda nada.
 */
export function cuadriculaVocabulario(config = {}) {
  const { contenedor } = config;

  // Columnas: entre 1 y 5, EXACTAS (inválido → 3)
  const col = Math.min(5, Math.max(1, Math.round(Number(config.columnas) || 3)));

  // REGLA del proyecto: colorTarjeta HEX/rgb; VACÍO o inválido →
  // color PREDEFINIDO FIJO de este visual (#7c3aed, no cambia cada vez)
  const color = parseColor(config.colorTarjeta) || COLOR_DEFECTO;

  const items = normalizarItems(config.palabras);
  const titulo = String(config.titulo || "").trim() || "Vocabulario";

  inyectarEstilos();

  const caja = document.createElement("div");
  caja.className = "cvv-caja";
  caja.setAttribute("role", "region");
  caja.setAttribute("aria-label", "Cuadrícula de vocabulario");
  caja.style.setProperty("--cvv-c", `rgb(${color.join(",")})`);
  caja.style.setProperty("--cvv-oscuro", tono(color, -0.25));
  caja.style.setProperty("--cvv-claro", tono(color, 0.92));
  caja.style.setProperty("--cvv-borde", tono(color, 0.55));

  const envolturaTitulo = document.createElement("div");
  envolturaTitulo.className = "cvv-cab";

  const icono = document.createElement("span");
  icono.className = "cvv-icono";
  icono.innerHTML = SVG_CUADRICULA;

  const tituloEl = document.createElement("h3");
  tituloEl.className = "cvv-titulo";
  // el texto va dentro de un span: el CSS decora ESE span con el color
  const tituloMarca = document.createElement("span");
  aplicarFormato(tituloMarca, titulo);
  tituloEl.appendChild(tituloMarca);

  const chip = document.createElement("span");
  chip.className = "cvv-chip";
  chip.textContent =
    items.length + (items.length === 1 ? " tarjeta · " : " tarjetas · ") +
    col + (col === 1 ? " columna" : " columnas");

  envolturaTitulo.append(icono, tituloEl, chip);

  const grid = document.createElement("div");
  grid.className = "cvv-grid";
  // EXACTAMENTE las columnas pedidas (1–5)
  grid.style.setProperty("grid-template-columns", `repeat(${col}, minmax(0, 1fr))`);
  // lado de la imagen cuadrada según la cuadrícula (tarjetas anchas)
  grid.style.setProperty("--cvv-img-lado", col === 1 ? "132px" : "104px");

  if (!items.length) {
    const vacio = document.createElement("div");
    vacio.className = "cvv-vacio";
    vacio.textContent = "Aún no hay palabras en esta cuadrícula.";
    grid.appendChild(vacio);
  }

  for (const item of items) {
    const tarjeta = document.createElement("article");
    tarjeta.className =
      "cvv-tarjeta " + (col <= 2 ? "ancha" : "compacta");

    // imagen (opcional): link/URL/PNG/data: o código SVG, SIEMPRE cuadrada
    const img = resolverImagen(item.imagen);
    if (img) {
      const recuadro = document.createElement("div");
      recuadro.className = "cvv-img";
      recuadro.dataset.letra = (item.termino[0] || "?").toUpperCase();
      if (img.svg) {
        recuadro.innerHTML = img.svg;               // SVG pegado tal cual
        recuadro.setAttribute("role", "img");
      } else {
        const foto = document.createElement("img");
        foto.src = img.url;
        foto.alt = item.termino;
        foto.loading = "lazy";
        foto.addEventListener("error", () => {
          recuadro.classList.add("cvv-mala");       // inicial del término
          foto.remove();
        });
        recuadro.appendChild(foto);
      }
      tarjeta.appendChild(recuadro);
    }

    if (col <= 2) {
      // ANCHA: imagen · término → traducción en la MISMA línea · descripción debajo
      const cuerpo = document.createElement("div");
      cuerpo.className = "cvv-cuerpo";

      const linea = document.createElement("div");
      linea.className = "cvv-linea";

      const termino = document.createElement("span");
      termino.className = "cvv-termino";
      aplicarFormato(termino, item.termino);

      linea.appendChild(termino);

      const traduccion = String(item.traduccion || "").trim();
      if (traduccion) {
        const flecha = document.createElement("span");
        flecha.className = "cvv-flecha";
        flecha.innerHTML = SVG_FLECHA;
        flecha.title = "traducción";
        const trad = document.createElement("span");
        trad.className = "cvv-traduccion";
        aplicarFormato(trad, traduccion);
        linea.append(flecha, trad);
      }
      cuerpo.appendChild(linea);

      const desc = String(item.descripcion || "").trim();
      if (desc) {
        const p = document.createElement("p");
        p.className = "cvv-desc";
        p.style.margin = "0";
        aplicarFormato(p, desc);
        cuerpo.appendChild(p);
      }
      tarjeta.appendChild(cuerpo);
    } else {
      // COMPACTA: imagen arriba · término · traducción · descripción al fondo
      const termino = document.createElement("div");
      termino.className = "cvv-termino";
      aplicarFormato(termino, item.termino);
      tarjeta.appendChild(termino);

      const traduccion = String(item.traduccion || "").trim();
      if (traduccion) {
        const trad = document.createElement("div");
        trad.className = "cvv-traduccion";
        aplicarFormato(trad, traduccion);
        tarjeta.appendChild(trad);
      }

      const desc = String(item.descripcion || "").trim();
      if (desc) {
        const p = document.createElement("p");
        p.className = "cvv-desc";
        p.style.margin = "0";
        aplicarFormato(p, desc);
        tarjeta.appendChild(p);
      }
    }

    grid.appendChild(tarjeta);
  }

  caja.append(envolturaTitulo, grid);

  // ¿Dónde vive? — con contenedor: dentro de él; sin contenedor:
  // centrada en el <body> (como el resto de utils del proyecto).
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
    caja.destruir = () => { caja.remove(); fuera.remove(); };
    return caja;
  }

  caja.destruir = () => caja.remove();
  return caja;
}