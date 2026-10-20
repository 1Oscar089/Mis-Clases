// ============================================================
// Clase de PRUEBA — 8° grado · Matemática y Datos
// Día 1 · Unidad 1 · Lección 1 → "Prueba de fórmulas"
// public/clases/8/matematica-y-datos/d1-u1-l1-prueba-de-opcion-multiple.js
//
// DEMO DE FÓRMULAS: verifica los cambios de formatearFormulas.js y de
// las 5 utils de actividad recreadas. Mismo id de clase en Firestore
// (no hay que tocar datos). Tema NUEVO "Potencias y raíces" para que
// las fórmulas (fracciones, raíces, exponentes) se vean de verdad.
//
// Demuestra UNA DE CADA utilidad, ya con fórmulas $…$ en sus textos:
//   · js/utils/tts.js                 → reproductor de audio (lee la intro)
//   · js/utils/opcionMultiple.js v4   → 1 correcta (1 pt) · opciones con $…$ //   · js/utils/multipleOpcion.js v5   → VARIAS correctas (2 pts) · raíces
//   · js/utils/respuestaSimple.js v4  → texto (1 pt) + FÓRMULA (2 pts):
//                                       esFormula: true → SOLO teclado
//                                       virtual MathLive (math-field)
//   · js/utils/relacionar.js v3       → parejas por posición (2 pts), ambas
//                                       columnas con $fórmulas$ //   · js/utils/ordenar.js v2          → arrastrar a campos (2 pts), objetos y
//                                       distractores con $fórmulas$ //   · js/utils/formatearFormulas.js   → motor: la INTRO de esta clase también
//                                       se pinta con textoConFormulas()
//
// Nota máxima de la clase: 10 puntos.
// Regla de puntaje (todas las utils): 1.er intento → completo,
// 2.º intento → la mitad, fallada 2 veces → 0 (reintentable en otra
// sesión si quedó en 0). El docente prueba sin guardar nada y ve su
// puntaje en el head morado debajo de la userbar.
// ============================================================

