// ============================================================
// initFirebase.js — Inicialización de Firebase (Auth + Firestore)
//
// Uso desde otros módulos JS:
//   import { app, auth, db } from "./initFirebase.js";
//   (ajustando la ruta relativa según dónde esté el módulo)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// Configuración del proyecto Firebase: mis-clases-online
const firebaseConfig = {
  apiKey: "AIzaSyBKCtz6o7RGB0ozWOn9lVUxGbq9SKc-xPk",
  authDomain: "mis-clases-online.firebaseapp.com",
  projectId: "mis-clases-online",
  storageBucket: "mis-clases-online.firebasestorage.app",
  messagingSenderId: "749687658583",
  appId: "1:749687658583:web:14e8915f571df506edeb12",
};

// Instancia principal de la app
const app = initializeApp(firebaseConfig);

// Servicios exportables para usar en cualquier otro módulo
const auth = getAuth(app);
const db = getFirestore(app);

// Más adelante, si se necesita Storage, descomentar:
// import { getStorage } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-storage.js";
// const storage = getStorage(app);

export { app, auth, db };
