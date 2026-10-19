// ============================================================
// userbar.js — Barra superior (js/components/userbar.js)
//
// Se muestra arriba de TODAS las páginas cuando hay sesión iniciada.
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
      background-color: #7c3aed;
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
      color: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .userbar-menu-grado {
      font-size: .85rem;
      color: #ffffff;
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
 * @returns {HTMLElement}   la barra creada
 */
export function renderUserbar(perfil, titulo = "Mis Clases Online") {
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