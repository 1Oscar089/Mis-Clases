// ============================================================
// aviso.js — AVISOS destacados (js/componentes/aviso.js) · v1
//
// Cajas de colores para lo que NO puede pasar desapercibido:
// información, éxito, advertencias y errores. Cada tipo trae su
// color y su icono (Shoelace, igual que el resto de la app).
//
//     info        azul        "Recuerda que…"
//     exito       verde       "¡Muy bien! Ya dominas…"
//     advertencia ámbar       "Cuidado: en examen no hay segunda…"
//     error       rojo        "Error frecuente: confundir…"
//
// ─── PARÁMETROS (crearAviso({ … })) ───
//   tipo        "info" (defecto) | "exito" | "advertencia" | "error".
//   texto       El mensaje (admite formato: **negrita**, $fórmulas$…).
//   titulo      Rótulo corto en negrita arriba del mensaje (opcional).
//   icono       true (defecto) → muestra el icono del tipo.
//   tamano      Tamaño del texto: número (px) o CSS (".95rem").
//   ancho       Ancho del bloque: número, fracción 0..1 o CSS.
//   contenedor  Si se pasa, el aviso se agrega ahí.
//
// ─── DEVUELVE ─── el <div class="comp-aviso"> listo para usar.
//
// USO:
//   import { crearAviso } from "../../../js/componentes/aviso.js";
//   crearAviso({ tipo: "advertencia", titulo: "Atención",
//     texto: "El examen se ve **una sola vez**.", contenedor: zona });
// ============================================================

import { inyectarEstilos, aplicarAncho, aplicarTamano } from "./base.js";
import { aplicarFormato } from "./formatoTexto.js";

const TIPOS = {
  info: { icono: "info-circle" },
  exito: { icono: "check-circle" },
  correcto: { icono: "check-circle" }, // alias
  advertencia: { icono: "exclamation-triangle" },
  alerta: { icono: "exclamation-triangle" }, // alias
  error: { icono: "x-circle" },
  peligro: { icono: "x-circle" }, // alias
};

function estilos() {
  inyectarEstilos(
    "comp-aviso-estilos",
    `
    .comp-aviso {
      display: flex;
      align-items: flex-start;
      gap: .6rem;
      margin: 0 0 1.1rem;
      padding: .8rem 1rem;
      border-radius: .8rem;
      border: 1px solid;
      font-size: .95rem;
      line-height: 1.6;
      font-family: system-ui, sans-serif;
      overflow-wrap: break-word;
    }
    .comp-aviso sl-icon {
      font-size: 1.15rem;
      flex: none;
      margin-top: .1rem;
    }
    .comp-aviso-titulo {
      display: block;
      font-weight: 800;
      margin-bottom: .15rem;
    }

    .comp-aviso-info {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1e40af;
    }
    .comp-aviso-exito {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }
    .comp-aviso-advertencia {
      background: #fffbeb;
      border-color: #fde68a;
      color: #92400e;
    }
    .comp-aviso-error {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }
  `
  );
}

export function crearAviso(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const clave = String(opc.tipo || "info").toLowerCase().trim();
  const tipo = TIPOS[clave] ? clave : "info";

  const caja = document.createElement("div");
  caja.className = "comp-aviso comp-aviso-" + tipo;
  caja.setAttribute("role", "note");
  aplicarAncho(caja, opc.ancho);
  aplicarTamano(caja, opc.tamano);

  if (opc.icono !== false) {
    const icono = document.createElement("sl-icon");
    icono.name = TIPOS[tipo].icono;
    caja.append(icono);
  }

  const cuerpo = document.createElement("div");
  if (opc.titulo) {
    const titulo = document.createElement("span");
    titulo.className = "comp-aviso-titulo";
    aplicarFormato(titulo, String(opc.titulo));
    cuerpo.append(titulo);
  }
  const texto = document.createElement("span");
  aplicarFormato(texto, opc.texto ?? "");
  cuerpo.append(texto);
  caja.append(cuerpo);

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(caja);
  }
  return caja;
}
