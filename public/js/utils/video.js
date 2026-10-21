// ============================================================
// video.js — Video con preguntas intercaladas (js/utils/video.js) · v2
// (v2: tipo contextual clase/tarea/examen — en examen el video se ve
// UNA sola vez, sin retroceder ni adelantar, con aviso antes del play)
// ============================================================
//
// Utilidad para el CONTENIDO de clases, tareas y exámenes: monta un
// reproductor de video que, al llegar al minuto indicado de cada
// pregunta, SE PAUSA y muestra la pregunta en un modal. El estudiante
// TIENE que responder (o agotar los 45 segundos) para que el video
// siga. No se puede adelantar el video por ningún lado: los únicos
// controles son ▶/⏸ (pausa) y ↺ 3s (retroceder). La barra de progreso
// es SOLO indicadora (no se puede arrastrar ni clicar).
//
// USO (desde el archivo de contenido, p. ej.
// public/clases/8/matematica-y-datos/mi-clase.js):
//
//   import { crearVideo } from "../../../js/utils/video.js";
//
//   crearVideo({
//     contenedor,            // elemento del DOM donde montar el video
//     perfil,                // perfil del usuario (users/{uid})  ← obligatorio
//     clase,                 // { id, grado, materiaId, ... }     ← obligatorio
//     enlace: "https://www.youtube.com/watch?v=abc123",
//                            // YouTube · Vimeo · .mp4/.webm · Facebook,
//                            // TikTok, Instagram, Bilibili, Twitch…
//     preguntas: [
//       { tiempo: "1:30",    // segundo (90) o "mm:ss"/"hh:mm:ss"
//         indicacion: "¿Cuánto es $2^3$?",   // admite $fórmulas$ //         respuestas: ["6", "8", "9", "5"],  // de 2 a 6, admite $…$ //         respuestaCorrecta: 2 },            // 1 = primera
//       { tiempo: 300, indicacion: "…", respuestas: ["…"], respuestaCorrecta: 1 },
//     ],
//     puntaje: 10,           // TOTAL del video: se reparte EQUITATIVAMENTE
//                            // entre las preguntas (2 preguntas → 5 c/u).
//                            // Convención del proyecto: 0–10 por pregunta;
//                            // si el reparto supera 10 se ajusta a 10 con
//                            // un aviso en consola.
//     // tipo: "clase",      // "clase" | "tarea" | "examen" (defecto
//                            //  "clase"; también vale clase.tipo) — en
//                            //  EXAMEN: el video se ve UNA sola vez, sin
//                            //  retroceder ni adelantar (aviso en la
//                            //  tapa antes del play) y cada pregunta se
//                            //  envía con UNA sola oportunidad.
//     // titulo: "Lección 3",// (opcional) encabezado sobre el reproductor
//     // ancho: 0.6,         // (opcional) igual que las demás utils
//     // columnas: 2,        // (opcional) mitad/tercio/cuarto del ancho
//     // aspecto: "16/9",    // (opcional) relación de alto (defecto: según
//     //                     //  la plataforma — YouTube/Vimeo/mp4 16/9,
//     //                     //  TikTok 9/16, Instagram /reel 9/16, /p 4/5)
//     // segundosPregunta: 45, // tiempo de la pregunta en pantalla (defecto 45)
//     // alFinalizar: (r) => {}, // r = { puntos, maxPuntos, correctas,
//     //                            respondidas, total, detalle:[…] }
//   });
//
// Las preguntas son bloques de opcionMultiple.js con el MISMO tipo del
// video: en clase dos intentos (1.º completo / 2.º mitad), en tarea
// dos envíos neutros (el 2.º cuenta) y en examen UNA sola oportunidad
// que el propio video envía con el botón "Enviar respuesta" del modal
// (guarda SIEMPRE, 0 incluido, vía guardarPreguntaExamen). Cada
// pregunta guarda su valor en la nota (localStorage + Firestore vía
// db.js + espejo Sheets), igual que cualquier otra pregunta.
//
// EXAMEN (tipo "examen") — petición literal del docente:
//  · El video se ve UNA SOLA VEZ: al terminar NO hay "Ver de nuevo" y
//    si el examen ya fue enviado el video aparece bloqueado.
//  · NO se puede retroceder NI adelantar: el botón ↺ desaparece y el
//    vigilante también deshace los saltos hacia ATRÁS (en clase y
//    tarea retroceder 3 s sigue permitido).
//  · La tapa AVISA de todo esto ANTES de darle play.
//  · Docente: ve el mismo modo examen pero con repetición libre y sin
//    guardar nada (convención de la vista docente).
//
// REGLAS DEL VIDEO (petición literal del docente):
//  · El video SE PAUSA al salir la pregunta (modo controlado; en modo
//    cronómetro se tapa con el modal, ver abajo).
//  · La pregunta dura 45 segundos en pantalla (segundosPregunta): si
//    el estudiante nunca responde, se marca INCORRECTA y el video
//    continúa. Esa pregunta NO se vuelve a mostrar en esta sesión.
//  · Si ya respondió una pregunta y RETROCEDE el video, la resuelta
//    NO se vuelve a mostrar (ni esta sesión ni en otra: quedó en la
//    nota de la clase).
//  · NO se puede adelantar: sin botón de adelantar, barra de
//    progreso muerta, teclado del reproductor desactivado y un
//    "vigilante" que devuelve el video atrás si el tiempo salta hacia
//    adelante (adelantar desde herramientas de desarrollo también se
//    deshace). Retroceder SÍ se puede (botón ↺ 3s).
//
// PLATAFORMAS — DOS MODOS, elegidos solos según el enlace:
//  · MODO CONTROLADO (YouTube, Vimeo y archivos .mp4/.webm/.m4v/.ogv/
//    .mov): pausa automática en cada pregunta, bloqueo real del
//    adelanto, controles propios y duración real.
//  · MODO CRONÓMETRO (Facebook, TikTok, Instagram, Bilibili, Twitch,
//    Dailymotion y cualquier otra URL): el video se reproduce con el
//    reproductor de SU plataforma dentro del iframe — por seguridad
//    los navegadores NO dejan pausar ni leer el tiempo de un video de
//    otro sitio. Las preguntas salen según el RELOJ del recurso (que
//    corre mientras el estudiante mira) y no se puede saltar ninguna
//    pregunta (el reloj es la única llave), pero el video nativo
//    puede seguir sonando bajo el modal y sus controles propios
//    permiten pausarlo/retrocederlo a mano. El recurso avisa de esto
//    en pantalla. Para la experiencia completa: YouTube, Vimeo o un
//    archivo .mp4/.webm subido a Hosting (recursos/videos/…).
//
// Docente: intentos libres en las preguntas, nada se guarda (igual
// que en las demás utils; el puntaje local sube al head morado).
//
// Convención: CSS implícito (style#video-estilos) · 100% responsivo ·
// paleta del proyecto · acento NARANJA #f97316 · textos escapados ·
// errores de contenido lanzan "video.js: …".
// ============================================================

// Las preguntas SON bloques de opcionMultiple (misma nota, mismo
// guardado) y aplicarTamano() da el tamaño columnas/ancho.
import { opcionMultiple, obtenerNota, aplicarTamano } from "./opcionMultiple.js";

// Precarga de KaTeX para que la 1.ª pregunta se monte al instante.
import { cargarFormulas } from "./formatearFormulas.js";

import { escapeHtml } from "./helpers.js";

/* ---------------- Constantes ---------------- */

const ID_ESTILOS = "video-estilos";
const RETRO = 3; // segundos que retrocede el botón ↺ (desaparece en examen)
const TIPOS = ["clase", "tarea", "examen"];

let estilosListos = false;

/* ---------------- Helpers ---------------- */

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slug(texto) {
  return normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "x";
}

