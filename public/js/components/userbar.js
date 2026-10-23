// ============================================================
// userbar.js — Barra superior (js/components/userbar.js)
//
// Se muestra arriba de TODAS las páginas cuando hay sesión iniciada.
//
// REGLA DE NAVEGADOR: la app SOLO funciona en Google Chrome. Si la
// página se abre en otro navegador (Safari, Firefox, Edge, Opera,
// Brave, Samsung Internet, etc.) se muestra "Navegador no permitido"
// a pantalla completa y se cierra la sesión (logout de Firebase Auth).
//
// Escritorio (≥ 768px):
//   [título de la página] ··· [nombre corto] [grado*] [cerrar sesión]
// Celular (< 768px):
//   [título de la página] ··· [primer nombre] [icono de usuario →]
//      menú desplegable: nombre completo, grado* y cerrar sesión.
//   (*) el grado SOLO se muestra si el rol es "estudiante".
//
// - Nombre corto = palabra[0] + palabra[2] del nombre completo
//   ("Juan Carlos Pérez López" → "Juan Pérez"); si el nombre tiene solo
//   2 palabras usa la segunda; si tiene 1, solo esa.
// - Si no hay sesión (login/auth), la barra se oculta sola: un vigía
//   observa #app y elimina la barra cuando aparece .auth-vista.
//
// Convención: CSS implícito (inyectado aquí) · 100% responsiva.
// ============================================================

import { GRADOS, logout } from "./auth.js";
import { escapeHtml } from "../utils/helpers.js";

let vigiaListo = false;

/* ---------------- Helpers ---------------- */

// palabra[0] + palabra[2] ("Juan Carlos Pérez López" → "Juan Pérez")
function nombreCorto(nombreCompleto) {
  const p = (nombreCompleto || "").trim().split(/\s+/);
  return [p[0], p[2] ?? p[1] ?? ""].filter(Boolean).join(" ");
}

// palabra[0] ("Juan Carlos Pérez López" → "Juan")
function primerNombre(nombreCompleto) {
  return (nombreCompleto || "").trim().split(/\s+/)[0] || "";
}

function nombreGrado(id) {
  return GRADOS.find((g) => g.id === Number(id))?.nombre || "";
}

/* ---------------- Detección del navegador (solo Chrome) ---------------- */

/**
 * Devuelve true SOLO si el navegador es Google Chrome.
 *
 * La detección NO se basa solo en la cadena User-Agent porque varios
 * navegadores la imitan:
 * - Brave copia la UA de Chrome, pero expone `navigator.brave`.
 * - Edge / Opera / Samsung / Vivaldi etc. añaden su marca (Edg/, OPR/,
 *   SamsungBrowser…) a la UA de Chrome.
 * - Los Chromium modernos declaran la marca real en
 *   `navigator.userAgentData.brands` (Chrome → "Google Chrome";
 *   Brave/Edge/Opera NO la declaran).
 * - Safari y Firefox no llevan "Chrome" en la UA.
 */
