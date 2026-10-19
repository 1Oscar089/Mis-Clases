// ============================================================
// tts.js — Reproductor de Texto a Voz (TTS) · Mis Clases Online
// ------------------------------------------------------------
// Usa la Web Speech API nativa del navegador (speechSynthesis):
//   • Sin librerías externas, sin servicios de pago y sin claves.
//   • Funciona en Chrome, Edge, Firefox y Safari (escritorio y móvil).
//   • Prefiere las voces instaladas en el dispositivo (funciona sin
//     internet); si no hay, usa la voz predeterminada del sistema.
//
// Uso desde una clase:
//   import { renderTTS } from '/js/utils/tts.js';
//
//   renderTTS(zona, 'es', 'Texto que se leerá en voz alta', {
//     titulo: 'Escuchar la lectura',   // opcional
//     alTerminar: () => { ... }        // opcional: avisa cuando acaba todo
//   });
//
// Coloca el reproductor (play/pausa, detener, ±3s, velocidad y barra
// de progreso) justo donde se llame y devuelve un controlador:
//   { raiz, reproducir, pausar, detener, estaReproduciendo() }
// Solo un reproductor suena a la vez; los demás se detienen solos.
// ============================================================

// ---------- estilos propios del módulo (convención MCO) ----------
let estilosInyectados = false;
function inyectarEstilos() {
  if (estilosInyectados) return;
  estilosInyectados = true;
  const estilo = document.createElement('style');
  estilo.id = 'mco-estilos-tts';
  estilo.textContent = `
    .mco-tts { background:#f5f3ff; border:1px solid #e9d5ff; border-radius:16px; padding:14px 16px; margin:14px 0; }
    .mco-tts-cab { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
    .mco-tts-icono { color:#7c3aed; display:flex; flex:none; }
    .mco-tts-titulo { font-weight:700; color:#4c1d95; font-size:.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .mco-tts-tiempo { margin-left:auto; color:#6b7280; font-size:.85rem; font-variant-numeric:tabular-nums; white-space:nowrap; }
    .mco-tts-barra { position:relative; height:8px; background:#ede9fe; border-radius:999px; cursor:pointer; margin-bottom:12px; }
    .mco-tts-barra-fill { position:absolute; top:0; bottom:0; left:0; width:0%; background:#7c3aed; border-radius:999px; }
    .mco-tts-barra-punto { position:absolute; top:50%; left:0%; width:14px; height:14px; background:#7c3aed; border:2px solid #fff; border-radius:50%; transform:translate(-50%,-50%); box-shadow:0 1px 4px rgba(76,29,149,.4); }
    .mco-tts-controles { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .mco-tts-btn { border:none; cursor:pointer; font-family:inherit; }
    .mco-tts-btn:focus-visible { outline:2px solid #7c3aed; outline-offset:2px; }
    .mco-tts-btn:disabled { cursor:not-allowed; }
    .mco-tts-btn-sec { min-width:46px; height:44px; padding:0 12px; border-radius:999px; background:#fff; border:1px solid #ddd6fe; color:#5b21b6; font-weight:700; font-size:.78rem; display:inline-flex; align-items:center; justify-content:center; gap:4px; transition:background .15s, transform .1s; }
    .mco-tts-btn-sec:hover { background:#ede9fe; }
    .mco-tts-btn-sec:active { transform:scale(.95); }
    .mco-tts-btn-principal { width:54px; height:54px; border-radius:50%; background:#7c3aed; color:#fff; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(124,58,237,.35); transition:background .15s, transform .1s; }
    .mco-tts-btn-principal:hover { background:#6d28d9; }
    .mco-tts-btn-principal:active { transform:scale(.93); }
    .mco-tts-vel { height:44px; border-radius:999px; border:1px solid #ddd6fe; background:#fff; color:#5b21b6; font-weight:700; font-size:.85rem; padding:0 14px; cursor:pointer; font-family:inherit; margin-left:auto; }
    .mco-tts-vel:focus-visible { outline:2px solid #7c3aed; outline-offset:2px; }
    .mco-tts-nota { margin-top:10px; font-size:.8rem; color:#b45309; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:8px 10px; }
    .mco-tts-nota-error { color:#b91c1c; background:#fef2f2; border-color:#fecaca; }
    @media (max-width: 420px) {
      .mco-tts { padding:12px; }
      .mco-tts-btn-principal { width:50px; height:50px; }
      .mco-tts-btn-sec { min-width:42px; height:40px; padding:0 9px; }
      .mco-tts-vel { height:40px; padding:0 10px; }
    }
  `;
  document.head.appendChild(estilo);
}

