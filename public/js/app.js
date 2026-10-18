// ============================================================
// app.js — Punto de entrada principal (js/app.js)
//
// Orquesta la aplicación:
// 1. auth.js maneja el acceso con Google (@clases.edu.sv) y el perfil.
// 2. Cuando hay usuario con perfil completo, monta la userbar (arriba de
//    todas las páginas) y la vista de inicio debajo de ella.
// ============================================================

import { initAuth } from "./components/auth.js";
import { renderUserbar } from "./components/userbar.js";
import { renderInicio } from "./components/inicio.js";

const raiz = document.getElementById("app");

// Arranca el flujo de autenticación
initAuth(raiz, (perfil) => {
  renderUserbar(perfil);        // barra superior (se oculta sola en el login)
  renderInicio(perfil, raiz);   // vista de inicio, debajo de la barra
});