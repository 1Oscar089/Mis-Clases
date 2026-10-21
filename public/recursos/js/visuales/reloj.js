// ============================================================
// reloj.js — Recurso visual: RELOJ DE PARED analógico
// (recursos/js/visuales/reloj.js) · v1
//
// Dibuja un reloj de pared CUADRADO que marca una hora fija:
// borde negro, fondo blanco, manecillas (hora y minutos) y
// números 1–12 en negro. SVG puro, SIN librerías y SIN imports:
// un recurso que cualquier clase puede llamar directamente.
//
// ─── PARÁMETROS (objeto de opciones; todos opcionales) ───
//   hora        Hora a marcar. Se acepta cualquier número: el reloj
//               es de 12 horas, así que 15 se dibuja como 3 y 0, 12
//               o 24 como 12. (Defecto: 12)
//   minutos     Minutos a marcar, 0–59 (con decimales la manecilla
//               queda entre minutos). (Defecto: 0)
//   tamano      Lado del cuadrado en px. (Defecto: 220). En pantallas
//               angostas se encoge solo (max-width: 100%) sin romper
//               el acomodo del celular.
//   contenedor  HTMLElement opcional: si se pasa, el reloj se agrega
//               ahí; si no, solo se devuelve para insertarlo a mano.
//
// ─── DEVUELVE ───
//   El elemento <svg class="vis-reloj" data-hora data-minutos> listo
//   para usar. Las manecillas llevan data-manecilla="hora|minuto"
//   (útil para actividades y pruebas), y el aria-label describe la
//   hora marcada en texto ("Reloj marcando las 10:30").
//
// USO DESDE UNA CLASE (contenido):
//   import { dibujarReloj } from "../../../recursos/js/visuales/reloj.js";
//
//   dibujarReloj({ hora: 10, minutos: 30, tamano: 220, contenedor: zona });
//   // o bien:
//   zona.appendChild(dibujarReloj({ hora: 8, minutos: 15 }));
// ============================================================

/* ---------------- CSS implícito ---------------- */

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "visuales-reloj-estilos";
  estilo.textContent = `
    /* El reloj encoge en pantallas angostas sin perder su forma cuadrada */
    .vis-reloj {
      display: block;
      max-width: 100%;
      height: auto;
      aspect-ratio: 1 / 1;
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Dibujo ---------------- */

const CENTRO = 100; // todo el dibujo vive en un viewBox de 200 × 200

function numeroSeguro(valor, defecto) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : defecto;
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}

/** Punto sobre el círculo del reloj: 0° = las 12, giro horario. */
function punto(anguloGrados, radio) {
  const rad = (anguloGrados * Math.PI) / 180;
  return {
    x: CENTRO + radio * Math.sin(rad),
    y: CENTRO - radio * Math.cos(rad),
  };
}

/**
 * Dibuja el reloj y lo devuelve como elemento <svg>.
 * (Ver la cabecera del archivo para los parámetros.)
 */
export function dibujarReloj(opciones = {}) {
  inyectarEstilos();
  const opc = opciones || {};
  const hCrudo = numeroSeguro(opc.hora, 12);
  const mCrudo = numeroSeguro(opc.minutos, 0);
  const lado = Math.max(40, numeroSeguro(opc.tamano, 220));

  // Reloj de 12 horas: 15h se dibuja como 3 · 75 min como 15 · −10h como 2.
  const h = ((hCrudo % 12) + 12) % 12;
  const m = ((mCrudo % 60) + 60) % 60;

  // La manecilla de hora avanza 30° por hora y 0.5° por minuto;
  // la de minutos, 6° por minuto.
  const angHora = h * 30 + m * 0.5;
  const angMin = m * 6;

  const puntaHora = punto(angHora, 45);
  const puntaMin = punto(angMin, 68);

  /* Rayitas de las horas junto al borde */
  let marcas = "";
  for (let i = 0; i < 12; i++) {
    const a = punto(i * 30, 92);
    const b = punto(i * 30, 84);
    marcas +=
      '<line x1="' + redondear(a.x) + '" y1="' + redondear(a.y) +
      '" x2="' + redondear(b.x) + '" y2="' + redondear(b.y) +
      '" stroke="#000" stroke-width="3.2" stroke-linecap="round" />';
  }

  /* Números 1–12 en negro */
  let numeros = "";
  for (let i = 1; i <= 12; i++) {
    const p = punto(i * 30, 70);
    numeros +=
      '<text x="' + redondear(p.x) + '" y="' + redondear(p.y) + '" dy=".35em"' +
      ' text-anchor="middle" font-family="Arial, Helvetica, sans-serif"' +
      ' font-size="17" font-weight="700" fill="#000">' + i + "</text>";
  }

  const hh = h === 0 ? 12 : h;
  const mm = String(Math.floor(m)).padStart(2, "0");

  const svg =
    '<svg class="vis-reloj" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"' +
    ' width="' + lado + '" height="' + lado + '" role="img"' +
    ' data-hora="' + h + '" data-minutos="' + Math.floor(m) + '"' +
    ' aria-label="Reloj marcando las ' + hh + ":" + mm + '">' +
    '<circle cx="100" cy="100" r="96" fill="#ffffff" stroke="#000000" stroke-width="6" />' +
    marcas +
    numeros +
    '<line data-manecilla="hora" x1="100" y1="100"' +
    ' x2="' + redondear(puntaHora.x) + '" y2="' + redondear(puntaHora.y) + '"' +
    ' stroke="#000" stroke-width="6.5" stroke-linecap="round" />' +
    '<line data-manecilla="minuto" x1="100" y1="100"' +
    ' x2="' + redondear(puntaMin.x) + '" y2="' + redondear(puntaMin.y) + '"' +
    ' stroke="#000" stroke-width="4.2" stroke-linecap="round" />' +
    '<circle cx="100" cy="100" r="5.2" fill="#000000" />' +
    "</svg>";

  const piezas = document.createElement("div");
  piezas.innerHTML = svg;
  const reloj = piezas.firstElementChild;

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(reloj);
  }
  return reloj;
}