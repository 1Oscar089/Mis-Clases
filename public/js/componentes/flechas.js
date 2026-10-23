// ============================================================
// flechas.js — FLECHAS de navegación (anterior / siguiente)
// (js/componentes/flechas.js) · v1.1
//
// Dibuja la barra de flechas para AVANZAR o REGRESAR (la que usan
// las láminas de section.js y la presentación, pero sirve sola para
// cualquier cosa: carruseles, galerías, navegación propia…).
//
//   ← Anterior         2 / 5         Siguiente →
//
// · Cada flecha SOLO se dibuja si le pasas su acción (alAnterior /
//   alSiguiente). Con una sola, la barra queda alineada a donde
//   corresponde (la de atrás a la izquierda, la de adelante a la
//   derecha).
// · Una flecha DESHABILITADA (puedeAnterior / puedeSiguiente) se ve
//   tenue y no responde. Cambia el estado cuando quieras con los
//   métodos .setPuedeAnterior() / .setPuedeSiguiente().
// · NUEVO v1.1 — .mostrarAnterior(bool) / .mostrarSiguiente(bool)
//   OCULTAN o muestran una flecha (display:none). Sirve para que la
//   flecha "aparezca" cuando toque, como en las láminas del modo
//   lectura: al mostrarse entra con una animación suavecita.
// · En medio puedes poner un TEXTO libre ("Lámina 2 de 5") o un
//   CONTADOR ("2 / 5") con .setTexto() / .setContador().
// · El texto SIEMPRE va escapado y admite formato del proyecto:
//   **negrita**, *cursiva*, $fórmulas$…
//
// ─── PARÁMETROS (crearFlechas({ … })) ───
//   alAnterior        Función al pulsar ← (sin ella no hay ←)
//   alSiguiente       Función al pulsar → (sin ella no hay →)
//   puedeAnterior     ¿← habilitada?   (defecto true)
//   puedeSiguiente    ¿→ habilitada?   (defecto true)
//   etiquetaAnterior  Texto de ←  (defecto "Anterior"; "" = solo flecha)
//   etiquetaSiguiente Texto de →  (defecto "Siguiente"; "" = solo flecha)
//   texto             Texto central ("Lámina 2 de 5"). Sin texto ni
//                     contador no hay centro.
//   centrado          true → la barra centrada (defecto: repartida
//                     entre los extremos).
//   ancho             Ancho de la barra: número (px), fracción 0..1
//                     (%), CSS ("60%"). Sin ancho → bloque entero.
//   tamano            Tamaño del texto de etiquetas (número px / CSS).
//   contenedor        Si se pasa, la barra se agrega ahí.
//
// ─── DEVUELVE ─── la barra <nav class="comp-flechas"> con métodos:
//   .setPuedeAnterior(bool)      habilita/deshabilita ←
//   .setPuedeSiguiente(bool)     habilita/deshabilita →
//   .mostrarAnterior(bool)       v1.1: muestra/oculta ← (oculta =
//                                no ocupa lugar; al mostrarse anima)
//   .mostrarSiguiente(bool)      v1.1: muestra/oculta → (igual)
//   .setTexto(texto)             cambia el texto central ("" lo quita)
//   .setContador(actual, total)  atajo: texto central "actual / total"
//   .deshabilitar(bool)          deshabilita TODO (p. ej. durante una
//                                transición o una actividad)
//
// ⚠️ ATENCIÓN con el ejemplo de abajo: «actual» y «irA» NO vienen de
// fábrica — son variables TUYAS (tu estado de navegación y tu función
// para cambiar de lámina/página). Si tu código no las define, el
// navegador dice «actual is not defined» / «irA is not defined».
// En las SECCIONES ni siquiera necesitas este archivo: section.js
// dibuja sus flechas SOLAS (con 2 o más láminas) y el documento que
// devuelve ya trae .siguiente() / .anterior() / .ir(i) / .actual.
//
// USO (autocontenido, funciona tal cual):
//   import { crearFlechas } from "../../../js/componentes/flechas.js";
//
//   let actual = 0;                       // ← TU estado (defínelo tú)
//   const TOTAL = 5;
//   const irA = (i) => {                  // ← TU función (defínela tú)
//     actual = Math.max(0, Math.min(TOTAL - 1, i));
//     nav.setContador(actual + 1, TOTAL);
//     nav.setPuedeAnterior(actual > 0);
//     nav.setPuedeSiguiente(actual < TOTAL - 1);
//   };
//   const nav = crearFlechas({
//     contenedor: zona,
//     alAnterior: () => irA(actual - 1),
//     alSiguiente: () => irA(actual + 1),
//   });
//   irA(0);
//   // nav.mostrarSiguiente(false);   // la esconde hasta que toque
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

