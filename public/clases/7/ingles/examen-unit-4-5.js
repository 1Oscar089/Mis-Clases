// ============================================================
// EXAMEN — Mis Clases Online
// Tipo: examen · ID: examen-ingles-7-u1
// Título: English Exam — 7th Grade
// Grado: 7 · Materia: inglés (inglés total, 7.º grado)
//
// CONTENIDO — 10 ítems × 1 punto = 10 puntos:
//   Parte 1 · Opción múltiple (3 × 1 pt)
//     1. Cuartos de la casa (kitchen / bedroom / bathroom / garage)
//     2. There is / There are + adverbio de lugar (in / on / at)
//     3. Presente simple — pregunta (Does / Do / Is / Are)
//   Parte 2 · Respuesta simple (3 × 1 pt) + Relacionar (1 pt)
//     4. Sustantivos plurales regulares (family → families)
//     5. Días de la semana (after Friday → Saturday)
//     6. Presente simple — negativo (don't / do not)
//     7. Decir la hora: relojes dibujados con el visual reloj.js
//        (A = 7:00, B = 9:30, C = 2:15) + relacionar Clock A/B/C ↔
//        It's seven o'clock / half past nine / a quarter past two
//   Parte 3 · Blank con guía de audio (2 huecos × 1 pt) + Clasificar (1 pt)
//     8-9. Listening «Tom's day» (utils/tts.js, guía EN inglés):
//          actividades diarias + partes del día.
//          Huecos: gets up (presente simple positivo) · evening.
//     10. Clasificar actividades diarias por parte del día
//         (Morning / Afternoon / Night · 9 tarjetas · colorSeccion
//         SIN pasar → usa el PREDEFINIDO y FIJO #4f46e5 del util).
//
// CÓMO USARLO
//   1. Guarda este archivo (con el nombre del ID) 3 carpetas dentro
//      de donde está js/:  clases/7/ingles/examen-ingles-7-u1.js
//      (desde ahí las rutas ../../../js/… apuntan a la carpeta js/
//      del proyecto).
//   2. En la app: Docente → Crear → Examen con el MISMO id
//      (examen-ingles-7-u1), grado 7, materia ingles. Se abre desde
//      «Exámenes» con render(perfil, contenedor, clase).
//   3. Nota final = suma de los 10 ítems (máximo 10). Al enviar, el
//      examen se bloquea solo para ese estudiante (solo puede revisar
//      su puntaje) y los ítems no respondidos quedan en 0.
//
// CARGA A PRUEBA DE RUTAS: los módulos NO se importan arriba (un
// archivo faltante mataba la página entera con «Failed to fetch…»).
// Se cargan con cargar(), que reintenta sin caché, verifica las
// exportaciones y avisa el motivo exacto.
//
// NOTA DE DISEÑO: los bloques van EN FLUJO dentro de su lámina
// (altura natural, sin solaparse en celulares). Los ayudantes
// pon() y fondo() quedan disponibles por si se agrega un bloque
// con posición fija del editor.
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

    /* Examen de inglés: relojes de la parte «decir la hora» */
    .ex-zona { margin: 0; }
    .ex-relojes {
      display: flex; flex-wrap: wrap; align-items: flex-end;
      justify-content: center; gap: 1.4rem 2.2rem;
      margin: .9rem 0 1.1rem;
    }
    .ex-reloj-figura {
      display: flex; flex-direction: column; align-items: center;
      gap: .3rem; width: 150px; max-width: 30%;
    }
    .ex-reloj-figura svg { width: 100%; height: auto; }
    .ex-reloj-etiqueta {
      font-size: 1.02rem; font-weight: 800; color: #4b5563;
      background: #f3f4f6; border: 1px solid #e5e7eb;
      border-radius: 999px; padding: .1rem .85rem;
    }
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

