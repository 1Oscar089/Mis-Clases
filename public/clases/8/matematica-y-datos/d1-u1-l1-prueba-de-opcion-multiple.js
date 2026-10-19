// ============================================================
// Clase de PRUEBA — 8° grado · Matemática y Datos
// Día 1 · Unidad 1 · Lección 1 → "Prueba de opción múltiple"
// public/clases/8/matematica-y-datos/d1-u1-l1-prueba-de-opcion-multiple.js
//
// Demuestra la utilidad js/utils/opcionMultiple.js:
//   · Correcta al 1er intento → +1 punto.
//   · Correcta al 2do intento → +0.5 punto.
//   · Fallada 2 veces → 0 puntos (reintentable en otra sesión).
// ============================================================

import { renderUserbar } from "../../../js/components/userbar.js";
import { render as renderClases } from "../../../js/components/clases.js";
import { opcionMultiple } from "../../../js/utils/opcionMultiple.js";

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "clase-prueba-estilos";
  estilo.textContent = `
    .clase-prueba {
      max-width: 820px;
      margin: 0 auto;
      padding: 1.25rem clamp(1rem, 4vw, 2rem) 2.5rem;
      font-family: system-ui, sans-serif;
    }

    .cp-volver {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      color: #4b5563;
      border-radius: 999px;
      padding: .42rem .85rem;
      font-size: .85rem;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 1rem;
      transition: border-color .15s ease, color .15s ease, box-shadow .15s ease;
    }
    .cp-volver:hover {
      border-color: #7c3aed;
      color: #7c3aed;
      box-shadow: 0 4px 14px rgba(124, 58, 237, .12);
    }

    .cp-cab {
      display: flex;
      gap: .4rem;
      flex-wrap: wrap;
      margin-bottom: .4rem;
    }
    .cp-chip {
      background: rgba(37, 99, 235, .12);
      color: #2563eb;
      font-size: .74rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
    }

    .clase-prueba h1 {
      margin: .1rem 0 .8rem;
      font-size: 1.5rem;
      color: #1f2937;
    }
    .clase-prueba p {
      margin: 0 0 .8rem;
      color: #4b5563;
      line-height: 1.6;
      font-size: .95rem;
    }

    .clase-prueba h2 {
      margin: 1.4rem 0 .2rem;
      font-size: 1.15rem;
      color: #1f2937;
    }
    .cp-ayuda { margin-top: .3rem; font-size: .85rem; color: #6b7280; }
  `;
  document.head.append(estilo);
}

/**
 * Contenido de la clase (la llama clases.js al hacer clic en la tarjeta).
 * @param {object} perfil          perfil del usuario
 * @param {HTMLElement} contenedor main#app
 * @param {object} clase           datos de la clase (Firestore)
 */
export function render(perfil, contenedor, clase) {
  if (!perfil || !contenedor) return;
  inyectarEstilos();
  renderUserbar(perfil, "Prueba de opción múltiple");

  contenedor.innerHTML = `
    <div class="clase-prueba">
      <button class="cp-volver" id="cp-volver">
        <sl-icon name="arrow-left"></sl-icon> Clases
      </button>

      <div class="cp-cab">
        <span class="cp-chip">Día 1</span>
        <span class="cp-chip">Unidad 1</span>
        <span class="cp-chip">Lección 1</span>
      </div>

      <h1>Números racionales</h1>

      <p>
        Un <strong>número racional</strong> es todo número que puede escribirse como una
        fracción a/b, donde a y b son enteros y b no es cero. Por ejemplo, 3/4, -5, 0.5 y 2
        son racionales, porque todos pueden expresarse como fracción: 3/4, -5/1, 1/2 y 2/1.
        Su expansión decimal siempre termina (0.75) o se repite de forma periódica (0.333...).
      </p>
      <p>
        En cambio, números como π o √2 no pueden escribirse como fracción de enteros: sus
        decimales continúan para siempre sin seguir ningún patrón. A esos se les llama
        <strong>números irracionales</strong>. Saber distinguirlos es importante en Matemática
        y Datos, porque se operan y se representan de forma distinta.
      </p>

      <h2>Ponte a prueba</h2>
      <p class="cp-ayuda">
        Cada pregunta suma a tu nota de esta clase: +1 punto si aciertas al primer intento,
        +0.5 si aciertas al segundo. Si fallas dos veces, puedes volver a intentarlo otro día.
      </p>

      <div id="cp-preguntas"></div>
    </div>`;

  contenedor.querySelector("#cp-volver").addEventListener("click", () => {
    renderClases(perfil, contenedor);
  });

  const zona = contenedor.querySelector("#cp-preguntas");

  [
    {
      pregunta: "¿Cuál de los siguientes números es un número racional?",
      opciones: ["√2", "0.75", "π", "√3"],
      correcta: 2, // B → 0.75 (se escribe como 3/4)
    },
    {
      pregunta: "¿Cuál es el resultado de sumar 3/4 + 1/4?",
      opciones: ["4/8", "1/2", "1", "3/8"],
      correcta: 3, // C → 1 (o sea 4/4)
    },
    {
      pregunta: "Todo número entero también es un número racional.",
      opciones: ["Verdadero", "Falso"],
      correcta: 1, // A → Verdadero (todo entero n se escribe n/1)
    },
  ].forEach((p) => {
    const espacio = document.createElement("div");
    zona.append(espacio);
    opcionMultiple({ contenedor: espacio, perfil, clase, ...p });
  });
}