function estilos() {
  inyectarEstilos(
    "comp-flechas-estilos",
    `
    .comp-flechas {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      margin: 1.1rem 0;
      font-family: system-ui, sans-serif;
      max-width: 100%;
    }
    .comp-flechas.comp-flechas-centrado { justify-content: center; }
    /* Con una sola flecha: atrás → izquierda · adelante → derecha */
    .comp-flechas.comp-flechas-solo-atras { justify-content: flex-start; }
    .comp-flechas.comp-flechas-solo-adelante { justify-content: flex-end; }

    .comp-flecha-btn {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      font-family: inherit;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      color: #4b5563;
      border-radius: 999px;
      padding: .5rem 1rem;
      font-size: .9rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: border-color .15s ease, color .15s ease, box-shadow .15s ease, transform .1s ease;
    }
    /* Oculta de verdad (pisa el display:inline-flex, como el hidden
       de los pasos): sin esta regla hidden no esconde el botón */
    .comp-flecha-btn[hidden] { display: none; }
    .comp-flecha-btn:hover:not(:disabled) {
      border-color: #7c3aed;
      color: #7c3aed;
      box-shadow: 0 4px 14px rgba(124, 58, 237, .14);
    }
    .comp-flecha-btn:active:not(:disabled) { transform: scale(.97); }
    .comp-flecha-btn:disabled {
      opacity: .4;
      cursor: not-allowed;
      box-shadow: none;
    }
    .comp-flecha-flecha {
      font-size: 1.15em;
      font-weight: 800;
      line-height: 1;
      color: #7c3aed;
    }
    .comp-flecha-btn:disabled .comp-flecha-flecha { color: inherit; }

    /* Aparición animada (v1.1): la flecha "entra" cuando se muestra */
    @keyframes comp-flecha-entrar-atras {
      from { opacity: 0; transform: translateX(-12px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes comp-flecha-entrar-adelante {
      from { opacity: 0; transform: translateX(12px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .comp-flecha-btn.comp-flecha-animada[data-dir="atras"] {
      animation: comp-flecha-entrar-atras .28s ease both;
    }
    .comp-flecha-btn.comp-flecha-animada[data-dir="adelante"] {
      animation: comp-flecha-entrar-adelante .28s ease both;
    }

    .comp-flechas-texto {
      flex: 1;
      min-width: 0;
      text-align: center;
      color: #6b7280;
      font-size: .85rem;
      font-weight: 700;
      overflow-wrap: break-word;
    }

    @media (max-width: 575px) {
      .comp-flecha-btn { padding: .5rem .8rem; }
      .comp-flechas { gap: .5rem; }
    }
  `
  );
}

/** Crea UN botón de flecha (o null si no hay acción que darle). */
function botonFlecha(dir, etiqueta, accion) {
  if (typeof accion !== "function") return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "comp-flecha-btn";
  btn.dataset.dir = dir; // "atras" | "adelante"

  const flecha = document.createElement("span");
  flecha.className = "comp-flecha-flecha";
  flecha.setAttribute("aria-hidden", "true");
  flecha.textContent = dir === "atras" ? "←" : "→";

  btn.append(flecha);
  if (etiqueta) {
    const texto = document.createElement("span");
    texto.className = "comp-flecha-etiqueta";
    aplicarFormato(texto, String(etiqueta));
    btn.append(texto);
  }
  return btn;
}

