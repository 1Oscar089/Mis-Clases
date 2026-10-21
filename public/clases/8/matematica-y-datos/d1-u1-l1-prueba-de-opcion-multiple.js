// ============================================================
// Clase de PRUEBA — 8° grado · Matemática y Datos
// Día 1 · Unidad 1 · Lección 1 → "Prueba de reloj y calendario"
// public/clases/8/matematica-y-datos/d1-u1-l1-prueba-de-opcion-multiple.js
//
// DEMO DE RECURSOS VISUALES (misma clase de siempre, reescrita a
// petición del docente: SOLO dos relojes y dos calendarios de
// prueba). Mismo id de clase en Firestore: no hay que tocar datos.
//
// Lo que demuestra (0 puntaje, 0 escrituras: nada toca la base):
//   · recursos/js/visuales/reloj.js      → reloj de pared cuadrado
//     (borde negro, fondo blanco, manecillas y números negros):
//       — Reloj A: 10:30 con tamaño 220
//       — Reloj B: 21:45 con tamaño 170 (reloj de 12 horas → 9:45)
//   · recursos/js/visuales/calendario.js → calendario del mes REAL
//     (encabezado azul claro, letras negras, cuadrícula; la altura
//     sale del ancho; MULTIIDIOMA: el idioma sale del nombre del mes):
//       — Calendario A: "Septiembre" 2026 en español, con la
//         festividad del 15 en rojo + lista "Festividades"
//       — Calendario B: "July" 2027 in ENGLISH (MON…SUN, lista
//         "Holidays"): escribir el mes en inglés basta
//
// Los nombres de las festividades los escribe la clase, así que NO
// se traducen solos (son contenido).
// ============================================================

