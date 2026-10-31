// ============================================================
// ESQUELETO · EXAMEN — Mis Clases Online (editor «Crear»)
// Tipo: examen · ID: examen-examen-trimestral · Título: examen-examen-trimestral
// Fecha: 29 de octubre de 2026
//
// ══ QUÉ ES ESTE ARCHIVO ══
//   EL ESQUELETO ESTÁNDAR de la pieza, listo por defecto: carga de
//   módulos a prueba de rutas (cargar() con reintento), láminas
//   (lamina/pon/fondo/zona), paginación con crearSecciones (corrido
//   con 1 sección · Siguiente/Anterior con 2 o más), flecha Volver
//   al inicio y la marca data-mco-listo.
//   Con tipo "examen" trae ADEMÁS el cierre resuelto: no se puede
//   salir sin ENVIAR, auto-envío SOLO si la nota quedó ENVIADO
//   (nunca se envía solo), bloqueo SOLO para el estudiante que
//   envió y el botón «Enviar examen» AL FINAL DE LA ÚLTIMA
//   SECCIÓN nada más.
//   TÚ SOLO te ocupas de las SECCIONES y los COMPONENTES.
//
// CÓMO USARLO
//   1. Guarda este archivo (con el nombre del ID) 3 carpetas
//      dentro de donde está js/:  clases/{grado}/{materia}/examen-examen-trimestral.js
//      p. ej.  public/clases/8/algebra/examen-examen-trimestral.js  — desde ahí
//      las rutas ../../../js/… apuntan a la carpeta js/ del
//      proyecto (ahí están components, componentes y utils).
//   2. Se abre desde «Exámenes» con render(perfil, contenedor, clase).
//
// SECCIONES Y COMPONENTES (las DOS maneras):
//   · EN EL EDITOR: arma secciones y suelta bloques; al descargar,
//     este mismo esqueleto sale con tu contenido ya dentro (una
//     lámina por sección, una línea por bloque).
//   · A MANO: la lista SECCIONES (abajo) espera tus láminas y cada
//     bloque nuevo son DOS líneas dentro de montar():
//       1. si su fábrica aún no está, UNA línea cargar() más —
//          const { crearParrafo } = await cargar("../../../js/componentes/parrafo.js", ["crearParrafo"]);
//       2. UNA línea del bloque, dentro de su lámina —
//          crearParrafo({ texto: "…", contenedor: pon(l1, 0, 240, 820) });
//     (las posiciones y medidas en px salieron del editor al guardar;
//      zona(l1) te da una caja en FLUJO para actividades que crecen).
// ============================================================

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
    .cg-aviso {
      display: flex; align-items: center; gap: .4rem;
      border: 2px solid #dc2626; background: #fef2f2; color: #b91c1c;
      border-radius: .7rem; padding: .6rem .8rem;
      font-size: .85rem; font-weight: 600; margin-bottom: 1rem;
    }
    .cg-aviso[hidden] { display: none; }
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
    .ex-zona { margin: 0; }
    .cg-envio { margin-top: 1.6rem; text-align: center; }
    .cg-enviar {
      display: inline-flex; align-items: center; gap: .4rem;
      background: #16a34a; border: 1px solid #16a34a; color: #ffffff;
      font: inherit; font-size: 1rem; font-weight: 800;
      border-radius: .7rem; padding: .7rem 1.6rem; cursor: pointer;
      box-shadow: 0 6px 18px rgba(22, 163, 74, .25);
    }
    .cg-enviar:hover { background: #15803d; }
    .cg-enviar[disabled] { opacity: .55; cursor: default; box-shadow: none; }
    .cg-envio-nota { margin: .5rem 0 0; font-size: .78rem; color: #9ca3af; }
    .cg-enviado {
      display: flex; align-items: center; gap: .5rem;
      border: 2px solid #16a34a; background: #f0fdf4; color: #15803d;
      border-radius: .7rem; padding: .6rem .9rem;
      font-size: .9rem; font-weight: 700; margin-bottom: 1rem;
    }
    .cg-enviado[hidden] { display: none; }
  `;
  document.head.append(estilo);
}

// ─── Carga de módulos A PRUEBA DE RUTAS (con reintento) ───

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

// ─── Ayudantes (incluidos para que agregar bloques sea fácil) ───

// Una LÁMINA (sección) del documento: su ESPACIO en px.
// El documento completo mide 820; con ancho menor se respeta.
function lamina(altoPx, anchoPx) {
  const d = document.createElement("div");
  d.className = "cg-lamina";
  if (altoPx) d.style.minHeight = Math.round(altoPx) + "px";
  if (anchoPx && anchoPx < 820) d.style.width = Math.round(anchoPx) + "px";
  return d;
}

// La CAJA de un bloque dentro de la lámina: posición y medida en
// px (las que salieron del editor). Pásasela como `contenedor`.
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

// Zona en FLUJO dentro de la lámina (altura natural): útil para
// actividades que crecen solas (preguntas, listas, arrastrar…).
function zona(laminaDestino) {
  const caja = document.createElement("div");
  caja.className = "ex-zona";
  laminaDestino.appendChild(caja);
  return caja;
}

// ─── EXAMEN: no se puede salir sin ENVIAR ───
// · Volver mientras NO se envió: avisa; si el estudiante INSISTE,
//   el examen se ENVIARÁ con lo que llevaba (lo no respondido
//   queda sin puntos = incorrecto) y recién ahí se sale.
// · Cierre/recarga sin enviar (pagehide): queda la marca local;
//   al volver a entrar la página auto-envía con lo que había.
// · Al cargar: si la nota ya venía enviada (o con respuestas de
//   una salida forzada), todo aparece bloqueado con la nota final.
let examenEnviado = false;
let notaFinal = null;

function bloquearSalida() {
  window.addEventListener("beforeunload", (e) => {
    if (examenEnviado) return;
    e.preventDefault();
    e.returnValue = "";   // el navegador pide confirmación al cerrar
  });
}

// Contenido de la pieza (lo llama la vista al abrirla)
export function render(perfil, contenedor, clase) {
  if (!perfil || !contenedor) return;
  inyectarEstilos();
  contenedor.removeAttribute("data-mco-listo");   // se marca al terminar montar()

  contenedor.innerHTML = `
    <div class="mco-generada">
      <button class="cg-volver" id="cg-volver" type="button">
        <sl-icon name="arrow-left"></sl-icon> Volver
      </button>
      <div class="cg-aviso" id="cg-aviso" hidden>
        <sl-icon name="exclamation-triangle"></sl-icon>
        Debes <b>ENVIAR el examen</b> antes de salir.
      </div>
      <div class="cg-enviado" id="cg-enviado" hidden>
        <sl-icon name="check-circle"></sl-icon>
        <span id="cg-enviado-txt">Examen enviado.</span>
      </div>
      <div class="cg-lienzo" id="cg-lienzo"></div>
      <!-- SIN caja de envío aquí: el botón «Enviar examen» lo coloca
           montar() DENTRO de la última sección -->
    </div>`;

  // Todo el montaje es asíncrono (los módulos van con cargar()):
  // si algo falta, la página AVISA en vez de morir en blanco.
  montar(perfil, contenedor, clase).catch((e) => {
    console.warn("[mco-generada]", e);
    const zona = contenedor.querySelector("#cg-lienzo");
    if (zona) {
      const fallo = document.createElement("div");
      fallo.className = "cg-fallo";
      fallo.innerHTML = "<b>No se pudo armar la examen.</b> " + (e && e.message ? e.message : e);
      zona.appendChild(fallo);
    }
  });
}

async function montar(perfil, contenedor, clase) {
  const lienzo = contenedor.querySelector("#cg-lienzo");
  const volver = contenedor.querySelector("#cg-volver");

  // ── REGISTRO COMPARTIDO DEL ENVÍO: REINICIO POR PIEZA ──
  // SIEMPRE antes de montar utilidades (botonEnviar, timer, bloques):
  // una pieza anterior ya enviada no debe contar para ESTA (sin este
  // reinicio, un examen anterior ya enviado hacía que este
  // nunca se enviara de verdad o creyera ya enviado).
  window.__mcoEnvioExamen = {
    claseId: clase && clase.id ? clase.id : null,
    mapa: {},        // qid → enviar() de cada bloque de actividad
    alEnviado: [],   // botones/timers suscritos
    enviado: false,
    enviando: false,
    puntos: null,
  };

  // ── Módulos usados (con reintento y aviso claro si falta uno) ──
  const { crearParrafo } = await cargar("../../../js/componentes/parrafo.js", ["crearParrafo"]);
  const { crearSecciones } = await cargar("../../../js/componentes/section.js", ["crearSecciones"]);
  const { crearTitulo } = await cargar("../../../js/componentes/titulo.js", ["crearTitulo"]);
  const { renderInicio } = await cargar("../../../js/components/inicio.js", ["renderInicio"]);
  const { renderUserbar } = await cargar("../../../js/components/userbar.js", ["renderUserbar"]);
  const { clasificar } = await cargar("../../../js/utils/clasificar.js", ["clasificar"]);
  const { constructorOraciones } = await cargar("../../../js/utils/constructorOraciones.js", ["constructorOraciones"]);
  const { generarRevisorOraciones } = await cargar("../../../js/utils/ingles/oracionesIngles.js", ["generarRevisorOraciones"]);
  const { finalizarExamen, marcarEnvioPendiente, obtenerNota, opcionMultiple } = await cargar("../../../js/utils/opcionMultiple.js", ["finalizarExamen", "marcarEnvioPendiente", "obtenerNota", "opcionMultiple"]);
  const { relacionar } = await cargar("../../../js/utils/relacionar.js", ["relacionar"]);

  renderUserbar(perfil, "examen-examen-trimestral");

  const aviso = contenedor.querySelector("#cg-aviso");
  const bloqueEnviado = contenedor.querySelector("#cg-enviado");
  const bloqueEnviadoTxt = contenedor.querySelector("#cg-enviado-txt");
  const esDocente = perfil.rol === "docente";
  const tituloExamen = "examen-examen-trimestral";

  // ── CAJA DE ENVÍO: se crea aquí y va DENTRO DE LA ÚLTIMA SECCIÓN ──
  // (al final de la última sección nada más; con UNA sección, al
  //  final de esa sección; con NINGUNA todavía, en el lienzo).
  const cajaEnvio = document.createElement("div");
  cajaEnvio.className = "cg-envio";
  cajaEnvio.id = "cg-envio";
  cajaEnvio.innerHTML = `
    <button class="cg-enviar" id="cg-enviar" type="button">
      <sl-icon name="send"></sl-icon> Enviar examen
    </button>
    <p class="cg-envio-nota">Al enviar se cierra la prueba, se bloquea para ti (solo revisas tu puntaje) y se habilita la flecha Volver.</p>`;
  const enviar = cajaEnvio.querySelector("#cg-enviar");

  // ── Estado del examen en cuanto carga (estudiante) ──
  // AUTO-ENVÍO SOLO CON LA MARCA ENVIADO (envío real, timer o
  // salida forzada ya enviada). Respuestas sueltas SIN enviar →
  // el examen se RETOMA: NUNCA se envía solo.
  if (!esDocente && clase && clase.id && perfil.uid) {
    try {
      const nota = await obtenerNota(perfil, clase);
      if (nota && nota.enviado) {
        // Ya enviado (envío real, timer o salida forzada ya enviada):
        // se muestra cerrado. Lo no respondido quedó sin puntos.
        examenEnviado = true;
        try { window.__mcoEnvioExamen = window.__mcoEnvioExamen || {}; window.__mcoEnvioExamen.enviado = true; } catch (e) {}
        notaFinal = typeof nota.puntos === "number" ? nota.puntos : null;
        await finalizarExamen(perfil, clase, { titulo: tituloExamen }).catch(() => {});
      } else {
        // Sin enviar: cierre/recarga queda marcado para auto-envío
        window.addEventListener("pagehide", () => {
          marcarEnvioPendiente(perfil, clase);
        });
        bloquearSalida();
      }
    } catch (e) {
      // Sin Firestore o sin permiso: el examen queda disponible y
      // con el bloqueo de salida activo (mejor esfuerzo).
      window.addEventListener("pagehide", () => {
        marcarEnvioPendiente(perfil, clase);
      });
      bloquearSalida();
    }
  }

  if (examenEnviado) {
    aviso.hidden = true;
    if (cajaEnvio) cajaEnvio.hidden = true;
    if (bloqueEnviado) {
      bloqueEnviado.hidden = false;
      bloqueEnviadoTxt.textContent =
        notaFinal == null ? "Examen enviado." : "Examen enviado · Nota final: " + notaFinal + " pts.";
    }
  }

  // ── ENVIAR: cierra la prueba y habilita la salida ──
  if (enviar) {
    enviar.addEventListener("click", async () => {
      if (examenEnviado) return;
      examenEnviado = true;
      enviar.disabled = true;
      enviar.innerHTML = '<sl-icon name="check-lg"></sl-icon> Examen enviado';
      try {
        // ENVIAR califica TAMBIÉN lo que el estudiante no envió una a
        // una: los utils de actividad se registran en
        // window.__mcoEnvioExamen (v7: botonEnviar/timer los usan).
        try {
          const reg = window.__mcoEnvioExamen;
          if (reg && reg.mapa) { for (const fn of Object.values(reg.mapa)) { try { await fn(); } catch (e) {} } }
        } catch (e) {}
        const res = await finalizarExamen(perfil, clase, { titulo: tituloExamen });
        notaFinal = res && typeof res.puntos === "number" ? res.puntos : null;
      } catch (e) { /* igual queda enviado en local */ }
      try { window.__mcoEnvioExamen = window.__mcoEnvioExamen || {}; window.__mcoEnvioExamen.enviado = true; } catch (e) {}
      aviso.hidden = true;
      if (cajaEnvio) cajaEnvio.hidden = true;
      if (bloqueEnviado) {
        bloqueEnviado.hidden = false;
        bloqueEnviadoTxt.textContent =
          notaFinal == null ? "Examen enviado." : "Examen enviado · Nota final: " + notaFinal + " pts.";
      }
      volver.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // ── VOLVER: sin enviar NO se sale; si insiste, se envía lo que hay ──
  volver.addEventListener("click", async () => {
    if (!examenEnviado && !esDocente && !(window.__mcoEnvioExamen && window.__mcoEnvioExamen.enviado)) {
      aviso.hidden = false;
      aviso.scrollIntoView({ behavior: "smooth", block: "center" });
      const salir = window.confirm(
        "No has ENVIADO el examen.\n\n" +
        "Si sales ahora, el examen se ENVIARÁ con lo que llevas " +
        "y lo que no respondiste quedará como incorrecto (0).\n\n" +
        "¿Salir y enviar?"
      );
      if (!salir) return;   // se queda a terminar
      examenEnviado = true;
      try {
        const reg = window.__mcoEnvioExamen;
        if (reg && reg.mapa) { for (const fn of Object.values(reg.mapa)) { try { await fn(); } catch (e) {} } }
      } catch (e) {}
      try { await finalizarExamen(perfil, clase, { titulo: tituloExamen }); } catch (e) {}
      try { window.__mcoEnvioExamen = window.__mcoEnvioExamen || {}; window.__mcoEnvioExamen.enviado = true; } catch (e) {}
    }
    renderUserbar(perfil);
    renderInicio(perfil, contenedor);
  });

    // ════ Sección 1 — espacio de 820×644 px ════
    const l1 = lamina(644, 820);

  // ── Título · mide 810×60 px ──
  crearTitulo({
    texto: "QUARTERLY ENGLISH EXAMINATION (A1+)",
    tamano: 35,
    alineacion: "centro",
    contenedor: pon(l1, 0, 0, 810, 60)
  });

  // ── opcionMultiple — Opción múltiple · mide 760×261 px ──
  opcionMultiple({
    indicacion: "1. Choose the correct negative sentence in the Simple Past:",
    respuestas: [
      "My best friend didn't danced a lot in her teens.",
      "My best friend didn't dance a lot in her teens.",
      "My best friend not danced a lot in her teens."
    ],
    respuestaCorrecta: 2,
    puntaje: 1,
    tipo: "examen",
    perfil: perfil,
    clase: clase,
    contenedor: pon(l1, 30, 90, 760, 261)
  });

  // ── opcionMultiple — Opción múltiple · mide 760×227 px ──
  opcionMultiple({
    indicacion: "2. Unscramble the letters to find the correct month of the year: \"NUJYAAR\"",
    respuestas: [
      "July",
      "June",
      "January"
    ],
    respuestaCorrecta: 3,
    puntaje: 1,
    tipo: "examen",
    perfil: perfil,
    clase: clase,
    contenedor: pon(l1, 30, 360, 760, 227)
  });

    // ════ Sección 2 — espacio de 820×756 px ════
    const l2 = lamina(756, 820);

  // ── Párrafo · mide 820×184 px ──
  crearParrafo({
    texto: "Luis Salvador Efraín Salazar Arrué, known as Salarrué, was born on October 22nd, 1899, in Sonzacate, Sonsonate. He studied at the Corcoran School of Art in Washington, D.C. In 1922, he married Zélie Lardé, with whom he had three daughters. He worked as an editor for the newspaper Patria and wrote famous books like 'Cuentos de Cipotes' and 'Cuentos de Barro'.",
    tamano: 20,
    alineacion: "justificado",
    contenedor: pon(l2, 0, 0, 820, 184)
  });

  // ── opcionMultiple — Opción múltiple · mide 820×221 px ──
  opcionMultiple({
    indicacion: "3. Salarrué was born in Sonzacate, Sonsonate, on October 22nd, 1899.",
    respuestas: [
      "True",
      "False"
    ],
    respuestaCorrecta: 1,
    puntaje: 1,
    tipo: "examen",
    perfil: perfil,
    clase: clase,
    contenedor: pon(l2, 0, 220, 820, 221)
  });

  // ── opcionMultiple — Opción múltiple · mide 820×221 px ──
  opcionMultiple({
    indicacion: "4. Salarrué had five daughters with his wife Zélie Lardé.",
    respuestas: [
      "True",
      "False"
    ],
    respuestaCorrecta: 2,
    puntaje: 1,
    tipo: "examen",
    perfil: perfil,
    clase: clase,
    contenedor: pon(l2, 0, 470, 820, 221)
  });

    // ════ Sección 3 — espacio de 820×991 px ════
    const l3 = lamina(991, 820);

  // ── relacionar — Relacionar columnas · mide 820×486 px ──
  relacionar({
    indicacion: "5. Match the food description on the Left with the correct word on the Right:",
    izquierda: [
      "A milk-derived product used in pupusas and pizza.",
      "A firm, round fruit with juicy flesh and red skin.",
      "An orange vegetable commonly used in salads or soups.",
      "A popular breakfast food served in a bowl with milk."
    ],
    derecha: [
      "Cheese",
      "Apple",
      "Carrot",
      "Cereal"
    ],
    puntaje: 1,
    tipo: "examen",
    perfil: perfil,
    clase: clase,
    contenedor: pon(l3, 0, 0, 820, 486)
  });

  // ── relacionar — Relacionar columnas · mide 820×432 px ──
  relacionar({
    indicacion: "6. Match the base form of the verb on the Left with its Simple Past on the Right:",
    izquierda: [
      "Write",
      "Eat",
      "Go",
      "Take"
    ],
    derecha: [
      "Wrote",
      "Ate",
      "Went",
      "Took"
    ],
    puntaje: 1,
    tipo: "examen",
    perfil: perfil,
    clase: clase,
    contenedor: pon(l3, 0, 500, 820, 432)
  });

    // ════ Sección 4 — espacio de 820×587 px ════
    const l4 = lamina(587, 820);

  // ── clasificar — Tabla de clasificación · mide 820×468 px ──
  clasificar({
    categorias: [
      {
        nombre: "Countable",
        elementos: [
          "Apple",
          "Sandwish"
        ]
      },
      {
        nombre: "Uncountable",
        elementos: [
          "Water",
          "Fluor"
        ]
      }
    ],
    puntaje: 1,
    colorSeccion: "#4f46e5",
    tipo: "examen",
    perfil: perfil,
    clase: clase,
    contenedor: pon(l4, 0, 0, 820, 468)
  });

    // ════ Sección 5 — espacio de 820×822 px ════
    const l5 = lamina(822, 820);

  // ── oracionesIngles — Revisor de oraciones (inglés/español) · mide 810×326 px ──
  generarRevisorOraciones({
    indicacion: "8. Answer the questions in the affirmative short form:\nDid the kids visit the museum?",
    cantidadInputs: 1,
    puntajeTotal: 1,
    estructuraEsperada: "",
    idioma: "en",
    usarApiExterna: true,
    colorTarjeta: "#7c3aed",
    contenedor: pon(l5, 0, 0, 810, 326)
  });

  // ── oracionesIngles — Revisor de oraciones (inglés/español) · mide 810×353 px ──
  generarRevisorOraciones({
    indicacion: "9. Read the answer and write the corresponding Wh- Question in Simple Past:\nI lived in San Salvador City when I studied at university.",
    cantidadInputs: 1,
    puntajeTotal: 1,
    estructuraEsperada: "",
    idioma: "en",
    usarApiExterna: true,
    colorTarjeta: "#7c3aed",
    contenedor: pon(l5, 0, 350, 810, 353)
  });

    // ════ Sección 6 — espacio de 820×448 px ════
    const l6 = lamina(448, 820);

  // ── constructorOraciones — Construye la oración · mide 820×361 px ──
  constructorOraciones({
    indicacion: "10. Unscramble the words to make a correct Simple Past sentence:",
    oraciones: [
      "She / played / for the / national team"
    ],
    separador: "/",
    colorTarjeta: "#0f766e",
    puntaje: 1,
    tipo: "examen",
    perfil: perfil,
    clase: clase,
    contenedor: pon(l6, 0, 30, 820, 361)
  });

  // ════════════════════════════════════════════════════════════
  //  TUS SECCIONES — la lista que llena el editor. A mano: crea
  //  láminas (const lN = lamina(alto, 820);) y añádelas aquí.
  // ════════════════════════════════════════════════════════════
  const SECCIONES = [l1, l2, l3, l4, l5, l6];

  // ── BOTÓN «Enviar examen»: AL FINAL DE LA ÚLTIMA SECCIÓN nada más ──
  // (con UNA sección: final de esa sección; con NINGUNA todavía:
  //  queda en el lienzo hasta que agregues la primera).
  (SECCIONES.length ? SECCIONES[SECCIONES.length - 1] : lienzo).append(cajaEnvio);

  // ── Documento final: CORRIDO con 1 sección; con 2 o más, una a la vez ──
  crearSecciones({
    contenedor: lienzo,
    secciones: SECCIONES,
  });

  contenedor.setAttribute("data-mco-listo", "1");   // TODO quedó montado
}