// ---------- constantes e íconos ----------
const VELOCIDADES = [0.25, 0.5, 0.75, 1, 1.25, 1.5];
const CPS_BASE = 14;        // velocidad de lectura estimada (caracteres/segundo a velocidad 1)
const MAX_FRAGMENTO = 180;  // fragmentos cortos: evita el corte de Chrome en audios largos (~15 s)

const SVG = {
  altavoz: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.05c1.5-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  pausa: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
  detener: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>',
  atras: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M11.5 18.5V5.5L3 12l8.5 6.5zm9 0V5.5L12 12l8.5 6.5z"/></svg>',
  adelante: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12.5 5.5v13L21 12l-8.5-6.5zm-9 13V5.5L12 12l-8.5 6.5z"/></svg>'
};

// ---------- estado global del módulo ----------
let jugadorActivo = null;            // solo un reproductor suena a la vez
let limpiezaGlobalRegistrada = false;

function registrarLimpiezaGlobal() {
  if (limpiezaGlobalRegistrada || typeof window === 'undefined') return;
  limpiezaGlobalRegistrada = true;
  window.addEventListener('pagehide', function () {
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignorar */ }
  });
}

// ---------- utilidades ----------
function clamp(x, minimo, maximo) { return Math.min(maximo, Math.max(minimo, x)); }

function limpiarTexto(entrada) {
  let texto = Array.isArray(entrada) ? entrada.join('. ') : String(entrada == null ? '' : entrada);
  if (/<[a-z][\s\S]*>/i.test(texto)) {
    const caja = document.createElement('div');
    caja.innerHTML = texto; // convierte entidades y descarta etiquetas
    texto = caja.textContent || '';
  }
  return texto.replace(/\s+/g, ' ').trim();
}

function partirEnFragmentos(texto, maximo) {
  const fragmentos = [];
  const empujar = function (t) { const s = t.trim(); if (s) fragmentos.push(s); };
  // Corte por oraciones sin lookbehind (compatible con navegadores antiguos)
  const bruto = texto.split(/([.!?:;]+)(\s+|$)/);
  const oraciones = [];
  for (let i = 0; i < bruto.length; i += 2) {
    let s = bruto[i] || '';
    if (bruto[i + 1]) s += bruto[i + 1];
    s = s.trim();
    if (s) oraciones.push(s);
  }
  if (!oraciones.length) oraciones.push(texto);
  let actual = '';
  for (let j = 0; j < oraciones.length; j++) {
    const oracion = oraciones[j];
    if (oracion.length > maximo) {
      if (actual) { empujar(actual); actual = ''; }
      let restante = oracion;
      while (restante.length > maximo) {
        let corte = restante.lastIndexOf(' ', maximo);
        if (corte <= 0) corte = maximo;
        empujar(restante.slice(0, corte));
        restante = restante.slice(corte).trimStart();
      }
      if (restante) actual = restante;
      continue;
    }
    if (actual && (actual + ' ' + oracion).length > maximo) { empujar(actual); actual = ''; }
    actual = actual ? actual + ' ' + oracion : oracion;
  }
  if (actual) empujar(actual);
  return fragmentos.length ? fragmentos : [texto];
}

function formatearTiempo(segundos) {
  const s = Math.max(0, Math.round(segundos));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function crearNodo(etiqueta, clase, htmlInterno) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (htmlInterno != null) nodo.innerHTML = htmlInterno; // solo HTML interno controlado (íconos SVG)
  return nodo;
}

