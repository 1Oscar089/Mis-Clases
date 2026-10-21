// ============================================================
// enlace.js — ENLACES (js/componentes/enlace.js) · v1
//
// Un enlace (link) a cualquier página o archivo: otra clase, un
// documento de Drive, un video, un PDF para descargar…
//
//   · Si la dirección empieza con http (enlace externo) se abre en
//     pestaña nueva por defecto (con seguridad rel="noopener").
//   · `descarga: true` lo convierte en botón de descarga (si el
//     servidor lo permite) y acepta `nombreArchivo` sugerido.
//   · `tipo: "boton"` lo dibuja como botón morado (llama la atención
//     para "Entrar a la clase", "Descargar hoja de trabajo", …).
//
// ─── PARÁMETROS (crearEnlace({ … })) ───
//   texto         Texto visible del enlace (admite formato:
//                 **negrita**, {{azul|…}}, …).
//   url           La dirección (obligatorio).
//   externo       true → abre en pestaña nueva. Defecto: true si la
//                 url empieza con http, false si no.
//   descarga      true → atributo download (descargar en vez de abrir).
//   nombreArchivo Nombre sugerido para la descarga (opcional).
//   tipo          "texto" (defecto) | "boton".
//   tamano        Tamaño del texto: número (px) o CSS ("1.05rem").
//   ancho         Ancho del bloque (útil en tipo "boton"): número,
//                 fracción 0..1 o CSS. Sin ancho → bloque entero
//                 (en "texto" queda en línea igualmente).
//   contenedor    Si se pasa, el enlace se agrega ahí.
//
// ─── DEVUELVE ─── el <a> con clase .comp-enlace (o .comp-enlace-boton).
//
// USO:
//   import { crearEnlace } from "../../../js/componentes/enlace.js";
//   crearEnlace({ texto: "Hoja de trabajo (PDF)", url: "https://…",
//                 descarga: true, tipo: "boton", contenedor: zona });
//   crearEnlace({ texto: "Ver la lección anterior", url: "#", contenedor: zona });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

function estilos() {
  inyectarEstilos(
    "comp-enlace-estilos",
    `
    .comp-enlace {
      color: #2563eb;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: .18em;
      text-decoration-color: rgba(37, 99, 235, .4);
      transition: color .15s ease, text-decoration-color .15s ease;
      overflow-wrap: break-word;
      font-family: system-ui, sans-serif;
      font-size: .98rem;
    }
    .comp-enlace:hover {
      color: #1d4ed8;
      text-decoration-color: #1d4ed8;
    }

    .comp-enlace-boton {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: .4rem;
      background: #7c3aed;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: .55rem 1.15rem;
      font-size: .95rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      margin: 0 0 1rem;
      box-shadow: 0 4px 14px rgba(124, 58, 237, .25);
      transition: background .15s ease, transform .15s ease, box-shadow .15s ease;
    }
    .comp-enlace-boton:hover {
      background: #6d28d9;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(124, 58, 237, .32);
    }
    .comp-enlace-boton:active { transform: translateY(0); }
  `
  );
}

export function crearEnlace(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const url = String(opc.url ?? "");
  const esExterno = /^https?:\/\//i.test(url);
  const externo = opc.externo != null ? !!opc.externo : esExterno;
  const esBoton = String(opc.tipo || "texto").toLowerCase().trim() === "boton";

  const enlace = document.createElement("a");
  enlace.className = esBoton ? "comp-enlace-boton" : "comp-enlace";
  enlace.href = url;

  if (externo) {
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
  }
  if (opc.descarga) {
    enlace.setAttribute("download", opc.nombreArchivo ? String(opc.nombreArchivo) : "");
  }

  aplicarFormato(enlace, opc.texto ?? url);
  aplicarTamano(enlace, opc.tamano);
  if (esBoton) aplicarAncho(enlace, opc.ancho);
  else if (opc.ancho != null) {
    enlace.style.display = "inline-block";
    aplicarAncho(enlace, opc.ancho);
  }

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(enlace);
  }
  return enlace;
}