import { renderUserbar } from "../../../js/components/userbar.js";
import { render as renderClases } from "../../../js/components/clases.js";
import { opcionMultiple } from "../../../js/utils/opcionMultiple.js";
import { multipleOpcion } from "../../../js/utils/multipleOpcion.js";
import { respuestaSimple } from "../../../js/utils/respuestaSimple.js";
import { relacionar } from "../../../js/utils/relacionar.js";
import { ordenar } from "../../../js/utils/ordenar.js";
import { renderTTS, detenerTTSActivo } from "../../../js/utils/tts.js";
import {
  cargarFormulas,
  textoConFormulas,
} from "../../../js/utils/formatearFormulas.js";

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
    .cp-chip-formulas {
      background: rgba(5, 150, 105, .1);
      color: #047857;
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

    .cp-seccion { margin: 1.5rem 0; }
    .cp-sec-cab {
      display: flex;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      margin: 0 0 .55rem;
    }
    .cp-sec-cab h3 {
      margin: 0;
      font-size: 1.02rem;
      color: #1f2937;
    }
    .cp-util {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .68rem;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      color: #6b7280;
      padding: .16rem .5rem;
      border-radius: 999px;
    }
    .cp-puntos {
      margin-left: auto;
      font-size: .72rem;
      font-weight: 800;
      color: #047857;
      background: rgba(5, 150, 105, .1);
      border: 1px solid rgba(5, 150, 105, .18);
      padding: .14rem .55rem;
      border-radius: 999px;
      white-space: nowrap;
    }
  `;
  document.head.append(estilo);
}

// ─── Intro de la clase (fuente con $fórmulas$ → textoConFormulas) ───
// OJO: textoConFormulas() ESCAPA todo lo que no está entre $…$ (por
// seguridad), así que la intro NO lleva etiquetas HTML: solo texto y
// fórmulas. Los términos clave van entre «comillas».
const INTRO_1 =
  "Una potencia como $2^3$ multiplica la base por sí misma tantas veces " +
  "como indica el exponente: $2^3 = 2 \\cdot 2 \\cdot 2 = 8$. Se lee «dos elevado al cubo». " +
  "Con exponente 1 la potencia vale lo mismo que la base ($3^1 = 3$) y con exponente " +
  "negativo se invierte: $2^{-1} = \\frac{1}{2}$, porque tomar la mitad es dividir entre 2 una vez.";

const INTRO_2 =
  "La raíz es la operación inversa de la potencia: $\\sqrt{16} = 4$ porque $4^2 = 16$. " +
  "El numerito fuera de la raíz es su índice: $\\sqrt[3]{8} = 2$ se lee «raíz cúbica de ocho» " +
  "y vale 2 porque $2^3 = 8$. Ojo: hay resultados que NO son exactos, como $\\sqrt{2}$ o $\\pi$: son los " +
  "irracionales de la lección anterior y sus decimales siguen para siempre sin patrón.";

const INTRO_DISPLAY =
  "$$\\sqrt[3]{8} = 2 \\quad \\text{porque} \\quad 2^3 = 8$$";

// Texto que lee el reproductor TTS (redactado para voz: sin símbolos).
const TEXTO_TTS =
  "Hoy repasamos las potencias y las raíces. " +
  "Una potencia multiplica la base por sí misma tantas veces como dice el exponente: " +
  "dos elevado al cubo es dos por dos por dos, y da ocho. " +
  "La raíz cuadrada es la operación inversa: raíz de dieciséis es cuatro, " +
  "porque cuatro al cuadrado es dieciséis. " +
  "También hay raíces con índice, como la raíz cúbica de ocho, que es dos. " +
  "Y recuerda: números como pi, o raíz de dos, son irracionales; " +
  "sus decimales siguen para siempre sin repetirse.";

/**
 * Contenido de la clase (la llama clases.js al hacer clic en la tarjeta).
 * @param {object} perfil          perfil del usuario
 * @param {HTMLElement} contenedor main#app
 * @param {object} clase           datos de la clase (Firestore)
 */
export function render(perfil, contenedor, clase) {
  if (!perfil || !contenedor) return;
  inyectarEstilos();
  detenerTTSActivo(); // si se reentra a la clase, corta el audio anterior
  renderUserbar(perfil, "Prueba de fórmulas");

  contenedor.innerHTML = `
    <div class="clase-prueba">
      <button class="cp-volver" id="cp-volver">
        <sl-icon name="arrow-left"></sl-icon> Clases
      </button>

      <div class="cp-cab">
        <span class="cp-chip">Día 1</span>
        <span class="cp-chip">Unidad 1</span>
        <span class="cp-chip">Lección 1</span>
        <span class="cp-chip cp-chip-formulas">Fórmulas · KaTeX + MathLive</span>
      </div>

      <h1>Potencias y raíces</h1>

      <p id="cp-intro-1"></p>
      <p id="cp-intro-2"></p>
      <div id="cp-intro-display"></div>

      <div class="cp-seccion">
        <div class="cp-sec-cab">
          <h3>Escucha la introducción</h3>
          <span class="cp-util">js/utils/tts.js</span>
        </div>
        <div id="cp-tts"></div>
      </div>

      <h2>Ponte a prueba</h2>
      <p class="cp-ayuda">
        Cada ejercicio suma a tu nota de esta clase (en total vale 10 puntos): lo logrado al
        primer intento vale completo y al segundo la mitad. Si fallas dos veces, puedes
        volver a intentarlo otro día.
      </p>

      <div class="cp-seccion">
        <div class="cp-sec-cab">
          <h3>1 · Pregunta con una correcta</h3>
          <span class="cp-util">js/utils/opcionMultiple.js</span>
          <span class="cp-puntos">vale 1 pt</span>
        </div>
        <div id="cp-om"></div>
      </div>

      <div class="cp-seccion">
        <div class="cp-sec-cab">
          <h3>2 · Marca todas las correctas</h3>
          <span class="cp-util">js/utils/multipleOpcion.js</span>
          <span class="cp-puntos">vale 2 pts</span>
        </div>
        <div id="cp-mo"></div>
      </div>

      <div class="cp-seccion">
        <div class="cp-sec-cab">
          <h3>3 · Escribe la respuesta</h3>
          <span class="cp-util">js/utils/respuestaSimple.js</span>
          <span class="cp-puntos">vale 1 pt</span>
        </div>
        <div id="cp-rs"></div>
      </div>

      <div class="cp-seccion">
        <div class="cp-sec-cab">
          <h3>4 · Arma la fórmula con el teclado MathLive</h3>
          <span class="cp-util">respuestaSimple.js v4 · MathLive</span>
          <span class="cp-puntos">vale 2 pts</span>
        </div>
        <div id="cp-rsf"></div>
      </div>

      <div class="cp-seccion">
        <div class="cp-sec-cab">
          <h3>5 · Relaciona las columnas</h3>
          <span class="cp-util">js/utils/relacionar.js</span>
          <span class="cp-puntos">vale 2 pts</span>
        </div>
        <div id="cp-rel"></div>
      </div>

      <div class="cp-seccion">
        <div class="cp-sec-cab">
          <h3>6 · Ordena arrastrando</h3>
          <span class="cp-util">js/utils/ordenar.js</span>
          <span class="cp-puntos">vale 2 pts</span>
        </div>
        <div id="cp-ord"></div>
      </div>
    </div>`;

  contenedor.querySelector("#cp-volver").addEventListener("click", () => {
    detenerTTSActivo();
    renderClases(perfil, contenedor);
  });

  const zona = (id) => contenedor.querySelector("#" + id);

  /* ─── Intro con fórmulas (textoConFormulas; si el CDN falla, texto plano) ─── */
  const pintaIntro = () => {
    const p1 = contenedor.querySelector("#cp-intro-1");
    const p2 = contenedor.querySelector("#cp-intro-2");
    const p3 = contenedor.querySelector("#cp-intro-display");
    if (p1) p1.innerHTML = textoConFormulas(INTRO_1);
    if (p2) p2.innerHTML = textoConFormulas(INTRO_2);
    if (p3) p3.innerHTML = textoConFormulas(INTRO_DISPLAY);
  };
  cargarFormulas().catch(() => null).then(pintaIntro);

  /* ─── TTS: reproductor de audio de la introducción ─── */
  renderTTS(zona("cp-tts"), "es", TEXTO_TTS, {
    titulo: "Texto a voz · Web Speech API",
  });

  /* ─── 1 · opcionMultiple: una sola correcta (todas las opciones son fórmulas) ─── */
  opcionMultiple({
    contenedor: zona("cp-om"),
    perfil,
    clase,
    tipo: "clase",
    indicacion: "¿Cuánto vale $2^3$?",
    respuestas: ["$2 \\cdot 3$", "$2 + 3$", "$3^2$", "$8$"],
    respuestaCorrecta: 4, // D → $8$ (los otros son errores típicos)
    puntaje: 1,
    id: "p1-potencia",
  });

  /* ─── 2 · multipleOpcion: varias correctas (raíces y potencias) ─── */
  multipleOpcion({
    contenedor: zona("cp-mo"),
    perfil,
    clase,
    tipo: "clase",
    indicacion: "Marca TODAS las igualdades CORRECTAS (hay más de una).",
    opciones: [
      "$\\sqrt{16} = 4$",
      "$\\sqrt{9} = 3$",
      "$\\sqrt[3]{8} = 2$",
      "$\\sqrt{2} = 1$",
      "$5^2 = 10$",
      "$2^3 = 6$",
    ],
    correctas: [1, 2, 3], // √16=4, √9=3 y ∛8=2
    puntaje: 2,
    id: "p2-raices",
  });

  /* ─── 3 · respuestaSimple: TEXTO (teclado físico, como siempre) ─── */
  respuestaSimple({
    contenedor: zona("cp-rs"),
    perfil,
    clase,
    tipo: "clase",
    indicacion:
      "El número pequeño que aparece arriba a la derecha de la base (el 3 en $2^3$) se llama…",
    respuestaCorrecta: "exponente",
    puntaje: 1,
    id: "p3-vocabulario",
  });

  /* ─── 4 · respuestaSimple: FÓRMULA (esFormula: true → SOLO teclado virtual MathLive) ─── */
  respuestaSimple({
    contenedor: zona("cp-rsf"),
    perfil,
    clase,
    tipo: "clase",
    esFormula: true,
    indicacion:
      "Resuelve la ecuación $x^2 = 49$ y arma la solución POSITIVA con el teclado virtual MathLive.",
    respuestaCorrecta: ["x = 7", "7"], // acepta con o sin la x
    puntaje: 2,
    id: "p4-formula",
  });

  /* ─── 5 · relacionar: parejas por posición (fórmulas en las DOS columnas) ─── */
  relacionar({
    contenedor: zona("cp-rel"),
    perfil,
    clase,
    tipo: "clase",
    indicacion: "Relaciona cada expresión con su valor.",
    izquierda: ["$2^3$", "$\\sqrt{49}$", "$\\frac{1}{2}$", "$\\sqrt[3]{27}$"],
    derecha: ["$8$", "$7$", "$0.5$", "$3$"], // 1.a con 1.a, 2.a con 2.a…
    puntaje: 2,
    id: "r1-valores",
  });

  /* ─── 6 · ordenar: arrastrar al orden correcto (objetos con fórmulas) ─── */
  ordenar({
    contenedor: zona("cp-ord"),
    perfil,
    clase,
    tipo: "clase",
    indicacion:
      "Arrastra a los campos los valores RACIONALES del MENOR al MAYOR. Los irracionales sobran: no van en ningún campo.",
    lista: ["$2^{-1}$", "$0.7$", "$\\sqrt{4}$", "$3^1$", "$2^3$"], // 0.5 < 0.7 < 2 < 3 < 8
    distractores: ["$\\sqrt{2}$", "$\\pi$"], // irracionales → quedan en la piscina
    puntaje: 2,
    id: "o1-orden",
  });
}