// ============================================================
// db.js — ÚNICA capa de acceso a datos (js/data/db.js)
//
// REGLA DEL PROYECTO: NADA más toca Firestore o Sheets directamente.
//   · Firebase AUTH (login Google) queda en auth.js: es autenticación,
//     no base de datos.
//   · TODO lo demás (users, clases, notas) pasa por este archivo.
//   · Sheets se habla a través de sheets.js, pero SIEMPRE desde aquí.
//
// DIVISIÓN DE DATOS (para no saturar Firestore):
//   · Firestore : users/{uid}
//                 clases/{grado}/{materia}/{idClase}
//                 notas/{uid}/clases/{claseId}   (como hasta ahora)
//   · Sheets    : la nota de CADA actividad de utils (para que una
//                 actividad ya hecha no se pueda rehacer al volver a
//                 abrir la clase, ni en otro dispositivo) y las tablas
//                 del docente: Asistencia-{grado} y Notas-{materia}-
//                 {grado} (clases + exámenes + tareas, con sumatorias
//                 por día y media aritmética).
//
// PRINCIPIO DE FALLO SUAVE:
//   · Firestore (usuarios/clases/notas) SÍ puede lanzar error: la UI
//     ya lo captura y avisa. Es la fuente de verdad.
//   · Sheets es "mejor esfuerzo": NUNCA lanza; si falla devuelve
//     {ok:false} y la app sigue normal (sheets.js sin URL configurada
//     se comporta igual: {ok:false, razon:"sin-url"}).
//
// API pública (import { db } from ".../js/data/db.js"):
//   db.usuarios.leer(uid)                  → datos | null
//   db.usuarios.crear(uid, datos)          (añade creadoEn)
//   db.usuarios.actualizar(uid, campos)
//   db.clases.listar(grado, materiaId)     → [{ id, ...datos }]
//   db.clases.existe(grado, materiaId, id) → bool
//   db.clases.crear(grado, materiaId, id, datos)  (añade creadoEn)
//   db.notas.leer(uid, claseId)            → datos | null
//   db.notas.guardar(uid, claseId, nota)   (merge + actualizadoEn)
//   db.notas.reportarActividad({perfil, clase, qid, puntos, tipo})  → Sheets
//   db.notas.actividadHecha(uid, qid)      → bool (por Sheets)
//   db.asistencia.registrar({grado, fecha, estudiantes})            → Sheets
//   db.sheets.configurada() / ping() / configurar()
// ============================================================

import { db as firestore } from "./initFirebase.js";
import * as sheets from "./sheets.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

/* ---------------- Helpers internos ---------------- */

// Fecha local de HOY en formato "yyyy-mm-dd" (la usa Sheets para los
// encabezados por día; se calcula en el cliente para respetar su zona).
function fechaLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ---------------- USUARIOS — Firestore: users/{uid} ---------------- */

const usuarios = {
  /** Devuelve los datos del perfil o null si no existe. Puede lanzar. */
  async leer(uid) {
    const snap = await getDoc(doc(firestore, "users", uid));
    return snap.exists() ? snap.data() : null;
  },

  /** Crea el perfil; db añade creadoEn (serverTimestamp). Puede lanzar. */
  async crear(uid, datos) {
    await setDoc(doc(firestore, "users", uid), {
      ...datos,
      creadoEn: serverTimestamp(),
    });
  },

  /** Actualiza campos sueltos del perfil (ej. { grados }). Puede lanzar. */
  async actualizar(uid, campos) {
    await updateDoc(doc(firestore, "users", uid), campos);
  },
};

/* ---------- CLASES — Firestore: clases/{grado}/{materia}/{id} ---------- */

