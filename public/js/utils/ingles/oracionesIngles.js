// ============================================================
// ingles/oracionesIngles.js — Util: REVISOR DE ORACIONES
// (js/utils/ingles/oracionesIngles.js)   ·   v2
//
// Herramienta interactiva para ENSEÑAR Y EVALUAR REDACCIÓN en
// inglés (y también en español), con revisión en DOS INTENTOS,
// ESTRUCTURA ESPERADA validada por el corrector y puntaje
// repartido en partes iguales. Tarjeta COLORIDA (color
// configurable con degradado, no papel crema) con áreas de
// escritura con renglones y marcas de corrección tipo corrector.
//
// ─── FUNCIONAMIENTO ───
//   · INTENTO 1: el estudiante escribe las oraciones y presiona
//     «Enviar / Check». Se revisan ortografía, gramática,
//     ESTRUCTURA y la estructura esperada. Cada fragmento con
//     error se marca en ROJO brillante y, al pasar el mouse o al
//     tocarlo, muestra una explicación clara («Spelling error:
//     Did you mean 'thought'?», «Grammar error: subject–verb
//     agreement…», «Structure: the sentence must be in Past
//     Simple…»). Las oraciones totalmente correctas se APRUEBAN
//     en verde y quedan congeladas; se indica que queda 1 intento.
//   · INTENTO 2: el estudiante corrige las oraciones marcadas
//     (los campos siguen editables) y presiona «Revisar
//     Correcciones». Reevaluación final.
//   · PUNTAJE EQUITATIVO: Puntaje_Oración = Puntaje_Total /
//     Cantidad_Inputs. Cada oración obtiene su puntaje completo
//     SOLO si queda sin errores al finalizar; panel final con el
//     total obtenido y el desglose por oración.
//
// ─── ESTRUCTURA ESPERADA (estructuraEsperada) ───
//   El docente escribe el tiempo gramatical y/o el patrón que el
//   estudiante DEBE respetar; el corrector lo valida para que el
//   estudiante no escriba lo que quiera. Ejemplos válidos:
//     «Past Simple»                                 → revisa el tiempo.
//     «subject + verb + adverb of frequency»        → revisa el patrón.
//     «Present Simple» combinado con un patrón como
//     «subject + verb + object + time expression»   → revisa ambos.
//   El corrector detecta el tiempo de la oración (Past/Present
//   Simple, Continuous, Perfect, will, going to; en español:
//   presente, pretérito, imperfecto, futuro, continuo) y la
//   presencia/posición de cada parte (sujeto, verbo, adverbio de
//   frecuencia —va entre el sujeto y el verbo, o después de
//   «be»—, objeto, adjetivo, expresión de tiempo…). Si falta una
//   parte o está mal ubicada, marca el fragmento y explica qué
//   corregir. Funciona igual con los nombres en inglés o en
//   español («Past Simple» o «pasado simple»).
//
// ─── REVISOR ───
//   · LOCAL (siempre disponible, sin red): diccionario de
//     ortografía frecuente (teh→the, recieve→receive, dont→don't,
//     goed→went… y en español tambien→también, aver→a ver,
//     haiga→haya…), reglas de gramática (concordancia sujeto-verbo,
//     did+pasado, a/an, sustantivos incontables, palabras
//     repetidas; en español yo eres→yo soy, habían muchas→había…),
//     mayúscula inicial, punto final, oración completa y las
//     comprobaciones de estructuraEsperada.
//   · API EXTERNA (usarApiExterna: true): LanguageTool gratuito
//     (https://api.languagetool.org/v2/check). Se envía UNA
//     petición por intento con todas las oraciones juntas y los
//     resultados se reparten por oración. Si la API falla, se
//     avisa y se repliega al revisor local. Las comprobaciones de
//     estructura y estructuraEsperada SIEMPRE se suman.
//
// ─── PARÁMETROS (objeto config) ───
//   indicacion         Texto con la instrucción de la actividad
//                      (ej. «Write 3 sentences in Past Simple.»).
//   cantidadInputs     Número de oraciones (1–50), cada una con
//                      su campo de texto.
//   puntajeTotal       Nota total de la actividad (ej. 10), que
//                      se reparte en partes iguales.
//   estructuraEsperada (opcional) tiempo gramatical y/o patrón
//                      con «+» (ej. «Past Simple» o «subject +
//                      verb + adverb of frequency») que el
//                      corrector exige en cada oración. Vacío →
//                      solo ortografía/gramática/estructura base.
//   usarApiExterna     true → usa la API gratuita de LanguageTool
//                      (en-US o es según idioma). false/ausente →
//                      solo revisor local.
//   idioma             «en» (defecto) o «es»: el idioma que se
//                      evalúa. La interfaz y los mensajes del
//                      revisor se adaptan.
//   colorTarjeta       (opcional) color de la tarjeta en HEX o
//                      rgb() (ej. «#0ea5e9»). Defecto: #7c3aed.
//                      REGLA DEL PROYECTO: en adelante TODOS los
//                      utils y visuales aceptan este parámetro.
//   contenedor         HTMLElement o selector: la actividad se
//                      agrega ahí (así la usan el editor «Crear»
//                      y las clases). Sin contenedor se muestra
//                      centrada directamente en el <body>.
//
// ─── DEVUELVE ───
//   El elemento .roi-escena (con .destruir() para quitarla).
//   Si la configuración es inválida, devuelve una escena con una
//   tarjeta de error explicativa (nunca una pantalla vacía).
//
// USO DESDE UNA CLASE (contenido):
//   import { generarRevisorOraciones } from "../../../js/utils/ingles/oracionesIngles.js";
//
//   generarRevisorOraciones({ contenedor: zona, indicacion: "Write 3 sentences in Past Simple.", cantidadInputs: 3, puntajeTotal: 10, estructuraEsperada: "subject + verb + adverb of frequency" });
//   generarRevisorOraciones({ contenedor: zona, idioma: "es", indicacion: "Escribe 3 oraciones en pasado.", cantidadInputs: 3, puntajeTotal: 6, estructuraEsperada: "pasado simple", usarApiExterna: true, colorTarjeta: "#0ea5e9" });
// ============================================================