// ---------- API principal ----------
export function renderTTS(contenedorDestino, idioma, texto, opciones = {}) {
  if (typeof opciones === 'string') opciones = { titulo: opciones };
  const titulo = opciones.titulo || 'Escuchar';
  const alTerminar = typeof opciones.alTerminar === 'function' ? opciones.alTerminar : null;
  if (typeof contenedorDestino === 'string') contenedorDestino = document.querySelector(contenedorDestino);
  if (!contenedorDestino) contenedorDestino = document.createElement('div'); // queda fuera del DOM

  inyectarEstilos();
  registrarLimpiezaGlobal();

  const soportado = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const idiomaNormalizado = String(idioma || 'es').trim() || 'es';
  const textoLimpio = limpiarTexto(texto);
  const fragmentos = textoLimpio ? partirEnFragmentos(textoLimpio, MAX_FRAGMENTO) : [];

  // ----- interfaz -----
  const raiz = crearNodo('div', 'mco-tts');
  const cabecera = crearNodo('div', 'mco-tts-cab');
  const icono = crearNodo('span', 'mco-tts-icono', SVG.altavoz);
  const rotulo = crearNodo('span', 'mco-tts-titulo');
  rotulo.textContent = titulo;
  const tiempo = crearNodo('span', 'mco-tts-tiempo', '0:00 / 0:00');
  cabecera.append(icono, rotulo, tiempo);

  const barra = crearNodo('div', 'mco-tts-barra');
  barra.setAttribute('role', 'slider');
  barra.setAttribute('aria-label', 'Progreso de la lectura');
  barra.setAttribute('aria-valuemin', '0');
  barra.setAttribute('aria-valuemax', '100');
  const barraLlena = crearNodo('div', 'mco-tts-barra-fill');
  const barraPunto = crearNodo('div', 'mco-tts-barra-punto');
  barra.append(barraLlena, barraPunto);

  const controles = crearNodo('div', 'mco-tts-controles');
  const btnAtras = crearNodo('button', 'mco-tts-btn mco-tts-btn-sec', SVG.atras + '<span>3s</span>');
  btnAtras.type = 'button';
  btnAtras.setAttribute('aria-label', 'Retroceder 3 segundos');
  const btnPrincipal = crearNodo('button', 'mco-tts-btn mco-tts-btn-principal', SVG.play);
  btnPrincipal.type = 'button';
  btnPrincipal.setAttribute('aria-label', 'Reproducir');
  const btnAdelante = crearNodo('button', 'mco-tts-btn mco-tts-btn-sec', '<span>3s</span>' + SVG.adelante);
  btnAdelante.type = 'button';
  btnAdelante.setAttribute('aria-label', 'Adelantar 3 segundos');
  const btnDetener = crearNodo('button', 'mco-tts-btn mco-tts-btn-sec', SVG.detener);
  btnDetener.type = 'button';
  btnDetener.setAttribute('aria-label', 'Detener');
  const selVel = crearNodo('select', 'mco-tts-vel');
  selVel.setAttribute('aria-label', 'Velocidad de lectura');
  VELOCIDADES.forEach(function (v) {
    const opcion = document.createElement('option');
    opcion.value = String(v);
    opcion.textContent = v + '×';
    if (v === 1) opcion.selected = true;
    selVel.appendChild(opcion);
  });
  controles.append(btnAtras, btnPrincipal, btnAdelante, btnDetener, selVel);

  const nota = crearNodo('div', 'mco-tts-nota');
  nota.hidden = true;

  raiz.append(cabecera, barra, controles, nota);
  contenedorDestino.appendChild(raiz);

  // ----- estado del reproductor -----
  let cps = CPS_BASE;              // calibración de caracteres/segundo (se afina al leer)
  let velocidad = 1;
  let estado = 'detenido';         // 'detenido' | 'reproduciendo' | 'pausado'
  let idxFragmento = 0;
  let desplazamiento = 0;          // carácter desde donde se hablará el fragmento actual
  let desplazamientoInicial = 0;   // desplazamiento con el que inició la utterance actual
  let desplazamientoEnVivo = 0;    // último charIndex reportado por onboundary
  let baseContenido = 0;           // posición (segundos de contenido) al iniciar el fragmento
  let posContenido = 0;            // posición actual en segundos de contenido
  let inicioTickWc = 0;            // performance.now() al (re)iniciar el tick
  let inicioFragmentoWc = 0;       // para calibrar la duración real
  let ultimaAccionWc = 0;
  let generacion = 0;              // invalida los callbacks de utterances canceladas
  let hablandoInternamente = false;
  let erroresSeguidos = 0;
  let intentosSinAudio = 0;
  let calibrado = false;
  let voz = null;
  let sinVocesSistema = false;
  let timerTick = null;
  let timerKeepAlive = null;
  let timerHabla = null;

  // ----- tiempos (la Web Speech API no da duración real: se estima y calibra) -----
  const durFragmento = function (i) { return Math.max(0.7, fragmentos[i].length / cps); };
  const inicioDeFragmento = function (i) {
    let t = 0;
    for (let k = 0; k < i; k++) t += durFragmento(k);
    return t;
  };
  const duracionTotal = function () { return inicioDeFragmento(fragmentos.length); };
  const contenidoAWall = function (t) { return t / velocidad; };

  // ----- voces -----
  function cargarVoces() {
    if (!soportado) return;
    let todas = [];
    try { todas = window.speechSynthesis.getVoices() || []; } catch (e) { /* ignorar */ }
    if (todas.length) sinVocesSistema = false;
    const norm = function (v) { return String(v.lang || '').toLowerCase().replace('_', '-'); };
    const baseIdioma = idiomaNormalizado.toLowerCase().replace('_', '-');
    const corta = baseIdioma.split('-')[0];
    const exactas = todas.filter(function (v) { return norm(v) === baseIdioma; });
    const mismas = todas.filter(function (v) { return norm(v).split('-')[0] === corta; });
    const grupo = exactas.length ? exactas : mismas;
    if (!grupo.length) { voz = null; actualizarNota(); return; }
    if (voz && grupo.indexOf(voz) !== -1) { actualizarNota(); return; }
    // localService primero: funciona aunque no haya internet
    grupo.sort(function (a, b) {
      return (Number(b.localService) - Number(a.localService)) || (Number(b.default) - Number(a.default));
    });
    voz = grupo[0];
    actualizarNota();
  }

  function mostrarNota(mensaje, esError) {
    nota.hidden = false;
    nota.textContent = mensaje;
    nota.classList.toggle('mco-tts-nota-error', !!esError);
  }

  function actualizarNota() {
    let mensaje = '';
    let bloquear = false;
    if (!soportado) {
      mensaje = 'Tu navegador no admite lectura de voz. Prueba con Chrome, Edge, Firefox o Safari actualizados.';
      bloquear = true;
    } else if (!fragmentos.length) {
      mensaje = 'No hay texto para leer.';
      bloquear = true;
    } else {
      let voces = [];
      try { voces = window.speechSynthesis.getVoices() || []; } catch (e) { /* ignorar */ }
      if (sinVocesSistema) {
        mensaje = 'Este navegador no tiene voces instaladas. Instala una voz del sistema o usa Chrome o Edge.';
        bloquear = true;
      } else if (!voces.length) {
        mensaje = 'Cargando voces del sistema…';
      } else if (!voz) {
        mensaje = 'No hay voz para «' + idiomaNormalizado + '»; se usará la voz predeterminada del navegador.';
      }
    }
    nota.hidden = !mensaje;
    if (mensaje) { nota.textContent = mensaje; nota.classList.remove('mco-tts-nota-error'); }
    [btnPrincipal, btnAtras, btnAdelante, btnDetener, selVel].forEach(function (n) { n.disabled = bloquear; });
    barra.style.pointerEvents = bloquear ? 'none' : '';
    barra.style.opacity = bloquear ? '.55' : '';
  }

  // ----- interfaz -----
  function actualizarUI() {
    const total = duracionTotal();
    const pos = clamp(posContenido, 0, total);
    const fraccion = total > 0 ? pos / total : 0;
    const pct = (fraccion * 100).toFixed(2) + '%';
    barraLlena.style.width = pct;
    barraPunto.style.left = pct;
    barra.setAttribute('aria-valuenow', String(Math.round(fraccion * 100)));
    tiempo.textContent = formatearTiempo(contenidoAWall(pos)) + ' / ' + formatearTiempo(contenidoAWall(total));
    btnPrincipal.innerHTML = estado === 'reproduciendo' ? SVG.pausa : SVG.play;
    btnPrincipal.setAttribute('aria-label', estado === 'reproduciendo' ? 'Pausar' : 'Reproducir');
  }

  // ----- temporizadores (tick de progreso + keepalive anti-cuelgue de Chrome) -----
  function detenerTemporizadores() {
    if (timerTick) { clearInterval(timerTick); timerTick = null; }
    if (timerKeepAlive) { clearInterval(timerKeepAlive); timerKeepAlive = null; }
  }

  function iniciarTemporizadores() {
    detenerTemporizadores();
    inicioTickWc = performance.now();
    timerTick = setInterval(tick, 100);
    timerKeepAlive = setInterval(function () {
      try {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) { /* ignorar */ }
    }, 10000);
  }

  function tick() {
    if (!raiz.isConnected) { detener(); return; }          // se sacó del DOM: autolimpieza
    if (estado !== 'reproduciendo') return;
    const ahora = performance.now();
    const finFrag = inicioDeFragmento(idxFragmento) + durFragmento(idxFragmento);
    posContenido = clamp(baseContenido + ((ahora - inicioTickWc) / 1000) * velocidad, 0, finFrag);
    // vigilante: si el motor de voz se quedó colgado, reintentar desde donde iba
    if (!hablandoInternamente && ahora - ultimaAccionWc > 1500) {
      intentosSinAudio += 1;
      if (intentosSinAudio > 4) {
        mostrarNota('No se pudo reproducir la voz en este navegador.', true);
        detener();
        return;
      }
      ultimaAccionWc = ahora;
      generacion += 1;
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignorar */ }
      programarHabla();
    }
    actualizarUI();
  }

  // ----- lectura -----
  function calibrar(frag) {
    if (calibrado || desplazamientoInicial !== 0 || !inicioFragmentoWc) return;
    const wc = (performance.now() - inicioFragmentoWc) / 1000;
    if (wc < 1 || frag.length < 30) return;
    const real = frag.length / (wc * velocidad); // caracteres por segundo a velocidad 1
    if (real >= 6 && real <= 40) { cps = real; calibrado = true; }
  }

  function hablarActual(enGesto) {
    if (!soportado || !fragmentos.length) return;
    if (idxFragmento >= fragmentos.length) { finalizar(); return; }
    if (!fragmentos[idxFragmento].slice(desplazamiento)) { avanzarFragmento(); return; }
    ultimaAccionWc = performance.now();
    if (enGesto) {
      // hablar en el mismo gesto del clic (requisito de iOS para desbloquear el audio)
      const u = construirUtterance();
      if (!u) { avanzarFragmento(); return; }
      try { window.speechSynthesis.speak(u); } catch (e) { /* ignorar */ }
    } else {
      programarHabla();
    }
  }

  function programarHabla() {
    clearTimeout(timerHabla);
    const gen = generacion;
    timerHabla = setTimeout(function () {
      if (gen !== generacion) return;
      // construir la utterance al momento de hablar (evita utterances "viejas")
      const u = construirUtterance();
      if (!u) { avanzarFragmento(); return; }
      try { window.speechSynthesis.speak(u); } catch (e) { /* ignorar */ }
    }, 60);
  }

  function construirUtterance() {
    if (idxFragmento >= fragmentos.length) return null;
    const frag = fragmentos[idxFragmento].slice(desplazamiento);
    if (!frag) return null;
    desplazamientoInicial = desplazamiento;
    desplazamientoEnVivo = desplazamiento;
    const u = new SpeechSynthesisUtterance(frag);
    if (voz) { u.voice = voz; u.lang = voz.lang; } else { u.lang = idiomaNormalizado; }
    u.rate = velocidad;
    u.pitch = 1;
    u.volume = 1;
    const gen = generacion;
    u.onstart = function () {
      if (gen !== generacion) return;
      hablandoInternamente = true;
      intentosSinAudio = 0;
      erroresSeguidos = 0;
      inicioFragmentoWc = performance.now();
      nota.hidden = true;
    };
    u.onboundary = function (evento) {
      if (gen !== generacion) return;
      if (typeof evento.charIndex === 'number') {
        desplazamientoEnVivo = desplazamientoInicial + evento.charIndex;
      }
    };
    u.onend = function () {
      if (gen !== generacion) return;
      hablandoInternamente = false;
      calibrar(frag);
      avanzarFragmento();
    };
    u.onerror = function (evento) {
      if (gen !== generacion) return;
      hablandoInternamente = false;
      const tipo = evento && evento.error;
      if (tipo === 'interrupted' || tipo === 'canceled') return;
      erroresSeguidos += 1;
      if (erroresSeguidos >= 3) {
        mostrarNota('No se pudo reproducir la voz en este navegador.', true);
        detener();
        return;
      }
      avanzarFragmento();
    };
    return u;
  }

  function avanzarFragmento() {
    idxFragmento += 1;
    desplazamiento = 0;
    desplazamientoEnVivo = 0;
    desplazamientoInicial = 0;
    if (idxFragmento >= fragmentos.length) { finalizar(); return; }
    baseContenido = inicioDeFragmento(idxFragmento);
    posContenido = baseContenido;
    ultimaAccionWc = performance.now();
    programarHabla();
  }

  function finalizar() {
    generacion += 1;
    clearTimeout(timerHabla);
    detenerTemporizadores();
    hablandoInternamente = false;
    estado = 'detenido';
    idxFragmento = 0;
    desplazamiento = 0;
    desplazamientoEnVivo = 0;
    desplazamientoInicial = 0;
    baseContenido = 0;
    posContenido = 0;
    if (jugadorActivo === api) jugadorActivo = null;
    actualizarUI();
    if (alTerminar) { try { alTerminar(); } catch (e) { /* ignorar */ } }
  }

  // posición precisa dentro del fragmento actual (boundary si existe, sino estimada)
  function offsetActualDelFragmento() {
    const frag = fragmentos[idxFragmento] || '';
    if (desplazamientoEnVivo > desplazamiento) {
      return Math.min(desplazamientoEnVivo, Math.max(0, frag.length - 1));
    }
    const durI = Math.max(0.1, durFragmento(idxFragmento));
    const dentroFrag = clamp(posContenido - baseContenido, 0, durI);
    return clamp(Math.floor((dentroFrag / durI) * frag.length), desplazamiento, Math.max(desplazamiento, frag.length - 1));
  }

  // ----- controles -----
  function reproducir(desdeGesto) {
    if (!soportado || !fragmentos.length) return;
    if (jugadorActivo && jugadorActivo !== api) jugadorActivo.detener();
    jugadorActivo = api;
    cargarVoces();
    if (estado === 'pausado' && window.speechSynthesis.speaking) {
      try { window.speechSynthesis.resume(); } catch (e) { /* ignorar */ }
      estado = 'reproduciendo';
      erroresSeguidos = 0;
      intentosSinAudio = 0;
      iniciarTemporizadores();
      actualizarUI();
      return;
    }
    generacion += 1;
    clearTimeout(timerHabla);
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignorar */ }
    try { window.speechSynthesis.resume(); } catch (e) { /* ignorar */ }
    estado = 'reproduciendo';
    erroresSeguidos = 0;
    intentosSinAudio = 0;
    iniciarTemporizadores();
    if (desdeGesto) {
      hablarActual(true); // hablar en el mismo gesto del clic (requisito de iOS)
    } else {
      programarHabla();
    }
    actualizarUI();
  }

  function pausar() {
    if (!soportado || estado !== 'reproduciendo') return;
    clearTimeout(timerHabla);
    detenerTemporizadores();
    desplazamiento = offsetActualDelFragmento();
    baseContenido = posContenido;
    estado = 'pausado';
    try { window.speechSynthesis.pause(); } catch (e) { /* ignorar */ }
    actualizarUI();
  }

  function detener() {
    generacion += 1;
    clearTimeout(timerHabla);
    detenerTemporizadores();
    hablandoInternamente = false;
    if (soportado) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignorar */ } }
    if (jugadorActivo === api) jugadorActivo = null;
    estado = 'detenido';
    idxFragmento = 0;
    desplazamiento = 0;
    desplazamientoEnVivo = 0;
    desplazamientoInicial = 0;
    baseContenido = 0;
    posContenido = 0;
    actualizarUI();
  }

  function iniciarDesde(i, off, hablarAhora) {
    generacion += 1;
    clearTimeout(timerHabla);
    hablandoInternamente = false;
    if (soportado) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignorar */ } }
    idxFragmento = i;
    desplazamiento = clamp(off, 0, Math.max(0, (fragmentos[i] || '').length - 1));
    baseContenido = inicioDeFragmento(i) + (desplazamiento / Math.max(1, fragmentos[i].length)) * durFragmento(i);
    posContenido = baseContenido;
    if (hablarAhora) {
      estado = 'reproduciendo';
      if (soportado) { try { window.speechSynthesis.resume(); } catch (e) { /* ignorar */ } }
      iniciarTemporizadores();
      programarHabla();
    }
    actualizarUI();
  }

  function buscar(tContenido) {
    if (!fragmentos.length) return;
    const total = duracionTotal();
    const t = clamp(tContenido, 0, Math.max(0, total - 0.05));
    let i = 0;
    let acum = 0;
    while (i < fragmentos.length - 1 && acum + durFragmento(i) <= t) { acum += durFragmento(i); i += 1; }
    const durI = durFragmento(i);
    const dentro = t - acum;
    const off = Math.min(fragmentos[i].length - 1, Math.floor((dentro / Math.max(0.1, durI)) * fragmentos[i].length));
    const seguir = estado === 'reproduciendo';
    generacion += 1;
    clearTimeout(timerHabla);
    detenerTemporizadores();
    hablandoInternamente = false;
    if (soportado) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignorar */ } }
    idxFragmento = i;
    desplazamiento = off;
    desplazamientoEnVivo = 0;
    desplazamientoInicial = 0;
    baseContenido = inicioDeFragmento(i) + (off / Math.max(1, fragmentos[i].length)) * durI;
    posContenido = baseContenido;
    if (seguir) {
      estado = 'reproduciendo';
      iniciarTemporizadores();
      programarHabla();
    } else if (estado === 'pausado') {
      baseContenido = posContenido; // queda pausado; al dar play continúa desde aquí
    }
    actualizarUI();
  }

  function saltar(segundosWall) {
    buscar(posContenido + segundosWall * velocidad);
  }

  // ----- eventos -----
  btnPrincipal.addEventListener('click', function () {
    if (estado === 'reproduciendo') pausar(); else reproducir(true);
  });
  btnAtras.addEventListener('click', function () { saltar(-3); });
  btnAdelante.addEventListener('click', function () { saltar(3); });
  btnDetener.addEventListener('click', function () { detener(); });
  barra.addEventListener('click', function (evento) {
    if (!fragmentos.length) return;
    const rect = barra.getBoundingClientRect();
    const fraccion = clamp((evento.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    buscar(fraccion * duracionTotal());
  });
  selVel.addEventListener('change', function () {
    const nueva = parseFloat(selVel.value);
    if (!nueva || nueva === velocidad) return;
    velocidad = nueva;
    if (estado === 'reproduciendo') {
      iniciarDesde(idxFragmento, offsetActualDelFragmento(), true);
    } else if (estado === 'pausado') {
      // descartar el audio pausado para que al reanudar use la nueva velocidad
      generacion += 1;
      clearTimeout(timerHabla);
      hablandoInternamente = false;
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignorar */ }
      desplazamiento = offsetActualDelFragmento();
      actualizarUI();
    } else {
      actualizarUI();
    }
  });

  // ----- inicialización -----
  if (soportado) {
    cargarVoces();
    try {
      window.speechSynthesis.addEventListener('voiceschanged', cargarVoces);
    } catch (e) {
      try { window.speechSynthesis.onvoiceschanged = cargarVoces; } catch (e2) { /* ignorar */ }
    }
    setTimeout(function () {
      try {
        if (!window.speechSynthesis.getVoices().length) { sinVocesSistema = true; actualizarNota(); }
      } catch (e) { /* ignorar */ }
    }, 3000);
  }
  actualizarNota();
  actualizarUI();

  // ----- controlador devuelto a la clase -----
  const api = {
    raiz: raiz,
    reproducir: function () { reproducir(false); },
    pausar: pausar,
    detener: detener,
    estaReproduciendo: function () { return estado === 'reproduciendo'; }
  };
  return api;
}

// Detiene el audio que esté sonando en este momento (útil al salir de una clase).
export function detenerTTSActivo() {
  if (jugadorActivo) jugadorActivo.detener();
}