// Mini hash djb2 (misma técnica que opcionMultiple.js)
function hash8(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

// Redondeo a 1 decimal (la mitad del puntaje siempre con un decimal)
function redondear1(n) {
  return Math.round(Number(n) * 10) / 10;
}

/** Segundos → "m:ss" (o "h:mm:ss" si pasa de una hora). */
function mmss(t) {
  t = Math.max(0, Math.floor(Number(t) || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const dos = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${m}:${dos(s)}`;
}

/** Acepta 90 (segundos), "90", "1:30", "02:05:10" → segundos.
 *  Lanza "video.js: …" si el tiempo no se entiende. */
function aSegundos(valor) {
  if (typeof valor === "number" && Number.isFinite(valor) && valor >= 0) {
    return redondear1(valor);
  }
  if (typeof valor === "string" && valor.trim()) {
    const partes = valor.trim().split(":").map((p) => p.trim());
    if (partes.length >= 1 && partes.length <= 3 && partes.every((p) => p !== "" && Number.isFinite(Number(p)))) {
      const nums = partes.map(Number);
      while (nums.length < 3) nums.unshift(0);
      return redondear1(nums[0] * 3600 + nums[1] * 60 + nums[2]);
    }
  }
  throw new Error(
    'video.js: tiempo de pregunta inválido ' + JSON.stringify(valor ?? null) +
    ' — usa segundos (90) o texto "mm:ss" ("1:30").'
  );
}

/** "16:9" | "16/9" | 1.777 → texto válido para CSS aspect-ratio. */
function normalizarAspecto(valor) {
  if (valor == null || valor === "") return null;
  if (typeof valor === "number" && Number.isFinite(valor) && valor > 0) return String(valor);
  const texto = String(valor).trim().replace(":", "/");
  if (/^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(texto)) {
    const [a, b] = texto.split("/").map((x) => Number(x.trim()));
    if (a > 0 && b > 0) return `${a} / ${b}`;
  }
  return null;
}

/* ---------------- Detección de plataforma ----------------
   Convierte el enlace del docente en los datos que el reproductor
   necesita: plataforma, si es CONTROLABLE (pausa/bloqueo reales) o
   CRONÓMETRO, la URL para el iframe y su relación de aspecto. */

const EXT_VIDEO = /\.(mp4|m4v|webm|ogv|ogg|mov|mkv)$/i;

/** (exportado también para pruebas y usos avanzados) */
export function detectarEnlace(enlace) {
  if (typeof enlace !== "string" || !enlace.trim()) {
    throw new Error("video.js: falta el 'enlace' del video (URL de YouTube, Vimeo, .mp4…).");
  }
  let url;
  try {
    url = new URL(enlace.trim(), (typeof location !== "undefined" ? location.href : "https://local/"));
  } catch (e) {
    throw new Error(`video.js: el enlace del video no es una URL válida ("${enlace.trim().slice(0, 80)}").`);
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const ruta = url.pathname;
  const esHttp = url.protocol === "http:" || url.protocol === "https:";
  const parent = (typeof location !== "undefined" && location.hostname) ? location.hostname : "localhost";

  // ── Archivo de video directo (.mp4, .webm, …) → MODO CONTROLADO
  if (EXT_VIDEO.test(ruta) || EXT_VIDEO.test(enlace.trim().split("?")[0])) {
    return {
      plataforma: "archivo", nombre: "Video",
      controlado: true, aspecto: "16 / 9",
      urlEmbed: url.href, videoId: null,
    };
  }

  // ── YouTube → IFrame API (control total)
  if (/(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$/.test(host) || host === "youtu.be") {
    let id = null;
    if (host === "youtu.be") id = ruta.slice(1).split("/")[0] || null;
    else if (ruta === "/watch" || ruta.startsWith("/watch")) id = url.searchParams.get("v");
    else {
      const m = ruta.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
      if (m) id = m[1];
    }
    if (!id) {
      throw new Error('video.js: no se encontró el ID del video de YouTube ("' + enlace.trim().slice(0, 80) + '").');
    }
    return {
      plataforma: "youtube", nombre: "YouTube",
      controlado: true, aspecto: "16 / 9",
      urlEmbed: null, videoId: id,
    };
  }

  // ── Vimeo → Player SDK (control total)
  if (/(^|\.)vimeo\.com$/.test(host)) {
    const m = ruta.match(/(\d{6,})\/?$/) || ruta.match(/^\/(\d{6,})/);
    if (!m) {
      throw new Error('video.js: no se encontró el ID del video de Vimeo ("' + enlace.trim().slice(0, 80) + '").');
    }
    return {
      plataforma: "vimeo", nombre: "Vimeo",
      controlado: true, aspecto: "16 / 9",
      urlEmbed: `https://player.vimeo.com/video/${m[1]}?title=0&byline=0&portrait=0&controls=0&dnt=1`,
      videoId: m[1],
    };
  }

  // ── TikTok (cronómetro) — vertical
  if (/(^|\.)tiktok\.com$/.test(host)) {
    const m = ruta.match(/\/(?:video|photo)\/(\d+)/);
    return {
      plataforma: "tiktok", nombre: "TikTok",
      controlado: false, aspecto: "9 / 16",
      urlEmbed: m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null,
      videoId: m ? m[1] : null,
      urlCaida: url.href,
    };
  }

  // ── Instagram (cronómetro)
  if (/(^|\.)instagram\.com$/.test(host)) {
    const m = ruta.match(/^\/(p|reel|tv)\/([\w-]+)/);
    if (!m) {
      throw new Error('video.js: enlace de Instagram no reconocido ("' + enlace.trim().slice(0, 80) + '"). Usa /p/, /reel/ o /tv/.');
    }
    return {
      plataforma: "instagram", nombre: "Instagram",
      controlado: false, aspecto: m[1] === "p" ? "4 / 5" : "9 / 16",
      urlEmbed: `https://www.instagram.com/${m[1]}/${m[2]}/embed`,
      videoId: m[2],
    };
  }

  // ── Facebook (cronómetro)
  if (/(^|\.)facebook\.com$/.test(host) || host === "fb.watch" || host === "fb.com") {
    return {
      plataforma: "facebook", nombre: "Facebook",
      controlado: false, aspecto: "16 / 9",
      urlEmbed: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.href)}&show_text=false&width=640`,
      videoId: null,
    };
  }

  // ── Bilibili (cronómetro)
  if (/(^|\.)bilibili\.com$/.test(host) || host === "b23.tv") {
    const bv = ruta.match(/\/video\/(BV[\w]+)/);
    const av = ruta.match(/\/video\/av(\d+)/i);
    const q = bv ? `bvid=${bv[1]}` : av ? `aid=${av[1]}` : null;
    return {
      plataforma: "bilibili", nombre: "Bilibili",
      controlado: false, aspecto: "16 / 9",
      urlEmbed: q ? `https://player.bilibili.com/player.html?${q}&autoplay=0&danmaku=0&high_quality=1` : null,
      videoId: bv ? bv[1] : av ? av[1] : null,
      urlCaida: url.href,
    };
  }

  // ── Twitch (cronómetro; exige parent=dominio)
  if (/(^|\.)twitch\.tv$/.test(host)) {
    const video = ruta.match(/^\/videos\/(\d+)/);
    const clip = host === "clips.twitch.tv" ? ruta.slice(1).split("/")[0] : null;
    const canal = !video && !clip ? ruta.slice(1).split("/")[0] : null;
    const q = video ? `video=v${video[1]}` : clip ? `clip=${clip}` : canal ? `channel=${canal}` : null;
    if (!q) {
      throw new Error('video.js: enlace de Twitch no reconocido ("' + enlace.trim().slice(0, 80) + '").');
    }
    return {
      plataforma: "twitch", nombre: "Twitch",
      controlado: false, aspecto: "16 / 9",
      urlEmbed: `https://${host === "clips.twitch.tv" ? "clips.twitch.tv/embed" : "player.twitch.tv"}/?${q}&parent=${parent}&autoplay=false`,
      videoId: video ? video[1] : clip || canal,
    };
  }

  // ── Dailymotion (cronómetro)
  if (/(^|\.)dailymotion\.com$/.test(host) || host === "dai.ly") {
    const m = ruta.match(/\/video\/([\w]+)/) || ruta.match(/^\/([\w]{5,})/);
    if (!m) {
      throw new Error('video.js: no se encontró el ID del video de Dailymotion ("' + enlace.trim().slice(0, 80) + '").');
    }
    return {
      plataforma: "dailymotion", nombre: "Dailymotion",
      controlado: false, aspecto: "16 / 9",
      urlEmbed: `https://geo.dailymotion.com/player.html?video=${m[1]}`,
      videoId: m[1],
    };
  }

  // ── Archive.org (cronómetro)
  if (/(^|\.)archive\.org$/.test(host)) {
    const m = ruta.match(/^\/(?:details|embed)\/([^\/]+)/);
    if (!m) {
      throw new Error('video.js: enlace de archive.org no reconocido ("' + enlace.trim().slice(0, 80) + '").');
    }
    return {
      plataforma: "archive", nombre: "Archive.org",
      controlado: false, aspecto: "16 / 9",
      urlEmbed: `https://archive.org/embed/${m[1]}`,
      videoId: m[1],
    };
  }

  // ── Otra URL cualquiera → iframe directo (mejor esfuerzo)
  return {
    plataforma: "otra",
    nombre: "Enlace directo",
    controlado: false,
    aspecto: "16 / 9",
    urlEmbed: esHttp ? url.href : null,
    videoId: null,
    urlCaida: url.href,
  };
}