/* ---------------- CSS implícito (inyectado UNA sola vez) ---------------- */

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "utils-oraciones-ingles-estilos";
  estilo.textContent = `
    /* Envoltura para mostrar la actividad CENTRADA en el <body> */
    .roi-caja {
      display: flex; justify-content: center; align-items: flex-start;
      width: 100%; min-height: 100vh; min-height: 100svh;
      padding: 26px 12px; box-sizing: border-box;
    }
    /* Tarjeta COLORIDA: los tonos se pasan con variables CSS
       (colorTarjeta) sobre la escena; aquí van los defectos. */
    .roi-escena {
      --roi-c: #7c3aed;
      --roi-oscuro: #5b21b6;
      --roi-mas-oscuro: #46178f;
      --roi-claro: #f3ecfe;
      --roi-borde: #ddd0f7;
      --roi-cab-texto: #ffffff;
      --roi-sombra: rgba(96, 53, 176, .30);
      width: 100%; max-width: 760px; margin: 0 auto;
      font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937;
    }
    .roi-escena *, .roi-escena *::before, .roi-escena *::after {
      box-sizing: border-box; margin: 0; padding: 0; font-family: inherit;
    }

    /* ── Tarjeta ── */
    .roi-hoja {
      position: relative; background: #ffffff; border-radius: 18px;
      border: 1px solid var(--roi-borde);
      box-shadow: 0 20px 44px var(--roi-sombra), 0 3px 8px rgba(30,41,59,.06);
      overflow: hidden;
    }

    /* ── Cabecera con degradado del color de la tarjeta ── */
    .roi-cab {
      position: relative; overflow: hidden;
      display: flex; flex-wrap: wrap; gap: 10px 16px;
      align-items: flex-start; justify-content: space-between;
      padding: 19px 24px 17px;
      background: linear-gradient(135deg, var(--roi-mas-oscuro) 0%, var(--roi-oscuro) 45%, var(--roi-c) 100%);
      color: var(--roi-cab-texto);
    }
    .roi-cab::after {
      content: ""; position: absolute; right: -46px; top: -70px;
      width: 170px; height: 170px; border-radius: 50%;
      background: rgba(255,255,255,.09); pointer-events: none;
    }
    .roi-cab::before {
      content: ""; position: absolute; right: 60px; bottom: -84px;
      width: 130px; height: 130px; border-radius: 50%;
      background: rgba(255,255,255,.06); pointer-events: none;
    }
    .roi-rotulo {
      display: block; font-size: 11px; font-weight: 700; letter-spacing: .16em;
      text-transform: uppercase; color: var(--roi-cab-texto); opacity: .82; margin-bottom: 5px;
    }
    .roi-indicacion {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 20px; line-height: 1.35; color: var(--roi-cab-texto);
      font-weight: 700; max-width: 46ch; position: relative; z-index: 1;
    }
    .roi-chips { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; position: relative; z-index: 1; }
    .roi-intento {
      display: inline-block; padding: 5px 12px; border-radius: 999px;
      border: 1.5px solid rgba(255,255,255,.5); background: rgba(255,255,255,.17);
      color: var(--roi-cab-texto);
      font-size: 12.5px; font-weight: 700; letter-spacing: .02em; white-space: nowrap;
    }
    .roi-valor { font-size: 12px; color: var(--roi-cab-texto); opacity: .88; white-space: nowrap; }

    /* ── Cuerpo ── */
    .roi-cuerpo { padding: 18px 24px 22px; }

    /* Franja de la estructura esperada */
    .roi-estructura {
      display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 8px;
      border: 1.5px dashed var(--roi-c); background: var(--roi-claro);
      color: var(--roi-mas-oscuro); border-radius: 11px;
      padding: 9px 13px; margin-bottom: 14px; font-size: 13px; font-weight: 600;
    }
    .roi-estructura b {
      font-family: Georgia, "Times New Roman", serif; font-weight: 700;
      font-size: 14.5px; letter-spacing: .01em;
    }

    /* ── Oraciones ── */
    .roi-oraciones { position: relative; display: flex; flex-direction: column; gap: 13px; }
    .roi-oracion {
      position: relative; border: 1px solid var(--roi-borde); border-radius: 12px;
      background: #ffffff; padding: 10px 14px 12px;
      box-shadow: 0 1px 3px rgba(30,41,59,.05);
      transition: border-color .2s, background .2s;
    }
    .roi-oracion--aprobada { border-color: #a7f3d0; background: #f4fdf7; }
    .roi-oracion--erronea  { border-color: #fecaca; background: #fffafa; }
    .roi-oracion-cab { display: flex; align-items: center; gap: 9px; margin-bottom: 7px; }
    .roi-num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 50%; flex: none;
      background: var(--roi-c); color: #fff; font-size: 12.5px; font-weight: 700;
    }
    .roi-oracion--aprobada .roi-num { background: #16a34a; }
    .roi-oracion--erronea  .roi-num { background: #e11d48; }
    .roi-estado {
      display: inline-block; font-size: 10.8px; font-weight: 700;
      letter-spacing: .08em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
    }
    .roi-estado--pendiente { color: #6b7280; border: 1px solid #d1d5db; background: #f9fafb; }
    .roi-estado--aprobada  { color: #15803d; border: 1px solid #86efac; background: #dcfce7; }
    .roi-estado--errores   { color: #b91c1c; border: 1px solid #fca5a5; background: #fee2e2; }
    .roi-puntos { margin-left: auto; font-size: 12px; color: #9ca3af; font-weight: 600; }

    /* Campo de escritura con renglones */
    .roi-entrada {
      display: block; width: 100%; border: none; outline: none;
      border-bottom: 1.5px dashed #cbd5e1; border-radius: 6px 6px 0 0;
      background: repeating-linear-gradient(transparent 0 29px, #dde8f5 29px 30px);
      background-attachment: local; line-height: 30px; min-height: 60px;
      padding: 0 9px; font-family: Georgia, "Times New Roman", serif;
      font-size: 16px; color: #1f2937; resize: vertical;
    }
    .roi-entrada:focus { border-bottom-color: var(--roi-c); }
    .roi-entrada[readonly] { color: #166534; cursor: default; }
    .roi-oracion--aprobada .roi-entrada { background-color: rgba(220,252,231,.4); }
    .roi-oracion--erronea  .roi-entrada { background-color: rgba(254,226,226,.3); }

    /* Área de revisión con marcas */
    .roi-revision {
      margin-top: 9px; background: #fbfaff; border: 1px dashed var(--roi-borde);
      border-left: 3px solid #e11d48; border-radius: 9px; padding: 9px 13px 8px;
      font-size: 15px; line-height: 2;
    }
    .roi-revision--ok { border-left-color: #16a34a; background: #f6fef8; }
    .roi-revision-txt { font-family: Georgia, "Times New Roman", serif; font-size: 15.5px; }
    .roi-revision-pie { margin-top: 5px; font-size: 12px; }
    .roi-revision--mal .roi-revision-pie { color: #b91c1c; }
    .roi-revision--ok  .roi-revision-pie { color: #15803d; }

    /* Marca de error en ROJO brillante + tooltip de explicación */
    .roi-marca {
      position: relative; color: #e11d48; font-weight: 700;
      background: #fef2f2; border-radius: 3px; padding: 0 2px;
      text-decoration: underline wavy #e11d48 1.5px; text-underline-offset: 3px;
      cursor: help; outline: none;
    }
    .roi-marca:hover, .roi-marca:focus-visible, .roi-marca.abierta { background: #fee2e2; }
    .roi-tip {
      position: absolute; bottom: calc(100% + 10px); left: 50%;
      transform: translate(-50%, 4px);
      width: max-content; max-width: 250px;
      background: #111827; color: #f9fafb;
      font-size: 12.3px; font-weight: 400; line-height: 1.5; text-align: left;
      text-decoration: none; padding: 9px 12px; border-radius: 9px;
      border: 1px solid rgba(255,255,255,.09);
      box-shadow: 0 12px 28px rgba(17,24,39,.35);
      opacity: 0; visibility: hidden; pointer-events: none;
      transition: opacity .16s ease, transform .16s ease, visibility .16s;
      z-index: 60;
    }
    .roi-tip::after {
      content: ""; position: absolute; top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent; border-top-color: #111827;
    }
    .roi-marca:hover .roi-tip,
    .roi-marca:focus-visible .roi-tip,
    .roi-marca.abierta .roi-tip {
      opacity: 1; visibility: visible; transform: translate(-50%, 0);
    }
    .roi-tip b { display: block; color: #fca5a5; font-size: 12.5px; letter-spacing: .02em; }
    .roi-tip-sug { display: block; margin-top: 3px; color: #86efac; font-weight: 600; }
    .roi-tip i { display: block; margin-top: 3px; font-style: normal; opacity: .72; font-size: 11.4px; }

    /* Avisos */
    .roi-aviso {
      position: relative; margin-top: 14px; padding: 10px 14px; border-radius: 9px;
      border-left: 3px solid var(--roi-c); background: var(--roi-claro); color: var(--roi-mas-oscuro);
      font-size: 13.5px; line-height: 1.55;
    }
    .roi-aviso--alerta { border-left-color: #d97706; background: #fffbeb; color: #92400e; }

    /* Pie con botón */
    .roi-pie {
      position: relative; display: flex; flex-wrap: wrap; align-items: center;
      gap: 12px; margin-top: 16px;
    }
    .roi-boton {
      appearance: none; border: none; cursor: pointer;
      background: linear-gradient(180deg, var(--roi-c), var(--roi-oscuro)); color: #fff;
      font-size: 14.5px; font-weight: 700; letter-spacing: .01em;
      padding: 11px 24px; border-radius: 999px;
      box-shadow: 0 6px 16px var(--roi-sombra), inset 0 1px 0 rgba(255,255,255,.22);
      transition: transform .12s, box-shadow .12s;
    }
    .roi-boton:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 9px 20px var(--roi-sombra), inset 0 1px 0 rgba(255,255,255,.22);
    }
    .roi-boton:active:not(:disabled) { transform: translateY(0); }
    .roi-boton:disabled { opacity: .6; cursor: progress; }
    .roi-pista { font-size: 12.5px; font-style: italic; color: #9ca3af; }

    /* Panel final de puntajes */
    .roi-final {
      position: relative; margin-top: 16px; border: 2px solid var(--roi-c); border-radius: 14px;
      background: linear-gradient(180deg, var(--roi-claro), #ffffff 62%);
      padding: 16px 18px 14px; box-shadow: 0 10px 24px var(--roi-sombra);
    }
    .roi-final-titulo {
      font-size: 11px; font-weight: 800; letter-spacing: .16em;
      text-transform: uppercase; color: var(--roi-oscuro); margin-bottom: 6px;
    }
    .roi-final-total { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
    .roi-final-num {
      font-size: 40px; font-weight: 800; color: var(--roi-oscuro);
      font-family: Georgia, "Times New Roman", serif; line-height: 1;
    }
    .roi-final-de { font-size: 15px; color: #6b7280; font-weight: 600; }
    .roi-final-desglose { list-style: none; display: flex; flex-direction: column; }
    .roi-final-fila {
      display: flex; align-items: center; gap: 10px; padding: 7px 2px;
      border-top: 1px dashed #e5e7eb; font-size: 13.5px;
    }
    .roi-final-fila:first-child { border-top: none; }
    .roi-final-n {
      flex: none; display: inline-flex; align-items: center; justify-content: center;
      width: 21px; height: 21px; border-radius: 50%; background: #e5e7eb;
      color: #374151; font-size: 11.5px; font-weight: 700;
    }
    .roi-final-fila.ok  .roi-final-n { background: #dcfce7; color: #15803d; }
    .roi-final-fila.mal .roi-final-n { background: #fee2e2; color: #b91c1c; }
    .roi-final-frag {
      flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-family: Georgia, "Times New Roman", serif; font-style: italic; color: #4b5563;
    }
    .roi-final-p { flex: none; font-weight: 700; color: #374151; font-variant-numeric: tabular-nums; }
    .roi-final-fila.mal .roi-final-p { color: #b91c1c; }
    .roi-final-fila .roi-estado { flex: none; }
    .roi-final-mensaje {
      margin-top: 10px; font-size: 13px; color: #374151;
      border-top: 1px solid #e5e7eb; padding-top: 9px;
    }

    /* Tarjeta de error de configuración */
    .roi-error {
      border: 2px solid #e11d48; border-radius: 14px; background: #fff1f2;
      padding: 18px 20px; color: #9f1239; font-size: 14px; line-height: 1.55;
    }
    .roi-error b { display: block; font-size: 15px; margin-bottom: 4px; }

    @media (max-width: 560px) {
      .roi-cab { padding: 16px 16px 15px; }
      .roi-cuerpo { padding: 16px 14px 20px; }
      .roi-indicacion { font-size: 18px; }
      .roi-chips { align-items: flex-start; }
      .roi-final-fila { flex-wrap: wrap; }
    }
  `;
  document.head.appendChild(estilo);
}

/* ---------------- helpers ---------------- */

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* número legible: 3.3333… → «3.33», 10 → «10» */
const fmt = (n) => String(Math.round(n * 100) / 100);

const recorte = (t, n) => (t.length > n ? t.slice(0, n).trimEnd() + "…" : t);

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ============================================================
   COLOR DE LA TARJETA (colorTarjeta)
   Acepta HEX (#7c3aed, #0e5) o rgb()/rgba(). Deriva los tonos
   (oscuro, claro, borde, sombra y texto de cabecera) y se aplica
   con variables CSS sobre la escena. REGLA DEL PROYECTO: en
   adelante todos los utils y visuales aceptan colorTarjeta.
   ============================================================ */

const COLOR_DEFECTO = "#7c3aed";

function parseColor(valor) {
  const v = String(valor == null ? "" : valor).trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) {
    const [a, b, c] = m[1];
    return { r: parseInt(a + a, 16), g: parseInt(b + b, 16), b: parseInt(c + c, 16) };
  }
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) {
    return {
      r: parseInt(m[1].slice(0, 2), 16),
      g: parseInt(m[1].slice(2, 4), 16),
      b: parseInt(m[1].slice(4, 6), 16),
    };
  }
  m = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/.exec(v);
  if (m) return { r: Math.min(255, +m[1]), g: Math.min(255, +m[2]), b: Math.min(255, +m[3]) };
  return null;
}

const hex2 = (n) => ("0" + Math.round(Math.max(0, Math.min(255, n))).toString(16)).slice(-2);