import { renderUserbar } from "../../../js/components/userbar.js";
import { render as renderClases } from "../../../js/components/clases.js";
import { dibujarReloj } from "../../../recursos/js/visuales/reloj.js";
import { dibujarCalendario } from "../../../recursos/js/visuales/calendario.js";

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
    .cp-chip-vis {
      background: rgba(124, 58, 237, .1);
      color: #6d28d9;
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

    /* Galería de recursos visuales: piezas una al lado de la otra y
       encogiendo solas en pantallas angostas (los recursos ya traen
       su propio max-width: 100%) */
    .cp-galeria {
      display: flex;
      flex-wrap: wrap;
      gap: 1.2rem;
      align-items: flex-start;
    }
    .cp-vis {
      display: flex;
      flex-direction: column;
      gap: .45rem;
      max-width: 100%;
    }
    .cp-pie {
      font-size: .82rem;
      color: #6b7280;
      line-height: 1.45;
      max-width: 340px;
    }
  `;
  document.head.append(estilo);
}

/**
 * Contenido de la clase (la llama clases.js al hacer clic en la tarjeta).
 * SOLO RECURSOS VISUALES: 2 relojes + 2 calendarios. No hay puntajes,
 * no hay utils de actividad y NO se escribe nada en la base de datos
 * (el docente y el estudiante ven exactamente lo mismo).
 *
 * @param {object} perfil          perfil del usuario
 * @param {HTMLElement} contenedor main#app
 * @param {object} clase           datos de la clase (Firestore)
 */
export function render(perfil, contenedor, clase) {
  if (!perfil || !contenedor) return;
  inyectarEstilos();
  renderUserbar(perfil, "Prueba de reloj y calendario");

  contenedor.innerHTML = `
    <div class="clase-prueba">
      <button class="cp-volver" id="cp-volver">
        <sl-icon name="arrow-left"></sl-icon> Clases
      </button>

      <div class="cp-cab">
        <span class="cp-chip">Día 1</span>
        <span class="cp-chip">Unidad 1</span>
        <span class="cp-chip">Lección 1</span>
        <span class="cp-chip cp-chip-vis">Recursos visuales · sin puntaje</span>
      </div>

      <h1>El reloj y el calendario</h1>

      <p>
        Estos dibujos son <b>recursos visuales</b>: piezas que cualquier clase puede
        insertar donde quiera para mostrar información de forma clara. No suman puntos
        y no guardan nada: solo dibujan lo que se les pide.
      </p>
      <p>
        El reloj de pared marca una hora fija y el calendario dibuja el mes REAL que se
        le pide: descubre solo en qué día de la semana empieza, cuántos días tiene
        (años bisiestos incluidos) y puede marcar festividades. Además es multiidioma:
        el idioma sale del nombre del mes que se le pasa.
      </p>

      <div class="cp-seccion">
        <div class="cp-sec-cab">
          <h3>1 · El reloj de pared</h3>
          <span class="cp-util">recursos/js/visuales/reloj.js</span>
        </div>
        <div id="cp-relojes" class="cp-galeria"></div>
      </div>

      <div class="cp-seccion">
        <div class="cp-sec-cab">
          <h3>2 · El calendario del mes</h3>
          <span class="cp-util">recursos/js/visuales/calendario.js</span>
        </div>
        <div id="cp-calendarios" class="cp-galeria"></div>
      </div>

      <p class="cp-ayuda">
        Observa: el calendario usa fechas REALES (el 1 de septiembre de 2026 cae
        <b>martes</b> y el 1 de julio de 2027, <b>jueves</b>), la altura sale sola del
        ancho y en un celular todo encoge sin recortarse. Los nombres de las
        festividades los escribe la clase, así que no se traducen solos.
      </p>
    </div>`;

  contenedor.querySelector("#cp-volver").addEventListener("click", () => {
    renderClases(perfil, contenedor);
  });

  const zona = (id) => contenedor.querySelector("#" + id);

  /* ─── 1 · RELOJES: dibujarReloj({ hora, minutos, tamano, contenedor }) ─── */

  // Reloj A — las 10:30 (tamaño 220): cuadrado, borde negro, fondo
  // blanco, manecillas y números negros. 30 min → manecilla de hora a
  // medio camino entre las 10 y las 11.
  dibujarReloj({
    hora: 10,
    minutos: 30,
    tamano: 220,
    contenedor: zona("cp-relojes"),
  });
  // Reloj B — las 21:45 con tamaño más chico (170): el reloj es de 12
  // horas, así que 21:45 se dibuja como 9:45 (manecilla de hora a ¾
  // entre las 9 y las 10).
  dibujarReloj({
    hora: 21,
    minutos: 45,
    tamano: 170,
    contenedor: zona("cp-relojes"),
  });
  // Pies de foto bajo cada reloj (se agregan al final de la zona).
  const piesReloj = [
    "Marca las 10:30 (diez y media), con tamaño grande (220 px).",
    "Marca las 21:45 — como el reloj es de 12 horas, se dibuja como las 9:45 (tamaño 170 px).",
  ];
  [...zona("cp-relojes").querySelectorAll(".vis-reloj")].forEach((svg, i) => {
    const item = document.createElement("div");
    item.className = "cp-vis";
    svg.replaceWith(item);
    item.append(svg);
    const pie = document.createElement("div");
    pie.className = "cp-pie";
    pie.textContent = piesReloj[i] || "";
    item.append(pie);
  });

  /* ─── 2 · CALENDARIOS: dibujarCalendario({ mes, anio, ancho, … }) ─── */

  // Calendario A — en español: el nombre del mes define el idioma.
  // Encabezado azul claro, semana LUN…DOM y la festividad del 15 en
  // rojo + lista "Festividades" debajo.
  dibujarCalendario({
    mes: "Septiembre",
    anio: 2026,
    ancho: 350,
    mostrarFestividades: true,
    festividades: [{ dia: 15, nombre: "Día de la Independencia" }],
    contenedor: zona("cp-calendarios"),
  });
  // Calendario B — IN ENGLISH: al escribir el mes como «July» TODO el
  // calendario sale en inglés (semana MON…SUN, lista «Holidays»).
  dibujarCalendario({
    mes: "July",
    anio: 2027,
    ancho: 320,
    mostrarFestividades: true,
    festividades: [
      { dia: 4, nombre: "Independence Day" },
      { dia: 25, nombre: "Christmas Day" },
    ],
    contenedor: zona("cp-calendarios"),
  });
  // Pies de foto bajo cada calendario.
  const piesCal = [
    "En español: septiembre de 2026 con su festividad del día 15 marcada en rojo (encabezado azul claro y semana LUN…DOM).",
    "In English: al escribir el mes como «July», todo el calendario sale en inglés — semana MON…SUN y lista «Holidays».",
  ];
  [...zona("cp-calendarios").querySelectorAll(".vis-cal")].forEach((cal, i) => {
    const item = document.createElement("div");
    item.className = "cp-vis";
    cal.replaceWith(item);
    item.append(cal);
    const pie = document.createElement("div");
    pie.className = "cp-pie";
    pie.textContent = piesCal[i] || "";
    item.append(pie);
  });
}