/* ---------------- Carga de SDK de reproductores ---------------- */

const _scripts = new Map();
function cargarScript(url) {
  if (!_scripts.has(url)) {
    _scripts.set(url, new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        _scripts.delete(url);
        reject(new Error("No se pudo cargar " + url));
      };
      document.head.append(s);
    }));
  }
  return _scripts.get(url);
}

let _ytPromesa = null;
function cargarYouTube() {
  if (!_ytPromesa) {
    _ytPromesa = (async () => {
      if (window.YT && window.YT.Player) return;
      await cargarScript("https://www.youtube.com/iframe_api");
      const t0 = Date.now();
      while (!(window.YT && window.YT.Player)) {
        if (Date.now() - t0 > 12000) throw new Error("El reproductor de YouTube no respondió.");
        await new Promise((r) => setTimeout(r, 120));
      }
    })();
    _ytPromesa.catch(() => { _ytPromesa = null; });
  }
  return _ytPromesa;
}

/* ---------------- Drivers de reproducción ----------------
   Cada driver le ofrece a la fábrica la MISMA interfaz:
     listo      → Promise que se resuelve cuando se puede reproducir
     iniciar()  → reproducir (video o reloj interno)
     pausar()   → pausa ABSOLUTA (la que se usa al salir la pregunta)
     alternar() → botón ▶/⏸
     retroceder(seg) → único movimiento permitido hacia atrás
     destruir() → limpia intervalos, listeners y elementos
   Y le avisa por ganchos: alTiempo(t, dur) · alEstado(estado) ·
   alError(mensaje).  estado: "reproduciendo" | "pausado" | "fin"

   La TOLERANCIA de adelanto (1.5 s) es el corazón del bloqueo: el
   vigilante lee el tiempo 4 veces por segundo y si salta MÁS de lo
   que una reproducción normal puede avanzar, devuelve el video al
   último segundo legítimo (ultimoT). Así ni la barra, ni teclas,
   ni herramientas de desarrollo logran adelantarlo. */

const TOLERANCIA = 1.5;

/* ── Driver YouTube (IFrame API · controlado) ──
   examen=true: el vigilante también deshace los saltos hacia ATRÁS. */
function driverYouTube(montaje, videoId, ganchos, examen = false) {
  const d = { tipo: "youtube", _player: null, _iv: null, _ultimoT: 0, _estado: -1, _muerto: false };

  d.listo = cargarYouTube().then(() => new Promise((resolve, reject) => {
    if (d._muerto) return;
    // YT.Player REEMPLAZA el elemento que recibe → se le pasa un hijo
    const ancla = document.createElement("div");
    ancla.className = "vd-ancla";
    montaje.append(ancla);
    try {
      d._player = new window.YT.Player(ancla, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0,
          modestbranding: 1, iv_load_policy: 3, playsinline: 1,
          origin: (typeof location !== "undefined" && location.origin) || undefined,
        },
        events: {
          onReady: () => resolve(d),
          onError: () => reject(new Error("YouTube no permite reproducir este video aquí (privado o sin inserción).")),
          onStateChange: (e) => {
            d._estado = e.data;
            if (e.data === 1) ganchos.alEstado("reproduciendo");
            else if (e.data === 2) ganchos.alEstado("pausado");
            else if (e.data === 0) ganchos.alEstado("fin");
          },
        },
      });
    } catch (e) {
      reject(e);
    }
  }));

  d._iv = setInterval(() => {
    if (d._muerto || !d._player || !d._player.getCurrentTime) return;
    let t = 0, dur = 0;
    try {
      t = Number(d._player.getCurrentTime()) || 0;
      dur = Number(d._player.getDuration()) || 0;
    } catch (e) { return; }
    if (d._estado === 1 && t > d._ultimoT + TOLERANCIA) {
      try { d._player.seekTo(d._ultimoT, true); } catch (e) { /* nada */ }
      return;
    }
    if (examen && d._estado === 1 && t < d._ultimoT - TOLERANCIA) {
      // EXAMEN: tampoco se puede RETROCEDER (ni teclas ni devtools)
      try { d._player.seekTo(d._ultimoT, true); } catch (e) { /* nada */ }
      return;
    }
    d._ultimoT = t;
    ganchos.alTiempo(t, dur);
  }, 250);

  d.iniciar = () => { try { d._player && d._player.playVideo(); } catch (e) { /* nada */ } };
  d.pausar = () => { try { d._player && d._player.pauseVideo(); } catch (e) { /* nada */ } };
  d.alternar = () => { try { d._player && (d._estado === 1 ? d._player.pauseVideo() : d._player.playVideo()); } catch (e) { /* nada */ } };
  d.retroceder = (seg) => {
    try {
      if (!d._player || !d._player.getCurrentTime) return;
      const nuevo = Math.max(0, (Number(d._player.getCurrentTime()) || 0) - seg);
      d._ultimoT = nuevo;
      d._player.seekTo(nuevo, true);
    } catch (e) { /* nada */ }
  };
  d.destruir = () => {
    d._muerto = true;
    clearInterval(d._iv);
    try { d._player && d._player.destroy && d._player.destroy(); } catch (e) { /* nada */ }
    montaje.innerHTML = "";
  };
  return d;
}

/* ── Driver Vimeo (Player SDK · controlado) ──
   examen=true: el vigilante también deshace los saltos hacia ATRÁS. */
function driverVimeo(montaje, infoEnlace, ganchos, examen = false) {
  const d = { tipo: "vimeo", _player: null, _iv: null, _ultimoT: 0, _muerto: false };

  d.listo = cargarScript("https://player.vimeo.com/api/player.js").then(() => {
    if (d._muerto) throw new Error("Reproductor cerrado.");
    if (!window.Vimeo || !window.Vimeo.Player) throw new Error("No se pudo cargar el reproductor de Vimeo.");
    const iframe = document.createElement("iframe");
    iframe.src = infoEnlace.urlEmbed;
    iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
    iframe.allowFullscreen = true;
    iframe.title = "Video de Vimeo";
    montaje.append(iframe);
    d._player = new window.Vimeo.Player(iframe);
    d._player.on("play", () => ganchos.alEstado("reproduciendo"));
    d._player.on("pause", () => ganchos.alEstado("pausado"));
    d._player.on("ended", () => ganchos.alEstado("fin"));
    return d;
  });

  let leyendo = false;
  d._iv = setInterval(async () => {
    if (d._muerto || leyendo || !d._player || !d._player.getCurrentTime) return;
    leyendo = true;
    try {
      const t = Number((await d._player.getCurrentTime()) || 0);
      if (t > d._ultimoT + TOLERANCIA) {
        await d._player.setCurrentTime(d._ultimoT).catch(() => {});
      } else if (examen && t < d._ultimoT - TOLERANCIA) {
        // EXAMEN: tampoco hacia atrás
        await d._player.setCurrentTime(d._ultimoT).catch(() => {});
      } else {
        let dur = 0;
        try { dur = Number((await d._player.getDuration()) || 0); } catch (e) { dur = 0; }
        d._ultimoT = t;
        ganchos.alTiempo(t, dur);
      }
    } catch (e) { /* el reproductor aún no está listo: se reintenta */ }
    leyendo = false;
  }, 250);

  d.iniciar = () => { d._player && d._player.play().catch(() => {}); };
  d.pausar = () => { d._player && d._player.pause().catch(() => {}); };
  d.alternar = () => {
    if (!d._player) return;
    d._player.getPaused().then((pausado) => (pausado ? d._player.play() : d._player.pause())).catch(() => {});
  };
  d.retroceder = (seg) => {
    if (!d._player) return;
    d._player.getCurrentTime()
      .then((t) => d._player.setCurrentTime(Math.max(0, (Number(t) || 0) - seg)))
      .catch(() => {});
  };
  d.destruir = () => {
    d._muerto = true;
    clearInterval(d._iv);
    const p = d._player;
    try {
      if (p) {
        if (typeof p.destroy === "function") p.destroy();
        else if (typeof p.unload === "function") p.unload();
      }
    } catch (e) { /* nada */ }
    montaje.innerHTML = "";
  };
  return d;
}

/* ── Driver de archivo local (.mp4/.webm… · controlado) ──
   examen=true: el vigilante también deshace los saltos hacia ATRÁS. */