// Zona en FLUJO para un bloque de actividad (altura natural).
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
      <div class="cg-envio" id="cg-envio">
        <button class="cg-enviar" id="cg-enviar" type="button">
          <sl-icon name="send"></sl-icon> Enviar examen
        </button>
        <p class="cg-envio-nota">Al enviar se cierra la prueba, se bloquea para ti (solo revisas tu puntaje) y se habilita la flecha Volver.</p>
      </div>
    </div>`;

  // Todo el montaje es asíncrono (los módulos van con cargar()):
  // si algo falta, la página AVISA en vez de morir en blanco.
  montar(perfil, contenedor, clase).catch((e) => {
    console.warn("[mco-generada]", e);
    const zonaFallo = contenedor.querySelector("#cg-lienzo");
    if (zonaFallo) {
      const fallo = document.createElement("div");
      fallo.className = "cg-fallo";
      fallo.innerHTML = "<b>No se pudo armar el examen.</b> " + (e && e.message ? e.message : e);
      zonaFallo.appendChild(fallo);
    }
  });
}

async function montar(perfil, contenedor, clase) {
  const lienzo = contenedor.querySelector("#cg-lienzo");
  const volver = contenedor.querySelector("#cg-volver");

  // ── Módulos usados (con reintento y aviso claro si falta uno) ──
  const { crearSecciones } = await cargar("../../../js/componentes/section.js", ["crearSecciones"]);
  const { crearTitulo } = await cargar("../../../js/componentes/titulo.js", ["crearTitulo"]);
  const { crearSubtitulo } = await cargar("../../../js/componentes/subtitulo.js", ["crearSubtitulo"]);
  const { crearParrafo } = await cargar("../../../js/componentes/parrafo.js", ["crearParrafo"]);
  const { renderInicio } = await cargar("../../../js/components/inicio.js", ["renderInicio"]);
  const { renderUserbar } = await cargar("../../../js/components/userbar.js", ["renderUserbar"]);
  const { opcionMultiple, finalizarExamen, marcarEnvioPendiente, obtenerNota } =
    await cargar("../../../js/utils/opcionMultiple.js", ["opcionMultiple", "finalizarExamen", "marcarEnvioPendiente", "obtenerNota"]);
  const { respuestaSimple } = await cargar("../../../js/utils/respuestaSimple.js", ["respuestaSimple"]);
  const { relacionar } = await cargar("../../../js/utils/relacionar.js", ["relacionar"]);
  const { blank } = await cargar("../../../js/utils/blank.js", ["blank"]);
  const { clasificar } = await cargar("../../../js/utils/clasificar.js", ["clasificar"]);
  const { renderTTS } = await cargar("../../../js/utils/tts.js", ["renderTTS"]);
  const { dibujarReloj } = await cargar("../../../recursos/js/visuales/reloj.js", ["dibujarReloj"]);

  const esDocente = perfil.rol === "docente";
  const tituloExamen = "English Exam — 7th Grade";

  renderUserbar(perfil, tituloExamen);

  const aviso = contenedor.querySelector("#cg-aviso");
  const enviar = contenedor.querySelector("#cg-enviar");
  const bloqueEnviado = contenedor.querySelector("#cg-enviado");
  const bloqueEnviadoTxt = contenedor.querySelector("#cg-enviado-txt");
  const bloqueEnvio = contenedor.querySelector("#cg-envio");

  // ── Estado del examen en cuanto carga (estudiante) ──
  if (!esDocente && clase && clase.id && perfil.uid) {
    try {
      const nota = await obtenerNota(perfil, clase);
      const respondio = !!(nota && nota.preguntas && Object.keys(nota.preguntas).length);
      if ((nota && nota.enviado) || respondio) {
        // Ya enviado — o salió a la fuerza la vez pasada: se cierra
        // ahora (auto-envío). Lo no respondido quedó sin puntos.
        examenEnviado = true;
        try { window.__mcoEnvioExamen = window.__mcoEnvioExamen || {}; window.__mcoEnvioExamen.enviado = true; } catch (e) {}
        notaFinal = nota ? nota.puntos : null;
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
    if (bloqueEnvio) bloqueEnvio.hidden = true;
    if (bloqueEnviado) {
      bloqueEnviado.hidden = false;
      bloqueEnviadoTxt.textContent =
        notaFinal == null ? "Examen enviado." : "Examen enviado · Nota final: " + notaFinal + " pts.";
    }
  }

  // ── ENVIAR: califica TODO (lo no enviado también) y cierra ──
  if (enviar) {
    enviar.addEventListener("click", async () => {
      if (examenEnviado) return;
      examenEnviado = true;
      enviar.disabled = true;
      enviar.innerHTML = '<sl-icon name="check-lg"></sl-icon> Examen enviado';
      try {
        // ENVIAR califica TAMBIÉN lo que el estudiante no envió una a
        // una: los utils de actividad se registran en
        // window.__mcoEnvioExamen (botonEnviar/timer los usan).
        try {
          const reg = window.__mcoEnvioExamen;
          if (reg && reg.mapa) { for (const fn of Object.values(reg.mapa)) { try { await fn(); } catch (e) {} } }
        } catch (e) {}
        const res = await finalizarExamen(perfil, clase, { titulo: tituloExamen });
        notaFinal = res && typeof res.puntos === "number" ? res.puntos : null;
      } catch (e) { /* igual queda enviado en local */ }
      try { window.__mcoEnvioExamen = window.__mcoEnvioExamen || {}; window.__mcoEnvioExamen.enviado = true; } catch (e) {}
      aviso.hidden = true;
      if (bloqueEnvio) bloqueEnvio.hidden = true;
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

  // ════════════════════════════════════════════════════════════
  //  LÁMINA 1 — Part 1 · Multiple choice (ítems 1-3, 3 puntos)
  // ════════════════════════════════════════════════════════════
  const l1 = lamina(0, 820);

  crearTitulo({ texto: "English Exam — 7th Grade", contenedor: l1 });
  crearParrafo({
    texto: "7th Grade English · Total: 10 points — 1 point per item. Answer ALL the parts, then click Enviar examen.",
    contenedor: l1,
  });
  crearSubtitulo({ texto: "Part 1 · Multiple choice — 3 points", orden: 1, contenedor: l1 });

  // ── Ítem 1 · Cuartos principales de la casa (1 pt) ──
  opcionMultiple({
    contenedor: zona(l1),
    perfil, clase, tipo: "examen",
    id: "ex7u1-om1", puntaje: 1,
    indicacion: "1. We cook dinner in the ___.",
    respuestas: ["kitchen", "bedroom", "bathroom", "garage"],
    respuestaCorrecta: 1,
  });

  // ── Ítem 2 · There is / There are + adverbio de lugar (1 pt) ──
  opcionMultiple({
    contenedor: zona(l1),
    perfil, clase, tipo: "examen",
    id: "ex7u1-om2", puntaje: 1,
    indicacion: "2. Complete the sentence: ___ a sofa ___ the living room.",
    respuestas: ["There is / in", "There are / in", "There is / on", "There is / at"],
    respuestaCorrecta: 1,
  });

  // ── Ítem 3 · Presente simple — pregunta (1 pt) ──
  opcionMultiple({
    contenedor: zona(l1),
    perfil, clase, tipo: "examen",
    id: "ex7u1-om3", puntaje: 1,
    indicacion: "3. ___ your father wash the car on Sundays?",
    respuestas: ["Does", "Do", "Is", "Are"],
    respuestaCorrecta: 1,
  });

  // ════════════════════════════════════════════════════════════
  //  LÁMINA 2 — Part 2 · Write the answer + Match the clocks
  //              (ítems 4-7, 4 puntos)
  // ════════════════════════════════════════════════════════════
  const l2 = lamina(0, 820);

  crearSubtitulo({ texto: "Part 2 · Write the answer — 3 points", orden: 1, contenedor: l2 });

  // ── Ítem 4 · Sustantivos plurales regulares (1 pt) ──
  respuestaSimple({
    contenedor: zona(l2),
    perfil, clase, tipo: "examen",
    id: "ex7u1-rs1", puntaje: 1,
    indicacion: "4. Write the PLURAL of this noun: family",
    respuestaCorrecta: ["families"],
  });

  // ── Ítem 5 · Días de la semana (1 pt) ──
  respuestaSimple({
    contenedor: zona(l2),
    perfil, clase, tipo: "examen",
    id: "ex7u1-rs2", puntaje: 1,
    indicacion: "5. What day comes after Friday?",
    respuestaCorrecta: ["Saturday"],
  });

  // ── Ítem 6 · Presente simple — negativo (1 pt) ──
  respuestaSimple({
    contenedor: zona(l2),
    perfil, clase, tipo: "examen",
    id: "ex7u1-rs3", puntaje: 1,
    indicacion: "6. Make the sentence NEGATIVE: They play tennis on Monday. Write the missing word: They ___ play tennis on Monday.",
    respuestaCorrecta: ["don't", "dont", "do not"],
  });

  // ── Ítem 7 · Decir la hora, con imágenes de reloj (1 pt) ──
  // Relojes dibujados con el visual reloj.js (SVG puro, sin archivos
  // externos): A = 7:00 · B = 9:30 · C = 2:15. Debajo, el bloque
  // relacionar empareja Clock A/B/C con la hora escrita (las dos
  // columnas se mezclan solas, anti-copia).
  crearSubtitulo({ texto: "Part 2 · Match the clocks — 1 point", orden: 1, contenedor: l2 });
  crearParrafo({
    texto: "7. Look at the clocks. Match each clock (A, B, C) with the correct time.",
    contenedor: l2,
  });

  const filaRelojes = document.createElement("div");
  filaRelojes.className = "ex-relojes";
  [["A", 7, 0], ["B", 9, 30], ["C", 2, 15]].forEach(([letra, hora, minutos]) => {
    const figura = document.createElement("div");
    figura.className = "ex-reloj-figura";
    const etiqueta = document.createElement("span");
    etiqueta.className = "ex-reloj-etiqueta";
    etiqueta.textContent = letra;
    figura.append(dibujarReloj({ hora, minutos, tamano: 150 }), etiqueta);
    filaRelojes.append(figura);
  });
  l2.append(filaRelojes);

  relacionar({
    contenedor: zona(l2),
    perfil, clase, tipo: "examen",
    id: "ex7u1-rel", puntaje: 1,
    indicacion: "Choose the correct time for each clock.",
    izquierda: ["Clock A", "Clock B", "Clock C"],
    derecha: ["It's seven o'clock.", "It's half past nine.", "It's a quarter past two."],
  });

  // ════════════════════════════════════════════════════════════
  //  LÁMINA 3 — Part 3 · Listening + complete + classify
  //              (ítems 8-10, 3 puntos)
  // ════════════════════════════════════════════════════════════
  const l3 = lamina(0, 820);

  crearSubtitulo({ texto: "Part 3 · Listening, complete and classify — 3 points", orden: 1, contenedor: l3 });

  // ── Ítems 8-9 · Blank con guía de audio TTS (2 × 1 pt) ──
  // El audio-guía (utils/tts.js, inglés) lee el día de Tom: el
  // estudiante escucha y completa los DOS espacios (1 punto cada uno).
  crearParrafo({
    texto: "8-9. Listen to the guide and complete the paragraph with the words you hear.",
    contenedor: l3,
  });
  renderTTS(
    zona(l3),
    "en",
    "Hi! Let me tell you about Tom's day. Tom gets up at six o'clock in the morning. Then he takes a shower and has breakfast with his family. He goes to school at half past seven. In the afternoon, he does his homework and plays soccer with his friends. In the evening, he has dinner, watches TV, and goes to bed at nine o'clock.",
    { titulo: "Listening guide · Tom's day" }
  );
  blank({
    contenedor: zona(l3),
    perfil, clase, tipo: "examen",
    id: "ex7u1-blank", puntaje: 2,
    texto: "Tom's Day. Every morning, Tom [[gets up|getsup]] at six o'clock and takes a shower. He has breakfast with his family and goes to school at half past seven. In the afternoon, he does his homework and plays soccer. In the [[evening]], he has dinner, watches TV and goes to bed at nine o'clock.",
  });

  // ── Ítem 10 · Clasificar actividades diarias (1 pt) ──
  // 9 tarjetas mezcladas → arrastrar (o tocar) a Morning / Afternoon /
  // Night. Puntaje 1 repartido entre las 9 (el color de la sección NO
  // se pasa: usa el PREDEFINIDO y FIJO #4f46e5 del util).
  crearParrafo({
    texto: "10. Classify the daily activities in the correct part of the day.",
    contenedor: l3,
  });
  clasificar({
    contenedor: zona(l3),
    perfil, clase, tipo: "examen",
    id: "ex7u1-clas", puntaje: 1,
    categorias: [
      { nombre: "Morning", elementos: ["get dressed", "brush my teeth", "eat breakfast"] },
      { nombre: "Afternoon", elementos: ["eat lunch", "do homework", "play soccer"] },
      { nombre: "Night", elementos: ["have dinner", "watch TV", "go to bed"] },
    ],
  });

  // ── Documento final: 3 láminas → una a la vez con flechas ──
  crearSecciones({
    contenedor: lienzo,
    secciones: [l1, l2, l3],
  });

  contenedor.setAttribute("data-mco-listo", "1");   // TODO quedó montado
}