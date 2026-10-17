// ============================================================
// inicio.js — Vista de inicio (js/components/inicio.js)
//
// Se muestra después de iniciar sesión correctamente con Google.
// Su CSS vive en css/components/inicio.css y se carga desde aquí.
// TODO: construir el contenido real del inicio (próximamente).
// ============================================================

let cssCargada = false;

/** Inyecta la hoja de estilos de esta vista una sola vez. */
function cargarCss() {
  if (cssCargada) return;
  cssCargada = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "css/components/inicio.css";
  document.head.append(link);
}

/**
 * Dibuja la vista de inicio.
 * @param {object} perfil           perfil completo del usuario (users/{uid})
 * @param {HTMLElement} contenedor  dónde dibujar (main#app)
 */
export function renderInicio(perfil, contenedor) {
  cargarCss();

  // TODO: aquí irá el contenido real de inicio (clases, actividades, etc.).
  // Mientras no lo construimos, la vista queda en blanco.

  contenedor.innerHTML = `<div class="inicio-vista"></div>`;

  // Botón TEMPORAL de salida (útil mientras se desarrolla, para no tener
  // que borrar los datos del navegador). Descomenta para usarlo:
  //
  // import { logout } from "./auth.js"; // (mover arriba, con los demás imports)
  // const barra = document.createElement("div");
  // barra.className = "inicio-dev-barra";
  // const btn = document.createElement("sl-button");
  // btn.size = "small";
  // btn.textContent = "Salir";
  // btn.addEventListener("click", () => logout());
  // barra.append(btn);
  // contenedor.querySelector(".inicio-vista").append(barra);
}