function driverLocal(montaje, url, ganchos, examen = false) {
  const d = { tipo: "archivo", _video: null, _iv: null, _ultimoT: 0, _muerto: false };

  d.listo = new Promise((resolve, reject) => {
    if (d._muerto) return;
    const v = document.createElement("video");
    v.src = url;
    v.playsInline = true;
    v.preload = "metadata";
    v.disablePictureInPicture = true;
    v.controlsList = "nodownload noplaybackrate";
    // SIN atributo controls a propósito: los únicos botones son los nuestros.
    v.setAttribute("aria-label", "Video de la lección");
    v.tabIndex = -1;
    // Ni espacio ni flechas: el teclado del video propio queda muerto.
    v.addEventListener("keydown", (e) => e.preventDefault(), true);
    v.addEventListener("play", () => ganchos.alEstado("reproduciendo"));
    v.addEventListener("pause", () => ganchos.alEstado("pausado"));
    v.addEventListener("ended", () => ganchos.alEstado("fin"));
    v.addEventListener("ratechange", () => { if (v.playbackRate !== 1) v.playbackRate = 1; });
    v.addEventListener("error", () => reject(new Error("No se pudo cargar el archivo de video: " + url)));
    v.addEventListener("seeking", () => {
      if (v.currentTime > d._ultimoT + TOLERANCIA) v.currentTime = d._ultimoT;
      else if (examen && v.currentTime < d._ultimoT - TOLERANCIA) v.currentTime = d._ultimoT;
    });
    montaje.append(v);
    d._video = v;
    if (v.readyState >= 1) resolve(d);
    else {
      v.addEventListener("loadedmetadata", () => resolve(d), { once: true });
      // Aunque el metadata tarde, la fábrica no se queda colgada:
      setTimeout(() => resolve(d), 8000);
    }
  });

  d._iv = setInterval(() => {
    if (d._muerto || !d._video) return;
    const t = Number(d._video.currentTime) || 0;
    if (t > d._ultimoT + TOLERANCIA) { d._video.currentTime = d._ultimoT; return; }
    if (examen && t < d._ultimoT - TOLERANCIA) { d._video.currentTime = d._ultimoT; return; }
    d._ultimoT = t;
    ganchos.alTiempo(t, Number(d._video.duration) || 0);
  }, 250);

  d.iniciar = () => { d._video && d._video.play().catch(() => ganchos.alError("Toca ▶ para reproducir.")); };
  d.pausar = () => { d._video && !d._video.paused && d._video.pause(); };
  d.alternar = () => {
    if (!d._video) return;
    if (d._video.paused) d._video.play().catch(() => ganchos.alError("Toca ▶ para reproducir."));
    else d._video.pause();
  };
  d.retroceder = (seg) => {
    if (!d._video) return;
    d._video.currentTime = Math.max(0, (Number(d._video.currentTime) || 0) - seg);
  };
  d.destruir = () => {
    d._muerto = true;
    clearInterval(d._iv);
    try {
      if (d._video) {
        d._video.pause();
        d._video.removeAttribute("src");
        d._video.load && d._video.load();
        d._video.remove();
      }
    } catch (e) { /* nada */ }
    montaje.innerHTML = "";
  };
  return d;
}

/* ── Driver CRONÓMETRO (plataformas sin API · mejor esfuerzo) ──
   El video vive en un iframe de otro origen: los navegadores no
   permiten pausarlo, leer su tiempo ni bloquear sus controles. Este
   driver lleva el RELOJ de la actividad: corre mientras el estudiante
   ve, se detiene en cada pregunta y es la única llave para que salgan
   las preguntas (no se pueden saltar). Limitaciones reales y avisadas
   en pantalla: el video nativo puede sonar bajo el modal y sus
   controles propios siguen ahí. */
function driverCronometro(montaje, urlEmbed, ganchos, examen = false) {
  const d = { tipo: "cronometro", _iv: null, _t: 0, _corriendo: false, _muerto: false };

  d.listo = new Promise((resolve) => {
    if (urlEmbed) {
      const iframe = document.createElement("iframe");
      iframe.src = urlEmbed;
      iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write";
      iframe.allowFullscreen = true;
      iframe.title = "Video de la lección";
      montaje.append(iframe);
    } else {
      const aviso = document.createElement("div");
      aviso.className = "vd-sin-embed";
      aviso.textContent = "Esta plataforma no permite insertar el video aquí. Ábrelo en su página y sigue el reloj de la actividad.";
      montaje.append(aviso);
    }
    resolve(d);
  });

  d._iv = setInterval(() => {
    if (d._muerto || !d._corriendo) return;
    d._t = redondear1(d._t + 0.25);
    ganchos.alTiempo(d._t, null);
  }, 250);

  d.iniciar = () => { d._corriendo = true; ganchos.alEstado("reproduciendo"); };
  d.pausar = () => { d._corriendo = false; ganchos.alEstado("pausado"); };
  d.alternar = () => {
    d._corriendo = !d._corriendo;
    ganchos.alEstado(d._corriendo ? "reproduciendo" : "pausado");
  };
  d.retroceder = (seg) => {
    if (examen) return; // EXAMEN: el reloj no retrocede (botón oculto)
    d._t = Math.max(0, redondear1(d._t - seg));
    ganchos.alTiempo(d._t, null);
  };
  d.destruir = () => {
    d._muerto = true;
    clearInterval(d._iv);
    montaje.innerHTML = "";
  };
  return d;
}

/* ---------------- Registro de la instancia activa ----------------
   Igual que detenerTTSActivo(): las páginas de clase lo llaman al
   salir ("← Clases") para que el video no siga sonando. */

