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
// ============================================================

import { auth, db } from "../data/initFirebase.js";
import { escapeHtml } from "../utils/helpers.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

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
    // Nota: NO agregamos sl-after-hide + remove() manual; Shoelace limpia
    // el toast él solo (quitarlo a mano provoca NotFoundError: removeChild).
    document.body.append(alerta);
    // Esperar a que sl-alert esté cargado antes de .toast() para no crashear
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

function inyectarEstilos() {
  if (document.getElementById("auth-estilos")) return;
  const estilo = document.createElement("style");
  estilo.id = "auth-estilos";
  estilo.textContent = `
    .auth-vista {
      min-height: 100vh;
      display: grid;
      place-items: center;
      align-content: center;
      padding: 1rem;
      background: #ffffff;
    }
    .auth-tarjeta { width: min(400px, 100%); }
    .auth-tarjeta h1 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
      color: #7c3aed; /* morado */
    }
    .auth-intro {
      margin: 0 0 1.25rem;
      color: var(--sl-color-neutral-600);
    }
    .auth-google {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
    }
    .auth-nota {
      margin: 1rem 0 0;
      text-align: center;
      font-size: 0.8rem;
      color: var(--sl-color-neutral-500);
    }
  `;
  document.head.append(estilo);
}

/* ---------------- Vista: iniciar sesión con Google ---------------- */

function renderLogin() {
  if (!contenedor) return;
  contenedor.innerHTML = `
    <div class="auth-vista">
      <sl-card class="auth-tarjeta">
        <h1 slot="header">Mis Clases Online</h1>

        <p class="auth-intro">
          Ingresa con tu cuenta institucional de Google para continuar.
        </p>

        <sl-button id="auth-google" variant="neutral" outline size="large"
                   style="width: 100%;">
          <span class="auth-google">${LOGO_GOOGLE} Iniciar sesión con Google</span>
        </sl-button>
      </sl-card>
      <p class="auth-nota">Acceso exclusivo con cuentas ${DOMINIO_PERMITIDO}</p>
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

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  let perfil;

  if (snap.exists()) {
    perfil = { uid: user.uid, ...snap.data() };
  } else {
    // Primera vez: crear el perfil con los datos que da Google
    const rol = rolDeCorreo(user.email);
    const local = user.email.split("@")[0];
    const datos = {
      nombre: user.displayName || (rol === "estudiante" ? `Estudiante ${local}` : local),
      rol,
      email: user.email,
      foto: user.photoURL || "",
      grados: [],
      creadoEn: serverTimestamp(),
    };
    if (rol === "estudiante") datos.nie = local; // NIE = números antes del @

    await setDoc(ref, datos);
    perfil = { uid: user.uid, ...datos, creadoEn: null };
  }

  // Sin grados todavía → pedirlos (modal obligatorio)
  if (!Array.isArray(perfil.grados) || perfil.grados.length === 0) {
    const grados = await pedirGrados(perfil);
    await updateDoc(ref, { grados });
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
      <sl-button slot="footer" variant="primary" id="grados-guardar">Guardar</sl-button>
    `;
    document.body.append(dialogo);

    // sl-dialog se carga de forma perezosa (autoloader de Shoelace): hay que
    // esperar a que el componente esté definido para que existan .show()/.hide().
    // Sin esta espera, lanza "dialogo.show is not a function" cuando la red va lenta.
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