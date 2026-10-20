// ============================================================
// db.js — ÚNICA capa de acceso a datos (js/data/db.js)
//
// REGLA DEL PROYECTO: NINGÚN otro archivo toca Firestore o Sheets.
//   · Firebase AUTH (login Google) queda en components/auth.js:
//     es autenticación, no base de datos.
//   · TODO lo demás (users, clases, notas, hojas…) pasa por aquí.
//
// ESTADO ACTUAL:
//   · db.usuarios (users/{uid})                     ✅
//   · db.clases   (clases/{grado}/{materia}/{id})   ✅
//   · db.notas    (notas/{uid}/clases/{claseId})    ✅
//       leer · guardar (Firestore, pueden lanzar) +
//       actividadHecha · reportarActividad (mejor esfuerzo:
//       NUNCA lanzan; reportarActividad = espejo en Sheets vía
//       db.sheets.actividad). La nota { puntos, preguntas } es
//       la sumatoria de TODAS las actividades de la sesión
//       (clase, tarea o examen) identificada por claseId.
//   · db.sheets   (puente con Google Sheets)        ✅
//       disponible · ping · info · leer · configurar ·
//       actividad · asistencia  → TODO "mejor esfuerzo":
//       NUNCA lanzan; devuelven { ok:false, razon }.
//       Toda la estructura de las hojas vive en sheets.js.
//   En próximos pasos se agregará SIEMPRE aquí: db.asistencia.
//
// CONVENCIÓN: los métodos de Firestore SÍ pueden lanzar error (es la
// fuente de verdad; la UI lo captura y avisa). Las funciones de
// Sheets son "mejor esfuerzo": nunca lanzan.
// ============================================================

import { db as firestore } from "./initFirebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {
  configurada,
  ping,
  info,
  leer,
  configurar,
  actividad,
  asistencia,
} from "./sheets.js";

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

/* ------------- NOTAS — Firestore: notas/{uid}/clases/{claseId} -------------
   La nota de UNA sesión de trabajo (clase, tarea o examen) es
   { puntos, preguntas: { [qid]: valor } } y vive en Firestore para
   que el bloqueo de actividades ya hechas sobreviva a cerrar/abrir
   sesión y cambie de dispositivo sin perderse. localStorage es el
   respaldo inmediato y Sheets (reportarActividad) el ESPEJO para
   las tablas del docente. */

const notas = {
  /** Nota { puntos, preguntas } del usuario en esa clase/tarea/examen
      o null si no existe. Puede lanzar (Firestore = fuente de verdad). */
  async leer(uid, claseId) {
    const snap = await getDoc(
      doc(firestore, "notas", String(uid), "clases", String(claseId))
    );
    return snap.exists() ? snap.data() : null;
  },

  /** Guarda la nota completa (merge; añade actualizadoEn). Puede lanzar. */
  async guardar(uid, claseId, nota) {
    await setDoc(
      doc(firestore, "notas", String(uid), "clases", String(claseId)),
      { ...nota, actualizadoEn: serverTimestamp() },
      { merge: true }
    );
  },

  /** ¿Ya respondió el estudiante ESE bloque (qid) de esa sesión?
      Mejor esfuerzo: ante cualquier fallo devuelve false (no bloquea). */
  async actividadHecha(uid, claseId, qid) {
    try {
      const nota = await this.leer(uid, claseId);
      return !!(nota && nota.preguntas && nota.preguntas[qid] != null);
    } catch (e) {
      return false;
    }
  },

  /** ESPEJO en Sheets de la nota de UNA actividad (mejor esfuerzo).
      datos: { perfil:{nie,nombre}, clase:{dia,unidad,leccion} | {id},
               materia, grado, actividadId?, tipo:"clase"|"examen"|"tarea",
               puntos, titulo? }
      · tipo "clase": columna D{dia}·U{unidad}·L{leccion} con el TOTAL
        de la clase para ese NIE (se re-reporta y siempre queda al día).
      · tipo "tarea"/"examen": fila actividadId × columna NIE con el
        TOTAL de la tarea/examen (el examen se reporta UNA sola vez,
        desde finalizarExamen() de js/utils/opcionMultiple.js). */
  async reportarActividad(datos) {
    try {
      return await actividad(datos || {});
    } catch (e) {
      return { ok: false, razon: "peticion", detalle: String((e && e.message) || e) };
    }
  },
};

/* ------------- SHEETS — puente con Google Sheets -------------
   TODO el aspecto de las hojas se define en sheets.js; aquí solo
   se expone como db.sheets.* para que la UI no importe nada más.
   Las llamadas son "mejor esfuerzo": sin URL configurada o con
   red caída devuelven { ok:false, razon } y la app sigue. */

const sheets = {
  /** true si ya se pegó el enlace /exec en sheets.js (CONFIG.url). */
  disponible: configurada,
  /** Prueba de vida del motor: { ok, version, hora }. */
  ping,
  /** Hojas existentes + especificaciones guardadas (depuración). */
  info,
  /** Lee una hoja completa → { ok, valores: [ [celda…] ] } (lectura). */
  leer,
  /** Crea/actualiza hojas y sincroniza alumnado, clases, exámenes y tareas.
      datos: { grado?, materia?, estudiantes:[{uid,nombre,nie}],
               clases:[{dia,unidad,leccion,…}], examenes:[{id,titulo}],
               tareas:[{id,titulo}] } */
  configurar,
  /** Espejo en Sheets de UNA nota de actividad (mejor esfuerzo).
      datos: { perfil:{nie,nombre}, clase:{dia,unidad,leccion},
               materia, grado, actividadId, tipo:"clase"|"examen"|"tarea",
               puntos, titulo } */
  actividad,
  /** Registra la asistencia de UN día completo.
      datos: { grado, fecha:"2026-10-20",
               estudiantes:[{uid,nombre,nie,estado:"A"|"T"|"F"}] } */
  asistencia,
};

/* ---------------- Export ---------------- */

export const db = { usuarios, clases, notas, sheets };
export default db;