// ============================================================
// auth.js — Autenticación con Google (js/components/auth.js)
//
// Reglas de negocio:
// - Acceso SOLO con "Iniciar sesión con Google" (sin correo/contraseña).
// - Solo se permiten cuentas cuyo correo termine en @clases.edu.sv;
//   si el dominio no coincide, se cierra la sesión inmediatamente.
// - Parte local del correo solo con números → rol "estudiante"
//   (NIE = los números antes del @). Cualquier otra cosa → "docente".
// - El nombre se toma del perfil de Google (displayName).
// - Al iniciar sesión se crea/lee el perfil en Firestore (users/{uid}):
//   { nombre, rol, email, foto, nie (solo estudiante), grados, creadoEn }
// - Primera vez: el estudiante elige SU grado; el docente elige TODOS
//   los grados que imparte. Se guarda en users/{uid}.grados (array).
// - REGLA DEL PROYECTO: este módulo SOLO toca Firebase AUTH (login);
//   toda la parte de datos (users/{uid}) pasa por js/data/db.js.
//
// Convención del proyecto: este módulo lleva su CSS implícito (inyectado
// desde aquí) para no crear archivos .css extra. Vista 100% responsiva
// (celular / tablet / PC) y SIN scroll para ningún lado.
// ============================================================

import { auth } from "../data/initFirebase.js"; // SOLO Firebase Authentication
import { db } from "../data/db.js";             // TODA la parte de datos
import { escapeHtml } from "../utils/helpers.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const DOMINIO_PERMITIDO = "@clases.edu.sv";

