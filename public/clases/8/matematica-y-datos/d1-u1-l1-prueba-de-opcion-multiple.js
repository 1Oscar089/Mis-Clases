// ============================================================
// CLASE — Mis Clases Online · archivo de contenido EN BLANCO
// d1-u1-l1-prueba-de-opcion-multiple.js
//
// ─── DÓNDE VA ESTE ARCHIVO ───
//   public/clases/{grado}/{materia}/{id}.js
//   p. ej.  public/clases/8/matematica-y-datos/d1-u1-l1-prueba-de-opcion-multiple.js
//   Está 3 carpetas adentro: por eso las rutas "../../../js/…"
//   llegan justo a la carpeta js/ del proyecto (ahí están
//   components, componentes y utils). Funciona igual con Live
//   Server (raíz del proyecto, URL con /public/) que con un
//   servidor puesto directamente en public/: las rutas relativas
//   no cambian.
//
// ─── CÓMO SE ABRE ───
//   La vista «Clases» carga este archivo y llama:
//     render(perfil, contenedor, clase)
//
// ─── QUÉ TRAE (estructura básica, en blanco) ───
//   · Flecha «← Volver» al inicio (la llevan clase, tarea y examen).
//   · Barra superior con el usuario (renderUserbar).
//   · UNA SECCIÓN por defecto: l1, un espacio en blanco de 820×420 px.
//
// ─── REGLA DE SECCIONES (igual en el editor «Crear» y aquí) ───
//   · 1 sección  → documento CORRIDO: todo a la vista, sin flechas.
//   · 2 o más    → se ve UNA a la vez y se avanza con «Siguiente →»
//                  (y «← Anterior» para regresar), con contador.
//   Para agregar una sección más: crea otra lámina y ponla en la
//   lista —  const l2 = lamina(420);  …  secciones: [l1, l2],
//
// ─── CÓMO AGREGAR ELEMENTOS (2 líneas por bloque) ───
//   Dentro de montar():
//     1) Carga la fábrica (una sola vez, junto a las otras):
//          const { crearTitulo } = await cargar("../../../js/componentes/titulo.js", ["crearTitulo"]);
//     2) Coloca el bloque dentro de la sección:
//          crearTitulo({ texto: "Mi título", contenedor: l1 });
//
//   · contenedor: l1                   → el bloque se apila solito
//     (lo más fácil cuando escribes a mano).
//   · contenedor: pon(l1, 20, 20, 780) → caja con posición y medida
//     exactas en px (así sale del editor «Crear» al guardar).
//
//   Fábricas disponibles:
//     js/componentes/  → titulo, subtitulo, parrafo, lista, tabla,
//                        enlace, imagen, formula, codigo, cita,
//                        aviso, detalles, separador, svg, section…
//     js/utils/        → opcionMultiple, respuestaSimple,
//                        multipleOpcion, video, sopaLetras,
//                        crucigrama, ordenar, relacionar, tts…
//
// ─── MÁS ABAJO, dentro de montar(), hay ejemplos LISTOS: quita el
//     // de los que necesites y ajusta los textos. ───
// ============================================================

// ── Título de la página (se ve en la barra de arriba) ──
const TITULO = "Prueba de opción múltiple";   // ← cámbialo aquí
import { respuestaSimple } from "../../../js/utils/respuestaSimple.js";
import { crearFlechas } from "../../../js/componentes/flechas.js";

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "mco-generada-estilos";
  estilo.textContent = `
    .mco-generada {
      max-width: 820px;
      margin: 0 auto;
      padding: 1.25rem clamp(1rem, 4vw, 2rem) 2.5rem;
      font-family: system-ui, sans-serif;
    }
    .cg-volver {
      display: inline-flex; align-items: center; gap: .3rem;
      border: 1px solid #e5e7eb; background: #ffffff; color: #4b5563;
      border-radius: 999px; padding: .42rem .85rem;
      font-size: .85rem; font-weight: 600; cursor: pointer;
      margin-bottom: 1rem;
    }
    .cg-volver:hover { border-color: #7c3aed; color: #7c3aed; }
    .cg-fallo {
      border: 2px solid #dc2626; background: #fef2f2; color: #b91c1c;
      border-radius: .8rem; padding: .9rem 1rem; font-size: .9rem;
      line-height: 1.5; margin-bottom: 1rem;
    }
    .cg-fallo b { display: block; margin-bottom: .3rem; }
    .cg-lienzo { position: relative; isolation: isolate; }
    .cg-lamina { position: relative; }
    .cg-bloque { position: absolute; z-index: 1; }
    .cg-fondo { position: absolute; z-index: 0; }
  `;
  document.head.append(estilo);
}