export function crearFlechas(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const nav = document.createElement("nav");
  nav.className = "comp-flechas";
  nav.setAttribute("aria-label", "Navegación");

  const btnAtras = botonFlecha("atras", opc.etiquetaAnterior ?? "Anterior", opc.alAnterior);
  const btnAdelante = botonFlecha("adelante", opc.etiquetaSiguiente ?? "Siguiente", opc.alSiguiente);

  const texto = document.createElement("span");
  texto.className = "comp-flechas-texto";
  texto.setAttribute("aria-live", "polite");

  // Orden del DOM: ← · texto central · →  (el texto arranca oculto y
  // solo ocupa lugar cuando hay algo que mostrar).
  if (btnAtras) nav.append(btnAtras);
  nav.append(texto);
  if (btnAdelante) nav.append(btnAdelante);

  let textoActual = "";
  const pintarTexto = () => {
    if (!textoActual) { texto.replaceChildren(); texto.hidden = true; return; }
    texto.hidden = false;
    aplicarFormato(texto, String(textoActual));
  };

  if (btnAtras && !btnAdelante) nav.classList.add("comp-flechas-solo-atras");
  if (!btnAtras && btnAdelante) nav.classList.add("comp-flechas-solo-adelante");
  if (opc.centrado) nav.classList.add("comp-flechas-centrado");

  // --- Estado inicial ---
  nav.setPuedeAnterior = (puede) => {
    if (btnAtras) btnAtras.disabled = !puede;
  };
  nav.setPuedeSiguiente = (puede) => {
    if (btnAdelante) btnAdelante.disabled = !puede;
  };
  // v1.1 — visibilidad aparte del estado habilitado: una flecha se
  // puede estar OCULTA (aún no toca) aunque esté "habilitada".
  nav.mostrarAnterior = (mostrar) => {
    if (btnAtras) btnAtras.hidden = !mostrar;
  };
  nav.mostrarSiguiente = (mostrar) => {
    if (!btnAdelante) return;
    btnAdelante.hidden = !mostrar;
    if (mostrar) {
      // animación de entrada (reinicia si ya estaba)
      btnAdelante.classList.remove("comp-flecha-animada");
      void btnAdelante.offsetWidth;
      btnAdelante.classList.add("comp-flecha-animada");
    }
  };
  nav.setTexto = (t) => { textoActual = t == null ? "" : String(t); pintarTexto(); };
  nav.setContador = (actual, total) => {
    nav.setTexto(`${actual} / ${total}`);
  };
  nav.deshabilitar = (todo) => {
    if (btnAtras) btnAtras.disabled = !!todo || !nav.__puedeAnterior;
    if (btnAdelante) btnAdelante.disabled = !!todo || !nav.__puedeSiguiente;
  };

  // Guardar el último estado "lógico" para que .deshabilitar(false)
  // restaure lo que correspondía (y no habilite de más).
  nav.__puedeAnterior = opc.puedeAnterior !== false;
  nav.__puedeSiguiente = opc.puedeSiguiente !== false;
  if (btnAtras) btnAtras.addEventListener("click", () => opc.alAnterior());
  if (btnAdelante) btnAdelante.addEventListener("click", () => opc.alSiguiente());
  nav.setPuedeAnterior(nav.__puedeAnterior);
  nav.setPuedeSiguiente(nav.__puedeSiguiente);

  // Si alguien usa setPuedeAnterior/Siguiente directo, mantener espejo:
  const originalA = nav.setPuedeAnterior;
  const originalS = nav.setPuedeSiguiente;
  nav.setPuedeAnterior = (p) => { nav.__puedeAnterior = !!p; originalA(p); };
  nav.setPuedeSiguiente = (p) => { nav.__puedeSiguiente = !!p; originalS(p); };

  // Texto inicial: contador explícito o texto libre
  if (opc.contador && opc.contador.total != null) {
    nav.setContador(opc.contador.actual ?? 1, opc.contador.total);
  } else if (opc.texto) {
    nav.setTexto(opc.texto);
  } else {
    pintarTexto();
  }

  aplicarAncho(nav, opc.ancho);
  aplicarTamano(nav, opc.tamano);

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(nav);
  }
  return nav;
}