function mezclar(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/* texto blanco o casi negro según la luminancia del color base */
function luminancia(c) {
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
}

function derivarTonos(color) {
  const base = parseColor(color) || parseColor(COLOR_DEFECTO);
  const oscuro = mezclar(base, { r: 24, g: 16, b: 40 }, 0.24);
  const masOscuro = mezclar(base, { r: 24, g: 16, b: 40 }, 0.42);
  const claro = mezclar(base, { r: 255, g: 255, b: 255 }, 0.89);
  const borde = mezclar(base, { r: 255, g: 255, b: 255 }, 0.72);
  const sombraBase = mezclar(base, { r: 24, g: 16, b: 40 }, 0.35);
  const hexDe = (c) => "#" + hex2(c.r) + hex2(c.g) + hex2(c.b);
  return {
    base: hexDe(base),
    oscuro: hexDe(oscuro),
    masOscuro: hexDe(masOscuro),
    claro: hexDe(claro),
    borde: hexDe(borde),
    cabTexto: luminancia(base) > 0.62 ? "#1f2937" : "#ffffff",
    sombra: "rgba(" + Math.round(sombraBase.r) + "," + Math.round(sombraBase.g) + "," + Math.round(sombraBase.b) + ",.30)",
  };
}

/* ============================================================
   ESTRUCTURA ESPERADA — PARSEO del texto del docente
   «Past Simple» · «subject + verb + adverb of frequency» ·
   «pasado simple» · «subject + verb + object + time expression»
   ============================================================ */

const norm = (s) =>
  String(s == null ? "" : s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/* Alias de tiempos gramaticales → clave interna.
   Se buscan por longitud DESCENDENTE para que «past continuous»
   gane sobre «past», «present perfect» sobre «present»… */
const TIEMPOS = {
  "past simple": "pasado",
  "simple past": "pasado",
  "pasado simple": "pasado",
  "preterito indefinido": "pasado",
  "past continuous": "pasado continuo",
  "past progressive": "pasado continuo",
  "pasado continuo": "pasado continuo",
  "present perfect": "perfecto",
  "presente perfecto": "perfecto",
  "preterito perfecto compuesto": "perfecto",
  "present continuous": "continuo",
  "present progressive": "continuo",
  "presente continuo": "continuo",
  "presente progresivo": "continuo",
  "present simple": "presente",
  "simple present": "presente",
  "presente simple": "presente",
  "future with will": "futuro",
  "future simple": "futuro",
  "be going to": "going to",
  "pasado": "pasado",
  "preterito": "pasado",
  "presente": "presente",
  "perfecto": "perfecto",
  "continuo": "continuo",
  "futuro": "futuro",
  "future": "futuro",
  "will": "futuro",
  "going to": "going to",
  "imperfecto": "imperfecto",
  "past": "pasado",
  "present": "presente",
};

const NOMBRE_TIEMPO = {
  "pasado": { en: "Past Simple", es: "pasado simple (pretérito)" },
  "presente": { en: "Present Simple", es: "presente simple" },
  "continuo": { en: "Present Continuous", es: "presente continuo" },
  "pasado continuo": { en: "Past Continuous", es: "pasado continuo" },
  "perfecto": { en: "Present Perfect", es: "presente perfecto" },
  "futuro": { en: "Future (will)", es: "futuro (will)" },
  "going to": { en: "be going to", es: "futuro con «going to»" },
  "imperfecto": { en: "Imperfect", es: "pretérito imperfecto" },
};

const ALIAS_TIEMPOS = Object.keys(TIEMPOS).sort((a, b) => b.length - a.length);

/* Partes del patrón (separadas por «+») → clave canónica */
const COMPONENTES = [
  { clave: "sujeto", re: /^(sujeto|subject|persona)$/ },
  { clave: "verbo", re: /^(verbo|verb)$/ },
  { clave: "adverbioFrecuencia", re: /^(adverb of frequency|adverbios of frecuencia|adverbios de frecuencia|adverbio de frecuencia|frequency adverb|frecuencia)$/ },
  { clave: "objeto", re: /^(objeto|object|objeto directo|direct object)$/ },
  { clave: "complemento", re: /^(complemento|complement|informacion extra|detalle)$/ },
  { clave: "adjetivo", re: /^(adjetivo|adjective)$/ },
  { clave: "expresionTiempo", re: /^(time expression|expresion de tiempo|expresiones de tiempo|tiempo)$/ },
  { clave: "lugar", re: /^(lugar|place)$/ },
];

function parsearEstructura(estructura) {
  const cruda = String(estructura == null ? "" : estructura).trim();
  if (!cruda) return null;
  const n = norm(cruda);

  /* 1 · tiempo gramatical dentro del texto */
  let tiempo = null;
  for (const alias of ALIAS_TIEMPOS) {
    if (new RegExp("(^|[^a-z0-9])" + escapeRe(alias) + "([^a-z0-9]|$)").test(n)) {
      tiempo = TIEMPOS[alias];
      break;
    }
  }

  /* 2 · partes del patrón; una parte que nombra un tiempo no es
     componente (ej. el «Past Simple» de «Past Simple + subject») */
  const partes = [];
  for (const pedazo of cruda.split("+")) {
    const limpio = pedazo.trim();
    if (!limpio) continue;
    const nl = norm(limpio);
    if (ALIAS_TIEMPOS.some((alias) =>
      new RegExp("(^|[^a-z0-9])" + escapeRe(alias) + "([^a-z0-9]|$)").test(nl))) {
      if (!tiempo) tiempo = TIEMPOS[ALIAS_TIEMPOS.find((alias) =>
        new RegExp("(^|[^a-z0-9])" + escapeRe(alias) + "([^a-z0-9]|$)").test(nl))];
      continue;
    }
    const comp = COMPONENTES.find((c) => c.re.test(nl));
    partes.push({ clave: comp ? comp.clave : "complemento", etiqueta: limpio });
  }

  if (!tiempo && !partes.length) return null;
  return { tiempo, partes, cruda };
}

/* Tokens con su posición real en el texto (para marcar en rojo) */
const tokensDe = (t) => {
  const out = [];
  const re = /[\p{L}\p{N}'’]+/gu;
  let m;
  while ((m = re.exec(t))) out.push({ w: m[0], i: m.index });
  return out;
};

/* ============================================================
   ESTRUCTURA ESPERADA — DETECCIÓN DEL TIEMPO (inglés)
   Devuelve { tiempo, vi, verbo } (vi = índice del token del
   verbo/auxiliar; -1 si no hay verbo detectable).
   ============================================================ */

const VERBOS_EN = new Set(("go do have come make take eat live play work want need like watch study carry try fly read write " +
  "speak walk run drive help love hate drink sleep open close clean cook dance draw sing swim teach learn buy sell send " +
  "call ask answer listen look start stop visit travel say think know see find get give tell become leave feel keep hold " +
  "bring sit stand lose pay meet continue set change lead understand follow talk rest arrive move stay wait ride walk " +
  "swim jump climb paint play rain snow shine happen enjoy decide plan hope wish dream mean allow borrow prefer prepare " +
  "invite accept add admit afford agree argue arrive avoid bake behave belong brush calculate celebrate check clean comb " +
  "complain confuse count cover crash cry deliver deny disappear discover divide earn elect encourage enter escape " +
  "examine excite exercise exist expand experience explain express fill finish fit fix flash float fold greet guess " +
  "handle hang happen hate heal hire hug identify imagine intend introduce invent jog join judge kick kick kneel knock " +
  "land laugh lift light lock long mail manage march mend mention mind mix mow nail need notice obtain occupy offer " +
  "order organize overflow pack paint pass perform pick pinch plant point pour practice pray prefer press prevent " +
  "print produce promise pronounce protect provide publish pull punch punish push puzzle race radiate rain raise reach " +
  "realize receive recognize reduce reflect refuse regard regret relax remain remind remove repair repeat reply report " +
  "rescue retire return ring rinse rise rob rock roll rot rub ruin rule rush sail satisfy scatter score scrub seal " +
  "select sense serve shade shake shave shine shop shock sigh sign simplify sin sketch ski skip slam slip smell smile " +
  "smoke snatch sneeze sniff sob solve sound spill spin spoil spray squeeze stain stamp stare steam step stir sting " +
  "stir stretch strike stroll stutter suck sue surface swallow swear sweat sweep swell swim swing take talk taste " +
  "tease telephone tempt thank thaw think throw tick tie time toss touch tour tow trace travel treat trim trip trust " +
  "tumble turn twist type undo urge use vanish vary visit wail wander warn water wave weigh whip whisper whistle wink " +
  "wipe wish wonder work worry wrap wreck yawn yell yield").split(/\s+/));

const PAST_EN = new Set("went was were came saw ate took made wrote bought brought had got gave said thought found knew ran sang drank swam spoke slept taught caught did met put read told felt left kept held stood understood sat lost paid sent built began broke chose drove fell flew grew heard led rode rose shook shot shut stole wore won cut hit let cost beat bit meant drew grew froze rode spilled".split(/\s+/));

const PART_EN = new Set("gone done seen eaten taken made written bought brought given said thought found known run sung drunk swum spoken slept taught caught met put read told felt left kept held understood sat lost paid sent built begun broken chosen driven fallen flown grown heard led ridden risen shaken shot shut stolen worn won cut hit let cost beaten been gotten meant drawn frozen rode".split(/\s+/));

const BE_FORMS = new Set(["am", "is", "are", "was", "were"]);

/* tercera persona: goes→go, does→do, watches→watch, studies→study,
   has→have, is→be (null si no es forma de 3ª persona de un verbo) */
function baseTerceraEN(w) {
  if (w === "has") return "have";
  if (w === "is") return "be";
  if (/ies$/.test(w) && VERBOS_EN.has(w.slice(0, -3) + "y")) return w.slice(0, -3) + "y";
  if (/oes$/.test(w) && VERBOS_EN.has(w.slice(0, -2))) return w.slice(0, -2);
  if (/es$/.test(w) && VERBOS_EN.has(w.slice(0, -2))) return w.slice(0, -2);
  if (/s$/.test(w) && VERBOS_EN.has(w.slice(0, -1))) return w.slice(0, -1);
  return null;
}

function detectarTiempoEN(tok) {
  const WL = tok.map((x) => x.w.toLowerCase().replace(/’/g, "'"));
  const esVerb = (w) =>
    VERBOS_EN.has(w) || PAST_EN.has(w) || PART_EN.has(w) ||
    (/(ed|ing)$/.test(w) && w.length >= 4) ||
    !!baseTerceraEN(w);

  let vi = -1;
  for (let k = 0; k < WL.length; k++) {
    const w = WL[k];
    const esBe = BE_FORMS.has(w) || /'(s|m|re)$/.test(w);
    const esAux = w === "will" || w === "have" || w === "has" || w === "had";
    if (esBe || esAux || esVerb(w)) { vi = k; break; }
  }
  if (vi < 0) return { tiempo: null, vi: -1, verbo: "" };

  const w = WL[vi];
  const sig = WL[vi + 1] || "";
  if (w === "will") return { tiempo: "futuro", vi, verbo: sig };
  const esBe = BE_FORMS.has(w) || /'(s|m|re)$/.test(w);
  if (esBe) {
    if (/(ing)$/.test(sig) && sig.length > 4) {
      return { tiempo: (w === "was" || w === "were") ? "pasado continuo" : "continuo", vi, verbo: sig };
    }
    if (sig === "going") return { tiempo: "going to", vi, verbo: sig };
    return { tiempo: (w === "was" || w === "were") ? "pasado" : "presente", vi, verbo: w };
  }
  if (w === "have" || w === "has") {
    if (PART_EN.has(sig) || (/ed$/.test(sig) && sig.length > 4)) {
      return { tiempo: "perfecto", vi, verbo: sig };
    }
    return { tiempo: "presente", vi, verbo: w };
  }
  if (PAST_EN.has(w)) return { tiempo: "pasado", vi, verbo: w };
  if (VERBOS_EN.has(w) || baseTerceraEN(w)) return { tiempo: "presente", vi, verbo: baseTerceraEN(w) || w };
  /* resto de -ed (incluye irregulares mal escritos como «goed») → pasado */
  if (/ed$/.test(w) && w.length >= 4) return { tiempo: "pasado", vi, verbo: w };
  return { tiempo: "presente", vi, verbo: w };
}

/* sugerencia de corrección de tiempo para el verbo detectado */
const PRES_A_PAST_EN = {
  go: "went", come: "came", see: "saw", eat: "ate", take: "took", make: "made",
  write: "wrote", buy: "bought", bring: "brought", have: "had", get: "got",
  give: "gave", say: "said", think: "thought", find: "found", know: "knew",
  run: "ran", sing: "sang", drink: "drank", swim: "swam", speak: "spoke",
  sleep: "slept", teach: "taught", catch: "caught", do: "did", read: "read",
  meet: "met", put: "put", tell: "told", feel: "felt", leave: "left",
  keep: "kept", hold: "held", stand: "stood", understand: "understood",
  sit: "sat", lose: "lost", pay: "paid", send: "sent", build: "built",
  begin: "began", break: "broke", choose: "chose", drive: "drove",
  fall: "fell", fly: "flew", grow: "grew", hear: "heard", lead: "led",
  ride: "rode", rise: "rose", shake: "shook", shoot: "shot", shut: "shut",
  steal: "stole", wear: "wore", win: "won", is: "was", are: "were", am: "was",
};
const PAST_A_BASE_EN = {
  went: "go", came: "come", saw: "see", ate: "eat", took: "take", made: "make",
  wrote: "write", bought: "buy", brought: "bring", had: "have", got: "get",
  gave: "give", said: "say", thought: "think", found: "find", knew: "know",
  ran: "run", sang: "sing", drank: "drink", swam: "swim", spoke: "speak",
  slept: "sleep", taught: "teach", caught: "catch", did: "do", met: "meet",
  told: "tell", felt: "feel", left: "leave", kept: "keep", held: "hold",
  stood: "stand", sat: "sit", lost: "lose", paid: "pay", sent: "send",
  built: "build", began: "begin", broke: "break", chose: "choose",
  drove: "drive", fell: "fall", flew: "fly", grew: "grow", heard: "hear",
  led: "lead", rode: "ride", rose: "rise", shook: "shake", shot: "shoot",
  stole: "steal", wore: "wear", won: "win", was: "be", were: "be",
};

function pasadoDe(base) {
  if (PRES_A_PAST_EN[base]) return PRES_A_PAST_EN[base];
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ied";
  if (/e$/.test(base)) return base + "d";
  return base + "ed";
}
function baseDe(pasado) {
  if (PAST_A_BASE_EN[pasado]) return PAST_A_BASE_EN[pasado];
  if (/ied$/.test(pasado)) return pasado.slice(0, -3) + "y";
  if (/eed$/.test(pasado)) return pasado.slice(0, -1);
  if (/ed$/.test(pasado)) return pasado.slice(0, -2);
  return "";
}

function sugerirTiempo(objetivo, verbo, es) {
  const v = String(verbo || "").toLowerCase().replace(/’/g, "'");
  const base = (/s$/.test(v) && VERBOS_EN.has(v.slice(0, -1))) ? v.slice(0, -1) : v;
  const linea = (x) => (es ? "Prueba con: «" + x + "»" : "Try: '" + x + "'");
  if (objetivo === "pasado") {
    /* ya termina en -ed (o es desconocido): no inventes formas raras */
    if (/ed$/.test(base) && !PRES_A_PAST_EN[base]) return "";
    const p = pasadoDe(base);
    if (p && p !== v) return linea(p);
    return "";
  }
  if (objetivo === "presente") {
    const b = baseDe(v);
    if (b && b !== v) return linea(b);
    return "";
  }
  if (objetivo === "continuo") return es ? "Usa am/is/are + verbo-ing." : "Use am/is/are + verb-ing.";
  if (objetivo === "pasado continuo") return es ? "Usa was/were + verbo-ing." : "Use was/were + verb-ing.";
  if (objetivo === "perfecto") return es ? "Usa have/has + participio." : "Use have/has + past participle.";
  if (objetivo === "futuro") return es ? "Usa will + verbo base." : "Use will + base verb.";
  if (objetivo === "going to") return es ? "Usa am/is/are going to + verbo base." : "Use am/is/are going to + base verb.";
  return "";
}

/* ============================================================
   ESTRUCTURA ESPERADA — DETECCIÓN DEL TIEMPO (español)
   ============================================================ */

const ES_PRESENTE = new Set(("soy eres es somos son estoy estas esta estamos estan tengo tienes tiene tienen hago haces hace " +
  "hacen voy vas va van veo ves ve ven salgo sales sale salen duermo duermes duerme duermen quiero quieres quiere " +
  "quieren puedo puedes puede pueden juego juegas juega juegan como comes come comen vivo vives vive viven leo lees " +
  "lee leen bebo bebes bebe beben estudio estudias estudia estudian trabajo trabajas trabaja trabajan miro miras mira " +
  "miran escribo escribes escribe escriben hablo hablas habla hablan camino caminas camina caminan escucho escuchas " +
  "escucha escuchan corro corres corre corren abro abres abre abren aprendo aprendes aprende aprenden comparto " +
  "compartes comparte comparten canto cantas canta cantan bailo bailas baila bailan cocino cocinas cocina cocinan " +
  "limpio limpias limpia limpian compro compras compra compran llego llegas llega llegan bebemos comemos vivimos " +
  "escribimos trabajamos estudiamos cantamos bailamos caminamos cocinamos limpiamos escuchamos hablamos miramos " +
  "dormimos salimos pedimos servimos desayuno desayunas desayuna desayunan almuerzo almuerzas almuerza almuerzan " +
  "ceno cenas cena cenan regreso regresas regresa regresan despierto despiertas despierta despiertan cepillo " +
  "cepillas cepilla cepillan meriendo meriendas merienda meriendan baño bañas baña bañan").split(/\s+/));

const ES_PASADO = new Set(("fui fuiste fue fuimos fueron estuve estuviste estuvo estuvieron tuve tuviste tuvo tuvieron hice " +
  "hiciste hizo hicieron dije dijo dijeron vine vino vinieron vi vio di dio quise quiso pude pudo puso anduvo supe " +
  "supo traje trajo comí comió comieron comimos caminé caminó caminaron caminamos canté cantó cantaron cantamos " +
  "bailé bailó bailaron bailamos trabajé trabajó trabajaron trabajamos estudié estudió estudiaron estudiamos viví " +
  "vivió vivieron vivimos escribí escribió escribieron escribimos leí leyó leyeron leimos bebí bebió bebieron bebimos " +
  "hablé habló hablaron hablamos miré miró miraron miramos compré compró compraron compramos cociné cocinó cocinaron " +
  "cocinamos limpié limpió limpiaron limpiamos escuché escuchó escucharon escuchamos aprendí aprendió aprendieron " +
  "aprendimos abrí abrió abrieron abrimos recibí recibió recibieron recibimos corrí corrió corrieron corrimos llegué " +
  "llegó llegaron llegamos dormí durmió durmieron dormimos jugué jugó jugaron jugamos").split(/\s+/));

const ES_FUTURO = new Set(("comeré comerás comerá comeremos comerán cantaré cantarás cantará cantaremos cantarán viviré " +
  "vivirás vivirá viviremos vivirán viajaré viajarás viajará viajaremos viajarán estudiaré estudiarás estudiará " +
  "estudiaremos estudiarán trabajaré trabajarás trabajará trabajaremos trabajarán escribiré escribirás escribirá " +
  "escribiremos escribirán leeré leerás leerá leeremos leerán seré serás será seremos serán estaré estarás estará " +
  "estaremos estarán tendré tendrás tendrá tendremos tendrán haré harás hará haremos harán iré irás irá iremos irán " +
  "podré podrás podrá podremos podrán sabré sabrás sabrá sabremos sabrán").split(/\s+/));

const ES_PASADO_RE = /(é|ó|aste|aron|iste|ió|imos|ieron)$/;
const ES_IMPERFECTO_RE = /(aba|abas|ábamos|aban|ía|ías|íamos|ían)$/;
const ES_FUTURO_RE = /(ré|rás|rá|remos|rán)$/;

function detectarTiempoES(tok) {
  const W = tok.map((x) => x.w.toLowerCase());

  /* perífrasis: «voy a + infinitivo» → futuro · «estoy + gerundio» → continuo */
  for (let k = 0; k < W.length; k++) {
    const w = W[k];
    if (/^(voy|vas|va|vamos|vais|van)$/.test(w)) {
      let j = k + 1;
      if (W[j] === "a") j++;                     /* «voy A estudiar» */
      const sig = W[j] || "";
      if (/(ar|er|ir)$/.test(sig) && sig.length > 3) return { tiempo: "futuro", vi: k, verbo: sig };
    }
    if (/^(estoy|estas|esta|estamos|estan)$/.test(w)) {
      const sig = W[k + 1] || "";
      if (/(ando|endo)$/.test(sig)) return { tiempo: "continuo", vi: k, verbo: sig };
    }
  }

  const esVerbES = (w) =>
    ES_PRESENTE.has(w) || ES_PASADO.has(w) || ES_FUTURO.has(w) ||
    ES_PASADO_RE.test(w) && w.length > 3 ||
    ES_IMPERFECTO_RE.test(w) && w.length > 4 ||
    ES_FUTURO_RE.test(w) && w.length > 4;

  let vi = -1;
  for (let k = 0; k < W.length; k++) if (esVerbES(W[k])) { vi = k; break; }
  if (vi < 0) return { tiempo: null, vi: -1, verbo: "" };

  const w = W[vi];
  if (ES_FUTURO.has(w) || (ES_FUTURO_RE.test(w) && w.length > 4)) return { tiempo: "futuro", vi, verbo: w };
  if (ES_PASADO.has(w) || (ES_PASADO_RE.test(w) && w.length > 3)) return { tiempo: "pasado", vi, verbo: w };
  if (ES_IMPERFECTO_RE.test(w) && w.length > 4) return { tiempo: "imperfecto", vi, verbo: w };
  return { tiempo: "presente", vi, verbo: w };
}

/* corrección «yo» → pasado para los verbos más frecuentes */
const PRES_A_PAST_ES = {
  como: "comí", canto: "canté", bailo: "bailé", trabajo: "trabajé",
  estudio: "estudié", camino: "caminé", miro: "miré", cocino: "cociné",
  limpio: "limpié", escucho: "escuché", hablo: "hablé", compro: "compré",
  juego: "jugué", vivo: "viví", escribo: "escribí", leo: "leí", bebo: "bebí",
  corro: "corrí", aprendo: "aprendí", abro: "abrí", recibo: "recibí",
  soy: "fui", estoy: "estuve", tengo: "tuve", hago: "hice", voy: "fui",
  veo: "vi", salgo: "salí", duermo: "dormí", quiero: "quise", puedo: "pude",
  desayuno: "desayuné", almuerzo: "almorcé", ceno: "cené", llego: "llegué",
};

/* sugerencia de corrección de tiempo (español) */
function sugerirTiempoES(objetivo, verbo) {
  const v = String(verbo || "").toLowerCase();
  if (objetivo === "pasado" && PRES_A_PAST_ES[v]) return "Prueba con: «" + PRES_A_PAST_ES[v] + "»";
  if (objetivo === "pasado") return "Conjuga el verbo en pasado (para «yo»: -ar → -é, -er/-ir → -í).";
  if (objetivo === "presente") return "Conjuga el verbo en presente (para «yo»: -ar → -o, -er/-ir → -o).";
  if (objetivo === "continuo") return "Usa «estar» + gerundio (-ando / -endo).";
  if (objetivo === "imperfecto") return "Usa el imperfecto (-aba / -ía).";
  if (objetivo === "futuro") return "Usa «voy a» + infinitivo o el futuro simple (-ré).";
  return "";
}

/* ============================================================
   ESTRUCTURA ESPERADA — COMPONENTES del patrón
   (sujeto · verbo · adverbio de frecuencia · objeto · adjetivo ·
   expresión de tiempo · lugar/complemento)
   ============================================================ */

const PRON_EN = new Set("i you he she it we they me him us them my your his her its our their this that these those the a an mom dad brother sister friend people boy girl children kids man woman dog cat family parents teachers student".split(/\s+/));

const ADV_FREC_EN = new Set(["always", "usually", "normally", "generally", "often", "frequently", "sometimes",
  "occasionally", "rarely", "seldom", "never", "constantly", "regularly", "hardly ever", "almost never",
  "all the time", "every day", "every week", "every month", "every year", "every morning", "every night",
  "once a week", "twice a week", "three times a week"]);

const ADV_FREC_ES = new Set(["siempre", "casi siempre", "normalmente", "generalmente", "frecuentemente",
  "habitualmente", "a menudo", "muchas veces", "a veces", "algunas veces", "de vez en cuando", "rara vez",
  "raramente", "casi nunca", "casi jamas", "nunca", "jamas", "todos los dias", "cada dia", "cada semana",
  "cada mes", "cada ano", "todas las semanas"]);

const ADJ_EN = new Set("happy sad tall short big small large fast slow beautiful pretty handsome ugly interesting boring funny tired sleepy hungry thirsty angry mad cold hot warm cool new old young easy difficult hard soft good bad great nice kind mean smart intelligent clean dirty rich poor strong weak loud quiet expensive cheap delicious terrible wonderful amazing awful important busy free late early long wide high deep full empty heavy light dark bright".split(/\s+/));

const ADJ_ES = new Set("feliz triste alto bajo grande pequeno rapido lento bonito hermoso feo interesante aburrido divertido cansado hambriento enojado frio caliente tibio nuevo viejo joven facil dificil duro suave bueno malo genial amable inteligente limpio sucio rico pobre fuerte debil ruidoso callado caro barato delicioso terrible maravilloso increible horrible importante ocupado libre tarde temprano largo ancho profundo lleno vacio pesado ligero oscuro brillante".split(/\s+/));

/* n-gramas (1–3 tokens) contra frases normalizadas */
function buscarFrase(WL, dicc, desde, hasta) {
  for (let k = desde; k < hasta; k++) {
    for (let n = Math.min(3, hasta - k); n >= 1; n--) {
      const frase = WL.slice(k, k + n).map(norm).join(" ");
      if (dicc.has(frase)) return { inicio: k, largo: n };
    }
  }
  return null;
}

function validarEstructuraEsperada(texto, estructura, idioma) {
  const plan = parsearEstructura(estructura);
  if (!plan) return [];
  const es = idioma === "es";
  const T = es ? "Estructura" : "Structure";
  const t = String(texto == null ? "" : texto).trim();
  if (!t) return [];

  const tok = tokensDe(t);
  const WL = tok.map((x) => x.w.toLowerCase().replace(/’/g, "'"));
  const nT = WL.length;
  const errores = [];
  const anclaToken = (k) => ({
    inicio: tok[Math.min(k, nT - 1)] ? tok[Math.min(k, nT - 1)].i : 0,
    largo: tok[Math.min(k, nT - 1)] ? tok[Math.min(k, nT - 1)].w.length : Math.min(t.length, 40),
  });
  const anclaFin = () => anclaToken(nT - 1);

  const det = es ? detectarTiempoES(tok) : detectarTiempoEN(tok);
  const vi = det.vi;

  /* ── 1 · TIEMPO GRAMATICAL ── */
  if (plan.tiempo && det.tiempo !== plan.tiempo) {
    const nombre = (NOMBRE_TIEMPO[plan.tiempo] || {})[es ? "es" : "en"] || plan.tiempo;
    const detectado = det.tiempo ? ((NOMBRE_TIEMPO[det.tiempo] || {})[es ? "es" : "en"] || det.tiempo) : null;
    const detalle = es
      ? "La oración debe estar en " + nombre.toUpperCase() + (detectado ? " — la escribiste en " + detectado.toUpperCase() + "." : " y no encuentro un verbo en ese tiempo.")
      : "The sentence must be in " + nombre.toUpperCase() + (detectado ? " — you wrote it in " + detectado.toUpperCase() + "." : ", but no verb was found.");
    const a = vi > -1 ? anclaToken(vi) : { inicio: 0, largo: Math.min(t.length, 40) };
    errores.push({
      inicio: a.inicio, largo: a.largo, tipo: "estructura", titulo: T,
      sugerencia: vi > -1 ? (es ? sugerirTiempoES(plan.tiempo, det.verbo) : sugerirTiempo(plan.tiempo, det.verbo, es)) : "",
      detalle,
    });
  }

  const req = new Set(plan.partes.map((p) => p.clave));
  const pos = { sujeto: -1, verbo: vi, adverbioFrecuencia: -1, objeto: -1, complemento: -1, adjetivo: -1, expresionTiempo: -1, lugar: -1 };

  /* ── 2 · ADVERBIO DE FRECUENCIA: presencia + posición (regla
     real: entre el sujeto y el verbo, o justo después de «be») ── */
  if (req.has("adverbioFrecuencia")) {
    const adv = buscarFrase(WL, es ? ADV_FREC_ES : ADV_FREC_EN, 0, nT);
    if (!adv) {
      const a = anclaFin();
      errores.push({
        inicio: a.inicio, largo: a.largo, tipo: "estructura", titulo: T, sugerencia: "",
        detalle: es
          ? "Falta el adverbio de frecuencia (siempre, a veces, nunca…)."
          : "Missing the adverb of frequency (always, usually, often, sometimes, never…).",
      });
    } else {
      pos.adverbioFrecuencia = adv.inicio;
      if (!es) {
        const esBeEnVi = vi > -1 && (BE_FORMS.has(WL[vi]) || /'(s|m|re)$/.test(WL[vi]));
        const bien = (adv.inicio > 0 || !req.has("sujeto")) &&
          (adv.inicio < vi || (esBeEnVi && adv.inicio === vi + 1));
        if (!bien) {
          const a = anclaToken(adv.inicio);
          errores.push({
            inicio: a.inicio, largo: a.largo, tipo: "estructura", titulo: T, sugerencia: "",
            detalle: es
              ? "En inglés, el adverbio de frecuencia va ENTRE el sujeto y el verbo (o después de «be»): «She always runs» / «She is always happy»."
              : "In English, the frequency adverb goes BETWEEN the subject and the verb (or after 'be'): 'She always runs' / 'She is always happy'.",
          });
        }
      }
    }
  }

  /* ── 3 · SUJETO: debe haber palabras antes del verbo que no
     sean solo adverbios o expresiones de tiempo ── */
  if (req.has("sujeto")) {
    const noSujeto = new Set([...ADV_FREC_EN, ...ADV_FREC_ES, "yesterday", "today", "tonight",
      "tomorrow", "now", "last", "next", "every", "ago", "ayer", "hoy", "manana", "anteayer"]);
    if (vi === 0) {
      if (es) {
        /* en español el sujeto omitido con verbo conjugado es válido */
        pos.sujeto = 0;
      } else {
        const a = anclaToken(0);
        errores.push({
          inicio: a.inicio, largo: a.largo, tipo: "estructura", titulo: T, sugerencia: "",
          detalle: "The sentence must START with the subject (I, you, he, my mom…), not with the verb.",
        });
      }
    } else if (vi > 0) {
      const haySujeto = WL.slice(0, vi).some((w) => !noSujeto.has(norm(w)));
      if (!haySujeto) {
        if (es) {
          /* en español el sujeto puede omitirse (pro-drop):
             «Siempre desayuno a las siete.» es correcta */
          pos.sujeto = 0;
        } else {
          const a = anclaToken(0);
          errores.push({
            inicio: a.inicio, largo: a.largo, tipo: "estructura", titulo: T, sugerencia: "",
            detalle: "Missing the subject at the start (e.g.: 'I', 'She', 'My friends'…).",
          });
        }
      } else {
        pos.sujeto = 0;
      }
    }
  }

  /* ── 4 · VERBO ── */
  if (req.has("verbo") && vi < 0 && !plan.tiempo) {
    errores.push({
      inicio: 0, largo: Math.min(t.length, 40), tipo: "estructura", titulo: T, sugerencia: "",
      detalle: es ? "Falta el verbo en la oración." : "Missing the verb in the sentence.",
    });
  }

  /* ── 5 · OBJETO / COMPLEMENTO / LUGAR: contenido después del
     verbo (sin contar el adverbio de frecuencia ni auxiliares) ── */
  const pideDespues = req.has("objeto") || req.has("complemento") || req.has("lugar");
  if (pideDespues && vi > -1) {
    const adv = req.has("adverbioFrecuencia")
      ? buscarFrase(WL, es ? ADV_FREC_ES : ADV_FREC_EN, 0, nT)
      : null;
    const dentroAdv = (k) => adv && k >= adv.inicio && k < adv.inicio + adv.largo;
    const despues = [];
    for (let k = vi + 1; k < nT; k++) {
      if (dentroAdv(k)) continue;
      despues.push(k);
    }
    if (despues.length) { pos.objeto = despues[0]; pos.complemento = despues[0]; pos.lugar = despues[0]; }
    else {
      const a = anclaFin();
      errores.push({
        inicio: a.inicio, largo: a.largo, tipo: "estructura", titulo: T, sugerencia: "",
        detalle: es
          ? "Agrega el objeto o complemento después del verbo."
          : "Add the object or complement after the verb.",
      });
    }
  }

  /* ── 6 · ADJETIVO ── */
  if (req.has("adjetivo")) {
    const lista = es ? ADJ_ES : ADJ_EN;
    let idx = -1;
    for (let k = 0; k < nT; k++) {
      if (lista.has(norm(WL[k]))) { idx = k; break; }
    }
    if (idx < 0) {
      const a = anclaFin();
      errores.push({
        inicio: a.inicio, largo: a.largo, tipo: "estructura", titulo: T, sugerencia: "",
        detalle: es
          ? "Falta un adjetivo (happy, tall, interesting…)."
          : "Missing an adjective (happy, tall, interesting…).",
      });
    } else {
      pos.adjetivo = idx;
    }
  }

  /* ── 7 · EXPRESIÓN DE TIEMPO ── */
  if (req.has("expresionTiempo")) {
    const frases = es
      ? new Set(["ayer", "hoy", "ahora", "manana", "anoche", "anteayer", "la semana pasada", "el ano pasado", "el mes pasado", "todos los dias", "todas las tardes", "todas las noches", "cada dia", "cada semana", "cada mes", "cada ano", "por la manana", "por la tarde", "por la noche", "el lunes", "el martes", "el miercoles", "el jueves", "el viernes", "el sabado", "el domingo"])
      : new Set(["yesterday", "today", "tonight", "tomorrow", "now", "last night", "last week", "last month", "last year", "next week", "next month", "next year", "every day", "every week", "every month", "every year", "in the morning", "in the afternoon", "in the evening", "at night", "on monday", "on tuesday", "on wednesday", "on thursday", "on friday", "on saturday", "on sunday", "last monday", "next monday"]);
    const idx = buscarFrase(WL, frases, 0, nT);
    if (!idx) {
      const a = anclaFin();
      errores.push({
        inicio: a.inicio, largo: a.largo, tipo: "estructura", titulo: T, sugerencia: "",
        detalle: es
          ? "Falta la expresión de tiempo (ayer, cada día, la semana pasada…)."
          : "Missing the time expression (yesterday, every day, last week…).",
      });
    } else {
      pos.expresionTiempo = idx.inicio;
    }
  }

  /* ── 8 · ORDEN entre pares que sí son fijos (el adverbio de
     frecuencia y la expresión de tiempo admiten más posiciones) ── */
  const pares = [["sujeto", "verbo"], ["verbo", "objeto"], ["verbo", "adjetivo"], ["verbo", "complemento"], ["verbo", "lugar"]];
  for (const [a, b] of pares) {
    if (!req.has(a) || !req.has(b)) continue;
    if (pos[a] >= 0 && pos[b] >= 0 && pos[a] > pos[b]) {
      const an = anclaToken(pos[b]);
      errores.push({
        inicio: an.inicio, largo: an.largo, tipo: "estructura", titulo: T, sugerencia: "",
        detalle: es
          ? "Sigue la estructura esperada: «" + plan.cruda + "»."
          : "Follow the expected structure: '" + plan.cruda + "'.",
      });
    }
  }

  return errores;
}

/* ============================================================
   MOTOR DE REVISIÓN LOCAL (sin red)
   Cada error: { inicio, largo, tipo, titulo, sugerencia, detalle }
   tipo: «ortografia» | «gramatica» | «estructura»
   ============================================================ */

/* Ortografía frecuente EN: palabra mal escrita → sugerencia */
const ORTO_EN = {
  teh: "the", taht: "that", thats: "that's", recieve: "receive",
  beleive: "believe", acheive: "achieve", thier: "their", freind: "friend",
  becuase: "because", becuse: "because", definately: "definitely",
  tommorow: "tomorrow", tommorrow: "tomorrow", writting: "writing",
  wich: "which", goverment: "government", occured: "occurred",
  untill: "until", alot: "a lot", basicly: "basically", carefull: "careful",
  excercise: "exercise", gratefull: "grateful", happend: "happened",
  independant: "independent", knowlege: "knowledge", libary: "library",
  neccessary: "necessary", occassion: "occasion", posession: "possession",
  realy: "really", seperate: "separate", succesful: "successful",
  wierd: "weird", arguement: "argument", comming: "coming",
  especialy: "especially", finaly: "finally", hopefuly: "hopefully",
  imediately: "immediately", intresting: "interesting", nowdays: "nowadays",
  payed: "paid", probaly: "probably", recomend: "recommend",
  responsability: "responsibility", restaurent: "restaurant", truely: "truly",
  unfortunatly: "unfortunately", useing: "using", visting: "visiting",
  wether: "whether", wonderfull: "wonderful", accomodate: "accommodate",
  achievment: "achievement",
  /* contracciones sin apóstrofo */
  dont: "don't", cant: "can't", wont: "won't", isnt: "isn't",
  didnt: "didn't", doesnt: "doesn't", wasnt: "wasn't", werent: "weren't",
  arent: "aren't", havent: "haven't", hasnt: "hasn't",
  couldnt: "couldn't", shouldnt: "shouldn't", wouldnt: "wouldn't",
  youre: "you're", theyre: "they're", im: "I'm", ive: "I've",
  "i'm": "I'm", "i've": "I've",
  /* verbos irregulares «regularizados» por hispanohablantes */
  goed: "went", bringed: "brought", buyed: "bought", catched: "caught",
  teached: "taught", thinked: "thought", eated: "ate", runned: "ran",
  maked: "made", writed: "wrote", taked: "took", gived: "gave",
};

/* Ortografía frecuente ES */
const ORTO_ES = {
  tambien: "también", asi: "así", alli: "allí", ahi: "ahí", atras: "atrás",
  detras: "detrás", despues: "después", rapido: "rápido", facil: "fácil",
  dificil: "difícil", auque: "aunque", grasias: "gracias", muhos: "muchos",
  mucas: "muchas", muncho: "mucho", nadien: "nadie", aver: "a ver",
  osea: "o sea", deacuerdo: "de acuerdo", haiga: "haya", comio: "comió",
  q: "que", xq: "porque", pq: "porque", tb: "también", tas: "estás",
  toy: "estoy", aselo: "hacérselo", "aúnque": "aunque",
};

/* pasados usados después de did/didn't → forma base */
const BASE_DE = {
  went: "go", came: "come", saw: "see", ate: "eat", took: "take",
  made: "make", wrote: "write", bought: "buy", brought: "bring",
  had: "have", got: "get", gave: "give", said: "say", thought: "think",
  found: "find", knew: "know", ran: "run", sang: "sing", drank: "drink",
  swam: "swim", spoke: "speak", slept: "sleep", taught: "teach",
  caught: "catch",
};

/* sustantivos incontables escritos en plural */
const INCONTABLES = {
  peoples: "people", informations: "information", furnitures: "furniture",
  advices: "advice", homeworks: "homework", musics: "music",
  moneys: "money", luggages: "luggage", equipments: "equipment",
  knowledges: "knowledge",
};

/* «a» + palabra que sí pide «a» aunque empiece con vocal (sonido /ju/…) */
const EXCEPCION_AN = /^(uni|usu|use|user|utens|euro|eul|eup|one|once|ubiq)/i;

/* he/she/it + verbo sin -s (formas base detectables) */
const RX_TERCERO = /\b(?:he|she|it)\s+(?:go|do|have|come|make|take|eat|live|play|work|want|need|like|watch|study|carry|try|fly|read|write|speak|walk|run|drive|help|love|hate|drink|sleep|open|close|clean|cook|dance|draw|sing|swim|teach|learn|buy|sell|send|call|ask|answer|listen|look|start|stop|visit|travel)\b/gi;

/* did/didn't + verbo en pasado */
const RX_DID = /\b(?:did|didn't|did not)\s+(?:went|came|saw|ate|took|made|wrote|bought|brought|had|got|gave|said|thought|found|knew|ran|sang|drank|swam|spoke|slept|taught|caught)\b/gi;

/* 3ª persona: go→goes, do→does, have→has, study→studies, play→plays */
function tercero(v) {
  const k = String(v || "").toLowerCase();
  if (k === "go") return "goes";
  if (k === "do") return "does";
  if (k === "have") return "has";
  if (/[^aeiou]y$/.test(k)) return k.slice(0, -1) + "ies";
  return k + "s";
}

/* Reglas de gramática EN: { re, msg, sug(m) } */
const GRAM_EN = [
  { re: /\b(?:he|she|it)\s+are\b/gi, msg: "Subject–verb agreement: 'he / she / it' takes 'is'.", sug: (m) => m[0].replace(/are/i, "is") },
  { re: /\b(?:they|we|you)\s+is\b/gi, msg: "Subject–verb agreement: 'they / we / you' takes 'are'.", sug: (m) => m[0].replace(/is/i, "are") },
  { re: /\b(?:they|we)\s+was\b/gi, msg: "Subject–verb agreement: 'they / we' takes 'were'.", sug: (m) => m[0].replace(/was/i, "were") },
  { re: /\b[iI]\s+(?:is|are|has)\b/g, msg: "Subject–verb agreement: 'I' takes 'am' (or 'have').", sug: (m) => (/has/i.test(m[0]) ? "I have" : "I am") },
  { re: RX_TERCERO, msg: "Subject–verb agreement: add -s to the verb after 'he / she / it'.", sug: (m) => { const p = m[0].trim().split(/\s+/); return p[0] + " " + tercero(p[1]); } },
  { re: RX_DID, msg: "After 'did' use the base form of the verb.", sug: (m) => { const p = m[0].split(/\s+/); const pasado = p[p.length - 1].toLowerCase(); return p[0] + " " + (BASE_DE[pasado] || pasado); } },
  { re: /\bthere\s+is\s+(?:many|several|two|three|four|five|six|seven|eight|nine|ten)\b/gi, msg: "Plural: use 'there are'.", sug: (m) => m[0].replace(/is/i, "are") },
  { re: /\b(?:don't|doesn't)\s+has\b/gi, msg: "Use 'have' after 'don't / doesn't'.", sug: (m) => m[0].replace(/has/i, "have") },
  { re: /\b(\p{L}+)\s+\1\b/giu, msg: "Possible repeated word.", sin: (m) => { const k = m[1].toLowerCase(); return k === "had" || k === "that"; }, sug: null },
];

/* Reglas de gramática ES */
const GRAM_ES = [
  { re: /\byo\s+(?:eres|somos|sois|son)\b/gi, msg: "Concordancia sujeto-verbo: «yo» pide «soy».", sug: () => "yo soy" },
  { re: /\btú\s+(?:soy|somos|son)\b/gi, msg: "Concordancia sujeto-verbo: «tú» pide «eres».", sug: () => "tú eres" },
  { re: /\btu\s+(?:soy|somos)\b/gi, msg: "Concordancia sujeto-verbo: aquí va el pronombre «tú eres».", sug: () => "tú eres" },
  { re: /\bnosotros(?:as)?\s+(?:soy|eres|es|son)\b/gi, msg: "Concordancia sujeto-verbo: «nosotros/nosotras» pide «somos».", sug: (m) => m[0].split(/\s+/)[0] + " somos" },
  { re: /\busted\s+(?:eres|soy|somos|sois|son)\b/gi, msg: "Concordancia sujeto-verbo: «usted» pide «es».", sug: () => "usted es" },
  { re: /\bustedes\s+(?:eres|soy|somos|sois|es)\b/gi, msg: "Concordancia sujeto-verbo: «ustedes» pide «son».", sug: () => "ustedes son" },
  { re: /\b(?:él|ella)\s+(?:somos|sois|son|eres)\b/gi, msg: "Concordancia sujeto-verbo: «él/ella» pide «es».", sug: (m) => m[0].split(/\s+/)[0] + " es" },
  { re: /\b(?:ellos|ellas)\s+(?:somos|sois|es|eres)\b/gi, msg: "Concordancia sujeto-verbo: «ellos/ellas» pide «son».", sug: (m) => m[0].split(/\s+/)[0] + " son" },
  { re: /\bhabían\s+(?:muchas|muchos|varias|varios|unas|unos|algunas|algunos|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/gi, msg: "«Haber» impersonal: se conjuga en singular («había»).", sug: (m) => m[0].replace(/habían/i, "había") },
  { re: /\bhaber\s+si\b/gi, msg: "Confusión «haber / a ver»: aquí corresponde «a ver si».", sug: () => "a ver si", tipo: "ortografia" },
];

/* Espaciado de puntuación (común a ambos idiomas) */
const ESPACIO = [
  { re: /[ \t]+([,.!?;:…])/g, tipo: "ortografia", msgEs: "No se escribe espacio antes del signo de puntuación.", msgEn: "Remove the space before punctuation." },
  { re: /[,;:](?=[A-Za-zÁÉÍÓÚÑáéíóúñü])/g, tipo: "ortografia", msgEs: "Escribe un espacio después del signo.", msgEn: "Add a space after the punctuation mark." },
];

/* Comprobaciones de ESTRUCTURA (mayúscula, punto final, oración
   completa). Se aplican SIEMPRE, incluso con la API externa. */
function estructuraLocal(texto, es) {
  const errores = [];
  const t = String(texto == null ? "" : texto);
  const T = es ? "Estructura" : "Structure";

  if (!t.trim()) {
    errores.push({
      inicio: 0, largo: 0, tipo: "estructura", titulo: T, sugerencia: "",
      detalle: es ? "No escribiste nada en esta oración." : "You didn't write anything in this sentence.",
    });
    return errores;
  }

  /* mayúscula inicial */
  const idxPrim = t.search(/[A-Za-zÁÉÍÓÚÑáéíóúñü]/);
  if (idxPrim > -1 && /[a-záéíóúñü]/.test(t[idxPrim])) {
    const mPal = t.slice(idxPrim).match(/^[\p{L}'’-]+/u);
    errores.push({
      inicio: idxPrim, largo: mPal ? mPal[0].length : 1, tipo: "estructura", titulo: T, sugerencia: "",
      detalle: es ? "La oración debe comenzar con letra MAYÚSCULA." : "The sentence must start with a capital letter.",
    });
  }

  /* punto final (. ! ?) */
  const recortado = t.replace(/\s+$/, "");
  if (recortado && !/[.!?…]/.test(recortado.slice(-1))) {
    let ult = null, mm;
    const reU = /[\p{L}\p{N}'’-]+/gu;
    while ((mm = reU.exec(recortado))) ult = mm;
    if (ult) {
      errores.push({
        inicio: ult.index, largo: ult[0].length, tipo: "estructura", titulo: T, sugerencia: "",
        detalle: es ? "La oración debe terminar con punto (. ! ¿ ?)." : "The sentence must end with a period (. ! or ?).",
      });
    }
  }

  /* oración completa: al menos 2 palabras */
  const palabras = t.match(/[\p{L}\p{N}'’-]+/gu) || [];
  if (palabras.length < 2) {
    errores.push({
      inicio: 0, largo: t.length, tipo: "estructura", titulo: T, sugerencia: "",
      detalle: es ? "Escribe una oración completa (sujeto + verbo)." : "Write a complete sentence (subject + verb).",
    });
  }

  return errores;
}

/* Revisión LOCAL completa de una oración (incluye la
   estructuraEsperada cuando el docente la definió) */
function revisarLocal(texto, idioma, estructura) {
  const es = idioma === "es";
  const t = String(texto == null ? "" : texto).trim();
  const errores = estructuraLocal(t, es);
  if (!t) return errores;

  const T_ORT = es ? "Error ortográfico" : "Spelling error";
  const T_GRA = es ? "Error gramatical" : "Grammar error";
  const lineaSug = (x) => (es ? "¿Quisiste decir «" + x + "»?" : "Did you mean '" + x + "'?");
  const lineaCorr = (x) => (es ? "Corrección: «" + x + "»" : "Correction: '" + x + "'");

  /* ortografía por diccionario + «i» minúscula en inglés */
  const dicc = es ? ORTO_ES : ORTO_EN;
  const rePalabra = /[\p{L}][\p{L}'’-]*/gu;
  let mp;
  while ((mp = rePalabra.exec(t))) {
    const cruda = mp[0];
    const clave = cruda.toLowerCase().replace(/’/g, "'");
    let sug = dicc[clave] || null;
    if (!es && clave === "i") sug = "I";
    if (sug && sug !== cruda) {
      errores.push({
        inicio: mp.index, largo: cruda.length, tipo: "ortografia", titulo: T_ORT,
        sugerencia: lineaSug(sug), detalle: "",
      });
    }
  }

  /* «a» + vocal → «an» (con excepciones de sonido /ju/, /w/) */
  if (!es) {
    const rxAn = /\b([Aa])\s+([a-z]\w*)/g;
    let ma;
    while ((ma = rxAn.exec(t))) {
      const palabra = ma[2];
      if (!/^[aeiou]/.test(palabra)) continue;
      if (EXCEPCION_AN.test(palabra)) continue;
      const articulo = ma[1] === "A" ? "An" : "an";
      errores.push({
        inicio: ma.index, largo: ma[0].length, tipo: "gramatica", titulo: T_GRA,
        sugerencia: lineaCorr(articulo + " " + palabra),
        detalle: "Use 'an' before a vowel sound.",
      });
    }

    /* sustantivos incontables en plural */
    for (const clave in INCONTABLES) {
      const rx = new RegExp("\\b" + clave + "\\b", "gi");
      let mi;
      while ((mi = rx.exec(t))) {
        errores.push({
          inicio: mi.index, largo: mi[0].length, tipo: "gramatica", titulo: T_GRA,
          sugerencia: lineaCorr(mi[0][0] === mi[0][0].toUpperCase() ? INCONTABLES[clave].replace(/^./, (c) => c.toUpperCase()) : INCONTABLES[clave]),
          detalle: "Uncountable noun: it has no plural -s.",
        });
      }
    }
  }

  /* gramática por reglas */
  const reglas = es ? GRAM_ES : GRAM_EN;
  for (const regla of reglas) {
    regla.re.lastIndex = 0;
    let m;
    while ((m = regla.re.exec(t))) {
      if (regla.sin && regla.sin(m)) continue;
      errores.push({
        inicio: m.index, largo: m[0].length,
        tipo: regla.tipo || "gramatica", titulo: regla.tipo === "ortografia" ? T_ORT : T_GRA,
        sugerencia: regla.sug ? lineaCorr(regla.sug(m)) : "",
        detalle: regla.msg,
      });
    }
  }

  /* espaciado de puntuación */
  for (const regla of ESPACIO) {
    regla.re.lastIndex = 0;
    let m;
    while ((m = regla.re.exec(t))) {
      let inicio = m.index, largo = m[0].length;
      if (m[1]) { inicio = m.index + m[0].length - 1; largo = 1; }  /* marca solo el signo */
      errores.push({
        inicio, largo, tipo: regla.tipo, titulo: T_ORT, sugerencia: "",
        detalle: es ? regla.msgEs : regla.msgEn,
      });
    }
  }

  /* estructura esperada del docente */
  if (estructura) errores.push(...validarEstructuraEsperada(t, estructura, idioma));

  return ordenarErrores(errores);
}

/* Deduplica, ordena por posición y resuelve solapes
   (conserva el primer error de cada rango). */
function ordenarErrores(errores) {
  const PRIORIDAD = { ortografia: 0, gramatica: 1, estructura: 2 };
  const vistas = new Set();
  const unicos = [];
  for (const e of errores) {
    const clave = e.inicio + ":" + e.largo + ":" + e.tipo + ":" + e.detalle;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    unicos.push(e);
  }
  unicos.sort((a, b) =>
    (a.inicio - b.inicio) || (b.largo - a.largo) ||
    (PRIORIDAD[a.tipo] - PRIORIDAD[b.tipo]));
  const limpios = [];
  let fin = -1;
  for (const e of unicos) {
    if (e.largo > 0 && e.inicio < fin) continue;
    limpios.push(e);
    if (e.largo > 0) fin = e.inicio + e.largo;
  }
  return limpios;
}

/* ============================================================
   API EXTERNA — LanguageTool gratuito
   https://api.languagetool.org/v2/check
   Se envía UNA petición con todas las oraciones unidas por «\n\n»
   y luego cada match se asigna a su oración por offset.
   Devuelve: array de arrays de errores (uno por oración) o null
   si la API no está disponible (la llamada decide el repliegue).
   ============================================================ */

async function revisarConApi(textos, idioma, senal) {
  const es = idioma === "es";
  const T_ORT = es ? "Error ortográfico" : "Spelling error";
  const T_GRA = es ? "Error gramatical" : "Grammar error";
  const lineaSug = (x) => (es ? "¿Quisiste decir «" + x + "»?" : "Did you mean '" + x + "'?");
  const lineaCorr = (x) => (es ? "Corrección: «" + x + "»" : "Correction: '" + x + "'");

  const llenos = [];
  let compuesto = "";
  const inicioDe = {};
  textos.forEach((t, i) => {
    const limpio = String(t == null ? "" : t).trim();
    if (!limpio) return;
    if (compuesto) compuesto += "\n\n";
    inicioDe[i] = compuesto.length;
    compuesto += limpio;
    llenos.push(i);
  });
  if (!llenos.length) return textos.map(() => []);

  let resp;
  try {
    resp = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text: compuesto, language: es ? "es" : "en-US" }).toString(),
      signal: senal,
    });
    if (!resp.ok) return null;
  } catch (e) {
    if (e && e.name === "AbortError") throw e;
    return null;
  }

  let datos;
  try { datos = await resp.json(); } catch (e) { return null; }

  const porOracion = {};
  const orden = llenos.slice().sort((a, b) => inicioDe[a] - inicioDe[b]);
  for (const m of (datos.matches || [])) {
    let sel = orden[0];
    for (const i of orden) if (m.offset >= inicioDe[i]) sel = i;
    const largoTexto = String(textos[sel]).trim().length;
    const inicio = Math.max(0, Math.min(m.offset - inicioDe[sel], largoTexto - 1));
    const largo = Math.max(1, Math.min(m.length || 1, largoTexto - inicio));
    const cat = (m.rule && m.rule.category && m.rule.category.id) || "";
    const tipo = cat === "TYPOS" ? "ortografia" : "gramatica";
    const sug = m.replacements && m.replacements[0] && m.replacements[0].value;
    porOracion[sel] = porOracion[sel] || [];
    porOracion[sel].push({
      inicio, largo, tipo,
      titulo: tipo === "ortografia" ? T_ORT : T_GRA,
      sugerencia: sug ? (tipo === "ortografia" ? lineaSug(sug) : lineaCorr(sug)) : "",
      detalle: m.shortMessage || m.message || "",
    });
  }

  return textos.map((t, i) => porOracion[i] || []);
}

/* Texto con las marcas en ROJO + tooltips (HTML seguro) */
function htmlMarcado(texto, errores) {
  const t = String(texto == null ? "" : texto);
  const validos = errores
    .filter((e) => e.largo > 0 && e.inicio >= 0 && e.inicio + e.largo <= t.length)
    .sort((a, b) => a.inicio - b.inicio || b.largo - a.largo);
  let html = "", pos = 0;
  for (const e of validos) {
    if (e.inicio < pos) continue;               /* solape: conserva el primero */
    const frag = t.slice(e.inicio, e.inicio + e.largo);
    const tip =
      `<span class="roi-tip" role="tooltip"><b>${esc(e.titulo)}</b>` +
      (e.sugerencia ? `<span class="roi-tip-sug">${esc(e.sugerencia)}</span>` : "") +
      (e.detalle ? `<i>${esc(e.detalle)}</i>` : "") +
      `</span>`;
    html += esc(t.slice(pos, e.inicio)) +
      `<span class="roi-marca roi-marca--${e.tipo}" tabindex="0">${esc(frag)}${tip}</span>`;
    pos = e.inicio + e.largo;
  }
  html += esc(t.slice(pos));
  return html;
}

/* ============================================================
   FÁBRICA PRINCIPAL
   ============================================================ */

export function generarRevisorOraciones(config = {}) {
  inyectarEstilos();

  const idioma = config.idioma === "es" ? "es" : "en";
  const es = idioma === "es";
  const usarApi = !!config.usarApiExterna;
  const cantidad = Math.floor(Number(config.cantidadInputs));
  const puntaje = Number(config.puntajeTotal);
  const estructura = String(config.estructuraEsperada == null ? "" : config.estructuraEsperada).trim();

  /* ── escena raíz + montaje (convención del proyecto) ── */
  const escena = document.createElement("div");
  escena.className = "roi-escena";

  /* ── color de la tarjeta (colorTarjeta; defecto #7c3aed) ── */
  const tonos = derivarTonos(config.colorTarjeta || COLOR_DEFECTO);
  const estiloEscena = escena.style;
  estiloEscena.setProperty("--roi-c", tonos.base);
  estiloEscena.setProperty("--roi-oscuro", tonos.oscuro);
  estiloEscena.setProperty("--roi-mas-oscuro", tonos.masOscuro);
  estiloEscena.setProperty("--roi-claro", tonos.claro);
  estiloEscena.setProperty("--roi-borde", tonos.borde);
  estiloEscena.setProperty("--roi-cab-texto", tonos.cabTexto);
  estiloEscena.setProperty("--roi-sombra", tonos.sombra);

  let destino = null;
  if (typeof config.contenedor === "string") destino = document.querySelector(config.contenedor);
  else if (config.contenedor && typeof config.contenedor.appendChild === "function") destino = config.contenedor;

  /* ── configuración inválida: tarjeta de error integrada ── */
  if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 50) {
    escena.innerHTML =
      `<div class="roi-error"><b>Configuración inválida</b>` +
      `«cantidadInputs» debe ser un número entero entre 1 y 50 (recibido: ${esc(JSON.stringify(config.cantidadInputs))}).</div>`;
    if (destino) destino.appendChild(escena);
    return escena;
  }
  if (!Number.isFinite(puntaje) || puntaje <= 0) {
    escena.innerHTML =
      `<div class="roi-error"><b>Configuración inválida</b>` +
      `«puntajeTotal» debe ser un número mayor que 0 (recibido: ${esc(JSON.stringify(config.puntajeTotal))}).</div>`;
    if (destino) destino.appendChild(escena);
    return escena;
  }

  const valorOracion = puntaje / cantidad;
  const indicacion = String(config.indicacion == null ? "" : config.indicacion).trim() ||
    (es ? "Escribe las oraciones solicitadas." : "Write the requested sentences.");

  /* ── construcción de la tarjeta ── */
  let filas = "";
  for (let i = 0; i < cantidad; i++) {
    filas +=
      `<section class="roi-oracion" data-i="${i}">` +
      `<div class="roi-oracion-cab">` +
      `<span class="roi-num">${i + 1}</span>` +
      `<span class="roi-estado roi-estado--pendiente">Pendiente</span>` +
      `<span class="roi-puntos">${fmt(valorOracion)} pts</span>` +
      `</div>` +
      `<textarea class="roi-entrada" rows="2" spellcheck="false" aria-label="Oración ${i + 1}" ` +
      `placeholder="Escribe la oración ${i + 1}…"></textarea>` +
      `<div class="roi-revision" hidden></div>` +
      `</section>`;
  }

  const franjaEstructura = estructura
    ? `<div class="roi-estructura"><span>Estructura esperada:</span> <b>${esc(estructura)}</b></div>`
    : "";

  escena.innerHTML =
    `<div class="roi-hoja">` +
    `<header class="roi-cab">` +
    `<div>` +
    `<span class="roi-rotulo">${es ? "Español · Escritura" : "English · Writing"}</span>` +
    `<h3 class="roi-indicacion">${esc(indicacion)}</h3>` +
    `</div>` +
    `<div class="roi-chips">` +
    `<span class="roi-intento" data-rol="intento">Intento 1 de 2</span>` +
    `<span class="roi-valor">${fmt(puntaje)} pts · ${fmt(valorOracion)} por oración</span>` +
    `</div>` +
    `</header>` +
    `<div class="roi-cuerpo">` +
    `${franjaEstructura}` +
    `<div class="roi-oraciones">${filas}</div>` +
    `<div class="roi-aviso" hidden></div>` +
    `<footer class="roi-pie">` +
    `<button type="button" class="roi-boton">Enviar / Check</button>` +
    `<span class="roi-pista">Mayúscula inicial y punto final.</span>` +
    `</footer>` +
    `<div class="roi-final" hidden></div>` +
    `</div>` +
    `</div>`;

  const chipIntento = escena.querySelector('[data-rol="intento"]');
  const aviso = escena.querySelector(".roi-aviso");
  const boton = escena.querySelector(".roi-boton");
  const final = escena.querySelector(".roi-final");
  const secciones = [...escena.querySelectorAll(".roi-oracion")];
  const entradas = secciones.map((s) => s.querySelector(".roi-entrada"));
  const estados = secciones.map((s) => s.querySelector(".roi-estado"));
  const revisiones = secciones.map((s) => s.querySelector(".roi-revision"));

  const estadoOraciones = entradas.map(() => ({ aprobada: false, errores: 0 }));
  let intento = 1;
  let finalizado = false;
  let revisando = false;
  let controlApi = null;

  /* tooltips: al tocar una marca se abre (y se cierra la anterior) */
  escena.addEventListener("click", (e) => {
    const marca = e.target.closest(".roi-marca");
    if (!marca) return;
    const estaba = marca.classList.contains("abierta");
    escena.querySelectorAll(".roi-marca.abierta").forEach((m) => m.classList.remove("abierta"));
    if (!estaba) marca.classList.add("abierta");
  });

  function muestraAviso(html, alerta) {
    aviso.hidden = false;
    aviso.className = "roi-aviso" + (alerta ? " roi-aviso--alerta" : "");
    aviso.innerHTML = html;
  }

  function pintarAprobada(i) {
    const s = secciones[i];
    s.classList.remove("roi-oracion--erronea");
    s.classList.add("roi-oracion--aprobada");
    entradas[i].readOnly = true;
    estados[i].textContent = "Aprobada ✓";
    estados[i].className = "roi-estado roi-estado--aprobada";
    revisiones[i].hidden = false;
    revisiones[i].className = "roi-revision roi-revision--ok";
    revisiones[i].innerHTML =
      `<div class="roi-revision-txt">${esc(entradas[i].value.trim())}</div>` +
      `<div class="roi-revision-pie">Sin errores — oración aprobada y congelada.</div>`;
  }

  function pintarErrores(i, texto, errores) {
    const s = secciones[i];
    s.classList.remove("roi-oracion--aprobada");
    s.classList.add("roi-oracion--erronea");
    const n = errores.length;
    estados[i].textContent = "Con errores (" + n + ")";
    estados[i].className = "roi-estado roi-estado--errores";
    revisiones[i].hidden = false;
    revisiones[i].className = "roi-revision roi-revision--mal";
    revisiones[i].innerHTML =
      `<div class="roi-revision-txt">${htmlMarcado(texto, errores)}</div>` +
      `<div class="roi-revision-pie">${n} ${n === 1 ? "error encontrado" : "errores encontrados"} ` +
      `— pasa el mouse o toca las marcas rojas para ver la explicación.</div>`;
  }

  function mostrarFinal(enPrimerIntento) {
    finalizado = true;
    chipIntento.textContent = "Finalizado";
    boton.hidden = true;
    escena.querySelector(".roi-pista").hidden = true;
    aviso.hidden = true;
    entradas.forEach((t) => { t.readOnly = true; });

    let total = 0;
    const filas = estadoOraciones.map((s, i) => {
      const val = s.aprobada ? valorOracion : 0;
      total += val;
      return (
        `<li class="roi-final-fila ${s.aprobada ? "ok" : "mal"}">` +
        `<span class="roi-final-n">${i + 1}</span>` +
        `<span class="roi-final-frag" title="${esc(entradas[i].value.trim())}">${esc(recorte(entradas[i].value.trim(), 46) || "—")}</span>` +
        `<span class="roi-final-p">${fmt(val)} / ${fmt(valorOracion)}</span>` +
        `<span class="roi-estado ${s.aprobada ? "roi-estado--aprobada" : "roi-estado--errores"}">` +
        `${s.aprobada ? "Aprobada ✓" : "Con errores (" + s.errores + ")"}</span>` +
        `</li>`
      );
    });

    final.hidden = false;
    final.innerHTML =
      `<div class="roi-final-titulo">Resultado final</div>` +
      `<div class="roi-final-total">` +
      `<span class="roi-final-num">${fmt(total)}</span>` +
      `<span class="roi-final-de">/ ${fmt(puntaje)} pts</span>` +
      `</div>` +
      `<ul class="roi-final-desglose">${filas.join("")}</ul>` +
      `<div class="roi-final-mensaje">` +
      (enPrimerIntento
        ? "¡Excelente! Aprobaste todas las oraciones en el primer intento."
        : "Revisión finalizada: cada oración sin errores obtiene su puntaje completo.") +
      `</div>`;
  }

  async function evaluar() {
    if (finalizado || revisando) return;
    revisando = true;
    boton.disabled = true;
    const etiqueta = boton.textContent;
    if (usarApi) boton.textContent = "Revisando…";

    const pendientes = estadoOraciones
      .map((s, i) => (s.aprobada ? -1 : i))
      .filter((i) => i >= 0);
    const textos = pendientes.map((i) => entradas[i].value.trim());

    let listas = null;
    let apiCaida = false;
    if (usarApi) {
      controlApi = new AbortController();
      try {
        const r = await revisarConApi(textos, idioma, controlApi.signal);
        if (r === null) apiCaida = true;
        else {
          listas = r.map((erroresApi, k) =>
            ordenarErrores([
              ...erroresApi,
              ...estructuraLocal(textos[k], es),
              ...(estructura ? validarEstructuraEsperada(textos[k], estructura, idioma) : []),
            ]));
        }
      } catch (e) {
        if (e && e.name === "AbortError") { revisando = false; return; }
        apiCaida = true;
      }
    }
    if (!listas) listas = textos.map((t) => revisarLocal(t, idioma, estructura));

    pendientes.forEach((i, k) => {
      const errores = listas[k];
      estadoOraciones[i].errores = errores.length;
      if (errores.length === 0) {
        estadoOraciones[i].aprobada = true;
        pintarAprobada(i);
      } else {
        pintarErrores(i, textos[k], errores);
      }
    });

    boton.disabled = false;
    boton.textContent = etiqueta;
    revisando = false;

    const quedan = estadoOraciones.some((s) => !s.aprobada);
    if (!quedan || intento === 2) {
      mostrarFinal(intento === 1 && !quedan);
      return;
    }

    /* queda 1 intento para corregir */
    intento = 2;
    chipIntento.textContent = "Intento 2 de 2";
    boton.textContent = "Revisar Correcciones";
    let mensaje =
      "<strong>Queda 1 intento.</strong> Tienes 1 intento restante para corregir " +
      "las oraciones marcadas en rojo y presionar «Revisar Correcciones».";
    if (apiCaida) {
      mensaje +=
        "<br><em>No pude contactar el revisor externo (LanguageTool); " +
        "se usó el revisor local.</em>";
    }
    muestraAviso(mensaje, apiCaida);
  }

  boton.addEventListener("click", evaluar);

  /* ── montaje (convención: contenedor o centrado en el <body>) ── */
  if (destino) {
    destino.appendChild(escena);
  } else {
    const caja = document.createElement("div");
    caja.className = "roi-caja";
    caja.appendChild(escena);
    document.body.appendChild(caja);
  }

  escena.destruir = () => {
    if (controlApi) controlApi.abort();
    const caja = escena.parentElement && escena.parentElement.classList.contains("roi-caja")
      ? escena.parentElement
      : null;
    if (caja && caja.parentElement) caja.parentElement.removeChild(caja);
    else if (escena.parentElement) escena.parentElement.removeChild(escena);
  };

  return escena;
}