// ─── Carga de módulos A PRUEBA DE RUTAS (con reintento) ───
// Nada de imports estáticos: si UN archivo faltara o fuera copia
// vieja, la página entera moría con «Failed to fetch…». cargar()
// reintenta sin caché, verifica las exportaciones y, si algo falla,
// AVISA con el motivo exacto sin tumbar la página.
const MCO_MODULOS = new Map();

async function cargar(spec, nombres) {
  if (!MCO_MODULOS.has(spec)) {
    MCO_MODULOS.set(
      spec,
      import(spec).catch(() => {
        // reintento ÚNICO sin caché (Live Server recién arrancado…)
        const url = spec + (spec.includes("?") ? "&" : "?") + "mco=" + Date.now();
        return import(url).catch(() => {
          throw new Error("No se pudo cargar " + spec + " — revisa que ese archivo exista en tu proyecto (viene en la entrega) y recarga con F5.");
        });
      })
    );
  }
  const mod = await MCO_MODULOS.get(spec);
  const faltan = (nombres || []).filter((n) => typeof mod[n] !== "function");
  if (faltan.length) {
    throw new Error("El archivo " + spec + " SÍ está, pero no exporta " + faltan.join(", ") + ": es una copia vieja. Reemplázalo con el de la última entrega y recarga (F5).");
  }
  return mod;
}

// ─── Ayudantes (para que agregar bloques sea fácil) ───

// Una SECCIÓN (lámina) del documento: su ESPACIO en blanco.
// La página mide 820 de ancho; si le pasas un ancho menor, se respeta.
function lamina(altoPx, anchoPx) {
  const d = document.createElement("div");
  d.className = "cg-lamina";
  if (altoPx) d.style.minHeight = Math.round(altoPx) + "px";
  if (anchoPx && anchoPx < 820) d.style.width = Math.round(anchoPx) + "px";
  return d;
}

// La CAJA de un bloque dentro de la sección: posición y medida en px.
// Pásasela como `contenedor` al crear el bloque.
function pon(laminaDestino, x, y, ancho, alto) {
  const caja = document.createElement("div");
  caja.className = "cg-bloque";
  caja.style.left = x + "px";
  caja.style.top = y + "px";
  if (ancho) caja.style.width = ancho + "px";
  if (alto) caja.style.minHeight = alto + "px";
  laminaDestino.appendChild(caja);
  return caja;
}

// Igual que pon() pero para una figura de FONDO (debajo del texto).
function fondo(laminaDestino, x, y) {
  const caja = pon(laminaDestino, x, y);
  caja.className = "cg-fondo";
  return caja;
}

// ─── Contenido de la clase (lo llama la vista al abrirla) ───
export function render(perfil, contenedor, clase) {
  if (!perfil || !contenedor) return;
  inyectarEstilos();
  contenedor.removeAttribute("data-mco-listo");   // se marca al terminar montar()

  contenedor.innerHTML = `
    <div class="mco-generada">
      <button class="cg-volver" id="cg-volver" type="button">
        <sl-icon name="arrow-left"></sl-icon> Volver
      </button>
      <div class="cg-lienzo" id="cg-lienzo"></div>
    </div>`;

  // Todo el montaje es asíncrono (los módulos van con cargar()):
  // si algo falta, la página AVISA en vez de morir en blanco.
  montar(perfil, contenedor, clase).catch((e) => {
    console.warn("[mco-clase]", e);
    const zona = contenedor.querySelector("#cg-lienzo");
    if (zona) {
      const fallo = document.createElement("div");
      fallo.className = "cg-fallo";
      fallo.innerHTML = "<b>No se pudo armar la clase.</b> " + (e && e.message ? e.message : e);
      zona.appendChild(fallo);
    }
  });
}