// Logo oficial de Google (SVG multicolor, inline para no depender de imágenes)
const LOGO_GOOGLE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg>`;

// Grados con id de -2 a 9
export const GRADOS = [
  { id: -2, nombre: "Parvularia 4" },
  { id: -1, nombre: "Parvularia 5" },
  { id: 0, nombre: "Parvularia 6" },
  { id: 1, nombre: "1er Grado" },
  { id: 2, nombre: "2do Grado" },
  { id: 3, nombre: "3er Grado" },
  { id: 4, nombre: "4to Grado" },
  { id: 5, nombre: "5to Grado" },
  { id: 6, nombre: "6to Grado" },
  { id: 7, nombre: "7mo Grado" },
  { id: 8, nombre: "8vo Grado" },
  { id: 9, nombre: "9no Grado" },
];

let contenedor = null;      // dónde se dibuja el login
let alIniciarSesion = null; // callback(perfil) hacia app.js

/* ---------------- Helpers ---------------- */

function esCorreoValido(email) {
  return (email || "").toLowerCase().endsWith(DOMINIO_PERMITIDO);
}

// Solo números antes del @ → estudiante; si no → docente
export function rolDeCorreo(email) {
  const local = (email || "").split("@")[0] || "";
  return /^\d+$/.test(local) ? "estudiante" : "docente";
}

function notify(mensaje, variant = "danger") {
  try {
    const alerta = document.createElement("sl-alert");
    alerta.setAttribute("variant", variant);
    alerta.setAttribute("closable", "");
    alerta.setAttribute("duration", "4000");
    alerta.textContent = mensaje;
    // Nota: NO remover el toast a mano (NotFoundError: removeChild).
    document.body.append(alerta);
    customElements.whenDefined("sl-alert").then(() => alerta.toast());
  } catch (e) {
    console.warn("[aviso]", mensaje);
  }
}

function mensajeDeError(e) {
  const codigos = {
    // Google / Firebase Auth
    "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar. Intenta de nuevo.",
    "auth/cancelled-popup-request": "Se canceló el intento de acceso. Intenta de nuevo.",
    "auth/popup-blocked": "El navegador bloqueó la ventana emergente. Habilita las ventanas emergentes e intenta de nuevo.",
    "auth/operation-not-allowed": "El acceso con Google no está habilitado. Actívalo en Firebase Console → Authentication → Sign-in method → Google.",
    "auth/unauthorized-domain": "Este dominio no está autorizado. Agrégalo en Firebase Console → Authentication → Settings → Authorized domains.",
    "auth/account-exists-with-different-credential": "Ya existe una cuenta con ese correo pero con otro método de acceso.",
    "auth/network-request-failed": "Sin conexión con Firebase. Revisa tu internet.",
    "auth/internal-error": "Error interno de Firebase. Intenta de nuevo.",
    // Firestore
    "permission-denied": "Firestore: permiso denegado. Revisa las reglas de seguridad.",
    "unavailable": "Firestore no responde. Revisa tu conexión o si la base de datos está creada.",
    "failed-precondition": "Firestore no está creada todavía. Créala en Firebase Console.",
    "not-found": "Firestore no está creada todavía. Créala en Firebase Console.",
  };
  return codigos[e?.code] || "Ocurrió un error: " + (e?.code || e?.message || e);
}

/* ---------------- CSS implícito de la vista ---------------- */

function inyectarEstilos() {
  if (document.getElementById("auth-estilos")) return;
  const estilo = document.createElement("style");
  estilo.id = "auth-estilos";
  estilo.textContent = `
    /* Sin scroll en la página mientras el login está en pantalla */
    body:has(.auth-vista) { overflow: hidden; height: 100dvh; margin: 0; }
    body:has(.auth-vista) > #app { margin: 0; }

    .auth-vista {
      box-sizing: border-box;
      height: 100vh;
      height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background: #ffffff;
      background-image:
        radial-gradient(circle at 10% 15%, rgba(124, 58, 237, .12), transparent 30%),
        radial-gradient(circle at 90% 85%, rgba(249, 115, 22, .10), transparent 32%),
        radial-gradient(circle at 85% 10%, rgba(37, 99, 235, .09), transparent 26%),
        radial-gradient(circle at 12% 90%, rgba(22, 163, 74, .09), transparent 26%);
    }

    .auth-caja {
      box-sizing: border-box;
      width: min(420px, 100%);
      max-height: calc(100dvh - 2.5rem);
      background: #ffffff;
      border: 1px solid #ece9f6;
      border-radius: 1.5rem;
      box-shadow: 0 18px 50px rgba(17, 12, 46, .12);
      padding: 2rem 1.75rem;
      text-align: center;
    }

    .auth-logo {
      width: 58px;
      height: 58px;
      margin: 0 auto .55rem;
      border-radius: 1rem;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: #ffffff;
      font-weight: 800;
      font-size: 1.6rem;
      font-family: system-ui, sans-serif;
      box-shadow: 0 8px 20px rgba(124, 58, 237, .35);
    }

    .auth-puntos {
      display: flex;
      gap: .35rem;
      justify-content: center;
      margin-bottom: 1rem;
    }
    .auth-puntos span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .auth-titulo {
      margin: 0 0 .35rem;
      font-size: 1.45rem;
      font-weight: 800;
      color: #7c3aed; /* morado */
    }

    .auth-sub {
      margin: 0 0 1.5rem;
      color: #6b7280;
      font-size: .95rem;
      line-height: 1.45;
    }

    .auth-btn::part(base) {
      width: 100%;
      height: 48px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      font-weight: 600;
      color: #1f2937;
      transition: box-shadow .2s ease, border-color .2s ease;
    }
    .auth-btn::part(base):hover {
      border-color: #d1d5db;
      box-shadow: 0 6px 18px rgba(17, 12, 46, .10);
    }
    .auth-btn::part(base):active { transform: scale(.99); }
    .auth-btn::part(label) {
      display: inline-flex;
      align-items: center;
      gap: .6rem;
      font-size: 1rem;
    }

    .auth-nota {
      margin: 1.25rem 0 0;
      font-size: .8rem;
      color: #9ca3af;
    }
    .auth-nota strong { color: #7c3aed; font-weight: 600; }

    /* Diálogo de grados: responsivo */
    .sl-dialog-grados { --width: min(440px, 92vw); }
    .sl-dialog-grados::part(panel) { border-radius: 1.25rem; }

    /* Pantallas cortas (celular horizontal) → compactar sin scroll */
    @media (max-height: 560px) {
      .auth-vista { padding: .75rem; }
      .auth-caja { padding: 1.1rem 1.25rem; border-radius: 1.1rem; }
      .auth-logo { width: 42px; height: 42px; font-size: 1.15rem; }
      .auth-sub { margin-bottom: 1rem; }
      .auth-nota { margin-top: .85rem; }
    }

    /* Celulares angostos */
    @media (max-width: 360px) {
      .auth-caja { padding: 1.5rem 1.1rem; }
      .auth-titulo { font-size: 1.25rem; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Vista: iniciar sesión con Google ---------------- */

function renderLogin() {
  if (!contenedor) return;
  contenedor.innerHTML = `
    <div class="auth-vista">
      <div class="auth-caja">
        <div class="auth-logo">M</div>
        <div class="auth-puntos">
          <span style="background:#ef4444"></span>
          <span style="background:#f97316"></span>
          <span style="background:#7c3aed"></span>
          <span style="background:#2563eb"></span>
          <span style="background:#16a34a"></span>
        </div>

        <h1 class="auth-titulo">Mis Clases Online</h1>
        <p class="auth-sub">Ingresa con tu cuenta institucional para continuar</p>

        <sl-button id="auth-google" class="auth-btn" size="large">
          <span class="auth-btn-int">${LOGO_GOOGLE} Continuar con Google</span>
        </sl-button>

        <p class="auth-nota">
          Acceso exclusivo con cuentas <strong>${DOMINIO_PERMITIDO}</strong>
        </p>
      </div>
    </div>`;

  contenedor.querySelector("#auth-google").addEventListener("click", ingresarConGoogle);
}

async function ingresarConGoogle() {
  const boton = contenedor?.querySelector("#auth-google");
  if (boton) boton.loading = true;

  const proveedor = new GoogleAuthProvider();
  // Siempre preguntar qué cuenta usar (útil si el navegador tiene varias)
  proveedor.setCustomParameters({ prompt: "select_account" });

  try {
    await signInWithPopup(auth, proveedor);
    // El resto del flujo (perfil en Firestore + grados) lo maneja onAuthStateChanged
  } catch (e) {
    if (e?.code === "auth/popup-blocked") {
      // El navegador bloqueó la ventana emergente → plan B: redirección
      try {
        await signInWithRedirect(auth, proveedor);
      } catch (e2) {
        notify(mensajeDeError(e2));
      }
    } else if (e?.code !== "auth/cancelled-popup-request") {
      notify(mensajeDeError(e));
    }
  } finally {
    if (boton) boton.loading = false;
  }
}

/* ---------------- Perfil en Firestore (users/{uid}) ---------------- */

async function asegurarPerfil(user) {
  // Regla: solo correos institucionales. Si no coincide, se cierra sesión.
  if (!esCorreoValido(user.email)) {
    await signOut(auth);
    notify(`Solo se permiten cuentas ${DOMINIO_PERMITIDO}`);
    return null;
  }

  // Perfil en Firestore SIEMPRE vía db.js (users/{uid})
  const datos = await db.usuarios.leer(user.uid);
  let perfil;

  if (datos) {
    perfil = { uid: user.uid, ...datos };
  } else {
    // Primera vez: crear el perfil con los datos que da Google
    const rol = rolDeCorreo(user.email);
    const local = user.email.split("@")[0];
    const nuevo = {
      nombre: user.displayName || (rol === "estudiante" ? `Estudiante ${local}` : local),
      rol,
      email: user.email,
      foto: user.photoURL || "",
      grados: [],
    };
    if (rol === "estudiante") nuevo.nie = local; // NIE = números antes del @

    await db.usuarios.crear(user.uid, nuevo); // db añade creadoEn
    perfil = { uid: user.uid, ...nuevo, creadoEn: null };
  }

  // Sin grados todavía → pedirlos (modal obligatorio)
  if (!Array.isArray(perfil.grados) || perfil.grados.length === 0) {
    const grados = await pedirGrados(perfil);
    await db.usuarios.actualizar(user.uid, { grados });
    perfil.grados = grados;
  }

  return perfil;
}

/**
 * Modal obligatorio de grados.
 * - Estudiante: elige UN grado (sl-select simple).
 * - Docente: elige TODOS los grados que imparte (sl-select multiple).
 * Devuelve una promesa con el array de ids (números).
 */
function pedirGrados(perfil) {
  return new Promise((resolve) => {
    const esEstudiante = perfil.rol === "estudiante";

    const dialogo = document.createElement("sl-dialog");
    dialogo.className = "sl-dialog-grados";
    dialogo.setAttribute("label", esEstudiante ? "Selecciona tu grado" : "Grados que impartes");
    dialogo.innerHTML = `
      <p>
        Hola, <strong>${escapeHtml(perfil.nombre)}</strong>.
        ${esEstudiante
          ? `Tu NIE es <strong>${escapeHtml(perfil.nie || "")}</strong>. Elige tu grado para continuar.`
          : "Selecciona todos los grados que impartes."}
      </p>
      <sl-select id="grados-select" placeholder="Grados..."
                 style="width: 100%;" ${esEstudiante ? "" : "multiple"}>
        ${GRADOS.map((g) => `<sl-option value="${g.id}">${g.nombre}</sl-option>`).join("")}
      </sl-select>
      <sl-button slot="footer" variant="primary" pill id="grados-guardar">Guardar</sl-button>
    `;
    document.body.append(dialogo);

    // sl-dialog se carga de forma perezosa (autoloader de Shoelace): hay que
    // esperar a que el componente esté definido para que existan .show()/.hide().
    // La espera va SIEMPRE después del append() (el autoloader carga el
    // componente al verlo en el DOM; esperar antes sería un deadlock).
    customElements.whenDefined("sl-dialog").then(() => dialogo.show());

    // El modal no se puede cerrar sin guardar (bloquea Esc y clic fuera)
    dialogo.addEventListener("sl-request-close", (e) => e.preventDefault());

    dialogo.querySelector("#grados-guardar").addEventListener("click", () => {
      const sel = dialogo.querySelector("#grados-select");
      const valor = sel.value;
      const lista = Array.isArray(valor) ? valor : valor != null && valor !== "" ? [valor] : [];

      if (lista.length === 0) {
        notify(esEstudiante ? "Selecciona tu grado." : "Selecciona al menos un grado.", "warning");
        return;
      }

      const grados = lista.map(Number).sort((a, b) => a - b);
      // Quitar el diálogo solo cuando terminó de ocultarse (evita glitches)
      dialogo.addEventListener("sl-after-hide", () => dialogo.remove());
      dialogo.hide();
      resolve(grados);
    });
  });
}

/* ---------------- API pública ---------------- */

/**
 * Inicia el flujo de autenticación con Google.
 * @param {HTMLElement} contenedorLogin  dónde se dibuja el login
 * @param {(perfil: object) => void} cb  se llama cuando hay usuario con perfil completo
 */
export function initAuth(contenedorLogin, cb) {
  contenedor = contenedorLogin;
  alIniciarSesion = cb;
  inyectarEstilos();
  renderLogin();

  // Si el acceso fue por redirección (plan B cuando el navegador bloquea
  // la ventana emergente), aquí se recogen los errores de ese flujo.
  getRedirectResult(auth).catch((e) => notify(mensajeDeError(e)));

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      renderLogin();
      return;
    }
    try {
      const perfil = await asegurarPerfil(user);
      if (!perfil) return; // dominio no permitido (ya se cerró la sesión)
      alIniciarSesion?.(perfil);
    } catch (e) {
      notify(mensajeDeError(e));
      renderLogin();
    }
  });
}

/** Cierra la sesión; onAuthStateChanged vuelve a mostrar el login. */
export async function logout() {
  await signOut(auth);
}