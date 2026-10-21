// ============================================================
// imagen.js — IMAGEN con pie de foto (js/componentes/imagen.js) · v1
//
// Inserta una imagen (de recursos/img/, de Drive con enlace directo
// o de internet) con su ALT (descripción accesible) y su PIE DE FOTO
// opcional debajo. Nunca se sale del ancho de la pantalla.
//
// ─── PARÁMETROS (crearImagen({ … })) ───
//   url          Dirección de la imagen (obligatorio). Para archivos
//                del proyecto: "recursos/img/mi-imagen.png".
//   alt          Descripción para lectores de pantalla (si falta, se
//                usa el pie).
//   pie          Pie de foto debajo (admite formato: **negrita**,
//                $fórmulas$, …).
//   ancho        Ancho: número (px), fracción 0..1 o CSS ("60%").
//                Defecto: bloque entero (que no se pase de 100%).
//   marco        true → borde gris suave alrededor (para capturas,
//                dibujos de fondo blanco, etc.).
//   alineacion   "izquierda" (defecto) · "centro" · "derecha".
//   contenedor   Si se pasa, la imagen se agrega ahí.
//
// ─── DEVUELVE ─── el <figure class="comp-imagen"> listo para usar.
//
// USO:
//   import { crearImagen } from "../../../js/componentes/imagen.js";
//   crearImagen({
//     url: "recursos/img/reloj-clase.png",
//     alt: "Reloj marcando las 10:30",
//     pie: "El minutero apunta al **6**: media hora.",
//     ancho: 320, marco: true, contenedor: zona,
//   });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarAlineacion } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

function estilos() {
  inyectarEstilos(
    "comp-imagen-estilos",
    `
    .comp-imagen {
      margin: 0 0 1.1rem;
      font-family: system-ui, sans-serif;
    }
    .comp-imagen img {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
      border-radius: .6rem;
    }
    .comp-imagen.comp-imagen-marco img {
      border: 1px solid #e5e7eb;
      box-shadow: 0 2px 10px rgba(17, 24, 39, .06);
    }
    .comp-imagen figcaption {
      margin-top: .4rem;
      font-size: .85rem;
      color: #6b7280;
      line-height: 1.5;
      overflow-wrap: break-word;
    }
  `
  );
}

export function crearImagen(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const figura = document.createElement("figure");
  figura.className = "comp-imagen" + (opc.marco ? " comp-imagen-marco" : "");
  aplicarAncho(figura, opc.ancho != null ? opc.ancho : 1); // por defecto: todo el ancho disponible

  const img = document.createElement("img");
  img.src = String(opc.url ?? "");
  img.alt = String(opc.alt ?? opc.pie ?? "");
  img.loading = "lazy";
  figura.append(img);

  if (opc.pie) {
    const pie = document.createElement("figcaption");
    aplicarFormato(pie, String(opc.pie));
    figura.append(pie);
  }

  aplicarAlineacion(figura, opc.alineacion);

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(figura);
  }
  return figura;
}