const clases = {
  /** Lista de clases de UNA materia de un grado → [{ id, ...datos }]. */
  async listar(grado, materiaId) {
    const snap = await getDocs(
      collection(firestore, "clases", String(grado), materiaId)
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** ¿Existe ya una clase con ese id? (para no duplicar al crear). */
  async existe(grado, materiaId, id) {
    const snap = await getDoc(
      doc(firestore, "clases", String(grado), materiaId, id)
    );
    return snap.exists();
  },

  /** Crea la clase; db añade creadoEn (serverTimestamp). */
  async crear(grado, materiaId, id, datos) {
    await setDoc(doc(firestore, "clases", String(grado), materiaId, id), {
      ...datos,
      creadoEn: serverTimestamp(),
    });
  },
};

/* ---------------- NOTAS — Firestore + Sheets ---------------- */

const notas = {
  /**
   * Firestore: notas/{uid}/clases/{claseId} → { puntos, preguntas:{qid:p} }
   * Devuelve null si no hay nota guardada. Puede lanzar.
   */
  async leer(uid, claseId) {
    const snap = await getDoc(doc(firestore, "notas", uid, "clases", claseId));
    return snap.exists() ? snap.data() : null;
  },

  /** Guarda/actualiza la nota completa (merge + actualizadoEn). Puede lanzar. */
  async guardar(uid, claseId, nota) {
    await setDoc(
      doc(firestore, "notas", uid, "clases", claseId),
      { ...nota, actualizadoEn: serverTimestamp() },
      { merge: true }
    );
  },

  /**
   * SHEETS: reporta la nota de UNA actividad de utils (mejor esfuerzo).
   * · tipo: "clase" | "examen" | "tarea" (define en qué tabla cae).
   * · clase: { id, grado, materiaId } (el mismo objeto que ya reciben
   *   los componentes de utils).
   * code.gs la coloca en su celda, suma el día y marca la actividad
   * como "hecha" (uid+qid) para que no pueda rehacerse.
   */
  async reportarActividad({ perfil, clase, qid, puntos, tipo }) {
    return sheets.llamar("nota", {
      tipo: tipo || "clase",
      grado: clase?.grado,
      materia: clase?.materiaId,
      claseId: clase?.id,
      titulo: clase?.clase || "",   // título legible (ej. del examen/tarea)
      qid,
      puntos,
      uid: perfil?.uid,
      nombre: perfil?.nombre || "",
      nie: perfil?.nie || "",
      fecha: fechaLocal(),
    });
  },

  /**
   * SHEETS: ¿esa actividad ya la resolvió este usuario? → bool.
   * Si Sheets no responde devuelve false (permite hacerla; el guardado
   * normal de Firestore/localStorage sigue protegiendo la nota).
   */
  async actividadHecha(uid, qid) {
    const r = await sheets.llamar("hecha", { uid, qid });
    return r.ok === true && r.hecha === true;
  },
};

/* ---------------- ASISTENCIA — solo Sheets ---------------- */

const asistencia = {
  /**
   * SHEETS: guarda la asistencia de UN día de UN grado.
   * · fecha: "yyyy-mm-dd" (la columna se crea en orden cronológico).
   * · estudiantes: [{ uid, nombre, nie, estado }] con estado "A" | "T" | "F".
   * code.gs ordena a los estudiantes por apellidos (ignora de/del/…).
   */
  async registrar({ grado, fecha, estudiantes }) {
    return sheets.llamar("asistencia", { grado, fecha, estudiantes });
  },
};

/* ---------------- SHEETS: mantenimiento ---------------- */

const sheetsAdmin = {
  /** true si ya se pegó el enlace /exec en sheets.js. */
  configurada: () => sheets.configurada(),

  /** Prueba de conexión con el Web App. */
  ping: () => sheets.llamar("ping"),

  /** (Re)construye la hoja "Menú" con enlaces a todas las demás hojas. */
  configurar: () => sheets.llamar("configurar"),
};

/* ---------------- Export ---------------- */

export const db = { usuarios, clases, notas, asistencia, sheets: sheetsAdmin };
export default db;