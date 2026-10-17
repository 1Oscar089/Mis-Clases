// ============================================================
// app.js — Punto de entrada principal (js/app.js)
//
// Orquesta la aplicación:
// 1. auth.js maneja el acceso (solo @clases.edu.sv) y el perfil.
// 2. Cuando hay usuario con perfil completo, renderiza la app.
// ============================================================

import { initAuth, logout, GRADOS } from "./components/auth.js";
import { escapeHtml } from "./utils/helpers.js";

const raiz = document.getElementById("app");

// Arranca el flujo de autenticación
initAuth(raiz, (perfil) => {
  renderApp(perfil);
});

function nombreGrado(id) {
  return GRADOS.find((g) => g.id === Number(id))?.nombre || String(id);
}

function inyectarEstilosApp() {
  if (document.getElementById("app-estilos")) return;
  const estilo = document.createElement("style");
  estilo.id = "app-estilos";
  estilo.textContent = `
    .app-vista { min-height: 100vh; background: #ffffff; }
    .app-barra {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.6rem 1.25rem;
      background: #7c3aed; /* morado */
      color: #ffffff;
    }
    .app-marca { font-weight: 700; }
    .app-usuario { display: flex; align-items: center; gap: 0.75rem; }
    .app-nombre { font-size: 0.95rem; }
    .app-contenido { padding: 1.5rem; display: grid; place-items: start center; }
    .app-bienvenida { width: min(640px, 100%); }
    .app-tabla { width: 100%; border-collapse: collapse; }
    .app-tabla td {
      padding: 0.35rem 0.5rem;
      border-bottom: 1px solid var(--sl-color-neutral-200);
    }
    .app-tabla td:first-child { color: var(--sl-color-neutral-500); width: 40%; }
    .app-nota { color: var(--sl-color-neutral-500); font-size: 0.9rem; margin-bottom: 0; }
  `;
  document.head.append(estilo);
}

function renderApp(perfil) {
  inyectarEstilosApp();

  const esEstudiante = perfil.rol === "estudiante";
  const grados = (perfil.grados || []).slice().sort((a, b) => a - b);
  const gradosTxt = grados.map(nombreGrado).join(", ");

  const filasDetalle = esEstudiante
    ? `<tr><td>NIE</td><td><strong>${escapeHtml(perfil.nie || "")}</strong></td></tr>
       <tr><td>Grado</td><td>${escapeHtml(gradosTxt)}</td></tr>`
    : `<tr><td>Grados que imparte</td><td>${escapeHtml(gradosTxt)}</td></tr>`;

  raiz.innerHTML = `
    <div class="app-vista">
      <header class="app-barra">
        <span class="app-marca">Mis Clases Online</span>
        <div class="app-usuario">
          <sl-tag variant="${esEstudiante ? "success" : "warning"}">${escapeHtml(perfil.rol)}</sl-tag>
          <span class="app-nombre">${escapeHtml(perfil.nombre)}</span>
          <sl-button id="btn-salir" size="small" variant="neutral" outline>Salir</sl-button>
        </div>
      </header>

      <main class="app-contenido">
        <sl-card class="app-bienvenida">
          <h2 slot="header">¡Hola, ${escapeHtml(perfil.nombre)}!</h2>
          <p>
            Sesión iniciada correctamente con
            <strong>${escapeHtml(perfil.email || "")}</strong>.
          </p>

          <sl-details summary="Datos del perfil">
            <table class="app-tabla">
              <tr><td>Rol</td><td>${escapeHtml(perfil.rol)}</td></tr>
              ${filasDetalle}
            </table>
          </sl-details>

          <p class="app-nota">Aquí irá el contenido de tus clases (próximos módulos).</p>
        </sl-card>
      </main>
    </div>`;

  raiz.querySelector("#btn-salir").addEventListener("click", () => logout());
}