function esChromePermitido() {
  const ua = navigator.userAgent || "";

  // Navegadores que se declaran abiertamente como "no Chrome"
  if (/firefox|fxios/i.test(ua)) return false;                       // Firefox
  if (/edg(e|a|ios)?\//i.test(ua)) return false;                     // Edge (PC/Android/iOS)
  if (/opr\/|opios|opera/i.test(ua)) return false;                   // Opera / Opera GX
  if (/samsungbrowser/i.test(ua)) return false;                      // Samsung Internet
  if (/vivaldi|yabrowser|duckduckgo|whale|ucbrowser/i.test(ua)) return false;

  // Brave: su UA imita a Chrome, pero expone navigator.brave
  if (typeof navigator.brave?.isBrave === "function") return false;

  // Chromium moderno: userAgentData dice la marca real del navegador.
  // Chrome real declara "Google Chrome"; los otros Chromium no.
  const marcas = navigator.userAgentData?.brands || [];
  if (marcas.length) {
    return marcas.some((b) => /google chrome/i.test(b.brand));
  }

  // Resto (Safari, Firefox viejos, WebKit en general): la UA debe
  // decir Chrome (escritorio/Android) o CriOS (Chrome para iPhone/iPad)
  return /chrome\/|crios\//i.test(ua);
}

/* ---------------- Bloqueo: navegador no permitido ---------------- */

function inyectarEstilosBloqueo() {
  if (document.getElementById("userbar-bloqueo-estilos")) return;
  const estilo = document.createElement("style");
  estilo.id = "userbar-bloqueo-estilos";
  estilo.textContent = `
    #userbar-bloqueo {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background: #ffffff;
      background-image:
        radial-gradient(circle at 10% 15%, rgba(124, 58, 237, .12), transparent 30%),
        radial-gradient(circle at 90% 85%, rgba(249, 115, 22, .10), transparent 32%),
        radial-gradient(circle at 85% 10%, rgba(220, 38, 38, .10), transparent 26%);
      font-family: system-ui, sans-serif;
    }

    .userbar-bloqueo-caja {
      box-sizing: border-box;
      width: min(420px, 100%);
      background: #ffffff;
      border: 1px solid #ece9f6;
      border-radius: 1.5rem;
      box-shadow: 0 18px 50px rgba(17, 12, 46, .12);
      padding: 2rem 1.75rem;
      text-align: center;
    }

    .userbar-bloqueo-logo {
      width: 58px;
      height: 58px;
      margin: 0 auto .55rem;
      border-radius: 1rem;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: #ffffff;
      font-weight: 800;
      font-size: 1.6rem;
      box-shadow: 0 8px 20px rgba(124, 58, 237, .35);
    }

    .userbar-bloqueo-titulo {
      margin: 0 0 .35rem;
      font-size: 1.45rem;
      font-weight: 800;
      color: #dc2626;
    }

    .userbar-bloqueo-sub {
      margin: 0 0 1.25rem;
      color: #6b7280;
      font-size: .95rem;
      line-height: 1.45;
    }
    .userbar-bloqueo-sub strong { color: #7c3aed; font-weight: 700; }

    .userbar-bloqueo-navegador {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      font-weight: 700;
      color: #1f2937;
      background: #f3f0fd;
      border: 1px solid #e3dcfa;
      border-radius: 999px;
      padding: .55rem .95rem;
      font-size: .95rem;
    }
    .userbar-bloqueo-navegador sl-icon {
      font-size: 1.15rem;
      color: #7c3aed;
    }

    .userbar-bloqueo-nota {
      margin: 1.15rem 0 0;
      font-size: .8rem;
      color: #9ca3af;
    }

    @media (max-height: 560px) {
      #userbar-bloqueo { padding: .75rem; }
      .userbar-bloqueo-caja { padding: 1.1rem 1.25rem; border-radius: 1.1rem; }
      .userbar-bloqueo-logo { width: 42px; height: 42px; font-size: 1.15rem; }
    }
  `;
  document.head.append(estilo);
}

/**
 * Vela de bloqueo a pantalla completa + cierre de sesión.
 * - Quita la barra (en este navegador no corresponde).
 * - Muestra "Navegador no permitido" por encima de todo (z-index 9999,
 *   tapa también el login que auth.js vuelva a dibujar detrás).
 * - Cierra la sesión del auth (logout → signOut). Si el usuario vuelve
 *   a iniciar sesión en este navegador, renderUserbar() vuelve a
 *   bloquear y a cerrarla: aquí no se puede usar la app.
 */
function bloquearNavegador() {
  inyectarEstilosBloqueo();
  document.querySelector(".userbar")?.remove();

  // Cerrar la sesión de auth (siempre, aunque el velo ya exista)
  try {
    logout().catch(() => {});
  } catch (e) { /* sin sesión que cerrar */ }

  if (document.getElementById("userbar-bloqueo")) return;

  const velo = document.createElement("div");
  velo.id = "userbar-bloqueo";
  velo.innerHTML = `
    <div class="userbar-bloqueo-caja">
      <div class="userbar-bloqueo-logo">M</div>

      <h1 class="userbar-bloqueo-titulo">Navegador no permitido</h1>
      <p class="userbar-bloqueo-sub">
        Mis Clases Online solo funciona en <strong>Google Chrome</strong>.
        Tu sesión se cerró automáticamente.
      </p>

      <div class="userbar-bloqueo-navegador">
        <sl-icon name="browser-chrome"></sl-icon>
        Abre la página con Google Chrome
      </div>

      <p class="userbar-bloqueo-nota">
        Copia el enlace y pégalo en Chrome para continuar.
      </p>
    </div>`;
  document.body.append(velo);
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (document.getElementById("userbar-estilos")) return;
  const estilo = document.createElement("style");
  estilo.id = "userbar-estilos";
  estilo.textContent = `
    .userbar {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      height: 56px;
      padding: 0 clamp(.75rem, 3vw, 1.5rem);
      background: #7c3aed; /* morado */
      color: #ffffff;
      box-shadow: 0 2px 12px rgba(124, 58, 237, .35);
      font-family: system-ui, sans-serif;
    }

    .userbar-titulo {
      font-weight: 700;
      font-size: 1.05rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .userbar-derecha {
      display: flex;
      align-items: center;
      gap: .65rem;
    }

    /* Grupos escritorio / celular */
    .userbar-escritorio,
    .userbar-movil {
      display: flex;
      align-items: center;
      gap: .65rem;
    }
    .userbar-movil { display: none; }

    .userbar-nombre {
      font-size: .95rem;
      white-space: nowrap;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* sl-tag del grado, recoloreado para fondo morado */
    .userbar-grado::part(base) {
      background: rgba(255, 255, 255, .18);
      border: 1px solid rgba(255, 255, 255, .28);
      color: #ffffff;
    }

    /* Botones de icono en blanco */
    .userbar sl-icon-button::part(base) {
      color: #ffffff;
      font-size: 1.35rem;
    }
    .userbar sl-icon-button::part(base):hover {
      background: rgba(255, 255, 255, .15);
      border-radius: 50%;
    }

    /* Menú desplegable (celular) */
    .userbar-menu::part(panel) {
      border-radius: .9rem;
      border: 1px solid #ece9f6;
      box-shadow: 0 10px 30px rgba(17, 12, 46, .18);
    }
    .userbar-menu-contenido {
      box-sizing: border-box;
      display: grid;
      gap: .5rem;
      padding: .9rem;
      min-width: 220px;
      max-width: min(280px, 80vw);
      font-family: system-ui, sans-serif;
    }
    .userbar-menu-nombre {
      font-weight: 600;
      color: #1f2937;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .userbar-menu-grado {
      font-size: .85rem;
      color: #7c3aed;
    }

    /* ── Celular ── */
    @media (max-width: 767px) {
      .userbar { height: 52px; }
      .userbar-escritorio { display: none; }
      .userbar-movil { display: flex; gap: .4rem; }
      .userbar-nombre { max-width: 110px; font-size: .9rem; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Ocultarse sola cuando aparece el login ---------------- */

function vigilarLogin() {
  if (vigiaListo) return;
  const app = document.getElementById("app");
  if (!app) return;
  vigiaListo = true;
  // Si auth.js vuelve a dibujar el login (.auth-vista dentro de #app),
  // esta barra ya no corresponde y se elimina.
  new MutationObserver(() => {
    if (document.querySelector(".auth-vista")) {
      document.querySelector(".userbar")?.remove();
    }
  }).observe(app, { childList: true });
}

/* ---------------- API pública ---------------- */

/**
 * Dibuja (o redibuja) la barra superior.
 * @param {object} perfil   perfil del usuario (users/{uid}: nombre, rol, grados…)
 * @param {string} [titulo] título de la página (por defecto "Mis Clases Online")
 * @returns {HTMLElement}   la barra creada (null si el navegador no es Chrome)
 */
export function renderUserbar(perfil, titulo = "Mis Clases Online") {
  // REGLA: solo Google Chrome. En otro navegador → aviso a pantalla
  // completa + cierre de sesión, y la barra no se dibuja.
  if (!esChromePermitido()) {
    bloquearNavegador();
    return null;
  }

  inyectarEstilos();
  vigilarLogin();

  // Si ya había una barra (cambio de título / re-login), reemplazarla
  document.querySelector(".userbar")?.remove();

  const esEstudiante = perfil.rol === "estudiante";
  const corto = nombreCorto(perfil.nombre);
  const primero = primerNombre(perfil.nombre);
  const completo = perfil.nombre || "";
  const gradoTxt = esEstudiante ? nombreGrado((perfil.grados || [])[0]) : "";
  const conGrado = esEstudiante && gradoTxt ? true : false;

  const barra = document.createElement("header");
  barra.className = "userbar";
  barra.innerHTML = `
    <span class="userbar-titulo">${escapeHtml(titulo)}</span>

    <div class="userbar-derecha">
      <!-- ── Escritorio ── -->
      <div class="userbar-escritorio">
        <span class="userbar-nombre" title="${escapeHtml(completo)}">${escapeHtml(corto)}</span>
        ${conGrado ? `<sl-tag class="userbar-grado" size="small">${escapeHtml(gradoTxt)}</sl-tag>` : ""}
        <sl-icon-button class="userbar-salir" name="box-arrow-right"
                        label="Cerrar sesión" title="Cerrar sesión"></sl-icon-button>
      </div>

      <!-- ── Celular ── -->
      <div class="userbar-movil">
        <span class="userbar-nombre">${escapeHtml(primero)}</span>
        <sl-dropdown class="userbar-menu">
          <sl-icon-button slot="trigger" name="person-circle" label="Mi cuenta"></sl-icon-button>
          <div class="userbar-menu-contenido">
            <span class="userbar-menu-nombre" title="${escapeHtml(completo)}">${escapeHtml(completo)}</span>
            ${conGrado ? `<span class="userbar-menu-grado">${escapeHtml(gradoTxt)}</span>` : ""}
            <sl-button class="userbar-menu-salir" variant="danger" size="small"
                       style="width: 100%">Cerrar sesión</sl-button>
          </div>
        </sl-dropdown>
      </div>
    </div>`;

  // Cerrar sesión (escritorio y celular)
  barra.querySelector(".userbar-salir")?.addEventListener("click", () => logout());
  barra.querySelector(".userbar-menu-salir")?.addEventListener("click", () => {
    barra.querySelector(".userbar-menu")?.hide();
    logout();
  });

  // La barra vive en <body>, antes de <main id="app"> (las vistas
  // reemplazan el contenido de #app sin tocarla)
  document.body.prepend(barra);
  return barra;
}