async function montar(perfil, contenedor, clase) {
  const lienzo = contenedor.querySelector("#cg-lienzo");
  const volver = contenedor.querySelector("#cg-volver");

  // ── Módulos base (con reintento y aviso claro si falta uno) ──
  const { renderUserbar } = await cargar("../../../js/components/userbar.js", ["renderUserbar"]);
  const { renderInicio }  = await cargar("../../../js/components/inicio.js",  ["renderInicio"]);
  const { crearSecciones } = await cargar("../../../js/componentes/section.js", ["crearSecciones"]);

  renderUserbar(perfil, TITULO);

  // ── Volver: la flecha al INICIO (la llevan clase, tarea y examen) ──
  volver.addEventListener("click", () => {
    renderUserbar(perfil);
    renderInicio(perfil, contenedor);
  });

  // ════ SECCIÓN 1 (por defecto) — espacio en blanco de 820×420 px ════
  const l1 = lamina(640);
  const l2 = lamina(420);
  
  // ── AGREGA TUS BLOQUES AQUÍ ──
  // 1) FÁBRICAS: quita el // de las que vayas a usar (una línea cada una).
  // const { crearTitulo }    = await cargar("../../../js/componentes/titulo.js",    ["crearTitulo"]);
  // const { crearSubtitulo } = await cargar("../../../js/componentes/subtitulo.js", ["crearSubtitulo"]);
  // const { crearParrafo }   = await cargar("../../../js/componentes/parrafo.js",   ["crearParrafo"]);
  // const { crearLista }     = await cargar("../../../js/componentes/lista.js",     ["crearLista"]);
  // const { opcionMultiple } = await cargar("../../../js/utils/opcionMultiple.js",  ["opcionMultiple"]);
  //
  // 2) BLOQUES dentro de la sección (quita el // y ajusta):
  // crearTitulo({ texto: "Prueba de opción múltiple", contenedor: l1 });
  // crearParrafo({ texto: "Lee con atención y elige la respuesta correcta. Admite **negrita**, *cursiva* y $fórmulas$ como $\\frac{3}{4}$.", contenedor: l1 });
  // crearLista({
  //   contenedor: l1,
  //   items: [
  //     "Primera indicación.",
  //     "Segunda indicación.",
  //   ],
  // });
  // opcionMultiple({
  //   contenedor: l1,
  //   perfil,                       // el perfil del usuario (ya está aquí)
  //   clase,                        // la clase abierta (ya está aquí)
  //   tipo: "clase",                // "clase" | "tarea" | "examen"
  //   indicacion: "¿Cuánto es $\\frac{1}{2} + \\frac{1}{4}$?",
  //   respuestas: ["$\\frac{3}{4}$", "$\\frac{2}{6}$", "1", "$\\frac{1}{8}$"],
  //   respuestaCorrecta: 1,         // 1 = primera
  //   puntaje: 1,
  // });
  //
  // ¿Posición exacta (como el editor)? Usa pon():
  //   crearTitulo({ texto: "Mi título", contenedor: pon(l1, 20, 20, 780) });

  // ── Documento final: con UNA sección queda CORRIDO (sin flechas).
  //    Cuando agregues otra lámina — const l2 = lamina(420); — ponla
  //    en la lista:  secciones: [l1, l2]  → se ve UNA a la vez y se
  //    avanza con «Siguiente →» (igual que en el editor «Crear»). ──


  crearSecciones({
    contenedor: lienzo,
    secciones: [l1],
  });
  respuestaSimple({
    contenedor: l1,           // elemento del DOM donde insertar la pregunta
    perfil,               // perfil del usuario (users/{uid}: uid, rol, nie?)
    clase,                // { id, grado, materiaId, materia?, dia?, unidad?, leccion? }
    tipo: "clase",        // "clase" | "tarea" | "examen"  (defecto: "clase")
    indicacion: "¿Que horas son las 23?",
    respuestaCorrecta: "11:00", // texto esperado (o LISTA)
    puntaje: 2,           // valor de esta pregunta (0 a 10)
    // columnas: 2,       // NUEVO v5: la pregunta ocupa LA MITAD del ancho
    //                    //  (dos preguntas en el MISMO contenedor quedan
    //                    //  LADO A LADO; 3 = tercio, 4 = cuarto)
    ancho: "280px",    // NUEVO v5: ancho fijo ("50%", "18rem", 0.5…)
    // id: "p7",          // (opcional) identificador único y estable
  }).then((ganado) => { /* nota ganada en ESTA pregunta (oculta) */ });

  const nav = crearFlechas({
    contenedor: l1,
    alAnterior: () => irA(actual - 1),
    alSiguiente: () => irA(actual + 1),
  });
  nav.setContador(2, 2);
  nav.mostrarSiguiente(false);   // la esconde hasta que toque
  nav.setPuedeAnterior(actual > 0);

  crearSecciones({
    contenedor: lienzo,
    secciones: [l2],
  });
    respuestaSimple({
    contenedor: l2,           // elemento del DOM donde insertar la pregunta
    perfil,               // perfil del usuario (users/{uid}: uid, rol, nie?)
    clase,                // { id, grado, materiaId, materia?, dia?, unidad?, leccion? }
    tipo: "clase",        // "clase" | "tarea" | "examen"  (defecto: "clase")
    indicacion: "¿Que horas son las 24?",
    respuestaCorrecta: "12:00", // texto esperado (o LISTA)
    puntaje: 2,           // valor de esta pregunta (0 a 10)
    // columnas: 2,       // NUEVO v5: la pregunta ocupa LA MITAD del ancho
    //                    //  (dos preguntas en el MISMO contenedor quedan
    //                    //  LADO A LADO; 3 = tercio, 4 = cuarto)
    ancho: "280px",    // NUEVO v5: ancho fijo ("50%", "18rem", 0.5…)
    // id: "p7",          // (opcional) identificador único y estable
  }).then((ganado) => { /* nota ganada en ESTA pregunta (oculta) */ });

  contenedor.setAttribute("data-mco-listo", "1");   // TODO quedó montado
}