let instanciaActiva = null;

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = ID_ESTILOS;
  estilo.textContent = `
    .vd-raiz {
      position: relative;
      background: #ffffff;
      border: 1px solid #ece9f6;
      border-radius: 1.1rem;
      padding: 1rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      margin: 1rem 0;
      box-sizing: border-box;
      max-width: 100%;
    }
    .vd-titulo { margin: 0 0 .6rem; font-size: 1.02rem; font-weight: 800; color: #1f2937; }

    .vd-marco {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #0f172a;
      border-radius: .9rem;
      overflow: hidden;
    }
    .vd-montaje { position: absolute; inset: 0; }
    .vd-montaje iframe,
    .vd-montaje video {
      position: absolute; inset: 0;
      width: 100% !important; height: 100% !important;
      border: 0; display: block; object-fit: contain; background: #000;
    }
    .vd-ancla { width: 100%; height: 100%; }
    .vd-sin-embed {
      position: absolute; inset: 0; display: grid; place-items: center;
      color: rgba(255, 255, 255, .92); padding: 1.5rem; text-align: center;
      font-size: .9rem; background: #0f172a;
    }

    .vd-tapa {
      position: absolute; inset: 0; z-index: 6;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: .55rem; background: rgba(15, 23, 42, .8); border: 0; cursor: pointer;
      color: #ffffff; font-family: inherit; text-align: center; padding: 1rem;
    }
    .vd-tapa[hidden] { display: none; }
    .vd-tapa-icono {
      width: 72px; height: 72px; border-radius: 50%;
      background: #f97316; color: #ffffff; display: grid; place-items: center;
      box-shadow: 0 10px 30px rgba(249, 115, 22, .45);
      transition: transform .15s ease;
    }
    .vd-tapa-icono svg { width: 34px; height: 34px; }
    .vd-tapa:hover .vd-tapa-icono { transform: scale(1.08); }
    .vd-tapa-texto { font-weight: 800; font-size: 1.05rem; }
    .vd-tapa-sub { font-size: .78rem; color: rgba(255, 255, 255, .85); max-width: 46ch; }

    .vd-panelo { display: flex; align-items: center; gap: .5rem; margin-top: .7rem; flex-wrap: wrap; }
    .vd-btn {
      font-family: inherit; border: 1px solid rgba(249, 115, 22, .35);
      background: rgba(249, 115, 22, .1); color: #c2410c;
      border-radius: .7rem; width: 42px; height: 40px;
      display: grid; place-items: center; cursor: pointer;
      transition: background .15s ease;
    }
    .vd-btn:hover:not(:disabled) { background: rgba(249, 115, 22, .2); }
    .vd-btn:disabled { opacity: .45; cursor: not-allowed; }
    .vd-btn svg { width: 22px; height: 22px; }
    .vd-retro { width: auto; padding: 0 .75rem; font-weight: 800; font-size: .84rem; white-space: nowrap; }

    /* Barra de progreso SOLO indicadora: ni clic ni arrastre */
    .vd-progreso {
      flex: 1 1 130px; height: 7px; background: #e5e7eb;
      border-radius: 999px; overflow: hidden; pointer-events: none;
    }
    .vd-progreso-lleno { height: 100%; width: 0%; background: linear-gradient(90deg, #f97316, #fb923c); border-radius: inherit; }
    .vd-progreso.crono .vd-progreso-lleno {
      width: 100% !important; opacity: .5;
      background: repeating-linear-gradient(45deg, #fdba74 0 8px, #f97316 8px 16px);
      animation: vd-corre 1.1s linear infinite;
    }
    @keyframes vd-corre { to { background-position: 22.6px 0; } }

    .vd-tiempo { font-variant-numeric: tabular-nums; font-size: .8rem; font-weight: 700; color: #4b5563; white-space: nowrap; }
    .vd-chip { font-size: .74rem; font-weight: 800; padding: .22rem .6rem; border-radius: 999px; white-space: nowrap; }
    .vd-chip-preguntas { background: #f3f4f6; color: #4b5563; }
    .vd-chip-puntos { background: rgba(249, 115, 22, .14); color: #c2410c; }
    .vd-terminar {
      margin-left: auto; font-family: inherit; border: 0; cursor: pointer;
      background: rgba(239, 68, 68, .1); color: #b91c1c;
      border-radius: 999px; padding: .42rem .9rem; font-weight: 800; font-size: .82rem;
    }
    .vd-terminar:hover { background: rgba(239, 68, 68, .18); }
    .vd-bloqueado .vd-btn, .vd-bloqueado .vd-terminar { opacity: .4; pointer-events: none; }

    .vd-aviso-error { display: none; margin: .5rem 0 0; font-size: .84rem; font-weight: 600; color: #b91c1c; }
    .vd-aviso-error.visible { display: block; }

    .vd-nota-modo {
      margin: .6rem 0 0; font-size: .78rem; line-height: 1.5;
      color: #92400e; background: rgba(249, 115, 22, .08);
      border: 1px solid rgba(249, 115, 22, .25);
      border-radius: .6rem; padding: .5rem .7rem;
    }

    .vd-resumen { display: none; margin-top: .8rem; border-top: 1px dashed #e5e7eb; padding-top: .8rem; }
    .vd-resumen.visible { display: block; }
    .vd-resumen h4 { margin: 0 0 .4rem; font-size: .95rem; color: #1f2937; }
    .vd-resumen-linea { font-size: .92rem; color: #4b5563; margin: 0 0 .6rem; font-weight: 600; }
    .vd-resumen-lista { list-style: none; margin: 0 0 .9rem; padding: 0; display: grid; gap: .32rem; }
    .vd-resumen-item { font-size: .85rem; color: #374151; display: flex; gap: .5rem; align-items: baseline; }
    .vd-ri { width: 18px; text-align: center; font-weight: 800; flex: none; }
    .vd-ri.ok { color: #16a34a; }
    .vd-ri.mal { color: #ef4444; }
    .vd-ri.neu { color: #9ca3af; }
    .vd-verde {
      font-family: inherit; background: #f97316; color: #ffffff; border: 0;
      border-radius: 999px; padding: .52rem 1.05rem; font-weight: 800; font-size: .88rem;
      cursor: pointer; box-shadow: 0 6px 18px rgba(249, 115, 22, .3);
    }
    .vd-verde:hover { background: #ea580c; }

    /* Modal de pregunta: cubre TODO el recurso. Sin botón de cerrar:
       responde (o agota el tiempo) para seguir viendo. */
    .vd-modal { position: absolute; inset: 0; z-index: 20; display: none; background: rgba(15, 23, 42, .74); padding: 1rem; }
    .vd-modal.abierto { display: grid; place-items: center; }
    .vd-modal-caja {
      background: #ffffff; border-radius: 1.2rem; width: min(640px, 100%);
      max-height: 100%; overflow: auto; padding: 1rem 1.1rem 1.15rem;
      box-shadow: 0 24px 60px rgba(0, 0, 0, .35); outline: none;
      border-top: 5px solid #f97316;
    }
    .vd-modal-cab { display: flex; justify-content: space-between; align-items: center; gap: .6rem; flex-wrap: wrap; margin-bottom: .5rem; }
    .vd-modal-titulo { font-weight: 800; color: #c2410c; font-size: .92rem; letter-spacing: .03em; text-transform: uppercase; }
    .vd-cuenta-chip {
      font-variant-numeric: tabular-nums; background: #f3f4f6; color: #374151;
      font-weight: 800; font-size: .8rem; padding: .2rem .65rem; border-radius: 999px;
    }
    .vd-cuenta-chip.alerta { background: rgba(239, 68, 68, .12); color: #b91c1c; }
    .vd-cuenta { height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden; margin-bottom: .8rem; }
    .vd-cuenta-lleno { height: 100%; width: 100%; background: #f97316; border-radius: inherit; transition: width .25s linear; }
    .vd-cuenta-lleno.alerta { background: #ef4444; }
    .vd-obligatoria { font-size: .78rem; color: #6b7280; margin: 0 0 .8rem; }
    .vd-modal-aviso {
      display: none; margin-top: .75rem; font-weight: 700; color: #b91c1c;
      background: rgba(239, 68, 68, .08); border: 1px solid rgba(239, 68, 68, .3);
      border-radius: .7rem; padding: .5rem .7rem; font-size: .88rem;
    }
    .vd-modal-aviso.visible { display: block; }

    /* EXAMEN: botón con el que el propio video envía la pregunta */
    .vd-enviar-examen {
      display: block; margin: .8rem auto 0;
      font-family: inherit; border: 0; cursor: pointer;
      background: #f97316; color: #ffffff;
      border-radius: 999px; padding: .55rem 1.3rem;
      font-weight: 800; font-size: .9rem;
      box-shadow: 0 6px 18px rgba(249, 115, 22, .3);
    }
    .vd-enviar-examen:hover:not(:disabled) { background: #ea580c; }
    .vd-enviar-examen:disabled { opacity: .5; cursor: default; }
    .vd-resumen-unica {
      font-size: .84rem; font-weight: 700; color: #92400e;
      background: rgba(249, 115, 22, .08); border: 1px solid rgba(249, 115, 22, .25);
      border-radius: .6rem; padding: .5rem .7rem; margin: 0;
    }

    @media (max-width: 767px) {
      .vd-raiz { padding: .8rem; border-radius: .9rem; }
      .vd-panelo { gap: .4rem; }
      .vd-btn { width: 38px; height: 38px; }
      .vd-retro { padding: 0 .6rem; font-size: .78rem; }
      .vd-tiempo { font-size: .73rem; }
      .vd-terminar { margin-left: 0; }
      /* Móvil: la pregunta cubre TODA la pantalla — la caja del video
         es demasiado baja para leer una pregunta entera. */
      .vd-modal { position: fixed; z-index: 70; padding: .55rem; }
      .vd-modal-caja { padding: .85rem .85rem 1rem; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Iconos (SVG inline, sin emojis) ---------------- */

const SVG_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
const SVG_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

/* ---------------- Componente ---------------- */

/**
 * Monta un reproductor de video con preguntas intercaladas.
 * Devuelve { elemento, pausar(), destruir(), reiniciar(), resumen() }.
 * Las preguntas guardan su valor en la nota de la clase como
 * cualquier bloque de opcionMultiple (misma convención del proyecto).
 */
export function crearVideo(opciones = {}) {
  const {
    contenedor, perfil, clase, enlace,
    preguntas, puntaje = 10,
    titulo, ancho, columnas, aspecto,
    segundosPregunta = 45,
    alFinalizar,
  } = opciones;

  // TIPO contextual (clase/tarea/examen), igual que las demás utils.
  const tipo = String(opciones.tipo || clase?.tipo || "clase").toLowerCase().trim();
  const esTipoClase = tipo === "clase";
  const esTarea = tipo === "tarea";
  const esExamen = tipo === "examen";

  /* ── Validaciones (lanzan "video.js: …") ── */
  if (!TIPOS.includes(tipo)) {
    throw new Error(`video.js: 'tipo' debe ser "clase", "tarea" o "examen" (llegó: ${tipo}).`);
  }
  if (!contenedor || typeof contenedor.append !== "function") {
    throw new Error("video.js: falta 'contenedor' (elemento del DOM donde montar el video).");
  }
  if (!perfil || !perfil.uid) {
    throw new Error("video.js: falta 'perfil' (con uid): las preguntas guardan su valor en la nota de la clase.");
  }
  if (!clase || !clase.id) {
    throw new Error("video.js: falta 'clase' (con id): las preguntas guardan su valor en la nota de la clase.");
  }
  if (!Array.isArray(preguntas) || preguntas.length === 0) {
    throw new Error("video.js: falta la lista 'preguntas' (al menos una pregunta con su minuto).");
  }
  if (preguntas.length > 20) {
    throw new Error("video.js: demasiadas preguntas (máximo 20 por video).");
  }
  const totalPreguntas = preguntas.length;
  const puntajeTotal = Number(puntaje);
  if (!Number.isFinite(puntajeTotal) || puntajeTotal <= 0) {
    throw new Error("video.js: 'puntaje' debe ser un número mayor que 0 (el TOTAL del video, repartido equitativamente entre las preguntas).");
  }
  let porPregunta = redondear1(puntajeTotal / totalPreguntas);
  if (porPregunta > 10) {
    console.warn(
      "[video] El reparto del puntaje da", porPregunta, "por pregunta y el proyecto usa 0–10 por pregunta:",
      "se ajusta a 10 por pregunta (total", redondear1(10 * totalPreguntas) + ")."
    );
    porPregunta = 10;
  }
  const totalEfectivo = redondear1(porPregunta * totalPreguntas);
  let segPregunta = Number(segundosPregunta);
  if (!Number.isFinite(segPregunta) || segPregunta < 1) {
    console.warn("[video] 'segundosPregunta' debe ser un número ≥ 1 (defecto 45). Se usará 45.");
    segPregunta = 45;
  }

  const info = detectarEnlace(enlace);
  const aspectoCss = normalizarAspecto(aspecto) || info.aspecto;
  const esDoc = perfil?.rol === "docente";
  // En examen el video se ve UNA sola vez y solo hacia ADELANTE
  // (docente: repetición libre, nada se guarda).
  const unaSolaVez = esExamen && !esDoc;

  // Normaliza las preguntas (mismas reglas de contenido que opcionMultiple)
  const norm = preguntas.map((q, i) => {
    if (!q || typeof q !== "object") {
      throw new Error(`video.js: la pregunta ${i + 1} no es un objeto con { tiempo, indicacion, respuestas, respuestaCorrecta }.`);
    }
    const texto = String(q.indicacion ?? q.pregunta ?? "").trim();
    if (!texto) throw new Error(`video.js: la pregunta ${i + 1} no tiene 'indicacion'.`);
    const lista = (Array.isArray(q.respuestas) ? q.respuestas : Array.isArray(q.opciones) ? q.opciones : [])
      .map((o) => String(o ?? "").trim());
    if (lista.length < 2 || lista.length > 6) {
      throw new Error(`video.js: la pregunta ${i + 1} debe tener entre 2 y 6 respuestas (llegaron ${lista.length}).`);
    }
    if (lista.some((o) => !o)) throw new Error(`video.js: la pregunta ${i + 1} tiene respuestas vacías (cada una necesita texto).`);
    const idx = Number(q.respuestaCorrecta ?? q.correcta);
    if (!Number.isInteger(idx) || idx < 1 || idx > lista.length) {
      throw new Error(`video.js: la pregunta ${i + 1} necesita 'respuestaCorrecta' entero entre 1 y ${lista.length} (1 = primera).`);
    }
    return {
      n: i + 1,
      tiempo: aSegundos(q.tiempo ?? q.minuto),
      texto,
      lista,
      correcta: idx,
      qid: q.id ? slug(String(q.id)) : `v${hash8(String(enlace).trim())}-q${i + 1}`,
      resuelta: null, // correcta | fallada | tiempo | guardada | sin responder | sin alcanzar
      ganado: 0,
      abierta: false,
      pos: 0,
    };
  }).sort((a, b) => a.tiempo - b.tiempo);
  norm.forEach((p, i) => { p.pos = i + 1; });

  /* ── Estado ── */
  let estado = "inicial"; // inicial | reproduciendo | pausado | pregunta | fin
  let puntos = 0;
  let driver = null;
  let muerto = false;
  let notaSnapshot = {}; // qid → puntos guardados en sesiones anteriores
  let durActual = 0;
  let examenYaEnviado = false;   // examen: la nota trae enviado → bloqueado

  inyectarEstilos();

  /* Nota de la clase: pre-marca las preguntas ya respondidas (otras
     sesiones) para que NO se vuelvan a mostrar, igual que pide la
     regla del retroceso. El docente no guarda nada. */
  const promesaNota = esDoc
    ? Promise.resolve(null)
    : obtenerNota(perfil, clase).catch(() => null);
  promesaNota.then((nota) => {
    if (muerto || !nota || !nota.preguntas) return;
    notaSnapshot = nota.preguntas || {};

    // EXAMEN YA ENVIADO: el video NO se puede volver a ver (una sola
    // vez), igual que cualquier bloque de examen reabierto.
    if (unaSolaVez && nota.enviado) {
      examenYaEnviado = true;
      tapaTexto.textContent = "Examen enviado";
      tapaSub.textContent = "Ya enviaste este examen: el video no se puede volver a ver.";
      tapa.disabled = true;
      btnTerminar.disabled = true;
      btnPlay.disabled = true;
    }

    let cambio = false;
    norm.forEach((p) => {
      const g = notaSnapshot[p.qid];
      if (g != null && !p.resuelta && !p.abierta) {
        p.resuelta = "guardada";
        p.ganado = Number(g) || 0;
        cambio = true;
      }
    });
    if (cambio) { recalcularPuntos(); pintarChips(); }
  });

  /* ── Estructura ── */
  const raiz = document.createElement("section");
  raiz.className = "vd-raiz";
  raiz.innerHTML = `
    ${titulo ? `<h3 class="vd-titulo">${escapeHtml(String(titulo))}</h3>` : ""}
    <div class="vd-marco"${aspectoCss !== "16 / 9" ? ` style="aspect-ratio: ${aspectoCss};"` : ""}>
      <div class="vd-montaje"></div>
      <button type="button" class="vd-tapa">
        <span class="vd-tapa-icono">${SVG_PLAY}</span>
        <span class="vd-tapa-texto">Ver y responder</span>
        <span class="vd-tapa-sub"></span>
      </button>
    </div>
    <div class="vd-panelo">
      <button type="button" class="vd-btn vd-play" aria-label="Reproducir o pausar" disabled>${SVG_PLAY}</button>
      <button type="button" class="vd-btn vd-retro" aria-label="Retroceder ${RETRO} segundos" title="Retroceder ${RETRO} s" disabled>↺ ${RETRO}s</button>
      <div class="vd-progreso" aria-hidden="true"><div class="vd-progreso-lleno"></div></div>
      <span class="vd-tiempo">0:00</span>
      <span class="vd-chip vd-chip-preguntas">0/${totalPreguntas}</span>
      <span class="vd-chip vd-chip-puntos">0/${totalEfectivo} pts</span>
      <button type="button" class="vd-terminar">✓ Terminar</button>
    </div>
    ${info.controlado ? "" : `<p class="vd-nota-modo"><strong>Modo cronómetro:</strong> este video se reproduce con los controles de su propia plataforma (los navegadores no dejan controlar un video de otro sitio). Las preguntas salen según el reloj de la actividad y NINGUNA se puede saltar; en cada pregunta el video se tapa hasta responder o agotar el tiempo. Para pausa y bloqueo automáticos usa un enlace de YouTube, Vimeo o un archivo .mp4/.webm.</p>`}
    <div class="vd-resumen" aria-live="polite"></div>
    <div class="vd-modal" role="dialog" aria-modal="true" aria-label="Pregunta del video">
      <div class="vd-modal-caja" tabindex="-1">
        <div class="vd-modal-cab">
          <span class="vd-modal-titulo"></span>
          <span class="vd-cuenta-chip"></span>
        </div>
        <div class="vd-cuenta"><div class="vd-cuenta-lleno"></div></div>
        <p class="vd-obligatoria">Responde para seguir viendo: el video está pausado. Si no respondes a tiempo, la pregunta queda incorrecta y el video continúa.</p>
        <div class="vd-zona-om"></div>
        ${esExamen ? '<button type="button" class="vd-enviar-examen">Enviar respuesta</button>' : ""}
        <div class="vd-modal-aviso" aria-live="assertive"></div>
      </div>
    </div>`;
  contenedor.append(raiz);
  aplicarTamano(raiz, { columnas, ancho }); // misma convención de tamaño que las demás utils

  const montaje = raiz.querySelector(".vd-montaje");
  const tapa = raiz.querySelector(".vd-tapa");
  const tapaTexto = raiz.querySelector(".vd-tapa-texto");
  const tapaSub = raiz.querySelector(".vd-tapa-sub");
  const btnPlay = raiz.querySelector(".vd-play");
  const btnRetro = raiz.querySelector(".vd-retro");
  const progreso = raiz.querySelector(".vd-progreso");
  const progresoLleno = raiz.querySelector(".vd-progreso-lleno");
  const tiempoEl = raiz.querySelector(".vd-tiempo");
  const chipPreg = raiz.querySelector(".vd-chip-preguntas");
  const chipPuntos = raiz.querySelector(".vd-chip-puntos");
  const btnTerminar = raiz.querySelector(".vd-terminar");
  const resumenEl = raiz.querySelector(".vd-resumen");
  const modal = raiz.querySelector(".vd-modal");
  const modalCaja = raiz.querySelector(".vd-modal-caja");
  const modalTitulo = raiz.querySelector(".vd-modal-titulo");
  const cuentaChip = raiz.querySelector(".vd-cuenta-chip");
  const cuentaLleno = raiz.querySelector(".vd-cuenta-lleno");
  const zonaOm = raiz.querySelector(".vd-zona-om");
  const modalAviso = raiz.querySelector(".vd-modal-aviso");
  const btnEnviarExamen = esExamen ? raiz.querySelector(".vd-enviar-examen") : null;

  // EXAMEN: sin botón de retroceder y la tapa AVISA antes del play
  // (no se puede retroceder ni adelantar y solo se ve una vez).
  if (esExamen) btnRetro.style.display = "none";
  const avisoExamen =
    " · NO se puede retroceder ni adelantar" + (esDoc ? "" : " y solo se ve UNA vez");
  tapaTexto.textContent = esExamen
    ? (esDoc ? "Examen · vista docente" : "Examen · Ver una sola vez")
    : esTarea
      ? "Tarea · Ver y responder"
      : "Ver y responder";
  tapaSub.textContent =
    (info.controlado
      ? `${info.nombre} · el video se pausa en cada pregunta`
      : `${info.nombre} · el reloj se detiene en cada pregunta`) +
    (esExamen ? avisoExamen : "");

  let avisoErrorEl = null;
  function mostrarAvisoError(mensaje) {
    if (!avisoErrorEl) {
      avisoErrorEl = document.createElement("p");
      avisoErrorEl.className = "vd-aviso-error";
      raiz.append(avisoErrorEl);
    }
    avisoErrorEl.textContent = mensaje;
    avisoErrorEl.classList.add("visible");
  }

  /* ── Driver ── */
  function montarDriver() {
    const ganchos = {
      alTiempo: (t, dur) => { if (!muerto) enTiempo(t, dur); },
      alEstado: (s) => { if (!muerto) enEstado(s); },
      alError: (m) => { if (!muerto) mostrarAvisoError(m); },
    };
    if (info.plataforma === "youtube") driver = driverYouTube(montaje, info.videoId, ganchos, esExamen);
    else if (info.plataforma === "vimeo") driver = driverVimeo(montaje, info, ganchos, esExamen);
    else if (info.plataforma === "archivo") driver = driverLocal(montaje, info.urlEmbed, ganchos, esExamen);
    else driver = driverCronometro(montaje, info.urlEmbed, ganchos, esExamen);
    progreso.classList.toggle("crono", !info.controlado);
    driver.listo.then(() => {
      if (muerto) return;
      btnPlay.disabled = false;
      btnRetro.disabled = false;
    }).catch((e) => {
      if (muerto) return;
      tapa.disabled = true;
      mostrarAvisoError(e && e.message ? e.message : "No se pudo montar el reproductor.");
    });
  }

  function enTiempo(t, dur) {
    if (dur) durActual = dur;
    tiempoEl.textContent = dur ? `${mmss(t)} / ${mmss(dur)}` : mmss(t);
    if (dur) progresoLleno.style.width = `${Math.min(100, (t / dur) * 100)}%`;
    if (estado === "fin" || estado === "pregunta") return;
    for (const p of norm) {
      if (!p.resuelta && !p.abierta && t >= p.tiempo - 0.05) {
        abrirPregunta(p);
        break;
      }
    }
  }

  function enEstado(s) {
    if (s === "reproduciendo") {
      if (estado === "pregunta") return; // el modal manda
      estado = "reproduciendo";
      btnPlay.innerHTML = SVG_PAUSE;
      tapa.hidden = true;
    } else if (s === "pausado") {
      if (estado === "pregunta") return;
      estado = "pausado";
      btnPlay.innerHTML = SVG_PLAY;
    } else if (s === "fin") {
      terminar("auto");
    }
  }

  /* ── Preguntas ──
     Cada pregunta ES un bloque de opcionMultiple montado DESDE EL
     PRINCIPIO, en su propio contenedor (contrato del examen: montar
     TODOS los bloques antes del primer enviar() — si se montara cada
     uno al llegar su minuto, la 2.ª pregunta vería nota.enviado=true,
     puesto por la 1.ª enviada, y se bloquearía sola). El modal recibe
     el contenedor del bloque cuando llega su minuto. */
  function montarBloques() {
    for (const p of norm) {
      if (p.contOM) p.contOM.remove();
      p.contOM = document.createElement("div");
      p.cerradaSesion = true;
      p.ivCuenta = null;
      p.promesaOM = opcionMultiple({
        contenedor: p.contOM,
        perfil,
        clase,
        tipo,
        id: p.qid,
        indicacion: p.texto,
        respuestas: p.lista,
        respuestaCorrecta: p.correcta,
        puntaje: porPregunta,
      });
      p.promesaOM.then((ganado) => {
        if (muerto || !p.abierta || p.cerradaSesion) return; // cerrada por tiempo o nunca abierta
        p.cerradaSesion = true;
        if (p.ivCuenta) { clearInterval(p.ivCuenta); p.ivCuenta = null; }
        p.resuelta = (Number(ganado) || 0) > 0 ? "correcta" : "fallada";
        p.ganado = Number(ganado) || 0;
        recalcularPuntos();
        pintarChips();
        setTimeout(() => cerrarPregunta(p), 1800); // deja ver el feedback del bloque
      }).catch(() => {});
    }
  }
  montarBloques();

  function pintaCuenta(restanteMs) {
    const s = Math.ceil(restanteMs / 1000);
    const alerta = s <= 10;
    cuentaChip.textContent = `${s} s`;
    cuentaChip.classList.toggle("alerta", alerta);
    cuentaLleno.classList.toggle("alerta", alerta);
    cuentaLleno.style.width = `${Math.min(100, (restanteMs / (segPregunta * 1000)) * 100)}%`;
  }

  async function abrirPregunta(p) {
    if (muerto || estado === "fin" || p.abierta || p.resuelta) return;
    p.abierta = true;
    driver.pausar(); // petición literal: el video se pausa al salir la pregunta
    estado = "pregunta";
    btnPlay.innerHTML = SVG_PLAY;
    tapa.hidden = true;
    try { await promesaNota; } catch (e) { /* nada */ }
    if (muerto) return;
    if (p.resuelta) { // la nota la marcó respondida mientras esperábamos
      p.abierta = false;
      if (estado === "pregunta") { estado = "pausado"; reanudarDespuesDePregunta(); }
      return;
    }

    raiz.classList.add("vd-bloqueado");
    modalTitulo.textContent = `Pregunta ${p.pos} de ${totalPreguntas}`;
    modalAviso.textContent = "";
    modalAviso.classList.remove("visible");
    if (btnEnviarExamen) btnEnviarExamen.disabled = false; // reactiva por pregunta
    zonaOm.append(p.contOM); // el bloque YA montado entra al modal
    modal.classList.add("abierto");
    modalCaja.focus({ preventScroll: true });

    const totalMs = Math.round(segPregunta * 1000);
    pintaCuenta(totalMs);
    const deadline = Date.now() + totalMs;
    p.cerradaSesion = false;
    p.ivCuenta = setInterval(() => {
      const restante = Math.max(0, deadline - Date.now());
      pintaCuenta(restante);
      if (restante <= 0 && !p.cerradaSesion) {
        clearInterval(p.ivCuenta);
        p.ivCuenta = null;
        p.cerradaSesion = true;
        // EXAMEN: se envía igual al agotarse (guarda SIEMPRE, 0 incluido)
        if (esExamen && p.promesaOM) {
          try { p.promesaOM.enviar(); } catch (e) { /* nada */ }
        }
        // Tiempo agotado: INCORRECTA y el video continúa (petición literal)
        p.resuelta = "tiempo";
        p.ganado = 0;
        recalcularPuntos();
        pintarChips();
        modalAviso.textContent = "Tiempo agotado: la pregunta queda incorrecta y el video continúa.";
        modalAviso.classList.add("visible");
        setTimeout(() => cerrarPregunta(p), 1700);
      }
    }, 250);
  }

  function cerrarPregunta(p) {
    if (muerto) return;
    modal.classList.remove("abierto");
    zonaOm.innerHTML = "";
    modalAviso.textContent = "";
    modalAviso.classList.remove("visible");
    raiz.classList.remove("vd-bloqueado");
    p.cerradaSesion = true;
    if (p.ivCuenta) { clearInterval(p.ivCuenta); p.ivCuenta = null; }
    p.abierta = false;
    if (estado !== "fin") {
      estado = "pausado";
      reanudarDespuesDePregunta();
    }
  }

  function reanudarDespuesDePregunta() {
    if (muerto || estado === "fin" || estado === "pregunta") return;
    driver.iniciar();
    // Si el navegador bloquea el reanudado automático (política de
    // autoplay en algunos navegadores), se pide un toque con la tapa.
    setTimeout(() => {
      if (muerto || estado === "fin" || estado === "pregunta") return;
      if (estado !== "reproduciendo") {
        tapaTexto.textContent = "Continuar";
        tapa.hidden = false;
      }
    }, 1600);
  }

  /* ── Cierre de la actividad ── */
  function resumen() {
    return {
      puntos,
      maxPuntos: totalEfectivo,
      correctas: norm.filter((p) => p.ganado > 0 && (p.resuelta === "correcta" || p.resuelta === "guardada")).length,
      respondidas: norm.filter((p) => p.resuelta && p.resuelta !== "sin responder" && p.resuelta !== "sin alcanzar").length,
      total: totalPreguntas,
      detalle: norm.map((p) => ({ pregunta: p.pos, tiempo: p.tiempo, resultado: p.resuelta, ganado: p.ganado })),
    };
  }

  function terminar(modo) {
    if (muerto || estado === "fin") return;
    const abierta = norm.find((p) => p.abierta);
    estado = "fin";
    if (driver) driver.pausar();
    // EXAMEN: la pregunta que quedó ABIERTA se envía igual (guarda 0);
    // las nunca alcanzadas no guardan (valen 0 en el total).
    if (esExamen && !esDoc && abierta && abierta.promesaOM) {
      try { abierta.promesaOM.enviar(); } catch (e) { /* nada */ }
    }
    norm.forEach((p) => {
      if (!p.resuelta) {
        p.resuelta = modo === "auto" ? "sin alcanzar" : "sin responder";
        p.ganado = 0;
      }
    });
    recalcularPuntos();
    pintarChips();
    if (abierta) {
      modal.classList.remove("abierto");
      zonaOm.innerHTML = "";
      raiz.classList.remove("vd-bloqueado");
    }
    tapa.hidden = true;
    mostrarResumen();
    if (typeof alFinalizar === "function") {
      try { alFinalizar(resumen()); } catch (e) { console.error("[video] alFinalizar:", e); }
    }
  }

  function mostrarResumen() {
    const r = resumen();
    const items = norm.map((p) => {
      let marca = "·", cls = "neu", texto = "No alcanzada";
      if (p.resuelta === "guardada") { marca = "✓"; cls = "ok"; texto = "Respondida antes"; }
      else if (p.resuelta === "correcta") { marca = "✓"; cls = "ok"; texto = "Correcta"; }
      else if (p.resuelta === "fallada") { marca = "✕"; cls = "mal"; texto = "Incorrecta"; }
      else if (p.resuelta === "tiempo") { marca = "✕"; cls = "mal"; texto = "Sin responder (tiempo agotado)"; }
      else if (p.resuelta === "sin responder") { marca = "·"; cls = "neu"; texto = "Sin responder"; }
      return `<li class="vd-resumen-item"><span class="vd-ri ${cls}">${marca}</span><span><strong>Pregunta ${p.pos}</strong> (${mmss(p.tiempo)}) — ${texto}, ${p.ganado ? "+" + p.ganado : "+0"} pts</span></li>`;
    }).join("");
    resumenEl.innerHTML = `
      <h4>Resumen del video</h4>
      <p class="vd-resumen-linea">Puntos: <strong>${r.puntos} / ${r.maxPuntos}</strong> · ${r.correctas} de ${r.total} correctas${esDoc ? " · vista docente: nada se guarda" : ""}</p>
      <ul class="vd-resumen-lista">${items}</ul>
      ${unaSolaVez
        ? `<p class="vd-resumen-unica">Examen enviado: este video solo se ve UNA vez.</p>`
        : `<button type="button" class="vd-verde">↺ Ver de nuevo</button>`}`;
    resumenEl.classList.add("visible");
    const btnVer = resumenEl.querySelector(".vd-verde");
    if (btnVer) btnVer.addEventListener("click", reiniciar);
  }

  function reiniciar() {
    if (muerto || estado !== "fin") return;
    if (unaSolaVez) return; // examen: UNA sola vez (el docente sí puede)
    estado = "inicial";
    montarBloques(); // bloques FRESCOS: los anteriores ya se usaron
    norm.forEach((p) => { p.resuelta = null; p.ganado = 0; p.abierta = false; });
    if (!esDoc) {
      // La nota pudo haber cambiado DURANTE la sesión (respuestas de
      // esta misma corrida ya guardadas): se relea antes de pre-marcar.
      obtenerNota(perfil, clase).then((nota) => {
        if (muerto || estado !== "inicial") return;
        notaSnapshot = (nota && nota.preguntas) || {};
        norm.forEach((p) => {
          const g = notaSnapshot[p.qid];
          if (g != null) { p.resuelta = "guardada"; p.ganado = Number(g) || 0; }
        });
        recalcularPuntos();
        pintarChips();
      }).catch(() => {});
    }
    recalcularPuntos();
    pintarChips();
    resumenEl.classList.remove("visible");
    resumenEl.innerHTML = "";
    btnPlay.innerHTML = SVG_PLAY;
    progresoLleno.style.width = "0%";
    tiempoEl.textContent = "0:00";
    durActual = 0;
    if (driver) driver.destruir();
    montarDriver();
    tapaTexto.textContent = "Ver y responder";
    tapa.hidden = false;
  }

  /* ── Puntaje y chips ── */
  function recalcularPuntos() {
    puntos = redondear1(norm.reduce((s, p) => s + (Number(p.ganado) || 0), 0));
  }

  function pintarChips() {
    const resueltas = norm.filter((p) => p.resuelta && p.resuelta !== "sin responder" && p.resuelta !== "sin alcanzar").length;
    chipPreg.textContent = `${resueltas}/${totalPreguntas}`;
    chipPuntos.textContent = `${puntos}/${totalEfectivo} pts`;
  }

  /* ── Botones propios (los ÚNICOS: ▶/⏸ y ↺ 3s) ── */
  function marcarActiva() {
    if (instanciaActiva && instanciaActiva !== api) {
      try { instanciaActiva.pausar(); } catch (e) { /* nada */ }
    }
    instanciaActiva = api;
  }

  tapa.addEventListener("click", () => {
    if (muerto || estado === "fin" || examenYaEnviado) return;
    marcarActiva();
    tapa.hidden = true;
    driver.iniciar();
  });

  btnPlay.addEventListener("click", () => {
    if (muerto || estado === "fin" || estado === "pregunta" || examenYaEnviado) return;
    marcarActiva();
    driver.alternar();
  });

  btnRetro.addEventListener("click", () => {
    if (muerto || estado === "fin" || estado === "pregunta" || esExamen) return;
    driver.retroceder(RETRO);
  });

  btnTerminar.addEventListener("click", () => {
    if (!examenYaEnviado) terminar("manual");
  });

  // EXAMEN: el botón del modal envía la pregunta con UNA sola
  // oportunidad (el bloque de opcionMultiple la guarda al instante).
  if (btnEnviarExamen) {
    btnEnviarExamen.addEventListener("click", () => {
      const abierta = norm.find((q) => q.abierta);
      if (muerto || estado !== "pregunta" || !abierta || !abierta.promesaOM) return;
      if (!zonaOm.querySelector(".om-opcion.seleccionada")) {
        modalAviso.textContent = "Elige una respuesta antes de enviar.";
        modalAviso.classList.add("visible");
        return;
      }
      modalAviso.classList.remove("visible");
      btnEnviarExamen.disabled = true;
      abierta.promesaOM.enviar();
    });
  }

  /* ── Arranque ── */
  montarDriver();
  cargarFormulas().catch(() => {}); // precarga de KaTeX para que la 1.ª pregunta se monte al instante

  const api = {
    elemento: raiz,
    pausar() { if (!muerto && driver) driver.pausar(); },
    destruir() {
      if (muerto) return;
      muerto = true;
      if (driver) driver.destruir();
      if (instanciaActiva === api) instanciaActiva = null;
      raiz.remove();
    },
    reiniciar,
    resumen,
  };
  return api;
}

/* ---------------- API pública ---------------- */

/** Detiene el video que está sonando (para "← Clases", igual que
 *  detenerTTSActivo()). Si hay pregunta abierta, el modal sigue:
 *  la actividad no se abandona a medias por accidente. */
export function detenerVideoActivo() {
  if (instanciaActiva) {
    try { instanciaActiva.pausar(); } catch (e) { /* nada */ }
  }
}