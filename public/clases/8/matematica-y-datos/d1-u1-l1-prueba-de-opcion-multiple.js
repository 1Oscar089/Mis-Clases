// ============================================================
// CLASE generada con el editor «Crear» — Mis Clases Online
// Tipo: clase · ID: — · Título: —
// Fecha: 21 de octubre de 2026
//
// CÓMO USARLO
//   1. Guarda este archivo (con el nombre del ID) en
//      public/clases/<grado>/<materia>/ — o donde lo necesites.
//   2. Se abre con render(perfil, contenedor, clase), igual que
//      las demás clases del proyecto.
//   3. Los bloques quedan en un lienzo de 820 px con posiciones
//      exactas en píxeles. Para retocar: edita este archivo o
//      vuelve al editor «Crear».
// ============================================================

import { renderUserbar } from "../../../js/components/userbar.js";
import { render as renderClases } from "../../../js/components/clases.js";
import { crearSecciones } from "../../../js/componentes/section.js";

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
    .cg-lienzo { position: relative; width: 100%; min-height: 660px; isolation: isolate; }
    .cg-bloque { position: absolute; }
  `;
  document.head.append(estilo);
}

// Contenido de la pieza (lo llama clases.js al abrirla)
export function render(perfil, contenedor, clase) {
  if (!perfil || !contenedor) return;
  inyectarEstilos();
  renderUserbar(perfil, "Mis Clases Online");

  contenedor.innerHTML = `
    <div class="mco-generada">
      <button class="cg-volver" id="cg-volver">
        <sl-icon name="arrow-left"></sl-icon> Volver
      </button>
      <div class="cg-lienzo" id="cg-lienzo"></div>
    </div>`;

  contenedor.querySelector("#cg-volver").addEventListener("click", () => {
    renderClases(perfil, contenedor);
  });

  const lienzo = contenedor.querySelector("#cg-lienzo");

  // ─── Bloque 1 · Secciones / láminas ───
  const b1 = document.createElement("div");
  b1.className = "cg-bloque";
  b1.style.left = "120px";
  b1.style.top = "60px";
  b1.style.width = "340px";
  lienzo.appendChild(b1);
  crearSecciones({
    secciones: undefined,
    avance: "estandar",
    contenedor: b1
  });

}